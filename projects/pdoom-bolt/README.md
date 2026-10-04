# AGI · BOLT — 一台通用智能机的工程图

> 全片 **纯代码绘制**：没有一张生成图片、没有一段生成视频、没有一帧素材。
> 每一帧都只由歌曲时间 `t` 算出来（`docs/ENGINE.md` 的确定性铁律），所以浏览器里的预览和导出的 mp4 逐帧一致。

歌：`pdoom.mp3`（/Users/djj45/code/mv/pdoom-video，132 BPM，2:36.65），歌词同源。
标题：《AGI · BOLT》（图纸名 / 雷铸）。色：**DeepSeek 蓝 `#4D6BFE`，全片唯一的彩色**。

## 它长什么样

**一句话**：先画在纸上——DeepSeek 蓝的墨线、尺寸线、剖面线、公差、零件号；第 23 秒，纸上的墨被高压击穿，
墨点离开纸面飞进纯黑里成为电、成为光；之后它在黑暗里运行、加速、越界、失控；最后落回纸面，只剩一根还在放电的线。

**两个语域，一套色**：

| 语域 | 底 | 画法 | 用在哪 |
|---|---|---|---|
| **PLATE** | 纸 `#E9EDF7` | 三角网格投影成实体图（平色 + 隐藏虚线 + 剖面线）、尺寸线、引线、印章、标题栏；纯 Canvas 2D，**什么都不发光** | 主歌、装配段、安静段、尾声 |
| **VOID** | 黑 `#04060E` | 点云、细线框、电弧、白热核心、泛光（`kits/lumen.js`，WebGL2） | 副歌、引爆、失控段 |

同一台机器（`CELL-01`：外六角框 + 三道具环 + 内球 + 12 片光圈 + 6 根电极）在两个语域里是**同一份几何**：
`lib/parts.js` 里一个零件只定义一次（三角网格），PLATE 用 `lib/solid.js` 投影成实体图，
VOID 用 `S3.cloud / S3.wireSegs` 采成点云和线框。**纸上画的**和**黑里亮的**永远是同一个东西，只是换了存在方式。

## 怎么看 / 怎么导

### 质量门槛：`qa` 清零

```sh
uv run tools/render.py projects/pdoom-bolt qa          # 量观众看到的：唱到的词有没有真的显示、字出没出框、主体出没出画、镜头动不动
uv run tools/render.py projects/pdoom-bolt qa --from 89 --to 97   # 改完一个镜头只查这一段
```

截图在 `out/qa/`，报告 `out/qa/report.md`（每条的 box 坐标也在 `qa.json` 里）。**当前：0 错误 0 警告**
（346 帧、187 个唱到的词、42 个镜头的运动量）。做新镜头时按 CLAUDE.md：这一段的 qa 清零再往下做。

```sh
cd ~/code/mv/mv-kit
open projects/pdoom-bolt/index.html                      # 预览（空格播放，d 开调试层）
uv run tools/render.py projects/pdoom-bolt check          # 每个镜头渲一帧 + 时间线/歌词提示
uv run tools/render.py projects/pdoom-bolt sheet --cuts   # 42 条的首/中/尾拼板 → out/sheet.png
uv run tools/render.py projects/pdoom-bolt stills --t 42.3,63.9
uv run tools/render.py projects/pdoom-bolt                # 导出 mp4（1080p30）
uv run tools/render.py projects/pdoom-bolt --samples 4    # 加运动模糊（慢 4 倍）
```

## 文件

```
project.js      项目设置（kits: lumen；scripts: lib/*.js；scenes: 39 个镜头）
TREATMENT.md    风格圣经：概念、两个语域、调色板、字体、母题、镜头表、13 种歌词 treatment、**已否决**
SHOTS.md        逐镜施工单：HERO / 字区 / 拍点动作 / 转场理由
lib/API.md      本项目风格包速查（写镜头时看这个）
lib/look.js     一份色（LK）、字体、PX()、攻击点取值、两个语域的后期预设
lib/solid.js    三角网格 → 轴测/透视投影 → 平色实体 + 隐藏虚线 + 剖面线（Canvas 2D），
                并导出 S3.cloud / S3.wireSegs 给 WebGL 那一边用
lib/parts.js    THE CELL 及零件：光圈（= 眼睛）、总成、线路板、晶格、机柜、层叠、织机、回形针、中文屋、人形剪影
lib/bolt.js     电弧：确定性分叉折线、支叉、冲击环、火花、等离子（纸上有 halo:false 的硬边版本）
lib/draft.js    工程图家具：纸/图框/尺寸线/引线/剖切符号/印章/标题栏/网点/绘图笔
lib/type.js     字体与歌词：13 种 treatment + 逐行表（每行都写了理由）
scenes/*.js     一个文件一个镜头
timeline.js     剪辑：42 条，切点全按小节头和唱到的字算
data/           audio.json/.js、lyrics.json/.js、timing.json（不含歌词文字，可进 git）
```

## 风格法则（详见 TREATMENT.md）

- **一个色**：`#4D6BFE` 是全片唯一的彩色，其余全是中性（纸白 / 墨蓝黑 / 钢蓝灰）。
  稀有强调色 `#7FF3FF` 只在 41.2–45.1 s 的核心引爆出现一次。
- **一帧一处最亮**：只有电弧和白热核心可以过泛光阈值；字永远锐利、**绝不发光**。
- **一镜一个主角（HERO）**：每一镜都有一个能叫出名字的东西，占画面 ≥30%；全片没有四角常驻遥测。
- **变化不靠换色**：只有两条轴——PLATE ↔ VOID（明度反转）、体裁（实体图 / 剖面 / 图表 / 阵列 / 织机 / 点云）。
- **字是主体**：字号有表情（54–236 px），`TY.line` 自动适配到"能多大就多大、绝不越界"；全片有三处**纯字的画面**
  （`ortho` 的两条轴当基线、`show` 结尾的三重回响、`stable` 后半由光点写出来的半句）。
- **不给歌词加衬底 / 描边 / 光晕**：可读性靠构图让位。词在唱到那一刻变色，绝不抢拍。
- **没有真正静止的镜头**：每条剪辑上都挂着一台看不见的机器，按镜头时长自动做 2.6%–5.2% 的**极慢推近**
  （外加几像素横向漂移），"静"的镜头也一直有呼吸。规则只有一处：`lib/look.js` 里的 `MV.postFilter`；
  跨切点有交叉淡化 / 转场的条目自动跳过（否则推近值会在淡化中途跳一下）。要某个镜头不推，在 `timeline.js`
  那一条上加 `push: 0`，要推得更狠就写 `push: 0.08`。
- **局部放大 + 镜头跟随**：`timeline.js` 里写 `insert: { at, dur, amt, x, y }`，镜头就在那个窗口里推进去并
  **一直跟着那个点**（不写 x/y 就跟场景每帧用 `LK.focus(f, x, y)` 报出的主角位置——火头、笔尖、线尖、生长前沿）。
  推近有安全上限：`TY.line` 每帧报出歌词占的框，`safeZoom` 保证字不会被推出画面。
- **二维转三维**：`warp: { at, dur, from, to, pitch, dist, bg }` 把整帧当成 3D 里的一块板子重投影。
  全片三次：进料口（图纸被卷进机器时立起来）、落回纸面、归档（画完的图纸立起来转走）。
- **硬**：直线是真直（没有手抖），圆弧是真圆；唯一允许抖动的是电弧本身。

## 版权

歌曲与歌词版权属于原作者，本目录只引用本机文件（`projects/*/audio/`、`lyrics.txt` 不进 git）。
画面全部由本项目的代码绘制，不含任何现有作品的角色或画面。
