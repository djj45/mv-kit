# act-demo — 表演、reads 和角色定型图的样张

三个短镜头（P(doom) 的前 17 秒，和 kit-demo 同一段），每种用法一处。角色 Pip 是原创的（`lib/pip.js`：芥末黄的软糖身体、两个小短手、两只脚、一根芽），只用 Canvas 2D 画，一次读得完。它的一切动作都来自 `kits/act.js` 的姿态。

| 镜头 | 演示 |
|---|---|
| `wake` | `ACT.emotions` 演出来的情绪变化（sleepy → surprised → starstruck：眯眼预备、在眯眼下换脸、take、回弹落定），`ACT.jump` 在拍上起跳和落地，眼睛先跟着火花动（`lookX / lookY`），火花沿 `ACT.arc` 跳走 |
| `chase` | `ACT.walk` 侧面小跑，`ACT.turn` 一张张换画好的视角转向镜头，火花掉下去之后才 take（先因后果），`ACT.poses` 停住、再快速探身 |
| `boss` | 三个 Pip 依次鞠躬（`ACT.poses` + 每个人的延迟），再跳舞，各自略微错拍（`ACT.vary`：群体整齐划一看起来是复制的） |

`timeline.js` 给每个镜头写了 `reads`（观众依次要看懂什么、眼睛该在哪个 `MV.focus`）；场景在每条 read 开始时最后报它的 focus。`check` 量 reads 的时间，`qa` 量眼睛到没到（`read-unled`）和有没有快慢（`one-speed`）。

```sh
uv run tools/render.py projects/act-demo model        # Pip 的定型图 → out/model-pip.png（各视角头顶 / 眼线对齐，表情，跳、take、走）
uv run tools/render.py projects/act-demo check        # reads 的时间
uv run tools/render.py projects/act-demo qa           # 0 错误 0 警告
uv run tools/render.py projects/act-demo strip --t 2.58 --dur 0.66 --step 0.083   # 一次演出来的情绪变化，逐帧
open projects/act-demo/index.html?model=pip           # 预览里看定型图
```

音频和数据跟 kit-demo 一样：`../../../pdoom-video/audio/pdoom.mp3`，节拍和逐词歌词读 `../anime-pdoom/data/`。

`kits/act.js` 改编自 [Claude Animation Base](https://github.com/JohnHeibel/ClaudeAnimationBase)（MIT，© 2026 John Heibel），节拍换成了 mv-kit 的真实拍网格。
