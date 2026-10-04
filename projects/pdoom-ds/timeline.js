// timeline.js — the cut. Every boundary is either a downbeat or the instant a specific word is sung: nothing here
// is a wall-clock second I liked the look of. Reading it top to bottom is reading the film: 49 shots, 16 chapters,
// one palette per chapter (ice = cold machine, ember = heat/training, rose = hallucination, alert = the hooks).
//
// Default is a hard cut. A transition has to have something crossing it:
//   · wipe 'glitch'  — the beat before a hook: the frame tears and the new shot comes through the tear
//   · wipe 'zoom'    — the same object at two scales (the loss curve, an iris becoming the whole screen)
//   · carry()        — dust that keeps flying across the cut, so the two shots are one continuous space
MV.timeline(({ lyrics, audio, cut, after, start, T0, T1 }) => {
  // Bar lines from the analysis, reused so the cut lands exactly on the grid the song was analysed to.
  const DB = audio.downbeats;
  const dbNear = (t) => audio.nearestDownbeat(t);
  const dbBefore = (t) => audio.beatBefore(t);
  // start of the k-th token of the line containing q (k = 0 is the first word)
  const wordAt = (q, k, nth = 0) => lyrics.get(q, nth).words[k].start;

  return [
    // ── 00:00–00:02.1  COLD OPEN ────────────────────────────────────────────────────────────────────────────
    { scene: 'title_rise', from: T0, to: DB[1], name: 'title' },

    // ── 00:02.1–00:07.7  I see sparks of AGI in your eyes ───────────────────────────────────────────────────
    { scene: 'agi_boot', from: DB[1], to: dbNear(lyrics.get('Your circuits').start), name: 'boot' },
    // hard cut on the downbeat: the eye we just built becomes the thing looking at us

    // ── 00:07.7–00:13.0  Your circuits make me nervous / that's no surprise ─────────────────────────────────
    // hard cut on the downbeat: the nerve net again, mirrored, for exactly as long as "that's no surprise" is sung
    { scene: 'nervous', from: dbNear(lyrics.get('Your circuits').start), to: DB[5] + 0.2, name: 'circuits' },   // the last 0.2 s dissolves under the twin
    // "that's no surprise" gets its own shot: the twin, from the instant the word is sung to the downbeat after
    { scene: 'pmirror', from: DB[4], to: DB[5] + 0.4, name: 'surprise', fadeIn: 0.25 },   // runs 0.2 s into the dissolve

    // ── 00:13.0–00:20.7  the loss falls / now I'm your servant ──────────────────────────────────────────────
    // hard cut into the instrument: the loss curve drops off the bottom of the frame and the camera follows
    { scene: 'loss_drop', from: DB[5] + 0.2, to: dbBefore(wordAt('servant', 3)), name: 'loss', fadeIn: 0.2 },
    { scene: 'servant', from: dbBefore(wordAt('servant', 3)), to: start('ChatGPT') + 0.4, name: 'kneel' },

    // ── 00:16.6–00:22.8  ChatGPT, please don't eat me alive ────────────────────────────────────────────────
    { scene: 'eat_alive', from: start('ChatGPT'), to: start('upping') + 0.5, name: 'eat',
      fadeIn: 0.4, carry: (g, k, e, t) => carryDust(g, k, t) },

    // ── 00:22.8–00:38.4  HOOK 1 + the Chinese room ─────────────────────────────────────────────────────────
    { scene: 'hook_pdoom', from: start('upping'), to: start('future goes'), name: 'hook1',
      fadeIn: 0.5, wipe: 'glitch' },                       // the drop lands inside a torn frame
    { scene: 'foom', from: start('future goes'), to: dbBefore(wordAt('Chinese room', 1)), name: 'foom' },
    { scene: 'room_cn', from: dbBefore(wordAt('Chinese room', 1)), to: start('shrooms'), name: 'room' },
    { scene: 'shrooms', from: start('shrooms'), to: start('shoggoth'), name: 'shrooms' },
    { scene: 'shoggoth', from: start('shoggoth'), to: start('shinigami'), name: 'shoggoth' },
    { scene: 'shinigami', from: start('shinigami'), to: DB[21], name: 'eyes' },

    // ── 00:38.4–00:53.0  the singularity ───────────────────────────────────────────────────────────────────
    { scene: 'stable_run', from: DB[21], to: dbNear(lyrics.get('singularity').start) + 0.4, name: 'stable' },
    { scene: 'singularity', from: dbNear(lyrics.get('singularity').start), to: start('optimizing'), name: 'singul',
      fadeIn: 0.35, wipe: 'zoom', params: { match: ['full', 'full'], shape: 'round', feather: 0.45 } },
    { scene: 'accel', from: start('optimizing'), to: start('atoms'), name: 'accel' },
    { scene: 'atoms', from: start('atoms'), to: start('Sydney'), name: 'atoms' },
    { scene: 'sydney', from: start('Sydney'), to: start('upping', 1) + 0.45, name: 'sydney' },

    // ── 00:53.0–01:09.8  HOOK 2 + the market ───────────────────────────────────────────────────────────────
    { scene: 'hook_pdoom', from: start('upping', 1), to: start('basilisk'), name: 'hook2', params: { n: 2 },
      fadeIn: 0.45, wipe: 'glitch' },
    { scene: 'basilisk', from: start('basilisk'), to: start('NVDA'), name: 'basilisk' },
    { scene: 'nvda', from: start('NVDA'), to: start('Omega'), name: 'nvda' },
    { scene: 'omega', from: start('Omega'), to: start('E thirty'), name: 'omega' },
    { scene: 'flops', from: start('E thirty'), to: start('safe enough'), name: 'flops' },
    { scene: 'reckoned', from: start('safe enough'), to: dbNear(lyrics.get('Forward MLP').start), name: 'reckoned' },
    { scene: 'backprop', from: dbNear(lyrics.get('Forward MLP').start), to: start('von Neumann'), name: 'backprop' },
    { scene: 'obsolete', from: start('von Neumann'), to: start('Sharp left'), name: 'obsolete' },
    { scene: 'leftturn', from: start('Sharp left'), to: start('CDR'), name: 'leftturn' },
    { scene: 'no_cdr', from: start('CDR'), to: start('Gato'), name: 'cdr' },

    // ── 01:09.3–01:29.3  the quiet middle: the three pleas ─────────────────────────────────────────────────
    { scene: 'prompt_plea', from: start('Gato'), to: start('upping', 2), name: 'gato' },
    // the instrumental runs under the whole first half of this hook: hard cut, and the glitch tears in over black
    { scene: 'hook_pdoom', from: start('upping', 2), to: start('paperclips'), name: 'hook3', params: { n: 3 } },
    { scene: 'paperclips', from: start('paperclips'), to: start('Killswitch'), name: 'clips' },
    { scene: 'killswitch', from: start('Killswitch'), to: start('nowhere'), name: 'killswitch' },
    { scene: 'nowhere', from: start('nowhere'), to: start('Too late'), name: 'nowhere' },
    { scene: 'fuse', from: start('Too late'), to: start('Orthogonality'), name: 'fuse' },
    { scene: 'blues', from: start('Orthogonality'), to: dbNear(lyrics.get('Just transformers').start), name: 'blues' },

    // ── 01:49.3–02:12.0  the last stretch: loudest, fastest, most detailed ─────────────────────────────────
    { scene: 'transformers', from: dbNear(lyrics.get('Just transformers').start), to: start('disobey'), name: 'tx' },
    { scene: 'disobey', from: start('disobey'), to: start('Post-Chinchilla'), name: 'disobey' },
    { scene: 'dense', from: start('Post-Chinchilla'), to: start('Breaking'), name: 'dense' },
    { scene: 'fence', from: start('Breaking'), to: start('Hundred'), name: 'fence' },
    { scene: 'gpu', from: start('Hundred'), to: start('RLHF'), name: 'gpu' },
    { scene: 'askew', from: start('RLHF'), to: start('upping', 3) + 0.4, name: 'askew' },
    { scene: 'hook_pdoom', from: start('upping', 3), to: start('foretold'), name: 'hook4', params: { n: 4 },
      fadeIn: 0.4, wipe: 'glitch' },
    { scene: 'loom', from: start('foretold'), to: start('masked'), name: 'loom' },
    { scene: 'masked', from: start('masked'), to: start('recursive'), name: 'masked' },
    { scene: 'recursive', from: start('recursive'), to: dbBefore(wordAt('Ilya', 2)), name: 'rsi' },
    { scene: 'ilya', from: dbBefore(wordAt('Ilya', 2)), to: start('all for show'), name: 'ilya' },

    // ── 02:17.4–02:29.5  out ───────────────────────────────────────────────────────────────────────────────
    { scene: 'show', from: start('all for show'), to: T1, name: 'show' },
  ];
});
