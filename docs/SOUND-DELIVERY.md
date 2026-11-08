# 多音轨、重混音与逐镜交付

画面仍由原有 Canvas → 分块 H.264 流程生成。声音在拼接之后混合，最终 MP4 直接复制视频流。
`remix` 只调用 ffmpeg，不启动浏览器，也不要求保留 `.chunks`。需要 ffmpeg / ffprobe。

## 声音配置

在 `project.js` 增加 `"soundtrack": "soundtrack.json"`，配置文件路径相对项目目录。
首次添加这个字段会改变项目配置，需要渲染一次；之后只改声音文件或这个 JSON，就能复用画面。

```json
{
  "version": 1,
  "song": {"gainDb": -8},
  "tracks": [
    {"id": "bed", "role": "bgm", "file": "audio/bed.wav", "at": 0,
     "duration": 24, "loop": true, "gainDb": -18, "fadeIn": 0.5, "fadeOut": 1},
    {"id": "narration-1", "role": "voice", "file": "audio/narration.wav", "at": 4,
     "trimStart": 0.3, "duration": 2.5, "gainDb": 0, "fadeIn": 0.02, "fadeOut": 0.08},
    {"id": "hit-1", "role": "sfx", "file": "audio/hit.wav", "at": 8, "gainDb": -3}
  ],
  "subtitles": [{"start": 4, "end": 6.5, "text": "这一句旁白的字幕"}]
}
```

- 原有 `project.audio` 自动作为 `song` BGM 轨，保持歌曲零点；不配 sidecar 的旧项目也能继续导出。`song: false` 关闭这条轨；`song` 对象可设 `gainDb / trimStart / duration / loop / fadeIn / fadeOut`。
- 每个 `tracks` 条目的 `id` 唯一，只允许字母、数字、下划线、短横线；`song / mix` 保留。`role` 为 `bgm / voice / sfx`。它标记用途，不自动改变音量或压低音乐。
- `file` 相对项目目录，也支持绝对本地路径。`at` 为原歌曲秒数，**不是样片内秒数**。`trimStart` 为源音频裁剪起点；默认 0。`duration` 为播放秒数，默认源长度减去裁剪起点。非循环不能超出源文件；`loop:true` 从源文件末尾回到开头，`trimStart` 只决定初始位置。
- `gainDb` 范围 -96 至 +24；淡入淡出以 cue 本身的时间计算，样片从中间开始也保留其位置。输入必须有音频流；缺文件会失败，只有显式 `--noaudio` 才跳过音频。
- 各轨按 48 kHz stereo float PCM 混合，不自动归一化；混音首部淡入 20 ms，尾部采用 `audioFadeOut`（默认 200 ms；显式片段 / pilot 为 200 ms），最后限制峰值至 0.98。成片编码为 256 kbps AAC。音量平衡、旁白可懂度仍需带声审听。
- `subtitles` 省略时导出现有歌词行，提供数组时替换，空数组关闭。`start / end` 是原歌曲秒数，支持中文和换行。导出时裁剪到当前成片范围并归零，输出 SRT / WebVTT；不会额外烧入画面，也不会移除画面原有歌词。

## 修改声音不重渲画面

```sh
uv run tools/render.py projects/my-song                  # 初次生成画面与混音
# 修改 soundtrack.json 或替换其中的音频文件
uv run tools/render.py projects/my-song remix --verify   # 校验后发布，只重做变化的声音
uv run tools/render.py projects/my-song remix --file projects/my-song/out/pilots/sample.mp4
# 也可以 --out projects/my-song/out/new-mix.mp4 保留旧版
```

`remix` 要求当前 MP4 及 `.render.json` 回执匹配，画面依赖也要匹配。改场景、时间线、歌词分析、项目配置或画面资源后必须正常渲染；旧回执缺少画面版本时，也需要先渲染一次。回执重新记录完整输入版本和当前音轨列表。无论 `remix` 还是普通导出，混音失败不会覆盖旧 MP4。

普通导出、pilot 和 remix 都先在临时目录完成媒体与回执，在发布前重查输入和目标版本。输入变化、渲染错误或另一进程已更新目标时，保留旧输出；发布回执失败会回滚。文件锁串行发布，恢复日志处理进程中断，下次检查或导出自动恢复旧 MP4/回执。两个文件不能作为一次文件系统原子替换，外部播放器可能短暂看到新 MP4；这里保证失败回滚、进程中断可恢复以及回执校验，不宣称断电事务保证。

音频缓存位于 `out/.audio-cache/`，普通导出、remix、package 共用。每条轨按源文件内容、时间范围、裁剪、增益、淡化、处理器和 ffmpeg 版本生成缓存键，混音另有缓存。日志例如 `audio cache: 2/3 stems reused; mix rebuilt` 表示只重做了一条轨。缓存命中时校验 WAV 内容；损坏会重建，包内 WAV 是副本，后续编辑不会改坏缓存。缓存不自动清理；统一容量统计、命中率和带活跃任务保护的清理见 [CACHE.md](CACHE.md)。

## 仅更新字幕

```sh
# 修改 soundtrack.json 的 subtitles 后：
uv run tools/render.py projects/my-song subtitles
uv run tools/render.py projects/my-song package
# 样片可追加 --file …；字幕新目录可用 --out 指定
```

`subtitles` 输出 SRT/VTT 到 `out/subtitles/<视频名>-<版本>/` 并刷新成片回执，MP4 字节和修改时间保持不变，不混音、不封装、不渲染。它会检查画面和音频身份；如果同时改了声音，会拒绝并提示先运行 `remix`。旧回执缺少音频版本时也需先 remix（画面版本不兼容则先正常导出）。声音未变时，`remix` 同样自动跳过混音与封装；需要单独的字幕文件时使用 `subtitles` 或 `package`。

普通 `video / pilot` 同样排除声音 sidecar 和音频文件的画面缓存依赖，因此重跑也能复用已有块。声音配置专供导出后期使用，**不要让绘图代码读取它**；如果某个声音文件或 sidecar 确实直接决定画面，把它加入 `project.verifyInputs`，其变化就会同时让块缓存与 `remix` 的画面版本失效。正常的节拍/包络/歌词分析数据仍参与画面缓存。

原有 Canvas 实时预览仍播放 `project.audio`；多轨审看使用 `render.py … review` 生成的离线页，支持最终混音、单轨试听、字幕和 QA 定位，见 [REVIEW.md](REVIEW.md)。`filmcheck` 检查混音后的实际音轨；`sync` 默认使用原歌曲，也可用事件的 `audio: {track, sourceAt, cycle?}` 指定旁白/音效源锚点，关闭原歌曲也能测量。裁剪、循环、歧义和证据边界见 [ENCODED-QA.md](ENCODED-QA.md)。字幕仅改 sidecar 时不需重渲；修改已经画到 Canvas 的歌词仍需渲染。

## 逐镜交付包

```sh
uv run tools/render.py projects/my-song package
uv run tools/render.py projects/my-song package --file projects/my-song/out/pilots/sample.mp4
# --out projects/my-song/out/delivery/review-02 指定新目录，已有目录不覆盖
```

默认目录 `out/delivery/<视频名>-<交付版本前12位>/`。交付版本覆盖成片回执中的视频、声音、字幕及打包实现，不再只取 MP4 哈希；只改字幕也会得到新目录，旧包保留。`manifest.packageRevision` 记录完整版本。同一版本已存在时仍拒绝覆盖。打包前复用 `filmcheck / sync`；明确失败会阻止打包，`warn / unverified` 保留在报告和 manifest 中供人工复核。打包结束再次检查源成片与回执，失败不发布半成品。

| 文件 | 含义 |
|---|---|
| `film.mp4` | 原成片的逐字节副本 |
| `clips/001.mp4` 等 | 按帧准确切分、无音轨的逐镜片段，H.264 CRF 18 重编码 |
| `audio/<id>.wav` | 每条 cue 的独立音轨，包含其增益/淡化，与整段成片等长，全部在剪辑时间线 0 秒对齐 |
| `audio/mix.wav` | 混音参考，含片头片尾淡化及峰值限制；不要与独立轨重复叠加 |
| `subtitles.srt / subtitles.vtt` | 相对成片零点的字幕 |
| `manifest.json` | 帧区间、原歌曲时间、音轨角色与源裁剪信息、字幕、QA 状态、媒体哈希 |
| `render.json` | 源成片回执，源绝对路径仅作追溯 |
| `filmcheck.json / sync.json / subtitles.json / README.md` | 成片、音画、字幕 QA 报告与导入说明 |

### 逐镜缓存

`package` 共用 `out/.clip-cache/`。首次准确切帧需要编码；之后若视频流和切片范围不变，直接复制已验证片段。更换混音或只改字幕不会让镜头缓存失效。日志如 `clip cache: 6/6 clips reused; 0 encoded`，manifest 同时记录 `videoRevision`、各镜头 `cacheKey` 和本次 `clipCache` 命中数量。

缓存键包括视频压缩数据、时间戳、编码附加数据、尺寸/色彩信息、起止帧、输出 FPS、编码参数、工具及 ffmpeg 版本；不包含音轨和字幕。缓存命中校验文件哈希，新片段校验实际解码帧数、FPS、尺寸及无音轨。输出使用副本，修改交付文件不会污染缓存；缓存损坏或缺失自动重建，编码中源文件变化不写入缓存。

当前按**整条视频流身份**保守失效：视频画面或时间戳改变会让相关键变化，不承诺只改一个镜头时其余片段仍命中；主要优化重新混音、改字幕和重复交付。缓存未命中仍使用现有准确切片流程，不降低交付质量。目录没有后台自动清理；使用 [缓存管理工具](CACHE.md) 预览并执行清理。

逐镜片段连续、不重叠、不漏帧；按渲染器的帧中心时钟分界，转场重叠归入场镜头，时间线空档保留为独立片段。它们来自已合成的成片，所以转场保留在像素里，不能拆回两个场景层。只有混音和复制主视频保证视频流不重新编码；准确逐镜切片需要重编码，但不重新执行 Canvas 渲染。所有交付素材用包内相对路径，可整体搬走；原音频来源路径仅供追溯，重新剪辑可使用包内 WAV。

技术验证示例见 `projects/recipe-demo`。该例的 `voice-guide` 是合成测试音，验证旁白轨通路，**不是真人旁白或 TTS**。正式项目直接换成已准备的录音即可。


## 完整逐镜交付与批量解码

`package` 先将源片复制到私有交付暂存目录，核对完整 SHA-256 后以该副本作为切片源。这份副本同时成为交付包的 `film.mp4`。视频身份只计算一次；各镜头不再反复对原成片做全文件摘要检查。最终发布前仍复用现有 provenance / 回执检查，原成片或工程变化会阻止交付包发布。

未命中镜头连续时，一次解码和编码，在准确帧边界强制关键帧并分段；第一段因 B 帧产生的起始时间偏移通过视频流复制归零，不做二次编码。未命中镜头分散时，单个解码器按帧顺序输出 YUV420P，跳过已有缓存区间，逐个送入镜头编码器。两条路径都限制为最多一个解码器和一个视频编码器，不建立全片原始帧文件，也不同时启动几十个编码器。保留 H.264 / CRF 18 / fast 设置、源片色彩标记与像素比例。每个新镜头仍验证实际帧数、帧率、尺寸、起始时间和时长，再复制进包并写入缓存。

已命中的镜头直接复制；未命中区间之间的帧由同一解码流经过，不重复从头解码。全部命中时不启动画面解码器。批量编码设有 30 分钟超时，Python 异常、Ctrl-C 或超时会关闭相关子进程并释放缓存锁；完成且通过校验的镜头保留，重试自动复用。最终目录仅在整包成功且原片 / 回执仍匹配时发布。原片途中被替换时，已缓存片段仍来自已校验副本，不会把新旧画面混入同一个缓存身份。

`manifest.json` 保留 `clipCache.reused / encoded`，新增 `clipWork`：批量切片耗时、解码遍数、源片副本校验次数、处理帧区间、执行策略（连续分段 / 原始帧传送 / 全缓存）及通过 Python 传送的原始帧数。连续分段路径的 `rawFramesTransferred` 为 0，表示没有经过 Python 传帧，不表示未解码。`sourceSnapshotChecks` 只统计切片阶段，不包含原有 QA、provenance 和交付文件清单的校验。

完整交付回归：

```sh
uv run python tests/delivery_regression.py --out /tmp/mv-delivery-regression --performance
```

实际打包 60 秒、120 镜头、8 音轨，并将所有镜头解码后连接检查帧编号 0–719，核对无漏帧、重复帧、错序以及每个交付文件摘要。覆盖首次交付、完成 17 镜头后模拟 Ctrl-C、复用 17 镜头续跑，以及 120/120 全命中。额外的 720p / 12 秒 / 24 镜头对比用于测量切片性能；不设置依赖机器速度的硬性通过阈值。

报告分别记录 Python 进程峰值 RSS 和最大子进程峰值 RSS（`ru_maxrss`），不是多个并发进程 RSS 的总和。对比耗时包含切片缓存和编码，不把 QA / 混音耗时算成切片提速。小画幅、短镜头的进程启动开销占比高，批量路径不保证所有项目都更快；实际收益以报告为准。

本批本机样例记录：720p / 12 秒 / 24 镜头切片由 3.928 s 降至 1.597 s；最大子进程峰值 RSS 由 158.55 MiB 增至 210.0 MiB。连续编码减少重复工作，但编码器缓冲的峰值可能增加，不能把提速等同于内存下降。数值是该样例和本机环境的结果。升级后逐镜处理器指纹改变，首次打包会重建旧逐镜缓存；画面分块仍可按原规则复用。

完整交付目录可用 `uv run tools/verify_package.py /path/to/package` 独立验包，不依赖原工程路径。`package --review-record /path/to/record.json` 可附带当前版本的人工审片结论，详见 [PACKAGE-VERIFY.md](PACKAGE-VERIFY.md)。
