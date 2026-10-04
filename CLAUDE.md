# mv-kit：给 Claude 的项目约定

这是一个用代码渲染、与歌词和节拍同步的 MV 框架。用户会换歌、换风格描述来做新 MV。先读 `README.md` 和 `docs/ENGINE.md`。

## 工作流程（按顺序，不跳步）

1. **项目与数据**：`tools/new_project.py` 新建 → `analysis/analyze_audio.py` → `analysis/align_lyrics.py`。看输出里的 BPM、小节相位分数、段落和低置信度词表；有疑问就让用户在预览里按 `d` 核对，或自己用 `render.py stills` 截图看调试层以外的画面。
2. **方案先行**：先按 `template/TREATMENT.md` 写好项目的 `TREATMENT.md`（概念、画风、调色板、字体、母题、镜头表），给用户看，确认后再写代码。风格要具体到能照着画：线条、阴影层数、配色、质感、作画张数、镜头语言。
3. **时间线**：`timeline.js` 用 `cut / after / start` 按歌词内容和节拍算切点，不手写秒数。
4. **镜头**：一个镜头一个 `scenes/<名字>.js`；多个镜头共用的角色、背景、道具放 `lib/`（在 `project.scripts` 里列出）；能跨项目复用的画风工具放 `kits/`。项目默认带 `kits/camera.js` 和 `kits/layout.js`（用法见 `docs/ENGINE.md`「风格包」，每种用法在 `projects/kit-demo` 里有一处范例）。
5. **每改一个镜头就看图、跑 qa**：`uv run tools/render.py projects/<项目> sheet --cuts`（或 `stills --t …`），用 Read 工具**打开 PNG 亲自检查**构图、衔接；然后 `render.py projects/<项目> qa --from <镜头起> --to <镜头止>`，打开它给的局部截图，**错误清零再做下一个镜头**。拼板看不出几个像素的出框和被裁掉一半的字，那些以 qa 为准。
6. **导出**：先 `check` 确认没有场景报错并处理时间线 / 歌词提示，再整片跑 `qa`：**没有错误才算做完**，警告逐条处理，保留的在 TREATMENT 里写理由。然后 `uv run tools/render.py projects/<项目>`。提示歌曲文件不是分析时那一份时，先弄清楚再导出。

## 代码规则

- 确定性：一帧只由 `f.t` 决定。禁止 `Math.random / Date.now / performance.now`；用 `hash / mulberry32 / noise1`。不在 `render` 里累积状态。
- 静态的画（背景、贴图）在 `MV.onInit` 或场景 `init()` 里画一次。
- 手绘感：角色动作和线条抖动用 `f.tq` / `f.tick`（按 `drawRate` 定格），镜头运动用连续的 `f.t`。
- 颜料 / 纸感用 `kits/pigment.js`：往 `L.wet / L.dry / L.col` 画浓度再 `pigmentDraw`，不要在 Canvas 2D 里用大面积 `filter: blur()` 模拟晕染。纸要按镜头的世界坐标传 `offset`，免得平移时纸纹游动。
- `inkStroke` 在线条抖动下是稳定的；笔画长度在动画里变化（生长、伸缩）时传固定的 `gapLen`。
- 歌词逐词同步：词在 `start` 时出现或高亮，不能抢跑；文字离边缘 ≥ 96 px，不被角色或特效盖住（`qa` 的 `lyric-hidden / lyric-edge` 量的就是这个）。一句的最后一个字要完整停留至少 6 帧再换下一句（`check` 的 `linetail / cuttail` 提示会指出太紧的地方；`project.cutHold: 0.2` 让 `cut()` 自己避开）。每个词单独 `fillText`（或至少整句一次 `fillText`），qa 才量得到。
- 歌词跨切点：一句只有在切点之后**还有词要唱**时才带进新镜头；切点之前已经唱完的句子，新镜头不要再画（换了样式重画一遍，就是上一镜的字在下一镜开头闪一下，qa 报 `lyric-carryover`）。新镜头先空着，等自己那一句开始。反过来也一样：转场重叠的那段里，旧镜头不画新镜头的那一句（`f.lyrics.lineAt(f.t, f.from)` 已经替你去掉，qa 报 `lyric-handover`）。歌词里的词作为画面的一部分出现（道具上的字、织进图案里）就包进 `MV.decor(() => …)`，整词画，不要拆成单个字母躲 qa。
- 歌词放哪一层：要跟着画面动的（印在物体上、标牌上）画在场景里，用 `MV.keep` 报给镜头；歌词区、字幕式的歌词画进屏幕层 `MV.overlay(o => …)`，镜头怎么推都不动它，`insert` 也不再被它钳住。印在牌子上的歌词画进牌子的 `MV.within(owner)`，qa 才按牌子自己的字从严查。
- 没有静止的镜头：`kits/camera.js` 默认每个镜头缓推；要局部放大并跟随用条目上的 `insert`（画面上有场景层的歌词 keep 框时它只能轻推，要推得狠就把歌词放进 `MV.overlay`），二维转三维用 `warp`。`push: 0` 要在 timeline 注释里写理由。
- 画面里眼睛该看的东西（笔尖、火头、主角）每帧报 `MV.focus(x, y, '名字')`；会跑出画面的主体用 `CAM.keep` 让世界跟着它缩，而不是让它出画。故意出画的（冲出上缘的曲线、掉出去的东西）：出画那一刻起改报眼睛接下来看的东西，不要把坐标夹在画面边上。
- 歌词放在画面空的地方：字和它后面的底条、牌子都会挡住画，压在主体或画面最密的地方 qa 报 `lyric-cover`。底条不是默认要有的——画面后面是空的就不用条；要条就让画让开。项目自己的歌词助手整个包进 `MV.lyric(() => …)`，qa 才知道底条是歌词的。
- 字和画之间要留空：字母不站在线上、线（**不管什么颜色**）不从字中间穿过、点和手不伸进字里、黑字不压在黑色的图上（qa 的 `lyric-touch / text-touch`）。同色的要叠就换一个颜色或垫一块底；别的颜色的线让它在字前停住，或者把字挪到空处。圆里、方块里的序号和字母用 `BOX.center` 按墨迹居中。
- 放进框里的字（表格、标题栏、标签、面板）一律用 `BOX.table / BOX.cell / BOX.panel / BOX.lines / BOX.text`，不要手写 x / y。自己写的框助手（标题栏、规格表）把框和它的字包在同一个 `MV.group('名字', () => …)` 里，框用 `MV.box` 登记：qa 才知道哪些字是这个框自己的，对它们从严（`box-cross` 是错误），别的字碰到只算撞车（`box-clash`，警告）。
- 用户指出一个问题时，先想它能不能变成 qa 的一条检查、kit 的一个默认值或一个可复用的写法；能就改在那里，并把同类的地方全片查一遍，不要只修被指出的那一处。
- 转场默认硬切。要转场就得有东西跨过切点：推进 / 拉出同一个物体用 `zoom`（场景写 `anchors(f)`），同一空间相邻的地方用 `pan`（右 = 往后，左 = 往前，下 = 更深），画面拆散重组用 `reflow`，风格包自己的遮罩（`ink`、`wash`……）也行。在 `timeline.js` 里给每个转场写一句注释说明理由；TREATMENT 的镜头表里也写。
- 交叉淡化 / 转场：前一个条目延续到 `from + fadeIn`，否则淡化到一半会跳。要让转场落在拍上，用 `land(t, 秒数)` 算 `from`。
- 大动作落在拍点上：切镜在小节头或唱到的音节，冲击落在 `f.a.kick / f.a.snare`。
- 全局名字冲突：多个 `<script>` 共享全局作用域，顶层 `const` / `let` 不能重名。项目内的顶层常量加前缀或放进函数 / 对象里。
- `project.js` 等号后面必须是合法 JSON（Python 工具也读它）。

## 版权与原创

- 画风参考写成风格特征（线条、配色、光影、节奏、镜头语言），不要画成现有作品里的角色或照搬具体画面；用户点名某个角色时，保留原创角色，只借鉴那一类作品的通用画风特征，并简短说明。
- 歌曲版权属于原作者，示例项目只引用本地文件。歌词文字（`lyrics.txt`、`data/lyrics*`）不进 git，只提交 `data/timing.json`（不含文字）；代码和 TREATMENT 里引用歌词只用短片段。

## 常用命令

```sh
uv run tools/render.py projects/X check            # 列出镜头、每个镜头渲染一帧、报错，再列出时间线 / 歌词提示
uv run tools/render.py projects/X qa               # 量观众看到的：唱到的词有没有真的显示、字出没出框、主体出没出画、镜头动不动；截图在 out/qa/
uv run tools/render.py projects/X qa --from 30 --to 40   # 只查一段（改完一个镜头就跑）
uv run tools/render.py projects/X sheet --cuts     # 每个镜头首 / 中 / 尾三帧拼板 → out/sheet.png
uv run tools/render.py projects/X stills --t 12.5,20
uv run tools/render.py projects/X strip --t 40.2 --dur 1.2   # 关键动作每 0.2 s 一帧，一行排开 → out/strip-0040.20.png（按起点命名，不互相覆盖）
uv run tools/render.py projects/X --from 30 --to 40 --preset veryfast   # 快速看一段动态
uv run tools/render.py projects/X                  # 最终导出（并行 --workers N，默认按核数；--png 无损传帧）
uv run tools/tune_lyrics.py projects/X             # 歌词校准工具（频谱 + 逐字竖线，保存到 data/lyrics_fix.json）
uv run tools/lyric_timing.py merge projects/X      # 新 clone / 换电脑：用本机 lyrics.txt + data/timing.json 还原歌词数据和校准
uv run tools/dreamina.py projects/X doctor          # 即梦画布 CLI：版本、schema、实时模型表 → art/dreamina/（生成图片和视频都用它，用户在 Mac 上跑）
uv run tools/dreamina.py projects/X video B4v       # 免费：传首帧、存草稿、报价；加 --ceiling N 才扣积分并下载到 art/clips/
uv run tools/dreamina.py projects/X image A2        # 同上，插画（prompts.json），输出 art/<id>.jpg
```
