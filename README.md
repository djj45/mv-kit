# mv-kit — 用代码做歌词同步 MV 的通用框架

从 `pdoom-video` 和它的二次元 demo 里抽出来的流程：**音乐分析 → 创意方案 → 镜头代码 → 浏览器实时预览 → 离线导出 mp4**。
换一首歌、换一份风格描述（提示词），就能做一支新风格的 MV。

核心原则和原项目一样：**每一帧只由歌曲时间 t 决定**。所以浏览器里的实时预览和导出的视频逐帧一致；歌词逐词同步；镜头切点按歌词内容和节拍自动算出，不手写时间。

## 目录

```
mv-kit/
  engine/        渲染引擎（与风格无关）：数据 API、时间线、转场（推拉匹配 / 平移 / 颗粒重组）、后期、运动模糊、预览播放器
  kits/          camera.js（镜头语言：默认缓推、局部放大并跟随、二维转三维、主体不出画）和 layout.js（放进框里的字：表格、面板、自动缩字），每个项目默认带；
                 风格工具包：anime.js（日本 TV 动画赛璐璐风）、ink.js（水墨）、pigment.js（WebGL 颜料合成层：宣纸 / 素胚 / 青花釉面）、qinghua.js（青花纹饰：勾线、分水、纹样、回转体瓶身、竖排歌词）、lumen.js（发光数据 / 终端科幻：WebGL 点云、光线、景深、泛光，终端歌词和 HUD）、roto.js（转描：把 AI 生成的视频 / 静帧重画成孔版印刷赛璐璐，WebGL）、print.js（行式打印机：画面按形状匹配成 ASCII 字符、叠打、绿条纹连续纸和色带油墨，WebGL）
  analysis/      音乐分析：analyze_audio.py（节拍 / 小节 / 段落 / 鼓点 / 包络）
                 align_lyrics.py（Whisper + 对齐 → 逐词时间），separate.py（可选，Demucs 分轨）
  tools/         render.py（导出视频 / 截图 / 拼板 / 检查 / qa），qa.py（render.py qa：用真实渲染的帧量出唱到的词是否真的显示、字是否出框、主体是否出画、镜头动不动），new_project.py（新建项目），frames.py（把视频 / 静帧打包给 roto.js / illust.js），dreamina.py（用即梦画布 CLI 生成插画和图生视频片段），eyetrack.py（量帧包里眼睛每张画的开合和瞳孔位置），lightsoff.py（把插画里亮着的窗户涂掉并列出来，代码再一扇扇点亮），
                 lyric_timing.py（不含歌词文字的时间：data/timing.json，可以进 git）
  template/      新项目模板：会动的歌词字幕 + 风格圣经模板 TREATMENT.md
  projects/      你的项目。anime-pdoom 是示例（10 秒二次元 demo），pigment-demo 是 pigment.js 的样张，lumen-demo 是 lumen.js 的样张，roto-demo 是 roto.js 的样张（即梦素材 → 印刷赛璐璐），transition-demo 是转场的样张，kit-demo 是 camera.js / layout.js 和 qa 约定的样张（三个短镜头），pdoom-print 是 print.js 的示例（P(doom) 的 ASCII 打印稿版，全部代码绘制），pdoom-sign 是一轮出片流程的示例（P(doom) 做成工业安全须知：象形小人、警示牌、刻度盘；由 DeepSeek 按 docs/briefs/pdoom-sign 的施工图做出、qa 把关打磨四轮，全部代码绘制）
  docs/ENGINE.md 引擎 API 参考（写镜头时看）
  PROMPTS.md     分阶段提示词手册（和 Claude 一起做新 MV 时用）
  CLAUDE.md      给 Claude 的项目约定（在这个文件夹里用 Claude Code 时自动读取）
```

## 需要安装

- [uv](https://docs.astral.sh/uv/)（Python 环境；第一次 `uv run` 时自动装依赖）
- ffmpeg（`brew install ffmpeg`）
- Google Chrome（导出时用无头 Chrome；没有的话运行一次 `uv run playwright install chromium`）

## 快速上手（一首新歌）

```sh
cd ~/code/mv/mv-kit

# 1. 新建项目：复制歌曲，写好 project.js
uv run tools/new_project.py my-song --audio ~/Music/song.mp3 --lyrics ~/Music/song-lyrics.txt --title "My Song"

# 2. 音乐分析 → data/audio.json（节拍、小节、段落、鼓点、响度包络）
uv run analysis/analyze_audio.py projects/my-song

# 3. 歌词逐词对齐 → data/lyrics.json
uv run --extra mlx   analysis/align_lyrics.py projects/my-song --lang zh   # Apple Silicon Mac
uv run --extra align analysis/align_lyrics.py projects/my-song --lang en   # 其它机器
#   没装 Whisper 也行：在 lyrics.txt 每行前写 LRC 时间 [mm:ss.xx]，然后加 --no-whisper

# 4. 预览：直接用 Chrome 打开（空格播放，d 打开调试层核对节拍和歌词）
open projects/my-song/index.html

# 5. 写方案和镜头（和 Claude 一起：见 PROMPTS.md），随时出拼板检查
uv run tools/render.py projects/my-song check          # 每个镜头渲一帧看报错，并列出时间线 / 歌词提示（见下）
uv run tools/render.py projects/my-song qa             # 量观众看到的问题，有错误就退出码 1，截图在 out/qa/（见下）
uv run tools/render.py projects/my-song sheet --cuts
uv run tools/render.py projects/my-song strip --t 40.2 --dur 1.2   # 关键动作：从 40.2 s 起每 0.2 s 一帧 → out/strip-0040.20.png

# 6. 导出
uv run tools/render.py projects/my-song                       # 1080p，project.js 里的 fps
uv run tools/render.py projects/my-song --samples 4           # 加运动模糊（慢 4 倍）
uv run tools/render.py projects/my-song --from 30 --to 45     # 只导一段
uv run tools/render.py projects/my-song --workers 6           # 并行浏览器数（默认按 CPU 核数，最多 4）
```

导出是并行的：帧分成几段，每段一个无头浏览器和一个 x264 同时渲染，最后无损拼接再合上歌。帧以 JPEG（质量 0.98）传出页面，比无损 PNG 快约 1.7 倍，差别低于 x264 本身的压缩损失；要无损就加 `--png`。Ctrl-C 会等每段渲完手上的帧、清掉临时文件再退出，再按一次立即退出。

颜色按 BT.709 转换并写进文件（高清视频的标准）。不写的话，按 709 解码的播放器和网站转码会让颜色偏移，饱和的红、青最明显（釉里红 #A83A3C 会偏约 9 级）。

`check` 除了渲染报错，还会列出单看一帧发现不了的问题，预览的镜头条上也会用红色短线标出：时间线空档（露出背景色）、重叠却没写 `fadeIn`（前一个镜头被盖掉）、交叉淡化放不完（前一个镜头在淡化完成前结束，画面会跳）、同一场景同样参数连着出现、切点既不在拍上也不在唱到的字上，以及句尾的字离下一句太近（< 0.65 s，句尾字来不及完整停留，用 `strip` 看一眼）。`project.js` 里的 `"lint": { "lineTail": 0.5, "off": ["offbeat"] }` 可以调阈值或关掉某一类。

`qa` 量的是拼板看不出来的东西，全部来自真实渲染的帧：每个词在唱到的那一刻有多少字形真的显示在画面上（带歌词和不带歌词各渲一次，只在这个词的字形像素里比较，所以被盖住、被裁掉、被推出画面、和背景同色都会被量出来）；字有没有跨出它所在的表格 / 标题栏 / 面板（`MV.box`）、四边余量够不够；场景用 `MV.focus` 报出的主体有没有跑出画面；每个镜头（去掉歌词）有没有一直在动；全片歌词字号的跨度和位置分布。每条问题配一张局部放大截图，表格见 `docs/ENGINE.md`「qa」。**没有错误才算做完。**

歌曲换了文件也会提示：`analyze_audio.py` 把歌曲的 sha256 记在 `data/audio.json`，渲染时发现项目里的歌不是分析时那一份（换了母带、片头静音不同），就会警告：所有切点和歌词都会整体错位。老项目用 `uv run analysis/analyze_audio.py projects/my-song --pin` 补记一次。

模板项目开箱就能出一支"动态歌词"视频：背景随段落换色、随低音呼吸，歌词逐词点亮。之后按方案把 `scenes/` 里的镜头换成你的。

## 可选：分轨让分析更准

```sh
uv run --extra stems analysis/separate.py projects/my-song     # Demucs → projects/my-song/stems/*.wav
uv run analysis/analyze_audio.py projects/my-song               # 自动改用鼓分轨找鼓点
uv run --extra mlx analysis/align_lyrics.py projects/my-song --retranscribe   # 自动改用人声分轨
```

不分轨时，鼓点从混音里的打击乐成分检测：底鼓比较可靠，军鼓 / 踩镲只是近似。节拍网格和小节头不受影响。

## 一个项目的结构

```
projects/my-song/
  project.js       标题、音频路径、导出区间 from/to、fps、drawRate、kits、scripts、scenes、post、audioFadeOut（片尾音频淡出秒数）
                   （等号后面必须是合法 JSON：Python 工具也要读它）
  lyrics.txt       歌词原文，一行一句
  data/            分析结果：audio.js/.json、lyrics.js/.json、lyrics_fix.json（手动修正）、timing.json（不含文字的歌词时间）
  TREATMENT.md     创意方案 / 风格圣经
  lib/*.js         这个项目共用的绘制代码（角色、背景……），在 project.scripts 里列出
  scenes/*.js      一个文件一个镜头：MV.scene('名字', { render(g, f) {...} })
  timeline.js      剪辑：哪个镜头在什么时候（按歌词内容 + 节拍算）
  index.html       预览入口
  out/             导出的视频、截图、拼板
```

## 修歌词时间

最方便的是校准工具：

```sh
uv run tools/tune_lyrics.py projects/my-song      # 在浏览器里打开 http://127.0.0.1:8765
```

上面是人声频段的频谱（有 `stems/vocals.wav` 时可切换成人声分轨，更清楚）和起音曲线，下面是歌词，每个字一根竖线。把竖线拖到歌手**刚发声的瞬间**；空格播放两条竖线之间，`⇧+空格` 播放竖线前 0.6 秒、停在竖线上（末尾已经听到这个字，说明竖线晚了），`L` 循环多听几遍，`0.75× / 0.5×` 慢放，`A` 吸附到附近的起音，回车播放整句时按 `T` 可以边听边打点，`N` 跳到下一个"自动推算、待查"的字（橙色）。`⌘S` 保存：改动合并进 `data/lyrics_fix.json`，并自动重新运行一次对齐——改过的字成为锚点，没识别出来的字在锚点之间重新分配。刷新预览就能看到。

也可以手动：对齐完会打印一份低置信度词表（也写在 `data/lyrics_report.txt`）。在预览里按 `d` 打开调试层，逐个听。不准的写进 `data/lyrics_fix.json` 再运行一次对齐（Whisper 结果有缓存，很快）：

```json
[ { "line": "sudden drop", "word": "drop", "start": 11.2 },
  { "line": 5, "word": 3, "start": 20.27, "end": 20.8 } ]
```

### 歌词不进 git，时间进 git

歌词文字（`lyrics.txt`、`data/lyrics*`）被 `.gitignore` 留在本机，这样你校准的时间也进不了 git。所以每次对齐（包括校准工具保存）都会顺带写 `data/timing.json`：每句文字的 sha256 和字数、每个字的时间、校准修正（按第几句第几个字），没有任何歌词文字，可以提交。换电脑或新 clone 之后，把歌词写回 `lyrics.txt`，再运行：

```sh
uv run tools/lyric_timing.py merge projects/my-song      # timing.json + lyrics.txt → data/lyrics.json/.js、lyrics_fix.json
```

每一句都按 sha256 核对；有一句对不上（缺了、错字），就列出是哪几句，什么都不写。本地已有且不同的文件要加 `--force` 才会覆盖。老项目先 `uv run tools/lyric_timing.py export projects/my-song` 生成一次。

节拍也一样：如果调试层显示小节第一拍错位了，加 `--downbeat-shift 1`（或 2、3）重新分析；速度变化大的现场录音用 `--tracker dp`；已知 BPM 用 `--bpm 128`。

## 示例：projects/anime-pdoom

那支 10 秒二次元 demo 用这个框架重建后的版本，逐像素和原 demo 一致。可以看它怎么把一首歌拆成 `lib/`（背景、光环、角色）+ `scenes/`（7 个镜头）+ `timeline.js`。它引用 `../pdoom-video/audio/pdoom.mp3`，所以两个文件夹要保持并列。

```sh
open projects/anime-pdoom/index.html
uv run tools/render.py projects/anime-pdoom
```

## 注意

- 歌曲和歌词的版权属于原作者；框架代码本身按 MIT 发布。
- 画风参考请描述风格特征（线条、配色、光影、节奏），不要照搬现有作品或角色的设计。
- 分析里的节拍网格搜索和鼓点检测改编自 pdoom-video 的 `analysis/analyze.py`（MIT）。
