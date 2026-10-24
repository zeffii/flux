# Changelog

## 008 · 2026-10-24

- The editor has an active node (the last one clicked, outlined brighter), like Blender.
- Panning no longer clears the selection; a click on empty space without dragging deselects everything and clears the active node.
- The script panel shows only for a script node that is selected (in front, editable) or active (faded in the background); otherwise it's gone.

## 007 · 2026-10-24

- ↻ button: fetches fresh copies of every file the page uses, then reloads, so a new version shows up without a hard refresh. The graph is saved first.
- GitHub button links to the source.

## 006 · 2026-10-24

- The script panel has two states. Selected script node: the panel comes to the front, solid and editable. Otherwise the last script stays on as a faded backdrop under the dot grid, and the graph gets every click.
- Replaces 005's click routing; × still hides the panel completely.

## 005 · 2026-10-24

- The script panel sits behind the node graph: nodes and wires draw over it, and the canvas is see-through, so the code reads like a layer underneath.
- Over a node the graph takes the mouse; anywhere else over the panel, clicks, typing, scrolling and text selection go to the code.
- The panel dims a little until you hover or type in it, and the dot grid leaves its area clean.

## 004 · 2026-10-24

- Script panel is syntax highlighted: keywords, numbers, strings, comments, helpers, method calls.
- The header is coloured part by part: `in` / `>in` / `out`, socket names in their wire colour (orange numbers, blue geometry; outputs bold, underlined where declared), `int`, ranges, defaults and kinds; a bad header word gets a wavy underline.
- Socket names keep their colour wherever the body uses them, so inputs and outputs stand out from local variables.
- The error line gets a red band across the code as well as in the gutter.

## 003 · 2026-10-24

- Script node: plain JS whose comment header declares its sockets, in the spirit of SNLite. `in name 12 int 1..64` gives a slider with a default, int rounding and a hard range; `in name list`, `in name geo`, `>in name geo` (required: waits until linked); `out name geo|list`.
- Outputs are hoisted: each `out` exists before the body runs (geo outputs take `.point`, `.edge`, `.line`, `.loop`, `.face`, `.add`; list outputs are arrays) and is flushed by name afterwards, early `return` included. Assigning replaces it, e.g. `shape = mesh(verts, edges, faces)` with Sverchok-style lists.
- Helpers in scope: maths, `TAU`, `range`, `zip`, `lerp`, `clamp`, `fract`, `rand`, `noise`, `mesh`, `time`, `print`, and `state`, which survives between runs until the code changes.
- Code panel opens beside the editor when a script node is selected: runs as you type, marks the error line, shows print output; errors keep the last good output and put a red dot on the node.
- Templates: petal ring (after SNLite's petal_sine_numpy), petals, spiral, drift (state), pydata, per vertex.
- Scripts inside an opened .flux file wait until you press Run scripts.

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
