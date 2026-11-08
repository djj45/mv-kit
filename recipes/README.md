# 镜头配方库

配方描述「先发生什么、落在哪个拍点、留多久让人看懂」，风格包 `kits/` 负责怎么画。先按叙事选配方，再用项目的颜色、角色、字体实现；不要直接搬示例的秒数。这里的实现来自 mv-kit 的已有手法与新写的最小例子，没有引入 Remotion 或复制外部镜头库代码。

| 配方 | 用在什么时候 | 检索词 | 可运行示例 / 样片区间 |
|---|---|---|---|
| [path-reveal](path-reveal.md) | 展示过程、轨迹、因果的传递 | 路径、线条、生长、导火索 | `recipe-demo` / 0–4 s |
| [stepped-value](stepped-value.md) | 数值或状态随词 / 重拍升级 | 数字、仪表、递增、副歌 | `recipe-demo` / 4–8 s |
| [stagger-assemble](stagger-assemble.md) | 先建立结构，再填入可读信息 | 错峰、组装、卡片、排版 | `recipe-demo` / 8–12 s |
| [focus-insert](focus-insert.md) | 从整体进入关键细节并跟随它 | 运镜、特写、跟随、字幕 | `recipe-demo` / 12–16 s |
| [match-zoom](match-zoom.md) | 通过共同形状连接两个空间 | 转场、匹配、推进、锚点 | `recipe-demo` / 18–23 s |

## 直接看动作

```sh
python3 projects/recipe-demo/make_audio.py   # 本地生成原创节拍练习音轨
open projects/recipe-demo/index.html        # 24 秒、五种手法；空格播放
uv run tools/render.py projects/recipe-demo pilot  # 默认展示同形转场，带音轨
uv run tools/render.py projects/recipe-demo pilot --from 4 --to 8
```

`pilot` 输出 `out/pilots/pilot-<起>-<止>.mp4` 与同名 JSON；用系统播放器打开 MP4。JSON 仅记录渲染参数和待审状态，不代表审样或 QA 通过。其他四种预览使用表中的区间；不会覆盖整片输出。示例不含歌词，接入歌曲后仍要检查逐词同步。

## 用进项目

1. 读配方的动作阶段、参数与失败条件，再读它链接的场景源码和时间线。配方 ID 写在 `TREATMENT.md` 镜头表的「配方 / 改动」列。
2. 一个场景一个文件，共用绘制函数放项目 `lib/`。最小例子里的 `RD` 是示例助手，移植时一起适配 `lib/look.js`，不是引擎全局 API。
3. 用 `word / start / cut` 或 `audio.timeOfBeat()` 取得事件时刻，传进 `params`；场景从 `f.t` 计算状态。例子用原创固定拍网格，真实歌曲以分析数据为准。歌词仍用 `f.lyrics.lineAt(f.t, f.from)`，不要用数字变化的计数器代替歌词时间。
4. 做一段包含代表性动作、阅读停留、至少一次镜头衔接的[动态样片](../docs/PILOT.md)。静帧确认构图，视频确认运动。
5. 运行局部 `qa`，全速带声音播放，再扩展其他镜头。配方列出的失败条件都要看；换文字长度或音乐速度后重新审样。

## 添加配方

沿用现有卡片的六部分：用途与事件、动作阶段、参数、实现与依赖、音乐绑定、验收与失败条件。必须提供可运行源码、预览区间与原始项目来源；仅有形容词或静态截图不入库。新增示例不依赖私有素材，生成文件留在项目 `out/` 或 `audio/`。更新上表即可用 `rg '关键词' recipes` 检索。
