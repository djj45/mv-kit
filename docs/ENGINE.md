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

后期滤镜：`MV.postFilter(fn)` 注册一个对整帧生效的滤镜，`fn(canvas, post, t)` 在运动模糊之后、shake / zoom / 颗粒 / 暗角之前运行，可以原地重画这张画布；`post` 是合并后的后期参数，滤镜从里面读自己的设置。例：pigment.js 的整帧颜料层读 `post.pigment`（见下）。

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

**ink.js**（水墨）：所有墨色都是同一种墨的不同浓度（`INK.A.qing / dan / zhong / nong / jiao`），纸纹透得出来。`paintXuan`（暖白宣纸）、`inkBloom / inkDrop`（墨滴落下、按落下后的时间晕开）、`inkStroke`（藏锋出锋 + 飞白笔毛，`upto` 可逐笔画出；见下）、`inkRidge`（山峦，带皴擦和点苔）、`inkRain`（三层斜雨，可避开歌词框）、`inkSoft`（低分辨率绘制再放大的柔边晕染，`grain` 让纸纹透出）、`inkLyrics / inkColumn`（竖排、从右往左、逐字洇出）、`inkLoadFont`，以及转场 `ink` / `wash`。配合 `drawRate: 12`、`post.grain ≈ 0.05`、`background` 设成纸色。

`inkStroke(g, pts, w, o)` 在一拍二下是稳定的：飞白的断笔按**归一化弧长**放置，所以每张作画都给线条加一点抖动（line boil）时，飞白留在原处，不会沿着笔画爬动。笔画按几个像素重新采样，断笔的起止是平滑的，只有两个点的短笔画也能正常画出。`o.breakLen`（像素）控制每根笔毛连续 / 断开的典型长度：默认 36，15–25 更碎，50–80 是长飞白；笔画长度本身在动画里变化时（比如生长的枝条），传 `o.gapLen`（固定参考长度），断笔就钉在笔画上。老项目想保留原来的笔触，在 `project.js` 里写 `"inkStroke": 1`（雨爱就这样钉住了）。

**pigment.js**（颜料合成层，WebGL2）：把颜料画在纸、素胚、釉面上的合成器。两种用法：

1. **分层**（新作品）：`const L = pigmentLayers()`（默认 W×H；`pigmentLayers(w, h)` 可以做贴图，比如瓶身展开图），每帧 `L.clear()`，然后往三层里画**浓度**：`L.wet`（分水、晕染、墨团：会晕开、边缘积色、有颗粒）、`L.dry`（勾线、干笔：清楚，咬纸纹）、`L.col`（真颜色：朱砂印、釉里红、天青天空，吃纸纹、上色不匀）。wet / dry 上只有 alpha 有用，用 `ink(a)` 或任何颜色画都行，ink.js 的 `inkStroke / inkBloom` 可以直接画进去。最后 `pigmentDraw(g, L, { preset, offset: [camX, 0] })`。浓度通过预设的色阶变成颜色；纸是程序生成、按 `offset / scale` 钉在世界坐标上的，镜头平移时不会游。`paper: 'none'` 输出白底，只有颜料变暗：用 `g.globalCompositeOperation = 'multiply'` 画到你自己画好的表面上（带明暗的瓶身），釉面高光在之后再画。
   预设：`ink`（水墨 / 宣纸：纤维、宽晕开、明显积边、颗粒）、`raw`（生料 / 素胚：哑光陶土、细颗粒和铁点、拉坯横纹、几乎不晕、咬纸重）、`cobalt`（青花 / 釉面：光滑釉、分水积边、浓线周围的晕散 `halo`、浓处的铁锈斑 `spots`）。任何字段都可以覆盖：`bleed`（像素）、`rim`（积边 0..2）、`halo`、`spots`、`gran`（颗粒）、`tooth`（干笔咬纸）、`jitter`、`paper`、`paperColor`、`ramp: [[浓度, '#hex'], …]` + `paperRef`（这些颜色所在的纸色）、`spotColor`、`offset`、`scale`、`seed`。一帧里可以合成多次（每次用完立刻 `drawImage`，下一次会复用同一块 WebGL 画布）。
2. **整帧**（已经画好的水墨）：`project.post.pigment = { rim: 0.8, wick: 0.5 }`（或场景 `render` 返回它）对整帧做一遍：淡墨块的内边缘积色（`rim`，`rimR` 像素半径），墨向纸里轻轻洇出（`wick`，`wickR`）。浓度按亮度相对 `paper`（默认宣纸色）估算。雨爱默认没开，想试就在它的 `project.js` 的 `post` 里加这一项。

示例：`projects/pigment-demo`（三种预设并排，素胚 / 烧成后的"滴水分开"对比）。

**qinghua.js**（青花纹饰，需要 ink.js + pigment.js）：一切都画成颜料**浓度**画进 pigment 图层，再用 `raw`（生料 / 素胚）或 `cobalt`（青花 / 釉面）合成。`QH`（调色板 + 浓度 `QH.D.ying / dan / er / zheng / tou` + 仿宋 `QH.FONT`）；`qhLine`（勾线笔：粗细几乎不变、起笔顿点、手抖 + 一拍二线条抖动，`upto` 逐笔画出，`smooth` 圆滑）；`qhFill`（分水：平涂，`k` 从一点滴开铺满）；纹样点列 `qhBegonia`（海棠开光）`qhRuyi`（如意云肩）`qhCurl`（云纹卷）`qhSmoke`（一缕烟）`qhWaves`（海水）`qhPetal / qhPeony / qhLeaf`；`qhStickerLayers + qhSticker`（带剪影遮罩的图层：人物、手能挡住后面的画）；`qhErase`（留白：把形状从浓度层里挖掉）；`ctx.qhClear = L.col`（之后的线和分水顺带清掉颜色层，天青天空留在人物后面）；`qhCylinder`（WebGL：把展开图卷到任意回转体上，哑光素胚 / 亮釉高光）；`qhLyrics`（竖排仿宋歌词，唱到时 0.12 s 显出，`fired` 青花色带晕散、`dark` 深色水里用浅色）。示例：`projects/qhc`。

**shadow.js**（背光影戏）：一盏灯、一块幕布，其余都是剪影。**形靠剪影，明暗靠距离**——物件离幕布 `z`（0 = 贴着布，L = 在灯那儿）时，按  `k = L/(L−z)` 绕灯做中心投影，半影按 `z/(L−z)` 变虚；这一条规则就是整个画风。刀口不是画出来的线，而是**从形体里擦掉**的缝，透出来的是背后被照亮的幕布；歌词也一样，一个字一个字"刻穿"。`screenCloth`（受光的幕布：衰减 + 经纬 + 褶皱 + 湿痕）、`lamp`（油灯、焰的呼吸、光晕）、`smoke`（灯烟/檀香，噪声场不是粒子）、`silhouette`（把 `drawFn` 画进图层 → 投影 → 模糊 → 合成，`o.cut` 擦刀缝、`o.edge` 画刀口亮边）、`cutStroke / cutShape / hideEdge / dyeInto / polylineUpTo`（生长的刀线、刀口亮边、渗色）、`screenRain`（幕前的雨丝 + 落在布上的雨点 `hits` + 浸湿的小点）、`carveLyrics`（逐字刻穿的歌词，返回它占的留白带供雨绕开），以及转场 `lightThrough` / `wetOut`。配合 `drawRate: 12`、`background` 设成暗室色。示例：`projects/qhc-ds`。

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
- `lmLines(cam, S, o)`：线段每段 8 个数（a xyz、b xyz、亮度、端头：1 = a 端圆头、2 = b 端、3 = 两端；折线内部是平接，所以叠加不会在拐点出亮点）。`width`（像素）、`color`、`gain`、`glow`（贴身光晕 0..1）、`glowR`、`upto`（0..1 按顺序画出，生长的尖端是圆头）、`dash: [实, 虚]`、`dof`、`fog`、`model`。
- `model: { pos, rot: [rx, ry, rz], scale }` 在 GPU 上变换；标签要跟着转动的点走时用 `cam.project(lmXf(model, p))` → `[x, y, 深度]`。
- `lmEnd(g, o)`：`bloom`（强度）、`radius`（0..1 光晕宽度）、`levels`、`exposure`、`ca`（边缘色差）、`lens`（边缘压暗）、`blend: 'screen'`（不画底色，把光叠到 g 上已有的画面上）。一帧里可以 begin / end 多次。
- 形状 `LG`：点云 `sphere`（斐波那契球面）`ball` `gauss`（高斯团）`box` `disk`（向日葵盘）`ring` `galaxy`（旋臂星系）`stars`（远处星尘）`text`（文字采样成点，em 单位）`along`（沿折线撒点：粒子尘拉成的线）；线段 `seg`（折线）`pairs` `edges` `poly('tetra'|'cube'|'octa'|'icosa'|'dodeca')` `wirebox` `grid` `circle` `curve` `join`。
- `lmMorph(A, B, k, o)`：每个点从 A 飞到 B（`stagger` 错开、`swirl` 弧线、`ease`），点数可以不同；`o.out` 复用输出数组。这是这类片子不硬切的转场：一个图形散开、飞成下一个图形。
- 文字（Canvas 2D，画在 `lmEnd` 之后）：`lmTerminal`（左下终端歌词：`> ` 提示符，唱到的词逐字打出，方块光标在拍子上闪，旧行上移变暗；唱完 `commit` 秒后换新提示符；`status` 是下面一行小字状态，`since` 隐藏之前的行）；`lmCaption`（底部居中字幕：逐字淡入并微微上浮，`track` 字距）；`lmHud`（四角细框 + 左上"镜头号 时间码 名字" + 右上键值读数 + 右下注脚，`on` 用 `lmFlick` 做通电闪烁）；`lmSection(g, 2, 6, '标题', 'SUB')`（章节号）；`lmTag`（小号宽字距标签）；`lmLabel`（圆点 + 折线引线 + 字，`draw` 0..1 动画，纸面模式自动垫底色）；`lmBig`（宽字距大字：`reveal` 逐字出现、`decode` 乱码解出、`glitch` 跳字换色）；`lmCode`（带行号、关键字着色、逐字打出的代码块）；`lmCodeBg`（满屏暗代码纹理，`lmSource('镜头名')` 取这个镜头自己的源码）；`lmCount / lmFmt`（数字滚动和千分位）。字体 `LM_MONO`（等宽）、`LM_SANS`（细黑，中文用苹方 / 思源）。
- 后期：镜头 `render` 返回 `{ glitch: 0..1 }` 整帧撕裂（横条错位 + RGB 分离 + 少量错位块），放在拍点上；时间线遮罩转场 `wipe: 'glitch'`（新镜头从闪烁的横条里出现）。
- 配合：`project.post` 设 `grain ≈ 0.03`、`vignette: 0`（暗角在 `lmEnd` 里按调色板做），`background: '#000'`。网格、星尘、几何都在 `init()` 里建好；大数组（> 4096 个数）按对象缓存到 GPU，原地修改要 `arr.__v++`（`lmMorph` 自动做），小数组每次直接上传。

示例：`projects/lumen-demo`（六个镜头，每种调色板和主要技法各一个）。

写新风格包的建议：只放"这种画风在任何歌里都用得上"的东西（笔触、质感、特效、文字风格）；角色、道具、具体场景放在项目的 `lib/` 里。

## 性能

预览目标 < 40 ms / 帧。Canvas 2D 的大面积 `filter: blur()`、每帧新建大画布、每帧重画静态背景最费时，都应该移到 `init` 里。需要 WebGL 时，在场景里建一个离屏 WebGL 画布，渲染后 `g.drawImage(glCanvas, 0, 0)` 即可。

WebGL 要跑在 GPU 上才快：导出时 `render.py` 已经请求 GPU（macOS 上用 Metal；`MV_ANGLE` 环境变量可改），`render.py … check` 会打印 WebGL 用的是什么渲染器，写着 software / SwiftShader 就是软件渲染，pigment.js 会慢很多。

导出：`render.py` 把帧分成 `--workers` 段（默认按 CPU 核数，最多 4），每段一个无头浏览器 + 一个 x264 并行渲染，最后无损拼接再合上歌。帧以 JPEG（质量 0.98）传出页面；`--png` 改成无损 PNG（每帧慢约 1.7 倍）。因为每一帧只由 t 决定，并行和逐帧渲染的结果一样。
