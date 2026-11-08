"""Portable human review records bound to the rendered picture, sound and captions."""
import json
import math
from pathlib import Path

from soundtrack import digest
import shotidentity

STATUSES = {'pending', 'pass', 'changes'}


def binding(record, files):
    media = {name: value for name, value in files.items()
             if name in ('film.mp4', 'subtitles.srt', 'subtitles.vtt') or name.startswith('audio/')}
    return digest({'version': 1, 'render': record, 'media': media})


def shot_ids(record):
    return [i for i, shot in enumerate(record['shots'])
            if shot['from'] < record['to'] and shot['to'] > record['from']]


def validate(value, expected, ids, record=None):
    try:
        if value['schema'] != 'mv-kit-review' or value['version'] not in (1, 2):
            raise ValueError('unsupported human review record')
        if value['binding'] != expected:
            raise ValueError('review version differs; picture, sound or subtitles need a new review')
        if not isinstance(value['reviewer'], str) or len(value['reviewer']) > 200:
            raise ValueError('invalid reviewer')
        if not isinstance(value['updatedAt'], str) or len(value['updatedAt']) > 100:
            raise ValueError('invalid review timestamp')
        rows = value['shots']
        if not isinstance(rows, list) or len(rows) != len(ids):
            raise ValueError('review shot coverage differs')
        found = []
        for row in [value['overall'], *rows]:
            if row['status'] not in STATUSES or not isinstance(row['note'], str) or len(row['note']) > 2000:
                raise ValueError('invalid review status or note')
        for row in rows:
            if type(row['index']) is not int:
                raise ValueError('invalid shot index')
            found.append(row['index'])
        if sorted(found) != sorted(ids):
            raise ValueError('review shot coverage differs')
        validate_context(value)
        validate_issues(value, record)
        if value['overall']['status'] == 'pass' and any(row['status'] != 'pass' for row in rows):
            raise ValueError('all shots must be reviewed before overall approval')
    except (KeyError, TypeError) as exc:
        raise ValueError('malformed human review record') from exc
    return {key: value[key] for key in ('schema','version','binding','reviewer','updatedAt','overall','shots','snapshot','references','issues') if key in value}


def read(path, expected, ids, record=None):
    path = Path(path)
    if path.stat().st_size > 10_000_000:
        raise ValueError('review record is too large')
    return validate(json.loads(path.read_text(encoding='utf-8')), expected, ids, record)


def snapshot(record, files, film, cues, title='', cache=None, cache_info=None):
    """Compact comparison evidence; decode once, retain hashes rather than frames.

    A shot covers the final composited pixels in its active interval. Overlapping
    shots can therefore both change. These descriptors never authorize approval.
    """
    import reviewcache
    shotidentity.validate(record['shots'])
    spec, hashes, cache_status = reviewcache.picture(film, record, cache)
    if cache_info is not None:
        cache_info.update(cache_status)
    fps, origin = record['fps'], record['from']
    shots=[]
    for index in shot_ids(record):
        shot=record['shots'][index]
        first=max(0,min(len(hashes),math.ceil((shot['from']-origin)*fps-.5)))
        last=max(first,min(len(hashes),math.ceil((shot['to']-origin)*fps-.5)))
        shots.append(dict(index=index,name=shot.get('name',''),scene=shot.get('scene',''),
                          start=shot['from'],end=shot['to'],
                          picture=digest({'spec':spec,'frames':hashes[first:last]})))
        if 'id' in shot:
            shots[-1]['id'] = shot['id']
    tracks=[]
    for track in (record.get('soundMix') or {}).get('tracks',[]):
        settings={k:v for k,v in track.items() if k!='file'}
        tracks.append(dict(id=track['id'],role=track['role'],
                           content=digest({'media':files.get('audio/'+track['id']+'.wav'),'settings':settings})))
    return dict(version=1,binding=binding(record,files),title=title,shots=shots,tracks=tracks,cues=cues,
                picture=digest({'spec':spec,'frames':hashes}),mix=digest(files.get('audio/mix.wav')),
                origin=origin,duration=record['to']-origin,fps=fps,frames=record['frames'])


def validate_issues(value, record=None):
    """Frame-bound actionable notes. History is retained separately from approval."""
    refs = value.get('references', [])
    if ('issues' in value or any('issues' in r for r in refs)) and value['version'] != 2:
        raise ValueError('timed issues require review record version 2')

    def clock(c):
        if (not isinstance(c, dict) or type(c.get('frames')) is not int or c['frames'] <= 0 or
                any(type(c.get(k)) not in (int, float) or not math.isfinite(c[k]) for k in ('fps','origin')) or c['fps'] <= 0):
            raise ValueError('invalid issue frame clock')
        return c

    def rows(items, c):
        if not isinstance(items, list) or len(items) > 1000:
            raise ValueError('too many or invalid timed issues')
        seen = set()
        for issue in items:
            if not isinstance(issue, dict):
                raise ValueError('invalid timed issue')
            ident = issue.get('id')
            if not isinstance(ident, str) or not shotidentity.PATTERN.fullmatch(ident) or ident in seen:
                raise ValueError('invalid or duplicate issue id')
            seen.add(ident)
            if (issue.get('kind') not in ('point','range') or issue.get('status') not in ('open','fixed','verified') or
                    any(type(issue.get(k)) is not int for k in ('startFrame','endFrame')) or
                    not 0 <= issue['startFrame'] < issue['endFrame'] <= c['frames'] or
                    (issue['kind'] == 'point' and issue['endFrame'] != issue['startFrame'] + 1)):
                raise ValueError('invalid issue frames or status')
            if (not isinstance(issue.get('note'), str) or not issue['note'].strip() or len(issue['note']) > 2000 or
                    not isinstance(issue.get('resolution'), str) or len(issue['resolution']) > 2000 or
                    (issue['status'] != 'open' and not issue['resolution'].strip())):
                raise ValueError('issue needs a note and fixed/verified issues need a resolution')
            if (issue.get('shotIndex') is not None and (type(issue['shotIndex']) is not int or issue['shotIndex'] < 0)):
                raise ValueError('invalid issue shot index')
            if issue.get('shotId') is not None and (not isinstance(issue['shotId'],str) or not shotidentity.PATTERN.fullmatch(issue['shotId'])):
                raise ValueError('invalid issue shot id')
            if 'shotIndex' not in issue or 'shotId' not in issue:
                raise ValueError('issue shot identity required')

    ids = {r['index'] for r in value['shots']}
    for ref in refs:
        if 'issues' in ref:
            c = clock(ref.get('issueClock')); rows(ref['issues'], c)
            for issue in ref['issues']:
                if 'currentIndex' not in issue or (issue['currentIndex'] is not None and
                        (type(issue['currentIndex']) is not int or issue['currentIndex'] not in ids)):
                    raise ValueError('historical issue targets an unknown shot')
    if 'issues' not in value:
        return
    c = clock(value.get('snapshot')); rows(value['issues'], c)
    shots = c['shots']
    if record is not None:
        if (c['frames'] != record['frames'] or c['fps'] != record['fps'] or c['origin'] != record['from']):
            raise ValueError('issue clock differs from rendered media')
        shots = [dict(index=i,start=s['from'],end=s['to'],id=s.get('id')) for i,s in enumerate(record['shots'])]
    statuses = {r['index']: r['status'] for r in value['shots']}
    for issue in value['issues']:
        at = c['origin'] + (issue['startFrame'] + .5) / c['fps']
        active = [s for s in shots if s['start'] <= at < s['end']]
        owner = active[-1] if active else None
        if issue['shotIndex'] != (owner['index'] if owner else None) or issue['shotId'] != (owner.get('id') if owner else None):
            raise ValueError('issue shot identity differs from its frame')
        if issue['status'] != 'verified':
            for shot in shots:
                first = max(0, math.ceil((shot['start']-c['origin'])*c['fps']-.5))
                last = min(c['frames'], math.ceil((shot['end']-c['origin'])*c['fps']-.5))
                if first < last and first < issue['endFrame'] and last > issue['startFrame'] and statuses.get(shot['index']) == 'pass':
                    raise ValueError('unverified issues block affected shot approval')
            if value['overall']['status'] == 'pass':
                raise ValueError('unverified issues block overall approval')


def validate_context(value):
    """Optional history is advisory, but malformed data must not enter packages."""
    def text(value, limit):
        if not isinstance(value,str) or len(value)>limit:
            raise ValueError('invalid review comparison text')
    def index(value, optional=False):
        if optional and value is None:
            return
        if type(value) is not int or value<0:
            raise ValueError('invalid review comparison index')
    snap=value.get('snapshot')
    if snap is not None:
        if snap['version']!=1 or snap['binding']!=value['binding'] or not isinstance(snap['shots'],list):
            raise ValueError('invalid review comparison snapshot')
        found=[]
        for row in snap['shots']:
            index(row['index']);found.append(row['index'])
            for key in ('name','scene','picture'):
                text(row[key],2000)
            if any(type(row[k]) not in (int,float) or not math.isfinite(row[k]) for k in ('start','end')) or row['start']>=row['end']:
                raise ValueError('invalid review comparison time')
        if sorted(found)!=sorted(row['index'] for row in value['shots']):
            raise ValueError('comparison snapshot shot coverage differs')
        shotidentity.validate(snap['shots'])
        for key in ('title','picture','mix'):
            text(snap[key],2000)
        if not isinstance(snap['tracks'],list) or not isinstance(snap['cues'],list):
            raise ValueError('invalid comparison tracks/cues')
        for row in snap['tracks']:
            for key in ('id','role','content'):
                text(row[key],2000)
        for row in snap['cues']:
            text(row['text'],100000)
            if any(type(row[k]) not in (int,float) or not math.isfinite(row[k]) for k in ('start','end')) or row['start']>=row['end']:
                raise ValueError('invalid comparison cue')
    references=value.get('references',[])
    if not isinstance(references,list) or len(references)>50:
        raise ValueError('too many review reference versions')
    ids={row['index'] for row in value['shots']}
    for ref in references:
        for key,limit in [('binding',200),('reviewer',200),('updatedAt',100),('overallNote',2000)]:
            text(ref[key],limit)
        if not isinstance(ref['shots'],list):
            raise ValueError('invalid historical shot notes')
        for row in ref['shots']:
            index(row['oldIndex']);index(row['currentIndex'],True)
            if row['currentIndex'] is not None and row['currentIndex'] not in ids:
                raise ValueError('historical note targets an unknown shot')
            text(row['name'],2000);text(row['note'],2000)
