# Flux

A node-based 3D visuals editor in the browser, in the Sverchok style, made to move with music (and later with [Wax](https://github.com/zeffii/webtracker)).

**Live:** https://zeffii.github.io/flux/

Wires carry either lists of numbers (orange) or geometry (blue: vertices, edges and faces). Short lists repeat to match long ones, so one value or one per vertex both work. Every input is also a parameter: leave it unlinked and drag its slider.

Nodes: sources (number, time, range, noise), generators (grid, circle, arc, line), solids (box, cylinder, pyramid, torus, uv sphere, icosphere, platonic), surfaces (surface, metaballs, skin), modifiers (transform, array, join, lift), math (math, vector) and view. Each view node chooses its colour and whether faces show flat, smooth or as a glow.

## Keys

| Editor | |
|---|---|
| Tab / right-click | add a node |
| drag a slider | change it (Shift: fine), double-click to type |
| X / Delete | delete selected |
| Ctrl+D | duplicate |
| Ctrl+Z / Ctrl+Shift+Z | undo / redo |
| F | fit the graph |
| Space | play / pause |
| Ctrl+S | save a .flux file |

In the 3D view: drag to orbit, Shift or right-drag to pan, wheel to zoom, double-click to recentre.

## Working on it

```
npm test     # smoke tests for the graph and every node
npm start    # http://localhost:8080
```

No build step: `index.html` loads `src/main.js` as an ES module. Each push to master runs the tests and publishes to GitHub Pages.

The earlier Flux (numpy nodes for Blender) is in the git history before this rewrite.
