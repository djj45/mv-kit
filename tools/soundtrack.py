"""Post-picture sound editing. All cue/subtitle times are absolute song seconds."""
import json
import math
import re
import tempfile
import hashlib
import shutil
from functools import lru_cache
from pathlib import Path

from delivery import probe, run
from mvproject import fingerprint

AUDIO_EXT = {'.wav', '.mp3', '.m4a', '.flac', '.aac', '.ogg', '.aiff', '.aif', '.opus'}


def sidecar(cfg):
    return (cfg['_dir'] / cfg['soundtrack']).resolve() if cfg.get('soundtrack') else None


def read(cfg):
    path = sidecar(cfg)
    data = json.loads(path.read_text(encoding='utf-8')) if path else {}
    if not isinstance(data, dict) or data.get('version', 1) != 1:
        raise ValueError('soundtrack must be a version 1 object')
    return data


def assets(cfg):
    """Also track files outside the project, without decoding media to hash inputs."""
    data = read(cfg)
    return {(cfg['_dir'] / t['file']).resolve() for t in data.get('tracks', [])}


def number(value, name, minimum=None):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{name} must be a finite number')
    if minimum is not None and value < minimum:
        raise ValueError(f'{name} must be >= {minimum}')
    return value


def plan(cfg, info, start, end, noaudio=False):
    data = read(cfg)
    rows = data.get('tracks', [])
    if not isinstance(rows, list):
        raise ValueError('soundtrack.tracks must be an array')
    if any(not isinstance(t, dict) or t.get('id') in ('song', 'mix') for t in rows):
        raise ValueError('tracks must be objects; song/mix are reserved ids')
    song = data.get('song', {})
    if song is not False and not isinstance(song, dict):
        raise ValueError('soundtrack.song must be an object or false')
    audio = cfg.get('audio') or info.get('audio')
    if audio and song is not False:
        rows = [dict(song, id='song', role='bgm', file=audio, at=0)] + rows
    if noaudio:
        rows = []
    tracks, ids = [], set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('soundtrack tracks must be objects')
        ident = row.get('id', '')
        if not isinstance(ident, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', ident) or ident in ids or ident == 'mix':
            raise ValueError('track ids must be unique filename-safe letters/numbers/_/- (song is reserved)')
        ids.add(ident)
        if row.get('role') not in ('bgm', 'voice', 'sfx'):
            raise ValueError(f'{ident}: role must be bgm, voice or sfx')
        file = (cfg['_dir'] / row['file']).resolve()
        media = probe(file)
        streams = [s for s in media['streams'] if s['codec_type'] == 'audio']
        if not streams:
            raise ValueError(f'{ident}: no audio stream in {file}')
        length = float(streams[0].get('duration', media['format'].get('duration', 0)))
        trim = number(row.get('trimStart', 0), 'trimStart', 0)
        at = number(row.get('at', 0), 'at', 0)
        loop = row.get('loop', False)
        if not isinstance(loop, bool):
            raise ValueError('loop must be boolean')
        duration = number(row.get('duration', length - trim), 'duration', 0)
        if trim >= length or duration <= 0 or (not loop and trim + duration > length + 0.01):
            raise ValueError(f'{ident}: trim/duration exceeds source (set loop:true to repeat)')
        gain = number(row.get('gainDb', 0), 'gainDb')
        if not -96 <= gain <= 24:
            raise ValueError('gainDb must be between -96 and 24')
        fades = {k: number(row.get(k, 0), k, 0) for k in ('fadeIn', 'fadeOut')}
        if max(fades.values()) > duration:
            raise ValueError(f'{ident}: fades cannot exceed cue duration')
        if not noaudio and at < end and at + duration > start:
            tracks.append(dict(id=ident, role=row['role'], file=str(file), at=at,
                               duration=duration, trimStart=trim, loop=loop, gainDb=gain, **fades))
    # Keep the song reference only when the source clock has not been shifted or looped.
    sync = next((t['file'] for t in tracks if t['id'] == 'song' and not t['at'] and not t['trimStart'] and not t['loop']), None)
    subs = data.get('subtitles', info.get('subtitles', []))
    if not isinstance(subs, list):
        raise ValueError('subtitles must be an array')
    for sub in subs:
        if not isinstance(sub, dict):
            raise ValueError('subtitles must be objects')
        s, e = number(sub.get('start'), 'subtitle.start', 0), number(sub.get('end'), 'subtitle.end', 0)
        if e <= s or not isinstance(sub.get('text'), str) or not sub['text'].strip():
            raise ValueError('subtitle needs start < end and nonempty text')
    return {'version': 1, 'from': start, 'to': end, 'tracks': tracks, 'syncSource': sync,
            'subtitles': subs, 'limiter': 0.98, 'fadeOut': number(cfg.get('audioFadeOut', 0.2), 'audioFadeOut', 0)}


def stem(track, mix, output):
    """A full-range, aligned stereo PCM stem, with cue gain/fades but no master limiter."""
    start, end = mix['from'], mix['to']
    left, right = max(start, track['at']), min(end, track['at'] + track['duration'])
    elapsed = left - track['at']
    cmd = ['ffmpeg', '-y', '-v', 'error']
    if track['loop']:
        cmd += ['-stream_loop', '-1']
    cmd += ['-ss', str(track['trimStart'] + elapsed), '-t', str(right - left), '-i', track['file']]
    envelopes = [str(10 ** (track['gainDb'] / 20))]
    if track['fadeIn']:
        envelopes.append(f"min(1,max(0,(t+{elapsed})/{track['fadeIn']}))")
    if track['fadeOut']:
        envelopes.append(f"min(1,max(0,({track['duration']}-{elapsed}-t)/{track['fadeOut']}))")
    filters = ["aresample=48000", 'aformat=channel_layouts=stereo', 'asetpts=PTS-STARTPTS',
               "volume='" + '*'.join(envelopes) + "':eval=frame",
               f'adelay={round((left-start)*48000)}S:all=1',
               f'apad=whole_dur={end-start}', f'atrim=duration={end-start}']
    cmd += ['-map', '0:a:0', '-af', ','.join(filters), '-c:a', 'pcm_f32le', str(output)]
    run(cmd)


def digest(value):
    def canonical(item):
        if isinstance(item, float) and item.is_integer():
            return int(item)
        if isinstance(item, dict):
            return {k: canonical(v) for k, v in item.items()}
        if isinstance(item, list):
            return [canonical(v) for v in item]
        return item
    return hashlib.sha256(json.dumps(canonical(value), sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()


@lru_cache(maxsize=1)
def encoder_version():
    return run(['ffmpeg', '-version']).stdout.decode().splitlines()[0]


def track_key(track, mix):
    return digest({'source': fingerprint(Path(track['file']))['sha256'],
                   'cue': {k: v for k, v in track.items() if k not in ('id', 'role', 'file')},
                   'from': mix['from'], 'to': mix['to'], 'processor': fingerprint(Path(__file__))['sha256'],
                   'encoder': encoder_version()})


def audio_revision(mix):
    """Audio identity deliberately excludes subtitles, cue labels and source filenames."""
    return digest({'tracks': [track_key(t, mix) for t in mix['tracks']],
                   'from': mix['from'], 'to': mix['to'], 'fadeOut': mix.get('fadeOut', 0.2),
                   'limiter': mix['limiter']})


def cached_audio(cache, key, output, create, validate):
    if cache is None:
        return _cached_audio(cache, key, output, create, validate)
    import cachectl
    with cachectl.lease(cache):
        hit = _cached_audio(cache, key, output, create, validate)
        cachectl.record(cache, [key], hit)
        return hit


def _cached_audio(cache, key, output, create, validate):
    """Check cached bytes, copy rather than link, and never cache changing sources."""
    if cache is None:
        create(output)
        return False
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    wav, meta = cache / (key + '.wav'), cache / (key + '.json')
    try:
        expected = json.loads(meta.read_text())
        if fingerprint(wav) == expected:
            shutil.copyfile(wav, output)
            if fingerprint(output) == expected and validate() == key:
                return True
    except (OSError, ValueError):
        pass
    with tempfile.TemporaryDirectory(prefix='.audio-', dir=cache) as temp:
        staged = Path(temp) / 'audio.wav'
        create(staged)
        if validate() != key:
            raise ValueError('audio inputs changed while building cache; previous output preserved')
        stamp = Path(temp) / 'audio.json'
        stamp.write_text(json.dumps(fingerprint(staged)))
        shutil.copyfile(staged, output)
        staged.replace(wav)
        stamp.replace(meta)
    return False


def mixdown(mix, directory, cache=None):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    key = audio_revision(mix)
    stems, reused = [], 0
    for t in mix['tracks']:
        path = directory / (t['id'] + '.wav')
        cue_key = track_key(t, mix)
        reused += cached_audio(cache, cue_key, path, lambda dest: stem(t, mix, dest), lambda: track_key(t, mix))
        stems.append(path)
    if not stems:
        return None
    cmd = ['ffmpeg', '-y', '-v', 'error']
    for path in stems:
        cmd += ['-i', str(path)]
    graph = ''.join(f'[{i}:a]' for i in range(len(stems)))
    graph += f'amix=inputs={len(stems)}:normalize=0:dropout_transition=0,afade=t=in:d=0.02'
    fade = min(mix.get('fadeOut', 0.2), mix['to']-mix['from'])
    if fade:
        graph += f',afade=t=out:st={mix["to"]-mix["from"]-fade}:d={fade}'
    graph += ',alimiter=limit=0.98:level=0:latency=1[out]'
    output = directory / 'mix.wav'
    if audio_revision(mix) != key:
        raise ValueError('audio inputs changed during mixing')
    mix_reused = cached_audio(cache, key, output,
                             lambda dest: run(cmd + ['-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', str(dest)]),
                             lambda: audio_revision(mix))
    if cache is not None:
        print(f'audio cache: {reused}/{len(stems)} stems reused; mix {"reused" if mix_reused else "rebuilt"}')
    return output


def mux(video_args, output, mix, cache=None):
    """Copy the video stream; publish atomically after all audio work succeeds."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.sound-', dir=output.parent) as folder:
        folder = Path(folder)
        audio = mixdown(mix, folder, cache)
        cmd = ['ffmpeg', '-y', '-v', 'error', *video_args]
        if audio:
            cmd += ['-i', str(audio), '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '256k']
        else:
            cmd += ['-map', '0:v:0', '-an']
        staged = folder / 'film.mp4'
        run(cmd + ['-c:v', 'copy', '-movflags', '+faststart', str(staged)])
        staged.replace(output)


def subtitles(mix, directory):
    from captions import cues as exported_cues
    def stamp(ms, sep):
        return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{sep}{ms%1000:03}'
    srt, vtt, cues = [], ['WEBVTT', ''], []
    for cue in exported_cues(mix):
        a, b, text = round(cue['start']*1000), round(cue['end']*1000), cue['text']
        cues.append(cue)
        srt += [str(len(cues)), f'{stamp(a, ",")} --> {stamp(b, ",")}', text, '']
        # WebVTT cue payload is HTML-like; escape literal text, preserving line breaks.
        escaped = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        vtt += [f'{stamp(a, ".")} --> {stamp(b, ".")}', escaped, '']
    for name, lines in [('subtitles.srt', srt), ('subtitles.vtt', vtt)]:
        (Path(directory) / name).write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return cues
