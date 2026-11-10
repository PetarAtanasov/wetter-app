---
name: git-speichern
description: Speichert die aktuellen Änderungen der Wetter-App mit Git und lädt sie auf GitHub hoch (add, commit, push). Mit einer guten deutschen Commit-Nachricht und einer Sicherheitsprüfung vorher.
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
```
- Wenn es **keine Änderungen** gibt: Sag „Nichts zu speichern ✅“ und hör auf.
- Zeig dem Benutzer eine kurze Liste der geänderten Dateien.

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
