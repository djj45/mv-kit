"""Verified Canvas render chunks. Callers hold the project's chunks lease."""
import json
import os
from fractions import Fraction
from pathlib import Path
import tempfile

from delivery import run
from mvproject import fingerprint

VERSION = 1


def specification(start, end, fps, width, height):
    if not (0 <= start < end and fps > 0 and width > 0 and height > 0):
        raise ValueError('invalid render chunk specification')
    return dict(startFrame=start, endFrame=end, frames=end-start,
                fps=fps, width=width, height=height, codec='h264', pixelFormat='yuv420p')


def metadata_path(path):
    return Path(path).with_suffix('.json')


def reusable(path, expected):
    """The digest certifies the bytes whose decoded specs were checked at publication.

    Legacy, partial and malformed entries are misses, never silently adopted.
    A hit hashes the whole MP4 but does not decode it again.
    """
    path = Path(path)
    stamp = metadata_path(path)
    if path.is_symlink() or stamp.is_symlink():
        return False
    try:
        data = json.loads(stamp.read_text(encoding='utf-8'))
        return (data['version'] == VERSION and data['name'] == path.name and
                data['specification'] == expected and data['media'] == fingerprint(path))
    except (OSError, ValueError, KeyError, TypeError):
        return False


def verify(path, expected):
    # count_frames decodes the stream; stderr matters because ffprobe may report
    # damaged packets yet still exit zero and return a plausible frame count.
    result = run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-of', 'json', str(path)])
    if result.stderr.strip():
        raise ValueError('render chunk decode failed: ' + result.stderr.decode(errors='replace')[-1000:])
    try:
        streams = json.loads(result.stdout)['streams']
        stream = streams[0]
        valid = (len(streams) == 1 and stream['codec_type'] == 'video' and
                 stream['codec_name'] == expected['codec'] and stream['pix_fmt'] == expected['pixelFormat'] and
                 int(stream['nb_read_frames']) == expected['frames'] and
                 abs(float(Fraction(stream['avg_frame_rate']))-expected['fps']) < 1e-6 and
                 stream['width'] == expected['width'] and stream['height'] == expected['height'])
    except (ValueError, KeyError, TypeError, IndexError, ZeroDivisionError) as exc:
        raise ValueError('render chunk has incomplete video specifications') from exc
    if not valid:
        raise ValueError('render chunk does not match requested frames/fps/size/codec')


def publish(staged, target, expected):
    """Verify before replacement. A crash between replacements leaves a cache miss."""
    staged, target = Path(staged), Path(target)
    verify(staged, expected)
    data = dict(version=VERSION, name=target.name, specification=expected, media=fingerprint(staged))
    with tempfile.NamedTemporaryFile(mode='w', prefix=f'.tmp-{os.getpid()}-', suffix='.json',
                                     dir=target.parent, delete=False) as handle:
        stamp = Path(handle.name)
        try:
            json.dump(data, handle, sort_keys=True)
            handle.flush()
            staged.replace(target)
            stamp.replace(metadata_path(target))
        finally:
            stamp.unlink(missing_ok=True)


def discard(path):
    Path(path).unlink(missing_ok=True)
    metadata_path(path).unlink(missing_ok=True)
