/* =========================================================
   Speedway Empire 3D — definicje mapy wspólne dla edytora (editor.html) i gry
   Mapa: { v, W, D, roads:[{t, pts:[[x,z]…], w?, name?}], areas:[{t, pts}], objs:[{c, x, z, r, s}], venues:{key:{x, z, r}} }
   Współrzędne w metrach, układ miasta (środek = 0,0; +z = południe, na mapie w dół).
   ========================================================= */
'use strict';

const MapDefs = {
  KEY: 'se3d_customMap', USE: 'se3d_useCustom',
  // rodzaje dróg: szerokość jezdni, chodniki po bokach, czy jeżdżą auta, kolor/tekstura
  ROAD: {
    road2: { n: 'Ulica (2 pasy)', wd: 8, walk: 3.2, car: true, col: '#4d4d50', tex: 'asphalt_02', line: true },
    road4: { n: 'Aleja (4 pasy)', wd: 13, walk: 3.6, car: true, col: '#47474b', tex: 'asphalt_02', line: true },
    osiedl: { n: 'Uliczka osiedlowa', wd: 5.5, walk: 2.2, car: true, col: '#58585a', tex: 'asphalt_02' },
    bruk: { n: 'Ulica z kostki', wd: 7, walk: 2.6, car: true, col: '#7d766b', tex: 'large_grey_tiles', tint: '#9a8f80', rep: 1.2 },
    gruntowa: { n: 'Droga gruntowa', wd: 5, walk: 0, car: true, col: '#8a7458', tex: 'raked_dirt', tint: '#a08a6a' },
    chodnik: { n: 'Chodnik', wd: 3, walk: 0, col: '#b3ada2', tex: 'concrete_pavement', walkway: true },
    deptak: { n: 'Deptak (płyty)', wd: 7, walk: 0, col: '#c4bcae', tex: 'large_grey_tiles', walkway: true, rep: 2 },
    sciezka: { n: 'Ścieżka parkowa', wd: 2, walk: 0, col: '#a8977a', tex: 'raked_dirt', tint: '#b8a888', walkway: true },
    rower: { n: 'Ścieżka rowerowa', wd: 2.4, walk: 0, col: '#8f4a40', tex: 'asphalt_02', tint: '#b0584c', walkway: true },
  },
  AREA: {
    water: { n: 'Woda (rzeka, staw)', col: '#2f6f9a' },
    grass: { n: 'Trawnik / park', col: '#4f7a3f', tex: 'leafy_grass', tint: '#8aa468', rep: 6 },
    plaza: { n: 'Plac (płyty)', col: '#b3aea4', tex: 'concrete_pavement', tint: '#b3ada2', rep: 3 },
    parking: { n: 'Parking', col: '#55575b', tex: 'asphalt_02', tint: '#5a5a5d', rep: 8 },
    sand: { n: 'Piasek / plac zabaw', col: '#d9c48f', tex: 'raked_dirt', tint: '#e0cc98', rep: 4 },
    dirt: { n: 'Ziemia / klepisko', col: '#8b7355', tex: 'raked_dirt', tint: '#9a8266', rep: 4 },
    tiles: { n: 'Rynek (kostka)', col: '#9d9285', tex: 'large_grey_tiles', tint: '#a89c8c', rep: 2 },
  },
  // lokale z gry: model (jak w mieście), rozmiar do podglądu w edytorze
  VENUE: {
    tor: { n: 'Stadion i tor', icon: '🏁', c: '#E0632E', stadium: true },
    dom: { n: 'Twoje mieszkanie (blok)', icon: '🏠', c: '#6b8fb8', f: 'sk/blkSov.glb', fix: { ry: Math.PI / 2 }, size: { h: 28 } },
    rodzice: { n: 'Dom rodziców', icon: '🏡', c: '#c98a4a', f: 'a3d/kostka.glb', fix: {}, size: { s: 1.6 } },
    silownia: { n: 'Siłownia „Power”', icon: '🏋️', c: '#3aa56b', f: 'sk/bShopOld.glb', fix: { drop: ['Plane_Ground', 'Environments'] } },
    restauracja: { n: 'Restauracja „Pit Stop”', icon: '🍽️', c: '#c9a227', f: 'sk/bOld.glb', fix: { s: 1.2 } },
    bar: { n: 'Bar „Pod Taśmą”', icon: '🍺', c: '#b8272e', f: 'sk/bBrickShop.glb', fix: {} },
    park: { n: 'Kawiarnia w parku', icon: '☕', c: '#2e8b57', f: 'sk/bOldPack.glb', fix: { part: 'Building_3*', s: 1.6, roof: 1 } },
    kasyno: { n: 'Kasyno „Złoty Kask”', icon: '🎰', c: '#7a3cc8', f: 'sk/blkEnter.glb', fix: { ry: Math.PI / 2 } },
    psycholog: { n: 'Gabinet psychologa', icon: '🧠', c: '#4a7ab8', f: 'sk/bOldPack.glb', fix: { part: 'Building_2*', s: 1.6, roof: 1 } },
    klub: { n: 'Klub — biuro', icon: '🏟️', c: '#1F4FB0', f: 'sk/bResid.glb', fix: { part: 'buillding2*', s: 10 } },
    osiedle: { n: 'Osiedle (bloki, podwórko)', icon: '🏘️', c: '#8a8f99', osiedle: true },
  },
  STADIUM: { x: 100, z: 68 }, // półosie terenu stadionu (m)
  OSIEDLE: { w: 96, d: 78, off: 12 }, // obrys osiedla (m); środek przesunięty od znacznika w głąb

  // domyślne miasto z gry jako punkt wyjścia
  template() {
    const MS = 0.8, w = p => [Math.round((p[0] - 500) * MS * 10) / 10, Math.round((p[1] - 300) * MS * 10) / 10];
    const ROADS = [[[[150, 455], [345, 470], [690, 455], [880, 485]], 10, 'al. Mistrzów Świata'], [[[120, 175], [285, 205], [520, 215], [845, 265]], 10, 'ul. Stadionowa'],
      [[[285, 205], [345, 470]], 8, 'ul. Kasprzaka'], [[[520, 215], [660, 300], [690, 455]], 8, 'ul. Taśmowa'], [[[150, 455], [120, 175]], 8, 'ul. Parkowa'],
      [[[845, 265], [880, 485]], 8, 'ul. Złota'], [[[345, 470], [470, 535]], 8, 'ul. Wielkiej Płyty'], [[[62, 262], [135, 320]], 7, 'ul. Ogrodowa']];
    const P = { dom: [150, 455], tor: [520, 85], silownia: [285, 205], restauracja: [345, 470], bar: [690, 455], park: [845, 265], kasyno: [880, 485], psycholog: [120, 175], klub: [660, 300], rodzice: [62, 262], osiedle: [470, 535] };
    const map = { v: 1, W: 760, D: 580, roads: ROADS.map(([pts, wd, name]) => ({ t: wd >= 10 ? 'road4' : 'road2', w: wd, name, pts: pts.map(w) })), areas: [], objs: [], venues: {} };
    // rzeka
    const riverZ = x => { const xm = x / MS + 500; return ((330 + Math.sin(xm / 170) * 28 + (xm > 430 ? 12 : 0)) - 300) * MS; }, top = [], bot = [];
    for (let x = -map.W / 2 - 20; x <= map.W / 2 + 20; x += 10) { top.push([x, +(riverZ(x) - 7.5).toFixed(1)]); bot.unshift([x, +(riverZ(x) + 7.5).toFixed(1)]); }
    map.areas.push({ t: 'water', pts: top.concat(bot) });
    // park
    const pk = w(P.park), park = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; park.push([+(pk[0] + 10 + Math.cos(a) * 40).toFixed(1), +(pk[1] + Math.sin(a) * 26).toFixed(1)]); }
    map.areas.push({ t: 'grass', pts: park });
    // lokale przodem do najbliższej ulicy
    Object.entries(P).forEach(([k, p]) => {
      const [x, z] = w(p);
      if (k === 'tor') { map.venues.tor = { x, z, r: 0 }; return; }
      const n = MapDefs.nearestRoad(map, x, z); let nx = x - n.x, nz = z - n.z, L = Math.hypot(nx, nz); if (L < 0.5) { nx = -(n.bz - n.az); nz = n.bx - n.ax; L = Math.hypot(nx, nz); } nx /= L; nz /= L;
      const off = n.wd / 2 + 3.4 + (k === 'osiedle' ? 24 : 12);
      map.venues[k] = { x: +(n.x + nx * off).toFixed(1), z: +(n.z + nz * off).toFixed(1), r: +Math.atan2(-nx, -nz).toFixed(4) };
    });
    return map;
  },
  roadW(r) { return r.w || (MapDefs.ROAD[r.t] || MapDefs.ROAD.road2).wd; },
  nearestRoad(map, x, z, filter) {
    let best = null;
    map.roads.forEach((r, ri) => { if (filter && !filter(r)) return; for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, x: px, z: pz, ax, az, bx, bz, t, ri, si: i, wd: MapDefs.roadW(r) };
    } });
    return best || { d: 1e9, x: 0, z: 0, ax: 0, az: 0, bx: 1, bz: 0, wd: 8 };
  },
  inPoly(pts, x, z) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; },
  load() { try { const s = localStorage.getItem(MapDefs.KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  active() { try { return localStorage.getItem(MapDefs.USE) === '1' && !!localStorage.getItem(MapDefs.KEY); } catch (e) { return false; } },
};
