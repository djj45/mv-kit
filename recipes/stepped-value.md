# stepped-value · 数值逐拍变化

用途：数字、仪表、条形图随关键字或音乐升级。事件是「旧值 → 快速变化 → 新值保持」，每次变化后留出可读的平台期。

## 动作阶段

8 拍示例在第 0、2、4、6 拍显示四个值；每次变化只占 0.35 拍，用 `ease.outCubic` 收住，随后保持。最后一个值不归零；下次副歌可从更高起点继续升级。

## 参数

| 参数 | 示例 | 调整原则 |
|---|---|---|
| 数值列表 | 12 / 36 / 64 / 92 | 内容决定数值，不让随机数替代叙事 |
| 每次变化 | 0.35 拍 | 小于两个事件间距；太慢就没有平台期 |
| 数字字号 | 210 px | 按最长值测量，避免三位数时突然溢出 |
| 条形宽度 | 1200 px 对应 100 | 明确上下限；超过上限须设计新的表现 |

## 实现与依赖

[steps.js](../projects/recipe-demo/scenes/steps.js)＋[look.js](../projects/recipe-demo/lib/look.js)，使用 `BOX.center` 和 `MV.focus`。原始手法：[pdoom-sign/hook.js](../projects/pdoom-sign/scenes/hook.js) 中随歌词逐级跳动的仪表。

## 音乐绑定

把示例 `beats` 换成 `lyrics.findWords()` 返回的词开始时间或选定重拍。先按时间找到当前事件，再从上一值插值到当前值；不要每帧累加。词很密时只选择承担含义的词改变数值，其余歌词照常逐词同步。

## 验收与失败条件

```sh
uv run tools/render.py projects/recipe-demo pilot --from 4 --to 8
uv run tools/render.py projects/recipe-demo qa --from 4 --to 8
```

全速播放时应能读出目标值，不能只看到数字滚动。检查首个事件前的初值、最后值的停留、数字与条形的一致性，以及跨切点有没有重置闪一下。颜色变化只是强调，不能替代数值变化本身。
