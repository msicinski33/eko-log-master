
# EKO-LOG — Plan kalendarza odbioru odpadów (v2)

Aplikacja w języku polskim. Styl Neo-Brutalism / Modern Industrial, ciemny motyw domyślny, grube obramowania, twarde cienie `4px 4px 0 #000`, wysokie kontrasty.

## Stos
- TanStack Start + React 19 + Tailwind v4 + shadcn/ui
- lucide-react, date-fns (locale `pl`), @dnd-kit/core
- Persistencja: `localStorage` (zero backendu)

## Nowości względem v1
1. **Dwa segmenty kalendarza:** `mieszkańcy` (residential) i `firmy` (non-residential). Pulpit ma przełącznik (Tabs) na górze; reguły, overrides i święta są przypisane do segmentu. Frakcje są wspólne.
2. **Tryb ręcznych dat (Multi-Date Rule):** oprócz reguł cyklicznych, użytkownik może utworzyć trasę i ręcznie wskazać dowolne dni w roku na kalendarzu — np. „Rejon X — raz w miesiącu w wybrane dni". Trafiają do tego samego pulpitu.

## Model danych

```ts
type Segment = "residential" | "business";

type Fraction = { id; pattern; color; label? };

type Rule = {
  id; segment: Segment; name;
  mode: "recurring" | "manual";
  // recurring:
  dayOfWeek?: 1|2|3|4|5|6;
  recurrence?: "1w"|"2w"|"4w";
  startDate?: string;
  // manual:
  dates?: string[]; // ISO list, dowolne daty w roku
};

type Override = { id; ruleId; segment; originalDate?; date; deleted? };
type Holiday  = { date; label?; segment: Segment | "both" };
```

Klucze localStorage: `ekolog.fractions`, `ekolog.rules`, `ekolog.overrides`, `ekolog.holidays`.

## Trasy
```
src/routes/
  __root.tsx       -> dark layout + sidebar + Toaster
  index.tsx        -> /  Pulpit tygodniowy (Tabs: Mieszkańcy | Firmy) + Drukuj
  rules.tsx        -> /rules  Reguły (filtr po segmencie, formularz Recurring|Manual)
  fractions.tsx    -> /fractions  Słownik Frakcji (wspólny)
  holidays.tsx     -> /holidays  Święta (z wyborem segmentu)
```

## Silnik reguł
- `expandRecurring(rule, from, to)` — pierwsza data ≥ startDate w `dayOfWeek`, iteracja +7/+14/+28.
- `expandManual(rule, from, to)` — filtruje `rule.dates` do zakresu.
- `getWeekOccurrences(weekStart, segment)` — łączy reguły danego segmentu, aplikuje overrides, oznacza święta.

## Formularz reguły `/rules`
Pola wspólne: Nazwa rejonu, Segment (Mieszkańcy/Firmy), Tryb (Cykliczny/Ręczne daty).
- **Cykliczny:** Dzień tygodnia, Powtarzalność (1/2/4 tyg), Data startowa.
- **Ręczne daty:** osadzony shadcn `Calendar mode="multiple"` (12 miesięcy widocznych przez nawigację), licznik wybranych dat, lista dat z możliwością usunięcia pojedynczych. Zapis ustawia `mode="manual"` i `dates`.
Tabela reguł filtrowana zakładkami Mieszkańcy/Firmy/Wszystkie; w wierszu znacznik trybu (Cykl / Ręcznie), licznik wystąpień w bieżącym roku, akcja Usuń.

## Pulpit `/`
- Pasek górny: nawigacja tygodni, zakres dat, **Tabs: Mieszkańcy | Firmy** (segment wpływa na całą siatkę).
- Siatka pn–sb (`grid-cols-6`), w każdej kolumnie nagłówek + `RouteCard` dla wystąpień danego segmentu.
- Kliknięcie nagłówka dnia → toggle święta dla bieżącego segmentu (lub „dla obu" w menu kontekstowym).
- Kolumny świąteczne: pasy `repeating-linear-gradient(45deg, #000 0 8px, #FBBF24 8px 16px)` opacity 0.2, ribbon „DZIEŃ WOLNY".
- Karta na święto: ikona `AlertTriangle` w rogu.
- DnD: przeciągnięcie karty na inną kolumnę tworzy `Override` (oryginalna reguła nietknięta). Edycja przez Dialog z DatePicker dla zmiany jednorazowej.

## Słownik Frakcji `/fractions`
Tabela: Pattern, Kolor (HEX + color picker), Etykieta, Usuń. `resolveColor(name)` = pierwsze `includes` (case-insensitive). Seedy: bio #7CB342, zmieszane #212121, plastik #FFC107, papier #1976D2, szkło #43A047.

## Święta `/holidays`
Shadcn `Calendar mode="multiple"`, przy zapisie wybór segmentu (Mieszkańcy / Firmy / Oba). Lista poniżej z etykietą i Usuń.

## RouteCard
Border 2–3px solid (kolor frakcji lub czarny), tło = kolor frakcji z 15% nasycenia w trybie ciemnym, `shadow-[4px_4px_0_0_#000]`, tytuł `font-black uppercase`. Badge segmentu na karcie (mała plakietka „M" / „F").

## Druk (A4 landscape)
`@media print` w `styles.css`:
```css
@page { size: A4 landscape; margin: 10mm; }
html, body { background:#fff !important; color:#000 !important;
             -webkit-print-color-adjust:exact; print-color-adjust:exact; }
[data-print-hide] { display:none !important; }
.route-card { box-shadow: 2px 2px 0 0 #000 !important; break-inside: avoid; }
```
Sidebar/header → `data-print-hide`. Nagłówek wydruku zawiera nazwę segmentu i zakres dat. Przycisk „Drukuj tydzień" → `window.print()`.

## Tokeny (`src/styles.css`, dark default)
- `--background: oklch(0.16 0.01 250)`, `--foreground: oklch(0.98 0 0)`
- `--primary: oklch(0.78 0.18 85)` (industrial yellow)
- `--accent: oklch(0.65 0.22 25)` (alert orange)
- `--border: oklch(0.98 0 0)`, `--radius: 0.5rem`
- Fonty: Space Grotesk (headings) + Inter (body) z Google Fonts

## Kolejność implementacji
1. Tokeny brutalist + dark default + fonty.
2. `__root.tsx` + Sidebar + Toaster.
3. Hook `useLocalStore`, typy, helpery (`expand*`, `resolveColor`, `getWeekOccurrences`).
4. `/fractions` (CRUD + seedy).
5. `/rules` (formularz Cykliczny/Ręczny z multi-date, lista filtrowana po segmencie).
6. `/holidays` (multi-select + segment).
7. `/` Pulpit z Tabs Mieszkańcy/Firmy, święta, DnD, edycja jednorazowa.
8. Style druku + przycisk Drukuj.

## Założenia
- Bez kont — dane w localStorage przeglądarki.
- Tydzień pn–sb (niedziela ukryta).
- Frakcje wspólne dla obu segmentów; reguły, overrides i święta segmentowe.

Daj znak — implementuję.
