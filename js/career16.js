/* =========================================================
   Speedway Empire 3D — v2.6: EDYTOR MAPY MIASTA
   F9 w mieście (albo przycisk 🛠) → widok z góry.
   • paleta: budynki, zieleń, ulica, auta, stadion, własne modele
   • klik — postaw; klik na obiekt — zaznacz; przeciągnij — przesuń
   • R / Shift+R — obrót, [ ] — skala, Delete — usuń (także budynki z generatora)
   • W/S/A/D — przesuwanie widoku, kółko myszy — zoom, Q/E — obrót widoku
   • układ zapisuje się sam (przeglądarka), eksport/import do pliku .json
   • „Dodaj własny model (.glb)” — plik zostaje w przeglądarce (IndexedDB)
   ========================================================= */
'use strict';

const MapEdit = {
  KEY: 'se3d_mapLayout', on: false, sel: null, tool: null, cam: { x: 0, z: 0, h: 140, yaw: 0 }, drag: null, hist: [],
  layout: { add: [], del: [] },
  load() { try { const j = JSON.parse(localStorage.getItem(MapEdit.KEY) || 'null'); if (j && j.add) MapEdit.layout = { add: j.add || [], del: j.del || [] }; } catch (e) { } },
  save() { try { localStorage.setItem(MapEdit.KEY, JSON.stringify(MapEdit.layout)); } catch (e) { UI.toast('Nie udało się zapisać układu.', true); } },

  /** Obiekty z generatora usunięte w edytorze nie wracają przy budowie miasta */
  filter(k, list) { const D = MapEdit.layout.del; if (!D.length) return list; return list.filter(it => !D.some(d => d.k === k && Math.abs(d.x - it.x) < 0.6 && Math.abs(d.z - it.z) < 0.6)); },

  /* ---------- paleta ---------- */
  NAMES: { prlB12: 'Blok 12-piętrowy', prlB5: 'Blok 5-piętrowy', prlBSov: 'Blok z płyty', prlBEnter: 'Kamienica z cegły', prlKhrush: 'Chruszczowka', prlBlock9: 'Blok 9-piętrowy', prlBlock16: 'Blok 16-piętrowy',
    prlSchool: 'Szkoła', prlClinic: 'Przychodnia', garSov: 'Garaże', kiosk: 'Kiosk', treeOak: 'Dąb', treeBirch: 'Brzoza', treeOakY: 'Młody dąb', shrubPH: 'Krzew', shrub2PH: 'Krzew 2', planter: 'Donica',
    lampPH: 'Latarnia', benchPark: 'Ławka', busShelter: 'Wiata', dumpster: 'Kontener', hydrant: 'Hydrant', trzepak: 'Trzepak', swings: 'Huśtawki', slide: 'Zjeżdżalnia', sandpit: 'Piaskownica',
    stadLight: 'Maszt oświetl.', startLine: 'Brama START', turnstile: 'Bramki', bikeJawa: 'Jawa', bikeTracker: 'Tracker', bikeRed: 'Cross czerwony', car126p: 'Fiat 126p', car125p: 'Fiat 125p', zuk: 'Żuk', bus: 'Ikarus', police: 'Radiowóz' },
  groups() {
    const has = k => Furn.SRC[k] != null || Furn.PART && Furn.PART[k];
    const uniq = a => [...new Set(a)].filter(has);
    return [
      ['🏢 Budynki', uniq(['prlB12', 'prlB5', 'prlBSov', 'prlBEnter', 'prlKhrush', 'prlBlock9', 'prlBlock16', 'prlSchool', 'prlClinic', 'garSov', 'kiosk', ...(MapEdit.EXTRA_B || []), ...Miasto.FILL])],
      ['🌳 Zieleń', uniq(['treeOak', 'treeBirch', 'treeOakY', 'shrubPH', 'shrub2PH', 'planter'])],
      ['🚏 Ulica i podwórko', uniq(['lampPH', 'benchPark', 'busShelter', 'dumpster', 'hydrant', 'trzepak', 'swings', 'slide', 'sandpit', 'utilBox', 'powerBox', 'streetSeat'])],
      ['🚗 Pojazdy', uniq(['car126p', 'car125p', 'zuk', 'bus', 'police', ...Miasto.CARS])],
      ['🏁 Stadion i motocykle', uniq(['stadLight', 'startLine', 'turnstile', 'tribune', 'bikeJawa', 'bikeTracker', 'bikeRed', 'bikeBlue', 'bikeYellow'])],
      ['📦 Własne modele', Object.keys(Furn.SRC).filter(k => k.startsWith('u_'))],
    ];
  },
  /** Rozmiar domyślny: auta — długość, latarnie — wysokość, reszta — naturalna skala modelu */
  baseSize(k) {
    const M = Miasto;
    if (M.LEN[k]) return { w: M.LEN[k] }; if (/^car/.test(k)) return { w: 4.6 };
    if (k === 'lampPH') return { h: 7 }; if (/^tree/.test(k)) return { h: 10 }; if (k === 'stadLight') return { h: 26 }; if (k === 'startLine') return { w: 13 };
    if (M.FILL.includes(k) && !/^prl/.test(k)) return { s: 1.5 };
    return {};
  },
  scaleOf(k, mul) { return Miasto.scaleFor(k, MapEdit.baseSize(k)) * (mul || 1); },

  /* ---------- obiekty z edytora w mieście ---------- */
  objs: [],
  spawn(it) {
    const M = Miasto, g = Furn.place(M.G, it.k, it.x, 0, it.z, it.r, { s: MapEdit.scaleOf(it.k, it.m) }); if (!g) return null;
    g.userData.edit = it; const box = M.box(it.k, it.x, it.z, it.r, MapEdit.scaleOf(it.k, it.m), 0.92); M.col.push(box);
    const o = { it, g, box }; MapEdit.objs.push(o); return o;
  },
  unspawn(o) { if (o.g.parent) o.g.parent.remove(o.g); const i = Miasto.col.indexOf(o.box); if (i >= 0) Miasto.col.splice(i, 1); MapEdit.objs = MapEdit.objs.filter(x => x !== o); },
  refresh(o) { const it = o.it; o.g.position.set(it.x, 0, it.z); o.g.rotation.y = it.r; const s = MapEdit.scaleOf(it.k, it.m); o.g.children[0].scale.setScalar(s); const i = Miasto.col.indexOf(o.box); o.box = Miasto.box(it.k, it.x, it.z, it.r, s, 0.92); if (i >= 0) Miasto.col[i] = o.box; else Miasto.col.push(o.box); MiniMap._L = null; },
  /** Po zbudowaniu miasta: postaw zapisane obiekty i usuń kolizje obiektów skasowanych */
  apply() {
    const M = Miasto; MapEdit.objs = [];
    const D = MapEdit.layout.del;
    if (D.length) {
      M.col = M.col.filter(c => { const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2; return !D.some(d => Math.abs(d.x - cx) < 0.8 && Math.abs(d.z - cz) < 0.8); });
      if (M.fp) M.fp = M.fp.filter(f => !D.some(d => d.k === f.k && Math.abs(d.x - f.x) < 0.6 && Math.abs(d.z - f.z) < 0.6));
    }
    MapEdit.layout.add.forEach(it => { if (Furn.cache[it.k]) { MapEdit.spawn(it); if (M.fp) { const C = Furn.cache[it.k], s = MapEdit.scaleOf(it.k, it.m); M.fp.push({ k: it.k, x: it.x, z: it.z, r: it.r, w: C.size.x * s, d: C.size.z * s }); } } });
    if (World.rooms.miasto) Rooms.extraCol = M.col;
  },

  /* ---------- tryb edycji ---------- */
  toggle(on) {
    if (on === MapEdit.on) return;
    if (on && Walk.room !== 'miasto') { UI.toast('Edytor mapy działa w mieście (spacer po mieście 3D).', true); return; }
    MapEdit.on = on;
    if (on) {
      if (Walk.locked()) document.exitPointerLock();
      Object.assign(MapEdit.cam, { x: Walk.x - Miasto.CX, z: Walk.z + 40, h: 120, yaw: 0 });
      MapEdit.panel(); UI.toast('Edytor mapy: kliknij obiekt z listy i postaw go na mapie.');
    } else {
      const p = $('#mapedit'); if (p) p.remove(); MapEdit.ghostOff(); MapEdit.select(null); MapEdit.save(); MiniMap._L = null;
      World.camera.fov = 68; World.camera.updateProjectionMatrix();
    }
  },
  panel() {
    let p = $('#mapedit'); if (p) p.remove();
    p = document.createElement('div'); p.id = 'mapedit';
    const G = MapEdit.groups();
    p.innerHTML = `<div class="me-head"><b>🛠 Edytor mapy</b><button data-me="exit">Zapisz i wyjdź ✕</button></div>
      <div class="me-list">${G.map(([t, keys]) => `<details ${t.startsWith('🏢') ? 'open' : ''}><summary>${t} <small>${keys.length}</small></summary><div class="me-items">${keys.map(k => `<button data-me="pick" data-k="${esc(k)}" class="${MapEdit.tool === k ? 'on' : ''}">${esc(MapEdit.NAMES[k] || k.replace(/^u_/, ''))}</button>`).join('') || '<small class="muted">brak</small>'}</div></details>`).join('')}</div>
      <div class="me-sel" id="me-sel"></div>
      <div class="me-tools"><button data-me="undo">↶ Cofnij</button><button data-me="export">⬇ Eksport</button><label class="me-file">⬆ Import<input type="file" accept=".json" data-me="import"></label>
        <label class="me-file">➕ Własny model (.glb)<input type="file" accept=".glb,.gltf" data-me="model"></label><button data-me="reset">Przywróć domyślne</button></div>
      <small class="me-help">Klik — postaw / zaznacz · przeciągnij — przesuń · R / Shift+R — obrót · [ ] — skala · Delete — usuń · WSAD — widok · kółko — zoom · Q/E — obrót widoku · Esc — odznacz</small>`;
    $('#md').appendChild(p);
    p.addEventListener('click', e => { const b = e.target.closest('[data-me]'); if (!b || b.tagName === 'INPUT') return; MapEdit.cmd(b.dataset.me, b.dataset.k); });
    p.addEventListener('change', e => { const i = e.target.closest('input[data-me]'); if (i && i.files && i.files[0]) MapEdit.cmd(i.dataset.me, i.files[0]); i.value = ''; });
    p.addEventListener('mousedown', e => e.stopPropagation()); p.addEventListener('wheel', e => e.stopPropagation());
    MapEdit.selInfo();
  },
  cmd(c, v) {
    if (c === 'exit') return MapEdit.toggle(false);
    if (c === 'pick') { MapEdit.tool = MapEdit.tool === v ? null : v; MapEdit.select(null); MapEdit.ghostOff(); if (MapEdit.tool) Furn.load([v], () => MapEdit.ghostOn(v)); $('#mapedit').querySelectorAll('[data-me="pick"]').forEach(b => b.classList.toggle('on', b.dataset.k === MapEdit.tool)); return; }
    if (c === 'undo') return MapEdit.undo();
    if (c === 'export') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(MapEdit.layout, null, 1)], { type: 'application/json' })); a.download = 'mapa-miasta.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
    if (c === 'import') { v.text().then(t => { try { const j = JSON.parse(t); if (!j.add) throw 0; MapEdit.layout = { add: j.add, del: j.del || [] }; MapEdit.save(); MapEdit.rebuild(); UI.toast('Wczytano układ mapy.'); } catch (e) { UI.toast('To nie jest plik układu mapy.', true); } }); return; }
    if (c === 'model') return MapEdit.addModel(v);
    if (c === 'reset') { if (!confirm('Usunąć wszystkie zmiany w mapie?')) return; MapEdit.layout = { add: [], del: [] }; MapEdit.save(); MapEdit.rebuild(); return; }
    if (c === 'rot') return MapEdit.rotSel(+v);
    if (c === 'scl') return MapEdit.sclSel(+v);
    if (c === 'del') return MapEdit.delSel();
  },
  /** Przebudowa miasta z nowym układem (po imporcie / resecie) */
  rebuild() {
    const keep = [Walk.x, Walk.z], cam = { ...MapEdit.cam };
    const M = Miasto; if (M.G && M.G.parent) M.G.parent.remove(M.G); delete World.rooms.miasto; M.G = null; MapEdit.objs = [];
    M.build(() => { Walk.enterRoom('miasto'); [Walk.x, Walk.z] = keep; if (MapEdit.on) { MapEdit.cam = cam; MapEdit.panel(); } });
  },

  /* ---------- zaznaczenie i zmiany ---------- */
  push(a) { MapEdit.hist.push(a); if (MapEdit.hist.length > 80) MapEdit.hist.shift(); },
  select(o) {
    if (MapEdit.selBox) { MapEdit.selBox.parent && MapEdit.selBox.parent.remove(MapEdit.selBox); MapEdit.selBox = null; }
    if (MapEdit.sel && MapEdit.sel.g && MapEdit.sel.g.userData.tmp && MapEdit.sel.g.parent) MapEdit.sel.g.parent.remove(MapEdit.sel.g);
    MapEdit.sel = o;
    if (o) { o.g.updateMatrixWorld(true); const h = new THREE.BoxHelper(o.g, 0xffd23a); (World.realScene || World.scene).add(h); MapEdit.selBox = h; }
    MapEdit.selInfo();
  },
  selInfo() {
    const el = $('#me-sel'); if (!el) return; const o = MapEdit.sel;
    el.innerHTML = o ? `<b>${esc(MapEdit.NAMES[o.it.k] || o.it.k)}</b><div class="row"><button data-me="rot" data-k="-15">⟲ 15°</button><button data-me="rot" data-k="15">⟳ 15°</button><button data-me="scl" data-k="0.9">− skala</button><button data-me="scl" data-k="1.1">+ skala</button><button data-me="del" class="neg">🗑 Usuń</button></div>`
      : MapEdit.tool ? `Stawiasz: <b>${esc(MapEdit.NAMES[MapEdit.tool] || MapEdit.tool)}</b> — kliknij na mapie (Esc — przerwij)` : '<small class="muted">Wybierz obiekt z listy albo kliknij obiekt na mapie.</small>';
  },
  rotSel(deg) { const o = MapEdit.sel; if (!o) return; MapEdit.push({ t: 'mod', o, prev: { ...o.it } }); o.it.r += deg * Math.PI / 180; MapEdit.refresh(o); MapEdit.save(); },
  sclSel(f) { const o = MapEdit.sel; if (!o) return; MapEdit.push({ t: 'mod', o, prev: { ...o.it } }); o.it.m = Math.max(0.2, Math.min(5, (o.it.m || 1) * f)); MapEdit.refresh(o); MapEdit.save(); },
  delSel() {
    const o = MapEdit.sel; if (!o) return; MapEdit.select(null);
    if (o.gen) { // obiekt z generatora (instancja)
      const d = { k: o.it.k, x: o.it.x, z: o.it.z }; MapEdit.layout.del.push(d); MapEdit.hideInst(o, true); MapEdit.push({ t: 'delgen', o, d });
    } else { MapEdit.unspawn(o); MapEdit.layout.add = MapEdit.layout.add.filter(x => x !== o.it); MapEdit.push({ t: 'del', it: o.it }); }
    MapEdit.save(); MiniMap._L = null;
  },
  /** Ukryj/pokaż instancję budynku z generatora (skala 0) i jej kolizję */
  hideInst(o, hide) {
    const M = Miasto, zero = new THREE.Matrix4().makeScale(0, 0, 0);
    o.meshes.forEach(([im, i, m]) => { im.setMatrixAt(i, hide ? zero : m); im.instanceMatrix.needsUpdate = true; });
    if (hide) { const i = M.col.findIndex(c => Math.abs((c.x0 + c.x1) / 2 - o.it.x) < 0.8 && Math.abs((c.z0 + c.z1) / 2 - o.it.z) < 0.8); if (i >= 0) o.col = M.col.splice(i, 1)[0]; }
    else if (o.col) M.col.push(o.col);
  },
  undo() {
    const a = MapEdit.hist.pop(); if (!a) return; MapEdit.select(null);
    if (a.t === 'add') { const o = MapEdit.objs.find(x => x.it === a.it); if (o) MapEdit.unspawn(o); MapEdit.layout.add = MapEdit.layout.add.filter(x => x !== a.it); }
    else if (a.t === 'del') { MapEdit.layout.add.push(a.it); MapEdit.spawn(a.it); }
    else if (a.t === 'mod') { Object.assign(a.o.it, a.prev); MapEdit.refresh(a.o); }
    else if (a.t === 'delgen') { MapEdit.layout.del = MapEdit.layout.del.filter(d => d !== a.d); MapEdit.hideInst(a.o, false); }
    MapEdit.save(); MiniMap._L = null;
  },

  /* ---------- podgląd stawianego obiektu ---------- */
  ghostOn(k) {
    MapEdit.ghostOff(); const g = Furn.place(Miasto.G, k, 0, 0, 0, MapEdit.ghostR || 0, { s: MapEdit.scaleOf(k) }); if (!g) return;
    g.traverse(o => { if (o.isMesh) { o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const c = m.clone(); c.transparent = true; c.opacity = 0.55; c.depthWrite = false; return c; }); if (o.material.length === 1) o.material = o.material[0]; } });
    MapEdit.ghost = g;
  },
  ghostOff() { if (MapEdit.ghost) { MapEdit.ghost.parent && MapEdit.ghost.parent.remove(MapEdit.ghost); MapEdit.ghost = null; } },

  /* ---------- kamera i wejście ---------- */
  ray(e) {
    const cv = $('#gl'), r = cv.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = MapEdit._rc || (MapEdit._rc = new THREE.Raycaster()); rc.setFromCamera(v, World.camera); return rc;
  },
  ground(rc) { const p = new THREE.Vector3(); return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -World.LOCKER_Y), p) ? { x: p.x - Miasto.CX, z: p.z } : null; },
  /** Co jest pod kursorem: obiekt z edytora albo budynek z generatora */
  pick(rc) {
    const M = Miasto, cand = [];
    MapEdit.objs.forEach(o => cand.push(o.g));
    M.G.children.forEach(o => { if (o.isInstancedMesh && o.userData.list && !/^tree|lamp/.test(o.userData.fk || '')) cand.push(o); });
    const hit = rc.intersectObjects(cand, true)[0]; if (!hit) return null;
    let o = hit.object; while (o && !o.userData.edit && o.parent !== M.G) o = o.parent;
    if (o && o.userData.edit) return MapEdit.objs.find(x => x.it === o.userData.edit) || null;
    const im = hit.object; if (!im.isInstancedMesh || hit.instanceId == null) return null;
    const it = im.userData.list[hit.instanceId], meshes = [];
    M.G.children.forEach(x => { if (x.isInstancedMesh && x.userData.list === im.userData.list) { const m = new THREE.Matrix4(); x.getMatrixAt(hit.instanceId, m); meshes.push([x, hit.instanceId, m]); } });
    const C = Furn.cache[im.userData.fk], sc = it.s || 1, g = new THREE.Mesh(new THREE.BoxGeometry(C.size.x * sc, C.size.y * sc, C.size.z * sc));
    g.position.set(it.x, C.size.y * sc / 2, it.z); g.rotation.y = it.r || 0; g.visible = false; M.G.add(g); g.userData.tmp = true; g.updateMatrixWorld(true);
    return { gen: true, it: { k: im.userData.fk, x: it.x, z: it.z, r: it.r || 0 }, meshes, g };
  },
  mouse(e, t) {
    if (e.target.closest && e.target.closest('#mapedit, #wh-map, #modal')) return true;
    const rc = MapEdit.ray(e), p = MapEdit.ground(rc);
    if (t === 'move') {
      if (MapEdit.ghost && p) MapEdit.ghost.position.set(p.x, 0, p.z);
      if (MapEdit.drag && p && MapEdit.sel && !MapEdit.sel.gen) { const it = MapEdit.sel.it; it.x = p.x + MapEdit.drag.dx; it.z = p.z + MapEdit.drag.dz; MapEdit.refresh(MapEdit.sel); if (MapEdit.selBox) MapEdit.selBox.update(); }
      if (MapEdit.pan) { const dx = e.clientX - MapEdit.pan.x, dy = e.clientY - MapEdit.pan.y; MapEdit.pan = { x: e.clientX, y: e.clientY }; const k = MapEdit.cam.h / 600, c = Math.cos(MapEdit.cam.yaw), s = Math.sin(MapEdit.cam.yaw); MapEdit.cam.x -= (dx * c + dy * s) * k; MapEdit.cam.z -= (-dx * s + dy * c) * k; }
      return true;
    }
    if (t === 'down') {
      if (e.button === 2 || e.button === 1) { MapEdit.pan = { x: e.clientX, y: e.clientY }; return true; }
      if (MapEdit.tool && p) {
        const it = { k: MapEdit.tool, x: +p.x.toFixed(2), z: +p.z.toFixed(2), r: MapEdit.ghostR || 0, m: 1 };
        MapEdit.layout.add.push(it); const o = MapEdit.spawn(it); MapEdit.push({ t: 'add', it }); MapEdit.save(); MiniMap._L = null;
        if (!e.shiftKey && o) { MapEdit.tool = null; MapEdit.ghostOff(); MapEdit.select(o); $('#mapedit').querySelectorAll('[data-me="pick"]').forEach(b => b.classList.remove('on')); }
        return true;
      }
      const o = MapEdit.pick(rc); MapEdit.select(o);
      if (o && !o.gen && p) { MapEdit.drag = { dx: o.it.x - p.x, dz: o.it.z - p.z }; MapEdit.push({ t: 'mod', o, prev: { ...o.it } }); }
      return true;
    }
    if (t === 'up') { if (MapEdit.drag) { MapEdit.drag = null; MapEdit.save(); } MapEdit.pan = null; return true; }
    return true;
  },
  wheel(e) { if (!MapEdit.on || e.target.closest('#mapedit')) return; e.preventDefault(); MapEdit.cam.h = Math.max(12, Math.min(420, MapEdit.cam.h * (e.deltaY > 0 ? 1.12 : 0.89))); },
  key(e, down) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return true;
    MapEdit.keys = MapEdit.keys || {}; MapEdit.keys[e.code] = down; if (!down) return true;
    if (e.code === 'F9') { MapEdit.toggle(false); e.preventDefault(); }
    else if (e.code === 'Escape') { MapEdit.tool = null; MapEdit.ghostOff(); MapEdit.select(null); }
    else if (e.code === 'KeyR') { const d = e.shiftKey ? -15 : 15; if (MapEdit.sel) MapEdit.rotSel(d); else { MapEdit.ghostR = (MapEdit.ghostR || 0) + d * Math.PI / 180; if (MapEdit.ghost) MapEdit.ghost.rotation.y = MapEdit.ghostR; } }
    else if (e.code === 'BracketRight') MapEdit.sclSel(1.1); else if (e.code === 'BracketLeft') MapEdit.sclSel(0.9);
    else if (e.code === 'Delete' || e.code === 'Backspace') MapEdit.delSel();
    else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) MapEdit.undo();
    return true;
  },
  frame(dt) {
    const K = MapEdit.keys || {}, C = MapEdit.cam, sp = C.h * 0.9 * dt, c = Math.cos(C.yaw), s = Math.sin(C.yaw);
    const f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), r = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    C.x += (r * c - f * s) * sp; C.z += (-r * s - f * c) * sp;
    if (K.KeyQ) C.yaw += dt * 1.2; if (K.KeyE) C.yaw -= dt * 1.2;
    const M = Miasto; C.x = Math.max(-M.W / 2, Math.min(M.W / 2, C.x)); C.z = Math.max(-M.D / 2, Math.min(M.D / 2, C.z));
    const cam = World.camera, tilt = 0.95; // lekko pochylony widok z góry
    cam.fov = 50; cam.updateProjectionMatrix();
    cam.position.set(M.CX + C.x + Math.sin(C.yaw) * C.h * 0.45, World.LOCKER_Y + C.h, C.z + Math.cos(C.yaw) * C.h * 0.45);
    cam.rotation.set(-tilt, C.yaw, 0, 'YXZ');
    if (MapEdit.selBox) MapEdit.selBox.update();
    Rooms.tick(dt * 0.5);
    MiniMap.draw();
  },

  /* ---------- własne modele (.glb) w IndexedDB ---------- */
  db(fn) {
    const rq = indexedDB.open('se3d_models', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('m');
    rq.onsuccess = () => fn(rq.result); rq.onerror = () => UI.toast('Przeglądarka nie pozwala zapisać modelu.', true);
  },
  addModel(file) {
    const name = 'u_' + file.name.replace(/\.(glb|gltf)$/i, '').replace(/[^\w\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/g, '_').slice(0, 40);
    file.arrayBuffer().then(buf => MapEdit.parseModel(name, buf, ok => {
      if (!ok) { UI.toast('Nie udało się wczytać modelu (potrzebny plik .glb).', true); return; }
      MapEdit.db(db => { const tx = db.transaction('m', 'readwrite'); tx.objectStore('m').put(buf, name); tx.oncomplete = () => { UI.toast(`Dodano model „${name.slice(2)}” — jest w grupie „Własne modele”.`); MapEdit.panel(); MapEdit.cmd('pick', name); }; });
    }));
  },
  parseModel(name, buf, cb) {
    const L = Furn._L || (Furn._L = new THREE.GLTFLoader());
    try {
      L.parse(buf, '', g => {
        g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.userData.shared = true; }); o.geometry.userData.shared = true; } });
        const box = new THREE.Box3().setFromObject(g.scene);
        Furn.cache[name] = { scene: g.scene, size: box.getSize(new THREE.Vector3()), min: box.min.clone(), c: box.getCenter(new THREE.Vector3()) };
        Furn.SRC[name] = 'user'; cb(true);
      }, () => cb(false));
    } catch (e) { cb(false); }
  },
  /** Przy starcie: wczytaj własne modele z przeglądarki */
  loadUser(cb) {
    if (!window.indexedDB) { cb(); return; }
    MapEdit.db(db => {
      const out = [], st = db.transaction('m').objectStore('m'), rq = st.openCursor();
      rq.onsuccess = () => { const c = rq.result; if (c) { out.push([c.key, c.value]); c.continue(); } else { let n = out.length; if (!n) return cb(); out.forEach(([k, b]) => MapEdit.parseModel(k, b, () => { if (--n === 0) cb(); })); } };
      rq.onerror = () => cb();
    });
  },
};
MapEdit.load();

(() => {
  const M = Miasto;
  // własne modele z przeglądarki nie mają pliku na serwerze — Furn.load ich nie pobiera
  const bl = Furn.load;
  Furn.load = function (keys, cb) { return bl.call(this, keys.filter(k => Furn.SRC[k] !== 'user' || Furn.cache[k]), cb); };
  // modele z zapisanego układu wczytujemy razem z miastem
  const bk = M.keys;
  M.keys = function () { return [...new Set([...bk.call(this), ...MapEdit.layout.add.map(a => a.k).filter(k => Furn.SRC[k] && Furn.SRC[k] !== 'user')])]; };
  const bb = M.build;
  M.build = function (cb) { if (!MapEdit._userLoaded) { MapEdit._userLoaded = true; return MapEdit.loadUser(() => bb.call(this, cb)); } return bb.call(this, cb); };
  const bm = M.make;
  M.make = function (...a) { const r = bm.apply(this, a); try { MapEdit.apply(); } catch (e) { console.warn('Edytor mapy', e); } return r; };
  // wejście: klawisze, mysz, pętla
  const bkey = Walk.key;
  Walk.key = function (e, down) {
    if (MapEdit.on) return MapEdit.key(e, down);
    if (down && e.code === 'F9' && Walk.active && Walk.room === 'miasto' && !$('#modal').innerHTML) { MapEdit.toggle(true); e.preventDefault(); return true; }
    return bkey.call(this, e, down);
  };
  const bmo = Walk.mouse;
  Walk.mouse = function (e, t) { if (MapEdit.on) return MapEdit.mouse(e, t); return bmo.call(this, e, t); };
  document.addEventListener('wheel', e => MapEdit.wheel(e), { passive: false });
  document.addEventListener('contextmenu', e => { if (MapEdit.on) e.preventDefault(); });
  const bf = Walk.frame;
  Walk.frame = function (dt) { if (MapEdit.on) { if (Walk.room !== 'miasto') { MapEdit.toggle(false); return bf.call(this, dt); } return MapEdit.frame(dt); } return bf.call(this, dt); };
  // przycisk w HUD miasta
  const bh = Walk.hud;
  Walk.hud = function (on) {
    const r = bh.call(this, on), h = $('#walk-hud');
    if (h && !$('#me-btn')) { const b = document.createElement('button'); b.id = 'me-btn'; b.title = 'Edytor mapy (F9)'; b.textContent = '🛠'; b.addEventListener('click', ev => { ev.stopPropagation(); MapEdit.toggle(!MapEdit.on); }); h.appendChild(b); }
    const b = $('#me-btn'); if (b) b.hidden = Walk.room !== 'miasto';
    return r;
  };
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { if (key !== 'miasto' && MapEdit.on) MapEdit.toggle(false); const r = be.call(this, key); const b = $('#me-btn'); if (b) b.hidden = key !== 'miasto'; return r; };
})();
