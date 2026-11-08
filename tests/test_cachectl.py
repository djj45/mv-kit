"""Cache cleanup safety, accounting, process death and concurrent writers."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import cachectl
import soundtrack


class CacheTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.out = Path(temp.name)
        self.cache = self.out / '.audio-cache'
        self.cache.mkdir()

    def entry(self, char, age=0):
        key = char * 64
        for ext in ('.wav', '.json'):
            path = self.cache / (key + ext)
            path.write_bytes(b'12345')
            os.utime(path, (age, age))
        return key

    def test_preview_then_apply_lru_pairs_keep_budget_and_unknown(self):
        old = self.entry('a', 1)
        self.entry('b', 2)
        (self.cache / 'keep.txt').write_text('untouched')
        before = sorted(p.name for p in self.cache.iterdir())
        report = cachectl.manage(self.out, 'audio', prune=True, keep_bytes=10)
        self.assertEqual(report['reclaimableBytes'], 10)
        self.assertEqual(report['candidates'][0]['key'], old)
        self.assertEqual(before, sorted(p.name for p in self.cache.iterdir()))
        report = cachectl.manage(self.out, 'audio', prune=True, apply=True, keep_bytes=10)
        self.assertEqual(report['removedBytes'], 10)
        self.assertEqual(report['remainingBytes'], 10)
        self.assertFalse((self.cache / (old + '.wav')).exists())
        self.assertEqual((self.cache / 'keep.txt').read_text(), 'untouched')

    def test_recent_hit_protects_old_file_and_records_true_hit_rate(self):
        key = self.entry('a', 1)
        with cachectl.lease(self.cache):
            cachectl.record(self.cache, [key], False)
            cachectl.record(self.cache, [key], True)
        result = cachectl.manage(self.out, 'audio', prune=True, older_days=1)
        self.assertEqual(result['hitRate'], .5)
        self.assertEqual(result['candidates'], [])

    def test_corrupt_stats_do_not_break_cache_reuse(self):
        key = 'a'*64
        output = self.out/'output.wav'
        soundtrack.cached_audio(self.cache, key, output, lambda p: p.write_bytes(b'good'), lambda: key)
        path = cachectl.state_dir(self.cache)/(self.cache.name+'.json')
        for data in ('{broken', '{"entries":{},"hits":"bad","misses":0}', '[]'):
            path.write_text(data)
            self.assertTrue(soundtrack.cached_audio(self.cache, key, output,
                            lambda p: self.fail('valid audio must be reused'), lambda: key))
            self.assertEqual(cachectl.manage(self.out, 'audio')['hits'], 1)

    def test_no_historical_hit_rate_is_invented(self):
        self.entry('a')
        self.assertIsNone(cachectl.manage(self.out, 'audio')['hitRate'])

    def test_busy_cache_is_skipped_and_other_kinds_remain_available(self):
        self.entry('a')
        with cachectl.lease(self.cache):
            report = cachectl.manage(self.out, 'audio', prune=True, apply=True)
            self.assertTrue(report['busy'])
            self.assertEqual(report['removedBytes'], 0)
            self.assertFalse(cachectl.manage(self.out, 'clips')['busy'])
        self.assertEqual(cachectl.manage(self.out, 'audio')['entries'], 1)

    def test_symlinks_and_unknown_files_are_preserved(self):
        outside = self.out / 'original.wav'
        outside.write_bytes(b'precious')
        (self.cache / ('a'*64+'.wav')).symlink_to(outside)
        temp = self.cache / '.audio-abandoned'
        temp.mkdir()
        (temp / 'linked').symlink_to(outside)
        report = cachectl.manage(self.out, 'audio', prune=True, apply=True)
        self.assertEqual(len(report['ignored']), 2)
        self.assertEqual(outside.read_bytes(), b'precious')
        other = self.out / '.clip-cache'
        other.symlink_to(self.cache, target_is_directory=True)
        with self.assertRaises(ValueError):
            cachectl.manage(self.out, 'clips', prune=True, apply=True)

    def test_abandoned_temp_and_orphan_metadata_are_reclaimed(self):
        folder = self.cache / '.audio-interrupted'
        folder.mkdir()
        (folder / 'half.wav').write_bytes(b'abandoned')
        (self.cache / ('a'*64+'.json')).write_text('{}')
        report = cachectl.manage(self.out, 'audio', prune=True, apply=True)
        self.assertEqual(report['removedBytes'], 11)
        self.assertEqual(list(self.cache.iterdir()), [])

    def test_limits_and_apply_require_explicit_valid_policy(self):
        for kwargs in ({'apply': True}, {'keep_bytes': -1}, {'older_days': float('nan')}, {'keep_bytes': float('inf')}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                cachectl.manage(self.out, 'audio', **kwargs)

    def test_audio_cache_records_hits_and_does_not_publish_failed_build(self):
        output = self.out / 'output.wav'
        def create(path):
            path.write_bytes(b'valid result')
        key = 'd' * 64
        self.assertFalse(soundtrack.cached_audio(self.cache, key, output, create, lambda: key))
        self.assertTrue(soundtrack.cached_audio(self.cache, key, output, create, lambda: key))
        with self.assertRaises(ValueError):
            soundtrack.cached_audio(self.cache, 'e'*64, output, create, lambda: 'changed')
        report = cachectl.manage(self.out, 'audio')
        self.assertEqual((report['hits'], report['misses'], report['entries']), (1, 1, 1))
        self.assertFalse((self.cache / ('e'*64+'.wav')).exists())

    def test_killed_builder_releases_lock_and_next_run_rebuilds(self):
        code = '''import sys, time
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import soundtrack
cache = Path(sys.argv[2])
def build(path):
    path.write_bytes(b'partial')
    print('ready', flush=True)
    time.sleep(60)
soundtrack.cached_audio(cache, 'a'*64, cache.parent/'output.wav', build, lambda: 'a'*64)
'''
        process = subprocess.Popen([sys.executable, '-c', code, str(ROOT/'tools'), str(self.cache)], stdout=subprocess.PIPE, text=True)
        try:
            self.assertEqual(process.stdout.readline().strip(), 'ready')
            self.assertTrue(cachectl.manage(self.out, 'audio', prune=True, apply=True)['busy'])
        finally:
            process.kill()
            process.wait(timeout=10)
            process.stdout.close()
        self.assertFalse((self.cache / ('a'*64+'.wav')).exists())
        self.assertGreater(cachectl.manage(self.out, 'audio', prune=True, apply=True)['removedBytes'], 0)
        key = 'a'*64
        hit = soundtrack.cached_audio(self.cache, key, self.out/'output.wav', lambda p: p.write_bytes(b'complete'), lambda: key)
        self.assertFalse(hit)
        self.assertEqual((self.out/'output.wav').read_bytes(), b'complete')

    def test_competing_builders_publish_once(self):
        code = '''import sys, time
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import soundtrack
cache = Path(sys.argv[2])
def build(path):
    with (cache.parent/'builds').open('a') as f: f.write('build\\n')
    time.sleep(.1)
    path.write_bytes(b'complete')
print(soundtrack.cached_audio(cache, 'a'*64, cache.parent/sys.argv[3], build, lambda: 'a'*64))
'''
        processes = [subprocess.Popen([sys.executable, '-c', code, str(ROOT/'tools'), str(self.cache), str(i)], stdout=subprocess.PIPE, text=True) for i in range(3)]
        try:
            results = [p.communicate(timeout=30)[0].strip() for p in processes]
            self.assertTrue(all(p.returncode == 0 for p in processes))
            self.assertEqual(sorted(results), ['False', 'True', 'True'])
            self.assertEqual((self.out/'builds').read_text(), 'build\n')
            self.assertEqual(cachectl.manage(self.out, 'audio')['hits'], 2)
        finally:
            for process in processes:
                if process.poll() is None:
                    process.kill()
                    process.wait()
