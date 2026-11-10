---
name: git-speichern
description: Speichert die aktuellen Änderungen der Wetter-App mit Git und lädt sie auf GitHub hoch (add, commit, push). Lädt auch Commits hoch, die schon gespeichert, aber noch nicht auf GitHub sind. Mit einer guten deutschen Commit-Nachricht und einer Sicherheitsprüfung vorher.
disable-model-invocation: true
argument-hint: "[optionale Commit-Nachricht]"
---

# Git speichern 💾

Speichere die Änderungen sicher und lade sie auf GitHub hoch. Erkläre jeden Schritt **kurz auf Deutsch**, denn der Benutzer lernt Git gerade.

## Schritt 1: Was hat sich geändert?
Führe aus:
```
git status --short
git diff --stat
git fetch
git log --oneline origin/main..HEAD
```
Der letzte Befehl zeigt Commits, die schon **gespeichert**, aber noch **nicht auf GitHub** sind.

Danach gibt es drei Fälle:
- **Geänderte Dateien vorhanden:** Zeig eine kurze Liste und mach weiter mit Schritt 2.
- **Keine geänderten Dateien, aber Commits noch nicht auf GitHub:** Zeig die Liste dieser Commits und erkläre kurz: „Diese Commits sind gespeichert, aber noch nicht hochgeladen.“ Mach den Sicherheits-Check aus Schritt 2 mit `git diff origin/main..HEAD`. Überspring Schritt 3 und führe in Schritt 4 nur `git push` aus.
- **Weder Änderungen noch Commits zum Hochladen:** Sag „Nichts zu speichern ✅ – alles ist schon auf GitHub.“ und hör auf.

## Schritt 2: Sicherheits-Check 🔒
Prüfe die Änderungen (`git diff`) auf:
- API-Keys, Passwörter, Tokens (z.B. `key=`, `token`, `password`, `sk-`)
- Dateien wie `.env`, die nicht auf GitHub dürfen

Wenn du etwas Verdächtiges findest: **STOPP**. Nichts committen. Sag dem Benutzer, was du gefunden hast.

## Schritt 3: Commit-Nachricht
- Wenn der Benutzer eine Nachricht mitgegeben hat, benutze sie: $ARGUMENTS
- Sonst schreib selbst eine:
  - **Erste Zeile:** kurz, auf Deutsch, sagt WAS sich geändert hat (max. 60 Zeichen). Beispiel: `5-Tage-Vorhersage hinzugefügt`
  - **Danach:** eine Leerzeile und eine Liste mit `-` pro geänderter Datei
  - **Nicht:** „Update“, „Fix“, „Änderungen“. Das ist zu ungenau.

## Schritt 4: Speichern und hochladen
```
git add <nur die geänderten Dateien, einzeln nennen>
git commit -m "<Nachricht>"
git push
```
Benutze **nie** `git add .` blind. Nenne die Dateien einzeln.
Benutze **nie** `--force`.

## Schritt 5: Ergebnis zeigen
Führe `git log --oneline -3` aus und zeig das Ergebnis.
Sag am Ende: „✅ Gespeichert und auf GitHub hochgeladen“ mit dem Link
https://github.com/PetarAtanasov/wetter-app

## Wenn etwas schiefgeht
- **push abgelehnt (rejected):** Erst `git pull` ausführen, dann nochmal pushen. Erkläre, dass GitHub neuere Änderungen hat.
- **Anmeldung nötig:** Der Benutzer muss sich selbst im Browser-Fenster bei GitHub anmelden.
