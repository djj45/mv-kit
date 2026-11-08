"""Real packet identity, decode avoidance, invalidation and managed cache recovery."""
import concurrent.futures
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from test_review import fixture
from test_review_records import record_for
import cachectl
import delivery
import handoff
import review
import reviewcache
import reviewstate
import shotidentity
import verify_package


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'requires ffmpeg')
class ReviewCacheTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        quiet = contextlib.redirect_stdout(io.StringIO()); quiet.__enter__(); self.addCleanup(quiet.__exit__, None, None, None)
        self.cfg, self.film = fixture(self.root, ids=True)
        self.record = json.loads(delivery.receipt_path(self.film).read_text())
        self.cache = self.root/'out/.review-cache'

    def picture(self):
        return reviewcache.picture(self.film, self.record, self.cache)

    def test_repeat_and_audio_remux_reuse_without_pixel_decode(self):
        a = self.picture()
        self.assertFalse(a[2]['hit'])
        sidecar = self.root/'soundtrack.json'; mix = json.loads(sidecar.read_text())
        mix['tracks'][0]['gainDb'] = -9; sidecar.write_text(json.dumps(mix))
        with patch.object(reviewcache, 'decode', side_effect=AssertionError('must not decode pixels')):
            b = self.picture()
            handoff.remix(self.cfg, self.film)
            self.record = json.loads(delivery.receipt_path(self.film).read_text())
            c = self.picture()
        self.assertTrue(b[2]['hit']); self.assertTrue(c[2]['hit'])
        self.assertEqual(a[:2], c[:2]); self.assertEqual(a[2]['key'], c[2]['key'])
        stats = cachectl.manage(self.root/'out', 'review')
        self.assertEqual((stats['misses'], stats['hits']), (1, 2))

    def test_subtitle_review_reuses_cache_and_preserves_ids_through_package(self):
        page = review.build(self.cfg, self.film)
        before = json.loads((page.parent/'review.json').read_text())
        sidecar = self.root/'soundtrack.json'; mix = json.loads(sidecar.read_text())
        mix['subtitles'][0]['text'] = 'Changed'; sidecar.write_text(json.dumps(mix))
        handoff.refresh_subtitles(self.cfg, self.film)
        with patch.object(reviewcache, 'decode', side_effect=AssertionError('must reuse')):
            after = json.loads((review.build(self.cfg, self.film).parent/'review.json').read_text())
        self.assertTrue(after['pictureCache']['hit'])
        self.assertEqual(before['comparison']['picture'], after['comparison']['picture'])
        self.assertEqual([s['id'] for s in after['comparison']['shots']], ['review-shot-0','review-shot-1'])
        value = record_for(after); value['snapshot'] = after['comparison']
        notes = self.root/'out/notes.json'; notes.write_text(json.dumps(value))
        package = handoff.package(self.cfg, self.film, self.root/'out/package', notes)
        self.assertEqual(verify_package.inspect(package)['status'], 'pass')
        self.assertEqual(json.loads((package/'review-record.json').read_text())['snapshot'], value['snapshot'])

    def test_picture_replacement_ignores_mtime_and_invalidates(self):
        before = self.picture(); stat = self.film.stat()
        changed = self.root/'out/changed.mp4'
        delivery.run(['ffmpeg','-v','error','-i',str(self.film),'-an','-vf','negate',
                      '-c:v','libx264','-pix_fmt','yuv420p',str(changed)])
        changed.replace(self.film); os.utime(self.film, ns=(stat.st_atime_ns,stat.st_mtime_ns))
        after = self.picture()
        self.assertFalse(after[2]['hit']); self.assertNotEqual(before[2]['key'], after[2]['key'])
        self.assertNotEqual(before[1], after[1])

    def test_corrupt_and_incomplete_entries_rebuild(self):
        first = self.picture(); path = self.cache/(first[2]['key']+'.json')
        valid = json.loads(path.read_text()); corrupt = json.loads(path.read_text())
        corrupt['payload']['frames'][0] = '0'*64
        for text in ('{', '[]', json.dumps(corrupt), json.dumps({**valid,'payload':{'spec':valid['payload']['spec'],'frames':[]}})):
            with self.subTest(text=text[:30]):
                path.write_text(text)
                rebuilt = self.picture()
                self.assertFalse(rebuilt[2]['hit']); self.assertEqual(first[:2], rebuilt[:2])

    def test_decoder_version_changes_invalidate(self):
        first = self.picture()
        with patch.object(reviewcache, 'encoder_version', return_value='different decoder'):
            second = self.picture()
        self.assertFalse(second[2]['hit']); self.assertNotEqual(first[2]['key'], second[2]['key'])

    def test_wrong_count_interrupt_and_source_change_do_not_publish(self):
        with self.assertRaisesRegex(ValueError,'frame count'):
            reviewcache.picture(self.film, {**self.record,'frames':49}, self.cache)
        with patch.object(reviewcache, 'decode', side_effect=KeyboardInterrupt), self.assertRaises(KeyboardInterrupt):
            self.picture()
        original = reviewcache.decode
        def change(*args):
            frames = original(*args)
            with self.film.open('ab') as f: f.write(b'changed')
            return frames
        with patch.object(reviewcache, 'decode', side_effect=change), self.assertRaisesRegex(ValueError,'source film changed'):
            self.picture()
        self.assertEqual(list(self.cache.glob('*.json')), [])

    def test_concurrent_processes_build_once_and_cleanup_respects_lease(self):
        script = ('import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[1]);'
                  'import reviewcache,delivery;f=Path(sys.argv[2]);'
                  'r=json.loads(delivery.receipt_path(f).read_text());'
                  'print(json.dumps(reviewcache.picture(f,r,Path(sys.argv[3]))[2]))')
        args = [sys.executable,'-c',script,str(Path(reviewcache.__file__).parent),str(self.film),str(self.cache)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: subprocess.run(args,capture_output=True,text=True,timeout=30), range(2)))
        for result in results: self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(sorted(json.loads(r.stdout.splitlines()[-1])['hit'] for r in results), [False,True])
        unknown = self.cache/'keep.txt'; unknown.write_text('keep')
        with cachectl.lease(self.cache):
            self.assertTrue(cachectl.manage(self.root/'out','review',prune=True,apply=True)['busy'])
        preview = cachectl.manage(self.root/'out','review',prune=True)
        self.assertEqual(preview['entries'],1); self.assertGreater(preview['reclaimableBytes'],0)
        self.assertTrue(list(self.cache.glob('*.json')))
        cachectl.manage(self.root/'out','review',prune=True,apply=True)
        self.assertEqual(list(self.cache.iterdir()),[unknown])


class ShotIdentityTests(unittest.TestCase):
    def test_optional_unique_ids_and_invalid_ids(self):
        shotidentity.validate([{}, {'id':'opening-01'}, {'id':'scene:two.v2'}])
        for value in (None, 1, '', 'space id', 'a'*129, 'end\n'):
            with self.subTest(value=value), self.assertRaises(ValueError): shotidentity.validate([{'id':value}])
        with self.assertRaises(ValueError): shotidentity.validate([{'id':'same'},{'id':'same'}])

    def test_review_import_rejects_invalid_or_duplicate_snapshot_ids(self):
        # Minimal valid optional snapshot; no media or browser needed.
        value = dict(schema='mv-kit-review',version=1,binding='v',reviewer='',updatedAt='',
                     overall=dict(status='pending',note=''),shots=[dict(index=i,status='pending',note='') for i in range(2)])
        value['snapshot'] = dict(version=1,binding='v',title='',picture='',mix='',tracks=[],cues=[],
                                 shots=[dict(index=i,name='',scene='',picture='',start=i,end=i+1,id='same') for i in range(2)])
        with self.assertRaisesRegex(ValueError,'shot.id'): reviewstate.validate(value,'v',[0,1])
