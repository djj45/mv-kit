# 镜头配方练习

24 秒、120 BPM，五种配方、六个镜头。所有图形由现有 mv-kit 引擎绘制，练习音轨由本目录脚本生成，无需下载歌曲、歌词、图片或字体。英文标签是讲解文字，不是歌词。

```sh
python3 projects/recipe-demo/make_audio.py
open projects/recipe-demo/index.html
uv run tools/render.py projects/recipe-demo check
uv run tools/render.py projects/recipe-demo qa
uv run tools/render.py projects/recipe-demo pilot
uv run tools/render.py projects/recipe-demo  # 完整配方预览
```

默认样片：18–23 秒，包含进入圆形主体的推进转场；输出 `out/pilots/pilot-00018.000-00023.000.mp4`。它验证形状连续性、音乐落点和新镜阅读停留。其他配方的局部预览命令见[配方索引](../../recipes/README.md)。练习音轨只有节拍提示，真实歌曲需要重新绑定歌词与拍点，不能用本例验证歌词质量。

| 区间 | 场景 | 配方 |
|---|---|---|
| 0–4 | path | path-reveal |
| 4–8 | steps | stepped-value |
| 8–12 | assemble | stagger-assemble |
| 12–16 | focus | focus-insert |
| 16–20.3 / 19.3–24 | portal / arrival（重叠 1 秒） | match-zoom |

配色：深蓝底 `#101E29`、暖白 `#F0EEE5`、灰蓝 `#536A79`、橙色重点 `#F5AE68`；每镜一次主要信息变化。首四镜使用默认缓推，最后两镜关闭额外缓推以保持转场锚点精确，场景内部仍有运动。此项目演示动作配方，不承担特定歌曲的创意方案。

QA 的稀疏图形 / 阅读停留警告及验收边界记录在 [TREATMENT.md](TREATMENT.md)，不通过关闭检查消除警告。

## 编码后验证示例

```sh
uv run tools/render.py projects/recipe-demo --verify
uv run tools/render.py projects/recipe-demo pilot --from 3 --to 9 --verify
```

时间线标注了 4 秒硬切、5 秒数值变化峰和 8 秒硬切。回测测量的是声明区域的变化峰，不是数字最终落定时刻。默认 18–23 秒的转场样片没有强行标注平滑转场的语义落点，因此 `sync` 会诚实返回 `unverified`；需要验证以上事件时使用 3–9 秒区间。

## 多轨与逐镜交付示例

`make_audio.py` 另生成 `voice-guide.wav`（旁白轨测试音，并非语音）、`portal-sfx.wav`（转场提示音）和 `value-sfx.wav`（可重复的数值变化提示音）。数值音效在 4.8 秒进入，源文件 0.2 秒锚点对应全片 5 秒；`value-change` 事件显式回测这条音效轨。另在 18.2 秒放入旁白轨测试音、19.3 秒放入转场音效，并提供两句演示字幕。

```sh
uv run tools/render.py projects/recipe-demo pilot
# 改 soundtrack.json 的音量/字幕后：
uv run tools/render.py projects/recipe-demo remix --file projects/recipe-demo/out/pilots/pilot-00018.000-00023.000.mp4
uv run tools/render.py projects/recipe-demo package
```

仅修改 `soundtrack.json` 的字幕时运行 `render.py projects/recipe-demo subtitles`，MP4 不变；随后 `package` 会以新的交付版本输出。多轨缓存由普通导出、remix 和 package 共用，日志会报告命中的音轨数。

完整交付包含六个逐镜 MP4、四条对齐 WAV、混音、SRT/VTT 和现有 QA 报告。换声音或只改字幕后，`package` 复用六个镜头的编码缓存。全片的稀疏图形静止警告仍保留；默认转场样片没有声明回测事件，不能写成音画已通过。细节见 [声音与交付文档](../../docs/SOUND-DELIVERY.md)。

运行 `render.py projects/recipe-demo review` 后打开输出的 `index.html`：默认播放最终混音，可独听四条轨道、开关两句导出字幕，并点击静止警告跳到对应片段。`voice-guide` 仍是测试音，不是语音。独立字幕检查使用 `subtitlecheck`，详细规则见 [审片文档](../../docs/REVIEW.md)。
