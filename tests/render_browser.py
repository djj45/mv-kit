"""Real 60-second / 120-shot / 8-track renderer, interruption and cache regression.

python tests/render_browser.py --out /tmp/render-browser
Small pixels keep CI cheap; timing, encoding, receipts and cache paths are production code.
"""
import argparse
import os
import json
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
import cachectl
import clipcache
import chunkcache
import delivery
import handoff
from mvproject import load_project, fingerprint, decode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='mv-long-') as temp:
        project = Path(temp)
        cfg = dict(title='long-fixture', audio='tone.wav', soundtrack='soundtrack.json',
                   width=96, height=54, fps=12, drawRate=12, **{'from': 0, 'to': 60},
                   data=[], kits=[], scenes=['motion'], post={'grain': 0, 'vignette': 0})
        (project/'project.js').write_text('window.MV_PROJECT = '+json.dumps(cfg)+';')
        (project/'index.html').write_text('<meta charset="utf-8"><canvas id="mv"></canvas><script src="project.js"></script>'
                                         f'<script src="{(ROOT/"engine/boot.js").as_uri()}"></script>')
        (project/'scenes').mkdir()
        (project/'scenes/motion.js').write_text('''MV.scene('motion', {render(g,f) {
          g.fillStyle='#253747'; g.fillRect(0,0,96,54);
          g.fillStyle='#ff9842'; g.fillRect((f.t*23)%80,10,16,34);
        }});''')
        (project/'timeline.js').write_text('''MV.timeline(() => Array.from({length:120},(_,i)=>({
            scene:'motion',name:'shot-'+i,from:i*.5,to:(i+1)*.5})));''')
        delivery.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                      'sine=frequency=440:sample_rate=48000:duration=1', str(project/'tone.wav')])
        tracks = [dict(id='bgm', role='bgm', file='tone.wav', at=0, duration=60, loop=True, gainDb=-18)]
        tracks += [dict(id=f'cue{i}', role='voice' if i%2 else 'sfx', file='tone.wav', at=i*7,
                        duration=1, gainDb=-12) for i in range(1,8)]
        sidecar = {'song': False, 'tracks': tracks,
                   'subtitles': [{'start': i, 'end': i+2, 'text': f'caption {i}'} for i in range(0,60,3)]}
        (project/'soundtrack.json').write_text(json.dumps(sidecar))
        out = project/'out'
        out.mkdir()
        film = out/'long-fixture.mp4'
        film.write_bytes(b'previous output must survive interruption')
        command = [sys.executable, str(ROOT/'tools/render.py'), str(project), '--workers', '1',
                   '--chunk', '2', '--preset', 'ultrafast']
        with (args.out/'interrupted.log').open('w') as log:
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic()+90
                while not list((out/'.chunks').glob('*.mp4')):
                    if process.poll() is not None or time.monotonic() > deadline:
                        raise AssertionError('no completed chunk before interruption; see interrupted.log')
                    time.sleep(.05)
                assert cachectl.manage(out, 'chunks', prune=True, apply=True)['busy']
                process.send_signal(signal.SIGTERM)
                assert process.wait(timeout=60) == 130
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
        assert film.read_bytes() == b'previous output must survive interruption'
        kept = {p.name: (fingerprint(p), p.stat().st_mtime_ns) for p in (out/'.chunks').glob('*.mp4')}
        assert kept
        with (args.out/'resumed.log').open('w') as log:
            subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=180)
        for name, stamp in kept.items():
            path = out/'.chunks'/name
            assert (fingerprint(path), path.stat().st_mtime_ns) == stamp
        # Repair only the two affected chunks: undetectable by size/mtime, and legacy metadata.
        paths = sorted((out/'.chunks').glob('*.mp4'))
        assert len(paths) == 30
        stamps = {p.name:(fingerprint(p),p.stat().st_mtime_ns) for p in paths}
        stat = paths[0].stat()
        with paths[0].open('r+b') as handle:
            handle.seek(64)
            byte = handle.read(1)
            handle.seek(64)
            handle.write(bytes([byte[0]^1]))
        os.utime(paths[0], ns=(stat.st_atime_ns,stat.st_mtime_ns))
        chunkcache.metadata_path(paths[1]).unlink()
        before_repair = cachectl.manage(out, 'chunks')
        with (args.out/'repaired.log').open('w') as log:
            subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=90)
        after_repair = cachectl.manage(out, 'chunks')
        assert after_repair['hits']-before_repair['hits'] == 28
        assert after_repair['misses']-before_repair['misses'] == 2
        for i,path in enumerate(paths):
            assert fingerprint(path) == stamps[path.name][0]
            if i >= 2:
                assert path.stat().st_mtime_ns == stamps[path.name][1]
            stamp = json.loads(chunkcache.metadata_path(path).read_text())
            assert chunkcache.reusable(path, stamp['specification'])
        cfg = load_project(project)
        receipt, status, message = delivery.provenance(film, cfg)
        assert status == 'pass', message
        assert receipt['frames'] == 720 and len(receipt['shots']) == 120
        rows = handoff.shot_ranges(receipt)
        assert len(rows) == 120 and sum(row['endFrame']-row['startFrame'] for row in rows) == 720
        assert all(row['startFrame'] == i*6 and row['endFrame'] == (i+1)*6 for i,row in enumerate(rows))
        metadata = json.loads(delivery.run(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(film)]).stdout)
        video = next(s for s in metadata['streams'] if s['codec_type']=='video')
        assert int(video['nb_read_frames']) == 720
        assert abs(len(decode(film, sr=8000))/8000-60) < .05
        picture = clipcache.video_identity(film)
        for i in (0, 60, 119):
            clipcache.export(film, rows[i], receipt, picture, out/'.clip-cache', out/f'clip{i}.mp4')
        chunk_stamps = {p.name: p.stat().st_mtime_ns for p in (out/'.chunks').glob('*.mp4')}
        audio_before = cachectl.manage(out, 'audio')
        tracks[3]['gainDb'] = -9
        (project/'soundtrack.json').write_text(json.dumps(sidecar))
        handoff.remix(cfg, film)
        assert clipcache.video_identity(film) == picture
        assert {p.name:p.stat().st_mtime_ns for p in (out/'.chunks').glob('*.mp4')} == chunk_stamps
        audio_after = cachectl.manage(out, 'audio')
        assert audio_after['hits']-audio_before['hits'] == 7
        assert audio_after['misses']-audio_before['misses'] == 2  # changed stem + mix
        receipt = json.loads(delivery.receipt_path(film).read_text())
        with patch.object(clipcache, 'encode', side_effect=AssertionError('unchanged picture re-encoded')):
            for i in (0,60,119):
                _, hit = clipcache.export(film, rows[i], receipt, picture, out/'.clip-cache', out/f'clip{i}.mp4')
                assert hit
        # Full cache-hit export and legacy --clean share the same lock and retain unknown files.
        marker = out/'.chunks'/'keep.txt'
        marker.write_text('unmanaged')
        before_clean = cachectl.manage(out, 'chunks')
        with (args.out/'cached-clean.log').open('w') as log:
            subprocess.run(command+['--clean'], stdout=log, stderr=subprocess.STDOUT, check=True, timeout=90)
        after_clean = cachectl.manage(out, 'chunks')
        assert after_clean['hits']-before_clean['hits'] == 30
        assert after_clean['misses'] == before_clean['misses']
        assert after_clean['entries'] == 0 and marker.read_text() == 'unmanaged'
        assert clipcache.video_identity(film) == picture
        summary = {'seconds':60, 'frames':720, 'shots':120, 'tracks':8, 'interruptedExit':130,
                   'fullHitChunksBeforeClean':30, 'resumedChunks':len(kept), 'audioRemix':{'hits':7,'rebuilt':2}, 'clipReuse':3, 'chunkRepair':{'reused':28,'rebuilt':2},
                   'cache':[cachectl.manage(out, kind) for kind in cachectl.KINDS]}
        (args.out/'result.json').write_text(json.dumps(summary, indent=2)+'\n')
        # Retain just the small final movie and receipt; large PCM caches stay temporary.
        import shutil
        shutil.copy2(film, args.out/film.name)
        shutil.copy2(delivery.receipt_path(film), args.out/delivery.receipt_path(film).name)
        print(json.dumps({k:v for k,v in summary.items() if k!='cache'}, indent=2))


if __name__ == '__main__':
    main()
