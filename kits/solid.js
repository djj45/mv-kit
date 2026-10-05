// mv-kit style kit: solid.js — surfaces and shaders for lumen.js. Needs lumen (list "lumen" before "solid" in
// project.kits). lumen's rule is "only light": points and lines, added together. solid.js adds the two things that
// rule cannot draw, into the SAME light buffer, before lumen's bloom / tone / aberration, so they look like one picture:
//
//   1. Lit triangle meshes with a depth buffer: opaque lit solids (diffuse + specular + fresnel rim + a dark studio
//      reflection), glass (refracts whatever was drawn before it, chromatic dispersion, fresnel reflection, tint), and
//      x-ray / hologram surfaces (additive rim light). Antialiased (MSAA where the GPU allows), contour bands on any
//      material. Points and lines drawn after a solid can hide behind it: lmPoints(cam, P, { occlude: true }).
//   2. A fullscreen GLSL pass (raymarching, fields, heat maps): you write `vec4 shade(vec2 px)`, it gets the lumen
//      camera's ray, the palette and SDF / noise helpers, and its light goes through the same bloom. It can write
//      depth, so lumen points and lines fly behind the raymarched structure.
//
//   const cam = lmOrbit({ yaw: f.t * .2, pitch: .2, dist: 5 });
//   lmBegin('rose');
//   lmPoints(cam, this.wall, { size: 1.3 });                     // background: drawn first, seen through the glass
//   smGlass(cam, this.heart, { model, ior: 1.45, tint: 'accent' }, occ => {
//     lmPoints(cam, this.ring, { occlude: occ });                // called twice: the half behind, then the half in front
//   });
//   smMesh(cam, this.bolt, { color: 'fg', rim: .8 });            // an opaque lit solid
//   smShader('field', SRC, { cam, t: f.t, u: { uK: .4 }, res: .75, depth: true });
//   lmEnd(g);
//
// Meshes: { pos: Float32Array xyz…, nrm: Float32Array xyz…, idx?: Uint32Array, col?: Float32Array rgb… }. Build them
// once in init() with SG.*: SG.implicit (marching tetrahedra on any f(x, y, z) < 0 = inside: hearts, metaballs,
// algebraic surfaces), SG.sphere, SG.tube, SG.box, SG.height (y = f(x, z) on a grid; SG.heightSet re-shapes it in place
// for a vibrating plate), SG.merge (parts with their own model and colour: ball-and-stick molecules), SG.xf, SG.wire
// (a mesh's edges as a lumen segment buffer, for glowing edges over a solid).
//
// Deterministic (no state carried between frames). Needs WebGL2 (the exporter asks for the GPU). On a software
// renderer (SwiftShader) it works but heavy shaders are slow: smShader's o.res renders a soft pass at lower resolution.
(function (G) {
'use strict';
const MV = G.MV;
if (!G.lmGL) throw new Error('solid.js needs lumen.js: list "lumen" before "solid" in project.kits');

// ---------------------------------------------------------------- GLSL
const VS_MESH = `#version 300 es
precision highp float;
layout(location=0) in vec3 P;
layout(location=1) in vec3 N;
layout(location=2) in vec3 C;
uniform mat4 uVP, uM;
invariant gl_Position;
out vec3 vW, vN, vC;
void main() { vec4 w = uM * vec4(P, 1.); vW = w.xyz; vN = mat3(uM) * N; vC = C; gl_Position = uVP * w; }`;

const FS_MESH = `#version 300 es
precision highp float;
in vec3 vW, vN, vC; out vec4 o;
uniform vec3 uEye, uColor, uRimC, uSpecC, uTint, uBandC, uL1, uL2;
uniform float uMode, uAmb, uDiff, uSpec, uShine, uRim, uRimP, uEnv, uGain, uInk, uTwo, uFog;
uniform float uRefr, uDisp, uTintK, uGlow, uRough;
uniform vec4 uBand;            // axis xyz, spacing (0 = off)
uniform vec2 uBandW;           // line width px, gain
uniform vec2 uRes;
uniform mat4 uV;
uniform sampler2D uBack;
float softbox(vec3 r, vec3 d, vec2 s) {   // a rectangular light seen in direction d, half-size s (tangent units)
  float k = dot(r, d); if (k <= 0.) return 0.;
  vec3 x = normalize(cross(vec3(0., 1., 0.), d)), y = cross(d, x);
  vec2 e = smoothstep(s, s * .6, abs(vec2(dot(r, x), dot(r, y)) / k));
  return e.x * e.y;
}
vec3 env(vec3 r) {             // a dark studio: floor-to-ceiling gradient, a wide key softbox, a tall strip, a low kicker
  vec3 c = mix(vec3(.01), vec3(.11), smoothstep(-.25, .85, r.y));
  c += vec3(1.) * softbox(r, normalize(vec3(.5, .72, .48)), vec2(.12, .04)) * 1.4;
  c += vec3(.85, .92, 1.) * softbox(r, normalize(vec3(-.78, .3, .55)), vec2(.05, .3)) * 1.2;
  c += vec3(.6) * softbox(r, normalize(vec3(.2, -.25, -1.)), vec2(.3, .04)) * .5;
  return c;
}
vec3 back(vec2 uv) {
  if (uRough <= 0.) return texture(uBack, uv).rgb;
  vec2 h = uRough / uRes;
  return (texture(uBack, uv).rgb * 2. + texture(uBack, uv + vec2(h.x, h.y)).rgb + texture(uBack, uv - vec2(h.x, h.y)).rgb
        + texture(uBack, uv + vec2(h.x, -h.y)).rgb + texture(uBack, uv - vec2(h.x, -h.y)).rgb) / 6.;
}
void main() {
  vec3 n = normalize(vN), v = normalize(uEye - vW);
  if (uTwo > .5 && dot(n, v) < 0.) n = -n;
  float nv = clamp(dot(n, v), 0., 1.), fr = pow(1. - nv, uRimP), F = .04 + .96 * pow(1. - nv, 5.);
  vec3 h1 = normalize(uL1 + v), h2 = normalize(uL2 + v);
  float s = pow(max(dot(n, h1), 0.), uShine) + .45 * pow(max(dot(n, h2), 0.), uShine);
  vec3 c;
  if (uMode < .5) {                                         // lit solid
    float d = max(dot(n, uL1), 0.) + .3 * max(dot(n, uL2), 0.);
    c = uColor * vC * (uAmb + uDiff * d) + uSpecC * uSpec * s + uRimC * uRim * fr + env(reflect(-v, n)) * uEnv * F;
    if (uInk > .5) c = uColor * vC * (uAmb + uDiff * (1. - d)) + uRimC * uRim * fr;   // paper: shade with ink (absorbance)
  } else if (uMode < 1.5) {                                 // glass: what is behind, bent by the surface
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 off = (mat3(uV) * n).xy * uRefr / uRes;
    vec3 tr = vec3(back(uv - off * (1. + uDisp)).r, back(uv - off).g, back(uv - off * (1. - uDisp)).b);
    vec3 absorb = mix(vec3(1.), uTint, uTintK * sqrt(nv));
    c = tr * absorb * (1. - F) + env(reflect(-v, n)) * uEnv * F + uSpecC * uSpec * s + uRimC * uRim * fr + uTint * uGlow * (1. - nv) * (1. - nv);
  } else {                                                  // x-ray: additive rim light, no surface
    c = uColor * vC * (uAmb + uRim * fr) + uSpecC * uSpec * s;
  }
  if (uBand.w > 0.) {                                       // contour bands along an axis, antialiased in screen space
    float q = dot(vW, uBand.xyz) / uBand.w, fw = max(fwidth(q), 1e-5);
    float dd = abs(fract(q - .5) - .5) / fw;
    c += uBandC * uBandW.y * (1. - smoothstep(uBandW.x * .5, uBandW.x * .5 + 1., dd));
  }
  if (uFog > 0.) c /= 1. + pow(length(uEye - vW) / uFog, 2.);
  o = vec4(max(c * uGain, 0.), uMode > 1.5 ? 0. : 1.);
}`;

const FS_DEPTH = `#version 300 es
precision highp float; out vec4 o; void main() { o = vec4(0.); }`;

const FS_COMPOSE = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uRes;
void main() { o = texture(uSrc, gl_FragCoord.xy / uRes); }`;

// The prelude of every smShader: uniforms, the camera ray, hash / noise and SDF helpers.
const SM_GLSL = `
uniform vec2 uRes, uTgt;          // output size (px), size of the target this pass renders into
uniform float uTime, uInk;
uniform mat4 uVP, uInvVP;
uniform vec3 uEye, uFg, uDim, uAccent, uHot, uWarn;
float sm_depth = 1.;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
float fbm(vec3 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdBoxFrame(vec3 p, vec3 b, float e) {
  p = abs(p) - b; vec3 q = abs(p + e) - e;
  return min(min(length(max(vec3(p.x, q.y, q.z), 0.)) + min(max(p.x, max(q.y, q.z)), 0.),
                 length(max(vec3(q.x, p.y, q.z), 0.)) + min(max(q.x, max(p.y, q.z)), 0.)),
             length(max(vec3(q.x, q.y, p.z), 0.)) + min(max(q.x, max(q.y, p.z)), 0.));
}
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float smin(float a, float b, float k) { float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
vec3 smRep(vec3 p, vec3 c) { return p - c * round(p / c); }         // domain repetition: p inside its cell (centred)
vec3 smCell(vec3 p, vec3 c) { return round(p / c); }                 // which cell (integer coordinates, as floats)
/** The lumen camera's ray through output pixel px (y down): origin ro, unit direction rd. */
void smRay(vec2 px, out vec3 ro, out vec3 rd) {
  vec2 ndc = vec2(px.x / uRes.x * 2. - 1., 1. - px.y / uRes.y * 2.);
  vec4 a = uInvVP * vec4(ndc, -1., 1.), b = uInvVP * vec4(ndc, 1., 1.);
  ro = uEye; rd = normalize(b.xyz / b.w - a.xyz / a.w);
}
/** Report the surface this pixel shows (world point): with o.depth it goes into the depth buffer. */
void smHit(vec3 p) { vec4 c = uVP * vec4(p, 1.); sm_depth = clamp(c.z / c.w * .5 + .5, 0., 1.); }
`;

// ---------------------------------------------------------------- GL state
let L = null, gl = null, SOL = null, RES = null, LOWRES = {}, depthDirty = true;
const MBUF = new WeakMap();
lmOnBegin(() => { depthDirty = true; });

function init() {
  if (L) return;
  L = lmGL(); gl = L.gl; L.lmDepth();
  const W = L.W, H = L.H;
  let samples = 0;
  try { const s = gl.getInternalformatParameter(gl.RENDERBUFFER, L.fmt.i, gl.SAMPLES); samples = s && s.length ? Math.min(4, s[0]) : 0; } catch (e) { samples = 0; }
  const make = n => {
    const fb = gl.createFramebuffer(), cr = gl.createRenderbuffer(), dr = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, cr);
    if (n) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, L.fmt.i, W, H); else gl.renderbufferStorage(gl.RENDERBUFFER, L.fmt.i, W, H);
    gl.bindRenderbuffer(gl.RENDERBUFFER, dr);
    if (n) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, gl.DEPTH_COMPONENT24, W, H); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cr);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dr);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    if (!ok) { gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(cr); gl.deleteRenderbuffer(dr); return null; }
    return { fb, cr, dr, samples: n };
  };
  SOL = (samples && make(samples)) || make(0);
  if (!SOL) throw new Error('solid.js: cannot create the surface target');
  RES = L.target(W, H);
  SG.samples = SOL.samples;
}

function m4inv(m) {
  const a = m, o = new Float32Array(16);
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5];
  const b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12];
  const b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return o;
  det = 1 / det;
  o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
  o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
  o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
  o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
  o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
  o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
  o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
  o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
  return o;
}
const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** GPU buffers for a mesh, cached on the object; bump mesh.__v after editing its arrays in place. */
function meshVAO(mesh) {
  let e = MBUF.get(mesh);
  const v = mesh.__v || 0;
  if (e && e.v === v) return e;
  if (!e) {
    e = { vao: gl.createVertexArray(), p: gl.createBuffer(), n: gl.createBuffer(), c: mesh.col ? gl.createBuffer() : null, i: mesh.idx ? gl.createBuffer() : null };
    MBUF.set(mesh, e);
  }
  gl.bindVertexArray(e.vao);
  const put = (b, arr, loc) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(loc, 0); };
  put(e.p, mesh.pos, 0); put(e.n, mesh.nrm, 1);
  if (e.c) put(e.c, mesh.col, 2); else { gl.disableVertexAttribArray(2); }
  if (e.i) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, e.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW); }
  gl.bindVertexArray(null);
  e.v = v; e.count = mesh.idx ? mesh.idx.length : mesh.pos.length / 3;
  return e;
}

const MODES = { lit: 0, glass: 1, xray: 2, emit: 2, depth: 3 };
/**
 * Draw a triangle mesh into the light. o.mat: 'lit' (default: opaque, lit) | 'glass' (refracts what is already drawn)
 * | 'xray' (additive rim light, no depth write) | 'depth' (only the depth: see smGlass). Options (colours take
 * '#hex', [r, g, b] or a palette key): model, color ('fg'), rim (0.6) + rimColor ('accent') + rimPow (2.5), spec (0.8)
 * + specColor ('hot') + shine (48), ambient (0.06), diffuse (0.55), env (studio reflection, 0.6), light ([x, y, z]
 * towards the key light) + fill, gain, fog (half-brightness distance), twoSided (open surfaces: light the back),
 * bands: { axis: [0, 1, 0], step, width (px), color, gain } (contour lines), upto (0..1: draw the first share of the
 * triangles), depthWrite. Glass: ior (1.45: how much it bends, scaled to px by o.refract), refract (px, 38), dispersion
 * (0.06: red and blue bend apart), tint ('accent') + tintK (0.35: colour taken from what it lets through), glow (inner
 * edge glow, 0.25), rough (px of frost blur, 0).
 */
function smMesh(cam, mesh, o = {}) {
  init();
  const mode = MODES[o.mat || 'lit'] ?? 0, W = L.W, H = L.H, pal = L.pal(), ink = pal.mode === 'ink';
  const ent = meshVAO(mesh);
  let count = ent.count;
  if (o.upto != null) count = Math.floor(Math.max(0, Math.min(1, o.upto)) * count / 3) * 3;
  if (!count) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, SOL.fb); gl.viewport(0, 0, W, H);
  if (depthDirty) { gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); depthDirty = false; }
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  gl.depthMask(o.depthWrite ?? (mode !== 2));
  if (mode === 2) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); } else gl.disable(gl.BLEND);
  if (mode === 3) gl.colorMask(false, false, false, false);
  const pr = mode === 3 ? L.program('sm-depth', VS_MESH, FS_DEPTH) : L.program('sm-mesh', VS_MESH, FS_MESH), u = pr.u;
  gl.useProgram(pr.p);
  gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniformMatrix4fv(u.uM, false, lmModel(o.model));
  if (mode !== 3) {
    const c3 = (k, c) => { const v = ink && k !== 'uTint' ? L.emit(c) : L.rgb(c); gl.uniform3f(u[k], v[0], v[1], v[2]); };
    gl.uniform3fv(u.uEye, cam.eye);
    c3('uColor', o.color ?? 'fg'); c3('uRimC', o.rimColor ?? 'accent'); c3('uSpecC', o.specColor ?? 'hot'); c3('uTint', o.tint ?? 'accent');
    const b = o.bands; c3('uBandC', (b && b.color) ?? 'accent');
    const l1 = norm3(o.light || [0.5, 0.8, 0.55]), l2 = norm3(o.fill || [-0.7, 0.2, -0.4]);
    gl.uniform3f(u.uL1, l1[0], l1[1], l1[2]); gl.uniform3f(u.uL2, l2[0], l2[1], l2[2]);
    gl.uniform1f(u.uMode, mode); gl.uniform1f(u.uAmb, o.ambient ?? (mode === 2 ? 0.02 : 0.06)); gl.uniform1f(u.uDiff, o.diffuse ?? 0.55);
    gl.uniform1f(u.uSpec, o.spec ?? 0.8); gl.uniform1f(u.uShine, o.shine ?? 48); gl.uniform1f(u.uRim, o.rim ?? 0.6); gl.uniform1f(u.uRimP, o.rimPow ?? 2.5);
    gl.uniform1f(u.uEnv, o.env ?? 0.6); gl.uniform1f(u.uGain, o.gain ?? 1); gl.uniform1f(u.uInk, ink ? 1 : 0); gl.uniform1f(u.uTwo, o.twoSided ? 1 : 0);
    gl.uniform1f(u.uFog, o.fog || 0);
    gl.uniform1f(u.uRefr, (o.refract ?? 38) * ((o.ior ?? 1.45) - 1) / 0.45); gl.uniform1f(u.uDisp, o.dispersion ?? 0.06);
    gl.uniform1f(u.uTintK, o.tintK ?? 0.35); gl.uniform1f(u.uGlow, o.glow ?? 0.25); gl.uniform1f(u.uRough, o.rough || 0);
    if (b) { const ax = norm3(b.axis || [0, 1, 0]); gl.uniform4f(u.uBand, ax[0], ax[1], ax[2], b.step || 0.1); gl.uniform2f(u.uBandW, b.width ?? 1.2, b.gain ?? 0.6); }
    else gl.uniform4f(u.uBand, 0, 1, 0, 0);
    gl.uniform2f(u.uRes, W, H); gl.uniformMatrix4fv(u.uV, false, cam.view);
    if (mode === 1) { L.bindTex(1, L.light.t); gl.uniform1i(u.uBack, 1); }
  }
  gl.bindVertexArray(ent.vao);
  if (!mesh.col) gl.vertexAttrib3f(2, 1, 1, 1);
  if (mesh.idx) gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0); else gl.drawArrays(gl.TRIANGLES, 0, count);
  gl.bindVertexArray(null);
  gl.colorMask(true, true, true, true); gl.depthMask(true); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  // resolve: depth → the light target's depth (points / lines occlude against it), colour → a texture laid over the light
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, SOL.fb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, L.light.fb);
  gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  if (mode !== 3) {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RES.fb);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  if (mode !== 3) compose(RES, mode === 2 ? 'add' : 'over');
}
function compose(src, blend) {
  const pc = L.program('sm-compose', L.VS_FULL, FS_COMPOSE);
  gl.useProgram(pc.p); L.bindTex(0, src.t); gl.uniform1i(pc.u.uSrc, 0); gl.uniform2f(pc.u.uRes, L.W, L.H);
  gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
  if (blend === 'add') gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  L.fullscreen(L.light.fb, L.W, L.H); gl.disable(gl.BLEND);
}

/**
 * Glass with things inside it and around it: the glass's depth first, then scene('behind') (draw what may be behind it,
 * with occlude: the argument), then the glass (it refracts all of that), then scene('front') — the same draws again,
 * now only where they are in front of the glass. A background drawn before smGlass needs no occlude: it is behind.
 */
function smGlass(cam, mesh, o = {}, scene) {
  smMesh(cam, mesh, { ...o, mat: 'depth' });
  if (scene) scene('behind');
  smMesh(cam, mesh, { ...o, mat: 'glass' });
  if (scene) scene('front');
}

function setUniform(u, k, v) {
  const loc = u[k]; if (loc == null) return;
  if (typeof v === 'number' || typeof v === 'boolean') gl.uniform1f(loc, +v);
  else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v);
  else if (v.length === 2) gl.uniform2fv(loc, v);
  else if (v.length === 3) gl.uniform3fv(loc, v);
  else if (v.length === 4) gl.uniform4fv(loc, v);
  else if (v.length === 9) gl.uniformMatrix3fv(loc, false, v);
  else gl.uniform1fv(loc, v);
}
/**
 * A fullscreen GLSL pass into the light (before bloom). src defines `vec4 shade(vec2 px)` (px = output pixel, y down)
 * returning light rgb and coverage alpha; it may declare its own uniforms and use the prelude (SM_GLSL: smRay, smHit,
 * hash12 / hash13 / hash33, vnoise, fbm, rot2, sdSphere / sdBox / sdBoxFrame / sdTorus / sdCapsule, smin, smRep,
 * smCell, uniforms uTime uFg uDim uAccent uHot uWarn uInk uEye). One name per source (compiled once, cached by name).
 * o: cam (for smRay / smHit), t (uTime), u: { uName: number | [2..4] | Float32Array(16) }, blend ('add' | 'over'),
 * res (0.25..1: render at a fraction of the size and scale up — for soft passes; slow shaders on a software renderer),
 * depth (true: smHit's point goes into the depth buffer, so lmPoints / lmLines with occlude hide behind it; res 1 only).
 */
function smShader(name, src, o = {}) {
  init();
  const W = L.W, H = L.H, res = Math.max(0.1, Math.min(1, o.res ?? 1)), depth = !!o.depth && res >= 1, pal = L.pal();
  const fs = `#version 300 es\nprecision highp float;\n${depth ? '#define SM_DEPTH 1\n' : ''}${SM_GLSL}\n${src}\nout vec4 smOut_;\nvoid main() {\n  vec2 px = vec2(gl_FragCoord.x, uTgt.y - gl_FragCoord.y) * (uRes / uTgt);\n  vec4 c = shade(px);\n  smOut_ = vec4(max(c.rgb, 0.) * c.a, c.a);\n#ifdef SM_DEPTH\n  gl_FragDepth = sm_depth;\n#endif\n}`;
  const pr = L.program('sm:' + name + (depth ? '#d' : ''), L.VS_FULL, fs), u = pr.u;
  let tgt = null, tw = W, th = H;
  if (res < 1) {
    tw = Math.max(1, Math.round(W * res)); th = Math.max(1, Math.round(H * res));
    const key = tw + 'x' + th; tgt = LOWRES[key] || (LOWRES[key] = L.target(tw, th));
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fb); gl.viewport(0, 0, tw, th); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.useProgram(pr.p);
  gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uTgt, tw, th); gl.uniform1f(u.uTime, o.t || 0); gl.uniform1f(u.uInk, pal.mode === 'ink' ? 1 : 0);
  if (o.cam) { gl.uniformMatrix4fv(u.uVP, false, o.cam.vp); gl.uniformMatrix4fv(u.uInvVP, false, m4inv(o.cam.vp)); gl.uniform3fv(u.uEye, o.cam.eye); }
  for (const k of ['fg', 'dim', 'accent', 'hot', 'warn']) { const v = L.rgb(k); const loc = u['u' + k[0].toUpperCase() + k.slice(1)]; if (loc) gl.uniform3f(loc, v[0], v[1], v[2]); }
  for (const k in o.u || {}) setUniform(u, k, o.u[k]);
  if (tgt) {
    L.fullscreen(tgt.fb, tw, th);
    compose(tgt, o.blend || 'add');
    return;
  }
  gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
  if ((o.blend || 'add') === 'add') gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  if (depth) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); }
  L.fullscreen(L.light.fb, W, H);
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
}

// ---------------------------------------------------------------- geometry (SG)
// Marching tetrahedra: each grid cube is split into 6 tetrahedra round its main diagonal (corner 0 → corner 7), so
// no case table is needed and the surface has no holes. Vertices are shared through the grid edge they sit on.
const CUBE = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const TETS = [[0, 7, 1, 3], [0, 7, 3, 2], [0, 7, 2, 6], [0, 7, 6, 4], [0, 7, 4, 5], [0, 7, 5, 1]];
const SG = {
  samples: 0,
  /**
   * Surface of fn(x, y, z) = 0 (fn < 0 inside) in the box lo..hi, about n cells along its longest side.
   * o.grad(x, y, z) → [gx, gy, gz] (analytic normal; default: central differences), o.eps.
   */
  implicit(fn, lo, hi, n = 96, o = {}) {
    const ext = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], h = Math.max(...ext) / n;
    const nx = Math.max(1, Math.ceil(ext[0] / h)), ny = Math.max(1, Math.ceil(ext[1] / h)), nz = Math.max(1, Math.ceil(ext[2] / h));
    const sx = nx + 1, sy = ny + 1, F = new Float32Array(sx * sy * (nz + 1));
    for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[i + sx * (j + sy * k)] = fn(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
    const eps = o.eps ?? h * 0.25;
    const grad = o.grad || ((x, y, z) => [fn(x + eps, y, z) - fn(x - eps, y, z), fn(x, y + eps, z) - fn(x, y - eps, z), fn(x, y, z + eps) - fn(x, y, z - eps)]);
    const pos = [], nrm = [], idx = [], memo = new Map();
    const vert = (a, b) => {                       // a, b: grid point indices with opposite signs
      const key = a < b ? a * 4194304 + b : b * 4194304 + a;
      let v = memo.get(key); if (v !== undefined) return v;
      const fa = F[a], fb = F[b], t = fa / (fa - fb);
      const ai = a % sx, aj = Math.floor(a / sx) % sy, ak = Math.floor(a / (sx * sy));
      const bi = b % sx, bj = Math.floor(b / sx) % sy, bk = Math.floor(b / (sx * sy));
      const x = lo[0] + (ai + (bi - ai) * t) * h, y = lo[1] + (aj + (bj - aj) * t) * h, z = lo[2] + (ak + (bk - ak) * t) * h;
      const g = grad(x, y, z), l = Math.hypot(g[0], g[1], g[2]);
      v = pos.length / 3; pos.push(x, y, z);
      if (l > 1e-12 && isFinite(l)) nrm.push(g[0] / l, g[1] / l, g[2] / l); else nrm.push(0, 1, 0);
      memo.set(key, v); return v;
    };
    const tri = (a, b, c) => {                      // orient with the outward normal (fn grows outwards)
      const A = a * 3, B = b * 3, C = c * 3;
      const ux = pos[B] - pos[A], uy = pos[B + 1] - pos[A + 1], uz = pos[B + 2] - pos[A + 2], vx = pos[C] - pos[A], vy = pos[C + 1] - pos[A + 1], vz = pos[C + 2] - pos[A + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      const nn = (nrm[A] + nrm[B] + nrm[C]) * cx + (nrm[A + 1] + nrm[B + 1] + nrm[C + 1]) * cy + (nrm[A + 2] + nrm[B + 2] + nrm[C + 2]) * cz;
      if (a === b || b === c || a === c) return;
      if (nn >= 0) idx.push(a, b, c); else idx.push(a, c, b);
    };
    const gi = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let neg = 0;
      for (let c = 0; c < 8; c++) { const d = CUBE[c], id = (i + d[0]) + sx * ((j + d[1]) + sy * (k + d[2])); gi[c] = id; if (F[id] < 0) neg++; }
      if (neg === 0 || neg === 8) continue;
      for (const T of TETS) {
        const p = [gi[T[0]], gi[T[1]], gi[T[2]], gi[T[3]]], ins = [], out = [];
        for (const q of p) (F[q] < 0 ? ins : out).push(q);
        if (!ins.length || !out.length) continue;
        if (ins.length === 1) tri(vert(ins[0], out[0]), vert(ins[0], out[1]), vert(ins[0], out[2]));
        else if (ins.length === 3) tri(vert(out[0], ins[0]), vert(out[0], ins[1]), vert(out[0], ins[2]));
        else { const a = vert(ins[0], out[0]), b = vert(ins[0], out[1]), c = vert(ins[1], out[0]), d = vert(ins[1], out[1]); tri(a, b, d); tri(a, d, c); }
      }
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx), tris: idx.length / 3 };
  },
  /** UV sphere. */
  sphere(r = 1, seg = 32, rings = Math.round(seg / 2)) {
    const pos = [], nrm = [], idx = [];
    for (let j = 0; j <= rings; j++) {
      const v = j / rings, th = v * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (let i = 0; i <= seg; i++) { const ph = i / seg * Math.PI * 2, x = Math.cos(ph) * st, z = Math.sin(ph) * st; pos.push(x * r, ct * r, z * r); nrm.push(x, ct, z); }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx) };
  },
  /** Open cylinder from a to b (bonds, struts). o.caps: close the ends. */
  tube(a, b, r = 0.05, seg = 16, o = {}) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, w = d.map(x => x / L);
    const ref = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let u = norm3([w[1] * ref[2] - w[2] * ref[1], w[2] * ref[0] - w[0] * ref[2], w[0] * ref[1] - w[1] * ref[0]]);
    const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
    const pos = [], nrm = [], idx = [];
    for (let s = 0; s < 2; s++) for (let i = 0; i <= seg; i++) {
      const t = i / seg * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t), nn = [u[0] * c + v[0] * sn, u[1] * c + v[1] * sn, u[2] * c + v[2] * sn], p = s ? b : a;
      pos.push(p[0] + nn[0] * r, p[1] + nn[1] * r, p[2] + nn[2] * r); nrm.push(...nn);
    }
    for (let i = 0; i < seg; i++) { const a0 = i, a1 = i + 1, b0 = i + seg + 1, b1 = b0 + 1; idx.push(a0, b0, a1, a1, b0, b1); }
    if (o.caps) for (let s = 0; s < 2; s++) {
      const c0 = pos.length / 3, p = s ? b : a, nn = s ? w : w.map(x => -x);
      pos.push(...p); nrm.push(...nn);
      for (let i = 0; i <= seg; i++) { const q = (s * (seg + 1) + i) * 3; pos.push(pos[q], pos[q + 1], pos[q + 2]); nrm.push(...nn); }
      for (let i = 0; i < seg; i++) s ? idx.push(c0, c0 + 1 + i, c0 + 2 + i) : idx.push(c0, c0 + 2 + i, c0 + 1 + i);
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx) };
  },
  /** Box [w, h, d] with flat faces. */
  box(size = [1, 1, 1]) {
    const [w, h, d] = size.map(x => x / 2), pos = [], nrm = [], idx = [];
    const F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
    for (const [n, a, b] of F) {
      const s = [w, h, d], base = pos.length / 3;
      for (const [p, q] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let c = 0; c < 3; c++) { if (c === 0) nrm.push(...n); pos.push(n[c] * s[c] + a[c] * p * s[c] + b[c] * q * s[c]); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx) };
  },
  /** Height field y = fn(x, z) on an (nx × nz)-cell grid size[0] × size[1], centred. Re-shape it with SG.heightSet. */
  height(fn, size = [2, 2], n = [128, 128]) {
    const [nx, nz] = typeof n === 'number' ? [n, n] : n, cnt = (nx + 1) * (nz + 1), idx = new Uint32Array(nx * nz * 6);
    const m = { pos: new Float32Array(cnt * 3), nrm: new Float32Array(cnt * 3), idx, grid: { nx, nz, size } };
    let k = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx[k++] = a; idx[k++] = b; idx[k++] = a + 1; idx[k++] = a + 1; idx[k++] = b; idx[k++] = b + 1; }
    return SG.heightSet(m, fn);
  },
  heightSet(m, fn) {
    const { nx, nz, size } = m.grid, P = m.pos, N = m.nrm, dx = size[0] / nx, dz = size[1] / nz;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const q = (j * (nx + 1) + i) * 3, x = -size[0] / 2 + i * dx, z = -size[1] / 2 + j * dz; P[q] = x; P[q + 1] = fn(x, z); P[q + 2] = z; }
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const q = (j * (nx + 1) + i) * 3, l = (j * (nx + 1) + Math.max(0, i - 1)) * 3, r = (j * (nx + 1) + Math.min(nx, i + 1)) * 3;
      const d = (Math.max(0, j - 1) * (nx + 1) + i) * 3, u = (Math.min(nz, j + 1) * (nx + 1) + i) * 3;
      const gx = (P[r + 1] - P[l + 1]) / (P[r] - P[l] || 1), gz = (P[u + 1] - P[d + 1]) / (P[u + 2] - P[d + 2] || 1), len = Math.hypot(gx, 1, gz);
      N[q] = -gx / len; N[q + 1] = 1 / len; N[q + 2] = -gz / len;
    }
    m.__v = (m.__v || 0) + 1;
    return m;
  },
  /** A copy of a mesh with a model ({ pos, rot, scale } or a matrix) applied. */
  xf(mesh, model) {
    const M = lmModel(model), P = mesh.pos, N = mesh.nrm, p = new Float32Array(P.length), n = new Float32Array(N.length);
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2], a = N[i], b = N[i + 1], c = N[i + 2];
      p[i] = M[0] * x + M[4] * y + M[8] * z + M[12]; p[i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; p[i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
      const nx = M[0] * a + M[4] * b + M[8] * c, ny = M[1] * a + M[5] * b + M[9] * c, nz = M[2] * a + M[6] * b + M[10] * c, l = Math.hypot(nx, ny, nz) || 1;
      n[i] = nx / l; n[i + 1] = ny / l; n[i + 2] = nz / l;
    }
    const out = { pos: p, nrm: n };
    if (mesh.idx) out.idx = mesh.idx;
    if (mesh.col) out.col = mesh.col;
    return out;
  },
  /** One mesh from parts [{ mesh, model?, color? ('#hex' | [r, g, b]) }, …] — e.g. atoms and bonds of a molecule. */
  merge(parts) {
    const ms = parts.map(p => (p.model ? SG.xf(p.mesh, p.model) : p.mesh));
    const nv = ms.reduce((s, m) => s + m.pos.length / 3, 0), ni = ms.reduce((s, m) => s + (m.idx ? m.idx.length : m.pos.length / 3), 0);
    const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let v = 0, k = 0;
    ms.forEach((m, j) => {
      const c = parts[j].color ? (Array.isArray(parts[j].color) ? parts[j].color : hexRGB(parts[j].color)) : [1, 1, 1], n = m.pos.length / 3;
      pos.set(m.pos, v * 3); nrm.set(m.nrm, v * 3);
      for (let i = 0; i < n; i++) { const q = (v + i) * 3; if (m.col) { col[q] = m.col[i * 3]; col[q + 1] = m.col[i * 3 + 1]; col[q + 2] = m.col[i * 3 + 2]; } else { col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; } }
      if (m.idx) for (let i = 0; i < m.idx.length; i++) idx[k++] = m.idx[i] + v; else for (let i = 0; i < n; i++) idx[k++] = v + i;
      v += n;
    });
    return { pos, nrm, col, idx };
  },
  /** The mesh's edges as a lumen segment buffer (every triangle edge once), for glowing edges over a solid. o.bright. */
  wire(mesh, o = {}) {
    const I = mesh.idx || Uint32Array.from({ length: mesh.pos.length / 3 }, (_, i) => i), P = mesh.pos, seen = new Set(), out = [];
    for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = I[t + e], b = I[t + (e + 1) % 3], key = a < b ? a * 4194304 + b : b * 4194304 + a;
      if (seen.has(key)) continue; seen.add(key);
      out.push(P[a * 3], P[a * 3 + 1], P[a * 3 + 2], P[b * 3], P[b * 3 + 1], P[b * 3 + 2], o.bright ?? 1, 3);
    }
    return new Float32Array(out);
  },
};
function hexRGB(h) { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

MV.solid = { smMesh, smGlass, smShader, SG, SM_GLSL };
Object.assign(G, { smMesh, smGlass, smShader, SG, SM_GLSL });
})(window);
