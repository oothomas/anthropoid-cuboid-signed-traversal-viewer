import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

const DATA_DIR = './assets/data/';
const GRID = document.getElementById('viewerGrid');
const SOURCE_LINE = document.getElementById('sourceLine');
const SYNC_BUTTON = document.getElementById('syncSliders');
const SYNC_VIEWS_BUTTON = document.getElementById('syncViews');
const RESET_BUTTON = document.getElementById('resetViews');
const SHARED_SCALE = document.getElementById('sharedScale');
const PCA_GRID = document.getElementById('pcaPlotGrid');
const PCA_LEGEND = document.getElementById('pcaLegend');
const SVG_NS = 'http://www.w3.org/2000/svg';

const palette = [
  [0.08, 0.26, 0.52],
  [0.31, 0.61, 0.82],
  [0.96, 0.97, 0.96],
  [0.97, 0.69, 0.28],
  [0.74, 0.15, 0.11],
];

const state = {
  metadata: null,
  vertices: null,
  signed: null,
  faces: null,
  pcaContext: null,
  viewers: [],
  synced: false,
  viewsSynced: false,
  syncingViews: false,
  activeViewer: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPct(x) {
  return `${(100 * x).toFixed(1)}%`;
}

function formatFloat(x) {
  const abs = Math.abs(x);
  if (abs >= 100) return x.toFixed(1);
  if (abs >= 10) return x.toFixed(2);
  if (abs >= 1) return x.toFixed(3);
  return x.toFixed(4);
}

function lerpColor(a, b, t) {
  return [
    a[0] * (1 - t) + b[0] * t,
    a[1] * (1 - t) + b[1] * t,
    a[2] * (1 - t) + b[2] * t,
  ];
}

function signedColor(value, limit) {
  const normalized = clamp((value / limit + 1) * 0.5, 0, 1);
  const scaled = normalized * (palette.length - 1);
  const lo = Math.min(Math.floor(scaled), palette.length - 2);
  const frac = scaled - lo;
  return lerpColor(palette[lo], palette[lo + 1], frac);
}

function vertexOffset(pcIndex, stepIndex, vertexIndex = 0) {
  const meta = state.metadata;
  return (((pcIndex * meta.n_steps + stepIndex) * meta.n_vertices + vertexIndex) * 3);
}

function scalarOffset(pcIndex, stepIndex, vertexIndex = 0) {
  const meta = state.metadata;
  return ((pcIndex * meta.n_steps + stepIndex) * meta.n_vertices + vertexIndex);
}

function copyInterpolatedPositions(pcIndex, sliderValue, out) {
  const meta = state.metadata;
  const position = (Number(sliderValue) + 100) / 200;
  const stepFloat = clamp(position * (meta.n_steps - 1), 0, meta.n_steps - 1);
  const lo = Math.floor(stepFloat);
  const hi = Math.min(meta.n_steps - 1, lo + 1);
  const t = stepFloat - lo;
  const loOffset = vertexOffset(pcIndex, lo);
  const hiOffset = vertexOffset(pcIndex, hi);
  const count = meta.n_vertices * 3;
  const vertices = state.vertices;
  if (hi === lo || t === 0) {
    out.set(vertices.subarray(loOffset, loOffset + count));
    return { stepFloat, lo, hi, t };
  }
  for (let i = 0; i < count; i += 1) {
    out[i] = vertices[loOffset + i] * (1 - t) + vertices[hiOffset + i] * t;
  }
  return { stepFloat, lo, hi, t };
}

function copyInterpolatedScalars(pcIndex, stepInfo, out) {
  const meta = state.metadata;
  const loOffset = scalarOffset(pcIndex, stepInfo.lo);
  const hiOffset = scalarOffset(pcIndex, stepInfo.hi);
  const signed = state.signed;
  if (stepInfo.hi === stepInfo.lo || stepInfo.t === 0) {
    out.set(signed.subarray(loOffset, loOffset + meta.n_vertices));
    return;
  }
  for (let i = 0; i < meta.n_vertices; i += 1) {
    out[i] = signed[loOffset + i] * (1 - stepInfo.t) + signed[hiOffset + i] * stepInfo.t;
  }
}

function interpolatedScore(pcIndex, stepInfo) {
  const scores = state.metadata.pc_scores[pcIndex];
  const a = scores[stepInfo.lo];
  const b = scores[stepInfo.hi];
  return a * (1 - stepInfo.t) + b * stepInfo.t;
}

function computeMidpointNormals(pcIndex) {
  const meta = state.metadata;
  const midOffset = vertexOffset(pcIndex, meta.midpoint_index);
  const mid = state.vertices.subarray(midOffset, midOffset + meta.n_vertices * 3);
  const faces = state.faces;
  const normals = new Float32Array(meta.n_vertices * 3);
  const centroid = [0, 0, 0];
  for (let i = 0; i < mid.length; i += 3) {
    centroid[0] += mid[i];
    centroid[1] += mid[i + 1];
    centroid[2] += mid[i + 2];
  }
  centroid[0] /= meta.n_vertices;
  centroid[1] /= meta.n_vertices;
  centroid[2] /= meta.n_vertices;

  let orientationScore = 0;
  const faceNormals = new Float32Array(faces.length);
  for (let i = 0; i < faces.length; i += 3) {
    const ia = faces[i] * 3;
    const ib = faces[i + 1] * 3;
    const ic = faces[i + 2] * 3;
    const ax = mid[ia], ay = mid[ia + 1], az = mid[ia + 2];
    const bx = mid[ib], by = mid[ib + 1], bz = mid[ib + 2];
    const cx = mid[ic], cy = mid[ic + 1], cz = mid[ic + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    faceNormals[i] = nx;
    faceNormals[i + 1] = ny;
    faceNormals[i + 2] = nz;
    const centerX = (ax + bx + cx) / 3 - centroid[0];
    const centerY = (ay + by + cy) / 3 - centroid[1];
    const centerZ = (az + bz + cz) / 3 - centroid[2];
    orientationScore += nx * centerX + ny * centerY + nz * centerZ;
  }
  const sign = orientationScore < 0 ? -1 : 1;
  for (let i = 0; i < faces.length; i += 3) {
    const nx = faceNormals[i] * sign;
    const ny = faceNormals[i + 1] * sign;
    const nz = faceNormals[i + 2] * sign;
    for (let j = 0; j < 3; j += 1) {
      const dst = faces[i + j] * 3;
      normals[dst] += nx;
      normals[dst + 1] += ny;
      normals[dst + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[i] = nx / len;
    normals[i + 1] = ny / len;
    normals[i + 2] = nz / len;
  }
  return { mid: new Float32Array(mid), normals };
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

function axisLabel(method, axis) {
  const item = state.pcaContext.variance[method][String(axis)];
  return `${item.label} (${formatPct(item.fraction)})`;
}

function squareDomain(rows, xKey, yKey) {
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const row of rows) {
    const x = row[xKey];
    const y = row[yKey];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    xmin = Math.min(xmin, x);
    xmax = Math.max(xmax, x);
    ymin = Math.min(ymin, y);
    ymax = Math.max(ymax, y);
  }
  if (!Number.isFinite(xmin) || !Number.isFinite(ymin)) {
    return { xmin: -1, xmax: 1, ymin: -1, ymax: 1 };
  }
  const xmid = (xmin + xmax) / 2;
  const ymid = (ymin + ymax) / 2;
  let span = Math.max(xmax - xmin, ymax - ymin);
  if (span <= 0) span = 1;
  const half = span * 0.57;
  return { xmin: xmid - half, xmax: xmid + half, ymin: ymid - half, ymax: ymid + half };
}

function niceTicks(min, max, count = 5) {
  const span = Math.max(Math.abs(max - min), 1e-9);
  const raw = span / Math.max(1, count - 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / power;
  const step = (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let tick = start; tick <= max + step * 0.25; tick += step) {
    if (tick >= min - step * 0.25) ticks.push(Math.abs(tick) < step * 1e-6 ? 0 : tick);
  }
  return ticks.slice(0, 8);
}

function formatTick(value) {
  const abs = Math.abs(value);
  if (abs >= 10) return String(Math.round(value));
  if (abs >= 1) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
}

function renderPcaPanel(plot) {
  const pca = state.pcaContext;
  const xKey = `a${plot.x}`;
  const yKey = `a${plot.y}`;
  const individuals = pca.individuals.filter((row) => row.method === plot.method);
  const means = pca.species_means.filter((row) => row.method === plot.method);
  const rows = individuals.concat(means);
  const domain = squareDomain(rows, xKey, yKey);
  const width = 430;
  const height = 350;
  const margin = { top: 42, right: 16, bottom: 54, left: 58 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const sx = (value) => margin.left + ((value - domain.xmin) / (domain.xmax - domain.xmin)) * innerW;
  const sy = (value) => margin.top + ((domain.ymax - value) / (domain.ymax - domain.ymin)) * innerH;

  const card = document.createElement('article');
  card.className = 'pca-card';
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': plot.title });
  card.appendChild(svg);

  const title = svgEl('text', { x: margin.left, y: 24, class: 'pca-title' });
  title.textContent = plot.title;
  svg.appendChild(title);

  const xTicks = niceTicks(domain.xmin, domain.xmax, 6);
  const yTicks = niceTicks(domain.ymin, domain.ymax, 6);
  for (const tick of xTicks) {
    const x = sx(tick);
    svg.appendChild(svgEl('line', { x1: x, y1: margin.top, x2: x, y2: margin.top + innerH, class: 'pca-grid-line' }));
    const label = svgEl('text', { x, y: margin.top + innerH + 18, class: 'pca-tick', 'text-anchor': 'middle' });
    label.textContent = formatTick(tick);
    svg.appendChild(label);
  }
  for (const tick of yTicks) {
    const y = sy(tick);
    svg.appendChild(svgEl('line', { x1: margin.left, y1: y, x2: margin.left + innerW, y2: y, class: 'pca-grid-line' }));
    const label = svgEl('text', { x: margin.left - 9, y: y + 3, class: 'pca-tick', 'text-anchor': 'end' });
    label.textContent = formatTick(tick);
    svg.appendChild(label);
  }
  if (domain.xmin < 0 && domain.xmax > 0) {
    const x0 = sx(0);
    svg.appendChild(svgEl('line', { x1: x0, y1: margin.top, x2: x0, y2: margin.top + innerH, class: 'pca-zero-line' }));
  }
  if (domain.ymin < 0 && domain.ymax > 0) {
    const y0 = sy(0);
    svg.appendChild(svgEl('line', { x1: margin.left, y1: y0, x2: margin.left + innerW, y2: y0, class: 'pca-zero-line' }));
  }
  svg.appendChild(svgEl('line', { x1: margin.left, y1: margin.top + innerH, x2: margin.left + innerW, y2: margin.top + innerH, class: 'pca-axis-line' }));
  svg.appendChild(svgEl('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + innerH, class: 'pca-axis-line' }));

  for (const row of individuals) {
    const color = pca.clade_colors[row.clade] || '#6E7781';
    svg.appendChild(svgEl('circle', {
      cx: sx(row[xKey]),
      cy: sy(row[yKey]),
      r: 3.2,
      fill: color,
      opacity: 0.24,
    }));
  }

  for (const row of means) {
    const color = pca.clade_colors[row.clade] || '#6E7781';
    const circle = svgEl('circle', {
      cx: sx(row[xKey]),
      cy: sy(row[yKey]),
      r: 4.6 + Math.min(3.8, Math.sqrt(Math.max(row.n || 1, 1)) * 0.45),
      fill: color,
      opacity: 0.93,
      stroke: '#ffffff',
      'stroke-width': 1.4,
    });
    const tooltip = svgEl('title');
    tooltip.textContent = `${row.taxon}: ${axisLabel(plot.method, plot.x)} ${formatFloat(row[xKey])}, ${axisLabel(plot.method, plot.y)} ${formatFloat(row[yKey])}`;
    circle.appendChild(tooltip);
    svg.appendChild(circle);
  }

  const xLabel = svgEl('text', { x: margin.left + innerW / 2, y: height - 16, class: 'pca-axis-label', 'text-anchor': 'middle' });
  xLabel.textContent = axisLabel(plot.method, plot.x);
  svg.appendChild(xLabel);
  const yLabel = svgEl('text', {
    x: 16,
    y: margin.top + innerH / 2,
    class: 'pca-axis-label',
    'text-anchor': 'middle',
    transform: `rotate(-90 16 ${margin.top + innerH / 2})`,
  });
  yLabel.textContent = axisLabel(plot.method, plot.y);
  svg.appendChild(yLabel);
  return card;
}

function renderPcaLegend() {
  const pca = state.pcaContext;
  const items = Object.entries(pca.clade_colors).map(([name, color]) => {
    return `<span class="pca-legend-item"><span class="pca-swatch" style="background:${color}"></span>${name}</span>`;
  });
  items.push('<span class="pca-legend-item"><span class="pca-swatch individual"></span>individual specimen</span>');
  items.push('<span class="pca-legend-item"><span class="pca-swatch mean" style="background:#0072B2"></span>species/subspecies mean</span>');
  PCA_LEGEND.innerHTML = items.join('');
}

function renderPcaContext() {
  if (!state.pcaContext || !PCA_GRID) return;
  PCA_GRID.innerHTML = '';
  for (const plot of state.pcaContext.plots) {
    PCA_GRID.appendChild(renderPcaPanel(plot));
  }
  renderPcaLegend();
}

function createCard(pcIndex) {
  const article = document.createElement('article');
  article.className = 'viewer-card';
  article.innerHTML = `
    <div class="viewer-header">
      <div>
        <h2 class="viewer-title">PC${pcIndex + 1}
          <span class="viewer-subtitle">${formatPct(state.metadata.pca_explained_variance_ratio[pcIndex])} raw-latent variance</span>
        </h2>
      </div>
      <div class="readout" id="readout-pc${pcIndex + 1}">
        <strong>0</strong><br />
        score loading
      </div>
    </div>
    <div class="canvas-wrap" id="canvas-pc${pcIndex + 1}">
      <div class="loading-note">Loading PC${pcIndex + 1}</div>
    </div>
    <div class="viewer-controls">
      <span>negative</span>
      <input id="slider-pc${pcIndex + 1}" type="range" min="-100" max="100" step="1" value="0" aria-label="PC${pcIndex + 1} traversal position" />
      <span>positive</span>
      <div class="mid-mark">0</div>
    </div>
  `;
  GRID.appendChild(article);
  return {
    card: article,
    canvasWrap: article.querySelector(`#canvas-pc${pcIndex + 1}`),
    loading: article.querySelector('.loading-note'),
    slider: article.querySelector(`#slider-pc${pcIndex + 1}`),
    readout: article.querySelector(`#readout-pc${pcIndex + 1}`),
  };
}

class PCViewer {
  constructor(pcIndex) {
    this.pcIndex = pcIndex;
    this.nodes = createCard(pcIndex);
    this.positions = new Float32Array(state.metadata.n_vertices * 3);
    this.colors = new Float32Array(state.metadata.n_vertices * 3);
    this.signedScalars = new Float32Array(state.metadata.n_vertices);
    this.midData = computeMidpointNormals(pcIndex);
    this.stepInfo = copyInterpolatedPositions(pcIndex, 0, this.positions);
    this.initThree();
    this.nodes.slider.addEventListener('input', () => {
      this.setSlider(this.nodes.slider.value, true);
    });
    this.setSlider(0, false);
  }

  initThree() {
    const wrap = this.nodes.canvasWrap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeff1ed);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.0001, 100);
    this.camera.up.set(0, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x889196, 2.4);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(1.8, -2.4, 1.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-1.4, 2.1, 0.8);
    this.scene.add(fill);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(state.faces, 1));

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.noRoll = false;
    this.controls.rotateSpeed = 3.0;
    this.controls.zoomSpeed = 1.15;
    this.controls.panSpeed = 0.65;
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = 0.12;
    this.controls.addEventListener('change', () => this.onCameraChange());
    this.renderer.domElement.addEventListener('pointerdown', () => {
      state.activeViewer = this;
    });
    this.renderer.domElement.addEventListener('wheel', () => {
      state.activeViewer = this;
    }, { passive: true });

    this.frameCamera();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(wrap);
    this.resize();
    this.nodes.loading.remove();
    this.animate();
  }

  frameCamera() {
    const meta = state.metadata;
    const mid = this.midData.mid;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < mid.length; i += 3) {
      min[0] = Math.min(min[0], mid[i]);
      min[1] = Math.min(min[1], mid[i + 1]);
      min[2] = Math.min(min[2], mid[i + 2]);
      max[0] = Math.max(max[0], mid[i]);
      max[1] = Math.max(max[1], mid[i + 1]);
      max[2] = Math.max(max[2], mid[i + 2]);
    }
    const center = new THREE.Vector3(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    );
    const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    this.controls.target.copy(center);
    this.camera.position.copy(center.clone().add(new THREE.Vector3(1.8, -2.4, 1.15).multiplyScalar(span)));
    this.camera.near = span / 1000;
    this.camera.far = span * 100;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.baseCenter = center;
    this.baseSpan = span;
    void meta;
  }

  cameraState() {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      up: this.camera.up.clone(),
      zoom: this.camera.zoom,
    };
  }

  applyCameraState(cameraState) {
    this.camera.position.copy(cameraState.position);
    this.camera.up.copy(cameraState.up);
    this.camera.zoom = cameraState.zoom;
    this.controls.target.copy(cameraState.target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  syncCameraToPeers() {
    if (!state.viewsSynced || state.syncingViews) return;
    state.syncingViews = true;
    const cameraState = this.cameraState();
    for (const viewer of state.viewers) {
      if (viewer !== this) viewer.applyCameraState(cameraState);
    }
    state.syncingViews = false;
  }

  onCameraChange() {
    if (!state.viewsSynced || state.syncingViews) return;
    state.activeViewer = this;
    this.syncCameraToPeers();
  }

  resize() {
    const rect = this.nodes.canvasWrap.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.controls) this.controls.handleResize();
  }

  setSlider(value, fromUser) {
    const numeric = Number(value);
    this.nodes.slider.value = String(numeric);
    this.stepInfo = copyInterpolatedPositions(this.pcIndex, numeric, this.positions);
    copyInterpolatedScalars(this.pcIndex, this.stepInfo, this.signedScalars);
    const limit = SHARED_SCALE.checked
      ? state.metadata.scalar_limit_signed_normal_displacement
      : state.metadata.per_pc_scalar_limits[this.pcIndex];
    let minSigned = Infinity;
    let maxSigned = -Infinity;
    for (let i = 0; i < state.metadata.n_vertices * 3; i += 3) {
      const vertexIndex = i / 3;
      const signed = this.signedScalars[vertexIndex];
      minSigned = Math.min(minSigned, signed);
      maxSigned = Math.max(maxSigned, signed);
      const rgb = signedColor(signed, limit);
      this.colors[i] = rgb[0];
      this.colors[i + 1] = rgb[1];
      this.colors[i + 2] = rgb[2];
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeVertexNormals();
    const score = interpolatedScore(this.pcIndex, this.stepInfo);
    this.nodes.readout.innerHTML =
      `<strong>${numeric}</strong><br />score ${formatFloat(score)} | step ${this.stepInfo.stepFloat.toFixed(1)}<br />` +
      `signed ${formatFloat(minSigned)} to ${formatFloat(maxSigned)}`;
    if (fromUser && state.synced) {
      for (const viewer of state.viewers) {
        if (viewer !== this) viewer.setSlider(numeric, false);
      }
    }
  }

  resetView() {
    this.frameCamera();
  }

  animate() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }
}

async function fetchArrayBuffer(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }
  return response.arrayBuffer();
}

async function main() {
  const [metadata, pcaContext, verticesBuffer, signedBuffer, facesBuffer] = await Promise.all([
    fetch(`${DATA_DIR}metadata.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load metadata: ${r.status}`);
      return r.json();
    }),
    fetch(`${DATA_DIR}pca_context.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load PCA context: ${r.status}`);
      return r.json();
    }),
    fetchArrayBuffer(`${DATA_DIR}vertices_f32.bin`),
    fetchArrayBuffer(`${DATA_DIR}signed_normal_displacement_f32.bin`),
    fetchArrayBuffer(`${DATA_DIR}faces_u32.bin`),
  ]);
  state.metadata = metadata;
  state.pcaContext = pcaContext;
  state.vertices = new Float32Array(verticesBuffer);
  state.signed = new Float32Array(signedBuffer);
  state.faces = new Uint32Array(facesBuffer);

  const expectedVertices = metadata.n_pcs * metadata.n_steps * metadata.n_vertices * 3;
  const expectedScalars = metadata.n_pcs * metadata.n_steps * metadata.n_vertices;
  const expectedFaces = metadata.n_faces * 3;
  if (state.vertices.length !== expectedVertices) {
    throw new Error(`Unexpected vertex buffer length ${state.vertices.length}; expected ${expectedVertices}`);
  }
  if (state.signed.length !== expectedScalars) {
    throw new Error(`Unexpected signed scalar buffer length ${state.signed.length}; expected ${expectedScalars}`);
  }
  if (state.faces.length !== expectedFaces) {
    throw new Error(`Unexpected face buffer length ${state.faces.length}; expected ${expectedFaces}`);
  }

  SOURCE_LINE.textContent =
    `${metadata.source_label}; template ${metadata.template_mesh_id}; context ${metadata.decoder_context_mesh_id}; ` +
    `global signed scale +/-${formatFloat(metadata.scalar_limit_signed_normal_displacement)} model-coordinate units.`;

  for (let pcIndex = 0; pcIndex < metadata.n_pcs; pcIndex += 1) {
    state.viewers.push(new PCViewer(pcIndex));
  }
  renderPcaContext();

  SYNC_BUTTON.addEventListener('click', () => {
    state.synced = !state.synced;
    SYNC_BUTTON.textContent = state.synced ? 'Unsync sliders' : 'Sync sliders';
    if (state.synced && state.viewers.length) {
      const value = state.viewers[0].nodes.slider.value;
      for (const viewer of state.viewers) viewer.setSlider(value, false);
    }
  });

  RESET_BUTTON.addEventListener('click', () => {
    for (const viewer of state.viewers) viewer.resetView();
  });

  SYNC_VIEWS_BUTTON.addEventListener('click', () => {
    state.viewsSynced = !state.viewsSynced;
    SYNC_VIEWS_BUTTON.textContent = state.viewsSynced ? 'Unsync viewers' : 'Sync viewers';
    if (state.viewsSynced && state.viewers.length) {
      const source = state.activeViewer || state.viewers[0];
      source.syncCameraToPeers();
    }
  });

  SHARED_SCALE.addEventListener('change', () => {
    for (const viewer of state.viewers) viewer.setSlider(viewer.nodes.slider.value, false);
  });
}

main().catch((error) => {
  console.error(error);
  GRID.innerHTML = `<div class="provenance"><h2>Viewer failed to load</h2><p>${error.message}</p></div>`;
});
