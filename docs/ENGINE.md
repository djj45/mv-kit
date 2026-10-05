# 引擎参考（写镜头时看）

引擎是一组普通的 `<script>`（没有构建步骤），项目的 `index.html` 先加载 `project.js` 再加载 `engine/boot.js`。boot 按顺序加载：引擎 → `project.kits` 里的风格包 → `data/*.js` → `project.scripts` → `scenes/<名字>.js` → `timeline.js`，然后启动预览或导出。

## 铁律：确定性

输出必须只由 `f.t` 决定：导出时帧会乱序渲染，运动模糊还会在一帧内渲染多个子帧再平均。

- 不要用 `Math.random()`、`Date.now()`、`performance.now()`；用 `hash(a, b, c)`、`mulberry32(seed)`、`noise1(x, seed)`。
- 不要在 `render()` 里累积状态（计数器、粒子模拟）。需要的话写成时间的函数（粒子 i 的位置 = f(t − 出生时间)）；写不成闭式解的模拟（沙粒、群鸟、裂纹蔓延、训练发散）用 `kits/sim.js` 的 `SIM.make`：状态定义成「镜头开头 init，再按固定步长一步步算到 t」，所以仍然只由 t 决定（见下「sim.js」）。
- 静态的东西（背景画、贴图、预计算的几何）在 `MV.onInit(fn)` 或场景的 `init()` 里画好一次。

## 分辨率：1080p 和 4K（MV.scale）

同一个项目可以导出 1080p，也可以导出原生 4K：`uv run tools/render.py projects/X --4k`（= `--scale 2`，输出 `out/<标题>-2160p.mp4`；`stills / sheet / strip` 也能加 `--4k` 看 4K 的画面；`check / qa` 永远按 1× 看，版式在任何倍率下都一样）。

规则只有一条：**场景和风格包永远在设计尺寸里画**。`W × H` 是 `project.js` 的 width / height（1920 × 1080），坐标、字号、线宽、模糊半径、阴影、点的大小、`cam.project` 的结果都是这个尺寸里的"设计像素"。导出时输出和全幅图层有 `MV.scale` 倍的真实像素（4K 时是 2），字和线在 4K 下是重新画出来的，不是放大。

- `g`（场景画布）、屏幕层、转场的两张画面都已经是 `MV.scale` 倍的图层，直接画就行。
- 自己的**全幅或要上屏的离屏图层**用 `mkHi(w, h)`（w × h 设计尺寸，真实像素 × MV.scale），不要用 `mk(W, H)`。在 mkHi 图层上：`setTransform(1, 0, 0, 1, 0, 0)` 就是"复位到设计尺寸"，`drawImage(图层, x, y)` 按设计尺寸放，`drawImage(图层, sx, sy, sw, sh, …)` 的源矩形也是设计尺寸，`shadowBlur / shadowOffsetX / Y` 和 `filter` 里的 px（`blur(6px)`）是设计像素（Chrome 本来按位图像素算它们，引擎在 mkHi 图层上替你换算），`createPattern(图层)` 按设计尺寸平铺。
- `mk(w, h)` 还是 1× 的普通画布：给分析（取像素、采样文字点云）、纹理、故意低分辨率的软模糊用。它画到 mkHi 图层上会被放大——位置和大小都对，只是软。
- **原始像素不换算**：`canvas.width / height`、`getImageData / putImageData` 是真实像素。要设计尺寸用 `MV.sizeOf(c)`；"尺寸对不上就重建"的缓存用 `MV.fits(c, w, h)`，不要写 `c.width !== W`。
- 风格包里的 WebGL：画布、纹理、帧缓冲按 `W·k × H·k` 建（`k = MV.scale`），`gl_FragCoord` 是真实像素；着色器里所有以 px 计的量（采样半径、网点格子、噪声频率、描边宽度）都换回设计像素再算（`gl_FragCoord / uK`），抗锯齿的过渡带按真实像素（`1 / uK` 设计像素）。mip 级别 + `log2(uK)`。做法见 lumen.js（点线的 uK、泛光在 4K 下多一级从粗一级开始，半径不变）、solid.js、pigment.js、roto.js、print.js。
- 风格包给的图层也是输出倍率的：`pigmentLayers()` 的 `L.canvases.wet / dry / col`、`qhStickerLayers()` 的遮罩在 4K 下是 2 倍像素。量它们的尺寸用 `L.w / L.h`（设计尺寸），不要用 `canvas.width`；要逐行搬运像素（`drawImage` 的九参数形式）时，源矩形写设计尺寸即可（mkHi 图层会自己换算）。
- 素材：插画和帧包在 4K 下按自己的分辨率放大。要 4K 清晰就用 3840 宽的图（`tools/frames.py --width 3840`；illust.js 的 `illPrep` 在 4K 下默认保留 3840 px）。
- `MV.scale` 为 1 时引擎不打任何补丁、不做任何标记：1080p 和没有这套机制之前逐像素一样。

## 场景

```js
MV.scene('wide', {
  init(MV) { this.bg = paintBackground(); },       // 可选，只调用一次；this = 这个场景对象
  render(g, f) {                                     // 每帧：g 是 W×H 的 Canvas 2D，状态已重置
    g.drawImage(this.bg, 0, 0);
    ...
    return { shake: 8 * f.a.kick, flash: 0.2 };     // 可选：后期参数
  },
});
```

`render` 必须画满整个画面。全局的 `W`、`H` 是画面尺寸（默认 1920×1080）。

### f（帧信息）

| 字段 | 含义 |
|---|---|
| `f.t` | 歌曲时间（秒） |
| `f.lt`、`f.p`、`f.dur` | 镜头内时间、镜头进度 0..1、镜头时长 |
| `f.from`、`f.to`、`f.params` | 这条时间线条目的起止和参数 |
| `f.tick`、`f.tq` | 作画张序号、按作画张数量化后的时间（`drawRate` = 12 时即"一拍二"）。用它们驱动角色动作和线条抖动，就有手绘动画的顿挫感 |
| `f.beat`、`f.beatPhase` | 连续的拍序号、拍内相位 0..1 |
| `f.bar`、`f.barPhase` | 小节序号、小节内相位 |
| `f.section` | 当前段落 `{name, label, start, end, energy}` |
| `f.a` | 音频：`rms low mid high`（0..1 包络），`kick snare hat onset`（衰减的冲击值 0..1），有分轨时还有 `vocals drums` |
| `f.lyrics`、`f.audio` | 数据对象（见下） |

### 后期参数（render 的返回值）

`shake`（像素，或 `[x, y]`）、`zoom`、`rot`、`pan`（`[x, y]` 像素：镜头平移，和 `shake` 不同，不会额外放大补边；`kits/camera.js` 用它把推近钉在某一点上）、`flash`（0..1 白闪）、`flashColor`、`fade`（0..1 压黑）、`invert`、`grain`、`vignette`、`vignetteColor`。默认值来自 `project.post`。

后期滤镜：`MV.postFilter(fn)` 注册一个对整帧生效的滤镜，`fn(canvas, post, t)` 在运动模糊之后、shake / zoom / 颗粒 / 暗角之前运行，可以原地重画这张画布；`post` 是合并后的后期参数，滤镜从里面读自己的设置。例：pigment.js 的整帧颜料层读 `post.pigment`（见下）。

### 屏幕层：MV.overlay

`MV.overlay(o => { … })` 在场景的 `render()` 里调用：函数里画的东西**画在镜头之后**——push / insert / warp、shake、zoom、rot、pan 都动不到它——再盖颗粒、暗角、闪白、压黑。`o` 是输出画面的 W×H 画布（像素就是成片像素，状态已重置）；函数在同一帧稍后执行，可以直接用 render 的 `f`。

注意屏幕层底下的世界是会动的：推近时物体会被推到字底下，同色就看不见了（qa 在镜头的几个时刻回头看已经唱过的词，报 `lyric-covered`）。屏幕层的字要么垫一条底（纸带、色块），要么让推近的主体离开歌词区。

用它放**镜头动、它不动**的东西：歌词区、字幕式的说明、HUD。歌词放在屏幕层后，`MV.keep` 就不需要了（在屏幕层里调用会被忽略），镜头想推多近推多近，`insert` 不再被歌词的 keep 框钳住。交叉淡化 / 转场时屏幕层跟着自己的条目一起淡（新镜头 k，旧镜头 1 − k）。屏幕层里也能用 `MV.focus / MV.box / MV.group`（输出像素坐标），qa 照常检查——包括 warp 那几帧：场景画布被重新映射、量不了，屏幕层的字照量。

```js
render(g, f) {
  drawWorld(g, f);                                  // 跟着镜头动
  MV.overlay(o => WD.line(o, f, { zone: 'low' }));  // 不跟着动：歌词钉在下区
}
```

### 给镜头和 qa 的声明：MV.focus / MV.keep / MV.box / MV.group / MV.lyric / MV.decor

场景在 `render()` 里顺手报这几样东西，`kits/camera.js` 用它们运镜，`render.py qa` 用它们检查。都很便宜，不开 qa 时几乎不花时间。

- `MV.focus(x, y, name)`：这一帧**眼睛该看的东西**在哪（场景画布坐标）：笔尖、火头、正在长的那一端、角色的脸。每帧都报。一帧里可以报好几个，**最后报的那个是主体**：camera 的 `insert` 跟着它推近，qa 检查它从不跑出画面（`focus-out`）；之前报的（lib 顺手报的每个角色）推近时出画不算错。所以主体放在最后报。
  主体**故意离开画面**（曲线冲出上缘、回形针掉出去、手抽走胶片）：它在画里时报它；一出画就改报眼睛接下来看的东西（它留下的字、下一个主体）。不要把坐标夹在画面边上——`insert` 跟着 `MV.focus` 推，夹在边上的点会把推近拖到画面边上。
- `MV.keep(g, x, y, w, h)`：**不许被镜头推出画面**的矩形（一句歌词、一个标题），按 g 当前的坐标。camera 推近时宁可少推，也不把它推到离边 96 px 以内。`BOX.text(…, { keep: true })` 会自己报。代价是：画面上有 keep 框时 `insert` 只能轻推；要真正推进局部，把歌词画进屏幕层（`MV.overlay`，见上），就不用 keep 了。
- `MV.box(g, x, y, w, h, { name, pad, owner })`：**字要装在里面**的框：表格的格子、标题栏的一行、标签牌、终端面板。
- `MV.group(tag, fn)`：fn 里画的框和字算**同一个主人**。框和"它自己的字"要在同一个 group 里画（或者先 `const id = MV.owner('table')`，框传 `{ owner: id }`，字在 `MV.within(id, () => g.fillText(…))` 里画）。qa 对**自己的字**从严：必须在框里、四边留够余量，跨出去是错误（`box-cross` / `box-tight`）；**别人的字**碰到这个框只算撞车（`box-clash`，警告）：被框线切过、或者压在框里自己的字上。完全落在别人框里、底下也没压着字的，不报——qa 不知道它是不是本该在那儿；想让它被严查，就画进那个框的 group。
  `kits/layout.js` 的 `BOX.table / BOX.cell / BOX.panel / BOX.lines` 已经自己分好主人；自己写的框助手（标题栏、规格表）在函数外面包一层 `MV.group`。
- `MV.lyric(fn)`：fn 画的是**一句歌词和跟着它的东西**——字后面的底条、牌子、色块。照常画；qa 只是知道这些都属于歌词，量"歌词挡住了多少画面"（`lyric-cover`）时把它们一起拿掉，看底下的画。项目自己的歌词助手整个包一层：`WD.line = (g, f, o) => MV.lyric(() => line(g, f, o))`。画在屏幕层（`MV.overlay`）里的东西本来就算歌词这一侧，不用再包。
- `MV.decor(fn)`：fn 画的字是**画面的一部分，不是歌词**——印在道具上、织进布里、写在图表上的歌词里的词（织布机上的 "P(doom)"、曲线旁的 "AGI"）。qa 按词认歌词，这种字不包就会被当成歌词画了两遍（`lyric-overlap`）或跨镜头（`lyric-carryover`）。包进去之后它按普通的字查（`text-touch`、`text-cut`、`box-clash`）。整词画，不要为了躲 qa 一个字母一个字母地画。

## 时间线（timeline.js）

```js
MV.timeline(({ lyrics, audio, cut, after, start, T0, T1 }) => [
  { scene: 'wide',  from: T0,                     to: cut('There was a sudden drop') },
  { scene: 'chart', from: cut('There was a sudden drop'), to: after('your boss') },
  { scene: 'hook',  from: cut("I'm upping", 1),   to: cut('I hear the basilisk'), params: { n: 2 } },
  { scene: 'fade',  from: 60, to: 64, fadeIn: 1.0 },   // 与上一条重叠 1 秒交叉淡化
]);
```

- `cut(q, nth, { hold })`：第 nth 个包含 q 的歌词行，其第一个词开始之前的那一拍。`hold`（秒，默认 `project.cutHold`，没写就是 0）：上一句的最后一个字在旧镜头里至少要停这么久；那一拍离它太近时，切点改落在这一句的第一个词上（仍在歌上，不会切进下一句）。新项目的 `project.js` 默认 `"cutHold": 0.2`（30 fps 下 6 帧）。
- `after(q, nth)`：这一行结束处最近的小节头。
- `start(q, nth)`：这一行第一个词开始的时间。
- `word(q, nth)`：第 nth 个唱到的词 q 本身开始的时间（整词：`word('drop')`、`word('AGI')`）。动作和 reads 落在某个词上时用它；`start` 给的是整句的开头。
- `land(t, dur, pre = 0.7)`：一个 `dur` 秒的转场要"落"在 t 上时它的 `from`：七成动作在 t 之前，余下的在 t 之后收住（`from: land(cut('…'), 0.8), fadeIn: 0.8`）。
- 条目首尾相接就是硬切；只有写了 `fadeIn` 且重叠时才交叉淡化。前一个条目要一直延续到 `from + fadeIn`，否则它一结束，淡化到一半的画面会跳成新镜头。
- 转场：条目写 `fadeIn: 秒数, wipe: '名字'`，新镜头就按这个转场进来（代替交叉淡化），见下面的"转场"。
- 同一个场景可以出现多次，用 `params` 区分。
- **reads**（观众要看懂什么，按顺序）：条目上写 `reads: [[时间, '看懂什么', '眼睛该在的 MV.focus 名字'], …]`。每一条一直持续到下一条开始（或镜头交出去），所以天然一次只有一件事。时间用 `word / start / cut` 算，不写死秒数。第三项也可以是 `{ focus, quick: true }`：`quick` 表示一个**有预备动作铺垫**的快动作，可以短一些。
  ```js
  { scene: 'chase', from: cut('Your circuits'), to: cut('now I'),
    reads: [[cut('Your circuits'), 'the spark zips off to the right', 'spark'],
            [6.5, 'Pip trots after it, nervous', 'pip'],
            [word('drop'), 'the spark drops off the edge', 'spark']] },
  ```
  `check` 查时间（`read`，见下）；`qa` 查眼睛：每条开始后两帧，这个镜头的主体（它最后报的 `MV.focus`）是不是这条写的名字（`read-unled`）。场景要在这条开始时把它变成主体——让它动、让它亮、让角色看它、让镜头推过去，并且最后报它的 `MV.focus`。预览按 `d` 时调试层显示当前这条 read。为什么：模型写的动画最常见的毛病是"所有东西一个速度、事件叠在一起、还没看懂就过去了"（Claude Animation Base 的 ANIMATION_GUIDE）；reads 是这件事的时间表。
- `MV.lint()` 检查剪辑里单看一帧发现不了的问题，返回 `[{t, kind, msg}]`：`gap`（空档）、`hidden`（重叠但没有 `fadeIn`）、`fade`（淡化放不完或没有重叠）、`wipe`（未定义的转场、没写 `fadeIn` 的转场、转场自己的检查没通过，比如场景里没有那个锚点）、`repeat`（同场景同参数连着出现）、`offbeat`（切点不在拍上也不在唱到的字上，±1 帧；转场的开始、结束或 `land` 的落点在拍上也算；没有 audio.js 时不查）、`linetail`（句尾的字离下一句不到 `lineTail` 秒，默认 0.65）、`cuttail`（硬切离一句最后一个字的开始不到 `cutTail` 秒，默认 6 帧：那个字闪一下就没了；用 `cut(q, n, { hold })` 或 `project.cutHold`）、`read`（一条 read 离下一条或镜头交出去不到 `readMin` 秒（默认 0.6，`quick` 的用 `readQuick`，0.25）：观众看不过来；或者它落在自己的镜头外面；全片只要有一个条目写了 reads，1.5 秒以上却没写的镜头也会提示）。`render.py check` 打印它们，预览在镜头条上画红色短线。`project.lint = { lineTail, cutTail, readMin, readQuick, off: ['offbeat', …] }` 调整。

### 转场

默认是硬切。要转场，就得有东西跨过切点：在 `timeline.js` 里每个 `wipe` 旁边写一句注释，说清楚是什么（"圆窗就是月亮：推进去"）。说不出来就用硬切。

两种写法，都用 `MV.wipe('名字', def)` 定义，`k` 是 0..1 进度，`e` 是新镜头的条目（`e.params` 放转场参数）：

- **遮罩**：`{ mask(m, k, e, t), over(g, k, e, t) }`。在 `m` 上画白色的地方显示新镜头；`over` 可选，在合成结果上再画一层（比如湿边）。ink.js 自带 `ink`（墨滴晕开，`params.wx / wy` 定中心）和 `wash`（水痕横扫，`params.dir = ±1`），shadow.js 自带 `lightThrough` / `wetOut`，lumen.js 自带 `glitch`。
- **两张画面**：`{ render(g, A, B, k, e, t, prev) }`。`A` 是旧镜头（条目 `prev`）、`B` 是新镜头在 t 时刻的整帧画布，自己画满 `g`。

引擎自带三个两张画面的转场（`engine/transitions.js`）：

| 名字 | 用在什么时候 | 参数 |
|---|---|---|
| `zoom` | 匹配剪辑：旧镜头里的一个物体落到新镜头里同一个（或形状呼应的）物体上，推进去（变大）或拉出来（变小）；新画面先从物体里透出来，再铺满。两个锚点得**大小悬殊**（小物体 → 下一镜的一大块或 `'full'`，或反过来）：差不多大时它只是把一张画平移到另一张上，`check` 会提示 | `match: [a, b]`（矩形 `[x, y, w, h]`、`'full'`，或场景锚点的名字）、`shape: 'rect' \| 'round'`（物体的外形）、`feather`（透出来的软边，0.2）、`blend`（纸面上用 `'darken'`：只有笔画叠在一起，纸还是纸；暗底用 `'lighten'`）、`ease` |
| `pan` | 两个镜头是同一个空间里相邻的地方，镜头平移过去。方向有语法：`right` 往后的时间，`left` 往前的时间，`down` 更深，`up` 上浮 | `dir`、`gap`（像素）、`ease` |
| `reflow` | 旧画面拆成颗粒，飞到新画面的笔画上落定（按希尔伯特曲线配对，相邻的还相邻）。笔画 = 和整张画主色调不同的格子，纸上的墨、黑底上的光都适用 | `dot: 'round' \| 'square' \| 'glyph' \| fn(g, x, y, r, rgb, alpha, i, k)`（风格包可以往 `MV.reflowDots` 加）、`count`（1400）、`cell`（8 px）、`size`、`swirl`（弧度）、`threshold`、`boost`、`ghost`（中间留多少两张画的影子） |

**锚点**：场景可以定义 `anchors(f)`，返回 `{ 名字: [x, y, w, h] }`（这个场景自己画面里的像素坐标，算上它的镜头运动），`zoom` 的 `match` 就能写名字，转场跟着物体走。`MV.anchorOf(条目, 名字, t)` 取锚点。锚点名写错时 `check` 会报出来。

**跨过切点的东西**：条目可以写 `carry(g, k, e, t)`，在任何转场（包括交叉淡化）的合成结果上再画一层：一只飞过接缝的鸟、一片落下的花瓣。

```js
['moon',  land(4, 1.2), { fadeIn: 1.2, wipe: 'zoom', params: { match: ['window', 'moon'], shape: 'round' } }],   // 圆窗就是月亮：推进去
['shore', 8,            { fadeIn: 0.9, wipe: 'pan', params: { dir: 'right' }, carry: bird }],                   // 夜 → 晨：时间往右
['glyph', 11,           { fadeIn: 1.4, wipe: 'reflow' }],                                                        // 浪的线条拆开，重组成字
```

完整示例：`projects/transition-demo`。转场渲染出错时（比如锚点不存在）会像场景报错一样记下来，这一帧退回交叉淡化。

## 数据

### 歌词 `f.lyrics`（MV.Lyrics）

- `lyrics.get('sudden drop', nth)` → 行 `{text, start, end, words: [{w, start, end, conf, syl?, join?}]}`。按内容找，别写死时间。
- `lyrics.findWords('P(doom)')`、`lyrics.lineAt(t)`、`lyrics.wordAt(t)`
- `lyrics.lineAt(f.t, f.from)`：**这个镜头**该显示的那一句。切点之前已经唱完的句子不带进来（否则它会换上新镜头的样式在开头闪几帧，qa 报 `lyric-carryover`）；切在一句中间、切点之后还有词要唱的，照常带进来。场景里取"当前句"一律这样写，自己写的取句函数也照这条规则。
  另一头也管：`f.lyrics.lineAt` 还会自动去掉**下一个镜头接手之后才开始的句子**（`f.until`：交叉淡化 / zoom / reflow 里新镜头的起点；硬切时就是 `f.to`）。所以转场重叠的那段里，旧镜头不会用自己的样式把新镜头的那一句再画一遍（qa 报 `lyric-handover`）。用 `MV.lyrics.lineAt` 绕过 `f.lyrics` 时要自己传第三个参数 `until`。
- `MV.Lyrics.wordProgress(word, t)` → 0..1
- `lyrics.tokens(line)` → 给 `karaoke()` 用的 `[{text, start, end, join}]`（中日文逐字，`join` 表示后面不加空格）

歌词规则：词在唱到时出现 / 高亮，不能抢跑；可以提前最多 0.4 s 以暗色预示。

### 音频 `f.audio`（MV.Audio）

`bpm`、`beats[]`、`downbeats[]`、`sections[]`、`beatAt(t)`、`timeOfBeat(i)`、`barAt(t)`、`nearestBeat(t)`、`beatBefore(t)`、`nearestDownbeat(t)`、`downbeatBefore(t)`、`section(t)`、`env('low', t)`、`events('kick', t0, t1)` → `[{t, s}]`、`hit('snare', t, halfLife)`。

## 工具函数（全局）

- 数学：`clamp lerp remap smoothstep prog(t, a, b, ease) keys(t, [[t0, v0], [t1, v1, ease]…]) pulse(t, at, len)`
- 缓动：`ease.linear / inQuad / outQuad / inOutQuad / inCubic / outCubic / inOutCubic / inExpo / outExpo / inOutExpo / outBack / outElastic`
- 随机：`hash mulberry32 noise1 noise2 fbm1`
- 作画节奏：`tick(t)`、`onTwos(t)`、`MV.drawRate`
- 画布：`mk(w, h)` 新建离屏画布
- 绘制：`pathPoly pathSmooth bez2 bez3 polylineLength brush(g, pts, width, fill, taper, outline, lw) brushPoly TAPER fillStroke boiler(tick, amp)`
- 歌词排版：`karaoke(g, tokens, t, x, y, {font, space, draw(g, tok, x, y, st), showUnsung, lead})`，`st = {sung, active, age, i, w}`

## 风格包（kits/）

风格包就是一个全局函数集合，供多个项目复用同一种画风。项目在 `project.kits` 里列出名字即可加载 `kits/<名字>.js`。

**camera.js 和 layout.js 每个项目都该带**（`tools/new_project.py` 默认加上）。它们来自 `projects/pdoom-bolt`：那一支片子交出去以后，用户一条条追加的修改意见几乎都落在这两件事上——镜头不动、字出框。示例：`projects/kit-demo`（三个短镜头，每种用法一处）。

**camera.js**（镜头语言，全片一处说了算；场景一行不用改）：
- **缓推**（默认开）：没有真正静止的镜头。每个时间线条目在自己的时长里慢慢推近 2.6–5.2 %（按时长），外加几像素漂移。条目上写 `push: 0` 关掉（要写理由）、`push: 0.08` 推得更狠；`project.camera.push: false` 全片关掉。和邻居有交叉淡化 / 转场的条目不推（淡化结束时会跳）。
- **局部放大 + 跟随**：条目上写 `insert: { at, dur, amt, x, y, ease }`。不写 x / y 时焦点是场景这一帧的 `MV.focus`：被跟的东西待在它自己的位置上不跑，周围往外扫。
- **二维转三维**：条目上写 `warp: { at, dur, from, to, pitch, dist, bg }`，整帧像一块板子在透视里转过去（from / to 是偏转角，弧度：0 = 正对，0.6 ≈ 34°）。适合语域切换：纸上的图立起来转走。场景自己的图层也能用 `CAM.warpPlane(g, canvas, o)`。
- **主体不出画**：`CAM.keep(points, { anchor, safe, min })` 返回一个 ≤ 1 的缩放：以 anchor 为不动点把整个世界缩这么多，points 就都在安全区里。缩放跟着点走，点掉得快就缩得快，永远看得见：
  ```js
  const s = CAM.keep([tip], { anchor: [AX, AY] });
  g.save(); g.translate(AX, AY); g.scale(s, s); g.translate(-AX, -AY); /* 画世界 */ g.restore();
  MV.focus(AX + (tip[0] - AX) * s, AY + (tip[1] - AY) * s, 'pen tip');
  ```
- 所有推近都受 `MV.keep` 的框限制（离边至少 `project.qa.margin`，默认 96 px）。已经比这更贴边的框，推近不会再把它往外带：朝它那一侧就不推了（以前这种框会被跳过，字被推出画）。歌词留在场景画布上又报了 keep，`insert` 就只能推几个百分点；要推得狠（钻进一个局部、冲进瞳孔），把歌词画进屏幕层 `MV.overlay`：世界在推，字钉在原地，keep 不再需要。

**layout.js**（放进框里的字；不要再手写 x / y）：
- `BOX.font(g, size, { font, weight, track })`：font 可以是 CSS 字体名，也可以是项目自己的设置函数（如 `LK.mono`）。
- `BOX.fit(g, text, size, maxW, o)`：不超过 maxW 的最大字号（只缩不放）。
- `BOX.text(g, text, x, y, { size, maxW, align, base, color, alpha, keep })`：一行字；`keep: true` 顺手 `MV.keep`。
- `BOX.center(g, text, cx, cy, { size, font, color })`：短字（圆里的序号、方块里的字母）按**真实墨迹**居中在一点上。`textAlign 'center'` + `textBaseline 'middle'` 居中的是字框不是字形：数字会偏上或偏下，带字距的等宽字还会往左偏。
- `BOX.table(g, x, y, cols, rows, { cw, rh, color, lw })`：画表格并登记每个格子，返回 `T`；`BOX.cell(g, T, col, row, text, { size, font, align, pad, at, color })`：按真实墨迹在行里垂直居中、留边、超宽自动缩字；一行放两行字时用 `at`（0..1，墨迹中心在行高的位置）。
- `BOX.panel(g, x, y, w, h, { fill, stroke, lw, pad, name })` + `BOX.lines(g, P, lines, { size, gap, font })`：面板和面板里一叠字，字号缩到四边都留够 `pad`。


**act.js**（表演：让代码画的角色像卡通一样动，而不是像机器）：项目里有角色就加进 `project.kits`。和画风无关：每个函数只返回数字（姿态），角色自己的绘制函数读它们，水墨、赛璐璐、皮影、剪纸都能用。改编自 Claude Animation Base（MIT，© 2026 John Heibel），节拍换成了歌曲真实的拍网格（`MV.audio`）。示例：`projects/act-demo`（原创角色 Pip，三个短镜头，每种用法一处）。

姿态字段（角色的绘制函数读这些）：`dx dy`（以角色自己的单位 u 计，乘 u 用；dy < 0 向上）、`sq`（挤压：+ 压扁、− 拉长；用 `ACT.squash(sq)` 得到 `[sx, sy]`，以脚为中心缩放）、`rot`（以脚为轴的倾斜）、`aL aR`（手臂角：0 = 平伸，+ 向上，− 向下）、`lookX lookY`（−1..1）、`walk`（步相位）、`view`（画好的关键视角 `front / q / side / qback / back`）+ `flip`、`smear`（转身中间张的拖影）、`mood squint emote emoteK emoteAge`。几个姿态用展开合在一起；同一个字段（`dy`、`sq`）两边都动时用 `ACT.add(a, b, …)` **相加**，不要让后一个覆盖前一个。角色表演传 `f.tq`（按 drawRate 定格的时间），镜头运动传 `f.t`。

- 动作：`ACT.jump(t, t0, t1, h)`（起跳前 0.12 s 下蹲预备、上升下落拉长、落地压扁回弹）、`ACT.take(t, t0, amt)`（吃惊的"一缩一抻"）、`ACT.antic(t, t0, dur)`（任何动作之前反方向的预备量：`x = lerp(x0, x1, …) − 30·ACT.antic(t, t0)`）、`ACT.spring(t, t0) / ACT.ring(t, [t0, t1…])`（事件之后的阻尼晃动：落定、帽子和标牌的跟随）、`ACT.arc(p0, p1, h, k)`（抛物线上的点）、`ACT.walk(t, t0, t1, x0, x1, stride)`（缓入缓出地走，带步相位和起伏）。
- **停顿**：`ACT.poses(t, [[t0, 姿态0], [t1, 姿态1, 用时, 缓动], …])`：在 t1 之前**停在**姿态 0，然后用"用时"（默认 0.25 s，默认带过冲）快速到姿态 1 再停住。快动作、慢意思——和 `keys()`（整段时间都在匀速地动）相反。
- 跟随与错开：`ACT.lag(fn, t, lag)`（尾随部件——帽子、耳朵、尾巴、头发——取主体 lag 秒之前的运动）、`ACT.vary(seed)`（群体里每个角色的拍相位、幅度、延迟都略有不同：一群人整齐划一看起来就是复制粘贴）。
- 视角：`ACT.view(a)`、`ACT.turn(t, t0, t1, a0, a1)`（a 以圈计：0 正面、0.25 朝右、0.5 背面；0.12–0.25 s 内一张张换画好的视角，中间张带 `smear`）。**转身用画好的关键视角，不做三维投影。**
- 情绪：`ACT.moods`（31 种，每种是一种**动法**——身体怎么跟着拍子活着动，加上 `take`（切进这种情绪时反应多大）和 `emote`；脸由角色自己按 `mood` 名字画）。`ACT.feel(name, t)` 是一种情绪在 t 时的样子；`ACT.emotions(t, [[t0, 'sleepy'], [t1, 'surprised'], …])` 是**演出来的**情绪变化：变化前眼睛挤上、身体压扁（预备）→ 在眯眼下换脸 → 按新情绪的大小来一下 take → 带过冲落进新的动法 → 新的 emote 弹出来。返回的 `squint` 是眼睛闭合度、`k` 是颜色从旧情绪过渡到新情绪的进度。**表情从不硬切。** 项目可以加自己的：`ACT.moods.smitten = { take: .7, body: (t, b) => ({ … }) }`。
- 跳舞：`ACT.move(style, t, ACT.vary(i))`：`bounce hop roof sway wave walk run idle stomp shimmy spin mix`，锁在拍上。`ACT.beat(t)` 给出拍位置、拍内相位、每拍一次的起伏和冲击。

**角色定型图（MV.model）**：一个角色在所有视角、情绪、关键姿态下画在一页上（动画公司的 model sheet），写镜头之前先给用户看、自己也对着它画，角色就不会走样。在角色的 lib 旁边登记：

```js
MV.model('pip', { cell: [300, 400], ground: 0.84, guides: [9.2 * U, 6.4 * U],   // 头顶、眼线：每个视角都要碰到这两条线
  rows: [{ label: 'views', items: ['front', 'q', 'side', 'qback', 'back'].map(v => ({ label: v, pose: { view: v } })) },
         { label: 'moods', items: ['neutral', 'happy', 'surprised'].map(m => ({ label: m, pose: t => ACT.feel(m, t) })) }],
  draw(g, x, y, pose, t) { PIP.draw(g, x, y, U, pose, t); } });
```

`uv run tools/render.py projects/X model` → `out/model-<名字>.png`（`--name` 只出一个）；预览里打开 `index.html?model=<名字>`。`check` 会列出登记了哪些。用它查：各视角的头顶和眼睛是不是都在参考线上、侧面和背面是不是同一个角色、表情读不读得出来、手里的东西是不是碰到手。

：`paintCumulus`（硬边分色积云）、`drawLit`（角色单独成层 + 轮廓光）、`focusLines`（集中线）、`upLines`（速度线）、`sfx`（片假名音效字）、`titleText / lyricRow / bigWord / jpSub`（动画片头风格的歌词字和字幕）、常量 `FONT MONO INK`。配合 `drawRate: 12` 和 `post.grain ≈ 0.09`。

**ink.js**（水墨）：所有墨色都是同一种墨的不同浓度（`INK.A.qing / dan / zhong / nong / jiao`），纸纹透得出来。`paintXuan`（暖白宣纸）、`inkBloom / inkDrop`（墨滴落下、按落下后的时间晕开）、`inkStroke`（藏锋出锋 + 飞白笔毛，`upto` 可逐笔画出；见下）、`inkRidge`（山峦，带皴擦和点苔）、`inkRain`（三层斜雨，可避开歌词框）、`inkSoft`（低分辨率绘制再放大的柔边晕染，`grain` 让纸纹透出）、`inkLyrics / inkColumn`（竖排、从右往左、逐字洇出）、`inkLoadFont`，以及转场 `ink` / `wash`。配合 `drawRate: 12`、`post.grain ≈ 0.05`、`background` 设成纸色。

`inkStroke(g, pts, w, o)` 在一拍二下是稳定的：飞白的断笔按**归一化弧长**放置，所以每张作画都给线条加一点抖动（line boil）时，飞白留在原处，不会沿着笔画爬动。笔画按几个像素重新采样，断笔的起止是平滑的，只有两个点的短笔画也能正常画出。`o.breakLen`（像素）控制每根笔毛连续 / 断开的典型长度：默认 36，15–25 更碎，50–80 是长飞白；笔画长度本身在动画里变化时（比如生长的枝条），传 `o.gapLen`（固定参考长度），断笔就钉在笔画上。老项目想保留原来的笔触，在 `project.js` 里写 `"inkStroke": 1`（雨爱就这样钉住了）。

**pigment.js**（颜料合成层，WebGL2）：把颜料画在纸、素胚、釉面上的合成器。两种用法：

1. **分层**（新作品）：`const L = pigmentLayers()`（默认 W×H；`pigmentLayers(w, h)` 可以做贴图，比如瓶身展开图），每帧 `L.clear()`，然后往三层里画**浓度**：`L.wet`（分水、晕染、墨团：会晕开、边缘积色、有颗粒）、`L.dry`（勾线、干笔：清楚，咬纸纹）、`L.col`（真颜色：朱砂印、釉里红、天青天空，吃纸纹、上色不匀）。wet / dry 上只有 alpha 有用，用 `ink(a)` 或任何颜色画都行，ink.js 的 `inkStroke / inkBloom` 可以直接画进去。最后 `pigmentDraw(g, L, { preset, offset: [camX, 0] })`。浓度通过预设的色阶变成颜色；纸是程序生成、按 `offset / scale` 钉在世界坐标上的，镜头平移时不会游。`paper: 'none'` 输出白底，只有颜料变暗：用 `g.globalCompositeOperation = 'multiply'` 画到你自己画好的表面上（带明暗的瓶身），釉面高光在之后再画。
   预设：`ink`（水墨 / 宣纸：纤维、宽晕开、明显积边、颗粒）、`raw`（生料 / 素胚：哑光陶土、细颗粒和铁点、拉坯横纹、几乎不晕、咬纸重）、`cobalt`（青花 / 釉面：光滑釉、分水积边、浓线周围的晕散 `halo`、浓处的铁锈斑 `spots`）。任何字段都可以覆盖：`bleed`（像素）、`rim`（积边 0..2）、`halo`、`spots`、`gran`（颗粒）、`tooth`（干笔咬纸）、`jitter`、`paper`、`paperColor`、`ramp: [[浓度, '#hex'], …]` + `paperRef`（这些颜色所在的纸色）、`spotColor`、`offset`、`scale`、`seed`。一帧里可以合成多次（每次用完立刻 `drawImage`，下一次会复用同一块 WebGL 画布）。
2. **整帧**（已经画好的水墨）：`project.post.pigment = { rim: 0.8, wick: 0.5 }`（或场景 `render` 返回它）对整帧做一遍：淡墨块的内边缘积色（`rim`，`rimR` 像素半径），墨向纸里轻轻洇出（`wick`，`wickR`）。浓度按亮度相对 `paper`（默认宣纸色）估算。雨爱默认没开，想试就在它的 `project.js` 的 `post` 里加这一项。

示例：`projects/pigment-demo`（三种预设并排，素胚 / 烧成后的"滴水分开"对比）。

**qinghua.js**（青花纹饰，需要 ink.js + pigment.js）：一切都画成颜料**浓度**画进 pigment 图层，再用 `raw`（生料 / 素胚）或 `cobalt`（青花 / 釉面）合成。`QH`（调色板 + 浓度 `QH.D.ying / dan / er / zheng / tou` + 仿宋 `QH.FONT`）；`qhLine`（勾线笔：粗细几乎不变、起笔顿点、手抖 + 一拍二线条抖动，`upto` 逐笔画出，`smooth` 圆滑）；`qhFill`（分水：平涂，`k` 从一点滴开铺满）；纹样点列 `qhBegonia`（海棠开光）`qhRuyi`（如意云肩）`qhCurl`（云纹卷）`qhSmoke`（一缕烟）`qhWaves`（海水）`qhPetal / qhPeony / qhLeaf`；`qhStickerLayers + qhSticker`（带剪影遮罩的图层：人物、手能挡住后面的画）；`qhErase`（留白：把形状从浓度层里挖掉）；`ctx.qhClear = L.col`（之后的线和分水顺带清掉颜色层，天青天空留在人物后面）；`qhCylinder`（WebGL：把展开图卷到任意回转体上，哑光素胚 / 亮釉高光）；`qhLyrics`（竖排仿宋歌词，唱到时 0.12 s 显出，`fired` 青花色带晕散、`dark` 深色水里用浅色）。示例：`projects/qhc`。

**shadow.js**（背光影戏）：一盏灯、一块幕布，其余都是剪影。**形靠剪影，明暗靠距离**——物件离幕布 `z`（0 = 贴着布，L = 在灯那儿）时，按  `k = L/(L−z)` 绕灯做中心投影，半影按 `z/(L−z)` 变虚；这一条规则就是整个画风。刀口不是画出来的线，而是**从形体里擦掉**的缝，透出来的是背后被照亮的幕布；歌词也一样，一个字一个字"刻穿"。`screenCloth`（受光的幕布：衰减 + 经纬 + 褶皱 + 湿痕）、`lamp`（油灯、焰的呼吸、光晕）、`smoke`（灯烟/檀香，噪声场不是粒子）、`silhouette`（把 `drawFn` 画进图层 → 投影 → 模糊 → 合成，`o.cut` 擦刀缝、`o.edge` 画刀口亮边）、`cutStroke / cutShape / hideEdge / dyeInto / polylineUpTo`（生长的刀线、刀口亮边、渗色）、`screenRain`（幕前的雨丝 + 落在布上的雨点 `hits` + 浸湿的小点）、`carveLyrics`（逐字刻穿的歌词：每个字唱前最多 `preview` 秒（默认 0.3）以 `scar`（默认 0.18）的暗痕预示，唱到时 0.18 s 刻穿；返回它占的留白带供雨绕开），以及转场 `lightThrough` / `wetOut`。配合 `drawRate: 12`、`background` 设成暗室色。示例：`projects/qhc-ds`。

**lumen.js**（发光数据 / 终端科幻，WebGL2）：**画面上的一切都是光**。纯黑（或近黑）底，主体只由发光的点和细线构成，叠加混合：密处烧成白、边缘保留颜色，泛光把最亮的地方晕开；形靠点云和线框，远近靠大小、亮度和景深（失焦的点变成大而淡的光斑），信息靠极小的等宽字。`paper` 调色板把这条规则反过来：光变成纸上的墨，叠得越多越深（米白纸 + 石墨线 + 朱红点云的技术图纸）。即时模式，一帧一次 GPU 合成：

```js
const cam = lmOrbit({ yaw: f.t * .2, pitch: .3, dist: 6, shift: [180, 0] });  // 或 lmCamera({ eye, target }) / lmScreen()（像素坐标）
lmBegin('ice');                                    // 调色板：ice 冰白+青 | ember 香槟白+琥珀 | rose 品红紫 | alert 警报红 | paper 纸+墨
lmPoints(cam, this.cloud, { size: 1.4, gain: .6, dof: 12 });          // Float32Array xyz…（在 init 里建好）
lmLines(cam, this.edges, { width: 1.4, color: 'accent', upto: f.p }); // 线段缓冲（LG.seg / LG.poly / LG.grid…）
lmBig(lmGlow(), 'SIGNAL', W / 2, H / 2, { decode: f.p, t: f.t });     // 画进 lmGlow() 的 2D 内容会和光一起泛光
lmEnd(g);                                          // 泛光、色调、色差、底色 → 画进 g
lmHud(g, f, { id: 'c1', name: 'boot', rows: [['points', 140000]] });  // 清晰的文字画在最上面
lmTerminal(g, f);
```

- 颜色参数都可以写 `'#hex'`、`[r, g, b]`（0..1）或调色板键名 `'fg' 'dim' 'accent' 'hot' 'warn'`；`lmBegin('ice', { accent: '#9cf' })` 只改这一镜。
- `lmPoints(cam, P, o)`：`size`（对焦距离处的像素半径，近大远小）、`gain`、`color` 或 `colors`（每点 rgb）、`sizes`（每点倍数）、`dof`（无穷远处的弥散像素，按 |深度 − 焦距| 变大，点会变成等能量的光斑）、`focus`（默认相机到目标的距离）、`blur`（平面模糊，`lmScreen()` 时用）、`fog`（亮度减半的距离）、`twinkle` + `t`（闪烁）、`drift` + `t`（每点绕原位飘动，世界单位）、`count`（只画前 n 个：逐步出现）、`model`。
- `occlude`（`lmPoints` / `lmLines` 都有）：项目带了 `kits/solid.js` 时，光也有了深度。`true` = 躲在实体 / 写深度的着色器后面（被挡住的部分不画）；`'behind'` = **只**画在它后面的那部分（玻璃后面的那一半，见 `smGlass`）。没有 solid.js 时这个参数不起作用，lumen 照旧没有深度。
- `lmLines(cam, S, o)`：线段每段 8 个数（a xyz、b xyz、亮度、端头：1 = a 端圆头、2 = b 端、3 = 两端；折线内部是平接，所以叠加不会在拐点出亮点）。`width`（像素）、`color`、`gain`、`glow`（贴身光晕 0..1）、`glowR`、`upto`（0..1 按顺序画出，生长的尖端是圆头）、`dash: [实, 虚]`、`dof`、`fog`、`model`。
- `model: { pos, rot: [rx, ry, rz], scale }` 在 GPU 上变换；标签要跟着转动的点走时用 `cam.project(lmXf(model, p))` → `[x, y, 深度]`。
- `lmEnd(g, o)`：`bloom`（强度）、`radius`（0..1 光晕宽度）、`levels`、`exposure`、`ca`（边缘色差）、`lens`（边缘压暗）、`blend: 'screen'`（不画底色，把光叠到 g 上已有的画面上）。一帧里可以 begin / end 多次。
- 形状 `LG`：点云 `sphere`（斐波那契球面）`ball` `gauss`（高斯团）`box` `disk`（向日葵盘）`ring` `galaxy`（旋臂星系）`stars`（远处星尘）`text`（文字采样成点，em 单位）`along`（沿折线撒点：粒子尘拉成的线）；线段 `seg`（折线）`pairs` `edges` `poly('tetra'|'cube'|'octa'|'icosa'|'dodeca')` `wirebox` `grid` `circle` `curve` `join`。
- `lmMorph(A, B, k, o)`：每个点从 A 飞到 B（`stagger` 错开、`swirl` 弧线、`ease`），点数可以不同；`o.out` 复用输出数组。这是这类片子不硬切的转场：一个图形散开、飞成下一个图形。
- 文字（Canvas 2D，画在 `lmEnd` 之后）：`lmTerminal`（左下终端歌词：`> ` 提示符，唱到的词**整词**在它的 start 打出、落下时闪一下 accent 色，方块光标在拍子上闪，旧行整体上移变暗；唱完 `commit` 秒后换新提示符；`status` 是下面一行小字状态；切点之前已经唱完的句子不带进镜头，也不当历史行画——`since` 默认就是 `f.from`）；`lmCaption`（底部居中字幕：逐词 0.16 s 淡入并微微上浮，`track` 字距，一个词一次 `fillText`）。两个都是 qa 安全的：**不要自己写逐字母打字的歌词**——qa 在词的 start 之后 0.03–0.3 s 看它，长词打到一半就是 `lyric-hidden` / `lyric-missing`；要打字机的感觉，就让整词落下时闪一下。`lmAmbient(lmGlow(), f, { gain })`（几团大而淡的光在画面里缓慢漂移、随低频呼吸：点云稀疏的暗场静镜逐帧变化太小，qa 会报 `static`，先加它，比硬加运动自然；`gain: 0.5` 只留一点）；`lmHud`（四角细框 + 左上"镜头号 时间码 名字" + 右上键值读数 + 右下注脚，`on` 用 `lmFlick` 做通电闪烁）；`lmSection(g, 2, 6, '标题', 'SUB')`（章节号）；`lmTag`（小号宽字距标签）；`lmLabel`（圆点 + 折线引线 + 字，`draw` 0..1 动画，纸面模式自动垫底色）；`lmBig`（宽字距大字：`reveal` 逐字出现、`decode` 乱码解出、`glitch` 跳字换色）；`lmCode`（带行号、关键字着色、逐字打出的代码块）；`lmCodeBg`（满屏暗代码纹理，`lmSource('镜头名')` 取这个镜头自己的源码）；`lmCount / lmFmt`（数字滚动和千分位）。字体 `LM_MONO`（等宽）、`LM_SANS`（细黑，中文用苹方 / 思源）。
- 后期：镜头 `render` 返回 `{ glitch: 0..1 }` 整帧撕裂（横条错位 + RGB 分离 + 少量错位块），放在拍点上；时间线遮罩转场 `wipe: 'glitch'`（新镜头从闪烁的横条里出现）。
- 配合：`project.post` 设 `grain ≈ 0.03`、`vignette: 0`（暗角在 `lmEnd` 里按调色板做），`background: '#000'`。网格、星尘、几何都在 `init()` 里建好；大数组（> 4096 个数）按对象缓存到 GPU，原地修改要 `arr.__v++`（`lmMorph` 自动做），小数组每次直接上传。

示例：`projects/lumen-demo`（六个镜头，每种调色板和主要技法各一个）。

**solid.js**（受光的面 + 全屏着色器，接在 lumen 上，WebGL2）：lumen 的规则是「只有光」，画不了的两类东西由它补上，**画进同一块光缓冲、在 lumen 的泛光 / 色调 / 色差之前**，所以和点云、线框是一张画。`project.kits` 里写在 `lumen` 后面：`["lumen", "solid"]`。

```js
init() {
  this.heart = SG.implicit((x, y, z) => …, [-1.3, -1.1, -.9], [1.3, 1.3, .9], 120);   // 任意 f(x, y, z) < 0 = 内部
}
render(g, f) {
  const cam = lmOrbit({ … });
  lmBegin('rose');
  lmPoints(cam, this.wall, { size: 1.6 });                      // 背景：先画，会透过玻璃被折射
  smGlass(cam, this.heart, { model, ior: 1.5, tint: 'accent' }, occ => {
    lmPoints(cam, this.ring, { occlude: occ });                 // 调两次：先画玻璃后面的一半，再画前面的一半
  });
  smMesh(cam, this.bolt, { color: 'fg', rim: .8 });             // 不透明受光实体
  smShader('lattice', SRC, { cam, t: f.t, depth: true, u: { uK: .4 } });   // 全屏 GLSL（光线步进等）
  lmEnd(g);
}
```

- `smMesh(cam, mesh, o)`：三角网格，带深度缓冲，抗锯齿（GPU 支持时 4× MSAA；HUD 角注里可以打 `SG.samples`）。`o.mat`：`'lit'`（默认：不透明，漫反射 + 高光 + 菲涅耳边光 + 暗摄影棚的反射）、`'glass'`（把**已经画好的**光按法线折射过来，红蓝分开的色散、菲涅耳反射、按厚度吸收的染色、内边缘光）、`'xray'`（只有叠加的边光，不写深度：全息 / 幽灵面）、`'depth'`（只写深度）。参数：`model`、`color`、`rim` + `rimColor` + `rimPow`、`spec` + `specColor` + `shine`、`ambient`、`diffuse`、`env`（摄影棚反射）、`light` / `fill`（光的方向）、`gain`、`fog`、`twoSided`（开口的曲面：背面也受光）、`bands: { axis, step, width, color, gain }`（沿一个轴的等高线，屏幕空间抗锯齿：曲面图、地形）、`upto`（0..1 只画前一部分三角形：曲面长出来）；玻璃另有 `ior`、`refract`（像素）、`dispersion`、`tint` + `tintK`、`glow`、`rough`（磨砂模糊）。`paper` 调色板下实体按墨的浓度着色。
- 画的顺序就是遮挡：实体盖住**之前**画的光；之后画的点和线要躲在实体后面就写 `occlude: true`。实体之间按深度互相遮挡。
- `smGlass(cam, mesh, o, scene)`：玻璃里外都有东西时用：先写玻璃的深度 → `scene('behind')`（把可能在玻璃后面的东西画一遍，参数直接传给 `occlude`）→ 玻璃（折射前面画的一切）→ `scene('front')`（同样的东西再画一遍，这次只画在玻璃前面的）。在 `smGlass` 之前画的背景不用写 `occlude`：它本来就在后面。
- `smShader(name, src, o)`：全屏片元着色器，`src` 里写 `vec4 shade(vec2 px)`（px = 成片像素，y 向下），返回光的 rgb 和覆盖度 a。前置库 `SM_GLSL` 已经给了：`smRay(px, ro, rd)`（lumen 相机在这个像素的射线，含 `shift`）、`smHit(p)`（这个像素显示的世界坐标点，`o.depth` 时写进深度缓冲，于是 lumen 的点线能飞到结构后面去）、`hash12 / hash13 / hash33 / vnoise / fbm / rot2`、`sdSphere / sdBox / sdBoxFrame / sdTorus / sdCapsule / smin`、`smRep / smCell`（无限重复的格子和格子编号），uniform `uTime uFg uDim uAccent uHot uWarn uInk uEye`。`o`：`cam`、`t`、`u: { uName: 数 | [2..4 个数] | Float32Array(16) }`（自己在 src 里声明）、`blend`（`'add'` 默认 / `'over'`）、`res`（0.25..1：按比例低分辨率渲染再放大，软的雾、光晕、热力图用；软件渲染时省时间）、`depth`（只在 `res` 为 1 时）。一个名字对应一份源码（按名字编译一次缓存）。在 `smShader` 之后再画的实体不会被它挡住（实体只认自己的深度），需要互相遮挡时先画实体再画着色器。
- 网格 `{ pos, nrm, idx?, col? }`（Float32Array / Uint32Array），在 `init()` 里用 `SG` 建好：`SG.implicit(fn, lo, hi, n, { grad })`（隐式曲面 fn = 0 的网格，行进四面体法，无须查表、无破洞，顶点按格边共享、法线取梯度：心形曲面、元球、代数曲面；**法线要靠梯度**，fn 在曲面上梯度为零的写法（比如三次方的整式）先化成梯度不为零的等价式，见 solid-demo 的 `glass`）、`SG.sphere(r, seg)`、`SG.tube(a, b, r, seg, { caps })`（键、支杆）、`SG.box([w, h, d])`、`SG.height(fn, [w, d], n)`（y = fn(x, z) 的网格曲面）+ `SG.heightSet(m, fn)`（每帧原地改形：振动的板、波面）、`SG.xf(mesh, model)`、`SG.merge([{ mesh, model, color }, …])`（一个网格：球棍分子）、`SG.wire(mesh)`（网格的边 → lumen 线段，给实体描发光的边）。原地改了数组要 `mesh.__v++`（`heightSet` 自己做）。

**sim.js**（确定性的模拟）：一个模拟在 t 时的状态定义成「在镜头开头 `t0` 调 `init(t0)`，再用固定步长 `dt` 调 `step` 一直到 t」——这是 t 的纯函数，不管帧是怎么要的：导出时每个 worker 接着上一帧往前算；乱序（qa、运动模糊的子帧、从镜头中间开始的块）从 t0 或最近的检查点算起；预览往回拖就回到检查点再往前。检查点（每 `every` 秒存一份状态的拷贝）让跳转便宜。和画风无关，Canvas 2D 的项目也能用。

```js
init() {
  this.sand = SIM.make({ dt: 1 / 60, every: 0.5,
    init: t0 => ({ x: Float32Array.from(…), z: …, rng: SIM.seed(N, 5) }),   // 只放数、typed array、普通对象
    step: (s, t, dt, i) => { … },                                           // 原地改 s；随机数从 s.rng 里取（SIM.xs）
  });
},
render(g, f) { const s = this.sand.at(f.t, f.from); … }                     // 读它；下一次 at() 会改它
```

- `step(s, t, dt, i)` 里的 t = t0 + i·dt 是这一步**开始**的时间。随机数只能来自状态（每个粒子一个 xorshift 种子，`SIM.xs(rng, i)`，`SIM.seed(n, s)` 生成）或 `hash(i, …)`，不要 `Math.random`。
- `make` 的参数：`dt`、`every`（检查点间隔秒数）、`keep`（每次运行最多留几份，开头那份一直留）、`budget`（检查点总字节数）。`at(t, t0)`、`stepAt(t, t0)`、`reset()`。
- 成本：每个导出 worker 第一次进这个镜头时要从镜头开头算起（solid-demo 的百万沙粒一步约 20 ms，6 秒的镜头几秒钟）。用了 `--samples`（运动模糊）时 `dt` 不要比一个子帧长，否则几个子帧落在同一步上。

示例：`projects/solid-demo`（三个镜头：玻璃心形曲面在跳、光线步进的晶格巨构里穿行、百万沙粒在振动的板上排成克拉尼图形）。

**roto.js**（转描：AI 素材 / 实拍 → 孔版印刷赛璐璐，WebGL2）：把视频片段、静帧（即梦 / 任何生成器的输出、照片、手绘底板）重画成印刷出来的动画赛璐璐，**原始素材不上屏**：保边平涂（三遍）→ 每个像素吸附到镜头调色板里最近的油墨（本色 / 压暗两档）→ 压暗区铺 45° 网点 → XDoG 重新提线、按作画张抖动 → 一版错位的第二色线。然后整帧（歌词一起）过一遍印刷：纸纤维、纸齿、暗版错位、缺墨白点、颗粒、暗角。

```js
// 素材：uv run tools/frames.py projects/X J clips/sdJ.mp4 --t0 123.3   → frames/J.js（在 project.scripts 里列出）
rotoDraw(g, rotoFrame('J', f.t), { pal: 'sea', tick: f.tick, cam: { x: .5, y: .48, z: 1.04, rot: 0 }, misCol: ROTO.INK.pink });
const cv = rotoCel(src, o); g.drawImage(cv, 0, 0);    // 要再用这张结果（套印、贴到别处）时；下一次 roto 调用前有效
rotoKara(g, f.t, line, { box: [96, 700, W - 192, 284] });   // 满屏逐词砸入；rotoSide 块状划入；rotoSub 明朝字幕；rotoSlam 单个词
return { press: { mis: 1.5 + 3 * f.a.kick, grain: .03, vig: .35, flash: 0 } };   // 印刷参数（project.post.press 是默认值）
```

- 帧包：`tools/frames.py` 把 mp4、帧文件夹或单张静帧打成 `frames/<名字>.js`（JPEG data URL，所以双击 index.html 也能预览；file:// 的 `<img>` 会污染画布，WebGL 不收）。默认只留 `drawRate` 张 / 秒、宽 960（静帧 1920）；`--t0` = 片段第一帧对应的歌曲时间，`--start / --dur` 只截片段里稳定的一段（帧包从截取的第一帧算起），`--sharpen 70 --quality 92` 给生成的视频片段（图生视频比它的首帧插画软，镜头一推近就更明显；锐化把线条拉回到接近插画），`--delogo` 去水印，`--add` 顺手把帧包写进 `project.scripts`。插画和图生视频片段用 `tools/dreamina.py`（即梦画布 CLI `dreamina-canvas`，在装了它、登录过的机器上跑：不带 `--ceiling` 只存草稿和报价，带 `--ceiling N` 才扣积分；视频用 first_last_frame 模式，首帧 = `art/<id>.jpg`；提示词在 `art/prompts.json` / `art/clips.json`，输出 `art/<id>.jpg` / `art/clips/<id>.mp4`；`doctor` 把 CLI 版本、schema 和实时模型表存到 `art/dreamina/`），打包视频时 `--width 1920` 保持插画清晰度。kit 在 `onInit` 里预载全部帧包。
- `rotoFrame(seq, t, o)`：按 `onTwos(t) − t0` 取画（全片的画在同一个作画张上换）；`o.lag`（秒，口型偏晚时提前）、`o.at`（片段内时间，做慢放 / 定格，自己用 `f.tq` 量化）、`o.smooth`。
- `rotoCel / rotoDraw` 选项：`pal`（`ROTO.PAL` 键名或 `['#hex', …]` 最多 10 色；皮肤色要列进去，不然脸会变成橙色）、`cam {x, y, z, rot}`（任意比例的素材都按铺满裁切；`rot` 时把 `z` 加大盖住四角）、`tick`（传 `f.tick`）、`line / lineTh`（线量 / 阈值）、`tone`（网点）、`shade`（压暗量）、`sat`、`expo`、`flat`（平涂程度）、`lineCol / misCol / shadeCol`、`key + keyCol`（按颜色抠底，出 alpha）、`remap {from, to, amt}`。
- 调色板 `ROTO.PAL`：`room stage dc sea plug pink blue red mono`；油墨 `ROTO.INK`；字体 `ROTO.F.slab / mincho / mono / monoL`（Anton / Shippori Mincho B1 / JetBrains Mono，项目里嵌字体，见 roto-demo 的 `lib/fonts.js`；没嵌时退回 Impact / 冬青明朝 / Menlo）。
- 歌词：一句在下一句的第一个字开始时离场（`o.until` 可改）；`rotoHud` 角落读数（左上两行字 + 右上计量条）；`rotoSpark` 星芒。
- 配合：`project.post` 设 `grain: 0, vignette: 0, press: {…}`，`drawRate: 12`。每帧一次 cel 在 Mac 的 GPU 上约几十毫秒；静态的印样在 `init()` 里印好存成画布。

示例：`projects/roto-demo`（P(doom) 最后一段副歌 + 尾声，四个镜头：不唱的视频、静帧当底板、对口型的全身舞台、特写拉远成印样墙）。

**illust.js**（插画 MV：一枚绘 + 撮影 + 动态歌词）：每个镜头是一张完成的插画（常常是文生图），画本身不动，靠镜头（有缓入缓出和停顿的推拉、长图滑移）、在 `init` 里预算一次的撮影处理（高光柔光、调色）、几层代码画的光（浮尘、光斑、透过光）和动态歌词让它动起来。`illImage(id)`（`frames/<id>.js` 帧包里的静帧，kit 自己预载）；`illPrep(src, { glow, glowR, thresh, grade: { tint, amt, lift, liftAmt, sat, gamma, expo } })` 调色 + 高光柔光，返回画布（只在 init 里调）；`illBright(src, n, { box, thresh })` 找图里最亮的局部极大值（窗灯、LED）；`illCam(p, [[p, {x, y, z, rot}, ease], …])` 镜头关键帧；`illCover(g, src, cam)` 铺满裁切画出，返回 `map(u, v) → [x, y]`，代码层用它钉在画面上的物体上（`map.scale` = 原图像素 → 屏幕像素）；光：`illDust`（光束里的浮尘）、`illFlare`、`illRays`（透过光）、`illLeak`（漏光）、`illBokeh`。歌词：`illLineAt(lyrics, t)`（一句从第一个词显示到下一句第一个词）；`illVerse`（逐词上浮淡入，关键词 1.5× 信号色；`y` 是最后一行的基线，多行往上排）、`illSlam`（hook：逐词砸入 + 错位色）、`illSlant`（−6° 片头字幕）、`illQuiet`（小号明朝，原地淡入）、`illOutline`（横跨天空的空心大字，按音节逐字显出）、`illPrompt`（聊天输入框：唱到的词被逐字打出、方块光标、"正在输入"三点）；都接受 `words: [i0, i1)` 只显示一句的一部分；`illPop`（快歌的主歌：逐词大号砸入，正在唱的词抬起、带错位色、跟拍弹一下）；`illSlant` 加 `bounce: true` 时最新的词跟拍弹。字体栈在 `ILL.F.{gothic, display, mincho, dot}`。配合 `drawRate: 12`、`post.grain ≈ 0.04`。

快歌光靠缓推会像幻灯片，再加三样：`illGroove(f, cam, src, e)` 让画面跟拍走（每拍一次推近 + 下点头、小节头更重、逐拍左右轻歪、慢速手持漂移、硬切后头 0.2 s 的冲入），返回新的 cam 给 `illCover`，只动画面、不动后画的字；`e` 是强度，直接用段落的 `energy` 最省事。`illSnapCam(f, shots, { every | at, snap, creep })` 在同一张图里按拍切取景（每 `every` 拍从小节线数起，或在 `at` 的时间点），等于不加新图的镜头内剪辑。`illClipImage(id, ct)` 取视频帧包在片段时间 `ct` 的那张画：用插画当首帧做图生视频（`tools/dreamina.py`），打成帧包后替换静帧，人物、头发、云就真的在动。画在瞳孔上的东西（HUD 圆环、映出的光点）要跟着眼睛：`tools/eyetrack.py` 量出帧包每张画眼睛的开合（0 = 闭上）、瞳孔相对第一张的偏移和每次眨眼的起止，写进项目的 spots，代码按片段时间取值，跟着瞳孔走、闭眼时熄掉（pdoom-akari 的 `akEye`）。夜景里的灯要一扇扇亮起来：`tools/lightsoff.py` 找出插画里亮着的窗户（暖色高亮、和粉色地平线分开，一扇窗的几格玻璃合成一组，连同画上的光晕），涂成墙色存成 `<id>off` 帧包，并打印每扇窗的框；镜头画暗的那张，到点时把那扇窗的框从亮的那张画上去（pdoom-akari 的 S17 first_thread）。示例：`projects/pdoom-akari`（`lib/akari.js` 的 `akStill` 是建立在它上面的通用"插画镜头"）。

**print.js**（行式打印机 / ASCII 打印稿，WebGL2）：**整帧就是一卷连续打印纸，一切都是色带敲上去的字**。画面先用 Canvas 2D 画成黑白（+红）的图，再按形状匹配成 Courier 字符（每格 3×3 区域的形状向量找最像的字形，所以线稿会变成 `/ \ | - _`，不是简单的亮度阶梯）；暗部用叠打（同一格再敲 1–2 个 `= X O # M W @`）。文字直接写进文字格，可以 2–4 倍扩展打印。纸、油墨、相机都在一个 GPU 着色器里：14⅞" 绿条纹折叠纸（半英寸一条浅绿、两侧链轮孔、撕边虚线、每 11" 一道齿孔和山折 / 谷折明暗、纸纤维），碳黑色带 + 双色色带的红半边（红字顶上带一点黑边），每个字的锤击力度和上下错位（波浪基线）、色带织纹和磨损，字形图集带 mipmap，所以推到字跟前也清楚。

```js
init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },          // 画面格的字距行距（10/6 标准、15/8、20/10 更细）；文字格固定 10 cpi × 6 lpi
render(g, f) {
  const S = this.S.clear();                                    // 每帧（或按作画张）清空
  S.g.fillStyle = '#000'; …                                    // 在 sheet px 里画：黑 = 黑墨，'#f00' = 红墨，白 = 纸，灰 = 浓淡
  S.put(10, 34, 'I SEE SPARKS', { x: 3, red: true });          // 文字格：精确的字；x 扩展打印（xw / xh 分开），strike 叠打，ink 浓淡
  S.banner('AGI', 66, 8, { h: 14, align: 'center', red: true }); // BANNER：大字由它自己的字母拼成
  S.box(30, 4, 98, 12, { title: 'MODEL' });                    // +---+ 框；S.knock 把画面挡在外面；S.stencil 用字填满一个形状
  prPrint(g, S, { cam: { x: W / 2, y: H / 2, z: 0.9, tilt: 0, rot: 0 }, seed: f.tick, key: f.tick });
}
```

- 坐标：纸面 x 0..W 是 13.2" 的打印行（10 cpi 时 132 列），纸宽 14⅞"，两侧是链轮孔边；y 沿纸带往下。`prSheet({ oy })` 把一张放在纸带的 y 处（`h` 可以比一屏高，比如一路印下去的长图）；`prPrint(g, [S1, S2], …)` 一条纸上放几张。
- 相机 `{x, y, z, rot, tilt, spin, fov}` 看着纸面上的点 (x, y)：`z = 1` 打印行正好铺满画面，`z ≈ 0.86` 露出两侧的孔；`tilt`（弧度）让镜头躺下，纸带向画面上方远去（远处按 `fog` 隐进暗处）。`prProject(cam, x, y)` / `prUnproject` 在纸面和屏幕之间换算，用来在纸上叠 2D 的东西。
- `reveal`：`S.reveal`（或 `o.reveal`）是 sheet px 的 y，它以上已经打好，它穿过的那一行按链式打印机的顺序零散地敲上；`S.revealText = true` 让文字格也服从它，`put(…, { now: true })` 的字（歌词、页眉）不等它。
- `key`：同一个 key 再来时跳过字形匹配（例如画面只按作画张变化就传 `f.tick`）。用了 key，画面就只能由 `f.tq` 决定。
- `prSheet({ pic: false })`：只有文字格（BANNER 页、表格、歌词纸条），省掉匹配。`crisp`（形状对比度，1.7；渐变明暗的 3D 物体用 1.0）、`density`（叠打能到的最深，0.72）、`knee`（多亮以下只用一个字）可调。
- `prSlip(g, S, [x, y, w, h], { rot })`：从同一卷纸上撕下来的一条，压在镜头前（镜头俯冲、旋转时放歌词）；S 的 sheet px 就是屏幕 px。
- `S.cells()` 列出文字格里打上的字（拆开 BANNER 让字符飞散）；`S.pcell / tcell(x, y)` 像素 → 格子；`S.knock(c0, r0, c1, r1)` 让一块文字格下面不印画面（已有的字留着），`S.erase(…)` 把一块擦回白纸。
- 纸带的头尾：`prPrint(…, { paperFrom, paperTo })`（纸面 y；一页 11" = `11 * W / 13.2` px，所以停在折痕上就取它的整数倍），之外是暗处——纸打完、纸尾飞走就靠它。
- 画风规则：图要画成**线稿（线宽约 0.3–0.4 格）+ 实黑 + 少量平灰**，渐变只留给 3D 明暗（会变成字符阶梯）；粗线会变成一列 `0` / `M`。
- 字体：Courier Prime Regular / Bold（OFL，`kits/fonts/OFL-CourierPrime.txt`），子集化后嵌在 kit 里，所以 Mac 和别的机器打出来一样；BANNER 也用它。配合 `drawRate: 12`、`post.grain ≈ 0.03`、`vignette ≈ 0.2`、`background: '#141312'`、`flashColor` 用纸色。

示例：`projects/pdoom-print`（P(doom) 全曲，46 个镜头；`lib/pp.js` 有逐词打字的歌词、页眉、人形、眼睛和一个 z-buffer 的 3D 曲面光栅化）。

写新风格包的建议：只放"这种画风在任何歌里都用得上"的东西（笔触、质感、特效、文字风格）；角色、道具、具体场景放在项目的 `lib/` 里。

## qa（`render.py qa`）

`check` 只看报错和时间线；`qa` 量**观众看到的东西**，全部用真实渲染的帧算，不靠看图：

| 类别 | 级别 | 量的是什么 |
|---|---|---|
| `lyric-hidden` | 错误 | 一个词在唱到的那一刻，自己的字形只有不到一半真的显示在画面上：被后画的东西盖住、被遮罩裁掉、被镜头推出画面、或者和背后同色。（做法：同一帧带歌词渲一次、不带歌词渲一次，只在这个词自己的字形像素里比两张图。） |
| `lyric-faint` | 警告 | 同上，显示了一半到 `qa.vis`（默认 0.8） |
| `lyric-missing` | 警告 | 唱到的词根本没有作为文字画出来（先画进离屏图层再贴上的，如点阵字，算"无法测量"，只计数不报） |
| `lyric-edge` | 警告 | 唱到的词离画面边缘不到 `qa.margin`（96 px） |
| `lyric-covered` | 警告 | 这一镜早先唱过、还画着的词，后来被盖住了（显示不到一半）：有东西移到它上面，或者推近把画面推到了屏幕层歌词底下。qa 在每镜第一帧和 15 / 50 / 85 % 处回头看 |
| `lyric-cover` | 警告 | **歌词挡住了画面**：歌词的字和它后面的底条 / 牌子（屏幕层里的，或场景里 `MV.lyric` 包着的）盖住了画面细节（边缘）的 8 % 以上，而且放在画面比平均更密 1.5 倍的地方（压在画上，不在空处）；或者盖住 25 % 以上；或者压在这一镜的主体（最后一个 `MV.focus`）上。在每镜第一帧和 15 / 50 / 85 % 处看。`qa.cover` 调阈值 |
| `lyric-touch` | 警告 | （`lyric-touch` / `text-touch` 的报告都写出**接触在哪**：在字的哪一侧——上、下（沿基线）、左右端、字母之间穿过——各占多少、沿字跨了多宽、接触处的颜色、像素坐标、最近的 `MV.focus`，不用开截图就能定位。）唱到的词贴上了**和它同色**的东西：字母外面一圈（0.06 em 宽）里超过 7 % 是字自己的颜色（在不带歌词的那张图里量）——一条线从字中间穿过、字母站在坐标轴或框线上、推近把门框推到屏幕层的字底下。看着像删除线或粘在线上。`qa.touch` 调阈值。**也报不同色的**：任何颜色的画（灰色栅栏柱、绿色曲线、蓝色放射线、点、伸过来的手）伸进字里——比底色明显的线碰到的字母轮廓加起来超过 0.6 em（`qa.cross`）。一条线直穿一个词，每穿过一个字母大约碰两个线宽 |
| `text-touch` | 警告 | 同一件事，量的是其他字（24 px 以上：印章、标题、大数字、当装饰用的歌词词）：从成片里量，颜色取它画的时候的 fillStyle。黑色印章压在黑色图上、刻度数字被指针或条纹吞掉；别的颜色的画伸进字里超过 0.8 em（`qa.crossText`）：回形针压在数字上、手压在印章上、线穿过标签。`qa.touchText`（默认 20 %）。禁令牌的斜杠压在符号上、故意划掉的字这种本来就要叠的，保留并在 TREATMENT 写理由 |
| `lyric-carryover` | 警告 | 新镜头把**切点之前已经唱完的那一句**又画了一遍（换了新镜头的样式和位置）：上一镜的最后一句在下一镜开头闪一下。一句只有在切点之后还有词要唱时才跨镜头；唱完了，新镜头就先空着，等自己那一句开始。qa 在每个镜头的第一帧都看一次 |
| `lyric-handover` | 警告 | 转场（交叉淡化、zoom、reflow）重叠的那段里，**旧镜头把新镜头的那一句**（切点之后才开始的句子）按自己的样式和位置画了出来：这句话同时出现两份，一份在淡出。用 `f.lyrics.lineAt(f.t, f.from)` 取句就不会这样（它会去掉 `f.until` 之后开始的句子） |
| `lyric-overlap` | 警告 | 两段歌词文字叠在一起（重叠超过小的那段的 20 %，而且中心错开——描边、投影那种原地重画不算）：通常是两句、或同一句画了两次挤在同一个位置 |
| `box-cross` | 错误 | 框**自己的字**（同一个 `MV.group`）跨出了框，或者不在这组的任何一个框里（掉出了表格） |
| `box-tight` | 警告 | 框自己的字在框里，但某一边的余量不到墨迹高度的 40 %（至少 3 px；`MV.box` 的 `pad` 可改） |
| `box-clash` | 警告 | **别人的字**和框撞车：被框线切过，或者压在框里自己的字上（引线的落款压到标题栏、手写坐标的数值跨过表格线、歌词压在标牌的边框上）。歌词也算：本该印在牌子上的歌词，画进牌子的 `MV.within(owner)`，就按"自己的字"从严查 |
| `text-cut` | 警告 | 一段字（标签、表格里的值、还挂着的歌词）在场景里离边 ≥ 96 px，被镜头的推近 / insert / shake 带出画面边一点点（切掉 5–50 %），而且镜头停在那儿：看着像出错。要么留整（`MV.keep`、往里挪），要么推到它整个出画。镜头还在动时的裁切、场景自己贴边放的字（图框的分区号）不报 |
| `focus-out` | 错误 | `MV.focus` 报的主体跑出了画面（或离边不到 3 %） |
| `static` | 警告 | 一个镜头（去掉歌词）从头到尾几乎不变，或有一半以上时间（≥ 1.5 s）定住不动 |
| `one-speed` | 警告 | **有快有停**：2.5 秒以上的镜头（去掉歌词），每 1/6 秒量一次画面变了多少，最快的一刻不到最慢那一成的 3 倍（或者两者差不到画面的 2 %）：整段一个速度。要么只是在漂（什么也没发生），要么一直匀速冲（没有一刻突出、也没有一刻停下来让人看）。给它一个事件（落在拍上的冲击、转身、到达），对着一段较静的时间；或者把镜头剪短。从切入（`fadeIn`，至少 0.35 s）之后量到结束前 0.2 s。速度曲线写在 `out/qa/report.md` |
| `read-unled` | 警告 | 一条带 focus 名字的 read（timeline 的 `reads`）开始时，这个镜头的主体（最后报的 `MV.focus`）不是它：眼睛不在这条 read 上。到这条开始时把它变成主体 |
| `type-flat` / `type-band` | 警告 | 全片歌词字号差不多大（最大 / 最小 < 2.5 倍）；七成以上歌词挤在同一条横带里（像字幕）。只在整片跑 qa 时判；`--from / --to` 只打印这一段的数字 |

输出：终端摘要、`out/qa/report.md`（含每个镜头的运动量表）、`out/qa/qa.json`，以及每条问题一张**局部放大的截图**（红框是字或主体，黄框是它该在的框）。有错误时退出码为 1。`--from / --to` 只查一段，改一个镜头时用它。`project.qa = { "margin": 96, "vis": 0.8, "motion": 0.02, "freeze": 0.005, "typeRange": 2.5, "off": ["lyric-edge"] }` 调阈值或关掉某一类。

做完的标准是 **qa 没有错误**，警告逐条处理或在 TREATMENT 里写下为什么保留。拼板（`sheet --cuts`）还是要看，但它看不出几个像素的出框、看不出被裁掉一半的字——那些交给 qa。

## 性能

预览目标 < 40 ms / 帧。Canvas 2D 的大面积 `filter: blur()`、每帧新建大画布、每帧重画静态背景最费时，都应该移到 `init` 里。需要 WebGL 时，在场景里建一个离屏 WebGL 画布，渲染后 `g.drawImage(glCanvas, 0, 0)` 即可。

WebGL 要跑在 GPU 上才快：导出时 `render.py` 已经请求 GPU（macOS 上用 Metal；`MV_ANGLE` 环境变量可改），`render.py … check` 会打印 WebGL 用的是什么渲染器，写着 software / SwiftShader 就是软件渲染，pigment.js 会慢很多，solid.js 的光线步进（`smShader`）会慢上百倍：软件渲染下先用 `res: 0.5` 看构图，出片在 Mac 上跑。

导出：`render.py` 把整片切成约 `--chunk` 秒（默认 4）一块，`--workers` 个无头浏览器 + x264（默认按 CPU 核数，最多 4）从队列里一块块取，重的段落（WebGL、帧包）不会拖住某一个 worker；最后无损拼接再合上歌。渲好的块留在 `out/.chunks/`，文件名由导出设置、帧区间和**它用到的文件的哈希**组成（共用的：engine、项目用到的 kits、project.js、index.html、lib、timeline.js、data、art、帧包……；加上这一块里出现的镜头各自的场景文件，以及这些场景文件用到全局名字的其他场景文件）。所以：导出中断（Ctrl-C、崩溃、合盖）后再运行同一条命令，从断的地方接着渲；改了一个镜头再导出，只重渲这个镜头所在的块（改了 lib、timeline、kit 就全部重渲）。出过场景错误的块这次照常拼进去，但不留。`--fresh` 全部重渲，`--clean` 导完删掉这些块。这依赖确定性：一帧只由 t 决定。帧以 JPEG（质量 0.98）传出页面；`--png` 改成无损 PNG（每帧慢约 1.7 倍）。因为每一帧只由 t 决定，并行和逐帧渲染的结果一样。进度条数的是交给编码器的帧：一块的最后一帧送进去时 x264 手里还有几十帧（前瞻、B 帧、多线程，4K 下是几秒的活），由后台线程等它编完、存块，浏览器直接接着渲下一块；整片最后一帧之后显示的 `encoding the frames x264 still holds` 和 `joining N chunks` 就是这段收尾和无损拼接。画面按 BT.709 矩阵转成 YUV，并在文件里标明 BT.709（原色、传输曲线、矩阵、tv 范围）。
