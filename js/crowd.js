/* =========================================================
   Speedway Empire 3D — kibice i ludzie przy torze
   Każdy kibic to postać z części: nogi, tułów (kurtka albo
   koszulka klubu), głowa (różne odcienie skóry), włosy albo
   czapka, dwie ręce, u części szalik. Tysiące postaci rysowane
   jako InstancedMesh (jedna paczka na część ciała).
   Zachowanie: siedzą albo stoją; gdy prowadzi twój zawodnik —
   klaszczą, podnoszą ręce, skaczą, machają szalikami; między
   biegami trybuną przechodzi „meksykańska fala”.
   Crowd.person() buduje pojedynczą postać (sędzia, fotoreporter,
   operator kamery, mechanik).
   ========================================================= */
'use strict';

const Crowd = {
  SKIN: ['#f3d6bd', '#ecc5a2', '#e0b08a', '#cf9a70', '#b8805a', '#94603f', '#6e4429', '#4d2e1c'],
  HAIR: ['#161010', '#2b1d12', '#4a3020', '#6b4726', '#9c6b3c', '#c9a063', '#7c7c7c', '#d6d2cc', '#5a1f12'],
  JACKETS: ['#23262e', '#16171a', '#3d424c', '#5e2a22', '#2c4631', '#2e4466', '#7d6f53', '#b0aa9c', '#4e2640', '#c9c4ba', '#1e3a5a', '#6a6a60'],
  PANTS: ['#1c2130', '#242427', '#343944', '#44362a', '#1b2336', '#4a4a52'],
  people: [], parts: null, dummy: new THREE.Object3D(), m: new THREE.Matrix4(), base: new THREE.Matrix4(),

  lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); },
  pick: a => a[Math.floor(Math.random() * a.length)],

  /** Geometrie części ciała (osoba patrzy w +x, stopy na y = 0) */
  geos() {
    if (Crowd._g) return Crowd._g;
    const arm = new THREE.BoxGeometry(0.09, 0.5, 0.09); arm.translate(0, -0.25, 0); // obrót w barku
    const hair = new THREE.SphereGeometry(0.122, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const cap = new THREE.CylinderGeometry(0.125, 0.128, 0.09, 8); cap.translate(0, 0.07, 0);
    Crowd._g = {
      legs: new THREE.BoxGeometry(0.26, 0.8, 0.3),
      torso: new THREE.CylinderGeometry(0.2, 0.16, 0.62, 8),
      head: new THREE.SphereGeometry(0.115, 10, 8),
      hair, cap, arm,
      scarf: new THREE.BoxGeometry(0.07, 0.08, 0.46),
    };
    return Crowd._g;
  },

  /**
   * spots: [{x, y, z, yaw, seated, team: 'h'|'a'|null}]
   * colors: { h: [kolor1, kolor2], a: [kolor1, kolor2] }
   */
  build(scene, spots, colors) {
    const G = Crowd.geos(), n = spots.length;
    const mk = (geo, count) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), count);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
      return im;
    };
    const P = Crowd.parts = {
      legs: mk(G.legs, n), torso: mk(G.torso, n), head: mk(G.head, n), hair: mk(G.hair, n), cap: mk(G.cap, n),
      armL: mk(G.arm, n), armR: mk(G.arm, n), scarf: mk(G.scarf, n),
    };
    Crowd.people = spots.map((sp, i) => {
      const fan = sp.team ? 0.6 + Math.random() * 0.4 : 0.2 + Math.random() * 0.5;
      const tc = sp.team ? colors[sp.team] : null;
      const shirt = tc && Math.random() < 0.55 ? tc[Math.random() < 0.7 ? 0 : 1] : Crowd.pick(Crowd.JACKETS);
      const skin = Crowd.pick(Crowd.SKIN);
      const hasCap = Math.random() < 0.22, hasScarf = tc && Math.random() < 0.45;
      const p = { ...sp, fan, ph: Math.random() * 6.28, hasCap, hasScarf, jump: 0, arms: 0.12 };
      P.legs.setColorAt(i, Crowd.lin(Crowd.pick(Crowd.PANTS)));
      P.torso.setColorAt(i, Crowd.lin(shirt));
      P.head.setColorAt(i, Crowd.lin(skin));
      P.hair.setColorAt(i, Crowd.lin(Crowd.pick(Crowd.HAIR)));
      P.cap.setColorAt(i, Crowd.lin(tc ? tc[1] : Crowd.pick(Crowd.JACKETS)));
      P.armL.setColorAt(i, Crowd.lin(shirt)); P.armR.setColorAt(i, Crowd.lin(shirt));
      P.scarf.setColorAt(i, Crowd.lin(tc ? tc[Math.random() < 0.5 ? 0 : 1] : '#888'));
      return p;
    });
    Object.values(P).forEach(im => { im.instanceColor.needsUpdate = true; });
    Crowd.frame = 0; Crowd.colors = colors;
    Crowd.update(0, 0, 0, true);
    // prawdziwe modele (people.js) — po wczytaniu zastępują proste postacie
    if (typeof People !== 'undefined') People.load(() => {
      Object.values(P).forEach(im => { im.visible = false; });
      People.attach(scene, Crowd.people);
      People.recolor(Crowd.colors);
      (Crowd.standing || []).forEach(({ g, o }) => People.swapPerson(g, o));
    });
  },

  /** Kolory szalików i koszulek zmieniają się z gospodarzem meczu */
  recolor(colors) {
    const P = Crowd.parts;
    if (!P) return;
    Crowd.colors = colors;
    if (People.ready) People.recolor(colors);
    Crowd.people.forEach((p, i) => {
      if (!p.team) return;
      const tc = colors[p.team];
      if (Math.random() < 0.55) { const c = Crowd.lin(tc[Math.random() < 0.7 ? 0 : 1]); P.torso.setColorAt(i, c); P.armL.setColorAt(i, c); P.armR.setColorAt(i, c); }
      P.scarf.setColorAt(i, Crowd.lin(tc[Math.random() < 0.5 ? 0 : 1]));
      P.cap.setColorAt(i, Crowd.lin(tc[1]));
    });
    Object.values(P).forEach(im => { im.instanceColor.needsUpdate = true; });
  },

  /**
   * Animacja. excitement: 0–1 (jak bardzo trybuny żyją), wave: 0–1 siła fali.
   * Co klatkę aktualizowana jest połowa kibiców (naprzemiennie), żeby było lekko.
   */
  update(t, dt, excitement, all) {
    const P = Crowd.parts;
    if (!P) return;
    if (People.people.length) { if (Crowd.waveT != null && -70 + (t - Crowd.waveT) * 22 > 80) Crowd.waveT = null; return People.update(t, dt, excitement); }
    Crowd.frame++;
    const D = Crowd.dummy, M = Crowd.m, B = Crowd.base;
    const par = Crowd.frame % 2;
    const waveX = Crowd.waveT != null ? -70 + (t - Crowd.waveT) * 22 : null; // fala biegnie wzdłuż trybuny
    if (waveX != null && waveX > 80) Crowd.waveT = null;

    for (let i = all ? 0 : par; i < Crowd.people.length; i += all ? 1 : 2) {
      const p = Crowd.people[i];
      let e = excitement * p.fan;
      if (waveX != null && p.z > 0) e = Math.max(e, Math.exp(-Math.pow((p.x - waveX) / 4, 2)));
      const up = e > 0.55 ? 1 : e > 0.3 ? 0.5 : 0;
      const armT = up === 1 ? 2.6 + Math.sin(t * 6 + p.ph) * 0.25 : up === 0.5 ? 1.0 + Math.sin(t * 9 + p.ph) * 0.35 : 0.12;
      p.arms += (armT - p.arms) * 0.25;
      const jumpT = up === 1 && !p.seated ? Math.max(0, Math.sin(t * 7 + p.ph)) * 0.22 : 0;
      const seated = p.seated && !(waveX != null && e > 0.5) && up < 1; // przy fali i radości wstają
      const lift = seated ? -0.42 : 0;

      D.position.set(p.x, p.y + jumpT, p.z); D.rotation.set(0, p.yaw, 0); D.scale.set(1, 1, 1); D.updateMatrix(); B.copy(D.matrix);
      const put = (im, x, y, z, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
        D.position.set(x, y, z); D.rotation.set(rx, 0, rz); D.scale.set(sx, sy, sz); D.updateMatrix();
        M.multiplyMatrices(B, D.matrix); im.setMatrixAt(i, M);
      };
      if (seated) put(P.legs, 0.2, 0.2, 0, 0, Math.PI / 2, 1, 0.8, 1);
      else put(P.legs, 0, 0.4, 0);
      put(P.torso, 0, 1.1 + lift, 0);
      put(P.head, 0.02, 1.54 + lift, 0);
      if (p.hasCap) { put(P.cap, 0.02, 1.58 + lift, 0); put(P.hair, 0, -50, 0); }
      else { put(P.hair, 0.0, 1.56 + lift, 0, 0, 0.2); put(P.cap, 0, -50, 0); }
      // ręce: obrót w barku do przodu i w górę, lekko na boki
      put(P.armL, 0.02, 1.35 + lift, -0.22, -0.15 - p.arms * 0.08, p.arms);
      put(P.armR, 0.02, 1.35 + lift, 0.22, 0.15 + p.arms * 0.08, p.arms);
      if (p.hasScarf) {
        if (p.arms > 2.2) put(P.scarf, 0.12, 1.96 + lift, 0, 0, 0, 1, 1, 1.9); // szalik rozpostarty nad głową
        else put(P.scarf, 0.16, 1.33 + lift, 0);
      } else put(P.scarf, 0, -50, 0);
    }
    Object.values(P).forEach(im => { im.instanceMatrix.needsUpdate = true; });
  },

  wave(t) { if (Crowd.waveT == null) Crowd.waveT = t; },

  /**
   * Pojedyncza postać (nieinstancjonowana): sędzia, fotoreporter, mechanik.
   * o: { jacket, pants, skin, hair, pose: 'stand'|'crouch'|'flag'|'camera', flag }
   */
  person(o = {}) {
    const G = Crowd.geos();
    const g = new THREE.Group();
    const mat = c => new THREE.MeshStandardMaterial({ color: Crowd.lin(c), roughness: 0.8 });
    const jacket = mat(o.jacket || Crowd.pick(Crowd.JACKETS));
    const crouch = o.pose === 'crouch';
    const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, 0, rz); me.castShadow = true; g.add(me); return me; };
    add(G.legs, mat(o.pants || Crowd.pick(Crowd.PANTS)), crouch ? 0.15 : 0, crouch ? 0.25 : 0.4, 0, 0, crouch ? 1.2 : 0).scale.y = crouch ? 0.7 : 1;
    const dy = crouch ? -0.45 : 0;
    add(G.torso, jacket, 0, 1.1 + dy, 0);
    add(G.head, mat(o.skin || Crowd.pick(Crowd.SKIN)), 0.02, 1.54 + dy, 0);
    add(o.cap ? G.cap : G.hair, mat(o.cap || o.hair || Crowd.pick(Crowd.HAIR)), 0.02, (o.cap ? 1.58 : 1.56) + dy, 0);
    const armUp = o.pose === 'flag' ? 2.2 : o.pose === 'camera' || crouch ? 1.4 : 0.1;
    add(G.arm, jacket, 0.02, 1.35 + dy, -0.22, -0.15, armUp);
    add(G.arm, jacket, 0.02, 1.35 + dy, 0.22, 0.15, o.pose === 'flag' ? 0.2 : armUp);
    if (o.pose === 'flag') {
      const stick = add(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5), mat('#dddddd'), 0.55, 1.95 + dy, -0.25);
      stick.rotation.z = -0.5;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), new THREE.MeshStandardMaterial({ color: Crowd.lin(o.flag || '#F2C230'), side: THREE.DoubleSide }));
      fl.position.set(0.85, 2.2 + dy, -0.25); g.add(fl);
      g.userData.flag = fl;
    }
    if (o.pose === 'camera' || crouch) {
      const cam = add(new THREE.BoxGeometry(0.22, 0.16, 0.14), mat('#111111'), 0.42, 1.5 + dy, 0);
      const lens = add(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 10), mat('#1a1a1a'), 0.6, 1.5 + dy, 0);
      lens.rotation.z = Math.PI / 2;
      cam.userData.cam = true;
    }
    if (!o.pose || o.pose === 'stand') { if (Humans.ready || People.ready) People.swapPerson(g, o); else (Crowd.standing = Crowd.standing || []).push({ g, o }); }
    return g;
  },
};
