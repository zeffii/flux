// Surfaces: parametric sheets, and implicit ones (metaballs, skin) meshed from a sampled field with surface nets.
import { num, geoIn, clampInt } from './helpers.js';
import { MeshBuilder, surfaceNets, fieldGrid, span } from '../core/mesh.js';
import { vcount, EMPTY } from '../core/geo.js';

const out = [{ name: 'geo', kind: 'geo' }];
const TAU = Math.PI * 2;

// Each kind maps (u, v) in 0..1 to a point; s is size, a and b shape it, ph is the phase to wire time into.
// wu / wv say whether the sheet closes on itself in that direction.
const KINDS = [
  { name: 'wave', f: (u, v, s, a, b, ph) => [(u - 0.5) * s, (v - 0.5) * s, a * Math.sin(TAU * b * u + ph) * Math.cos(TAU * b * v + ph)] },
  { name: 'ripple', f: (u, v, s, a, b, ph) => { const x = (u - 0.5) * s, y = (v - 0.5) * s, r = Math.hypot(x, y); return [x, y, a * Math.cos(r * b * 3 - ph) / (1 + r)]; } },
  { name: 'saddle', f: (u, v, s, a, b, ph) => { const x = (u - 0.5) * s, y = (v - 0.5) * s; return [x, y, a * (x * x - y * y) / s + Math.sin(ph) * b * 0.2 * x]; } },
  { name: 'blob', wu: true, f: (u, v, s, a, b, ph) => { const t = TAU * u, p = Math.PI * v, r = s / 2 + a * 0.3 * Math.sin(b * 3 * t + ph) * Math.sin(b * 2 * p + ph * 0.7) * Math.sin(p); return [r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p)]; } },
  { name: 'mobius', f: (u, v, s, a, b, ph) => { const t = TAU * u, w = (v - 0.5) * a, h = t * Math.max(1, Math.round(b)) / 2 + ph, R = s / 2 + w * Math.cos(h); return [R * Math.cos(t), R * Math.sin(t), w * Math.sin(h)]; } },
  { name: 'klein', wv: true, f: (u, v, s, a, b, ph) => { const t = TAU * u, p = TAU * v + ph, r = 1.5 + a, q = r + Math.cos(t / 2) * Math.sin(p) - Math.sin(t / 2) * Math.sin(2 * p), k = s / 6; return [q * Math.cos(t) * k, q * Math.sin(t) * k, (Math.sin(t / 2) * Math.sin(p) + Math.cos(t / 2) * Math.sin(2 * p)) * k * b]; } },
];

// Smooth minimum: blends two distances over a width k (k = 0 is a plain union).
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

// The box around n points, each grown by its own margin.
function bounds(n, coord, margin) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) { const m = margin(i); for (let a = 0; a < 3; a++) { const c = coord(i, a); lo[a] = Math.min(lo[a], c - m); hi[a] = Math.max(hi[a], c + m); } }
  return [lo, hi];
}

export const surfaces = {
  surface: {
    label: 'surface',
    inputs: [num('kind', 0, 0, KINDS.length - 1, { int: true, names: KINDS.map(k => k.name) }), num('u count', 40, 2, 256, { int: true }), num('v count', 40, 2, 256, { int: true }),
      num('size', 6, 0, 40), num('a', 1, -10, 10), num('b', 1, 0, 10), num('phase', 0, -100, 100)],
    outputs: out,
    eval([kind, cu, cv, size, a, b, ph]) {
      const K = KINDS[clampInt(kind, 0, KINDS.length - 1)], nu = clampInt(cu, 2, 1024), nv = clampInt(cv, 2, 1024), m = new MeshBuilder();
      const iu = K.wu ? nu : nu - 1, iv = K.wv ? nv : nv - 1;
      const ids = Array.from({ length: nv }, (_, j) => Array.from({ length: nu }, (_, i) => m.vert(...K.f(i / iu, j / iv, size[0], a[0], b[0], ph[0]))));
      for (let j = 0; j < iv; j++) for (let i = 0; i < iu; i++) m.poly([ids[j][i], ids[j][(i + 1) % nu], ids[(j + 1) % nv][(i + 1) % nu], ids[(j + 1) % nv][i]]);
      return [m.done()];
    },
  },
  // A ball on every vertex of `at`. A radius is the ball's size alone; close balls flow together.
  // Lower the threshold for more merging. A negative radius carves instead of adding.
  metaballs: {
    label: 'metaballs',
    inputs: [geoIn('at'), num('radius', 1, -10, 10), num('threshold', 0.4, 0.02, 0.98), num('resolution', 32, 8, 96, { int: true })],
    outputs: out,
    eval([at, radius, thr, res]) {
      const n = vcount(at); if (!n) return [EMPTY];
      const t = Math.min(0.98, Math.max(0.02, thr[0])), spread = 1 / Math.sqrt(1 - Math.cbrt(t));
      const balls = Array.from({ length: n }, (_, i) => { const r = radius[Math.min(i, radius.length - 1)] ?? 0; return { p: [at.v[i * 3], at.v[i * 3 + 1], at.v[i * 3 + 2]], R: Math.abs(r) * spread, sign: Math.sign(r) }; }).filter(b => b.R > 0);
      if (!balls.length) return [EMPTY];
      const [lo, hi] = bounds(balls.length, (i, a) => balls[i].p[a], i => balls[i].R);
      const g = fieldGrid(lo, hi, clampInt(res, 4, 128)); if (!g) return [EMPTY];
      const F = new Float32Array(g.size).fill(t);
      for (const { p, R, sign } of balls) {
        const [[i0, i1], [j0, j1], [k0, k1]] = span(g, p.map(x => x - R), p.map(x => x + R)), R2 = R * R;
        for (let k = k0; k <= k1; k++) { const dz = g.o[2] + k * g.s - p[2];
          for (let j = j0; j <= j1; j++) { const dy = g.o[1] + j * g.s - p[1], base = g.nx * (j + g.ny * k);
            for (let i = i0; i <= i1; i++) { const dx = g.o[0] + i * g.s - p[0], d2 = dx * dx + dy * dy + dz * dz; if (d2 < R2) { const q = 1 - d2 / R2; F[base + i] -= sign * q * q * q; } } } }
      }
      return [surfaceNets(F, g.nx, g.ny, g.nz, g.o, g.s)];
    },
  },
  // Wrap an edge net in a skin: a rounded tube along every edge, radius per vertex, joints blended by `smooth`.
  skin: {
    label: 'skin',
    inputs: [geoIn('geo'), num('radius', 0.3, 0, 5), num('smooth', 0.2, 0, 3), num('resolution', 40, 8, 128, { int: true })],
    outputs: out,
    eval([geom, radius, smooth, res]) {
      const n = vcount(geom); if (!n) return [EMPTY];
      const V = geom.v, rad = i => Math.abs(radius[Math.min(i, radius.length - 1)] ?? 0), k = Math.max(0, smooth[0]);
      const used = new Uint8Array(n); for (const i of geom.e) used[i] = 1;
      const [lo, hi] = bounds(n, (i, a) => V[i * 3 + a], i => rad(i) + k);
      const g = fieldGrid(lo, hi, clampInt(res, 4, 160)); if (!g) return [EMPTY];
      const F = new Float32Array(g.size).fill(1e9);
      // Visit the samples near a box and fold in a distance.
      const paint = (blo, bhi, dist) => {
        const [[i0, i1], [j0, j1], [k0, k1]] = span(g, blo, bhi);
        for (let kk = k0; kk <= k1; kk++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const idx = i + g.nx * (j + g.ny * kk); F[idx] = smin(F[idx], dist(g.o[0] + i * g.s, g.o[1] + j * g.s, g.o[2] + kk * g.s), k);
        }
      };
      for (let e = 0; e < geom.e.length; e += 2) {
        const a = geom.e[e], b = geom.e[e + 1], ra = rad(a), rb = rad(b), m = Math.max(ra, rb) + k;
        const ax = V[a * 3], ay = V[a * 3 + 1], az = V[a * 3 + 2], bx = V[b * 3] - ax, by = V[b * 3 + 1] - ay, bz = V[b * 3 + 2] - az, L2 = bx * bx + by * by + bz * bz;
        paint([Math.min(ax, ax + bx) - m, Math.min(ay, ay + by) - m, Math.min(az, az + bz) - m], [Math.max(ax, ax + bx) + m, Math.max(ay, ay + by) + m, Math.max(az, az + bz) + m], (x, y, z) => {
          const px = x - ax, py = y - ay, pz = z - az, t = L2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / L2)) : 0;
          return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t);
        });
      }
      for (let i = 0; i < n; i++) if (!used[i]) {   // loose vertices become balls
        const r = rad(i), cx = V[i * 3], cy = V[i * 3 + 1], cz = V[i * 3 + 2], m = r + k;
        paint([cx - m, cy - m, cz - m], [cx + m, cy + m, cz + m], (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r);
      }
      return [surfaceNets(F, g.nx, g.ny, g.nz, g.o, g.s)];
    },
  },
};
