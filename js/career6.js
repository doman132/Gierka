/* =========================================================
   Speedway Empire 3D — v2.0
   • zapis w 3 slotach + autozapis co tydzień
   • samouczek pierwszego tygodnia (kariera)
   • twój motocykl: kolory, numer, podgląd 3D, ulepszenia widoczne na modelu
   • agent/menedżer w telefonie, drużyna i szatnia
   • Młodzieżowe Mistrzostwa Polski i Złoty Kask, kontrola antydopingowa
   • koniec kariery: galeria sław, przejście na prezesa (tryb menedżera)
   • pora dnia na osiedlu, dojazd autobusem albo własnym autem
   • dom rodzinny (mama, tata, młodszy brat), pies w mieszkaniu
   • samochód, inwestycje (szkółka, sklep), podatki i księgowa
   • tryb foto (zrzut ekranu z gry), instalacja jako aplikacja (PWA)
   ========================================================= */
'use strict';

/* =========================================================
   ZAPIS: 3 sloty + autozapis
   ========================================================= */
Object.assign(Game, {
  slot: (() => { try { return +(localStorage.getItem('se3d_slot') || 1) || 1; } catch (e) { return 1; } })(),
  keyOf(n) { return n === 'auto' ? DATA.SAVE_KEY + '.auto' : n === 1 ? DATA.SAVE_KEY : DATA.SAVE_KEY + '.s' + n; },
  setSlot(n) { Game.slot = n; try { localStorage.setItem('se3d_slot', String(n)); } catch (e) { } },
  peek(n) { try { const raw = localStorage.getItem(Game.keyOf(n)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
  label(s) {
    if (!s) return 'pusty';
    const club = s.clubs.find(c => c.id === s.user);
    return `${s.mode === 'career' && s.riders[s.career.me] ? 'Kariera: ' + s.riders[s.career.me].name + ' · ' : 'Menedżer · '}${club ? club.name : ''} · sezon ${s.season}, tydz. ${s.week + 1}`;
  },
  save() { try { Game.s._slot = Game.slot; localStorage.setItem(Game.keyOf(Game.slot), JSON.stringify(Game.s)); return true; } catch (e) { return false; } },
  load() { return Game.peek(Game.slot); },
  wipe() { try { localStorage.removeItem(Game.keyOf(Game.slot)); } catch (e) { } },
  autosave() { try { if (Game.s) { Game.s._slot = Game.slot; localStorage.setItem(Game.keyOf('auto'), JSON.stringify(Game.s)); } } catch (e) { } },
});
(() => {
  const be = Game.endWeek;
  Game.endWeek = function (um) { const r = be.call(this, um); Game.autosave(); return r; };
})();
// menu startowe: sloty (Main powstaje w main.js — podpinamy się tuż przed startem)
window.addEventListener('load', () => {
  const bs = Main.start;
  Main.start = function () {
    bs.call(this);
    const sheet = document.querySelector('#mgr .start .sheet'); if (!sheet) return;
    const act = sheet.querySelector('.actions'); if (act) act.remove();
    const auto = Game.peek('auto');
    const html = `<div class="box slots"><h3>Zapisy gry</h3>${[1, 2, 3].map(n => { const s = Game.peek(n); return `<div class="slot-row ${Game.slot === n ? 'on' : ''}">
        <label><input type="radio" name="slotnew" value="${n}" ${Game.slot === n ? 'checked' : ''}> Slot ${n}</label><span class="small">${esc(Game.label(s))}</span>
        ${s ? `<button class="go small" data-slotload="${n}">Wczytaj</button><button class="ghost small" data-slotdel="${n}">Usuń</button>` : ''}</div>`; }).join('')}
      ${auto ? `<div class="slot-row"><span>Autozapis</span><span class="small">${esc(Game.label(auto))}</span><button class="ghost small" data-slotload="auto">Wczytaj autozapis</button></div>` : ''}
      <p class="small muted">Nowa gra zapisze się w zaznaczonym slocie (stary zapis w tym slocie zostanie zastąpiony). Autozapis powstaje po każdym tygodniu.</p></div>`;
    sheet.querySelector('.box').insertAdjacentHTML('beforebegin', html);
  };
}, { once: true });
document.addEventListener('click', e => {
  const ld = e.target.closest('[data-slotload]'), del = e.target.closest('[data-slotdel]'), st = e.target.closest('[data-start]'), rad = e.target.closest('input[name="slotnew"]');
  if (rad) { Game.setSlot(+rad.value); return; }
  if (ld) {
    e.stopImmediatePropagation(); const v = ld.dataset.slotload;
    if (v === 'auto') { const s = Game.peek('auto'); if (!s) return; Game.setSlot(s._slot || Game.slot); Game.s = s; Club.ensure(Game.s); Game.save(); UI.tab = 'pulpit'; UI.show('mgr'); UI.render(); }
    else { Game.setSlot(+v); Main.begin('load'); }
    return;
  }
  if (del) { e.stopImmediatePropagation(); const n = +del.dataset.slotdel; if (confirm(`Usunąć zapis ze slotu ${n}?`)) { try { localStorage.removeItem(Game.keyOf(n)); } catch (x) { } Main.start(); } return; }
  if (st && st.dataset.start !== 'load') { const r = document.querySelector('input[name="slotnew"]:checked'); if (r) Game.setSlot(+r.value); }
}, true);

/* =========================================================
   SAMOUCZEK (kariera, pierwszy tydzień)
   ========================================================= */
const Tut = {
  STEPS: [
    ['kpulpit', 'Witaj w zawodowym żużlu!', 'To twój pulpit: najbliższy mecz, nastrój, zmęczenie i wiadomości. Tydzień to 6 dni po 3 pory — w niedzielę mecz ligowy.'],
    ['kmiasto', 'Miasto', 'Klikaj miejsca na mapie. Każde zajęcie zabiera porę dnia i ma dzienny limit. Paski energii, jedzenia i stresu wpływają na twoją jazdę — patrz „Wpływ na jazdę”.'],
    ['kmiasto', 'Wejdź do środka', '„Wejdź do środka (3D)” — chodzisz postacią (WASD, mysz, E przy miejscach akcji). Poznajesz ludzi w barze, kawiarni i na siłowni. Esc — wyjście.'],
    ['kmiasto', 'Telefon 📱', 'Klawisz P albo 📱: SMS-y (odpisuj!), kontakty, sponsorzy, relacje, agent i garderoba. Znajomi dają korzyści.'],
    ['ksprzet', 'Sprzęt i twój motocykl', 'Tu ulepszasz silnik, sprzęgło, ramę i resztę — i malujesz swój motocykl. Ulepszenia widać na modelu.'],
    ['kkariera', 'Kariera', 'Turnieje (GP, kadra, Złoty Kask), liga zagraniczna, transfery, rywale, drużyna, biznes. Wracaj tu co kilka tygodni.'],
    ['kpulpit', 'Zakończ tydzień', 'Gdy tydzień minie, kliknij „Zakończ tydzień ▸”. Potem mecz: jedziesz sam (W — gaz, A/D — linia) albo symulujesz. Powodzenia!'],
  ],
  show() {
    const C = Career.C(); if (!C || C.tut == null || C.tut >= Tut.STEPS.length || (typeof Settings !== 'undefined' && Settings.d && Settings.d.tips === false)) { Tut.hide(); return; }
    const [tab, h, t] = Tut.STEPS[C.tut];
    let el = document.getElementById('tutbox'); if (!el) { el = document.createElement('div'); el.id = 'tutbox'; document.body.appendChild(el); }
    el.innerHTML = `<div class="tut-k">Samouczek ${C.tut + 1}/${Tut.STEPS.length}</div><b>${esc(h)}</b><p>${esc(t)}</p><div class="row"><button class="go small" data-tut="next">${C.tut + 1 < Tut.STEPS.length ? 'Dalej ▸' : 'Gotowe'}</button><button class="ghost small" data-tut="skip">Pomiń samouczek</button></div>`;
    el.hidden = false;
    if (Career.tab !== tab) { Career.tab = tab; Career.render(); }
  },
  hide() { const el = document.getElementById('tutbox'); if (el) el.hidden = true; },
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tut]'); if (!t) return; e.stopImmediatePropagation();
  const C = Career.C(); if (!C) return;
  if (t.dataset.tut === 'skip') C.tut = 99; else C.tut++;
  Game.save(); if (C.tut >= Tut.STEPS.length) Tut.hide(); else Tut.show();
}, true);
(() => {
  const bn = Career.newGame;
  Career.newGame = function (...a) { const s = bn.apply(this, a); s.career.tut = 0; Game.save(); return s; };
  const br = Career.render;
  Career.render = function () { const r = br.call(this); const C = Career.C(); if (C && C.tut != null && C.tut < Tut.STEPS.length && !Tut._busy) { Tut._busy = true; setTimeout(() => { Tut._busy = false; const el = document.getElementById('tutbox'); if (!el || el.hidden) Tut.show(); }, 0); } return r; };
  const bsh = UI.show;
  UI.show = function (id) { const r = bsh.apply(this, arguments); if (id === 'md') Tut.hide(); else if (Game.s && Game.s.mode === 'career') { const C = Career.C(); if (C && C.tut != null && C.tut < Tut.STEPS.length) setTimeout(Tut.show, 0); } return r; };
})();

/* =========================================================
   TWÓJ MOTOCYKL: kolory, numer, podgląd 3D
   ========================================================= */
const MyBike = {
  COLORS: { frame: ['#1c1c20', '#b8bcc2', '#c8102e', '#1F4FB0', '#1B7A43', '#f2c230', '#ffffff', '#7a3cc8'], trim: ['#D9541F', '#2A55B8', '#F2C230', '#EDEDED', '#1b1b1f', '#c8102e', '#2e8b57', '#ff5aa8'], helmet: ['#E5413A', '#3D7FE0', '#EDEDED', '#F2C230', '#1b1b1f', '#ff7a1a', '#2e8b57', '#8a4dff'] },
  get() { const C = Career.C(), club = Game.club(Game.s.user); C.bike = C.bike || { frame: '#1c1c20', trim: club.trim, helmet: '#E5413A', no: 7 }; return C.bike; },
  /** Parametry dla Bike.build: kolory gracza + ulepszenia widoczne na modelu */
  spec(base = {}) {
    const b = MyBike.get(), g = Career.C().gear || {}, tl = g.tuner || 0;
    return { ...base, frameC: b.frame, trim: b.trim, bikeTrim: b.trim, pipeC: ['#8a6a4a', '#9a7a5a', '#4a6ab8', '#c9a227'][tl], silC: tl >= 3 ? '#2b2d31' : null, big: tl >= 2, mech: !!g.mechanic };
  },
  card() {
    const b = MyBike.get(), sw = (k, cs) => cs.map(c => `<button class="swatch ${b[k] === c ? 'on' : ''}" style="--c:${c}" data-ui="cBikeC" data-v="${k}:${c}" title="${c}"></button>`).join('');
    return `<div class="card mybike"><h3>🏍️ Twój motocykl</h3><div class="mb-wrap"><canvas id="mb-view" width="520" height="300"></canvas>
      <div class="mb-opts"><p class="small">Rama</p><div class="sw">${sw('frame', MyBike.COLORS.frame)}</div><p class="small">Bak, osłony, sprężyny</p><div class="sw">${sw('trim', MyBike.COLORS.trim)}</div>
      <p class="small">Kask</p><div class="sw">${sw('helmet', MyBike.COLORS.helmet)}</div><p class="small">Numer na plastronie: <b>${b.no}</b> <button class="ghost small" data-ui="cBikeNo" data-v="-1">−</button><button class="ghost small" data-ui="cBikeNo" data-v="1">+</button></p>
      <p class="small muted">Tuning zmienia wydech (kolor tytanu, większy tłumik). Kolory widać w meczu, na treningu i w mieszkaniu.</p></div></div></div>`;
  },
  preview() {
    const cv = document.getElementById('mb-view'); if (!cv || !window.THREE) return;
    MyBike.stop();
    const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.outputEncoding = THREE.sRGBEncoding;
    const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, cv.width / cv.height, 0.1, 50); cam.position.set(0, 1.3, 4.6); cam.lookAt(0, 0.62, 0);
    S.add(new THREE.HemisphereLight(0xffffff, 0x444450, 1.0)); const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(3, 5, 4); S.add(d);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8, 48), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; S.add(floor);
    const b = MyBike.get(), club = Game.club(Game.s.user);
    const bk = Bike.build(MyBike.spec({ kevlar: club.kevlar, helmet: b.helmet, no: b.no, name: '' }), { noTag: true }); bk.rider.visible = false; S.add(bk.root);
    let a = 0.6; const loop = () => { MyBike._raf = requestAnimationFrame(loop); if (!document.body.contains(cv)) { MyBike.stop(); return; } a += 0.008; bk.root.rotation.y = a; R.render(S, cam); };
    MyBike._R = R; loop();
  },
  stop() { if (MyBike._raf) cancelAnimationFrame(MyBike._raf); MyBike._raf = null; if (MyBike._R) { MyBike._R.dispose(); MyBike._R = null; } },
};
(() => {
  // Bike.build: kolor ramy, wydechu i tłumika
  const bb = Bike.build;
  Bike.build = function (x, opts) {
    const b = bb.call(this, x, opts);
    if (x && (x.frameC || x.pipeC)) {
      const done = new Set();
      b.root.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (done.has(m)) return; done.add(m);
        if (x.frameC && m.color && m.color.getHex() === 0x1c1c20 && m.metalness === 0.6) m.color.set(x.frameC);
        if (x.pipeC && m.color && m.color.getHex() === 0x8a6a4a) m.color.set(x.pipeC); }); });
    }
    return b;
  };
  // w biegach: twój zawodnik z twoimi kolorami
  const bh = MatchDay.heatRiders;
  MatchDay.heatRiders = function () { const out = bh.call(this), C = Game.s.career; if (C && Game.s.mode === 'career') out.forEach((x, i) => { if (x.id === C.me) out[i] = MyBike.spec({ ...x }); }); return out; }; // kask zostaje w kolorze pola startowego (zasada żużla)
  const bmc = Meet.cfgFor;
  Meet.cfgFor = function (ids) { const cfg = bmc.call(this, ids), C = Career.C(); cfg.riders.forEach((x, i) => { if (x.id === C.me) cfg.riders[i] = MyBike.spec({ ...x }); }); return cfg; };
  const bps = Practice.start;
  Practice.start = function () { const s = Game.s; if (s && s.mode === 'career') { const brs = RaceView.start; RaceView.start = function (cfg, o) { RaceView.start = brs; cfg.riders.forEach((x, i) => { if (x.id === s.career.me) cfg.riders[i] = MyBike.spec({ ...x }); }); return brs.call(this, cfg, o); }; } return bps.call(this); };
  // karta w zakładce Sprzęt + podgląd
  const bv = Career.views.ksprzet;
  Career.views.ksprzet = function () { setTimeout(MyBike.preview, 0); return MyBike.card() + bv.call(this); };
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cBikeC') { const [k, c] = d.v.split(':'); MyBike.get()[k] = c; Game.save(); Career.render(); return true; }
    if (d.ui === 'cBikeNo') { const b = MyBike.get(); b.no = ((b.no - 1 + +d.v + 99) % 99) + 1; Game.save(); Career.render(); return true; }
    return bc.call(this, d);
  };
  // motocykl w salonie: też twój
  const bbuild = Bike.build;
  const bf = Career.furnish;
  Career.furnish = function (R, spots) {
    const s = Game.s; Bike.build = function (x, o) { if (x && x.name === '' && x.no === 1 && Walk.room === 'home') { const b = MyBike.get(); x = MyBike.spec({ ...x, helmet: b.helmet, no: b.no }); } return bbuild.call(this, x, o); };
    try { return bf.call(this, R, spots); } finally { Bike.build = bbuild; }
  };
})();

/* =========================================================
   ANIMACJE: nowe pozy (Rocketbox) i gesty w scenach
   ========================================================= */
Object.assign(Humans.POSES, {
  celebrate: ['cheer_04', 'cheer_05', 'cheer_01', 'cheer_03'], laugh: ['gestic_laugh_loud', 'gestic_talk_excited_01'], nervous: ['idle_nervous_01', 'idle_nervous_02'],
  drunk: ['idle_drunk_01', 'drunk_gestic_01'], sitTable: ['sit_table_idle_relaxed_01', 'sit_table_idle_neutral_01'], sitRelax: ['sit_chair_idle_relaxed_01', 'sit_chair_idle_neutral_01'],
  angry: ['gestic_listen_angry_01', 'idle_angry_01'], shrug: ['gestic_shrug_01'], stretch: ['idle_stretch_arms_01'],
});
Humans.POSES.dance = Humans.POSES.dance.concat(['dancing_silly']);
Humans.POSES.drink = Humans.POSES.drink.concat(['drink_drinking']);

/* =========================================================
   AGENT / MENEDŻER
   ========================================================= */
const Agent = {
  TYPES: { fair: { n: 'Marek Wolny — uczciwy agent', pct: 0.08, d: 'prowizja 8%, spokojnie i bez niespodzianek; kilka ofert sponsorskich w sezonie' }, shark: { n: '„Rekin” Zdzisław — agresywny agent', pct: 0.18, d: 'prowizja 18%, dużo ofert i lepsze kontrakty… czasem z ukrytym haczykiem' } },
  hire(k) { const C = Career.C(); C.agentType = k; C.agent = true; Game.news(`Nowy agent: ${Agent.TYPES[k].n}.`, 'info'); Game.save(); City.phoneRender(); },
  fire() { const C = Career.C(); if (!C.agentType) return; Career.pay(-3000, 'Zerwanie umowy z agentem'); C.agentType = null; C.agent = false; Game.save(); City.phoneRender(); },
  week() {
    const C = Career.C(); if (!C.agentType || !C.city) return;
    if (Math.random() < (C.agentType === 'shark' ? 0.3 : 0.15)) { const o = City.newSponsor(); if (o && C.agentType === 'shark') { o.weekly = Math.round(o.weekly * 1.25 / 50) * 50; } if (o) City.sms('Agent', `Załatwiłem ci rozmowę ze sponsorem ${o.name}. Sprawdź telefon!`); }
  },
};
(() => {
  // prowizja od kontraktów, punktów, sponsorów i transferów
  const bp = Career.pay;
  Career.pay = function (v, what) {
    bp.call(this, v, what); const C = Career.C(); if (!C) return;
    if (v > 0) { C.taxIncome = (C.taxIncome || 0) + v; }
    if (v > 0 && C.agentType && /Punkty|Pensja|kontrakt|Kontrakt|Transfer|Sponsor|Premia/.test(what || '')) bp.call(this, -Math.round(v * Agent.TYPES[C.agentType].pct), 'Prowizja agenta');
  };
  // rekin: lepsze oferty po sezonie, ale czasem „lojalka”
  const bse = Career.seasonEnd;
  Career.seasonEnd = function () {
    const r = bse.call(this), C = Career.C();
    if (C.agentType === 'shark') C.offers.forEach(o => { o.sign = Math.round(o.sign * 1.15 / 1000) * 1000; if (Math.random() < 0.25) { o.perPoint = Math.round(o.perPoint * 0.8 / 50) * 50; o.hidden = true; } });
    return r;
  };
  const bk = Career.views.kkariera;
  Career.views.kkariera = function () { let h = bk.call(this); return h.replace(/(<small>)(\d+ sez\. · [^<]*?)(<\/small><\/div><button class="ghost small" data-ui="cNegOpen" data-v="(\d+)")/g, (m, a, b, c, i) => { const o = Career.C().offers[+i]; return a + b + (o && o.hidden ? ' · <span class="neg">⚠ drobny druk: niższa stawka za punkt</span>' : '') + c; }); };
  // telefon: aplikacja agenta
  const br = City.phoneRender;
  City.phoneRender = function () {
    const app = City.app || 'home', el = document.getElementById('phone');
    if (el && app === 'agent') {
      City.app = 'home'; br.call(this); City.app = 'agent';
      const C = Career.C(), body = el.querySelector('.ph-body'), title = el.querySelector('.ph-title');
      title.innerHTML = '<button data-ui="ph" data-v="app:home">‹</button> Agent 🤝';
      body.innerHTML = C.agentType ? `<div class="ph-bank"><small>Twój agent</small><b>${esc(Agent.TYPES[C.agentType].n)}</b></div><p class="ph-note">${esc(Agent.TYPES[C.agentType].d)}</p><div class="ph-call"><button data-ui="ph" data-v="agent:fire">Zerwij umowę (3000 zł)</button></div>`
        : `<p class="ph-note">Agent szuka sponsorów i negocjuje kontrakty — za procent.</p><ul class="ph-list">${Object.entries(Agent.TYPES).map(([k, a]) => `<li><div><b>${esc(a.n)}</b><small>${esc(a.d)}</small></div><button data-ui="ph" data-v="agent:${k}">Podpisz</button></li>`).join('')}</ul>`;
      return;
    }
    br.call(this);
    if (el && app === 'home') { const grid = el.querySelector('.ph-grid'); if (grid && !grid.querySelector('[data-v="app:agent"]')) grid.insertAdjacentHTML('beforeend', '<button data-ui="ph" data-v="app:agent"><b>🤝</b><small>Agent</small></button>'); }
  };
  const bd = City.phoneDo;
  City.phoneDo = function (v) { if (v.startsWith('agent:')) { const k = v.slice(6); if (k === 'fire') Agent.fire(); else Agent.hire(k); return; } return bd.call(this, v); };
})();

/* =========================================================
   DRUŻYNA I SZATNIA
   ========================================================= */
const Team = {
  mates() { const s = Game.s, C = Career.C(); C.team = C.team || {}; return Game.roster(s.user).filter(r => r.id !== C.me).map(r => { if (C.team[r.id] == null) C.team[r.id] = 45 + R.int(-10, 10); return { r, rel: C.team[r.id] }; }); },
  captain() { const m = Game.roster(Game.s.user).slice().sort((a, b) => (b.age * 0.3 + b.ksm) - (a.age * 0.3 + a.ksm)); return m[0]; },
  avg() { const m = Team.mates(); return m.length ? m.reduce((a, x) => a + x.rel, 0) / m.length : 50; },
  add(d, id) { const C = Career.C(); Team.mates().forEach(x => { if (!id || x.r.id === id) C.team[x.r.id] = R.clamp(C.team[x.r.id] + d, 0, 100); }); },
  dinner() { const C = Career.C(); if (C.money < 1500) { UI.toast('Za mało pieniędzy.', true); return; } if (C.teamDinner === Game.s.week) { UI.toast('W tym tygodniu już była kolacja drużyny.', true); return; } C.teamDinner = Game.s.week; Career.pay(-1500, 'Kolacja dla drużyny'); Team.add(8); Career.mor(3); Game.save(); Career.render(); UI.toast('Pizza, żeberka i stare historie z parku maszyn. Relacje w drużynie +8.'); },
  week() { const C = Career.C(), a = Team.avg(); if (a > 62) Career.mor(1); if (a < 30 && C.city) C.city.stress += 3; },
};
Career.EV.number = {
  t: 'Spór o numer', when: () => Team.mates().length > 2,
  get x() { const m = Team.captain(); return `${m && m.id !== Career.C().me ? m.name : 'Kapitan'} chce jechać z twoim numerem startowym w meczu: „Mam z nim szczęście od lat, młody.”`; },
  o: [['Oddaj numer', () => { Team.add(6); Career.mor(-2); return 'Szatnia docenia gest. Relacje w drużynie +6.'; }], ['Nie oddam — wywalczyłem go', () => { Team.add(-8); Career.mor(3); return 'Postawiłeś się. Pewność siebie rośnie, ale w szatni chłodniej (relacje −8).'; }]],
};
Career.EV.mateHelp = {
  t: 'Kolega z drużyny prosi o pomoc', when: () => Team.mates().length > 0,
  get x() { const m = Team.mates()[0]; return `${m ? m.r.name : 'Kolega'} przeprowadza się w sobotę rano i nie ma komu nosić mebli. Masz trening.`; },
  o: [['Pomogę', () => { const m = Team.mates()[0]; if (m) Team.add(15, m.r.id); if (Career.C().city) Career.C().city.energy -= 10; return 'Wnieśliście szafę na czwarte piętro bez windy. Przyjaźń na lata.'; }], ['Mam trening', () => { const m = Team.mates()[0]; if (m) Team.add(-6, m.r.id); return 'Rozumie… chyba.'; }]],
};

/* =========================================================
   MŁODZIEŻOWE MISTRZOSTWA POLSKI, ZŁOTY KASK, DOPING
   ========================================================= */
(() => {
  const bd = Meet.due;
  Meet.due = function (w = Game.s.week) {
    const d = bd.call(this, w); if (d) return d;
    const s = Game.s, C = Career.C(), r = Career.me(); if (!C || s.over) return null;
    const key = s.season + ':' + w; if ((C.meetsDone || {})[key]) return null;
    if (w === 4 && r.age <= 21) return { kind: 'mimp', title: 'Młodzieżowe Indywidualne Mistrzostwa Polski', key };
    if (w === 9 && (Game.ovr(r) >= 11 || C.rep >= 25)) return { kind: 'kask', title: 'Turniej o Złoty Kask', key };
    return null;
  };
  // doping: odżywka z siłowni, tabletka na imprezie
  const bre = Career.resolveEvent;
  Career.resolveEvent = function (i) { const C = Career.C(); if (C.eventKey === 'supplement' && +i === 1) C.doped = 6; return bre.call(this, i); };
  const bc = Career.click;
  Career.click = function (d) { if (d.ui === 'cFans' && d.v === 'pill') Career.C().doped = 4; if (d.ui === 'cTeamDinner') { Team.dinner(); return true; } return bc.call(this, d); };
  const bfin = Meet.finish;
  Meet.finish = function () {
    const C = Career.C(), tro = C.trophies.length; bfin.call(this);
    if (C.doped > 0 && Math.random() < 0.6) Doping.caught(tro);
  };
  const bf = Career.finishWeek;
  Career.finishWeek = function (um) {
    const C = Career.C(); const res = bf.call(this, um);
    if (um && C.doped > 0 && Math.random() < 0.12) Doping.caught(C.trophies.length);
    if (C.doped > 0) C.doped--;
    Team.week(); Agent.week(); Biz.week();
    return res;
  };
})();
const Doping = {
  caught(tro) {
    const C = Career.C(), r = Career.me();
    C.trophies.length = Math.min(C.trophies.length, tro); C.doped = 0;
    C.suspended = Math.max(C.suspended || 0, 12); Career.repd(-30); Career.pay(-20000, 'Kara za doping'); Career.mor(-15);
    C.deals = C.deals.filter(d => d.clause !== 'image');
    Game.news(`Kontrola antydopingowa: pozytywny wynik ${r.name}. Zawieszenie na 12 tygodni.`, 'bad');
    const f = () => UI.modal(`<div class="kicker">Komisja antydopingowa</div><div class="dilemma scandal"><div class="dl-ico">🧪</div><div><h2>Wynik pozytywny</h2><p>Próbka B potwierdziła niedozwoloną substancję. Wynik zawodów anulowany, zawieszenie na 12 tygodni, kara 20 000 zł, reputacja −30. Sponsorzy z klauzulą wizerunkową odchodzą.</p></div></div><div class="actions"><button class="go" data-ui="close">…</button></div>`);
    if (!document.getElementById('md').hidden) Inj._pending = f; else f();
  },
};
// tytuły i nagrody nowych turniejów
(() => {
  const bfin = Meet.finish;
  Meet.finish = function () {
    const M = Meet.m, C = Career.C(), s = Game.s, before = C.money, d0 = C.doped || 0;
    bfin.call(this);
    if (!M || !['mimp', 'kask'].includes(M.kind)) return;
    const caught = d0 > 0 && !C.doped && C.suspended >= 12; // wpadka dopingowa — wynik anulowany
    const won = /<h1>1\. miejsce/.test(document.getElementById('md-panel').innerHTML);
    const extra = M.kind === 'mimp' ? 0.15 : 0.3; const paid = C.money - before; Career.pay(-Math.round(paid * (1 - extra)), 'Korekta premii (turniej krajowy)');
    if (won && !caught) C.trophies.push(M.kind === 'mimp' ? `Młodzieżowy Indywidualny Mistrz Polski ${s.season}` : `Złoty Kask ${s.season}`);
  };
})();

/* =========================================================
   KONIEC KARIERY: galeria sław, przejście na prezesa
   ========================================================= */
const Retire = {
  hof() { try { return JSON.parse(localStorage.getItem('se3d_hof') || '[]'); } catch (e) { return []; } },
  run(forced) {
    const s = Game.s, C = Career.C(), r = Career.me();
    const pts = C.history.reduce((a, h) => a + h.pts, 0), seasons = C.history.length;
    const entry = { name: r.name, seasons, pts, trophies: C.trophies.slice(), club: Game.club(s.user).name, until: s.season };
    try { const H = Retire.hof(); H.unshift(entry); localStorage.setItem('se3d_hof', JSON.stringify(H.slice(0, 30))); } catch (e) { }
    C.retired = true; Game.save();
    UI.modal(`<div class="kicker">${forced ? 'Czas się pożegnać' : 'Decyzja'}</div><h2>Koniec kariery: ${esc(r.name)}</h2>
      <p>${seasons} sezonów · ${pts} punktów w lidze · ${C.trophies.length} ${C.trophies.length === 1 ? 'trofeum' : C.trophies.length % 10 >= 2 && C.trophies.length % 10 <= 4 && (C.trophies.length % 100 < 10 || C.trophies.length % 100 >= 20) ? 'trofea' : 'trofeów'}. Kibice ${esc(Game.club(s.user).name)} żegnają cię owacją na stojąco.</p>
      <ul class="list small">${C.trophies.slice(-8).map(t => `<li>🏆 ${esc(t)}</li>`).join('') || '<li class="muted">Bez trofeów — ale z sercem na torze.</li>'}</ul>
      <div class="talk-opts"><button class="opt" data-ui="cRetire" data-v="president">Zostań prezesem ${esc(Game.club(s.user).name)} (tryb menedżera)</button><button class="opt" data-ui="cRetire" data-v="hof">Galeria sław</button><button class="opt" data-ui="cRetire" data-v="new">Nowa gra</button></div>`);
  },
  president() {
    const s = Game.s, C = Career.C(), r = Career.me(); UI.close();
    r.club = null; s.mode = 'manager'; s.exRider = { name: r.name, trophies: C.trophies.slice() };
    Club.ensure(s); Game.autoLineup(s.user);
    Game.news(`${r.name}, legenda klubu, zostaje prezesem! Czas budować drużynę mistrzów.`, 'good');
    Game.save(); Tut.hide(); UI.tab = 'pulpit'; UI.show('mgr'); UI.render();
  },
  hofModal() {
    const H = Retire.hof();
    UI.modal(`<div class="row between"><span class="kicker">Galeria sław</span><button class="x" data-ui="close">×</button></div><h2>Legendy</h2>${H.length ? `<table class="small"><tbody>${H.map(h => `<tr><td><b>${esc(h.name)}</b><br><span class="muted">${esc(h.club)} · do ${h.until}</span></td><td class="t-r">${h.seasons} sez.</td><td class="t-r">${h.pts} pkt</td><td class="t-r">${h.trophies.length} 🏆</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Jeszcze pusto.</p>'}<div class="actions"><button class="go" data-ui="close">OK</button></div>`);
  },
};
(() => {
  const bn = Career.newSeason;
  Career.newSeason = function () {
    const r = Career.me(), C = Career.C();
    if (r.age >= 37 || C.history.length >= 20) { Retire.run(true); return; }
    return bn.call(this);
  };
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cRetireAsk') { Retire.run(false); return true; }
    if (d.ui === 'cRetire') { if (d.v === 'president') Retire.president(); else if (d.v === 'hof') Retire.hofModal(); else { UI.close(); Game.wipe(); Main.start(); } return true; }
    if (d.ui === 'cHof') { Retire.hofModal(); return true; }
    return bc.call(this, d);
  };
})();

/* =========================================================
   PORA DNIA NA OSIEDLU, DOJAZD (autobus albo własne auto)
   ========================================================= */
(() => {
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    be.call(this, key);
    if (key !== 'osiedle' || !Game.s || Game.s.mode !== 'career') return;
    const R = World.rooms.osiedle, G = R.group, slot = City.Z().day > 5 ? 2 : City.Z().slot;
    const sky = G.children.find(o => o.geometry && o.geometry.type === 'SphereGeometry');
    const pal = [['#7fa6d8', '#bcd2ea', '#f4e2c4'], ['#6d8fbf', '#a9c0da', '#f0d4b0'], ['#0b1024', '#1b2340', '#3a2f4a']][slot];
    if (sky) { sky.material.map = World.canvasTex(64, 256, g => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, pal[0]); gr.addColorStop(0.45, pal[1]); gr.addColorStop(0.62, pal[2]); gr.addColorStop(0.7, '#555a60'); gr.addColorStop(1, '#303238'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); if (slot === 2) { g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) g.fillRect(Math.random() * 64, Math.random() * 110, 1, 1); } }); sky.material.needsUpdate = true; }
    const [hemi, sun] = G.userData.lights; if (hemi) hemi.intensity = slot === 2 ? 0.22 : 0.75; if (sun) { sun.intensity = slot === 2 ? 0.1 : 0.9; sun.color.set(slot === 1 ? 0xffd0a0 : 0xffe0b8); }
    if (slot === 2) {
      // wieczorem: latarnie i zapalone okna
      for (let i = 0; i < 6; i++) { const p = new THREE.PointLight(0xffd79a, 1.4, 16, 1.6); p.position.set(R.cx - 18 + i * 7.2 + 0.3, World.LOCKER_Y + 5.6, i % 2 ? -12 : 13.4); Rooms.add(p); }
      // okna bloków świecą z tekstur modeli
    }
    // twoje auto na parkingu
    const car = Career.C().car; if (car) Furn.load([car], () => { if (Walk.room !== 'osiedle') return; const g = Furn.place(World.venueGroup, car, R.cx - 20, World.LOCKER_Y, 11, Math.PI / 2, {}); if (g) Rooms.dyn.push(g); });
  };
  // dojazd: krótka animacja autobusu / auta między miejscami
  const ben = City.enter;
  City.enter = function (place) {
    const Z = City.Z(), from = Z.loc, C = Career.C();
    if (from && from !== place && place !== 'tor' && !City._noTravel && C && !C.jail) {
      let ov = document.getElementById('travel'); if (!ov) { ov = document.createElement('div'); ov.id = 'travel'; document.body.appendChild(ov); }
      const car = C.car && Garage.CARS.find(c => c[0] === C.car);
      ov.innerHTML = `<div class="tr-road"><span class="tr-veh">${car ? '🚗' : '🚌'}</span></div><b>${car ? `Jedziesz: ${esc(car[1])}` : 'Autobus linii 7'}</b><small>${esc(City.PLACES[from] ? City.PLACES[from].name : '')} → ${esc(City.PLACES[place].name)}</small>`;
      ov.className = 'on'; setTimeout(() => { ov.className = ''; }, 1500);
      setTimeout(() => ben.call(this, place), 700); return;
    }
    return ben.call(this, place);
  };
})();

/* =========================================================
   DOM RODZINNY: mama, tata, młodszy brat
   ========================================================= */
City.PLACES.rodzice = { name: 'Dom rodzinny', icon: '👪', x: 62, y: 262, c: '#b0784a' };
City.ROOM.rodzice = 'parents';
City.ACTS.rodzice = [
  { id: 'obiad', n: 'Niedzielny obiad u mamy (w tygodniu też!)', d: 'jedzenie +60, stres −10 — za darmo' },
  { id: 'tata', n: 'Rozmowa z tatą w garażu', d: 'psychika w górę, stres −6' },
  { id: 'brat', n: 'Trening z młodszym bratem na minitorze', d: 'brat rośnie jako żużlowiec; ty — stres −4' },
];
(() => {
  const bb = World.buildCityRooms;
  World.buildCityRooms = function () {
    bb.call(this);
    const G = World.roomShell(700, 12, 10, 2.8, { floorTex: 'wood_floor', tint: '#b89870', wallTex: 'yellow_plaster', wallTint: '#efe2c4', lamp: 0xffd8a8, lampI: 0.7, fScale: 2.2, homey: true });
    // meblościanka z PRL i dywan na ścianie — klasyka
    const wood = World.pbr('dark_wooden_planks', 2, 1, { color: '#d09a66' });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 0.5), wood); wall.position.set(-2.4, 1.05, -4.7); wall.userData.solid = true; G.add(wall);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x9fb4c4, metalness: 0.3, roughness: 0.1 })); glass.position.set(-3.3, 1.5, -4.44); G.add(glass);
    const rugTex = World.canvasTex(256, 192, g => { g.fillStyle = '#7a1c1c'; g.fillRect(0, 0, 256, 192); g.strokeStyle = '#d8b060'; g.lineWidth = 6; g.strokeRect(12, 12, 232, 168); for (let i = 0; i < 5; i++) { g.fillStyle = ['#2a3a6a', '#d8b060', '#1c4a2a'][i % 3]; g.beginPath(); g.moveTo(128, 30 + i * 12); g.lineTo(220 - i * 18, 96); g.lineTo(128, 162 - i * 12); g.lineTo(36 + i * 18, 96); g.closePath(); g.fill(); } });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })); rug.position.set(3, 1.6, -4.95); G.add(rug);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ map: World.signTex('Pierwszy motorower 🏍️', '#f4efe2', '#3a2a1a', 256, 190) })); photo.position.set(5.95, 1.7, 0); photo.rotation.y = -Math.PI / 2; G.add(photo);
    World.rooms.parents = { cx: 700, W: 12, D: 10, name: 'Dom rodzinny', exitTo: null, group: G, place: 'rodzice',
      spots: [{ id: 'c:rodzice:obiad', x: -2.5, z: 1.2, label: 'Stół — obiad u mamy' }, { id: 'c:rodzice:tata', x: 3.4, z: 1.6, label: 'Tata — pogadaj' }, { id: 'c:rodzice:brat', x: 2.2, z: -2.4, label: 'Brat — trening na minitorze' }],
      npc: [{ x: -1.6, z: 0.4, face: 0, key: 'Female_Adult_09', pose: 'sit' }, { x: 3.6, z: 0.95, face: Math.PI / 2, key: 'Male_Adult_18', pose: 'sit' }, { x: 2.2, z: -3.2, face: 0, key: 'Male_Adult_05', pose: 'laugh' }], crowd: [] };
    Object.assign(Rooms.FURN, { parents: [['diningRound', -2.5, 0, 0.4, 0, {}], ['diningChair', -1.6, 0, 0.4, -Math.PI / 2, {}], ['diningChair', -3.4, 0, 0.4, Math.PI / 2, {}], ['sofa', 3.6, 0, 0.9, Math.PI, {}], ['tvCabinet', 3.6, 0, -4.6, 0, {}], ['tvModern', 3.6, 'top:tvCabinet', -4.6, 0, {}], ['plant2', 5.4, 0, -4.3, 0, {}], ['plantTall', -5.4, 0, 4.2, 0, {}], ['armchair', 5.2, 0, 2.4, -Math.PI / 2, {}], ['wallClock', -0.4, 2.1, -4.95, 0, {}]] });
  };
  const ba = City.act;
  City.act = function (place, id) {
    if (place !== 'rodzice') return ba.call(this, place, id);
    const C = Career.C(), Z = City.Z(); if (C.jail > 0) { UI.toast('Siedzisz w areszcie.', true); return; }
    if (City.weekDone()) { UI.toast('Tydzień dobiegł końca — kliknij „Zakończ tydzień”.', true); return; }
    if (!City.gate('r_' + id)) return; Z.loc = 'rodzice';
    let msg = '';
    if (id === 'obiad') { Z.food += 60; Z.stress -= 10; Career.mor(2); msg = Crowd.pick(['Rosół, schabowy, kompot. Mama pakuje ci słoiki na cały tydzień.', 'Pierogi ruskie i pytanie: „A kiedy jakaś dziewczyna?”', 'Gołąbki i sernik. Jedzenie +60.']); }
    if (id === 'tata') { Z.stress -= 6; msg = (Career.grow('mental', 0.15) || '') + ' ' + Crowd.pick(['„Pamiętaj: pierwszy łuk wygrywasz głową, nie gazem.”', '„Jestem z ciebie dumny, synu.”', '„Za moich czasów jeździło się na Jawie z ramą z rur wodociągowych!”']); }
    if (id === 'brat') {
      const b = C.bro = C.bro || { name: 'Kacper', skill: 0, licence: false }; b.skill += 1; Z.stress -= 4; Z.energy -= 6;
      msg = `${b.name} (14 lat) na minitorze: ${b.skill < 4 ? 'jeszcze boi się gazu w łuku' : b.skill < 8 ? 'coraz śmielej składa się w łuk' : 'jedzie jak mały mistrz!'} (postęp ${b.skill}/10).`;
      if (b.skill >= 10 && !b.licence) { b.licence = true; const me = Career.me(); const jr = Game.addRider(Game.genRider(Game.club(Game.s.user).base - 4.5, { club: Game.s.user, age: 16, nat: 'POL' })); jr.name = `${b.name} ${me.name.split(' ').slice(-1)[0]}`; jr.pot = 17; Game.news(`${jr.name}, młodszy brat ${me.name}, zdaje licencję żużlową i podpisuje kontrakt juniorski!`, 'good'); msg += ' Zdał licencję! Jedziecie razem w drużynie.'; Career.mor(8); }
    }
    City.pay(Z, { n: City.ACTS.rodzice.find(a => a.id === id).n }, msg);
  };
  // mapa: szpilka domu rodzinnego jest już w PLACES (droga do Parkowej)
  const bm = City.mapSvg;
  City.mapSvg = function () { const Z = City.Z(), night = (Z.day > 5 ? 2 : Z.slot) === 2; const road = night ? '#3a4455' : '#ffffff', cas = night ? '#262d39' : '#c9ccc4'; return bm.call(this).replace('<g class="prl">', `<path d="M62 262 L135 320" stroke="${cas}" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M62 262 L135 320" stroke="${road}" stroke-width="11" fill="none" stroke-linecap="round"/><g class="prl">`); };
})();

/* =========================================================
   PIES W MIESZKANIU
   ========================================================= */
Career.DECOR.dog = { name: 'Pies ze schroniska (Burek)', price: 2500, comfort: 6, note: 'spacery = mniej stresu; zaniedbany — smutny' };
(() => {
  const bf = Career.furnish;
  Career.furnish = function (R, spots) {
    bf.call(this, R, spots);
    if (!Career.has('dog')) return;
    Furn.load(['dog'], () => { if (Walk.room !== 'home') return; const g = Furn.place(World.venueGroup, 'dog', R.cx + 0.6, World.LOCKER_Y, -2.8, 0.6, { w: 0.9 }); if (g) Rooms.dyn.push(g); });
    spots.push({ id: 'h:dog', x: R.cx + 0.6, z: -2.0, label: 'Burek — wyjdź z psem na spacer', r: 1.4 });
  };
  const bra = Career.roomAct;
  Career.roomAct = function (id) {
    if (id !== 'h:dog') return bra.call(this, id);
    const Z = City.Z(), C = Career.C(); if (!City.gate('dog')) return true;
    C.dogWalk = City.stamp(); Z.stress -= 8; Z.energy -= 3; City.clamp(Z); Game.save();
    UI.toast(Crowd.pick(['Burek ciągnie do każdego drzewa. Stres −8.', 'Sąsiadka z trzeciego piętra: „Jaki piękny piesek!” Stres −8.', 'Aport patykiem w parku. Burek szczęśliwy, ty też. Stres −8.']));
    return true;
  };
  const be = City.endDay;
  City.endDay = function (auto) {
    const Z = City.Z(), C = Career.C(), d0 = Z.day; be.call(this, auto);
    if (Z.day !== d0 && Career.has('dog') && C.dogWalk != null && City.stamp() - C.dogWalk >= 2) { Z.stress += 4; City.clamp(Z); if (auto) UI.toast('Burek piszczy pod drzwiami — dawno nie był na spacerze (stres +4).', true); }
  };
})();

/* =========================================================
   SAMOCHÓD, INWESTYCJE, PODATKI
   ========================================================= */
const Garage = {
  // [model, nazwa, cena, energia/tydz., reputacja przy zakupie]
  CARS: [['hatch3', 'Używany hatchback', 18000, 3, 0], ['estate', 'Kombi z hakiem na przyczepkę', 42000, 5, 1], ['suvmid', 'SUV', 95000, 6, 3], ['coupe', 'Sportowe coupé', 180000, 6, 6]],
  buy(k) {
    const C = Career.C(), c = Garage.CARS.find(x => x[0] === k); if (!c) return;
    const old = C.car && Garage.CARS.find(x => x[0] === C.car), resale = old ? Math.round(old[2] * 0.55) : 0;
    if (C.money + resale < c[2]) { UI.toast('Za mało pieniędzy.', true); return; }
    if (old) Career.pay(resale, `Sprzedaż: ${old[1]}`);
    Career.pay(-c[2], `Samochód: ${c[1]}`); C.car = k; Career.repd(c[4]); Game.news(`${Career.me().name} kupuje ${c[1].toLowerCase()}.`, 'info'); Game.save(); Career.render();
  },
};
Career.EV.speeding = {
  t: 'Fotoradar', when: () => ['coupe', 'suvmid'].includes(Career.C().car),
  x: 'Wracasz nocą z treningu pustą obwodnicą. Twoje auto aż prosi o gaz…',
  o: [['Jadę przepisowo', () => 'Dojechałeś spokojnie. Nudno, ale bezpiecznie.'], ['Tylko kawałek na pełnym gazie', () => { if (Math.random() < 0.45) { Career.pay(-2500, 'Mandat — prędkość'); Career.repd(-4); return 'Błysk fotoradaru i patrol za zakrętem. Mandat 2500 zł, a zdjęcie trafia do mediów (reputacja −4).'; } Career.mor(3); return 'Adrenalina jak pod taśmą. Nikt nie widział… tym razem.'; }]],
};
const Biz = {
  INV: { school: { n: 'Szkółka żużlowa dla dzieci', price: 150000, inc: C => 1800 + C.rep * 20, d: 'co tydzień przychód, reputacja rośnie' }, shop: { n: 'Sklep z gadżetami (koszulki, czapki)', price: 60000, inc: C => 300 + C.rep * 28 + Math.round((C.city && C.city.followers || 800) / 400), d: 'przychód zależy od reputacji i obserwujących' } },
  week() {
    const C = Career.C(); C.biz = C.biz || {};
    Object.entries(Biz.INV).forEach(([k, b]) => { if (C.biz[k]) { const v = Math.round(b.inc(C)); Career.pay(v, b.n); if (k === 'school' && Game.s.week % 4 === 0) Career.repd(1); } });
    if (C.accountant) Career.pay(-800, 'Księgowa');
    if (C.car) { const c = Garage.CARS.find(x => x[0] === C.car); if (c && C.city) { C.city.energy += c[3]; City.clamp(C.city); } }
  },
  buy(k) { const C = Career.C(), b = Biz.INV[k]; C.biz = C.biz || {}; if (C.biz[k] || C.money < b.price) { UI.toast('Za mało pieniędzy.', true); return; } Career.pay(-b.price, `Inwestycja: ${b.n}`); C.biz[k] = true; Game.news(`${Career.me().name} otwiera: ${b.n}.`, 'good'); Game.save(); Career.render(); },
  taxRate() { return Career.C().accountant ? 0.12 : 0.19; },
  /** Rozliczenie podatku po sezonie */
  settle() {
    const C = Career.C(), inc = C.taxIncome || 0, tax = Math.round(inc * Biz.taxRate()); C.taxIncome = 0;
    if (tax <= 0) return;
    Career.pay(-tax, `Podatek dochodowy za sezon (${Math.round(Biz.taxRate() * 100)}%)`);
    let msg = `Podatek za sezon: ${tax.toLocaleString('pl-PL')} zł${C.accountant ? ' (księgowa znalazła ulgi)' : ''}.`;
    if (!C.accountant && Math.random() < 0.25) { const fine = Math.round(tax * 0.2); Career.pay(-fine, 'Kontrola skarbowa — odsetki'); msg += ` Kontrola skarbowa: błędy w zeznaniu, odsetki ${fine.toLocaleString('pl-PL')} zł.`; if (C.city) C.city.stress += 10; }
    Game.news(msg, 'info');
  },
};
(() => {
  const bse = Career.seasonEnd;
  Career.seasonEnd = function () { const r = bse.call(this); Biz.settle(); return r; };
  const bc = Career.click;
  Career.click = function (d) {
    switch (d.ui) {
      case 'cCar': Garage.buy(d.v); return true;
      case 'cBiz': Biz.buy(d.v); return true;
      case 'cAcc': { const C = Career.C(); C.accountant = !C.accountant; Game.save(); Career.render(); return true; }
    }
    return bc.call(this, d);
  };
  // zakładka Kariera: biznes, auto, drużyna, emerytura
  const bk = Career.views.kkariera;
  Career.views.kkariera = function () {
    const C = Career.C(), r = Career.me(); C.biz = C.biz || {};
    const card = (h, body) => `<div class="card s6"><h3>${h}</h3>${body}</div>`;
    let x = '<div class="grid">';
    x += card('💼 Biznes i podatki', Object.entries(Biz.INV).map(([k, b]) => `<div class="sp-row"><div><b>${esc(b.n)}</b><small>${esc(b.d)}${C.biz[k] ? ` · teraz ok. ${Math.round(b.inc(C)).toLocaleString('pl-PL')} zł/tydz.` : ''}</small></div>${C.biz[k] ? '<span class="good">✓ twoje</span>' : `<button class="go small" data-ui="cBiz" data-v="${k}" ${C.money < b.price ? 'disabled' : ''}>${b.price.toLocaleString('pl-PL')} zł</button>`}</div>`).join('')
      + `<p class="small">Dochód w sezonie: <b>${(C.taxIncome || 0).toLocaleString('pl-PL')} zł</b> · podatek po sezonie ok. <b>${Math.round((C.taxIncome || 0) * Biz.taxRate()).toLocaleString('pl-PL')} zł</b> (${Math.round(Biz.taxRate() * 100)}%)</p>
      <label class="toggle"><input type="checkbox" data-ui="cAcc" ${C.accountant ? 'checked' : ''}> Księgowa (800 zł/tydz.): podatek 12% zamiast 19%, bez kontroli skarbowej</label>`);
    x += card('🚗 Samochód', `${C.car ? `<p>Masz: <b>${esc(Garage.CARS.find(c => c[0] === C.car)[1])}</b></p>` : '<p class="small muted">Jeździsz autobusem. Auto = mniej zmęczenia (energia co tydzień) i prestiż.</p>'}` + Garage.CARS.filter(c => c[0] !== C.car).map(c => `<div class="sp-row"><div><b>${esc(c[1])}</b><small>energia +${c[3]}/tydz.${c[4] ? ` · reputacja +${c[4]}` : ''}</small></div><button class="ghost small" data-ui="cCar" data-v="${c[0]}">${c[2].toLocaleString('pl-PL')} zł</button></div>`).join(''));
    const mates = Team.mates().sort((a, b) => b.rel - a.rel), cap = Team.captain();
    x += card('👥 Drużyna i szatnia', `<p class="small">Kapitan: <b>${esc(cap ? cap.name : '—')}</b> · atmosfera ${Math.round(Team.avg())}%</p>${mates.slice(0, 7).map(m => `<div class="kv"><span>${esc(m.r.name)}</span>${UI.bar(m.rel, 100, m.rel < 30 ? 'bad' : '')}<b>${Math.round(m.rel)}</b></div>`).join('')}<button class="ghost small" data-ui="cTeamDinner" ${C.teamDinner === Game.s.week ? 'disabled' : ''}>Postaw kolację drużynie (1500 zł)</button>`);
    x += card('🏁 Przyszłość', `<p class="small">Wiek ${r.age} · sezonów w karierze: ${C.history.length}. Kariera kończy się najpóźniej w wieku 37 lat.</p>${r.age >= 30 ? '<button class="ghost small" data-ui="cRetireAsk">Zakończ karierę teraz</button>' : ''} <button class="ghost small" data-ui="cHof">Galeria sław</button>`);
    return bk.call(this) + x + '</div>';
  };
  // checkbox księgowej (zdarzenie change nie trafia do Career.click) — obsługa kliknięcia
  document.addEventListener('change', e => { const t = e.target.closest && e.target.closest('input[data-ui="cAcc"]'); if (t && Game.s && Game.s.mode === 'career') { Career.C().accountant = t.checked; Game.save(); } });
})();

/* =========================================================
   TRYB FOTO
   ========================================================= */
const Photo = {
  shoot() {
    if (!World.renderer) return;
    document.body.classList.add('photo');
    setTimeout(() => {
      try { World.render(); } catch (e) { }
      World.renderer.domElement.toBlob(b => {
        document.body.classList.remove('photo'); if (!b) return;
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `speedway-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        UI.toast('📷 Zdjęcie zapisane w folderze Pobrane.');
      }, 'image/png');
    }, 60);
  },
};
window.addEventListener('load', () => {
  const b = document.createElement('button'); b.id = 'photobtn'; b.title = 'Tryb foto (F8)'; b.textContent = '📷'; document.body.appendChild(b);
  b.addEventListener('click', e => { e.stopPropagation(); Photo.shoot(); });
  const upd = () => { b.hidden = document.getElementById('md').hidden; }; upd(); new MutationObserver(upd).observe(document.getElementById('md'), { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('keydown', e => { if (e.code === 'F8') { e.preventDefault(); Photo.shoot(); } });
  // PWA: instalacja jako aplikacja (działa na localhost i pod https)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
}, { once: true });

/* Pocałunek na randce (efekt serc — w bibliotece Rocketbox nie ma animacji pocałunku) */
(() => {
  const bd = City.dateAct;
  City.dateAct = function (k) {
    const Z = City.Z(), G = Z.gf;
    if (k === 'kiss') {
      UI.close(); if (!G) return; if (!City.gate('kiss')) return;
      G.rel = Math.min(100, G.rel + 5); Z.stress -= 5; City.clamp(Z); Game.save();
      let fx = document.getElementById('kissfx'); if (!fx) { fx = document.createElement('div'); fx.id = 'kissfx'; document.body.appendChild(fx); }
      fx.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="left:${10 + Math.random() * 80}%;animation-delay:${(i * 0.08).toFixed(2)}s">❤</i>`).join('') + `<b>${esc(G.name)} ❤</b>`;
      fx.className = 'on'; setTimeout(() => { fx.className = ''; }, 2400);
      UI.toast(`${G.name} uśmiecha się i całuje cię w policzek… a potem nie tylko w policzek. Związek +5.`);
      return;
    }
    const r = bd.call(this, k);
    if (k === 'talk' && G && G.rel >= 50) { const box = document.querySelector('#modal .talk-opts'); if (box && !box.querySelector('[data-v="kiss"]')) box.insertAdjacentHTML('afterbegin', `<button class="opt" data-ui="cityDate" data-v="kiss" ${City.canDo('kiss').ok ? '' : 'disabled'}>💋 Pocałuj ją</button>`); }
    return r;
  };
})();
