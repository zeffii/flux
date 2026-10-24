import { Graph } from './graph.js';

// The graph a fresh page opens with: little grids riding a ring, turning with the beat, and a faint guide ring.
export function demoGraph() {
  const g = new Graph();
  const time = g.add('time', 40, 40, { bpm: 90 });
  const ring = g.add('circle', 40, 220, { count: 32, radius: 3 });
  const grid = g.add('grid', 40, 360, { 'x count': 3, 'y count': 3, 'x size': 1, 'y size': 1 });
  const turn = g.add('math', 260, 20, { b: 18, op: 2 });
  const arr = g.add('array', 480, 200, { scale: 1, rot: 0, twist: 0 });
  const wave = g.add('math', 260, 170, { b: 0.35, op: 2 });
  const view = g.add('view', 720, 200, { hue: 190, points: 3 });
  const guide = g.add('view', 720, 380, { hue: 40, points: 0 });
  g.connect(time.id, 0, turn.id, 0);
  g.connect(turn.id, 0, arr.id, 4);
  g.connect(time.id, 3, wave.id, 0);
  g.connect(wave.id, 0, arr.id, 3);
  g.connect(grid.id, 0, arr.id, 0);
  g.connect(ring.id, 0, arr.id, 1);
  g.connect(arr.id, 0, view.id, 0);
  g.connect(ring.id, 0, guide.id, 0);
  return g;
}
