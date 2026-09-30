/* =========================================================
   Speedway Empire 3D — v2.7: miasto z EDYTORA MAPY (editor.html)
   • gdy w edytorze zaznaczono „Użyj w grze”, miasto buduje się z mapy gracza:
     drogi i chodniki różnych rodzajów, woda (z mostami), trawniki, place,
     wszystkie modele z katalogu, lokale z gry w wybranych miejscach, stadion
   • budynki z wejściem prowadzą do mieszkania (klatka → mieszkanie)
   • wszystko blokuje przejście (budynki po dokładnym obrysie — career18)
   • otwarta gra sama przebudowuje miasto po zapisie w edytorze
   ========================================================= */
'use strict';

const CustomMap = {
  cat: null, byId: {},
  loadCat() {
    if (CustomMap._p) return CustomMap._p;
    return (CustomMap._p = fetch('models/cat/catalog.json', { cache: 'no-cache' }).then(r => r.json()).then(c => { CustomMap.cat = c; c.forEach(e => { CustomMap.byId[e.id] = e; }); }).catch(e => { console.warn('Katalog modeli', e); CustomMap.cat = []; }));
  },
  san: s => s.replace(/[^a-zA-Z0-9]/g, '_'),
  /** klucz Furn dla wpisu katalogu; przedrostek decyduje o kolizji: prl… budynek (obrys), lamp…/tree… słupek, reszta prostokąt */
  key(e) { return ({ b: 'prlC_', p: 'lampC_', t: 'treeC_' }[e.k] || 'cC_') + CustomMap.san(e.id); },
  register(e) {
    const k = CustomMap.key(e); if (Furn.SRC[k] != null) return k;
    if (e.part) { const set = 'cF_' + CustomMap.san(e.f); Furn.SRC[set] = e.f; Furn.PART[k] = [set, e.part]; Furn.SRC[k] = ''; }
    else Furn.SRC[k] = e.f;
    const F = {}; ['ry', 's', 'drop', 'roof', 'pv'].forEach(p => { if (e[p] != null) F[p] = p === 'roof' ? !!e[p] : e[p]; });
    if (!e.ry && !e.s && !e.drop && !e.roof && e.f.startsWith('kfurn')) F.s = 1.85;
    Furn.FIX[k] = F; return k;
  },
  /** skala jak w edytorze: w (długość) / h (wysokość) / naturalna × skala obiektu */
  scale(e, k, s) { const C = Furn.cache[k]; if (!C) return s || 1; const b = e.w ? e.w / Math.max(C.size.x, C.size.z) : e.h ? e.h / C.size.y : 1; return b * (s || 1); },
  keys(map) { const out = new Set(); map.objs.forEach(o => { const e = CustomMap.byId[o.c]; if (e) out.add(CustomMap.key(e)); }); return [...out]; },
  sig() { try { return (localStorage.getItem(MapDefs.USE) || '') + ':' + (localStorage.getItem(MapDefs.KEY) || '').length + ':' + CustomMap.hash(localStorage.getItem(MapDefs.KEY) || ''); } catch (e) { return ''; } },
  hash(s) { let h = 0; for (let i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0; return h; },
};

/* ---------- punkt zaczepienia modelu (FIX.pv): latarnia stoi słupem w punkcie, wysięgnik nad jezdnią ---------- */
(() => {
  const bl = Furn.load;
  Furn.load = function (keys, cb) {
    return bl.call(this, keys, () => {
      keys.forEach(k => { const C = Furn.cache[k], F = Furn.FIX[k]; if (!C || C.pvDone || !F || !F.pv) return; C.pvDone = true; const s = F.s || 1; C.c = C.c.clone(); C.c.x += F.pv[0] * s; C.c.z += F.pv[1] * s; });
      cb && cb();
    });
  };
})();
// latarnie w mieście: radzieckie „pastorały” (Soviet Streetlight Pack, CC BY) zamiast latarni parkowej
Furn.SRC.lampPH = 'cat/lampSov_01.glb'; Furn.FIX.lampPH = { ry: Math.PI, pv: [0, -2.48] };

(() => {
  const M = Miasto, DEF = { W: M.W, D: M.D };
  const bs = M.stadium, br = M.riverZ, bseg = M.segs, bk = M.keys, bb = M.build;

  M.stadium = function () { const v = M.CUSTOM && M.CUSTOM.venues.tor; return v ? { x: v.x, z: v.z } : bs.call(this); };
  M.riverZ = function (x) { return M.CUSTOM ? 1e6 : br.call(this, x); };
  M.segs = function () {
    if (!M.CUSTOM) return bseg.call(this);
    if (M._csegs) return M._csegs;
    const out = [];
    M.CUSTOM.roads.forEach((r, ri) => {
      const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; if (!T.car) return; const wd = MapDefs.roadW(r);
      for (let i = 0; i < r.pts.length - 1; i++) { const a = { x: r.pts[i][0], z: r.pts[i][1] }, b = { x: r.pts[i + 1][0], z: r.pts[i + 1][1] }, len = Math.hypot(b.x - a.x, b.z - a.z); if (len > 0.5) out.push({ a, b, wd, name: r.name || 'ulica', len, t: r.t }); }
    });
    if (!out.length) out.push({ a: { x: -40, z: M.D / 2 + 300 }, b: { x: 40, z: M.D / 2 + 300 }, wd: 8, name: '', len: 80, dummy: true }); // ruch uliczny potrzebuje choć jednej drogi
    return (M._csegs = out);
  };
  M.keys = function () { const k = bk.call(this); return M.CUSTOM ? [...new Set([...k, ...CustomMap.keys(M.CUSTOM)])] : k; };

  /** przed budową: czy mapa z edytora ma być użyta (i czy zmieniła się od ostatniej budowy) */
  M.build = function (cb) {
    const on = MapDefs.active();
    if (on && !CustomMap.cat) { CustomMap.loadCat().then(() => M.build(cb)); return; }
    const sig = CustomMap.sig();
    if (World.rooms && World.rooms.miasto && M._sig !== sig && !M._loading) CustomMap.teardown();
    if (!(World.rooms && World.rooms.miasto) && !M._loading) {
      M._sig = sig; M._csegs = null;
      M.CUSTOM = on ? MapDefs.load() : null;
      if (M.CUSTOM) {
        const m = M.CUSTOM; m.roads = m.roads || []; m.areas = m.areas || []; m.objs = m.objs || []; m.venues = m.venues || {};
        m.objs.forEach(o => { const e = CustomMap.byId[o.c]; if (e) CustomMap.register(e); });
        M.W = m.W || DEF.W; M.D = m.D || DEF.D;
      } else { M.W = DEF.W; M.D = DEF.D; }
    }
    return bb.call(this, cb);
  };

  /** rozbiórka miasta (po zmianie mapy) */
  CustomMap.teardown = function () {
    if (!World.rooms || !World.rooms.miasto) return;
    try { Stad.place(false); } catch (e) { }
    if (M.G && M.G.parent) M.G.parent.remove(M.G);
    delete World.rooms.miasto; M.G = null; M._segs = null; M._csegs = null; M.traffic = null; M.walkers = null; M._osDone = false; M._grid = null; M.water = null;
    if (typeof MiniMap !== 'undefined') MiniMap._L = null;
  };

  /* ---------- budowa miasta z mapy ---------- */
  M.makeCustom = function () {
    const map = M.CUSTOM, Y = World.LOCKER_Y, G = new THREE.Group(); G.position.set(M.CX, Y, 0); World.scene.add(G); G.visible = false; G.userData.lights = [];
    let rs = 11; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(Math.max(M.W, M.D) * 1.1, 24, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false })); G.add(sky);
    const hemi = new THREE.HemisphereLight(0xe4ecf8, 0x5a5048, 0.8); hemi.visible = false; G.userData.lights.push(hemi); G.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.9); sun.position.set(-120, 200, 80); sun.visible = false; G.userData.lights.push(sun); G.add(sun); G.add(sun.target);
    M.sky = sky; M.hemi = hemi; M.sun = sun;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(M.W + 400, M.D + 400), World.pbr('leafy_grass', (M.W + 400) / 8, (M.D + 400) / 8, { color: '#86a064' })); grass.rotation.x = -Math.PI / 2; G.add(grass);
    const col = [], spots = [], doors = {}, blds = [];

    // tereny (bez wody — tę robi addWater)
    const flat = (tris, y, rep, mat) => {
      const g = new THREE.BufferGeometry(), pos = [], uv = []; tris.forEach(([x, z]) => { pos.push(x, y, z); uv.push(x / rep, z / rep); });
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; G.add(m); return m;
    };
    const polyTris = pts => {
      const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)))), p = g.attributes.position, idx = g.index ? g.index.array : null, out = [], n = idx ? idx.length : p.count;
      for (let i = 0; i < n; i++) { const j = idx ? idx[i] : i; out.push([p.getX(j), p.getY(j)]); } for (let i = 0; i < out.length; i += 3) { const t = out[i + 1]; out[i + 1] = out[i + 2]; out[i + 2] = t; } return out;
    };
    const mat = (T, fallback) => T.tex ? World.pbr(T.tex, 1, 1, { color: T.tint || fallback || '#ffffff' }) : new THREE.MeshStandardMaterial({ color: T.col, roughness: 0.9 });
    map.areas.forEach((a, i) => { if (a.t === 'water' || a.pts.length < 3) return; const T = MapDefs.AREA[a.t] || MapDefs.AREA.grass; flat(polyTris(a.pts), 0.02 + i * 0.0005, T.rep || 4, mat(T)); });

    // drogi: jezdnia (pasy dla ulic), chodniki po bokach, ścieżki
    const asph = World.pbr('asphalt_02', 1, 1, { color: '#4d4d50' }), walkM = World.pbr('concrete_pavement', 1, 1, { color: '#b3ada2' });
    const strip = (a, b, off, wd, m, y, rep) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.01) return; const nx = -dz / L, nz = dx / L, g = new THREE.PlaneGeometry(L + wd, wd); g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (L + wd) / rep, uv.getY(i) * wd / rep);
      const o = new THREE.Mesh(g, m); o.position.set((a[0] + b[0]) / 2 + nx * off, y, (a[1] + b[1]) / 2 + nz * off); o.rotation.y = -Math.atan2(dz, dx); o.receiveShadow = true; G.add(o);
    };
    const disc = (p, r, m, y) => { const o = new THREE.Mesh(new THREE.CircleGeometry(r, 20), m); o.rotation.x = -Math.PI / 2; o.position.set(p[0], y, p[1]); o.receiveShadow = true; G.add(o); };
    map.roads.forEach(r => {
      const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2, wd = MapDefs.roadW(r), m = T.line ? asph : mat(T), y = T.line ? 0.05 : T.walkway ? 0.045 : 0.051; // y = 0.05 → asfalt z oznakowaniem (career13)
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        if (T.walkway) { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, p = (u, v) => [a[0] + ux * u - uz * v, a[1] + uz * u + ux * v], A = p(-wd / 2, -wd / 2), B = p(L + wd / 2, -wd / 2), C = p(L + wd / 2, wd / 2), D = p(-wd / 2, wd / 2); flat([A, C, B, A, D, C], y, T.rep || 3, m); }
        else strip(a, b, 0, wd, m, y, 6);
        if (T.walk) [-1, 1].forEach(sd => strip(a, b, sd * (wd / 2 + T.walk / 2), T.walk, walkM, 0.04, 3));
      }
      if (T.walk) r.pts.forEach(p => disc(p, wd / 2 + T.walk, walkM, 0.039));
    });
    // skrzyżowania: gładki asfalt na wspólnych punktach
    const nodes = new Map(); map.roads.forEach(r => { const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; if (T.walkway) return; r.pts.forEach(p => { const k = Math.round(p[0]) + ':' + Math.round(p[1]), n = nodes.get(k) || { p, n: 0, wd: 0, T }; n.n++; n.wd = Math.max(n.wd, MapDefs.roadW(r)); nodes.set(k, n); }); });
    nodes.forEach(n => { if (n.n > 1) disc(n.p, n.wd / 2, n.T.line ? asph : mat(n.T), 0.048); }); // pod pasami jezdni — wypełnia tylko narożniki skrzyżowań

    // modele z katalogu (powtarzalne jako instancje)
    const byKey = {}; M.flatDoors = {};
    map.objs.forEach((o, i) => {
      const e = CustomMap.byId[o.c]; if (!e) return; const k = CustomMap.key(e); if (!Furn.cache[k]) return;
      const s = CustomMap.scale(e, k, o.s), r = o.r || 0;
      if (e.enter) {
        Furn.place(G, k, o.x, 0, o.z, r, { s }); col.push(M.box(k, o.x, o.z, r, s));
        const dep = Furn.cache[k].size.z * s, fx = Math.sin(r), fz = Math.cos(r), dx = o.x + fx * (dep / 2 + 1.3), dz = o.z + fz * (dep / 2 + 1.3), id = '@' + i;
        M.flatDoors[id] = { x: dx, z: dz, yaw: Math.atan2(-fx, -fz), bx: o.x, bz: o.z };
        spots.push({ id: 'w:in:' + id, x: dx, z: dz, label: '🚪 Klatka schodowa — wejdź do mieszkania', r: 2.2 });
        return;
      }
      (byKey[k] = byKey[k] || []).push({ x: o.x, z: o.z, r, s });
      if (e.k === 'b') col.push(M.box(k, o.x, o.z, r, s));
    });
    Object.entries(byKey).forEach(([k, list]) => { if (list.length >= 5 || /^(lamp|tree)/.test(k)) M.instances(G, k, list); else list.forEach(it => Furn.place(G, k, it.x, 0, it.z, it.r, { s: it.s })); });

    // lokale z gry
    const def = MapDefs.template().venues, S = M.stadium();
    spots.push({ id: 'w:in:tor', x: S.x, z: S.z + M.SR.z + 3, label: '🏁 Brama stadionu — wejdź (park maszyn, tor)', r: 3 });
    Object.entries(City.PLACES).concat([['osiedle', { name: 'Osiedle' }], ['rodzice', City.PLACES.rodzice || { name: 'Dom rodziców' }]]).forEach(([k, P]) => {
      if (k === 'tor' || doors[k]) return; const V = M.VENUE[k]; if (!V) return;
      const v = map.venues[k] || def[k]; if (!v) return;
      const r = v.r || 0, fx = Math.sin(r), fz = Math.cos(r); // przód budynku (drzwi)
      if (k === 'osiedle') { M.buildOsiedle(G, { x: v.x + fx * 24, z: v.z + fz * 24 }, -fx, -fz, 0, spots, col, blds, doors); return; }
      const s = M.scaleFor(V[0], V[1]), C = Furn.cache[V[0]]; if (!C) return; const depth = C.size.z * s;
      Furn.place(G, V[0], v.x, 0, v.z, r, { s }); col.push(M.box(V[0], v.x, v.z, r, s));
      const dx = v.x + fx * (depth / 2 + 1.3), dz = v.z + fz * (depth / 2 + 1.3);
      doors[k] = { x: dx, z: dz, yaw: Math.atan2(-fx, -fz), bx: v.x, bz: v.z };
      if (P && P.icon) spots.push({ id: 'w:in:' + k, x: dx, z: dz, label: `${P.icon} ${P.name} — otwórz drzwi i wejdź`, r: 2.4 });
      else if (k === 'rodzice') spots.push({ id: 'w:in:' + k, x: dx, z: dz, label: '🏡 Dom rodziców — wejdź', r: 2.4 });
      // przystanek obok wejścia (z boku, przy ulicy)
      const tx = -fz, tz = fx, sx = dx + fx * 3 + tx * 9, sz = dz + fz * 3 + tz * 9;
      Furn.place(G, 'busShelter', sx, 0, sz, r, { w: 4 });
      spots.push({ id: 'w:bus:' + k, x: sx + fx * 1.2, z: sz + fz * 1.2, label: `🚌 Przystanek „${P ? P.name : k}” — odjazdy`, r: 2.2 });
    });

    // ruch uliczny (tylko gdy są prawdziwe ulice)
    M.traffic = [];
    const segs = M.segs();
    if (!segs[0].dummy) ['carSedan', 'car126p', 'bus', 'car125p', 'police', 'carVan', 'car126p', 'hatch3', 'car125p', 'estate', 'carCity', 'car126p'].slice(0, Math.max(3, Math.min(12, segs.length * 2))).forEach((k, i) => {
      const s = segs[i % segs.length], len = M.LEN[k] || 4.6, g = Furn.place(G, k, 0, 0, 0, 0, { w: len }); if (!g) return;
      M.traffic.push({ g, k, hl: len / 2, seg: segs.indexOf(s), t: rnd() * s.len, dir: i % 2 ? 1 : -1, v: k === 'bus' ? 7 : 9 + rnd() * 3, police: k === 'police' });
    });

    // woda: nie da się wejść (poza mostami — tam, gdzie przechodzi droga)
    const waters = map.areas.filter(a => a.t === 'water' && a.pts.length >= 3), C2 = 2;
    waters.forEach(a => {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; a.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      const I = Math.ceil((x1 - x0) / C2), J = Math.ceil((z1 - z0) / C2); if (I * J > 400000) return;
      const inside = new Uint8Array(I * J);
      for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) { const x = x0 + (i + 0.5) * C2, z = z0 + (j + 0.5) * C2; if (!MapDefs.inPoly(a.pts, x, z)) continue; const n = MapDefs.nearestRoad(map, x, z); if (n.d < n.wd / 2 + 1.2) continue; inside[i * J + j] = 1; }
      for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) { if (!inside[i * J + j]) continue; const f = (a2, b2) => a2 >= 0 && a2 < I && b2 >= 0 && b2 < J && inside[a2 * J + b2]; if (f(i + 1, j) && f(i - 1, j) && f(i, j + 1) && f(i, j - 1)) continue; const x = x0 + i * C2, z = z0 + j * C2; col.push({ x0: x, x1: x + C2, z0: z, z1: z + C2 }); }
    });
    M.waters = waters;

    M.col = col; M.doors = doors; M.G = G; M.spotsBase = spots;
    World.rooms.miasto = { cx: M.CX, W: M.W, D: M.D, name: 'Miasto', exitTo: null, group: G, outdoor: true, spots };
  };

  // woda z mapy: shader Water na wielokątach + nabrzeże
  const baw = M.addWater;
  M.addWater = function () {
    if (!M.CUSTOM) return baw.call(this);
    const G = M.G; if (!G || !THREE.Water || !M.waters || !M.waters.length) return;
    const tex = new THREE.TextureLoader().load('models/tex/water/waternormals.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
    const bank = World.pbr('concrete_floor_02', 1, 1, { color: '#8e8c86' });
    M.waters.forEach(a => {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(a.pts.map(([x, z]) => new THREE.Vector2(x, -z))));
      const w = new THREE.Water(geo, { textureWidth: 512, textureHeight: 512, waterNormals: tex, sunDirection: new THREE.Vector3(-0.5, 0.8, 0.3).normalize(), sunColor: 0x9a9a8a, waterColor: 0x10313a, distortionScale: 3.2, fog: !!World.scene.fog });
      w.rotation.x = -Math.PI / 2; w.position.y = 0.03; G.add(w); M.water = w;
      a.pts.forEach((p, i) => { const q = a.pts[(i + 1) % a.pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.1) return; const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, n = MapDefs.nearestRoad(M.CUSTOM, mx, mz); if (n.d < n.wd / 2 + 1) return; const m = new THREE.Mesh(new THREE.BoxGeometry(L + 0.3, 0.5, 1.2), bank); m.position.set(mx, 0.05, mz); m.rotation.y = -Math.atan2(q[1] - p[1], q[0] - p[0]); G.add(m); });
    });
  };

  // edytor w grze (F9) poprawia tylko domyślne miasto
  if (typeof MapEdit !== 'undefined') { const ba = MapEdit.apply; MapEdit.apply = function (...a) { if (M.CUSTOM) return; return ba.apply(this, a); }; }

  // drzwi mieszkań w blokach z mapy
  const btd = M.toDoor;
  M.toDoor = function (place) {
    const d = place && place[0] === '@' && M.flatDoors && M.flatDoors[place]; if (!d) return btd.call(this, place);
    Walk.x = M.CX + d.x; Walk.z = d.z; Walk.yaw = Math.atan2(-Math.sin(d.yaw), -Math.cos(d.yaw)) + Math.PI; Walk.pitch = -0.05;
  };
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id.startsWith('w:in:@')) {
      const place = id.slice(5); if (!World.rooms.flatX) { UI.toast('Zamknięte.', true); return true; }
      const go = () => { City._door = place; City.advance(1); Walk.enterRoom('flatX'); UI.toast('Mieszkanie · ' + City.timeStr()); };
      if (typeof Door !== 'undefined') Door.fade(go, 'Klatka schodowa'); else go(); return true;
    }
    return bra.call(this, id);
  };

  /* ---------- minimapa: warstwa z mapy edytora ---------- */
  const bl = MiniMap.layer;
  MiniMap.layer = function () {
    if (!M.CUSTOM) return bl.call(this);
    if (MiniMap._L && MiniMap._Lk === M.G) return MiniMap._L;
    const map = M.CUSTOM, K = MiniMap.K, W = Math.round(M.W * K), H = Math.round(M.D * K), L = document.createElement('canvas'); L.width = W; L.height = H;
    const g = L.getContext('2d'), P = (x, z) => [(x + M.W / 2) * K, (z + M.D / 2) * K];
    g.fillStyle = '#56724a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
    const AC = { water: '#2f6f9a', grass: '#3f6e3c', plaza: '#b3aea4', parking: '#5a5c60', sand: '#d2bf8c', dirt: '#8b7355', tiles: '#a39888' };
    map.areas.forEach(a => { if (a.pts.length < 3) return; g.fillStyle = AC[a.t] || '#4f7a3f'; g.beginPath(); a.pts.forEach((p, i) => { const q = P(p[0], p[1]); if (i) g.lineTo(...q); else g.moveTo(...q); }); g.closePath(); g.fill(); if (a.t === 'water') { g.strokeStyle = '#8e8c86'; g.lineWidth = 2; g.stroke(); } });
    const S = M.stadium(), [sa, sb] = P(S.x, S.z), SR = M.SR;
    g.fillStyle = '#b3aea4'; g.beginPath(); g.ellipse(sa, sb, (SR.x + 10) * K, (SR.z + 10) * K, 0, 0, 7); g.fill();
    g.fillStyle = '#7c8088'; g.beginPath(); g.ellipse(sa, sb, SR.x * K, SR.z * K, 0, 0, 7); g.fill();
    const tr = typeof Track !== 'undefined' && Track.R ? Track : null, str = (tr && tr.straight) || 72, rr = (tr && tr.R) || 32;
    const oval = (d, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(sa - str / 2 * K, sb - (rr + d) * K); g.lineTo(sa + str / 2 * K, sb - (rr + d) * K); g.arc(sa + str / 2 * K, sb, (rr + d) * K, -Math.PI / 2, Math.PI / 2); g.lineTo(sa - str / 2 * K, sb + (rr + d) * K); g.arc(sa - str / 2 * K, sb, (rr + d) * K, Math.PI / 2, Math.PI * 1.5); g.fill(); };
    oval(6, '#b06a3c'); oval(-5, '#3f8a45');
    g.lineCap = 'round'; g.lineJoin = 'round';
    const road = (r, w, col, dash) => { g.strokeStyle = col; g.lineWidth = w * K; g.setLineDash(dash || []); g.beginPath(); r.pts.forEach((p, i) => { const q = P(p[0], p[1]); if (i) g.lineTo(...q); else g.moveTo(...q); }); g.stroke(); g.setLineDash([]); };
    map.roads.forEach(r => { const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; if (T.walk) road(r, MapDefs.roadW(r) + T.walk * 2, '#cfc9bc'); });
    map.roads.forEach(r => { const T = MapDefs.ROAD[r.t] || MapDefs.ROAD.road2; road(r, Math.max(1.5, MapDefs.roadW(r)), T.walkway ? T.col : T.car && !T.line ? T.col : '#46494e'); });
    map.roads.forEach(r => { const T = MapDefs.ROAD[r.t] || {}; if (T.line) road(r, 0.35, 'rgba(240,232,200,.8)', [5 * K, 5 * K]); });
    (M.fp || []).forEach(f => {
      if (/^car|bus|police|zuk|cC_/.test(f.k)) return;
      g.save(); g.translate(...P(f.x, f.z)); g.rotate(-f.r); g.fillStyle = /^prl/.test(f.k) ? '#c9c1b2' : '#d8b89a'; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
      g.fillRect(-f.w / 2 * K, -f.d / 2 * K, f.w * K, f.d * K); g.strokeRect(-f.w / 2 * K, -f.d / 2 * K, f.w * K, f.d * K); g.restore();
    });
    g.font = `600 ${Math.round(4.2 * K)}px Barlow, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.9)';
    const seen = new Set(); map.roads.forEach(r => { if (!r.name || seen.has(r.name) || r.pts.length < 2) return; seen.add(r.name); let bi = 0, bl2 = 0; for (let i = 0; i < r.pts.length - 1; i++) { const l = Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]); if (l > bl2) { bl2 = l; bi = i; } } if (bl2 < 50) return; const a = r.pts[bi], b = r.pts[bi + 1], [x, y] = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; g.save(); g.translate(x, y); g.rotate(ang); g.fillText(r.name, 0, 0); g.restore(); });
    MiniMap._L = L; MiniMap._Lk = M.G; return L;
  };

  /* ---------- przebudowa po zapisie w edytorze (gra otwarta w innym oknie) ---------- */
  addEventListener('storage', ev => {
    if (ev.key === 'se3d_ping') { try { localStorage.setItem('se3d_pong', String(Date.now())); } catch (e) { } return; }
    if (ev.key !== MapDefs.KEY && ev.key !== MapDefs.USE) return;
    if (!World.rooms || !World.rooms.miasto || M._loading) return;
    const inCity = typeof Walk !== 'undefined' && Walk.active && Walk.room === 'miasto';
    clearTimeout(CustomMap._rb);
    CustomMap._rb = setTimeout(() => {
      if (M._sig === CustomMap.sig()) return;
      if (!inCity) { CustomMap.teardown(); return; } // zbuduje się przy następnym wyjściu na miasto
      const loc = (City.Z && City.Z().loc) || 'dom'; Walk.stopQuiet(); City._world = false; CustomMap.teardown();
      UI.toast('Mapa z edytora zmieniona — przebudowuję miasto…'); Miasto.go(loc);
    }, 300);
  });
  if (MapDefs.active()) CustomMap.loadCat();
})();

/* ---------- mieszkanie w bloku (wejścia z mapy edytora) ---------- */
const FlatX = {
  CX: 620,
  build() {
    const Y = World.LOCKER_Y, G = new THREE.Group(); World.venueGroup.add(G); G.userData.lights = [];
    [[-1.8, 3.2], [1.5, 3.4], [2.6, 0.5], [0.3, -2.4], [-2.2, -3.6]].forEach(([x, z]) => { const l = new THREE.PointLight(0xfff0dc, 0.55, 7, 1.6); l.position.set(FlatX.CX + x, Y + 2.3, z); l.visible = false; G.add(l); G.userData.lights.push(l); });
    const wallM = World.pbr('painted_plaster_wall', 3, 1, { color: '#e2dccd' }), H = 2.62, W = 7.3, D = 10.9;
    [[0, -D / 2 - 0.06, W + 0.3, 0.12], [0, D / 2 + 0.06, W + 0.3, 0.12], [-W / 2 - 0.06, 0, 0.12, D + 0.3], [W / 2 + 0.06, 0, 0.12, D + 0.3]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallM); m.position.set(FlatX.CX + x, Y + H / 2, z); G.add(m); });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, D + 0.3), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(FlatX.CX, Y + 2.55, 0); G.add(ceil);
    World.rooms.flatX = { cx: FlatX.CX, W: 7.4, D: 11, name: 'Mieszkanie w bloku', exitTo: null, group: G, flat: true, spots: [], npc: [{ x: -1.3, z: -0.5, face: 0, key: 'Female_Adult_06', pose: 'idle' }], crowd: [] };
    Rooms.FURN.flatX = [];
  },
  furnish() {
    const R = World.rooms.flatX; Furn.load(['flatHome'], () => {
      if (Walk.room !== 'flatX') return;
      const g = Furn.place(World.venueGroup, 'flatHome', R.cx, World.LOCKER_Y, 0, 0, { s: 1 }); if (!g) return; Rooms.dyn.push(g);
      if (!R.meshCol) R.meshCol = MeshCol.build(g, World.LOCKER_Y); Rooms._mcR = null;
    });
  },
};
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () { bb.call(this); FlatX.build(); };
  const bp = Rooms.populate;
  Rooms.populate = function (key) { const s = bp.call(this, key); if (key === 'flatX') FlatX.furnish(); return s; };
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { const r = be.call(this, key); if (key === 'flatX') { Walk.x = FlatX.CX + 1.3; Walk.z = 4.3; Walk.yaw = 0; } return r; };
})();
