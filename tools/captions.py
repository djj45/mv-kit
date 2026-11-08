"""Shared export timing/text rules and heuristic caption QA (not linguistic review)."""
import math
import unicodedata

import delivery

DEFAULTS = {'minDuration': 0.8, 'maxCps': 20, 'maxLineWidth': 42, 'maxLines': 2}


def cues(mix):
    result = []
    for sub in sorted(mix['subtitles'], key=lambda s: (s['start'], s['end'])):
        left, right = max(sub['start'], mix['from']), min(sub['end'], mix['to'])
        a, b = round((left-mix['from'])*1000), round((right-mix['from'])*1000)
        if b <= a:
            continue
        text = '\n'.join(line.strip() for line in sub['text'].splitlines() if line.strip())
        result.append(dict(start=a/1000, end=b/1000, text=text))
    return result


def visible_chars(text):
    return [c for c in text if not c.isspace() and not unicodedata.category(c).startswith(('M', 'C'))]


def line_width(text):
    return sum(2 if unicodedata.east_asian_width(c) in ('W', 'F') else 1
               for c in text if not unicodedata.category(c).startswith(('M', 'C')))


def evaluate(mix, fps, policy=None):
    checks = []
    settings = dict(DEFAULTS)
    try:
        if policy is not None and not isinstance(policy, dict):
            raise ValueError('project.subtitleQa must be an object')
        for key, value in (policy or {}).items():
            if key not in settings:
                raise ValueError(f'unknown subtitleQa setting: {key}')
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
                raise ValueError(f'subtitleQa.{key} must be a positive finite number')
            if key == 'maxLines' and int(value) != value:
                raise ValueError('subtitleQa.maxLines must be an integer')
            settings[key] = value
        for sub in mix['subtitles']:
            if not isinstance(sub, dict) or any(isinstance(sub.get(k), bool) or not isinstance(sub.get(k), (int, float))
                                               or not math.isfinite(sub[k]) for k in ('start', 'end')):
                raise ValueError('subtitle start/end must be finite seconds')
            if sub['start'] < 0 or sub['end'] <= sub['start'] or not isinstance(sub.get('text'), str) or not sub['text'].strip():
                raise ValueError('subtitle needs nonnegative start < end and nonempty text')
        exported = cues(mix)
        previous = None
        for i, cue in enumerate(exported, 1):
            def add(kind, message, **extra):
                checks.append(dict(kind=kind, status='warn', cue=i, message=message,
                                   outputSeconds=cue['start'], endOutputSeconds=cue['end'],
                                   songSeconds=mix['from']+cue['start'], frame=round(cue['start']*fps), **extra))
            duration = cue['end'] - cue['start']
            if duration + 1e-9 < settings['minDuration']:
                add('short-caption', f'字幕 {i} 停留 {duration:.3f}s，短于 {settings["minDuration"]:g}s', duration=duration)
            cps = len(visible_chars(cue['text'])) / duration
            if cps > settings['maxCps']:
                add('reading-speed', f'字幕 {i} 阅读速度 {cps:.1f} 字符/秒，高于 {settings["maxCps"]:g}', cps=cps)
            lines = cue['text'].splitlines()
            if len(lines) > settings['maxLines']:
                add('caption-lines', f'字幕 {i} 共 {len(lines)} 行，高于 {settings["maxLines"]:g} 行')
            width = max(map(line_width, lines), default=0)
            if width > settings['maxLineWidth']:
                add('caption-width', f'字幕 {i} 最长行 {width} 列，高于 {settings["maxLineWidth"]:g} 列（宽字符计 2 列）', width=width)
            if previous and cue['start'] < previous[1]['end'] - 1e-9:
                add('caption-overlap', f'字幕 {i} 与字幕 {previous[0]} 时间重叠', relatedCue=previous[0])
            if previous is None or cue['end'] > previous[1]['end']:
                previous = (i, cue)
        # Rounding can remove sub-millisecond cues that lie inside the export.
        for sub in mix['subtitles']:
            left, right = max(sub['start'], mix['from']), min(sub['end'], mix['to'])
            if left < right and round((right-mix['from'])*1000) <= round((left-mix['from'])*1000):
                checks.append(dict(kind='caption-rounded-away', status='warn', outputSeconds=left-mix['from'],
                                   songSeconds=left, message='字幕在毫秒取整后消失，需要延长停留'))
        checks.insert(0, dict(kind='captions', status='pass' if exported else 'info',
                             message=f'导出 {len(exported)} 条字幕' if exported else '当前范围无导出字幕；未评估字幕可读性'))
    except (ValueError, TypeError, KeyError) as exc:
        exported = []
        checks.append(dict(kind='subtitle-config', status='fail', message=str(exc)))
    return dict(status=delivery.status(checks), checks=checks, cues=exported, policy=settings,
                timeBasis='output seconds; songSeconds includes export origin',
                scope='Heuristic readability checks; no speech recognition or semantic validation')


def inspect(cfg, film):
    record, status, message = delivery.provenance(film, cfg)
    report = dict(status=status, checks=[dict(kind='provenance', status=status, message=message)])
    if status == 'pass':
        mix = record.get('soundMix') or {'from': record['from'], 'to': record['to'], 'subtitles': record.get('subtitles', [])}
        result = evaluate(mix, record['fps'], cfg.get('subtitleQa'))
        report.update(result, checks=report['checks'] + result['checks'])
    return delivery.save_report(cfg, film, 'subtitles', report)
