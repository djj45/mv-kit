"""Real file:// review interaction checks; requires local Playwright browser.

python tests/review_browser.py --out /tmp/review-browser [--page /path/to/review/index.html]
"""
import argparse
import json
from pathlib import Path
import runpy
import sys
import tempfile

from test_review import ROOT, fixture, review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--page', type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    with tempfile.TemporaryDirectory() as temp:
        cfg, film = fixture(Path(temp), ids=True)
        cfg['title'] = '</script><img src=x onerror=alert(1)>'
        page_path = review.build(cfg, film)
        previous = sys.argv
        try:
            sys.argv = ['render.py', str(cfg['_dir']), 'check']
            renderer = runpy.run_path(str(ROOT/'tools/render.py'), run_name='review_browser_renderer')
        finally:
            sys.argv = previous
        with sync_playwright() as pw:
            browser = renderer['launch'](pw)
            try:
                page = browser.new_page(viewport={'width': 1440, 'height': 1080})
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.goto(page_path.as_uri())
                page.wait_for_function('document.querySelector("video").readyState >= 2')
                assert page.locator('img').count() == 0
                assert page.locator('#title').inner_text() == cfg['title']
                page.locator('[data-cue="1"]').click()
                page.wait_for_function('Math.abs(document.querySelector("video").currentTime-.1)<.01')
                assert '字幕 <&>' in page.locator('#caption').inner_text()
                page.locator('#showCaptions').uncheck()
                assert not page.locator('#caption').is_visible()
                page.locator('#showCaptions').check()
                page.locator('[data-kind="caption-overlap"]').click()
                page.wait_for_function('Math.abs(document.querySelector("video").currentTime-.4)<.01')
                page.locator('#track').select_option('1')
                page.wait_for_function('document.querySelector("audio").readyState >= 2')
                page.locator('#play').click()
                page.wait_for_function('!document.querySelector("audio").paused && document.querySelector("video").currentTime > .55')
                state = page.evaluate('({v:video.currentTime,a:audio.currentTime,vm:video.muted,am:audio.muted})')
                assert abs(state['v']-state['a']) < .15, state
                assert state['vm'] and not state['am'], state
                page.locator('#play').click()
                page.wait_for_function('video.paused && audio.paused', timeout=1000)
                page.locator('#mute').check()
                assert page.locator('#solo').evaluate('(a)=>a.muted')
                page.locator('#mute').uncheck()
                page.locator('#shots button').nth(1).click()
                page.wait_for_function('Math.abs(audio.currentTime-1)<.01 && Math.abs(video.currentTime-1)<.01')
                page.locator('#next').click()
                page.wait_for_function('Math.abs(video.currentTime-(1+1/24))<.001')
                page.locator('#speed').select_option('1.5')
                page.wait_for_function('audio.playbackRate===1.5 && video.playbackRate===1.5')
                page.locator('#volume').evaluate('(e)=>{e.value="0.4";e.dispatchEvent(new Event("input",{bubbles:true}));}')
                page.wait_for_function('Math.abs(audio.volume-.4)<.01')
                page.locator('#seek').evaluate('(e)=>{e.value="0.3";e.dispatchEvent(new Event("input",{bubbles:true}));}')
                page.wait_for_function('Math.abs(video.currentTime-.3)<.01 && Math.abs(audio.currentTime-.3)<.01')
                page.locator('#track').select_option('mix')
                assert page.locator('#solo').evaluate('(a)=>a.paused && !a.getAttribute("src")')
                assert not page.locator('#video').evaluate('(v)=>v.muted')
                page.locator('#video').evaluate('(v)=>{v.muted=true;}')
                page.wait_for_function('document.querySelector("#mute").checked')
                page.locator('#mute').uncheck()
                page.locator('#overallStatus').select_option('pass')
                assert '逐镜复核' in page.locator('#reviewMessage').inner_text()
                page.locator('#reviewer').fill('Browser reviewer')
                page.locator('textarea[data-shot="0"]').fill('<img src=x onerror=alert(1)> literal note')
                page.locator('select[data-shot="0"]').select_option('pass')
                page.locator('select[data-shot="1"]').select_option('pass')
                page.locator('#overallStatus').select_option('pass')
                assert page.locator('#humanStatus').inner_text() == '人工通过'
                with page.expect_download() as download:
                    page.locator('#exportReview').click()
                notes_path=args.out/'human-review.json'
                download.value.save_as(notes_path)
                notes=json.loads(notes_path.read_text())
                assert notes['overall']['status']=='pass' and len(notes['shots'])==2
                assert notes['snapshot']['shots'][0]['id']=='review-shot-0'
                page.reload()
                page.wait_for_function('document.querySelector("#humanStatus").textContent === "人工通过"')
                assert page.locator('textarea[data-shot="0"]').input_value().startswith('<img')
                assert page.locator('img').count()==0
                page.locator('select[data-shot="0"]').select_option('changes')
                page.locator('textarea[data-shot="0"]').fill('Draft before import')
                assert page.locator('#humanStatus').inner_text()=='待复核'
                page.locator('#importReview').set_input_files(str(notes_path))
                page.wait_for_function('document.querySelector("#reviewMessage").textContent.includes("已导入")')
                assert page.locator('#humanStatus').inner_text()=='人工通过'
                stale=dict(notes,binding='old-version')
                page.locator('#importReview').set_input_files({'name':'stale.json','mimeType':'application/json','buffer':json.dumps(stale).encode()})
                page.wait_for_function('document.querySelector("#reviewMessage").textContent.includes("版本不符")')
                assert page.locator('#humanStatus').inner_text()=='人工通过'
                page.locator('#overallNote').fill('Edit after import')
                page.reload()
                page.wait_for_function('!document.querySelector("#undoReview").disabled')
                with page.expect_download() as download:
                    page.locator('#exportBackup').click()
                backup_path=args.out/'import-backup.json';download.value.save_as(backup_path)
                backup=json.loads(backup_path.read_text())
                assert backup['schema']=='mv-kit-review' and backup['shots'][0]['note']=='Draft before import'
                assert 'backup' not in backup and 'current' not in backup
                page.locator('#undoReview').click()
                assert page.locator('textarea[data-shot="0"]').input_value()=='Draft before import'
                assert page.locator('select[data-shot="0"]').input_value()=='changes'
                assert page.locator('#humanStatus').inner_text()=='待复核'
                page.locator('#undoReview').click()
                assert page.locator('#humanStatus').inner_text()=='人工通过'
                assert page.locator('#overallNote').input_value()=='Edit after import'
                # Compare a real subtitle-only revision, then migrate advisory notes.
                import handoff
                import verify_package
                sidecar=cfg['_dir']/'soundtrack.json'
                mix=json.loads(sidecar.read_text());mix['subtitles'][0]['text']='Revised subtitle'
                sidecar.write_text(json.dumps(mix))
                handoff.refresh_subtitles(cfg,film)
                revised=review.build(cfg,film)
                assert json.loads((revised.parent/'review.json').read_text())['pictureCache']['hit']
                page.goto(revised.as_uri())
                page.wait_for_function('document.querySelector("video").readyState >= 2')
                page.locator('textarea[data-shot="0"]').fill('Keep current note')
                page.locator('#reviewPanel summary').click()
                page.locator('#compareReview').set_input_files(str(notes_path))
                page.wait_for_function('document.querySelector("#versionDiff").textContent.includes("字幕 新增")')
                assert '整段画面未变化' in page.locator('#versionDiff').inner_text()
                assert '最终混音未变化' in page.locator('#versionDiff').inner_text()
                # Advisory history may retain older display names/scenes; stable IDs
                # still associate its notes with the correct current shot.
                renamed=json.loads(notes_path.read_text())
                renamed['snapshot']['shots'][0].update(name='Previous display name',scene='previous-scene')
                page.locator('#compareReview').set_input_files({'name':'renamed-history.json','mimeType':'application/json','buffer':json.dumps(renamed).encode()})
                page.wait_for_function('document.querySelector("#versionDiff").textContent.includes("名称、场景")')
                page.locator('#changedOnly').check()
                page.locator('[data-difference="cue:1"]').click()
                page.wait_for_function('Math.abs(video.currentTime-.1)<.01')
                assert page.locator('textarea[data-shot="0"]').count()==1
                page.locator('[data-difference="shot:0"]').click()
                page.wait_for_function('video.currentTime<.01')
                page.locator('#previousDifference').click()
                assert '变化 3/3' in page.locator('#differencePosition').inner_text()
                page.locator('#nextDifference').click()
                assert '变化 1/3' in page.locator('#differencePosition').inner_text()
                page.locator('#reviewPanel').screenshot(path=str(args.out/'differences.png'))
                page.locator('#compareReview').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{}'})
                page.wait_for_function('document.querySelector("#nextDifference").disabled')
                assert page.locator('#changedOnly').is_disabled() and not page.locator('#changedOnly').is_checked()
                page.locator('#compareReview').set_input_files({'name':'renamed-history.json','mimeType':'application/json','buffer':json.dumps(renamed).encode()})
                page.wait_for_function('document.querySelector("#versionDiff").textContent.includes("名称、场景")')
                page.locator('#migrateReview').click()
                assert page.locator('#humanStatus').inner_text()=='待复核'
                assert page.locator('textarea[data-shot="0"]').input_value()=='Keep current note'
                assert page.locator('#reviewer').input_value()==''
                assert page.locator('select[data-shot="0"]').input_value()=='pending'
                assert 'literal note' in page.locator('.history-note').first.inner_text()
                assert page.locator('img').count()==0
                with page.expect_download() as download:
                    page.locator('#exportReview').click()
                migrated_path=args.out/'migrated-review.json';download.value.save_as(migrated_path)
                migrated=json.loads(migrated_path.read_text())
                assert migrated['references'][0]['shots'][0]['currentIndex']==0
                attached=handoff.package(cfg,film,cfg['_dir']/'out/migrated-package',migrated_path)
                verification=verify_package.inspect(attached)
                assert verification['status']=='pass' and verification['humanReview']=='pending'
                (args.out/'migrated-package-verification.json').write_text(json.dumps(verification,indent=2))
                page.reload()
                page.wait_for_function('document.querySelector(".history-note") !== null')
                assert page.locator('textarea[data-shot="0"]').input_value()=='Keep current note'
                assert page.locator('#humanStatus').inner_text()=='待复核'
                page.locator('#undoReview').click()
                assert page.locator('.history-note').count()==0
                assert page.locator('textarea[data-shot="0"]').input_value()=='Keep current note'
                page.locator('#undoReview').click()
                assert page.locator('.history-note').count()>0
                # Storage denial retains in-memory undo and reports its lifetime.
                saved=page.evaluate('localStorage.getItem("mv-kit-review:"+JSON.parse(document.querySelector("#review-data").textContent).reviewBinding)')
                page.evaluate('() => {Storage.prototype.setItem=function(){throw new DOMException("quota","QuotaExceededError");};}')
                page.locator('textarea[data-shot="0"]').fill('Unsaved draft')
                page.locator('#importReview').set_input_files(str(migrated_path))
                page.wait_for_function('document.querySelector("#reviewMessage").textContent.includes("已导入")')
                assert '本地保存不可用' in page.locator('#reviewMessage').inner_text()
                page.locator('#undoReview').click()
                assert page.locator('textarea[data-shot="0"]').input_value()=='Unsaved draft'
                assert saved==page.evaluate('localStorage.getItem("mv-kit-review:"+JSON.parse(document.querySelector("#review-data").textContent).reviewBinding)')
                page.reload()
                page.wait_for_function('document.querySelector(".history-note") !== null')
                assert page.locator('textarea[data-shot="0"]').input_value()=='Keep current note'
                page.screenshot(path=str(args.out/'fixture.png'), full_page=True)
                # Timed issues use output frames even though this pilot starts at song second 1.
                page.locator('#video').evaluate('(v)=>{v.currentTime=1.25;}')
                page.wait_for_function('Math.abs(video.currentTime-1.25)<.001')
                page.locator('#issueNote').fill('Point landing needs adjustment')
                page.locator('#addPointIssue').click()
                assert page.locator('#timedIssues .timed-issue').count()==1
                point_id=page.locator('#timedIssues .timed-issue').first.get_attribute('data-issue')
                point_save=page.locator(f'[data-issue-save="{point_id}"]')
                point_status=page.locator(f'[data-issue-status="{point_id}"]')
                point_resolution=page.locator(f'[data-issue-resolution="{point_id}"]')
                point_status.select_option('fixed');point_save.click()
                assert '处理说明' in page.locator('#reviewMessage').inner_text()
                point_resolution.fill('Moved the landing by two frames')
                point_status.select_option('verified');point_save.click()
                assert '再人工复核' in page.locator('#reviewMessage').inner_text()
                point_status.select_option('fixed');point_save.click()
                assert '已修改 1' in page.locator('#issueProgress').inner_text()
                point_status.select_option('verified');point_save.click()
                assert '已复核 1' in page.locator('#issueProgress').inner_text()
                page.locator('#video').evaluate('(v)=>{v.currentTime=.75;}')
                page.wait_for_function('Math.abs(video.currentTime-.75)<.001')
                page.locator('#markIssueStart').click()
                page.locator('#video').evaluate('(v)=>{v.currentTime=1.25;}')
                page.wait_for_function('Math.abs(video.currentTime-1.25)<.001')
                page.locator('#markIssueEnd').click()
                page.locator('#issueNote').fill('<img src=x> Cross-cut audio issue')
                page.locator('#addRangeIssue').click()
                assert page.locator('#timedIssues .timed-issue').count()==2
                range_id=page.locator('#timedIssues .timed-issue').nth(1).get_attribute('data-issue')
                assert page.locator('img').count()==0
                page.locator(f'[data-issue-seek="{range_id}"]').click()
                page.wait_for_function('Math.abs(video.currentTime-.75)<.001')
                page.locator('select[data-shot="0"]').select_option('pass')
                assert page.locator('select[data-shot="0"]').input_value()=='changes'
                assert '未复核问题' in page.locator('#reviewMessage').inner_text()
                page.locator('#issueFilter').select_option('verified')
                assert page.locator('#timedIssues .timed-issue').count()==1
                page.locator('#issueFilter').select_option('all')
                page.locator(f'[data-issue-remove="{point_id}"]').click()
                assert page.locator('#timedIssues .timed-issue').count()==1
                page.locator('#undoReview').click()
                assert page.locator('#timedIssues .timed-issue').count()==2
                page.locator(f'[data-issue-note="{range_id}"]').fill('Unsaved issue edit')
                page.locator(f'[data-issue-status="{range_id}"]').select_option('verified')
                page.reload()
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===2')
                assert page.locator(f'[data-issue-note="{range_id}"]').input_value()=='Unsaved issue edit'
                assert page.locator(f'[data-issue-status="{range_id}"]').input_value()=='verified'
                assert '待处理 1' in page.locator('#issueProgress').inner_text()
                assert '已复核 1' in page.locator('#issueProgress').inner_text()
                assert '尚未提交 1' in page.locator('#issueDraftStatus').inner_text()
                page.locator('#exportReview').click()
                assert '尚未提交' in page.locator('#reviewMessage').inner_text()
                page.locator(f'[data-issue="{range_id}"]').get_by_role('button',name='放弃未提交编辑').click()
                page.reload()
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===2')
                assert page.locator(f'[data-issue-note="{range_id}"]').input_value()=='<img src=x> Cross-cut audio issue'
                assert page.locator(f'[data-issue-status="{range_id}"]').input_value()=='open'
                # Unsubmitted composer content and range marks persist separately.
                page.locator('#issueNote').fill('New issue draft')
                page.locator('#video').evaluate('(v)=>{v.currentTime=.3;}')
                page.locator('#markIssueStart').click()
                page.locator('#video').evaluate('(v)=>{v.currentTime=.5;}')
                page.locator('#markIssueEnd').click()
                page.reload()
                page.wait_for_function('document.querySelector("#issueNote").value==="New issue draft"')
                assert page.locator('#addRangeIssue').is_enabled()
                assert page.locator('#timedIssues .timed-issue').count()==2
                # A corrupt local clock cannot expand this page's real frame range.
                page.evaluate('''() => {const key='mv-kit-review:'+JSON.parse(document.querySelector('#review-data').textContent).reviewBinding;
                  const value=JSON.parse(localStorage.getItem(key));value.current.snapshot.frames=999;
                  value.editor.composer.startFrame=500;value.editor.composer.endFrame=510;localStorage.setItem(key,JSON.stringify(value));}''')
                page.reload()
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===2')
                assert page.locator('#addRangeIssue').is_disabled()
                assert '新问题草稿无效' in page.locator('#reviewMessage').inner_text()
                page.locator('#discardNewIssue').click()
                # A burst of input events is batched into one local write.
                page.evaluate('''() => {window.storageWrites=0;const original=Storage.prototype.setItem;
                  Storage.prototype.setItem=function(...args){window.storageWrites++;return original.apply(this,args);};
                  const e=document.querySelector('#issueNote');for(let n=1;n<=50;n++){e.value='burst '+n;e.dispatchEvent(new Event('input',{bubbles:true}));}}''')
                page.wait_for_function('window.storageWrites===1')
                assert page.evaluate('window.storageWrites')==1
                page.locator('#discardNewIssue').click()
                # Draft storage failure must not apply pending status or replace disk state.
                disk=page.evaluate('localStorage.getItem("mv-kit-review:"+JSON.parse(document.querySelector("#review-data").textContent).reviewBinding)')
                page.evaluate('() => {Storage.prototype.setItem=function(){throw new DOMException("quota","QuotaExceededError");};}')
                page.locator(f'[data-issue-note="{range_id}"]').fill('Memory only edit')
                page.wait_for_function('document.querySelector("#issueDraftStatus").textContent.includes("本地保存失败")')
                assert disk==page.evaluate('localStorage.getItem("mv-kit-review:"+JSON.parse(document.querySelector("#review-data").textContent).reviewBinding)')
                assert '待处理 1' in page.locator('#issueProgress').inner_text()
                page.reload()
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===2')
                assert page.locator(f'[data-issue-note="{range_id}"]').input_value()=='<img src=x> Cross-cut audio issue'
                # Current-shot filtering includes a range crossing the cut, without stealing edit focus.
                page.locator('#video').evaluate('(v)=>{v.currentTime=.8;}')
                page.wait_for_function('document.querySelector("#playingShot").textContent.includes("First")')
                page.locator('#currentShotIssues').check()
                assert page.locator('#timedIssues .timed-issue').count()==1
                page.locator(f'[data-issue-resolution="{range_id}"]').fill('Draft while seeking')
                page.locator('#video').evaluate('(v)=>{v.currentTime=1.25;}')
                page.wait_for_function('document.querySelector("#playingShot").textContent.includes("Second")')
                assert page.locator('#timedIssues .timed-issue').count()==1
                assert page.locator(f'[data-issue-resolution="{range_id}"]').evaluate('(e)=>e===document.activeElement')
                page.locator('#issuePanel h2').click()
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===2')
                page.locator(f'[data-issue="{range_id}"]').get_by_role('button',name='放弃未提交编辑').click()
                page.locator('#currentShotIssues').uncheck()
                page.locator('#issueSearch').fill('two frames')
                assert page.locator('#timedIssues .timed-issue').count()==1
                assert page.locator(f'[data-issue="{point_id}"]').count()==1
                page.locator('#nextOpenIssue').click()
                page.wait_for_function('Math.abs(video.currentTime-.75)<.001')
                assert page.locator('#issueSearch').input_value()==''
                assert page.locator(f'[data-issue-note="{range_id}"]').evaluate('(e)=>e===document.activeElement')
                assert page.locator('#nextFixedIssue').is_disabled()
                with page.expect_download() as download:
                    page.locator('#exportReview').click()
                issue_path=args.out/'timed-issues.json';download.value.save_as(issue_path)
                issues=json.loads(issue_path.read_text())
                assert issues['version']==2 and issues['snapshot']['origin']==1
                assert issues['issues'][0]['startFrame']==30 and issues['issues'][0]['status']=='verified'
                assert issues['issues'][0]['shotId']=='review-shot-1'
                assert issues['issues'][1]['startFrame']==18 and issues['issues'][1]['endFrame']==31
                issue_package=handoff.package(cfg,film,cfg['_dir']/'out/issue-package',issue_path)
                issue_check=verify_package.inspect(issue_package)
                assert issue_check['status']=='pass' and issue_check['humanReview']=='pending'
                (args.out/'timed-package-verification.json').write_text(json.dumps(issue_check,indent=2))
                page.locator('#issuePanel').screenshot(path=str(args.out/'timed-issues.png'))
                # An actual new subtitle revision retains old issues only as historical references.
                mix=json.loads(sidecar.read_text());mix['subtitles'][0]['text']='Third subtitle revision'
                sidecar.write_text(json.dumps(mix));handoff.refresh_subtitles(cfg,film)
                third=review.build(cfg,film);page.goto(third.as_uri())
                page.wait_for_function('document.querySelector("video").readyState>=2')
                page.locator('#reviewPanel summary').click()
                page.locator('#compareReview').set_input_files(str(issue_path))
                page.wait_for_function('!document.querySelector("#migrateReview").disabled')
                page.locator('#migrateReview').click()
                assert '历史问题（仅供参考）' in page.locator('#reviewReferences').inner_text()
                assert page.locator('#timedIssues .timed-issue').count()==0
                assert page.locator('#humanStatus').inner_text()=='待复核'
                with page.expect_download() as download:
                    page.locator('#exportReview').click()
                history_path=args.out/'historical-issues.json';download.value.save_as(history_path)
                history_package=handoff.package(cfg,film,cfg['_dir']/'out/issue-history-package',history_path)
                history_check=verify_package.inspect(history_package)
                assert history_check['status']=='pass' and history_check['humanReview']=='pending'
                (args.out/'historical-issues-verification.json').write_text(json.dumps(history_check,indent=2))
                # Real 120-shot project: bounded form count, filtering, progress and playback linkage.
                from delivery_regression import fixture as long_fixture
                from mvproject import load_project
                long_root=Path(temp)/'long-project';long_root.mkdir()
                long_film=long_fixture(long_root)
                long_page=review.build(load_project(long_root),long_film)
                page.goto(long_page.as_uri())
                page.wait_for_function('document.querySelector("video").readyState >= 2')
                assert page.locator('#shotReviews .shot-review').count()==20
                assert '0/120' in page.locator('#reviewProgress').inner_text()
                page.locator('#shotSearch').fill('shot-119')
                assert page.locator('#shotReviews .shot-review').count()==1
                assert page.locator('textarea[data-shot="119"]').count()==1
                page.locator('#shotFilter').select_option('pass')
                assert page.locator('#shotReviews .shot-review').count()==0
                page.locator('#shotFilter').select_option('all');page.locator('#shotSearch').fill('')
                page.locator('#nextReviewPage').click()
                page.locator('textarea[data-shot="25"]').fill('Navigation draft')
                page.locator('select[data-shot="25"]').select_option('pass')
                assert '1/120' in page.locator('#reviewProgress').inner_text()
                page.locator('#previousReviewPage').click();page.locator('#nextReviewPage').click()
                assert page.locator('textarea[data-shot="25"]').input_value()=='Navigation draft'
                page.locator('#shotFilter').select_option('pending')
                assert '119 个匹配镜头' in page.locator('#reviewPage').inner_text()
                page.locator('#shotFilter').select_option('all')
                page.locator('textarea[data-shot="0"]').fill('Do not steal focus')
                page.locator('#video').evaluate('(v)=>{v.currentTime=50.1;}')
                page.wait_for_function('document.querySelector("#playingShot").textContent.includes("shot-100")')
                assert page.locator('textarea[data-shot="0"]').evaluate('(e)=>e===document.activeElement')
                assert page.locator('#shotReviews .shot-review').count()==20
                page.locator('#locateReview').click()
                assert page.locator('textarea[data-shot="100"]').count()==1
                page.locator('#followReview').uncheck()
                page.locator('#video').evaluate('(v)=>{v.currentTime=1.1;}')
                page.wait_for_function('document.querySelector("#playingShot").textContent.includes("shot-2")')
                assert page.locator('textarea[data-shot="100"]').count()==1
                page.locator('#followReview').check()
                assert page.locator('textarea[data-shot="2"]').count()==1
                page.locator('#nextPending').click()
                page.wait_for_function('Math.abs(document.querySelector("video").currentTime-1.5)<.01')
                page.wait_for_function('document.querySelector("#shotReviews .is-playing")?.dataset.index==="3"')
                # Compare one changed shot at the end of the real long timeline.
                previous=json.loads((long_page.parent/'review.json').read_text())['comparison']
                previous['binding']='previous-long';previous['shots'][119]['picture']='previous-pixels'
                old=dict(schema='mv-kit-review',version=1,binding='previous-long',reviewer='',updatedAt='',snapshot=previous,
                         overall=dict(status='pending',note=''),shots=[dict(index=s['index'],status='pending',note='') for s in previous['shots']])
                page.locator('#reviewPanel summary').click()
                page.locator('#compareReview').set_input_files({'name':'previous-long.json','mimeType':'application/json','buffer':json.dumps(old).encode()})
                page.wait_for_function('!document.querySelector("#nextDifference").disabled')
                page.locator('#changedOnly').check()
                assert page.locator('#shotReviews .shot-review').count()==1
                assert page.locator('textarea[data-shot="119"]').count()==1
                page.locator('#shotSearch').fill('shot-0')
                assert page.locator('#shotReviews .shot-review').count()==0
                page.locator('#nextDifference').click()
                page.wait_for_function('Math.abs(video.currentTime-59.5)<.01')
                assert page.locator('textarea[data-shot="119"]').count()==1
                assert page.locator('#shotSearch').input_value()=='' and page.locator('#changedOnly').is_checked()
                page.locator('#previousDifference').click()
                assert '变化 1/1' in page.locator('#differencePosition').inner_text()
                # Global problem navigation crosses list pages on the actual 120-shot video.
                long_data=json.loads((long_page.parent/'review.json').read_text())
                snap=long_data['comparison'];problem_rows=[]
                for n in range(25):
                    shot=119 if n==24 else n
                    start=round((snap['shots'][shot]['start']-snap['origin'])*snap['fps'])
                    problem_rows.append(dict(id=f'long-issue-{n}',kind='point',startFrame=start,endFrame=start+1,
                        shotIndex=shot,shotId=snap['shots'][shot].get('id'),note=f'Problem {n}',resolution='Correction ready' if n==24 else '',status='fixed' if n==24 else 'open'))
                review_record=dict(schema='mv-kit-review',version=2,binding=long_data['reviewBinding'],reviewer='',updatedAt='',snapshot=snap,issues=problem_rows,
                    overall=dict(status='pending',note=''),shots=[dict(index=s['index'],status='pending',note='') for s in snap['shots']])
                page.locator('#importReview').set_input_files({'name':'long-problems.json','mimeType':'application/json','buffer':json.dumps(review_record).encode()})
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===20')
                page.locator('#issueSearch').fill('no match')
                page.locator('#nextFixedIssue').click()
                page.wait_for_function('Math.abs(video.currentTime-59.5)<.01')
                assert page.locator('#timedIssues .timed-issue').count()==5
                assert page.locator('[data-issue-note="long-issue-24"]').evaluate('(e)=>e===document.activeElement')
                assert page.locator('textarea[data-shot="119"]').count()==1
                page.locator('[data-issue-resolution="long-issue-24"]').fill('Unsubmitted correction')
                page.locator('#nextOpenIssue').click()
                page.wait_for_function('video.currentTime<.01')
                assert page.locator('[data-issue-note="long-issue-0"]').evaluate('(e)=>e===document.activeElement')
                page.reload()
                page.wait_for_function('document.querySelectorAll(".timed-issue").length===20')
                page.locator('#nextFixedIssue').click()
                page.wait_for_function('Math.abs(video.currentTime-59.5)<.01')
                assert page.locator('[data-issue-resolution="long-issue-24"]').input_value()=='Unsubmitted correction'
                assert '已修改 1' in page.locator('#issueProgress').inner_text()
                page.locator('#issuePanel').screenshot(path=str(args.out/'issue-navigation.png'))
                page.screenshot(path=str(args.out/'long-project.png'),full_page=True)
                if args.page:
                    page.goto(args.page.resolve().as_uri())
                    page.wait_for_function('video.readyState >= 2')
                    page.locator('[data-cue="1"]').click()
                    page.wait_for_function('!video.seeking && video.readyState>=3')
                    page.wait_for_timeout(350)
                    page.screenshot(path=str(args.out/'desktop.png'), full_page=True)
                    page.locator('#reviewPanel').screenshot(path=str(args.out/'review-panel.png'))
                page.set_viewport_size({'width':390,'height':844})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile horizontal overflow'
                page.screenshot(path=str(args.out/'mobile.png'), full_page=True)
                assert not errors, errors
                result = dict(passed=True, browser=browser.version, errors=errors,
                              checks=['file URL playback','literal text safety','caption toggle','QA seek uses output time',
                                      'solo playback/seek/pause/mute','final mix switch','frame step','mobile layout',
                                      'human review export/import','draft reload','stale review rejection','shot approval guard','literal note safety','120-shot navigation and progress',
                                      'playback follow without stealing editor focus','version difference comparison',
                                      'reference migration and independent package verification',
                                      'stable shot ID migration across display-name changes','subtitle review picture-cache reuse',
                                      'difference seek, wrap and changed-shot filtering','invalid comparison clears stale targets',
                                      'import backup export and undo after reload','migration undo and recovery',
                                      'storage failure preserves in-memory recovery and saved draft',
                                      'point and cross-cut range issue capture and seek','fixed versus verified approval guard',
                                      'issue filtering, removal recovery and unsaved edit protection',
                                      'timed issues export and independent verification','historical issues stay advisory after real revision',
                                      'unsubmitted row and composer recovery without formal state changes',
                                      'batched local writes and draft storage failure isolation',
                                      'current-shot cross-cut issue filter preserves editing focus',
                                      'global issue navigation clears filters and crosses pages'])
                (args.out/'result.json').write_text(json.dumps(result, indent=2)+'\n')
                print(json.dumps(result, indent=2))
            finally:
                browser.close()


if __name__ == '__main__':
    main()
