// mv-kit — the song data: word-level lyrics and the audio analysis (beats, bars, sections, onsets, envelopes).
// Both come from analysis/*.py as data/lyrics.js and data/audio.js (window.MV_DATA.lyrics / .audio).
(function (G) {
'use strict';
const MV = G.MV;

const smart = s => s.replace(/(^|\s)'(cause|cos|til|em|round|bout|n|tis|twas)\b/gi, '$1’$2').replace(/(^|[\s(\[“])'/g, '$1‘').replace(/'/g, '’').replace(/(^|[\s(\[])"/g, '$1“').replace(/"/g, '”');
const norm = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

class Lyrics {
  constructor(doc) {
    this.lines = (doc && doc.lines ? doc.lines : []).map((l, i) => ({
      ...l, i, text: smart(l.text),
      words: (l.words || []).map((w, j) => ({ ...w, w: smart(w.w), line: i, j })),
    }));
    this.words = this.lines.flatMap(l => l.words);
  }
  /** The nth line containing q (case-insensitive; straight or curly quotes). Throws if missing, so a typo fails loudly. */
  get(q, nth = 0) {
    const hits = this.lines.filter(l => norm(l.text).includes(norm(q)));
    if (!hits[nth]) throw new Error(`lyrics.get: no line #${nth} containing "${q}"`);
    return hits[nth];
  }
  has(q) { return this.lines.some(l => norm(l.text).includes(norm(q))); }
  /** All words equal to q (punctuation ignored). */
  findWords(q) { const k = norm(q).replace(/[^\p{L}\p{N}']/gu, ''); return this.words.filter(w => norm(w.w).replace(/[^\p{L}\p{N}']/gu, '') === k); }
  /** The line being sung at t (or the last one started). */
  lineAt(t) { let cur = null; for (const l of this.lines) if (l.start <= t) cur = l; return cur && t <= cur.end + 0.5 ? cur : null; }
  wordAt(t) { return this.words.find(w => t >= w.start && t < w.end) || null; }
  /** 0..1 sung progress of a word. */
  static wordProgress(w, t) { return clamp((t - w.start) / Math.max(1e-3, w.end - w.start)); }
  /** Tokens for karaoke display: [{text, start, end, join}] — syllables if a word has `syl` and opts.syl. */
  tokens(line, opts = {}) {
    const out = [];
    for (const w of line.words) {
      if (opts.syl && w.syl && opts.split && opts.split[w.w]) {
        opts.split[w.w].forEach((s, i) => out.push({ text: s, start: w.syl[i][0], end: w.syl[i][1], join: i < w.syl.length - 1, word: w }));
      } else out.push({ text: w.w, start: w.start, end: w.end, join: !!w.join, word: w });
    }
    return out;
  }
}

class Audio {
  constructor(doc, fallback = {}) {
    if (!doc) { // no analysis yet: a plain 4/4 grid at the project's bpm
      const bpm = fallback.bpm || 120, P = 60 / bpm, dur = fallback.duration || 600;
      doc = { bpm, duration: dur, beats: [], downbeats: [], sections: [], fps: 100, env: {}, onsets: {} };
      for (let t = 0; t < dur; t += P) doc.beats.push(t);
      doc.downbeats = doc.beats.filter((_, i) => i % 4 === 0);
      this.missing = true;
    }
    const { env, onsets, ...rest } = doc; // keep the data's `env` from shadowing the env() method
    Object.assign(this, rest);
    this.meter = doc.meter || 4;
    this.env_ = env || {};
    this.onsets = onsets || {};
  }
  /** Continuous beat index at t (beat i at beats[i]); extrapolates with the mean period. */
  beatAt(t) {
    const b = this.beats, n = b.length; if (!n) return t * this.bpm / 60;
    const P = 60 / this.bpm;
    if (t <= b[0]) return (t - b[0]) / P;
    if (t >= b[n - 1]) return n - 1 + (t - b[n - 1]) / P;
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
    return lo + (t - b[lo]) / (b[hi] - b[lo]);
  }
  timeOfBeat(i) {
    const b = this.beats, n = b.length, P = 60 / this.bpm; if (!n) return i * P;
    if (i <= 0) return b[0] + i * P; if (i >= n - 1) return b[n - 1] + (i - n + 1) * P;
    const k = Math.floor(i); return lerp(b[k], b[k + 1], i - k);
  }
  /** Bar index at t (bar k starts at downbeats[k]) and phase 0..1 within the bar. */
  barAt(t) {
    const d = this.downbeats; if (!d.length) return this.beatAt(t) / this.meter;
    if (t < d[0]) return (this.beatAt(t) - this.beatAt(d[0])) / this.meter;
    let k = 0; while (k + 1 < d.length && d[k + 1] <= t) k++;
    const next = k + 1 < d.length ? d[k + 1] : this.timeOfBeat(this.beatAt(d[k]) + this.meter);
    return k + (t - d[k]) / (next - d[k]);
  }
  nearestBeat(t) { return this.timeOfBeat(Math.round(this.beatAt(t))); }
  beatBefore(t, tol = 0.02) { return this.timeOfBeat(Math.floor(this.beatAt(t + tol))); }
  nearestDownbeat(t) { return this.downbeats.reduce((b, d) => (Math.abs(d - t) < Math.abs(b - t) ? d : b), this.downbeats[0] ?? t); }
  downbeatBefore(t, tol = 0.02) { let r = this.downbeats[0] ?? t; for (const d of this.downbeats) if (d <= t + tol) r = d; return r; }
  section(t) { return (this.sections || []).find(s => t >= s.start && t < s.end) || null; }
  /** Envelope value 0..1 at t: rms | low | mid | high (+ vocals | drums | bass | other with stems). */
  env(name, t) {
    const e = this.env_[name]; if (!e || !e.length) return 0;
    const x = t * (this.fps || 100), i = Math.floor(x); if (i < 0) return e[0]; if (i >= e.length - 1) return e[e.length - 1];
    return lerp(e[i], e[i + 1], x - i);
  }
  /** Onsets of a kind ('kick' | 'snare' | 'hat' | 'vocal' | 'onset') in [t0, t1): [{t, s}] with strength s 0..1. */
  events(kind, t0, t1) { return (this.onsets[kind] || []).filter(o => o[0] >= t0 && o[0] < t1).map(o => ({ t: o[0], s: o[1] })); }
  /** Decaying pulse from the most recent onsets of a kind (exponential, halfLife seconds). */
  hit(kind, t, halfLife = 0.12) {
    const on = this.onsets[kind]; if (!on) return 0; let v = 0;
    for (let i = on.length - 1; i >= 0; i--) { const dt = t - on[i][0]; if (dt < 0) continue; if (dt > halfLife * 8) break; v = Math.max(v, on[i][1] * Math.pow(0.5, dt / halfLife)); }
    return v;
  }
}

MV.Lyrics = Lyrics; MV.Audio = Audio; MV.smart = smart;
})(window);
