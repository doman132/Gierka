/* =========================================================
   Speedway Empire 3D — v2.7
   • kolizje w mieście naprawdę działają (prostokąty były w innym układzie współrzędnych)
   • blokada wejścia w każdy obiekt: budynki, zaparkowane auta, latarnie, ławki, wiaty, drzewa…
   • w mieście znów prawdziwy stadion klubu (skan z Zielonej Góry wyłączony)
   ========================================================= */
'use strict';

Stad.MODEL = null; // skan stadionu wyłączony — w mieście stoi stadion meczowy
Stad.useModel = () => false;

(() => {
  const M = Miasto;
  // kolizje miasta: układ miasta → układ świata, siatka przestrzenna 8 m (sprawdzamy tylko okolicę gracza)
  const CELL = 8;
  M.colGrid = function () {
    if (M._grid && M._gridSrc === M.col && M._gridN === M.col.length) return M._grid;
    const g = new Map(), off = M.CX;
    M.col.forEach(c => {
      if (c.x1 - c.x0 < 0.01 && c.z1 - c.z0 < 0.01) return; // zastępcze (budynki mają dokładne obrysy)
      const w = { x0: c.x0 + off, x1: c.x1 + off, z0: c.z0, z1: c.z1 };
      for (let i = Math.floor(w.x0 / CELL); i <= Math.floor(w.x1 / CELL); i++) for (let j = Math.floor(w.z0 / CELL); j <= Math.floor(w.z1 / CELL); j++) { const k = i + ':' + j; let a = g.get(k); if (!a) g.set(k, a = []); a.push(w); }
    });
    M._grid = g; M._gridSrc = M.col; M._gridN = M.col.length; return g;
  };
  const bc = Rooms.colliders;
  Rooms.colliders = function () {
    if (Walk.room !== 'miasto' || !M.col) return bc.call(this);
    const ex = Rooms.extraCol; Rooms.extraCol = null; const base = bc.call(this); Rooms.extraCol = ex; // bez sklejania z całą listą miasta
    const g = M.colGrid(), out = base.slice(), seen = new Set();
    const i0 = Math.floor((Walk.x - 7) / CELL), i1 = Math.floor((Walk.x + 7) / CELL), j0 = Math.floor((Walk.z - 7) / CELL), j1 = Math.floor((Walk.z + 7) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = g.get(i + ':' + j); if (a) a.forEach(c => { if (!seen.has(c)) { seen.add(c); out.push(c); } }); }
    return out;
  };

  // budynki: dokładny obrys z geometrii (podwórka, przejścia i wnęki są dostępne)
  M.PRECISE = k => /^(prl|kostka|v[A-Z]|garSov|stadGate)/.test(k);
  M._foot = {};
  M.footprint = function (k) {
    if (M._foot[k]) return M._foot[k];
    const tmp = new THREE.Group(), g = Furn.place(tmp, k, 0, 0, 0, 0, { s: 1 }); if (!g) return (M._foot[k] = []);
    const S = 0.5, K = 100000, key = (i, j) => (i + 50000) * K + (j + 50000), wall = new Set();
    let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
    MeshCol.build(g, 0, S).forEach(b => { const j = Math.round((b.z0 + b.z1) / 2 / S - 0.5); for (let x = b.x0; x < b.x1 - 0.01; x += S) { const i = Math.round(x / S); wall.add(key(i, j)); if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; } });
    // pusty albo absurdalnie wielki obrys (np. zabłąkany wierzchołek) — zwykły prostokąt
    if (!wall.size || (i1 - i0) * (j1 - j0) > 60000) return (M._foot[k] = []);
    i0 -= 3; i1 += 3; j0 -= 3; j1 += 3;
    const W = i1 - i0 + 1, H = j1 - j0 + 1, idx = (i, j) => (i - i0) * H + (j - j0);
    const wallA = new Uint8Array(W * H); wall.forEach(v => { const i = Math.floor(v / K) - 50000, j = v % K - 50000; wallA[idx(i, j)] = 1; });
    const dil = (A, r) => { const o = new Uint8Array(A.length); for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) if (A[i * H + j]) for (let a = -r; a <= r; a++) for (let b2 = -r; b2 <= r; b2++) { const ni = i + a, nj = j + b2; if (ni >= 0 && ni < W && nj >= 0 && nj < H) o[ni * H + nj] = 1; } return o; };
    // zalanie od zewnątrz przy pogrubionych ścianach (zamyka drzwi i okna do ok. 2 m)
    const thick = dil(wallA, 2), reach = new Uint8Array(W * H), q = [0]; reach[0] = 1;
    while (q.length) { const c = q.pop(), i = Math.floor(c / H), j = c % H; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b2]) => { const ni = i + a, nj = j + b2; if (ni < 0 || ni >= W || nj < 0 || nj >= H) return; const n = ni * H + nj; if (reach[n] || thick[n]) return; reach[n] = 1; q.push(n); }); }
    const outside = dil(reach, 2), full = new Uint8Array(W * H), cells = [];
    for (let n = 0; n < W * H; n++) full[n] = wallA[n] || !outside[n] ? 1 : 0;
    // tylko pola brzegowe — do środka i tak nie da się dojść
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) { if (!full[i * H + j]) continue; const f = (a, b2) => a >= 0 && a < W && b2 >= 0 && b2 < H && full[a * H + b2]; if (!f(i + 1, j) || !f(i - 1, j) || !f(i, j + 1) || !f(i, j - 1)) cells.push([(i + i0) * S + S / 2, (j + j0) * S + S / 2]); }
    return (M._foot[k] = cells);
  };
  M.addPrecise = function (k, x, z, r, s, col) {
    const cells = M.footprint(k); if (!cells.length) { col.push(M._boxRaw(k, x, z, r, s, 0.92)); return; }
    const c = Math.cos(r), sn = Math.sin(r), h = 0.25 * s + 0.05, rows = new Map();
    cells.forEach(([lx, lz]) => { const px = x + (lx * c + lz * sn) * s, pz = z + (-lx * sn + lz * c) * s; col.push({ x0: px - h, x1: px + h, z0: pz - h, z1: pz + h }); });
  };
  M._boxRaw = M.box;
  M.box = function (k, x, z, r, s, sh) {
    if (M._building && M.PRECISE(k)) { const b = M._boxRaw.apply(this, arguments); M._pend.push({ k, x, z, r, s }); return { x0: x, x1: x, z0: z, z1: z, pend: true, fp: b }; }
    return M._boxRaw.apply(this, arguments);
  };
  const bmk = M.make;
  M.make = function (...a) { M._building = true; M._pend = []; try { return bmk.apply(this, a); } finally { M._building = false; } };

  /** Blokady dla wszystkich obiektów stojących w mieście (po zbudowaniu) */
  const SMALL = /^(lamp|tree|shrub|hydrant|stadLight)/, SKIP = /^(car|bus|police|zuk|stadZG)/;
  M.solidAll = function () {
    const G = M.G, col = M.col; if (!G) return;
    const have = new Set(col.map(c => Math.round((c.x0 + c.x1) * 2) + ':' + Math.round((c.z0 + c.z1) * 2)));
    const add = c => { const k = Math.round((c.x0 + c.x1) * 2) + ':' + Math.round((c.z0 + c.z1) * 2); if (have.has(k)) return; have.add(k); col.push(c); };
    const trunk = (x, z, r) => add({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });
    const traffic = new Set((M.traffic || []).map(t => t.g));
    G.children.forEach(o => {
      // instancje: każdy egzemplarz (budynki, zaparkowane auta, ławki, latarnie)
      if (o.isInstancedMesh && o.userData.list && o.userData.fk) {
        if (o.userData._solid) return; o.userData._solid = true;
        const k = o.userData.fk, C = Furn.cache[k]; if (!C) return;
        o.userData.list.forEach(it => {
          const s = it.s || 1; if (C.size.y * s < 0.45) return;
          if (SMALL.test(k)) trunk(it.x, it.z, k === 'stadLight' ? 0.6 : 0.25);
          else if (!M.PRECISE(k)) add(M._boxRaw(k, it.x, it.z, it.r || 0, s, 0.9));
        });
        return;
      }
      // pojedyncze obiekty z Furn.place (lokale, wiaty, motocykle, bramki, obiekty z edytora)
      const k = o.userData && o.userData.fk; if (!k || traffic.has(o) || SKIP.test(k)) return;
      const b = new THREE.Box3().setFromObject(o); if (b.isEmpty() || b.max.y - b.min.y < 0.45) return;
      const gx = G.position.x, s = b.getSize(new THREE.Vector3());
      if (M.PRECISE(k)) return; // budynki — obrys z geometrii (dodany wyżej)
      if (SMALL.test(k)) trunk((b.min.x + b.max.x) / 2 - gx, (b.min.z + b.max.z) / 2, 0.25);
      else if (s.x * s.z < 900) add({ x0: b.min.x - gx + 0.05, x1: b.max.x - gx - 0.05, z0: b.min.z + 0.05, z1: b.max.z - 0.05 }); // duże (np. lokale) mają już dokładne kolizje
    });
    // budynki: dokładne obrysy
    const D = (typeof MapEdit !== 'undefined' && MapEdit.layout.del) || [];
    (M._pend || []).forEach(p => { if (D.some(d => d.k === p.k && Math.abs(d.x - p.x) < 0.6 && Math.abs(d.z - p.z) < 0.6)) return; M.addPrecise(p.k, p.x, p.z, p.r, p.s, col); }); M._pend = [];
    // drzewa-billboardy (park, podwórka)
    G.traverse(o => { if (o.userData && o.userData.trees) o.userData.trees.forEach(t => trunk(t.x, t.z, 0.3)); });
    M._cw = null;
  };
  const bm = M.make;
  M.make = function (...a) { const r = bm.apply(this, a); try { M.solidAll(); } catch (e) { console.warn('Kolizje miasta', e); } return r; };
  // drzewa-billboardy: zapamiętaj pozycje, żeby dało się je zablokować
  const tb = World.treeBillboards;
  World.treeBillboards = function (k, list, parent) {
    const n0 = parent ? parent.children.length : 0, r = tb.call(this, k, list, parent);
    if (parent && parent === M.G) { const o = parent.children[parent.children.length - 1]; if (o && n0 < parent.children.length) o.userData.trees = list.map(t => ({ x: t.x, z: t.z })); }
    return r;
  };
  // obiekt postawiony w edytorze od razu blokuje przejście (spawn i tak dodaje prostokąt do M.col)
})();
