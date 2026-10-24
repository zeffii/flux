# Flux: where things stand

Done and tested (`npm test`): `src/core` (geo, graph with in-place load, demo graph), `src/nodes` (number, time, range, noise, math, vector, grid, circle, arc, line, box, cylinder, pyramid, torus, uv sphere, icosphere, platonic, surface, metaballs, skin, transform, array, join, lift, view), `src/core/mesh.js` (polygon builder, surface nets), `src/ui/viewer.js` (WebGL2 orbit view, Z up, solid/flat/smooth/glow faces, additive lines), `src/ui/editor.js` (canvas node editor), `src/main.js` (loop, add-node menu, play bar, autosave, .flux save/open, split).

Next ideas: shape array refinements, more generators, a sync link to Wax (beat/time from the tracker), a genexpr-style expression node.

Plan: Z up like Blender, every input is a parameter, wires carry lists of numbers or geo (verts + edges). A Blender or Rust back end may come later.
