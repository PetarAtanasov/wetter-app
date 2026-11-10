---
name: testen
description: Testet die Schweiz-Wetter-App automatisch im Browser-Fenster - Städteliste, Detailansicht, Tage anklicken, Suche, Fehlermeldungen, Handy/Laptop und ob etwas springt. Benutzen nach jeder Änderung an index.html, app.js oder style.css, oder wenn jemand fragt "funktioniert die App?".
argument-hint: "[optionaler Ort zum Suchen, Standard: Kaisten]"
---

# App testen 🧪

Prüfe die Wetter-App im eingebauten Browser. Ändere dabei **keine** Dateien. Erkläre das Ergebnis **kurz auf Deutsch**, denn der Benutzer lernt gerade.

Such-Ort: $ARGUMENTS (wenn leer: `Kaisten`)

## Schritt 1: App starten
Starte die App mit `preview_start` und dem Namen `wetter-app` (steht in `.claude/launch.json`).
Lade die Seite neu (`navigate` auf `http://localhost:8080/`) und warte ca. 3 Sekunden.

## Wichtige Teile der Seite
- `.panel` = das Glas-Panel (Laptop: Karte links, Detail rechts; Handy: Karte oben, Detail darunter).
- `.landkarte a` = die 12 festen Städte auf der Schweiz-Karte: Punkt (`.marker-punkt`) und schlichter Text (`.marker-name`, `.marker-temp`), keine Knöpfe. Jede Stadt hat ein `aria-label` wie „Zürich, 14 Grad, Bewölkt“. Es kommen **nie** neue Städte dazu.
- Oben links die Schweizer Flagge (`role="img"`, Name „Schweiz“) und das Datum.
- **Wichtig beim Testen:** Im ausgeblendeten Browser-Fenster läuft der `ResizeObserver` nicht. Rufe deshalb nach jedem `resize_window` einmal `setzeSeiten()` auf. Das ist kein Fehler der App.
- `#stadt-name` (h1), `#temperatur`, `#temperatur-tief`, `#beschreibung`, `#details-zeile` = Detailansicht.
- `#vorhersage button` = die 5 Tage.
- `#such-formular`, `#stadt-eingabe`, `.such-knopf` = Suche (nur Schweiz).
- `#meldung` = schwebende Meldung, `#nochmal-knopf` = „Erneut versuchen“.

Hilfsfunktion für die Panel-Größe:
```js
const panel = () => { const k = document.querySelector('.panel').getBoundingClientRect();
  return `${Math.round(k.top)}/${Math.round(k.width)}x${Math.round(k.height)}`; };
```

## Schritt 2: Die Tests
1. **Start:** Auf der Karte stehen genau 12 Städte mit echten Temperaturen und nicht mehr mit „–°“.
2. **Stadt anklicken:** Klicke **alle** Marker nacheinander. Der Hash wechselt (z.B. `#bern`), `#stadt-name` zeigt die Stadt, und genau ein Marker hat `aria-current="true"`.
3. **Tage anklicken:** Klicke alle 5 Tage und dann wieder „Heute“. Bei einem anderen Tag zeigt die Überschrift das Datum und die Temperatur „X° / Y°“. „Heute“ zeigt wieder das aktuelle Wetter.
4. **Suche:** Suche den Such-Ort. Er erscheint **nur in der Detailansicht** und **nicht** auf der Karte. Auf der Karte stehen weiter genau 12 Städte, keine ist aktiv (`aria-current`), und der Hash ist `#ort`. Suche dann `Lugano`: Die vorhandene Stadt wird gewählt (`#lugano`). `history.back()` führt zurück zum gesuchten Ort.
5. **Fehler:** Suche `Xyzqwertstadt` (Meldung „Ort nicht gefunden.“) und `   ` (Meldung „Bitte gib einen Ort ein.“). Ersetze kurz `window.fetch` durch eine Funktion, die mit `new TypeError("Failed to fetch")` fehlschlägt. Dann muss die deutsche Meldung „Keine Verbindung …“ erscheinen. Danach `fetch` wiederherstellen!
6. **Unbekannter Hash:** Setze `location.hash = '#xyz'`. Es darf nichts abstürzen.
7. **Konsole:** `read_console_messages` mit `onlyErrors: true` muss leer sein.

## Schritt 3: Nichts springt (sehr wichtig!)
8. **Gleiche Panel-Größe:** Bei allen Klicks aus Test 2, 3 und 5 muss `panel()` **immer gleich** bleiben. Schon 1 px Unterschied heißt: die Karte springt ❌.
9. **Neuladen:** Lade die Seite neu und lies die Layout-Verschiebungen aus:
   ```js
   const e = []; await new Promise(res => { new PerformanceObserver(l => { e.push(...l.getEntries()); res(); })
     .observe({ type: 'layout-shift', buffered: true }); setTimeout(res, 500); });
   e.reduce((a, x) => a + x.value, 0)   // muss 0 sein
   ```
10. **Langsames Internet:** Bremse `fetch` künstlich (750 ms) und suche einen Ort. Zeichne dabei mit `requestAnimationFrame` **jeden Frame** `panel()` auf. Die Größe darf sich nicht ändern.

## Schritt 4: Viele Bildschirme
11. Teste mit `resize_window` diese Größen: **360×740, 390×844, 768×1024, 900×700, 1280×720, 1366×768, 1600×800, 1920×1080**.
    - Die Seite darf nicht scrollen (`document.documentElement.scrollHeight` ≤ `innerHeight`, `scrollWidth` ≤ `innerWidth`).
    - Kein Element ragt aus `.panel` heraus.
    - **Keine Beschriftung überdeckt eine andere.** Wähle jede Stadt einmal. Vergleiche dann die **einzelnen Teile** (`.marker-punkt`, `.marker-name`, `.marker-temp`, `.ic`) jeder Stadt mit den Teilen aller anderen Städte per `getBoundingClientRect`. Nimm **kein** großes Rechteck um eine ganze Stadt, sonst meldet der Test Überlappungen, die man gar nicht sieht.
    - **Handy (unter 900 px):** Karte oben, Detail darunter. Ein Tipp auf einen Marker wechselt die Stadt, und `history.back()` führt zur vorherigen Stadt.
    - **Laptop (ab 900 px):** Karte links, Detail rechts.
12. Mach Screenshots vom Handy und vom Laptop und **schau sie dir genau an**. Achte darauf, ob etwas abgeschnitten ist, sich überlappt oder schlecht lesbar ist. Prüfe auch den Dark Mode (`resize_window` mit `colorScheme: "dark"`). Danach wieder auf `desktop` und `light` stellen.

## Schritt 5: Ergebnis
Zeig eine kurze Liste:

```
✅ Start: 12 Städte
✅ Stadt anklicken
❌ Tage anklicken – <was genau falsch war>
...
```

Am Ende: „Alles in Ordnung ✅“ oder „X Probleme gefunden ❌“.
Wenn etwas kaputt ist: **nicht selbst reparieren**, sondern erklären, was kaputt ist und in welcher Datei es vermutlich liegt.
