// The script node: plain JS with a comment header that declares its sockets, in the spirit of Sverchok's SNLite.
//
//   // in   count  12   int 1..64     a number: default, optional int, optional hard range (always clamped)
//   // in   heights list               the whole number list
//   // in   shape  geo                 geometry (empty when unlinked)
//   // >in  shape  geo                 required: the script waits until this is linked
//   // out  pts    geo                 an output, hoisted: `pts` already exists and is written into
//   // out  sizes  list                 a number list output, hoisted as []
//
// Inputs arrive as variables named after their sockets; outputs are flushed by name after the body runs.
// `state` survives between runs until the code changes. An error keeps the last good output and shows on the node.
import { MeshBuilder } from '../core/mesh.js';
import { geo, chain, EMPTY } from '../core/geo.js';
import { noise1 } from './sources.js';
import { TEMPLATES } from './script-templates.js';

export const CODE = '#code';

// ---- what a script can use ---------------------------------------------------------------------------------------
const rand = (i, seed = 0) => { let h = (Math.imul(Math.floor(i * 1000003) | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function range(a, b, step = 1) {
  if (b === undefined) [a, b] = [0, a];
  const out = [];
  if (!step) return out;
  for (let x = a; step > 0 ? x < b : x > b; x += step) { out.push(x); if (out.length > 1e6) break; }
  return out;
}
const zip = (...ls) => { const n = Math.min(...ls.map(l => l.length)); return Array.from({ length: n }, (_, i) => ls.map(l => l[i])); };

// Sverchok-style pydata in: [[x, y, z], ...], [[a, b], ...], [[a, b, c, ...], ...]
function mesh(verts = [], edges = [], faces = []) {
  const m = new MeshBuilder();
  for (const p of verts) m.vert(+p[0] || 0, +p[1] || 0, +p[2] || 0);
  for (const [a, b] of edges) m.edge(a, b);
  for (const f of faces) m.poly(f);
  return m.done();
}

const HELPERS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max,
  pow: Math.pow, exp: Math.exp, log: Math.log, sign: Math.sign, hypot: Math.hypot, PI: Math.PI, TAU: Math.PI * 2,
  lerp: (a, b, t) => a + (b - a) * t, clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)), fract: x => x - Math.floor(x),
  range, zip, rand, noise: noise1, mesh, chain,
};
const PER_RUN = ['time', 'state', 'print'];
const RESERVED = new Set([...Object.keys(HELPERS), ...PER_RUN]);
export const HELPER_NAMES = RESERVED;

// A geometry output: add points by position, or refer to ones already added by index.
export class GeoOut extends MeshBuilder {
  id(p) { return typeof p === 'number' ? p : this.vert(+p[0] || 0, +p[1] || 0, +p[2] || 0); }
  point(p) { return this.id(p); }
  edge(a, b) { if (Array.isArray(a) || Array.isArray(b)) a = this.id(a), b = this.id(b); super.edge(a, b); }
  line(pts) { const ids = pts.map(p => this.id(p)); for (let i = 0; i + 1 < ids.length; i++) super.edge(ids[i], ids[i + 1]); return ids; }
  loop(pts) { const ids = this.line(pts); if (ids.length > 2) super.edge(ids[ids.length - 1], ids[0]); return ids; }
  face(...pts) { if (pts.length === 1 && Array.isArray(pts[0]) && typeof pts[0][0] !== 'number') pts = pts[0]; const ids = pts.map(p => this.id(p)); this.poly(ids); return ids; }
  add(g) { const base = this.v.length / 3, src = asGeo(g); for (const x of src.v) this.v.push(x); for (let i = 0; i < src.e.length; i += 2) super.edge(src.e[i] + base, src.e[i + 1] + base); for (const i of src.f) this.f.push(i + base); return this; }
}

// A geometry input, with friendlier views on the packed arrays.
export class GeoIn {
  constructor(g) { this.v = g.v; this.e = g.e; this.f = g.f ?? EMPTY.f; this.count = g.v.length / 3; }
  get points() { return this._p ??= Array.from({ length: this.count }, (_, i) => [this.v[i * 3], this.v[i * 3 + 1], this.v[i * 3 + 2]]); }
  get edges() { return Array.from({ length: this.e.length / 2 }, (_, i) => [this.e[i * 2], this.e[i * 2 + 1]]); }
  get faces() { return Array.from({ length: this.f.length / 3 }, (_, i) => [this.f[i * 3], this.f[i * 3 + 1], this.f[i * 3 + 2]]); }
  get first() { return this.count ? this.points[0] : undefined; }
  [Symbol.iterator]() { return this.points[Symbol.iterator](); }
}

// Whatever a script left in a geo output, as geometry.
function asGeo(x) {
  if (!x) return EMPTY;
  if (x instanceof GeoOut || x instanceof MeshBuilder) return x.done();
  if (x instanceof GeoIn || x.v instanceof Float32Array) return geo(x.v, x.e, x.f);
  if (x.verts) return mesh(x.verts, x.edges, x.faces);
  if (Array.isArray(x)) return mesh(x);
  return EMPTY;
}
function asList(x) {
  if (typeof x === 'number') return [Number.isFinite(x) ? x : 0];
  if (x && typeof x[Symbol.iterator] === 'function') return Array.from(x).flat(Infinity).map(v => (Number.isFinite(+v) ? +v : 0));
  return [];
}

// ---- the header --------------------------------------------------------------------------------------------------
const KIND = { geo: 'geo', g: 'geo', v: 'geo', list: 'list', n: 'list', num: 'list', s: 'list' };
const IDENT = /^[A-Za-z_$][\w$]*$/;

export function parseHeader(code) {
  const inputs = [], outputs = [], errors = [];
  let label = '';
  const seen = new Set();
  const lines = code.split('\n');
  for (let ln = 0; ln < lines.length; ln++) {
    const m = lines[ln].match(/^\s*\/\/\s*(.*)$/);
    if (!m) continue;
    const t = m[1].trim().split(/\s+/), dir = t[0];
    if (dir !== 'in' && dir !== '>in' && dir !== 'out') { if (!label && !inputs.length && !outputs.length && m[1].trim()) label = m[1].trim().slice(0, 22); continue; }
    const name = t[1], where = `line ${ln + 1}`;
    if (!name || !IDENT.test(name)) { errors.push(`${where}: "${name ?? ''}" is not a usable name`); continue; }
    if (RESERVED.has(name)) { errors.push(`${where}: "${name}" is taken by a helper`); continue; }
    if (seen.has(name)) { errors.push(`${where}: "${name}" is declared twice`); continue; }
    seen.add(name);
    if (dir === 'out') {
      const kind = KIND[t[2] ?? 'geo'];
      if (!kind) { errors.push(`${where}: out ${name} needs geo or list`); continue; }
      outputs.push({ name, kind: kind === 'geo' ? 'geo' : 'num', list: kind === 'list' });
      continue;
    }
    const required = dir === '>in', rest = t.slice(2);
    if (KIND[rest[0]] === 'geo') { inputs.push({ name, kind: 'geo', required }); continue; }
    if (KIND[rest[0]] === 'list') { const d = parseFloat(rest[1]); inputs.push({ name, kind: 'num', list: true, required, def: Number.isFinite(d) ? d : 0, min: -10, max: 10 }); continue; }
    const def = parseFloat(rest[0]);
    if (!Number.isFinite(def)) { errors.push(`${where}: in ${name} needs a default number, geo or list`); continue; }
    const int = rest.includes('int'), r = rest.map(s => s.match(/^(-?[\d.]+)\.\.(-?[\d.]+)$/)).find(Boolean);
    let min, max, hard = false;
    if (r) { min = parseFloat(r[1]); max = parseFloat(r[2]); hard = true; if (!(max > min)) { errors.push(`${where}: range ${r[0]} is empty`); continue; } }
    else if (def > 0) { min = 0; max = Math.max(int ? 10 : 1, def * 2); }
    else if (def < 0) { min = def * 2; max = -def * 2; }
    else { min = int ? 0 : -1; max = int ? 10 : 1; }
    inputs.push({ name, kind: 'num', def, min, max, int, hard, required });
  }
  return { inputs, outputs, label, errors };
}

// ---- compiling and running ---------------------------------------------------------------------------------------
const PRELUDE_LINES = 5;   // lines our wrapper puts before the user's first line (inside the Function body)
let FN_OFFSET = null;      // lines the engine adds before the body; measured once
function fnOffset() {
  if (FN_OFFSET !== null) return FN_OFFSET;
  try { new Function('a', 'b', '\nthrow new Error()')(); } catch (e) { const m = String(e.stack).match(/<anonymous>:(\d+):\d+/) || String(e.stack).match(/Function:(\d+):\d+/); FN_OFFSET = m ? +m[1] - 2 : 2; }
  return FN_OFFSET;
}

function compile(code) {
  const head = parseHeader(code);
  const res = { ...head, fn: null, error: head.errors[0] ?? null, dynamic: /\b(time|state|print)\b/.test(code.replace(/\/\/.*$/gm, '')) };
  if (res.error) return res;
  const ins = head.inputs.map(i => i.name), outs = head.outputs.map(o => o.name);
  const src = [
    '"use strict";',
    `const { ${[...Object.keys(HELPERS), ...PER_RUN].join(', ')} } = __h;`,
    `let { ${ins.join(', ')} } = __in;`,
    outs.length ? `let ${outs.map((n, i) => `${n} = __out[${i}]`).join(', ')};` : ';',
    '(() => {',
    code,
    '\n})();',
    `return [${outs.join(', ')}];`,
  ].join('\n');
  try { res.fn = new Function('__in', '__h', '__out', src); }
  catch (e) { res.error = `${e.name}: ${e.message}`; }
  return res;
}

const compiled = new Map();   // code -> compiled
const runtime = new Map();    // node id -> { code, state, last, error, line, log }
let trusted = true;
export const trustScripts = on => { trusted = on; };
export const scriptsTrusted = () => trusted;
export const scriptStatus = id => runtime.get(id);

function rt(node, code) {
  let r = runtime.get(node.id);
  if (!r || r.code !== code) { r = { code, state: {}, last: null, error: null, line: 0, log: [] }; runtime.set(node.id, r); }
  return r;
}

function errorLine(e) {
  const m = String(e?.stack ?? '').match(/<anonymous>:(\d+):\d+/) || String(e?.stack ?? '').match(/Function:(\d+):\d+/);
  return m ? +m[1] - fnOffset() - PRELUDE_LINES : 0;
}

function run(c, node, ins, ctx) {
  const code = node.vals[CODE] ?? DEFAULT_CODE, r = rt(node, code);
  const fail = (msg, line = 0) => { r.error = msg; r.line = line; return r.last ?? []; };
  if (!trusted) return fail('paused: this file\'s scripts have not been run yet');
  if (c.error) return fail(c.error, +(c.error.match(/^line (\d+)/)?.[1] ?? 0));
  if (c.inputs.some((inp, i) => inp.required && inp.kind === 'geo' && !ins[i].v.length)) { r.error = null; r.waiting = true; return []; }
  r.waiting = false;
  const args = {};
  c.inputs.forEach((inp, i) => {
    const raw = ins[i];
    if (inp.kind === 'geo') args[inp.name] = new GeoIn(raw);
    else if (inp.list) args[inp.name] = Array.from(raw);
    else {
      let v = raw[0] ?? inp.def;
      if (inp.int) v = Math.round(v);
      if (inp.hard) v = Math.min(inp.max, Math.max(inp.min, v));
      args[inp.name] = v;
    }
  });
  const outs = c.outputs.map(o => (o.kind === 'geo' ? new GeoOut() : []));
  const log = [];
  const h = { ...HELPERS, time: ctx?.time ?? 0, state: r.state, print: (...a) => { if (log.length < 50) log.push(a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } };
  try {
    const got = c.fn(args, h, outs);
    r.last = c.outputs.map((o, i) => (o.kind === 'geo' ? asGeo(got[i]) : asList(got[i])));
    r.error = null; r.line = 0; r.log = log;
    return r.last;
  } catch (e) {
    r.log = log;
    return fail(`${e?.name ?? 'Error'}: ${e?.message ?? e}`, errorLine(e));
  }
}

// The node's sockets depend on its code, so the definition is built per code string (and shared by equal scripts).
const defs = new Map();
function defFor(code) {
  let d = defs.get(code);
  if (d) return d;
  if (defs.size > 200) defs.clear();
  const c = compiled.get(code) ?? compile(code);
  compiled.set(code, c);
  d = {
    type: 'script', category: 'Script', label: c.label || 'script', dynamic: c.dynamic,
    inputs: c.inputs.map(i => (i.kind === 'geo' ? { name: i.name, kind: 'geo' } : { name: i.name, kind: 'num', def: i.def, min: i.min, max: i.max, int: i.int })),
    outputs: c.outputs.map(o => ({ name: o.name, kind: o.kind })),
    eval: (ins, ctx, node) => run(c, node, ins, ctx),
    status: node => runtime.get(node.id),
  };
  defs.set(code, d);
  return d;
}

export const DEFAULT_CODE = TEMPLATES[0].code;

export const script = {
  script: {
    label: 'script', dynamic: true,
    inputs: [], outputs: [],
    ports: node => defFor(node.vals[CODE] ?? DEFAULT_CODE),
  },
};
