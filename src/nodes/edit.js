// The edit node: hand edits layered on top of whatever geometry flows in.
//
// Each edited vertex is either
//   offset (d): moved relative to where upstream puts it, so it still follows the parametric shape, or
//   pinned (p): held at an absolute position, cut loose from upstream.
// `amount` blends from the upstream shape (0) to the fully edited one (1).
// Edits are keyed by vertex index, so if upstream changes its vertex count they may land on other vertices:
// the node warns, and applies what still fits.
import { num, geoIn } from './helpers.js';
import { geo, vcount } from '../core/geo.js';

export const EDITS = '#edits';
const warnings = new Map();   // node id -> warning text

export const editsOf = node => node.vals[EDITS] ?? { n: 0, d: {}, p: {} };

// Where each vertex sits with the edits at full strength.
export function fullPositions(up, edits) {
  const v = Float32Array.from(up.v), n = vcount(up);
  for (const [k, d] of Object.entries(edits.d)) { const i = +k; if (i < n) { v[i * 3] += d[0]; v[i * 3 + 1] += d[1]; v[i * 3 + 2] += d[2]; } }
  for (const [k, p] of Object.entries(edits.p)) { const i = +k; if (i < n) { v[i * 3] = p[0]; v[i * 3 + 1] = p[1]; v[i * 3 + 2] = p[2]; } }
  return v;
}

// New edits after the vertices `ids` were moved to `pos` (full-strength positions, xyz per id).
// Pinned vertices stay pinned at their new place; the rest become offsets from upstream.
export function moved(up, edits, ids, pos) {
  const d = { ...edits.d }, p = { ...edits.p };
  ids.forEach((i, k) => {
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
    if (p[i]) { p[i] = [x, y, z]; return; }
    const o = [x - up.v[i * 3], y - up.v[i * 3 + 1], z - up.v[i * 3 + 2]];
    if (Math.hypot(...o) < 1e-7) delete d[i]; else d[i] = o;
  });
  return { n: vcount(up), d, p };
}

// Pin the vertices where they are now, or (if all are pinned already) let them follow upstream again, keeping their place as an offset.
export function togglePin(up, edits, ids) {
  const full = fullPositions(up, edits), d = { ...edits.d }, p = { ...edits.p }, unpin = ids.every(i => p[i]);
  for (const i of ids) {
    const at = [full[i * 3], full[i * 3 + 1], full[i * 3 + 2]];
    if (unpin) { delete p[i]; const o = [at[0] - up.v[i * 3], at[1] - up.v[i * 3 + 1], at[2] - up.v[i * 3 + 2]]; if (Math.hypot(...o) >= 1e-7) d[i] = o; }
    else { delete d[i]; p[i] = at; }
  }
  return { n: vcount(up), d, p };
}

// Forget the edits on these vertices: back to exactly where upstream puts them.
export function cleared(up, edits, ids) {
  const d = { ...edits.d }, p = { ...edits.p };
  for (const i of ids) { delete d[i]; delete p[i]; }
  return { n: vcount(up), d, p };
}

export const isEmpty = e => !Object.keys(e.d).length && !Object.keys(e.p).length;

export const edit = {
  edit: {
    label: 'edit',
    inputs: [geoIn('geo'), num('amount', 1, 0, 1)],
    outputs: [{ name: 'geo', kind: 'geo' }],
    eval([g, amount], ctx, node) {
      const E = editsOf(node), n = vcount(g);
      warnings.set(node.id, !isEmpty(E) && E.n && E.n !== n ? `edited on ${E.n} vertices, upstream now has ${n}` : null);
      if (isEmpty(E)) return [g];
      const a = Math.min(1, Math.max(0, amount[0])), full = fullPositions(g, E);
      const v = new Float32Array(g.v.length);
      for (let i = 0; i < v.length; i++) v[i] = g.v[i] + (full[i] - g.v[i]) * a;
      return [geo(v, g.e, g.f)];
    },
    status: node => { const w = warnings.get(node.id); return w ? { warn: w } : null; },
  },
};
