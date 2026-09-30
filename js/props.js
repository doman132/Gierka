/* =========================================================
   Speedway Empire 3D — modele otoczenia (samochody, budynki)
   Pliki w models/ (licencje w models/CREDITS.txt).
   Każdy model wczytujemy raz, „spłaszczamy” do jednej
   geometrii na materiał (z UV i teksturami), normalizujemy
   rozmiar (długość auta w metrach) i kierunek (długość wzdłuż
   osi x), a potem rysujemy instancjami — setki aut na
   parkingu to kilkanaście wywołań rysowania.
   Lakier aut Quaterniusa ma osobny materiał → kolor na
   instancję. Bez modeli (np. z file://) zostają proste bryły.
   ========================================================= */
'use strict';

const Props = {
  ready: false, M: {},
  // pojazdy: 3dassets.dev „Car Park and Road Vehicle Fleet” (CC0) — lakier = materiał „paint” (kolor na instancję)
  LIST: {
    city: { f: 'a3d/city', len: 'native', paint: 'paint' }, hatch3: { f: 'a3d/hatch3', len: 'native', paint: 'paint' }, hatch5: { f: 'a3d/hatch5', len: 'native', paint: 'paint' },
    ehatch: { f: 'a3d/ehatch', len: 'native', paint: 'paint' }, estate: { f: 'a3d/estate', len: 'native', paint: 'paint' }, raised: { f: 'a3d/raised', len: 'native', paint: 'paint' },
    crossover: { f: 'a3d/crossover', len: 'native', paint: 'paint' }, mpv: { f: 'a3d/mpv', len: 'native', paint: 'paint' }, suvmid: { f: 'a3d/suvmid', len: 'native', paint: 'paint' },
    suvcity: { f: 'a3d/suvcity', len: 'native', paint: 'paint' }, suvcoupe: { f: 'a3d/suvcoupe', len: 'native', paint: 'paint' }, saloon: { f: 'a3d/saloon', len: 'native', paint: 'paint' },
    coupe: { f: 'a3d/coupe', len: 'native', paint: 'paint' }, offroad: { f: 'a3d/offroad', len: 'native', paint: 'paint' }, pickup: { f: 'a3d/pickup', len: 'native', paint: 'paint' },
    minibus: { f: 'a3d/minibus', len: 'native', paint: 'paint' }, police: { f: 'a3d/police', len: 'native' },
    teamvan: { f: 'a3d/crewvan', len: 'native', paint: 'paint' }, ambulance: { f: 'a3d/highvan', len: 'native', paint: 'paint' },
    tractor: { f: 'a3d/tractor', len: 'native' },
  },
  CARS: ['city', 'hatch3', 'hatch5', 'ehatch', 'estate', 'raised', 'crossover', 'mpv', 'suvmid', 'suvcity', 'suvcoupe', 'saloon', 'coupe', 'offroad', 'pickup', 'hatch5', 'estate', 'crossover', 'minibus'],
  PAINT: ['#e9e9e6', '#1d1d20', '#8b1a1a', '#1f3a66', '#6f7378', '#b9b9b2', '#1e3d2b', '#c9a227', '#5a2c1c', '#3d6fa8', '#d9d9d4', '#2a2a2e', '#9aa0a6', '#f0f0ec'],

  load(cb) {
    if (Props.ready) { cb && cb(); return; }
    (Props._cbs = Props._cbs || []).push(cb);
    if (Props._loading || !THREE.GLTFLoader || location.protocol === 'file:') return;
    Props._loading = true;
    const L = new THREE.GLTFLoader(), get = f => new Promise((res, rej) => L.load('models/' + f + '.glb', res, null, rej));
    const jobs = Object.entries(Props.LIST).map(([k, o]) => get(o.f).then(g => { Props.M[k] = Props.bake(g, o); }));
    Promise.all(jobs).then(() => { Props.ready = true; const c = Props._cbs; Props._cbs = []; c.forEach(f => f && f()); })
      .catch(e => console.warn('Modele otoczenia niedostępne', e));
  },

  /** Model → [{geo, mat, paint}] w metrach; auta: długość wzdłuż x, koła na y = 0, środek w 0 */
  bake(g, o) {
    const root = g.scene; root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const alongZ = size.z > size.x;
    const k = o.len === 'native' ? 1 : o.len ? o.len / Math.max(size.x, size.z) : 1;
    const groups = new Map();
    root.traverse(m => {
      if (!m.isMesh) return;
      let geo = Props.toFloat(m.geometry.clone()); if (geo.index) geo = geo.toNonIndexed(); // najpierw Float32, potem bez indeksu (toNonIndexed w r128 nie zna przeplotu)
      geo.applyMatrix4(m.matrixWorld);
      geo.translate(-c.x, -box.min.y, -c.z);
      geo.scale(k, k, k);
      if (alongZ && o.len) geo.rotateY(Math.PI / 2);
      if (!groups.has(m.material)) groups.set(m.material, []);
      groups.get(m.material).push(geo);
    });
    const parts = [];
    groups.forEach((list, mat) => {
      const geo = Props.mergeGeos(list);
      mat.userData.lin = true; mat.userData.shared = true;
      const NOT = ['Windows', 'Grey', 'Headlights', 'TailLights', 'Black', 'Material.007'];
      const paint = o.paint !== undefined && (o.paint === 'auto' ? !NOT.includes(mat.name) : mat.name === o.paint);
      // szyby: zamiast kosztownego „transmission” — przyciemnione, odbijające szkło
      if (mat.transmission || mat.name === 'glass') { mat = new THREE.MeshStandardMaterial({ color: 0x0d1318, metalness: 0.7, roughness: 0.06, transparent: true, opacity: 0.82, envMapIntensity: 1.4 }); mat.userData.lin = true; mat.userData.shared = true; }
      if (paint) { mat = mat.clone(); mat.color.set(0xffffff); mat.userData.lin = true; mat.userData.shared = true; mat.metalness = 0.5; mat.roughness = 0.28; mat.envMapIntensity = 1.2; }
      geo.userData.shared = true;
      parts.push({ geo, mat, paint });
    });
    return parts;
  },

  /** Atrybuty skwantowane/przeplatane → zwykłe Float32 (three r128 nie odnormalizowuje w getX) */
  toFloat(g) {
    Object.keys(g.attributes).forEach(n => {
      const A = g.attributes[n], arr = A.array;
      if (!A.isInterleavedBufferAttribute && arr instanceof Float32Array) return;
      const div = !A.normalized ? 1 : arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : 1;
      const out = new Float32Array(A.count * A.itemSize);
      for (let i = 0; i < A.count; i++) for (let k = 0; k < A.itemSize; k++) { const v = k === 0 ? A.getX(i) : k === 1 ? A.getY(i) : k === 2 ? A.getZ(i) : A.getW(i); out[i * A.itemSize + k] = div > 1 ? Math.max(v / div, -1) : v; }
      g.setAttribute(n, new THREE.BufferAttribute(out, A.itemSize));
    });
    return g;
  },

  mergeGeos(list) {
    const n = list.reduce((a, g) => a + g.attributes.position.count, 0), hasUV = list.every(g => g.attributes.uv);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = hasUV ? new Float32Array(n * 2) : null;
    let o = 0;
    // przez getX/Y/Z — działa też dla atrybutów skwantowanych (Int16, normalized) i przeplatanych (KHR_mesh_quantization)
    const cp = (A, out, n, off) => { if (!A) return; for (let i = 0; i < A.count; i++) { out[(off + i) * n] = A.getX(i); out[(off + i) * n + 1] = A.getY(i); if (n > 2) out[(off + i) * n + 2] = A.getZ(i); } };
    list.forEach(g => {
      cp(g.attributes.position, pos, 3, o);
      cp(g.attributes.normal, nor, 3, o);
      if (uv) cp(g.attributes.uv, uv, 2, o);
      o += g.attributes.position.count;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (!list[0].attributes.normal) geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  },

  /** Instancje modelu: items = [{x, z, y?, rot, s?, color?}] → Group z InstancedMesh na część */
  instanced(key, items) {
    const parts = Props.M[key], G = new THREE.Group(), D = new THREE.Object3D();
    if (!parts || !items.length) return G;
    parts.forEach(p => {
      const im = new THREE.InstancedMesh(p.geo, p.mat, items.length);
      items.forEach((it, i) => {
        D.position.set(it.x, it.y || 0, it.z); D.rotation.set(0, it.rot || 0, 0); const s = it.s || 1; D.scale.set(it.sx || s, it.sy || s, it.sz || s); D.updateMatrix();
        im.setMatrixAt(i, D.matrix);
        if (p.paint) im.setColorAt(i, new THREE.Color(it.color || '#cccccc').convertSRGBToLinear());
      });
      im.castShadow = true; im.receiveShadow = true;
      G.add(im);
    });
    return G;
  },

  /** Wymiary modelu (m) — do skalowania budynków do zadanego prostopadłościanu */
  dims(key) {
    const b = new THREE.Box3();
    Props.M[key].forEach(p => { p.geo.computeBoundingBox(); b.union(p.geo.boundingBox); });
    return b.getSize(new THREE.Vector3());
  },

  /** Jeden model jako zwykły obiekt (np. karetka, bus drużyny) */
  single(key, x, z, rot, color) { return Props.instanced(key, [{ x, z, rot, color }]); },
};
