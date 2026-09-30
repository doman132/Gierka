/* =========================================================
   Speedway Empire 3D — KARIERA (3): stan zawodnika w jeździe,
   sponsorzy, sprzęt, nowa mapa miasta, romanse i skandal,
   media społecznościowe
   ========================================================= */
'use strict';

/* ---------- psychika: połączenie nastroju i stresu ---------- */
Object.assign(City, {
  psyche() {
    const Z = City.Z(), r = Career.me(), v = R.clamp(r.morale * 0.6 + (100 - Z.stress) * 0.4, 0, 100);
    const label = v >= 75 ? 'Pewny siebie 😎' : v >= 58 ? 'Spokojny' : v >= 42 ? 'Nerwowy' : v >= 28 ? 'Przybity' : 'Na skraju wypalenia';
    return { v, label };
  },
});
(() => {
  const bm = City.mods;
  City.mods = function () {
    const m = bm.call(this); const C = Career.C(); if (!C || !C.city) return m;
    const p = City.psyche().v;
    m.mental += (p - 55) / 40; m.start += (p - 55) / 70;
    return m;
  };
  // w jeździe: zmęczenie = słabszy gaz, stres = drżące ręce i mniej czasu na uślizg, nerwy pod taśmą
  const bi = RaceView.input;
  RaceView.input = function () {
    const inp = bi.call(this), s = Game.s;
    if (!s || s.mode !== 'career' || !RaceView.opts || RaceView.opts.human !== s.career.me || !s.career.city) return inp;
    const Z = s.career.city, e = Z.energy, st = Z.stress, psy = City.psyche().v, t = performance.now() / 1000;
    inp.pow = e < 50 ? 0.8 + (e / 50) * 0.2 : 1 + (e - 50) / 50 * 0.03;
    inp.hold = (st > 55 ? Math.max(0.55, 1 - (st - 55) / 80) : 1 + (55 - st) / 300) * (psy < 40 ? 0.85 : 1);
    if (st > 55) inp.steer += Math.sin(t * 9.1) * Math.sin(t * 3.3) * (st - 55) / 90;
    const S = RaceView.st;
    if (S && !S.tapeUp && st > 68 && !RaceView._nerves && Math.random() < (st - 68) / 2600) { RaceView._nerves = true; inp.thr = 1; RaceView.say('Nerwy! Ręka drgnęła na gazie przed taśmą…'); }
    if (S && S.t < 0.1) RaceView._nerves = false;
    return inp;
  };
  // wskaźniki w zegarach i efekt na ekranie (zmęczenie przyciemnia brzegi, stres pulsuje)
  const bh = RaceView.rideHud;
  RaceView.rideHud = function () {
    bh.call(this);
    const s = Game.s, hud = document.getElementById('ride-hud'); if (!hud) return;
    let cond = document.getElementById('rh-cond'), vig = document.getElementById('fx-vign');
    const on = s && s.mode === 'career' && s.career.city && RaceView.opts && RaceView.opts.human === s.career.me;
    if (!on) { if (cond) cond.hidden = true; if (vig) vig.style.opacity = 0; return; }
    if (!cond) { cond = document.createElement('div'); cond.id = 'rh-cond'; hud.querySelector('.gauge').appendChild(cond); }
    if (!vig) { vig = document.createElement('div'); vig.id = 'fx-vign'; document.getElementById('md').appendChild(vig); }
    const Z = s.career.city;
    cond.hidden = false;
    cond.innerHTML = `<span>⚡<i style="width:${Z.energy}%"></i></span><span class="st">😰<i style="width:${Z.stress}%"></i></span>`;
    vig.style.opacity = Math.max(0, (50 - Z.energy) / 50) * 0.75;
    vig.classList.toggle('pulse', Z.stress > 65);
  };
  const bs = RaceView.stop;
  RaceView.stop = function () { const v = document.getElementById('fx-vign'); if (v) v.style.opacity = 0; return bs.call(this); };
  // spacer: zmęczony wolniej
  Walk.tired = () => { const s = Game.s; if (!s || s.mode !== 'career' || !s.career.city) return 1; const e = s.career.city.energy; return e < 20 ? 0.62 : e < 40 ? 0.82 : 1; };
  // wypalenie: dwa dni z rzędu stres > 85
  const be = City.endDay;
  City.endDay = function (auto) {
    const Z = City.Z(), d0 = Z.day;
    be.call(this, auto);
    if (Z.day === d0) return;
    Z.burn = Z.stress > 85 ? (Z.burn || 0) + 1 : 0;
    if (Z.burn >= 2 && Z.day <= 5) { Z.burn = 0; Career.mor(-10); UI.modal(`<div class="kicker">Twoja psychika</div><h2>Wypalenie</h2><p>Nie możesz się zmusić, żeby wstać z łóżka. Telefon wycisza się sam. Cały dzień przeleżałeś — to znak, że stresu jest za dużo.</p><p class="muted small">Stracony dzień. Nastrój −10. Idź do psychologa, na spacer albo zadzwoń do mamy.</p><div class="actions"><button class="go" data-ui="close">OK</button></div>`); Z.stress -= 20; be.call(this); }
    City.socialDay();
    City.romanceRisk();
  };
})();

/* ---------- sponsorzy ---------- */
Object.assign(City, {
  SPONSORS: [['Paliwa Gromada', 'stacje paliw'], ['Sokół Bank', 'bank'], ['Kruszywa Północ', 'budownictwo'], ['Hotel Warmia', 'hotelarstwo'], ['Łańcuch-Pol', 'części'], ['Automax', 'salon aut'],
    ['Energetyk VOLT', 'napoje'], ['Opony Grip', 'opony'], ['Kaski Nova', 'sprzęt'], ['Kebab u Staszka', 'gastronomia'], ['Browar Taśma', 'piwo'], ['Siłownia Power', 'fitness'], ['Deweloper Nowe Osiedle', 'nieruchomości']],
  CLAUSES: {
    image: 'Klauzula wizerunkowa — skandal = zerwanie umowy',
    noParty: 'Zakaz imprez i alkoholu w tygodniu meczowym',
    pts: 'Premia za każdy punkt w lidze',
    sessions: 'Sesja dla sponsora co tydzień (klub — biuro)',
    none: 'Bez dodatkowych warunków',
  },
  newSponsor() {
    const C = Career.C(), Z = City.Z(), used = new Set((C.deals || []).map(d => d.name).concat((C.spOffers || []).map(o => o.name)));
    const pool = City.SPONSORS.filter(([n]) => !used.has(n)); if (!pool.length) return null;
    const [name, sector] = Crowd.pick(pool), fame = C.rep + Math.log10(Math.max(100, Z.followers || 800)) * 6;
    const clause = Crowd.pick(['image', 'noParty', 'pts', 'sessions', 'none', 'image']);
    const weekly = Math.round((250 + fame * 18 + Math.random() * 400) * (clause === 'none' ? 0.7 : clause === 'sessions' ? 1.3 : 1) / 50) * 50;
    const o = { id: 'sp' + Date.now().toString(36) + Math.floor(Math.random() * 99), name, sector, weekly, weeks: R.int(6, 18), clause, perPts: clause === 'pts' ? Math.round((80 + C.rep * 3) / 10) * 10 : 0, week: Game.s.week };
    (C.spOffers = C.spOffers || []).push(o);
    City.sms(name, `Propozycja współpracy: ${weekly} zł tygodniowo przez ${o.weeks} tyg. Szczegóły w telefonie (Sponsorzy).`, null);
    return o;
  },
  acceptSponsor(id) {
    const C = Career.C(), i = (C.spOffers || []).findIndex(o => o.id === id); if (i < 0) return;
    const o = C.spOffers.splice(i, 1)[0];
    C.deals.push({ name: o.name, weekly: o.weekly, left: o.weeks, clause: o.clause, perPts: o.perPts, strikes: 0 });
    Game.save(); UI.toast(`Umowa z ${o.name}: ${o.weekly} zł/tydz. — ${City.CLAUSES[o.clause]}.`);
  },
  declineSponsor(id) { const C = Career.C(); C.spOffers = (C.spOffers || []).filter(o => o.id !== id); Game.save(); },
  /** Tygodniowe rozliczenie klauzul (po meczu) */
  sponsorWeek(lm) {
    const C = Career.C(), Z = City.Z(), s = Game.s, out = [];
    C.deals.forEach(d => {
      if (!d.clause) return;
      if (d.clause === 'pts' && lm && d.perPts) { const v = (lm.pts + lm.bonus) * d.perPts; if (v) { Career.pay(v, `Premia: ${d.name}`); out.push(`${d.name}: premia za punkty ${v} zł`); } }
      if (d.clause === 'noParty' && Z.partyWeek === s.week && lm) { d.broken = true; out.push(`${d.name} zrywa umowę — impreza w tygodniu meczowym!`); }
      if (d.clause === 'sessions') { if (Z.sponsorWeek !== s.week) { d.strikes = (d.strikes || 0) + 1; out.push(`${d.name}: brak sesji w tym tygodniu (ostrzeżenie ${d.strikes}/2)`); if (d.strikes >= 2) d.broken = true; } }
    });
    const broken = C.deals.filter(d => d.broken);
    broken.forEach(d => { Career.pay(-d.weekly, `Kara umowna: ${d.name}`); Career.repd(-3); City.sms(d.name, 'Z przykrością informujemy o rozwiązaniu umowy z powodu naruszenia jej warunków.'); });
    C.deals = C.deals.filter(d => !d.broken);
    if ((C.spOffers || []).length < 3 && Math.random() < 0.3 + C.rep / 250 + Math.min(0.2, (Z.followers || 0) / 100000)) City.newSponsor();
    C.spOffers = (C.spOffers || []).filter(o => s.week - o.week < 4); // oferty wygasają po 3 tygodniach
    return out;
  },
});

/* ---------- media społecznościowe ---------- */
Object.assign(City, {
  POSTS: { train: ['Zdjęcie z treningu', 'obserwujący +, sponsorzy lubią'], fans: ['Relacja z autografów', 'obserwujący +, reputacja +1'], gf: ['Zdjęcie z dziewczyną ❤', 'dużo polubień… ryzykowne przy romansach'], party: ['Kulisy imprezy 🍾', 'najwięcej zasięgów, reputacja −2'] },
  post(k) {
    const Z = City.Z(), C = Career.C(); if (Z.postDay === City.stamp()) { UI.toast('Dziś już coś wrzuciłeś.'); return; }
    Z.postDay = City.stamp(); Z.followers = Z.followers || 800;
    const mult = { train: 0.015, fans: 0.02, gf: 0.03, party: 0.045 }[k] * (0.6 + C.rep / 60);
    const gain = Math.round(Z.followers * mult + 20 + Math.random() * 40); Z.followers += gain;
    if (k === 'fans') Career.repd(1);
    if (k === 'party') { Career.repd(-2); Z.partyWeek = Game.s.week; }
    let msg = `+${gain} obserwujących (${Z.followers.toLocaleString('pl-PL')})`;
    if (k === 'gf' && (Z.lovers || []).length && Math.random() < 0.35) { msg += ' … a pod zdjęciem komentarz od kogoś, kto nie powinien go widzieć.'; City.scandal(); }
    Game.save(); UI.toast(msg); City.phoneRender();
  },
  socialDay() { const Z = City.Z(); Z.followers = Math.round((Z.followers || 800) * (1 + Career.C().rep / 20000)); },
});

/* ---------- sprzęt ---------- */
Career.GEAR = {
  engine: { n: 'Silnik', max: 5, cost: l => 25000 * l, eff: { speed: 0.3, start: 0.15 }, d: 'Serce motocykla: prędkość i start.' },
  tuner: { n: 'Tuning u tunera (dysze, wałek, głowica)', max: 3, cost: l => 18000 * (l + 1), eff: { speed: 0.15 }, d: 'Więcej mocy na prostych.' },
  clutch: { n: 'Sprzęgło wyścigowe', max: 3, cost: l => 9000 * (l + 1), eff: { start: 0.3 }, d: 'Szybsze wyjście spod taśmy.' },
  ignition: { n: 'Zapłon i gaźnik', max: 3, cost: l => 12000 * (l + 1), eff: { speed: 0.1, wet: 0.35 }, d: 'Równa praca silnika, lepiej na mokrym.' },
  frame: { n: 'Rama i geometria', max: 3, cost: l => 15000 * (l + 1), eff: { bends: 0.3 }, d: 'Stabilniej w łuku.' },
  tyres: { n: 'Opony (zapas na sezon)', max: 3, cost: l => 6000 * (l + 1), eff: { bends: 0.15, wet: 0.3 }, d: 'Przyczepność na każdej nawierzchni.' },
  helmet: { n: 'Kask i kevlar z ochraniaczami', max: 3, cost: l => 8000 * (l + 1), eff: { mental: 0.15 }, d: 'Krótsze kontuzje (−20% na poziom), pewność siebie.' },
  goggles: { n: 'Gogle ze zrywkami', max: 2, cost: l => 2500 * (l + 1), eff: { mental: 0.2, bends: 0.05 }, d: 'Widzisz tor w pyle spod kół rywali.' },
  mechanic: { n: 'Mechanik osobisty', max: 1, cost: () => 5000, eff: {}, d: 'Przed każdym meczem dopieszczone silniki. 1500 zł/tydz.' },
  van: { n: 'Bus serwisowy', max: 1, cost: () => 60000, eff: {}, d: 'Wyjazdy mniej męczą: po meczu +10 energii, −5 stresu.' },
};
Object.assign(Career, {
  gear() { const C = Career.C(); C.gear = C.gear || {}; C.gear.engine = C.engine; return C.gear; },
  lvlOf(k) { const g = Career.gear(); return g[k] || (k === 'engine' ? 1 : 0); },
  buyGear(k) {
    const C = Career.C(), G = Career.GEAR[k], l = Career.lvlOf(k); if (l >= G.max) return;
    const cost = G.cost(k === 'engine' ? l : l); if (C.money < cost) { UI.toast('Za mało pieniędzy.', true); return; }
    Career.pay(-cost, `${G.n} — poziom ${l + 1}`);
    if (k === 'engine') C.engine++; else Career.gear()[k] = l + 1;
    Game.save(); Career.render(); UI.toast(`${G.n}: poziom ${l + 1}!`);
  },
});
(() => {
  const bm = Career.effMods;
  Career.effMods = function (r, out) {
    bm.call(this, r, out);
    const C = Game.s.career; if (!C || r.id !== C.me) return;
    Object.entries(Career.GEAR).forEach(([k, G]) => { if (k === 'engine') return; const l = (C.gear || {})[k] || 0; Object.entries(G.eff).forEach(([a, v]) => { if (out[a] != null) out[a] = R.clamp(out[a] + v * l, 1, 20); }); });
  };
  Career.views.ksprzet = function () {
    const C = Career.C(), cards = Object.entries(Career.GEAR).map(([k, G]) => {
      const l = Career.lvlOf(k), max = l >= G.max, cost = max ? 0 : G.cost(l);
      const eff = Object.entries(G.eff).map(([a, v]) => `${Game.ATTR_NAMES[a] || a} +${num(v, 2)}`).join(', ');
      return `<div class="card gear"><div class="row between"><b>${esc(G.n)}</b><span class="pips">${'●'.repeat(k === 'engine' ? l : l)}${'○'.repeat(G.max - l)}</span></div>
        <p class="small muted">${esc(G.d)}${eff ? ` · na poziom: ${eff}` : ''}</p>
        ${max ? '<p class="good small">Najwyższy poziom.</p>' : `<button class="go small" data-ui="cGear" data-v="${k}" ${C.money < cost ? 'disabled' : ''}>Ulepsz (${cost.toLocaleString('pl-PL')} zł)</button>`}</div>`;
    }).join('');
    return `<div class="head"><h2>Sprzęt</h2><p>Własny sprzęt zawodnika — każdy element poprawia inne cechy w meczu. Pieniądze: <b>${C.money.toLocaleString('pl-PL')} zł</b></p></div>
      <div class="gears">${cards}</div>
      <div class="card"><h3>Ostatnie wydatki i wpływy</h3><ul class="list">${(C.ledger || []).slice(0, 10).map(l => `<li class="${l.v < 0 ? 'bad' : 'good'}">${esc(l.what)}: ${l.v.toLocaleString('pl-PL')} zł</li>`).join('') || '<li class="muted">Brak.</li>'}</ul></div>`;
  };
  // mechanik osobisty i bus: przed i po meczu; kask: krótsze kontuzje; sponsorzy i skandal: tydzień
  const ba = Career.advance;
  Career.advance = function () {
    const C = Career.C(); C._injBefore = Career.me().injury;
    if ((C.gear || {}).mechanic) { Career.pay(-1500, 'Mechanik osobisty'); C.prep = Math.max(C.prep || 0, 0.3); }
    return ba.call(this);
  };
  const bf = Career.finishWeek;
  Career.finishWeek = function (userMatch) {
    const C = Career.C(), s = Game.s, fx = Game.userFixture(), r = Career.me();
    const lm0 = C.lastMatch;
    const res = bf.call(this, userMatch);
    const lm = C.lastMatch && lm0 !== C.lastMatch ? C.lastMatch : (C.lastMatch && C.lastMatch.week === s.week - 1 ? C.lastMatch : null);
    const hl = (C.gear || {}).helmet || 0;
    if (r.injury > (C._injBefore || 0) && hl) { r.injury = Math.max(1, Math.round(r.injury * (1 - 0.2 * hl))); }
    if ((C.gear || {}).van && fx && fx.a === s.user && C.city) { C.city.energy += 10; C.city.stress -= 5; City.clamp(C.city); }
    if (C.benched > 0) C.benched--;
    const lines = C.city ? City.sponsorWeek(lm) : [];
    if (lines.length && C.report) C.report.lines.push(...lines);
    Game.save();
    return res;
  };
  // zawodnik odsunięty przez prezesa (skandal) — jak zawieszenie
  const bt = Career.toMatch;
  Career.toMatch = function () {
    const C = Career.C(), fx = Game.userFixture();
    if (C.benched > 0 && fx) { UI.show('mgr'); Career.render(); UI.modal(`<h2>Odsunięty od składu</h2><p>Prezes po aferze odsunął cię od drużyny jeszcze na <b>${C.benched}</b> tyg. Oglądasz mecz z trybun.</p><div class="actions"><button class="go" data-ui="cSimWeek">Oglądaj z trybun (symulacja) ▸</button></div>`); return; }
    return bt.call(this);
  };
})();

/* ---------- romanse i skandal ---------- */
Object.assign(City, {
  partners() { const Z = City.Z(); return (Z.gf ? 1 : 0) + (Z.lovers || []).length; },
  romanceRisk() {
    const Z = City.Z(), C = Career.C(), n = City.partners(); if (n < 2 || C.scandal) return;
    const risk = 0.05 * (n - 1) + C.rep / 900 + Math.min(0.08, (Z.followers || 0) / 250000) + (Z.secretToday === City.stamp() - 1 ? 0.1 : 0);
    if (Math.random() < risk) City.scandal();
  },
  flirt(p) {
    const Z = City.Z(); p.rel = Math.min(100, p.rel + 8); Z.stress -= 3;
    if (Z.gf && Math.random() < 0.08) { Z.gf.rel -= 10; return `${p.name.split(' ')[0]} śmieje się z twoich żartów… a znajoma ${Z.gf.name} widziała to z drugiego końca sali (związek −10).`; }
    return `${p.name.split(' ')[0]}: „${Crowd.pick(['Jesteś zabawny jak na kogoś, kto jeździ bez hamulców.', 'Zaprosisz mnie kiedyś na mecz?', 'Ładny uśmiech, mistrzu.'])}”`;
  },
  /** Skandal: konfrontacja → media → prezes → szatnia */
  scandal() {
    const Z = City.Z(), C = Career.C(); if (C.scandal) return;
    const names = [Z.gf && Z.gf.name].concat((Z.lovers || []).map(l => l.name)).filter(Boolean);
    if (names.length < 2) return;
    C.scandal = { step: 1, names, leak: 0 };
    City.scandalView();
  },
  scandalView(msg = '') {
    const C = Career.C(), S = C.scandal, club = Game.club(Game.s.user); if (!S) return;
    const [A, B] = S.names, box = (kick, t, x, opts) => UI.modal(`<div class="kicker">${kick}</div><div class="dilemma scandal"><div class="dl-ico">!</div><div><h2>${t}</h2>${msg ? `<p class="fx">${msg}</p>` : ''}<p>${x}</p></div></div><div class="talk-opts">${opts.map(([v, t2]) => `<button class="opt" data-ui="cScandal" data-v="${v}">${esc(t2)}</button>`).join('')}</div>`);
    if (S.step === 1) box('Afera', 'Dwie wiadomości naraz', `Wracasz wieczorem do domu. Pod drzwiami stoją <b>${esc(A)}</b> i <b>${esc(B)}</b>${S.names.length > 2 ? ` (a telefon wibruje od ${esc(S.names[2])})` : ''}. Obie trzymają telefony z waszymi wiadomościami. Cisza jest gorsza niż krzyk.`,
      [['truth', 'Powiedz prawdę i przeproś obie'], ['lie', 'Kłam, że to nieporozumienie'], ['pickA', `Wybierz ${A}`], ['pickB', `Wybierz ${B}`]]);
    if (S.step === 2) box('Media', `„Fakty Żużlowe”: Żużlowy Casanova z ${esc(club.short)}!`, `Screeny wiadomości obiegły internet. Tabloidy piszą o „romansach gwiazdki ${esc(club.name)}”, pod twoimi zdjęciami tysiące komentarzy. Sponsorzy dzwonią do agenta.`,
      [['sorry', 'Przeproś publicznie w mediach społecznościowych'], ['silent', 'Milcz i przeczekaj'], ['attack', 'Zaatakuj dziennikarzy — „to moje prywatne życie!”']]);
    if (S.step === 3) box('Klub', 'Wezwanie na dywanik', `Prezes ${esc(club.short)} rzuca gazetę na biurko: „Budowaliśmy wizerunek rodzinnego klubu. Sponsor główny grozi odejściem. Co mam z tobą zrobić?”`,
      [['accept', 'Przyjmij karę pokornie (−20% za punkt, 1 mecz na trybunach)'], ['charity', 'Zaproponuj akcję charytatywną (5000 zł, −10% za punkt)'], ['fight', 'Postaw się prezesowi']]);
    if (S.step === 4) box('Szatnia', 'Cisza w parku maszyn', `W szatni nikt się nie odzywa. ${esc(S.mate)} podchodzi blisko: „${esc(S.names[1])} to moja siostra. Wiesz o tym?”`,
      [['apol', 'Przeproś go w cztery oczy'], ['ignore', 'Wzrusz ramionami'], ['talk', '„Pogadajmy po męsku za budynkiem”']]);
  },
  scandalAct(v) {
    const C = Career.C(), S = C.scandal, Z = City.Z(), r = Career.me(); if (!S) return;
    let msg = '';
    if (S.step === 1) {
      Z.stress += 20; Career.mor(-10);
      if (v === 'truth') { S.leak = 0.4; msg = 'Obie wyszły bez słowa. Ta prawda bolała — ale była prawdą.'; Z.gf = null; Z.lovers = []; }
      if (v === 'lie') { S.leak = 0.9; Career.repd(-5); msg = 'Nie uwierzyła żadna. Zrobiły screeny rozmowy.'; Z.gf = null; Z.lovers = []; }
      if (v === 'pickA' || v === 'pickB') {
        const keep = v === 'pickA' ? S.names[0] : S.names[1]; S.leak = 0.7;
        const all = [Z.gf].concat(Z.lovers || []).filter(Boolean), k = all.find(g => g.name === keep);
        Z.gf = k ? { ...k, rel: Math.max(0, (k.rel || 50) - 30) } : null; Z.lovers = [];
        if (Z.gf && Z.gf.rel < 15) { Z.gf = null; msg = `${keep} też odchodzi: „Wybrałeś mnie? Za późno.”`; } else msg = `${keep} zostaje — ale zaufanie trzeba odbudować (związek −30). Zdradzona napisała do tabloidu…`;
      }
      S.step = Math.random() < S.leak ? 2 : 3; if (S.step === 3 && Math.random() < 0.6) { City.scandalEnd(msg + ' Na szczęście sprawa nie wyszła poza wasze grono.'); return; }
    } else if (S.step === 2) {
      Career.repd(-18); Z.followers = Math.round((Z.followers || 800) * 1.3); Z.stress += 15;
      const img = C.deals.filter(d => d.clause === 'image'); img.forEach(d => City.sms(d.name, 'W związku z doniesieniami medialnymi rozwiązujemy umowę (klauzula wizerunkowa).')); C.deals = C.deals.filter(d => d.clause !== 'image');
      if (v === 'sorry') { Career.repd(6); Z.stress -= 5; msg = 'Przeprosiny zebrały mieszane reakcje, ale część kibiców docenia.'; }
      if (v === 'silent') msg = 'Burza trwa kilka dni i powoli cichnie.';
      if (v === 'attack') { Career.repd(-8); Z.followers = Math.round(Z.followers * 1.2); msg = 'Wywiad-awantura bije rekordy wyświetleń. Reputacja leci w dół.'; }
      if (img.length) msg += ` Zerwane umowy sponsorskie: ${img.map(d => d.name).join(', ')}.`;
      S.step = 3;
    } else if (S.step === 3) {
      if (v === 'accept') { r.contract.perPoint = Math.round(r.contract.perPoint * 0.8 / 10) * 10; C.benched = 1; msg = 'Kara przyjęta: −20% za punkt, najbliższy mecz na trybunach.'; }
      if (v === 'charity') { Career.pay(-5000, 'Akcja charytatywna'); r.contract.perPoint = Math.round(r.contract.perPoint * 0.9 / 10) * 10; Career.repd(4); msg = 'Wizyta w hospicjum dziecięcym z motocyklem. Media łagodnieją (reputacja +4).'; }
      if (v === 'fight') { r.contract.perPoint = Math.round(r.contract.perPoint * 0.7 / 10) * 10; C.benched = 3; Career.repd(-5); if (Math.random() < 0.4) C.noRenew = true; msg = `Prezes: „Trzy mecze na trybunach i −30% za punkt.”${C.noRenew ? ' Po sezonie klub nie przedłuży kontraktu.' : ''}`; }
      const mates = Game.roster(Game.s.user).filter(x => x.id !== r.id);
      if (mates.length && Math.random() < 0.55) { S.mate = Crowd.pick(mates).name; S.step = 4; } else { City.scandalEnd(msg); return; }
    } else if (S.step === 4) {
      if (v === 'apol') { Career.mor(-3); msg = `${S.mate} długo milczy. „Dobra. Ale jeszcze raz…” Podajecie sobie ręce.`; }
      if (v === 'ignore') { C.rift = 6; msg = `${S.mate} odwraca się plecami. Atmosfera w drużynie siada (nastrój spada co tydzień).`; }
      if (v === 'talk') { Career.repd(-4); if (Math.random() < 0.3) { r.injury = R.int(1, 2); msg = 'Szarpanina za parkiem maszyn. Ochrona was rozdziela — a ty masz stłuczony nadgarstek.'; } else msg = 'Pokrzyczeliście na siebie, ale oczyściło to atmosferę.'; }
      City.scandalEnd(msg); return;
    }
    City.clamp(Z); Game.save(); City.scandalView(msg);
  },
  scandalEnd(msg) {
    const C = Career.C(); C.scandal = null; C.scandals = (C.scandals || 0) + 1; Game.save(); Career.render();
    UI.modal(`<div class="kicker">Afera</div><h2>Po burzy</h2><p class="fx big-fx">${esc(msg)}</p><p class="muted small">Stres, reputacja i kontrakt poszły w dół. Czas skupić się na torze.</p><div class="actions"><button class="go" data-ui="close">Dalej</button></div>`);
  },
});
(() => {
  // rozmowy: flirt z każdą znajomą i romans mimo związku
  const bt = City.talk;
  City.talk = function (id, act) {
    const p = City.person(id), Z = City.Z();
    if (p && act === 'flirt') { UI.close(); p.talked = City.stamp(); const m = City.flirt(p); City.clamp(Z); Game.save(); UI.toast(m); return; }
    if (p && act === 'datego' && Z.gf && Z.gf.pid !== p.id) {
      UI.close(); (Z.lovers = Z.lovers || []).push({ pid: p.id, name: p.name.split(' ')[0], rel: 45, since: Game.s.week }); p.rel += 10; Z.stress -= 5;
      UI.toast(`${p.name.split(' ')[0]} się zgadza… Masz romans. ${Z.gf.name} nic nie wie — na razie.`); Game.save(); return;
    }
    const r = bt.call(this, id, act);
    if (!act && p && p.known && p.type === 'dziewczyna') {
      const box = document.querySelector('#modal .talk-opts'), taken = (Z.gf && Z.gf.pid === p.id) || (Z.lovers || []).some(l => l.pid === p.id);
      if (box) {
        box.insertAdjacentHTML('beforeend', `<button class="opt" data-ui="cityTalk" data-v="${p.id}:flirt">Flirtuj 😏</button>`);
        if (!taken && Z.gf && p.rel >= 40) box.insertAdjacentHTML('beforeend', `<button class="opt warn" data-ui="cityTalk" data-v="${p.id}:datego">Umów się na randkę (masz już ${esc(Z.gf.name)}!)</button>`);
      }
    }
    return r;
  };
  // telefon: sponsorzy, media społecznościowe, sekretne spotkania
  const br = City.phoneRender;
  City.phoneRender = function () {
    const app = City.app || 'home', el = document.getElementById('phone'), Z = City.Z(), C = Career.C();
    if (el && app === 'sponsors') {
      City.app = 'home'; br.call(this); City.app = 'sponsors';
      const body = el.querySelector('.ph-body'), title = el.querySelector('.ph-title');
      title.innerHTML = '<button data-ui="ph" data-v="app:home">‹</button> Sponsorzy';
      body.innerHTML = `<p class="ph-note">Oferty</p><ul class="ph-list">${(C.spOffers || []).map(o => `<li><div><b>${esc(o.name)}</b><small>${o.weekly} zł/tydz. · ${o.weeks} tyg.${o.perPts ? ` · ${o.perPts} zł/pkt` : ''}<br>${esc(City.CLAUSES[o.clause])}</small></div><div><button data-ui="ph" data-v="spyes:${o.id}">✓</button> <button class="no" data-ui="ph" data-v="spno:${o.id}">✕</button></div></li>`).join('') || '<li class="ph-note">Brak ofert — reputacja i obserwujący przyciągają sponsorów.</li>'}</ul>
        <p class="ph-note">Twoje umowy</p><ul class="ph-list">${C.deals.map(d => `<li><div><b>${esc(d.name)}</b><small>${d.weekly} zł/tydz. · jeszcze ${d.left} tyg.${d.clause ? `<br>${esc(City.CLAUSES[d.clause] || '')}` : ''}</small></div></li>`).join('') || '<li class="ph-note">Brak.</li>'}</ul>`;
      return;
    }
    if (el && app === 'social') {
      City.app = 'home'; br.call(this); City.app = 'social';
      const body = el.querySelector('.ph-body'), title = el.querySelector('.ph-title');
      title.innerHTML = '<button data-ui="ph" data-v="app:home">‹</button> Relacje 📸';
      body.innerHTML = `<div class="ph-bank"><small>Obserwujący</small><b>${(Z.followers || 800).toLocaleString('pl-PL')}</b></div><p class="ph-note">${Z.postDay === City.stamp() ? 'Dziś już wrzuciłeś post.' : 'Wrzuć coś (raz dziennie):'}</p>
        <ul class="ph-list">${Object.entries(City.POSTS).filter(([k]) => k !== 'gf' || Z.gf).map(([k, [n, d]]) => `<li><div><b>${n}</b><small>${d}</small></div><button data-ui="ph" data-v="post:${k}" ${Z.postDay === City.stamp() ? 'disabled' : ''}>Wrzuć</button></li>`).join('')}</ul>`;
      return;
    }
    br.call(this);
    if (!el) return;
    if (app === 'home') { const grid = el.querySelector('.ph-grid'); if (grid) grid.insertAdjacentHTML('beforeend', `<button data-ui="ph" data-v="app:sponsors"><b>💼</b><small>Sponsorzy${(C.spOffers || []).length ? ` (${C.spOffers.length})` : ''}</small></button><button data-ui="ph" data-v="app:social"><b>📸</b><small>Relacje</small></button>`); }
    if (app === 'contacts') (Z.lovers || []).forEach(l => { const li = [...el.querySelectorAll('.ph-list li')].find(x => x.textContent.includes(l.name)); if (li) li.querySelector('b').insertAdjacentText('beforeend', ' 🤫'); });
    if (app.startsWith('call:')) { const id = app.slice(5), l = (Z.lovers || []).find(x => x.pid === id), box = el.querySelector('.ph-call'); if (l && box) box.insertAdjacentHTML('beforeend', `<button data-ui="ph" data-v="do:${id}:secret">Sekretne spotkanie (150 zł) 🤫</button>`); }
  };
  const bd = City.phoneDo;
  City.phoneDo = function (v) {
    const Z = City.Z(), C = Career.C();
    if (v.startsWith('spyes:')) { City.acceptSponsor(v.slice(6)); City.phoneRender(); return; }
    if (v.startsWith('spno:')) { City.declineSponsor(v.slice(5)); City.phoneRender(); return; }
    if (v.startsWith('post:')) { City.post(v.slice(5)); return; }
    if (v.endsWith(':secret')) {
      const id = v.split(':')[1], l = (Z.lovers || []).find(x => x.pid === id); if (!l) return;
      if (C.money < 150) { UI.toast('Za mało pieniędzy.', true); return; }
      if (City.weekDone()) { UI.toast('Tydzień za tobą.', true); return; }
      Career.pay(-150, 'Kolacja w ustronnym miejscu'); l.rel += 10; Z.stress -= 8; Z.secretToday = City.stamp();
      City.phoneToggle(); City.pay(Z, { n: `Sekretne spotkanie (${l.name})` }, `Kolacja z ${l.name} w restauracji za miastem. Nikt was nie widział… chyba.`);
      if (Math.random() < 0.12) City.scandal();
      return;
    }
    return bd.call(this, v);
  };
  // klub: sesja dla sponsora zapisuje tydzień (klauzula „sesje”), impreza — tydzień imprezowy
  const ba = City.act;
  City.act = function (place, id) {
    const Z = City.Z();
    if (id === 'sponsor') Z.sponsorWeek = Game.s.week;
    if (id === 'party' || id === 'beer') Z.partyWeek = Game.s.week;
    return ba.call(this, place, id);
  };
  const bb = City.buy;
  City.buy = function (kind, item) { if (item === 'beer' || item === 'whisky') City.Z().partyWeek = Game.s.week; return bb.call(this, kind, item); };
  // kliknięcia
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cGear') { Career.buyGear(d.v); return true; }
    if (d.ui === 'cScandal') { City.scandalAct(d.v); return true; }
    if (d.ui === 'cEngine') { Career.buyGear('engine'); return true; }
    return bc.call(this, d);
  };
  // oferty po sezonie: po „postawieniu się” klub nie przedłuża
  const bse = Career.seasonEnd;
  Career.seasonEnd = function () { const r = bse.call(this); const C = Career.C(); if (C.noRenew) { C.offers = C.offers.filter(o => o.club !== Game.s.user); C.noRenew = false; Game.news('Klub nie przedłużył z tobą kontraktu po aferze. Szukasz nowego klubu.', 'bad'); } return r; };
  // rozłam w drużynie po aferze
  const bfw = City.finishDays;
  City.finishDays = function () { const C = Career.C(); if (C.rift > 0) { C.rift--; Career.mor(-2); } return bfw.call(this); };
})();

/* ---------- noc we dwoje: pełne wygaszenie, poranek z kawą w kuchni ---------- */
(() => {
  const bd = City.dateAct;
  City.dateAct = function (k) {
    if (k !== 'night') return bd.call(this, k);
    const Z = City.Z(), G = Z.gf; if (!G) return;
    UI.close();
    let ov = document.getElementById('sleepov'); if (!ov) { ov = document.createElement('div'); ov.id = 'sleepov'; document.body.appendChild(ov); }
    ov.className = 'on dark instant'; ov.innerHTML = '<div><b>❤</b><small>Światło gaśnie…</small></div>';
    setTimeout(() => {
      G.rel += 15; Z.stress -= 25; Career.mor(8); G.lastDate = Game.s.week; G.nights = (G.nights || 0) + 1;
      City._homeDate = false; City._morning = true; City.endDay();
      // poranek: ona w kuchni z kawą, ty przy łóżku patrzysz w stronę kuchni
      if (Walk.active && Walk.room === 'home') { Walk.enterRoom('home'); const R = World.rooms.home; Walk.x = R.cx - 4.2; Walk.z = -1.9; Walk.yaw = Math.atan2(-((R.cx - 4.6) - Walk.x), -(4.7 - Walk.z)); Walk.pitch = -0.08; }
      ov.innerHTML = `<div><b>Poranek</b><small>${esc(G.name)} robi kawę i nuci pod nosem. Związek +15, stres −25.</small></div>`;
    }, 2400);
    setTimeout(() => { ov.className = 'on'; }, 4200);   // powolne rozjaśnienie
    setTimeout(() => { ov.className = ''; City._morning = false; }, 6200);
  };
  // poranek: dziewczyna w kuchni z kubkiem
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) {
    be.call(this, key);
    if (key !== 'home' || !City._morning || !Humans.ready) return;
    const Z = City.Z(); if (!Z.gf) return;
    const R = World.rooms.home, gp = Z.gf.pid && City.person(Z.gf.pid);
    // zdejmij ewentualną postać z kanapy (dodaną przez randkę) i postaw ją w kuchni
    const m = Humans.make(City.gfKey ? City.gfKey() : (gp ? gp.key : 'Female_Adult_04'), 'drink', { sex: 'f' }); if (!m) return;
    m.position.set(R.cx - 4.6, World.LOCKER_Y, 4.7); m.rotation.y = Math.PI / 2 + 0.6; Rooms.add(m);
  };
})();

/* ---------- nowa mapa miasta ---------- */
Object.assign(City, {
  mapData() {
    if (City._map) return City._map;
    let seed = 42; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const P = City.PLACES, blocks = [], trees = [];
    const nearPoi = (x, y, pad) => Object.values(P).some(p => Math.hypot(p.x - x, p.y - y) < pad);
    const river = x => 330 + Math.sin(x / 170) * 28 + (x > 430 ? 12 : 0);
    for (let x = 20; x < 990; x += 26) for (let y = 20; y < 590; y += 24) {
      if (rnd() < 0.3) continue;
      const w = 12 + rnd() * 12, h = 10 + rnd() * 10, cx = x + w / 2, cy = y + h / 2;
      if (Math.abs(cy - river(cx)) < 36) continue;
      if (cx > 740 && cx < 980 && cy > 175 && cy < 355) { if (rnd() < 0.8) trees.push([cx, cy, 4 + rnd() * 5]); continue; } // park
      if (Math.hypot((cx - 520) / 130, (cy - 175) / 80) < 1) continue; // stadion
      if (nearPoi(cx, cy, 44)) continue;
      if ([[150, 455, 880, 485], [120, 175, 845, 265]].some(([x1, y1, x2, y2]) => { const t = R.clamp((cx - x1) / (x2 - x1), 0, 1); return Math.abs(cy - (y1 + (y2 - y1) * t)) < 16; })) continue;
      blocks.push([x, y, w, h, rnd()]);
    }
    for (let i = 0; i < 60; i++) trees.push([20 + rnd() * 960, 20 + rnd() * 560, 3 + rnd() * 4]);
    return (City._map = { blocks, trees: trees.filter(([x, y]) => Math.abs(y - river(x)) > 30 && !nearPoi(x, y, 34)), river });
  },
  mapSvg() {
    const Z = City.Z(), P = City.PLACES, sel = City.sel || Z.loc, M = City.mapData(), slot = Z.day > 5 ? 2 : Z.slot;
    const night = slot === 2, pal = night ? { land: '#1b212b', park: '#1d3326', water: '#16304a', road: '#3a4455', casing: '#262d39', bld: '#2a3140', bld2: '#323a4b', txt: '#c9d2e0', label: 'rgba(200,210,230,.18)' }
      : slot === 0 ? { land: '#e7ebe2', park: '#bcd9ab', water: '#9ec8e6', road: '#ffffff', casing: '#c9ccc4', bld: '#d6d2c9', bld2: '#cbc6bb', txt: '#39414d', label: 'rgba(40,50,60,.12)' }
      : { land: '#ece6d6', park: '#c3d8a2', water: '#93c0e0', road: '#fffaf0', casing: '#d2c9b4', bld: '#dcd3c1', bld2: '#d0c6b2', txt: '#3d3a33', label: 'rgba(60,50,30,.13)' };
    const riverPath = (() => { let d = ''; for (let x = -20; x <= 1020; x += 20) d += `${x === -20 ? 'M' : 'L'}${x} ${M.river(x).toFixed(1)} `; return d; })();
    const roads = [['M150 455 L345 470 L690 455 L880 485', 20, 'al. Mistrzów Świata'], ['M120 175 L285 205 L520 215 L845 265', 20, 'ul. Stadionowa'], ['M285 205 L345 470', 13, 'ul. Kasprzaka'], ['M520 215 L660 300 L690 455', 13, 'ul. Taśmowa'], ['M150 455 L120 175', 13, 'ul. Parkowa'], ['M845 265 L880 485', 13, 'ul. Złota']];
    const lit = night ? M.blocks.filter(b => b[4] > 0.5).map(([x, y, w, h, r]) => `<rect x="${(x + w * r * 0.6).toFixed(1)}" y="${(y + h * 0.3).toFixed(1)}" width="2.2" height="2.2" fill="#ffd27a"/>`).join('') : '';
    const pin = (k, p) => {
      const on = sel === k, here = Z.loc === k;
      return `<g class="cpin ${on ? 'on' : ''}" data-ui="cityGo" data-v="${k}" transform="translate(${p.x} ${p.y})">
        ${on ? `<circle r="40" fill="${p.c}" opacity=".18"/>` : ''}
        <path d="M0 6 C -20 -12, -18 -40, 0 -40 C 18 -40, 20 -12, 0 6 Z" fill="${p.c}" stroke="#fff" stroke-width="2.5" filter="url(#pshadow)"/>
        <text y="-17" text-anchor="middle" class="ic">${p.icon}</text>
        <g transform="translate(0 22)"><rect x="-74" y="-11" width="148" height="22" rx="11" class="plbl"/><text y="5" text-anchor="middle" class="nm">${esc(p.name)}</text></g>
        ${here ? '<g class="me" transform="translate(20 -44)"><circle r="11"/><text y="4" text-anchor="middle">TY</text></g>' : ''}</g>`;
    };
    const cur = P[Z.loc], dst = P[sel];
    return `<svg class="citymap v2 ${night ? 'night' : ''}" viewBox="0 0 1000 600">
      <defs><filter id="pshadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".35"/></filter>
        <filter id="bshadow"><feDropShadow dx="1.5" dy="2" stdDeviation="0.6" flood-opacity="${night ? 0.5 : 0.25}"/></filter></defs>
      <rect width="1000" height="600" fill="${pal.land}"/>
      <text x="80" y="95" class="dist" fill="${pal.label}">STARE MIASTO</text><text x="600" y="560" class="dist" fill="${pal.label}">CENTRUM</text><text x="40" y="560" class="dist" fill="${pal.label}">OSIEDLE ŻUŻLOWCÓW</text>
      <path d="M745 180 Q 760 170 960 185 Q 985 260 965 350 Q 850 360 750 345 Q 735 260 745 180 Z" fill="${pal.park}"/><text x="860" y="345" class="dist small" fill="${pal.label}">PARK MIEJSKI</text>
      <path d="${riverPath}" stroke="${pal.water}" stroke-width="40" fill="none" stroke-linecap="round"/>
      <path d="M-20 590 L1020 520" stroke="${pal.casing}" stroke-width="5" fill="none"/><path d="M-20 590 L1020 520" stroke="${pal.land}" stroke-width="2" stroke-dasharray="10 8" fill="none"/>
      <g filter="url(#bshadow)">${M.blocks.map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${r > 0.5 ? pal.bld : pal.bld2}"/>`).join('')}</g>${lit}
      ${M.trees.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${night ? '#24452f' : '#8fbf78'}" opacity=".9"/>`).join('')}
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">${roads.map(([d, w]) => `<path d="${d}" stroke="${pal.casing}" stroke-width="${w + 4}"/>`).join('')}${roads.map(([d, w]) => `<path d="${d}" stroke="${pal.road}" stroke-width="${w}"/>`).join('')}</g>
      ${roads.map(([d, , n], i) => `<path id="rd${i}" d="${d}" fill="none"/><text class="rname" fill="${pal.txt}"><textPath href="#rd${i}" startOffset="30%">${n}</textPath></text>`).join('')}
      ${[[300, 330], [690, 350], [150, 320]].map(([x, y]) => `<rect x="${x - 12}" y="${M.river(x) - 26}" width="24" height="52" fill="${pal.road}" stroke="${pal.casing}" stroke-width="2"/>`).join('')}
      <g transform="translate(520 85)"><ellipse rx="112" ry="66" fill="${night ? '#39404c' : '#9aa0a8'}"/><ellipse rx="96" ry="54" fill="#1a1918"/><ellipse rx="66" ry="30" fill="#2f7a3a"/>
        ${[[-118, -70], [118, -70], [-118, 70], [118, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${night ? 9 : 5}" fill="${night ? '#fff6d8' : '#6b7078'}" ${night ? 'opacity=".9"' : ''}/>`).join('')}</g>
      ${cur && dst && cur !== dst ? `<path d="M${cur.x} ${cur.y} L${dst.x} ${dst.y}" stroke="${dst.c}" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round" fill="none" class="route"/>` : ''}
      ${Object.entries(P).map(([k, p]) => pin(k, p)).join('')}
      <g transform="translate(955 45)" class="compass"><circle r="22" fill="${pal.land}" stroke="${pal.casing}" stroke-width="2"/><path d="M0 -17 L6 0 L0 17 L-6 0Z" fill="${pal.txt}" opacity=".7"/><path d="M0 -17 L6 0 L-6 0Z" fill="#c8102e"/><text y="-26" text-anchor="middle" fill="${pal.txt}">N</text></g>
      <g transform="translate(30 30)"><rect width="150" height="30" rx="15" fill="${night ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.8)'}"/><text x="75" y="20" text-anchor="middle" class="clock" fill="${pal.txt}">${Z.day > 5 ? 'Niedziela — mecz' : `${City.DAYS[Z.day]}, ${City.SLOTS[Z.slot]}`}</text></g>
    </svg>`;
  },
});
(() => {
  const bv = City.view;
  City.view = function () {
    let html = bv.call(this).replace(/<svg class="citymap"[\s\S]*?<\/svg>/, City.mapSvg());
    const p = City.psyche();
    html = html.replace('<p class="small">Wpływ na jazdę:', `<div class="cbar ${p.v < 40 ? 'bad' : 'ps'}"><span>Psychika</span><div><i style="width:${Math.round(p.v)}%"></i></div><b>${Math.round(p.v)}</b></div><p class="small muted">${p.label}</p><p class="small">Wpływ na jazdę:`);
    return html;
  };
})();

/* ---------- odpisywanie na SMS-y ---------- */
Object.assign(City, {
  /** Odpowiedzi pasujące do wiadomości: [klucz, tekst] */
  replies(m) {
    const Z = City.Z(), C = Career.C(), isGf = Z.gf && (m.pid === Z.gf.pid || m.from === Z.gf.name), lover = (Z.lovers || []).find(l => l.pid === m.pid || l.name === m.from);
    const sp = (C.spOffers || []).find(o => o.name === m.from);
    if (m.invite && m.t === City.stamp()) return [['yes', 'Będę! 👍'], ['no', 'Dziś nie dam rady, sorry']];
    if (sp) return [['spyes', 'Wchodzę w to! Podpisujemy.'], ['spthink', 'Dziękuję, przemyślę propozycję'], ['spno', 'Nie jestem zainteresowany']];
    if (m.pid === 'mama' || m.from === 'Mama') return [['mama', 'Dzięki mamo, wszystko ok ❤'], ['mamabusy', 'Mamo, jestem zajęty…']];
    if (isGf) return [['love', 'Też tęsknię ❤'], ['busy', 'Zajęty, pogadamy później'], ['come', 'Wpadnij do mnie wieczorem 😉']];
    if (lover) return [['secretok', 'Też o tobie myślę 🤫'], ['end', 'Musimy przestać się widywać…']];
    if (City.person(m.pid)) return [['friend', 'Wzajemnie! 🙂'], ['emoji', '👍'], ['cold', 'ok']];
    return [['emoji', '👍']];
  },
  reply(i, k) {
    const Z = City.Z(), C = Career.C(), m = (Z.sms || [])[i]; if (!m) return;
    const opt = City.replies(m).find(([key]) => key === k); if (!opt) return;
    m.replies = (m.replies || []).concat(opt[1]); m.replied = true;
    const p = City.person(m.pid), lover = (Z.lovers || []).find(l => l.pid === m.pid || l.name === m.from);
    let msg = '';
    switch (k) {
      case 'yes': if (p) { Z.invite = { pid: p.id, place: m.invite, day: Z.day }; p.rel = Math.min(100, p.rel + 3); } msg = `${m.from.split(' ')[0]} czeka — ${City.PLACES[m.invite].name}.`; break;
      case 'no': if (p) p.rel = Math.max(0, p.rel - 1); if (Z.invite && Z.invite.pid === m.pid) Z.invite = null; msg = 'Może następnym razem.'; break;
      case 'spyes': { const o = (C.spOffers || []).find(x => x.name === m.from); if (o) City.acceptSponsor(o.id); return City.phoneRender(); }
      case 'spthink': msg = 'Oferta czeka w aplikacji Sponsorzy (ważna 3 tygodnie).'; break;
      case 'spno': { const o = (C.spOffers || []).find(x => x.name === m.from); if (o) City.declineSponsor(o.id); msg = 'Odrzuciłeś ofertę.'; break; }
      case 'mama': Z.stress -= 3; Career.mor(1); msg = 'Mama: „Kocham cię, synku! Uważaj na łukach.”'; break;
      case 'mamabusy': Z.stress += 1; msg = 'Mama: „No dobrze… 😔”'; break;
      case 'love': if (Z.gf) { Z.gf.rel = Math.min(100, Z.gf.rel + 4); Z.stress -= 3; msg = `${Z.gf.name}: „❤❤❤”`; } break;
      case 'busy': if (Z.gf) { Z.gf.rel -= 3; msg = `${Z.gf.name}: „Jak zawsze…”`; } break;
      case 'come': if (Z.gf) { if (Z.gf.rel >= 45) { Z.gfComing = City.stamp(); msg = `${Z.gf.name}: „Będę wieczorem 😘” — czeka w twoim mieszkaniu.`; } else { Z.gf.rel -= 2; msg = `${Z.gf.name}: „Hola, hola, nie za szybko 😅”`; } } break;
      case 'secretok': if (lover) { lover.rel += 4; Z.secretToday = City.stamp(); msg = `${lover.name}: „🤫❤”`; if (Math.random() < 0.06) { City.phoneRender(); City.scandal(); return; } } break;
      case 'end': if (lover) { Z.lovers = Z.lovers.filter(l => l !== lover); Z.stress += 5; msg = `${lover.name}: „Rozumiem. Powodzenia.” Koniec romansu.`; } break;
      case 'friend': if (p) { p.rel = Math.min(100, p.rel + 3); } msg = 'Znajomość +3.'; break;
      case 'emoji': if (p) p.rel = Math.min(100, p.rel + 1); msg = '👍'; break;
      case 'cold': if (p) p.rel = Math.max(0, p.rel - 2); msg = 'Krótko i zimno.'; break;
    }
    City.clamp(Z); Game.save(); if (msg) UI.toast(msg); City.app = 'sms'; City.phoneRender();
  },
});
(() => {
  const br = City.phoneRender;
  City.phoneRender = function () {
    const app = City.app || 'home', el = document.getElementById('phone');
    if (el && (app === 'sms' || app.startsWith('reply:'))) {
      const Z = City.Z(); City.app = 'home'; br.call(this); City.app = app;
      const body = el.querySelector('.ph-body'), title = el.querySelector('.ph-title');
      if (app === 'sms') {
        (Z.sms || []).forEach(m => { m.read = true; });
        title.innerHTML = '<button data-ui="ph" data-v="app:home">‹</button> Wiadomości';
        body.innerHTML = `<ul class="ph-list sms">${(Z.sms || []).map((m, i) => `<li><div><b>${esc(m.from)}</b><small>${esc(m.text)}</small>${(m.replies || []).map(r => `<small class="me">Ty: ${esc(r)}</small>`).join('')}</div>
          <div class="sms-act">${m.invite && m.t === City.stamp() ? `<button data-ui="ph" data-v="go:${m.invite}">Idę</button>` : ''}${!m.replied ? `<button data-ui="ph" data-v="app:reply:${i}">Odpisz</button>` : ''}</div></li>`).join('') || '<li class="ph-note">Brak wiadomości.</li>'}</ul>`;
      } else {
        const i = +app.slice(6), m = (Z.sms || [])[i];
        title.innerHTML = `<button data-ui="ph" data-v="app:sms">‹</button> ${esc(m ? m.from : '')}`;
        body.innerHTML = m ? `<div class="bubble in">${esc(m.text)}</div>${(m.replies || []).map(r => `<div class="bubble out">${esc(r)}</div>`).join('')}<p class="ph-note">Odpowiedz:</p><div class="ph-call">${City.replies(m).map(([k, t]) => `<button data-ui="ph" data-v="rep:${i}:${k}">${esc(t)}</button>`).join('')}</div>` : '';
      }
      return;
    }
    return br.call(this);
  };
  const bd = City.phoneDo;
  City.phoneDo = function (v) { if (v.startsWith('rep:')) { const [, i, k] = v.split(':'); City.reply(+i, k); return; } return bd.call(this, v); };
  // „wpadnij wieczorem”: dziewczyna czeka w mieszkaniu tego dnia
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { const Z = Game.s && Game.s.mode === 'career' && Game.s.career.city; if (key === 'home' && Z && Z.gf && Z.gfComing === City.stamp()) City._homeDate = true; return be.call(this, key); };
})();
