/* =========================================================
   Speedway Empire 3D — v2.5
   • nowe postacie Rocketbox (MIT): sportowcy, policjanci, kucharka, biznes
   • prawdziwy stadion klubu stoi w mieście (te same trybuny, tor i maszty co w meczu)
   • większa mapa, budynki nie wchodzą do rzeki ani na stadion
   • kolizje z jadącymi autami, nowa minimapa (obracana, z ulicami i budynkami)
   • kasyno: stół do ruletki zamiast fontanny i starego stołu do pokera
   ========================================================= */
'use strict';

/* ---------- postacie ---------- */
Humans.LIST.push(
  ...['Sports_Male_01', 'Sports_Male_02', 'Sports_Male_03', 'Sports_Male_04', 'Business_Male_04', 'Business_Male_05', 'Business_Male_06', 'Business_Male_07', 'Male_Adult_19', 'Male_Adult_21']
    .map(k => ({ k, s: 'm' })),
  ...['Sports_Female_01', 'Sports_Female_02', 'Business_Female_01', 'Business_Female_02', 'Business_Female_03', 'Business_Female_04'].map(k => ({ k, s: 'f' })),
  { k: 'Police_Male_02', s: 'm', role: 'police' }, { k: 'Police_Male_03', s: 'm', role: 'police' }, { k: 'Police_Male_04', s: 'm', role: 'police' }, { k: 'Police_Female_01', s: 'f', role: 'police', hide: /shotgun|machinegun/i },
  { k: 'Chef_Female_01', s: 'f', role: 'chef' }, { k: 'Security_Female_01', s: 'f', role: 'security' }, { k: 'Medical_Female_01', s: 'f', role: 'nurse' },
  { k: 'Construction_Male_01', s: 'm', role: 'worker', hide: /helmet/i }, { k: 'Gardener_Male_01', s: 'm', role: 'gardener' });
/** Rola → losowa wczytana postać z tą rolą (policjanci, ochrona itd. nie są już klonami) */
Humans.byRole = function (role) {
  const all = Humans.LIST.filter(x => x.role === role), ok = all.filter(x => Humans.A[x.k]), pool = ok.length ? ok : all;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].k : null;
};

/* ---------- kasyno ---------- */
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    const F = Rooms.FURN.casino; if (!F) return;
    for (let i = F.length - 1; i >= 0; i--) {
      const [k, x, , z] = F[i];
      if (k === 'casFountain' || k === 'pokerTable' || (k === 'casStool' && Math.hypot(x + 5, z - 4.4) < 2)) F.splice(i, 1);
    }
    F.push(['casRoulette', -5, 0, 4.2, 0, { w: 3.2 }], ['casStool', -6.1, 0, 5.5, 0, { h: 1.05 }], ['casStool', -4.8, 0, 5.6, 0, { h: 1.05 }], ['casStool', -3.6, 0, 5.4, 0, { h: 1.05 }]);
  };
})();

/* ---------- prawdziwy stadion w mieście ---------- */
City.PLACES.tor.y = 85; // plac stadionu na północy, ul. Stadionowa biegnie po jego południowej stronie
const Stad = {
  KEEP: new Set(['buildInfield', 'buildTrack', 'buildFence', 'buildStands', 'buildLights', 'buildGate', 'buildScreen', 'buildPits', 'buildFlags', 'flushWindows']),
  CORE: { x: 118, z: 80 },
  holder: null, moved: [],
  MODEL: 'stadZGc', // skan stadionu żużlowego (Sketchfab, CC BY) — jeśli jest, stoi w mieście zamiast kopii stadionu meczowego
  useModel() { return !!Furn.cache[Stad.MODEL]; },
  /** Czy element stadionu stoi w mieście (trybuny, tor, maszty) — bez parkingu, budynków klubu i pokoi */
  keep(o) {
    if (!Stad.KEEP.has(o.userData.part) || o.position.y < -20) return false;
    const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return true;
    return b.max.y > -5 && Math.abs(b.min.x) < Stad.CORE.x && Math.abs(b.max.x) < Stad.CORE.x && Math.abs(b.min.z) < Stad.CORE.z && Math.abs(b.max.z) < Stad.CORE.z;
  },
  /** Półosie terenu stadionu na podstawie jego brył */
  measure() {
    if (Stad.useModel()) { const C = Furn.cache[Stad.MODEL]; Miasto.SR = { x: C.size.x / 2 + 4, z: C.size.z / 2 + 4 }; return; }
    const G = World.venueGroup; if (!G) return;
    const b = new THREE.Box3(); G.updateMatrixWorld(true);
    G.children.forEach(o => { if (Stad.keep(o)) b.expandByObject(o); });
    if (b.isEmpty()) return;
    Miasto.SR = { x: Math.max(Math.abs(b.min.x), b.max.x) + 5, z: Math.max(Math.abs(b.min.z), b.max.z) + 5 };
  },
  /** Przenieś bryły stadionu do miasta (on) albo z powrotem do świata meczu */
  place(on) {
    const G = World.venueGroup, M = Miasto;
    if (Stad.seats && !on) { Stad.seats.forEach(o => { o.visible = true; }); Stad._lodOn = null; }
    if (Stad.moved.length && (!on || Stad._key !== World.venueKey)) {
      Stad.moved.forEach(([o, par]) => { if (o.parent) o.parent.remove(o); if (par && par.parent) par.add(o); }); Stad.moved = [];
    }
    if (G) G.visible = !on; // reszta świata meczu (parking, budynki klubu, pokoje) nie jest w mieście potrzebna
    if (!on || !G || !M.G) return;
    if (Stad.useModel()) {
      if (!Stad.holder) Stad.holder = new THREE.Group();
      if (Stad.holder.parent !== M.G) { M.G.add(Stad.holder); Stad.zg = null; Stad.holder.clear(); }
      const S = M.stadium(); Stad.holder.position.set(S.x, 0.02, S.z);
      if (!Stad.zg) Stad.zg = Furn.place(Stad.holder, Stad.MODEL, 0, 0, 0, 0, { s: 1 });
      return;
    }
    if (!Stad.holder) { Stad.holder = new THREE.Group(); }
    if (Stad.holder.parent !== M.G) M.G.add(Stad.holder);
    const S = M.stadium(); Stad.holder.position.set(S.x, 0.035, S.z);
    if (Stad.moved.length) return;
    Stad._key = World.venueKey;
    G.children.slice().forEach(o => { if (Stad.keep(o)) { Stad.moved.push([o, G]); Stad.holder.add(o); } });
    Stad.seats = Stad.moved.map(([o]) => o).filter(o => o.isInstancedMesh && o.userData.part === 'buildStands');
  },
  /** Krzesełka (miliony trójkątów) rysujemy tylko, gdy gracz jest blisko stadionu */
  lod() {
    if (!Stad.seats || !Stad.seats.length) return;
    const S = Miasto.stadium(), d = Math.hypot((Walk.x - Miasto.CX - S.x) / (Miasto.SR.x + 45), (Walk.z - S.z) / (Miasto.SR.z + 45)), on = d < 1;
    if (Stad._lodOn !== on) { Stad._lodOn = on; Stad.seats.forEach(o => { o.visible = on; }); }
  },
};
(() => {
  // oznacz, który etap budowy stadionu dodał daną bryłę
  ['buildInfield', 'buildTrack', 'buildFence', 'buildStands', 'buildLights', 'buildGate', 'buildScreen', 'buildPits', 'buildFlags', 'buildSurroundings',
    'buildGrounds', 'buildStaff', 'flushWindows', 'buildLocker', 'buildRooms'].forEach(n => {
    const f = World[n]; if (!f) return;
    World[n] = function (...a) {
      const G = World.scene, n0 = G.children.length;
      try { return f.apply(this, a); } finally { for (let i = n0; i < G.children.length; i++) if (!G.children[i].userData.part) G.children[i].userData.part = n; }
    };
  });
  const bu = World.useVenue;
  World.useVenue = function (...a) { if (Stad.moved.length) Stad.place(false); const r = bu.apply(this, a); if (r && typeof Walk !== 'undefined' && Walk.room === 'miasto') Stad.place(true); return r; };

  const M = Miasto;
  // przed budową miasta: zmierz stadion, żeby zabudowa go omijała
  const bm = M.make;
  M.make = function (...a) {
    Stad.measure(); M.fp = [];
    const r = bm.apply(this, a);
    // teren stadionu: nieprzechodni (wejście tylko przez bramę), plac z betonu dookoła
    const S = M.stadium(), col = M.col, SR = M.SR;
    for (let t = -1; t <= 1.0001; t += 0.05) { const zz = SR.z * Math.sqrt(Math.max(0, 1 - t * t)) - 2; if (zz > 0) col.push({ x0: S.x + t * SR.x - 3, x1: S.x + t * SR.x + 3, z0: S.z - zz, z1: S.z + zz }); }
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(1, 64), World.pbr('concrete_pavement', 1, 1, { color: '#a9a49a' }));
    plaza.rotation.x = -Math.PI / 2; plaza.scale.set(SR.x + 10, SR.z + 10, 1); plaza.position.set(S.x, 0.02, S.z); plaza.receiveShadow = true; M.G.add(plaza);
    const mt = plaza.material.map; if (mt) { mt.repeat.set((SR.x + 10) / 3, (SR.z + 10) / 3); }
    return r;
  };
  // budynki: żaden róg nie w rzece ani na terenie stadionu
  const bc = M.clear;
  M.clear = function (k, x, z, r, s, pad) {
    if (!bc.call(this, k, x, z, r, s, pad)) return false;
    const C = Furn.cache[k]; if (!C) return true;
    const hw = C.size.x * s / 2, hd = C.size.z * s / 2, c = Math.cos(r), sn = Math.sin(r);
    for (const u of [-1, -0.5, 0, 0.5, 1]) for (const v of [-1, -0.5, 0, 0.5, 1]) {
      const lx = u * hw, lz = v * hd, px = x + lx * c + lz * sn, pz = z - lx * sn + lz * c;
      if (Math.abs(pz - M.riverZ(px)) < 7.5 + 3.5 || M.inStadium(px, pz, 6)) return false;
    }
    return true;
  };
  // obrysy budynków do minimapy
  const bx = M.box;
  M.box = function (k, x, z, r, s, sh) {
    const C = Furn.cache[k]; if (C && C.size.x * s > 5 && C.size.z * s > 5 && M.fp) M.fp.push({ k, x, z, r, w: C.size.x * s, d: C.size.z * s });
    return bx.apply(this, arguments);
  };

  // wejście/wyjście z miasta: stadion wędruje razem z widokiem
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { if (key !== 'miasto') Stad.place(false); const r = be.call(this, key); if (key === 'miasto') Stad.place(true); return r; };
  const bs = Walk.stopQuiet, bst = Walk.stop;
  Walk.stopQuiet = function (...a) { Stad.place(false); return bs.apply(this, a); };
  Walk.stop = function (...a) { Stad.place(false); return bst.apply(this, a); };

  // nie przenikaj przez jadące auta
  const bt = Rooms.tick;
  Rooms.tick = function (dt) {
    bt.call(this, dt);
    if (Walk.room !== 'miasto' || !M.traffic) return;
    Stad.lod();
    const px = Walk.x - M.CX, pz = Walk.z;
    M.traffic.forEach(c => {
      if (c.x == null || c.hx == null) return;
      const rx = px - c.x, rz = pz - c.z, a = rx * c.hx + rz * c.hz, l = -rx * c.hz + rz * c.hx;
      const hl = (c.hl || 2.3) + 0.35, hw = (c.k === 'bus' ? 1.35 : 0.95) + 0.35;
      if (Math.abs(a) >= hl || Math.abs(l) >= hw) return;
      const pl = (hw - Math.abs(l)) * (l < 0 ? -1 : 1), pa = (hl - Math.abs(a)) * (a < 0 ? -1 : 1);
      if (Math.abs(pl) < Math.abs(pa)) { Walk.x += -c.hz * pl; Walk.z += c.hx * pl; } else { Walk.x += c.hx * pa; Walk.z += c.hz * pa; }
    });
  };
})();

/* ---------- stadion żużlowy (skan) ---------- */
Furn.SRC.stadZGc = 'sk/stadZGc.glb'; Furn.FIX.stadZGc = { ry: Math.PI / 2 };
(() => { const bk = Miasto.keys; Miasto.keys = function () { return [...bk.call(this), 'stadZGc']; }; })();

/* ---------- wydajność miasta ---------- */
Furn.SRC.lampPH = 'sk/lampLow.glb'; // latarnia Poly Haven uproszczona z 20 tys. do 1,6 tys. trójkątów
(() => {
  const M = Miasto, bi = M.instances;
  // instancje dzielone na kwartały 240 m z własną sferą — to, co poza kadrem, nie jest rysowane
  M.instances = function (parent, k, list) {
    if (typeof MapEdit !== 'undefined') list = MapEdit.filter(k, list); // obiekty usunięte w edytorze mapy
    const C = Furn.cache[k]; if (!C || list.length < 6) { const n0 = parent.children.length; bi.call(this, parent, k, list); for (let j = n0; j < parent.children.length; j++) if (parent.children[j].isInstancedMesh) { parent.children[j].userData.fk = k; parent.children[j].userData.list = list; } return; }
    const cells = {}; list.forEach(it => { const key = Math.floor(it.x / 240) + ":" + Math.floor(it.z / 240); (cells[key] = cells[key] || []).push(it); });
    Object.values(cells).forEach(l => {
      const n0 = parent.children.length; bi.call(this, parent, k, l);
      let cx = 0, cz = 0; l.forEach(i => { cx += i.x; cz += i.z; }); cx /= l.length; cz /= l.length;
      const rad = Math.max(C.size.x, C.size.y, C.size.z) * Math.max(...l.map(i => i.s || 1));
      let R = 0; l.forEach(i => { R = Math.max(R, Math.hypot(i.x - cx, i.z - cz)); }); R += rad;
      for (let j = n0; j < parent.children.length; j++) {
        const im = parent.children[j]; if (!im.isInstancedMesh) continue;
        const g = new THREE.BufferGeometry(), src = im.geometry;
        Object.entries(src.attributes).forEach(([n, a]) => g.setAttribute(n, a)); if (src.index) g.setIndex(src.index);
        src.groups.forEach(gr => g.addGroup(gr.start, gr.count, gr.materialIndex));
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, rad / 2, cz), R); g.userData.shared = true;
        im.geometry = g; im.frustumCulled = true; im.userData.fk = k; im.userData.list = l; // edytor mapy: który obiekt kliknięto
      }
    });
  };
})();

/* ---------- minimapa ---------- */
const MiniMap = {
  K: 1.6, // piksele warstwy na metr
  layer() {
    const M = Miasto; if (MiniMap._L && MiniMap._Lk === M.G) return MiniMap._L;
    const K = MiniMap.K, W = Math.round(M.W * K), H = Math.round(M.D * K), L = document.createElement('canvas'); L.width = W; L.height = H;
    const g = L.getContext('2d'), P = (x, z) => [(x + M.W / 2) * K, (z + M.D / 2) * K];
    // trawa z lekką fakturą
    g.fillStyle = '#56724a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
    // park
    const pk = M.w([City.PLACES.park.x, City.PLACES.park.y]), [pa, pb] = P(pk.x + 10, pk.z);
    g.fillStyle = '#3f6e3c'; g.beginPath(); g.ellipse(pa, pb, 40 * K, 26 * K, 0, 0, 7); g.fill();
    // rzeka z nabrzeżem
    const river = w => { g.lineWidth = w * K; g.beginPath(); for (let x = -M.W / 2 - 20; x <= M.W / 2 + 20; x += 5) { const [a, b] = P(x, M.riverZ(x)); if (x === -M.W / 2 - 20) g.moveTo(a, b); else g.lineTo(a, b); } g.stroke(); };
    g.lineCap = 'round'; g.strokeStyle = '#8e8c86'; river(19); g.strokeStyle = '#2f6f9a'; river(15); g.strokeStyle = 'rgba(255,255,255,.12)'; river(4);
    // plac i stadion (trybuny, tor, murawa)
    const S = M.stadium(), [sa, sb] = P(S.x, S.z), SR = M.SR;
    g.fillStyle = '#b3aea4'; g.beginPath(); g.ellipse(sa, sb, (SR.x + 10) * K, (SR.z + 10) * K, 0, 0, 7); g.fill();
    g.fillStyle = '#7c8088'; g.beginPath(); g.ellipse(sa, sb, SR.x * K, SR.z * K, 0, 0, 7); g.fill();
    const tr = Track && Track.R ? Track : null, str = (tr && tr.straight) || 72, rr = (tr && tr.R) || 32;
    const oval = (d, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(sa - str / 2 * K, sb - (rr + d) * K); g.lineTo(sa + str / 2 * K, sb - (rr + d) * K); g.arc(sa + str / 2 * K, sb, (rr + d) * K, -Math.PI / 2, Math.PI / 2); g.lineTo(sa - str / 2 * K, sb + (rr + d) * K); g.arc(sa - str / 2 * K, sb, (rr + d) * K, Math.PI / 2, Math.PI * 1.5); g.fill(); };
    oval(6, '#b06a3c'); oval(-5, '#3f8a45');
    // ulice: chodnik, jezdnia, linia środkowa
    const segs = M.segs(), line = (w, col, dash) => { g.strokeStyle = col; g.setLineDash(dash || []); segs.forEach(s => { g.lineWidth = (typeof w === 'function' ? w(s) : w) * K; g.beginPath(); g.moveTo(...P(s.a.x, s.a.z)); g.lineTo(...P(s.b.x, s.b.z)); g.stroke(); }); g.setLineDash([]); };
    g.lineCap = 'round'; line(s => s.wd + 7, '#cfc9bc'); line(s => s.wd, '#46494e'); line(0.35, 'rgba(240,232,200,.8)', [5 * K, 5 * K]);
    // budynki (obrysy obrócone)
    (M.fp || []).forEach(f => {
      if (/^car|bus|police|zuk/.test(f.k)) return;
      g.save(); g.translate(...P(f.x, f.z)); g.rotate(-f.r); g.fillStyle = /^prl/.test(f.k) ? '#c9c1b2' : '#d8b89a'; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
      g.fillRect(-f.w / 2 * K, -f.d / 2 * K, f.w * K, f.d * K); g.strokeRect(-f.w / 2 * K, -f.d / 2 * K, f.w * K, f.d * K); g.restore();
    });
    // nazwy ulic
    g.font = `600 ${Math.round(4.2 * K)}px Barlow, sans-serif`; g.fillStyle = 'rgba(30,30,30,.75)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const seen = new Set();
    segs.forEach(s => { if (seen.has(s.name) || s.len < 60) return; seen.add(s.name); const [a, b] = P((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2); let ang = Math.atan2(s.b.z - s.a.z, s.b.x - s.a.x); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; g.save(); g.translate(a, b); g.rotate(ang); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(s.name, 0, 0); g.restore(); });
    MiniMap._L = L; MiniMap._Lk = M.G; return L;
  },
  pois() {
    const M = Miasto, S = M.stadium(), out = Object.entries(M.doors || {}).map(([k, d]) => ({ k, x: d.x, z: d.z, p: City.PLACES[k] }));
    out.push({ k: 'tor', x: S.x, z: S.z + M.SR.z + 3, p: City.PLACES.tor }); return out.filter(o => o.p);
  },
  icon(g, x, y, p, r) { g.fillStyle = p.c; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.font = `${Math.round(r * 1.15)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.icon, x, y + 1); },
  draw() {
    const M = Miasto, cv = $('#wh-map'); if (!cv || !M.col) return;
    cv.hidden = false; const big = !!Walk.bigMap; cv.classList.toggle('big', big); cv.classList.toggle('round', !big);
    const L = MiniMap.layer(), K = MiniMap.K, px = Walk.x - M.CX, pz = Walk.z;
    if (big) {
      const Sx = 720, sc = Sx / M.W, Sy = Math.round(M.D * sc) + 30; if (cv.width !== Sx || cv.height !== Sy) { cv.width = Sx; cv.height = Sy; }
      const g = cv.getContext('2d'); g.fillStyle = '#1b2230'; g.fillRect(0, 0, Sx, Sy); g.drawImage(L, 0, 0, Sx, Sy - 30);
      const P = (x, z) => [(x + M.W / 2) * sc, (z + M.D / 2) * sc];
      MiniMap.pois().forEach(o => { const [a, b] = P(o.x, o.z); MiniMap.icon(g, a, b, o.p, 11); g.font = '600 11px Barlow, sans-serif'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText(o.p.name, a, b - 18); g.fillText(o.p.name, a, b - 18); });
      MiniMap.extras(g, P, 1);
      MiniMap.arrow(g, ...P(px, pz), -Walk.yaw, 12);
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, Sy - 30, Sx, 30); g.fillStyle = '#fff'; g.font = '13px Barlow, sans-serif'; g.textAlign = 'center'; g.fillText('Kliknij miejsce — taksówka (15 zł) · M — zamknij', Sx / 2, Sy - 11);
      M._mapT = { sc, oz: 0, S: Sx };
      return;
    }
    const S = 230; if (cv.width !== S || cv.height !== S) { cv.width = S; cv.height = S; }
    const g = cv.getContext('2d'), R = S / 2, Z = 1.25; // px na metr
    g.clearRect(0, 0, S, S); g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip();
    g.fillStyle = '#56724a'; g.fillRect(0, 0, S, S);
    g.translate(R, R); g.rotate(Walk.yaw); g.scale(Z / K, Z / K); g.drawImage(L, -(px + M.W / 2) * K, -(pz + M.D / 2) * K);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // punkty: w zasięgu na mapie, dalsze — na krawędzi koła
    const toS = (x, z) => { const dx = (x - px) * Z, dz = (z - pz) * Z, c = Math.cos(Walk.yaw), s = Math.sin(Walk.yaw); return [R + dx * c - dz * s, R + dx * s + dz * c]; };
    MiniMap.extras(g, toS, 0);
    g.restore();
    MiniMap.pois().forEach(o => { let [a, b] = toS(o.x, o.z); const d = Math.hypot(a - R, b - R); if (d > R - 14) { a = R + (a - R) / d * (R - 14); b = R + (b - R) / d * (R - 14); } MiniMap.icon(g, a, b, o.p, 9); });
    // ramka, północ, gracz
    g.strokeStyle = '#11151c'; g.lineWidth = 6; g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.stroke(); g.strokeStyle = '#E0632E'; g.lineWidth = 2; g.stroke();
    const [na, nb] = [R - Math.sin(Walk.yaw) * (R - 3), R - Math.cos(Walk.yaw) * (R - 3)];
    g.fillStyle = '#11151c'; g.beginPath(); g.arc(na, nb, 9, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 11px Barlow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', na, nb + 1);
    MiniMap.arrow(g, R, R, 0, 9);
    const street = (M.nearest(px, pz) || {}).s; if (street && M.nearest(px, pz).d < 14) { g.fillStyle = 'rgba(17,21,28,.8)'; const t = street.name; g.font = '600 11px Barlow, sans-serif'; const w = g.measureText(t).width + 12; g.fillRect(R - w / 2, S - 34, w, 17); g.fillStyle = '#fff'; g.fillText(t, R, S - 25); }
    M._mapT = null;
  },
  /** Zlecenie (dostawa), radiowozy */
  extras(g, P, big) {
    const job = Career.C().job; if (job && job.x != null) { const [a, b] = P(job.x, job.z); g.strokeStyle = '#ffd23a'; g.lineWidth = 3; g.beginPath(); g.arc(a, b, big ? 10 : 8, 0, 7); g.stroke(); }
    (Miasto.traffic || []).forEach(c => { if (c.x == null) return; const [a, b] = P(c.x, c.z); g.fillStyle = c.police ? '#3a7bff' : 'rgba(255,255,255,.75)'; g.fillRect(a - 2, b - 2, 4, 4); });
    ((typeof Job !== 'undefined' && Job.cops) || []).forEach(cp => { if (!cp || cp.state !== 'chase' || !cp.m) return; const [a, b] = P(cp.m.position.x, cp.m.position.z); g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(a, b, 4, 0, 7); g.fill(); });
  },
  arrow(g, x, y, rot, r) {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#ffd23a'; g.strokeStyle = '#111'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.7, r * 0.75); g.lineTo(0, r * 0.35); g.lineTo(-r * 0.7, r * 0.75); g.closePath(); g.fill(); g.stroke(); g.restore();
  },
};
(() => {
  const bmf = Walk.mapFrame;
  Walk.mapFrame = function () { if (Walk.room === 'miasto') return MiniMap.draw(); return bmf.call(this); };
  const bmc = Walk.mapClick;
  Walk.mapClick = function (e) { if (Walk.room === 'miasto' && !Walk.bigMap) { Walk.bigMap = true; if (Walk.locked && Walk.locked()) document.exitPointerLock(); return; } return bmc.call(this, e); };
  const bm = Miasto.make;
  Miasto.make = function (...a) { MiniMap._L = null; return bm.apply(this, a); };
})();

/* ---------- życie w pomieszczeniach: domownicy chodzą, gotują, rozmawiają ---------- */
const RoomLife = {
  list: [],
  /** Postać chodząca między punktami; w punkcie przyjmuje pozę (np. gotowanie) i po chwili rusza dalej */
  add(R, key, pts) { const w = { R, key, pts, i: 0, st: 'walk', t: 0, pos: { x: pts[0].x, z: pts[0].z } }; RoomLife.spawn(w, 'walk'); RoomLife.list.push(w); return w; },
  spawn(w, pose, face) {
    if (w.m) { if (w.m.parent) w.m.parent.remove(w.m); Rooms.dyn = Rooms.dyn.filter(o => o !== w.m); Rooms.anim = Rooms.anim.filter(o => o !== w.m); }
    const m = Humans.make(w.key, pose); if (!m) return;
    m.position.set(w.R.cx + w.pos.x, World.LOCKER_Y, w.pos.z); if (face != null) m.rotation.y = face;
    Rooms.add(m); w.m = m;
  },
  tick(dt) {
    RoomLife.list = RoomLife.list.filter(w => w.m && w.m.parent && Walk.room && World.rooms[Walk.room] === w.R);
    RoomLife.list.forEach(w => {
      const tgt = w.pts[(w.i + 1) % w.pts.length];
      if (w.st === 'walk') {
        const dx = tgt.x - w.pos.x, dz = tgt.z - w.pos.z, d = Math.hypot(dx, dz), h = w.m.userData.human, v = (h.speed || 1) * h.act.timeScale * dt;
        if (d <= v + 0.02) { w.pos = { x: tgt.x, z: tgt.z }; w.i = (w.i + 1) % w.pts.length; w.st = 'stay'; w.t = tgt.wait || 4 + Math.random() * 5; RoomLife.spawn(w, tgt.pose || 'idle', tgt.face); }
        else { w.pos.x += dx / d * v; w.pos.z += dz / d * v; w.m.position.set(w.R.cx + w.pos.x, World.LOCKER_Y, w.pos.z); w.m.rotation.y = Math.atan2(-dz, dx); }
      } else if ((w.t -= dt) <= 0) { w.st = 'walk'; RoomLife.spawn(w, 'walk'); }
    });
  },
  /** Scenariusze pomieszczeń */
  SETUP: {
    parents(R) {
      // siostra krąży: telefon przy oknie → zlew → rozmowa z bratem → pokój z dzieciństwa
      RoomLife.add(R, 'Female_Adult_11', [{ x: 0.8, z: 2.4, pose: 'phone', face: -Math.PI / 2 }, { x: 2.3, z: -4.2, pose: 'work', face: Math.PI / 2, wait: 7 },
        { x: -0.3, z: -1.9, pose: 'talk', face: Math.PI }, { x: -2.8, z: 2.2, pose: 'idle', face: Math.PI / 2 }]);
    },
  },
};
(() => {
  // mama gotuje przy kuchence zamiast siedzieć przy stole
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    const P = World.rooms.parents; if (!P || !P.npc) return;
    const mom = P.npc.find(n => n.key === 'Female_Adult_09'); if (mom) Object.assign(mom, { x: 5.6, z: -4.2, face: Math.PI / 2, pose: 'work' });
  };
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    const r = be.call(this, key); RoomLife.list = [];
    const f = RoomLife.SETUP[key];
    if (f) { const go = () => { if (Walk.room === key && World.rooms[key]) f(World.rooms[key]); }; if (Humans.ready) go(); else Humans.load(go); }
    return r;
  };
  const bt = Rooms.tick;
  Rooms.tick = function (dt) { bt.call(this, dt); if (Walk.room && Walk.room !== 'miasto') RoomLife.tick(dt); };
})();
(() => {
  // strażnik: mecz, wyścig albo ekran menedżera — trybuny wracają na stadion meczowy
  const back = () => { if (Stad.moved.length && Walk.room !== 'miasto') Stad.place(false); };
  const bmd = MatchDay.begin; MatchDay.begin = function (...a) { if (Stad.moved.length) { Stad.place(false); } return bmd.apply(this, a); };
  if (typeof Race !== 'undefined') { const brs = Race.start; Race.start = function (...a) { if (Stad.moved.length) Stad.place(false); return brs.apply(this, a); }; } // Race nie istnieje — bez tego reszta bloku się nie wykonywała
  const bsh = UI.show; UI.show = function (w) { const r = bsh.call(this, w); if (w !== 'md') back(); return r; };
})();
