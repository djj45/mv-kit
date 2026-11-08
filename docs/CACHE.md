# 渲染缓存管理与回归

保留现有 Canvas → 分块编码 → 拼接 / 混音流程。管理四类可重建缓存：`out/.chunks`（画面分块）、`out/.audio-cache`（音轨和混音 WAV）、`out/.clip-cache`（逐镜 MP4）、`out/.review-cache`（审片逐帧摘要 JSON）。不清理成片、交付包、审片页、源素材或分析数据。

## 查看与清理

```sh
uv run tools/cachectl.py projects/recipe-demo
# 预览：每类缓存保留到 500 MB，只考虑最近 7 天未使用的条目
uv run tools/cachectl.py projects/recipe-demo --prune --keep-mb 500 --older-than-days 7
# 执行同一策略；运行时重新计算候选项
uv run tools/cachectl.py projects/recipe-demo --prune --keep-mb 500 --older-than-days 7 --apply
# 仅清理逐镜缓存：先预览，再执行
uv run tools/cachectl.py projects/recipe-demo --kind clips --prune
uv run tools/cachectl.py projects/recipe-demo --kind clips --prune --apply
```

默认只报告；`--prune` 仍是预览，必须加 `--apply` 才删除。`--apply` 单独使用会报错。`--keep-mb` 使用十进制 MB，额度分别应用于每一类缓存；同时设置天数时，近期使用条目会保留，因此最终容量可能仍超过额度。默认额度和天数均为 0，表示清理所选类别的全部可管理条目。

JSON 报告提供可管理容量 `bytes`、条目数 `entries`、历史 `hits` / `misses`、命中率 `hitRate`、候选文件清单 `candidates`、预计释放量 `reclaimableBytes` 和实际释放量 `removedBytes`。画面分块 / 音频 / 逐镜文件与配套 JSON 按一组计算和淘汰，孤立元数据也可清理。未识别文件和符号链接列入 `ignored`，不计入可管理容量，也不删除。

淘汰按最近使用时间排序；升级前没有访问记录的条目使用文件修改时间。统计从本次升级后的成功复用 / 构建开始累计，历史数据未知时 `hitRate` 为 null，清理不会重置累计计数。音轨统计包含单轨和最终混音；取消任务已经完成的块也计入成功构建。容量包括遗留临时文件，命中率不包括失败构建。

## 并发与中断

`out/.cache-state` 保存统计与 POSIX 进程锁，锁文件位于缓存目录外，不能在任务运行时手动删除。画面导出从启动到拼接完成持有 chunks 锁；音频缓存在读、构建、复制和发布条目期间持锁，逐镜批量交付在整个缓存读取与构建阶段持锁。同一类别的缓存操作串行，审片摘要也使用独立的同类锁；不同类别独立；浏览器内部多 worker 渲染保持并行。

清理尝试立即取得锁；遇到活跃缓存返回 `busy: true` 并跳过该类别，其他类别继续处理。进程正常退出、异常退出或被杀后，内核释放锁。下次清理可移除遗留的 `.audio-*` / `.clip-*` / `.review-*` / 分块临时文件；下一次构建仍校验画面分块、音频和逐镜缓存内容。原有分块自动淘汰和 `render.py --clean` 也在锁内执行。`--clean` 保留未知文件。

此协议保护使用新版工具启动的进程；升级前启动的任务应先结束。不要绕过工具手动删除运行中的缓存或 `.cache-state`。缓存没有后台自动淘汰，不会因为查看统计而删除内容。

## 画面分块完整性与素材指纹

每个分块 MP4 附带同名 JSON，记录文件 SHA-256、字节数、帧区间、解码帧数、帧率、尺寸、编码和像素格式。编码结束后通过 FFprobe 解码计数并核对规格，确认无解码错误、无额外音轨，再发布 MP4 和校验记录。编码失败或规格不符不会替换已有的有效块。

复用时先核对记录版本、块名和目标规格，再重新计算完整 MP4 的内容摘要。摘要相同意味着复用的是已通过解码检查的那份字节，因此命中时不必再次解码。文件损坏、记录缺失 / 损坏、规格不符或文件被替换，均只重建对应分块；日志打印 `chunk cache: rebuilding N unverified or damaged chunk(s)`。MP4 与记录之间发生中断时，不完整或不匹配的一对不会作为命中使用。两者共同参与容量统计、清理与旧版本淘汰。

所有纳入画面依赖的素材统一使用流式 SHA-256，不再对超过 16 MB 的文件使用“大小 + 修改时间”。每次规划重新读取内容，一次规划内同一文件只计算一次，不跨运行按时间戳复用摘要。内容变化但文件大小和时间戳保持原样时，仍能使相关缓存失效；仅修改时间戳不会触发重渲。画面依赖范围保持现有规则，需要显式加入的素材仍使用 `project.verifyInputs`。

升级后的首次导出需要重建旧画面分块：素材指纹算法已更新，旧块也没有完整性记录。此后继续按镜头依赖复用。完整性校验新增一次编码后的解码检查，以及每次命中时的流式读取，不改变 Canvas 渲染、视频编码参数和混音流程。

## 自动回归

`.github/workflows/regression.yml` 在 push、pull request 和手动触发时安装 FFmpeg、Node、锁定 Python 依赖及 Chromium，运行完整离线回归和两个真实浏览器测试、完整逐镜交付与 720p 性能对比，保留浏览器产物 7 天。工作流文件需要随代码提交到 GitHub 才会运行。

本地命令：

```sh
uv sync --locked
uv run playwright install chromium
uv run python -B -m unittest discover -s tests -v
uv run python tests/review_browser.py --out /tmp/mv-review-regression
uv run python tests/render_browser.py --out /tmp/mv-render-regression
uv run python tests/delivery_regression.py --out /tmp/mv-delivery-regression --performance
```

缓存回归覆盖预览不修改、LRU / 天数策略、配套元数据、活跃锁、并发只构建一次、SIGKILL 后恢复、损坏缓存及未知文件 / 符号链接保护。分块专项回归还覆盖规格错误、解码错误、发布中断、旧缓存升级，以及 17 MiB 素材同大小 / 同时间戳修改后的失效。现有发布回归继续覆盖成片与回执的事务恢复。

长项目测试实际运行现有渲染器：60 秒、120 镜头、8 条音轨、720 帧；中断后检查旧输出未变、完成分块复用，再检查完整帧数和时长、120 镜头覆盖无缺口、修改一轨只重建该轨和混音、首 / 中 / 尾逐镜缓存命中，以及 30 块全部复用后 `--clean` 保留未知文件。另模拟一个块内容变化但大小 / 时间戳不变，以及另一个块丢失校验记录，确认只重建 2 块、其余 28 块字节和修改时间均不变。使用 96×54 画幅降低 CI 成本；这验证长时间线与缓存正确性，不代表 4K 渲染性能基准。

完整交付回归另覆盖全部 120 镜头实际切片和逐帧编号校验、中断后的 17/120 复用、二次交付 120/120 复用，并记录耗时和进程峰值 RSS，见 [SOUND-DELIVERY.md](SOUND-DELIVERY.md)。

审片摘要使用 `--kind review` 查看及清理，与其他类别共用容量、最近使用时间、锁和命中统计规则。命中时仍扫描实际视频包，避免重新解码画面摘要；视频流未变的声音重混可复用。损坏摘要自动重建，详见 [REVIEW.md](REVIEW.md)。
