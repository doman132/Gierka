/* =========================================================
   Speedway Empire 3D — spacer menedżera po stadionie
   Widok z oczu (FPP): W/S/A/D albo strzałki — chodzenie,
   Shift — szybciej, przytrzymana mysz — rozglądanie się,
   E — akcja w pobliżu (zielony napis na dole), Esc — powrót.
   Parking z autami kibiców, kasy, sklep, budynek klubowy
   (szatnia z zawodnikami, biuro prezesa), warsztat, centrum
   medyczne i treningowe, szkółka, gospodarz toru.
   ========================================================= */
'use strict';

const Walk = {
  active: false, walkers: [], route: null, x: 0, z: 0, yaw: 0, pitch: -0.05, keys: {}, room: null, near: null, bob: 0, drag: null, riders: [], onExit: null,

  start() {
    const s = Game.s, club = Game.club(s.user);
    UI.close();
    UI.show('md');
    World.enterVenue(s.user);
    World.setVenue(club.name, club.kevlar, club.trim, club.short);
    World.setFlagColors(club.kevlar, club.trim);
    World.setTeams(club, null);
    World.setRiders([]);
    World.setStadium({ fill: 0.03, lights: Club.lvl('lights'), boards: (s.club && s.club.sponsors) || [] });
    // kibice i goście krążą między parkingiem a bramami stadionu i budynkiem klubowym
    const zB = (World.mainBack || 60) + 3, gates = [], len = World.mainLen || 80;
    for (let gx = -len / 2 + 6; gx < len / 2; gx += 12) gates.push({ x: gx, z: zB - 2.3 });
    const route = { from: [{ x: -30, z: zB + 20 }, { x: 0, z: zB + 22 }, { x: 30, z: zB + 20 }, { x: 10, z: zB + 36 }], to: gates.concat([{ x: 4, z: zB + 7.5 }]) };
    Walk.spawnWalkers(route);
    World.setScreen([club.short, club.name, `Sezon ${s.season}`]);
    World.outdoorProps();
    Walk.paintLocker(club);
    MatchDay.panel('');
    const sp = World.spawn || { x: 0, z: 60, yaw: Math.PI };
    Object.assign(Walk, { active: true, x: sp.x, z: sp.z, yaw: 0, pitch: -0.05, room: null, near: null, keys: {}, onExit: null });
    World.camera.fov = 68; World.camera.updateProjectionMatrix();
    Walk.hud(true);
    World.resize();
  },

  /** Przechodnie: realistyczni ludzie idą z parkingu do bram (a bez modeli — lżejsi z tłumu) */
  spawnWalkers(route) {
    Walk.walkers.forEach(w => { if (w.m.parent) w.m.parent.remove(w.m); }); Walk.walkers = [];
    if (!Humans.ready) { People.walk = route; Humans.load(() => { if (Walk.active) Walk.spawnWalkers(route); }); return; }
    People.walk = null; Walk.route = route;
    const pt = (list, sx, sz) => { const a = Crowd.pick(list); return { x: a.x + (Math.random() - 0.5) * sx, z: a.z + (Math.random() - 0.5) * sz }; };
    for (let i = 0; i < 24; i++) {
      const m = Humans.make(null, 'walk', { sex: Math.random() < 0.3 ? 'f' : 'm' }), h = m.userData.human;
      // start w losowym miejscu trasy parking → brama (albo z powrotem)
      const back = Math.random() < 0.35, a = pt(back ? route.to : route.from, 6, 3), b = pt(back ? route.from : route.to, 3, 2), f = Math.random();
      const w = { m, x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, tgt: b, back, v: h.speed * h.act.timeScale, pause: 0 };
      w.yaw = Math.atan2(-(b.z - w.z), b.x - w.x);
      World.venueGroup.add(m); Walk.walkers.push(w);
    }
  },
  /** Chód bez teleportów: po dojściu do celu obraca się płynnie i idzie w kolejne miejsce */
  tickWalkers(dt) {
    if (!Walk.walkers.length || Walk.room) return;
    const R = Walk.route;
    Walk.walkers.forEach(w => {
      if (w.m.parent !== World.venueGroup) World.venueGroup.add(w.m);
      const dx = w.tgt.x - w.x, dz = w.tgt.z - w.z;
      if (Math.hypot(dx, dz) < 1) { w.back = !w.back; const a = Crowd.pick(w.back ? R.from : R.to); w.tgt = { x: a.x + (Math.random() - 0.5) * (w.back ? 6 : 3), z: a.z + (Math.random() - 0.5) * 2.5 }; }
      const want = Math.atan2(-dz, dx); let d = want - w.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      w.yaw += d * Math.min(1, dt * 2.5);
      const v = w.v * (Math.abs(d) > 1.2 ? 0.3 : 1); // przy ostrym zakręcie zwalnia
      w.x += Math.cos(w.yaw) * v * dt; w.z -= Math.sin(w.yaw) * v * dt;
      w.m.position.set(w.x, 0, w.z); w.m.rotation.y = w.yaw;
    });
  },

  /** Wejście od razu do pokoju (kariera: mieszkanie, klub nocny); onExit — co po wyjściu */
  startRoom(key, onExit) {
    const s = Game.s, club = Game.club(s.user);
    UI.close(); UI.show('md');
    World.enterVenue(s.user);
    World.setVenue(club.name, club.kevlar, club.trim, club.short);
    World.setRiders([]);
    MatchDay.panel('');
    Object.assign(Walk, { active: true, near: null, keys: {}, onExit });
    World.camera.fov = 68; World.camera.updateProjectionMatrix();
    Walk.hud(true);
    World.resize();
    Walk.enterRoom(key);
  },

  stop(tab) {
    People.walk = null;
    Walk.walkers.forEach(w => { if (w.m.parent) w.m.parent.remove(w.m); }); Walk.walkers = [];
    Walk.leaveRoom(true);
    Walk.active = false;
    Walk.hud(false);
    World.camera.fov = 42; World.camera.updateProjectionMatrix();
    UI.close();
    if (tab) UI.tab = tab;
    UI.show('mgr'); UI.render();
  },

  hud(on) {
    let h = $('#walk-hud');
    if (!h) {
      h = document.createElement('div'); h.id = 'walk-hud';
      h.innerHTML = `<div class="wh-top"><b id="wh-place"></b><small>W/S/A/D — chodzenie · Shift — szybciej · M — mapa · kliknij w obraz — sterowanie myszą (bez trzymania przycisku) · lewy przycisk / E — akcja · Esc — uwolnij kursor</small></div>
        <div id="wh-prompt"></div><div class="wh-cross"></div><div class="wh-lock">Kliknij w obraz, aby rozglądać się myszą</div><canvas id="wh-map" width="240" height="240" title="Mapa — kliknij miejsce, aby tam przejść (M — duża mapa)"></canvas><button class="ghost small" id="wh-exit" data-walk="exit">Wyjdź ✕</button>
        <div class="wh-pad"><button data-wk="KeyW">▲</button><button data-wk="KeyA">◀</button><button data-wk="KeyS">▼</button><button data-wk="KeyD">▶</button><button data-wk="KeyE" class="e">E</button></div>`;
      $('#md').appendChild(h);
      h.querySelectorAll('[data-wk]').forEach(b => {
        const k = b.dataset.wk, dn = ev => { ev.preventDefault(); if (k === 'KeyE') Walk.act(); else Walk.keys[k] = true; }, up = ev => { ev.preventDefault(); Walk.keys[k] = false; };
        b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
      });
    }
    h.hidden = !on;
    if (!on && Walk.locked()) document.exitPointerLock();
    h.classList.toggle('locked', !!Walk.locked());
    $('#md-hud').hidden = true; $('#ride-hud').hidden = true;
  },

  /** Herb na ścianie szatni i skład na tablicy taktycznej */
  paintLocker(club, refs = World.lockerRefs && World.lockerRefs.locker, away) {
    if (!refs) return;
    refs.doorMat.color.set(club.kevlar).convertSRGBToLinear();
    if (refs.kevMat) refs.kevMat.color.set(club.kevlar).convertSRGBToLinear().lerp(new THREE.Color(1, 1, 1), 0.08);
    const c = refs.crestTex.canvas, g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    g.beginPath(); g.moveTo(128, 12); g.lineTo(232, 48); g.lineTo(232, 140); g.bezierCurveTo(232, 206, 180, 236, 128, 250); g.bezierCurveTo(76, 236, 24, 206, 24, 140); g.lineTo(24, 48); g.closePath();
    g.fillStyle = club.kevlar; g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
    g.fillStyle = club.trim; g.fillRect(24, 100, 208, 40);
    g.font = 'bold 60px "Saira Stencil One", Impact, sans-serif'; g.textAlign = 'center'; g.fillText(club.short, 128, 206);
    refs.crestTex.needsUpdate = true;
    const b = refs.boardTex.canvas, t = b.getContext('2d'), L = Game.s.lineups[club.id] || [];
    t.fillStyle = '#f4f4f0'; t.fillRect(0, 0, 512, 256);
    t.fillStyle = '#1F3A8A'; t.font = 'bold 30px "Caveat", cursive'; t.fillText('PLAN NA MECZ', 20, 38);
    t.font = '24px "Caveat", cursive';
    L.slice(0, 8).forEach((id, i) => { const r = Game.s.riders[id]; t.fillText(`${i + (away ? 1 : 9)}. ${r ? r.name : '—'}`, 20 + (i >= 4 ? 250 : 0), 80 + (i % 4) * 40); });
    t.strokeStyle = '#B8272E'; t.lineWidth = 3; t.beginPath(); t.ellipse(400, 60, 60, 26, 0, 0, 7); t.stroke();
    t.fillStyle = '#B8272E'; t.fillText('start!', 372, 68);
    refs.boardTex.needsUpdate = true;
    // TV: program zawodów
    if (refs.tvTex) {
      const tv = refs.tvTex.canvas.getContext('2d'), fx = Game.userFixture(), H = fx && Game.club(fx.h), A = fx && Game.club(fx.a);
      tv.fillStyle = '#081018'; tv.fillRect(0, 0, 512, 288); tv.fillStyle = club.kevlar; tv.fillRect(0, 0, 512, 44);
      tv.fillStyle = '#fff'; tv.font = 'bold 26px Barlow, sans-serif'; tv.textAlign = 'center'; tv.fillText('PROGRAM ZAWODÓW', 256, 31);
      tv.font = 'bold 34px Barlow, sans-serif'; tv.fillText(fx ? `${H.short}  —  ${A.short}` : 'Brak meczu w tym tygodniu', 256, 110);
      tv.font = '22px Barlow, sans-serif'; tv.fillStyle = '#9fb3c8'; tv.fillText(`${DATA.LEAGUE} · ${Game.phaseName ? Game.phaseName(Game.s.week) : ''}`, 256, 150);
      tv.fillText('Prezentacja 18:45 · Pierwszy bieg 19:00', 256, 190); tv.fillText('15 biegów · pola startowe wg programu', 256, 225);
      refs.tvTex.needsUpdate = true;
    }
  },

  /* ---------- pokoje (szatnia i wnętrza budynków) ---------- */
  enterRoom(key) {
    const R = World.rooms[key];
    Walk.leaveRoom(true);
    Walk.indoor(true);
    Walk.room = key; Walk.x = R.cx; Walk.z = R.D / 2 - 1.6; Walk.yaw = 0; Walk.pitch = -0.08;
    Walk.indoor(true);
    if (!People.ready) People.load(() => { // ludzie dochodzą, gdy modele się wczytają
      if (Walk.room !== key) return;
      const keep = [Walk.x, Walk.z, Walk.yaw, Walk.pitch]; Walk.enterRoom(key); [Walk.x, Walk.z, Walk.yaw, Walk.pitch] = keep;
    });
    if (key === 'locker' || key === 'lockerAway') return Walk.fillLocker(key);
    Walk.spots = Rooms.populate(key);
    if (key === 'office') Walk.paintOffice();
  },
  /** Szatnia: gospodarze (twoi zawodnicy) albo goście (zawodnicy najbliższego rywala) */
  fillLocker(key = 'locker') {
    const s = Game.s, L = World.locker, Y = World.LOCKER_Y, away = key === 'lockerAway', R = World.rooms[key], cx = R.cx;
    const fx = Game.userFixture(), oppId = fx ? (fx.h === s.user ? fx.a : fx.h) : s.clubs.find(c => c.id !== s.user).id;
    const clubId = away ? oppId : s.user, club = Game.club(clubId);
    Walk.paintLocker(club, World.lockerRefs[key], away);
    Walk.spots = [{ id: 'r:exit', x: cx, z: L.Dp / 2 - 0.7, label: away ? 'Wyjdź z szatni gości' : 'Wyjdź z szatni', r: 1.3 },
      away ? { id: 'r:scout', x: cx + 3.2, z: L.Dp / 2 - 1.1, label: `Podpatrz tablicę rywali (${club.short}) — skład i forma`, r: 1.4 } : { id: 'board', x: cx + 3.2, z: L.Dp / 2 - 1.1, label: 'Tablica taktyczna — skład', r: 1.4 },
      { id: 'r:tvprog', x: cx + L.W / 2 - 1.3, z: L.Dp / 2 - 1.1, label: 'Telewizor — program zawodów', r: 1.2 }];
    const roster = Game.roster(clubId).sort((a, b) => b.ksm - a.ksm), d = s.dilemma, career = s.mode === 'career';
    roster.slice(0, L.seats.length).forEach((r, i) => {
      if (career && r.id === s.career.me) return; // w karierze to ty — nie siedzisz sam przed sobą
      const [sx, sz] = L.seats[i], fx2 = -sx, fz = -sz, yaw = Math.atan2(-fz, fx2);
      const h = [...r.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
      const cols = [club.kevlar, Crowd.SKIN[h % Crowd.SKIN.length], Crowd.HAIR[h % Crowd.HAIR.length], club.trim];
      const standing = r.injury > 0 || i % 4 === 3;
      const men = Humans.casual().filter(k => Humans.A[k].s === 'm');
      const m = Humans.ready ? Humans.make(men[(i + (away ? 5 : 0)) % men.length], standing ? 'talk' : 'sit', { frame: i }) : People.ready ? People.makeStatic(standing ? 'idle' : 'sit', cols) : Crowd.person({ jacket: club.kevlar, pants: club.trim });
      const px = standing ? sx * 0.8 : sx, pz = standing ? sz * 0.8 : sz;
      m.position.set(cx + px, Y + (standing || Humans.ready ? 0 : 0.5), pz); m.rotation.y = yaw;
      Rooms.add(m);
      const flag = away ? '' : !career && d && d.rid === r.id ? '❗ ' : !career && !Talk.canTalk(r) ? '✓ ' : '';
      const tag = World.nameTag(flag + r.name.split(' ').slice(-1)[0] + (r.injury ? ' (uraz)' : ''), club.kevlar);
      tag.position.set(cx + px, Y + 2.2, pz); tag.scale.set(2.4, 0.6, 1);
      Rooms.add(tag);
      Walk.spots.push({ id: (away ? 'rival:' : 'rider:') + r.id, x: cx + px * 0.85, z: pz * 0.85, label: away ? `Zagadnij rywala: ${r.name}` : career ? `Pogadaj z: ${r.name}` : `Porozmawiaj: ${r.name}`, r: 1.5 });
    });
    // stół do masażu i lodówka z napojami (modele 3D)
    const items = [['massage', cx + 3.6, 0, 3.7, 0], ['fridge', cx + 7.4, 0, 5.0, -Math.PI / 2]];
    Furn.load(items.map(i => i[0]), () => { if (Walk.room !== key) return; items.forEach(([k, x, y, z, r]) => { const g = Furn.place(World.venueGroup, k, x, Y + y, z, r, {}); if (g) Rooms.dyn.push(g); }); });
  },
  /** Krótka rozmowa z rywalem w szatni gości */
  rivalTalk(id) {
    const r = Game.s.riders[id]; if (!r) return;
    const lines = [`${r.name}: „Dziś tor jest nasz, zobaczysz.”`, `${r.name}: „Słyszałem, że u was silniki nie chodzą… ciekawe.”`, `${r.name}: „Pole A? Biorę każde, i tak wygram start.”`, `${r.name} tylko kiwa głową i zakłada słuchawki.`, `${r.name}: „Powodzenia. Przyda się.”`, `${r.name}: „Wasz tor jest za twardy, ale damy radę.”`];
    UI.toast(lines[Math.floor(Math.random() * lines.length)]);
  },
  /** Ekrany w biurze prezesa: tabela ligi i ścianka sponsorów */
  paintOffice() {
    if (World.leagueTex) {
      const g = World.leagueTex.canvas.getContext('2d'), list = Game.standings();
      g.fillStyle = '#0b1320'; g.fillRect(0, 0, 512, 320); g.fillStyle = '#E0632E'; g.fillRect(0, 0, 512, 40);
      g.fillStyle = '#fff'; g.font = 'bold 22px Barlow, sans-serif'; g.textAlign = 'left'; g.fillText(`${DATA.LEAGUE} — tabela`, 14, 28);
      g.font = '18px Barlow, sans-serif';
      list.slice(0, 8).forEach((c, i) => {
        const cl = Game.club(c.id || c.club || c), y = 70 + i * 31, me = (c.id || c.club) === Game.s.user;
        if (me) { g.fillStyle = 'rgba(224,99,46,.35)'; g.fillRect(8, y - 21, 496, 28); }
        g.fillStyle = cl.kevlar; g.fillRect(14, y - 16, 8, 20);
        g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(`${i + 1}. ${cl.name}`, 32, y);
        g.textAlign = 'right'; g.fillText(`${c.pts ?? c.points ?? ''} pkt`, 498, y);
      });
      World.leagueTex.needsUpdate = true;
    }
    if (World.officeWall) {
      const g = World.officeWall.canvas.getContext('2d'), club = Game.club(Game.s.user), sp = (Game.s.club && Game.s.club.sponsors) || [];
      g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 12; i++) { const x = (i % 4) * 128, y = Math.floor(i / 4) * 86; const S = sp[i % Math.max(1, sp.length)]; g.fillStyle = S ? S.bg : (i % 2 ? club.kevlar : '#1b1b1f'); g.fillRect(x + 8, y + 10, 112, 66); g.fillStyle = S ? S.fg : '#fff'; g.font = 'bold 18px Barlow, sans-serif'; g.textAlign = 'center'; g.fillText(S ? S.text.slice(0, 12) : club.short, x + 64, y + 50); }
      World.officeWall.needsUpdate = true;
    }
  },
  /** Z parku maszyn na tor: jazda treningowa (menedżer — najlepszy zawodnik składu) */
  pitRide() {
    const s = Game.s;
    if (s.mode === 'career') { UI.toast('W karierze trenujesz w planie tygodnia — tu tylko mechanicy.'); return; }
    const P = s.practice = s.practice || { rider: null, rivals: 3, weather: 'dry', prep: 'hard', best: [] };
    if (!P.rider || !s.riders[P.rider]) P.rider = (Game.roster(s.user).sort((a, b) => b.ksm - a.ksm)[0] || {}).id;
    Walk.stop();
    Practice.start();
  },

  leaveRoom(silent) {
    Rooms.clear();
    Walk.indoor(false);
    if (!Walk.room) return;
    const R = World.rooms[Walk.room], key = Walk.room;
    Walk.room = null;
    if (silent) return;
    if (!R.exitTo) { const f = Walk.onExit; Walk.stopQuiet(); if (f) f(key); return; }
    const h = World.hotspots.find(x => x.id === R.exitTo);
    Walk.x = h.x + 1.5; Walk.z = h.z; Walk.yaw = -Math.PI / 2; Walk.pitch = -0.05;
  },
  /** We wnętrzu gasimy „księżyc” stadionu i przygaszamy niebo — pokój oświetlają jego własne lampy */
  indoor(on) {
    const S = World.realScene || World.scene, hemi = S.children.find(o => o.isHemisphereLight);
    // lampy tylko w pokoju, w którym jesteśmy (reszta pokoi nie obciąża oświetlenia sceny)
    Object.values(World.rooms || {}).forEach(R => (R.group && R.group.userData.lights || []).forEach(l => { l.visible = on && Walk.room && World.rooms[Walk.room] === R; }));
    if (World.key) World.key.intensity = on ? 0 : 0.95;
    if (hemi) hemi.intensity = on ? 0.18 : 0.55;
  },

  /** Koniec spaceru bez przełączania na ekran menedżera (kariera przejmuje sterowanie) */
  stopQuiet() {
    People.walk = null; Rooms.clear(); Walk.indoor(false); Walk.room = null; Walk.active = false; Walk.hud(false);
    World.camera.fov = 42; World.camera.updateProjectionMatrix(); UI.close();
  },

  /* ---------- klatka ---------- */
  frame(dt) {
    const K = Walk.keys, fwd = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), side = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
    if (K.ArrowLeft) Walk.yaw += dt * 1.8;
    if (K.ArrowRight) Walk.yaw -= dt * 1.8;
    const tired = Walk.tired ? Walk.tired() : 1; // kariera: zmęczony chodzi wolniej i nie pobiegnie
    const sp = ((K.ShiftLeft || K.ShiftRight) && tired > 0.75 ? 7.5 : 4.2) * dt * tired;
    const sy = Math.sin(Walk.yaw), cy = Math.cos(Walk.yaw);
    let dx = (-sy * fwd + cy * side) * sp, dz = (-cy * fwd - sy * side) * sp;
    if (fwd && side) { dx *= 0.707; dz *= 0.707; }
    if (dx || dz) {
      Walk.bob += dt * (sp / dt) * 1.9;
      if (Walk.room) {
        const Rm = World.rooms[Walk.room], col = Rooms.colliders();
        const ok = (x, z) => x > Rm.cx - Rm.W / 2 + 0.5 && x < Rm.cx + Rm.W / 2 - 0.5 && z > -Rm.D / 2 + 0.5 && z < Rm.D / 2 - 0.35 && !col.some(c => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);
        if (ok(Walk.x + dx, Walk.z + dz)) { Walk.x += dx; Walk.z += dz; } else if (ok(Walk.x + dx, Walk.z)) Walk.x += dx; else if (ok(Walk.x, Walk.z + dz)) Walk.z += dz;
      } else {
        const B = World.bounds || { x0: -260, x1: 260, z0: -220, z1: 220 };
        const free = (x, z) => x > B.x0 + 0.8 && x < B.x1 - 0.8 && z > B.z0 + 0.8 && z < B.z1 - 0.8 && !World.inTrackZone(x, z) && !World.colliders.some(c => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1)
          && World.standHeight(x, z) - World.standHeight(Walk.x, Walk.z) < 0.7 && World.standHeight(Walk.x, Walk.z) - World.standHeight(x, z) < 1.3; // po stopniach — nie przez ścianę trybuny
        if (free(Walk.x + dx, Walk.z + dz)) { Walk.x += dx; Walk.z += dz; }
        else if (free(Walk.x + dx, Walk.z)) Walk.x += dx;
        else if (free(Walk.x, Walk.z + dz)) Walk.z += dz;
      }
    }
    // wysokość: na trybunie / „młynie” idziesz po stopniach
    const hT = Walk.room ? 0 : World.standHeight(Walk.x, Walk.z);
    Walk.h = Walk.h == null ? hT : Walk.h + (hT - Walk.h) * Math.min(1, dt * 10);
    const c = World.camera, base = Walk.room ? World.LOCKER_Y : Walk.h;
    c.position.set(Walk.x, base + 1.7 + Math.sin(Walk.bob) * 0.035, Walk.z);
    c.rotation.set(Walk.pitch, Walk.yaw, 0, 'YXZ');
    // najbliższe miejsce akcji
    const list = Walk.room ? Walk.spots : World.hotspots;
    let best = null, bd = 1e9;
    list.forEach(h => { const d = Math.hypot(h.x - Walk.x, h.z - Walk.z); if (d < h.r && d < bd) { bd = d; best = h; } });
    if (best !== Walk.near) { Walk.near = best; $('#wh-prompt').innerHTML = best ? `<kbd>E</kbd> ${esc(best.label)}` : ''; }
    $('#wh-place').textContent = Walk.room ? World.rooms[Walk.room].name : World.V.name;
    Walk.mapFrame();
    if (Walk.room === 'party') Career.partyTick(dt);
    Rooms.tick(dt); Walk.tickWalkers(dt);
    const t = performance.now() / 1000;
    Crowd.update(t, dt, 0.08);
    World.waveFlags(t);
  },

  key(e, down) {
    if (!Walk.active) return false;
    if (!$('#modal').innerHTML) {
      if (down && e.code === 'KeyE') { Walk.act(); e.preventDefault(); return true; }
      if (down && e.code === 'KeyP' && Game.s && Game.s.mode === 'career') { City.phoneToggle(); return true; }
      if (down && e.code === 'KeyM' && !Walk.room) { Walk.bigMap = !Walk.bigMap; if (Walk.bigMap && Walk.locked()) document.exitPointerLock(); Walk.mapKey = null; return true; }
      if (down && e.code === 'Escape') { if (Walk.room && !World.rooms[Walk.room].exitTo) Walk.leaveRoom(); else Walk.stop(); return true; }
    } else if (down && e.code === 'Escape') { UI.close(); return true; }
    Walk.keys[e.code] = down;
    if (e.code.startsWith('Arrow')) e.preventDefault();
    return true;
  },
  mouse(e, kind) {
    if (!Walk.active || $('#modal').innerHTML) { if (Walk.locked()) document.exitPointerLock(); return; }
    const gl = $('#gl');
    // tryb FPS: kursor zablokowany, mysz obraca kamerę bez wciskania przycisku
    if (Walk.locked()) {
      if (kind === 'move') { Walk.yaw -= (e.movementX || 0) * 0.0022 * Walk.sens; Walk.pitch = R.clamp(Walk.pitch - (e.movementY || 0) * 0.0022 * Walk.sens * (Walk.invY ? -1 : 1), -1.25, 1.15); }
      if (kind === 'down' && e.button === 0) Walk.act();
      return;
    }
    if (kind === 'down' && e.target && e.target.id === 'wh-map') { Walk.mapClick(e); return; }
    if (kind === 'down' && e.target === gl) {
      if (gl.requestPointerLock && !Walk.noLock) { gl.requestPointerLock(); return; }
      Walk.drag = { x: e.clientX, y: e.clientY };
    }
    if (kind === 'up') Walk.drag = null;
    if (kind === 'move' && Walk.drag) {
      Walk.yaw -= (e.clientX - Walk.drag.x) * 0.0045; Walk.pitch = R.clamp(Walk.pitch - (e.clientY - Walk.drag.y) * 0.0035, -1.2, 1.1);
      Walk.drag = { x: e.clientX, y: e.clientY };
    }
  },
  sens: 1,
  locked() { return document.pointerLockElement && document.pointerLockElement === $('#gl'); },

  /* ---------- minimapa ---------- */
  MAPNAMES: { locker: 'Szatnia', office: 'Biuro', workshop: 'Warsztat', medic: 'Medycyna', gym: 'Siłownia', academy: 'Szkółka', track: 'Tor', ticket: 'Kasy', shop: 'Sklep', parking: 'Parking', site: 'Budowa', lockerAway: 'Goście', pitride: 'Na tor' },
  /** Warstwa stała (teren, tor, trybuny, budynki) rysowana raz na stadion; co klatkę tylko pozycja */
  mapFrame() {
    const cv = $('#wh-map'); if (!cv) return;
    cv.hidden = !!Walk.room; cv.classList.toggle('big', !!Walk.bigMap);
    if (Walk.room || !World.bounds) return;
    const B = World.bounds, S = Walk.bigMap ? 640 : 240;
    if (cv.width !== S) { cv.width = S; cv.height = S; Walk.mapKey = null; }
    const sc = S / Math.max(B.x1 - B.x0, B.z1 - B.z0), ox = (S - (B.x1 - B.x0) * sc) / 2, oz = (S - (B.z1 - B.z0) * sc) / 2;
    const P = (x, z) => [ox + (x - B.x0) * sc, oz + (z - B.z0) * sc];
    Walk.mapT = { sc, ox, oz, B };
    if (Walk.mapKey !== World.mapKey + ':' + S) {
      Walk.mapKey = World.mapKey + ':' + S;
      const L = Walk.mapLayer || (Walk.mapLayer = document.createElement('canvas')); L.width = S; L.height = S;
      const g = L.getContext('2d');
      g.fillStyle = '#243326'; g.fillRect(0, 0, S, S);
      g.strokeStyle = '#6f8f6f'; g.lineWidth = 2; g.strokeRect(...P(B.x0, B.z0), (B.x1 - B.x0) * sc, (B.z1 - B.z0) * sc);
      // trybuny
      g.fillStyle = '#7a7670';
      (World.standZones || []).forEach(Z => {
        if (Z.kind === 'line') { const [x, z] = P(-Z.len / 2, Z.zSign > 0 ? Z.z0 : -Z.z0 - Z.rows * Z.step); g.fillRect(x, z, Z.len * sc, Z.rows * Z.step * sc); }
        else { (Z.parts || [[0, 1]]).forEach(([f0, f1]) => { const a0 = (Z.xs > 0 ? -Math.PI / 2 : Math.PI / 2), c = P(Z.cx, 0); g.beginPath(); g.arc(c[0], c[1], (Z.r0 + Z.rows * Z.step) * sc, -(a0 + f1 * Math.PI), -(a0 + f0 * Math.PI)); g.arc(c[0], c[1], Z.r0 * sc, -(a0 + f0 * Math.PI), -(a0 + f1 * Math.PI), true); g.closePath(); g.fill(); }); }
      });
      // tor i murawa
      const ring = d => { g.beginPath(); for (let i = 0; i <= 80; i++) { const q = Track.pos(i / 80 * Track.L, d); const [x, z] = P(q.x, q.z); i ? g.lineTo(x, z) : g.moveTo(x, z); } g.closePath(); };
      ring(World.TRACK_OUT); g.fillStyle = '#1b1a18'; g.fill(); ring(-Track.HALF); g.fillStyle = '#2f6b35'; g.fill();
      // budynki i obszary
      (World.mapItems || []).forEach(m => { const [x, z] = P(m.x - m.w / 2, m.z - m.d / 2); g.fillStyle = m.color; g.fillRect(x, z, m.w * sc, m.d * sc); });
      g.font = `bold ${S > 300 ? 13 : 8}px Barlow, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#f2f2ee';
      if (S > 300) (World.mapItems || []).forEach(m => { if (!m.label) return; const [x, z] = P(m.x, m.z); g.fillText(m.label.split('·')[0].trim().slice(0, 16), x, z + 3); });
      // miejsca akcji
      (World.hotspots || []).forEach(h => { const [x, z] = P(h.x, h.z); g.fillStyle = '#E0632E'; g.beginPath(); g.arc(x, z, S > 300 ? 6 : 3.5, 0, 7); g.fill(); if (S > 300) { g.fillStyle = '#fff'; g.fillText(Walk.MAPNAMES[h.id] || h.label.split(' ')[0], x, z - 9); } });
    }
    const g = cv.getContext('2d'); g.drawImage(Walk.mapLayer, 0, 0);
    // przechodnie i ty
    g.fillStyle = 'rgba(255,255,255,.55)'; Walk.walkers.forEach(w => { const [x, z] = P(w.x, w.z); g.fillRect(x - 1, z - 1, 2, 2); });
    const [px, pz] = P(Walk.x, Walk.z), fx = -Math.sin(Walk.yaw), fz = -Math.cos(Walk.yaw), r = S > 300 ? 11 : 7;
    g.fillStyle = '#ffd23a'; g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(px + fx * r, pz + fz * r); g.lineTo(px - fx * r * 0.6 + fz * r * 0.6, pz - fz * r * 0.6 - fx * r * 0.6); g.lineTo(px - fx * r * 0.6 - fz * r * 0.6, pz - fz * r * 0.6 + fx * r * 0.6); g.closePath(); g.fill(); g.stroke();
    if (Walk.bigMap) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, S - 26, S, 26); g.fillStyle = '#fff'; g.font = '13px Barlow, sans-serif'; g.fillText('Kliknij miejsce (kropka = akcja), aby tam przejść · M — zamknij', S / 2, S - 9); }
  },
  /** Kliknięcie w mapę: najbliższe miejsce akcji albo wolny punkt terenu → przenosiny */
  mapClick(e) {
    const cv = $('#wh-map'), T = Walk.mapT; if (!cv || !T || Walk.room) return;
    const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, mz = (e.clientY - r.top) * cv.height / r.height;
    const wx = T.B.x0 + (mx - T.ox) / T.sc, wz = T.B.z0 + (mz - T.oz) / T.sc;
    let best = null, bd = 14 / T.sc * (cv.width > 300 ? 1.5 : 1);
    World.hotspots.forEach(h => { const d = Math.hypot(h.x - wx, h.z - wz); if (d < bd) { bd = d; best = h; } });
    const B = T.B, ok = (x, z) => x > B.x0 + 1 && x < B.x1 - 1 && z > B.z0 + 1 && z < B.z1 - 1 && !World.inTrackZone(x, z) && !World.colliders.some(c => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) && World.standHeight(x, z) === 0;
    let tx = best ? best.x : wx, tz = best ? best.z : wz;
    if (!ok(tx, tz)) { let found = false; for (let rr = 1; rr < 14 && !found; rr += 1) for (let a = 0; a < 6.28 && !found; a += 0.4) { const x = tx + Math.cos(a) * rr, z = tz + Math.sin(a) * rr; if (ok(x, z)) { tx = x; tz = z; found = true; } } if (!found) { UI.toast('Tam nie da się przejść.', true); return; } }
    Walk.x = tx; Walk.z = tz; Walk.h = 0;
    if (best) Walk.yaw = Math.atan2(-(best.x - tx), -(best.z - tz)) || Walk.yaw;
    Walk.bigMap = false;
    UI.toast(best ? `Jesteś: ${Walk.MAPNAMES[best.id] || best.label}` : 'Przeniesiono.');
  },

  /* ---------- akcje ---------- */
  act() {
    const h = Walk.near;
    if (!h) return;
    if (Walk.locked()) document.exitPointerLock();
    Walk.keys = {};
    const s = Game.s, C = s.club, id = h.id;
    const doors = { locker: 'locker', lockerAway: 'lockerAway', office: 'office', gym: 'gym', medic: 'medic', workshop: 'garage' };
    if (id === 'pitride') { Walk.pitRide(); return; }
    if (id.startsWith('rival:')) { Walk.rivalTalk(id.slice(6)); return; }
    if (doors[id]) { Walk.enterRoom(doors[id]); return; }
    if (id === 'r:exit') { Walk.leaveRoom(); return; }
    if (s.mode === 'career' && Career.roomAct(id)) return;
    if (id.startsWith('rider:')) { Talk.riderModal(id.slice(6)); return; }
    if (id.startsWith('r:')) { Walk.roomAct(id); return; }
    const box = (kicker, title, body, extra = '') => UI.modal(`<div class="row between"><span class="kicker">${kicker}</span><button class="x" data-ui="close">×</button></div><h2>${title}</h2>${body}<div class="actions">${extra}<button class="ghost" data-ui="close">Zamknij</button></div>`);
    const lv = k => `${Club.FAC[k].name}: poziom ${C.fac[k]} — ${esc(Club.FAC[k].eff(C.fac[k]))}.`;
    switch (id) {
      case 'board': {
        const L = s.lineups[s.user] || [];
        box('Szatnia', 'Tablica taktyczna', `<table class="paper-t">${L.slice(0, 8).map((rid, i) => { const r = s.riders[rid]; return `<tr><td>${i + 9}</td><td>${r ? esc(r.name) : '—'}</td><td>${r ? num(r.ksm) : ''}</td></tr>`; }).join('')}</table><p class="muted small">KSM składu ${num(Game.lineupKsm(L))} / ${DATA.KSM_LIMIT}</p>`, '<button class="go" data-walk="tab" data-v="sklad">Zmień skład</button>');
        return;
      }
      case 'workshopTalk': {
        const done = s.boost && s.boost.week === s.week;
        box('Warsztat', 'Mechanicy', `<p>${lv('pits')}</p><p>„Szefie, możemy rozebrać silniki i przygotować je specjalnie pod najbliższy mecz. Legalnie — nowe tłoki, świeże ustawienia. Koszt 40 tys. zł.”</p>${done ? '<p class="good">Silniki przygotowane na ten tydzień.</p>' : ''}`,
          done ? '' : '<button class="go" data-walk="engines">Przygotujcie silniki (40 tys. zł)</button>');
        return;
      }
      case 'ticket': Walk.ticketModal(); return;
      case 'shop': box('Sklep kibica', 'Gadżety', `<p>${lv('shop')}</p><p>Sprzedaż w sezonie: <b>${money(s.finance.season.inc['Sklep kibica'] || 0)}</b>. Najlepiej schodzą szaliki i czapki w barwach klubu.</p>`, '<button class="go" data-walk="tab" data-v="stadion">Rozbudowa</button>'); return;
      case 'parking': {
        const done = s.fanTalk === s.week, price = C.ticket, A = Club.attendance(Game.club(s.user), s.forecast);
        const opinion = price > 75 ? '„Bilety za drogie, panie! Za 60 złotych przyszlibyśmy całymi rodzinami.”' : price < 45 ? '„Tanio jest, nie ma co narzekać. Ale na parkingu ciasno.”' : C.fac.parking < 3 ? '„Z parkowaniem dramat — stoimy na trawnikach pół kilometra dalej.”' : '„Dobrze się tu przychodzi. Byle wygrywać!”';
        if (!done) { s.fanTalk = s.week; Talk.pop(1.5); Game.save(); }
        box('Parking', 'Kibice', `<blockquote class="quote">${opinion}</blockquote><p class="muted small">Prognoza frekwencji: ${A.att.toLocaleString('pl-PL')} (${Math.round(A.fill * 100)}%).${done ? '' : ' Kibice docenili, że podszedłeś (popularność +1,5).'}</p>`);
        return;
      }
      case 'track': {
        const fx = Game.userFixture(), home = fx && fx.h === s.user;
        box('Tor', 'Gospodarz toru', `<p>„Jak przygotować nawierzchnię na ${home ? 'najbliższy mecz u siebie' : 'trening'}?”</p>
          <div class="opts">${Object.entries(DATA.PREP).map(([k, p]) => `<button class="opt ${s.forecast.prep === k ? 'on' : ''}" data-walk="prep" data-v="${k}">${p.name}<small>${esc(p.desc)}</small></button>`).join('')}</div>
          ${home ? '' : '<p class="muted small">W tym tygodniu jedziemy na wyjeździe — tam tor szykuje gospodarz.</p>'}`);
        return;
      }
      case 'medic': box('Centrum medyczne', 'Lekarz klubowy', `<p>${lv('medic')}</p><ul class="list">${Game.roster(s.user).filter(r => r.injury || r.fatigue > 60).map(r => `<li>${esc(r.name)}: ${r.injury ? `uraz, ${r.injury} tyg.` : `zmęczenie ${Math.round(r.fatigue)}%`}</li>`).join('') || '<li class="muted">Wszyscy zdrowi.</li>'}</ul>`); return;
      case 'gym': box('Centrum treningowe', 'Trener przygotowania', `<p>${lv('gym')}</p><p>„Intensywność: ${DATA.INTENSITY[s.training.intensity].name.toLowerCase()}. Plan ustawiamy w zakładce Treningi.”</p>`, '<button class="go" data-walk="tab" data-v="trening">Treningi</button>'); return;
      case 'academy': box('Szkółka', 'Trener młodzieży', `<p>${lv('academy')}</p><p>W szkółce: <b>${C.prospects.length}</b> wychowanków.</p>`, '<button class="go" data-walk="tab" data-v="akademia">Wychowankowie</button>'); return;
    }
  },

  /** Rozmowy i akcje we wnętrzach (menedżer) */
  roomAct(id) {
    const s = Game.s, C = s.club;
    const box = (kicker, title, body, extra = '') => UI.modal(`<div class="row between"><span class="kicker">${kicker}</span><button class="x" data-ui="close">×</button></div><h2>${title}</h2>${body}<div class="actions">${extra}<button class="ghost" data-ui="close">Zamknij</button></div>`);
    s.indiv = s.indiv || {}; s.rehab = s.rehab || {};
    switch (id) {
      case 'r:desk': if (s.dilemma) Talk.dilemmaModal(); else Walk.officeModal(); return;
      case 'r:league': box('Biuro prezesa', 'Tabela ligowa', UI.table(Game.standings(), false)); return;
      case 'r:meeting': box('Biuro prezesa', 'Zebranie zarządu', `<p>Budżet: <b>${money(s.finance.balance)}</b>. Frekwencja w ostatnich meczach: ${((C && C.att) || []).slice(-3).map(v => v.toLocaleString('pl-PL')).join(', ') || 'brak'}.</p><p>${C && C.build ? `Trwa budowa: <b>${esc(Club.FAC[C.build.key].name)}</b> — jeszcze ${C.build.left} tyg.` : 'Zarząd czeka na decyzję o kolejnej inwestycji (zakładka Stadion).'}</p><p class="muted small">Cel sezonu i nastroje sponsorów omówisz przy biurku.</p>`); return;
      case 'r:tvprog': { const fx = Game.userFixture(); box('Szatnia', 'Program zawodów', fx ? `<p><b>${esc(Game.club(fx.h).name)}</b> — <b>${esc(Game.club(fx.a).name)}</b></p><p class="muted">15 biegów, pola startowe według programu, rezerwy taktyczne od 5. biegu.</p>` : '<p>W tym tygodniu nie ma meczu.</p>'); return; }
      case 'r:scout': {
        const fx = Game.userFixture(), opp = fx ? (fx.h === s.user ? fx.a : fx.h) : null; if (!opp) { box('Szatnia gości', 'Rywale', '<p>W tym tygodniu nie jedziemy.</p>'); return; }
        const rows = Game.roster(opp).sort((a, b) => b.ksm - a.ksm).slice(0, 8).map(r => `<tr><td>${esc(r.name)}</td><td class="t-c">${num(r.ksm, 2)}</td><td class="t-c">${num(r.form, 1)}</td><td>${r.injury ? '<span class="neg">uraz</span>' : r.form > 7 ? '<span class="good">w gazie</span>' : r.form < 4 ? '<span class="neg">bez formy</span>' : '—'}</td></tr>`).join('');
        box('Szatnia gości', `Podpatrzona tablica: ${esc(Game.club(opp).name)}`, `<table class="tbl"><thead><tr><th>Zawodnik</th><th>KSM</th><th>Forma</th><th></th></tr></thead><tbody>${rows}</tbody></table><p class="muted small">Warto ustawić najmocniejszych przeciw ich liderom w biegach nominowanych.</p>`); return;
      }
      case 'r:president': {
        const rank = s.clubs.slice().sort((a, b) => b.base - a.base).findIndex(x => x.id === s.user) + 1;
        const target = rank <= 2 ? 'medal' : rank <= 4 ? 'play-off' : 'utrzymanie w środku tabeli';
        const pos = Game.standings().findIndex(x => x.id === s.user) + 1, mood = pos <= Math.max(2, rank) ? 'zadowolony' : pos <= rank + 2 ? 'spokojny' : 'zaniepokojony';
        const asked = s.budgetAsked === s.season;
        box('Biuro prezesa', 'Prezes klubu', `<blockquote class="quote">„Zarząd oczekuje w tym sezonie: ${target}. Po ${s.week} kolejkach jesteśmy na ${pos}. miejscu — jestem ${mood}.”</blockquote><p class="muted small">Popularność ${Math.round(s.popularity)}, saldo ${money(s.finance.balance)}.</p>`,
          asked ? '' : '<button class="go" data-walk="budget">Poproś o dodatkowy budżet</button>');
        return;
      }
      case 'r:trophies': {
        const h = s.honours || [];
        box('Biuro prezesa', 'Gablota', h.length ? `<ul class="list">${h.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">Półki czekają na pierwsze trofeum pod twoją wodzą.</p>');
        return;
      }
      case 'r:trainer': {
        const list = Game.roster(s.user).filter(r => r.injury === 0);
        box('Centrum treningowe', 'Trening indywidualny', `<p>„Jedna sesja sam na sam w tygodniu na zawodnika. 15 tys. zł, mocno męczy, ale szybko poprawia wybraną cechę.”</p>
          <div class="talk-opts">${list.map(r => s.indiv[r.id] === s.week ? `<div class="opt">${esc(r.name)} <small>już trenował w tym tygodniu</small></div>` : `<div class="opt">${esc(r.name)} <small>zmęczenie ${Math.round(r.fatigue)}%</small><div class="opts">${['start', 'bends', 'speed', 'stamina'].map(k => `<button class="ghost small" data-walk="indiv" data-id="${r.id}" data-v="${k}">${Game.ATTR_NAMES[k]} ${r.a[k]}</button>`).join('')}</div></div>`).join('')}</div>`);
        return;
      }
      case 'r:equip': box('Centrum treningowe', 'Sprzęt', `<p>${esc(Club.FAC.gym.name)}: poziom ${C.fac.gym} — ${esc(Club.FAC.gym.eff(C.fac.gym))}.</p>`); return;
      case 'r:doctor': {
        const inj = Game.roster(s.user).filter(r => r.injury > 0);
        box('Centrum medyczne', 'Lekarz klubowy', inj.length ? `<p>„Intensywna rehabilitacja skraca przerwę o tydzień. 25 tys. zł, raz w tygodniu na zawodnika.”</p><div class="talk-opts">${inj.map(r => `<div class="opt">${esc(r.name)} <small>uraz: ${r.injury} tyg.</small>${s.rehab[r.id] === s.week ? '<small class="good">po rehabilitacji w tym tygodniu</small>' : `<button class="go small" data-walk="rehab" data-id="${r.id}">Rehabilitacja (25 tys. zł)</button>`}</div>`).join('')}</div>`
          : `<p>„Wszyscy zdrowi. Najbardziej zmęczony: ${esc(Game.roster(s.user).sort((a, b) => b.fatigue - a.fatigue)[0].name)}.”</p>`);
        return;
      }
      case 'r:mechanic': Walk.near = { id: 'workshopTalk' }; Walk.act(); return;
      case 'r:bikes': box('Warsztat', 'Motocykle drużyny', `<p>${esc(Club.FAC.pits.name)}: poziom ${C.fac.pits} — ${esc(Club.FAC.pits.eff(C.fac.pits))}.</p><p class="muted small">Silniki 500 cm³, po dwa na zawodnika. Mechanicy rozbierają je po każdym meczu.</p>`); return;
    }
  },

  officeModal() {
    const s = Game.s, C = s.club, b = C.build;
    UI.modal(`<div class="row between"><span class="kicker">Biuro prezesa</span><button class="x" data-ui="close">×</button></div>
      <h2>${esc(Game.club(s.user).name)}</h2>
      <div class="office"><div><small>Saldo</small><b>${money(s.finance.balance)}</b></div><div><small>Popularność</small><b>${Math.round(s.popularity)}</b></div>
        <div><small>Sponsorzy</small><b>${C.sponsors.length} / 5</b></div><div><small>Budowa</small><b>${b ? `${esc(Club.FAC[b.key].name)} (${b.left} tyg.)` : 'brak'}</b></div></div>
      <p class="muted">Na biurku spokój — żadnej sprawy do rozstrzygnięcia.</p>
      <div class="actions"><button class="go" data-walk="tab" data-v="stadion">Inwestycje</button><button class="ghost" data-walk="tab" data-v="sponsorzy">Sponsorzy</button><button class="ghost" data-walk="tab" data-v="finanse">Finanse</button></div>`);
  },
  ticketModal() {
    const s = Game.s, C = s.club, A = Club.attendance(Game.club(s.user), s.forecast);
    UI.modal(`<div class="row between"><span class="kicker">Kasy biletowe</span><button class="x" data-ui="close">×</button></div><h2>Cena biletu</h2>
      <div class="ticket"><button class="ghost small" data-walk="ticket" data-v="-5">−5 zł</button><div class="big">${C.ticket} zł</div><button class="ghost small" data-walk="ticket" data-v="5">+5 zł</button>
      <div class="tk-info"><span>Prognoza</span><b>${A.att.toLocaleString('pl-PL')} / ${A.cap.toLocaleString('pl-PL')}</b><small>wpływy ok. ${money(A.att * C.ticket)}</small></div></div>
      <div class="actions"><button class="ghost" data-ui="close">Zamknij</button></div>`);
  },

  /** Przyciski z okienek spaceru (data-walk) */
  click(e) {
    const t = e.target.closest('[data-walk]');
    if (!t) return false;
    const d = t.dataset, s = Game.s;
    switch (d.walk) {
      case 'exit': Walk.stop(); break;
      case 'tab': Walk.stop(d.v); break;
      case 'ticket': s.club.ticket = R.clamp(s.club.ticket + +d.v, 25, 150); Game.save(); Walk.ticketModal(); break;
      case 'prep': s.forecast.prep = d.v; Game.save(); UI.close(); UI.toast(`Tor: ${DATA.PREP[d.v].name.toLowerCase()}.`); break;
      case 'budget':
        s.budgetAsked = s.season;
        if (s.popularity >= 58) { Game.tx('inc', 'Dopłata zarządu', 500000); UI.toast('Zarząd dorzucił 500 tys. zł.'); } else UI.toast('Zarząd odmówił: „Najpierw wyniki i kibice na trybunach”.', true);
        Game.save(); UI.close(); break;
      case 'indiv': {
        const r = s.riders[d.id]; if (s.finance.balance < 15000) { UI.toast('Za mało pieniędzy.', true); break; }
        Game.tx('exp', 'Treningi indywidualne', 15000); s.indiv[r.id] = s.week;
        r.growth[d.v] = (r.growth[d.v] || 0) + 0.7 * Game.ageCurve(r.age); r.fatigue = R.clamp(r.fatigue + 12, 0, 100);
        while (r.growth[d.v] >= 1 && r.a[d.v] < 20) { r.a[d.v]++; r.growth[d.v]--; UI.toast(`${r.name}: ${Game.ATTR_NAMES[d.v]} +1!`); }
        Game.save(); Walk.roomAct('r:trainer'); break;
      }
      case 'rehab': {
        const r = s.riders[d.id]; if (s.finance.balance < 25000) { UI.toast('Za mało pieniędzy.', true); break; }
        Game.tx('exp', 'Rehabilitacja', 25000); s.rehab[r.id] = s.week; r.injury = Math.max(0, r.injury - 1);
        Game.save(); Walk.roomAct('r:doctor'); break;
      }
      case 'engines':
        if (s.finance.balance < 40000) { UI.toast('Za mało pieniędzy.', true); break; }
        Game.tx('exp', 'Warsztat', 40000); s.boost = { week: s.week, speed: 0.3, start: 0.2 }; Game.save(); UI.close(); UI.toast('Silniki przygotowane na najbliższy mecz.'); break;
    }
    return true;
  },
};
