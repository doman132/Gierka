/* =========================================================
   Speedway Empire 3D — interfejs menedżera
   Układ jak w FM/OOTP: pasek boczny, górny pasek z datą
   i „Kontynuuj”, zakładki. Kliknięcia: data-ui="akcja".
   ========================================================= */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const UI = {
  tab: 'pulpit',
  TABS: [['pulpit', 'Pulpit'], ['kadra', 'Kadra'], ['sklad', 'Skład meczowy'], ['trening', 'Treningi'], ['tor', 'Tor treningowy'], ['transfery', 'Transfery'], ['liga', 'Liga'], ['finanse', 'Finanse'], ['stadion', 'Stadion'], ['sponsorzy', 'Sponsorzy'], ['akademia', 'Szkółka']],

  show(which) {
    $('#mgr').hidden = which !== 'mgr';
    $('#md').hidden = which !== 'md';
  },

  modal(html) { $('#modal').innerHTML = `<div class="veil" data-ui="closeBg"><div class="sheet dialog">${html}</div></div>`; },
  close() { $('#modal').innerHTML = ''; },
  toast(msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3800); },
  done(res) { UI.toast(res.msg, !res.ok); Game.save(); UI.render(); },

  helmet: c => `<i class="helmet" style="background:${c}"></i>`,
  bar(v, max = 20, cls = '') { return `<span class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span>`; },
  attrCell(v) { const c = v >= 16 ? 'a-hi' : v >= 12 ? 'a-mid' : v >= 8 ? 'a-lo' : 'a-bad'; return `<td class="${c} t-c">${v}</td>`; },
  stars(r) { const n = Math.round((r.pot - 8) / 2.4); return '★'.repeat(Math.max(1, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - Math.max(1, Math.min(5, n)))); },
  clubTag(id) { const c = Game.club(id); return `<span class="ctag" style="--c:${c.kevlar}">${esc(c.short)}</span>`; },

  /** Herb klubu: tarcza w barwach z paskiem i skrótem */
  crest(c, size = 34) {
    return `<svg class="crest" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true">
      <path d="M20 2 L37 8 V24 C37 35 29 41 20 44 C11 41 3 35 3 24 V8 Z" fill="${c.kevlar}" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
      <path d="M3 17 H37 V24 H3 Z" fill="${c.trim}" opacity=".9"/>
      <text x="20" y="35" text-anchor="middle" font-family="Saira Stencil One, Impact, sans-serif" font-size="11" fill="${c.trim}">${esc(c.short)}</text></svg>`;
  },
  /** Kask zawodnika w barwach klubu (awatar); niebieska kropka = junior */
  avatar(r, size = 26) {
    const c = Game.club(r.club) || { kevlar: '#777', trim: '#ddd' };
    return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 20 C4 10 10 4 17 4 C25 4 29 10 29 17 V21 H4 Z" fill="${c.kevlar}" stroke="rgba(0,0,0,.5)"/>
      <path d="M12 5 C10 10 10 16 11 21" stroke="${c.trim}" stroke-width="3" fill="none"/>
      <path d="M17 13 H30 V19 H16 Z" fill="#111"/><path d="M3 21 H30 V24 H3 Z" fill="#222"/>
      ${Game.isJunior(r) ? '<circle cx="26" cy="7" r="4" fill="#5AA2E6"/>' : ''}</svg>`;
  },

  /* ---------- szkielet ---------- */
  render() {
    if (Game.s && Game.s.mode === 'career') return Career.render();
    setTimeout(() => { UI.lastTab = UI.tab; }, 0); // animacja wejścia tylko przy zmianie zakładki
    const s = Game.s, me = Game.club(s.user);
    const fx = Game.userFixture();
    const errs = Game.lineupErrors(s.user);
    const primary = s.over ? ['newSeason', 'Nowy sezon ▸'] : fx ? ['matchday', 'Dzień meczowy ▸'] : ['continue', 'Kontynuuj ▸'];
    $('#mgr').innerHTML = `
      <nav class="side">
        <div class="brand">Speedway<b>Empire 3D</b></div>
        ${UI.TABS.map(([k, n]) => `<button class="nav ${UI.tab === k ? 'on' : ''}" data-ui="tab" data-v="${k}">${n}${k === 'sklad' && errs.length ? ' <span class="badge">!</span>' : ''}</button>`).join('')}
        <div class="side-foot"><button class="nav" data-ui="save">Zapisz grę</button><button class="nav" data-ui="newGameAsk">Nowa gra</button></div>
      </nav>
      <main class="main">
        <header class="top">
          <div class="club">${UI.crest(me, 30)}<div><b>${esc(me.name)}</b><small>${DATA.LEAGUE} · sezon ${s.season}</small></div></div>
          <div class="when"><b>${s.over ? 'Po sezonie' : Game.dateStr(s.week)}</b><small>${s.over ? esc(s.seasonSummary.place) : Game.phaseName(s.week)}</small></div>
          <div class="chip"><small>Saldo</small><b class="${s.finance.balance < 0 ? 'neg' : ''}">${money(s.finance.balance)}</b></div>
          <div class="chip"><small>Popularność</small><b>${Math.round(s.popularity)}</b></div>
          <button class="ghost walkbtn" data-ui="walk" title="Przejdź się po stadionie, parkingu i szatni">🚶 Stadion</button>
          <button class="go" data-ui="${primary[0]}">${primary[1]}</button>
        </header>
        <section class="view ${UI.lastTab !== UI.tab ? 'enter' : ''}">${UI.views[UI.tab]()}</section>
      </main>`;
  },

  /* ---------- widoki ---------- */
  views: {
    pulpit() {
      const s = Game.s, me = s.user, fx = Game.userFixture();
      const tbl = Game.standings();
      const roster = Game.roster(me);
      const alerts = [];
      roster.filter(r => r.injury).forEach(r => alerts.push(`${esc(r.name)}: kontuzja, ${r.injury} tyg.`));
      roster.filter(r => r.fatigue > 70).forEach(r => alerts.push(`${esc(r.name)}: zmęczenie ${Math.round(r.fatigue)}%, pomyśl o regeneracji`));
      roster.filter(r => r.contract.years <= 1).forEach(r => alerts.push(`${esc(r.name)}: kontrakt wygasa po sezonie`));
      Game.lineupErrors(me).forEach(e => alerts.push(`<b class="neg">Skład:</b> ${esc(e)}`));
      if (s.dilemma) alerts.unshift(`<b class="warn">Sprawa w klubie:</b> ${esc(Talk.D[s.dilemma.key].title)} <button class="ghost small" data-ui="dilemma">Rozstrzygnij</button>`);
      Club.alerts().forEach(a => alerts.push(esc(a)));
      const f = s.forecast;
      return `<div class="grid">
        <div class="card s8 match-card hero">
          ${fx ? `<div class="kicker">${Game.phaseName(s.week)} · ${Game.dateStr(s.week)} · ${fx.h === me ? 'u siebie' : 'na wyjeździe'}</div>
            <div class="vs">${UI.clubBig(fx.h)}<span>vs</span>${UI.clubBig(fx.a)}</div>
            <div class="fc">Prognoza: <b>${DATA.WEATHER[f.weather].name}</b> · ${f.temp}°C · wiatr ${f.wind} m/s · KSM składu <b>${num(Game.lineupKsm(s.lineups[me]))}</b> / ${DATA.KSM_LIMIT}</div>`
            : `<div class="kicker">${s.over ? 'Sezon zakończony' : Game.phaseName(s.week)}</div><div class="vs"><span>${s.over ? esc(s.seasonSummary.place) + ' · mistrz: ' + esc(s.seasonSummary.champion) : 'W tym tygodniu nie jedziemy'}</span></div>`}
        </div>
        <div class="card s4"><h3>Do zrobienia</h3>${alerts.length ? `<ul class="list">${alerts.map(a => `<li>${a}</li>`).join('')}</ul>` : '<p class="muted">Wszystko gotowe na mecz.</p>'}</div>
        <div class="card s6"><h3>Tabela</h3>${UI.table(tbl, true)}</div>
        <div class="card s6"><h3>Wiadomości</h3><ul class="list news">${s.news.slice(0, 8).map(n => `<li class="${n.type}">${esc(n.text)}</li>`).join('')}</ul></div>
      </div>`;
    },

    kadra() {
      const r = Game.roster(Game.s.user).sort((a, b) => Game.ovr(b) - Game.ovr(a));
      const view = UI.squadView || 'cards';
      const head = `<div class="head row between"><div><h2>Kadra</h2><p>${r.length}/${DATA.ROSTER_MAX} zawodników. Kliknij zawodnika, żeby zobaczyć licencję, kontrakt i plan treningu.</p></div>
        <div class="seg"><button class="${view === 'cards' ? 'on' : ''}" data-ui="squadView" data-v="cards">Karty</button><button class="${view === 'table' ? 'on' : ''}" data-ui="squadView" data-v="table">Tabela</button></div></div>`;
      if (view === 'cards') {
        const key = ['speed', 'start', 'bends', 'stamina'];
        return head + `<div class="rcards">${r.map(x => `<button class="rcard" data-ui="rider" data-v="${x.id}" style="--k:${Game.club(x.club).kevlar}">
          <div class="rc-top">${UI.avatar(x, 44)}<div><b>${esc(x.name)}</b><small>${x.age} lat · ${x.nat}${Game.isJunior(x) ? ' · U21' : ''}</small></div><div class="rc-ksm"><small>KSM</small>${num(x.ksm)}</div></div>
          <div class="rc-attrs">${key.map(k => `<div><span>${Game.ATTR_NAMES[k]}</span>${UI.bar(x.a[k])}<b>${x.a[k]}</b></div>`).join('')}</div>
          <div class="rc-foot"><span class="stars">${UI.stars(x)}</span><span>${x.form > 0.5 ? '▲ forma' : x.form < -0.5 ? '▼ forma' : '● forma'}</span>
            ${x.injury ? `<span class="pill bad">uraz ${x.injury} tyg.</span>` : x.fatigue > 70 ? '<span class="pill bad">zmęczony</span>' : ''}${x.contract.years <= 1 ? '<span class="pill">kontrakt kończy się</span>' : ''}</div></button>`).join('')}</div>`;
      }
      return head + `
        <div class="card tbl"><table><thead><tr><th>Zawodnik</th><th>Wiek</th><th class="t-c">KSM</th>${Game.ATTRS.map(k => `<th class="t-c" title="${Game.ATTR_NAMES[k]}">${Game.ATTR_NAMES[k].slice(0, 3)}</th>`).join('')}<th>Potencjał</th><th>Forma</th><th>Zmęcz.</th><th>Kontrakt</th><th class="t-r">Podpis</th><th class="t-r">Za pkt</th></tr></thead>
        <tbody>${r.map(x => `<tr><td>${UI.avatar(x)} <button class="link" data-ui="rider" data-v="${x.id}">${esc(x.name)}</button> <small class="muted">${x.nat}</small>${Game.isJunior(x) ? ' <span class="pill">U21</span>' : ''}${x.injury ? ` <span class="pill bad">uraz ${x.injury} tyg.</span>` : ''}</td>
          <td>${x.age}</td><td class="t-c"><b>${num(x.ksm)}</b></td>${Game.ATTRS.map(k => UI.attrCell(x.a[k])).join('')}
          <td class="stars">${UI.stars(x)}</td><td>${x.form > 0.5 ? '▲' : x.form < -0.5 ? '▼' : '●'} ${num(x.form, 1)}</td><td>${UI.bar(x.fatigue, 100, x.fatigue > 70 ? 'bad' : '')}</td>
          <td>${x.contract.years} ${x.contract.years === 1 ? 'sezon' : 'sez.'}</td><td class="t-r">${money(x.contract.sign)}</td><td class="t-r">${money(x.contract.perPoint)}</td></tr>`).join('')}</tbody></table></div>`;
    },

    sklad() {
      const s = Game.s, me = s.user, L = s.lineups[me];
      const roster = Game.roster(me).sort((a, b) => Game.ovr(b) - Game.ovr(a));
      const k = Game.lineupKsm(L), errs = Game.lineupErrors(me);
      const label = i => (i < 5 ? 'Senior' : i < 7 ? 'Junior U21' : 'Rezerwowy');
      return `<div class="head"><h2>Skład meczowy</h2><p>Numery 1–5 seniorzy, 6–7 juniorzy (do ${DATA.JUNIOR_AGE} lat), 8 rezerwowy. Suma KSM siódemki (1–7) nie może przekroczyć ${DATA.KSM_LIMIT}. Na mecz u siebie dostajecie numery 9–16.</p></div>
        <div class="grid"><div class="card s7">
          <div class="bibs">${L.map((id, i) => { const r = id && s.riders[id]; const c = Game.club(me);
            return `<div class="bib ${i >= 5 && i < 7 ? 'jr' : ''} ${i === 7 ? 'res' : ''}" style="--k:${c.kevlar};--t:${c.trim}">
              <div class="plastron"><span>${i + 1}</span></div>
              <div class="bib-info"><small>${label(i)}</small><b>${r ? esc(r.name) : '— wolne —'}</b>${r ? `<small>KSM ${num(r.ksm)} · forma ${num(r.form, 1)}</small>` : ''}</div>
              <select data-ui="slot" data-i="${i}" aria-label="Numer ${i + 1}"><option value="">— wolne —</option>${roster.filter(x => i < 5 || i === 7 || Game.isJunior(x)).map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''} ${x.injury ? 'disabled' : ''}>${esc(x.name)} · KSM ${num(x.ksm)}${x.injury ? ' (uraz)' : ''}</option>`).join('')}</select></div>`; }).join('')}</div>
          <div class="actions" style="margin-top:12px"><button class="ghost" data-ui="autoLineup">Ustaw automatycznie</button></div></div>
          <div class="card s5"><h3>Limit KSM</h3><div class="ksm ${k > DATA.KSM_LIMIT ? 'over' : ''}"><b>${num(k)}</b> / ${DATA.KSM_LIMIT}</div>${UI.bar(k, DATA.KSM_LIMIT, k > DATA.KSM_LIMIT ? 'bad' : 'acc')}
            ${errs.length ? `<ul class="list">${errs.map(e => `<li class="bad">${esc(e)}</li>`).join('')}</ul>` : '<p class="good">Skład zgodny z regulaminem.</p>'}
            <p class="muted small">KSM to średnia punktów na mecz z poprzedniego sezonu. Mocny zawodnik z niskim KSM to skarb: daje punkty, a mało „kosztuje” w limicie.</p></div></div>`;
    },

    trening() {
      const s = Game.s, T = s.training;
      const r = Game.roster(s.user).sort((a, b) => Game.ovr(b) - Game.ovr(a));
      const rep = s.lastReport;
      return `<div class="head"><h2>Treningi</h2><p>Każdy zawodnik ma blok na tydzień. Intensywność przyspiesza rozwój, ale podnosi zmęczenie i ryzyko urazu. Młodzi rosną najszybciej, a po 30. roku rozwój zwalnia.</p></div>
        <div class="card"><h3>Intensywność tygodnia</h3><div class="opts">${Object.entries(DATA.INTENSITY).map(([k, v]) => `<button class="opt ${T.intensity === k ? 'on' : ''}" data-ui="intensity" data-v="${k}">${v.name}<small>rozwój ×${num(v.growth, 2)} · urazy ×${num(v.injury, 1)}</small></button>`).join('')}</div></div>
        <div class="card tbl"><table><thead><tr><th>Zawodnik</th><th>Wiek</th><th>Blok treningowy</th><th>Zmęczenie</th><th>Rozwój (postęp do +1)</th></tr></thead><tbody>
          ${r.map(x => { const b = T.plan[x.id] || Game.suggestBlock(x), B = DATA.BLOCKS[b];
            return `<tr><td>${esc(x.name)}${x.injury ? ' <span class="pill bad">uraz</span>' : ''}</td><td>${x.age}</td>
            <td><select data-ui="block" data-v="${x.id}">${Object.entries(DATA.BLOCKS).map(([k, v]) => `<option value="${k}" ${k === b ? 'selected' : ''}>${v.name}${v.attr ? ` (${Game.ATTR_NAMES[v.attr]} ${x.a[v.attr]})` : ''}</option>`).join('')}</select></td>
            <td>${UI.bar(x.fatigue, 100, x.fatigue > 70 ? 'bad' : '')} ${Math.round(x.fatigue)}%</td>
            <td>${B.attr ? UI.bar((x.growth[B.attr] || 0) * 100, 100, 'acc') : '<span class="muted">odpoczynek</span>'}</td></tr>`; }).join('')}</tbody></table>
          <div class="actions"><button class="ghost" data-ui="suggestAll">Plan od asystenta</button></div></div>
        ${rep && rep.train.length ? `<div class="card"><h3>Ostatni tydzień</h3><ul class="list">${rep.train.map(t => `<li class="good">${esc(t.name)}: ${Object.entries(t.up).map(([k, v]) => `${Game.ATTR_NAMES[k]} +${v}`).join(', ')}</li>`).join('')}</ul></div>` : ''}`;
    },

    tor() {
      const s = Game.s, P = s.practice = s.practice || { rider: null, rivals: 3, weather: 'dry', prep: 'hard', best: [] };
      const roster = Game.roster(s.user).filter(r => r.injury === 0).sort((a, b) => Game.ovr(b) - Game.ovr(a));
      if (!P.rider || !roster.some(r => r.id === P.rider)) P.rider = roster[0] && roster[0].id;
      const opt = (k, v, label, sub) => `<button class="opt ${P[k] === v ? 'on' : ''}" data-ui="pr" data-k="${k}" data-v="${v}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
      return `<div class="head"><h2>Tor treningowy</h2><p>Sam prowadzisz motocykl, a trening nie wpływa na sezon. <b>W / ↑</b> gaz · <b>A / ←</b> do krawężnika · <b>D / →</b> na zewnątrz · na telefonie przyciski na ekranie. Ruszaj dopiero, gdy taśma pójdzie w górę. Przed łukiem zdejmij gaz, inaczej wyniesie cię na bandę albo upadniesz.</p></div>
        <div class="grid"><div class="card s8">
          <h3>Zawodnik</h3><div class="opts">${roster.map(r => `<button class="opt ${P.rider === r.id ? 'on' : ''}" data-ui="pr" data-k="rider" data-v="${r.id}">${UI.avatar(r, 20)} ${esc(r.name)}<small>start ${r.a.start} · prędkość ${r.a.speed} · łuki ${r.a.bends}</small></button>`).join('')}</div>
          <h3 style="margin-top:14px">Rywale</h3><div class="opts">${opt('rivals', 0, 'Sam na torze', 'nauka łuków')}${opt('rivals', 3, 'Trzech rywali', 'zawodnicy z innych klubów')}</div>
          <h3 style="margin-top:14px">Warunki</h3><div class="opts">${Object.entries(DATA.WEATHER).map(([k, w]) => opt('weather', k, w.name)).join('')}${Object.entries(DATA.PREP).map(([k, p]) => opt('prep', k, 'Tor ' + p.name.toLowerCase())).join('')}</div>
          <div class="actions" style="margin-top:16px"><button class="go" data-ui="prGo">Na tor ▸</button></div></div>
          <div class="card s4"><h3>Najlepsze czasy</h3>${P.best.length ? `<table><tbody>${P.best.map((b, i) => `<tr><td>${i + 1}.</td><td>${esc(b.name)}</td><td class="t-r"><b>${num(b.time)} s</b></td><td class="muted small">${esc(b.cond)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Jeszcze nikt nie przejechał biegu.</p>'}</div></div>`;
    },

    transfery() {
      const s = Game.s;
      return `<div class="head"><h2>Transfery</h2><p>Wolni zawodnicy (lista odświeża się co tydzień). Kontrakt żużlowy to kwota za podpis na sezon i stawka za każdy zdobyty punkt.</p></div>
        <div class="card tbl"><table><thead><tr><th>Zawodnik</th><th>Wiek</th><th class="t-c">KSM</th>${Game.ATTRS.map(k => `<th class="t-c">${Game.ATTR_NAMES[k].slice(0, 3)}</th>`).join('')}<th>Potencjał</th><th class="t-r">Żąda za podpis</th><th class="t-r">Za pkt</th><th></th></tr></thead>
        <tbody>${s.market.map((x, i) => { const d = Game.demand(x);
          return `<tr><td>${esc(x.name)} <small class="muted">${x.nat}</small>${Game.isJunior(x) ? ' <span class="pill">U21</span>' : ''}</td><td>${x.age}</td><td class="t-c"><b>${num(x.ksm)}</b></td>${Game.ATTRS.map(k => UI.attrCell(x.a[k])).join('')}
          <td class="stars">${UI.stars(x)}</td><td class="t-r">${money(d.sign)}</td><td class="t-r">${money(d.perPoint)}</td>
          <td>${x.refused ? '<span class="pill bad">odmówił</span>' : `<button class="ghost small" data-ui="signAsk" data-v="${i}">Negocjuj</button>`}</td></tr>`; }).join('')}</tbody></table></div>`;
    },

    liga() {
      const s = Game.s, P = s.playoffs;
      const res = Object.entries(s.results).sort((a, b) => b[0] - a[0]).slice(0, 3);
      const avgs = Object.values(s.riders).filter(r => r.season.heats >= 8 && r.club).sort((a, b) => (b.season.pts + b.season.bonus) / b.season.heats - (a.season.pts + a.season.bonus) / a.season.heats).slice(0, 15);
      const series = se => `<div class="series"><div>${UI.clubTag(se.hi)} ${se.agg[se.hi] ?? '–'}</div><div>${UI.clubTag(se.lo)} ${se.agg[se.lo] ?? '–'}</div><small class="muted">${se.kind === 'sf' ? 'półfinał' : se.kind === 'final' ? 'finał' : 'o brąz'}${se.legs.length ? ' · ' + se.legs.map(l => `${l.hs}:${l.as}`).join(', ') : ''}</small></div>`;
      return `<div class="head"><h2>${DATA.LEAGUE} ${s.season}</h2><p>Zwycięstwo 2 pkt, remis 1, punkt bonusowy za lepszy dwumecz. Czwórka najlepszych jedzie w play-off (dwumecze).</p></div>
        <div class="grid"><div class="card s7"><h3>Tabela</h3>${UI.table(Game.standings(), false)}</div>
          <div class="card s5"><h3>Ostatnie wyniki</h3>${res.length ? res.map(([w, list]) => `<div class="kicker">${Game.phaseName(+w)}</div>${list.map(m => `<div class="resrow">${UI.clubTag(m.h)} <b>${m.hs}:${m.as}</b> ${UI.clubTag(m.a)}</div>`).join('')}`).join('') : '<p class="muted">Jeszcze nie jeżdżono.</p>'}
            ${P ? `<h3 style="margin-top:14px">Play-off</h3>${P.sf.map(series).join('')}${P.fin.map(series).join('')}${P.champion ? `<p class="good">Mistrz: ${esc(Game.club(P.champion).name)}</p>` : ''}` : ''}</div>
          <div class="card s12 tbl"><h3>Ranking średnich biegowych</h3><table><thead><tr><th>#</th><th>Zawodnik</th><th>Klub</th><th class="t-r">Mecze</th><th class="t-r">Biegi</th><th class="t-r">Pkt+bon.</th><th class="t-r">Średnia</th></tr></thead>
            <tbody>${avgs.map((r, i) => `<tr class="${r.club === s.user ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${UI.clubTag(r.club)}</td><td class="t-r">${r.season.m}</td><td class="t-r">${r.season.heats}</td><td class="t-r">${r.season.pts}+${r.season.bonus}</td><td class="t-r"><b>${num((r.season.pts + r.season.bonus) / r.season.heats, 3)}</b></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Ranking po kilku rundach.</td></tr>'}</tbody></table></div></div>`;
    },

    stadion() { return Club.viewStadion(); },
    sponsorzy() { return Club.viewSponsorzy(); },
    akademia() { return Club.viewAkademia(); },

    finanse() {
      const F = Game.s.finance;
      const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
      const rows = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="t-r">${money(v)}</td></tr>`).join('') || '<tr><td class="muted">brak</td></tr>';
      const h = F.history.slice(-18), max = Math.max(1, ...h.map(x => Math.abs(x.balance)));
      return `<div class="head"><h2>Finanse</h2><p>Sponsorzy i prawa TV wpływają co tydzień, obiekty kosztują utrzymanie, kwoty za podpis są rozłożone na ${DATA.WEEKS_PAID} tygodni sezonu, premie za punkty po każdym meczu.</p></div>
        <div class="grid"><div class="card s4"><h3>Saldo</h3><div class="big ${F.balance < 0 ? 'neg' : ''}">${money(F.balance)}</div>
          <div class="spark">${h.map(x => `<i style="height:${Math.max(3, Math.abs(x.balance) / max * 100)}%" class="${x.balance < 0 ? 'neg' : ''}" title="${money(x.balance)}"></i>`).join('')}</div></div>
          <div class="card s4 tbl"><h3>Przychody sezonu · ${money(sum(F.season.inc))}</h3><table>${rows(F.season.inc)}</table></div>
          <div class="card s4 tbl"><h3>Wydatki sezonu · ${money(sum(F.season.exp))}</h3><table>${rows(F.season.exp)}</table></div></div>`;
    },
  },

  clubBig(id) { const c = Game.club(id); return `<div class="cb">${UI.crest(c, 54)}<b>${esc(c.short)}</b><small>${esc(c.name)}</small></div>`; },

  table(list, compact) {
    const me = Game.s.user;
    return `<div class="tbl"><table><thead><tr><th>#</th><th>Klub</th><th class="t-r">M</th><th class="t-r">Z</th><th class="t-r">R</th><th class="t-r">P</th>${compact ? '' : '<th class="t-r">Bon.</th><th class="t-r">Małe pkt</th>'}<th class="t-r">Pkt</th><th>Forma</th></tr></thead>
      <tbody>${list.map((c, i) => `<tr class="${c.id === me ? 'me' : ''} ${i < 4 ? 'po' : ''}"><td>${i + 1}</td><td>${UI.clubTag(c.id)} ${compact ? '' : esc(c.name)}</td><td class="t-r">${c.st.m}</td><td class="t-r">${c.st.w}</td><td class="t-r">${c.st.d}</td><td class="t-r">${c.st.l}</td>
        ${compact ? '' : `<td class="t-r">${c.st.bonus}</td><td class="t-r">${c.st.sp}:${c.st.sa}</td>`}<td class="t-r"><b>${c.st.pts}</b></td><td class="form">${c.last.map(x => `<i class="f${x}">${x}</i>`).join('')}</td></tr>`).join('')}</tbody></table></div>`;
  },

  /* ---------- modale ---------- */
  riderModal(id) {
    const r = Game.s.riders[id], T = Game.s.training;
    const S = r.season, avg = S.heats ? (S.pts + S.bonus) / S.heats : 0;
    const c = Game.club(r.club);
    UI.modal(`<div class="row between"><span class="kicker">Licencja zawodnika</span><button class="x" data-ui="close">×</button></div>
      <div class="licence" style="--k:${c.kevlar}">
        <div class="lic-photo">${UI.avatar(r, 86)}</div>
        <div><div class="lic-t">LICENCJA ŻUŻLOWA · ${esc(DATA.LEAGUE)} ${Game.s.season}</div><div class="lic-n">${esc(r.name)}</div>
          <div class="lic-d"><span>Wiek</span><b>${r.age} lat${Game.isJunior(r) ? ' (U21)' : ''}</b><span>Kraj</span><b>${r.nat}</b><span>Klub</span><b>${esc(c.name)}</b><span>Potencjał</span><b class="stars">${UI.stars(r)}</b></div></div>
        <div class="lic-stamp">KSM<b>${num(r.ksm)}</b></div>
      </div>
      <div class="attrs">${Game.ATTRS.map(k => `<div><span>${Game.ATTR_NAMES[k]}</span>${UI.bar(r.a[k])}<b>${r.a[k]}</b></div>`).join('')}</div>
      <div class="row2"><div class="card"><h3>Sezon</h3><p>${S.m} meczów · ${S.heats} biegów · ${S.pts}+${S.bonus} pkt · średnia <b>${num(avg, 3)}</b></p>
        <p>Forma ${num(r.form, 1)} · zmęczenie ${Math.round(r.fatigue)}% · morale ${Math.round(r.morale)} · popularność ${r.pop}</p></div>
        <div class="card"><h3>Kontrakt</h3><p>${r.contract.years} ${r.contract.years === 1 ? 'sezon' : 'sez.'} · ${money(r.contract.sign)} za podpis · ${money(r.contract.perPoint)} za punkt</p>
        <div class="actions">${r.club === Game.s.user ? `<button class="ghost small" data-ui="talkTo" data-v="${r.id}">Porozmawiaj</button>` : ''}<button class="ghost small" data-ui="renewAsk" data-v="${r.id}">Przedłuż</button><button class="ghost small bad" data-ui="releaseAsk" data-v="${r.id}">Zwolnij</button></div></div></div>
      <div class="card"><h3>Blok treningowy</h3><div class="opts">${Object.entries(DATA.BLOCKS).map(([k, v]) => `<button class="opt ${(T.plan[r.id] || Game.suggestBlock(r)) === k ? 'on' : ''}" data-ui="blockModal" data-id="${r.id}" data-v="${k}">${v.name}</button>`).join('')}</div></div>`);
  },

  offerModal(kind, key) {
    const r = kind === 'sign' ? Game.s.market[key] : Game.s.riders[key];
    const d = Game.demand(r), base = kind === 'renew' ? Math.round(d.sign * 1.05) : d.sign;
    UI.offer = { kind, key, base, r };
    UI.modal(`<div class="row between"><h2>${kind === 'sign' ? 'Negocjacje' : 'Przedłużenie'}: ${esc(r.name)}</h2><button class="x" data-ui="close">×</button></div>
      <p>KSM ${num(r.ksm)} · żąda <b>${money(base)}</b> za podpis na sezon i ${money(d.perPoint)} za punkt.</p>
      <div class="slider"><span>Twoja oferta</span><input type="range" id="offer" min="${Math.round(base * 0.6)}" max="${Math.round(base * 1.5)}" step="5000" value="${base}"><b id="offerV">${money(base)}</b></div>
      <div class="slider"><span>Sezony</span><input type="range" id="years" min="1" max="3" step="1" value="2"><b id="yearsV">2</b></div>
      <p>Szansa na zgodę: <b id="chance"></b></p>
      <div class="actions"><button class="go" data-ui="offerGo">Złóż ofertę</button><button class="ghost" data-ui="close">Anuluj</button></div>`);
    UI.updateOffer();
  },
  updateOffer() {
    const o = UI.offer; if (!o) return;
    const v = +$('#offer').value;
    $('#offerV').textContent = money(v); $('#yearsV').textContent = $('#years').value;
    const ch = Game.acceptChance(v, o.kind === 'renew' ? o.base : Game.demand(o.r).sign, o.r);
    $('#chance').textContent = Math.round(ch * 100) + '%';
  },

  weekReport(rep) {
    if (!rep) return;
    const s = Game.s;
    UI.modal(`<div class="row between"><h2>${rep.phase} · ${rep.date}</h2><button class="x" data-ui="close">×</button></div>
      <div class="card"><h3>Wyniki</h3>${rep.matches.map(m => `<div class="resrow ${m.mine ? 'me' : ''}">${UI.clubTag(m.h)} <b>${m.hs}:${m.as}</b> ${UI.clubTag(m.a)}</div>`).join('') || '<p class="muted">Bez meczów.</p>'}</div>
      ${rep.train.length ? `<div class="card"><h3>Postępy na treningach</h3><ul class="list">${rep.train.map(t => `<li class="good">${esc(t.name)}: ${Object.entries(t.up).map(([k, v]) => `${Game.ATTR_NAMES[k]} +${v}`).join(', ')}</li>`).join('')}</ul></div>` : ''}
      ${rep.built ? `<div class="card"><h3>Inwestycje</h3><p class="good">Oddano do użytku: ${esc(rep.built)}.</p></div>` : ''}
      ${rep.injuries.length ? `<div class="card"><h3>Urazy</h3><ul class="list">${rep.injuries.map(t => `<li class="bad">${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${s.over ? `<div class="card"><h3>Koniec sezonu</h3><p><b>${esc(s.seasonSummary.place)}</b>. Mistrz: ${esc(s.seasonSummary.champion)}.</p></div>` : ''}
      <div class="actions"><button class="go" data-ui="close">Dalej</button></div>`);
  },

  /* ---------- akcje ---------- */
  click(e) {
    const t = e.target.closest('[data-ui]');
    if (!t) return;
    const d = t.dataset, s = Game.s;
    if (s && s.mode === 'career' && Career.click(d)) return;
    if (Club.click(d) || Talk.click(d)) return;
    if (d.ui === 'walk') { Walk.start(); return; }
    switch (d.ui) {
      case 'closeBg': if (e.target === t) UI.close(); return;
      case 'close': UI.close(); return;
      case 'tab': UI.tab = d.v; UI.render(); return;
      case 'squadView': UI.squadView = d.v; UI.render(); return;
      case 'save': UI.toast(Game.save() ? 'Gra zapisana.' : 'Nie udało się zapisać.'); return;
      case 'newGameAsk': UI.modal(`<h2>Nowa gra?</h2><p>Obecny zapis zostanie usunięty.</p><div class="actions"><button class="go" data-ui="newGame">Tak, od nowa</button><button class="ghost" data-ui="close">Anuluj</button></div>`); return;
      case 'newGame': Game.wipe(); UI.close(); Main.start(); return;
      case 'continue': UI.weekReport(Game.endWeek(null)); UI.render(); return;
      case 'pr': { const P = s.practice; P[d.k] = d.k === 'rivals' ? +d.v : d.v; UI.render(); return; }
      case 'prGo': Practice.start(); return;
      case 'newSeason': Game.newSeason(); UI.render(); UI.toast(`Sezon ${s.season} rusza!`); return;
      case 'matchday': {
        const errs = Game.lineupErrors(s.user);
        if (errs.length) { UI.toast(errs[0], true); UI.tab = 'sklad'; UI.render(); return; }
        MatchDay.begin(Game.userFixture()); return;
      }
      case 'autoLineup': Game.autoLineup(s.user); Game.save(); UI.render(); return;
      case 'intensity': s.training.intensity = d.v; Game.save(); UI.render(); return;
      case 'suggestAll': Game.roster(s.user).forEach(r => { s.training.plan[r.id] = Game.suggestBlock(r); }); Game.save(); UI.render(); return;
      case 'rider': UI.riderModal(d.v); return;
      case 'blockModal': s.training.plan[d.id] = d.v; Game.save(); UI.riderModal(d.id); UI.render(); return;
      case 'signAsk': UI.offerModal('sign', +d.v); return;
      case 'renewAsk': UI.offerModal('renew', d.v); return;
      case 'offerGo': {
        const o = UI.offer, v = +$('#offer').value, y = +$('#years').value;
        const res = o.kind === 'sign' ? Game.sign(o.key, v, y) : Game.renew(o.key, v, y);
        UI.close(); UI.done(res); return;
      }
      case 'releaseAsk': { const r = s.riders[d.v]; UI.modal(`<h2>Zwolnić ${esc(r.name)}?</h2><p>Odprawa: ${money(Math.round(r.contract.sign * 0.5))}.</p><div class="actions"><button class="go" data-ui="release" data-v="${r.id}">Zwolnij</button><button class="ghost" data-ui="close">Anuluj</button></div>`); return; }
      case 'release': UI.close(); UI.done(Game.release(d.v)); return;
    }
  },

  change(e) {
    const t = e.target, d = t.dataset, s = Game.s;
    if (d.ui === 'slot') {
      const L = s.lineups[s.user], i = +d.i, id = t.value || null;
      const prev = L.indexOf(id);
      if (id && prev >= 0) L[prev] = L[i];
      L[i] = id;
      Game.save(); UI.render();
    }
    if (d.ui === 'block') { s.training.plan[d.v] = t.value; Game.save(); UI.render(); }
  },
};

/* ---------- Tor treningowy: jazda gracza poza sezonem ---------- */
const Practice = {
  start() {
    const s = Game.s, P = s.practice, me = s.riders[P.rider];
    if (!me) return;
    const club = Game.club(s.user);
    UI.show('md');
    World.enterVenue(s.user); World.setVenue(club.name, club.kevlar, club.trim, club.short); World.setFlagColors(club.kevlar, club.trim); World.setTeams(club, null); World.clearMarks();
    World.setStadium({ fill: 0.12, lights: Club.lvl('lights'), boards: (s.club && s.club.sponsors) || [] }); // trening: garstka kibiców
    World.setScreen(['TRENING', me.name, DATA.WEATHER[P.weather].name + ' · tor ' + DATA.PREP[P.prep].name.toLowerCase()]);
    const cond = { weather: P.weather, wet: DATA.WEATHER[P.weather].wet, wind: 2, temp: 16, prep: P.prep, rut: 0.1 };
    const riders = [{ id: me.id, name: me.name, team: 'h', helmet: DATA.HELMETS.h[0], gate: 0, a: Game.eff(me), no: 1, kevlar: club.kevlar, trim: club.trim, human: true, setup: MatchDay.recommendFor(me, cond).setup }];
    if (P.rivals) {
      const others = Object.values(s.riders).filter(r => r.club && r.club !== s.user && r.injury === 0).sort(() => Math.random() - 0.5).slice(0, 3);
      const helm = [DATA.HELMETS.a[0], DATA.HELMETS.h[1], DATA.HELMETS.a[1]];
      others.forEach((r, i) => { const c = Game.club(r.club); riders.push({ id: r.id, name: r.name, team: 'a', helmet: helm[i], gate: i + 1, a: Game.eff(r), no: i + 2, kevlar: c.kevlar, trim: c.trim, setup: MatchDay.recommendFor(r, cond).setup }); });
    }
    RaceView.start({ seed: Math.floor(Math.random() * 1e9), riders, cond }, {
      human: me.id, myTeam: 'h', title: 'Tor treningowy', scoreHtml: () => '<span class="team">TRENING</span>',
      onDone: st => Practice.result(st),
    });
  },

  result(st) {
    const s = Game.s, P = s.practice, me = st.riders.find(x => x.human);
    const pos = Sim.order(st).indexOf(me) + 1;
    let msg;
    if (me.status === 'done') {
      P.best.push({ name: me.name, time: me.finishT, cond: `${DATA.WEATHER[P.weather].name}, ${DATA.PREP[P.prep].name.toLowerCase()}` });
      P.best.sort((a, b) => a.time - b.time); P.best = P.best.slice(0, 8);
      msg = `<h1>${num(me.finishT)} s</h1><p>${P.rivals ? `${pos}. miejsce · ` : ''}reakcja na taśmę ${Math.round((me.tel.react || 0) * 1000)} ms${me.falseStart ? ' (dotknięcie taśmy)' : ''}</p>
        <div class="paper"><table><tbody>${me.tel.laps.map((l, i) => `<tr><td>Okrążenie ${i + 1}</td><td class="pen">${num(l)} s</td></tr>`).join('')}</tbody></table></div>`;
    } else if (me.status === 'fell') msg = '<h1>Upadek</h1><p>Za dużo gazu w łuku. Zdejmij gaz, zanim wskaźnik przyczepności zrobi się czerwony.</p>';
    else msg = '<h1>Koniec biegu</h1><p>Bieg przerwany.</p>';
    Game.save();
    if (s.mode === 'career' && City._riding) { const m = City.afterPractice(st); MatchDay.panel(`${msg}<p class="fx">${esc(m)}</p><div class="actions"><button class="go" data-pr="back">Wróć do miasta ▸</button></div>`); return; }
    MatchDay.panel(`${msg}<div class="actions"><button class="go" data-pr="again">Jeszcze raz ▸</button><button class="ghost" data-pr="back">Wróć do klubu</button></div>`);
  },

  click(e) {
    const t = e.target.closest('[data-pr]');
    if (!t) return false;
    if (t.dataset.pr === 'again') Practice.start();
    if (t.dataset.pr === 'back') { MatchDay.panel(''); World.setRiders([]); UI.show('mgr'); UI.render(); }
    return true;
  },
};
