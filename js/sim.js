/* =========================================================
   Speedway Empire 3D — rdzeń symulacji biegu
   Deterministyczny: ten sam seed + te same ustawienia = identyczny
   bieg (powtórki, transmisje online). Stały krok 1/60 s.
   Model: prędkość graniczna w łuku z przyczepności i promienia,
   koleiny przy krawężniku, luźna nawierzchnia na zewnątrz,
   start (reakcja + trakcja), blokowanie i mijanki, upadki, defekty.
   Nie zależy od Three.js — to samo działa na serwerze.
   Zawodnik z flagą human jest prowadzony przez gracza: st.input =
   { thr: 0|1 (gaz), steer: −1 do krawężnika … +1 na zewnątrz }.
   ========================================================= */
'use strict';

const Sim = {
  G: 9.81,
  DT: 1 / 60,
  LAPS: 4,
  TAPE_T: 1.2,              // taśma idzie w górę po 1,2 s
  BRAKE: 6.5,               // zamknięcie gazu przed łukiem [m/s²]
  GATE_D: [-4.5, -1.5, 1.5, 4.5],

  /** Generator liczb losowych z ziarnem (mulberry32) */
  rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /**
   * @param cfg {seed, riders:[{id,name,team,helmet,gate,a,setup:{gear,map,line}}],
   *             cond:{wet, wind, temp, prep, rut}}
   */
  create(cfg) {
    const r = Sim.rng(cfg.seed);
    const c = cfg.cond;
    const mu0 = DATA.PREP[c.prep].mu * (1 - 0.26 * c.wet) * (c.temp < 10 ? 0.96 : c.temp > 26 ? 0.98 : 1);
    const st = { t: 0, cfg, r, mu0, events: [], stopped: null, over: false, tapeUp: false, leaderLap: 0 };
    st.riders = cfg.riders.map(x => {
      const a = x.a, set = x.setup;
      // presja: słaba mentalność = większy rozrzut reakcji
      const react = Math.min(0.32, Math.max(0.07,
        0.165 - (a.start - 10) * 0.005 + (r() - 0.5) * (0.07 + (20 - a.mental) * 0.003) - (set.map === 'aggr' ? 0.004 : 0)));
      return {
        ...x, s: 0, d: Sim.GATE_D[x.gate], v: 0, moving: false, status: 'race',
        react, dTarget: Sim.GATE_D[x.gate],
        lapNoise: [0, 1, 2, 3, 4].map(() => 1 + (r() - 0.5) * 0.045 * (1.5 - a.mental / 20)),  // forma dnia
        defectAt: r() < 0.012 ? (0.3 + r() * 3.5) * Track.L : null,
        fallAt: null, bendSeen: 0, contact: 0,
        lean: 0, slide: 0, acc: 0, finishT: null,
        tel: { react, afterBend1: null, laps: [], lastLapT: null, top: 0, bendV: 0, bendN: 0, wideN: 0, n: 0, overtakes: 0 },
      };
    });
    return st;
  },

  /** Przyczepność na danym przesunięciu: koleiny przy krawężniku, luźno na zewnątrz */
  mu(st, d) {
    const rut = st.cfg.cond.rut;
    let m = st.mu0;
    if (d < -2) m *= 1 - rut * 0.14 * Math.min(1, (-2 - d) / 3.5);
    if (d > 3) m *= 1 - 0.045 * (1 - rut);
    return m;
  },

  /** Prędkość graniczna w łuku dla zawodnika */
  bendLimit(st, x, s, d) {
    // szeroka linia: dłuższa droga, ale szybszy łuk (motocykl w uślizgu „jedzie” po większym promieniu)
    let v = 1.25 * Math.sqrt(Sim.G * Sim.mu(st, d) * Track.R) * Math.pow((Track.R + d) / Track.R, 0.55)
      * (1 + (x.a.bends - 10) * 0.008);
    const slippery = st.mu0 < 0.93;
    if (slippery) v *= x.setup.map === 'soft' ? 1.02 : 0.975;
    if (st.cfg.cond.wet > 0.3) v *= 1 + (x.a.wet - 10) * 0.006;
    return v;
  },

  straightTop(st, x, s) {
    const a = x.a;
    let v = 29.5 + (a.speed - 10) * 0.25 + DATA.GEARS[x.setup.gear].top + (x.setup.map === 'aggr' ? 0.3 : 0);
    // wiatr: z wiatrem na prostej startowej, pod wiatr na przeciwległej
    const f = Track.frame(s);
    v += st.cfg.cond.wind * 0.22 * f.tx;
    return v;
  },

  step(st) {
    const dt = Sim.DT, L = Track.L, total = Sim.LAPS * L;
    st.t += dt;
    if (!st.tapeUp && st.t >= Sim.TAPE_T) { st.tapeUp = true; st.events.push({ t: st.t, type: 'tape' }); }
    const racing = st.riders.filter(x => x.status === 'race');

    racing.forEach(x => {
      if (x.human) { Sim.humanStep(st, x, dt); return; }
      if (!st.tapeUp) return;
      if (!x.moving && st.t >= Sim.TAPE_T + x.react) x.moving = true;
      if (!x.moving) return;

      const prog = x.s / total;
      const lap = Math.min(4, Math.floor(x.s / L));
      const fatigue = 1 - Math.max(0, prog - 0.5) * (20 - x.a.stamina) * 0.004;
      const noise = x.lapNoise[lap];

      // prędkość docelowa: prosta albo najbliższy łuk w zasięgu hamowania
      let vt = Sim.straightTop(st, x, x.s) * fatigue * noise;
      for (let k = 0; k <= 30; k += 5) {
        const ss = x.s + k;
        if (Track.inBend(ss)) vt = Math.min(vt, Math.sqrt(Math.pow(Sim.bendLimit(st, x, ss, x.d) * fatigue * noise, 2) + 2 * Sim.BRAKE * k));
      }

      // przyspieszenie: rozruch spod taśmy zależy od przełożenia, mapy i trakcji
      let acc = 9.5 * (1 + (x.a.speed - 10) * 0.02) * Math.max(0.12, 1 - x.v / (vt + 0.1));
      if (x.s < 30) {
        const traction = x.setup.map === 'aggr' ? (st.mu0 > 1 ? 1.06 : 0.9) : 1;
        acc *= DATA.GEARS[x.setup.gear].start * traction * (1 + (x.a.start - 10) * 0.02);
      }
      acc *= Math.min(1.05, st.mu0);

      if (x.v < vt) x.v = Math.min(vt, x.v + acc * dt);
      else x.v = Math.max(vt, x.v - Sim.BRAKE * dt);
      x.acc = acc;

      // defekt: motocykl gaśnie, zawodnik zjeżdża na zewnątrz
      if (x.defectAt != null && x.s >= x.defectAt) {
        x.status = 'defect'; x.dTarget = 7.5;
        st.events.push({ t: st.t, type: 'defect', id: x.id });
      }
    });

    // blokowanie i mijanki: kto ma kogoś tuż przed sobą, szuka innej ścieżki
    const sorted = racing.slice().sort((p, q) => q.s - p.s);
    sorted.forEach(x => {
      if (!x.moving) return;
      if (x.human) {
        // gracz sam szuka drogi, ale nie przejedzie przez rywala
        const ahead = sorted.find(y => y !== x && y.s - x.s > 0 && y.s - x.s < 3 && Math.abs(y.d - x.d) < 1.2);
        if (ahead) x.v = Math.min(x.v, ahead.v + 0.3);
        return;
      }
      const base = DATA.LINES[x.setup.line].d;
      let target = base;
      const ahead = sorted.find(y => y !== x && y.s - x.s > 0 && y.s - x.s < 5.5 && Math.abs(y.d - x.d) < 1.7);
      if (ahead) {
        const penalty = ahead.setup.line === 'pair' && ahead.team !== x.team ? 0.6 : 0;
        x.v = Math.min(x.v, ahead.v + 0.35 - penalty);
        const out = ahead.d + 2.3, inn = ahead.d - 2.3;
        const preferOut = x.setup.line === 'wide' || inn < -5.3 || st.r() < 0.5;
        target = preferOut && out < 5.4 ? out : Math.max(-5.3, inn);
        if (Track.inBend(x.s) && ahead.s - x.s < 2.5) x.contact = 1.5;
      }
      // jazda parą: trzymaj się blisko partnera z drużyny
      if (x.setup.line === 'pair' && !ahead) {
        const mate = sorted.find(y => y !== x && y.team === x.team);
        if (mate && Math.abs(mate.s - x.s) < 12) target = mate.d + (mate.s > x.s ? 0.6 : -0.6);
      }
      // tuż po starcie każdy trzyma się swojego pola, dopiero przed łukiem szuka linii
      if (x.s < 40) target = Sim.GATE_D[x.gate] + (target - Sim.GATE_D[x.gate]) * (x.s / 40);
      x.dTarget = target;
    });

    // ruch boczny, znoszenie w łuku, odpychanie przy kontakcie
    st.riders.forEach(x => {
      if (x.status === 'fell' || !x.moving) return;
      if (x.status === 'defect') { x.v = Math.max(0, x.v - 5 * dt); }
      const inBend = Track.inBend(x.s);
      let lat = x.human ? ((st.input && st.input.steer) || 0) * 4.2 * dt : Math.max(-2.6 * dt, Math.min(2.6 * dt, x.dTarget - x.d));
      if (inBend && x.status === 'race') {
        const lim = Sim.bendLimit(st, x, x.s, x.d);
        if (x.v > lim * 0.97) lat += (x.v / lim - 0.97) * 7 * dt; // wynosi na zewnątrz
        x.slide = Math.min(1, x.slide + dt * 3);
        x.lean = Math.min(0.78, Math.atan((x.v * x.v) / ((Track.R + x.d) * Sim.G)) * 0.95);
      } else {
        x.slide = Math.max(0, x.slide - dt * 2.5);
        x.lean = Math.max(0, x.lean - dt * 1.6);
      }
      x.d = Math.max(-5.5, Math.min(x.status === 'defect' ? 8 : 5.6, x.d + lat));
      st.riders.forEach(y => {
        if (y === x || y.status !== 'race' || x.status !== 'race') return;
        if (Math.abs(y.s - x.s) < 2.2 && Math.abs(y.d - x.d) < 1.2) {
          const push = (1.2 - Math.abs(y.d - x.d)) * 0.5 * (x.d >= y.d ? 1 : -1);
          x.d += push * dt * 6;
        }
      });
      x.contact = Math.max(0, x.contact - dt);

      const prevS = x.s;
      // s mierzymy po linii środkowej: po zewnętrznej łuk jest dłuższy, po wewnętrznej krótszy
      x.s += x.v * dt * (inBend ? Track.R / (Track.R + x.d) : 1);

      if (x.status !== 'race') return;
      const tel = x.tel;
      tel.n++; tel.top = Math.max(tel.top, x.v);
      if (x.d > 1) tel.wideN++;
      if (inBend) { tel.bendV += x.v; tel.bendN++; }

      // wejście w nowy łuk: losowanie ryzyka upadku (deterministycznie)
      const bi = Track.bendIndex(x.s);
      if (bi && bi !== x.bendSeen && !x.human) {
        x.bendSeen = bi;
        const lim = Sim.bendLimit(st, x, x.s, x.d);
        const p = 0.0011 * (1 + (x.a.risk - 10) * 0.1) * (1 + st.cfg.cond.wet * 0.8)
          * (x.setup.map === 'aggr' ? 1.3 : 1) * (x.contact > 0 ? 2.5 : 1) * (x.v > lim * 1.01 ? 1.8 : 1);
        if (st.r() < p) x.fallAt = x.s + st.r() * Track.R * 2.5;
      }
      if (x.fallAt != null && x.s >= x.fallAt) {
        x.status = 'fell'; x.v = 0;
        st.stopped = { id: x.id, t: st.t };
        st.events.push({ t: st.t, type: 'fall', id: x.id });
      }

      // telemetria: pozycja po 1. łuku, czasy okrążeń
      if (prevS < Track.B1E && x.s >= Track.B1E) tel.afterBend1 = st.riders.filter(y => y.s >= Track.B1E).length;
      const lapNow = Math.floor(x.s / L), lapPrev = Math.floor(prevS / L);
      if (lapNow > lapPrev) {
        const tNow = st.t - Sim.TAPE_T;
        tel.laps.push(tNow - (tel.lastLapT ?? 0));
        tel.lastLapT = tNow;
        if (lapNow > st.leaderLap) { st.leaderLap = lapNow; st.events.push({ t: st.t, type: 'lap', lap: lapNow, id: x.id }); }
      }
      if (x.s >= total) {
        x.status = 'done';
        x.finishT = st.t - Sim.TAPE_T - (x.s - total) / Math.max(1, x.v);
        st.events.push({ t: st.t, type: 'finish', id: x.id });
      }
    });

    // mijanki do komentarza: porównanie co 0,5 s, żeby jazda łeb w łeb nie liczyła się jak wyprzedzenia
    const order = Sim.order(st);
    st.frame = (st.frame || 0) + 1;
    if (st.frame % 30 !== 0) { st.over = st.stopped || st.riders.every(x => x.status !== 'race') || st.t > Sim.TAPE_T + 100; return; }
    if (st.lastOrder && st.tapeUp && st.t > Sim.TAPE_T + 4) {
      order.forEach((x, i) => {
        const was = st.lastOrder.indexOf(x.id);
        if (was > i && x.status === 'race') {
          const passed = st.lastOrder[i];
          x.tel.overtakes++;
          st.events.push({ t: st.t, type: 'pass', id: x.id, over: passed, pos: i + 1 });
        }
      });
    }
    st.lastOrder = order.map(x => x.id);

    if (st.stopped || st.riders.every(x => x.status !== 'race') || st.t > Sim.TAPE_T + 100) st.over = true;
  },

  /**
   * Motocykl prowadzony przez gracza: start na taśmie, gaz, łuk bez automatycznego hamowania.
   * Za szybko w łuku = wynosi na zewnątrz i traci prędkość; zbyt długo za szybko = upadek.
   */
  humanStep(st, x, dt) {
    const inp = st.input || { thr: 0, steer: 0 };
    if (!st.tapeUp) {
      if (inp.thr && !x.falseStart) { x.falseStart = true; st.events.push({ t: st.t, type: 'tapeTouch', id: x.id }); }
      return;
    }
    if (!x.moving) {
      if (inp.thr && st.t >= Sim.TAPE_T + (x.falseStart ? 0.4 : 0)) { x.moving = true; x.tel.react = st.t - Sim.TAPE_T; }
      else return;
    }
    const total = Sim.LAPS * Track.L;
    const fatigue = 1 - Math.max(0, x.s / total - 0.5) * (20 - x.a.stamina) * 0.004;
    const top = Sim.straightTop(st, x, x.s) * fatigue;
    const inBend = Track.inBend(x.s);
    const lim = Sim.bendLimit(st, x, x.s, x.d) * fatigue;
    let acc = 0;
    if (inp.thr) {
      acc = 9.5 * (1 + (x.a.speed - 10) * 0.02) * Math.max(0.12, 1 - x.v / (top + 0.1));
      if (x.s < 30) acc *= DATA.GEARS[x.setup.gear].start * (x.setup.map === 'aggr' ? (st.mu0 > 1 ? 1.06 : 0.9) : 1) * (1 + (x.a.start - 10) * 0.02);
      acc *= Math.min(1.05, st.mu0) * (inp.pow || 1); // kariera: zmęczony zawodnik ma słabszy „gaz”
      x.v = Math.min(top, x.v + acc * dt);
    } else x.v = Math.max(0, x.v - Sim.BRAKE * 0.75 * dt);
    x.acc = acc;
    // łuk: nadmiar prędkości „ściera się” w uślizgu; długi nadmiar kończy się upadkiem
    if (inBend && x.v > lim) {
      x.v -= (x.v - lim) * 1.1 * dt;
      x.over = (x.over || 0) + (x.v > lim * 1.07 ? dt : 0);
    } else x.over = Math.max(0, (x.over || 0) - dt * 2);
    // wskaźnik przyczepności dla HUD: teraz albo na najbliższym łuku
    let ahead = lim;
    if (!inBend) for (let k = 5; k <= 35; k += 5) if (Track.inBend(x.s + k)) { ahead = Math.sqrt(Math.pow(Sim.bendLimit(st, x, x.s + k, x.d) * fatigue, 2) + 2 * Sim.BRAKE * 0.75 * k); break; }
    x.grip = x.v / (inBend ? lim : ahead);
    // krawężnik i banda hamują
    if (x.d <= -5.45 && inp.steer < 0) x.v *= 1 - 0.9 * dt;
    if (x.d >= 5.55) { x.v *= 1 - 1.6 * dt; if (!x.fenceT || st.t - x.fenceT > 1.5) { x.fenceT = st.t; st.events.push({ t: st.t, type: 'fence', id: x.id }); } }
    if (x.over > 0.5 * (inp.hold || 1) && x.status === 'race') { // stres i zmęczenie: mniej czasu na opanowanie uślizgu
      x.status = 'fell'; x.v = 0;
      st.stopped = { id: x.id, t: st.t };
      st.events.push({ t: st.t, type: 'fall', id: x.id });
    }
  },

  /** Kolejność: ukończeni wg czasu, jadący wg dystansu, wykluczeni na końcu */
  order(st) {
    const rank = x => (x.status === 'done' ? 0 : x.status === 'race' ? 1 : 2);
    return st.riders.slice().sort((p, q) => rank(p) - rank(q) || (rank(p) === 0 ? p.finishT - q.finishT : q.s - p.s));
  },

  /** Wynik biegu: punkty 3-2-1-0 i bonusy za przyjazd tuż za partnerem */
  result(st) {
    const fin = Sim.order(st).filter(x => x.status === 'done');
    const pts = [3, 2, 1, 0];
    const res = {};
    st.riders.forEach(x => { res[x.id] = { pts: 0, bonus: 0, status: x.status, time: x.finishT }; });
    fin.forEach((x, i) => {
      res[x.id].pts = pts[i];
      if (i > 0 && fin[i - 1].team === x.team && pts[i] > 0) res[x.id].bonus = 1;
    });
    return res;
  },

  /** Bieg od razu do końca (bez grafiki) — do testów i powtórek */
  runToEnd(st) { while (!st.over) Sim.step(st); return st; },
};
