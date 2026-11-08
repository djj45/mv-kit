"""Selection and delivery of a representative excerpt; rendering stays in render.py."""
import json
import math
from pathlib import Path


def select(cfg, info, start=None, end=None):
    """Use an explicit pair or project.pilot; never silently select the opening."""
    preset = cfg.get('pilot') or {}
    if not isinstance(preset, dict):
        raise ValueError('project.pilot must be an object with from, to and reason')
    explicit = start is not None or end is not None
    if explicit and (start is None or end is None):
        raise ValueError('pilot needs both --from and --to; partial overrides are ambiguous')
    if not explicit:
        start, end = preset.get('from'), preset.get('to')
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (start, end)):
        raise ValueError('choose a representative range: pilot --from … --to …, or project.pilot {from, to, reason}')
    if not info['from'] <= start < end <= info['to']:
        raise ValueError(f"pilot range must be inside {info['from']:g}–{info['to']:g} s, with from < to")
    fps = info['fps']
    frames = min(round((end - start) * fps), math.floor((info['to'] - start) * fps + 1e-7))
    if frames < 1:
        raise ValueError('pilot range contains no output frames')
    stop = start + frames / fps
    shots = [{k: s[k] for k in ('name', 'scene', 'from', 'to', 'fadeIn') if k in s}
             for s in info['shots'] if s['from'] < stop and s['to'] > start]
    if not shots:
        raise ValueError('pilot range does not contain any shots')
    return {'from': start, 'to': stop, 'requestedTo': end, 'fps': fps, 'frames': frames,
            'reason': preset.get('reason', '') if not explicit else '', 'shots': shots}


def output_path(out_dir, plan, requested, film_path, base_film_path=None):
    """Default excerpts live separately from the full film, including at other resolutions."""
    name = f"pilot-{plan['from']:09.3f}-{plan['to']:09.3f}.mp4"
    path = Path(requested) if requested else out_dir / 'pilots' / name
    if path.resolve() in {p.resolve() for p in (film_path, base_film_path) if p is not None}:
        raise ValueError('pilot --out must not overwrite the full-film output')
    if path.suffix.lower() != '.mp4':
        raise ValueError('pilot --out must end in .mp4')
    return path


def write_receipt(path, plan, info, args, audio):
    """Describe what was rendered, without claiming that visual QA or review passed."""
    report = dict(plan, kind='pilot', status='rendered', output=str(path.resolve()),
                  width=info['width'], height=info['height'], audio=str(audio) if audio else None,
                  samples=args.samples, shutter=args.shutter, crf=args.crf, preset=args.preset,
                  review='pending: play with sound; inspect motion, text, transition and pacing')
    receipt = path.with_suffix('.json')
    receipt.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'pilot: {path}\nrange: {plan["from"]:g}–{plan["to"]:g} s; {plan["frames"]} frames; review pending')
    print('watch with sound: movement → landing → hold; text legibility; both sides of the transition')
    return receipt
