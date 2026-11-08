"""Measure declared musical events against encoded audio and decoded visual peaks.

No inferred beat grid, automatic retiming, or semantic claims about continuous motion.
An ambiguous match is unverified, never a pass.
"""
import math
import subprocess
from fractions import Fraction

import numpy as np
from scipy.signal import correlate

import delivery
from mvproject import decode

RATE = 8000


def audio_reference(receipt, event, decoded):
    """Resolve a declared source anchor, keeping the visual clock independent.

    Returns source samples, reference metadata and an unverified reason. Bad
    declarations raise ValueError; missing/inaudible evidence never passes.
    """
    def source(file):
        if file not in decoded:
            decoded[file] = decode(file, sr=RATE)
        return decoded[file]

    origin = receipt['from']
    ref = event.get('audio')
    if ref is None:
        if not receipt.get('audio'):
            return None, None, 'no unchanged song-clock reference; declare audio.track and audio.sourceAt'
        meta = dict(track='song', role='bgm', sourceAt=event['at'], cycle=0,
                    expectedSongSeconds=event['at'], expectedOutputSeconds=event['at']-origin)
        return source(receipt['audio']), meta, None
    tracks = receipt.get('soundMix', {}).get('tracks', [])
    track = next((t for t in tracks if t['id'] == ref['track']), None)
    if track is None:
        raise ValueError(f"audio track {ref['track']!r} is not present in this export")
    samples = source(track['file'])
    length = len(samples) / RATE
    at, cycle = ref['sourceAt'], ref.get('cycle', 0)
    if at >= length or (cycle and not track['loop']):
        raise ValueError('audio sourceAt is outside source duration, or cycle is set on a non-looping track')
    elapsed = at + cycle * length - track['trimStart']
    if not 0 <= elapsed < track['duration']:
        raise ValueError('audio reference is outside the trimmed track duration; check sourceAt/cycle')
    song_time = track['at'] + elapsed
    meta = dict(track=track['id'], role=track['role'], sourceAt=at, cycle=cycle,
                expectedSongSeconds=song_time, expectedOutputSeconds=song_time-origin)
    if not origin <= song_time < receipt['to']:
        return samples, meta, 'declared audio anchor is outside this export range'
    if elapsed < .04 or elapsed + .08 > track['duration'] or song_time-origin < .04 or receipt['to']-song_time < .08:
        return samples, meta, 'audio template is truncated by a cue or export boundary'
    gain = 10 ** (track['gainDb']/20)
    if track['fadeIn']:
        gain *= min(1, elapsed/track['fadeIn'])
    if track['fadeOut']:
        gain *= min(1, (track['duration']-elapsed)/track['fadeOut'])
    # Don't mistake another layer for a reference track attenuated to silence.
    first, last = round((at-.04)*RATE), round((at+.08)*RATE)
    if first < 0 or last > len(samples):
        return samples, meta, 'audio template crosses a source-file/loop boundary'
    if np.std(samples[first:last]) * gain < .0001:
        return samples, meta, 'referenced track is silent or too quiet at this anchor'
    # Identical content from overlapping tracks cannot prove which layer was heard.
    template = samples[first:last]
    for other in tracks:
        if other['id'] == track['id'] or not other['at'] <= song_time < other['at']+other['duration']:
            continue
        other_samples = source(other['file'])
        pos = other['trimStart'] + song_time-other['at']
        if other['loop']:
            pos %= len(other_samples)/RATE
        a, b = round((pos-.04)*RATE), round((pos+.08)*RATE)
        if a >= 0 and b <= len(other_samples) and b-a == len(template):
            rival = other_samples[a:b]
            if np.std(rival)*10**(other['gainDb']/20) >= .0001 and np.std(template) > 0:
                correlation = np.corrcoef(template, rival)[0, 1]
                if math.isfinite(correlation) and correlation > .98:
                    return samples, meta, f'identical audio in overlapping track {other["id"]!r}; attribution is ambiguous'
    return samples, meta, None


def match_audio(source, output, source_at, expected_at, rate=RATE, search=0.25):
    """Local normalized correlation; reject silence, edge truncation and competing peaks."""
    before, after = round(rate * 0.04), round(rate * 0.08)
    center = round(source_at * rate)
    if center < before or center + after > len(source):
        return None
    template = source[center - before:center + after].astype(float)
    template -= template.mean()
    energy = float(template @ template)
    if math.sqrt(energy / len(template)) < 0.0001:
        return None
    first = max(before, math.floor((expected_at - search) * rate))
    last = min(len(output) - after, math.ceil((expected_at + search) * rate))
    if first >= last:
        return None
    signal = output[first - before:last + after]
    n = len(template)
    sums = np.concatenate(([0.0], np.cumsum(signal)))
    squares = np.concatenate(([0.0], np.cumsum(signal * signal)))
    variance = np.maximum(0, squares[n:] - squares[:-n] - (sums[n:] - sums[:-n]) ** 2 / n)
    scores = correlate(signal, template, mode='valid', method='fft') / np.sqrt(np.maximum(variance * energy, 1e-24))
    peak = int(np.argmax(scores))
    # A best match at the search boundary could be a peak outside the window.
    if peak == 0 or peak == len(scores) - 1:
        return None
    rivals = scores[np.abs(np.arange(len(scores)) - peak) > round(0.015 * rate)]
    runner_up = float(np.max(rivals)) if len(rivals) else -1
    score = float(scores[peak])
    if score < 0.65 or score - runner_up < 0.04:
        return None
    return {'seconds': (first + peak) / rate, 'correlation': score, 'runnerUp': runner_up}


def visual_peak(frames, first_frame, visual):
    if len(frames) < 3:
        return None
    metric = visual.get('metric', 'change')
    values = frames.astype(float)
    scores = values[1:].mean(axis=(1, 2)) if metric == 'brightness' else np.abs(np.diff(values, axis=0)).mean(axis=(1, 2))
    best = int(np.argmax(scores))
    # Peaks at a window boundary or sustained plateaus are not reliable landing observations.
    if best in (0, len(scores) - 1) or scores[best] < visual.get('minSignal', 8):
        return None
    rivals = scores[np.abs(np.arange(len(scores)) - best) > 1]
    if len(rivals) and scores[best] <= float(np.max(rivals)) * 1.15:
        return None
    return {'frame': first_frame + best + 1, 'signal': float(scores[best]), 'metric': metric}


def read_visual(film, first, last, width, height, visual):
    x, y, w, h = visual.get('roi', [0, 0, 1, 1])
    # Crop in actual output pixels before downscaling so small subjects retain measurable signal.
    cx, cy = int(x * width), int(y * height)
    cw, ch = max(1, min(width - cx, round(w * width))), max(1, min(height - cy, round(h * height)))
    filt = (f'select=between(n\\,{first}\\,{last}),format=gray,crop={cw}:{ch}:{cx}:{cy}:exact=1,'
            'scale=96:54')
    result = delivery.run(['ffmpeg', '-v', 'error', '-xerror', '-nostdin', '-i', str(film), '-map', '0:v:0', '-an',
                           '-vf', filt, '-frames:v', str(last - first + 1), '-fps_mode', 'passthrough',
                           '-f', 'rawvideo', '-pix_fmt', 'gray', '-'])
    raw = np.frombuffer(result.stdout, dtype=np.uint8)
    if raw.size != (last - first + 1) * 96 * 54:
        return None
    return visual_peak(raw.reshape(-1, 54, 96), first, visual)


def inspect(cfg, film):
    receipt, trust, message = delivery.provenance(film, cfg)
    checks = [{'kind': 'provenance', 'status': trust, 'message': message}]
    skipped = []
    try:
        if trust == 'pass':
            policy = cfg.get('syncQa') or {}
            if not isinstance(policy, dict):
                raise ValueError('project.syncQa must be an object')
            tolerance = policy.get('toleranceFrames', 2)
            if isinstance(tolerance, bool) or not isinstance(tolerance, (int, float)) or not 0 <= tolerance <= 3:
                raise ValueError('syncQa.toleranceFrames must be between 0 and 3')
            fps, origin = receipt['fps'], receipt['from']
            meta = delivery.probe(film)
            video = next(s for s in meta['streams'] if s['codec_type'] == 'video')
            # The ordinal frame measurements below require the CFR stream produced by our renderer.
            if (abs(float(Fraction(video['avg_frame_rate'])) - fps) > 1e-6 or
                int(video.get('nb_frames', -1)) != receipt['frames']):
                raise ValueError('encoded frame rate/count differs from receipt; run filmcheck')
            events = delivery.events_of(receipt)
            active = []
            for event in events:
                if origin <= event['at'] < receipt['to']:
                    active.append(event)
                else:
                    skipped.append(event['id'])
            if not active:
                checks.append({'kind': 'events', 'status': 'unverified', 'message': 'no declared sync events inside this export'})
            elif not receipt.get('expectedAudio', bool(receipt.get('audio'))):
                checks.append({'kind': 'audio', 'status': 'unverified', 'message': 'silent export cannot verify audiovisual sync'})
            else:
                if not any(s['codec_type'] == 'audio' for s in meta['streams']):
                    raise ValueError('encoded film is missing its required audio track')
                if len(active) > 100:
                    raise ValueError('select at most 100 key events per export')
                decoded = {}
                output = decode(film, sr=RATE)
                for event in active:
                    planned_seconds = event['at'] - origin
                    planned = round(planned_seconds * fps)
                    try:
                        source, reference, reason = audio_reference(receipt, event, decoded)
                    except (ValueError, OSError) as exc:
                        checks.append(dict(id=event['id'], shot=event['shot'], status='fail', kind='audio-reference',
                                           songSeconds=event['at'], plannedFrame=planned, message=str(exc)))
                        continue
                    heard = match_audio(source, output, reference['sourceAt'], reference['expectedOutputSeconds']) if source is not None and not reason else None
                    visual_spec = event.get('visual') or ({'metric': 'change'} if event['type'] == 'cut' else None)
                    visual = None
                    if visual_spec:
                        visual = read_visual(film, max(0, planned - 7), min(receipt['frames'] - 1, planned + 7),
                                             video['width'], video['height'], visual_spec)
                    error = visual['frame'] - heard['seconds'] * fps if visual and heard else None
                    level = 'unverified' if error is None else ('fail' if abs(error) > tolerance else 'pass')
                    reasons = []
                    if not heard:
                        reasons.append(reason or 'source audio is silent, weak, ambiguous or outside the search window')
                    if not visual:
                        reasons.append('visual peak is missing, ambiguous or no action ROI/metric was declared')
                    checks.append({'id': event['id'], 'shot': event['shot'], 'type': event['type'], 'status': level,
                                   'songSeconds': event['at'], 'plannedFrame': planned,
                                   'quantizationFrames': planned - planned_seconds * fps,
                                   'audio': heard, 'audioReference': reference, 'visual': visual, 'errorFrames': error, 'toleranceFrames': tolerance,
                                   'audioPlacementOffsetFrames': (reference['expectedOutputSeconds']-planned_seconds)*fps if reference else None,
                                   'audioOffsetFrames': (heard['seconds'] - planned_seconds) * fps if heard else None,
                                   'visualOffsetFrames': visual['frame'] - planned if visual else None,
                                   'message': (f"track {reference['track']}: " if reference else '') + ('; '.join(reasons) if reasons else f'picture minus sound: {error:+.3f} frames (tolerance ±{tolerance:g})')})
    except (OSError, ValueError, KeyError, StopIteration, ZeroDivisionError, subprocess.SubprocessError) as exc:
        checks.append({'kind': 'measurement', 'status': 'fail', 'message': str(exc)})
    return delivery.save_report(cfg, film, 'sync', {'status': delivery.status(checks), 'checks': checks,
                                'skippedOutsideRange': skipped,
                                'scope': {'from': receipt['from'], 'to': receipt['to']} if receipt else None})
