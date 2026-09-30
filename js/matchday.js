/* =========================================================
   Speedway Empire 3D — dzień meczowy (15 biegów)
   Program biegów z numerami ze składów, rezerwa taktyczna
   (decyzja gracza), nominacje do biegów 14–15, boks przed
   każdym biegiem, równanie toru co 4 biegi, upadek = powtórka.
   Każdy bieg: oglądasz w 3D, prowadzisz sam (RaceView) albo symulujesz.
   ========================================================= */
'use strict';

const MatchDay = {
  m: null,

  /* ---------- przygotowanie ---------- */
  begin(fx) {
    const s = Game.s, me = s.user;
    const my = fx.h === me ? 'h' : 'a';
    [fx.h, fx.a].forEach(id => { if (id !== me) Game.autoLineup(id); });
    MatchDay.m = {
      fx, my, H: Game.club(fx.h), A: Game.club(fx.a),
      L: { h: s.lineups[fx.h].slice(), a: s.lineups[fx.a].slice() },
      cond: { ...s.forecast, rut: 0.05 }, n: 0, score: { h: 0, a: 0 }, stats: {}, resUsed: { h: 0, a: 0 },
      log: [], setups: {}, assist: true, pendingIds: null, excluded: [],
    };
    MatchDay.showPre();
  },

  riderOf: id => Game.s.riders[id],
  numberOf(team, id) { const L = MatchDay.m.L[team]; const i = L.indexOf(id); return team === 'a' ? i + 1 : i + 9; },

  /** Rekomendacja asystenta (ta sama logika co w prototypie) */
  recommend(r) { return MatchDay.recommendFor(r, MatchDay.m.cond); },
  recommendFor(r, c) {
    const a = r.a, why = [];
    let gear = 'mid', map = 'soft', line = 'inside';
    if (c.wet > 0.3) { gear = 'long'; why.push('mokro: długie przełożenie i łagodna mapa'); }
    else if (c.prep === 'hard') { gear = 'short'; why.push('twardy tor: krótka zębatka na start'); }
    if (c.wet <= 0.3 && c.prep === 'grippy') { map = 'aggr'; why.push('przyczepny tor przyjmie agresywną mapę'); }
    if (c.rut > 0.3) { line = 'wide'; why.push('koleiny przy krawężniku: szeroka'); }
    else if (a.bends - a.start >= 3) { line = 'wide'; why.push('dystansowiec: szeroka'); }
    else why.push('świeży tor: krawężnik');
    return { setup: { gear, map, line }, why };
  },

  panel(html) { $('#md-panel').innerHTML = html ? `<div class="veil"><div class="sheet">${html}</div></div>` : ''; },

  showPre() {
    const M = MatchDay.m, c = M.cond, home = M.my === 'h' && !MatchDay.career;
    UI.show('md');
    World.enterVenue(M.H.id); // każdy klub ma swój stadion i tor
    World.setVenue(M.H.name, M.H.kevlar, M.H.trim, M.H.short);
    World.setFlagColors(M.H.kevlar, M.H.trim);
    World.setTeams(M.H, M.A);
    // stadion gospodarza: frekwencja na trybunach, oświetlenie, bandy sponsorów
    const homeMine = M.H.id === Game.s.user, A = Club.attendance(M.H, c);
    World.setStadium({ fill: A.fill, lights: homeMine ? Club.lvl('lights') : R.clamp(Math.round(M.H.base - 12), 1, 5), boards: homeMine ? Game.s.club.sponsors : [] });
    World.setRiders([]);
    World.clearMarks();
    World.setScreen([`${M.H.short} 0 : 0 ${M.A.short}`, 'Prezentacja drużyn', DATA.LEAGUE]);
    const opt = (grp, k, label, sub) => `<button class="opt ${c[grp] === k ? 'on' : ''}" data-md="prep" data-v="${k}">${label}<small>${sub}</small></button>`;
    const lineup = team => M.L[team].map((id, i) => { const r = MatchDay.riderOf(id); return r ? `<div><b class="nr">${team === 'a' ? i + 1 : i + 9}</b> ${esc(r.name)} <span class="attr">KSM ${num(r.ksm)}</span></div>` : ''; }).join('');
    MatchDay.panel(`
      <h2>${esc(M.H.name)} – ${esc(M.A.name)}</h2>
      <p>${Game.dateStr(Game.s.week)} · ${Game.phaseName(Game.s.week)} · ${DATA.WEATHER[c.weather].name.toLowerCase()}, ${c.temp}°C, wiatr ${c.wind} m/s</p>
      <div class="row2"><div class="box"><h3>${esc(M.H.short)} (gospodarze)</h3><div class="lineup1">${lineup('h')}</div></div>
        <div class="box"><h3>${esc(M.A.short)} (goście)</h3><div class="lineup1">${lineup('a')}</div></div></div>
      ${home ? `<div class="box"><h3>Przygotowanie toru (jesteś gospodarzem)</h3><div class="opts">${Object.entries(DATA.PREP).map(([k, p]) => opt('prep', k, p.name, p.desc)).join('')}</div></div>`
        : `<div class="box"><p>Gospodarz przygotował tor: <b>${DATA.PREP[c.prep].name.toLowerCase()}</b>.</p></div>`}
      <div class="box"><label class="toggle"><input type="checkbox" id="md-assist" ${M.assist ? 'checked' : ''}> Asystent ustawia boks w każdym biegu (możesz to zmienić przed każdym biegiem)</label></div>
      <div class="actions"><button class="go" data-md="first">Prezentacja i bieg 1 ▸</button><button class="ghost" data-md="simAll">Symuluj cały mecz</button></div>`);
    if (!home) c.prep = Math.random() < 0.5 ? 'hard' : 'grippy';
  },

  /* ---------- przed biegiem ---------- */
  prepareHeat() {
    if (MatchDay.career) return MatchDay.careerHeat();
    const M = MatchDay.m, s = Game.s;
    M.n++;
    if (M.n > 1 && (M.n - 1) % DATA.GRADE_EVERY === 0) { M.cond.rut = 0.08; World.gradeMarks(0.2); Game.news('Równanie toru', 'info'); }
    M.excluded = [];
    const { ids, gates } = Game.heatEntries(M.n, M.L, M.stats, new Set());
    M.ids = ids; M.gates = gates;
    // AI: rezerwa taktyczna po stronie rywala
    const opp = M.my === 'h' ? 'a' : 'h';
    MatchDay.aiReserve(opp);
    // gracz: rezerwa taktyczna i nominacje są jego decyzją
    const behind = M.score[opp] - M.score[M.my];
    if (M.n >= 5 && M.n <= 13 && M.resUsed[M.my] < 2 && behind >= DATA.TACTICAL_RESERVE_DIFF && MatchDay.reserveCands().length) return MatchDay.showReserve();
    if (M.n >= 14) return MatchDay.showNominate();
    MatchDay.showBox();
  },

  aiReserve(k) {
    const M = MatchDay.m, s = Game.s, other = k === 'h' ? 'a' : 'h';
    if (!(M.n >= 5 && M.n <= 13 && M.resUsed[k] < 2 && M.score[other] - M.score[k] >= DATA.TACTICAL_RESERVE_DIFF)) return;
    const cand = M.L[k].filter(id => id && s.riders[id] && s.riders[id].injury === 0 && !M.ids[k].includes(id) && (M.stats[id]?.heats || 0) < 5).sort((x, y) => Game.ovr(s.riders[y]) - Game.ovr(s.riders[x]))[0];
    const weakest = M.ids[k].filter(Boolean).sort((x, y) => Game.ovr(s.riders[x]) - Game.ovr(s.riders[y]))[0];
    if (cand && weakest && Game.ovr(s.riders[cand]) > Game.ovr(s.riders[weakest])) {
      M.ids[k] = M.ids[k].map(id => (id === weakest ? cand : id)); M.resUsed[k]++;
      MatchDay.note(`Rezerwa taktyczna rywala: ${s.riders[cand].name} za ${s.riders[weakest].name}`);
    }
  },

  reserveCands() {
    const M = MatchDay.m, s = Game.s;
    return M.L[M.my].filter(id => id && s.riders[id] && s.riders[id].injury === 0 && !M.ids[M.my].includes(id) && (M.stats[id]?.heats || 0) < 5);
  },

  riderChip(id, grp, on, extra = '') {
    const r = MatchDay.riderOf(id), st = MatchDay.m.stats[id] || { pts: 0, bonus: 0, heats: 0 };
    return `<button class="opt ${on ? 'on' : ''}" data-md="${grp}" data-v="${id}">${esc(r.name)}<small>w meczu ${st.pts}${st.bonus ? '+' + st.bonus : ''} pkt / ${st.heats} b. · KSM ${num(r.ksm)}${extra}</small></button>`;
  },

  showReserve() {
    const M = MatchDay.m, my = M.my, opp = my === 'h' ? 'a' : 'h';
    const cands = MatchDay.reserveCands();
    M.res = M.res && M.res.n === M.n ? M.res : { n: M.n, out: M.ids[my][0], in: cands[0] };
    MatchDay.panel(`<h2>Rezerwa taktyczna · bieg ${M.n}</h2>
      <p>Przegrywamy ${M.score[opp] - M.score[my]} pkt (${M.score.h}:${M.score.a}). Możesz podmienić zawodnika w tym biegu. Zostały ${2 - M.resUsed[my]} zmiany.</p>
      <div class="box"><h3>Kto zjeżdża</h3><div class="opts">${M.ids[my].filter(Boolean).map(id => MatchDay.riderChip(id, 'resOut', M.res.out === id)).join('')}</div></div>
      <div class="box"><h3>Kto wjeżdża</h3><div class="opts">${cands.map(id => MatchDay.riderChip(id, 'resIn', M.res.in === id)).join('')}</div></div>
      <div class="actions"><button class="go" data-md="resGo">Wpuść rezerwę ▸</button><button class="ghost" data-md="resSkip">Bez zmian</button></div>`);
  },

  showNominate() {
    const M = MatchDay.m, my = M.my;
    const pool = M.L[my].slice(0, 8).filter(id => id && Game.s.riders[id] && Game.s.riders[id].injury === 0 && (M.stats[id]?.heats || 0) < 6 && !M.excludedMatch?.includes(id));
    M.nom = M.nom && M.nom.n === M.n ? M.nom : { n: M.n, ids: M.ids[my].filter(Boolean).slice(0, 2) };
    MatchDay.panel(`<h2>Nominacje · bieg ${M.n}</h2>
      <p>Wynik ${M.score.h}:${M.score.a}. ${M.n === 15 ? 'Ostatni bieg meczu: zwykle jadą dwaj najlepsi.' : 'Bieg przedostatni.'} Wybierz dwóch zawodników.</p>
      <div class="box"><div class="opts">${pool.map(id => MatchDay.riderChip(id, 'nom', M.nom.ids.includes(id), ` · świeżość ${100 - Math.round(MatchDay.riderOf(id).fatigue)}%`)).join('')}</div></div>
      <div class="actions"><button class="go" data-md="nomGo" ${M.nom.ids.length === 2 ? '' : 'disabled'}>Nominuj ▸</button></div>`);
  },

  showBox() {
    const M = MatchDay.m, my = M.my;
    const riders = MatchDay.heatRiders();
    const mine = riders.filter(x => x.team === my);
    mine.forEach(x => { if (M.assist || !M.setups[x.id]) M.setups[x.id] = MatchDay.recommend(Game.s.riders[x.id]).setup; });
    const block = x => {
      const s = M.setups[x.id], rec = MatchDay.recommend(Game.s.riders[x.id]);
      const ch = (grp, k, o) => `<button class="opt ${s[grp] === k ? 'on' : ''}" data-md="set" data-id="${x.id}" data-grp="${grp}" data-v="${k}">${o.name}</button>`;
      return `<div class="box"><div class="rider-head"><i class="helmet" style="background:${x.helmet}"></i>${esc(x.name)} <span class="gate">pole ${'ABCD'[x.gate]}</span></div>
        <div class="opts">${Object.entries(DATA.GEARS).map(([k, o]) => ch('gear', k, o)).join('')}<span class="sep"></span>${Object.entries(DATA.MAPS).map(([k, o]) => ch('map', k, o)).join('')}<span class="sep"></span>${Object.entries(DATA.LINES).map(([k, o]) => ch('line', k, o)).join('')}</div>
        <div class="assist">Asystent: ${rec.why.map(esc).join('; ')}.</div></div>`;
    };
    MatchDay.panel(`<h2>Bieg ${M.n} z 15${M.n >= 14 ? ' (nominowany)' : ''}</h2>
      <p>Wynik ${esc(M.H.short)} ${M.score.h} : ${M.score.a} ${esc(M.A.short)} · koleiny ${Math.round(M.cond.rut * 100)}%${M.log.length ? ` · ostatni bieg ${M.log[M.log.length - 1].h}:${M.log[M.log.length - 1].a}` : ''}</p>
      <div class="box"><h3>Pod taśmą</h3><div class="lineup">${riders.map(x => `<div><i class="helmet" style="background:${x.helmet}"></i><b class="nr">${x.no}</b> ${esc(x.name)} <span class="attr">pole ${'ABCD'[x.gate]}</span></div>`).join('')}</div></div>
      ${mine.map(block).join('')}
      <div class="actions ride">${mine.map(x => `<button class="go ride-btn" data-md="ride" data-id="${x.id}">Jedź sam: ${esc(x.name.split(' ').slice(-1)[0])} ▸</button>`).join('')}
        <span class="muted small">W/↑ gaz · A/D albo ←/→ linia jazdy · na telefonie przyciski na ekranie</span></div>
      <div class="actions"><button class="ghost" data-md="watch">Oglądaj ▸</button><button class="ghost" data-md="sim1">Symuluj bieg</button><button class="ghost" data-md="simRest">Symuluj resztę meczu</button>
        <label class="toggle"><input type="checkbox" id="md-assist2" ${M.assist ? 'checked' : ''}> asystent ustawia boks</label></div>`);
  },

  /**
   * Kariera zawodnika: składem, rezerwami i nominacjami rządzi trener (AI). Biegi bez gracza
   * symulujemy od razu; zatrzymujemy się dopiero przed biegiem, w którym jedziesz.
   */
  careerHeat() {
    const M = MatchDay.m, s = Game.s, me = s.career.me, skipped = [];
    while (M.n < 15) {
      M.n++;
      if (M.n > 1 && (M.n - 1) % DATA.GRADE_EVERY === 0) { M.cond.rut = 0.08; World.gradeMarks(0.2); }
      M.excluded = [];
      const { ids, gates } = Game.heatEntries(M.n, M.L, M.stats, new Set());
      M.ids = ids; M.gates = gates;
      MatchDay.aiReserve('h'); MatchDay.aiReserve('a');
      if (M.n >= 14) {
        const my = M.my, pool = M.L[my].slice(0, 8).filter(id => id && s.riders[id] && s.riders[id].injury === 0 && (M.stats[id]?.heats || 0) < 6);
        const score = id => { const S = M.stats[id]; return (S ? (S.pts + S.bonus) / Math.max(1, S.heats) : 0) * 2 + Game.ovr(s.riders[id]) / 10; };
        if (pool.length >= 2) M.ids[my] = pool.sort((a, b) => score(b) - score(a)).slice(0, 2);
      }
      if (M.ids.h.includes(me) || M.ids.a.includes(me)) return MatchDay.careerBox(skipped);
      let st = Sim.runToEnd(Sim.create(MatchDay.cfg()));
      while (st.stopped) {
        const f = st.stopped.id; M.excluded.push(f);
        const S = M.stats[f] = M.stats[f] || { pts: 0, bonus: 0, heats: 0, line: [] }; S.heats++; S.line.push('w');
        if (MatchDay.heatRiders().length < 2) { st = null; break; }
        st = Sim.runToEnd(Sim.create(MatchDay.cfg()));
      }
      const b = { h: M.score.h, a: M.score.a };
      MatchDay.scoreHeatSilent(st);
      skipped.push(`Bieg ${M.n}: ${M.score.h - b.h}:${M.score.a - b.a}`);
    }
    MatchDay.finish();
  },
  careerBox(skipped = []) {
    const M = MatchDay.m, me = Game.s.career.me, riders = MatchDay.heatRiders(), x = riders.find(r => r.id === me);
    if (!x) return MatchDay.careerHeat();
    const st = M.setups[me] = M.setups[me] || MatchDay.recommend(Game.s.riders[me]).setup, rec = MatchDay.recommend(Game.s.riders[me]);
    const ch = (grp, k, o) => `<button class="opt ${st[grp] === k ? 'on' : ''}" data-md="set" data-id="${me}" data-grp="${grp}" data-v="${k}">${o.name}</button>`;
    World.setScreen([`${M.H.short} ${M.score.h} : ${M.score.a} ${M.A.short}`, `Bieg ${M.n} z 15`, `Jedzie: ${x.name}`]);
    MatchDay.panel(`<h2>Twój bieg: ${M.n} z 15</h2>
      <p>Wynik ${esc(M.H.short)} ${M.score.h} : ${M.score.a} ${esc(M.A.short)}${skipped.length ? ` · ${skipped.map(esc).join(' · ')}` : ''}</p>
      <div class="box"><h3>Pod taśmą</h3><div class="lineup">${riders.map(r => `<div class="${r.id === me ? 'me' : ''}"><i class="helmet" style="background:${r.helmet}"></i><b class="nr">${r.no}</b> ${esc(r.name)} <span class="attr">pole ${'ABCD'[r.gate]}</span></div>`).join('')}</div></div>
      <div class="box"><h3>Twoje ustawienia</h3><div class="opts">${Object.entries(DATA.GEARS).map(([k, o]) => ch('gear', k, o)).join('')}<span class="sep"></span>${Object.entries(DATA.MAPS).map(([k, o]) => ch('map', k, o)).join('')}<span class="sep"></span>${Object.entries(DATA.LINES).map(([k, o]) => ch('line', k, o)).join('')}</div>
        <div class="assist">Mechanik: ${rec.why.map(esc).join('; ')}.</div></div>
      ${Game.s.career && Game.s.career.city ? `<div class="box"><h3>Twoja dyspozycja</h3><p class="small">Energia ${Math.round(Game.s.career.city.energy)} · Jedzenie ${Math.round(Game.s.career.city.food)} · Stres ${Math.round(Game.s.career.city.stress)} — ${City.modsHtml()}</p></div>` : ''}
      <div class="actions ride"><button class="go ride-btn" data-md="ride" data-id="${me}">Na start ▸</button><button class="ghost" data-md="sim1">Symuluj mój bieg</button>
        <span class="muted small">W/↑ gaz · A/D albo ←/→ linia jazdy</span></div>
      ${MatchDay.programme()}`);
  },

  heatRiders() {
    const M = MatchDay.m, s = Game.s, out = [];
    ['h', 'a'].forEach(k => M.ids[k].forEach((id, i) => {
      const r = id && s.riders[id];
      if (!r || r.injury > 0 || M.excluded.includes(id)) return;
      const club = k === 'h' ? M.H : M.A;
      out.push({ id, name: r.name, team: k, helmet: DATA.HELMETS[k][i], gate: M.gates[k][i], a: Game.eff(r), no: MatchDay.numberOf(k, id), kevlar: club.kevlar, trim: club.trim });
    }));
    return out;
  },

  /* ---------- bieg ---------- */
  cfg() {
    const M = MatchDay.m;
    const riders = MatchDay.heatRiders().map(x => ({ ...x, setup: x.team === M.my ? (M.setups[x.id] || MatchDay.recommend(Game.s.riders[x.id]).setup) : MatchDay.recommend(Game.s.riders[x.id]).setup }));
    return { seed: Math.floor(Math.random() * 1e9), riders, cond: { ...M.cond } };
  },

  /** Bieg w 3D; humanId = zawodnik prowadzony przez gracza */
  watch(humanId) {
    const M = MatchDay.m;
    const cfg = MatchDay.cfg();
    const me = humanId && cfg.riders.find(x => x.id === humanId);
    if (me) me.human = true;
    M.rideId = me ? humanId : null;
    World.setScreen([`${M.H.short} ${M.score.h} : ${M.score.a} ${M.A.short}`, `Bieg ${M.n} z 15`, me ? `Prowadzi: ${me.name}` : DATA.LEAGUE]);
    RaceView.start(cfg, {
      human: me ? humanId : null, myTeam: M.my, title: `Bieg ${M.n}/15`,
      scoreHtml: () => `<span class="team">${esc(M.H.short)}</span><span class="num">${M.score.h}</span><span class="num">${M.score.a}</span><span class="team">${esc(M.A.short)}</span>`,
      onDone: st => MatchDay.afterHeat(st, true),
    });
  },

  /** Bieg nie wystartował — pokaż przyczynę i pozwól kontynuować symulacją */
  startFailed(err) {
    Main.err(err); try { RaceView.stop(); } catch (e) { }
    MatchDay.panel(`<h2>Bieg nie wystartował</h2><p class="neg small">${esc(String(err && err.message || err))}</p><p class="muted small">Zrób zrzut ekranu i wyślij — naprawimy. Mecz możesz kontynuować symulacją.</p><div class="actions"><button class="go" data-md="sim1">Symuluj ten bieg ▸</button></div>`);
  },

  simHeat() {
    const st = Sim.runToEnd(Sim.create(MatchDay.cfg()));
    return MatchDay.afterHeat(st, false);
  },

  /** Po biegu: upadek → powtórka bez wykluczonego; inaczej punkty */
  afterHeat(st, watched) {
    const M = MatchDay.m, s = Game.s;
    if (st.stopped) {
      const f = st.riders.find(x => x.id === st.stopped.id);
      M.excluded.push(f.id);
      const r = s.riders[f.id];
      if (Math.random() < 0.25) { r.injury = R.int(1, 5); MatchDay.note(`${r.name} kontuzjowany po upadku (${r.injury} tyg.)`); }
      const S = M.stats[f.id] = M.stats[f.id] || { pts: 0, bonus: 0, heats: 0, line: [] };
      S.heats++; S.line.push('w');
      MatchDay.note(`Bieg ${M.n}: upadek ${f.name}, wykluczenie i powtórka`);
      if (MatchDay.heatRiders().length < 2) return MatchDay.scoreHeat(null, watched);
      if (watched) {
        const again = M.rideId && M.rideId !== f.id ? M.rideId : null; // gracz jedzie dalej, chyba że to on upadł
        MatchDay.panel(`<div class="red">Czerwone światło<small>${esc(f.name)} wykluczony. Powtórka biegu.</small></div>`);
        setTimeout(() => MatchDay.watch(again), 2200); return;
      }
      return MatchDay.simHeat();
    }
    return MatchDay.scoreHeat(st, watched);
  },

  scoreHeat(st, watched) {
    const M = MatchDay.m;
    const res = st ? Sim.result(st) : {};
    let h = 0, a = 0;
    const order = st ? Sim.order(st) : [];
    order.forEach(x => {
      const r = res[x.id], S = M.stats[x.id] = M.stats[x.id] || { pts: 0, bonus: 0, heats: 0, line: [] };
      S.pts += r.pts; S.bonus += r.bonus; S.heats++;
      S.line.push(r.status === 'done' ? r.pts + (r.bonus ? '*' : '') : r.status === 'defect' ? 'd' : 'u');
      if (x.team === 'h') h += r.pts; else a += r.pts;
    });
    M.score.h += h; M.score.a += a;
    M.log.push({ n: M.n, h, a, riders: order.map(x => ({ name: x.name, helmet: x.helmet, team: x.team, pts: res[x.id].pts, bonus: res[x.id].bonus, st: res[x.id].status, time: res[x.id].time })) });
    M.cond.rut = Math.min(0.9, M.cond.rut + 0.05);
    World.setScreen([`${M.H.short} ${M.score.h} : ${M.score.a} ${M.A.short}`, `Po biegu ${M.n}: ${h}:${a}`, DATA.LEAGUE]);
    if (M.n >= 15) return MatchDay.finish();
    if (M.simRest) return MatchDay.autoNext();
    if (watched) return MatchDay.showHeatResult();
    MatchDay.prepareHeat();
  },

  showHeatResult() {
    const M = MatchDay.m, L = M.log[M.log.length - 1];
    const stat = { fell: 'upadek', defect: 'defekt' };
    MatchDay.panel(`<h2>Bieg ${L.n}: ${L.h}:${L.a}</h2><p>Mecz ${esc(M.H.short)} ${M.score.h} : ${M.score.a} ${esc(M.A.short)}</p>
      <div class="paper"><table><tbody>${L.riders.map((x, i) => `<tr><td>${x.st === 'done' ? i + 1 + '.' : '–'}</td><td><i class="helmet" style="background:${x.helmet};vertical-align:-2px;margin-right:6px"></i>${esc(x.name)}</td>
        <td>${x.time ? num(x.time) + ' s' : stat[x.st] || ''}</td><td class="pen">${x.st === 'done' ? x.pts + (x.bonus ? '*' : '') : ''}</td></tr>`).join('')}</tbody></table></div>
      ${MatchDay.programme()}
      <div class="actions"><button class="go" data-md="next">Bieg ${M.n + 1} ▸</button><button class="ghost" data-md="simRest">Symuluj resztę meczu</button></div>`);
  },

  /** Program meczowy: zapis punktów każdego zawodnika */
  programme() {
    const M = MatchDay.m;
    const rows = team => M.L[team].map(id => { const r = id && MatchDay.riderOf(id), S = M.stats[id]; if (!r) return ''; return `<tr><td>${MatchDay.numberOf(team, id)}</td><td>${esc(r.name)}</td><td class="pen">${S ? S.line.join(', ') : ''}</td><td class="pen">${S ? S.pts + (S.bonus ? '+' + S.bonus : '') : ''}</td></tr>`; }).join('');
    return `<div class="paper"><table><thead><tr><th colspan="4">${esc(M.H.name)} · ${M.score.h}</th></tr></thead><tbody>${rows('h')}</tbody>
      <thead><tr><th colspan="4">${esc(M.A.name)} · ${M.score.a}</th></tr></thead><tbody>${rows('a')}</tbody></table></div>`;
  },

  /** Symulacja pozostałych biegów: decyzje przejmuje asystent */
  autoNext() {
    const M = MatchDay.m;
    while (M.n < 15) {
      M.n++;
      if (M.n > 1 && (M.n - 1) % DATA.GRADE_EVERY === 0) { M.cond.rut = 0.08; World.gradeMarks(0.2); }
      M.excluded = [];
      const { ids, gates } = Game.heatEntries(M.n, M.L, M.stats, new Set());
      M.ids = ids; M.gates = gates;
      MatchDay.aiReserve('h'); MatchDay.aiReserve('a');
      MatchDay.heatRiders().forEach(x => { if (x.team === M.my) M.setups[x.id] = MatchDay.recommend(Game.s.riders[x.id]).setup; });
      let st = Sim.runToEnd(Sim.create(MatchDay.cfg()));
      while (st.stopped) {
        const f = st.stopped.id; M.excluded.push(f);
        const S = M.stats[f] = M.stats[f] || { pts: 0, bonus: 0, heats: 0, line: [] }; S.heats++; S.line.push('w');
        if (Math.random() < 0.25) Game.s.riders[f].injury = R.int(1, 5);
        if (MatchDay.heatRiders().length < 2) { st = null; break; }
        st = Sim.runToEnd(Sim.create(MatchDay.cfg()));
      }
      M.simRest = false;
      MatchDay.scoreHeatSilent(st);
    }
    MatchDay.finish();
  },

  scoreHeatSilent(st) {
    const M = MatchDay.m, res = st ? Sim.result(st) : {};
    let h = 0, a = 0;
    (st ? Sim.order(st) : []).forEach(x => {
      const r = res[x.id], S = M.stats[x.id] = M.stats[x.id] || { pts: 0, bonus: 0, heats: 0, line: [] };
      S.pts += r.pts; S.bonus += r.bonus; S.heats++;
      S.line.push(r.status === 'done' ? r.pts + (r.bonus ? '*' : '') : r.status === 'defect' ? 'd' : 'u');
      if (x.team === 'h') h += r.pts; else a += r.pts;
    });
    M.score.h += h; M.score.a += a;
    M.log.push({ n: M.n, h, a, riders: [] });
    M.cond.rut = Math.min(0.9, M.cond.rut + 0.05);
  },

  finish() {
    const M = MatchDay.m;
    const my = M.score[M.my], op = M.score[M.my === 'h' ? 'a' : 'h'];
    World.setRiders([]);
    World.setScreen([`${M.H.short} ${M.score.h} : ${M.score.a} ${M.A.short}`, my > op ? 'Zwycięstwo!' : my < op ? 'Koniec meczu' : 'Remis', DATA.LEAGUE]);
    MatchDay.panel(`<h1>${M.score.h} : ${M.score.a}</h1>
      <p>${my > op ? 'Wygrana!' : my < op ? 'Porażka.' : 'Remis.'} ${esc(M.H.name)} – ${esc(M.A.name)}</p>
      ${MatchDay.programme()}
      <div class="actions"><button class="go" data-md="close">${MatchDay.career ? 'Zakończ mecz ▸' : 'Wróć do klubu ▸'}</button></div>`);
  },

  close() {
    const M = MatchDay.m;
    const userMatch = { h: M.fx.h, a: M.fx.a, hs: M.score.h, as: M.score.a, stats: M.stats, cond: M.cond };
    if (MatchDay.career) { MatchDay.career = false; MatchDay.m = null; MatchDay.panel(''); World.setRiders([]); return Career.finishWeek(userMatch); }
    const rep = Game.endWeek(userMatch);
    MatchDay.m = null;
    UI.show('mgr');
    UI.render();
    UI.weekReport(rep);
  },

  note(t) { Game.news(t, 'info'); if (RaceView.active) RaceView.say(t); },

  /* ---------- kliknięcia ---------- */
  click(e) {
    const t = e.target.closest('[data-md]');
    if (!t) return;
    const d = t.dataset, M = MatchDay.m;
    const assistEl = $('#md-assist') || $('#md-assist2');
    if (assistEl) M.assist = assistEl.checked;
    switch (d.md) {
      case 'prep': M.cond.prep = d.v; MatchDay.showPre(); break;
      case 'first': MatchDay.prepareHeat(); break;
      case 'simAll': M.simRest = true; MatchDay.autoNext(); break;
      case 'set': M.assist = false; M.setups[d.id][d.grp] = d.v; if (MatchDay.career) MatchDay.careerBox(); else MatchDay.showBox(); break;
      case 'watch': try { MatchDay.watch(null); } catch (err) { MatchDay.startFailed(err); } break;
      case 'ride': try { M.setups[d.id] = M.setups[d.id] || MatchDay.recommend(Game.s.riders[d.id]).setup; MatchDay.watch(d.id); } catch (err) { MatchDay.startFailed(err); } break;
      case 'sim1': MatchDay.simHeat(); break;
      case 'simRest': M.simRest = true; if (!RaceView.active) MatchDay.autoNext(); break;
      case 'next': MatchDay.prepareHeat(); break;
      case 'resOut': M.res.out = d.v; MatchDay.showReserve(); break;
      case 'resIn': M.res.in = d.v; MatchDay.showReserve(); break;
      case 'resGo': {
        const my = M.my;
        M.ids[my] = M.ids[my].map(id => (id === M.res.out ? M.res.in : id)); M.resUsed[my]++;
        MatchDay.note(`Rezerwa taktyczna: ${MatchDay.riderOf(M.res.in).name} za ${MatchDay.riderOf(M.res.out).name}`);
        MatchDay.showBox(); break;
      }
      case 'resSkip': MatchDay.showBox(); break;
      case 'nom': {
        const ids = M.nom.ids, i = ids.indexOf(d.v);
        if (i >= 0) ids.splice(i, 1); else { ids.push(d.v); if (ids.length > 2) ids.shift(); }
        MatchDay.showNominate(); break;
      }
      case 'nomGo': M.ids[M.my] = M.nom.ids.slice(); MatchDay.showBox(); break;
      case 'close': MatchDay.close(); break;
    }
  },
};
