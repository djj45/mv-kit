// The edit — 41 shots, exactly the shot list in TREATMENT.md §8. Every cut is computed from the lyric content
// on the beat (`cut`), never typed by hand; the camera keys on the entries (push / insert / warp) are read by
// kits/camera.js. Hard cuts throughout: nothing crosses a cut in this film (the safety notice just turns the
// page), so there is no fadeIn / wipe anywhere — see the note under each entry.
//
// `tailCut`: if the last word sung before a cut starts less than 0.2 s (6 frames) before it, the cut moves to
// the next beat. Without it three cuts (19 omega, 32 disobey, 38 masked) land 1–2 frames after the previous
// line's last word, which then never gets to sit on screen in its own shot ("moon", "way!", "Loom").
MV.timeline(({ lyrics, audio, cut, T0, T1 }) => {
  const w = (q, n = 0) => lyrics.findWords(q)[n].start;        // start of the nth word equal to q

  // ---- the 41 cuts. `cut` itself holds the previous line's last word for project.cutHold (0.2 s): when that beat
  // would come too soon after it, the cut lands on this line's first word instead (round 1 wrote its own tailCut,
  // which pushed the cut to the next beat — that let this line's first word fall into the previous shot).
  const C02 = cut('Your circuits'), C03 = cut('There was a sudden drop'), C04 = cut('now I'),
        C05 = cut('ChatGPT, please'), C06 = cut('upping my P', 0), C07 = cut('cause the future'),
        C08 = cut('Trapped in the Chinese'), C09 = cut('See through the shoggoth'), C10 = cut('with your shinigami'),
        C11 = cut('We had a stable'), C12 = cut('But now the singularity'), C13 = cut('optimizing'),
        C14 = cut('I feel my atoms'), C15 = cut('Sydney, please'), C16 = cut('upping my P', 1),
        C17 = cut('I hear the basilisk'), C18 = cut('NVDA to the moon'), C19 = cut('The Omega Point'),
        C20 = cut('One E thirty'), C21 = cut('That was safe enough'), C22 = cut('Forward MLP'),
        C23 = cut('Now von Neumann'), C24 = cut('Sharp left turn'), C25 = cut('Without a single CDR'),
        C26 = cut('Gato, please'), C27 = cut('upping my P', 2), C28 = cut('Killswitch guy'),
        C29 = cut('Too late now'), C30 = cut('Orthogonality thesis'), C31 = cut('transformers all the way'),
        C32 = cut('Till you learned'), C33 = cut('Post-Chinchilla'), C34 = cut('Hundred thousand GPU'),
        C35 = cut('RLHF goes askew'), C36 = cut('upping my P', 3), C37 = cut('Just as foretold'),
        C38 = cut('From masked pre-training'), C39 = cut('What did Ilya see'), C40 = cut('Was it all for show'),
        C41 = audio.nearestDownbeat(143.88);                     // shot 41 starts on the bar head (143.88 s)

  return [
    // ── 第一幕 · 须知生效（纸面，安静 → 蓄力）──────────────────────────────────────────────
    // 01 cover — 手册封面：警戒条横带 + 机器 + 小人。insert 跟着机器眼睛推进去（'AGI' 那一拍）。硬切。
    { scene: 'cover', from: T0, to: C02, insert: { at: w('AGI'), dur: 1.2, amt: 0.35 } },
    // 02 nervous — 机器背后的走线折向小人。硬切：同一张纸上换一个动作。
    { scene: 'nervous', from: C02, to: C03 },
    // 03 drop — loss 曲线断崖下坠，线尖不出画（场景里 CAM.keep）。硬切：还在掉的时候切走。
    { scene: 'drop', from: C03, to: C04 },
    // 04 servant — 两块标牌。insert 在 'boss' 前 0.3 s 推向右牌。硬切。
    { scene: 'servant', from: C04, to: C05, insert: { at: w('boss') - 0.3, dur: 0.8, amt: 0.25 } },
    // 05 maw — 第一个纯歌词画面。warp：整面字墙立起来转走，露出黑底接副歌。
    { scene: 'maw', from: C05, to: C06, warp: { at: 21.6, dur: 1.1, from: 0, to: 0.55, pitch: 0.08, dist: 1.5, bg: '#111111' } },

    // ── 第二幕 · 第一次加压（黑白交替）──────────────────────────────────────────────────
    // 06 hook（n=1）— 刻度盘 0.35。push 推得狠。硬切。
    { scene: 'hook', from: C06, to: C07, params: { n: 1 }, push: 0.08 },
    // 07 foom — 爆炸象形在 'FOOM' 爆满全屏。硬切（就在爆满那一拍）。
    { scene: 'foom', from: C07, to: C08 },
    // 08 room — 中文房间剖面。insert 在 #8 末词（'room,'）时跟着卡片。硬切。
    { scene: 'room', from: C08, to: C09, insert: { at: w('room'), dur: 1.0, amt: 0.3 } },
    // 09 mask — 笑脸贴纸翘角，触手钻出来。insert 在 'lies' 前 0.4 s。硬切。
    { scene: 'mask', from: C09, to: C10, insert: { at: w('lies') - 0.4, dur: 1.0, amt: 0.3 } },
    // 10 eyes — 巨大的眼睛，结尾 1.2 s 冲进瞳孔，用瞳孔的黑接下一镜。硬切（从黑进白）。
    { scene: 'eyes', from: C10, to: C11, insert: { at: C11 - 1.2, dur: 1.2, amt: 0.9 } },
    // 11 stable — 平的心电线，之后笔尖写后半句。insert 在 'stable' 后 0.2 s 跟着笔尖。硬切到黑。
    { scene: 'stable', from: C11, to: C12, insert: { at: w('stable') + 0.2, dur: 1.4, amt: 0.22 } },
    // 12 singularity — 黑底圆环内收，'begun' 整幅变黄。insert 冲进圆心。硬切。
    { scene: 'singularity', from: C12, to: C13, insert: { at: w("singularity's"), dur: 1.6, amt: 0.6 } },
    // 13 accel — 黄色人字标志加速流过，小人在跑。硬切。
    { scene: 'accel', from: C13, to: C14 },
    // 14 atoms — 小人 7 个零件拆开拼成机器。warp 在拼好的瞬间转开。硬切。
    { scene: 'atoms', from: C14, to: C15, warp: { at: w('rearranging') - 0.2, dur: 1.2, from: 0, to: 0.35, pitch: 0.06 } },
    // 15 sydney — 围栏后面的机器与 LED 牌。insert 在 'free' 前 0.6 s。硬切到副歌。
    { scene: 'sydney', from: C15, to: C16, insert: { at: w('free') - 0.6, dur: 1.4, amt: 0.3 } },

    // ── 第三幕 · 加速（副歌 2 + 失控段）─────────────────────────────────────────────────
    // 16 hook（n=2）— 同一个刻度盘，指针停在 0.60。push 推得狠。硬切。
    { scene: 'hook', from: C16, to: C17, params: { n: 2 }, push: 0.08 },
    // 17 basilisk — 蛇形警告三角，'boom' 三圈冲击环 + shake。硬切。
    { scene: 'basilisk', from: C17, to: C18 },
    // 18 moon — 股价线冲出画面前世界跟着缩（场景里 CAM.keep）。硬切。
    { scene: 'moon', from: C18, to: C19 },
    // 19 omega — 圆形禁令牌里的 Ω 推近。硬切。
    { scene: 'omega', from: C19, to: C20 },
    // 20 flops — 第二个纯歌词画面：巨大数字按词跳。硬切。
    { scene: 'flops', from: C20, to: C21 },
    // 21 checklist — 检查表逐格打勾，'reckoned' 盖上 APPROVED。insert 推向印章。硬切。
    { scene: 'checklist', from: C21, to: C22, insert: { at: w('reckoned') - 0.2, dur: 0.8, amt: 0.3 } },
    // 22 layers — 一叠层，箭头穿过去。warp 是"二维转三维"的代表镜头（转过去才看出厚度）。硬切。
    { scene: 'layers', from: C22, to: C23, warp: { at: w('Forward') + 0.4, dur: 1.4, from: 0, to: 0.6, pitch: 0.12 } },
    // 23 obsolete — 老计算机被斜杠划掉，盖上 OBSOLETE。硬切。
    { scene: 'obsolete', from: C23, to: C24 },
    // 24 leftturn — 菱形路牌，'turn' 时世界向左转 90°（场景里转，不用后期 rot）。硬切。
    { scene: 'leftturn', from: C24, to: C25 },
    // 25 cdr — 空白 CDR 字段，小人指着它。硬切。
    { scene: 'cdr', from: C25, to: C26 },

    // ── 第四幕 · 安静的中段（大留白，小东西）────────────────────────────────────────────
    // 26 gato — 大片留白里两只手拉着。insert 很慢地推近两只手（4 s）。硬切。
    { scene: 'gato', from: C26, to: C27, insert: { at: 91.0, dur: 4.0, amt: 0.35, ease: ease.inOutQuad } },
    // 27 clips — 小刻度盘 + 回形针铺满下半画面（耳语版副歌）。硬切。
    { scene: 'clips', from: C27, to: C28 },
    // 28 exit — 急停按钮挂着 OUT OF OFFICE，出口箭头绕回小人。硬切。
    { scene: 'exit', from: C28, to: C29 },
    // 29 fuse — 黑底，火头沿导火索烧过去。insert 在 'lit' 前 0.5 s 跟着火头。硬切。
    { scene: 'fuse', from: C29, to: C30, insert: { at: w('lit') - 0.5, dur: 1.4, amt: 0.35 } },
    // 30 ortho — 第三个纯歌词画面：两条坐标轴，字骑在轴上。硬切。
    { scene: 'ortho', from: C30, to: C31 },

    // ── 第五幕 · 冲破（能量最高）───────────────────────────────────────────────────────
    // 31 stack — 方块一层层往上叠，塔顶不出画（场景里 CAM.keep）。硬切。
    { scene: 'stack', from: C31, to: C32 },
    // 32 disobey — 禁令牌里的机器一步跨出来，斜杠被撞断。硬切。
    { scene: 'disobey', from: C32, to: C33 },
    // 33 fence — 密方阵压过来撞飞三段围栏。硬切。
    { scene: 'fence', from: C33, to: C34 },
    // 34 gpu — 芯片方阵一圈圈点亮 + 巨大数字。硬切。
    { scene: 'gpu', from: C34, to: C35 },
    // 35 askew — 水平仪挂着的牌子越转越歪。硬切。
    { scene: 'askew', from: C35, to: C36 },

    // ── 第六幕 · 合上手册 ──────────────────────────────────────────────────────────────
    // 36 hook（n=4）— 整幅黄，指针打到 1.00 卡住。push 推得狠。硬切。
    { scene: 'hook', from: C36, to: C37, params: { n: 4 }, push: 0.1 },
    // 37 loom — 分叉的树每拍长一枝。硬切。
    { scene: 'loom', from: C37, to: C38 },
    // 38 masked — 涂黑条 → 机器在自己屏幕里画自己（5 层）。insert 一层层往里钻。硬切。
    { scene: 'masked', from: C38, to: C39, insert: { at: w('recursive'), dur: 1.6, amt: 0.8 } },
    // 39 ilya — 关着的门，门缝下一条黄色的光。insert 推向门缝。硬切。
    { scene: 'ilya', from: C39, to: C40, insert: { at: w('never'), dur: 1.4, amt: 0.3 } },
    // 40 show — 第四个纯歌词画面：五个词一词一行，唱完黄块涨到满屏宽。硬切在小节头。
    { scene: 'show', from: C40, to: C41 },
    // 41 outro — 封面回来了，只是机器和小人换了位置；148 s 起手册合上（warp 转走露出黑底）。
    { scene: 'outro', from: C41, to: T1, warp: { at: 148.0, dur: 3.0, from: 0, to: 1.25, pitch: 0.1, dist: 1.6, bg: '#111111' } },
  ];
});
