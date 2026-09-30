/* =========================================================
   Speedway Empire 3D — zawodnik z modelu człowieka (CC0)
   Model Quaternius (models/man4.glb) ustawiamy w pozycji
   jeźdźca prostym IK: tułów pochylony nad kierownicą, ręce na
   manetkach, prawa noga na podnóżku, lewa — w dwóch wersjach:
   na podnóżku i wysunięta do przodu po torze (łuk). Obie
   wersje są „wypiekane” do jednej geometrii z morph targetem,
   więc Bike.pose płynnie przechodzi między nimi.
   Kevlar, spodnie i rękawice kolorujemy maską jak kibiców.
   Kask, plastron z numerem i stalowy but zostają z bike.js.
   ========================================================= */
'use strict';

const RiderModel = {
  ready: false, FILE: 'models/man4.glb',
  HEIGHT: 1.78,
  HIP: [-0.28, 0.98], // biodra w układzie motocykla (x do przodu, y w górę, z w prawo)

  // cele w układzie motocykla; lewa noga: [na podnóżku, wysunięta]
  T: {
    neck: [0.14, 1.4, 0], head: [0.3, 1.5, 0],
    handL: [0.27, 1.19, -0.38], handR: [0.27, 1.19, 0.38], // nadgarstki: palce obejmują manetki
    kneeR: [0.08, 0.74, 0.25], footR: [-0.1, 0.3, 0.17],
    // wysunięta noga: w układzie pochylonego motocykla stopa sięga toru z boku, a nie daleko z przodu
    kneeL: [[0.08, 0.74, -0.25], [0.16, 0.66, -0.34]], footL: [[-0.1, 0.3, -0.17], [0.28, 0.38, -0.44]],
  },

  load(cb) {
    if (!THREE.GLTFLoader || location.protocol === 'file:') return;
    new THREE.GLTFLoader().load(RiderModel.FILE, g => {
      try { RiderModel.bakeAll(g); RiderModel.ready = true; cb && cb(); } catch (e) { console.warn('Zawodnik z modelu niedostępny', e); }
    }, null, e => console.warn('Zawodnik z modelu niedostępny', e));
  },

  bakeAll(g) {
    const root = g.scene; root.updateMatrixWorld(true);
    const B = {}; root.traverse(o => { if (o.isBone) B[o.name] = o; });
    const rest = new Map(); Object.values(B).forEach(b => rest.set(b, [b.position.clone(), b.quaternion.clone()]));
    const hipM = B.Body.getWorldPosition(new THREE.Vector3());
    const box = new THREE.Box3().setFromObject(root);
    const k = RiderModel.HEIGHT / (box.max.y - box.min.y);
    // stopa (osobna kość w modelu) w układzie podudzia — punkt odniesienia dla IK nogi
    const footRef = s => B['LowerLeg' + s].worldToLocal(B['Foot' + s].getWorldPosition(new THREE.Vector3()));
    const refs = { L: footRef('L'), R: footRef('R') };
    const toM = ([x, y, z]) => { // układ motocykla → układ modelu (model patrzy w +z)
      const gx = (x - RiderModel.HIP[0]) / k, gy = (y - RiderModel.HIP[1]) / k, gz = z / k;
      return new THREE.Vector3(-gz, gy, gx).add(hipM);
    };
    const v1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
    const aim = (bone, refLocal, target) => {
      bone.updateMatrixWorld(true);
      const a = bone.getWorldPosition(v1.clone());
      const cur = refLocal.clone().applyMatrix4(bone.matrixWorld).sub(a).normalize();
      const des = target.clone().sub(a).normalize();
      q3.setFromUnitVectors(cur, des);
      bone.getWorldQuaternion(q1); bone.parent.getWorldQuaternion(q2);
      bone.quaternion.copy(q2.invert().multiply(q3.multiply(q1)));
      bone.updateMatrixWorld(true);
    };
    const ik = (upper, lower, endRef, target, pole) => {
      upper.updateMatrixWorld(true);
      const a = upper.getWorldPosition(new THREE.Vector3());
      const l1 = lower.getWorldPosition(new THREE.Vector3()).distanceTo(a);
      const l2 = endRef.clone().applyMatrix4(lower.matrixWorld).distanceTo(lower.getWorldPosition(new THREE.Vector3()));
      const d = Math.min(target.distanceTo(a), (l1 + l2) * 0.995);
      const u = target.clone().sub(a).normalize();
      const v = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
      const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
      const mid = a.clone().addScaledVector(u, l1 * ca).addScaledVector(v, l1 * sa);
      aim(upper, lower.position, mid);
      aim(lower, endRef, a.clone().addScaledVector(u, d));
    };
    const dirM = ([x, y, z]) => new THREE.Vector3(-z, y, x).normalize();

    const pose = legK => {
      rest.forEach(([p, q], b) => { b.position.copy(p); b.quaternion.copy(q); });
      root.updateMatrixWorld(true);
      const T = RiderModel.T;
      aim(B.Abdomen, B.Torso.position, toM(T.neck));
      aim(B.Torso, B.Neck.position, toM(T.neck));
      aim(B.Neck, B.Head.position, toM(T.head));
      aim(B.Head, new THREE.Vector3(0, 1, 0), B.Head.getWorldPosition(new THREE.Vector3()).add(dirM([0.45, 1, 0])));
      ik(B.UpperArmL, B.LowerArmL, B.PalmL.position, toM(T.handL), dirM([0.1, -1, -0.7]));
      ik(B.UpperArmR, B.LowerArmR, B.PalmR.position, toM(T.handR), dirM([0.1, -1, 0.7]));
      ik(B.UpperLegR, B.LowerLegR, refs.R, toM(T.footR), dirM([1, 0.3, 0.4]));
      const kl = T.kneeL[0].map((a, i) => a + (T.kneeL[1][i] - a) * legK), fl = T.footL[0].map((a, i) => a + (T.footL[1][i] - a) * legK);
      ik(B.UpperLegL, B.LowerLegL, refs.L, toM(fl), dirM([1, 0.5 - legK * 0.3, -0.4 - legK * 0.3]));
      ['L', 'R'].forEach(s => { // stopy (osobne kości) doklejone do końca podudzi
        const f = B['Foot' + s], w = refs[s].clone().applyMatrix4(B['LowerLeg' + s].matrixWorld);
        f.position.copy(f.parent.worldToLocal(w)); f.updateMatrixWorld(true);
      });
      if (legK === 0) { // oś tułowia (do plastronu) w układzie grupy zawodnika
        const toR = v => { v.sub(hipM).multiplyScalar(k); return new THREE.Vector3(v.z + RiderModel.HIP[0] + 0.3, v.y + RiderModel.HIP[1] - 1.0, -v.x); };
        RiderModel.torso = { a: toR(B.Abdomen.getWorldPosition(new THREE.Vector3())), b: toR(B.Neck.getWorldPosition(new THREE.Vector3())) };
      }
      return RiderModel.skin(root, hipM, k);
    };
    const a = pose(0), b = pose(1);
    a.morphAttributes.position = [b.attributes.position];
    RiderModel.geo = a;
  },

  /** Skinning na CPU → geometria w układzie grupy zawodnika (bike.js: rider) */
  skin(root, hipM, k) {
    const pos = [], col = [], msk = [], idx = [], v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isSkinnedMesh) return;
      o.skeleton.update();
      const P = o.geometry.attributes.position, base = pos.length / 3;
      const m = People.mask(o.material, o.name), c = o.material.color;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i); o.boneTransform(i, v); v.applyMatrix4(o.matrixWorld).sub(hipM).multiplyScalar(k);
        // model → motocykl: +z modelu = +x motocykla; biodra w punkcie HIP względem grupy zawodnika (-0.3, 1.0)
        pos.push(v.z + RiderModel.HIP[0] + 0.3, v.y + RiderModel.HIP[1] - 1.0, -v.x);
        col.push(c.r, c.g, c.b); msk.push(m);
      }
      const I = o.geometry.index;
      for (let i = 0; i < I.count; i++) idx.push(base + I.getX(i));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('mask', new THREE.Float32BufferAttribute(msk, 1));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  },

  /** Materiał na zawodnika: kolory części ciała z uniformów (atrybutów nie starcza obok morph targetów) */
  material(cols) {
    const lin = h => new THREE.Color(h).convertSRGBToLinear();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, morphTargets: true });
    m.userData.u = { uShirt: { value: lin(cols[0]) }, uSkin: { value: lin(cols[1]) }, uHair: { value: lin(cols[2]) }, uPants: { value: lin(cols[3]) } };
    m.onBeforeCompile = RiderModel.compile;
    return m;
  },
  compile: function (sh) {
    Object.assign(sh.uniforms, this.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float mask; uniform vec3 uShirt; uniform vec3 uSkin; uniform vec3 uHair; uniform vec3 uPants;`)
      .replace('#include <color_vertex>', `#include <color_vertex>
        if (mask > 0.5 && mask < 1.5) vColor.xyz = uShirt;
        else if (mask > 1.5 && mask < 2.5) vColor.xyz = uSkin;
        else if (mask > 2.5 && mask < 3.5) vColor.xyz = uHair;
        else if (mask > 3.5) vColor.xyz = uPants;`);
  },

  /**
   * Plastron (kamizelka z numerem) założony na tułów: otwarty walec wzdłuż osi tułowia,
   * duży numer na plecach, mniejszy na piersi, boki w barwach klubu.
   */
  vest(x) {
    const T = RiderModel.torso, dir = T.b.clone().sub(T.a), len = dir.length();
    const tex = World.canvasTex(512, 256, g => {
      g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, 512, 256);
      g.fillStyle = x.kevlar;
      g.fillRect(0, 0, 512, 26); g.fillRect(0, 230, 512, 26);                       // lamówki góra/dół
      [[0, 38], [218, 76], [474, 38]].forEach(([u, w]) => g.fillRect(u, 0, w, 256));  // boki (pod pachami)
      g.fillStyle = x.trim; g.fillRect(0, 26, 512, 6); g.fillRect(0, 224, 512, 6);
      g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 168px "Barlow Condensed", Impact, sans-serif'; g.fillText(String(x.no), 384, 128);  // plecy
      g.font = 'bold 84px "Barlow Condensed", Impact, sans-serif'; g.fillText(String(x.no), 128, 118);   // pierś
      g.fillStyle = x.kevlar; g.font = 'bold 22px "Saira Stencil One", Impact, sans-serif'; g.fillText('SPEEDWAY', 384, 212);
    });
    const geo = new THREE.CylinderGeometry(0.2, 0.18, len * 0.72, 24, 1, true);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, side: THREE.DoubleSide }));
    m.position.copy(T.a).addScaledVector(dir, 0.52);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.scale.set(0.78, 1, 1.02); // płaski tułów: głębokość mniejsza niż szerokość
    m.castShadow = true;
    return m;
  },

  /** Podmiana zawodnika z kapsuł na model; kolory: kevlar, spodnie w barwie dodatku, czarne rękawice */
  attach(b) {
    if (!RiderModel.ready || b.model) return;
    const x = b.x;
    const mesh = new THREE.Mesh(RiderModel.geo, RiderModel.material([x.kevlar, '#1a1a1a', '#111111', x.kevlar]));
    mesh.castShadow = true;
    b.rider.children.forEach(ch => { if (!ch.userData.keep || ch.userData.bib) ch.visible = false; });
    b.rider.add(mesh);
    b.rider.add(RiderModel.vest(x));
    b.model = mesh;
    Bike.pose(b, b.vis ? b.vis.legK : 0);
  },
};
