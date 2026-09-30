/* =========================================================
   Speedway Empire 3D — klub poza torem (GDD rozdz. 4.4, 5, 6.2)
   • Stadion i obiekty: 8 inwestycji po 5 poziomów, budowa trwa
     kilka tygodni (jedna ekipa naraz), każda ma utrzymanie
     i konkretny wpływ na grę.
   • Sponsorzy z celami: tytularny, na kevlarach, 3 bandy.
     Tygodniowa wpłata + premia za cel na koniec sezonu.
     Bandy sponsorów widać na torze w meczach u siebie.
   • Szkółka (akademia): co sezon nabór juniorów; jakość
     zależy od poziomu szkółki. Podpisanie = zawodnik w kadrze.
   • Bilety: cena wpływa na frekwencję; frekwencję widać
     na trybunach w 3D.
   ========================================================= */
'use strict';

const Club = {
  FAC: {
    stands:  { name: 'Trybuny', icon: 'M3 20h18M5 20V12l7-4 7 4v8M9 20v-5h6v5', base: 900000, upkeep: 6000,
      eff: l => `pojemność ${Club.capacity(null, l).toLocaleString('pl-PL')} miejsc` },
    lights:  { name: 'Oświetlenie', icon: 'M12 2v4M5 5l2.5 2.5M19 5l-2.5 2.5M8 14a4 4 0 1 1 8 0c0 2-2 3-2 5h-4c0-2-2-3-2-5z', base: 700000, upkeep: 5000,
      eff: l => `prawa TV +${Math.round((l - 1) * 12)}%, jaśniejszy tor wieczorem` },
    pits:    { name: 'Warsztat i park maszyn', icon: 'M14 6l4 4-8 8H6v-4zM3 21h18', base: 650000, upkeep: 5000,
      eff: l => `silniki: prędkość +${num((l - 1) * 0.25, 2)}, start +${num((l - 1) * 0.15, 2)}` },
    parking: { name: 'Parking i dojazd', icon: 'M5 21V4h7a5 5 0 0 1 0 10H5', base: 400000, upkeep: 2500,
      eff: l => `frekwencja +${(l - 1) * 4}%` },
    shop:    { name: 'Sklep kibica', icon: 'M4 8h16l-1 12H5zM9 8a3 3 0 0 1 6 0', base: 300000, upkeep: 2000,
      eff: l => l ? `gadżety: ok. ${Math.round(3.5 * l)} zł od kibica na meczu` : 'brak sprzedaży gadżetów' },
    academy: { name: 'Szkółka żużlowa', icon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5', base: 550000, upkeep: 4000,
      eff: l => `nabór: ${Club.intake(l)} juniorów/sezon, potencjał do ${Math.round(9 + l * 1.8)}` },
    gym:     { name: 'Centrum treningowe', icon: 'M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12', base: 600000, upkeep: 4500,
      eff: l => `postępy na treningach +${(l - 1) * 10}%` },
    medic:   { name: 'Centrum medyczne', icon: 'M12 5v14M5 12h14', base: 500000, upkeep: 4000,
      eff: l => l ? `szybszy powrót po urazach (${l * 20}%/tydz.), regeneracja +${l * 2}` : 'leczenie poza klubem' },
  },
  MAXL: 5,

  POOL: [
    { text: 'BUDMAR', bg: '#2F3A4A', fg: '#F2C230' }, { text: 'MLECZARNIA ZAGRODA', bg: '#F5F2EA', fg: '#1F6FB5' },
    { text: 'TRANS-KOLEJ', bg: '#8E1D22', fg: '#FFFFFF' }, { text: 'PIEKARNIA ŁAN', bg: '#E8B54B', fg: '#3A2410' },
    { text: 'STAL-HURT', bg: '#50565E', fg: '#FFFFFF' }, { text: 'AGRO-WIS', bg: '#2E7D32', fg: '#F7F3E3' },
    { text: 'NET-FALA', bg: '#5B2A86', fg: '#FFFFFF' }, { text: 'KANTOR MIEDZIAK', bg: '#B8642B', fg: '#FFFFFF' },
    { text: 'OKNA-TERM', bg: '#FFFFFF', fg: '#0E7C86' }, { text: 'BROWAR KORMORAN', bg: '#1C1C1C', fg: '#E8B54B' },
  ],
  SLOTS: { main: { name: 'Sponsor tytularny', n: 1, w: [95000, 150000] }, kevlar: { name: 'Na kevlarach', n: 1, w: [45000, 75000] }, board: { name: 'Banda', n: 3, w: [12000, 26000] } },

  /* ---------- stan w zapisie ---------- */
  init(s) {
    s.club = {
      fac: { stands: 1, lights: 2, pits: 1, parking: 1, shop: 0, academy: 1, gym: 1, medic: 0 },
      build: null, ticket: DATA.FINANCE.ticket, att: [], sponsors: [], offers: [], prospects: [],
    };
    Club.makeOffers(s);
    Club.intakeNow(s, true);
    return s.club;
  },
  ensure(s) { if (!s.club) Club.init(s); return s.club; },
  /* ---------- edytor stadionu ---------- */
  LOOK: {
    seats: { name: 'Krzesełka', cost: 250000, opts: { club: 'Barwy + skrót klubu', plain: 'Jednolite w barwach', stripes: 'Pasy w dwóch barwach', mix: 'Kolorowa mozaika', grey: 'Szare' } },
    facade: { name: 'Elewacja trybun', cost: 400000, opts: { concrete: 'Surowy beton', white: 'Jasny tynk', brick: 'Cegła', club: 'W barwach klubu' } },
    fence: { name: 'Bandy', cost: 600000, opts: { classic: 'Deski + dmuchane na łukach', air: 'Dmuchane dookoła toru' } },
    roofMain: { name: 'Dach nad trybuną główną', cost: 1800000, opts: { on: 'Jest', off: 'Brak' } },
    back: { name: 'Trybuna naprzeciwko', cost: 2500000, opts: { stand: 'Jest', none: 'Brak' } },
    roofBack: { name: 'Dach nad trybuną naprzeciwko', cost: 1200000, opts: { on: 'Jest', off: 'Brak' }, need: E => !!E.back },
    bend0: { name: 'Łuk za metą (strona wirażu I)', cost: 1300000, opts: { none: 'Pusto', bank: 'Nasyp do stania', terrace: 'Trybuna z krzesełkami' } },
    bend1: { name: 'Łuk od parku maszyn', cost: 1300000, opts: { none: 'Pusto', bank: 'Nasyp do stania', terrace: 'Trybuna z krzesełkami' } },
  },
  lookFor(id) { return Game.s && id === Game.s.user && Game.s.club ? (Game.s.club.look || {}) : {}; },
  /** Jak wygląda stadion teraz (projekt + rozbudowa + edytor) */
  effLook() {
    const s = Game.s, idx = +String(s.user).slice(1) || 0;
    return World.effVenue(DATA.VENUES[idx] || DATA.VENUES[0], s.club.fac, s.club.look || {});
  },
  curLook(k, E) {
    if (k === 'seats' || k === 'facade' || k === 'fence') return E[k];
    if (k === 'roofMain') return E.main.roof ? 'on' : 'off';
    if (k === 'roofBack') return E.back && E.back.roof ? 'on' : 'off';
    if (k === 'back') return E.back ? 'stand' : 'none';
    return E.bends[+k.slice(4)];
  },
  /** Dodatkowe miejsca z przebudowy w edytorze (względem projektu) */
  lookCap() {
    const s = Game.s; if (!s || !s.club) return 0;
    const idx = +String(s.user).slice(1) || 0, V = DATA.VENUES[idx] || DATA.VENUES[0], E = Club.effLook(), B = World.effVenue(V, s.club.fac, {});
    const bv = b => ({ none: 0, bank: 900, terrace: 1700 }[b] || 0);
    return (E.back ? 2600 : 0) - (B.back ? 2600 : 0) + E.bends.reduce((a, b, i) => a + bv(b) - bv(B.bends[i]), 0);
  },
  setLook(k, v) {
    const s = Game.s, C = s.club, L = Club.LOOK[k], E = Club.effLook();
    if (Club.curLook(k, E) === v) return { ok: false, msg: 'Tak już jest.' };
    if (s.finance.balance < L.cost) return { ok: false, msg: 'Za mało pieniędzy na koncie.' };
    Game.tx('exp', 'Inwestycje', L.cost);
    const look = C.look = C.look || {};
    if (k === 'roofMain' || k === 'roofBack') look[k] = v === 'on';
    else if (k.startsWith('bend')) { look.bends = look.bends || [null, null]; look.bends[+k.slice(4)] = v; }
    else look[k] = v;
    Game.news(`Stadion: ${L.name} — ${L.opts[v]}.`, 'info');
    return { ok: true, msg: `${L.name}: ${L.opts[v]} (${money(L.cost)}). Zobacz na stadionie!` };
  },
  viewLook() {
    const E = Club.effLook();
    const rows = Object.entries(Club.LOOK).filter(([, L]) => !L.need || L.need(E)).map(([k, L]) => {
      const cur = Club.curLook(k, E);
      return `<div class="look-row"><div><b>${L.name}</b><small class="muted"> · zmiana ${money(L.cost)}</small></div><div class="look-opts">${Object.entries(L.opts).map(([v, t]) =>
        `<button class="ghost small ${cur === v ? 'on' : ''}" data-ui="look" data-k="${k}" data-v="${v}" ${cur === v ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>`;
    }).join('');
    return `<div class="card look"><div class="row between"><h3>Edytor stadionu</h3><button class="small" data-ui="walk">Zobacz na stadionie 🚶</button></div>
      <p class="muted small">Wygląd zmienia się też sam z rozbudową: trybuny poziom 3 — dach i trybuna naprzeciwko, 4 — dach nad nią i nasypy na łukach, 5 — łuki z krzesełkami; oświetlenie — więcej masztów i jaśniejszy tor.</p>${rows}</div>`;
  },

  /** Poziomy obiektów dowolnego klubu: gracz — z inwestycji, rywale — z „siły” klubu */
  facFor(id) {
    if (Game.s && id === Game.s.user && Game.s.club) return { ...Game.s.club.fac };
    const c = Game.s ? Game.club(id) : null, l = c ? R.clamp(Math.round(c.base - 11.4), 1, 4) : 2;
    return { stands: l, lights: l, pits: l, parking: l, shop: 1, academy: l, gym: l, medic: 1 };
  },
  lvl: k => (Game.s && Game.s.club ? Game.s.club.fac[k] : 1),

  /* ---------- efekty ---------- */
  capacity(c, l) {
    const base = c ? c.cap : Game.club(Game.s.user).cap;
    return base + ((l != null ? l : Club.lvl('stands')) - 1) * 1500 + (!c || (Game.s && c.id === Game.s.user) ? Club.lookCap() : 0);
  },
  intake: l => (l <= 0 ? 0 : 1 + Math.floor(l / 2)),
  tvMul: () => 1 + (Club.lvl('lights') - 1) * 0.12,
  trainMul: () => 1 + (Club.lvl('gym') - 1) * 0.1,
  /** Poprawki do efektywnych atrybutów zawodników gracza (warsztat: lepiej przygotowane silniki) */
  effBonus(r, out) {
    if (Game.s && Game.s.mode === 'career') Career.effMods(r, out);
    if (!Game.s || !Game.s.club || r.club !== Game.s.user) return;
    const l = Club.lvl('pits') - 1;
    out.speed = R.clamp(out.speed + l * 0.25, 1, 20);
    out.start = R.clamp(out.start + l * 0.15, 1, 20);
    const B = Game.s.boost; // silniki przygotowane pod mecz (warsztat albo „dodatek” do paliwa)
    if (B && B.week === Game.s.week) { out.speed = R.clamp(out.speed + B.speed, 1, 20); out.start = R.clamp(out.start + B.start, 1, 20); }
  },

  /** Frekwencja meczu u siebie: popularność, forma, pogoda, cena biletu, parking, oświetlenie */
  attendance(c, cond) {
    const s = Game.s, mine = c.id === s.user;
    const form = c.last.filter(x => x === 'W').length / Math.max(1, c.last.length);
    let fill = 0.4 + (mine ? s.popularity : 50) / 200 + form * 0.2 - (cond && cond.weather === 'rain' ? 0.15 : 0);
    if (mine) {
      fill += (Club.lvl('parking') - 1) * 0.04 + (Club.lvl('lights') - 1) * 0.02;
      fill -= (s.club.ticket - DATA.FINANCE.ticket) / 220;
    }
    fill = R.clamp(fill, 0.18, 1);
    const cap = mine ? Club.capacity(c) : c.cap;
    return { att: Math.round(cap * fill), cap, fill };
  },

  /** Wpływy z meczu u siebie (bilety + gadżety) — wołane z Game.applyMatch */
  homeGate(c, m) {
    const s = Game.s, A = Club.attendance(c, m.cond);
    Game.tx('inc', 'Bilety', A.att * s.club.ticket);
    const shop = Club.lvl('shop');
    if (shop) Game.tx('inc', 'Sklep kibica', A.att * 3.5 * shop);
    s.club.att.push(A.att); s.club.att = s.club.att.slice(-20);
    m.attendance = A.att;
  },

  /* ---------- tydzień ---------- */
  weekly(rep) {
    const s = Game.s, C = s.club;
    // wpływy: sponsorzy z umów + drobni sponsorzy, TV zależna od oświetlenia
    Game.tx('inc', 'Sponsorzy drobni', 40000);
    C.sponsors.forEach(sp => Game.tx('inc', `Sponsor: ${sp.text}`, sp.weekly));
    Game.tx('inc', 'Prawa TV', DATA.FINANCE.tvWeekly * Club.tvMul());
    // utrzymanie obiektów
    const up = Object.entries(C.fac).reduce((a, [k, l]) => a + Club.FAC[k].upkeep * l, 0);
    Game.tx('exp', 'Utrzymanie obiektów', up);
    // budowa
    if (C.build) {
      C.build.left--;
      if (C.build.left <= 0) {
        C.fac[C.build.key]++;
        const F = Club.FAC[C.build.key];
        Game.news(`Oddano do użytku: ${F.name}, poziom ${C.fac[C.build.key]}. ${F.eff(C.fac[C.build.key])}.`, 'good');
        rep.built = F.name;
        s.popularity = R.clamp(s.popularity + 1.5, 0, 100);
        C.build = null;
      }
    }
    // centrum medyczne i sklep
    const med = Club.lvl('medic');
    Game.roster(s.user).forEach(r => {
      if (r.injury > 0 && Math.random() < med * 0.2) r.injury--;
      r.fatigue = R.clamp(r.fatigue - med * 2, 0, 100);
    });
    // wychowankowie w szkółce rosną powoli sami
    C.prospects.forEach(p => { Game.ATTRS.forEach(k => { if (k !== 'risk' && p.a[k] < p.pot && Math.random() < 0.06) p.a[k]++; }); });
  },

  /* ---------- inwestycje ---------- */
  cost(k) { const l = Club.lvl(k); return Math.round(Club.FAC[k].base * Math.pow(1.55, l) / 10000) * 10000; },
  weeks: k => 2 + Club.lvl(k),
  startBuild(k) {
    const s = Game.s, C = s.club, F = Club.FAC[k];
    if (C.build) return { ok: false, msg: 'Ekipa budowlana jest zajęta — jedna inwestycja naraz.' };
    if (C.fac[k] >= Club.MAXL) return { ok: false, msg: `${F.name}: już najwyższy poziom.` };
    const cost = Club.cost(k);
    if (s.finance.balance < cost) return { ok: false, msg: 'Za mało pieniędzy na koncie.' };
    Game.tx('exp', 'Inwestycje', cost);
    C.build = { key: k, left: Club.weeks(k), total: Club.weeks(k) };
    Game.news(`Rusza budowa: ${F.name} (poziom ${C.fac[k] + 1}), ${C.build.left} tyg.`, 'info');
    return { ok: true, msg: `Budowa rozpoczęta: ${F.name}. Plac budowy już widać na stadionie (🚶 Stadion), obiekt będzie gotowy za ${C.build.left} tyg.` };
  },

  /* ---------- sponsorzy ---------- */
  GOALS: {
    place: (t) => ({ text: `miejsce w top ${t} po rundzie zasadniczej`, check: () => Game.standings().findIndex(c => c.id === Game.s.user) + 1 <= t }),
    wins: (t) => ({ text: `co najmniej ${t} wygranych w lidze`, check: () => Game.club(Game.s.user).st.w >= t }),
    att: (t) => ({ text: `średnia frekwencja ${t.toLocaleString('pl-PL')}+`, check: () => Club.avgAtt() >= t }),
    pop: (t) => ({ text: `popularność klubu ${t}+`, check: () => Game.s.popularity >= t }),
  },
  goal(o) { return Club.GOALS[o.goal.type](o.goal.t); },
  avgAtt() { const a = Game.s.club.att; return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0; },

  makeOffers(s) {
    const C = s.club, taken = new Set(C.sponsors.map(x => x.text));
    const pool = Club.POOL.concat(DATA.SPONSORS).filter(p => !taken.has(p.text)).sort(() => Math.random() - 0.5);
    const pop = s.popularity / 50; // 1 = przeciętny klub
    const cap = Club.capacity(Game.club(s.user));
    C.offers = [];
    const add = (slot, k) => {
      const [a, b] = Club.SLOTS[slot].w, p = pool.shift();
      if (!p) return;
      const types = ['place', 'wins', 'att', 'pop'], type = types[(k + R.int(0, 3)) % 4];
      const t = type === 'place' ? R.int(3, 6) : type === 'wins' ? R.int(5, 9) : type === 'att' ? Math.round(cap * (0.55 + Math.random() * 0.25) / 100) * 100 : R.int(52, 70);
      const hard = type === 'place' ? (7 - t) / 4 : type === 'wins' ? (t - 4) / 5 : type === 'att' ? 0.6 : (t - 50) / 20;
      const weekly = Math.round((a + (b - a) * Math.random()) * (0.8 + pop * 0.2) * (0.85 + hard * 0.3) / 1000) * 1000;
      C.offers.push({ id: R.uid('sp'), slot, text: p.text, bg: p.bg, fg: p.fg, weekly, bonus: Math.round(weekly * (5 + hard * 4) / 1000) * 1000, goal: { type, t } });
    };
    add('main', 0); add('main', 1); add('kevlar', 2); add('kevlar', 3);
    for (let i = 0; i < 4; i++) add('board', i);
  },
  used(slot) { return Game.s.club.sponsors.filter(x => x.slot === slot).length; },
  signSponsor(id) {
    const C = Game.s.club, o = C.offers.find(x => x.id === id);
    if (!o) return { ok: false, msg: 'Oferta nieaktualna.' };
    if (Club.used(o.slot) >= Club.SLOTS[o.slot].n) return { ok: false, msg: `Miejsce „${Club.SLOTS[o.slot].name}” jest już zajęte.` };
    C.sponsors.push(o); C.offers = C.offers.filter(x => x !== o);
    Game.news(`Umowa sponsorska: ${o.text} (${Club.SLOTS[o.slot].name.toLowerCase()}), ${money(o.weekly)}/tydz.`, 'good');
    return { ok: true, msg: `${o.text} podpisany.` };
  },
  dropSponsor(id) {
    const C = Game.s.club, o = C.sponsors.find(x => x.id === id);
    if (!o) return { ok: false, msg: '' };
    C.sponsors = C.sponsors.filter(x => x !== o);
    Game.tx('exp', 'Kary umowne', o.weekly * 4);
    Game.s.popularity = R.clamp(Game.s.popularity - 2, 0, 100);
    return { ok: true, msg: `Zerwano umowę z ${o.text} (kara ${money(o.weekly * 4)}).` };
  },

  /* ---------- szkółka ---------- */
  intakeNow(s, first) {
    const C = s.club, l = C.fac.academy, n = Club.intake(l);
    for (let i = 0; i < n; i++) {
      const p = Game.genRider(4 + l * 1.3 + Math.random() * 2, { club: null, age: R.int(16, 17), nat: 'POL' });
      p.pot = R.clamp(Math.round(9 + l * 1.8 * (0.6 + Math.random() * 0.4) + R.int(-1, 2)), 8, 20);
      p.pot = Math.max(p.pot, Math.ceil(Game.ovr(p)));
      p.ksm = Math.round((2.5 + Math.random() * 1.5) * 100) / 100;
      C.prospects.push(p);
    }
    if (!first && n) Game.news(`Nabór do szkółki: ${n} ${n === 1 ? 'junior' : 'juniorów'}. Zajrzyj do zakładki Szkółka.`, 'info');
  },
  signProspect(id) {
    const s = Game.s, C = s.club, p = C.prospects.find(x => x.id === id);
    if (!p) return { ok: false, msg: '' };
    if (Game.roster(s.user).length >= DATA.ROSTER_MAX) return { ok: false, msg: `Kadra pełna (${DATA.ROSTER_MAX}).` };
    p.club = s.user; p.contract = { years: 3, sign: 20000, perPoint: 900 };
    Game.addRider(p); s.training.plan[p.id] = Game.suggestBlock(p);
    C.prospects = C.prospects.filter(x => x !== p);
    Game.news(`${p.name} (${p.age} l.) podpisuje pierwszy kontrakt — wychowanek szkółki.`, 'good');
    s.popularity = R.clamp(s.popularity + 1, 0, 100);
    return { ok: true, msg: `${p.name} w kadrze.` };
  },
  dropProspect(id) { const C = Game.s.club; C.prospects = C.prospects.filter(x => x.id !== id); return { ok: true, msg: 'Junior opuścił szkółkę.' }; },

  /* ---------- sezon ---------- */
  seasonEnd() {
    const s = Game.s, C = s.club;
    C.sponsors.forEach(sp => {
      const g = Club.goal(sp), okGoal = g.check();
      sp.result = okGoal;
      if (okGoal) { Game.tx('inc', 'Premie sponsorów', sp.bonus); Game.news(`${sp.text}: cel osiągnięty (${g.text}) — premia ${money(sp.bonus)}.`, 'good'); }
      else Game.news(`${sp.text}: cel nieosiągnięty (${g.text}).`, 'warn');
    });
  },
  newSeason() {
    const s = Game.s, C = Club.ensure(s);
    // umowy roczne: zadowoleni sponsorzy przedłużają, reszta odchodzi
    const stay = C.sponsors.filter(sp => sp.result && Math.random() < 0.8);
    C.sponsors.filter(sp => !stay.includes(sp)).forEach(sp => Game.news(`Umowa z ${sp.text} wygasła.`, 'warn'));
    C.sponsors = stay.map(sp => ({ ...sp, weekly: Math.round(sp.weekly * 1.08 / 1000) * 1000, result: null }));
    C.att = [];
    C.prospects.forEach(p => { p.age++; });
    C.prospects = C.prospects.filter(p => p.age <= 19);
    Club.intakeNow(s);
    Club.makeOffers(s);
  },

  /* ---------- widoki ---------- */
  svg(path) { return `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`; },
  pips(l) { return `<span class="pips">${Array.from({ length: Club.MAXL }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span>`; },

  viewStadion() {
    const s = Game.s, C = s.club, me = Game.club(s.user), A = Club.attendance(me, s.forecast);
    const b = C.build;
    const cards = Object.entries(Club.FAC).map(([k, F]) => {
      const l = C.fac[k], max = l >= Club.MAXL, building = b && b.key === k;
      return `<div class="card fac ${building ? 'busy' : ''}">
        <div class="fac-h">${Club.svg(F.icon)}<div><b>${F.name}</b>${Club.pips(l)}</div></div>
        <p class="muted small">Teraz: ${esc(F.eff(l))}</p>
        ${max ? '<p class="good small">Najwyższy poziom.</p>' : `<p class="small">Poziom ${l + 1}: ${esc(F.eff(l + 1))}</p>`}
        ${building ? `<div class="prog"><i style="width:${Math.round((1 - b.left / b.total) * 100)}%"></i></div><p class="small">Budowa: jeszcze ${b.left} tyg.</p>`
          : max ? '' : `<div class="row between"><span class="small">${money(Club.cost(k))} · ${Club.weeks(k)} tyg. · utrzymanie +${money(F.upkeep)}/tydz.</span>
          <button class="ghost small" data-ui="build" data-v="${k}" ${b || s.finance.balance < Club.cost(k) ? 'disabled' : ''}>Rozbuduj</button></div>`}
      </div>`;
    }).join('');
    const hist = C.att.slice(-12), mx = Math.max(1, A.cap, ...hist);
    return `<div class="head"><h2>Stadion i obiekty</h2><p>Jedna ekipa budowlana: naraz trwa jedna inwestycja. Każdy obiekt kosztuje co tydzień utrzymanie.</p></div>
      <div class="grid">
        <div class="card s8"><h3>Bilety i frekwencja</h3>
          <div class="ticket"><button class="ghost small" data-ui="ticket" data-v="-5">−5 zł</button><div class="big">${C.ticket} zł</div><button class="ghost small" data-ui="ticket" data-v="5">+5 zł</button>
            <div class="tk-info"><span>Prognoza na następny mecz u siebie</span><b>${A.att.toLocaleString('pl-PL')} / ${A.cap.toLocaleString('pl-PL')}</b><small>${Math.round(A.fill * 100)}% · wpływy ok. ${money(A.att * C.ticket)}</small></div></div>
          <div class="spark att">${hist.map(v => `<i style="height:${Math.max(4, v / mx * 100)}%" title="${v}"></i>`).join('') || '<span class="muted small">Frekwencja pojawi się po pierwszym meczu u siebie.</span>'}</div></div>
        <div class="card s4"><h3>Ekipa budowlana</h3>${b ? `<p><b>${Club.FAC[b.key].name}</b> → poziom ${C.fac[b.key] + 1}</p><div class="prog"><i style="width:${Math.round((1 - b.left / b.total) * 100)}%"></i></div><p class="muted small">Zostało ${b.left} tyg.</p>` : '<p class="muted">Wolna. Wybierz inwestycję.</p>'}
          <p class="small">Utrzymanie obiektów: <b>${money(Object.entries(C.fac).reduce((a, [k, l]) => a + Club.FAC[k].upkeep * l, 0))}</b>/tydz.</p></div>
      </div>
      <div class="facs">${cards}</div>${Club.viewLook()}`;
  },

  viewSponsorzy() {
    const C = Game.s.club;
    const board = sp => `<span class="sboard" style="background:${sp.bg};color:${sp.fg}">${esc(sp.text)}</span>`;
    const slotHtml = Object.entries(Club.SLOTS).map(([k, S]) => {
      const act = C.sponsors.filter(x => x.slot === k);
      const rows = act.map(sp => { const g = Club.goal(sp), ok = g.check(); return `<div class="sp-row">${board(sp)}<div><b>${money(sp.weekly)}/tydz.</b><small>cel: ${esc(g.text)} · premia ${money(sp.bonus)} <span class="${ok ? 'good' : 'muted'}">${ok ? '✔ na dziś spełniony' : '✗ na dziś niespełniony'}</span></small></div><button class="ghost small bad" data-ui="spDrop" data-v="${sp.id}">Zerwij</button></div>`; }).join('');
      const empty = Array.from({ length: S.n - act.length }, () => '<div class="sp-row empty"><span class="sboard ph">wolne miejsce</span><small class="muted">wybierz ofertę poniżej</small></div>').join('');
      return `<div class="card s4"><h3>${S.name}</h3>${rows}${empty}</div>`;
    }).join('');
    const offers = C.offers.map(o => { const g = Club.goal(o), full = Club.used(o.slot) >= Club.SLOTS[o.slot].n; return `<div class="sp-row">${board(o)}<div><b>${Club.SLOTS[o.slot].name}: ${money(o.weekly)}/tydz.</b><small>cel: ${esc(g.text)} · premia ${money(o.bonus)}</small></div><button class="go small" data-ui="spSign" data-v="${o.id}" ${full ? 'disabled' : ''}>Podpisz</button></div>`; }).join('');
    return `<div class="head"><h2>Sponsorzy</h2><p>Umowy na sezon: stała wpłata co tydzień i premia za cel na koniec sezonu. Bandy sponsorów stoją przy torze w meczach u siebie. Zerwanie umowy kosztuje 4 tygodniowe wpłaty.</p></div>
      <div class="grid">${slotHtml}<div class="card s12"><h3>Oferty</h3>${offers || '<p class="muted">Nowe oferty przed kolejnym sezonem.</p>'}</div></div>`;
  },

  viewAkademia() {
    const s = Game.s, C = s.club, l = C.fac.academy;
    const cards = C.prospects.map(p => `<div class="rcard" style="--k:${Game.club(s.user).kevlar}">
      <div class="rc-top">${UI.avatar({ ...p, club: s.user }, 44)}<div><b>${esc(p.name)}</b><small>${p.age} lat · wychowanek</small></div><div class="rc-ksm"><small>POT</small><span class="stars">${UI.stars(p)}</span></div></div>
      <div class="rc-attrs">${['speed', 'start', 'bends', 'stamina'].map(k => `<div><span>${Game.ATTR_NAMES[k]}</span>${UI.bar(p.a[k])}<b>${p.a[k]}</b></div>`).join('')}</div>
      <div class="actions"><button class="go small" data-ui="prSign" data-v="${p.id}">Kontrakt juniorski</button><button class="ghost small" data-ui="prDrop" data-v="${p.id}">Zwolnij</button></div></div>`).join('');
    return `<div class="head"><h2>Szkółka żużlowa</h2><p>Poziom ${l}: ${esc(Club.FAC.academy.eff(l))}. Nabór przed każdym sezonem, wychowankowie powoli rosną sami. Kontrakt juniorski: 3 sezony, 20 000 zł za podpis — tani junior U21 do składu.</p></div>
      ${cards ? `<div class="rcards">${cards}</div>` : '<div class="card"><p class="muted">Na razie brak wychowanków. Rozbuduj szkółkę w zakładce Stadion, żeby nabór był większy i lepszy.</p></div>'}`;
  },

  /** Kliknięcia z zakładek klubu; true = obsłużone */
  click(d) {
    const s = Game.s;
    switch (d.ui) {
      case 'build': UI.done(Club.startBuild(d.v)); return true;
      case 'look': UI.done(Club.setLook(d.k, d.v)); return true;
      case 'ticket': s.club.ticket = R.clamp(s.club.ticket + +d.v, 25, 150); Game.save(); UI.render(); return true;
      case 'spSign': UI.done(Club.signSponsor(d.v)); return true;
      case 'spDrop': UI.done(Club.dropSponsor(d.v)); return true;
      case 'prSign': UI.done(Club.signProspect(d.v)); return true;
      case 'prDrop': UI.done(Club.dropProspect(d.v)); return true;
    }
    return false;
  },

  /** Przypomnienia na pulpicie */
  alerts() {
    const C = Game.s.club, out = [];
    Object.entries(Club.SLOTS).forEach(([k, S]) => { const free = S.n - Club.used(k); if (free > 0 && C.offers.some(o => o.slot === k)) out.push(`Sponsorzy: wolne miejsce „${S.name}” (${free}) — są oferty`); });
    if (!C.build) out.push('Ekipa budowlana czeka na zlecenie (Stadion)');
    if (C.prospects.length) out.push(`Szkółka: ${C.prospects.length} wychowanków czeka na decyzję`);
    return out;
  },
};
