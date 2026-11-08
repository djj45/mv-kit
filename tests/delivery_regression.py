"""Complete 120-shot delivery, cold/warm timings and interrupted packaging.

python tests/delivery_regression.py --out /tmp/mv-delivery-regression
No browser required. Measures per-process peak RSS, not aggregate machine memory.
"""
import argparse
import json
from pathlib import Path
import resource
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
import cachectl
import clipcache
import delivery
import handoff
import soundtrack
import verify_package
from mvproject import fingerprint, load_project


def fixture(project):
    cfg = dict(title='delivery-fixture',audio='tone.wav',soundtrack='soundtrack.json',
               width=96,height=54,fps=12,**{'from':10,'to':70})
    (project/'project.js').write_text('window.MV_PROJECT = '+json.dumps(cfg)+';')
    out = project/'out'
    out.mkdir()
    delivery.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=1',str(project/'tone.wav')])
    tracks = [dict(id='bgm',role='bgm',file='tone.wav',at=10,duration=60,loop=True,gainDb=-18)]
    tracks += [dict(id=f'cue{i}',role='voice' if i%2 else 'sfx',file='tone.wav',at=10+i*7,duration=1,gainDb=-12) for i in range(1,8)]
    (project/'soundtrack.json').write_text(json.dumps(dict(song=False,tracks=tracks,
        subtitles=[dict(start=11,end=13,text='Frame coverage fixture')])) )
    # Ten robust grayscale bars encode the absolute output frame number.
    frames = np.full((720,54,96), 72, dtype=np.uint8)
    for i in range(720):
        for bit in range(10):
            frames[i,18:36,8+bit*8:16+bit*8] = 220 if i & (1<<bit) else 30
    raw = out/'picture.mp4'
    subprocess.run(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','gray','-video_size','96x54',
                    '-framerate','12','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','12',
                    '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',str(raw)],
                    input=frames.tobytes(),check=True)
    cfg = load_project(project)
    info = dict(fps=12,width=96,height=54,sceneSrc={},audio='tone.wav',subtitles=[],
                shots=[dict(name=f'shot-{i}',scene='fixture',**{'from':10+i*.5,'to':10+(i+1)*.5}) for i in range(120)])
    mix = soundtrack.plan(cfg, info, 10, 70)
    film = out/'delivery-fixture.mp4'
    before = delivery.revision(cfg, info, film)
    soundtrack.mux(['-i',str(raw)], film, mix, out/'.audio-cache')
    delivery.write_receipt(film,cfg,dict(info,_soundtrack=mix),10,720,SimpleNamespace(noaudio=False),before,[])
    return film


def validate_package(path):
    manifest = json.loads((path/'manifest.json').read_text())
    rows = manifest['shots']
    assert len(rows) == 120 and manifest['frames'] == 720
    assert len(manifest['audio']['tracks']) == 8 and len(manifest['subtitles']) == 1
    for i,row in enumerate(rows):
        assert (row['startFrame'],row['endFrame']) == (i*6,(i+1)*6)
        assert (row['songFrom'],row['songTo']) == (10+i*.5,10+(i+1)*.5)
    for name, expected in manifest['files'].items():
        assert fingerprint(path/name) == expected, name
    listing = path/'verify-concat.txt'
    listing.write_text(''.join(f"file '{(path/row['file']).as_posix()}'\n" for row in rows))
    try:
        raw = delivery.run(['ffmpeg','-v','error','-xerror','-f','concat','-safe','0','-i',str(listing),
                            '-an','-pix_fmt','gray','-fps_mode','passthrough','-f','rawvideo','-']).stdout
    finally:
        listing.unlink()
    frames = np.frombuffer(raw,np.uint8).reshape(-1,54,96)
    assert len(frames) == 720
    decoded = [sum((1<<bit) for bit in range(10) if frame[24:30,10+bit*8:14+bit*8].mean()>128) for frame in frames]
    assert decoded == list(range(720)), 'dropped, duplicated, shifted or reordered frames'
    assert (path/'film.mp4').is_file() and (path/'subtitles.srt').is_file() and (path/'subtitles.vtt').is_file()
    report=verify_package.inspect(path)
    assert report['status']=='pass', report
    return manifest


def worker(args):
    project = args.project
    cfg = load_project(project)
    film = project/'out/delivery-fixture.mp4'
    record = json.loads(delivery.receipt_path(film).read_text())
    if args.worker.startswith('hd-'):
        film = project/'out/hd.mp4'
        record = json.loads((project/'out/hd-record.json').read_text())
    target = project/'out'/args.worker
    started = time.monotonic()
    result = {'stage':args.worker}
    if args.worker in ('legacy', 'hd-legacy'):
        target.mkdir()
        identity = clipcache.video_identity(film)
        rows = handoff.shot_ranges(record)
        for i,row in enumerate(rows):
            clipcache.export(film,row,record,identity,project/('out/.'+args.worker+'-cache'),target/f'{i:03}.mp4')
        result.update(clipSeconds=round(time.monotonic()-started,3),decodePasses=len(rows),sourceChecks=len(rows)*2)
    elif args.worker == 'hd-batch':
        target.mkdir()
        rows = handoff.shot_ranges(record)
        _, counts, work = clipcache.export_many(film,rows,record,project/'out/.hd-cache',target/'clips')
        result.update(clipSeconds=work['seconds'],clipWork=work,clipCache=counts)
    elif args.worker == 'interrupted':
        original = cachectl.record
        completed = 0
        def interrupt(cache,names,hit):
            nonlocal completed
            original(cache,names,hit)
            if Path(cache).name == '.clip-cache' and not hit:
                completed += 1
                if completed == 17:
                    raise KeyboardInterrupt('simulated cancellation after 17 completed clips')
        try:
            with patch.object(cachectl,'record',side_effect=interrupt):
                handoff.package(cfg,film,target)
        except KeyboardInterrupt:
            pass
        else:
            raise AssertionError('expected cancellation')
        assert completed == 17 and not target.exists()
        assert not list(target.parent.glob('.delivery-*'))
        cached = cachectl.manage(project/'out','clips')
        assert not cached['busy'] and cached['entries'] == 17
        result.update(completedClips=completed,partialPackagePublished=False)
    else:
        handoff.package(cfg,film,target)
        manifest = json.loads((target/'manifest.json').read_text())
        result.update(clipSeconds=manifest['clipWork']['seconds'],clipWork=manifest['clipWork'],clipCache=manifest['clipCache'])
    result['wallSeconds'] = round(time.monotonic()-started,3)
    scale = 1024*1024 if sys.platform == 'darwin' else 1024
    result['peakPythonMiB'] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/scale,2)
    result['largestChildPeakMiB'] = round(resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss/scale,2)
    args.result.write_text(json.dumps(result,indent=2)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path)
    parser.add_argument('--performance',action='store_true',help='also compare cold 720p delivery')
    parser.add_argument('--worker',choices=['legacy','cold','interrupted','resumed','warm','hd-legacy','hd-batch'])
    parser.add_argument('--project',type=Path)
    parser.add_argument('--result',type=Path)
    args = parser.parse_args()
    if args.worker:
        return worker(args)
    if args.out is None:
        parser.error('--out is required')
    args.out.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='mv-delivery-') as temp:
        project = Path(temp)
        fixture(project)
        results = []
        if args.performance:
            hd = project/'out/hd.mp4'
            delivery.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=1280x720:r=24:d=12',
                          '-c:v','libx264','-preset','fast','-crf','18',str(hd)])
            hd_record = dict(frames=288,fps=24,width=1280,height=720,filmSha256=fingerprint(hd)['sha256'],
                **{'from':0,'to':12},shots=[dict(name=f'shot-{i}',scene='hd',**{'from':i*.5,'to':(i+1)*.5}) for i in range(24)])
            (project/'out/hd-record.json').write_text(json.dumps(hd_record))
        stages = ['legacy','cold','interrupted','resumed','warm'] + (['hd-legacy','hd-batch'] if args.performance else [])
        for stage in stages:
            if stage == 'interrupted':
                # This is a disposable fixture cache, with its own process lease.
                assert cachectl.manage(project/'out','clips',prune=True,apply=True)['removedBytes'] > 0
            report = args.out/(stage+'.json')
            with (args.out/(stage+'.log')).open('w') as log:
                subprocess.run([sys.executable,__file__,'--worker',stage,'--project',str(project),
                                '--result',str(report)],stdout=log,stderr=subprocess.STDOUT,check=True,timeout=300)
            result = json.loads(report.read_text())
            if stage in ('cold','resumed','warm'):
                manifest = validate_package(project/'out'/stage)
                expected = {'cold':(0,120),'resumed':(17,103),'warm':(120,0)}[stage]
                assert (manifest['clipCache']['reused'],manifest['clipCache']['encoded']) == expected
                assert manifest['clipWork']['decodePasses'] == (stage != 'warm')
                result['decodedFrameIds'] = '0..719, exact, no gaps or duplicates'
                # Keep audit artifacts without retaining hundreds of MB of fixture stems.
                import shutil
                shutil.copy2(project/'out'/stage/'manifest.json',args.out/(stage+'-manifest.json'))
            results.append(result)
            print(json.dumps(result),flush=True)
        summary = dict(seconds=60,shots=120,frames=720,tracks=8,results=results,
                       clipSpeedup=round(results[0]['clipSeconds']/results[1]['clipSeconds'],2),
                       memoryNote='ru_maxrss: Python peak and largest child peak separately; not aggregate concurrent RSS')
        if args.performance:
            summary['hdClipSpeedup'] = round(results[-2]['clipSeconds']/results[-1]['clipSeconds'],2)
        (args.out/'result.json').write_text(json.dumps(summary,indent=2)+'\n')


if __name__ == '__main__':
    main()
