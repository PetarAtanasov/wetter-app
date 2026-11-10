---
name: testen
description: Testet die Wetter-App automatisch im Browser-Fenster - Stadtsuche, 5-Tage-Vorhersage, Tag anklicken, Fehlermeldungen und Handy-Ansicht. Benutzen nach jeder Änderung an index.html, app.js oder style.css, oder wenn jemand fragt "funktioniert die App?".
argument-hint: "[optionale Stadt, Standard: Berlin]"
---

# App testen 🧪

Prüfe die Wetter-App im eingebauten Browser. Ändere dabei **keine** Dateien. Erkläre das Ergebnis **kurz auf Deutsch**, denn der Benutzer lernt gerade.

Test-Stadt: $ARGUMENTS (wenn leer: `Berlin`)

## Schritt 1: App starten
Starte die App mit `preview_start` und dem Namen `wetter-app` (steht in `.claude/launch.json`).
Lade die Seite einmal neu, damit die neueste Version läuft.

## Schritt 2: Die Tests
Benutze `javascript_tool`, um das Formular auszufüllen und abzuschicken
(`#stadt-eingabe` setzen, dann `#such-formular.requestSubmit()`), und warte ca. 3 Sekunden auf die Antwort.

Prüfe:
1. **Suche:** Nach der Suche ist `#meldung` leer und `#wetter` ist sichtbar.
2. **Vorhersage:** In `#vorhersage` gibt es genau **5** Tage.
3. **Tag anklicken:** Klicke auf den 3. Tag. Die große Anzeige ändert sich und der Tag ist als aktiv markiert. Klicke dann den 1. Tag: Das aktuelle Wetter ist wieder da.
4. **Zweite Suche:** Suche eine andere Stadt (z.B. `Sofia`). Es sind immer noch genau 5 Tage, nicht 10.
5. **Unbekannte Stadt:** Suche `Xyzqwertstadt`. Es erscheint „Stadt nicht gefunden“.
6. **Kein Internet:** Ersetze kurz `window.fetch` durch eine Funktion, die mit `new TypeError("Failed to fetch")` fehlschlägt. Dann muss eine **deutsche** Meldung erscheinen. Danach `fetch` wiederherstellen!
7. **Fehler in der Konsole:** `read_console_messages` mit `onlyErrors: true` muss leer sein.
8. **Layout auf vielen Bildschirmen:** Lege zuerst diese Prüf-Funktion an:
   ```js
   window.pruefe = () => {
     const k = document.querySelector('.karte').getBoundingClientRect();
     const raus = [...document.querySelectorAll('.karte *')].filter(el => {
       if (el.closest('#stunden') && el.id !== 'stunden') return false; // in der Leiste darf gescrollt werden
       const r = el.getBoundingClientRect();
       return r.width > 0 && (r.right > k.right + 0.5 || r.left < k.left - 0.5);
     }).map(el => el.id || el.className || el.tagName);
     return { breite: innerWidth, seite: document.documentElement.scrollHeight, fenster: innerHeight,
              seitlich: document.documentElement.scrollWidth > innerWidth, raus: [...new Set(raus)] };
   };
   ```
   Teste dann mit `resize_window` diese Größen: **360×740, 390×844, 768×1024, 900×700, 1280×720, 1366×768, 1600×800, 1920×1080**.
   Prüfe jede Größe **zweimal**, einmal mit „Heute“ (das ist der längste Fall mit 12 Stunden) und einmal mit einem anderen angeklickten Tag.
   - `raus` muss leer sein, sonst ragt etwas aus der Karte.
   - `seitlich` muss `false` sein.
   - `seite` darf nicht größer als `fenster` sein, sonst muss man scrollen.
   Mach einen Screenshot vom Handy (390×844) und vom Laptop (1366×768) und **schau ihn dir genau an**. Ragt etwas über den Rand der weißen Karte? Danach wieder auf `desktop` stellen.

## Schritt 3: Ergebnis
Zeig eine kurze Liste:

```
✅ Suche
✅ 5-Tage-Vorhersage
❌ Tag anklicken – <was genau falsch war>
...
```

Am Ende: „Alles in Ordnung ✅“ oder „X Probleme gefunden ❌“.
Wenn etwas kaputt ist: **nicht selbst reparieren**, sondern erklären, was kaputt ist und in welcher Datei es vermutlich liegt.
