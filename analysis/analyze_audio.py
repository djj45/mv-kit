#!/usr/bin/env python3
"""Music analysis -> PROJECT/data/audio.json + audio.js

  uv run analysis/analyze_audio.py projects/my-song [--bpm-range 70 180] [--bpm 128] [--meter 4]
                                                    [--downbeat-shift 1] [--tracker grid|dp] [--plot]
  uv run analysis/analyze_audio.py projects/my-song --pin     # only record which file the data belongs to

What it finds (numpy + scipy + ffmpeg only):
  * a beat grid. Default `grid`: one constant tempo + phase fitted to the attacks of the whole song, then
    the phase refined on kick attacks (right for most produced pop / electronic / rock). Use `--tracker dp`
    for live, rubato or tempo-changing music (dynamic-programming beat tracker, Ellis 2007).
  * downbeats: the bar phase where kicks and chord changes land and snares sit on 2 & 4. Printed with its
    score; if the preview's debug overlay (press d) shows bar 1 on the wrong beat, use --downbeat-shift N.
  * sections: novelty boundaries on bar-synchronous timbre + harmony, labelled A/B/C by similarity,
    with a 0..1 energy each.
  * kick / snare / hat onsets (from stems/drums.wav if present, else from a percussive separation of
    the mix), a general `onset` list, and 100 fps envelopes rms / low / mid / high (+ one per stem).
Stems: run analysis/separate.py first for cleaner drums and vocals (optional).
audio.json also records the song's sha256 and size: render.py warns when the project's song is no longer that
file (another master shifts every cut and word). --pin adds them to an older audio.json without re-analysing.
The grid search and onset detectors adapt ideas from pdoom-video/analysis/analyze.py (MIT).
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.ndimage import median_filter, uniform_filter1d
from scipy.signal import butter, find_peaks, sosfiltfilt

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'tools'))
from mvproject import audio_path, decode, fingerprint, load_project, stems_dir, write_data  # noqa: E402

SR = 22050
FPS = 100


# ---------------------------------------------------------------- signal helpers
def band(x, lo, hi, sr=SR):
    if lo and hi:
        sos = butter(4, [lo, hi], btype='band', fs=sr, output='sos')
    elif hi:
        sos = butter(4, hi, btype='low', fs=sr, output='sos')
    else:
        sos = butter(4, lo, btype='high', fs=sr, output='sos')
    return sosfiltfilt(sos, x)


def frame_rms(x, sr=SR, fps=FPS, win=1024):
    hop = sr / fps
    n = int(math.ceil(len(x) / sr * fps))
    pad = np.pad(x, (win // 2, win // 2 + int(hop) + 2))
    idx = (np.arange(n) * hop).astype(int)
    c = np.concatenate([[0.0], np.cumsum(pad.astype(np.float64) ** 2)])
    return np.sqrt(np.maximum((c[idx + win] - c[idx]) / win, 0))


def smooth_env(x, fps=FPS, attack=0.010, release=0.090):
    aa, ar = math.exp(-1 / (attack * fps)), math.exp(-1 / (release * fps))
    y = np.empty_like(x)
    s = 0.0
    for i, v in enumerate(x):
        a = aa if v > s else ar
        s = a * s + (1 - a) * v
        y[i] = s
    return y


def norm01(x, pct=99.0):
    return np.clip(x / (np.percentile(x, pct) + 1e-12), 0, 1)


def spectrogram(x, n_fft=2048, hop=512):
    """Magnitude STFT (freq x time), float32, computed in chunks."""
    w = np.hanning(n_fft).astype(np.float32)
    xp = np.pad(x.astype(np.float32), (n_fft // 2, n_fft // 2))
    n = 1 + (len(xp) - n_fft) // hop
    out = np.empty((n_fft // 2 + 1, n), np.float32)
    for a in range(0, n, 2048):
        b = min(n, a + 2048)
        fr = np.lib.stride_tricks.as_strided(xp[a * hop:], shape=(b - a, n_fft), strides=(xp.strides[0] * hop, xp.strides[0]))
        out[:, a:b] = np.abs(np.fft.rfft(fr * w, axis=1)).T
    return out


def attack_env(x, sr=SR, hop_s=0.0029):
    """Fine-grained attack envelope: summed positive log-energy rises of 3 bands (~345 fps)."""
    h = int(hop_s * sr)
    env = 0
    for lo, hi, wgt in ((None, 150, 1.0), (150, 3000, 1.0), (3000, None, 0.6)):
        xb = band(x, lo, hi, sr)
        e = np.add.reduceat(xb ** 2, np.arange(0, len(xb), h)) / h
        db = 10 * np.log10(e + 1e-10)
        lag = max(1, int(0.02 / hop_s))
        rise = db - np.concatenate([np.full(lag, db[0]), db[:-lag]])
        rise = np.maximum(rise - uniform_filter1d(rise, int(1.0 / hop_s)), 0)
        env = env + wgt * rise / (np.percentile(rise, 99) + 1e-9)
    return env, sr / h


def band_onsets(x, lo, hi, sr=SR, win=0.010, hop_s=0.002, min_gap=0.08, rel_db=10.0):
    """Onsets in a band: steepest rise of the band's log energy. Returns (times, peak dB)."""
    xb = band(x, lo, hi, sr)
    h, w = int(hop_s * sr), int(win * sr)
    e = np.convolve(xb ** 2, np.ones(w) / w, mode='same')[::h]
    db = 10 * np.log10(e + 1e-10)
    fps = sr / h
    d = uniform_filter1d(np.diff(db, prepend=db[0]), 3)
    lag = max(1, int(0.02 * fps))
    rise = db - np.concatenate([np.full(lag, db[0]), db[:-lag]])
    floor = median_filter(db, int(1.0 * fps) | 1)
    pk, _ = find_peaks(rise, height=rel_db, distance=max(1, int(min_gap * fps)))
    times, strength = [], []
    for p in pk:
        a = max(0, p - lag)
        q = a + int(np.argmax(d[a:p + 1]))
        peak = db[p:p + int(0.03 * fps) + 1].max()
        if peak < floor[p] + 3:
            continue
        times.append(q / fps)
        strength.append(peak)
    return np.array(times), np.array(strength)


def strength01(v):
    if len(v) == 0:
        return v
    lo, hi = np.percentile(v, 5), np.percentile(v, 95)
    return np.clip((v - lo) / (hi - lo + 1e-9) * 0.8 + 0.2, 0, 1)


def percussive(x, sr=SR):
    """Harmonic/percussive separation (median filtering, Fitzgerald 2010) -> percussive signal."""
    from scipy.signal import istft, stft
    f, t, Z = stft(x.astype(np.float32), fs=sr, nperseg=2048, noverlap=2048 - 512)
    S = np.abs(Z).astype(np.float32)
    Hm = median_filter(S, size=(1, 17))
    Pm = median_filter(S, size=(17, 1))
    mask = Pm ** 2 / (Hm ** 2 + Pm ** 2 + 1e-10)
    _, xp = istft(Z * mask, fs=sr, nperseg=2048, noverlap=2048 - 512)
    return xp[:len(x)] if len(xp) >= len(x) else np.pad(xp, (0, len(x) - len(xp)))


# ---------------------------------------------------------------- tempo and beats
def tempo_estimate(env, efps, lo, hi):
    """Autocorrelation tempogram with a log-normal prior around 120 BPM."""
    k = max(1, int(round(efps / 86)))
    o = env[:len(env) // k * k].reshape(-1, k).mean(1)
    fps = efps / k
    o = o - o.mean()
    ac = np.fft.irfft(np.abs(np.fft.rfft(o, 2 * len(o))) ** 2)[:len(o)]
    bpms = np.arange(lo, hi, 0.5)
    lags = 60 * fps / bpms
    val = np.interp(lags, np.arange(len(ac)), ac)
    val *= np.exp(-0.5 * (np.log2(bpms / 120.0)) ** 2)
    return float(bpms[int(np.argmax(val))])


def fit_grid(env, efps, duration, bpm0, span=0.03):
    def score(P, off):
        ts = off + P * np.arange(int((duration - off) / P) + 1)
        idx = np.round(ts * efps).astype(int)
        idx = idx[(idx > 2) & (idx < len(env) - 2)]
        return np.maximum.reduce([env[idx - 1], env[idx], env[idx + 1]]).mean()
    best = (-1, bpm0, 0.0)
    for bpm in np.arange(bpm0 * (1 - span), bpm0 * (1 + span), 0.02):
        P = 60 / bpm
        for off in np.arange(0, P, 0.004):
            s = score(P, off)
            if s > best[0]:
                best = (s, bpm, off)
    _, bpm, off = best
    for b2 in np.arange(bpm - 0.02, bpm + 0.02, 0.001):
        P = 60 / b2
        for o2 in np.arange(off - 0.008, off + 0.008, 0.001):
            s = score(P, o2)
            if s > best[0]:
                best = (s, b2, o2)
    return best[1], best[2]


def dp_beats(env, efps, bpm, tightness=100):
    """Dynamic-programming beat tracker (Ellis 2007) on a ~86 fps onset envelope."""
    k = max(1, int(round(efps / 86)))
    o = env[:len(env) // k * k].reshape(-1, k).mean(1)
    fps = efps / k
    P = 60 * fps / bpm
    o = o / (o.std() + 1e-9)
    g = np.exp(-0.5 * ((np.arange(-int(P), int(P) + 1)) / (P / 32)) ** 2)
    local = np.convolve(o, g, 'same')
    back = np.zeros(len(o), int)
    cum = local.copy()
    prange = np.arange(-int(round(2 * P)), -int(round(P / 2)) + 1)
    txcost = -tightness * np.log(-prange / P) ** 2
    for i in range(len(o)):
        lo = i + prange
        ok = lo >= 0
        if not ok.any():
            continue
        cands = cum[lo[ok]] + txcost[ok]
        j = int(np.argmax(cands))
        cum[i] = local[i] + cands[j]
        back[i] = lo[ok][j]
    i = int(np.argmax(cum[-int(2 * P):])) + len(cum) - int(2 * P)
    beats = [i]
    while back[i] > 0 and back[i] < i:
        i = back[i]
        beats.append(i)
    return np.array(beats[::-1]) / fps


# ---------------------------------------------------------------- harmony, bars, sections
def chroma(S, sr=SR, n_fft=2048):
    freqs = np.arange(S.shape[0]) * sr / n_fft
    keep = (freqs > 65) & (freqs < 2100)
    pc = (np.round(12 * np.log2(freqs[keep] / 440.0)) % 12).astype(int)
    L = np.log1p(10 * S[keep])
    C = np.zeros((12, S.shape[1]), np.float32)
    for k in range(12):
        C[k] = L[pc == k].sum(0)
    return C / (np.linalg.norm(C, axis=0, keepdims=True) + 1e-9)


def sync(F, frame_t, bounds):
    idx = np.searchsorted(frame_t, bounds)
    out = []
    for a, b in zip(idx[:-1], idx[1:]):
        out.append(F[:, a:max(b, a + 1)].mean(1))
    return np.array(out).T


def sections_from_bars(feat, bar_t, energy, min_bars=4, kernel=8):
    n = feat.shape[1]
    if n < 2 * min_bars:
        return [(0, n)]
    Fz = (feat - feat.mean(1, keepdims=True)) / (feat.std(1, keepdims=True) + 1e-9)
    Fn = Fz / (np.linalg.norm(Fz, axis=0, keepdims=True) + 1e-9)
    SSM = Fn.T @ Fn
    K = kernel
    ker = np.kron(np.array([[1, -1], [-1, 1]]), np.ones((K // 2, K // 2)))
    ker *= np.outer(np.hanning(K), np.hanning(K))
    pad = np.pad(SSM, K // 2, mode='edge')
    nov = np.array([(pad[i:i + K, i:i + K] * ker).sum() for i in range(n)])
    nov = np.maximum(nov, 0)
    pk, _ = find_peaks(nov, distance=min_bars, height=nov.mean() + 0.3 * nov.std())
    bounds = [0] + [int(p) for p in pk if min_bars <= p <= n - min_bars] + [n]
    return list(zip(bounds[:-1], bounds[1:]))


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project')
    ap.add_argument('--bpm', type=float, help='known tempo (skips the estimate; the grid is still fitted around it)')
    ap.add_argument('--bpm-range', type=float, nargs=2, default=[70, 180])
    ap.add_argument('--meter', type=int, default=4)
    ap.add_argument('--downbeat-shift', type=int, default=0, help='move bar 1 by N beats after detection')
    ap.add_argument('--tracker', choices=['grid', 'dp'], default='grid')
    ap.add_argument('--plot', action='store_true', help='write data/audio_qa.png (needs matplotlib)')
    ap.add_argument('--pin', action='store_true', help='only record the song\'s fingerprint in an existing audio.json')
    a = ap.parse_args()

    cfg = load_project(a.project)
    src = audio_path(cfg)
    if a.pin:
        return pin(cfg, src)
    print(f'decoding {src.name} …')
    x = decode(src, SR)
    dur = len(x) / SR
    stems = stems_dir(cfg)
    stem = lambda n: decode(stems / f'{n}.wav', SR) if stems and (stems / f'{n}.wav').exists() else None
    drums, vocals = stem('drums'), stem('vocals')
    notes = []
    if drums is None:
        print('percussive separation of the mix (no stems/drums.wav) …')
        drums = percussive(x)
        notes.append('drum onsets from a percussive separation of the mix (run analysis/separate.py for a drums stem)')

    # beats
    env, efps = attack_env(0.5 * x / (np.abs(x).max() + 1e-9) + 0.5 * drums / (np.abs(drums).max() + 1e-9))
    bpm0 = a.bpm or tempo_estimate(env, efps, *a.bpm_range)
    kick_t, kick_db = band_onsets(drums, None, 120, win=0.012, min_gap=0.15, rel_db=12)
    if len(kick_t):  # keep kicks within 9 dB of the loudest kick nearby (drops bass-note and bleed attacks)
        keep = np.array([kick_db[i] - kick_db[np.abs(kick_t - kick_t[i]) < 2.5].max() > -9 for i in range(len(kick_t))])
        kick_t, kick_db = kick_t[keep], kick_db[keep]
    if a.tracker == 'grid':
        bpm, off = fit_grid(env, efps, dur, bpm0)
        P = 60 / bpm
        n = np.round((kick_t - off) / P)
        res = kick_t - (off + n * P)
        res = res[np.abs(res) < 0.06]
        if len(res) > 8:
            off += float(np.median(res))
        off -= P * math.floor(off / P)
        beats = off + P * np.arange(int((dur - off) / P) + 1)
        print(f'tempo {bpm:.3f} BPM (estimate {bpm0:.1f}), first beat {off:.3f} s, constant grid')
    else:
        beats = dp_beats(env, efps, bpm0)
        bpm = 60 / np.median(np.diff(beats))
        P = 60 / bpm
        print(f'tempo ~{bpm:.2f} BPM (median), {len(beats)} tracked beats')

    # onsets
    snare_t, snare_db = band_onsets(drums, 1500, 5000, min_gap=0.15, rel_db=10)
    if len(snare_t):  # keep attacks with a long noisy tail (snare / clap), reject hats and bleed
        xb = band(drums, 500, 5000)
        e = np.sqrt(np.convolve(xb ** 2, np.ones(220) / 220, mode='same'))
        tail = np.array([20 * np.log10(e[int((t + 0.04) * SR):int((t + 0.12) * SR)].mean() + 1e-9) for t in snare_t])
        rel = np.array([tail[i] - tail[np.abs(snare_t - snare_t[i]) < 2.5].max() for i in range(len(snare_t))])
        keep = (rel > -8) & (tail > np.percentile(tail, 95) - 25)
        snare_t, snare_db = snare_t[keep], tail[keep]
    hat_t, hat_db = band_onsets(drums, 7000, None, win=0.006, min_gap=0.06, rel_db=9)
    for other, gap in ((snare_t, 0.04), (kick_t, 0.03)):
        if len(other) and len(hat_t):
            keep = np.min(np.abs(hat_t[:, None] - other[None, :]), axis=1) > gap
            hat_t, hat_db = hat_t[keep], hat_db[keep]
    pk, props = find_peaks(env, height=np.percentile(env, 90), distance=int(0.08 * efps))
    on_t, on_s = pk / efps, props['peak_heights']

    # downbeats: kicks and chord changes on 1, snares on 2 and 4
    S = spectrogram(x)
    ft = np.arange(S.shape[1]) * 512 / SR
    C = chroma(S)
    m = a.meter
    near = lambda ts, ss, t: ss[np.abs(ts - t) < 0.05].max() if len(ts) and (np.abs(ts - t) < 0.05).any() else 0.0
    k_at = np.array([near(kick_t, strength01(kick_db), t) for t in beats])
    s_at = np.array([near(snare_t, strength01(snare_db), t) for t in beats])
    bs = np.concatenate([beats, [beats[-1] + P]])
    Cb = sync(C, ft, bs)
    ch = np.zeros(len(beats))
    for i in range(2, len(beats) - 2):
        u, v = Cb[:, i - 2:i].mean(1), Cb[:, i:i + 2].mean(1)
        ch[i] = 1 - (u @ v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9)
    z = lambda v: (v - v.mean()) / (v.std() + 1e-9)
    kz, sz, cz = z(k_at), z(s_at), z(ch)
    scores = []
    for ph in range(m):
        idx = np.arange(ph, len(beats), m)
        s = kz[idx].mean() + cz[idx].mean() - 0.5 * sz[idx].mean()
        if m == 4:
            s += 0.5 * (sz[np.arange(ph + 1, len(beats), m)].mean() + sz[np.arange(ph + 3, len(beats), m)].mean()) / 2
        scores.append(s)
    phase = (int(np.argmax(scores)) + a.downbeat_shift) % m
    downbeats = beats[phase::m]
    print('downbeat phase scores:', ' '.join(f'{i}:{s:+.2f}' for i, s in enumerate(scores)), f'-> phase {phase}')

    # envelopes
    envs = {}
    for name, lo, hi in (('rms', None, None), ('low', None, 200), ('mid', 200, 2000), ('high', 2000, None)):
        sig = x if name == 'rms' else band(x, lo, hi)
        envs[name] = norm01(smooth_env(frame_rms(sig)))
    if stems:
        for n_ in ('vocals', 'drums', 'bass', 'other'):
            s_ = stem(n_)
            if s_ is not None:
                envs[n_] = norm01(smooth_env(frame_rms(s_)))
    nfr = min(len(v) for v in envs.values())

    # sections on bars
    bar_b = np.concatenate([downbeats, [downbeats[-1] + m * P]])
    bands_ = np.log1p(np.array([S[a_:b_].mean(0) for a_, b_ in ((2, 12), (12, 30), (30, 80), (80, 200), (200, 500), (500, 1025))]))
    feat = np.vstack([sync(C, ft, bar_b), sync(bands_, ft, bar_b)])
    rms_bar = np.array([envs['rms'][int(a_ * FPS):max(int(b_ * FPS), int(a_ * FPS) + 1)].mean() for a_, b_ in zip(bar_b[:-1], bar_b[1:])])
    segs = sections_from_bars(feat, bar_b, rms_bar)
    fz = (feat - feat.mean(1, keepdims=True)) / (feat.std(1, keepdims=True) + 1e-9)
    means = [fz[:, s:e].mean(1) for s, e in segs]
    labels, protos = [], []
    for mu in means:
        for li, pr in enumerate(protos):
            if (mu @ pr) / (np.linalg.norm(mu) * np.linalg.norm(pr) + 1e-9) > 0.75:
                labels.append(chr(65 + li))
                break
        else:
            protos.append(mu)
            labels.append(chr(65 + len(protos) - 1))
    e_all = np.array([rms_bar[s:e].mean() for s, e in segs])
    e_n = (e_all - e_all.min()) / (e_all.max() - e_all.min() + 1e-9)
    sections = []
    for k, ((s, e), lab) in enumerate(zip(segs, labels)):
        start = 0.0 if k == 0 else float(bar_b[s])
        end = dur if k == len(segs) - 1 else float(bar_b[e])
        sections.append({'name': f'{lab}{sum(1 for l in labels[:k + 1] if l == lab)}', 'label': lab,
                         'start': round(start, 3), 'end': round(end, 3), 'bars': [int(s), int(e)], 'energy': round(float(e_n[k]), 2)})
    print('sections:', '  '.join(f"{s['name']}@{s['start']:.1f}(e{s['energy']:.1f})" for s in sections))

    r3 = lambda v: [round(float(t), 3) for t in v]
    pairs = lambda ts, ss: [[round(float(t), 3), round(float(s), 2)] for t, s in zip(ts, ss)]
    doc = {
        'version': 1, 'source': src.name, **fingerprint(src), 'duration': round(dur, 3), 'bpm': round(float(bpm), 3), 'beat_period': round(float(P), 5),
        'meter': m, 'tracker': a.tracker, 'beats': r3(beats), 'downbeats': r3(downbeats), 'sections': sections,
        'fps': FPS, 'env': {k: np.round(v[:nfr], 3).tolist() for k, v in envs.items()},
        'onsets': {'kick': pairs(kick_t, strength01(kick_db)), 'snare': pairs(snare_t, strength01(snare_db)),
                   'hat': pairs(hat_t, strength01(hat_db)), 'onset': pairs(on_t, np.clip(on_s / (np.percentile(on_s, 95) + 1e-9), 0, 1))},
        'notes': notes,
    }
    if vocals is not None:
        vt, vdb = band_onsets(vocals, 150, 4000, min_gap=0.09, rel_db=8)
        doc['onsets']['vocal'] = pairs(vt, strength01(vdb))
    f = write_data(cfg, 'audio', doc)
    print(f'{len(beats)} beats, {len(downbeats)} bars, {len(kick_t)} kicks, {len(snare_t)} snares, {len(hat_t)} hats -> {f}')
    if a.plot:
        qa_plot(cfg, x, doc)


def pin(cfg, src):
    """Add the song's fingerprint to an audio.json written before analyses recorded it. Refuses when the decoded
    length differs from the analysed one: then this is another file, and the data should be redone instead."""
    j = cfg['_dir'] / 'data' / 'audio.json'
    if not j.exists():
        raise SystemExit(f'{j} not found: run the analysis first')
    doc = json.loads(j.read_text(encoding='utf-8'))
    dur = len(decode(src, SR)) / SR
    if abs(dur - doc.get('duration', dur)) > 0.02:
        raise SystemExit(f'{src.name} decodes to {dur:.3f} s but audio.json was made from {doc["duration"]} s of audio: '
                         f'not the same file. Re-run the analysis (and align_lyrics.py) instead of pinning.')
    fp = fingerprint(src)
    if doc.get('sha256') == fp['sha256']:
        print(f'{src.name}: already recorded')
        return
    out = {}
    for k, v in doc.items():              # keep the key order: the fingerprint goes after 'source'
        if k not in fp:
            out[k] = v
        if k == 'source':
            out.update(fp)
    if 'sha256' not in out:
        out.update(fp)
    write_data(cfg, 'audio', out)
    print(f'{src.name}: sha256 {fp["sha256"][:12]}…, {fp["bytes"]} bytes -> {j}')


def qa_plot(cfg, x, doc):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(24, 9), sharex=True)
    t = np.arange(len(doc['env']['rms'])) / FPS
    for k in ('rms', 'low', 'high'):
        ax[0].plot(t, doc['env'][k], lw=0.6, label=k)
    ax[0].legend()
    for s in doc['sections']:
        ax[0].axvline(s['start'], color='k')
        ax[0].text(s['start'], 1.02, s['name'])
    for k, c in (('kick', 'r'), ('snare', 'b'), ('hat', 'g')):
        on = np.array(doc['onsets'][k])
        if len(on):
            ax[1].vlines(on[:, 0], 0, on[:, 1], color=c, lw=0.6, label=k)
    ax[1].legend()
    ax[2].vlines(doc['beats'], 0, 0.5, color='0.6', lw=0.5)
    ax[2].vlines(doc['downbeats'], 0, 1, color='r', lw=1)
    ax[2].set_xlabel('s')
    f = cfg['_dir'] / 'data' / 'audio_qa.png'
    fig.savefig(f, dpi=80, bbox_inches='tight')
    print('plot', f)


if __name__ == '__main__':
    main()
