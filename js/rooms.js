/* =========================================================
   Speedway Empire 3D — wnętrza budynków
   Każde wnętrze to osobny pokój pod ziemią (y = −40), obok
   siebie wzdłuż osi x. Menedżer (albo zawodnik w karierze)
   wchodzi przez drzwi budynku i chodzi po pokoju jak na
   zewnątrz. Stałe wyposażenie budujemy raz (buildRooms),
   ludzi i rzeczy zależne od stanu gry — przy wejściu
   (Rooms.populate).
   • office  — biuro prezesa: biurko, gablota z pucharami, prezes
   • gym     — centrum treningowe: bieżnie, ławka, sztangi, trener
   • medic   — centrum medyczne: łóżka, szafki, RTG, lekarz
   • garage  — warsztat: motocykle na stojakach, stół, narzędzia, mechanik
   • home    — mieszkanie zawodnika (kariera): wyposażenie kupowane w sklepie
   • party   — klub nocny (kariera): bar, parkiet, neony, ludzie
   ========================================================= */
'use strict';

Object.assign(World, {
  /** Pusty pokój: podłoga z teksturą, 4 ściany, sufit, lampy; zwraca grupę (środek podłogi = 0,0,0) */
  roomShell(cx, W, D, H, { wall = 0x8f8b82, floor = '#4a4640', lines = '#3a3732', lamp = 0xfff4e0, lampI = 0.7, ceil = 0x2c2b29, tile = 32, floorTex, wallTex, tint, wallTint, fScale = 2, door = 'wood', homey = false } = {}) {
    const G = new THREE.Group(); G.position.set(cx, World.LOCKER_Y, 0); World.scene.add(G);
    let fm;
    if (floorTex) fm = World.pbr(floorTex, W / fScale, D / fScale, { color: tint });
    else {
      const tex = World.canvasTex(256, 256, g => { g.fillStyle = floor; g.fillRect(0, 0, 256, 256); g.strokeStyle = lines; g.lineWidth = 3; for (let i = 0; i <= 256; i += tile) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(W / 4, D / 4); fm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
    }
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), fm); f.rotation.x = -Math.PI / 2; f.position.y = 0.01; G.add(f);
    const wm = wallTex ? World.pbr(wallTex, Math.round(Math.max(W, D) / 3), 1, { color: wallTint }) : new THREE.MeshStandardMaterial({ color: wall, roughness: 0.9 });
    // listwy przypodłogowe
    const skirt = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.6 });
    [[0, -D / 2 + 0.02, W, 0], [0, D / 2 - 0.02, W, 0], [-W / 2 + 0.02, 0, D, Math.PI / 2], [W / 2 - 0.02, 0, D, Math.PI / 2]].forEach(([x, z, l, r]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(l, 0.1, 0.03), skirt); s.position.set(x, 0.05, z); s.rotation.y = r; G.add(s); });
    [[0, -D / 2, 0, W], [0, D / 2, Math.PI, W], [-W / 2, 0, Math.PI / 2, D], [W / 2, 0, -Math.PI / 2, D]].forEach(([x, z, r, w]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wm); m.position.set(x, H / 2, z); m.rotation.y = r; G.add(m); });
    // sufit podwieszany (płyty 60×60 w metalowym rastrze); w klubie — ciemny
    let cm;
    if (homey) cm = new THREE.MeshStandardMaterial({ color: 0xf3efe8, roughness: 0.95 }); // mieszkanie, kawiarnia: gładki tynk zamiast rastra
    else if (wallTex && ceil !== 0x09080b) cm = World.ceilMat(W, D);
else cm = wallTex ? World.pbr('white_plaster_02', W / 3, D / 3, { color: '#222222' }) : new THREE.MeshStandardMaterial({ color: ceil, roughness: 1 });
    const c = new THREE.Mesh(new THREE.PlaneGeometry(W, D), cm); c.rotation.x = Math.PI / 2; c.position.y = H; G.add(c);
    G.userData.lights = [];
    [-W / 4, W / 4].forEach(x => { const p = new THREE.PointLight(lamp, lampI, Math.max(W, D) * 1.2, 1.6); p.visible = false; G.userData.lights.push(p); p.position.set(x, H - 0.3, 0); G.add(p);
      if (homey) { // lampa wisząca: przewód, klosz i ciepła żarówka
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x1b1b1b })); cord.position.set(x, H - 0.35, 0); G.add(cord);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x2c2f33, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); shade.position.set(x, H - 0.8, 0); G.add(shade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.3, 1.3) })); bulb.position.set(x, H - 0.9, 0); G.add(bulb);
        p.position.y = H - 0.95; return; }
      const l = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.8) })); l.position.set(x, H - 0.04, 0); G.add(l); });
    // drzwi wyjściowe w ścianie +z
    World.realDoor(G, 0, 0, D / 2 - 0.02, Math.PI, { kind: door, lamp: false });
    const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.5, 0.6) })); ex.position.set(0, 2.55, D / 2 - 0.05); ex.rotation.y = Math.PI; G.add(ex);
    return G;
  },
  box(G, w, h, d, color, x, y, z, ry = 0, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0, emissive: opts.emissive ?? 0x000000 }));
    m.position.set(x, y, z); m.rotation.y = ry; m.userData.fb = !!World._fb; m.userData.solid = h > 0.3 && !opts.pass; G.add(m); return m;
  },
  lit(G, w, h, color, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); m.rotation.y = ry; G.add(m); return m; },

  buildRooms() {
    World.rooms = { locker: { cx: 0, W: World.locker.W, D: World.locker.Dp, name: 'Szatnia', exitTo: 'locker', group: World.lockerGroup } };
    World.buildLocker(200, 'lockerAway');
    World.buildCityRooms(); // kasyno, bar, restauracja, kawiarnia, gabinet (kariera)
    World.rooms.lockerAway = { cx: 200, W: World.locker.W, D: World.locker.Dp, name: 'Szatnia gości', exitTo: 'lockerAway', group: World.lockerRefs.lockerAway.group };
    const B = World.box, L = World.lit;

    /* --- biuro prezesa --- */
    let G = World.roomShell(40, 12, 10, 3.2, { floorTex: 'wood_floor', wallTex: 'painted_plaster_wall', fScale: 2.5 });
    World._fb = true;
    B(G, 2.4, 0.08, 1.1, 0x4a2f1c, 0, 0.78, -2.2); B(G, 2.3, 0.74, 0.08, 0x3a2414, 0, 0.37, -1.7); // biurko
    B(G, 0.3, 0.3, 0.02, 0x111111, 0.4, 1.02, -2.4, 0, { emissive: 0x223355 }); B(G, 0.5, 0.02, 0.35, 0x222222, 0.4, 0.83, -2.1); // laptop
    B(G, 0.6, 1.1, 0.6, 0x1a1a1a, 0, 0.55, -3.1); // fotel
    B(G, 2.8, 2.2, 0.45, 0x2a1d12, -4.2, 1.1, -4.6); // gablota
    World._fb = false;
    for (let i = 0; i < 9; i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.34, 10), new THREE.MeshStandardMaterial({ color: 0xd4a73a, metalness: 0.9, roughness: 0.25 })); cup.position.set(-5.2 + (i % 3) * 1, 0.55 + Math.floor(i / 3) * 0.62, -4.35); G.add(cup); }
    L(G, 3, 1.6, new THREE.Color(0.05, 0.08, 0.2), 4, 1.7, -4.96); // okno — nocne miasto
    for (let i = 0; i < 18; i++) L(G, 0.12, 0.16, new THREE.Color(2.5, 2, 1.2), 2.7 + Math.random() * 2.6, 1.1 + Math.random() * 1.1, -4.95);
    World._fb = true;
    B(G, 2.2, 0.5, 0.9, 0x5c2a1a, 3.8, 0.25, 2.8); B(G, 2.2, 0.5, 0.2, 0x5c2a1a, 3.8, 0.7, 3.2); // kanapa
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2e5a2a })); plant.position.set(-5.3, 1, 4.2); plant.userData.fb = true; G.add(plant); B(G, 0.4, 0.5, 0.4, 0x6b4a2e, -5.3, 0.25, 4.2);
    World._fb = false;
    // ekran z tabelą ligi na prawej ścianie
    World.leagueTex = World.canvasTex(512, 320, g => { g.fillStyle = '#0b1320'; g.fillRect(0, 0, 512, 320); });
    { const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 2.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })); fr.position.set(5.94, 1.8, 0.4); G.add(fr);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.2), new THREE.MeshBasicMaterial({ map: World.leagueTex })); sc.position.set(5.9, 1.8, 0.4); sc.rotation.y = -Math.PI / 2; G.add(sc); }
    // flagi klubu w narożniku i ścianka sponsorska za biurkiem
    World.officeWall = World.canvasTex(512, 256, g => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 512, 256); });
    { const w = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: World.officeWall, roughness: 0.8 })); w.position.set(0.2, 1.9, -4.95); G.add(w); }
    World.officeTV = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.07), new THREE.MeshBasicMaterial({ map: World.crestTex })); World.officeTV.position.set(-5.95, 1.8, 0); World.officeTV.rotation.y = Math.PI / 2; G.add(World.officeTV);
    World.rooms.office = { cx: 40, W: 12, D: 10, name: 'Biuro prezesa', exitTo: 'office', group: G,
      spots: [{ id: 'r:league', x: 4.8, z: 0.4, label: 'Tabela ligowa na ekranie' }, { id: 'r:meeting', x: -2.8, z: 3.4, label: 'Stół narad — zebranie zarządu' }, { id: 'r:desk', x: 0, z: -1.2, label: 'Biurko — sprawy klubu' }, { id: 'r:trophies', x: -4.2, z: -3.4, label: 'Gablota z pucharami' }, { id: 'r:president', x: 2.4, z: -2.6, label: 'Rozmowa z prezesem' }],
      npc: [{ x: 2.4, z: -3.6, face: 0, role: 'president', pose: 'talk', cols: ['#2b2f38', '#e0b08a', '#7c7c7c', '#1c2130'] }] };

    /* --- centrum treningowe --- */
    G = World.roomShell(80, 16, 12, 3.6, { floorTex: 'rubber_tiles', wallTex: 'grey_plaster', fScale: 2, door: 'metal' });
    L(G, 10, 2.2, new THREE.Color(0.35, 0.4, 0.45), 0, 1.6, -5.96); // lustro
    World._fb = true;
    for (let i = 0; i < 3; i++) { const x = -5 + i * 2; B(G, 0.8, 0.2, 1.8, 0x222222, x, 0.1, -3.6); B(G, 0.8, 1.2, 0.1, 0x333333, x, 0.9, -4.4); B(G, 0.5, 0.25, 0.05, 0x111111, x, 1.55, -4.35, 0, { emissive: 0x114422 }); } // bieżnie
    B(G, 0.4, 0.45, 1.6, 0x1b1b1b, 3, 0.25, -2.5); B(G, 0.05, 1.4, 0.05, 0x999999, 2.4, 0.7, -3.2); B(G, 0.05, 1.4, 0.05, 0x999999, 3.6, 0.7, -3.2); // ławka i stojaki
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 })); bar.rotation.z = Math.PI / 2; bar.position.set(3, 1.35, -3.2); G.add(bar);
    [-0.75, 0.75].forEach(dx => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x111111 })); pl.rotation.z = Math.PI / 2; pl.position.set(3 + dx, 1.35, -3.2); G.add(pl); });
    B(G, 3, 0.9, 0.5, 0x2a2a2a, 6, 0.45, -5.5); for (let i = 0; i < 8; i++) B(G, 0.12, 0.12, 0.3, 0x444444, 4.8 + i * 0.34, 1.0, -5.5); // hantle
    World._fb = false; G.children.forEach(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && !o.userData.fb && o.position.y > 1.2 && o.position.y < 1.4) o.userData.fb = true; });
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 14), new THREE.MeshStandardMaterial({ color: 0x7a1d1d, roughness: 0.6 })); bag.position.set(-6, 1.6, 2.5); G.add(bag);
    World.rooms.gym = { cx: 80, W: 16, D: 12, name: 'Centrum treningowe', exitTo: 'gym', group: G,
      spots: [{ id: 'r:trainer', x: 0.5, z: 0.5, label: 'Trener — trening indywidualny' }, { id: 'r:equip', x: -5, z: -2.4, label: 'Bieżnie i sprzęt' }],
      npc: [{ x: 0.5, z: -0.6, face: Math.PI / 2, role: 'trainer', pose: 'talk', cols: ['#1B7A43', '#cf9a70', '#161010', '#1c1c1c'] }] };

    /* --- centrum medyczne --- */
    G = World.roomShell(120, 12, 10, 3.2, { floorTex: 'large_grey_tiles', wallTex: 'white_plaster_02', lamp: 0xf2f8ff, lampI: 0.6, fScale: 2, door: 'glass' });
    World._fb = true;
    [-3, 0.5].forEach(x => { B(G, 2, 0.12, 0.9, 0xf4f4f4, x, 0.75, -3.6); B(G, 0.1, 0.7, 0.9, 0x9aa0a6, x - 0.95, 0.4, -3.6); B(G, 0.1, 0.7, 0.9, 0x9aa0a6, x + 0.95, 0.4, -3.6); B(G, 0.5, 0.1, 0.35, 0xffffff, x - 0.7, 0.86, -3.6); });
    World._fb = false;
    World._fb = true; B(G, 1.6, 2, 0.5, 0xffffff, 4.8, 1, -4.6); World._fb = false;
    L(G, 1.6, 1.1, new THREE.Color(0.5, 0.7, 0.9), -5.95, 1.7, 0, Math.PI / 2); // podświetlane zdjęcie RTG
    World.rooms.medic = { cx: 120, W: 12, D: 10, name: 'Centrum medyczne', exitTo: 'medic', group: G,
      spots: [{ id: 'r:doctor', x: 2.5, z: 0, label: 'Lekarz klubowy' }],
      npc: [{ x: 2.5, z: -1, face: Math.PI / 2, role: 'doctor', pose: 'idle', cols: ['#f4f4f4', '#ecc5a2', '#4a3020', '#8aa0b8'] }] };

    /* --- warsztat (wnętrze) --- */
    G = World.roomShell(-40, 16, 12, 4, { floorTex: 'concrete_floor_02', wallTex: 'brushed_concrete', wallTint: '#c9c6c0', lamp: 0xfff0d8, lampI: 0.9, fScale: 4, door: 'metal' });
    // stół warsztatowy: blat z desek na stalowej szafce z szufladami
    const drw = World.canvasTex(512, 128, g => { g.fillStyle = '#5d646c'; g.fillRect(0, 0, 512, 128); for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) { const x = c * 128 + 6, y = r * 42 + 4; g.fillStyle = '#6c747c'; g.fillRect(x, y, 116, 36); g.strokeStyle = '#2b2f33'; g.lineWidth = 3; g.strokeRect(x, y, 116, 36); g.fillStyle = '#c9ced3'; g.fillRect(x + 38, y + 14, 40, 6); } });
    const benchBody = new THREE.Mesh(new THREE.BoxGeometry(4, 0.88, 0.85), [World.box.steel || (World.box.steel = new THREE.MeshStandardMaterial({ color: 0x4f555c, metalness: 0.6, roughness: 0.45 })), World.box.steel, World.box.steel, World.box.steel, new THREE.MeshStandardMaterial({ map: drw, metalness: 0.5, roughness: 0.45 }), World.box.steel]);
    benchBody.position.set(4, 0.44, -5.45); benchBody.userData.solid = true; G.add(benchBody);
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.06, 0.95), World.pbr('dark_wooden_planks', 2, 0.5, { color: '#e2c9a4' })); top.position.set(4, 0.91, -5.45); G.add(top);
    // tablica perforowana z narzędziami
    const peg = World.canvasTex(1024, 420, g => {
      g.fillStyle = '#8a6a48'; g.fillRect(0, 0, 1024, 420); g.fillStyle = '#4a3522'; for (let x = 12; x < 1024; x += 24) for (let y = 12; y < 420; y += 24) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
      const steel = (x0, y0, x1, y1, w) => { const gr = g.createLinearGradient(x0 - w, y0, x0 + w, y0); gr.addColorStop(0, '#6d747a'); gr.addColorStop(0.5, '#e4e8ec'); gr.addColorStop(1, '#6d747a'); g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
      for (let i = 0; i < 9; i++) { const x = 60 + i * 34, len = 110 + i * 12; steel(x, 60, x, 60 + len, 10 + i * 0.6); g.strokeStyle = '#dfe3e6'; g.lineWidth = 4; g.beginPath(); g.arc(x, 52, 11 + i * 0.5, Math.PI * 0.2, Math.PI * 1.8); g.stroke(); } // klucze płaskie
      for (let i = 0; i < 6; i++) { const x = 440 + i * 40; g.fillStyle = ['#d9541f', '#2255aa', '#e8c21a', '#d9541f', '#1e1e1e', '#2a8a3a'][i]; g.fillRect(x - 9, 60, 18, 80); steel(x, 140, x, 250, 6); } // śrubokręty
      [[740, 80], [860, 80]].forEach(([x, y]) => { g.fillStyle = '#3a2a1a'; g.fillRect(x - 7, y + 30, 14, 170); g.fillStyle = '#8d949a'; g.fillRect(x - 38, y, 76, 32); }); // młotki
      g.strokeStyle = '#c62f2f'; g.lineWidth = 10; [[960, 90], [990, 90]].forEach(([x, y], k) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k ? 12 : -12), y + 140); g.stroke(); }); steel(975, 60, 975, 100, 12); // kombinerki
      g.fillStyle = '#3b3f44'; g.fillRect(430, 290, 540, 60); for (let i = 0; i < 12; i++) steel(450 + i * 44, 300, 450 + i * 44, 340, 14); // nasadki
    });
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.8), new THREE.MeshStandardMaterial({ map: peg, roughness: 0.75, metalness: 0.1 })); pb.position.set(4, 2.0, -5.96); G.add(pb);
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); t.rotation.x = Math.PI / 2; t.position.set(-6.5, 0.1 + i * 0.2, 4.5); t.userData.fb = true; G.add(t); }
    World.rooms.garage = { cx: -40, W: 16, D: 12, name: 'Warsztat', exitTo: 'workshop', group: G, bikes: [[-4, -2], [-1, -2], [2, -2]],
      spots: [{ id: 'r:mechanic', x: 4, z: -3.8, label: 'Szef mechaników' }, { id: 'r:bikes', x: -1, z: -0.6, label: 'Motocykle drużyny' }],
      npc: [{ x: 4, z: -4.35, face: Math.PI / 2, role: 'mechanic', pose: 'work', cols: ['#3a3f4a', '#b8805a', '#2b1d12', '#1c2130'] }] };

    /* --- mieszkanie zawodnika (kariera) --- */
    // układ: sypialnia (tył, lewo), salon z TV (tył, środek), kuchnia z jadalnią (przód, lewo), łazienka za ścianką (przód, prawo), przedpokój przy drzwiach
    G = World.roomShell(-90, 16, 12, 3.0, { floorTex: 'wood_floor', wallTex: 'painted_plaster_wall', lamp: 0xffe2b8, lampI: 0.6, fScale: 2.5, homey: true });
    // okno z widokiem na nocne miasto (rama, parapet, szprosy)
    L(G, 3.2, 1.7, new THREE.Color(0.06, 0.09, 0.22), 4, 1.6, -5.96); for (let i = 0; i < 24; i++) L(G, 0.1, 0.14, new THREE.Color(2.5, 2, 1.3), 2.6 + Math.random() * 2.8, 0.9 + Math.random() * 1.2, -5.95);
    { const fr = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.5 });
      [[4, 2.48, 3.4, 0.08], [4, 0.72, 3.4, 0.08], [2.32, 1.6, 0.08, 1.8], [5.68, 1.6, 0.08, 1.8], [4, 1.6, 0.05, 1.7]].forEach(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), fr); m.position.set(x, y, -5.95); G.add(m); });
      const sill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 0.3), fr); sill.position.set(4, 0.7, -5.84); G.add(sill); }
    // ścianki łazienki (z przejściem) — gładki tynk, listwa
    { const wm = World.pbr('painted_plaster_wall', 2, 1, { color: '#e8e2d8' });
      const wall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.0, 0.12), wm); m.position.set(x, 1.5, z); m.rotation.y = ry; m.userData.solid = true; G.add(m); };
      wall(3.5, 6.3, 2.2, 0); // ściana od strony pokoju
      wall(1.1, 4.5, 2.75, Math.PI / 2); wall(1.6, 4.5, 5.2, Math.PI / 2); // ścianka boczna z drzwiami (przejście z = 3.3…4.4)
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 1.1), wm); lintel.position.set(4.5, 2.6, 3.85); G.add(lintel);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.7), World.pbr('floor_tiles_06', 3, 3, { color: '#f0f0f0' })); tile.rotation.x = -Math.PI / 2; tile.position.set(6.28, 0.015, 4.1); G.add(tile); }
    World.rooms.home = { cx: -90, W: 16, D: 12, name: 'Twoje mieszkanie', exitTo: null, group: G, spots: [] };

    /* --- klub nocny (kariera) --- */
    G = World.roomShell(-150, 18, 14, 3.4, { floorTex: 'large_grey_tiles', tint: '#3a3740', wallTex: 'brick_wall_02', wallTint: '#4a4048', lamp: 0x8a4dff, lampI: 0.5, ceil: 0x09080b, fScale: 2, door: 'metal' });
    B(G, 6, 1.1, 0.8, 0x2a1a12, -4, 0.55, -5.8); L(G, 6, 0.06, new THREE.Color(0.2, 1.5, 3), -4, 1.12, -5.39); // bar z podświetleniem
    for (let i = 0; i < 20; i++) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6), new THREE.MeshStandardMaterial({ color: [0x2e6b3a, 0x8a5a1a, 0xcfcfcf, 0x5a1a2a][i % 4], metalness: 0.3, roughness: 0.2 })); bt.position.set(-6.6 + i * 0.28, 1.9, -6.8); G.add(bt); }
    B(G, 6.4, 0.08, 0.3, 0x3a2a1e, -4, 1.75, -6.8);
    World.partyTiles = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const t = L(G, 0.95, 0.95, new THREE.Color(1, 0, 1), 2 + i, 0.02, -2 + j); t.rotation.x = -Math.PI / 2; World.partyTiles.push(t); } // parkiet
    B(G, 2.2, 1.2, 1, 0x1a1a1f, 4.5, 0.6, -6); L(G, 2, 0.3, new THREE.Color(3, 0.4, 2), 4.5, 1.25, -5.49); // konsola DJ
    [[-8.95, 1.8, 0, Math.PI / 2, new THREE.Color(3, 0.3, 1.8)], [8.95, 2.2, 0, -Math.PI / 2, new THREE.Color(0.3, 1.8, 3)], [0, 2.8, -6.95, 0, new THREE.Color(3, 1.6, 0.2)]].forEach(([x, y, z, r, c]) => L(G, 5, 0.08, c, x, y, z, r)); // neony
    [[2, 2.6, 0, 0xff3aa8], [6, 2.6, 0, 0x3ad7ff]].forEach(([x, y, z, c]) => { const p = new THREE.PointLight(c, 1.2, 12, 1.5); p.visible = false; G.userData.lights.push(p); p.position.set(x, y, z); G.add(p); });
    B(G, 3, 0.45, 1, 0x3a1030, -6, 0.22, 3.5); B(G, 3, 0.6, 0.2, 0x3a1030, -6, 0.6, 4); // loża VIP
    World.rooms.party = { cx: -150, W: 18, D: 14, name: 'Klub „Taśma”', exitTo: null, group: G, spots: [] };
  },
});

/* ---------- ludzie i rzeczy zależne od stanu gry (przy wejściu) ---------- */
const Rooms = {
  dyn: [], anim: [],
  add(o) { World.venueGroup.add(o); Rooms.dyn.push(o); if (o.userData.human) Rooms.anim.push(o); return o; },
  clear() { Rooms.dyn.forEach(o => { if (o.parent) o.parent.remove(o); }); Rooms.dyn = []; Rooms.anim = []; Rooms._colN = -1; },
  tick(dt) { Rooms.anim.forEach(m => Humans.tick(m, dt)); },
  /** Prostokąty kolizji z mebli i ludzi w pokoju (liczone, gdy zmienia się zawartość) */
  colliders() {
    const key = Rooms.dyn.length + ':' + Walk.room;
    if (Rooms._colN === key) return Rooms._col || [];
    Rooms._colN = key;
    const b = new THREE.Box3(), out = [];
    // stałe elementy pokoju (stół, szafki, ławki) oznaczone userData.solid
    const RG = Walk.room && World.rooms[Walk.room] && World.rooms[Walk.room].group;
    if (RG) { RG.updateMatrixWorld(true); RG.traverse(o => { if (!o.userData.solid) return; let v = o; while (v && v !== RG) { if (!v.visible) return; v = v.parent; } b.setFromObject(o); out.push({ x0: b.min.x - 0.1, x1: b.max.x + 0.1, z0: b.min.z - 0.1, z1: b.max.z + 0.1 }); }); }
    Rooms.dyn.forEach(o => {
      if (o.isSprite) return;
      b.setFromObject(o); if (b.isEmpty()) return;
      const h = b.max.y - b.min.y; if (h < 0.12) return; // dywany, płaskie rzeczy
      const pad = o.userData.human ? 0.15 : 0.05;
      out.push({ x0: b.min.x - pad, x1: b.max.x + pad, z0: b.min.z - pad, z1: b.max.z + pad });
    });
    return (Rooms._col = out);
  },
  /** Człowiek: realistyczny (Rocketbox) albo zastępczy (Quaternius); key/role/pose */
  human(n) {
    if (Humans.ready) return Humans.make(n.key || (n.role && Humans.byRole(n.role)) || null, n.pose || 'idle', { frame: n.frame || 0, fps: n.fps });
    if (People.ready) return People.makeStatic(n.pose === 'dance' ? 'jump' : n.pose === 'cheer' ? 'clap' : n.pose === 'sit' ? 'sit' : 'idle', n.cols || [Crowd.pick(Crowd.JACKETS), Crowd.pick(Crowd.SKIN), Crowd.pick(Crowd.HAIR), Crowd.pick(Crowd.PANTS)], n.frame || 0);
    return null;
  },
  npc(R, n) {
    const m = Rooms.human(n);
    if (!m) return;
    m.position.set(R.cx + n.x, World.LOCKER_Y + (n.y || 0), n.z); m.rotation.y = n.face || 0;
    Rooms.add(m);
  },
  tag(R, text, x, z, color = '#E0632E', y = 2.2) { const t = World.nameTag(text, color); t.position.set(R.cx + x, World.LOCKER_Y + y, z); t.scale.set(2.4, 0.6, 1); Rooms.add(t); },

  /** Meble z modeli: [klucz, x, y|'top:klucz', z, obrót, rozmiar]; przedmioty zastępcze w pokoju chowamy */
  FURN: {
    office: [['meetingTable', -2.8, 0, 1.8, 0, {}], ['officeChair', -3.9, 0, 1.8, -Math.PI / 2, {}], ['officeChair', -1.7, 0, 1.8, Math.PI / 2, {}], ['officeChair', -2.8, 0, 0.7, Math.PI, {}], ['officeChair', -2.8, 0, 2.9, 0, {}], ['plant4', 5.4, 0, 4.2, 0, {}],
      ['officeDesk', 0, 0, -2.3, 0, {}], ['officeChair', 0, 0, -3.3, 0, {}], ['laptop', 0.3, 'top:officeDesk', -2.3, Math.PI, {}], ['filing', -5.4, 0, -1.2, Math.PI / 2, {}], ['trophyCab', -2.4, 0, -4.7, 0, {}],
      ['bookshelf', -4.2, 0, -4.75, 0, {}], ['loungeSofa', 3.8, 0, 3.2, Math.PI, {}], ['plant2', -5.3, 0, 4.2, 0, {}], ['plant1', 5.3, 0, -4.3, 0, {}], ['frame2', 5.95, 1.6, 1.8, -Math.PI / 2, {}], ['rug', 0, 0.01, 0.8, 0, {}]],
    gym: [['treadmill', -5, 0, -3.9, Math.PI, {}], ['treadmill', -3, 0, -3.9, Math.PI, {}], ['treadmill', -1, 0, -3.9, Math.PI, {}], ['benchPress', 3.2, 0, -3.4, 0, {}], ['dumbbells', 5.8, 0, -5.3, 0, {}],
      ['exBike', -6.3, 0, 1.2, Math.PI / 2, {}], ['exBike', -6.3, 0, 3.2, Math.PI / 2, {}], ['rower', 3.5, 0, 3.4, -Math.PI / 2, {}], ['gymBench', 5.5, 0, 0.5, Math.PI / 2, {}]],
    medic: [['careBed', -3, 0, -3.5, 0, {}], ['examCouch', 0.8, 0, -3.5, 0, {}], ['massage', 3.6, 0, 2.6, Math.PI / 2, {}], ['pharmacy', 4.8, 0, -4.6, 0, {}], ['desk', 4, 0, 0.2, -Math.PI / 2, {}],
      ['computer', 4.1, 'top:desk', 0.2, -Math.PI / 2, {}], ['officeChair', 3, 0, 0.2, Math.PI / 2, {}], ['plant4', -5.2, 0, 4, 0, {}]],
    garage: [['steelShelf', -6.6, 0, -5.3, 0, {}], ['toolChest', 6.9, 0, -5.3, 0, {}], ['toolCart', 5.6, 0, -2.6, -0.4, {}], ['vice', 5.2, 0.94, -5.45, 0, {}], ['tyreRack', -7.2, 0, -2.2, Math.PI / 2, {}], ['compressor', -6.8, 0, 0.8, Math.PI / 2, {}],
      ['tyre', -6.5, 0, 4.5, 0, {}], ['tyre', -6.5, 0.24, 4.5, 0.6, {}], ['tyre', -6.5, 0.48, 4.5, 1.2, {}], ['barrel', -6.6, 0, 2.6, 0, {}], ['barrel', -5.8, 0, 3.2, 0, {}],
      // podnośnik, montażownica, wyważarka, kombinezon na manekinie (3dassets.dev, CC0)
      ['bikeLift', -3, 0, 3.4, 0, { w: 2.2 }], ['tyreChanger', -4.6, 0, -5.2, 0, { h: 1.3 }], ['wheelBal', -3, 0, -5.4, 0, { h: 1.2 }], ['leathers', 7.3, 0, 2, -Math.PI / 2, { h: 1.85 }]],
    party: [['barStool', -6.4, 0, -4.9, 0, {}], ['barStool', -5.4, 0, -4.9, 0, {}], ['barStool', -4.4, 0, -4.9, 0, {}], ['barStool', -3.4, 0, -4.9, 0, {}], ['barStool', -2.4, 0, -4.9, 0, {}],
      ['bottles', -5.2, 1.78, -6.8, 0, {}], ['bottles', -2.8, 1.78, -6.8, 0.3, {}], ['register', -1.6, 1.1, -5.95, 0, {}], ['speaker', 2.9, 0, -6.3, 0, {}], ['speaker', 6.1, 0, -6.3, 0, {}], ['djDesk', 4.5, 0, -6.1, 0, {}]],
  },
  furnish(key, R) {
    const list = Rooms.FURN[key]; if (!list) return;
    const put = () => {
      if (Walk.room !== key) return;
      const tops = {};
      list.forEach(([k, x, y, z, rot, size]) => {
        const yy = typeof y === 'string' ? (tops[y.slice(4)] || 0.75) : y;
        const g = Furn.place(World.venueGroup, k, R.cx + x, World.LOCKER_Y + yy, z, rot, size);
        if (g) { Rooms.dyn.push(g); const C = Furn.cache[k]; tops[k] = yy + C.size.y * g.children[0].scale.y; }
      });
      R.group.traverse(o => { if (o.userData.fb) o.visible = false; }); // meble z modeli zamiast brył
    };
    const keys = [...new Set(list.map(l => l[0]))];
    if (Furn.ready(keys)) put(); else Furn.load(keys, put);
  },

  /** Wejście do pokoju: NPC, motocykle, wyposażenie mieszkania, ludzie w klubie; zwraca listę miejsc akcji */
  populate(key) {
    const R = World.rooms[key], spots = (R.spots || []).map(s => ({ ...s, x: R.cx + s.x, r: s.r || 1.5 }));
    spots.push({ id: 'r:exit', x: R.cx, z: R.D / 2 - 0.7, label: key === 'party' ? 'Wyjdź z imprezy' : key === 'home' ? 'Wyjdź z domu' : 'Wyjdź na zewnątrz', r: 1.3 });
    (R.npc || []).forEach(n => Rooms.npc(R, n));
    Rooms.furnish(key, R);
    if (key === 'garage') {
      const c = Game.club(Game.s.user);
      R.bikes.forEach(([x, z], i) => { const b = Bike.build({ kevlar: c.kevlar, trim: c.trim, helmet: '#444', no: i + 1, name: '' }, { noTag: true }); b.rider.visible = false; b.root.position.set(R.cx + x, World.LOCKER_Y + 0.025, z); b.root.rotation.y = Math.PI / 2; World.linearize(b.root); Rooms.add(b.root); });
    }
    if (key === 'home') Career.furnish(R, spots);
    if (key === 'party') Career.partyPeople(R, spots);
    return spots;
  },
};
