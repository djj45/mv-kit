# 发布准备与变更说明

本轮整理镜头配方、成片检查、多轨交付与离线审片能力，继续使用现有 Canvas 渲染、分块编码和 QA 流程。本文说明候选提交范围与复现方法；本地验证不表示已经提交、发布或通过远端 CI。

## 变更摘要

- 镜头配方与代表性动态样片：五种配方、24 秒原创练习，样片复用现有渲染器。参见 [PILOT.md](PILOT.md)。
- 编码后验收：成片规格、黑场／静止／闪帧、声明事件的音画回测及字幕检查。参见 [ENCODED-QA.md](ENCODED-QA.md)。
- 声音与交付：BGM、旁白、音效、SRT/VTT，修改声音时复制原视频流；逐镜交付复用编码缓存。参见 [SOUND-DELIVERY.md](SOUND-DELIVERY.md)。
- 缓存与失败恢复：四类缓存的完整性校验、进程锁、清理预览、中断续跑，以及成片和回执的恢复发布。参见 [CACHE.md](CACHE.md)。
- 离线审片：多轨试听、版本差异、逐镜结论、帧／区间问题、历史参考与本地草稿恢复。交付包可附带正式审片记录，在没有原工程时独立校验。参见 [REVIEW.md](REVIEW.md) 和 [PACKAGE-VERIFY.md](PACKAGE-VERIFY.md)。
- 主体遮挡 QA：可选保护区域、歌词与底板重叠检查、定位截图，以及未标注／无法映射区域的独立覆盖报告。参见 [SUBJECT-QA.md](SUBJECT-QA.md)。

## 候选提交范围

包括本轮修改的说明、模板、`engine/player.js`、`engine/qa.js`、渲染入口和测试；新增 `recipes/`、`projects/recipe-demo/` 的源码、`tools/` 的 QA／音轨／缓存／交付／审片模块、对应测试、文档和 `.github/workflows/regression.yml`。`uv.lock` 继续使用仓库已有版本，无新增 Python 依赖。

提交前检查 `git status --short`、`git diff --check` 和实际文件清单。不要直接用 `git add .` 混入其他项目。本轮不包括 `projects/pdoom-beam/`、`projects/pdoom-eclipse/`、`projects/pdoom-forecast/`、`projects/pdoom-hadal/`、`projects/pdoom-vitrail/`。主体 QA 的默认浏览器回归使用合成素材；`--vitrail` 是可选本机验证，不要求提交该私人项目。

不提交 `.venv/`、`__pycache__/`、项目 `out/`、生成的音频、缓存、截图、回归日志和根目录 `artifacts/`。练习音频用 `projects/recipe-demo/make_audio.py` 重新生成。其他歌曲、歌词和账号数据仍按现有 `.gitignore` 保留在本机。已有跟踪的示例素材保持原样，不将本次源码整理当作全仓素材授权审计。

验证未提交的改动时，隔离副本应包含当前跟踪文件的工作区内容和逐项审过的新增文件。仅 `git archive HEAD` 会漏掉本轮实现，复制整个工作目录又会带入缓存。为副本记录路径、字节数和 SHA-256，后续改动后重新比对，避免用旧测试结果证明新源码。

## 干净环境验证

从候选源码副本或新检出目录运行，不复制原 `.venv`、`out/` 或音频。需要 uv、Node.js、FFmpeg／FFprobe 和 Chromium。CI 使用 Ubuntu 24.04、Python 3.12、Node.js 22；本机结果不能替代这个平台上的 CI。

```sh
uv sync --locked --python 3.12
uv run playwright install chromium
uv run python -B -m unittest discover -s tests -v
uv run python tests/review_browser.py --out artifacts/review
uv run python tests/subject_browser.py --out artifacts/subject
uv run python tests/render_browser.py --out artifacts/render
uv run python tests/delivery_regression.py --out artifacts/delivery --performance
```

Linux 首次装浏览器可使用 `uv run playwright install --with-deps chromium`。复用 uv 下载缓存或已安装的浏览器时，应在验证记录中注明；新虚拟环境仍需严格按锁文件安装。完整测试需要 FFmpeg 和 Node，不能把缺少依赖导致的跳过当作完整通过。

回归依次覆盖正式审片记录与草稿恢复、真实浏览器交互、60 秒／120 镜头／8 音轨导出和中断恢复、120 镜头完整逐帧交付验证、冷／热缓存及 720p 性能比较。测试使用可重建素材；不依赖本机歌曲、模型或已有成片。性能数字记录实际机器配置，不用作跨机器绝对阈值。

实际练习项目另按以下命令跑通用户入口：

```sh
uv run python projects/recipe-demo/make_audio.py
uv run tools/render.py projects/recipe-demo check
uv run tools/render.py projects/recipe-demo qa
uv run tools/render.py projects/recipe-demo --verify
uv run tools/render.py projects/recipe-demo review
uv run tools/render.py projects/recipe-demo package
# 使用 package 命令实际输出的目录：
uv run tools/verify_package.py /path/to/package
```

练习有意保留的稀疏图形／阅读停留警告见 [TREATMENT.md](../projects/recipe-demo/TREATMENT.md)。未附人工记录的交付包保留待审状态；自动验包通过只证明结构和记录一致性，不代表创意或人工审片通过。

## 升级边界

- 首次使用新版会重建缺少完整性记录的旧画面分块，之后按依赖复用。不要手动删运行中的缓存锁。
- `shot.id` 可选，但同一时间线必须唯一；建议新项目使用稳定 ID 关联历史参考。
- 无时间问题的旧版审片记录继续兼容；带时间问题使用版本 2。历史批准不会迁移为新版批准。本地未提交编辑不进入正式交付记录。
- 缓存锁使用 POSIX `fcntl`；本轮验证范围为 macOS，本仓 CI 目标为 Linux，未验证原生 Windows。
- Whisper、MLX、Demucs 属于可选依赖，本轮发布回归不下载模型、不声称已验证这些外部模型流程。

本地证据应保存环境版本、候选源码清单、命令／退出码、测试日志及报告。源码变动后重跑受影响检查。提交并推送后，再查看 GitHub Actions 的真实结果；未执行的检查应明确标为未执行。
