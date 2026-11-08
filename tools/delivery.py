"""Shared provenance and reports for checks on encoded video, separate from browser QA."""
import hashlib
import json
import math
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlparse

from mvproject import KIT, fingerprint

SKIP = {'out', '.out', '.git', 'node_modules', '__pycache__', 'stems', 'dreamina'}
RESOURCE = {'.js', '.mjs', '.json', '.html', '.css', '.glsl', '.vert', '.frag', '.wasm',
            '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif', '.bin',
            '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.wav', '.m4a', '.flac', '.aac',
            '.ogg', '.mp4', '.mov', '.webm', '.mkv'}


def run(command):
    try:
        result = subprocess.run(command, capture_output=True, timeout=1800)
    except subprocess.TimeoutExpired as exc:
        raise ValueError('media inspection timed out after 30 minutes') from exc
    if result.returncode:
        raise ValueError(result.stderr.decode(errors='replace')[-3000:] or 'media command failed')
    return result


def revision(cfg, info, film, visual=False):
    """Hash resource bytes, including large media; ignore generated QA/output and prose.

    Explicit external resources loaded dynamically belong in project.verifyInputs.
    Unlike chunk invalidation this is a delivery receipt, so size/mtime is not enough.
    """
    import soundtrack
    paths, visited = set(), set()
    excluded = {film.resolve(), receipt_path(film).resolve(), film.with_suffix('.json').resolve()}
    if visual and soundtrack.sidecar(cfg):
        excluded.add(soundtrack.sidecar(cfg))

    def add(path):
        path = Path(path).resolve()
        if path.is_dir():
            if path in visited:
                return
            visited.add(path)
            for child in sorted(path.iterdir()):
                if not child.name.startswith('.') and child.name not in SKIP:
                    add(child)
        elif path not in excluded and path.suffix.lower() in (RESOURCE | soundtrack.AUDIO_EXT) and not (visual and path.suffix.lower() in soundtrack.AUDIO_EXT):
            paths.add(path)

    add(cfg['_dir'])
    add(KIT / 'engine')
    paths.add(KIT / 'tools' / 'render.py')
    for kit in cfg.get('kits', []):
        add(KIT / 'kits' / (kit + '.js'))
    for rel in [*(cfg.get('scripts') or []), *(cfg.get('data') or []), *(cfg.get('verifyInputs') or [])]:
        add(cfg['_dir'] / rel)
    for source in (info.get('sceneSrc') or {}).values():
        if source and urlparse(source).scheme == 'file':
            add(Path(unquote(urlparse(source).path)))
    if cfg.get('audio'):
        add(cfg['_dir'] / cfg['audio'])
    if info.get('audio'):
        add(cfg['_dir'] / info['audio'])
    if not visual:
        if soundtrack.sidecar(cfg):
            add(soundtrack.sidecar(cfg))
        for path in soundtrack.assets(cfg):
            paths.add(path)
        paths.add(KIT / 'tools' / 'soundtrack.py')
    else:
        # Explicit picture dependencies always win, even when an audio file or the
        # sound sidecar drives an animation. Such edits must invalidate remix.
        for rel in cfg.get('verifyInputs', []):
            paths.add((cfg['_dir'] / rel).resolve())
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(str(path).encode())
        digest.update((fingerprint(path)['sha256'] if path.is_file() else 'MISSING').encode())
    return digest.hexdigest()


def receipt_path(film):
    return Path(str(film) + '.render.json')


def events_of(info):
    events, ids = [], set()
    for shot in info['shots']:
        if not isinstance(shot.get('sync', []), list):
            raise ValueError('shot.sync must be an array of event objects')
        for event in shot.get('sync') or []:
            if not isinstance(event, dict):
                raise ValueError('sync events must be objects')
            row = dict(event, shot=shot['name'])
            if not isinstance(row.get('id'), str) or not row['id'] or row['id'] in ids:
                raise ValueError('sync event ids must be nonempty and unique')
            ids.add(row['id'])
            at = row.get('at')
            if isinstance(at, bool) or not isinstance(at, (int, float)) or not math.isfinite(at):
                raise ValueError(f"sync {row['id']}: at must be finite song seconds")
            if not shot['from'] <= at < shot['to']:
                raise ValueError(f"sync {row['id']}: event is outside its shot")
            if row.get('type') not in ('cut', 'action'):
                raise ValueError('sync event type must be cut or action')
            if row['type'] == 'cut' and (shot.get('fadeIn') or abs(at - shot['from']) > 1e-6):
                raise ValueError('cut events must mark a hard cut at the shot start; use action for transitions')
            if 'audio' in row:
                ref = row['audio']
                if not isinstance(ref, dict) or set(ref) - {'track', 'sourceAt', 'cycle'}:
                    raise ValueError('sync.audio must contain track, sourceAt and optional cycle')
                if not isinstance(ref.get('track'), str) or not ref['track'].strip():
                    raise ValueError('sync.audio.track must name a soundtrack track id')
                source_at = ref.get('sourceAt')
                if isinstance(source_at, bool) or not isinstance(source_at, (int, float)) or not math.isfinite(source_at) or source_at < 0:
                    raise ValueError('sync.audio.sourceAt must be nonnegative finite source-file seconds')
                cycle = ref.get('cycle', 0)
                if isinstance(cycle, bool) or not isinstance(cycle, int) or cycle < 0:
                    raise ValueError('sync.audio.cycle must be a nonnegative integer')
            visual = row.get('visual')
            if visual is not None:
                if not isinstance(visual, dict):
                    raise ValueError('visual must be an object')
                if row['type'] == 'action' and ('roi' not in visual or 'metric' not in visual):
                    raise ValueError('action observations need an explicit visual.roi and visual.metric')
                if visual.get('metric', 'change') not in ('change', 'brightness'):
                    raise ValueError('visual.metric must be change or brightness')
                roi = visual.get('roi', [0, 0, 1, 1])
                if (not isinstance(roi, list) or len(roi) != 4 or
                    any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in roi)):
                    raise ValueError('visual.roi must be [x,y,w,h], normalized to 0–1')
                x, y, w, h = roi
                if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > 1 or y + h > 1:
                    raise ValueError('visual.roi must fit within the frame')
                signal = visual.get('minSignal', 8)
                if isinstance(signal, bool) or not isinstance(signal, (int, float)) or not 0 < signal <= 255:
                    raise ValueError('visual.minSignal must be in (0,255]')
            events.append(row)
    return events


def build_receipt(film, cfg, info, start, frames, args, before, errors, media=None):
    import shotidentity
    shotidentity.validate(info['shots'])
    after = revision(cfg, info, film)
    visual = revision(cfg, info, film, visual=True)
    if info.get('_visualRevision', visual) != visual:
        errors = [*errors, 'picture inputs changed during rendering']
    record = {'version': 1, 'film': str(film.resolve()), 'filmSha256': fingerprint(media or film)['sha256'],
              'revision': before, 'complete': before == after and not errors,
              'errors': list(errors) + (['inputs changed during rendering'] if before != after else []),
              'from': start, 'to': start + frames / info['fps'], 'frames': frames,
              'fps': info['fps'], 'width': info['width'], 'height': info['height'],
              'audio': str((cfg['_dir'] / info['audio']).resolve()) if info.get('audio') and not args.noaudio else None,
              'settings': {k: getattr(args, k, None) for k in ('samples', 'shutter', 'crf', 'preset', 'scale', 'png', 'tune')},
              'shots': info['shots'], 'sceneSrc': info.get('sceneSrc', {}), 'events': events_of(info)}
    record.update(visualRevision=info.get('_visualRevision', visual), subtitles=info.get('subtitles', []))
    if '_soundtrack' in info:
        import soundtrack
        record.update(soundMix=info['_soundtrack'], audio=info['_soundtrack']['syncSource'],
                      expectedAudio=bool(info['_soundtrack']['tracks']),
                      audioRevision=info.get('_audioRevision', soundtrack.audio_revision(info['_soundtrack'])))
    return record


def write_receipt(film, cfg, info, start, frames, args, before, errors):
    """Legacy inspection/fixture helper; production exports use staged publication."""
    record = build_receipt(film, cfg, info, start, frames, args, before, errors)
    path = receipt_path(film)
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return record


def provenance(film, cfg):
    import publication
    publication.recover(film)
    path = receipt_path(film)
    if not path.exists():
        return None, 'unverified', 'no render receipt: inspectable, but range/version cannot be certified'
    try:
        record = json.loads(path.read_text(encoding='utf-8'))
        if record.get('version') != 1:
            return None, 'unverified', 'unsupported render receipt version'
        if fingerprint(film)['sha256'] != record['filmSha256']:
            return record, 'fail', 'film bytes differ from the render receipt; re-render before verification'
        if not record['complete']:
            return record, 'fail', 'render was incomplete or had errors: ' + '; '.join(record['errors'])
        if revision(cfg, record, film) != record['revision']:
            return record, 'fail', 'project inputs changed since rendering; do not verify the old film'
        return record, 'pass', 'film and current project inputs match the render receipt'
    except (OSError, ValueError, KeyError, TypeError) as exc:
        return None, 'unverified', f'unreadable render receipt: {exc}'


def probe(film):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(film)]).stdout)


def status(rows):
    return next((level for level in ('fail', 'unverified', 'warn') if any(r['status'] == level for r in rows)), 'pass')


def exit_code(report):
    return {'fail': 1, 'unverified': 2}.get(report['status'], 0)


def save_report(cfg, film, kind, report):
    key = hashlib.sha256(str(film.resolve()).encode()).hexdigest()[:8]
    folder = cfg['_dir'] / 'out' / 'qa' / 'encoded' / (film.stem + '-' + key)
    folder.mkdir(parents=True, exist_ok=True)
    report = dict(report, version=1, file=str(film.resolve()), kind=kind)
    path = folder / (kind + '.json')
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    lines = [f'# {kind}: {report["status"]}', '', f'File: {film}', '',
             '| Status | Check / event | Song seconds | Output frame | Shot | Detail |', '|---|---|---|---|---|---|']
    for row in report['checks']:
        detail = str(row.get('message', '')).replace('|', '\\|').replace('\n', ' ')
        shot = str(row.get('shot') or ', '.join(row.get('shots', []))).replace('|', '\\|')
        lines.append(f"| {row['status']} | {row.get('kind', row.get('id', ''))} | {row.get('songSeconds', '')} | "
                     f"{row.get('frame', row.get('plannedFrame', ''))} | {shot} | {detail} |")
    path.with_suffix('.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{kind}: {report["status"]} · {path}')
    for row in report['checks']:
        if row['status'] != 'pass':
            print(f"  {row['status']}: {row.get('kind', row.get('id'))}: {row.get('message', '')}")
    return report
