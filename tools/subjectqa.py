"""Planning and reporting for explicitly declared subject protection regions."""
import math


def sample_times(shots, words, fps, start, end):
    """Output-frame-aligned word starts, read/sync beats, insert and fade boundaries."""
    values = [w['start'] for w in words]
    for shot in shots:
        values.extend([shot['from'], shot['to']])
        if shot.get('fadeIn'):
            values.append(shot['from'] + shot['fadeIn'])
        insert = shot.get('insert')
        if insert:
            values.extend([insert['at'], insert['at'] + insert.get('dur', 1.1)])
        values.extend(r['at'] for r in shot.get('reads', []) if 'at' in r)
        values.extend(e['at'] for e in shot.get('sync', []) if 'at' in e)
    frames = set()
    for value in values:
        frame = math.ceil(value * fps - 1e-6)
        for offset in (-1, 0, 1):
            t = (frame + offset) / fps
            if start <= t < end:
                frames.add(t)
    return sorted(frames)


def finding(region):
    if region['status'] != 'measured':
        return {'kind': 'subject-unverified', 'sev': 'warn', 'box': None,
                'frame_box': None, 'value': None,
                'msg': f"subject {region['name']!r} not verified: {region['reason']}"}
    if region['overlap'] <= region['maxOverlap'] or region['coveredPixels'] < 2:
        return None
    return {'kind': 'subject-overlap', 'sev': region['severity'],
            'box': region['obstructionBox'], 'frame_box': region['box'], 'value': -region['overlap'],
            'msg': f"lyrics / screen overlay overlap {region['overlap']:.1%} of protected subject "
                   f"{region['name']!r} (limit {region['maxOverlap']:.1%}); move the text/plate or revise the composition"}


def coverage(results, shots, start, end, disabled=False):
    active = {s['i'] for s in shots if s['from'] < end and s['to'] > start}
    declared, measured, unknown = set(), 0, 0
    for r in results:
        for region in r.get('subjects', []):
            declared.add(region['entry'])
            measured += region['status'] == 'measured'
            unknown += region['status'] != 'measured'
    unmarked = sorted(active - declared)
    return {'status': 'disabled' if disabled else 'unverified' if not measured else 'partial' if unknown or unmarked else 'sampled',
            'measuredRegions': measured, 'unverifiedRegions': unknown,
            'declaredShots': sorted(declared & active), 'unmarkedShots': unmarked,
            'scope': 'declared visible regions at sampled times only; not whole-film semantic or human approval'}
