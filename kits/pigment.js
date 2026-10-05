// mv-kit style kit: pigment.js — a WebGL2 compositor for pigment on paper, clay and glaze.
//
// Two ways in:
//
// 1. Layers (new work). Draw ink DENSITY into three 2D layers, then composite them in one GPU pass:
//      const L = pigmentLayers();                 // W×H by default; pigmentLayers(w, h) for a texture (e.g. a vase unwrap)
//      L.clear();
//      L.wet.fill(...)   // washes, blooms, 分水: bleeds into the paper, pools at its edges, granulates
//      L.dry.stroke(...) // lines, dry brush: crisp, bites into the paper tooth
//      L.col.fill(...)   // real colour (a seal, 釉里红, 天青 sky): sits on the paper, uneven
//      pigmentDraw(g, L, { preset: 'cobalt', offset: [camX, 0] });
//    Only alpha counts on wet / dry (draw with ink(a) or any colour); density 0..1 maps to colour through the
//    preset's ramp, measured on its reference paper. The paper itself is procedural and world-anchored (offset,
//    scale), so it doesn't swim when the camera pans. paper: 'none' gives white paper — draw the result with
//    globalCompositeOperation = 'multiply' onto a surface you painted yourself (a lit vase, a photo…).
//
// 2. Pass (finished frames). project.post.pigment = { rim, wick } (or a scene's render() returning it) runs a
//    full-frame pass for ink already drawn on light paper: washes pool darker at their edges (rim) and ink wicks
//    softly outward into the paper (wick). Density is read from luminance against post.pigment.paper.
//
// Presets (override any field in the options):
//   ink     水墨 on xuan: warm paper, fibres, wide wet bleed, strong edge pooling, granulation
//   raw     生料 on 素胚 (unfired): matte clay, fine grain and iron flecks, little bleed, strong tooth
//   cobalt  青花 on glaze (fired): smooth glaze, 分水 edge pooling, 晕散 halo round dense lines, 铁锈斑 spots
// Options: bleed (px), rim (0..2 edge pooling), halo (0..1), spots (0..1), gran (0..1 granulation),
//   tooth (0..1 dry-brush paper tooth), jitter (px, fibre jitter of dry ink), paper ('xuan'|'biscuit'|'glaze'|
//   'none'), paperColor, ramp [[density, '#hex'], …] with paperRef (the paper those colours sit on),
//   spotColor, offset [x, y] (world anchor, px), scale (paper zoom), seed.
// Deterministic (hash noise only). Needs WebGL2 (every current Chrome; the exporter asks for the GPU).
(function (G) {
'use strict';
const MV = G.MV;

const PRESETS = {
  ink: { paper: 'xuan', paperColor: '#EDE6D6', paperRef: '#EDE6D6',
    ramp: [[0.2, '#BDB6A9'], [0.42, '#8A857C'], [0.64, '#4E4A44'], [0.8, '#2E2B27'], [0.94, '#151311']],
    bleed: 5, rim: 1.1, halo: 0, spots: 0, gran: 0.55, tooth: 0.6, jitter: 1.6, spotColor: '#151311' },
  raw: { paper: 'biscuit', paperColor: '#E4DCCB', paperRef: '#E4DCCB',
    ramp: [[0.3, '#A8A297'], [0.6, '#6E6A64'], [0.92, '#34322F']],
    bleed: 1.2, rim: 0.45, halo: 0, spots: 0, gran: 0.9, tooth: 0.95, jitter: 1.2, spotColor: '#34322F' },
  cobalt: { paper: 'glaze', paperColor: '#F1F3EE', paperRef: '#F1F3EE',
    ramp: [[0.16, '#BDCCE5'], [0.34, '#7593C8'], [0.6, '#3558A6'], [0.82, '#1E3A8A'], [0.96, '#0F1C48']],
    bleed: 2.2, rim: 1.3, halo: 0.7, spots: 0.75, gran: 0.25, tooth: 0.15, jitter: 0.8, spotColor: '#0A1233' },
};
const PAPER_TYPE = { none: 0, xuan: 1, biscuit: 2, glaze: 3 };

const hex3 = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

// ---------------------------------------------------------------- GLSL
// SC: rendering above 1× (MV.scale is fixed for the run): only then are the scale-aware expressions compiled in, so
// the 1× shaders are exactly the old ones (bit-identical 1080p).
const SC = (MV.scale || 1) !== 1;
const VS = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }`;

const NOISE = `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0., w = .5; for (int i = 0; i < 5; i++) { a += w * vn(p); p = p * 2.03 + 17.1; w *= .5; } return a; }
const vec2 PD[12] = vec2[12](vec2(-.326, -.406), vec2(-.840, -.074), vec2(-.696, .457), vec2(-.203, .621), vec2(.962, -.195), vec2(.473, -.480),
  vec2(.519, .767), vec2(.185, -.893), vec2(.507, .064), vec2(.896, .412), vec2(-.322, -.933), vec2(-.792, -.598));
`;

// Layers → pigment on paper
const FS_COMP = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uWet, uDry, uCol, uRamp;
uniform vec2 uRes;        // the layers' DESIGN size (px); uK = texture px per design px (MV.scale)
uniform float uK;
uniform vec3 uPaper, uPaperRef, uSpot;
uniform int uType;
uniform vec3 uAnchor;     // world offset x, y (px) and scale
uniform float uSeed;
uniform vec4 uWetP;       // bleed px, rim, gran, halo
uniform vec4 uDryP;       // tooth, jitter px, spots, -
${NOISE}
float fiber(vec2 p, float ang) { float c = cos(ang), s = sin(ang); vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  return smoothstep(.78, .95, vn(vec2(q.x * .018, q.y * .9))); }
vec3 paper(vec2 p, float zoom) {
  if (uType == 0) return uPaper;
  float fine = clamp(zoom * 1.2, 0., 1.);                       // fine texture fades when zoomed out (no shimmer)
  if (uType == 1) {                                             // xuan: cloud mottling, long fibres, grain
    float cloud = fbm(p * .0028) - .5, cloud2 = fbm(p * .011 + 3.) - .5;
    float fb = fiber(p, .35) + fiber(p + 91., 2.1) * .8 + fiber(p * 1.7 + 13., 1.2) * .6;
    vec3 c = uPaper * (1. + cloud * .07 + cloud2 * .035);
    c += vec3(1., .99, .96) * fb * .02 * fine;
    return c * (1. + (vn(p * .9) - .5) * .035 * fine);
  }
  if (uType == 2) {                                             // biscuit: matte clay, grain, iron flecks, throwing lines
    float cloud = fbm(p * .004) - .5, speck = vn(p * .75) - .5;
    float fleck = smoothstep(.955, .995, vn(p * .21 + 7.)) * smoothstep(.3, .7, vn(p * .02 + 2.));
    float ring = sin(p.y * .19 + fbm(vec2(p.x * .003, p.y * .015)) * 7.) * .5 + .5;
    vec3 c = uPaper * (1. + cloud * .05 + speck * .07 * fine - ring * .008);
    return c * (1. - fleck * .22 * fine);
  }
  // glaze: almost smooth; faint drift towards blue-green, orange peel, tiny bubbles
  float cloud = fbm(p * .002) - .5, peel = vn(p * .11) - .5;
  float bub = smoothstep(.986, .998, vn(p * .45 + 31.));
  vec3 c = uPaper * (1. + cloud * .018 + peel * .012 * fine) + vec3(-.006, .002, .008) * cloud * 3.;
  return c + bub * .03 * fine;
}
float spots(vec2 p) {                  // Worley dots: some 9-px cells hold one spot of radius 1.2–3.8 px
  vec2 cell = floor(p / 9.); float s = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = cell + vec2(i, j); float h = h21(c + 3.1);
    if (h < .74) continue;
    vec2 pos = (c + vec2(h21(c + 7.), h21(c + 13.))) * 9.;
    float r = 1.2 + 2.6 * h21(c + 19.), d = length(p - pos);
    s = max(s, max(1. - smoothstep(r * .55, r * 1.15, d), .35 * (1. - smoothstep(r, r * 2.4, d))));
  }
  return s;
}
float tapW(vec2 fc, float r, float ang) {
  float c = cos(ang), s = sin(ang), a = 0.;
  for (int i = 0; i < 12; i++) { vec2 d = PD[i]; d = vec2(c * d.x - s * d.y, s * d.x + c * d.y); a += texture(uWet, (fc + d * r) / uRes).a; }
  return a / 12.;
}
void main() {
  vec2 fc = ${SC ? 'vec2(gl_FragCoord.x, uRes.y * uK - gl_FragCoord.y) / uK' : 'vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y)'}, uv = fc / uRes;   // design px: the same paper at any scale
  vec2 p = (fc + uAnchor.xy) / uAnchor.z + uSeed * 97.;
  float g1 = vn(p * .35), g2 = fbm(p * .06);
  // wet: noisy bleed + pigment pooling at the edges (small blur - large blur) + granulation
  float s0 = texture(uWet, uv).a, wet = s0;
  if (uWetP.x > .05) {
    float ang = vn(p * .05) * 6.2832;
    float a = tapW(fc, uWetP.x, ang), sm = tapW(fc, uWetP.x * .4, ang + 1.3);
    float R = uWetP.x * 3.2, lod = max(0., log2(R) - 1.2)${SC ? ' + log2(uK)' : ''}, big = 0.;   // wide blur: jittered taps on a mip level (no box steps)
    for (int i = 0; i < 6; i++) { vec2 d = PD[i * 2]; big += textureLod(uWet, (fc + vec2(cos(ang) * d.x - sin(ang) * d.y, sin(ang) * d.x + cos(ang) * d.y) * R * .8) / uRes, lod).a; }
    big /= 6.;
    wet = mix(s0, a, .72) * (.88 + .2 * g2) + max(0., sm - big) * uWetP.y * (.8 + .5 * g1);
  }
  float mid = smoothstep(.04, .4, wet) * (1. - smoothstep(.75, 1., wet));
  wet *= mix(1., .8 + .4 * vn(p * .9 + 5.), uWetP.z * mid);
  // dry: fibre jitter, paper tooth
  vec2 j = vec2(vn(p * .7), vn(p * .7 + 5.)) - .5;
  float dry = texture(uDry, (fc + j * uDryP.y) / uRes).a;
  float tooth = smoothstep(.6, .9, vn(p * .55 + 3.)) * .5 * uDryP.x;
  dry *= 1. - tooth * (1. - dry * .5);
  float D = 1. - (1. - clamp(wet, 0., 1.)) * (1. - clamp(dry, 0., 1.));
  // 晕散: dense pigment diffuses a pale halo into the glaze round it
  if (uWetP.w > 0.) {
    float l1 = 1.6${SC ? ' + log2(uK)' : ''}, l2 = 2.6${SC ? ' + log2(uK)' : ''};
    float hd = max(max(textureLod(uWet, uv, l1).a, textureLod(uDry, uv, l1).a), .8 * max(textureLod(uWet, uv, l2).a, textureLod(uDry, uv, l2).a));
    D = max(D, uWetP.w * smoothstep(.25, .9, hd) * .5 * (.75 + .5 * g1));
  }
  // 铁锈斑: small round dark spots with a soft dark surround, clustered, only where the pigment is heavy
  float spot = 0.;
  if (uDryP.z > 0. && D > .5) spot = uDryP.z * smoothstep(.55, .85, D) * spots(p) * smoothstep(.3, .65, vn(p * .025 + 4.));
  vec3 pc = paper(p, uAnchor.z);
  vec3 c = pc * texture(uRamp, vec2(clamp(D, 0., 1.) * 255. / 256. + .5 / 256., .5)).rgb;
  c = mix(c, pc * uSpot, clamp(spot, 0., 1.));
  // colour layer: sits on the paper (takes its texture), goes on unevenly
  vec4 col = texture(uCol, uv);
  if (col.a > 0.) c = mix(c, col.rgb * pc / uPaperRef, col.a * (smoothstep(.2, .45, vn(p * .8 + 11.)) * .22 + .78));
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

// Finished frame → edge pooling + wicking
const FS_PASS = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform vec3 uPaperRef;
uniform vec4 uP;          // rim, wick, wick radius px, rim radius px (output px: design px × uK)
uniform float uK;
${NOISE}
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
float Lp;
float den(vec3 c) { float d = 1. - lum(c) / Lp; return d * smoothstep(.03, .1, d); }
float tapD(vec2 fc, float r, float ang) {
  float c = cos(ang), s = sin(ang), a = 0.;
  for (int i = 0; i < 12; i++) { vec2 d = PD[i]; d = vec2(c * d.x - s * d.y, s * d.x + c * d.y); a += den(texture(uSrc, (fc + d * r) / uRes).rgb); }
  return a / 12.;
}
void main() {
  Lp = lum(uPaperRef);
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y), uv = fc / uRes;
  vec3 c = texture(uSrc, uv).rgb;
  float D = den(c), ang = h21(floor(fc / ${SC ? '(3. * uK)' : '3.'})) * 6.2832;
  // rim: small blur - large blur of the density, positive part = the inside edge of every wash
  float sm = tapD(fc, uP.w * .25, ang), big = 0., lod = max(0., log2(uP.w) - 1.2);
  for (int i = 0; i < 6; i++) { vec2 d = PD[i * 2]; big += den(textureLod(uSrc, (fc + vec2(cos(ang) * d.x - sin(ang) * d.y, sin(ang) * d.x + cos(ang) * d.y) * uP.w * .8) / uRes, lod).rgb); }
  big /= 6.;
  float rim = max(0., sm - big) * smoothstep(.02, .15, D);
  // wick: where the neighbourhood holds more ink than this pixel, some of it seeps in (outward only)
  float nb = tapD(fc, uP.z, ang + 2.1);
  float wick = max(0., nb - D) * (.75 + .5 * vn(fc${SC ? ' / uK' : ''} * .08));
  float k = clamp(1. - uP.x * rim * 1.2 - uP.y * wick * .9, 0., 1.);
  // darken towards the ink's own hue: multiply by the paper-relative transmittance
  o = vec4(c * k, 1.);
}`;

// ---------------------------------------------------------------- GL plumbing
let GLC = null, gl = null;
const progs = {}, tex = {}, ramps = {};
function glInit() {
  if (gl) return;
  GLC = document.createElement('canvas'); GLC.width = W; GLC.height = H;
  gl = GLC.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  if (!gl) throw new Error('pigment.js needs WebGL2');
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}
function program(name, fs) {
  if (progs[name]) return progs[name];
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`pigment.js ${name}: ${gl.getShaderInfoLog(s)}`); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`pigment.js ${name}: ${gl.getProgramInfoLog(p)}`);
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return (progs[name] = { p, u });
}
/** Upload a canvas into texture unit `unit` (with mipmaps when asked). */
function upload(key, unit, src, mips) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  let t = tex[key]; if (!t) { t = tex[key] = gl.createTexture(); }
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (mips) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
  else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}
/** The density → transmittance ramp (256×1), relative to the paper the preset's colours were measured on. */
function rampTex(unit, ramp, paperRef) {
  const key = JSON.stringify([ramp, paperRef]);
  gl.activeTexture(gl.TEXTURE0 + unit);
  if (ramps[key]) { gl.bindTexture(gl.TEXTURE_2D, ramps[key]); return; }
  const P = hex3(paperRef), stops = [[0, [1, 1, 1]], ...ramp.map(([d, c]) => [d, hex3(c).map((v, i) => Math.min(1, v / P[i]))])];
  const px = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const d = i / 255; let k = stops.length - 1;
    for (let s = 1; s < stops.length; s++) if (d <= stops[s][0]) { k = s; break; }
    const [d0, c0] = stops[Math.max(0, k - 1)], [d1, c1] = stops[k], u = d >= d1 ? 1 : clamp((d - d0) / (d1 - d0 || 1));
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.round(255 * Math.exp(lerp(Math.log(Math.max(1e-3, c0[c])), Math.log(Math.max(1e-3, c1[c])), u)));
    px[i * 4 + 3] = 255;
  }
  const t = ramps[key] = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  for (const [k2, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k2, v);
}
function run(w, h, k = 1) {      // w × h output px; k = px per design px (drawImage(GLC, …) then takes design units)
  if (GLC.width !== w || GLC.height !== h) { GLC.width = w; GLC.height = h; }
  if (k !== 1) GLC.__k = k; else delete GLC.__k;
  gl.viewport(0, 0, w, h);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------------------------------------------------------------- layers API
function pigmentLayers(w = W, h = H) {
  // w × h DESIGN units; the layers are output-scale (MV.scale × the pixels: sharp at 4K), drawn into in design units
  const L = { w, h, canvases: {} };
  for (const k of ['wet', 'dry', 'col']) { L.canvases[k] = mkHi(w, h); L[k] = L.canvases[k].getContext('2d'); }
  L.pw = L.canvases.wet.width; L.ph = L.canvases.wet.height; L.k = L.pw / Math.max(1, Math.round(w));
  L.clear = () => { for (const k of ['wet', 'dry', 'col']) { const c = L[k]; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, w, h); } return L; };
  return L;
}

function opts(o = {}) {
  const base = PRESETS[o.preset || 'ink'] || PRESETS.ink;
  return { ...base, ...o };
}

/**
 * Composite the layers; returns the WebGL canvas (L.w × L.h). Draw it right away (the next call reuses it),
 * or use pigmentDraw.
 */
function pigmentComp(L, o = {}) {
  glInit();
  const q = opts(o), pr = program('comp', FS_COMP), u = pr.u;
  gl.useProgram(pr.p);
  upload('wet', 0, L.canvases.wet, true); upload('dry', 1, L.canvases.dry, true); upload('col', 2, L.canvases.col, false);
  rampTex(3, q.ramp, q.paperRef);
  gl.uniform1i(u.uWet, 0); gl.uniform1i(u.uDry, 1); gl.uniform1i(u.uCol, 2); gl.uniform1i(u.uRamp, 3);
  gl.uniform2f(u.uRes, L.pw / L.k, L.ph / L.k); gl.uniform1f(u.uK, L.k);
  const type = PAPER_TYPE[q.paper] ?? 1;
  gl.uniform3fv(u.uPaper, type === 0 ? [1, 1, 1] : hex3(q.paperColor || q.paperRef));
  gl.uniform3fv(u.uPaperRef, hex3(q.paperRef));
  gl.uniform3fv(u.uSpot, hex3(q.spotColor).map((v, i) => Math.min(1, v / hex3(q.paperRef)[i])));
  gl.uniform1i(u.uType, type);
  const off = q.offset || [0, 0];
  gl.uniform3f(u.uAnchor, off[0], off[1], q.scale || 1);
  gl.uniform1f(u.uSeed, q.seed || 0);
  gl.uniform4f(u.uWetP, q.bleed, q.rim, q.gran, q.halo);
  gl.uniform4f(u.uDryP, q.tooth, q.jitter, q.spots, 0);
  run(L.pw, L.ph, L.k);
  return GLC;
}

/** Composite and draw at (x, y) on g (optionally scaled to w × h). */
function pigmentDraw(g, L, o = {}, x = 0, y = 0, w = L.w, h = L.h) {
  const c = pigmentComp(L, o);
  g.drawImage(c, 0, 0, L.w, L.h, x, y, w, h);
}

// ---------------------------------------------------------------- finished-frame pass (post filter)
const PASS_DEFAULTS = { rim: 0.8, wick: 0.5, wickR: 3, rimR: 14, paper: '#EDE6D6' };
function pigmentPass(src, o = {}) {
  glInit();
  const q = { ...PASS_DEFAULTS, ...o }, pr = program('pass', FS_PASS), u = pr.u;
  gl.useProgram(pr.p);
  upload('src', 0, src, true);
  gl.uniform1i(u.uSrc, 0);
  const k = src.__k || 1;                                       // the frame is output-scale: radii are design px × k
  gl.uniform2f(u.uRes, src.width, src.height); gl.uniform1f(u.uK, k);
  gl.uniform3fv(u.uPaperRef, hex3(q.paper));
  gl.uniform4f(u.uP, q.rim, q.wick, q.wickR * k, q.rimR * k);
  run(src.width, src.height, k);
  const g = src.getContext('2d');
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.filter = 'none';
  g.drawImage(GLC, 0, 0); g.restore();
}
if (MV.postFilter) MV.postFilter((src, q) => { if (q.pigment) pigmentPass(src, q.pigment === true ? {} : q.pigment); });

MV.pigment = { PRESETS, pigmentLayers, pigmentComp, pigmentDraw, pigmentPass };
Object.assign(G, { PIGMENT: PRESETS, pigmentLayers, pigmentComp, pigmentDraw, pigmentPass });
})(window);
