"""Verify a portable delivery directory without reading the original project.

python tools/verify_package.py /path/to/package [--out /path/to/new-report.json]
Exit 0: package integrity/specifications pass; exit 1: validation failed.
Stored creative QA and human review remain separate from package integrity.
"""
import argparse
from fractions import Fraction
import json
import math
from pathlib import Path, PurePosixPath
import re
import tempfile

import clipcache
import delivery
import reviewstate
import soundtrack
from mvproject import fingerprint


def local_file(root, name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name:
        raise ValueError('invalid package-relative path')
    relative = PurePosixPath(name)
    if relative.is_absolute() or any(p in ('.','..') for p in name.split('/')) or str(relative) != name:
        raise ValueError('path must stay inside package')
    path = root
    for part in relative.parts:
        path = path/part
        if path.is_symlink():
            raise ValueError('symlinks are not portable package files')
    if not path.is_file():
        raise ValueError('required file is missing')
    return path


def finite(value, positive=False):
    if type(value) not in (int,float) or not math.isfinite(value) or (positive and value <= 0):
        raise ValueError('invalid numeric specification')
    return value


def inspect(package):
    root = Path(package).expanduser().resolve()
    checks, files, actual = [], {}, {}
    def check(kind, action, file=None):
        try:
            value = action()
            checks.append(dict(kind=kind,status='pass',file=file,message='verified'))
            return value
        except (OSError,ValueError,KeyError,TypeError,IndexError,ZeroDivisionError,AttributeError) as exc:
            checks.append(dict(kind=kind,status='fail',file=file,message=str(exc)))
            return None
    def require(condition, message):
        if not condition:
            raise ValueError(message)
    def read(name):
        return json.loads(local_file(root,name).read_text(encoding='utf-8'))
    manifest = check('manifest',lambda: read('manifest.json'))
    if not isinstance(manifest,dict):
        checks.append(dict(kind='manifest-schema',status='fail',file='manifest.json',message='manifest must be an object'))
        return dict(status='fail',checks=checks,scope='package integrity; not creative or human approval')
    def schema():
        require(manifest['version']==1,'unsupported package version')
        finite(manifest['fps'],True)
        for name in ('width','height','frames'):
            require(type(manifest[name]) is int and manifest[name]>0,'invalid '+name)
        start,end = finite(manifest['songFrom']),finite(manifest['songTo'])
        require(abs(end-start-manifest['frames']/manifest['fps'])<1e-6,'package time range differs from frame count')
        require(isinstance(manifest['files'],dict),'files must be a mapping')
        require(isinstance(manifest['shots'],list) and bool(manifest['shots']),'shots must be nonempty')
        require(isinstance(manifest['audio']['tracks'],list),'tracks must be a list')
        require(isinstance(manifest['subtitles'],list),'subtitles must be a list')
        return True
    if not check('schema',schema):
        return dict(status='fail',checks=checks,scope='package integrity; not creative or human approval')
    files = manifest['files']
    for name, expected in files.items():
        def verify_file(name=name,expected=expected):
            require(isinstance(expected,dict) and type(expected.get('bytes')) is int and expected['bytes']>=0 and
                    isinstance(expected.get('sha256'),str) and re.fullmatch('[0-9a-f]{64}',expected['sha256']), 'invalid file fingerprint')
            value = fingerprint(local_file(root,name))
            actual[name] = value
            require(value==expected,'file bytes differ from manifest')
        check('file',verify_file,name)
    def required(name):
        require(name in files,'required file is absent from manifest: '+str(name))
        return local_file(root,name)
    for name in ('film.mp4','render.json','subtitles.srt','subtitles.vtt','filmcheck.json','sync.json','subtitles.json'):
        check('required',lambda name=name:required(name),name)
    record = check('receipt',lambda:read('render.json'))
    duration,fps = manifest['frames']/manifest['fps'],manifest['fps']
    def receipt():
        require(record['version']==1 and record['complete'] is True,'incomplete or unsupported render receipt')
        for key in ('fps','frames','width','height'):
            require(record[key]==manifest[key],'receipt differs: '+key)
        require(record['from']==manifest['songFrom'] and record['to']==manifest['songTo'],'receipt range differs')
        require(actual['film.mp4']['sha256']==record['filmSha256']==manifest['sourceFilmSha256'],'film does not match receipt')
    check('receipt-consistency',receipt)
    def movie():
        scanned = delivery.run(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(required('film.mp4'))])
        require(not scanned.stderr.strip(),'film has decode errors')
        info = json.loads(scanned.stdout)
        videos = [s for s in info['streams'] if s['codec_type']=='video']
        require(len(videos)==1,'film must contain one video stream')
        video = videos[0]
        require(int(video['nb_read_frames'])==manifest['frames'],'film frame count differs')
        require(video['width']==manifest['width'] and video['height']==manifest['height'],'film dimensions differ')
        require(abs(float(Fraction(video['avg_frame_rate']))-fps)<1e-6,'film frame rate differs')
        require(abs(float(video['duration'])-duration)<=1/fps,'film duration differs')
        audio = [s for s in info['streams'] if s['codec_type']=='audio']
        require(len(audio)==int(bool(manifest['audio']['tracks'])),'film audio presence differs from track list')
        if audio:
            require(abs(float(audio[0]['duration'])-duration)<=max(.1,1/fps),'film audio duration differs')
    check('film-specifications',movie,'film.mp4')
    def partition():
        cursor, names = 0,set()
        for row in manifest['shots']:
            start,end = row['startFrame'],row['endFrame']
            require(type(start) is int and type(end) is int and start==cursor<end<=manifest['frames'],'shot frames have a gap, overlap or invalid range')
            require(row['file'] not in names,'clip file is referenced more than once')
            names.add(row['file'])
            require(abs(finite(row['fromSeconds'])-start/fps)<1e-6 and abs(finite(row['toSeconds'])-end/fps)<1e-6,'shot seconds differ from frames')
            require(abs(finite(row['songFrom'])-manifest['songFrom']-start/fps)<1e-6 and
                    abs(finite(row['songTo'])-manifest['songFrom']-end/fps)<1e-6,'shot source range differs')
            cursor=end
        require(cursor==manifest['frames'],'shot frames do not cover entire film')
    check('frame-coverage',partition)
    for index,row in enumerate(manifest['shots']):
        check('clip',lambda row=row:clipcache.verify_clip(required(row['file']),row['endFrame']-row['startFrame'],fps,
                                                         manifest['width'],manifest['height']),str(row.get('file',index)) if isinstance(row,dict) else str(index))
    def sound(name):
        info=delivery.probe(required(name))
        require(len(info['streams'])==1 and info['streams'][0]['codec_type']=='audio','stem must contain one audio stream')
        stream=info['streams'][0]
        require(int(stream['sample_rate'])==48000 and stream['channels']==2 and stream['codec_name']=='pcm_f32le',
                'stem must be stereo 48 kHz float PCM')
        require(abs(float(stream.get('duration',info['format']['duration']))-duration)<=2/48000,'stem duration differs')
    tracks=manifest['audio']['tracks']
    def track_list():
        names, ids=set(),set()
        for track in tracks:
            require(track['role'] in ('bgm','voice','sfx'),'invalid audio role')
            require(track['id'] not in ids and track['stem'] not in names,'duplicate audio track')
            ids.add(track['id']);names.add(track['stem'])
    check('audio-tracks',track_list)
    for index,track in enumerate(tracks):
        check('audio-duration',lambda track=track:sound(track['stem']),str(track.get('stem',index)) if isinstance(track,dict) else str(index))
    if tracks:
        check('mix-duration',lambda:sound('audio/mix.wav'),'audio/mix.wav')
    def subtitles():
        previous=-1
        for cue in manifest['subtitles']:
            start,end=finite(cue['start']),finite(cue['end'])
            require(0<=start<end<=duration+.001,'subtitle falls outside exported movie')
            require(start>=previous,'subtitles are out of order')
            require(isinstance(cue['text'],str),'subtitle text must be a string')
            previous=start
        with tempfile.TemporaryDirectory() as temp:
            soundtrack.subtitles({'from':0,'to':duration,'subtitles':manifest['subtitles']},temp)
            for name in ('subtitles.srt','subtitles.vtt'):
                require(required(name).read_bytes()==(Path(temp)/name).read_bytes(),'subtitle file differs from manifest cues: '+name)
    check('subtitle-range-and-files',subtitles)
    for kind,name in [('film','filmcheck.json'),('sync','sync.json'),('subtitles','subtitles.json')]:
        check('stored-qa',lambda kind=kind,name=name:require(read(name)['status']==manifest['qa'][kind],'stored QA status differs'),name)
    human='pending'
    def review():
        expected=reviewstate.binding(record,actual)
        if 'reviewBinding' in manifest:
            require(manifest['reviewBinding']==expected,'review binding differs from package media or receipt')
        if 'review-record.json' in files:
            value=reviewstate.read(required('review-record.json'),expected,reviewstate.shot_ids(record),record)
            require(manifest.get('humanReview','pending')==value['overall']['status'],'human review summary differs')
            return value['overall']['status']
        require(manifest.get('humanReview','pending')=='pending','human approval record is missing')
        return 'pending'
    human=check('human-review',review) or 'unverified'
    return dict(status='fail' if any(c['status']=='fail' for c in checks) else 'pass',checks=checks,
                qa=manifest.get('qa'),humanReview=human,
                scope='package bytes, encoded specifications and timing; stored QA is not rerun; no proof of reviewer identity')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package')
    parser.add_argument('--out',type=Path,help='write a new JSON report; existing files are never overwritten')
    args=parser.parse_args()
    result=inspect(args.package)
    text=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if args.out:
        try:
            with args.out.open('x',encoding='utf-8') as handle:
                handle.write(text)
        except OSError as exc:
            parser.error(str(exc))
    print(text,end='')
    raise SystemExit(0 if result['status']=='pass' else 1)


if __name__=='__main__':
    main()
