/* =========================================================
   Speedway Empire 3D — v2.6: nowe budynki, bar, mieszkanie rodziców
   Modele: Sketchfab (CC BY) — autorzy w models/CREDITS.txt
   ========================================================= */
'use strict';

/* ---------- budynki miasta zamiast pastelowych klocków ---------- */
Object.assign(Furn.SRC, {
  prlNTen: 'sk/bTenement.glb', prlNBrick: 'sk/bBrickShop.glb', prlNOld: 'sk/bOld.glb', prlNPanel: 'sk/bPanel9.glb', prlNShop: 'sk/bShopOld.glb',
  bOldPack: 'sk/bOldPack.glb', bResid: 'sk/bResid.glb', bBrutal: 'sk/bBrutal.glb',
});
Object.assign(Furn.PART, {
  prlNOld1: ['bOldPack', 'Building_1*'], prlNOld2: ['bOldPack', 'Building_2*'], prlNOld3: ['bOldPack', 'Building_3*'],
  prlNRes1: ['bResid', 'buillding1*'], prlNRes2: ['bResid', 'buillding2*'], prlNBrut: ['bBrutal', 'Object_5'],
});
['prlNOld1', 'prlNOld2', 'prlNOld3', 'prlNRes1', 'prlNRes2', 'prlNBrut'].forEach(k => { Furn.SRC[k] = ''; });
Object.assign(Furn.FIX, {
  prlNOld: { s: 1.2 }, prlNOld1: { s: 1.6, roof: true }, prlNOld2: { s: 1.6, roof: true }, prlNOld3: { s: 1.6, roof: true }, prlNRes1: { s: 10 }, prlNRes2: { s: 10 }, prlNBrut: { s: 50 },
  prlNShop: { drop: ['Plane_Ground', 'Environments'] },
});
// zabudowa: kamienice, stare domy, bloki z płyty (ostatnie dwa — szkoła i przychodnia — rzadziej)
Miasto.FILL = ['prlNBrick', 'prlNOld', 'prlNOld1', 'prlNOld2', 'prlNOld3', 'prlNRes1', 'prlNRes2', 'prlNPanel', 'prlNBrut', 'prlNShop', 'prlNTen',
  'prlB5', 'prlB12', 'prlBSov', 'prlBEnter', 'prlKhrush', 'prlNBrick', 'prlNOld1', 'prlNOld2', 'prlNBrut', 'prlNRes1', 'prlSchool', 'prlClinic'];
Object.assign(MapEdit.NAMES, {
  prlNTen: 'Kamienica (długa)', prlNBrick: 'Ceglany ze sklepem', prlNOld: 'Stara kamienica', prlNOld1: 'Stary dom 1', prlNOld2: 'Stary dom 2', prlNOld3: 'Stary dom 3',
  prlNRes1: 'Bloki z usługami', prlNRes2: 'Blok narożny', prlNPanel: 'Wieżowiec z płyty', prlNBrut: 'Blok z płyty (5 p.)', prlNShop: 'Stary sklep',
  tribune: 'Trybuna', poolTable: 'Stół bilardowy', jukebox: 'Szafa grająca', pubCounter: 'Lada barowa',
});
MapEdit.EXTRA_B = ['prlNTen', 'prlNBrick', 'prlNOld', 'prlNOld1', 'prlNOld2', 'prlNOld3', 'prlNRes1', 'prlNRes2', 'prlNPanel', 'prlNBrut', 'prlNShop'];

/* ---------- lokale w nowych budynkach + szyldy nad drzwiami ---------- */
Object.assign(Miasto.VENUE, {
  silownia: ['prlNShop', { s: 1 }], restauracja: ['prlNOld', { s: 1 }], bar: ['prlNBrick', { s: 1 }], park: ['prlNOld3', { s: 1 }],
  kasyno: ['prlBEnter', { s: 1 }], psycholog: ['prlNOld2', { s: 1 }], klub: ['prlNRes2', { s: 1 }],
});
(() => {
  const bb = Portal.build;
  Portal.build = function () {
    bb.call(this);
    Portal.doors.forEach(d => {
      const P = City.PLACES[d.place]; if (!P) return;
      const tex = World.canvasTex(512, 96, g => {
        g.fillStyle = '#15181f'; g.fillRect(0, 0, 512, 96); g.strokeStyle = P.c || '#E0632E'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 90);
        g.font = '44px sans-serif'; g.textBaseline = 'middle'; g.fillText(P.icon || '', 18, 50);
        g.fillStyle = '#fff'; g.font = 'bold 34px Barlow, sans-serif'; const t = P.name.length > 24 ? P.name.slice(0, 23) + '…' : P.name; g.fillText(t, 78, 50);
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(0, Portal.H + 0.62, 0.2); d.g.add(sign);
    });
  };
})();

/* ---------- kolizje z geometrii modelu (ściany i meble wnętrz z jednego pliku) ---------- */
const MeshCol = {
  /** Komórki 25 cm zajęte przez trójkąty na wysokości 0,25–1,6 m nad podłogą → prostokąty kolizji (współrzędne świata) */
  build(root, y0, cell = 0.25) {
    root.updateMatrixWorld(true);
    const occ = new Map(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], lo = y0 + 0.25, hi = y0 + 1.6;
    root.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      const g = o.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count;
      for (let t = 0; t < n; t += 3) {
        for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(P, I ? I.getX(t + j) : t + j).applyMatrix4(o.matrixWorld);
        const y1 = Math.min(v[0].y, v[1].y, v[2].y), y2 = Math.max(v[0].y, v[1].y, v[2].y);
        if (y2 < lo || y1 > hi) continue;
        const x1 = Math.min(v[0].x, v[1].x, v[2].x), x2 = Math.max(v[0].x, v[1].x, v[2].x), z1 = Math.min(v[0].z, v[1].z, v[2].z), z2 = Math.max(v[0].z, v[1].z, v[2].z);
        if ((x2 - x1) * (z2 - z1) > 6) continue; // duże płaszczyzny (sufit, podłoga pod kątem) pomijamy
        for (let cx = Math.floor(x1 / cell); cx <= Math.floor(x2 / cell); cx++) for (let cz = Math.floor(z1 / cell); cz <= Math.floor(z2 / cell); cz++) occ.set(cx + ':' + cz, [cx, cz]);
      }
    });
    // scal komórki w poziome pasy
    const rows = {}; occ.forEach(([cx, cz]) => { (rows[cz] = rows[cz] || []).push(cx); });
    const out = [];
    Object.entries(rows).forEach(([cz, xs]) => { xs.sort((a, b) => a - b); let s = xs[0], p = xs[0]; for (let i = 1; i <= xs.length; i++) { if (i < xs.length && xs[i] === p + 1) { p = xs[i]; continue; } out.push({ x0: s * cell, x1: (p + 1) * cell, z0: cz * cell, z1: (+cz + 1) * cell }); if (i < xs.length) { s = p = xs[i]; } } });
    return out;
  },
};
(() => {
  const bc = Rooms.colliders;
  Rooms.colliders = function () { const c = bc.call(this), R = Walk.room && World.rooms[Walk.room]; if (!R || !R.meshCol) return c; if (Rooms._mcBase !== c || Rooms._mcR !== R) { Rooms._mcBase = c; Rooms._mcR = R; Rooms._mc = c.concat(R.meshCol); } return Rooms._mc; };
})();

/* ---------- BAR: tylna sala z modelu „Pub interior”, nowy bilard i szafa grająca, kelnerka ---------- */
Object.assign(Furn.SRC, { pubRoom: 'sk/pubInt.glb', skPool: 'sk/poolTable.glb', skJukebox: 'sk/jukebox.glb', skCounter: 'sk/pubCounter.glb', bigWheel: 'sk/roulette2.glb', tribune: 'sk/tribune.glb' });
Object.assign(Furn.FIX, { skJukebox: { s: 0.01 }, pubBooth: { s: 0.01 }, pubRoom: { ry: -Math.PI / 2 }, skPool: { opaque: true } });
const PubBack = {
  CX: 800,
  build() {
    const Y = World.LOCKER_Y, G = new THREE.Group(); World.venueGroup.add(G);
    G.userData.lights = [];
    [[0, -2.5], [0, 1.5], [2.6, -1]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffc98a, 0.9, 9, 1.6); l.position.set(PubBack.CX + x, Y + 3.3, z); l.visible = false; G.add(l); G.userData.lights.push(l); });
    World.rooms.pubBack = { cx: PubBack.CX, W: 8.1, D: 9.3, name: 'Bar „Pod Taśmą” — sala z tyłu', exitTo: null, group: G, place: 'bar',
      spots: [{ id: 'v:barPub', x: 0.2, z: -2.2, label: 'Lada — piwo, burger, frytki' }, { id: 'v:jukebox', x: 2.9, z: 0.2, label: 'Szafa grająca — puść piosenkę' }],
      npc: [{ x: 0, z: -4.0, face: -Math.PI / 2, key: 'Chef_Female_01', pose: 'work' }],
      crowd: [[-1.2, 1.2, 0, 'talk'], [1.6, 1.4, 3.14, 'drink'], [-2.8, -2.6, 1.57, 'drink'], [2.4, -2.6, 1.57, 'drink']] };
  },
  furnish() {
    const R = World.rooms.pubBack; Furn.load(['pubRoom', 'skJukebox'], () => {
      if (Walk.room !== 'pubBack') return;
      const g = Furn.place(World.venueGroup, 'pubRoom', R.cx, World.LOCKER_Y, 0, 0, { s: 1 }); if (!g) return; Rooms.dyn.push(g);
      const j = Furn.place(World.venueGroup, 'skJukebox', R.cx + 3.5, World.LOCKER_Y, 0.2, -Math.PI / 2, { h: 1.6 }); if (j) Rooms.dyn.push(j);
      if (!R.meshCol) R.meshCol = MeshCol.build(g, World.LOCKER_Y);
      Rooms._mcR = null;
    });
  },
};
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    PubBack.build();
    const P = World.rooms.pub;
    if (P) P.spots.push({ id: 'v:pubBack', x: 7.2, z: -4.4, label: '🚪 Tylna sala (loże, szafa grająca)' });
    // drzwi do tylnej sali na ścianie baru
    if (P && P.group) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.6 })); d.position.set(P.cx + 7.2, World.LOCKER_Y + 1.1, -5.95); P.group.add(d); }
    const F = Rooms.FURN.pub;
    if (F) F.forEach(f => { if (f[0] === 'poolTable') { f[0] = 'skPool'; f[5] = { w: 2.5 }; } if (f[0] === 'jukebox') { f[0] = 'skJukebox'; f[5] = { h: 1.6 }; } });
    const C = Rooms.FURN.casino;
    if (C) C.push(['bigWheel', 6.2, 2.4, -6.75, 0, { w: 1.8 }]);
  };
  const bp = Rooms.populate;
  Rooms.populate = function (key) { const s = bp.call(this, key); if (key === 'pubBack') PubBack.furnish(); return s; };
  // przejścia bar ↔ tylna sala
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id === 'v:pubBack') { Walk.enterRoom('pubBack'); const R = World.rooms.pubBack; Walk.x = R.cx + 2.8; Walk.z = 3.4; Walk.yaw = 0.3; return true; }
    if (id === 'v:jukebox') { const songs = ['„Żużlowa jazda”', '„Taśma w górę”', '„Czarny sport”', '„Ostatni łuk”']; UI.toast(`🎵 Szafa gra ${songs[Math.floor(Math.random() * songs.length)]}. Ktoś przy loży kiwa głową w rytm.`); try { const Z = City.Z(); Z.stress = Math.max(0, Z.stress - 2); City.clamp(Z); } catch (e) { } return true; }
    return bra.call(this, id);
  };
  const bl = Walk.leaveRoom;
  Walk.leaveRoom = function (silent) {
    if (!silent && Walk.room === 'pubBack') { Walk.enterRoom('pub'); const R = World.rooms.pub; Walk.x = R.cx + 7.2; Walk.z = -4.6; Walk.yaw = Math.PI; return; }
    return bl.call(this, silent);
  };
  // kelnerka krąży między ladą a stolikami; gracz przy bilardzie
  RoomLife.SETUP.pub = R => {
    RoomLife.add(R, 'Female_Adult_13', [{ x: -2.4, z: -3.0, pose: 'idle', face: Math.PI / 2 }, { x: 1.0, z: -0.2, pose: 'talk', face: Math.PI / 2 }, { x: -3.2, z: 0.8, pose: 'talk', face: 0 },
      { x: 5.6, z: 3.3, pose: 'talk', face: -Math.PI / 2 }, { x: 1.2, z: 3.4, pose: 'idle', face: 0 }]);
  };
  // koło ruletki w kasynie: pionowo na ścianie, powoli się kręci
  const bt = Rooms.tick;
  Rooms.tick = function (dt) {
    bt.call(this, dt);
    if (Walk.room !== 'casino') return;
    if (!PubBack.wheel || !PubBack.wheel.parent || !PubBack.wheel.parent.parent) { const g = Rooms.dyn.find(o => o.userData && o.userData.fk === 'bigWheel'); PubBack.wheel = g ? g.children[0] : null; if (g) g.rotation.x = Math.PI / 2; }
    if (PubBack.wheel) PubBack.wheel.rotation.y += dt * 0.6;
  };
})();

/* ---------- DOM RODZICÓW: całe mieszkanie z modelu (salon, jadalnia, kuchnia, sypialnia, łazienka) ---------- */
Furn.SRC.flatHome = 'sk/flatApp.glb';
const Flat = {
  CX: 700,
  build() {
    const old = World.rooms.parents; if (old && old.group && old.group.parent) old.group.parent.remove(old.group);
    const Y = World.LOCKER_Y, G = new THREE.Group(); World.venueGroup.add(G); G.userData.lights = [];
    [[-1.8, 3.2], [1.5, 3.4], [2.6, 0.5], [0.3, -2.4], [-2.2, -3.6], [-0.4, 0.4]].forEach(([x, z]) => { const l = new THREE.PointLight(0xfff0dc, 0.55, 7, 1.6); l.position.set(Flat.CX + x, Y + 2.3, z); l.visible = false; G.add(l); G.userData.lights.push(l); });
    // ściany zewnętrzne i strop (model jest przekrojem z obniżonymi ścianami)
    const wallM = World.pbr('white_plaster_02', 3, 1, { color: '#ece6da' }), H = 2.62, W = 7.3, D = 10.9;
    [[0, -D / 2 - 0.06, W + 0.3, 0.12], [0, D / 2 + 0.06, W + 0.3, 0.12], [-W / 2 - 0.06, 0, 0.12, D + 0.3], [W / 2 + 0.06, 0, 0.12, D + 0.3]].forEach(([x, z, w, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallM); m.position.set(Flat.CX + x, Y + H / 2, z); G.add(m);
    });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, D + 0.3), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(Flat.CX, Y + 2.55, 0); G.add(ceil);
    World.rooms.parents = { cx: Flat.CX, W: 7.4, D: 11, name: 'Dom rodzinny', exitTo: null, group: G, place: 'rodzice', flat: true,
      spots: Flat.SPOTS.map(s => ({ ...s })), npc: Flat.NPC.map(n => ({ ...n })), crowd: [] };
    Rooms.FURN.parents = [];
  },
  SPOTS: [{ id: 'c:rodzice:obiad', x: 1.2, z: 1.9, label: 'Stół w jadalni — obiad u mamy' }, { id: 'c:rodzice:tata', x: -1.3, z: 0.2, label: 'Tata w salonie — pogadaj' }, { id: 'c:rodzice:brat', x: -2.4, z: -3.6, label: 'Brat w swoim pokoju — trening na minitorze' }],
  NPC: [{ x: 1.0, z: -2.3, face: Math.PI / 2, key: 'Female_Adult_09', pose: 'work' }, { x: -1.3, z: -0.5, face: 0, key: 'Male_Adult_18', pose: 'talk' }, { x: -2.9, z: -3.6, face: 0, key: 'Male_Adult_05', pose: 'phone' }],
  SPAWN: { x: 1.3, z: 4.3, yaw: 0 },
  furnish() {
    const R = World.rooms.parents; Furn.load(['flatHome'], () => {
      if (Walk.room !== 'parents') return;
      const g = Furn.place(World.venueGroup, 'flatHome', R.cx, World.LOCKER_Y, 0, 0, { s: 1 }); if (!g) return; Rooms.dyn.push(g);
      const C = Furn.cache.flatHome;
      if (!R.meshCol) R.meshCol = MeshCol.build(g, World.LOCKER_Y);
      Rooms._mcR = null;
    });
  },
};
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () { bb.call(this); Flat.build(); };
  const bp = Rooms.populate;
  Rooms.populate = function (key) { const s = bp.call(this, key); if (key === 'parents') Flat.furnish(); return s; };
  RoomLife.SETUP.parents = R => {
    // siostra: telefon w salonie → kuchnia → sypialnia → jadalnia
    RoomLife.add(R, 'Female_Adult_11', [{ x: 0.3, z: 1.95, pose: 'phone', face: -Math.PI / 2 }, { x: -1.3, z: 1.95, pose: 'idle', face: 0, wait: 2 }, { x: -1.3, z: -2.2, pose: 'talk', face: 0 },
      { x: 2.3, z: -2.3, pose: 'work', face: Math.PI / 2, wait: 7 }, { x: -1.3, z: -2.2, pose: 'idle', face: Math.PI, wait: 2 }, { x: -1.3, z: 1.95, pose: 'idle', face: 0, wait: 2 }]);
  };
})();

/* ---------- bezpiecznik: gracz nigdy nie utknie w meblu (pokoje z kolizjami z geometrii) ---------- */
(() => {
  const free = (x, z) => { const R = World.rooms[Walk.room], c = Rooms.colliders(); return x > R.cx - R.W / 2 + 0.5 && x < R.cx + R.W / 2 - 0.5 && z > -R.D / 2 + 0.5 && z < R.D / 2 - 0.35 && !c.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1); };
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    const r = be.call(this, key);
    const R = World.rooms[key]; if (key === 'parents' && R && R.flat && !Portal._busy) { Walk.x = R.cx + Flat.SPAWN.x; Walk.z = Flat.SPAWN.z; Walk.yaw = Flat.SPAWN.yaw; }
    return r;
  };
  const bt = Rooms.tick;
  Rooms.tick = function (dt) {
    bt.call(this, dt);
    const R = Walk.room && World.rooms[Walk.room]; if (!R || !R.meshCol || free(Walk.x, Walk.z)) return;
    for (let r = 0.25; r < 4; r += 0.25) for (let a = 0; a < 6.28; a += 0.4) { const x = Walk.x + Math.cos(a) * r, z = Walk.z + Math.sin(a) * r; if (free(x, z)) { Walk.x = x; Walk.z = z; return; } }
  };
})();
