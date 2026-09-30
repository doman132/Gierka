/* =========================================================
   Speedway Empire 3D — v2.1: szemrana robota FIZYCZNIE
   Odbierasz paczkę za garażami na osiedlu i musisz ją
   pieszo donieść do wskazanej osoby w mieście przed czasem.
   Patrole policji: blisko radiowozu albo policjanta grozi
   kontrola (szczególnie gdy biegniesz). Nie zdążysz albo
   zgubisz towar — masz dług u dilera.
   ========================================================= */
'use strict';

const Job = {
  WHO: [['„Łysy”', 'Male_Adult_14'], ['„Kudłaty”', 'Male_Adult_11'], ['Dziewczyna w kapturze', 'Female_Adult_12'], ['„Siwy”', 'Male_Adult_20'], ['Kierowca dostawczaka', 'Delivery_Male_01']],
  /** Losowy punkt na chodniku daleko od osiedla */
  target() {
    const M = Miasto, segs = M.segs(), from = (M.doors && M.doors.osiedle) || { x: 0, z: 80 };
    for (let i = 0; i < 60; i++) {
      const s = segs[Math.floor(Math.random() * segs.length)], t = 6 + Math.random() * (s.len - 12), dx = (s.b.x - s.a.x) / s.len, dz = (s.b.z - s.a.z) / s.len, sd = Math.random() < 0.5 ? -1 : 1, off = s.wd / 2 + 1.8;
      const x = s.a.x + dx * t - dz * off * sd, z = s.a.z + dz * t + dx * off * sd;
      if (Math.hypot(x - from.x, z - from.z) < 70 || M.inStadium(x, z, 4) || Math.abs(z - M.riverZ(x)) < 9) continue;
      return { x, z, street: s.name, yaw: Math.atan2(-dz * sd, dx * sd) };
    }
    return { x: 0, z: 0, street: 'centrum', yaw: 0 };
  },
  accept(k) {
    const C = Career.C(), Z = City.Z();
    if (C.job) { UI.toast('Najpierw dokończ poprzednią dostawę.', true); return; }
    if (!City.gate('deal')) return;
    const go = () => {
      const t = Job.target(), [who, key] = Crowd.pick(Job.WHO), pay = k === 'big' ? 3500 : 900;
      C.job = { k, pay, who, key, x: t.x, z: t.z, yaw: t.yaw, street: t.street, until: City.minOf(Z) + (k === 'big' ? 120 : 150), day: Z.day };
      C.dealHeat = Math.min(0.6, (C.dealHeat || 0) + (k === 'big' ? 0.09 : 0.05)); C.deals_n = (C.deals_n || 0) + 1;
      Z.stress += k === 'big' ? 8 : 4; City.clamp(Z); Game.save();
      UI.modal(`<div class="kicker">Paczka w plecaku</div><h2>Dostawa: ${esc(who)}</h2><p>Chudy wciska ci paczkę owiniętą taśmą: „${esc(t.street)}, przy chodniku. ${esc(who)} będzie czekał. Masz czas do <b>${City.timeStr(C.job.until)}</b>. I nie biegaj przy psiarni.”</p>
        <p class="small muted">Cel jest zaznaczony żółtym kółkiem na minimapie (M — duża mapa). Patrole policji chodzą po mieście — omijaj je szerokim łukiem.</p><div class="actions"><button class="go" data-ui="close">Idę</button></div>`);
      if (Walk.active && Walk.room === 'miasto') Job.spawn();
    };
    Miasto.build(go);
  },
  /** Odbiorca i policja w mieście */
  spawn() {
    const C = Career.C(), M = Miasto; if (!M.G || !Humans.ready) return;
    (Job._objs || []).forEach(o => o.parent && o.parent.remove(o)); Job._objs = [];
    Walk.spots = Walk.spots.filter(s => s.id !== 'w:job');
    if (C.job) {
      const m = Humans.make(C.job.key, 'nervous', {}); if (m) { m.position.set(C.job.x, 0, C.job.z); m.rotation.y = C.job.yaw; M.G.add(m); Job._objs.push(m); }
      Walk.spots.push({ id: 'w:job', x: M.CX + C.job.x, z: C.job.z, label: `📦 Oddaj paczkę: ${C.job.who}`, r: 2.4 });
    }
    // patrole: policjanci na stałych punktach (ruszają się w miejscu)
    if (!Job.cops) {
      Job.cops = [];
      const S = M.stadium(), pts = [[S.x + 16, S.z + M.SR.z + 8], [M.doors.park.x - 6, M.doors.park.z + 2], [M.doors.bar.x + 10, M.doors.bar.z], [M.doors.restauracja.x - 12, M.doors.restauracja.z], [M.doors.klub.x + 6, M.doors.klub.z + 4]];
      pts.forEach(([x, z]) => { const m = Humans.make(Humans.byRole('police'), 'idle', { sex: 'm' }); if (!m) return; m.position.set(x, 0, z); m.rotation.y = Math.random() * 6; M.G.add(m); Job.cops.push(m); });
    }
  },
  deliver() {
    const C = Career.C(), J = C.job, Z = City.Z(); if (!J) return;
    C.job = null; (Job._objs || []).forEach(o => o.parent && o.parent.remove(o)); Walk.spots = Walk.spots.filter(s => s.id !== 'w:job');
    // wtyka: czasem odbiorca to tajniak
    if (Math.random() < 0.04 + (C.dealHeat || 0) * 0.25) { UI.toast(`${J.who} wyciąga legitymację: „Policja. Jesteś zatrzymany.”`, true); City.arrest(J.k); return; }
    Career.pay(J.pay, 'Gotówka „za robotę”'); Z.stress += J.k === 'big' ? 10 : 5; City.clamp(Z); Game.save();
    UI.toast(`${J.who} bierze paczkę bez słowa. ${J.pay} zł w kieszeni… Stres rośnie.`);
  },
  fail(why) {
    const C = Career.C(), J = C.job; if (!J) return;
    C.job = null; (Job._objs || []).forEach(o => o.parent && o.parent.remove(o)); if (Walk.spots) Walk.spots = Walk.spots.filter(s => s.id !== 'w:job');
    C.dealDebt = (C.dealDebt || 0) + Math.round(J.pay * 0.8);
    City.sms('Chudy', `${why} Jesteś mi winien ${C.dealDebt} zł. Do niedzieli.`); UI.toast(`Dostawa przepadła: ${why}`, true); Game.save();
  },
  /** Co klatkę: termin, policja w pobliżu */
  tick(dt) {
    const C = Career.C(), J = C.job, Z = City.Z(); if (!J) return;
    if (Z.day !== J.day || City.minOf(Z) > J.until) { Job.fail('Nie zdążyłeś — odbiorca się zmył.'); return; }
    if (Walk.room !== 'miasto' || Job._stop) return;
    const M = Miasto, px = Walk.x - M.CX, pz = Walk.z, run = Walk.keys.ShiftLeft || Walk.keys.ShiftRight;
    const near = (Job.cops || []).some(c => Math.hypot(c.position.x - px, c.position.z - pz) < 12) || (M.traffic || []).some(c => c.police && Math.hypot(c.g.position.x - px, c.g.position.z - pz) < 12);
    if (!near) { Job._cool = 0; return; }
    Job._cool = (Job._cool || 0) + dt; if (Job._cool < 1) return; Job._cool = 0;
    if (Math.random() < (0.07 + (C.dealHeat || 0) * 0.25) * (run ? 2.2 : 1)) Job.stop();
    else if (!Job._warn) { Job._warn = true; UI.toast('Policjant przygląda ci się uważnie… Idź spokojnie.', true); setTimeout(() => { Job._warn = false; }, 8000); }
  },
  stop() {
    Job._stop = true; Walk.keys = {}; if (Walk.locked()) document.exitPointerLock();
    UI.modal(`<div class="kicker">🚨 Patrol</div><div class="dilemma scandal"><div class="dl-ico">👮</div><div><h2>„Dzień dobry, kontrola. Co w plecaku?”</h2><p>Dwóch policjantów zagradza ci drogę. Paczka ciąży w plecaku jak cegła.</p></div></div>
      <div class="talk-opts"><button class="opt" data-ui="cCop" data-v="calm">Zachowaj spokój, daj się przeszukać</button><button class="opt warn" data-ui="cCop" data-v="run">Rzuć plecak i uciekaj</button></div>`);
  },
  copAct(v) {
    const C = Career.C(), J = C.job; UI.close(); Job._stop = false; if (!J) return;
    if (v === 'calm') { if (Math.random() < 0.75) { C.job = null; City.arrest(J.k); } else UI.toast('Przeszukanie pobieżne — nic nie znaleźli. Masz szczęście.'); return; }
    if (Math.random() < 0.5) { Job.fail('Towar został na ulicy w plecaku.'); Career.C().dealHeat = Math.min(0.6, (C.dealHeat || 0) + 0.15); UI.toast('Uciekłeś bocznymi uliczkami. Ale towaru nie ma…', true); }
    else { C.job = null; C.jailExtra = 1; UI.toast('Dogonili cię po 200 metrach.', true); City.arrest(J.k); }
  },
};
(() => {
  // szemrana robota: przyjęcie zlecenia zamiast natychmiastowej kasy
  City.deal = function (k) { UI.close(); if (k === 'no') { Career.grow('mental', 0.1); UI.toast('Odchodzisz. Chudy wzrusza ramionami: „Twoja strata.”'); return; } Job.accept(k); };
  const bc = Career.click;
  Career.click = function (d) { if (d.ui === 'cCop') { Job.copAct(d.v); return true; } return bc.call(this, d); };
  const bra = Career.roomAct;
  Career.roomAct = function (id) { if (id === 'w:job') { Job.deliver(); return true; } return bra.call(this, id); };
  const be = Walk.enterRoom;
  Walk.enterRoom = function (key) { be.call(this, key); if (key === 'miasto') Job.spawn(); };
  const bt = Rooms.tick;
  Rooms.tick = function (dt) { bt.call(this, dt); try { Job.tick(dt); } catch (e) { console.warn(e); } };
  // termin sprawdzany też poza miastem
  const ba = City.advance;
  City.advance = function (min, quiet) { ba.call(this, min, quiet); const C = Career.C(), J = C && C.job, Z = City.Z(); if (J && (Z.day !== J.day || City.minOf(Z) > J.until)) Job.fail('Nie zdążyłeś — odbiorca się zmył.'); };
  // areszt: dodatkowy tydzień za ucieczkę
  const bar = City.arrest;
  City.arrest = function (k) { const C = Career.C(); bar.call(this, k); if (C.jailExtra) { C.jail += C.jailExtra; C.suspended += C.jailExtra; C.jailExtra = 0; } };
  // dług u dilera — rozliczenie po tygodniu
  const bf = Career.finishWeek;
  Career.finishWeek = function (um) {
    const C = Career.C(), res = bf.call(this, um);
    if (C.dealDebt > 0) {
      if (C.money >= C.dealDebt) { Career.pay(-C.dealDebt, 'Dług u Chudego'); if (C.report) C.report.lines.push(`Oddałeś dług Chudemu: ${C.dealDebt} zł.`); }
      else { const r = Career.me(); if (C.city) C.city.stress += 20; if (Math.random() < 0.5) { r.injury = Math.max(r.injury, R.int(1, 2)); if (C.report) C.report.lines.push('Ludzie Chudego „przypomnieli” o długu pod klatką. Stłuczone żebra — przerwa.'); } else if (C.report) C.report.lines.push('Chudy zabrał ci telefon i zegarek na poczet długu. Stres +20.'); }
      C.dealDebt = 0; Game.save();
    }
    return res;
  };
  // pasek na ekranie: paczka i cel
  const bf2 = Walk.frame;
  Walk.frame = function (dt) {
    bf2.call(this, dt);
    const C = Game.s && Game.s.mode === 'career' && Career.C(), el = document.getElementById('wh-clock'); if (!C || !el) return;
    if (C.job) { const d = Walk.room === 'miasto' ? Math.round(Math.hypot(C.job.x - (Walk.x - Miasto.CX), C.job.z - Walk.z)) : null; el.innerHTML += ` · <span class="job">📦 ${esc(C.job.who)}${d != null ? ` — ${d} m` : ''} · do ${City.timeStr(C.job.until)}</span>`; }
  };
})();
