"""Real Canvas subject QA regression; optional local VITRAIL integration.

python tests/subject_browser.py --out artifacts/subject [--vitrail]
"""
import argparse
import base64
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import qa
import subjectqa
from mvproject import load_project


class Page:
    def __init__(self, page):
        self.page = page

    def frame(self, t, samples, fmt, errors):
        data = self.page.evaluate('([t,n,fmt])=>MV_EXPORT.frame(t,n,.5,...fmt)', [t,samples,fmt])
        return base64.b64decode(data.split(',',1)[1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--vitrail', action='store_true')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    checks = []
    with tempfile.TemporaryDirectory(prefix='subject-qa-') as tmp, sync_playwright() as pw:
        project = Path(tmp)
        cfg = dict(title='subject-fixture', width=640, height=360, fps=24, **{'from':0,'to':2},
                   data=['score.js'], kits=['camera'], scenes=['fixture'], post={'grain':0,'vignette':0},
                   qa={'margin':8})
        (project/'project.js').write_text('window.MV_PROJECT='+json.dumps(cfg)+';')
        (project/'index.html').write_text('<meta charset="utf-8"><canvas id="mv"></canvas><script src="project.js"></script>'
                                        f'<script src="{(ROOT/"engine/boot.js").as_uri()}"></script>')
        (project/'score.js').write_text('window.MV_DATA={lyrics:{lines:[{text:"EYE",start:0,end:2,words:[{w:"EYE",start:0,end:2}]}]}};')
        (project/'timeline.js').write_text("MV.timeline(()=>[{scene:'fixture',from:0,to:2,push:0}]);")
        (project/'scenes').mkdir()
        (project/'scenes/fixture.js').write_text('''
MV.scene('fixture',{render(g,f){
 const c=window.CASE || {};
 g.fillStyle='#080808';g.fillRect(0,0,W,H);
 g.save(); if(c.local){g.translate(40,10);g.rotate(.12);}
 g.fillStyle='#090909';g.fillRect(260,140,120,80);
 if(!c.unmarked&&!c.screen&&!c.offscreen) MV.protect(g,260,140,c.invalid?-1:120,80,{name:'dark-eye',severity:c.strict?'error':'warn'});
 if(c.offscreen) MV.protect(mk(640,360).getContext('2d'),260,140,120,80,{name:'offscreen-eye'});
 g.restore();MV.focus(320,180,'eye');
 MV.overlay(o=>{
  if(c.screen) MV.protect(o,260,140,120,80,{name:'screen-eye'});
  if(c.plate){o.fillStyle='#000';o.fillRect(260,140,120,80);}
  if(!c.hidden){o.fillStyle=c.transparent?'rgba(0,0,0,0)':c.faint?'#101010':'#e8d695';o.font='48px serif';o.textAlign='center';o.fillText('EYE',320,c.safe||c.plate?70:195);}
 });
 return c.warp?{remapped:true}:{};
}});
''')
        browser = pw.chromium.launch(args=['--allow-file-access-from-files'])
        page = browser.new_page(viewport={'width':960,'height':540})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto((project/'index.html').as_uri()+'?export=1&qa=1')
        page.wait_for_function('window.MV_READY === true')
        assert not errors, errors

        def probe(**case):
            page.evaluate('(c)=>{window.CASE=c;}', case)
            result = page.evaluate('MV_QA.probe(.6,[],{touch:true})')
            assert not result['err'], result['err']
            return result

        bad = probe()
        assert bad['subjects'][0]['overlap'] > .01
        assert bad['cover']['edges'] < 200, 'old detail-based check should miss this fixture'
        assert subjectqa.finding(bad['subjects'][0])['sev']=='warn'
        checks.append('dark subject detected without edge-density gate')
        assert subjectqa.finding(probe(faint=True)['subjects'][0])
        checks.append('low-contrast glyph bounds remain detectable')
        assert probe(safe=True)['subjects'][0]['overlap']==0
        assert probe(transparent=True)['subjects'][0]['overlap']==0
        assert probe(plate=True)['subjects'][0]['overlap']>.95
        checks.append('safe lyrics clear; dark background plate detected')
        assert not probe(unmarked=True)['subjects']
        assert probe(warp=True)['subjects'][0]['status']=='unverified'
        assert probe(offscreen=True)['subjects'][0]['status']=='unverified'
        checks.append('missing declarations and non-affine mapping never claim pass')
        shifted = probe(local=True)['subjects'][0]
        assert shifted['box'][0]>260 and shifted['box'][1]>140
        checks.append('local transform mapped into output coordinates')
        page.evaluate('MV.entries[0].insert={at:0,dur:.5,amt:1,x:320,y:180}')
        zoomed=probe()['subjects'][0]
        assert abs((zoomed['box'][2]-zoomed['box'][0])-240)<1
        screen=probe(screen=True)['subjects'][0]
        assert abs((screen['box'][2]-screen['box'][0])-120)<1
        checks.append('maximum camera insert mapped correctly')
        page.evaluate('delete MV.entries[0].insert; MV.entries.push({...MV.entries[0],i:1,from:.5,fadeIn:.5})')
        assert all(r['status']=='unverified' for r in probe()['subjects'])
        page.evaluate('MV.entries.pop()')
        checks.append('transition composite explicitly unverified')
        page.evaluate('window.CASE={invalid:true}')
        assert 'MV.protect' in page.evaluate('MV_QA.probe(.6,[],{})').get('err','')
        checks.append('invalid declarations surface as scene errors')

        # End-to-end Python grouping, screenshots, dynamic severity and exit status.
        info = page.evaluate('MV_EXPORT.info')
        for name,case in [('warning',{}),('strict',{'strict':True}),('safe',{'safe':True}),('warp',{'warp':True})]:
            page.evaluate('(c)=>window.CASE=c',case)
            code=qa.run(Page(page),info,SimpleNamespace(t0=None,t1=None),load_project(project),args.out/name)
            report=json.loads((args.out/name/'qa/qa.json').read_text())
            rows=[r for r in report['findings'] if r['kind']=='subject-overlap']
            assert bool(rows)==(name in ('warning','strict'))
            if rows:
                assert rows[0].get('crop') and rows[0]['frame_box']
                assert rows[0]['sev']==('error' if name=='strict' else 'warn')
            assert code==(1 if name=='strict' else 0), (name,report['findings'])
            if name=='warp':
                row=next(r for r in report['findings'] if r['kind']=='subject-unverified')
                assert row['crop'] and row['box'] is None  # full frame; do not suggest an accurate region
        checks.append('QA warning/error exits and annotated crops')

        if args.vitrail:
            vp=ROOT/'projects/pdoom-vitrail'
            page.goto((vp/'index.html').as_uri()+'?export=1&qa=1')
            page.wait_for_function('window.MV_READY === true')
            samples=[]
            for t in (14,18,21):
                fixed=page.evaluate('(t)=>MV_QA.probe(t,[],{touch:true})',t)
                assert fixed['subjects'] and all(not subjectqa.finding(s) for s in fixed['subjects']), (t,fixed['subjects'])
                samples.append(dict(t=t,subjects=fixed['subjects']))
            # Reintroduce the old centre-line placement in memory, not in project files.
            page.evaluate('''() => {window.savedLine=WD.line; WD.line=(g,f,o)=>savedLine(g,f,{...o,y:440});}''')
            old=page.evaluate('MV_QA.probe(18,[],{touch:true})')
            assert any(subjectqa.finding(s) for s in old['subjects'])
            (args.out/'maw-regression.png').write_bytes(Page(page).frame(18,1,('image/png',1),{}))
            page.evaluate('() => {WD.line=window.savedLine;}')
            (args.out/'maw-fixed.png').write_bytes(Page(page).frame(18,1,('image/png',1),{}))
            # Annotation must not change any normal export pixels.
            before=page.evaluate('MV_EXPORT.frame(18)')
            page.evaluate('() => {window.savedProtect=MV.protect;MV.protect=()=>{};}')
            assert before==page.evaluate('MV_EXPORT.frame(18)')
            page.evaluate('() => {MV.protect=window.savedProtect;}')
            (args.out/'maw-probes.json').write_text(json.dumps({'fixed':samples,'centreLine':old['subjects']},indent=2)+'\n')
            checks.append('real maw: centre-line regression detected, fixed 14/18/21 clear, annotations pixel-neutral')
            # Isolated output keeps the accepted film's existing QA and delivery reports intact.
            assert qa.run(Page(page),page.evaluate('MV_EXPORT.info'),SimpleNamespace(t0=12.975,t1=23.22),
                          load_project(vp),args.out/'maw')==0
            report=json.loads((args.out/'maw/qa/qa.json').read_text())
            assert not any(r['kind']=='subject-overlap' for r in report['findings']), report['findings']
            assert qa.run(Page(page),page.evaluate('MV_EXPORT.info'),SimpleNamespace(t0=None,t1=None),
                          load_project(vp),args.out/'full-film')==0
            report=json.loads((args.out/'full-film/qa/qa.json').read_text())
            assert not any(r['kind']=='subject-overlap' for r in report['findings']), report['findings']
            assert report['subjectProtection']['status']=='partial'
            checks.append('full-film QA preserved; unmarked shots and transition remain explicit')
        browser.close()
    (args.out/'result.json').write_text(json.dumps({'passed':True,'checks':checks},indent=2)+'\n')
    print(json.dumps({'passed':True,'checks':checks},indent=2))


if __name__=='__main__':
    main()
