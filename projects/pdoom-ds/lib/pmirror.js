// lib/pmirror.js — a composite scene utility: the same shot geometry seen twice, the second copy mirrored and
// dimmed. Used for "your circuits", "two of us in the room", "the model answers itself". It builds a point cloud
// from any point cloud by mirroring across x, so a shot gets a twin for free.
function pmirror(P, o) {
  o = o || {};
  const n = P.length / 3, out = new Float32Array(n * 6);
  out.set(P, 0);
  for (let i = 0; i < n; i++) {
    out[n * 3 + i * 3] = -P[i * 3] + (o.dx || 0);
    out[n * 3 + i * 3 + 1] = P[i * 3 + 1] + (o.dy || 0);
    out[n * 3 + i * 3 + 2] = P[i * 3 + 2] + (o.dz || 0);
  }
  return out;
}
window.pmirror = pmirror;
