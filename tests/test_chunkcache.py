"""Actual encoded chunk validation, incomplete publication and content-key regressions."""
import json
import os
from pathlib import Path
import runpy
import shutil
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
import cachectl
import chunkcache
import delivery
from mvproject import fingerprint


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'requires ffmpeg/ffprobe')
class ChunkCacheTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.cache = self.root/'.chunks'
        self.cache.mkdir()
        self.target = self.cache/('a'*10+'-000000-000024-'+'b'*12+'.mp4')
        self.expected = chunkcache.specification(0, 24, 24, 96, 54)
        self.original = self.root/'original.mp4'
        self.encode(self.original)

    def encode(self, target, color='blue'):
        delivery.run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={color}:s=96x54:r=24:d=1',
                      '-an','-c:v','libx264','-pix_fmt','yuv420p',str(target)])

    def publish(self):
        staged = self.cache/'.tmp-123-chunk.mp4'
        shutil.copy2(self.original, staged)
        chunkcache.publish(staged, self.target, self.expected)

    def test_verified_chunk_reuses_without_redecoding(self):
        self.publish()
        with patch.object(chunkcache, 'run', side_effect=AssertionError('hit must not decode again')):
            self.assertTrue(chunkcache.reusable(self.target, self.expected))
        metadata = json.loads(chunkcache.metadata_path(self.target).read_text())
        self.assertEqual(metadata['media'], fingerprint(self.target))
        self.assertEqual(metadata['specification']['frames'], 24)

    def test_corrupt_same_size_same_mtime_chunk_is_a_miss(self):
        self.publish()
        stamp = self.target.stat()
        with self.target.open('r+b') as handle:
            handle.seek(64)
            byte = handle.read(1)
            handle.seek(64)
            handle.write(bytes([byte[0]^1]))
        os.utime(self.target, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))
        self.assertFalse(chunkcache.reusable(self.target, self.expected))
        self.publish()
        self.assertTrue(chunkcache.reusable(self.target, self.expected))

    def test_legacy_missing_and_malformed_metadata_are_misses(self):
        shutil.copy2(self.original, self.target)
        self.assertFalse(chunkcache.reusable(self.target, self.expected))
        stamp = chunkcache.metadata_path(self.target)
        for text in ('{broken', '[]', 'null', '{}', '{"version":999}'):
            with self.subTest(text=text):
                stamp.write_text(text)
                self.assertFalse(chunkcache.reusable(self.target, self.expected))
        self.publish()
        self.target.unlink()
        self.assertFalse(chunkcache.reusable(self.target, self.expected))

    def test_other_range_fps_size_and_cache_name_do_not_reuse(self):
        self.publish()
        for field, value in [('startFrame', 24), ('frames', 25), ('fps', 30), ('width', 192), ('height', 108)]:
            with self.subTest(field=field):
                self.assertFalse(chunkcache.reusable(self.target, dict(self.expected, **{field:value})))
        other = self.target.with_name('other.mp4')
        shutil.copy2(self.target, other)
        shutil.copy2(chunkcache.metadata_path(self.target), chunkcache.metadata_path(other))
        self.assertFalse(chunkcache.reusable(other, self.expected))

    def test_wrong_decoded_specs_are_rejected_before_publication(self):
        for field, value in [('frames', 23), ('fps', 30), ('width', 192), ('height', 108), ('codec', 'vp9')]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                chunkcache.publish(self.original, self.target, dict(self.expected, **{field:value}))
            self.assertTrue(self.original.exists())
            self.assertFalse(self.target.exists())
            self.assertFalse(chunkcache.metadata_path(self.target).exists())

    def test_audio_stream_is_rejected(self):
        staged = self.root/'with-audio.mp4'
        delivery.run(['ffmpeg','-y','-v','error','-i',str(self.original),'-f','lavfi','-i','sine=duration=1',
                      '-c:v','copy','-c:a','aac','-shortest',str(staged)])
        with self.assertRaises(ValueError):
            chunkcache.publish(staged, self.target, self.expected)
        self.assertFalse(self.target.exists())

    def test_corrupt_new_encode_preserves_previous_verified_chunk(self):
        self.publish()
        before = fingerprint(self.target)
        staged = self.root/'truncated.mp4'
        staged.write_bytes(self.original.read_bytes()[:100])
        with self.assertRaises(ValueError):
            chunkcache.publish(staged, self.target, self.expected)
        self.assertEqual(fingerprint(self.target), before)
        self.assertTrue(chunkcache.reusable(self.target, self.expected))

    def test_decode_errors_with_zero_exit_are_not_certified(self):
        with patch.object(chunkcache, 'run', return_value=SimpleNamespace(stdout=b'{}', stderr=b'damaged packet')):
            with self.assertRaisesRegex(ValueError, 'decode failed'):
                chunkcache.publish(self.original, self.target, self.expected)
        self.assertFalse(self.target.exists())

    def test_interrupted_pair_publication_is_a_miss_then_recovers(self):
        self.publish()
        staged = self.root/'changed.mp4'
        self.encode(staged, color='red')
        replace = Path.replace
        def interrupted(path, target):
            if Path(target) == chunkcache.metadata_path(self.target):
                raise OSError('simulated interruption before metadata replacement')
            return replace(path, target)
        with patch.object(Path, 'replace', interrupted), self.assertRaises(OSError):
            chunkcache.publish(staged, self.target, self.expected)
        self.assertFalse(chunkcache.reusable(self.target, self.expected))
        self.publish()
        self.assertTrue(chunkcache.reusable(self.target, self.expected))
        self.assertFalse(list(self.cache.glob('.tmp-*')))

    def test_media_and_metadata_clean_as_one_entry_including_orphans(self):
        self.publish()
        report = cachectl.manage(self.root, 'chunks', prune=True)
        self.assertEqual(report['entries'], 1)
        self.assertEqual(len(report['candidates'][0]['files']), 2)
        self.assertTrue(chunkcache.reusable(self.target, self.expected))
        self.target.unlink()
        report = cachectl.manage(self.root, 'chunks', prune=True, apply=True)
        self.assertEqual(report['entries'], 1)
        self.assertFalse(chunkcache.metadata_path(self.target).exists())

    def test_symlinked_chunk_or_metadata_is_never_reused(self):
        self.publish()
        self.target.unlink()
        self.target.symlink_to(self.original)
        self.assertFalse(chunkcache.reusable(self.target, self.expected))
        self.target.unlink()
        self.publish()
        stamp = chunkcache.metadata_path(self.target)
        copy = self.root/'metadata.json'
        shutil.copy2(stamp, copy)
        stamp.unlink()
        stamp.symlink_to(copy)
        self.assertFalse(chunkcache.reusable(self.target, self.expected))


class AssetKeyTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        (self.root/'project.js').write_text('window.MV_PROJECT = {"title":"keys"};')
        with patch.object(sys, 'argv', ['render.py', str(self.root)]):
            self.renderer = runpy.run_path(str(ROOT/'tools/render.py'), run_name='chunk_key_test')
        self.asset = self.root/'texture.bin'
        with self.asset.open('wb') as handle:
            for _ in range(17):
                handle.write(b'a'*(1<<20))
        self.info = dict(width=96,height=54,sceneSrc={},shots=[dict(name='shot',scene='motion',**{'from':0,'to':8})])

    def test_large_same_size_same_timestamp_edit_invalidates_chunk_plan(self):
        _, before = self.renderer['plan_chunks'](self.info, 0, 192, 24)
        original = self.asset.stat()
        with self.asset.open('r+b') as handle:
            handle.seek(-1, 2)
            handle.write(b'b')
        os.utime(self.asset, ns=(original.st_atime_ns,original.st_mtime_ns))
        _, after = self.renderer['plan_chunks'](self.info, 0, 192, 24)
        self.assertEqual(self.asset.stat().st_size, original.st_size)
        self.assertEqual(self.asset.stat().st_mtime_ns, original.st_mtime_ns)
        self.assertTrue(all(a[2] != b[2] for a,b in zip(before, after)))

    def test_timestamp_only_change_keeps_content_key_and_hashing_is_streamed(self):
        with patch.object(Path, 'read_bytes', side_effect=AssertionError('must stream source bytes')):
            before = self.renderer['file_key'](self.asset)
            stamp = self.asset.stat()
            os.utime(self.asset, ns=(stamp.st_atime_ns,stamp.st_mtime_ns+1_000_000_000))
            self.assertEqual(before, self.renderer['file_key'](self.asset))
        self.assertEqual(before, fingerprint(self.asset)['sha256'])

    def test_shared_scene_dependency_is_hashed_once_per_plan(self):
        helper = self.root/'helper.js'
        helper.write_text('const HELPER = 1;')
        first = self.root/'first.js'
        second = self.root/'second.js'
        first.write_text('MV.scene("first", {render() {return HELPER}});')
        second.write_text('MV.scene("second", {render() {return HELPER}});')
        info = dict(self.info, sceneSrc={p.stem:p.as_uri() for p in (helper,first,second)})
        globals_ = self.renderer['input_keys'].__globals__
        original = globals_['file_key']
        with patch.dict(globals_, file_key=Mock(wraps=original)):
            self.renderer['input_keys'](info)
            paths = [call.args[0] for call in globals_['file_key'].call_args_list]
        self.assertEqual(paths.count(helper.resolve()), 1)
        self.assertEqual(len(paths), len(set(paths)))
