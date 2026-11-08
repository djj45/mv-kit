"""Inspect the actual MP4 after encoding; browser qa remains responsible for layout/lyrics."""
import math
import re
from fractions import Fraction

import delivery


def ranges(text, kind, duration):
    """FFmpeg silence/freeze records may end at EOF without an end marker."""
    result, opened = [], None
    for line in text.splitlines():
        start = re.search(rf'{kind}_start:\s*([\d.]+)', line)
        end = re.search(rf'{kind}_end:\s*([\d.]+)', line)
        if start:
            opened = float(start[1])
        if end and opened is not None:
            result.append((opened, float(end[1])))
            opened = None
    if opened is not None:
        result.append((opened, duration))
    return result


def scan(film):
    # Metadata keeps frame numbers and PTS; no raw video or screenshots accumulate on disk.
    result = delivery.run(['ffmpeg', '-hide_banner', '-xerror', '-nostdin', '-i', str(film), '-map', '0:v:0', '-an',
                          '-vf', 'scale=320:-2,signalstats,metadata=print:file=-,blackdetect=d=0.1:pix_th=0.1,freezedetect=n=-55dB:d=1.2',
                          '-f', 'null', '-'])
    frames, current = [], None
    for line in result.stdout.decode().splitlines():
        found = re.search(r'frame:(\d+).*pts_time:([\d.eE+-]+)', line)
        if found:
            current = {'frame': int(found[1]), 'at': float(found[2])}
        if line.startswith('lavfi.signalstats.YAVG=') and current is not None:
            current['brightness'] = float(line.split('=')[1])
            frames.append(current)
            current = None
    return frames, result.stderr.decode(errors='replace')


def inspect(cfg, film):
    receipt, trust, message = delivery.provenance(film, cfg)
    checks = [{'kind': 'provenance', 'status': trust, 'message': message}]
    policy = cfg.get('filmQa') or {}
    if not isinstance(policy, dict):
        checks.append({'kind': 'config', 'status': 'fail', 'message': 'project.filmQa must be an object'})
        return delivery.save_report(cfg, film, 'film', {'status': 'fail', 'checks': checks})
    allow = policy.get('allow') or []
    origin = receipt['from'] if receipt else 0
    shots = receipt['shots'] if receipt else []

    def add(kind, level, message, start=None, end=None, **extra):
        row = dict(kind=kind, status=level, message=message, **extra)
        if start is not None:
            row.update(outputSeconds=start, frame=round(start * fps))
            if receipt:
                row.update(songSeconds=origin + start, endSongSeconds=origin + (end if end is not None else start))
                row['shots'] = [s['name'] for s in shots if s['from'] <= row['endSongSeconds'] and s['to'] > row['songSeconds']]
            # Only creative findings may be acknowledged; structural/provenance failures cannot be waived.
            if receipt and kind in ('black', 'freeze', 'flash', 'silence'):
                for exception in allow:
                    if (exception.get('kind') == kind and str(exception.get('reason', '')).strip() and
                        exception.get('from', math.inf) <= row['songSeconds'] and
                        exception.get('to', -math.inf) >= row['endSongSeconds']):
                        row.update(status='info', originalStatus=level, reason=exception['reason'])
                        row['message'] += ' · declared: ' + exception['reason']
                        break
        checks.append(row)

    try:
        for exception in allow:
            if (not isinstance(exception, dict) or exception.get('kind') not in ('black', 'freeze', 'flash', 'silence') or
                not isinstance(exception.get('reason'), str) or not exception['reason'].strip() or
                any(isinstance(exception.get(k), bool) or not isinstance(exception.get(k), (int, float)) or
                    not math.isfinite(exception[k]) for k in ('from', 'to')) or exception['to'] < exception['from']):
                raise ValueError('filmQa.allow entries need kind, finite from/to song seconds and a reason')
        meta = delivery.probe(film)
        video = next((s for s in meta['streams'] if s['codec_type'] == 'video'), None)
        audio = next((s for s in meta['streams'] if s['codec_type'] == 'audio'), None)
        if not video:
            raise ValueError('file has no video stream')
        fps = float(Fraction(video['avg_frame_rate']))
        duration = float(video.get('duration') or meta['format']['duration'])
        expected_audio = receipt.get('expectedAudio', bool(receipt['audio'])) if receipt else bool(cfg.get('audio'))
        add('audio-track', 'fail' if expected_audio and not audio else 'pass',
            'required audio track is missing' if expected_audio and not audio else ('audio present' if audio else 'silent export'))
        if receipt:
            for name, got, wanted in [('width', video['width'], receipt['width']), ('height', video['height'], receipt['height'])]:
                add(name, 'pass' if got == wanted else 'fail', f'{got}; expected {wanted}')
            add('fps', 'pass' if abs(fps - receipt['fps']) < 1e-6 else 'fail', f'{fps:g}; expected {receipt["fps"]}')
            expected_duration = receipt['frames'] / receipt['fps']
            add('duration', 'pass' if abs(duration - expected_duration) <= 1 / receipt['fps'] else 'fail',
                f'{duration:.6f}s; expected {expected_duration:.6f}s')
        frames, log = scan(film)
        if not frames:
            raise ValueError('decoded no video frames')
        add('frames', 'pass' if not receipt or len(frames) == receipt['frames'] else 'fail',
            f'{len(frames)} decoded frames' + (f'; expected {receipt["frames"]}' if receipt else ' (no certified expected count)'))
        # Detect variable/gapped timestamps even when average FPS happens to match the requested FPS.
        gaps = [b['frame'] for a, b in zip(frames, frames[1:]) if abs(b['at'] - a['at'] - 1 / fps) > 0.002]
        add('frame-timestamps', 'fail' if gaps or abs(frames[0]['at']) > 0.002 else 'pass',
            f'nonuniform/nonzero-origin timestamps: {gaps[:8]}' if gaps or abs(frames[0]['at']) > 0.002 else 'uniform frame timestamps from zero')
        for match in re.finditer(r'black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)', log):
            start, end = float(match[1]), float(match[2])
            add('black', 'fail', f'black segment {start:.3f}–{end:.3f}s', start, end)
        for start, end in ranges(log, 'freeze', duration):
            add('freeze', 'warn', f'near-static at 320px scan width for {end - start:.3f}s', start, end)
        hard_cuts = [s['from'] - origin for s in shots if not s.get('fadeIn')]
        for before, current, after in zip(frames, frames[1:], frames[2:]):
            a, b, c = (x['brightness'] for x in (before, current, after))
            if abs(b - a) > 18 and abs(b - c) > 18 and abs(a - c) < 8:
                if not any(abs(current['at'] - t) <= 1 / fps for t in hard_cuts):
                    add('flash', 'warn', f'isolated brightness spike at frame {current["frame"]}', current['at'], frame=current['frame'])
        if audio:
            audio_duration = float(audio.get('duration') or meta['format']['duration'])
            add('audio-duration', 'pass' if abs(audio_duration - duration) <= max(0.1, 1 / fps) else 'fail',
                f'audio {audio_duration:.6f}s / video {duration:.6f}s')
            result = delivery.run(['ffmpeg', '-hide_banner', '-xerror', '-nostdin', '-i', str(film), '-map', '0:a:0', '-vn',
                                   '-af', 'ebur128=peak=true,silencedetect=noise=-60dB:d=1', '-f', 'null', '-'])
            text = result.stderr.decode(errors='replace')
            summary = text[text.rfind('Summary:'):]
            def number(pattern):
                found = re.search(pattern, summary)
                return float(found[1]) if found and math.isfinite(float(found[1])) else None
            lufs = number(r'I:\s*(-?[\d.]+)\s+LUFS')
            peak = number(r'Peak:\s*(-?[\d.]+)\s+dBFS')
            add('loudness', 'info', f'integrated {lufs} LUFS; true peak {peak} dBFS (measurement only)', lufs=lufs, truePeakDb=peak)
            if peak is not None and peak > -0.1:
                add('peak', 'warn', 'true peak is near or above full scale; inspect the mix', truePeakDb=peak)
            for start, end in ranges(text, 'silence', audio_duration):
                add('silence', 'fail' if expected_audio and end - start >= duration * 0.95 else 'warn',
                    f'silence {start:.3f}–{end:.3f}s', start, end)
    except (OSError, ValueError, KeyError, ZeroDivisionError, TimeoutError) as exc:
        add('decode', 'fail', str(exc))
    return delivery.save_report(cfg, film, 'film', {'status': delivery.status(checks), 'checks': checks,
                                'timeBasis': 'song seconds' if receipt else 'output seconds; song origin unknown'})
