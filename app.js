// ===================================================
// Wetter-App – die Logik
// Wir benutzen die kostenlose Open-Meteo API (kein Schlüssel nötig)
// ===================================================

// 1) Elemente aus dem HTML holen, damit wir sie ändern können
const formular = document.getElementById("such-formular");
const eingabe = document.getElementById("stadt-eingabe");
const meldung = document.getElementById("meldung");
const wetterBereich = document.getElementById("wetter");

// Hier merken wir uns die geladenen Daten, damit ein Klick auf einen Tag
// nicht neu laden muss. (stadt, aktuell, stuendlich, taeglich)
let geladeneDaten = null;
// Zähler für Anfragen: So erkennen wir, ob eine Antwort veraltet ist
// (eine ältere Antwort darf nie eine neuere überschreiben)
let anfrageNummer = 0;

// 2) Wettercodes (Zahlen) in Emoji + Text + Hintergrund-Art übersetzen
//    Open-Meteo schickt z.B. 0 = klar, 61 = Regen
//    Der dritte Wert ist für den Hintergrund (data-wetter am body)
function wetterBeschreibung(code) {
  if (code === 0) return ["☀️", "Klarer Himmel", "sonne"];
  if (code <= 2) return ["🌤️", "Leicht bewölkt", "sonne"];
  if (code === 3) return ["☁️", "Bewölkt", "wolken"];
  if (code <= 48) return ["🌫️", "Nebel", "nebel"];
  if (code <= 57) return ["🌦️", "Nieselregen", "regen"];
  if (code <= 67) return ["🌧️", "Regen", "regen"];
  if (code <= 77) return ["❄️", "Schnee", "schnee"];
  if (code <= 82) return ["🌧️", "Regenschauer", "regen"];
  if (code <= 86) return ["🌨️", "Schneeschauer", "schnee"];
  return ["⛈️", "Gewitter", "gewitter"];
}

// 3) Stadtname -> Koordinaten (Breitengrad/Längengrad)
//    "async" heißt: diese Funktion wartet auf das Internet
async function findeStadt(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=de`;
  const antwort = await fetch(url, { signal: AbortSignal.timeout(10000) }); // Anfrage ans Internet schicken (max. 10 Sekunden)
  if (!antwort.ok) {
    throw new Error("Die Stadtsuche ist gerade nicht erreichbar. Bitte später nochmal versuchen.");
  }
  const daten = await antwort.json();     // Antwort in ein JS-Objekt umwandeln

  if (!daten.results || daten.results.length === 0) {
    throw new Error("Stadt nicht gefunden 😕");
  }
  return daten.results[0]; // die erste (beste) Übereinstimmung
}

// 4) Koordinaten -> aktuelles Wetter + stündlich + Vorhersage für 5 Tage (eine Anfrage)
async function holeWetter(breite, laenge) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${breite}&longitude=${laenge}`
    + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`
    + `&hourly=temperature_2m,weather_code`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset`
    + `&timezone=auto&forecast_days=5`;
  const antwort = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!antwort.ok) {
    throw new Error("Die Wetterdaten konnten nicht geladen werden. Bitte später nochmal versuchen.");
  }
  const daten = await antwort.json();
  // Alles zurückgeben: aktuelles Wetter, Stundenwerte und Tagesdaten
  return { aktuell: daten.current, stuendlich: daten.hourly, taeglich: daten.daily };
}

// 5) Kleine Helfer
// Kurzer Wochentag, z.B. "Mi" (der Punkt am Ende wird entfernt)
function kurzerWochentag(datum) {
  // "T12:00" anhängen, damit die Zeitzone das Datum nicht verschiebt
  return new Date(datum + "T12:00").toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
}

// Datum "2025-11-12" -> "12.11."
function kurzesDatum(datum) {
  return `${datum.slice(8, 10)}.${datum.slice(5, 7)}.`;
}

// "YYYY-MM-DDTHH:MM" -> "HH:MM". Bei null (kein Wert) kommt "–" zurück
function uhrzeitVon(wert) {
  return wert ? wert.slice(11, 16) : "–";
}

// Ein Element mit seiner ID ein- oder ausblenden
function setzeSichtbar(id, sichtbar) {
  document.getElementById(id).hidden = !sichtbar;
}

// Eine Fehlermeldung in #meldung anzeigen
function zeigeFehler(fehler) {
  zeigeMeldungsText(fehler);
  // Wird schon Wetter angezeigt, schwebt die Meldung als Blase über der Karte.
  // Die blenden wir nach 5 Sekunden wieder aus, damit sie nichts verdeckt.
  if (!wetterBereich.hidden) {
    const text = meldung.textContent;
    setTimeout(() => {
      if (meldung.textContent === text) meldung.textContent = "";
    }, 5000);
  }
}

function zeigeMeldungsText(fehler) {
  // Zu lange gewartet (Timeout nach 10 Sekunden)
  if (fehler.name === "TimeoutError") {
    meldung.textContent = "Der Server antwortet nicht ⏱️ Bitte später nochmal versuchen.";
    return;
  }
  // fetch wirft einen "TypeError", wenn gar keine Verbindung möglich ist
  // (z.B. kein Internet). Die englische Meldung "Failed to fetch" ersetzen wir.
  if (fehler instanceof TypeError) {
    meldung.textContent = "Keine Verbindung zum Wetter-Server 📡 Bitte prüfe dein Internet.";
  } else {
    meldung.textContent = fehler.message || "Etwas ist schiefgelaufen.";
  }
}

// 6) Die große Anzeige füllen (index 0 = aktuelles Wetter, sonst ein späterer Tag)
function zeigeHauptanzeige(index) {
  const d = geladeneDaten;
  const heute = index === 0;
  const tag = d.taeglich;

  // Überschrift aus zwei Teilen: Ort (wird bei Platzmangel mit "…" gekürzt)
  // und Datum (wird nie gekürzt). So bleibt sie immer EINE Zeile hoch
  // und die Karte springt beim Anklicken eines Tages nicht.
  const ueberschrift = document.getElementById("stadt-name");
  ueberschrift.textContent = ""; // alten Inhalt leeren
  const ortTeil = document.createElement("span");
  ortTeil.className = "hero-ort-name";
  ortTeil.textContent = d.stadt.land ? `${d.stadt.name}, ${d.stadt.land}` : d.stadt.name;
  ortTeil.title = ortTeil.textContent; // voller Name beim Drüberfahren mit der Maus
  ueberschrift.append(ortTeil);
  // Bei einem anderen Tag hängen wir Wochentag und Datum an
  if (!heute) {
    const datumTeil = document.createElement("span");
    datumTeil.className = "hero-datum";
    datumTeil.textContent = ` – ${kurzerWochentag(tag.time[index])}, ${kurzesDatum(tag.time[index])}`;
    ueberschrift.append(datumTeil);
  }

  // Heute: Code vom aktuellen Wetter, sonst vom Tag
  const code = heute ? d.aktuell.weather_code : tag.weather_code[index];
  const [emoji, text, art] = wetterBeschreibung(code);

  document.getElementById("wetter-icon").textContent = emoji;
  document.getElementById("beschreibung").textContent = text;
  document.body.setAttribute("data-wetter", art); // für den Hintergrund

  if (heute) {
    document.getElementById("temperatur").textContent = `${Math.round(d.aktuell.temperature_2m)}°C`;
    document.getElementById("gefuehlt").textContent = `${Math.round(d.aktuell.apparent_temperature)}°C`;
    document.getElementById("feuchtigkeit").textContent = `${d.aktuell.relative_humidity_2m}%`;
    document.getElementById("wind-titel").textContent = "Wind";
    document.getElementById("wind").textContent = `${d.aktuell.wind_speed_10m} km/h`;
  } else {
    document.getElementById("temperatur").textContent = `${Math.round(tag.temperature_2m_max[index])}° / ${Math.round(tag.temperature_2m_min[index])}°`;
    document.getElementById("regen").textContent = `${tag.precipitation_probability_max[index]}%`;
    document.getElementById("wind-titel").textContent = "Max. Wind";
    document.getElementById("wind").textContent = `${tag.wind_speed_10m_max[index]} km/h`;
  }

  // Sonnenaufgang und -untergang dieses Tages ("YYYY-MM-DDTHH:MM" -> "HH:MM")
  // (in Polarregionen kann der Wert null sein, dann zeigen wir "–")
  document.getElementById("sonnenaufgang").textContent = uhrzeitVon(tag.sunrise[index]);
  document.getElementById("sonnenuntergang").textContent = uhrzeitVon(tag.sunset[index]);

  // Nicht passende Zeilen ausblenden
  setzeSichtbar("gefuehlt-zeile", heute);
  setzeSichtbar("feuchtigkeit-zeile", heute);
  setzeSichtbar("regen-zeile", !heute);
}

// 7) Die stündliche Leiste füllen
//    Heute: die nächsten 12 Stunden. Anderer Tag: alle 3 Stunden (00, 03, ... 21)
function zeigeStunden(index) {
  const liste = document.getElementById("stunden");
  liste.textContent = ""; // alte Einträge löschen

  const st = geladeneDaten.stuendlich;
  const welche = []; // hier sammeln wir die Positionen (Indizes), die wir zeigen

  if (index === 0) {
    // "2025-11-12T14:15" -> "2025-11-12T14:00" (so sehen die Stunden-Zeiten aus)
    const jetzt = geladeneDaten.aktuell.time.slice(0, 13) + ":00";
    const start = st.time.indexOf(jetzt);
    // Wird die Stunde nicht gefunden, bleibt die Leiste leer
    if (start !== -1) {
      for (let i = start; i < start + 12 && i < st.time.length; i++) {
        welche.push(i);
      }
    }
  } else {
    const datum = geladeneDaten.taeglich.time[index];
    st.time.forEach((zeit, i) => {
      const stunde = Number(zeit.slice(11, 13));
      if (zeit.startsWith(datum) && stunde % 3 === 0) {
        welche.push(i);
      }
    });
  }

  // Für jede Stunde ein kleines Kästchen bauen
  welche.forEach((i) => {
    const [emoji] = wetterBeschreibung(st.weather_code[i]);

    const eintrag = document.createElement("li");
    eintrag.className = "stunde";

    const uhrzeit = document.createElement("span");
    uhrzeit.textContent = st.time[i].slice(11, 16);

    const icon = document.createElement("span");
    icon.className = "stunde-icon";
    icon.textContent = emoji;

    const temp = document.createElement("span");
    temp.textContent = `${Math.round(st.temperature_2m[i])}°`;

    eintrag.append(uhrzeit, icon, temp);
    liste.appendChild(eintrag);
  });

  liste.scrollLeft = 0; // ganz nach links zurückscrollen
}

// 8) Die Vorhersage für die nächsten Tage anzeigen (jeder Tag ist ein Button)
function zeigeVorhersage(taeglich) {
  const liste = document.getElementById("vorhersage");
  liste.textContent = ""; // alte Einträge löschen

  // Für jeden Tag ein kleines Kästchen bauen
  taeglich.time.forEach((datum, i) => {
    const [emoji] = wetterBeschreibung(taeglich.weather_code[i]);

    const eintrag = document.createElement("li");

    // Der Button macht den Tag per Tastatur und Screenreader bedienbar
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "vorhersage-tag";
    // Beschriftung für Screenreader, z.B. "Mittwoch, 12.11.: Regen, 13 bis 6 Grad"
    const langerTag = i === 0 ? "Heute" : new Date(datum + "T12:00").toLocaleDateString("de-DE", { weekday: "long" });
    const [, beschreibungstext] = wetterBeschreibung(taeglich.weather_code[i]);
    tag.setAttribute(
      "aria-label",
      `${langerTag}, ${kurzesDatum(datum)}: ${beschreibungstext}, ${Math.round(taeglich.temperature_2m_max[i])} bis ${Math.round(taeglich.temperature_2m_min[i])} Grad`
    );
    tag.addEventListener("click", () => waehleTag(i));

    const name = document.createElement("span");
    name.textContent = i === 0 ? "Heute" : kurzerWochentag(datum);

    const icon = document.createElement("span");
    icon.className = "vorhersage-icon";
    icon.textContent = emoji;

    const temp = document.createElement("span");
    temp.textContent = `${Math.round(taeglich.temperature_2m_max[i])}° / ${Math.round(taeglich.temperature_2m_min[i])}°`;

    tag.append(name, icon, temp);
    eintrag.appendChild(tag);
    liste.appendChild(eintrag);
  });
}

// 9) Einen Tag auswählen: große Anzeige, Stunden und Markierung aktualisieren
function waehleTag(index) {
  zeigeHauptanzeige(index);
  zeigeStunden(index);

  // Nur der gewählte Button bekommt "aktiv" und aria-pressed="true"
  const knoepfe = document.querySelectorAll("#vorhersage button");
  knoepfe.forEach((knopf, i) => {
    knopf.classList.toggle("aktiv", i === index);
    knopf.setAttribute("aria-pressed", i === index ? "true" : "false");
  });
}

// 10) Wetter für eine gefundene Stadt laden und anzeigen
//     "stadt" kommt von findeStadt, "nummer" ist die Nummer der Anfrage.
//     Gibt true zurück, wenn alles geklappt hat
async function ladeUndZeige(stadt, nummer) {
  try {
    const wetter = await holeWetter(stadt.latitude, stadt.longitude);
    // Antwort veraltet? Dann hat der Benutzer inzwischen neu gesucht
    if (nummer !== anfrageNummer) return false;
    // Daten merken, damit Klicks auf einen Tag sie wiederverwenden können
    geladeneDaten = {
      stadt: { name: stadt.name, land: stadt.country },
      aktuell: wetter.aktuell,
      stuendlich: wetter.stuendlich,
      taeglich: wetter.taeglich,
    };
    zeigeVorhersage(wetter.taeglich);
    waehleTag(0); // bei neuer Suche ist wieder "heute" ausgewählt
    wetterBereich.hidden = false; // Bereich sichtbar machen
    meldung.textContent = "";
    return true;
  } catch (fehler) {
    if (nummer !== anfrageNummer) return false; // veralteter Fehler: ignorieren
    zeigeFehler(fehler);
    return false;
  }
}

// 11) Letzte Stadt im Browser merken (localStorage)
function speichereStadt(name) {
  try {
    localStorage.setItem("letzteStadt", name);
  } catch (fehler) {
    // Speichern geht nicht (z.B. blockiert) – nicht schlimm, wir machen einfach weiter
  }
}

function ladeGespeicherteStadt() {
  try {
    return localStorage.getItem("letzteStadt");
  } catch (fehler) {
    return null;
  }
}

// 12) Eine Stadt suchen und ihr Wetter anzeigen
async function sucheStadt(suchtext) {
  anfrageNummer++;                 // neue Anfrage = neue Nummer
  const nummer = anfrageNummer;    // die merken wir uns für diese Suche

  // WICHTIG: Das alte Wetter NICHT ausblenden! Sonst wird die Karte kurz
  // klein und springt. Stattdessen grauen wir es nur leicht aus ("laedt").
  if (wetterBereich.hidden) {
    meldung.textContent = "Lade Wetter... ⏳"; // erste Suche: noch nichts zu sehen
  } else {
    meldung.textContent = "";
    wetterBereich.classList.add("laedt");
    wetterBereich.setAttribute("aria-busy", "true"); // für Screenreader: wird geladen
  }

  let stadt;
  try {
    stadt = await findeStadt(suchtext);
  } catch (fehler) {
    if (nummer !== anfrageNummer) return; // veraltet: ignorieren
    beendeLaden();
    zeigeFehler(fehler);
    return;
  }
  if (nummer !== anfrageNummer) return; // veraltet: ignorieren

  const geklappt = await ladeUndZeige(stadt, nummer);
  if (nummer !== anfrageNummer) return; // veraltet: ignorieren
  beendeLaden();
  if (geklappt) {
    speichereStadt(stadt.name); // nur nach erfolgreicher Suche merken
  }
}

// Das Ausgrauen wieder entfernen
function beendeLaden() {
  wetterBereich.classList.remove("laedt");
  wetterBereich.removeAttribute("aria-busy");
}

// 13) Wenn der Benutzer auf "Suchen" klickt
formular.addEventListener("submit", (event) => {
  event.preventDefault(); // verhindert, dass die Seite neu lädt
  const text = eingabe.value.trim();
  if (text === "") {
    anfrageNummer++; // laufende ältere Anfragen verwerfen
    beendeLaden();
    zeigeFehler(new Error("Bitte gib eine Stadt ein."));
    return;
  }
  sucheStadt(text);
});

// 14) Beim Laden der Seite: letzte Stadt eintragen und automatisch suchen
//     Solange geladen wird, ist die Karte versteckt (Klasse "startet",
//     gesetzt im <head> von index.html). Danach blenden wir sie ein.
function startFertig() {
  document.documentElement.classList.remove("startet");
}

const gespeicherteStadt = ladeGespeicherteStadt();
if (gespeicherteStadt) {
  eingabe.value = gespeicherteStadt;
  // .finally = egal ob geklappt oder Fehler: Karte danach zeigen
  sucheStadt(gespeicherteStadt).finally(startFertig);
  // Sicherheitsnetz: spätestens nach 12 Sekunden die Karte zeigen
  setTimeout(startFertig, 12000);
} else {
  startFertig();
}
