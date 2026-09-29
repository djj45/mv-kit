// Cues: everything the shots need to know about the lyrics, found by content (never hard-coded times).
const D = MV_DATA.lyrics;
const line = q => { const l = D.lines.find(l => l.text.toLowerCase().includes(q.toLowerCase())); if (!l) throw new Error('line ' + q); return l; };
const L_PLEA = line('ChatGPT, please'), L_HOOK = line('upping my'), L_FOOM = line('future goes');
const wChat = L_PLEA.words[0], [wPlease, wDont, wEat, wMe, wAlive] = L_PLEA.words.slice(1);
const SYL = wChat.syl; // Chat · G · P · T,
const T0 = MV_PROJECT.from, T1 = MV_PROJECT.to;
const CUT = { s1: T0, s2: SYL[2][0], s3: wPlease.start, s3b: wEat.start, s4: wAlive.start, s5: L_HOOK.words[0].start, s6: L_FOOM.words[0].start };
const FOOM = L_FOOM.words[L_FOOM.words.length - 1];
const smart = s => s.replace(/'/g, '’');
const TOK = {
  chat: ['Chat', 'G', 'P', 'T,'].map((s, i) => ({ text: s, start: SYL[i][0], end: SYL[i][1], join: i < 3 })),
  plea: [wPlease, wDont, wEat, wMe].map(w => ({ text: smart(w.w), start: w.start, end: w.end })),
  cause: L_FOOM.words.slice(0, -1).map(w => ({ text: smart(w.w), start: w.start, end: w.end })),
};

const JP = { plea: 'ChatGPT、お願い　生きたまま食べないで', hook: '私の P(doom)、上方修正', foom: 'だって未来が　FOOM　するから' };
