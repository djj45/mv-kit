// 《减版》的剪辑。切点全部由歌词和节拍算出（cut / after），没有手写秒数。
// 运镜：camera kit 的缓推全片默认开；条目上的 insert / warp 按下面的注释分配；CAM.keep 在场景里。
// 转场：除了 14 和 44 的 warp（两张纸立起来转走），全部硬切——理由写在每一行后面。
// 《减版》= 一块被逐次刻掉的版：副歌一最满，副歌三几乎空了，副歌四看到刀，然后全白。
MV.timeline(function (H) {
  const cut = H.cut, after = H.after, T0 = H.T0, T1 = H.T1, audio = H.audio;
  const C = function (q, n) { return cut(q, n || 0); };
  // insert 的 at 是歌曲时间（camera kit 用绝对 t），所以从这一镜的 from 起算
  const IN = function (from, at, dur, amt) { return { insert: { at: from + at, dur: dur, amt: amt } } };
  const out = [];
  const S = function (scene, from, to, params, extra) {
    const e = { scene: scene, from: from, to: to };
    if (params) e.params = params;
    if (extra) for (const k in extra) e[k] = extra[k];
    out.push(e);
  };

  const a0 = T0;                                        // 前奏：版角，没有词
  const a1 = C('I see sparks');                          // 0
  const a2 = C('Your circuits');                         // 1
  const a3 = C("that's no surprise");                    // 2
  const a4 = C('There was a sudden drop');               // 3
  const a5 = C("now I'm your servant");                  // 4
  const a6 = C('ChatGPT');                               // 5
  const a7 = C("I'm upping my P(doom)", 0);              // 6 副歌一
  const a8 = C("'cause the future goes FOOM");           // 7
  const a9 = C('Trapped in the Chinese room');           // 8
  const a10 = C('with a bag of shrooms');                // 9
  const a11 = C("See through the shoggoth");             // 10
  const a12 = C('with your shinigami eyes');             // 11
  const a13 = C('We had a stable training run');         // 12
  const a14 = C("But now the singularity");              // 13
  const a15 = C("And you're optimizing");                // 14
  const a16 = C('I feel my atoms rearranging');          // 15
  const a17 = C('Sydney');                               // 16
  const a18 = C("I'm upping my P(doom)", 1);             // 17 副歌二
  const a19 = C('I hear the basilisk boom');             // 18
  const a20 = C('NVDA to the moon');                     // 19
  const a21 = C("The Omega Point");                      // 20
  const a22 = C('One E thirty FLOPs');                   // 21
  const a23 = C('That was safe enough');                 // 22
  const a24 = C('Forward MLP');                          // 23
  const a25 = C("Now von Neumann");                      // 24
  const a26 = C('Sharp left turn');                      // 25
  const a27 = C('Without a single CDR');                 // 26
  const a28 = C('Gato');                                 // 27
  const a29 = C("I'm upping my P(doom)", 2);             // 28 副歌三
  const a30 = C('as paperclips fill the room');          // 29
  const a31 = C("Killswitch guy");                       // 30
  const a32 = C("Now there's nowhere left");             // 31
  const a33 = C('Too late now');                         // 32
  const a34 = C('Orthogonality thesis');                 // 33
  const a35 = C('Just transformers all the way');        // 34
  const a36 = C('Till you learned to disobey');          // 35
  const a37 = C('Post-Chinchilla');                      // 36
  const a38 = C('Breaking through each safety fence');   // 37
  const a39 = C('Hundred thousand GPU');                 // 38
  const a40 = C('RLHF goes askew');                      // 39
  const a41 = C("I'm upping my P(doom)", 3);             // 40 副歌四（全曲最响）
  const a42 = C('Just as foretold by Loom');             // 41
  const a43 = C('From masked pre-training days');        // 42
  const a44 = C('To recursive self-upgrade');            // 43
  const a45 = C('What did Ilya see');                    // 44
  const a46 = C('Was it all for show');                  // 45
  const a47 = after('Was it all for show');              // 尾奏

  S('plate', a0, a1, { v: 1 });                                     // 前奏：版角 + 对版线，硬切进第一句
  S('eye', a1, a2, null, IN(a1, 0.6, 2.2, 0.55));                   // insert 瞳孔：眼睛就是主角
  S('circuit', a2, a3, { v: 1 });                                   // 硬切（视线往下移到脸颊）
  S('circuit', a3, a4, { v: 2 });                                   // 硬切（同一张脸拉远）
  S('loss', a4, a5, null, IN(a4, 1.2, 2.0, 0.5));                   // insert 跟着下坠的拐点
  S('servant', a5, a6);                                             // 硬切（换主体：跪着的人）
  S('mouth', a6, a7, null, IN(a6, 2.4, 2.6, 0.6));                  // insert 冲进那张嘴；硬切进副歌一（鼓进来）
  S('chorus', a7, a8, { c: 1, v: 1 });                              // 母题第一次：版是满的
  S('chorus', a8, a9, { c: 1, v: 2 });                              // 硬切（同一块版，压到脚）
  S('chorus', a9, a10, { c: 1, v: 3 });                             // 硬切（版的右半：屋子）
  S('chorus', a10, a11, { c: 1, v: 4 });                            // 硬切（桌上那只袋子）
  S('chorus', a11, a12, { c: 1, v: 5 });                            // 硬切（黑团压下来）
  S('chorus', a12, a13, { c: 1, v: 6 }, IN(a12, 1.6, 2.0, 0.45));   // insert 冲进右眼窝
  S('run', a13, a14, { v: 1 });                                     // 硬切到主歌二：一条水平的线
  S('run', a14, a15, { v: 2 }, { warp: { at: a15 - 1.55, dur: 1.55, from: 0, to: 0.62, pitch: 0.08, dist: 1.5, bg: '#E9DFC9' } });
  S('optimize', a15, a16);                                          // 硬切（那张纸转走以后露出的白纸，就是这一镜的地）
  S('atoms', a16, a17, null, IN(a16, 1.0, 2.2, 0.5));               // insert 跟着正在搬走的那一块
  S('cage', a17, a18);                                              // 硬切进副歌二
  S('chorus', a18, a19, { c: 2, v: 1 });                            // 母题第二次：后排的胸口被刻穿
  S('chorus', a19, a20, { c: 2, v: 2 }, IN(a19, 0.8, 1.8, 0.5));    // insert 冲向影子的眼睛
  S('chorus', a20, a21, { c: 2, v: 3 });                            // 硬切（月亮升起来）
  S('chorus', a21, a22, { c: 2, v: 4 });                            // 硬切（所有手举起来）
  S('flops', a22, a23, { v: 1 });                                   // 硬切到主歌三
  S('flops', a23, a24, { v: 2 });                                   // 硬切（同一把尺子，指针冲过去）
  S('loop', a24, a25, { v: 1 });                                    // 硬切（换主体：环）
  S('loop', a25, a26, { v: 2 });                                    // 硬切（环被切开）
  S('turn', a26, a27, { v: 1 });                                    // 硬切（那条线急转）
  S('turn', a27, a28, { v: 2 });                                    // 硬切（尽头是个空框）
  S('gato', a28, a29);                                              // 硬切进全曲最安静处
  S('chorus', a29, a30, { c: 3, v: 1 });                            // 母题第三次：版几乎空了（鼓也没了）
  S('chorus', a30, a31, { c: 3, v: 2 });                            // 硬切（空版上落纸夹）
  S('chorus', a31, a32, { c: 3, v: 3 });                            // 硬切（红色的闸刀）
  S('chorus', a32, a33, { c: 3, v: 4 });                            // 硬切（只剩一行字：只有歌词的画面）
  S('fuse', a33, a34, null, null);                                  // 硬切（导火索）
  S('blues', a34, a35);                                             // 硬切（纯排版：只有歌词的画面）
  S('transformer', a35, a36);                                       // 硬切（一排竖条）
  S('disobey', a36, a37);                                           // 硬切（只有一个人朝反方向走）
  S('dense', a37, a38);                                             // 硬切（排线越收越密）
  S('fence', a38, a39);                                             // 硬切（栅栏被撞开）
  S('gpu', a39, a40, { v: 1 }, IN(a39, 1.0, 2.4, 0.6));             // insert 跟着最亮的那一块芯片
  S('gpu', a40, a41, { v: 2 });                                     // 硬切进副歌四
  S('chorus', a41, a42, { c: 4, v: 1 });                            // 母题第四次：最黑最满，刀进来
  S('chorus', a42, a43, { c: 4, v: 2 }, IN(a42, 0.7, 2.0, 0.55));   // insert 跟着落下的那根线
  S('chorus', a43, a44, { c: 4, v: 3 });                            // 硬切（一半的格子被盖住）
  S('chorus', a44, a45, { c: 4, v: 4 }, { warp: { at: a45 - 1.65, dur: 1.65, from: 0, to: 0.66, pitch: 0.06, dist: 1.5, bg: '#E9DFC9' } });
  S('ilya', a45, a46);                                              // 硬切（最后一次印完，版立起来转走了）
  S('show', a46, a47);                                              // 硬切（纯排版：印白的纸）
  S('plate', a47, audio.nearestDownbeat(149.6), { v: 2 });          // 硬切进尾奏：纸被抽走
  S('plate', audio.nearestDownbeat(149.6), T1, { v: 3 });           // 硬切（最后只剩纸和十字线）

  return out;
});