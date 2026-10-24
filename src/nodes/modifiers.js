import { num, geoIn } from './helpers.js';
import { geo, join, transform, broadcast, vcount, EMPTY } from '../core/geo.js';

const out = [{ name: 'geo', kind: 'geo' }];
const RAD = Math.PI / 180;
const MAX_VERTS = 400000;

export const modifiers = {
  transform: {
    label: 'transform',
    inputs: [geoIn('geo'), num('x', 0), num('y', 0), num('z', 0), num('rot x', 0, -360, 360), num('rot y', 0, -360, 360), num('rot z', 0, -360, 360), num('scale', 1, 0, 10)],
    outputs: out,
    eval: ([g, x, y, z, rx, ry, rz, s]) => [transform(g, { move: [x[0], y[0], z[0]], rot: [rx[0], ry[0], rz[0]], scale: [s[0], s[0], s[0]] })],
  },
  // Put a copy of `shape` on every vertex of `at`. scale, rot and twist can be lists: one value per copy.
  array: {
    label: 'array',
    inputs: [geoIn('shape'), geoIn('at'), num('scale', 1, 0, 10), num('rot', 0, -360, 360), num('twist', 0, -90, 90)],
    outputs: out,
    eval([shape, at, scale, rot, twist]) {
      const n = vcount(at), per = vcount(shape);
      if (!n || !per) return [EMPTY];
      const count = Math.min(n, Math.floor(MAX_VERTS / per)), [sc, ro, tw] = broadcast(scale, rot, twist);
      const copies = [];
      for (let i = 0; i < count; i++) {
        const k = Math.min(i, sc.length - 1), a = (ro[k] + tw[k] * i) * RAD, c = Math.cos(a), s = Math.sin(a), f = sc[k];
        const v = new Float32Array(shape.v.length);
        for (let j = 0; j < v.length; j += 3) {
          const x = shape.v[j] * f, y = shape.v[j + 1] * f;
          v[j] = x * c - y * s + at.v[i * 3]; v[j + 1] = x * s + y * c + at.v[i * 3 + 1]; v[j + 2] = shape.v[j + 2] * f + at.v[i * 3 + 2];
        }
        copies.push({ v, e: shape.e, f: shape.f });
      }
      return [join(copies)];
    },
  },
  join: {
    label: 'join',
    inputs: [geoIn('a'), geoIn('b'), geoIn('c'), geoIn('d')],
    outputs: out,
    eval: ins => [join(ins)],
  },
  // Lift each vertex by a list of heights, one per vertex: wire noise or a wave into `height`.
  lift: {
    label: 'lift',
    inputs: [geoIn('geo'), num('height', 0, -10, 10), num('amount', 1, -10, 10)],
    outputs: out,
    eval([g, h, amount]) {
      const n = vcount(g), v = Float32Array.from(g.v);
      for (let i = 0; i < n; i++) v[i * 3 + 2] += h[Math.min(i, h.length - 1)] * amount[0];
      return [geo(v, g.e, g.f)];
    },
  },
};
