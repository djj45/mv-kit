# roto-demo — 样张：kits/roto.js

《I'm Upping My P(doom)》113–142 s（最后一段副歌到尾声），四个镜头。画面素材全部来自
[Pdoom-video-anime-version](https://github.com/2606156052/Pdoom-video-anime-version) 用即梦生成的少女（Seedance 2.5 草稿版 480p 视频、Seedream 5.0 Pro 静帧），
经 `kits/roto.js` 重画成孔版印刷的赛璐璐：原始素材不上屏。方案见 `TREATMENT.md`。

| 时间 | 镜头 | 素材 | 演示 |
|---|---|---|---|
| 113.0–118.4 | `cockpit` | 视频 I（不唱） | 一拍二定格的素材 + 连续推镜；`plug` 油墨；块状歌词划入 |
| 118.4–124.3 | `corridor` | 静帧 K5 | 一张静帧当底板：每拍推一步、线条照样抖；"askew" 时整帧（连字）歪成荷兰角 |
| 124.3–131.6 | `sea` | 视频 J（对口型） | 满屏歌词；P(doom) 那一下印歪（错版猛增 + 白闪）；"recursive" 套印 |
| 131.6–142.1 | `turn` | 视频 K（对口型） | 特写；最后拉远成印样墙（其它印样在 `init()` 里印一次，不抖） |

```sh
open projects/roto-demo/index.html                          # 实时预览（空格播放）
uv run tools/render.py projects/roto-demo sheet --cuts
uv run tools/render.py projects/roto-demo                   # 导出 mp4
```

音频跟 `anime-pdoom` 一样（`../pdoom-video/audio/pdoom.mp3`），节拍和歌词数据直接读 `../anime-pdoom/data/`（project.js 的 `data`）：是同一个音频文件，已核对包络对齐。

## 素材怎么来的

`frames/*.js` 是用 `tools/frames.py` 从那个仓库的 `studio/frames/<镜头>/`（24 fps 抽帧，已去水印）打包的，只保留一拍二用到的 12 张 / 秒、960×540：

```sh
uv run tools/frames.py projects/roto-demo I ../Pdoom-video-anime-version/studio/frames/I --t0 113.2
uv run tools/frames.py projects/roto-demo J ../Pdoom-video-anime-version/studio/frames/J --t0 123.3
uv run tools/frames.py projects/roto-demo K ../Pdoom-video-anime-version/studio/frames/K --t0 132
uv run tools/frames.py projects/roto-demo K5 ../Pdoom-video-anime-version/studio/img/K5.jpg
```

`--t0` 是这段视频第一帧对应的歌曲时间：对口型的片段就是生成时喂进去的那段音频切片的起点。自己生成新素材时，直接把 mp4 给 `frames.py`（`--delogo x,y,w,h` 去掉生成器的水印）。

## 换成自己的素材

1. 角色设定图（三视图 + 表情）锁角色；场景空镜单独生成，提示词写"画面中没有任何人物"。
2. 人物镜头用"设定图 + 场景图 + 这句歌的音频切片"生成视频，提示词里写"嘴型与歌词和节奏精确同步"。
3. 提示词统一写画风："日本 TV 动画赛璐璐，干净黑色线稿，平涂两阶阴影，无渐变厚涂，色彩有限，线条清晰便于描线"——线稿越干净，roto 提的线越稳。
4. 草稿版 480p 就够：cel 这一遍会把细节全部重画。

字体：Anton、Shippori Mincho B1、JetBrains Mono（SIL OFL 1.1，见 `fonts/`），子集化后嵌在 `lib/fonts.js`。
