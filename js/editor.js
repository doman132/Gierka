/* =========================================================
   Speedway Empire 3D — EDYTOR MAPY (osobna aplikacja: editor.html)
   Widok z góry: drogi, chodniki, tereny, modele z katalogu (models/cat/catalog.json),
   lokale z gry. Zapis w localStorage (se3d_customMap) — gra buduje z niego miasto.
   ========================================================= */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const R2 = v => Math.round(v * 100) / 100;
const DEG = Math.PI / 180;
const GO = new WeakMap(); // obiekt mapy → grupa three.js (poza danymi, żeby nie trafiła do JSON)

const E = {
  map: null, cat: [], byId: {}, tool: 'select', sel: null, cur: null, hist: [], fut: [],
  roadT: 'road2', areaT: 'grass', areaShape: 'poly', venueK: 'bar', rot: 0, scale: 1, rnd: false, draw: null,
  view: { cx: 0, cz: 0, zoom: 1.4, d3: false, yaw: 0, pitch: 52 },
  lampId: null, lampRot: 0, dirty: false,
};

/* ---------------- modele ---------------- */
const Models = {
  L: new THREE.GLTFLoader(), files: {}, cache: {}, pend: {},
  file(f) { return this.files[f] || (this.files[f] = new Promise(res => this.L.load('models/' + f, g => res(g.scene), null, () => { console.warn('Brak modelu', f); res(null); }))); },
  partOf(src, i) {
    src.updateMatrixWorld(true);
    let list = src.children; while (list.length === 1 && list[0].children.length && !list[0].isMesh) list = list[0].children;
    const nodes = i.endsWith('*') ? list.filter(o => (o.name || '').startsWith(i.slice(0, -1))) : [list.find(o => o.name === i) || list.find(o => (o.name || '').startsWith(i))].filter(Boolean);
    if (!nodes.length) return null;
    const g = new THREE.Group(); nodes.forEach(n => { const o = n.clone(true); n.matrixWorld.decompose(o.position, o.quaternion, o.scale); g.add(o); }); return g;
  },
  /** wpis katalogu → { scene (środek podstawy w 0,0,0), size } — tak samo jak Furn.load + FIX + PART w grze */
  get(e) {
    const id = e.id; if (this.cache[id]) return Promise.resolve(this.cache[id]);
    return this.pend[id] || (this.pend[id] = this.file(e.f).then(src => {
      if (!src) return null;
      let sc = e.part ? this.partOf(src, e.part) : src.clone(true); if (!sc) return null;
      if (e.drop) { const del = []; sc.traverse(m => { if (e.drop.some(n => (m.name || '').startsWith(n))) del.push(m); }); del.forEach(m => m.parent && m.parent.remove(m)); }
      if (e.roof) {
        const b = new THREE.Box3().setFromObject(sc), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), t = Math.max(0.02, sz.y * 0.015);
        const r = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 0.985, t, sz.z * 0.985), new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.95 })); r.position.set(c.x, b.max.y - t / 2 - sz.y * 0.01, c.z); sc.add(r);
      }
      const w = new THREE.Group(); w.add(sc); sc.rotation.y = e.ry || 0; if (e.s) w.scale.setScalar(e.s); w.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(w), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      if (e.pv) { c.x += e.pv[0] * (e.s || 1); c.z += e.pv[1] * (e.s || 1); } // punkt zaczepienia (np. słup latarni, nie środek wysięgnika)
      const n = new THREE.Group(); n.add(w); w.position.set(-c.x, -box.min.y, -c.z);
      const base = e.w ? e.w / Math.max(size.x, size.z) : e.h ? e.h / size.y : 1;
      return (this.cache[id] = { scene: n, size, base });
    }));
  },
  inst(C, s) { const g = new THREE.Group(), o = C.scene.clone(true); o.scale.setScalar(C.base * (s || 1)); g.add(o); return g; },
};

/* ---------------- miniatury (renderowane w locie, zapamiętane w IndexedDB) ---------------- */
const Thumbs = {
  q: [], busy: false, mem: {}, db: null,
  open() { return new Promise(res => { try { const r = indexedDB.open('se3d_thumbs', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => res(); } catch (e) { res(); } }); },
  dbGet(k) { return new Promise(res => { if (!this.db) return res(null); try { const r = this.db.transaction('t').objectStore('t').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } }); },
  dbPut(k, v) { try { this.db && this.db.transaction('t', 'readwrite').objectStore('t').put(v, k); } catch (e) { } },
  want(e, img) { if (this.mem[e.id]) { img.style.backgroundImage = `url(${this.mem[e.id]})`; img.textContent = ''; return; } if (!this.q.some(x => x[0] === e)) this.q.push([e, img]); this.pump(); },
  async pump() {
    if (this.busy || !this.q.length) return; this.busy = true;
    const [e, img] = this.q.shift();
    try {
      let url = await this.dbGet(e.id);
      if (!url) {
        const C = await Models.get(e); if (C) url = this.render(C); if (url) this.dbPut(e.id, url);
      }
      if (url) { this.mem[e.id] = url; if (img.isConnected) { img.style.backgroundImage = `url(${url})`; img.textContent = ''; } }
    } catch (err) { console.warn(err); }
    this.busy = false; setTimeout(() => this.pump(), 0);
  },
  render(C) {
    if (!this.r) {
      this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); this.r.setSize(128, 128); this.r.outputEncoding = THREE.sRGBEncoding;
      this.s = new THREE.Scene(); this.s.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.1)); const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(3, 6, 4); this.s.add(d);
      this.c = new THREE.PerspectiveCamera(30, 1, 0.01, 5000);
    }
    const o = C.scene.clone(true); this.s.add(o);
    const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), R = Math.max(sz.x, sz.y, sz.z) * 0.62 + 0.001;
    const dist = R / Math.sin(15 * DEG); this.c.position.set(c.x + dist * 0.62, c.y + dist * 0.5, c.z + dist * 0.62); this.c.near = dist / 50; this.c.far = dist * 4; this.c.updateProjectionMatrix(); this.c.lookAt(c);
    this.r.render(this.s, this.c); this.s.remove(o);
    return this.r.domElement.toDataURL('image/webp', 0.8);
  },
};

/* ---------------- scena ---------------- */
const V = {
  init() {
    const host = $('#view');
    this.r = new THREE.WebGLRenderer({ antialias: true }); this.r.setPixelRatio(Math.min(2, devicePixelRatio)); this.r.outputEncoding = THREE.sRGBEncoding; host.appendChild(this.r.domElement);
    this.s = new THREE.Scene(); this.s.background = new THREE.Color(0x1b1f25);
    this.s.add(new THREE.HemisphereLight(0xeef2ff, 0x5a5048, 0.95)); const sun = new THREE.DirectionalLight(0xfff2dc, 0.75); sun.position.set(-120, 200, 80); this.s.add(sun);
    this.co = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 3000); this.co.up.set(0, 0, -1);
    this.cp = new THREE.PerspectiveCamera(45, 1, 0.5, 6000);
    ['base', 'areas', 'roads', 'ven', 'objs', 'help'].forEach(k => { this[k] = new THREE.Group(); this.s.add(this[k]); });
    this.tex = {}; this.labels = []; this.ray = new THREE.Raycaster();
    addEventListener('resize', () => this.size()); this.size();
    const loop = () => { requestAnimationFrame(loop); this.frame(); }; loop();
  },
  size() { const h = $('#view'); this.w = h.clientWidth; this.h = h.clientHeight; this.r.setSize(this.w, this.h); this.cam(); },
  cam() {
    const v = E.view, w = this.w / 2 / v.zoom, h = this.h / 2 / v.zoom;
    if (!v.d3) { Object.assign(this.co, { left: -w, right: w, top: h, bottom: -h }); this.co.position.set(v.cx, 1000, v.cz); this.co.lookAt(v.cx, 0, v.cz); this.co.updateProjectionMatrix(); this.c = this.co; }
    else { const d = this.h / v.zoom * 0.9, p = v.pitch * DEG; this.cp.aspect = this.w / this.h; this.cp.position.set(v.cx + Math.sin(v.yaw) * Math.cos(p) * d, Math.sin(p) * d, v.cz + Math.cos(v.yaw) * Math.cos(p) * d); this.cp.lookAt(v.cx, 0, v.cz); this.cp.updateProjectionMatrix(); this.c = this.cp; }
  },
  frame() {
    this.cam();
    // podpisy: stała wielkość na ekranie (18 px)
    this.labels = this.labels.filter(l => { let o = l; while (o.parent) o = o.parent; if (o !== this.s) return false; const wp = l.getWorldPosition(new THREE.Vector3()), h = 18 * (E.view.d3 ? wp.distanceTo(this.c.position) * 2 * Math.tan(this.cp.fov * DEG / 2) / this.h : 1 / E.view.zoom); l.scale.set(h * l.userData.asp, h, 1); return true; });
    this.r.render(this.s, this.c);
  },
  ground(ev) {
    const b = this.r.domElement.getBoundingClientRect(), m = new THREE.Vector2((ev.clientX - b.left) / b.width * 2 - 1, -(ev.clientY - b.top) / b.height * 2 + 1);
    this.ray.setFromCamera(m, this.c); const o = this.ray.ray, t = -o.origin.y / o.direction.y; if (!(t > 0)) return null;
    return { x: o.origin.x + o.direction.x * t, z: o.origin.z + o.direction.z * t, m };
  },
  screen(x, z) { const v = new THREE.Vector3(x, 0, z).project(this.c); return [(v.x + 1) / 2 * this.w, (1 - v.y) / 2 * this.h]; },
  mat(tex, tint, col, rep) {
    const k = tex + '|' + tint + '|' + col; if (this.tex[k]) return this.tex[k];
    const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(tint || col) });
    if (tex) { const t = new THREE.TextureLoader().load(`models/tex/${tex}/diff.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; m.map = t; if (!tint) m.color.set(0xffffff); }
    return (this.tex[k] = m);
  },
};
/** geometria w układzie świata, UV z pozycji (tekstura „kładzie się” równo) */
function flatGeo(tris, y, rep) {
  const g = new THREE.BufferGeometry(), pos = [], uv = [];
  tris.forEach(([x, z]) => { pos.push(x, y, z); uv.push(x / rep, z / rep); });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function stripTris(a, b, off, wd, ext) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
  const p = (s, t, e) => [a[0] + ux * s + nx * t, a[1] + uz * s + nz * t];
  const s0 = -ext, s1 = L + ext, t0 = off - wd / 2, t1 = off + wd / 2;
  const A = p(s0, t0), B = p(s1, t0), C = p(s1, t1), D = p(s0, t1); return [A, C, B, A, D, C];
}
function discTris(c, r, n = 16) { const out = []; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; out.push([c[0], c[1]], [c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r], [c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r]); } return out; }
function polyTris(pts) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))), g = new THREE.ShapeGeometry(sh), p = g.attributes.position, idx = g.index ? g.index.array : null, out = [];
  const n = idx ? idx.length : p.count; for (let i = 0; i < n; i++) { const j = idx ? idx[i] : i; out.push([p.getX(j), p.getY(j)]); }
  // ShapeGeometry nawija przeciwnie (bo z w dół) — odwróć, żeby normalne patrzyły w górę
  for (let i = 0; i < out.length; i += 3) { const t = out[i + 1]; out[i + 1] = out[i + 2]; out[i + 2] = t; }
  return out;
}
function label(text, color) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = 'bold 30px system-ui, sans-serif'; const w = Math.ceil(g.measureText(text).width) + 28; c.width = w; c.height = 48;
  g.font = 'bold 30px system-ui, sans-serif'; g.fillStyle = 'rgba(20,22,27,.85)'; g.fillRect(0, 0, w, 48); g.fillStyle = color || '#E0632E'; g.fillRect(0, 44, w, 4); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 14, 24);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  s.userData.asp = w / 48; s.renderOrder = 10; s.center.set(0.5, 0); V.labels.push(s); return s;
}

/* ---------------- budowa widoku z danych mapy ---------------- */
const B = {
  all() { this.base(); this.areas(); this.roads(); this.venues(); this.objs(); UI.status(); },
  clear(g) { while (g.children.length) g.remove(g.children[0]); },
  base() {
    const g = V.base; this.clear(g); const M = E.map, W = M.W, D = M.D;
    const grass = new THREE.Mesh(flatGeo([[-W / 2 - 200, -D / 2 - 200], [W / 2 + 200, D / 2 + 200], [W / 2 + 200, -D / 2 - 200], [-W / 2 - 200, -D / 2 - 200], [-W / 2 - 200, D / 2 + 200], [W / 2 + 200, D / 2 + 200]], 0, 8), V.mat('leafy_grass', '#86a064')); g.add(grass);
    const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * W / 2, 0.3, b * D / 2))), new THREE.LineBasicMaterial({ color: 0xE0632E })); g.add(edge);
    const pts = []; for (let x = -Math.floor(W / 100) * 50; x <= W / 2; x += 50) pts.push(new THREE.Vector3(x, 0.25, -D / 2), new THREE.Vector3(x, 0.25, D / 2)); for (let z = -Math.floor(D / 100) * 50; z <= D / 2; z += 50) pts.push(new THREE.Vector3(-W / 2, 0.25, z), new THREE.Vector3(W / 2, 0.25, z));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 })));
  },
  areas() {
    const g = V.areas; this.clear(g);
    E.map.areas.forEach((a, i) => {
      if (a.pts.length < 3) return; const T = MapDefs.AREA[a.t] || MapDefs.AREA.grass;
      const mat = a.t === 'water' ? (V._water || (V._water = new THREE.MeshLambertMaterial({ color: 0x2f6f9a, emissive: 0x0b2436 }))) : V.mat(T.tex, T.tint, T.col);
      const m = new THREE.Mesh(flatGeo(polyTris(a.pts), 0.02 + i * 0.0005, T.rep || 4), mat); m.userData.area = a; g.add(m);
      if (a.t === 'water') { const e = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(a.pts.map(([x, z]) => new THREE.Vector3(x, 0.08, z))), new THREE.LineBasicMaterial({ color: 0x8e8c86 })); g.add(e); }
    });
  },
  roads() {
    const g = V.roads; this.clear(g);
    const walkM = V.mat('concrete_pavement', '#b3ada2'), lineM = new THREE.MeshBasicMaterial({ color: 0xe8e0c0 }), groups = {};
    const add = (key, mat, tris, y, rep) => { (groups[key] = groups[key] || { mat, tris: [], y, rep }).tris.push(...tris); };
    E.map.roads.forEach(r => {
      const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2, wd = MapDefs.roadW(r), mat = V.mat(T.tex, T.tint, T.col);
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        add(r.t, mat, stripTris(a, b, 0, wd, T.walkway ? wd / 2 : 0), T.walkway ? 0.045 : 0.05, T.rep || 4);
        if (T.walk) [-1, 1].forEach(sd => add('walk', walkM, stripTris(a, b, sd * (wd / 2 + T.walk / 2), T.walk, T.walk / 2), 0.04, 3));
        if (T.line) add('line', lineM, stripTris(a, b, 0, 0.25, -2), 0.055, 1);
      }
      if (!T.walkway) r.pts.forEach(p => { add(r.t, mat, discTris(p, wd / 2), 0.049, T.rep || 4); if (T.walk) add('walk', walkM, discTris(p, wd / 2 + T.walk), 0.039, 3); });
      else r.pts.forEach(p => add(r.t, mat, discTris(p, wd / 2), 0.044, T.rep || 4));
    });
    Object.values(groups).forEach(q => g.add(new THREE.Mesh(flatGeo(q.tris, q.y, q.rep), q.mat)));
  },
  venues() {
    const g = V.ven; this.clear(g);
    Object.entries(E.map.venues).forEach(([k, v]) => {
      const D = MapDefs.VENUE[k]; if (!D) return; const o = new THREE.Group(); o.position.set(v.x, 0, v.z); o.userData.venue = k; g.add(o);
      if (D.stadium) {
        const S = MapDefs.STADIUM, el = (rx, rz, col, y) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshLambertMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.y = y; o.add(m); };
        el(S.x + 10, S.z + 10, 0xb3aea4, 0.06); el(S.x, S.z, 0x7c8088, 0.07);
        const oval = (d, col, y) => { const sh = new THREE.Shape(), str = 72, rr = 32 + d; sh.moveTo(-str / 2, -rr); sh.lineTo(str / 2, -rr); sh.absarc(str / 2, 0, rr, -Math.PI / 2, Math.PI / 2); sh.lineTo(-str / 2, rr); sh.absarc(-str / 2, 0, rr, Math.PI / 2, Math.PI * 1.5); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), new THREE.MeshLambertMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.y = y; o.add(m); };
        oval(6, 0xb06a3c, 0.08); oval(-5, 0x3f8a45, 0.09);
        const gate = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 1.2), new THREE.MeshLambertMaterial({ color: 0xE0632E })); gate.position.set(0, 1.5, S.z + 3); o.add(gate);
      } else if (D.osiedle) {
        o.rotation.y = v.r || 0;
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(88, 60), new THREE.MeshLambertMaterial({ color: 0x5c5e62 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.06, -5); o.add(pad);
        [['blk16', 'a3d/prlBlock16.glb', {}, 0, -27.5, 0, 1], ['blk9', 'sk/blkSov.glb', { ry: Math.PI / 2, h: 28 }, -34, 1, Math.PI / 2], ['blk9', 'sk/blkSov.glb', { ry: Math.PI / 2, h: 28 }, 34, 1, -Math.PI / 2]].forEach(([id, f, fx, x, z, r]) =>
          Models.get({ id: 'os:' + id, f, ...fx }).then(C => { if (!C || !o.parent) return; const m = Models.inst(C, 1); m.position.set(x, 0, z); m.rotation.y = r; o.add(m); }));
      } else {
        o.rotation.y = v.r || 0;
        Models.get({ id: 'v:' + k, f: D.f, ...D.fix, ...(D.size && D.size.h ? { h: D.size.h } : {}) }).then(C => {
          if (!C || !o.parent) return; const s = D.size && D.size.s ? D.size.s : 1, m = Models.inst(C, s); o.add(m);
          const dep = C.size.z * C.base * s, ar = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(D.c) })); ar.rotation.x = Math.PI / 2; ar.position.set(0, 0.5, dep / 2 + 2.6); o.add(ar);
        });
      }
      const l = label(D.icon + ' ' + D.n, D.c); l.position.set(0, D.stadium ? 20 : 16, 0); o.add(l);
    });
  },
  objs() { const g = V.objs; this.clear(g); E.map.objs.forEach(o => this.obj(o)); },
  obj(o) {
    const e = E.byId[o.c]; if (!e) return;
    const holder = new THREE.Group(); holder.position.set(o.x, 0, o.z); holder.rotation.y = o.r || 0; holder.userData.obj = o; V.objs.add(holder); GO.set(o, holder);
    Models.get(e).then(C => { if (!C || holder.parent !== V.objs) return; holder.add(Models.inst(C, o.s)); if (E.sel && E.sel.o === o) Sel.box(); });
  },
  sync(o) { const g = GO.get(o); if (!g) return; g.position.set(o.x, 0, o.z); g.rotation.y = o.r || 0; const c = g.children[0]; if (c) { const C = Models.cache[o.c]; if (C) c.children[0].scale.setScalar(C.base * (o.s || 1)); } },
};

/* ---------------- zaznaczenie, uchwyty ---------------- */
const Sel = {
  set(s) { E.sel = s; this.box(); UI.props(); },
  box() {
    const g = V.help; [this.bh, this.hp, this.ln].forEach(x => x && g.remove(x)); this.bh = this.hp = this.ln = null; V.hp = null;
    const s = E.sel; if (!s) return;
    if (s.o && GO.get(s.o)) { this.bh = new THREE.BoxHelper(GO.get(s.o), 0xffd23f); g.add(this.bh); }
    if (s.venue) { const o = V.ven.children.find(c => c.userData.venue === s.venue); if (o) { this.bh = new THREE.BoxHelper(o, 0xffd23f); g.add(this.bh); } }
    const pts = s.road ? s.road.pts : s.area ? s.area.pts : null;
    if (pts) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, 0.5, z)));
      this.hp = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd23f, size: 9, sizeAttenuation: false, depthTest: false })); this.hp.renderOrder = 20; g.add(this.hp);
      this.ln = new (s.area ? THREE.LineLoop : THREE.Line)(geo, new THREE.LineBasicMaterial({ color: 0xffd23f, depthTest: false })); this.ln.renderOrder = 19; g.add(this.ln);
    }
  },
  refresh() { if (this.bh && this.bh.update) this.bh.update(); },
};

/* ---------------- historia ---------------- */
const clean = m => JSON.stringify(m);
function snap() { E.hist.push(clean(E.map)); if (E.hist.length > 80) E.hist.shift(); E.fut = []; E.dirty = true; }
function undo(redo) {
  const from = redo ? E.fut : E.hist, to = redo ? E.hist : E.fut; if (!from.length) return;
  to.push(clean(E.map)); E.map = JSON.parse(from.pop()); Sel.set(null); B.all(); E.dirty = true;
}

/* ---------------- dokładanie do mapy ---------------- */
const Snap = {
  grid(v) { const s = +$('#snap').value; return s ? Math.round(v / s) * s : v; },
  // punkt drogi: przyklej do istniejącego punktu (≤4 m) albo do osi innej drogi (wstaw tam punkt = skrzyżowanie)
  road(x, z, skip) {
    let best = null;
    E.map.roads.forEach(r => { if (r === skip) return; r.pts.forEach(p => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < 4 / Math.max(0.5, E.view.zoom / 1.4) + 2 && (!best || d < best.d)) best = { d, x: p[0], z: p[1] }; }); });
    if (best) return [best.x, best.z];
    const n = MapDefs.nearestRoad(E.map, x, z, r => r !== skip);
    if (n.d < n.wd / 2 + 1 && n.t > 0.02 && n.t < 0.98) { const r = E.map.roads[n.ri], p = [R2(n.x), R2(n.z)]; r.pts.splice(n.si + 1, 0, p); return p; }
    return [R2(this.grid(x)), R2(this.grid(z))];
  },
};

/* ---------------- narzędzia i mysz ---------------- */
const Tool = {
  pan: null, drag: null, space: false,
  set(t) {
    this.cancel(); E.tool = t; document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    if (t !== 'select') Sel.set(null);
    UI.toolopt(); UI.hint(); this.ghost();
  },
  cancel() { E.draw = null; this.preview(); },
  ghost() {
    if (this.gh) { V.help.remove(this.gh); this.gh = null; }
    if (E.tool !== 'place' || !E.cur) return;
    const e = E.cur, g = new THREE.Group(); this.gh = g; V.help.add(g); g.visible = false;
    Models.get(e).then(C => { if (!C || this.gh !== g) return; g.add(Models.inst(C, 1)); g.userData.C = C; this.ghostUpd(); });
  },
  ghostUpd() { const g = this.gh; if (!g || !g.children[0]) return; g.rotation.y = E.rot; g.children[0].children[0].scale.setScalar(g.userData.C.base * E.scale); },
  preview(p) {
    if (this.pl) { V.help.remove(this.pl); this.pl = null; }
    const d = E.draw; if (!d) return;
    let pts = d.pts.slice(); if (p && d.kind !== 'rect' && d.kind !== 'circle') pts.push([p.x, p.z]);
    if (d.kind === 'rect' && p) { const [x0, z0] = d.pts[0]; pts = [[x0, z0], [p.x, z0], [p.x, p.z], [x0, p.z]]; }
    if (d.kind === 'circle' && p) { const [x0, z0] = d.pts[0], r = Math.hypot(p.x - x0, p.z - z0); pts = []; for (let i = 0; i < 32; i++) pts.push([x0 + Math.cos(i / 32 * 6.2832) * r, z0 + Math.sin(i / 32 * 6.2832) * r]); }
    if (pts.length < 2) return;
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, 0.6, z)));
    this.pl = new ((d.kind === 'road') ? THREE.Line : THREE.LineLoop)(geo, new THREE.LineBasicMaterial({ color: 0xff8a3d, depthTest: false })); this.pl.renderOrder = 30; V.help.add(this.pl);
  },
  pick(ev, p) {
    // obiekty i lokale (promień), potem drogi, potem tereny
    const b = V.r.domElement.getBoundingClientRect(), m = new THREE.Vector2((ev.clientX - b.left) / b.width * 2 - 1, -(ev.clientY - b.top) / b.height * 2 + 1);
    V.ray.setFromCamera(m, V.c);
    const hit = V.ray.intersectObjects([V.objs, V.ven], true).find(h => !h.object.isSprite);
    if (hit) { let o = hit.object; while (o && !o.userData.obj && !o.userData.venue) o = o.parent; if (o) return o.userData.obj ? { o: o.userData.obj } : { venue: o.userData.venue }; }
    if (!p) return null;
    const n = MapDefs.nearestRoad(E.map, p.x, p.z); if (n.d < n.wd / 2 + 1) return { road: E.map.roads[n.ri] };
    for (let i = E.map.areas.length - 1; i >= 0; i--) if (MapDefs.inPoly(E.map.areas[i].pts, p.x, p.z)) return { area: E.map.areas[i] };
    return null;
  },
  handleAt(ev) {
    const s = E.sel, pts = s && (s.road ? s.road.pts : s.area ? s.area.pts : null); if (!pts) return -1;
    const b = V.r.domElement.getBoundingClientRect(), mx = ev.clientX - b.left, my = ev.clientY - b.top;
    for (let i = 0; i < pts.length; i++) { const [sx, sy] = V.screen(pts[i][0], pts[i][1]); if (Math.hypot(sx - mx, sy - my) < 9) return i; }
    return -1;
  },
  down(ev) {
    ev.preventDefault(); const p = V.ground(ev);
    if (ev.button === 1 || ev.button === 2 || (ev.button === 0 && this.space)) {
      if (ev.button === 2 && E.draw && E.draw.kind !== 'rect' && E.draw.kind !== 'circle') { this.finish(); return; }
      this.pan = { x: ev.clientX, y: ev.clientY, cx: E.view.cx, cz: E.view.cz, yaw: E.view.yaw, pitch: E.view.pitch, rot: ev.button === 2 && E.view.d3 && ev.shiftKey }; return;
    }
    if (!p) return;
    const t = E.tool;
    if (t === 'select') {
      const hi = this.handleAt(ev);
      if (hi >= 0) {
        const pts = E.sel.road ? E.sel.road.pts : E.sel.area.pts;
        if (ev.ctrlKey) { if (pts.length > (E.sel.road ? 2 : 3)) { snap(); pts.splice(hi, 1); this.after(); } return; }
        snap(); this.drag = { vtx: hi, pts }; return;
      }
      const s = this.pick(ev, p);
      if (s && s.road && ev.shiftKey && E.sel && E.sel.road === s.road) { const n = MapDefs.nearestRoad({ roads: [s.road] }, p.x, p.z); snap(); s.road.pts.splice(n.si + 1, 0, [R2(n.x), R2(n.z)]); this.after(); return; }
      Sel.set(s);
      if (s && (s.o || s.venue)) { const it = s.o || E.map.venues[s.venue]; snap(); this.drag = { it, dx: it.x - p.x, dz: it.z - p.z, moved: false }; }
      else if (s && (s.road || s.area)) { snap(); this.drag = { all: s.road ? s.road.pts : s.area.pts, x: p.x, z: p.z, orig: JSON.parse(JSON.stringify(s.road ? s.road.pts : s.area.pts)), moved: false }; }
      return;
    }
    if (t === 'place') {
      if (!E.cur) { UI.toast('Najpierw wybierz model z listy po lewej'); return; }
      snap(); this.placeAt(p.x, p.z); if (ev.shiftKey) this.drag = { brush: true, lx: p.x, lz: p.z }; return;
    }
    if (t === 'erase') { const s = this.pick(ev, p); if (s) { snap(); this.remove(s); } return; }
    if (t === 'venue') {
      snap(); const k = E.venueK, old = E.map.venues[k];
      E.map.venues[k] = { x: R2(Snap.grid(p.x)), z: R2(Snap.grid(p.z)), r: old ? old.r : this.faceRoad(p.x, p.z) }; B.venues(); UI.toolopt(); UI.status(); Sel.set({ venue: k }); return;
    }
    if (t === 'road') {
      const q = Snap.road(p.x, p.z); if (!E.draw) E.draw = { kind: 'road', pts: [] };
      const last = E.draw.pts[E.draw.pts.length - 1]; if (last && Math.hypot(last[0] - q[0], last[1] - q[1]) < 0.5) return;
      E.draw.pts.push(q); if (ev.detail === 2) this.finish(); else { B.roads(); this.preview(p); } return;
    }
    if (t === 'area') {
      const q = [R2(Snap.grid(p.x)), R2(Snap.grid(p.z))];
      if (E.areaShape === 'poly') { if (!E.draw) E.draw = { kind: 'area', pts: [] }; E.draw.pts.push(q); if (ev.detail === 2) this.finish(); else this.preview(p); }
      else { E.draw = { kind: E.areaShape, pts: [q] }; this.drag = { shape: true }; }
    }
  },
  move(ev) {
    const p = V.ground(ev); UI.coords(p);
    if (this.pan) {
      const P = this.pan;
      if (P.rot) { E.view.yaw = P.yaw - (ev.clientX - P.x) * 0.006; E.view.pitch = Math.max(15, Math.min(89, P.pitch + (ev.clientY - P.y) * 0.25)); return; }
      const k = 1 / E.view.zoom, dx = (ev.clientX - P.x) * k, dy = (ev.clientY - P.y) * k;
      if (!E.view.d3) { E.view.cx = P.cx - dx; E.view.cz = P.cz - dy; }
      else { const c = Math.cos(E.view.yaw), s = Math.sin(E.view.yaw); E.view.cx = P.cx - dx * c - dy * s; E.view.cz = P.cz + dx * s - dy * c; }
      return;
    }
    if (!p) return;
    if (this.gh) { this.gh.visible = true; this.gh.position.set(Snap.grid(p.x), 0, Snap.grid(p.z)); }
    const d = this.drag;
    if (d) {
      if (d.vtx != null) { const q = E.sel.road ? Snap.road(p.x, p.z, E.sel.road) : [R2(Snap.grid(p.x)), R2(Snap.grid(p.z))]; d.pts[d.vtx] = q; this.after(true); }
      else if (d.it) { d.it.x = R2(Snap.grid(p.x + d.dx)); d.it.z = R2(Snap.grid(p.z + d.dz)); d.moved = true; if (E.sel.o) { B.sync(d.it); Sel.refresh(); } else { B.venues(); Sel.box(); } UI.props(true); }
      else if (d.all) { const dx = Snap.grid(p.x - d.x), dz = Snap.grid(p.z - d.z); d.all.forEach((q, i) => { q[0] = R2(d.orig[i][0] + dx); q[1] = R2(d.orig[i][1] + dz); }); d.moved = true; this.after(true); }
      else if (d.brush) { const sp = Math.max(1.5, (Models.cache[E.cur.id] ? Math.max(Models.cache[E.cur.id].size.x, Models.cache[E.cur.id].size.z) * Models.cache[E.cur.id].base * E.scale : 3) * 1.1); if (Math.hypot(p.x - d.lx, p.z - d.lz) >= sp) { this.placeAt(p.x, p.z); d.lx = p.x; d.lz = p.z; } }
      else if (d.shape) this.preview(p);
      return;
    }
    if (E.draw) this.preview({ x: Snap.grid(p.x), z: Snap.grid(p.z) });
  },
  up(ev) {
    if (this.pan) { this.pan = null; return; }
    const d = this.drag; this.drag = null; if (!d) return;
    if ((d.it || d.all) && !d.moved) E.hist.pop(); // tylko klik — nic się nie zmieniło
    if (d.vtx != null || d.all) { this.after(); }
    if (d.shape) { const p = V.ground(ev); if (p) this.preview({ x: Snap.grid(p.x), z: Snap.grid(p.z) }); const pts = this.pl ? Array.from({ length: this.pl.geometry.attributes.position.count }, (_, i) => [R2(this.pl.geometry.attributes.position.getX(i)), R2(this.pl.geometry.attributes.position.getZ(i))]) : []; E.draw = null; this.preview(); if (pts.length >= 3 && Math.abs(pts[0][0] - pts[2][0]) + Math.abs(pts[0][1] - pts[2][1]) > 1) { snap(); E.map.areas.push({ t: E.areaT, pts }); B.areas(); UI.status(); } }
  },
  after(live) { if (E.sel && E.sel.road) B.roads(); if (E.sel && E.sel.area) B.areas(); Sel.box(); if (!live) UI.status(); },
  finish() {
    const d = E.draw; if (!d) return; E.draw = null; this.preview();
    if (d.kind === 'road' && d.pts.length >= 2) { snap(); const r = { t: E.roadT, pts: d.pts }; const nm = $('#rname') && $('#rname').value.trim(); if (nm) r.name = nm; const w = $('#rw') && +$('#rw').value; if (w) r.w = w; E.map.roads.push(r); }
    if (d.kind === 'area' && d.pts.length >= 3) { snap(); E.map.areas.push({ t: E.areaT, pts: d.pts }); }
    B.roads(); B.areas(); UI.status();
  },
  placeAt(x, z) {
    const o = { c: E.cur.id, x: R2(Snap.grid(x)), z: R2(Snap.grid(z)), r: +(E.rot % (Math.PI * 2)).toFixed(4), s: E.scale };
    if (E.rnd) { o.r = +(Math.random() * Math.PI * 2).toFixed(4); o.s = R2(E.scale * (0.8 + Math.random() * 0.4)); }
    E.map.objs.push(o); B.obj(o); UI.status(); return o;
  },
  remove(s) {
    if (s.o) { const i = E.map.objs.indexOf(s.o); if (i >= 0) E.map.objs.splice(i, 1); if (GO.get(s.o)) V.objs.remove(GO.get(s.o)); }
    if (s.road) { E.map.roads.splice(E.map.roads.indexOf(s.road), 1); B.roads(); }
    if (s.area) { E.map.areas.splice(E.map.areas.indexOf(s.area), 1); B.areas(); }
    if (s.venue) { delete E.map.venues[s.venue]; B.venues(); UI.toolopt(); }
    if (E.sel && (E.sel.o === s.o && s.o || E.sel.road === s.road && s.road || E.sel.area === s.area && s.area || E.sel.venue === s.venue && s.venue)) Sel.set(null);
    UI.status();
  },
  faceRoad(x, z) { const n = MapDefs.nearestRoad(E.map, x, z, r => (MapDefs.ROAD[r.t] || {}).car); return n.d > 1e8 ? 0 : +Math.atan2(n.x - x, n.z - z).toFixed(4); },
  rotate(a) {
    const s = E.sel;
    if (E.tool === 'place') { E.rot = (E.rot + a + Math.PI * 2) % (Math.PI * 2); this.ghostUpd(); UI.toolopt(); return; }
    if (!s) return; snap();
    if (s.o) { s.o.r = +(((s.o.r || 0) + a + Math.PI * 2) % (Math.PI * 2)).toFixed(4); B.sync(s.o); Sel.refresh(); }
    if (s.venue) { const v = E.map.venues[s.venue]; v.r = +(((v.r || 0) + a + Math.PI * 2) % (Math.PI * 2)).toFixed(4); B.venues(); Sel.box(); }
    UI.props();
  },
  scaleBy(f) {
    if (E.tool === 'place') { E.scale = R2(Math.max(0.05, E.scale * f)); this.ghostUpd(); UI.toolopt(); return; }
    const s = E.sel; if (!s || !s.o) return; snap(); s.o.s = R2(Math.max(0.05, (s.o.s || 1) * f)); B.sync(s.o); Sel.refresh(); UI.props();
  },
  dup() { const s = E.sel; if (!s || !s.o) return; snap(); const o = { ...s.o, x: R2(s.o.x + 3), z: R2(s.o.z + 3) }; E.map.objs.push(o); B.obj(o); Sel.set({ o }); UI.status(); },
};

/* ---------------- automaty: latarnie, drzewa, zabudowa ---------------- */
const Auto = {
  samples(step, off, filter, cb) {
    E.map.roads.forEach(r => {
      const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; if (!filter(T)) return; const wd = MapDefs.roadW(r);
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
        for (let t = step / 2; t < L - 4; t += step) [-1, 1].forEach(sd => { const o = off(T, wd); cb(ax + ux * t + nx * o * sd, az + uz * t + nz * o * sd, Math.atan2(-nx * sd, -nz * sd), T, wd, ux, uz, t, L); });
      }
    });
  },
  blocked(x, z, rad, self) {
    if (E.map.areas.some(a => a.t === 'water' && MapDefs.inPoly(a.pts, x, z))) return true;
    for (const r of E.map.roads) { const n = MapDefs.nearestRoad({ roads: [r] }, x, z), T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; if (r !== self && n.d < n.wd / 2 + (T.walk || 0) + rad) return true; }
    for (const [k, v] of Object.entries(E.map.venues)) { const D = MapDefs.VENUE[k]; if (D.stadium) { if (((x - v.x) / (MapDefs.STADIUM.x + 12 + rad)) ** 2 + ((z - v.z) / (MapDefs.STADIUM.z + 12 + rad)) ** 2 < 1) return true; } else if (Math.hypot(x - v.x, z - v.z) < (D.osiedle ? 55 : 16) + rad) return true; }
    return E.map.objs.some(o => { const C = Models.cache[o.c], or = C ? Math.max(C.size.x, C.size.z) * C.base * (o.s || 1) / 2 * 0.85 : 1; return Math.hypot(o.x - x, o.z - z) < or + rad; });
  },
  async lamps() {
    const e = E.byId[E.lampId]; if (!e) { UI.toast('Wybierz model latarni'); return; } await Models.get(e); snap(); let n = 0;
    this.samples(24, (T, wd) => wd / 2 + 0.7, T => T.car, (x, z, r) => { if (this.blocked(x, z, 0.8, 'skip')) { const nn = MapDefs.nearestRoad(E.map, x, z); if (nn.d < nn.wd / 2 + 0.3) return; if (E.map.objs.some(o => Math.hypot(o.x - x, o.z - z) < 6) || E.map.areas.some(a => a.t === 'water' && MapDefs.inPoly(a.pts, x, z))) return; }
      const o = { c: e.id, x: R2(x), z: R2(z), r: +((r + E.lampRot) % (Math.PI * 2)).toFixed(4), s: 1 }; E.map.objs.push(o); B.obj(o); n++; });
    UI.status(); UI.toast(`Postawiono ${n} latarni`);
  },
  async trees() {
    const ids = E.cat.filter(e => e.k === 't' && /tree|drzew|birch|oak|pine|maple|brzoz|dąb|klon/i.test(e.id + e.name)).map(e => e.id); if (!ids.length) return;
    snap(); let n = 0;
    const list = []; this.samples(13, (T, wd) => wd / 2 + (T.walk || 0) + 1.8, T => T.car, (x, z) => list.push([x, z]));
    for (const [x, z] of list) { if (this.blocked(x, z, 1.4)) continue; const e = E.byId[ids[(Math.random() * ids.length) | 0]], C = await Models.get(e); if (!C) continue; const o = { c: e.id, x: R2(x), z: R2(z), r: +(Math.random() * 6.28).toFixed(3), s: R2(0.85 + Math.random() * 0.3) }; E.map.objs.push(o); B.obj(o); n++; }
    UI.status(); UI.toast(`Posadzono ${n} drzew`);
  },
  async houses() {
    const pool = E.cat.filter(e => e.g === 'Budynki (pełne)' && !/kiosk|subst|k67|gar/.test(e.id)).concat(E.cat.filter(e => e.g === 'Budynki z wejściem'));
    UI.toast('Wczytuję budynki…'); const Cs = {}; for (const e of pool) Cs[e.id] = await Models.get(e);
    snap(); let n = 0;
    E.map.roads.forEach(r => {
      const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; if (!T.car) return; const wd = MapDefs.roadW(r);
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
        [-1, 1].forEach(sd => {
          for (let t = 10; t < L - 10;) {
            const e = pool[(Math.random() * pool.length) | 0], C = Cs[e.id]; if (!C) { t += 10; continue; }
            const wid = C.size.x * C.base, dep = C.size.z * C.base, off = wd / 2 + (T.walk || 0) + 2 + dep / 2, x = ax + ux * (t + wid / 2) + nx * off * sd, z = az + uz * (t + wid / 2) + nz * off * sd, rot = Math.atan2(-nx * sd, -nz * sd);
            if (t + wid > L - 6) break;
            if (Math.abs(x) > E.map.W / 2 - 8 || Math.abs(z) > E.map.D / 2 - 8 || this.blocked(x, z, Math.min(wid, dep) / 2 * 0.9, r) || this.cornerHit(x, z, rot, wid, dep)) { t += 6; continue; }
            const o = { c: e.id, x: R2(x), z: R2(z), r: +rot.toFixed(4), s: 1 }; E.map.objs.push(o); B.obj(o); n++; t += wid + 3 + Math.random() * 4;
          }
        });
      }
    });
    UI.status(); UI.toast(`Postawiono ${n} budynków`);
  },
  cornerHit(x, z, r, w, d) {
    const c = Math.cos(r), s = Math.sin(r);
    for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0, 0.5]) { const lx = u * w, lz = v * d, px = x + lx * c + lz * s, pz = z - lx * s + lz * c; if (this.blocked(px, pz, 0.5)) return true; }
    return false;
  },
};

/* ---------------- interfejs ---------------- */
const UI = {
  toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this._t); this._t = setTimeout(() => el.classList.remove('on'), 2200); },
  coords(p) { this._p = p; if (!this._cq) { this._cq = true; requestAnimationFrame(() => { this._cq = false; this.status(); }); } },
  status() {
    const M = E.map; if (!M) return; const miss = Object.keys(MapDefs.VENUE).filter(k => !M.venues[k]), p = this._p;
    $('#status').innerHTML = `<span>${p ? `x <b>${p.x.toFixed(1)}</b> z <b>${p.z.toFixed(1)}</b>` : '—'}</span><span>Drogi: <b>${M.roads.length}</b></span><span>Tereny: <b>${M.areas.length}</b></span><span>Modele: <b>${M.objs.length}</b></span>`
      + (miss.length ? `<span class="warn">Brak lokali: ${miss.map(k => MapDefs.VENUE[k].icon).join(' ')} (gra postawi je w domyślnych miejscach)</span>` : '<span class="good">✔ wszystkie lokale na mapie</span>')
      + `<span>${E.dirty ? '● niezapisane zmiany' : 'zapisano'}</span>`;
  },
  hint() {
    const H = {
      select: '<b>Klik</b> zaznacza, <b>przeciągnij</b> przesuwa. Drogę/teren: przeciągaj żółte punkty, <b>Shift+klik</b> dodaje punkt, <b>Ctrl+klik</b> usuwa. <b>Del</b> usuwa, <b>R</b> obraca.',
      place: '<b>Klik</b> stawia wybrany model. <b>R/Q</b> obrót (Shift = 90°), <b>[ ]</b> skala, <b>Shift+przeciągnij</b> = pędzel. <b>Esc</b> kończy.',
      road: '<b>Klikaj</b> kolejne punkty drogi, <b>Enter</b>/dwuklik/prawy przycisk kończy, <b>Backspace</b> cofa punkt. Koniec przy innej drodze = skrzyżowanie.',
      area: E.areaShape === 'poly' ? '<b>Klikaj</b> narożniki terenu, <b>Enter</b> kończy.' : '<b>Przeciągnij</b>, żeby narysować teren.',
      venue: 'Wybierz lokal z listy i <b>kliknij</b> na mapie. <b>R</b> obraca (strzałka = drzwi — przodem do ulicy). Stadion ma wejście od południa (dół mapy).',
      erase: '<b>Klik</b> usuwa model, drogę, teren albo lokal.',
    };
    $('#hint').innerHTML = H[E.tool] + ' &nbsp;·&nbsp; <b>Prawy/środkowy</b> przycisk: przesuń widok, <b>kółko</b>: zoom' + (E.view.d3 ? ', <b>Shift+prawy</b>: obracaj' : '');
  },
  toolopt() {
    const el = $('#toolopt'), t = E.tool;
    if (t === 'place') {
      el.innerHTML = `<div class="row"><b>${E.cur ? esc(E.cur.name) : 'Wybierz model z listy ↓'}</b></div>
        <div class="row">Obrót <input type="number" id="orot" step="15" value="${Math.round(E.rot / DEG)}">° Skala <input type="number" id="oscl" step="0.1" min="0.05" value="${E.scale}"></div>
        <div class="row"><label><input type="checkbox" id="ornd" ${E.rnd ? 'checked' : ''}> losowy obrót i wielkość (las, krzaki)</label></div>`;
      $('#orot').onchange = e => { E.rot = (+e.target.value || 0) * DEG; Tool.ghostUpd(); };
      $('#oscl').onchange = e => { E.scale = Math.max(0.05, +e.target.value || 1); Tool.ghostUpd(); };
      $('#ornd').onchange = e => { E.rnd = e.target.checked; };
    } else if (t === 'road') {
      const lamps = E.cat.filter(e => e.g === 'Latarnie i światło' && e.id.startsWith('sk:'));
      el.innerHTML = `<div class="chips">${Object.entries(MapDefs.ROAD).map(([k, r]) => `<button data-rt="${k}" class="${k === E.roadT ? 'on' : ''}"><span class="sw" style="background:${r.col}"></span>${r.n}</button>`).join('')}</div>
        <div class="row">Szerokość <input type="number" id="rw" step="0.5" min="1" placeholder="${MapDefs.ROAD[E.roadT].wd}"> m <input id="rname" placeholder="nazwa ulicy (opcjonalnie)" style="flex:1;min-width:90px"></div>
        <div class="row" style="border-top:1px solid var(--line);padding-top:6px"><b>Automaty wzdłuż ulic:</b></div>
        <div class="row"><select id="lamp" style="flex:1">${lamps.map(e => `<option value="${e.id}" ${e.id === E.lampId ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select><select id="lrot" title="obrót latarni"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></div>
        <div class="row"><button data-auto="lamps">💡 Latarnie</button><button data-auto="trees">🌳 Drzewa</button><button data-auto="houses">🏢 Zabudowa</button></div>`;
      el.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { E.roadT = b.dataset.rt; this.toolopt(); });
      $('#lamp').onchange = e => { E.lampId = e.target.value; }; $('#lrot').value = String(Math.round(E.lampRot / DEG)); $('#lrot').onchange = e => { E.lampRot = +e.target.value * DEG; };
      el.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => Auto[b.dataset.auto]());
    } else if (t === 'area') {
      el.innerHTML = `<div class="chips">${Object.entries(MapDefs.AREA).map(([k, r]) => `<button data-at="${k}" class="${k === E.areaT ? 'on' : ''}"><span class="sw" style="background:${r.col}"></span>${r.n}</button>`).join('')}</div>
        <div class="chips">${[['poly', '⬟ Wielokąt'], ['rect', '▭ Prostokąt'], ['circle', '◯ Koło']].map(([k, n]) => `<button data-sh="${k}" class="${k === E.areaShape ? 'on' : ''}">${n}</button>`).join('')}</div>`;
      el.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { E.areaT = b.dataset.at; this.toolopt(); });
      el.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { E.areaShape = b.dataset.sh; Tool.cancel(); this.toolopt(); this.hint(); });
    } else if (t === 'venue') {
      el.innerHTML = `<div class="chips">${Object.entries(MapDefs.VENUE).map(([k, v]) => `<button data-vk="${k}" class="${k === E.venueK ? 'on' : ''}" title="${E.map.venues[k] ? 'na mapie — kliknij na mapie, żeby przenieść' : 'jeszcze nie ma na mapie'}">${v.icon} ${esc(v.n)} ${E.map.venues[k] ? '✔' : ''}</button>`).join('')}</div>`;
      el.querySelectorAll('[data-vk]').forEach(b => b.onclick = () => { E.venueK = b.dataset.vk; const v = E.map.venues[E.venueK]; if (v) { E.view.cx = v.x; E.view.cz = v.z; Sel.set({ venue: E.venueK }); } this.toolopt(); });
    } else el.innerHTML = '';
  },
  props(live) {
    const el = $('#right'), s = E.sel; if (!s) { el.style.display = 'none'; return; } el.style.display = 'block';
    if (live && this._pk === s) { const it = s.o || E.map.venues[s.venue]; if (it) { const a = $('#px'), b = $('#pz'); if (a) a.value = it.x; if (b) b.value = it.z; } return; }
    this._pk = s;
    const num = (id, lab, v, step) => `<div class="f"><label>${lab}</label><input type="number" id="${id}" step="${step}" value="${v}"></div>`;
    if (s.o) {
      const e = E.byId[s.o.c] || { name: s.o.c, g: '' };
      el.innerHTML = `<h3>${esc(e.name)}</h3><div class="f"><label>${esc(e.g)}</label>${e.enter ? '<span>🚪 z wejściem</span>' : ''}</div>${num('px', 'X', s.o.x, 0.5)}${num('pz', 'Z', s.o.z, 0.5)}${num('pr', 'Obrót °', Math.round((s.o.r || 0) / DEG), 15)}${num('ps', 'Skala', s.o.s || 1, 0.1)}
        <div class="btns"><button id="bdup">⧉ Duplikuj</button><button id="bsame">📦 Stawiaj taki</button><button class="del" id="bdel">🗑 Usuń</button></div>`;
      const ch = () => { snap(); s.o.x = +$('#px').value; s.o.z = +$('#pz').value; s.o.r = +$('#pr').value * DEG; s.o.s = Math.max(0.05, +$('#ps').value || 1); B.sync(s.o); Sel.refresh(); };
      ['#px', '#pz', '#pr', '#ps'].forEach(q => $(q).onchange = ch);
      $('#bdup').onclick = () => Tool.dup(); $('#bdel').onclick = () => { snap(); Tool.remove(s); };
      $('#bsame').onclick = () => { E.cur = E.byId[s.o.c]; E.rot = s.o.r || 0; E.scale = s.o.s || 1; Tool.set('place'); Pal.mark(); };
    } else if (s.venue) {
      const v = E.map.venues[s.venue], D = MapDefs.VENUE[s.venue];
      el.innerHTML = `<h3>${D.icon} ${esc(D.n)}</h3>${num('px', 'X', v.x, 0.5)}${num('pz', 'Z', v.z, 0.5)}${D.stadium ? '<p class="f"><label>Wejście zawsze od południa</label></p>' : num('pr', 'Obrót °', Math.round((v.r || 0) / DEG), 15)}
        <div class="btns"><button id="bface">↻ Przodem do ulicy</button><button class="del" id="bdel">🗑 Usuń z mapy</button></div>`;
      const ch = () => { snap(); v.x = +$('#px').value; v.z = +$('#pz').value; if ($('#pr')) v.r = +$('#pr').value * DEG; B.venues(); Sel.box(); };
      ['#px', '#pz', '#pr'].forEach(q => $(q) && ($(q).onchange = ch));
      $('#bface').onclick = () => { snap(); v.r = Tool.faceRoad(v.x, v.z); B.venues(); Sel.box(); this.props(); };
      $('#bdel').onclick = () => { snap(); Tool.remove(s); };
    } else if (s.road) {
      const r = s.road;
      el.innerHTML = `<h3>🛣 Droga</h3><div class="f"><label>Rodzaj</label><select id="prt">${Object.entries(MapDefs.ROAD).map(([k, v]) => `<option value="${k}" ${k === r.t ? 'selected' : ''}>${v.n}</option>`).join('')}</select></div>
        ${num('prw', 'Szerokość m', MapDefs.roadW(r), 0.5)}<div class="f"><label>Nazwa</label><input id="prn" value="${esc(r.name || '')}" placeholder="np. ul. Lipowa"></div><div class="f"><label>Punkty</label><span>${r.pts.length}</span></div>
        <div class="btns"><button id="brev">⇄ Odwróć</button><button class="del" id="bdel">🗑 Usuń drogę</button></div>`;
      $('#prt').onchange = e => { snap(); r.t = e.target.value; delete r.w; B.roads(); this.props(); };
      $('#prw').onchange = e => { snap(); r.w = Math.max(1, +e.target.value || 0); B.roads(); };
      $('#prn').onchange = e => { snap(); r.name = e.target.value.trim(); if (!r.name) delete r.name; };
      $('#brev').onclick = () => { snap(); r.pts.reverse(); };
      $('#bdel').onclick = () => { snap(); Tool.remove(s); };
    } else if (s.area) {
      const a = s.area;
      el.innerHTML = `<h3>🌊 Teren</h3><div class="f"><label>Rodzaj</label><select id="pat">${Object.entries(MapDefs.AREA).map(([k, v]) => `<option value="${k}" ${k === a.t ? 'selected' : ''}>${v.n}</option>`).join('')}</select></div><div class="f"><label>Punkty</label><span>${a.pts.length}</span></div>
        <div class="btns"><button id="bup">⬆ Na wierzch</button><button class="del" id="bdel">🗑 Usuń teren</button></div>`;
      $('#pat').onchange = e => { snap(); a.t = e.target.value; B.areas(); };
      $('#bup').onclick = () => { snap(); E.map.areas.splice(E.map.areas.indexOf(a), 1); E.map.areas.push(a); B.areas(); };
      $('#bdel').onclick = () => { snap(); Tool.remove(s); };
    }
  },
};

/* ---------------- paleta modeli ---------------- */
const Pal = {
  init() {
    const groups = [...new Set(E.cat.map(e => e.g))];
    $('#grp').innerHTML = `<option value="">Wszystkie grupy (${E.cat.length})</option>` + groups.map(g => `<option>${esc(g)}</option>`).join('');
    $('#grp').onchange = () => this.fill(); $('#q').oninput = () => { clearTimeout(this._t); this._t = setTimeout(() => this.fill(), 150); };
    this.io = new IntersectionObserver(es => es.forEach(x => { if (!x.isIntersecting) return; this.io.unobserve(x.target); const e = E.byId[x.target.dataset.id]; if (e && !e.thumb) Thumbs.want(e, x.target.querySelector('.th')); }), { root: $('#pal'), rootMargin: '200px' });
    this.fill();
  },
  fill() {
    const g = $('#grp').value, q = $('#q').value.trim().toLowerCase(), pal = $('#pal');
    const list = E.cat.filter(e => (!g || e.g === g) && (!q || (e.name + ' ' + e.id + ' ' + e.g).toLowerCase().includes(q)));
    pal.innerHTML = list.map(e => `<div class="it ${E.cur === e ? 'on' : ''}" data-id="${esc(e.id)}" title="${esc(e.name)} — ${esc(e.g)}"><div class="th" ${e.thumb ? `style="background-image:url('models/${e.thumb}')"` : ''}>${e.thumb ? '' : '⏳'}</div><div class="nm">${e.enter ? '🚪 ' : ''}${esc(e.name)}</div></div>`).join('') || '<p style="grid-column:1/-1;color:var(--mut)">Nic nie znaleziono.</p>';
    pal.querySelectorAll('.it').forEach(el => { el.onclick = () => { E.cur = E.byId[el.dataset.id]; if (E.tool !== 'place') Tool.set('place'); else { UI.toolopt(); Tool.ghost(); } this.mark(); }; this.io.observe(el); });
  },
  mark() { document.querySelectorAll('#pal .it').forEach(el => el.classList.toggle('on', E.cur && el.dataset.id === E.cur.id)); UI.toolopt(); Tool.ghost(); },
};

/* ---------------- plik, zapis, gra ---------------- */
const IO = {
  set(m) {
    m.roads = m.roads || []; m.areas = m.areas || []; m.objs = m.objs || []; m.venues = m.venues || {}; m.W = m.W || 760; m.D = m.D || 580; m.v = 1;
    E.map = m; E.hist = []; E.fut = []; Sel.set(null); $('#mw').value = m.W; $('#md').value = m.D; B.all(); UI.toolopt();
    E.view.cx = 0; E.view.cz = 0; E.view.zoom = Math.min(V.w / (m.W + 60), V.h / (m.D + 60));
  },
  save(quiet) {
    try { localStorage.setItem(MapDefs.KEY, clean(E.map)); E.dirty = false; UI.status(); if (!quiet) UI.toast('Zapisano mapę'); return true; }
    catch (e) { UI.toast('Nie udało się zapisać (za duża mapa?) — użyj Eksportu'); return false; }
  },
  exportFile() { const b = new Blob([clean(E.map)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mapa-speedway.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
  importFile(f) { const r = new FileReader(); r.onload = () => { try { const m = JSON.parse(r.result); if (!m.roads && !m.objs) throw 0; IO.set(m); E.dirty = true; UI.status(); UI.toast('Wczytano mapę z pliku'); } catch (e) { UI.toast('To nie jest plik mapy'); } }; r.readAsText(f); },
  test() {
    if (!this.save(true)) return; localStorage.setItem(MapDefs.USE, '1'); $('#use').checked = true;
    // otwarta gra odpowiada na „ping” i sama przebudowuje miasto
    let pong = false; const h = ev => { if (ev.key === 'se3d_pong') pong = true; }; addEventListener('storage', h);
    localStorage.setItem('se3d_ping', String(Date.now()));
    setTimeout(() => { removeEventListener('storage', h); if (pong) UI.toast('Gra jest otwarta — miasto przebudowuje się z nowej mapy'); else { window.open('index.html', 'se3d_game'); UI.toast('Otwieram grę… wejdź do miasta, żeby zobaczyć mapę'); } }, 1600);
  },
};

/* ---------------- start ---------------- */
async function start() {
  V.init(); await Thumbs.open();
  try { E.cat = await (await fetch('models/cat/catalog.json', { cache: 'no-cache' })).json(); } catch (e) { $('#load').textContent = 'Brak katalogu models/cat/catalog.json — uruchom edytor przez serwer gry.'; return; }
  E.cat.forEach(e => { E.byId[e.id] = e; }); E.lampId = (E.cat.find(e => e.id === 'sk:lampSov_01') || E.cat.find(e => e.g === 'Latarnie i światło') || {}).id;
  Pal.init();
  IO.set(MapDefs.load() || MapDefs.template()); E.dirty = false;
  $('#use').checked = localStorage.getItem(MapDefs.USE) === '1';
  $('#use').onchange = e => { localStorage.setItem(MapDefs.USE, e.target.checked ? '1' : '0'); UI.toast(e.target.checked ? 'Gra użyje tej mapy (po zapisie)' : 'Gra wraca do domyślnego miasta'); };
  $('#load').remove(); Tool.set('select');

  const cv = V.r.domElement;
  cv.addEventListener('mousedown', e => Tool.down(e)); addEventListener('mousemove', e => { if (e.target === cv || Tool.drag || Tool.pan) Tool.move(e); }); addEventListener('mouseup', e => Tool.up(e));
  cv.addEventListener('contextmenu', e => e.preventDefault()); cv.addEventListener('mouseleave', () => { if (Tool.gh) Tool.gh.visible = false; });
  cv.addEventListener('dblclick', e => e.preventDefault());
  cv.addEventListener('wheel', e => {
    e.preventDefault(); const p = V.ground(e), f = Math.exp(-e.deltaY * 0.0015), z0 = E.view.zoom; E.view.zoom = Math.max(0.15, Math.min(60, z0 * f));
    if (p && !E.view.d3) { const k = 1 - z0 / E.view.zoom; E.view.cx += (p.x - E.view.cx) * k; E.view.cz += (p.z - E.view.cz) * k; }
  }, { passive: false });
  addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { if (e.key === 'Escape') document.activeElement.blur(); return; }
    const k = e.key.toLowerCase();
    if (e.code === 'Space') { Tool.space = true; e.preventDefault(); return; }
    if (e.ctrlKey && k === 'z') { e.preventDefault(); undo(false); return; }
    if (e.ctrlKey && k === 'y') { e.preventDefault(); undo(true); return; }
    if (e.ctrlKey && k === 's') { e.preventDefault(); IO.save(); return; }
    if (e.ctrlKey && k === 'd') { e.preventDefault(); Tool.dup(); return; }
    if (k === 'escape') { if (E.draw) Tool.cancel(); else if (E.tool !== 'select') Tool.set('select'); else Sel.set(null); return; }
    if (k === 'enter') { Tool.finish(); return; }
    if (k === 'backspace' && E.draw) { E.draw.pts.pop(); if (!E.draw.pts.length) E.draw = null; Tool.preview(); B.roads(); return; }
    if ((k === 'delete' || k === 'backspace') && E.sel) { snap(); Tool.remove(E.sel); return; }
    if (k === 'r') Tool.rotate((e.shiftKey ? 90 : 15) * DEG); if (k === 'q') Tool.rotate(-(e.shiftKey ? 90 : 15) * DEG);
    if (k === '[') Tool.scaleBy(1 / 1.1); if (k === ']') Tool.scaleBy(1.1);
    if (k === 'v') toggle3d();
    const T = { s: 'select', p: 'place', d: 'road', a: 'area', l: 'venue', x: 'erase' }; if (!e.ctrlKey && T[k]) Tool.set(T[k]);
  });
  addEventListener('keyup', e => { if (e.code === 'Space') Tool.space = false; });
  document.querySelectorAll('#tools button').forEach(b => b.onclick = () => Tool.set(b.dataset.t));
  const toggle3d = () => { E.view.d3 = !E.view.d3; $('#b3d').classList.toggle('on', E.view.d3); UI.hint(); };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    ({
      new: () => { if (confirm('Zacząć pustą mapę? (niezapisane zmiany przepadną)')) { IO.set({ W: E.map.W, D: E.map.D }); E.dirty = true; } },
      template: () => { if (confirm('Wczytać układ miasta z gry (ulice, rzeka, park, lokale)? Obecna mapa zostanie zastąpiona.')) { IO.set(MapDefs.template()); E.dirty = true; UI.status(); } },
      import: () => $('#file').click(), export: () => IO.exportFile(), save: () => IO.save(), test: () => IO.test(),
      undo: () => undo(false), redo: () => undo(true), view3d: toggle3d,
      help: () => { const h = $('#help'); h.style.display = h.style.display === 'flex' ? 'none' : 'flex'; },
    }[a.dataset.a] || (() => { }))();
  });
  $('#file').onchange = e => { if (e.target.files[0]) IO.importFile(e.target.files[0]); e.target.value = ''; };
  ['#mw', '#md'].forEach(q => $(q).onchange = () => { snap(); E.map.W = Math.max(200, +$('#mw').value || 760); E.map.D = Math.max(200, +$('#md').value || 580); B.base(); });
  addEventListener('beforeunload', e => { if (E.dirty) { e.preventDefault(); e.returnValue = ''; } });
}
start();
