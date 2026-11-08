# stagger-assemble · 先结构后信息

用途：卡片、面板、图表或标题组合逐步形成。事件分为建立结构和填入信息两步，避免文字与容器同时乱飞。

## 动作阶段

8 拍示例：三个空框在第 0、0.5、1 拍依次开始落位，每个用 1 拍 `ease.outBack`；第 2–3 拍让结构稳定；第 3、4、5 拍按阅读顺序加入文字；第 5.5–8 拍留给整页阅读。

## 参数

| 参数 | 示例 | 调整原则 |
|---|---|---|
| 容器数 / 间隔 | 3 / 0.5 拍 | 数量增加时延长镜头，不压缩所有阶段 |
| 入场位移 | 170 px | 在安全区内完成预备与过冲 |
| 文字入场 | 0.5 拍淡入 | 标题先于小字；长句要加阅读时间 |
| 字号 / 内边距 | 64 / 38 px | `BOX.lines` 测量，避免手写每行位置 |

## 实现与依赖

[assemble.js](../projects/recipe-demo/scenes/assemble.js)＋[look.js](../projects/recipe-demo/lib/look.js)。用现有 `BOX.panel / BOX.lines` 处理布局与归属，`ease.outBack` 处理落位；这是本库新写的最小配方。布局基础参见 [kit-demo/board.js](../projects/kit-demo/scenes/board.js)。

## 音乐绑定

让结构在乐句前半建立，重要标题落在目标词或重拍，剩余信息进入后半。若文字就是歌词，替换示例淡入逻辑，按真实词开始时间高亮 / 出现；不能提前用全亮显示尚未唱到的词。每阶段对应 `reads`，主要信息进入时切换焦点。

## 验收与失败条件

```sh
uv run tools/render.py projects/recipe-demo pilot --from 8 --to 12
uv run tools/render.py projects/recipe-demo qa --from 8 --to 12
```

先看得懂结构，再看到信息；最后一块必须有停留。不要把过冲用在文字仍在剧烈移动的长段落上。换成最长文案后再验收，检查字出框、容器撞车、文字半透明时可读性；隐藏文字应不绘制，而不是仅设为透明。
