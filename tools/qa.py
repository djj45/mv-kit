"""render.py qa — measure the problems a viewer sees and a contact sheet hides.

Every number comes from rendering the real frames (engine/qa.js does the measuring inside the page):

  lyric-hidden   a word, at the moment it is sung, shows less than half of its glyphs on screen: covered by
                 something drawn after it, clipped by a mask, pushed out of the frame by the camera, or the same
                 colour as what is behind it. (vis = share of the word's own glyph pixels where the frame with the
                 lyrics differs from the frame without them.)
  lyric-faint    the same, between half and qa.vis (default 0.8) of the word shows
  lyric-missing  a sung word is not drawn as text anywhere in the frame (or is drawn some way qa cannot see,
                 e.g. rasterised into an offscreen canvas first: then this is only a note)
  lyric-edge     a sung word's ink comes closer than qa.margin (default 96 px) to the frame edge
  lyric-covered  a word sung earlier in the shot is still drawn, but something now covers it (less than half shows):
                 an object moved over it, or a punch-in pushed the picture under a screen-layer lyric (looked at on
                 the shot's first frame and at 15 / 50 / 85 % of it)
  lyric-touch    a sung word touches something of its own colour: more than qa.touch (7 %) of the thin ring around its
                 letters (0.06 em) is that colour in the frame without lyrics — a line through it, letters standing on
                 an axis or a plate's border, a door edge the camera pushed under a screen-layer lyric. Reads as struck
                 through or glued on. Also: drawing of ANY colour running into a word (a grey post or a green chart line through it, rays, dots,
                 a hand over it) — lines that stand out from the ground touching more than qa.cross (0.6 em) of the
                 letters' outline in all. A single line straight through a word touches about two line widths per letter.
                 Every touch finding (lyric-touch, text-touch) also says WHERE, so it can be fixed without opening the crop:
                 which side of the letters the contact is on, how far along it spans, its colour, its box in px, and the
                 nearest MV.focus
  text-touch     the same for any other text 24 px and up (a stamp, a title, a big number, a word of the lyric used as
                 decoration), read from the frame itself with the colour it was painted in: a black stamp over a black
                 drawing. Threshold qa.touchText (20 %): a needle over a dial number, a prohibition slash over its
                 symbol show up here too — keep those on purpose, with a line in TREATMENT. Drawing of another colour
                 running into it: qa.crossText (0.8 em)
  lyric-cover    the lyrics hide the picture: the footprint of the lyrics — their glyphs and any bar, plate or block
                 drawn behind them on the screen layer or inside MV.lyric — against the bare picture (no lyrics). Reported
                 when it hides more than qa.cover (8 %) of the picture's detail (its edges) AND sits where the picture
                 is at least 1.5× as busy as average (on the drawing, not in its empty space); or hides 25 % or more;
                 or sits on the shot's subject (last MV.focus) with picture under it. Looked at on the shot's first
                 frame and at 15 / 50 / 85 %
  lyric-carryover  a shot draws (restyled, in its own layout) a line that was already sung before the shot began:
                 the previous shot's last line shows up again for the first frames of the next one. A line may cross
                 a cut only while it is still being sung (it has words after the cut); otherwise the new shot shows
                 nothing until its own line starts
  lyric-handover during a transition (dissolve, zoom, reflow) the outgoing shot draws the incoming shot's line — one
                 that starts after the cut — in its own layout: the line shows twice, one copy fading out. f.lyrics.lineAt
                 leaves those lines out (f.until = where the next shot takes over)
  lyric-overlap  two different lyric texts drawn on top of each other (more than 20 % of the smaller one, centres apart):
                 usually two lines, or the same line twice in two layouts, in one place. Not reported: an outline or a
                 drop shadow (centres together), one word doubled, a sung word drawn over its own ghost line (karaoke)
  box-cross      a box's own text (drawn in the same MV.group as the box: a table and its cells, a title block and
                 its rows) pokes out of it, or sits outside all of its group's boxes (fell out of the table)
  box-tight      a box's own text sits inside with less room than the box asks for (default: 40 % of the text's
                 ink height, at least 3 px) on some side
  box-clash      some OTHER text and a box get in each other's way: the box's edge cuts through it, or it sits on the
                 box's own text (a leader's label on a title block, values placed by hand across a table's lines, a
                 lyric printed across the edge of a sign plate). Text resting wholly inside someone else's box is left
                 alone. If a text belongs in a box, draw it inside the box's MV.group so it is checked strictly
                 (box-cross / box-tight); that goes for a lyric printed on a plate too
  text-cut       a text (a label, a table value, a lyric still up) placed inside the scene's frame (≥ qa.margin from
                 its edge) is just clipped by the frame edge (5–50 % cut off) because the camera's push / insert /
                 shake carried it over, and the camera holds there: reads as a mistake (a crop while the camera is
                 still moving is passing, and left alone). Keep it whole (MV.keep), move it in, or push in far
                 enough that it leaves the picture. Text the scene itself put at the edge (border numbers) is left alone
  focus-out      the frame's subject is outside the frame or within 3 % of it: the last MV.focus point each shot reports
                 in the frame (the one kits/camera.js follows; earlier points may leave the frame in a punch-in)
  static         a shot whose picture (lyrics left out) barely changes from start to end, or stands still for more
                 than half of it (≥ 1.5 s): no camera move, no action. Every shot should keep moving, even if only a
                 slow push-in (kits/camera.js does one by default)
  one-speed      a shot of 2.5 s or more whose picture (lyrics left out) moves at about one speed all the way: its
                 fastest moment is less than 3× its slowest tenth (or less than 2 % of the picture apart). Nothing
                 stands out and nothing holds: only a drift, or one constant rush. Fast actions, held meanings: let
                 something happen (a hit, a turn, an arrival) against a calmer stretch, or cut the shot shorter.
                 Sampled every 1/6 s, from the end of the cut-in (fadeIn, at least 0.35 s) to 0.2 s before the end
  read-unled     a read (timeline reads, with a focus name) starts while the shot's subject (its last MV.focus) is
                 something else: the eye is not where the read is. Report the read's object as the subject by then
  type-flat      the lyrics are all about the same size (largest / smallest < qa.typeRange, default 2.5)
  type-band      most lyrics sit in the same horizontal band, like subtitles (> 70 % in one third of the frame)
                 (both judged only when qa runs over the whole film: a --from / --to stretch prints the numbers only)

Text drawn through MV.overlay (the screen layer, after the camera) is measured in output px as drawn, also in frames
a post filter remapped (warp), where the scene canvas itself cannot be measured.

Errors (scene-error, lyric-hidden, box-cross, focus-out) make the command exit with status 1; the rest are warnings.
project.qa tunes it: { "margin": 96, "vis": 0.8, "motion": 0.02, "typeRange": 2.5, "off": ["lyric-edge", ...] }.
Output: a summary here, out/qa/report.md, out/qa/qa.json, and for each finding a crop of the frame with the
problem outlined (red: the text or point, yellow: the box it should sit in) in out/qa/. Open the crops.
"""
import io
import json
import math
import shutil
import sys
import time
from collections import defaultdict
from pathlib import Path

SEV = {'scene-error': 'error', 'lyric-hidden': 'error', 'box-cross': 'error', 'focus-out': 'error',
       'lyric-faint': 'warn', 'lyric-missing': 'warn', 'lyric-edge': 'warn', 'lyric-carryover': 'warn', 'lyric-handover': 'warn', 'lyric-overlap': 'warn',
       'lyric-covered': 'warn', 'lyric-cover': 'warn', 'lyric-touch': 'warn', 'text-touch': 'warn', 'text-cut': 'warn',
       'box-tight': 'warn', 'box-clash': 'warn',
       'static': 'warn', 'one-speed': 'warn', 'read-unled': 'warn', 'type-flat': 'warn', 'type-band': 'warn'}


def run(pg, info, a, cfg, out_dir):
    page = pg.page
    qc = cfg.get('qa') or {}
    off = set(qc.get('off') or [])
    margin = qc.get('margin', 96)
    vis_ok = qc.get('vis', 0.8)
    motion_min = qc.get('motion', 0.02)
    freeze = qc.get('freeze', 0.005)
    touch_max = qc.get('touch', 0.07)
    touch_text = qc.get('touchText', 0.2)
    cross_max = qc.get('cross', 0.6)
    cross_text = qc.get('crossText', 0.8)
    cover_max = qc.get('cover', 0.08)
    type_range = qc.get('typeRange', 2.5)
    fps = info['fps']
    W, H = info['width'], info['height']
    t0 = info['from'] if a.t0 is None else a.t0
    t1 = info['to'] if a.t1 is None else a.t1
    shots = info['shots']
    for i, s in enumerate(shots):
        s['i'] = i
    words = page.evaluate('MV_QA.words()')
    line_last, line_words, line_span = {}, defaultdict(list), {}   # line index -> start of its last word / its words / (start, end)
    for w in words:
        line_last[w['line']] = max(line_last.get(w['line'], -1e9), w['start'])
        line_words[w['line']].append(w['w'])
        a_, b_ = line_span.get(w['line'], (w['start'], w['lineEnd']))
        line_span[w['line']] = (min(a_, w['start']), max(b_, w['lineEnd']))

    def short_lyric(s, t):
        """a one-letter lyric word ('a', 'I') drawn on its own: qa.js does not count it as a lyric, overlap still should"""
        n = _norm(s)
        return len(n) == 1 and any(a_ - 1.5 <= t <= b_ + 3 and n in (_norm(x) for x in line_words[l]) for l, (a_, b_) in line_span.items())
    whole = t0 <= info['from'] + 0.5 and t1 >= info['to'] - 0.5
    started = time.time()

    def shot_name(i):
        return shots[i]['name'] if 0 <= i < len(shots) else '?'

    # ------------------------------------------------------------ when to look
    probes = defaultdict(list)                       # t -> [word index]
    for w in words:
        if not (t0 <= w['start'] < t1):
            continue
        nxt = w['next'] if w['next'] is not None else max(w['end'], w['start'] + 0.5)
        dt = max(1.0 / fps, min(0.3, 0.5 * (nxt - w['start'])))
        # a line's last word is looked at while still in the shot it was sung in: a cut right after it must not move
        # the look into the next shot (where that line is, rightly, no longer drawn)
        home = [s for s in shots if s['from'] <= w['start'] < s['to']]
        if home and w['next'] is None:
            last_frame = math.ceil(home[-1]['to'] * fps - 1e-6) / fps - 1.0 / fps
            dt = max(1.0 / fps, min(dt, last_frame - w['start']))
        t = round((w['start'] + dt) * fps) / fps
        if t < w['start']:
            t += 1.0 / fps
        if t >= t1:
            continue                                  # sung after the end of the film / of the range
        probes[t].append(w['i'])
    sung_at = {t: set(v) for t, v in probes.items()}  # the looks at the moment a word is sung
    shot_looks = set()                                # the looks per shot (first frame, 15 / 50 / 85 %)
    by_line = defaultdict(list)
    for w in words:
        by_line[w['line']].append(w)
    starts = sorted((min(x['start'] for x in ws), l) for l, ws in by_line.items())
    for s in shots:                                   # the first frame (what crosses the cut) + three looks per shot
        if s['to'] <= t0 or s['from'] >= t1:
            continue
        d = s['to'] - s['from']
        first = math.ceil(s['from'] * fps - 1e-6) / fps
        for t in [first] + [round((s['from'] + k * d) * fps) / fps for k in (0.15, 0.5, 0.85)]:
            if t0 <= t < t1 and s['from'] <= t < s['to']:
                probes.setdefault(t, [])
                shot_looks.add(t)
                # and the words of this shot's line that were sung a while ago: still up, still readable? (an object
                # moving over them, a punch-in pushing the world under a screen-layer lyric)
                cur = [l for st, l in starts if st <= t]
                if cur and line_last[cur[-1]] >= s['from'] - 1e-6:
                    for w in by_line[cur[-1]]:
                        if w['start'] <= t - 0.3 and w['i'] not in probes[t]:
                            probes[t].append(w['i'])
    times = sorted(probes)
    print(f"qa: {len(times)} frames to look at ({sum(len(v) for v in probes.values())} sung words, {len(shots)} shots)…")

    findings = []

    def add(kind, t, shot, msg, box=None, frame_box=None, key=None, value=None):
        if kind in off:
            return
        findings.append({'kind': kind, 'sev': SEV[kind], 't': round(t, 3), 'shot': shot, 'msg': msg,
                         'box': box, 'frame_box': frame_box, 'key': key or (kind, shot, msg), 'value': value})

    results = []
    type_px, type_y = [], []
    skipped = missing = checked = unverified = 0
    for n, t in enumerate(times):
        r = page.evaluate('([t, ids, o]) => MV_QA.probe(t, ids, o)', [t, probes[t], {'touch': t in shot_looks}])
        results.append(r)
        if r.get('err'):
            add('scene-error', t, shot_name(r['shots'][-1] if r['shots'] else -1), f"scene error: {r['err'][:160]}",
                key=('scene-error', r['err'][:60]))
        top = r['shots'][-1] if r['shots'] else -1
        sh = shot_name(top)
        # --- words
        for wr in r['words']:
            w = words[wr['i']]
            if r['solo'] and wr['status'] == 'ok' and wr['vis'] >= 0.5 and (wr.get('touch') or 0) >= touch_max:
                add('lyric-touch', t, sh, f"\"{w['w']}\" touches something of its own colour: {round(wr['touch'] * 100)} % of the thin ring around its "
                    f"letters is that colour (a line through it, letters standing on an axis or a border, a shape behind): it reads as struck "
                    f"through or glued on. Give it clear space (≈ 0.06 em all round), or break the line around the word"
                    + _where((wr.get('geo') or {}).get('sameGeo'), r['focus'], 'word'),
                    box=wr['box'], key=('lyric-touch', sh, w['line']), value=-wr['touch'])
            elif r['solo'] and wr['status'] == 'ok' and wr['vis'] >= 0.5 and (wr.get('cross') or 0) >= cross_max:
                add('lyric-touch', t, sh, f"\"{w['w']}\" has drawing running into it: lines or shapes that stand out from the ground touch "
                    f"{wr['cross']:.1f} em of its letters' outline (a post or a chart line through the word, rays, dots, a hand over it): it "
                    f"reads as struck through or caged. Move the word into clear space (≈ 0.06 em all round), move the drawing, or stop it "
                    f"short of the word" + _where((wr.get('geo') or {}).get('crossGeo'), r['focus'], 'word'),
                    box=wr['box'], key=('lyric-touch', sh, w['line']), value=-wr['cross'])
            if wr['i'] not in sung_at.get(t, ()):
                # a later look at a word sung earlier in this shot: only "drawn but covered" counts (a line may leave)
                if r['solo'] and wr['status'] == 'ok' and wr['vis'] < 0.5 and wr['off'] < 0.15:
                    add('lyric-covered', t, sh, f"\"{w['w']}\" (sung at {w['start']:.2f}) is still drawn at {t:.2f} but only {round(wr['vis'] * 100)} % of it "
                        f"shows: something moved over it, or the camera pushed the picture under it (a screen-layer lyric over a "
                        f"punch-in: give it a band, or keep the subject away from it)", box=wr['box'], key=('lyric-covered', sh, w['line']), value=wr['vis'])
                continue
            if wr['status'] == 'skip':
                skipped += 1
                continue
            if not r['solo']:
                continue                               # mid-transition: half-visible on purpose
            if wr['status'] == 'offscreen':
                unverified += 1                        # drawn into a layer (dots, masks, WebGL): qa cannot see the glyphs
                continue
            if wr['status'] == 'missing':
                missing += 1
                add('lyric-missing', t, sh, f"\"{w['w']}\" is sung but not found as text on screen (not drawn yet? drawn letter by letter? look at the frame)",
                    key=('lyric-missing', sh, w['i']))
                continue
            checked += 1
            vis, offf, box = wr['vis'], wr['off'], wr['box']
            why = f"{round(offf * 100)} % of it is outside the frame" if offf > 0.15 else 'covered, clipped or the same colour as behind it'
            if vis < 0.5:
                add('lyric-hidden', t, sh, f"\"{w['w']}\" shows {round(vis * 100)} % of its glyphs while sung: {why}", box=box,
                    key=('lyric-hidden', sh, w['i']), value=vis)
            elif vis < vis_ok:
                add('lyric-faint', t, sh, f"\"{w['w']}\" shows {round(vis * 100)} % of its glyphs while sung: {why}", box=box,
                    key=('lyric-faint', sh, w['i']), value=vis)
            if vis >= 0.5 and offf < 0.15:
                gap = min(box[0], box[1], W - box[2], H - box[3])
                if gap < margin:
                    add('lyric-edge', t, sh, f"\"{w['w']}\" is {max(0, round(gap))} px from the frame edge (keep {margin})", box=box,
                        key=('lyric-edge', sh, w['i']), value=gap)
                type_px.append(wr['px'])
                type_y.append(((box[1] + box[3]) / 2) / H)
        # --- lyrics as a whole: a line carried into a shot after it was sung; two lyrics drawn on top of each other
        lyr = [x for x in r['texts'] if x['lyric'] and x['alpha'] >= 0.05]
        if not r['solo'] and 0 <= top < len(shots):
            # a transition: the outgoing shot must not draw the incoming shot's line (a line that starts after the cut)
            F = shots[top]['from']
            for tx in lyr:
                ls = tx.get('lines') or []
                if tx['entry'] == top or tx['entry'] not in r['shots'] or not ls or len(_norm(tx['s'])) < 3:
                    continue
                if all(line_span[l][0] >= F - 1e-3 for l in ls if l in line_span):
                    l = min(ls)
                    text = ' '.join(line_words[l])
                    add('lyric-handover', t, shot_name(tx['entry']), f"\"{tx['s'][:40]}\": during the transition into {shot_name(top)} "
                        f"(from {F:.2f} s) the outgoing shot still draws the incoming shot's line (\"{text[:48]}\", starts at "
                        f"{line_span[l][0]:.2f} s) in its own layout, so it shows twice. Let the next shot have it: take the line from "
                        f"f.lyrics.lineAt(f.t, f.from) — it leaves out lines that start after f.until, where the next shot takes over",
                        box=tx['box'], key=('lyric-handover', tx['entry'], l), value=t - F)
        if r['solo'] and 0 <= top < len(shots):
            F = shots[top]['from']
            for tx in lyr:
                ls = tx.get('lines') or []
                if tx['entry'] != top or not ls or len(_norm(tx['s'])) < 3:
                    continue
                if all(line_last.get(l, 1e9) < F - 1e-3 for l in ls):
                    l = max(ls)
                    text = ' '.join(line_words[l])
                    add('lyric-carryover', t, sh, f"\"{tx['s'][:40]}\": its line (\"{text[:48]}\") was all sung before this shot began "
                        f"(last word at {line_last[l]:.2f} s, cut at {F:.2f} s) and is drawn again here. Carry a line across a cut only "
                        f"while it still has words to sing; otherwise show nothing until this shot's own line starts. (If this text is "
                        f"part of the picture — a song word on a prop, in a pattern — draw it inside MV.decor(() => …): then it is no lyric)",
                        box=tx['box'], key=('lyric-carryover', sh, l), value=t - F)
            ov = lyr + [x for x in r['texts'] if not x['lyric'] and not x.get('decor') and x['alpha'] >= 0.05 and short_lyric(x['s'], t)]
            for i in range(len(ov)):
                for j in range(i + 1, len(ov)):
                    a_, b_ = ov[i], ov[j]
                    if _overlap(a_['box'], b_['box']) <= 0:
                        continue
                    aa, ab = _area(a_['q']), _area(b_['q'])
                    inter = _inter_area(a_['q'], b_['q'])
                    small = min(aa, ab)
                    if small <= 0 or inter < 0.2 * small:
                        continue
                    ha, hb = _height(a_['q']), _height(b_['q'])
                    ca, cb = _centre(a_['q']), _centre(b_['q'])
                    if math.dist(ca, cb) < 0.3 * min(ha, hb):
                        continue                       # the same text twice in place: an outline, a drop shadow
                    na, nb = _norm(a_['s']), _norm(b_['s'])
                    if na == nb:
                        continue                       # one word echoed / doubled on purpose (a stutter, a misprint effect)
                    if (nb in na and inter >= 0.8 * ab) or (na in nb and inter >= 0.8 * aa):
                        continue                       # a sung word drawn over its own line (karaoke: ghost line + ink words)
                    add('lyric-overlap', t, sh, f"\"{a_['s'][:30]}\" and \"{b_['s'][:30]}\" are drawn on top of each other "
                        f"({round(100 * inter / small)} % of the smaller one). If one of them is part of the picture (a song word on a prop, "
                        f"in a pattern), draw it inside MV.decor(() => …): then it is no lyric", box=_union([a_['box'], b_['box']]),
                        key=('lyric-overlap', sh), value=-inter / small)
        # --- how much of the picture the lyrics (and the bars / plates behind them) hide
        cv = r.get('cover')
        if r['solo'] and cv and cv['edges'] >= 200:
            main_f = {}
            for f in r['focus']:
                main_f[f['entry']] = f['name']
            subj = [u['name'] for u in cv['under'] if main_f.get(u['entry']) == u['name']]
            dens = cv.get('dens') or 0
            if (cv['hidden'] >= cover_max and dens >= 1.5) or cv['hidden'] >= 0.25 or (subj and cv['hidden'] >= 0.03):
                what = (f"{round(cv['hidden'] * 100)} % of the picture's detail with {round(cv['area'] * 100)} % of the frame"
                        + (f" — placed where the picture is {dens:.1f}× as busy as average" if dens >= 1.2 else ''))
                add('lyric-cover', t, sh, f"the lyrics and what is drawn behind them (a bar, a plate) hide {what}"
                    + (f", including the subject \"{subj[0]}\"" if subj else '') +
                    ": move them to where the picture is empty, drop the bar, or make the bar smaller than the line",
                    key=('lyric-cover', top), value=-cv['hidden'])
        # --- a text drawn onto something of its own colour: a black stamp over a black drawing. (The sung words measured
        # above are judged by lyric-touch, from the picture without lyrics; here: every other text, read from the frame.)
        if r['solo']:
            measured = [wr['box'] for wr in r['words'] if wr.get('status') == 'ok']
            for tx in r['texts']:
                same, cross = tx.get('touch') or 0, tx.get('cross') or 0
                if same < touch_text and cross < cross_text:
                    continue
                if tx['lyric'] and any(_overlap(tx['box'], mb) > 0 for mb in measured):
                    continue
                if any(o is not tx and _norm(o['s']) == _norm(tx['s']) and _overlap(o['box'], tx['box']) > 0 for o in r['texts']):
                    continue                           # drawn twice on purpose (a glow, a shadow, an outline): the ring is itself
                sh_t = shot_name(tx['entry'])
                if same >= touch_text:
                    add('text-touch', t, sh_t, f"\"{tx['s'][:40]}\" is drawn onto something of its own colour: {round(same * 100)} % of the thin "
                        f"ring around its letters is that colour (a black stamp over a black drawing, a title on a rule): the two merge. "
                        f"Change one colour, give the text a plate, or move it clear" + _where((tx.get('geo') or {}).get('sameGeo'), r['focus'], 'text'), box=tx['box'],
                        key=('text-touch', sh_t, _textkey(tx['s'])), value=-same)
                else:
                    add('text-touch', t, sh_t, f"\"{tx['s'][:40]}\" has drawing running into it: lines or shapes touch {cross:.1f} em of its letters' "
                        f"outline (a line through a label, a paperclip on a number, a hand over a stamp): it reads as struck through. Move "
                        f"it into clear space, give it a plate, or stop the drawing short of it" + _where((tx.get('geo') or {}).get('crossGeo'), r['focus'], 'text'), box=tx['box'],
                        key=('text-touch', sh_t, _textkey(tx['s'])), value=-cross)
        # --- text the camera clipped: it fits in the scene's own frame, but the push / insert / shake carried a little of
        # it over the edge. Just clipped (5–50 % cut off) reads as a mistake; mostly gone reads as a close-up.
        settled = None                                 # is the camera holding still here? (a crop while it moves is passing)

        def camera_settled():
            p0, p1 = r['post'], page.evaluate('t => MV_QA.probe(t, []).post', t + 0.15)
            z0, z1 = p0.get('z') or 1, p1.get('z') or 1
            return abs(z1 - z0) / z0 < 0.01 and math.hypot((p1.get('sx') or 0) - (p0.get('sx') or 0), (p1.get('sy') or 0) - (p0.get('sy') or 0)) < 8
        if r['solo'] and not r['post'].get('remapped'):
            for tx in r['texts']:
                q0, b = tx.get('q0'), tx['box']
                if not q0 or tx['alpha'] < 0.3:
                    continue
                if min(q0[0], q0[1], W - q0[2], H - q0[3]) < margin:
                    continue                           # the scene put it at the edge (a sheet's border numbers, a corner tag): a push may crop it
                area = max(1e-6, (b[2] - b[0]) * (b[3] - b[1]))
                ix, iy = max(0.0, min(b[2], W) - max(b[0], 0)), max(0.0, min(b[3], H) - max(b[1], 0))
                cut = 1 - ix * iy / area
                if 0.05 < cut < 0.5:
                    if settled is None:
                        settled = camera_settled()
                    if not settled:
                        break
                    who = 'lyric' if tx['lyric'] else (_tag(tx.get('owner')) or 'text')
                    sh_t = shot_name(tx['entry'])
                    gap0 = min(q0[0], q0[1], W - q0[2], H - q0[3])
                    add('text-cut', t, sh_t, f"{'the lyric ' if tx['lyric'] else ''}\"{tx['s'][:40]}\" is clipped by the frame edge ({round(cut * 100)} % cut off): "
                        f"it sits {round(gap0)} px from the edge in the scene, the camera (push / insert / shake) carried it over. Just clipped reads as a mistake: "
                        f"keep it whole (MV.keep, or the screen layer for a lyric), move it in, or push in far enough to drop it",
                        box=b, key=('text-cut', sh_t, who), value=-cut)
        if r['post'].get('remapped'):
            # a post filter moved the scene's pixels (3D tilt): only the screen layer (MV.overlay) can still be mapped
            r['texts'] = [x for x in r['texts'] if x.get('where') == 'out']
            r['boxes'] = [b for b in r['boxes'] if b.get('where') == 'out']
            r['focus'] = [f for f in r['focus'] if f.get('screen')]
        # --- boxes. A box's OWN text (same MV.group / owner) is held to the strict rules: inside, with room.
        # Any other text that lands on a box is a clash between two unrelated things (a warning), never "its box".
        own_boxes = defaultdict(list)                  # owner -> [(box, inv, k, rect)]
        for b in r['boxes']:
            inv, k = _inv(b['m'])
            if inv is None:
                continue
            rx, ry, rw, rh = b['rect']
            ent = (b, inv, k, [rx, ry, rx + rw, ry + rh])
            if b.get('owner'):
                own_boxes[b['owner']].append(ent)
            for tx in r['texts']:
                if tx['alpha'] < 0.05:
                    continue
                rel = _relate(tx, ent)
                if rel is None:
                    continue
                inside, centred_in, xb, bb = rel
                own = bool(tx.get('owner')) and tx.get('owner') == b.get('owner')
                tkey = _textkey(tx['s'])
                sh_b = shot_name(b['entry'])
                label = ('the lyric ' if tx['lyric'] else '') + f"\"{tx['s'][:40]}\""
                bname = b['name'] or 'a box'
                if own and inside:
                    ink_h = (xb[3] - xb[1]) * k
                    need = b['pad'] if b['pad'] is not None else max(3.0, 0.4 * ink_h)
                    gaps = {'left': xb[0] - bb[0], 'top': xb[1] - bb[1], 'right': bb[2] - xb[2], 'bottom': bb[3] - xb[3]}
                    side, g = min(gaps.items(), key=lambda kv: kv[1])
                    g *= k
                    if g < need - 0.5:
                        add('box-tight', t, sh_b, f"{label} in its {bname}: {round(g, 1)} px to the {side} edge (wants ≥ {round(need, 1)})",
                            box=tx['box'], frame_box=b['box'], key=('box-tight', sh_b, tkey, side), value=g)
                elif own and centred_in:
                    side, d = max({'left': bb[0] - xb[0], 'top': bb[1] - xb[1], 'right': xb[2] - bb[2], 'bottom': xb[3] - bb[3]}.items(), key=lambda kv: kv[1])
                    d *= k
                    if d >= 1.0:
                        add('box-cross', t, sh_b, f"{label} pokes {round(d)} px out of the {side} edge of its {bname}",
                            box=tx['box'], frame_box=b['box'], key=('box-cross', sh_b, tkey), value=d)
                elif not own:
                    # someone else's text on this box: a problem when the box's edge cuts through it, or when it sits on
                    # the box's own text. Text resting wholly inside a box with nothing under it is left alone (qa
                    # cannot know it was not meant to be there; draw it in the box's MV.group to have it checked).
                    # Not judged mid-transition (two pictures on top of each other on purpose) or on a box faded out.
                    if not r['solo'] or (b.get('alpha') is not None and b['alpha'] < 0.15):
                        continue
                    if tx['lyric']:
                        bw, bh = bb[2] - bb[0], bb[3] - bb[1]
                        if (xb[3] - xb[1]) > 2 * bh and (xb[2] - xb[0]) > bw:
                            continue                   # a lyric that dwarfs the box: overprinted across the form (a stamp), not at its border
                    who = _tag(tx.get('owner')) or 'the scene'
                    whose = f" of {_tag(b.get('owner'))}" if b.get('owner') and _tag(b.get('owner')) != bname else ''
                    # a lyric's words are reported per box (one finding for the line, the worst word shown)
                    ckey = ('box-clash', sh_b, _tag(b.get('owner')) or bname, 'lyric' if tx['lyric'] else tkey)
                    if not inside:
                        d = k * min(xb[2] - bb[0], bb[2] - xb[0], xb[3] - bb[1], bb[3] - xb[1])
                        if d < 1.0:
                            continue
                        if tx['lyric']:
                            msg = (f"{label} is cut by the edge of {bname}{whose}, {round(d)} px across — a lyric printed across a border: "
                                   f"move it clear of the box, or onto it (drawn inside the box's MV.within(owner), so qa checks it as the box's own text)")
                        else:
                            msg = (f"{label} (drawn by {who}) is cut by the edge of {bname}{whose}, {round(d)} px across — "
                                   f"two unrelated things on top of each other (if it belongs in that box, draw it inside the box's MV.group)")
                        add('box-clash', t, sh_b, msg, box=tx['box'], frame_box=b['box'], key=ckey, value=d)
                    elif b.get('owner'):
                        hit = next((o for o in r['texts'] if o is not tx and o.get('owner') == b['owner'] and o['alpha'] >= 0.05
                                    and _overlap(o['box'], tx['box']) >= 1.0), None)
                        if hit:
                            d = _overlap(hit['box'], tx['box'])
                            add('box-clash', t, sh_b, f"{label} (drawn by {who}) sits on \"{hit['s'][:30]}\" in {bname}{whose} — "
                                f"two unrelated texts on top of each other", box=tx['box'], frame_box=b['box'], key=ckey, value=d)
        # an owned text that is in none of its owner's boxes fell out of them (the last row under the table)
        for tx in r['texts']:
            o = tx.get('owner')
            if not o or tx['alpha'] < 0.05 or o not in own_boxes:
                continue
            rels = [_relate(tx, ent) for ent in own_boxes[o]]
            if any(rl and (rl[0] or rl[1]) for rl in rels):
                continue
            b0 = own_boxes[o][0][0]
            add('box-cross', t, shot_name(b0['entry']), f"\"{tx['s'][:40]}\" is drawn by {_tag(o)} but sits outside all of its boxes (fell out of its table?)",
                box=tx['box'], frame_box=_union([e[0]['box'] for e in own_boxes[o]]), key=('box-cross', shot_name(b0['entry']), _textkey(tx['s']), 'stray'), value=1)
        # --- focus: the subject is the LAST point an entry reports in the frame (the one kits/camera.js follows); points
        # reported before it (a lib that reports every figure it draws) may leave the frame when an insert punches in
        main = {}
        for f in r['focus']:
            main[f['entry']] = f
        for f in main.values():
            ex, ey = 0.03 * W, 0.03 * H
            if not (ex <= f['x'] <= W - ex and ey <= f['y'] <= H - ey):
                where = 'outside the frame' if not (0 <= f['x'] <= W and 0 <= f['y'] <= H) else 'at the very edge'
                add('focus-out', t, shot_name(f['entry']), f"focus \"{f['name']}\" is {where} ({round(f['x'])}, {round(f['y'])})",
                    box=[f['x'] - 6, f['y'] - 6, f['x'] + 6, f['y'] + 6], key=('focus-out', shot_name(f['entry']), f['name']))
        if (n + 1) % 25 == 0 or n + 1 == len(times):
            print(f"  {n + 1}/{len(times)}  t={t:.2f}  {time.time() - started:.0f} s", flush=True)

    # ------------------------------------------------------------ motion per shot
    motion = []
    for s in shots:
        if s['to'] <= t0 or s['from'] >= t1:
            continue
        nxt = shots[s['i'] + 1] if s['i'] + 1 < len(shots) else None
        a_, b_ = s['from'], min(s['to'], nxt['from'] if nxt else s['to'])
        d = b_ - a_
        if d < 0.6:
            continue
        ns = 6
        ts = [round((a_ + d * (0.08 + 0.84 * k / (ns - 1))) * fps) / fps for k in range(ns)]
        m = page.evaluate('ts => MV_QA.motion(ts)', ts)
        motion.append({'shot': s['name'], 'from': s['from'], 'to': s['to'], 'span': m['span'], 'steps': m['steps']})
        # the longest stretch where the picture (lyrics left out) stands still: a frozen frame with words on it
        run = best = 0
        best_end = 0
        for k, x in enumerate(m['steps']):
            run = run + 1 if x < freeze else 0
            if run > best:
                best, best_end = run, k + 1
        frozen = best * (ts[1] - ts[0]) if len(ts) > 1 else 0
        if m['span'] < motion_min and max(m['steps'] or [0]) < motion_min:
            add('static', ts[len(ts) // 2], s['name'], f"{s['name']} ({s['from']:.2f}–{s['to']:.2f}): {m['span'] * 100:.1f} % of the picture changes from "
                f"start to end — the camera never moves and nothing big happens", key=('static', s['name']), value=m['span'])
        elif frozen >= max(1.5, 0.5 * d):
            a2, b2 = ts[best_end - best], ts[best_end]
            add('static', (a2 + b2) / 2, s['name'], f"{s['name']}: the picture stands still from {a2:.2f} to {b2:.2f} s ({frozen:.1f} s) — "
                f"keep the camera moving (a slow push-in at least)", key=('static', s['name']), value=frozen)
        else:
            # fast and held: the speed (share of the picture that changes per 1/6 s) has to vary. A shot that only drifts,
            # or rushes at one speed, never gives the eye a moment that stands out or a moment to read
            lead = max(0.35, s.get('fadeIn') or 0)
            ts2, x = [], a_ + lead
            while x <= b_ - 0.2 + 1e-9:
                ts2.append(round(x * fps) / fps)
                x += 1 / 6
            if b_ - a_ >= 2.5 and len(ts2) >= 8:
                sp = page.evaluate('ts => MV_QA.motion(ts)', ts2)['steps']
                q = sorted(sp)
                low, top = q[int(0.1 * (len(q) - 1))], q[-1]
                motion[-1]['speed'] = sp
                if top < 3 * low or top - low < 0.02:
                    k = sp.index(top)
                    what = (f"only drifts ({top * 100:.1f} % of the picture changes per 1/6 s at most): nothing happens in {b_ - a_:.1f} s"
                            if top < 0.03 else f"moves at one speed ({low * 100:.1f}–{top * 100:.1f} % per 1/6 s): nothing stands out, nothing holds")
                    add('one-speed', ts2[k], s['name'], f"{s['name']} ({a_:.2f}–{b_:.2f}) {what} — give it an event (a hit, a turn, an arrival on a beat) "
                        f"against a calmer stretch, or cut it shorter", key=('one-speed', s['name']), value=top / max(low, 1e-4))

    # ------------------------------------------------------------ reads: the eye on the read when it starts
    nreads = 0
    for s in shots:
        for rd in s.get('reads') or []:
            if not rd.get('focus') or not (t0 <= rd['at'] < t1) or not (s['from'] - 1e-6 <= rd['at'] < (s.get('until') or s['to'])):
                continue
            nreads += 1
            t = math.ceil((rd['at'] + 2.0 / fps) * fps - 1e-6) / fps      # two frames in: the read has begun
            fr = page.evaluate('t => MV_QA.probe(t, [])', t)
            mine = [f for f in fr['focus'] if f['entry'] == s['i']]
            subj = mine[-1]['name'] if mine else None
            if subj != rd['focus']:
                named = any(f['name'] == rd['focus'] for f in mine)
                add('read-unled', t, s['name'], f"read \"{rd['what']}\" starts at {rd['at']:.2f} with the eye on "
                    + (f"\"{subj}\"" if subj else 'nothing (no MV.focus)') + f", not \"{rd['focus']}\""
                    + (" (reported, but not last: the subject is the LAST MV.focus)" if named else " (not reported in this frame)")
                    + " — lead the eye there first: make it the subject (camera, movement, light, a look)",
                    box=[mine[-1]['x'] - 6, mine[-1]['y'] - 6, mine[-1]['x'] + 6, mine[-1]['y'] + 6] if mine else None,
                    key=('read-unled', s['name'], rd['what']))

    # ------------------------------------------------------------ type
    type_note = ''
    if len(type_px) >= 30:
        px = sorted(type_px)
        lo, hi, med = px[int(0.05 * (len(px) - 1))], px[int(0.95 * (len(px) - 1))], px[len(px) // 2]
        bands = [sum(1 for y in type_y if y < 1 / 3), sum(1 for y in type_y if 1 / 3 <= y < 2 / 3), sum(1 for y in type_y if y >= 2 / 3)]
        share = [b / len(type_y) for b in bands]
        type_note = (f"lyric size {lo:.0f}–{hi:.0f} px (5–95 %, median {med:.0f}), range {hi / max(lo, 1):.1f}×; "
                     f"top / middle / bottom third: {share[0] * 100:.0f} / {share[1] * 100:.0f} / {share[2] * 100:.0f} %")
        if not whole:
            type_note += ' (this stretch only: type-flat / type-band are judged on a run over the whole film)'
        elif hi / max(lo, 1) < type_range:
            add('type-flat', t0, '(film)', f"lyrics are all about one size ({lo:.0f}–{hi:.0f} px): let the shouted lines be 3× the whispered ones",
                key=('type-flat',))
        if whole and max(share) > 0.7:
            band = ['top', 'middle', 'bottom'][share.index(max(share))]
            add('type-band', t0, '(film)', f"{max(share) * 100:.0f} % of the lyrics sit in the {band} third, like subtitles: move some lines "
                f"to where the picture leaves room, put some on the objects", key=('type-band',))

    # ------------------------------------------------------------ group, crop, report
    groups = {}
    for f in findings:
        g = groups.get(f['key'])
        if not g:
            groups[f['key']] = dict(f, n=1, t_last=f['t'])
        else:
            g['n'] += 1
            g['t_last'] = f['t']
            bigger_is_worse = f['kind'] in ('box-cross', 'box-clash')
            worse = f['value'] is not None and g['value'] is not None and (f['value'] > g['value'] if bigger_is_worse else f['value'] < g['value'])
            if worse:
                g.update({k: f[k] for k in ('t', 'msg', 'box', 'frame_box', 'value')})
    items = sorted(groups.values(), key=lambda g: (g['sev'] != 'error', g['t']))
    qdir = out_dir / 'qa'
    if qdir.exists():
        shutil.rmtree(qdir)
    qdir.mkdir(parents=True, exist_ok=True)
    max_crops = int(qc.get('crops', 60))
    from PIL import Image, ImageDraw
    for k, g in enumerate(items):
        if k >= max_crops or (g['box'] is None and g['kind'] not in ('static', 'one-speed', 'read-unled', 'lyric-missing', 'lyric-cover')):
            continue
        png = pg.frame(g['t'], 1, ('image/png', 1), {})
        im = Image.open(io.BytesIO(png)).convert('RGB')
        dr = ImageDraw.Draw(im)
        if g['frame_box']:
            dr.rectangle(_clip(g['frame_box'], W, H), outline=(255, 210, 0), width=3)
        if g['box']:
            dr.rectangle(_clip(_grow(g['box'], 4), W, H), outline=(255, 40, 40), width=3)
            region = _region(g['box'], g['frame_box'], W, H)
            crop = im.crop(region)
            if crop.width < 900:
                s = min(3, 900 / crop.width)
                crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
        else:
            crop = im.resize((W // 2, H // 2), Image.LANCZOS)
        name = f"{k + 1:02d}-{g['kind']}-{g['t']:07.2f}.png"
        crop.save(qdir / name)
        g['crop'] = f'out/qa/{name}'

    errs = [g for g in items if g['sev'] == 'error']
    warns = [g for g in items if g['sev'] == 'warn']
    lines = [f"# qa — {info['title']}", '',
             f"{len(times)} frames, {checked} sung words measured ({missing} not found as text, {unverified} drawn through an offscreen layer and not measurable, {skipped} one-letter words skipped), "
             f"{len(motion)} shots checked for motion, {nreads} reads checked for focus. {len(errs)} errors, {len(warns)} warnings. {time.time() - started:.0f} s.", '']
    if type_note:
        lines += [f"Type: {type_note}.", '']
    lines += ['| | kind | time | shot | what | crop |', '|---|---|---|---|---|---|']
    for g in items:
        when = f"{g['t']:.2f}" + (f" (×{g['n']}, to {g['t_last']:.2f})" if g['n'] > 1 else '')
        lines.append(f"| {'✗' if g['sev'] == 'error' else '·'} | {g['kind']} | {when} | {g['shot']} | {g['msg']} | {g.get('crop', '')} |")
    lines += ['', '## Motion per shot (share of the picture that changes, lyrics left out)', '', '| shot | from | span | steps |', '|---|---|---|---|']
    for m in motion:
        lines.append(f"| {m['shot']} | {m['from']:.2f} | {m['span'] * 100:.1f} % | {' '.join(f'{x * 100:.1f}' for x in m['steps'])} |")
    sped = [m for m in motion if m.get('speed')]
    if sped:
        lines += ['', '## Speed per shot (share of the picture that changes per 1/6 s; one-speed looks for contrast here)', '',
                  '| shot | from | speed |', '|---|---|---|']
        for m in sped:
            lines.append(f"| {m['shot']} | {m['from']:.2f} | {' '.join(f'{x * 100:.0f}' for x in m['speed'])} |")
    (qdir / 'report.md').write_text('\n'.join(lines) + '\n')
    (qdir / 'qa.json').write_text(json.dumps({'findings': items, 'motion': motion, 'type': type_note,
                                              'counts': {'frames': len(times), 'words': checked, 'missing': missing}}, ensure_ascii=False, indent=1, default=list))

    print()
    if type_note:
        print('type:', type_note)
    for g in items:
        when = f"{g['t']:7.2f}" + (f" ×{g['n']}" if g['n'] > 1 else '')
        print(f"  {'ERROR' if g['sev'] == 'error' else 'warn '} {g['kind']:<13} {when:<12} {g['shot']:<14} {g['msg']}" + (f"\n{'':>22}→ {g['crop']}" if g.get('crop') else ''))
    print(f"\n{len(errs)} errors, {len(warns)} warnings · {checked} words measured · report: {qdir / 'report.md'}")
    return 1 if errs else 0


_SIDE = {'above': 'above the letters', 'below': 'below the letters (along the baseline)', 'left': 'at its left end',
         'right': 'at its right end', 'through': 'in between / through the letters'}


def _where(geo, focus, what):
    """the contact of a touch finding in words: which side, how far along, what colour, where, what subject is near"""
    if not geo:
        return ''
    z = sorted(((v, k) for k, v in (geo.get('zones') or {}).items() if v >= 0.1), reverse=True)
    sides = ', '.join(f"{_SIDE[k]} {round(v * 100)} %" for v, k in z) or 'all round'
    hs, vs, b = geo.get('hspan', 0), geo.get('vspan', 0), geo.get('box') or [0, 0, 0, 0]
    top = z[0][1] if z else ''
    if top in ('above', 'below') and hs >= 0.6:
        shape = f"a horizontal edge or line running {'over' if top == 'above' else 'under'} the {what}"
    elif top == 'through' and vs >= 0.6:
        shape = f"a line or shape crossing the {what}"
    elif top in ('left', 'right') and vs >= 0.5:
        shape = f"something upright butting into its {top} end"
    elif hs < 0.25 and vs < 0.5:
        shape = 'a small shape at one spot'
    else:
        shape = 'drawing spread along it'
    near = ''
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    best = min(((math.dist((cx, cy), (f['x'], f['y'])), f['name']) for f in focus or [] if f.get('name')), default=None)
    if best and best[0] < 240:
        near = f"; nearest MV.focus \"{best[1]}\" {round(best[0])} px away"
    return (f". Where: {shape} — {sides}; spans {round(hs * 100)} % of its width, {round(vs * 100)} % of its height; "
            f"colour {geo.get('color', '?')}; contact at x {b[0]}–{b[2]}, y {b[1]}–{b[3]}{near}")


def _inv(m):
    a, b, c, d, e, f = m
    det = a * d - b * c
    if abs(det) < 1e-9:
        return None, 0
    ia, ib, ic, id_ = d / det, -b / det, -c / det, a / det
    return [ia, ib, ic, id_, -(ia * e + ic * f), -(ib * e + id_ * f)], math.sqrt(abs(det))


def _apply(m, p):
    return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]


def _aabb(q):
    xs, ys = [p[0] for p in q], [p[1] for p in q]
    return [min(xs), min(ys), max(xs), max(ys)]


def _relate(tx, ent):
    """(inside, centred_in, text box, box rect) of a text against a box, both in the box's own frame; None when apart."""
    b, inv, k, bb = ent
    ob = tx['box']
    if ob[2] < b['box'][0] or ob[0] > b['box'][2] or ob[3] < b['box'][1] or ob[1] > b['box'][3]:
        return None
    xb = _aabb([_apply(inv, p) for p in tx['q']])
    if xb[2] - xb[0] < 0.5 or xb[3] - xb[1] < 0.5:
        return None
    if min(xb[2], bb[2]) <= max(xb[0], bb[0]) or min(xb[3], bb[3]) <= max(xb[1], bb[1]):
        return None
    tol = 0.5 / k
    inside = xb[0] >= bb[0] - tol and xb[1] >= bb[1] - tol and xb[2] <= bb[2] + tol and xb[3] <= bb[3] + tol
    cx, cy = (xb[0] + xb[2]) / 2, (xb[1] + xb[3]) / 2
    return inside, bb[0] <= cx <= bb[2] and bb[1] <= cy <= bb[3], xb, bb


def _norm(s):
    """letters and digits only, lower case (as engine/qa.js matches lyrics)"""
    return ''.join(ch for ch in s.lower() if ch.isalnum())


def _area(q):
    return abs(sum(q[i][0] * q[(i + 1) % len(q)][1] - q[(i + 1) % len(q)][0] * q[i][1] for i in range(len(q)))) / 2


def _inter_area(a, b):
    """area shared by two convex quads (output px): clip a by each edge of b (Sutherland–Hodgman)"""
    def side(p, e0, e1):
        return (e1[0] - e0[0]) * (p[1] - e0[1]) - (e1[1] - e0[1]) * (p[0] - e0[0])

    def cross(p, q, e0, e1):
        sp, sq = side(p, e0, e1), side(q, e0, e1)
        k = sp / (sp - sq) if sp != sq else 0
        return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]
    sgn = 1 if sum(b[i][0] * b[(i + 1) % 4][1] - b[(i + 1) % 4][0] * b[i][1] for i in range(4)) > 0 else -1
    poly = [list(p) for p in a]
    for i in range(4):
        e0, e1 = b[i], b[(i + 1) % 4]
        if not poly:
            break
        out = []
        for k in range(len(poly)):
            p, q = poly[k], poly[(k + 1) % len(poly)]
            pin, qin = sgn * side(p, e0, e1) >= 0, sgn * side(q, e0, e1) >= 0
            if pin:
                out.append(p)
            if pin != qin:
                out.append(cross(p, q, e0, e1))
        poly = out
    return _area(poly) if len(poly) >= 3 else 0.0


def _height(q):
    return math.dist(q[0], q[3])


def _centre(q):
    return [sum(p[0] for p in q) / len(q), sum(p[1] for p in q) / len(q)]


def _overlap(a, b):
    """the smaller side of the intersection of two boxes, px (0 when apart)"""
    return max(0.0, min(min(a[2], b[2]) - max(a[0], b[0]), min(a[3], b[3]) - max(a[1], b[1])))


def _tag(owner):
    """'title block#17' -> 'title block' (the id is per call; the tag names the helper)"""
    return owner.rsplit('#', 1)[0] if owner else None


def _union(bs):
    return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)]


def _textkey(s):
    """one key for a label whose numbers tick ("042 — 9.7 s", "042 — 9.9 s")"""
    import re
    return re.sub(r'\d+', '#', s[:40])


def _grow(b, d):
    return [b[0] - d, b[1] - d, b[2] + d, b[3] + d]


def _clip(b, W, H):
    return [max(0, min(W - 1, b[0])), max(0, min(H - 1, b[1])), max(0, min(W - 1, b[2])), max(0, min(H - 1, b[3]))]


def _region(box, frame_box, W, H):
    b = list(box)
    if frame_box:
        b = [min(b[0], frame_box[0]), min(b[1], frame_box[1]), max(b[2], frame_box[2]), max(b[3], frame_box[3])]
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    w = max(480, (b[2] - b[0]) + 160)
    h = max(270, (b[3] - b[1]) + 120, w * 9 / 16 * 0.6)
    x0, y0 = cx - w / 2, cy - h / 2
    x0 = max(0, min(W - w, x0)) if w < W else 0
    y0 = max(0, min(H - h, y0)) if h < H else 0
    return (round(x0), round(y0), round(min(W, x0 + w)), round(min(H, y0 + h)))
