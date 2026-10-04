在 /Users/djj45/code/mv/mv-kit 里新建项目 projects/pdoom-sign，做一支完整的 MV，一轮做完，中间不要停下来问我。

方案已经写好：docs/briefs/pdoom-sign/TREATMENT.md。它是施工图——画风、调色板、字体、lib 的 API、41 条镜头每条画什么、主角是谁、镜头怎么动、歌词怎么出现，都定了。照着做；确实要偏离的地方，先写进它末尾的「改动记录」再改。不要改 engine/、kits/、tools/ 里的文件（需要框架加功能就在交付时告诉我）。

## 0. 先读（用 read 读全文，不要只 grep）
1. CLAUDE.md
2. docs/ENGINE.md：「场景」「给镜头和 qa 的声明」「时间线」「风格包」开头 camera.js / layout.js 两段、「qa」
3. projects/kit-demo：lib/demo.js 和 scenes/ 里三个镜头（运镜、BOX、MV.focus 的写法照它来）
4. docs/briefs/pdoom-sign/TREATMENT.md（全文）

## 1. 建项目（歌和分析数据与 anime-pdoom 是同一份，直接复用）
```sh
uv run tools/new_project.py pdoom-sign --audio /Users/djj45/code/mv/pdoom-video/audio/pdoom.mp3 --link --title "SAFETY NOTICE" --fps 30
cp projects/anime-pdoom/data/{audio.json,audio.js,lyrics.json,lyrics.js} projects/pdoom-sign/data/
uv run analysis/analyze_audio.py projects/pdoom-sign --pin
cp docs/briefs/pdoom-sign/TREATMENT.md projects/pdoom-sign/TREATMENT.md
```
然后按 TREATMENT §7 改 project.js（kits / scripts / scenes / background / post），删掉模板里的 title、lyrics 两个场景。

## 2. 先做 lib，再做镜头
1. 写 lib/sign.js、lib/words.js，API 按 TREATMENT §7，名字不要改。
2. 写一个临时场景 scenes/sampler.js，时间线先只放它（0–20 s）：一屏排出 10 个小人姿态、机器（含 gaze / blink / mask）、警告三角、禁令、箭头、人字、警戒条、标牌、刻度盘、印章，以及 9 种歌词处理各一句。出 stills，用 read_image 打开逐个看；再跑 `qa --from 0 --to 20`。姿态看着对、qa 0 错误，再往下。
3. 写 timeline.js：41 条，切点全部用 `cut('句首几个词', n)`；insert / warp / push 照镜头表写在条目上（词的时间用 `lyrics.findWords('词')[n].start`）；每个转场写一句注释。
4. 按镜头表顺序写场景。每写完一个镜头：
   - `uv run tools/render.py projects/pdoom-sign stills --t <这一镜开头、中间、结尾三个时刻>`，用 read_image 打开看；
   - `uv run tools/render.py projects/pdoom-sign qa --from <起> --to <止>`，打开 out/qa/ 里给的截图；
   - 错误清零再写下一个。
   可以分给子代理并行写（按幕分，文件不重叠），但 lib/ 只由你改；子代理需要 lib 加功能就报告给你。每个子代理交回之前必须自己跑过它那一段的 qa 并清零错误。
5. 删掉 sampler。

## 3. 收尾
1. `uv run tools/render.py projects/pdoom-sign check`：没有场景报错，时间线提示处理掉。
2. `uv run tools/render.py projects/pdoom-sign qa`：0 错误；警告逐条处理，保留的写进 TREATMENT「保留的警告」（哪一条、为什么）。
3. 对照 TREATMENT §9 硬指标逐条核对。
4. `uv run tools/render.py projects/pdoom-sign sheet --cuts`，自己看一遍拼板。
5. 不用导出，最后给我导出命令。

## 交付时告诉我
- qa 结果：错误数、警告数，保留了哪些警告、为什么
- §9 硬指标逐条：做到没有
- 偏离 TREATMENT 的地方（也写在它的改动记录里）
- 你最没把握的三个镜头（我先看这三个）
