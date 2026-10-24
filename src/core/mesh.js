// Building meshes from polygons, and turning a sampled field into a surface (surface nets).
import { geo } from './geo.js';

// Add vertices and polygons of any size: each polygon adds its outline as edges (shared ones once) and a triangle fan as faces.
export class MeshBuilder {
  constructor() { this.v = []; this.e = []; this.f = []; this.seen = new Set(); }
  vert(x, y, z) { this.v.push(x, y, z); return this.v.length / 3 - 1; }
  edge(a, b) {
    if (a === b) return;
    const k = a < b ? a * 4194304 + b : b * 4194304 + a;
    if (this.seen.has(k)) return;
    this.seen.add(k); this.e.push(a, b);
  }
  poly(ids) {
    const n = ids.length;
    for (let i = 0; i < n; i++) this.edge(ids[i], ids[(i + 1) % n]);
    for (let i = 1; i + 1 < n; i++) this.f.push(ids[0], ids[i], ids[i + 1]);
  }
  done() { return geo(this.v, this.e, this.f); }
}

// Corners of a cube cell (bit 1 = x, 2 = y, 4 = z) and its 12 edges as corner pairs.
const CORNER = Array.from({ length: 8 }, (_, b) => [b & 1, (b >> 1) & 1, (b >> 2) & 1]);
const EDGES = [];
for (let b = 0; b < 8; b++) for (const bit of [1, 2, 4]) if (!(b & bit)) EDGES.push([b, b | bit]);

// A field sampled on an nx*ny*nz grid (index i + nx*(j + ny*k)), negative inside. One vertex per cell the surface
// crosses, one quad per grid edge it crosses. Gives a closed quad mesh when the border samples are all outside.
export function surfaceNets(F, nx, ny, nz, o, s) {
  const m = new MeshBuilder(), cell = new Int32Array(nx * ny * nz).fill(-1), c = new Float64Array(8);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let b = 0; b < 8; b++) { const q = CORNER[b]; c[b] = F[id(i + q[0], j + q[1], k + q[2])]; if (c[b] < 0) mask |= 1 << b; }
    if (mask === 0 || mask === 255) continue;
    let px = 0, py = 0, pz = 0, n = 0;
    for (const [a, b] of EDGES) {
      if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
      const t = c[a] / (c[a] - c[b]), A = CORNER[a], B = CORNER[b];
      px += A[0] + t * (B[0] - A[0]); py += A[1] + t * (B[1] - A[1]); pz += A[2] + t * (B[2] - A[2]); n++;
    }
    cell[id(i, j, k)] = m.vert(o[0] + (i + px / n) * s, o[1] + (j + py / n) * s, o[2] + (k + pz / n) * s);
  }
  const C = (i, j, k) => cell[id(i, j, k)];
  const quad = (inside, a, b, cc, d) => m.poly(inside ? [a, b, cc, d] : [d, cc, b, a]);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const here = F[id(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && here !== F[id(i + 1, j, k)] < 0)
      quad(here, C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k));
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && here !== F[id(i, j + 1, k)] < 0)
      quad(here, C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1));
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && here !== F[id(i, j, k + 1)] < 0)
      quad(here, C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k));
  }
  return m.done();
}

// A sampling grid over a box: `res` cells across its longest side, padded by two cells all round.
export function fieldGrid(lo, hi, res) {
  const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  if (!(ext > 1e-6)) return null;
  const s = ext / res, o = lo.map(x => x - 2 * s);
  const [nx, ny, nz] = [0, 1, 2].map(a => Math.ceil((hi[a] - lo[a]) / s) + 5);
  return { nx, ny, nz, s, o, size: nx * ny * nz };
}

// The sample index range a box [lo, hi] covers, clamped to the grid.
export function span(g, lo, hi) {
  const n = [g.nx, g.ny, g.nz];
  return [0, 1, 2].map(a => [Math.max(0, Math.floor((lo[a] - g.o[a]) / g.s)), Math.min(n[a] - 1, Math.ceil((hi[a] - g.o[a]) / g.s))]);
}
