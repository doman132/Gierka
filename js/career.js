/* =========================================================
   Speedway Empire 3D — KARIERA ZAWODNIKA
   Grasz jednym żużlowcem: 17-latek z licencją w wybranym
   klubie. Co tydzień planujesz 3 zajęcia (tor, siłownia,
   psycholog, silnik, sponsor, kibice, dom, impreza…),
   mieszkasz we własnym mieszkaniu, które urządzasz (3D),
   chodzisz na imprezy (3D) i podejmujesz decyzje moralne,
   które zmieniają formę, zdrowie, pieniądze i reputację.
   W meczu sam jedziesz swoje biegi (reszta symulowana),
   a trener (AI) ustala skład — musisz sobie na niego
   zapracować. Po sezonie oferty klubów zależą od KSM
   i reputacji.
   ========================================================= */
'use strict';

const Career = {
  tab: 'kpulpit',

  ACT: {
    track: { name: 'Trening na torze', desc: 'starty i łuki', cost: 0 },
    gym: { name: 'Siłownia i kondycja', desc: 'wytrzymałość, trochę prędkości', cost: 0 },
    mental: { name: 'Psycholog sportowy', desc: 'odporność psychiczna, spokój', cost: 1500 },
    engine: { name: 'Praca przy silniku', desc: 'lepsze silniki w najbliższym meczu', cost: 2500 },
    rest: { name: 'Odpoczynek', desc: 'zmęczenie w dół', cost: 0 },
    home: { name: 'Wieczór w domu', desc: 'nastrój (im ładniejszy dom, tym lepiej)', cost: 0 },
    sponsor: { name: 'Sesja dla sponsora', desc: 'pieniądze i rozpoznawalność', cost: 0 },
    fans: { name: 'Spotkanie z kibicami', desc: 'reputacja i nastrój', cost: 0 },
    party: { name: 'Impreza w klubie „Taśma”', desc: 'zabawa… i konsekwencje (3D)', cost: 300 },
  },

  DECOR: {
    sofa: { name: 'Kanapa', price: 14000, comfort: 6 },
    tv: { name: 'Telewizor', price: 16800, comfort: 5 },
    bed: { name: 'Porządne łóżko', price: 20000, comfort: 8 },
    poster: { name: 'Plakaty idoli żużla', price: 1600, comfort: 2 },
    shelf: { name: 'Półka na trofea', price: 8000, comfort: 3 },
    homegym: { name: 'Domowa siłownia', price: 36000, comfort: 3, note: 'siłownia +25% skuteczności' },
    console: { name: 'Konsola z kierownicą', price: 10000, comfort: 4, needs: 'tv' },
    plants: { name: 'Rośliny', price: 2400, comfort: 2 },
    rug: { name: 'Dywan', price: 3600, comfort: 2 },
    aquarium: { name: 'Akwarium', price: 12000, comfort: 4 },
    neon: { name: 'Neon z twoim numerem', price: 7200, comfort: 3 },
    kitchen: { name: 'Kuchnia i dietetyk', price: 28000, comfort: 5, note: 'szybsza regeneracja' },
    bike: { name: 'Stary motocykl w salonie', price: 24000, comfort: 6 },
  },

  /* ---------- nowa kariera ---------- */
  newGame(clubIdx, first, last) {
    const s = Game.newGame(clubIdx), club = Game.club(s.user);
    s.news = [];
    // najsłabszy junior klubu odchodzi — robi miejsce dla ciebie
    const jr = Game.roster(s.user).filter(Game.isJunior).sort((a, b) => Game.ovr(a) - Game.ovr(b))[0];
    if (jr) delete s.riders[jr.id];
    const me = Game.addRider(Game.genRider(club.base - 2.8, { club: s.user, age: 17, nat: 'POL' }));
    me.name = `${first || 'Kuba'} ${last || 'Nowak'}`.trim(); me.pot = 18; me.ksm = 3.4; me.morale = 72; me.fatigue = 5;
    me.contract = { years: 2, sign: 18000, perPoint: 700 };
    s.mode = 'career';
    s.career = { city: null, me: me.id, money: 15000, rep: 12, plan: ['track', 'gym', 'rest'], decor: [], engine: 1, trophies: [], history: [], used: {}, drink: 0, prep: 0, event: null, suspended: 0, deals: [], offers: [], england: 0, report: null };
    Game.autoLineup(s.user);
    Game.news(`${me.name}, 17 lat, podpisuje pierwszy kontrakt z ${club.name}. Witaj w zawodowym żużlu!`, 'good');
    Game.news('Wybierz się do miasta (zakładka Miasto): tor, siłownia, jedzenie, odpoczynek — energia, jedzenie i stres wpływają na jazdę.', 'info');
    City.Z();
    Game.save();
    return s;
  },
  C: () => Game.s.career,
  me: () => Game.s.riders[Game.s.career.me],
  comfort() { return Career.C().decor.reduce((a, k) => a + (Career.DECOR[k] ? Career.DECOR[k].comfort : 0), 0); },
  has: k => Career.C().decor.includes(k),
  pay(v, what) { const C = Career.C(); C.money += v; if (what) (C.ledger = C.ledger || []).unshift({ w: Game.s.week, what, v }); if (C.ledger) C.ledger = C.ledger.slice(0, 30); },
  mor(d) { const r = Career.me(); r.morale = R.clamp(r.morale + d, 20, 100); },
  fat(d) { const r = Career.me(); r.fatigue = R.clamp(r.fatigue + d, 0, 100); },
  repd(d) { const C = Career.C(); C.rep = R.clamp(C.rep + d, 0, 100); },
  grow(k, x) {
    const r = Career.me(), room = Math.max(0.15, (r.pot + 2 - r.a[k]) / 10), inc = x * Game.ageCurve(r.age) * room;
    r.growth[k] = (r.growth[k] || 0) + inc;
    let up = 0; while (r.growth[k] >= 1 && r.a[k] < 20) { r.a[k]++; r.growth[k] -= 1; up++; }
    return up ? `${Game.ATTR_NAMES[k]} +${up}!` : '';
  },
  inLineup() { const s = Game.s, L = s.lineups[s.user] || []; return L.slice(0, 8).includes(s.career.me); },
  /** Poprawki na mecz tylko dla ciebie (wołane z Club.effBonus): silnik, praca w warsztacie, alkohol */
  effMods(r, out) {
    const C = Game.s.career;
    if (!C || r.id !== C.me) return;
    out.speed = R.clamp(out.speed + (C.engine - 1) * 0.3 + C.prep - C.drink * 0.35, 1, 20);
    out.start = R.clamp(out.start + (C.engine - 1) * 0.15 + C.prep * 0.6 - C.drink * 0.45, 1, 20);
    if (C.city) { const m = City.mods(); ['speed', 'start', 'stamina', 'mental'].forEach(k => { out[k] = R.clamp(out[k] + m[k], 1, 20); }); } // energia, jedzenie, stres
  },

  /* ---------- tydzień ---------- */
  applyPlan() {
    const s = Game.s, C = Career.C(), r = Career.me(), out = [];
    const homeGym = Career.has('homegym') ? 1.25 : 1;
    (C.city ? [] : C.plan).forEach(k => { // w trybie miasta zajęcia wykonujesz na mapie
      const A = Career.ACT[k];
      if (A.cost) { if (C.money < A.cost) { out.push(`${A.name}: brak pieniędzy — odwołane.`); return; } Career.pay(-A.cost, A.name); }
      let t = '';
      switch (k) {
        case 'track': if (r.injury) { t = 'kontuzja — tylko rower stacjonarny'; break; } t = [Career.grow('start', 0.32), Career.grow('bends', 0.32)].filter(Boolean).join(' '); Career.fat(9); break;
        case 'gym': t = [Career.grow('stamina', 0.4 * homeGym), Career.grow('speed', 0.14 * homeGym)].filter(Boolean).join(' '); Career.fat(10); break;
        case 'mental': t = Career.grow('mental', 0.45); Career.mor(3); break;
        case 'engine': C.prep = Math.min(0.6, C.prep + 0.3); t = 'silniki dopieszczone na mecz'; break;
        case 'rest': Career.fat(Career.has('kitchen') ? -24 : -18); Career.mor(2); break;
        case 'home': Career.mor(2 + Math.round(Career.comfort() / 12)); Career.fat(-8); t = `nastrój +${2 + Math.round(Career.comfort() / 12)}`; break;
        case 'sponsor': { const v = 600 + C.rep * 55; Career.pay(v, 'Sesja dla sponsora'); Career.repd(1); Career.fat(3); t = `+${v} zł`; break; }
        case 'fans': Career.repd(3); Career.mor(2); Career.fat(2); t = 'reputacja +3'; break;
      }
      if (k !== 'party') out.push(`${A.name}${t ? ': ' + t : ''}`);
    });
    // stałe: koszty życia, umowy sponsorskie, starty w Anglii
    Career.pay(-700, 'Koszty życia');
    C.deals = C.deals.filter(d => { Career.pay(d.weekly, `Sponsor osobisty: ${d.name}`); d.left--; return d.left > 0; });
    if (C.england > 0) { C.england--; Career.pay(3000, 'Starty w Anglii'); Career.fat(8); out.push('Mecz w Anglii: +3000 zł, zmęczenie'); }
    return out;
  },

  /** „Zakończ tydzień”: plan → (impreza 3D) → (zdarzenie) → mecz albo symulacja → raport */
  advance() {
    const s = Game.s, C = Career.C();
    if (s.over) return;
    C.used = {};
    const cityLog = C.city ? City.finishDays() : [];
    C.report = { lines: cityLog.concat(Career.applyPlan()), events: [] };
    Game.save();
    if (!C.city && C.plan.includes('party')) { C.party = { fun: 0, drink: 0, done: {} }; UI.toast('Impreza! Chodź po klubie (E przy barze, parkiecie, ludziach). Wyjście — drzwi.'); Walk.startRoom('party', () => Career.afterParty()); return; }
    Career.maybeEvent();
  },
  maybeEvent() {
    const C = Career.C();
    if (!C.eventDone && Math.random() < 0.55) {
      const keys = Object.keys(Career.EV).filter(k => !Career.EV[k].when || Career.EV[k].when());
      if (keys.length) { C.eventDone = true; Career.showEvent(Crowd.pick(keys)); return; }
    }
    Career.toMatch();
  },
  toMatch() {
    const s = Game.s, C = Career.C(), r = Career.me(), fx = Game.userFixture();
    C.eventDone = false;
    UI.show('mgr'); Career.render();
    if (!fx) { Career.finishWeek(null); return; }
    Game.autoLineup(s.user);
    const opp = Game.club(fx.h === s.user ? fx.a : fx.h);
    if (C.suspended > 0 || r.injury > 0 || !Career.inLineup()) {
      const why = C.suspended > 0 ? `Jesteś zawieszony (${C.suspended} tyg.).` : r.injury > 0 ? `Kontuzja — jeszcze ${r.injury} tyg. przerwy.` : 'Trener nie wystawił cię w składzie. Trenuj i punktuj, żeby wywalczyć miejsce.';
      UI.modal(`<h2>${esc(Game.club(fx.h).short)} – ${esc(Game.club(fx.a).short)}</h2><p>${esc(why)}</p><div class="actions"><button class="go" data-ui="cSimWeek">Oglądaj z trybun (symulacja) ▸</button></div>`);
      return;
    }
    const L = s.lineups[s.user], no = L.indexOf(r.id) + (fx.h === s.user ? 9 : 1);
    UI.modal(`<div class="kicker">${Game.phaseName(s.week)} · ${fx.h === s.user ? 'u siebie' : 'na wyjeździe'}</div><h2>Mecz z ${esc(opp.name)}</h2>
      <p>Jedziesz z numerem <b>${no}</b>. Forma ${num(r.form, 1)}, zmęczenie ${Math.round(r.fatigue)}%${C.drink ? `, <span class="neg">kac (${C.drink})</span>` : ''}${C.prep ? ', <span class="good">silniki przygotowane</span>' : ''}.</p>
      <div class="actions"><button class="go" data-ui="cRide">Na tor — jadę swoje biegi ▸</button><button class="ghost" data-ui="cSimWeek">Symuluj mecz</button></div>`);
  },
  ride() {
    const s = Game.s, fx = Game.userFixture();
    UI.close();
    MatchDay.career = true;
    MatchDay.begin(fx);
  },
  /** Po tygodniu (z meczem albo bez): pieniądze za punkty, reputacja, raport */
  finishWeek(userMatch) {
    const s = Game.s, C = Career.C(), r = Career.me();
    const rep = Game.endWeek(userMatch);
    const lm = C.lastMatch && C.lastMatch.week === rep.week ? C.lastMatch : null;
    if (lm) {
      const pay = (lm.pts + lm.bonus) * r.contract.perPoint;
      Career.pay(pay, `Punkty: ${lm.pts}+${lm.bonus}`);
      const exp = r.ksm * lm.heats / 5, diff = lm.pts + lm.bonus - exp;
      Career.repd(Math.round(diff * 0.8)); Career.mor(Math.round(diff * 1.5));
      C.report.lines.push(`Mecz: ${lm.pts}${lm.bonus ? '+' + lm.bonus : ''} pkt w ${lm.heats} biegach — ${pay.toLocaleString('pl-PL')} zł`);
    }
    if (s.season && s.week <= 20) Career.pay(Math.round(r.contract.sign / DATA.WEEKS_PAID), 'Pensja (kwota za podpis w ratach)');
    if (C.city) City.afterMatch(lm);
    C.drink = 0; C.prep = 0;
    if (C.suspended > 0) C.suspended--;
    if (s.over) Career.seasonEnd();
    Game.save();
    UI.show('mgr'); Career.render();
    Career.reportModal(rep);
  },
  reportModal(rep) {
    const C = Career.C();
    UI.modal(`<div class="row between"><h2>${rep.phase} · ${rep.date}</h2><button class="x" data-ui="close">×</button></div>
      <div class="card"><h3>Twój tydzień</h3><ul class="list">${C.report.lines.map(l => `<li>${esc(l)}</li>`).join('')}${C.report.events.map(l => `<li class="warn">${esc(l)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Wyniki kolejki</h3>${rep.matches.map(m => `<div class="resrow ${m.mine ? 'me' : ''}">${UI.clubTag(m.h)} <b>${m.hs}:${m.as}</b> ${UI.clubTag(m.a)}</div>`).join('') || '<p class="muted">Bez meczów.</p>'}</div>
      <div class="actions"><button class="go" data-ui="close">Dalej</button></div>`);
  },

  /* ---------- zdarzenia moralne ---------- */
  EV: {
    supplement: {
      t: 'Cudowna odżywka', x: 'Kolega z siłowni podsuwa „odżywkę”: „Po tym jedziesz jak rakieta. Na liście zakazanych jej nie ma… chyba”.',
      o: [['Odmów', () => { Career.grow('mental', 0.2); return 'Odmówiłeś. Czyste sumienie.'; }],
        ['Weź', () => { const r = Career.me(); r.form = R.clamp(r.form + 1.2, -3, 3); if (Math.random() < 0.3) { Career.C().suspended = 8; Career.repd(-25); Career.pay(-15000, 'Kara za doping'); return 'Kontrola antydopingowa: wynik pozytywny! Zawieszenie na 8 tygodni, kara 15 tys. zł, reputacja −25.'; } return 'Czujesz moc (forma +1,2). Kontrola tym razem cię ominęła…'; }]],
    },
    kid: {
      t: 'Chłopiec po autograf', x: 'Pod parkiem maszyn czeka chłopiec na wózku z twoim zdjęciem. Spieszysz się na trening.',
      o: [['Zatrzymaj się, zrób zdjęcie, podaruj rękawice', () => { Career.repd(5); Career.mor(5); return 'Zdjęcie obiegło internet. Reputacja +5, nastrój +5.'; }],
        ['Machnij ręką i idź dalej', () => { Career.repd(-3); if (Math.random() < 0.35) { Career.repd(-8); return 'Ktoś to nagrał. „Gwiazdor bez serca” — reputacja −11.'; } return 'Chłopiec odprowadził cię wzrokiem. Reputacja −3.'; }]],
    },
    loan: {
      t: 'Pożyczysz silnik?', x: 'Kolega z drużyny ma awarię. Prosi o twój drugi silnik na mecz — a sam walczycie o miejsce w składzie.',
      o: [['Pożycz', () => { Career.mor(3); Career.repd(2); if (Math.random() < 0.25) { Career.C().engine = Math.max(1, Career.C().engine - 1); return 'Oddał silnik… zatarty. Poziom sprzętu −1. Ale drużyna to zapamięta (reputacja +2).'; } return 'Silnik wrócił cały, drużyna docenia (reputacja +2, nastrój +3).'; }],
        ['Odmów', () => { Career.mor(-2); return 'W szatni zrobiło się chłodno. Nastrój −2.'; }]],
    },
    england: {
      t: 'Oferta z Anglii', when: () => Career.C().england === 0 && Career.me().age >= 18,
      x: 'Klub z Anglii proponuje starty w tygodniu: 3000 zł za mecz przez 6 tygodni. Dużo podróży, mało snu.',
      o: [['Przyjmij', () => { Career.C().england = 6; return 'Od przyszłego tygodnia jeździsz też w Anglii (+3000 zł/tydz., więcej zmęczenia).'; }],
        ['Odmów — skupiam się na lidze', () => { Career.mor(1); return 'Zostajesz przy lidze.'; }]],
    },
    hater: {
      t: 'Hejter w internecie', x: 'Anonimowe konto obraża twoją rodzinę po ostatnim meczu.',
      o: [['Odpisz ostro', () => { Career.repd(-6); Career.mor(3); return 'Dyskusja wymknęła się spod kontroli. Reputacja −6.'; }],
        ['Zignoruj', () => { Career.mor(-3); return 'Zabolało, ale nie dałeś się sprowokować. Nastrój −3.'; }],
        ['Zgłoś i odpowiedz z dystansem', () => { Career.repd(2); return 'Kibice stanęli za tobą murem. Reputacja +2.'; }]],
    },
    family: {
      t: 'Telefon od mamy', x: 'Tata trafił do szpitala. Jutro masz ważny trening na torze.',
      o: [['Jedź do rodziny', () => { Career.mor(8); Career.fat(-5); return 'Tata czuje się lepiej, a ty wiesz, co jest najważniejsze. Nastrój +8.'; }],
        ['Zostań na treningu', () => { Career.mor(-10); Career.grow('start', 0.3); return 'Trening poszedł dobrze, ale myślami byłeś gdzie indziej. Nastrój −10.'; }]],
    },
    bookie: {
      t: 'Billboard bukmachera', x: 'Firma bukmacherska chce cię na billboardzie w mieście. 12 tys. zł od ręki.',
      o: [['Bierz pieniądze', () => { Career.pay(12000, 'Reklama bukmachera'); Career.repd(-4); return '+12 000 zł. Część kibiców kręci nosem (reputacja −4).'; }],
        ['Odmów', () => { Career.repd(1); return 'Odmówiłeś. Rodzice młodych kibiców doceniają (reputacja +1).'; }]],
    },
    rival: {
      t: 'Rywal z zeszłego meczu', x: 'Zawodnik rywali, który wepchnął cię w bandę, śmieje się z ciebie w wywiadzie.',
      o: [['Następnym razem „oddam” na torze', () => { Career.me().form = R.clamp(Career.me().form + 0.5, -3, 3); Career.me().a.risk = Math.min(20, Career.me().a.risk + 1); return 'Złość dodaje ci ognia (forma +0,5), ale jeździsz bardziej ryzykownie.'; }],
        ['Odpowiedz w mediach z klasą', () => { Career.repd(3); return 'Twój komentarz zebrał tysiące polubień. Reputacja +3.'; }],
        ['Olej to', () => 'Nie ma o czym gadać.']],
    },
    agent: {
      t: 'Agent', x: 'Menedżer zawodników proponuje współpracę: „Załatwię ci lepsze oferty, biorę 15% zarobków”.',
      when: () => !Career.C().agent,
      o: [['Podpisz z agentem', () => { Career.C().agent = true; return 'Masz agenta: po sezonie więcej i lepszych ofert (ale 15% prowizji od kontraktu).'; }],
        ['Radzę sobie sam', () => 'Negocjujesz sam.']],
    },
  },
  showEvent(k) {
    const E = Career.EV[k];
    Career.C().eventKey = k;
    UI.modal(`<div class="kicker">Twoja decyzja</div><div class="dilemma"><div class="dl-ico">?</div><div><h2>${esc(E.t)}</h2><p>${esc(E.x)}</p></div></div>
      <div class="talk-opts">${E.o.map(([t], i) => `<button class="opt" data-ui="cEv" data-v="${i}">${esc(t)}</button>`).join('')}</div>`);
  },
  resolveEvent(i) {
    const C = Career.C(), E = Career.EV[C.eventKey], msg = E.o[i][1]();
    C.report.events.push(`${E.t}: ${msg}`); Game.news(`${E.t}: ${msg}`, 'info'); Game.save();
    UI.modal(`<h2>${esc(E.t)}</h2><p class="fx big-fx">${esc(msg)}</p><div class="actions"><button class="go" data-ui="cAfterEv">Dalej ▸</button></div>`);
  },

  /* ---------- mieszkanie (3D) ---------- */
  // wyposażenie z modeli (Poly Haven / Kenney): klucz dekoracji → [model, x, y, z, obrót, rozmiar]
  HOME: {
    // stałe wyposażenie: w pełni urządzone mieszkanie (3dassets.dev, Poly Haven, Kenney — CC0)
    base: [
      // sypialnia
      ['wardrobe', -7.6, 0, -2.6, Math.PI / 2, {}], ['nightstand', -6.55, 0, -5.55, 0, { h: 0.55 }], ['nightstand', -3.05, 0, -5.55, 0, { h: 0.55 }], ['tallboy', -2.35, 0, -5.7, 0, {}], ['helmetStand', -2.35, 'top:tallboy', -5.7, 0.4, {}],
      ['sconce', -6.55, 1.25, -5.9, 0, {}], ['sconce', -3.05, 1.25, -5.9, 0, {}], ['posterBlue', -5.3, 1.55, -5.96, 0, {}], ['posterCoral', -4.3, 1.55, -5.96, 0, {}], ['rugWool', -4.8, 0.012, -2.9, 0, {}],
      // salon
      ['consoleTable', 6.2, 0, -5.75, 0, {}], ['bookcase5', 7.75, 0, -3.3, -Math.PI / 2, {}], ['guitar', 7.5, 0, -1.8, -Math.PI / 2, {}], ['arcLamp', 3.8, 0, -0.4, 0, { h: 1.9 }], ['radiator', 4, 0.12, -5.9, 0, {}], ['curtains', 4, 0.05, -5.86, 0, { h: 2.7 }], ['wallClock', 1.9, 2.25, -5.95, 0, {}],
      // jadalnia i komoda
      ['diningRound', -4.6, 0, 1.3, 0, {}], ['diningChair', -5.4, 0, 1.3, Math.PI / 2, {}], ['diningChair', -3.8, 0, 1.3, -Math.PI / 2, {}], ['drawers', -7.7, 0, 0.4, Math.PI / 2, {}],
      // przedpokój
      ['shoeRack', -1.7, 0, 5.75, Math.PI, {}], ['doormat', 0, 0.012, 5.4, 0, {}], ['mirror', 3.6, 0, 5.72, Math.PI, {}], ['plant2', 2.6, 0, 5.6, 0, {}],
      // łazienka i biurko przy jej ścianie
      ['bathroom', 6.28, 0, 4.12, 0, { s: 1 }], ['desk', 6.3, 0, 1.75, Math.PI, {}], ['laptop', 6.3, 'top:desk', 1.7, 0, {}], ['officeChair', 6.3, 0, 1.0, Math.PI, {}]],
    bed: [['bed2', -4.8, 0, -4.7, 0, {}]], nobed: [['bedSingle', -4.8, 0, -4.6, 0, {}]],
    sofa: [['sofa', 2, 0, -1.0, Math.PI, {}], ['coffee', 2, 0, -2.6, 0, {}]],
    tv: [['tvCabinet', 2, 0, -5.6, 0, {}], ['tvModern', 2, 'top:tvCabinet', -5.6, 0, {}]],
    console: [['console', 2.6, 'top:tvCabinet', -5.45, 0, {}]],
    shelf: [['shelves', 7.6, 0, -5.2, -Math.PI / 2, {}]],
    poster: [['frame1', -7.93, 1.6, -0.2, Math.PI / 2, {}], ['frame1', -7.93, 1.6, 1.2, Math.PI / 2, {}]],
    plants: [['plant1', 0.45, 0, -5.6, 0, { h: 1.1 }], ['plant4', -7.5, 0, -0.9, 0, {}], ['plantTall', 7.5, 0, 1.2, 0, {}]],
    rug: [['rug', 2, 0.01, -2.6, 0, {}]],
    // kuchnia w kształcie L z wyspą (3dassets.dev, CC0); bez zakupu — lodówka i szafka
    kitchen: [['kitchenL', -5.35, 0, 4.45, Math.PI, { s: 1 }]], nokitchen: [['fridge', -7.4, 0, 5.6, Math.PI, {}], ['kBase', -6.6, 0, 5.6, Math.PI, {}]],
  },
  furnish(R, spots) {
    const B = (w, h, d, c, x, y, z, ry = 0, o) => { const m = World.box(new THREE.Group(), w, h, d, c, R.cx + x, World.LOCKER_Y + y, z, ry, o); Rooms.add(m); return m; };
    const L = (w, h, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c })); m.position.set(R.cx + x, World.LOCKER_Y + y, z); m.rotation.y = ry; Rooms.add(m); return m; };
    const has = Career.has, me = Career.me(), club = Game.club(Game.s.user);
    // lista mebli z modeli według tego, co kupiłeś
    const want = ['base', has('bed') ? 'bed' : 'nobed'].concat(['sofa', 'tv', 'console', 'shelf', 'poster', 'plants', 'rug', 'kitchen'].filter(k => has(k) && (k !== 'console' || has('tv')))).concat(has('kitchen') ? [] : ['nokitchen']);
    const list = want.flatMap(k => Career.HOME[k]);
    const keys = [...new Set(list.map(l => l[0]))];
    const put = () => {
      if (Walk.room !== 'home') return;
      const tops = {};
      list.forEach(([k, x, y, z, rot, size]) => {
        const yy = typeof y === 'string' ? (tops[y.slice(4)] || 0.75) : y;
        const g = Furn.place(World.venueGroup, k, R.cx + x, World.LOCKER_Y + yy, z, rot, size);
        if (g) { Rooms.dyn.push(g); tops[k] = yy + Furn.cache[k].size.y * g.children[0].scale.y; }
      });
      if (has('shelf')) Career.C().trophies.slice(0, 8).forEach((t, i) => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.035, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0xd4a73a, metalness: 0.9, roughness: 0.25 })); cup.position.set(R.cx + 7.6, World.LOCKER_Y + (tops.shelves || 1.6) * (0.55 + Math.floor(i / 4) * 0.28), -5.9 + (i % 4) * 0.45); Rooms.add(cup); });
    };
    if (THREE.GLTFLoader && location.protocol !== 'file:') { if (Furn.ready(keys)) put(); else Furn.load(keys, put); }
    // miejsca akcji (niezależnie od modeli)
    spots.push({ id: 'h:sleep', x: R.cx - 4.8, z: -2.6, label: 'Połóż się spać — koniec dnia, energia wraca', r: 1.6 });
    spots.push({ id: 'h:laptop', x: R.cx + 6.3, z: 0.6, label: 'Laptop — sklep i urządzanie mieszkania', r: 1.4 });
    if (has('tv')) spots.push({ id: 'h:tv', x: R.cx + 2, z: -3.6, label: 'Obejrzyj powtórki swoich biegów', r: 1.6 });
    if (has('console') && has('tv')) spots.push({ id: 'h:console', x: R.cx + 3, z: -3.4, label: 'Zagraj w grę żużlową (relaks)', r: 1.3 });
    if (has('shelf')) spots.push({ id: 'h:trophies', x: R.cx + 6.6, z: -4.6, label: 'Twoje trofea', r: 1.4 });
    // rzeczy bez modeli: domowa siłownia, akwarium, neon, motocykl
    if (has('homegym')) { Furn.load(['benchPress', 'dumbbells'], () => { if (Walk.room !== 'home') return; [['benchPress', -1.3, 2.75, Math.PI / 2], ['dumbbells', -1.3, 4.55, Math.PI / 2]].forEach(([k, x, z, r]) => { const g = Furn.place(World.venueGroup, k, R.cx + x, World.LOCKER_Y, z, r, k === 'dumbbells' ? { w: 1.2 } : { w: 2 }); if (g) Rooms.dyn.push(g); }); }); spots.push({ id: 'h:workout', x: R.cx - 1.3, z: 1.6, label: 'Trening w domowej siłowni', r: 1.5 }); }
    if (has('aquarium')) { B(1.3, 0.8, 0.45, 0x222222, -1.05, 0.4, -5.7); L(1.2, 0.55, new THREE.Color(0.1, 0.8, 1.6), -1.05, 1.05, -5.46, 0); }
    if (has('neon')) { const t = World.canvasTex(256, 128, g => { g.clearRect(0, 0, 256, 128); g.font = 'bold 96px "Saira Stencil One", Impact, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ff3aa8'; g.shadowColor = '#ff3aa8'; g.shadowBlur = 18; g.fillText((me.name.split(' ')[1] || 'SPEEDWAY').slice(0, 7).toUpperCase(), 128, 92); }); const n = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true })); n.position.set(R.cx + 7.95, World.LOCKER_Y + 1.9, 0); n.rotation.y = -Math.PI / 2; Rooms.add(n); }
    if (has('bike')) { const b = Bike.build({ kevlar: club.kevlar, trim: club.trim, helmet: '#444', no: 1, name: '' }, { noTag: true }); b.rider.visible = false; b.root.position.set(R.cx + 5.9, World.LOCKER_Y + 0.025, -2.3); b.root.rotation.y = Math.PI / 2 + 0.35; World.linearize(b.root); Rooms.add(b.root); }
  },

  /* ---------- impreza (3D) ---------- */
  partyPeople(Rm, spots) {
    const rivalClub = Game.s.clubs.find(c => c.id !== Game.s.user);
    const fem = ['Female_Adult_01', 'Female_Adult_04', 'Female_Adult_07', 'Female_Party_01'];
    Career.dancers = [];
    for (let i = 0; i < 16; i++) {
      const key = Humans.ready ? (i % 2 ? Crowd.pick(fem) : null) : null;
      const m = Rooms.human({ key, pose: Math.random() < 0.75 ? 'dance' : 'cheer', frame: i, fps: 9 + Math.random() * 3 });
      if (!m) break;
      m.position.set(Rm.cx + 2 + Math.random() * 5.5, World.LOCKER_Y, -2 + Math.random() * 3.6); m.rotation.y = Math.random() * 6.28; Rooms.add(m);
      Career.dancers.push({ m, ph: Math.random() * 6, y0: World.LOCKER_Y });
    }
    const npc = (x, z, face, n) => { const m = Rooms.human(n); if (m) { m.position.set(Rm.cx + x, World.LOCKER_Y, z); m.rotation.y = face; Rooms.add(m); } };
    npc(-4, -6.4, -Math.PI / 2, { key: 'Male_Adult_05', pose: 'talk', cols: ['#111111', '#cf9a70', '#161010', '#111111'] }); // barman
    npc(-6, 2.9, Math.PI / 2, { role: 'president', pose: 'sit', cols: ['#2b2f38', '#ecc5a2', '#7c7c7c', '#1c2130'] }); // gość w loży VIP
    npc(6.5, 4, Math.PI, { key: 'Male_Adult_15', pose: 'drink', cols: [rivalClub.kevlar, '#e0b08a', '#2b1d12', '#1c1c1c'] }); // rywal
    npc(-1, 3.5, 0, { key: 'Male_Adult_03', pose: 'cheer', cols: ['#E0632E', '#f3d6bd', '#9c6b3c', '#242427'] }); npc(-0.2, 4, 0.4, { key: 'Female_Adult_07', pose: 'clap', cols: ['#E0632E', '#b8805a', '#161010', '#343944'] }); // kibice
    Rooms.tag(Rm, 'Bar', -4, -5.3, '#3ad7ff', 2.3); Rooms.tag(Rm, 'Loża VIP', -6, 2.6, '#F2C230', 2.3); Rooms.tag(Rm, `Rywal: ${rivalClub.short}`, 6.5, 4, rivalClub.kevlar, 2.3); Rooms.tag(Rm, 'Twoi kibice', -0.6, 3.8, '#E0632E', 2.3);
    spots.push({ id: 'p:bar', x: Rm.cx - 4, z: -4.6, label: 'Bar — zamów coś', r: 1.8 }, { id: 'p:dance', x: Rm.cx + 4.5, z: -0.5, label: 'Parkiet — tańcz', r: 2.2 }, { id: 'p:vip', x: Rm.cx - 6, z: 1.6, label: 'Porozmawiaj z gościem w loży VIP', r: 1.6 }, { id: 'p:rival', x: Rm.cx + 6.5, z: 3, label: 'Zaczepia cię zawodnik rywali', r: 1.6 }, { id: 'p:fans', x: Rm.cx - 0.6, z: 2.6, label: 'Kibice chcą zdjęcie', r: 1.6 });
  },
  partyTick(dt) {
    const t = performance.now() / 1000;
    (Career.dancers || []).forEach(d => { if (!d.m.userData.human) d.m.position.y = d.y0 + Math.abs(Math.sin(t * 4 + d.ph)) * 0.12; d.m.rotation.y += dt * 0.25 * Math.sin(d.ph); });
    (World.partyTiles || []).forEach((m, i) => { const h = (t * 0.5 + i * 0.13) % 1; m.material.color.setHSL(h, 1, 0.35 + 0.25 * Math.max(0, Math.sin(t * 6 + i))); });
  },
  afterParty() {
    const C = Career.C(), P = C.party;
    Career.mor(2 + P.fun * 2); Career.fat(6 + P.drink * 3); C.drink = P.drink;
    C.report.lines.push(`Impreza: zabawa ${P.fun}, alkohol ${P.drink}${P.drink >= 2 ? ' — jutro kac' : ''}.`);
    UI.show('mgr'); Career.render();
    if (P.drink >= 2) { C.eventDone = true; Career.showEvent('__drive'); return; }
    Career.maybeEvent();
  },

  /** Akcje w pokojach w trybie kariery (true = obsłużone) */
  roomAct(id) {
    const s = Game.s, C = Career.C(), r = Career.me();
    const box = (title, body, extra = '') => UI.modal(`<div class="row between"><span class="kicker">${esc(World.rooms[Walk.room] ? World.rooms[Walk.room].name : '')}</span><button class="x" data-ui="close">×</button></div><h2>${title}</h2>${body}<div class="actions">${extra}<button class="ghost" data-ui="close">Zamknij</button></div>`);
    const once = (k, f) => { if (C.used[k] === s.week) { UI.toast('To już było w tym tygodniu.'); return; } C.used[k] = s.week; f(); Game.save(); };
    if (id.startsWith('rider:')) { const t = s.riders[id.slice(6)]; box(esc(t.name), `<blockquote class="quote">${Crowd.pick(['„Młody, w pierwszym łuku nie odpuszczaj — oni czekają, aż się zawahasz.”', '„Widziałem twój ostatni bieg. Za wcześnie zamykasz gaz na wyjściu.”', '„Trener patrzy na starty. Pracuj nad taśmą.”', '„Idziesz w sobotę do Taśmy? Tylko nie przesadź przed meczem.”'])}</blockquote>`); return true; }
    switch (id) {
      case 'h:sleep': City.sleepScene(); return true;
      case 'h:tv': once('tv', () => { UI.toast(Career.grow('mental', 0.2) || 'Analiza powtórek: widzisz swoje błędy w łukach.'); Career.grow('bends', 0.12); }); return true;
      case 'h:console': once('console', () => { Career.mor(3); UI.toast('Kilka wyścigów na konsoli: nastrój +3.'); }); return true;
      case 'h:workout': once('workout', () => { UI.toast(Career.grow('stamina', 0.25) || 'Solidny trening w domu.'); Career.fat(5); }); return true;
      case 'h:trophies': box('Twoje trofea', C.trophies.length ? `<ul class="list">${C.trophies.map(t => `<li>🏆 ${esc(t)}</li>`).join('')}</ul>` : '<p class="muted">Półka czeka. Zdobądź pierwszy medal!</p>'); return true;
      case 'h:laptop': Career.shopModal(); return true;
      case 'p:bar': box('Bar', `<p>Alkohol dziś: <b>${C.party.drink}</b>. Mecz ${Game.userFixture() ? 'jest w tym tygodniu' : 'nie w tym tygodniu'}.</p>`, '<button class="ghost" data-ui="cBar" data-v="water">Woda z cytryną</button><button class="ghost" data-ui="cBar" data-v="beer">Jedno piwo</button><button class="go" data-ui="cBar" data-v="shots">Kolejka shotów z kibicami</button>'); return true;
      case 'p:dance': if (!C.party.done.dance) { C.party.done.dance = 1; C.party.fun += 2; Career.fat(2); UI.toast('Parkiet! Zabawa +2.'); } else UI.toast('Nogi już bolą.'); return true;
      case 'p:vip': {
        if (C.party.done.vip) { UI.toast('Gość z loży rozmawia już z kimś innym.'); return true; }
        C.party.done.vip = 1;
        if (C.party.drink >= 3) { Career.repd(-5); box('Loża VIP', '<p>Plątał ci się język, a gość okazał się prezesem firmy transportowej. Nie było dobrze (reputacja −5).</p>'); }
        else if (Math.random() < 0.35 + C.rep / 200) { const w = 800 + Math.round(C.rep * 15); C.deals.push({ name: 'Trans-Kolej', weekly: w, left: 10 }); box('Loża VIP', `<p>„Podoba mi się, jak jeździsz. Chcesz nasze logo na kevlarze?” — umowa: ${w} zł tygodniowo przez 10 tygodni.</p>`); }
        else box('Loża VIP', '<p>Miła rozmowa o żużlu. Może kiedyś coś z tego będzie.</p>');
        return true;
      }
      case 'p:rival': {
        if (C.party.done.rival) return true;
        box('Zaczepka', '<blockquote class="quote">„Ty jesteś ten junior, co się boi pierwszego łuku? Hahaha.”</blockquote>', '<button class="ghost" data-ui="cRival" data-v="ignore">Zignoruj</button><button class="ghost" data-ui="cRival" data-v="joke">Odpowiedz żartem</button><button class="go bad" data-ui="cRival" data-v="fight">Popchnij go</button>');
        return true;
      }
      case 'p:fans': {
        if (C.party.done.fans) return true;
        box('Kibice', '<p>Grupka kibiców chce zdjęcie. Jeden szepcze: „Mam coś na lepszą zabawę… tabletka. Chcesz?”</p>', '<button class="ghost" data-ui="cFans" data-v="photo">Zrób zdjęcia i podziękuj</button><button class="ghost bad" data-ui="cFans" data-v="pill">Weź tabletkę</button>');
        return true;
      }
    }
    return false;
  },

  shopModal() {
    const C = Career.C();
    UI.modal(`<div class="row between"><span class="kicker">Laptop · sklep</span><button class="x" data-ui="close">×</button></div><h2>Urządź mieszkanie</h2>
      <p>Na koncie: <b>${C.money.toLocaleString('pl-PL')} zł</b> · wygoda domu: <b>${Career.comfort()}</b> (lepszy nastrój po wieczorze w domu)</p>
      <div class="shop">${Object.entries(Career.DECOR).map(([k, d]) => { const own = Career.has(k), need = d.needs && !Career.has(d.needs); return `<div class="shop-i ${own ? 'own' : ''}"><b>${esc(d.name)}</b><small>wygoda +${d.comfort}${d.note ? ' · ' + esc(d.note) : ''}${need ? ' · wymaga: ' + esc(Career.DECOR[d.needs].name) : ''}</small>${own ? '<span class="good">✓ masz</span>' : `<button class="go small" data-ui="cBuy" data-v="${k}" ${C.money < d.price || need ? 'disabled' : ''}>${d.price.toLocaleString('pl-PL')} zł</button>`}</div>`; }).join('')}</div>`);
  },

  /* ---------- koniec sezonu: oferty ---------- */
  seasonEnd() {
    const s = Game.s, C = Career.C(), r = Career.me(), S = r.season;
    const avg = S.m ? (S.pts + S.bonus) / S.m : 0, P = s.playoffs;
    if (P && P.champion === s.user) C.trophies.push(`Złoty medal DMP ${s.season}`);
    else if (P && P.fin[0] && P.fin[0].loser === s.user) C.trophies.push(`Srebrny medal DMP ${s.season}`);
    else if (P && P.third === s.user) C.trophies.push(`Brązowy medal DMP ${s.season}`);
    if (Game.isJunior(r) && avg >= 7) C.trophies.push(`Najlepszy junior ligi ${s.season}`);
    C.history.push({ season: s.season, club: Game.club(s.user).short, m: S.m, pts: S.pts + S.bonus, avg: Math.round(avg * 100) / 100 });
    // oferty: klub macierzysty + inne kluby (lepsze przy wysokim KSM i reputacji; agent dokłada ofertę)
    const strength = avg + C.rep / 25 + (C.agent ? 1 : 0);
    const clubs = s.clubs.slice().sort((a, b) => b.base - a.base);
    const pool = clubs.filter(c => c.id !== s.user && (c.base - 12) * 3 < strength + 1.5);
    const n = 1 + (C.agent ? 2 : 1) + (strength > 8 ? 1 : 0);
    const mk = (c, mult) => { const d = Game.demand({ ksm: Math.max(2, avg || r.ksm) }); return { club: c.id, sign: Math.round(d.sign * mult * (C.agent ? 0.85 * 1.2 : 1) / 1000) * 1000, perPoint: Math.round(d.perPoint * mult / 50) * 50, years: R.int(1, 3) }; };
    C.offers = [mk(Game.club(s.user), 1.0)].concat(pool.sort(() => Math.random() - 0.5).slice(0, n).map(c => mk(c, 1 + Math.random() * 0.35)));
    Game.news('Koniec sezonu! Sprawdź oferty kontraktów w zakładce Kariera.', 'good');
  },
  acceptOffer(i) {
    const s = Game.s, C = Career.C(), r = Career.me(), o = C.offers[i];
    if (o.club !== s.user) {
      const full = Game.roster(o.club).filter(x => x.id !== r.id);
      if (full.length >= DATA.ROSTER_MAX) { const w = full.sort((a, b) => Game.ovr(a) - Game.ovr(b))[0]; w.club = null; }
      Game.news(`Transfer: ${r.name} przechodzi do ${Game.club(o.club).name}!`, 'good');
      r.club = o.club; s.user = o.club;
    }
    r.contract = { years: o.years, sign: o.sign, perPoint: o.perPoint };
    C.offers = []; C.signed = true;
    Game.save();
  },
  newSeason() {
    const C = Career.C();
    if (!C.signed && C.offers.length) Career.acceptOffer(0); // bez decyzji — zostajesz w klubie
    C.signed = false;
    Game.newSeason();
    Game.autoLineup(Game.s.user);
    Game.save();
  },

  /* ---------- widoki ---------- */
  TABS: [['kpulpit', 'Pulpit'], ['kmiasto', 'Miasto'], ['kdom', 'Dom'], ['ksprzet', 'Sprzęt'], ['kkariera', 'Kariera'], ['kliga', 'Liga']],
  render() {
    const s = Game.s, C = Career.C(), r = Career.me(), club = Game.club(s.user);
    if (!C.city && !s.over) City.Z();
    $('#mgr').innerHTML = `
      <nav class="side">
        <div class="brand">Speedway<b>Kariera</b></div>
        ${Career.TABS.map(([k, n]) => `<button class="nav ${Career.tab === k ? 'on' : ''}" data-ui="cTab" data-v="${k}">${n}</button>`).join('')}
        <div class="side-foot"><button class="nav" data-ui="save">Zapisz grę</button><button class="nav" data-ui="newGameAsk">Nowa gra</button></div>
      </nav>
      <main class="main">
        <header class="top">
          <div class="club">${UI.avatar(r, 34)}<div><b>${esc(r.name)}</b><small>${r.age} lat · ${esc(club.name)} · KSM ${num(r.ksm)}</small></div></div>
          <div class="when"><b>${s.over ? 'Po sezonie' : Game.dateStr(s.week)}</b><small>${s.over ? 'okno transferowe' : Game.phaseName(s.week)}</small></div>
          <div class="chip"><small>Pieniądze</small><b class="${C.money < 0 ? 'neg' : ''}">${C.money.toLocaleString('pl-PL')} zł</b></div>
          <div class="chip"><small>Reputacja</small><b>${Math.round(C.rep)}</b></div>
          ${C.city ? `<div class="chip cstat"><small>Energia · Jedzenie · Stres</small><b><i class="cb en" style="--v:${Math.round(C.city.energy)}%"></i><i class="cb fd" style="--v:${Math.round(C.city.food)}%"></i><i class="cb st" style="--v:${Math.round(C.city.stress)}%"></i></b></div>` : ''}
          <button class="ghost walkbtn" data-ui="cityPhone" title="Telefon (P)">📱</button>
          <button class="ghost walkbtn" data-ui="cHome">🏠 Dom</button>
          <button class="go" data-ui="${s.over ? 'cNewSeason' : 'cAdvance'}">${s.over ? 'Nowy sezon ▸' : 'Zakończ tydzień ▸'}</button>
        </header>
        <section class="view ${Career.lastTab !== Career.tab ? 'enter' : ''}">${Career.views[Career.tab]()}</section>
      </main>`;
    setTimeout(() => { Career.lastTab = Career.tab; }, 0);
  },

  views: {
    kpulpit() {
      const s = Game.s, C = Career.C(), r = Career.me(), fx = Game.userFixture(), S = r.season;
      const bar = (label, v, bad) => `<div class="kv"><span>${label}</span>${UI.bar(v, 100, bad ? 'bad' : '')}<b>${Math.round(v)}</b></div>`;
      return `<div class="grid">
        <div class="card s8 match-card hero">${fx ? `<div class="kicker">${Game.phaseName(s.week)} · ${Game.dateStr(s.week)}</div><div class="vs">${UI.clubBig(fx.h)}<span>vs</span>${UI.clubBig(fx.a)}</div>
          <div class="fc">${Career.inLineup() ? '<b class="good">Jesteś w składzie</b>' : '<b class="neg">Poza składem</b> — zasłuż treningiem i punktami'}${C.suspended ? ` · <b class="neg">zawieszenie ${C.suspended} tyg.</b>` : ''}</div>`
          : `<div class="kicker">${s.over ? 'Po sezonie' : Game.phaseName(s.week)}</div><div class="vs"><span>${s.over ? 'Czas na decyzję o kontrakcie' : 'W tym tygodniu bez meczu'}</span></div>`}</div>
        <div class="card s4"><h3>Ty</h3>${bar('Nastrój', r.morale, r.morale < 45)}${bar('Zmęczenie', r.fatigue, r.fatigue > 65)}${bar('Reputacja', C.rep)}
          <p class="small">Forma ${num(r.form, 1)} · ${r.injury ? `<span class="neg">kontuzja ${r.injury} tyg.</span>` : 'zdrowy'} · wygoda domu ${Career.comfort()}</p></div>
        <div class="card s6"><h3>Sezon</h3><p>${S.m} meczów · ${S.heats} biegów · ${S.pts}+${S.bonus} pkt · średnia <b>${num(S.heats ? (S.pts + S.bonus) / S.heats : 0, 3)}</b> / bieg</p>
          <div class="attrs">${Game.ATTRS.filter(k => k !== 'risk').map(k => `<div><span>${Game.ATTR_NAMES[k]}</span>${UI.bar(r.a[k])}<b>${r.a[k]}</b></div>`).join('')}</div></div>
        <div class="card s6"><h3>Wiadomości</h3><ul class="list news">${s.news.slice(0, 8).map(n => `<li class="${n.type}">${esc(n.text)}</li>`).join('')}</ul></div>
      </div>`;
    },
    ktydzien() {
      const C = Career.C();
      return `<div class="head"><h2>Plan tygodnia</h2><p>Trzy zajęcia. Kliknij miejsce, potem zajęcie. „Zakończ tydzień” wykonuje plan, a potem jedziesz mecz (jeśli jest).</p></div>
        <div class="slots">${C.plan.map((k, i) => `<button class="slot ${Career.slot === i ? 'on' : ''}" data-ui="cSlot" data-v="${i}"><small>Zajęcie ${i + 1}</small><b>${esc(Career.ACT[k].name)}</b></button>`).join('')}</div>
        <div class="acts">${Object.entries(Career.ACT).map(([k, a]) => `<button class="opt" data-ui="cAct" data-v="${k}">${esc(a.name)}<small>${esc(a.desc)}${a.cost ? ` · ${a.cost} zł` : ''}</small></button>`).join('')}</div>`;
    },
    kdom() {
      const C = Career.C();
      return `<div class="head row between"><div><h2>Mieszkanie</h2><p>Wygoda: <b>${Career.comfort()}</b>. Im przyjemniej w domu, tym lepszy nastrój po wieczorze w domu. Wejdź do mieszkania (3D) i kup rzeczy przez laptopa.</p></div><button class="go" data-ui="cHome">🏠 Idź do domu</button></div>
        <div class="shop">${Object.entries(Career.DECOR).map(([k, d]) => `<div class="shop-i ${Career.has(k) ? 'own' : ''}"><b>${esc(d.name)}</b><small>wygoda +${d.comfort}${d.note ? ' · ' + esc(d.note) : ''}</small>${Career.has(k) ? '<span class="good">✓ masz</span>' : `<button class="go small" data-ui="cBuy" data-v="${k}" ${C.money < d.price || (d.needs && !Career.has(d.needs)) ? 'disabled' : ''}>${d.price.toLocaleString('pl-PL')} zł</button>`}</div>`).join('')}</div>`;
    },
    ksprzet() {
      const C = Career.C(), cost = 25000 * C.engine;
      return `<div class="head"><h2>Sprzęt</h2><p>Własne silniki i serwis tuningowy — lepszy sprzęt to szybszy start i prędkość.</p></div>
        <div class="grid"><div class="card s6"><h3>Silniki</h3><div class="big">Poziom ${C.engine} / 5</div><p class="small">prędkość +${num((C.engine - 1) * 0.3, 1)}, start +${num((C.engine - 1) * 0.15, 2)}</p>
          ${C.engine < 5 ? `<button class="go" data-ui="cEngine" ${C.money < cost ? 'disabled' : ''}>Kup lepszy silnik (${cost.toLocaleString('pl-PL')} zł)</button>` : '<p class="good">Najlepszy sprzęt w lidze.</p>'}</div>
          <div class="card s6"><h3>Ostatnie wydatki i wpływy</h3><ul class="list">${(C.ledger || []).slice(0, 10).map(l => `<li class="${l.v < 0 ? 'bad' : 'good'}">${esc(l.what)}: ${l.v.toLocaleString('pl-PL')} zł</li>`).join('') || '<li class="muted">Brak.</li>'}</ul></div></div>`;
    },
    kkariera() {
      const s = Game.s, C = Career.C(), r = Career.me();
      return `<div class="head"><h2>Kariera</h2><p>Kontrakt: ${r.contract.years} sez. · ${r.contract.sign.toLocaleString('pl-PL')} zł za podpis · ${r.contract.perPoint} zł za punkt${C.agent ? ' · masz agenta' : ''}</p></div>
        ${s.over && C.offers.length ? `<div class="card"><h3>Oferty na nowy sezon</h3>${C.offers.map((o, i) => `<div class="sp-row">${UI.clubTag(o.club)}<div><b>${esc(Game.club(o.club).name)}</b><small>${o.years} sez. · ${o.sign.toLocaleString('pl-PL')} zł za podpis · ${o.perPoint} zł/pkt${o.club === s.user ? ' · obecny klub' : ''}</small></div><button class="go small" data-ui="cOffer" data-v="${i}">Podpisz</button></div>`).join('')}</div>` : ''}
        ${s.over && C.signed ? '<div class="card"><p class="good">Kontrakt podpisany. Kliknij „Nowy sezon”.</p></div>' : ''}
        <div class="grid"><div class="card s6"><h3>Trofea</h3>${C.trophies.length ? `<ul class="list">${C.trophies.map(t => `<li>🏆 ${esc(t)}</li>`).join('')}</ul>` : '<p class="muted">Jeszcze żadnych.</p>'}</div>
          <div class="card s6 tbl"><h3>Historia</h3><table><thead><tr><th>Sezon</th><th>Klub</th><th class="t-r">M</th><th class="t-r">Pkt</th><th class="t-r">Śr./mecz</th></tr></thead><tbody>${C.history.map(h => `<tr><td>${h.season}</td><td>${esc(h.club)}</td><td class="t-r">${h.m}</td><td class="t-r">${h.pts}</td><td class="t-r">${num(h.avg)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Pierwszy sezon trwa.</td></tr>'}</tbody></table></div></div>`;
    },
    kmiasto() { return City.view(); },
    ktydzien() { return City.view(); },
    kliga() { return `<div class="head"><h2>${esc(DATA.LEAGUE)}</h2></div><div class="card">${UI.table(Game.standings(), false)}</div>`; },
  },

  click(d) {
    const s = Game.s, C = Career.C();
    if (City.click(d)) return true;
    switch (d.ui) {
      case 'cTab': Career.tab = d.v; Career.render(); return true;
      case 'cSlot': Career.slot = +d.v; Career.render(); return true;
      case 'cAct': { const i = Career.slot ?? C.plan.findIndex((k, j) => j === 0); C.plan[i] = d.v; Career.slot = (i + 1) % 3; Game.save(); Career.render(); return true; }
      case 'cAdvance': Career.advance(); return true;
      case 'cEv': Career.resolveEvent(+d.v); return true;
      case 'cAfterEv': UI.close(); Career.toMatch(); return true;
      case 'cRide': Career.ride(); return true;
      case 'cSimWeek': UI.close(); Career.finishWeek(null); return true;
      case 'cHome': Walk.startRoom('home', () => { UI.show('mgr'); Career.render(); }); return true;
      case 'cBuy': { const it = Career.DECOR[d.v]; if (C.money >= it.price && !Career.has(d.v)) { Career.pay(-it.price, it.name); C.decor.push(d.v); Game.save(); UI.toast(`${it.name} — gotowe!`); if (Walk.active && Walk.room === 'home') { Walk.enterRoom('home'); Career.shopModal(); } else Career.render(); } return true; }
      case 'cEngine': { const cost = 25000 * C.engine; if (C.money >= cost && C.engine < 5) { Career.pay(-cost, `Silnik poziom ${C.engine + 1}`); C.engine++; Game.save(); Career.render(); } return true; }
      case 'cOffer': Career.acceptOffer(+d.v); Career.render(); return true;
      case 'cNewSeason': Career.newSeason(); Career.render(); UI.toast(`Sezon ${s.season}!`); return true;
      case 'cBar': {
        const P = C.party;
        if (d.v === 'beer') { P.drink++; P.fun++; UI.toast('Piwo. Zabawa +1, alkohol +1.'); }
        if (d.v === 'shots') { P.drink += 2; P.fun += 2; Career.repd(1); if (Math.random() < 0.3) { Career.repd(-5); UI.toast('Ktoś wrzucił filmik, jak tańczysz na barze… reputacja −5.', true); } else UI.toast('Kolejka z kibicami! Zabawa +2, alkohol +2.'); }
        if (d.v === 'water') UI.toast('Woda. Jutro będziesz wdzięczny.');
        UI.close(); return true;
      }
      case 'cRival': {
        C.party.done.rival = 1; UI.close();
        if (d.v === 'joke') { Career.repd(1); C.party.fun++; UI.toast('„Zobaczymy się w pierwszym łuku.” Śmiech całej sali.'); }
        if (d.v === 'fight') { Career.repd(-10); if (Math.random() < 0.3) { Career.me().injury = R.int(1, 2); UI.toast('Bójka! Ochrona cię wyprowadza, a nadgarstek boli… kontuzja.', true); } else UI.toast('Przepychanka i interwencja ochrony. Reputacja −10.', true); }
        if (d.v === 'ignore') UI.toast('Odwróciłeś się. Szkoda nerwów.');
        return true;
      }
      case 'cFans': {
        C.party.done.fans = 1; UI.close();
        if (d.v === 'photo') { Career.repd(2); UI.toast('Zdjęcia z kibicami: reputacja +2.'); }
        if (d.v === 'pill') { C.party.fun += 3; if (Math.random() < 0.3) { C.suspended = 6; Career.repd(-20); UI.toast('Kontrola po meczu wykazała niedozwoloną substancję. Zawieszenie 6 tygodni!', true); } else UI.toast('Noc była szalona… zabawa +3. Oby nikt się nie dowiedział.', true); }
        return true;
      }
    }
    return false;
  },
};

// zdarzenie po imprezie: powrót autem
Career.EV.__drive = {
  t: 'Powrót z imprezy', when: () => false, x: 'Twoje auto stoi pod klubem. Wypiłeś trochę za dużo. Taksówka czeka 20 minut.',
  o: [['Poczekaj na taksówkę (80 zł)', () => { Career.pay(-80, 'Taksówka'); return 'Wróciłeś bezpiecznie. Rozsądnie.'; }],
    ['Prześpij się u kolegi', () => { Career.fat(4); return 'Kanapa u kolegi. Kręgosłup boli, ale głowa czysta.'; }],
    ['Pojadę sam, to tylko kawałek', () => { const x = Math.random(); if (x < 0.35) { Career.pay(-5000, 'Mandat i utrata prawa jazdy'); Career.repd(-15); return 'Policja! Mandat 5000 zł, prawo jazdy zatrzymane, media huczą (reputacja −15).'; } if (x < 0.45) { Career.me().injury = 4; Career.repd(-12); return 'Wypadek na zakręcie. Złamany obojczyk — 4 tygodnie przerwy.'; } return 'Dojechałeś… tym razem. Nikt nie widział. Ale sumienie gryzie.'; }]],
};
