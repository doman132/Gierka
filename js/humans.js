/* =========================================================
   Speedway Empire 3D — realistyczni ludzie (Microsoft Rocketbox)
   Awatary i animacje: Microsoft Rocketbox Avatar Library,
   licencja MIT (models/rb, patrz CREDITS.txt). Pliki FBX,
   tekstury zmniejszone do 1024 px.
   • Animacja szkieletowa na karcie graficznej (SkinnedMesh +
     AnimationMixer): pełne, płynne ruchy z motion capture.
   • Animacje wstępnie przerobione do models/rb/anims.json
     (tylko kości ciała, 15 kl./s) — 12 MB zamiast 155 MB.
   • Każda postać losuje wariant pozy (np. rozgląda się,
     czeka, drapie się po głowie), własne tempo i fazę.
   • Miednica jest „przypięta” w poziomie — postać nie
     odjeżdża ani nie cofa się przy powtórzeniu cyklu.
   • Wczytywanie etapami: najpierw zestaw podstawowy, reszta
     postaci w tle.
   ========================================================= */
'use strict';

const Humans = {
  ready: false, A: {}, clips: { m: {}, f: {} }, live: [], _q: new THREE.Quaternion(), _v: new THREE.Vector3(), _p: new THREE.Vector3(), _x: new THREE.Quaternion(),
  LIST: [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 20].map(i => ({ k: 'Male_Adult_' + String(i).padStart(2, '0'), s: 'm' })),
    { k: 'Male_Adult_12', s: 'm', role: 'trainer' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17].map(i => ({ k: 'Female_Adult_' + String(i).padStart(2, '0'), s: 'f' })), { k: 'Female_Party_01', s: 'f' }, { k: 'Female_Party_02', s: 'f' },
    { k: 'Business_Male_02', s: 'm', role: 'president' }, { k: 'Medical_Male_01', s: 'm', role: 'doctor' },
    { k: 'Construction_Male_02', s: 'm', role: 'mechanic', hide: /helmet/i }, // niebieska kurtka robocza, bez kasku
    { k: 'Security_Male_01', s: 'm', role: 'security' }, { k: 'Police_Male_01', s: 'm', role: 'police' }, { k: 'Medical_Male_02', s: 'm', role: 'paramedic' },
    { k: 'Business_Male_01', s: 'm', role: 'vip' }, { k: 'Business_Male_03', s: 'm', role: 'official' },
    { k: 'Delivery_Male_01', s: 'm' }, { k: 'Wood_Male_01', s: 'm' },
  ],
  // zestaw wczytywany od razu (reszta w tle)
  CORE: ['Male_Adult_01', 'Male_Adult_03', 'Male_Adult_05', 'Male_Adult_08', 'Male_Adult_10', 'Male_Adult_15', 'Male_Adult_17', 'Male_Adult_12', 'Female_Adult_01', 'Female_Adult_04',
    'Business_Male_02', 'Medical_Male_01', 'Construction_Male_02', 'Security_Male_01', 'Business_Male_03'],
  // poza → warianty animacji (każda postać losuje jeden)
  POSES: {
    idle: ['idle_neutral_01', 'idle_neutral_02', 'idle_look_around_01', 'idle_breathe_01', 'idle_waiting_01', 'idle_scratch_head_01'],
    sit: ['sit_chair_idle_neutral_01', 'sit_chair_idle_look_around', 'sit_chair_breathe_01'],
    cheer: ['cheer_01', 'cheer_03'], clap: ['claphands_01'], wave: ['wave_01'],
    walk: ['walk_neutral_01', 'walk_neutral_02', 'walk_stroll_01'],
    dance: ['dancing_neutral', 'dancing_cool'], drink: ['drink_idle'], phone: ['cell_phone_talk_01'],
    talk: ['gestic_talk_neutral_01', 'gestic_talk_relaxed_01', 'gestic_listen_neutral_01'],
    work: ['work_table', 'work_mid'],
    crouch: ['crouch_idle', 'crouch_gestic'], photo: ['take_picture'],
  },
  HEIGHT: { m: 1.78, f: 1.67 },
  casual(sex) { return Humans.LIST.filter(a => !a.role && Humans.A[a.k] && (!sex || a.s === sex)).map(a => a.k); },
  byRole(role) { const a = Humans.LIST.find(x => x.role === role); return a ? a.k : null; },

  /** Zestaw podstawowy: animacje + CORE; cb, gdy gotowe */
  load(cb) {
    if (Humans.ready) { cb && cb(); return; }
    (Humans._cbs = Humans._cbs || []).push(cb);
    if (Humans._loading || !THREE.FBXLoader || !THREE.SkeletonUtils || location.protocol === 'file:') return;
    Humans._loading = true;
    const anims = fetch('models/rb/anims.json').then(r => r.json()).then(J => Humans.parseClips(J));
    Promise.all([anims, ...Humans.CORE.map(k => Humans.loadAvatar(k))]).then(() => {
      Humans.fixClips();
      Humans.ready = true;
      const c = Humans._cbs; Humans._cbs = []; c.forEach(f => f && f());
      // pozostałe postacie dociągamy w tle, po dwie naraz
      const rest = Humans.LIST.map(a => a.k).filter(k => !Humans.A[k]);
      const next = () => { const k = rest.shift(); if (k) Humans.loadAvatar(k).then(next, next); };
      setTimeout(() => { next(); next(); }, 2500);
    }).catch(e => console.warn('Awatary Rocketbox niedostępne', e));
  },

  parseClips(J) {
    Object.entries(J.clips).forEach(([name, c]) => {
      const tracks = c.t.map(([tn, vals]) => {
        const sz = tn.endsWith('.quaternion') ? 4 : 3, n = vals.length / sz, times = new Float32Array(n);
        for (let i = 0; i < n; i++) times[i] = i / J.fps;
        return new (sz === 4 ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack)(tn, times, new Float32Array(vals));
      });
      const clip = new THREE.AnimationClip(name, c.d, tracks);
      Humans.clips[name[0]][name.slice(2)] = clip;
    });
  },

  loadAvatar(k) {
    if (Humans.A[k]) return Promise.resolve();
    if (Humans._pend && Humans._pend[k]) return Humans._pend[k];
    const a = Humans.LIST.find(x => x.k === k); if (!a) return Promise.resolve();
    if (!Humans._L) {
      const M = new THREE.LoadingManager();
      // FBX odwołuje się do plików .tga — tekstury podpinamy sami (jpg/png), więc zapytania o tga kierujemy na pusty obrazek
      M.setURLModifier(u => (/\.tga$/i.test(u) ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' : u));
      Humans._L = new THREE.FBXLoader(M); Humans._TL = new THREE.TextureLoader();
    }
    Humans._pend = Humans._pend || {};
    return (Humans._pend[k] = new Promise((res, rej) => Humans._L.load(`models/rb/${k}/${k}.fbx`, root => {
      // FBX z 3ds Max niesie własne światła i kamery — wyrzucamy (inaczej każda postać rozjaśnia scenę)
      const junk = []; root.traverse(o => { if (o.isLight || o.isCamera) junk.push(o); }); junk.forEach(o => o.parent.remove(o));
      let mesh; root.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      const base = `models/rb/${k}/`;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => {
        const opac = /opacity/i.test(m.name);
        const tex = Humans._TL.load(base + m.name + '_color.' + (opac ? 'png' : 'jpg'));
        tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
        const mm = new THREE.MeshStandardMaterial({ map: tex, skinning: true, roughness: 0.78, metalness: 0, alphaTest: opac ? 0.45 : 0, side: opac ? THREE.DoubleSide : THREE.FrontSide });
        if (a.hide && a.hide.test(m.name)) mm.visible = false;
        mm.userData.lin = true; mm.userData.shared = true;
        return mm;
      });
      mesh.material = mats; mesh.castShadow = true; mesh.receiveShadow = false;
      const rest = []; root.traverse(o => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
      const A = Humans.A[k] = { ...a, root, mesh, mats, rest, rootPos: root.position.clone() };
      Humans.reset(A); Humans.measure(A);
      res();
    }, null, e => { console.warn('Brak awatara', k, e); rej(e); })));
  },

  /**
   * Animacje zapisano w innym układzie osi (3ds Max, oś Z w górę) niż awatary — korygujemy
   * obrót i pozycję kości głównej Bip01: q' = Qfix·q, p' = p_spocz + Qfix·(p − p0).
   */
  fixClips() {
    const A0 = Object.values(Humans.A)[0], bip = A0.rest.find(([b]) => b.name === 'Bip01');
    if (!bip || Humans._fixed) return;
    Humans._fixed = true;
    const restQ = bip[2], restP = bip[1];
    ['m', 'f'].forEach(sx => Object.values(Humans.clips[sx]).forEach(clip => {
      const tq = clip.tracks.find(t => t.name === 'Bip01.quaternion'), tp = clip.tracks.find(t => t.name === 'Bip01.position');
      if (!tq) return;
      const q0 = new THREE.Quaternion().fromArray(tq.values, 0), fix = restQ.clone().multiply(q0.clone().invert()), q = new THREE.Quaternion();
      for (let i = 0; i < tq.values.length; i += 4) { q.fromArray(tq.values, i); q.premultiply(fix); q.toArray(tq.values, i); }
      if (tp) {
        const p0 = new THREE.Vector3().fromArray(tp.values, 0), v = new THREE.Vector3();
        for (let i = 0; i < tp.values.length; i += 3) { v.fromArray(tp.values, i).sub(p0).applyQuaternion(fix); v.x = 0; v.z = 0; v.add(restP); v.toArray(tp.values, i); }
        // usuń liniowy dryf (koniec cyklu = początek) — bez „piłokształtnego” opadania i skoku przy zapętleniu
        const n = tp.values.length / 3;
        if (n > 2) for (let c = 0; c < 3; c++) { const d = tp.values[(n - 1) * 3 + c] - tp.values[c]; for (let i = 0; i < n; i++) tp.values[i * 3 + c] -= d * i / (n - 1); }
      }
    }));
  },

  reset(A) { A.rest.forEach(([b, p, q, s]) => { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); }); A.root.quaternion.identity(); A.root.position.copy(A.rootPos); A.root.updateMatrixWorld(true); },

  /** Skala do metrów i środek (z pozy spoczynkowej, skinning na CPU tylko raz na awatar) */
  measure(A) {
    const ref = Humans.skin(A); ref.computeBoundingBox(); const b = ref.boundingBox; ref.dispose();
    A.norm = { k: Humans.HEIGHT[A.s] / (b.max.y - b.min.y), cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, y0: b.min.y };
    // orientacja miednicy w spoczynku (względem rodzica korzenia)
    const chain = Humans.chain(A.root);
    A.restX = Humans.chainQ(chain, new THREE.Quaternion());
  },
  skin(A) {
    const root = A.root, mesh = A.mesh, G = mesh.geometry;
    root.updateMatrixWorld(true); mesh.skeleton.update();
    const P = G.attributes.position.array, SI = G.attributes.skinIndex.array, SW = G.attributes.skinWeight.array, BM = mesh.skeleton.boneMatrices;
    const n = P.length / 3, pos = new Float32Array(n * 3);
    const bind = mesh.bindMatrix.elements, binv = mesh.bindMatrixInverse.elements, W = mesh.matrixWorld.elements, m = new Float32Array(16);
    for (let i = 0; i < n; i++) {
      m.fill(0);
      for (let j = 0; j < 4; j++) { const w = SW[i * 4 + j]; if (!w) continue; const o = SI[i * 4 + j] * 16; for (let k = 0; k < 16; k++) m[k] += BM[o + k] * w; }
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      let a = bind[0] * x + bind[4] * y + bind[8] * z + bind[12], b = bind[1] * x + bind[5] * y + bind[9] * z + bind[13], c = bind[2] * x + bind[6] * y + bind[10] * z + bind[14];
      const a2 = m[0] * a + m[4] * b + m[8] * c + m[12], b2 = m[1] * a + m[5] * b + m[9] * c + m[13], c2 = m[2] * a + m[6] * b + m[10] * c + m[14];
      a = binv[0] * a2 + binv[4] * b2 + binv[8] * c2 + binv[12]; b = binv[1] * a2 + binv[5] * b2 + binv[9] * c2 + binv[13]; c = binv[2] * a2 + binv[6] * b2 + binv[10] * c2 + binv[14];
      pos[i * 3] = W[0] * a + W[4] * b + W[8] * c + W[12]; pos[i * 3 + 1] = W[1] * a + W[5] * b + W[9] * c + W[13]; pos[i * 3 + 2] = W[2] * a + W[6] * b + W[10] * c + W[14];
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  },

  /** Węzły od dziecka korzenia do miednicy */
  chain(root) {
    const pel = root.getObjectByName('Bip01_Pelvis'), out = [];
    for (let o = pel; o && o !== root; o = o.parent) out.unshift(o);
    return out;
  },
  chainQ(chain, q) { q.identity(); chain.forEach(o => q.multiply(o.quaternion)); return q; },
  chainP(chain, p) { const q = Humans._x.identity(); p.set(0, 0, 0); chain.forEach(o => { p.add(Humans._v.copy(o.position).applyQuaternion(q)); q.multiply(o.quaternion); }); return p; },

  /**
   * Po każdej klatce: obrót korzenia tak, by miednica była pionowo jak w spoczynku (animacje Rocketbox
   * obracają szkielet o 90°), i przesunięcie w poziomie do punktu zakotwiczenia (bez „odjeżdżania”).
   * Zwraca poziome położenie miednicy przed korektą (do pomiaru długości kroku).
   */
  settle(h) {
    const r = h.root, X = Humans.chainQ(h.chain, Humans._q);
    r.quaternion.copy(h.A.restX).multiply(X.invert());
    const p = Humans.chainP(h.chain, Humans._p).multiply(r.scale).applyQuaternion(r.quaternion);
    if (h.anchor) { r.position.x = h.A.rootPos.x + h.anchor.x - p.x; r.position.z = h.A.rootPos.z + h.anchor.z - p.z; }
    r.position.y = h.A.rootPos.y + (h.dy || 0); // uziemienie (siedzenie, kucanie)
    return p;
  },

  /** Postać: key = awatar (null = losowy przechodzień), pose = poza; zwraca Group gotowy do sceny */
  make(key, pose = 'idle', o = {}) {
    if (!Humans.ready) return null;
    const want = key;
    if (key && !Humans.A[key]) { Humans.loadAvatar(key); key = null; }
    const sx = want && Humans.LIST.find(x => x.k === want);
    key = key || Crowd.pick(Humans.casual(sx ? sx.s : o.sex) .length ? Humans.casual(sx ? sx.s : o.sex) : Humans.casual());
    const A = Humans.A[key];
    const root = THREE.SkeletonUtils.clone(A.root);
    root.traverse(c => { if (c.isSkinnedMesh) { c.material = A.mats; c.castShadow = true; } });
    const inner = new THREE.Group(); inner.position.set(-A.norm.cx, -A.norm.y0, -A.norm.cz); inner.add(root);
    const wrap = new THREE.Group(); wrap.rotation.y = Math.PI / 2; wrap.scale.setScalar(A.norm.k); wrap.add(inner);
    const g = new THREE.Group(); g.add(wrap);
    // wariant animacji
    const names = (Humans.POSES[pose] || Humans.POSES.idle).filter(n => Humans.clips[A.s][n] || Humans.clips.m[n]);
    let cn = o.clip || names[(o.frame != null ? o.frame : Math.floor(Math.random() * 97)) % names.length];
    let clip = cn && (Humans.clips[A.s][cn] || Humans.clips.m[cn]);
    // brak klipu (np. animacja jeszcze się nie wczytała albo nie ma jej w danym zestawie) — zwykła poza stojąca
    if (!clip) { cn = [...names, ...Humans.POSES.idle].find(n => Humans.clips[A.s][n] || Humans.clips.m[n]) || Object.keys(Humans.clips.m)[0]; clip = Humans.clips[A.s][cn] || Humans.clips.m[cn]; }
    if (!clip) return null;
    const mixer = new THREE.AnimationMixer(root), act = mixer.clipAction(clip);
    act.play();
    const h = { A, root, chain: Humans.chain(root), mixer, act, clip, pose, off: 0 };
    // kotwica: miednica w chwili 0; dla chodu — długość kroku (m/s przy tempie 1)
    mixer.setTime(0); Humans.settle(h); h.anchor = Humans.settle(h).clone();
    // stopy na podłodze: animacje siedzenia/kucania podnosiły całe ciało o 20–40 cm
    { g.updateMatrixWorld(true); const v = new THREE.Vector3(); let mn = 1e9;
      ['Bip01_L_Foot', 'Bip01_R_Foot'].forEach(n => { const b = root.getObjectByName(n); if (b) { b.getWorldPosition(v); mn = Math.min(mn, v.y); } });
      const dw = 0.085 - mn; if (mn < 1e8 && Math.abs(dw) > 0.03) { h.dy = dw / A.norm.k; Humans.settle(h); } }
    // siedząc: miednica nad środkiem siedziska (środek postaci = środek krzesła)
    if (pose === 'sit') { g.updateMatrixWorld(true); const v = new THREE.Vector3(); root.getObjectByName('Bip01_Pelvis').getWorldPosition(v); const dx = -0.06 - v.x, dz = -v.z; h.anchor.x += -dz / A.norm.k; h.anchor.z += dx / A.norm.k; Humans.settle(h); }
    if (pose === 'walk') {
      // prędkość chodu z ruchu stopy: w fazie podparcia stopa cofa się względem ciała o długość kroku
      const key2 = cn + ':' + A.k; Humans._stride = Humans._stride || {};
      if (Humans._stride[key2] == null) {
        const foot = root.getObjectByName('Bip01_L_Foot'), v = new THREE.Vector3(); let mn = 1e9, mx = -1e9;
        for (let i = 0; i < 30; i++) { mixer.setTime(clip.duration * i / 30); Humans.settle(h); g.updateMatrixWorld(true); foot.getWorldPosition(v); mn = Math.min(mn, v.x); mx = Math.max(mx, v.x); }
        Humans._stride[key2] = Math.max(0.6, Math.min(1.8, 2 * (mx - mn) / clip.duration));
      }
      h.speed = Humans._stride[key2];
    }
    act.timeScale = o.speed || (0.9 + Math.random() * 0.2);
    act.time = (o.frame != null ? o.frame * 0.37 : Math.random()) * clip.duration % clip.duration;
    mixer.update(0); Humans.settle(h);
    g.userData.human = h;
    Humans.live.push(g);
    return g;
  },
  /** Zgodność ze starym API (animacja idzie centralnie w update) */
  tick() {},

  /** Co klatkę: animuj postacie w scenie i blisko kamery */
  update(dt) {
    if (!Humans.live.length) return;
    const cam = World.camera && World.camera.position, keep = [];
    for (const g of Humans.live) {
      let o = g, inScene = false; while (o) { if (!o.visible) break; if (o.isScene) { inScene = true; break; } o = o.parent; }
      const h = g.userData.human;
      if (!inScene) { h.off += dt; if (h.off < 8) keep.push(g); continue; }
      h.off = 0; keep.push(g);
      if (cam) { const e = g.matrixWorld.elements, d2 = (e[12] - cam.x) ** 2 + (e[13] - cam.y) ** 2 + (e[14] - cam.z) ** 2; if (d2 > 90 * 90) continue; }
      h.mixer.update(dt); Humans.settle(h);
      if (h.post) { g.updateMatrixWorld(true); h.post(h, g, dt); } // pozy dodatkowe (przytulenie, pocałunek)
    }
    Humans.live = keep;
  },
};
