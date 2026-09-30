/* =========================================================
   Speedway Empire 3D — świat 3D (Three.js r128)
   Nocny stadion: niebo z gwiazdami, jupitery ze snopami światła
   i cieniami, tor z nawierzchnią i „ścieżkami” wyjeżdżanymi przez
   zawodników, dmuchane bandy z reklamami, trybuny z kibicami,
   telebim, maszyna startowa. Motocykle ze szprychami, ramą z rurek,
   wydechem i zawodnikiem, który w łuku wysuwa lewą nogę (iskry
   spod stalowego buta). Tylko wyświetla stan z Sim.
   v0.5: kolory w przestrzeni sRGB + mapowanie tonów ACES, mapa odbić
   nocnego stadionu (chrom, kaski, mokry tor), poświata lamp (bloom),
   wygładzanie krawędzi, kibice z crowd.js, ludzie przy torze.
   ========================================================= */
'use strict';

const World = {
  renderer: null, scene: null, camera: null,
  bikes: {}, crowd: null, crowdBase: [], tape: null,
  cam: { mode: 'tv', pos: new THREE.Vector3(0, 30, 90), look: new THREE.Vector3() },
  CAMS: { tv: 'TV', chase: 'Za motocyklem', fence: 'Zza bandy', track: 'Przy torze', drone: 'Dron', helmet: 'Kask', stand: 'Z trybun' },

  /* ---------- tekstury z canvasu ---------- */
  canvasTex(w, hh, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    const t = new THREE.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 8;
    t.encoding = THREE.sRGBEncoding;
    t.canvas = c;
    return t;
  },

  /**
   * Nawierzchnia: czarny żużel (granit/łupek). Tekstura w poprzek toru ma trzy strefy:
   * ubita, błyszcząca „ścieżka” przy krawężniku, środek i luźny, szarawy materiał
   * zepchnięty pod bandę. Ziarno: drobne szare i grafitowe kamyczki.
   */
  shaleTex() {
    // czarny żużel: prawie jednolita czerń, ledwie jaśniejszy luźny materiał przy bandzie, drobne ziarno granitu
    return World.canvasTex(1024, 512, (g, w, hh) => {
      const grd = g.createLinearGradient(0, 0, 0, hh);
      grd.addColorStop(0, '#0d0d0d'); grd.addColorStop(0.5, '#101010'); grd.addColorStop(0.85, '#141312'); grd.addColorStop(1, '#171615');
      g.fillStyle = grd; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 70000; i++) { const v = 10 + Math.random() * 26; g.fillStyle = `rgba(${v},${v},${v * 0.97},${0.35 + Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * hh, 1 + Math.random() * 1.4, 1 + Math.random() * 1.4); }
      for (let i = 0; i < 1800; i++) { const v = 45 + Math.random() * 40; g.fillStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.2})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * hh, 0.5 + Math.random(), 0, 7); g.fill(); }
    }, [40, 1]);
  },

  grassTex(label) {
    return World.canvasTex(1024, 512, (g, w, hh) => {
      g.clearRect(0, 0, w, hh);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(0,20,0,.22)' : 'rgba(255,255,230,.05)'; g.fillRect(i * w / 16, 0, w / 16, hh); } // pasy koszenia
      g.save(); g.translate(w / 2, hh / 2);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'center';
      g.font = 'bold 78px "Saira Stencil One", Impact, sans-serif'; g.fillText(label, 0, 10);
      g.font = '34px "Barlow", sans-serif'; g.fillText('STADION IM. KIBICÓW · TOR 345 M', 0, 66);
      g.restore();
    });
  },

  boardTex(sp) {
    return World.canvasTex(512, 96, (g, w, hh) => {
      g.fillStyle = sp.bg; g.fillRect(0, 0, w, hh);
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      g.fillStyle = sp.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 50px "Saira Stencil One", Impact, sans-serif'; g.fillText(sp.text, w / 2, hh / 2);
    });
  },

  plateTex(no, bg = '#fff', fg = '#111') {
    return World.canvasTex(64, 64, g => {
      g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 42px Barlow, sans-serif'; g.fillText(String(no), 32, 35);
    });
  },

  nameTag(text, color) {
    const t = World.canvasTex(256, 64, g => {
      g.fillStyle = 'rgba(8,8,10,.82)'; g.fillRect(0, 10, 256, 44);
      g.fillStyle = color; g.fillRect(0, 10, 10, 44);
      g.fillStyle = '#fff'; g.font = 'bold 27px Barlow, sans-serif'; g.textBaseline = 'middle'; g.fillText(text, 20, 33);
    });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(4, 1, 1); s.renderOrder = 10;
    return s;
  },

  /* ---------- inicjalizacja ---------- */
  ensure() { if (!World.renderer) World.init(document.querySelector('#gl')); World.resize(); },

  idle(dt) {
    const t = performance.now() / 1000;
    if (Math.random() < dt / 20) Crowd.wave(t); // co jakiś czas fala na trybunie
    Crowd.update(t, dt, 0.15);
    World.waveFlags(t);
    World.idleT = (World.idleT || 0) + dt * 0.07;
    const k = World.idleT;
    World.camera.position.set(Math.cos(k) * 105, 38, Math.sin(k) * 80);
    World.camera.lookAt(0, 0, 0);
  },

  init(canvas) {
    const R = World.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.outputEncoding = THREE.sRGBEncoding;
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.25;
    const S = World.scene = new THREE.Scene();
    S.fog = new THREE.Fog(0x0b0e18, 160, 520);
    World.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1500);

    S.add(new THREE.HemisphereLight(0x9fb0d8, 0x2a1d14, 0.55));
    // „księżyc” jupiterów: jedno światło kierunkowe rzuca cienie na tor
    const key = World.key = new THREE.DirectionalLight(0xfff1d6, 0.95);
    key.position.set(-50, 110, 70);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -115, right: 115, top: 80, bottom: -80, near: 10, far: 320 });
    key.shadow.bias = -0.0006;
    S.add(key);
    S.add(key.target);

    World.buildSky();
    World.buildGround();
    World.buildParticles();
    RiderModel.load(() => Object.values(World.bikes || {}).forEach(b => RiderModel.attach(b)));
    World.linearize(S);
    World.useVenue(World.wantVenue || 0, World.wantFac);
    // modele aut i budynków dochodzą w tle; po wczytaniu stadion buduje się jeszcze raz już z nimi
    Props.load(() => { if (World.venueGroup) { World.venueKey = null; World.useVenue(World.venueIdx, World.fac, World.look); } });
    // realistyczni ludzie: podmieniamy obsługę toru na miejscu (bez przebudowy całego stadionu)
    Humans.load(() => (Crowd.swapped || []).forEach(({ g, o }) => { if (!g.userData.swapHuman) People.swapPerson(g, o); }));
    World.buildEnv();
    World.buildComposer();
    World.resize();
  },

  /**
   * Stadion klubu: tor o innej długości i promieniu, własne trybuny, maszty, otoczenie,
   * a wokół — parking, budynek klubowy, warsztat i obiekty zależne od rozbudowy.
   * Wszystko, co zależy od stadionu, siedzi w jednej grupie i jest budowane od nowa przy zmianie.
   */
  enterVenue(clubId) {
    const idx = +String(clubId).slice(1) || 0, fac = Club.facFor(clubId), c = Game.club(clubId);
    const look = { ...(Club.lookFor ? Club.lookFor(clubId) : {}), kevlar: c && c.kevlar, trim: c && c.trim };
    // trwająca inwestycja gospodarza — plac budowy na mapie (klucz stadionu się zmienia, więc widać postęp co tydzień)
    if (Game.s && clubId === Game.s.user && Game.s.club && Game.s.club.build) look.build = { ...Game.s.club.build };
    World.wantVenue = idx; World.wantFac = fac; World.wantLook = look;
    World.ensure();
    World.useVenue(idx, fac, look);
  },

  /**
   * Stadion „efektywny”: projekt bazowy + poziomy rozbudowy + ustawienia z edytora stadionu.
   * Trybuny ≥3: dach nad główną i trybuna naprzeciwko; ≥4: dach nad nią i nasypy na pustych łukach;
   * ≥5: łuki z krzesełkami. Oświetlenie: więcej masztów i mocniejsze lampy.
   */
  effVenue(V, fac, look) {
    const s = fac.stands || 1, l = fac.lights || 1, E = JSON.parse(JSON.stringify(V));
    E.main.roof = look.roofMain != null ? look.roofMain : (V.main.roof || s >= 3);
    if (look.back === 'none') E.back = null;
    else if (!E.back && (s >= 3 || look.back === 'stand')) E.back = { len: Math.round(V.main.len * 0.75), rows: 5 + s, roof: false };
    else if (E.back) E.back.rows += Math.max(0, s - 2);
    if (E.back) E.back.roof = look.roofBack != null ? look.roofBack : (E.back.roof || s >= 4);
    E.bends = [0, 1].map(i => (look.bends && look.bends[i]) || (s >= 5 && V.bends[i] === 'bank' ? 'terrace' : s >= 4 && V.bends[i] === 'none' ? 'bank' : V.bends[i]));
    E.masts = Math.min(8, V.masts + Math.max(0, l - 2) * 2); E.lightK = 0.8 + l * 0.1;
    E.seats = look.seats || 'club'; E.fence = look.fence || 'classic'; E.facade = look.facade || 'concrete';
    E.kevlar = look.kevlar || '#D9541F'; E.trim = look.trim || '#EDEDED';
    return E;
  },

  useVenue(idx, fac, look = World.wantLook || {}) {
    const key = idx + ':' + JSON.stringify(fac || {}) + JSON.stringify(look);
    if (World.venueKey === key) return false;
    World.look = look;
    const V = World.V = World.effVenue(DATA.VENUES[idx] || DATA.VENUES[0], fac || { stands: 2, lights: 2 }, look);
    World.venueKey = key; World.venueIdx = idx; World.fac = fac || { stands: 2, lights: 2, pits: 2, parking: 2, shop: 1, academy: 1, gym: 1, medic: 1 };
    Track.set(V.straight, V.R);
    const real = World.realScene || (World.realScene = World.scene);
    if (World.venueGroup) { real.remove(World.venueGroup); World.disposeTree(World.venueGroup); }
    (World.flareLights || []).forEach(l => real.remove(l)); World.flareLights = null;
    const G = World.venueGroup = new THREE.Group();
    real.add(G);
    World.scene = G; World.venue = null; Crowd.standing = []; Crowd.swapped = []; World.hotspots = []; World.colliders = []; World.mapItems = []; World.bounds = null; World.mapKey = (World.mapKey || 0) + 1;
    try {
      World.buildInfield(); World.buildTrack(); World.buildFence(); World.buildStands(); World.buildLights();
      World.buildGate(); World.buildScreen(); World.buildPits(); World.buildFlags(); World.buildSurroundings();
      World.buildGrounds(); World.buildStaff(); World.flushWindows(); World.buildLocker(); World.buildRooms();
    } finally { World.scene = real; }
    World.linearize(G);
    // po przebudowie (np. gdy doszły modele) przywróć barwy, frekwencję, bandy i flagi gospodarza
    const L = World._last || {}; World._last = {};
    ['setVenue', 'setFlagColors', 'setTeams', 'setStadium'].forEach(k => { if (L[k]) World[k](...L[k]); });
    // jeśli ktoś właśnie stoi w pokoju (szatnia, dom, klub) — wypełnij go ponownie w nowej grupie
    if (typeof Walk !== 'undefined' && Walk.active && !Walk.room) World.outdoorProps();
    if (typeof Walk !== 'undefined' && Walk.active && Walk.room) { const k = [Walk.x, Walk.z, Walk.yaw, Walk.pitch], room = Walk.room; Walk.room = null; Walk.enterRoom(room); [Walk.x, Walk.z, Walk.yaw, Walk.pitch] = k; }
    return true;
  },

  memo(k, args) { (World._last = World._last || {})[k] = Array.from(args); },

  disposeTree(root) {
    root.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach(m => { if (m === People._mat || m === RiderModel._mat || m.userData.shared) return; if (m.map) m.map.dispose(); m.dispose(); });
    });
  },

  /** Kolory materiałów podane w sRGB (#hex) → przestrzeń liniowa renderera */
  linearize(root) {
    root.traverse(o => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach(m => {
        if (m.userData.lin) return;
        if (m.color) m.color.convertSRGBToLinear();
        if (m.emissive) m.emissive.convertSRGBToLinear();
        m.userData.lin = true;
      });
    });
  },

  /** Mapa odbić: ciemne nocne niebo, jasne panele jupiterów, ceglasta poświata toru */
  buildEnv() {
    const pm = new THREE.PMREMGenerator(World.renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.016, 0.035), side: THREE.BackSide })));
    const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 8.4, 7.2) });
    [[-72, -74], [0, -78], [72, -74], [-72, 78], [0, 82], [72, 78]].forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), lamp);
      const dir = new THREE.Vector3(x, 30, z).normalize().multiplyScalar(40);
      m.position.copy(dir); m.lookAt(0, 0, 0); env.add(m);
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.07, 0.03) }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -6; env.add(ground);
    World.scene.environment = pm.fromScene(env, 0.035).texture;
  },

  /** Efekty końcowe: poświata lamp + korekcja gamma, z wygładzaniem MSAA (WebGL2) */
  buildComposer() {
    if (!THREE.EffectComposer || !THREE.UnrealBloomPass) return;
    const R = World.renderer, size = R.getSize(new THREE.Vector2()), dpr = R.getPixelRatio();
    let rt;
    if (R.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) {
      rt = new THREE.WebGLMultisampleRenderTarget(Math.max(1, size.x * dpr), Math.max(1, size.y * dpr), { format: THREE.RGBAFormat });
      rt.samples = 4;
    }
    const C = World.composer = new THREE.EffectComposer(R, rt);
    C.addPass(new THREE.RenderPass(World.scene, World.camera));
    World.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.55, 0.88);
    C.addPass(World.bloom);
    if (THREE.GammaCorrectionShader) C.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
  },

  resize() {
    const c = World.renderer.domElement;
    const w = c.clientWidth || window.innerWidth, hh = c.clientHeight || window.innerHeight;
    World.renderer.setSize(w, hh, false);
    World.camera.aspect = w / hh;
    World.camera.updateProjectionMatrix();
    if (World.composer) { World.composer.setSize(w, hh); if (World.bloom) World.bloom.setSize(w, hh); }
  },

  buildSky() {
    const tex = World.canvasTex(16, 512, (g, w, hh) => {
      const gr = g.createLinearGradient(0, 0, 0, hh);
      gr.addColorStop(0, '#04050c'); gr.addColorStop(0.55, '#0b1024'); gr.addColorStop(0.78, '#1c2038'); gr.addColorStop(1, '#3a2c2a');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
    World.scene.add(sky);
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * 1.2;
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * 650; pos[i * 3 + 1] = Math.cos(ph) * 650 + 40; pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 650;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    World.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, fog: false, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
  },

  buildGround() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1200, 900), new THREE.MeshStandardMaterial({ color: 0x151a11, roughness: 1 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -0.05; g.receiveShadow = true;
    World.scene.add(g);
  },

  /** Murawa wewnątrz toru z nazwą klubu */
  buildInfield() {
    const inner = Track.R - Track.HALF - 0.6, S2 = Track.STRAIGHT / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-S2, -inner); shape.lineTo(S2, -inner);
    shape.absarc(S2, 0, inner, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-S2, inner);
    shape.absarc(-S2, 0, inner, Math.PI / 2, Math.PI * 1.5, false);
    const geo = new THREE.ShapeGeometry(shape, 32);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + S2 + inner) / (2 * (S2 + inner)), (pos.getY(i) + inner) / (2 * inner));
    const base = new THREE.Mesh(geo, World.pbr('leafy_grass', (S2 + inner) / 1.6, inner / 1.6, { color: '#8fb07c' }));
    base.rotation.x = -Math.PI / 2; base.position.y = 0.01; base.receiveShadow = true;
    World.scene.add(base);
    // UV bazy: powtórzenia tekstury trawy (pbr ustawia repeat), warstwa z napisem używa tych samych UV 0..1
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: World.grassTex(''), roughness: 0.95, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.receiveShadow = true;
    World.grass = m;
    World.scene.add(m);
  },

  setVenue(name, color, trim, short) {
    World.memo('setVenue', arguments);
    if (color && World.seatMat) World.seatMat.color.set(color).convertSRGBToLinear().multiplyScalar(0.75);
    if (color) World.paintSeats(color, trim || '#eeeeee', short);
    if (World.venue === name) return;
    World.venue = name;
    World.grass.material.map = World.grassTex(name.toUpperCase());
    World.grass.material.needsUpdate = true;
  },

  ribbon(d0, d1, y, n = 520) {
    const pos = [], uv = [], nrm = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n * Track.L;
      const a = Track.pos(s, d0), b = Track.pos(s, d1);
      pos.push(a.x, y, a.z, b.x, y, b.z);
      uv.push(s / Track.L, 0, s / Track.L, 1);
      nrm.push(0, 1, 0, 0, 1, 0);
      if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  },

  TRACK_OUT: Track.HALF + 2.2,

  buildTrack() {
    const H = Track.HALF;
    const shale = World.shaleTex();
    World.trackMat = new THREE.MeshStandardMaterial({ map: shale, color: World.V.tint, bumpMap: shale, bumpScale: 0.06, roughness: 0.9, envMapIntensity: 0.5, side: THREE.DoubleSide });
    World.trackPhoto(World.trackMat);
    // czarny żużel: ciemny i lekko chłodny kolor bazowy — ciepłe jupitery nie robią z niego brązu
    World.trackTint = new THREE.Color(0.3, 0.3, 0.34).multiply(new THREE.Color(World.V.tint).convertSRGBToLinear());
    World.trackMat.color.copy(World.trackTint);
    const track = new THREE.Mesh(World.ribbon(-H, World.TRACK_OUT, 0.02), World.trackMat);
    track.receiveShadow = true;
    World.scene.add(track);
    // „ścieżki”: canvas, na którym koła zawodników wyjeżdżają ciemniejsze linie; równanie toru je zaciera
    World.marks = World.canvasTex(4096, 128, g => { g.clearRect(0, 0, 4096, 128); });
    World.marks.wrapS = THREE.RepeatWrapping;
    const mm = new THREE.Mesh(World.ribbon(-H, World.TRACK_OUT, 0.03), new THREE.MeshStandardMaterial({ map: World.marks, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1 })); mm.receiveShadow = true;
    World.scene.add(mm);
    // luźna nawierzchnia przy bandzie
    // (dawny jasny pas luźnej nawierzchni przy bandzie usunięty — tor ma być czarny)
    // krawężnik: biało-czerwone segmenty
    World.scene.add(new THREE.Mesh(World.ribbon(-H - 0.5, -H, 0.07), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6, side: THREE.DoubleSide })));
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2 * H + 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.045, Track.R + 1.1);
    World.scene.add(line);
  },

  /** Obrazek z models/tex (cache, Promise) */
  img(id, f) {
    const k = id + '/' + f; World._img = World._img || {};
    return World._img[k] || (World._img[k] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `models/tex/${id}/${f}.jpg`; }));
  },
  /**
   * Nawierzchnia toru ze zdjęcia (Poly Haven „raked_dirt”, CC0): odbarwione i przyciemnione ziarno
   * nałożone na gradient żużla (ciemna ścieżka przy krawężniku, jaśniejszy luźny materiał przy bandzie),
   * do tego mapa normalnych i szorstkości. Jedna klatka tekstury = 1/40 okrążenia × cała szerokość toru.
   */
  trackPhoto(mat) {
    const done = World._trackTex;
    const apply = T => { if (!T) return; mat.map = T.map; mat.normalMap = T.nor; mat.roughnessMap = T.rough; mat.bumpMap = null; mat.normalScale.set(0.7, 0.7); mat.roughness = 1; mat.needsUpdate = true; };
    if (done) { apply(done); return; }
    Promise.all(['diff', 'nor', 'rough'].map(f => World.img('raked_dirt', f))).then(([dI, nI, rI]) => {
      if (!dI || !nI) return;
      // całkowita liczba kafli w klatce → brak szwów przy powtarzaniu (wcześniej ucięte kafle dawały „błędy tekstury”)
      const W = 2048, H = 1024, nx = Math.max(1, Math.round((Track.L / 40) / 2.2)), ny = Math.max(1, Math.round((World.TRACK_OUT + Track.HALF) / 2.2)), tw = W / nx, th = H / ny;
      const tile = (g, im) => { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g.drawImage(im, i * tw, j * th, tw, th); };
      const mk = draw => { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(40, 1); t.anisotropy = 8; return t; };
      const map = mk(g => {
        g.drawImage(World.shaleTex().image, 0, 0, W, H);
        const ph = document.createElement('canvas'); ph.width = W; ph.height = H; const pg = ph.getContext('2d'); tile(pg, dI);
        pg.globalCompositeOperation = 'saturation'; pg.fillStyle = '#808080'; pg.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.drawImage(ph, 0, 0);
        g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.07; g.drawImage(ph, 0, 0); // ledwie widoczne ziarna granitu
      });
      map.encoding = THREE.sRGBEncoding;
      const nor = mk(g => tile(g, nI)), rough = rI ? mk(g => tile(g, rI)) : null;
      World._trackTex = { map, nor, rough };
      [map, nor].concat(rough ? [rough] : []).forEach(t => { t.userData = t.userData || {}; });
      [map, nor, rough].forEach(t => { if (t) { t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16; } });
      apply(World._trackTex);
    });
  },

  /** Ślad koła na canvasie ścieżek (u = pozycja na okrążeniu, v = odległość od krawężnika) */
  markAt(s, d, alpha, bend) {
    const c = World.marks.canvas, g = c.getContext('2d');
    const u = (((s % Track.L) + Track.L) % Track.L) / Track.L * c.width;
    const vOf = dd => (1 - (dd + Track.HALF) / (World.TRACK_OUT + Track.HALF)) * c.height; // góra płótna = zewnętrzna krawędź
    const v = vOf(d);
    // koleina: rozorany, jaśniejszy granit na czarnym torze
    g.fillStyle = `rgba(118,112,104,${Math.min(0.55, alpha * 5)})`; g.fillRect(u - 3, v - 1.2, 6, 2.4);
    g.fillStyle = `rgba(4,4,4,${Math.min(0.5, alpha * 2)})`; g.fillRect(u - 3, v - 0.4, 6, 0.8);
    // w łuku koło wyrzuca materiał na zewnątrz — rośnie wał luźnej nawierzchni
    if (bend && Math.random() < 0.5) { const vv = vOf(Math.min(World.TRACK_OUT - 0.4, d + 1.2 + Math.random() * 2.2)); g.fillStyle = `rgba(70,66,60,${alpha * 1.6})`; g.fillRect(u - 4, vv - 1.5, 8, 3); }
  },
  /** Brud na dmuchanych bandach w łukach (rośnie z każdym biegiem, czyszczony na nowy mecz) */
  dirtFence(add) {
    World.dirt = Math.max(0, Math.min(0.92, (add == null ? 0 : (World.dirt || 0) + add)));
    if (World.dirtMat) World.dirtMat.opacity = World.dirt;
  },
  gradeMarks(keep = 0.25) {
    const c = World.marks.canvas, g = c.getContext('2d');
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = `rgba(0,0,0,${1 - keep})`; g.fillRect(0, 0, c.width, c.height); g.restore();
    World.marks.needsUpdate = true;
  },
  clearMarks() { World.gradeMarks(0); World.dirtFence(null); },

  /**
   * Bandy: na prostych deski z reklamami na stalowych słupkach, w łukach dmuchane bandy
   * bezpieczeństwa (czerwono-białe poduchy z reklamą), za nimi wysoka siatka ochronna
   * dla kibiców. W drugim łuku brama do parku maszyn.
   */
  buildFence() {
    const mats = DATA.SPONSORS.map(sp => new THREE.MeshStandardMaterial({ map: World.boardTex(sp), roughness: 0.45 }));
    World.boardMats = mats; World.boardDefault = mats.map(m => m.map);
    const white = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 0.32, envMapIntensity: 0.8 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc8261e, roughness: 0.34, envMapIntensity: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.45, metalness: 0.6 });
    const H = Track.HALF, n = Math.floor(Track.L / 2.7), gateS = Track.B2 + Math.PI * Track.R / 2;
    // deska: front z reklamą, tył biały; poducha: korpus + zaokrąglona góra + wybrzuszony front z reklamą
    const board = new THREE.BoxGeometry(2.66, 1.1, 0.1);
    const pillow = new THREE.BoxGeometry(2.62, 1.05, 0.95);
    const top = new THREE.CylinderGeometry(0.48, 0.48, 2.62, 12, 1, false, 0, Math.PI); top.rotateZ(Math.PI / 2);
    const bulge = new THREE.PlaneGeometry(2.5, 1.2, 8, 4);
    { const P = bulge.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i) / 1.25, y = P.getY(i) / 0.6; P.setZ(i, 0.12 * (1 - x * x) * (1 - y * y)); } bulge.computeVertexNormals(); }
    for (let i = 0; i < n; i++) {
      const sM = i / n * Track.L;
      if (Math.abs(sM - gateS) < 3.5) continue; // brama do parku maszyn
      const bend = Track.inBend(sM) || World.V.fence === 'air', p = Track.pos(sM, H + (bend ? 3.1 : 2.9)), rot = Math.atan2(-p.f.tz, p.f.tx), m = mats[i % mats.length];
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = rot;
      if (bend) {
        const body = new THREE.Mesh(pillow, i % 2 ? red : white); body.position.y = 0.52; g.add(body);
        const t = new THREE.Mesh(top, i % 2 ? red : white); t.position.y = 1.02; g.add(t);
        const f = new THREE.Mesh(bulge, m); f.position.set(0, 0.62, -0.48); f.rotation.y = Math.PI; g.add(f); // reklama od strony toru
        if (!World.dirtMat) {
          const dt = World.canvasTex(256, 128, gx => { gx.clearRect(0, 0, 256, 128); for (let k = 0; k < 900; k++) { const y = 128 - Math.pow(Math.random(), 1.8) * 128, r = 0.6 + Math.random() * (y > 80 ? 3 : 1.6); gx.fillStyle = `rgba(${14 + Math.random() * 20},${13 + Math.random() * 18},${12 + Math.random() * 15},${0.5 + Math.random() * 0.5})`; gx.beginPath(); gx.ellipse(Math.random() * 256, y, r * 1.6, r, 0, 0, 7); gx.fill(); } });
          World.dirtMat = new THREE.MeshStandardMaterial({ map: dt, transparent: true, opacity: World.dirt || 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
        }
        const dm = new THREE.Mesh(bulge, World.dirtMat); dm.position.set(0, 0.62, -0.5); dm.rotation.y = Math.PI; g.add(dm);
      } else {
        const b = new THREE.Mesh(board, [white, white, white, white, white, m]); b.position.y = 0.72; g.add(b); // ściana −z (od toru) z reklamą
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.08), steel); post.position.set(1.33, 0.65, 0.1); g.add(post);
      }
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      World.scene.add(g);
    }
    // siatka ochronna na słupach za bandą
    const net = World.canvasTex(64, 64, gx => {
      gx.clearRect(0, 0, 64, 64); gx.strokeStyle = 'rgba(210,214,220,1)'; gx.lineWidth = 2;
      gx.beginPath(); gx.moveTo(0, 0); gx.lineTo(64, 64); gx.moveTo(64, 0); gx.lineTo(0, 64); gx.stroke();
    });
    net.wrapS = net.wrapT = THREE.RepeatWrapping; net.repeat.set(Track.L / 0.25 / 4, 12);
    const pos = [], uv = [], idx = [], dN = H + 4.1, steps = 520;
    for (let i = 0; i <= steps; i++) {
      const sM = i / steps * Track.L, q = Track.pos(sM, dN);
      pos.push(q.x, 1.3, q.z, q.x, 4.6, q.z); uv.push(i / steps, 0, i / steps, 1);
      if (i < steps && Math.abs(sM - gateS) > 4) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ng.setIndex(idx); ng.computeVertexNormals();
    World.scene.add(new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ map: net, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0x9aa0a8 })));
    for (let i = 0; i < Track.L; i += 6) { if (Math.abs(i - gateS) < 5) continue; const q = Track.pos(i, dN); World.scene.add(Bike.tube([q.x, 0, q.z], [q.x, 4.7, q.z], 0.05, steel, 6)); }
    World.pitGate = Track.pos(gateS, H + 3.5);
  },

  /** Wysokość stopnia trybuny / „młyna” pod punktem (x, z); 0 poza trybunami */
  standHeight(x, z) {
    for (const Z of World.standZones || []) {
      let d;
      if (Z.kind === 'line') { if (Math.abs(x) > Z.len / 2 || Math.sign(z) !== Z.zSign) continue; d = Math.abs(z) - Z.z0; }
      else {
        if ((x - Z.cx) * Z.xs < 0) continue; d = Math.hypot(x - Z.cx, z) - Z.r0;
        if (Z.parts) { const a0 = Z.xs > 0 ? -Math.PI / 2 : Math.PI / 2, f = (((Math.atan2(-z, x - Z.cx) - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / Math.PI; if (!Z.parts.some(([f0, f1]) => f >= f0 && f <= f1)) continue; }
      }
      if (d < 0 || d > Z.rows * Z.step) continue;
      const r = Math.min(Z.rows - 1, Math.floor(d / Z.step));
      return Z.base + r * Z.rise;
    }
    return 0;
  },

  /** Czy punkt (x, z) leży w strefie toru (od krawężnika do siatki)? — spacer nie wchodzi na tor */
  inTrackZone(x, z) {
    const S2 = Track.STRAIGHT / 2, R = Track.R;
    const d = Math.abs(x) <= S2 ? Math.abs(z) - R : Math.hypot(Math.abs(x) - S2, z) - R;
    return d > -(Track.HALF + 1.6) && d < Track.HALF + 4.6;
  },

  /** Krzesełka stadionowe: siedzisko + oparcie, jeden kolor klubu (World.seatMat), instancje */
  addSeats(list) {
    if (!list.length) return;
    const pan = new THREE.BoxGeometry(0.44, 0.06, 0.38).toNonIndexed(); pan.translate(0, 0.36, 0.02);
    const back = new THREE.BoxGeometry(0.44, 0.4, 0.05).toNonIndexed(); back.translate(0, 0.56, 0.22); back.rotateX(-0.12);
    const legs = new THREE.BoxGeometry(0.3, 0.33, 0.04).toNonIndexed(); legs.translate(0, 0.17, 0.05);
    const geo = Props.mergeGeos([pan, back, legs]);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }); mat.userData.lin = true;
    const im = new THREE.InstancedMesh(geo, mat, list.length), D = new THREE.Object3D();
    list.forEach((p, i) => { D.position.set(p.x, p.y, p.z); D.rotation.set(0, p.rot, 0); D.updateMatrix(); im.setMatrixAt(i, D.matrix); im.setColorAt(i, new THREE.Color(0.5, 0.2, 0.1)); });
    im.receiveShadow = true;
    World.scene.add(im);
    World.seats = { im, list };
  },

  /** Krzesełka w barwach gospodarza; na trybunie głównej skrót klubu ułożony z krzesełek w drugim kolorze */
  paintSeats(kevlar, trim, text) {
    const S = World.seats; if (!S) return;
    const A = new THREE.Color(kevlar).convertSRGBToLinear().multiplyScalar(0.8), Bc = new THREE.Color(trim).convertSRGBToLinear().multiplyScalar(0.85);
    const lum = c => c.r * 0.3 + c.g * 0.6 + c.b * 0.1;
    const B = Math.abs(lum(A) - lum(Bc)) < 0.08 ? new THREE.Color(0.85, 0.85, 0.82) : Bc;
    const main = S.list.find(p => p.main), cv = document.createElement('canvas');
    let data = null, cw = 0, ch = 0;
    if (main && text) {
      cw = cv.width = main.cols; ch = cv.height = main.rows;
      const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#fff';
      g.font = `bold ${Math.floor(ch * 1.05)}px "Saira Stencil One", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cw / 2, ch / 2 + 1, cw * 0.8);
      data = g.getImageData(0, 0, cw, ch).data;
    }
    const st = (World.V && World.V.seats) || 'club', grey = new THREE.Color(0.32, 0.33, 0.35);
    const MIX = ['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#ffffff', '#6a1b9a'].map(h => new THREE.Color(h).convertSRGBToLinear().multiplyScalar(0.8));
    if (st !== 'club') data = null;
    S.list.forEach((p, i) => {
      let c = st === 'grey' ? grey : A;
      if (st === 'stripes' && (p.row != null ? p.row : Math.round(p.y / 0.62)) % 2) c = B;
      if (st === 'mix') c = MIX[(i * 7919 + (p.row || 0) * 31) % MIX.length];
      if (p.main && data) { const px = ((ch - 1 - p.row) * cw + Math.max(0, cw - 1 - p.col)) * 4; if (data[px] > 110) c = B; } // kolumny lustrzanie: napis czytany z toru
      S.im.setColorAt(i, c);
    });
    S.im.instanceColor.needsUpdate = true;
  },

  /** Elewacja trybuny (moduł 12 m): panele betonowe, filar, brama z podświetlonym napisem, pas okien. emissive=true → mapa świecenia */
  facadeTex(emissive) {
    return World.canvasTex(512, 256, (g, w, h) => {
      const F = (World.V && World.V.facade) || 'concrete';
      g.fillStyle = emissive ? '#000' : F === 'white' ? '#bdbab2' : F === 'club' ? World.V.kevlar : F === 'brick' ? '#7a3f2c' : '#6d6a64'; g.fillRect(0, 0, w, h);
      if (!emissive && F === 'brick') { g.fillStyle = 'rgba(210,200,185,.55)'; for (let y = 0; y < h; y += 9) { g.fillRect(0, y, w, 1.6); for (let x = (y / 9) % 2 ? 0 : 11; x < w; x += 22) g.fillRect(x, y, 1.6, 9); } }
      if (!emissive && F === 'club') { g.fillStyle = World.V.trim; g.globalAlpha = 0.85; g.fillRect(0, 90, w, 16); g.globalAlpha = 1; }
      if (!emissive) {
        for (let y = 0; y < h; y += 42) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 2); }
        for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 2, h); }
        g.fillStyle = '#4c4944'; g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);       // filary
        g.fillStyle = '#34322f'; g.fillRect(0, h - 14, w, 14);                                  // cokół
        g.fillStyle = '#18191b'; g.fillRect(190, h - 120, 132, 106);                            // brama
        g.fillStyle = '#2b2d30'; for (let x = 196; x < 318; x += 12) g.fillRect(x, h - 116, 3, 102); // kraty
      }
      g.fillStyle = emissive ? '#ffd699' : '#1d2230'; for (let x = 44; x < w - 44; x += 38) g.fillRect(x, 30, 26, 34); // okna korytarza
      if (emissive) { g.fillStyle = '#fff2d6'; g.fillRect(200, h - 136, 112, 12); g.fillStyle = '#7ec8ff'; g.fillRect(230, h - 158, 52, 16); }
      else { g.fillStyle = '#0f3a6b'; g.fillRect(226, h - 160, 60, 20); g.fillStyle = '#fff'; g.font = 'bold 14px Barlow, sans-serif'; g.textAlign = 'center'; g.fillText('WEJŚCIE', 256, h - 145); }
    });
  },

  buildStands() {
    const V = World.V, fac = World.fac;
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c2926, roughness: 0.9 });
    World.seatMat = new THREE.MeshStandardMaterial({ color: 0x7a3a1a, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3c3a3a, roughness: 0.6, metalness: 0.3 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.4, metalness: 0.7 });
    const spots = [], seatList = [];
    const concrete = World.pbr('brushed_concrete', 16, 1, { color: '#9a958d' }), concreteArc = World.pbr('brushed_concrete', 0.25, 0.25, { color: '#9a958d' });
    World.standZones = [];
    const steelBar = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
    // trybuny na prostych kończą się tam, gdzie zaczynają się łuki z nasypem/trybuną — nic na siebie nie nachodzi
    const maxLen = V.bends.some(b => b !== 'none') ? Track.STRAIGHT : Track.STRAIGHT + Track.R * 1.6;
    const stand = (zSign, cfg, awayFrom) => {
      const len = Math.min(cfg.len, maxLen), rows = cfg.rows;
      for (let r = 0; r < rows; r++) {
        const z = zSign * (Track.R + 12 + r * 1.1);
        const sh = 0.6 + r * 0.62, step = new THREE.Mesh(new THREE.BoxGeometry(len, sh, 1.1), concrete);
        step.position.set(0, sh / 2, z); step.receiveShadow = true;
        World.scene.add(step);
        for (let x = -len / 2 + 0.35; x < len / 2 - 0.3; x += 0.52) {
          if (Math.abs(x) < 0.9 || Math.abs(x - len / 4) < 0.6 || Math.abs(x + len / 4) < 0.6) continue; // przejścia
          seatList.push({ x, y: 0.6 + r * 0.62, z: z + zSign * 0.12, rot: zSign > 0 ? 0 : Math.PI, main: zSign > 0, row: r, col: Math.round((x + len / 2) / 0.52), rows, cols: Math.round(len / 0.52) });
        }
        // schodki w przejściach między rzędami
        [0, len / 4, -len / 4].forEach(ax => {
          const st = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.31, 0.5), concrete); st.position.set(ax, 0.6 + r * 0.62 + 0.15, z - zSign * 0.28); World.scene.add(st);
        });
        for (let x = -len / 2 + 0.4; x < len / 2 - 0.3; x += 0.66) {
          if (Math.abs(x) < 1.2 || Math.abs(x - len / 4) < 0.7 || Math.abs(x + len / 4) < 0.7) continue; // przejścia
          if (Math.random() < 0.12) continue;
          const seated = Math.random() < 0.45;
          const team = awayFrom != null && x > awayFrom ? 'a' : Math.random() < 0.8 ? 'h' : null;
          spots.push({ x: x + (Math.random() - 0.5) * 0.12, y: 0.6 + r * 0.62 + (seated ? 0.1 : 0), z: z + zSign * 0.1, yaw: zSign > 0 ? Math.PI / 2 : -Math.PI / 2, seated, team });
        }
      }
      // pod trybuną: ściana z wejściami (trybuna jest przeszkodą w spacerze)
      const back = zSign * (Track.R + 12 + rows * 1.1 + 0.5);
      const under = new THREE.Mesh(new THREE.BoxGeometry(len, rows * 0.62 + 0.6, 0.4), mat);
      under.position.set(0, (rows * 0.62 + 0.6) / 2, back);
      World.scene.add(under);
      // elewacja od zewnątrz: betonowe panele, filary, bramy wejściowe z podświetleniem, pas okien korytarza
      const fh = rows * 0.62 + 0.6, ftex = World.facadeTex(), ftexE = World.facadeTex(true), fnorB = World.texSet('concrete_panels').normal, fnor = fnorB.clone(); fnor.repeat.set(Math.max(1, Math.round(len / 6)), 2); if (fnorB.image && fnorB.image.width) fnor.needsUpdate = true; else fnorB._copies.push(fnor);
      [ftex, ftexE].forEach(t => { t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(len / 12)), 1); });
      const facade = new THREE.Mesh(new THREE.PlaneGeometry(len, fh), new THREE.MeshStandardMaterial({ map: ftex, normalMap: fnor, emissive: 0xffffff, emissiveMap: ftexE, emissiveIntensity: 0.9, roughness: 0.85 }));
      facade.position.set(0, fh / 2, back + zSign * 0.22); facade.rotation.y = zSign > 0 ? 0 : Math.PI;
      World.scene.add(facade);
      // barierki wzdłuż przejść
      [0, len / 4, -len / 4].forEach(ax => [-0.55, 0.55].forEach(dx => World.scene.add(Bike.tube([ax + dx, 1.5, zSign * (Track.R + 11.6)], [ax + dx, rows * 0.62 + 1.5, zSign * (Track.R + 11.6 + rows * 1.1)], 0.025, steel, 6))));
      // trybuna jest do chodzenia: blokuje tylko ściana z tyłu i barierka z przodu, wchodzi się z boków (schody)
      World.colliders.push({ x0: -len / 2, x1: len / 2, z0: Math.min(back - zSign * 0.4, back + zSign * 0.4), z1: Math.max(back - zSign * 0.4, back + zSign * 0.4) });
      World.colliders.push({ x0: -len / 2, x1: len / 2, z0: Math.min(zSign * (Track.R + 11.1), zSign * (Track.R + 11.5)), z1: Math.max(zSign * (Track.R + 11.1), zSign * (Track.R + 11.5)) });
      World.standZones.push({ kind: 'line', zSign, len, rows, z0: Track.R + 12, step: 1.1, rise: 0.62, base: 0.6 });
      // barierka przed pierwszym rzędem
      const rz = zSign * (Track.R + 11.3);
      World.scene.add(Bike.tube([-len / 2, 1.3, rz], [len / 2, 1.3, rz], 0.04, steel));
      for (let x = -len / 2; x <= len / 2; x += 4) World.scene.add(Bike.tube([x, 0, rz], [x, 1.3, rz], 0.03, steel));
      if (cfg.roof) { // dach i jego konstrukcja
        const depth = rows * 1.3, rzTop = zSign * (Track.R + 12 + rows * 0.55);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(len + 4, 0.35, depth), roofMat);
        roof.position.set(0, rows * 0.62 + 5, rzTop); roof.rotation.x = zSign * 0.08; roof.receiveShadow = true;
        World.scene.add(roof);
        // czoło dachu w barwach klubu i pas lamp pod dachem
        const fz = zSign * (Track.R + 12 + rows * 0.55 - depth / 2 + 0.2), fy = rows * 0.62 + 5 - (depth / 2) * 0.08;
        const fascia = new THREE.Mesh(new THREE.BoxGeometry(len + 4.2, 0.9, 0.25), World.seatMat); fascia.position.set(0, fy + 0.1, fz); World.scene.add(fascia);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(len + 2, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3, 2.6) })); strip.position.set(0, fy - 0.45, fz + zSign * 0.5); World.scene.add(strip);
        for (let x = -len / 2; x <= len / 2; x += 10) {
          World.scene.add(Bike.tube([x, 0, back], [x, rows * 0.62 + 5.2, back], 0.18, steel));
          World.scene.add(Bike.tube([x, rows * 0.62 + 5, back], [x, rows * 0.62 + 4.2, zSign * (Track.R + 13)], 0.08, steel));
        }
      } else { // bez dachu: maszty z flagami na koronie trybuny
        for (let x = -len / 2 + 6; x <= len / 2 - 6; x += 16) World.scene.add(Bike.tube([x, rows * 0.62, back], [x, rows * 0.62 + 4, back], 0.05, steel));
      }
      // ściana za ostatnim rzędem z reklamą
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 3, 0.3), new THREE.MeshStandardMaterial({ map: World.boardTex(DATA.SPONSORS[zSign > 0 ? 0 : 1]), roughness: 0.6 }));
      wall.position.set(0, rows * 0.62 + 1.9, zSign * (Track.R + 12 + rows * 1.1 + 0.3)); wall.rotation.y = zSign > 0 ? Math.PI : 0;
      World.scene.add(wall);
      if (zSign > 0) { // elewacja od parkingu: nazwa stadionu
        const face = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(len * 0.8, 60), 3.2), new THREE.MeshBasicMaterial({ map: World.signTex(World.V.name.toUpperCase(), '#141416', '#f2f2ee', 1024, 80) }));
        face.position.set(0, rows * 0.62 + 1.9, back + zSign * 0.25);
        World.scene.add(face);
      }
      return back;
    };
    // trybuna główna rośnie z poziomem inwestycji „Trybuny” (dodatkowe rzędy)
    const main = { ...V.main, rows: V.main.rows + Math.max(0, (fac.stands || 1) - 1) * 2 };
    World.mainBack = stand(1, main, null);
    World.mainLen = Math.min(main.len, maxLen);
    if (V.back) stand(-1, V.back, 16);
    // łuki: nasyp ze stojącymi, łukowa trybuna albo nic
    [1, -1].forEach((xs, bi) => {
      const kind = V.bends[bi], cx = xs * Track.STRAIGHT / 2;
      const a0 = xs > 0 ? -Math.PI / 2 : Math.PI / 2;
      if (kind === 'bank') {
        // „młyn”: niskie betonowe stopnie do stania, co dwa stopnie stalowa barierka
        const rows = 8, parts = xs > 0 ? [[0, 1]] : [[0, 0.28], [0.72, 1]];
        World.standZones.push({ kind: 'arc', cx, xs, rows, r0: Track.R + 12, step: 1.0, rise: 0.42, base: 0.35, parts });
        for (let r = 0; r < rows; r++) {
          const ri = Track.R + 12 + r * 1.0, ro = ri + 1.0, h = 0.35 + r * 0.42;
          parts.forEach(([f0, f1]) => {
            const b0 = a0 + f0 * Math.PI, b1 = a0 + f1 * Math.PI;
            const sh = new THREE.Shape(); sh.absarc(0, 0, ro, b0, b1, false); sh.absarc(0, 0, ri, b1, b0, true);
            const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 48 }); geo.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(geo, concreteArc); m.position.set(cx, 0, 0); m.receiveShadow = true; World.scene.add(m);
            if (r % 2 === 1) {
              const pts = []; for (let k = 0; k <= 40; k++) { const a = b0 + (b1 - b0) * k / 40; pts.push([cx + Math.cos(a) * (ri + 0.15), h + 1.05, -Math.sin(a) * (ri + 0.15)]); }
              World.scene.add(Bike.pipe(pts, 0.035, steelBar, 120));
              for (let k = 0; k <= 40; k += 5) World.scene.add(Bike.tube([pts[k][0], h, pts[k][2]], pts[k], 0.03, steelBar, 5));
            }
          });
          for (let k = 0; k < 70; k++) {
            if (Math.random() < 0.25) continue;
            const f = (k + Math.random() * 0.6) / 70;
            if (xs < 0 && f > 0.28 && f < 0.72) continue; // przejście do parku maszyn
            const a = a0 + f * Math.PI, rr = ri + 0.55 + (Math.random() - 0.5) * 0.25, x = cx + Math.cos(a) * rr, z = -Math.sin(a) * rr;
            spots.push({ x, y: h, z, yaw: Math.atan2(z, cx - x), seated: false, team: Math.random() < 0.85 ? 'h' : null });
          }
        }
      } else if (kind === 'terrace') {
        const rows = 9;
        World.standZones.push({ kind: 'arc', cx, xs, rows, r0: Track.R + 12, step: 1.1, rise: 0.62, base: 0.6, parts: xs > 0 ? [[0, 1]] : [[0, 0.28], [0.72, 1]] });
        for (let r = 0; r < rows; r++) {
          const ri = Track.R + 12 + r * 1.1, ro = ri + 1.1, h = 0.6 + r * 0.62;
          (xs > 0 ? [[0, 1]] : [[0, 0.28], [0.72, 1]]).forEach(([f0, f1]) => {
            const b0 = a0 + f0 * Math.PI, b1 = a0 + f1 * Math.PI;
            const sh = new THREE.Shape(); sh.absarc(0, 0, ro, b0, b1, false); sh.absarc(0, 0, ri, b1, b0, true);
            const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 40 }); geo.rotateX(-Math.PI / 2);
            const m = new THREE.Mesh(geo, r % 2 ? concreteArc : World.seatMat); m.position.set(cx, 0, 0); m.receiveShadow = true;
            World.scene.add(m);
          });
          const ns = Math.floor(Math.PI * (ri + 0.55) / 0.52);
          for (let k = 1; k < ns - 1; k++) {
            if (k % 26 === 0 || (xs < 0 && k / ns > 0.28 && k / ns < 0.72)) continue;
            const a = a0 + (k / ns) * Math.PI, rr = ri + 0.55, x = cx + Math.cos(a) * rr, z = -Math.sin(a) * rr;
            seatList.push({ x, y: h, z, rot: Math.atan2(-(cx - x), z) });
          }
          const n = Math.floor(Math.PI * (ri + 0.5) / 0.7);
          for (let k = 2; k < n - 2; k++) {
            if (Math.random() < 0.18 || k % 22 === 0) continue;
            const a = a0 + (k / n) * Math.PI, rr = ri + 0.5;
            const x = cx + Math.cos(a) * rr, z = -Math.sin(a) * rr, seated = Math.random() < 0.4;
            if (xs < 0 && k / n > 0.28 && k / n < 0.72) continue;
            spots.push({ x, y: h - 0.02 + (seated ? 0.1 : 0), z, yaw: Math.atan2(z, cx - x), seated, team: Math.random() < 0.8 ? 'h' : null });
          }
        }
      }
    });
    World.addSeats(seatList);
    spots.forEach(p => { if (p.yaw > Math.PI) p.yaw -= Math.PI * 2; if (p.yaw < -Math.PI) p.yaw += Math.PI * 2; });
    World.crowdSpots = spots;
    Crowd.build(World.scene, spots, { h: ['#D9541F', '#1B1B1F'], a: ['#2A55B8', '#EDEDED'] });
  },

  buildLights() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x7c8088, metalness: 0.6, roughness: 0.45 });
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.8, 3.3) }); // jaśniejsze niż biel → poświata
    World.lampMats = [lampMat]; World.floods = []; World.beamMat = null;
    const glowTex = World.canvasTex(128, 128, g => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,246,218,1)'); gr.addColorStop(0.25, 'rgba(255,236,190,.35)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc, transparent: true, opacity: 0.016, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    World.beamMat = beamMat;
    const S2 = Track.STRAIGHT / 2, R = Track.R, n = World.V.masts;
    const cx = S2 + R * 0.7, zb = R + 40, mx = Math.max(cx, (World.mainLen || 90) / 2 + 8);
    // od strony trybuny głównej maszty stoją przy jej końcach (za trybuną jest parking)
    let spots = [[-cx, -zb], [cx, -zb], [-mx, R + 24], [mx, R + 24]];
    if (n >= 6) spots.push([0, -zb - 4], [-(S2 + R + 30), R * 0.4]);
    if (n >= 8) spots.push([-(S2 + R + 34), 0], [S2 + R + 38, 0]);
    spots.forEach(([x, z], i) => {
      const H = 30, mast = new THREE.Group(); mast.position.set(x, 0, z); World.scene.add(mast);
      World.colliders.push({ x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6 });
      // kratownica: 4 zbieżne nogi i krzyżulce co 3 m
      const leg = (sx, sz, y) => [sx * (1.2 - y / H * 0.7), y, sz * (1.2 - y / H * 0.7)];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], k, arr) => {
        mast.add(Bike.tube(leg(sx, sz, 0), leg(sx, sz, H), 0.07, steel, 6));
        const [nx, nz] = arr[(k + 1) % 4];
        for (let y = 0; y < H; y += 3) mast.add(Bike.tube(leg(sx, sz, y), leg(nx, nz, y + 3), 0.03, steel, 4));
      });
      // głowica: rama i 3×4 lampy skierowane na tor
      const head = new THREE.Group(); head.position.set(0, H + 1.5, 0); mast.add(head);
      head.lookAt(new THREE.Vector3(-x, -H, -z));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.6, 0.3), steel); head.add(frame);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.25), lampMat);
        l.position.set(-2.5 + c * 1.67, -1.1 + r * 1.1, 0.2); head.add(l);
      }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
      glow.scale.set(24, 24, 1); glow.position.set(x, H + 1.5, z);
      World.scene.add(glow);
      const lampPos = new THREE.Vector3(x, H + 1.5, z);
      const target = new THREE.Vector3(x * 0.35, 0, z * 0.25);
      const len = lampPos.distanceTo(target);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(22, len, 24, 1, true), beamMat);
      cone.position.copy(lampPos).add(target).multiplyScalar(0.5);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(lampPos).normalize());
      World.scene.add(cone);
      if (i % 2 === 0) { const pl = new THREE.PointLight(0xfff0d0, 0.8 * (World.V.lightK || 1), 200, 1.4); pl.position.set(x * 0.8, 28, z * 0.8); World.scene.add(pl); World.floods.push(pl); }
      if (i < 4) { const sp = new THREE.SpotLight(0xfff3dc, 1.1 * (World.V.lightK || 1), 260, 0.62, 0.7, 1.1); sp.position.set(x, H + 1.5, z); sp.target.position.set(x * 0.25, 0, z * 0.2); World.scene.add(sp); World.scene.add(sp.target); World.floods.push(sp); }
    });
  },

  /**
   * Maszyna startowa jak na prawdziwym żużlu: dwa słupki (wewnętrzny i zewnętrzny) z obudowami mechanizmu
   * w żółto-czarne pasy, poprzeczka u góry i elastyczne białe taśmy przez cały tor. Na start taśmy
   * wystrzeliwują w górę (World.tape — grupa przesuwana w sync), pola startowe pomalowane na torze.
   */
  buildGate() {
    const H = Track.HALF, post = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
    const warn = World.canvasTex(64, 128, g => { for (let i = -4; i < 12; i++) { g.fillStyle = i % 2 ? '#111' : '#f2c21a'; g.beginPath(); g.moveTo(0, i * 16); g.lineTo(64, i * 16 - 32); g.lineTo(64, i * 16 - 16); g.lineTo(0, i * 16 + 16); g.fill(); } });
    const housing = new THREE.MeshStandardMaterial({ map: warn, roughness: 0.5 }), steel = new THREE.MeshStandardMaterial({ color: 0x6b6f75, metalness: 0.7, roughness: 0.35 });
    const ends = [-H - 0.9, World.TRACK_OUT - 1.4].map(d => Track.pos(0.8, d));
    ends.forEach(q => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), housing); box.position.set(q.x, 0.6, q.z); box.castShadow = true; World.scene.add(box);
      World.scene.add(Bike.tube([q.x, 1.2, q.z], [q.x, 3.2, q.z], 0.05, steel, 8));
    });
    World.scene.add(Bike.tube([ends[0].x, 3.2, ends[0].z], [ends[1].x, 3.2, ends[1].z], 0.04, steel, 8)); // poprzeczka
    // taśmy: dwie elastyczne, lekko zwisające (łuk), mocowane w mechanizmach
    const tape = new THREE.Group(), tm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0x333333 });
    [0, 0.16].forEach(dy => {
      const pts = []; for (let i = 0; i <= 16; i++) { const f = i / 16; pts.push(new THREE.Vector3(ends[0].x + (ends[1].x - ends[0].x) * f, dy - Math.sin(f * Math.PI) * 0.06, ends[0].z + (ends[1].z - ends[0].z) * f)); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 5), tm); tape.add(m);
    });
    tape.position.y = 0.95; World.tape = tape; World.scene.add(tape);
    // pola startowe: białe linie oddzielające 4 stanowiska
    for (let k = 0; k <= 4; k++) { const d = -H + k * (2 * H) / 4, a = Track.pos(0.8, d), b = Track.pos(-1.6, d); const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 2.4), new THREE.MeshBasicMaterial({ color: 0xdedede })); ln.rotation.x = -Math.PI / 2; ln.rotation.z = Math.atan2(b.x - a.x, b.z - a.z); ln.position.set((a.x + b.x) / 2, 0.04, (a.z + b.z) / 2); World.scene.add(ln); }
    World.startLightMat = new THREE.MeshBasicMaterial({ color: 0x331111 });
    // światło sędziego na słupku przy maszynie startowej (czerwone / zielone)
    const lp = Track.pos(-1.5, -Track.HALF - 1.6);
    World.scene.add(Bike.tube([lp.x, 0, lp.z], [lp.x, 2.3, lp.z], 0.05, post));
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.28), World.startLightMat);
    box.position.set(lp.x, 2.55, lp.z);
    World.scene.add(box);
  },

  /** Telebim za pierwszym łukiem: wynik meczu i numer biegu */
  buildScreen() {
    World.screenTex = World.canvasTex(512, 256, g => { g.fillStyle = '#050505'; g.fillRect(0, 0, 512, 256); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: World.screenTex }));
    const x = Track.STRAIGHT / 2 + Track.R + 26;
    scr.position.set(x, 12, 0); scr.rotation.y = -Math.PI / 2;
    World.scene.add(scr);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 23), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    frame.position.set(x + 0.4, 12, 0);
    World.scene.add(frame);
    [-8, 8].forEach(z => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 })); leg.position.set(x + 0.4, 3, z); World.scene.add(leg); });
  },
  setScreen(lines) {
    const c = World.screenTex.canvas, g = c.getContext('2d');
    g.fillStyle = '#050505'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255,181,71,.07)'; for (let y = 0; y < c.height; y += 4) g.fillRect(0, y, c.width, 1);
    g.textAlign = 'center';
    g.fillStyle = '#FFB547'; g.font = 'bold 74px "Saira Stencil One", Impact, sans-serif'; g.fillText(lines[0] || '', 256, 110);
    g.fillStyle = '#F2EDE6'; g.font = '34px Barlow, sans-serif'; g.fillText(lines[1] || '', 256, 175);
    g.fillStyle = '#E0632E'; g.font = '28px Barlow, sans-serif'; g.fillText(lines[2] || '', 256, 222);
    World.screenTex.needsUpdate = true;
  },

  // wypiekane drzewa: proporcje klatki (szer./wys.), wysokość drzewa względem klatki, zakres wysokości w grze [m]
  TREES: {
    fir_a: { aspect: 0.5, fill: 8.83 / 10.76, hMin: 14, hVar: 9 }, fir_b: { aspect: 0.5, fill: 7.8 / 8.71, hMin: 12, hVar: 8 }, fir_c: { aspect: 1, fill: 5.91 / 6.02, hMin: 9, hVar: 6 },
    small: { aspect: 1, fill: 4.56 / 4.65, hMin: 9, hVar: 6 }, oak: { aspect: 1, fill: 5.03 / 5.13, hMin: 8, hVar: 5 },
  },
  /** Drzewa danego gatunku: list = [{x, z, rot, h}] → dwie instancjonowane płaszczyzny na krzyż (widok z przodu i z boku) */
  treeBillboards(k, list, parent = World.scene) {
    const T = World.TREES[k]; if (!list.length) return;
    World._treeMat = World._treeMat || {};
    [0, 1].forEach(view => {
      const id = k + view;
      let mat = World._treeMat[id];
      if (!mat) {
        const tex = (World._TL || (World._TL = new THREE.TextureLoader())).load(`models/trees/tree_${k}_${view}.png`);
        tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
        mat = World._treeMat[id] = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, roughness: 1, metalness: 0, color: new THREE.Color(1.15, 1.15, 1.1) });
        mat.userData.lin = true; mat.userData.shared = true;
      }
      // przód i tył jako osobne płaszczyzny (jednostronne), normalne w górę — obie strony oświetlone jak korona drzewa
      const f = new THREE.PlaneGeometry(T.aspect, 1), bk = f.clone(); bk.rotateY(Math.PI);
      const g = Props.mergeGeos([f.toNonIndexed(), bk.toNonIndexed()]); g.translate(0, 0.5, 0); if (view) g.rotateY(Math.PI / 2);
      const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
      const im = new THREE.InstancedMesh(g, mat, list.length), D = new THREE.Object3D();
      list.forEach((t, i) => { const fh = t.h / T.fill; D.position.set(t.x, -0.2, t.z); D.rotation.set(0, t.rot, 0); D.scale.set(fh, fh, fh); D.updateMatrix(); im.setMatrixAt(i, D.matrix); });
      im.castShadow = false; im.receiveShadow = false;
      parent.add(im);
    });
  },

  /** Drzewa i łuna miasta za stadionem */
  buildSurroundings() {
    const V = World.V, D = new THREE.Object3D();
    const trees = { forest: 300, field: 90, city: 60, industry: 70 }[V.around] || 150;
    // drzewa: „impostory” wypieczone z fotorealistycznych modeli Poly Haven (CC0) — dwie skrzyżowane płaszczyzny
    const mixT = { forest: [0.62, 0.24], field: [0.3, 0.4], city: [0.15, 0.5], industry: [0.35, 0.4] }[V.around] || [0.4, 0.35], TP = {};
    for (let i = 0; i < trees; i++) {
      const u = Math.random(), k = u < mixT[0] ? 'fir_' + 'abc'[i % 3] : u < mixT[0] + mixT[1] ? 'small' : 'oak';
      const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 105;
      (TP[k] = TP[k] || []).push({ x: Math.cos(a) * r * 1.2, z: Math.sin(a) * r, rot: Math.random() * Math.PI, h: World.TREES[k].hMin + Math.random() * World.TREES[k].hVar });
    }
    Object.entries(TP).forEach(([k, list]) => World.treeBillboards(k, list));
    { // zabudowa: bloki (miasto gęsto) i domy jednorodzinne z dachówką — własne budynki z teksturami PBR
      const nB = { city: 26, industry: 12, field: 5, forest: 4 }[V.around] || 6;
      for (let i = 0; i < nB; i++) { const a = Math.random() * Math.PI * 2, r = 215 + Math.random() * 70; World.block(Math.cos(a) * r * 1.2, Math.sin(a) * r, -a + Math.PI / 2, 4 + Math.floor(Math.random() * (V.around === 'city' ? 8 : 4))); }
      const nH = { forest: 22, field: 34, city: 10, industry: 12 }[V.around] || 18;
      for (let i = 0; i < nH; i++) { const a = Math.random() * Math.PI * 2, r = 165 + Math.random() * 45; World.house(Math.cos(a) * r * 1.2, Math.sin(a) * r, -a - Math.PI / 2 + (Math.random() - 0.5) * 0.3); }
    }
    if (true) { // (stare bryły zastępcze wyłączone)
    } else if (V.around === 'city' || V.around === 'industry') {
      // bloki z oświetlonymi oknami
      const win = World.canvasTex(64, 128, (g, w, hh) => {
        g.fillStyle = '#000'; g.fillRect(0, 0, w, hh);
        for (let y = 4; y < hh; y += 10) for (let x = 4; x < w; x += 10) { if (Math.random() < 0.35) { g.fillStyle = Math.random() < 0.7 ? '#ffcf8a' : '#bcd6ff'; g.fillRect(x, y, 5, 6); } }
      });
      const n = V.around === 'city' ? 70 : 34;
      const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1b1d22, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.55, roughness: 0.9 }), n);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = 185 + Math.random() * 90, h = 12 + Math.random() * (V.around === 'city' ? 40 : 18);
        D.position.set(Math.cos(a) * r * 1.2, h / 2, Math.sin(a) * r); D.scale.set(14 + Math.random() * 20, h, 12 + Math.random() * 14); D.rotation.set(0, a, 0); D.updateMatrix();
        blocks.setMatrixAt(i, D.matrix);
      }
      World.scene.add(blocks);
    }
    if (V.around === 'industry') {
      // kominy huty w biało-czerwone pasy i zbiorniki
      const stripes = World.canvasTex(8, 64, (g, w, hh) => { for (let y = 0; y < hh; y += 8) { g.fillStyle = (y / 8) % 2 ? '#e8e8e8' : '#b3261e'; g.fillRect(0, y, w, 8); } });
      [[-230, -120], [-205, -140], [240, 150]].forEach(([x, z], i) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 70 + i * 10, 14), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8 }));
        c.position.set(x, 35 + i * 5, z); World.scene.add(c);
        const red = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2) })); red.position.set(x, 72 + i * 10, z); World.scene.add(red);
      });
      [[-190, 150], [-170, 170]].forEach(([x, z]) => { const t = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 14), new THREE.MeshStandardMaterial({ color: 0x5a5f66, metalness: 0.5, roughness: 0.5 })); t.position.set(x, 14, z); World.scene.add(t); });
    }
    const glow = World.canvasTex(16, 256, (g, w, hh) => {
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(255,170,90,0)'); gr.addColorStop(0.75, 'rgba(255,150,80,.18)'); gr.addColorStop(1, 'rgba(255,170,90,.32)');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(330, 330, V.around === 'city' ? 110 : 70, 48, 1, true), new THREE.MeshBasicMaterial({ map: glow, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
    band.position.y = 30; World.scene.add(band);
  },

  /** Ludzie przy torze: sędziowie z flagami, starter, fotoreporterzy, operator TV, mechanicy, karetka */
  /** Flaga w prawej dłoni postaci (przyczepiona do kości — rusza się z ręką) */
  attachFlag(h, color) {
    const H = h.userData.human; if (!H) return null;
    const hand = H.root.getObjectByName('Bip01_R_Hand'); if (!hand) return null;
    const f = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.4, roughness: 0.4 })); stick.position.y = -0.2; f.add(stick); // flaga opuszczona wzdłuż nogi (między biegami)
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36, 6, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), side: THREE.DoubleSide, roughness: 0.8 }));
    cloth.position.set(0.25, -0.38, 0); f.add(cloth);
    h.updateMatrixWorld(true);
    // skala i kierunek: kij w świecie pionowo w górę (w dłoni opuszczonej ręki), niezależnie od orientacji kości
    const ws = new THREE.Vector3(), wq = new THREE.Quaternion(), gq = new THREE.Quaternion();
    hand.getWorldScale(ws); hand.getWorldQuaternion(wq); h.getWorldQuaternion(gq);
    f.scale.setScalar(1 / ws.x);
    f.quaternion.copy(wq.invert().multiply(gq));
    hand.add(f); f.userData.cloth = cloth;
    return cloth;
  },
  /** Aparat z teleobiektywem w dłoniach fotoreportera albo kamera TV na statywie */
  attachCamera(h, tv) {
    const dark = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5, metalness: 0.3 });
    if (tv) {
      const g = new THREE.Group(); g.position.set(0.7, 0, 0);
      [0, 2.1, 4.2].forEach(a => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 5), dark); l.position.set(Math.cos(a) * 0.25, 0.72, Math.sin(a) * 0.25); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(l); });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.25), dark); body.position.y = 1.5; g.add(body);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 12), dark); lens.rotation.z = Math.PI / 2; lens.position.set(0.42, 1.5, 0); g.add(lens);
      h.add(g); return;
    }
    const H = h.userData.human, hand = H && H.root.getObjectByName('Bip01_R_Hand'); if (!hand) return;
    const c = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), dark), lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.28, 10), dark);
    lens.rotation.z = Math.PI / 2; lens.position.x = 0.2; c.add(body); c.add(lens);
    h.updateMatrixWorld(true); const ws = new THREE.Vector3(); hand.getWorldScale(ws); c.scale.setScalar(1 / ws.x);
    hand.add(c);
  },

  buildStaff() {
    const put = (o, x, z, face) => { const g = Crowd.person(o); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-(face.z - z), face.x - x); World.scene.add(g); if (o.pose && o.pose !== 'stand' || o.role || o.anim) People.swapPerson(g, o); return g; };
    const H = Track.HALF, vest = '#E8DC2A';
    World.marshals = [];
    [Track.B1 + Math.PI * Track.R * 0.5, Track.B2 + Math.PI * Track.R * 0.5, Track.B1 - 8, Track.B2 - 8].forEach((s, i) => {
      const p = Track.pos(s, -H - 2.4), c = Track.pos(s + 10, 0);
      World.marshals.push(put({ jacket: vest, pose: 'flag', flag: i < 2 ? '#F2C230' : '#FFFFFF', cap: '#1B1B1F', role: 'security' }, p.x, p.z, c));
    });
    const st = Track.pos(-3, -H - 2); put({ jacket: '#EDEDED', pants: '#1B1B1F', cap: '#EDEDED', role: 'official' }, st.x, st.z, { x: st.x + 5, z: st.z });
    [Track.B1E + 6, Track.B2E + 6, Track.B1 - 12].forEach(s => { const p = Track.pos(s, H + 5.4), c = Track.pos(s - 12, 0); put({ jacket: '#2b2f38', pose: 'crouch', anim: Math.random() < 0.5 ? 'crouch' : 'photo' }, p.x, p.z, c); });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 3), new THREE.MeshStandardMaterial({ color: 0x2a2a2e }));
    plat.position.set(8, 1.3, Track.R + 9.8); World.scene.add(plat);
    put({ jacket: '#1B1B1F', pose: 'camera', anim: 'idle' }, 8, Track.R + 9.8, { x: 8, z: 0 }).position.y = 2.6;
    const x0 = -(Track.STRAIGHT / 2 + Track.R + 18);
    [-15, -5, 5, 15].forEach(z => { put({ jacket: '#3a3f4a', pants: '#1c2130', role: 'mechanic', anim: 'crouch' }, x0 - 0.9, z + 1, { x: x0, z: z + 1 }); put({ jacket: '#D9541F', cap: '#1B1B1F', anim: Math.random() < 0.5 ? 'talk' : 'idle' }, x0 + 1.5, z + 2.4, { x: x0, z }); });
    // karetka przy parku maszyn
    const amb = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }), red = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 2.2), white); box.position.y = 1.5; amb.add(box);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 2.1), white); cab.position.set(3.4, 1.1, 0); amb.add(cab);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.62, 0.3, 2.22), red); stripe.position.y = 1.3; amb.add(stripe);
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.8, 4) })); beacon.position.set(2.2, 2.8, 0); amb.add(beacon);
    [[-1.8, 1], [-1.8, -1], [3, 1], [3, -1]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x111111 })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, z * 1.05); amb.add(w); });
    amb.position.set(x0 - 6, 0, 30); amb.rotation.y = 0; World.scene.add(amb); World.ambulance = amb;
    if (Props.ready) {
      // karetka: wysoki furgon w żółtym lakierze z odblaskowym pasem i belką świetlną (grupa amb zostaje — rusza się w wyścigu)
      amb.children.forEach(ch => { ch.visible = false; });
      amb.add(Props.single('ambulance', 0, 0, 0, '#f2d31b'));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.6, 4) })); bar.position.set(1.2, 2.78, 0); amb.add(bar);
      const clubs = World._last && World._last.setTeams ? World._last.setTeams.filter(Boolean) : [];
      World.scene.add(Props.instanced('teamvan', [{ x: x0 - 12, z: -16, rot: Math.PI / 2, color: (clubs[0] && clubs[0].kevlar) || '#D9541F' }, { x: x0 - 12, z: 16, rot: -Math.PI / 2, color: (clubs[1] && clubs[1].kevlar) || '#2A55B8' }]));
    }
    [[x0 - 12, -16, 1.4, 3.6], [x0 - 12, 16, 1.4, 3.6], [x0 - 6, 30, 3, 1.4]].forEach(([x, z, hw, hd]) => World.colliders.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }));
  },

  /** Park maszyn za drugim łukiem: namioty klubów i motocykle na stojakach */
  buildPits() {
    const x0 = -(Track.STRAIGHT / 2 + Track.R + 18);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(18, 0.1, 44), World.pbr ? World.pbr('concrete_floor_02', 4, 10, { color: '#8a8a8a' }) : new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.95 }));
    slab.position.set(x0 - 2, 0.05, 0); slab.receiveShadow = true;
    World.scene.add(slab);
    World.mapItem(x0 - 2, 0, 18, 44, 'PARK MASZYN', '#6b6b6e');
    World.hotspot('pitride', x0 + 4.5, -21, 'Wyjedź na tor — jazda treningowa', 3);
    const canopy = [0xD9541F, 0x2A55B8, 0xD9541F, 0x2A55B8];
    [-15, -5, 5, 15].forEach((z, i) => {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.8, 4, 1, true), new THREE.MeshStandardMaterial({ color: canopy[i], roughness: 0.6, side: THREE.DoubleSide }));
      tent.position.set(x0 - 2, 3.4, z); tent.rotation.y = Math.PI / 4;
      World.scene.add(tent);
      [[-3, -3], [-3, 3], [3, -3], [3, 3]].forEach(([dx, dz]) => { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc })); pole.position.set(x0 - 2 + dx, 1.3, z + dz); World.scene.add(pole); });
      const bike = Bike.build({ kevlar: canopy[i] === 0xD9541F ? '#D9541F' : '#2A55B8', trim: '#EDEDED', helmet: '#444', no: i + 1, name: '' }, { noTag: true });
      bike.rider.visible = false;
      bike.root.position.set(x0, 0.125, z + 1); bike.root.rotation.y = Math.PI / 2; // koła nad posadzką
      World.colliders.push({ x0: x0 - 0.5, x1: x0 + 0.5, z0: z + 1 - 1.2, z1: z + 1 + 1.2 });
      World.scene.add(bike.root);
      const lamp = new THREE.PointLight(0xfff0d0, 0.5, 14); lamp.position.set(x0 - 2, 3, z); World.scene.add(lamp);
      if ((World.fac.pits || 1) >= 3) tent.visible = false; // zamiast namiotów — zadaszenie
    });
    const pl = World.fac.pits || 1, steel = new THREE.MeshStandardMaterial({ color: 0x8d9298, metalness: 0.7, roughness: 0.35 });
    if (pl >= 3) { // stalowe zadaszenie parku maszyn z blachy trapezowej
      for (let z = -21; z <= 21; z += 6) [-10, 6].forEach(dx => World.scene.add(Bike.tube([x0 + dx, 0.1, z], [x0 + dx, 4.4, z], 0.12, steel, 8)));
      const roof = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.15, 45), World.pbr('corrugated_iron', 6, 15, { color: '#b9bec4', metal: 0.4 })); roof.position.set(x0 - 2, 4.5, 0); roof.rotation.z = 0.05; roof.castShadow = true; World.scene.add(roof);
      [-15, -5, 5, 15].forEach(z => { const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.6) })); l.position.set(x0 - 2, 4.35, z); World.scene.add(l); });
    }
    if (pl >= 4) { // boksy drużyn z bramami rolowanymi w barwach
      [-16, -8, 0, 8, 16].forEach((z, i) => World.realBuilding({ x: x0 - 13.5, z, w: 5, d: 7.6, h: 3.6, wall: 'concrete_panels', windows: false }));
      [-16, -8, 0, 8, 16].forEach((z, i) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 5.4), World.pbr('painted_metal_shutter', 2, 1, { color: i % 2 ? '#2A55B8' : '#D9541F', metal: 0.4 })); d.position.set(x0 - 10.95, 1.4, z); World.scene.add(d); });
      World.colliders.push({ x0: x0 - 16.5, x1: x0 - 10.6, z0: -20, z1: 20 });
    }
  },

  /** Flagi na dachu trybuny głównej (falujące płótno) */
  buildFlags() {
    World.flags = [];
    const cols = ['#D9541F', '#1B1B1F', '#EDEDED', '#D9541F', '#1B1B1F'];
    cols.forEach((c, i) => {
      const x = (-0.4 + i * 0.2) * (World.mainLen || 100), z = Track.R + 12 + (World.V.main.rows + Math.max(0, (World.fac.stands || 1) - 1) * 2) * 0.55;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
      const top = (World.V.main.rows + Math.max(0, (World.fac.stands || 1) - 1) * 2) * 0.62 + (World.V.main.roof ? 8.5 : 4);
      pole.position.set(x, top - 3.5, z); World.scene.add(pole);
      const geo = new THREE.PlaneGeometry(3.2, 2, 12, 4);
      const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(x + 1.6, top - 1, z);
      World.scene.add(flag);
      World.flags.push({ flag, base: geo.attributes.position.array.slice(), ph: i });
    });
  },
  setFlagColors(a, b) {
    World.memo('setFlagColors', arguments); World.flags.forEach((f, i) => f.flag.material.color.set(i % 2 ? b : a).convertSRGBToLinear()); },
  /** Barwy obu klubów na trybunach: szaliki, koszulki, czapki */
  setTeams(h, a) {
    World.memo('setTeams', arguments); Crowd.recolor({ h: [h.kevlar, h.trim], a: [a ? a.kevlar : '#888888', a ? a.trim : '#dddddd'] }); },
  waveFlags(t) {
    World.flags.forEach(F => {
      const pos = F.flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = F.base[i * 3] + 1.6;
        pos.setZ(i, Math.sin(t * 4 + x * 1.8 + F.ph) * 0.18 * (x / 3.2));
      }
      pos.needsUpdate = true;
    });
  },

  /** Race w sektorze gospodarzy: czerwone światło i dym przez kilka sekund */
  celebrate(sec = 5) {
    World.flareT = sec;
    if (!World.flareLights) {
      World.flareLights = [-30, 0, 30].map(x => { const l = new THREE.PointLight(0xff3a1a, 0, 30, 1.6); l.position.set(x, 3, Track.R + 14); (World.realScene || World.scene).add(l); return l; });
    }
  },
  flareTick(dt) {
    if (!World.flareLights) return;
    World.flareT = Math.max(0, (World.flareT || 0) - dt);
    World.flareLights.forEach(l => {
      l.intensity = World.flareT > 0 ? 1.4 + Math.random() * 1.2 : 0;
      if (World.flareT > 0 && Math.random() < 0.6) World.emit(World.smoke, l.position.x + (Math.random() - 0.5) * 3, 2.5, l.position.z, (Math.random() - 0.5) * 0.6, 1.4, -0.4, 4);
    });
  },

  /* ---------- motocykl i zawodnik ---------- */
  tube(a, b, r, mat) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 8), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  },

  wheel(r, tyre, chrome) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.075, 10, 30), tyre));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r - 0.07, 0.012, 6, 30), chrome));
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2 * r - 0.14, 4), chrome);
      sp.rotation.z = i * Math.PI / 12; g.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), chrome);
    hub.rotation.x = Math.PI / 2; g.add(hub);
    return g;
  },

  makeBike(x) {
    const b = Bike.build(x);
    World.linearize(b.root);
    RiderModel.attach(b); // zawodnik z modelu człowieka (jeśli już wczytany)
    World.scene.add(b.root);
    return b;
  },

  setRiders(riders) {
    Object.values(World.bikes).forEach(b => World.scene.remove(b.root));
    World.bikes = {};
    riders.forEach(x => { World.bikes[x.id] = World.makeBike(x); });
  },

  /* ---------- cząsteczki ---------- */
  buildParticles() {
    // miękka, okrągła „kropka” zamiast kwadratów
    World.dotTex = World.canvasTex(64, 64, g => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    // cząsteczki: każda ma własny rozmiar i gaśnie z wiekiem (Points + prosty shader)
    World.pScale = { value: 400 };
    // bardzo miękka plama (gauss) na pył — bez widocznych krawędzi „bąbelków”
    World.softTex = World.canvasTex(64, 64, g => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      for (let i = 0; i <= 10; i++) gr.addColorStop(i / 10, `rgba(255,255,255,${Math.exp(-i * i / 18).toFixed(3)})`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    const mk = (n, size, color, opacity, blending, grow = 0) => {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3).fill(-50), sz = new Float32Array(n).fill(size), al = new Float32Array(n).fill(blending === 'rain' ? 1 : 0);
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
      g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
      const m = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color).convertSRGBToLinear() }, uOpacity: { value: opacity }, uMap: { value: World.dotTex }, uScale: World.pScale },
        vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float uScale;
          void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float dz = -mv.z; vA = aAlpha * smoothstep(1.6, 5.0, dz); gl_PointSize = min(34.0, aSize * uScale / max(0.1, dz)); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uMap; varying float vA;
          void main() { float a = texture2D(uMap, gl_PointCoord).a * vA * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }`,
        transparent: true, depthWrite: false, blending: blending === THREE.AdditiveBlending ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const p = new THREE.Points(g, m); p.frustumCulled = false;
      World.scene.add(p);
      return { p, n, size, grow, pos, sz, al, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n).fill(1), next: 0 };
    };
    // „koguty” spod tylnego koła: grudki czarnego żużla, drobny grys, pył
    World.spray = mk(14000, 0.075, 0x4a4743, 1); // drobny czarny grys (jaśniejszy w świetle jupiterów)
    World.clods = mk(1800, 0.13, 0x2e2c29, 1);
    World.dust = mk(1600, 3.2, 0x6f6a62, 0.07, null, 1.8);
    World.dust.p.material.uniforms.uMap.value = World.softTex;
    World.mist = mk(3500, 0.32, 0x7a746b, 0.2, null, 1.4); // gęsty „wachlarz” tuż za kołem
    World.mist.p.material.uniforms.uMap.value = World.softTex;
    World.sparks = mk(500, 0.045, 0xffc060, 1, THREE.AdditiveBlending);
    World.smoke = mk(400, 3.2, 0xc0504a, 0.16, null, 0.6);
    const rn = 3500;
    World.rain = mk(rn, 0.12, 0xaebfd8, 0.55, 'rain');
    for (let i = 0; i < rn; i++) { World.rain.pos[i * 3] = (Math.random() - 0.5) * 260; World.rain.pos[i * 3 + 1] = Math.random() * 60; World.rain.pos[i * 3 + 2] = (Math.random() - 0.5) * 200; }
    World.rain.p.visible = false;
  },

  emit(sys, x, y, z, vx, vy, vz, life, size) {
    const i = sys.next; sys.next = (sys.next + 1) % sys.n;
    sys.pos[i * 3] = x; sys.pos[i * 3 + 1] = y; sys.pos[i * 3 + 2] = z;
    sys.vel[i * 3] = vx; sys.vel[i * 3 + 1] = vy; sys.vel[i * 3 + 2] = vz;
    sys.life[i] = life; sys.max[i] = life;
    sys.sz[i] = (size || sys.size) * (0.55 + Math.random() * 0.9);
  },

  /** Ruch cząsteczek: grawitacja, opór, lądowanie na torze (grudki zostają chwilę i znikają), wygaszanie */
  updateParticles(sys, dt, gravity, drag) {
    const P = sys.pos, V = sys.vel;
    for (let i = 0; i < sys.n; i++) {
      if (sys.life[i] <= 0) { if (sys.al[i]) { sys.al[i] = 0; P[i * 3 + 1] = -50; } continue; }
      sys.life[i] -= dt;
      V[i * 3 + 1] -= gravity * dt;
      const k = Math.max(0, 1 - drag * dt);
      V[i * 3] *= k; V[i * 3 + 2] *= k; if (gravity < 0) V[i * 3 + 1] *= k;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.03) { // upadła na tor
        P[i * 3 + 1] = 0.03; V[i * 3] *= 0.3; V[i * 3 + 2] *= 0.3; V[i * 3 + 1] = 0;
        if (gravity > 0) sys.life[i] = Math.min(sys.life[i], 0.25);
      }
      const age = 1 - sys.life[i] / sys.max[i];
      sys.al[i] = Math.min(1, sys.life[i] / (sys.max[i] * 0.35)) * Math.min(1, age * 12 + 0.2);
      if (sys.grow) sys.sz[i] += sys.grow * dt;
    }
    const g = sys.p.geometry.attributes;
    g.position.needsUpdate = true; g.aAlpha.needsUpdate = true; g.aSize.needsUpdate = true;
  },

  /**
   * „Kogut”: tylne koło kręci się szybciej niż jedzie motocykl i wyrzuca żużel do tyłu
   * w wachlarzu — w łuku (motocykl bokiem) strumień leci na zewnątrz i wysoko,
   * na prostej przy gazie niżej i wąsko. Ilość zależy od uślizgu i przyspieszenia,
   * liczona na sekundę (niezależnie od liczby klatek).
   */
  roost(b, x, inBend, dt) {
    const yaw = b.root.rotation.y, fx = Math.cos(yaw), fz = -Math.sin(yaw); // przód motocykla
    const rp = b.root.position, wx = rp.x - fx * 0.95, wz = rp.z - fz * 0.95;
    const slide = b.vis ? b.vis.sl : 0, power = Math.min(1, Math.max(0, x.acc) / 6);
    const rate = 350 + slide * 4200 + power * 1600 + (x.s < 25 ? 2000 : 0); // gęsty wachlarz drobnego grysu
    const vmx = x.v * fx, vmz = x.v * fz; // prędkość motocykla
    b.roostAcc = (b.roostAcc || 0) + rate * dt;
    while (b.roostAcc >= 1) {
      b.roostAcc -= 1;
      const spread = (Math.random() - 0.5) * (0.5 + slide * 0.5), c = Math.cos(spread), s = Math.sin(spread);
      const dx = -fx * c + fz * s, dz = -fz * c - fx * s;            // do tyłu względem motocykla, w wachlarzu
      const throwV = 4.5 + Math.random() * (5 + slide * 5), up = 0.45 + Math.random() * (0.5 + slide * 0.7);
      const vx = vmx * 0.35 + dx * throwV, vz = vmz * 0.35 + dz * throwV, vy = throwV * up;
      const big = Math.random() < 0.12;
      World.emit(big ? World.clods : World.spray, wx + (Math.random() - 0.5) * 0.2, 0.15 + Math.random() * 0.35, wz + (Math.random() - 0.5) * 0.2, vx, vy, vz, 0.45 + Math.random() * 0.5);
    }
    b.mistAcc = (b.mistAcc || 0) + (15 + slide * 260 + power * 90 + (x.s < 25 ? 120 : 0)) * dt;
    while (b.mistAcc >= 1) {
      b.mistAcc -= 1;
      const spread = (Math.random() - 0.5) * 0.6, c = Math.cos(spread), s = Math.sin(spread);
      const dx = -fx * c + fz * s, dz = -fz * c - fx * s, tv = 3 + Math.random() * (3 + slide * 3);
      World.emit(World.mist, wx, 0.25 + Math.random() * 0.3, wz, vmx * 0.4 + dx * tv, tv * (0.3 + Math.random() * 0.45), vmz * 0.4 + dz * tv, 0.3 + Math.random() * 0.3);
    }
    b.dustAcc = (b.dustAcc || 0) + (10 + slide * 45 + power * 15) * dt;
    while (b.dustAcc >= 1) {
      b.dustAcc -= 1;
      World.emit(World.dust, wx - fx * 1.2, 0.4 + Math.random() * 0.6, wz - fz * 1.2, vmx * 0.15 - fx * 2 + (Math.random() - 0.5), 0.5 + Math.random() * 0.6, vmz * 0.15 - fz * 2 + (Math.random() - 0.5), 2.2 + Math.random() * 1.6);
    }
  },

  /**
   * Stadion gospodarza meczu: ile ludzi na trybunach (fill 0–1), poziom oświetlenia (1–5)
   * i bandy sponsorów gracza (zastępują domyślne reklamy na części bandy).
   */
  setStadium({ fill = 1, lights = 2, boards = [] } = {}) {
    World.memo('setStadium', arguments);
    People.fill = fill;
    const k = 0.75 + lights * 0.12;
    World.floods.forEach(pl => { pl.intensity = 0.8 * k; });
    if (World.beamMat) World.beamMat.opacity = 0.008 + lights * 0.004;
    World.lampMats.forEach(m => m.color.setRGB(4 * k, 3.8 * k, 3.3 * k));
    World.renderer.toneMappingExposure = 1.13 + lights * 0.04;
    World.boardMats.forEach((m, i) => {
      if (m.map !== World.boardDefault[i]) m.map.dispose();
      m.map = boards.length ? (i % 2 === 0 ? World.boardTex(boards[(i / 2) % boards.length]) : World.boardDefault[i]) : World.boardDefault[i];
      m.needsUpdate = true;
    });
  },

  setConditions(cond) {
    const w = cond.wet;
    World.trackMat.roughness = 0.92 - w * 0.55;
    World.trackMat.envMapIntensity = 0.4 + w * 1.6; // mokry tor odbija jupitery
    World.trackMat.color.setRGB(1 - w * 0.42, 1 - w * 0.55, 1 - w * 0.6).multiply(World.trackTint || new THREE.Color(1, 1, 1));
    World.rain.p.visible = DATA.WEATHER[cond.weather].rain;
  },

  /* ---------- klatka ---------- */
  sync(st, dt, excitement) {
    World.tape.position.y = 0.95 + (st.tapeUp ? Math.min(2.2, (st.t - Sim.TAPE_T) * 9) : 0); // taśmy wystrzeliwują do poprzeczki
    World.startLightMat.color.set(st.stopped ? 0xff2a1a : st.tapeUp ? 0x2aff5a : 0x551111);
    World.frameN = (World.frameN || 0) + 1;

    st.riders.forEach(x => {
      const b = World.bikes[x.id];
      if (!b) return;
      const p = Track.pos(x.s, x.d), f = p.f;
      const inBend = Track.inBend(x.s);
      Bike.update(b, x, dt);
      if (x.moving && x.v > 3 && x.status === 'race' && dt > 0) {
        World.roost(b, x, inBend, dt);
        const back = { x: -f.tx, z: -f.tz };
        // iskry spod stalowego buta (lewa noga po wewnętrznej stronie)
        if (inBend && x.lean > 0.5 && Math.random() < 0.12) {
          const fx = p.x + f.tx * 0.9 + f.tz * 0.35, fz = p.z + f.tz * 0.9 - f.tx * 0.35;
          for (let k = 0; k < 2; k++) World.emit(World.sparks, fx, 0.08, fz, back.x * 3 + (Math.random() - 0.5) * 2, 0.6 + Math.random() * 1.6, back.z * 3 + (Math.random() - 0.5) * 2, 0.2 + Math.random() * 0.25);
        }
        World.markAt(x.s - 0.75, b.vis ? b.vis.rd : x.d, inBend ? 0.05 : 0.025, inBend); // ślad tylnego koła, tam gdzie widać motocykl
        if (inBend) World.dirtFence(dt * 0.0016 * (1 + Math.max(0, x.d))); // grys z tylnego koła leci na bandę (mocniej przy szerokiej jeździe)
      }
    });
    if (World.frameN % 8 === 0) World.marks.needsUpdate = true;
    World.pScale.value = World.renderer.domElement.height / 2;
    World.updateParticles(World.spray, dt, 9.8, 0.9);
    World.updateParticles(World.clods, dt, 9.8, 0.35);
    World.updateParticles(World.mist, dt, 6, 2.2);
    World.updateParticles(World.dust, dt, -0.12, 0.9);
    World.updateParticles(World.sparks, dt, 6, 2);
    World.updateParticles(World.smoke, dt, -0.25, 0.3);
    World.flareTick(dt);
    World.waveFlags(performance.now() / 1000);
    if (World.rain.p.visible) {
      const a = World.rain.pos, cp = World.camera.position;
      for (let i = 0; i < World.rain.n; i++) {
        a[i * 3 + 1] -= 24 * dt;
        if (a[i * 3 + 1] < 0) { a[i * 3] = cp.x + (Math.random() - 0.5) * 120; a[i * 3 + 1] = 40; a[i * 3 + 2] = cp.z + (Math.random() - 0.5) * 120; }
      }
      World.rain.p.geometry.attributes.position.needsUpdate = true;
    }
    const t = performance.now() / 1000;
    Crowd.update(t, dt, excitement);
    (World.marshals || []).forEach((m, i) => { if (m.userData.flag) m.userData.flag.rotation.y = Math.sin(t * 5 + i) * 0.4; });
  },

  /* ---------- kamery ---------- */
  updateCamera(st, dt, followId) {
    const order = Sim.order(st).filter(x => x.status !== 'fell');
    const lead = order[0] || st.riders[0];
    const target = st.riders.find(x => x.id === followId) || lead;
    const lp = Track.pos(lead.s, lead.d);
    const C = World.cam, cam = World.camera;
    let want, look = new THREE.Vector3(lp.x, 1, lp.z), fov = 42, lookSmooth = 1 - Math.pow(0.004, dt);
    let smooth = 1 - Math.pow(0.02, dt);

    if (C.mode === 'tv') {
      want = new THREE.Vector3(lp.x * 0.45, 12, Track.R + 15);
      fov = Math.max(12, Math.min(45, 2 * Math.atan(15 / C.pos.distanceTo(look)) * 180 / Math.PI));
    } else if (C.mode === 'chase') {
      // za plecami prowadzonego zawodnika, lekko nad nim
      const p = Track.pos(target.s - 6.5, target.d + 0.4), ah = Track.pos(target.s + 9, target.d);
      want = new THREE.Vector3(p.x, 2.7, p.z);
      look = new THREE.Vector3(ah.x, 0.9, ah.z);
      fov = 62 + Math.min(12, target.v * 0.25);
      smooth = 1 - Math.pow(0.0005, dt); lookSmooth = 1 - Math.pow(0.0002, dt);
    } else if (C.mode === 'track') {
      const q = Track.pos(Track.B2E + 6, Track.HALF + 2.2);
      want = new THREE.Vector3(q.x, 1.1, q.z); fov = 34;
    } else if (C.mode === 'fence') {
      const q = Track.pos(lead.s - 9, Track.HALF + 4.6);
      want = new THREE.Vector3(q.x, 1.7, q.z); fov = 55;
    } else if (C.mode === 'stand') {
      // miejsce kibica: środek trybuny głównej, 9. rząd — głowa obraca się za prowadzącym
      const row = Math.min(9, (World.V.main.rows || 10) - 2);
      want = new THREE.Vector3(-6, 0.6 + row * 0.62 + 1.25, Track.R + 12 + row * 1.1);
      fov = Math.max(24, Math.min(58, 2 * Math.atan(26 / C.pos.distanceTo(look)) * 180 / Math.PI));
      smooth = 1; lookSmooth = 1 - Math.pow(0.02, dt);
    } else if (C.mode === 'drone') {
      want = new THREE.Vector3(lp.x, 34, lp.z + 16); fov = 50;
    } else {
      const p = Track.pos(target.s, target.d), f = p.f;
      want = new THREE.Vector3(p.x + f.tx * 0.45, 1.45 - target.lean * 0.35, p.z + f.tz * 0.45);
      const ah = Track.pos(target.s + 14, target.d);
      look = new THREE.Vector3(ah.x, 1.0, ah.z);
      fov = 70; smooth = 1; lookSmooth = 1;
      want.y += (Math.random() - 0.5) * 0.03 * Math.min(1, target.v / 20);
    }
    C.pos.lerp(want, smooth);
    C.look.lerp(look, lookSmooth);
    cam.position.copy(C.pos);
    cam.lookAt(C.look);
    if (C.mode === 'helmet') cam.rotateZ(target.lean * 0.6);
    if (C.mode === 'chase') cam.rotateZ(target.lean * 0.15);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
    // światło z cieniami podąża za akcją
    World.key.position.set(lp.x - 50, 110, lp.z + 70); World.key.target.position.set(lp.x, 0, lp.z); World.key.target.updateMatrixWorld();
    Object.entries(World.bikes).forEach(([id, b]) => {
      // etykiety tylko z daleka: z bliska zasłaniałyby tor
      b.tag.visible = C.mode !== 'helmet' && id !== (C.mode === 'chase' ? target.id : null) && cam.position.distanceTo(b.root.position) > 16;
      b.root.visible = !(C.mode === 'helmet' && id === target.id);
    });
  },

  render() {
    // smugi światła z jupiterów widać tylko z góry (kamera TV, dron) — z dołu wyglądały jak szare ściany
    if (World.beamMat) World.beamMat.visible = World.camera.position.y > 14;
    if (World.composer) World.composer.render(); else World.renderer.render(World.scene, World.camera); },
};
