#!/usr/bin/env python3
"""Generate a project's illustrations with Seedream (Volcano Engine Ark) from projects/X/art/prompts.json.

  export ARK_API_KEY=...                                   # or --key-file a file holding the key / your curl line
  uv run tools/seedream.py projects/X --list               # every asset, its size, references, shots, takes so far
  uv run tools/seedream.py projects/X --only K0 -n 3       # the character sheet, three takes
  uv run tools/seedream.py projects/X --only A2,B2,E1      # style frames (one more take each)
  uv run tools/seedream.py projects/X --act A              # every asset of act A that has no art/<ID>.jpg yet
  uv run tools/seedream.py projects/X --only A2 --dry      # print the full prompt, don't call the API

prompts.json: {"model", "size", "style", "character", "refNote", "assets": [{"id", "prompt", "size"?, "char"?,
"ref"?: ["K0"], "shots"?}]}. The prompt sent is: refNote (when the asset has "char" and references) + the asset
prompt + "character" (when "char") + "style". References are sent as images: art/<ref>.jpg, so generate the
character sheet first and keep the take you like as art/K0.jpg.

Takes: the first is saved as art/<ID>.jpg, later ones as art/<ID>-2.jpg, -3 … Keep the one you want as
art/<ID>.jpg, then pack it for the page: uv run tools/frames.py projects/X <ID> projects/X/art/<ID>.jpg
Every call is logged (prompt, size, references, file, usage) to art/log.jsonl. Only the standard library is
needed (Pillow, if present, turns PNG answers into JPEG and shrinks oversized references).
"""
import argparse
import base64
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import project_dir  # noqa: E402

ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
REF_MAX = 9 * 1024 * 1024

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('--only', help='comma-separated asset ids (always makes a new take)')
ap.add_argument('--act', help='comma-separated id prefixes, e.g. A or A,B (skips assets that already have an image)')
ap.add_argument('--again', action='store_true', help='with --act: also assets that already have an image')
ap.add_argument('-n', type=int, default=1, help='takes per asset (default 1)')
ap.add_argument('--size', help='override the size, e.g. 2K or 2560x1440')
ap.add_argument('--model', help='override the model in prompts.json')
ap.add_argument('--jobs', type=int, default=2, help='requests in flight (default 2)')
ap.add_argument('--key-file', help='file with the API key (a bare key, or a curl line with "Authorization: …")')
ap.add_argument('--list', action='store_true')
ap.add_argument('--dry', action='store_true', help="print what would be sent; don't call the API")
a = ap.parse_args()

proj = project_dir(a.project)
art = proj / 'art'
spec = json.loads((art / 'prompts.json').read_text(encoding='utf-8'))
assets = spec['assets']
by_id = {x['id']: x for x in assets}


def takes(aid):
    first = art / f'{aid}.jpg'
    more = sorted(art.glob(f'{aid}-*.jpg'), key=lambda p: int(re.sub(r'\D', '', p.stem.split('-')[-1]) or 0))
    return ([first] if first.exists() else []) + [p for p in more if re.fullmatch(rf'{re.escape(aid)}-\d+', p.stem)]


if a.list:
    print(f'{"id":5} {"size":10} {"ref":7} {"takes":5}  shots')
    for x in assets:
        n = len(takes(x['id']))
        mark = '✓' if (art / f'{x["id"]}.jpg').exists() else ' '
        print(f'{x["id"]:5} {x.get("size", spec.get("size", "2K")):10} {",".join(x.get("ref", [])):7} '
              f'{mark}{n:<4}  {" ".join(x.get("shots", []))}')
    sys.exit(0)

if a.only:
    want = [s.strip() for s in a.only.split(',') if s.strip()]
    bad = [s for s in want if s not in by_id]
    if bad:
        raise SystemExit(f'unknown asset id: {", ".join(bad)}')
    todo = [by_id[s] for s in want]
elif a.act:
    pre = tuple(s.strip() for s in a.act.split(',') if s.strip())
    todo = [x for x in assets if x['id'].startswith(pre) and (a.again or not (art / f'{x["id"]}.jpg').exists())]
else:
    raise SystemExit('say what to generate: --only IDS, --act A[,B] or --list')
if not todo:
    raise SystemExit('nothing to do (every asset already has an image; --again to redo)')


def compose(x):
    parts = []
    if x.get('char') and x.get('ref'):
        parts.append(spec.get('refNote', ''))
    parts.append(x['prompt'])
    if x.get('char'):
        parts.append(spec.get('character', ''))
    parts.append(spec.get('style', ''))
    return ''.join(p if p.endswith(('。', '.', '！', '？')) else p + '。' for p in parts if p)


def data_url(p):
    raw = p.read_bytes()
    mime = 'image/png' if raw[:8] == b'\x89PNG\r\n\x1a\n' else 'image/jpeg'
    if len(raw) > REF_MAX:
        try:
            from PIL import Image
            import io
            im = Image.open(p).convert('RGB')
            im.thumbnail((2560, 2560))
            b = io.BytesIO()
            im.save(b, 'JPEG', quality=90)
            raw, mime = b.getvalue(), 'image/jpeg'
        except ImportError:
            raise SystemExit(f'{p} is over 9 MB; shrink it (or install Pillow)')
    return f'data:{mime};base64,' + base64.b64encode(raw).decode()


def api_key():
    if a.key_file:
        txt = Path(a.key_file).expanduser().read_text(encoding='utf-8')
        m = re.search(r'Authorization:\s*(?:Bearer\s+)?([A-Za-z0-9._\-]+)', txt)
        key = m.group(1) if m else next((l.strip() for l in txt.splitlines() if l.strip()), '')
    else:
        key = os.environ.get('ARK_API_KEY', '').strip()
    if not key:
        raise SystemExit('no API key: export ARK_API_KEY=… or pass --key-file')
    return key


lock = threading.Lock()
reserved = set()


def next_path(aid):
    with lock:
        p = art / f'{aid}.jpg'
        k = 2
        while p.exists() or p in reserved:
            p = art / f'{aid}-{k}.jpg'
            k += 1
        reserved.add(p)
        return p


def save(raw, path):
    if raw[:8] == b'\x89PNG\r\n\x1a\n':
        try:
            from PIL import Image
            import io
            Image.open(io.BytesIO(raw)).convert('RGB').save(path, 'JPEG', quality=95)
            return path
        except ImportError:
            path = path.with_suffix('.png')
    path.write_bytes(raw)
    return path


def call(body, key):
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        txt = e.read().decode(errors='replace')
        try:
            err = json.loads(txt).get('error', {})
            txt = f'{err.get("code", "")}: {err.get("message", txt)}'
        except ValueError:
            pass
        raise RuntimeError(f'HTTP {e.code} {txt}')


def run(x, take, key):
    aid = x['id']
    refs = x.get('ref', [])
    missing = [r for r in refs if not (art / f'{r}.jpg').exists()]
    if missing:
        return f'{aid}: skipped, needs art/{missing[0]}.jpg first (generate it and keep the take you like)'
    body = {'model': a.model or spec.get('model'), 'prompt': compose(x),
            'size': a.size or x.get('size') or spec.get('size', '2K'),
            'response_format': 'b64_json', 'watermark': False, 'stream': False}
    if refs:
        urls = [data_url(art / f'{r}.jpg') for r in refs]
        body['image'] = urls[0] if len(urls) == 1 else urls
    if a.dry:
        show = {k: v for k, v in body.items() if k != 'image'}
        if refs:
            show['image'] = [f'art/{r}.jpg' for r in refs]
        return f'--- {aid}\n' + json.dumps(show, ensure_ascii=False, indent=2)
    t0 = time.time()
    res = call(body, key)
    d = (res.get('data') or [{}])[0]
    if d.get('b64_json'):
        raw = base64.b64decode(d['b64_json'])
    elif d.get('url'):
        with urllib.request.urlopen(d['url'], timeout=300) as r:
            raw = r.read()
    else:
        raise RuntimeError(f'no image in the answer: {json.dumps(res, ensure_ascii=False)[:400]}')
    path = save(raw, next_path(aid))
    with lock, open(art / 'log.jsonl', 'a', encoding='utf-8') as f:
        f.write(json.dumps({'time': time.strftime('%Y-%m-%d %H:%M:%S'), 'id': aid, 'file': path.name,
                            'model': body['model'], 'size': body['size'], 'ref': refs, 'prompt': body['prompt'],
                            'usage': res.get('usage')}, ensure_ascii=False) + '\n')
    return f'{aid}: {path.relative_to(proj)}  ({d.get("size", body["size"])}, {time.time() - t0:.0f} s)'


key = None if a.dry else api_key()
jobs = [(x, k) for x in todo for k in range(max(1, a.n))]
fails = 0
with ThreadPoolExecutor(max_workers=1 if a.dry else max(1, a.jobs)) as ex:
    futs = [ex.submit(run, x, k, key) for x, k in jobs]
    for (x, k), fu in zip(jobs, futs):
        try:
            print(fu.result(), flush=True)
        except Exception as e:  # noqa: BLE001 — report and keep going with the other assets
            fails += 1
            print(f'{x["id"]}: FAILED {e}', flush=True)
if fails:
    sys.exit(1)
