# roto-demo — 样张：kits/roto.js（AI 素材 → 孔版印刷赛璐璐）

> 不是完整 MV，是"转描"风格包的示范：用 Pdoom-video-anime-version 里现成的即梦素材（Seedance 2.5 草稿版 480p 视频 + Seedream 静帧），
> 截《I'm Upping My P(doom)》113–142 s（最后一段副歌到尾声）。素材只提供动作、人体结构和口型；观众看到的全是墨和纸。

## 一句话概念

AI 生成的偶像少女被"印"出来：每一帧都像一张手工孔版印刷（Risograph）的动画赛璐璐，限色、错版、网点、纸纹；最后镜头拉远，原来整支片子是钉在墙上的一张张印样。

## 画风

- 参考方向：90 年代 TV 动画片头 × 孔版印刷海报。硬边平涂、两阶阴影、阴影里 45° 网点、粗黑描线一拍二抖动、第二色线版错位。
- 线条：XDoG 从素材里重新提取，墨黑 `#1B1714`；每张作画（`f.tick`）抖动 ±0.45 px；另印一版偏移 (1.6, −1) px 的错版线，颜色随镜头（蓝 / 粉）。
- 阴影 / 光：每种油墨只有"本色"和"压暗 32%"两档；压暗的区域铺 4.2 px 网点。没有渐变、没有高光、没有辉光。
- 质感：整帧（含歌词）最后过一遍印刷：纸纤维、纸齿、暗版错位 1.5 px（拍点上加大）、平涂暗部的缺墨白点、按作画张变化的颗粒、暗角。
- 动态节奏：`drawRate: 12`（一拍二）。人物动作来自素材，按 12 张 / 秒定格；镜头运动（推、摇、荷兰角）用连续时间，所以"画在动、纸不动、镜头顺滑"。
- 禁止项：原始素材上屏；照片感的柔和渐变；AI 素材里的水印；超过一个镜头调色板以外的颜色。

## 调色板（油墨）

| 名称 | 色值 | 用途 |
|---|---|---|
| paper | #F1ECE1 | 纸、背景 |
| ink | #1B1714 | 线、歌词主色 |
| claude | #D97757 | 少女的头发、星芒、正在唱的词 |
| lcl | #F08A24 | 橙色海、驾驶舱液体 |
| blue | #1D5FD1 | 冷色镜头、错版线 |
| pink | #FF4F9A | 错版线、歌词错位底色 |
| alarm | #E8322B | 只在 P(doom) 爆表之后 |

每个镜头只用 `ROTO.PAL` 里的一组：驾驶舱 `plug`、走廊 `dc`、海 `sea`。

## 字体

- 歌词：Anton（窄体粗黑，全大写），每个词在唱到时砸进来，正在唱的词用强调色，后面错位印一层第二色。
- 字幕 / 竖排标题：Shippori Mincho B1 ExtraBold。
- HUD：JetBrains Mono。三种字体都是 OFL，子集化后嵌进 `lib/fonts.js`。
- 歌词规则：逐词同步，不抢跑；离画面边缘 ≥ 96 px。

## 贯穿母题

1. **印刷**：错版、网点、纸纹贯穿；P(doom) 爆表那一下"印歪了"（错版猛增 + 白闪）；结尾拉远成印样墙。
2. **P(DOOM) 读数**：右上角的计量条随歌词一路上涨，61 → 74 → 86 → 99.9 → ERR。
3. **作画张数**：左上角 HUD 显示当前作画张序号（`f.tick`），点明"一拍二"。

## 镜头表

| 镜头 id | 歌词 | 素材 | 画面 | 转场 / 节拍点 |
|---|---|---|---|---|
| cockpit | Till you learned to disobey / Post-Chinchilla… / Breaking through… | Seedance I（不唱，闭眼→睁眼） | 驾驶舱，橙色液体涌上；镜头缓推；歌词左侧块状划出，第三句在底部砸出 | 从小节头开始 |
| corridor | Hundred thousand GPU / RLHF goes askew | Seedream 静帧 K5 | 冷色数据中心走廊，少女背影；镜头每拍推进；GPU 计数 1 → 100,000；唱到 "askew" 整个画面（连字）歪成荷兰角 | 切在唱词前一拍 |
| sea | I'm upping my P(doom) … recursive self-upgrade | Seedance J（对口型、指天） | 橙色海上的全身舞台；底部满屏歌词；P(doom) 那一下印歪 + 爆表；"recursive" 时画面一层层套印缩进中心 | 底鼓轻震 |
| turn | What did Ilya see? … / Was it all for show? | Seedance K（侧脸转向镜头微笑） | 特写缓推；左侧歌词块；"Was it all for show?" 镜头拉远：这一帧变成墙上一排印样中的一张 | 尾声小节头收黑 |

## 技术约定

- 素材：`uv run tools/frames.py` 把视频 / 帧序列 / 静帧打包成 `frames/*.js`（JPEG data URL，直接双击 index.html 也能预览）。
- 每一帧只由 t 决定；印样墙的静态印样在 `init()` 里印好一次。
- 每改一个镜头：`uv run tools/render.py projects/roto-demo sheet --cuts`，打开拼板检查。
