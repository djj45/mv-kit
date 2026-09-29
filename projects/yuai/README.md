# 雨爱（水墨）

《雨爱》第一段主歌到第一遍副歌结束（0:12.85–1:42.86，约 90 秒）的水墨 MV：一幅在雨里展开的长卷，每一滴雨都是落在宣纸上的一滴墨。
13 个镜头，全部用代码画出来（风格包 `kits/ink.js`），镜头设计见 `TREATMENT.md`。

歌曲和歌词的版权属于原作者，**不在仓库里**。要在本地渲染：

1. 把歌曲放到 `audio/杨丞琳+-+.雨爱.mp3`（文件名要和 `project.js` 里的 `audio` 一致）。
2. 在 `lyrics.txt` 里写歌词，一行一句，行首带 LRC 时间（`[00:16.29] …`）。
3. 分析和对齐：
   ```sh
   uv run analysis/analyze_audio.py projects/yuai --bpm 80
   uv run --extra mlx analysis/align_lyrics.py projects/yuai --lang zh
   uv run tools/tune_lyrics.py projects/yuai        # 逐字校准，保存到 data/lyrics_fix.json
   ```
4. 预览 `projects/yuai/index.html`，导出 `uv run tools/render.py projects/yuai`。

字体：马善政楷书（Ma Shan Zheng，SIL OFL 1.1，见 `fonts/OFL.txt`），`lib/font.js` 里内嵌的是只含本曲用字的子集。
