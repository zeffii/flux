// The node editor: a 2D canvas where nodes are dragged about, ports are wired, and any unlinked number is a slider.
import { COLOURS, defOf } from '../nodes/index.js';

const W = 172, HEAD = 26, ROW = 22, PAD = 8, PORT = 5.5;
const KIND = { num: '#e0a84a', geo: '#4fc3d9' };
const INK = { bg: '#0b0d10', dot: '#1b2027', node: '#161a20', head: '#1d222a', edge: '#2b323d', text: '#d5dbe4', dim: '#7c8794', bar: '#232a34', sel: '#e8edf5' };

export class Editor {
  constructor(canvas, graph, hooks = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.g = graph; this.hooks = hooks;
    this.view = { x: 30, y: 20, k: 1 }; this.sel = new Set(); this.drag = null; this.info = new Map();
    this.undoStack = []; this.redoStack = []; this.dirty = true; this.input = null;
    this.snap = () => JSON.stringify(this.g.toJSON());
    this.undoStack.push(this.snap());
    this.attach();
  }

  // ---- geometry -------------------------------------------------------------------------------------------------
  def(n) { return defOf(n); }
  size(n) { const d = this.def(n); return { w: W, h: HEAD + (d.outputs.length + d.inputs.length) * ROW + PAD }; }
  outPos(n, i) { return { x: n.x + W, y: n.y + HEAD + i * ROW + ROW / 2 }; }
  inPos(n, i) { return { x: n.x, y: n.y + HEAD + (this.def(n).outputs.length + i) * ROW + ROW / 2 }; }
  toGraph(px, py) { return { x: (px - this.view.x) / this.view.k, y: (py - this.view.y) / this.view.k }; }

  hit(px, py) {
    const p = this.toGraph(px, py), nodes = [...this.g.nodes.values()].reverse(), r = (PORT + 5) / Math.min(1, this.view.k);
    for (const n of nodes) {
      const d = this.def(n), { h } = this.size(n);
      for (let i = 0; i < d.outputs.length; i++) { const q = this.outPos(n, i); if (Math.hypot(p.x - q.x, p.y - q.y) <= r) return { kind: 'out', node: n, index: i }; }
      for (let i = 0; i < d.inputs.length; i++) { const q = this.inPos(n, i); if (Math.hypot(p.x - q.x, p.y - q.y) <= r) return { kind: 'in', node: n, index: i }; }
      if (p.x < n.x || p.x > n.x + W || p.y < n.y || p.y > n.y + h) continue;
      const row = Math.floor((p.y - n.y - HEAD) / ROW) - d.outputs.length;
      if (p.y < n.y + HEAD) return { kind: 'head', node: n };
      if (row >= 0 && row < d.inputs.length && d.inputs[row].kind === 'num' && !this.g.linkTo(n.id, row) && p.x > n.x + PAD && p.x < n.x + W - PAD) return { kind: 'slider', node: n, index: row };
      return { kind: 'body', node: n };
    }
    return null;
  }

  // ---- values ---------------------------------------------------------------------------------------------------
  value(n, i) { const inp = this.def(n).inputs[i]; return n.vals[inp.name] ?? inp.def; }
  setValue(n, i, v) {
    const inp = this.def(n).inputs[i];
    n.vals[inp.name] = inp.int ? Math.round(v) : Math.round(v * 1000) / 1000;
    this.g.touch(); this.dirty = true;
  }
  label(n, i) {
    const inp = this.def(n).inputs[i], v = this.value(n, i);
    if (inp.names) return inp.names[Math.max(0, Math.min(inp.names.length - 1, Math.round(v)))];
    return inp.int ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString();
  }

  // ---- undo -----------------------------------------------------------------------------------------------------
  commit() {
    const s = this.snap();
    if (s === this.undoStack[this.undoStack.length - 1]) return;
    this.undoStack.push(s); if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = []; this.hooks.onChange?.();
  }
  restore(s) { this.g.load(JSON.parse(s)); this.sel.clear(); this.dirty = true; this.hooks.onChange?.(); }
  undo() { if (this.undoStack.length < 2) return; this.redoStack.push(this.undoStack.pop()); this.restore(this.undoStack[this.undoStack.length - 1]); }
  redo() { if (!this.redoStack.length) return; const s = this.redoStack.pop(); this.undoStack.push(s); this.restore(s); }
  reset(doc) { this.g.load(doc); this.sel.clear(); this.undoStack = [this.snap()]; this.redoStack = []; this.dirty = true; this.fit(); }

  // ---- editing --------------------------------------------------------------------------------------------------
  addNode(type, gx, gy) {
    const n = this.g.add(type, Math.round(gx / 4) * 4, Math.round(gy / 4) * 4);
    this.sel = new Set([n.id]); this.dirty = true; this.commit();
    return n;
  }
  placeAt() { const r = this.canvas.getBoundingClientRect(); return this.toGraph(r.width / 2 - W / 2, r.height / 2 - 40); }
  deleteSelected() { for (const id of this.sel) this.g.remove(id); this.sel.clear(); this.dirty = true; this.commit(); }
  duplicateSelected() {
    const ids = [...this.sel], map = new Map(), copies = new Set();
    for (const id of ids) { const n = this.g.nodes.get(id), c = this.g.add(n.type, n.x + 28, n.y + 28, n.vals); map.set(id, c.id); copies.add(c.id); }
    for (const l of this.g.links.slice()) if (map.has(l.a) && map.has(l.b)) this.g.connect(map.get(l.a), l.ao, map.get(l.b), l.bi);
    this.sel = copies; this.dirty = true; this.commit();
  }
  fit() {
    const ns = [...this.g.nodes.values()]; if (!ns.length) return;
    const x0 = Math.min(...ns.map(n => n.x)), y0 = Math.min(...ns.map(n => n.y)), x1 = Math.max(...ns.map(n => n.x + W)), y1 = Math.max(...ns.map(n => n.y + this.size(n).h));
    const r = this.canvas.getBoundingClientRect(), k = Math.min(1.2, Math.max(0.35, Math.min((r.width - 60) / (x1 - x0), (r.height - 60) / (y1 - y0))));
    this.view = { k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: (r.height - (y1 - y0) * k) / 2 - y0 * k }; this.dirty = true;
  }

  edit(n, i) {   // double-click a slider: type a value
    this.closeInput();
    const q = this.inPos(n, i), v = this.view, box = document.createElement('input');
    box.className = 'slider-edit'; box.value = String(this.value(n, i));
    Object.assign(box.style, { left: `${(q.x + PAD) * v.k + v.x}px`, top: `${(q.y - ROW / 2) * v.k + v.y}px`, width: `${(W - PAD * 2) * v.k}px`, height: `${ROW * v.k}px` });
    const done = ok => { if (!box.isConnected) return; if (ok) { const x = parseFloat(box.value); if (Number.isFinite(x)) { this.setValue(n, i, x); this.commit(); } } this.closeInput(); };
    box.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); });
    box.addEventListener('blur', () => done(true));
    this.canvas.parentElement.appendChild(box); box.focus(); box.select(); this.input = box;
  }
  closeInput() { if (this.input?.isConnected) this.input.remove(); this.input = null; }

  // ---- events ---------------------------------------------------------------------------------------------------
  attach() {
    const c = this.canvas, pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('contextmenu', e => { e.preventDefault(); const [px, py] = pos(e); this.hooks.onMenu?.(e.clientX, e.clientY, this.toGraph(px, py)); });
    c.addEventListener('pointerdown', e => {
      if (e.button === 2) return;
      c.setPointerCapture(e.pointerId); c.focus();
      const [px, py] = pos(e), h = this.hit(px, py);
      this.hooks.onMenuClose?.();
      if (!h) { if (!e.shiftKey) this.sel.clear(); this.drag = { mode: 'pan', px, py, vx: this.view.x, vy: this.view.y }; }
      else if (h.kind === 'out') this.drag = { mode: 'wire', from: { node: h.node.id, out: h.index }, x: px, y: py };
      else if (h.kind === 'in') {
        const l = this.g.linkTo(h.node.id, h.index);
        if (l) { this.g.disconnect(h.node.id, h.index); this.drag = { mode: 'wire', from: { node: l.a, out: l.ao }, x: px, y: py }; }   // pick the wire up
        else this.drag = { mode: 'wire', to: { node: h.node.id, in: h.index }, x: px, y: py };
      } else if (h.kind === 'slider') {
        this.sel = new Set([h.node.id]);
        this.drag = { mode: 'slider', node: h.node, index: h.index, px, v0: this.value(h.node, h.index), moved: false };
      } else {
        if (e.shiftKey) this.sel.has(h.node.id) ? this.sel.delete(h.node.id) : this.sel.add(h.node.id);
        else if (!this.sel.has(h.node.id)) this.sel = new Set([h.node.id]);
        this.g.nodes.delete(h.node.id); this.g.nodes.set(h.node.id, h.node);   // to the front
        const p = this.toGraph(px, py);
        this.drag = { mode: 'move', gx: p.x, gy: p.y, starts: [...this.sel].map(id => { const n = this.g.nodes.get(id); return [n, n.x, n.y]; }) };
      }
      this.dirty = true;
    });
    c.addEventListener('pointermove', e => {
      const [px, py] = pos(e), d = this.drag;
      if (!d) { const h = this.hit(px, py), cur = !h ? 'default' : h.kind === 'slider' ? 'ew-resize' : h.kind === 'head' || h.kind === 'body' ? 'grab' : 'crosshair'; if (c.style.cursor !== cur) c.style.cursor = cur; return; }
      if (d.mode === 'pan') { this.view.x = d.vx + px - d.px; this.view.y = d.vy + py - d.py; }
      else if (d.mode === 'wire') { d.x = px; d.y = py; }
      else if (d.mode === 'slider') {
        const inp = this.def(d.node).inputs[d.index], dx = px - d.px;
        if (Math.abs(dx) > 2) d.moved = true;
        if (d.moved) this.setValue(d.node, d.index, Math.max(inp.min, Math.min(inp.max, d.v0 + dx / ((W - PAD * 2) * this.view.k) * (inp.max - inp.min) * (e.shiftKey ? 0.1 : 1))));
      } else if (d.mode === 'move') {
        const p = this.toGraph(px, py);
        for (const [n, x, y] of d.starts) { n.x = Math.round((x + p.x - d.gx) / 4) * 4; n.y = Math.round((y + p.y - d.gy) / 4) * 4; }
      }
      this.dirty = true;
    });
    const end = e => {
      const d = this.drag; this.drag = null;
      if (!d) return;
      const [px, py] = pos(e);
      if (d.mode === 'wire') {
        const h = this.hit(px, py);
        if (h && d.from && h.kind === 'in') this.g.connect(d.from.node, d.from.out, h.node.id, h.index);
        else if (h && d.to && h.kind === 'out') this.g.connect(h.node.id, h.index, d.to.node, d.to.in);
      }
      this.dirty = true; this.commit();
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('dblclick', e => { const [px, py] = pos(e), h = this.hit(px, py); if (h?.kind === 'slider') this.edit(h.node, h.index); });
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const [px, py] = pos(e), v = this.view, k = Math.max(0.3, Math.min(2.2, v.k * Math.exp(-e.deltaY * 0.0012))), f = k / v.k;
      v.x = px - (px - v.x) * f; v.y = py - (py - v.y) * f; v.k = k; this.dirty = true;
    }, { passive: false });
    c.tabIndex = 0;
    c.addEventListener('keydown', e => {
      if (e.target !== c) return;
      const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (key === 'delete' || key === 'backspace' || key === 'x') { if (this.sel.size) { this.deleteSelected(); e.preventDefault(); } }
      else if (mod && key === 'z') { e.shiftKey ? this.redo() : this.undo(); e.preventDefault(); }
      else if (mod && key === 'y') { this.redo(); e.preventDefault(); }
      else if ((mod && key === 'd') || (key === 'd' && e.shiftKey)) { if (this.sel.size) this.duplicateSelected(); e.preventDefault(); }
      else if (mod && key === 'a') { this.sel = new Set(this.g.nodes.keys()); this.dirty = true; e.preventDefault(); }
      else if (key === 'tab' || (key === 'a' && e.shiftKey)) { e.preventDefault(); const r = c.getBoundingClientRect(), p = this.placeAt(); this.hooks.onMenu?.(r.left + r.width / 2 - 120, r.top + 60, p); }
      else if (key === 'home' || key === 'f') { this.fit(); e.preventDefault(); }
    });
  }

  // ---- drawing --------------------------------------------------------------------------------------------------
  draw() {
    const c = this.canvas, d = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.floor(w * d) || c.height !== Math.floor(h * d)) { c.width = Math.floor(w * d); c.height = Math.floor(h * d); this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false;
    const x = this.ctx, v = this.view;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, w, h);   // the pane paints the background, so the code panel can show through under the dots
    const step = 24 * v.k;
    if (step > 9) { x.fillStyle = INK.dot; for (let gx = ((v.x % step) + step) % step; gx < w; gx += step) for (let gy = ((v.y % step) + step) % step; gy < h; gy += step) x.fillRect(gx - 1, gy - 1, 2, 2); }
    x.save(); x.translate(v.x, v.y); x.scale(v.k, v.k);
    x.lineWidth = 2;
    for (const l of this.g.links) {
      const a = this.g.nodes.get(l.a), b = this.g.nodes.get(l.b); if (!a || !b) continue;
      this.wire(x, this.outPos(a, l.ao), this.inPos(b, l.bi), KIND[this.def(a).outputs[l.ao].kind], 0.85);
    }
    const dr = this.drag;
    if (dr?.mode === 'wire') {
      const m = this.toGraph(dr.x, dr.y);
      if (dr.from) { const n = this.g.nodes.get(dr.from.node); this.wire(x, this.outPos(n, dr.from.out), m, KIND[this.def(n).outputs[dr.from.out].kind], 0.6); }
      else { const n = this.g.nodes.get(dr.to.node); this.wire(x, m, this.inPos(n, dr.to.in), KIND[this.def(n).inputs[dr.to.in].kind], 0.6); }
    }
    for (const n of this.g.nodes.values()) this.node(x, n);
    x.restore();
  }

  wire(x, a, b, colour, alpha) {
    const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
    x.globalAlpha = alpha; x.strokeStyle = colour; x.beginPath(); x.moveTo(a.x, a.y); x.bezierCurveTo(a.x + dx, a.y, b.x - dx, b.y, b.x, b.y); x.stroke(); x.globalAlpha = 1;
  }

  node(x, n) {
    const d = this.def(n), { h } = this.size(n), sel = this.sel.has(n.id), accent = COLOURS[d.category];
    const rr = (px, py, pw, ph, r) => { x.beginPath(); x.roundRect(px, py, pw, ph, r); };
    x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 12; x.shadowOffsetY = 3;
    rr(n.x, n.y, W, h, 6); x.fillStyle = INK.node; x.fill();
    x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
    x.save(); rr(n.x, n.y, W, h, 6); x.clip();
    x.fillStyle = INK.head; x.fillRect(n.x, n.y, W, HEAD);
    x.fillStyle = accent; x.fillRect(n.x, n.y, 3, h);
    x.restore();
    rr(n.x, n.y, W, h, 6); x.lineWidth = sel ? 1.6 : 1; x.strokeStyle = sel ? INK.sel : INK.edge; x.stroke();
    x.font = '600 12px ui-sans-serif, system-ui, sans-serif'; x.textBaseline = 'middle'; x.fillStyle = INK.text; x.textAlign = 'left';
    x.fillText(d.label ?? d.type, n.x + 12, n.y + HEAD / 2 + 0.5);
    const st = d.status?.(n);
    if (st?.error || st?.waiting) { x.beginPath(); x.arc(n.x + W - 14, n.y + HEAD / 2, 4, 0, Math.PI * 2); x.fillStyle = st.error ? '#f0566b' : INK.dim; x.fill(); }
    const res = this.info.get(n.id);
    d.outputs.forEach((o, i) => {
      const q = this.outPos(n, i), linked = this.g.links.some(l => l.a === n.id && l.ao === i);
      this.port(x, q.x, q.y, KIND[o.kind], linked);
      x.textAlign = 'right'; x.font = '12px ui-sans-serif, system-ui, sans-serif'; x.fillStyle = INK.text; x.fillText(o.name, q.x - 12, q.y);
      const out = res?.out[i];
      if (out) { const t = o.kind === 'geo' ? `${out.v.length / 3} v` : `[${out.length}]`; x.font = '10.5px ui-monospace, monospace'; x.fillStyle = INK.dim; x.fillText(t, q.x - 14 - x.measureText(o.name).width - 6, q.y); }
    });
    d.inputs.forEach((inp, i) => {
      const q = this.inPos(n, i), linked = !!this.g.linkTo(n.id, i);
      this.port(x, q.x, q.y, KIND[inp.kind], linked);
      x.font = '12px ui-sans-serif, system-ui, sans-serif';
      if (inp.kind === 'num' && !linked) {
        const bx = n.x + PAD, by = q.y - ROW / 2 + 2, bw = W - PAD * 2, bh = ROW - 4, v = this.value(n, i), f = Math.max(0, Math.min(1, (v - inp.min) / (inp.max - inp.min)));
        rr(bx, by, bw, bh, 4); x.fillStyle = INK.bar; x.fill();
        if (f > 0) { x.save(); rr(bx, by, bw, bh, 4); x.clip(); x.fillStyle = tint(accent); x.fillRect(bx, by, bw * f, bh); x.restore(); }
        x.textAlign = 'left'; x.fillStyle = INK.text; x.fillText(inp.name, bx + 7, q.y + 0.5);
        x.textAlign = 'right'; x.font = '11px ui-monospace, monospace'; x.fillText(this.label(n, i), bx + bw - 7, q.y + 0.5);
      } else { x.textAlign = 'left'; x.fillStyle = linked ? INK.text : INK.dim; x.fillText(inp.name, n.x + 14, q.y + 0.5); }
    });
  }

  port(x, px, py, colour, filled) {
    x.beginPath(); x.arc(px, py, PORT, 0, Math.PI * 2);
    x.fillStyle = filled ? colour : INK.node; x.fill(); x.lineWidth = 1.6; x.strokeStyle = colour; x.stroke();
  }
}

function tint(hex) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 0.32)`; }
