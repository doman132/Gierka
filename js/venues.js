/* =========================================================
   Speedway Empire 3D — MIEJSCA W MIEŚCIE (3D), LUDZIE, TELEFON
   Każde miejsce z mapy kariery ma wnętrze, do którego
   wchodzisz postacią:
     • Kasyno „Złoty Kask” — ruletka (kręcące się koło),
       blackjack z krupierem, automaty, bar z piwem
     • Bar „Pod Taśmą” — lada z nalewakami, darts, bilard,
       szafa grająca, telewizor z żużlem, stali bywalcy
     • Restauracja „Pit Stop”, kawiarnia przy parku,
       gabinet psychologa; siłownia, klub i stadion
   W środku są ludzie — nieznajomi, których możesz poznać.
   Znajomi trafiają do telefonu: dzwonisz, piszesz, umawiasz
   się, dostajesz zaproszenia i wiadomości.
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   Wnętrza (budowane z resztą pokoi pod stadionem, y = −40)
   --------------------------------------------------------- */
Object.assign(World, {
  buildCityRooms() {
    const B = World.box, L = World.lit;
    const felt = (w, h, draw) => World.canvasTex(w, h, draw);

    /* --- KASYNO --- */
    let G = World.roomShell(260, 20, 14, 3.8, { floorTex: 'large_grey_tiles', wallTex: 'dark_wooden_planks', wallTint: '#7a4230', lamp: 0xffd49a, lampI: 0.85, fScale: 2, door: 'glass', ceil: 0x09080b });
    // wykładzina kasynowa
    // klasyczny wzór: ciemna czerwień, drobne złote romby i kwiatony
    const carpet = felt(256, 256, g => { g.fillStyle = '#3e0a12'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(160,112,40,.55)'; g.lineWidth = 2; for (let i = -1; i < 5; i++) for (let j = -1; j < 5; j++) { const x = i * 64 + (j % 2 ? 32 : 0), y = j * 64; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 18, y); g.lineTo(x, y + 18); g.lineTo(x - 18, y); g.closePath(); g.stroke(); g.fillStyle = 'rgba(190,140,50,.5)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 1500; k++) g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); });
    carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(20, 14); carpet.anisotropy = 8;
    G.children[0].material = new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 });
    const wood = World.pbr('dark_wooden_planks', 2, 1, { color: '#8a5a3a' }), gold = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.3 });
    // ruletka: stół z planszą i kręcącym się kołem
    { const T = new THREE.Group(); T.position.set(-4.5, 0, -1.5); G.add(T);
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 1.5), wood); base.position.y = 0.4; base.userData.solid = true; T.add(base);
      const lay = felt(1024, 384, g => {
        g.fillStyle = '#0e5a32'; g.fillRect(0, 0, 1024, 384); g.strokeStyle = '#e8e2c8'; g.lineWidth = 3;
        const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        g.fillStyle = '#0b7a3a'; g.fillRect(300, 40, 60, 216); g.strokeRect(300, 40, 60, 216); g.fillStyle = '#fff'; g.font = 'bold 30px Barlow, sans-serif'; g.textAlign = 'center'; g.fillText('0', 330, 160);
        for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) { const n = c * 3 + (3 - r), x = 360 + c * 54, y = 40 + r * 72; g.fillStyle = red.includes(n) ? '#b8272e' : '#161616'; g.fillRect(x + 6, y + 14, 42, 44); g.strokeRect(x, y, 54, 72); g.fillStyle = '#fff'; g.fillText(String(n), x + 27, y + 46); }
        ['1–18', 'PARZYSTE', '◆', '◆', 'NIEPARZ.', '19–36'].forEach((t, i) => { const x = 360 + i * 108; g.strokeRect(x, 256, 108, 60); g.fillStyle = t === '◆' ? (i === 2 ? '#b8272e' : '#161616') : '#fff'; g.font = t === '◆' ? '44px sans-serif' : 'bold 20px Barlow, sans-serif'; g.fillText(t, x + 54, 298); });
      });
      const top = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.4), new THREE.MeshStandardMaterial({ map: lay, roughness: 0.9 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.815; T.add(top);
      [[0, 0.74, 3.5, 0.1], [0, -0.74, 3.5, 0.1], [1.7, 0, 0.1, 1.58], [-1.7, 0, 0.1, 1.58]].forEach(([x, z, w, d]) => { const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), wood); rim.position.set(x, 0.84, z); T.add(rim); }); // obrzeże z podłokietnikiem
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.46, 0.14, 40), wood); bowl.position.set(-1.25, 0.88, 0); T.add(bowl);
      const wheelTex = felt(512, 512, g => { const n = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]; for (let i = 0; i < 37; i++) { const a0 = i / 37 * Math.PI * 2, a1 = (i + 1) / 37 * Math.PI * 2; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 250, a0, a1); g.closePath(); g.fillStyle = i === 0 ? '#0b7a3a' : i % 2 ? '#b8272e' : '#161616'; g.fill(); g.save(); g.translate(256, 256); g.rotate((a0 + a1) / 2); g.fillStyle = '#fff'; g.font = 'bold 18px Barlow'; g.fillText(n[i], 205, 6); g.restore(); } g.fillStyle = '#6b4226'; g.beginPath(); g.arc(256, 256, 150, 0, 7); g.fill(); g.fillStyle = '#c9a227'; g.beginPath(); g.arc(256, 256, 40, 0, 7); g.fill(); });
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 48), [new THREE.MeshStandardMaterial({ color: 0x3a2414 }), new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.55, metalness: 0, emissive: 0xffffff, emissiveMap: wheelTex, emissiveIntensity: 0.15 }), new THREE.MeshStandardMaterial({ color: 0x3a2414 })]);
      wheel.position.set(-1.25, 0.96, 0); T.add(wheel); World.rouletteWheel = wheel;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), gold); spire.position.set(-1.25, 1.04, 0); wheel.add(spire); spire.position.set(0, 0.08, 0);
      [[0.3, -0.2, 0xb8272e], [0.5, 0.25, 0x1b5aa8], [0.9, -0.1, 0x111111]].forEach(([x, z, c]) => { for (let k = 0; k < 5; k++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); ch.position.set(x, 0.82 + k * 0.013, z); T.add(ch); } });
    }
    // blackjack: półokrągły stół
    { const T = new THREE.Group(); T.position.set(4.5, 0, -1.9); G.add(T);
      const g0 = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 40, 1, false, 0, Math.PI); g0.rotateY(-Math.PI / 2);
      const base = new THREE.Mesh(g0, wood); base.position.y = 0.4; base.userData.solid = true; T.add(base);
      const bj = felt(512, 512, g => { g.fillStyle = '#0e5a32'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#e8e2c8'; g.lineWidth = 3; g.fillStyle = '#e8e2c8'; g.textAlign = 'center';
        g.font = 'bold 26px Barlow, sans-serif'; g.fillText('BLACKJACK WYPŁACA 3 : 2', 256, 350); g.font = '18px Barlow, sans-serif'; g.fillText('Krupier dobiera do 16 i staje na 17', 256, 380);
        for (let i = 0; i < 5; i++) { const a = Math.PI * (0.18 + i * 0.16); g.strokeRect(256 + Math.cos(a) * 190 - 26, 256 + Math.sin(a) * 190 - 36, 52, 72); } });
      const top = new THREE.Mesh(new THREE.CircleGeometry(1.44, 40, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ map: bj, roughness: 0.9 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.81; T.add(top);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.16), new THREE.MeshStandardMaterial({ color: 0x1b1b1f })); shoe.position.set(0.9, 0.87, 0.15); T.add(shoe);
      for (let i = 0; i < 5; i++) { const a = Math.PI * (0.18 + i * 0.16); const card = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.13), new THREE.MeshStandardMaterial({ color: 0xf6f4ee })); card.rotation.x = -Math.PI / 2; card.rotation.z = a; card.position.set(Math.cos(a) * 1.05, 0.815, Math.sin(a) * 1.05); T.add(card); }
    }
    // automaty pod tylną ścianą
    const reel = felt(256, 192, g => { const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#2a0a3a'); gr.addColorStop(1, '#0a0418'); g.fillStyle = gr; g.fillRect(0, 0, 256, 192); g.fillStyle = '#fff'; g.fillRect(14, 50, 228, 92); g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; ['7', '🍒', 'BAR'].forEach((s, i) => { g.fillStyle = i === 0 ? '#c8102e' : i === 2 ? '#1b1b1f' : '#000'; g.font = i === 2 ? 'bold 36px Impact' : 'bold 54px sans-serif'; g.fillText(s, 52 + i * 76, 115); }); g.fillStyle = '#ffd23a'; g.font = 'bold 22px Impact'; g.fillText('JACKPOT 50 000', 128, 34); });
    const cab = new THREE.MeshStandardMaterial({ color: 0x7a1020, metalness: 0.5, roughness: 0.35 }), scr = new THREE.MeshBasicMaterial({ map: reel });
    for (let i = 0; i < 9; i++) { const x = -7.2 + i * 1.3; if (Math.abs(x) < 1) continue;
      const b = B(G, 0.95, 1.75, 0.75, 0x7a1020, x, 0.875, -6.55); b.material = cab; b.userData.solid = true; b.userData.fb = true;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.52), scr); s.position.set(x, 1.3, -6.17); s.userData.fb = true; G.add(s);
      const lt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.76), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 0.6) })); lt.position.set(x, 1.8, -6.55); lt.userData.fb = true; G.add(lt); }
    // żyrandole
    [-5, 0, 5].forEach(x => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.2) })); r.rotation.x = Math.PI / 2; r.position.set(x, 3.2, 0.5); r.userData.fb = true; G.add(r); });
    const sign1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.7), new THREE.MeshBasicMaterial({ map: World.signTex('KASYNO „ZŁOTY KASK”', '#2a0a12', '#ffd23a', 512, 90) })); sign1.position.set(0, 3.1, -6.95); G.add(sign1);
    World.rooms.casino = { cx: 260, W: 20, D: 14, name: 'Kasyno „Złoty Kask”', exitTo: null, group: G, place: 'kasyno',
      spots: [{ id: 'c:kasyno:roulette', x: -4.5, z: 0.3, label: 'Ruletka — postaw zakład' }, { id: 'v:blackjack', x: 4.5, z: 0.4, label: 'Blackjack — usiądź przy stole' }, { id: 'c:kasyno:slots', x: -2.6, z: -4.9, label: 'Automaty (100 zł)' }, { id: 'v:barCasino', x: 6.4, z: 2.2, label: 'Bar — piwo i drinki' }],
      npc: [{ x: -4.5, z: -2.7, face: -Math.PI / 2, role: 'official', pose: 'talk' }, { x: 4.5, z: -2.9, face: -Math.PI / 2, key: 'Business_Male_01', pose: 'idle' }, { x: 6.4, z: 4.3, face: Math.PI / 2, key: 'Male_Adult_06', pose: 'idle' }],
      crowd: [[-3.2, 0.1, 1.57, 'idle'], [-5.8, 0.2, 1.57, 'idle'], [3.3, 0.2, 1.2, 'idle'], [5.8, 0.3, 1.9, 'idle'], [1.6, -4.7, 1.57, 'idle'], [-6, -4.6, 1.57, 'idle'], [7.6, 2, 3.14, 'drink'], [-7.5, 3.5, 0.5, 'talk']] };

    /* --- BAR „POD TAŚMĄ” --- */
    G = World.roomShell(330, 16, 12, 3.3, { floorTex: 'wood_floor', tint: '#8a6a4a', wallTex: 'brick_wall_02', wallTint: '#a07060', lamp: 0xffcf8a, lampI: 0.75, fScale: 2, door: 'wood' });
    const tv = felt(512, 288, g => { g.fillStyle = '#12161c'; g.fillRect(0, 0, 512, 288); g.fillStyle = '#141414'; g.beginPath(); g.ellipse(256, 170, 220, 90, 0, 0, 7); g.fill(); g.fillStyle = '#2f6b35'; g.beginPath(); g.ellipse(256, 170, 150, 44, 0, 0, 7); g.fill(); ['#D9541F', '#2A55B8', '#F2C230', '#EDEDED'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(120 + i * 22, 250 - i * 6, 7, 0, 7); g.fill(); }); g.fillStyle = '#E0632E'; g.fillRect(0, 0, 512, 34); g.fillStyle = '#fff'; g.font = 'bold 20px Barlow'; g.fillText('NA ŻYWO · PZE Ekstraliga · bieg 7', 12, 24); });
    { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 1.9), new THREE.MeshStandardMaterial({ color: 0x111111 })); f.position.set(-7.95, 2.2, -1); G.add(f); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), new THREE.MeshBasicMaterial({ map: tv })); s.position.set(-7.9, 2.2, -1); s.rotation.y = Math.PI / 2; G.add(s); }
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({ map: World.canvasTex(512, 128, g => { g.clearRect(0, 0, 512, 128); g.font = 'bold 76px "Saira Stencil One", Impact'; g.textAlign = 'center'; g.fillStyle = '#ff9a3a'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 20; g.fillText('POD TAŚMĄ', 256, 92); }), transparent: true }));
    neon.position.set(0, 2.6, -5.93); G.add(neon);
    // pamiątki żużlowe na ścianie: kaski i plastron
    [[-5.2, '#D9541F'], [-4.4, '#2A55B8'], [4.4, '#EDEDED'], [5.2, '#F2C230']].forEach(([x, c]) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: c, roughness: 0.25 })); h.position.set(x, 2.3, -5.85); G.add(h); });
    World.rooms.pub = { cx: 330, W: 16, D: 12, name: 'Bar „Pod Taśmą”', exitTo: null, group: G, place: 'bar',
      spots: [{ id: 'v:barPub', x: -3, z: -3.3, label: 'Lada — piwo, burger, frytki' }, { id: 'v:darts', x: 6.4, z: -2, label: 'Darts — rzuć trzema lotkami' }, { id: 'v:pool', x: 3, z: 3.5, label: 'Bilard' }, { id: 'c:bar:party', x: -6.6, z: 4.6, label: 'Drzwi do klubu „Taśma” — impreza (3D)' }],
      npc: [{ x: -3, z: -5.5, face: -Math.PI / 2, key: 'Male_Adult_05', pose: 'talk' }],
      crowd: [[-5, -3.2, 1.57, 'drink'], [-1.2, -3.3, 1.57, 'drink'], [0.9, 0.3, 0, 'talk'], [1.9, 1.2, 3.14, 'drink'], [-4.5, 1.8, -0.8, 'talk'], [5, 3.8, 2.4, 'idle'], [6.8, -0.4, 1.57, 'idle'], [-6.2, -1, 0, 'idle']] };

    /* --- RESTAURACJA „PIT STOP” --- */
    G = World.roomShell(400, 14, 11, 3.2, { floorTex: 'large_grey_tiles', tint: '#d8c8b0', wallTex: 'painted_plaster_wall', wallTint: '#e8d8c0', lamp: 0xffe2b8, lampI: 0.7, fScale: 1.6, door: 'glass', homey: true });
    { const c = B(G, 4.2, 1.05, 0.7, 0x5c3a24, 0, 0.525, -4.6); c.material = World.pbr('dark_wooden_planks', 2, 1, { color: '#b08060' }); c.userData.solid = true;
      const menu = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({ map: World.canvasTex(512, 192, g => { g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, 512, 192); g.fillStyle = '#ffd23a'; g.font = 'bold 28px Barlow'; g.fillText('MENU „PIT STOP”', 20, 36); g.fillStyle = '#fff'; g.font = '22px Barlow'; ['Obiad sportowca — łosoś, ryż, warzywa ...... 90 zł', 'Makaron z kurczakiem ...................... 45 zł', 'Burger „Taśma” + frytki ................... 25 zł', 'Sałatka z indykiem ........................ 38 zł'].forEach((t, i) => g.fillText(t, 20, 76 + i * 30)); }) }));
      menu.position.set(0, 2.2, -5.45); G.add(menu); }
    World.rooms.restaurant = { cx: 400, W: 14, D: 11, name: 'Restauracja „Pit Stop”', exitTo: null, group: G, place: 'restauracja',
      spots: [{ id: 'c:restauracja:meal', x: -0.8, z: -3.6, label: 'Zamów: obiad sportowca (90 zł)' }, { id: 'c:restauracja:fast', x: 1.2, z: -3.6, label: 'Zamów: burger i frytki (25 zł)' }],
      npc: [{ x: 0, z: -5.3, face: -Math.PI / 2, key: 'Male_Adult_09', pose: 'idle' }],
      crowd: [[-3.7, -0.5, -1.57, 'sit'], [3.7, 1.9, -1.57, 'sit'], [-3.7, 2.5, -1.57, 'sit'], [2.3, -0.5, -1.57, 'sit'], [5.5, 3.6, 2.4, 'talk']] };

    /* --- KAWIARNIA PRZY PARKU --- */
    G = World.roomShell(460, 12, 10, 3.2, { floorTex: 'wood_floor', tint: '#e8d0b0', wallTex: 'white_plaster_02', lamp: 0xfff0d8, lampI: 0.7, fScale: 2.2, door: 'glass', homey: true });
    { const c = B(G, 3.6, 1.05, 0.7, 0xe8e0d0, -2, 0.525, -4.1); c.material = World.pbr('white_stucco', 1, 1, { color: '#e8e0d0' }); c.userData.solid = true;
      const park = World.canvasTex(512, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9cc8e8'); gr.addColorStop(1, '#e8f0d8'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); g.fillStyle = '#6aa85a'; g.fillRect(0, 170, 512, 86); for (let i = 0; i < 9; i++) { g.fillStyle = ['#3a7a3a', '#4a8a3a', '#2f6a2f'][i % 3]; g.beginPath(); g.arc(30 + i * 60, 150, 38 + (i % 3) * 8, 0, 7); g.fill(); g.fillStyle = '#5a3a22'; g.fillRect(26 + i * 60, 170, 8, 30); } g.fillStyle = '#c8b89a'; g.fillRect(0, 214, 512, 14); });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshBasicMaterial({ map: park })); win.position.set(5.95, 1.65, 0); win.rotation.y = -Math.PI / 2; G.add(win);
      [-2, -0.5, 1, 2.5].forEach(z => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x2b2d31 })); m.position.set(5.92, 1.65, z); G.add(m); }); }
    World.rooms.cafe = { cx: 460, W: 12, D: 10, name: 'Kawiarnia przy parku', exitTo: null, group: G, place: 'park',
      spots: [{ id: 'c:park:coffee', x: -2, z: -3.2, label: 'Kawa i ciastko (15 zł)' }, { id: 'c:park:walk', x: 5.2, z: 3.5, label: 'Wyjdź na spacer po parku' }, { id: 'c:park:date', x: 2.2, z: 0.6, label: 'Stolik — randka' }],
      npc: [{ x: -2, z: -4.8, face: -Math.PI / 2, key: 'Female_Adult_03', pose: 'idle' }],
      crowd: [[1.6, -1.8, -1.57, 'sit'], [3.5, 2.2, -1.57, 'sit'], [-3.8, 2, 0.6, 'talk'], [4.4, -2.6, 1.57, 'idle']] };

    /* --- GABINET PSYCHOLOGA --- */
    G = World.roomShell(520, 9, 8, 3, { floorTex: 'wood_floor', tint: '#c8a888', wallTex: 'painted_plaster_wall', wallTint: '#dcd4c4', lamp: 0xffe8c8, lampI: 0.55, fScale: 2.2, homey: true });
    [[-2.5, 'DYPLOM'], [-1.2, 'CERTYFIKAT']].forEach(([x, t]) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ map: World.signTex(t, '#f4efe2', '#3a2a1a', 256, 190) })); f.position.set(x, 1.9, -3.95); G.add(f); });
    World.rooms.psych = { cx: 520, W: 9, D: 8, name: 'Gabinet psychologa', exitTo: null, group: G, place: 'psycholog',
      spots: [{ id: 'c:psycholog:therapy', x: 0.2, z: 0.2, label: 'Sesja z psychologiem (1500 zł)' }, { id: 'c:psycholog:breath', x: -2.8, z: 1.8, label: 'Warsztat oddechowy (300 zł)' }],
      npc: [{ x: 1.4, z: -1.2, face: Math.PI * 0.8, key: 'Female_Adult_08', pose: 'sit' }], crowd: [] };

    // meble z modeli (3dassets.dev, CC0)
    Object.assign(Rooms.FURN, {
      casino: [['pubCounter', 5.2, 0, 3.4, Math.PI, {}], ['pubCounter', 6.6, 0, 3.4, Math.PI, {}], ['pubCounterEnd', 8, 0, 3.4, Math.PI, {}], ['beerTap', 6, 'top:pubCounter', 3.4, Math.PI, {}],
        ['pubStool', 5.2, 0, 2.5, 0, {}], ['pubStool', 6.4, 0, 2.5, 0, {}], ['pubStool', 7.6, 0, 2.5, 0, {}], ['casStool', 3.3, 0, -0.4, 0, { h: 1.05 }], ['casStool', 4.5, 0, -0.1, 0, { h: 1.05 }], ['casStool', 5.8, 0, -0.3, 0, { h: 1.05 }], ['plantTall', -9.2, 0, 6.2, 0, {}], ['plantTall', 9.2, 0, -6.2, 0, {}],
        // automaty, poker, strefa lounge, kasa i żyrandole (3dassets.dev, CC0)
        ['slotRound', -7.2, 0, -6.45, 0, { h: 1.85 }], ['slotUp', -5.9, 0, -6.45, 0, { h: 1.85 }], ['slotRound', -4.6, 0, -6.45, 0, { h: 1.85 }], ['slotUp', -3.3, 0, -6.45, 0, { h: 1.85 }], ['slotRound', -2.0, 0, -6.45, 0, { h: 1.85 }], ['slotUp', 1.9, 0, -6.45, 0, { h: 1.85 }], ['slotRound', 3.2, 0, -6.45, 0, { h: 1.85 }],
        ['pokerTable', -5, 0, 4, 0, { w: 2.6 }], ['casStool', -6.4, 0, 4, 0, { h: 1.05 }], ['casStool', -3.6, 0, 4, 0, { h: 1.05 }], ['casStool', -5, 0, 5.1, 0, { h: 1.05 }],
        ['casSofa', -9.3, 0, -0.6, Math.PI / 2, { w: 2.2 }], ['cockTable', -8.1, 0, -0.6, 0, { h: 0.75 }], ['cashCage', 9.3, 0, -2.4, -Math.PI / 2, { w: 3 }],
        ['chandelier', -5, 2.3, 0.5, 0, { h: 1.3 }], ['chandelier', 0, 2.3, 0.5, 0, { h: 1.3 }], ['chandelier', 5, 2.3, 0.5, 0, { h: 1.3 }]],
      pub: [['pubCounter', -5.4, 0, -4.7, 0, {}], ['pubCounter', -4, 0, -4.7, 0, {}], ['pubCounter', -2.6, 0, -4.7, 0, {}], ['pubTill', -1.2, 0, -4.7, 0, {}], ['beerTap', -3.4, 'top:pubCounter', -4.7, 0, {}],
        ['pubStool', -5, 0, -3.8, 0, {}], ['pubStool', -3.8, 0, -3.8, 0, {}], ['pubStool', -2.6, 0, -3.8, 0, {}], ['pubStool', -1.4, 0, -3.8, 0, {}],
        ['highTable', 1.4, 0, 0.8, 0, {}], ['highTable', -4, 0, 1.4, 0, {}], ['poolTable', 3, 0, 1.8, Math.PI / 2, {}], ['dartboard', 7.9, 0, -2, -Math.PI / 2, {}], ['jukebox', -7.5, 0, 3.2, Math.PI / 2, {}], ['booth', 6.6, 0, 4.4, Math.PI, {}]],
      restaurant: [['restTable', -3.7, 0, 0.3, 0, {}], ['restChair', -3.7, 0, -0.5, 0, {}], ['restChair', -3.7, 0, 1.1, Math.PI, {}], ['restTable', 2.3, 0, 0.3, 0, {}], ['restChair', 2.3, 0, -0.5, 0, {}], ['restChair', 2.3, 0, 1.1, Math.PI, {}],
        ['restTable', -3.7, 0, 3.3, 0, {}], ['restChair', -3.7, 0, 2.5, 0, {}], ['restChair', -3.7, 0, 4.1, Math.PI, {}], ['restTable', 3.7, 0, 2.7, 0, {}], ['restChair', 3.7, 0, 1.9, 0, {}], ['restChair', 3.7, 0, 3.5, Math.PI, {}],
        ['booth', -5.8, 0, -3, Math.PI / 2, {}], ['plantTall', 6.2, 0, -4.8, 0, {}], ['plantTall', -6.2, 0, 4.8, 0, {}]],
      cafe: [['espresso', -2.6, 'top:pastryCase', -4.1, 0, {}], ['pastryCase', -1.2, 0, -4.1, 0, {}], ['bistroTable', 2.2, 0, 1.4, 0, {}], ['cafeStool', 2.2, 0, 0.6, 0, {}], ['cafeStool', 2.2, 0, 2.2, Math.PI, {}],
        ['bistroTable', 1.6, 0, -1, 0, {}], ['cafeStool', 1.6, 0, -1.8, 0, {}], ['bistroTable', 3.5, 0, 3, 0, {}], ['cafeStool', 3.5, 0, 2.2, 0, {}], ['plantTall', -5.2, 0, 4.2, 0, {}]],
      psych: [['loungeChair', 1.4, 0, -1.2, Math.PI * 0.8, {}], ['loungeChair', -0.4, 0, 1.2, -Math.PI * 0.2, {}], ['sofa', -3, 0, 2.6, Math.PI, {}], ['bookshelf', 2.8, 0, -3.7, 0, {}], ['plantTall', 3.8, 0, 3.2, 0, {}], ['rug', 0.4, 0.01, 0, 0, {}], ['coffee', 0.4, 0, 0, 0, {}]],
    });
  },
});

/* ---------------------------------------------------------
   Miasto: wejścia do wnętrz, ludzie, telefon, gry
   --------------------------------------------------------- */
Object.assign(City, {
  ROOM: { dom: 'home', kasyno: 'casino', bar: 'pub', restauracja: 'restaurant', park: 'cafe', psycholog: 'psych', silownia: 'gym', klub: 'office', tor: null },
  // w karierze siłownia i klub mają własne miejsca akcji
  CAREER_SPOTS: {
    gym: [{ id: 'c:silownia:weights', x: 3.2, z: -2.2, label: 'Ławka i sztanga — trening siłowy' }, { id: 'c:silownia:cardio', x: -3, z: -2.4, label: 'Bieżnie — kondycja i rozciąganie' }, { id: 'c:silownia:sauna', x: -5.5, z: 3.8, label: 'Sauna i basen (40 zł)' }],
    office: [{ id: 'c:klub:sponsor', x: 0, z: -1.2, label: 'Sesja dla sponsora' }, { id: 'c:klub:fans', x: -2.8, z: 3.4, label: 'Spotkanie z kibicami' }, { id: 'c:klub:coach', x: 2.4, z: -2.6, label: 'Rozmowa o składzie' }],
  },

  /** Wejdź do miejsca z mapy (3D) */
  enter(place) {
    const Z = City.Z(); Z.loc = place; City.sel = place;
    if (place === 'tor') { City.inStadium = true; Walk.start(); UI.toast('Stadion: park maszyn — „Wyjedź na tor”, gospodarz toru — trening, warsztat — silnik. Esc — powrót do miasta.'); return; }
    const key = City.ROOM[place];
    if (key && (!World.rooms || !World.rooms[key])) { UI.show('md'); World.enterVenue(Game.s.user); } // świat 3D jeszcze nie wystartował
    if (!key || !World.rooms || !World.rooms[key]) { UI.toast('Tu nie da się wejść.', true); return; }
    Walk.startRoom(key, () => { UI.show('mgr'); Career.render(); });
    if (Z.day <= 5) UI.toast(`${City.PLACES[place].name} · ${City.DAYS[Z.day]}, ${City.timeStr ? City.timeStr() : City.SLOTS[Z.slot]}. Wyjście — drzwi. Telefon — P.`);
  },

  /* ---------- ludzie ---------- */
  MNAMES: ['Kamil', 'Paweł', 'Tomek', 'Marcin', 'Łukasz', 'Bartek', 'Adrian', 'Grzegorz', 'Michał', 'Darek', 'Rafał', 'Krzysiek', 'Sebastian', 'Wojtek'],
  SUR: [['Kowalski', 'Kowalska'], ['Wiśniewski', 'Wiśniewska'], ['Wójcik', 'Wójcik'], ['Kamiński', 'Kamińska'], ['Lewandowski', 'Lewandowska'], ['Zieliński', 'Zielińska'], ['Szymański', 'Szymańska'], ['Dąbrowski', 'Dąbrowska'], ['Mazur', 'Mazur'], ['Krawczyk', 'Krawczyk'], ['Piotrowski', 'Piotrowska'], ['Grabowski', 'Grabowska']],
  TYPES: {
    kibic: { n: 'kibic', haunt: ['bar', 'kasyno', 'restauracja', 'tor'] }, kumpel: { n: 'kumpel ze szkoły', haunt: ['bar', 'park', 'silownia'] },
    mechanik: { n: 'mechanik', haunt: ['bar', 'tor', 'restauracja'] }, dziennikarz: { n: 'dziennikarz', haunt: ['park', 'restauracja', 'kasyno'] },
    zawodnik: { n: 'zawodnik', haunt: ['silownia', 'bar', 'kasyno'] }, biznes: { n: 'biznesmen', haunt: ['kasyno', 'restauracja', 'klub'] },
    dziewczyna: { n: 'dziewczyna', haunt: ['park', 'bar', 'kasyno', 'silownia', 'restauracja'] },
  },
  people() {
    const Z = City.Z();
    if (Z.people && Z.people.length) return Z.people;
    const s = Game.s, out = [], M = ['Male_Adult_01', 'Male_Adult_02', 'Male_Adult_03', 'Male_Adult_04', 'Male_Adult_05', 'Male_Adult_06', 'Male_Adult_07', 'Male_Adult_08', 'Male_Adult_09', 'Male_Adult_10', 'Male_Adult_11', 'Male_Adult_13', 'Male_Adult_14', 'Male_Adult_15', 'Male_Adult_16', 'Male_Adult_18', 'Male_Adult_20'];
    const F = ['Female_Adult_01', 'Female_Adult_02', 'Female_Adult_04', 'Female_Adult_05', 'Female_Adult_06', 'Female_Adult_07', 'Female_Adult_09', 'Female_Party_01'];
    const riders = Object.values(s.riders).filter(r => r.club && r.club !== s.user).sort(() => Math.random() - 0.5);
    const plan = ['kibic', 'kibic', 'kibic', 'kumpel', 'kumpel', 'mechanik', 'mechanik', 'dziennikarz', 'dziennikarz', 'zawodnik', 'zawodnik', 'zawodnik', 'biznes', 'biznes', 'dziewczyna', 'dziewczyna', 'dziewczyna', 'dziewczyna', 'dziewczyna', 'kibic'];
    let fi = 0, mi = 0; // każda osoba ma inny wygląd (kolejne awatary)
    plan.forEach((type, i) => {
      const f = type === 'dziewczyna' || (type === 'kibic' && i % 3 === 0) || (type === 'dziennikarz' && i % 2);
      let name = f ? `${Crowd.pick(City.GIRLS)} ${Crowd.pick(City.SUR)[1]}` : `${Crowd.pick(City.MNAMES)} ${Crowd.pick(City.SUR)[0]}`, rid = null;
      if (type === 'zawodnik' && riders.length) { const r = riders.pop(); name = r.name; rid = r.id; }
      out.push({ id: 'p' + i, name, type, sex: f ? 'f' : 'm', key: f ? F[fi++ % F.length] : M[(mi++ * 5) % M.length], haunt: City.TYPES[type].haunt, rel: 0, known: false, rid, talked: -1, called: -1 });
    });
    return (Z.people = out);
  },
  person(id) { return City.people().find(p => p.id === id); },
  label(p) { return p.known ? `${p.name} (${City.TYPES[p.type].n})` : p.sex === 'f' ? 'Nieznajoma' : 'Nieznajomy'; },

  /** Ludzie w środku: bywalcy danego miejsca na wolnych miejscach, zaproszony znajomy na pewno */
  spawnPeople(key) {
    const R = World.rooms[key]; if (!R || !R.place || !R.crowd || !Humans.ready) return;
    const Z = City.Z(), place = R.place, Y = World.LOCKER_Y;
    const inv = Z.invite && Z.invite.place === place && Z.invite.day === Z.day ? City.person(Z.invite.pid) : null;
    let list = City.people().filter(p => p.haunt.includes(place) && p !== inv && (!Z.gf || Z.gf.pid !== p.id)).sort(() => Math.random() - 0.5).slice(0, Math.max(0, R.crowd.length - 2));
    if (inv) list.unshift(inv);
    list = list.slice(0, R.crowd.length);
    list.forEach((p, i) => {
      const [x, z, face, anim] = R.crowd[i];
      const m = Humans.make(p.key, anim, { sex: p.sex }); if (!m) return;
      m.position.set(R.cx + x, Y, z); m.rotation.y = face; Rooms.add(m);
      if (p.known) { const t = World.nameTag((p === inv ? '✉ ' : '') + p.name.split(' ')[0], p.sex === 'f' ? '#d0508a' : '#3aa56b'); t.position.set(R.cx + x, Y + 2.1, z); t.scale.set(2.2, 0.55, 1); Rooms.add(t); }
      Walk.spots.push({ id: 'n:' + p.id, x: R.cx + x + Math.cos(face) * 0.9, z: z - Math.sin(face) * 0.9, label: `Zagadaj: ${City.label(p)}`, r: 1.3 });
    });
  },

  /** Rozmowa z osobą w lokalu */
  talk(id, act) {
    const p = City.person(id), Z = City.Z(), C = Career.C(), r = Career.me(), s = Game.s; if (!p) return;
    const here = Walk.room && World.rooms[Walk.room] && World.rooms[Walk.room].place;
    const inBar = here === 'bar' || here === 'kasyno';
    if (act) {
      let msg = '';
      switch (act) {
        case 'intro': {
          const ch = 0.45 + C.rep / 300 + (r.morale - 60) / 200 - (Z.stress > 70 ? 0.15 : 0) - (C.drink >= 3 ? 0.2 : 0);
          if (Math.random() < ch) { p.known = true; p.rel = 15 + (p.type === 'kibic' ? 10 : 0); p.talked = City.stamp(); msg = `${p.name} — ${City.TYPES[p.type].n}. ${City.introLine(p)} Numer w telefonie!`; Z.stress -= 3; }
          else { p.talked = City.stamp(); msg = Crowd.pick(['Nie ma dziś ochoty na rozmowę.', 'Tylko kiwa głową i wraca do swoich spraw.', 'Chyba nie trafiłeś z tematem.']); }
          break;
        }
        case 'chat': p.rel += 6; p.talked = City.stamp(); Z.stress -= 4; msg = City.chatLine(p); break;
        case 'beer': if (C.money < 30) { UI.toast('Za mało pieniędzy.', true); return; } Career.pay(-30, `Piwo dla: ${p.name}`); p.rel += 10; C.drink = Math.min(3, (C.drink || 0) + 1); Z.stress -= 6; p.talked = City.stamp(); msg = `Stawiasz piwo. ${p.name}: „Zdrówko! Za twoje pierwsze łuki!”`; break;
        case 'engine': C.prep = Math.min(0.6, C.prep + 0.25); p.rel -= 4; p.favor = s.week; msg = `${p.name} spędził wieczór w twoim garażu: gaźnik ustawiony, sprzęgło nowe. Motocykl szybszy na mecz.`; break;
        case 'interview': Career.repd(3); p.favor = s.week; msg = `Wywiad w lokalnej gazecie: „Młody wilk z ${Game.club(s.user).short}”. Reputacja +3.`; break;
        case 'sponsor': { const w = 400 + Math.round(C.rep * 12); C.deals.push({ name: `${p.name} (firma)`, weekly: w, left: 8 }); p.favor = s.week; msg = `Umowa sponsorska: ${w} zł tygodniowo przez 8 tygodni.`; break; }
        case 'tips': msg = Career.grow('bends', 0.25) || `${p.name} tłumaczy, jak wchodzić w łuk na ${Game.club(s.user).short}.`; Career.grow('mental', 0.15); p.favor = s.week; break;
        case 'datego': Z.gf = { name: p.name.split(' ')[0], rel: 45, lastDate: s.week, met: s.week, pid: p.id }; p.rel += 10; Career.mor(5); Z.stress -= 8; msg = `${p.name.split(' ')[0]} się zgodziła! Od dziś jesteście parą ❤`; break;
        case 'fight': Career.repd(-6); Z.stress += 8; p.rel = Math.max(0, p.rel - 20); msg = 'Ostra wymiana zdań. Ktoś to nagrywał… reputacja −6.'; break;
      }
      p.rel = R.clamp(p.rel, 0, 100); City.clamp(Z); Game.save(); UI.close(); UI.toast(msg);
      if (act === 'intro' && p.known) City.sms(p.name, 'Miło było poznać! 🙂', p.id);
      return;
    }
    const opts = [];
    if (!p.known) opts.push(['intro', 'Przedstaw się']);
    else {
      if (p.talked !== City.stamp()) opts.push(['chat', 'Pogadaj']);
      if (inBar) opts.push(['beer', 'Postaw piwo (30 zł)']);
      if (p.type === 'mechanik' && p.rel >= 35 && p.favor !== s.week) opts.push(['engine', 'Pomożesz przy silniku przed meczem?']);
      if (p.type === 'dziennikarz' && p.rel >= 30 && p.favor !== s.week) opts.push(['interview', 'Udziel wywiadu']);
      if (p.type === 'biznes' && p.rel >= 50 && !C.deals.some(d => d.name.startsWith(p.name))) opts.push(['sponsor', 'Porozmawiajmy o sponsoringu']);
      if (p.type === 'zawodnik' && p.rel >= 25 && p.favor !== s.week) opts.push(['tips', 'Poproś o rady do jazdy']);
      if (p.type === 'dziewczyna' && p.rel >= 40 && !Z.gf) opts.push(['datego', 'Zaproś na randkę — „Może spróbujemy razem?”']);
      if (p.type === 'zawodnik' && p.rel < 20) opts.push(['fight', 'Wytknij mu ostatni faul']);
    }
    UI.modal(`<div class="row between"><span class="kicker">${esc(World.rooms[Walk.room] ? World.rooms[Walk.room].name : '')}</span><button class="x" data-ui="close">×</button></div>
      <h2>${esc(City.label(p))}</h2>${p.known ? `<p class="small">Znajomość: <b>${Math.round(p.rel)}%</b> ${UI.bar(p.rel, 100)}</p>` : `<p class="muted">${p.sex === 'f' ? 'Siedzi' : 'Stoi'} z ${Crowd.pick(['piwem', 'telefonem', 'kolegami', 'kawą'])}. Wygląda na ${City.TYPES[p.type].n === 'kibic' ? 'kibica — ma szalik' : 'kogoś, kto cię kojarzy'}.</p>`}
      <div class="talk-opts">${opts.map(([k, t]) => `<button class="opt" data-ui="cityTalk" data-v="${p.id}:${k}">${esc(t)}</button>`).join('') || '<p class="muted">Już dziś rozmawialiście.</p>'}</div>`);
  },
  stamp() { const Z = City.Z(); return Game.s.week * 10 + Z.day; },
  introLine(p) { return { kibic: '„Jeżdżę na każdy mecz, trzymam kciuki!”', kumpel: '„Ty jesteś ten od żużla? Byliśmy razem w szkole!”', mechanik: '„Robię przy motocyklach od 20 lat. Jakby co — dzwoń.”', dziennikarz: '„Piszę dla lokalnego portalu. Może wywiad?”', zawodnik: '„Widzimy się na torze, młody.”', biznes: '„Mam firmę transportową. Lubię sport.”', dziewczyna: '„Żużel? Nigdy nie byłam na meczu…”' }[p.type]; },
  chatLine(p) { return `${p.name.split(' ')[0]}: ` + Crowd.pick({ kibic: ['„W niedzielę cały sektor będzie za tobą!”', '„Ten wyjazd w trzecim biegu — petarda!”'], kumpel: ['„Pamiętasz, jak wagarowaliśmy na treningi?”', '„Kiedy piwo?”'], mechanik: ['„Nie dokręcaj za mocno świecy.”', '„Na mokrym daj mniejszą zębatkę.”'], dziennikarz: ['„Trener cię chwali, ale mówi, że brakuje ci startu.”', '„Sezon się rozkręca.”'], zawodnik: ['„Na waszym torze trzeba trzymać się krawężnika.”', '„Tylko nie hamuj w łuku.”'], biznes: ['„Szukam kogoś młodego do reklamy.”', '„Sport to dobra inwestycja.”'], dziewczyna: ['„Opowiedz, jak to jest jechać bez hamulców!”', '„Serio nie macie hamulców?”'] }[p.type]); },

  /* ---------- bar, darts, bilard, blackjack ---------- */
  MENU: {
    pub: [['beer', 'Piwo z nalewaka', 14, 'stres −6, alkohol +1'], ['beer0', 'Piwo bezalkoholowe', 12, 'stres −3'], ['water', 'Woda', 5, '—'], ['burger', 'Burger „Taśma”', 30, 'jedzenie +35 (ciężki)'], ['fries', 'Frytki', 15, 'jedzenie +15']],
    casino: [['beer', 'Piwo z nalewaka', 18, 'stres −6, alkohol +1'], ['whisky', 'Whisky', 40, 'stres −10, alkohol +2'], ['beer0', 'Piwo bezalkoholowe', 14, 'stres −3'], ['water', 'Woda', 6, '—']],
  },
  barMenu(kind) {
    const C = Career.C(), Z = City.Z();
    UI.modal(`<div class="row between"><span class="kicker">${kind === 'casino' ? 'Bar kasyna' : 'Lada „Pod Taśmą”'}</span><button class="x" data-ui="close">×</button></div><h2>Co podać?</h2>
      <p class="small muted">Masz ${C.money.toLocaleString('pl-PL')} zł · alkohol dziś: ${Z.drinksToday || 0}${(Z.drinksToday || 0) >= 3 ? ' — <span class="neg">wystarczy!</span>' : ''}</p>
      <div class="talk-opts">${City.MENU[kind].map(([k, n, p, d]) => `<button class="opt" data-ui="cityBuy" data-v="${kind}:${k}" ${C.money < p ? 'disabled' : ''}>${esc(n)} — ${p} zł<small>${esc(d)}</small></button>`).join('')}</div>`);
  },
  buy(kind, item) {
    const C = Career.C(), Z = City.Z(), it = City.MENU[kind].find(x => x[0] === item); if (!it || C.money < it[2]) return;
    Career.pay(-it[2], it[1]);
    let msg = `${it[1]}.`;
    if (item === 'beer' || item === 'whisky') {
      const n = item === 'whisky' ? 2 : 1; Z.drinksToday = (Z.drinksToday || 0) + n; C.drink = Math.min(3, (C.drink || 0) + (Z.drinksToday >= 3 ? 1 : 0)); Z.stress -= n === 2 ? 10 : 6;
      msg = n === 2 ? 'Whisky z lodem. Rozgrzewa.' : 'Zimne piwo z pianką. Stres −6.';
      if (Z.drinksToday >= 4) { Career.mor(-2); Z.energy -= 6; msg += ' Kręci ci się w głowie…'; if (Math.random() < 0.2) { Career.repd(-4); msg += ' Ktoś wrzucił filmik (reputacja −4).'; } }
    }
    if (item === 'beer0') Z.stress -= 3;
    if (item === 'burger') { Z.food += 35; Z.junk = 1; }
    if (item === 'fries') Z.food += 15;
    City.clamp(Z); Game.save(); UI.close(); UI.toast(msg);
  },
  darts() {
    const Z = City.Z(), r = Career.me(), skill = 30 + r.a.mental * 2 - Math.max(0, Z.stress - 50) * 0.6 - (C => (C.drink || 0) * 8)(Career.C());
    const throws = [0, 1, 2].map(() => { const v = Math.max(0, Math.round(skill * (0.4 + Math.random() * 1.1) / 3)); return Math.random() < 0.06 ? 50 : Math.min(60, v); }), sum = throws.reduce((a, b) => a + b, 0), rival = 45 + Math.floor(Math.random() * 60);
    const win = sum > rival; Z.stress += win ? -6 : 2; City.clamp(Z); Game.save();
    UI.modal(`<div class="row between"><span class="kicker">Darts</span><button class="x" data-ui="close">×</button></div><h2>${throws.join(' + ')} = ${sum}</h2><p>Stały bywalec rzucił <b>${rival}</b>. ${win ? '<span class="good">Wygrywasz kolejkę!</span>' : 'Przegrałeś — następnym razem.'}</p><div class="actions"><button class="go" data-ui="cityGame" data-v="darts">Jeszcze raz</button></div>`);
  },
  pool() {
    const Z = City.Z(), win = Math.random() < 0.45 + (Z.stress < 40 ? 0.1 : 0); Z.stress += win ? -7 : 1; City.clamp(Z); Game.save();
    UI.toast(win ? 'Bilard: wbijasz czarną bilę na koniec. Wygrana! Stres −7.' : 'Bilard: rywal czyści stół. Zabawa i tak była.');
  },
  /* blackjack */
  deck() { const d = []; ['♠', '♥', '♦', '♣'].forEach(s => ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].forEach(v => d.push(v + s))); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; },
  val(h) { let t = 0, a = 0; h.forEach(c => { const v = c.slice(0, -1); if (v === 'A') { t += 11; a++; } else t += ['J', 'Q', 'K'].includes(v) ? 10 : +v; }); while (t > 21 && a) { t -= 10; a--; } return t; },
  card(c, hide) { if (hide) return '<span class="pcard back">?</span>'; const red = /[♥♦]/.test(c); return `<span class="pcard ${red ? 'red' : ''}">${c}</span>`; },
  bjStart(bet) {
    const C = Career.C(); if (C.money < bet) { UI.toast('Za mało pieniędzy.', true); return; }
    Career.pay(-bet, 'Blackjack — stawka');
    const d = City.deck(); City.bj = { bet, deck: d, p: [d.pop(), d.pop()], k: [d.pop(), d.pop()], done: false };
    if (City.val(City.bj.p) === 21) return City.bjEnd();
    City.bjView();
  },
  bjView() {
    const B = City.bj, C = Career.C();
    if (!B) {
      const bets = [50, 200, 1000].filter(v => C.money >= v);
      UI.modal(`<div class="row between"><span class="kicker">Stół blackjacka</span><button class="x" data-ui="close">×</button></div><h2>Blackjack</h2><p class="muted small">Krupier: „Stawiamy?” · Masz ${C.money.toLocaleString('pl-PL')} zł</p><div class="actions">${bets.map(v => `<button class="go" data-ui="cityBj" data-v="bet:${v}">Stawka ${v} zł</button>`).join('') || '<p class="neg">Za mało pieniędzy.</p>'}</div>`);
      return;
    }
    UI.modal(`<div class="row between"><span class="kicker">Blackjack · stawka ${B.bet} zł</span><button class="x" data-ui="close">×</button></div>
      <div class="bj"><div><small>Krupier ${B.done ? '(' + City.val(B.k) + ')' : ''}</small><div>${B.k.map((c, i) => City.card(c, !B.done && i === 1)).join('')}</div></div>
      <div><small>Ty (${City.val(B.p)})</small><div>${B.p.map(c => City.card(c)).join('')}</div></div></div>
      ${B.done ? `<h2 class="${B.win > 0 ? 'good' : B.win < 0 ? 'neg' : ''}">${B.msg}</h2><div class="actions"><button class="go" data-ui="cityBj" data-v="again">Następne rozdanie</button><button class="ghost" data-ui="close">Odejdź od stołu</button></div>`
        : `<div class="actions"><button class="go" data-ui="cityBj" data-v="hit">Dobierz kartę</button><button class="ghost" data-ui="cityBj" data-v="stand">Pas</button>${B.p.length === 2 && C.money >= B.bet ? '<button class="ghost" data-ui="cityBj" data-v="double">Podwój</button>' : ''}</div>`}`);
  },
  bjAct(a) {
    const B = City.bj;
    if (a.startsWith('bet:')) return City.bjStart(+a.slice(4));
    if (a === 'again') { const bet = B ? B.bet : 50; City.bj = null; return Career.C().money >= bet ? City.bjStart(bet) : City.bjView(); }
    if (!B || B.done) return;
    if (a === 'hit') { B.p.push(B.deck.pop()); if (City.val(B.p) >= 21) return City.bjEnd(); return City.bjView(); }
    if (a === 'double') { Career.pay(-B.bet, 'Blackjack — podwojenie'); B.bet *= 2; B.p.push(B.deck.pop()); return City.bjEnd(); }
    if (a === 'stand') return City.bjEnd();
  },
  bjEnd() {
    const B = City.bj, Z = City.Z(), pv = City.val(B.p);
    B.done = true;
    const bj = pv === 21 && B.p.length === 2;
    if (pv <= 21 && !bj) while (City.val(B.k) < 17) B.k.push(B.deck.pop());
    const kv = City.val(B.k);
    let pay = 0;
    if (pv > 21) { B.msg = `Fura (${pv}) — przegrywasz ${B.bet} zł.`; B.win = -1; }
    else if (bj) { pay = Math.round(B.bet * 2.5); B.msg = `BLACKJACK! Wygrywasz ${pay - B.bet} zł.`; B.win = 1; }
    else if (kv > 21 || pv > kv) { pay = B.bet * 2; B.msg = `Wygrywasz ${B.bet} zł (krupier ${kv > 21 ? 'fura' : kv}).`; B.win = 1; }
    else if (pv === kv) { pay = B.bet; B.msg = 'Remis — stawka wraca.'; B.win = 0; }
    else { B.msg = `Krupier ma ${kv}. Przegrywasz ${B.bet} zł.`; B.win = -1; }
    if (pay) Career.pay(pay, 'Blackjack — wypłata');
    Z.casino.net += pay - B.bet; Z.casino.visits++; Z.stress += B.win > 0 ? -5 : B.win < 0 ? 5 + Math.round(B.bet / 500) : 0;
    City.clamp(Z); City.casinoRisk(Z); Game.save(); City.bjView();
  },

  /* ---------- telefon ---------- */
  sms(from, text, pid, invite) { const Z = City.Z(); (Z.sms = Z.sms || []).unshift({ from, text, pid, invite, t: City.stamp(), read: false }); Z.sms = Z.sms.slice(0, 30); if (document.getElementById('phone')) City.phoneRender(); },
  /** Wiadomości od znajomych na nowy dzień (zaproszenia do baru, kawiarni…) */
  daySms() {
    const Z = City.Z(), known = City.people().filter(p => p.known);
    if (Z.gf && Math.random() < 0.4) City.sms(Z.gf.name, Crowd.pick(['Tęsknię 😘 Kiedy się widzimy?', 'Powodzenia na treningu!', 'Kawa w parku po południu?', 'Oglądałam twój ostatni bieg ❤']), Z.gf.pid);
    if (known.length && Math.random() < 0.55) {
      const p = Crowd.pick(known), place = Crowd.pick(p.haunt.filter(h => City.ROOM[h] && h !== 'klub'));
      if (place) { City.sms(p.name, `${Crowd.pick(['Wpadniesz dziś', 'Będę dziś', 'Spotkamy się dziś'])} — ${City.PLACES[place].name}?`, p.id, place); Z.invite = { pid: p.id, place, day: Z.day }; }
    }
    if (Math.random() < 0.15) City.sms('Mama', Crowd.pick(['Jesz coś porządnego? 🙂', 'Zadzwoń czasem!', 'Tata ogląda każdy twój bieg.']), 'mama');
    Z.drinksToday = 0;
  },
  phoneToggle() {
    const el = document.getElementById('phone');
    if (el) { el.remove(); return; }
    if (Walk.locked && Walk.locked()) document.exitPointerLock();
    const d = document.createElement('div'); d.id = 'phone'; document.body.appendChild(d);
    City.app = City.app || 'home'; City.phoneRender();
  },
  phoneRender() {
    const el = document.getElementById('phone'); if (!el) return;
    const Z = City.Z(), C = Career.C(), s = Game.s, app = City.app || 'home', unread = (Z.sms || []).filter(m => !m.read).length;
    const contacts = [{ id: 'mama', name: 'Mama', sub: 'rodzina' }, { id: 'trener', name: 'Trener', sub: Game.club(s.user).short }].concat(Z.gf ? [{ id: 'gf', name: `${Z.gf.name} ❤`, sub: `związek ${Math.round(Z.gf.rel)}%` }] : [])
      .concat(City.people().filter(p => p.known).map(p => ({ id: p.id, name: p.name, sub: `${City.TYPES[p.type].n} · ${Math.round(p.rel)}%` })));
    let body = '';
    if (app === 'home') body = `<div class="ph-grid">${[['contacts', '👥', 'Kontakty'], ['sms', '💬', `Wiadomości${unread ? ` (${unread})` : ''}`], ['cal', '📅', 'Kalendarz'], ['taxi', '🚕', 'Taxi'], ['bank', '🏦', 'Bank'], ['status', '❤', 'Zdrowie']].map(([k, i, n]) => `<button data-ui="ph" data-v="app:${k}"><b>${i}</b><small>${n}</small></button>`).join('')}</div>`;
    if (app === 'contacts') body = `<ul class="ph-list">${contacts.map(c => `<li><div><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></div><button data-ui="ph" data-v="call:${c.id}">📞</button></li>`).join('')}</ul>${contacts.length <= 3 ? '<p class="ph-note">Poznawaj ludzi w barze, kasynie, kawiarni i na siłowni — trafią tutaj.</p>' : ''}`;
    if (app === 'sms') { (Z.sms || []).forEach(m => { m.read = true; }); body = `<ul class="ph-list sms">${(Z.sms || []).map(m => `<li><div><b>${esc(m.from)}</b><small>${esc(m.text)}</small></div>${m.invite && m.t === City.stamp() ? `<button data-ui="ph" data-v="go:${m.invite}">Idę</button>` : ''}</li>`).join('') || '<li class="ph-note">Brak wiadomości.</li>'}</ul>`; }
    if (app === 'cal') body = `<ul class="ph-list">${City.DAYS.map((d, i) => `<li class="${i === Z.day ? 'on' : ''}"><div><b>${d}</b><small>${i < Z.day ? 'minął' : i === Z.day ? `dziś · ${City.SLOTS[Math.min(2, Z.slot)]}` : '—'}</small></div></li>`).join('')}<li><div><b>Niedziela</b><small>${Game.userFixture() ? (() => { const f = Game.userFixture(); return `MECZ: ${Game.club(f.h).short} – ${Game.club(f.a).short}`; })() : 'bez meczu'}</small></div></li></ul>`;
    if (app === 'taxi') body = `<ul class="ph-list">${Object.entries(City.PLACES).map(([k, p]) => `<li><div><b>${p.icon} ${esc(p.name)}</b></div><button data-ui="ph" data-v="go:${k}">Jedź</button></li>`).join('')}</ul>`;
    if (app === 'bank') body = `<div class="ph-bank"><small>Saldo</small><b>${C.money.toLocaleString('pl-PL')} zł</b></div><ul class="ph-list">${(C.ledger || []).slice(0, 8).map(l => `<li><div><small>${esc(l.what)}</small></div><b class="${l.v < 0 ? 'neg' : 'good'}">${l.v.toLocaleString('pl-PL')}</b></li>`).join('')}</ul>`;
    if (app === 'status') body = `<div class="ph-stat">${[['Energia', Z.energy], ['Jedzenie', Z.food], ['Stres', Z.stress]].map(([n, v]) => `<div><small>${n}</small>${UI.bar(v, 100, (n === 'Stres' ? v > 60 : v < 30) ? 'bad' : '')}<b>${Math.round(v)}</b></div>`).join('')}<p>${City.modsHtml()}</p></div>`;
    if (app.startsWith('call:')) {
      const id = app.slice(5), c = contacts.find(x => x.id === id) || { name: '?' };
      const opts = id === 'mama' ? [['mama', 'Pogadaj z mamą']] : id === 'trener' ? [['coach', 'Zapytaj o skład']] : id === 'gf' ? [['gfchat', 'Porozmawiaj'], ['gfdate', 'Umów randkę w kawiarni']] : [['chat', 'Pogadaj'], ['bar', 'Zaproś do baru „Pod Taśmą”'], ['cafe', 'Zaproś na kawę']];
      body = `<div class="ph-call"><div class="ph-av">${esc(c.name[0])}</div><b>${esc(c.name)}</b><small>${esc(c.sub || '')}</small>${opts.map(([k, t]) => `<button data-ui="ph" data-v="do:${id}:${k}">${esc(t)}</button>`).join('')}</div>`;
    }
    const time = Z.day > 5 ? 'Nd' : `${City.DAYS[Z.day].slice(0, 3)} · ${City.timeStr ? City.timeStr() : ['09:00', '15:00', '20:00'][Math.min(2, Z.slot)]}`;
    el.innerHTML = `<div class="ph-frame"><div class="ph-top"><span>${time}</span><span>📶 🔋${Math.round(Z.energy)}%</span></div>
      <div class="ph-title">${app === 'home' ? esc(Career.me().name) : `<button data-ui="ph" data-v="app:home">‹</button> ${{ contacts: 'Kontakty', sms: 'Wiadomości', cal: 'Kalendarz', taxi: 'Taxi', bank: 'Bank', status: 'Zdrowie' }[app] || 'Połączenie'}`}</div>
      <div class="ph-body">${body}</div><button class="ph-home" data-ui="ph" data-v="close">Zamknij (P)</button></div>`;
  },
  phoneDo(v) {
    const Z = City.Z(), C = Career.C(), s = Game.s;
    if (v === 'close') { City.phoneToggle(); return; }
    if (v.startsWith('app:')) { City.app = v.slice(4); City.phoneRender(); return; }
    if (v.startsWith('call:')) { City.app = v; City.phoneRender(); return; }
    if (v.startsWith('go:')) { const place = v.slice(3); City.phoneToggle(); if (Walk.active) Walk.stop(); UI.show('mgr'); City.enter(place); return; }
    if (v.startsWith('do:')) {
      const [, id, k] = v.split(':'), p = City.person(id); let msg = '';
      if (k === 'mama') { if (Z.mamaCall === s.week) msg = 'Mama: „Dzwoniłeś już, synku, idź trenować!”'; else { Z.mamaCall = s.week; Z.stress -= 8; Career.mor(3); msg = 'Mama: „Jesz porządnie? Tata ogląda każdy twój bieg.” Stres −8.'; } }
      if (k === 'coach') msg = Career.inLineup() ? 'Trener: „Jesteś w składzie. Wyśpij się przed niedzielą.”' : 'Trener: „Na razie poza składem. Pokaż coś na treningu.”';
      if (k === 'gfchat' && Z.gf) { if (Z.gf.call === City.stamp()) msg = `${Z.gf.name}: „Już rozmawialiśmy, wariacie 😄”`; else { Z.gf.call = City.stamp(); Z.gf.rel += 4; Z.stress -= 5; msg = `${Z.gf.name}: „${Crowd.pick(['Opowiadaj, jak trening?', 'Tęsknię!', 'Przyjdziesz w weekend?'])}” Związek +4.`; } }
      if ((k === 'gfchat' || k === 'gfdate') && !Z.gf) { UI.toast('Ta rozmowa już nie jest możliwa — nie jesteście parą.', true); City.app = 'contacts'; City.phoneRender(); return; }
      if (k === 'gfdate') { const name = Z.gf.name; City.phoneToggle(); if (Walk.active) Walk.stop(); UI.show('mgr'); City.enter('park'); UI.toast(`${name} czeka w kawiarni — podejdź do stolika.`); return; }
      if (p && k === 'chat') { if (p.called === City.stamp()) msg = `${p.name.split(' ')[0]} nie odbiera.`; else { p.called = City.stamp(); p.rel = Math.min(100, p.rel + 4); Z.stress -= 3; msg = City.chatLine(p); } }
      if (p && (k === 'bar' || k === 'cafe')) { const place = k === 'bar' ? 'bar' : 'park'; if (Math.random() < 0.35 + p.rel / 150) { Z.invite = { pid: p.id, place, day: Z.day }; p.rel += 3; msg = `${p.name.split(' ')[0]}: „Jasne, będę!” (${City.PLACES[place].name}, dziś)`; } else msg = `${p.name.split(' ')[0]}: „Dziś nie dam rady, może jutro.”`; }
      City.clamp(Z); Game.save(); UI.toast(msg); City.app = 'contacts'; City.phoneRender();
    }
  },
});

/* ---------- podpięcie do reszty gry ---------- */
(() => {
  // zajęcia z wnętrz i akcje miasta w karierze
  const baseRoomAct = Career.roomAct;
  Career.roomAct = function (id) {
    if (id.startsWith('c:')) { const [, place, act] = id.split(':'); City.act(place, act); return true; }
    if (id.startsWith('n:')) { City.talk(id.slice(2)); return true; }
    if (id.startsWith('v:')) {
      const k = id.slice(2);
      if (k === 'barCasino') City.barMenu('casino'); else if (k === 'barPub') City.barMenu('pub'); else if (k === 'darts') City.darts(); else if (k === 'pool') City.pool(); else if (k === 'blackjack') { City.bj = null; City.bjView(); }
      return true;
    }
    if (id === 'pitride') { City.act('tor', 'ride'); return true; }
    if (id === 'track') { City.act('tor', 'train'); return true; }
    if (id === 'r:mechanic' || id === 'workshopTalk') { City.act('tor', 'engine'); return true; }
    if (['ticket', 'shop', 'parking', 'site', 'academy', 'r:desk', 'r:president', 'r:trophies', 'r:league', 'r:meeting', 'r:trainer', 'r:equip', 'r:doctor', 'r:bikes', 'r:tvprog', 'r:scout', 'board'].includes(id)) { UI.toast('To sprawy klubu — ty jesteś zawodnikiem. Skup się na jeździe!'); return true; }
    return baseRoomAct.call(this, id);
  };
  // kliknięcia: telefon, rozmowy, zakupy, gry
  const baseClick = City.click;
  City.click = function (d) {
    switch (d.ui) {
      case 'cityEnter': City.enter(d.v); return true;
      case 'cityPhone': City.phoneToggle(); return true;
      case 'ph': City.phoneDo(d.v); return true;
      case 'cityTalk': { const [pid, act] = d.v.split(':'); City.talk(pid, act); return true; }
      case 'cityBuy': { const [k, it] = d.v.split(':'); City.buy(k, it); return true; }
      case 'cityBj': City.bjAct(d.v); return true;
      case 'cityGame': if (d.v === 'darts') City.darts(); return true;
    }
    return baseClick.call(this, d);
  };
  // nowy dzień → wiadomości
  const baseEnd = City.endDay;
  City.endDay = function (auto) { const d0 = City.Z().day; baseEnd.call(this, auto); if (City.Z().day !== d0 && City.Z().day <= 5) City.daySms(); };
  // w pokojach miasta: ludzie, a w siłowni i klubie — zajęcia kariery
  const baseEnter = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    baseEnter.call(this, key);
    if (!Game.s || Game.s.mode !== 'career') return;
    const R = World.rooms[key];
    if (City.CAREER_SPOTS[key]) Walk.spots = Walk.spots.filter(s => s.id === 'r:exit').concat(City.CAREER_SPOTS[key].map(s => ({ ...s, x: R.cx + s.x, r: 1.5 })));
    if (R && R.place && !Humans.ready) Humans.load(() => { if (Walk.room !== key) return; const keep = [Walk.x, Walk.z, Walk.yaw, Walk.pitch]; Walk.enterRoom(key); [Walk.x, Walk.z, Walk.yaw, Walk.pitch] = keep; });
    if (R && R.place) {
      City.spawnPeople(key);
      if (key === 'cafe' && City.Z().gf && Humans.ready) { // dziewczyna czeka przy stoliku
        const gp = City.Z().gf.pid && City.person(City.Z().gf.pid), m = Humans.make(City.gfKey ? City.gfKey() : (gp ? gp.key : 'Female_Adult_04'), 'sit', { sex: 'f' });
        if (m) { m.position.set(R.cx + 2.2, World.LOCKER_Y, 2.2); m.rotation.y = Math.PI / 2; Rooms.add(m); const t = World.nameTag('❤ ' + City.Z().gf.name, '#d0508a'); t.position.set(R.cx + 2.2, World.LOCKER_Y + 1.8, 2.2); t.scale.set(2.2, 0.55, 1); Rooms.add(t); }
      }
    }
  };
  // kręcące się koło ruletki
  const baseTick = Rooms.tick;
  Rooms.tick = function (dt) { baseTick.call(this, dt); if (World.rouletteWheel && Walk.room === 'casino') { World.rouletteWheel.rotation.y += dt * (0.5 + (World.rouletteSpin || 0)); World.rouletteSpin = (World.rouletteSpin || 0) * Math.pow(0.4, dt); } };
  const baseSpin = City.spin;
  City.spin = function (kind) { World.rouletteSpin = 14; return baseSpin.call(this, kind); };
})();
