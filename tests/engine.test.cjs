const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');

function timeline(starts, T0 = 0) {
  let fn;
  vm.runInNewContext(source('template/timeline.js'), { MV: { timeline: f => { fn = f; } } });
  return fn({ lyrics: { lines: starts.map((start, i) => ({ i, start, end: start + 0.5, words: [{ start }] })) },
    audio: { beatBefore: t => t }, T0, T1: 2 });
}

for (const first of [0, 0.001, 0.2, 0.3, 0.31, 1]) {
  test(`template fully covers the opening when first cut is ${first}`, () => {
    const entries = timeline([first, 1.5]);
    assert.equal(entries[0].from, 0);
    assert.equal(entries.at(-1).to, 2);
    entries.forEach((e, i) => {
      assert.ok(e.to > e.from);
      if (i) assert.equal(entries[i - 1].to, e.from);
    });
  });
}
test('template covers an empty lyric track', () => {
  const entries = timeline([]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].scene, 'title');
  assert.equal(entries[0].from, 0);
  assert.equal(entries[0].to, 2);
});
test('template covers a trimmed start and repeated cut times', () => {
  const entries = timeline([0.4, 0.7, 0.7, 1.5], 0.5);
  assert.equal(entries[0].from, 0.5);
  entries.forEach((e, i) => {
    assert.ok(e.to > e.from);
    if (i) assert.equal(entries[i - 1].to, e.from);
  });
});

// Run the real startup, engine and export hook. Only drawing primitives are no-ops;
// scene callbacks observe the actual sub-frame times and effective fps.
async function engine(query) {
  const times = [], rates = [];
  function canvas() {
    const c = { width: 0, height: 0, toDataURL: () => 'data:image/png;base64,' };
    const g = new Proxy({ canvas: c, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => k in o ? o[k] : () => {} });
    c.getContext = () => g;
    return c;
  }
  const output = canvas();
  const sandbox = { console, URLSearchParams, location: { search: query },
    document: { currentScript: null, fonts: { ready: Promise.resolve() },
      createElement: canvas, getElementById: () => output, body: { classList: { add() {} } } },
    MV_PROJECT: { fps: 24, from: 0, to: 2, width: 64, height: 36, post: { grain: 0, vignette: 0 } } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of ['core', 'data', 'engine', 'player']) vm.runInContext(source(`engine/${f}.js`), ctx);
  let initFps;
  sandbox.MV.scene('sample', { init: MV => { initFps = MV.project.fps; },
    render: (g, f) => { times.push(f.t); rates.push(f.fps); } });
  sandbox.MV.timeline(() => [{ scene: 'sample', from: 0, to: 2 }]);
  await sandbox.MV.start();
  assert.equal(sandbox.MV_READY, true);
  return { sandbox, times, rates, initFps };
}

for (const fps of [24, 60]) {
  test(`export uses ${fps} fps for setup, frame info and motion blur`, async () => {
    const { sandbox: s, times, rates, initFps } = await engine(fps === 24 ? '?export=1' : '?export=1&fps=60');
    assert.equal(initFps, fps);
    assert.equal(s.MV_EXPORT.info.fps, fps);
    s.MV_EXPORT.frame(1, 4, 0.5);
    assert.equal(times.length, 4);
    for (let i = 0; i < times.length; i++) {
      const expected = 1 + ((i + 0.5) / 4 - 0.5) * 0.5 / fps;
      assert.ok(Math.abs(times[i] - expected) < 1e-12);
      assert.equal(rates[i], fps);
    }
    assert.equal(s.MV_EXPORT.error(), null);
  });
}
