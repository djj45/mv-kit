# focus-insert · 进入并跟随细节

用途：从总览进入正在变化的局部，同时保留歌词 / 标题的稳定阅读区域。事件是观众先找到目标，再随镜头靠近目标。

## 动作阶段

第 0–2 拍建立整体和移动标记；2–4 拍推进；4–8 拍继续跟随。目标要在推镜前已经可见，不能让相机和观众同时寻找主体。

## 参数

| 参数 | 示例 | 调整原则 |
|---|---|---|
| `insert.at` | 镜头开始后第 2 拍 | 来自歌词 / 拍点，给观众先找目标的时间 |
| `insert.dur` | 1 s，即示例 2 拍 | 随实际节奏调整，不照搬秒数 |
| `insert.amt` | 0.45 | 小物体可更近；检查背景和目标边缘 |
| 字幕位置 | 屏幕层上、下留白 | 不跟随世界缩放，不压在主体上 |

## 实现与依赖

[focus.js](../projects/recipe-demo/scenes/focus.js)＋[timeline.js](../projects/recipe-demo/timeline.js)＋[look.js](../projects/recipe-demo/lib/look.js)。依赖 `camera / layout`。主体每帧最后调用 `MV.focus`；稳定文字通过 `MV.overlay` 绘制。

原始可复用手法：[kit-demo/sheet.js](../projects/kit-demo/scenes/sheet.js)。不要同时把同一字幕放进世界坐标 `MV.keep`，否则推镜会被字幕的安全边距限制。

## 音乐绑定

`insert.at` 绑定需要强调的词前一个拍点，`dur` 取到目标词的时差，让推进在重点附近收住。字幕仍按自己的词时间显示，与相机独立。

## 验收与失败条件

```sh
uv run tools/render.py projects/recipe-demo pilot --from 12 --to 16
uv run tools/render.py projects/recipe-demo qa --from 12 --to 16
```

检查主体始终可见，字幕没有抖动或缩放，背景不会被推到字幕上；至少看一次完整推镜。`MV.focus` 的最后一次调用必须是想跟的目标，不能被后画的配角或装饰覆盖。
