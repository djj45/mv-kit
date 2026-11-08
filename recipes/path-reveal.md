# path-reveal · 沿路径显现

用途：讲清「从哪里来、经过什么、到哪里去」，适合路线、增长曲线、导火索。事件是未完成的路径逐步完成，焦点始终在活动端点。

## 动作阶段

以 8 拍为示例：第 0–1 拍显示起点和淡色目的路径；1–5 拍沿路径推进；5–8 拍保持结果。路径推进用 `ease.inOutCubic`，不要一开场就匀速滑到结尾。画面可缓推，结果保持期间不再生长。

## 参数

| 参数 | 示例 | 调整原则 |
|---|---|---|
| 路径 | 100 段曲线，宽 1300 设计像素 | 先保证全路径在安全区内 |
| 生长区间 | 4 拍 | 长路径或复杂拐弯延长；不要压缩结果停留 |
| 线宽 / 端点半径 | 10 / 18 px | 端点能被一眼找到，避免全线同样抢眼 |
| 完成后停留 | 3 拍 | 至少够读懂结果，不接着重复播放 |

## 实现与依赖

最小实现：[path.js](../projects/recipe-demo/scenes/path.js)，共用 [look.js](../projects/recipe-demo/lib/look.js)，依赖 `camera / layout`。首尾状态都由 `f.t` 求值，允许倒序渲染。每帧用 `MV.focus(...tip, 'tip')` 报出活动端点。

原始手法：[kit-demo/fall.js](../projects/kit-demo/scenes/fall.js) 的线条端点与 `CAM.keep`、[pdoom-sign/fuse.js](../projects/pdoom-sign/scenes/fuse.js) 的导火索。它们含项目依赖，最小例子不需要这些工程的歌曲。

## 音乐绑定

真实歌曲用目标词的 `word()` 作为完成时刻，用前面的拍点作为开始时刻。例如将两者放在 `params: { begin, finish }`，使用 `clamp((f.t-begin)/(finish-begin))`；先校验 `finish > begin`。歌词不要和端点争夺同一块空间。

## 验收与失败条件

```sh
uv run tools/render.py projects/recipe-demo pilot --from 0 --to 4
uv run tools/render.py projects/recipe-demo qa --from 0 --to 4
```

检查首帧能否识别方向，活动端点有没有跑出画面，落点是否在拍上，完成后是否能读清。路径太长时用 `CAM.keep` 缩放世界并报告变换后的焦点；不要把焦点坐标硬夹在画面边上。长时间保持与全程匀速都应在动态样片中核实。
