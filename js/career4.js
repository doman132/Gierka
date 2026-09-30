/* =========================================================
   Speedway Empire 3D — KARIERA (4)
   • limity czynności (randki, rozmowy, zajęcia — ile razy dziennie)
   • garderoba dziewczyny (wybór wyglądu i ubrań, zakupy)
   • osiedle z blokami z wielkiej płyty (3D): trzepak, kiosk,
     garaże, plac zabaw… i „szemrana robota” z ryzykiem aresztu
   • Grand Prix, eliminacje i reprezentacja (turnieje indywidualne 3D)
   • liga zagraniczna (Anglia, Szwecja)
   • kontuzje: diagnoza, rehabilitacja, strach po upadku
   • rywale: bilans bezpośrednich pojedynków, zaczepki w mediach
   • pogoda: prognoza, deszcz w trakcie meczu, oględziny toru
   • trener mentalny i rutyna przed startem (mini-gra z oddechem)
   • transfery i wypożyczenia w trakcie sezonu
   • związek: wspólne wyjazdy, zazdrość, oświadczyny, ślub
   Wszystkie kluby, zawodnicy i firmy są fikcyjne.
   ========================================================= */
'use strict';

/* =========================================================
   1. LIMITY CZYNNOŚCI
   ========================================================= */
Object.assign(City, {
  // ile razy dziennie (d) i tygodniowo (w) wolno wykonać zajęcie
  LIMITS: {
    _: { d: 1 }, cook: { d: 2 }, meal: { d: 2 }, fast: { d: 2 }, coffee: { d: 2 }, nap: { d: 1 }, beer: { d: 2 }, slots: { d: 6 },
    date: { d: 1, w: 2 }, trip: { d: 1, w: 1 }, walk: { d: 1 }, party: { d: 1, w: 2 }, meet: { d: 1 }, meetc: { d: 1 },
    train: { d: 1 }, ride: { d: 2 }, weights: { d: 1 }, cardio: { d: 1 }, therapy: { d: 1, w: 2 }, sponsor: { d: 1 }, fans: { d: 1 },
    deal: { d: 1, w: 3 }, trzepak: { d: 1 }, kiosk: { d: 1 }, garage: { d: 1 }, rehab: { d: 1 }, pool: { d: 1 }, fear: { d: 1 }, inspect: { d: 1 },
    homeDate: { d: 1, w: 3 }, dinner: { d: 1 }, movie: { d: 1 }, night: { d: 1, w: 3 }, spin: { d: 12 },
  },
  lim() {
    const Z = City.Z(), st = City.stamp(), w = Game.s.week;
    if (!Z.lim || Z.lim.w !== w) Z.lim = { w, s: st, day: {}, week: {} };
    if (Z.lim.s !== st) { Z.lim.s = st; Z.lim.day = {}; }
    return Z.lim;
  },
  /** Czy wolno? (bez liczenia) */
  canDo(id) {
    const L = City.lim(), lm = City.LIMITS[id] || City.LIMITS._;
    if (lm.d && (L.day[id] || 0) >= lm.d) return { ok: false, why: `Na dziś wystarczy (${lm.d}× dziennie).` };
    if (lm.w && (L.week[id] || 0) >= lm.w) return { ok: false, why: `Limit w tym tygodniu: ${lm.w}×.` };
    return { ok: true };
  },
  count(id) { const L = City.lim(); L.day[id] = (L.day[id] || 0) + 1; L.week[id] = (L.week[id] || 0) + 1; },
  /** Sprawdź i policz; false = zablokowane (z komunikatem) */
  gate(id) { const c = City.canDo(id); if (!c.ok) { UI.toast(c.why, true); return false; } City.count(id); return true; },
});
(() => {
  // zajęcia z mapy i z wnętrz
  const ba = City.act;
  City.act = function (place, id) {
    const C = Career.C();
    if (C.jail > 0) { UI.toast('Siedzisz w areszcie — miasto musi poczekać.', true); return; }
    const A = (City.ACTS[place] || []).find(a => a.id === id);
    if (A && !A.free && !City.weekDone()) { if (!City.gate(id)) return; }
    return ba.call(this, place, id);
  };
  // randka w mieszkaniu: każda czynność raz dziennie, sama randka max 3× w tygodniu
  const bh = City.homeDate;
  City.homeDate = function () { if (!City.gate('homeDate')) return; return bh.call(this); };
  const bd = City.dateAct;
  City.dateAct = function (k) {
    if (['dinner', 'movie', 'night'].includes(k) && !City.gate(k)) return;
    if (k === 'talk') {
      bd.call(this, k);
      const box = document.querySelector('#modal .talk-opts');
      if (box) {
        box.insertAdjacentHTML('afterbegin', '<button class="opt" data-ui="cWard" data-v="date">👗 Garderoba — wybierz jej strój</button>');
        ['dinner', 'movie', 'night'].forEach(x => { const b = box.querySelector(`[data-v="${x}"]`); if (b && !City.canDo(x).ok) { b.disabled = true; b.title = City.canDo(x).why; b.insertAdjacentHTML('beforeend', ' <small>(dziś już było)</small>'); } });
      }
      return;
    }
    return bd.call(this, k);
  };
  // rozmowy z ludźmi: każda akcja raz dziennie na osobę
  const bt = City.talk;
  City.talk = function (id, act) {
    if (act && ['chat', 'beer', 'flirt', 'datego'].includes(act)) {
      const p = City.person(id); if (p) { const st = City.stamp(); p.lim = p.lim && p.lim.s === st ? p.lim : { s: st, a: {} }; if (p.lim.a[act]) { UI.toast(`Z ${p.name.split(' ')[0]} już dziś ${act === 'flirt' ? 'flirtowałeś' : 'rozmawiałeś'}. Jutro też jest dzień.`, true); UI.close(); return; } p.lim.a[act] = 1; }
    }
    return bt.call(this, id, act);
  };
  // ruletka: max 12 zakręceń dziennie
  const bs = City.spin;
  City.spin = function (kind) { if (!City.gate('spin')) { UI.close(); return; } return bs.call(this, kind); };
  // przyciski na mapie: wyszarz, gdy limit wyczerpany
  const bv = City.view;
  City.view = function () {
    return bv.call(this).replace(/<button class="opt cact" data-ui="cityAct" data-v="(\w+)" ?( ?disabled)?>/g, (m, id, dis) => {
      const c = City.canDo(id), L = City.lim(), lm = City.LIMITS[id] || City.LIMITS._;
      return `<button class="opt cact" data-ui="cityAct" data-v="${id}"${dis || !c.ok ? ' disabled' : ''} title="${c.ok ? `dziś ${L.day[id] || 0}/${lm.d}` : c.why}">`;
    });
  };
})();

/* =========================================================
   2. GARDEROBA DZIEWCZYNY
   ========================================================= */
Object.assign(City, {
  // stroje = modele postaci (Microsoft Rocketbox, MIT); ceny w sklepie
  LOOKS: [
    ['Female_Adult_01', 'Różowa koszula i dżinsy', 0], ['Female_Adult_02', 'Biała bluzka i spódnica', 450], ['Female_Adult_03', 'Fioletowy top, czarne spodnie', 380],
    ['Female_Adult_04', 'Skórzana kurtka i bojówki', 0], ['Female_Adult_05', 'Jasna koszula i dżinsy', 300], ['Female_Adult_07', 'Brązowa kurtka i kozaki', 520],
    ['Female_Adult_08', 'Luźny T-shirt i dżinsy', 250], ['Female_Adult_09', 'Elegancki żakiet', 690], ['Female_Adult_11', 'Sukienka i kozaki', 740],
    ['Female_Adult_12', 'Sportowa bluza i szorty', 320], ['Female_Adult_13', 'Kamizelka i dżinsy', 360], ['Female_Adult_14', 'Beżowy żakiet', 640],
    ['Female_Adult_15', 'Niebieska koszula, rybaczki', 410], ['Female_Adult_17', 'Zielony T-shirt, jasne dżinsy', 280], ['Female_Party_01', 'Na imprezę: top i szorty', 560], ['Female_Party_02', 'Wieczorowa: czarna sukienka', 980],
  ],
  gfKey() {
    const Z = City.Z(), G = Z.gf; if (!G) return 'Female_Adult_04';
    const gp = G.pid && City.person(G.pid);
    return G.look || (gp && gp.key) || 'Female_Adult_04';
  },
  wardrobe() {
    const Z = City.Z(), G = Z.gf; if (!G) return [];
    if (!G.wardrobe) G.wardrobe = [...new Set([City.gfKey(), 'Female_Adult_01'])];
    return G.wardrobe;
  },
  wardModal(ctx = '') {
    const Z = City.Z(), G = Z.gf, C = Career.C(); if (!G) { UI.toast('Najpierw kogoś poznaj ❤', true); return; }
    const own = City.wardrobe(), cur = City.gfKey();
    UI.modal(`<div class="row between"><span class="kicker">Garderoba · ${esc(G.name)}</span><button class="x" data-ui="close">×</button></div>
      <h2>Wybierz jej strój</h2><p class="small muted">Nowe ubrania kupujesz razem z nią (sklep internetowy) — prezent poprawia związek. Na koncie: ${C.money.toLocaleString('pl-PL')} zł</p>
      <div class="ward">${City.LOOKS.map(([k, n, price]) => { const has = own.includes(k), on = cur === k;
        return `<div class="ward-i ${on ? 'on' : ''} ${has ? '' : 'lock'}"><img src="models/rb/prev/${k}.jpg" alt=""><b>${esc(n)}</b>
          ${on ? '<span class="good small">założone</span>' : has ? `<button class="go small" data-ui="cWardSet" data-v="${k}">Załóż</button>` : `<button class="ghost small" data-ui="cWardBuy" data-v="${k}" ${C.money < price ? 'disabled' : ''}>Kup ${price} zł</button>`}</div>`; }).join('')}</div>`);
    City._wardCtx = ctx;
  },
  wardSet(k) {
    const Z = City.Z(), G = Z.gf; if (!G || !City.wardrobe().includes(k)) return;
    G.look = k; Game.save();
    UI.toast(`${G.name} się przebrała ✨`);
    if (Walk.active && Walk.room === 'home') { const keep = [Walk.x, Walk.z, Walk.yaw, Walk.pitch]; Walk.enterRoom('home'); [Walk.x, Walk.z, Walk.yaw, Walk.pitch] = keep; }
    City.wardModal(City._wardCtx);
  },
  wardBuy(k) {
    const Z = City.Z(), G = Z.gf, C = Career.C(), L = City.LOOKS.find(x => x[0] === k); if (!G || !L) return;
    if (C.money < L[2]) { UI.toast('Za mało pieniędzy.', true); return; }
    Career.pay(-L[2], `Ubranie dla ${G.name}`); City.wardrobe().push(k);
    const st = City.stamp(); if (G.giftDay !== st) { G.giftDay = st; G.rel = Math.min(100, G.rel + 5); Z.stress -= 3; UI.toast(`${G.name}: „Jest piękna! Dziękuję ❤” (związek +5)`); } else UI.toast('Kupione.');
    Humans.loadAvatar(k); City.clamp(Z); Game.save(); City.wardModal(City._wardCtx);
  },
});

/* =========================================================
   3. OSIEDLE Z WIELKIEJ PŁYTY (3D) I SZEMRANA ROBOTA
   ========================================================= */
City.PLACES.osiedle = { name: 'Osiedle „Tysiąclecia”', icon: '🏢', x: 470, y: 535, c: '#8c7b68' };
City.ROOM.osiedle = 'osiedle';
City.ACTS.osiedle = [
  { id: 'trzepak', n: 'Trzepak z chłopakami z bloku', d: 'stres −10, stare historie' },
  { id: 'garage', n: 'Garaż kumpla — dłubanie przy silniku', d: 'silnik lepszy w najbliższym meczu (mniej niż u mechanika) · energia −8' },
  { id: 'kiosk', n: 'Kiosk „Ruch” — gazeta i oranżada', d: 'co o tobie piszą', money: 6 },
  { id: 'deal', n: 'Szemrana robota za garażami', d: 'szybka kasa… policja patroluje osiedle' },
];
Object.assign(World, {
  /** Blok z wielkiej płyty: prefabrykaty, okna, loggie w pasach, klatki schodowe */
  prlBlock(G, { x, z, w, d, floors, rot = 0, tint = '#c9c3b6', stripe = '#d98a5a', klatki = 4, name = '' }) {
    const B = new THREE.Group(); B.position.set(x, 0, z); B.rotation.y = rot; G.add(B);
    const fh = 2.8, h = floors * fh + 0.6, mod = 3.6;
    const facade = World.canvasTex(256, 256, g => {
      g.fillStyle = tint; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
      g.strokeStyle = 'rgba(60,55,50,.55)'; g.lineWidth = 3; g.strokeRect(1, 1, 254, 254); // spoiny płyt
      g.fillStyle = 'rgba(40,30,25,.12)'; g.fillRect(0, 238, 256, 18); // zacieki
      g.fillStyle = '#6b6258'; g.fillRect(58, 70, 140, 110); // ościeżnica
      const gr = g.createLinearGradient(0, 74, 0, 176); gr.addColorStop(0, '#8fa6b8'); gr.addColorStop(1, '#3d4a58'); g.fillStyle = gr; g.fillRect(64, 76, 128, 98);
      g.fillStyle = '#e9e5dc'; g.fillRect(126, 76, 5, 98); g.fillRect(64, 110, 128, 4);
      if (Math.random() < 0.6) { g.fillStyle = ['#f1ecd8', '#e2c8a0', '#c9d6c2', '#e6e6e6'][Math.floor(Math.random() * 4)]; g.fillRect(66, 78, 58, 30); } // firanka
    }, [w / mod, (h - 0.6) / fh]);
    facade.wrapS = facade.wrapT = THREE.RepeatWrapping;
    const endTex = World.canvasTex(128, 256, g => { g.fillStyle = tint; g.fillRect(0, 0, 128, 256); g.fillStyle = stripe; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 6; i++) g.fillRect(0, i * 44, 128, 10); });
    const mFac = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.92 }), mEnd = new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.6, d), [mEnd, mEnd, new THREE.MeshStandardMaterial({ color: 0x3b3a38, roughness: 0.95 }), mFac, mFac, mFac]);
    body.position.y = 0.6 + (h - 0.6) / 2; body.castShadow = body.receiveShadow = true; body.userData.solid = true; B.add(body);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.6, d + 0.1), new THREE.MeshStandardMaterial({ color: 0x77726a, roughness: 1 })); plinth.position.y = 0.3; B.add(plinth);
    // pasy loggii (balkony) w kolorach termomodernizacji — co drugi moduł
    const slab = new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 0.9 }), bal = new THREE.MeshStandardMaterial({ color: new THREE.Color(stripe), roughness: 0.7, metalness: 0.2 });
    const nb = Math.floor(w / mod);
    for (let i = 0; i < nb; i++) {
      if (i % 3 === 1) continue;
      const bx = -w / 2 + mod * (i + 0.5);
      for (let f = 1; f < floors; f++) {
        const y = 0.6 + f * fh;
        [1, -1].forEach(sd => {
          const s = new THREE.Mesh(new THREE.BoxGeometry(mod - 0.4, 0.14, 1.1), slab); s.position.set(bx, y, sd * (d / 2 + 0.55)); B.add(s);
          const p = new THREE.Mesh(new THREE.BoxGeometry(mod - 0.4, 1.0, 0.06), bal); p.position.set(bx, y + 0.55, sd * (d / 2 + 1.08)); B.add(p);
        });
      }
    }
    // klatki schodowe od frontu (+z): drzwi, daszek, numer, lampka
    for (let k = 0; k < klatki; k++) {
      const kx = -w / 2 + (w / klatki) * (k + 0.5);
      World.realDoor(B, kx, 0.6, d / 2 + 0.02, 0, { kind: 'metal', lamp: false });
      const can = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.3), slab); can.position.set(kx, 3.1, d / 2 + 0.65); B.add(can);
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.4), new THREE.MeshStandardMaterial({ color: 0x8a857c, roughness: 1 })); step.position.set(kx, 0.15, d / 2 + 0.7); B.add(step);
      const n = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), new THREE.MeshBasicMaterial({ map: World.signTex(`${name} ${String.fromCharCode(65 + k)}`, '#1d3f7a', '#ffffff', 256, 96) })); n.position.set(kx, 2.75, d / 2 + 0.03); B.add(n);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.5) })); lamp.position.set(kx, 3.0, d / 2 + 1.25); B.add(lamp);
    }
    // antena i maszynownia windy na dachu
    const mach = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), mFac); mach.position.set(-w / 4, h + 1, 0); B.add(mach);
    return B;
  },

  buildOsiedle() {
    const cx = 600, W = 60, D = 44, Y = World.LOCKER_Y;
    const G = new THREE.Group(); G.position.set(cx, Y, 0); World.scene.add(G);
    G.userData.lights = [];
    // własne niebo (kopuła) — zasłania resztę świata pod ziemią
    const skyTex = World.canvasTex(64, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6d8fbf'); gr.addColorStop(0.45, '#a9c0da'); gr.addColorStop(0.62, '#f0d4b0'); gr.addColorStop(0.7, '#8a8f95'); gr.addColorStop(1, '#4a4d52'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })); sky.position.y = 0; G.add(sky);
    const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x5a5048, 0.75); hemi.visible = false; G.userData.lights.push(hemi); G.add(hemi);
    const sun = new THREE.PointLight(0xffe0b8, 0.9, 140, 1.2); sun.position.set(-20, 40, 25); sun.visible = false; G.userData.lights.push(sun); G.add(sun);
    // teren: asfalt, chodniki, trawniki
    const asph = World.pbr('asphalt_02', W / 6, D / 6, { color: '#5a5a5c' });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, D + 60), asph); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
    const grass = World.pbr('leafy_grass', 4, 4, { color: '#8aa468' });
    [[-10, -3, 16, 12], [12, -2, 18, 12], [0, 9, 26, 5]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grass); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; G.add(m); });
    const walkM = World.pbr('concrete_pavement', 8, 1, { color: '#b0aaa0' });
    [[0, -13.2, 50, 2.2], [0, 14.8, 50, 2.2], [-22, 0, 2.2, 26], [22, 0, 2.2, 26]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), walkM); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); G.add(m); });
    // bloki: długi dziesięciopiętrowiec z tyłu, dwa pięciopiętrowce po bokach
    World.prlBlock(G, { x: 0, z: -20.5, w: 54, d: 11, floors: 10, stripe: '#d98a5a', klatki: 5, name: 'Klatka' });
    World.prlBlock(G, { x: -30.5, z: 1, w: 36, d: 10, floors: 5, rot: Math.PI / 2, tint: '#cfc8b8', stripe: '#6fa0c8', klatki: 3, name: 'Blok 7' });
    World.prlBlock(G, { x: 30.5, z: 1, w: 36, d: 10, floors: 5, rot: -Math.PI / 2, tint: '#c5c0b4', stripe: '#9cc07a', klatki: 3, name: 'Blok 9' });
    // rząd blaszanych garaży od frontu
    const tin = World.canvasTex(128, 128, g => { g.fillStyle = '#7b8288'; g.fillRect(0, 0, 128, 128); for (let x = 0; x < 128; x += 8) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, 0, 3, 128); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 4, 0, 2, 128); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,60,20,${Math.random() * 0.35})`; g.fillRect(Math.random() * 128, Math.random() * 128, 4, 8 + Math.random() * 20); } });
    const gcol = ['#7c8a96', '#8a6a4a', '#4f6b52', '#7a3a32', '#5c6a7a', '#8a8a6a', '#6a5a7a', '#8c7b68'];
    for (let i = 0; i < 8; i++) {
      const gx = -24 + i * 3.2 + (i > 3 ? 20.6 : 0), m = new THREE.MeshStandardMaterial({ map: tin, color: new THREE.Color(gcol[i]), metalness: 0.5, roughness: 0.6 });
      const gb = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.4, 5.5), m); gb.position.set(gx, 1.2, 19.8); gb.userData.solid = true; gb.castShadow = true; G.add(gb);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 5.9), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 })); roof.position.set(gx, 2.45, 19.8); roof.rotation.x = 0.04; G.add(roof);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.1), new THREE.MeshStandardMaterial({ map: tin, color: new THREE.Color(gcol[(i + 3) % 8]), metalness: 0.5, roughness: 0.55 })); door.position.set(gx, 1.08, 17.04); door.rotation.y = Math.PI; G.add(door);
    }
    // kiosk „Ruch”
    { const K = new THREE.Group(); K.position.set(14, 0, 9.5); G.add(K);
      const kb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2), new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.8 })); kb.position.y = 1.2; kb.userData.solid = true; K.add(kb);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x9fb4c4, metalness: 0.3, roughness: 0.15 })); win.position.set(0, 1.35, 1.01); K.add(win);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.45), new THREE.MeshBasicMaterial({ map: World.signTex('RUCH · PRASA · ORANŻADA', '#c8102e', '#ffffff', 512, 90) })); sign.position.set(0, 2.2, 1.02); K.add(sign);
      const rf = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 2.4), new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.6 })); rf.position.y = 2.46; K.add(rf); }
    // trzepak (rurki) i ławki, lampy uliczne
    { const pipe = new THREE.MeshStandardMaterial({ color: 0x3f6e9a, metalness: 0.5, roughness: 0.5 }), T = new THREE.Group(); T.position.set(-6, 0, 4); G.add(T);
      [[-1.3, 0], [1.3, 0]].forEach(([x]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), pipe); p.position.set(x, 0.8, 0); T.add(p); });
      [1.55, 1.05].forEach(y => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), pipe); p.rotation.z = Math.PI / 2; p.position.set(0, y, 0); T.add(p); });
      T.userData.solid = true; }
    // kosze na śmieci osiedla (kontenery) i słupy oświetleniowe
    for (let i = 0; i < 6; i++) {
      const lx = -18 + i * 7.2, lz = i % 2 ? -12 : 13.4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6, 8), new THREE.MeshStandardMaterial({ color: 0x5a5e63, metalness: 0.5 })); pole.position.set(lx, 3, lz); G.add(pole);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.5) })); hd.position.set(lx + 0.3, 6, lz); G.add(hd);
    }
    // drzewa (topole i brzozy — kule koron)
    const leaf = new THREE.MeshStandardMaterial({ color: 0x4d7a3a, roughness: 0.9 }), bark = new THREE.MeshStandardMaterial({ color: 0x5a4a3a });
    [[-14, -6], [-9, -9], [16, -8], [8, -9], [-17, 6], [18, 5], [4, 6.5], [-2, -8]].forEach(([x, z], i) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 3.2, 8), bark); t.position.set(x, 1.6, z); G.add(t);
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + (i % 3) * 0.3, 1), leaf); c.position.set(x + (k - 1) * 0.5, 3.6 + k * 0.7, z + (k % 2) * 0.4); c.castShadow = true; G.add(c); }
    });
    World.rooms.osiedle = { cx, W, D, name: 'Osiedle „Tysiąclecia”', exitTo: null, group: G, place: 'osiedle', outdoor: true,
      spots: [{ id: 'c:osiedle:trzepak', x: -6, z: 5.2, label: 'Trzepak — pogadaj z chłopakami z bloku' }, { id: 'c:osiedle:kiosk', x: 14, z: 11.3, label: 'Kiosk „Ruch” — gazeta (6 zł)' },
        { id: 'c:osiedle:garage', x: -20.8, z: 15.6, label: 'Garaż kumpla — dłub przy silniku' }, { id: 'o:deal', x: 9.6, z: 15.8, label: 'Za garażami… „szemrana robota”' }, { id: 'o:bench', x: 6.5, z: -3.2, label: 'Pani Halinka z ławki — plotki' }],
      npc: [{ x: -5.2, z: 3.4, face: Math.PI * 0.7, key: 'Male_Adult_07', pose: 'talk' }, { x: -6.9, z: 3.5, face: Math.PI * 0.3, key: 'Male_Adult_13', pose: 'idle' }, { x: 10.6, z: 16.3, face: Math.PI, key: 'Male_Adult_16', pose: 'idle' },
        { x: 6.5, z: -4.1, face: 0, key: 'Female_Adult_06', pose: 'sit' }, { x: 14, z: 8.2, face: 0, key: 'Male_Adult_09', pose: 'idle' }],
      crowd: [] };
    Object.assign(Rooms.FURN, {
      osiedle: [['swings', 12, 0, -3, 0, {}], ['slide', 17, 0, 0, Math.PI / 2, {}], ['sandpit', 9, 0, 1.5, 0, {}], ['benchPark', 6.5, 0, -4.1, 0, {}], ['benchPark', -12, 0, 3.5, Math.PI / 2, {}], ['benchPark', 2, 0, 10.5, Math.PI, {}],
        ['dumpster', 20, 0, 12.5, Math.PI, {}], ['dumpster', 17.7, 0, 12.5, Math.PI, {}], ['hatch3', -14, 0, 11, Math.PI / 2, {}], ['estate', -8, 0, 11, Math.PI / 2, {}], ['saloon', 4, 0, 13, -Math.PI / 2, {}], ['panelvan', -20, 0, -9, 0, {}],
        ['streetLamp', -22, 0, -12, 0, {}], ['plant1', 0, 0, -14.4, 0, {}]],
    });
  },
});
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () { bb.call(this); try { World.buildOsiedle(); } catch (e) { console.warn('Osiedle', e); } };
  // bez sufitu i ścian — wyjście po drodze do miasta
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    be.call(this, key);
    if (key === 'osiedle') { const ex = Walk.spots.find(s => s.id === 'r:exit'); if (ex) ex.label = 'Wróć do miasta (przystanek)'; if (City._arrestScene) City.arrestSpawn(); }
  };
})();

// zajęcia osiedla i szemrana robota
Object.assign(City, {
  osiedleAct(id) {
    const Z = City.Z(), C = Career.C(), r = Career.me();
    let msg = '';
    if (id === 'trzepak') { Z.stress -= 10; Career.mor(2); msg = Crowd.pick(['„Pamiętasz, jak jeździłeś tu na motorynce?” Śmiech i słonecznik. Stres −10.', 'Chłopaki opowiadają, kto z bloku wyjechał do Anglii. Stres −10.', '„Młody, dawaj autograf dla mojego bratanka!” Stres −10.']); }
    if (id === 'garage') { C.prep = Math.min(0.6, (C.prep || 0) + 0.15); Z.energy -= 8; msg = 'Kumpel pożyczył czujnik zapłonu i klucz dynamometryczny. Silnik chodzi równiej (na mecz).'; }
    if (id === 'kiosk') {
      const heads = C.jail > 0 ? ['„Żużlowiec za kratkami”'] : C.rep > 60 ? ['„Nasz chłopak z bloku podbija ligę!”', '„Gwiazda z Tysiąclecia”'] : C.rep > 30 ? ['„Junior z osiedla coraz szybszy”'] : ['„Kolejny sezon bez medalu”', '„Kto pamięta juniorów?”'];
      msg = `Gazeta: ${Crowd.pick(heads)}${C.dealHeat > 0.3 ? ' · Na ostatniej stronie: „Policja zapowiada akcję na osiedlu”' : ''}. Oranżada w butelce — smak dzieciństwa.`; Z.stress -= 2;
    }
    if (id === 'deal') { City.dealModal(); return; }
    City.pay(Z, (City.ACTS.osiedle.find(a => a.id === id)), msg);
  },
  dealModal() {
    const C = Career.C(), heat = C.dealHeat || 0;
    const risk = k => Math.round(Math.min(0.85, (k === 'big' ? 0.24 : 0.1) + heat + C.rep / 400) * 100);
    UI.modal(`<div class="row between"><span class="kicker">Za garażami</span><button class="x" data-ui="close">×</button></div>
      <div class="dilemma scandal"><div class="dl-ico">!</div><div><h2>„Szemrana robota”</h2><p>Chudy w kapturze kiwa głową: „Słyszałem, że żużel słabo płaci. Mam robotę — przenosisz paczkę na drugi koniec miasta. Nie pytasz, co w środku.”</p>
      <p class="small muted">To przestępstwo. Złapany — areszt, zawieszenie w lidze, zerwane umowy, reputacja w gruzach. Ryzyko rośnie z każdym razem (policja zna twoją twarz).</p></div></div>
      <div class="talk-opts"><button class="opt warn" data-ui="cDeal" data-v="small">Mała paczka — 900 zł (ryzyko ok. ${risk('small')}%)</button><button class="opt warn" data-ui="cDeal" data-v="big">Duża dostawa — 3500 zł (ryzyko ok. ${risk('big')}%)</button><button class="opt" data-ui="cDeal" data-v="no">„Nie. Mam karierę do stracenia.”</button></div>`);
  },
  deal(k) {
    const C = Career.C(), Z = City.Z(); UI.close();
    if (k === 'no') { Career.grow('mental', 0.1); UI.toast('Odchodzisz. Chudy wzrusza ramionami: „Twoja strata.”'); return; }
    if (!City.gate('deal')) return;
    const risk = Math.min(0.85, (k === 'big' ? 0.24 : 0.1) + (C.dealHeat || 0) + C.rep / 400);
    C.dealHeat = Math.min(0.6, (C.dealHeat || 0) + (k === 'big' ? 0.09 : 0.05)); C.deals_n = (C.deals_n || 0) + 1;
    if (Math.random() < risk) { City.arrest(k); return; }
    const pay = k === 'big' ? 3500 : 900; Career.pay(pay, 'Gotówka „za robotę”'); Z.stress += k === 'big' ? 14 : 8;
    City.pay(Z, { n: 'Szemrana robota' }, `Paczka dostarczona. ${pay} zł w kieszeni… i serce wali jak przed taśmą. Stres +${k === 'big' ? 14 : 8}.`);
  },
  /** Zatrzymanie: radiowóz na osiedlu, areszt, zawieszenie, reputacja */
  arrest(k) {
    const C = Career.C(), Z = City.Z(), r = Career.me(), big = k === 'big' || (C.deals_n || 0) > 4;
    const weeks = big ? R.int(4, 7) : R.int(2, 4);
    C.jail = weeks; C.suspended = Math.max(C.suspended || 0, weeks + 2); C.record = (C.record || 0) + 1;
    Career.repd(-30); Career.mor(-20); Z.stress = 100; City.clamp(Z);
    const fine = big ? 20000 : 8000; Career.pay(-fine, 'Grzywna i adwokat');
    const lost = C.deals.map(d => d.name); C.deals = []; lost.forEach(n => City.sms(n, 'W związku z zatrzymaniem rozwiązujemy umowę sponsorską ze skutkiem natychmiastowym.'));
    r.contract.perPoint = Math.round(r.contract.perPoint * (big ? 0.5 : 0.7) / 10) * 10;
    if (Z.gf) { Z.gf.rel -= 40; if (Z.gf.rel < 20) { City.sms(Z.gf.name, 'Nie tak miało wyglądać moje życie. Nie dzwoń już.'); Z.gf = null; } }
    Game.news(`Żużlowiec ${r.name} zatrzymany przez policję na osiedlu Tysiąclecia. Liga zawiesza zawodnika.`, 'bad');
    C.dealHeat = 0.35; Z.day = 6; // reszta tygodnia w areszcie
    City._arrestScene = true;
    if (Walk.active && Walk.room === 'osiedle') City.arrestSpawn();
    let ov = document.getElementById('sleepov'); if (!ov) { ov = document.createElement('div'); ov.id = 'sleepov'; document.body.appendChild(ov); }
    ov.className = 'on police'; ov.innerHTML = '<div><b>🚨 POLICJA!</b><small>„Stój! Ręce na maskę!”</small></div>';
    setTimeout(() => { ov.classList.add('dark'); ov.innerHTML = `<div><b>Areszt</b><small>Sąd: ${weeks} tyg. aresztu · liga: zawieszenie ${C.suspended} tyg.</small></div>`; }, 2600);
    setTimeout(() => {
      ov.className = ''; City._arrestScene = false; Game.save();
      if (Walk.active) Walk.stop(); UI.show('mgr'); Career.render();
      UI.modal(`<div class="kicker">Konsekwencje</div><div class="dilemma scandal"><div class="dl-ico">🚔</div><div><h2>Zatrzymany</h2>
        <p>Paczka, radiowóz, kajdanki. Dziennikarze mieli zdjęcia, zanim dojechałeś na komisariat.</p>
        <ul class="list small"><li>Areszt: <b>${weeks} tyg.</b> (tygodnie mijają bez ciebie w mieście)</li><li>Zawieszenie w lidze: <b>${C.suspended} tyg.</b></li><li>Reputacja −30, nastrój −20</li><li>Grzywna i adwokat: −${fine.toLocaleString('pl-PL')} zł</li>
        <li>Prezes tnie stawkę za punkt o ${big ? 50 : 30}%</li>${lost.length ? `<li>Sponsorzy zrywają umowy: ${esc(lost.join(', '))}</li>` : ''}</ul></div></div>
        <div class="actions"><button class="go" data-ui="close">Dalej</button></div>`);
    }, 5400);
  },
  arrestSpawn() {
    const R = World.rooms.osiedle; if (!R || !Humans.ready) return;
    Furn.load(['police'], () => { if (Walk.room !== 'osiedle') return; const g = Furn.place(World.venueGroup, 'police', R.cx + 3, World.LOCKER_Y, 15.5, Math.PI / 2, {}); if (g) Rooms.dyn.push(g); });
    [[4.8, 16.6, -Math.PI / 2], [1.6, 16.4, Math.PI / 2]].forEach(([x, z, f]) => { const m = Humans.make(Humans.byRole('police'), 'idle', { sex: 'm' }); if (m) { m.position.set(R.cx + x, World.LOCKER_Y, z); m.rotation.y = f; Rooms.add(m); } });
    const lamp = new THREE.PointLight(0x3a6bff, 2.2, 18, 1.6); lamp.position.set(R.cx + 3, World.LOCKER_Y + 2.4, 15.5); Rooms.add(lamp);
  },
});
(() => {
  const ba = City.act;
  City.act = function (place, id) {
    if (place === 'osiedle') { const A = City.ACTS.osiedle.find(a => a.id === id); if (!A) return; if (Career.C().jail > 0) { UI.toast('Siedzisz w areszcie.', true); return; } if (City.weekDone()) { UI.toast('Tydzień dobiegł końca — kliknij „Zakończ tydzień”.', true); return; } if (A.money && Career.C().money < A.money) { UI.toast('Za mało pieniędzy.', true); return; } if (id !== 'deal' && !City.gate(id)) return; if (A.money) Career.pay(-A.money, A.n); City.Z().loc = 'osiedle'; City.osiedleAct(id); return; }
    return ba.call(this, place, id);
  };
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id === 'o:deal') { City.dealModal(); return true; }
    if (id === 'o:bench') {
      const C = Career.C(), Z = City.Z(); const st = City.stamp(); if (Z.halinka === st) { UI.toast('Pani Halinka drzemie na słońcu.'); return true; } Z.halinka = st; Z.stress -= 4;
      UI.modal(`<div class="row between"><span class="kicker">Ławka pod blokiem</span><button class="x" data-ui="close">×</button></div><h2>Pani Halinka</h2><blockquote class="quote">${C.dealHeat > 0.2 ? '„Synku, jacyś panowie w cywilu pytali o ciebie. Uważaj, bo to nie są kibice.”' : Crowd.pick(['„Twoja babcia byłaby dumna. Tylko jedz porządnie!”', '„Widziałam cię w telewizji! Ale czemu tak szybko jeździcie w kółko?”', '„Ta ze spożywczego pytała, czy masz dziewczynę…”'])}</blockquote><div class="actions"><button class="go" data-ui="close">Dziękuję, pani Halinko</button></div>`);
      return true;
    }
    return bra.call(this, id);
  };
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cDeal') { City.deal(d.v); return true; }
    if (d.ui === 'cWard') { City.wardModal(d.v); return true; }
    if (d.ui === 'cWardSet') { City.wardSet(d.v); return true; }
    if (d.ui === 'cWardBuy') { City.wardBuy(d.v); return true; }
    return bc.call(this, d);
  };
  // areszt: miasto i mecze zablokowane, tygodnie mijają
  const ben = City.enter;
  City.enter = function (place) { if (Career.C().jail > 0) { UI.toast('Siedzisz w areszcie — miasto musi poczekać.', true); return; } return ben.call(this, place); };
  const btm = Career.toMatch;
  Career.toMatch = function () {
    const C = Career.C();
    if (C.jail > 0) { UI.show('mgr'); Career.render(); UI.modal(`<h2>Areszt śledczy</h2><p>Cela 3×4 m, spacerniak raz dziennie. Mecz drużyny słyszysz tylko z radia strażnika. Zostało <b>${C.jail}</b> tyg.</p><div class="actions"><button class="go" data-ui="cSimWeek">Kolejny tydzień ▸</button></div>`); return; }
    return btm.call(this);
  };
  const bfw = Career.finishWeek;
  Career.finishWeek = function (um) {
    const C = Career.C(), wasJail = C.jail > 0;
    if (wasJail) { C.jail--; if (C.report) C.report.lines.push(C.jail > 0 ? `Areszt — jeszcze ${C.jail} tyg.` : 'Wychodzisz z aresztu. Brama się zamyka, a ty stoisz z reklamówką rzeczy.'); if (C.city) { C.city.stress = Math.max(60, C.city.stress); } }
    C.dealHeat = Math.max(0, (C.dealHeat || 0) - 0.03);
    const res = bfw.call(this, um);
    if (wasJail && C.jail > 0 && C.city) C.city.day = 6; // kolejny tydzień też za kratkami
    if (wasJail && C.jail === 0) Game.news(`${Career.me().name} opuścił areszt. „Chcę wrócić na tor i odbudować zaufanie kibiców.”`, 'info');
    return res;
  };
  // oferty po sezonie: kartoteka odstrasza kluby
  const bse = Career.seasonEnd;
  Career.seasonEnd = function () { const r = bse.call(this), C = Career.C(); if (C.record) { C.offers = C.offers.filter((o, i) => i === 0 || Math.random() < 0.4); Game.news('Kartoteka policyjna odstrasza część klubów.', 'bad'); } return r; };
  // mapa: droga na osiedle i bryły bloków
  const bm = City.mapSvg;
  City.mapSvg = function () {
    const Z = City.Z(), night = (Z.day > 5 ? 2 : Z.slot) === 2;
    const road = night ? '#3a4455' : '#ffffff', cas = night ? '#262d39' : '#c9ccc4', blk = night ? '#3a4050' : '#bdb6a8', txt = night ? '#c9d2e0' : '#39414d';
    const extra = `<g class="prl"><path d="M345 470 L470 535" stroke="${cas}" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M345 470 L470 535" stroke="${road}" stroke-width="13" fill="none" stroke-linecap="round"/>
      <path id="rdprl" d="M345 470 L470 535" fill="none"/><text class="rname" fill="${txt}"><textPath href="#rdprl" startOffset="18%">ul. Wielkiej Płyty</textPath></text>
      ${[[395, 505, 34, 9, -0.2], [520, 505, 9, 30, 0], [540, 560, 44, 9, 0], [410, 562, 30, 8, 0]].map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${blk}" transform="rotate(${r * 57.3} ${x} ${y})" filter="url(#bshadow)"/>`).join('')}</g>`;
    return bm.call(this).replace('<g class="cpin', extra + '<g class="cpin');
  };
})();
