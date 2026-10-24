// The 3D view: WebGL lines and points with an orbit camera, Z up. Several views (one per view node) draw together,
// added together, so dense arrays glow where they overlap.
const VS = `#version 300 es
in vec3 p; uniform mat4 mvp; uniform float size;
void main() { gl_Position = mvp * vec4(p, 1.0); gl_PointSize = size; }`;
const FS = `#version 300 es
precision mediump float; uniform vec4 col; uniform float round_; out vec4 o;
void main() { if (round_ > 0.5 && length(gl_PointCoord - 0.5) > 0.5) discard; o = col; }`;

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

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    this.cam = { yaw: -0.9, pitch: 0.55, dist: 14, target: [0, 0, 0] };
    this.views = [];
    if (!this.gl) return;
    const gl = this.gl, sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = this.prog = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    this.loc = { p: gl.getAttribLocation(pr, 'p'), mvp: gl.getUniformLocation(pr, 'mvp'), size: gl.getUniformLocation(pr, 'size'), col: gl.getUniformLocation(pr, 'col'), round: gl.getUniformLocation(pr, 'round_') };
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer(); this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.enableVertexAttribArray(this.loc.p); gl.vertexAttribPointer(this.loc.p, 3, gl.FLOAT, false, 0, 0);
    this.floor = this.makeFloor();
    this.attach();
  }

  makeFloor() {
    const lines = [], n = 10;
    for (let i = -n; i <= n; i++) { if (i) lines.push(i, -n, 0, i, n, 0, -n, i, 0, n, i, 0); }
    return { grid: Float32Array.from(lines), axes: [Float32Array.from([-n, 0, 0, n, 0, 0]), Float32Array.from([0, -n, 0, 0, n, 0]), Float32Array.from([0, 0, 0, 0, 0, n])] };
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
    const d = this.resize(), { cam, loc } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.043, 0.051, 0.063, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(this.prog); gl.bindVertexArray(this.vao);
    const cp = Math.cos(cam.pitch), eye = [cam.target[0] + cam.dist * cp * Math.cos(cam.yaw), cam.target[1] + cam.dist * cp * Math.sin(cam.yaw), cam.target[2] + cam.dist * Math.sin(cam.pitch)];
    const mvp = mul(perspective(0.8, this.canvas.width / this.canvas.height, 0.1, 200), lookAt(eye, cam.target, [0, 0, 1]));
    gl.uniformMatrix4fv(loc.mvp, false, mvp);
    const upload = (verts, idx) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
      if (idx) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW); }
    };
    gl.uniform1f(loc.round, 0); gl.uniform1f(loc.size, 1);
    gl.uniform4f(loc.col, 0.55, 0.62, 0.72, 0.07); upload(this.floor.grid); gl.drawArrays(gl.LINES, 0, this.floor.grid.length / 3);
    [[0.95, 0.35, 0.4], [0.4, 0.85, 0.5], [0.4, 0.55, 0.95]].forEach((c, i) => { gl.uniform4f(loc.col, c[0], c[1], c[2], 0.45); upload(this.floor.axes[i]); gl.drawArrays(gl.LINES, 0, 2); });
    for (const v of views) {
      const g = v.geo; if (!g || !g.v.length) continue;
      const [r, gr, b] = hueToRgb(v.hue);
      upload(g.v, g.e);
      if (v.lines && g.e.length) { gl.uniform4f(loc.col, r, gr, b, 0.8); gl.drawElements(gl.LINES, g.e.length, gl.UNSIGNED_INT, 0); }
      if (v.size > 0) { gl.uniform1f(loc.round, 1); gl.uniform1f(loc.size, v.size * d); gl.uniform4f(loc.col, r, gr, b, 0.95); gl.drawArrays(gl.POINTS, 0, g.v.length / 3); gl.uniform1f(loc.round, 0); }
    }
  }
}
