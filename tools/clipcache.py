"""Content-checked encoded shot cache; audio/captions never enter video identity."""
import hashlib
import json
import shutil
import tempfile
from fractions import Fraction
from pathlib import Path

import delivery
from mvproject import fingerprint
from soundtrack import digest, encoder_version

SETTINGS = dict(codec='libx264', crf=18, preset='fast', pixFmt='yuv420p')


def video_identity(film):
    # Copy packets, do not decode/re-encode. Framehash includes packet timing and
    # codec extradata, unlike hashing only compressed packet payloads.
    stream = next(s for s in delivery.probe(film)['streams'] if s['codec_type'] == 'video')
    packets = delivery.run(['ffmpeg', '-v', 'error', '-i', str(film), '-map', '0:v:0', '-an',
                            '-c:v', 'copy', '-f', 'framehash', '-hash', 'sha256', '-']).stdout
    fields = ('codec_name', 'codec_tag_string', 'width', 'height', 'pix_fmt', 'sample_aspect_ratio',
              'color_range', 'color_space', 'color_transfer', 'color_primaries', 'chroma_location',
              'avg_frame_rate', 'r_frame_rate', 'time_base', 'start_time', 'duration', 'nb_frames', 'side_data_list')
    return digest({'packets': hashlib.sha256(packets).hexdigest(), 'stream': {k: stream.get(k) for k in fields}})


def encode(film, start, end, output):
    delivery.run(['ffmpeg', '-y', '-v', 'error', '-i', str(film), '-map', '0:v:0', '-an',
                  '-vf', f'trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS',
                  '-c:v', SETTINGS['codec'], '-crf', str(SETTINGS['crf']), '-preset', SETTINGS['preset'],
                  '-pix_fmt', SETTINGS['pixFmt'], '-fps_mode', 'passthrough', '-movflags', '+faststart', str(output)])


def verify_clip(path, count, fps, width, height):
    result = delivery.run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-of', 'json', str(path)])
    if result.stderr.strip():
        raise ValueError('encoded clip has decode errors')
    info = json.loads(result.stdout)
    streams = info['streams']
    if (len(streams) != 1 or streams[0]['codec_type'] != 'video' or
        int(streams[0].get('nb_read_frames', -1)) != count or
        abs(float(Fraction(streams[0]['avg_frame_rate']))-fps) > 1e-6 or
        streams[0]['width'] != width or streams[0]['height'] != height or
        abs(float(streams[0].get('start_time', 0))) > 1e-4 or
        abs(float(streams[0].get('duration', 0))-count/fps) > 1/fps):
        raise ValueError('encoded clip does not match requested frames/fps/size')


def export(film, row, record, identity, cache, output):
    import cachectl
    with cachectl.lease(cache):
        key, hit = _export(film, row, record, identity, cache, output)
        cachectl.record(cache, [key], hit)
        return key, hit


def _export(film, row, record, identity, cache, output):
    start, end = row['startFrame'], row['endFrame']
    if not 0 <= start < end <= record['frames']:
        raise ValueError('invalid clip frame range')
    key = digest({'video': identity, 'start': start, 'end': end, 'fps': record['fps'],
                  'size': [record['width'], record['height']], 'settings': SETTINGS,
                  'encoder': encoder_version(), 'processor': fingerprint(Path(__file__))['sha256']})
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    clip, meta = cache / (key+'.mp4'), cache / (key+'.json')
    try:
        entry = json.loads(meta.read_text())
        if entry['key'] == key and fingerprint(clip) == entry['media']:
            shutil.copy2(clip, output)
            if fingerprint(output) == entry['media']:
                return key, True
    except (OSError, ValueError, KeyError, TypeError):
        pass
    def unchanged():
        if fingerprint(film)['sha256'] != record['filmSha256']:
            raise ValueError('source film changed while building clip cache')
    unchanged()
    with tempfile.TemporaryDirectory(prefix='.clip-', dir=cache) as temp:
        staged = Path(temp) / 'clip.mp4'
        encode(film, start, end, staged)
        verify_clip(staged, end-start, record['fps'], record['width'], record['height'])
        unchanged()
        entry = dict(key=key, media=fingerprint(staged), videoRevision=identity,
                     startFrame=start, endFrame=end, settings=SETTINGS)
        stamp = Path(temp) / 'clip.json'
        stamp.write_text(json.dumps(entry, indent=2)+'\n')
        shutil.copy2(staged, output)
        staged.replace(clip)
        stamp.replace(meta)
    return key, False


def export_many(film, rows, record, cache, directory):
    """Copy a private source snapshot, then decode it once for all cache misses.

    Returns that snapshot as directory.parent/film.mp4 for the staged package.
    The caller owns the private staging directory and validates the live receipt
    again before publishing the package. Completed cache entries survive failure.
    """
    import cachectl
    import time
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    snapshot = directory.parent / 'film.mp4'
    if snapshot.exists():
        raise ValueError('package snapshot already exists')
    # Validate the entire partition before copying or publishing any clips.
    cursor = 0
    for row in rows:
        if row['startFrame'] != cursor or not cursor < row['endFrame'] <= record['frames']:
            raise ValueError('shot ranges must partition every encoded frame exactly once')
        cursor = row['endFrame']
    if cursor != record['frames'] or not rows:
        raise ValueError('shot ranges do not cover the encoded film')
    started = time.monotonic()
    shutil.copyfile(film, snapshot)
    if fingerprint(snapshot)['sha256'] != record['filmSha256']:
        raise ValueError('source film changed while copying package snapshot')
    identity = video_identity(snapshot)
    cache = Path(cache)
    reused, pending = 0, []
    with cachectl.lease(cache):
        cache.mkdir(parents=True, exist_ok=True)
        processor = fingerprint(Path(__file__))['sha256']
        encoder = encoder_version()
        for i, row in enumerate(rows, 1):
            start, end = row['startFrame'], row['endFrame']
            key = digest({'video': identity, 'start': start, 'end': end, 'fps': record['fps'],
                          'size': [record['width'], record['height']], 'settings': SETTINGS,
                          'encoder': encoder, 'processor': processor})
            output = directory / f'{i:03}.mp4'
            row.update(file=f'clips/{i:03}.mp4', cacheKey=key)
            clip, meta = cache/(key+'.mp4'), cache/(key+'.json')
            hit = False
            try:
                entry = json.loads(meta.read_text())
                if entry['key'] == key and fingerprint(clip) == entry['media']:
                    shutil.copyfile(clip, output)
                    hit = fingerprint(output) == entry['media']
            except (OSError, ValueError, KeyError, TypeError):
                pass
            if hit:
                reused += 1
                cachectl.record(cache, [key], True)
            else:
                pending.append((row, key, output))
        with tempfile.TemporaryDirectory(prefix='.clip-', dir=cache) as temp:
            def complete(item, staged):
                row, key, output = item
                verify_clip(staged, row['endFrame']-row['startFrame'], record['fps'], record['width'], record['height'])
                entry = dict(key=key, media=fingerprint(staged), videoRevision=identity,
                             startFrame=row['startFrame'], endFrame=row['endFrame'], settings=SETTINGS)
                stamp = Path(temp)/'clip.json'
                stamp.write_text(json.dumps(entry, indent=2)+'\n')
                shutil.copyfile(staged, output)
                staged.replace(cache/(key+'.mp4'))
                stamp.replace(cache/(key+'.json'))
                cachectl.record(cache, [key], False)
            if pending:
                encode_many(snapshot, pending, record, Path(temp), complete)
    contiguous = all(a[0]['endFrame'] == b[0]['startFrame'] for a,b in zip(pending,pending[1:]))
    window = [pending[0][0]['startFrame'],pending[-1][0]['endFrame']] if pending else None
    return identity, dict(reused=reused, encoded=len(pending)), dict(
        decodePasses=int(bool(pending)), sourceSnapshotChecks=1, decodedFrameWindow=window,
        strategy=('segment' if contiguous else 'raw-stream') if pending else 'cache',
        rawFramesTransferred=(window[1]-window[0]) if pending and not contiguous else 0,
        seconds=round(time.monotonic()-started, 3))


def encode_many(film, pending, record, directory, complete):
    """One decoder, at most one encoder, bounded raw-frame memory; no frame files."""
    if all(a[0]['endFrame'] == b[0]['startFrame'] for a,b in zip(pending,pending[1:])):
        return encode_contiguous(film, pending, record, directory, complete)
    import subprocess
    import threading
    width, height = record['width'], record['height']
    if width % 2 or height % 2:
        raise ValueError('yuv420p delivery requires even dimensions')
    first, last = pending[0][0]['startFrame'], pending[-1][0]['endFrame']
    stream = next(s for s in delivery.probe(film)['streams'] if s['codec_type'] == 'video')
    colors = []
    for field, option in [('color_range','-color_range'),('color_space','-colorspace'),
                          ('color_transfer','-color_trc'),('color_primaries','-color_primaries')]:
        if stream.get(field) not in (None, 'unknown', 'unspecified', 'reserved'):
            colors += [option, str(stream[field])]
    sar = stream.get('sample_aspect_ratio', '1:1').replace(':','/')
    if sar in ('N/A', '0/1'):
        sar = '1/1'
    processes, timed_out = [], threading.Event()
    def stop():
        for process in list(processes):
            if process.poll() is None:
                process.kill()
    def timeout():
        timed_out.set()
        stop()
    timer = threading.Timer(1800, timeout)
    timer.daemon = True
    decoder = encoder = None
    with tempfile.TemporaryFile() as errors:
        def message():
            errors.seek(0)
            return errors.read().decode(errors='replace')[-2000:]
        try:
            decoder = subprocess.Popen(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(film),
                '-map','0:v:0','-an','-vf',f'trim=start_frame={first}:end_frame={last}',
                '-frames:v',str(last-first),'-pix_fmt','yuv420p','-fps_mode','passthrough',
                '-f','rawvideo','-'], stdout=subprocess.PIPE, stderr=errors)
            processes.append(decoder)
            timer.start()
            index, frame_bytes = 0, width*height*3//2
            for frame in range(first, last):
                data = decoder.stdout.read(frame_bytes)
                if len(data) != frame_bytes:
                    raise ValueError('source decode ended before requested frame: '+message())
                item = pending[index] if index < len(pending) else None
                if item is None or frame < item[0]['startFrame']:
                    continue
                if frame == item[0]['startFrame']:
                    staged = directory/'clip.mp4'
                    encoder = subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo',
                        '-pixel_format','yuv420p','-video_size',f'{width}x{height}',
                        '-framerate',str(record['fps']),'-i','-','-an','-vf',f'setsar={sar}',
                        '-c:v',SETTINGS['codec'],'-crf',str(SETTINGS['crf']),'-preset',SETTINGS['preset'],
                        '-threads','2','-pix_fmt',SETTINGS['pixFmt'],*colors,
                        '-fps_mode','passthrough','-movflags','+faststart',str(staged)],
                        stdin=subprocess.PIPE, stderr=errors)
                    processes.append(encoder)
                encoder.stdin.write(data)
                if frame+1 == item[0]['endFrame']:
                    encoder.stdin.close()
                    if encoder.wait(timeout=1800) != 0:
                        raise ValueError('clip encoder failed: '+message())
                    processes.remove(encoder)
                    encoder = None
                    complete(item, staged)
                    index += 1
            if decoder.wait(timeout=1800) != 0:
                raise ValueError('source decoder failed: '+message())
            if timed_out.is_set():
                raise ValueError('batch clip encoding timed out after 30 minutes')
        except (BrokenPipeError, subprocess.TimeoutExpired) as exc:
            raise ValueError('batch clip encoding failed or timed out: '+message()) from exc
        finally:
            timer.cancel()
            stop()
            for process in processes:
                if process.stdin is not None:
                    try:
                        process.stdin.close()
                    except BrokenPipeError:
                        pass
                if process.stdout is not None:
                    process.stdout.close()
                process.wait()


def encode_contiguous(film, pending, record, directory, complete):
    """One encoder for adjacent missing shots; closed segments are immediately cached."""
    import csv
    import subprocess
    import threading
    first, last = pending[0][0]['startFrame'], pending[-1][0]['endFrame']
    boundaries = [item[0]['startFrame']-first for item in pending[1:]]
    command = ['ffmpeg','-y','-v','error','-xerror','-nostdin','-i',str(film),'-map','0:v:0','-an',
               '-vf',f'trim=start_frame={first}:end_frame={last},setpts=PTS-STARTPTS',
               '-frames:v',str(last-first),'-c:v',SETTINGS['codec'],'-crf',str(SETTINGS['crf']),
               '-preset',SETTINGS['preset'],'-threads','2','-pix_fmt',SETTINGS['pixFmt'],
               '-fps_mode','passthrough']
    if boundaries:
        command += ['-force_key_frames',','.join(f'{frame/record["fps"]:.12f}' for frame in boundaries)]
    command += ['-f','segment','-reset_timestamps','1','-segment_format','mp4',
                '-segment_format_options','movflags=+faststart','-segment_list_type','csv',
                '-segment_list','pipe:1']
    if boundaries:
        command += ['-segment_frames',','.join(map(str,boundaries))]
    else:
        command += ['-segment_time',str((last-first)/record['fps']+1)]
    command += [str(directory/'%06d.mp4')]
    with tempfile.TemporaryFile() as errors:
        process = subprocess.Popen(command,stdout=subprocess.PIPE,stderr=errors,text=True)
        expired = threading.Event()
        def timeout():
            expired.set()
            if process.poll() is None:
                process.kill()
        timer = threading.Timer(1800,timeout)
        timer.daemon = True
        timer.start()
        try:
            count = 0
            for line in process.stdout:
                fields = next(csv.reader([line]))
                if count >= len(pending) or Path(fields[0]).name != f'{count:06}.mp4':
                    raise ValueError('unexpected encoded segment order')
                staged = directory/f'{count:06}.mp4'
                if count == 0:
                    # Segment muxer offsets the first PTS by encoder B-frame delay.
                    # Normalize that one segment by stream copy; no second encode.
                    normalized = directory/'normalized.mp4'
                    delivery.run(['ffmpeg','-y','-v','error','-i',str(staged),'-map','0:v:0','-an',
                                  '-c:v','copy','-movflags','+faststart',str(normalized)])
                    normalized.replace(staged)
                complete(pending[count],staged)
                count += 1
            code = process.wait(timeout=1800)
            if code or expired.is_set() or count != len(pending):
                errors.seek(0)
                raise ValueError('batch segment encode failed or timed out: '+errors.read().decode(errors='replace')[-2000:])
        finally:
            timer.cancel()
            if process.poll() is None:
                process.kill()
            process.stdout.close()
            process.wait()
