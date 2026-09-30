/* =========================================================
   Speedway Empire 3D — v2.4: kolejne modele z Sketchfab (CC-BY)
   • miasto: bloki z wielkiej płyty i chruszczowki, garaże,
     Żuk w ruchu ulicznym, maszty oświetlenia stadionu, bramki i brama START,
     motocykle zaparkowane pod stadionem, asfalt z oznakowaniem
   • dom rodzinny: meblościanka, telewizor, pokój z dzieciństwa, zlew
   • biuro klubu: kaktus, kaloryfer, magnetofon szpulowy, kask retro
   Autorzy i licencje: models/CREDITS.txt
   ========================================================= */
Object.assign(Furn.SRC, {
  prlB12: 'sk/blk12.glb', prlB5: 'sk/blk5.glb', prlBSov: 'sk/blkSov.glb', prlBEnter: 'sk/blkEnter.glb', prlKhrush: 'sk/khrush.glb',
  kioskK67: 'sk/kioskK67.glb', garSov: 'sk/garSov.glb', zuk: 'sk/zuk.glb', stadLight: 'sk/stadLight.glb', startLine: 'sk/startLine.glb',
  turnstile: 'sk/turnstile.glb', bikeJawa: 'sk/bikeJawa.glb', bikeTracker: 'sk/bikeTracker.glb', bikeDirt: 'sk/bikeDirt.glb',
  wallUnit: 'sk/wallUnit.glb', prlTV: 'sk/tvPRL.glb', room90: 'sk/room90.glb', roadsRu: 'sk/roadsRu.glb',
  officeSet: 'sk/officeSet.glb', kitchenSet: 'sk/kitchenSet.glb', helmetRetro: 'sk/helmetRetro.glb', trackOval: 'sk/trackOval.glb',
});
Furn.SRC.prlBlock9 = 'sk/blkSov.glb'; // 9-piętrowiec z wielkiej płyty (na osiedlu skalowany do 28 m)

/** Pojedyncze elementy zestawów: klucz → [zestaw, numer elementu] */
Furn.PART = {
  bikeRed: ['bikeDirt', 'dirt_bike red'], bikeBlue: ['bikeDirt', 'dirt_bikeblue'], bikeWhite: ['bikeDirt', 'dirt_bike white'], bikeYellow: ['bikeDirt', 'dirt_bike yellow'],
  retroDesk: ['officeSet', 'Object_68'], retroChair: ['officeSet', 'Object_107'], retroPC: ['officeSet', 'Object_10'], cactus: ['officeSet', 'Object_4'], radiator: ['officeSet', 'Object_75'], reelTape: ['officeSet', 'Object_70'], deskLamp: ['officeSet', 'Object_109'],
  prlSink: ['kitchenSet', 'Object_90'], gasBottles: ['kitchenSet', 'Object_70'], gasHob: ['kitchenSet', 'Object_78'],
};

Object.keys(Furn.PART).forEach(k => { Furn.SRC[k] = ''; });

Object.assign(Furn.FIX, {
  prlBSov: { ry: Math.PI / 2, s: 24 }, prlBlock9: { ry: Math.PI / 2 }, prlBEnter: { ry: Math.PI / 2 }, prlKhrush: { ry: Math.PI / 2, s: 2.3 },
  stadLight: { drop: ['Plane'] }, wallUnit: { ry: Math.PI / 2 }, prlTV: { ry: Math.PI }, room90: { ry: Math.PI },
  bikeJawa: Math.PI / 2, bikeTracker: Math.PI / 2,
});

(() => {
  // wczytanie części: zestaw ładuje się raz, element dostaje własny wpis w cache
  const partOf = (setKey, i) => {
    const C = Furn.cache[setKey]; if (!C) return null;
    const src = C.scene; src.updateMatrixWorld(true);
    let list = src.children; while (list.length === 1 && list[0].children.length && !list[0].isMesh) list = list[0].children;
    // 'Przedrostek*' — wszystkie elementy o nazwie zaczynającej się tak (np. części jednego budynku z paczki)
    const nodes = typeof i === 'string' && i.endsWith('*') ? list.filter(o => (o.name || '').startsWith(i.slice(0, -1)))
      : [typeof i === 'string' ? (list.find(o => o.name === i) || list.find(o => (o.name || '').startsWith(i))) : list[i]].filter(Boolean);
    if (!nodes.length) return null;
    const g = new THREE.Group();
    nodes.forEach(n => { const o = n.clone(true); n.matrixWorld.decompose(o.position, o.quaternion, o.scale); g.add(o); });
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    return { scene: g, size: box.getSize(new THREE.Vector3()), min: box.min.clone(), c: box.getCenter(new THREE.Vector3()) };
  };
  const bl = Furn.load;
  Furn.load = function (keys, cb) {
    const parts = keys.filter(k => Furn.PART[k] && !Furn.cache[k]);
    if (!parts.length) return bl.call(this, keys, cb);
    const all = [...new Set([...keys.filter(k => !Furn.PART[k]), ...parts.map(k => Furn.PART[k][0])])];
    return bl.call(this, all, () => {
      parts.forEach(k => { const [s, i] = Furn.PART[k]; const P = partOf(s, i); if (P) { Furn.cache[k] = P; Furn.fix && Furn.fix(k); } });
      cb && cb();
    });
  };
  Furn.ready = keys => keys.every(k => Furn.cache[k]);

  /* ---------- miasto ---------- */
  const M = Miasto;
  M.FILL.splice(M.FILL.length - 2, 0, 'prlB5', 'prlB12', 'prlBSov', 'prlBEnter', 'prlKhrush', 'prlB5', 'prlBSov', 'prlKhrush');
  M.LEN.zuk = 4.4;
  M.CARS.push('zuk', 'zuk');
  const bk = M.keys;
  M.keys = function () { return [...new Set([...bk.call(this), 'zuk', 'stadLight', 'startLine', 'turnstile', 'bikeJawa', 'bikeTracker', 'bikeRed', 'bikeBlue', 'bikeYellow', 'garSov', 'roadsRu'])]; };

  // maszty oświetlenia stadionu zamiast latarni
  const bi = M.instances;
  M.instances = function (parent, k, list) {
    if (k === 'lampCity' && list.length === 4 && Furn.cache.stadLight && list[0].s > M.scaleFor('lampCity', { h: 20 })) {
      const s = M.scaleFor('stadLight', { h: 26 });
      return bi.call(this, parent, 'stadLight', list.map(it => ({ ...it, s, r: it.r + Math.PI })));
    }
    return bi.call(this, parent, k, list);
  };

  // ruch uliczny: Żuk
  const bm = M.make;
  M.make = function (...a) {
    const r = bm.apply(this, a);
    try { M.extras2(); } catch (e) { console.warn('Miasto v2.4', e); }
    return r;
  };
  M.extras2 = function () {
    const G = M.G; if (!G) return;
    const S = M.stadium();
    // brama START nad wejściem, bramki biletowe, zaparkowane motocykle
    const gz = S.z + M.SR.z + 3;
    Furn.place(G, 'startLine', S.x, 0, gz + 7, 0, { w: 13 });
    [-6.2, 6.2].forEach(dx => Furn.place(G, 'turnstile', S.x + dx, 0, gz - 0.5, 0, { w: 2.6 }));
    ['bikeJawa', 'bikeRed', 'bikeTracker', 'bikeBlue', 'bikeYellow'].forEach((k, i) => Furn.place(G, k, S.x + 12 + i * 1.3, 0, gz + 3, 0.25, { w: 2.1 }));
    // Żuk w ruchu
    const segs = M.segs();
    ['zuk', 'zuk'].forEach((k, i) => {
      const s = segs[(i * 7 + 3) % segs.length], len = M.LEN[k], g = Furn.place(G, k, 0, 0, 0, 0, { w: len }); if (!g) return;
      M.traffic.push({ g, k, hl: len / 2, seg: segs.indexOf(s), t: Math.random() * s.len, dir: i % 2 ? 1 : -1, v: 8 + Math.random() * 2, police: false });
    });
    // asfalt z oznakowaniem (tekstura z „Large modular pack of Russian roads”)
    const RC = Furn.cache.roadsRu; let road = null;
    if (RC) RC.scene.traverse(o => { if (!road && o.isMesh && o.material && o.material.name === 'Road' && o.material.map) road = o.material; });
    if (road) {
      const tex = t => { const c = t.clone(); c.needsUpdate = true; c.wrapS = THREE.ClampToEdgeWrapping; c.wrapT = THREE.RepeatWrapping; c.anisotropy = 8; return c; };
      const mat = new THREE.MeshStandardMaterial({ map: tex(road.map), normalMap: road.normalMap ? tex(road.normalMap) : null, color: 0xb0b0b0, roughness: 0.92, metalness: 0 });
      G.children.forEach(m => {
        if (!m.isMesh || Math.abs(m.position.y - 0.05) > 1e-4 || !m.geometry.parameters || m.geometry.parameters.height == null) return;
        const P = m.geometry.parameters, len = P.width, wd = P.height, pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getZ(i) / wd + 0.5, (pos.getX(i) + len / 2) / (wd * 1.6));
        uv.needsUpdate = true; m.material = mat;
      });
    }
  };

  /* ---------- dom rodzinny ---------- */
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    const F = Rooms.FURN.parents; if (!F) return;
    for (let i = F.length - 1; i >= 0; i--) if (['prlVitrine', 'prlShelf', 'wallClock'].includes(F[i][0])) F.splice(i, 1);
    F.forEach(f => { if (f[0] === 'prlTV') f[5] = { h: 0.5 }; });
    F.push(['wallUnit', -2.7, 0, -5.05, 0, { w: 3.6 }], ['wallClock', 0.6, 2.0, -5.45, 0, {}],
      ['room90', -5.2, 0, 3.75, 0, { w: 3.6 }],
      ['prlSink', 2.6, 0, -5.15, 0, { h: 0.9 }], ['gasBottles', 7.2 - 0.6, 0, -3.6, 0, { h: 0.6 }]);
    const O = Rooms.FURN.office;
    if (O) O.push(['cactus', 0.75, 'top:officeDesk', -2.1, 0, { h: 0.35 }], ['radiator', 5.85, 0, -1.2, -Math.PI / 2, { h: 0.7 }],
      ['reelTape', -5.4, 'top:filing', -1.2, Math.PI / 2, { w: 0.5 }], ['helmetRetro', -2.4, 'top:trophyCab', -4.7, 0, { h: 0.3 }]);
  };
})();
