# pigment-demo — 样张：kits/pigment.js

不是 MV（没有歌），是颜料合成层的示范和样张。

- `swatch`（0–4 s）：三种预设并排：水墨 / 宣纸（`ink`）、生料 / 素胚（`raw`）、青花 / 釉面（`cobalt`）。每栏一组自己的图层：色阶的浓度块（看积边）、勾线 + 分水的花叶（`lib/motif.js`）、一道干笔、两团墨晕，以及允许的一点真颜色（朱砂印、釉里红）。
- `fill`（4–10 s）："滴水分开"：先勾线，再从每片花瓣根部把分水铺开；左边入窑前（`raw`），右边烧成后（`cobalt`）。

```sh
open projects/pigment-demo/index.html
uv run tools/render.py projects/pigment-demo sheet --n 6
```

用法见 `docs/ENGINE.md` 的 pigment.js 一节。
