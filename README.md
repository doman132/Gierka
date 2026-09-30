# Speedway Empire 3D: gra v0.2

Pierwsza grywalna wersja z dokumentu projektowego (`../GDD.md`): warstwa menedżerska wokół wyścigów 3D z prototypu.

## Co jest w tej wersji

- **Liga:** PZE Ekstraliga (fikcyjna), 8 klubów, 14 rund od kwietnia, tabela z punktem bonusowym, play-off (półfinały, finał i brąz w dwumeczach).
- **Kadra:** atrybuty 1–20, forma, zmęczenie, morale, popularność, potencjał i KSM (średnia punktów na mecz z poprzedniego sezonu).
- **Skład meczowy:** numery 1–5 seniorzy, 6–7 juniorzy U21, 8 rezerwowy; suma KSM siódemki ≤ 45.
- **Dzień meczowy:** 15 biegów według programu, każdy do obejrzenia w 3D albo symulacji.
  - boks przed biegiem, z asystentem albo ręcznie,
  - rezerwa taktyczna przy stracie 6+ pkt (decyzja gracza),
  - nominacje do biegów 14–15,
  - równanie toru co 4 biegi,
  - upadek oznacza wykluczenie i powtórkę biegu.
- **Treningi:** blok tygodniowy dla każdego zawodnika i intensywność (lekki, normalny, ciężki). Rozwój zależy od wieku i potencjału, a ciężki trening podnosi zmęczenie i ryzyko urazu.
- **Kontrakty:** kwota za podpis i stawka za punkt, negocjacje z szansą zgody, przedłużenia, zwolnienia z odprawą, wolni zawodnicy na rynku.
- **Finanse:** sponsorzy, prawa TV, bilety (frekwencja zależy od popularności, formy i pogody), premie za punkty, nagrody.
- **Nowy sezon:** wiek i spadek formy weteranów, KSM przeliczone z wyników, wygasające kontrakty.

## Prowadzenie motocykla (v0.3)

W boksie przed każdym biegiem meczu jest przycisk **Jedź sam: [zawodnik]**, a w menu zakładka **Tor treningowy** (jazda poza sezonem, z tabelą najlepszych czasów).

| Klawisz | Działanie |
|---|---|
| W / ↑ | Gaz (przytrzymaj) |
| A / ← | Do krawężnika |
| D / → | Na zewnątrz |
| 1–6 | Kamery: TV, za motocyklem, zza bandy, przy torze, dron, kask |
| Spacja / P | Pauza |

Na telefonie pojawiają się przyciski ◀ ▶ i GAZ.

Zasady jazdy:
- **Start:** gaz dopiero, gdy taśma pójdzie w górę. Wcześniejszy ruch to dotknięcie taśmy i spóźniony start.
- **Wskaźnik przyczepności:** pokazuje, ile prędkości zniesie łuk (zielony w porządku, żółty na granicy, czerwony za szybko).
- **Za szybko w łuku:** motocykl wynosi na zewnątrz i traci prędkość, a zbyt długo za szybko kończy się upadkiem (czerwone światło i wykluczenie).
- **Krawężnik i banda** hamują.

## Grafika (v0.4)

- **Motocykl żużlowy:** długi rozstaw osi, wąskie przednie i szerokie tylne koło z bieżnikiem, szprychy, rama z rurek, pionowy silnik z żeberkami, łańcuch, tłumik, błotnik z numerem.
- **Skręt:** motocykl ustawia się bokiem w łuku, przednie koło kontruje, zawodnik pochyla się do środka i wysuwa lewą nogę po torze. Na starcie unosi się przód, a przy upadku motocykl sunie i się obraca.
- **Stadion:** park maszyn z namiotami, flagi na dachu, siedziska w barwach gospodarza, race po wygranym biegu, telebim, snopy świateł, ścieżki na torze.
- **Menedżer:** karty zawodników, licencja zawodnika, karta meczu, herby klubów.

## Realistyczne modele (v1.1)

- **Ludzie — Microsoft Rocketbox (MIT):** 13 realistycznych postaci w ubraniach (mężczyźni, kobiety, gość imprezy, prezes w garniturze, lekarz w kitlu, mechanik) z animacjami: stanie, siedzenie, rozmowa, oklaski, doping, taniec, picie, chód. Klatki animacji są „wypiekane” przy pierwszym użyciu. Zastępują: prezesa, lekarza, trenera, mechanika, kolegów w szatni, ludzi na imprezie (tańczą), przechodniów na parkingu (idą do bram) i obsługę toru. Tłum na trybunach (tysiące osób) zostaje lżejszy.
- **Meble — Poly Haven (CC0, fotorealistyczne) i Kenney Furniture Kit (CC0):** biuro (metalowe biurko, laptop, regał, fotel, rośliny, obraz, dywan, kanapa), centrum medyczne (łóżka, biurko z monitorem), warsztat (regały, wózek i skrzynia narzędziowa, imadło, opony, beczki), klub (hokery, butelki, kasa, głośniki), mieszkanie w karierze (kanapa, stolik, telewizor na szafce, konsola, łóżko, regał z pucharami, obrazy, rośliny, dywan, kuchnia, lampa, biurko z laptopem).
- **Domy i drzewa — Kenney City Kit Suburban (CC0):** osiedla domów jednorodzinnych i drzewa wokół stadionów.
- Modele ładują się w tle (kilkanaście sekund przy pierwszym uruchomieniu); do tego czasu widać prostsze wersje. Rozmiar folderu `models/`: ok. 160 MB.

## Kariera zawodnika i wnętrza (v1.0)

- **Nowy tryb: kariera zawodnika** (ekran startowy → „Zacznij karierę”). Jesteś 17-letnim juniorem w wybranym klubie; trener (AI) ustala skład — trzeba na niego zasłużyć.
  - **Tydzień:** 3 zajęcia — trening na torze, siłownia, psycholog, praca przy silniku, odpoczynek, wieczór w domu, sesja dla sponsora, spotkanie z kibicami, impreza.
  - **Mieszkanie (3D):** chodzisz po nim, przez laptopa kupujesz wyposażenie (kanapa, telewizor, łóżko, półka na trofea z twoimi pucharami, domowa siłownia, konsola, akwarium, neon, stary motocykl w salonie…). Wygoda domu poprawia nastrój; łóżko, TV, siłownia i konsola dają akcje.
  - **Impreza (3D, klub „Taśma”):** bar (woda / piwo / shoty z kibicami), parkiet, gość w loży VIP (szansa na sponsora — jeśli nie przesadzisz), zaczepka rywala, tabletka od „kibica”. Alkohol daje kaca w meczu, a po imprezie trzeba jeszcze wrócić do domu…
  - **Decyzje moralne:** odżywka o niejasnym składzie, chłopiec po autograf, pożyczenie silnika koledze, starty w Anglii, hejter, telefon od mamy, reklama bukmachera, rywal w mediach, agent. Skutki: forma, zdrowie, nastrój, pieniądze, reputacja, zawieszenie.
  - **Mecz:** sam jedziesz swoje biegi (reszta symulowana), wybierasz przełożenie, mapę i linię. Płacą za punkty, reputacja rośnie z wynikami.
  - **Sprzęt:** własne silniki (poziom 1–5). **Po sezonie:** trofea, historia, oferty kontraktów z innych klubów (agent = więcej ofert), transfer.
- **Wnętrza budynków (menedżer):** biuro prezesa (sprawy klubu, rozmowa z prezesem o celach i budżecie, gablota), centrum treningowe (trening indywidualny wybranej cechy), centrum medyczne (rehabilitacja kontuzjowanych), warsztat (motocykle drużyny, mechanicy). We wnętrzach gaśnie światło stadionu — pokoje oświetlają własne lampy.
- **Bandy jak na prawdziwym torze:** deski z reklamami na prostych, dmuchane czerwono-białe bandy w łukach, siatka ochronna za bandą, brama do parku maszyn. Na tor, przez auta i budynki nie da się przejść.
- **Trybuny:** pełne betonowe stopnie, krzesełka w barwach gospodarza z jego skrótem ułożonym z krzesełek, „młyn” — betonowe stopnie do stania z barierkami zamiast trawiastego nasypu.

## Otoczenie i poprawki (v0.9)

- **Trybuny:** pojedyncze krzesełka w barwach klubu, schodki i barierki w przejściach, pas lamp pod dachem i czoło dachu w barwach klubu, elewacja z bramami wejściowymi, podświetlonymi oknami i nazwą stadionu. Trybuny na prostych kończą się tam, gdzie zaczynają się łuki — nic na siebie nie nachodzi; w łuku przy parku maszyn jest szerokie przejście (karetka i busy drużyn stoją w wolnym miejscu).
- **Samochody z modeli** (Quaternius CC0 + 2 modele CC-BY): sedany, hatchback, minibus, kombi w różnych kolorach lakieru; bus drużyny i karetka w parku maszyn, ciągnik gospodarza toru.
- **Budynki:** budynek klubowy, centrum medyczne i treningowe z modeli Kenney (CC0), miasto wokół stadionów z modeli zamiast brył.
- **Ludzie:** kibice idą z parkingu do bram stadionu (animacja chodu).
- **Ślady kół** leżą dokładnie pod tylnym kołem (wcześniej były odbite w poprzek toru).
- **Przyciski:** ekran nie „wjeżdża” od nowa po każdym kliknięciu i przyciski nie przesuwają się pod kursorem — kliknięcie przy krawędzi działa.

## Stadiony, spacer i szatnia (v0.8)

- **8 różnych stadionów** (`DATA.VENUES`): każdy klub ma własny tor (320–374 m, inna prosta i promień łuku — zmienia się też jazda), inne trybuny (długość, rzędy, dach), łuki z nasypem, łukową trybuną albo puste, 4/6/8 masztów, odcień nawierzchni i otoczenie (las, pola, miasto z blokami, huta z kominami). Mecz odbywa się na stadionie gospodarza.
- **Rozbudowa widoczna w 3D:** trybuna główna rośnie o rzędy, parking i liczba aut rosną, pojawiają się sklep kibica, centrum medyczne, centrum treningowe, mini-tor szkółki, większy warsztat.
- **Spacer po stadionie** (przycisk „🚶 Stadion”): widok z oczu, W/S/A/D + mysz, E — akcja. Parking (rozmowa z kibicami), kasy (cena biletu), sklep, budynek klubowy, warsztat (przygotowanie silników), gospodarz toru (nawierzchnia na mecz u siebie), centrum medyczne, treningowe, szkółka.
- **Szatnia:** zawodnicy w barwach klubu siedzą na ławkach; podejdź i porozmawiaj (raz w tygodniu z każdym): pytanie o samopoczucie, pochwała, wymagania, kontrakt, opieka nad juniorami. Tablica taktyczna ze składem.
- **Wybory moralne** (biuro prezesa albo Pulpit): paliwo „z dodatkiem”, propozycja ustawienia biegu, junior z bólem po upadku, impreza przed meczem, kibice po porażce, prasa, podwyżka lidera, agent zawodnika, szkółka, szpital dziecięcy. Skutki natychmiastowe i odroczone (afera może wybuchnąć po tygodniach).
- **Plastron** jak w prawdziwym żużlu: kamizelka na tułowiu, duży numer na plecach, mniejszy na piersi.

## Klub poza torem (v0.7)

- **Stadion i obiekty** (zakładka Stadion): 8 inwestycji po 5 poziomów — trybuny (pojemność), oświetlenie (prawa TV, jasność toru w 3D), warsztat i park maszyn (lepsze silniki: prędkość i start), parking (frekwencja), sklep kibica (gadżety), szkółka (nabór juniorów), centrum treningowe (szybsze postępy), centrum medyczne (krótsze urazy, regeneracja). Jedna ekipa budowlana, budowa trwa kilka tygodni, każdy obiekt ma tygodniowe utrzymanie.
- **Bilety i frekwencja:** cena biletu zmienia frekwencję; prognoza na mecz i historia frekwencji. W 3D trybuny są zapełnione tak, jak frekwencja (puste miejsca widać).
- **Sponsorzy z celami** (zakładka Sponsorzy): tytularny, na kevlarach i 3 bandy. Tygodniowa wpłata + premia, jeśli spełnisz cel (miejsce, wygrane, frekwencja, popularność). Bandy Twoich sponsorów stoją przy torze w meczach u siebie. Zerwanie umowy = kara. Zadowoleni sponsorzy zwykle przedłużają.
- **Szkółka żużlowa** (zakładka Szkółka): nabór przed każdym sezonem, jakość zależy od poziomu szkółki; kontrakt juniorski dodaje wychowanka do kadry.
- **Cząsteczki przy kamerze** gasną i mają ograniczony rozmiar — spod kół nic nie zasłania ekranu w kamerze za motocyklem i w kasku.

## Realizm (v0.5)

- **Prawdziwi ludzie na trybunach:** ok. 3400 kibiców to modele 3D ludzi (Quaternius, CC0) — 4 mężczyzn i 2 kobiety, każdy z losowym kolorem skóry, włosów, spodni i koszulki (część w barwach klubu). Siedzą, wstają, klaszczą, skaczą i machają; między biegami idzie meksykańska fala. Animacje są „wypiekane” przy starcie do klatek i rysowane instancjami, więc cały tłum kosztuje ok. 1 ms na klatkę.
- **Motocykl (v0.6):** zbudowany od zera w kodzie na wzór nowoczesnej maszyny żużlowej — rurowa rama z kołyską pod silnikiem i sztywnym tyłem, widelec z wahaczem pchanym i amortyzatorami ze sprężyną, pionowy silnik z żebrowanym cylindrem i głowicą, gaźnik z filtrem, łańcuch na zębatkach, wydech z dużym tłumikiem, koła szprychowe (32 krzyżowane szprychy, obręcz, opona z klockami), bez hamulców, wyłącznik zapłonu z linką. Wszystkie części łączone w kilka siatek (ok. 1 ms na 4–6 motocykli). Bez licencji zewnętrznych — można publikować.
- **Zawodnik (v0.6):** model człowieka (Quaternius, CC0) ustawiony w pozycji jeźdźca przez IK (tułów nad kierownicą, dłonie na manetkach, prawa noga na podnóżku); lewa noga płynnie przechodzi (morph target) z podnóżka do wysuniętej w łuku. Kevlar w barwach klubu, czarne rękawice, kask z goglami i daszkiem, plastron z numerem.
- **Tor (v0.6):** czarna nawierzchnia (granit/łupek): ubita ścieżka przy krawężniku, luźny szary materiał pod bandą, ciemne ślady kół.
- **„Kogut” spod tylnego koła (v0.6):** wachlarz grysu, grudki, gęsta mgiełka tuż za kołem i pył unoszący się nad torem; w łuku (motocykl bokiem) strumień leci na zewnątrz i wyżej, na starcie najmocniej. Ilość liczona na sekundę, niezależnie od liczby klatek.
- **Płynna jazda (v0.6):** pozycje interpolowane między krokami symulacji, linia jazdy i kierunek motocykla na sprężynach (bez szarpnięć przy zmianie linii i przy wejściu w łuk), uślizg zaczyna się tuż przed łukiem.
- **Obsługa toru:** starter i mechanicy w parku maszyn to te same modele; sędziowie z flagami, fotoreporterzy, operator kamery, karetka.
- **Obraz:** tone mapping ACES, poświata (bloom) świateł, wygładzanie krawędzi (MSAA), odbicia nocnego nieba na mokrym torze, maszty oświetleniowe z kratownicą.
- **Dźwięk:** silniki (wysokość zależy od prędkości, głośność od odległości od kamery), szum trybun, wiwaty, stuk taśmy. Przycisk 🔊 w rogu wyścigu.
- Modele: `models/` (licencja w `models/CREDITS.txt`), biblioteki Three.js r128 (MIT): `lib/` — gra działa bez internetu (poza czcionkami).

## Uruchomienie (Windows)

Dwuklik na **`Uruchom Speedway Empire 3D.bat`**. Startuje mały serwer (PowerShell, nic nie trzeba instalować) i otwiera grę w osobnym oknie Edge bez paska adresu (albo w domyślnej przeglądarce). Zapis gry jest przypisany do adresu `http://localhost:5180/`. Żeby wyłączyć — zamknij grę i zminimalizowane okno „serwer”.

Alternatywnie (dowolny system), w tym folderze: `python -m http.server 5180` i `http://localhost:5180/`. Samo otwarcie `index.html` z dysku nie wczyta modeli ludzi (zostanie prostsza tłumka).

## Struktura

| Plik | Rola |
|---|---|
| `js/track.js`, `js/sim.js`, `js/scene.js` | Tor, deterministyczna fizyka biegu i świat 3D (z prototypu) |
| `js/data.js` | Kluby, nazwiska, program 15 biegów, bloki treningowe, finanse |
| `js/world.js` | Świat gry: zawodnicy, KSM, składy, liga, play-off, treningi, finanse, kontrakty, zapis |
| `js/matchday.js` | Dzień meczowy: program biegów, boks, rezerwa, nominacje, 3D albo symulacja |
| `js/ui.js` | Ekrany menedżera |
| `js/main.js` | Wybór klubu, pętla główna |
| `js/club.js` | Stadion i obiekty, bilety, sponsorzy z celami, szkółka |
| `js/grounds.js` | Teren wokół stadionu (parking, budynki) i wnętrze szatni |
| `js/walk.js` | Spacer menedżera (FPP), akcje w miejscach |
| `js/talk.js` | Rozmowy z zawodnikami i dylematy moralne |
| `js/rooms.js` | Wnętrza budynków (biuro, siłownia, medyczne, warsztat, mieszkanie, klub nocny) |
| `js/career.js` | Tryb kariery zawodnika |
| `js/props.js` | Modele aut i budynków (wczytanie, instancje) |
| `js/humans.js` | Realistyczni ludzie (Rocketbox): wczytanie FBX, wypiekanie animacji |
| `js/furn.js` | Meble i przedmioty (Poly Haven, Kenney) — wczytywane na żądanie |
| `js/people.js` | Modele kibiców: wczytanie, wypiekanie animacji, uproszczenie siatki, instancje |
| `js/crowd.js` | Rozmieszczenie i zachowanie kibiców, prosta tłumka zapasowa, postacie obsługi |
| `js/audio.js` | Dźwięk (Web Audio, bez plików) |
| `serwer.ps1`, `Uruchom Speedway Empire 3D.bat` | Uruchamianie na Windows |

## Czego jeszcze nie ma (według GDD)

Agenci i klauzule, wypożyczenia, Grand Prix i reprezentacje, Puchar Polski, legendy, dynastia, społeczność kibiców, online i edytor.

## Wersja 1.2 — realizm otoczenia
- Prawdziwe tekstury PBR (Poly Haven, CC0): parkiet, płytki, beton, tynk, cegła, blacha falista, asfalt, chodniki.
- Sufity podwieszane, szatnia z metalowymi szafkami (drzwiczki z wentylacją, uchwyty), ławki na stalowych nogach, glazura na ścianach.
- Realistyczne drzwi (ościeżnica, lakierowana stal / drewno / szkło, klamka, próg, daszek z lampką).
- Warsztat klubowy z zewnątrz: hala z blachy falistej, brama rolowana, rynny, oświetlenie.
- Można wejść na trybuny (po stopniach — nie przez ścianę) i oglądać z nich; w wyścigu kamera „Z trybun” (klawisz 7).
- Kolizje z meblami, autami, motocyklami i trybunami; motocykle stoją na posadzce (bez zapadania opon).
- W szatni tylko zawodnicy (mężczyźni); mechanik w parku maszyn w nowym modelu; chodzący ludzie nie „cofają się”.

## Wersja 1.3 — ludzie, stadion, szybkość
- Ludzie: prawdziwa animacja szkieletowa (GPU) z pełnych nagrań motion capture — płynne ruchy, każdy losuje wariant (rozgląda się, czeka, gestykuluje, pracuje przy stole). Przechodnie nie cofają się ani nie teleportują; tempo kroku dopasowane do animacji.
- 41 różnych postaci (Rocketbox, MIT) — w tym mechanik w kurtce roboczej, ochrona, policja, ratownik, VIP.
- Szybsze wczytywanie: animacje 12 MB zamiast 155 MB, postacie etapami, bez przebudowy stadionu po wczytaniu ludzi; serwer wielowątkowy z pamięcią podręczną (ETag/304).
- Edytor stadionu (zakładka Stadion): krzesełka, elewacja, bandy, dachy, trybuna naprzeciwko, łuki. Rozbudowa trybun i oświetlenia sama zmienia wygląd stadionu (dachy, nowe trybuny, maszty).
- Tor ze zdjęciowej nawierzchni (ziarno granitu), murawa z prawdziwej trawy, bandy dmuchane z winylu, realistyczne drzewa (świerki, drzewa liściaste).
- Tryb swobodny: kliknij w obraz — kamera za myszką bez trzymania przycisku (Esc uwalnia kursor, lewy przycisk = akcja).
- Warsztat: stół z szufladami, tablica z narzędziami; kolizje ze stałymi elementami pokoi (szafki, ławki, stół).

## Wersja 1.4 — rozbudowa widoczna na mapie, realistyczne auta i budynki
- Plac budowy od razu po zleceniu inwestycji: ogrodzenie, rusztowania, żuraw wieżowy, szkielet rosnący z postępem, robotnicy, tablica „BUDOWA” z liczbą tygodni.
- Poziomy obiektów widać na mapie: trybuny (rzędy, dachy, nowe trybuny, łuki), oświetlenie (maszty), park maszyn (zadaszenie, boksy drużyn), szkółka (oświetlony mini-tor, kontenery), medycyna (karetka), parking, sklep.
- Auta i busy z modeli 3D ze szczegółami (CC0, 3dassets.dev) — lakier losowy, busy drużyn w barwach klubów, żółta karetka z belką świetlną, ciągnik.
- Budynki własne z teksturami PBR: okna z ramami i parapetami (część świeci nocą), attyki, dachówka; osiedla domów i bloki wokół stadionu.
- Obsada toru: chorągiewkowi z flagą w dłoni, starter, fotoreporterzy (kucają, robią zdjęcia), mechanicy w parku maszyn.
- Maszyna startowa jak na żużlu: słupki z mechanizmami, poprzeczka, elastyczne taśmy wystrzeliwujące w górę, pola startowe.
- Granica terenu (ogrodzenie panelowe) i minimapa z szybkim przejściem (klik; M — duża mapa).
- Meble 3D: siłownia (bieżnie, rowerki, wioślarz, ławka ze sztangą, stojak z hantlami), medycyna (łóżko, kozetka, stół do masażu, szafka), biuro, warsztat, mieszkanie, klub.

## Wersja 1.5 — czarny tor, efekty jazdy, szatnie i biuro
- Tor czarny jak na prawdziwym żużlu (bez szarego pasa i szwów tekstury), chłodna baza — jupitery nie robią z niego brązu.
- Efekty: gęsty wachlarz drobnego czarnego grysu spod tylnego koła, mgiełka pyłu wisząca w łukach, koleiny z rozoranego granitu i wał luźnej nawierzchni po zewnętrznej, błoto osiadające na dmuchanych bandach (rośnie z każdym biegiem).
- Kibice na łukach patrzą na tor (błąd kierunku naprawiony).
- Szatnia rozbudowana: kevlary w barwach na wieszakach, kaski na szafkach, kącik prysznicowy, TV z programem zawodów, stół do masażu, lodówka z napojami.
- Nowa szatnia gości (drzwi „GOŚCIE” w budynku klubowym): zawodnicy najbliższego rywala, podpatrzona tablica ze składem i formą, zaczepki rywali.
- Biuro prezesa: stół narad z fotelami (zebranie zarządu), ekran z tabelą ligi, ścianka sponsorów.
- Z parku maszyn można wyjechać na tor (jazda treningowa) prosto ze spaceru.
- Błędy gry pokazują się na czerwonym pasku na dole ekranu; jeśli bieg nie wystartuje, pojawia się komunikat z przyczyną i opcja symulacji.

## Wersja 1.6 — Miasto w karierze zawodnika
- Nowa zakładka **Miasto**: mapa z miejscami — mieszkanie, stadion i tor, siłownia „Power”, restauracja „Pit Stop”, bar „Pod Taśmą”, park i kawiarnia, kasyno „Złoty Kask”, gabinet psychologa, klub (sponsorzy, kibice, trener).
- Tydzień = 6 dni × 3 pory (rano, po południu, wieczorem), w niedzielę mecz. Każde zajęcie zabiera porę; po trzech porach dzień się kończy.
- Trzy paski: **Energia**, **Jedzenie**, **Stres** (widoczne też w nagłówku). Wpływają na jazdę: mało energii — słabsza wytrzymałość i prędkość; głód/przejedzenie i fast food — wolniej; wysoki stres — gorsza reakcja na taśmę i psychika, niski — lepszy start. Przed biegiem widać „Twoją dyspozycję”.
- Tor: trening z trenerem albo jazda treningowa w 3D (prowadzisz sam — im lepszy wynik, tym większe postępy; upadek podnosi stres). Siłownia, sauna, psycholog, sponsor, kibice.
- Bar: piwo (kac następnego dnia), impreza 3D, poznawanie dziewczyny; park: spacery i randki (związek słabnie bez randek, rozstanie podnosi stres). Kasyno: ruletka i automaty (paparazzi, rozmowa z trenerem przy częstych wizytach).
- Łóżko w mieszkaniu: „Połóż się spać” (albo „Idź spać” na mapie) — postać kładzie się i śpi, ekran gaśnie, rano energia wraca (porządne łóżko daje więcej).

## Wersja 1.7 — wnętrza miasta, ludzie, telefon, negocjacje
- Każde miejsce z mapy ma wnętrze 3D („Wejdź do środka”): kasyno (ruletka z kręcącym się kołem, blackjack z krupierem, automaty, bar z piwem i whisky), bar „Pod Taśmą” (lada z nalewakami, darts, bilard, szafa grająca, TV z żużlem), restauracja, kawiarnia z widokiem na park, gabinet psychologa; siłownia, klub i stadion z zajęciami kariery.
- Ludzie w lokalach: nieznajomi (kibice, kumple, mechanicy, dziennikarze, zawodnicy, biznesmeni, dziewczyny) — przedstaw się, pogadaj, postaw piwo; znajomi dają korzyści (pomoc przy silniku, wywiady, sponsor, rady, randka).
- Telefon (📱 albo P): kontakty i rozmowy, wiadomości z zaproszeniami, kalendarz z meczem, taxi do miejsc, bank, zdrowie.
- Nowe wybory moralne: ustawianie biegu, nielegalne paliwo, zastrzyki przeciwbólowe, reality show, pijany kumpel, zazdrość, wspólne mieszkanie, junior bez opon, wywiad o sędzim, wina kolegi.
- Negocjacje kontraktu po sezonie: długość 1–3 sezony, podwyżka za podpis i za punkt, cierpliwość prezesa (zgoda, kontroferta albo wycofanie oferty).
- Randka w mieszkaniu (zaproszenie przez telefon): kolacja, film, a przy bliskiej relacji wspólna noc (wygaszenie ekranu). Po wspólnym zamieszkaniu dziewczyna jest w domu na co dzień.
- Poprawki: siedzące i kucające postacie na właściwej wysokości (stopy na podłodze, miednica nad siedziskiem).

## Wersja 1.8 — psychika, sponsorzy, ustawienia, sprzęt, romanse i afera
- Energia i psychika wpływają na jazdę: zmęczenie słabszy silnik i start, stres drżenie kierownicy i falstarty z nerwów, winieta na ekranie; przy niskiej energii postać wolniej chodzi. Wypalenie po dwóch dniach skrajnego stresu.
- Propozycje sponsorów (telefon → 💼 Sponsorzy): kwota tygodniowa, premia za punkt i klauzule (wizerunek, zakaz imprez, minimum punktów, obowiązkowe treningi) — łamanie klauzul kosztuje.
- Ustawienia (⚙): wyciszenie i głośność (silniki, trybuny), jakość grafiki, cienie, poświata, pole widzenia, czułość i odwrócenie myszy, licznik FPS, zmiana klawiszy chodzenia i jazdy.
- Zakładka „Sprzęt”: 10 ulepszeń (silnik, tuner, sprzęgło, zapłon, rama, opony, kask, gogle, własny mechanik, bus).
- Nowa mapa miasta: dzielnice, rzeka z mostami, park, tory kolejowe, nazwy ulic, trasa do celu, pora dnia (noc — zapalone okna).
- Kilka dziewczyn naraz = ryzyko afery: konfrontacja, media, rozmowa z prezesem (obniżka pensji, odsunięcie od składu), konflikt w szatni. Relacje w mediach społecznościowych (📸).
- Odpisywanie na SMS-y (gotowe odpowiedzi z konsekwencjami, np. „wpadnij dziś wieczorem”).
- „Zostań na noc”: natychmiastowe wygaszenie ekranu, rano dziewczyna robi kawę w kuchni.
- Nowe modele 3D (CC0): kasyno (automaty, poker, żyrandole, kasa, strefa lounge), warsztat (podnośnik, montażownica, wyważarka, kombinezon), mieszkanie (kuchnia L z wyspą, jadalnia, komoda, zasłony, lampy wiszące i gładki sufit).
- Poprawka: błąd telefonu przy randce, gdy dziewczyna zdążyła odejść.

## Wersja 1.9 — turnieje, osiedle, garderoba, limity
- Limity czynności: każde zajęcie ma limit dzienny (randka 1× dziennie i 2× w tygodniu, rozmowa i flirt z tą samą osobą raz dziennie, randka w domu i jej elementy raz dziennie, ruletka 12 zakręceń). Wyczerpane zajęcia są wyszarzone na mapie.
- Garderoba dziewczyny (telefon → 👗, randka w domu, zakładka Kariera): 16 strojów (nowe modele postaci Rocketbox), kupowanie ubrań jako prezent.
- Mieszkanie przebudowane i w pełni urządzone: sypialnia, salon z oknem i zasłonami, kuchnia L z wyspą, jadalnia, łazienka za ścianką (wanna, WC, umywalka), przedpokój; kinkiety, plakaty, regał, gitara, kask na komodzie, zegar, grzejnik; domowa siłownia z prawdziwych modeli.
- Osiedle „Tysiąclecia” (nowe miejsce na mapie, 3D): bloki z wielkiej płyty z kolorowymi loggiami, garaże blaszaki, kiosk „Ruch”, trzepak, plac zabaw, pani Halinka na ławce. „Szemrana robota” za garażami — szybkie pieniądze, ale policja: areszt (tygodnie bez miasta i meczów), zawieszenie w lidze, grzywna, zerwane umowy, cięcie kontraktu, kartoteka odstraszająca kluby.
- Turnieje w 3D: Grand Prix (5 rund, klasyfikacja i medale IMŚ), eliminacje GP, dzika karta na GP Polski, reprezentacja (juniorzy i seniorzy). 16 zawodników, 20 biegów, półfinały i finał.
- Liga zagraniczna: kontrakt w Anglii albo Szwecji — mecz w środę, pieniądze za punkty, zmęczenie przed niedzielą.
- Kontuzje: diagnoza, wybór leczenia (NFZ / klinika / zastrzyki), rehabilitacja i basen skracają przerwę, strach po upadku (psycholog).
- Rywale: dwóch stałych rywali z bilansem pojedynków i zaczepkami w mediach.
- Pogoda: prognoza na niedzielę, zmiana prognozy w piątek, deszcz w trakcie meczu, oględziny toru.
- Trener mentalny i rutyna przed startem (mini-gra z oddechem przed biegiem).
- Transfery i wypożyczenia w trakcie sezonu, oświadczyny (pierścionek, miejsce), ślub, zazdrość, obiad u rodziców; rozwód po aferze kosztuje.
- Poprawka błędu przy starcie (brak animacji postaci → teraz zwykła poza).

## Wersja 2.0 — sloty, samouczek, własny motocykl, życie po karierze
- Zapis w 3 slotach (wybór w menu startowym) + autozapis po każdym tygodniu („Wczytaj autozapis”).
- Samouczek pierwszego tygodnia kariery (7 kroków, można pominąć; wyłącza się też w ustawieniach „Podpowiedzi”).
- Twój motocykl (zakładka Sprzęt): obracający się podgląd 3D, kolor ramy, baku i kasku, numer. Tuning zmienia wydech. Kolory widać w meczu, na treningu, w turniejach i w mieszkaniu (kask w biegu zostaje w kolorze pola startowego).
- Nowe animacje postaci (Rocketbox): radość, śmiech, nerwy, taniec, picie, siedzenie przy stole; pocałunek na randce (efekt serc — biblioteka nie ma animacji pocałunku).
- Agent w telefonie (🤝): uczciwy (8%) albo „rekin” (18%, więcej ofert, czasem haczyk w kontrakcie).
- Drużyna i szatnia: relacje z kolegami, kapitan, spór o numer, kolacja dla drużyny; atmosfera wpływa na nastrój i stres.
- Turnieje: Młodzieżowe Indywidualne Mistrzostwa Polski i Złoty Kask. Kontrola antydopingowa po turniejach i meczach (odżywka, tabletka z imprezy).
- Koniec kariery (najpóźniej 37 lat): galeria sław i przejście na prezesa klubu — gra toczy się dalej w trybie menedżera.
- Osiedle o różnych porach dnia (wieczorem gwiazdy, latarnie, zapalone okna); dojazd między miejscami autobusem albo własnym autem.
- Dom rodzinny (nowe miejsce, 3D): obiad u mamy, rozmowa z tatą, trening z młodszym bratem — po 10 treningach brat zdaje licencję i jeździ w twojej drużynie.
- Pies w mieszkaniu (sklep „Dom”): spacery obniżają stres, zaniedbany pies — stres rośnie.
- Samochód (od hatchbacka po coupé: energia co tydzień, prestiż, ryzyko mandatu), inwestycje (szkółka, sklep z gadżetami), podatek po sezonie i księgowa.
- Tryb foto: 📷 albo F8 — zrzut ekranu bez interfejsu do folderu Pobrane.
- Instalacja jako aplikacja (PWA): w Edge/Chrome ikona „Zainstaluj” w pasku adresu; gra działa offline po pierwszym uruchomieniu. Na telefonie potrzebny jest serwer w sieci/Internecie (localhost działa tylko na komputerze).

## Wersja 2.1 — miasto 3D, zegar dobowy, bloki z PRL
- Miasto 3D (Miasto → „🚶 Idź pieszo po mieście”): wszystkie miejsca połączone ulicami — dojdziesz pieszo do parku, baru, kasyna, siłowni, stadionu, osiedla i domu rodziców; rzeka z mostami, park z drzewami i ławkami, stadion z trybunami, ruch uliczny i przechodnie. Wejście do lokalu = drzwi budynku, wyjście = z powrotem na ulicę.
- Szybki transport: przystanki autobusowe przy każdym miejscu (4 zł), taksówka z minimapy (M — duża mapa, kliknij cel; 15 zł).
- Zegar 24 h: każde zajęcie trwa (np. kawa 30 min, trening 2 h, impreza 4 h), chodzenie po mieście zabiera czas, o północy padasz ze zmęczenia. Godzina na ekranie podczas chodzenia i w widoku miasta.
- Bloki na osiedlu i w mieście — prawdziwe modele z wielkiej płyty (OpenGameArt, CC0), garaże blaszaki, przychodnia, szkoła, stacja trafo; drzewa i latarnie z modeli.
- Dom rodzinny: kostka z PRL w mieście, wnętrze z kredensem z talerzami, witryną, telewizorem kineskopowym, kuchenką gazową i wersalką.
- Szemrana robota fizycznie: odbierasz paczkę za garażami i niesiesz ją pieszo do wskazanej osoby (cel na minimapie, termin). Patrole policji — w pobliżu radiowozu lub policjanta kontrola (w biegu częściej); ucieczka albo przeszukanie. Nie zdążysz — dług u dilera.
- Przytulenie i pocałunek na randce — animacja postaci (poza liczona na kościach szkieletu) z ujęciem kamery.
- Krzesła we wszystkich wnętrzach obracają się przodem do stołów, a siedzący ludzie siadają przodem na siedziskach.

## Wersja 2.2 — jedno miasto, realistyczna woda, pościgi
- Osiedle „Tysiąclecia” jest teraz częścią miasta (to samo miejsce pieszo i z mapy) — bloki, garaże, plac zabaw, trzepak, kiosk i diler za garażami na ulicy.
- Budynki nie wchodzą na jezdnię (sprawdzany cały obrys), drzwi lokali przy fasadach; wejście/wyjście z płynnym przejściem.
- Drzewa w mieście fotorealistyczne (jak przy stadionie), latarnie z Poly Haven, rzeka z realistyczną wodą (odbicia i fale) i betonowym nabrzeżem.
- Ruch uliczny: auta trzymają odstęp, hamują przed innymi i przed pieszym, na skrzyżowaniach zdarzają się stłuczki; wtargnięcie pod koła kończy się kontuzją.
- Policja patroluje pieszo; gdy niesiesz paczkę i cię zauważy — goni cię biegiem, aż złapie albo go zgubisz.
- Kasyno z modeli: stół do ruletki i blackjacka, kolumny, bar, neon, fontanna.
- Poprawki: wyjście z siłowni/restauracji nie przenosi na stadion; przycisk „Teraz” w rutynie przed startem (i inne okienka w turnieju) działa.

## Wersja 2.3 — prawdziwe modele z Sketchfab
- Na ulicach jeżdżą Fiat 126p, Fiat 125p, przegubowy Ikarus 280 i polski radiowóz (w tym auta zaparkowane).
- Ruch uliczny uwzględnia długość pojazdu: auta nie wjeżdżają w autobus, a potrącenie liczy się na całej długości auta.
- Siłownia: realistyczne bieżnie, maszyna do wyciskania, stojak z hantlami i klatka do przysiadów.
- Kasyno: stół do ruletki i dwa rodzaje automatów.
- Modele są zoptymalizowane (uproszczona siatka, tekstury WebP 1024 px). Autorzy: `models/CREDITS.txt` (CC BY 4.0).

## Wersja 2.4 — PRL-owskie miasto z prawdziwych modeli
- Miasto: bloki z wielkiej płyty, chruszczowki i 12-piętrowce (Sketchfab) wśród zabudowy; na osiedlu 9-piętrowiec z płyty i murowane garaże.
- Asfalt z oznakowaniem (przerywana linia środkowa), Żuk w ruchu ulicznym.
- Stadion: maszty oświetleniowe, bramki biletowe, brama START, zaparkowane motocykle (Jawa, tracker, crossy).
- Dom rodzinny: meblościanka, kineskopowy telewizor, pokój z dzieciństwa z lat 90., zlew i butle gazowe.
- Biuro klubu: kaktus, kaloryfer, magnetofon szpulowy, kask retro na gablocie.
- Znaki firmowe i cudze grafiki z modeli zostały zastąpione fikcyjnymi. Autorzy: `models/CREDITS.txt`.

## Wersja 2.5 — prawdziwy stadion w mieście, drzwi bez ładowania
- W mieście stoi prawdziwy stadion klubu (te same trybuny, tor, maszty i fasada co w meczu), na placu przy ul. Stadionowej. Teren stadionu jest nieprzechodni, wejście przez bramę.
- Mapa miasta ponad 2× większa (760 × 540 m), budynki nie stoją już w rzece ani na drogach (sprawdzane są wszystkie narożniki).
- Drzwi-portale: podchodzisz do lokalu, drzwi się otwierają i przez otwór widać prawdziwe wnętrze; przejście przez próg = jesteś w środku, bez ekranu ładowania. Wyjście drzwiami stawia cię na chodniku.
- Nowa minimapa: okrągła, obraca się z widokiem, pokazuje ulice z nazwami, rzekę, obrysy budynków, stadion, auta i radiowozy; ikony miejsc poza zasięgiem na krawędzi. Duża mapa (M) z nazwami miejsc.
- Kolizje z jadącymi autami (nie da się przez nie przenikać).
- 25 nowych postaci Rocketbox: sportowcy, policjantki i policjanci (każdy radiowóz ma inną załogę), kucharka, ochrona, pielęgniarka, ludzie w strojach biznesowych.
- Dom rodziców: mama gotuje, siostra chodzi po domu (telefon, zlew, rozmowa z bratem); poprawione wymiary zlewu i butli gazowych.
- Kasyno: drugi stół do ruletki zamiast fontanny nałożonej na stół do pokera.
- Wydajność: uproszczone latarnie, budynki rysowane tylko w kadrze, krzesełka stadionu tylko z bliska.

## Wersja 2.6 — edytor mapy, stadion żużlowy, nowe budynki, tylna sala baru, mieszkanie rodziców
- **Edytor mapy** (F9 albo 🛠 w mieście): widok z góry, paleta budynków, zieleni, elementów ulicy, pojazdów i rzeczy stadionowych; stawianie, przesuwanie, obrót (R), skala ([ ]), usuwanie (Delete) — także budynków z generatora; cofnij (Ctrl+Z); układ zapisuje się sam, eksport/import do pliku .json.
- **Własne modele**: przycisk „Własny model (.glb)” — plik zapisuje się w przeglądarce i można go stawiać na mapie.
- **Stadion żużlowy w mieście**: skan prawdziwego stadionu żużlowego (tor, trybuny, maszty, budynek klubowy), przycięty i wstawiony na plac przy ul. Stadionowej.
- **Nowe budynki**: kamienice, ceglane domy ze sklepem, stare kamienice, bloki z płyty i wieżowiec, stary sklep — zamiast pastelowych klocków; lokale (bar, siłownia, restauracja, kawiarnia, kasyno, psycholog, klub) w nowych budynkach, z szyldami nad drzwiami.
- **Bar „Pod Taśmą”**: nowa tylna sala (skórzane loże, łukowa lada, wentylatory), nowy stół bilardowy i szafa grająca (można puścić piosenkę), kelnerka krąży między stolikami.
- **Kasyno**: wielkie koło ruletki kręci się na ścianie.
- **Dom rodziców**: całe mieszkanie (salon, jadalnia, kuchnia, sypialnie, łazienka) zamiast jednego pokoju; mama w kuchni, tata w salonie, brat w swoim pokoju, siostra chodzi po domu.
- Kolizje ścian i mebli liczone z geometrii modeli; gracz nie utknie w meblu (automatyczne przesunięcie na wolne miejsce).
