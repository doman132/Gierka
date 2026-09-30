/* =========================================================
   Speedway Empire 3D — świat gry (warstwa menedżerska)
   Stan: kluby, zawodnicy, terminarz, tabela, play-off, treningi,
   finanse, kontrakty, wiadomości. Mecze klubów AI liczy szybki
   model statystyczny (Game.quickMatch), mecz gracza — pełna
   symulacja Sim w 3D (matchday.js). Zapis w localStorage.
   ========================================================= */
'use strict';

const R = {
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  weighted(obj) { const e = Object.entries(obj); let r = Math.random() * e.reduce((s, [, v]) => s + v.w, 0); for (const [k, v] of e) { r -= v.w; if (r <= 0) return k; } return e[0][0]; },
  uid: p => p + Math.random().toString(36).slice(2, 9),
};
const money = v => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2).replace('.', ',') + ' mln zł' : Math.round(v / 1000) + ' tys. zł');
const num = (v, d = 2) => Number(v).toFixed(d).replace('.', ',');

const Game = {
  s: null,
  ATTRS: ['speed', 'start', 'bends', 'stamina', 'mental', 'wet', 'risk'],
  ATTR_NAMES: { speed: 'Prędkość', start: 'Start', bends: 'Łuki', stamina: 'Wytrzymałość', mental: 'Mentalność', wet: 'Mokry tor', risk: 'Ryzyko' },

  /* ---------- zawodnicy ---------- */
  ovr: r => r.a.speed * 0.35 + r.a.start * 0.33 + r.a.bends * 0.32,
  isJunior: r => r.age <= DATA.JUNIOR_AGE,

  genRider(level, o = {}) {
    const nat = o.nat || R.weighted(DATA.NATIONS);
    const N = DATA.NATIONS[nat];
    const age = o.age ?? R.int(22, 34);
    const bias = R.gauss() * 1.4; // + startowiec, − dystansowiec
    const at = (d = 0) => R.clamp(Math.round(level + d + R.gauss() * 1.3), 4, 20);
    const a = { speed: at(), start: at(bias), bends: at(-bias), stamina: at(), mental: at(age > 27 ? 1 : -1), wet: at(), risk: R.clamp(R.int(6, 16), 1, 20) };
    const r = {
      id: R.uid('r'), name: `${R.pick(N.first)} ${R.pick(N.last)}`, nat, age, a,
      pot: 0, form: 0, fatigue: R.int(5, 20), morale: R.int(60, 80), injury: 0, club: o.club ?? null,
      season: { m: 0, heats: 0, pts: 0, bonus: 0 }, growth: {},
    };
    const ov = Game.ovr(r);
    r.pot = R.clamp(Math.round(ov + (age <= 20 ? R.int(3, 7) : age <= 24 ? R.int(1, 4) : 0)), Math.ceil(ov), 20);
    r.ksm = Game.isJunior(r) ? R.clamp(ov * 0.6 - 3.5 + R.gauss() * 0.5, 1, 7) : R.clamp(ov * 0.95 - 4.3 + R.gauss() * 0.6, 2, 12);
    r.ksm = Math.round(r.ksm * 100) / 100;
    r.pop = R.clamp(Math.round(r.ksm * 7 + R.int(0, 20)), 1, 100);
    Game.setContract(r, R.int(1, 3));
    return r;
  },

  /** Kontrakt żużlowy: kwota za podpis (sezon) + stawka za punkt */
  demand(r) {
    const k = Math.max(1, r.ksm);
    return { sign: Math.round(Math.pow(k, 1.6) * 28000 / 1000) * 1000, perPoint: Math.round(k * 800 / 100) * 100 };
  },
  setContract(r, years) { const d = Game.demand(r); r.contract = { years, sign: d.sign, perPoint: d.perPoint }; },

  /** Atrybuty „na dziś”: forma, zmęczenie i morale zmieniają wartości z karty */
  eff(r) {
    const out = {};
    const mod = r.form * 0.5 - Math.max(0, r.fatigue - 40) / 25 + (r.morale - 60) / 60;
    Game.ATTRS.forEach(k => { out[k] = k === 'risk' ? r.a.risk : R.clamp(r.a[k] + mod, 1, 20); });
    Club.effBonus(r, out);
    return out;
  },

  /* ---------- nowa gra ---------- */
  newGame(userIdx) {
    const s = {
      version: 1, season: 2031, week: 0, user: 'C' + userIdx,
      clubs: [], riders: {}, lineups: {}, schedule: [], results: {}, playoffs: null,
      finance: { balance: DATA.FINANCE.start, season: { inc: {}, exp: {} }, history: [] },
      training: { intensity: 'normal', plan: {} }, market: [], news: [], forecast: null, lastReport: null, popularity: 50,
      over: false,
    };
    Game.s = s;
    DATA.CLUBS.forEach(([name, short, kevlar, trim, base, cap], i) => {
      const id = 'C' + i;
      s.clubs.push({ id, name, short, kevlar, trim, base, cap, st: Game.blankTable(), last: [] });
      [1.2, 0.5, 0, -0.4, -0.9, -1.8].forEach(sh => Game.addRider(Game.genRider(base + sh, { club: id })));
      [-3.2, -4.3].forEach(sh => Game.addRider(Game.genRider(base + sh, { club: id, age: R.int(17, 21), nat: 'POL' })));
    });
    // KSM „z poprzedniego sezonu”: silne kluby muszą zmieścić najlepszą siódemkę w limicie
    s.clubs.forEach(c => {
      const best = Game.roster(c.id).sort((x, y) => Game.ovr(y) - Game.ovr(x));
      const top7 = best.filter(r => !Game.isJunior(r)).slice(0, 5).concat(best.filter(Game.isJunior).slice(0, 2));
      const sum = top7.reduce((a, r) => a + r.ksm, 0), cap = DATA.KSM_LIMIT - R.int(1, 5) * 0.5;
      if (sum > cap) best.forEach(r => { r.ksm = Math.round(r.ksm * cap / sum * 100) / 100; });
    });
    s.schedule = Game.makeSchedule(s.clubs.map(c => c.id));
    s.clubs.forEach(c => Game.autoLineup(c.id));
    Game.roster(s.user).forEach(r => { s.training.plan[r.id] = Game.suggestBlock(r); });
    Game.refreshMarket();
    Game.forecast();
    Game.news(`Witaj w klubie ${Game.club(s.user).name}. Pierwszy mecz ${Game.dateStr(0)}.`, 'info');
    Game.news('Ustaw skład (limit KSM 45) i plan treningów, potem „Kontynuuj”.', 'info');
    Club.init(s);
    Game.news('Podpisz sponsorów przed sezonem (zakładka Sponsorzy) i zleć pierwszą inwestycję (Stadion).', 'info');
    return s;
  },

  blankTable: () => ({ m: 0, w: 0, d: 0, l: 0, pts: 0, bonus: 0, sp: 0, sa: 0 }),
  addRider(r) { Game.s.riders[r.id] = r; return r; },
  club: id => Game.s.clubs.find(c => c.id === id),
  roster: id => Object.values(Game.s.riders).filter(r => r.club === id),
  news(text, type = 'info') { Game.s.news.unshift({ text, type, week: Game.s.week, season: Game.s.season }); Game.s.news.length = Math.min(Game.s.news.length, 60); },

  save() { try { localStorage.setItem(DATA.SAVE_KEY, JSON.stringify(Game.s)); return true; } catch (e) { return false; } },
  load() { try { const raw = localStorage.getItem(DATA.SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } },
  wipe() { try { localStorage.removeItem(DATA.SAVE_KEY); } catch (e) { /* brak dostępu */ } },

  /* ---------- kalendarz ---------- */
  REG_WEEKS: 14,
  dateOf(week) { const d = new Date(DATA.SEASON_START + 'T12:00:00'); d.setDate(d.getDate() + week * 7); return d; },
  dateStr(week) { const d = Game.dateOf(week); return `${['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'][d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${Game.s.season}`; },
  phaseName(w) { return w < 14 ? `Runda ${w + 1}` : w < 16 ? `Półfinał, mecz ${w - 13}` : w < 18 ? `Finał i brąz, mecz ${w - 15}` : 'Po sezonie'; },

  makeSchedule(ids) {
    const arr = ids.slice().sort(() => Math.random() - 0.5), n = arr.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const g = [];
      for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; g.push((r + i) % 2 ? [b, a] : [a, b]); }
      rounds.push(g); arr.splice(1, 0, arr.pop());
    }
    return rounds.concat(rounds.map(g => g.map(([h, a]) => [a, h])));
  },

  /** Mecze danego tygodnia (liga albo dwumecze play-off) */
  fixtures(w) {
    const s = Game.s;
    if (w < Game.REG_WEEKS) return s.schedule[w].map(([h, a]) => ({ h, a, kind: 'league' }));
    const P = s.playoffs;
    if (!P) return [];
    const legs = w < 16 ? P.sf : P.fin;
    const leg = w < 16 ? w - 14 : w - 16;
    return legs.map(se => ({ h: leg === 0 ? se.lo : se.hi, a: leg === 0 ? se.hi : se.lo, kind: se.kind, series: se, leg }));
  },
  userFixture(w = Game.s.week) { return Game.fixtures(w).find(f => f.h === Game.s.user || f.a === Game.s.user) || null; },

  forecast() {
    const s = Game.s;
    const wk = R.weighted(DATA.WEATHER);
    const month = Game.dateOf(s.week).getMonth();
    s.forecast = { weather: wk, wet: DATA.WEATHER[wk].wet, wind: R.int(0, 7), temp: R.int(month < 5 ? 6 : 14, month < 5 ? 17 : 27), prep: 'hard' };
  },

  /* ---------- skład meczowy: 1–5 seniorzy, 6–7 juniorzy, 8 rezerwowy ---------- */
  lineupKsm: ids => ids.slice(0, 7).reduce((sum, id) => sum + (id && Game.s.riders[id] ? Game.s.riders[id].ksm : 0), 0),

  autoLineup(cid) {
    const healthy = Game.roster(cid).filter(r => r.injury === 0).sort((x, y) => Game.ovr(y) - Game.ovr(x));
    const juniors = healthy.filter(Game.isJunior).slice(0, 2);
    let pool = healthy.filter(r => !juniors.includes(r));
    let sen = pool.slice(0, 5);
    const budget = DATA.KSM_LIMIT - juniors.reduce((a, r) => a + r.ksm, 0);
    // limit KSM: zamieniaj najdroższego na najlepszego tańszego, dopóki się nie zmieścisz
    for (let k = 0; k < 12 && sen.reduce((a, r) => a + r.ksm, 0) > budget; k++) {
      const out = sen.slice().sort((x, y) => y.ksm - x.ksm)[0];
      const sub = pool.filter(r => !sen.includes(r) && r.ksm < out.ksm).sort((x, y) => Game.ovr(y) - Game.ovr(x))[0];
      if (!sub) break;
      sen = sen.map(r => (r === out ? sub : r));
    }
    sen.sort((x, y) => Game.ovr(y) - Game.ovr(x));
    const reserve = pool.find(r => !sen.includes(r));
    const ids = sen.map(r => r.id);
    while (ids.length < 5) ids.push(null);
    const js = juniors.map(r => r.id); while (js.length < 2) js.push(null);
    Game.s.lineups[cid] = ids.concat(js, [reserve ? reserve.id : null]);
    return Game.s.lineups[cid];
  },

  lineupErrors(cid) {
    const L = Game.s.lineups[cid] || [], out = [];
    const rs = L.map(id => id && Game.s.riders[id]);
    if (rs.slice(0, 7).some(r => !r)) out.push('Brakuje zawodników w składzie (numery 1–7).');
    if (rs.slice(5, 7).some(r => r && !Game.isJunior(r))) out.push(`Numery 6–7 są tylko dla juniorów (do ${DATA.JUNIOR_AGE} lat).`);
    if (rs.some(r => r && r.injury > 0)) out.push('W składzie jest kontuzjowany zawodnik.');
    if (new Set(L.filter(Boolean)).size !== L.filter(Boolean).length) out.push('Ten sam zawodnik wpisany dwa razy.');
    const k = Game.lineupKsm(L);
    if (k > DATA.KSM_LIMIT + 1e-9) out.push(`KSM składu ${num(k)} przekracza limit ${num(DATA.KSM_LIMIT)} (walkower!).`);
    return out;
  },

  /* ---------- szybki mecz (AI): statystyczny model biegu ---------- */
  quickHeat(entries, cond) {
    const gateB = [0.9, 0.45, 0.15, 0];
    const res = entries.map(e => {
      const a = e.a;
      let p = a.start * 0.33 + a.speed * 0.35 + a.bends * 0.32 + gateB[e.gate] + R.gauss() * 3.0;
      if (cond.wet > 0.3) p += (a.wet - 10) * 0.1 * cond.wet;
      const fall = Math.random() < 0.015 * (1 + (a.risk - 10) * 0.08) * (1 + cond.wet);
      const defect = Math.random() < 0.012;
      return { ...e, p: fall || defect ? -99 : p, st: fall ? 'fell' : defect ? 'defect' : 'done' };
    }).sort((x, y) => y.p - x.p);
    const pts = [3, 2, 1, 0];
    let prev = null;
    res.forEach((e, i) => {
      e.pts = e.st === 'done' ? pts[i] : 0;
      e.bonus = e.st === 'done' && prev && prev.team === e.team && e.pts > 0 ? 1 : 0;
      if (e.st === 'done') prev = e;
    });
    return res;
  },

  /** Zawodnicy biegu n (1–15) z numerów w składach */
  heatEntries(n, L, stats, used) {
    const slot = (team, k) => (team === 'a' ? L.a[k - 1] : L.h[DATA.HOME_MAP[k] - 1]);
    const gates = n % 2 ? { h: [0, 2], a: [1, 3] } : { h: [1, 3], a: [0, 2] };
    let ids;
    if (n <= 13) ids = { h: DATA.HEATS[n - 1].map(k => slot('h', k)), a: DATA.HEATS[n - 1].map(k => slot('a', k)) };
    else {
      // nominacje: 15. bieg — dwóch najlepszych w meczu, 14. — dwóch następnych
      const best = team => L[team].slice(0, 7).filter(id => id && !used.has(id)).sort((x, y) => (stats[y]?.pts || 0) + (stats[y]?.bonus || 0) - (stats[x]?.pts || 0) - (stats[x]?.bonus || 0));
      ids = { h: n === 15 ? best('h').slice(0, 2) : best('h').slice(2, 4), a: n === 15 ? best('a').slice(0, 2) : best('a').slice(2, 4) };
    }
    return { ids, gates };
  },

  quickMatch(hId, aId, cond) {
    const s = Game.s;
    const L = { h: s.lineups[hId] || Game.autoLineup(hId), a: s.lineups[aId] || Game.autoLineup(aId) };
    const stats = {}, score = { h: 0, a: 0 }, heats = [], used = new Set(), resUsed = { h: 0, a: 0 };
    for (let n = 1; n <= 15; n++) {
      const { ids, gates } = Game.heatEntries(n, L, stats, used);
      // rezerwa taktyczna AI: przegrywający min. 6 pkt wpuszcza najlepszego wolnego zawodnika
      ['h', 'a'].forEach(k => {
        const other = k === 'h' ? 'a' : 'h';
        if (n >= 5 && n <= 13 && resUsed[k] < 2 && score[other] - score[k] >= DATA.TACTICAL_RESERVE_DIFF) {
          const cand = L[k].filter(id => id && s.riders[id] && s.riders[id].injury === 0 && !ids[k].includes(id) && (stats[id]?.heats || 0) < 5).sort((x, y) => Game.ovr(s.riders[y]) - Game.ovr(s.riders[x]))[0];
          const weakest = ids[k].filter(id => id && s.riders[id]).sort((x, y) => Game.ovr(s.riders[x]) - Game.ovr(s.riders[y]))[0];
          if (cand && weakest && Game.ovr(s.riders[cand]) > Game.ovr(s.riders[weakest])) { ids[k] = ids[k].map(id => (id === weakest ? cand : id)); resUsed[k]++; }
        }
      });
      const entries = [];
      ['h', 'a'].forEach(k => ids[k].forEach((id, i) => { if (id && s.riders[id] && s.riders[id].injury === 0) entries.push({ id, team: k, gate: gates[k][i], a: Game.eff(s.riders[id]) }); }));
      const res = Game.quickHeat(entries, cond);
      res.forEach(e => {
        const S = stats[e.id] = stats[e.id] || { pts: 0, bonus: 0, heats: 0, line: [] };
        S.pts += e.pts; S.bonus += e.bonus; S.heats++;
        S.line.push(e.st === 'done' ? e.pts + (e.bonus ? '*' : '') : e.st === 'fell' ? 'u' : 'd');
        score[e.team] += e.pts;
        if (e.st === 'fell' && Math.random() < 0.2) { s.riders[e.id].injury = R.int(1, 4); }
      });
      heats.push({ n, res: res.map(e => ({ id: e.id, team: e.team, pts: e.pts, bonus: e.bonus, st: e.st })), score: { ...score } });
    }
    return { h: hId, a: aId, hs: score.h, as: score.a, stats, heats };
  },

  /* ---------- wynik meczu: tabela, statystyki, forma, pieniądze ---------- */
  applyMatch(m, fx) {
    const s = Game.s, H = Game.club(m.h), A = Game.club(m.a);
    const res = m.hs > m.as ? 'h' : m.hs < m.as ? 'a' : 'd';
    if (fx.kind === 'league') {
      [H, A].forEach(c => { c.st.m++; });
      H.st.sp += m.hs; H.st.sa += m.as; A.st.sp += m.as; A.st.sa += m.hs;
      if (res === 'd') { H.st.d++; A.st.d++; H.st.pts++; A.st.pts++; }
      else { const [W, Lo] = res === 'h' ? [H, A] : [A, H]; W.st.w++; W.st.pts += 2; Lo.st.l++; }
      // punkt bonusowy za dwumecz
      const first = Object.values(s.results).flat().find(x => x.h === m.a && x.a === m.h && x.kind === 'league');
      if (first) {
        const aggH = m.hs + first.as, aggA = m.as + first.hs;
        if (aggH !== aggA) { const B = aggH > aggA ? H : A; B.st.pts++; B.st.bonus++; }
      }
    }
    [[H, 'h'], [A, 'a']].forEach(([c, k]) => { c.last = c.last.concat(res === 'd' ? 'R' : res === k ? 'W' : 'P').slice(-5); });
    (s.results[s.week] = s.results[s.week] || []).push({ h: m.h, a: m.a, hs: m.hs, as: m.as, kind: fx.kind });

    // statystyki, forma, zmęczenie
    Object.entries(m.stats).forEach(([id, st]) => {
      const r = s.riders[id];
      if (!r) return;
      r.season.m++; r.season.heats += st.heats; r.season.pts += st.pts; r.season.bonus += st.bonus;
      const got = st.pts + st.bonus, expected = r.ksm * (st.heats / 5);
      r.form = R.clamp(r.form * 0.6 + (got - expected) * 0.35, -3, 3);
      r.fatigue = R.clamp(r.fatigue + st.heats * 5, 0, 100);
      r.morale = R.clamp(r.morale + (got - expected) * 2, 20, 100);
      r.pop = R.clamp(r.pop + (got >= 10 ? 1 : 0), 1, 100);
    });

    // pieniądze gracza: premie za punkty, bilety u siebie, nagroda za zwycięstwo
    const me = s.user;
    if (s.mode === 'career' && m.stats[s.career.me]) { const S = m.stats[s.career.me]; s.career.lastMatch = { week: s.week, pts: S.pts, bonus: S.bonus, heats: S.heats }; }
    if (m.h === me || m.a === me) {
      const k = m.h === me ? 'h' : 'a';
      const pay = Object.entries(m.stats).reduce((sum, [id, st]) => { const r = s.riders[id]; return sum + (r && r.club === me ? (st.pts + st.bonus) * r.contract.perPoint : 0); }, 0);
      Game.tx('exp', 'Premie za punkty', pay);
      if (res === k) { Game.tx('inc', 'Nagrody za wygrane', DATA.FINANCE.winPrize); s.popularity = R.clamp(s.popularity + 1.5, 0, 100); }
      else if (res !== 'd') s.popularity = R.clamp(s.popularity - 1, 0, 100);
      if (m.h === me) Club.homeGate(Game.club(me), m);
    }
  },

  tx(kind, cat, v) {
    const F = Game.s.finance;
    v = Math.round(v);
    F.season[kind][cat] = (F.season[kind][cat] || 0) + v;
    F.balance += kind === 'inc' ? v : -v;
  },

  /* ---------- treningi ---------- */
  suggestBlock(r) {
    const map = { start: 'starts', bends: 'bends', stamina: 'fitness', wet: 'wet', mental: 'psych' };
    if (r.fatigue > 70) return 'rest';
    const weakest = Object.keys(map).sort((x, y) => r.a[x] - r.a[y])[0];
    return map[weakest];
  },

  ageCurve: age => (age <= 21 ? 1.4 : age <= 26 ? 1.0 : age <= 30 ? 0.6 : age <= 33 ? 0.3 : 0.1),

  /** Tydzień treningowy: rozwój atrybutu z bloku, zmęczenie, ryzyko kontuzji (rozdz. 4) */
  train(r, block, intensity) {
    const B = DATA.BLOCKS[block], I = DATA.INTENSITY[intensity];
    const report = {};
    if (B.attr && r.injury === 0) {
      const room = Math.max(0, r.pot + 2 - r.a[B.attr]) / 10;
      const inc = 0.22 * I.growth * Game.ageCurve(r.age) * room * (0.7 + Math.random() * 0.6) * (r.club === Game.s.user ? Club.trainMul() : 1);
      r.growth[B.attr] = (r.growth[B.attr] || 0) + inc;
      if (B.extra) r.growth[B.extra] = (r.growth[B.extra] || 0) + inc * 0.3;
      // gdy uzbiera się pełny punkt, atrybut rośnie
      Object.keys(r.growth).forEach(k => {
        while (r.growth[k] >= 1 && r.a[k] < 20) { r.a[k]++; r.growth[k] -= 1; report[k] = (report[k] || 0) + 1; }
      });
      if (B.attr === 'mental') r.morale = R.clamp(r.morale + 3, 20, 100);
    }
    r.fatigue = R.clamp(r.fatigue + (B.load > 0 ? B.load * I.load : B.load), 0, 100);
    let injured = false;
    if (r.injury === 0 && B.load > 0 && r.fatigue > 60 && Math.random() < 0.025 * I.injury * (r.fatigue / 80)) {
      r.injury = R.int(1, 3); injured = true;
    }
    return { report, injured };
  },

  /* ---------- tydzień ---------- */
  /** Zamyka tydzień: mecze AI, treningi, finanse, regeneracja, rynek, kolejny tydzień */
  endWeek(userMatch) {
    const s = Game.s, me = s.user, w = s.week;
    const fx = Game.fixtures(w);
    const rep = { week: w, date: Game.dateStr(w), phase: Game.phaseName(w), matches: [], train: [], injuries: [] };
    fx.forEach(f => {
      let m;
      if ((f.h === me || f.a === me) && userMatch) m = userMatch;
      else {
        // kluby AI ustawiają skład co tydzień; skład gracza zostaje taki, jak go ustawił
        [f.h, f.a].forEach(id => { if (id !== me) Game.autoLineup(id); });
        m = Game.quickMatch(f.h, f.a, s.forecast);
      }
      Game.applyMatch(m, f);
      if (f.series) Game.recordLeg(f, m);
      rep.matches.push({ h: m.h, a: m.a, hs: m.hs, as: m.as, mine: f.h === me || f.a === me });
    });

    // treningi gracza (plan), AI trenuje „normalnie” w najsłabszym elemencie
    Object.values(s.riders).forEach(r => {
      const mine = r.club === me;
      const block = mine ? (s.training.plan[r.id] || Game.suggestBlock(r)) : Game.suggestBlock(r);
      const t = Game.train(r, block, mine ? s.training.intensity : 'normal');
      if (mine && Object.keys(t.report).length) rep.train.push({ name: r.name, up: t.report });
      if (mine && t.injured) rep.injuries.push(`${r.name}: uraz na treningu (${r.injury} tyg.)`);
      r.fatigue = R.clamp(r.fatigue - 16, 0, 100);
      if (r.injury > 0 && !t.injured) r.injury--;
      r.form *= 0.9;
    });

    // finanse tygodnia
    Club.weekly(rep);
    if (s.mode !== 'career') Talk.weekly();
    Game.tx('exp', 'Kontrakty (podpis)', Game.roster(me).reduce((a, r) => a + r.contract.sign, 0) / DATA.WEEKS_PAID);
    s.finance.history.push({ week: w, balance: s.finance.balance });

    rep.injuries.forEach(t => Game.news(t, 'bad'));
    s.lastReport = rep;
    s.week++;

    if (s.week === Game.REG_WEEKS) Game.startPlayoffs();
    if (s.week === 16) Game.startFinals();
    if (s.week === 18) Game.seasonEnd();
    Game.refreshMarket();
    Game.forecast();
    Game.autoLineupIfBroken();
    Game.save();
    return rep;
  },

  /** Jeśli kontuzja rozbiła skład gracza, asystent łata go automatycznie i zgłasza to w wiadomościach */
  autoLineupIfBroken() {
    const me = Game.s.user;
    if (Game.lineupErrors(me).length) { Game.autoLineup(me); Game.news('Asystent poprawił skład po kontuzjach. Sprawdź go przed meczem.', 'warn'); }
  },

  /* ---------- play-off ---------- */
  standings() {
    return Game.s.clubs.slice().sort((a, b) => (b.st.pts - a.st.pts) || ((b.st.sp - b.st.sa) - (a.st.sp - a.st.sa)) || (b.st.sp - a.st.sp));
  },
  startPlayoffs() {
    const t = Game.standings().map(c => c.id);
    Game.s.playoffs = { sf: [{ kind: 'sf', hi: t[0], lo: t[3], seedHi: 1, seedLo: 4, agg: {}, legs: [] }, { kind: 'sf', hi: t[1], lo: t[2], seedHi: 2, seedLo: 3, agg: {}, legs: [] }], fin: [], champion: null, third: null };
    const pos = t.indexOf(Game.s.user) + 1;
    Talk.playoffs(pos <= 4);
    Game.news(pos <= 4 ? `Koniec rundy zasadniczej: ${pos}. miejsce i półfinał play-off!` : `Koniec rundy zasadniczej: ${pos}. miejsce. Sezon się dla nas skończył.`, pos <= 4 ? 'good' : 'warn');
  },
  recordLeg(f, m) {
    const se = f.series;
    se.agg[m.h] = (se.agg[m.h] || 0) + m.hs;
    se.agg[m.a] = (se.agg[m.a] || 0) + m.as;
    se.legs.push({ h: m.h, a: m.a, hs: m.hs, as: m.as });
    if (se.legs.length === 2) {
      se.winner = (se.agg[se.hi] || 0) >= (se.agg[se.lo] || 0) ? se.hi : se.lo; // remis: wyżej rozstawiony
      se.loser = se.winner === se.hi ? se.lo : se.hi;
      if (se.kind === 'final') Game.s.playoffs.champion = se.winner;
      if (se.kind === 'bronze') Game.s.playoffs.third = se.winner;
    }
  },
  startFinals() {
    const P = Game.s.playoffs, [x, y] = P.sf;
    const seed = (id, se) => (id === se.hi ? se.seedHi : se.seedLo);
    const mk = (kind, p, ps, q, qs) => (ps < qs ? { kind, hi: p, lo: q, seedHi: ps, seedLo: qs, agg: {}, legs: [] } : { kind, hi: q, lo: p, seedHi: qs, seedLo: ps, agg: {}, legs: [] });
    P.fin = [mk('final', x.winner, seed(x.winner, x), y.winner, seed(y.winner, y)), mk('bronze', x.loser, seed(x.loser, x), y.loser, seed(y.loser, y))];
    const me = Game.s.user;
    if (P.fin[0].hi === me || P.fin[0].lo === me) Game.news('Jesteśmy w FINALE!', 'good');
    else if (P.fin[1].hi === me || P.fin[1].lo === me) Game.news('Półfinał przegrany. Walczymy o brąz.', 'warn');
  },

  seasonEnd() {
    const s = Game.s, P = s.playoffs, me = s.user;
    const place = P.champion === me ? 'Złoto' : P.fin[0].loser === me ? 'Srebro' : P.third === me ? 'Brąz' : P.fin[1].loser === me ? '4. miejsce' : `${Game.standings().findIndex(c => c.id === me) + 1}. miejsce`;
    s.seasonSummary = { place, champion: Game.club(P.champion).name };
    Game.news(`Koniec sezonu ${s.season}: ${place}. Mistrzem ${Game.club(P.champion).name}.`, P.champion === me ? 'good' : 'info');
    Club.seasonEnd();
    s.over = true;
  },

  /** Nowy sezon: wiek, KSM z wyników, kontrakty, nowy terminarz */
  newSeason() {
    const s = Game.s, me = s.user;
    s.season++; s.week = 0; s.results = {}; s.playoffs = null; s.over = false; s.seasonSummary = null;
    s.finance.season = { inc: {}, exp: {} };
    Object.values(s.riders).forEach(r => {
      if (r.season.m >= 3) r.ksm = Math.round(((r.season.pts + r.season.bonus) / r.season.m) * 100) / 100;
      r.season = { m: 0, heats: 0, pts: 0, bonus: 0 };
      r.age++;
      if (r.age >= 31) ['speed', 'start'].forEach(k => { if (Math.random() < 0.5) r.a[k] = Math.max(4, r.a[k] - 1); });
      r.contract.years--;
      r.fatigue = 10; r.injury = 0; r.form = 0;
      if (s.mode === 'career' && r.id === s.career.me) { r.contract.years = Math.max(1, r.contract.years); } // kontrakt gracza ustala okno transferowe
      else if (r.contract.years <= 0) {
        if (r.club === me) { Game.news(`${r.name} odchodzi: wygasł kontrakt.`, 'warn'); r.club = null; }
        else if (Math.random() < 0.7) Game.setContract(r, R.int(1, 3)); else r.club = null;
      }
      if (r.age >= 38) r.club = null;
    });
    Object.keys(s.riders).forEach(id => { if (!s.riders[id].club) delete s.riders[id]; });
    s.clubs.forEach(c => {
      c.st = Game.blankTable(); c.last = [];
      if (c.id === me && s.mode !== 'career') return;
      const r = Game.roster(c.id);
      while (r.filter(Game.isJunior).length < 2) r.push(Game.addRider(Game.genRider(c.base - 4, { club: c.id, age: R.int(16, 19), nat: 'POL' })));
      while (r.length < 8) r.push(Game.addRider(Game.genRider(c.base + R.int(-1, 1), { club: c.id })));
    });
    s.schedule = Game.makeSchedule(s.clubs.map(c => c.id));
    s.clubs.forEach(c => Game.autoLineup(c.id));
    Club.newSeason();
    Game.forecast();
    Game.news(`Sezon ${s.season} rusza. KSM zawodników przeliczone z wyników.`, 'info');
    if (Game.roster(me).filter(Game.isJunior).length < 2) Game.news('Brakuje juniorów! Szukaj ich na rynku.', 'bad');
    Game.save();
  },

  /* ---------- kontrakty i rynek ---------- */
  refreshMarket() {
    const s = Game.s;
    s.market = [];
    for (let i = 0; i < 8; i++) {
      const junior = i < 2;
      const r = Game.genRider(junior ? R.int(8, 11) : R.int(10, 15), { age: junior ? R.int(17, 20) : R.int(22, 35), nat: junior ? 'POL' : undefined });
      s.market.push(r);
    }
  },
  acceptChance(offer, demand, r) {
    const ratio = offer / demand;
    const c = ratio >= 1 ? 0.7 + (ratio - 1) * 1.4 : 0.7 - (1 - ratio) * 2.6;
    return R.clamp(c + (Game.s.popularity - 50) * 0.004 + (r.morale - 60) * 0.003, 0.03, 0.97);
  },
  sign(idx, offerSign, years) {
    const s = Game.s, r = s.market[idx];
    if (!r) return { ok: false, msg: 'Zawodnik zniknął z rynku.' };
    if (Game.roster(s.user).length >= DATA.ROSTER_MAX) return { ok: false, msg: `Kadra jest pełna (${DATA.ROSTER_MAX}).` };
    if (r.refused) return { ok: false, msg: `${r.name} nie chce już rozmawiać w tym tygodniu.` };
    const d = Game.demand(r);
    if (Math.random() > Game.acceptChance(offerSign, d.sign, r)) { r.refused = true; return { ok: false, msg: `${r.name} odrzucił ofertę.` }; }
    r.club = s.user; r.contract = { years, sign: Math.round(offerSign / 1000) * 1000, perPoint: d.perPoint };
    Game.addRider(r); s.market.splice(idx, 1);
    s.training.plan[r.id] = Game.suggestBlock(r);
    Game.news(`${r.name} podpisał kontrakt na ${years} ${years === 1 ? 'sezon' : 'sezony'}.`, 'good');
    return { ok: true, msg: `${r.name} w kadrze!` };
  },
  renew(id, offerSign, years) {
    const r = Game.s.riders[id], d = Game.demand(r);
    if (r.renewTried === Game.s.week) return { ok: false, msg: 'Wróćcie do rozmów za tydzień.' };
    r.renewTried = Game.s.week;
    if (Math.random() > Game.acceptChance(offerSign, d.sign * 1.05, r)) { r.morale = Math.max(20, r.morale - 4); return { ok: false, msg: `${r.name} odrzucił propozycję.` }; }
    r.contract = { years: r.contract.years + years, sign: Math.round(offerSign / 1000) * 1000, perPoint: d.perPoint };
    Game.news(`${r.name} przedłużył kontrakt o ${years} ${years === 1 ? 'sezon' : 'sezony'}.`, 'good');
    return { ok: true, msg: 'Kontrakt przedłużony.' };
  },
  release(id) {
    const r = Game.s.riders[id];
    const cost = Math.round(r.contract.sign * 0.5);
    Game.tx('exp', 'Odprawy', cost);
    r.club = null; delete Game.s.riders[id];
    Object.keys(Game.s.lineups).forEach(k => { Game.s.lineups[k] = Game.s.lineups[k].map(x => (x === id ? null : x)); });
    Game.news(`Rozwiązano kontrakt z ${r.name} (odprawa ${money(cost)}).`, 'warn');
    return { ok: true, msg: `${r.name} odchodzi.` };
  },
};
