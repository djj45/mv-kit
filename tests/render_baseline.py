"""Render actual project shots, then revisit them in reverse to check deterministic output.

  python -B tests/render_baseline.py --out /path/to/baseline

Uses the renderer's browser selection (CHROME / MV_ANGLE), requires Playwright and a working browser.
Writes a JSON baseline and three representative PNGs per project. This is a rendering smoke test;
the full visual QA remains `tools/render.py projects/X qa`.
"""
import argparse
import hashlib
import json
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--projects', nargs='+', default=['kit-demo', 'field-demo', 'pdoom-sign'])
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright

    results = []
    with sync_playwright() as pw:
        for name in args.projects:
            project = ROOT / 'projects' / name
            saved_argv = sys.argv
            try:
                sys.argv = ['render.py', str(project), 'check']
                renderer = runpy.run_path(str(ROOT / 'tools/render.py'), run_name='baseline_renderer')
            finally:
                sys.argv = saved_argv
            errors, scene_errors = [], {}
            result = {'project': name, 'passed': False, 'frames': [], 'browser_errors': errors}
            results.append(result)
            pg = None
            try:
                pg = renderer['Page'](pw, errors)
                result['browser'] = pg.browser.version
                result['size'] = [pg.info['width'], pg.info['height']]
                result['fps'] = pg.info['fps']
                result['lint'] = pg.info.get('lint', [])
                shots = [s for s in pg.info['shots'] if s['to'] > pg.info['from'] and s['from'] < pg.info['to']]
                representatives = {0, len(shots) // 2, len(shots) - 1}
                for i, shot in enumerate(shots):
                    t = (max(shot['from'], pg.info['from']) + min(shot['to'], pg.info['to'])) / 2
                    png = pg.frame(t, 1, ('image/png', 1), scene_errors)
                    frame = {'scene': shot['name'], 't': t, 'sha256': hashlib.sha256(png).hexdigest()}
                    result['frames'].append(frame)
                    if i in representatives:
                        image_name = f'{name}-{i:03d}.png'
                        (args.out / image_name).write_bytes(png)
                        frame['image'] = image_name
                for frame in reversed(result['frames']):
                    png = pg.frame(frame['t'], 1, ('image/png', 1), scene_errors)
                    frame['repeat_matches'] = hashlib.sha256(png).hexdigest() == frame['sha256']
                result['scene_errors'] = scene_errors
                result['passed'] = bool(shots) and not errors and not scene_errors and all(f['repeat_matches'] for f in result['frames'])
                print(f"{name}: {'PASS' if result['passed'] else 'FAIL'}, {len(shots)} shots", flush=True)
            except Exception as exc:
                result['error'] = str(exc)
                print(f'{name}: FAILED: {exc}', flush=True)
            finally:
                if pg is not None:
                    pg.close()
                (args.out / 'baseline.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            # A browser startup failure prevents every remaining project from being checked.
            if pg is None:
                break
    return 0 if len(results) == len(args.projects) and all(r['passed'] for r in results) else 1


if __name__ == '__main__':
    sys.exit(main())
