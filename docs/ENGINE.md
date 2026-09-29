# 引擎参考（写镜头时看）

引擎是一组普通的 `<script>`（没有构建步骤），项目的 `index.html` 先加载 `project.js` 再加载 `engine/boot.js`。boot 按顺序加载：引擎 → `project.kits` 里的风格包 → `data/*.js` → `project.scripts` → `scenes/<名字>.js` → `timeline.js`，然后启动预览或导出。

## 铁律：确定性

输出必须只由 `f.t` 决定：导出时帧会乱序渲染，运动模糊还会在一帧内渲染多个子帧再平均。

- 不要用 `Math.random()`、`Date.now()`、`performance.now()`；用 `hash(a, b, c)`、`mulberry32(seed)`、`noise1(x, seed)`。
- 不要在 `render()` 里累积状态（计数器、粒子模拟）。需要的话写成时间的函数（粒子 i 的位置 = f(t − 出生时间)）。
- 静态的东西（背景画、贴图、预计算的几何）在 `MV.onInit(fn)` 或场景的 `init()` 里画好一次。

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

`shake`（像素，或 `[x, y]`）、`zoom`、`rot`、`flash`（0..1 白闪）、`flashColor`、`fade`（0..1 压黑）、`invert`、`grain`、`vignette`、`vignetteColor`。默认值来自 `project.post`。

## 时间线（timeline.js）

```js
MV.timeline(({ lyrics, audio, cut, after, start, T0, T1 }) => [
  { scene: 'wide',  from: T0,                     to: cut('There was a sudden drop') },
  { scene: 'chart', from: cut('There was a sudden drop'), to: after('your boss') },
  { scene: 'hook',  from: cut("I'm upping", 1),   to: cut('I hear the basilisk'), params: { n: 2 } },
  { scene: 'fade',  from: 60, to: 64, fadeIn: 1.0 },   // 与上一条重叠 1 秒交叉淡化
]);
```

- `cut(q, nth)`：第 nth 个包含 q 的歌词行，其第一个词开始之前的那一拍。
- `after(q, nth)`：这一行结束处最近的小节头。
- `start(q, nth)`：这一行第一个词开始的时间。
- 条目首尾相接就是硬切；只有写了 `fadeIn` 且重叠时才交叉淡化。
- 遮罩转场：条目写 `fadeIn: 秒数, wipe: '名字'`，新镜头就透过遮罩出现（代替交叉淡化）。遮罩用 `MV.wipe('名字', { mask(m, k, e, t), over(g, k, e, t) })` 定义：在 `m` 上画白色的地方显示新镜头，`k` 是 0..1 进度，`e.params` 可放转场参数；`over` 可选，在合成结果上再画一层（比如湿边）。风格包 ink.js 自带 `ink`（墨滴晕开，`params.wx / wy` 定中心）和 `wash`（水痕横扫，`params.dir = ±1`）。
- 同一个场景可以出现多次，用 `params` 区分。

## 数据

### 歌词 `f.lyrics`（MV.Lyrics）

- `lyrics.get('sudden drop', nth)` → 行 `{text, start, end, words: [{w, start, end, conf, syl?, join?}]}`。按内容找，别写死时间。
- `lyrics.findWords('P(doom)')`、`lyrics.lineAt(t)`、`lyrics.wordAt(t)`
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

**anime.js**（日本 TV 动画赛璐璐风）：`paintCumulus`（硬边分色积云）、`drawLit`（角色单独成层 + 轮廓光）、`focusLines`（集中线）、`upLines`（速度线）、`sfx`（片假名音效字）、`titleText / lyricRow / bigWord / jpSub`（动画片头风格的歌词字和字幕）、常量 `FONT MONO INK`。配合 `drawRate: 12` 和 `post.grain ≈ 0.09`。

**ink.js**（水墨）：所有墨色都是同一种墨的不同浓度（`INK.A.qing / dan / zhong / nong / jiao`），纸纹透得出来。`paintXuan`（暖白宣纸）、`inkBloom / inkDrop`（墨滴落下、按落下后的时间晕开）、`inkStroke`（藏锋出锋 + 飞白笔毛，`upto` 可逐笔画出）、`inkRidge`（山峦，带皴擦和点苔）、`inkRain`（三层斜雨，可避开歌词框）、`inkSoft`（低分辨率绘制再放大的柔边晕染，`grain` 让纸纹透出）、`inkLyrics / inkColumn`（竖排、从右往左、逐字洇出）、`inkLoadFont`，以及转场 `ink` / `wash`。配合 `drawRate: 12`、`post.grain ≈ 0.05`、`background` 设成纸色。

写新风格包的建议：只放"这种画风在任何歌里都用得上"的东西（笔触、质感、特效、文字风格）；角色、道具、具体场景放在项目的 `lib/` 里。

## 性能

预览目标 < 40 ms / 帧。Canvas 2D 的大面积 `filter: blur()`、每帧新建大画布、每帧重画静态背景最费时，都应该移到 `init` 里。需要 WebGL 时，在场景里建一个离屏 WebGL 画布，渲染后 `g.drawImage(glCanvas, 0, 0)` 即可。
