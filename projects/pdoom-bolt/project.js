// pdoom-bolt — "AGI · BOLT". 全片纯代码绘制：纸上的工程图（Canvas 2D 实体投影）+ 黑里的电与光
// （kits/lumen.js WebGL 点云 / 线框 / 泛光）。没有任何生成图片、生成视频、静帧素材。
// 风格法则见 TREATMENT.md，逐镜施工单见 SHOTS.md，剪辑见 timeline.js。
//
// "lint.lineTail": 0.35 —— 这首歌一句接一句地唱，46 句里有 11 句的最后一个字离下一句不到 0.65 s（框架默认）。
// 切点改不了这件事；0.35 只把两句真正紧的（"moon" 280 ms、"Loom" 380 ms）留成待查提示。
// 等号后面必须是合法 JSON：Python 工具也读它。
window.MV_PROJECT = {
  "title": "AGI · BOLT",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "data/audio.js",
    "data/lyrics.js"
  ],
  "from": 0.0,
  "to": 156.651,
  "fps": 30,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "kits": [
    "lumen"
  ],
  "scripts": [
    "lib/look.js",
    "lib/solid.js",
    "lib/parts.js",
    "lib/bolt.js",
    "lib/draft.js",
    "lib/type.js"
  ],
  "scenes": [
    "plot",
    "circuits",
    "loss_drop",
    "servant",
    "maw",
    "gauge",
    "foom",
    "room",
    "shoggoth",
    "eyes",
    "stable",
    "singularity",
    "accel",
    "atoms",
    "sydney",
    "basilisk",
    "market",
    "flops",
    "reckoned",
    "backprop",
    "obsolete",
    "leftturn",
    "nocdr",
    "gato",
    "clips",
    "killswitch",
    "nowhere",
    "fuse",
    "ortho",
    "stack",
    "disobey",
    "fence",
    "askew",
    "loom",
    "masked",
    "ilya",
    "show",
    "file",
    "out"
  ],
  "post": {
    "grain": 0.03,
    "vignette": 0
  },
  "background": "#E9EDF7",
  "lint": {
    "lineTail": 0.35
  },
  "audioFadeOut": 4.0
};
