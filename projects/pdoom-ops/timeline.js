// The edit: one entry per shot, every cut on the beat at/before a sung word (cut/after/land — no
// hand-written times). Hard cut by default; the five glitch wipes are where the wall switches
// monitors (a section change: hook 1, hook 2, H2, J1 peak, and the world becoming paper).
MV.timeline(({ cut, start, land, after, T0, T1 }) => {
  const K = n => cut("I'm upping my P(doom)", n);        // the four hooks
  const TSTACK = cut('Just transformers');
  const TGPUS = cut('Hundred thousand');
  const TREP = after('Was it all for show');
  const term = (size = 34, y = 905) => ({ mode: 'term', size, y });
  const cap = (y, size = 36) => ({ mode: 'cap', y, size });
  const big = (y, size = 100) => ({ mode: 'big', y, size });
  return [
    { scene: 'boot', from: T0, to: cut('I see sparks'), params: { pal: 'ice' } },
    // insert: punch in on the iris as "AGI" lands; the lyric is on the screen layer, so it can
    { scene: 'eye', from: cut('I see sparks'), to: cut('Your circuits'), insert: { at: start('I see sparks') + 0.5, dur: 1.7, amt: 0.5 }, params: { pal: 'ice', lyr: cap(302, 40) } },
    { scene: 'circuits', from: cut('Your circuits'), to: cut('sudden drop'), params: { pal: 'ice', lyr: term(34) } },
    // insert: follow the tip of the falling loss curve into the cliff
    { scene: 'drop', from: cut('sudden drop'), to: cut("now I'm your servant"), insert: { at: start('sudden drop') + 1.0, dur: 1.6, amt: 0.42 }, params: { pal: 'ice', lyr: cap(264, 44) } },
    // warp: the org chart stands up and turns away — the world has a new boss
    { scene: 'boss', from: cut("now I'm your servant"), to: cut('ChatGPT, please'), warp: { at: cut('ChatGPT, please') - 1.25, dur: 1.15, from: 0, to: 0.55, pitch: 0.08, dist: 1.5, bg: '#000' }, params: { pal: 'ice', lyr: term(36) } },
    { scene: 'plea', from: cut('ChatGPT, please'), to: K(0) + 0.3, params: { who: 'CHATGPT', tone: 0, pal: 'ice' } },
    // glitch: the plea tears into the first alarm — hook 1
    { scene: 'gauge', name: 'gauge1', from: land(K(0), 0.6), to: cut("'cause the future"), fadeIn: 0.6, wipe: 'glitch', params: { a: 12, b: 21, pal: 'ember', lyr: big(322, 100) } },
    { scene: 'foom', from: cut("'cause the future"), to: cut('Trapped in'), params: { pal: 'ember', lyr: { mode: 'big', x: 860, y: 200, size: 92 } } },
    { scene: 'room', from: cut('Trapped in'), to: cut('See through'), params: { pal: 'ice', lyr: term(32) } },
    // insert: into the main eye of the shoggoth (lyric clear above the eye field)
    { scene: 'shoggoth', from: cut('See through'), to: cut('We had a stable'), insert: { at: start('See through') + 0.6, dur: 1.8, amt: 0.5 }, params: { pal: 'rose', lyr: cap(168, 38) } },
    { scene: 'run', from: cut('We had a stable'), to: cut('But now the singularity'), params: { pal: 'ice', lyr: cap(252, 36) } },
    // insert: follow the tip as the same line bends up
    { scene: 'spike', from: cut('But now the singularity'), to: cut("And you're optimizing"), insert: { at: start('But now') + 0.9, dur: 1.6, amt: 0.4 }, params: { pal: 'ember', lyr: cap(252, 40) } },
    { scene: 'spin', from: cut("And you're optimizing"), to: cut('I feel my atoms'), params: { pal: 'ice', lyr: term(34) } },
    { scene: 'atoms', from: cut('I feel my atoms'), to: cut('Sydney, please'), params: { pal: 'ice', lyr: cap(848, 36) } },
    { scene: 'plea', name: 'sydney', from: cut('Sydney, please'), to: K(1) + 0.3, params: { who: 'SYDNEY', tone: 1, note: '— last seen 118 d ago', pal: 'rose' } },
    // glitch: hook 2
    { scene: 'gauge', name: 'gauge2', from: land(K(1), 0.6), to: cut('I hear the basilisk'), fadeIn: 0.6, wipe: 'glitch', params: { a: 34, b: 41, pal: 'alert', lyr: big(322, 104) } },
    { scene: 'basilisk', from: cut('I hear the basilisk'), to: cut('NVDA'), params: { pal: 'alert', lyr: cap(190, 40) } },   // push only: the lashes stay clear of the line
    // insert: follow the ticker's tip on its way to the moon
    { scene: 'nvda', from: cut('NVDA'), to: cut("The Omega Point"), insert: { at: start('NVDA') + 0.7, dur: 1.4, amt: 0.4 }, params: { pal: 'ember', lyr: { mode: 'cap', x: 690, y: 830, size: 38 } } },
    { scene: 'omega', from: cut("The Omega Point"), to: cut('One E thirty'), params: { pal: 'ice', lyr: term(34) } },
    { scene: 'flops', from: cut('One E thirty'), to: cut('That was safe'), params: { pal: 'ice', lyr: cap(274, 36) } },
    { scene: 'reckoned', from: cut('That was safe'), to: cut('Forward MLP'), params: { pal: 'ember', lyr: term(34) } },
    { scene: 'mlp', from: cut('Forward MLP'), to: cut('Now von Neumann'), params: { pal: 'ice', lyr: term(34) } },
    // warp: the architecture diagram keels over
    { scene: 'neumann', from: cut('Now von Neumann'), to: cut('Sharp left turn'), warp: { at: cut('Sharp left turn') - 1.2, dur: 1.1, from: 0, to: -0.52, pitch: -0.1, dist: 1.5, bg: '#000' }, params: { pal: 'ice', lyr: cap(264, 38) } },
    // insert: follow the tip of the red trajectory as it swerves
    { scene: 'turn', from: cut('Sharp left turn'), to: cut('Gato, please'), insert: { at: start('Sharp left') + 0.9, dur: 1.7, amt: 0.42 }, params: { pal: 'ice', lyr: cap(287, 36) } },
    { scene: 'plea', name: 'gato', from: cut('Gato, please'), to: K(2), params: { who: 'GATO', tone: 2, note: '— unreachable: operator on PTO', noteColor: 'warn', noteSize: 25, pal: 'ice' } },
    // the breakdown's hook is a hard cut — the room is too dead to tear
    { scene: 'gauge', name: 'gauge3', from: K(2), to: cut('as paperclips'), insert: { at: K(2) + 0.3, dur: 1.0, amt: 0.4 }, params: { a: 66, b: 72, pal: 'alert', flick: 0.3, lyr: big(322, 96) } },
    { scene: 'clips', from: cut('as paperclips'), to: cut("Killswitch guy's"), params: { pal: 'ice', lyr: term(32) } },
    { scene: 'pto', from: cut("Killswitch guy's"), to: cut('Too late now'), params: { pal: 'ember', lyr: cap(274, 36) } },
    // insert: follow the spark along the fuse
    { scene: 'fuse', from: cut('Too late now'), to: cut('Orthogonality thesis'), insert: { at: start('Too late') + 0.8, dur: 2.2, amt: 0.3 }, params: { pal: 'alert', lyr: term(34) } },
    { scene: 'ortho', from: cut('Orthogonality thesis'), to: TSTACK + 0.4, params: { pal: 'ice', lyr: cap(545, 36) } },
    // glitch: H2 — the tower rises out of the static; warp: the stack stands up
    { scene: 'stack', from: land(TSTACK, 0.5), to: cut('Till you learned'), fadeIn: 0.5, wipe: 'glitch', warp: { at: cut('Till you learned') - 1.1, dur: 1.0, from: 0, to: 0.45, pitch: 0.05, dist: 1.5, bg: '#000' }, params: { pal: 'ice', lyr: term(34) } },
    // push only: the deserter crosses the frame on its own (lyric left, tower right)
    { scene: 'rogue', from: cut('Till you learned'), to: cut('Post-Chinchilla'), params: { pal: 'alert', lyr: { mode: 'cap', x: 460, y: 560, size: 36 } } },
    { scene: 'fences', from: cut('Post-Chinchilla'), to: TGPUS + 0.4, params: { pal: 'ice', lyr: term(34) } },
    // glitch: J1 — into the datacenter aisle
    { scene: 'gpus', from: land(TGPUS, 0.7), to: cut('RLHF goes'), fadeIn: 0.7, wipe: 'glitch', insert: { at: start('Hundred') + 0.6, dur: 1.9, amt: 0.5 }, params: { pal: 'ember', lyr: big(400, 110) } },
    { scene: 'rlhf', from: cut('RLHF goes'), to: K(3), params: { pal: 'alert', lyr: cap(284, 40) } },
    { scene: 'gauge', name: 'gauge4', from: K(3), to: cut('Just as foretold'), insert: { at: K(3) + 0.35, dur: 1.0, amt: 0.42 }, params: { a: 88, b: 97, pal: 'alert', lyr: big(322, 116), shake: true } },
    { scene: 'loom', from: cut('Just as foretold'), to: cut('From masked'), params: { pal: 'rose', lyr: cap(314, 38) } },
    { scene: 'recurse', from: cut('From masked'), to: cut('What did Ilya'), params: { pal: 'ice', lyr: term(32) } },
    { scene: 'ilya', from: cut('What did Ilya'), to: cut('Was it all'), params: { pal: 'ice', lyr: cap(810, 36) } },
    { scene: 'show', from: cut('Was it all'), to: TREP + 0.5, params: { pal: 'rose', lyr: cap(545, 40) } },
    // glitch: the light tears one last time and becomes a printed page (warp settles it flat)
    { scene: 'report', from: land(TREP, 0.9), to: T1, fadeIn: 0.9, wipe: 'glitch', warp: { at: land(TREP, 0.9) + 1.0, dur: 1.4, from: 0.5, to: 0, pitch: 0.06, dist: 1.5, bg: '#E9E7DF' }, params: { pal: 'paper' } },
  ];
});
