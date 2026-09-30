/* =========================================================
   Speedway Empire 3D — motocykl żużlowy i zawodnik
   Proporcje maszyny: rozstaw osi ~1,45 m, wąskie wysokie
   przednie koło, szerokie tylne z bieżnikiem, długi widelec,
   wysoka kierownica, pionowy silnik 500 cm³, łańcuch po lewej,
   tłumik po prawej, wyprofilowany błotnik z numerem.
   Hierarchia: root (pozycja, kierunek) → lean (przechył wokół
   styku z torem) → pitch (uniesienie przodu, oś tylnego koła)
   → body (wszystkie części). Lewa noga jest przestawiana co
   klatkę między pozycją „na podnóżku” a „wysuniętą po torze”.
   ========================================================= */
'use strict';

const Bike = {
  UNIT: null, // walec o wysokości 1 do rurek ustawianych co klatkę

  /** Walec między punktami a i b */
  tube(a, b, r, mat, seg = 10) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  },

  /** „Kapsuła”: walec z półkulami — obłe kończyny i tułów */
  capsule(a, b, r, mat) {
    const g = new THREE.Group();
    g.add(Bike.tube(a, b, r, mat, 12));
    [a, b].forEach(p => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat); s.position.set(...p); g.add(s); });
    return g;
  },

  /** Ruchomy segment (walec jednostkowy), ustawiany przez Bike.place */
  segment(r, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
    return m;
  },
  place(m, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz) || 0.001;
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(Bike._up, Bike._v.set(dx / len, dy / len, dz / len));
  },
  _up: new THREE.Vector3(0, 1, 0), _v: new THREE.Vector3(),

  /** Rurka po łamanej z łagodnymi łukami (rama, wydech, kierownica) */
  pipe(pts, r, mat, seg) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, seg || pts.length * 10, r, 8, false), mat);
  },

  /** Zębatka: wycięty kształt z zębami i otworami odciążającymi, wytłoczony */
  gear(r, teeth, holes, depth, mat) {
    const sh = new THREE.Shape();
    for (let i = 0; i <= teeth * 4; i++) {
      const a = i / (teeth * 4) * Math.PI * 2, rr = (i % 4 === 1 || i % 4 === 2) ? r : r - 0.012;
      i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(rr, 0);
    }
    for (let i = 0; i < holes; i++) {
      const a = i / holes * Math.PI * 2, h = new THREE.Path();
      h.absarc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.2, 0, Math.PI * 2, true);
      sh.holes.push(h);
    }
    const hub = new THREE.Path(); hub.absarc(0, 0, 0.03, 0, Math.PI * 2, true); sh.holes.push(hub);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return new THREE.Mesh(g, mat);
  },

  /**
   * Łączy wszystkie siatki grupy w jedną siatkę na materiał — motocykl z setek
   * części rysuje się kilkoma wywołaniami zamiast kilkuset.
   */
  merge(group) {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), m = new THREE.Matrix4(), buckets = new Map();
    group.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(g);
    });
    const out = new THREE.Group();
    buckets.forEach((list, mat) => {
      const n = list.reduce((a, g) => a + g.attributes.position.count, 0);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      let o = 0;
      list.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.computeBoundingSphere();
      const me = new THREE.Mesh(geo, mat); me.castShadow = true;
      out.add(me);
    });
    return out;
  },

  /**
   * Koło szprychowe: opona z bieżnikiem (tył: klocki w trzech rzędach „w jodełkę”,
   * przód: drobne żeberka), obręcz o profilu U, piasta z kołnierzami i 32 szprychy
   * krzyżowane jak w prawdziwym kole. Oś koła = z.
   */
  wheel(R, H, W, mats, knobby) {
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(R - H / 2, H / 2, 14, 56), mats.tyre);
    tyre.scale.z = W / H; g.add(tyre);
    const n = knobby ? 44 : 60;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const rows = knobby ? (i % 2 ? [-W * 0.33, W * 0.33] : [0]) : [(i % 2 ? -1 : 1) * W * 0.12];
      rows.forEach(z => {
        const k = new THREE.Mesh(new THREE.BoxGeometry(knobby ? 0.05 : 0.02, knobby ? 0.026 : 0.012, knobby ? W * 0.34 : W * 0.5), mats.tyre);
        k.position.set(Math.cos(a) * (R - 0.008), Math.sin(a) * (R - 0.008), z);
        k.rotation.z = a; if (knobby && z) k.rotation.x = z > 0 ? 0.25 : -0.25;
        g.add(k);
      });
    }
    // obręcz: przekrój U obrócony wokół osi
    const rr = R - H, prof = [[rr - 0.012, -0.03], [rr + 0.004, -0.032], [rr + 0.008, -0.022], [rr, -0.012], [rr, 0.012], [rr + 0.008, 0.022], [rr + 0.004, 0.032], [rr - 0.012, 0.03]];
    const rim = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48), mats.chrome);
    rim.rotation.x = Math.PI / 2; g.add(rim);
    // piasta i kołnierze
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.15, 14), mats.alu); hub.rotation.x = Math.PI / 2; g.add(hub);
    [-0.05, 0.05].forEach(z => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.008, 18), mats.alu); f.rotation.x = Math.PI / 2; f.position.z = z; g.add(f); });
    // szprychy: z kołnierzy do obręczy, krzyżowane
    for (let i = 0; i < 32; i++) {
      const side = i % 2 ? 1 : -1, a = i / 32 * Math.PI * 2, b = a + (i % 4 < 2 ? 0.42 : -0.42);
      g.add(Bike.tube([Math.cos(a) * 0.05, Math.sin(a) * 0.05, side * 0.05], [Math.cos(b) * (rr - 0.012), Math.sin(b) * (rr - 0.012), side * 0.01], 0.0024, mats.chrome, 4));
    }
    const out = Bike.merge(g);
    return out;
  },

  build(x, opts = {}) {
    const T = Bike.tube, C = Bike.capsule;
    const mats = {
      frame: new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: 0.6, roughness: 0.3 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xd5d8dc, metalness: 0.95, roughness: 0.15 }),
      alu: new THREE.MeshStandardMaterial({ color: 0x9a9da2, metalness: 0.8, roughness: 0.35 }),
      tyre: new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.97 }),
      spring: new THREE.MeshStandardMaterial({ color: x.trim, metalness: 0.5, roughness: 0.35 }),
      fin: new THREE.MeshStandardMaterial({ color: 0x6f7378, metalness: 0.75, roughness: 0.45 }),
      case: new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.85, roughness: 0.25 }),
      pipe: new THREE.MeshStandardMaterial({ color: 0x8a6a4a, metalness: 0.85, roughness: 0.35 }),
      chain: new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 0.8, roughness: 0.5 }),
      filter: new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.95 }),
      seat: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.75 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.7 }),
      kev: new THREE.MeshStandardMaterial({ color: x.kevlar, roughness: 0.5 }),
      trim: new THREE.MeshStandardMaterial({ color: x.trim, roughness: 0.5 }),
      helmet: new THREE.MeshStandardMaterial({ color: x.helmet, roughness: 0.25, metalness: 0.05 }),
      shell: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.2 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.05, metalness: 0.6 }),
      guard: new THREE.MeshStandardMaterial({ color: x.kevlar, roughness: 0.4, side: THREE.DoubleSide }),
    };
    const root = new THREE.Group();
    const lean = new THREE.Group(); root.add(lean);
    const pitch = new THREE.Group(); pitch.position.set(-0.72, 0, 0); lean.add(pitch);
    const body = new THREE.Group(); body.position.set(0.72, 0, 0); pitch.add(body);

    /* --- koła: tylne 19" z szeroką oponą z klockami, przednie 23" wąskie --- */
    const rear = new THREE.Group(); rear.position.set(-0.72, 0.34, 0); body.add(rear);
    rear.add(Bike.wheel(0.34, 0.09, 0.13, mats, true));
    const spk = Bike.gear(0.125, 52, 6, 0.006, mats.chrome); spk.position.z = -0.082; rear.add(spk); // zębatka napędu
    const fork = new THREE.Group(); fork.position.set(0.46, 1.02, 0); body.add(fork);
    const front = new THREE.Group(); front.position.set(0.3, -0.68, 0); fork.add(front);
    front.add(Bike.wheel(0.35, 0.058, 0.07, mats, false));

    /* --- widelec z wahaczem pchanym (leading link), półki, kierownica bez hamulców --- */
    const F = new THREE.Group();
    [-0.075, 0.075].forEach(z => {
      F.add(Bike.tube([-0.02, 0.05, z], [0.2, -0.56, z], 0.021, mats.chrome, 12));          // goleń
      F.add(Bike.tube([0.2, -0.56, z], [0.3, -0.68, z * 1.05], 0.016, mats.frame, 8));      // wahacz do osi
      F.add(Bike.tube([0.09, -0.2, z * 1.25], [0.26, -0.62, z * 1.2], 0.014, mats.alu, 8));  // amortyzator
      const coil = new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const t = i / 59, a = t * Math.PI * 2 * 9; return new THREE.Vector3(0.12 + 0.1 * t + Math.cos(a) * 0.022, -0.27 - 0.24 * t, z * 1.25 + Math.sin(a) * 0.022); }));
      F.add(new THREE.Mesh(new THREE.TubeGeometry(coil, 180, 0.004, 5, false), mats.spring));   // sprężyna
      const pv = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), mats.alu); pv.rotation.x = Math.PI / 2; pv.position.set(0.2, -0.56, z); F.add(pv);
    });
    [[0.05, 0.07], [-0.0, -0.08]].forEach(([y, dx]) => { const yk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.2), mats.alu); yk.position.set(dx * 0.1 + (y < 0 ? 0.02 : -0.01), y, 0); F.add(yk); }); // półki
    const bar = [[-0.1, 0.18, -0.43], [-0.07, 0.17, -0.32], [-0.015, 0.115, -0.17], [0.0, 0.105, 0], [-0.015, 0.115, 0.17], [-0.07, 0.17, 0.32], [-0.1, 0.18, 0.43]];
    F.add(Bike.pipe(bar, 0.012, mats.frame, 60));                                       // kierownica „cross”
    F.add(Bike.tube([-0.035, 0.15, -0.13], [-0.035, 0.15, 0.13], 0.009, mats.frame));  // poprzeczka
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), mats.kev); pad.rotation.x = Math.PI / 2; pad.position.set(-0.035, 0.15, 0); F.add(pad);
    [-1, 1].forEach(sd => { const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.02, 0.12, 12), mats.rubber); gr.rotation.x = Math.PI / 2; gr.position.set(-0.1, 0.18, 0.4 * sd); F.add(gr); });
    F.add(Bike.pipe([[-0.085, 0.175, -0.33], [-0.02, 0.17, -0.38], [0.01, 0.155, -0.44]], 0.006, mats.alu, 16)); // dźwignia sprzęgła (hamulca brak)
    const kill = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.03), mats.kev); kill.position.set(-0.095, 0.2, 0.31); F.add(kill); // wyłącznik zapłonu z linką
    F.add(Bike.pipe([[-0.095, 0.2, 0.31], [-0.14, 0.17, 0.36], [-0.12, 0.15, 0.41]], 0.003, mats.kev, 12));
    const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.09, 20, 1, true, Math.PI * 0.68, Math.PI * 0.32), mats.guard);
    fg.rotation.x = Math.PI / 2; fg.position.set(0.3, -0.68, 0); F.add(fg);                   // przedni błotnik
    fork.add(Bike.merge(F));

    /* --- rama: rurowa kołyska pod silnikiem, sztywny tył (żużlowiec nie ma tylnego zawieszenia) --- */
    const Fr = new THREE.Group();
    Fr.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.17, 12), mats.frame)).children[0].position.set(0.47, 0.98, 0);
    Fr.children[0].rotation.z = 0.4;
    Fr.add(Bike.pipe([[0.44, 1.06, 0], [0.2, 1.02, 0], [-0.1, 0.96, 0], [-0.36, 0.9, 0]], 0.019, mats.frame));   // rura górna
    [-1, 1].forEach(sd => {
      const z = 0.055 * sd;
      Fr.add(Bike.pipe([[0.5, 0.92, 0], [0.36, 0.7, z], [0.26, 0.4, z], [0.16, 0.19, z], [-0.1, 0.17, z], [-0.2, 0.2, z]], 0.016, mats.frame)); // rury przednie pod silnikiem
      Fr.add(Bike.pipe([[-0.2, 0.2, z], [-0.46, 0.27, z * 1.5], [-0.72, 0.34, 0.095 * sd]], 0.014, mats.frame));  // rury tylne dolne
      Fr.add(Bike.pipe([[-0.36, 0.9, z * 0.8], [-0.55, 0.62, z * 1.5], [-0.72, 0.34, 0.095 * sd]], 0.013, mats.frame)); // rury tylne górne
      const dr = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.012), mats.alu); dr.position.set(-0.72, 0.34, 0.1 * sd); Fr.add(dr); // haki osi
    });
    Fr.add(Bike.pipe([[-0.36, 0.9, 0], [-0.26, 0.55, 0], [-0.2, 0.2, 0]], 0.017, mats.frame));                  // rura podsiodłowa
    Fr.add(Bike.pipe([[-0.36, 0.9, 0], [-0.62, 0.86, 0], [-0.9, 0.78, 0]], 0.011, mats.frame));                 // wysięgnik błotnika

    /* --- silnik 500 cm³ (pionowy, jednocylindrowy, metanol): karter, cylinder z żeberkami, głowica --- */
    const rounded = (w, h, r) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return sh; };
    const ext = (sh, d, mat, bevel = 0.01) => { const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -d / 2); return new THREE.Mesh(g, mat); };
    const crank = ext(rounded(0.3, 0.2, 0.08), 0.12, mats.alu); crank.position.set(0.03, 0.33, 0); Fr.add(crank);
    const cover = ext(rounded(0.36, 0.17, 0.08), 0.03, mats.case); cover.position.set(-0.06, 0.31, -0.1); Fr.add(cover); // osłona napędu pierwotnego
    const cyl = new THREE.Group(); cyl.position.set(0.06, 0.43, 0); cyl.rotation.z = -0.1; Fr.add(cyl);
    cyl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.26, 16), mats.alu)).children[0].position.y = 0.13;
    for (let i = 0; i < 8; i++) { const fin = ext(rounded(0.2 - i * 0.004, 0.17, 0.03), 0.006, mats.fin, 0.002); fin.rotation.x = Math.PI / 2; fin.position.y = 0.03 + i * 0.028; cyl.add(fin); }
    const headC = ext(rounded(0.2, 0.18, 0.04), 0.07, mats.fin, 0.008); headC.rotation.x = Math.PI / 2; headC.position.y = 0.28; cyl.add(headC);
    for (let i = 0; i < 3; i++) { const hf = ext(rounded(0.22, 0.2, 0.04), 0.005, mats.fin, 0.002); hf.rotation.x = Math.PI / 2; hf.position.y = 0.25 + i * 0.03; cyl.add(hf); }
    const rock = ext(rounded(0.13, 0.1, 0.03), 0.04, mats.chrome, 0.01); rock.rotation.x = Math.PI / 2; rock.position.y = 0.34; cyl.add(rock); // pokrywa zaworów
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), mats.rubber); plug.position.set(0.05, 0.36, 0.05); plug.rotation.z = -0.5; cyl.add(plug);
    // gaźnik i filtr powietrza pod siodłem
    Fr.add(Bike.tube([-0.02, 0.7, 0], [-0.17, 0.7, 0], 0.028, mats.alu, 12));
    const carb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), mats.alu); carb.position.set(-0.14, 0.7, 0); Fr.add(carb);
    const filt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.12, 14), mats.filter); filt.rotation.z = Math.PI / 2; filt.position.set(-0.26, 0.71, 0); Fr.add(filt);
    // iskrownik i zębatka zdawcza z łańcuchem po lewej
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12), mats.shell); mag.position.set(0.19, 0.4, -0.02); mag.rotation.x = Math.PI / 2; Fr.add(mag);
    const cs = Bike.gear(0.045, 16, 0, 0.008, mats.chrome); cs.position.set(-0.16, 0.3, -0.082); Fr.add(cs);
    const chainPts = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 + i / 16 * Math.PI; chainPts.push(new THREE.Vector3(-0.16 + Math.cos(a) * 0.05, 0.3 + Math.sin(a) * 0.05, -0.082)); }
    for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI; chainPts.push(new THREE.Vector3(-0.72 + Math.cos(a) * 0.128, 0.34 + Math.sin(a) * 0.128, -0.082)); }
    Fr.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts, true), 160, 0.0075, 5, true), mats.chain));

    /* --- wydech po prawej: kolanko z głowicy, rura pod silnikiem, duży tłumik FIM --- */
    Fr.add(Bike.pipe([[0.13, 0.72, 0.03], [0.24, 0.66, 0.08], [0.27, 0.48, 0.13], [0.16, 0.3, 0.17], [-0.12, 0.28, 0.19], [-0.4, 0.4, 0.2]], 0.024, mats.pipe, 90));
    Fr.add(Bike.tube([-0.4, 0.4, 0.2], [-0.98, 0.62, 0.2], 0.052, mats.chrome, 18));
    const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.02, 18), mats.shell); endCap.position.set(-0.99, 0.625, 0.2); endCap.rotation.z = Math.PI / 2 - 0.36; Fr.add(endCap);
    Fr.add(Bike.tube([-0.99, 0.625, 0.2], [-1.03, 0.64, 0.2], 0.016, mats.shell, 10));
    Fr.add(Bike.tube([-0.7, 0.51, 0.19], [-0.62, 0.72, 0.08], 0.008, mats.frame)); // wspornik tłumika

    /* --- zbiornik metanolu, siodełko, błotnik z osłoną przed szlaką --- */
    const tankSh = new THREE.Shape(); tankSh.moveTo(0.34, 1.03); tankSh.quadraticCurveTo(0.35, 1.13, 0.2, 1.14); tankSh.lineTo(0.02, 1.1); tankSh.quadraticCurveTo(-0.03, 1.06, 0.0, 1.0); tankSh.lineTo(0.3, 1.0); tankSh.quadraticCurveTo(0.34, 1.0, 0.34, 1.03);
    const tank = ext(tankSh, 0.1, mats.trim, 0.03); Fr.add(tank);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), mats.chrome); cap.position.set(0.16, 1.17, 0); Fr.add(cap);
    const seatSh = new THREE.Shape(); seatSh.moveTo(-0.14, 0.92); seatSh.lineTo(-0.52, 0.86); seatSh.quadraticCurveTo(-0.58, 0.9, -0.52, 0.94); seatSh.lineTo(-0.2, 0.99); seatSh.quadraticCurveTo(-0.12, 0.98, -0.14, 0.92);
    Fr.add(ext(seatSh, 0.13, mats.seat, 0.02));
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.2, 28, 1, true, Math.PI * 0.92, Math.PI * 0.55), mats.guard);
    guard.rotation.x = Math.PI / 2; guard.position.set(-0.72, 0.34, 0); Fr.add(guard);
    const defl = ext(rounded(0.46, 0.3, 0.06), 0.008, mats.trim, 0.004); defl.rotation.set(Math.PI / 2, 0, 0.3); defl.position.set(-1.0, 0.76, 0); Fr.add(defl); // osłona przed szlaką
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), mats.alu); peg.rotation.x = Math.PI / 2; peg.position.set(-0.12, 0.3, 0.14); Fr.add(peg);
    body.add(Bike.merge(Fr));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.24), new THREE.MeshBasicMaterial({ map: World.plateTex(x.no) }));
    plate.position.set(-1.1, 0.66, 0); plate.rotation.y = -Math.PI / 2; body.add(plate);

    /* --- zawodnik: grupa pochylana w łuku wokół bioder --- */
    const rider = new THREE.Group(); rider.position.set(-0.3, 1.0, 0); body.add(rider);
    const P = (x_, y_, z_) => [x_ + 0.3, y_ - 1.0, z_]; // współrzędne względem bioder
    rider.add(C(P(-0.3, 1.0, 0), P(0.1, 1.34, 0), 0.165, mats.kev)); // tułów
    rider.add(C(P(-0.28, 0.98, -0.12), P(-0.28, 0.98, 0.12), 0.13, mats.kev)); // biodra
    rider.add(C(P(0.08, 1.33, -0.16), P(0.08, 1.33, 0.16), 0.1, mats.kev)); // barki
    rider.add(T(P(-0.18, 1.1, 0), P(0.02, 1.27, 0), 0.172, mats.trim)); // pas w barwach klubu
    // plastron z numerem po obu stronach
    [-1, 1].forEach(sd => { const bib = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), new THREE.MeshBasicMaterial({ map: World.plateTex(x.no), side: THREE.DoubleSide })); bib.position.set(...P(-0.1, 1.18, 0.175 * sd)); bib.rotation.set(0, sd > 0 ? 0 : Math.PI, 0.72); bib.userData.keep = true; bib.userData.bib = true; rider.add(bib); });
    // kask z pokrowcem w kolorze biegu, gogle, daszek
    const headG = new THREE.Group(); headG.userData.keep = true; headG.position.set(...P(0.27, 1.49, 0)); rider.add(headG);
    headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.155, 18, 14), mats.helmet));
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mats.shell); chin.scale.set(1, 0.7, 1.2); chin.position.set(0.1, -0.08, 0); headG.add(chin);
    const gog = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), mats.glass); gog.position.set(0.13, 0.01, 0); headG.add(gog);
    headG.add(T([0.1, 0.01, -0.13], [0.1, 0.01, 0.13], 0.035, mats.shell)); // pasek gogli
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.24), mats.helmet); peak.position.set(0.15, 0.11, 0); peak.rotation.z = -0.2; headG.add(peak);
    // ręce do końców kierownicy
    [-1, 1].forEach(sd => {
      rider.add(C(P(0.08, 1.33, 0.17 * sd), P(0.26, 1.18, 0.33 * sd), 0.058, mats.kev));
      rider.add(C(P(0.26, 1.18, 0.33 * sd), P(0.38, 1.16, 0.41 * sd), 0.05, mats.kev));
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mats.shell); glove.position.set(...P(0.39, 1.16, 0.42 * sd)); rider.add(glove);
    });
    // prawa noga na podnóżku
    rider.add(C(P(-0.28, 0.98, 0.13), P(0.06, 0.74, 0.22), 0.075, mats.kev));
    rider.add(C(P(0.06, 0.74, 0.22), P(-0.1, 0.36, 0.17), 0.062, mats.kev));
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), mats.shell); bootR.userData.keep = true; bootR.position.set(...P(-0.06, 0.32, 0.16)); rider.add(bootR);
    // lewa noga: dwa ruchome segmenty i stalowy but
    const thigh = Bike.segment(0.075, mats.kev), shin = Bike.segment(0.062, mats.kev);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mats.kev);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.12), mats.chrome);
    shoe.userData.keep = true;
    [thigh, shin, knee, shoe].forEach(m => rider.add(m));

    const all = [];
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; all.push(o); } });
    const tag = opts.noTag ? null : World.nameTag(x.name.split(' ').slice(-1)[0], x.helmet);
    if (tag) { tag.position.set(0, 2.7, 0); root.add(tag); }
    const b = { x, root, lean, pitch, body, fork, front, rear, rider, headG, leg: { thigh, shin, knee, shoe }, tag, spin: 0, vis: null };
    Bike.pose(b, 0);
    return b;
  },

  /** Lewa noga: 0 = na podnóżku, 1 = wysunięta do przodu, but ślizga się po torze */
  pose(b, k) {
    const L = (a, c) => a + (c - a) * k;
    const hip = new THREE.Vector3(0.02, -0.02, -0.13);
    const kneeP = new THREE.Vector3(L(0.34, 0.42), L(-0.26, -0.36), L(-0.22, -0.3));
    const foot = b.model ? new THREE.Vector3(L(0.2, 0.58), L(-0.7, -0.64), L(-0.17, -0.44)) : new THREE.Vector3(L(0.18, 0.95), L(-0.64, -0.96), L(-0.16, -0.36));
    Bike.place(b.leg.thigh, hip, kneeP);
    Bike.place(b.leg.shin, kneeP, foot);
    b.leg.knee.position.copy(kneeP);
    b.leg.shoe.position.set(foot.x + 0.06, foot.y - 0.02, foot.z);
    b.leg.shoe.rotation.set(0, 0, L(-0.5, 0));
    if (b.model) b.model.morphTargetInfluences[0] = k;
  },

  /**
   * Klatka animacji: kierunek z ruchu bocznego, uślizg w łuku (tył na zewnątrz,
   * przód w kontrze), przechył, pochylenie tułowia i głowy, uniesienie przodu na starcie,
   * upadek (motocykl sunie i obraca się). Wszystko wygładzane.
   */
  update(b, x, dt, human) {
    const p = Track.pos(x.s, x.d), f = p.f;
    const inBend = Track.inBend(x.s);
    const v = b.vis || (b.vis = { hd: null, hdv: 0, lean: 0, yaw: 0, sl: 0, rd: x.d, rdv: 0, pitch: 0, d: x.d, legK: 0, steer: 0, fallT: 0, fallV: 0, fallOff: 0, fallSpin: 0, lastV: 0 });
    const k = dt > 0 ? Math.min(1, dt * 7) : 0;
    // tor jazdy wygładzony sprężyną (tłumienie krytyczne): zmiany linii to łagodne łuki,
    // a kierunek motocykla wynika z tej krzywej — bez załamań i skoków
    if (dt > 0) {
      const w = 4.2, a = w * w * (x.d - v.rd) - 2 * w * v.rdv;
      v.rdv += a * dt; v.rd += v.rdv * dt;
      if (Math.abs(x.d - v.rd) > 3) { v.rd = x.d; v.rdv = 0; }
    }
    const ddot = v.rdv;

    if (x.status === 'fell') {
      if (!v.fallT) { v.fallV = Math.max(6, v.lastV); }
      v.fallT += dt;
      v.fallV = Math.max(0, v.fallV - 14 * dt);
      v.fallOff += v.fallV * dt;
      v.fallSpin += v.fallV * dt * 0.35;
      v.lean += (1.42 - v.lean) * Math.min(1, dt * 6);
      b.root.position.set(p.x + f.tx * v.fallOff - f.tz * v.fallOff * 0.25, 0, p.z + f.tz * v.fallOff + f.tx * v.fallOff * 0.25);
      b.root.rotation.y = Math.atan2(-f.tz, f.tx) + v.fallSpin;
      b.lean.rotation.x = -v.lean;
      b.pitch.rotation.z = 0;
      return;
    }
    v.lastV = x.v;
    const rp = Track.pos(x.s, v.rd);
    b.root.position.set(rp.x, 0, rp.z);

    // kierunek: styczna do toru + odchylenie od ruchu bocznego (zmiana linii)
    const latYaw = Math.atan2(ddot, Math.max(6, x.v));
    // uślizg: zawodnik rzuca motocykl bokiem tuż przed łukiem i prostuje na wyjściu — narasta płynnie
    const pre = !inBend && x.moving && Track.inBend(x.s + 7) ? 0.45 : 0;
    const slT = inBend ? Math.max(x.slide, 0.45) : pre;
    v.sl += (slT - v.sl) * Math.min(1, dt * (slT > v.sl ? 3.2 : 2.2));
    v.yaw += (0.5 * v.sl - v.yaw) * Math.min(1, dt * 6);
    // kierunek na sprężynie: wejście z prostej w łuk (skok krzywizny toru) bez szarpnięcia
    const headT = Math.atan2(-f.tz, f.tx) - latYaw + v.yaw;
    if (v.hd == null || dt <= 0) { v.hd = headT; v.hdv = 0; }
    else {
      const e = Math.atan2(Math.sin(headT - v.hd), Math.cos(headT - v.hd)), w = 9;
      v.hdv += (w * w * e - 2 * w * v.hdv) * dt; v.hd += v.hdv * dt;
      if (Math.abs(e) > 1.2) { v.hd = headT; v.hdv = 0; }
    }
    b.root.rotation.y = v.hd;

    // przechył: fizyczny w łuku + lekki przy zmianie linii na prostej
    const leanT = (inBend ? x.lean : Math.max(x.lean, pre ? 0.35 : 0)) + (inBend ? 0 : Math.max(-0.2, Math.min(0.2, -ddot * 0.06)));
    v.lean += (leanT - v.lean) * Math.min(1, dt * 3.5);
    b.lean.rotation.x = -v.lean;

    // przednie koło: kontra w uślizgu, ruch kierownicą przy zmianie linii
    const steerT = inBend ? -v.yaw * 1.05 : Math.max(-0.25, Math.min(0.25, -ddot * 0.05));
    v.steer += (steerT - v.steer) * k;
    b.fork.rotation.y = v.steer;

    // start: przód się unosi przy mocnym przyspieszeniu
    const pitchT = x.moving && x.s < 35 && x.acc > 4 ? Math.min(0.2, (x.acc - 4) * 0.035) : 0;
    v.pitch += (pitchT - v.pitch) * Math.min(1, dt * 5);
    b.pitch.rotation.z = v.pitch;

    // zawodnik: noga, tułów do środka łuku, głowa w stronę wyjścia
    v.legK += (Math.min(1, v.sl * 1.6) - v.legK) * Math.min(1, dt * 4);
    Bike.pose(b, v.legK);
    b.rider.rotation.x = -0.14 * v.legK;
    b.rider.rotation.z = -0.1 * v.legK;
    b.headG.rotation.y = 0.35 * v.legK;

    // koła: w łuku i na starcie tylne koło „buksuje”
    b.spin += x.v * dt / 0.35;
    b.front.rotation.z = -b.spin;
    b.rear.rotation.z = -b.spin * (1 + 0.25 * x.slide + (x.s < 20 && x.moving ? 0.6 : 0));
  },
};
