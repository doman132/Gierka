/* =========================================================
   Speedway Empire 3D — start gry i pętla główna
   ========================================================= */
'use strict';

const Main = {
  last: 0,

  start() {
    const saved = Game.load();
    UI.show('mgr');
    const stars = b => '★'.repeat(Math.max(1, Math.round((b - 12) * 2.2))).padEnd(5, '☆');
    $('#mgr').innerHTML = `<div class="start"><div class="sheet">
      <h1>Speedway<br><span>Empire 3D</span></h1>
      <p>Wersja 2.6: prowadzisz klub przez sezony ${DATA.LEAGUE}. Każdy klub ma własny stadion i tor. Skład w limicie KSM, treningi, kontrakty, rozbudowa stadionu, sponsorzy, szkółka, spacer po stadionie, rozmowy w szatni i trudne decyzje — a w meczu możesz sam poprowadzić motocykl.</p>
      <div class="box"><h3>Wybierz klub</h3><div class="clubs">${DATA.CLUBS.map(([name, short, kev, , base, cap], i) => `
        <button class="clubpick" data-start="${i}" style="--c:${kev}"><b>${esc(name)}</b><small>${stars(base)} · stadion ${cap.toLocaleString('pl-PL')} miejsc</small></button>`).join('')}</div></div>
      <div class="box career-box"><h3>…albo kariera zawodnika</h3><p class="small muted">Jesteś 17-letnim juniorem. Trenujesz, urządzasz mieszkanie, chodzisz na imprezy, podejmujesz decyzje — i sam jedziesz swoje biegi.</p>
        <div class="row"><input id="c-first" placeholder="Imię" value="Kuba" maxlength="16"><input id="c-last" placeholder="Nazwisko" value="Nowak" maxlength="20">
        <select id="c-club">${DATA.CLUBS.map(([name], i) => `<option value="${i}">${esc(name)}</option>`).join('')}</select><button class="go" data-start="career">Zacznij karierę ▸</button></div></div>
      ${saved ? `<div class="actions"><button class="go" data-start="load">Kontynuuj zapis: ${saved.mode === 'career' ? 'kariera ' + esc(saved.riders[saved.career.me].name) + ', ' : ''}${esc(saved.clubs.find(c => c.id === saved.user).name)}, sezon ${saved.season}</button></div>` : ''}
      <p class="muted small">Wszystkie kluby i zawodnicy są fikcyjni. Postęp zapisuje się w tej przeglądarce.</p>
    </div></div>`;
  },

  begin(which) {
    if (which === 'load') { Game.s = Game.load(); Club.ensure(Game.s); }
    else if (which === 'career') Career.newGame(+$('#c-club').value, $('#c-first').value.trim(), $('#c-last').value.trim());
    else Game.newGame(+which);
    Game.save();
    UI.tab = 'pulpit';
    UI.show('mgr');
    UI.render();
  },

  loop(now) {
    requestAnimationFrame(Main.loop); // najpierw — błąd w klatce nie zatrzyma gry
    const dt = Math.min(0.05, (now - (Main.last || now)) / 1000);
    Main.last = now;
    if (!$('#md').hidden && World.renderer) {
      try {
        if (Walk.active) Walk.frame(dt); else if (RaceView.active) RaceView.frame(dt, now); else World.idle(dt);
        Humans.update(dt);
        World.render();
      } catch (e) { Main.err(e); }
    }
  },
  /** Pasek błędu na ekranie (zamiast cichego „nic się nie dzieje”) — do zgłoszenia */
  err(e) {
    const msg = (e && (e.stack || e.message)) || String(e);
    if (Main._lastErr === msg) return; Main._lastErr = msg;
    console.error(e);
    let bar = document.getElementById('errbar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'errbar'; document.body.appendChild(bar); bar.addEventListener('click', () => { bar.hidden = true; }); }
    bar.hidden = false;
    bar.textContent = 'Błąd gry (kliknij, aby zamknąć; zrób zrzut i wyślij): ' + msg.split('\n').slice(0, 3).join(' | ');
  },
};

document.addEventListener('click', e => {
  Sound.unlock(); // przeglądarka pozwala włączyć dźwięk dopiero po kliknięciu
  const st = e.target.closest('[data-start]');
  if (st) { Main.begin(st.dataset.start); return; }
  if (Walk.active) { if (!Walk.click(e) && e.target.closest('[data-ui]')) UI.click(e); return; }
  if (!$('#md').hidden) {
    if (RaceView.active && RaceView.click(e)) return;
    if (Practice.click(e)) return;
    MatchDay.click(e);
  } else UI.click(e);
});
document.addEventListener('change', e => UI.change(e));
document.addEventListener('input', e => { if (e.target.id === 'offer' || e.target.id === 'years') UI.updateOffer(); });
document.addEventListener('keydown', e => { if (!Walk.key(e, true)) RaceView.key(e, true); if (!Walk.active && !RaceView.active && e.code === 'KeyP' && Game.s && Game.s.mode === 'career' && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) City.phoneToggle(); });
document.addEventListener('keyup', e => { if (!Walk.key(e, false)) RaceView.key(e, false); });
document.addEventListener('mousedown', e => Walk.mouse(e, 'down'));
document.addEventListener('mouseup', e => Walk.mouse(e, 'up'));
document.addEventListener('mousemove', e => Walk.mouse(e, 'move'));
document.addEventListener('pointerlockchange', () => { const h = $('#walk-hud'); if (h) h.classList.toggle('locked', !!Walk.locked()); });
window.addEventListener('resize', () => { if (World.renderer) World.resize(); });
window.addEventListener('error', e => Main.err(e.error || e.message));
window.addEventListener('unhandledrejection', e => Main.err(e.reason));
window.addEventListener('load', () => { RaceView.bindTouch(); Main.start(); requestAnimationFrame(Main.loop); });
