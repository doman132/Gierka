/* =========================================================
   Speedway Empire 3D — v2.2
   • osiedle „Tysiąclecia” jest częścią miasta (to samo miejsce pieszo i z mapy)
   • poprawki: kliknięcia w okienkach podczas turnieju (rutyna „Teraz”),
     wyjście z siłowni/restauracji nie teleportuje na stadion
   • drzwi: przejście z ulicy do lokalu i z powrotem
   • ruch uliczny: auta trzymają odstęp, hamują, zdarzają się stłuczki
   • policja patroluje pieszo i goni cię, gdy niesiesz paczkę
   • rzeka z realistyczną wodą (odbicia, fale — shader Water z Three.js, MIT)
   • kasyno z modeli: ruletka, blackjack, kolumny, bar, neon
   ========================================================= */
'use strict';

Object.assign(Furn.SRC, {
  lampPH: 'ph/street_lamp_02/street_lamp_02.gltf', shrubPH: 'ph/shrub_01/shrub_01.gltf', shrub2PH: 'ph/shrub_02/shrub_02.gltf', utilBox: 'ph/utility_box_01/utility_box_01.gltf',
  aircon: 'ph/exterior_aircon_unit/exterior_aircon_unit.gltf', streetSeat: 'ph/modular_street_seating/modular_street_seating.gltf', chandelierPH: 'ph/Chandelier_01/Chandelier_01.gltf',
  powerBox: 'ph/power_box_01/power_box_01.gltf', trashbag: 'ph/trashbag/trashbag.gltf', planter: 'ph/planter_box_01/planter_box_01.gltf', manhole: 'ph/water_manhole_cover/water_manhole_cover.gltf',
  casRoulette: 'a3d/casRoulette.glb', casBlackjack: 'a3d/casBlackjack.glb', casColumn: 'a3d/casColumn.glb', casBackBar: 'a3d/casBackBar.glb', casNeon: 'a3d/casNeon.glb', casHostess: 'a3d/casHostess.glb', casFountain: 'a3d/casFountain.glb',
});

/* =========================================================
   OSIEDLE W MIEŚCIE (bloki, garaże, plac zabaw — na mapie świata)
   ========================================================= */
Miasto.buildOsiedle = function (G, n, nx, nz, half, spots, col, blds, doors) {
  const M = Miasto, rr = Math.atan2(-nx, -nz), O = { x: n.x + nx * (half + 24), z: n.z + nz * (half + 24) }, c = Math.cos(rr), s = Math.sin(rr);
  const W = (lx, lz) => ({ x: O.x + lx * c + lz * s, z: O.z - lx * s + lz * c });
  // podłoże podwórka: trawniki i chodniki
  const grass = World.pbr('leafy_grass', 4, 4, { color: '#8aa468' }), walkM = World.pbr('concrete_pavement', 8, 1, { color: '#b0aaa0' }), asph = World.pbr('asphalt_02', 12, 10, { color: '#58585a' });
  const pl = (lx, lz, w, d, mat, y) => { const p = W(lx, lz), m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.set(-Math.PI / 2, 0, rr); m.position.set(p.x, y, p.z); G.add(m); };
  pl(0, 0, 64, 48, asph, 0.03);
  [[-10, -3, 16, 12], [12, -2, 18, 12], [0, 9, 26, 5]].forEach(([x, z, w, d]) => pl(x, z, w, d, grass, 0.045));
  [[0, -13.2, 50, 2.2], [0, 14.8, 50, 2.2], [-22, 0, 2.2, 26], [22, 0, 2.2, 26]].forEach(([x, z, w, d]) => pl(x, z, w, d, walkM, 0.05));
  const L = [['prlBlock16', 0, -27.5, 0, { s: 1 }], ['prlBlock9', -34, 1, Math.PI / 2, { h: 28 }], ['prlBlock9', 34, 1, -Math.PI / 2, { h: 28 }],
    ...(Furn.SRC.garSov ? [-18.5, 16.5].map(x => ['garSov', x, 20.6, Math.PI / 2, { w: 13.5 }]) : [-23, -18.5, -14, 12, 16.5, 21].map(x => ['prlGarage', x, 20.2, Math.PI, { h: 2.5 }])),
    ['kiosk', 14, 9.5, Math.PI, { h: 3 }], ['trzepak', -6, 4, Math.PI / 2, { h: 1.8 }], ['prlSubstation', 25, 13, 0, { h: 4 }],
    ['swings', 12, -3, 0, {}], ['slide', 17, 0, Math.PI / 2, {}], ['sandpit', 9, 1.5, 0, {}], ['benchPark', 6.5, -4.1, 0, {}], ['benchPark', -12, 3.5, Math.PI / 2, {}], ['benchPark', 2, 10.5, Math.PI, {}],
    ['dumpster', 20, 9.5, Math.PI, {}], ['dumpster', 17.7, 9.5, Math.PI, {}], ['carCity', -14, 10.5, Math.PI / 2, {}], ['carSedan', -8, 10.5, Math.PI / 2, {}], ['carVan', 4, 12.5, -Math.PI / 2, {}]];
  L.forEach(([k, lx, lz, r, size]) => {
    if (!Furn.cache[k]) return; const p = W(lx, lz), g = Furn.place(G, k, p.x, 0, p.z, r + rr, size); if (!g) return;
    const sc = M.scaleFor(k, size); if (Furn.cache[k].size.y * sc > 0.5) col.push(M.box(k, p.x, p.z, r + rr, sc, 0.95));
  });
  World.treeBillboards('small', [[-14, -6], [-9, -9], [16, -8], [8, -9], [-17, 6], [18, 5], [4, 6.5], [-2, -8]].map(([lx, lz], i) => { const p = W(lx, lz); return { x: p.x, z: p.z, rot: i, h: 7 + (i % 3) * 2 }; }), G);
  blds.push({ x: O.x, z: O.z, rad: 48 });
  // miejsca akcji i ludzie
  [['c:osiedle:trzepak', -6, 5.6, 'Trzepak — pogadaj z chłopakami z bloku'], ['c:osiedle:kiosk', 14, 11.6, 'Kiosk — gazeta (6 zł)'], ['c:osiedle:garage', -20.8, 15.4, 'Garaż kumpla — dłub przy silniku'],
    ['o:deal', 9.6, 15.8, 'Za garażami… „szemrana robota”'], ['o:bench', 6.5, -3.2, 'Pani Halinka z ławki — plotki']].forEach(([id, lx, lz, label]) => { const p = W(lx, lz); spots.push({ id, x: p.x, z: p.z, label, r: 1.8 }); });
  M.osNpc = [[-5.2, 3.4, 0.7, 'Male_Adult_07', 'laugh'], [-6.9, 3.5, 0.3, 'Male_Adult_13', 'idle'], [10.6, 16.3, 1, 'Male_Adult_16', 'nervous'], [6.5, -4.1, 0, 'Female_Adult_06', 'sit'], [14, 8.2, 0, 'Male_Adult_09', 'idle']]
    .map(([lx, lz, f, key, pose]) => { const p = W(lx, lz); return { x: p.x, z: p.z, r: f * Math.PI + rr, key, pose }; });
  const e = W(0, 23.5); doors.osiedle = { x: e.x, z: e.z, yaw: Math.atan2(nx, nz), bx: O.x, bz: O.z };
};
(() => {
  // z mapy „Wejdź” na osiedle → to samo miejsce w mieście
  const ben = City.enter;
  City.enter = function (place) { if (place === 'osiedle') { Miasto.go('osiedle'); return; } return ben.call(this, place); };
  delete City.ROOM.osiedle;
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    be.call(this, key);
    if (key === 'miasto' && Miasto.osNpc && !Miasto._osDone && Humans.ready) { Miasto._osDone = true; Miasto.osNpc.forEach(n => { const m = Humans.make(n.key, n.pose, {}); if (m) { m.position.set(n.x, 0, n.z); m.rotation.y = n.r; Miasto.G.add(m); } }); }
  };
})();

/* =========================================================
   POPRAWKI
   ========================================================= */
// kliknięcia w okienkach, gdy widać świat 3D (turniej, mecz): rutyna „Teraz”, diagnoza, doping…
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('#modal [data-ui]'); if (!t) return;
  if (document.getElementById('md').hidden || Walk.active) return;
  e.stopImmediatePropagation(); UI.click(e);
}, true);
(() => {
  // wyjście z siłowni/biura/restauracji w karierze: nie na stadion, tylko tam, skąd przyszedłeś
  const bl = Walk.leaveRoom;
  Walk.leaveRoom = function (silent) {
    const key = Walk.room, R = key && World.rooms[key];
    if (!silent && R && R.exitTo && Game.s && Game.s.mode === 'career' && (City._mapRoom === key || !World.hotspots || !World.hotspots.find(h => h.id === R.exitTo))) {
      City._mapRoom = null;
      if (City._world && World.rooms.miasto) { const place = City._door || City.Z().loc; Walk.enterRoom('miasto'); Miasto.toDoor(place); return; }
      const f = Walk.onExit; Walk.stopQuiet(); if (f) f(key); return;
    }
    return bl.call(this, silent);
  };
  const ben = City.enter;
  City.enter = function (place) { City._mapRoom = City.ROOM[place] || null; return ben.call(this, place); };
})();

/* =========================================================
   DRZWI: płynne przejście ulica ↔ lokal
   ========================================================= */
const Door = {
  fade(fn, label) {
    let ov = document.getElementById('doorfade'); if (!ov) { ov = document.createElement('div'); ov.id = 'doorfade'; document.body.appendChild(ov); }
    ov.innerHTML = label ? `<small>🚪 ${esc(label)}</small>` : ''; ov.className = 'on';
    try { if (typeof Sound !== 'undefined' && Sound.click) Sound.click(); } catch (e) { }
    setTimeout(() => { fn(); setTimeout(() => { ov.className = ''; }, 120); }, 330);
  },
};
(() => {
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id.startsWith('w:in:') && !Door._busy) { Door._busy = true; const place = id.slice(5); Door.fade(() => { Door._busy = false; bra.call(Career, id); }, City.PLACES[place] ? City.PLACES[place].name : ''); return true; }
    return bra.call(this, id);
  };
  const bl = Walk.leaveRoom;
  Walk.leaveRoom = function (silent) {
    if (!silent && City._world && Walk.room && Walk.room !== 'miasto' && Walk.room !== 'party' && World.rooms.miasto && !Door._out) { Door._out = true; Door.fade(() => { Door._out = false; bl.call(Walk, silent); }, 'Na ulicę'); return; }
    return bl.call(this, silent);
  };
})();

/* =========================================================
   RUCH ULICZNY: odstępy, hamowanie, stłuczki, potrącenia
   ========================================================= */
Miasto.tick = function (dt) {
  const M = Miasto; if (!M.traffic || Walk.room !== 'miasto') return;
  const px = Walk.x - M.CX, pz = Walk.z, segs = M.segs();
  // pozycje i kierunki
  M.traffic.forEach(c => {
    const s = segs[c.seg], dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, lane = 2.4 * c.dir;
    c.x = s.a.x + dx * c.t - dz * lane; c.z = s.a.z + dz * c.t + dx * lane; c.hx = dx * c.dir; c.hz = dz * c.dir;
    if (c.vc == null) c.vc = c.v;
  });
  M.traffic.forEach(c => {
    if (c.crash > 0) { c.crash -= dt; if (c.crash <= 0) { c.g.rotation.z = 0; c.vc = 0; } return; }
    // co jest przed maską: inne auto albo pieszy
    let gap = 99;
    M.traffic.forEach(o => { if (o === c) return; const rx = o.x - c.x, rz = o.z - c.z, ahead = rx * c.hx + rz * c.hz, lat = Math.abs(-rx * c.hz + rz * c.hx); const ext = (o.hl || 2.3) + (c.hl || 2.3) - 4.6; if (ahead > 0 && ahead < 14 + ext && lat < 2.2) gap = Math.min(gap, ahead - ext); });
    { const rx = px - c.x, rz = pz - c.z, ahead = rx * c.hx + rz * c.hz, lat = Math.abs(-rx * c.hz + rz * c.hx); if (ahead > 0 && ahead < 12 && lat < 1.8) gap = Math.min(gap, ahead - 1); }
    const want = gap < 6 ? 0 : gap < 14 ? c.v * (gap - 6) / 8 : c.v;
    c.vc += R.clamp(want - c.vc, -9 * dt, 3.5 * dt); // hamowanie mocniejsze niż przyspieszanie
    c.t += c.vc * dt * c.dir;
    const s = segs[c.seg];
    if (c.t > s.len || c.t < 0) {
      const end = c.dir > 0 ? s.b : s.a, next = segs.map((o, i) => [o, i]).filter(([o]) => o !== s && (Math.hypot(o.a.x - end.x, o.a.z - end.z) < 2 || Math.hypot(o.b.x - end.x, o.b.z - end.z) < 2));
      if (next.length) { const [o, i] = next[Math.floor(Math.random() * next.length)], atA = Math.hypot(o.a.x - end.x, o.a.z - end.z) < 2; c.seg = i; c.dir = atA ? 1 : -1; c.t = atA ? 0 : o.len; }
      else { c.dir *= -1; c.t = R.clamp(c.t, 0, s.len); }
    }
    c.g.position.set(c.x, 0, c.z); c.g.rotation.y = Math.atan2(c.hx, c.hz);
    // potrącenie: pieszy wbiegł pod koła
    if (c.vc > 4 && Math.abs((px - c.x) * c.hx + (pz - c.z) * c.hz) < (c.hl || 2.3) && Math.abs(-(px - c.x) * c.hz + (pz - c.z) * c.hx) < 1.2 && !M._hitCool) {
      M._hitCool = 6; const r = Career.me(); r.injury = Math.max(r.injury, 1); const Z = City.Z(); Z.stress += 15; City.clamp(Z); Game.save();
      UI.toast('Pisk opon! Auto potrąciło cię na przejściu — stłuczone biodro (tydzień przerwy).', true); if (typeof Inj !== 'undefined') Inj.check();
    }
  });
  if (M._hitCool) M._hitCool = Math.max(0, M._hitCool - dt);
  // stłuczki: dwa auta z różnych kierunków w tym samym miejscu (skrzyżowania)
  for (let i = 0; i < M.traffic.length; i++) for (let j = i + 1; j < M.traffic.length; j++) {
    const a = M.traffic[i], b = M.traffic[j]; if (a.crash > 0 || b.crash > 0) continue;
    if (Math.hypot(a.x - b.x, a.z - b.z) < 2.6 && Math.abs(a.hx * b.hx + a.hz * b.hz) < 0.85 && (a.vc > 2 || b.vc > 2)) {
      a.crash = b.crash = 18 + Math.random() * 14; a.vc = b.vc = 0; a.g.rotation.z = 0.04; b.g.rotation.z = -0.04;
      const d = Math.hypot(a.x - px, a.z - pz); if (d < 90) UI.toast(`💥 Stłuczka na ${segs[a.seg].name}! Kierowcy wysiadają i się kłócą.`);
    }
  }
  (M.walkers || []).forEach(w => {
    const s = segs[w.seg], dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, off = (s.wd / 2 + 1.6) * w.side;
    w.t += w.v * dt * w.dir; if (w.t > s.len - 2 || w.t < 2) w.dir *= -1;
    w.m.position.set(s.a.x + dx * w.t - dz * off, 0, s.a.z + dz * w.t + dx * off); w.m.rotation.y = Math.atan2(-dz * w.dir, dx * w.dir);
  });
  if (M.water) M.water.material.uniforms.time.value += dt * 0.6;
};

/* =========================================================
   POLICJA: patrole pieszo, pościg za tobą, gdy masz paczkę
   ========================================================= */
Job.spawn = function () {
  const C = Career.C(), M = Miasto; if (!M.G || !Humans.ready) return;
  (Job._objs || []).forEach(o => o.parent && o.parent.remove(o)); Job._objs = [];
  Walk.spots = Walk.spots.filter(s => s.id !== 'w:job');
  if (C.job) {
    const m = Humans.make(C.job.key, 'nervous', {}); if (m) { m.position.set(C.job.x, 0, C.job.z); m.rotation.y = C.job.yaw; M.G.add(m); Job._objs.push(m); }
    Walk.spots.push({ id: 'w:job', x: M.CX + C.job.x, z: C.job.z, label: `📦 Oddaj paczkę: ${C.job.who}`, r: 2.4 });
  }
  if (!Job.cops) {
    Job.cops = [];
    const segs = M.segs();
    [0, 1, 3, 5, 6].forEach((si, i) => {
      const s = segs[si % segs.length], m = Humans.make(Humans.byRole('police'), 'walk', { sex: 'm' }); if (!m) return; M.G.add(m);
      const h = m.userData.human; Job.cops.push({ m, h, seg: si % segs.length, t: s.len * (0.3 + i * 0.1), dir: i % 2 ? 1 : -1, side: i % 2 ? 1 : -1, v: h.speed * h.act.timeScale, ts: h.act.timeScale, state: 'patrol' });
    });
  }
};
Job.tick = function (dt) {
  const C = Career.C(), J = C.job, Z = City.Z(), M = Miasto;
  if (J && (Z.day !== J.day || City.minOf(Z) > J.until)) { Job.fail('Nie zdążyłeś — odbiorca się zmył.'); return; }
  if (Walk.room !== 'miasto' || !Job.cops) return;
  const px = Walk.x - M.CX, pz = Walk.z, run = Walk.keys.ShiftLeft || Walk.keys.ShiftRight, segs = M.segs();
  Job.cops.forEach(cp => {
    const d = Math.hypot(cp.m.position.x - px, cp.m.position.z - pz);
    if (cp.state === 'patrol') {
      const s = segs[cp.seg], dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, off = (s.wd / 2 + 1.6) * cp.side;
      cp.t += cp.v * dt * cp.dir; if (cp.t > s.len - 2 || cp.t < 2) cp.dir *= -1;
      cp.m.position.set(s.a.x + dx * cp.t - dz * off, 0, s.a.z + dz * cp.t + dx * off); cp.m.rotation.y = Math.atan2(-dz * cp.dir, dx * cp.dir);
      // zauważył: masz paczkę, jesteś blisko, a biegniesz albo on ma nosa
      if (J && !Job._stop && d < 16 && (run ? Math.random() < dt * 0.8 : Math.random() < dt * (0.08 + (C.dealHeat || 0) * 0.3))) {
        cp.state = 'chase'; cp.lost = 0; cp.h.act.timeScale = cp.ts * 2.2; UI.toast('👮 „Stój! Policja! Kontrola!” — policjant biegnie w twoją stronę!', true);
      }
    } else if (cp.state === 'chase') {
      const vx = px - cp.m.position.x, vz = pz - cp.m.position.z, L = Math.hypot(vx, vz) || 1, sp = 6.3;
      cp.m.position.x += vx / L * sp * dt; cp.m.position.z += vz / L * sp * dt; cp.m.rotation.y = Math.atan2(-vz, vx);
      if (d < 1.3) { cp.state = 'back'; cp.h.act.timeScale = cp.ts; Job.stop(true); }
      else if (d > 38 || !C.job) { cp.lost += dt; if (cp.lost > 3) { cp.state = 'back'; cp.h.act.timeScale = cp.ts; UI.toast('Zgubiłeś pościg w bocznych uliczkach…'); } } else cp.lost = 0;
    } else { // wraca na swoją trasę
      const s = segs[cp.seg], dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, off = (s.wd / 2 + 1.6) * cp.side, tx = s.a.x + dx * cp.t - dz * off, tz = s.a.z + dz * cp.t + dx * off;
      const vx = tx - cp.m.position.x, vz = tz - cp.m.position.z, L = Math.hypot(vx, vz);
      if (L < 0.5) cp.state = 'patrol'; else { cp.m.position.x += vx / L * cp.v * dt; cp.m.position.z += vz / L * cp.v * dt; cp.m.rotation.y = Math.atan2(-vz, vx); }
    }
  });
  // radiowóz obok, gdy masz paczkę — też może zatrzymać
  if (J && !Job._stop && (M.traffic || []).some(c => c.police && Math.hypot(c.x - px, c.z - pz) < 8) && Math.random() < dt * 0.15) Job.stop(false);
};
(() => {
  // przy złapaniu po pościgu nie da się już uciec
  const bs = Job.stop;
  Job.stop = function (caught) {
    bs.call(this); if (!caught) return;
    const box = document.querySelector('#modal .talk-opts'); if (box) { const r = box.querySelector('[data-v="run"]'); if (r) r.remove(); }
    const p = document.querySelector('#modal .dilemma p'); if (p) p.textContent = 'Policjant dogonił cię i trzyma za ramię. Drugi już podbiega. Nie ma dokąd uciec.';
  };
  // przy zmianie paczki/wejściu do miasta odśwież patrole
  const bb = Miasto.make;
  Miasto.make = function () { Job.cops = null; bb.call(this); Miasto.addWater(); };
})();

/* =========================================================
   WODA: shader Water (Three.js, MIT) z mapą normalnych, nabrzeża
   ========================================================= */
Miasto.addWater = function () {
  const M = Miasto, G = M.G; if (!G || !THREE.Water) return;
  // usuń proste płaszczyzny wody
  G.children.filter(o => o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x2d5a78).forEach(o => G.remove(o));
  const xs = []; for (let x = -M.W / 2 - 40; x <= M.W / 2 + 40; x += 4) xs.push(x);
  const pos = [], idx = [], half = 7.5;
  xs.forEach((x, i) => { const z = M.riverZ(x); pos.push(x, -(z - half), 0, x, -(z + half), 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const tex = new THREE.TextureLoader().load('models/tex/water/waternormals.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  const water = new THREE.Water(geo, { textureWidth: 512, textureHeight: 512, waterNormals: tex, sunDirection: new THREE.Vector3(-0.5, 0.8, 0.3).normalize(), sunColor: 0x9a9a8a, waterColor: 0x10313a, distortionScale: 3.2, fog: !!World.scene.fog });
  water.rotation.x = -Math.PI / 2; water.position.y = 0.03; G.add(water); M.water = water; // nad trawą, pod jezdnią mostów
  // nabrzeża z betonu
  const bank = World.pbr('concrete_floor_02', 1, 1, { color: '#8e8c86' });
  xs.forEach((x, i) => { if (!i) return; const x0 = xs[i - 1]; [-1, 1].forEach(sd => { const z0 = M.riverZ(x0) + sd * (half + 0.9), z1 = M.riverZ(x) + sd * (half + 0.9), L = Math.hypot(x - x0, z1 - z0); const m = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.5, 1.8), bank); m.position.set((x + x0) / 2, 0.05, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x - x0); G.add(m); }); });
};

/* =========================================================
   KASYNO Z MODELI
   ========================================================= */
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    const R = World.rooms.casino; if (!R) return;
    // proste stoły z brył chowamy, gdy wczytają się modele
    R.group.children.forEach(o => { if (o.isGroup && Math.abs(Math.abs(o.position.x) - 4.5) < 0.1) o.traverse(m => { m.userData.fb = true; }); });
    Rooms.FURN.casino = (Rooms.FURN.casino || []).concat([
      ['casRoulette', -4.5, 0, -1.5, 0, { w: 3.6 }], ['casBlackjack', 4.5, 0, -1.9, Math.PI, { w: 3.2 }],
      ['casColumn', -7.5, 0, -3.5, 0, { h: 3.8 }], ['casColumn', 7.5, 0, -3.5, 0, { h: 3.8 }], ['casColumn', -7.5, 0, 3.5, 0, { h: 3.8 }], ['casColumn', 1.5, 0, 3.5, 0, { h: 3.8 }],
      ['casBackBar', 6.6, 0, 5.6, Math.PI, { w: 4 }], ['casNeon', 6.6, 2.3, 6.85, Math.PI, { w: 2.4 }], ['casHostess', -1.8, 0, 5.4, Math.PI, {}], ['casFountain', -5.5, 0, 4.2, 0, { w: 2.2 }]]);
  };
})();
