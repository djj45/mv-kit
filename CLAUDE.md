# mv-kit：给 Claude 的项目约定

这是一个用代码渲染、与歌词和节拍同步的 MV 框架。用户会换歌、换风格描述来做新 MV。先读 `README.md` 和 `docs/ENGINE.md`。

## 工作流程（按顺序，不跳步）

1. **项目与数据**：`tools/new_project.py` 新建 → `analysis/analyze_audio.py` → `analysis/align_lyrics.py`。看输出里的 BPM、小节相位分数、段落和低置信度词表；有疑问就让用户在预览里按 `d` 核对，或自己用 `render.py stills` 截图看调试层以外的画面。
2. **方案先行**：先按 `template/TREATMENT.md` 写好项目的 `TREATMENT.md`（概念、画风、调色板、字体、母题、镜头表），给用户看，确认后再写代码。风格要具体到能照着画：线条、阴影层数、配色、质感、作画张数、镜头语言。
3. **时间线**：`timeline.js` 用 `cut / after / start` 按歌词内容和节拍算切点，不手写秒数。
4. **镜头**：一个镜头一个 `scenes/<名字>.js`；多个镜头共用的角色、背景、道具放 `lib/`（在 `project.scripts` 里列出）；能跨项目复用的画风工具放 `kits/`。
5. **每改一个镜头就看图**：`uv run tools/render.py projects/<项目> sheet --cuts`（或 `stills --t …`），然后用 Read 工具**打开 PNG 亲自检查**：构图、文字是否遮挡、歌词与画面是否同步、镜头之间是否衔接。发现问题先修再继续。
6. **导出**：`uv run tools/render.py projects/<项目>`；先 `check` 确认没有场景报错。

## 代码规则

- 确定性：一帧只由 `f.t` 决定。禁止 `Math.random / Date.now / performance.now`；用 `hash / mulberry32 / noise1`。不在 `render` 里累积状态。
- 静态的画（背景、贴图）在 `MV.onInit` 或场景 `init()` 里画一次。
- 手绘感：角色动作和线条抖动用 `f.tq` / `f.tick`（按 `drawRate` 定格），镜头运动用连续的 `f.t`。
- 歌词逐词同步：词在 `start` 时出现或高亮，不能抢跑；文字离边缘 ≥ 96 px，不被角色或特效盖住。
- 大动作落在拍点上：切镜在小节头或唱到的音节，冲击落在 `f.a.kick / f.a.snare`。
- 全局名字冲突：多个 `<script>` 共享全局作用域，顶层 `const` / `let` 不能重名。项目内的顶层常量加前缀或放进函数 / 对象里。
- `project.js` 等号后面必须是合法 JSON（Python 工具也读它）。

## 版权与原创

- 画风参考写成风格特征（线条、配色、光影、节奏、镜头语言），不要画成现有作品里的角色或照搬具体画面；用户点名某个角色时，保留原创角色，只借鉴那一类作品的通用画风特征，并简短说明。
- 歌曲版权属于原作者，示例项目只引用本地文件。

## 常用命令

```sh
uv run tools/render.py projects/X check            # 列出镜头、每个镜头渲染一帧、报错
uv run tools/render.py projects/X sheet --cuts     # 每个镜头首 / 中 / 尾三帧拼板 → out/sheet.png
uv run tools/render.py projects/X stills --t 12.5,20
uv run tools/render.py projects/X --from 30 --to 40 --preset veryfast   # 快速看一段动态
uv run tools/render.py projects/X                  # 最终导出
uv run tools/tune_lyrics.py projects/X             # 歌词校准工具（频谱 + 逐字竖线，保存到 data/lyrics_fix.json）
```
