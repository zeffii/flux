// Wiring the page together: the loop evaluates the graph each frame, the editor shows the results, the viewer draws them.
import { Graph } from './core/graph.js';
import { demoGraph } from './core/demo.js';
import { NODES, CATEGORIES, COLOURS } from './nodes/index.js';
import { Editor } from './ui/editor.js';
import { Viewer } from './ui/viewer.js';
import { CodePanel } from './ui/code.js';
import { trustScripts, scriptsTrusted } from './nodes/script.js';
import { vcount, fcount } from './core/geo.js';

const $ = id => document.getElementById(id);
const KEY = 'flux.graph', SPLIT = 'flux.split', TRUST = 'flux.trusted';

// ---- the graph: last session's, else the demo --------------------------------------------------------------------
const graph = new Graph();
try { const saved = localStorage.getItem(KEY); saved ? graph.load(JSON.parse(saved)) : graph.load(demoGraph().toJSON()); }
catch { graph.load(demoGraph().toJSON()); }
if (!graph.nodes.size) graph.load(demoGraph().toJSON());

try { trustScripts(localStorage.getItem(TRUST) !== 'no'); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(graph.toJSON())); localStorage.setItem(TRUST, scriptsTrusted() ? 'yes' : 'no'); } catch {} };
let saveTimer = 0;
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); };

const menu = makeMenu();
const editor = new Editor($('editor'), graph, { onChange: saveSoon, onMenu: menu.open, onMenuClose: menu.close });
const viewer = new Viewer($('viewer'));
const code = new CodePanel($('editor').parentElement, graph, editor, { onSave: () => download(), onTrust: () => { save(); toast('scripts running'); } });
requestAnimationFrame(() => editor.fit());

// ---- transport ---------------------------------------------------------------------------------------------------
let playing = true, time = 0, last = performance.now();
const setPlaying = p => { playing = p; $('play').textContent = p ? 'Pause' : 'Play'; $('play').classList.toggle('on', p); };
setPlaying(true);
$('play').onclick = () => setPlaying(!playing);
$('rewind').onclick = () => { time = 0; };
$('fit').onclick = () => editor.fit();
$('add').onclick = () => { const r = $('add').getBoundingClientRect(); menu.open(r.left, r.bottom + 6, editor.placeAt()); };

// ---- files -------------------------------------------------------------------------------------------------------
function download() {
  const blob = new Blob([JSON.stringify(graph.toJSON(), null, 1)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `flux-${new Date().toISOString().slice(0, 10)}.flux`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('saved');
}
$('save').onclick = download;
$('open').onclick = () => $('file').click();
$('file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const doc = JSON.parse(await f.text()); if (!Array.isArray(doc.nodes)) throw 0;
    const scripts = doc.nodes.filter(n => n.type === 'script').length;
    trustScripts(!scripts); editor.reset(doc); save();
    toast(scripts ? `opened ${f.name}: ${scripts} script${scripts > 1 ? 's' : ''} paused until you press Run scripts` : `opened ${f.name}`);
  }
  catch { toast('not a flux file'); }
};
$('new').onclick = () => { trustScripts(true); editor.reset(demoGraph().toJSON()); save(); time = 0; toast('fresh demo graph'); };

// ---- keys that work anywhere --------------------------------------------------------------------------------------
addEventListener('keydown', e => {
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); download(); }
  else if (e.key === ' ' && !typing) { e.preventDefault(); setPlaying(!playing); }
  else if (e.key === 'Escape') menu.close();
});

// ---- the split between editor and viewer -------------------------------------------------------------------------
{
  const main = document.querySelector('main'), bar = $('split');
  const apply = f => main.style.setProperty('--split', `${Math.round(f * 1000) / 10}%`);
  try { const s = parseFloat(localStorage.getItem(SPLIT)); if (s > 0.15 && s < 0.85) apply(s); } catch {}
  bar.addEventListener('pointerdown', e => {
    bar.setPointerCapture(e.pointerId); bar.classList.add('drag');
    const r = main.getBoundingClientRect(), tall = innerWidth <= 760;
    const move = ev => { const f = Math.max(0.15, Math.min(0.85, tall ? (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width)); apply(f); editor.dirty = true; try { localStorage.setItem(SPLIT, f); } catch {} };
    const up = () => { bar.classList.remove('drag'); bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
  });
}

// ---- the loop ----------------------------------------------------------------------------------------------------
let shown = '';
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) time += dt;
  const { views, results } = graph.evaluate({ time });
  // The editor only needs redrawing when numbers it shows have changed: time-driven nodes change every frame.
  editor.info = results;
  if (playing && [...results.values()].some(r => r.dyn)) editor.dirty = true;
  code.update();
  editor.draw();
  viewer.draw(views);
  $('time').textContent = `${time.toFixed(2)} s`;
  const verts = views.reduce((s, v) => s + (v.geo ? vcount(v.geo) : 0), 0), tris = views.reduce((s, v) => s + (v.geo && v.faces ? fcount(v.geo) : 0), 0);
  const text = `${graph.nodes.size} nodes · ${verts.toLocaleString()} verts${tris ? ` · ${tris.toLocaleString()} tris` : ''}`;
  if (text !== shown) { $('stats').textContent = shown = text; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('beforeunload', save);

// ---- the add-node menu: type to filter, arrows to move, Enter to add ---------------------------------------------
function makeMenu() {
  const box = $('menu'), field = box.querySelector('input'), list = box.querySelector('.list');
  let at = { x: 0, y: 0 }, items = [], hot = 0;

  const render = () => {
    const q = field.value.trim().toLowerCase();
    list.innerHTML = ''; items = [];
    for (const cat of CATEGORIES) {
      const types = Object.values(NODES).filter(d => d.category === cat && (!q || (d.label ?? d.type).includes(q) || cat.toLowerCase().includes(q)));
      if (!types.length) continue;
      const head = document.createElement('div'); head.className = 'cat'; head.innerHTML = `<i style="background:${COLOURS[cat]}"></i>${cat}`; list.appendChild(head);
      for (const d of types) {
        const el = document.createElement('div'), i = items.length;
        el.className = 'item'; el.textContent = d.label ?? d.type;
        el.onpointerenter = () => setHot(i);
        el.onpointerdown = e => { e.preventDefault(); pick(i); };
        list.appendChild(el); items.push({ el, type: d.type });
      }
    }
    if (!items.length) list.innerHTML = '<div class="empty">no match</div>';
    setHot(0);
  };
  const setHot = i => {
    items[hot]?.el.classList.remove('hot');
    hot = Math.max(0, Math.min(items.length - 1, i));
    items[hot]?.el.classList.add('hot'); items[hot]?.el.scrollIntoView({ block: 'nearest' });
  };
  const pick = i => { const it = items[i]; if (!it) return; editor.addNode(it.type, at.x, at.y); close(); editor.canvas.focus(); };
  const close = () => { if (!box.classList.contains('open')) return; box.classList.remove('open'); };

  field.addEventListener('input', render);
  field.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { setHot(hot + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setHot(hot - 1); e.preventDefault(); }
    else if (e.key === 'Enter') { pick(hot); e.preventDefault(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { close(); editor.canvas.focus(); e.preventDefault(); }
  });
  addEventListener('pointerdown', e => { if (!box.contains(e.target)) close(); });

  const open = (x, y, graphPos) => {
    at = graphPos; field.value = ''; render();
    box.classList.add('open');
    const w = box.offsetWidth, h = box.offsetHeight;
    box.style.left = `${Math.max(6, Math.min(innerWidth - w - 6, x))}px`; box.style.top = `${Math.max(6, Math.min(innerHeight - h - 6, y))}px`;
    field.focus();
  };
  return { open, close };
}

let toastTimer = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1600 + msg.length * 30); }
