// The graph: nodes with a type, a position and the values of their unlinked inputs, plus links between ports.
// Every input of a node is also its parameter: link it, or leave it and drag its value.
import { NODES } from '../nodes/index.js';
import { EMPTY } from './geo.js';

export class Graph {
  constructor() { this.nodes = new Map(); this.links = []; this.nextId = 1; this.version = 0; this.cache = new Map(); }

  touch() { this.version++; }

  add(type, x = 0, y = 0, vals = {}) {
    if (!NODES[type]) throw new Error(`unknown node type ${type}`);
    const node = { id: this.nextId++, type, x, y, vals: { ...vals } };
    this.nodes.set(node.id, node); this.touch();
    return node;
  }

  remove(id) {
    this.nodes.delete(id);
    this.links = this.links.filter(l => l.a !== id && l.b !== id);
    this.touch();
  }

  linkTo(id, input) { return this.links.find(l => l.b === id && l.bi === input); }

  // Connect output ao of node a to input bi of node b. Same kind only; an input takes one link; no loops.
  connect(a, ao, b, bi) {
    const na = this.nodes.get(a), nb = this.nodes.get(b);
    if (!na || !nb || a === b) return false;
    const out = NODES[na.type].outputs[ao], inp = NODES[nb.type].inputs[bi];
    if (!out || !inp || out.kind !== inp.kind) return false;
    if (this.reaches(b, a)) return false;
    this.links = this.links.filter(l => !(l.b === b && l.bi === bi));
    this.links.push({ a, ao, b, bi }); this.touch();
    return true;
  }

  disconnect(b, bi) { this.links = this.links.filter(l => !(l.b === b && l.bi === bi)); this.touch(); }

  // Does following links downstream from `from` arrive at `to`?
  reaches(from, to) {
    const seen = new Set(), todo = [from];
    while (todo.length) {
      const id = todo.pop();
      if (id === to) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const l of this.links) if (l.a === id) todo.push(l.b);
    }
    return false;
  }

  toJSON() {
    return { flux: 1, nodes: [...this.nodes.values()].map(n => ({ id: n.id, type: n.type, x: Math.round(n.x), y: Math.round(n.y), vals: n.vals })), links: this.links };
  }

  // Replace this graph's contents with a saved one, in place, so anything holding the graph keeps it.
  load(doc) {
    this.nodes.clear(); this.links = []; this.nextId = 1; this.cache.clear();
    for (const n of doc.nodes ?? []) if (NODES[n.type]) { this.nodes.set(n.id, { id: n.id, type: n.type, x: n.x, y: n.y, vals: { ...n.vals } }); this.nextId = Math.max(this.nextId, n.id + 1); }
    for (const l of doc.links ?? []) this.connect(l.a, l.ao, l.b, l.bi);
    this.touch();
    return this;
  }

  static from(doc) { return new Graph().load(doc); }

  // Run the graph for this moment. Nodes that do not depend on time are reused until the graph is edited.
  evaluate(ctx) {
    const memo = new Map(), busy = new Set();
    const visit = id => {
      if (memo.has(id)) return memo.get(id);
      const node = this.nodes.get(id), def = NODES[node.type];
      if (busy.has(id)) return { out: def.outputs.map(o => zero(o.kind)), ins: [], dyn: false };
      busy.add(id);
      let dyn = !!def.dynamic;
      const ins = def.inputs.map((inp, i) => {
        const l = this.linkTo(id, i);
        if (l && this.nodes.has(l.a)) { const r = visit(l.a); dyn ||= r.dyn; return r.out[l.ao]; }
        return inp.kind === 'geo' ? EMPTY : [node.vals[inp.name] ?? inp.def];
      });
      busy.delete(id);
      const hit = this.cache.get(id);
      let res;
      if (!dyn && hit && hit.ver === this.version) res = hit.res;
      else {
        let out = [];
        try { out = def.eval ? def.eval(ins, ctx, node) : []; } catch { out = []; }
        res = { out: def.outputs.map((o, i) => out[i] ?? zero(o.kind)), ins, dyn };
        this.cache.set(id, { ver: this.version, res });
      }
      memo.set(id, res);
      return res;
    };
    const views = [];
    for (const node of this.nodes.values()) {
      const r = visit(node.id);
      if (node.type === 'view') views.push({ id: node.id, geo: r.ins[0], hue: r.ins[1][0], size: r.ins[2][0], lines: r.ins[3][0] >= 0.5, faces: Math.round(r.ins[4][0]) });
    }
    return { views, results: memo };
  }
}

const zero = kind => (kind === 'geo' ? EMPTY : [0]);
