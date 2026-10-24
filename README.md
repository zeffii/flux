# Flux

A node-based 3D visuals editor in the browser, in the Sverchok style, made to move with music (and later with [Wax](https://github.com/zeffii/webtracker)).

**Live:** https://zeffii.github.io/flux/

Wires carry either lists of numbers (orange) or geometry (blue: vertices, edges and faces). Short lists repeat to match long ones, so one value or one per vertex both work. Every input is also a parameter: leave it unlinked and drag its slider.

Nodes: sources (number, time, range, noise), generators (grid, circle, arc, line), solids (box, cylinder, pyramid, torus, uv sphere, icosphere, platonic), surfaces (surface, metaballs, skin), modifiers (transform, array, join, lift), math (math, vector) and view. Each view node chooses its colour and whether faces show flat, smooth or as a glow.

## Script node

Plain JS; the comment header declares the sockets and the body writes into the outputs, which already exist when it runs.

```js
// petal ring
// in  n_petals       8    int 1..64
// in  vp_petal       10   int 2..64
// in  profile_radius 2.3  0..10
// in  amp            1    -4..4
// in  origin         geo
// out verts          geo

const N = n_petals * vp_petal, [ox, oy, oz] = origin.first ?? [0, 0, 0]
verts.loop(range(N).map(i => {
  const a = i / N * TAU, r = profile_radius + amp * cos(n_petals * a)
  return [ox + cos(a) * r, oy + sin(a) * r, oz]
}))
```

- `in name default [int] [lo..hi]`: a number slider; a range is hard (values are clamped even when linked). `in name list`: the whole list. `in name geo`, or `>in name geo` to wait until it's linked.
- `out name geo`: write with `.point(p)`, `.edge(a, b)`, `.line(pts)`, `.loop(pts)`, `.face(...pts)` (points or indices), `.add(geo)`, or assign `mesh(verts, edges, faces)`. `out name list`: an array to push to.
- Geo inputs offer `.points`, `.edges`, `.faces`, `.count`, `.first`, and iterate as points.
- In scope: maths functions, `PI`, `TAU`, `range`, `zip`, `lerp`, `clamp`, `fract`, `rand(i, seed)`, `noise(x, seed)`, `mesh`, `time`, `print`, and `state` (kept between runs until the code changes).

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
