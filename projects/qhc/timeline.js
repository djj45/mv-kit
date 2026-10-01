// 青花瓷 — the edit (see TREATMENT.md, shot table). Cuts come from the lyrics and the beat grid.
// Shots not painted yet play the 'draft' scene under their own name.
MV.timeline(({ cut, start, after, T0, T1 }) => {
  const shots = [
    ['supi', T0],
    ['bifeng', start('笔锋')],
    ['tanxiang', cut('冉冉檀香')],
    ['gezhi', cut('宣纸上'), { fadeIn: 0.45 }],
    ['shiyou', cut('釉色渲染'), { fadeIn: 0.5 }],
    ['hanbao', cut('而你嫣然')],
    ['fengyao', cut('你的美')],
    ['yaohuo', after('去到')],
    ['tianqing', start('天青')],
    ['chuiyan', cut('炊烟')],
    ['pingdi', cut('在瓶底')],
    ['fubi', cut('就当我')],
    ['shuidi', cut('天青', 1)],
    ['laoyue', cut('月色')],
    ['chuanshi', cut('如传世'), { fadeIn: 0.4 }],
    ['xiaoyi', cut('你眼')],
  ];
  const done = new Set(Object.keys(MV.scenes));
  return shots.map(([name, from, tr = {}], i) => {
    const next = shots[i + 1], to = next ? next[1] + ((next[2] || {}).fadeIn || 0) : T1;
    return { scene: done.has(name) ? name : 'draft', name, from, to, fadeIn: tr.fadeIn, wipe: tr.wipe,
      params: { n: i + 1, label: name, ...(tr.params || {}) } };
  });
});
