#!/usr/bin/env python3
"""Optional: split the song into stems with Demucs -> PROJECT/stems/{drums,bass,other,vocals}.wav

  uv run --extra stems analysis/separate.py projects/my-song [--model htdemucs_ft]

Afterwards analyze_audio.py takes drum onsets from the drums stem (much cleaner kick / snare / hat) and
adds per-stem envelopes; align_lyrics.py transcribes the vocals stem (better word timings).
Needs the `stems` extra (demucs + torch, ~2 GB of downloads the first time).
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'tools'))
from mvproject import audio_path, load_project  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('--model', default='htdemucs', help='htdemucs (fast) or htdemucs_ft (better, 4x slower)')
a = ap.parse_args()

cfg = load_project(a.project)
src = audio_path(cfg)
out = cfg['_dir'] / 'stems'
with tempfile.TemporaryDirectory() as tmp:
    # decode with ffmpeg first, so the stems share the exact timeline of the other tools (mp3 encoder delay)
    wav = Path(tmp) / 'song.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-ar', '44100', '-ac', '2', str(wav)], check=True)
    print(f'demucs {a.model} on {src.name} … (first run downloads the model)')
    subprocess.run([sys.executable, '-m', 'demucs', '-n', a.model, '-o', tmp, str(wav)], check=True)
    found = list(Path(tmp).rglob('drums.wav'))
    if not found:
        raise SystemExit('demucs produced no stems')
    out.mkdir(exist_ok=True)
    for f in found[0].parent.glob('*.wav'):
        shutil.copy(f, out / f.name)
        print(' ', out / f.name)
print('done — re-run analyze_audio.py and align_lyrics.py to use the stems')
