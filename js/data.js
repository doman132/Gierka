/* =========================================================
   Speedway Empire 3D — dane gry (v0.2)
   Wszystkie kluby, zawodnicy i sponsorzy są fikcyjni.
   Atrybuty w skali 1–20 (dokument projektowy, rozdz. 3.1).
   ========================================================= */
'use strict';

const DATA = {
  SAVE_KEY: 'speedwayEmpire3D.save.v1',
  LEAGUE: 'PZE Ekstraliga',
  SEASON_START: '2031-04-06',   // pierwsza niedziela rundy zasadniczej
  KSM_LIMIT: 45,
  ROSTER_MAX: 11,
  JUNIOR_AGE: 21,
  WEEKS_PAID: 20,               // kwoty za podpis rozkładane na tygodnie sezonu

  /** [nazwa, skrót, kevlar, dodatki, siła bazowa 1–20, pojemność stadionu] */
  CLUBS: [
    ['VoltaEnergia Nadodrze', 'NAD', '#D9541F', '#1B1B1F', 13.3, 11500],
    ['Gromy Kraków', 'KRA', '#2A55B8', '#EDEDED', 13.5, 12500],
    ['Iskra Zalesie', 'ZAL', '#E0B21F', '#1B1B1F', 14.0, 15000],
    ['Rakiety Wiślin', 'WIS', '#B8272E', '#EDEDED', 13.8, 13000],
    ['Orlęta Kamieńsk', 'KAM', '#1F7A4D', '#EDEDED', 13.2, 10000],
    ['Żubry Puszczyk', 'PUS', '#6A4424', '#E3C83A', 12.9, 9000],
    ['Hutnik Stalowo', 'STA', '#5E6B80', '#F2C230', 12.7, 11000],
    ['Wilki Borowa', 'BOR', '#2F2F33', '#E5413A', 12.5, 8500],
  ],

  /**
   * Stadiony klubów (ta sama kolejność co CLUBS). straight/R — geometria owalu (długość toru
   * = 2·prosta + 2π·R), main/back — trybuna główna i przeciwległa (długość, rzędy, dach),
   * bends — co stoi na łukach: 'bank' nasyp ze stojącymi, 'terrace' łukowa trybuna, 'none' pusto,
   * masts — maszty oświetlenia, tint — odcień nawierzchni, around — otoczenie.
   */
  VENUES: [
    { name: 'Stadion Miejski im. Braci Kowalczyków', straight: 72, R: 32, main: { len: 100, rows: 14, roof: true }, back: { len: 72, rows: 10, roof: true }, bends: ['bank', 'bank'], masts: 6, tint: '#ffffff', around: 'forest' },
    { name: 'Arena Gromów', straight: 68, R: 30, main: { len: 120, rows: 16, roof: true }, back: { len: 96, rows: 12, roof: true }, bends: ['terrace', 'terrace'], masts: 8, tint: '#e9e9ee', around: 'city' },
    { name: 'Stadion Iskry', straight: 80, R: 34, main: { len: 112, rows: 18, roof: true }, back: { len: 84, rows: 12, roof: false }, bends: ['terrace', 'bank'], masts: 6, tint: '#f4efe6', around: 'field' },
    { name: 'Stadion nad Wisłą', straight: 64, R: 31, main: { len: 90, rows: 13, roof: true }, back: null, bends: ['bank', 'terrace'], masts: 4, tint: '#ffffff', around: 'forest' },
    { name: 'Stadion Orląt', straight: 76, R: 29, main: { len: 84, rows: 10, roof: true }, back: { len: 60, rows: 8, roof: false }, bends: ['bank', 'none'], masts: 4, tint: '#e2e4e0', around: 'field' },
    { name: 'Leśny Stadion Żubrów', straight: 70, R: 35, main: { len: 70, rows: 9, roof: false }, back: { len: 54, rows: 6, roof: false }, bends: ['bank', 'bank'], masts: 4, tint: '#f7f1ea', around: 'forest' },
    { name: 'Stadion Hutnika', straight: 74, R: 33, main: { len: 104, rows: 14, roof: true }, back: { len: 104, rows: 14, roof: true }, bends: ['none', 'none'], masts: 6, tint: '#dfe3ea', around: 'industry' },
    { name: 'Stadion pod Borem', straight: 66, R: 30, main: { len: 72, rows: 8, roof: true }, back: null, bends: ['bank', 'bank'], masts: 4, tint: '#ffffff', around: 'forest' },
  ],

  NATIONS: {
    POL: { w: 55, first: ['Bartosz', 'Maciej', 'Patryk', 'Kacper', 'Jakub', 'Dominik', 'Szymon', 'Wiktor', 'Mateusz', 'Oskar', 'Norbert', 'Adrian', 'Damian', 'Kamil', 'Hubert', 'Filip', 'Igor'],
      last: ['Nowicki', 'Wilczek', 'Gawron', 'Sobczak', 'Kurek', 'Majewski', 'Szulc', 'Krupa', 'Kaczmarek', 'Leśniak', 'Bielawski', 'Zając', 'Wawrzyniak', 'Musiał', 'Żak', 'Rogalski', 'Cichoń', 'Pietrzak', 'Frąckowiak', 'Stasiak', 'Olejnik', 'Sadowski'] },
    DEN: { w: 12, first: ['Mikkel', 'Rasmus', 'Magnus', 'Emil', 'Frederik', 'Mads', 'Jonas'], last: ['Holm', 'Sørensen', 'Nygaard', 'Kjær', 'Dalsgaard', 'Vestergaard', 'Brandt', 'Lund'] },
    AUS: { w: 10, first: ['Liam', 'Cooper', 'Jack', 'Mitchell', 'Harrison', 'Lachlan', 'Blake'], last: ['Whitfield', 'McKenzie', 'Pritchard', 'Holloway', 'Barnett', 'Quinlan', 'Keating'] },
    SWE: { w: 9, first: ['Viktor', 'Elias', 'Hampus', 'Axel', 'Linus', 'Oliver'], last: ['Ekholm', 'Bergström', 'Sjöberg', 'Wallin', 'Hedlund', 'Åkesson', 'Norberg'] },
    GBR: { w: 8, first: ['Harry', 'George', 'Callum', 'Ethan', 'Owen', 'Lewis'], last: ['Pennington', 'Ashworth', 'Hollis', 'Fairbairn', 'Radcliffe', 'Summers'] },
    CZE: { w: 3, first: ['Vojtěch', 'Matěj', 'Ondřej'], last: ['Horák', 'Dvořák', 'Kratochvíl'] },
    LAT: { w: 3, first: ['Artūrs', 'Kristaps', 'Edgars'], last: ['Ozols', 'Kalniņš', 'Liepiņš'] },
  },

  /* ---------- mecz 15 biegów ---------- */
  /** Biegi 1–13: numery gości (1–7); gospodarze jadą z numerami wg HOME_MAP. 14–15 nominowane. */
  HEATS: [[1, 2], [6, 7], [3, 4], [5, 6], [1, 7], [2, 3], [4, 5], [6, 1], [2, 7], [3, 5], [4, 1], [2, 5], [3, 4]],
  HOME_MAP: { 1: 2, 2: 1, 3: 4, 4: 3, 5: 5, 6: 7, 7: 6 },
  HELMETS: { h: ['#E5413A', '#3D7FE0'], a: ['#EDEDED', '#F2C230'] },
  TACTICAL_RESERVE_DIFF: 6,
  GRADE_EVERY: 4,               // równanie toru po każdych 4 biegach

  WEATHER: {
    dry:  { name: 'Sucho', wet: 0, rain: false, w: 60 },
    damp: { name: 'Wilgotno', wet: 0.45, rain: false, w: 25 },
    rain: { name: 'Deszcz', wet: 0.85, rain: true, w: 15 },
  },
  PREP: {
    hard:   { name: 'Twardy', mu: 0.95, desc: 'Liczy się start. Mało mijanek.' },
    grippy: { name: 'Przyczepny', mu: 1.05, desc: 'Szybsze łuki, więcej ścieżek do mijania.' },
  },
  GEARS: {
    short: { name: 'Krótka', start: 1.1, top: -0.8, desc: 'lepszy start' },
    mid:   { name: 'Standard', start: 1.0, top: 0, desc: 'kompromis' },
    long:  { name: 'Długa', start: 0.9, top: 0.8, desc: 'szybciej na dystansie' },
  },
  MAPS: {
    soft: { name: 'Łagodna', desc: 'trakcja na śliskim' },
    aggr: { name: 'Agresywna', desc: 'więcej mocy, więcej ryzyka' },
  },
  LINES: {
    inside: { name: 'Krawężnik', d: -4.1, desc: 'najkrótsza droga' },
    wide:   { name: 'Szeroka', d: 2.6, desc: 'szybsze łuki' },
    pair:   { name: 'Parą', d: -1.4, desc: 'blokowanie rywali' },
  },

  /* ---------- treningi (rozdz. 4.1) ---------- */
  BLOCKS: {
    starts:  { name: 'Starty spod taśmy', attr: 'start', load: 8 },
    bends:   { name: 'Technika łuków', attr: 'bends', load: 8 },
    fitness: { name: 'Kondycja i siłownia', attr: 'stamina', extra: 'speed', load: 12 },
    wet:     { name: 'Mokry tor', attr: 'wet', load: 11 },
    psych:   { name: 'Psycholog', attr: 'mental', load: 2 },
    rest:    { name: 'Regeneracja', attr: null, load: -18 },
  },
  INTENSITY: {
    light:  { name: 'Lekki', growth: 0.6, load: 0.6, injury: 0.3 },
    normal: { name: 'Normalny', growth: 1.0, load: 1.0, injury: 1.0 },
    heavy:  { name: 'Ciężki', growth: 1.45, load: 1.5, injury: 2.4 },
  },

  SPONSORS: [
    { text: 'VOLTAENERGIA', bg: '#E0632E', fg: '#1A0803' },
    { text: 'METANOL+', bg: '#1F4FB0', fg: '#FFFFFF' },
    { text: 'KRUSZYWA PÓŁNOC', bg: '#EDEDED', fg: '#B8272E' },
    { text: 'SOKÓŁ BANK', bg: '#1B7A43', fg: '#FFFFFF' },
    { text: 'PALIWA GROMADA', bg: '#F2C230', fg: '#1A1400' },
    { text: 'HOTEL WARMIA', bg: '#2B2622', fg: '#F2C230' },
    { text: 'ŁAŃCUCH-POL', bg: '#C4262E', fg: '#FFFFFF' },
    { text: 'AUTOMAX', bg: '#FFFFFF', fg: '#1F4FB0' },
  ],

  FINANCE: {
    start: 6000000, sponsorWeekly: 190000, tvWeekly: 120000, ticket: 60, winPrize: 100000,
  },
};
