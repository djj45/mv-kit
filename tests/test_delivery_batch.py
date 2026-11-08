"""Batch cache behavior and stable snapshots, using the real encoder."""
import contextlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from test_review import fixture
import cachectl
import clipcache
import delivery
import handoff
from mvproject import fingerprint


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),'requires ffmpeg')
class BatchDeliveryTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        quiet = contextlib.redirect_stdout(io.StringIO())
        quiet.__enter__()
        self.addCleanup(quiet.__exit__,None,None,None)
        self.cfg,self.film = fixture(self.root)
        self.record = json.loads(delivery.receipt_path(self.film).read_text())
        self.rows = handoff.shot_ranges(self.record)
        self.cache = self.root/'out/.clip-cache'

    def batch(self, name='batch', rows=None):
        return clipcache.export_many(self.film,rows or self.rows,self.record,self.cache,self.root/'out'/name/'clips')

    def test_cold_one_decode_and_warm_zero_decode(self):
        with patch.object(clipcache,'encode_many',wraps=clipcache.encode_many) as encode:
            identity,counts,work = self.batch()
            self.assertEqual(counts,dict(reused=0,encoded=2))
            self.assertEqual(encode.call_count,1)
            self.assertEqual(work['sourceSnapshotChecks'],1)
        with patch.object(clipcache,'encode_many',side_effect=AssertionError('warm cache must not decode')):
            other,counts,work = self.batch('warm')
        self.assertEqual(other,identity)
        self.assertEqual(counts,dict(reused=2,encoded=0))
        self.assertEqual(work['decodePasses'],0)

    def test_invalid_partition_and_bad_source_publish_nothing(self):
        for rows in ([dict(startFrame=1,endFrame=48)], [dict(startFrame=0,endFrame=24)],
                     [dict(startFrame=0,endFrame=30),dict(startFrame=24,endFrame=48)]):
            with self.assertRaises(ValueError):
                self.batch(rows=rows)
        self.film.write_bytes(b'changed source')
        with self.assertRaisesRegex(ValueError,'snapshot'):
            self.batch()
        self.assertFalse(list(self.cache.glob('*.mp4')))

    def test_source_change_uses_snapshot_and_package_is_not_published(self):
        original = self.film.read_bytes()
        encode = clipcache.encode_many
        def mutate(snapshot,*args):
            self.assertNotEqual(Path(snapshot),self.film)
            self.film.write_bytes(b'replaced while encoding')
            return encode(snapshot,*args)
        target = self.root/'out/package'
        with patch.object(clipcache,'encode_many',side_effect=mutate), self.assertRaisesRegex(ValueError,'inputs changed'):
            handoff.package(self.cfg,self.film,target)
        self.assertFalse(target.exists())
        self.assertEqual(len(list(self.cache.glob('*.mp4'))),2)
        self.film.write_bytes(original)
        with patch.object(clipcache,'encode_many',side_effect=AssertionError('safe snapshot clips must be reusable')):
            handoff.package(self.cfg,self.film,target)
        self.assertEqual(json.loads((target/'manifest.json').read_text())['clipCache'],dict(reused=2,encoded=0))

    def test_invalid_encoded_clip_is_not_cached_and_pipeline_releases_lock(self):
        with patch.object(clipcache,'verify_clip',side_effect=ValueError('bad decoded frames')), self.assertRaises(ValueError):
            self.batch()
        self.assertFalse(list(self.cache.glob('*.mp4')))
        self.assertFalse(cachectl.manage(self.root/'out','clips')['busy'])
        self.assertFalse(list(self.cache.glob('.clip-*')))
        _,counts,_ = self.batch('retry')
        self.assertEqual(counts['encoded'],2)

    def test_only_corrupt_clip_is_rebuilt_and_delivered_files_are_independent(self):
        self.batch()
        second = self.rows[1]['cacheKey']
        cached = self.cache/(second+'.mp4')
        cached.write_bytes(b'damaged')
        original = fingerprint(self.cache/(self.rows[0]['cacheKey']+'.mp4'))
        (self.root/'out/batch/clips/001.mp4').write_bytes(b'editor change')
        _,counts,work = self.batch('retry')
        self.assertEqual(counts,dict(reused=1,encoded=1))
        self.assertEqual(work['decodedFrameWindow'],[24,48])
        self.assertEqual(fingerprint(self.root/'out/retry/clips/001.mp4'),original)

    def test_unequal_shots_one_frame_and_fractional_fps_keep_exact_boundaries(self):
        source = self.root/'out/fractional.mp4'
        delivery.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=96x54:r=30000/1001',
                      '-frames:v','48','-c:v','libx264',str(source)])
        record = dict(frames=48,fps=30000/1001,width=96,height=54,filmSha256=fingerprint(source)['sha256'])
        rows = [dict(startFrame=a,endFrame=b) for a,b in [(0,1),(1,7),(7,19),(19,48)]]
        _,counts,work = clipcache.export_many(source,rows,record,self.cache,self.root/'out/fractional/clips')
        self.assertEqual(counts,dict(reused=0,encoded=4))
        self.assertEqual(work['strategy'],'segment')
        for i,row in enumerate(rows,1):
            clipcache.verify_clip(self.root/f'out/fractional/clips/{i:03}.mp4',row['endFrame']-row['startFrame'],
                                  record['fps'],96,54)

    def test_scattered_misses_share_one_decoder_and_preserve_cached_middle(self):
        rows = [dict(startFrame=a,endFrame=b) for a,b in [(0,12),(12,24),(24,48)]]
        self.batch(rows=rows)
        for row in (rows[0],rows[2]):
            (self.cache/(row['cacheKey']+'.mp4')).write_bytes(b'broken')
        middle = self.cache/(rows[1]['cacheKey']+'.mp4')
        stamp = (fingerprint(middle),middle.stat().st_mtime_ns)
        _,counts,work = self.batch('scattered',rows=rows)
        self.assertEqual(counts,dict(reused=1,encoded=2))
        self.assertEqual(work['decodePasses'],1)
        self.assertEqual(work['strategy'],'raw-stream')
        self.assertEqual((fingerprint(middle),middle.stat().st_mtime_ns),stamp)
