# 示例：anime-pdoom（10 秒二次元 demo）

"I'm Upping My P(doom)" 16.6–26.6 s，用 mv-kit 重建，逐像素与原 demo 一致。

- `lib/cues.js`：从歌词里按内容找到的词和切点（CUT），镜头都用它，不写死时间
- `lib/world.js`：天台世界的静态背景画（天空、积云、城市、铁丝网）、相机、天台构图
- `lib/halo.js`：原创的机械光环（AI）
- `lib/girl.js`：少女背影；`lib/face.js`：正脸、表情、口型和眼睛
- `scenes/`：7 个镜头 rooftop → sky → face → eye → alive → hook → foom
- `data/lyrics.js`：来自 pdoom-video 人工校对过的逐词时间；`data/audio.js`：mv-kit 的分析结果

歌曲从 `../../../pdoom-video/audio/pdoom.mp3` 读取（mv-kit 和 pdoom-video 在同一个 mv 文件夹下）。
