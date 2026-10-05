// mv-kit style kit: lumen.js — 发光数据 / 终端科幻. Everything on screen is emitted light.
//
// The one rule: there are no surfaces, only light. Points and thin lines on black, added together, so dense
// places burn to white while the edges keep their colour, and bloom spreads the brightest. Form comes from point
// clouds and wireframes; depth from size, brightness and focus (a point out of focus becomes a large, faint
// disk); information from tiny monospace text. One subject, a lot of black. The `paper` palette turns the same
// rule inside out: the light becomes ink on a pale technical drawing (overlaps get darker instead of brighter).
//
// Immediate mode, one GPU pass per frame (WebGL2):
//   const cam = lmOrbit({ yaw: f.t * .2, pitch: .3, dist: 6 });     // or lmCamera({ eye, target }), lmScreen() for px
//   lmBegin('ice');                                                  // palette: ice | ember | rose | alert | paper
//   lmPoints(cam, this.cloud, { size: 1.6, gain: .8, dof: 14 });     // Float32Array xyz…
//   lmLines(cam, this.edges, { width: 1.2, color: 'accent', upto: f.p });   // segment buffer from LG.*
//   lmBig(lmGlow(), 'SIGNAL', W / 2, H / 2);                         // a 2D layer that blooms with the rest
//   lmEnd(g);                                                        // bloom, tone, chromatic aberration → g
//   lmHud(g, f, { id: 'c1', name: 'boot' }); lmTerminal(g, f);       // crisp text on top
//
// Palettes (LUMEN.*): ice 冰白 + 青 (cold terminal), ember 香槟白 + 琥珀 (warm data film), rose 品红紫, alert 警报红,
// paper 米白纸 + 墨 + 朱红 (ink mode). Every colour option takes '#hex', [r, g, b] (0..1) or a palette key:
// 'fg' 'dim' 'accent' 'hot' 'warn'. lmBegin('ice', { accent: '#9cf' }) overrides keys for one shot.
//
// Light:   lmPoints(cam, P, o)  o: size (px radius at the focus distance), gain, color | colors (Float32Array rgb per
//            point), sizes (per point), dof (px of blur at infinity), focus, blur (px, flat), fog (half-brightness
//            distance), twinkle (0..1) + t, drift (world units) + t, count (draw the first n), model, dynamic
//          lmLines(cam, S, o)   o: width (px), color, gain, glow (halo 0..1), glowR (px), upto (0..1 draw-on), dash
//            [on, off] px, dof, focus, blur, model. S = segments, 8 floats each: ax ay az bx by bz bright caps
//            (caps: 1 = round end at a, 2 = at b, 3 = both). Build them with LG.seg / LG.pairs / LG.edges.
//          lmGlow() → a W×H Canvas 2D context, cleared per lmBegin, added into the light before bloom.
//          lmEnd(g, o)          o: bloom (strength), radius (0..1 width of the glow), levels, exposure, ca
//            (chromatic aberration), lens (edge darkening), blend ('screen' to lay the light over what g has).
// Camera:  lmOrbit({ yaw, pitch, roll, dist, target, fov, shift: [px, px], focus }), lmCamera({ eye, target, up, fov }),
//          lmScreen() (x, y in px, y down). cam.project([x, y, z]) → [sx, sy, depth] for labels that follow 3D points;
//          lmXf(model, p) applies a model in JS (pin a label on a rotating vertex).
//          model: { pos: [x, y, z], rot: [rx, ry, rz] (radians, applied x→y→z), scale } on any draw.
// Shapes:  LG.sphere / ball / gauss / box / disk / ring / galaxy / stars / text / along (point clouds, Float32Array);
//          LG.seg (polyline → segments), LG.pairs, LG.edges, LG.poly('icosa'|'dodeca'|'octa'|'tetra'|'cube'),
//          LG.wirebox, LG.grid, LG.circle, LG.curve, LG.join. lmMorph(A, B, k, o): every point flies from A to B,
//          staggered and swirling (the continuous "no cut" transition). Arrays you edit in place: bump arr.__v.
// Text:    lmTerminal (左下终端歌词: > 提示符, 逐词整词打出, 方块光标, 历史行变暗), lmCaption (底部居中字幕, 逐词快淡入),
//          (both qa-safe: a word appears whole at its start; lines sung before the shot are not carried in)
//          lmHud (角框 + 镜头号/时间码 + 右上读数 + 右下注脚), lmSection (章节号), lmTag (小号宽字距标签),
//          lmAmbient (into lmGlow(): drifting soft light for sparse, quiet shots — keeps them off qa's static list),
//          lmLabel (引线标注; 纸面模式下自动在字后垫底色), lmBig (宽字距大字: decode 乱码解出 / reveal / glitch), lmCode (带行号的代码块, 逐字打出),
//          lmCodeBg (满屏暗代码纹理; lmSource('scene') = 镜头自己的源码), lmCount / lmFmt (数字滚动), lmFlick (通电闪烁).
// Post:    a scene returning { glitch: 0..1 } tears the whole frame (bands + RGB split); timeline wipe 'glitch'.
//
// Depth: kits/solid.js (listed after lumen) adds lit / glass meshes and raymarched shaders into this same light, with a
// depth buffer; then lmPoints / lmLines take o.occlude (true: hidden behind them; 'behind': only what is behind them).
//
// Deterministic (hash noise only; a frame depends on t). Needs WebGL2 (the exporter asks for the GPU).
(function (G) {
'use strict';
const MV = G.MV;

// ---------------------------------------------------------------- palettes
const LUMEN = {
  ice:   { mode: 'light', bg: '#000000', bg2: '#05080A', fg: '#DCE8EE', dim: '#5B666D', accent: '#7AD7CF', hot: '#FFFFFF', warn: '#FF5B4D', bloom: 0.85, radius: 0.55, exposure: 1, ca: 0.6, lens: 0.25 },
  ember: { mode: 'light', bg: '#030306', bg2: '#13131C', fg: '#F3E5CF', dim: '#77716B', accent: '#F2A44C', hot: '#FF6B3D', warn: '#FF6B3D', bloom: 1.0, radius: 0.6, exposure: 1, ca: 0.45, lens: 0.35 },
  rose:  { mode: 'light', bg: '#000000', bg2: '#0B0611', fg: '#EFD9F2', dim: '#6B5B72', accent: '#EA8FD0', hot: '#FFFFFF', warn: '#FF5D8F', bloom: 0.9, radius: 0.55, exposure: 1, ca: 0.6, lens: 0.25 },
  alert: { mode: 'light', bg: '#000000', bg2: '#0E0303', fg: '#FF9E94', dim: '#74413B', accent: '#FF3B30', hot: '#FFE4DC', warn: '#FF3B30', bloom: 1.1, radius: 0.6, exposure: 1, ca: 0.9, lens: 0.3 },
  paper: { mode: 'ink', bg: '#E9E7DF', bg2: '#F1EFE8', fg: '#19191B', dim: '#9B988F', accent: '#C4532D', hot: '#C4532D', warn: '#C4532D', bloom: 0, radius: 0.4, exposure: 1, ca: 0.12, lens: 0.12 },
};
const MONO = '"JetBrains Mono", "SF Mono", "Roboto Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
const SANS = '"PingFang SC", "Helvetica Neue", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif';

const S = { pal: LUMEN.ice, glowUsed: false };
const palOf = p => (p == null ? S.pal : typeof p === 'string' ? LUMEN[p] || S.pal : p);
const hex3 = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
/** Colour option → [r, g, b] 0..1: '#hex', [r, g, b], or a palette key ('fg', 'accent', …). */
function rgb(c, pal) {
  const p = palOf(pal);
  if (c == null) c = 'fg';
  if (Array.isArray(c) || c instanceof Float32Array) return [c[0], c[1], c[2]];
  if (typeof c === 'string' && c[0] !== '#' && p[c]) c = p[c];
  return hex3(c);
}
/** CSS rgba() for Canvas 2D. */
function lmCss(c, a = 1, pal) { const v = rgb(c, pal); return `rgba(${Math.round(v[0] * 255)},${Math.round(v[1] * 255)},${Math.round(v[2] * 255)},${a})`; }

// ---------------------------------------------------------------- 3D math (column-major, like GL)
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
function m4mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}
const I4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
/** Model matrix from { pos, rot: [rx, ry, rz], scale } (or a Float32Array(16) as is). */
function lmModel(m) {
  if (!m) return I4;
  if (m instanceof Float32Array) return m;
  const [rx, ry, rz] = m.rot || [0, 0, 0], s = m.scale == null ? [1, 1, 1] : typeof m.scale === 'number' ? [m.scale, m.scale, m.scale] : m.scale, p = m.pos || [0, 0, 0];
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx (x applied first)
  const r00 = cz * cy, r01 = cz * sy * sx - sz * cx, r02 = cz * sy * cx + sz * sx;
  const r10 = sz * cy, r11 = sz * sy * sx + cz * cx, r12 = sz * sy * cx - cz * sx;
  const r20 = -sy, r21 = cy * sx, r22 = cy * cx;
  return new Float32Array([r00 * s[0], r10 * s[0], r20 * s[0], 0, r01 * s[1], r11 * s[1], r21 * s[1], 0, r02 * s[2], r12 * s[2], r22 * s[2], 0, p[0], p[1], p[2], 1]);
}
/** Apply a model ({ pos, rot, scale } or matrix) to a point in JS — e.g. to pin a label on a rotating vertex. */
function lmXf(m, p) {
  const M = lmModel(m), z = p[2] || 0;
  return [M[0] * p[0] + M[4] * p[1] + M[8] * z + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * z + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * z + M[14]];
}
function camFrom(view, proj, eye, near, focus) {
  const vp = m4mul(proj, view);
  const cam = {
    view, proj, vp, eye, near, focus, ref: focus, persp: 1,
    /** World point → [x px, y px (down), depth] or null behind the camera. */
    project(p) {
      const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
      if (w < near) return null;
      return [(x / w * 0.5 + 0.5) * W, (0.5 - y / w * 0.5) * H, w];
    },
    /** Pixels per world unit at depth w. */
    px: w => proj[5] * H / 2 / w,
  };
  return cam;
}
/** Perspective camera. fov in degrees (vertical); shift [px, px] moves the picture (subject off-centre); focus = focal distance. */
function lmCamera({ eye = [0, 0, 6], target = [0, 0, 0], up = [0, 1, 0], fov = 35, near = 0.05, far = 2000, shift = [0, 0], roll = 0, focus } = {}) {
  let z = v3.norm(v3.sub(eye, target)), x = v3.norm(v3.cross(up, z)), y = v3.cross(z, x);
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll), x2 = x.map((v, i) => c * v + s * y[i]), y2 = y.map((v, i) => -s * x[i] + c * v); x = x2; y = y2; }
  const view = new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1]);
  const f = 1 / Math.tan(fov * Math.PI / 360), proj = new Float32Array(16);
  proj[0] = f / (W / H); proj[5] = f; proj[10] = (far + near) / (near - far); proj[11] = -1; proj[14] = 2 * far * near / (near - far);
  proj[8] = -2 * shift[0] / W; proj[9] = 2 * shift[1] / H;
  return camFrom(view, proj, eye, near, focus ?? Math.hypot(...v3.sub(eye, target)));
}
/** Orbit camera round target: yaw (radians, round y), pitch (up), dist. */
function lmOrbit({ yaw = 0, pitch = 0, dist = 6, target = [0, 0, 0], ...rest } = {}) {
  const cp = Math.cos(pitch);
  const eye = [target[0] + dist * cp * Math.sin(yaw), target[1] + dist * Math.sin(pitch), target[2] + dist * cp * Math.cos(yaw)];
  return lmCamera({ eye, target, ...rest });
}
/** Flat camera: x, y in screen px (y down), z ignored. Use o.blur on draws for 2D bokeh. */
function lmScreen() {
  const vp = new Float32Array([2 / W, 0, 0, 0, 0, -2 / H, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
  return { vp, view: I4, proj: I4, eye: [0, 0, 0], near: -1, focus: 1, ref: 1, persp: 0, project: p => [p[0], p[1], 1], px: () => 1 };
}

// ---------------------------------------------------------------- GLSL
const HASH = `
uint hu(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float hf(uint x) { return float(hu(x)) / 4294967295.; }
float h3(float a, float b, float c) { return hf(uint(abs(a)) * 73856093u ^ uint(abs(b)) * 19349663u ^ uint(abs(c)) * 83492791u); }
`;
const VS_FULL = `#version 300 es
layout(location=0) in vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }`;

const VS_PTS = `#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec3 P;
layout(location=2) in vec3 C;
layout(location=3) in float Sz;
uniform mat4 uVP, uM;
uniform vec2 uRes;
uniform float uSize, uDof, uBlur, uFocus, uRef, uPersp, uGain, uNear, uFog, uInk, uZ;
uniform vec4 uTw;          // twinkle, time, drift, drift speed
out vec2 vQ; out float vR, vSig, vI, vBok; out vec3 vC;
${HASH}
void main() {
  uint id = uint(gl_InstanceID);
  vec3 p = P;
  if (uTw.z > 0.) {
    vec3 ph = vec3(hf(id * 3u + 1u), hf(id * 3u + 2u), hf(id * 3u + 3u)) * 6.2832;
    vec3 fr = .6 + vec3(hf(id * 7u + 11u), hf(id * 7u + 12u), hf(id * 7u + 13u));
    p += uTw.z * sin(uTw.y * uTw.w * fr + ph);
  }
  vec4 c = uVP * uM * vec4(p, 1.);
  if (c.w < uNear) { gl_Position = vec4(2., 2., 2., 1.); return; }
  float core = uSize * Sz * (uPersp > .5 ? uRef / c.w : 1.);
  float coc = uBlur + uDof * abs(c.w - uFocus) / c.w;
  float sig = max(core * .6, .5);
  float I = uGain * min(1., pow(core * .6 / .5, 2.));            // sub-pixel points get dimmer, not smaller
  if (uTw.x > 0.) {
    float tt = abs(uTw.y) * 3. + hf(id * 5u + 7u) * 10.;
    float a = hf(id * 13u + uint(floor(tt)) * 7919u), b = hf(id * 13u + uint(floor(tt) + 1.) * 7919u);
    I *= 1. - uTw.x + uTw.x * mix(a, b, smoothstep(0., 1., fract(tt)));
  }
  if (uFog > 0.) I /= 1. + pow(c.w / uFog, 2.);
  float R = sqrt(core * core + coc * coc);
  float bok = smoothstep(0., 1., (coc - 1.) / (sig * 2. + 1.5));
  float Rq = max(sig * 3.5, R + 2.);
  vC = uInk > .5 ? -log(max(C, vec3(.02))) : C;
  gl_Position = vec4(c.xy / c.w + corner * Rq / (uRes * .5), uZ > .5 ? c.z / c.w : 0., 1.);
  vQ = corner * Rq; vR = R; vSig = sig; vI = I; vBok = bok;
}`;
const FS_PTS = `#version 300 es
precision highp float;
in vec2 vQ; in float vR, vSig, vI, vBok; in vec3 vC; out vec4 o;
void main() {
  float d = length(vQ);
  float gs = exp(-d * d / (2. * vSig * vSig));
  float disk = clamp((vR + .75 - d) / 1.5, 0., 1.) * (2. * vSig * vSig) / max(vR * vR, 1e-3) * (.82 + .3 * smoothstep(vR * .55, vR, d));
  float k = mix(gs, disk, vBok) * vI;
  if (k < .0003) discard;
  o = vec4(vC * k, 1.);
}`;

const VS_LIN = `#version 300 es
precision highp float;
layout(location=0) in vec2 corner;     // x: 0..1 along, y: -1..1 across
layout(location=1) in vec3 A;
layout(location=2) in vec3 B;
layout(location=3) in vec2 BC;         // brightness, caps
uniform mat4 uVP, uM;
uniform vec2 uRes;
uniform float uWidth, uGlowR, uDof, uBlur, uFocus, uNear, uFog, uZ;
out float vU, vV, vL, vCoc, vB, vCaps;
void main() {
  vec4 ca = uVP * uM * vec4(A, 1.), cb = uVP * uM * vec4(B, 1.);
  float caps = BC.y;
  if (ca.w < uNear && cb.w < uNear) { gl_Position = vec4(2., 2., 2., 1.); return; }
  if (ca.w < uNear) { ca = mix(ca, cb, (uNear - ca.w) / (cb.w - ca.w)); caps -= mod(caps, 2.); }
  if (cb.w < uNear) { cb = mix(cb, ca, (uNear - cb.w) / (ca.w - cb.w)); caps = mod(caps, 2.); }
  vec2 sa = ca.xy / ca.w * uRes * .5, sb = cb.xy / cb.w * uRes * .5;
  vec2 d = sb - sa; float L = length(d);
  vec2 dir = L > 1e-4 ? d / L : vec2(1., 0.), nr = vec2(-dir.y, dir.x);
  float cocA = uBlur + uDof * abs(ca.w - uFocus) / ca.w, cocB = uBlur + uDof * abs(cb.w - uFocus) / cb.w;
  float hw = max(uWidth, 1.) * .5 + max(cocA, cocB) + uGlowR * 4. + 1.5;
  float u = corner.x * L + (corner.x * 2. - 1.) * hw, v = corner.y * hw;
  float wq = corner.x < .5 ? ca.w : cb.w;
  gl_Position = vec4((sa + dir * u + nr * v) / (uRes * .5), uZ > .5 ? (corner.x < .5 ? ca.z / ca.w : cb.z / cb.w) : 0., 1.);
  vU = u; vV = v; vL = L; vCoc = corner.x < .5 ? cocA : cocB; vCaps = caps;
  vB = BC.x / (uFog > 0. ? 1. + pow(wq / uFog, 2.) : 1.);
}`;
const FS_LIN = `#version 300 es
precision highp float;
in float vU, vV, vL, vCoc, vB, vCaps; out vec4 o;
uniform float uWidth, uGlowA, uGlowR, uGain;
uniform vec3 uColor;
uniform vec2 uDash;
void main() {
  float du = 0.;
  if (vU < 0.) { if (mod(vCaps, 2.) < .5) discard; du = -vU; }
  else if (vU > vL) { if (vCaps < 1.5) discard; du = vU - vL; }
  if (uDash.x > 0. && mod(clamp(vU, 0., vL), uDash.x + uDash.y) > uDash.x) discard;
  float d = length(vec2(du, vV));
  float hw = max(uWidth, 1.) * .5, ww = hw + vCoc, spread = (hw + .5) / (ww + .5);
  float core = clamp((ww + .6 - d) / 1.2, 0., 1.) * spread * min(uWidth, 1.);
  float glow = uGlowA * exp(-d / max(uGlowR, .01)) * spread;
  float k = (core + glow) * vB * uGain;
  if (k < .0003) discard;
  o = vec4(uColor * k, 1.);
}`;

const FS_ADD = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uGain, uInk;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 s = texture(uTex, vec2(uv.x, 1. - uv.y));
  if (s.a <= 0.002) discard;
  vec3 c = uInk > .5 ? -log(max(s.rgb, vec3(.02))) * s.a : s.rgb * s.a;
  o = vec4(c * uGain, 1.);
}`;
const FS_DOWN = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uSrcRes, uDstRes; uniform float uClamp;
void main() {
  vec2 uv = gl_FragCoord.xy / uDstRes, h = 1. / uSrcRes;
  vec3 s = texture(uSrc, uv).rgb * 4. + texture(uSrc, uv - h).rgb + texture(uSrc, uv + h).rgb
         + texture(uSrc, uv + vec2(h.x, -h.y)).rgb + texture(uSrc, uv - vec2(h.x, -h.y)).rgb;
  o = vec4(min(s / 8., vec3(uClamp)), 1.);
}`;
const FS_UP = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uSrcRes, uDstRes; uniform float uW;
void main() {
  vec2 uv = gl_FragCoord.xy / uDstRes, h = 1. / uSrcRes;
  vec3 s = texture(uSrc, uv + vec2(-h.x * 2., 0.)).rgb + texture(uSrc, uv + vec2(-h.x, h.y)).rgb * 2.
         + texture(uSrc, uv + vec2(0., h.y * 2.)).rgb + texture(uSrc, uv + h).rgb * 2.
         + texture(uSrc, uv + vec2(h.x * 2., 0.)).rgb + texture(uSrc, uv + vec2(h.x, -h.y)).rgb * 2.
         + texture(uSrc, uv + vec2(0., -h.y * 2.)).rgb + texture(uSrc, uv - h).rgb * 2.;
  o = vec4(s / 12. * uW, 1.);
}`;
const FS_COMP = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uLight, uBloom;
uniform vec2 uRes;
uniform vec3 uBg, uBg2;
uniform float uMode, uBloomK, uExp, uCA, uLens, uSeed;
${HASH}
vec3 tone(vec3 c) {                                   // linear below .62, soft shoulder above; hot cores spill to white
  float m = max(max(c.r, c.g), c.b); c += max(m - 1., 0.) * .3;
  vec3 a = vec3(.62); return mix(c, a + (1. - a) * (1. - exp(-(c - a) / (1. - a))), step(a, c));
}
vec3 Ls(vec2 uv) { return texture(uLight, uv).rgb + texture(uBloom, uv).rgb * uBloomK; }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes, dc = uv - .5;
  float r = length(dc * vec2(uRes.x / uRes.y, 1.));
  vec3 c;
  if (uCA > 0.) { vec2 off = dc * r * r * uCA * .012; c = vec3(Ls(uv + off).r, Ls(uv).g, Ls(uv - off).b); }
  else c = Ls(uv);
  c *= uExp;
  vec3 bg = mix(uBg2, uBg, smoothstep(0., .9, r)), oc;
  if (uMode < .5) oc = 1. - (1. - bg) * (1. - tone(c));
  else oc = bg * exp(-c);
  oc *= 1. - uLens * smoothstep(.45, 1.15, r);
  oc += (hf(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(uSeed) * 26699u) - .5) / 255.;
  o = vec4(clamp(oc, 0., 1.), 1.);
}`;
const FS_GLITCH = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uRes; uniform float uAmt, uTick;
${HASH}
void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float b1 = floor(fc.y / 72.), b2 = floor(fc.y / 11.), sh = 0.;
  if (h3(b1, uTick, 1.) < uAmt * .55) sh += (h3(b1, uTick, 2.) - .5) * uAmt * 220.;
  if (h3(b2, uTick, 3.) < uAmt * .3) sh += (h3(b2, uTick, 4.) - .5) * uAmt * 70.;
  float ca = uAmt * 7. * (.5 + h3(b1, uTick, 5.));
  vec2 px = 1. / uRes;
  float r = texture(uSrc, (fc + vec2(sh + ca, 0.)) * px).r;
  vec2 gb = texture(uSrc, (fc + vec2(sh, 0.)) * px).ga;
  float b = texture(uSrc, (fc + vec2(sh - ca, 0.)) * px).b;
  vec3 c = vec3(r, gb.x, b);
  float bx = floor(fc.x / 120.), by = floor(fc.y / 48.);
  if (h3(bx + 101., by, uTick) < uAmt * uAmt * .06) {                      // a few blocks copied from elsewhere
    vec2 from = fc + (vec2(h3(bx, by, uTick + 7.), h3(by, bx, uTick + 9.)) - .5) * vec2(480., 160.);
    c = texture(uSrc, from * px).rgb;
  }
  o = vec4(c, 1.);
}`;

// ---------------------------------------------------------------- GL plumbing
let GLC = null, gl = null, FMT = null;
const PR = {}, VAO = {};
let LIGHT = null, LEVELS = [], GLOW = null, GLOWX = null, TEX = {}, SCR = null;
const BEGIN = [];      // lmOnBegin hooks (kits/solid.js resets its per-frame state there)
function glInit() {
  if (gl) return;
  GLC = document.createElement('canvas'); GLC.width = W; GLC.height = H;
  gl = GLC.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) throw new Error('lumen.js needs WebGL2');
  const fl = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
  FMT = fl ? { i: gl.RGBA16F, t: gl.HALF_FLOAT } : { i: gl.RGBA8, t: gl.UNSIGNED_BYTE };
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const vbuf = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; };
  const full = vbuf([-1, -1, 3, -1, -1, 3]), quad = vbuf([-1, -1, 1, -1, -1, 1, 1, 1]), strip = vbuf([0, -1, 1, -1, 0, 1, 1, 1]);
  for (const [k, b] of [['full', full], ['pts', quad], ['lin', strip]]) {
    VAO[k] = gl.createVertexArray(); gl.bindVertexArray(VAO[k]);
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(null);
  SCR = gl.createBuffer();
  LIGHT = target(W, H);
  for (let i = 1, w = W, h = H; i <= 7; i++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); LEVELS.push(target(w, h)); }
  GLOW = mk(W, H); GLOWX = GLOW.getContext('2d');
}
function target(w, h) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, FMT.i, w, h, 0, gl.RGBA, FMT.t, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    if (FMT.i === gl.RGBA8) throw new Error('lumen.js: cannot create a render target');
    FMT = { i: gl.RGBA8, t: gl.UNSIGNED_BYTE }; gl.deleteFramebuffer(fb); gl.deleteTexture(t); return target(w, h);
  }
  return { t, fb, w, h };
}
function program(name, vs, fs) {
  if (PR[name]) return PR[name];
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`lumen.js ${name}: ${gl.getShaderInfoLog(s)}`); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`lumen.js ${name}: ${gl.getProgramInfoLog(p)}`);
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return (PR[name] = { p, u });
}
// Big geometry buffers are cached per Float32Array (build them once, in init); a big array you change in place must
// bump arr.__v (lmMorph does) or pass o.dynamic. Small arrays (≤ 4096 floats) and dynamic ones are streamed
// through scratch buffers every draw, so arrays made fresh each frame don't pile up on the GPU.
const BUF = new WeakMap(), SCRB = [];
function bufFor(arr, dynamic, slot = 0) {
  if (dynamic || arr.length <= 4096) {
    const b = SCRB[slot] || (SCRB[slot] = gl.createBuffer());
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STREAM_DRAW); return b;
  }
  let e = BUF.get(arr);
  if (!e) { e = { b: gl.createBuffer(), v: NaN, n: -1 }; BUF.set(arr, e); }
  gl.bindBuffer(gl.ARRAY_BUFFER, e.b);
  const v = arr.__v || 0;
  if (dynamic || e.v !== v || e.n !== arr.length) { gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW); e.v = v; e.n = arr.length; }
  return e.b;
}
const F32 = new WeakMap();
const f32 = a => (a instanceof Float32Array ? a : F32.get(a) || (F32.set(a, new Float32Array(a.flat ? a.flat(2) : a)), F32.get(a)));
function attrib(loc, size, stride, off, div) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); gl.vertexAttribDivisor(loc, div); }
function bindTex(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }
function upload(key, unit, src) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  let t = TEX[key]; if (!t) { t = TEX[key] = gl.createTexture(); }
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
}
function fullscreen(fb, w, h) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h);
  gl.bindVertexArray(VAO.full); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
}
/** A depth buffer on the light target (made on first use, by kits/solid.js): solids and depth-writing shaders fill
 *  it, and points / lines drawn with o.occlude test against it. Without it lumen stays depth-free, exactly as before. */
function lmDepth() {
  glInit();
  if (!LIGHT.depth) {
    const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, LIGHT.fb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
    LIGHT.depth = rb;
  }
  return LIGHT.depth;
}
/** o.occlude on lmPoints / lmLines: true | 'front' = hidden behind what is in the depth buffer (solids, a raymarched
 *  surface); 'behind' = ONLY what is behind it (the half of a cloud seen through glass: see smGlass). */
function occludeOn(u, o) {
  const m = o.occlude;
  if (!m || !LIGHT.depth) { gl.uniform1f(u.uZ, 0); return false; }
  gl.uniform1f(u.uZ, 1); gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.depthFunc(m === 'behind' ? gl.GREATER : gl.LEQUAL);
  return true;
}
function occludeOff() { gl.disable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS); }
function camUniforms(u, cam, o) {
  gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniformMatrix4fv(u.uM, false, lmModel(o.model));
  gl.uniform2f(u.uRes, W, H);
  gl.uniform1f(u.uNear, cam.near); gl.uniform1f(u.uFocus, o.focus ?? cam.focus);
  gl.uniform1f(u.uDof, o.dof || 0); gl.uniform1f(u.uBlur, o.blur || 0);
}
/** The colour to emit (light) or absorb (ink) for a palette colour. */
function emit(c) { const v = rgb(c); return S.pal.mode === 'ink' ? v.map(x => -Math.log(Math.max(0.02, x))) : v; }

// ---------------------------------------------------------------- frame API
/** Start a light frame with a palette (name or object; overrides merge over it). Returns the palette. */
function lmBegin(pal = 'ice', over) {
  glInit();
  const base = typeof pal === 'string' ? LUMEN[pal] || LUMEN.ice : { ...LUMEN.ice, ...pal };
  S.pal = over ? { ...base, ...over } : base;
  S.glowUsed = false;
  gl.bindFramebuffer(gl.FRAMEBUFFER, LIGHT.fb); gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | (LIGHT.depth ? gl.DEPTH_BUFFER_BIT : 0));
  for (const fn of BEGIN) fn(S.pal);
  return S.pal;
}
function lmPal(p) { return palOf(p); }

/** Draw a point cloud (Float32Array x, y, z, …) as glowing sprites; out-of-focus points open into disks. */
function lmPoints(cam, P, o = {}) {
  if (!P || !P.length) return;
  P = f32(P);
  const n = Math.min(P.length / 3 | 0, o.count == null ? Infinity : Math.max(0, Math.floor(o.count)));
  if (!n) return;
  const pr = program('pts', VS_PTS, FS_PTS), u = pr.u;
  gl.useProgram(pr.p); gl.bindVertexArray(VAO.pts);
  gl.bindFramebuffer(gl.FRAMEBUFFER, LIGHT.fb); gl.viewport(0, 0, W, H);
  gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
  bufFor(P, o.dynamic, 0); attrib(1, 3, 12, 0, 1);
  if (o.colors) { bufFor(f32(o.colors), o.dynamic, 1); attrib(2, 3, 12, 0, 1); }
  else { gl.disableVertexAttribArray(2); const c = rgb(o.color ?? 'fg'); gl.vertexAttrib3f(2, c[0], c[1], c[2]); }
  if (o.sizes) { bufFor(f32(o.sizes), o.dynamic, 2); attrib(3, 1, 4, 0, 1); }
  else { gl.disableVertexAttribArray(3); gl.vertexAttrib1f(3, 1); }
  camUniforms(u, cam, o);
  gl.uniform1f(u.uSize, o.size ?? 1.5); gl.uniform1f(u.uRef, cam.ref); gl.uniform1f(u.uPersp, o.persp === false ? 0 : cam.persp);
  gl.uniform1f(u.uGain, o.gain ?? 1); gl.uniform1f(u.uFog, o.fog || 0); gl.uniform1f(u.uInk, S.pal.mode === 'ink' ? 1 : 0);
  gl.uniform4f(u.uTw, o.twinkle || 0, o.t || 0, o.drift || 0, o.speed ?? 1);
  const oc = occludeOn(u, o);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  if (oc) occludeOff();
  gl.bindVertexArray(null); gl.disable(gl.BLEND);
}

/** Draw line segments (8 floats each: a xyz, b xyz, brightness, caps) as thin glowing lines; o.upto draws them on. */
function lmLines(cam, Sg, o = {}) {
  if (!Sg || !Sg.length) return;
  Sg = f32(Sg);
  let n = Sg.length / 8 | 0;
  const pr = program('lin', VS_LIN, FS_LIN), u = pr.u;
  gl.useProgram(pr.p); gl.bindVertexArray(VAO.lin);
  gl.bindFramebuffer(gl.FRAMEBUFFER, LIGHT.fb); gl.viewport(0, 0, W, H);
  gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
  if (o.upto != null && o.upto < 1) {
    const k = clamp(o.upto) * n, m = Math.floor(k), fr = k - m;
    if (k <= 0) { gl.bindVertexArray(null); gl.disable(gl.BLEND); return; }
    const cnt = m + (fr > 1e-4 && m < n ? 1 : 0), d = new Float32Array(cnt * 8);
    d.set(Sg.subarray(0, m * 8));
    if (cnt > m) {
      const s = m * 8; for (let i = 0; i < 8; i++) d[s + i] = Sg[s + i];
      for (let i = 0; i < 3; i++) d[s + 3 + i] = Sg[s + i] + (Sg[s + 3 + i] - Sg[s + i]) * fr;
      d[s + 7] = (Sg[s + 7] % 2) + 2;                                   // the growing tip gets a round end
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, SCR); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STREAM_DRAW); n = cnt;
  } else bufFor(Sg, o.dynamic, 3);
  attrib(1, 3, 32, 0, 1); attrib(2, 3, 32, 12, 1); attrib(3, 2, 32, 24, 1);
  camUniforms(u, cam, o);
  const c = emit(o.color ?? 'fg');
  gl.uniform3f(u.uColor, c[0], c[1], c[2]);
  gl.uniform1f(u.uWidth, o.width ?? 1.2); gl.uniform1f(u.uGain, o.gain ?? 1); gl.uniform1f(u.uFog, o.fog || 0);
  gl.uniform1f(u.uGlowA, o.glow ?? 0.18); gl.uniform1f(u.uGlowR, o.glowR ?? 3.5);
  const dash = o.dash || [0, 0]; gl.uniform2f(u.uDash, dash[0], dash[1]);
  const oc = occludeOn(u, o);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  if (oc) occludeOff();
  gl.bindVertexArray(null); gl.disable(gl.BLEND);
}

/** A W×H 2D canvas whose content is added to the light (and blooms). In ink mode its colours are ink. */
function lmGlow() {
  glInit();
  if (!S.glowUsed) { const g = GLOWX; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.shadowBlur = 0; g.clearRect(0, 0, W, H); S.glowUsed = true; }
  return GLOWX;
}

/** Finish the frame: glow layer → bloom → tone / aberration / background → drawn into g. */
function lmEnd(g, o = {}) {
  const p = S.pal, ink = p.mode === 'ink';
  if (S.glowUsed) {
    upload('glow', 0, GLOW);
    const pr = program('add', VS_FULL, FS_ADD); gl.useProgram(pr.p);
    gl.uniform1i(pr.u.uTex, 0); gl.uniform2f(pr.u.uRes, W, H); gl.uniform1f(pr.u.uGain, o.glowGain ?? 1); gl.uniform1f(pr.u.uInk, ink ? 1 : 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); fullscreen(LIGHT.fb, W, H); gl.disable(gl.BLEND);
  }
  const bloom = o.bloom ?? p.bloom, levels = clamp(Math.round(o.levels ?? 6), 1, LEVELS.length);
  let bk = 0;
  if (bloom > 0) {
    const pd = program('down', VS_FULL, FS_DOWN); gl.useProgram(pd.p); gl.uniform1i(pd.u.uSrc, 0);
    let src = LIGHT;
    for (let i = 0; i < levels; i++) {
      const dst = LEVELS[i]; bindTex(0, src.t);
      gl.uniform2f(pd.u.uSrcRes, src.w, src.h); gl.uniform2f(pd.u.uDstRes, dst.w, dst.h); gl.uniform1f(pd.u.uClamp, i === 0 ? 12 : 1e4);
      fullscreen(dst.fb, dst.w, dst.h); src = dst;
    }
    const wgt = 0.55 + 0.9 * clamp(o.radius ?? p.radius), pu = program('up', VS_FULL, FS_UP);
    gl.useProgram(pu.p); gl.uniform1i(pu.u.uSrc, 0); gl.uniform1f(pu.u.uW, wgt);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = levels - 1; i > 0; i--) {
      const s = LEVELS[i], d = LEVELS[i - 1]; bindTex(0, s.t);
      gl.uniform2f(pu.u.uSrcRes, s.w, s.h); gl.uniform2f(pu.u.uDstRes, d.w, d.h); fullscreen(d.fb, d.w, d.h);
    }
    gl.disable(gl.BLEND);
    let tot = 0; for (let i = 0; i < levels; i++) tot += Math.pow(wgt, i);
    bk = bloom / tot;
  }
  const pc = program('comp', VS_FULL, FS_COMP), u = pc.u; gl.useProgram(pc.p);
  bindTex(0, LIGHT.t); bindTex(1, bloom > 0 ? LEVELS[0].t : LIGHT.t);
  gl.uniform1i(u.uLight, 0); gl.uniform1i(u.uBloom, 1); gl.uniform2f(u.uRes, W, H);
  const screen = o.blend === 'screen' || o.blend === 'lighter';
  const bg = screen ? [0, 0, 0] : rgb(o.bg ?? p.bg), bg2 = screen ? [0, 0, 0] : rgb(o.bg2 ?? p.bg2);
  gl.uniform3fv(u.uBg, bg); gl.uniform3fv(u.uBg2, bg2);
  gl.uniform1f(u.uMode, ink ? 1 : 0); gl.uniform1f(u.uBloomK, bk); gl.uniform1f(u.uExp, o.exposure ?? p.exposure);
  gl.uniform1f(u.uCA, o.ca ?? p.ca); gl.uniform1f(u.uLens, screen ? 0 : o.lens ?? p.lens); gl.uniform1f(u.uSeed, (o.seed ?? 0) + 1);
  fullscreen(null, W, H);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = o.alpha ?? 1;
  if (o.blend) g.globalCompositeOperation = o.blend;
  g.drawImage(GLC, 0, 0); g.restore();
}

// ---------------------------------------------------------------- whole-frame glitch (post filter) + wipe
function glitchPass(src, amt, tk) {
  glInit();
  upload('frame', 0, src);
  const pr = program('glitch', VS_FULL, FS_GLITCH); gl.useProgram(pr.p);
  gl.uniform1i(pr.u.uSrc, 0); gl.uniform2f(pr.u.uRes, src.width, src.height); gl.uniform1f(pr.u.uAmt, clamp(amt)); gl.uniform1f(pr.u.uTick, tk % 100000);
  if (GLC.width !== src.width || GLC.height !== src.height) { GLC.width = src.width; GLC.height = src.height; }
  fullscreen(null, src.width, src.height);
  const g = src.getContext('2d');
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.filter = 'none';
  g.drawImage(GLC, 0, 0); g.restore();
}
if (MV.postFilter) MV.postFilter((src, q, t) => { if (q.glitch > 0.002) glitchPass(src, q.glitch, Math.floor(t * (MV.project.fps || 24))); });
// Wipe: the new shot arrives in torn horizontal bands that flicker before they settle. params.bands (default 26).
if (MV.wipe) MV.wipe('glitch', {
  mask(m, k, e, t) {
    const n = e.params.bands || 26, tk = Math.floor(t * (MV.project.fps || 24));
    m.fillStyle = '#fff';
    let y = 0, i = 0;
    while (y < H) {
      const h = (H / n) * (0.35 + 1.3 * hash(i, e.i, 3)), th = hash(i, e.i, 7) * 0.8;
      const on = k > th + 0.2 || (k > th && hash(i, tk, 9) < 0.6);
      if (on) m.fillRect((hash(i, tk, 11) - 0.5) * 80 * (1 - k), y, W, h + 1);
      y += h; i++;
    }
  },
});

// ---------------------------------------------------------------- shapes (LG): point clouds and segment buffers
function R(seed) { return mulberry32((seed | 0) * 7919 + 13); }
function gauss(rnd) { return Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(TAU * rnd()); }
const LG = {
  /** Fibonacci sphere (even shell). o.jitter = radial thickness. */
  sphere(n, r = 1, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 1), ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * ga, k = r * (1 + (o.jitter || 0) * gauss(rnd));
      P[i * 3] = Math.cos(a) * rr * k; P[i * 3 + 1] = y * k; P[i * 3 + 2] = Math.sin(a) * rr * k;
    }
    return P;
  },
  /** Uniform in a ball. */
  ball(n, r = 1, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 2);
    for (let i = 0; i < n; i++) { const d = v3.norm([gauss(rnd), gauss(rnd), gauss(rnd)]), k = r * Math.cbrt(rnd()); P[i * 3] = d[0] * k; P[i * 3 + 1] = d[1] * k; P[i * 3 + 2] = d[2] * k; }
    return P;
  },
  /** Gaussian blob, sigma per axis (number or [sx, sy, sz]), centred on o.at. */
  gauss(n, sigma = 1, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 3), s = typeof sigma === 'number' ? [sigma, sigma, sigma] : sigma, c = o.at || [0, 0, 0];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = c[k] + gauss(rnd) * s[k];
    return P;
  },
  /** Box [w, h, d] filled (o.surface = only the faces). */
  box(n, size = [1, 1, 1], o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 4), [w, h, d] = size;
    for (let i = 0; i < n; i++) {
      let x = rnd() - 0.5, y = rnd() - 0.5, z = rnd() - 0.5;
      if (o.surface) { const f = Math.floor(rnd() * 6), s = f % 2 ? 0.5 : -0.5; if (f < 2) x = s; else if (f < 4) y = s; else z = s; }
      P[i * 3] = x * w; P[i * 3 + 1] = y * h; P[i * 3 + 2] = z * d;
    }
    return P;
  },
  /** Sunflower disk in the xz plane (golden angle: the even spiral of a seed head). */
  disk(n, r = 1) {
    const P = new Float32Array(n * 3), ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const k = r * Math.sqrt((i + 0.5) / n), a = i * ga; P[i * 3] = Math.cos(a) * k; P[i * 3 + 2] = Math.sin(a) * k; }
    return P;
  },
  /** Flat ring (annulus) in xz: o.r, o.width, o.thick. */
  ring(n, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 5), r = o.r ?? 1, w = o.width ?? 0.25, th = o.thick ?? 0.01;
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, k = r + (rnd() - 0.5) * w + gauss(rnd) * w * 0.08; P[i * 3] = Math.cos(a) * k; P[i * 3 + 1] = gauss(rnd) * th; P[i * 3 + 2] = Math.sin(a) * k; }
    return P;
  },
  /** Spiral galaxy in xz: o.arms, o.r, o.twist, o.spread (arm width), o.thick, o.core (bulge share). */
  galaxy(n, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 6), arms = o.arms ?? 2, r = o.r ?? 1, tw = o.twist ?? 3.4, sp = o.spread ?? 0.32, th = o.thick ?? 0.04, core = o.core ?? 0.16;
    for (let i = 0; i < n; i++) {
      if (rnd() < core) { const d = v3.norm([gauss(rnd), gauss(rnd) * 0.6, gauss(rnd)]), k = r * 0.16 * Math.pow(rnd(), 1.6); P[i * 3] = d[0] * k; P[i * 3 + 1] = d[1] * k; P[i * 3 + 2] = d[2] * k; continue; }
      const d = Math.pow(rnd(), 0.75), arm = Math.floor(rnd() * arms), a = arm / arms * TAU + d * tw + gauss(rnd) * sp * (1.15 - d * 0.5);
      const k = r * d;
      P[i * 3] = Math.cos(a) * k + gauss(rnd) * 0.02 * r; P[i * 3 + 1] = gauss(rnd) * th * r * (1.2 - d); P[i * 3 + 2] = Math.sin(a) * k + gauss(rnd) * 0.02 * r;
    }
    return P;
  },
  /** Star dust: points on a far, thick shell round the origin (r ± r/2). */
  stars(n, r = 40, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 7);
    for (let i = 0; i < n; i++) { const d = v3.norm([gauss(rnd), gauss(rnd), gauss(rnd)]), k = r * (0.5 + rnd()); P[i * 3] = d[0] * k; P[i * 3 + 1] = d[1] * k; P[i * 3 + 2] = d[2] * k; }
    return P;
  },
  /** Points sampled from text, in em units (1 = font size), centred, y up. o: font, weight, n, seed. */
  text(str, o = {}) {
    const size = 160, font = `${o.weight ?? 600} ${size}px ${o.font || SANS}`;
    const m = mk(8, 8).getContext('2d'); m.font = font;
    const lines = String(str).split('\n'), lh = size * 1.15, tw = Math.max(...lines.map(l => m.measureText(l).width));
    const c = mk(Math.ceil(tw + 40), Math.ceil(lh * lines.length + 40)), g = c.getContext('2d');
    g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#fff';
    lines.forEach((l, i) => g.fillText(l, c.width / 2, 20 + lh * (i + 0.5)));
    const im = g.getImageData(0, 0, c.width, c.height).data, hits = [];
    for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) if (im[(y * c.width + x) * 4 + 3] > 140) hits.push(x, y);
    const n = o.n ?? 4000, P = new Float32Array(n * 3), rnd = R(o.seed ?? 8), cnt = hits.length / 2;
    for (let i = 0; i < n && cnt; i++) {
      const j = Math.floor(rnd() * cnt);
      P[i * 3] = (hits[j * 2] + rnd() - c.width / 2) / size; P[i * 3 + 1] = -(hits[j * 2 + 1] + rnd() - c.height / 2) / size; P[i * 3 + 2] = (rnd() - 0.5) * (o.depth ?? 0.02);
    }
    return P;
  },
  /** n points scattered along a polyline [[x, y, z], …] (dust lines): o.jitter (world units), o.seed. */
  along(pts, n, o = {}) {
    const P = new Float32Array(n * 3), rnd = R(o.seed ?? 9), acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] || 0) - (pts[i - 1][2] || 0)));
    const L = acc[acc.length - 1] || 1, j = o.jitter ?? 0.01;
    for (let i = 0; i < n; i++) {
      const s = (o.even ? (i + 0.5) / n : rnd()) * L; let k = 1; while (k < acc.length - 1 && acc[k] < s) k++;
      const a = pts[k - 1], b = pts[k], u = (s - acc[k - 1]) / Math.max(1e-9, acc[k] - acc[k - 1]);
      for (let c = 0; c < 3; c++) P[i * 3 + c] = (a[c] || 0) + ((b[c] || 0) - (a[c] || 0)) * u + gauss(rnd) * j;
    }
    return P;
  },
  /** Polyline [[x, y, z], …] → segment buffer (butt joints, round free ends). o.closed, o.bright. */
  seg(pts, o = {}) {
    const n = pts.length - 1 + (o.closed ? 1 : 0), S = new Float32Array(Math.max(0, n) * 8), b = o.bright ?? 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length], s = i * 8;
      S[s] = a[0]; S[s + 1] = a[1]; S[s + 2] = a[2] || 0; S[s + 3] = c[0]; S[s + 4] = c[1]; S[s + 5] = c[2] || 0; S[s + 6] = b;
      S[s + 7] = o.closed ? 0 : (i === 0 ? 1 : 0) + (i === n - 1 ? 2 : 0);
    }
    return S;
  },
  /** Separate segments [[a, b], …], each with round ends. */
  pairs(list, o = {}) {
    const S = new Float32Array(list.length * 8), b = o.bright ?? 1;
    list.forEach(([a, c], i) => { S.set([a[0], a[1], a[2] || 0, c[0], c[1], c[2] || 0, b, 3], i * 8); });
    return S;
  },
  /** Segments between vertices at the shortest distance (every edge of a convex polyhedron). */
  edges(verts, o = {}) {
    let dmin = Infinity;
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) dmin = Math.min(dmin, Math.hypot(...v3.sub(verts[i], verts[j])));
    const out = [];
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) if (Math.hypot(...v3.sub(verts[i], verts[j])) < dmin * 1.01) out.push([verts[i], verts[j]]);
    return LG.pairs(out, o);
  },
  /** Vertices of a regular solid on a sphere of radius r: tetra | cube | octa | icosa | dodeca. */
  solid(name, r = 1) {
    const p = (1 + Math.sqrt(5)) / 2, q = 1 / p, V = [];
    const sg = [-1, 1];
    if (name === 'tetra') V.push([1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]);
    else if (name === 'cube') { for (const a of sg) for (const b of sg) for (const c of sg) V.push([a, b, c]); }
    else if (name === 'octa') V.push([1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]);
    else if (name === 'icosa') { for (const a of sg) for (const b of sg) V.push([0, a, b * p], [a, b * p, 0], [b * p, 0, a]); }
    else { for (const a of sg) for (const b of sg) { for (const c of sg) V.push([a, b, c]); V.push([0, a * q, b * p], [a * q, b * p, 0], [a * p, 0, b * q]); } }
    return V.map(v => v3.norm(v).map(x => x * r));
  },
  /** Wireframe of a regular solid. */
  poly(name, r = 1, o) { return LG.edges(LG.solid(name, r), o); },
  /** Wire box [w, h, d] centred on o.at. */
  wirebox(size = [1, 1, 1], o = {}) {
    const [w, h, d] = size.map(v => v / 2), c = o.at || [0, 0, 0], V = [];
    for (const x of [-w, w]) for (const y of [-h, h]) for (const z of [-d, d]) V.push([c[0] + x, c[1] + y, c[2] + z]);
    const E = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const diff = (i ^ j); if (diff === 1 || diff === 2 || diff === 4) E.push([V[i], V[j]]); }
    return LG.pairs(E, o);
  },
  /** Grid of n×n cells, size wide, in the xz plane at height y (o.plane 'xy' for a wall at z). */
  grid(n = 10, size = 10, o = {}) {
    const E = [], h = size / 2, y = o.y ?? 0;
    for (let i = 0; i <= n; i++) {
      const a = -h + size * i / n;
      if (o.plane === 'xy') { E.push([[a, -h, y], [a, h, y]], [[-h, a, y], [h, a, y]]); }
      else E.push([[a, y, -h], [a, y, h]], [[-h, y, a], [h, y, a]]);
    }
    return LG.pairs(E, o);
  },
  /** Circle polyline (n points) in plane 'xz' | 'xy' | 'yz'. */
  circle(r = 1, n = 128, plane = 'xz') {
    const out = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a) * r, s = Math.sin(a) * r; out.push(plane === 'xy' ? [c, s, 0] : plane === 'yz' ? [0, c, s] : [c, 0, s]); }
    return out;
  },
  /** Sample fn(u) → [x, y, z] for u in 0..1 into an (n+1)-point polyline. */
  curve(fn, n = 200) { const out = []; for (let i = 0; i <= n; i++) out.push(fn(i / n)); return out; },
  /** Concatenate Float32Arrays (point clouds with point clouds, segments with segments). */
  join(...arrs) { const n = arrs.reduce((s, a) => s + a.length, 0), o = new Float32Array(n); let k = 0; for (const a of arrs) { o.set(a, k); k += a.length; } return o; },
};

/**
 * Every point flies from A to B as k goes 0 → 1: staggered (o.stagger 0..0.9 of the time), along a curved path
 * (o.swirl, world units), eased. Point counts may differ (indices wrap). o.out reuses an output array.
 */
function lmMorph(A, B, k, o = {}) {
  const nA = A.length / 3 | 0, nB = B.length / 3 | 0, n = o.n ?? Math.max(nA, nB);
  const out = o.out && o.out.length === n * 3 ? o.out : new Float32Array(n * 3);
  const st = o.stagger ?? 0.5, sw = o.swirl ?? 0.4, seed = o.seed ?? 1, e = o.ease || ease.inOutCubic;
  for (let i = 0; i < n; i++) {
    const a = (i % nA) * 3, b = (i % nB) * 3, d = hash(i, seed) * st, kk = e(clamp((k - d) / (1 - st)));
    const arc = Math.sin(Math.PI * kk) * sw;
    out[i * 3] = A[a] + (B[b] - A[a]) * kk + arc * (hash(i, seed, 1) - 0.5) * 2;
    out[i * 3 + 1] = A[a + 1] + (B[b + 1] - A[a + 1]) * kk + arc * (hash(i, seed, 2) - 0.5) * 2;
    out[i * 3 + 2] = A[a + 2] + (B[b + 2] - A[a + 2]) * kk + arc * (hash(i, seed, 3) - 0.5) * 2;
  }
  out.__v = (out.__v || 0) + 1;
  return out;
}

// ---------------------------------------------------------------- text
function glowText(g, color, blur) { if (S.pal.mode !== 'ink' && blur > 0) { g.shadowColor = color; g.shadowBlur = blur; } }
/** 0 → 1 with a power-on flicker over dur seconds from t0. */
function lmFlick(t, t0, dur = 0.3, seed = 0) {
  if (t < t0) return 0; if (t >= t0 + dur) return 1;
  const k = (t - t0) / dur, fr = Math.floor((t - t0) * 60);
  return hash(fr, seed, 77) < 0.25 + k * 0.75 ? 0.4 + 0.6 * k : 0.08;
}
/** Number with thousands separators. */
function lmFmt(v, o = {}) {
  const dec = o.dec ?? 0, s = Math.abs(v).toFixed(dec), [i, f] = s.split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, o.sep ?? ',') + (f ? '.' + f : '');
}
/** Count from a to b between t0 and t1 (outExpo by default: fast, then settling). */
function lmCount(t, t0, t1, a, b, e = ease.outExpo) { return lerp(a, b, prog(t, t0, t1, e)); }

/**
 * The lines this shot may show at t (indices into lyr.lines, oldest first). The same rules as f.lyrics.lineAt: a line
 * all sung before `from` (the shot's start) is not carried into the shot, not even as a dim history row (qa's
 * lyric-carryover), and a line that starts after the next shot takes over (f.until) is left to that shot
 * (lyric-handover). `lead` lets a line in up to that many seconds before its first word (a dim preview).
 */
function shotLines(f, from, lead = 0) {
  const L = f.lyrics.lines, t = f.t, until = f.until ?? Infinity, out = [];
  for (let i = 0; i < L.length; i++) {
    const l = L[i]; if (!l.words.length) continue;
    if (l.start - lead > t || l.start >= until - 1e-6) break;
    if (l.words[l.words.length - 1].start >= from - 1e-6) out.push(i);
  }
  return out;
}

/**
 * Terminal lyrics, bottom left: "> " prompt, the line being sung typed out word by word with a block cursor, older
 * lines scrolled up and dimmed. Every word appears WHOLE at its own start (a short hot flash, then the line's colour),
 * one fillText per word: that is what qa measures — a word typed letter by letter is half drawn when qa looks at it
 * (lyric-hidden). A line is committed (a fresh prompt appears) o.commit s after it ends.
 * o: x, y (baseline of the live row), size, rows, gap, prompt, since (default f.from: lines sung before the shot are
 * not shown), status (string | fn(f)), hold (keep last line live), pal, glow, weight.
 */
function lmTerminal(g, f, o = {}) {
  const pal = palOf(o.pal), t = f.t, lyr = f.lyrics, L = lyr.lines;
  const size = o.size ?? 30, lh = size * (o.gap ?? 1.45), x = o.x ?? 110, y = o.y ?? H - 152, rows = o.rows ?? 3, pr = o.prompt ?? '> ';
  const commit = o.commit ?? 1.1, idx = shotLines(f, o.since ?? f.from);
  const hist = [];
  let live = null, liveStart = null, typing = false;
  if (idx.length) {
    const cur = L[idx[idx.length - 1]];
    if (!o.hold && t > cur.end + commit) { hist.push(cur.text); liveStart = cur.end + commit; }
    else { live = cur; liveStart = cur.start; typing = t < cur.end + 0.35; }
    for (let k = idx.length - 2; k >= 0 && hist.length < rows - 1; k--) hist.push(L[idx[k]].text);
  }
  const sc = liveStart == null ? 0 : (1 - prog(t, liveStart, liveStart + 0.14, ease.outCubic)) * lh;
  g.save(); g.font = `${o.weight ?? 500} ${size}px ${MONO}`; g.textBaseline = 'alphabetic';
  const pw = g.measureText(pr).width, sp = g.measureText(' ').width;
  hist.slice(0, rows - 1).forEach((s, r) => {
    const a = [0.5, 0.26, 0.14][r] ?? 0.1;
    g.fillStyle = lmCss('dim', a * 1.6, pal); g.fillText(pr, x, y - (r + 1) * lh + sc);
    g.fillStyle = lmCss('fg', a, pal); g.fillText(s, x + pw, y - (r + 1) * lh + sc);
  });
  const ya = y + sc, ap = 1 - sc / lh * 0.6;                           // the whole stack scrolls up one row together
  g.globalAlpha = ap;
  g.fillStyle = lmCss('fg', 0.9, pal); g.fillText(pr, x, ya);
  let cx = x + pw, typed = false;
  if (live) {
    for (const tk of lyr.tokens(live)) {
      if (t < tk.start) break;
      const hot = 1 - prog(t, tk.start, tk.start + 0.18);               // the word lands hot, then cools to the line
      g.save(); glowText(g, lmCss('fg', 0.55, pal), (o.glow ?? size * 0.45) * (1 + hot));
      g.fillStyle = hot > 0 ? lmCss('accent', 1, pal) : lmCss('hot', 1, pal);
      g.fillText(tk.text, cx, ya); g.restore();
      cx += g.measureText(tk.text).width + (tk.join ? 0 : sp); typed = true;
    }
  }
  const on = typing || f.beatPhase < 0.5;
  if (on) { g.fillStyle = lmCss('accent', 0.95, pal); g.fillRect(cx + (typed ? size * 0.08 : 0), ya - size * 0.82, size * 0.56, size * 1.04); }
  if (o.status) {
    const s = typeof o.status === 'function' ? o.status(f) : o.status;
    if (s) {
      const spin = '·✢✳✶✻✽'[Math.floor(t * 8) % 6];
      g.font = `${size * 0.62}px ${MONO}`; g.fillStyle = lmCss('accent', 0.85, pal);
      g.fillText(`${spin} ${s}`, x, y + lh * 1.25);
    }
  }
  g.restore();
}

/**
 * Centred subtitle (the warm documentary look): the line being sung, each word fading up (o.fadeIn, 0.16 s — quick
 * enough that it reads as "there" when sung) with a little rise at its own start; the line fades o.hold s after it
 * ends (or when the next one starts). One fillText per word, tracking via letterSpacing (qa measures whole words).
 * o: y, size, font, weight, track (em), color, hold, fade, fadeIn, lead (dim preview ≤ 0.3 s), since (default f.from),
 * pal, glow.
 */
function lmCaption(g, f, o = {}) {
  const pal = palOf(o.pal), t = f.t, lyr = f.lyrics, L = lyr.lines, lead = Math.min(o.lead || 0, 0.3);
  const idx = shotLines(f, o.since ?? f.from, lead);
  if (!idx.length) return;
  const ci = idx[idx.length - 1], line = L[ci], next = L[ci + 1], hold = o.hold ?? 0.9, fade = o.fade ?? 0.35;
  const endShow = Math.min(line.end + hold, next && next.words.length ? next.start - lead : Infinity);
  const la = 1 - prog(t, endShow - fade, endShow);
  if (la <= 0) return;
  const size = o.size ?? 34, track = (o.track ?? 0.14) * size, y = o.y ?? H - 140;
  g.save(); g.font = `${o.weight ?? 300} ${size}px ${o.font || SANS}`; g.textBaseline = 'alphabetic'; g.letterSpacing = `${track}px`;
  const toks = lyr.tokens(line), sp = g.measureText(' ').width;
  const ws = toks.map(tk => g.measureText(tk.text).width);
  const total = ws.reduce((s, w, i) => s + w + (toks[i].join ? 0 : sp), 0) - track;
  let cx = W / 2 - total / 2;
  toks.forEach((tk, i) => {
    let a = prog(t, tk.start, tk.start + (o.fadeIn ?? 0.16), ease.outCubic);
    if (a <= 0 && lead && t >= tk.start - lead) a = 0.15;
    if (a > 0) {
      g.save(); g.globalAlpha = a * la;
      glowText(g, lmCss(o.color ?? 'fg', 0.35, pal), o.glow ?? size * 0.35);
      g.fillStyle = lmCss(o.color ?? 'fg', 0.92, pal);
      g.fillText(tk.text, cx, y + (1 - a) * 8);
      g.restore();
    }
    cx += ws[i] + (tk.join ? 0 : sp);
  });
  g.restore();
}

/**
 * Ambient light for quiet shots: a few big soft glows drifting slowly through the frame, breathing with the low end.
 * Draw it into lmGlow() (before lmEnd) so it blooms with the rest. A sparse shot (a few points on black) changes too
 * little from frame to frame for qa's motion check (static); this gives the room itself a slow life without adding
 * a subject. o: n (3), gain (1; 0.5 for a hint), colors (palette keys, cycled: ['fg', 'accent']), seed, speed (1),
 * react (0..1, how much f.a.low swells it; 0.6), pal.
 */
function lmAmbient(gl, f, o = {}) {
  const pal = palOf(o.pal), n = o.n ?? 3, gain = o.gain ?? 1, seed = o.seed ?? 5, sp = o.speed ?? 1;
  const cols = o.colors || ['fg', 'accent'], react = o.react ?? 0.6, low = (f.a && f.a.low) || 0, t = f.t * sp;
  gl.save(); gl.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const cx = W / 2 + Math.sin(t * (0.05 + 0.017 * i) + i * 2.2 + seed) * (W * 0.16 + W * 0.11 * i);
    const cy = H / 2 + Math.cos(t * (0.04 + 0.021 * i) + i * 1.4 + seed) * (H * 0.16 + H * 0.12 * i);
    const r = W * (0.25 + 0.1 * i), a = (0.045 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.5 + i))) * gain * (1 - react * 0.5 + react * low);
    const c = cols[i % cols.length], rg = gl.createRadialGradient(cx, cy, 30, cx, cy, r);
    rg.addColorStop(0, lmCss(c, a, pal)); rg.addColorStop(1, lmCss(c, 0, pal));
    gl.fillStyle = rg; gl.fillRect(0, 0, W, H);
  }
  gl.restore();
}

/**
 * The instrument frame: thin corner brackets, top-left "id  time  name", top-right key / value readouts (o.rows:
 * [[label, value], …] or fn(f) → rows), bottom-right footnote (o.foot). o.on (0..1, e.g. lmFlick) fades it.
 */
function lmHud(g, f, o = {}) {
  const pal = palOf(o.pal), m = o.margin ?? 44, on = o.on ?? 1;
  if (on <= 0) return;
  g.save(); g.globalAlpha = on;
  if (o.corners !== false) {
    g.strokeStyle = lmCss('dim', 0.75, pal); g.lineWidth = 1.5; const L = 26;
    for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke();
    }
  }
  g.font = `14px ${MONO}`; g.textBaseline = 'middle';
  const head = [o.id ?? '', (o.time ?? f.t).toFixed(1).padStart(5, '0'), o.name ?? ''].filter(s => s !== '').join('   ');
  g.fillStyle = lmCss('dim', 0.95, pal); g.fillText(head, m + 36, m + 7);
  const rows = typeof o.rows === 'function' ? o.rows(f) : o.rows;
  if (rows) {
    g.font = `15px ${MONO}`;
    rows.forEach(([k, v], i) => {
      const yy = m + 104 + i * 23.5;
      g.fillStyle = lmCss('dim', 0.95, pal); g.fillText(String(k), W - m - 376, yy);
      g.fillStyle = lmCss(o.valueColor ?? 'accent', 0.95, pal); g.fillText(String(v), W - m - 266, yy);
    });
  }
  if (o.foot) { g.font = `14px ${MONO}`; g.textAlign = 'right'; g.fillStyle = lmCss('dim', 0.9, pal); g.fillText(o.foot, W - m - 36, H - m - 7); }
  g.restore();
}

/** Chapter tag, top left: "01 / 06 ——— title  sub". o: x, y, alpha, pal. */
function lmSection(g, i, n, title, sub, o = {}) {
  const pal = palOf(o.pal), x = o.x ?? 96, y = o.y ?? 102;
  g.save(); g.globalAlpha = o.alpha ?? 1; g.textBaseline = 'middle';
  g.font = `16px ${MONO}`; g.letterSpacing = '4px';
  const idx = `${String(i).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  g.fillStyle = lmCss('accent', 0.95, pal); g.fillText(idx, x, y);
  let cx = x + g.measureText(idx).width + 18;
  g.strokeStyle = lmCss('dim', 0.9, pal); g.lineWidth = 1; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + 60, y); g.stroke(); cx += 76;
  g.letterSpacing = '3px'; g.font = `400 22px ${SANS}`; g.fillStyle = lmCss('fg', 0.95, pal); g.fillText(title, cx, y);
  cx += g.measureText(title).width + 22;
  if (sub) { g.font = `15px ${MONO}`; g.letterSpacing = '5px'; g.fillStyle = lmCss('dim', 1, pal); g.fillText(sub, cx, y + 1); }
  g.restore();
}

/** Small wide-tracked label ("1958 · PERCEPTRON"). o: size, track (em), color, align, alpha, font. */
function lmTag(g, text, x, y, o = {}) {
  const pal = palOf(o.pal), size = o.size ?? 15;
  g.save(); g.globalAlpha = o.alpha ?? 1; g.font = `${o.weight ?? 400} ${size}px ${o.font || MONO}`; g.textBaseline = 'middle';
  g.letterSpacing = `${(o.track ?? 0.3) * size}px`; g.fillStyle = lmCss(o.color ?? 'dim', 1, pal);
  const w = g.measureText(text).width - (o.track ?? 0.3) * size;
  g.fillText(text, o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2, y);
  g.restore();
}

/**
 * Callout: a dot on (x, y), a leader up/out to an elbow, a short run, then the text. o: dx, dy, run, color, size,
 * draw (0..1 animates the leader, then the text), font.
 */
function lmLabel(g, x, y, text, o = {}) {
  const pal = palOf(o.pal), dx = o.dx ?? 60, dy = o.dy ?? -50, run = o.run ?? 46, k = o.draw ?? 1, sx = Math.sign(dx) || 1;
  if (k <= 0) return;
  const ex = x + dx, ey = y + dy, qx = ex + sx * run;
  const segs = [[x, y, ex, ey], [ex, ey, qx, ey]], L1 = Math.hypot(dx, dy), Lt = L1 + run;
  g.save(); g.strokeStyle = lmCss(o.line ?? 'dim', 0.95, pal); g.lineWidth = 1.2;
  g.fillStyle = lmCss(o.color ?? 'fg', 1, pal); g.beginPath(); g.arc(x, y, o.dot ?? 3, 0, TAU); g.fill();
  let left = clamp(k * 1.4) * Lt;
  g.beginPath(); g.moveTo(x, y);
  for (const [ax, ay, bx, by] of segs) { const l = Math.hypot(bx - ax, by - ay), u = clamp(left / l); g.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u); left -= l; if (left <= 0) break; }
  g.stroke();
  const ta = prog(k, 0.6, 1);
  if (ta > 0) {
    g.globalAlpha = ta; g.font = `${o.size ?? 16}px ${o.font || MONO}`; g.textBaseline = 'middle'; g.textAlign = sx > 0 ? 'left' : 'right';
    if (o.knock ?? pal.mode === 'ink') {                                      // clear the drawing behind the text
      const tw = g.measureText(text).width, sz = o.size ?? 16, tx = sx > 0 ? qx + 4 : qx - 4 - tw - 12;
      g.fillStyle = lmCss('bg2', 0.92, pal); g.fillRect(tx, ey - sz * 0.8, tw + 12, sz * 1.6);
    }
    g.fillStyle = lmCss(o.color ?? 'fg', 1, pal); g.fillText(text, qx + sx * 10, ey);
  }
  g.restore();
}

const GLYPHS = '01<>/\\=+*#%&$@{}[]_-~:;';
/**
 * Big wide-tracked word, centred on (x, y). Draw it into lmGlow() so it blooms. o: size, font, weight, track (em),
 * color, glow, align, reveal (0..1 left to right), decode (0..1: scrambled glyphs resolve into the letters),
 * glitch (0..1: letters jump, swap colour, drop out), t (time for the scramble), alpha.
 */
function lmBig(g, text, x, y, o = {}) {
  const pal = palOf(o.pal), size = o.size ?? 96, track = (o.track ?? 0.5) * size, chars = [...String(text)], n = chars.length;
  const tk = Math.floor((o.t ?? 0) * 24);
  g.save(); g.globalAlpha = o.alpha ?? 1; g.font = `${o.weight ?? 500} ${size}px ${o.font || MONO}`; g.textBaseline = 'middle';
  const ws = chars.map(c => g.measureText(c).width), total = ws.reduce((s, w) => s + w + track, 0) - track;
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  glowText(g, lmCss(o.color ?? 'fg', 0.6, pal), o.glow ?? size * 0.22);
  chars.forEach((c, i) => {
    const u = n > 1 ? i / (n - 1) : 0;
    let ch = c, col = o.color ?? 'fg', a = 1, jy = 0, jx = 0;
    if (o.reveal != null && o.reveal < 1) { const r = clamp((o.reveal * (n + 2) - i) / 2); a *= r > 0 && r < 1 ? (hash(i, tk, 3) < r ? 1 : 0.15) : r; }
    if (o.decode != null && o.decode < 1 && c !== ' ') {
      const th = u * 0.75 + hash(i, 5) * 0.25;
      if (o.decode < th) { ch = GLYPHS[Math.floor(hash(i, tk, 1) * GLYPHS.length)]; col = 'accent'; a *= o.decode > th - 0.35 ? 0.85 : 0.35; }
    }
    if (o.glitch && hash(i, tk, 9) < o.glitch * 0.6) { jy = (hash(i, tk, 10) - 0.5) * size * 0.5 * o.glitch; jx = (hash(i, tk, 12) - 0.5) * size * 0.2 * o.glitch; if (hash(i, tk, 11) < 0.5) col = 'accent'; if (hash(i, tk, 13) < o.glitch * 0.25) a = 0; }
    if (a > 0 && c !== ' ') { g.globalAlpha = (o.alpha ?? 1) * a; g.fillStyle = lmCss(col, 1, pal); g.fillText(ch, cx + jx, y + jy); }
    cx += ws[i] + track;
  });
  g.restore();
  return total;
}

const KW = /\b(const|let|var|function|return|for|while|if|else|new|this|null|true|false|class|import|from|export|object|void|async|await)\b/;
/**
 * Code block with line numbers, typed out: o.chars = how many characters are shown (default all), size, lh,
 * numbers, cursor, pal. Keywords take the accent, numbers and strings the fg, comments the dim colour.
 */
function lmCode(g, src, x, y, o = {}) {
  const pal = palOf(o.pal), size = o.size ?? 26, lh = size * (o.lh ?? 1.55), lines = String(src).split('\n');
  let left = o.chars ?? Infinity, cur = null;
  g.save(); g.font = `${size}px ${MONO}`; g.textBaseline = 'alphabetic';
  const cw = g.measureText('M').width;
  lines.forEach((ln, i) => {
    if (left < 0) return;
    const yy = y + i * lh, show = ln.slice(0, Math.max(0, left));
    if (o.numbers !== false) { g.textAlign = 'right'; g.fillStyle = lmCss('dim', 0.8, pal); g.font = `${size * 0.7}px ${MONO}`; g.fillText(String(i + 1), x - cw * 1.2, yy); g.textAlign = 'left'; g.font = `${size}px ${MONO}`; }
    const parts = show.split(/(\/\/.*$|"[^"]*"?|'[^']*'?|\b\d[\d.]*\b|\b[A-Za-z_]\w*\b)/);
    let cx = x;
    for (const p of parts) {
      if (!p) continue;
      const col = p.startsWith('//') ? ['dim', 0.9] : KW.test(p) && /^\w+$/.test(p) ? ['accent', 1] : /^["'\d]/.test(p) ? ['hot', 1] : ['fg', 0.92];
      g.fillStyle = lmCss(col[0], col[1], pal); g.fillText(p, cx, yy); cx += g.measureText(p).width;
    }
    if (left <= ln.length) cur = [cx, yy];
    left -= ln.length + 1;
  });
  if (o.cursor !== false && cur) { g.fillStyle = lmCss('accent', 0.95, pal); g.fillRect(cur[0] + 2, cur[1] - size * 0.8, cw * 0.9, size); }
  g.restore();
}
/** The source of a scene's functions (render, init, helpers) — code to use as texture. */
function lmSource(name) {
  const d = MV.scenes[name]; if (!d) return '';
  return Object.values(d).filter(v => typeof v === 'function').map(fn => fn.toString()).join('\n\n');
}
/** Full-frame dim code texture, scrolling: o.size, lh, alpha, scroll (px), x, color, pal. */
function lmCodeBg(g, src, o = {}) {
  const pal = palOf(o.pal), size = o.size ?? 14, lh = size * (o.lh ?? 1.5), lines = String(src).split('\n').filter(s => s.trim());
  if (!lines.length) return;
  g.save(); g.font = `${size}px ${MONO}`; g.textBaseline = 'alphabetic'; g.fillStyle = lmCss(o.color ?? 'dim', o.alpha ?? 0.35, pal);
  const off = (o.scroll ?? 0) % (lines.length * lh), k0 = Math.floor(off / lh);
  for (let r = -1; r * lh < H + lh; r++) { const k = ((k0 + r) % lines.length + lines.length) % lines.length; g.fillText(lines[k], o.x ?? 0, r * lh - (off % lh) + lh); }
  g.restore();
}

/** For kits that draw into the same light buffer before the bloom (kits/solid.js). Not a scene API. */
function lmGL() {
  glInit();
  return { gl, W, H, light: LIGHT, fmt: FMT, program, fullscreen, target, bindTex, bufFor, attrib, camUniforms, rgb, emit, lmDepth,
    pal: () => S.pal, VAO, HASH, VS_FULL };
}
function lmOnBegin(fn) { BEGIN.push(fn); }

MV.lumen = { LUMEN, MONO, SANS, lmGL, lmOnBegin, lmBegin, lmEnd, lmPal, lmPoints, lmLines, lmGlow, lmCamera, lmOrbit, lmScreen, lmModel, lmXf, LG, lmMorph,
  lmTerminal, lmCaption, lmAmbient, lmHud, lmSection, lmTag, lmLabel, lmBig, lmCode, lmCodeBg, lmSource, lmCount, lmFmt, lmFlick, lmCss, glitchPass };
Object.assign(G, { LUMEN, LM_MONO: MONO, LM_SANS: SANS, lmGL, lmOnBegin, lmBegin, lmEnd, lmPal, lmPoints, lmLines, lmGlow, lmCamera, lmOrbit, lmScreen, lmModel, lmXf, LG, lmMorph,
  lmTerminal, lmCaption, lmAmbient, lmHud, lmSection, lmTag, lmLabel, lmBig, lmCode, lmCodeBg, lmSource, lmCount, lmFmt, lmFlick, lmCss });
})(window);
