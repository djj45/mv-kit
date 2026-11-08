# 成片检查与关键事件音画回测

原有 `check / qa` 继续检查时间线、歌词、排版、焦点和动作。新增检查直接解码最终 MP4，验证编码 / 封装后的结果；它们不修改视频、响度、音乐分析或场景时序。

```sh
uv run tools/render.py projects/X check
uv run tools/render.py projects/X qa
uv run tools/render.py projects/X --verify       # 渲染与回执 → filmcheck → sync → subtitlecheck

# 检查已经导出的文件，不启动浏览器，也不重新渲染
uv run tools/render.py projects/X filmcheck
uv run tools/render.py projects/X sync
uv run tools/render.py projects/X subtitlecheck
uv run tools/render.py projects/X sync --file projects/X/out/pilots/pilot-00030.000-00036.000.mp4
```

默认检查整片默认文件名；4K 默认名可用 `--4k` 选择，其他路径用 `--file`（相对当前工作目录）。检查模式不接受 `--from / --to / --fps / --out`，实际范围与规格来自被检文件的回执。样片和局部导出同样可以使用 `--verify`。

字幕 QA 检查导出后的停留、速度、行宽、行数和重叠，见 [REVIEW.md](REVIEW.md)。用 `render.py projects/X review` 生成离线多轨审片页，可直接点击这些检查的问题定位到成片。

## 结果与退出码

| 状态 | 含义 | 退出码 |
|---|---|---|
| `pass` | 本次声明的检查都有足够证据且达标 | 0 |
| `warn` | 有需要处理或说明的画面 / 声音问题 | 0 |
| `unverified` | 无回执、无事件、无可靠波形匹配或无明确画面落点 | 2 |
| `fail` | 超出同步容差、结构不符、未声明黑场、缺音轨、解码失败或版本过期 | 1 |

`info` 是单条记录的说明，不提升整体严重级别。整体取 `fail > unverified > warn > pass`。`--verify` 汇总两个检查的退出码：任何失败为 1，否则任何未验证为 2。不能把退出码 2 当通过；没有标注事件的工程仍能渲染，只是无法声明音画已验证。

每个被检文件单独输出到 `out/qa/encoded/<文件名>-<路径摘要>/`：`film.json / film.md` 与 `sync.json / sync.md`，不会覆盖原有 `out/qa/qa.json` 或不同样片的报告。报告包含镜头、歌曲绝对秒、成片局部帧和实测值；JSON 是完整数据，Markdown 便于逐条修复。无回执时只知道成片时间，不能推断歌曲起点。

## 成片检查 filmcheck

- 对照实际导出回执检查宽高、FPS、解码帧数、视频时长及帧时间戳连续性。
- 要求音轨时检查存在性、音视频时长差；显式 `--noaudio` 的导出允许无音轨。
- FFmpeg 扫描黑段（至少 0.1 秒）、静止段（至少 1.2 秒）和单帧亮度尖峰。已知硬切附近不报单帧亮度警告；这不是完整的闪光安全检测。
- 测量综合响度、真峰值和持续静音。只报告，不自动归一化；没有把某个 LUFS 值当作所有作品的统一标准。真峰值接近满刻度时警告，要求有声音却几乎全片静音时失败。

静止检测使用降采样后的画面，稀疏图形或刻意阅读停留可能报警。对照视频判断，在 `TREATMENT.md` 写明理由。明确的艺术性黑场 / 停留 / 闪光 / 静音可在项目配置中声明：

```json
"filmQa": {
  "allow": [
    {"kind": "black", "from": 30, "to": 30.5, "reason": "章节之间的黑场"},
    {"kind": "freeze", "from": 40, "to": 42, "reason": "标题阅读停留"}
  ]
}
```

区间是**歌曲绝对秒**，必须完整包含检测区间；声明只把对应创作性发现记为 `info`，保留原级别与原因。不能豁免帧数、缺音轨、版本失效等结构问题。配置变更后重新导出再验证，不在旧报告上直接写通过。

## 在时间线标注事件

每个镜头可以添加 `sync` 数组。事件时间与动作共用 `word / cut / audio.timeOfBeat()` 的结果，**不另造一套秒表**。此字段仅声明要测什么，不自动驱动动画；场景要实际读取同一个时间。

```js
MV.timeline(({ word, cut, T1 }) => {
  const begin = cut('第一句的关键词');
  const hit = word('目标词');
  return [{
    scene: 'impact', from: begin, to: T1,
    params: { hit },                         // 场景使用 f.params.hit 驱动动作
    sync: [
      { id: 'impact-cut', type: 'cut', at: begin },
      { id: 'title-flash', type: 'action', at: hit,
        visual: { metric: 'brightness', roi: [0.3, 0.2, 0.4, 0.5] } }
    ]
  }];
});
```

- `id` 全工程唯一。`at` 是歌曲绝对秒，必须在所属镜头内。
- `cut` 只用于镜头起点的硬切。默认测全画面相邻帧变化；相似画面可显式指定 ROI。片头没有前一帧，不一定能验证。
- `action` 要显式提供 `visual.metric` 和 `visual.roi`；未声明观测的动作保留为 `unverified`。
- `roi` 为输出画面归一化 `[x,y,w,h]`，每项范围 0–1，整体不得越界。相机移动时选择最终画面里的区域。
- `change` 找局部相邻帧差峰，适合硬切、突变；`brightness` 找短暂亮度峰，适合单次闪光。`minSignal` 可选，默认 8（灰度 0–255），不能通过随意降低阈值掩盖歧义。
- 缓慢位移的“到达”、长时间亮度平台、持续复杂运动不能仅靠变化峰判断语义。重新设计可观测事件或人工逐帧复核，不能声明测到了语义落点。

例子见 [recipe-demo/timeline.js](../projects/recipe-demo/timeline.js)：两个硬切和一次数值变化峰。它们与场景都使用同一份节拍数据。没有给平滑推进转场强行指定一个可自动证明的“落定帧”。

### 指定旁白或音效轨

事件省略 `audio` 时保持原歌曲时钟。新增可选声明：

```js
{ id: 'value-change', type: 'action', at: beat(10),
  audio: { track: 'value-sfx', sourceAt: 0.2 },
  visual: { metric: 'change', roi: [0.35, 0.3, 0.3, 0.3] } }
```

`track` 是 `soundtrack.json` 中的轨道 ID（原歌曲自动轨为 `song`）；`sourceAt` 是**未经裁剪的源音频文件秒数**，必须由作者标注关键词或音效中的可辨认位置，不进行语音识别。即使关闭原歌曲，声明的 voice / sfx / bgm 轨仍可回测。画面 `at` 和音频锚点分开，避免把错误的音轨放置时间直接当作同步通过。

非循环轨的预期声音位置为 `track.at + sourceAt - trimStart`。循环轨可加整数 `cycle`，默认 0 表示源文件第一遍；1 表示第一次回到文件开头后的那一遍。计算为 `track.at + sourceAt + cycle × 源音频时长 - trimStart`，必须落在轨道播放时长内。样片再减去成片起点得到实际输出时间。

源锚点周围需要前 40 ms / 后 80 ms 的可辨认波形。靠近裁剪、片段或循环接缝、锚点落在样片外、声音过弱或被混音掩盖、同一时间有另一轨播放相同波形时，保留 `unverified`。不存在的轨道、越界源时间、错误循环次数属于声明错误，报告 `fail`。静音导出仍不能验证音画。此方法证明声明波形与画面峰的对应关系，不证明说了哪个词，也无法对任意混音做声源分离。

报告的 `audioReference` 记录轨道、角色、源时间、循环次数、预期歌曲/输出时间；`audioPlacementOffsetFrames` 记录声明音轨位置与画面计划时间的差，`audioOffsetFrames` 和 `errorFrames` 保留实际测量结果。审片页和交付包继续使用同一份 sync 报告。

## 回测方法与范围

1. 从原歌曲或显式指定的音轨源文件取锚点附近短波形，与成片音轨在预期声音时间前后 0.25 秒做归一化相关匹配。静音、低相关、周期性歧义峰和搜索窗口边缘的峰都不视为可靠证据。
2. 解码事件预期帧前后 7 帧，先裁 ROI 再缩小，寻找画面变化 / 亮度峰。弱峰、多个相近峰、长平台或边缘峰记为未验证。
3. 计算 `errorFrames = 实测画面帧 − 实测声音秒 × fps`。正值表示画面晚，负值表示声音晚。默认容差 ±2 帧，可在 `"syncQa": {"toleranceFrames": 1}` 调整，允许 0–3 帧。

报告同时保留计划帧、帧量化误差、波形相关度、音频偏移和画面偏移。超过搜索范围的错位可能是 `unverified`，不会被当作通过。没有自动补偿或写回偏移；先排查源音乐版本、裁剪和动作时序，再重新渲染。

样片只验证范围内事件，范围外事件列在 `skippedOutsideRange`。范围内没有事件、静音样片或历史文件没有回执，整体为 `unverified`；部分事件没有证据时不能声称整组通过。

## 导出回执与旧片保护

每次视频 / 样片导出后生成 `<输出文件>.render.json`：实际区间、帧数、规格、镜头、事件、渲染设置、输入版本、成片 SHA-256。原来的样片同名 `.json` 仍保留审样信息；`.render.json` 用于机器检查。

输入版本覆盖工程内资源、引擎、渲染脚本、使用的 kit、显式脚本 / 数据 / 音频；大素材也按实际字节计算 SHA-256。自动遍历跳过生成的 `out/`、`stems/`、`dreamina/`、隐藏目录与说明文档；显式依赖仍会纳入。运行时动态读取的工程外素材需显式列入 `project.verifyInputs`（文件或目录），无法从任意 JavaScript 中自动发现所有外部依赖；正常使用本地项目素材最容易复现。

成片被替换、工程输入改变、渲染过程中输入改变或出现场景错误，回测不会通过。历史视频无回执仍可做基础扫描，但不能证明其对应当前工程。重新导出时继续复用现有分块缓存，不为检查更换渲染引擎。

## 回归测试

```sh
uv run python -B -m unittest discover -s tests -v
```

`test_encoded_qa.py` 使用本地生成的波形和真正的 H.264/AAC 文件，覆盖 24/60 FPS、非零导出起点、画面 / 声音分别延后 4 帧、无峰 / 歧义峰、旧片、帧数 / 时长、黑场与缺音轨。不访问网络、不需要私有歌曲；未安装 FFmpeg / FFprobe 时这一组明确跳过。

`test_track_sync.py` 另覆盖无原歌曲的旁白轨、源裁剪、循环音效第二遍、静音/过弱/重复来源、未知轨道与错误锚点；音频或画面延迟 4 帧都必须失败。
