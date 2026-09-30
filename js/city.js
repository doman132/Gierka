/* =========================================================
   Speedway Empire 3D — MIASTO (kariera zawodnika)
   Mapa miasta z miejscami, po których chodzi twój żużlowiec:
   dom, tor, siłownia, restauracja, bar „Pod Taśmą”, park
   i kawiarnia (randki), kasyno, psycholog, klub.
   Tydzień = 6 dni × 3 pory (rano, po południu, wieczorem),
   w niedzielę mecz. Każde zajęcie zabiera jedną porę.
   Trzy paski stanu wpływają na jazdę w meczu:
     • Energia  — mało: słabsza wytrzymałość i prędkość
     • Jedzenie — głodny albo przejedzony: gorsza prędkość
     • Stres    — wysoki: gorsza reakcja na taśmę i psychika,
                  niski: lepszy start
   ========================================================= */
'use strict';

const City = {
  DAYS: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
  SLOTS: ['rano', 'po południu', 'wieczorem'],
  GIRLS: ['Julia', 'Zuzanna', 'Maja', 'Lena', 'Oliwia', 'Natalia', 'Wiktoria', 'Amelia', 'Kinga', 'Martyna', 'Paulina', 'Karolina'],

  // miejsca na mapie (układ 1000 × 600)
  PLACES: {
    dom: { name: 'Twoje mieszkanie', icon: '🏠', x: 150, y: 455, c: '#6b8fb8' },
    tor: { name: 'Stadion i tor', icon: '🏁', x: 520, y: 175, c: '#E0632E' },
    silownia: { name: 'Siłownia „Power”', icon: '🏋️', x: 285, y: 205, c: '#3aa56b' },
    restauracja: { name: 'Restauracja „Pit Stop”', icon: '🍽️', x: 345, y: 470, c: '#c9a227' },
    bar: { name: 'Bar „Pod Taśmą”', icon: '🍺', x: 690, y: 455, c: '#b8272e' },
    park: { name: 'Park i kawiarnia', icon: '☕', x: 845, y: 265, c: '#2e8b57' },
    kasyno: { name: 'Kasyno „Złoty Kask”', icon: '🎰', x: 880, y: 485, c: '#7a3cc8' },
    psycholog: { name: 'Gabinet psychologa', icon: '🧠', x: 120, y: 175, c: '#4a7ab8' },
    klub: { name: 'Klub — biuro i kibice', icon: '🏟️', x: 660, y: 300, c: '#1F4FB0' },
  },

  /* ---------- stan ---------- */
  Z() {
    const C = Career.C();
    if (!C.city) C.city = { day: 0, slot: 0, loc: 'dom', energy: 80, food: 70, stress: 30, gf: null, casino: { net: 0, visits: 0 }, junk: 0, log: [], wk: Game.s.week };
    const Z = C.city;
    if (Z.wk !== Game.s.week) { Z.day = 0; Z.slot = 0; Z.loc = 'dom'; Z.log = []; Z.wk = Game.s.week; Z.junk = 0; }
    return Z;
  },
  clamp(Z) { ['energy', 'food', 'stress'].forEach(k => { Z[k] = R.clamp(Z[k], 0, 100); }); const r = Career.me(); r.fatigue = R.clamp(100 - Z.energy, 0, 100); },
  weekDone() { const Z = City.Z(); return Z.day > 5; },

  /** Wpływ pasków na jazdę (dodawane w Career.effMods) */
  mods() {
    const C = Career.C(); if (!C || !C.city) return { speed: 0, start: 0, stamina: 0, mental: 0 };
    const Z = C.city, e = Z.energy, f = Z.food, st = Z.stress;
    return {
      speed: (f < 30 ? -(30 - f) * 0.03 : 0) + (f >= 50 && f <= 90 ? 0.15 : 0) + (f > 95 ? -0.25 : 0) + (e < 30 ? -(30 - e) * 0.03 : 0) - Z.junk * 0.15,
      start: st > 55 ? -(st - 55) * 0.035 : st < 25 ? 0.35 : 0,
      stamina: e < 45 ? -(45 - e) * 0.05 : e > 80 ? 0.2 : 0,
      mental: st > 60 ? -(st - 60) * 0.04 : st < 30 ? 0.2 : 0,
    };
  },
  modsHtml() {
    const m = City.mods(), names = { speed: 'Prędkość', start: 'Start', stamina: 'Wytrzymałość', mental: 'Psychika' };
    const parts = Object.entries(m).filter(([, v]) => Math.abs(v) >= 0.05).map(([k, v]) => `<span class="${v > 0 ? 'good' : 'neg'}">${names[k]} ${v > 0 ? '+' : '−'}${num(Math.abs(v), 2)}</span>`);
    return parts.length ? parts.join(' · ') : '<span class="muted">bez wpływu — dobra dyspozycja</span>';
  },

  /* ---------- zajęcia ---------- */
  ACTS: {
    dom: [
      { id: 'cook', n: 'Ugotuj zdrowy posiłek', d: 'jedzenie +45, energia +4', money: 35 },
      { id: 'nap', n: 'Drzemka', d: 'energia +22' },
      { id: 'chill', n: 'Wieczór z serialem / konsolą', d: 'stres −12 (z TV i konsolą −20)' },
      { id: 'enter', n: 'Wejdź do mieszkania (3D)', d: 'urządzanie, laptop, trofea — nie zabiera czasu', free: true },
      { id: 'sleep', n: 'Idź spać — koniec dnia', d: 'energia wraca (lepiej z porządnym łóżkiem)', free: true },
    ],
    tor: [
      { id: 'train', n: 'Trening z trenerem', d: 'start i łuki w górę · energia −24', inj: true },
      { id: 'ride', n: 'Jazda treningowa — prowadzisz sam (3D)', d: 'im lepszy czas, tym większe postępy · energia −20', inj: true },
      { id: 'engine', n: 'Praca przy silniku z mechanikiem', d: 'szybszy motocykl w najbliższym meczu', money: 2500 },
    ],
    silownia: [
      { id: 'weights', n: 'Trening siłowy', d: 'wytrzymałość i prędkość w górę · energia −26' },
      { id: 'cardio', n: 'Kondycja i rozciąganie', d: 'wytrzymałość +, stres −8 · energia −14' },
      { id: 'sauna', n: 'Sauna i basen', d: 'stres −14, energia +6', money: 40 },
    ],
    restauracja: [
      { id: 'meal', n: 'Obiad sportowca', d: 'jedzenie +55, stres −4', money: 90 },
      { id: 'fast', n: 'Fast food', d: 'jedzenie +40 — ale ciężki żołądek w meczu (prędkość −0,15)', money: 25 },
    ],
    bar: [
      { id: 'beer', n: 'Piwo z chłopakami', d: 'stres −14, energia −6, jutro trochę gorzej', money: 30 },
      { id: 'meet', n: 'Rozejrzyj się — poznaj kogoś', d: 'szansa na znajomość (zależy od reputacji i nastroju)', money: 40, noGf: true },
      { id: 'party', n: 'Impreza w klubie „Taśma” (3D)', d: 'zabawa… i konsekwencje', money: 300 },
    ],
    park: [
      { id: 'walk', n: 'Spacer po parku', d: 'stres −8, energia −4' },
      { id: 'coffee', n: 'Kawa i ciastko', d: 'jedzenie +10, stres −4', money: 15 },
      { id: 'date', n: 'Randka', d: 'stres −18, związek +12', money: 160, gf: true },
      { id: 'meetc', n: 'Zagadaj do kogoś w kawiarni', d: 'szansa na znajomość', money: 15, noGf: true },
    ],
    kasyno: [
      { id: 'roulette', n: 'Ruletka', d: 'czerwone/czarne ×2, liczba ×36 — ryzyko!' },
      { id: 'slots', n: 'Automaty (100 zł)', d: 'szybka gra, zwykle przegrana', money: 100 },
    ],
    psycholog: [
      { id: 'therapy', n: 'Sesja z psychologiem sportowym', d: 'stres −28, psychika w górę', money: 1500 },
      { id: 'breath', n: 'Warsztat oddechowy', d: 'stres −12', money: 300 },
    ],
    klub: [
      { id: 'sponsor', n: 'Sesja dla sponsora', d: 'pieniądze i rozpoznawalność · stres +3' },
      { id: 'fans', n: 'Spotkanie z kibicami', d: 'reputacja +3, stres −2' },
      { id: 'coach', n: 'Rozmowa z trenerem o składzie', d: 'jakie masz szanse na mecz' },
    ],
  },

  /** Wykonaj zajęcie: zabiera porę dnia (chyba że free) */
  act(place, id) {
    const s = Game.s, C = Career.C(), Z = City.Z(), r = Career.me();
    const A = (City.ACTS[place] || []).find(a => a.id === id); if (!A) return;
    if (!A.free && City.weekDone()) { UI.toast('Tydzień dobiegł końca — kliknij „Zakończ tydzień”.', true); return; }
    if (A.inj && r.injury) { UI.toast('Kontuzja — lekarz nie pozwala jeździć.', true); return; }
    if (A.money && C.money < A.money) { UI.toast('Za mało pieniędzy.', true); return; }
    if (!A.free && Z.energy < 8 && !['nap', 'cook', 'meal', 'coffee', 'fast'].includes(id)) { UI.toast('Brak sił. Zjedz coś albo się prześpij.', true); return; }
    if (A.money) Career.pay(-A.money, A.n);
    let msg = '';
    const g = (k, x) => Career.grow(k, x * (0.6 + Z.energy / 250) * (Z.food < 25 ? 0.6 : 1)); // głodny i zmęczony — trening mniej daje
    switch (id) {
      case 'cook': Z.food += Career.has('kitchen') ? 55 : 45; Z.energy += 4; msg = 'Makaron z kurczakiem i warzywami. Najedzony.'; break;
      case 'nap': Z.energy += 22; Z.food -= 6; msg = 'Godzinka snu — energia +22.'; break;
      case 'chill': { const v = (Career.has('tv') ? 5 : 0) + (Career.has('console') ? 3 : 0); Z.stress -= 12 + v; Career.mor(2); msg = `Luz. Stres −${12 + v}.`; break; }
      case 'enter': Walk.startRoom('home', () => { UI.show('mgr'); Career.render(); }); return;
      case 'sleep': if (City.weekDone()) return; Walk.startRoom('home', () => { UI.show('mgr'); Career.render(); }); City._autoSleep = true; setTimeout(() => City.sleepScene(), 1200); return;
      case 'train': msg = [g('start', 0.3), g('bends', 0.3)].filter(Boolean).join(' ') || 'Solidny trening: starty i łuki.'; Z.energy -= 24; Z.food -= 14; Z.stress -= 4; break;
      case 'ride': City.ridePractice(); return;
      case 'engine': C.prep = Math.min(0.6, C.prep + 0.3); msg = 'Silniki dopieszczone na mecz.'; Z.energy -= 6; break;
      case 'weights': msg = [g('stamina', 0.4 * (Career.has('homegym') ? 1.1 : 1)), g('speed', 0.14)].filter(Boolean).join(' ') || 'Ciężki trening siłowy.'; Z.energy -= 26; Z.food -= 16; Z.stress -= 3; break;
      case 'cardio': msg = g('stamina', 0.22) || 'Kondycja zrobiona.'; Z.energy -= 14; Z.food -= 8; Z.stress -= 8; break;
      case 'sauna': Z.stress -= 14; Z.energy += 6; msg = 'Mięśnie rozluźnione.'; break;
      case 'meal': Z.food += 55; Z.stress -= 4; msg = 'Grillowany łosoś, ryż, warzywa. Paliwo na trening.'; break;
      case 'fast': Z.food += 40; Z.junk = 1; msg = 'Burger i frytki. Smaczne… ciężkie.'; break;
      case 'beer': Z.stress -= 14; Z.energy -= 6; C.drink = Math.min(3, (C.drink || 0) + 1); msg = 'Dwa piwa, dużo śmiechu. Stres −14.'; if (Math.random() < 0.12) { Career.repd(-3); msg += ' Ktoś wrzucił zdjęcie z baru w przeddzień treningu (reputacja −3).'; } break;
      case 'meet': case 'meetc': msg = City.meet(id === 'meet' ? 0.25 : 0.18); Z.energy -= 4; break;
      case 'party': C.party = { fun: 0, drink: 0, done: {} }; UI.toast('Impreza! Chodź po klubie (E przy barze, parkiecie, ludziach). Wyjście — drzwi.');
        Walk.startRoom('party', () => City.afterParty()); return;
      case 'walk': Z.stress -= 8; Z.energy -= 4; msg = 'Liście, kaczki, spokój.'; if (Z.gf) { Z.gf.rel += 3; msg += ` ${Z.gf.name} dołączyła na spacer.`; } break;
      case 'coffee': Z.food += 10; Z.stress -= 4; msg = 'Flat white i sernik.'; break;
      case 'date': { const G = Z.gf; if (!G) return; G.rel += 12; G.lastDate = s.week; Z.stress -= 18; Career.mor(3); msg = `Randka z ${G.name}. ${Crowd.pick(['Kino i spacer nad rzeką.', 'Kolacja przy świecach — ona śmieje się z twoich historii z parku maszyn.', 'Kręgle — przegrałeś, ale nikt nie liczył.', 'Wieczór w jej ulubionej knajpce.'])} Związek +12.`; break; }
      case 'roulette': City.rouletteModal(); return;
      case 'slots': { Z.casino.visits++; const w = Math.random(); let win = 0; if (w < 0.03) win = 1500; else if (w < 0.15) win = 250; else if (w < 0.3) win = 100; if (win) Career.pay(win, 'Automaty — wygrana'); Z.casino.net += win - 100; Z.stress += win ? -4 : 5; msg = win ? `Wygrana ${win} zł!` : 'Bębny się kręcą… nic.'; City.casinoRisk(Z); City.pay(Z, A, msg, true); return; }
      case 'therapy': Z.stress -= 28; msg = Career.grow('mental', 0.4) || 'Poukładane myśli.'; Career.mor(3); break;
      case 'breath': Z.stress -= 12; msg = 'Oddech 4-7-8 przed taśmą. Działa.'; break;
      case 'sponsor': { const v = 600 + C.rep * 55; Career.pay(v, 'Sesja dla sponsora'); Career.repd(1); Z.energy -= 6; Z.stress += 3; msg = `+${v} zł za sesję zdjęciową.`; break; }
      case 'fans': Career.repd(3); Career.mor(2); Z.energy -= 6; Z.stress -= 2; msg = 'Autografy, zdjęcia, dzieciaki w twoich barwach. Reputacja +3.'; break;
      case 'coach': msg = Career.inLineup() ? '„Jesteś w składzie. Nie zawiedź w pierwszym łuku.”' : '„Na razie jesteś poza składem. Pokaż coś na treningu.”'; Career.mor(1); Z.energy -= 2; break;
    }
    City.pay(Z, A, msg);
  },
  /** Po zajęciu: pora dnia mija, jedzenie spada, zapis do dziennika */
  pay(Z, A, msg, noTime) {
    if (A && A.free) return;
    if (!noTime) { Z.food -= 6; Z.slot++; }
    if (msg) { Z.log.push(`${City.DAYS[Math.min(5, Z.day)].slice(0, 3)}: ${A ? A.n : ''} — ${msg}`); UI.toast(msg); }
    if (Z.food < 15) Z.stress += 4; // głód denerwuje
    City.clamp(Z);
    if (Z.slot >= 3) City.endDay(true);
    Game.save(); Career.render();
  },
  /** Sen: nowy dzień */
  endDay(auto) {
    const Z = City.Z(), C = Career.C();
    if (Z.day > 5) return;
    const bed = Career.has('bed') ? 12 : 0;
    Z.energy += 36 + bed - Math.max(0, Z.stress - 60) / 4 - (C.drink || 0) * 8;
    Z.food -= 22; Z.stress -= 4 + (Z.gf && Z.gf.rel > 65 ? 4 : 0);
    if (Z.stress > 65) Career.mor(-2);
    C.drink = Math.max(0, (C.drink || 0) - 1);
    Z.day++; Z.slot = 0; Z.loc = 'dom';
    City.clamp(Z);
    if (auto) UI.toast(Z.day > 5 ? 'Sobota wieczór — tydzień za tobą. Kliknij „Zakończ tydzień”.' : `${City.DAYS[Z.day]}. Nowy dzień — energia ${Math.round(Z.energy)}.`);
    Game.save(); Career.render();
  },
  /** Koniec tygodnia: niewykorzystane dni — w domu (jedzenie z domu) */
  finishDays() {
    const Z = City.Z(), C = Career.C();
    while (Z.day <= 5) { if (Z.food < 60) { Z.food += 45; Career.pay(-35, 'Jedzenie w domu'); } Z.stress -= 2; City.endDay(); }
    // związek: bez randki w tygodniu słabnie
    if (Z.gf) {
      if (Z.gf.lastDate !== Game.s.week) Z.gf.rel -= 7;
      if (Z.gf.rel < 15) { Z.log.push(`${Z.gf.name} zerwała z tobą — „Ciągle tylko ten żużel…”.`); Z.stress += 25; Career.mor(-8); Z.gf = null; }
    }
    City.clamp(Z);
    return Z.log.slice();
  },
  /** Po meczu: zmęczenie i stres zależny od wyniku */
  afterMatch(lm) {
    const Z = City.Z();
    Z.energy -= 30; Z.food -= 20;
    if (lm) { const r = Career.me(), exp = r.ksm * lm.heats / 5, diff = lm.pts + lm.bonus - exp; Z.stress += diff < -1 ? 12 : diff > 1 ? -8 : 2; }
    Z.junk = 0; City.clamp(Z);
  },

  meet(base) {
    const Z = City.Z(), C = Career.C(), r = Career.me();
    if (Z.gf) return 'Masz już kogoś.';
    const ch = base + C.rep / 250 + (Z.stress < 45 ? 0.1 : -0.05) + (r.morale - 60) / 300;
    if (Math.random() < ch) {
      const name = Crowd.pick(City.GIRLS);
      Z.gf = { name, rel: 35, lastDate: Game.s.week, met: Game.s.week };
      Career.mor(4); Z.stress -= 6;
      return `Poznałeś ${name}. Wymieniliście się numerami — umów się na randkę w parku!`;
    }
    return Crowd.pick(['Nic z tego — dziś nie twój wieczór.', 'Rozmowa się nie kleiła.', 'Miała już chłopaka… kibica rywali.', 'Uśmiechnęła się, ale wyszła z koleżankami.']);
  },
  casinoRisk(Z) {
    if (Math.random() < 0.08) { Career.repd(-3); UI.toast('Paparazzi przed kasynem: „Żużlowiec przegrywa pensję?” (reputacja −3).', true); }
    if (Z.casino.visits >= 8 && !Z.casino.warned) { Z.casino.warned = true; Z.stress += 10; UI.toast('Trener słyszał, że często bywasz w kasynie. Rozmowa nie była miła (stres +10).', true); }
  },
  rouletteModal() {
    const C = Career.C(), bets = [100, 500, 2000].filter(v => C.money >= v);
    if (!bets.length) { UI.toast('Za mało pieniędzy na stół.', true); return; }
    UI.modal(`<div class="row between"><span class="kicker">Kasyno „Złoty Kask”</span><button class="x" data-ui="close">×</button></div><h2>Ruletka</h2>
      <p class="muted small">Masz ${C.money.toLocaleString('pl-PL')} zł. Wybierz stawkę i zakład.</p>
      <div class="opts">${bets.map(v => `<button class="opt ${City._bet === v ? 'on' : ''}" data-ui="cityBet" data-v="${v}">${v} zł</button>`).join('')}</div>
      <div class="actions"><button class="go" data-ui="citySpin" data-v="red" style="background:#b8272e">Czerwone ×2</button><button class="go" data-ui="citySpin" data-v="black" style="background:#1b1b1f">Czarne ×2</button><button class="ghost" data-ui="citySpin" data-v="num">Liczba 7 ×36</button></div>`);
    if (!City._bet || !bets.includes(City._bet)) City._bet = bets[0];
  },
  spin(kind) {
    const C = Career.C(), Z = City.Z(), bet = City._bet || 100;
    if (C.money < bet) { UI.toast('Za mało pieniędzy.', true); return; }
    const n = Math.floor(Math.random() * 37), red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n);
    const win = kind === 'red' ? (n && red) : kind === 'black' ? (n && !red) : n === 7, gain = win ? bet * (kind === 'num' ? 35 : 1) : -bet;
    Career.pay(gain, win ? 'Ruletka — wygrana' : 'Ruletka — przegrana');
    Z.casino.net += gain; Z.casino.visits++; Z.stress += win ? -6 : 7 + Math.round(bet / 500);
    UI.close();
    City.pay(Z, { n: 'Ruletka' }, `Kulka: ${n} ${n === 0 ? 'zielone' : red ? 'czerwone' : 'czarne'} — ${win ? `wygrywasz ${gain.toLocaleString('pl-PL')} zł!` : `przegrywasz ${bet} zł.`}`, true);
    City.casinoRisk(Z);
  },

  /** Jazda treningowa w 3D: twój zawodnik na torze klubu (z trzema sparingpartnerami) */
  ridePractice() {
    const s = Game.s, C = Career.C(), Z = City.Z();
    s.practice = { rider: C.me, rivals: 2, weather: 'dry', prep: 'hard', best: (s.practice && s.practice.best) || [] };
    City._riding = true; Z.energy -= 20; Z.food -= 10; City.clamp(Z);
    Practice.start();
  },
  /** Wynik jazdy treningowej → postępy (lepszy czas i brak upadku = więcej) */
  afterPractice(st) {
    const me = st.riders.find(x => x.human), Z = City.Z();
    City._riding = false;
    let msg;
    if (me.status === 'done') {
      const pos = Sim.order(st).indexOf(me) + 1, k = pos === 1 ? 0.45 : pos === 2 ? 0.35 : 0.25;
      msg = [Career.grow('start', k), Career.grow('bends', k), Career.grow('speed', k * 0.4)].filter(Boolean).join(' ') || 'Dobre kółka — czujesz tor coraz lepiej.';
      Z.stress -= pos === 1 ? 8 : 2;
    } else if (me.status === 'fell') { msg = 'Upadek na treningu — obolały, ale cały. Stres +6.'; Z.stress += 6; if (Math.random() < 0.08) { Career.me().injury = 1; msg += ' Stłuczony bark: tydzień przerwy.'; } }
    else msg = 'Trening przerwany.';
    City.pay(Z, { n: 'Jazda treningowa' }, msg);
    return msg;
  },
  afterParty() {
    const C = Career.C(), P = C.party, Z = City.Z();
    Career.mor(2 + P.fun * 2); C.drink = Math.min(3, (C.drink || 0) + P.drink);
    Z.stress -= 10 + P.fun * 3; Z.energy -= 12 + P.drink * 4; Z.food -= 5;
    UI.show('mgr');
    City.pay(Z, { n: 'Impreza' }, `Impreza: zabawa ${P.fun}, alkohol ${P.drink}${P.drink >= 2 ? ' — jutro kac' : ''}.`);
    if (P.drink >= 2) City.endDay(); // noc zarwana
    if (P.drink >= 2) { C.eventDone = true; Career.showEvent('__drive'); }
  },

  /**
   * Sen w łóżku (3D): postać kładzie się na łóżku i oddycha, ekran gaśnie („Śpisz…”),
   * rano energia wraca (porządne łóżko daje więcej) i zaczyna się kolejny dzień.
   */
  sleepScene() {
    if (City.weekDone()) { UI.toast('Tydzień za tobą — w niedzielę mecz. Kliknij „Zakończ tydzień”.'); return; }
    if (City._sleeping) return; City._sleeping = true;
    const R = World.rooms.home, Y = World.LOCKER_Y, bedZ = Career.has('bed') ? -4.7 : -4.6;
    let fig = null;
    if (Humans.ready) {
      // postać leży na plecach, głową do ściany (−z); model patrzy w +x, więc obrót o 90° wokół z i −90° wokół y
      const h = Humans.make('Male_Adult_17', 'idle', { clip: 'idle_breathe_01', speed: 0.6 });
      h.rotation.z = Math.PI / 2;
      fig = new THREE.Group(); fig.add(h); fig.rotation.y = -Math.PI / 2;
      fig.position.set(R.cx - 4.8, Y + (Career.has('bed') ? 0.57 : 0.5), bedZ + 0.95);
      World.venueGroup.add(fig);
    }
    // kamera: z boku łóżka, lekko z góry
    Walk.x = R.cx - 2.6; Walk.z = bedZ + 1.2; Walk.yaw = Math.atan2(-((R.cx - 4.8) - Walk.x), -((bedZ + 0.3) - Walk.z)); Walk.pitch = -0.45;
    let ov = document.getElementById('sleepov');
    if (!ov) { ov = document.createElement('div'); ov.id = 'sleepov'; document.body.appendChild(ov); }
    const Z = City.Z(), before = Math.round(Z.energy);
    ov.innerHTML = '<div><b>Śpisz…</b><small>💤</small></div>'; ov.className = 'on';
    setTimeout(() => ov.classList.add('dark'), 1600);
    setTimeout(() => {
      City.endDay();
      const after = Math.round(City.Z().energy);
      ov.innerHTML = `<div><b>${City.weekDone() ? 'Niedziela — dzień meczu' : City.DAYS[City.Z().day] + ', rano'}</b><small>Energia ${before} → ${after}${Career.has('bed') ? ' (porządne łóżko)' : ''}</small></div>`;
    }, 3200);
    setTimeout(() => {
      ov.className = ''; City._sleeping = false;
      if (fig && fig.parent) fig.parent.remove(fig);
      Walk.x = R.cx - 4.8; Walk.z = -2.1; Walk.pitch = -0.1;
      if (City._autoSleep) { City._autoSleep = false; Walk.leaveRoom(); } // ze snu wywołanego z mapy wracamy do miasta
    }, 5600);
  },

  /* ---------- widok ---------- */
  view() {
    const C = Career.C(), Z = City.Z(), r = Career.me(), P = City.PLACES, sel = City.sel || Z.loc;
    const done = City.weekDone();
    const bar = (label, v, cls, tip) => `<div class="cbar ${cls}" title="${tip}"><span>${label}</span><div><i style="width:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></div>`;
    const node = (k, p) => {
      const here = Z.loc === k, on = sel === k;
      return `<g class="cnode ${on ? 'on' : ''}" data-ui="cityGo" data-v="${k}" transform="translate(${p.x} ${p.y})">
        <circle r="${on ? 34 : 29}" fill="${p.c}" /><text class="ic" y="10" text-anchor="middle">${p.icon}</text>
        <rect x="-78" y="38" width="156" height="24" rx="12" class="lbl" /><text y="55" text-anchor="middle" class="nm">${esc(p.name)}</text>
        ${here ? '<g class="me" transform="translate(22 -30)"><circle r="12" /><text y="5" text-anchor="middle">TY</text></g>' : ''}</g>`;
    };
    const acts = (City.ACTS[sel] || []).map(a => {
      const dis = (!a.free && done) || (a.money && C.money < a.money) || (a.gf && !Z.gf) || (a.noGf && Z.gf) || (a.inj && r.injury);
      return `<button class="opt cact" data-ui="cityAct" data-v="${a.id}" ${dis ? 'disabled' : ''}><b>${esc(a.n)}</b><small>${esc(a.d)}${a.money ? ` · ${a.money} zł` : ''}${a.free ? ' · bez straty czasu' : ''}</small></button>`;
    }).join('');
    return `<div class="head row between"><div><h2>Miasto</h2><p>${done ? '<b>Tydzień dobiegł końca</b> — kliknij „Zakończ tydzień” (mecz w niedzielę).' : `<b>${City.DAYS[Z.day]}, ${City.SLOTS[Z.slot]}</b> · zostało pór w tygodniu: ${(5 - Z.day) * 3 + (3 - Z.slot)}`}</p></div>
        <div class="row"><button class="ghost" data-ui="cityPhone">📱 Telefon</button>${done ? '' : '<button class="ghost" data-ui="cityAct" data-v="sleep" data-p="dom">Idź spać 🌙</button>'}</div></div>
      <div class="city">
        <svg class="citymap" viewBox="0 0 1000 600">
          <defs><pattern id="cgrid" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#1d2126"/><path d="M40 0H0V40" fill="none" stroke="#252a31" stroke-width="1"/></pattern>
            <linearGradient id="criver" x1="0" x2="1"><stop offset="0" stop-color="#1c3b5a"/><stop offset="1" stop-color="#23507a"/></linearGradient></defs>
          <rect width="1000" height="600" fill="url(#cgrid)"/>
          <path d="M-20 330 C 180 300, 260 380, 430 350 S 700 390, 1020 340" stroke="url(#criver)" stroke-width="46" fill="none" opacity=".9"/>
          <rect x="760" y="190" width="200" height="150" rx="30" fill="#1f4a2c"/><circle cx="800" cy="230" r="14" fill="#2a6b3c"/><circle cx="920" cy="300" r="18" fill="#2a6b3c"/><circle cx="880" cy="215" r="11" fill="#2a6b3c"/>
          <g class="roads" stroke="#3a4048" stroke-linecap="round" fill="none"><path d="M150 455 L345 470 L690 455 L880 485" stroke-width="18"/><path d="M120 175 L285 205 L520 215 L845 265" stroke-width="18"/><path d="M285 205 L345 470" stroke-width="14"/><path d="M520 215 L660 300 L690 455" stroke-width="14"/><path d="M150 455 L120 175" stroke-width="14"/><path d="M845 265 L880 485" stroke-width="14"/></g>
          <g class="roads" stroke="#5b6168" stroke-dasharray="10 12" stroke-width="2" fill="none"><path d="M150 455 L345 470 L690 455 L880 485"/><path d="M120 175 L285 205 L520 215 L845 265"/></g>
          <ellipse cx="520" cy="85" rx="92" ry="52" fill="#141414" stroke="#5a3a2a" stroke-width="10"/><ellipse cx="520" cy="85" rx="58" ry="24" fill="#2f6b35"/>
          ${Object.entries(P).map(([k, p]) => node(k, p)).join('')}
        </svg>
        <aside class="cside">
          <div class="card"><h3>Stan</h3>
            ${bar('Energia', Z.energy, Z.energy < 35 ? 'bad' : 'en', 'Śpij, drzemka, dobre jedzenie')}
            ${bar('Jedzenie', Z.food, Z.food < 30 || Z.food > 95 ? 'bad' : 'fd', 'Głodny albo przejedzony — wolniej')}
            ${bar('Stres', Z.stress, Z.stress > 60 ? 'bad' : 'st', 'Wysoki stres psuje start i psychikę')}
            <p class="small">Wpływ na jazdę: ${City.modsHtml()}</p>
            <p class="small muted">Nastrój ${Math.round(r.morale)} · ${Z.gf ? `❤ ${esc(Z.gf.name)} (${Math.round(Z.gf.rel)}%)` : 'singiel'} · kasyno: ${Z.casino.net >= 0 ? '+' : ''}${Z.casino.net.toLocaleString('pl-PL')} zł</p></div>
          <div class="card"><h3>${P[sel].icon} ${esc(P[sel].name)}</h3><button class="go center" data-ui="cityEnter" data-v="${sel}">🚪 Wejdź do środka (3D)</button><p class="small muted">albo szybko, bez wchodzenia:</p><div class="cacts">${acts}</div></div>
          <div class="card"><h3>Dziennik tygodnia</h3><ul class="list small">${Z.log.slice(-6).reverse().map(l => `<li>${esc(l)}</li>`).join('') || '<li class="muted">Jeszcze nic.</li>'}</ul></div>
        </aside>
      </div>`;
  },

  click(d) {
    switch (d.ui) {
      case 'cityGo': City.sel = d.v; Career.render(); return true;
      case 'cityAct': { const place = d.p || City.sel || City.Z().loc; City.Z().loc = place; City.act(place, d.v); return true; }
      case 'cityBet': City._bet = +d.v; City.rouletteModal(); return true;
      case 'citySpin': City.spin(d.v); return true;
    }
    return false;
  },
};
