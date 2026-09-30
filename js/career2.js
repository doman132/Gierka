/* =========================================================
   Speedway Empire 3D — KARIERA: wybory moralne, negocjacje
   kontraktów, randka w mieszkaniu
   • Nowe zdarzenia moralne (ustawianie biegu, nielegalne
     paliwo, zastrzyki przeciwbólowe, reality show, pijany
     kumpel, zazdrość, wspólne mieszkanie…).
   • Oferty po sezonie: wybierasz długość umowy (1–3 sezony)
     i negocjujesz kwotę za podpis i za punkt — klub ma
     ograniczoną cierpliwość: przyjmie, spotka się w połowie
     albo wycofa ofertę.
   • Dziewczyna u ciebie w mieszkaniu (3D): kolacja, film,
     a przy bliskiej relacji — wspólna noc (wygaszenie ekranu).
   ========================================================= */
'use strict';

/* ---------- wybory moralne ---------- */
Object.assign(Career.EV, {
  fixing: {
    t: 'Telefon z nieznanego numeru', when: () => Game.s.season >= 1 && Career.inLineup(),
    x: '„Przegraj w niedzielę bieg 13. Nikt się nie dowie. 20 tysięcy w gotówce, od razu.” Po drugiej stronie słychać śmiech.',
    o: [['Odmów i rozłącz się', () => { Career.mor(2); return 'Nie jesteś na sprzedaż. Spokojne sumienie.'; }],
      ['Zgłoś to do federacji', () => { Career.repd(6); City.Z().stress += 10; return 'Federacja wszczęła postępowanie, media cię chwalą (reputacja +6). Ale nerwy są (stres +10).'; }],
      ['Weź pieniądze', () => { Career.pay(20000, 'Nieznany przelew'); if (Math.random() < 0.4) { Career.C().suspended = 20; Career.repd(-40); Career.pay(-30000, 'Kara za korupcję'); return 'Afera wyszła na jaw. Zawieszenie na 20 tygodni, kara 30 000 zł, reputacja zrujnowana.'; } City.Z().stress += 25; return '+20 000 zł. Nikt nic nie wie… na razie. Nie możesz spać (stres +25).'; }]],
  },
  fuel: {
    t: 'Specjalne paliwo', x: 'Mechanik z innego klubu szepcze: „Mam dodatek do metanolu. Niewykrywalny. Dwa koła szybciej na okrążeniu.”',
    o: [['Nie, jadę czysto', () => { Career.grow('mental', 0.2); return 'Zostajesz przy regulaminie.'; }],
      ['Spróbuję raz', () => { Career.C().prep = Math.min(1, (Career.C().prep || 0) + 0.6); if (Math.random() < 0.3) { Career.C().suspended = 6; Career.repd(-15); return 'Kontrola paliwa po meczu: dyskwalifikacja i 6 tygodni zawieszenia.'; } return 'Motocykl jest jak rakieta… w najbliższym meczu.'; }]],
  },
  painkiller: {
    t: 'Zastrzyki przed meczem', when: () => Career.me().injury > 0,
    x: 'Kontuzja jeszcze nie minęła. Lekarz klubu: „Mogę cię nastrzykać, pojedziesz. Ale jak coś się stanie, będzie gorzej.”',
    o: [['Jadę na zastrzykach', () => { const r = Career.me(); r.injury = 0; if (Math.random() < 0.35) { r.injury = 4; Career.mor(-6); return 'Po meczu ból wrócił ze zdwojoną siłą — 4 tygodnie przerwy.'; } Career.repd(3); return 'Wytrzymałeś. Trener: „Charakter!” (reputacja +3).'; }],
      ['Leczę się do końca', () => { Career.mor(-2); return 'Rozsądnie. Zdrowie ważniejsze.'; }]],
  },
  reality: {
    t: 'Reality show', x: 'Telewizja chce nakręcić o tobie program „Życie na krawędzi”: kamery w domu, na imprezach, na torze. 25 000 zł.',
    o: [['Zgadzam się', () => { Career.pay(25000, 'Reality show'); Career.repd(8); City.Z().stress += 15; return 'Jesteś gwiazdą telewizji (reputacja +8), ale prywatność się skończyła (stres +15).'; }],
      ['Nie, kamery są dla toru', () => { Career.grow('mental', 0.15); return 'Zostajesz przy ściganiu.'; }]],
  },
  drunkfriend: {
    t: 'Kumpel za kierownicą', x: 'Kolega wychodzi z baru, ledwo trzyma kluczyki: „Spoko, dojadę.” Obok stoi jego auto.',
    o: [['Zabierz mu kluczyki i odwieź', () => { Career.pay(-60, 'Taksówka dla kumpla'); Career.mor(3); City.Z().energy -= 6; return 'Był zły, rano dziękował.'; }],
      ['To nie twoja sprawa', () => { if (Math.random() < 0.3) { Career.mor(-12); City.Z().stress += 20; return 'Rano wiadomość: wypadek. Kumpel w szpitalu. Nie możesz sobie darować.'; } return 'Dojechał. Tym razem się udało.'; }]],
  },
  jealous: {
    t: 'Zazdrość', when: () => !!City.Z().gf,
    x: () => `${City.Z().gf.name} zobaczyła zdjęcia, jak rozdajesz autografy fankom. „Serio? Wolisz je ode mnie?”`,
    o: [['Porozmawiaj spokojnie, przeproś', () => { City.Z().gf.rel += 8; return 'Wyjaśniliście sobie wszystko. Związek +8.'; }],
      ['„To moja praca, przyzwyczaj się”', () => { City.Z().gf.rel -= 18; City.Z().stress += 8; return 'Trzasnęła drzwiami. Związek −18.'; }]],
  },
  movein: {
    t: 'Wspólne mieszkanie', when: () => City.Z().gf && City.Z().gf.rel >= 80 && !Career.C().livingTogether,
    x: () => `${City.Z().gf.name}: „Może zamieszkamy razem? I tak ciągle u ciebie jestem.”`,
    o: [['Tak, wprowadź się!', () => { Career.C().livingTogether = true; City.Z().gf.rel += 10; Career.mor(6); return 'Mieszkacie razem: codziennie mniej stresu, dom jest przytulniejszy.'; }],
      ['Jeszcze za wcześnie', () => { City.Z().gf.rel -= 10; return 'Zrozumiała… chyba. Związek −10.'; }]],
  },
  junior: {
    t: 'Chłopak ze szkółki', x: 'Czternastolatek ze szkółki nie ma na nowe opony. Rodzice nie mają pieniędzy, a on ma talent.',
    o: [['Kup mu opony (3000 zł)', () => { Career.pay(-3000, 'Opony dla juniora'); Career.repd(5); Career.mor(4); return 'Media lokalne: „Gwiazda pomaga młodym”. Reputacja +5.'; }],
      ['Nie mogę pomagać wszystkim', () => 'Chłopak odchodzi ze spuszczoną głową.']],
  },
  referee: {
    t: 'Wywiad po meczu', x: 'Dziennikarz podsuwa mikrofon: „Sędzia wykluczył cię w powtórce. Co o nim sądzisz?”',
    o: [['Ostro skrytykuj sędziego', () => { Career.repd(2); Career.pay(-2000, 'Kara za wypowiedź'); return 'Kibice cię kochają, federacja nałożyła 2000 zł kary.'; }],
      ['„Sędzia ma prawo do decyzji”', () => { Career.repd(1); return 'Dojrzała odpowiedź.'; }]],
  },
  teammate: {
    t: 'Wina w parku maszyn', x: 'W biegu ty i kolega z drużyny zaczepiliście się. Trener pyta, kto zawinił — a to był twój błąd.',
    o: [['Przyznaj się', () => { Career.mor(-2); Career.repd(3); return 'Trener szanuje uczciwość. Kolega też.'; }],
      ['Zrzuć winę na kolegę', () => { if (Math.random() < 0.5) { Career.repd(-8); return 'Powtórka TV pokazała prawdę. Szatnia ci tego nie zapomni (reputacja −8).'; } Career.mor(1); return 'Uszło ci… na razie.'; }]],
  },
});
// tekst zdarzenia może być funkcją
(() => { const base = Career.showEvent; Career.showEvent = function (k) { const E = Career.EV[k]; if (typeof E.x === 'function') { const f = E.x; E.x = f(); base.call(this, k); E.x = f; return; } base.call(this, k); }; })();

/* ---------- negocjacje kontraktu ---------- */
Object.assign(Career, {
  /** Otwórz negocjacje oferty i (długość, podpis, punkt) */
  negOpen(i) {
    const C = Career.C(), o = C.offers[i]; if (!o) return;
    o.neg = o.neg || { patience: 2 + (C.agent ? 1 : 0) + (o.club === Game.s.user ? 1 : 0), rounds: 0, base: { sign: o.sign, perPoint: o.perPoint } };
    Career._neg = { i, years: o.years, sign: 0, pp: 0 };
    Career.negView();
  },
  negView(note = '') {
    const C = Career.C(), N = Career._neg, o = C.offers[N.i], club = Game.club(o.club);
    const yr = (y, t) => `<button class="opt ${N.years === y ? 'on' : ''}" data-ui="cNeg" data-v="years:${y}">${t}</button>`;
    const up = (k, v, t) => `<button class="opt ${N[k] === v ? 'on' : ''}" data-ui="cNeg" data-v="${k}:${v}">${t}</button>`;
    const want = { sign: Math.round(o.sign * (1 + N.sign) / 1000) * 1000, pp: Math.round(o.perPoint * (1 + N.pp) / 10) * 10 };
    UI.modal(`<div class="row between"><span class="kicker">Negocjacje · ${esc(club.name)}</span><button class="x" data-ui="close">×</button></div>
      <h2>${o.sign.toLocaleString('pl-PL')} zł za podpis · ${o.perPoint} zł/pkt · ${o.years} sez.</h2>
      <p class="small muted">Cierpliwość prezesa: ${'●'.repeat(o.neg.patience)}${'○'.repeat(Math.max(0, 4 - o.neg.patience))}${C.agent ? ' · negocjuje twój agent' : ''}</p>
      ${note ? `<p class="fx">${note}</p>` : ''}
      <div class="box"><h3>Długość umowy</h3><div class="opts">${yr(1, '1 sezon (elastycznie, −5% za podpis)')}${yr(2, '2 sezony')}${yr(3, '3 sezony (bezpieczeństwo, +5% za podpis)')}</div></div>
      <div class="box"><h3>Kwota za podpis</h3><div class="opts">${up('sign', 0, 'Bez zmian')}${up('sign', 0.1, '+10%')}${up('sign', 0.25, '+25%')}${up('sign', 0.5, '+50%')}</div></div>
      <div class="box"><h3>Za punkt</h3><div class="opts">${up('pp', 0, 'Bez zmian')}${up('pp', 0.1, '+10%')}${up('pp', 0.25, '+25%')}</div></div>
      <p>Twoja propozycja: <b>${want.sign.toLocaleString('pl-PL')} zł</b> za podpis, <b>${want.pp} zł</b> za punkt, <b>${N.years}</b> sez.</p>
      <div class="actions"><button class="go" data-ui="cNeg" data-v="send">Wyślij propozycję</button><button class="ghost" data-ui="cNeg" data-v="accept">Przyjmij obecną ofertę</button></div>`);
  },
  negAct(v) {
    const C = Career.C(), N = Career._neg, o = C.offers[N.i], r = Career.me(), s = Game.s; if (!o) return;
    if (v.startsWith('years:')) { N.years = +v.slice(6); return Career.negView(); }
    if (v.startsWith('sign:')) { N.sign = +v.slice(5); return Career.negView(); }
    if (v.startsWith('pp:')) { N.pp = +v.slice(3); return Career.negView(); }
    if (v === 'accept') { if (N.years !== o.years) { o.sign = Math.round(o.sign * (N.years === 1 ? 0.95 : N.years === 3 ? 1.05 : 1) / 1000) * 1000; o.years = N.years; } Career.acceptOffer(N.i); UI.close(); UI.toast(`Podpisane: ${Game.club(o.club).name}, ${o.years} sez.`); Career.render(); return; }
    if (v !== 'send') return;
    // siła negocjacyjna: KSM, reputacja, agent, liczba ofert
    const S = r.season, avg = S && S.m ? (S.pts + S.bonus) / S.m : r.ksm, power = avg / 10 + C.rep / 150 + (C.agent ? 0.15 : 0) + (C.offers.length - 1) * 0.06;
    const ask = N.sign + N.pp * 0.8 + (N.years === 1 ? 0.05 : N.years === 3 ? -0.05 : 0); // dłuższa umowa = klub chętniej dopłaci
    const pAccept = R.clamp(0.95 - ask * 2.2 + power * 0.6 - o.neg.rounds * 0.08, 0.02, 0.98);
    o.neg.rounds++;
    const yMul = N.years === 1 ? 0.95 : N.years === 3 ? 1.05 : 1;
    if (Math.random() < pAccept) {
      o.sign = Math.round(o.sign * (1 + N.sign) * yMul / 1000) * 1000; o.perPoint = Math.round(o.perPoint * (1 + N.pp) / 10) * 10; o.years = N.years;
      Game.save(); Career._neg = { i: N.i, years: o.years, sign: 0, pp: 0 };
      return Career.negView(`<span class="good">Prezes: „Dobrze, zgoda.”</span> Nowe warunki są na stole — możesz je przyjąć.`);
    }
    o.neg.patience--;
    if (o.neg.patience <= 0 && o.club !== s.user) {
      C.offers.splice(N.i, 1); Game.save(); UI.close(); Career.render();
      UI.toast(`${Game.club(o.club).name} wycofuje ofertę — „Za wysokie wymagania.”`, true); return;
    }
    // kontrpropozycja: w połowie drogi
    const half = x => x / 2;
    o.sign = Math.round(o.sign * (1 + half(N.sign)) / 1000) * 1000; o.perPoint = Math.round(o.perPoint * (1 + half(N.pp)) / 10) * 10; o.years = N.years;
    if (o.club === s.user && o.neg.patience <= 0) { o.neg.patience = 0; }
    Game.save(); Career._neg = { i: N.i, years: o.years, sign: 0, pp: 0 };
    Career.negView(`<span class="neg">Prezes: „Tyle nie dam.”</span> Kontrpropozycja: ${o.sign.toLocaleString('pl-PL')} zł za podpis, ${o.perPoint} zł/pkt. ${o.neg.patience > 0 ? 'Możesz dalej negocjować albo przyjąć.' : 'To ostatnie słowo klubu.'}`);
  },
});

/* ---------- randka w mieszkaniu ---------- */
Object.assign(City, {
  homeDate() {
    const Z = City.Z(); if (!Z.gf) return;
    if (City.weekDone()) { UI.toast('Tydzień za tobą — w niedzielę mecz.', true); return; }
    City._homeDate = true; if (Walk.active) Walk.stop(); UI.show('mgr');
    City.enter('dom'); UI.toast(`${Z.gf.name} przyszła do ciebie ❤ Podejdź do niej (E).`);
  },
  dateAct(k) {
    const Z = City.Z(), G = Z.gf, C = Career.C(); if (!G) return;
    const done = msg => { City.clamp(Z); G.rel = R.clamp(G.rel, 0, 100); G.lastDate = Game.s.week; City.pay(Z, { n: `Randka w domu (${G.name})` }, msg); };
    if (k === 'talk') { UI.modal(`<div class="row between"><span class="kicker">Twoje mieszkanie</span><button class="x" data-ui="close">×</button></div><h2>${esc(G.name)} ❤ ${Math.round(G.rel)}%</h2>
      <p class="muted">${Crowd.pick(['Rozgląda się po mieszkaniu i się uśmiecha.', 'Siada wygodnie i patrzy na ciebie.', '„Ładnie tu masz… jak na żużlowca.”'])}</p>
      <div class="talk-opts"><button class="opt" data-ui="cityDate" data-v="dinner">Ugotujmy razem kolację (60 zł)</button><button class="opt" data-ui="cityDate" data-v="movie">Film na kanapie</button>
      ${G.rel >= 70 ? '<button class="opt" data-ui="cityDate" data-v="night">Zostań dziś na noc… ❤</button>' : '<p class="small muted">Jeszcze nie jesteście aż tak blisko (związek 70%+).</p>'}
      <button class="opt" data-ui="cityDate" data-v="bye">Odprowadź ją do drzwi</button></div>`); return; }
    UI.close();
    if (k === 'dinner') { if (C.money < 60) { UI.toast('Za mało pieniędzy.', true); return; } Career.pay(-60, 'Kolacja we dwoje'); G.rel += 10; Z.food += 40; Z.stress -= 10; Career.mor(3); done(`Spaghetti, świece i śmiech przy garnkach. Związek +10, jedzenie +40.`); }
    if (k === 'movie') { G.rel += 8; Z.stress -= 14; done(`Film na kanapie${Career.has('tv') ? ' na dużym telewizorze' : ' na laptopie'} — zasnęła ci na ramieniu. Związek +8.`); }
    if (k === 'bye') { City._homeDate = false; G.rel += 2; UI.toast(`${G.name}: „Było super. Napisz jutro!”`); if (Walk.active && Walk.room === 'home') { const keep = [Walk.x, Walk.z, Walk.yaw, Walk.pitch]; Walk.enterRoom('home'); [Walk.x, Walk.z, Walk.yaw, Walk.pitch] = keep; } }
    if (k === 'night') {
      // bliskość pokazana taktownie: wygaszenie ekranu, noc razem, poranek
      let ov = document.getElementById('sleepov'); if (!ov) { ov = document.createElement('div'); ov.id = 'sleepov'; document.body.appendChild(ov); }
      ov.innerHTML = '<div><b>❤</b><small>Światło gaśnie…</small></div>'; ov.className = 'on'; setTimeout(() => ov.classList.add('dark'), 900);
      setTimeout(() => {
        G.rel += 15; Z.stress -= 25; Career.mor(8); G.lastDate = Game.s.week; G.nights = (G.nights || 0) + 1;
        City._homeDate = false; City.endDay();
        ov.innerHTML = `<div><b>Poranek</b><small>${esc(G.name)} robi kawę i nuci pod nosem. Związek +15, stres −25.</small></div>`;
      }, 2600);
      setTimeout(() => { ov.className = ''; if (Walk.active && Walk.room === 'home') { const keep = [Walk.x, Walk.z]; Walk.enterRoom('home'); [Walk.x, Walk.z] = keep; } }, 5600);
    }
  },
});

/* ---------- podpięcia ---------- */
(() => {
  // zakładka Kariera: przycisk negocjacji przy ofertach
  const baseK = Career.views.kkariera;
  Career.views.kkariera = function () {
    let html = baseK.call(this);
    return html.replace(/<button class="go small" data-ui="cOffer" data-v="(\d+)">Podpisz<\/button>/g, '<button class="ghost small" data-ui="cNegOpen" data-v="$1">Negocjuj</button><button class="go small" data-ui="cOffer" data-v="$1">Podpisz</button>');
  };
  const baseC = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cNegOpen') { Career.negOpen(+d.v); return true; }
    if (d.ui === 'cNeg') { Career.negAct(d.v); return true; }
    if (d.ui === 'cityDate') { City.dateAct(d.v); return true; }
    return baseC.call(this, d);
  };
  // miejsca akcji randki
  const baseRA = Career.roomAct;
  Career.roomAct = function (id) { if (id.startsWith('d:')) { City.dateAct(id.slice(2)); return true; } return baseRA.call(this, id); };
  // w mieszkaniu: dziewczyna (randka albo wspólne mieszkanie)
  const baseEnter = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    baseEnter.call(this, key);
    if (key !== 'home' || !Game.s || Game.s.mode !== 'career') return;
    const Z = City.Z(), C = Career.C(); if (!Z.gf || !(City._homeDate || C.livingTogether) || !Humans.ready) return;
    const R = World.rooms.home, Y = World.LOCKER_Y, gp = Z.gf.pid && City.person(Z.gf.pid), sofa = Career.has('sofa');
    const m = Humans.make(City.gfKey ? City.gfKey() : (gp ? gp.key : 'Female_Adult_04'), sofa ? 'sit' : 'idle', { sex: 'f' });
    if (!m) return;
    if (sofa) { m.position.set(R.cx + 2.4, Y, -0.95); m.rotation.y = Math.PI / 2; } else { m.position.set(R.cx + 0.6, Y, -0.6); m.rotation.y = -Math.PI / 2; }
    Rooms.add(m);
    const t = World.nameTag('❤ ' + Z.gf.name, '#d0508a'); t.position.set(m.position.x, Y + (sofa ? 1.7 : 2.1), m.position.z); t.scale.set(2.2, 0.55, 1); Rooms.add(t);
    Walk.spots.push({ id: 'd:talk', x: m.position.x, z: m.position.z - (sofa ? 1.1 : -1), label: `${Z.gf.name} — spędźcie razem czas`, r: 1.6 });
  };
  // telefon: zaproś do siebie
  const baseRender = City.phoneRender;
  City.phoneRender = function () {
    baseRender.call(this);
    const el = document.getElementById('phone'), Z = City.Z();
    if (el && City.app === 'call:gf' && Z.gf) { const box = el.querySelector('.ph-call'); if (box && !box.querySelector('[data-v="do:gf:home"]')) box.insertAdjacentHTML('beforeend', `<button data-ui="ph" data-v="do:gf:home" ${Z.gf.rel < 45 ? 'disabled title="Za wcześnie (związek 45%+)"' : ''}>Zaproś do siebie (mieszkanie)</button>`); }
  };
  const baseDo = City.phoneDo;
  City.phoneDo = function (v) { if (v === 'do:gf:home') { City.phoneToggle(); City.homeDate(); return; } return baseDo.call(this, v); };
  // mieszkanie razem: codziennie trochę mniej stresu
  const baseEnd = City.endDay;
  City.endDay = function (auto) { if (Career.C().livingTogether && City.Z().gf) { City.Z().stress -= 4; City.Z().gf.rel = Math.min(100, City.Z().gf.rel + 1); } return baseEnd.call(this, auto); };
})();
