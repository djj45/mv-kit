# transition-demo — 样张：引擎自带的转场

不是 MV（没有歌），16 秒，按 120 bpm 的网格写秒数。每个转场都写明了跨过切点的是什么（见 `timeline.js`）。

- 0–4 s `room`：墙上一扇圆窗，桌上一只写着「瓷」的梅瓶，镜头慢慢推近。
- **`zoom`（推进）**，落在 4 s：圆窗就是月亮。窗里先透出夜空和月亮，然后整个房间化进夜色（`match: ['window', 'moon'], shape: 'round'`）。
- 4–8 s `moon`：月亮和流云。
- **`pan`（平移）**，8 s 起：夜 → 晨，时间往右。一只鸟用 `carry` 跨过接缝。
- 8–11 s `shore`：远山、海浪、小船。
- **`reflow`（颗粒重组）**，11 s 起：浪的线条拆成墨点，重组成「瓷」。
- 11–14 s `glyph`：一个大字。
- **`zoom`（拉出）**，落在 14 s：这个字就是瓶上那个字（`match: ['char', 'mark'], blend: 'darken'`）。

场景用 `anchors(f)` 给出窗、月亮、字、瓶上字的位置（算上镜头推近），转场跟着它们走。

```sh
open projects/transition-demo/index.html
uv run tools/render.py projects/transition-demo strip --t 3.1 --dur 1.4 --step 0.1   # 推进
uv run tools/render.py projects/transition-demo --samples 4                           # 带运动模糊导出
```

用法见 `docs/ENGINE.md` 的"转场"一节。
