import { num } from './helpers.js';
import { broadcast, geo, chain } from '../core/geo.js';

const OPS = [
  ['add', (a, b) => a + b], ['sub', (a, b) => a - b], ['mul', (a, b) => a * b], ['div', (a, b) => (b === 0 ? 0 : a / b)],
  ['sin', a => Math.sin(a)], ['cos', a => Math.cos(a)], ['pow', (a, b) => Math.pow(a, b)], ['mod', (a, b) => (b === 0 ? 0 : a - b * Math.floor(a / b))],
  ['min', Math.min], ['max', Math.max], ['abs', Math.abs], ['abs sin', a => Math.abs(Math.sin(a))],
];

export const math = {
  math: {
    label: 'math',
    inputs: [num('a', 0, -100, 100), num('b', 1, -100, 100), num('op', 0, 0, OPS.length - 1, { int: true, names: OPS.map(o => o[0]) })],
    outputs: [{ name: 'out', kind: 'num' }],
    eval([a, b, op]) {
      const f = OPS[Math.max(0, Math.min(OPS.length - 1, Math.round(op[0])))][1];
      const [x, y] = broadcast(a, b);
      return [x.map((v, i) => f(v, y[i]))];
    },
  },
  // Three lists in, one list of points out. Turn connect on to run a line through them.
  vector: {
    label: 'vector',
    inputs: [num('x', 0, -10, 10), num('y', 0, -10, 10), num('z', 0, -10, 10), num('connect', 0, 0, 1, { int: true, names: ['points', 'line'] })],
    outputs: [{ name: 'geo', kind: 'geo' }],
    eval([x, y, z, connect]) {
      const [a, b, c] = broadcast(x, y, z), n = Math.min(a.length, 100000), v = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { v[i * 3] = a[i]; v[i * 3 + 1] = b[i]; v[i * 3 + 2] = c[i]; }
      return [geo(v, connect[0] >= 0.5 ? chain(n, false) : [])];
    },
  },
};
