// Starting points for the script node. The first comment line names the node.
export const TEMPLATES = [
  {
    name: 'petal ring',
    code: `// petal ring
// after the SNLite demo petal_sine_numpy
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
`,
  },
  {
    name: 'petals',
    code: `// petals
// in  petals 6   int 1..24
// in  res    24  int 4..128
// in  radius 2   0..10
// in  open   .5  0..1
// out flower geo
// out tips   geo
// out sizes  list

const lift = open + .15 * sin(time * 3)
for (const p of range(petals)) {
  const a0 = p / petals * TAU
  const ring = range(res + 1).map(i => {
    const t = i / res, r = radius * sin(t * PI), a = a0 + (t - .5) * TAU / petals
    return [cos(a) * r, sin(a) * r, r * r / radius * lift]
  })
  flower.face([0, 0, 0], ...ring)
  tips.point(ring[res >> 1])
  sizes.push(radius * lift)
}
`,
  },
  {
    name: 'spiral',
    code: `// spiral
// in  turns  4    0..20
// in  count  200  int 2..4000
// in  rise   2    -10..10
// out curve  geo
// out angle  list

const pts = range(count).map(i => {
  const t = i / (count - 1), a = t * turns * TAU, r = .3 + t * 3
  angle.push(a)
  return [cos(a) * r, sin(a) * r, t * rise]
})
curve.line(pts)
`,
  },
  {
    name: 'drift (state)',
    code: `// drift
// state keeps the points between frames; edit the code to reset it
// in  count  300  int 1..5000
// in  speed  1    0..5
// in  size   4    0..20
// out pts    geo

state.p ??= []
const P = state.p, dt = state.t === undefined ? 0 : time - state.t
state.t = time
while (P.length < count) { const i = P.length; P.push([(rand(i) - .5) * size, (rand(i, 1) - .5) * size, 0]) }
P.length = count
for (const p of P) {
  p[0] += noise(p[1] * .6 + time * .2, 1) * dt * speed
  p[1] += noise(p[0] * .6 - time * .2, 2) * dt * speed
  if (abs(p[0]) > size || abs(p[1]) > size) { p[0] *= -.9; p[1] *= -.9 }
  p[2] = noise(p[0] + p[1], 3) * .5
  pts.point(p)
}
`,
  },
  {
    name: 'pydata',
    code: `// pydata
// Sverchok-style lists: verts, edges, faces
// in  size  1   0..5
// in  peak  1.5 0..5
// out shape geo

shape = mesh(
  [[-size, -size, 0], [size, -size, 0], [size, size, 0], [-size, size, 0], [0, 0, size * peak]],
  [],
  [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
)
`,
  },
  {
    name: 'per vertex',
    code: `// per vertex
// required input: the script waits until something is linked
// >in shape   geo
// in  scale   .3  0..2
// out stars   geo
// out heights list

for (const [i, [x, y, z]] of shape.points.entries()) {
  const s = scale * (1 + .5 * sin(time * 2 + i))
  stars.face([x - s, y, z], [x, y - s, z], [x + s, y, z], [x, y + s, z])
  heights.push(z)
}
`,
  },
];
