/* =========================================================
   Speedway Empire 3D — v2.8: BLOKOWISKO
   Kariera zaczyna się na osiedlu z wielkiej płyty. Na starcie
   wybierasz drogę:
   • Żużel — licencja juniora, treningi, liga (dotychczasowa kariera)
   • Rejon — bez licencji; „robota” za garażami, reputacja na osiedlu
   • Dwa życia — licencja i robota naraz (każde zajęcie męczy bardziej)
   Reputacja na rejonie odblokowuje lepsze zlecenia (4 półki),
   umiejętności (handel, charyzma, spryt) zmieniają szanse,
   policja (czujność) i konkurencja (inne ekipy) to ryzyko.
   Wyjście z blokowiska: kontrakt i sponsorzy albo duże pieniądze
   z rejonu — dom na osiedlu „Słonecznym” (career21.js).
   Dodatki: legalne fuchy na osiedlu, egzamin na licencję,
   rozmowy z ludźmi z rejonu, osiągnięcia, proste przerywniki.
   ========================================================= */
'use strict';

const Rejon = {
  PATHS: {
    zuzel: { n: 'Żużel', icon: '🏁', d: 'Licencja juniora w klubie, treningi i liga. Pieniądze z punktów, kontraktów i sponsorów.' },
    ulica: { n: 'Rejon', icon: '🧢', d: 'Bez licencji i bez klubu. Kasa z „roboty” za garażami i reputacja na osiedlu. Na tor wrócisz po egzaminie na licencję.' },
    hybryda: { n: 'Dwa życia', icon: '⚖️', d: 'Licencja i robota naraz. Szybsze pieniądze, ale doba ma 24 godziny: każde zajęcie męczy bardziej, a jedna wpadka kończy karierę sportową.' },
  },
  // półki zleceń: próg reputacji, wkład własny, zapłata, czujność policji, czas na dostawę (min), przyrost reputacji
  TIERS: [
    { id: 't1', n: 'Drobnica', min: 0, cost: 0, pay: 900, heat: 0.05, time: 150, rep: 3, big: false, d: 'Paczka „na kreskę” od Chudego. Nie dowieziesz — oddajesz dług.' },
    { id: 't2', n: 'Średnia półka', min: 25, cost: 1200, pay: 3200, heat: 0.07, time: 130, rep: 4, big: false, d: 'Wykładasz swoje, zarabiasz więcej. Odbiorcy z centrum.' },
    { id: 't3', n: 'Premium', min: 50, cost: 4000, pay: 9500, heat: 0.09, time: 120, rep: 5, big: true, d: 'Klienci z domów jednorodzinnych. Krótszy termin, większa czujność.' },
    { id: 't4', n: 'Hurt', min: 80, cost: 15000, pay: 32000, heat: 0.12, time: 100, rep: 6, big: true, d: 'Duży gracz. Jedna dostawa to pół roku pensji juniora.' },
  ],
  RANKS: [[0, 'Nikt z bloku'], [10, 'Młody z trzepaka'], [25, 'Chłopak Chudego'], [50, 'Ktoś na rejonie'], [70, 'Szef rejonu'], [85, 'Duży gracz']],
  SKILLS: { handel: ['Handel', 'wyższa zapłata za dostawę'], charyzma: ['Charyzma', 'rozmowy, mniej wtyk, konflikty z ekipami'], spryt: ['Spryt', 'patrole zauważają cię rzadziej'] },
  // domy na osiedlu „Słonecznym” (dzielnica willowa na południu miasta)
  HOUSES: [
    { id: 'szereg', n: 'Szeregowiec na Słonecznym', price: 420000, comfort: 10, d: 'Własne cztery ściany, mały ogródek i miejsce parkingowe.' },
    { id: 'dom', n: 'Dom z ogrodem', price: 850000, comfort: 16, d: 'Garaż na dwa auta, taras, grill. Mama płacze ze wzruszenia.' },
    { id: 'willa', n: 'Willa z basenem', price: 2400000, comfort: 24, d: 'Brama na pilota, basen i kamery. Nikt z bloku w to nie wierzy.' },
  ],
  CREWS: ['ekipa z Zatorza', 'chłopaki spod pawilonu', 'bracia Z. z Kolejowej', 'ekipa „Wiadukt”'],
  NPC: {
    chudy: { n: 'Chudy', ico: '🧢', where: 'za garażami' },
    seba: { n: 'Seba z trzepaka', ico: '🧃', where: 'pod klatką' },
    dzielnicowy: { n: 'St. asp. Nowicki, dzielnicowy', ico: '👮', where: 'na osiedlu' },
    mama: { n: 'Mama', ico: '👩', where: 'w domu' },
  },
  ACH: [
    { id: 'path', n: 'Pierwszy krok', d: 'Wybierz swoją drogę', t: (C, J) => !!J.path },
    { id: 'deal1', n: 'Pierwsza robota', d: 'Dowieź pierwszą paczkę', t: (C, J) => J.done >= 1 },
    { id: 'rep25', n: 'Chłopak Chudego', d: 'Reputacja na rejonie 25', t: (C, J) => J.rep >= 25 },
    { id: 'rep50', n: 'Ktoś na rejonie', d: 'Reputacja na rejonie 50', t: (C, J) => J.rep >= 50 },
    { id: 'rep85', n: 'Duży gracz', d: 'Reputacja na rejonie 85', t: (C, J) => J.rep >= 85 },
    { id: 'lic', n: 'Licencja w kieszeni', d: 'Zdaj egzamin na licencję żużlową', t: (C, J) => J.licExam },
    { id: 'heat1', n: 'Pierwszy bieg', d: 'Pojedź bieg w meczu ligowym', t: (C, J, r) => !!(r.season && r.season.heats > 0) },
    { id: 'legal10', n: 'Uczciwa robota', d: '10 legalnych fuch na osiedlu', t: (C, J) => J.legal >= 10 },
    { id: 'gadane', n: 'Gadane', d: 'Charyzma 50', t: (C, J) => J.sk.charyzma >= 50 },
    { id: 'duo', n: 'Dwa życia', d: '10 dostaw i 10 biegów w lidze', t: (C, J, r) => J.done >= 10 && !!(r.season && r.season.heats >= 10) },
    { id: 'clean', n: 'Czysta kartoteka', d: '15 dostaw bez zatrzymania', t: (C, J) => J.done >= 15 && !C.record },
    { id: 'mln', n: 'Pierwszy milion', d: 'Milion złotych na koncie', t: C => C.money >= 1e6 },
    { id: 'out', n: 'Wyprowadzka', d: 'Kup dom poza blokowiskiem', t: (C, J) => !!J.house },
  ],

  /* ---------- stan ---------- */
  S() {
    const C = Career.C();
    if (!C.rj) C.rj = { path: 'zuzel', legacy: true, rep: 0, sk: { handel: 0, charyzma: 5, spryt: 0 }, done: 0, failed: 0, busted: 0, earned: 0, legal: 0, licence: true, licTrain: 0, licExam: false, house: null, rival: null, ach: {}, wkDeals: 0, wkLegal: 0 };
    return C.rj;
  },
  on: () => !!(Game.s && Game.s.mode === 'career' && Game.s.career),
  path() { return Rejon.on() ? Rejon.S().path || 'zuzel' : 'zuzel'; },
  street() { const p = Rejon.path(); return p === 'ulica' || p === 'hybryda'; },
  noLic() { return Rejon.on() && Rejon.S().licence === false; },
  rank(rep = Rejon.S().rep) { return Rejon.RANKS.filter(([m]) => rep >= m).pop()[1]; },
  tier: id => Rejon.TIERS.find(t => t.id === id),
  repd(d) { const J = Rejon.S(), before = Rejon.rank(); J.rep = R.clamp(J.rep + d, 0, 100); const after = Rejon.rank(); if (after !== before && d > 0) Rejon.scene([{ ico: '🧢', k: 'Rejon', t: after, p: `Na osiedlu mówią o tobie inaczej. ${Rejon.TIERS.filter(t => t.min <= J.rep).pop().n} — tyle ci teraz zaufają.` }]); },
  /** Umiejętność rośnie coraz wolniej; zwraca opis awansu co 10 pkt */
  skill(k, x) {
    const J = Rejon.S(), v = J.sk[k] || 0, nv = Math.min(100, v + x * (1 - v / 120));
    J.sk[k] = nv; return Math.floor(nv / 10) > Math.floor(v / 10) ? `${Rejon.SKILLS[k][0]} ${Math.floor(nv)}!` : '';
  },
  payMul() { return 1 + (Rejon.S().sk.handel || 0) / 200; },
  achCheck() {
    if (!Rejon.on()) return; const C = Career.C(), J = Rejon.S(), r = Career.me();
    Rejon.ACH.forEach(a => { if (J.ach[a.id]) return; let ok = false; try { ok = a.t(C, J, r); } catch (e) { ok = false; } if (ok) { J.ach[a.id] = Game.s.week || 1; UI.toast(`🏆 Osiągnięcie: ${a.n} — ${a.d}`); } });
  },

  /* ---------- przerywniki (kadry z tekstem, klik = dalej) ---------- */
  scene(frames, done) {
    Rejon._sc = { frames, i: 0, done }; Rejon.frame();
  },
  frame() {
    const S = Rejon._sc; if (!S) return; const f = S.frames[S.i], last = S.i === S.frames.length - 1;
    UI.modal(`<div class="rj-scene"><div class="kicker">${esc(f.k || '')}</div><div class="dilemma"><div class="dl-ico">${f.ico || '🏢'}</div><div><h2>${esc(f.t)}</h2><p>${esc(f.p)}</p></div></div>
      <div class="actions">${f.opts ? f.opts : `<button class="go" data-ui="rjNext">${last ? 'Zamknij' : 'Dalej ▸'}</button>`}</div><p class="small muted">${S.frames.length > 1 ? `${S.i + 1} / ${S.frames.length}` : ''}</p></div>`);
  },
  next() { const S = Rejon._sc; if (!S) { UI.close(); return; } S.i++; if (S.i >= S.frames.length) { Rejon._sc = null; UI.close(); S.done && S.done(); } else Rejon.frame(); },

  /* ---------- start: intro i wybór drogi ---------- */
  intro() {
    const r = Career.me();
    Rejon.scene([
      { ico: '🏢', k: 'Osiedle „Tysiąclecia”, blok 7, klatka C', t: 'Szesnaście lat i czwarte piętro', p: `${r.name.split(' ')[0]} patrzy z loggii na podwórko: trzepak, blaszaki, piaskownica bez piasku. Z daleka, zza bloków, niesie się ryk silników — stadion.` },
      { ico: '👩', k: 'Kuchnia', t: 'Mama', p: '„Trener ze szkółki dzwonił. Mówi, że masz rękę do motoru. Tylko nie kombinuj z tymi od Chudego, słyszysz?”' },
      { ico: '🧢', k: 'Za garażami', t: 'Chudy', p: '„Żużel? Zanim cię wystawią, zdążysz się zestarzeć. U mnie kasa jest od dziś. Zastanów się, młody.”' },
    ], () => Rejon.chooseModal());
  },
  chooseModal() {
    UI.modal(`<div class="kicker">Twoja droga</div><h2>Jak chcesz wyrwać się z blokowiska?</h2>
      <div class="talk-opts">${Object.entries(Rejon.PATHS).map(([k, p]) => `<button class="opt ${k === 'ulica' ? 'warn' : ''}" data-ui="rjPath" data-v="${k}"><b>${p.icon} ${esc(p.n)}</b><small>${esc(p.d)}</small></button>`).join('')}</div>
      <p class="small muted">Drogę „Żużel” możesz później rozszerzyć o „Dwa życia”, a z „Rejonu” wrócić na tor po egzaminie na licencję.</p>`);
  },
  setPath(k) {
    const s = Game.s, C = Career.C(), J = Rejon.S(), r = Career.me(); UI.close();
    const fresh = J.path === null; // nowa kariera; stary zapis tylko dokłada drogę
    J.path = k; delete J.legacy;
    if (!fresh) { Game.news(`${r.name} zaczyna prowadzić podwójne życie: tor i osiedle.`, 'info'); }
    else if (k === 'ulica') {
      r.age = 16; C.money = 600; J.licence = false; J.rep = 8; J.sk.spryt = 5;
      J.savedContract = { ...r.contract }; r.contract.sign = 0; r.contract.perPoint = 0;
      Game.news(`${r.name} odchodzi ze szkółki. Na osiedlu mówią, że „ogarnia sprawy” u Chudego.`, 'bad');
    } else if (k === 'hybryda') {
      r.age = 16; C.money = 2000; J.licence = true; J.rep = 5;
      Game.news(`${r.name}, 16 lat: rano tor, wieczorem osiedle. Ile tak wytrzyma?`, 'info');
    } else Game.news(`${r.name} stawia wszystko na żużel. Pierwszy trening w szkółce — w poniedziałek.`, 'good');
    Game.autoLineup(s.user); Rejon.achCheck(); Game.save();
    Career.tab = k === 'zuzel' ? 'kpulpit' : 'krejon'; Career.render();
  },

  /* ---------- zlecenia (półki) ---------- */
  dealHtml() {
    const C = Career.C(), J = Rejon.S(), heat = C.dealHeat || 0;
    const risk = T => Math.round(Math.min(0.85, (T.big ? 0.2 : 0.08) + heat * (1 - J.sk.spryt / 150)) * 100);
    return `<div class="row between"><span class="kicker">Za garażami · ${esc(Rejon.rank())} (reputacja ${Math.round(J.rep)})</span><button class="x" data-ui="close">×</button></div>
      <div class="dilemma scandal"><div class="dl-ico">🧢</div><div><h2>Chudy</h2><p>${J.rep < 25 ? '„Na razie drobnica, młody. Pokaż, że można na tobie polegać.”' : J.rep < 50 ? '„Ludzie cię znają. Mogę dać coś poważniejszego — ale za swoje.”' : J.rep < 80 ? '„Klienci z willi pytają o ciebie po imieniu.”' : '„Ty już nie jesteś od noszenia paczek. Ty jesteś od hurtu.”'}</p>
      <p class="small muted">To przestępstwo. Złapany: areszt, grzywna, kartoteka${Rejon.S().licence ? ', zawieszenie w lidze i zerwane umowy' : ''}. Czujność policji: ${Math.round(heat * 100 / 0.6)}%.</p></div></div>
      <div class="talk-opts">${Rejon.TIERS.map(T => { const lock = J.rep < T.min, poor = C.money < T.cost; return `<button class="opt warn" data-ui="cDeal" data-v="${T.id}" ${lock || poor ? 'disabled' : ''}><b>${esc(T.n)} — ${Math.round(T.pay * Rejon.payMul()).toLocaleString('pl-PL')} zł${T.cost ? ` (wkład ${T.cost.toLocaleString('pl-PL')} zł)` : ''}</b><small>${lock ? `🔒 reputacja ${T.min}` : `${esc(T.d)} · ryzyko ok. ${risk(T)}% · ${T.time} min`}${poor && !lock ? ' · za mało gotówki' : ''}</small></button>`; }).join('')}
      <button class="opt" data-ui="cDeal" data-v="no">„Nie dziś.”</button></div>`;
  },

  /* ---------- legalne fuchy i egzamin ---------- */
  LEGAL: [
    { id: 'ulotki', n: 'Roznoszenie ulotek po klatkach', d: '+120 zł, charyzma + · energia −12', pay: 120 },
    { id: 'myjnia', n: 'Myjnia ręczna u Mirka', d: '+220 zł · energia −20', pay: 220 },
    { id: 'warsztat', n: 'Pomoc w warsztacie pana Zbyszka', d: '+160 zł, lepszy silnik na mecz · energia −14', pay: 160 },
    { id: 'silka', n: 'Siłownia pod chmurką (drążki, poręcze)', d: 'wytrzymałość + · energia −14' },
  ],
  legal(id) {
    const Z = City.Z(), C = Career.C(), J = Rejon.S(), A = Rejon.LEGAL.find(a => a.id === id); if (!A) return '';
    let msg = '';
    if (A.pay) Career.pay(A.pay, A.n);
    if (id === 'ulotki') { Z.energy -= 12; msg = `Dziesięć klatek, domofony, pani z parteru pyta, czy to z parafii. +${A.pay} zł. ${Rejon.skill('charyzma', 3)}`; }
    if (id === 'myjnia') { Z.energy -= 20; Z.food -= 6; msg = `Sześć aut, w tym BMW sąsiada z trzeciego. Dłonie pomarszczone, +${A.pay} zł.`; }
    if (id === 'warsztat') { Z.energy -= 14; C.prep = Math.min(0.6, (C.prep || 0) + 0.1); msg = `Pan Zbyszek pokazuje, jak ustawić gaźnik „na ucho”. +${A.pay} zł, silnik chodzi równiej.`; }
    if (id === 'silka') { Z.energy -= 14; Z.stress -= 6; msg = Career.grow('stamina', 0.18) || 'Podciąganie, dipy, brzuszki na ławce. Chłopaki z bloku liczą powtórzenia.'; }
    J.legal++; J.wkLegal++; C.dealHeat = Math.max(0, (C.dealHeat || 0) - 0.01); // dzielnicowy widzi, że pracujesz
    return msg.trim();
  },
  licenceExam() {
    const C = Career.C(), J = Rejon.S(), r = Career.me(), Z = City.Z();
    if (J.licence) { UI.toast('Masz już licencję.'); return false; }
    if (J.licTrain < 3) { UI.toast(`Trener szkółki: „Najpierw trzy treningi, potem egzamin” (${J.licTrain}/3).`, true); return false; }
    if (C.money < 800) { UI.toast('Egzamin kosztuje 800 zł.', true); return false; }
    Career.pay(-800, 'Egzamin na licencję'); Z.energy -= 20; Z.stress += 10;
    const p = R.clamp(0.35 + ((r.a.start || 8) + (r.a.bends || 8)) / 60 - Z.stress / 400, 0.2, 0.92);
    if (Math.random() < p) {
      J.licence = true; J.licExam = true; const sc = J.savedContract || { sign: 6000, perPoint: 400 };
      r.contract.sign = Math.max(6000, Math.round(sc.sign * 0.4)); r.contract.perPoint = Math.max(400, Math.round(sc.perPoint * 0.6)); if (J.path === 'ulica') J.path = 'hybryda';
      Game.autoLineup(Game.s.user);
      Rejon.scene([{ ico: '🏁', k: 'Stadion, egzamin licencyjny', t: 'Zdane!', p: 'Cztery okrążenia, start spod taśmy, jazda parą. Komisarz podaje ci rękę: „Witamy w żużlu.” Trener może cię teraz wystawić w składzie.' }]);
    } else { Rejon.scene([{ ico: '🟥', k: 'Stadion, egzamin licencyjny', t: 'Nie tym razem', p: 'Dotknięta taśma i upadek na drugim łuku. Komisarz kręci głową: „Za miesiąc, młody.”' }]); J.licTrain = 1; }
    City.clamp(Z); Game.save(); Rejon.achCheck(); return true;
  },

  /* ---------- konkurencja ---------- */
  rivalAct(v) {
    const J = Rejon.S(), C = Career.C(), Z = City.Z(), r = Career.me(), rv = J.rival; if (!rv) return;
    J.rival = null; let t = '', p = '';
    if (v === 'back') { Rejon.repd(-6); Z.stress -= 4; t = 'Odpuszczasz'; p = `Oddajesz ${rv.crew} dwa bloki przy pawilonie. Spokój, ale na trzepaku już się z ciebie śmieją.`; }
    if (v === 'talk') {
      if (Math.random() < 0.35 + J.sk.charyzma / 150) { Rejon.repd(4); t = 'Dogadane'; p = `Rozmowa przy kebabie. Podział rejonu, uścisk dłoni. ${Rejon.skill('charyzma', 3)}`; }
      else { Rejon.repd(-3); Z.stress += 10; t = 'Nie wyszło'; p = `${rv.crew} słucha, kiwa głowami i… nic. Jutro znów stoją pod twoim blokiem.`; }
    }
    if (v === 'stand') {
      C.dealHeat = Math.min(0.6, (C.dealHeat || 0) + 0.08);
      if (Math.random() < 0.55 + J.sk.spryt / 300) { Rejon.repd(8); t = 'Rejon twój'; p = `Konfrontacja pod pawilonem kończy się, zanim przyjechał radiowóz. ${rv.crew} znika z osiedla.`; }
      else { r.injury = Math.max(r.injury, R.int(1, 2)); Rejon.repd(-4); Z.stress += 15; t = 'Oberwałeś'; p = 'Ktoś zadzwonił po policję, ktoś inny pod szpital. Stłuczone żebra — przerwa w treningach.'; }
    }
    City.clamp(Z); Game.save(); Rejon.scene([{ ico: '⚔️', k: 'Konflikt o rejon', t, p }], () => Career.render());
  },

  /* ---------- rozmowy z ludźmi z rejonu ---------- */
  talk(id) {
    const C = Career.C(), J = Rejon.S(), N = Rejon.NPC[id], Z = City.Z(), heat = C.dealHeat || 0;
    const key = 'npc_' + id; City.LIMITS[key] = City.LIMITS[key] || { d: 1 };
    if (!City.gate(key)) return;
    let p = '', opts = [];
    if (id === 'chudy') { p = J.path === 'zuzel' ? '„Słyszałem, że jeździsz. Jakbyś kiedyś chciał dorobić na sprzęt — wiesz, gdzie mnie szukać.”' : J.rep < 25 ? '„Trzymaj gębę na kłódkę i się nie spóźniaj. Tyle.”' : '„Rośniesz, młody. Tylko pamiętaj, kto ci dał pierwszą paczkę.”'; opts = [['loyal', 'Podziękuj za zaufanie (reputacja +)'], ['ask', 'Zapytaj o psiarnię na rejonie']]; }
    if (id === 'seba') { p = J.rival ? `„${J.rival.crew} kręci się pod pawilonem. Mówią, że chcą przejąć twoje bloki.”` : Crowd.pick(['„Widziałeś nowe BMW pod siódemką? Jakiś gość z willi przyjeżdża do Chudego.”', '„Młody Kowalski dostał się do szkółki żużlowej. Mówią, że ma talent — jak ty kiedyś.”', '„Dzielnicowy wypytywał, kto stoi za garażami. Ja nic nie wiem, jasne?”']); opts = [['joke', 'Pogadaj o wszystkim i o niczym (charyzma +)'], ['info', 'Poproś, żeby miał oczy otwarte (spryt +)']]; }
    if (id === 'dzielnicowy') { p = heat > 0.3 ? '„Wiem, co się dzieje za garażami. Jeszcze nie mam dowodów. Jeszcze.”' : heat > 0.1 ? '„Dobrze cię widzieć w myjni, a nie za garażami. Oby tak zostało.”' : '„Pan Nowak? Słyszałem, że trenujesz. Kibicuję całym osiedlem.”'; opts = [['polite', 'Grzecznie pogadaj i idź dalej'], ['snitch', 'Podaj mu coś o konkurencji (czujność −, reputacja −−)']]; }
    if (id === 'mama') { p = C.dealHeat > 0.2 ? '„Synku, sąsiadki gadają. Powiedz mi, że to nieprawda.”' : J.path === 'zuzel' ? '„Byłam na twoim treningu. Serce mi staje na tych łukach, ale jestem dumna.”' : '„Jedz porządnie. I wracaj przed dwunastą.”'; opts = [['calm', 'Uspokój mamę (stres −)'], ['money', `Daj jej pieniądze na opłaty (500 zł)`]]; }
    Rejon._talk = id;
    UI.modal(`<div class="row between"><span class="kicker">${esc(N.where)}</span><button class="x" data-ui="close">×</button></div><div class="dilemma"><div class="dl-ico">${N.ico}</div><div><h2>${esc(N.n)}</h2><p>${esc(p)}</p></div></div>
      <div class="talk-opts">${opts.map(([v, t]) => `<button class="opt ${v === 'snitch' ? 'warn' : ''}" data-ui="rjTalk" data-v="${v}">${esc(t)}</button>`).join('')}</div>`);
  },
  talkAct(v) {
    const C = Career.C(), J = Rejon.S(), Z = City.Z(); UI.close(); let msg = '';
    if (v === 'loyal') { Rejon.repd(1); msg = 'Chudy klepie cię po ramieniu.'; }
    if (v === 'ask') msg = (C.dealHeat || 0) > 0.25 ? 'Chudy: „Tajniacy w szarym Passacie. Nie biegaj przy nich.” ' + Rejon.skill('spryt', 2) : 'Chudy: „Spokojnie ostatnio. Za spokojnie.”';
    if (v === 'joke') { Z.stress -= 5; msg = ('Pół godziny gadania o niczym. ' + Rejon.skill('charyzma', 2.5)).trim(); }
    if (v === 'info') msg = ('Seba: „Jak zobaczę radiowóz, puszczę ci strzałkę.” ' + Rejon.skill('spryt', 2.5)).trim();
    if (v === 'polite') { C.dealHeat = Math.max(0, (C.dealHeat || 0) - 0.02); msg = 'Dzielnicowy kiwa głową. Ktoś patrzy z okna.'; }
    if (v === 'snitch') { C.dealHeat = Math.max(0, (C.dealHeat || 0) - 0.15); Rejon.repd(-12); J.rival = null; msg = 'Nowicki notuje. Następnego dnia na klatce ktoś napisał sprayem „KAPUŚ”.'; }
    if (v === 'calm') { Z.stress -= 8; Career.mor(3); msg = 'Mama przytula cię jak dziecko. Stres −8.'; }
    if (v === 'money') { if (C.money < 500) { UI.toast('Za mało pieniędzy.', true); return; } Career.pay(-500, 'Dla mamy na opłaty'); Career.mor(5); Z.stress -= 5; msg = 'Mama długo nic nie mówi. Potem: „Dziękuję, synku.”'; }
    City.clamp(Z); Game.save(); UI.toast(msg); Rejon.achCheck(); Career.render();
  },

  /* ---------- wyjście z blokowiska ---------- */
  exitScore() {
    const C = Career.C(), J = Rejon.S(), r = Career.me();
    const sport = R.clamp(Math.max((r.contract.perPoint || 0) / 3000, (C.rep || 0) / 80) * (J.licence ? 1 : 0.3), 0, 1);
    const street = R.clamp(J.rep / 85, 0, 1) * R.clamp(C.money / 850000, 0.1, 1);
    const cash = R.clamp(C.money / 420000, 0, 1);
    return { sport, street, cash };
  },
  buy(id) {
    const C = Career.C(), J = Rejon.S(), H = Rejon.HOUSES.find(h => h.id === id); if (!H) return;
    if (C.money < H.price) { UI.toast('Za mało pieniędzy.', true); return; }
    const was = J.house; Career.pay(-H.price + (was ? Math.round(Rejon.HOUSES.find(h => h.id === was).price * 0.8) : 0), `${H.n}${was ? ' (z dopłatą, stary dom sprzedany)' : ''}`);
    J.house = id; Game.save(); Rejon.achCheck();
    if (!was) Rejon.scene([
      { ico: '📦', k: 'Blok 7, klatka C', t: 'Ostatnie kartony', p: 'Pani Halinka stoi na ławce i macha. Chłopaki z trzepaka pomagają znieść kanapę. Seba: „Nie zapomnij, skąd jesteś.”' },
      { ico: '🏡', k: 'Osiedle „Słoneczne”', t: H.n, p: `${H.d} Z tarasu nie widać bloków — tylko korony drzew i, w oddali, maszty stadionu.` },
    ], () => Career.render());
    else Career.render();
  },

  /* ---------- widok: zakładka „Rejon” ---------- */
  view() {
    const C = Career.C(), J = Rejon.S(), r = Career.me(), P = Rejon.PATHS[J.path] || Rejon.PATHS.zuzel, heat = C.dealHeat || 0, ex = Rejon.exitScore();
    Rejon.achCheck();
    const bar = (label, v, max = 100, bad) => `<div class="kv"><span>${label}</span>${UI.bar(v, max, bad ? 'bad' : '')}<b>${Math.round(v)}</b></div>`;
    const next = Rejon.TIERS.find(t => t.min > J.rep);
    const pick = J.legacy ? `<div class="card s12"><h3>Twoja droga</h3><p class="small">Kariera sprzed wersji 2.8 — jesteś na drodze „Żużel”. Możesz dołożyć życie na osiedlu (nie da się tego cofnąć).</p><div class="talk-opts"><button class="opt warn" data-ui="rjPath" data-v="hybryda"><b>⚖️ Dwa życia</b><small>${esc(Rejon.PATHS.hybryda.d)}</small></button></div></div>` : '';
    return `<div class="grid">${pick}
      <div class="card s6"><h3>${P.icon} Droga: ${esc(P.n)}</h3><p class="small">${esc(P.d)}</p>
        ${J.licence ? '<p class="small good">Licencja żużlowa: jest</p>' : `<p class="small neg">Brak licencji — trener nie może cię wystawić. Egzamin: Stadion → „Egzamin na licencję” (treningi ${J.licTrain}/3, 800 zł).</p>`}
        ${J.path === 'hybryda' ? '<p class="small muted">Dwa życia: każde zajęcie zabiera dodatkowo 3 energii.</p>' : ''}</div>
      <div class="card s6"><h3>🧢 Rejon — ${esc(Rejon.rank())}</h3>${bar('Reputacja', J.rep)}${bar('Czujność policji', heat * 100 / 0.6, 100, heat > 0.3)}
        <p class="small">Dostawy: ${J.done} · nieudane: ${J.failed} · zatrzymania: ${C.record || 0} · zarobione: ${Math.round(J.earned).toLocaleString('pl-PL')} zł</p>
        <p class="small muted">${next ? `Następna półka: <b>${esc(next.n)}</b> od reputacji ${next.min}.` : 'Wszystkie półki odblokowane.'} Zlecenia: Osiedle → „Szemrana robota za garażami”.</p></div>
      <div class="card s4"><h3>Umiejętności</h3>${Object.entries(Rejon.SKILLS).map(([k, [n, d]]) => `${bar(n, J.sk[k] || 0)}<p class="small muted">${esc(d)}</p>`).join('')}</div>
      <div class="card s4"><h3>Ludzie z rejonu</h3><div class="talk-opts">${Object.entries(Rejon.NPC).map(([k, N]) => `<button class="opt" data-ui="rjNpc" data-v="${k}"><b>${N.ico} ${esc(N.n)}</b><small>${esc(N.where)} · raz dziennie</small></button>`).join('')}</div></div>
      <div class="card s4"><h3>${J.rival ? '⚔️ Konflikt o rejon' : 'Konkurencja'}</h3>${J.rival ? `<p class="small">${esc(J.rival.crew)} przejmuje twoich klientów pod pawilonem. Co robisz?</p><div class="talk-opts">
          <button class="opt" data-ui="rjRival" data-v="back">Odpuść (reputacja −)</button><button class="opt" data-ui="rjRival" data-v="talk">Dogadaj się (charyzma)</button><button class="opt warn" data-ui="rjRival" data-v="stand">Postaw się (ryzyko kontuzji, policja)</button></div>`
        : `<p class="small muted">${J.rep >= 20 ? 'Na razie cisza. Inne ekipy obserwują, jak rośniesz.' : 'Jesteś za mały, żeby ktoś się tobą przejmował.'}</p>`}</div>
      <div class="card s6"><h3>🏡 Wyjście z blokowiska</h3>${bar('Przez sport', ex.sport * 100)}${bar('Przez rejon', ex.street * 100)}${bar('Oszczędności na dom', ex.cash * 100)}
        <div class="talk-opts">${Rejon.HOUSES.map(H => `<button class="opt" data-ui="rjBuy" data-v="${H.id}" ${J.house === H.id || C.money < H.price ? 'disabled' : ''}><b>${esc(H.n)} — ${H.price.toLocaleString('pl-PL')} zł</b><small>${J.house === H.id ? 'twój dom' : esc(H.d)} · wygoda +${H.comfort}</small></button>`).join('')}</div>
        <p class="small muted">Domy: osiedle „Słoneczne” na południu (ul. Słoneczna) i Stare Miasto na wschodzie (Biuro nieruchomości przy Rynku). Auto kupisz w zakładce Sprzęt albo w salonie na Starym Mieście.</p></div>
      <div class="card s6"><h3>🏆 Osiągnięcia (${Object.keys(J.ach).length}/${Rejon.ACH.length})</h3><ul class="list small">${Rejon.ACH.map(a => `<li class="${J.ach[a.id] ? 'good' : 'muted'}">${J.ach[a.id] ? '✔' : '○'} <b>${esc(a.n)}</b> — ${esc(a.d)}</li>`).join('')}</ul></div>
    </div>`;
  },
};

/* =========================================================
   PODPIĘCIE DO GRY
   ========================================================= */
City.LIMITS.ulotki = { d: 1 }; City.LIMITS.myjnia = { d: 1 }; City.LIMITS.warsztat = { d: 1 }; City.LIMITS.silka = { d: 1 }; City.LIMITS.licence = { d: 1 };
City.ACTS.osiedle.push(...Rejon.LEGAL.map(a => ({ id: a.id, n: a.n, d: a.d })));
City.ACTS.tor.push({ id: 'licence', n: 'Egzamin na licencję żużlową', d: 'po 3 treningach · 800 zł · energia −20' });
Career.TABS.splice(2, 0, ['krejon', 'Rejon']);
Career.views.krejon = () => Rejon.view();

(() => {
  // nowa kariera: przerywnik i wybór drogi
  const bn = Career.newGame;
  Career.newGame = function (...a) {
    const s = bn.apply(this, a); const J = Rejon.S(); J.path = null; delete J.legacy; Game.save();
    setTimeout(() => Rejon.intro(), 400);
    return s;
  };
  // kliknięcia
  const bc = Career.click;
  Career.click = function (d) {
    switch (d.ui) {
      case 'rjNext': Rejon.next(); return true;
      case 'rjPath': Rejon.setPath(d.v); return true;
      case 'rjNpc': Rejon.talk(d.v); return true;
      case 'rjTalk': Rejon.talkAct(d.v); return true;
      case 'rjRival': Rejon.rivalAct(d.v); return true;
      case 'rjBuy': Rejon.buy(d.v); return true;
      case 'cTab': if (d.v === 'krejon' && Rejon.S().path === null) { Rejon.chooseModal(); return true; } break;
    }
    return bc.call(this, d);
  };
  // bez licencji trener nie może cię wystawić
  const bl = Game.autoLineup;
  Game.autoLineup = function (cid) {
    const res = bl.call(this, cid), s = Game.s;
    if (s && s.mode === 'career' && s.career && cid === s.user && Rejon.noLic()) {
      const L = s.lineups[cid] || [], me = s.career.me, i = L.indexOf(me);
      if (i >= 0) { const alt = Game.roster(cid).filter(r => r.id !== me && !L.includes(r.id) && !r.injury).sort((a, b) => (Game.isJunior(b) === Game.isJunior(Career.me())) - (Game.isJunior(a) === Game.isJunior(Career.me())) || Game.ovr(b) - Game.ovr(a))[0]; if (alt) L[i] = alt.id; else L.splice(i, 1); }
    }
    return res;
  };
  const bil = Career.inLineup;
  Career.inLineup = function () { return Rejon.noLic() ? false : bil.call(this); };
  const btm = Career.toMatch;
  Career.toMatch = function () {
    if (!Rejon.noLic() || !Game.userFixture()) return btm.call(this);
    UI.show('mgr'); Career.render(); Career.C().eventDone = false;
    UI.modal(`<h2>Mecz ligowy</h2><p>Nie masz licencji żużlowej — oglądasz mecz z trybuny za łukiem, z chłopakami z osiedla.</p><div class="actions"><button class="go" data-ui="cSimWeek">Oglądaj (symulacja) ▸</button></div>`);
  };
  // dwa życia: każde zajęcie męczy bardziej
  const bp = City.pay;
  City.pay = function (Z, A, msg, noTime) { if (Rejon.on() && Rejon.path() === 'hybryda' && A && !A.free && !noTime) Z.energy -= 3; return bp.call(this, Z, A, msg, noTime); };
  // limity zleceń: na rejonie częściej
  const bcd = City.canDo;
  City.canDo = function (id) {
    if (id !== 'deal' || !Rejon.on() || !Rejon.street()) return bcd.call(this, id);
    const base = City.LIMITS.deal; City.LIMITS.deal = Rejon.path() === 'ulica' ? { d: 2, w: 10 } : { d: 1, w: 5 };
    try { return bcd.call(this, id); } finally { City.LIMITS.deal = base; }
  };
  // zajęcia: fuchy na osiedlu, egzamin na licencję, treningi do egzaminu
  const bo = City.osiedleAct;
  City.osiedleAct = function (id) { if (!Rejon.LEGAL.some(a => a.id === id)) return bo.call(this, id); const msg = Rejon.legal(id); City.pay(City.Z(), City.ACTS.osiedle.find(a => a.id === id), msg); Rejon.achCheck(); };
  const ba = City.act;
  City.act = function (place, id) {
    if (place === 'tor' && id === 'licence') {
      if (City.weekDone()) { UI.toast('Tydzień dobiegł końca — kliknij „Zakończ tydzień”.', true); return; }
      if (City.canDo('licence').ok && Rejon.licenceExam()) { City.count('licence'); City.pay(City.Z(), { n: 'Egzamin na licencję' }, ''); }
      else if (!City.canDo('licence').ok) UI.toast('Na dziś wystarczy.', true);
      return;
    }
    const J = Rejon.on() && place === 'tor' && Rejon.noLic() ? Rejon.S() : null, n = J ? City.Z().log.length : 0;
    const res = ba.call(this, place, id);
    if (J && ((id === 'train' && City.Z().log.length > n) || id === 'ride')) J.licTrain++; // treningi przed egzaminem
    return res;
  };
  const bv = City.view;
  City.view = function () {
    const all = City.ACTS.tor; City.ACTS.tor = all.filter(a => a.id !== 'licence' || Rejon.noLic());
    try { return bv.call(this); } finally { City.ACTS.tor = all; }
  };
  // szemrana robota: półki zleceń zamiast dwóch paczek (droga „Rejon” i „Dwa życia”)
  const bdm = City.dealModal;
  City.dealModal = function () { bdm.call(this); if (Rejon.on() && Rejon.street()) UI.modal(Rejon.dealHtml()); };
  const bac = Job.accept;
  Job.accept = function (k) {
    const T = Rejon.tier(k); if (!T) return bac.call(this, k);
    const C = Career.C(), J = Rejon.S();
    if (C.job) return bac.call(this, k);
    if (J.rep < T.min) { UI.toast(`Chudy: „Za wysokie progi, młody” (reputacja ${T.min}).`, true); return; }
    if (C.money < T.cost) { UI.toast('Nie masz tyle gotówki na wkład.', true); return; }
    const heat0 = C.dealHeat || 0;
    bac.call(this, T.big ? 'big' : 'small');
    Miasto.build(() => {
      const Jb = C.job; if (!Jb || Jb.tier) return;
      Jb.tier = T.id; Jb.cost = T.cost; Jb.pay = Math.round(T.pay * Rejon.payMul()); Jb.until = City.minOf(City.Z()) + T.time;
      if (T.cost) Career.pay(-T.cost, `Wkład: ${T.n}`);
      C.dealHeat = Math.min(0.6, heat0 + T.heat); J.wkDeals++; Game.save();
    });
  };
  const bdl = Job.deliver;
  Job.deliver = function () {
    const C = Career.C(), Jb = C.job; if (!Jb || !Rejon.on()) return bdl.call(this);
    const J = Rejon.S(), rec = C.record || 0, h = C.dealHeat || 0, f = 1 - J.sk.charyzma / 150; // charyzma: mniej wtyk
    C.dealHeat = h * f; bdl.call(this); if (C.dealHeat === h * f) C.dealHeat = h;
    if ((C.record || 0) !== rec) return; // tajniak — zatrzymanie (reputację zabiera City.arrest)
    const T = Rejon.tier(Jb.tier) || Rejon.TIERS[Jb.k === 'big' ? 1 : 0];
    J.done++; J.earned += Jb.pay - (Jb.cost || 0);
    Rejon.repd(T.rep * (1 - J.rep / 130));
    const up = [Rejon.skill('handel', 3), Rejon.skill('spryt', 1.5), Rejon.skill('charyzma', 0.5)].filter(Boolean).join(' ');
    if (up) UI.toast(up); Game.save(); Rejon.achCheck();
  };
  const bf = Job.fail;
  Job.fail = function (why) {
    const C = Career.C(), Jb = C.job; bf.call(this, why); if (!Jb || !Rejon.on()) return;
    const J = Rejon.S(); J.failed++; Rejon.repd(-5);
    if (Jb.cost) C.dealDebt = Math.max(0, (C.dealDebt || 0) - Math.round(Jb.pay * 0.8)); // towar opłacony z góry — przepada wkład, długu nie ma
    Game.save();
  };
  // spryt: czasem wyczujesz patrol wcześniej
  const bs = Job.stop;
  Job.stop = function () {
    if (Rejon.on() && Math.random() < Rejon.S().sk.spryt / 250) { UI.toast('Wyczułeś patrol pierwszy — skręcasz w bramę i znikasz między blokami.'); Rejon.skill('spryt', 1); Job._stop = false; return; }
    return bs.call(this);
  };
  const bt = Job.tick;
  Job.tick = function (dt) {
    if (!Rejon.on()) return bt.call(this, dt);
    const C = Career.C(), h = C.dealHeat || 0, f = 1 - Rejon.S().sk.spryt / 150;
    C.dealHeat = h * f; try { return bt.call(this, dt); } finally { if (C.dealHeat === h * f) C.dealHeat = h; }
  };
  const bar = City.arrest;
  City.arrest = function (k) { bar.call(this, k); if (!Rejon.on()) return; const J = Rejon.S(); J.busted++; Rejon.repd(-12); Game.save(); };
  // tydzień: czujność policji opada, konkurencja, podwójne życie
  const bfw = Career.finishWeek;
  Career.finishWeek = function (um) {
    const res = bfw.call(this, um), C = Career.C(), J = Rejon.S(), lines = C.report ? C.report.lines : [];
    if (!J.wkDeals) C.dealHeat = Math.max(0, (C.dealHeat || 0) - 0.06 - J.wkLegal * 0.01);
    if (J.path === 'hybryda' && J.wkDeals && C.city) { C.city.stress = Math.min(100, C.city.stress + 6); lines.push('Dwa życia: tor rano, osiedle wieczorem. Stres +6.'); }
    if (Rejon.street() && !J.rival && J.rep >= 20 && Math.random() < 0.3) { J.rival = { crew: Crowd.pick(Rejon.CREWS), wk: Game.s.week }; City.sms('Seba', `${J.rival.crew} kręci się pod pawilonem. Chcą twoich bloków. Zajrzyj do zakładki Rejon.`); lines.push(`Konkurencja: ${J.rival.crew} wchodzi na twój rejon.`); }
    J.wkDeals = 0; J.wkLegal = 0; Rejon.achCheck(); Game.save();
    return res;
  };
  // własny dom: wygoda (nastrój, sen)
  const bcm = Career.comfort;
  Career.comfort = function () { const b = bcm.call(this), J = Game.s && Game.s.career && Game.s.career.rj, H = J && J.house && Rejon.HOUSES.find(h => h.id === J.house); return b + (H ? H.comfort : 0); };
})();
