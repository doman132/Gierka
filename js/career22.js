/* =========================================================
   Speedway Empire 3D — v2.9: WIĘKSZE MIASTO (4×) i STARE MIASTO
   • mapa miasta 1520 × 1160 m (było ok. 760 × 580): na wschodzie
     druga dzielnica, na północy las miejski, na południu pola
   • STARE MIASTO otwiera się z czasem (po 6 tygodniach kariery);
     wcześniej drogi zamyka plac budowy z płotem
   • Rynek z ratuszem, fontanną, straganami; kolorowe kamienice
   • budynki do zwiedzania (wnętrza 3D): Muzeum Żużla, Kino „Polonia”,
     Salon samochodowy, Biuro nieruchomości „Kamienica”
   • nowe domy do kupienia: mieszkanie w kamienicy na Rynku,
     loft nad rzeką, penthouse „Panorama” (z wnętrzem)
   Wydajność: kamienice scalone w jedną siatkę na materiał, okna
   tylko od ulicy (instancje), las i pola jako instancje/płaszczyzny.
   ========================================================= */
'use strict';

const Duze = {
  X0: -380, X1: 1140, Z0: -580, Z1: 580, UNLOCK: 6,
  ROADS: ['ul. Wschodnia', 'ul. Nadrzeczna', 'ul. Grodzka', 'ul. Rynkowa', 'ul. Zamkowa', 'ul. Długa', 'ul. Murowa', 'ul. Bulwarowa'],
  RYNEK: { x0: 488, x1: 792, z0: -142, z1: -36, cx: 640, cz: -89 },
  doors: {},
  P: (x, z) => [x / 0.8 + 500, z / 0.8 + 300], // metry miasta → współrzędne mapy (Miasto.w odwrotnie)
  career: () => !!(Game.s && Game.s.mode === 'career' && Game.s.career),
  unlocked() { if (!Duze.career()) return true; const C = Game.s.career; return !!C.d2 || (C.wkCount || 0) >= Duze.UNLOCK; },
  weeksLeft() { return Duze.career() ? Math.max(0, Duze.UNLOCK - (Game.s.career.wkCount || 0)) : 0; },

  /** Ulice dzielnicy; zamknięta — łączniki urwane przy placu budowy (auta zawracają) */
  roads(unl) {
    const L = (pts, wd, name) => [pts.map(([x, z]) => Duze.P(x, z)), wd, name, 'd2'];
    const join = (a, rest, wd, name) => unl ? [L([a, ...rest], wd, name)] : [L([a, [388, a[1]]], wd, name), L([[400, a[1]], ...rest], wd, name)];
    return [
      ...join([276, -28], [[480, -28], [800, -28], [1080, -28]], 10, 'ul. Wschodnia'),
      ...join([304, 148], [[480, 148], [800, 148], [1080, 148]], 8, 'ul. Nadrzeczna'),
      L([[480, -260], [480, -150], [480, -28], [480, 148], [480, 300]], 8, 'ul. Grodzka'),
      L([[800, -260], [800, -150], [800, -28], [800, 148], [800, 300]], 8, 'ul. Rynkowa'),
      L([[1080, -260], [1080, -150], [1080, -28], [1080, 148], [1080, 300]], 8, 'ul. Zamkowa'),
      L([[480, -150], [800, -150], [1080, -150]], 7, 'ul. Długa'),
      L([[480, -260], [800, -260], [1080, -260]], 7, 'ul. Murowa'),
      L([[480, 300], [800, 300], [1080, 300]], 7, 'ul. Bulwarowa'),
    ];
  },
  applyRoads() {
    const R = Miasto.ROADS; for (let i = R.length - 1; i >= 0; i--) if (R[i][3] === 'd2') R.splice(i, 1);
    R.push(...Duze.roads(Duze.unlocked()));
    Duze._roadsUnl = Duze.unlocked();
  },

  /* ---------- budynki specjalne: wejścia do wnętrz i domy na sprzedaż ---------- */
  SPECIAL: [
    { key: 'museum', road: 'ul. Długa', at: 560, sd: -1, w: 24, d: 16, h: 16, wall: 'brick_wall_02', tint: '#c98f72', sign: 'MUZEUM ŻUŻLA', room: 'museum', label: '🏁 Muzeum Żużla — wejdź' },
    { key: 'agency', road: 'ul. Długa', at: 700, sd: -1, w: 12, d: 13, h: 15, wall: 'white_stucco', tint: '#e8d8b0', sign: 'NIERUCHOMOŚCI „KAMIENICA”', room: 'agency', label: '🔑 Biuro nieruchomości — wejdź' },
    { key: 'cinema', road: 'ul. Grodzka', at: -95, sd: 1, w: 22, d: 18, h: 14, wall: 'painted_plaster_wall', tint: '#b9d3e6', sign: 'KINO „POLONIA”', room: 'cinema', label: '🎬 Kino „Polonia” — wejdź' },
    { key: 'salon', road: 'ul. Wschodnia', at: 640, sd: 1, w: 30, d: 18, h: 9, wall: 'concrete_tile_facade', tint: '#dfe3e6', sign: 'SALON SAMOCHODOWY', room: 'salon', label: '🚗 Salon samochodowy — wejdź' },
    { key: 'kamienica', road: 'ul. Rynkowa', at: -70, sd: -1, w: 13, d: 13, h: 18, wall: 'yellow_plaster', tint: '#f2d7a6', sign: 'KAMIENICA POD ZŁOTYM KASKIEM', house: true },
    { key: 'loft', road: 'ul. Nadrzeczna', at: 640, sd: -1, w: 26, d: 18, h: 19, wall: 'brick_wall_02', tint: '#9a6a55', sign: 'LOFTY NAD RZEKĄ', house: true, flat: true },
    { key: 'penthouse', road: 'ul. Bulwarowa', at: 940, sd: -1, w: 24, d: 24, h: 52, wall: 'rectangular_facade_tiles', tint: '#d6dde3', sign: 'APARTAMENTY „PANORAMA”', house: true, flat: true },
  ],
  OLD_WALLS: ['white_stucco', 'painted_plaster_wall', 'yellow_plaster', 'white_plaster_02'],
  TINTS: ['#f2d7a6', '#e8b4a0', '#cfe0c3', '#b9d3e6', '#f4e3b5', '#e6c2d6', '#d9cbb3', '#f0eee6'],
  OLD_MODELS: ['euroB_04', 'euroB_14', 'euroB_15', 'euroB_16', 'euroB_17', 'euroB_18'],
  NEW_MODELS: ['cB1', 'cB2', 'cB3', 'cB4', 'cB5', 'cB6', 'cB7', 'cB8', 'cB9', 'cB10', 'cB11', 'cB12', 'cB13', 'cB14', 'cB15'],

  segD(o, x, z) { const L = Ruch.local(o, x, z), t = R.clamp(L.t, 0, o.len); return Math.hypot(L.t - t, L.lat); },
  /** Środek budynku przy ulicy: t wzdłuż odcinka, sd — strona */
  frontage(s, t, sd, depth) {
    const dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, nx = -dz * sd, nz = dx * sd, off = s.wd / 2 + 3.4 + depth / 2;
    return { x: s.a.x + dx * t + nx * off, z: s.a.z + dz * t + nz * off, fx: -nx, fz: -nz, dx, dz };
  },
  /** Czy prostokąt (AABB) jest wolny: granice mapy, inne ulice, rzeka, rynek, kolizje */
  free(x, z, hx, hz, s, placed) {
    const M = Miasto;
    if (x - hx < Duze.X0 + 4 || x + hx > Duze.X1 - 4 || z - hz < Duze.Z0 + 4 || z + hz > Duze.Z1 - 4) return false;
    const Ry = Duze.RYNEK; if (x + hx > Ry.x0 && x - hx < Ry.x1 && z + hz > Ry.z0 && z - hz < Ry.z1) return false;
    if (Math.abs(z - M.riverZ(x)) < 7.5 + 3 + hz) return false;
    if (M.segs().some(o => o !== s && !o.dummy && Duze.segD(o, x, z) < o.wd / 2 + 3.4 + Math.max(hx, hz) * 0.92)) return false;
    if (M.col.some(c => c.x1 > x - hx && c.x0 < x + hx && c.z1 > z - hz && c.z0 < z + hz)) return false;
    return !placed.some(p => Math.abs(p.x - x) < p.hx + hx + 0.2 && Math.abs(p.z - z) < p.hz + hz + 0.2);
  },

  /* ---------- budowa dzielnicy (raz, przy budowie miasta) ---------- */
  make(G) {
    const M = Miasto, segs = M.segs(), placed = [], unl = Duze.unlocked();
    let rs = 23; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const hi = new THREE.Group(); // bez rodzica: scalanie i okna liczone w układzie miasta
    const winPrev = World._win || []; World._win = [];
    const models = {}; Duze.doors = {}; Duze.signs = [];
    const box = (x, z, hx, hz) => { M.col.push({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz }); placed.push({ x, z, hx, hz }); };
    /** Kamienica z cegieł/tynku: okna tylko od ulicy (front „+x” budynku) */
    const tenement = (p, w, d, h, wall, tint, roof) => {
      const n0 = World._win.length, rot = Math.atan2(-p.fz, p.fx);
      World.realBuilding({ x: p.x, z: p.z, w: d, d: w, h, wall, tint, roof, roofTex: rnd() < 0.7 ? 'clay_roof_tiles_02' : 'grey_roof_tiles', rot, floorH: 3.1, lit: 0.4, face: '+x', skip: [[-1.2, 1.2]], parent: hi });
      const front = Math.PI / 2 + rot, keep = World._win.splice(n0).filter(o => Math.abs(Math.atan2(Math.sin(o.ry - front), Math.cos(o.ry - front))) < 0.2);
      World._win.push(...keep);
      const hx = Math.abs(p.fx) * d / 2 + Math.abs(p.fz) * w / 2, hz = Math.abs(p.fz) * d / 2 + Math.abs(p.fx) * w / 2; box(p.x, p.z, hx, hz);
    };
    // 1) budynki specjalne
    Duze.SPECIAL.forEach(S => {
      const s = segs.find(o => o.name === S.road && (S.road === 'ul. Grodzka' || S.road === 'ul. Rynkowa' ? S.at >= Math.min(o.a.z, o.b.z) && S.at <= Math.max(o.a.z, o.b.z) : S.at >= Math.min(o.a.x, o.b.x) && S.at <= Math.max(o.a.x, o.b.x)));
      if (!s) return;
      const t = Math.abs(S.road === 'ul. Grodzka' || S.road === 'ul. Rynkowa' ? S.at - s.a.z : S.at - s.a.x), p = Duze.frontage(s, t, S.sd, S.d);
      tenement(p, S.w, S.d, S.h, S.wall, S.tint, S.h > 30 ? 'flat' : 'gable');
      const dx = p.x + p.fx * (S.d / 2 + 0.05), dz = p.z + p.fz * (S.d / 2 + 0.05), yaw = Math.atan2(p.fx, p.fz);
      World.realDoor(G, dx, 0, dz, yaw, { kind: S.house ? 'wood' : 'metal', sign: S.sign });
      const sx = p.x + p.fx * (S.d / 2 + 1.3), sz = p.z + p.fz * (S.d / 2 + 1.3);
      Duze.doors[S.key] = { x: sx, z: sz, yaw: Math.atan2(-p.fx, -p.fz) };
      (M.spotsBase || []).push({ id: S.house ? 'sm:home:' + S.key : 'sm:in:' + S.key, x: sx, z: sz, label: S.label || `🏠 ${S.sign}`, r: 2.4 });
    });
    // 2) pierzeje: kamienice na północ od rzeki, nowe budynki na południe
    segs.forEach(s => {
      if (!Duze.ROADS.includes(s.name) || s.len < 20 || Math.max(s.a.x, s.b.x) < 400) return;
      [-1, 1].forEach(sd => {
        let t = 8;
        while (t < s.len - 8) {
          const mid = Duze.frontage(s, t, sd, 12), old = mid.z < M.riverZ(mid.x);
          let k = null, w, d, h, sc = 1;
          if (old && rnd() < 0.22) { k = Duze.OLD_MODELS[Math.floor(rnd() * Duze.OLD_MODELS.length)]; }
          else if (!old && rnd() < 0.75) { k = Duze.NEW_MODELS[Math.floor(rnd() * Duze.NEW_MODELS.length)]; sc = 1.3 + rnd() * 0.4; }
          if (k && !Furn.cache[k]) k = null;
          if (k) { const C = Furn.cache[k]; w = C.size.x * sc; d = C.size.z * sc; }
          else { w = 8 + rnd() * 6; d = 12 + rnd() * 3; h = old ? 12 + Math.floor(rnd() * 3) * 3.1 : 15 + Math.floor(rnd() * 5) * 3.1; }
          if (t + w > s.len - 8) break;
          const p = Duze.frontage(s, t + w / 2, sd, d), hx = Math.abs(p.fx) * d / 2 + Math.abs(p.fz) * w / 2, hz = Math.abs(p.fz) * d / 2 + Math.abs(p.fx) * w / 2;
          if (!Duze.free(p.x, p.z, hx, hz, s, placed)) { t += 3; continue; }
          if (k) { const r = Math.atan2(p.fx, p.fz); (models[k] = models[k] || []).push({ x: p.x, z: p.z, r, s: sc }); M.col.push(M.box(k, p.x, p.z, r, sc)); placed.push({ x: p.x, z: p.z, hx, hz }); }
          else tenement(p, w, d, h, old ? Duze.OLD_WALLS[Math.floor(rnd() * 4)] : (rnd() < 0.5 ? 'concrete_tile_facade' : 'rectangular_facade_tiles'), old ? Duze.TINTS[Math.floor(rnd() * Duze.TINTS.length)] : '#e4e4e0', old && rnd() < 0.75 ? 'gable' : 'flat');
          t += w + (old ? 0.15 : 2.5); // kamienice w zwartej pierzei, nowe bloki z przerwami
        }
      });
    });
    // 3) rynek: płyty, ratusz z wieżą i zegarem, fontanna, stragany, ławki, latarnie
    const Ry = Duze.RYNEK, plaza = new THREE.Mesh(new THREE.PlaneGeometry(Ry.x1 - Ry.x0, Ry.z1 - Ry.z0), World.pbr('large_grey_tiles', (Ry.x1 - Ry.x0) / 4, (Ry.z1 - Ry.z0) / 4, { color: '#c9bfae' }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(Ry.cx, 0.035, Ry.cz); plaza.receiveShadow = true; G.add(plaza);
    World.realBuilding({ x: Ry.cx + 20, z: Ry.cz, w: 18, d: 40, h: 13, wall: 'yellow_plaster', tint: '#f0dca8', roof: 'gable', roofTex: 'clay_roof_tiles_02', rot: 0, floorH: 3.4, lit: 0.5, parent: hi });
    box(Ry.cx + 20, Ry.cz, 9, 20);
    const tw = World.pbr('brick_wall_02', 2, 8, { color: '#b77a5c' }), tower = new THREE.Mesh(new THREE.BoxGeometry(8, 34, 8), tw); tower.position.set(Ry.cx + 20, 17, Ry.cz - 24); tower.castShadow = true; G.add(tower); box(Ry.cx + 20, Ry.cz - 24, 4, 4);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(6.2, 14, 4), new THREE.MeshStandardMaterial({ color: 0x3f6b55, metalness: 0.4, roughness: 0.5 })); spire.rotation.y = Math.PI / 4; spire.position.set(Ry.cx + 20, 41, Ry.cz - 24); G.add(spire);
    const clockT = World.canvasTex(128, 128, c => { c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.strokeStyle = '#2a2a2a'; c.lineWidth = 6; c.stroke(); c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.beginPath(); c.moveTo(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); c.lineTo(64 + Math.sin(a) * 56, 64 - Math.cos(a) * 56); c.stroke(); } c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 26); c.moveTo(64, 64); c.lineTo(92, 64); c.stroke(); });
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(a => { const m = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshStandardMaterial({ map: clockT })); m.position.set(Ry.cx + 20 + Math.sin(a) * 4.02, 28, Ry.cz - 24 + Math.cos(a) * 4.02); m.rotation.y = a; G.add(m); });
    const stone = new THREE.MeshStandardMaterial({ color: 0x9c968c, roughness: 0.8 }), basin = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.3, 0.8, 32), stone); basin.position.set(Ry.cx - 70, 0.4, Ry.cz); G.add(basin);
    const wat = new THREE.Mesh(new THREE.CircleGeometry(4.6, 32), new THREE.MeshStandardMaterial({ color: 0x3d7fa6, roughness: 0.1, metalness: 0.2 })); wat.rotation.x = -Math.PI / 2; wat.position.set(Ry.cx - 70, 0.72, Ry.cz); G.add(wat);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3.4, 16), stone); col.position.set(Ry.cx - 70, 1.9, Ry.cz); G.add(col); box(Ry.cx - 70, Ry.cz, 5.3, 5.3);
    // stragany: blat i pasiasty daszek (instancje)
    const stalls = [[-30, -40], [-18, -40], [-6, -40], [-30, 40], [-18, 40], [-6, 40]].map(([x, z]) => [Ry.cx + x, Ry.cz + z]);
    const D = new THREE.Object3D(), stripe = World.canvasTex(64, 64, c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f4f1e8' : '#c0392b'; c.fillRect(i * 8, 0, 8, 64); } });
    [[new THREE.BoxGeometry(4, 1, 2), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8 }), 0.5], [new THREE.BoxGeometry(4.6, 0.12, 2.8), new THREE.MeshStandardMaterial({ map: stripe }), 2.6]].forEach(([g, m, y]) => {
      const im = new THREE.InstancedMesh(g, m, stalls.length); stalls.forEach(([x, z], i) => { D.position.set(x, y, z); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }); im.castShadow = true; G.add(im);
    });
    stalls.forEach(([x, z]) => box(x, z, 2.1, 1.1));
    const legs = []; stalls.forEach(([x, z]) => [[-2.1, -1.3], [2.1, -1.3], [-2.1, 1.3], [2.1, 1.3]].forEach(([a, b]) => legs.push([x + a, z + b])));
    const lg = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x5a5a5a }), legs.length); legs.forEach(([x, z], i) => { D.position.set(x, 1.3, z); D.updateMatrix(); lg.setMatrixAt(i, D.matrix); }); G.add(lg);
    const benches = [], lamps = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; benches.push({ x: Ry.cx - 70 + Math.cos(a) * 11, z: Ry.cz + Math.sin(a) * 11, r: -a + Math.PI / 2, s: 1 }); }
    for (let x = Ry.x0 + 12; x < Ry.x1 - 6; x += 24) [Ry.z0 + 3, Ry.z1 - 3].forEach(z => lamps.push({ x, z, r: 0, s: M.scaleFor(Furn.cache.lampPH ? 'lampPH' : 'lampCity', { h: 5 }) }));
    if (Furn.cache.benchPark) M.instances(G, 'benchPark', benches);
    M.instances(G, Furn.cache.lampPH ? 'lampPH' : 'lampCity', lamps);
    Duze.doors.rynek = { x: Ry.cx - 40, z: Ry.z1 - 5, yaw: 0 };
    (M.spotsBase || []).push({ id: 'sm:stall', x: stalls[1][0], z: stalls[1][1] - 1.8, label: '🥨 Stragan — obwarzanek i kawa (8 zł)', r: 2.2 }, { id: 'sm:busker', x: Ry.cx - 58, z: Ry.cz + 6, label: '🎻 Uliczny grajek — posłuchaj chwilę', r: 3 },
      { id: 'sm:bus', x: Ry.cx - 40, z: Ry.z1 - 2.5, label: '🚌 Przystanek „Rynek” — odjazdy', r: 2.2 });
    Furn.place(G, 'busShelter', Ry.cx - 40, 0, Ry.z1 + 1, Math.PI, { w: 4 });
    // 4) budynki scalone w jedną siatkę na materiał, okna hurtem
    World.mergeBuildings(hi);
    const mb = World.mergeBuildings; World.mergeBuildings = () => {};
    try { World.flushWindows(); } finally { World.mergeBuildings = mb; World._win = winPrev; }
    hi.traverse(o => { if (o.isInstancedMesh) o.frustumCulled = false; }); // perf.js dzieli je na kwadraty z własną sferą
    G.add(hi);
    Object.entries(models).forEach(([k, l]) => M.instances(G, k, l));
    // 5) bulwar nad rzeką: drzewa i ławki po obu brzegach (x 420–1130)
    const trees = [], tb = [];
    for (let x = 420; x < 1130; x += 14) [-1, 1].forEach(sd => { const z = M.riverZ(x) + sd * 13; if (M.segs().some(o => !o.dummy && Duze.segD(o, x, z) < o.wd / 2 + 4)) return; trees.push({ x, z, rot: x, h: 8 + (x % 5) }); if (x % 42 === 0) tb.push({ x, z: z + sd * 2, r: sd > 0 ? Math.PI : 0, s: 1 }); });
    World.treeBillboards('small', trees, G); if (Furn.cache.benchPark) M.instances(G, 'benchPark', tb);
    Duze.refresh();
  },

  /** Las miejski (północ), pola (południe), trawa pod całą mapą, plac budowy (gdy zamknięte) */
  outskirts(G) {
    const M = Miasto, unl = Duze.unlocked();
    let rs = 41; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const W = Duze.X1 - Duze.X0 + 400, D = Duze.Z1 - Duze.Z0 + 400;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(W, D), World.pbr('leafy_grass', W / 8, D / 8, { color: '#86a064' })); grass.rotation.x = -Math.PI / 2; grass.position.set((Duze.X0 + Duze.X1) / 2, -0.06, 0); grass.receiveShadow = true; G.add(grass);
    const near = (x, z, pad) => M.segs().some(o => !o.dummy && Duze.segD(o, x, z) < o.wd / 2 + pad) || M.inStadium(x, z, pad + 6) || M.col.some(c => x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad);
    const oak = [], small = [];
    for (let i = 0; i < 2600 && oak.length + small.length < 1500; i++) {
      const x = Duze.X0 + 8 + rnd() * (Duze.X1 - Duze.X0 - 16), z = Duze.Z0 + 8 + rnd() * 290; // pas lasu na północy
      if (z > -275 || near(x, z, 6)) continue;
      (rnd() < 0.55 ? oak : small).push({ x, z, rot: rnd() * 6, h: 9 + rnd() * 7 });
    }
    // pola na południu: pasy ziemi i zboża z miedzami, aleje drzew
    const fields = new THREE.Group(), cols = ['#a08a6a', '#c8b46a', '#7f9a55', '#b39b6e'];
    for (let x = Duze.X0 + 20; x < Duze.X1 - 60; x += 130) {
      const z0 = 410, z1 = Duze.Z1 - 14, w = 118; if (near(x + w / 2, (z0 + z1) / 2, 30)) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), World.pbr('raked_dirt', w / 6, (z1 - z0) / 6, { color: cols[Math.floor(rnd() * cols.length)] }));
      m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, -0.02, (z0 + z1) / 2); m.receiveShadow = true; fields.add(m);
      for (let z = z0 + 6; z < z1; z += 16) small.push({ x: x + w + 6, z, rot: z, h: 8 + rnd() * 3 });
    }
    G.add(fields);
    World.treeBillboards('oak', oak, G); World.treeBillboards('small', small, G);
    // plac budowy: płot przez całą mapę, bariery na jezdniach, tablice z terminem
    Duze.site = null;
    if (!unl) {
      const S = new THREE.Group(), D3 = new THREE.Object3D(), list = [];
      for (let z = Duze.Z0; z < Duze.Z1; z += 3.2) list.push(z);
      const mesh = World.canvasTex(64, 64, c => { c.fillStyle = '#e8762c'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#f7d6b8'; c.lineWidth = 2; for (let i = -64; i < 64; i += 10) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } });
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 2, 3.1), new THREE.MeshStandardMaterial({ map: mesh, transparent: true, opacity: 0.92 }), list.length);
      list.forEach((z, i) => { D3.position.set(394, 1, z + 1.6); D3.updateMatrix(); im.setMatrixAt(i, D3.matrix); }); S.add(im);
      M.col.push({ x0: 392.5, x1: 395.5, z0: Duze.Z0 - 10, z1: Duze.Z1 + 10 });
      [-28, 148].forEach(z => {
        if (Furn.cache.barrier) for (let k = -2; k <= 2; k++) Furn.place(S, 'barrier', 390, 0, z + k * 2.2, Math.PI / 2, { w: 2 });
        const tex = World.canvasTex(512, 256, c => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, 512, 256); c.fillStyle = '#1a1a1a'; c.font = 'bold 54px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('STARE MIASTO', 256, 80); c.font = '600 34px Barlow, sans-serif'; c.fillText('Remont estakady i Rynku', 256, 140); c.fillText(`Otwarcie za ${Duze.weeksLeft()} tyg.`, 256, 200); });
        const b = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide })); b.position.set(388, 2.4, z + 5.5); b.rotation.y = -Math.PI / 2; S.add(b);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x777777 })); post.position.set(388.05, 1.2, z + 5.5); S.add(post);
      });
      if (Furn.cache.siteCabin) Furn.place(S, 'siteCabin', 420, 0, 60, 0, { w: 6 });
      G.add(S); Duze.site = S;
    }
  },

  /** Ruch w dzielnicy: dodatkowe auta na jej ulicach */
  traffic(G) {
    const M = Miasto, segs = M.segs(); if (!M.traffic) return;
    const mine = segs.map((s, i) => [s, i]).filter(([s]) => Duze.ROADS.includes(s.name) && s.len > 30 && Math.max(s.a.x, s.b.x) > 400);
    ['carSedan', 'car126p', 'hatch3', 'estate', 'carSuv', 'car125p', 'bus', 'saloon', 'carGT', 'police'].forEach((k, i) => {
      if (!mine.length || !Furn.cache[k]) return; const [s, si] = mine[(i * 3) % mine.length], len = M.LEN[k] || 4.6, g = Furn.place(G, k, 0, 0, 0, 0, { w: len }); if (!g) return;
      M.traffic.push({ g, k, hl: len / 2, seg: si, t: s.len * (0.2 + (i % 5) * 0.15), dir: i % 2 ? 1 : -1, v: k === 'bus' ? 7 : 9 + (i % 3), police: k === 'police' });
    });
  },
  refresh() {
    const own = Duze.career() && Game.s.career.rj && Game.s.career.rj.house;
    (Miasto.spotsBase || []).forEach(sp => {
      if (!sp.id.startsWith('sm:home:')) return; const k = sp.id.slice(8), H = Rejon.HOUSES.find(h => h.id === k); if (!H) return;
      sp.label = own === k ? `🏠 ${H.n} — twój dom, wejdź` : `🏠 ${H.n} — na sprzedaż (obejrzyj)`;
    });
  },

  /* ---------- wnętrza: budowane przy pierwszym wejściu ---------- */
  ROOMS: {
    museum: { cx: -300, W: 18, D: 12, H: 4.6, name: 'Muzeum Żużla', o: { floorTex: 'wood_floor', wallTex: 'brick_wall_02', wallTint: '#c79a82', lampI: 0.95 },
      spots: [{ id: 'sm:mus:tour', x: 0, z: -1, label: 'Zwiedzaj wystawę — historia polskiego żużla', r: 2.4 }, { id: 'sm:mus:fame', x: -6.5, z: -3.6, label: 'Ściana sław — twoje trofea i wyniki', r: 1.8 }],
      furn: [['trophyCab', -7.6, 0, -5.4, 0, {}], ['trophyCab', -5.2, 0, -5.4, 0, {}], ['bikeJawa', 3.2, 0.5, -3.2, 0.5, { w: 2.1 }], ['bikeTracker', 6.6, 0.5, -3.2, -0.5, { w: 2.1 }], ['bikeDirt', 6.2, 0, 3.3, Math.PI + 0.4, { w: 2 }],
        ['helmetRetro', -1.2, 1.1, -5.3, 0, { h: 0.3 }], ['helmetRetro', 0.3, 1.1, -5.3, 0.5, { h: 0.3 }], ['frame2', -8.95, 1.7, 0, Math.PI / 2, {}], ['frame2', 8.95, 1.7, 0, -Math.PI / 2, {}], ['plant4', -8.2, 0, 5.2, 0, {}], ['plant4', 8.2, 0, 5.2, 0, {}]],
      npc: [{ x: -3.5, z: 3.6, face: Math.PI, pose: 'idle' }] },
    agency: { cx: -340, W: 10, D: 8, H: 3.2, name: 'Biuro nieruchomości „Kamienica”', o: { floorTex: 'wood_floor', wallTex: 'white_plaster_02', homey: true },
      spots: [{ id: 'sm:agency', x: 0, z: -1.6, label: 'Oferty: mieszkania i domy na sprzedaż', r: 2 }],
      furn: [['officeDesk', 0, 0, -2.4, 0, {}], ['officeChair', 0, 0, -3.3, 0, {}], ['officeChair', -0.6, 0, -1.2, Math.PI, {}], ['officeChair', 0.6, 0, -1.2, Math.PI, {}], ['laptop', 0.2, 'top:officeDesk', -2.4, Math.PI, {}],
        ['filing', -4.4, 0, -3.3, Math.PI / 2, {}], ['bookshelf', 4.2, 0, -3.6, 0, {}], ['loungeSofa', 3.2, 0, 2.6, Math.PI, {}], ['plant1', -4.4, 0, 3.4, 0, {}], ['plant2', 4.5, 0, 0.4, 0, {}], ['frame2', -4.95, 1.6, 0.4, Math.PI / 2, {}]],
      npc: [{ x: 0, z: -3.3, face: 0, pose: 'idle' }] },
    cinema: { cx: -385, W: 14, D: 16, H: 5.2, name: 'Kino „Polonia”', o: { wall: 0x3a1c22, floor: '#3a2224', lines: '#2a1618', lampI: 0.3, ceil: 0x09080b },
      spots: [{ id: 'sm:cin:film', x: 0, z: 2.5, label: 'Obejrzyj film (35 zł)', r: 2.6 }], furn: [], npc: [] },
    salon: { cx: -440, W: 22, D: 14, H: 5, name: 'Salon samochodowy', o: { floorTex: 'floor_tiles_06', wall: 0xe8eaec, lampI: 1.1 },
      spots: [{ id: 'sm:salon', x: 0, z: 3.2, label: 'Doradca — kup samochód', r: 2.2 }],
      furn: [['carGT', -6.5, 0, -2.6, 0.6, { w: 4.4 }], ['carCoupe2', 0, 0, -3.2, 0.25, { w: 4.3 }], ['carSuv', 6.5, 0, -2.6, -0.6, { w: 4.7 }], ['saloon', -6, 0, 3.4, 2.5, { w: 4.7 }], ['estate', 6.5, 0, 3.4, -2.5, { w: 4.6 }],
        ['officeDesk', 0, 0, 4.6, Math.PI, {}], ['plant4', -10.2, 0, 6.2, 0, {}], ['plant4', 10.2, 0, 6.2, 0, {}]],
      npc: [{ x: 0, z: 5.4, face: Math.PI, pose: 'idle' }] },
    apt2: { cx: -500, W: 7.4, D: 11, H: 2.62, name: 'Twój apartament', flat: true,
      spots: [{ id: 'sm:apt:rest', x: 1.3, z: 1.5, label: 'Odpocznij na kanapie (energia, stres)', r: 1.8 }, { id: 'sm:apt:sleep', x: -1.6, z: -3.5, label: 'Idź spać — koniec dnia', r: 1.8 }], furn: [], npc: [] },
  },
  room(key) {
    if (World.rooms[key]) return World.rooms[key];
    const D = Duze.ROOMS[key]; if (!D) return null;
    let G;
    if (D.flat) { // jak mieszkanie w bloku (FlatX): ściany + gotowe wnętrze z modelu
      const Y = World.LOCKER_Y; G = new THREE.Group(); World.venueGroup.add(G); G.userData.lights = [];
      [[-1.8, 3.2], [1.5, 3.4], [2.6, 0.5], [0.3, -2.4], [-2.2, -3.6]].forEach(([x, z]) => { const l = new THREE.PointLight(0xfff0dc, 0.6, 7, 1.6); l.position.set(D.cx + x, Y + 2.3, z); l.visible = false; G.add(l); G.userData.lights.push(l); });
      const wallM = World.pbr('painted_plaster_wall', 3, 1, { color: '#ece6d8' });
      [[0, -D.D / 2 - 0.06, D.W + 0.3, 0.12], [0, D.D / 2 + 0.06, D.W + 0.3, 0.12], [-D.W / 2 - 0.06, 0, 0.12, D.D + 0.3], [D.W / 2 + 0.06, 0, 0.12, D.D + 0.3]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, D.H, d), wallM); m.position.set(D.cx + x, Y + D.H / 2, z); G.add(m); });
    } else G = World.roomShell(D.cx, D.W, D.D, D.H, D.o);
    World.rooms[key] = { cx: D.cx, W: D.W, D: D.D, name: D.name, exitTo: null, group: G, spots: D.spots, npc: D.npc, crowd: [], flat: !!D.flat };
    Rooms.FURN[key] = D.furn;
    if (key === 'cinema') Duze.cinemaHall(G, D);
    return World.rooms[key];
  },
  cinemaHall(G, D) {
    const scr = World.canvasTex(512, 256, c => {
      const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#26314a'); g.addColorStop(0.55, '#d98a5a'); g.addColorStop(1, '#2a1a12'); c.fillStyle = g; c.fillRect(0, 0, 512, 256);
      c.fillStyle = '#111'; c.fillRect(0, 196, 512, 60); c.strokeStyle = '#eee'; c.lineWidth = 3; c.beginPath(); c.ellipse(256, 226, 230, 22, 0, 0, 7); c.stroke();
      [[150, 205], [230, 212], [320, 208]].forEach(([x, y], i) => { c.fillStyle = ['#c0392b', '#2e86de', '#f1c40f'][i]; c.fillRect(x, y - 18, 26, 14); c.beginPath(); c.arc(x + 4, y, 6, 0, 7); c.arc(x + 24, y, 7, 0, 7); c.fill(); });
      c.fillStyle = '#fff'; c.font = 'bold 30px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('„OSTATNI ŁUK”', 256, 60);
    });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: scr })); s.position.set(0, 2.9, -D.D / 2 + 0.08); G.add(s);
    const seats = [], Do = new THREE.Object3D();
    for (let r = 0; r < 6; r++) for (let i = 0; i < 9; i++) if (i !== 4) seats.push([-4.8 + i * 1.2, -1 + r * 1.35, r * 0.18]);
    const sm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.9, 0.8), new THREE.MeshStandardMaterial({ color: 0x8e1b24, roughness: 0.8 }), seats.length);
    seats.forEach(([x, z, y], i) => { Do.position.set(x, 0.45 + y, z); Do.updateMatrix(); sm.setMatrixAt(i, Do.matrix); }); G.add(sm);
  },
  /** Wejście do budynku z ulicy: drzwi, płynne przejście, wyjście tymi samymi drzwiami */
  enter(door, roomKey) {
    const R = Duze.room(roomKey); if (!R) return;
    const go = () => { City._door = door; City._world = true; Walk.enterRoom(roomKey); if (roomKey === 'apt2') Duze.furnishFlat(); };
    if (typeof Door !== 'undefined' && Door.fade) Door.fade(go, R.name); else go();
  },
  furnishFlat() {
    const R = World.rooms.apt2; Furn.load(['flatHome'], () => {
      if (Walk.room !== 'apt2') return;
      const g = Furn.place(World.venueGroup, 'flatHome', R.cx, World.LOCKER_Y, 0, 0, { s: 1 }); if (!g) return; Rooms.dyn.push(g);
      if (!R.meshCol && typeof MeshCol !== 'undefined') R.meshCol = MeshCol.build(g, World.LOCKER_Y); Rooms._mcR = null;
      Walk.x = R.cx + 1.3; Walk.z = 4.3; Walk.yaw = 0;
    });
  },

  /* ---------- zajęcia ---------- */
  act(id) {
    const C = Career.C(), Z = City.Z(), J = C.rj;
    const lim = k => { City.LIMITS[k] = City.LIMITS[k] || { d: 1 }; return City.gate(k); };
    if (City.weekDone() && !['sm:mus:fame', 'sm:agency', 'sm:salon', 'sm:bus'].includes(id)) { UI.toast('Tydzień dobiegł końca — kliknij „Zakończ tydzień”.', true); return; }
    switch (id) {
      case 'sm:mus:tour': {
        if (!lim('d2_mus')) return; if (C.money < 20) { UI.toast('Bilet kosztuje 20 zł.', true); return; }
        Career.pay(-20, 'Muzeum Żużla — bilet'); Z.stress -= 10; const w = (C.musWk || 0) !== Game.s.week; if (w) { C.musWk = Game.s.week; Career.repd(1); }
        const g = Career.grow('mental', 0.12);
        City.pay(Z, { id: 'd2_mus', n: 'Muzeum Żużla' }, `Motocykle z lat 60., kaski ze skóry, zdjęcia legend z taśmy. ${w ? 'Przewodnik cię poznaje — reputacja +1. ' : ''}${g}`.trim()); return;
      }
      case 'sm:mus:fame': {
        const r = Career.me(), T = C.trophies || [];
        UI.modal(`<div class="row between"><span class="kicker">Muzeum Żużla</span><button class="x" data-ui="close">×</button></div><h2>Ściana sław</h2>
          <p>${esc(r.name)} — ${r.age} lat, KSM ${num(r.ksm)}, reputacja ${Math.round(C.rep)}.</p>
          ${T.length ? `<ul class="list small">${T.slice(0, 12).map(t => `<li>🏆 ${esc(typeof t === 'string' ? t : (t.name || t.n || JSON.stringify(t)))}</li>`).join('')}</ul>` : '<p class="small muted">Jeszcze nie ma tu twojego zdjęcia. Wygraj coś, a kustosz powiesi je obok legend.</p>'}
          <div class="actions"><button class="go" data-ui="close">Wróć</button></div>`); return;
      }
      case 'sm:agency': Duze.agencyModal(); return;
      case 'sm:cin:film': {
        if (!lim('d2_cin')) return; if (C.money < 35) { UI.toast('Bilet kosztuje 35 zł.', true); return; }
        Career.pay(-35, 'Kino „Polonia”'); Z.stress -= 16; Z.food -= 4; let msg = Crowd.pick(['„Ostatni łuk” — film o żużlowcu z blokowiska. Na sali kilka osób cię rozpoznaje.', 'Komedia z lat 90. Popcorn, śmiech, stres −16.', 'Dramat sportowy. Wychodzisz z ochotą na trening.']);
        if (Z.gf) { Z.gf.rel += 6; msg += ` ${Z.gf.name} trzyma cię za rękę przez cały seans.`; }
        City.pay(Z, { id: 'd2_cin', n: 'Kino' }, msg); return;
      }
      case 'sm:salon': Duze.salonModal(); return;
      case 'sm:apt:rest': if (!lim('d2_rest')) return; Z.energy += 18; Z.stress -= 10; City.pay(Z, { id: 'd2_rest', n: 'Odpoczynek w apartamencie' }, 'Widok na Rynek, cisza, kawa z ekspresu. Energia +18, stres −10.'); return;
      case 'sm:apt:sleep': if (!confirm('Iść spać? Dzień się skończy.')) return; City.endDay(true); return;
      case 'sm:stall': if (!lim('d2_stall')) return; if (C.money < 8) { UI.toast('Za mało pieniędzy.', true); return; } Career.pay(-8, 'Obwarzanek i kawa'); Z.food += 12; Z.stress -= 3; City.pay(Z, { id: 'd2_stall', n: 'Stragan na Rynku' }, 'Obwarzanek z makiem i kawa z termosu. Jedzenie +12.'); return;
      case 'sm:busker': if (!lim('d2_busk')) return; Z.stress -= 6; Career.mor(1); City.pay(Z, { id: 'd2_busk', n: 'Grajek na Rynku' }, Crowd.pick(['Skrzypek gra „Czerwone korale”. Wrzucasz drobne do futerału.', 'Chłopak z gitarą śpiewa o żużlu. Tłum klaszcze.'])); return;
      case 'sm:bus': Duze.busModal(); return;
    }
  },
  agencyModal() {
    const C = Career.C(), J = C.rj, unl = Duze.unlocked();
    UI.modal(`<div class="row between"><span class="kicker">Biuro nieruchomości „Kamienica”</span><button class="x" data-ui="close">×</button></div><h2>Oferty</h2><p class="small">Masz ${C.money.toLocaleString('pl-PL')} zł${J && J.house ? ` · twój dom: <b>${esc((Rejon.HOUSES.find(h => h.id === J.house) || {}).n || '')}</b> (zamiana: 80% wartości wraca)` : ''}</p>
      <div class="talk-opts">${Rejon.HOUSES.map(H => `<button class="opt" data-ui="rjBuy" data-v="${H.id}" ${J && J.house === H.id || C.money < H.price || (H.d2 && !unl) ? 'disabled' : ''}><b>${esc(H.n)} — ${H.price.toLocaleString('pl-PL')} zł</b><small>${H.d2 ? 'Stare Miasto' : 'Osiedle „Słoneczne”'} · wygoda +${H.comfort} · ${esc(H.d)}</small></button>`).join('')}</div>`);
  },
  CARS: [['saloon', 'Limuzyna biznesowa', 320000, 7, 8], ['suvcoupe', 'SUV coupé premium', 420000, 7, 10]],
  salonModal() {
    const C = Career.C();
    UI.modal(`<div class="row between"><span class="kicker">Salon samochodowy</span><button class="x" data-ui="close">×</button></div><h2>Wybierz auto</h2><p class="small">Masz ${C.money.toLocaleString('pl-PL')} zł${C.car ? ` · obecne auto odkupimy za 55% ceny` : ''}</p>
      <div class="talk-opts">${Garage.CARS.map(c => `<button class="opt" data-ui="cCar" data-v="${c[0]}" ${C.car === c[0] ? 'disabled' : ''}><b>${esc(c[1])} — ${c[2].toLocaleString('pl-PL')} zł</b><small>energia +${c[3]} tygodniowo · prestiż +${c[4]}${C.car === c[0] ? ' · twoje' : ''}</small></button>`).join('')}</div>`);
  },
  busModal() {
    const C = Career.C(); City._busFrom = 'rynek';
    const list = Object.keys(Miasto.doors || {}).filter(k => City.PLACES[k]);
    UI.modal(`<div class="row between"><span class="kicker">🚌 Przystanek „Rynek”</span><button class="x" data-ui="close">×</button></div><h2>Dokąd jedziesz?</h2><p class="small muted">Bilet 4 zł · godzina: ${City.timeStr()}</p>
      <div class="talk-opts">${list.map(k => `<button class="opt" data-ui="cBus" data-v="${k}" ${C.money < 4 ? 'disabled' : ''}>${City.PLACES[k].icon} ${esc(City.PLACES[k].name)} <small>ok. 15 min</small></button>`).join('')}<button class="opt" data-ui="cBus" data-v="tor">🏁 Stadion <small>ok. 15 min</small></button></div>`);
  },
  /** Dom w dzielnicy: obejrzyj / kup / wejdź */
  home(k) {
    const J = Career.C().rj, H = Rejon.HOUSES.find(h => h.id === k); if (!H) return;
    if (J && J.house === k) { Duze.enter(k, 'apt2'); return; }
    UI.modal(`<div class="row between"><span class="kicker">Stare Miasto</span><button class="x" data-ui="close">×</button></div><h2>${esc(H.n)}</h2><p>${esc(H.d)}</p>
      <p><b>${H.price.toLocaleString('pl-PL')} zł</b> · wygoda +${H.comfort} · masz ${Career.C().money.toLocaleString('pl-PL')} zł</p>
      <div class="actions"><button class="go" data-ui="rjBuy" data-v="${k}" ${Career.C().money < H.price ? 'disabled' : ''}>Kupuję</button><button class="ghost" data-ui="close">Może kiedyś</button></div>`);
  },
  /** Karta w zakładce Rejon */
  card() {
    const unl = Duze.unlocked();
    return `<div class="card s12"><h3>🏛 Stare Miasto</h3>${unl
      ? '<p class="small">Otwarte! Na wschodzie miasta: Rynek z ratuszem, Muzeum Żużla, Kino „Polonia”, Salon samochodowy i Biuro nieruchomości. Nowe domy: mieszkanie w kamienicy, loft nad rzeką, penthouse „Panorama”. Dojazd: ul. Wschodnia, ul. Nadrzeczna albo autobus „Rynek”.</p>'
      : `<p class="small">Remont estakady i Rynku — otwarcie za <b>${Duze.weeksLeft()} tyg.</b> Za płotem budowy na wschodzie miasta czekają: Rynek, Muzeum Żużla, kino, salon samochodowy i nowe mieszkania.</p>`}</div>`;
  },
};

// nowe domy (Stare Miasto) — kupno w zakładce Rejon i w biurze nieruchomości
Rejon.HOUSES.push(
  { id: 'kamienica', n: 'Mieszkanie w kamienicy na Rynku', price: 650000, comfort: 14, d2: true, d: 'Wysokie sufity, sztukaterie i widok na ratusz. Rano słychać hejnał.' },
  { id: 'loft', n: 'Loft nad rzeką', price: 1200000, comfort: 18, d2: true, d: 'Cegła, stal i wielkie okna na bulwar. Garaż na motocykl w cenie.' },
  { id: 'penthouse', n: 'Penthouse „Panorama”', price: 3500000, comfort: 28, d2: true, d: 'Najwyższe piętro, taras z widokiem na całe miasto i stadion.' },
);
Object.assign(City.DUR, { d2_mus: 90, d2_cin: 120, d2_rest: 60, d2_stall: 15, d2_busk: 15 });
Furn.SRC.suvcoupe = Furn.SRC.suvcoupe || 'a3d/suvcoupe.glb';
Duze.OLD_MODELS.forEach(k => { Furn.SRC[k] = Furn.SRC[k] || 'cat/' + k + '.glb'; });
if (typeof Garage !== 'undefined') Duze.CARS.forEach(c => { if (!Garage.CARS.some(x => x[0] === c[0])) Garage.CARS.push(c); });
Duze.applyRoads();

/* =========================================================
   PODPIĘCIE
   ========================================================= */
(() => {
  const M = Miasto;
  // modele dzielnicy wczytywane razem z miastem
  const bk = M.keys;
  M.keys = function () { const k = bk.call(this); return M.CUSTOM ? k : [...new Set([...k, ...Duze.OLD_MODELS, 'barrier', 'siteCabin', 'benchPark', 'lampPH', 'busShelter'])]; };
  // przed budową: drogi zależne od tego, czy dzielnica jest otwarta (zmiana → przebudowa, gdy gracz nie jest w mieście)
  const bb = M.build;
  M.build = function (cb) {
    if (World.rooms && World.rooms.miasto && !M.CUSTOM && Duze._builtUnl != null && Duze._builtUnl !== Duze.unlocked() && Walk.room !== 'miasto' && typeof CustomMap !== 'undefined') CustomMap.teardown();
    if (!(World.rooms && World.rooms.miasto)) Duze.applyRoads();
    return bb.call(this, cb);
  };
  // rzeka przez całą szerokość nowej mapy (jedna woda — jedno odbicie)
  const bw = M.addWater;
  M.addWater = function () {
    const w = M.W, G = M.G, n0 = G ? G.children.length : 0; if (!M.CUSTOM) M.W = 2 * (Duze.X1 + 40);
    try { bw.apply(this, arguments); } finally { M.W = w; }
    // nabrzeża: setki krótkich brył → jedna siatka na materiał
    if (!G || typeof Props === 'undefined') return;
    const added = G.children.slice(n0).filter(o => o.isMesh && o !== M.water && !o.isInstancedMesh), by = new Map();
    if (added.length < 20) return;
    added.forEach(o => { o.updateMatrix(); let g = Props.toFloat(o.geometry.clone()); if (g.index) g = g.toNonIndexed(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); g.applyMatrix4(o.matrix); if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g); G.remove(o); });
    by.forEach((list, mat) => { const m = new THREE.Mesh(Props.mergeGeos(list), mat); m.receiveShadow = true; G.add(m); });
  };
  const bm = M.make;
  M.make = function () {
    const r = bm.apply(this, arguments);
    if (M.CUSTOM || !M.G) return r;
    try {
      Duze._builtUnl = Duze.unlocked();
      // woda poza starą mapą: kolizje (mosty tam, gdzie droga)
      for (let x = M.W / 2 + 20; x < Duze.X1 + 20; x += 8) { const z0 = M.riverZ(x), z1 = M.riverZ(x + 8), n = M.nearest(x + 4, (z0 + z1) / 2); if (!n || n.d > n.s.wd / 2 + 3) M.col.push({ x0: x, x1: x + 8, z0: Math.min(z0, z1) - 7, z1: Math.max(z0, z1) + 7 }); }
      Duze.make(M.G); Duze.outskirts(M.G); Duze.traffic(M.G); // najpierw budynki — las i pola omijają ich obrysy
      const Rm = World.rooms.miasto; if (Rm) { Rm.cx = M.CX + (Duze.X0 + Duze.X1) / 2; Rm.W = Duze.X1 - Duze.X0; Rm.D = Duze.Z1 - Duze.Z0; }
      M.W = 2 * Duze.X1; M.D = Duze.Z1 - Duze.Z0; if (typeof MiniMap !== 'undefined') MiniMap._L = null; // minimapa obejmuje całą mapę
    } catch (e) { console.error(e); Main.err(e); }
    return r;
  };
  // niebo idzie za kamerą (mapa jest większa niż kula nieba)
  const bt = M.tick;
  M.tick = function (dt) { if (M.sky && Walk.room === 'miasto') M.sky.position.set(Walk.x - M.CX, 0, Walk.z); return bt.call(this, dt); };
  // więcej przechodniów — także w nowej dzielnicy
  const bsw = M.spawnWalkers;
  M.spawnWalkers = function () {
    const had = !!M.walkers; bsw.call(this); if (had || !M.walkers || !Humans.ready || M.CUSTOM) return;
    const segs = M.segs(), mine = segs.map((s, i) => [s, i]).filter(([s]) => Duze.ROADS.includes(s.name) && s.len > 30 && Math.max(s.a.x, s.b.x) > 400);
    for (let i = 0; i < 12 && mine.length; i++) { const m = Humans.make(null, 'walk', { sex: i % 3 ? 'm' : 'f' }); if (!m) continue; const [s, seg] = mine[(i * 5) % mine.length]; M.G.add(m); M.walkers.push({ m, seg, t: 5 + ((i * 37) % Math.max(1, s.len - 10)), dir: i % 2 ? 1 : -1, side: i % 4 < 2 ? 1 : -1, v: m.userData.human ? m.userData.human.speed * m.userData.human.act.timeScale : 1.3 }); }
  };
  // wyjście z budynku dzielnicy: przed jego drzwi
  const btd = M.toDoor;
  M.toDoor = function (place) {
    const d = Duze.doors[place];
    if (!d || (M.doors && M.doors[place])) return btd.call(this, place);
    Walk.x = M.CX + d.x; Walk.z = d.z; Walk.yaw = d.yaw; Walk.pitch = -0.05; // twarzą do ulicy
  };
  // miejsca akcji w dzielnicy
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id.startsWith('sm:in:')) { const S = Duze.SPECIAL.find(s => s.key === id.slice(6)); if (S) Duze.enter(S.key, S.room); return true; }
    if (id.startsWith('sm:home:')) { Duze.home(id.slice(8)); return true; }
    if (id.startsWith('sm:')) { Duze.act(id); return true; }
    return bra.call(this, id);
  };
  // muzeum: dwa motocykle żużlowe na podestach (proceduralne, z barwami klubu)
  const bp = Rooms.populate;
  Rooms.populate = function (key) {
    const sp = bp.call(this, key);
    if (key === 'museum' && typeof Bike !== 'undefined') {
      const R = World.rooms.museum, cols = [['#b22222', '#f2c230'], ['#1f4fb0', '#f4f4f4']];
      cols.forEach(([kev, trim], i) => { const b = Bike.build({ kevlar: kev, trim, helmet: '#333', no: i + 1, name: '' }, { noTag: true }); b.rider.visible = false; b.root.position.set(R.cx - 3 + i * 3.4, World.LOCKER_Y + 0.25, 1.2); b.root.rotation.y = Math.PI / 2 + (i ? 0.4 : -0.4); Rooms.add(b.root); });
      const pod = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 2.6), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.5 })); pod.position.set(R.cx - 1.3, World.LOCKER_Y + 0.125, 1.2); Rooms.add(pod);
      const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.6), new THREE.MeshStandardMaterial({ color: 0xece8e0 })); ped.position.set(R.cx - 0.45, World.LOCKER_Y + 0.55, -5.3); Rooms.add(ped);
      Rooms.tag(R, 'Historia polskiego żużla 1948–2026', 0, -5.6, '#E0632E', 3.4);
    }
    if (key === 'salon') Rooms.tag(World.rooms.salon, 'Nowości sezonu', 0, -6.5, '#2e86de', 3.8);
    return sp;
  };
  // wejście do budynków: pozycja przy drzwiach w środku
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { if (key === 'miasto') Duze.refresh(); return be.call(this, key); };
  // zakup domu w dzielnicy: tylko gdy otwarta
  const bb2 = Rejon.buy;
  Rejon.buy = function (id) { const H = Rejon.HOUSES.find(h => h.id === id); if (H && H.d2 && !Duze.unlocked()) { UI.toast(`Stare Miasto otworzy się za ${Duze.weeksLeft()} tyg.`, true); return; } UI.close(); bb2.call(this, id); Duze.refresh(); };
  // zakładka Rejon: karta dzielnicy
  const bv = Rejon.view;
  Rejon.view = function () { return bv.call(this).replace('<div class="grid">', '<div class="grid">' + Duze.card()); };
  // autobus z dowolnego przystanku: dodatkowo „Rynek”
  const bbm = M.busModal;
  M.busModal = function (from) {
    bbm.call(this, from); if (!Duze.unlocked() || M.CUSTOM) return;
    const o = document.querySelector('#modal .talk-opts'); if (o) o.insertAdjacentHTML('beforeend', `<button class="opt" data-ui="dzBus" ${Career.C().money < 4 ? 'disabled' : ''}>🏛 Rynek (Stare Miasto) <small>ok. 15 min</small></button>`);
  };
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'dzBus') { UI.close(); Career.pay(-4, 'Bilet autobusowy'); City.advance(15); const go = () => M.toDoor('rynek'); if (typeof Door !== 'undefined' && Door.fade) Door.fade(go, 'Rynek'); else go(); return true; }
    return bc.call(this, d);
  };
  // tydzień: licznik do otwarcia dzielnicy
  const bfw = Career.finishWeek;
  Career.finishWeek = function (um) {
    const C = Career.C(), was = Duze.unlocked(); C.wkCount = (C.wkCount || 0) + 1;
    const res = bfw.call(this, um);
    if (!was && Duze.unlocked()) {
      C.d2 = true; Game.news('Otwarto nową estakadę i odnowione Stare Miasto: Rynek, Muzeum Żużla, kino i salon samochodowy!', 'good');
      City.sms('Seba', 'Ej, otworzyli Stare Miasto! Rynek, kino, muzeum żużla. Jedziemy?');
      if (C.report) C.report.lines.push('🏛 Otwarcie Starego Miasta — nowa dzielnica na wschodzie miasta.');
      if (World.rooms && World.rooms.miasto && Walk.room !== 'miasto' && typeof CustomMap !== 'undefined') CustomMap.teardown(); // przebuduje się przy wyjściu na miasto
      Game.save();
    }
    return res;
  };
})();
