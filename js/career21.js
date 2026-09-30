/* =========================================================
   Speedway Empire 3D — v2.8: REGUŁY RUCHU i OSIEDLE „SŁONECZNE”
   • pieszy (gracz) chodzi tylko po chodnikach — na jezdnię wejdzie
     wyłącznie po pasach; auta jeżdżą tylko po jezdni (jak dotąd)
   • przejścia dla pieszych (zebry) przy skrzyżowaniach i w środku
     długich ulic, znaki D-6, linie zatrzymania
   • sygnalizacja świetlna na skrzyżowaniach głównych ulic: auta
     stają na czerwonym, przepuszczają pieszego na pasach;
     przejście na czerwonym przy policji = mandat
   • nowa dzielnica willowa na południu (ul. Słoneczna, Ogrodników,
     Różana, Klonowa): domy z ogrodami, płoty, podjazdy, baseny,
     domy na sprzedaż (kupno w zakładce „Rejon”)
   Wydajność: pasy, znaki i płoty to instancje (kilka wywołań
   rysowania), wille scalone w jedną siatkę na materiał + LOD
   (z daleka proste bryły).
   ========================================================= */
'use strict';

// dzielnica willowa: nowe ulice domyślnej mapy (współrzędne mapy 1000 × 600, jak w Miasto.ROADS).
// Wierzchołek [785, 470] leży na al. Mistrzów Świata (ten sam odcinek), żeby powstało skrzyżowanie.
(() => {
  const av = Miasto.ROADS.find(r => r[2] === 'al. Mistrzów Świata');
  if (av && !av[0].some(p => p[0] === 785)) av[0].splice(av[0].length - 1, 0, [785, 470]);
  Miasto.ROADS.push(
    [[[785, 470], [785, 690], [785, 770]], 7, 'ul. Słoneczna'],
    [[[560, 690], [785, 690], [930, 690]], 7, 'ul. Ogrodników'],
    [[[560, 690], [560, 770], [785, 770], [930, 770], [930, 690]], 6, 'ul. Klonowa'],
  );
})();

const Ruch = {
  CYCLE: 27, // s: oś 0 zielone 0–10, żółte 10–12,5; oś 1 zielone 13,5–23,5, żółte 23,5–26
  g: null, time: 0,

  /** Graf skrzyżowań z końców odcinków dróg */
  graph() {
    const M = Miasto, segs = M.segs(); if (Ruch._gs === segs && Ruch.g) return Ruch.g;
    const nodes = [], at = p => { let n = nodes.find(q => Math.hypot(q.x - p.x, q.z - p.z) < 3); if (!n) nodes.push(n = { x: p.x, z: p.z, ends: [] }); return n; };
    segs.forEach((s, si) => { if (s.dummy || s.len < 1) return; at(s.a).ends.push({ si, end: 0 }); at(s.b).ends.push({ si, end: 1 }); });
    const cross = [], nodeOf = {};
    nodes.forEach((n, ni) => {
      n.r = Math.max(...n.ends.map(e => segs[e.si].wd / 2));
      const d0 = Ruch.dirFrom(segs[n.ends[0].si], n.ends[0].end);
      n.ends.forEach(e => { const d = Ruch.dirFrom(segs[e.si], e.end); e.axis = Math.abs(d.x * d0.x + d.z * d0.z) > 0.7 ? 0 : 1; nodeOf[e.si + ':' + e.end] = n; });
      n.junction = n.ends.length >= 3;
      n.sig = n.junction && n.ends.some(e => e.axis === 1) && n.ends.some(e => segs[e.si].wd >= 8); // światła tylko na głównych ulicach
      n.off = (ni * 7.3) % Ruch.CYCLE;
      if (!n.junction) return;
      n.ends.forEach(e => {
        const s = segs[e.si], d = n.r + 3.2; if (s.len < d * 2 + 4) return;
        e.stop = d + 2.9; // linia zatrzymania: za pasami, patrząc od skrzyżowania
        cross.push({ si: e.si, t: e.end ? s.len - d : d, node: n, axis: e.axis, end: e.end });
      });
    });
    // przejścia w środku długich ulic
    segs.forEach((s, si) => { if (s.dummy || s.len < 130) return; const t = s.len / 2; if (!cross.some(c => c.si === si && Math.abs(c.t - t) < 30)) cross.push({ si, t, node: null }); });
    Ruch._gs = segs; Ruch.g = { nodes, cross, nodeOf };
    return Ruch.g;
  },
  dirFrom(s, end) { const k = end ? -1 : 1; return { x: (s.b.x - s.a.x) / s.len * k, z: (s.b.z - s.a.z) / s.len * k }; },
  /** Stan świateł dla osi: 'g' | 'a' | 'r' */
  state(n, axis) {
    const t = (Ruch.time + n.off) % Ruch.CYCLE;
    if (axis === 0) return t < 10 ? 'g' : t < 12.5 ? 'a' : 'r';
    return t >= 13.5 && t < 23.5 ? 'g' : t >= 23.5 && t < 26 ? 'a' : 'r';
  },
  /** Położenie punktu względem odcinka: t wzdłuż, lat w poprzek (+ po lewej od kierunku a→b) */
  local(s, x, z) { const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, rx = x - s.a.x, rz = z - s.a.z; return { t: rx * dx + rz * dz, lat: -rx * dz + rz * dx }; },
  /** Jak głęboko punkt wchodzi na jezdnię (m); ≤ 0 — poza jezdnią */
  depth(x, z) {
    let best = -1e9;
    Miasto.segs().forEach(s => { if (s.dummy) return; const L = Ruch.local(s, x, z), t = R.clamp(L.t, 0, s.len), d = Math.hypot(L.t - t, L.lat); best = Math.max(best, s.wd / 2 - d); });
    return best;
  },
  /** Przejście, na którym stoi punkt (albo null) */
  crossingAt(x, z) {
    const g = Ruch.g; if (!g) return null; const segs = Miasto.segs();
    return g.cross.find(c => { const s = segs[c.si], L = Ruch.local(s, x, z); return Math.abs(L.t - c.t) <= 2.3 && Math.abs(L.lat) <= s.wd / 2 + 0.6; }) || null;
  },
  blocked(x, z) { return Ruch.depth(x, z) > 0.05 && !Ruch.crossingAt(x, z); },

  /* ---------- budowa: pasy, linie, znaki, sygnalizatory ---------- */
  build(G) {
    Ruch.g = null; const g = Ruch.graph(), segs = Miasto.segs();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
    const flat = new THREE.PlaneGeometry(1, 1); flat.rotateX(-Math.PI / 2);
    const D = new THREE.Object3D(), mats = [];
    const put = (x, y, z, yaw, sx, sy, sz) => { D.position.set(x, y, z); D.rotation.set(0, yaw, 0); D.scale.set(sx, sy, sz); D.updateMatrix(); mats.push(D.matrix.clone()); };
    const at = (s, t, lat) => { const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len; return { x: s.a.x + dx * t - dz * lat, z: s.a.z + dz * t + dx * lat, yaw: Math.atan2(dx, dz) }; };
    // zebry: pasy 0,5 m co 1 m w poprzek jezdni, 4 m wzdłuż
    g.cross.forEach(c => { const s = segs[c.si], n = Math.floor(s.wd); for (let k = 0; k < n; k++) { const p = at(s, c.t, -s.wd / 2 + (k + 0.5) * s.wd / n); put(p.x, 0.068, p.z, p.yaw, 0.5, 1, 4); } });
    // linie zatrzymania na pasie dojazdowym (tylko przy światłach)
    g.nodes.forEach(n => { if (!n.sig) return; n.ends.forEach(e => { if (e.stop == null) return; const s = segs[e.si], t = e.end ? s.len - e.stop : e.stop, sd = e.end ? 1 : -1, p = at(s, t, sd * s.wd / 4); put(p.x, 0.068, p.z, p.yaw, s.wd / 2 - 0.3, 1, 0.4); }); });
    const im = new THREE.InstancedMesh(flat, white, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); im.receiveShadow = true; im.frustumCulled = false; G.add(im);
    // słupki (znaki + sygnalizatory) i tablice D-6
    const poles = [], signs = [], heads = [], lamps = [];
    const signTex = World.canvasTex(128, 128, c => { c.fillStyle = '#1f5fbf'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(64, 14); c.lineTo(118, 112); c.lineTo(10, 112); c.closePath(); c.fill(); c.fillStyle = '#111'; c.fillRect(38, 96, 52, 6); for (let i = 0; i < 4; i++) c.fillRect(42 + i * 12, 88, 6, 8); c.beginPath(); c.arc(66, 44, 7, 0, 7); c.fill(); c.fillRect(61, 52, 9, 24); c.fillRect(54, 74, 6, 14); c.fillRect(71, 74, 6, 14); });
    g.cross.forEach(c => { if (c.node && c.node.sig) return; const s = segs[c.si]; [-1, 1].forEach(sd => { const p = at(s, c.t - sd * 3, sd * (s.wd / 2 + 0.7)); poles.push([p.x, p.z, 2.6]); signs.push([p.x, p.z, p.yaw + (sd > 0 ? Math.PI : 0)]); }); }); // przodem do nadjeżdżających
    g.nodes.forEach(n => { if (!n.sig) return; n.ends.forEach(e => {
      if (e.stop == null) return; const s = segs[e.si], t = e.end ? s.len - e.stop : e.stop, sd = e.end ? 1 : -1, p = at(s, t, sd * (s.wd / 2 + 0.8)), face = p.yaw + (e.end ? Math.PI : 0); // przodem do nadjeżdżających
      poles.push([p.x, p.z, 3.3]); heads.push([p.x, p.z, face]);
      ['r', 'a', 'g'].forEach((col, k) => lamps.push({ x: p.x, z: p.z, y: 3.25 - k * 0.27, face, n, axis: e.axis, col }));
    }); });
    const steel = new THREE.MeshStandardMaterial({ color: 0x6e7278, metalness: 0.6, roughness: 0.45 });
    const inst = (geo, mat, list, f) => { if (!list.length) return null; const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, i) => { f(it); D.updateMatrix(); m.setMatrixAt(i, D.matrix); }); m.castShadow = true; m.frustumCulled = false; G.add(m); return m; };
    const pole = new THREE.CylinderGeometry(0.05, 0.06, 1, 6); pole.translate(0, 0.5, 0);
    inst(pole, steel, poles, ([x, z, h]) => { D.position.set(x, 0, z); D.rotation.set(0, 0, 0); D.scale.set(1, h, 1); });
    inst(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: signTex, side: THREE.DoubleSide, roughness: 0.5 }), signs, ([x, z, yaw]) => { D.position.set(x, 2.3, z); D.rotation.set(0, yaw, 0); D.scale.set(1, 1, 1); });
    inst(new THREE.BoxGeometry(0.3, 0.9, 0.22), new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 }), heads, ([x, z, yaw]) => { D.position.set(x, 2.98, z); D.rotation.set(0, yaw, 0); D.scale.set(1, 1, 1); });
    Ruch.lamps = lamps;
    Ruch.lampMesh = lamps.length ? inst(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), lamps, o => { D.position.set(o.x, o.y, o.z); D.rotation.set(0, o.face, 0); D.translateZ(0.12); D.scale.set(1, 1, 1); }) : null;
    if (Ruch.lampMesh) { Ruch.lampMesh.castShadow = false; Ruch.lampMesh.userData.noChunk = true; } // kolory zmieniane w grze — nie dzielić (perf.js)
    Ruch._lampKey = ''; Ruch.paint();
  },
  COL: { r: [new THREE.Color(0x3a0c08), new THREE.Color(1.6, 0.12, 0.06)], a: [new THREE.Color(0x3a2a06), new THREE.Color(1.6, 0.95, 0.1)], g: [new THREE.Color(0x0a2a12), new THREE.Color(0.2, 1.6, 0.45)] },
  /** Kolory lamp — tylko gdy zmieni się faza */
  paint() {
    const L = Ruch.lamps, m = Ruch.lampMesh; if (!L || !m) return;
    const key = Ruch.g.nodes.filter(n => n.sig).map(n => Ruch.state(n, 0) + Ruch.state(n, 1)).join(''); if (key === Ruch._lampKey) return; Ruch._lampKey = key;
    L.forEach((o, i) => m.setColorAt(i, Ruch.COL[o.col][Ruch.state(o.n, o.axis) === o.col ? 1 : 0]));
    m.instanceColor.needsUpdate = true;
  },

  /* ---------- ruch: auta stają na czerwonym i przed pieszym na pasach ---------- */
  before() {
    const M = Miasto, g = Ruch.g; if (!g || !M.traffic) return;
    const segs = M.segs(), px = Walk.x - M.CX, pz = Walk.z, onX = Ruch.crossingAt(px, pz);
    M.traffic.forEach(c => {
      if (c.crash > 0) return;
      const s = segs[c.seg]; if (!s) return;
      const rem = c.dir > 0 ? s.len - c.t : c.t, hl = c.hl || 2.3; let d = 1e9;
      const n = g.nodeOf[c.seg + ':' + (c.dir > 0 ? 1 : 0)], e = n && n.sig && n.ends.find(q => q.si === c.seg && q.end === (c.dir > 0 ? 1 : 0));
      if (e && e.stop != null) { const st = Ruch.state(n, e.axis), dd = rem - e.stop - hl; if (st !== 'g' && dd > -0.5 && !(st === 'a' && dd < 5)) d = Math.min(d, dd); }
      if (onX && onX.si === c.seg) { const ahead = (onX.t - c.t) * c.dir - 2.6 - hl; if (ahead > -1 && ahead < 22) d = Math.min(d, ahead); } // pieszy na pasach — ustąp
      if (d < 1e9) { c._v0 = c._v0 == null ? c.v : c._v0; c.v = Math.min(c._v0, d < 0.3 ? 0 : Math.sqrt(2 * 6 * d)); }
    });
  },
  after() { (Miasto.traffic || []).forEach(c => { if (c._v0 != null) { c.v = c._v0; c._v0 = null; } }); },

  /** Pieszy na czerwonym: mandat, jeśli policja widzi */
  pedCheck(dt) {
    Ruch._cool = Math.max(0, (Ruch._cool || 0) - dt);
    const M = Miasto, px = Walk.x - M.CX, pz = Walk.z, c = Ruch.crossingAt(px, pz);
    if (!c || !c.node || !c.node.sig) { Ruch._on = null; return; }
    if (Ruch._on === c) return; Ruch._on = c;
    if (Ruch.state(c.node, c.axis) === 'r') return; // auta na tej ulicy mają czerwone — pieszy zielone
    const cops = (typeof Job !== 'undefined' && Job.cops) || [], near = cops.some(o => { const p = (o.m || o).position; return Math.hypot(p.x - px, p.z - pz) < 28; }) || (M.traffic || []).some(o => o.police && Math.hypot(o.g.position.x - px, o.g.position.z - pz) < 28);
    if (!near || Ruch._cool > 0 || !(Game.s && Game.s.mode === 'career')) { UI.toast('🚦 Czerwone dla pieszych — uważaj!', true); return; }
    Ruch._cool = 30; Career.pay(-100, 'Mandat: przejście na czerwonym'); Career.C().dealHeat = Math.min(0.6, (Career.C().dealHeat || 0) + 0.01); Game.save();
    UI.toast('👮 „Na czerwonym? Sto złotych mandatu, panie kolego.”', true);
  },
};

/* =========================================================
   OSIEDLE „SŁONECZNE” — domy jednorodzinne z ogrodami
   ========================================================= */
const Wille = {
  WALLS: ['white_stucco', 'yellow_plaster', 'white_plaster_02', 'painted_plaster_wall'],
  ROOFS: ['clay_roof_tiles_02', 'grey_roof_tiles'],
  SALE: { szereg: 'Szeregowiec', dom: 'Dom z ogrodem', willa: 'Willa z basenem' },
  plots: [],
  /** Działki wzdłuż ulic dzielnicy (po obu stronach), z pominięciem kolizji i skrzyżowań */
  make(G) {
    const M = Miasto, segs = M.segs(), names = ['ul. Słoneczna', 'ul. Ogrodników', 'ul. Klonowa'];
    let rs = 11; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const hit = (x0, x1, z0, z1) => M.col.some(c => c.x1 > x0 && c.x0 < x1 && c.z1 > z0 && c.z0 < z1);
    const segD = (o, x, z) => { const L = Ruch.local(o, x, z), t = R.clamp(L.t, 0, o.len); return Math.hypot(L.t - t, L.lat); };
    const plots = [];
    segs.forEach((s, si) => {
      if (!names.includes(s.name)) return;
      const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, nx = -dz, nz = dx, W = 24, Dp = 24;
      for (let t = 14; t + W / 2 < s.len - 10; t += W + 2) [-1, 1].forEach(sd => {
        const edge = s.wd / 2 + 3.4, cx = s.a.x + dx * t + nx * sd * (edge + Dp / 2), cz = s.a.z + dz * t + nz * sd * (edge + Dp / 2);
        const hx = Math.abs(dx) * W / 2 + Math.abs(nx) * Dp / 2, hz = Math.abs(dz) * W / 2 + Math.abs(nz) * Dp / 2;
        if (Math.abs(cz) + hz > 396 || Math.abs(cx) + hx > M.W / 2 - 4) return;
        if (segs.some(o => o !== s && !o.dummy && segD(o, cx, cz) < o.wd / 2 + 3.4 + Math.max(hx, hz))) return; // nie na innej ulicy
        if (hit(cx - hx, cx + hx, cz - hz, cz + hz) || plots.some(p => Math.abs(p.x - cx) < p.hx + hx && Math.abs(p.z - cz) < p.hz + hz)) return;
        plots.push({ x: cx, z: cz, hx, hz, fx: -nx * sd, fz: -nz * sd, W, Dp, s: si, big: rnd() < 0.3, r: rnd() });
      });
    });
    // domy na sprzedaż: trzy działki najbliżej wjazdu z alei
    const gate = M.segs().find(s => s.name === 'ul. Słoneczna'); const sale = gate ? plots.filter(p => p.z > 300).sort((a, b) => Math.hypot(a.x - gate.a.x, a.z - gate.a.z) - Math.hypot(b.x - gate.a.x, b.z - gate.a.z)) : [];
    ['szereg', 'dom', 'willa'].forEach((k, i) => { if (sale[i]) { sale[i].sale = k; sale[i].big = k === 'willa'; } });
    Wille.plots = plots;
    if (!plots.length) return;
    // szczegółowo: budynki (scalane), płoty, żywopłoty, podjazdy, baseny
    const hi = new THREE.Group(), lo = new THREE.Group(), D = new THREE.Object3D(); // hi/lo jeszcze bez rodzica: okna i scalanie liczone w układzie dzielnicy
    const winPrev = World._win || []; World._win = [];
    const fence = [], hedge = [], drive = [], pool = [], cars = {}, trees = [], lowBox = [];
    plots.forEach(p => {
      const yaw = Math.atan2(p.fx, p.fz), rx = p.fz, rz = -p.fx; // prawo działki (patrząc od ulicy)
      const hw = p.big ? 13 : 9.5 + p.r * 2, hd = p.big ? 11 : 8 + p.r * 1.5, hh = p.big ? 7.2 : 6.2, set = p.Dp / 2 - 8 - hd / 2; // front domu 8 m za płotem
      const hx = p.x + p.fx * set, hz = p.z + p.fz * set, rot = Math.atan2(-p.fz, p.fx); // ściana „+x” budynku w stronę ulicy
      World.realBuilding({ x: hx, z: hz, w: hd, d: hw, h: hh, wall: Wille.WALLS[Math.floor(p.r * 4)], roof: 'gable', roofTex: Wille.ROOFS[p.r < 0.5 ? 0 : 1], rot, floorH: 2.9, lit: 0.35, face: '+x', skip: [[-1, 1]], parent: hi });
      lowBox.push([hx, hz, rot, hd, hh, hw]);
      M.col.push({ x0: hx - (Math.abs(p.fx) * hd + Math.abs(rx) * hw) / 2, x1: hx + (Math.abs(p.fx) * hd + Math.abs(rx) * hw) / 2, z0: hz - (Math.abs(p.fz) * hd + Math.abs(rz) * hw) / 2, z1: hz + (Math.abs(p.fz) * hd + Math.abs(rz) * hw) / 2 });
      // płot od ulicy z bramą (przerwa 4 m na podjazd przy prawym boku), żywopłot po bokach i z tyłu
      const fx0 = p.x + p.fx * p.Dp / 2, fz0 = p.z + p.fz * p.Dp / 2, gateOff = p.W / 2 - 3;
      [[-p.W / 2, gateOff - 2.2], [gateOff + 2.2, p.W / 2]].forEach(([a, b]) => { const m = (a + b) / 2, L = b - a; fence.push([fx0 + rx * m, fz0 + rz * m, yaw, L]); const cx = fx0 + rx * m, cz = fz0 + rz * m, ex = Math.abs(rx) * L / 2 + 0.1, ez = Math.abs(rz) * L / 2 + 0.1; M.col.push({ x0: cx - ex, x1: cx + ex, z0: cz - ez, z1: cz + ez }); });
      [-1, 1].forEach(sd => { const cx = p.x + rx * sd * p.W / 2, cz = p.z + rz * sd * p.W / 2; hedge.push([cx, cz, yaw + Math.PI / 2, p.Dp - 0.6]); const ex = Math.abs(p.fx) * p.Dp / 2 + 0.4, ez = Math.abs(p.fz) * p.Dp / 2 + 0.4; M.col.push({ x0: cx - ex, x1: cx + ex, z0: cz - ez, z1: cz + ez }); });
      hedge.push([p.x - p.fx * p.Dp / 2, p.z - p.fz * p.Dp / 2, yaw, p.W]);
      // podjazd od bramy do domu i auto
      const dL = 9, dcx = p.x + rx * gateOff + p.fx * (p.Dp / 2 - dL / 2), dcz = p.z + rz * gateOff + p.fz * (p.Dp / 2 - dL / 2);
      drive.push([dcx, dcz, yaw, 3.6, dL]);
      const ck = Crowd.pick(['carSedan', 'carSuv', 'carGT', 'estate', 'saloon', 'carCoupe2'].filter(k => Furn.cache[k]).concat([null]));
      if (ck && !p.sale) (cars[ck] = cars[ck] || []).push({ x: dcx + p.fx * 1.5, z: dcz + p.fz * 1.5, r: yaw, s: M.scaleFor(ck, { w: M.LEN[ck] || 4.6 }) });
      if (p.big) pool.push([hx - p.fx * (hd / 2 + 2.6), hz - p.fz * (hd / 2 + 2.6), yaw]);
      for (let i = 0; i < 2; i++) trees.push({ x: p.x - rx * (p.W / 2 - 3) - p.fx * (4 + i * 8), z: p.z - rz * (p.W / 2 - 3) - p.fz * (4 + i * 8), rot: i + p.r, h: 7 + p.r * 4 });
    });
    const inst = (geo, mat, list, f, shadow = true) => { if (!list.length) return; const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, i) => { f(it); D.updateMatrix(); m.setMatrixAt(i, D.matrix); }); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; hi.add(m); };
    const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
    inst(unit, new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 }), fence, ([x, z, yaw, L]) => { D.position.set(x, 0, z); D.rotation.set(0, yaw + Math.PI / 2, 0); D.scale.set(0.1, 1.25, L); });
    inst(unit, new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 1 }), hedge, ([x, z, yaw, L]) => { D.position.set(x, 0, z); D.rotation.set(0, yaw + Math.PI / 2, 0); D.scale.set(0.8, 1.6, L); });
    const flat = new THREE.PlaneGeometry(1, 1); flat.rotateX(-Math.PI / 2);
    inst(flat, new THREE.MeshStandardMaterial({ color: 0x7c7870, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }), drive, ([x, z, yaw, w, L]) => { D.position.set(x, 0.045, z); D.rotation.set(0, yaw, 0); D.scale.set(w, 1, L); }, false);
    inst(flat, new THREE.MeshStandardMaterial({ color: 0x3fa7d6, roughness: 0.1, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1 }), pool, ([x, z, yaw]) => { D.position.set(x, 0.06, z); D.rotation.set(0, yaw, 0); D.scale.set(8, 1, 4); }, false);
    inst(unit, new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.8 }), pool, ([x, z, yaw]) => { D.position.set(x, 0, z); D.rotation.set(0, yaw, 0); D.scale.set(8.8, 0.08, 4.8); }, false);
    // budynki: jedna siatka na materiał, okna hurtem (instancje)
    World.mergeBuildings(hi);
    const mb = World.mergeBuildings; World.mergeBuildings = () => {}; // flushWindows scala też całą scenę — tu tylko nasze okna
    try { World.flushWindows(); } finally { World.mergeBuildings = mb; World._win = winPrev; }
    hi.traverse(o => { if (o.isInstancedMesh) o.frustumCulled = false; }); // okna mają sferę jednego okna — perf.js da im sfery kwadratów
    // z daleka: proste bryły domów (jedna instancja na dom)
    const lowG = new THREE.BoxGeometry(1, 1, 1); lowG.translate(0, 0.5, 0);
    const lm = new THREE.InstancedMesh(lowG, new THREE.MeshStandardMaterial({ color: 0xd9d2c3, roughness: 0.9 }), lowBox.length);
    lowBox.forEach(([x, z, rot, w, h, d], i) => { D.position.set(x, 0, z); D.rotation.set(0, rot, 0); D.scale.set(w, h + Math.min(w, d) * 0.3, d); D.updateMatrix(); lm.setMatrixAt(i, D.matrix); });
    lm.frustumCulled = false; lo.add(lm);
    // LOD całej dzielnicy: środek w centrum działek
    const cx = plots.reduce((a, p) => a + p.x, 0) / plots.length, cz = plots.reduce((a, p) => a + p.z, 0) / plots.length;
    const lod = new THREE.LOD(); lod.position.set(cx, 0, cz); [hi, lo].forEach(o => o.position.set(-cx, 0, -cz));
    lod.addLevel(hi, 0); lod.addLevel(lo, 260); G.add(lod); Wille.lod = lod;
    Object.entries(cars).forEach(([k, l]) => M.instances(G, k, l));
    World.treeBillboards('small', trees, G);
    // tabliczki „NA SPRZEDAŻ” i wejście do kupionego domu
    Wille.signs = [];
    plots.filter(p => p.sale).forEach(p => {
      const tex = World.canvasTex(256, 128, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#c0392b'; c.fillRect(0, 0, 256, 34); c.fillStyle = '#fff'; c.font = 'bold 26px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('NA SPRZEDAŻ', 128, 26); c.fillStyle = '#222'; c.font = '600 24px Barlow, sans-serif'; c.fillText(Wille.SALE[p.sale], 128, 72); c.font = '20px Barlow, sans-serif'; c.fillText('tel. 600 100 200', 128, 108); });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide })), rx = p.fz, rz = -p.fx;
      b.position.set(p.x + p.fx * (p.Dp / 2 - 0.4) - rx * 4, 1.7, p.z + p.fz * (p.Dp / 2 - 0.4) - rz * 4); b.rotation.y = Math.atan2(p.fx, p.fz); G.add(b); Wille.signs.push({ b, k: p.sale });
      const spot = { id: 'w:villa:' + p.sale, x: p.x + p.fx * (p.Dp / 2 + 1.2) + rx * (p.W / 2 - 3), z: p.z + p.fz * (p.Dp / 2 + 1.2) + rz * (p.W / 2 - 3), label: `🏡 ${Wille.SALE[p.sale]} — obejrzyj`, r: 2.4 };
      (M.spotsBase || []).push(spot);
    });
    Wille.refresh();
  },
  /** Tabliczki i opisy wejść zależnie od tego, co masz */
  refresh() {
    const J = Rejon.on() ? Rejon.S() : null, own = J && J.house;
    (Wille.signs || []).forEach(s => { s.b.visible = own !== s.k; });
    (Miasto.spotsBase || []).forEach(sp => { if (!sp.id.startsWith('w:villa:')) return; const k = sp.id.slice(8); sp.label = own === k ? `🏡 ${Wille.SALE[k]} — twój dom, wejdź` : `🏡 ${Wille.SALE[k]} — na sprzedaż (obejrzyj)`; });
  },
  act(k) {
    const J = Rejon.S(), H = Rejon.HOUSES.find(h => h.id === k); if (!H) return;
    if (J.house === k) { Career.roomAct('w:in:dom'); return; } // wnętrze: twoje mieszkanie (urządzasz je w zakładce Dom)
    UI.modal(`<div class="row between"><span class="kicker">Osiedle „Słoneczne”</span><button class="x" data-ui="close">×</button></div><h2>${esc(H.n)}</h2><p>${esc(H.d)}</p>
      <p><b>${H.price.toLocaleString('pl-PL')} zł</b> · wygoda +${H.comfort} · masz ${Career.C().money.toLocaleString('pl-PL')} zł</p>
      <div class="actions"><button class="go" data-ui="rjBuy" data-v="${k}" ${Career.C().money < H.price ? 'disabled' : ''}>Kupuję</button><button class="ghost" data-ui="close">Może kiedyś</button></div>`);
  },
};

/* =========================================================
   PODPIĘCIE
   ========================================================= */
(() => {
  const M = Miasto;
  const bm = M.make;
  M.make = function () {
    const res = bm.apply(this, arguments);
    try {
      if (!M.CUSTOM && M.G) { Wille.make(M.G); const Rm = World.rooms.miasto; if (Rm) Rm.D = Math.max(Rm.D, 792); }
      if (M.G) Ruch.build(M.G);
    } catch (e) { console.error(e); Main.err(e); }
    return res;
  };
  const bt = M.tick;
  M.tick = function (dt) {
    if (!Ruch.g || Walk.room !== 'miasto') return bt.call(this, dt);
    Ruch.time += dt; Ruch.paint(); Ruch.before();
    try { return bt.call(this, dt); } finally { Ruch.after(); }
  };
  // pieszy tylko po chodniku (na jezdnię — po pasach)
  const bf = Walk.frame;
  Walk.frame = function (dt) {
    const on = Walk.room === 'miasto' && Ruch.g && !(typeof MapEdit !== 'undefined' && MapEdit.on), x0 = Walk.x, z0 = Walk.z;
    bf.call(this, dt);
    if (!on || (Walk.x === x0 && Walk.z === z0)) return;
    const cx = M.CX, bad = (x, z) => Ruch.blocked(x - cx, z), d0 = Ruch.depth(x0 - cx, z0);
    if (bad(Walk.x, Walk.z) && Ruch.depth(Walk.x - cx, Walk.z) > Math.max(0.05, d0)) {
      if (!bad(Walk.x, z0)) Walk.z = z0; else if (!bad(x0, Walk.z)) Walk.x = x0; else { Walk.x = x0; Walk.z = z0; }
      World.camera.position.x = Walk.x; World.camera.position.z = Walk.z;
      if (!Ruch._tip || performance.now() - Ruch._tip > 9000) { Ruch._tip = performance.now(); UI.toast('🚸 Na jezdnię tylko po pasach — przejście dla pieszych jest przy skrzyżowaniu.'); }
    }
    Ruch.pedCheck(dt);
  };
  // wille: podgląd domu na sprzedaż / wejście do kupionego
  const bra = Career.roomAct;
  Career.roomAct = function (id) { if (id.startsWith('w:villa:')) { Wille.act(id.slice(8)); return true; } return bra.call(this, id); };
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { if (key === 'miasto') Wille.refresh(); be.call(this, key); if (key === 'miasto') Wille.refresh(); };
  const bb = Rejon.buy;
  Rejon.buy = function (id) { bb.call(this, id); Wille.refresh(); };
})();
