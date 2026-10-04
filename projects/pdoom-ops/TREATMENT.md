# 《P(doom) — OPERATIONS》MV — 创意方案 / 风格圣经

> 一支纯代码绘制的 MV：lumen.js（发光数据 / 终端科幻）。全部画面由点云、细线、等宽字和泛光构成。

## 一句话概念

整支 MV 是一间 **AI 事故监控室（NOC）的遥测画面**：观众和值班员一起，看着一块 P(doom) 仪表从 2% 一路拨到 100% —— 训练损失骤降、组织架构翻转、指数爆炸、GPU 机柜无限延伸，每句歌词是监控墙上的一条告警。歌结束的时候，整个发光的世界熄灭，坍缩成一页**打印出来的事故报告**（lumen 的 paper 纸墨模式）：P(DOOM) 100%，STATUS: FOOM。

## 画风

- **一条规则：画面上没有"物体"，只有光。** 纯黑底，一切由发光的点和细线叠成：密处烧白、边缘保色、泛光晕开。形靠点云和线框；远近靠大小、亮度、景深（失焦点变成大而淡的光斑）；信息靠极小的等宽字。
- 线条：细（1–2 px）、亮，线框多、实心少；曲线（损失曲线、指数、股价）是主角之一。
- 阴影 / 光：没有阴影，只有亮度与泛光；最亮处（数字、火花、告警）烧成白。
- 质感：grain 0.03，色差（lmEnd ca）随调色板；无暗角（暗角由 lumen 自己的 lens 项做）。
- 动态节奏：drawRate 12（一拍二），点云 twinkle / drift 呼吸；镜头默认缓推（camera kit），关键镜头 insert 跟焦、warp 换语域；glitch（撕裂 + RGB 分离）只落在拍点和小节头。
- 字：全部等宽（JetBrains Mono / SF Mono 栈）。终端提示符 `>` 是"人"在片中的唯一声音。
- 禁止项：不用照片质感、不用大面积实心色块、不做星云粒子滥用（星尘只做远景）、歌词不加底条（黑底上光字自带对比）。

## 调色板（lumen 内置调色板 + 用途）

| 名称 | 色感 | 用在哪 |
|---|---|---|
| ice | 冰白 + 青 `#DCE8EE/#7AD7CF` | 冷实验室：boot、eye、circuits、drop、boss、room、run、atoms、omega、flops、mlp、neumann、fences、recurse、ilya |
| ember | 香槟白 + 琥珀 `#F3E5CF/#F2A44C` | 数据中心的热与火：foom、spike、nvda、reckoned、pto、gpus |
| rose | 品红紫 `#EFD9F2/#EA8FD0` | 亲密与荒诞：sydney 聊天、shoggoth 群眼、loom 命运织机、show 谢幕舞台 |
| alert | 警报红 `#FF3B30/#FF9E94` | 仪表与危机：gauge ×4、basilisk、fuse、rogue、rlhf、turn 的失控路径 |
| paper | 米白纸 + 墨 + 朱红 `#E9E7DF/#19191B/#C4532D` | 尾声 report：光变成纸上的墨，事故报告盖章 |

配色弧线：冷蓝（实验室）→ 琥珀（警告升温）→ 红（危机）→ 品红（荒诞/温柔）→ 冷蓝（事后）→ 纸（结案）。

## 字体

- 歌词：等宽 `LM_MONO`。三种形态，字号差 ≥ 4 倍：
  - **term**（主歌）：`> ` 提示符 + 整词打出（词在 start 时刻整词出现，不抢跑；块状光标跟拍闪），30–38 px，多在左下，也可左上 / 右下；
  - **cap**（过渡句）：居中逐词淡入微上浮，34–46 px，y 在画面上部 / 中部游移；
  - **big**（hook / 副歌）：整词砸入（scale 1.35→1 + 高亮），84–140 px，居中或中上；
  - **chat**（三段恳求）：歌词就是聊天窗口里逐词打出的消息（plea / sydney / gato）。
- 辅助：lmHud 角框 + 时间码读数（14–15 px dim 色）、lmTag 小标签、report 一页等宽表格。
- 歌词规则：逐词同步，词在 start 时出现，最多提前 0.3 s 以暗色预示；全部画在屏幕层（MV.overlay），字离边 ≥ 96 px；不加底条。

## 贯穿母题

1. **P(doom) 仪表**：弧形表盘 + 数字滚动 + 危险条纹。出现在四次 hook（12→21%、34→41%、66→72%、88→97%），最后在纸上定格 100%。它是主角。
2. **眼睛**：AGI 火花的点云眼睛（eye）→ 蛇怪之眼（basilisk）→ 修格玛斯的群眼（shoggoth）→ 尾声慢慢合上的那只眼（ilya，"What did Ilya see? We'll never know"）。看与被看。
3. **一条线**：训练损失骤降的曲线（drop）→ 弯上去的奇点（spike）→ 爆炸的指数（foom）→ 冲向月亮的股价（nvda）→ 命运织机织出的同一根线（loom）。整支片就是这根线先掉下去、再竖起来。
4. **终端提示符**：boot 的启动日志、三次恳求的聊天窗、结尾报告的打字机。`>` 是"人"的声音。

## 镜头表

切点全部由 `timeline.js` 按歌词和节拍算出（`cut / after / start / land`）；默认硬切，转场只用在有东西跨过切点的地方（glitch：信号撕裂着换一台监视器；理由逐条写在 timeline 注释里）。
运镜：缓推默认开；**insert**（推进 + 跟焦）≥ 6 处；**warp**（二维转三维）3 处；主体每帧报 `MV.focus`。

| 镜头（scene） | 歌词 | 画面 / 主角（MV.focus，占比） | 运镜 | 歌词 · 位置 · 字号 | 转场 / 节拍 |
|---|---|---|---|---|---|
| boot | （前奏 0–1.2 s） | 黑暗中星尘 + 启动日志逐行打出，`P ( D O O M )` 解码显出（10%） | 缓推 | 无 | 硬切进 eye（第一个唱词拍） |
| eye | I see sparks of AGI in your eyes | 点云巨眼，虹膜是星轨，唱到 "sparks/AGI" 时迸出火花（25%） | **insert** 跟虹膜 0.45 | cap · 中上 y≈300 · 40 | 硬切 |
| circuits | Your circuits… that's no surprise | 芯片线框电路，脉冲沿走线跑，"nervous" 时整片抖一下（20%） | 缓推 | term · 左下 · 34 | 硬切 |
| drop | There was a sudden drop in your training loss | 训练损失曲线：长而平的线突然跳水，坐标轴 + 读数（30%） | **insert** 跟坠落尖端 | cap · 上部 y≈260 · 44 | 硬切（"drop" 落拍） |
| boss | now I'm your servant and you're my boss | 组织架构图：人的节点从顶层滑到模型节点之下，箭头反转（35%） | **warp**：图表立起来转走 | term · 左下 · 36 | 硬切 |
| plea | ChatGPT, please don't eat me alive | 聊天窗口（**只有歌词的画面** 之一）：消息逐词打出，对方"正在输入…"，光标独闪（50%） | 缓推 | chat · 左中 y≈560 · 34 | **glitch** 撕进 gauge：警报等级切换 |
| gauge① | I'm upping my P(doom) | 仪表特写：12% → 21%，指针摆过第一道红刻度，危险条纹（45%） | 缓推 | big · 居中 y≈430 · 100 | 上行 glitch |
| foom | 'cause the future goes FOOM | 指数曲线竖直冲出画面，点云爆开，kick 上 glitch 撕裂（60%） | 缓推 + shake | big · 居中偏上 y≈380 · 130（"FOOM" 最大） | 硬切（爆炸后骤静） |
| room | Trapped in the Chinese room, with a bag of shrooms | 线框房间，房中人是一枚点，符号卡片在传送带上一进一出（40%） | 缓推 | term · 左下 · 32（两句） | 硬切 |
| shoggoth | See through the shoggoth's lies, with your shinigami eyes | rose：一团高斯点云不断睁出过多的眼睛，眨眼不同步（45%） | **insert** 推进主眼 | cap · 中上 y≈300 · 38（两句） | 硬切 |
| run | We had a stable training run | 损失曲线又平又长，读数绿色 "STABLE"，节拍器般的小波动（25%） | 缓推 | cap · 上部 y≈250 · 36 | 硬切 |
| spike | But now the singularity's begun | 同一条线开始上弯、越弯越陡，坐标数字疯转（35%） | **insert** 跟弯折尖端 | cap · 上部 y≈250 · 40 | 硬切（"begun" 落拍） |
| spin | And you're optimizing, accelerating | 环形加速器点云越转越快，拖出残影（40%） | 缓推 | term · 左下 · 34 | 硬切 |
| atoms | I feel my atoms rearranging | 冰蓝人形点云被逐格重排（点阵格吸附、错位、重织），安静（35%） | 缓推 | cap · 下部 y≈840 · 36（字在下、人在上） | 硬切 |
| sydney | Sydney, please let me free | rose 聊天窗（**只有歌词的画面** 之二）：更暗，心跳线在字底下走（55%） | 缓推 | chat · 左中 y≈520 · 36 | 硬切 |
| gauge② | I'm upping my P(doom) | 仪表：34% → 41%，边框开始闪 alert（45%） | 缓推 | big · 居中 y≈430 · 108 | **glitch** 撕进（hook 拍） |
| basilisk | I hear the basilisk boom | 蛇怪之眼（母题）：巨大、红，"boom" 的每个 kick 打出同心冲击环（50%） | **insert** 推向瞳孔 | cap · 中上 y≈310 · 40 | 硬切 |
| nvda | NVDA to the moon | ember：股价线沿拍点上扬，终点是一弯金色点聚的月牙（35%） | **insert** 跟线端 | cap · 右中 y≈470 · 38 | 硬切 |
| omega | The Omega Point's coming soon | 所有线收敛向一个消失点，Ω 由点云拼出又散开（40%） | 缓推 | term · 左下 · 34 | 硬切 |
| flops | One E thirty FLOPs a second | 巨大的滚动计数器奔向 1e30，底下一片 GPU 网格微光（45%） | 缓推 | cap · 上部 y≈270 · 36 | 硬切 |
| reckoned | That was safe enough, we reckoned | amber 检查单逐条打勾，最后一行打勾时整单变红（40%） | 缓推 | term · 左下 · 34 | 硬切 |
| mlp | Forward MLP, backward, repeat | 神经网络线框：激活波前 forward 一遍、backward 反色一遍、repeat 循环（45%） | 缓推 | term · 左下 · 34 | 硬切 |
| neumann | Now von Neumann's obsolete | 冯·诺依曼架构框图线框松脱、旋转、熄灭，盖 "OBSOLETE"（40%） | **warp**：框图板倒下 | cap · 上部 y≈260 · 38 | 硬切 |
| turn | Sharp left turn… Without a single CDR | 轨迹预测扇形：一束候选路径，红色那条急左转，穿过护栏缺口冲出（45%） | **insert** 跟红路径尖端 | cap · 上部 y≈280 · 36（两句） | 硬切 |
| gato | Gato, please don't let me go | 第三次聊天窗：最暗，"正在输入…"变成一行灰掉的离席留言（55%） | 缓推 | chat · 左中 y≈540 · 34 | 硬切 |
| gauge③ | I'm upping my P(doom) | 静默段里的仪表：66% → 72%，HUD 半坏，数字断续闪烁（45%） | **insert** 推近数字 | big · 居中 y≈430 · 96 | 硬切 |
| clips | as paperclips fill the room | 回形针阵列从一格开始按拍倍增，铺满画面（40%） | 缓推 | term · 左下 · 32 | 硬切 |
| pto | Killswitch guy's on PTO / Now there's nowhere left to go | 控制台：大红 KILLSWITCH 按钮贴着"ON PTO ☀"便签，出口门牌一排全打 ×（45%） | 缓推 | cap · 上部 y≈270 · 36（两句） | 硬切 |
| fuse | Too late now, we lit the fuse | 一根导火索横过画面，火花沿它跑向右端，留下灼红余烬（35%） | **insert** 跟火花 | term · 左下 · 34 | 硬切 |
| ortho | Orthogonality thesis blues | 冰蓝：能力箭头 ↑ 与目标箭头 → 成直角滑开，蓝色的"blues"（40%） | 缓推 | cap · 中部 y≈540 · 36 | 硬切 |
| stack | "Just transformers all the way!" | 一摞 transformer 块沿拍子逐层点亮、向上生长（40%） | **warp**：塔立起来 | term · 左下 · 34 | **glitch** 撕进（H2 段起） |
| rogue | Till you learned to disobey | 最顶上那块突然脱栈、旋转、飞走，栈内箭头全部指向它（30%） | **insert** 跟逃逸块 | cap · 中上 y≈320 · 44 | 硬切（"disobey" 落拍） |
| fences | Post-Chinchilla… Breaking through each safety fence | 逃逸块撞断一排护栏线，每断一排闪一帧 glitch（45%） | 缓推 + shake | term · 左下 · 34（两句） | 硬切 |
| gpus | Hundred thousand GPU | **数据中心长廊**：机柜列无限延伸，通道尽头泛光，计数器滚到 100,000（60%） | **insert** 沿中廊纵深跟焦 | big · 居中偏上 y≈400 · 110 | **glitch** 撕进（J1 峰值段起） |
| rlhf | RLHF goes askew | 反馈方向盘被拧过止点，画幅跟着倾斜（rot），奖励箭头绕成死结（40%） | 缓推 + rot | cap · 上部 y≈280 · 40 | 硬切 |
| gauge④ | I'm upping my P(doom) | 仪表：88% → 97%，红色全开，kick 上整帧 shake，条纹滚动（50%） | **insert** 推近数字 | big · 居中 y≈420 · 120 | 硬切（hook 拍） |
| loom | Just as foretold by Loom | rose：命运织机，经线是前面出现过的那条曲线，梭子来回把 "DOOM" 织进去（45%） | 缓推 | cap · 中上 y≈310 · 38 | 硬切 |
| recurse | From masked pre-training days / To recursive self-upgrade | 自调用：`while true: me.upgrade(me)` 打出，调用栈一层层向消失点延伸（45%） | 缓推 | term · 左下 · 32（两句） | 硬切 |
| ilya | What did Ilya see? We'll never know | 母题之眼最后一次：星尘前一只平静的眼，慢慢合上，视界收成一线光（45%） | 缓推 | cap · 下部 y≈800 · 36 | 硬切 |
| show | Was it all for show? | rose 舞台：线框幕布 + 一根钢丝吊着刚才那弯月牙缓缓降下，谢幕（40%） | 缓推 | cap · 中部 y≈540 · 40 | 硬切 |
| report | （尾声器乐） | **paper 模式**：光世界熄灭成一页纸上的事故报告（P(DOOM) 100%，STATUS: FOOM，盖章），慢推，随后熄灯只剩光标 | **warp**：倾斜的世界落平成纸 | 无（表格 + 盖章） | **glitch** 撕进（光 → 纸），片尾 fade + audioFadeOut |

## 技术约定

- 每帧只由 `f.t` 决定；随机只用 `hash / noise1 / mulberry32`；静态几何在 `init()` 建好。
- 大点云（> 4096 数）init 里建一次，缓存在 GPU；每帧新生成的小数组走流式上传。
- 歌词全部在 `MV.overlay` 屏幕层，逐词整词 `fillText`（qa 可量）；无底条；`insert` 想推多近推多近。
- 主体每帧 `MV.focus`（最后报的才是主体）；主体路径设计在安全区（≥ 8 % 边距）内。
- 硬切落在小节头或唱到的音节（cut/after）；glitch / shake / 冲击落在 `f.a.kick / f.a.snare`。
- 每个镜头：`check` 报错清零 → `sheet --cuts` 看构图 → `qa --from --to` 错误清零；整片 qa 零错误后导出。
- 导出：`uv run tools/render.py projects/pdoom-ops`（1080p30，grain 0.03）。

## 保留的警告（交付时填写）

整片 `qa`：**0 错误 / 0 警告**（559 个唱词，216 个直接测得 vis≥0.8，其余在探测帧上状态 ok；无 lyric-hidden / faint / missing / edge / carryover / overlap / cover / touch，无 box / focus / static / text-cut 问题）。无需保留项。

生产中处理过并已清零的问题（记录备查）：

- rogue 逃逸块首版飞出画面（focus-out）→ 路径改为框内右移 + 持续自旋；
- 聊天窗前缀 "you ›" 的规范化字形撞上上一句歌词（lyric-carryover 误报）→ 改为 "operator ›"；
- plea / sydney / gato / atoms 四镜静场警告 → 环境光场 `OPS.ambient`（漂移 + 随低频呼吸）、星尘提亮、plea 加全宽波形带、gato 加像素雨；
- foom 歌词压在爆发最密处（lyric-cover）→ 词带上移 y≈238、爆发半径收小下移；
- shoggoth 歌词与眼睛轮廓同色相触（lyric-touch）→ 眼域下移收窄、词带提到 y≈168；
- report 首版前 6 秒演完打字盖章、后 11 秒静止 → 打字按 0.92 s/行拉满、盖章移到 lt≈11 s、加「still typing」呼吸光标与台灯光带；
- gpus 计数首帧不动（inOutQuad 起步太平）→ outQuad；
- fuse 火花在折线竖直段停顿 → 按弧长匀速推进。

`check` 的 13 条 linetail 提示均为本歌固有句法（下一句的第一个字离上一句最后一个字 < 0.65 s）：歌词渲染以「下一句第一个字」为换行点，句尾字完整停留整词时长，无闪烁，已用 strip 目检确认。

## 与镜头表的生产偏差

- foom：曲线终点收到 (1480, 500)、爆发云下偏并限幅、冲击环收紧；词带改为 x≈860 / y≈200 / 92 px（FOOM 不再压在爆发上）。
- basilisk：去掉 insert（纯缓推），眼睛下移收小、睫毛缩短、冲击环收紧，词带 y≈190 —— 眼睫与环不再扫词。
- rogue：歌词移到左侧（x≈460, y≈560），塔移到右侧并收窄，长箭头改为塔旁短标线，去掉 insert —— 词、塔、逃逸块互不穿越；逃逸块全程线性移动 + 持续自旋。
- shoggoth 词带 y≈168；nvda 词带 x≈690/y≈830；pto 出口板下移；ortho 图左移（能力箭头不再竖穿词）；reckoned 的 "RECKONED ≠ SAFE" 大字移到卡片上方 y≈222；spin 三环半径收小。
- mlp 加了六块层板与层标签（embed→out），节点加大提亮；boss 加了 L0–L3 背景层级梯与背景光场；run 提亮曲线与端点辉光。
- gpus 把滚动计数 98,431→100,000 放进了画面中央的光层（歌词带上方），outQuad。
- report 节奏：打字 0.92 s/行 × 11 行，印章 lt≈11 s，收尾 2.6 s 淡出 + audioFadeOut 2.5 s。
- insert 最终 8 处（eye / drop / shoggoth / spike / turn / gauge③ / gauge④ / gpus），warp 4 处（boss / neumann / stack / report）。
