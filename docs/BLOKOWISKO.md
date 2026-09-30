# Speedway Empire 3D — „Blokowisko” (v2.8)

Dokument projektowy nowej ścieżki kariery, rozbudowy mapy i optymalizacji.
Silnik: **Three.js r128 w przeglądarce** (czysty JavaScript, bez bundlera). Gra nie jest w Unity/Unreal/Godot, więc wszystkie przykłady są w JS i pasują do istniejącej architektury: każdy moduł `js/careerN.js` dopina się do poprzednich przez opakowanie funkcji (`const base = X.f; X.f = function () { … base.call(this) … }`).

Nowe pliki:

| Plik | Co robi |
|---|---|
| `js/career20.js` | Ścieżki kariery, reputacja na rejonie, półki zleceń, umiejętności, legalne fuchy, egzamin na licencję, konkurencja, rozmowy z NPC, osiągnięcia, przerywniki, kupno domu |
| `js/career21.js` | Reguły ruchu (chodniki, pasy, światła, znaki), dzielnica willowa „Słoneczne” |
| `js/perf.js` | Dynamiczna rozdzielczość, cienie co n klatek, podział instancji na kwadraty, LOD detali, zamrożone macierze, ładowanie modeli miasta w tle |

---

## 1. Nowe systemy

### 1.1 Start: 16-latek z bloku 7, klatka C

Nowa kariera zaczyna się trzema kadrami przerywnika: loggia na czwartym piętrze, mama w kuchni, Chudy za garażami. Potem wybierasz drogę:

| Droga | Start | Co się zmienia |
|---|---|---|
| 🏁 **Żużel** | 17 lat, licencja, kontrakt juniora, 15 000 zł | Dotychczasowa kariera, nic nie jest odcięte |
| 🧢 **Rejon** | 16 lat, **bez licencji**, 600 zł, reputacja 8 | Trener nie może cię wystawić, mecze oglądasz z trybuny. Więcej zleceń (2 dziennie, 10 tygodniowo). Egzamin na licencję zmienia drogę na „Dwa życia” |
| ⚖️ **Dwa życia** | 16 lat, licencja, 2000 zł | Każde zajęcie zabiera dodatkowo 3 energii. Tydzień z robotą i treningami daje +6 stresu. Wpadka oznacza zawieszenie w lidze i zerwane umowy |

Stare zapisy (sprzed v2.8) dostają drogę „Żużel”. W zakładce Rejon można jednorazowo dołożyć „Dwa życia”; pieniądze i wiek się wtedy nie zmieniają.

### 1.2 Reputacja na rejonie (0–100)

**Rangi:** Nikt z bloku (0) → Młody z trzepaka (10) → Chłopak Chudego (25) → Ktoś na rejonie (50) → Szef rejonu (70) → Duży gracz (85).

**Półki zleceń.** Wyższa reputacja daje lepsze i droższe zlecenia. Towar jest abstrakcyjny: to zawsze po prostu „paczka”.

| Półka | Próg | Wkład | Zapłata | Czujność policji | Czas | Reputacja |
|---|---|---|---|---|---|---|
| Drobnica | 0 | na kreskę | 900 zł | +0,05 | 150 min | +3 |
| Średnia półka | 25 | 1 200 zł | 3 200 zł | +0,07 | 130 min | +4 |
| Premium | 50 | 4 000 zł | 9 500 zł | +0,09 | 120 min | +5 |
| Hurt | 80 | 15 000 zł | 32 000 zł | +0,12 | 100 min | +6 |

- **Przyrost reputacji maleje przy szczycie:** `zysk × (1 − rep/130)`.
- **Spadki:** nieudana dostawa −5, zatrzymanie −12, konflikt przegrany −3/−4, odpuszczenie rejonu −6, donos −12.
- **Wkład:** na wyższych półkach płacisz z góry. Gdy dostawa się nie uda, przepada wkład, ale długu u Chudego nie ma. Przy „drobnicy” dług zostaje, jak dotychczas.
- **Samo dowiezienie** jest fizyczne i działało już w v2.1–2.2: paczka w plecaku, cel na minimapie, patrole, pościg, tajniak.

**Czujność policji** (`dealHeat`, 0–0,6):
- rośnie z każdym zleceniem i przy mandatach;
- spada o 0,06 w każdym tygodniu bez zleceń, plus 0,01 za każdą legalną fuchę (dzielnicowy widzi, że pracujesz);
- „donos” u dzielnicowego obniża ją o 0,15, ale kosztuje 12 reputacji i zostaje napis „KAPUŚ” na klatce.

### 1.3 Umiejętności (0–100, rosną coraz wolniej)

| Umiejętność | Rośnie przez | Działa |
|---|---|---|
| **Handel** | dostawy (+3) | zapłata × (1 + handel/200) |
| **Charyzma** | ulotki, rozmowy, dogadanie z ekipą | mniej wtyk przy odbiorze, lepsze szanse w konflikcie |
| **Spryt** | dostawy, rozmowy z Sebą i Chudym | patrole zauważają cię rzadziej, szansa „wyczucia patrolu” = spryt/250 |

Jazda na żużlu dalej korzysta z atrybutów zawodnika (start, łuki, wytrzymałość, psychika).

### 1.4 Ryzyko i konkurencja

- **Policja:** patrole piesze i radiowozy (jak dotychczas) oraz mandat 100 zł za przejście na czerwonym, gdy policja jest w promieniu 28 m.
- **Konkurencja:** od reputacji 20 co tydzień jest 30% szans, że inna ekipa (z Zatorza, spod pawilonu, z Kolejowej, „Wiadukt”) wejdzie ci na rejon. Seba daje znać SMS-em. Masz trzy wyjścia:
  - **odpuść:** reputacja −6;
  - **dogadaj się:** szansa 35% + charyzma/150;
  - **postaw się:** 55% + spryt/300; porażka to kontuzja i przerwa w treningach.

### 1.5 Wyjście z blokowiska

W zakładce Rejon są trzy paski: *przez sport* (stawka za punkt albo reputacja sportowa), *przez rejon* (reputacja × gotówka) i *oszczędności na dom*. Domy stoją na osiedlu „Słonecznym”:

| Dom | Cena | Wygoda |
|---|---|---|
| Szeregowiec | 420 000 zł | +10 |
| Dom z ogrodem | 850 000 zł | +16 |
| Willa z basenem | 2 400 000 zł | +24 |

Kupno uruchamia przerywnik „Ostatnie kartony” i daje osiągnięcie „Wyprowadzka”. Na mapie 3D przy kupionym domu tabliczka „NA SPRZEDAŻ” znika, a wejście prowadzi do twojego mieszkania. Zamiana na droższy dom oddaje 80% ceny starego.

### 1.6 Lekkie dodatki

- **Legalne fuchy na osiedlu** (raz dziennie każda):
  - ulotki: +120 zł, charyzma;
  - myjnia u Mirka: +220 zł;
  - warsztat pana Zbyszka: +160 zł i lepszy silnik na mecz;
  - siłownia pod chmurką: wytrzymałość.
- **Egzamin na licencję** (Stadion): po 3 treningach, kosztuje 800 zł. Szansa zależy od startu, łuków i stresu.
- **Rozmowy** (raz dziennie z każdą osobą): Chudy, Seba z trzepaka, dzielnicowy st. asp. Nowicki, mama. Każda ma dwie opcje ze skutkami.
- **Osiągnięcia** (13), np. Pierwsza robota, Duży gracz, Licencja w kieszeni, Dwa życia, Czysta kartoteka, Pierwszy milion, Wyprowadzka.
- **System energii i czasu dnia** działał już wcześniej: zegar 24 h, energia, jedzenie, stres, pory dnia w mieście. „Dwa życia” obciąża go mocniej.

### 1.7 Mapa

- **Blokowisko** (istniejące): osiedle „Tysiąclecia” z wielkiej płyty, podwórko, trzepak, plac zabaw, garaże, kiosk.
- **Strefa przejściowa:** bloki PRL-owskie wzdłuż północnej części ul. Słonecznej.
- **Osiedle „Słoneczne”** (nowe, na południu): ul. Słoneczna, Ogrodników i Klonowa. Około 20–35 domów z ogrodami, płotem od ulicy z bramą, żywopłotami, podjazdem, autem i drzewami; co trzeci dom ma basen.
- **Centrum:** jak dotychczas (kasyno, bar, restauracja, stadion).

**Reguły ruchu:**
- **Pieszy** (gracz) chodzi tylko po chodnikach, trawnikach, placach i podwórkach. Na jezdnię wchodzi wyłącznie po pasach; próba wejścia gdzie indziej zatrzymuje go na krawężniku z podpowiedzią.
- **NPC-piesi** zawsze chodzą po chodnikach.
- **Auta** jeżdżą tylko po pasach ruchu jezdni.
- **Pasy (zebry)** są przy każdym skrzyżowaniu (3+ wloty) i w środku ulic dłuższych niż 130 m. Przy pasach bez świateł stoją znaki D-6.
- **Światła** są na skrzyżowaniach głównych ulic (min. jedna ulica ≥ 8 m, dwie osie). Cykl 27 s: oś A zielone 10 s, żółte 2,5 s; oś B zielone 10 s, żółte 2,5 s; przerwy wszystkie-czerwone. Linia zatrzymania jest przed pasami.
- **Auta:** stają na czerwonym (hamują płynnie, √(2·a·d)), na żółtym jadą tylko wtedy, gdy są za blisko, żeby się zatrzymać, i ustępują pieszemu na pasach.
- **Parkingi:** auta zaparkowane wzdłuż krawężników (jak dotychczas) i na podjazdach willi.

---

## 2. Implementacja (Three.js, ta gra)

Silnik jest już ustalony (Three.js r128), więc nie trzeba pytać. Najważniejsze decyzje:

1. **Stan w zapisie gry:** `Game.s.career.rj` (droga, reputacja, umiejętności, liczniki, osiągnięcia, dom). Brak `rj` oznacza stary zapis i drogę „Żużel”, więc nic się nie psuje.
2. **Bez licencji:** opakowujemy `Game.autoLineup` (gracza zastępuje rezerwowy tej samej kategorii wiekowej), `Career.inLineup` i `Career.toMatch` (mecz oglądasz z trybuny).
3. **Zlecenia:** `City.dealModal` pokazuje półki; `Job.accept/deliver/fail/stop/tick` są opakowane. Charyzma i spryt tymczasowo skalują `dealHeat` w oryginalnych rzutach kośćmi, więc nie trzeba przepisywać logiki patroli i pościgów.
4. **Reguły ruchu:**
   - graf skrzyżowań powstaje z końców odcinków `Miasto.segs()`, więc działa też z mapą z edytora (F9 / `editor.html`);
   - blokada pieszego to opakowanie `Walk.frame`: jeśli ruch wprowadza głębiej na jezdnię poza pasami, cofamy go osobno w osi X i Z, żeby gracz ślizgał się wzdłuż krawężnika;
   - auta: przed oryginalnym `Miasto.tick` obniżamy `c.v` (prędkość docelową) aut, które muszą stanąć, a po nim ją przywracamy.
5. **Dzielnica willowa:**
   - nowe ulice są dopisane do `Miasto.ROADS`, dostają więc asfalt, chodniki, latarnie, drzewa, ruch uliczny i minimapę;
   - domy powstają z `World.realBuilding` (tekstury PBR, które gra już ma), scalane w jedną siatkę na materiał, z oknami jako instancje;
   - całość jest w `THREE.LOD`: z bliska szczegóły, od 260 m proste bryły.

### Wydajność: co jest zrobione

| Technika | Gdzie | Efekt |
|---|---|---|
| **Dynamiczna rozdzielczość** | `perf.js` | FPS < 50: render −10% (do 60%), FPS > 58 przez 4 s: +5%. Wyłącznik: Ustawienia → Grafika |
| **Cienie co 2. klatkę** | `perf.js` | Tylko gdy FPS < 45 albo skala ≤ 70% |
| **Frustum culling instancji** | `perf.js` + wcześniej `career14.js` | Ciężkie instancje dzielone na kwadraty 160 m z własną sferą (test: 36 tys. → 3 tys. trójkątów w kadrze) |
| **LOD** | `career21.js`, `perf.js` | Dzielnica willowa: 2 poziomy. Drobne detale (ławki, latarnie, auta, okna) znikają za 140/220/320 m wg jakości |
| **Mniej draw calls** | `career21.js` | Pasy, znaki, słupy, lampy świateł, płoty, żywopłoty i baseny to po jednej instancji; domy scalone na materiał. Dzielnica rysuje się w ~28 wywołaniach |
| **Statyczne macierze** | `perf.js` | Liście sceny miasta nie przeliczają macierzy co klatkę (auta, drzwi i edytor zostają ruchome) |
| **Async loading strefy** | `perf.js` | Otwarcie zakładki Miasto pobiera modele miasta w tle (`requestIdleCallback`) |
| **Proste kolizje** | istniejące + `career21.js` | Prostokąty AABB w siatce 8 m (sprawdzana tylko okolica gracza) |
| **Pooling** | istniejące | Przechodnie, patrole i ruch uliczny tworzone raz i używane ponownie (bez `new` w pętli) |

**Occlusion culling:** WebGL1/Three r128 nie ma zapytań o okluzję, a CPU-owy occlusion culling w JS kosztowałby więcej, niż oszczędza. Zastępują go frustum culling kwadratów, mgła i odcinanie detali z odległości. Jeśli miasto urośnie kilkukrotnie, następnym krokiem jest podział mapy na strefy (portale), rysując tylko strefę gracza i sąsiednie.

**Dalsze kroki (kolejne wersje):**
- przeniesienie gry na Three.js r15x+ (`BatchedMesh`, lepsze InstancedMesh z własną sferą, WebGL2 domyślnie);
- tekstury KTX2/Basis zamiast WebP (mniej pamięci GPU na telefonach);
- `gltfpack -si 0.5` dla ciężkich modeli z Sketchfab.

---

## 3. Modele 3D: skąd i jak zaimportować

> Sieć w środowisku, w którym powstał ten dokument, blokowała Sketchfab, więc **licencji poniższych linków nie dało się sprawdzić automatycznie**. Przed pobraniem sprawdź na stronie modelu: licencję (CC BY / CC0), „Downloadable” i liczbę trójkątów.

### Policjant (NPC)
Gra **już ma** policjantów i policjantki z Microsoft Rocketbox (MIT, z animacjami), a każdy radiowóz ma inną załogę. Modele z Sketchfab są opcjonalne, np. dla stylu low-poly. Linki od ciebie:
- https://sketchfab.com/3d-models/free-police-officer-low-poly-acfde9c293034377a72c46ad24174f7f
- https://sketchfab.com/3d-models/male-police-officer-in-multiple-uniforms-lowpoly-7191aac63f4a40979b89ef3a2b38ef76
- https://sketchfab.com/3d-models/character-type-male-police-f918c22225b0458095b833872e7c12ba
- https://sketchfab.com/3d-models/policeman-d47bb1f61fa340588b5801cdb63812c8

Jeśli model nie ma szkieletu, zrób rigging w **Mixamo** (https://www.mixamo.com, darmowe; animacje *Walking*, *Running*, *Idle*). Eksportuj FBX *Without Skin* dla animacji i *With Skin* dla postaci.

### Domy jednorodzinne
- Twój link: https://sketchfab.com/3d-models/lowpoly-urban-house-789ae66d60154b74900f3586457abb9b
- **Kenney City Kit (Suburban)**, CC0: https://kenney.nl/assets/city-kit-suburban. Gra już go używała przy stadionach; to najlepszy wybór do zamiany proceduralnych domów.
- Wyszukiwanie: [Sketchfab: low poly suburban house (do pobrania)](https://sketchfab.com/search?features=downloadable&q=low+poly+suburban+house&type=models), [Poly Pizza: house](https://poly.pizza/search/house) (CC0/CC BY).

### Drogi, chodniki, znaki
- **Kenney City Kit (Roads)**, CC0: https://kenney.nl/assets/city-kit-roads
- Pasy, znaki D-6 i sygnalizatory są w grze **generowane**, bez plików. Własne modele znaków można podpiąć przez `Furn.SRC`.

### Motocykl żużlowy
Gra ma **własny, proceduralny** motocykl żużlowy (`js/bike.js`: rama, silnik, szprychy, kolory gracza). Ewentualny model do garażu lub dekoracji:
- [Sketchfab: speedway (do pobrania)](https://sketchfab.com/search?features=downloadable&q=speedway&type=models)
- [Sketchfab: dirt bike low poly](https://sketchfab.com/search?features=downloadable&q=dirt+bike+low+poly&type=models)

### Bloki, auta, cywile
- Bloki z wielkiej płyty (OpenGameArt, CC0) i polskie auta (Fiat 126p/125p, Ikarus, Żuk, radiowóz; CC BY) już są w grze.
- **Kenney Car Kit**, CC0: https://kenney.nl/assets/car-kit
- **Quaternius**, CC0: https://quaternius.com (paczki postaci i miasta low-poly)

### Import do tej gry (Three.js)
1. **Konwersja do glTF (.glb).** Blender: File → Import (FBX/OBJ) → File → Export → glTF 2.0 (.glb), z zaznaczonymi *Apply Modifiers*, *+Y Up* i *Compression* wyłączoną (gra nie ma dekodera Draco).
2. **Optymalizacja** (Node, raz):
   ```bash
   npx @gltf-transform/cli optimize wejscie.glb models/sk/policjant.glb --texture-compress webp --texture-size 1024 --simplify-ratio 0.5
   ```
   Cel: postać ≤ 8 tys. trójkątów, dom ≤ 3 tys., auto ≤ 5 tys.
3. **Rejestracja** w dowolnym `js/careerN.js`:
   ```js
   Furn.SRC.villaA = 'sk/villaA.glb';                 // model statyczny (dom, znak)
   // postawienie: Furn.load(['villaA'], () => Furn.place(Miasto.G, 'villaA', x, 0, z, rot, { h: 7 }));
   // wiele kopii naraz (1 draw call na materiał): Miasto.instances(Miasto.G, 'villaA', [{ x, z, r, s }])
   ```
   Postacie idą przez `Humans` (FBX + wypiekanie animacji); wzór to postacie Rocketbox w `js/humans.js`.
4. **Autor i licencja** do `models/CREDITS.txt` (CC BY wymaga podania autora).

### Open-source do rozważenia
- *Unity CityBuilder-and-Traffic-System* i *roadgen* są w C#/Unity albo Pythonie, więc **nie da się ich wpiąć** w grę JS. Logikę (graf skrzyżowań, fazy świateł) i tak już mamy w `career21.js`.
- **Yuka** (https://github.com/Mugen87/yuka, MIT): AI dla gier w JS (steering, FSM, navmesh). Pasuje do bardziej złożonych NPC i pościgów.
- **three-pathfinding** (https://github.com/donmccurdy/three-pathfinding, MIT): navmesh dla Three.js, np. żeby NPC chodzili po podwórkach, a nie tylko wzdłuż ulic.
- **glTF-Transform** (https://gltf-transform.dev) i **gltfpack/meshoptimizer**: optymalizacja modeli.

---

## 4. Propozycje kolejnych funkcji

1. **Mini-gry żużlowe:** trening startu spod taśmy (refleks na podniesienie taśmy, 5 prób, wynik wpływa na „start”); „ósemki” na torze treningowym z pachołkami; wyścig na motorynkach po osiedlu (nielegalny, reputacja na rejonie +, policja).
2. **Dzień i noc wpływają na rejon:** zlecenia premium tylko wieczorem, w nocy mniej patroli, ale tajniacy w cywilu; latarnie i zapalone okna już są.
3. **Reputacja u policji jako osobny pasek:** dzielnicowy może cię „kryć” za drobne przysługi (legalna praca, pomoc sąsiadom) albo przyjść z nakazem.
4. **Ekipa:** werbowanie kumpli z trzepaka jako kurierów (pasywny dochód, ryzyko wsypy).
5. **Sponsor z osiedla:** lokalny warsztat lub piekarnia sponsoruje juniora z bloku; wygasa po aferze.
6. **Motocykl dla brata:** „stara Jawa” z warsztatu pana Zbyszka; brat po 10 treningach dostaje licencję (mechanika już istnieje).
7. **Wydarzenia osiedlowe:** festyn na podwórku, awaria windy, mecz reprezentacji na telebimie pod pawilonem.
8. **Auto jako status:** od 126p po sportowe coupé; parkujesz na podjeździe willi i jest widoczne na mapie.
9. **Zakończenia:** mistrz świata z bloku, „duży gracz” wyjeżdżający za granicę albo areszt, z krótką sekwencją zdjęć w przerywniku.

---

## 5. Kod przykładowy

### 5.1 Reguły ruchu (fragmenty z `js/career21.js`)

```js
/** Jak głęboko punkt wchodzi na jezdnię (m); ≤ 0 — poza jezdnią */
depth(x, z) {
  let best = -1e9;
  Miasto.segs().forEach(s => {
    const L = Ruch.local(s, x, z), t = R.clamp(L.t, 0, s.len);
    best = Math.max(best, s.wd / 2 - Math.hypot(L.t - t, L.lat));
  });
  return best;
},
blocked(x, z) { return Ruch.depth(x, z) > 0.05 && !Ruch.crossingAt(x, z); },

// pieszy: ruch, który wprowadza głębiej na jezdnię poza pasami, jest cofany (osobno X i Z — ślizg po krawężniku)
const bf = Walk.frame;
Walk.frame = function (dt) {
  const x0 = Walk.x, z0 = Walk.z; bf.call(this, dt);
  const bad = (x, z) => Ruch.blocked(x - Miasto.CX, z);
  if (bad(Walk.x, Walk.z) && Ruch.depth(Walk.x - Miasto.CX, Walk.z) > Math.max(0.05, Ruch.depth(x0 - Miasto.CX, z0))) {
    if (!bad(Walk.x, z0)) Walk.z = z0; else if (!bad(x0, Walk.z)) Walk.x = x0; else { Walk.x = x0; Walk.z = z0; }
  }
};

// auta: przed ruchem ograniczamy prędkość docelową tych, które muszą stanąć (czerwone / pieszy na pasach)
const dd = rem - e.stop - hl;                         // odległość przodu auta od linii zatrzymania
if (st !== 'g' && dd > -0.5 && !(st === 'a' && dd < 5)) d = Math.min(d, dd);
c.v = Math.min(c._v0, d < 0.3 ? 0 : Math.sqrt(2 * 6 * d)); // droga hamowania przy 6 m/s²
```

Auta zawsze jadą po pasach ruchu (`lane = 2,4 m × kierunek` od osi jezdni), więc zasada „tylko po drodze” wynika wprost z modelu ruchu.

### 5.2 Reputacja (fragmenty z `js/career20.js`)

```js
TIERS: [
  { id: 't1', n: 'Drobnica',      min: 0,  cost: 0,     pay: 900,   heat: 0.05, rep: 3 },
  { id: 't2', n: 'Średnia półka', min: 25, cost: 1200,  pay: 3200,  heat: 0.07, rep: 4 },
  { id: 't3', n: 'Premium',       min: 50, cost: 4000,  pay: 9500,  heat: 0.09, rep: 5 },
  { id: 't4', n: 'Hurt',          min: 80, cost: 15000, pay: 32000, heat: 0.12, rep: 6 },
],
repd(d) { const J = Rejon.S(); J.rep = R.clamp(J.rep + d, 0, 100); },
skill(k, x) { const J = Rejon.S(), v = J.sk[k] || 0; J.sk[k] = Math.min(100, v + x * (1 - v / 120)); },
payMul() { return 1 + (Rejon.S().sk.handel || 0) / 200; },

// udana dostawa
J.done++; J.earned += Jb.pay - (Jb.cost || 0);
Rejon.repd(T.rep * (1 - J.rep / 130));  // im wyżej, tym wolniej
Rejon.skill('handel', 3); Rejon.skill('spryt', 1.5);
```

### 5.3 Pooling (wzór dla nowych efektów i NPC)

```js
const Pool = {
  free: {},
  get(key, make) { const a = Pool.free[key]; const o = a && a.length ? a.pop() : make(); o.visible = true; return o; },
  put(key, o) { o.visible = false; (Pool.free[key] = Pool.free[key] || []).push(o); },
};
// np. dym z tłumika: const p = Pool.get('smoke', () => new THREE.Sprite(mat)); … Pool.put('smoke', p);
```

---

## Testy (wykonane)

- **Przeglądarka (Chromium, bez modeli 3D):**
  - intro, wybór drogi i zakładka Rejon;
  - fucha (+120 zł), okno zleceń (4 półki, blokady progów), egzamin, NPC, konflikt, kupno domu, osiągnięcia, koniec tygodnia;
  - ustawienie „Automatyczna rozdzielczość”;
  - budowa dzielnicy i świateł oraz render bez błędów (dzielnica: 28 wywołań rysowania).
- **Node:** graf skrzyżowań prawdziwej mapy (7 skrzyżowań, 4 ze światłami, 35 przejść):
  - środek jezdni zablokowany, chodnik i pasy wolne;
  - każde przejście dostępne z chodnika;
  - fazy świateł nigdy nie dają zielonego dwóm osiom naraz.
- **Logika:** dostawa, porażka z wkładem (bez długu) i na kreskę (dług), zatrzymanie, limity zleceń, stary zapis.
- **Nie sprawdzone:** chodzenie po pełnym mieście 3D. Modele (`models/`) nie są w repozytorium, więc miasto 3D trzeba przejść u siebie.
