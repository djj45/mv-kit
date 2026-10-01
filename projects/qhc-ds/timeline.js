// 剪辑：按 TREATMENT.md 的镜头表来。切点全部由歌词和节拍算出，不手写秒数。
// 主歌每镜 2 小节（幕后：刻、上色），副歌每镜 4 小节（幕前：雨、江、捞月），全片 11 个镜头。
MV.timeline(({ lyrics, audio, T0, T1, cut, after, start }) => [
  { scene: 'lamp',      from: T0, to: cut('素胚') },                        // 点灯
  { scene: 'carve',     from: cut('素胚'), to: cut('瓶身') },      // 走刀
  { scene: 'rouge',     from: cut('瓶身'), to: cut('冉冉') },      // 点朱砂
  { scene: 'smoke',     from: cut('冉冉'), to: cut('宣纸') }, // 檀香、窗格
  { scene: 'half',      from: cut('宣纸'), to: cut('釉色') }, // 搁刀
  { scene: 'dye',       from: cut('釉色'), to: cut('你的') },      // 上色
  { scene: 'drift',     from: cut('你的'), to: audio.downbeatBefore(start('天青')) },   // 穿幕
  { scene: 'rain_wait', from: audio.downbeatBefore(start('天青')), to: cut('在瓶') },      // 副歌硬切
  { scene: 'inscribe',  from: cut('在瓶'), to: cut('天青', 1) },        // 刻字 / 伏笔
  { scene: 'moon',      from: cut('天青', 1), to: cut('如传') }, // 捞月
  { scene: 'smile',     from: cut('如传'), to: T1 },               // 最后一刀
]);
