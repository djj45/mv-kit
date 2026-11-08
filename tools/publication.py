"""Recoverable publication of an MP4 and its receipt (POSIX local filesystems).

Two path replacements cannot be one filesystem transaction. A lock serializes
writers; a rollback journal recovers process interruption, and receipt readers
recover before checking hashes. External players may briefly see the new MP4.
"""
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import shutil
import tempfile

from mvproject import fingerprint


def receipt_path(film):
    return Path(str(film) + '.render.json')


def journal_path(film):
    return film.with_name('.' + film.name + '.publish')


@contextmanager
def locked(film):
    film.parent.mkdir(parents=True, exist_ok=True)
    with film.with_name('.' + film.name + '.lock').open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def _recover(film):
    journal = journal_path(film)
    if not journal.exists():
        return
    state = json.loads((journal / 'state.json').read_text())
    for name, target in [('film', film), ('receipt', receipt_path(film))]:
        if name not in state:
            continue
        if state[name]:
            # Retain backups until both replacements finish: recovery is repeatable.
            staged = journal / (name + '.restore')
            shutil.copy2(journal / name, staged)
            os.replace(staged, target)
        else:
            target.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory(prefix='.recovered-', dir=film.parent) as temp:
        journal.rename(Path(temp) / 'retired')


def recover(film):
    film = Path(film).resolve()
    if not journal_path(film).exists():
        return
    with locked(film):
        _recover(film)


def snapshot(film):
    return [fingerprint(p) if p.exists() else None for p in (Path(film), receipt_path(film))]


def publish(film, staged, record, expected, validate):
    """Validate before modifying output; roll back failed or interrupted commits.

    staged=None publishes metadata only, leaving MP4 bytes and mtime untouched.
    validate rechecks input hashes immediately before committing.
    """
    film = Path(film).resolve()
    if not record['complete']:
        raise ValueError('incomplete output will not be published: ' + '; '.join(record['errors']))
    with locked(film):
        _recover(film)
        if snapshot(film) != expected:
            raise ValueError('output changed in another process; previous output preserved')
        validate()
        media = Path(staged) if staged is not None else film
        if fingerprint(media)['sha256'] != record['filmSha256']:
            raise ValueError('staged media differs from its receipt')
        with tempfile.TemporaryDirectory(prefix='.publish-', dir=film.parent) as folder:
            folder = Path(folder)
            ready = folder / 'ready'
            ready.mkdir()
            targets = {'receipt': receipt_path(film)}
            if staged is not None:
                targets['film'] = film
            state = {k: v.exists() for k, v in targets.items()}
            for name, target in targets.items():
                if state[name]:
                    shutil.copy2(target, ready / name)
            (ready / 'state.json').write_text(json.dumps(state))
            new_receipt = folder / 'new.json'
            new_receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
            validate()
            # Fully prepared journal is made visible before either public path changes.
            ready.rename(journal_path(film))
            try:
                if staged is not None:
                    os.replace(staged, film)
                os.replace(new_receipt, receipt_path(film))
            except BaseException:
                _recover(film)
                raise
            journal_path(film).rename(folder / 'committed')
