# Changelog

## 002 · 2026-10-24

- Geometry now carries faces as well as edges: n-gons shade as triangles but keep their outline as wireframe.
- Solids: box, cylinder (with top radius for cones), pyramid, torus, uv sphere, icosphere, platonic (tetra, cube, octa, dodeca, icosa).
- Surfaces: surface (wave, ripple, saddle, blob, mobius, klein; wire time into phase), metaballs (a ball per vertex, negative radius carves), skin (tubes along an edge net, radius per vertex, smooth joints).
- View node gets faces: off, flat, smooth or glow. Solid faces hide what's behind them; glow is see-through rim light.
- Array, transform, lift and join carry faces through.

## 001 · 2026-10-24

- Flux starts again as a web app; the old numpy-nodes Blender add-on lives on in git history.
- Graph core (lists broadcast Sverchok-style, geo wires carry verts + edges, Z up), with caching of nodes that don't depend on time.
- Nodes: number, time, range, noise, math, vector, grid, circle, arc, line, transform, array, join, lift, view.
- Canvas node editor: every unlinked number is a slider (Shift for fine, double-click to type), wiring, undo/redo, duplicate, fit.
- Add-node menu (Tab, right-click or + Node): type to filter, arrows and Enter.
- WebGL2 viewer with orbit camera, additive glow, one colour per view node.
- Play bar, autosave to the browser, save/open .flux files, resizable split.
