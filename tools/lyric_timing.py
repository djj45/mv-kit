#!/usr/bin/env python3
"""Lyric timing without the lyric text: data/timing.json, safe to commit, and the way back.

The lyric files of a project (lyrics.txt, data/lyrics*.json, the calibration in data/lyrics_fix.json) carry the
song's text, so .gitignore keeps them on your machine. That also keeps your calibration out of git. timing.json
holds everything the timing needs except the text: per line the sha256 of its text, its character count and its
times; per word / character its times and flags; the calibration fixes by line and word number; the fingerprint
of the song the times belong to.

    uv run tools/lyric_timing.py export projects/my-song
        data/lyrics.json (+ data/lyrics_fix.json) -> data/timing.json. align_lyrics.py does this after every
        alignment (so the lyric tuner's saves land in it too); run it by hand for older projects.

    uv run tools/lyric_timing.py merge projects/my-song [--force]
        lyrics.txt + data/timing.json -> data/lyrics.json/.js and data/lyrics_fix.json, exactly as they were
        exported (after a fresh clone, or when the local files are lost). Every line of lyrics.txt is checked
        against its sha256: if a line is missing or its text differs, merge lists those lines and writes nothing.
        Existing local files that differ are only replaced with --force.
"""
import argparse
import hashlib
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'analysis'))
from mvproject import KIT, load_project, write_data  # noqa: E402

WORD_KEYS = ('w', 'start', 'end', 'conf', 'join', 'syl', 'fixed')   # align_lyrics.py's word fields, in its order
FIX_KEYS = ('start', 'end', 'syl')                                    # what a fix sets (align_lyrics.apply_fixes)
ABOUT = ('Lyric timing without the lyric text (mv-kit). Rebuild data/lyrics.json and data/lyrics_fix.json from your '
         'own lyrics.txt with: uv run tools/lyric_timing.py merge <project>')


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def rel(p):
    p = Path(p)
    return p.relative_to(KIT) if p.is_relative_to(KIT) else p


def dump(doc):
    """One JSON line per lyric line and per fix: small diffs when a few words move."""
    head = {k: v for k, v in doc.items() if k not in ('lines', 'fixes')}
    out = ['{'] + [f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},' for k, v in head.items()]
    for key in ('lines', 'fixes'):
        rows = [' ' + json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in doc[key]]
        out.append(f' "{key}": [\n' + ',\n'.join(rows) + ('\n ]' if rows else ']') + (',' if key == 'lines' else ''))
    return '\n'.join(out) + '\n}\n'


def song(cfg):
    a = cfg['_dir'] / 'data' / 'audio.json'
    if not a.exists():
        return None
    d = json.loads(a.read_text(encoding='utf-8'))
    return {k: d[k] for k in ('sha256', 'duration') if k in d} or None


# ---------------------------------------------------------------- export
def export(cfg, quiet=False):
    import tune_lyrics as TL                     # the fix resolution rules (same as align_lyrics.apply_fixes)
    import align_lyrics as AL
    d = cfg['_dir']
    lf = d / 'data' / 'lyrics.json'
    if not lf.exists():
        raise SystemExit(f'{rel(lf)} not found: run analysis/align_lyrics.py first')
    lines = json.loads(lf.read_text(encoding='utf-8'))['lines']
    doc = {'about': ABOUT, 'version': 1}
    if song(cfg):
        doc['song'] = song(cfg)
    doc['lines'] = [{'sha256': sha(l['text']), 'chars': len(l['text']), 'start': l['start'], 'end': l['end'],
                     'words': [{k: w[k] for k in WORD_KEYS if k in w and k not in ('w', 'join')} for w in l['words']]}
                    for l in lines]   # w and join come back from the text
    fixes, skipped = [], 0
    ff = d / 'data' / 'lyrics_fix.json'
    for fx in (json.loads(ff.read_text(encoding='utf-8')) if ff.exists() else []):
        at = TL.resolve(fx, lines, AL)
        if at is None:          # align_lyrics.py cannot apply it either
            skipped += 1
            continue
        fixes.append({'line': at[0], 'word': at[1], **{k: fx[k] for k in FIX_KEYS if k in fx}})
    doc['fixes'] = fixes
    out = d / 'data' / 'timing.json'
    out.write_text(dump(doc), encoding='utf-8')
    if not quiet:
        print(f'{len(lines)} lines, {sum(len(l["words"]) for l in lines)} words, {len(fixes)} fixes -> {rel(out)}'
              + (f'  ({skipped} fixes that match no line or word left out)' if skipped else ''))
    return out


# ---------------------------------------------------------------- merge
def merge(cfg, force=False):
    import align_lyrics as AL
    d = cfg['_dir']
    tf, lf = d / 'data' / 'timing.json', d / 'lyrics.txt'
    if not tf.exists():
        raise SystemExit(f'{rel(tf)} not found')
    if not lf.exists():
        raise SystemExit(f'{rel(lf)} not found: write the lyrics there first (one sung line per line)')
    doc = json.loads(tf.read_text(encoding='utf-8'))
    mine = AL.read_lyrics(lf)
    want = [l['sha256'] for l in doc['lines']]
    have = [sha(l['text']) for l in mine]
    pair, problems = {}, []
    for op, i1, i2, j1, j2 in SequenceMatcher(None, want, have, autojunk=False).get_opcodes():
        if op == 'equal':
            pair.update(zip(range(i1, i2), range(j1, j2)))
            continue
        for k, i in enumerate(range(i1, i2)):
            tl = doc['lines'][i]
            head = f'  line {i:3d} ({tl["start"]:7.2f} s, {tl["chars"]} characters): '
            problems.append(head + (f'yours has other text: "{mine[j1 + k]["text"]}"' if j1 + k < j2 else 'not in your lyrics.txt'))
        for j in range(j1 + (i2 - i1), j2):
            problems.append(f'  your line "{mine[j]["text"]}" is not in timing.json')
    for i, j in pair.items():
        if len(mine[j]['words']) != len(doc['lines'][i]['words']):
            problems.append(f'  line {i:3d}: same text but split into {len(mine[j]["words"])} words, timing has '
                            f'{len(doc["lines"][i]["words"])} (another align_lyrics.py version?)')
    if problems:
        print(f'{rel(lf)} does not match the lines {rel(tf)} was made from; nothing written:', *problems, sep='\n')
        sys.exit(1)

    lines = []
    for i, tl in enumerate(doc['lines']):
        ml = mine[pair[i]]
        words = []
        for mw, tw in zip(ml['words'], tl['words']):
            w = {**tw, 'w': mw['w'], **({'join': True} if mw.get('join') else {})}
            words.append({k: w[k] for k in WORD_KEYS if k in w})
        lines.append({'text': ml['text'], 'start': tl['start'], 'end': tl['end'], 'words': words})
    lyr = {'version': 1, 'lines': lines}
    fixes = [{**fx, 'at': f"{lines[fx['line']]['words'][fx['word']]['w']} · {lines[fx['line']]['text']}"} for fx in doc['fixes']]

    s, here = song(cfg), doc.get('song')
    if s and here and s.get('sha256') and here.get('sha256') and s['sha256'] != here['sha256']:
        print('warning: timing.json was made for another analysis of the song (audio.json sha256 differs)')

    targets = [(d / 'data' / 'lyrics.json', lyr)] + ([(d / 'data' / 'lyrics_fix.json', fixes)] if fixes else [])
    differ = [p for p, obj in targets if p.exists() and json.loads(p.read_text(encoding='utf-8')) != obj]
    if differ and not force:
        print('these local files differ from timing.json and were left as they are (--force replaces them):',
              *[f'  {rel(p)}' for p in differ], sep='\n')
        sys.exit(1)
    for p, obj in targets:
        if p.exists() and p not in differ:
            print(f'{rel(p)}: up to date')
        elif p.name == 'lyrics.json':
            write_data(cfg, 'lyrics', obj)
            print(f'{len(lines)} lines -> {rel(p)} + lyrics.js')
        else:
            p.write_text('[\n' + ',\n'.join(' ' + json.dumps(f, ensure_ascii=False) for f in obj) + '\n]\n', encoding='utf-8')
            print(f'{len(obj)} fixes -> {rel(p)}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('command', choices=['export', 'merge'])
    ap.add_argument('project')
    ap.add_argument('--force', action='store_true', help='merge: replace local files that differ')
    a = ap.parse_args()
    cfg = load_project(a.project)
    export(cfg) if a.command == 'export' else merge(cfg, a.force)


if __name__ == '__main__':
    main()
