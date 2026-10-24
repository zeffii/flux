// The node registry. A node is { label, category, inputs, outputs, eval(ins, ctx, node) -> outputs, dynamic? }.
// Inputs are { name, kind: 'num' | 'geo', def, min, max, int, names }; a num input shows as a slider until something is linked to it.
import { sources } from './sources.js';
import { generators } from './generators.js';
import { modifiers } from './modifiers.js';
import { math } from './math.js';
import { solids } from './solids.js';
import { surfaces } from './surfaces.js';
import { script } from './script.js';

export const NODES = {};
for (const [category, group] of Object.entries({ Sources: sources, Generators: generators, Solids: solids, Surfaces: surfaces, Modifiers: modifiers, Math: math, Script: script })) {
  for (const [type, def] of Object.entries(group)) NODES[type] = { type, category, ...def };
}

// The viewer is a node too, so a graph can show several things in several colours.
NODES.view = {
  type: 'view', category: 'Output', label: 'view',
  inputs: [
    { name: 'geo', kind: 'geo' },
    { name: 'hue', kind: 'num', def: 190, min: 0, max: 360, int: true },
    { name: 'points', kind: 'num', def: 3, min: 0, max: 16 },
    { name: 'lines', kind: 'num', def: 1, min: 0, max: 1, int: true, names: ['off', 'on'] },
    { name: 'faces', kind: 'num', def: 2, min: 0, max: 3, int: true, names: ['off', 'flat', 'smooth', 'glow'] },
  ],
  outputs: [],
};

export const CATEGORIES = ['Sources', 'Generators', 'Solids', 'Surfaces', 'Modifiers', 'Math', 'Script', 'Output'];
export const COLOURS = { Sources: '#e0a84a', Generators: '#4fc3d9', Solids: '#6f9bf5', Surfaces: '#e58fc8', Modifiers: '#b58cf0', Math: '#6fd18a', Script: '#e8d65a', Output: '#f06b7e' };

// A node's definition. Most come straight from the registry; a script node builds its own from its code.
export const defOf = node => { const d = NODES[node.type]; return d.ports ? d.ports(node) : d; };
