// Geometry is the one thing a geo wire carries: packed xyz vertices and edge index pairs.
// Z is up, as in Blender. Numbers on num wires are plain arrays (lists), broadcast like Sverchok does.
export const EMPTY = Object.freeze({ v: new Float32Array(0), e: new Uint32Array(0) });
export const geo = (v, e) => ({ v: v instanceof Float32Array ? v : Float32Array.from(v), e: e instanceof Uint32Array ? e : Uint32Array.from(e ?? []) });
export const vcount = g => g.v.length / 3;

// Repeat the shorter lists to the length of the longest, so [1,2,3] + [10] works. An empty list counts as [0].
export function broadcast(...lists) {
  const ls = lists.map(l => (l && l.length ? l : [0]));
  const n = Math.max(...ls.map(l => l.length));
  return ls.map(l => { const o = new Array(n); for (let i = 0; i < n; i++) o[i] = l[Math.min(i, l.length - 1)]; return o; });
}

export function join(list) {
  let nv = 0, ne = 0;
  for (const g of list) { nv += g.v.length; ne += g.e.length; }
  const v = new Float32Array(nv), e = new Uint32Array(ne);
  let ov = 0, oe = 0;
  for (const g of list) {
    v.set(g.v, ov);
    const base = ov / 3;
    for (let i = 0; i < g.e.length; i++) e[oe + i] = g.e[i] + base;
    ov += g.v.length; oe += g.e.length;
  }
  return { v, e };
}

const RAD = Math.PI / 180;
// Scale about the origin, rotate (x, then y, then z, degrees), then move.
export function transform(g, { move = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const [cx, cy, cz] = rot.map(d => Math.cos(d * RAD)), [sx, sy, sz] = rot.map(d => Math.sin(d * RAD));
  const v = new Float32Array(g.v.length);
  for (let i = 0; i < g.v.length; i += 3) {
    let x = g.v[i] * scale[0], y = g.v[i + 1] * scale[1], z = g.v[i + 2] * scale[2], t;
    t = y * cx - z * sx; z = y * sx + z * cx; y = t;
    t = x * cy + z * sy; z = -x * sy + z * cy; x = t;
    t = x * cz - y * sz; y = x * sz + y * cz; x = t;
    v[i] = x + move[0]; v[i + 1] = y + move[1]; v[i + 2] = z + move[2];
  }
  return { v, e: g.e };
}

// A chain (or closed loop) of edges through n vertices.
export function chain(n, closed) {
  const e = [];
  for (let i = 0; i + 1 < n; i++) e.push(i, i + 1);
  if (closed && n > 2) e.push(n - 1, 0);
  return e;
}
