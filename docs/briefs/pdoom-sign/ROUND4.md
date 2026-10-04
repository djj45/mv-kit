在 /Users/djj45/code/mv/mv-kit 里改 projects/pdoom-sign（第四轮，最后的打磨），一轮做完，中间不要停下来问我。

用户看了第三轮导出的片子，指出四处：1:49 横着的字、0:52 的字、各处编号圆点里的数字不居中、1:20 黑色 OBSOLETE 压在黑色的机器上。这几处 qa 当时量不到，现在框架加了两条检查，全片又找出同一类的几处。这一轮就修这一类：**字和同色的东西贴在一起**。规矩同前：偏离写进 projects/pdoom-sign/TREATMENT.md 的改动记录；不要改 engine/、kits/、tools/、docs/。

## 0. 先读，再跑基线

- docs/ENGINE.md「qa」表里 `lyric-touch`、`text-touch` 两行；「风格包」layout.js 里新加的 `BOX.center`
- CLAUDE.md「代码规则」里"字和同色的东西之间要留空"那一条
- `uv run tools/render.py projects/pdoom-sign qa`，记下基线（应该有 6 条 `lyric-touch`、6 条 `text-touch`）

## 1. 用户指出的四处

| 时间 · 镜头 | 现在 | 要求 |
|---|---|---|
| 各处 step 的编号圆点（04 servant、21 checklist、22 layers……） | 数字用 `textAlign 'center'` + `textBaseline 'middle'` 画，居中的是字框不是字形；mono 字的字距还把它往左推 | lib/words.js `T.step` 里画数字那四行换成 `BOX.center(g, String(i + 1), x0 + R, base - size * 0.34, { size: R * 1.05, font: (gg, sz) => SG.mono(gg, sz, true), color: o.stepColor \|\| (col === SG.C.ink ? SG.C.paper : SG.C.ink) })`。全片其他"圆里 / 方块里的单个字"（刻度盘数字、牌子上的编号）也查一遍，凡是靠 `'middle'` 居中的都换成 `BOX.center` |
| 1:49 · 30 ortho | 「Orthogonality」站在横轴上，g、y 的下伸部分陷进轴线；「thesis blues」贴着竖轴 | 字和轴之间留空：墨迹（含下伸部分）离轴线 ≥ 0.12 个字高。"骑在轴上"的意思保留——字在轴的上方 / 左侧紧挨着，但不碰 |
| 0:52 · 14 atoms | 「atoms」和黄底的「rearranging」之间没有空隙：黄块的内边距（0.14 × 字号）吃掉了词间空格；地平线断开后在字两边剩下两小截，像破折号 | 第二个 `WD.line` 的 x 再加上黄块的内边距，让「atoms」到黄块左边缘正好一个空格宽（整句居中时把它算进总宽）。地平线：小人和地平线整体上移，让线不用断开就离歌词墨迹 ≥ 48 px；不要留短于 300 px 的线头 |
| 1:20 · 23 obsolete | 黑色的 OBSOLETE 印章压在黑色的机器上，两者糊在一起（`text-touch` 28 %） | 换颜色：`SG.stamp` 加 `o.fill`（先填底色，再描边、写字），obsolete 用 `{ fill: SG.C.yellow }`——黄底黑字的印章贴在机器上，和全片"黄块垫关键词"是同一个语言 |

## 2. qa 新找出的同类问题

| 镜头 | qa | 现在 | 要求 |
|---|---|---|---|
| 09 mask | lyric-touch 12 % | 「the」后面紧贴一根涂黑条 | 条和字之间留一个空格宽 |
| 11 stable | lyric-touch 8 % | 笔写出来的「training」坐在心电线上 | 字整体抬高，离线 ≥ 0.12 字高 |
| 17 basilisk | lyric-touch 18 % | 冲击环从「the」中间穿过 | 冲击环画在歌词后面并在歌词那一带断开，或者环的半径避开歌词行 |
| 22 layers | lyric-touch 14 %、text-touch 32 % | 层板的边线压在「MLP,」上沿；后一块板压住前一块板的「LAYER 0x」标签 | 歌词往下挪开层板；每块板的标签放在它露出来的那一条里（或者板之间错开得更多） |
| 19 omega | text-touch 55 % | 禁令斜杠和 Ω 都是墨色，交叉的地方糊成一团，Ω 认不出 | `SG.noSign` 的斜杠下面先画一道 2 倍宽的纸色描边（镂空），斜杠和符号之间就有一道白缝。32 disobey 的圈和斜杠是自己画的，照同样的办法加镂空 |
| 36 hook（第四次副歌） | text-touch 55 % | 刻度盘右下的「1」掉进了警戒条纹里 | 刻度数字整圈往表盘里收，或者条纹带让开数字 |
| 39 ilya | lyric-touch 22 % | 推到底时门框的上沿横穿「What did Ilya see?」 | 屏幕层上这句后面垫一条墨色（`SG.C.ink`，就是底色）的条，四边留 0.25 字高：黑底上看不见这条，门框看起来是从字后面过去的（这是 §6"歌词不加衬底"的例外，写进改动记录）；或者门整体下移让推到底也碰不到这句 |

**两处可以保留**（写进 §11）：16 hook 的「.6」——指针扫过刻度数字的那一瞬（只有一帧在动中被量到）；38 masked 第一帧的「From」——涂黑条正在滑开（`redact` 的揭开动画）。

## 3. 收尾

1. `check`：只剩 moon 那条 linetail。
2. `qa` 整片：0 错误；`lyric-touch` 0；`text-touch` 只剩上面两处保留的；其他警告逐条处理。
3. `uv run tools/render.py projects/pdoom-sign stills --t 15.0,52.0,80.6,109.3,136.5`，用 read_image 打开逐张看这几处。

## 交付时告诉我

- qa：基线和现在，按类别
- 上面每一条怎么改的（一句话）
- 偏离施工图的地方
