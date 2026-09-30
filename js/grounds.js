/* =========================================================
   Speedway Empire 3D — teren wokół stadionu i szatnia
   Za trybuną główną parking (wielkość i liczba aut rosną
   z inwestycją „Parking”), kasy, sklep kibica; przy parku
   maszyn budynek klubowy (szatnia + biuro prezesa), warsztat,
   centrum medyczne, centrum treningowe i mini-tor szkółki —
   każdy obiekt pojawia się dopiero po rozbudowie.
   Szatnia to osobne wnętrze pod ziemią (y = −40), do którego
   menedżer „wchodzi” przez drzwi budynku klubowego.
   World.hotspots — miejsca, w których można coś zrobić (E),
   World.colliders — prostokąty, przez które nie da się przejść.
   ========================================================= */
'use strict';

Object.assign(World, {
  LOCKER_Y: -40,

  signTex(text, bg = '#1b1b1f', fg = '#f2f2ee', w = 512, h = 112) {
    return World.canvasTex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = 64; g.font = `bold ${size}px "Saira Stencil One", Impact, sans-serif`;
      while (g.measureText(text).width > w - 40 && size > 20) { size -= 4; g.font = `bold ${size}px "Saira Stencil One", Impact, sans-serif`; }
      g.fillText(text, w / 2, h / 2 + 3);
    });
  },

  /** Budynek z elewacją PBR, oknami, szyldem i kolizją; front patrzy w stronę `face` (+x, −x, +z, −z) */
  building({ x, z, w, d, h, sign, signBg, face = '+x', windows = true, collide = true, tex = 'white_stucco', tint = null, roof = 'flat', skip = [] }) {
    World.realBuilding({ x, z, w, d, h, wall: tex, tint, roof, windows, face, skip });
    const f = { '+x': [x + w / 2 + 0.05, z, Math.PI / 2], '-x': [x - w / 2 - 0.05, z, -Math.PI / 2], '+z': [x, z + d / 2 + 0.05, 0], '-z': [x, z - d / 2 - 0.05, Math.PI] }[face];
    if (sign) {
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, d) * 0.9 > 9 ? 9 : Math.max(w, d) * 0.7, 1.6), new THREE.MeshBasicMaterial({ map: World.signTex(sign, signBg) }));
      sg.position.set(f[0] + Math.sin(f[2]) * 0.08, h - 1.0, f[1] + Math.cos(f[2]) * 0.08); sg.rotation.y = f[2];
      World.scene.add(sg);
    }
    if (collide) World.colliders.push({ x0: x - w / 2 - 0.4, x1: x + w / 2 + 0.4, z0: z - d / 2 - 0.4, z1: z + d / 2 + 0.4 });
    World.mapItem(x, z, w, d, sign, '#8a8580');
    return { front: f };
  },

  /**
   * Realistyczny budynek: ściany z tekstury PBR (tynk, elewacja, cegła), cokół, okna z ramą, parapetem
   * i szybą (część świeci nocą), rynny; dach płaski z attyką i agregatami albo dwuspadowy z dachówką.
   * Okna trafiają do wspólnych instancji — rysujemy je hurtem w World.flushWindows().
   */
  realBuilding({ x, z, w, d, h, wall = 'white_stucco', tint = null, roof = 'flat', roofTex = 'clay_roof_tiles_02', windows = true, face = '+x', skip = [], floorH = 3, lit = 0.45, rot = 0, parent = World.scene }) {
    const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = rot; G.userData.batch = true; parent.add(G);
    const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; G.add(o); return o; };
    const box = (bw, bh, bd, m, px, py, pz, ry = 0) => add(World.boxUV(new THREE.BoxGeometry(bw, bh, bd), bw, bh, bd, 3), m, px, py, pz, ry); // UV w metrach (3 m = 1 kafel)
    const wm = World.pbr(wall, 1, 1, { color: tint });
    box(w, h, d, wm, 0, h / 2, 0);
    box(w + 0.08, 0.55, d + 0.08, World.pbr('concrete_floor_02', 1, 1, { color: '#6c6a66' }), 0, 0.27, 0); // cokół
    const steel = World._bSteel || (World._bSteel = new THREE.MeshStandardMaterial({ color: 0x5a5e63, metalness: 0.6, roughness: 0.45 }));
    if (roof === 'gable') {
      const rh = Math.min(w, d) * 0.38, long = w >= d, L = (long ? w : d) + 0.8, S = (long ? d : w) / 2 + 0.5;
      const sh = new THREE.Shape(); sh.moveTo(-S, 0); sh.lineTo(0, rh); sh.lineTo(S, 0); sh.lineTo(-S, 0);
      const rg = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); rg.translate(0, 0, -L / 2); if (long) rg.rotateY(Math.PI / 2);
      // UV dachu z projekcji — dachówka w skali ok. 2 m
      const P = rg.attributes.position, U = rg.attributes.uv;
      for (let i = 0; i < P.count; i++) U.setXY(i, (long ? P.getX(i) : P.getZ(i)) / 2, Math.hypot(long ? P.getZ(i) : P.getX(i), P.getY(i) - rh) / 2);
      add(rg, World.pbr(roofTex, 1, 1), 0, h, 0);
    } else {
      add(new THREE.BoxGeometry(w - 0.3, 0.05, d - 0.3), World._bRoof || (World._bRoof = new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.95 })), 0, h + 0.02, 0); // papa
      const rim = [[0, d / 2, w, 0], [0, -d / 2, w, 0], [w / 2, 0, d, Math.PI / 2], [-w / 2, 0, d, Math.PI / 2]];
      rim.forEach(([ax, az, l, r]) => box(l + 0.25, 0.7, 0.25, wm, ax, h + 0.35, az, r)); // attyka
      rim.forEach(([ax, az, l, r]) => add(new THREE.BoxGeometry(l + 0.35, 0.06, 0.35), steel, ax, h + 0.72, az, r)); // obróbka blacharska
      const ac = World._bAC || (World._bAC = new THREE.MeshStandardMaterial({ color: 0xb8bbbe, metalness: 0.4, roughness: 0.5 }));
      for (let i = 0; i < Math.max(1, Math.floor(w * d / 90)); i++) add(new THREE.BoxGeometry(1.4, 0.9, 1), ac, (Math.random() - 0.5) * (w - 3), h + 0.47, (Math.random() - 0.5) * (d - 3)); // agregaty
    }
    [[w / 2 + 0.1, d / 2 + 0.1], [-w / 2 - 0.1, d / 2 + 0.1], [w / 2 + 0.1, -d / 2 - 0.1], [-w / 2 - 0.1, -d / 2 - 0.1]].forEach(([px, pz]) => add(new THREE.CylinderGeometry(0.06, 0.06, h, 8), steel, px, h / 2, pz)); // rury spustowe
    if (!windows) return G;
    // okna na każdej ścianie: co ~3,2 m, piętra co floorH; pomijamy pas drzwi frontu (skip = [[od, do]] wzdłuż ściany)
    const floors = Math.max(1, Math.floor((h - 0.6) / floorH));
    const sides = [['+z', d / 2, w, 0], ['-z', -d / 2, w, Math.PI], ['+x', w / 2, d, Math.PI / 2], ['-x', -w / 2, d, -Math.PI / 2]];
    const WL = World._win || (World._win = []);
    G.updateMatrixWorld(true);
    sides.forEach(([sd, off, len, ry]) => {
      const n = Math.max(1, Math.floor(len / 3.2)), step = len / n;
      for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
        const u = -len / 2 + step * (i + 0.5), y = 1.6 + f * floorH;
        // u wzdłuż ściany: dla ścian ±x oś z (front +x: u = z rośnie)
        if (sd === face && f === 0 && skip.some(([a, b]) => u > a - 0.9 && u < b + 0.9)) continue;
        const lx = sd.includes('z') ? u : off, lz = sd.includes('z') ? off : u;
        const v = new THREE.Vector3(lx, y, lz).applyMatrix4(G.matrixWorld);
        WL.push({ x: v.x, y: v.y, z: v.z, ry: ry + rot, lit: Math.random() < lit, parent });
      }
    });
    return G;
  },

  /** UV prostopadłościanu w metrach: jeden kafel tekstury = `sc` metrów na każdej ścianie */
  boxUV(geo, w, h, d, sc) {
    const U = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; U.setXY(i, U.getX(i) * dims[f][0] / sc, U.getY(i) * dims[f][1] / sc); }
    return geo;
  },
  /** Scal budynki (grupy z userData.batch) w jedną siatkę na materiał — dziesiątki budynków = kilka wywołań rysowania */
  mergeBuildings(root) {
    const groups = [], byMat = new Map();
    root.children.forEach(c => { if (c.userData.batch) groups.push(c); });
    if (!groups.length) return;
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    groups.forEach(G => G.traverse(o => {
      if (!o.isMesh) return;
      let g = Props.toFloat(o.geometry.clone()); if (g.index) g = g.toNonIndexed();
      if (!g.attributes.uv) { g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); }
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    }));
    groups.forEach(G => root.remove(G));
    byMat.forEach((list, mat) => { const m = new THREE.Mesh(Props.mergeGeos(list), mat); m.castShadow = true; m.receiveShadow = true; root.add(m); });
  },

  /** Wszystkie okna naraz: rama, słupek, parapet, szyba (ciemna odbijająca albo świecąca) — instancje */
  flushWindows() {
    World.mergeBuildings(World.scene);
    const L = World._win || []; World._win = [];
    if (!L.length) return;
    const byParent = new Map(); L.forEach(o => { if (!byParent.has(o.parent)) byParent.set(o.parent, []); byParent.get(o.parent).push(o); });
    const M = World._winM || (World._winM = {
      frame: new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 0.5 }), sill: new THREE.MeshStandardMaterial({ color: 0x8d9094, metalness: 0.5, roughness: 0.4 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x0c1116, metalness: 0.8, roughness: 0.08, envMapIntensity: 1.5 }), lit: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    });
    Object.values(M).forEach(m => { m.userData.lin = true; m.userData.shared = true; });
    const geo = World._winG || (World._winG = { frame: new THREE.BoxGeometry(1.5, 1.55, 0.08), sill: new THREE.BoxGeometry(1.6, 0.06, 0.22), glass: new THREE.PlaneGeometry(1.34, 1.39), mull: new THREE.BoxGeometry(0.06, 1.39, 0.1) });
    Object.values(geo).forEach(g => { g.userData.shared = true; });
    const D = new THREE.Object3D(), warm = [new THREE.Color(1.25, 1.0, 0.62), new THREE.Color(1.1, 0.95, 0.75), new THREE.Color(0.8, 0.9, 1.15)];
    byParent.forEach((list, parent) => {
      const lit = list.filter(o => o.lit), dark = list.filter(o => !o.lit);
      const mk = (g, m, items, dz, dy = 0, color) => {
        if (!items.length) return;
        const im = new THREE.InstancedMesh(g, m, items.length);
        items.forEach((o, i) => { D.position.set(o.x, o.y + dy, o.z); D.rotation.set(0, o.ry, 0); D.translateZ(dz); D.updateMatrix(); im.setMatrixAt(i, D.matrix); if (color) im.setColorAt(i, color(i)); });
        parent.add(im);
      };
      mk(geo.frame, M.frame, list, 0.0); mk(geo.sill, M.sill, list, 0.12, -0.8); mk(geo.mull, M.frame, list, 0.05);
      mk(geo.glass, M.dark, dark, 0.045);
      mk(geo.glass, M.lit, lit, 0.045, 0, i => warm[(i * 7) % 3].clone().multiplyScalar(0.5 + ((i * 13) % 10) / 20));
    });
  },

  /** Dom jednorodzinny: tynk, dach dwuspadowy z dachówką */
  house(x, z, rot) {
    const w = 9 + Math.random() * 3, d = 8 + Math.random() * 2;
    World.realBuilding({ x, z, w, d, h: 6.2, wall: Crowd.pick(['white_stucco', 'yellow_plaster', 'white_plaster_02', 'painted_plaster_wall']), roof: 'gable', roofTex: Crowd.pick(['clay_roof_tiles_02', 'grey_roof_tiles']), rot, floorH: 2.9, lit: 0.35 });
  },
  /** Blok mieszkalny: 4–11 pięter */
  block(x, z, rot, floors) {
    World.realBuilding({ x, z, w: 30 + Math.random() * 30, d: 12, h: floors * 2.9 + 0.6, wall: Crowd.pick(['rectangular_facade_tiles', 'white_stucco', 'yellow_plaster', 'concrete_tile_facade']), roof: 'flat', rot, floorH: 2.9, lit: 0.4 });
  },

  /** Drzwi na elewacji (ciemny prostokąt z podświetloną ramą) */
  door(x, z, rotY, kind = 'metal', sign = null) { return World.realDoor(World.scene, x, 0, z, rotY, { kind, sign }); },

  /** Hala warsztatu: ściany z blachy falistej na stalowej ramie, brama rolowana uchylona (w środku światło), drzwi, rynny */
  workshop(x, z, w, d, h, lvl) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.5, metalness: 0.6 });
    const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; World.scene.add(o); return o; };
    const iron = World.pbr('corrugated_iron', Math.round(d / 2), 2, { color: '#a7adb5', metal: 0.3 }), ironS = World.pbr('corrugated_iron', Math.round(w / 2), 2, { color: '#a7adb5', metal: 0.3 });
    // ściany: tylna, boczne i front z otworem na bramę (6 m)
    add(new THREE.BoxGeometry(0.15, h, d), iron, x - w / 2, h / 2, z);
    add(new THREE.BoxGeometry(w, h, 0.15), ironS, x, h / 2, z - d / 2); add(new THREE.BoxGeometry(w, h, 0.15), ironS, x, h / 2, z + d / 2);
    const gw = 5.6, side = (d - gw) / 2;
    add(new THREE.BoxGeometry(0.15, h, side), iron, x + w / 2, h / 2, z - d / 2 + side / 2); add(new THREE.BoxGeometry(0.15, h, side), iron, x + w / 2, h / 2, z + d / 2 - side / 2);
    add(new THREE.BoxGeometry(0.15, h - 3.6, gw), iron, x + w / 2, 3.6 + (h - 3.6) / 2, z);
    // dach dwuspadowy z okapem, rynny i rury spustowe
    [-1, 1].forEach(sd => { const r = add(new THREE.BoxGeometry(w + 0.8, 0.12, d / 2 + 0.6), World.pbr('corrugated_iron', 4, 3, { color: '#6d737b', metal: 0.4 }), x, h + 0.55, z + sd * d / 4); r.rotation.x = sd * 0.22; });
    [-1, 1].forEach(sd => { add(new THREE.BoxGeometry(w + 0.8, 0.12, 0.14), steel, x, h + 0.1, z + sd * (d / 2 + 0.3)); add(new THREE.CylinderGeometry(0.05, 0.05, h, 8), steel, x + w / 2 + 0.2, h / 2, z + sd * (d / 2 + 0.3)); });
    // brama rolowana: uniesiona do 60 %, pod nią oświetlone wnętrze
    const shutter = add(new THREE.BoxGeometry(0.08, 1.5, gw), World.pbr('painted_metal_shutter', 3, 1, { color: '#8a9098', metal: 0.5 }), x + w / 2 + 0.05, 3.6 - 0.75, z);
    add(new THREE.BoxGeometry(0.3, 0.4, gw + 0.4), steel, x + w / 2 + 0.12, 3.8, z); // skrzynia rolety
    const inside = add(new THREE.PlaneGeometry(gw - 0.1, 2.1), new THREE.MeshBasicMaterial({ color: lvl >= 2 ? new THREE.Color(0.9, 0.8, 0.62) : new THREE.Color(0.18, 0.17, 0.16) }), x + w / 2 - 1.5, 1.05, z, Math.PI / 2);
    add(new THREE.BoxGeometry(3, 0.02, gw), World.pbr('concrete_floor_02', 2, 3), x + w / 2 - 1.5, 0.02, z); // posadzka w bramie
    World.realDoor(World.scene, x + w / 2 + 0.08, 0, z + d / 2 - 1.1, Math.PI / 2, { kind: 'metal', sign: 'WARSZTAT', w: 1.0 });
    // okna w bocznej ścianie
    for (let i = 0; i < Math.floor(w / 3); i++) add(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a2330, roughness: 0.05, metalness: 0.5, emissive: 0x6a5a40, emissiveIntensity: lvl >= 2 ? 0.8 : 0.2 }), x - w / 2 + 1.8 + i * 3, h - 1.2, z - d / 2 - 0.09, Math.PI);
    // naświetlacz nad bramą (hala jest oświetlona nocą)
    const fl = new THREE.PointLight(0xfff1d8, 1.3, 26, 1.5); fl.position.set(x + w / 2 + 2.5, h - 0.4, z); World.scene.add(fl);
    add(new THREE.BoxGeometry(0.25, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.8) }), x + w / 2 + 0.25, h - 0.3, z);
    World.colliders.push({ x0: x - w / 2 - 0.4, x1: x + w / 2 + 0.4, z0: z - d / 2 - 0.4, z1: z + d / 2 + 0.4 });
    World.mapItem(x, z, w, d, 'WARSZTAT', '#8b939c');
    World.workshopProps = [['tyre', x + w / 2 + 1.2, 0, z - d / 2 + 0.8], ['tyre', x + w / 2 + 1.2, 0.24, z - d / 2 + 0.8], ['tyre', x + w / 2 + 1.25, 0.48, z - d / 2 + 0.8], ['barrel', x + w / 2 + 0.9, 0, z + d / 2 - 2.6], ['barrel', x + w / 2 + 1.6, 0, z + d / 2 - 2.9], ['trash', x + w / 2 + 1.0, 0, z - d / 2 + 2.2]];
  },

  /** Element minimapy: prostokąt z podpisem */
  mapItem(x, z, w, d, label, color) { (World.mapItems = World.mapItems || []).push({ x, z, w, d, label, color }); },

  /**
   * Granica terenu klubu: ogrodzenie panelowe (siatka zgrzewana na słupkach, betonowa podmurówka)
   * dookoła stadionu, parkingu i budynków — dalej spacer nie prowadzi.
   */
  perimeter(b) {
    World.bounds = b;
    const mesh = World.canvasTex(128, 128, g => { g.clearRect(0, 0, 128, 128); g.strokeStyle = '#2f4a38'; g.lineWidth = 3; for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); } for (let j = 0; j <= 128; j += 64) { g.beginPath(); g.moveTo(0, j); g.lineTo(128, j); g.stroke(); } g.lineWidth = 5; g.beginPath(); g.moveTo(0, 40); g.lineTo(128, 40); g.stroke(); });
    mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
    const post = new THREE.MeshStandardMaterial({ color: 0x2f4a38, metalness: 0.5, roughness: 0.5 }), base = World.pbr('concrete_floor_02', 1, 1, { color: '#8e8b86' });
    const sides = [[b.x0, b.z0, b.x1, b.z0], [b.x1, b.z0, b.x1, b.z1], [b.x1, b.z1, b.x0, b.z1], [b.x0, b.z1, b.x0, b.z0]];
    sides.forEach(([ax, az, bx, bz]) => {
      const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(-(bz - az), bx - ax), cx = (ax + bx) / 2, cz = (az + bz) / 2;
      const t = mesh.clone(); t.needsUpdate = true; t.repeat.set(L / 2.5, 1);
      const pnl = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.8), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }));
      pnl.position.set(cx, 1.3, cz); pnl.rotation.y = ang; World.scene.add(pnl);
      const bs = new THREE.Mesh(World.boxUV(new THREE.BoxGeometry(L, 0.4, 0.2), L, 0.4, 0.2, 3), base); bs.position.set(cx, 0.2, cz); bs.rotation.y = ang; World.scene.add(bs);
      const n = Math.floor(L / 2.5), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), post, n + 1), D = new THREE.Object3D();
      for (let i = 0; i <= n; i++) { const f = i / n; D.position.set(ax + (bx - ax) * f, 1.15, az + (bz - az) * f); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }
      World.scene.add(im);
    });
    const th = 0.6; World.colliders.push({ x0: b.x0 - th, x1: b.x1 + th, z0: b.z0 - th, z1: b.z0 + th }, { x0: b.x0 - th, x1: b.x1 + th, z0: b.z1 - th, z1: b.z1 + th }, { x0: b.x0 - th, x1: b.x0 + th, z0: b.z0, z1: b.z1 }, { x0: b.x1 - th, x1: b.x1 + th, z0: b.z0, z1: b.z1 });
  },

  /**
   * Plac budowy: ogrodzenie, rusztowania, żuraw wieżowy, kontener biura budowy, szkielet budynku rosnący
   * z postępem prac, lampy robocze, robotnicy i tablica „BUDOWA” z liczbą tygodni do końca.
   */
  site(x, z, w, d, h, frac, label, left) {
    const conc = World.pbr('concrete_floor_02', 1, 1, { color: '#a4a19b' }), add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; World.scene.add(o); return o; };
    // wykop / płyta fundamentowa i szkielet: słupy co 4 m, strop na wysokości postępu
    add(World.boxUV(new THREE.BoxGeometry(w, 0.3, d), w, 0.3, d, 3), conc, x, 0.15, z);
    const hh = Math.max(0.6, h * Math.min(1, 0.15 + frac * 0.9));
    for (let ix = -w / 2 + 0.4; ix <= w / 2 - 0.3; ix += 4) for (let iz = -d / 2 + 0.4; iz <= d / 2 - 0.3; iz += 4) add(new THREE.BoxGeometry(0.4, hh, 0.4), conc, x + ix, 0.3 + hh / 2, z + iz);
    if (frac > 0.35) add(World.boxUV(new THREE.BoxGeometry(w, 0.25, d), w, 0.25, d, 3), conc, x, 0.3 + hh, z);
    // pręty zbrojeniowe wystające ze słupów
    const rebar = new THREE.MeshStandardMaterial({ color: 0x5a3a28, metalness: 0.6, roughness: 0.6 });
    for (let ix = -w / 2 + 0.4; ix <= w / 2 - 0.3; ix += 4) add(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), rebar, x + ix, 0.3 + hh + 0.6, z - d / 2 + 0.4);
    // żuraw wieżowy
    World.crane(x + w / 2 + 3, z - d / 2 - 3, 18 + h, 22, Math.atan2(z, x) + Math.PI);
    // tablica budowy
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshBasicMaterial({ map: World.canvasTex(512, 196, g => {
      g.fillStyle = '#f2c21a'; g.fillRect(0, 0, 512, 196); g.fillStyle = '#111'; g.fillRect(8, 8, 496, 180); g.fillStyle = '#f2c21a';
      g.font = 'bold 54px "Saira Stencil One", Impact, sans-serif'; g.textAlign = 'center'; g.fillText('BUDOWA', 256, 66);
      g.fillStyle = '#fff'; g.font = 'bold 30px Barlow, sans-serif'; g.fillText(label, 256, 118); g.fillText(`koniec za ${left} tyg. · ${Math.round(frac * 100)}%`, 256, 160);
    }) }));
    sg.position.set(x + w / 2 + 1.5, 2.2, z + d / 2 + 1.5); sg.rotation.y = Math.atan2(-x, -z) || 0; World.scene.add(sg);
    World.scene.add(Bike.tube([sg.position.x - 1.9, 0, sg.position.z], [sg.position.x - 1.9, 1.4, sg.position.z], 0.05, rebar)); World.scene.add(Bike.tube([sg.position.x + 1.9, 0, sg.position.z], [sg.position.x + 1.9, 1.4, sg.position.z], 0.05, rebar));
    // lampy robocze
    [[-1, -1], [1, 1]].forEach(([sx, sz]) => { const l = new THREE.PointLight(0xfff2d0, 1.1, 30, 1.6); l.position.set(x + sx * (w / 2 + 1), 5, z + sz * (d / 2 + 1)); World.scene.add(l); add(new THREE.BoxGeometry(0.5, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2) }), l.position.x, 5, l.position.z); });
    World.colliders.push({ x0: x - w / 2 - 1.2, x1: x + w / 2 + 1.2, z0: z - d / 2 - 1.2, z1: z + d / 2 + 1.2 });
    World.hotspot('site', x + w / 2 + 2, z + d / 2 + 2, `Plac budowy: ${label} — zostało ${left} tyg.`, 3);
    World.mapItem(x, z, w + 2, d + 2, 'BUDOWA', '#c9a227');
    // rusztowania, ogrodzenie, kontener (modele wczytywane w tle)
    const list = [];
    for (let i = -w / 2 + 1.5; i < w / 2 - 1; i += 3.2) list.push(['scaffold', x + i, 0, z + d / 2 + 0.9, 0]);
    for (let i = -w / 2 - 1; i < w / 2 + 1.5; i += 3.3) { list.push(['siteFence', x + i, 0, z + d / 2 + 2.6, 0]); list.push(['siteFence', x + i, 0, z - d / 2 - 1.4, 0]); }
    for (let i = -d / 2 - 1; i < d / 2 + 2; i += 3.3) { list.push(['siteFence', x - w / 2 - 1.4, 0, z + i, Math.PI / 2]); list.push(['siteFence', x + w / 2 + 1.4, 0, z + i, Math.PI / 2]); }
    list.push(['siteCabin', x - w / 2 - 5, 0, z, Math.PI / 2]);
    const G = World.scene;
    Furn.load(['scaffold', 'siteFence', 'siteCabin'], () => list.forEach(([k, px, py, pz, r]) => { if (G.parent) Furn.place(G, k, px, py, pz, r, {}); }));
    // robotnicy
    if (Humans.ready) [[x - w / 4, z + d / 2 + 1.5, 'work'], [x + w / 4, z - d / 2 - 0.6, 'idle'], [x, z + d / 2 + 1.8, 'talk']].forEach(([px, pz, a]) => { const m = Humans.make(Humans.byRole('mechanic'), a, { sex: 'm' }); m.position.set(px, 0, pz); m.rotation.y = Math.random() * 6; World.scene.add(m); });
  },

  /** Żuraw wieżowy: kratownicowa wieża, wysięgnik, przeciwwysięgnik z balastem, kabina, lina z hakiem */
  crane(x, z, H, L, rot) {
    const Y = World._craneM || (World._craneM = new THREE.MeshStandardMaterial({ color: 0xf2b705, metalness: 0.4, roughness: 0.5 }));
    const g = new THREE.Group(); g.position.set(x, 0, z); World.scene.add(g);
    const leg = (sx, sz, y) => [sx * 0.9, y, sz * 0.9];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], k, arr) => { g.add(Bike.tube(leg(sx, sz, 0), leg(sx, sz, H), 0.06, Y, 5)); const [nx, nz] = arr[(k + 1) % 4]; for (let y = 0; y < H; y += 2) g.add(Bike.tube(leg(sx, sz, y), leg(nx, nz, y + 2), 0.03, Y, 4)); });
    const top = new THREE.Group(); top.position.y = H; top.rotation.y = rot; g.add(top);
    const jib = (len, dir) => { for (let i = 0; i < len; i += 2) { top.add(Bike.tube([dir * i, 0, -0.6], [dir * (i + 2), 0, -0.6], 0.04, Y, 4)); top.add(Bike.tube([dir * i, 0, 0.6], [dir * (i + 2), 0, 0.6], 0.04, Y, 4)); top.add(Bike.tube([dir * i, 0, 0.6], [dir * (i + 2), 1.1, 0], 0.03, Y, 4)); top.add(Bike.tube([dir * i, 1.1, 0], [dir * (i + 2), 1.1, 0], 0.04, Y, 4)); } };
    jib(L, 1); jib(L * 0.35, -1);
    top.add(Bike.tube([0, 0, 0], [0, 4, 0], 0.1, Y, 6)); // wierzchołek
    top.add(Bike.tube([0, 4, 0], [L * 0.9, 1.1, 0], 0.02, Y, 3)); top.add(Bike.tube([0, 4, 0], [-L * 0.35, 1.1, 0], 0.02, Y, 3)); // odciągi
    const ball = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.9 })); ball.position.set(-L * 0.33, -0.6, 0); top.add(ball);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.4), Y); cab.position.set(1.2, -1, 1.4); top.add(cab);
    const hx = L * 0.6; top.add(Bike.tube([hx, 0, 0], [hx, -H * 0.6, 0], 0.015, new THREE.MeshStandardMaterial({ color: 0x222222 }), 3));
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0xd02020 })); hook.position.set(hx, -H * 0.6, 0); top.add(hook);
    const warn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2) })); warn.position.set(0, 4.2, 0); top.add(warn); // światło ostrzegawcze
    World.colliders.push({ x0: x - 1.4, x1: x + 1.4, z0: z - 1.4, z1: z + 1.4 });
  },

  /** Rzeczy z modeli wokół budynków (opony, beczki, kosze, latarnie, hydrant) — wczytywane przy spacerze */
  outdoorProps() {
    const list = (World.workshopProps || []).slice(), zB = (World.mainBack || 60) + 3, pw = 60 + (World.fac.parking || 1) * 16;
    for (let i = 0; i < 4; i++) list.push(['streetLamp', -pw / 2 + pw * (i + 0.5) / 4, 0, zB + 10 + 15, 0]);
    list.push(['hydrant', -8, 0, zB + 1.2], ['trash', 9, 0, zB + 1.3], ['trash', -20, 0, zB + 1.3], ['barrier', -(World.mainLen || 90) / 2 - 5, 0, zB + 9]);
    const keys = [...new Set(list.map(l => l[0]))];
    Furn.load(keys, () => {
      (World.outdoor || []).forEach(o => { if (o.parent) o.parent.remove(o); });
      World.outdoor = list.map(([k, x, y, z, r]) => { const g = Furn.place(World.venueGroup, k, x, y, z, r || 0, {}); if (g && k !== 'streetLamp') World.colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 }); return g; }).filter(Boolean);
    });
  },

  hotspot(id, x, z, label, r = 2.4) { World.hotspots.push({ id, x, z, label, r }); },

  /** Zwykły samochód osobowy z dwóch brył (nadwozie + kabina), kolory z instancji */
  buildGrounds() {
    const fac = World.fac, S2 = Track.STRAIGHT / 2, R = Track.R;
    const zB = (World.mainBack || R + 28) + 3, x0 = -(S2 + R + 18);
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.95 });
    const white = new THREE.MeshBasicMaterial({ color: 0xcfcfcf });

    /* --- parking za trybuną główną --- */
    const pw = 60 + (fac.parking || 1) * 16, pd = 30, pz = zB + 10 + pd / 2;
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), World.pbr('asphalt_02', pw / 8, pd / 8)); lot.rotation.x = -Math.PI / 2; lot.position.set(0, 0.02, pz); lot.receiveShadow = true; World.scene.add(lot);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(6, zB - R - 8 + 10), World.pbr('concrete_pavement', 2, Math.round((zB - R + 2) / 3))); path.rotation.x = -Math.PI / 2; path.position.set(-(World.mainLen || 90) / 2 - 5, 0.02, (zB + R + 8) / 2); World.scene.add(path);
    const spotsPerRow = Math.floor(pw / 2.8) - 1, rowsZ = [zB + 13, zB + 10 + pd - 3];
    const line = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 5), white, spotsPerRow * 2 + 2);
    const D = new THREE.Object3D(); let li = 0;
    rowsZ.forEach(rz => { for (let i = 0; i <= spotsPerRow; i++) { D.position.set(-pw / 2 + 1.4 + i * 2.8, 0.03, rz); D.rotation.set(-Math.PI / 2, 0, 0); D.updateMatrix(); line.setMatrixAt(li++, D.matrix); } });
    line.count = li; World.scene.add(line);
    const cars = Math.min(spotsPerRow * 2, 6 + (fac.parking || 1) * 9);
    if (Props.ready) {
      const per = {}, taken2 = new Set();
      for (let i = 0; i < cars; i++) {
        let k; do { k = Math.floor(Math.random() * spotsPerRow * 2); } while (taken2.has(k)); taken2.add(k);
        const row = k % 2, x = -pw / 2 + 2.8 + Math.floor(k / 2) * 2.8, z = rowsZ[row] + (row ? -0.2 : 0.2);
        const key = Crowd.pick(Props.CARS);
        (per[key] = per[key] || []).push({ x, z, rot: (row ? -1 : 1) * Math.PI / 2 + (Math.random() - 0.5) * 0.06, color: Crowd.pick(Props.PAINT) });
        World.colliders.push({ x0: x - 1.15, x1: x + 1.15, z0: z - 2.5, z1: z + 2.5 }); // przez auta nie da się przejść
      }
      Object.entries(per).forEach(([k, items]) => World.scene.add(Props.instanced(k, items)));
    }
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(4.2, 0.75, 1.8), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), cars);
    const cab = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.62, 1.62), new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.1, metalness: 0.8 }), cars);
    const colors = ['#e8e8e8', '#1c1c1e', '#8a1d1d', '#2e4466', '#707478', '#b8b8b0', '#1f3d2a', '#c9a227', '#5a2c1c'];
    const taken = new Set();
    for (let i = 0; i < cars; i++) {
      let k; do { k = Math.floor(Math.random() * spotsPerRow * 2); } while (taken.has(k)); taken.add(k);
      const row = k % 2, x = -pw / 2 + 2.8 + Math.floor(k / 2) * 2.8, z = rowsZ[row] + (row ? -0.3 : 0.3);
      D.position.set(x, 0.62, z); D.rotation.set(0, Math.PI / 2 + (Math.random() - 0.5) * 0.08, 0); D.updateMatrix(); body.setMatrixAt(i, D.matrix);
      if (!Props.ready) World.colliders.push({ x0: x - 1.1, x1: x + 1.1, z0: z - 2.3, z1: z + 2.3 });
      body.setColorAt(i, new THREE.Color(Crowd.pick(colors)).convertSRGBToLinear());
      D.position.y = 1.3; D.position.x += 0; D.translateX(-0.2); D.updateMatrix(); cab.setMatrixAt(i, D.matrix);
    }
    body.castShadow = true; if (!Props.ready) { World.scene.add(body); World.scene.add(cab); }
    for (let i = 0; i < 4; i++) { // latarnie
      const lx = -pw / 2 + pw * (i + 0.5) / 4, lz = pz;
      World.scene.add(Bike.tube([lx, 0, lz], [lx, 7, lz], 0.1, new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.6, roughness: 0.4 })));
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 3.1, 2.4) })); head.position.set(lx, 7, lz); World.scene.add(head);
      if (i % 2 === 0) { const pl = new THREE.PointLight(0xffe2b0, 0.9, 42, 1.6); pl.position.set(lx + pw / 8, 6.5, lz); World.scene.add(pl); }
    }
    World.hotspot('parking', pw * 0.2, pz, 'Porozmawiaj z kibicami na parkingu', 4);
    World.mapItem(0, pz, pw, pd, 'PARKING', '#4a4b4f');
    World.spawn = { x: -3, z: zB + 22, yaw: 0 };

    /* --- kasy i sklep kibica przy wejściu --- */
    const kasa = World.building({ x: 4, z: zB + 4.5, w: 4, d: 2.4, h: 2.8, sign: 'KASY BILETOWE', signBg: '#1F4FB0', face: '+z', windows: false, tex: 'concrete_tile_facade' });
    World.door(4, zB + 5.72, 0, 'glass');
    World.hotspot('ticket', 4, zB + 7, 'Kasy biletowe — cena biletu');
    if ((fac.shop || 0) >= 1) {
      const w = 4 + fac.shop * 1.2;
      World.building({ x: -10, z: zB + 4.8, w, d: 3, h: 3, sign: 'SKLEP KIBICA', signBg: '#E0632E', face: '+z', windows: false, tex: 'painted_plaster_wall', tint: '#e8b090' });
      const awn = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.1, 1.6), new THREE.MeshStandardMaterial({ color: 0xe0632e, roughness: 0.7 })); awn.position.set(-10, 2.5, zB + 7); awn.rotation.x = 0.2; World.scene.add(awn);
      World.hotspot('shop', -10, zB + 7.6, 'Sklep kibica');
    }

    /* --- budynek klubowy przy parku maszyn: szatnia i biuro --- */
    const cx = x0 - 26;
    World.building({ x: cx, z: -4, w: 12, d: 24, h: 7.4, sign: 'KLUB · SZATNIA · BIURO', signBg: '#1b1b1f', face: '+x', tex: 'rectangular_facade_tiles', skip: [[-5, -3], [7, 9], [-10, -8]] });
    World.door(cx + 6.05, -8, Math.PI / 2, 'metal', 'SZATNIA'); World.door(cx + 6.05, 4, Math.PI / 2, 'wood', 'BIURO');
    { const cl = new THREE.PointLight(0xfff1d8, 1.2, 30, 1.5); cl.position.set(cx + 10, 5, -2); World.scene.add(cl); } // lampa przed budynkiem klubowym
    World.hotspot('locker', cx + 8, -8, 'Wejdź do szatni');
    World.hotspot('office', cx + 8, 4, 'Biuro prezesa');
    World.door(cx + 6.05, -13, Math.PI / 2, 'metal', 'GOŚCIE');
    World.hotspot('lockerAway', cx + 8, -13, 'Szatnia gości — drużyna przyjezdna');

    /* --- warsztat --- */
    const pl = fac.pits || 1;
    World.workshop(cx, 18, 10, 9 + pl * 2, 5, pl);
    World.hotspot('workshop', cx + 7.5, 18, 'Warsztat — mechanicy');

    /* --- centrum medyczne, centrum treningowe, szkółka --- */
    if ((fac.medic || 0) >= 1) {
      World.building({ x: cx, z: -26, w: 9, d: 8 + fac.medic, h: 4.4, sign: '+ CENTRUM MEDYCZNE', signBg: '#b3261e', face: '+x', tex: 'white_stucco', skip: [[-1.5, 1.5]] });
      World.door(cx + 4.55, -26, Math.PI / 2, 'glass');
      World.hotspot('medic', cx + 6.5, -26, 'Centrum medyczne');
    }
    if ((fac.gym || 1) >= 2) {
      World.building({ x: cx - 20, z: -4, w: 12, d: 10 + fac.gym * 2, h: 7, sign: 'CENTRUM TRENINGOWE', signBg: '#1B7A43', face: '+x', tex: 'concrete_tile_facade', skip: [[-1.5, 1.5]] });
      World.door(cx - 13.95, -4, Math.PI / 2, 'glass');
      World.hotspot('gym', cx - 12, -4, 'Centrum treningowe');
    }
    if ((fac.academy || 1) >= 2) {
      const ax = cx - 22, az = 30, ir = 5, S = 8;
      const sh = new THREE.Shape(); sh.moveTo(-S / 2, -ir - 3); sh.lineTo(S / 2, -ir - 3); sh.absarc(S / 2, 0, ir + 3, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-S / 2, ir + 3); sh.absarc(-S / 2, 0, ir + 3, Math.PI / 2, Math.PI * 1.5, false);
      const hole = new THREE.Path(); hole.moveTo(-S / 2, -ir); hole.absarc(-S / 2, 0, ir, -Math.PI / 2, -Math.PI * 1.5, true); hole.lineTo(S / 2, ir); hole.absarc(S / 2, 0, ir, Math.PI / 2, -Math.PI / 2, true); sh.holes.push(hole);
      const mini = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), new THREE.MeshStandardMaterial({ color: 0x242220, roughness: 0.95 }));
      mini.rotation.x = -Math.PI / 2; mini.position.set(ax, 0.03, az); World.scene.add(mini);
      const signM = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: World.signTex('SZKÓŁKA ŻUŻLOWA', '#E0B21F', '#1a1400') }));
      signM.position.set(ax + 10, 1.6, az); signM.rotation.y = Math.PI / 2; World.scene.add(signM);
      World.scene.add(Bike.tube([ax + 10, 0, az - 3], [ax + 10, 1.2, az - 3], 0.05, white)); World.scene.add(Bike.tube([ax + 10, 0, az + 3], [ax + 10, 1.2, az + 3], 0.05, white));
      World.hotspot('academy', ax + 12, az, 'Szkółka żużlowa', 3);
      World.mapItem(ax, az, S + 2 * ir + 6, 2 * ir + 6, 'SZKÓŁKA', '#3b3833');
    }

    /* --- wjazd na tor: gospodarz toru --- */
    World.hotspot('track', x0 - 6, -27, 'Gospodarz toru — przygotowanie nawierzchni', 3.5);
    const tractor = new THREE.Group();
    const tb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 })); tb.position.y = 1.2; tractor.add(tb);
    const tc = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.3), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.6 })); tc.position.set(-0.5, 2.3, 0); tractor.add(tc);
    [[0.9, 0.55, 0.45], [-0.8, 0.8, 0.8]].forEach(([wx, r, wd]) => [-0.8, 0.8].forEach(sz => { const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, wd * 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x111111 })); w.rotation.x = Math.PI / 2; w.position.set(wx, r, sz); tractor.add(w); }));
    const grader = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x9a9da2, metalness: 0.6 })); grader.position.set(-2.4, 0.3, 0); tractor.add(grader);
    tractor.position.set(x0 - 2, 0, -29); tractor.rotation.y = 0.3; if (Props.ready) World.scene.add(Props.single('tractor', x0 - 2, -29, 0.3)); else World.scene.add(tractor);

    /* --- trwająca inwestycja: plac budowy w miejscu obiektu --- */
    const B = World.look && World.look.build;
    if (B && Club.FAC[B.key]) {
      const frac = 1 - B.left / B.total, lvl = (fac[B.key] || 0) + 1, label = `${Club.FAC[B.key].name} — poziom ${lvl}`, ml = World.mainLen || 90;
      const where = {
        stands: [ml / 2 + 17, zB - 3, 14, 9, 12], lights: [S2 + R + 34, R + 30, 10, 10, 6], pits: [cx, 34, 12, 9, 5], parking: [pw / 2 + 14, pz, 16, 12, 1.5],
        shop: [-24, zB + 6, 8, 5, 3.5], academy: [cx - 22, 30, 16, 10, 3], gym: [cx - 20, (fac.gym || 1) >= 2 ? -24 - (fac.gym || 1) * 2 : -4, 12, 12, 7], medic: [cx, (fac.medic || 0) >= 1 ? -40 : -26, 9, 9, 4.4],
      }[B.key];
      if (where) World.site(where[0], where[1], where[2], where[3], where[4], frac, label, B.left);
    }
    /* --- granica terenu: ogrodzenie dookoła kompleksu --- */
    World.perimeter({ x0: Math.min(cx - 44, cx - 22 - 22), x1: S2 + R + 50, z0: -(R + 52), z1: pz + pd / 2 + 10 });
    /* --- dodatki zależne od poziomu obiektów --- */
    if ((fac.medic || 0) >= 3 && Props.ready) { World.scene.add(Props.single('ambulance', cx + 9, -30, Math.PI / 2, '#f2d31b')); World.colliders.push({ x0: cx + 7.8, x1: cx + 10.2, z0: -33.2, z1: -26.8 }); }
    if ((fac.academy || 1) >= 3) { // oświetlenie mini-toru i kontener szkółki
      const ax = cx - 22, az = 30;
      [[-9, -8], [9, 8]].forEach(([dx, dz]) => { World.scene.add(Bike.tube([ax + dx, 0, az + dz], [ax + dx, 9, az + dz], 0.12, new THREE.MeshStandardMaterial({ color: 0x7c8088, metalness: 0.6 }))); const h = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 3.3, 2.8) })); h.position.set(ax + dx, 9, az + dz); h.lookAt(ax, 0, az); World.scene.add(h); const l = new THREE.PointLight(0xfff0d8, 0.9, 40, 1.5); l.position.set(ax + dx * 0.7, 8, az + dz * 0.7); World.scene.add(l); });
      const al = [['siteCabin', ax - 14, 0, az, Math.PI / 2]]; if ((fac.academy || 1) >= 4) al.push(['siteCabin', ax - 14, 0, az + 7, Math.PI / 2]);
      const G = World.scene; Furn.load(['siteCabin'], () => al.forEach(([k, px, py, pz, r]) => { if (G.parent) Furn.place(G, k, px, py, pz, r, {}); }));
      World.colliders.push({ x0: ax - 17, x1: ax - 11, z0: az - 3, z1: az + ((fac.academy || 1) >= 4 ? 10 : 3) });
    }
    World.colliders.push({ x0: x0 - 4.5, x1: x0 + 0.5, z0: -31.5, z1: -26.5 });
  },

  /**
   * Wyposażenie szatni: kevlary w barwach klubu na wieszakach przy szafkach, kaski na szafkach,
   * kącik prysznicowy (glazura, szklana ścianka, deszczownice), telewizor z programem zawodów.
   */
  lockerExtras(G, W, Dp, H, refs) {
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; G.add(o); return o; };
    // kevlar: kamizelka z panelami (kolor nadaje materiał), numer w tle
    const kt = World._kevTex || (World._kevTex = World.canvasTex(128, 192, g => {
      g.clearRect(0, 0, 128, 192); g.fillStyle = '#f0f0f0';
      g.beginPath(); g.moveTo(34, 8); g.lineTo(94, 8); g.lineTo(120, 40); g.lineTo(108, 70); g.lineTo(104, 186); g.lineTo(24, 186); g.lineTo(20, 70); g.lineTo(8, 40); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(24, 110, 80, 6); g.fillRect(24, 150, 80, 6);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 70, 22, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = 'bold 28px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('SE', 64, 80);
    }));
    refs.kevMat = new THREE.MeshStandardMaterial({ map: kt, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
    const hook = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 12; i += 2) {
      const x = -W / 2 + 1 + i * 1.25, z = -Dp / 2 + 0.66;
      add(new THREE.PlaneGeometry(0.62, 0.92), refs.kevMat, x + 0.28, 1.5, z);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), hook, x + 0.28, 1.98, z - 0.04).rotation.x = Math.PI / 2;
      // kask na szafce
      const hm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: [0xeeeeee, 0x222222, 0xd9541f][i % 3], roughness: 0.25, metalness: 0.1 }));
      hm.position.set(x - 0.2, 2.28, -Dp / 2 + 0.3); G.add(hm);
      const vis = add(new THREE.BoxGeometry(0.2, 0.05, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }), x - 0.2, 2.3, -Dp / 2 + 0.44);
    }
    // kącik prysznicowy w lewym przednim rogu
    const tile = World.pbr('large_grey_tiles', 3, 4, { color: '#eef1f3' }), glass = new THREE.MeshStandardMaterial({ color: 0x9fc6d6, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.3 });
    const sx = -W / 2 + 1.3, sz = Dp / 2 - 1.5;
    add(new THREE.PlaneGeometry(2.6, H), tile, -W / 2 + 0.03, H / 2, sz, Math.PI / 2);
    add(new THREE.PlaneGeometry(2.6, H), tile, sx, H / 2, Dp / 2 - 0.03, Math.PI);
    add(new THREE.PlaneGeometry(2.6, 2.6), World.pbr('large_grey_tiles', 2, 2, { color: '#cfd4d8' }), sx, 0.02, sz).rotation.x = -Math.PI / 2;
    const gw = add(new THREE.BoxGeometry(0.03, 2.1, 2.6), glass, -W / 2 + 2.6, 1.05, sz); gw.userData.solid = true;
    [-0.6, 0.6].forEach(dz => {
      add(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), hook, -W / 2 + 0.1, 1.6, sz + dz);
      const head = add(new THREE.CylinderGeometry(0.1, 0.08, 0.04, 12), hook, -W / 2 + 0.3, 2.2, sz + dz); head.rotation.z = 0.3;
      add(new THREE.BoxGeometry(0.2, 0.2, 0.05), hook, -W / 2 + 0.06, 1.1, sz + dz).rotation.y = Math.PI / 2;
    });
    add(new THREE.CircleGeometry(0.08, 12), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8 }), sx, 0.025, sz).rotation.x = -Math.PI / 2;
    const sign = add(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: World.signTex('PRYSZNICE', '#1b3a5a', '#fff', 256, 64) }), -W / 2 + 2.62, 2.35, sz, Math.PI / 2);
    // telewizor: program zawodów / wyniki
    refs.tvTex = World.canvasTex(512, 288, g => { g.fillStyle = '#081018'; g.fillRect(0, 0, 512, 288); });
    add(new THREE.BoxGeometry(1.7, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }), W / 2 - 1.3, 2.2, Dp / 2 - 0.06);
    add(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ map: refs.tvTex }), W / 2 - 1.3, 2.2, Dp / 2 - 0.1, Math.PI);
  },

  /** Szatnia: szafki w barwach klubu, ławki, tablica taktyczna, herb; zawodników dokłada Walk */
  buildLocker(cx = 0, key = 'locker') {
    const Y = World.LOCKER_Y, W = 16, Dp = 12, H = 3.4, G = new THREE.Group();
    G.position.set(cx, Y, 0); World.scene.add(G);
    // podłoga z płytek, ściany i sufit osobno (bez zdublowanych powierzchni)
    const tiles = World.canvasTex(256, 256, g => { g.fillStyle = '#3b3833'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#2a2824'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(4, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), World.pbr('large_grey_tiles', W / 1.5, Dp / 1.5, { color: '#b9bcbf' }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; G.add(floor);
    const wallMat = World.pbr('grey_plaster', 4, 1);
    [[0, H / 2, -Dp / 2, 0, W], [0, H / 2, Dp / 2, Math.PI, W], [-W / 2, H / 2, 0, Math.PI / 2, Dp], [W / 2, H / 2, 0, -Math.PI / 2, Dp]].forEach(([x, y, z, r, w]) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallMat); wall.position.set(x, y, z); wall.rotation.y = r; G.add(wall);
      // glazura do 1,3 m
      const tl = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.3), World.pbr('large_grey_tiles', w / 1.2, 1.3 / 1.2, { color: '#dfe3e6' })); tl.position.set(x, 0.65, z); tl.rotation.y = r; tl.translateZ(0.01); G.add(tl);
    });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp), World.ceilMat(W, Dp)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; G.add(ceil);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xd9541f, map: World.lockerTex(), roughness: 0.38, metalness: 0.35 });
    const lockBody = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.5 }); doorMat.userData.shared = false;
    // szafki pod ścianami (tylna i boczne)
    const lockers = [];
    for (let i = 0; i < 12; i++) lockers.push([-W / 2 + 1 + i * 1.25, -Dp / 2 + 0.35, 0]);
    for (let i = 0; i < 6; i++) { lockers.push([-W / 2 + 0.35, -Dp / 2 + 2 + i * 1.25, Math.PI / 2]); lockers.push([W / 2 - 0.35, -Dp / 2 + 2 + i * 1.25, -Math.PI / 2]); }
    lockers.forEach(([x, z, r]) => {
      // korpus + front z drzwiczkami, cokół i skośny daszek
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.55), [lockBody, lockBody, lockBody, lockBody, doorMat, lockBody]); l.position.set(x, 1.12, z); l.rotation.y = r; l.userData.solid = true; G.add(l);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.5), lockBody); pl.position.set(x, 0.06, z); pl.rotation.y = r; pl.translateZ(-0.02); G.add(pl);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.62), lockBody); top.position.set(x, 2.24, z); top.rotation.set(0.35, r, 0, 'YXZ'); G.add(top);
    });
    // ławki
    const wood = World.pbr('dark_wooden_planks', 3, 0.3, { color: '#d8b48a' }), steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.85, roughness: 0.3 });
    [[0, -Dp / 2 + 1.5, 0, 13], [-W / 2 + 1.6, 0, Math.PI / 2, 5.6], [W / 2 - 1.6, 0, Math.PI / 2, 5.6]].forEach(([x, z, r, len]) => {
      const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = r; b.userData.solid = true; G.add(b);
      [-0.16, 0, 0.16].forEach(dz => { const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.045, 0.13), wood); s.position.set(0, 0.46, dz); b.add(s); }); // listwy siedziska
      for (let lx = -len / 2 + 0.4; lx <= len / 2 - 0.3; lx += 1.6) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.44), steel); lg.position.set(lx, 0.22, 0); b.add(lg); }
    });
    // tablica taktyczna i herb
    const boardTex = World.canvasTex(512, 256, g => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 512, 256); });
    const tb = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: boardTex })); tb.position.set(3.2, 1.8, Dp / 2 - 0.05); tb.rotation.y = Math.PI; G.add(tb);
    const crestTex = World.canvasTex(256, 256, g => { g.clearRect(0, 0, 256, 256); });
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: crestTex, transparent: true })); crest.position.set(-3.2, 2.1, Dp / 2 - 0.05); crest.rotation.y = Math.PI; G.add(crest);
    // drzwi wyjściowe
    World.realDoor(G, 0, 0, Dp / 2 - 0.02, Math.PI, { kind: 'metal', lamp: false });
    const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.5, 0.6) })); ex.position.set(0, 2.55, Dp / 2 - 0.05); ex.rotation.y = Math.PI; G.add(ex);
    // światło: świetlówki pod sufitem (włączane tylko w środku)
    G.userData.lights = [];
    [-4, 4].forEach(x => { const p = new THREE.PointLight(0xfff4e0, 0.7, 16, 1.6); p.visible = false; G.userData.lights.push(p); p.position.set(x, H - 0.3, 0); G.add(p); const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.8) })); lamp.position.set(x, H - 0.05, 0); G.add(lamp); });
    const refs = { group: G, doorMat, boardTex, crestTex, cx };
    World.lockerExtras(G, W, Dp, H, refs);
    (World.lockerRefs = World.lockerRefs || {})[key] = refs;
    if (key === 'locker') { World.lockerGroup = G; World.lockerDoorMat = doorMat; World.boardTexLocker = boardTex; World.crestTex = crestTex; }
    World.locker = { W, Dp, seats: [[-4.6, -Dp / 2 + 1.5, 0], [-2.3, -Dp / 2 + 1.5, 0], [0, -Dp / 2 + 1.5, 0], [2.3, -Dp / 2 + 1.5, 0], [4.6, -Dp / 2 + 1.5, 0], [-W / 2 + 1.6, -1.6, Math.PI / 2], [-W / 2 + 1.6, 0.4, Math.PI / 2], [W / 2 - 1.6, -1.6, -Math.PI / 2], [W / 2 - 1.6, 0.4, -Math.PI / 2], [W / 2 - 1.6, 2.2, -Math.PI / 2], [-W / 2 + 1.6, 2.2, Math.PI / 2]] };
  },
});
