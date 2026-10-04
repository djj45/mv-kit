// The edit — 38 transparencies. Every cut is computed from the lyrics and the beat grid (cut / after), never from
// hand-written seconds. Four transitions in the whole film; each one is commented. Everything else is a hard cut.
// In the lecture half of the film (0–106 s) every cut also drops a new sheet on the glass (swap: the shadow of the
// fresh acetate leaving the frame), so the film reads as one transparency after another.
MV.timeline(({ cut, after, T0, T1 }) => {
  const C = {
    circuit: cut('Your circuits'),                 // ~5.70
    loss: cut('sudden drop'),                      // ~9.34   (match cut: the contact in the circuit -> the loss curve)
    boss: cut('your servant'),                     // ~12.98
    mouth: after('my boss'),                       // ~16.61
    hook1: cut('upping my P(doom)'),               // ~22.73
    foom: cut('future goes FOOM'),                 // ~24.34
    chinese: cut('Trapped in the Chinese'),        // ~26.34
    shoggoth: cut('shoggoth'),                     // ~29.89
    eyes: cut('shinigami'),                        // ~33.43
    stable: cut('stable training'),                // ~38.61
    optimize: cut('optimizing'),                   // ~45.07
    atoms: cut('atoms'),                           // ~49.52
    sydney: cut('Sydney'),                         // ~52.79
    hook2: cut('upping my P(doom)', 1),            // ~59.11
    basilisk: cut('basilisk'),                     // ~60.57
    moon: cut('NVDA'),                             // ~62.52
    flops: cut('One E thirty'),                    // ~66.20
    reckoned: cut('safe enough'),                  // ~69.75
    net: cut('Forward MLP'),                       // ~74.02
    leftturn: cut('Sharp left turn'),              // ~81.20
    cdr: cut('single CDR'),                        // ~85.00
    gato: cut('Gato'),                             // ~89.25
    hook3: cut('upping my P(doom)', 2),            // ~95.44
    clips: cut('paperclips fill'),                 // ~96.84
    fuse: cut('Killswitch'),                       // ~98.82
    ortho: cut('Orthogonality'),                   // ~105.94
    transformers: cut('Just transformers'),        // ~110.16
    fence: cut('Chinchilla'),                      // ~115.18
    gpu: cut('Hundred thousand'),                  // ~118.73
    rlhf: cut('RLHF'),                             // ~120.75
    hook4: cut('upping my P(doom)', 3) - 0.9,      // two beats early: the reflow has finished before the line starts
    loom: cut('Loom'),                             // ~126.11
    ilya: cut('Ilya'),                             // ~132.00
    show: cut('for show'),                         // ~139.79
  };
  return [
    { scene: 'room', from: T0, to: C.circuit },                                                  // SHEET 01 - I see sparks of AGI in your eyes
    { scene: 'circuit', from: C.circuit, to: C.loss + 0.7, swap: true },                         // 02 - your circuits / that's no surprise
    // zoom: a real push-in, not a slide. The red contact in the circuit IS the first point of the loss curve - the
    // axes of the next shot are placed so that the curve starts exactly where that dot is (820, 470), and the
    // anchor in the new shot is 2.7x the dot: the dot opens up into the whole transparency.
    { scene: 'loss', from: C.loss, to: C.boss, fadeIn: 0.7, wipe: 'zoom', params: { match: ['node', 'start'], shape: 'round', feather: 0.3 } },
    { scene: 'boss', from: C.boss, to: C.mouth, swap: true },                                    // 04 - servant / boss
    { scene: 'mouth', from: C.mouth, to: C.hook1, swap: true },                                  // 05 - don't eat me alive
    { scene: 'hook', from: C.hook1, to: C.foom, params: { n: 1 }, swap: true, insert: { at: C.hook1 + 0.6, dur: 1.1, amt: 0.16 } },   // 06
    { scene: 'foom', from: C.foom, to: C.chinese, swap: true },                                  // 07 - FOOM
    { scene: 'chinese', from: C.chinese, to: C.shoggoth, swap: true },                           // 08 - the Chinese room
    { scene: 'shoggoth', from: C.shoggoth, to: C.eyes, swap: true },                             // 09 - the shoggoth's lies
    { scene: 'eyes', from: C.eyes, to: C.stable, swap: true },                                   // 10 - shinigami eyes
    { scene: 'stable', from: C.stable, to: C.optimize, swap: true },                             // 11 - a stable run / the singularity
    { scene: 'optimize', from: C.optimize, to: C.atoms, swap: true, insert: { at: C.optimize + 2.2, dur: 1.6, amt: 0.22 } },          // 12
    { scene: 'atoms', from: C.atoms, to: C.sydney, swap: true, insert: { at: C.atoms + 1.4, dur: 1.6, amt: 0.2 } },                   // 13
    { scene: 'sydney', from: C.sydney, to: C.hook2, swap: true, insert: { at: C.sydney + 3.0, dur: 1.6, amt: 0.28 } },                // 14
    { scene: 'hook', from: C.hook2, to: C.basilisk, params: { n: 2 }, swap: true, insert: { at: C.hook2 + 0.4, dur: 1.0, amt: 0.18 } },// 15
    { scene: 'basilisk', from: C.basilisk, to: C.moon, swap: true },                             // 16 - the basilisk
    { scene: 'moon', from: C.moon, to: C.flops, swap: true, insert: { at: C.moon + 2.4, dur: 1.6, amt: 0.3 } },                       // 17
    { scene: 'flops', from: C.flops, to: C.reckoned, swap: true },                               // 18 - 1e30 FLOPs
    { scene: 'reckoned', from: C.reckoned, to: C.net, swap: true },                              // 19 - safe enough, we reckoned
    { scene: 'net', from: C.net, to: C.leftturn, swap: true, insert: { at: C.net + 4.0, dur: 1.4, amt: 0.2 } },                       // 20 - MLP / von Neumann
    { scene: 'leftturn', from: C.leftturn, to: C.cdr, swap: true, insert: { at: C.leftturn + 2.0, dur: 1.4, amt: 0.26 } },            // 21 - sharp left turn
    { scene: 'cdr', from: C.cdr, to: C.gato, swap: true, insert: { at: C.cdr + 2.6, dur: 1.5, amt: 0.3 } },                           // 22 - without a single CDR
    { scene: 'gato', from: C.gato, to: C.hook3, swap: true },                                    // 23 - Gato, please don't let me go
    { scene: 'hook', from: C.hook3, to: C.clips, params: { n: 3 }, swap: true, insert: { at: C.hook3 + 0.4, dur: 1.0, amt: 0.2 } },   // 24
    { scene: 'clips', from: C.clips, to: C.fuse, swap: true },                                   // 25 - as paperclips fill the room
    { scene: 'fuse', from: C.fuse, to: C.ortho, swap: true, insert: { at: C.fuse + 4.4, dur: 2.0, amt: 0.26 } },                      // 26 - PTO / the fuse
    { scene: 'ortho', from: C.ortho, to: C.transformers, swap: true },                           // 27 - orthogonality
    // warp: the bridge is over - the flat sheet swings out of 3D as the alarm section comes in
    { scene: 'transformers', from: C.transformers, to: C.fence, warp: { at: C.transformers, dur: 1.1, from: 0.62, to: 0, pitch: 0.06, dist: 1.5, bg: '#0B0E14' } },
    { scene: 'fence', from: C.fence, to: C.gpu, insert: { at: C.fence + 3.4, dur: 1.4, amt: 0.22 } },                     // 29 - through the fence
    { scene: 'gpu', from: C.gpu, to: C.rlhf, insert: { at: C.gpu + 2.4, dur: 1.2, amt: 0.3 } },                           // 30 - a hundred thousand GPU
    { scene: 'rlhf', from: C.rlhf, to: C.hook4 + 1.0 },                                          // 31 - RLHF goes askew (runs under the reflow)
    // reflow: the preference dots that just came apart fly into the strokes of the hook and settle
    { scene: 'hook', from: C.hook4, to: C.loom, params: { n: 4 }, fadeIn: 1.0, wipe: 'reflow', insert: { at: C.hook4 + 1.5, dur: 1.2, amt: 0.3 } },
    { scene: 'loom', from: C.loom, to: C.ilya, insert: { at: C.loom + 3.4, dur: 1.8, amt: 0.24 } },                       // 33 - the Loom
    { scene: 'ilya', from: C.ilya, to: C.show, insert: { at: C.ilya + 3.2, dur: 2.0, amt: 0.22 } },                       // 34 - what did Ilya see
    { scene: 'show', from: C.show, to: 143.88 },                                                 // 35 - was it all for show
    { scene: 'lampoff', from: 143.88, to: 150.0 },                                               // 36 - the hand switches the lamp off
    // cross-fade 0.91 s (two beats): the same room just after the light goes; nothing crosses the cut, it cools
    { scene: 'after', from: 148.884, to: 152.5, fadeIn: 0.909 },                                 // 37 - the empty glass
    { scene: 'endcard', from: 152.5, to: T1 },                                                   // 38 - the end card
  ];
});
