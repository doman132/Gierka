/* =========================================================
   Speedway Empire 3D — widok wyścigu (mecz i tor treningowy)
   Prowadzi symulację biegu w czasie rzeczywistym, rysuje HUD,
   komentarz i kamery. Jeśli opts.human jest ustawiony, gracz
   sam prowadzi motocykl:
     W / ↑  — gaz      A / ←  — do krawężnika      D / →  — na zewnątrz
   Na telefonie: przyciski ◀ ▶ i GAZ na ekranie.
   ========================================================= */
'use strict';

const RaceView = {
  st: null, opts: null, active: false, running: false, paused: false, speed: 1, acc: 0,
  follow: null, evIdx: 0, hudAt: 0, keys: { thr: false, left: false, right: false }, touch: { thr: false, steer: 0 },

  start(cfg, opts) {
    RaceView.opts = opts;
    RaceView.st = Sim.create(cfg);
    RaceView.st.input = { thr: 0, steer: 0 };
    RaceView.evIdx = 0; RaceView.firstBend = false; RaceView.acc = 0;
    RaceView.active = true; RaceView.running = true; RaceView.paused = false;
    RaceView.speed = opts.human ? 1 : RaceView.speed;
    RaceView.follow = opts.human || cfg.riders.find(x => x.team === opts.myTeam)?.id || cfg.riders[0].id;
    World.setRiders(cfg.riders);
    World.setConditions(cfg.cond);
    Sound.startRace(cfg.riders);
    World.cam.mode = opts.human ? 'chase' : (World.cam.mode === 'chase' ? 'tv' : World.cam.mode);
    $('#md-panel').innerHTML = '';
    $('#md-hud').hidden = false;
    $('#ride-hud').hidden = !opts.human;
    if (opts.human) {
      const me = cfg.riders.find(x => x.id === opts.human);
      RaceView.say(`Prowadzisz: ${me.name}. Gaz dopiero, gdy taśma pójdzie w górę!`);
    } else RaceView.say(opts.title || 'Zawodnicy pod taśmą…');
  },

  stop() {
    Sound.stopRace();
    RaceView.active = false; RaceView.running = false; RaceView.st = null;
    $('#md-hud').hidden = true; $('#ride-hud').hidden = true;
  },

  input() {
    const k = RaceView.keys, t = RaceView.touch;
    return { thr: k.thr || t.thr ? 1 : 0, steer: (k.right ? 1 : 0) - (k.left ? 1 : 0) + t.steer };
  },

  frame(dt, now) {
    const st = RaceView.st;
    if (!st) return;
    if (RaceView.running && !RaceView.paused) {
      st.input = RaceView.input();
      RaceView.acc += dt * RaceView.speed;
      while (RaceView.acc >= Sim.DT && !st.over) {
        st.riders.forEach(x => { x.ps = x.s; x.pd = x.d; });
        Sim.step(st);
        // prędkość boczna z kroku symulacji (do kierunku motocykla) — nie z różnicy między klatkami ekranu
        st.riders.forEach(x => { x.vd = (x.d - x.pd) / Sim.DT; });
        RaceView.acc -= Sim.DT;
      }
      RaceView.events();
      if (st.over) {
        RaceView.running = false;
        const done = RaceView.opts.onDone;
        setTimeout(() => { const s2 = RaceView.st; RaceView.stop(); done(s2); }, st.stopped ? 1800 : 1300);
      }
    }
    const lead = Sim.order(st)[0];
    // płynny obraz: ekran odświeża się częściej niż symulacja (60 kroków/s), więc pozycje
    // do rysowania interpolujemy między dwoma ostatnimi krokami, a po narysowaniu przywracamy
    const a = RaceView.running && !st.over ? Math.min(1, RaceView.acc / Sim.DT) : 1, real = [];
    st.riders.forEach(x => {
      real.push([x.s, x.d]);
      if (x.ps != null && x.status !== 'fell' && Math.abs(x.s - x.ps) < 5) { x.s = x.ps + (x.s - x.ps) * a; x.d = x.pd + (x.d - x.pd) * a; }
    });
    World.sync(st, RaceView.paused ? 0 : dt * RaceView.speed, lead && lead.team === RaceView.opts.myTeam ? 1 : 0.25);
    World.updateCamera(st, dt, RaceView.follow);
    Sound.update(st, World.camera.position, lead && lead.team === RaceView.opts.myTeam ? 1 : 0.3);
    st.riders.forEach((x, i) => { x.s = real[i][0]; x.d = real[i][1]; });
    if (now - RaceView.hudAt > 110) { RaceView.hud(); RaceView.hudAt = now; }
    if (RaceView.opts.human) RaceView.rideHud();
  },

  /* ---------- komentarz ---------- */
  say(t) { const el = $('#md-ticker'); el.textContent = t; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); },

  events() {
    const st = RaceView.st, nm = id => st.riders.find(x => x.id === id).name.split(' ').slice(-1)[0];
    const me = RaceView.opts.human;
    while (RaceView.evIdx < st.events.length) {
      const e = st.events[RaceView.evIdx++];
      if (e.type === 'tape') { RaceView.say(me ? 'TAŚMA! Gaz!' : 'Taśma w górę!'); Sound.tape(); }
      if (e.type === 'tapeTouch') RaceView.say('Dotknięcie taśmy! Ruszysz z opóźnieniem.');
      if (e.type === 'fence' && e.id === me) RaceView.say('Banda! Za szeroko, tracisz prędkość.');
      if (e.type === 'pass') RaceView.say(`${nm(e.id)} mija ${nm(e.over)}! Teraz ${e.pos}. miejsce`);
      if (e.type === 'lap' && e.lap === 3) RaceView.say('Ostatnie okrążenie!');
      if (e.type === 'defect') RaceView.say(`Defekt! ${nm(e.id)} zjeżdża do parku maszyn`);
      if (e.type === 'fall') RaceView.say(e.id === me ? 'Upadek! Za dużo gazu w łuku. Czerwone światło.' : `Upadek! ${nm(e.id)} na torze. Czerwone światło!`);
      if (e.type === 'finish' && st.riders.filter(x => x.status === 'done').length === 1) {
        RaceView.say(`${nm(e.id)} wygrywa bieg!`);
        if (st.riders.find(x => x.id === e.id).team === RaceView.opts.myTeam) { World.celebrate(5); Sound.cheer(); } // race i wiwaty
      }
    }
    const lead = Sim.order(st)[0];
    if (!RaceView.firstBend && lead.s > Track.B1E) { RaceView.firstBend = true; RaceView.say(`Pierwszy w łuku: ${lead.name}`); }
  },

  /* ---------- HUD ---------- */
  hud() {
    const st = RaceView.st, o = RaceView.opts;
    const lead = Sim.order(st)[0];
    const lap = Math.min(4, Math.floor(lead.s / Track.L) + 1);
    $('#md-score').innerHTML = `${o.scoreHtml ? o.scoreHtml() : ''}<span class="meta">${esc(o.title || '')}<br>Okr. <b>${st.tapeUp ? lap : 0}/4</b> · ${num(Math.max(0, st.t - Sim.TAPE_T), 1)} s</span>`;
    $('#md-order').innerHTML = `<div class="head"><span>Kolejność</span><span>km/h</span></div>` + Sim.order(st).map((x, i) => {
      const gap = i === 0 ? Math.round(x.v * 3.6) : x.status === 'race' ? `+${num((lead.s - x.s) / Math.max(8, x.v), 1)} s` : x.status === 'done' ? '✓' : x.status === 'fell' ? 'u' : 'd';
      return `<div class="row ${x.team === o.myTeam ? 'me' : ''} ${RaceView.follow === x.id ? 'follow' : ''} ${x.status === 'fell' || x.status === 'defect' ? 'out' : ''}" data-follow="${x.id}">
        <span class="pos">${i + 1}</span><i class="helmet" style="background:${x.helmet}"></i><span class="nm">${esc(x.name.split(' ').slice(-1)[0])}${x.human ? ' (ty)' : ''}</span><span class="gap">${gap}</span></div>`;
    }).join('');
    $('#md-cams').innerHTML = Object.entries(World.CAMS).map(([k, n], i) => `<button data-cam="${k}" class="${World.cam.mode === k ? 'on' : ''}">${n}<kbd>${i + 1}</kbd></button>`).join('');
    const snd = `<button data-speed="snd" class="${Sound.on ? 'on' : ''}">Dźwięk ${Sound.on ? 'wł.' : 'wył.'}</button>`;
    $('#md-speeds').innerHTML = snd + (o.human ? `<button data-speed="p" class="${RaceView.paused ? 'on' : ''}">❚❚ Pauza</button>`
      : [['1', '×1'], ['2', '×2'], ['4', '×4'], ['p', '❚❚'], ['end', 'Do mety']].map(([k, n]) => `<button data-speed="${k}" class="${(+k === RaceView.speed && !RaceView.paused) || (k === 'p' && RaceView.paused) ? 'on' : ''}">${n}</button>`).join(''));
  },

  /** Zegary kierowcy: prędkość, przyczepność, okrążenie, pozycja */
  rideHud() {
    const st = RaceView.st, me = st.riders.find(x => x.id === RaceView.opts.human);
    if (!me) return;
    const pos = Sim.order(st).indexOf(me) + 1;
    const g = Math.min(1.25, me.grip || 0);
    const inBend = Track.inBend(me.s);
    const col = g < 0.9 ? '#3DBB7E' : g < 1.0 ? '#F2C230' : '#E4564F';
    $('#rh-speed').textContent = Math.round(me.v * 3.6);
    $('#rh-grip').style.width = Math.min(100, g / 1.25 * 100) + '%';
    $('#rh-grip').style.background = col;
    $('#rh-pos').textContent = me.status === 'done' ? `meta: ${pos}.` : `${pos}. / ${st.riders.length}`;
    $('#rh-lap').textContent = `okr. ${Math.min(4, Math.floor(me.s / Track.L) + 1)}/4`;
    let tip = '';
    if (!st.tapeUp) tip = 'Czekaj na taśmę…';
    else if (!me.moving) tip = 'GAZ!';
    else if (g >= 1.0) tip = inBend ? 'Za szybko! Odpuść gaz' : 'Zdejmij gaz przed łukiem!';
    else if (me.d > 4.8) tip = 'Blisko bandy';
    else if (inBend && g < 0.85) tip = 'Możesz dodać gazu';
    $('#rh-tip').textContent = tip;
    $('#rh-tip').className = g >= 1.0 ? 'bad' : '';
    $('#rh-thr').classList.toggle('on', !!RaceView.input().thr);
  },

  /* ---------- sterowanie ---------- */
  key(e, down) {
    if (!RaceView.active) return false;
    const k = e.key.toLowerCase();
    const map = { w: 'thr', arrowup: 'thr', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
    if (map[k] && RaceView.opts.human) { RaceView.keys[map[k]] = down; e.preventDefault(); return true; }
    if (!down) return false;
    const cams = Object.keys(World.CAMS);
    if (/^[1-7]$/.test(e.key)) { World.cam.mode = cams[+e.key - 1]; return true; }
    if (e.key === ' ' || k === 'p') { e.preventDefault(); RaceView.paused = !RaceView.paused; return true; }
    return false;
  },

  click(e) {
    const t = e.target.closest('[data-cam], [data-speed], [data-follow]');
    if (!t) return false;
    const d = t.dataset;
    if (d.cam) World.cam.mode = d.cam;
    if (d.follow && !RaceView.opts.human) RaceView.follow = d.follow;
    if (d.speed) {
      if (d.speed === 'snd') Sound.toggle();
      else if (d.speed === 'p') RaceView.paused = !RaceView.paused;
      else if (d.speed === 'end') { while (!RaceView.st.over) Sim.step(RaceView.st); }
      else { RaceView.speed = +d.speed; RaceView.paused = false; }
    }
    return true;
  },

  /** Przyciski dotykowe: przytrzymanie = gaz / skręt */
  bindTouch() {
    const hold = (id, on, off) => {
      const el = document.getElementById(id);
      const start = e => { e.preventDefault(); on(); el.classList.add('on'); };
      const end = e => { e.preventDefault(); off(); el.classList.remove('on'); };
      el.addEventListener('pointerdown', start); el.addEventListener('pointerup', end);
      el.addEventListener('pointerleave', end); el.addEventListener('pointercancel', end);
    };
    hold('rh-left', () => { RaceView.touch.steer = -1; }, () => { RaceView.touch.steer = 0; });
    hold('rh-right', () => { RaceView.touch.steer = 1; }, () => { RaceView.touch.steer = 0; });
    hold('rh-thr', () => { RaceView.touch.thr = true; }, () => { RaceView.touch.thr = false; });
  },
};
