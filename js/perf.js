/* =========================================================
   Speedway Empire 3D — v2.8: WYDAJNOŚĆ (cel: stałe 60 FPS)
   • dynamiczna rozdzielczość: gdy FPS spada poniżej 50, render
     zmniejsza się krokami do 60%; gdy jest zapas — wraca (Ustawienia →
     Grafika → „Automatyczna rozdzielczość”)
   • cienie co drugą klatkę, gdy komputer nie wyrabia
   • pozostałe instancje miasta (drzewa-billboardy, okna, pasy, znaki,
     płoty) dzielone na kwadraty 160 m z własną sferą — rysowane tylko
     w kadrze (budynki i auta z Miasto.instances dzieli już career14.js)
   • drobne detale (okna, ławki, płoty, latarnie) znikają z daleka
     (odległość zależna od jakości grafiki) — prosty LOD
   • statyczne siatki miasta nie przeliczają macierzy w każdej klatce
   • modele miasta wczytują się w tle, gdy otworzysz zakładkę Miasto,
     więc wejście do 3D jest szybsze (asynchroniczne ładowanie strefy)
   ========================================================= */
'use strict';

const Perf = {
  scale: 1, base: 1, acc: 0, n: 0, last: 0, good: 0, frame: 0, shadowEvery: 1, fps: 60, cells: [], cullT: 0,
  CELL: 160, MIN: 32,
  enabled: () => !(Settings.d && Settings.d.autoRes === false),
  detail() { const q = Settings.d ? Settings.d.quality : 'high'; return q === 'low' ? 140 : q === 'mid' ? 220 : 320; },

  /** Pomiar klatek i dobór rozdzielczości (co 2 s, z histerezą) */
  tick() {
    const now = performance.now(), dt = Perf.last ? now - Perf.last : 16.7; Perf.last = now;
    if (dt > 250) { Perf.acc = 0; Perf.n = 0; return; } // karta w tle, ładowanie
    Perf.acc += dt; Perf.n++;
    if (Perf.acc < 2000) return;
    const fps = Perf.fps = Perf.n * 1000 / Perf.acc; Perf.acc = 0; Perf.n = 0;
    if (!Perf.enabled()) { if (Perf.scale !== 1) Perf.set(1); Perf.shadowEvery = 1; return; }
    if (fps < 50 && Perf.scale > 0.6) { Perf.good = 0; Perf.set(Math.max(0.6, +(Perf.scale - 0.1).toFixed(2))); }
    else if (fps > 58) { if (++Perf.good >= 2 && Perf.scale < 1) { Perf.good = 0; Perf.set(Math.min(1, +(Perf.scale + 0.05).toFixed(2))); } }
    else Perf.good = 0;
    Perf.shadowEvery = fps < 45 || Perf.scale <= 0.7 ? 2 : 1;
  },
  set(sc) {
    const R = World.renderer; Perf.scale = sc; if (!R) return;
    R.setPixelRatio(Math.max(0.35, Perf.base * sc)); World.resize && World.resize();
  },

  /**
   * Instancje rozrzucone po całym mieście → osobna instancja na kwadrat CELL × CELL
   * z własną sferą (atrybuty geometrii współdzielone — pamięć GPU się nie dubluje).
   */
  chunk(root) {
    const list = [];
    // pomijamy instancje edytora mapy (userData.list — edytor szuka egzemplarza po numerze) i te aktualizowane w grze (noChunk)
    const skip = o => { for (let q = o; q && q !== root; q = q.parent) if (q.userData.noChunk || q.isLOD) return true; return false; }; // dzielnica z LOD ma już własne przycinanie
    const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
    // three r128: InstancedMesh ma domyślnie frustumCulled = false; dzielimy tylko ciężkie (drobne pasy, znaki — taniej jednym wywołaniem)
    root.traverse(o => { if (o.isInstancedMesh && !o.frustumCulled && o.count >= Perf.MIN && tris(o.geometry) * o.count > 20000 && !o.userData.list && !skip(o)) list.push(o); });
    const M4 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), C = new THREE.Color();
    list.forEach(im => {
      const geo = im.geometry; if (!geo.boundingSphere) geo.computeBoundingSphere(); const bs = geo.boundingSphere;
      const cells = new Map();
      for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, M4); P.setFromMatrixPosition(M4); const k = Math.floor(P.x / Perf.CELL) + ':' + Math.floor(P.z / Perf.CELL); let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(i); }
      if (cells.size < 2) { Perf.bound(im); return; }
      const parent = im.parent; if (!parent) return;
      cells.forEach(idx => {
        const g = new THREE.BufferGeometry(); if (geo.index) g.setIndex(geo.index);
        Object.keys(geo.attributes).forEach(n => g.setAttribute(n, geo.attributes[n])); geo.groups.forEach(gr => g.addGroup(gr.start, gr.count, gr.materialIndex));
        const m = new THREE.InstancedMesh(g, im.material, idx.length);
        const cen = new THREE.Vector3(), pts = [];
        idx.forEach((i, j) => {
          im.getMatrixAt(i, M4); m.setMatrixAt(j, M4); if (im.instanceColor) { im.getColorAt(i, C); m.setColorAt(j, C); }
          M4.decompose(P, Q, S); const c = bs.center.clone().applyMatrix4(M4); pts.push([c, bs.radius * Math.max(S.x, S.y, S.z)]); cen.add(c);
        });
        cen.divideScalar(idx.length);
        g.boundingSphere = new THREE.Sphere(cen, Math.max(...pts.map(([c, r]) => c.distanceTo(cen) + r)) * 1.05 + bs.radius); // zapas na billboardy obracane do kamery
        m.frustumCulled = true; m.castShadow = im.castShadow; m.receiveShadow = im.receiveShadow; m.renderOrder = im.renderOrder; m.layers.mask = im.layers.mask;
        m.onBeforeRender = im.onBeforeRender; m.userData = { ...im.userData, chunk: true, small: bs.radius < 3.5 };
        m.position.copy(im.position); m.quaternion.copy(im.quaternion); m.scale.copy(im.scale);
        parent.add(m);
      });
      parent.remove(im);
    });
  },
  /** Jedna instancja z jednym kwadratem: sfera obejmująca wszystkie egzemplarze (wtedy działa zwykłe przycinanie do kadru) */
  bound(im) {
    const geo = im.geometry, bs = geo.boundingSphere, M4 = new THREE.Matrix4(), cen = new THREE.Vector3(), pts = [];
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, M4); const c = bs.center.clone().applyMatrix4(M4); pts.push(c); cen.add(c); }
    if (!pts.length || im.geometry.userData.shared) return; // geometria używana też gdzie indziej — nie zmieniamy jej sfery
    cen.divideScalar(pts.length); const S = new THREE.Vector3(); let sc = 1; for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, M4); S.setFromMatrixScale(M4); sc = Math.max(sc, S.x, S.y, S.z); }
    const g = new THREE.BufferGeometry(); if (geo.index) g.setIndex(geo.index); Object.keys(geo.attributes).forEach(n => g.setAttribute(n, geo.attributes[n])); geo.groups.forEach(gr => g.addGroup(gr.start, gr.count, gr.materialIndex));
    g.boundingSphere = new THREE.Sphere(cen, Math.max(...pts.map(c => c.distanceTo(cen))) + bs.radius * sc * 2);
    im.geometry = g; im.frustumCulled = true; im.userData.chunk = true; im.userData.small = bs.radius < 3.5;
  },
  /** Statyczne liście drzewa sceny: macierz liczona raz (grupy zostają ruchome: auta, drzwi, edytor) */
  freeze(root) {
    root.updateMatrixWorld(true);
    root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.children.length) { o.updateMatrix(); o.matrixAutoUpdate = false; } });
  },
  unfreeze(root) { root && root.traverse(o => { if (o.isMesh) o.matrixAutoUpdate = true; }); },
  /** Lista kwadratów do przycinania z odległości */
  collect(root) {
    root.updateMatrixWorld(true);
    Perf.cells = [];
    root.traverse(o => {
      if (!o.isInstancedMesh || !o.frustumCulled || !o.geometry.boundingSphere || !(o.userData.chunk || o.userData.list)) return;
      const C = o.userData.fk && Furn.cache[o.userData.fk], small = o.userData.chunk ? o.userData.small : !!C && Math.max(C.size.x, C.size.y, C.size.z) * 1.6 < 7; // ławki, latarnie, auta
      Perf.cells.push({ m: o, c: o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld), r: o.geometry.boundingSphere.radius, small });
    });
  },
  /** Detale z daleka znikają (4× na sekundę; mgła i tak je zasłania) */
  cull() {
    const now = performance.now(); if (now - Perf.cullT < 250 || !Perf.cells.length || !World.camera) return; Perf.cullT = now;
    if (typeof MapEdit !== 'undefined' && MapEdit.on) { Perf.cells.forEach(c => { c.m.visible = true; }); return; } // widok z góry edytora
    const cam = World.camera.position, det = Perf.detail(), far = (World.scene.fog && World.scene.fog.far) || 800;
    Perf.cells.forEach(c => { const d = cam.distanceTo(c.c) - c.r; c.m.visible = d < (c.small ? det : far + 40); });
  },
  /** Modele miasta w tle (bez budowania świata), gdy gracz patrzy na mapę miasta */
  prefetch() {
    if (Perf._pre || typeof Miasto === 'undefined' || typeof Furn === 'undefined') return;
    const keys = Miasto.keys(); if (Furn.ready(keys)) { Perf._pre = true; return; }
    Perf._pre = true; const go = () => Furn.load(keys, () => {});
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
  },
};

(() => {
  // rozdzielczość bazowa z ustawień, skala dynamiczna na wierzchu
  const ba = Settings.apply;
  Settings.apply = function () {
    const r = ba.apply(this, arguments), R = World.renderer;
    if (R) { Perf.base = R.getPixelRatio(); if (Perf.scale !== 1) { R.setPixelRatio(Math.max(0.35, Perf.base * Perf.scale)); World.resize && World.resize(); } }
    return r;
  };
  const bsr = Settings.render;
  Settings.render = function () {
    bsr.apply(this, arguments);
    if (Settings.tab !== 'gfx') return;
    const fps = document.querySelector('#settings input[data-set="fps"]'); if (!fps) return;
    fps.closest('label').insertAdjacentHTML('afterend', `<label class="set-row"><span>Automatyczna rozdzielczość (utrzymuje ~60 FPS)</span><input type="checkbox" data-set="autoRes" ${Perf.enabled() ? 'checked' : ''}><b>${Perf.scale < 1 ? Math.round(Perf.scale * 100) + '%' : ''}</b></label>`);
  };
  // pomiar, cienie co n klatek, przycinanie z odległości
  const br = World.render;
  World.render = function () {
    Perf.tick();
    const R = World.renderer;
    if (R && R.shadowMap.enabled) { const n = Perf.shadowEvery; R.shadowMap.autoUpdate = n <= 1; if (n > 1 && Perf.frame % n === 0) R.shadowMap.needsUpdate = true; }
    Perf.frame++;
    if (typeof Walk !== 'undefined' && Walk.room === 'miasto') Perf.cull();
    return br.apply(this, arguments);
  };
  // po zbudowaniu miasta: kwadraty instancji, zamrożone macierze
  const bm = Miasto.make;
  Miasto.make = function () {
    const r = bm.apply(this, arguments);
    try { const G = Miasto.G; if (G) { Perf.chunk(G); Perf.freeze(G); Perf.collect(G); } } catch (e) { console.warn('Perf', e); }
    return r;
  };
  // edytor mapy przesuwa obiekty — wtedy wszystko ruchome
  if (typeof MapEdit !== 'undefined' && MapEdit.toggle) {
    const bt = MapEdit.toggle;
    MapEdit.toggle = function (on) { if (on !== false) Perf.unfreeze(Miasto.G); return bt.apply(this, arguments); };
  }
  // modele miasta w tle
  const bcr = Career.render;
  Career.render = function () { const r = bcr.apply(this, arguments); if (Career.tab === 'kmiasto') Perf.prefetch(); return r; };
})();
