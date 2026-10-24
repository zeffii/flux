// The 3D view: WebGL2 faces, lines and points with an orbit camera, Z up. Every view node draws here.
// Solid faces write depth; lines, points and glow faces are added on top, so dense arrays glow where they overlap.
const LVS = `#version 300 es
layout(location = 0) in vec3 p; uniform mat4 mvp; uniform float size;
void main() { gl_Position = mvp * vec4(p, 1.0); gl_PointSize = size; }`;
const LFS = `#version 300 es
precision mediump float; uniform vec4 col; uniform float round_; out vec4 o;
void main() { if (round_ > 0.5 && length(gl_PointCoord - 0.5) > 0.5) discard; o = col; }`;
const FVS = `#version 300 es
layout(location = 0) in vec3 p; layout(location = 1) in vec3 n; uniform mat4 mvp; out vec3 wp; out vec3 wn;
void main() { wp = p; wn = n; gl_Position = mvp * vec4(p, 1.0); }`;
// mode 0 flat, 1 smooth, 2 glow. Lit from both sides, so face winding never matters.
const FFS = `#version 300 es
precision highp float; in vec3 wp; in vec3 wn; uniform vec3 eye; uniform vec3 col; uniform int mode; out vec4 o;
void main() {
  vec3 N = mode == 0 ? normalize(cross(dFdx(wp), dFdy(wp))) : normalize(wn);
  vec3 V = normalize(eye - wp);
  float ndv = abs(dot(N, V)), rim = pow(1.0 - ndv, 2.5);
  if (mode == 2) { o = vec4(col, 0.04 + 0.7 * rim); return; }
  float key = abs(dot(N, normalize(vec3(0.35, -0.45, 0.82))));
  o = vec4(col * (0.1 + 0.55 * key + 0.25 * ndv + 0.35 * rim), 1.0);
}`;

export function hueToRgb(h, s = 0.7, l = 0.6) {
  const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}

const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const perspective = (fov, aspect, n, f) => { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / aspect; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; };
function lookAt(eye, at, up) {
  let z = [eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]]; const zl = Math.hypot(...z); z = z.map(v => v / zl);
  let x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]; const xl = Math.hypot(...x); x = x.map(v => v / xl);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return Float32Array.from([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]), -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]), -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1]);
}

// Area-weighted vertex normals, for smooth shading.
export function vertexNormals(g) {
  const v = g.v, f = g.f, n = new Float32Array(v.length);
  for (let t = 0; t < f.length; t += 3) {
    const a = f[t] * 3, b = f[t + 1] * 3, c = f[t + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    for (const i of [a, b, c]) { n[i] += nx; n[i + 1] += ny; n[i + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]); if (l > 0) { n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; } else n[i + 2] = 1; }
  return n;
}

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
    this.cam = { yaw: -0.9, pitch: 0.55, dist: 14, target: [0, 0, 0] };
    this.slots = new Map();
    if (!this.gl) return;
    const gl = this.gl;
    const program = (vs, fs) => {
      const pr = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); gl.attachShader(pr, s); }
      gl.linkProgram(pr);
      const u = {}; for (let i = 0, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS); i < n; i++) { const name = gl.getActiveUniform(pr, i).name; u[name] = gl.getUniformLocation(pr, name); }
      return { pr, u };
    };
    this.lp = program(LVS, LFS); this.fp = program(FVS, FFS);
    this.floor = this.makeFloor();
    this.attach();
  }

  makeFloor() {
    const gl = this.gl, lines = [], n = 10;
    for (let i = -n; i <= n; i++) { if (i) lines.push(i, -n, 0, i, n, 0, -n, i, 0, n, i, 0); }
    lines.push(-n, 0, 0, n, 0, 0, 0, -n, 0, 0, n, 0, 0, 0, 0, 0, 0, n);
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(lines), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    return { vao, grid: lines.length / 3 - 6 };
  }

  // GPU buffers for one view node, re-uploaded only when its geometry object changes.
  slot(id) {
    let s = this.slots.get(id);
    if (s) return s;
    const gl = this.gl;
    s = { geo: null, vbo: gl.createBuffer(), nbo: gl.createBuffer(), ebo: gl.createBuffer(), tbo: gl.createBuffer(), lines: gl.createVertexArray(), faces: gl.createVertexArray() };
    gl.bindVertexArray(s.lines); gl.bindBuffer(gl.ARRAY_BUFFER, s.vbo); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.ebo);
    gl.bindVertexArray(s.faces); gl.bindBuffer(gl.ARRAY_BUFFER, s.vbo); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.nbo); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.tbo);
    gl.bindVertexArray(null);
    this.slots.set(id, s);
    return s;
  }

  upload(s, g) {
    if (s.geo === g) return;
    const gl = this.gl, f = g.f ?? new Uint32Array(0);
    s.geo = g; s.nv = g.v.length / 3; s.ne = g.e.length; s.nf = f.length;
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.vbo); gl.bufferData(gl.ARRAY_BUFFER, g.v, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.nbo); gl.bufferData(gl.ARRAY_BUFFER, f.length ? vertexNormals(g) : new Float32Array(g.v.length), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(s.lines); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.e, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(s.faces); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, f, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
  }

  attach() {
    const c = this.canvas; let last = null;
    c.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointerup', () => { last = null; });
    c.addEventListener('pointermove', e => {
      if (!last) return;
      const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY];
      const cam = this.cam;
      if (e.shiftKey || e.buttons & 4 || e.buttons & 2) {   // pan in the view plane
        const s = cam.dist * 0.0016, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
        const right = [-sy, cy, 0], up = [-sp * cy, -sp * sy, cp];
        for (let i = 0; i < 3; i++) cam.target[i] += (-right[i] * dx + up[i] * dy) * s;
      } else { cam.yaw -= dx * 0.008; cam.pitch = Math.max(-1.5, Math.min(1.5, cam.pitch + dy * 0.008)); }
    });
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('wheel', e => { e.preventDefault(); this.cam.dist = Math.max(1.5, Math.min(80, this.cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    c.addEventListener('dblclick', () => { this.cam.target = [0, 0, 0]; });
  }

  resize() {
    const c = this.canvas, d = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(1, Math.floor(c.clientWidth * d)), h = Math.max(1, Math.floor(c.clientHeight * d));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return d;
  }

  draw(views) {
    const gl = this.gl; if (!gl) return;
    const d = this.resize(), { cam, lp, fp } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.043, 0.051, 0.063, 1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const cp = Math.cos(cam.pitch), eye = [cam.target[0] + cam.dist * cp * Math.cos(cam.yaw), cam.target[1] + cam.dist * cp * Math.sin(cam.yaw), cam.target[2] + cam.dist * Math.sin(cam.pitch)];
    const mvp = mul(perspective(0.8, this.canvas.width / this.canvas.height, 0.05, 300), lookAt(eye, cam.target, [0, 0, 1]));

    // Drop buffers of views that are gone; upload the rest.
    const live = new Set(views.map(v => v.id));
    for (const [id, s] of this.slots) if (!live.has(id)) { for (const b of [s.vbo, s.nbo, s.ebo, s.tbo]) gl.deleteBuffer(b); gl.deleteVertexArray(s.lines); gl.deleteVertexArray(s.faces); this.slots.delete(id); }
    const items = views.filter(v => v.geo && v.geo.v.length).map(v => { const s = this.slot(v.id); this.upload(s, v.geo); return { v, s, rgb: hueToRgb(v.hue) }; });

    // Floor and axes, behind everything.
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(lp.pr); gl.uniformMatrix4fv(lp.u.mvp, false, mvp); gl.uniform1f(lp.u.round_, 0); gl.uniform1f(lp.u.size, 1);
    gl.bindVertexArray(this.floor.vao);
    gl.uniform4f(lp.u.col, 0.55, 0.62, 0.72, 0.07); gl.drawArrays(gl.LINES, 0, this.floor.grid);
    [[0.95, 0.35, 0.4], [0.4, 0.85, 0.5], [0.4, 0.55, 0.95]].forEach((c, i) => { gl.uniform4f(lp.u.col, c[0], c[1], c[2], 0.45); gl.drawArrays(gl.LINES, this.floor.grid + i * 2, 2); });

    // Solid faces write depth, pushed back a little so their own edges sit on top.
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.useProgram(fp.pr); gl.uniformMatrix4fv(fp.u.mvp, false, mvp); gl.uniform3f(fp.u.eye, ...eye);
    const faces = mode => items.filter(({ v, s }) => s.nf && (mode === 2 ? v.faces === 3 : v.faces === 1 || v.faces === 2));
    gl.disable(gl.BLEND); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
    for (const { v, s, rgb } of faces(1)) { gl.uniform1i(fp.u.mode, v.faces - 1); gl.uniform3f(fp.u.col, ...rgb); gl.bindVertexArray(s.faces); gl.drawElements(gl.TRIANGLES, s.nf, gl.UNSIGNED_INT, 0); }
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // Everything else adds light and leaves depth alone.
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
    for (const { s, rgb } of faces(2)) { gl.uniform1i(fp.u.mode, 2); gl.uniform3f(fp.u.col, ...rgb); gl.bindVertexArray(s.faces); gl.drawElements(gl.TRIANGLES, s.nf, gl.UNSIGNED_INT, 0); }
    gl.useProgram(lp.pr);
    for (const { v, s, rgb: [r, g, b] } of items) {
      gl.bindVertexArray(s.lines);
      if (v.lines && s.ne) { gl.uniform1f(lp.u.round_, 0); gl.uniform1f(lp.u.size, 1); gl.uniform4f(lp.u.col, r, g, b, v.faces === 1 || v.faces === 2 ? 0.5 : 0.8); gl.drawElements(gl.LINES, s.ne, gl.UNSIGNED_INT, 0); }
      if (v.size > 0) { gl.uniform1f(lp.u.round_, 1); gl.uniform1f(lp.u.size, v.size * d); gl.uniform4f(lp.u.col, r, g, b, 0.95); gl.drawArrays(gl.POINTS, 0, s.nv); }
    }
    gl.depthMask(true); gl.bindVertexArray(null);
  }
}
