// Syntax colouring for the script panel: JS, plus the socket header, plus socket names wherever the body uses them.
import { parseHeader, HELPER_NAMES } from '../nodes/script.js';

const KEYWORDS = new Set('const let var for of in if else while do return function new break continue switch case default throw try catch finally typeof instanceof delete void yield async await class extends super this'.split(' '));
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
const KIND_WORDS = { geo: 'geo', g: 'geo', v: 'geo', list: 'num', n: 'num', num: 'num', s: 'num' };

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls, text) => `<span class="h-${cls}">${esc(text)}</span>`;

// The class for a socket name: its kind, and whether it's an input or an output.
function socketClasses(code) {
  const { inputs, outputs } = parseHeader(code), map = new Map();
  for (const i of inputs) map.set(i.name, `${i.kind === 'geo' ? 'geo' : 'num'} h-in`);
  for (const o of outputs) map.set(o.name, `${o.kind === 'geo' ? 'geo' : 'num'} h-out`);
  return map;
}

// One header line, e.g. "// in  count 12 int 1..64", coloured part by part.
function directive(line, sockets) {
  const m = line.match(/^(\s*)(\/\/)(\s*)(>in|in|out)(\b.*)$/);
  if (!m) return null;
  const [, lead, slashes, gap, dir, rest] = m;
  let html = `${lead}${span('dim', slashes)}${gap}${span('dir', dir)}`;
  let first = true;
  for (const part of rest.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { html += part; continue; }
    if (first) { first = false; html += sockets.has(part) ? `<span class="h-${sockets.get(part)} h-decl">${esc(part)}</span>` : span('bad', part); continue; }
    if (KIND_WORDS[part]) html += span(`${KIND_WORDS[part]} h-kind`, part);
    else if (part === 'int') html += span('int', part);
    else if (/^-?[\d.]+\.\.-?[\d.]+$/.test(part)) { const [a, b] = part.split('..'); html += `${span('num-lit', a)}${span('range', '..')}${span('num-lit', b)}`; }
    else if (/^-?[\d.]+$/.test(part)) html += span('num-lit', part);
    else html += span('comment', part);
  }
  return html;
}

const TOKEN = /(\/\/[^\n]*)|(\/\*[\s\S]*?(?:\*\/|$))|('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|`(?:\\[\s\S]|[^`\\])*`?)|(\b0[xX][\da-fA-F]+\b|(?:\b\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)|([A-Za-z_$][\w$]*)|(\s+)|([\s\S])/gy;

export function highlight(code) {
  const sockets = socketClasses(code);
  let html = '', label = true, m, prevSig = '';
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    const [t, line, block, str, num, ident, ws] = m;
    if (line) {
      const atStart = TOKEN.lastIndex - t.length === 0 || /\n[ \t]*$/.test(code.slice(Math.max(0, TOKEN.lastIndex - t.length - 200), TOKEN.lastIndex - t.length));
      const dir = atStart ? directive(t, sockets) : null;
      if (dir) { html += dir; label = false; }
      else if (atStart && label && t.replace(/^\/\/\s*/, '').trim()) { html += span('label', t); label = false; }
      else html += span('comment', t);
      continue;
    }
    if (block) { html += span('comment', block); continue; }
    if (ws) { html += ws; continue; }
    label = false;
    if (str) html += span('str', str);
    else if (num) html += span('num-lit', num);
    else if (ident) {
      const after = code.slice(TOKEN.lastIndex).match(/^\s*(.)/)?.[1];
      if (prevSig === '.') html += span(after === '(' ? 'method' : 'prop', ident);
      else if (KEYWORDS.has(ident)) html += span('kw', ident);
      else if (LITERALS.has(ident)) html += span('num-lit', ident);
      else if (sockets.has(ident)) html += `<span class="h-${sockets.get(ident)}">${esc(ident)}</span>`;
      else if (HELPER_NAMES.has(ident)) html += span('helper', ident);
      else html += esc(ident);
    } else html += span('punc', t);
    prevSig = t;
  }
  return `${html}\n`;
}
