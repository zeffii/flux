import assert from 'node:assert/strict';
import { Graph } from '../src/core/graph.js';
import { NODES } from '../src/nodes/index.js';
import { demoGraph } from '../src/core/demo.js';
import { broadcast, join, transform, vcount } from '../src/core/geo.js';
import { noise1 } from '../src/nodes/sources.js';

const run = (g, time = 0) => g.evaluate({ time });
const first = (res, id, o = 0) => res.results.get(id).out[o];

{ // broadcasting repeats the short list
  const [a, b] = broadcast([1, 2, 3], [10]);
  assert.deepEqual(a, [1, 2, 3]); assert.deepEqual(b, [10, 10, 10]);
  assert.deepEqual(broadcast([], [1])[0], [0]);
  console.log('ok: broadcast');
}

{ // generators
  const g = new Graph();
  const grid = g.add('grid', 0, 0, { 'x count': 4, 'y count': 3 }), circ = g.add('circle', 0, 0, { count: 12 }), arc = g.add('arc', 0, 0, { count: 5 }), line = g.add('line', 0, 0, { count: 6 });
  const r = run(g);
  assert.equal(vcount(first(r, grid.id)), 12);
  assert.equal(first(r, grid.id).e.length / 2, 4 * 2 + 3 * 3, 'grid edges');
  assert.equal(first(r, circ.id).e.length / 2, 12, 'circle closes');
  assert.equal(first(r, arc.id).e.length / 2, 4, 'arc stays open');
  assert.equal(vcount(first(r, line.id)), 6);
  const c = first(r, circ.id); assert.ok(Math.abs(Math.hypot(c.v[0], c.v[1]) - 2) < 1e-6, 'circle radius');
  console.log('ok: generators');
}

{ // connecting: kinds must match, an input takes one link, loops are refused
  const g = new Graph();
  const t = g.add('time'), grid = g.add('join'), m = g.add('math'), m2 = g.add('math');
  assert.equal(g.connect(t.id, 0, grid.id, 0), false, 'num into geo is refused');
  assert.equal(g.connect(t.id, 0, m.id, 0), true);
  assert.equal(g.connect(t.id, 1, m.id, 0), true); assert.equal(g.links.length, 1, 'an input has one link');
  assert.equal(g.connect(m.id, 0, m2.id, 0), true);
  assert.equal(g.connect(m2.id, 0, m.id, 1), false, 'no loops');
  console.log('ok: connect');
}

{ // array puts a copy of the shape on every vertex, and time moves it
  const g = demoGraph();
  const a = run(g, 0), b = run(g, 1.5);
  const arr = [...g.nodes.values()].find(n => n.type === 'array');
  assert.equal(vcount(first(a, arr.id)), 32 * 9, '32 copies of a 3x3 grid');
  assert.notDeepEqual(Array.from(first(a, arr.id).v.slice(0, 9)), Array.from(first(b, arr.id).v.slice(0, 9)), 'time moves it');
  assert.equal(a.views.length, 2);
  console.log('ok: array and time');
}

{ // static nodes are reused, dynamic ones are not, and an edit clears the cache
  const g = demoGraph();
  const grid = [...g.nodes.values()].find(n => n.type === 'grid');
  const x = first(run(g, 0), grid.id), y = first(run(g, 2), grid.id);
  assert.equal(x, y, 'grid is cached');
  g.nodes.get(grid.id).vals['x count'] = 4; g.touch();
  assert.notEqual(first(run(g, 2), grid.id), x, 'edit recomputes');
  console.log('ok: cache');
}

{ // math, vector, noise, lift
  const g = new Graph();
  const r = g.add('range', 0, 0, { count: 5, start: 0, stop: 4 });
  const m = g.add('math', 0, 0, { b: 2, op: 2 });
  g.connect(r.id, 0, m.id, 0);
  assert.deepEqual(first(run(g), m.id), [0, 2, 4, 6, 8]);
  const v = g.add('vector', 0, 0, { connect: 1 });
  g.connect(m.id, 0, v.id, 0);
  assert.equal(vcount(first(run(g), v.id)), 5); assert.equal(first(run(g), v.id).e.length, 8);
  const n = g.add('noise'); g.connect(r.id, 0, n.id, 0);
  assert.ok(first(run(g), n.id).every(x => x >= -1 && x <= 1));
  assert.equal(noise1(3, 1), noise1(3, 1)); assert.ok(noise1(3.5, 1) !== noise1(3, 1));
  const grid = g.add('grid'), l = g.add('lift', 0, 0, { amount: 2 });
  g.connect(grid.id, 0, l.id, 0); g.connect(n.id, 0, l.id, 1);
  assert.ok(first(run(g), l.id).v[2] !== 0 || first(run(g), l.id).v[5] !== 0, 'lift moves z');
  console.log('ok: math');
}

{ // save and load keep the graph
  const g = demoGraph(), h = Graph.from(JSON.parse(JSON.stringify(g)));
  assert.equal(h.nodes.size, g.nodes.size); assert.equal(h.links.length, g.links.length);
  assert.equal(JSON.stringify(h.toJSON()), JSON.stringify(g.toJSON()));
  const t = transform(join([run(g).views[0].geo]), { move: [1, 0, 0] });
  assert.ok(Number.isFinite(t.v[0]));
  console.log('ok: save and load');
}

{ // every node type evaluates with its defaults and stays finite
  for (const type of Object.keys(NODES)) {
    const g = new Graph(); g.add(type);
    const r = run(g); const res = [...r.results.values()][0];
    for (const o of res.out) assert.ok(Array.isArray(o) ? o.every(Number.isFinite) : Array.from(o.v).every(Number.isFinite), `${type} finite`);
  }
  console.log('ok: every node');
}

// Every edge of a closed triangle mesh is shared by exactly two triangles.
const closed = g => { const c = new Map(); for (let t = 0; t < g.f.length; t += 3) for (let k = 0; k < 3; k++) { const a = g.f[t + k], b = g.f[t + (k + 1) % 3], key = a < b ? `${a},${b}` : `${b},${a}`; c.set(key, (c.get(key) ?? 0) + 1); } return c.size > 0 && [...c.values()].every(n => n === 2); };
const one = (type, vals = {}) => { const g = new Graph(), n = g.add(type, 0, 0, vals); return first(run(g), n.id); };

{ // solids: counts, closed, Euler V - E + F = 2 on the outline polygons
  const euler = (g, faces) => vcount(g) - g.e.length / 2 + faces;
  const want = [[0, 4, 6, 4], [1, 8, 12, 6], [2, 6, 12, 8], [3, 20, 30, 12], [4, 12, 30, 20]];
  for (const [kind, v, e, f] of want) {
    const g = one('platonic', { kind });
    assert.equal(vcount(g), v, `platonic ${kind} verts`); assert.equal(g.e.length / 2, e, `platonic ${kind} edges`);
    assert.equal(euler(g, f), 2); assert.ok(closed(g), `platonic ${kind} closed`);
    for (let i = 0; i < g.v.length; i += 3) assert.ok(Math.abs(Math.hypot(g.v[i], g.v[i + 1], g.v[i + 2]) - 1) < 1e-5);
  }
  const ico = one('icosphere', { subdiv: 1 }); assert.equal(vcount(ico), 42); assert.equal(ico.f.length / 3, 80); assert.ok(closed(ico));
  const box = one('box'); assert.equal(vcount(box), 8); assert.equal(box.e.length / 2, 12); assert.ok(closed(box));
  const cyl = one('cylinder', { sides: 8, rings: 2 }); assert.equal(vcount(cyl), 24); assert.equal(euler(cyl, 8 * 2 + 2), 2); assert.ok(closed(cyl));
  const pyr = one('pyramid'); assert.equal(vcount(pyr), 5); assert.equal(pyr.e.length / 2, 8); assert.ok(closed(pyr));
  const tor = one('torus', { segments: 10, sides: 6 }); assert.equal(vcount(tor), 60); assert.equal(euler(tor, 60), 0); assert.ok(closed(tor));
  const sph = one('sphere', { segments: 8, rings: 4 }); assert.equal(vcount(sph), 8 * 3 + 2); assert.equal(euler(sph, 8 * 4), 2); assert.ok(closed(sph));
  console.log('ok: solids');
}

{ // surfaces: every kind is finite; klein and blob close in v / u
  for (let kind = 0; kind < 6; kind++) { const s = one('surface', { kind, 'u count': 12, 'v count': 10 }); assert.equal(vcount(s), 120); assert.ok(Array.from(s.v).every(Number.isFinite)); assert.ok(s.f.length > 0); }
  console.log('ok: surface');
}

{ // metaballs and skin give closed meshes about the right size
  const g = new Graph(), line = g.add('line', 0, 0, { count: 2, length: 4 }), mb = g.add('metaballs', 0, 0, { radius: 1, resolution: 24 }), sk = g.add('skin', 0, 0, { radius: 0.5, smooth: 0, resolution: 32 });
  const pt = g.add('vector'), ball = g.add('metaballs', 0, 0, { radius: 1.5, resolution: 32 });
  g.connect(line.id, 0, mb.id, 0); g.connect(line.id, 0, sk.id, 0); g.connect(pt.id, 0, ball.id, 0);
  const r = run(g), m = first(r, mb.id), s = first(r, sk.id), b = first(r, ball.id);
  assert.ok(vcount(m) > 50 && closed(m), 'metaballs closed');
  assert.ok(vcount(s) > 50 && closed(s), 'skin closed');
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < s.v.length; i += 3) { lo = Math.min(lo, s.v[i]); hi = Math.max(hi, s.v[i]); }
  assert.ok(Math.abs(lo + 2.5) < 0.2 && Math.abs(hi - 2.5) < 0.2, `skin spans the capsule (${lo}, ${hi})`);
  for (let i = 0; i < b.v.length; i += 3) assert.ok(Math.abs(Math.hypot(b.v[i], b.v[i + 1], b.v[i + 2]) - 1.5) < 0.12, 'a lone ball has its radius');
  console.log('ok: metaballs and skin');
}

{ // faces survive array, transform, lift and join
  const g = new Graph(), box = g.add('box'), ring = g.add('circle', 0, 0, { count: 5 }), arr = g.add('array'), tr = g.add('transform', 0, 0, { z: 1 }), j = g.add('join');
  g.connect(box.id, 0, arr.id, 0); g.connect(ring.id, 0, arr.id, 1); g.connect(arr.id, 0, tr.id, 0); g.connect(tr.id, 0, j.id, 0); g.connect(box.id, 0, j.id, 1);
  const r = run(g); assert.equal(first(r, arr.id).f.length, 12 * 3 * 5); assert.equal(first(r, j.id).f.length, 12 * 3 * 6); assert.ok(closed(first(r, j.id)));
  console.log('ok: faces carry through');
}
