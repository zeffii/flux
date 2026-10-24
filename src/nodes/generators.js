import { num, clampInt } from './helpers.js';
import { geo, chain } from '../core/geo.js';

const out = [{ name: 'geo', kind: 'geo' }];
const RAD = Math.PI / 180;

function arcPoints(n, r, a0, a1, closed) {
  const v = new Float32Array(n * 3), step = closed ? (a1 - a0) / n : n > 1 ? (a1 - a0) / (n - 1) : 0;
  for (let i = 0; i < n; i++) { const a = (a0 + step * i) * RAD; v[i * 3] = Math.cos(a) * r; v[i * 3 + 1] = Math.sin(a) * r; }
  return geo(v, chain(n, closed));
}

export const generators = {
  grid: {
    label: 'grid',
    inputs: [num('x count', 5, 1, 64, { int: true }), num('y count', 5, 1, 64, { int: true }), num('x size', 2, 0, 20), num('y size', 2, 0, 20)],
    outputs: out,
    eval([cx, cy, sx, sy]) {
      const nx = clampInt(cx, 1, 256), ny = clampInt(cy, 1, 256), v = new Float32Array(nx * ny * 3), e = [], f = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = (j * nx + i) * 3;
        v[k] = nx > 1 ? (i / (nx - 1) - 0.5) * sx[0] : 0; v[k + 1] = ny > 1 ? (j / (ny - 1) - 0.5) * sy[0] : 0;
        if (i + 1 < nx) e.push(j * nx + i, j * nx + i + 1);
        if (j + 1 < ny) e.push(j * nx + i, (j + 1) * nx + i);
        if (i + 1 < nx && j + 1 < ny) { const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx; f.push(a, b, c, a, c, d); }
      }
      return [geo(v, e, f)];
    },
  },
  circle: {
    label: 'circle',
    inputs: [num('count', 24, 3, 256, { int: true }), num('radius', 2, 0, 20)],
    outputs: out,
    eval: ([n, r]) => [arcPoints(clampInt(n, 3, 4096), r[0], 0, 360, true)],
  },
  arc: {
    label: 'arc',
    inputs: [num('count', 16, 2, 256, { int: true }), num('radius', 2, 0, 20), num('start', 0, -360, 360), num('end', 180, -360, 360)],
    outputs: out,
    eval: ([n, r, a, b]) => [arcPoints(clampInt(n, 2, 4096), r[0], a[0], b[0], false)],
  },
  line: {
    label: 'line',
    inputs: [num('count', 8, 2, 256, { int: true }), num('length', 4, 0, 40)],
    outputs: out,
    eval([cn, len]) {
      const n = clampInt(cn, 2, 4096), v = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) v[i * 3] = (i / (n - 1) - 0.5) * len[0];
      return [geo(v, chain(n, false))];
    },
  },
};
