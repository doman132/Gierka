/* =========================================================
   Speedway Empire 3D — v2.1
   • krzesła i siedzący ludzie zwróceni przodem do stołów (wszystkie wnętrza)
   • zegar dobowy: 24 godziny, każde zajęcie trwa, spacer zabiera czas
   • bloki z wielkiej płyty na wzór prawdziwych (szary beton, loggie, anteny)
   ========================================================= */
'use strict';

/* =========================================================
   KRZESŁA I SIEDZĄCY
   ========================================================= */
Object.assign(Furn, {
  SEAT: /chair|stool|Chair|Stool/,
  TABLE: /[Tt]able|[Dd]esk|poker|bistro|dining|counter|Counter|pubTill|pastryCase/,
  SOFA: /sofa|Sofa|booth|wersalka/,
  /** Przód mebla (wektor w układzie modelu): przeciwnie do oparcia — wyliczany z geometrii */
  front(k) {
    Furn._front = Furn._front || {};
    if (k in Furn._front) return Furn._front[k];
    const C = Furn.cache[k]; if (!C) return null;
    C.scene.updateMatrixWorld(true);
    const v = new THREE.Vector3(); let sx = 0, sz = 0, n = 0; const hy = C.min.y + C.size.y * 0.62;
    C.scene.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; const P = o.geometry.attributes.position, step = Math.max(1, Math.floor(P.count / 400)); for (let i = 0; i < P.count; i += step) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); if (v.y > hy) { sx += v.x; sz += v.z; n++; } } });
    let f = null;
    if (n >= 8) { const ax = sx / n - C.c.x, az = sz / n - C.c.z, L = Math.hypot(ax, az); if (L > 0.06 * Math.max(C.size.x, C.size.z)) f = { x: -ax / L, z: -az / L }; }
    return (Furn._front[k] = f);
  },
});
(() => {
  // zapamiętaj, jaki mebel stoi w grupie
  const bp = Furn.place;
  Furn.place = function (parent, k, x, y, z, rot = 0, size = {}) { const g = bp.call(this, parent, k, x, y, z, rot, size); if (g) { g.userData.fk = k; } return g; };
})();
const phi = (x, z) => Math.atan2(x, z); // kąt wektora (od +z w stronę +x); obrót o r dodaje r
Rooms.fixSeats = function () {
  const items = Rooms.dyn.filter(o => o.userData && o.userData.fk);
  const tables = items.filter(o => Furn.TABLE.test(o.userData.fk));
  const seats = items.filter(o => Furn.SEAT.test(o.userData.fk) || Furn.SOFA.test(o.userData.fk));
  // 1) krzesło przy stole/biurku/ladzie: przodem do niego
  seats.forEach(s => {
    if (Furn.SOFA.test(s.userData.fk) || s.userData.fixed) return;
    const f = Furn.front(s.userData.fk); if (!f) { s.userData.fixed = true; return; }
    let best = null, bd = 2.0;
    tables.forEach(t => { const bx = new THREE.Box3().setFromObject(t), cx = R.clamp(s.position.x, bx.min.x, bx.max.x), cz = R.clamp(s.position.z, bx.min.z, bx.max.z), d = Math.hypot(cx - s.position.x, cz - s.position.z); if (d < bd) { bd = d; best = { x: cx, z: cz, c: bx.getCenter(new THREE.Vector3()) }; } });
    if (best) {
      let tx = best.x - s.position.x, tz = best.z - s.position.z; if (Math.hypot(tx, tz) < 0.05) { tx = best.c.x - s.position.x; tz = best.c.z - s.position.z; }
      s.rotation.y = phi(tx, tz) - phi(f.x, f.z);
    }
    s.userData.fixed = true;
  });
  // 2) siedzący ludzie: na najbliższym siedzisku, przodem jak siedzisko
  const used = new Set();
  Rooms.dyn.filter(o => o.userData && o.userData.human && /^sit/.test(o.userData.human.pose || '')).forEach(m => {
    let best = null, bd = 1.3;
    seats.forEach(s => { if (used.has(s) && !Furn.SOFA.test(s.userData.fk)) return; const d = Math.hypot(s.position.x - m.position.x, s.position.z - m.position.z); if (d < bd) { bd = d; best = s; } });
    if (!best) return; used.add(best);
    const f = Furn.front(best.userData.fk); if (!f) return;
    const r = best.rotation.y, wx = f.x * Math.cos(r) + f.z * Math.sin(r), wz = -f.x * Math.sin(r) + f.z * Math.cos(r);
    if (Furn.SOFA.test(best.userData.fk)) { // kanapa: zostań w swoim miejscu wzdłuż kanapy, ale na siedzisku
      const lx = wz, lz = -wx, dx = m.position.x - best.position.x, dz = m.position.z - best.position.z, along = R.clamp(dx * lx + dz * lz, -0.7, 0.7);
      m.position.x = best.position.x + lx * along + wx * 0.05; m.position.z = best.position.z + lz * along + wz * 0.05;
    } else { m.position.x = best.position.x + wx * 0.04; m.position.z = best.position.z + wz * 0.04; }
    m.rotation.y = phi(wx, wz) - Math.PI / 2; // postać Rocketbox przy obrocie 0 patrzy w +x
    // podpis nad głową idzie za postacią
    Rooms.dyn.forEach(t => { if (t.isSprite && Math.hypot(t.position.x - m.position.x, t.position.z - m.position.z) < 1.4 && t.userData.follow !== false) { t.position.x = m.position.x; t.position.z = m.position.z; } });
  });
};
(() => {
  const bt = Rooms.tick;
  Rooms.tick = function (dt) { bt.call(this, dt); const n = Rooms.dyn.length; if (Rooms._seatN !== n) { Rooms._seatN = n; try { Rooms.fixSeats(); } catch (e) { console.warn(e); } } };
  const bc = Rooms.clear;
  Rooms.clear = function () { Rooms._seatN = -1; return bc.call(this); };
})();

/* =========================================================
   MODELE (pobrane: OpenGameArt CC0, 3dassets.dev CC0)
   ========================================================= */
('prlBlock16 prlBlock9 prlGarage prlSchool prlClinic prlStove prlSubstation cB1 cB2 cB3 cB4 cB5 cB6 cB7 cB8 cB9 cB10 cB11 cB12 cB13 cB14 cB15 '
  + 'vCafe vBar vRest vCasino vTower vClub vGym kostka busShelter lampCity grandstand stadGate carSedan carSuv carGT carVan carCamper carRoadster carCoupe2 carCity bus '
  + 'treeOak treeBirch treeOakY prlDresser prlVitrine prlShelf prlTV prlRug prlArmchair prlSideboard trzepak kiosk pullup').split(' ').forEach(k => { Furn.SRC[k] = 'a3d/' + k + '.glb'; });
(() => {
  // modele z OBJ (3ds Max) miały przyciemniony kolor rozproszenia — tekstura w pełnej jasności
  const bl = Furn.load;
  Furn.load = function (keys, cb) {
    return bl.call(this, keys, () => { keys.forEach(k => { const C = Furn.cache[k]; if (C && /^prl/.test(k) && !C._lit) { C._lit = true; C.scene.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.color) m.color.setRGB(1, 1, 1); m.metalness = 0; m.roughness = 0.9; }); }); } }); cb && cb(); });
  };
})();

/* =========================================================
   ZEGAR DOBOWY
   ========================================================= */
Object.assign(City, {
  // ile minut trwa zajęcie (domyślnie 60)
  DUR: { cook: 45, nap: 90, chill: 120, train: 120, ride: 90, engine: 90, weights: 90, cardio: 60, sauna: 60, meal: 60, fast: 20, beer: 90, meet: 60, meetc: 45, party: 240,
    walk: 60, coffee: 30, date: 150, roulette: 20, slots: 15, therapy: 60, breath: 30, sponsor: 120, fans: 90, coach: 30, trzepak: 45, garage: 90, kiosk: 10,
    rehab: 60, pool: 60, fear: 60, inspect: 45, trip: 600, obiad: 60, tata: 30, brat: 90 },
  DUR_BY_NAME: [[/Impreza/, 240], [/Randka w domu/, 120], [/Randka/, 150], [/Ruletka/, 20], [/Jazda treningowa/, 90], [/Sekretne/, 120], [/Wyjazd/, 600], [/Blackjack/, 20], [/Darts|Bilard/, 30], [/Piwo|Whisky|Bar/, 30]],
  minOf(Z) { if (Z.min == null) Z.min = 7 * 60 + (Z.slot || 0) * 300; return Z.min; },
  timeStr(m = City.minOf(City.Z())) { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; },
  slotOf(m) { return m < 12 * 60 ? 0 : m < 18 * 60 ? 1 : 2; },
  durOf(A) { if (!A) return 30; if (A.id && City.DUR[A.id]) return City.DUR[A.id]; const n = A.n || ''; const r = City.DUR_BY_NAME.find(([re]) => re.test(n)); return r ? r[1] : 60; },
  /** Upływ czasu: głód i zmęczenie; o północy padasz ze zmęczenia */
  advance(min, quiet) {
    const Z = City.Z(); if (Z.day > 5 || min <= 0) return;
    City.minOf(Z); Z.min += min;
    Z.food -= min / 60 * 2.6; Z.energy -= min / 60 * 1.2;
    Z.slot = City.slotOf(Z.min);
    City.clamp(Z);
    if (Z.min >= 24 * 60 && !City._collapsing) {
      City._collapsing = true; Z.stress += 6;
      if (!quiet) UI.toast('Północ minęła — padasz ze zmęczenia. Jutro będzie ciężej (stres +6).', true);
      City.endDay(true); City._collapsing = false;
    }
  },
});
(() => {
  City.pay = function (Z, A, msg, noTime) {
    if (A && A.free) return;
    if (msg) { Z.log.push(`${City.DAYS[Math.min(5, Z.day)].slice(0, 3)} ${City.timeStr()}: ${A ? A.n : ''} — ${msg}`); UI.toast(msg); }
    if (!noTime) City.advance(City.durOf(A)); else City.advance(10);
    if (Z.food < 15) Z.stress += 4;
    City.clamp(Z); Game.save(); if (!Walk.active) Career.render();
  };
  const be = City.endDay;
  City.endDay = function (auto) { const Z = City.Z(), d0 = Z.day; be.call(this, auto); if (Z.day !== d0) { Z.min = 7 * 60 + (Z.energy < 30 ? 90 : 0); Z.slot = 0; } };
  // widok miasta: godzina zamiast pory dnia
  const bv = City.view;
  City.view = function () {
    const Z = City.Z(); City.minOf(Z);
    return bv.call(this).replace(/<b>(Poniedziałek|Wtorek|Środa|Czwartek|Piątek|Sobota), (rano|po południu|wieczorem)<\/b> · zostało pór w tygodniu: \d+/, `<b>$1, godz. ${City.timeStr()}</b> · do północy ${Math.max(0, Math.floor((24 * 60 - Z.min) / 60))} h`)
      .replace(/(class="clock"[^>]*>)[^<]*(<)/, `$1${Z.day > 5 ? 'Niedziela — mecz' : `${City.DAYS[Z.day]}, ${City.timeStr()}`}$2`)
      .replace(/data-v="(\w+)" ([^>]*)><b>([^<]*)<\/b><small>/g, (m, id, rest, n) => { const A = Object.values(City.ACTS).flat().find(a => a.id === id); return A && !A.free ? `data-v="${id}" ${rest}><b>${n}</b><small>⏱ ${City.durOf(A)} min · ` : m; });
  };
  // zegar na ekranie podczas chodzenia i upływ czasu w ruchu
  const bf = Walk.frame;
  Walk.frame = function (dt) {
    const x0 = Walk.x, z0 = Walk.z; bf.call(this, dt);
    const s = Game.s; if (!s || s.mode !== 'career' || !s.career.city) return;
    const Z = City.Z(), moved = Math.hypot(Walk.x - x0, Walk.z - z0);
    if (Z.day <= 5) {
      // w mieście: 1 minuta gry na ~45 m marszu; we wnętrzach czas płynie wolno
      const outdoor = Walk.room && World.rooms[Walk.room] && World.rooms[Walk.room].outdoor;
      City._acc = (City._acc || 0) + (outdoor ? moved / 45 + dt / 20 : dt / 12);
      if (City._acc >= 1) { const m = Math.floor(City._acc); City._acc -= m; City.advance(m, false); }
    }
    let el = document.getElementById('wh-clock'); if (!el) { el = document.createElement('div'); el.id = 'wh-clock'; document.getElementById('md').appendChild(el); }
    el.hidden = false; el.innerHTML = `🕒 <b>${Z.day > 5 ? 'Nd' : City.DAYS[Z.day].slice(0, 3)} ${City.timeStr()}</b> · ⚡${Math.round(Z.energy)} 🍽${Math.round(Z.food)}`;
  };
  const bs = Walk.stop, bq = Walk.stopQuiet;
  const hide = () => { const el = document.getElementById('wh-clock'); if (el) el.hidden = true; };
  Walk.stop = function (t) { hide(); return bs.call(this, t); };
  Walk.stopQuiet = function () { hide(); return bq.call(this); };
})();
(() => {
  const bz = City.Z;
  City.Z = function () { const Z = bz.call(this); if (Z._wkMin !== Z.wk) { Z._wkMin = Z.wk; Z.min = 7 * 60; } return Z; };
})();

/* =========================================================
   OSIEDLE Z MODELI (bloki z OpenGameArt, garaże, kiosk, trzepak)
   ========================================================= */
World.buildOsiedle = function () {
  const cx = 600, W = 60, D = 44, Y = World.LOCKER_Y;
  const G = new THREE.Group(); G.position.set(cx, Y, 0); World.scene.add(G); G.userData.lights = [];
  const skyTex = World.canvasTex(64, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6d8fbf'); gr.addColorStop(0.45, '#a9c0da'); gr.addColorStop(0.62, '#e8dccb'); gr.addColorStop(0.7, '#8a8f95'); gr.addColorStop(1, '#4a4d52'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
  G.add(new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })));
  const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x5a5048, 0.75); hemi.visible = false; G.userData.lights.push(hemi); G.add(hemi);
  const sun = new THREE.PointLight(0xffe0b8, 0.9, 160, 1.2); sun.position.set(-20, 45, 25); sun.visible = false; G.userData.lights.push(sun); G.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 140), World.pbr('asphalt_02', 26, 23, { color: '#5a5a5c' })); ground.rotation.x = -Math.PI / 2; G.add(ground);
  const grass = World.pbr('leafy_grass', 4, 4, { color: '#8aa468' });
  [[-10, -3, 16, 12], [12, -2, 18, 12], [0, 9, 26, 5]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grass); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); G.add(m); });
  const walkM = World.pbr('concrete_pavement', 8, 1, { color: '#b0aaa0' });
  [[0, -13.2, 50, 2.2], [0, 14.8, 50, 2.2], [-22, 0, 2.2, 26], [22, 0, 2.2, 26]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), walkM); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); G.add(m); });
  World.rooms.osiedle = { cx, W, D, name: 'Osiedle „Tysiąclecia” — podwórko', exitTo: null, group: G, place: 'osiedle', outdoor: true,
    spots: [{ id: 'c:osiedle:trzepak', x: -6, z: 5.6, label: 'Trzepak — pogadaj z chłopakami z bloku' }, { id: 'c:osiedle:kiosk', x: 14, z: 11.6, label: 'Kiosk — gazeta (6 zł)' },
      { id: 'c:osiedle:garage', x: -20.8, z: 15.4, label: 'Garaż kumpla — dłub przy silniku' }, { id: 'o:deal', x: 9.6, z: 15.8, label: 'Za garażami… „szemrana robota”' }, { id: 'o:bench', x: 6.5, z: -3.2, label: 'Pani Halinka z ławki — plotki' }],
    npc: [{ x: -5.2, z: 3.4, face: Math.PI * 0.7, key: 'Male_Adult_07', pose: 'laugh' }, { x: -6.9, z: 3.5, face: Math.PI * 0.3, key: 'Male_Adult_13', pose: 'idle' }, { x: 10.6, z: 16.3, face: Math.PI, key: 'Male_Adult_16', pose: 'nervous' },
      { x: 6.5, z: -4.1, face: 0, key: 'Female_Adult_06', pose: 'sit' }, { x: 14, z: 8.2, face: 0, key: 'Male_Adult_09', pose: 'idle' }], crowd: [] };
  const L = [];
  // bloki: szesnastopiętrowiec z tyłu, dwa dziewięciopiętrowce po bokach
  L.push(['prlBlock16', 0, 0, -27.5, 0, { s: 1 }], ['prlBlock9', -34, 0, 1, Math.PI / 2, { h: 28 }], ['prlBlock9', 34, 0, 1, -Math.PI / 2, { h: 28 }]);
  // garaże blaszaki od frontu
  [-23, -18.5, -14, 12, 16.5, 21].forEach(x => L.push(['prlGarage', x, 0, 20.2, Math.PI, { h: 2.5 }]));
  L.push(['kiosk', 14, 0, 9.5, Math.PI, { h: 3 }], ['trzepak', -6, 0, 4, Math.PI / 2, { h: 1.8 }], ['prlSubstation', 25, 0, 13, 0, { h: 4 }]);
  [[-18, -12], [-10.8, 13.4], [-3.6, -12], [3.6, 13.4], [10.8, -12], [18, 13.4]].forEach(([x, z]) => L.push(['lampCity', x, 0, z, z > 0 ? Math.PI : 0, { h: 6 }]));
  [[-14, -6, 'treeBirch'], [-9, -9, 'treeOakY'], [16, -8, 'treeBirch'], [8, -9, 'treeOakY'], [-17, 6, 'treeOakY'], [18, 5, 'treeBirch'], [4, 6.5, 'treeOakY'], [-2, -8, 'treeBirch']].forEach(([x, z, k]) => L.push([k, x, 0, z, Math.random() * 6, { h: k === 'treeBirch' ? 11 : 7 }]));
  L.push(['swings', 12, 0, -3, 0, {}], ['slide', 17, 0, 0, Math.PI / 2, {}], ['sandpit', 9, 0, 1.5, 0, {}], ['benchPark', 6.5, 0, -4.1, 0, {}], ['benchPark', -12, 0, 3.5, Math.PI / 2, {}], ['benchPark', 2, 0, 10.5, Math.PI, {}],
    ['dumpster', 20, 0, 9.5, Math.PI, {}], ['dumpster', 17.7, 0, 9.5, Math.PI, {}], ['carCity', -14, 0, 10.5, Math.PI / 2, {}], ['carSedan', -8, 0, 10.5, Math.PI / 2, {}], ['carVan', 4, 0, 12.5, -Math.PI / 2, {}], ['carSuv', -20, 0, -9, 0, {}]);
  Rooms.FURN.osiedle = L;
};

/* =========================================================
   DOM RODZINNY — wnętrze z PRL z modeli (kredens, witryna, telewizor, kuchenka)
   ========================================================= */
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    const old = World.rooms.parents; if (old && old.group) World.scene.remove(old.group);
    const G = World.roomShell(700, 14, 11, 2.7, { floorTex: 'wood_floor', tint: '#a8784c', wallTex: 'yellow_plaster', wallTint: '#efe0c0', lamp: 0xffd8a8, lampI: 0.7, fScale: 2.2, homey: true });
    World.rooms.parents = { cx: 700, W: 14, D: 11, name: 'Dom rodzinny', exitTo: null, group: G, place: 'rodzice',
      spots: [{ id: 'c:rodzice:obiad', x: 4.2, z: 2.2, label: 'Stół w kuchni — obiad u mamy' }, { id: 'c:rodzice:tata', x: -4, z: 0.6, label: 'Tata na wersalce — pogadaj' }, { id: 'c:rodzice:brat', x: -1.4, z: -1.2, label: 'Brat — trening na minitorze' }],
      npc: [{ x: 3.4, z: 0.8, face: 0, key: 'Female_Adult_09', pose: 'sit' }, { x: -4, z: -1.0, face: Math.PI / 2, key: 'Male_Adult_18', pose: 'sit' }, { x: -1.4, z: -2.2, face: 0, key: 'Male_Adult_05', pose: 'laugh' }], crowd: [] };
    Rooms.FURN.parents = [
      // pokój: meblościanka z witryną, kredens, telewizor na komodzie, wersalka, dywan, fotel
      ['prlSideboard', -5.6, 0, -5.1, 0, {}], ['prlTV', -5.6, 'top:prlSideboard', -5.1, 0, { h: 0.75 }], ['prlVitrine', -3.9, 0, -5.2, 0, {}], ['prlShelf', -2.5, 0, -5.2, 0, {}],
      ['sofa', -4, 0, -1.0, Math.PI, {}], ['prlRug', -4, 0.012, -3, 0, { w: 3.2 }], ['coffee', -4, 0, -3, 0, {}], ['prlArmchair', -1.6, 0, -3.1, -Math.PI / 2, {}],
      ['chandelier', -4, 1.75, -2.6, 0, { h: 0.8 }], ['plant2', -6.4, 0, -1.8, 0, {}], ['wallClock', -1.2, 2.0, -5.45, 0, {}],
      // kuchnia: kuchenka gazowa, lodówka, szafka, kredens z talerzami, stół z krzesłami
      ['prlStove', 6.1, 0, -5.1, 0, { h: 0.88 }], ['fridge', 4.9, 0, -5.2, 0, {}], ['kBase', 3.7, 0, -5.2, 0, {}], ['prlDresser', 6.6, 0, -1.2, -Math.PI / 2, { h: 2.2 }],
      ['diningRound', 4.2, 0, 0.8, 0, {}], ['diningChair', 3.4, 0, 0.8, 0, {}], ['diningChair', 5.0, 0, 0.8, 0, {}], ['diningChair', 4.2, 0, 1.6, 0, {}], ['chandelier', 4.2, 1.75, 0.8, 0, { h: 0.7 }], ['plantTall', 6.3, 0, 4.4, 0, {}]];
  };
})();
