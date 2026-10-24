import { num } from './helpers.js';

// Smooth 1D value noise in -1..1, repeatable for a given seed.
const hash = (i, seed) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1; };
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - s) + hash(i + 1, seed) * s;
}

export const sources = {
  number: { label: 'number', inputs: [num('value', 1, -100, 100)], outputs: [{ name: 'value', kind: 'num' }], eval: ([v]) => [v] },
  time: {
    label: 'time', dynamic: true,
    inputs: [num('bpm', 120, 20, 300, { int: true })],
    outputs: [{ name: 'sec', kind: 'num' }, { name: 'beat', kind: 'num' }, { name: 'phase', kind: 'num' }, { name: 'sine', kind: 'num' }],
    eval([bpm], ctx) {
      const beat = ctx.time * bpm[0] / 60, phase = beat - Math.floor(beat);
      return [[ctx.time], [beat], [phase], [Math.sin(2 * Math.PI * phase)]];
    },
  },
  range: {
    label: 'range',
    inputs: [num('count', 16, 1, 512, { int: true }), num('start', 0, -10, 10), num('stop', 1, -10, 10)],
    outputs: [{ name: 'list', kind: 'num' }],
    eval([count, a, b]) {
      const n = Math.min(4096, Math.max(1, Math.round(count[0])));
      return [Array.from({ length: n }, (_, i) => (n === 1 ? a[0] : a[0] + (b[0] - a[0]) * i / (n - 1)))];
    },
  },
  noise: {
    label: 'noise',
    inputs: [num('x', 0, -100, 100), num('freq', 1, 0, 20), num('shift', 0, -100, 100), num('seed', 0, 0, 99, { int: true })],
    outputs: [{ name: 'value', kind: 'num' }],
    eval([x, freq, shift, seed]) {
      return [x.map(v => noise1(v * freq[0] + shift[0], seed[0]))];
    },
  },
};
