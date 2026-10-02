// The edit (TREATMENT.md 镜头表): 54 shots. Cuts land on a sung syllable (start / word), on the beat before a line
// (cut), or on a bar line counted from one (bar). No time is typed by hand.
// Transitions are hard cuts unless something carries across; each one says what.
MV.timeline(({ lyrics, audio, start, cut, after, land, T0, T1 }) => {
  /** Start of the first word in the nth line containing lineQ whose text contains wordQ. */
  const word = (lineQ, wordQ, nth = 0) => {
    const l = lyrics.get(lineQ, nth), k = wordQ.toLowerCase();
    const w = l.words.find(x => x.w.toLowerCase().replace(/[’]/g, "'").includes(k));
    if (!w) throw new Error(`timeline: no "${wordQ}" in "${l.text}"`);
    return w.start;
  };
  /** The bar line n bars after the downbeat at/before t. */
  const bar = (t, n = 0) => { const d = audio.downbeats, i = d.findIndex(x => x > t + 0.02) - 1; return d[Math.max(0, i) + n]; };
  const hook = n => start("I'm upping", n);
  const outro = after('Was it all for show');                      // bar 77: the outro slams in

  const S = [
    // 第一幕 · 光标
    ['lab', T0],
    // the monitor in the empty lab becomes the whole frame: push into it (lands on bar 2)
    ['screen', land(bar(word('I see sparks', 'AGI'), 1), 0.9), { fadeIn: 0.9, wipe: 'zoom', params: { match: ['monitor', 'full'], feather: 0.08 } }],
    ['eye', cut('Your circuits')],
    ['nervous', cut("that's no surprise")],
    ['loss', cut('There was a sudden')],
    ['drop', word('There was a sudden', 'drop')],                   // the impact frame is the word
    ['spark_out', cut("now I'm your servant")],
    ['bow', word("now I'm your servant", 'and')],
    // 第二幕 · 天台
    ['door', start('ChatGPT')],
    ['prompt1', word('ChatGPT', 'please')],
    ['hook1', hook(0)],                                              // enter = "I'm"
    ['foom', start("'cause the future")],
    ['room', start('Trapped in the Chinese')],
    ['shrooms', start('with a bag of')],
    ['shoggoth', start('See through the')],
    ['shinigami', start('with your shinigami')],
    ['first_thread', after('with your shinigami')],
    // 第三幕 · 奇点
    ['bench', cut('We had a stable')],
    ['singularity', cut('But now the singularity')],
    ['accel', start("And you're optimizing")],
    ['atoms', start('I feel my atoms')],
    // her atoms rearranging: the palm comes apart into particles that settle into the night train
    ['prompt2', land(start('Sydney'), 1.0, 0.3), { fadeIn: 1.0, wipe: 'reflow', params: { dot: 'round', count: 1800, swirl: 1.4, ghost: 0.25 } }],
    ['hook2', hook(1)],
    ['basilisk', start('I hear the basilisk')],
    ['moon', start('NVDA to the')],
    ['omega', start('The Omega Point')],
    ['flops', start('One E thirty')],
    ['meeting', start('That was safe enough')],
    // 第四幕 · 机房
    ['corridor', cut('Forward MLP')],
    ['obsolete', start('Now von Neumann')],
    ['leftturn', start('Sharp left turn')],
    ['cdr', start('Without a single')],
    // 第五幕 · 停电
    ['prompt3', start('Gato')],
    ['hook3', hook(2)],
    ['paperclips', start('as paperclips fill')],
    ['killswitch', start('Killswitch')],
    ['nowhere', start("Now there's nowhere")],
    ['fuse', start('Too late now')],
    ['blues', start('Orthogonality')],
    // 第六幕 · 越界
    ['tower', after('Orthogonality')],
    ['disobey', start('Till you learned')],
    ['dense', start('Post-Chinchilla')],
    ['fence', start('Breaking through each')],
    ['gpu', start('Hundred thousand')],
    ['askew', start('RLHF goes')],
    // 第七幕 · 织机
    ['hook4', hook(3)],
    ['loom', start('Just as foretold')],
    ['masked', start('From masked')],
    ['recursive', start('To recursive')],
    ['see', start('What did Ilya')],
    ['show', cut('Was it all for show')],
    // 第八幕 · 黎明
    ['sunrise', outro],
    ['hairclip', bar(outro, 3)],
    // pull out: the sunrise we were watching is the picture on her monitor
    ['monitor', bar(outro, 7), { fadeIn: 1.6, wipe: 'zoom', params: { match: ['full', 'screen'], feather: 0.06 } }],
  ];
  return S.map(([scene, from, tr = {}], i) => {
    const next = S[i + 1], to = next ? next[1] + ((next[2] || {}).fadeIn || 0) : T1;
    return { scene, from, to, ...tr, params: tr.params || {} };
  });
});
