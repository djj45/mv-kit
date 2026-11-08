"""Portable, offline review of the actual encoded mix, cached stems and export captions."""
import json
import shutil
import tempfile
from pathlib import Path

import captions
import delivery
import filmqa
import soundtrack
import syncqa
import reviewstate
import reviewcache
import shotidentity
from mvproject import fingerprint


def build(cfg, film, output=None):
    film = Path(film).resolve()
    record, trust, message = delivery.provenance(film, cfg)
    if trust != 'pass':
        raise ValueError('review needs a current complete film: ' + message)
    template = Path(__file__).with_suffix('.html')
    key = soundtrack.digest({'record': record, 'policy': cfg.get('subtitleQa'),
                             'tools': [fingerprint(p)['sha256'] for p in
                                       (Path(__file__), template, Path(__file__).with_name('review-notes.js'), Path(reviewstate.__file__), Path(reviewcache.__file__), Path(shotidentity.__file__), Path(captions.__file__), Path(filmqa.__file__), Path(syncqa.__file__))]})
    target = Path(output).resolve() if output else cfg['_dir'] / 'out' / 'review' / (film.stem + '-' + key[:12])
    if target.exists():
        raise ValueError(f'review already exists (choose another --out): {target}')
    reports = [filmqa.inspect(cfg, film), syncqa.inspect(cfg, film), captions.inspect(cfg, film)]
    # Failed creative/encoded QA must remain reviewable; stale source provenance must not.
    mix = record.get('soundMix') or soundtrack.plan(cfg, record, record['from'], record['to'], not record['audio'])
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.review-', dir=target.parent) as temp:
        root = Path(temp) / 'review'
        root.mkdir()
        shutil.copy2(film, root / 'film.mp4')
        if fingerprint(root / 'film.mp4')['sha256'] != record['filmSha256']:
            raise ValueError('film changed while copying review media')
        soundtrack.mixdown(mix, root / 'audio', cfg['_dir'] / 'out' / '.audio-cache')
        cues = soundtrack.subtitles(mix, root)
        files = {str(p.relative_to(root)): fingerprint(p) for p in root.rglob('*') if p.is_file()}
        review_binding = reviewstate.binding(record, files)
        shutil.copy2(Path(__file__).with_name('review-notes.js'), root/'review-notes.js')
        picture_cache = {}
        comparison = reviewstate.snapshot(record, files, root/'film.mp4', cues, cfg.get('title',film.stem),
                                          cfg['_dir']/'out'/'.review-cache', picture_cache)
        data = dict(comparison=comparison, pictureCache=picture_cache, reviewBinding=review_binding, title=cfg.get('title', film.stem), revision=key[:12],
                    origin=record['from'], duration=record['to']-record['from'], fps=record['fps'],
                    width=record['width'], height=record['height'], cues=cues,
                    tracks=[dict(id=t['id'], role=t['role'], file=f'audio/{t["id"]}.wav') for t in mix['tracks']],
                    reports=reports, shots=record['shots'])
        # Embedded data works on file:// without fetch/CORS. No project text is HTML.
        payload = json.dumps(data, ensure_ascii=False, allow_nan=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
        (root / 'index.html').write_text(template.read_text(encoding='utf-8').replace('/*REVIEW_DATA*/', payload), encoding='utf-8')
        for report in reports:
            (root / (report['kind'] + '.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (root / 'review.json').write_text(json.dumps(dict(data, filmSha256=record['filmSha256'], review='pending'), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        latest, status, message = delivery.provenance(film, cfg)
        if status != 'pass' or latest != record:
            raise ValueError('inputs changed while preparing review: ' + message)
        root.rename(target)
    print(f'review: {target / "index.html"} · offline snapshot; human review pending')
    return target / 'index.html'
