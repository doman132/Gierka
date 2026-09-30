/* =========================================================
   Speedway Empire 3D — KARIERA (5): turnieje indywidualne
   (Grand Prix, eliminacje, dzika karta, reprezentacja),
   liga zagraniczna, kontuzje i rehabilitacja, rywale,
   pogoda, trener mentalny i rutyna przed startem,
   transfery w trakcie sezonu, oświadczyny i ślub.
   ========================================================= */
'use strict';

/* =========================================================
   TURNIEJE: 16 zawodników, 20 biegów (każdy z każdym raz),
   półfinały i finał; w swoich biegach jedziesz sam (3D)
   ========================================================= */
const Meet = {
  m: null,
  // klasyczna tabela biegów turnieju indywidualnego (numery 1–16)
  GRID: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], [4, 8, 12, 16], [1, 6, 11, 16], [2, 5, 12, 15],
    [3, 8, 9, 14], [4, 7, 10, 13], [1, 7, 12, 14], [2, 8, 11, 13], [3, 5, 10, 16], [4, 6, 9, 15], [1, 8, 10, 15], [2, 7, 9, 16], [3, 6, 12, 13], [4, 5, 11, 14]],
  GP_PTS: [20, 18, 16, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  PRIZE: [60000, 45000, 35000, 28000, 22000, 18000, 15000, 12000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000],
  CITIES: ['Grand Prix Polski', 'Grand Prix Danii', 'Grand Prix Szwecji', 'Grand Prix Wielkiej Brytanii', 'Grand Prix Czech', 'Grand Prix Łotwy', 'Grand Prix Australii'],
  NATS: { POL: 'Polska', DEN: 'Dania', SWE: 'Szwecja', GBR: 'Wielka Brytania', AUS: 'Australia', CZE: 'Czechy', LAT: 'Łotwa' },
  HELM: ['#E5413A', '#3D7FE0', '#EDEDED', '#F2C230'],

  /** Zawodnik-gość (nie należy do ligi): imię z puli narodowej, cechy wokół poziomu */
  guest(level, nat) { const r = Game.genRider(level, { nat, age: R.int(20, 33) }); return { id: 'g' + Math.random().toString(36).slice(2, 8), name: r.name, nat, a: r.a }; },
  /** Stała stawka GP na sezon (15 rywali) */
  gpField() {
    const C = Career.C(), s = Game.s;
    if (!C.gp || C.gp.season !== s.season) C.gp = { season: s.season, qualified: C.gpNext === s.season, field: [], table: {}, rounds: 0 };
    if (!C.gp.field.length) { const nats = ['POL', 'POL', 'POL', 'DEN', 'DEN', 'SWE', 'SWE', 'GBR', 'GBR', 'AUS', 'AUS', 'CZE', 'LAT', 'DEN', 'AUS']; C.gp.field = nats.map((n, i) => Meet.guest(16.2 - i * 0.12, n)); }
    return C.gp;
  },

  /** Kalendarz: co w danym tygodniu (albo null) */
  due(w = Game.s.week) {
    const s = Game.s, C = Career.C(), r = Career.me(); if (!C || s.over) return null;
    const key = s.season + ':' + w; if ((C.meetsDone || {})[key]) return null;
    const S = r.season, avg = S.heats ? (S.pts + S.bonus) / S.heats : 0, ov = Game.ovr(r);
    const gp = Meet.gpField();
    const GPW = [2, 6, 10, 13, 16];
    if (GPW.includes(w) && gp.qualified) return { kind: 'gp', title: Meet.CITIES[GPW.indexOf(w) % Meet.CITIES.length], key };
    if (w === 6 && !gp.qualified && C.rep >= 40 && r.age >= 18) return { kind: 'wild', title: 'Grand Prix Polski — dzika karta', key };
    if (w === 8 && C.gpNext !== s.season + 1 && r.age >= 18 && (avg >= 1.45 && S.heats >= 10 || r.ksm >= 6 || C.rep >= 45)) return { kind: 'gpq', title: 'Eliminacje Grand Prix (Challenge)', key };
    if (w === 11 && r.age <= 21 && (ov >= 10.5 || C.rep >= 30 || avg >= 1.3)) return { kind: 'natj', title: 'Drużynowe Mistrzostwa Europy Juniorów', key };
    if (w === 12 && r.age > 21 && (ov >= 13.5 || r.ksm >= 7 || C.rep >= 60)) return { kind: 'nat', title: 'Drużynowy Puchar Narodów', key };
    return null;
  },

  /** Zaproszenie przed turniejem (modal przed meczem ligowym) */
  invite(d) {
    const C = Career.C(), r = Career.me();
    const txt = { gp: 'Runda cyklu Grand Prix — najlepsza szesnastka świata. Punkty do klasyfikacji mistrzostw świata i duże premie.', wild: 'Organizator daje ci dziką kartę na Grand Prix Polski! Jedna szansa, żeby pokazać się światu.',
      gpq: 'Turniej eliminacyjny: pierwsza trójka awansuje do cyklu Grand Prix w przyszłym sezonie.', natj: 'Trener kadry juniorów powołał cię do reprezentacji Polski. Cztery drużyny, jeden puchar.', nat: 'Powołanie do reprezentacji Polski na Drużynowy Puchar Narodów.' }[d.kind];
    if (r.injury > 0 || C.suspended > 0 || C.jail > 0) { (C.meetsDone = C.meetsDone || {})[d.key] = 'miss'; Game.news(`${d.title}: nie wystartujesz (${r.injury ? 'kontuzja' : 'zawieszenie'}).`, 'bad'); return false; }
    UI.show('mgr'); Career.render();
    UI.modal(`<div class="kicker">W sobotę · przed meczem ligowym</div><div class="dilemma"><div class="dl-ico">🏆</div><div><h2>${esc(d.title)}</h2><p>${txt}</p>
      <p class="small muted">Energia ${Math.round(City.Z().energy)} · Stres ${Math.round(City.Z().stress)} — turniej zmęczy cię przed niedzielą (energia −15).</p></div></div>
      <div class="actions"><button class="go" data-ui="cMeetGo">Jadę! ▸</button><button class="ghost" data-ui="cMeetSkip">Odpuszczam (reputacja −3)</button></div>`);
    Meet._due = d;
    return true;
  },

  start(d) {
    const s = Game.s, C = Career.C(), me = Career.me(), myClub = Game.club(s.user);
    const lvl = { gp: 16, wild: 16, gpq: 14.2, natj: 11.2, nat: 14.6, mimp: 10.8, kask: 13.4 }[d.kind] || 13;
    let field;
    if (d.kind === 'gp' || d.kind === 'wild') field = Meet.gpField().field.slice(0, 15);
    else if (d.kind === 'natj' || d.kind === 'nat') { const teams = ['POL', 'DEN', 'SWE', 'GBR']; field = []; teams.forEach(t => { for (let k = 0; k < 4; k++) if (!(t === 'POL' && k === 0)) field.push({ ...Meet.guest(lvl + (t === 'POL' ? 0.3 : 0) + (Math.random() - 0.5), t), team: t }); }); }
    else field = Array.from({ length: 15 }, (_, i) => Meet.guest(lvl + 0.8 - i * 0.1, Crowd.pick(Object.keys(Meet.NATS))));
    const meObj = { id: me.id, name: me.name, nat: 'POL', me: true, team: 'POL' };
    // numer startowy: losowanie
    const all = field.slice(); all.splice(R.int(0, 15), 0, meObj);
    const venues = s.clubs.map(c => c.id);
    Meet.m = { d, kind: d.kind, title: d.title, riders: all, pts: {}, heats: {}, n: 0, stage: 'q', cond: { ...(s.forecast || { weather: 'dry', wet: 0, wind: 2, temp: 18 }), prep: Math.random() < 0.5 ? 'hard' : 'grippy', rut: 0.05 }, venue: Crowd.pick(venues), log: [], team: d.kind === 'nat' || d.kind === 'natj' };
    all.forEach(x => { Meet.m.pts[x.id] = 0; Meet.m.heats[x.id] = []; });
    // świat 3D: stadion z pełnymi trybunami
    const V = Game.club(Meet.m.venue);
    UI.show('md'); World.enterVenue(V.id); World.setVenue(d.title, '#1b1b1f', '#c9a227', 'GP'); World.setFlagColors('#1b1b1f', '#c9a227'); World.setTeams(myClub, null);
    World.setStadium({ fill: d.kind === 'gpq' ? 0.55 : 0.95, lights: 5, boards: [] }); World.clearMarks(); World.setRiders([]);
    if (World.rain && World.rain.p) World.rain.p.visible = DATA.WEATHER[Meet.m.cond.weather] ? DATA.WEATHER[Meet.m.cond.weather].rain : false;
    World.setScreen([d.title, 'Prezentacja zawodników', DATA.WEATHER[Meet.m.cond.weather] ? DATA.WEATHER[Meet.m.cond.weather].name : '']);
    Meet.panelIntro();
  },
  panelIntro() {
    const M = Meet.m;
    MatchDay.panel(`<h2>${esc(M.title)}</h2><p>${Game.dateStr(Game.s.week)} (sobota) · ${esc(Game.club(M.venue).name.split(' ').slice(-1)[0])} · ${DATA.WEATHER[M.cond.weather] ? DATA.WEATHER[M.cond.weather].name.toLowerCase() : ''} · tor ${DATA.PREP[M.cond.prep].name.toLowerCase()}</p>
      <div class="box"><h3>Lista startowa</h3><div class="lineup">${M.riders.map((x, i) => `<div class="${x.me ? 'me' : ''}"><b class="nr">${i + 1}</b> ${esc(x.name)} <span class="attr">${esc(Meet.NATS[x.nat] || x.nat)}</span></div>`).join('')}</div></div>
      <p class="small muted">${M.team ? 'Liczą się punkty całej drużyny.' : 'Po 20 biegach: półfinały (miejsca 1–8) i finał.'} W swoich biegach jedziesz sam albo symulujesz.</p>
      <div class="actions"><button class="go" data-gp="next">Bieg 1 ▸</button></div>`);
  },
  cfgFor(ids) {
    const M = Meet.m, me = Career.me();
    const riders = ids.map((id, gate) => {
      const x = M.riders.find(r => r.id === id), a = x.me ? Game.eff(me) : x.a;
      return { id, name: x.name, team: x.me ? 'h' : 'a', helmet: Meet.HELM[gate], gate, a, no: M.riders.indexOf(x) + 1, kevlar: x.me ? Game.club(Game.s.user).kevlar : '#2b2d31', trim: x.me ? Game.club(Game.s.user).trim : '#c9a227', setup: MatchDay.recommendFor({ a }, M.cond).setup };
    });
    return { seed: Math.floor(Math.random() * 1e9), riders, cond: { ...M.cond } };
  },
  heatIds(n) { const M = Meet.m; if (M.stage === 'q') return Meet.GRID[n - 1].map(k => M.riders[k - 1].id); return M.stage === 'semi1' ? M.semi[0] : M.stage === 'semi2' ? M.semi[1] : M.final; },
  heatName() { const M = Meet.m; return M.stage === 'q' ? `Bieg ${M.n} z 20` : M.stage === 'semi1' ? 'Półfinał 1' : M.stage === 'semi2' ? 'Półfinał 2' : 'FINAŁ'; },
  /** Następny bieg: jeśli jedziesz — panel wyboru; inaczej symulacja i dalej */
  next() {
    const M = Meet.m, me = Career.me().id, done = [];
    for (;;) {
      if (M.stage === 'q') { if (M.n >= 20) { if (M.team) return Meet.finish(); Meet.toSemis(); continue; } M.n++; if (M.n > 1 && (M.n - 1) % 4 === 0) M.cond.rut = 0.08; }
      else if (M.stageDone) { if (M.stage === 'semi1') { M.stage = 'semi2'; M.stageDone = false; } else if (M.stage === 'semi2') { M.stage = 'final'; M.stageDone = false; M.final = M.semiTop.flat(); } else return Meet.finish(); }
      const ids = Meet.heatIds(M.n);
      if (ids.includes(me)) { M.cur = ids; return Meet.panelHeat(done); }
      const st = Meet.runSim(ids); done.push(`${Meet.heatName()}: ${Meet.winnerLine(st)}`); Meet.score(st, ids);
    }
  },
  runSim(ids) { let st = Sim.runToEnd(Sim.create(Meet.cfgFor(ids))); const out = []; while (st.stopped) { out.push(st.stopped.id); const rest = ids.filter(i => !out.includes(i)); if (rest.length < 2) break; st = Sim.runToEnd(Sim.create(Meet.cfgFor(rest))); st._ex = out.slice(); } st._ex = out; return st; },
  winnerLine(st) { const w = Sim.order(st).filter(x => x.status === 'done')[0]; return w ? `wygrywa ${w.name}` : 'bez zwycięzcy'; },
  score(st, ids) {
    const M = Meet.m, res = Sim.result(st), order = Sim.order(st);
    const place = {}; order.filter(x => x.status === 'done').forEach((x, i) => { place[x.id] = i; });
    ids.forEach(id => {
      const p = place[id] != null ? [3, 2, 1, 0][place[id]] : 0, ex = (st._ex || []).includes(id);
      if (M.stage === 'q') { M.pts[id] += p; M.heats[id].push(ex ? 'w' : res[id] && res[id].status === 'done' ? String(p) : 'u'); }
    });
    if (M.stage !== 'q') { const top = order.filter(x => x.status === 'done').map(x => x.id); ids.filter(i => !top.includes(i)).forEach(i => top.push(i)); M.res = M.res || {}; M.res[M.stage] = top; if (M.stage.startsWith('semi')) M.semiTop[M.stage === 'semi1' ? 0 : 1] = top.slice(0, 2); M.stageDone = true; }
    Meet.rivalCheck(order);
    Career.C().focus = null;
  },
  toSemis() {
    const M = Meet.m, rank = M.riders.slice().sort((a, b) => M.pts[b.id] - M.pts[a.id] || Math.random() - 0.5).map(x => x.id);
    M.rank = rank; M.semi = [[rank[0], rank[3], rank[4], rank[7]], [rank[1], rank[2], rank[5], rank[6]]]; M.semiTop = [[], []];
    M.stage = 'semi1'; M.stageDone = false;
  },
  panelHeat(done = []) {
    const M = Meet.m, me = Career.me(), ids = M.cur, Z = City.Z();
    World.setScreen([M.title, Meet.heatName(), `Jedzie: ${me.name}`]);
    const table = M.riders.slice().sort((a, b) => M.pts[b.id] - M.pts[a.id]).slice(0, 16);
    MatchDay.panel(`<h2>${esc(Meet.heatName())} · ${esc(M.title)}</h2>${done.length ? `<p class="small muted">${done.slice(-4).map(esc).join(' · ')}</p>` : ''}
      <div class="box"><h3>Pod taśmą</h3><div class="lineup">${ids.map((id, g) => { const x = M.riders.find(r => r.id === id); return `<div class="${x.me ? 'me' : ''}"><i class="helmet" style="background:${Meet.HELM[g]}"></i> ${esc(x.name)} <span class="attr">pole ${'ABCD'[g]} · ${M.pts[id]} pkt</span></div>`; }).join('')}</div></div>
      <div class="box"><h3>Twoja dyspozycja</h3><p class="small">Energia ${Math.round(Z.energy)} · Stres ${Math.round(Z.stress)}${Career.C().fear ? ` · strach ${Math.round(Career.C().fear)}` : ''} — ${City.modsHtml()}${Career.C().focus ? ` · <b class="good">skupienie ${Math.round(Career.C().focus.q * 100)}%</b>` : ''}</p></div>
      <div class="actions ride"><button class="go ride-btn" data-gp="ride">Na start ▸</button><button class="ghost" data-gp="routine">🧘 Rutyna przed startem</button><button class="ghost" data-gp="sim">Symuluj mój bieg</button></div>
      <div class="paper"><table><tbody>${table.map((x, i) => `<tr class="${x.me ? 'me' : ''}"><td>${i + 1}.</td><td>${esc(x.name)}</td><td class="pen">${M.heats[x.id].join(' ')}</td><td class="pen">${M.pts[x.id]}</td></tr>`).join('')}</tbody></table></div>`);
  },
  ride() {
    const M = Meet.m, me = Career.me(), cfg = Meet.cfgFor(M.cur);
    cfg.riders.find(x => x.id === me.id).human = true;
    RaceView.start(cfg, { human: me.id, myTeam: 'h', title: Meet.heatName(), scoreHtml: () => `<span class="team">${esc(M.title.slice(0, 28))}</span>`, onDone: st => Meet.afterRide(st) });
  },
  afterRide(st) {
    const M = Meet.m, me = Career.me();
    if (st.stopped) {
      const f = st.stopped.id; st._ex = [f];
      if (f === me.id) { Inj.fall(0.22); }
      const rest = M.cur.filter(i => i !== f);
      if (rest.length >= 2) { const st2 = Meet.runSim(rest); st2._ex = (st2._ex || []).concat(f); Meet.score(st2, M.cur); return Meet.after(st2, f === me.id ? 'Upadek — wykluczenie. Powtórka bez ciebie.' : 'Upadek rywala — powtórka biegu.'); }
    }
    Meet.score(st, M.cur); Meet.after(st);
  },
  simMine() { const M = Meet.m, st = Meet.runSim(M.cur); if ((st._ex || []).includes(Career.me().id)) Inj.fall(0.15); Meet.score(st, M.cur); Meet.after(st); },
  after(st, note = '') {
    const M = Meet.m, order = Sim.order(st).filter(x => x.status === 'done');
    MatchDay.panel(`<h2>${esc(Meet.heatName())}</h2>${note ? `<p class="neg">${esc(note)}</p>` : ''}<div class="paper"><table><tbody>${order.map((x, i) => `<tr class="${x.id === Career.me().id ? 'me' : ''}"><td>${i + 1}.</td><td>${esc(x.name)}</td><td class="pen">${[3, 2, 1, 0][i]}</td></tr>`).join('')}</tbody></table></div>
      <div class="actions"><button class="go" data-gp="next">Dalej ▸</button></div>`);
  },
  finish() {
    const M = Meet.m, C = Career.C(), me = Career.me(), s = Game.s;
    let place, lines = [], teamRes = null;
    if (M.team) {
      const tp = {}; M.riders.forEach(x => { tp[x.team] = (tp[x.team] || 0) + M.pts[x.id]; });
      teamRes = Object.entries(tp).sort((a, b) => b[1] - a[1]); place = teamRes.findIndex(([t]) => t === 'POL') + 1;
      lines.push(`Drużynowo: ${teamRes.map(([t, p], i) => `${i + 1}. ${Meet.NATS[t]} ${p}`).join(' · ')}`, `Twoje punkty: ${M.pts[me.id]} (${M.heats[me.id].join(', ')})`);
      const prize = [15000, 8000, 5000, 3000][place - 1]; Career.pay(prize, M.title); Career.repd([10, 6, 3, 1][place - 1]); Career.mor(place === 1 ? 10 : 3);
      if (place === 1) C.trophies.push(`${M.kind === 'natj' ? 'Złoto DMEJ' : 'Złoto Drużynowego Pucharu Narodów'} ${s.season}`);
      lines.push(`Premia: ${prize.toLocaleString('pl-PL')} zł`);
    } else {
      const res = M.res || {}, F = res.final || [], S1 = res.semi1 || [], S2 = res.semi2 || [];
      const order = F.slice(0, 4).concat([S1[2], S2[2]].filter(Boolean).sort((a, b) => M.pts[b] - M.pts[a]), [S1[3], S2[3]].filter(Boolean).sort((a, b) => M.pts[b] - M.pts[a]));
      M.rank.forEach(id => { if (!order.includes(id)) order.push(id); });
      place = order.indexOf(me.id) + 1;
      const prize = Math.round(Meet.PRIZE[place - 1] * (M.kind === 'gpq' ? 0.3 : 1));
      Career.pay(prize, M.title); Career.repd(Math.max(-2, Math.round((10 - place) / (M.kind === 'gpq' ? 3 : 1.6)))); Career.mor(place <= 3 ? 10 : place <= 8 ? 3 : -3);
      lines.push(`Miejsce: ${place}. · ${M.pts[me.id]} pkt w rundzie zasadniczej (${M.heats[me.id].join(', ')})`, `Podium: ${order.slice(0, 3).map(id => M.riders.find(r => r.id === id).name).join(' · ')}`, `Premia: ${prize.toLocaleString('pl-PL')} zł`);
      if (M.kind === 'gp' || M.kind === 'wild') {
        const gp = Meet.gpField(); order.forEach((id, i) => { gp.table[id] = (gp.table[id] || 0) + Meet.GP_PTS[i]; }); gp.rounds++;
        lines.push(`+${Meet.GP_PTS[place - 1]} pkt do klasyfikacji mistrzostw świata`);
        if (place === 1) C.trophies.push(`Zwycięstwo: ${M.title} ${s.season}`);
      }
      if (M.kind === 'gpq') { if (place <= 3) { C.gpNext = s.season + 1; lines.push('AWANS DO CYKLU GRAND PRIX w przyszłym sezonie!'); Game.news(`${me.name} awansuje do Grand Prix!`, 'good'); } else lines.push('Do awansu zabrakło miejsca w pierwszej trójce.'); }
    }
    (C.meetsDone = C.meetsDone || {})[M.d.key] = 'done';
    City.Z().energy -= 15; City.clamp(City.Z());
    Game.news(`${M.title}: ${me.name} — ${place}. miejsce.`, place <= 3 ? 'good' : 'info');
    Game.save();
    World.setScreen([M.title, place === 1 ? 'ZWYCIĘZCA: ' + me.name : `${me.name}: ${place}. miejsce`, '']);
    MatchDay.panel(`<h1>${place}. miejsce</h1><p>${esc(M.title)}</p><ul class="list">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul><div class="actions"><button class="go" data-gp="close">Wracam na mecz ligowy ▸</button></div>`);
  },
  close() { Meet.m = null; MatchDay.panel(''); World.setRiders([]); if (World.rain && World.rain.p) World.rain.p.visible = false; UI.show('mgr'); Career.render(); Career.toMatch(); },

  /** Szybki występ bez grafiki (liga zagraniczna): punkty z n biegów */
  quick(level, n) {
    const me = Career.me(); let pts = 0;
    for (let h = 0; h < n; h++) {
      const riders = [{ id: me.id, name: me.name, team: 'h', helmet: Meet.HELM[0], gate: h % 4, a: Game.eff(me), no: 1, kevlar: '#333', trim: '#fff' }];
      for (let k = 0; k < 3; k++) { const g = Meet.guest(level + (Math.random() - 0.5) * 2, 'GBR'); riders.push({ id: g.id, name: g.name, team: 'a', helmet: Meet.HELM[k + 1], gate: (h + k + 1) % 4, a: g.a, no: k + 2, kevlar: '#333', trim: '#fff' }); }
      const cond = { weather: 'dry', wet: 0, wind: 2, temp: 15, prep: 'hard', rut: 0.1 };
      riders.forEach(x => { x.setup = MatchDay.recommendFor({ a: x.a }, cond).setup; });
      const st = Sim.runToEnd(Sim.create({ seed: Math.floor(Math.random() * 1e9), riders, cond }));
      const o = Sim.order(st).filter(x => x.status === 'done'), i = o.findIndex(x => x.id === me.id); if (i >= 0) pts += [3, 2, 1, 0][i];
      if (st.stopped && st.stopped.id === me.id) Inj.fall(0.12);
    }
    return pts;
  },
  rivalCheck(order) { /* rywale jeżdżą tylko w lidze — patrz Rival */ },
};
(() => {
  // przed meczem ligowym: turniej w sobotę
  const bt = Career.toMatch;
  Career.toMatch = function () {
    const d = Meet.due();
    if (d && !Meet.m && Meet.invite(d)) return;
    return bt.call(this);
  };
  // kliknięcia w panelu dnia meczowego (data-gp)
  const bpc = Practice.click;
  Practice.click = function (e) {
    const t = e.target.closest('[data-gp]');
    if (t && Meet.m) {
      const v = t.dataset.gp;
      if (v === 'next') Meet.next(); if (v === 'ride') { try { Meet.ride(); } catch (err) { console.error(err); Meet.simMine(); } }
      if (v === 'sim') Meet.simMine(); if (v === 'close') Meet.close(); if (v === 'routine') Routine.open(() => Meet.panelHeat());
      return true;
    }
    return bpc.call(this, e);
  };
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cMeetGo') { UI.close(); const x = Meet._due; Meet._due = null; if (x) Meet.start(x); return true; }
    if (d.ui === 'cMeetSkip') { UI.close(); const x = Meet._due; Meet._due = null; if (x) { (Career.C().meetsDone = Career.C().meetsDone || {})[x.key] = 'skip'; Career.repd(-3); Game.save(); } Career.toMatch(); return true; }
    return bc.call(this, d);
  };
  // koniec sezonu: klasyfikacja GP i medale
  const bse = Career.seasonEnd;
  Career.seasonEnd = function () {
    const r = bse.call(this), C = Career.C(), s = Game.s, gp = C.gp, me = Career.me();
    if (gp && gp.season === s.season && gp.rounds) {
      const tab = Object.entries(gp.table).sort((a, b) => b[1] - a[1]), pos = tab.findIndex(([id]) => id === me.id) + 1;
      if (pos >= 1 && pos <= 3) C.trophies.push(`${['Złoty', 'Srebrny', 'Brązowy'][pos - 1]} medal Indywidualnych Mistrzostw Świata ${s.season}`);
      if (pos >= 1) Game.news(`Klasyfikacja Grand Prix ${s.season}: ${me.name} na ${pos}. miejscu (${gp.table[me.id] || 0} pkt).`, pos <= 3 ? 'good' : 'info');
      if (pos >= 1 && pos <= 8) C.gpNext = s.season + 1; // czołowa ósemka zostaje w cyklu
    }
    return r;
  };
})();

/* =========================================================
   RUTYNA PRZED STARTEM (mini-gra z oddechem)
   ========================================================= */
const Routine = {
  open(back) {
    Routine.back = back; Routine.t0 = performance.now(); Routine.hits = [];
    const coach = (Career.C().gear || {}).coach ? 1 : 0;
    UI.modal(`<div class="kicker">Rutyna przed startem${coach ? ' · z trenerem mentalnym' : ''}</div><h2>Oddychaj z kołem</h2>
      <p class="small muted">Kliknij „Teraz”, gdy koło dotknie złotego pierścienia (pełny wdech). Trzy razy. Im dokładniej, tym spokojniej pod taśmą.</p>
      <div class="breath"><i class="ring"></i><i class="ball"></i><b id="br-n">0 / 3</b></div>
      <div class="actions"><button class="go" data-ui="cBreath">Teraz</button></div>`);
  },
  scale() { const p = ((performance.now() - Routine.t0) % 4000) / 4000; return 0.45 + 0.55 * (1 - Math.cos(2 * Math.PI * p)) / 2; },
  hit() {
    Routine.hits.push(Math.max(0, 1 - Math.abs(Routine.scale() - 1) * 3.2));
    const el = document.getElementById('br-n'); if (el) el.textContent = `${Routine.hits.length} / 3`;
    if (Routine.hits.length < 3) return;
    const C = Career.C(), coach = (C.gear || {}).coach ? 0.15 : 0;
    const q = Math.min(1, Routine.hits.reduce((a, b) => a + b, 0) / 3 + coach);
    C.focus = { q }; City.Z().stress -= Math.round(q * 8); City.clamp(City.Z());
    UI.modal(`<h2>Skupienie ${Math.round(q * 100)}%</h2><p>${q > 0.75 ? 'Tętno spada, ręce przestają drżeć. Widzisz tylko taśmę i pierwszy łuk.' : q > 0.45 ? 'Trochę lepiej. Głowa czystsza.' : 'Nie udało się złapać rytmu. Myśli dalej skaczą.'}</p><div class="actions"><button class="go" data-ui="cBreathOk">Pod taśmę ▸</button></div>`);
  },
};
(() => {
  const bc = Career.click;
  Career.click = function (d) {
    if (d.ui === 'cBreath') { Routine.hit(); return true; }
    if (d.ui === 'cBreathOk') { UI.close(); if (Routine.back) Routine.back(); return true; }
    return bc.call(this, d);
  };
  // w meczu ligowym: przycisk w boksie
  const bb = MatchDay.careerBox;
  MatchDay.careerBox = function (skipped) {
    bb.call(this, skipped);
    const act = document.querySelector('#md-panel .actions.ride');
    if (act && !act.querySelector('[data-md="routine"]')) act.insertAdjacentHTML('beforeend', `<button class="ghost" data-md="routine">🧘 Rutyna przed startem${Career.C().focus ? ` (${Math.round(Career.C().focus.q * 100)}%)` : ''}</button>`);
  };
  const bmc = MatchDay.click;
  MatchDay.click = function (e) { const t = e.target.closest('[data-md="routine"]'); if (t) { Routine.open(() => MatchDay.careerBox()); return; } return bmc.call(this, e); };
  // efekt: lepszy start i psychika w tym biegu, spokojniejsze ręce
  const bm = Career.effMods;
  Career.effMods = function (r, out) {
    bm.call(this, r, out);
    const C = Game.s.career; if (!C || r.id !== C.me) return;
    if (C.focus) { out.start = R.clamp(out.start + C.focus.q * 0.6, 1, 20); out.mental = R.clamp(out.mental + C.focus.q * 0.5, 1, 20); }
    if (C.fear) { out.mental = R.clamp(out.mental - C.fear / 30, 1, 20); out.start = R.clamp(out.start - C.fear / 60, 1, 20); out.bends = R.clamp(out.bends - C.fear / 90, 1, 20); }
    if (C.trackRead === Game.s.week) { out.start = R.clamp(out.start + 0.25, 1, 20); out.bends = R.clamp(out.bends + 0.15, 1, 20); if (Game.s.forecast && Game.s.forecast.wet > 0.3) out.wet = R.clamp(out.wet + 0.5, 1, 20); }
  };
  const bi = RaceView.input;
  RaceView.input = function () {
    const s = Game.s, C = s && s.career, S = RaceView.st;
    const mine = C && s.mode === 'career' && RaceView.opts && RaceView.opts.human === C.me;
    if (mine && C.focus && C.focus.q > 0.6 && S && S.t < 2) RaceView._nerves = true; // spokój pod taśmą
    const inp = bi.call(this);
    if (!mine) return inp;
    if (C.focus) { inp.hold = (inp.hold || 1) * (1 + C.focus.q * 0.3); const st = C.city ? C.city.stress : 0, t = performance.now() / 1000; if (st > 55) inp.steer -= Math.sin(t * 9.1) * Math.sin(t * 3.3) * (st - 55) / 90 * C.focus.q; }
    if (C.fear) inp.hold = (inp.hold || 1) * (1 - Math.min(0.3, C.fear / 250));
    const rv = Rival.inHeat(S); if (rv) { const psy = City.psyche().v; if (psy >= 55) inp.pow = (inp.pow || 1) * 1.02; else inp.hold = (inp.hold || 1) * 0.92; }
    return inp;
  };
})();

/* =========================================================
   KONTUZJE: diagnoza, leczenie, rehabilitacja, strach
   ========================================================= */
const Inj = {
  DIAG: [[1, 'Stłuczenie barku', 'Siniak jak talerz, ale kości całe.'], [2, 'Skręcenie stawu skokowego', 'Kostka puchnie, lekarz zakłada stabilizator.'], [3, 'Wstrząśnienie mózgu', 'Mroczki przed oczami. Obowiązkowa przerwa i badania.'],
    [5, 'Złamany obojczyk', 'Klasyka żużla. Operacja i płytka tytanowa.'], [99, 'Złamanie podudzia', 'Najgorszy scenariusz: gips, kule i długa rehabilitacja.']],
  /** Upadek: szansa na kontuzję (kask zmniejsza), strach rośnie */
  fall(p) {
    const C = Career.C(), r = Career.me(); C.fear = Math.min(60, (C.fear || 0) + 8);
    const helm = (C.gear || {}).helmet || 0; if (Math.random() < p * (C.fragile > 0 ? 2 : 1) * (1 - helm * 0.15)) { r.injury = Math.max(r.injury, R.int(1, 6)); Inj.check(); }
  },
  check() {
    const C = Career.C(), r = Career.me();
    if (r.injury > (C.injKnown || 0)) { C.injKnown = r.injury; Inj.show(r.injury); }
    else C.injKnown = r.injury;
  },
  show(w) {
    const C = Career.C(), d = Inj.DIAG.find(x => w <= x[0]);
    C.fear = Math.min(60, (C.fear || 0) + 10 + w * 3); C.rehab = { w0: w, prog: 0 };
    Game.news(`Kontuzja: ${Career.me().name} — ${d[1].toLowerCase()} (${w} tyg.).`, 'bad'); Game.save();
    const show = () => UI.modal(`<div class="kicker">Szpital · diagnoza</div><div class="dilemma scandal"><div class="dl-ico">🩻</div><div><h2>${d[1]}</h2><p>${d[2]} Przerwa: <b>${w} tyg.</b></p>
      <p class="small muted">Rehabilitacja (siłownia → fizjoterapeuta, basen) skraca przerwę. Po upadku zostaje strach — psycholog pomaga.</p></div></div>
      <div class="talk-opts"><button class="opt" data-ui="cInj" data-v="std">Leczenie w szpitalu (NFZ)</button>${w > 1 ? `<button class="opt" data-ui="cInj" data-v="clinic" ${C.money < 8000 ? 'disabled' : ''}>Prywatna klinika sportowa — 8000 zł, tydzień krócej</button><button class="opt warn" data-ui="cInj" data-v="push">Zastrzyki i jazda „na siłę” — przerwa o połowę krótsza, ryzyko odnowienia</button>` : ''}</div>`);
    if (document.getElementById('md') && !document.getElementById('md').hidden) Inj._pending = show; else show();
  },
  choose(v) {
    const C = Career.C(), r = Career.me(); UI.close();
    if (v === 'clinic' && C.money >= 8000) { Career.pay(-8000, 'Prywatna klinika'); r.injury = Math.max(1, r.injury - 1); UI.toast('Najlepsi ortopedzi w regionie. Przerwa krótsza o tydzień.'); }
    if (v === 'push') { r.injury = Math.max(1, Math.ceil(r.injury / 2)); C.fragile = 4; C.fear = Math.min(60, (C.fear || 0) + 8); UI.toast('Zastrzyki i zaciśnięte zęby. Przez 4 tygodnie każdy upadek grozi odnowieniem urazu.', true); }
    if (v === 'std') UI.toast('Kolejka do ortopedy, ale leczenie porządne.');
    C.injKnown = r.injury; Game.save(); Career.render();
  },
};
City.ACTS.silownia.push({ id: 'rehab', n: 'Rehabilitacja z fizjoterapeutą', d: 'tylko przy kontuzji: 2 sesje w tygodniu = tydzień krócej', money: 350 }, { id: 'pool', n: 'Basen i hydroterapia', d: 'rehabilitacja ½ sesji, stres −6', money: 60 });
City.ACTS.psycholog.push({ id: 'fear', n: 'Praca ze strachem po upadku', d: 'strach −18 (lepszy start i łuki)', money: 900 });
City.ACTS.tor.push({ id: 'inspect', n: 'Obejrzyj tor i dobierz przełożenia', d: 'na mecz: start +0,25, łuki +0,15 (i lepiej na mokrym)' });
City.ACTS.park.push({ id: 'trip', n: 'Wyjazd we dwoje (góry / morze)', d: 'cały dzień: związek +18, stres −25, energia +10', money: 1800, gf: true });
(() => {
  const ba = City.act;
  City.act = function (place, id) {
    const C = Career.C(), Z = City.Z(), r = Career.me(), A = (City.ACTS[place] || []).find(a => a.id === id);
    if (!['rehab', 'pool', 'fear', 'inspect', 'trip'].includes(id)) return ba.call(this, place, id);
    if (C.jail > 0) { UI.toast('Siedzisz w areszcie.', true); return; }
    if (City.weekDone()) { UI.toast('Tydzień dobiegł końca — kliknij „Zakończ tydzień”.', true); return; }
    if ((id === 'rehab') && !r.injury) { UI.toast('Nie masz kontuzji — fizjoterapeuta każe iść na trening.', true); return; }
    if (id === 'trip' && (!Z.gf || Z.gf.rel < 40)) { UI.toast(Z.gf ? 'Za wcześnie na wspólny wyjazd (związek 40%+).' : 'Najpierw kogoś poznaj.', true); return; }
    if (A.money && C.money < A.money) { UI.toast('Za mało pieniędzy.', true); return; }
    if (!City.gate(id)) return;
    if (A.money) Career.pay(-A.money, A.n);
    Z.loc = place; let msg = '';
    if (id === 'rehab') { C.rehab = C.rehab || { prog: 0 }; C.rehab.prog += 1; Z.energy -= 8; Z.stress -= 3; msg = `Ćwiczenia z gumami i elektrostymulacja. Postęp rehabilitacji ${C.rehab.prog}/2.`; }
    if (id === 'pool') { if (r.injury) { C.rehab = C.rehab || { prog: 0 }; C.rehab.prog += 0.5; } Z.stress -= 6; Z.energy -= 4; msg = r.injury ? `Woda odciąża stawy. Postęp rehabilitacji ${C.rehab.prog}/2.` : 'Kilka długości i jacuzzi. Stres −6.'; }
    if (id === 'fear') { C.fear = Math.max(0, (C.fear || 0) - 18); Z.stress -= 8; msg = `Wizualizacja startu i pierwszego łuku. Strach ${Math.round(C.fear)}.`; }
    if (id === 'inspect') { C.trackRead = Game.s.week; Z.energy -= 4; const f = Game.s.forecast; msg = `Z mechanikiem i gospodarzem toru: nawierzchnia ${f && f.wet > 0.3 ? 'nasiąknięta — długie przełożenie' : 'twarda — krótka zębatka na start'}. Wiesz, gdzie są koleiny.`; }
    if (id === 'trip') {
      const G = Z.gf; G.rel = Math.min(100, G.rel + 18); G.lastDate = Game.s.week; Z.stress -= 25; Z.energy += 10; Career.mor(6);
      msg = `${Crowd.pick(['Zakopane: szlak nad Morskie Oko i oscypki.', 'Sopot: molo o zachodzie słońca.', 'Mazury: łódka i ognisko.', 'Karkonosze: schronisko i gorąca czekolada.'])} ${G.name} nie przestaje się uśmiechać. Związek +18.`;
      City.clamp(Z); Z.log.push(`${City.DAYS[Math.min(5, Z.day)].slice(0, 3)}: Wyjazd we dwoje — ${msg}`); UI.toast(msg); City.endDay(true); Game.save(); Career.render(); return;
    }
    City.pay(Z, A, msg);
  };
  // tydzień: rehabilitacja skraca przerwę, strach powoli mija, trener mentalny
  const ba2 = Career.advance;
  Career.advance = function () {
    const C = Career.C(), Z = City.Z();
    if ((C.gear || {}).coach) { Career.pay(-1200, 'Trener mentalny'); Z.stress -= 10; C.fear = Math.max(0, (C.fear || 0) - 6); City.clamp(Z); }
    return ba2.call(this);
  };
  const bf = Career.finishWeek;
  Career.finishWeek = function (um) {
    const C = Career.C(), r = Career.me(), before = r.injury;
    const fell = um && um.stats && Object.values(um.stats).length && (um.stats[C.me] || { line: [] }).line.some(x => x === 'w' || x === 'u');
    const res = bf.call(this, um);
    if (r.injury > before) { Inj.check(); } else C.injKnown = r.injury;
    if (C.rehab && r.injury > 0 && C.rehab.prog >= 2) { r.injury = Math.max(0, r.injury - 1); C.rehab.prog = 0; if (C.report) C.report.lines.push('Rehabilitacja: przerwa krótsza o tydzień.'); }
    if (r.injury === 0 && C.rehab) { C.rehab = null; Game.news('Lekarz zezwala na powrót na tor!', 'good'); }
    if (C.fragile > 0) C.fragile--;
    C.fear = Math.max(0, (C.fear || 0) - (um && !fell ? 6 : 0) - 4);
    Game.save();
    return res;
  };
  // upadki w meczu ligowym i na treningu
  const bah = MatchDay.afterHeat;
  MatchDay.afterHeat = function (st, watched) {
    const C = Game.s.career; if (C && MatchDay.career && st && st.stopped && st.stopped.id === C.me) C.fear = Math.min(60, (C.fear || 0) + 8);
    return bah.call(this, st, watched);
  };
  const bap = City.afterPractice;
  City.afterPractice = function (st) { const r = Career.me(), b = r.injury; const m = bap.call(this, st); const me = st.riders.find(x => x.human); if (me && me.status === 'fell') Career.C().fear = Math.min(60, (Career.C().fear || 0) + 5); if (r.injury > b) Inj.check(); return m; };
  const bc = Career.click;
  Career.click = function (d) { if (d.ui === 'cInj') { Inj.choose(d.v); return true; } return bc.call(this, d); };
  // diagnoza po powrocie z dnia meczowego
  const bshow = UI.show;
  UI.show = function (id) { const r = bshow.apply(this, arguments); if (id === 'mgr' && Inj._pending) { const f = Inj._pending; Inj._pending = null; setTimeout(f, 60); } return r; };
})();

/* =========================================================
   RYWALE
   ========================================================= */
const Rival = {
  list() {
    const s = Game.s, C = Career.C(), me = Career.me();
    C.rivals = (C.rivals || []).filter(x => s.riders[x.id] && s.riders[x.id].club && s.riders[x.id].club !== s.user);
    if (C.rivals.length < 2) {
      const cand = Object.values(s.riders).filter(r => r.club && r.club !== s.user && r.id !== me.id && !C.rivals.some(x => x.id === r.id))
        .sort((a, b) => Math.abs(Game.ovr(a) - Game.ovr(me)) + Math.abs(a.age - me.age) * 0.3 - Math.abs(Game.ovr(b) - Game.ovr(me)) - Math.abs(b.age - me.age) * 0.3);
      cand.slice(0, 2 - C.rivals.length).forEach(r => C.rivals.push({ id: r.id, heat: 25, w: 0, l: 0 }));
    }
    return C.rivals;
  },
  inHeat(st) { if (!st || !Game.s || Game.s.mode !== 'career') return null; const ids = new Set(st.riders.map(x => x.id)); return (Career.C().rivals || []).find(x => ids.has(x.id)) || null; },
  /** Po biegu: kto był wyżej */
  heat(st) {
    const C = Game.s.career; if (!C || !st) return;
    const o = Sim.order(st), mi = o.findIndex(x => x.id === C.me); if (mi < 0) return;
    Rival.list().forEach(rv => {
      const ri = o.findIndex(x => x.id === rv.id); if (ri < 0) return;
      const meDone = o[mi].status === 'done', rvDone = o[ri].status === 'done', win = meDone && (!rvDone || mi < ri);
      if (win) { rv.w++; Career.mor(2); if (C.city) C.city.stress -= 3; } else { rv.l++; if (C.city) C.city.stress += 3; }
      rv.heat = Math.min(100, rv.heat + 8);
      MatchDay.note(`Pojedynek z rywalem: ${win ? 'wygrany' : 'przegrany'} (${Game.s.riders[rv.id].name}) — bilans ${rv.w}:${rv.l}`);
    });
  },
};
(() => {
  const bs = MatchDay.scoreHeat;
  MatchDay.scoreHeat = function (st, watched) {
    if (MatchDay.career && st) { Rival.heat(st); Weather.midMatch(); }
    if (Game.s.career) Game.s.career.focus = null;
    return bs.call(this, st, watched);
  };
  const bss = MatchDay.scoreHeatSilent;
  MatchDay.scoreHeatSilent = function (st) { if (MatchDay.career && st) { Rival.heat(st); Weather.midMatch(); } return bss.call(this, st); };
  // zaczepka rywala w mediach (zdarzenie tygodnia)
  Career.EV.rivalTaunt = {
    get t() { const rv = (Career.C().rivals || [])[0]; return `Rywal: ${rv && Game.s.riders[rv.id] ? Game.s.riders[rv.id].name : 'zawodnik rywali'}`; },
    get x() { const rv = (Career.C().rivals || [])[0], R0 = rv && Game.s.riders[rv.id]; return R0 ? `${R0.name} (${Game.club(R0.club).short}) w wywiadzie: „${Crowd.pick(['Ten junior jeździ jak na rowerku. Pod taśmą mu się ręce trzęsą.', 'Bilans? Nie liczę pojedynków z przeciętniakami.', 'Niech najpierw wygra coś poważnego, potem pogadamy.'])}”. Bilans waszych pojedynków: ${rv.w}:${rv.l}.` : ''; },
    when: () => Rival.list().length > 0,
    o: [['Odpowiedz z klasą', () => { Career.repd(2); const rv = Career.C().rivals[0]; rv.heat = Math.max(0, rv.heat - 5); return 'Kibice docenili spokój. Reputacja +2.'; }],
      ['Odpal się: „Zobaczymy się w pierwszym łuku!”', () => { Career.repd(-2); Career.mor(4); Career.C().rivals[0].heat += 12; return 'Media mają temat na cały tydzień. Motywacja rośnie (nastrój +4), reputacja −2.'; }],
      ['Zignoruj', () => { if (Career.C().city) Career.C().city.stress += 3; return 'Nie dajesz się wciągnąć — ale słowa siedzą w głowie (stres +3).'; }]],
  };
})();

/* =========================================================
   POGODA
   ========================================================= */
const Weather = {
  ICON: { dry: '☀️', damp: '🌥️', rain: '🌧️' },
  midMatch() {
    const M = MatchDay.m; if (!M || M.rainStarted || M.n < 4 || M.n > 11) return;
    const w = M.cond.weather, p = w === 'damp' ? 0.12 : w === 'dry' ? 0.025 : 0; if (Math.random() >= p) return;
    M.rainStarted = true; M.cond.weather = 'rain'; M.cond.wet = 0.85;
    if (World.rain && World.rain.p) World.rain.p.visible = true;
    MatchDay.note('Zaczyna padać! Tor robi się śliski — długie przełożenie i łagodna mapa.');
  },
};
(() => {
  // prognoza na niedzielę w panelu miasta; w piątek może się zmienić
  const bv = City.view;
  City.view = function () {
    let html = bv.call(this); const f = Game.s.forecast, C = Career.C(), r = Career.me();
    if (f) html = html.replace('<p class="small">Wpływ na jazdę:', `<p class="small fc-line">${Weather.ICON[f.weather] || ''} Prognoza na niedzielę: <b>${DATA.WEATHER[f.weather].name.toLowerCase()}</b>, ${f.temp}°C, wiatr ${f.wind} m/s${C.trackRead === Game.s.week ? ' · <span class="good">tor obejrzany</span>' : ''}</p>${r.injury ? `<p class="small neg">🩼 Kontuzja: jeszcze ${r.injury} tyg.${C.rehab ? ` · rehabilitacja ${C.rehab.prog}/2` : ''}</p>` : ''}${C.fear > 5 ? `<p class="small neg">Strach po upadku: ${Math.round(C.fear)} (psycholog pomaga)</p>` : ''}${C.jail > 0 ? `<p class="small neg">🚔 Areszt: ${C.jail} tyg.</p>` : ''}<p class="small">Wpływ na jazdę:`);
    return html;
  };
  const be = City.endDay;
  City.endDay = function (auto) {
    const Z = City.Z(), d0 = Z.day; be.call(this, auto);
    if (Z.day === 4 && d0 === 3 && Math.random() < 0.25) { const old = Game.s.forecast.weather; Game.forecast(); if (Game.s.forecast.weather !== old) City.sms('Synoptyk (aplikacja)', `Zmiana prognozy na niedzielę: ${DATA.WEATHER[Game.s.forecast.weather].name.toLowerCase()}, ${Game.s.forecast.temp}°C.`); }
  };
})();

/* =========================================================
   LIGA ZAGRANICZNA
   ========================================================= */
const Abroad = {
  CLUBS: { eng: [['Ashcombe Comets', 12.2], ['Redmere Lions', 12.8], ['Westgate Hammers', 13.2], ['Coldbrook Foxes', 11.8]], swe: [['Sjöfors Falkarna', 13.6], ['Björkå Lodjuren', 14.0], ['Nordvik Vargungar', 13.2]] },
  offers() {
    const C = Career.C(), s = Game.s, r = Career.me();
    if (C.abroadSeason === s.season) return C.abroadOffers || [];
    C.abroadSeason = s.season; const ov = Game.ovr(r), out = [];
    const mk = (lg, [n, lvl]) => ({ lg, club: n, lvl, perPoint: Math.round((lg === 'eng' ? 500 : 800) * (0.8 + ov / 25) / 50) * 50, sign: Math.round((lg === 'eng' ? 6000 : 12000) * (0.7 + ov / 20) / 500) * 500 });
    if (r.age >= 17) out.push(...Abroad.CLUBS.eng.filter(c => c[1] <= ov + 2.5).slice(0, 2).map(c => mk('eng', c)));
    if (ov >= 12 || r.ksm >= 4.5 || C.rep >= 40) out.push(...Abroad.CLUBS.swe.filter(c => c[1] <= ov + 2).slice(0, 2).map(c => mk('swe', c)));
    return (C.abroadOffers = out);
  },
  sign(i) { const C = Career.C(), o = Abroad.offers()[i]; if (!o || C.abroad) return; C.abroad = { ...o, pts: 0, m: 0 }; Career.pay(o.sign, `Kontrakt: ${o.club}`); C.abroadOffers = []; Game.news(`${Career.me().name} podpisuje kontrakt z ${o.club} (${o.lg === 'eng' ? 'Anglia' : 'Szwecja'})!`, 'good'); Game.save(); Career.render(); },
  quit() { const C = Career.C(); if (!C.abroad) return; Game.news(`Koniec startów w ${C.abroad.club}.`, 'info'); C.abroad = null; Game.save(); Career.render(); },
  /** Co tydzień: mecz za granicą (w tygodniu), punkty, pieniądze, zmęczenie */
  week() {
    const C = Career.C(), s = Game.s, r = Career.me(), A = C.abroad; if (!A || s.week > 17) return null;
    if (r.injury || C.suspended || C.jail) return `${A.club}: nie jedziesz (${r.injury ? 'kontuzja' : 'zawieszenie'}).`;
    const pts = Meet.quick(A.lvl, 5), pay = pts * A.perPoint; A.pts += pts; A.m++;
    Career.pay(pay, `${A.club}: ${pts} pkt`); const Z = City.Z(), van = (C.gear || {}).van;
    Z.energy -= van ? 8 : 15; Z.stress += 3; City.clamp(Z);
    return `${A.lg === 'eng' ? '🇬🇧' : '🇸🇪'} ${A.club}: ${pts} pkt w środę — ${pay.toLocaleString('pl-PL')} zł (podróż${van ? ' busem' : ''}: energia −${van ? 8 : 15})`;
  },
};
(() => {
  const ba = Career.advance;
  Career.advance = function () {
    const C = Career.C(); const line = Abroad.week();
    const res = ba.call(this);
    if (line && C.report) C.report.lines.push(line);
    return res;
  };
  const bns = Career.newSeason;
  Career.newSeason = function () { const C = Career.C(); if (C.abroad) { Game.news(`Sezon za granicą zakończony: ${C.abroad.club}, ${C.abroad.pts} pkt w ${C.abroad.m} meczach.`, 'info'); C.abroad = null; } return bns.call(this); };
})();

/* =========================================================
   TRANSFERY I WYPOŻYCZENIA W TRAKCIE SEZONU
   ========================================================= */
const Move = {
  to(clubId) {
    const s = Game.s, r = Career.me(), from = s.user;
    const full = Game.roster(clubId).filter(x => x.id !== r.id);
    if (full.length >= DATA.ROSTER_MAX) { const w = full.sort((a, b) => Game.ovr(a) - Game.ovr(b))[0]; w.club = from; } // wymiana: najsłabszy przechodzi na twoje miejsce
    r.club = clubId; s.user = clubId;
    Game.autoLineup(clubId); Game.autoLineup(from);
  },
  weekly() {
    const s = Game.s, C = Career.C(), r = Career.me(), S = r.season, fx = Game.userFixture();
    if (fx && !Career.inLineup() && !r.injury && !C.suspended && !C.jail) C.benchWeeks = (C.benchWeeks || 0) + 1; else if (fx) C.benchWeeks = 0;
    // wypożyczenie: koniec
    if (C.loan) { C.loan.weeks--; if (C.loan.weeks <= 0) { const from = C.loan.from; C.loan = null; Move.to(from); Game.news(`Koniec wypożyczenia — ${r.name} wraca do ${Game.club(from).name}.`, 'info'); } return; }
    if (s.week < 2 || s.week > 11 || C.jail) return;
    const avg = S.heats ? (S.pts + S.bonus) / S.heats : 0, myBase = Game.club(s.user).base;
    // oferta transferowa
    if (!(C.midOffers || []).length && Math.random() < 0.05 + Math.max(0, avg - 1.2) * 0.12 + C.rep / 600) {
      const pool = s.clubs.filter(c => c.id !== s.user && (avg > 1.6 ? c.base >= myBase - 0.5 : true)).sort(() => Math.random() - 0.5), c = pool[0];
      if (c) { const k = 1 + Math.max(0, avg - 1) * 0.35 + Math.random() * 0.25, left = Math.max(0.35, (18 - s.week) / 18);
        C.midOffers = [{ club: c.id, sign: Math.round(r.contract.sign * k * left / 500) * 500, perPoint: Math.round(r.contract.perPoint * (k + 0.1) / 50) * 50, buyout: Math.round(r.contract.sign * 0.6 / 1000) * 1000, week: s.week }];
        City.sms(`Prezes ${c.short}`, `Chcemy cię u nas od zaraz. Szczegóły w zakładce Kariera — okno transferowe do rundy 12.`); }
    }
    C.midOffers = (C.midOffers || []).filter(o => s.week - o.week < 3);
    // wypożyczenie dla rezerwowego
    if (!C.loanOffer && C.benchWeeks >= 2 && s.week <= 12) {
      const c = s.clubs.filter(x => x.id !== s.user).sort((a, b) => a.base - b.base)[R.int(0, 1)];
      if (c) { C.loanOffer = { club: c.id, weeks: 4, week: s.week }; City.sms(`Trener ${c.short}`, 'U nas jeździłbyś w każdym meczu. Wypożyczenie na 4 tygodnie? (Kariera)'); }
    }
    if (C.loanOffer && s.week - C.loanOffer.week > 2) C.loanOffer = null;
  },
  acceptMid(i) {
    const s = Game.s, C = Career.C(), r = Career.me(), o = (C.midOffers || [])[i]; if (!o) return;
    const old = Game.club(s.user);
    Move.to(o.club); r.contract = { years: 2, sign: o.sign, perPoint: o.perPoint }; Career.pay(o.sign, `Transfer — kwota za podpis (${Game.club(o.club).short})`);
    Career.repd(-3); Career.mor(5); C.midOffers = []; C.rivals = [];
    Game.news(`Transfer w trakcie sezonu: ${r.name} przechodzi z ${old.name} do ${Game.club(o.club).name} (odstępne ${o.buyout.toLocaleString('pl-PL')} zł).`, 'good');
    City.sms('Kibic z twojego starego sektora', 'Zdrajca. Tyle ci daliśmy…');
    Game.save(); Career.render();
  },
  acceptLoan() {
    const s = Game.s, C = Career.C(), o = C.loanOffer; if (!o) return;
    C.loan = { from: s.user, weeks: o.weeks }; C.loanOffer = null; C.benchWeeks = 0;
    Move.to(o.club); Game.news(`${Career.me().name} wypożyczony do ${Game.club(o.club).name} na ${o.weeks} tyg.`, 'info'); Game.save(); Career.render();
  },
};
(() => {
  const bf = Career.finishWeek;
  Career.finishWeek = function (um) { const res = bf.call(this, um); try { Move.weekly(); } catch (e) { console.warn(e); } Game.save(); return res; };
})();

/* =========================================================
   ZWIĄZEK: zazdrość, oświadczyny, ślub
   ========================================================= */
Career.EV.jealous = {
  t: 'Zazdrość', when: () => City.Z().gf && Career.C().deals.length > 0 && City.Z().gf.rel < 92,
  get x() { const G = City.Z().gf; return G ? `${G.name} zobaczyła zdjęcie z sesji sponsora — obejmujesz hostessę w firmowej koszulce. „Dużo tych sesji ostatnio, co?”` : ''; },
  o: [['Pokaż jej całą sesję i zaproś na następną', () => { const G = City.Z().gf; G.rel += 6; return 'Na następnej sesji to ona trzymała parasol. Związek +6.'; }],
    ['„Przesadzasz, to praca”', () => { const G = City.Z().gf; G.rel -= 8; City.Z().stress += 5; return 'Cicha kolacja i trzaśnięcie drzwiami. Związek −8.'; }],
    ['Kup kwiaty i przeproś', () => { Career.pay(-150, 'Kwiaty'); City.Z().gf.rel += 3; return 'Róże zadziałały… częściowo. Związek +3.'; }]],
};
Career.EV.parents = {
  t: 'Poznaj moich rodziców', when: () => City.Z().gf && City.Z().gf.rel >= 60 && !City.Z().gf.parents,
  get x() { return `${City.Z().gf.name}: „Mama zaprasza na niedzielny obiad… przed twoim meczem. Przyjdziesz?”`; },
  o: [['Pójdę — rosół, schabowy i pytania o przyszłość', () => { const Z = City.Z(); Z.gf.parents = true; Z.gf.rel += 10; Z.energy -= 5; return 'Tata okazał się fanem żużla od 30 lat. Związek +10.'; }],
    ['Nie dam rady przed meczem', () => { const Z = City.Z(); Z.gf.parents = true; Z.gf.rel -= 6; return '„Mama będzie zawiedziona.” Związek −6.'; }]],
};
Object.assign(City, {
  RINGS: [[4000, 'Skromny, srebrny', 0], [9000, 'Klasyczny, złoty', 0.1], [18000, 'Z brylantem', 0.18]],
  SCENES: [['park', 'Park o zachodzie słońca', 0.08], ['track', 'Na torze, po meczu, przy kibicach', 0.12], ['home', 'Kolacja przy świecach w domu', 0.05]],
  proposeModal() {
    const Z = City.Z(), G = Z.gf, C = Career.C(); if (!G) return;
    City._ring = City._ring ?? 1; City._scene = City._scene || 'park';
    UI.modal(`<div class="row between"><span class="kicker">Oświadczyny 💍</span><button class="x" data-ui="close">×</button></div><h2>${esc(G.name)} · ${Math.round(G.rel)}%</h2>
      <div class="box"><h3>Pierścionek</h3><div class="opts">${City.RINGS.map(([p, n], i) => `<button class="opt ${City._ring === i ? 'on' : ''}" data-ui="cRing" data-v="${i}" ${C.money < p ? 'disabled' : ''}>${n}<small>${p.toLocaleString('pl-PL')} zł</small></button>`).join('')}</div></div>
      <div class="box"><h3>Gdzie?</h3><div class="opts">${City.SCENES.map(([k, n]) => `<button class="opt ${City._scene === k ? 'on' : ''}" data-ui="cScene" data-v="${k}">${n}</button>`).join('')}</div></div>
      <p class="small muted">Nikt nie zna odpowiedzi przed pytaniem. Tajemnice (romanse) zmniejszają szanse.</p>
      <div class="actions"><button class="go" data-ui="cPropose">Klęknij ▸</button></div>`);
  },
  propose() {
    const Z = City.Z(), G = Z.gf, C = Career.C(); if (!G) return;
    const [price, ring, rb] = City.RINGS[City._ring], sc = City.SCENES.find(x => x[0] === City._scene);
    if (C.money < price) { UI.toast('Za mało pieniędzy na pierścionek.', true); return; }
    Career.pay(-price, `Pierścionek: ${ring}`);
    const p = (G.rel - 55) / 40 + rb + sc[2] - ((Z.lovers || []).length ? 0.35 : 0);
    if (Math.random() < p) {
      G.engaged = Game.s.week + Game.s.season * 100; G.rel = Math.min(100, G.rel + 10); Career.mor(12); Z.stress -= 20; Career.repd(3);
      Game.news(`${Career.me().name} zaręczył się z ${G.name}! ${sc[0] === 'track' ? 'Trybuny oszalały.' : ''}`, 'good');
      UI.modal(`<div class="kicker">${sc[1]}</div><h2>TAK! 💍</h2><p class="fx big-fx">${esc(G.name)} zakrywa usta dłońmi, a potem rzuca ci się na szyję. Jesteście zaręczeni!</p><p class="small muted">Ślub możesz zaplanować w zakładce Kariera.</p><div class="actions"><button class="go" data-ui="close">❤</button></div>`);
    } else {
      G.rel -= 15; Z.stress += 20; Career.mor(-10);
      UI.modal(`<div class="kicker">${sc[1]}</div><h2>„Ja… potrzebuję czasu.”</h2><p class="fx big-fx">${esc(G.name)} odwraca wzrok. Pierścionek wraca do kieszeni. Związek −15.</p><div class="actions"><button class="go" data-ui="close">…</button></div>`);
    }
    City.clamp(Z); Game.save();
  },
  WEDDINGS: [[15000, 'Skromny ślub cywilny i obiad z rodziną', 0], [45000, 'Wesele na 120 osób z orkiestrą', 3], [120000, 'Huczne wesele w pałacu z mediami', 8]],
  wedding(i) {
    const Z = City.Z(), G = Z.gf, C = Career.C(), [price, n, rep] = City.WEDDINGS[i]; if (!G || !G.engaged) return;
    if (C.money < price) { UI.toast('Za mało pieniędzy.', true); return; }
    Career.pay(-price, `Ślub: ${n}`); G.married = true; G.rel = 100; Career.mor(15); Z.stress -= 30; Career.repd(rep); if (rep > 5) Z.followers = Math.round((Z.followers || 800) * 1.4);
    C.trophies.push(`💍 Ślub z ${G.name} (${Game.s.season})`); C.livingTogether = true;
    Game.news(`${Career.me().name} i ${G.name} powiedzieli sobie „tak”!`, 'good'); City.clamp(Z); Game.save(); Career.render();
    UI.modal(`<h2>Młoda Para 💒</h2><p class="fx big-fx">${esc(n)}. ${rep > 5 ? 'Zdjęcia obiegły wszystkie portale.' : 'Łzy mamy, pierwszy taniec, oczepiny.'} Od dziś jesteście małżeństwem.</p><div class="actions"><button class="go" data-ui="close">❤</button></div>`);
  },
});
(() => {
  // telefon: oświadczyny i garderoba
  const br = City.phoneRender;
  City.phoneRender = function () {
    br.call(this);
    const el = document.getElementById('phone'), Z = City.Z(), app = City.app || 'home'; if (!el || !Z.gf) return;
    if (app === 'home') { const grid = el.querySelector('.ph-grid'); if (grid && !grid.querySelector('[data-v="ward"]')) grid.insertAdjacentHTML('beforeend', '<button data-ui="ph" data-v="ward"><b>👗</b><small>Garderoba</small></button>'); }
    if (app === 'call:gf') { const box = el.querySelector('.ph-call'); const G = Z.gf, ok = G.rel >= 80 && Game.s.week + Game.s.season * 100 - ((G.met || 0) + Game.s.season * 100) >= 5; if (box && !G.engaged && !box.querySelector('[data-v="do:gf:propose"]')) box.insertAdjacentHTML('beforeend', `<button data-ui="ph" data-v="do:gf:propose" ${ok ? '' : 'disabled title="Związek 80%+ i kilka tygodni razem"'}>Oświadcz się 💍</button>`); }
  };
  const bd = City.phoneDo;
  City.phoneDo = function (v) {
    if (v === 'ward') { City.phoneToggle(); City.wardModal(); return; }
    if (v === 'do:gf:propose') { City.phoneToggle(); City.proposeModal(); return; }
    return bd.call(this, v);
  };
  const bc = Career.click;
  Career.click = function (d) {
    switch (d.ui) {
      case 'cRing': City._ring = +d.v; City.proposeModal(); return true;
      case 'cScene': City._scene = d.v; City.proposeModal(); return true;
      case 'cPropose': City.propose(); return true;
      case 'cWedding': City.wedding(+d.v); return true;
      case 'cAbroad': Abroad.sign(+d.v); return true;
      case 'cAbroadQuit': Abroad.quit(); return true;
      case 'cMid': Move.acceptMid(+d.v); return true;
      case 'cMidNo': Career.C().midOffers = []; Game.save(); Career.render(); return true;
      case 'cLoan': Move.acceptLoan(); return true;
      case 'cLoanNo': Career.C().loanOffer = null; Game.save(); Career.render(); return true;
    }
    return bc.call(this, d);
  };
  // małżeństwo: mniej stresu, związek nie słabnie tak szybko; rozwód po aferze kosztuje
  const be = City.endDay;
  City.endDay = function (auto) { const Z = City.Z(); if (Z.gf && Z.gf.married && Z.day <= 5) Z.stress -= 2; return be.call(this, auto); };
  const bfd = City.finishDays;
  City.finishDays = function () { const Z = City.Z(), G = Z.gf; if (G && G.married && G.lastDate !== Game.s.week) G.rel += 5; return bfd.call(this); };
  const bsa = City.scandalAct;
  City.scandalAct = function (v) {
    const Z = City.Z(), G = Z.gf, wasMarried = G && G.married;
    const r = bsa.call(this, v);
    if (wasMarried && (!Z.gf || !Z.gf.married || Z.gf.name !== G.name)) { const C = Career.C(), cost = Math.round(Math.max(0, C.money) * 0.3); Career.pay(-cost, 'Rozwód — podział majątku'); Game.news(`Rozwód! ${G.name} odchodzi. Podział majątku: ${cost.toLocaleString('pl-PL')} zł.`, 'bad'); C.livingTogether = false; }
    return r;
  };
  // dziewczyna na trybunach: mecz u siebie
  const btm = Career.toMatch;
  Career.toMatch = function () {
    const Z = City.Z(), fx = Game.userFixture(), C = Career.C();
    if (Z.gf && Z.gf.rel >= 60 && fx && fx.h === Game.s.user && C.gfStand !== Game.s.week && !Meet.due()) { C.gfStand = Game.s.week; Career.mor(2); UI.toast(`${Z.gf.name} siedzi na trybunie z twoim numerem na szaliku ❤`); }
    return btm.call(this);
  };
})();

/* =========================================================
   ZAKŁADKA KARIERA: nowe karty
   ========================================================= */
(() => {
  const bk = Career.views.kkariera;
  Career.views.kkariera = function () {
    const s = Game.s, C = Career.C(), r = Career.me(), Z = City.Z(), gp = Meet.gpField();
    const card = (cls, h, body) => `<div class="card ${cls}"><h3>${h}</h3>${body}</div>`;
    const cal = [];
    for (let w = s.week; w <= 17 && cal.length < 3; w++) { const d = Meet.due(w); if (d) cal.push(`${Game.dateStr(w).slice(3)} — ${d.title}`); }
    const gpTab = Object.entries(gp.table).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const nameOf = id => id === r.id ? r.name : (gp.field.find(x => x.id === id) || { name: '?' }).name;
    let extra = `<div class="grid">`;
    extra += card('s6', '🏆 Turnieje i reprezentacja', `${gp.qualified ? '<p class="good">Jesteś w cyklu Grand Prix!</p>' : C.gpNext === s.season + 1 ? '<p class="good">Awans do GP w przyszłym sezonie.</p>' : '<p class="small muted">Grand Prix: awans przez eliminacje (tydzień 9) — potrzebna dobra średnia, KSM 6+ albo reputacja 45+. Dzika karta na GP Polski przy reputacji 40+.</p>'}
      <ul class="list small">${cal.map(c => `<li>${esc(c)}</li>`).join('') || '<li class="muted">Brak zaproszeń w najbliższych tygodniach.</li>'}</ul>
      ${gpTab.length ? `<table class="small"><tbody>${gpTab.map(([id, p], i) => `<tr class="${id === r.id ? 'me' : ''}"><td>${i + 1}.</td><td>${esc(nameOf(id))}</td><td class="t-r">${p}</td></tr>`).join('')}</tbody></table>` : ''}`);
    const offs = Abroad.offers();
    extra += card('s6', '✈️ Liga zagraniczna', C.abroad ? `<p><b>${esc(C.abroad.club)}</b> (${C.abroad.lg === 'eng' ? 'Anglia' : 'Szwecja'}) · ${C.abroad.perPoint} zł/pkt · w sezonie ${C.abroad.pts} pkt w ${C.abroad.m} meczach</p><p class="small muted">Mecz w środę — pieniądze, ale mniej energii na niedzielę (bus pomaga).</p><button class="ghost small" data-ui="cAbroadQuit">Zakończ starty za granicą</button>`
      : offs.length ? offs.map((o, i) => `<div class="sp-row"><div><b>${esc(o.club)}</b><small>${o.lg === 'eng' ? 'Anglia' : 'Szwecja'} · ${o.sign.toLocaleString('pl-PL')} zł za podpis · ${o.perPoint} zł/pkt</small></div><button class="go small" data-ui="cAbroad" data-v="${i}">Podpisz</button></div>`).join('') : '<p class="small muted">Na razie brak ofert (Szwecja chce zawodników z KSM 4,5+).</p>');
    const mid = C.midOffers || [];
    extra += card('s6', '🔁 Transfery w trakcie sezonu', `${C.loan ? `<p>Wypożyczony do <b>${esc(Game.club(s.user).name)}</b> — jeszcze ${C.loan.weeks} tyg. (klub macierzysty: ${esc(Game.club(C.loan.from).short)})</p>` : ''}
      ${mid.map((o, i) => `<div class="sp-row">${UI.clubTag(o.club)}<div><b>${esc(Game.club(o.club).name)}</b><small>od zaraz · ${o.sign.toLocaleString('pl-PL')} zł za podpis · ${o.perPoint} zł/pkt · odstępne dla klubu ${o.buyout.toLocaleString('pl-PL')} zł</small></div><button class="go small" data-ui="cMid" data-v="${i}">Przejdź</button><button class="ghost small" data-ui="cMidNo">Zostaję</button></div>`).join('')}
      ${C.loanOffer ? `<div class="sp-row">${UI.clubTag(C.loanOffer.club)}<div><b>Wypożyczenie: ${esc(Game.club(C.loanOffer.club).name)}</b><small>${C.loanOffer.weeks} tyg. regularnej jazdy</small></div><button class="go small" data-ui="cLoan">Zgoda</button><button class="ghost small" data-ui="cLoanNo">Nie</button></div>` : ''}
      ${!mid.length && !C.loanOffer && !C.loan ? '<p class="small muted">Okno transferowe otwarte do rundy 12. Dobre występy przyciągają oferty; rezerwowy dostaje propozycje wypożyczenia.</p>' : ''}`);
    const rv = Rival.list();
    extra += card('s6', '⚔️ Rywale', rv.map(x => { const q = s.riders[x.id]; return `<div class="sp-row">${UI.clubTag(q.club)}<div><b>${esc(q.name)}</b><small>${q.age} lat · KSM ${num(q.ksm)} · bilans pojedynków <b>${x.w}:${x.l}</b></small></div><span class="pips">${'🔥'.repeat(Math.max(1, Math.round(x.heat / 25)))}</span></div>`; }).join('') + '<p class="small muted">Gdy rywal jest w twoim biegu: przy dobrej psychice — dodatkowa moc, przy słabej — nerwy.</p>');
    extra += card('s6', '🩺 Zdrowie', `${r.injury ? `<p class="neg">Kontuzja: ${r.injury} tyg.${C.rehab ? ` · rehabilitacja ${C.rehab.prog}/2 w tym tygodniu` : ''}</p>` : '<p class="good">Zdrowy.</p>'}<p class="small">Strach po upadku: <b>${Math.round(C.fear || 0)}</b>${C.fragile ? ` · uraz podatny na odnowienie (${C.fragile} tyg.)` : ''}</p><p class="small muted">Rehabilitacja i basen: siłownia. Strach: psycholog. Trener mentalny: zakładka Sprzęt.</p>`);
    const G = Z.gf;
    extra += card('s6', '❤ Związek', G ? `<p><b>${esc(G.name)}</b> · ${Math.round(G.rel)}% ${G.married ? '· 💒 małżeństwo' : G.engaged ? '· 💍 zaręczeni' : ''}</p>
      ${G.engaged && !G.married ? `<p class="small">Zaplanuj ślub:</p>${City.WEDDINGS.map(([p, n], i) => `<button class="ghost small" data-ui="cWedding" data-v="${i}" ${C.money < p ? 'disabled' : ''}>${n} — ${p.toLocaleString('pl-PL')} zł</button>`).join(' ')}` : !G.engaged ? '<p class="small muted">Oświadczyny: zadzwoń do niej (związek 80%+). Wspólny wyjazd: park.</p>' : ''}
      <button class="ghost small" data-ui="cWard">👗 Garderoba</button>` : '<p class="small muted">Singiel. Poznaj kogoś w barze, kawiarni albo na siłowni.</p>');
    extra += '</div>';
    return bk.call(this) + extra;
  };
})();

/* Trener mentalny (sprzęt/sztab) */
Career.GEAR.coach = { n: 'Trener mentalny', max: 1, cost: () => 4000, eff: { mental: 0.3 }, d: 'Co tydzień stres −10 i strach −6, rutyna przed startem skuteczniejsza. 1200 zł/tydz.' };

/* Zawieszony, w areszcie, odsunięty albo kontuzjowany — nie jedzie w symulowanym meczu i nie dostaje punktów */
(() => {
  const bf = Career.finishWeek;
  Career.finishWeek = function (um) {
    const s = Game.s, C = Career.C(), r = Career.me();
    const out = !um && (C.jail > 0 || C.suspended > 0 || C.benched > 0 || r.injury > 0);
    if (!out) return bf.call(this, um);
    const cl = r.club; r.club = '__out'; Game.autoLineup(s.user);
    try { return bf.call(this, um); } finally { if (r.club === '__out') r.club = cl; Game.autoLineup(s.user); Game.save(); }
  };
  const bm = Career.maybeEvent;
  Career.maybeEvent = function () { if (Career.C().jail > 0) return Career.toMatch(); return bm.call(this); };
})();
