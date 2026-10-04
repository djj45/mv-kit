在 /Users/djj45/code/mv/mv-kit 里改 projects/pdoom-sign（第二轮），一轮做完，中间不要停下来问我。

第一轮交付的 qa 是 0 / 0，但当时的 qa 有两样东西没量：**每个镜头的第一帧**，和**切点之前已经唱完的句子有没有被新镜头又画一遍**。框架已经补上了这两条检查，还加了三样东西（就是你交付时要的那三件）。现在跑 qa 会看到 1 个错误、约 29 条警告，其中二十多条是同一个毛病：上一镜的最后一句，换上新镜头的样式，在新镜头开头闪几帧。根源在施工图 §7.2 `WD.current` 那条规则（是施工图写错了，不是你实现错了），docs/briefs/pdoom-sign/TREATMENT.md 已经改正（§7.2 和 §8 开头一段），把这两处同步到 projects/pdoom-sign/TREATMENT.md。

还是那几条：照施工图做，偏离的先写进 projects/pdoom-sign/TREATMENT.md 末尾的「改动记录」；不要改 engine/、kits/、tools/、docs/（需要框架加功能就在交付时告诉我）。

## 0. 先读（用 read 读全文那几段，不要只 grep）

1. docs/ENGINE.md：「屏幕层：MV.overlay」「时间线」里 `cut(q, nth, { hold })` 和 lint 的 `cuttail`、「歌词」里 `lyrics.lineAt(f.t, f.from)`、「qa」表里 `lyric-covered / lyric-carryover / lyric-overlap / box-clash` 四行
2. CLAUDE.md「代码规则」里「歌词跨切点」「歌词放哪一层」两条
3. projects/kit-demo/scenes/sheet.js 和 timeline.js（歌词放屏幕层、insert 推 70 % 的写法）
4. docs/briefs/pdoom-sign/TREATMENT.md §7.2 的 `WD.current` 和 §8 开头一段（`cutHold`）

然后跑一遍基线，记下来（交付时要对比）：
```sh
uv run tools/render.py projects/pdoom-sign check
uv run tools/render.py projects/pdoom-sign qa
```

## 1. 歌词跨切点（改 lib/words.js 的 `WD.current`，一处改完全片生效）

规则：一句只有在切点之后**还有词要唱**时才带进新镜头；切点之前已经唱完的，新镜头不再画，先空着，等自己那一句开始。一句唱完以后照旧保持到下一句开始或镜头结束。整个函数换成：

```js
  current(f) {
    const lines = MV.lyrics.lines.filter(l => l.words.length);
    let cur = null;
    for (const l of lines) if (l.start <= f.t) cur = l;
    // a line crosses into this shot only while it still has words to sing (cut mid-line); one sung out before the cut
    // is not drawn again here — the shot shows nothing until its own line starts (qa: lyric-carryover)
    if (!cur || cur.words[cur.words.length - 1].start < f.from - 1e-6) return null;
    return { line: cur, i: cur.i };
  },
```

场景里凡是自己取"当前句"的地方（`init` 里 `MV.lyrics.get(…)` 固定一句的不算），也按这条规则改。改完跑 qa：`lyric-carryover` 应该一条都没有。

## 2. 切点（timeline.js + project.js）

- `project.js` 加 `"cutHold": 0.2`（和 `"lint"` 平级）。
- `timeline.js` 删掉 `tailCut` 和 `nextBeat`，`C02 … C40` 直接写 `cut('…', n)`。`cut` 现在自己处理"上一句末字离那一拍太近"：它把切点挪到这一句的第一个词上，而不是推到下一拍（推到下一拍会让下一句的头一个词落进上一个镜头——第一轮 moon 镜头里那个离边 51 px 的 'The'，exit / fuse 开头的 'Killswitch'、'Too' 就是这么来的）。
- `check`：不能有 `cuttail`；`linetail "moon"` 那条照旧留在 §11，理由不变。
- 因为切点变了，`insert` 里用 `C11 - 1.2` 这种相对切点的时间要跟着看一眼。

## 3. 逐镜要修的

| 镜头 | 问题（qa / 看图） | 要求 |
|---|---|---|
| 40 show | 第一帧整幅空纸，`MV.focus` 报在 (453, −409)：qa 的 **focus-out 错误**。原因：第一个词唱到之前 `wall` 没有"正在唱的那一行"，墙按全高居中，第一行在画面上方很远 | `T.wall` 里滚动定位用 `Math.max(active, 0)` 那一行（第一个词之前就按第一行定位）；第一个词之前先画第一行的**空黄块**（宽 = 第一个词的宽），词在它的 start 盖上去。focus 报在这块上。第一帧不能是空纸 |
| 04 servant | 歌词 step 的两行压在两块牌子的下边框上（qa `box-clash`：'now' 被 servant plate 的边切过 117 px，'servant' 被 boss plate 切过 159 px） | 歌词一个字都不压牌子的边。牌子整体上移、放大到占满画面上方三分之二（现在右边 40 % 是空纸）：两块牌子左右分开铺满宽度，底边 ≤ 歌词第一行墨迹顶 − 48 px。servant 段 `box-clash` 必须为 0 |
| 31 stack | 引号重复：左上是装饰的 `"` 加上歌词自带的 `“`，第二行位置还漂着一个孤零零的 `”` | 只留歌词自己的引号；场景不再另画引号。`”` 只能跟在 'way!' 后面出现 |
| 33 fence | 密方阵用 ink2 小格子，整块读成灰色网点；歌词压在网点上面 | 方阵用 ink（实心墨块），格子大一些、少一些（不超过 16 × 8），格与格之间留纸白；歌词不压在方阵上，放到方阵下方的空纸里或一条纸带上 |
| 07 foom | qa `lyric-faint`：''cause' 只显示 68 % | 打开 out/qa 里的截图看是什么盖住了它，改成歌词画在爆炸之后（或放进屏幕层） |

## 4. 歌词进屏幕层，insert 推到位（你交付时要的第 1 件事）

`MV.overlay(o => …)` 里画的东西在镜头之后画，push / insert / warp 都动不到它；歌词放进去以后 `MV.keep` 不再需要，`insert` 也不再被歌词的 keep 框钳到 1–6 %。

- 哪些歌词放进屏幕层：**zone 歌词**（`zone: 'top' | 'mid' | 'low'` 或固定 x / y 的 `stamp / step / redact / write / count / wall`），而且这个场景**没有用到 `WD.line` 的返回值**。写法：`MV.overlay(o => WD.line(o, f, { … }))`。
- 哪些留在场景里：印在物体上的（`sign` 的牌子、`label` 的引线、`tape` 的胶带、挂在水平仪上的牌子），以及用到返回值的（show 的 `r.top` 之类）。它们本来就该跟着画面动。
- timeline 里 `insert` 的 `amt` 本来就是施工图 §8 的数，不用改：第一轮推不到，是 camera 在运行时被歌词的 keep 框钳住了；歌词进了屏幕层，这些数才真正生效。画面上如果还有别的 `MV.keep`（场景层的牌子、标签），推进照样会被它们限制——那是对的，别为了推得狠把它们的 keep 删掉。
- 38 masked：按施工图 §8 在 timeline 上加 `insert: { at: 'recursive' 的 start, dur: 1.6, amt: 0.8 }`，去掉场景自己那个 1.45× 放大。
- 屏幕层的字底下世界在动：推近时机器、牌子会被推到字底下，墨色压墨色就看不见（我在 cover 上试过：推 35 % 以后 'of' 的 f 落在机器的黑框上）。每一处都要处理：给这句垫一条纸色底（`SG.C.paper` 的色块，四边留 0.25 em），或者让被跟的主体推近时离开歌词区（insert 的 `x / y` 指到别处、主体挪位）。qa 的 `lyric-covered` 会报这种情况。
- 每改一镜：`uv run tools/render.py projects/pdoom-sign strip --t <insert 的 at> --dur <insert 的 dur + 0.4>`，用 read_image 看推进是不是真的推到了、被跟的东西是不是待在原地、字有没有被推上来的东西压住；`qa --from --to` 那一镜：0 错误。

## 5. 收尾

1. `check`：没有场景报错；时间线提示只剩 moon 那条 linetail。
2. `qa`（整片跑，type 统计只在整片时判）：0 错误；`lyric-carryover`、`lyric-overlap`、`lyric-covered`、`box-clash` 都是 0；其他警告逐条处理，保留的写进 TREATMENT §11。
3. `sheet --cuts`，用 read_image 看**每一镜的第一列**（镜头开头那一帧）：不能有上一镜的句子，不能是空画面。
4. TREATMENT §12 改动记录补上这一轮的改动。

## 交付时告诉我

- qa：基线（第 0 步记下的）和现在的错误数、警告数，按类别列；保留了哪些警告、为什么
- 14 处 insert（加上 masked）在 strip 里看是不是推到位了；哪几处看着还是被限制、被什么限制
- 哪些场景的歌词进了屏幕层，哪些留在场景里、为什么
- 偏离施工图的地方
- 你最没把握的三个镜头
