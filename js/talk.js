/* =========================================================
   Speedway Empire 3D — rozmowy i wybory moralne
   • Rozmowy z zawodnikami (w szatni albo z karty zawodnika):
     raz w tygodniu z każdym; pochwała, wymagania, pytanie
     o samopoczucie, kontrakt, prośba o opiekę nad juniorem.
     Skutek zależy od sytuacji (wynik, forma, charakter).
   • Dylematy: co jakiś czas w klubie wybucha sprawa
     (paliwo „z dodatkiem”, propozycja ustawienia biegu,
     junior z bólem po upadku, impreza przed meczem, kibice
     po porażce, prasa, podwyżka lidera…). Decyzje mają
     natychmiastowe i odroczone skutki (ryzyko afery).
   ========================================================= */
'use strict';

const Talk = {
  /* ---------- pomocnicze ---------- */
  st() { const s = Game.s; s.talks = s.talks || {}; s.risks = s.risks || []; s.promises = s.promises || []; return s; },
  mor(r, d) { if (r) r.morale = R.clamp(r.morale + d, 20, 100); },
  pop(d) { Game.s.popularity = R.clamp(Game.s.popularity + d, 0, 100); },
  mine: () => Game.roster(Game.s.user).filter(r => r.injury === 0 || true),
  lastPts(r) {
    const res = Game.s.lastReport, me = Game.s.user;
    return res && r.season.m ? (r.season.pts + r.season.bonus) / r.season.m : null;
  },
  moodWord(m) { return m >= 80 ? 'świetny' : m >= 65 ? 'dobry' : m >= 50 ? 'taki sobie' : m >= 35 ? 'kiepski' : 'fatalny'; },

  /* ---------- rozmowy z zawodnikami ---------- */
  canTalk(r) { return Talk.st().talks[r.id] !== Game.s.week; },
  options(r) {
    const o = [['feel', 'Jak się czujesz przed kolejnym meczem?'], ['praise', 'Dobra robota. Widzę, jak pracujesz.'], ['demand', 'Oczekuję od ciebie więcej punktów.']];
    if (r.contract.years <= 1) o.push(['contract', 'Porozmawiajmy o nowym kontrakcie.']);
    if (!Game.isJunior(r) && Game.roster(Game.s.user).some(Game.isJunior)) o.push(['mentor', 'Weź pod opiekę naszych juniorów.']);
    if (Game.isJunior(r)) o.push(['dream', 'Gdzie chcesz być za trzy lata?']);
    return o;
  },

  /** Odpowiedź zawodnika i skutek; zwraca {say, fx} */
  answer(r, k) {
    const s = Talk.st(), avg = r.season.m ? (r.season.pts + r.season.bonus) / r.season.m : r.ksm, good = avg >= r.ksm * 0.95, calm = r.a.mental >= 12;
    s.talks[r.id] = s.week;
    let say, fx;
    switch (k) {
      case 'feel': {
        const bits = [];
        if (r.injury) bits.push(`noga jeszcze boli, lekarz mówi o ${r.injury} tyg.`);
        else if (r.fatigue > 65) bits.push('jestem wypompowany, przydałby się luźniejszy tydzień');
        else bits.push('fizycznie jest dobrze');
        bits.push(r.form > 0.8 ? 'motor jedzie jak marzenie' : r.form < -0.8 ? 'coś nie klei się z ustawieniami' : 'forma w porządku');
        say = `„${bits.join(', ')}.”`; fx = `Nastrój: ${Talk.moodWord(r.morale)} (${Math.round(r.morale)}). Zmęczenie ${Math.round(r.fatigue)}%.`;
        Talk.mor(r, 1);
        break;
      }
      case 'praise':
        if (good || r.morale < 50) { say = '„Dzięki, szefie. To dużo dla mnie znaczy.”'; Talk.mor(r, 7); fx = 'Morale +7'; }
        else { say = '„Serio? Ostatnio jadę poniżej swojego poziomu…”'; Talk.mor(r, -2); fx = 'Nie uwierzył w pochwałę. Morale −2'; }
        break;
      case 'demand':
        if (!good && calm) { say = '„Wiem. Zostanę dziś dłużej w warsztacie.”'; r.form = R.clamp(r.form + 0.8, -3, 3); Talk.mor(r, -2); fx = 'Forma +0,8, morale −2'; }
        else if (!good) { say = '„Łatwo mówić z biura…”'; Talk.mor(r, -9); fx = 'Zabolało. Morale −9'; }
        else { say = '„Robię 10 punktów na mecz, czego jeszcze pan chce?”'; Talk.mor(r, -12); fx = 'Zawodnik się wściekł. Morale −12'; }
        break;
      case 'contract': {
        const d = Game.demand(r), friendly = r.morale >= 65 ? 0.9 : r.morale >= 45 ? 1.0 : 1.2, sign = Math.round(d.sign * friendly / 1000) * 1000;
        if (r.morale >= 45) {
          r.contract = { years: 2, sign, perPoint: d.perPoint };
          say = r.morale >= 65 ? '„Chcę tu zostać. Podpiszę na dwa lata, nawet trochę taniej.”' : '„Dobra, dwa lata — ale na moich warunkach.”';
          fx = `Nowy kontrakt: 2 sezony, ${money(sign)} za podpis, ${money(d.perPoint)} za punkt.`;
          Game.news(`${r.name} przedłuża kontrakt o 2 sezony.`, 'good');
        } else { say = '„Nie teraz. Zobaczymy po sezonie, jakie będą oferty.”'; fx = 'Zawodnik nie chce rozmawiać o przedłużeniu (za niski nastrój).'; }
        break;
      }
      case 'mentor': {
        const juniors = Game.roster(s.user).filter(Game.isJunior);
        if (r.a.mental >= 11) { juniors.forEach(j => { Talk.mor(j, 5); j.growth.bends = (j.growth.bends || 0) + 0.4; }); Talk.mor(r, 2); say = '„Jasne. Pokażę młodym, jak się wchodzi w pierwszy łuk.”'; fx = `Juniorzy: morale +5 i szybsza nauka łuków. ${r.name.split(' ')[1]} +2 morale.`; }
        else { Talk.mor(r, -4); say = '„Nie jestem niańką. Mam swoje problemy.”'; fx = 'Odmówił. Morale −4'; }
        break;
      }
      case 'dream':
        say = r.pot >= 15 ? '„Grand Prix. I chcę to zrobić w tym klubie.”' : r.pot >= 12 ? '„W pierwszej siódemce, na stałe.”' : '„Chcę po prostu jeździć i się nie bać.”';
        Talk.mor(r, 4); fx = `Potencjał: ${UI.stars(r)}. Morale +4`;
        break;
    }
    Game.save();
    return { say, fx };
  },

  riderModal(id, back) {
    const r = Game.s.riders[id];
    if (!r) return;
    const ok = Talk.canTalk(r);
    UI.modal(`<div class="row between"><span class="kicker">Rozmowa w szatni</span><button class="x" data-ui="close">×</button></div>
      <div class="talk-head">${UI.avatar(r, 64)}<div><h2>${esc(r.name)}</h2><p class="muted">${r.age} lat · KSM ${num(r.ksm)} · nastrój <b>${Talk.moodWord(r.morale)}</b></p>${UI.bar(r.morale, 100, r.morale < 45 ? 'bad' : '')}</div></div>
      ${ok ? `<div class="talk-opts">${Talk.options(r).map(([k, t]) => `<button class="opt" data-ui="talk" data-id="${r.id}" data-v="${k}">${esc(t)}</button>`).join('')}</div>`
        : '<p class="muted">W tym tygodniu już rozmawialiście. Wróć po następnym meczu.</p>'}`);
  },
  riderAnswer(id, k) {
    const r = Game.s.riders[id], a = Talk.answer(r, k);
    UI.modal(`<div class="row between"><span class="kicker">Rozmowa w szatni</span><button class="x" data-ui="close">×</button></div>
      <div class="talk-head">${UI.avatar(r, 64)}<div><h2>${esc(r.name)}</h2><blockquote class="quote">${esc(a.say)}</blockquote><p class="fx">${esc(a.fx)}</p></div></div>
      <div class="actions"><button class="go" data-ui="close">Dalej</button></div>`);
  },

  /* ---------- dylematy ---------- */
  pickRider(filter) { const l = Game.roster(Game.s.user).filter(filter); return l.length ? Crowd.pick(l) : null; },
  leader() { return Game.roster(Game.s.user).sort((a, b) => b.ksm - a.ksm)[0]; },
  risk(kind, weeks, chance, data) { Talk.st().risks.push({ kind, at: Game.s.week + weeks, chance, data }); },

  D: {
    painJunior: {
      title: 'Junior z bólem po upadku',
      pick: () => Talk.pickRider(r => Game.isJunior(r) && r.injury === 0),
      text: r => `${r.name} przewrócił się na treningu. Ma stłuczony bark, ale mówi, że da radę pojechać w meczu. Lekarz klubowy wzrusza ramionami.`,
      opts: [
        ['Niech jedzie — to jego decyzja', r => { Talk.mor(r, 8); if (Math.random() < 0.35) { r.injury = 3; return `${r.name} pojechał… i po meczu bark nie wytrzymał. Uraz na 3 tygodnie.`; } return `${r.name} jest wdzięczny za zaufanie (morale +8). Tym razem się udało.`; }],
        ['Posadź go na ławce w tym tygodniu', r => { Talk.mor(r, -8); r.fatigue = 0; return `${r.name} jest wściekły (morale −8), ale bark się wygoi.`; }],
        ['Wyślij na badania', r => { const cost = Club.lvl('medic') ? 0 : 15000; if (cost) Game.tx('exp', 'Badania', cost); Talk.mor(r, 2); if (Math.random() < 0.5) { r.injury = 1; return `Rezonans pokazał naderwanie. Tydzień przerwy, ale bez ryzyka${cost ? '' : ' (badania w naszym centrum medycznym)'}.`; } return `Nic poważnego — może jechać spokojnie${cost ? ` (koszt ${money(cost)})` : ''}.`; }],
      ],
    },
    fuel: {
      title: 'Paliwo „z dodatkiem”',
      text: () => 'Szef mechaników ściszył głos: „Mam dodatek do metanolu. Na badaniach nie wyjdzie… raczej. Kilka koni więcej na starcie”.',
      opts: [
        ['Nie. Jedziemy czysto.', () => { Talk.pop(1); return 'Mechanik wzruszył ramionami. Czyste sumienie.'; }],
        ['Tylko w najbliższym meczu', () => { Game.s.boost = { week: Game.s.week, speed: 0.6, start: 0.6 }; Talk.risk('fuel', 1, 0.25); return 'Silniki dostaną „dodatek” w najbliższym meczu. Oby kontrola nic nie znalazła…'; }],
      ],
    },
    fix: {
      title: 'Propozycja nie do odrzucenia',
      text: () => 'Działacz rywala zaprasza na kawę: „300 tysięcy, jeśli w 13. biegu wasi odpuszczą. Nikt się nie dowie”.',
      opts: [
        ['Odrzuć i zgłoś do komisji', () => { Talk.pop(6); Game.roster(Game.s.user).forEach(r => Talk.mor(r, 2)); Game.news('Klub zgłosił próbę ustawienia meczu. Kibice dumni.', 'good'); return 'Sprawa trafiła do komisji. Kibice i zawodnicy są z was dumni (popularność +6).'; }],
        ['Odrzuć po cichu', () => 'Kawa została niedopita. Nikt nic nie wie.'],
        ['Przyjmij pieniądze', () => { Game.tx('inc', 'Wpływy „inne”', 300000); Talk.risk('fix', R.int(1, 3), 0.35); return 'Na konto wpłynęło 300 tys. zł „za konsultacje”. Serce bije szybciej…'; }],
      ],
    },
    raise: {
      title: 'Lider chce podwyżki',
      pick: () => Talk.leader(),
      text: r => `${r.name} przyszedł do biura: „Robię dla klubu najwięcej punktów. Chcę 15% więcej albo zacznę słuchać innych ofert”.`,
      opts: [
        ['Daj 15% podwyżki', r => { const add = Math.round(r.contract.sign * 0.15 / 1000) * 1000; r.contract.sign += add; Talk.mor(r, 10); Game.tx('exp', 'Podwyżki', add / 2); return `Kontrakt podniesiony o ${money(add)}. ${r.name} zadowolony (morale +10).`; }],
        ['Odmów', r => { Talk.mor(r, -15); r.form = R.clamp(r.form - 0.6, -3, 3); return `${r.name} trzasnął drzwiami (morale −15, forma −0,6).`; }],
        ['Obiecaj 150 tys. premii za play-off', r => { Talk.st().promises.push({ id: r.id, amount: 150000, kind: 'playoff' }); Talk.mor(r, 4); return `Umowa słowna: 150 tys. zł, jeśli wejdziecie do play-off (morale +4).`; }],
      ],
    },
    party: {
      title: 'Impreza przed meczem',
      pick: () => Talk.pickRider(r => !Game.isJunior(r)),
      text: r => `W internecie krąży nagranie: ${r.name} o 3 w nocy w klubie, dwa dni przed meczem. Dziennikarze dzwonią.`,
      opts: [
        ['Kara finansowa 20 tys. zł', r => { Talk.mor(r, -10); Game.roster(Game.s.user).filter(x => x !== r).forEach(x => Talk.mor(x, 2)); Game.tx('inc', 'Kary dla zawodników', 20000); return `${r.name} zapłacił karę (morale −10). Reszta drużyny docenia dyscyplinę.`; }],
        ['Rozmowa w cztery oczy', r => { Talk.mor(r, 2); if (Math.random() < 0.5) { r.form = R.clamp(r.form - 1, -3, 3); return `Obiecał poprawę, ale forma na meczu i tak siadła (forma −1).`; } return 'Przeprosił. Temat zamknięty.'; }],
        ['Publicznie go skrytykuj', r => { Talk.mor(r, -18); Talk.pop(2); return `Kibice przyklasnęli (popularność +2), ale ${r.name} jest wściekły (morale −18).`; }],
      ],
    },
    fans: {
      title: 'Kibice po porażce',
      when: () => { const c = Game.club(Game.s.user); return c.last.length && c.last[c.last.length - 1] === 'P'; },
      text: () => 'Po porażce grupa kibiców czeka pod budynkiem klubowym. Chcą rozmawiać z zarządem.',
      opts: [
        ['Wyjdź do nich osobiście', () => { if (Math.random() < 0.2) { Talk.pop(-2); return 'Rozmowa była gorąca, poleciały przekleństwa (popularność −2).'; } Talk.pop(4); return 'Szczera rozmowa — kibice docenili, że wyszedłeś (popularność +4).'; }],
        ['Wyślij rzecznika', () => { Talk.pop(-1); return 'Rzecznik przeczytał oświadczenie. Kibice rozeszli się niezadowoleni.'; }],
        ['Zignoruj', () => { Talk.pop(-5); return 'Na trybunie pojawił się transparent „ZARZĄD DO DYMISJI” (popularność −5).'; }],
      ],
    },
    press: {
      title: 'Pytanie o konflikt w drużynie',
      text: () => 'Dziennikarz lokalnej gazety: „Słyszeliśmy, że dwóch waszych zawodników nie podaje sobie ręki. Skomentuje pan?”',
      opts: [
        ['Zaprzecz', () => { if (Math.random() < 0.3) { Talk.risk('press', 2, 1); } return 'Zaprzeczyłeś. Oby nic więcej nie wypłynęło.'; }],
        ['Powiedz prawdę', () => { Talk.pop(2); Game.roster(Game.s.user).slice(0, 2).forEach(r => Talk.mor(r, -5)); return 'Szczerość się podobała (popularność +2), ale w szatni zrobiło się niezręcznie.'; }],
        ['Bez komentarza', () => { Talk.pop(-1); return '„Bez komentarza” — nagłówek i tak powstał.'; }],
      ],
    },
    charity: {
      title: 'Wizyta w szpitalu dziecięcym',
      text: () => 'Szpital prosi, by zawodnicy odwiedzili dzieci na oddziale. To dzień przed treningiem na torze.',
      opts: [
        ['Jedziemy całą drużyną', () => { Talk.pop(6); Game.roster(Game.s.user).forEach(r => { Talk.mor(r, 3); r.fatigue = R.clamp(r.fatigue + 4, 0, 100); }); return 'Zdjęcia obiegły całe miasto (popularność +6, morale +3).'; }],
        ['Wyślij juniorów', () => { Talk.pop(3); Game.roster(Game.s.user).filter(Game.isJunior).forEach(r => Talk.mor(r, 5)); return 'Juniorzy wrócili wzruszeni (popularność +3).'; }],
        ['Odmów — trening ważniejszy', () => { Talk.pop(-3); return 'W mediach pojawiły się krytyczne komentarze (popularność −3).'; }],
      ],
    },
    agent: {
      title: 'Agent zagranicznego zawodnika',
      pick: () => Talk.pickRider(r => r.nat !== 'POL' && r.contract.years <= 1),
      text: r => `Agent ${r.name}: „Mamy ofertę ze Szwecji. Jeśli chcecie go zatrzymać, przedłużcie teraz — 10% więcej”.`,
      opts: [
        ['Przedłuż na 2 sezony (+10%)', r => { const d = Game.demand(r); r.contract = { years: 2, sign: Math.round(d.sign * 1.1 / 1000) * 1000, perPoint: d.perPoint }; Talk.mor(r, 6); return `${r.name} zostaje na 2 sezony za ${money(r.contract.sign)} rocznie.`; }],
        ['Niech szuka szczęścia', r => { Talk.mor(r, -6); return `${r.name} wie, że nie jest priorytetem (morale −6). Po sezonie pewnie odejdzie.`; }],
      ],
    },
    minibike: {
      title: 'Rodzice ze szkółki',
      when: () => Game.s.club && Game.s.club.prospects.length > 0,
      text: () => 'Rodzice adeptów szkółki proszą o zakup dwóch nowych motocykli 250 cm³. Stare ciągle się psują.',
      opts: [
        ['Kup (40 tys. zł)', () => { Game.tx('exp', 'Szkółka', 40000); Game.s.club.prospects.forEach(p => { p.pot = Math.min(20, p.pot + 1); Game.ATTRS.forEach(k => { if (k !== 'risk' && Math.random() < 0.3) p.a[k]++; }); }); Talk.pop(2); return 'Nowe motocykle w szkółce: wychowankowie szybciej się rozwijają (potencjał +1).'; }],
        ['Odmów', () => { Talk.pop(-1); return 'Rodzice wyszli rozczarowani.'; }],
      ],
    },
  },

  /** Nowa sprawa w klubie (wołane w Game.endWeek) + odroczone skutki */
  weekly() {
    const s = Talk.st();
    // skutki wcześniejszych decyzji
    s.risks = s.risks.filter(k => {
      if (k.at > s.week) return true;
      if (Math.random() < k.chance) {
        if (k.kind === 'fuel') { Game.tx('exp', 'Kary GKSŻ', 250000); Talk.pop(-12); Game.news('SKANDAL: kontrola wykryła niedozwolony dodatek w paliwie! Kara 250 tys. zł.', 'bad'); }
        if (k.kind === 'fix') { Game.tx('exp', 'Kary GKSŻ', 600000); Talk.pop(-20); Game.roster(s.user).forEach(r => Talk.mor(r, -10)); Game.news('AFERA: prokuratura ujawnia ustawienie biegu. Kara 600 tys. zł, kibice wściekli.', 'bad'); }
        if (k.kind === 'press') { Talk.pop(-4); Game.news('Gazeta publikuje nagranie kłótni zawodników. Kłamstwo wyszło na jaw.', 'bad'); }
      }
      return false;
    });
    if (s.dilemma && s.week - s.dilemma.week >= 2) { // zignorowana sprawa
      Game.roster(s.user).forEach(r => Talk.mor(r, -3)); Talk.pop(-2);
      Game.news(`Sprawa „${Talk.D[s.dilemma.key].title}” rozeszła się po kościach — zespół czuje się zlekceważony.`, 'warn');
      s.dilemma = null;
    }
    if (!s.dilemma && !s.over && Math.random() < 0.45) {
      const keys = Object.keys(Talk.D).filter(k => { const D = Talk.D[k]; return (!D.when || D.when()) && (!D.pick || D.pick()); });
      if (keys.length) {
        const key = Crowd.pick(keys), D = Talk.D[key], r = D.pick ? D.pick() : null;
        s.dilemma = { key, rid: r ? r.id : null, week: s.week };
        Game.news(`W klubie: ${D.title}. Rozstrzygnij w biurze (albo na Pulpicie).`, 'warn');
      }
    }
  },

  /** Obietnice premii — wołane przy starcie play-off */
  playoffs(inTop4) {
    const s = Talk.st();
    s.promises.filter(p => p.kind === 'playoff').forEach(p => {
      const r = s.riders[p.id];
      if (!r) return;
      if (inTop4) { Game.tx('exp', 'Premie obiecane', p.amount); Talk.mor(r, 6); Game.news(`${r.name} dostaje obiecaną premię ${money(p.amount)} za play-off.`, 'good'); }
    });
    s.promises = s.promises.filter(p => p.kind !== 'playoff');
  },

  dilemmaModal() {
    const s = Talk.st(), d = s.dilemma;
    if (!d) { UI.modal('<h2>Biuro prezesa</h2><p class="muted">Na biurku spokój — żadnej sprawy do rozstrzygnięcia.</p><div class="actions"><button class="go" data-ui="close">Zamknij</button></div>'); return; }
    const D = Talk.D[d.key], r = d.rid ? s.riders[d.rid] : null;
    UI.modal(`<div class="row between"><span class="kicker">Sprawa do rozstrzygnięcia</span><button class="x" data-ui="close">×</button></div>
      <div class="dilemma">${r ? UI.avatar(r, 64) : '<div class="dl-ico">!</div>'}<div><h2>${esc(D.title)}</h2><p>${esc(D.text(r))}</p></div></div>
      <div class="talk-opts">${D.opts.map(([t], i) => `<button class="opt" data-ui="dil" data-v="${i}">${esc(t)}</button>`).join('')}</div>`);
  },
  resolve(i) {
    const s = Talk.st(), d = s.dilemma;
    if (!d) return;
    const D = Talk.D[d.key], r = d.rid ? s.riders[d.rid] : null;
    const msg = D.opts[i][1](r);
    s.dilemma = null;
    Game.news(`${D.title}: ${msg}`, 'info');
    Game.save();
    UI.modal(`<div class="row between"><span class="kicker">Decyzja</span><button class="x" data-ui="close">×</button></div><h2>${esc(D.title)}</h2><p class="fx big-fx">${esc(msg)}</p><div class="actions"><button class="go" data-ui="close">Dalej</button></div>`);
  },

  click(d) {
    switch (d.ui) {
      case 'talkTo': Talk.riderModal(d.v); return true;
      case 'talk': Talk.riderAnswer(d.id, d.v); return true;
      case 'dilemma': Talk.dilemmaModal(); return true;
      case 'dil': Talk.resolve(+d.v); if (!$('#mgr').hidden) UI.render(); return true;
    }
    return false;
  },
};
