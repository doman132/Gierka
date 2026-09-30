/* =========================================================
   Speedway Empire 3D — materiały PBR i drzwi
   Tekstury z Poly Haven (CC0, 1k): kolor, mapa normalnych
   i szorstkość — podłogi (deska, płytki, beton, guma),
   ściany (tynk, beton, cegła, blacha falista), drzwi (sosna,
   blacha), asfalt, chodniki. World.pbr(id, rx, ry) zwraca
   wspólny (cache) materiał o danym powtórzeniu tekstury.
   World.realDoor — drzwi z ościeżnicą, skrzydłem z tekstury,
   klamką, szybką, progiem, daszkiem i lampką.
   ========================================================= */
'use strict';

Object.assign(World, {
  _tex: {}, _pbr: {},
  texSet(id) {
    if (World._tex[id]) return World._tex[id];
    const L = World._TL || (World._TL = new THREE.TextureLoader()), base = `models/tex/${id}/`;
    // kopie tekstur (różne powtórzenia) trzeba odświeżyć, gdy obrazek się doczyta
    const mk = (f, srgb) => { const t = L.load(base + f + '.jpg', () => (t._copies || []).forEach(c => { c.image = t.image; c.needsUpdate = true; })); t._copies = []; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.encoding = THREE.sRGBEncoding; return t; };
    return (World._tex[id] = { map: mk('diff', true), normal: mk('nor'), rough: mk('rough') });
  },
  /** Materiał PBR z tekstur Poly Haven; rx, ry — ile razy powtórzyć teksturę; opts: color (przyciemnienie), normalScale */
  pbr(id, rx = 1, ry = 1, o = {}) {
    const key = `${id}:${rx}:${ry}:${o.color || ''}:${o.ns || ''}`;
    if (World._pbr[key]) return World._pbr[key];
    const T = World.texSet(id), rep = t => { const c = t.clone(); c.repeat.set(rx, ry); if (t.image && t.image.complete !== false && t.image.width) c.needsUpdate = true; else t._copies.push(c); return c; };
    const m = new THREE.MeshStandardMaterial({ map: rep(T.map), normalMap: rep(T.normal), roughnessMap: rep(T.rough), roughness: 1, metalness: o.metal || 0, color: o.color ? new THREE.Color(o.color).convertSRGBToLinear() : 0xffffff, side: o.side || THREE.FrontSide });
    if (o.ns) m.normalScale.set(o.ns, o.ns);
    m.userData.lin = true; m.userData.shared = true;
    return (World._pbr[key] = m);
  },

  /** Sufit podwieszany: płyty 60×60 cm w metalowym rastrze (lekko świecący, żeby nie był brązowy w cieniu) */
  ceilMat(W, D) {
    const ct = World._ceilTex || (World._ceilTex = World.canvasTex(256, 256, g => { g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,88,80,${Math.random() * 0.18})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } g.fillStyle = '#9d9c98'; g.fillRect(0, 0, 256, 6); g.fillRect(0, 0, 6, 256); }));
    const t = ct.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 0.6, D / 0.6); t.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, emissive: 0xe4ecf4, emissiveMap: t, emissiveIntensity: 0.2, color: 0xeef2f6 });
  },
  /** Front szafki (2 drzwiczki): szczeliny wentylacyjne, uchwyty, tabliczki — kolor nadaje materiał */
  lockerTex() {
    return World._lockTex || (World._lockTex = World.canvasTex(256, 512, g => {
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 256, 512);
      [0, 128].forEach(x0 => {
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3; g.strokeRect(x0 + 3, 3, 122, 506);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0 + 6, 6, 3, 500);
        g.fillStyle = '#1c1c1c'; for (let i = 0; i < 6; i++) { g.fillRect(x0 + 30, 34 + i * 12, 68, 5); g.fillRect(x0 + 30, 420 + i * 12, 68, 5); }
        g.fillStyle = '#f4f2ea'; g.fillRect(x0 + 44, 130, 40, 22); g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(x0 + 44, 130, 40, 22);
        g.fillStyle = '#9a9ea3'; g.fillRect(x0 + 100, 230, 10, 56); g.fillStyle = '#3a3a3a'; g.fillRect(x0 + 102, 250, 6, 12);
      });
    }));
  },

  /**
   * Realistyczne drzwi: grupa ustawiona w (x, z), obrót rotY (drzwi patrzą w +z grupy).
   * kind: 'wood' | 'metal' | 'glass'; sign — napis nad drzwiami (opcjonalnie)
   */
  realDoor(parent, x, y, z, rotY, { kind = 'metal', sign = null, lamp = true, w = 1.1, h = 2.2 } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
    const frameM = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.45, metalness: 0.6 });
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    // ościeżnica
    add(new THREE.BoxGeometry(0.1, h + 0.1, 0.16), frameM, -w / 2 - 0.05, (h + 0.1) / 2, 0.02);
    add(new THREE.BoxGeometry(0.1, h + 0.1, 0.16), frameM, w / 2 + 0.05, (h + 0.1) / 2, 0.02);
    add(new THREE.BoxGeometry(w + 0.2, 0.1, 0.16), frameM, 0, h + 0.05, 0.02);
    // skrzydło
    const leafM = kind === 'wood' ? World.pbr('rough_pine_door', 1, 1) : kind === 'glass' ? new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.55 }) : (World._steelDoor || (World._steelDoor = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7b838b').convertSRGBToLinear(), roughness: 0.42, metalness: 0.35, normalMap: World.texSet('grey_plaster').normal, normalScale: new THREE.Vector2(0.15, 0.15) })));
    add(new THREE.BoxGeometry(w, h, 0.05), leafM, 0, h / 2, 0.035);
    if (kind === 'metal') [[h * 0.3], [h * 0.74]].forEach(([py]) => add(new THREE.BoxGeometry(w - 0.3, h * 0.3, 0.012), leafM, 0, py, 0.064)); // przetłoczenia
    if (kind === 'metal') add(new THREE.BoxGeometry(w - 0.1, 0.18, 0.012), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.3 }), 0, 0.12, 0.064); // blacha kopacza
    if (kind !== 'glass') { const win = add(new THREE.BoxGeometry(0.22, 0.9, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a2330, roughness: 0.05, metalness: 0.5, emissive: 0x3a4a5a, emissiveIntensity: 0.4 }), w / 2 - 0.25, h * 0.62, 0.04); win.userData.glass = 1; }
    // klamka i tabliczka
    add(new THREE.BoxGeometry(0.14, 0.025, 0.05), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.95, roughness: 0.2 }), -w / 2 + 0.16, 1.02, 0.09);
    add(new THREE.BoxGeometry(0.04, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.95, roughness: 0.2 }), -w / 2 + 0.1, 1.02, 0.07);
    // próg (betonowy stopień) i daszek z lampką
    add(new THREE.BoxGeometry(w + 0.8, 0.12, 0.7), World.pbr('concrete_floor_02', 1, 0.5), 0, 0.06, 0.4);
    if (lamp) {
      add(new THREE.BoxGeometry(w + 0.9, 0.08, 0.9), frameM, 0, h + 0.38, 0.45);
      const l = add(new THREE.BoxGeometry(0.28, 0.06, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.35, 1.1) }), 0, h + 0.32, 0.5);
      l.userData.glow = 1;
    }
    if (sign) { const s = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.2, 0.16 * sign.length + 0.3), 0.32), new THREE.MeshBasicMaterial({ map: World.signTex(sign, '#1b1b1f', '#f2f2ee', 512, 80) })); s.position.set(0, h + 0.6, 0.05); g.add(s); }
    return g;
  },
});
