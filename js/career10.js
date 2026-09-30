/* =========================================================
   Speedway Empire 3D — przytulenie i pocałunek (animacja postaci)
   Biblioteka Rocketbox nie ma takich klipów, więc pozę liczymy
   na kościach szkieletu (odwrotna kinematyka rąk, pochylenie
   kręgosłupa, szyi i głowy) na bazie animacji oddychania.
   Kamera pokazuje parę z boku przez kilka sekund.
   ========================================================= */
'use strict';

const Hug = {
  _q: new THREE.Quaternion(), _q2: new THREE.Quaternion(), _v: new THREE.Vector3(), _w: new THREE.Vector3(),
  bone(g, n) { return g.userData.human.root.getObjectByName(n); },
  wpos(b, out = new THREE.Vector3()) { return b.getWorldPosition(out); },
  /** Obróć kość tak, by kierunek kość→dziecko wskazywał na cel (w świecie) */
  aim(bone, child, target, w = 1) {
    if (!bone || !child) return;
    const p = Hug.wpos(bone), c = Hug.wpos(child, new THREE.Vector3()), cur = c.sub(p).normalize(), des = target.clone().sub(p).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, des); if (w < 1) q.slerp(new THREE.Quaternion(), 1 - w);
    const bw = bone.getWorldQuaternion(new THREE.Quaternion()), pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
    bone.updateMatrixWorld(true);
  },
  fwd(g) { const r = g.rotation.y; return new THREE.Vector3(Math.cos(r), 0, -Math.sin(r)); },
  /** Poza pary: kind = 'hug' | 'kiss'; a — on, b — ona */
  pose(a, b, kind, k) {
    const up = new THREE.Vector3(0, 1, 0);
    [[a, b], [b, a]].forEach(([me, other], idx) => {
      const f = Hug.fwd(me), left = new THREE.Vector3(f.z, 0, -f.x), fo = Hug.fwd(other);
      const sp = Hug.bone(me, 'Bip01_Spine2'), ne = Hug.bone(me, 'Bip01_Neck'), he = Hug.bone(me, 'Bip01_Head');
      const oSp = Hug.wpos(Hug.bone(other, 'Bip01_Spine2')), oNe = Hug.wpos(Hug.bone(other, 'Bip01_Neck')), myHead = Hug.wpos(he), oHead = Hug.wpos(Hug.bone(other, 'Bip01_Head'));
      // pochylenie tułowia do partnera
      Hug.aim(sp, ne, Hug.wpos(sp).add(up.clone().multiplyScalar(0.3)).add(f.clone().multiplyScalar(0.07 * k)), k);
      ['L', 'R'].forEach(sd => {
        const s = sd === 'L' ? 1 : -1, side = left.clone().multiplyScalar(s);
        const ua = Hug.bone(me, `Bip01_${sd}_UpperArm`), fa = Hug.bone(me, `Bip01_${sd}_Forearm`), hd = Hug.bone(me, `Bip01_${sd}_Hand`);
        let elbow, hand;
        if (kind === 'kiss' && idx === 1) { // ona: dłonie na karku / ramionach partnera
          elbow = Hug.wpos(ua).add(f.clone().multiplyScalar(0.2)).add(side.clone().multiplyScalar(0.16)).add(up.clone().multiplyScalar(-0.08));
          hand = oNe.clone().add(up.clone().multiplyScalar(-0.1)).add(side.clone().multiplyScalar(0.12)).add(fo.clone().multiplyScalar(-0.03));
        } else if (kind === 'kiss') { // on: dłonie na talii
          elbow = Hug.wpos(ua).add(f.clone().multiplyScalar(0.18)).add(side.clone().multiplyScalar(0.17)).add(up.clone().multiplyScalar(-0.26));
          hand = oSp.clone().add(up.clone().multiplyScalar(-0.26)).add(side.clone().multiplyScalar(0.14)).add(f.clone().multiplyScalar(0.02));
        } else { // przytulenie: ramiona oplatają plecy
          elbow = Hug.wpos(ua).add(f.clone().multiplyScalar(0.24)).add(side.clone().multiplyScalar(0.2)).add(up.clone().multiplyScalar(idx ? 0.02 : -0.06));
          hand = oSp.clone().add(fo.clone().multiplyScalar(-0.1)).add(side.clone().multiplyScalar(0.04)).add(up.clone().multiplyScalar(idx ? 0.04 : -0.06));
        }
        Hug.aim(ua, fa, elbow.clone().lerp(Hug.wpos(fa), 1 - k), 1);
        Hug.aim(fa, hd, hand.clone().lerp(Hug.wpos(hd), 1 - k), 1);
      });
      // głowa: przy pocałunku do ust partnera, przy przytuleniu — w bok, na ramię
      const tgt = kind === 'kiss' ? myHead.clone().lerp(oHead, 0.5).add(up.clone().multiplyScalar(idx ? 0.02 : -0.02)) : myHead.clone().add(f.clone().multiplyScalar(0.3)).add(left.clone().multiplyScalar(0.12)).add(up.clone().multiplyScalar(-0.06));
      const nd = Hug.wpos(he).sub(Hug.wpos(ne)).length();
      Hug.aim(ne, he, Hug.wpos(ne).add(tgt.clone().sub(Hug.wpos(ne)).normalize().multiplyScalar(nd)).lerp(Hug.wpos(ne).add(up.clone().multiplyScalar(nd)), 0.35 + (1 - k) * 0.65), 1);
    });
  },
  /** Scena: para w mieszkaniu, kamera z boku */
  play(kind) {
    const Z = City.Z(), G = Z.gf; if (!G || !Humans.ready || !Walk.active) return false;
    const R = World.rooms[Walk.room], Y = World.LOCKER_Y, cx = R.cx + (Walk.room === 'home' ? 2 : 0), cz = Walk.room === 'home' ? 2.4 : 1;
    const dist = kind === 'kiss' ? 0.3 : 0.34;
    const he = Humans.make('Male_Adult_08', 'idle', { clip: 'idle_breathe_01' }), she = Humans.make(City.gfKey(), 'idle', { clip: 'idle_breathe_01', sex: 'f' });
    if (!he || !she) return false;
    he.position.set(cx - dist / 2, Y, cz); he.rotation.y = 0; she.position.set(cx + dist / 2, Y, cz); she.rotation.y = Math.PI;
    World.venueGroup.add(he); World.venueGroup.add(she);
    // ukryj siedzącą dziewczynę na czas sceny
    const hidden = Rooms.dyn.filter(o => o.userData && o.userData.human && o !== he && o !== she && Math.hypot(o.position.x - cx, o.position.z - cz) < 6 && o.userData.human.A && o.userData.human.A.s === 'f');
    hidden.forEach(o => { o.visible = false; });
    const t0 = performance.now(), dur = 5200;
    const post = () => { const t = (performance.now() - t0) / dur, k = Math.min(1, t * 3.2, (1 - t) * 3.2); Hug.pose(he, she, kind, Math.max(0, k)); };
    // poza liczona po zaktualizowaniu animacji obu postaci (co drugie wywołanie = raz na klatkę)
    let n = 0; he.userData.human.post = she.userData.human.post = () => { if (++n % 2 === 0) post(); };
    Walk.cine = { x: cx + 0.2, z: cz + 1.9, y: Y + 1.62, look: new THREE.Vector3(cx, Y + 1.5, cz), until: performance.now() + dur };
    let fx = document.getElementById('kissfx'); if (!fx) { fx = document.createElement('div'); fx.id = 'kissfx'; document.body.appendChild(fx); }
    fx.innerHTML = kind === 'kiss' ? Array.from({ length: 10 }, (_, i) => `<i style="left:${20 + Math.random() * 60}%;animation-delay:${(1.2 + i * 0.15).toFixed(2)}s">❤</i>`).join('') : ''; fx.className = kind === 'kiss' ? 'on soft' : '';
    setTimeout(() => { [he, she].forEach(o => o.parent && o.parent.remove(o)); hidden.forEach(o => { o.visible = true; }); Walk.cine = null; fx.className = ''; }, dur);
    return true;
  },
};
(() => {
  // kamera sceny i blokada ruchu
  const bf = Walk.frame;
  Walk.frame = function (dt) {
    if (Walk.cine) Walk.keys = {};
    bf.call(this, dt);
    const C = Walk.cine; if (!C) return;
    const cam = World.camera; cam.position.set(C.x, C.y, C.z); cam.lookAt(C.look);
  };
  // randka: przytul / pocałuj — z animacją postaci
  const bd = City.dateAct;
  City.dateAct = function (k) {
    const Z = City.Z(), G = Z.gf;
    if (k === 'hug' || k === 'kiss') {
      UI.close(); if (!G) return;
      if (!City.gate(k)) return;
      G.rel = Math.min(100, G.rel + (k === 'kiss' ? 5 : 3)); Z.stress -= k === 'kiss' ? 5 : 4; City.clamp(Z); Game.save();
      if (!Hug.play(k)) UI.toast(k === 'kiss' ? `${G.name} całuje cię… ❤` : `Przytulacie się długo. ${G.name} wtula się w ciebie.`);
      else UI.toast(k === 'kiss' ? `${G.name} ❤ Związek +5` : `Przytulacie się długo. Związek +3`);
      return;
    }
    const r = bd.call(this, k);
    if (k === 'talk' && G) {
      const box = document.querySelector('#modal .talk-opts');
      if (box && !box.querySelector('[data-v="hug"]')) box.insertAdjacentHTML('afterbegin', `<button class="opt" data-ui="cityDate" data-v="hug" ${City.canDo('hug').ok ? '' : 'disabled'}>🤗 Przytul ją</button>`);
    }
    return r;
  };
})();
