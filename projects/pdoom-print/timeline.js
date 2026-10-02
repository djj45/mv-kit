// The edit. Every boundary is a downbeat / beat found from the lyric it belongs to (cut = the beat at or before the
// line's first word), never a typed second. All cuts are hard: on paper a new page is a new page. Page numbers for
// the running header are the shot's place in the film.
MV.timeline(({ T0, T1, cut, start, after, audio, lyrics }) => {
  const E = [
    // ---- section 1: intro verse, pre-chorus, first hook
    { scene: 'jobcard', from: T0, to: audio.downbeatBefore(start('Your circuits')) },        // the separator page; AGI lands on "AGI"
    { scene: 'eye', from: audio.downbeatBefore(start('Your circuits')), to: cut('There was a sudden') },
    { scene: 'loss', from: cut('There was a sudden'), to: cut("now I'm your servant") },
    { scene: 'boss', from: cut("now I'm your servant"), to: cut('ChatGPT') },
    { scene: 'maw', from: cut('ChatGPT'), to: cut('upping my P(doom)') },                       // jaws shut on "alive"
    { scene: 'pdoom', from: cut('upping my P(doom)'), to: cut('the future goes'), params: { n: 1 } },
    { scene: 'foom', from: cut('the future goes'), to: cut('Trapped in the Chinese') },
    { scene: 'room', from: cut('Trapped in the Chinese'), to: cut("See through the shoggoth") }, // the room, then the shrooms warp it
    { scene: 'shoggoth', from: cut("See through the shoggoth"), to: cut('shinigami') },
    { scene: 'shinigami', from: cut('shinigami'), to: audio.downbeatBefore(start('stable training run')) }, // ends in a slew
    // ---- section 2: second verse, Sydney, second hook
    { scene: 'stable', from: audio.downbeatBefore(start('stable training run')), to: cut('singularity') },  // the slew lands here
    { scene: 'singularity', from: cut('singularity'), to: cut("you're optimizing") },
    { scene: 'accel', from: cut("you're optimizing"), to: cut('atoms rearranging') },                  // the camera lies down on "accelerating"
    { scene: 'atoms', from: cut('atoms rearranging'), to: cut('Sydney') },
    { scene: 'sydney', from: cut('Sydney'), to: cut('upping my P(doom)', 1) },
    { scene: 'pdoom', from: cut('upping my P(doom)', 1), to: cut('basilisk'), params: { n: 2 } },
    { scene: 'basilisk', from: cut('basilisk'), to: cut('NVDA') },
    { scene: 'moon', from: cut('NVDA'), to: start('Omega Point') },                                     // the camera climbs the chart to the moon
    { scene: 'omega', from: start('Omega Point'), to: cut('One E thirty') },     // cut on "The": "moon" needs its frames
    { scene: 'flops', from: cut('One E thirty'), to: cut('That was safe enough') },
    // ---- section 3: third verse, Sharp left turn, Gato (the breakdown begins)
    { scene: 'reckoned', from: cut('That was safe enough'), to: cut('Forward MLP') },
    { scene: 'mlp', from: cut('Forward MLP'), to: cut('von Neumann') },
    { scene: 'neumann', from: cut('von Neumann'), to: cut('Sharp left turn') },
    { scene: 'leftturn', from: cut('Sharp left turn'), to: cut('Without a single') },              // the camera rolls on "turn"
    { scene: 'cdr', from: cut('Without a single'), to: cut('Gato') },
    { scene: 'gato', from: cut('Gato'), to: cut('upping my P(doom)', 2) },
    // ---- section 4: the third hook, in the breakdown, and the build
    { scene: 'pdoom', from: cut('upping my P(doom)', 2), to: cut('paperclips fill'), params: { n: 3 } },
    { scene: 'clips', from: cut('paperclips fill'), to: start('Killswitch') },                     // on the word: "room" needs its frames
    { scene: 'pto', from: start('Killswitch'), to: cut('nowhere left') },
    { scene: 'maze', from: cut('nowhere left'), to: start('Too late now') },                        // on the word: "go" needs its frames
    { scene: 'fuse', from: start('Too late now'), to: cut('Orthogonality') },
    { scene: 'blues', from: cut('Orthogonality'), to: cut('Just transformers') },                   // ends in the build
    // ---- section 5: the drop
    { scene: 'stack', from: cut('Just transformers'), to: start('Till you learned') },              // on the word: "way!" needs its frames
    { scene: 'disobey', from: start('Till you learned'), to: cut('Post-Chinchilla') },
    { scene: 'dense', from: cut('Post-Chinchilla'), to: cut('Breaking through') },
    { scene: 'fence', from: cut('Breaking through'), to: start('Hundred thousand') },               // on the word: "fence" needs its frames
    { scene: 'gpus', from: start('Hundred thousand'), to: cut('RLHF') },
    { scene: 'askew', from: cut('RLHF'), to: cut('upping my P(doom)', 3) },
    // ---- section 6: the last hook, the end
    { scene: 'pdoom', from: cut('upping my P(doom)', 3), to: cut('foretold by Loom'), params: { n: 4 } },
    { scene: 'loom', from: cut('foretold by Loom'), to: start('From masked') },                     // on the word: "Loom" needs its frames
    { scene: 'masked', from: start('From masked'), to: cut('recursive self-upgrade') },
    { scene: 'recursive', from: cut('recursive self-upgrade'), to: cut('What did Ilya') },
    { scene: 'ilya', from: cut('What did Ilya'), to: cut('Was it all for show') },
    { scene: 'show', from: cut('Was it all for show'), to: audio.downbeatBefore(start('Was it all for show') + 3) },
    { scene: 'runout', from: audio.downbeatBefore(start('Was it all for show') + 3), to: audio.downbeatBefore(152.9 + 0.1) },   // the instrumental slams back on this downbeat
    { scene: 'eoj', from: audio.downbeatBefore(152.9 + 0.1), to: T1 },
  ];
  return E.map((e, i) => ({ ...e, params: { page: i + 1, ...(e.params || {}) } }));
});
