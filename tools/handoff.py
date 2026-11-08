"""Remix an existing picture and export an editor-friendly per-shot delivery."""
import json
import shutil
import tempfile
from pathlib import Path
from types import SimpleNamespace

import delivery
import soundtrack
import publication
from mvproject import fingerprint


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def remix(cfg, film, output=None, noaudio=False):
    film = Path(film).resolve()
    publication.recover(film)
    source_snapshot = publication.snapshot(film)
    record = json.loads(delivery.receipt_path(film).read_text(encoding='utf-8'))
    if record.get('version') != 1 or not record.get('complete'):
        raise ValueError('remix needs a complete render receipt')
    if fingerprint(film)['sha256'] != record['filmSha256']:
        raise ValueError('film bytes changed: cannot reuse this picture')
    if not record.get('visualRevision') or delivery.revision(cfg, record, film, visual=True) != record['visualRevision']:
        raise ValueError('picture inputs changed or legacy receipt: render video/pilot once before remix')
    output = Path(output).resolve() if output else film
    if output.suffix.lower() != '.mp4':
        raise ValueError('remix output must end in .mp4')
    publication.recover(output)
    expected = publication.snapshot(output)
    before = delivery.revision(cfg, record, output)
    mix = soundtrack.plan(cfg, record, record['from'], record['to'], noaudio)
    mix['fadeOut'] = record.get('soundMix', {}).get('fadeOut', mix['fadeOut'])
    audio_revision = soundtrack.audio_revision(mix)
    info = dict(record, _soundtrack=mix, _visualRevision=record['visualRevision'], _audioRevision=audio_revision)
    def validate():
        unchanged(cfg, info, output, before)
        if publication.snapshot(film) != source_snapshot:
            raise ValueError('source film changed during remix')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.remix-', dir=output.parent) as temp:
        staged = Path(temp) / 'film.mp4'
        same_audio = record.get('audioRevision') == audio_revision
        if same_audio:
            if output != film:
                shutil.copy2(film, staged)
            else:
                staged = None
            print('audio unchanged: skipping mix and mux')
        else:
            soundtrack.mux(['-i', str(film)], staged, mix, cfg['_dir'] / 'out' / '.audio-cache')
        receipt = delivery.build_receipt(output, cfg, info, record['from'], record['frames'],
                                         SimpleNamespace(**record['settings'], noaudio=noaudio), before, [], staged or film)
        publication.publish(output, staged, receipt, expected, validate)
    print(f'remixed {output} · video stream copied; no browser or frame rendering')
    return output


def unchanged(cfg, info, film, before):
    if delivery.revision(cfg, info, film) != before:
        raise ValueError('inputs changed during export; previous output preserved')


def export(cfg, output, video_args, info, start, frames, args, before, errors, expected):
    """Shared normal-render / pilot finalization: stage, verify, then publish."""
    with tempfile.TemporaryDirectory(prefix='.export-', dir=output.parent) as temp:
        staged = Path(temp) / 'film.mp4'
        soundtrack.mux(video_args, staged, info['_soundtrack'], cfg['_dir'] / 'out' / '.audio-cache')
        receipt = delivery.build_receipt(output, cfg, info, start, frames, args, before, errors, staged)
        publication.publish(output, staged, receipt, expected, lambda: unchanged(cfg, info, output, before))
    return receipt


def refresh_subtitles(cfg, film, output=None):
    """Update caption metadata/files only; refuse changes to picture or encoded audio."""
    film = Path(film).resolve()
    publication.recover(film)
    expected = publication.snapshot(film)
    record = json.loads(delivery.receipt_path(film).read_text())
    if record.get('version') != 1 or not record.get('complete') or expected[0]['sha256'] != record['filmSha256']:
        raise ValueError('subtitles needs an unchanged film and complete receipt')
    before = delivery.revision(cfg, record, film)
    if delivery.revision(cfg, record, film, visual=True) != record.get('visualRevision'):
        raise ValueError('picture inputs changed; render before updating subtitles')
    mix = soundtrack.plan(cfg, record, record['from'], record['to'], not record.get('expectedAudio', bool(record['audio'])))
    mix['fadeOut'] = record.get('soundMix', {}).get('fadeOut', mix['fadeOut'])
    if not record.get('audioRevision') or soundtrack.audio_revision(mix) != record['audioRevision']:
        raise ValueError('audio changed or legacy receipt; run remix before updating subtitles')
    key = soundtrack.digest({'film': record['filmSha256'], 'subtitles': mix['subtitles'], 'from': mix['from'], 'to': mix['to']})
    target = Path(output).resolve() if output else cfg['_dir'] / 'out' / 'subtitles' / (film.stem + '-' + key[:12])
    if target.exists():
        raise ValueError(f'subtitle directory already exists (choose another --out): {target}')
    info = dict(record, _soundtrack=mix, _visualRevision=record['visualRevision'], _audioRevision=record['audioRevision'])
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.subtitles-', dir=target.parent) as temp:
        root = Path(temp) / 'subtitles'
        root.mkdir()
        soundtrack.subtitles(mix, root)
        receipt = delivery.build_receipt(film, cfg, info, record['from'], record['frames'],
                                         SimpleNamespace(**record['settings'], noaudio=not mix['tracks']), before, [])
        publication.publish(film, None, receipt, expected, lambda: unchanged(cfg, info, film, before))
        root.rename(target)
    print(f'subtitles updated: {target} · MP4 untouched; no mixing or encoding')
    return target


def shot_ranges(record):
    """Each encoded frame belongs to exactly one clip. Incoming shot owns overlaps.

    Use the renderer's frame-centre clock, retain gaps, and retain transitions as
    composited pixels (the export cannot recover independent scene layers).
    """
    rows = []
    for frame in range(record['frames']):
        t = record['from'] + (frame + 0.5) / record['fps']
        active = [i for i, s in enumerate(record['shots']) if s['from'] <= t < s['to']]
        owner = active[-1] if active else None
        if not rows or rows[-1]['shotIndex'] != owner:
            shot = record['shots'][owner] if owner is not None else {}
            rows.append(dict(shotIndex=owner, name=shot.get('name', 'gap'), scene=shot.get('scene'),
                             startFrame=frame, endFrame=frame+1))
        else:
            rows[-1]['endFrame'] = frame + 1
    for row in rows:
        row.update(fromSeconds=row['startFrame']/record['fps'], toSeconds=row['endFrame']/record['fps'],
                   songFrom=record['from']+row['startFrame']/record['fps'],
                   songTo=record['from']+row['endFrame']/record['fps'])
    return rows


def package(cfg, film, output=None, review_record=None):
    import filmqa
    import syncqa
    import captions
    import clipcache
    import reviewstate
    film = Path(film).resolve()
    record, status, message = delivery.provenance(film, cfg)
    if status != 'pass':
        raise ValueError('package needs a current complete film: ' + message)
    # Caption-only edits can leave the MP4 identical. Version the complete package.
    package_key = soundtrack.digest({'record': record, 'recipes': [fingerprint(Path(p))['sha256'] for p in
                                    (__file__, captions.__file__, filmqa.__file__, syncqa.__file__, clipcache.__file__)]})
    target = Path(output).resolve() if output else cfg['_dir'] / 'out' / 'delivery' / (film.stem + '-' + package_key[:12])
    if target.exists():
        raise ValueError(f'package already exists (choose another --out): {target}')
    checks = [m.inspect(cfg, film) for m in (filmqa, syncqa, captions)]
    if any(r['status'] == 'fail' for r in checks):
        raise ValueError('encoded QA failed; fix the reported film/sync errors before packaging')
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.delivery-', dir=target.parent) as temp:
        root = Path(temp) / 'package'
        root.mkdir()
        (root / 'clips').mkdir()
        mix = record.get('soundMix') or soundtrack.plan(cfg, record, record['from'], record['to'], not record['audio'])
        soundtrack.mixdown(mix, root / 'audio', cfg['_dir'] / 'out' / '.audio-cache')
        subtitles = soundtrack.subtitles(mix, root)
        rows = shot_ranges(record)
        video_revision, clip_counts, clip_work = clipcache.export_many(
            film, rows, record, cfg['_dir'] / 'out' / '.clip-cache', root / 'clips')
        print(f'clip cache: {clip_counts["reused"]}/{len(rows)} clips reused; '
              f'{clip_counts["encoded"]} encoded; {clip_work["decodePasses"]} decode pass(es)')
        shutil.copy2(delivery.receipt_path(film), root / 'render.json')
        for report in checks:
            write_json(root / ('filmcheck.json' if report['kind'] == 'film' else report['kind'] + '.json'), report)
        files = {str(p.relative_to(root)): fingerprint(p) for p in sorted(root.rglob('*')) if p.is_file()}
        review_binding = reviewstate.binding(record, files)
        human_review = None
        if review_record:
            human_review = reviewstate.read(review_record, review_binding, reviewstate.shot_ids(record), record)
            write_json(root/'review-record.json', human_review)
            files['review-record.json'] = fingerprint(root/'review-record.json')
        write_json(root / 'manifest.json', {
            'version': 1, 'packageRevision': package_key, 'sourceFilmSha256': record['filmSha256'], 'fps': record['fps'],
            'videoRevision': video_revision, 'clipCache': clip_counts, 'clipWork': clip_work,
            'width': record['width'], 'height': record['height'], 'frames': record['frames'],
            'songFrom': record['from'], 'songTo': record['to'], 'shots': rows,
            'audio': dict(mix, tracks=[dict(t, stem=f"audio/{t['id']}.wav") for t in mix['tracks']]),
            'subtitles': subtitles, 'qa': {r['kind']: r['status'] for r in checks},
            'reviewBinding': review_binding, 'humanReview': human_review['overall']['status'] if human_review else 'pending',
            'review': 'pending: watch and listen; warnings/unverified checks need human review',
            'files': files,
        })
        (root / 'README.md').write_text(
            '# 逐镜交付包\n\n'
            'film.mp4 是成片原样复制；clips 按 manifest 的帧区间排列，无音轨、无重叠、无漏帧。'
            '逐镜 MP4 为准确切帧经过 H.264 重编码，转场已烘焙到画面，重叠部分归入场镜头。\n\n'
            'audio/*.wav 为 48 kHz stereo float PCM，每条与整段成片等长，从编辑时间线 0 秒对齐；'
            '已含单轨音量/淡入淡出。mix.wav 为混音参考，不要与独立音轨重复叠加。'
            '独立轨求和后再施加片头 20 ms / manifest.audio.fadeOut 秒片尾淡化与 0.98 峰值限制即为混音。\n\n'
            'SRT/VTT 均相对成片 0 秒；manifest 中 cue 的 at/trimStart 和 songFrom/To 为原歌曲时间。'
            '字幕只导出文件，不额外烧入画面。原画面已有文字仍在。\n\n'
            'filmcheck.json / sync.json / subtitles.json 为成片、音画和字幕 QA。warn/unverified 不代表通过人工验收；'
            '请播放检查旁白清晰度、音量平衡、转场和字幕。\n', encoding='utf-8')
        manifest = json.loads((root/'manifest.json').read_text())
        manifest['files']['README.md'] = fingerprint(root/'README.md')
        if human_review:
            manifest['review'] = 'human review: ' + human_review['overall']['status']
        write_json(root/'manifest.json', manifest)
        # Do not publish partial packages after an interrupted encode or source edit.
        latest, status, message = delivery.provenance(film, cfg)
        if status != 'pass' or latest != record:
            raise ValueError('inputs changed while packaging: ' + message)
        root.rename(target)
    print(f'packaged {target} · {len(rows)} clips, {len(mix["tracks"])} audio stems, {len(subtitles)} subtitles')
    return target
