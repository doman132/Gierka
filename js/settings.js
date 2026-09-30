/* =========================================================
   Speedway Empire 3D — USTAWIENIA
   Przycisk ⚙ (zawsze w prawym dolnym rogu) otwiera okno:
     • Dźwięk: wyciszenie, głośność ogólna, silniki, kibice
     • Grafika: jakość (niska / średnia / wysoka), cienie,
       poświata, rozdzielczość, pole widzenia, licznik FPS
     • Sterowanie: czułość i odwrócenie myszy, przypisanie
       klawiszy (chodzenie, akcja, telefon, mapa, gaz, skręt)
     • Rozgrywka: podpowiedzi w jeździe
   Zapis w przeglądarce (localStorage).
   ========================================================= */
'use strict';

const Settings = {
  KEY: 'se3d_settings',
  ACTIONS: {
    forward: { n: 'Chodzenie: do przodu', def: 'KeyW', canon: 'KeyW', key: 'w' },
    back: { n: 'Chodzenie: do tyłu', def: 'KeyS', canon: 'KeyS', key: 's' },
    left: { n: 'Chodzenie: w lewo', def: 'KeyA', canon: 'KeyA', key: 'a' },
    right: { n: 'Chodzenie: w prawo', def: 'KeyD', canon: 'KeyD', key: 'd' },
    sprint: { n: 'Bieg (przytrzymaj)', def: 'ShiftLeft', canon: 'ShiftLeft', key: 'shift' },
    action: { n: 'Akcja / rozmowa', def: 'KeyE', canon: 'KeyE', key: 'e' },
    phone: { n: 'Telefon (kariera)', def: 'KeyP', canon: 'KeyP', key: 'p' },
    map: { n: 'Duża mapa', def: 'KeyM', canon: 'KeyM', key: 'm' },
    thr: { n: 'Jazda: gaz', def: 'KeyW', canon: 'KeyW', key: 'w', ride: true },
    rleft: { n: 'Jazda: do krawężnika', def: 'KeyA', canon: 'KeyA', key: 'a', ride: true },
    rright: { n: 'Jazda: na zewnątrz', def: 'KeyD', canon: 'KeyD', key: 'd', ride: true },
  },
  d: null,
  defaults() {
    return { mute: false, vol: 0.7, eng: 1, crowd: 1, quality: 'high', shadows: true, bloom: true, res: 1, fov: 68, fps: false, sens: 1, invY: false, tips: true, keys: {} };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(Settings.KEY) || 'null'); } catch (e) { d = null; }
    Settings.d = Object.assign(Settings.defaults(), d || {});
    return Settings.d;
  },
  save() { try { localStorage.setItem(Settings.KEY, JSON.stringify(Settings.d)); } catch (e) { /* tryb prywatny */ } },
  code(act) { return Settings.d.keys[act] || Settings.ACTIONS[act].def; },
  name(code) { return (code || '').replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift P.').replace('ControlLeft', 'Ctrl').replace('Space', 'Spacja').replace('Arrow', ''); },

  /** Zdarzenie klawiatury → „kanoniczne” (domyślne) klawisze, żeby reszta gry nie musiała wiedzieć o zmianach */
  translate(e, ride) {
    const acts = Object.entries(Settings.ACTIONS).filter(([, a]) => !!a.ride === !!ride);
    const hit = acts.find(([k]) => Settings.code(k) === e.code);
    if (hit) { const a = hit[1]; return { code: a.canon, key: a.key, preventDefault: () => e.preventDefault(), target: e.target, orig: e }; }
    // domyślny klawisz przeniesiony na inny — blokujemy (strzałki zostają zawsze)
    if (acts.some(([k, a]) => a.def === e.code && Settings.code(k) !== a.def)) return null;
    return e;
  },

  /* ---------- zastosowanie ---------- */
  apply() {
    const d = Settings.d;
    // dźwięk
    Sound.on = !d.mute;
    if (Sound.master && Sound.ctx) Sound.master.gain.setTargetAtTime(d.mute ? 0 : d.vol, Sound.ctx.currentTime, 0.05);
    // grafika
    const R = World.renderer;
    if (R) {
      const pr = Math.min(2, window.devicePixelRatio || 1) * (d.quality === 'low' ? 0.6 : d.quality === 'mid' ? 0.85 : 1) * d.res;
      R.setPixelRatio(Math.max(0.4, pr));
      const sh = d.shadows && d.quality !== 'low';
      if (R.shadowMap.enabled !== sh) { R.shadowMap.enabled = sh; World.scene && World.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
      if (World.bloom) World.bloom.enabled = d.bloom && d.quality !== 'low';
      World.resize && World.resize();
    }
    if (window.Walk) { Walk.sens = d.sens; Walk.invY = d.invY; Walk.fov = d.fov; if (Walk.active && World.camera) { World.camera.fov = d.fov; World.camera.updateProjectionMatrix(); } }
    let f = document.getElementById('fpsbox');
    if (d.fps && !f) { f = document.createElement('div'); f.id = 'fpsbox'; document.body.appendChild(f); }
    if (!d.fps && f) f.remove();
    const tip = document.getElementById('rh-tip'); if (tip) tip.style.display = d.tips ? '' : 'none';
  },

  /* ---------- okno ---------- */
  open(tab) {
    Settings.tab = tab || Settings.tab || 'sound';
    let el = document.getElementById('settings');
    if (!el) { el = document.createElement('div'); el.id = 'settings'; document.body.appendChild(el); }
    if (window.Walk && Walk.locked && Walk.locked()) document.exitPointerLock();
    Settings.render();
  },
  close() { const el = document.getElementById('settings'); if (el) el.remove(); Settings.waiting = null; },
  render() {
    const el = document.getElementById('settings'); if (!el) return;
    const d = Settings.d, t = Settings.tab;
    const tabs = [['sound', '🔊 Dźwięk'], ['gfx', '🖥 Grafika'], ['ctrl', '🎮 Sterowanie'], ['game', '🏁 Rozgrywka']];
    const rng = (k, min, max, step, label, fmt) => `<label class="set-row"><span>${label}</span><input type="range" data-set="${k}" min="${min}" max="${max}" step="${step}" value="${d[k]}"><b>${fmt ? fmt(d[k]) : d[k]}</b></label>`;
    const chk = (k, label) => `<label class="set-row"><span>${label}</span><input type="checkbox" data-set="${k}" ${d[k] ? 'checked' : ''}><b></b></label>`;
    let body = '';
    if (t === 'sound') body = chk('mute', 'Wycisz dźwięk') + rng('vol', 0, 1, 0.05, 'Głośność ogólna', v => Math.round(v * 100) + '%') + rng('eng', 0, 1.5, 0.05, 'Silniki', v => Math.round(v * 100) + '%') + rng('crowd', 0, 1.5, 0.05, 'Kibice', v => Math.round(v * 100) + '%');
    if (t === 'gfx') body = `<label class="set-row"><span>Jakość grafiki</span><select data-set="quality">${[['low', 'Niska (słabszy komputer)'], ['mid', 'Średnia'], ['high', 'Wysoka']].map(([v, n]) => `<option value="${v}" ${d.quality === v ? 'selected' : ''}>${n}</option>`).join('')}</select><b></b></label>`
      + chk('shadows', 'Cienie') + chk('bloom', 'Poświata świateł (bloom)') + rng('res', 0.5, 1, 0.05, 'Rozdzielczość renderu', v => Math.round(v * 100) + '%') + rng('fov', 55, 90, 1, 'Pole widzenia (spacer)', v => v + '°') + chk('fps', 'Licznik klatek (FPS)');
    if (t === 'ctrl') body = rng('sens', 0.3, 2.5, 0.05, 'Czułość myszy', v => Math.round(v * 100) + '%') + chk('invY', 'Odwróć oś Y myszy')
      + `<h4>Klawisze</h4><div class="keys">${Object.entries(Settings.ACTIONS).map(([k, a]) => `<div class="set-row"><span>${a.n}</span><button class="keybtn ${Settings.waiting === k ? 'wait' : ''}" data-setkey="${k}">${Settings.waiting === k ? 'naciśnij klawisz…' : Settings.name(Settings.code(k))}</button><b></b></div>`).join('')}</div>
      <p class="muted small">Strzałki działają zawsze. Esc — wyjście, 1–7 — kamery w wyścigu, spacja — pauza.</p><button class="ghost small" data-setact="resetkeys">Przywróć domyślne klawisze</button>`;
    if (t === 'game') body = chk('tips', 'Podpowiedzi przy jeździe i samouczek kariery') + `<p class="muted small">Zapis gry: automatycznie po każdym tygodniu. Kariera: energia, jedzenie i stres wpływają na jazdę.</p>`;
    el.innerHTML = `<div class="set-bg" data-setact="close"></div><div class="set-win"><div class="row between"><h2>Ustawienia</h2><button class="x" data-setact="close">×</button></div>
      <div class="set-tabs">${tabs.map(([k, n]) => `<button class="${t === k ? 'on' : ''}" data-settab="${k}">${n}</button>`).join('')}</div><div class="set-body">${body}</div>
      <div class="actions"><button class="go" data-setact="close">Gotowe</button></div></div>`;
  },
};

/* ---------- podpięcie ---------- */
(() => {
  Settings.load();
  // przycisk ⚙ zawsze pod ręką
  const btn = document.createElement('button'); btn.id = 'setbtn'; btn.title = 'Ustawienia'; btn.textContent = '⚙'; document.body.appendChild(btn);
  // kliknięcia w oknie ustawień (poza zwykłym routingiem gry)
  document.addEventListener('click', e => {
    if (e.target.closest('#setbtn')) { e.stopPropagation(); Settings.open(); return; }
    const el = document.getElementById('settings'); if (!el || !el.contains(e.target)) return;
    e.stopPropagation();
    const t = e.target.closest('[data-settab],[data-setact],[data-setkey]'); if (!t) return;
    if (t.dataset.settab) { Settings.tab = t.dataset.settab; Settings.waiting = null; Settings.render(); }
    if (t.dataset.setact === 'close') Settings.close();
    if (t.dataset.setact === 'resetkeys') { Settings.d.keys = {}; Settings.save(); Settings.render(); }
    if (t.dataset.setkey) { Settings.waiting = t.dataset.setkey; Settings.render(); }
  }, true);
  const onInput = e => {
    const k = e.target.dataset && e.target.dataset.set; if (!k || !document.getElementById('settings')) return;
    e.stopPropagation();
    Settings.d[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value;
    Settings.save(); Settings.apply();
    if (e.type === 'change') Settings.render(); else { const b = e.target.parentNode.querySelector('b'); if (b && e.target.type === 'range') b.textContent = /vol|eng|crowd|res|sens/.test(k) ? Math.round(Settings.d[k] * 100) + '%' : k === 'fov' ? Settings.d[k] + '°' : Settings.d[k]; }
  };
  document.addEventListener('input', onInput, true); document.addEventListener('change', onInput, true);
  // przypisywanie klawiszy
  document.addEventListener('keydown', e => {
    if (!Settings.waiting) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code !== 'Escape') Settings.d.keys[Settings.waiting] = e.code;
    Settings.waiting = null; Settings.save(); Settings.render();
  }, true);

  // klawisze gry przez tłumaczenie
  const wk = Walk.key;
  Walk.key = function (e, down) { if (document.getElementById('settings')) return true; const t = Settings.translate(e, false); if (!t) return Walk.active; return wk.call(this, t, down); };
  const rk = RaceView.key;
  RaceView.key = function (e, down) { if (document.getElementById('settings')) return true; const t = Settings.translate(e, true); if (!t) return RaceView.active; return rk.call(this, t, down); };
  // dźwięk: głośność ogólna, silniki, kibice
  const su = Sound.unlock;
  Sound.unlock = function () { su.call(this); if (Sound.master && Sound.ctx) Sound.master.gain.value = Settings.d.mute ? 0 : Settings.d.vol; };
  Sound.toggle = function () { Settings.d.mute = !Settings.d.mute; Settings.save(); Settings.apply(); };
  const sup = Sound.update;
  Sound.update = function (st, cam, ex) {
    sup.call(this, st, cam, ex);
    if (!Sound.ctx) return;
    const now = Sound.ctx.currentTime;
    Object.values(Sound.engines).forEach(en => { if (en.g && Settings.d.eng !== 1) en.g.gain.setTargetAtTime(en.g.gain.value * Settings.d.eng, now, 0.08); });
    if (Sound.crowdGain) Sound.crowdGain.gain.setTargetAtTime((0.04 + ex * 0.1) * Settings.d.crowd, now, 0.4);
  };
  // pole widzenia w spacerze
  const ws = Walk.start, wr = Walk.startRoom;
  Walk.start = function (...a) { const r = ws.apply(this, a); World.camera.fov = Settings.d.fov; World.camera.updateProjectionMatrix(); return r; };
  Walk.startRoom = function (...a) { const r = wr.apply(this, a); World.camera.fov = Settings.d.fov; World.camera.updateProjectionMatrix(); return r; };
  // licznik FPS
  let n = 0, t0 = performance.now();
  const loop = () => { requestAnimationFrame(loop); n++; const t = performance.now(); if (t - t0 > 500) { const f = document.getElementById('fpsbox'); if (f) f.textContent = Math.round(n * 1000 / (t - t0)) + ' FPS'; n = 0; t0 = t; } };
  requestAnimationFrame(loop);
  // po starcie świata 3D zastosuj grafikę
  const wi = World.init;
  World.init = function (...a) { const r = wi.apply(this, a); Settings.apply(); return r; };
  setTimeout(() => Settings.apply(), 0);
})();
