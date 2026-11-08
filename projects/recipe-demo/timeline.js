// Eight beats per exercise; actual seconds come from the score, not the recipe's reference FPS.
MV.timeline(({ audio, T0, T1, land }) => {
  const beat = n => audio.timeOfBeat(n), match = land(beat(40), 1);
  return [
    { id: 'recipe.path', scene: 'path', from: T0, to: beat(8),
      reads: [[T0, 'trace the route', 'tip'], [beat(5), 'the route is complete', 'tip']] },
    { id: 'recipe.steps', scene: 'steps', from: beat(8), to: beat(16),
      sync: [{ id: 'steps-enter', type: 'cut', at: beat(8),
        visual: { metric: 'change', roi: [0.35, 0.3, 0.3, 0.3] } },
        { id: 'value-change', type: 'action', at: beat(10),
          audio: { track: 'value-sfx', sourceAt: 0.2 },
          visual: { metric: 'change', roi: [0.35, 0.3, 0.3, 0.3] } }],
      reads: [[beat(8), 'read each value before the next change', 'value']] },
    { id: 'recipe.assemble', scene: 'assemble', from: beat(16), to: beat(24),
      sync: [{ id: 'assembly-enter', type: 'cut', at: beat(16),
        visual: { metric: 'change', roi: [0.35, 0.3, 0.3, 0.3] } }],
      reads: [[beat(16), 'assemble the structure', 'card'], [beat(19), 'fill in the labels', 'card']] },
    { id: 'recipe.focus', scene: 'focus', from: beat(24), to: beat(32), insert: { at: beat(26), dur: 1, amt: 0.45 },
      reads: [[beat(24), 'find the marker', 'marker'], [beat(26), 'follow it closer', 'marker']] },
    // push:0 keeps transition anchor coordinates exact; the orbit supplies motion before the zoom takes over.
    { id: 'recipe.portal', scene: 'portal', from: beat(32), to: match + 1, push: 0,
      reads: [[beat(32), 'find the disc we will enter', 'disc']] },
    // The same orange disc connects the two spaces. Retain the outgoing shot through the full overlap.
    { id: 'recipe.arrival', scene: 'arrival', from: match, to: T1, push: 0, fadeIn: 1, wipe: 'zoom',
      params: { match: ['disc', 'disc'], shape: 'round' },
      reads: [[match, 'enter the disc', 'disc'], [beat(42), 'read its new surroundings', 'disc']] },
  ];
});
