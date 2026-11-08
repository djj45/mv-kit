"""Frame-bound review issues, approval guards and portable verification."""
import contextlib
import copy
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from test_review import fixture, ROOT
from test_review_records import record_for
import delivery
import handoff
import review
import reviewstate
import verify_package
from mvproject import fingerprint


@unittest.skipUnless(shutil.which('ffmpeg'), 'requires ffmpeg')
class TimedIssueTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup); self.root=Path(temp.name)
        quiet=contextlib.redirect_stdout(io.StringIO());quiet.__enter__();self.addCleanup(quiet.__exit__,None,None,None)
        self.cfg,self.film=fixture(self.root,ids=True)
        self.record=json.loads(delivery.receipt_path(self.film).read_text())
        page=review.build(self.cfg,self.film); self.data=json.loads((page.parent/'review.json').read_text())
        self.value=record_for(self.data); self.value.update(version=2,snapshot=self.data['comparison'],issues=[
            dict(id='point-1',kind='point',startFrame=24,endFrame=25,shotIndex=1,shotId='review-shot-1',note='Late landing',status='open',resolution='')])
        self.value['shots'][1]['status']='changes';self.value['overall']['status']='pending'

    def validate(self,value):
        return reviewstate.validate(value,self.data['reviewBinding'],[0,1],self.record)

    def package(self,value):
        path=self.root/'out/notes.json';path.write_text(json.dumps(value))
        return handoff.package(self.cfg,self.film,self.root/'out/package',path)

    def test_timed_issues_and_historical_context_survive_portable_package(self):
        self.value['references']=[dict(binding='old',reviewer='Previous',updatedAt='',overallNote='',shots=[],
            issueClock=dict(origin=1,fps=24,frames=48),issues=[dict(self.value['issues'][0],status='verified',resolution='Previous fix',currentIndex=1)])]
        package=self.package(self.value)
        saved=json.loads((package/'review-record.json').read_text());self.assertEqual(saved,self.value)
        result=verify_package.inspect(package);self.assertEqual(result['status'],'pass',result);self.assertEqual(result['humanReview'],'pending')

    def test_unverified_issues_block_shot_and_overall_but_verified_does_not_auto_approve(self):
        for status in ('open','fixed'):
            value=copy.deepcopy(self.value);value['issues'][0].update(status=status,resolution='Correction')
            self.validate(value)
            value['shots'][1]['status']='pass'
            with self.assertRaisesRegex(ValueError,'unverified issues'):self.validate(value)
        value=copy.deepcopy(self.value);value['issues'][0].update(status='verified',resolution='Confirmed')
        self.assertEqual(self.validate(value)['overall']['status'],'pending')
        value['shots'][1]['status']='pass';value['overall']['status']='pass'
        self.assertEqual(self.validate(value)['overall']['status'],'pass')

    def test_range_uses_output_frames_with_nonzero_origin_and_crosses_shots(self):
        value=copy.deepcopy(self.value);value['issues'][0].update(kind='range',startFrame=20,endFrame=30,shotIndex=0,shotId='review-shot-0')
        with self.assertRaisesRegex(ValueError,'unverified issues'):self.validate(value)
        value['shots'][0]['status']='changes';self.validate(value)

    def test_package_rejects_forged_snapshot_clock_even_if_self_consistent(self):
        value=copy.deepcopy(self.value);value['snapshot']['fps']=48
        value['issues'][0].update(shotIndex=0,shotId='review-shot-0');value['shots'][0]['status']='changes'
        reviewstate.validate(value,self.data['reviewBinding'],[0,1])
        with self.assertRaisesRegex(ValueError,'clock differs'):self.package(value)
        self.assertFalse((self.root/'out/package').exists())

    def test_independent_verifier_rejects_rehashed_bad_time_or_false_approval(self):
        package=self.package(self.value);value=copy.deepcopy(self.value)
        value['issues'][0]['endFrame']=49
        path=package/'review-record.json';path.write_text(json.dumps(value))
        manifest=json.loads((package/'manifest.json').read_text());manifest['files']['review-record.json']=fingerprint(path)
        (package/'manifest.json').write_text(json.dumps(manifest))
        result=verify_package.inspect(package)
        self.assertTrue(any(r['kind']=='human-review' and r['status']=='fail' for r in result['checks']))

    def test_python_and_browser_validation_agree_on_issue_records(self):
        cases=[copy.deepcopy(self.value)]
        edits=[lambda v:v.update(version=1),lambda v:v['issues'][0].update(startFrame=-1),
               lambda v:v['issues'][0].update(startFrame=True),lambda v:v['issues'][0].update(endFrame=48),
               lambda v:v['issues'][0].update(shotId='wrong'),lambda v:v['issues'][0].update(note=''),
               lambda v:v['issues'][0].update(status='fixed'),lambda v:v['issues'][0].update(status='verified',resolution='Done'),
               lambda v:v['issues'].append(copy.deepcopy(v['issues'][0])),lambda v:v['shots'][1].update(status='pass')]
        for edit in edits:
            value=copy.deepcopy(self.value);edit(value);cases.append(value)
        outcomes=[]
        for value in cases:
            try:reviewstate.validate(value,self.data['reviewBinding'],[0,1]);outcomes.append(True)
            except ValueError:outcomes.append(False)
        script="const r=require('./tools/review-notes.js'),fs=require('fs');const cases=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(cases.map(v=>{try{r.validate(v,v.binding,[0,1]);return true}catch(e){return false}})));"
        proc=subprocess.run(['node','-e',script],input=json.dumps(cases),text=True,capture_output=True,cwd=ROOT,check=True)
        self.assertEqual(json.loads(proc.stdout),outcomes);self.assertTrue(outcomes[0]);self.assertFalse(outcomes[1])
