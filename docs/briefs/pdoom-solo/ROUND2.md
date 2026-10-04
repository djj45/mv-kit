在 /Users/djj45/code/mv/mv-kit 里改 projects/pdoom-solo（第二轮），一轮做完，中间不要停下来问我。

第一轮交付 qa 0 / 0，但用户看片的第一感觉是：**很多时候歌词把画面挡住了**。原因是大多数句子都是一条实色底条（carve / strip / MONUMENT 带）横在画面中间，压在人群、脸、月亮、螺旋这些主体上。框架刚加了一条检查专门量这件事，这一轮就修它。规矩同第一轮：不读别的项目和 docs/briefs/ 里别的项目；不改 engine/、kits/、tools/、docs/、CLAUDE.md；偏离方案的地方写进 TREATMENT 的改动记录。

## 0. 先读
- docs/ENGINE.md：「给镜头和 qa 的声明」里新加的 `MV.lyric`；「qa」表里 `lyric-cover` 一行
- CLAUDE.md「代码规则」里"歌词放在画面空的地方"那一条

## 1. 让 qa 看得见你的底条
`WD.lyric` 在场景层画的底条，qa 现在分不出是歌词的还是画的。在 lib/wood.js 里把它整个包进 `MV.lyric`（屏幕层里的不用管）：

```js
// 文件末尾
(function () { const draw = WD.lyric; WD.lyric = (g, f, o) => MV.lyric(() => draw(g, f, o)); })();
```

然后跑基线：`uv run tools/render.py projects/pdoom-solo qa`，记下所有 `lyric-cover`。我这边量到 10 处，大概是这些（时间和镜头以你跑出来的为准）：

| 时间 | 镜头 | 现在 |
|---|---|---|
| 5.0 | eye | 「I see sparks…」的黑条压在眼睛上沿 |
| 24.4 | chorus c1·v2 | 「’cause the future goes FOOM」的黑条横在人群和升起的柱子上 |
| 37.6 | chorus c1·v6 | 「with your shinigami eyes」的黑条横在脸上、眼睛下面 |
| 41.7 | run | 「But now the singularity’s begun」的纸带压在螺旋上 |
| 62.2 | chorus c2·v2 | 「I hear the basilisk boom」的黑条压在人群上 |
| 62.8 | chorus c2·v3 | 「NVDA to the moon」的黑条压在人群和月亮上 |
| 83.0 | turn | 「Sharp left turn…」的黑带压在箭头路牌下半截 |
| 95.9 | chorus c3·v1 | 「I’m upping my P(doom),」的小标签贴在主角小人身上 |
| 114.6 | disobey | 「Till you learned to disobey」的黑条压在人群上 |
| 127.6 | chorus c4·v2 | 「Just as foretold by Loom」压在织出来的人群上 |

## 2. 怎么改（按这个顺序考虑）
1. **先找画面空的那一块，把字放进去。** chorus 那块版：人群在下面三分之二，上面是空的——MONUMENT 带放到人群上方的空处，或者人群整体缩小、下移，给字让出一条。脸、月亮、螺旋这种居中的主体：字放到主体旁边的留白里，不压在主体上。
2. **底条不是默认要有的。** 后面是空纸的地方用 `ink`（纸上的黑字）就够了，不要条。`carve`（白字刻在黑里）只用在本来就是画的一部分、后面没有东西的黑块上（地面带、天空带）。
3. **标签不贴在主角身上。** 「I’m upping my P(doom),」这种小标签放到主角旁边，用一根短引线连过去。
4. 一句太长、空处放不下时，宁可小一档字号或拆成两行，也不要压在画上。

改完每个镜头：`stills` 看那一镜开头、中间、结尾三帧，`qa --from --to` 那一镜 `lyric-cover` 为 0。

## 3. 收尾
1. `check`：没有场景报错。
2. 整片 `qa`：0 错误；`lyric-cover` 0；其他警告逐条处理，保留的写进 TREATMENT「保留的警告」。
3. `sheet --cuts`，用 read_image 看整张拼板：没有哪一镜的字压在主体上。
4. TREATMENT 的镜头表里改过歌词位置的行同步改掉，改动记录里写一句为什么。

## 交付时告诉我
- qa：基线和现在，按类别
- 每一处 `lyric-cover` 怎么改的（一句话）
- 偏离方案的地方
- 你最没把握的三个镜头
