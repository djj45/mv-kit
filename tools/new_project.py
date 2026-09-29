#!/usr/bin/env python3
"""Create a new project from template/.

  uv run tools/new_project.py my-song --audio ~/Music/song.mp3 [--lyrics lyrics.txt] [--title "My Song"]
                                     [--from 0 --to 30] [--fps 24] [--kits anime] [--link]

Copies the song into projects/my-song/audio/ (or, with --link, points at it with a relative path),
copies the lyrics if given, and writes project.js. Next: analysis (see README).
"""
import argparse
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import KIT, duration, load_project, save_project  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('name')
ap.add_argument('--audio', required=True)
ap.add_argument('--lyrics')
ap.add_argument('--title')
ap.add_argument('--from', dest='t0', type=float, default=0.0)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--fps', type=int, default=24)
ap.add_argument('--kits', default='', help='comma-separated style kits from kits/, e.g. anime')
ap.add_argument('--link', action='store_true', help='reference the audio file in place instead of copying it')
a = ap.parse_args()

dst = KIT / 'projects' / a.name
if dst.exists():
    raise SystemExit(f'{dst} already exists')
src_audio = Path(a.audio).expanduser().resolve()
if not src_audio.exists():
    raise SystemExit(f'audio not found: {src_audio}')
shutil.copytree(KIT / 'template', dst)
(dst / 'data').mkdir(exist_ok=True)
if a.link:
    audio_rel = os.path.relpath(src_audio, dst)
else:
    (dst / 'audio').mkdir()
    shutil.copy(src_audio, dst / 'audio' / src_audio.name)
    audio_rel = f'audio/{src_audio.name}'
if a.lyrics:
    shutil.copy(Path(a.lyrics).expanduser(), dst / 'lyrics.txt')
dur = duration(src_audio)
cfg = {'_dir': dst, 'title': a.title or a.name, 'audio': audio_rel, 'from': a.t0, 'to': round(a.t1 if a.t1 else dur, 3),
       'fps': a.fps, 'drawRate': 12 if a.fps <= 30 else 15, 'width': 1920, 'height': 1080,
       'kits': [k for k in a.kits.split(',') if k], 'scripts': [], 'scenes': ['title', 'lyrics'],
       'post': {'grain': 0.05, 'vignette': 0.25}}
save_project(cfg)
load_project(dst)  # sanity
print(f'created {dst}  ({dur:.1f} s of audio)')
print(f'''next:
  uv run analysis/analyze_audio.py projects/{a.name}
  {'(edit projects/' + a.name + '/lyrics.txt, then)' if not a.lyrics else ''}uv run --extra align analysis/align_lyrics.py projects/{a.name} --lang en
  open projects/{a.name}/index.html          # preview (press d for the debug overlay)
  uv run tools/render.py projects/{a.name} sheet''')
