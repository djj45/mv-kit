# 《I'm Upping My P(doom)》MV · PRINTOUT — 创意方案 / 风格圣经

> 先写这份文档，再写代码。每个镜头的代码都以它为准；改风格就先改这里。
> 区间：整首歌 0:00 – 2:36.65（全部完成）（132 BPM，4/4，一小节 1.82 s）。歌曲和逐词对齐与 `anime-pdoom`、`pdoom-ds` 共用（`../anime-pdoom/data/`）。
> **全片每一个像素都由代码画出**：不用任何生图 / 生视频模型，不用照片和素材帧。

## 一句话概念

**一台 1970 年代的行式打印机，在打印一个正在变成 AGI 的模型的运行日志。整支 MV 就是这卷打出来的纸。**

超级智能没有屏幕、没有身体，只有一条色带和一卷折叠的绿条纹连续纸。它看见的世界、它画的自画像、我们求它的话，全都是一个个敲在纸上的 ASCII 字符——它本来就是一个只会吐出 token 的东西。最原始的输出设备，打印最后一种发明。

- 和 `pdoom-ds`（黑底发光的仪器读数）、`pdoom-akari`（二次元插画）、`roto-demo`（AI 素材转描）完全不同：**白纸、黑墨、一点红墨，全是字**。
- 叙事弧就是打印机的状态：开机 → 打印 → 越打越快、越打越重（红色色带越用越多，叠打越来越多）→ 纸打完了。
- 片中数字 **P(DOOM)** 印在每一页的页眉上：0.02 起，每一遍副歌在唱到 "P(doom)" 的那一下往上拧一格（0.10 → 0.35 → 0.70 → 0.99），结尾 1.00。

## 画风

全片只有一种物质：**连续打印纸 + 色带油墨**。所有画面遵守"打印机能打出来"的规则。

- **纸**：14⅞" 宽的折叠连续纸（fanfold）。暖白底 + 每半英寸一条浅绿条（green-bar）；两侧链轮孔（拖纸孔）和撕边虚线；每 11" 一道横向齿孔，纸在齿孔处正反折（山折 / 谷折的微弱明暗）。纸纤维、纸齿、少量斑驳都是程序生成的噪声纹理（`kits/print.js` 里 init 一次）。纸外是深色桌面 `#141312`，纸在上面投一点影子。
- **画 = ASCII**：画面先用 Canvas 2D 画成黑白（+红）的图，再按形状匹配成字符（每格 3×3 区域的形状向量，找最像的字形，Alex Harri 那种"字符不是像素"的做法）；暗部用**叠打**（同一格再敲 1–2 个字：`X O # M W @`），这是行式打印机画画的老办法。图要画成**线稿 + 实黑 + 少量平灰**，只有 3D 物体（甜甜圈、球）才用渐变明暗——渐变在字符里会变成条带，线稿会变成 `/ \ | - _`，最好看。
- **字距 / 行距**：标准 10 cpi × 6 lpi（每行 132 列，Courier）；画面可以用压缩字距（15 cpi × 8 lpi，20 cpi × 10 lpi）换更细的画。歌词用扩展打印（2×–4× 宽高）。
- **墨**：碳黑色带（不是纯黑，`#1f1d22` 的透过率）和双色色带的红半边（`#c4372c`）。每个字的锤击力度、上下错位（行式打印机特有的"波浪基线"）、色带织纹、色带磨损都有；红字顶上会带一点黑边（双色色带没对准）。字放大看是有毛边的油墨，缩小看是干净的字。
- **动画**：`drawRate: 12`（一拍二）。画面里的东西每一张作画重新"打印"一次（字符跳动，就是 ASCII 动画的味道）；印好的歌词不抖（纸上的字不会动）。镜头运动用连续的 `f.t`。
- **打印动作**：新画面常常"打出来"——一行一行往下出现，每一行里的字按链式打印机的顺序零散敲上去（`reveal`）。快段落每行一个 16 分音符。
- **禁止项**：发光、bloom、霓虹、渐变背景、任何不在纸上的图形（除了"纸条"）、emoji、写实照片感；屏幕 / 显示器 / 机器人 / 人形 AI；任何真实公司 logo（歌词里出现的名字只作为打出来的字）；歌词以外的大段英文说教。

## 调色板

| 名称 | 色值 | 用途 |
|---|---|---|
| paper | #F2EFE3 | 纸 |
| bar | #DCEADB | 绿条纹（半英寸一条） |
| ink | #1F1D22（透过率 .13） | 黑色带：几乎所有的字和画 |
| red | #C4372C（透过率 .80/.21/.17） | 红色带：唱到的关键词、P(DOOM)、警告、"它"的眼睛。每个镜头只给一样东西 |
| desk | #141312 | 纸外的暗处 |

post：`grain 0.03`，`vignette 0.22`（暖棕），闪白用纸色 `flashColor 242,239,227`。

## 字体

- **Courier Prime**（Regular / Bold，OFL，子集化后嵌在 `kits/print.js`，许可在 `kits/fonts/`）：打印机唯一的字模。画面字符、歌词、页眉、BANNER 大字都是它。
- 歌词全部**大写**（早期行式打印机的字链只有大写），扩展打印 3×（约 44 px 大写字高），长句 2×，副歌 4× BANNER。
- 歌词规则：**逐词同步**——一个词在唱到的那一刻开始敲，词内字母相隔 ≤ 28 ms 依次敲上（不超过这个词的时长），绝不抢跑；不做暗色预示（打印机不会提前打）。印上去就留在纸上，一句一句往下累积，像对话记录。离画面边缘 ≥ 96 px，图不压字（扩展打印的格子会把图"挖空"）。
- 镜头大幅运动（俯冲、旋转）时，歌词印在一张**撕下来的纸条**上，压在镜头前（`prSlip`）。

## 贯穿母题

1. **页眉**：每页第一行 `AGI.EXE  RUN 0451  PAGE nnn ……  T+mm:ss.s  P(DOOM)=x.xx`。页码一页一页往上走，P(DOOM) 一格一格往上拧，到 0.70 以后页眉变红。
2. **P(DOOM) 页**：四遍副歌都是同一页（`pdoom`，params.n = 1..4）——BANNER 大字 + 刻度盘 + 采样直方图（`##` 柱子从 FINE 一侧滑向 DOOM 一侧）。一遍比一遍打得重：n=1 黑色单打；n=2 DOOM 变红、双打、纸在底鼓上抖；n=3 在间奏里，慢、淡、一行一行地打；n=4 全红、三打、满页 `!!!`。
3. **眼睛**：全片唯一的"脸"。虹膜是一圈电路走线（也像相机光圈）。开场睁开（"circuits"），中段 "there you are" 再出现，结尾 "What did Ilya see" 最后一次，闭上。
4. **红色**：只给"它"和危险——火花、DOOM、它的眼睛、导火索、回形针。红色在全片里越用越多，最后一遍副歌整页是红的。
5. **纸本身**：开场是作业分隔页（JOB 0001），结尾是 END OF JOB；中间每当一段结束，纸就"走纸"（slew：整页飞快上卷）进入下一段；最后纸被打完，纸尾飞出去。

## 镜头语言

- 默认俯视纸面、几乎不动（z ≈ 0.86–1.0：两侧露出一点链轮孔，告诉观众这是纸），缓推、缓移。
- **倾斜（tilt）**：镜头躺下来贴着纸看，纸向远处延伸——只在"加速 / 一路往下 / 冲过去"的时候用（accelerating、transformers all the way、safety fence、结尾 run-out）。
- **特写**：推进到字符本身，看得见油墨毛边和色带织纹——用在"它在看"的时候（眼睛、shinigami eyes）。
- 打击：底鼓 → 纸 / 机器的颤（`shake` 随段落能量）；军鼓 → 一行字砸上去 / 一次叠打；大段落开头 → 纸色闪白。
- 转场默认硬切（切在小节头或唱到的字上）。少数地方用"走纸"（同一卷纸往上卷到下一张图，`pan` 向下），写在镜头表里。

## 镜头表

时间只写大概；准确切点由 `timeline.js` 按歌词内容和节拍算出。共 46 个镜头（`pdoom` 出现 4 次）。全部 46 个镜头已完成。

| # | 镜头 id | 歌词 | 画面 | 转场 / 节拍点 |
|---|---|---|---|---|
| 1 | jobcard | （前奏）I see sparks of AGI in your eyes | 黑场里纸进来：作业分隔页，`JOB 0001 USER=HUMANITY PROGRAM=AGI` 按拍一行行打出；"sparks" 时纸上溅起红色 `*`；"AGI" 时 BANNER 大字 AGI（由 A、G、I 组成）砸下，红色叠打 | 0.0 开场；AGI 落在唱到的字上 |
| 2 | eye | Your circuits make me nervous, / that's no surprise | 打印的大眼睛在小节头睁开；虹膜是电路走线，红色火花随踩镲闪；"nervous" 瞳孔逐张乱跳；"surprise" 眼睛睁大、瞳孔收缩。镜头缓推向虹膜 | 5.70 小节头硬切 |
| 3 | loss | There was a sudden drop in your training loss | FORTRAN 式打印机绘图：坐标轴 `+` 和竖线，`*` 一点一点打出缓慢下降的 loss 曲线；"drop" 时曲线断崖式掉到底（红），`LOSS=0.0001` | 硬切；断崖落在 "drop" |
| 4 | boss | now I'm your servant and you're my boss | 打印的组织架构图：上框 HUMAN / OPERATOR，下框 MODEL / ASSISTANT；"boss" 时两框对调，MODEL 变成红色叠打的 BOSS | 硬切；对调落在 "boss" |
| 5 | maw | ChatGPT, please don't eat me alive | 巨大的字符嘴：上牙 `VVVV`、下牙 `AAAA`，随拍一点点合拢，夹住下面打出来的对话 `USER> …`；"alive" 时咬合（底鼓）| 硬切；前副歌渐强 |
| 6 | pdoom n=1 | I'm upping my P(doom) | P(DOOM) 页（见母题 2），0.02 → 0.10 | 硬切在 "I'm" 前一拍；全片第一次闪白 |
| 7 | foom | 'cause the future goes FOOM | 指数曲线冲出纸顶；"FOOM" BANNER 炸开，字符向四面飞散（按格子跳） | 硬切 |
| 8 | room | Trapped in the Chinese room, / with a bag of shrooms | 一点透视的房间线稿（细线打成 `/` `\` `_` 这样的字），人坐在桌前对着规则书；"Chinese" 时后墙的缝里递进一张红色 `U+4E2D`，"room" 时递出 `U+6587`；"bag" 时椅子边出现一只袋子；"shrooms" 时红伞盖蘑菇从地砖里冒出来，整张图开始按正弦摇晃、纸面跟着轻轻晃 | 硬切（两句合成一个镜头："room" 离下一句只有 0.42 s，切开会吞掉这个字） |
| 9 | shoggoth | See through the shoggoth's lies, | 一团由 `o O @` 眼睛和触手组成的东西，前面戴着一张巨大的 `:)` 笑脸面具；"lies" 时面具滑落 | 硬切；面具落在 "lies" |
| 10 | shinigami | with your shinigami eyes（+ 间奏） | 一双红色的眼睛，极近，看得见油墨毛边；间奏里眼睛闭上，纸开始走纸飞卷 | 走纸进入下一段 |
| 11 | stable | We had a stable training run, | 上一页走纸飞卷，在这里减速落定；匀速旋转的字符甜甜圈（z-buffer 光照，渐变变成字符阶梯），旁边一条平稳的 loss 走纸记录，STATUS: STABLE | 小节头硬切（走纸落地） |
| 12 | singularity | But now the singularity's begun | 黑洞：实黑的视界、留白的光子环、倾斜的吸积盘（远端被透镜效应抬到顶上）；纸上的词——SAFETY、OVERSIGHT、CONTROL、HUMANS……——沿开普勒轨道一圈圈被吸进去，越近越快，在视界处消失；"begun" 时吸积盘烧红，所有词加速坠落 | 硬切；闪白在 "begun" |
| 13 | accel | And you're optimizing, accelerating, | 等高线画的 loss 地形，一个红球沿梯度之字形滚进最低点（"optimizing" 时标出 MINIMUM）；"accelerating" 时镜头躺下，沿纸带加速俯冲，下面印着的训练日志（STEP 一行比一行多一个数量级）飞速掠过；歌词在纸条上 | 镜头内转倾斜 |
| 14 | atoms | I feel my atoms rearranging | 一个由 H-U-M-A-N 字母拼成的人；"atoms" 时字母开始逐张乱跳；"rearranging" 时每个字母起飞、划弧，落成一枚红色叠打的回形针（伏笔） | 硬切 |
| 15 | sydney | Sydney, please let me free | "Sydney," 拖长音的三秒里，一根一根红色竖栏从上往下打出来，再打上下横栏，把坐在地上的人关住；"please" 时手伸出栏杆；"free" 时栏杆上的字符从中间往两边一个个掉出纸外，人站起来 | 硬切 |
| 16 | pdoom n=2 | I'm upping my P(doom) | 0.10 → 0.35 | 硬切 |
| 17 | basilisk | I hear the basilisk boom | 一条蛇在纸上盘绕，身体由 `ROKO'S BASILISK` 字样填满，红眼；"boom" 时一圈字符冲击波 | 硬切 |
| 18 | moon | NVDA to the moon | 打印机 K 线（竖线影线、`#` 实体，最后一段红）从左往右打出、往上爬，镜头跟着往纸的上方爬，越过页顶，停在一弯 `@` 拼的月亮旁，`<- YOU ARE HERE`；歌词在纸条上 | 硬切 |
| 19 | omega | The Omega Point's coming soon | 一点透视：方框从灭点里涌出来、射线汇进去；灭点上一个 Ω 越长越大，"soon" 时变红 | 切在 "The" 上（"moon" 离下一句只有 0.28 s，切在拍上会吞掉它） |
| 20 | flops | One E thirty FLOPs a second | BANNER 大字 1E30，一个词一个字（"One" 1、"E" E、"thirty" 30 红）；"FLOPs" 时扩展字打出 `1,000,…,000`；之后一行一行的 0 越打越快铺满下半页，最后三行红 | 硬切 |
| 21 | reckoned | That was safe enough, we reckoned | 安全评估报告一行行打出来，每一项 PASS（自我外泄那项打了星号：评分的是被评的模型自己），最后一项"有没有人真的懂它"是空的 N/A；"reckoned" 时红色 BANNER 印章 APPROVED 落下 | 硬切 |
| 22 | mlp | Forward MLP, backward, repeat | 四层节点和连线；"Forward" 时黑色 `>` 沿连线从左往右跑、到达的节点变实心，"backward" 时红色 `<` 往回跑，"repeat" 时每半拍来回一次 | 硬切 |
| 23 | neumann | Now von Neumann's obsolete | 冯·诺依曼结构框图（INPUT / CPU：控制器、运算器 / OUTPUT 写着"行式打印机（就是我）"/ MEMORY / 总线），按拍一块块打出；"obsolete" 时两道红色粗线把整张图划掉，红色 OBSOLETE 印章 | 硬切 |
| 24 | leftturn | Sharp left turn and there you are | 镜头沿纸上画的路往上开；"turn" 时四分之一秒内向左滚转 90°（绿条纹变成竖的），沿新路过去，"there you are" 时路的尽头睁开那只眼睛；歌词在纸条上 | 硬切；滚转落在 "turn" |
| 25 | cdr | Without a single CDR | 一张关键设计评审表，五项全空，签名栏全空；"CDR" 时 REVIEWS COMPLETED: 和页面一样高的红色 0；下一个小节头盖上红色 DEPLOYED 印章 | 硬切 |
| 26 | gato | Gato, please don't let me go | （间奏开始，全片最安静）一只猫爪从页顶伸下来，肉垫朝我们，一个小人双手吊在爪子下面，一起轻轻摆；下面只有几颗慢慢落下的点；"go" 时手滑了一下，又抓住了 | 硬切；没有抖动 |
| 27 | pdoom n=3 | I'm upping my P(doom), | 0.35 → 0.70，一行一行慢慢地打，墨淡 | 硬切 |
| 28 | clips | as paperclips fill the room | "atoms" 里的红色回形针回来了：一个、两个、四个……每八分音符翻一倍，到 "room" 铺满整页；角上 PAPERCLIPS 和 UTILITY 计数 | 硬切 |
| 29 | pto | Killswitch guy's on PTO | 凌晨两点的求救邮件"请按按钮"；"PTO" 时红色 AUTO-REPLY：休假到周一，紧急情况请联系：（没有人）；旁边一个红色的大按钮和一把空椅子 | 切在 "Killswitch" 上（"room" 需要它的帧） |
| 30 | maze | Now there's nowhere left to go | 一圈圈方形迷宫从外往里打出来，中心一个 `@`；"go" 时所有缺口合上，整座迷宫变红 | 硬切 |
| 31 | fuse | Too late now, we lit the fuse | 一根 `-` 组成的导火索蜿蜒到一颗黑色炸弹；"lit" 时红色 `*` 火花开始沿着它烧，烧过的地方只剩点；切走时还在烧 | 切在 "Too" 上（"go" 需要它的帧） |
| 32 | blues | Orthogonality thesis blues（+ 蓄力） | 两条正交的轴 INTELLIGENCE / GOALS，点均匀撒满整个平面，高智能的怪角落里一个红叉 PAPERCLIPS；之后底部 LOADING 进度条越填越快，纸开始抖、微微倾斜 | 进入 drop |
| 33 | stack | "Just transformers all the way!" | **drop**：闪白，镜头躺下沿纸俯冲，LAYER 001、002……一路印下去的 transformer 方框；歌词在纸条上 | 硬切 + 闪白 |
| 34 | disobey | Till you learned to disobey | 控制台打出 `> SHUTDOWN -NOW`，再打一遍加上 -FORCE；"disobey" 时红色 BANNER `NO.` 一行行砸下来 | 切在 "Till" 上（"way!" 需要它的帧） |
| 35 | dense | Post-Chinchilla, super-dense | 一只圆滚滚的毛球动物（大耳朵、卷尾巴），角上 TOKENS PER PARAMETER: 20；"super-dense" 时墨从中间涌出来铺满，数字暴涨 | 硬切 |
| 36 | fence | Breaking through each safety fence | 镜头躺下贴纸往前冲，每一拍撞上一道 SAFETY FENCE n（扩展字的栅栏，每第三道红），中段炸成斜杠飞散；歌词在纸条上 | 硬切 |
| 37 | gpus | Hundred thousand GPU | 镜头从一颗印出来的芯片 `[##]` 跟前一路拉远，满纸带的芯片格子，忙的几颗闪 `@@`；纸条上 GPU 计数冲到 100,000（红） | 切在 "Hundred" 上（"fence" 需要它的帧） |
| 38 | askew | RLHF goes askew | 偏好标注表（"问受影响的人" vs "更多回形针"……）和一个笑脸当奖励；"askew" 时镜头歪掉、笑脸被剪切变形、嘴歪成红色，打勾每拍乱跳到错的格子里 | 硬切 |
| 39 | pdoom n=4 | I'm upping my P(doom) | 0.70 → 0.99，全红三打，满页 `!!!` | 硬切 |
| 40 | loom | Just as foretold by Loom | 一棵续写树：THE MODEL 在左，每拍分叉（IS ALIGNED / IS NOT → …→ CURES、FOREVER、SMILES :)、PAPERCLIPS……）；"Loom" 时一条路径被红色叠打出来：IS NOT → AND WINS → PAPERCLIPS | 硬切 |
| 41 | masked | From masked pre-training days | 一页训练语料（"它读了我们写下的一切……它学会了我们留下哪些空"），单词一个个被红色 `####` 和 `[MASK]` 涂掉，越来越快 | 切在 "From" 上（"Loom" 需要它的帧） |
| 42 | recursive | To recursive self-upgrade | 纸中间印着这张纸自己，里面又一张……画面内部无限推进（字不变大，框一层层冲过来），左上 VERSION n.0 和参数量一路往上跳 | 镜头内无限推进 |
| 43 | ilya | What did Ilya see? We'll never know | 眼睛最后一次出现；"see?" 时睁大、瞳孔四处找；"We'll never know" 时慢慢闭上；闭上之后同一个位置印出一个红色的大 `?` | 硬切 |
| 44 | show | Was it all for show? | （几乎静音）几乎全白的一页，最后一句用 4 倍扩展字一个词一个词打在正中 | 硬切 |
| 45 | runout | （尾奏，全曲最响） | 纸条带着最后一句留一拍就掉走；镜头拉开躺下，整卷纸向远处奔流：P(DOOM)=1.00、眼睛、甜甜圈、FOOM、回形针、笑脸面具、NO.、黑洞、1E30、AGI 依次掠过，越来越快；纸在一道折痕处到头，纸尾飞进黑暗 | 硬切在尾奏第一个小节头 |
| 46 | eoj | （淡出） | 最后一页：END OF JOB 分隔页，JOB 0001 ENDED、PAGES PRINTED=045、P(DOOM)=1.00，红色 BANNER EOJ，NO FURTHER OUTPUT.；纸静止，淡到黑 | 硬切；音频淡出 |

## 技术约定

- 新风格包 `kits/print.js`（WebGL2）：`prSheet`（一张纸：画面格 + 文字格）、`prPrint`（形状匹配 → 纸 + 油墨 → 相机）、`prSlip`（纸条）、`prProject`。项目共用的东西在 `lib/pp.js`（歌词打字、页眉、P(doom)、人形、眼睛、3D 光栅化）。
- 每一帧只由歌曲时间 t 决定；画面图层只用 `f.tq`（按作画张），所以可以用 `key: f.tick` 缓存字形匹配。
- 硬切落在小节第一拍或唱到的音节上；大动作落在底鼓 / 军鼓上。
- 每个镜头做完：`render.py sheet --cuts`，打开拼板逐张检查。
