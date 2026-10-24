// Closed 3D primitives, centred on the origin, Z up. Each one outputs quads and n-gons as faces, outlines as edges.
import { num, clampInt } from './helpers.js';
import { MeshBuilder } from '../core/mesh.js';

const out = [{ name: 'geo', kind: 'geo' }];
const TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2;

// Platonic topology: vertices (any scale, normalised later) and faces.
const CUBE_V = Array.from({ length: 8 }, (_, b) => [b & 1 ? 1 : -1, b & 2 ? 1 : -1, b & 4 ? 1 : -1]);
const CUBE_F = [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]];
const TETRA = { v: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], f: [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]] };
const OCTA = { v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], f: [] };
for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) OCTA.f.push([x, y, z]);
const ICOSA = {
  v: [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]],
  f: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]],
};
const norm = p => { const l = Math.hypot(...p); return p.map(x => x / l); };

// The dual swaps faces and vertices: the dodecahedron is the icosahedron's dual.
function dual({ v, f }) {
  const cv = f.map(t => norm([0, 1, 2].map(a => t.reduce((s, i) => s + v[i][a], 0) / t.length)));
  const faces = v.map((p, i) => {
    const ax = norm(p), around = f.map((t, k) => (t.includes(i) ? k : -1)).filter(k => k >= 0);
    const u = norm(Math.abs(ax[2]) < 0.9 ? [ax[1], -ax[0], 0] : [0, ax[2], -ax[1]]), w = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
    const ang = k => { const c = cv[k]; return Math.atan2(c[0] * w[0] + c[1] * w[1] + c[2] * w[2], c[0] * u[0] + c[1] * u[1] + c[2] * u[2]); };
    return around.sort((a, b) => ang(a) - ang(b));
  });
  return { v: cv, f: faces };
}
const DODECA = dual(ICOSA);
const PLATONIC = [TETRA, { v: CUBE_V, f: CUBE_F }, OCTA, DODECA, ICOSA];

function build(v, f, scale) {
  const m = new MeshBuilder();
  for (const p of v) m.vert(p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]);
  for (const face of f) m.poly(face);
  return m.done();
}

// Rings of vertices at heights, joined by quads; `wrap` closes each ring.
function rings(m, list, wrap = true) {
  const ids = list.map(r => r.map(p => m.vert(...p)));
  for (let k = 0; k + 1 < ids.length; k++) {
    const a = ids[k], b = ids[k + 1], n = a.length;
    for (let i = 0; i < (wrap ? n : n - 1); i++) m.poly([a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]]);
  }
  return ids;
}
const ring = (n, r, z, off = 0) => Array.from({ length: n }, (_, i) => { const a = off + TAU * i / n; return [Math.cos(a) * r, Math.sin(a) * r, z]; });

export const solids = {
  box: {
    label: 'box',
    inputs: [num('x size', 2, 0, 20), num('y size', 2, 0, 20), num('z size', 2, 0, 20)],
    outputs: out,
    eval: ([x, y, z]) => [build(CUBE_V, CUBE_F, [x[0] / 2, y[0] / 2, z[0] / 2])],
  },
  cylinder: {
    label: 'cylinder',
    inputs: [num('sides', 24, 3, 128, { int: true }), num('rings', 1, 1, 64, { int: true }), num('radius', 1, 0, 10), num('top', 1, 0, 10), num('height', 2, 0, 20), num('caps', 1, 0, 1, { int: true, names: ['off', 'on'] })],
    outputs: out,
    eval([sides, rs, r, top, h, caps]) {
      const n = clampInt(sides, 3, 1024), k = clampInt(rs, 1, 512), m = new MeshBuilder();
      const ids = rings(m, Array.from({ length: k + 1 }, (_, i) => ring(n, r[0] + (top[0] - r[0]) * i / k, (i / k - 0.5) * h[0])));
      if (caps[0] >= 0.5) { m.poly(ids[0].slice().reverse()); m.poly(ids[k]); }
      return [m.done()];
    },
  },
  pyramid: {
    label: 'pyramid',
    inputs: [num('sides', 4, 3, 64, { int: true }), num('radius', 1.4, 0, 10), num('height', 2, 0, 20)],
    outputs: out,
    eval([sides, r, h]) {
      const n = clampInt(sides, 3, 1024), m = new MeshBuilder();
      const base = ring(n, r[0], -h[0] / 2, Math.PI / n).map(p => m.vert(...p)), apex = m.vert(0, 0, h[0] / 2);
      m.poly(base.slice().reverse());
      for (let i = 0; i < n; i++) m.poly([base[i], base[(i + 1) % n], apex]);
      return [m.done()];
    },
  },
  torus: {
    label: 'torus',
    inputs: [num('major', 2, 0, 20), num('minor', 0.5, 0, 10), num('segments', 32, 3, 256, { int: true }), num('sides', 12, 3, 128, { int: true })],
    outputs: out,
    eval([R, r, seg, sides]) {
      const ns = clampInt(seg, 3, 1024), nr = clampInt(sides, 3, 512), m = new MeshBuilder();
      const ids = Array.from({ length: ns }, (_, i) => { const t = TAU * i / ns; return Array.from({ length: nr }, (_, j) => { const p = TAU * j / nr, d = R[0] + r[0] * Math.cos(p); return m.vert(d * Math.cos(t), d * Math.sin(t), r[0] * Math.sin(p)); }); });
      for (let i = 0; i < ns; i++) for (let j = 0; j < nr; j++) { const a = ids[i], b = ids[(i + 1) % ns]; m.poly([a[j], b[j], b[(j + 1) % nr], a[(j + 1) % nr]]); }
      return [m.done()];
    },
  },
  sphere: {
    label: 'uv sphere',
    inputs: [num('segments', 24, 3, 256, { int: true }), num('rings', 12, 2, 128, { int: true }), num('radius', 1, 0, 10)],
    outputs: out,
    eval([seg, rs, r]) {
      const n = clampInt(seg, 3, 1024), k = clampInt(rs, 2, 512), R = r[0], m = new MeshBuilder();
      const top = m.vert(0, 0, R);
      const ids = rings(m, Array.from({ length: k - 1 }, (_, i) => { const a = Math.PI * (i + 1) / k; return ring(n, Math.sin(a) * R, Math.cos(a) * R); }));
      const bottom = m.vert(0, 0, -R), first = ids[0], last = ids[ids.length - 1];
      for (let i = 0; i < n; i++) { m.poly([top, first[i], first[(i + 1) % n]]); m.poly([bottom, last[(i + 1) % n], last[i]]); }
      return [m.done()];
    },
  },
  icosphere: {
    label: 'icosphere',
    inputs: [num('subdiv', 2, 0, 5, { int: true }), num('radius', 1, 0, 10)],
    outputs: out,
    eval([sub, r]) {
      const v = ICOSA.v.map(norm), cache = new Map();
      let f = ICOSA.f;
      const mid = (a, b) => { const k = a < b ? `${a},${b}` : `${b},${a}`; if (!cache.has(k)) { v.push(norm([0, 1, 2].map(i => v[a][i] + v[b][i]))); cache.set(k, v.length - 1); } return cache.get(k); };
      for (let s = clampInt(sub, 0, 6); s > 0; s--) f = f.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
      return [build(v, f, [r[0], r[0], r[0]])];
    },
  },
  platonic: {
    label: 'platonic',
    inputs: [num('kind', 4, 0, 4, { int: true, names: ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'] }), num('radius', 1, 0, 10)],
    outputs: out,
    eval([kind, r]) { const s = PLATONIC[clampInt(kind, 0, 4)]; return [build(s.v.map(norm), s.f, [r[0], r[0], r[0]])]; },
  },
};
