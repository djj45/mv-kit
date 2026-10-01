// roto-demo — the last chorus and the outro of P(doom), cut on the lyrics.
MV.timeline(({ lyrics, audio, cut, T0, T1 }) => {
  const chorus = lyrics.lines[lyrics.get('RLHF goes askew').i + 1];   // the "I'm upping my P(doom)" that follows
  const toSea = audio.beatBefore(chorus.words[0].start);
  return [
    { scene: 'cockpit', from: T0, to: cut('Hundred thousand GPU') },
    { scene: 'corridor', from: cut('Hundred thousand GPU'), to: toSea },
    { scene: 'sea', from: toSea, to: cut('What did Ilya see') },
    { scene: 'turn', from: cut('What did Ilya see'), to: T1 },
  ];
});
