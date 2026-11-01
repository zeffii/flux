// Hand editing in the 3D view, active while an edit node is selected or active in the graph.
//
//   click        pick a vertex (Shift: add/remove)      B   box select (drag; Ctrl on release removes)
//   A            all / none (Alt+A: none)               P   pin / unpin the selection
//   G R S        move, rotate, scale the selection      Alt+G   forget the edits on the selection
//     X Y Z      constrain to an axis (again: free)
//     digits     type an exact value (units, degrees, factor)
//     click / Enter to keep, right-click / Esc to cancel
import { EDITS, editsOf, fullPositions, moved, togglePin, cleared } from '../nodes/edit.js';
import { add, scale, dot, rotate, scaleAbout, centre } from '../core/xform.js';
import { vcount } from '../core/geo.js';

const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const NAMES = { g: 'Move', r: 'Rotate', s: 'Scale' };
const PICK = 12;   // pixels

export class EditTool {
  constructor(viewer, graph, editor, hud, box) {
    Object.assign(this, { viewer, g: graph, editor, hud, box });
    this.node = null; this.up = null; this.mode = null; this.mouse = [0, 0]; this.selections = new Map(); this.boxArmed = false; this.boxing = null; this.shown = '';
  }

  get busy() { return !!(this.mode || this.boxing); }

  // Called every frame with the edit node to work on (or null) and the geometry flowing into it.
  target(node, up) {
    if (node !== this.node) { if (this.mode) this.cancel(); this.boxArmed = false; this.node = node; }
    this.up = up && vcount(up) ? up : null;
    this.viewer.tool = node ? this : null;
    this.showHud();
  }

  sel() {
    if (!this.node) return new Set();
    let s = this.selections.get(this.node.id);
    if (!s) this.selections.set(this.node.id, s = new Set());
    if (this.up) for (const i of s) if (i >= vcount(this.up)) s.delete(i);
    return s;
  }

  full() { return fullPositions(this.up, editsOf(this.node)); }
  write(edits) { this.node.vals[EDITS] = edits; this.g.touch(); this.editor.dirty = true; }

  // ---- drawing ---------------------------------------------------------------------------------------------------
  overlay() {
    if (!this.node || !this.up) return null;
    const v = this.full(), E = editsOf(this.node), s = this.sel(), n = v.length / 3, out = { plain: [], edited: [], pinned: [], selected: [] };
    for (let i = 0; i < n; i++) {
      const bucket = s.has(i) ? out.selected : E.p[i] ? out.pinned : E.d[i] ? out.edited : out.plain;
      bucket.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);
    }
    for (const k in out) out[k] = Float32Array.from(out[k]);
    return out;
  }

  showHud() {
    let text = '';
    if (this.node) {
      const st = this.editor.def(this.node).status?.(this.node);
      if (!this.up) text = 'edit: link geometry into the edit node';
      else if (this.mode) text = `${NAMES[this.mode]}${this.axis ? ` along ${this.axisName.toUpperCase()}` : ''}  ${this.readout ?? ''}${this.typed ? `  [${this.typed}]` : ''}   click/Enter keep · Esc cancel · X Y Z axis`;
      else text = `edit · ${this.sel().size} selected${this.boxArmed ? ' · drag a box' : ''}\nclick pick · B box · A all · G R S · P pin · Alt+G reset${st?.warn ? `\n⚠ ${st.warn}` : ''}`;
    }
    if (text === this.shown) return;
    this.shown = text; this.hud.textContent = text; this.hud.style.display = text ? '' : 'none';
  }

  // ---- picking ---------------------------------------------------------------------------------------------------
  click(p, shift) {
    if (!this.up || this.mode) return;
    const v = this.full(), s = this.sel();
    let best = -1, bd = PICK;
    for (let i = 0; i < v.length / 3; i++) {
      const q = this.viewer.project([v[i * 3], v[i * 3 + 1], v[i * 3 + 2]]); if (!q) continue;
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) { if (!shift) s.clear(); return; }
    if (shift) s.has(best) ? s.delete(best) : s.add(best);
    else { s.clear(); s.add(best); }
  }

  pointerDown(p, e) {
    if (this.mode) { e.button === 0 ? this.confirm() : this.cancel(); return true; }
    if (this.boxArmed && e.button === 0) { this.boxing = { a: p }; this.viewer.canvas.setPointerCapture(e.pointerId); this.drawBox(p); return true; }
    return false;
  }

  pointerMove(p) {
    if (this.mode) { this.apply(); return true; }
    if (this.boxing) { this.drawBox(p); return true; }
    return false;
  }

  pointerUp(p, e) {
    if (!this.boxing) return false;
    const a = this.boxing.a, x0 = Math.min(a[0], p[0]), x1 = Math.max(a[0], p[0]), y0 = Math.min(a[1], p[1]), y1 = Math.max(a[1], p[1]);
    const v = this.full(), s = this.sel(), remove = e.ctrlKey || e.metaKey;
    for (let i = 0; i < v.length / 3; i++) {
      const q = this.viewer.project([v[i * 3], v[i * 3 + 1], v[i * 3 + 2]]);
      if (q && q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1) remove ? s.delete(i) : s.add(i);
    }
    this.boxing = null; this.boxArmed = false; this.box.style.display = 'none';
    return true;
  }

  drawBox(p) {
    const a = this.boxing.a;
    Object.assign(this.box.style, { display: '', left: `${Math.min(a[0], p[0])}px`, top: `${Math.min(a[1], p[1])}px`, width: `${Math.abs(p[0] - a[0])}px`, height: `${Math.abs(p[1] - a[1])}px` });
  }

  // ---- keys ------------------------------------------------------------------------------------------------------
  key(e) {
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { if (this.mode) this.cancel(); e.shiftKey ? this.editor.redo() : this.editor.undo(); return true; }
    if (this.mode) {
      if (AXES[k]) { this.axisName = this.axisName === k ? null : k; this.axis = this.axisName ? AXES[k] : null; this.apply(); return true; }
      if (/^[\d.]$/.test(e.key) || (e.key === '-' && !this.typed)) { this.typed = (this.typed ?? '') + e.key; this.apply(); return true; }
      if (e.key === 'Backspace') { this.typed = this.typed?.slice(0, -1) || null; this.apply(); return true; }
      if (e.key === 'Enter') { this.confirm(); return true; }
      if (e.key === 'Escape') { this.cancel(); return true; }
      return true;
    }
    if (!this.up || mod) return false;
    const s = this.sel(), ids = () => [...s];
    if (k === 'g' && e.altKey) { if (s.size) { this.write(cleared(this.up, editsOf(this.node), ids())); this.editor.commit(); } return true; }
    if (NAMES[k] && !e.altKey) { this.start(k); return true; }
    if (k === 'a') { const all = s.size === vcount(this.up); s.clear(); if (!all && !e.altKey) for (let i = 0; i < vcount(this.up); i++) s.add(i); return true; }
    if (k === 'b') { this.boxArmed = true; return true; }
    if (k === 'p') { if (s.size) { this.write(togglePin(this.up, editsOf(this.node), ids())); this.editor.commit(); } return true; }
    if (e.key === 'Escape' && this.boxArmed) { this.boxArmed = false; return true; }
    return false;
  }

  // ---- move / rotate / scale -------------------------------------------------------------------------------------
  start(mode) {
    const ids = [...this.sel()]; if (!ids.length) return;
    this.raw = this.node.vals[EDITS]; this.orig = editsOf(this.node);
    const v = fullPositions(this.up, this.orig);
    this.ids = ids; this.p0 = ids.map(i => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]]); this.pivot = centre(v, ids);
    this.m0 = [...this.mouse]; this.mode = mode; this.axis = null; this.axisName = null; this.typed = null; this.readout = '';
    this.apply();
  }

  apply() {
    const vw = this.viewer, { right, up, back } = vw.basis(), ps = vw.project(this.pivot) ?? this.m0, m = this.mouse, m0 = this.m0;
    const typed = this.typed !== null && this.typed !== undefined && this.typed !== '-' && this.typed !== '' ? parseFloat(this.typed) : null;
    let next;
    if (this.mode === 'g') {
      let delta;
      if (typed !== null) delta = scale(this.axis ?? AXES.x, typed);
      else if (this.axis) {
        const q = vw.project(add(this.pivot, this.axis)) ?? ps, sx = q[0] - ps[0], sy = q[1] - ps[1], l2 = sx * sx + sy * sy || 1;
        delta = scale(this.axis, ((m[0] - m0[0]) * sx + (m[1] - m0[1]) * sy) / l2);
      } else {
        const q = vw.project(add(this.pivot, right)) ?? [ps[0] + 1, ps[1]], ppu = Math.hypot(q[0] - ps[0], q[1] - ps[1]) || 1;
        delta = add(scale(right, (m[0] - m0[0]) / ppu), scale(up, -(m[1] - m0[1]) / ppu));
      }
      next = this.p0.map(p => add(p, delta));
      this.readout = this.axis ? (dot(delta, this.axis)).toFixed(3) : delta.map(x => x.toFixed(2)).join(', ');
    } else if (this.mode === 'r') {
      const k = this.axis ?? back, side = Math.sign(dot(k, back)) || 1;
      const screen = Math.atan2(m[1] - ps[1], m[0] - ps[0]) - Math.atan2(m0[1] - ps[1], m0[0] - ps[0]);
      const angle = typed !== null ? typed * Math.PI / 180 : -screen * side;
      next = this.p0.map(p => rotate(p, this.pivot, k, angle));
      this.readout = `${(angle * 180 / Math.PI).toFixed(1)}°`;
    } else {
      const f = typed !== null ? typed : Math.hypot(m[0] - ps[0], m[1] - ps[1]) / Math.max(1, Math.hypot(m0[0] - ps[0], m0[1] - ps[1]));
      next = this.p0.map(p => scaleAbout(p, this.pivot, f, this.axis));
      this.readout = `×${f.toFixed(3)}`;
    }
    this.write(moved(this.up, this.orig, this.ids, Float32Array.from(next.flat())));
    this.showHud();
  }

  confirm() { this.mode = null; this.editor.commit(); this.showHud(); }
  cancel() {
    if (this.raw === undefined) delete this.node.vals[EDITS]; else this.node.vals[EDITS] = this.raw;
    this.g.touch(); this.editor.dirty = true; this.mode = null; this.showHud();
  }
}

