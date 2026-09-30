/* =========================================================
   Speedway Empire 3D — prawdziwe modele ludzi na trybunach
   Modele: Quaternius (CC0), pliki w models/ (patrz CREDITS.txt).
   Szkielety z animacjami (siedzenie, oklaski, skok, machanie)
   są „wypiekane” przy starcie: dla kilku klatek każdej animacji
   liczymy pozycje wierzchołków na CPU i zapisujemy jako zwykłą
   geometrię. Każda klatka = jeden InstancedMesh; co 1/15 s każdy
   kibic trafia do klatki odpowiadającej jego stanowi i fazie.
   Kolory koszulki, skóry, włosów i spodni są per kibic (atrybuty
   instancji podmieniane w shaderze), więc 3000 osób wygląda różnie.
   Jeśli modele się nie wczytają (np. otwarcie z file://), zostaje
   prostsza tłumka z crowd.js.
   ========================================================= */
'use strict';

const People = {
  ready: false,
  FILES: [
    { f: 'man1', k: 'm' }, { f: 'man2', k: 'm' }, { f: 'man3', k: 'm' }, { f: 'man4', k: 'm' },
    { f: 'woman1', k: 'w' }, { f: 'woman2', k: 'w' },
  ],
  // poza → [animacja, liczba klatek, od (0–1), do (0–1)]
  POSES: {
    m: { sit: ['Man_Sitting', 1, 0.5, 0.5], idle: ['Man_Idle', 2, 0, 0.5], clap: ['Man_Clapping', 8, 0, 1], jump: ['Man_Jump', 8, 0, 1], walk: ['Man_Walk', 8, 0, 1] },
    w: { idle: ['Idle', 2, 0, 0.5], clap: ['Wave', 8, 0, 1], jump: ['Wave', 8, 0, 1], walk: ['Walk', 8, 0, 1] },
  },
  HEIGHT: { m: 1.76, w: 1.66 },
  models: [], people: [], acc: 0, fill: 1,

  /** Maska części ciała: 1 koszulka, 2 skóra, 3 włosy, 4 spodnie, 0 bez zmian */
  mask(mat, node) {
    const n = mat.name || '';
    if (/^Hair/.test(n)) return 3;
    if (n === 'Skin') return 2;
    if (n === 'Shirt' || /_Body/.test(node)) return 1;
    if (n === 'Pants' || /_Legs/.test(node)) return 4;
    return 0;
  },

  load(onDone) {
    // modele wypiekamy raz; kolejne stadiony tylko podpinają gotowe
    if (People.ready) { onDone && onDone(); return; }
    (People._cbs = People._cbs || []).push(onDone);
    if (People._loading) return;
    People._loading = true;
    onDone = () => { const cbs = People._cbs; People._cbs = []; cbs.forEach(f => f && f()); };
    if (!THREE.GLTFLoader || location.protocol === 'file:') return;
    const L = new THREE.GLTFLoader();
    Promise.all(People.FILES.map(o => new Promise((res, rej) => L.load('models/' + o.f + '.glb', g => res({ ...o, g }), null, rej))))
      .then(list => {
        People.models = list.map(o => People.bakeModel(o));
        People.ready = true;
        onDone && onDone();
      })
      .catch(e => console.warn('Modele kibiców niedostępne, zostaje prosta tłumka', e));
  },

  /** Jedna klatka animacji → BufferGeometry (pozycje w przestrzeni świata modelu) */
  bakeFrame(g, clipName, time) {
    const root = g.scene;
    const mixer = new THREE.AnimationMixer(root);
    const clip = g.animations.find(a => a.name.split('|').pop() === clipName);
    mixer.clipAction(clip).play();
    mixer.setTime(time);
    root.updateMatrixWorld(true);
    const pos = [], col = [], msk = [], idx = [];
    const v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isSkinnedMesh) return;
      o.skeleton.update();
      const P = o.geometry.attributes.position, base = pos.length / 3;
      const m = People.mask(o.material, o.name), c = o.material.color;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        o.boneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); msk.push(m);
      }
      const I = o.geometry.index;
      if (I) for (let i = 0; i < I.count; i++) idx.push(base + I.getX(i));
      else for (let i = 0; i < P.count; i++) idx.push(base + i);
    });
    mixer.stopAllAction();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('mask', new THREE.Float32BufferAttribute(msk, 1));
    geo.setIndex(idx);
    return geo;
  },

  bakeModel(o) {
    const poses = People.POSES[o.k], frames = {};
    for (const [name, [clipName, n, a, b]] of Object.entries(poses)) {
      const clip = o.g.animations.find(x => x.name.split('|').pop() === clipName);
      frames[name] = [];
      for (let i = 0; i < n; i++) frames[name].push(People.bakeFrame(o.g, clipName, clip.duration * (a + (b - a) * (n > 1 ? i / n : 0))));
    }
    // skala i środek z pozy stojącej; model patrzy w +z → obracamy, by patrzył w +x jak reszta ludzi
    const ref = frames.idle[0]; ref.computeBoundingBox();
    const bb = ref.boundingBox, k = People.HEIGHT[o.k] / (bb.max.y - bb.min.y);
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, y0 = bb.min.y;
    // uproszczenie siatki: wierzchołki bliżej niż ~4 cm (w pozie stojącej) łączymy w jeden,
    // to samo mapowanie dla każdej klatki → 3–4× mniej wierzchołków przy 3000 kibicach
    const map = People.cluster(ref, People.CELL / k);
    for (const pose in frames) frames[pose] = frames[pose].map(geo => People.simplify(geo, map));
    const all = Object.values(frames).flat();
    all.forEach(geo => {
      geo.translate(-cx, -y0, -cz); geo.scale(k, k, k); geo.rotateY(Math.PI / 2);
      geo.computeVertexNormals(); geo.computeBoundingSphere();
    });
    if (frames.sit) { // siedzący: miednica na wysokości siedziska (y spotu)
      frames.sit.forEach(geo => geo.translate(0, -0.42, 0));
    }
    return { k: o.k, name: o.f, frames, meshes: {} };
  },

  CELL: 0.04,

  cluster(geo, cell) {
    const P = geo.attributes.position, C = geo.attributes.color, M = geo.attributes.mask;
    const keys = new Map(), rep = new Int32Array(P.count), keep = [];
    for (let i = 0; i < P.count; i++) {
      const key = Math.round(P.getX(i) / cell) + ',' + Math.round(P.getY(i) / cell) + ',' + Math.round(P.getZ(i) / cell) + ',' + M.getX(i) + ',' + C.getX(i).toFixed(3);
      let r = keys.get(key);
      if (r === undefined) { r = keep.length; keep.push(i); keys.set(key, r); }
      rep[i] = r;
    }
    const idx = [], I = geo.index;
    for (let t = 0; t < I.count; t += 3) {
      const a = rep[I.getX(t)], b = rep[I.getX(t + 1)], c = rep[I.getX(t + 2)];
      if (a !== b && b !== c && a !== c) idx.push(a, b, c);
    }
    return { keep, idx };
  },

  simplify(geo, map) {
    const out = new THREE.BufferGeometry();
    ['position', 'color', 'mask'].forEach(n => {
      const A = geo.attributes[n], s = A.itemSize, arr = new Float32Array(map.keep.length * s);
      map.keep.forEach((i, j) => { for (let c = 0; c < s; c++) arr[j * s + c] = A.array[i * s + c]; });
      out.setAttribute(n, new THREE.BufferAttribute(arr, s));
    });
    out.setIndex(map.idx);
    return out;
  },

  material() {
    if (People._mat) return People._mat;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float mask; attribute vec3 iShirt; attribute vec3 iSkin; attribute vec3 iHair; attribute vec3 iPants;`)
        .replace('#include <color_vertex>', `#include <color_vertex>
          if (mask > 0.5 && mask < 1.5) vColor.xyz = iShirt;
          else if (mask > 1.5 && mask < 2.5) vColor.xyz = iSkin;
          else if (mask > 2.5 && mask < 3.5) vColor.xyz = iHair;
          else if (mask > 3.5) vColor.xyz = iPants;`);
    };
    return (People._mat = m);
  },

  /** Zamiana prostej tłumki z crowd.js na modele */
  attach(scene, crowdPeople) {
    if (!People.ready) return;
    const women = People.models.filter(m => m.k === 'w'), men = People.models.filter(m => m.k === 'm');
    const cap = new Map();
    // przechodnie (kibice idący z parkingu na stadion) — włączani w trybie spaceru
    const walkers = Array.from({ length: People.WALKERS }, () => ({ x: 0, y: 0, z: 0, yaw: 0, seated: false, fan: 0, ph: Math.random() * 6, walker: true }));
    People.people = crowdPeople.concat(walkers).map(p => {
      const model = !p.seated && Math.random() < (p.walker ? 0.45 : 0.35) ? Crowd.pick(women) : Crowd.pick(men);
      cap.set(model, (cap.get(model) || 0) + 1);
      const q = { p, model, h: 0.93 + Math.random() * 0.12, speed: 0.85 + Math.random() * 0.3, c: new Float32Array(12), r: Math.random() };
      People.colorize(q);
      return q;
    });
    const mat = People.material();
    People.models.forEach(model => {
      const n = cap.get(model) || 0;
      if (!n) return;
      for (const [pose, list] of Object.entries(model.frames)) {
        model.meshes[pose] = list.map(geo => {
          const g = geo.clone();
          ['iShirt', 'iSkin', 'iHair', 'iPants'].forEach(a => g.setAttribute(a, new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)));
          const im = new THREE.InstancedMesh(g, mat, n);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          im.frustumCulled = false; im.count = 0;
          scene.add(im);
          return im;
        });
      }
    });
    People.update(0, 0, 0);
  },

  colorize(q, colors) {
    const p = q.p, C = Crowd, lin = h => new THREE.Color(h).convertSRGBToLinear();
    const tc = p.team && colors ? colors[p.team] : null;
    const shirt = p.shirt || (p.shirt = C.pick(C.JACKETS));
    const set = (o, c) => { q.c[o] = c.r; q.c[o + 1] = c.g; q.c[o + 2] = c.b; };
    set(0, lin(tc && q.fanShirt ? tc[q.fanShirt - 1] : shirt));
    set(3, lin(q.skin || (q.skin = C.pick(C.SKIN))));
    set(6, lin(q.hair || (q.hair = C.pick(C.HAIR))));
    set(9, lin(q.pants || (q.pants = C.pick(C.PANTS))));
  },

  recolor(colors) {
    People.people.forEach(q => {
      if (q.p.team) q.fanShirt = Math.random() < 0.6 ? (Math.random() < 0.72 ? 1 : 2) : 0;
      People.colorize(q, colors);
    });
  },

  /** Pojedyncza postać z modelu: poza 'idle' | 'sit' | 'clap', kolory [koszulka, skóra, włosy, spodnie] */
  makeStatic(pose, cols, frame = 0) {
    const model = Crowd.pick(People.models.filter(m => m.k === 'm'));
    const list = model.frames[pose] || model.frames.idle;
    const geo = list[frame % list.length].clone(), n = geo.attributes.position.count;
    const lin = h => new THREE.Color(h).convertSRGBToLinear();
    ['iShirt', 'iSkin', 'iHair', 'iPants'].forEach((a, j) => {
      const c = lin(cols[j]), arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute(a, new THREE.BufferAttribute(arr, 3));
    });
    const mesh = new THREE.Mesh(geo, People.material());
    mesh.castShadow = true;
    return mesh;
  },

  /** Stojąca postać z obsługi toru (starter, mechanicy): prosta bryła → model */
  swapPerson(g, o) {
    const special = o.pose && o.pose !== 'stand';
    if (!g.userData.swapQueued) { g.userData.swapQueued = true; (Crowd.swapped = Crowd.swapped || []).push({ g, o }); }
    if (special && !Humans.ready) return; // chorąży, fotoreporter — czekają na realistycznych ludzi (zostaje prosta postać)
    if (!Humans.ready && !People.ready) return; // nic jeszcze nie wczytane — podmiana później (Humans.load / People.load)
    if (g.userData.swapMesh) { g.remove(g.userData.swapMesh); g.userData.swapMesh = null; }
    g.children.forEach(ch => { ch.visible = false; });
    let mesh;
    if (Humans.ready) {
      const key = o.key || (o.role && Humans.byRole(o.role)) || (o.jacket === '#EDEDED' ? Humans.byRole('official') : null);
      mesh = Humans.make(key, o.anim || (o.pose === 'crouch' ? 'crouch' : 'idle'), { sex: 'm' });
      if (o.pose === 'flag') g.userData.flag = World.attachFlag(mesh, o.flag || '#F2C230');
      if (o.pose === 'crouch' || o.pose === 'camera') World.attachCamera(mesh, o.pose === 'camera');
    } else mesh = People.makeStatic('idle', [o.jacket || Crowd.pick(Crowd.JACKETS), o.skin || Crowd.pick(Crowd.SKIN), o.cap || o.hair || Crowd.pick(Crowd.HAIR), o.pants || Crowd.pick(Crowd.PANTS)]);
    g.add(mesh); g.userData.swapMesh = mesh; g.userData.swapHuman = !!Humans.ready;
  },

  WALKERS: 40, walk: null,
  /** Wpisz postać do instancji (macierz + kolory) */
  put(im, q, p) {
    const i = im.count++;
    const k = q.h, cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), a = im.instanceMatrix.array, o = i * 16;
    a[o] = cy * k; a[o + 1] = 0; a[o + 2] = -sy * k; a[o + 3] = 0;
    a[o + 4] = 0; a[o + 5] = k; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = sy * k; a[o + 9] = 0; a[o + 10] = cy * k; a[o + 11] = 0;
    a[o + 12] = p.x; a[o + 13] = p.y; a[o + 14] = p.z; a[o + 15] = 1;
    const G = im.geometry.attributes;
    G.iShirt.array.set(q.c.subarray(0, 3), i * 3); G.iSkin.array.set(q.c.subarray(3, 6), i * 3);
    G.iHair.array.set(q.c.subarray(6, 9), i * 3); G.iPants.array.set(q.c.subarray(9, 12), i * 3);
  },
  /**
   * Przechodnie: People.walk = { from: [{x,z}...], to: [{x,z}...] } — idą z losowego punktu
   * startu do losowego celu (np. z parkingu do bram), potem zaczynają od nowa.
   */
  stepWalker(q, dt) {
    const p = q.p, W = People.walk;
    if (!q.tgt || Math.hypot(q.tgt.x - p.x, q.tgt.z - p.z) < 0.6) {
      const a = Crowd.pick(W.from), b = Crowd.pick(W.to), back = Math.random() < 0.3;
      const s = back ? b : a, e = back ? a : b;
      if (!q.tgt) { p.x = s.x + (Math.random() - 0.5) * 6; p.z = s.z + (Math.random() - 0.5) * 3; } // bez teleportu — z miejsca, w którym stoi
      q.tgt = { x: e.x + (Math.random() - 0.5) * 3, z: e.z + (Math.random() - 0.5) * 2 };
      q.v = 1.1 + Math.random() * 0.5;
    }
    const dx = q.tgt.x - p.x, dz = q.tgt.z - p.z, d = Math.hypot(dx, dz) || 1;
    p.x += dx / d * q.v * People.dtAcc; p.z += dz / d * q.v * People.dtAcc;
    p.yaw = Math.atan2(-dz, dx); p.y = 0;
  },

  /** Rozdział kibiców na klatki animacji — wywoływane z Crowd.update */
  update(t, dt, excitement) {
    People.acc += dt;
    if (People.acc < 1 / 15 && dt) return;
    People.dtAcc = People.acc; People.acc = 0;
    People.models.forEach(m => Object.values(m.meshes).forEach(list => list.forEach(im => { im.count = 0; })));
    const waveX = Crowd.waveT != null ? -70 + (t - Crowd.waveT) * 22 : null;
    for (const q of People.people) {
      const p = q.p;
      if (p.walker) {
        if (!People.walk) continue;
        People.stepWalker(q, dt);
        const list = q.model.meshes.walk, ph = ((t * 1.05 * q.speed + p.ph) / 1.04) % 1, im = list[Math.floor(ph * list.length) % list.length];
        People.put(im, q, p);
        continue;
      }
      if (q.r > People.fill) continue; // frekwencja: wolne miejsca zostają puste
      let e = excitement * p.fan;
      if (waveX != null && p.z > 0) e = Math.max(e, Math.exp(-Math.pow((p.x - waveX) / 4, 2)));
      let pose = e > 0.55 ? 'jump' : e > 0.3 ? 'clap' : p.seated ? 'sit' : 'idle';
      if (pose === 'jump' && p.seated && waveX == null) pose = 'clap';
      const list = q.model.meshes[pose] || q.model.meshes.idle;
      const dur = pose === 'jump' ? 1.04 : pose === 'clap' ? 1.67 : 4;
      const ph = ((t * q.speed + p.ph) / dur) % 1;
      const im = list[Math.floor(ph * list.length) % list.length];
      People.put(im, q, p);
    }
    People.models.forEach(m => Object.values(m.meshes).forEach(list => list.forEach(im => {
      if (!im.count) return;
      im.instanceMatrix.updateRange.count = im.count * 16; im.instanceMatrix.needsUpdate = true;
      const G = im.geometry.attributes;
      ['iShirt', 'iSkin', 'iHair', 'iPants'].forEach(n => { G[n].updateRange.count = im.count * 3; G[n].needsUpdate = true; });
    })));
  },
};
