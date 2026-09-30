/* =========================================================
   Speedway Empire 3D — meble i przedmioty (modele z internetu)
   • Poly Haven (CC0) — fotorealistyczne: kanapa, fotel, stoliki,
     regały, rośliny, obrazy, biurko, laptop, konsola, regały
     i narzędzia w warsztacie, hokery barowe, butelki, latarnie.
   • Kenney Furniture Kit (CC0) — łóżka, telewizor, kuchnia,
     dywany, lampy, głośniki, biurko.
   Wczytujemy na żądanie (gdy wchodzisz do pokoju) i trzymamy
   w pamięci; każdy mebel skalujemy do podanej szerokości
   albo wysokości w metrach.
   ========================================================= */
'use strict';

const Furn = {
  cache: {}, pending: {},
  SRC: {
    sofa: 'ph/Sofa_01/Sofa_01.gltf', armchair: 'ph/modern_arm_chair_01/modern_arm_chair_01.gltf', coffee: 'ph/modern_coffee_table_01/modern_coffee_table_01.gltf',
    shelves: 'ph/wooden_display_shelves_01/wooden_display_shelves_01.gltf', bookshelf: 'ph/wooden_bookshelf_worn/wooden_bookshelf_worn.gltf',
    plant1: 'ph/potted_plant_01/potted_plant_01.gltf', plant2: 'ph/potted_plant_02/potted_plant_02.gltf', plant4: 'ph/potted_plant_04/potted_plant_04.gltf',
    frame1: 'ph/hanging_picture_frame_01/hanging_picture_frame_01.gltf', frame2: 'ph/fancy_picture_frame_01/fancy_picture_frame_01.gltf',
    sidetable: 'ph/side_table_01/side_table_01.gltf', officeDesk: 'ph/metal_office_desk/metal_office_desk.gltf', laptop: 'ph/classic_laptop/classic_laptop.gltf',
    console: 'ph/gaming_console/gaming_console.gltf', steelShelf: 'ph/steel_frame_shelves_02/steel_frame_shelves_02.gltf', toolCart: 'ph/tool_cart/tool_cart.gltf',
    toolChest: 'ph/metal_tool_chest/metal_tool_chest.gltf', vice: 'ph/bench_vice_01/bench_vice_01.gltf', tyre: 'ph/old_tyre/old_tyre.gltf', barrel: 'ph/Barrel_01/Barrel_01.gltf',
    barStool: 'ph/bar_chair_round_01/bar_chair_round_01.gltf', bottles: 'ph/wine_bottles_01/wine_bottles_01.gltf', register: 'ph/CashRegister_01/CashRegister_01.gltf',
    streetLamp: 'ph/street_lamp_01/street_lamp_01.gltf', trash: 'ph/metal_trash_can/metal_trash_can.gltf', barrier: 'ph/concrete_road_barrier/concrete_road_barrier.gltf', hydrant: 'ph/fire_hydrant/fire_hydrant.gltf',
    bedDouble: 'kfurn/bedDouble.glb', bedSingle: 'kfurn/bedSingle.glb', tvModern: 'kfurn/televisionModern.glb', tvCabinet: 'kfurn/cabinetTelevision.glb',
    rug: 'kfurn/rugRectangle.glb', lampFloor: 'kfurn/lampRoundFloor.glb', speaker: 'kfurn/speaker.glb', desk: 'kfurn/desk.glb', chairDesk: 'kfurn/chairDesk.glb',
    kCabinet: 'kfurn/kitchenCabinet.glb', kFridge: 'kfurn/kitchenFridgeLarge.glb', kStove: 'kfurn/kitchenStove.glb', kSink: 'kfurn/kitchenSink.glb',
    // 3dassets.dev (CC0): plac budowy, siłownia, medycyna, dom, biuro, klub, warsztat
    meetingTable: 'a3d/meetingtable.glb',
    pubCounter: 'a3d/pubCounter.glb', pubCounterEnd: 'a3d/pubCounterEnd.glb', pubTill: 'a3d/pubTill.glb', pubStool: 'a3d/pubStool.glb', beerTap: 'a3d/beerTap.glb', dartboard: 'a3d/dartboard.glb', jukebox: 'a3d/jukebox.glb', poolTable: 'a3d/poolTable.glb',
    restTable: 'a3d/restTable.glb', restChair: 'a3d/restChair.glb', booth: 'a3d/booth.glb', espresso: 'a3d/espresso.glb', pastryCase: 'a3d/pastryCase.glb', cafeStool: 'a3d/cafeStool.glb', bistroTable: 'a3d/bistroTable.glb',
    loungeChair: 'a3d/loungeChair.glb', lobbyChair: 'a3d/lobbyChair.glb', plantTall: 'a3d/plantTall.glb', highTable: 'a3d/highTable.glb', scaffold: 'a3d/scaffold.glb',
     siteCabin: 'a3d/sitecabin.glb', siteFence: 'a3d/sitefence.glb',
    treadmill: 'a3d/treadmill.glb', dumbbells: 'a3d/dumbbells.glb', gymBench: 'a3d/gymbench.glb', benchPress: 'a3d/benchpress.glb', exBike: 'a3d/exbike.glb', rower: 'a3d/rower.glb',
    careBed: 'a3d/carebed.glb', examCouch: 'a3d/examcouch.glb', massage: 'a3d/massage.glb', pharmacy: 'a3d/pharmacy.glb',
    bed2: 'a3d/bed2.glb', wardrobe: 'a3d/wardrobe.glb', fridge: 'a3d/fridge.glb', kBase: 'a3d/kbase.glb', washer2: 'a3d/washer2.glb',
    officeChair: 'a3d/officechair.glb', filing: 'a3d/filing.glb', trophyCab: 'a3d/trophies.glb', barCounter: 'a3d/barcounter.glb', djDesk: 'a3d/djdesk.glb', tyreRack: 'a3d/tyrerack.glb', compressor: 'a3d/compressor.glb',
    slotUp: 'a3d/slotUp.glb', slotRound: 'a3d/slotRound.glb', casStool: 'a3d/casStool.glb', chandelier: 'a3d/chandelier.glb', cashCage: 'a3d/cashCage.glb', casSofa: 'a3d/casSofa.glb', cockTable: 'a3d/cockTable.glb', pokerTable: 'a3d/pokerTable.glb',
    bikeLift: 'a3d/bikeLift.glb', tyreChanger: 'a3d/tyreChanger.glb', wheelBal: 'a3d/wheelBal.glb', leathers: 'a3d/leathers.glb', bikeCover: 'a3d/bikeCover.glb', pegboard: 'a3d/pegboard.glb',
    kitchenL: 'a3d/kitchenL.glb', diningRound: 'a3d/diningRound.glb', diningChair: 'a3d/diningChair.glb', curtains: 'a3d/curtains.glb', drawers: 'a3d/drawers.glb', arcLamp: 'a3d/arcLamp.glb', nightstand: 'a3d/nightstand.glb',
    // v1.9: mieszkanie w pełni urządzone, osiedle z blokami (3dassets.dev, CC0)
    bathroom: 'a3d/bathroom.glb', bookcase5: 'a3d/bookcase5.glb', rugWool: 'a3d/rugWool.glb', sconce: 'a3d/sconce.glb', helmetStand: 'a3d/helmetStand.glb', guitar: 'a3d/guitar.glb', mirror: 'a3d/mirror.glb', consoleTable: 'a3d/consoleTable.glb', tallboy: 'a3d/tallboy.glb', coatHooks: 'a3d/coatHooks.glb', shoeRack: 'a3d/shoeRack.glb', doormat: 'a3d/doormat.glb', radiator: 'a3d/radiator.glb', wallClock: 'a3d/wallClock.glb', posterBlue: 'a3d/posterBlue.glb', posterCoral: 'a3d/posterCoral.glb', swings: 'a3d/swings.glb', slide: 'a3d/slide.glb', sandpit: 'a3d/sandpit.glb', benchPark: 'a3d/benchPark.glb', dumpster: 'a3d/dumpster.glb', garageDoor: 'a3d/garageDoor.glb', police: 'a3d/police.glb', coupe: 'a3d/coupe.glb', suvmid: 'a3d/suvmid.glb', dog: 'a3d/dog.glb', hatch3: 'a3d/hatch3.glb', estate: 'a3d/estate.glb', saloon: 'a3d/saloon.glb', panelvan: 'a3d/panelvan.glb',
    loungeSofa: 'kfurn/loungeSofa.glb', bookcase: 'kfurn/bookcaseOpen.glb', computer: 'kfurn/computerScreen.glb', washer: 'kfurn/washer.glb',
  },

  /** Wczytaj brakujące modele; cb, gdy wszystkie z listy są gotowe */
  load(keys, cb) {
    if (!THREE.GLTFLoader || location.protocol === 'file:') return;
    const L = Furn._L || (Furn._L = new THREE.GLTFLoader());
    const need = keys.filter(k => !Furn.cache[k] && Furn.SRC[k]);
    if (!need.length) { cb && cb(); return; }
    Promise.all(need.map(k => Furn.pending[k] || (Furn.pending[k] = new Promise(res => L.load('models/' + Furn.SRC[k], g => {
      g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.userData.lin = true; m.userData.shared = true; }); if (o.geometry) o.geometry.userData.shared = true; } });
      const box = new THREE.Box3().setFromObject(g.scene);
      Furn.cache[k] = { scene: g.scene, size: box.getSize(new THREE.Vector3()), min: box.min.clone(), c: box.getCenter(new THREE.Vector3()) };
      res();
    }, null, () => { console.warn('Brak modelu', k); res(); }))))).then(() => cb && cb());
  },
  ready: keys => keys.every(k => Furn.cache[k]),

  /**
   * Postaw mebel: pozycja (x, y, z) to środek podstawy, rot — obrót wokół pionu,
   * size: { w } szerokość (dłuższy bok poziomy) | { h } wysokość | { s } skala wprost
   */
  place(parent, k, x, y, z, rot = 0, size = {}) {
    const C = Furn.cache[k]; if (!C) return null;
    const o = C.scene.clone(true);
    // bez rozmiaru: naturalna skala — Poly Haven jest w metrach, Kenney w „kafelkach” ≈ 0,54 m
    const s = size.s || (size.h ? size.h / C.size.y : size.w ? size.w / Math.max(C.size.x, C.size.z) : Furn.SRC[k].startsWith('kfurn') ? 1.85 : 1);
    const inner = new THREE.Group(); inner.add(o); o.position.set(-C.c.x, -C.min.y, -C.c.z);
    const g = new THREE.Group(); g.add(inner); inner.scale.setScalar(s);
    g.position.set(x, y, z); g.rotation.y = rot;
    parent.add(g);
    return g;
  },
};
