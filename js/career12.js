/* =========================================================
   Speedway Empire 3D — v2.3: realne modele z Sketchfab (CC-BY)
   • Fiat 126p / 125p, Ikarus 280, polski radiowóz — ruch uliczny
   • siłownia: bieżnia, maszyna do wyciskania, stojak z hantlami, klatka
   • kasyno: stół do ruletki i automaty
   Autorzy i licencje: models/CREDITS.txt
   ========================================================= */
Object.assign(Furn.SRC, {
  car125p: 'sk/car125p.glb', car126p: 'sk/car126p.glb',
  bus: 'sk/ikarus.glb', police: 'sk/policeVan.glb',
  treadmill: 'sk/gymTreadmill.glb', benchPress: 'sk/gymBench.glb', dumbbells: 'sk/gymDumbbells.glb', gymRack: 'sk/gymRack.glb',
  casRoulette: 'sk/skRoulette.glb', slotRound: 'sk/skSlot1.glb', slotUp: 'sk/skSlot2.glb',
});

/** Obrót wokół pionu, po którym przód modelu patrzy w +z (konwencja gry) */
Furn.FIX = { car125p: -Math.PI / 2, car126p: Math.PI / 2, police: Math.PI / 2, bus: Math.PI, casRoulette: Math.PI / 2 };

(() => {
  // obrót „wypalony” w cache — działa i dla Furn.place, i dla instancji w mieście, i dla kolizji
  const fix = k => {
    const C = Furn.cache[k], F = Furn.FIX[k]; if (!C || C.fixed || F == null) return;
    const o = typeof F === 'number' ? { ry: F } : F;
    if (o.drop) { const del = []; C.scene.traverse(m => { if (o.drop.some(n => (m.name || '').startsWith(n))) del.push(m); }); del.forEach(m => m.parent && m.parent.remove(m)); }
    if (o.opaque) C.scene.traverse(m => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { x.transparent = false; x.opacity = 1; x.depthWrite = true; }); });
    if (o.roof) { // model bez dachu (widać z góry) — płaski dach z papy
      const b = new THREE.Box3().setFromObject(C.scene), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), t = Math.max(0.02, sz.y * 0.015);
      const r = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 0.985, t, sz.z * 0.985), Furn._roofM || (Furn._roofM = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.95 })));
      r.position.set(c.x, b.max.y - t / 2 - sz.y * 0.01, c.z); r.castShadow = true; C.scene.add(r);
    }
    const w = new THREE.Group(); w.add(C.scene); C.scene.rotation.y = o.ry || 0; if (o.s) w.scale.setScalar(o.s); w.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(w);
    Object.assign(C, { scene: w, size: box.getSize(new THREE.Vector3()), min: box.min.clone(), c: box.getCenter(new THREE.Vector3()), fixed: true });
  };
  Furn.fix = fix;
  const bl = Furn.load;
  Furn.load = function (keys, cb) { return bl.call(this, keys, () => { keys.forEach(fix); cb && cb(); }); };

  // siłownia: realne wymiary sprzętu + klatka do przysiadów
  const gym = Rooms.FURN.gym;
  if (gym) {
    gym.forEach(f => { if (f[0] === 'treadmill') f[5] = { w: 2 }; if (f[0] === 'benchPress') f[5] = { w: 2.6 }; if (f[0] === 'dumbbells') f[5] = { w: 2 }; });
    gym.push(['gymRack', 6.3, 0, 3.7, -Math.PI / 2, { h: 2.3 }]);
  }
})();
