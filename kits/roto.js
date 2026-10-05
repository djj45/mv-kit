// mv-kit style kit: roto.js — "riso-cel" rotoscope. Redraws footage or stills (AI-generated video, a photo, a
// painted plate) as printed cel animation, so the raw source never reaches the screen:
//
//   edge-preserving flats → nearest-ink palette with two-tone shading → 45° screentone in the shadows →
//   XDoG ink lines that boil on the drawing tick → a misregistered second line plate.
//
// Then, as a post filter, the finished frame (type and all) is printed on paper: fibres, tooth, the dark plate
// printed slightly off, ink starvation, grain on the drawing tick, vignette.
// Adapted from the riso-cel pass in Pdoom-video-anime-version (ISC). Needs WebGL2.
//
//   rotoSeq('J')                 a frame pack (frames/J.js, made by tools/frames.py) → {name, t0, rate, n, still}
//   rotoFrame('J', t, o)         the drawing at song time t, held on MV.drawRate ("on twos" at 12).
//                                o.lag (s, show the clip earlier), o.at (clip time, for slow-mo / freeze; quantize it
//                                yourself with f.tq), o.smooth (no hold)
//   rotoCel(src, o)              → a W×H canvas, valid until the next roto call: drawImage it right away
//   rotoDraw(g, src, o)          rotoCel + drawImage (o.rect = [x, y, w, h], default full frame)
//     o.pal    ink list (['#hex', …] or a ROTO.PAL key); every pixel prints in one of these, plain or shaded
//     o.cam    {x, y, z, rot}: centre (0..1 of the source), zoom ≥ 1, roll (radians); cover-fits any aspect
//     o.tick   drawing index for the line boil (pass f.tick)
//     o.line (1) o.lineTh (.009) o.tone (.55 screentone) o.shade (.32 how dark shaded inks are) o.sat (1.15)
//     o.expo (1) o.lineCol o.misCol (second line plate) o.flat (.13 flattening) o.key + o.keyCol (alpha key)
//     o.remap {from, to, amt} (push one colour to another before inking)
//   post.press = { mis, grain, vig, fiber, flash }   the printing pass (project.post or a scene's return value);
//                                set project.post grain / vignette to 0 — press does its own
//   ROTO.INK  ROTO.PAL  ROTO.F (fonts)  rotoSpark (✻-like burst)
//   rotoKara (slam-in karaoke)  rotoSide (block that wipes in)  rotoSub (subtitle)  rotoSlam (one word)  rotoHud
//   (a lyric line leaves at line.end + hold, or the moment the next line starts, whichever is first)
//
// Frame packs are JS files with JPEG data URLs, so index.html still works opened straight from disk (an <img> from
// file:// would taint the canvas and WebGL refuses it). List them in project.scripts; the kit preloads them.
(function (G) {
'use strict';
const MV = G.MV;

const ROTO = {
  INK: {
    paper: '#F1ECE1', paper2: '#E6DFCF', ink: '#1B1714', claude: '#D97757', lcl: '#F08A24', blue: '#1D5FD1',
    pink: '#FF4F9A', alarm: '#E8322B', cream: '#FBF6EC', navy: '#12203F', gold: '#F2B544', rust: '#8A3A1E',
  },
  // each shot prints with a handful of inks; skin tones are listed so faces don't snap to orange
  PAL: {
    room:  ['#12203F', '#1D5FD1', '#D97757', '#F08A24', '#F1ECE1', '#1B1714', '#F2C9A8', '#F4A77E', '#A8452E'],
    stage: ['#F1ECE1', '#D97757', '#1B1714', '#F2B544', '#FF4F9A', '#F2C9A8', '#8A4A36', '#F6C9A8', '#E8A07E', '#FFF1DC'],
    dc:    ['#12203F', '#1D5FD1', '#5FA8B8', '#D97757', '#F1ECE1', '#1B1714', '#F6C9A8', '#E8A07E'],
    sea:   ['#F08A24', '#D97757', '#EDE6CC', '#F2B544', '#8A3A1E', '#F1ECE1', '#1B1714', '#F2C9A8', '#F6C9A8', '#E8A07E'],
    plug:  ['#F08A24', '#8A3A1E', '#F1ECE1', '#D97757', '#1B1714', '#F2C9A8', '#12203F', '#F6C9A8', '#E8A07E'],
    pink:  ['#FF4F9A', '#F7B8D2', '#F1ECE1', '#D97757', '#1B1714', '#2A1030', '#F2C9A8', '#F7C4B4', '#EE9C98'],
    blue:  ['#1D5FD1', '#9FC0F0', '#F1ECE1', '#12203F', '#D97757', '#F2C9A8', '#E8A07E'],
    red:   ['#E8322B', '#1B1714', '#F1ECE1', '#7A1410', '#F2C9A8', '#F08A24', '#E8A07E'],
    mono:  ['#1B1714', '#F1ECE1', '#8C857A'],
  },
  // fonts: embed the first family in a project (see projects/roto-demo/lib/fonts.js); the rest are fallbacks
  F: {
    slab: s => `${s}px "Anton", "Impact", "Haettenschweiler", "Arial Narrow", sans-serif`,
    mincho: s => `800 ${s}px "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif`,
    mono: s => `800 ${s}px "JetBrains Mono", "Menlo", "DejaVu Sans Mono", monospace`,
    monoL: s => `500 ${s}px "JetBrains Mono", "Menlo", "DejaVu Sans Mono", monospace`,
  },
};
const hex3 = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

// ---------------------------------------------------------------- frame packs
// window.MV_FRAMES[name] = { t0, rate, w, h, still?, frames: ['data:image/jpeg;base64,…', …] }
function rotoSeq(name) {
  const p = (G.MV_FRAMES || {})[name];
  if (!p) throw new Error(`roto: no frame pack "${name}" — add "frames/${name}.js" to project.scripts`);
  if (!p.images) throw new Error(`roto: frame pack "${name}" is not loaded yet (use it in render / init, not at load time)`);
  return p;
}
MV.onInit(async () => {
  const packs = Object.entries(G.MV_FRAMES || {});
  await Promise.all(packs.flatMap(([name, p]) => {
    p.name = name; p.n = p.frames.length; p.rate = p.rate || 12; p.t0 = p.t0 || 0;
    p.images = p.frames.map(() => new Image());
    return p.images.map((im, i) => new Promise((res, rej) => {
      im.onload = res; im.onerror = () => rej(new Error(`roto: frame ${i} of "${name}" failed to decode`));
      im.src = p.frames[i];
    }));
  }));
});
function rotoFrame(seq, t, o = {}) {
  const s = typeof seq === 'string' ? rotoSeq(seq) : seq;
  if (s.n === 1 || s.still) return s.images[0];
  let tl;
  if (o.at != null) tl = o.at;
  else tl = (o.smooth ? t : onTwos(t)) - s.t0 + (o.lag || 0);
  return s.images[clamp(Math.round(tl * s.rate), 0, s.n - 1)];
}

// ---------------------------------------------------------------- GLSL
const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
const NOISE = `
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }`;

// P0: the camera — crop + roll the source into the frame (top-left origin in, GL origin out)
const FS_CAM = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D s; uniform vec4 crop; uniform float rot, aspect;
void main(){ vec2 q = vec2(uv.x, 1.-uv.y) - .5; q.x *= aspect; float c = cos(rot), n = sin(rot); q = mat2(c, n, -n, c) * q; q.x /= aspect; q += .5;
  o = texture(s, crop.xy + q*crop.zw); }`;
// P1: edge-preserving flattening (bilateral, run three times) → cel flats
const FS_FLAT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D s; uniform vec2 px; uniform float sc;
void main(){ vec3 c0 = texture(s, uv).rgb; vec3 acc = vec3(0); float ws = 0.;
  for(int j=-5;j<=5;j++) for(int i=-5;i<=5;i++){ vec2 d = vec2(i,j); vec3 c = texture(s, uv + d*px*1.6).rgb; vec3 e = c - c0;
    float w = exp(-dot(d,d)/14.) * exp(-dot(e,e)/(2.*sc*sc)); acc += c*w; ws += w; }
  o = vec4(acc/ws, 1.); }`;
// P2: separable gaussian of luminance at two sigmas → (g1, g2) for the difference-of-gaussians lines
const FS_BLUR = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D s; uniform vec2 dir; uniform float s1, s2; uniform int first;
float L(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
void main(){ float a=0., b=0., wa=0., wb=0.;
  for(int i=-9;i<=9;i++){ float x=float(i); vec4 t = texture(s, uv + dir*x);
    float va = first==1 ? L(t.rgb) : t.r; float vb = first==1 ? L(t.rgb) : t.g;
    float ka = exp(-x*x/(2.*s1*s1)), kb = exp(-x*x/(2.*s2*s2)); a+=va*ka; wa+=ka; b+=vb*kb; wb+=kb; }
  o = vec4(a/wa, b/wb, 0., 1.); }`;
// P3: inks + screentone + lines
const FS_CEL = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D K, D; uniform vec3 pal[10]; uniform int np; uniform float seed, lineAmt, lineTh, tone, shadeMix, sat, expo;
uniform vec3 lineCol, misCol, shadeCol; uniform vec2 res; uniform float keyAmt; uniform vec3 keyCol; uniform vec3 remapFrom, remapTo; uniform float remapAmt;
${NOISE}
vec3 opp(vec3 c){ float L = dot(c, vec3(.299,.587,.114)); return vec3(L*1.6, (c.r-c.g)*.9, ((c.r+c.g)*.5-c.b)*.7); }
vec3 prep(vec3 c){ c = min(vec3(1.), c*expo + (expo-1.)*.06); c = mix(vec3(dot(c,vec3(.333))), c, sat);
  float rd = distance(c, remapFrom); return mix(c, remapTo, remapAmt*smoothstep(.28,.08,rd)); }
vec4 ink(vec3 c, out vec3 base){ vec3 best = pal[0]; float bd = 1e9; float sh = 0.; base = pal[0];
  for(int i=0;i<10;i++){ if(i>=np) break; vec3 p0 = pal[i]; vec3 p1 = mix(pal[i], shadeCol, shadeMix);
    float d0 = distance(opp(c), opp(p0)), d1 = distance(opp(c), opp(p1));
    if(d0<bd){ bd=d0; best=p0; sh=0.; base=p0; } if(d1<bd){ bd=d1; best=p1; sh=1.; base=p0; } }
  return vec4(best, sh); }
void main(){
  vec2 q = uv; vec2 fr = q*res; vec2 px = 1./res;
  vec2 wob = (vec2(vn(fr*.006+seed*7.1), vn(fr*.006+seed*3.7+9.))-.5)*.9/res;
  vec3 col = vec3(0); vec3 base; float shaded = 0.;
  vec2 ofs[4] = vec2[4](vec2(-.35,-.15), vec2(.15,-.35), vec2(.35,.15), vec2(-.15,.35));
  for(int k=0;k<4;k++){ vec3 b; vec4 r = ink(prep(texture(K, q + ofs[k]*px*1.6).rgb), b); col += r.rgb; shaded += r.a; if(k==0) base = b; }
  col *= .25; shaded *= .25;
  if(tone>0. && shaded>.5){ vec2 r = mat2(.7071,-.7071,.7071,.7071)*fr/4.2; vec2 f = fract(r)-.5; float dd = length(f);
    col = mix(col, base, tone*.6*(1.-smoothstep(.2,.3,dd))*smoothstep(.5,1.,shaded)); }
  vec2 g = texture(D, q+wob).rg; float dog = g.r - .985*g.g;
  float line = clamp((1.-smoothstep(-lineTh*1.1, -lineTh*.5, dog))*lineAmt, 0., 1.);
  vec2 g2 = texture(D, q+wob+vec2(1.6,-1.)/res).rg; float mis = clamp((1.-smoothstep(-lineTh*1.1, -lineTh*.5, g2.r-.985*g2.g))*lineAmt, 0., 1.);
  col = mix(col, misCol, mis*.22);
  col = mix(col, lineCol, line);
  float a = 1.;
  if(keyAmt>0.){ a = smoothstep(keyAmt, keyAmt+.06, distance(texture(K,q).rgb, keyCol)); a = max(a, line); }
  o = vec4(col, a);
}`;
// press: print the finished frame on paper
const FS_PRESS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D s; uniform float seed, mis, grainAmt, vig, flash, fiber; uniform vec2 res; uniform vec3 paper;
${NOISE}
void main(){
  vec2 q = vec2(uv.x, 1.-uv.y); vec2 fr = q*res;
  vec3 c = texture(s, q).rgb;
  vec3 c2 = texture(s, q + vec2(mis, -mis*.6)/res).rgb;           // the dark plate, printed slightly off
  float dk = 1.-dot(c2, vec3(.333)); float dk0 = 1.-dot(c, vec3(.333));
  c = mix(c, c*vec3(.86,.9,1.), clamp(dk-dk0,0.,1.)*.9);
  float fib = fbm(fr*vec2(.004,.02)) * .6 + fbm(fr*.05)*.4;     // paper fibres + tooth
  float tooth = vn(fr*.9);
  c *= mix(1., .93 + .09*fib, .85*fiber);
  c *= 1. - .035*fiber*smoothstep(.55,.95,tooth);
  float starve = step(.992, h21(floor(fr*.5)+seed)) * smoothstep(.5,.9,dk0);   // ink starvation in flat darks
  c = mix(c, paper, starve*.5*fiber);
  float gr = h21(fr + seed*13.1) - .5; c += gr*grainAmt;
  vec2 d = q-.5; c *= 1. - vig*dot(d,d)*1.4;
  c = mix(c, vec3(1.), flash);
  o = vec4(c, 1.);
}`;

let S = null; // GL state, built on first use (W / H are only known after MV.setup)
function glState() {
  if (S) return S;
  // the passes run at output pixels (W × H × MV.scale); every px / res uniform stays in design px, so the flats, the
  // DoG lines, the screentone cells and the paper are the same size at 1080p and 4K, just sharper
  const PW = Math.round(W * MV.scale), PH = Math.round(H * MV.scale), cv = mk(PW, PH);
  if (MV.scale !== 1) cv.__k = MV.scale;
  const gl = cv.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('roto.js needs WebGL2');
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const prog = fs => {
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error('roto shader: ' + gl.getShaderInfoLog(x)); return x; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('roto link: ' + gl.getProgramInfoLog(p));
    const loc = gl.getAttribLocation(p, 'p'), U = {};
    return { use() { gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); },
      u(n) { return n in U ? U[n] : (U[n] = gl.getUniformLocation(p, n)); } };
  };
  const tex = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const fbo = t => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
  const T = [0, 1, 2, 3].map(() => tex(PW, PH)), F = T.map(fbo);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  S = { cv, gl, T, F, PW, PH, src: tex(), pressTex: tex(), cam: prog(FS_CAM), flat: prog(FS_FLAT), blur: prog(FS_BLUR), cel: prog(FS_CEL), press: prog(FS_PRESS), pals: new Map() };
  return S;
}
function palArray(pal) {
  const s = glState();
  if (!s.pals.has(pal)) { const a = new Float32Array(30); pal.slice(0, 10).forEach((h, i) => a.set(hex3(h), i * 3)); s.pals.set(pal, a); }
  return s.pals.get(pal);
}
/** Source rect (0..1) that cover-fits the frame, zoomed by cam.z about (cam.x, cam.y), kept inside the source. */
function camCrop(cam, sw, sh) {
  const z = Math.max(1, cam.z || 1), sa = sw / sh, oa = W / H;
  let w = 1, h = 1; if (sa > oa) w = oa / sa; else h = sa / oa;
  w /= z; h /= z;
  const x = clamp((cam.x ?? 0.5) - w / 2, 0, 1 - w), y = clamp((cam.y ?? 0.5) - h / 2, 0, 1 - h);
  return [x, y, w, h];
}

function rotoCel(src, o = {}) {
  const s = glState(), gl = s.gl, pal = typeof o.pal === 'string' ? ROTO.PAL[o.pal] : (o.pal || ROTO.PAL.mono);
  if (!pal) throw new Error(`roto: unknown palette "${o.pal}"`);
  const sw = src.naturalWidth || src.videoWidth || src.width, sh = src.naturalHeight || src.videoHeight || src.height;
  const cam = o.cam || {};
  gl.viewport(0, 0, s.PW, s.PH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.src);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  // camera
  s.cam.use(); gl.uniform1i(s.cam.u('s'), 0); gl.uniform4f(s.cam.u('crop'), ...camCrop(cam, sw, sh));
  gl.uniform1f(s.cam.u('rot'), cam.rot || 0); gl.uniform1f(s.cam.u('aspect'), W / H);
  gl.bindFramebuffer(gl.FRAMEBUFFER, s.F[0]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // flatten ×3: T0 → T1 → T0 → T1
  s.flat.use(); gl.uniform1i(s.flat.u('s'), 0); gl.uniform2f(s.flat.u('px'), 1 / W, 1 / H); gl.uniform1f(s.flat.u('sc'), o.flat ?? 0.13);
  for (const [from, to] of [[0, 1], [1, 0], [0, 1]]) { gl.bindFramebuffer(gl.FRAMEBUFFER, s.F[to]); gl.bindTexture(gl.TEXTURE_2D, s.T[from]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  // DoG blurs: T1 → T2 (x) → T3 (y)
  s.blur.use(); gl.uniform1i(s.blur.u('s'), 0); gl.uniform1f(s.blur.u('s1'), 1.25); gl.uniform1f(s.blur.u('s2'), 2.0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, s.F[2]); gl.bindTexture(gl.TEXTURE_2D, s.T[1]); gl.uniform1i(s.blur.u('first'), 1); gl.uniform2f(s.blur.u('dir'), 1 / W, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, s.F[3]); gl.bindTexture(gl.TEXTURE_2D, s.T[2]); gl.uniform1i(s.blur.u('first'), 0); gl.uniform2f(s.blur.u('dir'), 0, 1 / H); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // inks + tone + lines → the canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const P = s.cel; P.use();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.T[1]); gl.uniform1i(P.u('K'), 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s.T[3]); gl.uniform1i(P.u('D'), 1);
  gl.uniform3fv(P.u('pal'), palArray(pal)); gl.uniform1i(P.u('np'), Math.min(10, pal.length));
  gl.uniform1f(P.u('seed'), (o.tick ?? 0) % 97); gl.uniform1f(P.u('lineAmt'), o.line ?? 1); gl.uniform1f(P.u('lineTh'), o.lineTh ?? 0.009);
  gl.uniform1f(P.u('tone'), o.tone ?? 0.55); gl.uniform1f(P.u('shadeMix'), o.shade ?? 0.32); gl.uniform1f(P.u('sat'), o.sat ?? 1.15); gl.uniform1f(P.u('expo'), o.expo ?? 1);
  gl.uniform3fv(P.u('lineCol'), hex3(o.lineCol || ROTO.INK.ink)); gl.uniform3fv(P.u('misCol'), hex3(o.misCol || ROTO.INK.blue)); gl.uniform3fv(P.u('shadeCol'), hex3(o.shadeCol || '#1B1714'));
  gl.uniform2f(P.u('res'), W, H); gl.uniform1f(P.u('keyAmt'), o.key ?? 0); gl.uniform3fv(P.u('keyCol'), hex3(o.keyCol || '#FFFFFF'));
  const rm = o.remap || {};
  gl.uniform3fv(P.u('remapFrom'), hex3(rm.from || '#000000')); gl.uniform3fv(P.u('remapTo'), hex3(rm.to || '#000000')); gl.uniform1f(P.u('remapAmt'), rm.amt ?? 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
  return s.cv;
}
function rotoDraw(g, src, o = {}) {
  const cv = rotoCel(src, o), r = o.rect || [0, 0, W, H];
  g.drawImage(cv, r[0], r[1], r[2], r[3]);
}

// the printing pass, over the finished frame
MV.postFilter((canvas, post, t) => {
  const p = post.press; if (!p) return;
  const o = p === true ? {} : p, s = glState(), gl = s.gl;
  gl.viewport(0, 0, s.PW, s.PH); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.pressTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  const P = s.press; P.use(); gl.uniform1i(P.u('s'), 0);
  gl.uniform1f(P.u('seed'), tick(t) % 97); gl.uniform1f(P.u('mis'), Math.min(o.mis ?? 1.5, 4));
  gl.uniform1f(P.u('grainAmt'), o.grain ?? 0.03); gl.uniform1f(P.u('vig'), o.vig ?? 0.35); gl.uniform1f(P.u('flash'), clamp(o.flash ?? 0));
  gl.uniform1f(P.u('fiber'), o.fiber ?? 1); gl.uniform2f(P.u('res'), W, H); gl.uniform3fv(P.u('paper'), hex3(o.paper || ROTO.INK.paper));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const c = canvas.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'copy';
  c.drawImage(s.cv, 0, 0); c.restore();
});

// ---------------------------------------------------------------- marks
/** ✻-like radial burst (n points). o: n, rot, inner, col, stroke, lw */
function rotoSpark(g, x, y, r, o = {}) {
  const n = o.n || 8, inner = o.inner ?? 0.18;
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * inner : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = o.col || ROTO.INK.claude; g.fill();
  if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lw || 4; g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------- type (riso register)
const LAYOUT = new Map();
/** When a lyric line has to be gone: o.until, else the start of the next sung line (lines never overlap). */
function lineUntil(line, o) {
  if (o.until != null) return o.until;
  const nx = MV.lyrics && MV.lyrics.lines[line.i + 1];
  return nx && nx.words.length ? nx.words[0].start : Infinity;
}
/** Fit a lyric line's words into box [x, y, w, h], largest size first. → {size, lh, lines: [[{…word, s, ww, x}]]} */
function rotoLayout(g, line, box, font, max, upper = true) {
  const key = `${line.i}|${box.join(',')}|${max}|${font(1)}|${upper}`;
  if (LAYOUT.has(key)) return LAYOUT.get(key);
  const ws = line.words.map((w, i) => ({ ...w, k: i, s: upper ? w.w.toUpperCase() : w.w }));
  const [, , bw, bh] = box; let res = null;
  g.save();
  for (let size = max; size >= 30 && !res; size -= 6) {
    g.font = font(size); const sp = size * 0.22, lh = size * 1.0, rows = [[]]; let x = 0;
    for (const w of ws) {
      const ww = g.measureText(w.s).width;
      if (x > 0 && x + ww > bw) { rows.push([]); x = 0; }
      rows[rows.length - 1].push({ ...w, ww, x }); x += ww + sp;
    }
    rows.forEach(r => { r.w = r.length ? r[r.length - 1].x + r[r.length - 1].ww : 0; });
    if (rows.length * lh <= bh && rows.every(r => r.w <= bw)) res = { size, lh, rows };
  }
  g.restore();
  res = res || { size: 30, lh: 30, rows: [ws.map((w, i) => ({ ...w, ww: 0, x: i * 40 }))] };
  LAYOUT.set(key, res); return res;
}
/**
 * Full-screen karaoke: each word slams in on its start (never before), the word being sung takes the accent ink,
 * a second ink prints offset behind it (misregistered plate). Leaves after line.end + hold.
 * o: box, font, max, align ('left'|'center'|'right'), valign ('top'|'middle'|'bottom'), col, accent, shadow, pop, hold, upper,
 * until (default: the next line's first word — a line is gone the moment the next one starts)
 */
function rotoKara(g, t, line, o = {}) {
  if (!line || t < line.start || t >= lineUntil(line, o)) return;
  const box = o.box || [96, 620, W - 192, H - 716], font = o.font || ROTO.F.slab;
  const L = rotoLayout(g, line, box, font, o.max || 220, o.upper ?? true), [bx, by, bw, bh] = box;
  const end = line.end + (o.hold ?? 0.25), out = clamp((t - end) / 0.18); if (out >= 1) return;
  const tot = L.rows.length * L.lh, y0 = by + (o.valign === 'top' ? 0 : o.valign === 'middle' ? (bh - tot) / 2 : bh - tot);
  g.save(); g.font = font(L.size); g.textBaseline = 'top'; g.textAlign = 'left';
  L.rows.forEach((row, j) => {
    const lx = o.align === 'left' ? bx : o.align === 'right' ? bx + bw - row.w : bx + (bw - row.w) / 2;
    for (const w of row) {
      if (t < w.start) continue;
      const u = clamp((t - w.start) / 0.14), s = lerp(o.pop ?? 1.4, 1, ease.outBack(u));
      const next = line.words[w.k + 1], active = t < (next ? next.start : line.end);
      const x = lx + w.x, y = y0 + j * L.lh;
      g.save(); g.translate(x + w.ww / 2, y + L.size / 2); g.scale(s, s); g.rotate((1 - u) * (hash(w.k, line.i, 3) - 0.5) * 0.25);
      g.translate(0, -out * 40 * (j + 1)); g.globalAlpha = (1 - out) * clamp(u * 3);
      if (o.shadow !== false) { g.fillStyle = o.shadow || ROTO.INK.pink; g.fillText(w.s, -w.ww / 2 + L.size * 0.045, -L.size / 2 + L.size * 0.045); }
      g.fillStyle = active ? (o.accent || ROTO.INK.claude) : (o.col || ROTO.INK.ink); g.fillText(w.s, -w.ww / 2, -L.size / 2);
      g.restore();
    }
  });
  g.restore();
}
/** Side block: words wipe in left to right on their start. o: x, y, w, h, size, font, col, shadow, hold, upper, until */
function rotoSide(g, t, line, o = {}) {
  if (!line || t < line.start || t >= lineUntil(line, o)) return;
  const box = [o.x ?? 96, o.y ?? 300, o.w ?? 760, o.h ?? H - 396], font = o.font || ROTO.F.slab;
  const L = rotoLayout(g, line, box, font, o.size || 110, o.upper ?? true);
  const end = line.end + (o.hold ?? 0.15), out = clamp((t - end) / 0.2); if (out >= 1) return;
  g.save(); g.font = font(L.size); g.textBaseline = 'top'; g.textAlign = 'left';
  L.rows.forEach((row, j) => row.forEach(w => {
    if (t < w.start) return;
    const u = ease.outCubic(clamp((t - w.start) / 0.16)), x = box[0] + w.x + (o.align === 'right' ? box[2] - row.w : 0), y = box[1] + j * L.lh + out * 30;
    g.save(); g.beginPath(); g.rect(x - 10, y - 10, (w.ww + 20) * u, L.size * 1.25); g.clip(); g.globalAlpha = 1 - out;
    g.fillStyle = o.shadow || ROTO.INK.blue; g.fillText(w.s, x + L.size * 0.05, y + L.size * 0.05);
    g.fillStyle = o.col || ROTO.INK.cream; g.fillText(w.s, x, y); g.restore();
  }));
  g.restore();
}
/** Subtitle, bottom centre (Mincho), outlined. Fades in at line.start, out after line.end. o: y, size, col, stroke, font */
function rotoSub(g, t, line, o = {}) {
  if (!line) return;
  const a = clamp((t - line.start) / 0.15) * (1 - clamp((t - line.end - 0.2) / 0.2)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.textAlign = o.align || 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  g.font = (o.font || ROTO.F.mincho)(o.size || 54); g.lineWidth = o.lw || 10; g.strokeStyle = o.stroke || ROTO.INK.ink;
  const x = o.x ?? W / 2, y = o.y ?? H - 120;
  g.strokeText(line.text, x, y); g.fillStyle = o.col || ROTO.INK.cream; g.fillText(line.text, x, y); g.restore();
}
/** One word that slams in at t0. o: dur, from (start scale), rot, sx, col, shadow, stroke, lw, align, font, t1, a */
function rotoSlam(g, text, x, y, size, t, t0, o = {}) {
  if (t < t0 || (o.t1 != null && t > o.t1)) return;
  const u = clamp((t - t0) / (o.dur || 0.12)), s = lerp(o.from ?? 2.2, 1, ease.outBack(u));
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s * (o.sx || 1), s);
  g.font = (o.font || ROTO.F.slab)(size); g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.globalAlpha = clamp(u * 2) * (o.a ?? 1);
  if (o.shadow !== false) { g.fillStyle = o.shadow || ROTO.INK.pink; g.fillText(text, size * 0.05, size * 0.05); }
  if (o.stroke) { g.lineWidth = o.lw || size * 0.08; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(text, 0, 0); }
  g.fillStyle = o.col || ROTO.INK.ink; g.fillText(text, 0, 0); g.restore();
}
/**
 * Corner readouts. o.left: [big, small] text lines top-left; o.meter: {label, text, value 0..1, hot} top-right.
 * o.col, o.a, o.m (margin, default 96)
 */
function rotoHud(g, t, o = {}) {
  const col = o.col || ROTO.INK.cream, a = o.a ?? 0.92, m = o.m ?? 96;
  g.save(); g.globalAlpha = a; g.fillStyle = col; g.textBaseline = 'top';
  if (o.left) { g.textAlign = 'left'; g.font = ROTO.F.mono(24); g.fillText(o.left[0], m, m - 30); if (o.left[1]) { g.font = ROTO.F.monoL(15); g.fillText(o.left[1], m, m + 2); } }
  if (o.meter) {
    const M = o.meter, x = W - m, bw = 240;
    g.textAlign = 'right'; g.font = ROTO.F.mono(15); g.fillText(M.label || '', x, m - 30);
    g.font = ROTO.F.slab(58); if (M.hot) g.fillStyle = ROTO.INK.alarm; g.fillText(M.text ?? '', x, m - 10);
    g.fillStyle = col; g.globalAlpha = a * 0.35; g.fillRect(x - bw, m + 62, bw, 8);
    g.globalAlpha = a; g.fillStyle = M.hot ? ROTO.INK.alarm : ROTO.INK.claude; g.fillRect(x - bw, m + 62, bw * clamp(M.value ?? 0), 8);
  }
  g.restore();
}

MV.roto = { ROTO, rotoSeq, rotoFrame, rotoCel, rotoDraw, rotoSpark, rotoLayout, rotoKara, rotoSide, rotoSub, rotoSlam, rotoHud };
Object.assign(G, MV.roto);
})(window);
