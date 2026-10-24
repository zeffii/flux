// The node registry. A node is { label, category, inputs, outputs, eval(ins, ctx, node) -> outputs, dynamic? }.
// Inputs are { name, kind: 'num' | 'geo', def, min, max, int, names }; a num input shows as a slider until something is linked to it.
import { sources } from './sources.js';
import { generators } from './generators.js';
import { modifiers } from './modifiers.js';
import { math } from './math.js';

export const NODES = {};
for (const [category, group] of Object.entries({ Sources: sources, Generators: generators, Modifiers: modifiers, Math: math })) {
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
  ],
  outputs: [],
};

export const CATEGORIES = ['Sources', 'Generators', 'Modifiers', 'Math', 'Output'];
