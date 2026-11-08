"""Actual media comparison and preservation of advisory review history."""
import contextlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from test_review import fixture
from test_review_records import record_for
import delivery
import handoff
import review
import reviewstate
import verify_package
from mvproject import fingerprint


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),'requires ffmpeg')
class ReviewComparisonTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        self.root=Path(temp.name)
        quiet=contextlib.redirect_stdout(io.StringIO());quiet.__enter__();self.addCleanup(quiet.__exit__,None,None,None)
        self.cfg,self.film=fixture(self.root)
        self.page=review.build(self.cfg,self.film)
        self.before=json.loads((self.page.parent/'review.json').read_text())

    def test_subtitle_only_edit_changes_cues_not_picture_or_tracks(self):
        sidecar=self.root/'soundtrack.json';mix=json.loads(sidecar.read_text());mix['subtitles'][0]['text']='Changed'
        sidecar.write_text(json.dumps(mix));handoff.refresh_subtitles(self.cfg,self.film)
        after=json.loads((review.build(self.cfg,self.film).parent/'review.json').read_text())
        a,b=self.before['comparison'],after['comparison']
        self.assertNotEqual(a['binding'],b['binding']);self.assertNotEqual(a['cues'],b['cues'])
        self.assertEqual(a['picture'],b['picture']);self.assertEqual(a['shots'],b['shots']);self.assertEqual(a['tracks'],b['tracks']);self.assertEqual(a['mix'],b['mix'])

    def test_audio_edit_changes_only_affected_track_and_mix(self):
        sidecar=self.root/'soundtrack.json';mix=json.loads(sidecar.read_text());mix['tracks'][0]['gainDb']=-9
        sidecar.write_text(json.dumps(mix));handoff.remix(self.cfg,self.film)
        after=json.loads((review.build(self.cfg,self.film).parent/'review.json').read_text())
        a,b=self.before['comparison'],after['comparison']
        self.assertEqual(a['picture'],b['picture']);self.assertEqual(a['shots'],b['shots']);self.assertEqual(a['cues'],b['cues'])
        self.assertEqual(a['tracks'][0],b['tracks'][0]);self.assertNotEqual(a['tracks'][1],b['tracks'][1]);self.assertNotEqual(a['mix'],b['mix'])

    def test_picture_comparison_localizes_the_changed_shot(self):
        changed=self.root/'out/changed.mp4'
        delivery.run(['ffmpeg','-v','error','-i',str(self.film),'-an','-vf',"drawbox=x=0:y=0:w=iw:h=ih:c=blue:t=fill:enable='gte(t,1)'",'-c:v','libx264','-qp','0','-pix_fmt','yuv420p',str(changed)])
        record=json.loads(delivery.receipt_path(self.film).read_text())
        files={str(p.relative_to(self.page.parent)):fingerprint(p) for p in self.page.parent.rglob('*') if p.is_file()}
        files['film.mp4']=fingerprint(changed)
        after=reviewstate.snapshot(record,files,changed,self.before['cues'])
        before=self.before['comparison']
        self.assertEqual(before['shots'][0]['picture'],after['shots'][0]['picture'])
        self.assertNotEqual(before['shots'][1]['picture'],after['shots'][1]['picture'])

    def test_context_is_preserved_by_packaging_and_independent_verification(self):
        value=record_for(self.before);value['snapshot']=self.before['comparison']
        value['references']=[dict(binding='previous',reviewer='Previous editor',updatedAt='then',overallNote='Historical context',
                                  shots=[dict(oldIndex=8,currentIndex=0,name='Old name',note='Keep as reference')])]
        value['overall']['status']='pending'
        for row in value['shots']:row['status']='pending'
        notes=self.root/'out/notes.json';notes.write_text(json.dumps(value))
        package=handoff.package(self.cfg,self.film,self.root/'out/package',notes)
        attached=json.loads((package/'review-record.json').read_text())
        self.assertEqual(attached['references'],value['references']);self.assertEqual(attached['snapshot'],value['snapshot'])
        result=verify_package.inspect(package)
        self.assertEqual(result['status'],'pass',result);self.assertEqual(result['humanReview'],'pending')

    def test_foreign_reference_target_is_rejected(self):
        value=record_for(self.before)
        value['references']=[dict(binding='old',reviewer='',updatedAt='',overallNote='',shots=[dict(oldIndex=0,currentIndex=88,name='bad',note='bad')])]
        with self.assertRaisesRegex(ValueError,'unknown shot'):
            reviewstate.validate(value,self.before['reviewBinding'],[0,1])
