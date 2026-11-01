# Flux: where things stand

Done and tested (`npm test`): `src/core` (geo, graph with in-place load, demo graph), `src/nodes` (number, time, range, noise, math, vector, grid, circle, arc, line, box, cylinder, pyramid, torus, uv sphere, icosphere, platonic, surface, metaballs, skin, script, transform, array, join, lift, view), `src/core/mesh.js` (polygon builder, surface nets), `src/ui/viewer.js` (WebGL2 orbit view, Z up, solid/flat/smooth/glow faces, additive lines), `src/ui/editor.js` (canvas node editor), `src/main.js` (loop, add-node menu, play bar, autosave, .flux save/open, split).

Script node (`src/nodes/script.js`, panel `src/ui/code.js`, colouring `src/ui/highlight.js`): ports come per node from the code header via `defOf(node)`; `graph.setCode` drops links that no longer fit.

Edit node (`src/nodes/edit.js`, tool `src/ui/editing.js`, maths `src/core/xform.js`): edits live in `vals['#edits']` as `{ n, d: {i: offset}, p: {i: position} }`, keyed by vertex index.

Next ideas: edit layer 2 (add vertex, connect edge, fill face, delete mask), a freeze node (snapshot + re-pull), proportional editing, stable ids for edits across topology changes, multiplexing (wires carrying several objects, nodes and scripts running once per object, SNLite-style nesting levels), a sync link to Wax (beat/time from the tracker).

Plan: Z up like Blender, every input is a parameter, wires carry lists of numbers or geo (verts + edges). A Blender or Rust back end may come later.
