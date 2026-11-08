# match-zoom · 同形推进转场

用途：同一个物体或语义呼应的形状连接两个空间，如圆窗变月亮、印章变整页。事件是「认出旧物体 → 进入它 → 读懂新空间」，需要两镜配合。

## 动作阶段

先给旧物体至少一拍的注意力；转场用 `land(目标拍点, 时长)` 提前启动，默认 70% 动作发生在落点前；新空间完成后至少留两拍阅读。两个场景在重叠段都必须能完整渲染。

## 参数

| 参数 | 示例 | 调整原则 |
|---|---|---|
| `match` | `['disc', 'disc']` | 两边都声明正确的 `anchors(f)` |
| 尺度 | 直径 280 → 680 | 大小应有明显差异；否则只是平移叠化 |
| `fadeIn` | 1 s | 与 `land()` 的时长完全一致 |
| `shape` | `round` | 与真实物体轮廓匹配 |
| 旧镜头终点 | 新镜头 `from + fadeIn` | 不能在转场中途结束 |

## 实现与依赖

[portal.js](../projects/recipe-demo/scenes/portal.js)、[arrival.js](../projects/recipe-demo/scenes/arrival.js)、[timeline.js](../projects/recipe-demo/timeline.js)。使用引擎已有 `zoom`，不新增渲染路径。最小例子的 `push:0` 是为了使锚点与画面一致，运动来自轨道标记、转场及新镜内部运动。

原始完整例子：[transition-demo](../projects/transition-demo/timeline.js)，包含圆窗 → 月亮、平移、颗粒重组。真实项目有额外运镜时，锚点必须反映画面上的实际位置和尺寸。

## 音乐绑定

将目标词或小节头传给 `land()`。旧镜头的阅读阶段必须在转场前完成；歌词跨镜使用引擎提供的 `f.lyrics.lineAt(f.t, f.from)`，避免旧镜再次绘制新句。

## 验收与失败条件

```sh
uv run tools/render.py projects/recipe-demo pilot
uv run tools/render.py projects/recipe-demo strip --t 19.2 --dur 1.3 --step 0.083
uv run tools/render.py projects/recipe-demo qa --from 18 --to 23
```

看旧物体能否连续追踪到新物体、接缝是否跳帧、落点是否与声音一致、新镜是否有时间看懂。只看转场中点静帧不算验收。尺寸差太小、锚点写错、旧镜提前终止、两个场景重复画歌词，都会破坏连续性。

推进会放大旧镜头的周边装饰：本例在转场前淡出轨道圈，避免放大后的线条穿过固定标题。两侧讲解文字一致；换成不同字幕时要单独安排交接，不能任由两句话叠化重影。
