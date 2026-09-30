/* =========================================================
   Speedway Empire 3D — MIASTO 3D (pieszo po całym mieście)
   Układ z mapy (drogi, rzeka z mostami, park, stadion), budynki
   i auta z pobranych modeli (3dassets.dev, OpenGameArt — CC0).
   Wejścia do wszystkich lokali, przystanki (szybki dojazd),
   taksówka z minimapy, przechodnie i ruch uliczny.
   ========================================================= */
'use strict';

const Miasto = {
  CX: 1300, W: 760, D: 580, MS: 0.8, SR: { x: 100, z: 68 }, // SR — półosie terenu stadionu (m), mierzone z prawdziwego stadionu
  ROADS: [ // [punkty mapy, szerokość jezdni m, nazwa]
    [[[150, 455], [345, 470], [690, 455], [880, 485]], 10, 'al. Mistrzów Świata'], [[[120, 175], [285, 205], [520, 215], [845, 265]], 10, 'ul. Stadionowa'],
    [[[285, 205], [345, 470]], 8, 'ul. Kasprzaka'], [[[520, 215], [660, 300], [690, 455]], 8, 'ul. Taśmowa'], [[[150, 455], [120, 175]], 8, 'ul. Parkowa'],
    [[[845, 265], [880, 485]], 8, 'ul. Złota'], [[[345, 470], [470, 535]], 8, 'ul. Wielkiej Płyty'], [[[62, 262], [135, 320]], 7, 'ul. Ogrodowa']],
  // lokale: model i skala
  VENUE: { dom: ['prlBlock9', { h: 28 }], silownia: ['vGym', { s: 1.3 }], restauracja: ['vRest', { s: 1.45 }], bar: ['vBar', { s: 1.35 }], park: ['vCafe', { s: 1.3 }],
    kasyno: ['vCasino', { s: 1.7 }], psycholog: ['vTower', { s: 1.25 }], klub: ['vClub', { s: 1.5 }], rodzice: ['kostka', { s: 1.6 }], osiedle: ['osiedle', {}] },
  FILL: ['cB1', 'cB2', 'cB3', 'cB4', 'cB5', 'cB6', 'cB7', 'cB8', 'cB9', 'cB10', 'cB11', 'cB12', 'cB13', 'cB14', 'cB15', 'prlSchool', 'prlClinic'],
  LEN: { bus: 15, police: 5.1, car125p: 4.25, car126p: 3.05 },
  CARS: ['car126p', 'car125p', 'car126p', 'carSedan', 'carSuv', 'carGT', 'carVan', 'carCamper', 'carRoadster', 'carCoupe2', 'carCity', 'hatch3', 'estate', 'saloon'],
  w(p) { return { x: (p[0] - 500) * Miasto.MS, z: (p[1] - 300) * Miasto.MS }; },
  riverZ(x) { const xm = x / Miasto.MS + 500; return ((330 + Math.sin(xm / 170) * 28 + (xm > 430 ? 12 : 0)) - 300) * Miasto.MS; },
  segs() {
    if (Miasto._segs) return Miasto._segs;
    const out = [];
    Miasto.ROADS.forEach(([pts, wd, name]) => { for (let i = 0; i < pts.length - 1; i++) { const a = Miasto.w(pts[i]), b = Miasto.w(pts[i + 1]); out.push({ a, b, wd, name, len: Math.hypot(b.x - a.x, b.z - a.z) }); } });
    return (Miasto._segs = out);
  },
  nearestOn(s, x, z) { const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, t = R.clamp(((x - s.a.x) * dx + (z - s.a.z) * dz) / (s.len * s.len), 0, 1); return Math.hypot(x - (s.a.x + dx * t), z - (s.a.z + dz * t)); },
  /** Najbliższy punkt na drodze */
  nearest(x, z) {
    let best = null;
    Miasto.segs().forEach(s => { const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, t = R.clamp(((x - s.a.x) * dx + (z - s.a.z) * dz) / (s.len * s.len), 0, 1), px = s.a.x + dx * t, pz = s.a.z + dz * t, d = Math.hypot(x - px, z - pz); if (!best || d < best.d) best = { x: px, z: pz, d, s, t }; });
    return best;
  },
  stadium() { const t = City.PLACES.tor; return Miasto.w([t.x, t.y]); },
  inStadium(x, z, pad = 0) { const S = Miasto.stadium(); return ((x - S.x) / (Miasto.SR.x + pad)) ** 2 + ((z - S.z) / (Miasto.SR.z + pad)) ** 2 < 1; },

  /** Wiele kopii modelu jako InstancedMesh (drzewa, latarnie, auta, budynki) */
  instances(parent, k, list) {
    const C = Furn.cache[k]; if (!C || !list.length) return;
    C.scene.updateMatrixWorld(true);
    const inner = new THREE.Matrix4().makeTranslation(-C.c.x, -C.min.y, -C.c.z), M = new THREE.Matrix4(), T = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sv = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    C.scene.traverse(o => {
      if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, list.length); im.frustumCulled = false; im.receiveShadow = true;
      list.forEach((it, i) => { V.set(it.x, it.y || 0, it.z); Q.setFromAxisAngle(UP, it.r || 0); Sv.setScalar(it.s || 1); T.compose(V, Q, Sv); M.copy(T).multiply(inner).multiply(o.matrixWorld); im.setMatrixAt(i, M); });
      im.instanceMatrix.needsUpdate = true; parent.add(im);
    });
  },
  scaleFor(k, size) { const C = Furn.cache[k]; return size.s || (size.h ? size.h / C.size.y : size.w ? size.w / Math.max(C.size.x, C.size.z) : 1); },
  /** Prostokąt kolizji (AABB) obróconego budynku */
  box(k, x, z, r, s, shrink = 0.92) { const C = Furn.cache[k], hw = C.size.x * s / 2 * shrink, hd = C.size.z * s / 2 * shrink, c = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r)), ex = hw * c + hd * sn, ez = hw * sn + hd * c; return { x0: x - ex, x1: x + ex, z0: z - ez, z1: z + ez }; },

  /** Czy obrys budynku (obrócony prostokąt) nie wchodzi na jezdnię ani chodnik */
  clear(k, x, z, r, s, pad = 3.6) {
    const C = Furn.cache[k], hw = C.size.x * s / 2, hd = C.size.z * s / 2, c = Math.cos(r), sn = Math.sin(r), pts = [];
    for (const u of [-1, -0.5, 0, 0.5, 1]) for (const v of [-1, -0.5, 0, 0.5, 1]) { const lx = u * hw, lz = v * hd; pts.push([x + lx * c + lz * sn, z - lx * sn + lz * c]); }
    return !Miasto.segs().some(sg => pts.some(([px, pz]) => Miasto.nearestOn(sg, px, pz) < sg.wd / 2 + pad));
  },
  keys() { return [...new Set([...Object.values(Miasto.VENUE).map(v => v[0]), ...Miasto.FILL, ...Miasto.CARS, 'bus', 'police', 'busShelter', 'lampCity', 'grandstand', 'stadGate', 'benchPark', 'prlBlock9', 'prlBlock16', 'prlGarage', 'kiosk', 'trzepak', 'prlSubstation', 'swings', 'slide', 'sandpit', 'dumpster', 'lampPH', 'shrubPH', 'hydrant'].filter(k => k !== 'osiedle'))]; },
  build(cb) {
    if (!World.rooms) { UI.show('md'); World.enterVenue(Game.s.user); } // świat 3D jeszcze nie wystartował
    if (World.rooms.miasto) { cb && cb(); return; }
    if (Miasto._loading) { Miasto._cbs.push(cb); return; }
    Miasto._loading = true; Miasto._cbs = [cb];
    Furn.load(Miasto.keys(), () => { try { Miasto.make(); } catch (e) { console.error(e); Main.err(e); } Miasto._loading = false; Miasto._cbs.forEach(f => f && f()); });
  },
  make() {
    if (Miasto.CUSTOM && Miasto.makeCustom) return Miasto.makeCustom(); // miasto z edytora mapy (career19.js)
    const M = Miasto, Y = World.LOCKER_Y, G = new THREE.Group(); G.position.set(M.CX, Y, 0); World.scene.add(G); G.visible = false;
    G.userData.lights = [];
    let rs = 7; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    // niebo i światło
    const sky = new THREE.Mesh(new THREE.SphereGeometry(Math.max(M.W, M.D) * 1.1, 24, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false })); G.add(sky); // zapisuje głębię — zasłania resztę świata gry
    const hemi = new THREE.HemisphereLight(0xe4ecf8, 0x5a5048, 0.8); hemi.visible = false; G.userData.lights.push(hemi); G.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.9); sun.position.set(-120, 200, 80); sun.visible = false; G.userData.lights.push(sun); G.add(sun); G.add(sun.target);
    M.sky = sky; M.hemi = hemi; M.sun = sun;
    // teren: trawa, drogi, chodniki, rzeka
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(M.W + 400, M.D + 400), World.pbr('leafy_grass', (M.W + 400) / 8, (M.D + 400) / 8, { color: '#86a064' })); grass.rotation.x = -Math.PI / 2; G.add(grass);
    const asph = World.pbr('asphalt_02', 1, 1, { color: '#4d4d50' }), walkM = World.pbr('concrete_pavement', 1, 1, { color: '#b3ada2' });
    const strip = (a, b, off, wd, mat, y, rep) => {
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L, g = new THREE.PlaneGeometry(L + wd, wd); g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (L + wd) / rep, uv.getY(i) * wd / rep);
      const m = new THREE.Mesh(g, mat); m.position.set((a.x + b.x) / 2 + nx * off, y, (a.z + b.z) / 2 + nz * off); m.rotation.y = -Math.atan2(dz, dx); m.receiveShadow = true; G.add(m);
    };
    M.segs().forEach(s => { strip(s.a, s.b, 0, s.wd, asph, 0.05, 6); [-1, 1].forEach(sd => strip(s.a, s.b, sd * (s.wd / 2 + 1.6), 3.2, walkM, 0.04, 3)); });
    const water = new THREE.MeshStandardMaterial({ color: 0x2d5a78, roughness: 0.15, metalness: 0.2 }), col = [];
    for (let x = -M.W / 2 - 20; x < M.W / 2 + 20; x += 8) {
      const z0 = M.riverZ(x), z1 = M.riverZ(x + 8), m = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 15), water); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, 8); m.position.set(x + 4, 0.02, (z0 + z1) / 2); G.add(m);
      const n = M.nearest(x + 4, (z0 + z1) / 2); if (!n || n.d > n.s.wd / 2 + 3) col.push({ x0: x, x1: x + 8, z0: Math.min(z0, z1) - 7, z1: Math.max(z0, z1) + 7 }); // most tam, gdzie droga
    }
    // stadion: prawdziwy stadion klubu wstawiany w teren (career14.js) — tu tylko brama
    const S = M.stadium();
    const spots = [{ id: 'w:in:tor', x: S.x, z: S.z + M.SR.z + 3, label: '🏁 Brama stadionu — wejdź (park maszyn, tor)', r: 3 }];
    // lokale
    const doors = {}, blds = [];
    Object.entries(City.PLACES).forEach(([k, P]) => {
      if (k === 'tor') return;
      const p = M.w([P.x, P.y]), n = M.nearest(p.x, p.z), V = M.VENUE[k]; if (!V) return;
      let nx = p.x - n.x, nz = p.z - n.z, L = Math.hypot(nx, nz); if (L < 0.5) { const dx = n.s.b.x - n.s.a.x, dz = n.s.b.z - n.s.a.z; nx = -dz; nz = dx; L = Math.hypot(nx, nz); } nx /= L; nz /= L;
      const half = n.s.wd / 2 + 3.4, r = Math.atan2(-nx, -nz); // przód modelu (+z) w stronę ulicy
      if (k === 'osiedle') { M.buildOsiedle(G, n, nx, nz, half, spots, col, blds, doors); }
      else {
        const s = M.scaleFor(V[0], V[1]), C = Furn.cache[V[0]], depth = C.size.z * s;
        let bx = n.x + nx * (half + depth / 2 + 1.5), bz = n.z + nz * (half + depth / 2 + 1.5);
        for (let e = 0; e < 40 && !M.clear(V[0], bx, bz, r, s); e++) { bx += nx * 1.5; bz += nz * 1.5; } // nie na jezdnię
        Furn.place(G, V[0], bx, 0, bz, r, { s });
        blds.push({ x: bx, z: bz, rad: Math.max(C.size.x, C.size.z) * s / 2 + 2 }); col.push(M.box(V[0], bx, bz, r, s));
        const dx = bx - nx * (depth / 2 + 1.3), dz = bz - nz * (depth / 2 + 1.3); // przy drzwiach budynku
        doors[k] = { x: dx, z: dz, yaw: Math.atan2(nx, nz), bx, bz };
        spots.push({ id: 'w:in:' + k, x: dx, z: dz, label: `${P.icon} ${P.name} — otwórz drzwi i wejdź`, r: 2.4 });
      }
      // przystanek autobusowy obok
      const tx = -nz, tz = nx, sx = n.x + nx * (n.s.wd / 2 + 2.2) + tx * 9, sz = n.z + nz * (n.s.wd / 2 + 2.2) + tz * 9;
      Furn.place(G, 'busShelter', sx, 0, sz, Math.atan2(-nx, -nz), { w: 4 });
      spots.push({ id: 'w:bus:' + k, x: sx - nx * 1.2, z: sz - nz * 1.2, label: `🚌 Przystanek „${P.name}” — odjazdy`, r: 2.2 });
      if (k === 'rodzice') World.treeBillboards('oak', [0, 1, 2].map(i => ({ x: doors[k].bx + tx * (9 + i * 3.5) + nx * 3, z: doors[k].bz + tz * (9 + i * 3.5) + nz * 3, rot: i, h: 9 + i })), G);
    });
    // zabudowa wzdłuż ulic
    const fill = {};
    M.segs().forEach(s => {
      const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, nx = -dz, nz = dx;
      for (let t = 12; t < s.len - 8; t += 17) [-1, 1].forEach(sd => [0, 1].forEach(row => {
        const k = M.FILL[Math.floor(rnd() * (M.FILL.length - (rnd() < 0.85 ? 2 : 0)))], sc = /^prl/.test(k) ? 1 : 1.3 + rnd() * 0.4, C = Furn.cache[k], depth = C.size.z * sc, wid = C.size.x * sc;
        const off = s.wd / 2 + 3.4 + depth / 2 + 2 + row * 24, x = s.a.x + dx * t + nx * off * sd, z = s.a.z + dz * t + nz * off * sd, rad = Math.max(wid, depth) / 2;
        if (Math.abs(x) > M.W / 2 - 10 || Math.abs(z) > M.D / 2 - 10) return;
        if (M.inStadium(x, z, rad + 4) || Math.abs(z - M.riverZ(x)) < rad + 10) return;
        if (blds.some(b => Math.hypot(b.x - x, b.z - z) < b.rad + rad + 2)) return;
        const pk = M.w([City.PLACES.park.x, City.PLACES.park.y]); if (Math.hypot(x - pk.x - 10, z - pk.z) < 36) return;
        const r = Math.atan2(-nx * sd, -nz * sd); if (!M.clear(k, x, z, r, sc)) return;
        (fill[k] = fill[k] || []).push({ x, z, r, s: sc }); blds.push({ x, z, rad }); col.push(M.box(k, x, z, r, sc));
      }));
    });
    // kwartały między ulicami: zabudowa na siatce (z dala od dróg, rzeki, parku i stadionu)
    for (let gx = -M.W / 2 + 16; gx < M.W / 2 - 16; gx += 22) for (let gz = -M.D / 2 + 16; gz < M.D / 2 - 16; gz += 22) {
      const x = gx + (rnd() - 0.5) * 6, z = gz + (rnd() - 0.5) * 6, n = M.nearest(x, z); if (n.d < 18) continue;
      const k = M.FILL[Math.floor(rnd() * M.FILL.length)], sc = /^prl/.test(k) ? 1 : 1.3 + rnd() * 0.4, C = Furn.cache[k], rad = Math.max(C.size.x, C.size.z) * sc / 2;
      if (n.d < rad + 10 || M.inStadium(x, z, rad + 6) || Math.abs(z - M.riverZ(x)) < rad + 10 || blds.some(b => Math.hypot(b.x - x, b.z - z) < b.rad + rad + 3)) continue;
      const pk = M.w([City.PLACES.park.x, City.PLACES.park.y]); if (Math.hypot(x - pk.x - 10, z - pk.z) < 38) continue;
      const r = Math.atan2(n.x - x, n.z - z); if (!M.clear(k, x, z, r, sc)) continue; // przodem do najbliższej ulicy
      (fill[k] = fill[k] || []).push({ x, z, r, s: sc }); blds.push({ x, z, rad }); col.push(M.box(k, x, z, r, sc));
    }
    Object.entries(fill).forEach(([k, list]) => M.instances(G, k, list));
    // park: drzewa, ławki
    const pk = M.w([City.PLACES.park.x, City.PLACES.park.y]), trees = { treeOak: [], treeBirch: [], treeOakY: [] }, benches = [];
    for (let i = 0; i < 46; i++) { const a = rnd() * 6.28, d = 6 + rnd() * 30, x = pk.x + 10 + Math.cos(a) * d * 1.3, z = pk.z + Math.sin(a) * d * 0.8; if (M.nearest(x, z).d < 9 || blds.some(b => Math.hypot(b.x - x, b.z - z) < b.rad + 2)) continue; const k = ['treeOak', 'treeBirch', 'treeOakY'][i % 3]; trees[k].push({ x, z, r: rnd() * 6, s: 1 }); col.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4 }); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; benches.push({ x: pk.x + 10 + Math.cos(a) * 14, z: pk.z + Math.sin(a) * 9, r: Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI, s: 1 }); }
    // drzewa i latarnie wzdłuż ulic, zaparkowane auta
    const lamps = [], cars = {};
    M.segs().forEach(s => {
      const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, nx = -dz, nz = dx;
      for (let t = 8; t < s.len - 6; t += 16) [-1, 1].forEach(sd => {
        const off = s.wd / 2 + 3.0, x = s.a.x + dx * t + nx * off * sd, z = s.a.z + dz * t + nz * off * sd;
        if (M.inStadium(x, z, 3) || Math.abs(z - M.riverZ(x)) < 9 || Object.values(doors).some(d => Math.hypot(d.x - x, d.z - z) < 6)) return;
        if ((t / 16 | 0) % 2 === 0) lamps.push({ x, z, r: Math.atan2(-nx * sd, -nz * sd), s: M.scaleFor('lampCity', { h: 7 }) });
        else { const k = rnd() < 0.5 ? 'treeBirch' : 'treeOakY'; trees[k].push({ x, z, r: rnd() * 6, s: 1 }); col.push({ x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35 }); }
      });
      for (let t = 20; t < s.len - 12; t += 13) {
        if (rnd() < 0.55) continue;
        const sd = rnd() < 0.5 ? -1 : 1, off = s.wd / 2 - 1.3, x = s.a.x + dx * t + nx * off * sd, z = s.a.z + dz * t + nz * off * sd;
        if (M.inStadium(x, z, 4) || Math.abs(z - M.riverZ(x)) < 10 || Object.values(doors).some(d => Math.hypot(d.x - x, d.z - z) < 9)) continue;
        const k = M.CARS[Math.floor(rnd() * M.CARS.length)], sc = M.scaleFor(k, { w: M.LEN[k] || 4.6 }), r = Math.atan2(dx, dz) + (sd > 0 ? 0 : Math.PI);
        (cars[k] = cars[k] || []).push({ x, z, r, s: sc }); col.push(M.box(k, x, z, r, sc, 0.95));
      }
    });
    Object.entries(trees).forEach(([k, l]) => { if (!l.length) return; const bk = k === 'treeOak' ? 'oak' : k === 'treeBirch' ? 'small' : 'small'; World.treeBillboards(bk, l.map(t => ({ x: t.x, z: t.z, rot: t.r, h: bk === 'oak' ? 11 + Math.random() * 4 : 7 + Math.random() * 3 })), G); });
    M.instances(G, 'benchPark', benches); M.instances(G, Furn.cache.lampPH ? 'lampPH' : 'lampCity', lamps.map(l => ({ ...l, s: M.scaleFor(Furn.cache.lampPH ? 'lampPH' : 'lampCity', { h: 7 }) })));
    Object.entries(cars).forEach(([k, l]) => M.instances(G, k, l));
    // ruch uliczny: auta jadące po drogach
    M.traffic = [];
    ['carSedan', 'car126p', 'bus', 'car125p', 'police', 'carVan', 'car126p', 'hatch3', 'car125p', 'estate', 'carCity', 'car126p'].forEach((k, i) => {
      const s = M.segs()[i % M.segs().length], len = M.LEN[k] || 4.6, g = Furn.place(G, k, 0, 0, 0, 0, { w: len }); if (!g) return;
      M.traffic.push({ g, k, hl: len / 2, seg: M.segs().indexOf(s), t: rnd() * s.len, dir: i % 2 ? 1 : -1, v: k === 'bus' ? 7 : 9 + rnd() * 3, police: k === 'police' });
    });
    M.col = col; M.doors = doors; M.G = G; M.spotsBase = spots;
    World.rooms.miasto = { cx: M.CX, W: M.W, D: M.D, name: 'Miasto', exitTo: null, group: G, outdoor: true, spots };
  },

  /** Pora dnia: niebo i światło */
  light() {
    const M = Miasto, m = City.minOf(City.Z()), night = m >= 20 * 60 || m < 6 * 60, eve = !night && m >= 17 * 60;
    const pal = night ? ['#0b1024', '#1b2340', '#3a2f4a'] : eve ? ['#6d7fb0', '#d8a888', '#f0c090'] : ['#7fa6d8', '#bcd2ea', '#eef2f4'];
    if (M._pal !== pal[0]) { M._pal = pal[0]; M.sky.material.map = World.canvasTex(64, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, pal[0]); gr.addColorStop(0.5, pal[1]); gr.addColorStop(0.72, pal[2]); gr.addColorStop(1, '#55595e'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); if (night) { g.fillStyle = '#fff'; for (let i = 0; i < 90; i++) g.fillRect(Math.random() * 64, Math.random() * 120, 1, 1); } }); M.sky.material.needsUpdate = true; }
    M.hemi.intensity = night ? 0.25 : eve ? 0.6 : 0.85; M.sun.intensity = night ? 0.08 : eve ? 0.55 : 0.9; M.sun.color.set(eve ? 0xffc890 : 0xfff0d8);
    const S = World.scene; if (S.fog) { S.fog.color.set(night ? 0x0b1024 : eve ? 0xc8b0a0 : 0xc8d6e4); S.fog.near = 170; S.fog.far = 760; }
  },
  /** Ruch uliczny i przechodnie */
  tick(dt) {
    const M = Miasto; if (!M.traffic || Walk.room !== 'miasto') return;
    const px = Walk.x - M.CX, pz = Walk.z, segs = M.segs();
    M.traffic.forEach(c => {
      const s = segs[c.seg], dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, lane = 2.4 * c.dir;
      const x = s.a.x + dx * c.t - dz * lane, z = s.a.z + dz * c.t + dx * lane;
      const blocked = Math.hypot(x + dx * c.dir * 5 - px, z + dz * c.dir * 5 - pz) < 4.5; // pieszy przed maską — hamuje
      if (!blocked) c.t += c.v * dt * c.dir;
      if (c.t > s.len || c.t < 0) {
        const end = c.dir > 0 ? s.b : s.a, next = segs.map((o, i) => [o, i]).filter(([o]) => o !== s && (Math.hypot(o.a.x - end.x, o.a.z - end.z) < 2 || Math.hypot(o.b.x - end.x, o.b.z - end.z) < 2));
        if (next.length) { const [o, i] = next[Math.floor(Math.random() * next.length)], atA = Math.hypot(o.a.x - end.x, o.a.z - end.z) < 2; c.seg = i; c.dir = atA ? 1 : -1; c.t = atA ? 0 : o.len; }
        else { c.dir *= -1; c.t = R.clamp(c.t, 0, s.len); }
      }
      c.g.position.set(x, 0, z); c.g.rotation.y = Math.atan2(dx * c.dir, dz * c.dir);
    });
    (M.walkers || []).forEach(w => {
      const s = segs[w.seg], dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, off = (s.wd / 2 + 1.6) * w.side;
      w.t += w.v * dt * w.dir; if (w.t > s.len - 2 || w.t < 2) w.dir *= -1;
      w.m.position.set(s.a.x + dx * w.t - dz * off, 0, s.a.z + dz * w.t + dx * off); w.m.rotation.y = Math.atan2(-dz * w.dir, dx * w.dir);
    });
  },
  spawnWalkers() {
    const M = Miasto; if (!Humans.ready || M.walkers) return; M.walkers = [];
    for (let i = 0; i < 16; i++) { const m = Humans.make(null, 'walk', { sex: Math.random() < 0.4 ? 'f' : 'm' }); if (!m) continue; const seg = i % M.segs().length; M.G.add(m); M.walkers.push({ m, seg, t: 5 + Math.random() * (M.segs()[seg].len - 10), dir: Math.random() < 0.5 ? 1 : -1, side: Math.random() < 0.5 ? 1 : -1, v: m.userData.human.speed * m.userData.human.act.timeScale }); }
  },
  /** Ustaw gracza przy drzwiach miejsca (twarzą do ulicy) */
  toDoor(place) { const d = Miasto.doors && Miasto.doors[place]; if (!d) return; Walk.x = Miasto.CX + d.x; Walk.z = d.z; Walk.yaw = Math.atan2(-Math.sin(d.yaw), -Math.cos(d.yaw)) + Math.PI; Walk.pitch = -0.05; },
  /** Wyjście na miasto (z mapy albo z wnętrza) */
  go(place) {
    const s = Game.s; if (!s || s.mode !== 'career') return;
    if (Career.C().jail > 0) { UI.toast('Siedzisz w areszcie.', true); return; }
    UI.toast('Wczytuję miasto…');
    Miasto.build(() => {
      City._world = true;
      if (!Walk.active) Walk.startRoom('miasto', () => { City._world = false; UI.show('mgr'); Career.render(); });
      else Walk.enterRoom('miasto');
      Miasto.toDoor(place || City.Z().loc || 'dom');
    });
  },
  /** Przystanek: dokąd jedziesz (4 zł, czas zależny od odległości) */
  busModal(from) {
    const C = Career.C(), a = Miasto.doors[from]; City._busFrom = from;
    const list = Object.keys(Miasto.doors).filter(k => k !== from).map(k => { const b = Miasto.doors[k]; return { k, min: Math.round(4 + Math.hypot(a.x - b.x, a.z - b.z) / 22) }; }).sort((x, y) => x.min - y.min);
    UI.modal(`<div class="row between"><span class="kicker">🚌 Przystanek „${esc(City.PLACES[from].name)}”</span><button class="x" data-ui="close">×</button></div><h2>Dokąd jedziesz?</h2><p class="small muted">Bilet 4 zł · godzina: ${City.timeStr()}</p>
      <div class="talk-opts">${list.map(o => `<button class="opt" data-ui="cBus" data-v="${o.k}" ${C.money < 4 ? 'disabled' : ''}>${City.PLACES[o.k].icon} ${esc(City.PLACES[o.k].name)} <small>ok. ${o.min} min</small></button>`).join('')}<button class="opt" data-ui="cBus" data-v="tor">🏁 Stadion <small>ok. 10 min</small></button></div>`);
  },
  ride(to, cost, min, kind = '🚌') {
    const C = Career.C(); if (C.money < cost) { UI.toast('Za mało pieniędzy.', true); return; }
    UI.close(); Career.pay(-cost, kind === '🚕' ? 'Taksówka' : 'Bilet autobusowy'); City.advance(min);
    let ov = document.getElementById('travel'); if (!ov) { ov = document.createElement('div'); ov.id = 'travel'; document.body.appendChild(ov); }
    ov.innerHTML = `<div class="tr-road"><span class="tr-veh">${kind}</span></div><b>${kind === '🚕' ? 'Taksówka' : 'Autobus linii 7'}</b><small>→ ${esc(to === 'tor' ? 'Stadion' : City.PLACES[to].name)} · ${min} min</small>`; ov.className = 'on'; setTimeout(() => { ov.className = ''; }, 1500);
    setTimeout(() => { if (to === 'tor') { const S = Miasto.stadium(); Walk.x = Miasto.CX + S.x; Walk.z = S.z + Miasto.SR.z + 6; Walk.yaw = 0; } else { Miasto.toDoor(to); City.Z().loc = to; } }, 700);
  },
};
(() => {
  // akcje w mieście
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id.startsWith('w:in:')) {
      const place = id.slice(5), Z = City.Z();
      if (place === 'tor') { Walk.stopQuiet(); City._world = false; City.enter('tor'); return true; }
      const key = place === 'dom' ? 'home' : City.ROOM[place]; if (!key || !World.rooms[key]) { UI.toast('Zamknięte.', true); return true; }
      City._door = place; Z.loc = place; City.sel = place; City.advance(2);
      Walk.enterRoom(key); UI.toast(`${City.PLACES[place].name} · ${City.timeStr()}`); return true;
    }
    if (id.startsWith('w:bus:')) { Miasto.busModal(id.slice(6)); return true; }
    return bra.call(this, id);
  };
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cBus') { const a = Miasto.doors[City._busFrom] || Object.values(Miasto.doors)[0], b = d.v === 'tor' ? Miasto.stadium() : Miasto.doors[d.v]; Miasto.ride(d.v, 4, Math.round(4 + Math.hypot(a.x - b.x, a.z - b.z) / 22)); return true; }
    if (d.ui === 'cCity3d') { Miasto.go(City.Z().loc); return true; }
    return bc.call(this, d);
  };
  // wyjście z lokalu → na ulicę przed drzwiami (impreza ma własne zakończenie)
  const bl = Walk.leaveRoom;
  Walk.leaveRoom = function (silent) {
    if (!silent && City._world && Walk.room && Walk.room !== 'miasto' && Walk.room !== 'party' && World.rooms.miasto) {
      const place = City._door || City.Z().loc; City.advance(2); Walk.enterRoom('miasto'); Miasto.toDoor(place); return;
    }
    return bl.call(this, silent);
  };
  // wejście przez mapę (szybki tryb) — bez powrotu na ulicę
  const ben = City.enter;
  City.enter = function (place) { if (!Walk.active || Walk.room !== 'miasto') City._world = false; return ben.call(this, place); };
  const fogOff = () => { if (Miasto._fog) { const S = World.scene; S.fog.color.copy(Miasto._fog.c); S.fog.near = Miasto._fog.n; S.fog.far = Miasto._fog.f; Miasto._fog = null; } };
  // wejście do miasta: widoczność, światło, przechodnie, kolizje
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    if (Miasto.G) Miasto.G.visible = key === 'miasto';
    if (key !== 'miasto') fogOff();
    be.call(this, key);
    if (key === 'miasto') {
      const S = World.scene; if (S.fog && !Miasto._fog) Miasto._fog = { c: S.fog.color.clone(), n: S.fog.near, f: S.fog.far };
      Miasto.light(); Miasto.spawnWalkers(); Rooms.extraCol = Miasto.col;
      const ex = Walk.spots.find(s => s.id === 'r:exit'); if (ex) ex.label = 'Wróć do widoku mapy';
    } else Rooms.extraCol = null;
  };
  const bcol = Rooms.colliders;
  Rooms.colliders = function () { const c = bcol.call(this); if (!(Rooms.extraCol && Walk.room === 'miasto')) return c; if (Rooms._exBase !== c) { Rooms._exBase = c; Rooms._ex = c.concat(Rooms.extraCol); } return Rooms._ex; };
  const bt = Rooms.tick;
  Rooms.tick = function (dt) { bt.call(this, dt); if (Walk.room === 'miasto') { Miasto.tick(dt); if ((Miasto._lt = (Miasto._lt || 0) + dt) > 5) { Miasto._lt = 0; Miasto.light(); } } };
  const bs = Walk.stopQuiet, bstop = Walk.stop;
  const off = () => { if (Miasto.G) Miasto.G.visible = false; fogOff(); };
  Walk.stopQuiet = function () { off(); return bs.call(this); };
  Walk.stop = function (t) { off(); return bstop.call(this, t); };
  // minimapa miasta + taksówka po kliknięciu
  const bmf = Walk.mapFrame;
  Walk.mapFrame = function () {
    if (Walk.room !== 'miasto') return bmf.call(this);
    const cv = $('#wh-map'); if (!cv || !Miasto.col) return; cv.hidden = false; cv.classList.toggle('big', !!Walk.bigMap);
    const M = Miasto, S = Walk.bigMap ? 640 : 240; if (cv.width !== S) { cv.width = S; cv.height = S; M._lay = null; }
    const sc = S / M.W, oz = (S - M.D * sc) / 2, P = (x, z) => [(x + M.W / 2) * sc, oz + (z + M.D / 2) * sc];
    if (!M._lay || M._lay.width !== S) {
      const L = M._lay = document.createElement('canvas'); L.width = S; L.height = S; const g = L.getContext('2d');
      g.fillStyle = '#20281f'; g.fillRect(0, 0, S, S); g.fillStyle = '#3a5a38'; g.fillRect(0, oz, S, M.D * sc);
      g.strokeStyle = '#2d5a78'; g.lineWidth = 14 * sc; g.beginPath(); for (let x = -M.W / 2; x <= M.W / 2; x += 6) { const [a, b] = P(x, M.riverZ(x)); if (x === -M.W / 2) g.moveTo(a, b); else g.lineTo(a, b); } g.stroke();
      g.strokeStyle = '#8a8a86'; M.segs().forEach(s => { g.lineWidth = Math.max(2, s.wd * sc); g.beginPath(); g.moveTo(...P(s.a.x, s.a.z)); g.lineTo(...P(s.b.x, s.b.z)); g.stroke(); });
      g.fillStyle = '#555'; M.col.forEach(c => { if (c.x1 - c.x0 > 3 && c.z1 - c.z0 > 3) { const [a, b] = P(c.x0, c.z0); g.fillRect(a, b, (c.x1 - c.x0) * sc, (c.z1 - c.z0) * sc); } });
      const st = M.stadium(), [sa, sbb] = P(st.x, st.z); g.fillStyle = '#E0632E'; g.beginPath(); g.ellipse(sa, sbb, 44 * sc, 30 * sc, 0, 0, 7); g.fill();
      g.font = `bold ${S > 300 ? 12 : 9}px Barlow, sans-serif`; g.textAlign = 'center';
      Object.entries(M.doors).forEach(([k, d]) => { const [a, b] = P(d.x, d.z); g.fillStyle = City.PLACES[k].c; g.beginPath(); g.arc(a, b, S > 300 ? 7 : 4.5, 0, 7); g.fill(); if (S > 300) { g.fillStyle = '#fff'; g.fillText(City.PLACES[k].name.split(' ')[0], a, b - 10); } });
    }
    const g = cv.getContext('2d'); g.drawImage(M._lay, 0, 0);
    const job = Career.C().job; if (job && job.x != null) { const [a, b] = P(job.x, job.z); g.strokeStyle = '#ffd23a'; g.lineWidth = 3; g.beginPath(); g.arc(a, b, 8, 0, 7); g.stroke(); }
    const [px, pz] = P(Walk.x - M.CX, Walk.z), fx = -Math.sin(Walk.yaw), fz = -Math.cos(Walk.yaw), r = S > 300 ? 11 : 7;
    g.fillStyle = '#ffd23a'; g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + fx * r, pz + fz * r); g.lineTo(px - fx * r * 0.6 + fz * r * 0.6, pz - fz * r * 0.6 - fx * r * 0.6); g.lineTo(px - fx * r * 0.6 - fz * r * 0.6, pz - fz * r * 0.6 + fx * r * 0.6); g.closePath(); g.fill(); g.stroke();
    if (Walk.bigMap) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, S - 26, S, 26); g.fillStyle = '#fff'; g.font = '13px Barlow, sans-serif'; g.textAlign = 'center'; g.fillText('Kliknij miejsce — taksówka (15 zł) · M — zamknij', S / 2, S - 9); }
    M._mapT = { sc, oz, S };
  };
  const bmc = Walk.mapClick;
  Walk.mapClick = function (e) {
    if (Walk.room !== 'miasto') return bmc.call(this, e);
    const cv = $('#wh-map'), T = Miasto._mapT; if (!cv || !T) return;
    const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, mz = (e.clientY - r.top) * cv.height / r.height, wx = mx / T.sc - Miasto.W / 2, wz = (mz - T.oz) / T.sc - Miasto.D / 2;
    let best = null, bd = 1e9; Object.entries(Miasto.doors).forEach(([k, d]) => { const dd = Math.hypot(d.x - wx, d.z - wz); if (dd < bd) { bd = dd; best = k; } });
    if (!best) return; const a = { x: Walk.x - Miasto.CX, z: Walk.z }, b = Miasto.doors[best]; Walk.bigMap = false;
    Miasto.ride(best, 15, Math.round(3 + Math.hypot(a.x - b.x, a.z - b.z) / 45), '🚕');
  };
  // M — duża mapa działa też w mieście
  const bk = Walk.key;
  Walk.key = function (e, down) { if (Walk.active && Walk.room === 'miasto' && down && e.code === 'KeyM' && !$('#modal').innerHTML) { Walk.bigMap = !Walk.bigMap; if (Walk.bigMap && Walk.locked()) document.exitPointerLock(); return true; } return bk.call(this, e, down); };
  // przycisk w zakładce Miasto
  const bv = City.view;
  City.view = function () { return bv.call(this).replace('<button class="ghost" data-ui="cityPhone">📱 Telefon</button>', '<button class="go" data-ui="cCity3d">🚶 Idź pieszo po mieście (3D)</button><button class="ghost" data-ui="cityPhone">📱 Telefon</button>'); };
})();
