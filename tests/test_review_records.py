"""Version-bound human review and portable package integrity checks."""
import contextlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from test_review import fixture, ROOT
import delivery
import handoff
import review
import reviewstate
import verify_package
from mvproject import fingerprint


def record_for(data):
    ids=[i for i,s in enumerate(data['shots']) if s['from']<data['origin']+data['duration'] and s['to']>data['origin']]
    return dict(schema='mv-kit-review',version=1,binding=data['reviewBinding'],reviewer='Editor',updatedAt='2026-11-08T00:00:00Z',
                overall=dict(status='pass',note='带声复核完成'),shots=[dict(index=i,status='pass',note='') for i in ids])


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),'requires ffmpeg')
class ReviewRecordTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root=Path(temp.name)
        self.project=self.root/'project'
        self.project.mkdir()
        quiet=contextlib.redirect_stdout(io.StringIO())
        quiet.__enter__();self.addCleanup(quiet.__exit__,None,None,None)
        self.cfg,self.film=fixture(self.project)

    def package(self):
        return handoff.package(self.cfg,self.film,self.project/'out/package')

    def test_review_record_attaches_and_portable_verifier_accepts_without_project(self):
        page=review.build(self.cfg,self.film)
        data=json.loads((page.parent/'review.json').read_text())
        notes=self.root/'notes.json'
        notes.write_text(json.dumps(record_for(data)))
        target=self.project/'out/package'
        packaged=subprocess.run([sys.executable,str(ROOT/'tools/render.py'),str(self.project),'package',
                                 '--file',str(self.film),'--out',str(target),'--review-record',str(notes)],
                                capture_output=True,text=True)
        self.assertEqual(packaged.returncode,0,packaged.stdout+packaged.stderr)
        moved=self.root/'moved-package'
        shutil.copytree(target,moved)
        shutil.rmtree(self.project)  # disposable fixture; original absolute paths no longer exist
        report=verify_package.inspect(moved)
        self.assertEqual(report['status'],'pass',report)
        self.assertEqual(report['humanReview'],'pass')
        self.assertEqual(report['qa']['sync'],'unverified')  # integrity does not approve QA
        proc=subprocess.run([sys.executable,str(ROOT/'tools/verify_package.py'),str(moved)],capture_output=True,text=True)
        self.assertEqual(proc.returncode,0,proc.stderr)

    def test_subtitle_only_change_rejects_old_review_even_when_mp4_bytes_match(self):
        page=review.build(self.cfg,self.film)
        notes=record_for(json.loads((page.parent/'review.json').read_text()))
        before=fingerprint(self.film)
        source=self.project/'soundtrack.json'
        mix=json.loads(source.read_text());mix['subtitles'][0]['text']='Changed captions'
        source.write_text(json.dumps(mix))
        handoff.refresh_subtitles(self.cfg,self.film)
        self.assertEqual(before,fingerprint(self.film))
        new=review.build(self.cfg,self.film)
        data=json.loads((new.parent/'review.json').read_text())
        self.assertNotEqual(notes['binding'],data['reviewBinding'])
        path=self.root/'old-notes.json';path.write_text(json.dumps(notes))
        with self.assertRaisesRegex(ValueError,'version differs'):
            handoff.package(self.cfg,self.film,self.project/'out/stale',path)
        self.assertFalse((self.project/'out/stale').exists())

    def test_missing_corrupt_and_unlisted_required_files_fail(self):
        package=self.package()
        clip=package/'clips/001.mp4'
        saved=clip.read_bytes();clip.write_bytes(b'corrupt')
        self.assertEqual(verify_package.inspect(package)['status'],'fail')
        clip.write_bytes(saved)
        stem=package/'audio/mix.wav';stem.unlink()
        self.assertEqual(verify_package.inspect(package)['status'],'fail')
        manifest=json.loads((package/'manifest.json').read_text())
        manifest['files'].pop('audio/mix.wav')
        (package/'manifest.json').write_text(json.dumps(manifest))
        result=verify_package.inspect(package)
        self.assertTrue(any(c['kind']=='mix-duration' and c['status']=='fail' for c in result['checks']))

    def test_gaps_subtitle_range_and_false_human_approval_fail(self):
        package=self.package()
        manifest=json.loads((package/'manifest.json').read_text())
        manifest['shots'][1]['startFrame']+=1
        manifest['subtitles'][0]['end']=20
        manifest['humanReview']='pass'
        (package/'manifest.json').write_text(json.dumps(manifest))
        result=verify_package.inspect(package)
        failed={c['kind'] for c in result['checks'] if c['status']=='fail'}
        self.assertTrue({'frame-coverage','subtitle-range-and-files','human-review'}<=failed)

    def test_rehashed_wrong_duration_stem_is_still_rejected(self):
        package=self.package()
        source=package/'audio/voice.wav'
        shorter=package/'short.wav'
        delivery.run(['ffmpeg','-v','error','-i',str(source),'-t','0.5','-c:a','pcm_f32le',str(shorter)])
        shorter.replace(source)
        manifest=json.loads((package/'manifest.json').read_text())
        manifest['files']['audio/voice.wav']=fingerprint(source)
        (package/'manifest.json').write_text(json.dumps(manifest))
        result=verify_package.inspect(package)
        self.assertTrue(any(c['kind']=='audio-duration' and c['status']=='fail' for c in result['checks']))

    def test_paths_cannot_escape_package_or_follow_symlinks(self):
        package=self.package()
        manifest=json.loads((package/'manifest.json').read_text())
        secret=self.root/'outside.txt';secret.write_text('outside')
        manifest['files']['../outside.txt']=fingerprint(secret)
        clip=package/'clips/001.mp4';clip.unlink();clip.symlink_to(secret)
        (package/'manifest.json').write_text(json.dumps(manifest))
        original=verify_package.fingerprint
        def safe(path):
            self.assertNotEqual(Path(path).resolve(),secret.resolve(),'must not read external files')
            return original(path)
        with patch.object(verify_package,'fingerprint',side_effect=safe):
            result=verify_package.inspect(package)
        self.assertEqual(result['status'],'fail')

    def test_malformed_manifest_returns_failure_not_traceback(self):
        package=self.package()
        for value in ([],{},dict(version=1,fps=float('nan'))):
            (package/'manifest.json').write_text(json.dumps(value))
            self.assertEqual(verify_package.inspect(package)['status'],'fail')

    def test_unreviewed_shots_cannot_be_overall_approved(self):
        page=review.build(self.cfg,self.film)
        data=json.loads((page.parent/'review.json').read_text())
        value=record_for(data);value['shots'][0]['status']='pending'
        with self.assertRaisesRegex(ValueError,'all shots'):
            reviewstate.validate(value,data['reviewBinding'],[0,1])

    def test_node_review_record_rules(self):
        result=subprocess.run(['node','--test',str(ROOT/'tests/review_notes.test.cjs')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
