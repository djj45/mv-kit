# lib/API.md — 写镜头时看的速查（本项目自己的风格包）

引擎的通用 API 见 `docs/ENGINE.md`。这里是 `projects/pdoom-bolt/lib/` 四个文件暴露的东西。
全局名：`LK`（色 / 字体 / 数值）、`S3`（三角网格 → 投影 → 实体图）、`PART`（零件库）、`DR`（工程图家具）、
`BOLT`（电弧）、`TY`（字体与歌词）。**不要改 lib/ 里的文件**；需要新东西就在自己的 scene 里写局部函数。

## LK —— 一份色、一种字

```js
LK.void #04060E  LK.steel #111C38  LK.steel2   // VOID 的底和暗结构
LK.paper #E9EDF7  LK.paper2 #F5F8FF            // PLATE 的纸
LK.ink #16224A  LK.ink2 #6B7BA8  LK.ink3 #9EACCF  LK.hatch #8C9CD2   // 墨的四档
LK.blue #4D6BFE  LK.deep #2337A8  LK.ice #A9BDFF // 唯一的彩色（DeepSeek 蓝）和它的暗/亮
LK.hot #EAF0FF  LK.arc #C8DCFF                   // 白热的字 / 电弧的芯
LK.rare #7FF3FF                                  // 只在 singularity 用一次
LK.tone[]                                        // 实体平色阶（浅→深 5 档，S3 自动按法线取）
LK.a('#4D6BFE', 0.5) → 'rgba(...)'               // 也接受已经是 rgba 的字符串
LK.mix(a, b, k) / LK.shade(hex, k) / LK.PX(n)    // 像素常量一律过 PX()
LK.F.display = DIN Condensed Bold；LK.F.mono = Menlo；LK.F.cn = PingFang SC；LK.F.sans
LK.display(g, size, {weight, track})             // 设 display 字体（track 是 em）；LK.mono / LK.cn 同理
LK.measure(g, '文字', size, {track}) → px
LK.in(f, dur) → 0..1 入场；LK.out(f, dur) → 离切点；LK.each(i, n, t, t0, dur, spread)
LK.since(f, 'kick', cap) / LK.hitPulse(f, 'kick', len)
LK.palVoid() / LK.palRare()                      // 给 lmBegin 的调色板对象
```

## S3 —— 网格、变换、投影、出图

```js
// 建 mesh（{V:[[x,y,z]…], F:[{i:[…]}…]}）：全部以原点为中心，y 轴朝上
S3.box(w,h,d)  S3.slab(w,h,d)  S3.cyl(r0,r1,h,n,{centered})  S3.prism(r,h,n)
S3.torus(R,r,nu,nv)  S3.sphere(r,nu,nv)  S3.plate(u,v,w)  S3.sweep(pts,w,h,{closed,up})
PART.extrude(poly2d, t)      // 2D 多边形沿 z 挤出
PART.tube(rIn,rOut,h,n)      // 垫圈/环
// 变换（rot 依次绕 x→y→z，和 lumen 的 lmModel 同一套）
S3.bake(m, {pos:[x,y,z], rot:[rx,ry,rz], scale})   // 烤进顶点，返回新 mesh
S3.merge(m1, m2, …)  S3.move(m, d)  S3.scale(m, k)  S3.scale3(m, [sx,sy,sz])
// 出图（Canvas 2D）
S3.draw(g, mesh, o)          // 单个零件
S3.drawAll(g, items, o)      // items: [{mesh, model, tone(f,fi,nView,o)→color, hatch(f,fi)→bool, edge, hidden, edges}]
// o: cam{yaw,pitch,zoom,cx,cy,persp,dist,target}, mode 'solid'|'wire'|'ghost', edge/edgeW, hidden/hiddenW/hiddenCol,
//    alpha, tone(f,fi,nView,item)→color, hatchOpt{gap,color,angle}, ghostAlpha
// 默认：按面法线取 LK.tone 的 5 档平色；可见棱 LK.ink 1.35 px；被挡住的棱画虚线 LK.ink2 0.7 px
S3.proj(cam, [x,y,z]) → [screenX, screenY, depth]   // 把 2D 标注钉在 3D 点上
// 给 kits/lumen.js 用（同一份几何的另一种存在方式）
S3.cloud(mesh, n, {seed, jitter}) → Float32Array   // 表面按面积均匀撒点
S3.wireSegs(mesh, {bright, caps}) → Float32Array   // 棱 → lmLines 的段缓冲
S3.edges(mesh), S3.faceNormal(V, idx)
```

## PART —— 零件库（一份几何，两种画法）

```js
const P = PART.irisParts(12, {ro:1, ri:0.10, thick:0.045, rn:96})   // 光圈 = 眼睛
PART.irisDraw(g, P, open, {cam, …S3 选项})        // PLATE：整只光圈画成实体
PART.irisModel(P, i, open)                        // 第 i 片的 model（给 S3.drawAll）
PART.irisSegs(P, open) → Float32Array             // VOID：世界坐标线段（喂 lmLines）
PART.irisHole(P, open) → 中心孔半径                // 画瞳孔 / 光斑
PART.cellParts({R}) → {frame, rings[3], core, pins[6]}   // THE CELL 总成（外六角框+三具环+内球+电极）
PART.board(w, h, {traces, seed})                  // 线路板（走线+焊盘+芯片）
PART.lattice(n, gap, {r})                         // 晶格（球+键）
PART.racks(cols, rows, bw, bh, bd, {slots})       // 机柜阵列
PART.stack(n, w, d, gap)                          // 层叠层板
PART.loom(nw, w, h, {wire})                       // 织机
PART.clip(scale, at)                              // 回形针
PART.roomBox(w, h, d, {slot})                     // 中文屋
PART.pin(a, b, r, {sides, taper})                 // 任意两点之间的圆柱（连杆 / 电极）
PART.coil(r, turns, len, wire)                    // 螺旋线圈
PART.figure2d({k}) → 2D 多边形                     // 人形剪影（人不画脸）
PART.figureCloud(n, {k}) → Float32Array           // 人形点云
```

## DR —— 工程图家具（纸、线、尺寸、印章）

```js
DR.paper(g, {frame:true, zone:true, margin:44})   // PLATE 打底：纸 + 图框 + 分区标记
DR.line(g,x0,y0,x1,y1,{color,w,dash,cap})  DR.poly(g,pts,{color,w,fill,closed})
DR.pen(g, pts, upto, o) → 笔尖坐标                 // 折线按弧长画到 upto（绘图仪的笔）
DR.arrow(g, x, y, ang, size, color)
DR.hatch(g, pathFn, {gap, angle, color, w})       // 剖面线（45°）
DR.toneFill(g, pathFn, dens 0..2, color)          // 网点（大面积实心用它，不用灰）
DR.dim(g, p0, p1, off, {text, size, color, ext, arrow})   // 对齐尺寸线（文字写在断开的中间）
DR.dimH(g,x0,x1,y,o)  DR.dimV(g,y0,y1,x,o)  DR.dimR(g,c,r,ang,{prefix:'R',text,lead})
DR.center(g,x,y,r)  DR.sectionMark(g,p0,p1,'A')   // 中心线 / 剖切符号
DR.leader(g, x, y, dx, dy, text, {draw 0..1, size, color, run, dot})   // 引线标注
DR.micro(g, text, x, y, {size:15, color:LK.ink, track:0.06, align, alpha})   // 等宽小字
DR.tag(g, text, x, y, o)                          // 宽字距机器标签
DR.display(g, text, x, y, {size, color, track, align, fat, alpha}) → width
DR.writeText(g, text, x, y, upto, {size, align, color, track, penDot, dotColor})  // 被笔"写"出来
DR.stamp(g, text, x, y, {size, rot, color, sub, alpha})       // 图章
DR.titleBlock(g, {rows:[[k,v]…], title, titleSub, rev, w, h, x, y, alpha})   // 右下角标题栏
DR.revCloud(g, pts, {r, color})  DR.foldLine(g,x,y0,y1)  DR.breakEdge(g,x0,y0,x1,y1,{amp,seed})
DR.ruler(g,x0,y0,x1,y1,{step,unit,color,labels})  DR.dashedBox(g,x,y,w,h,o)
DR.table(g,x,y,cols,rows,{cw 数字或数组, rh, color, w}) → 表格对象 {colX, rowY, cw, rh, cols, rows, w, h}
DR.cell(g, T, col, row, text, {size, color, track, font, align, pad, alpha, dy, shrink}) → 宽度
    // **表格 / 框图里的字一律用 DR.cell 放**：它垂直居中、并在超宽时自动把字号缩到装得下，
    // 手写 x/y 放字很容易跨过格子线（pdoom-bolt 的 servant 就这么错过一次：8 行字塞进 4 行格子，
    // 最后一行掉到表格下面去了）。
DR.sprocket(g, x, y, h)                           // 打孔纸带的孔
```

## BOLT —— 电弧（全片唯一允许抖动的东西）

```js
BOLT.pathBetween([x0,y0],[x1,y1], {tick, seed, jag, depth, drift}) → [[x,y]…]
BOLT.arc3([x,y,z],[x,y,z], o) → [[x,y,z]…]     // 3D 折线
BOLT.segs(pts3, {bright}) → Float32Array       // 喂 lmLines
BOLT.branches(pts, n, {tick, seed, len}) → [折线…]
BOLT.draw(g, pts2d, {w, color, core, gain, additive})     // 画进任意 2D context
BOLT.strike(g, a, b, {tick, seed, w, jag, branch, branchLen})   // 一道闪电（主干+支叉）
BOLT.ring(g, cx, cy, k, {r0, r1, color, core, w, a})      // 冲击环，k 0..1
BOLT.sparks(g, cx, cy, n, t, {at, life, speed, size, color, alpha})
BOLT.plasma(g, cx, cy, r, t, {color, core, alpha})        // 白热核心
BOLT.radial(g, x, y, r, color, alpha, {core})             // 径向光
```
`BOLT.*` 画进 `lmGlow()` 时会跟着泛光（VOID）；画进主画布就是普通线条（PLATE 只用 `BOLT.draw` 的芯线，不发光）。

## TY —— 歌词

```js
TY.line(g, f, o)   // 画"这一帧该唱的那一句"，逐行 treatment 在 TY.T 表里
// o: {reg:'plate'|'void', treat, pos:'upper'|'centre'|'lower'|'low'|[x,y], x, y, size, align, color, dim,
//     phase, k, since, words:[i0,i1), label, rot, ...}        —— 覆盖表里的值
TY.T[i] = {t: treatment, pos, size, why}
TY.index(f) → 当前行号；TY.current(f) → {line, i, next}；TY.words(f, line) → 逐词状态
// treatment：plot dimension section stamp slam arc counter terminal weave nested swarm collapse quiet band
```
颜色：`reg:'void'` 时默认唱到的是 `LK.hot`、没唱到的是 `#3A4A78`；`reg:'plate'` 时唱到的是 `LK.blue`、没唱到的是 `LK.ink2`（22% 不透明度）。
**不许抢拍**：变色只在 `t >= 词.start` 那一刻，最多提前 0.4 s 以暗色预示。文字离边缘 ≥96 px。

## 两个语域的写法

```js
// PLATE（纸 + 墨；什么都不发光）
render(g, f) {
  DR.paper(g);
  S3.drawAll(g, items, { cam });
  DR.dim(...); DR.leader(...); DR.micro(...);
  TY.line(g, f, { reg: 'plate' });
  return { grain: 0.03, vignette: 0 };
}

// VOID（黑 + 光；只有蓝白发光）
render(g, f) {
  lmBegin(LK.palVoid());
  const cam = lmOrbit({ yaw, pitch, dist, fov: 35 });
  lmLines(cam, segs, { width: 1.2, color: 'accent', gain: 0.5, glow: 0.6, upto: f.p });
  lmPoints(cam, cloud, { size: 1.6, gain: 0.5, dof: 10, twinkle: 0.3, t: f.t });
  const gl = lmGlow();                      // 会被泛光的 2D 层（画电弧、仪表、光斑）
  BOLT.strike(gl, [x0,y0], [x1,y1], { tick: f.tick, seed: 3, w: 4 });
  lmEnd(g, { bloom: 0.9 });
  TY.line(g, f, { reg: 'void' });            // 泛光之后画字：锐利、不发光
  return { grain: 0.03, vignette: 0 };
}
```
