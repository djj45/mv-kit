"""Content-verified decoded picture hashes, shared across audio-only remuxes."""
import json
from pathlib import Path
import re
import tempfile

import cachectl
import clipcache
import delivery
from mvproject import fingerprint
from soundtrack import digest, encoder_version

HEX = re.compile(r'[0-9a-f]{64}')


def decode(film, count):
    result = delivery.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(film),
                           '-map', '0:v:0', '-an', '-fps_mode', 'passthrough',
                           '-f', 'framehash', '-hash', 'sha256', '-'])
    hashes = [line.rsplit(',', 1)[-1].strip() for line in result.stdout.decode().splitlines()
              if line.strip() and not line.startswith('#')]
    if (len(hashes) != count or result.stderr.strip() or
            any(not HEX.fullmatch(h) for h in hashes)):
        raise ValueError('cannot build review comparison: decoded frame count/errors differ')
    return hashes


def picture(film, record, cache=None):
    """Hits avoid pixel decoding but always inspect actual video packets.

    Audio, captions, shot names and boundaries never enter the cache key.
    Interval summaries use these hashes with the current receipt's boundaries.
    """
    film = Path(film)
    original = fingerprint(film)
    stream = next(s for s in delivery.probe(film)['streams'] if s['codec_type'] == 'video')
    spec = {k: record[k] for k in ('fps', 'width', 'height')}
    spec['display'] = {k: stream.get(k) for k in ('pix_fmt', 'color_range', 'color_space',
                                                'color_transfer', 'color_primaries', 'sample_aspect_ratio')}

    def unchanged():
        if fingerprint(film) != original:
            raise ValueError('source film changed while building review comparison')

    if cache is None:
        frames = decode(film, record['frames'])
        unchanged()
        return spec, frames, {'enabled': False, 'hit': False}
    cache = Path(cache)
    # Existing packet identity includes timing, codec extradata and display metadata.
    identity = clipcache.video_identity(film)
    key = digest({'version': 1, 'video': identity, 'spec': spec, 'count': record['frames'],
                  'decoder': encoder_version(),
                  'processor': fingerprint(Path(__file__))['sha256'],
                  'identityProcessor': fingerprint(Path(clipcache.__file__))['sha256']})
    with cachectl.lease(cache):
        cache.mkdir(parents=True, exist_ok=True)
        path = cache / (key + '.json')
        hit = False
        try:
            if path.is_symlink():
                raise ValueError('symlink entry')
            entry = json.loads(path.read_text())
            payload = entry['payload']
            frames = payload['frames']
            hit = (entry['key'] == key and payload['spec'] == spec and
                   isinstance(frames, list) and len(frames) == record['frames'] and
                   all(isinstance(h, str) and HEX.fullmatch(h) for h in frames) and
                   entry['sha256'] == digest(payload))
        except (OSError, ValueError, KeyError, TypeError):
            pass
        if not hit:
            frames = decode(film, record['frames'])
            unchanged()
            payload = {'spec': spec, 'frames': frames}
            # One atomic JSON publication; incomplete staging never counts as a hit.
            with tempfile.TemporaryDirectory(prefix='.review-', dir=cache) as temp:
                staged = Path(temp) / 'entry.json'
                staged.write_text(json.dumps({'key': key, 'payload': payload, 'sha256': digest(payload)}) + '\n')
                staged.replace(path)
        unchanged()
        cachectl.record(cache, [key], hit)
    print(f'review picture cache: {"reused" if hit else "built"} {len(frames)} frame hashes')
    return spec, frames, {'enabled': True, 'hit': hit, 'key': key, 'frames': len(frames)}
