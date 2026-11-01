// Small vector helpers for moving, rotating and scaling a set of points about a pivot.
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = a => { const l = Math.hypot(...a) || 1; return scale(a, 1 / l); };

// Rotate p about an axis through `pivot` by `angle` radians (right-handed).
export function rotate(p, pivot, axis, angle) {
  const k = norm(axis), v = sub(p, pivot), c = Math.cos(angle), s = Math.sin(angle);
  const r = add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
  return add(pivot, r);
}

// Scale p about `pivot` by f, either evenly or only along `axis`.
export function scaleAbout(p, pivot, f, axis) {
  const v = sub(p, pivot);
  if (!axis) return add(pivot, scale(v, f));
  const k = norm(axis), along = dot(v, k);
  return add(pivot, add(v, scale(k, along * (f - 1))));
}

// The mean of packed xyz points at the given indices.
export function centre(v, ids) {
  const c = [0, 0, 0];
  for (const i of ids) { c[0] += v[i * 3]; c[1] += v[i * 3 + 1]; c[2] += v[i * 3 + 2]; }
  return ids.length ? scale(c, 1 / ids.length) : c;
}
