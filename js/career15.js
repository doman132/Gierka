/* =========================================================
   Speedway Empire 3D — v2.5: drzwi-portale w mieście
   Podchodzisz do lokalu → drzwi się otwierają, a w otworze widać
   prawdziwe wnętrze (renderowane na żywo z kamery przeniesionej do
   pokoju). Przejście przez próg = jesteś w środku, bez ekranu ładowania.
   Wyjście przez drzwi pokoju stawia cię na chodniku przed wejściem.
   ========================================================= */
'use strict';

const Portal = {
  doors: [], rt: null, cam: null, active: null, _m: new THREE.Matrix4(), _m2: new THREE.Matrix4(),
  W: 1.35, H: 2.35,

  roomOf(place) { return place === 'dom' ? 'home' : City.ROOM[place]; },

  /** Drzwi na fasadach lokali (po zbudowaniu miasta) */
  build() {
    const M = Miasto, G = M.G; Portal.doors.forEach(d => d.g.parent && d.g.parent.remove(d.g)); Portal.doors = [];
    if (!G || !M.doors) return;
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.6 }), frameM = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.5, metalness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35 });
    Object.entries(M.doors).forEach(([place, d]) => {
      const key = Portal.roomOf(place); if (!key || !World.rooms[key] || place === 'osiedle') return;
      const nx = Math.sin(d.yaw), nz = Math.cos(d.yaw); // kierunek do wnętrza budynku
      const fx = d.x + nx * 1.25, fz = d.z + nz * 1.25, th = Math.atan2(-nx, -nz); // lico fasady, obrót: lokalne −z → do środka
      const g = new THREE.Group(); g.position.set(fx, 0, fz); g.rotation.y = th; G.add(g);
      const W = Portal.W, H = Portal.H, box = (w, h, dd, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
      box(0.12, H + 0.12, 0.3, frameM, -W / 2 - 0.06, (H + 0.12) / 2, 0.05); box(0.12, H + 0.12, 0.3, frameM, W / 2 + 0.06, (H + 0.12) / 2, 0.05); box(W + 0.24, 0.14, 0.3, frameM, 0, H + 0.07, 0.05);
      box(W + 0.6, 0.08, 0.7, frameM, 0, 0.04, 0.3); // próg
      // skrzydło na zawiasie (lewa krawędź), z szybą
      const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, 0.06); g.add(hinge);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.06), wood); leaf.position.set(W / 2, H / 2, 0); hinge.add(leaf);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.55, H * 0.35), glass); pane.position.set(W / 2, H * 0.68, 0.035); hinge.add(pane);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), frameM); handle.rotation.z = Math.PI / 2; handle.position.set(W - 0.12, 1.02, 0.07); hinge.add(handle);
      // portal: płaszczyzna w otworze, próbkuje obraz wnętrza we współrzędnych ekranu
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, k: { value: 0 } },
        vertexShader: 'varying vec4 vP; void main(){ vP = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = vP; }',
        fragmentShader: 'uniform sampler2D map; uniform float k; varying vec4 vP; void main(){ vec2 uv = vP.xy / vP.w * 0.5 + 0.5; vec3 c = texture2D(map, uv).rgb; gl_FragColor = vec4(mix(vec3(0.05,0.04,0.035), c, k), 1.0); }',
      });
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); portal.position.set(0, H / 2, 0.02); g.add(portal);
      Portal.doors.push({ place, key, g, hinge, portal, fx, fz, nx, nz, th, open: 0 });
    });
  },

  /** Macierz „drzwi → pokój”: pozycja w mieście (świat) → pozycja w pokoju */
  xform(d) {
    const M = Miasto, R = World.rooms[d.key];
    const Td = new THREE.Matrix4().compose(new THREE.Vector3(M.CX + d.fx, World.LOCKER_Y, d.fz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.th), new THREE.Vector3(1, 1, 1));
    const Tr = new THREE.Matrix4().makeTranslation(R.cx, World.LOCKER_Y, R.D / 2);
    return Tr.multiply(Td.invert());
  },

  ensureRT() {
    const r = World.renderer, sz = r.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(256, sz.x >> 1), h = Math.max(256, sz.y >> 1);
    if (!Portal.rt) { Portal.rt = new THREE.WebGLRenderTarget(w, h); Portal.rt.texture.encoding = THREE.sRGBEncoding; Portal.cam = new THREE.PerspectiveCamera(); }
    if (Portal.rt.width !== w || Portal.rt.height !== h) Portal.rt.setSize(w, h);
  },

  /** Wnętrze lokalu: meble i ludzie, zanim gracz wejdzie */
  preview(d) {
    if (Portal.pre === d.key) return;
    const keys = [...new Set((Rooms.FURN[d.key] || []).map(l => l[0]))];
    if (!Furn.ready(keys)) { if (!Portal._loading) { Portal._loading = true; Furn.load(keys, () => { Portal._loading = false; }); } return; }
    Portal.clearPreview();
    const was = Walk.room, spots = Walk.spots;
    try { Walk.room = d.key; Rooms.populate(d.key); } catch (e) { console.warn('Podgląd wnętrza', e); } finally { Walk.room = was; Walk.spots = spots; }
    Portal.pre = d.key;
  },
  clearPreview() { if (Portal.pre) { Rooms.clear(); Portal.pre = null; } },

  tick(dt) {
    const M = Miasto; if (Walk.room !== 'miasto' || !M.G) return;
    if (Portal._built !== M.G) { Portal._built = M.G; Portal.build(); }
    const px = Walk.x - M.CX, pz = Walk.z;
    let best = null, bd = 16;
    Portal.doors.forEach(d => {
      const rx = px - d.fx, rz = pz - d.fz, front = -(rx * d.nx + rz * d.nz), dist = Math.hypot(rx, rz);
      const want = dist < 4.2 && front > -0.3 ? 1 : 0;
      d.open += (want - d.open) * Math.min(1, dt * 3.2);
      d.hinge.rotation.y = -d.open * 1.75;
      if (front > 0.2 && dist < bd) { bd = dist; best = d; }
    });
    // przygotuj wnętrze najbliższych drzwi; dalej niż 22 m — posprzątaj
    if (best && bd < 12) Portal.preview(best); else if (!best || bd > 22) Portal.clearPreview();
    Portal.active = best && best.open > 0.04 && Portal.pre === best.key ? best : null;
    Portal.doors.forEach(d => { d.portal.visible = d === Portal.active; });
    if (!Portal.active) return;
    const d = Portal.active; d.portal.material.uniforms.k.value = Math.min(1, d.open * 1.6);
    Portal.render(d);
    // próg: przejście przez drzwi
    const rx = px - d.fx, rz = pz - d.fz, front = -(rx * d.nx + rz * d.nz), lat = Math.abs(rx * d.nz - rz * d.nx);
    if (d.open > 0.8 && front < 0.75 && lat < Portal.W / 2 && !Portal._busy) Portal.enter(d);
  },

  render(d) {
    const r = World.renderer, cam = World.camera, M = Miasto; Portal.ensureRT();
    const T = Portal.xform(d); cam.updateMatrixWorld();
    const pc = Portal.cam; pc.fov = cam.fov; pc.aspect = cam.aspect; pc.near = 0.05; pc.far = 120; pc.updateProjectionMatrix();
    pc.matrixWorld.multiplyMatrices(T, cam.matrixWorld); pc.matrixWorld.decompose(pc.position, pc.quaternion, pc.scale); pc.matrixWorldInverse.copy(pc.matrixWorld).invert();
    const R = World.rooms[d.key], VG = World.venueGroup, sc = World.realScene || World.scene;
    const prev = r.getRenderTarget(), clip = r.clippingPlanes, vis = [M.G.visible, VG && VG.visible], fog = sc.fog;
    M.G.visible = false; if (VG) VG.visible = true; sc.fog = null;
    // światło jak we wnętrzu: lampy tego pokoju, bez słońca stadionu
    const lamps = (R.group && R.group.userData.lights) || [], hemi = sc.children.find(o => o.isHemisphereLight), key = World.key;
    const lv = lamps.map(l => l.visible), hi = hemi && hemi.intensity, ki = key && key.intensity;
    lamps.forEach(l => { l.visible = true; }); if (hemi) hemi.intensity = 0.18; if (key) key.intensity = 0;
    r.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), R.D / 2 - 0.4)]; // ściana z drzwiami pokoju nie zasłania widoku
    r.setRenderTarget(Portal.rt); r.clear(); r.render(sc, pc);
    r.setRenderTarget(prev); r.clippingPlanes = clip; M.G.visible = vis[0]; if (VG) VG.visible = vis[1]; sc.fog = fog;
    lamps.forEach((l, i) => { l.visible = lv[i]; }); if (hemi) hemi.intensity = hi; if (key) key.intensity = ki;
    d.portal.material.uniforms.map.value = Portal.rt.texture;
  },

  /** Wejście przez próg: ta sama poza kamery, tylko już w pokoju */
  enter(d) {
    Portal._busy = true;
    const T = Portal.xform(d), p = new THREE.Vector3(Walk.x, World.LOCKER_Y, Walk.z).applyMatrix4(T), yaw = Walk.yaw - d.th, pitch = Walk.pitch;
    Portal.pre = null; // enterRoom i tak wyczyści i ułoży pokój od nowa (modele są już w pamięci)
    try { Door._busy = true; Career.roomAct('w:in:' + d.place); } finally { Door._busy = false; }
    if (Walk.room === d.key) {
      const R = World.rooms[d.key];
      Walk.x = Math.max(R.cx - R.W / 2 + 0.6, Math.min(R.cx + R.W / 2 - 0.6, p.x)); Walk.z = Math.min(R.D / 2 - 0.9, p.z); Walk.yaw = yaw; Walk.pitch = pitch;
      Portal.from = d;
    } else { Walk.x -= d.nx * 1.2; Walk.z -= d.nz * 1.2; } // zamknięte — cofnij na chodnik
    setTimeout(() => { Portal._busy = false; }, 600);
  },

  /** W pokoju: wyjście przez drzwi na ulicę (bez wygaszania) */
  roomTick() {
    if (!Portal.from || Walk.room !== Portal.from.key || Portal._busy) return;
    const d = Portal.from, R = World.rooms[d.key];
    if (Walk.z > R.D / 2 - 0.75 && Math.abs(Walk.x - R.cx) < 0.9) {
      Portal._busy = true;
      const inv = Portal.xform(d).invert(), yaw = Walk.yaw + d.th, pitch = Walk.pitch, x = Walk.x;
      try { Door._out = true; Walk.leaveRoom(false); } finally { Door._out = false; }
      if (Walk.room === 'miasto') {
        const p = new THREE.Vector3(x, World.LOCKER_Y, R.D / 2 + 1.1).applyMatrix4(inv);
        Walk.x = p.x; Walk.z = p.z; Walk.yaw = yaw; Walk.pitch = pitch; d.open = 1;
      }
      Portal.from = null; setTimeout(() => { Portal._busy = false; }, 600);
    }
  },
};
(() => {
  const bt = Rooms.tick;
  Rooms.tick = function (dt) { bt.call(this, dt); try { if (Walk.room === 'miasto') Portal.tick(dt); else Portal.roomTick(); } catch (e) { console.warn('Portal', e); } };
  // wejście do pokoju zwykłą drogą (E, mapa) kasuje podgląd
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { if (key !== 'miasto') { Portal.pre = null; if (!Portal._busy) Portal.from = null; } return be.call(this, key); };
})();
