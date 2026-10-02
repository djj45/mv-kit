#!/usr/bin/env python3
"""Generate a project's illustrations and clips with the 即梦画布 CLI (dreamina-canvas), on the machine where it is
installed and logged in. Images come from projects/X/art/prompts.json, clips from projects/X/art/clips.json.

  uv run tools/dreamina.py projects/X doctor                    # CLI version, schema, live model lists → art/dreamina/
  uv run tools/dreamina.py projects/X video B1v,B3v,B4v         # free: upload first frames, save drafts, quote credits
  uv run tools/dreamina.py projects/X video B4v --ceiling 120   # pay at most 120 credits: run, wait, download
  uv run tools/dreamina.py projects/X image A2 --ceiling 10     # same for an illustration (refs → image-to-image)
  uv run tools/dreamina.py projects/X resume B4v                # a run whose local wait ran out: wait on it again
  uv run tools/dreamina.py projects/X status                    # every job: draft / running / done / file
  uv run tools/dreamina.py projects/X price B4v                 # free: what this clip would cost on every video model
                                                                #   and resolution (one scratch draft, re-edited and quoted)

Spending: without --ceiling nothing is billed (drafts and quotes are free). With --ceiling N each listed asset is
confirmed for at most N credits and run once; a finished asset is skipped unless --again (a new take on the same
draft). A run is identified by a submitId saved in art/dreamina.json before it starts, so a crash or a timeout is
resumed by that id and never billed twice.

Videos use the first_last_frame mode with the illustration as the first frame (and clip "last" as the last frame, if
given), so the clip starts exactly on the drawing; the ratio follows that frame. The illustration is the file the
still's frame pack was made from (frames/<from>.js "source": an alternate take like art/C11-2.jpg when that is the
one the film shows), not necessarily art/<from>.jpg. The scene code moves the camera, so
prompts ask for a fixed camera. Output: art/clips/<id>.mp4 (later takes <id>-2.mp4, …); images: art/<id>.jpg (-2, …).
Then pack: uv run tools/frames.py projects/X B4v projects/X/art/clips/B4v.mp4 --width 1920 --dur 1.8 --add

clips.json: {"model", "mode" (first_last_frame), "duration", "resolution"?, "style", "clips": [{"id", "from", "last"?,
"prompt", "style"? (replaces the shared style, e.g. for a close-up with no hoodie in it), "duration"?, "shots"?}]}. prompts.json may hold "canvas": {"model", "resolution"} for images; an asset's
"ratio" overrides the one derived from its "size". Every job is checked against the live `model list` before
anything is saved: the model, a mode that takes that many references, ratio (picked to fit the picture), resolution and
duration (doctor saves the list to art/dreamina/models-*.json).
State (canvas projectId, uploaded files, drafts, runs) is kept in art/dreamina.json; no tokens are stored.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import load_project  # noqa: E402

CLI = 'dreamina-canvas'
BAD = {'failed', 'canceled', 'cancelled', 'expired', 'running', 'empty', 'unknown', 'pending', 'queued'}

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('action', choices=['doctor', 'image', 'video', 'resume', 'status', 'price'])
ap.add_argument('ids', nargs='?', help='comma-separated asset / clip ids')
ap.add_argument('--ceiling', type=int, help='run, paying at most this many credits per asset (without it: draft + quote only)')
ap.add_argument('--again', action='store_true', help='another take of an asset that is already done')
ap.add_argument('--wait', default='15m', help='how long to wait for a run locally (default 15m; the server keeps going)')
ap.add_argument('--profile', help='dreamina-canvas --profile')
ap.add_argument('--model', help='image / video: use this model instead of the spec\'s (an A/B take)')
ap.add_argument('--resolution', help='image / video: use this resolution instead of the spec\'s')
a = ap.parse_args()

cfg = load_project(a.project)
proj = cfg['_dir']
art = proj / 'art'
STATE = art / 'dreamina.json'
state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
state.setdefault('uploads', {})
state.setdefault('jobs', {})


def save_state():
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


class CliError(Exception):
    pass


def cli(*args, ok=(0,)):
    """Run dreamina-canvas with JSON output; return (exit code, parsed stdout)."""
    if not shutil.which(CLI):
        raise SystemExit(f'{CLI} not found on PATH (install it, open a new terminal, then `{CLI} auth login`)')
    argv = [CLI, '--format', 'json', '--non-interactive'] + (['--profile', a.profile] if a.profile else []) + [str(x) for x in args]
    p = subprocess.run(argv, capture_output=True, text=True)
    try:
        out = json.loads(p.stdout) if p.stdout.strip() else {}
    except ValueError:
        out = {'raw': p.stdout.strip()}
    if p.returncode == 11:
        raise SystemExit(f'{CLI}: not logged in — run `{CLI} auth login` and try again')
    if p.returncode not in ok:
        err = out.get('error') if isinstance(out, dict) else None
        msg = f'{err.get("code")}: {err.get("message")} (requiredAction: {err.get("requiredAction")})' if isinstance(err, dict) else (p.stderr.strip() or p.stdout.strip())[:600]
        raise CliError(f'`{CLI} {" ".join(str(x) for x in args[:3])} …` exit {p.returncode}: {msg}')
    return p.returncode, out


def find(obj, key):
    """All values of `key` anywhere in a JSON tree (the CLI's response shapes vary by command and version)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                yield v
            yield from find(v, key)
    elif isinstance(obj, list):
        for v in obj:
            yield from find(v, key)


def first(obj, *keys):
    for k in keys:
        for v in find(obj, k):
            if v not in (None, ''):
                return v
    return None


def resources_of(obj):
    """Finished resource ids in a run / wait response."""
    seen, out = set(), []
    def walk(o):
        if isinstance(o, dict):
            rid = o.get('resourceId')
            if rid and rid not in seen and str(o.get('state', 'success')).lower() not in BAD:
                seen.add(rid); out.append(rid)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(obj)
    return out


# ---------------------------------------------------------------- canvas, uploads, models
def project_id():
    pid = state.get('projectId')
    if not pid:
        pid = state['projectId'] = str(uuid.uuid4())
        save_state()                          # persisted before the call: a retry reuses it
    _, out = cli('canvas', 'create', f'mv-kit · {cfg.get("title", proj.name)}', '--project-id', pid)
    got = first(out, 'projectId')
    if got and got != pid:
        raise SystemExit(f'canvas create answered projectId {got}, not {pid}: check `{CLI} canvas ls` before going on')
    return pid


def upload(pid, path):
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    if sha in state['uploads']:
        return state['uploads'][sha]
    rid = str(uuid.uuid5(uuid.NAMESPACE_URL, f'mv-kit:{pid}:{sha}'))   # same file, same id: a retry cannot upload twice
    cli('resource', 'upload', '--file', str(path.resolve()), '--name', path.stem, '--project-id', pid,
        '--resource-id', rid, '--import-kind', 'local_upload')
    state['uploads'][sha] = rid
    save_state()
    return rid


_models = {}
ratio_of = lambda r: (lambda a, b: float(a) / float(b))(*r.split(':'))


def fit(gen, aspect):
    """Check a job against the live `model list` and fill in what the model requires: the mode entry that takes this many
    references, the ratio (the allowed one nearest the picture's aspect, unless the spec names one), the resolution
    spelled the way the model spells it, a duration in range. Stops with the allowed values before anything is saved."""
    kind, where = gen['type'], 'art/clips.json' if gen['type'] == 'video' else 'art/prompts.json canvas'
    if kind not in _models:
        _models[kind] = cli('model', 'list', '--type', kind)[1]
    items = next((v for v in find(_models[kind], 'items') if isinstance(v, list)), [])
    m = next((x for x in items if gen['model'] in [x.get('model')] + list(x.get('aliases') or [])), None)
    if not m:
        raise SystemExit(f'{kind} model "{gen["model"]}" is not in `{CLI} model list --type {kind}`; available: '
                         f'{", ".join(str(x.get("model")) for x in items)} (set it in {where})')
    n, refs = len(gen['frames']), lambda md: md.get('references') or {}
    modes = [md for md in m.get('modes', []) if md.get('name') == gen['mode']]
    md = next((md for md in modes if refs(md).get('min', 0) <= n <= refs(md).get('max', 99)), None)
    if not md:
        have = ', '.join('%s (%s-%s refs)' % (x.get('name'), refs(x).get('min'), refs(x).get('max')) for x in m.get('modes', []))
        raise SystemExit(f'{m["model"]} has no "{gen["mode"]}" mode taking {n} reference(s); it has: {have}')
    fl, out = {f['flag']: f for f in md.get('flags', [])}, dict(gen, model=m['model'])
    r = fl.get('--ratio')
    if r and r.get('values'):
        if gen.get('ratio') and gen['ratio'] not in r['values']:
            raise SystemExit(f'ratio {gen["ratio"]} not allowed for {m["model"]} {gen["mode"]}: {"/".join(r["values"])}')
        out['ratio'] = gen.get('ratio') or min(r['values'], key=lambda v: abs(ratio_of(v) - aspect))
    elif not r:
        out.pop('ratio', None)
    res = fl.get('--resolution')
    if res and res.get('values'):
        want = str(gen.get('resolution') or '')
        hit = next((v for v in res['values'] if v.lower() == want.lower()), None)
        if not hit and (want or res.get('required')):
            raise SystemExit(f'resolution "{want}" not allowed for {m["model"]} {gen["mode"]}: {"/".join(res["values"])} (set it in {where})')
        if hit:
            out['resolution'] = hit
    d = fl.get('--duration')
    if d and gen.get('duration') is not None:      # clamp to what the model makes (some start at 5 s); we only use a few seconds
        dur = max(d.get('min', 0), min(d.get('max', 1e9), float(gen['duration'])))
        out['duration'] = int(dur) if dur == int(dur) else dur
    return out


# ---------------------------------------------------------------- what to generate
def the_picture(still):
    """The file the film actually shows for a still: the source its frame pack was made from (a project often keeps
    an alternate take, art/C11-2.jpg, packed under the name C11), else art/<still>.jpg."""
    pack = proj / 'frames' / f'{still}.js'
    if pack.exists():
        with pack.open(encoding='utf-8') as fh:
            head = fh.read(600)
        import re
        m = re.search(r'"source": "([^"]+)"', head)
        if m and (art / m.group(1)).exists():
            return art / m.group(1)
    return art / f'{still}.jpg'


def video_job(c, spec):
    first_frame = the_picture(c['from'])   # the clip must start on the picture the shot shows, not a take beside it
    if not first_frame.exists():
        raise SystemExit(f'{c["id"]}: needs art/{c["from"]}.jpg (the first frame)')
    frames = [first_frame] + ([the_picture(c['last'])] if c.get('last') else [])
    prompt = '。'.join(p.rstrip('。') for p in [c['prompt'], c.get('style', spec.get('style', ''))] if p) + '。'   # a clip's own "style" (e.g. a close-up) replaces the shared one
    gen = {'type': 'video', 'model': c.get('model', spec.get('model')), 'mode': c.get('mode', spec.get('mode', 'first_last_frame')),
           'duration': c.get('duration', spec.get('duration', 5)), 'resolution': c.get('resolution', spec.get('resolution')),
           'ratio': c.get('ratio', spec.get('ratio')), 'prompt': prompt, 'frames': [str(p.relative_to(proj)) for p in frames]}
    from PIL import Image
    w, h = Image.open(first_frame).size
    return gen, frames, art / 'clips', '.mp4', w / h


def image_job(x, spec):
    parts = []
    if x.get('char') and x.get('ref'):
        parts.append(spec.get('refNote', ''))
    parts.append(x['prompt'])
    if x.get('char'):
        parts.append(spec.get('character', ''))
    parts.append(spec.get('style', ''))
    prompt = ''.join(p if p.endswith(('。', '.', '！', '？')) else p + '。' for p in parts if p)
    refs = [art / f'{r}.jpg' for r in x.get('ref', [])]
    missing = [r for r in refs if not r.exists()]
    if missing:
        raise SystemExit(f'{x["id"]}: needs {missing[0].relative_to(proj)} first')
    canvas = spec.get('canvas', {})
    w, h = (int(v) for v in str(x.get('size', spec.get('size', '2560x1440'))).lower().split('x'))
    gen = {'type': 'image', 'model': x.get('canvasModel', canvas.get('model')), 'mode': 'i2i' if refs else 't2i',
           'ratio': x.get('ratio'), 'resolution': x.get('resolution', canvas.get('resolution', '2K')), 'prompt': prompt,
           'frames': [str(p.relative_to(proj)) for p in refs]}
    return gen, refs, art, '.jpg', w / h


def draft(pid, jid, gen, frames):
    """Save (or reuse) the draft node for this job's exact parameters. Free."""
    key = hashlib.sha256(json.dumps(gen, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]
    job = state['jobs'].get(jid, {})
    if job.get('nodeId') and job.get('spec') == key:
        return job
    args = ['node', 'create', gen['type'], '--project-id', pid, '--title', jid, '--prompt', gen['prompt'],
            '--mode', gen['mode'], '--model', gen['model']]
    args += (['--ratio', gen['ratio']] if gen.get('ratio') else []) + (['--resolution', gen['resolution']] if gen.get('resolution') else [])
    args += ['--duration', gen['duration']] if gen['type'] == 'video' else ['--count', 1]
    for f in frames:
        args += ['--ref', f'res:{upload(pid, f)}']
    _, out = cli(*args)
    node = first(out, 'nodeId')
    if not node:
        raise CliError(f'{jid}: no nodeId in the answer: {json.dumps(out, ensure_ascii=False)[:400]}')
    job = state['jobs'][jid] = {'nodeId': node, 'spec': key, 'runs': job.get('runs', [])}   # earlier takes stay listed
    save_state()
    return job


def quote(pid, job):
    _, out = cli('node', 'quote', '--node-id', job['nodeId'], '--project-id', pid)
    return first(out, 'totalMaxCredits', 'maxCredits'), first(out, 'confirmable')


def take_path(dest, jid, ext):
    dest.mkdir(parents=True, exist_ok=True)
    p, k = dest / f'{jid}{ext}', 2
    while p.exists():
        p, k = dest / f'{jid}-{k}{ext}', k + 1
    return p


def finish(pid, jid, run, out, dest, ext):
    """Download a finished run's first resource into the next take path."""
    rids = resources_of(out)
    if not rids:
        raise CliError(f'{jid}: the run finished without a resource: {json.dumps(out, ensure_ascii=False)[:400]}')
    with tempfile.TemporaryDirectory() as td:
        _, d = cli('resource', 'download', rids[0], '--project-id', pid, '--output', td)
        got = first(d, 'path', 'localPath', 'filePath')
        src = Path(got) if got else next(Path(td).iterdir())
        path = take_path(dest, jid, ext)
        if ext == '.jpg' and src.suffix.lower() not in ('.jpg', '.jpeg'):
            from PIL import Image
            Image.open(src).convert('RGB').save(path, 'JPEG', quality=95)
        else:
            shutil.move(str(src), path)
    run.update(status='done', file=str(path.relative_to(proj)), resourceId=rids[0])
    save_state()
    return path


def wait(pid, jid, run, dest, ext):
    code, out = cli('operation', 'wait', run['submitId'], '--project-id', pid, '--timeout', a.wait, '--interval', '5s', ok=(0, 20))
    if code == 20:
        run['status'] = 'running'; save_state()
        return f'{jid}: still running on the server — `uv run tools/dreamina.py {a.project} resume {jid}` later'
    if first(out, 'state') in ('failed', 'cancelled', 'expired') and not resources_of(out):
        run['status'] = 'failed'; save_state()
        return f'{jid}: FAILED on the server: {json.dumps(first(out, "error") or out, ensure_ascii=False)[:300]}'
    path = finish(pid, jid, run, out, dest, ext)
    return f'{jid}: {path.relative_to(proj)}'


# ---------------------------------------------------------------- actions
if a.action == 'doctor':
    d = art / 'dreamina'; d.mkdir(parents=True, exist_ok=True)
    for name, args in [('version', ['version']), ('schema', ['schema']), ('models-image', ['model', 'list', '--type', 'image']),
                       ('models-video', ['model', 'list', '--type', 'video']), ('account', ['auth', 'account'])]:
        try:
            code, out = cli(*args, ok=(0, 1, 2, 20, 21))
            (d / f'{name}.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'{name}: exit {code} → {(d / (name + ".json")).relative_to(proj)}')
        except (CliError, SystemExit) as e:
            print(f'{name}: {e}')
    sys.exit(0)

if a.action == 'status':
    for jid, job in state['jobs'].items():
        runs = job.get('runs', [])
        print(f'{jid:6} node {job.get("nodeId")}  ' + ('; '.join(f'{r["status"]} {r.get("file", "")} ({r.get("model", "?")} {r.get("resolution") or ""}, {r.get("credits")} cr)'.strip() for r in runs) or 'draft'))
    sys.exit(0)

if not a.ids:
    raise SystemExit('which ids? e.g. video B4v or image A2,A3')
ids = [s.strip() for s in a.ids.split(',') if s.strip()]
clips = json.loads((art / 'clips.json').read_text(encoding='utf-8')) if (art / 'clips.json').exists() else {'clips': []}
prompts = json.loads((art / 'prompts.json').read_text(encoding='utf-8')) if (art / 'prompts.json').exists() else {'assets': []}
cby = {c['id']: c for c in clips['clips']}
iby = {x['id']: x for x in prompts['assets']}
kind = a.action if a.action in ('image', 'video') else None


def job_for(jid):
    if (kind or ('video' if jid in cby else 'image')) == 'video':
        if jid not in cby:
            raise SystemExit(f'no clip "{jid}" in art/clips.json')
        return video_job(cby[jid], clips)
    if jid not in iby:
        raise SystemExit(f'no asset "{jid}" in art/prompts.json')
    return image_job(iby[jid], prompts)


pid = project_id()

if a.action == 'price':
    # One scratch draft node ("价目试算", never run) is re-edited to every model × resolution that can make this clip and
    # quoted each time. Drafts and quotes are free; the answers are kept in art/dreamina.json.
    jid = ids[0]
    gen, frames, dest, ext, aspect = job_for(jid)
    if gen['type'] != 'video':
        raise SystemExit('price is for clips (video)')
    items = next((v for v in find(cli('model', 'list', '--type', 'video')[1], 'items') if isinstance(v, list)), [])
    refs = [f'res:{upload(pid, f)}' for f in frames]
    prices, rows = state.setdefault('prices', {}), []
    for m in items:
        for md in m.get('modes', []):
            r = md.get('references') or {}
            if md.get('name') != gen['mode'] or not (r.get('min', 0) <= len(frames) <= r.get('max', 99)):
                continue
            fl = {f['flag']: f for f in md.get('flags', [])}
            d = fl.get('--duration', {})
            dur = max(d.get('min', 0), min(d.get('max', 1e9), float(gen['duration'])))
            dur = int(dur) if dur == int(dur) else dur
            for res in (fl.get('--resolution') or {}).get('values') or [None]:
                key = f'{m["model"]}|{res}|{dur}'
                if key not in prices:
                    g = fit(dict(gen, model=m['model'], resolution=res, duration=dur), aspect)
                    args = ['--project-id', pid, '--title', '价目试算（不运行）', '--prompt', g['prompt'], '--mode', g['mode'],
                            '--model', g['model'], '--duration', dur] + (['--ratio', g['ratio']] if g.get('ratio') else []) \
                        + (['--resolution', res] if res else []) + [x for ref in refs for x in ('--ref', ref)]
                    try:
                        if state.get('priceNode'):
                            cli('node', 'edit', 'video', '--node-id', state['priceNode'], *args)
                        else:
                            state['priceNode'] = first(cli('node', 'create', 'video', *args)[1], 'nodeId'); save_state()
                        prices[key] = quote(pid, {'nodeId': state['priceNode']})[0]
                    except (CliError, SystemExit) as e:
                        prices[key] = f'× {str(e)[:60]}'
                    save_state()
                rows.append((m['model'], res, dur, prices[key]))
            break
    num = lambda v: isinstance(v, (int, float))
    rows.sort(key=lambda x: (not num(x[3]), x[3] / x[2] if num(x[3]) else 0))
    print(f'{jid}: {gen["mode"]}, {len(frames)} frame(s); credits for one clip (drafts and quotes are free)')
    print(f'{"model":24} {"res":7} {"sec":>4} {"credits":>8} {"/s":>6}')
    for mdl, res, dur, cr in rows:
        print(f'{mdl:24} {str(res):7} {dur:>4} {cr if num(cr) else str(cr)[:40]:>8} {(f"{cr / dur:.0f}" if num(cr) else ""):>6}')
    print('pick one: set "model" / "resolution" in art/clips.json (or per clip), then `video IDS` to quote the real drafts')
    sys.exit(0)

fails = 0
for jid in ids:
    try:
        gen, frames, dest, ext, aspect = job_for(jid)
        if a.action == 'resume':
            job = state['jobs'].get(jid) or {}
            run = next((r for r in reversed(job.get('runs', [])) if r['status'] in ('submitted', 'running')), None)
            print(wait(pid, jid, run, dest, ext) if run else f'{jid}: nothing in flight')
            continue
        if a.model:
            gen['model'] = a.model
        if a.resolution:
            gen['resolution'] = a.resolution
        gen = fit(gen, aspect)
        job = draft(pid, jid, gen, frames)
        runs = job.setdefault('runs', [])
        live = next((r for r in runs if r['status'] in ('submitted', 'running')), None)
        if live:
            print(f'{jid}: a run is already in flight — `resume {jid}`'); continue
        if any(r['status'] == 'done' and r.get('spec') == job['spec'] for r in runs) and not a.again:
            print(f'{jid}: done ({", ".join(r["file"] for r in runs if r.get("file"))}); --again for another take'); continue
        credits, confirmable = quote(pid, job)
        if a.ceiling is None:
            print(f'{jid}: draft {job["nodeId"]} saved — this run costs up to {credits} credits'
                  f'{"" if confirmable in (None, True) else " (not confirmable now: see the quote)"}; run it with --ceiling {credits}')
            continue
        if credits is not None and float(credits) > a.ceiling:
            print(f'{jid}: costs up to {credits} credits, over --ceiling {a.ceiling}; not run'); continue
        run = {'submitId': str(uuid.uuid4()), 'status': 'submitted', 'spec': job['spec'], 'nodeId': job['nodeId'],
               'model': gen['model'], 'resolution': gen.get('resolution'), 'credits': credits, 'at': time.strftime('%Y-%m-%d %H:%M:%S')}
        runs.append(run); save_state()        # the submitId exists before the run: a retry resumes it, never re-bills
        _, conf = cli('node', 'confirm', '--node-id', job['nodeId'], '--project-id', pid, '--credit-ceiling', a.ceiling)
        token = first(conf, 'creditConfirmationToken')
        if not token:
            raise CliError(f'{jid}: confirm returned no token: {json.dumps(first(conf, "error") or conf, ensure_ascii=False)[:300]}')
        code, _ = cli('node', 'run', '--node-id', job['nodeId'], '--project-id', pid, '--credit-token', token,
                      '--submit-id', run['submitId'], ok=(0, 20))
        del token
        print(f'{jid}: running ({credits} credits)…', flush=True)
        print(wait(pid, jid, run, dest, ext), flush=True)
    except CliError as e:
        fails += 1
        print(f'{jid}: FAILED {e}', flush=True)
if fails:
    sys.exit(1)
