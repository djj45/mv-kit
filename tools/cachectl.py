"""Managed render caches. Locks live outside caches and survive directory cleanup."""
import argparse
from contextlib import contextmanager
import fcntl
import json
import math
import os
from pathlib import Path
import re
import shutil
import tempfile
import time

KINDS = {'chunks': '.chunks', 'audio': '.audio-cache', 'clips': '.clip-cache', 'review': '.review-cache'}
PATTERNS = {
    'chunks': re.compile(r'[0-9a-f]{10}-\d{6,}-\d{6,}-[0-9a-f]{12}\.(mp4|json)'),
    'audio': re.compile(r'[0-9a-f]{64}\.(wav|json)'),
    'clips': re.compile(r'[0-9a-f]{64}\.(mp4|json)'),
    'review': re.compile(r'[0-9a-f]{64}\.json'),
}


def state_dir(cache):
    cache = Path(cache)
    if cache.is_symlink():
        raise ValueError(f'refusing symlink cache: {cache}')
    state = cache.parent / '.cache-state'
    if state.is_symlink():
        raise ValueError(f'refusing symlink state directory: {state}')
    state.mkdir(parents=True, exist_ok=True)
    return state


@contextmanager
def lease(cache, blocking=True):
    """Exclusive per-cache lease. Kernel releases it even on SIGKILL.

    Serializing same-kind operations also protects media/metadata pair publication.
    Callers must not nest leases on the same cache. Other cache kinds are independent.
    """
    cache = Path(cache)
    path = state_dir(cache) / (cache.name + '.lock')
    fd = os.open(path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'a+') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | (0 if blocking else fcntl.LOCK_NB))
        except BlockingIOError:
            yield False
            return
        try:
            yield True
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def read_stats(cache):
    try:
        data = json.loads((state_dir(cache) / (Path(cache).name + '.json')).read_text())
        if (not isinstance(data.get('entries'), dict) or
                any(type(data.get(k)) is not int or data[k] < 0 for k in ('hits', 'misses')) or
                any(not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0
                    for v in data['entries'].values())):
            raise ValueError('invalid stats')
        return data
    except (OSError, ValueError, AttributeError):
        return {'hits': 0, 'misses': 0, 'entries': {}}


def write_stats(cache, data):
    directory = state_dir(cache)
    with tempfile.NamedTemporaryFile(mode='w', dir=directory, delete=False) as f:
        temp = Path(f.name)
        try:
            json.dump(data, f)
            f.flush()
            temp.replace(directory / (Path(cache).name + '.json'))
        finally:
            temp.unlink(missing_ok=True)


def record(cache, names, hit):
    """Record successful reuse/builds; caller holds lease. No historical estimates."""
    data = read_stats(cache)
    names = list(names)
    data['hits' if hit else 'misses'] += len(names)
    now = time.time()
    for name in names:
        data['entries'][Path(name).stem] = now
    # Keep access metadata bounded when render's superseded chunks are removed.
    data['entries'] = {key: value for key, value in data['entries'].items()
                       if any((Path(cache) / (key + ext)).is_file() for ext in ('.mp4', '.wav', '.json'))}
    write_stats(cache, data)


def inventory(cache, kind, stats):
    """Only owned regular entries and abandoned temp directories are deletable."""
    groups, ignored = {}, []
    if not cache.exists():
        return [], ignored
    for path in cache.iterdir():
        if path.is_symlink():
            ignored.append(path.name)
            continue
        temporary = ((kind == 'audio' and path.name.startswith('.audio-')) or
                     (kind == 'review' and path.name.startswith('.review-')) or
                     (kind == 'clips' and path.name.startswith('.clip-')) or
                     (kind == 'chunks' and re.fullmatch(r'\.(tmp|list)-\d+-?.*', path.name)))
        if not ((path.is_file() and PATTERNS[kind].fullmatch(path.name)) or temporary):
            ignored.append(path.name)
            continue
        members = [path] if path.is_file() else list(path.rglob('*'))
        # Never recurse through or delete an unrecognized symlink tree.
        if any(p.is_symlink() for p in members):
            ignored.append(path.name)
            continue
        size = sum(p.stat().st_size for p in members if p.is_file())
        key = path.name if temporary else path.stem
        entry = groups.setdefault(key, {'key': key, 'files': [], 'bytes': 0, 'lastUsed': 0, 'temporary': temporary})
        entry['files'].append(path.name)
        entry['bytes'] += size
        entry['lastUsed'] = max(entry['lastUsed'], stats['entries'].get(key, path.stat().st_mtime))
    return sorted(groups.values(), key=lambda x: (x['lastUsed'], x['key'])), ignored


def remove_entries(cache, entries, stats):
    """Delete a locked inventory selection, retaining lifetime counters."""
    cache = Path(cache)
    for entry in entries:
        for name in entry['files']:
            path = cache / name
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink(missing_ok=True)
        stats['entries'].pop(entry['key'], None)
    write_stats(cache, stats)


def manage(out, kind, prune=False, apply=False, keep_bytes=0, older_days=0):
    if kind not in KINDS or keep_bytes < 0 or not math.isfinite(keep_bytes) or older_days < 0 or not math.isfinite(older_days):
        raise ValueError('cache kind and nonnegative finite limits required')
    if apply and not prune:
        raise ValueError('--apply requires --prune')
    cache = Path(out) / KINDS[kind]
    with lease(cache, blocking=False) as acquired:
        if not acquired:
            return {'kind': kind, 'busy': True, 'message': 'active cache; inspection/cleanup skipped', 'removedBytes': 0}
        stats = read_stats(cache)
        entries, ignored = inventory(cache, kind, stats)
        total = remaining = sum(e['bytes'] for e in entries)
        selected = []
        for entry in entries:
            if prune and remaining > keep_bytes and entry['lastUsed'] <= time.time() - older_days * 86400:
                selected.append(entry)
                remaining -= entry['bytes']
        if apply:
            remove_entries(cache, selected, stats)
        lookups = stats['hits'] + stats['misses']
        return {'kind': kind, 'busy': False, 'bytes': total, 'entries': len(entries),
                'hits': stats['hits'], 'misses': stats['misses'],
                'hitRate': stats['hits'] / lookups if lookups else None,
                'ignored': ignored, 'candidates': selected,
                'reclaimableBytes': total - remaining, 'removedBytes': total - remaining if apply else 0,
                'remainingBytes': remaining if apply else total, 'applied': apply}


def main():
    parser = argparse.ArgumentParser(description='Cache statistics and LRU cleanup; dry-run unless --apply.')
    parser.add_argument('project')
    parser.add_argument('--kind', choices=['all', *KINDS], default='all')
    parser.add_argument('--prune', action='store_true')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--keep-mb', type=float, default=0, help='target MB per selected cache kind; oldest first')
    parser.add_argument('--older-than-days', type=float, default=0, help='only remove entries unused for this many days')
    args = parser.parse_args()
    from mvproject import load_project
    try:
        out = load_project(args.project)['_dir'] / 'out'
        result = [manage(out, kind, args.prune, args.apply, args.keep_mb * 1e6, args.older_than_days)
                  for kind in (KINDS if args.kind == 'all' else [args.kind])]
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
