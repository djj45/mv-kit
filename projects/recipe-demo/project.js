window.MV_PROJECT = {
  "title": "recipe-demo",
  "audio": "audio/pulse.wav",
  "soundtrack": "soundtrack.json",
  "from": 0,
  "to": 24,
  "fps": 24,
  "drawRate": 12,
  "bpm": 120,
  "width": 1920,
  "height": 1080,
  "data": ["lib/score.js"],
  "kits": ["camera", "layout"],
  "scripts": ["lib/look.js"],
  "scenes": ["path", "steps", "assemble", "focus", "portal", "arrival"],
  "post": {"grain": 0, "vignette": 0},
  "background": "#101E29",
  "pilot": {
    "from": 18,
    "to": 23,
    "reason": "圆形主体在重拍上完成推进匹配，检查转场前的引导、落点和转场后的停留。"
  }
};
