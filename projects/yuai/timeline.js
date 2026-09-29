// 雨爱 — the edit (see TREATMENT.md, shot table). Cuts come from the lyrics and the beat grid.
// Unfinished shots use the 'draft' scene with their final name in params.
MV.timeline(({ cut, T0, T1 }) => {
  const shots = [
    ['paper_drop', T0],
    ['cloud_faces', cut('就像是')],
    ['window_rain', cut('下雨了')],
    ['glass_blur', cut('看不清')],
    ['leave', cut('离开你'), { fadeIn: 0.75, wipe: 'wash', params: { dir: -1 } }],
    ['tear_in', cut('我的泪'), { fadeIn: 0.75, wipe: 'ink', params: { wx: 650, wy: 365 } }],
    ['drops', cut('听雨的声音')],
    ['breath_seep', cut('你的呼吸')],
    ['her_view', cut('真希望', 0), { fadeIn: 0.75, wipe: 'ink', params: { wx: 960, wy: 540 } }],
    ['umbrella', cut('Rainie'), { fadeIn: 0.4 }],
    ['memory_fog', cut('窗外的雨滴'), { fadeIn: 0.5, wipe: 'wash', params: { dir: -1, part: 'eave' } }],
    ['memory_fog', cut('屋内的湿气'), { fadeIn: 0.6, wipe: 'ink', params: { part: 'fog', wx: 860, wy: 900 } }],
    ['his_view', cut('真希望', 1), { fadeIn: 0.75, wipe: 'wash', params: { dir: 1 } }],
    ['rainbow', cut('我相信'), { fadeIn: 0.75, wipe: 'wash', params: { dir: 1 } }],
  ];
  const done = new Set(Object.keys(MV.scenes));
  // a shot with fadeIn starts on its cut and the previous one runs on underneath it for that long
  return shots.map(([name, from, tr = {}], i) => {
    const next = shots[i + 1], to = next ? next[1] + ((next[2] || {}).fadeIn || 0) : T1;
    return { scene: done.has(name) ? name : 'draft', name, from, to, fadeIn: tr.fadeIn, wipe: tr.wipe,
      params: { n: i + 1, label: name, ...(tr.params || {}) } };
  });
});
