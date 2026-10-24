// The code panel: opens beside the node editor when one script node is selected, and runs the code as you type.
import { CODE, DEFAULT_CODE, scriptStatus, scriptsTrusted, trustScripts } from '../nodes/script.js';
import { TEMPLATES } from '../nodes/script-templates.js';
import { highlight } from './highlight.js';

export class CodePanel {
  constructor(host, graph, editor, hooks = {}) {
    this.g = graph; this.editor = editor; this.hooks = hooks; this.id = null; this.closedFor = null; this.timer = 0; this.shown = '';
    const el = this.el = document.createElement('div');
    el.className = 'code';
    el.innerHTML = `
      <div class="code-head"><span class="code-title"></span><select title="start from a template"><option value="">templates…</option>${TEMPLATES.map((t, i) => `<option value="${i}">${t.name}</option>`).join('')}</select><button class="code-run" title="run the scripts in this file">Run scripts</button><button class="code-close" title="close (Esc)">×</button></div>
      <div class="code-body"><pre class="code-gutter"></pre><div class="code-wrap"><div class="code-band"></div><pre class="code-hl" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea></div></div>
      <div class="code-foot"></div>`;
    host.appendChild(el);
    this.ta = el.querySelector('textarea'); this.gutter = el.querySelector('.code-gutter'); this.foot = el.querySelector('.code-foot');
    this.title = el.querySelector('.code-title'); this.runBtn = el.querySelector('.code-run');
    this.hl = el.querySelector('.code-hl'); this.band = el.querySelector('.code-band');
    const ta = this.ta;
    ta.addEventListener('input', () => { this.lines(); clearTimeout(this.timer); this.timer = setTimeout(() => this.apply(), 180); });
    ta.addEventListener('scroll', () => this.sync());
    ta.addEventListener('blur', () => { this.apply(); editor.commit(); });
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Tab') { e.preventDefault(); this.indent(e.shiftKey); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.apply(); }
      else if (e.key === 'Enter') { e.preventDefault(); const s = ta.selectionStart, line = ta.value.slice(ta.value.lastIndexOf('\n', s - 1) + 1, s), pad = line.match(/^\s*/)[0] + (/[{([]\s*$/.test(line) ? '  ' : ''); this.insert(`\n${pad}`); }
      else if (e.key === 'Escape') { ta.blur(); editor.canvas.focus(); }
      else if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.apply(); hooks.onSave?.(); }
    });
    el.querySelector('select').addEventListener('change', e => {
      const t = TEMPLATES[+e.target.value]; e.target.value = '';
      if (!t || this.id === null) return;
      ta.value = t.code; this.lines(); this.apply(); editor.commit();
    });
    el.querySelector('.code-close').onclick = () => { this.closedFor = this.id; this.hide(); };
    this.runBtn.onclick = () => { trustScripts(true); this.g.touch(); hooks.onTrust?.(); };
  }

  node() { return this.id === null ? null : this.g.nodes.get(this.id); }

  // Typing through insertText keeps the textarea's own undo working.
  insert(text) { const ta = this.ta; if (!document.execCommand?.('insertText', false, text)) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } }
  indent(out) {
    const ta = this.ta, v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    if (s === e && !out) { this.insert('  '); return; }
    const a = v.lastIndexOf('\n', s - 1) + 1, block = v.slice(a, e);
    const next = block.split('\n').map(l => (out ? l.replace(/^ {1,2}/, '') : `  ${l}`)).join('\n');
    ta.setSelectionRange(a, e); this.insert(next); ta.setSelectionRange(a, a + next.length);
  }

  apply() {
    clearTimeout(this.timer);
    const n = this.node(); if (!n || n.vals[CODE] === this.ta.value) return;
    this.g.setCode(n.id, this.ta.value); this.editor.dirty = true;
  }

  // Redraw the gutter and the coloured copy of the text under the textarea.
  lines(errLine = this.errLine) {
    const count = this.ta.value.split('\n').length;
    this.gutter.innerHTML = Array.from({ length: count }, (_, i) => (i + 1 === errLine ? `<b>${i + 1}</b>` : `${i + 1}`)).join('\n') + '\n';
    this.hl.innerHTML = highlight(this.ta.value);
    this.band.style.display = errLine ? '' : 'none';
    this.sync();
  }

  sync() {
    const ta = this.ta, cs = getComputedStyle(ta), lh = parseFloat(cs.lineHeight), pad = parseFloat(cs.paddingTop);
    this.gutter.scrollTop = ta.scrollTop; this.hl.scrollTop = ta.scrollTop; this.hl.scrollLeft = ta.scrollLeft;
    if (this.errLine) this.band.style.transform = `translateY(${pad + (this.errLine - 1) * lh - ta.scrollTop}px)`;
    this.band.style.height = `${lh}px`;
  }

  hide() { if (this.el.classList.contains('open')) { this.apply(); this.editor.commit(); this.el.classList.remove('open'); } this.id = null; }

  // Called every frame: follow the selection, and show the node's status.
  update() {
    const sel = this.editor.sel, one = sel.size === 1 ? this.g.nodes.get([...sel][0]) : null;
    if (one?.id !== this.closedFor) this.closedFor = null;   // closing lasts until the selection moves on
    const target = one?.type === 'script' && one.id !== this.closedFor ? one.id : null;
    if (target !== this.id) {
      this.hide();
      if (target === null) return;
      this.id = target; this.el.classList.add('open');
      this.ta.value = one.vals[CODE] ?? DEFAULT_CODE; this.ta.scrollTop = 0; this.errLine = 0; this.lines();
    }
    const n = this.node(); if (!n) { this.hide(); return; }
    if (document.activeElement !== this.ta && (n.vals[CODE] ?? DEFAULT_CODE) !== this.ta.value) { this.ta.value = n.vals[CODE] ?? DEFAULT_CODE; this.lines(); }   // undo, or a template
    const st = scriptStatus(n.id), d = this.editor.def(n), trusted = scriptsTrusted();
    const text = !trusted ? 'Scripts in this file are paused. Read them, then press Run scripts.'
      : st?.error ? `${st.line ? `line ${st.line}: ` : ''}${st.error}` : st?.waiting ? 'waiting for its required input' : st?.log?.length ? st.log.slice(-3).join('\n') : 'ok';
    const key = `${text}|${st?.line}|${d.label}|${trusted}`;
    if (key === this.shown) return;
    this.shown = key;
    this.title.textContent = d.label;
    this.foot.textContent = text; this.foot.className = `code-foot${st?.error || !trusted ? ' bad' : ''}`;
    this.runBtn.style.display = trusted ? 'none' : '';
    this.errLine = st?.error ? st.line : 0; this.lines();
  }
}
