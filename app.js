// ===================================================
// Wetter Schweiz – die Logik
// Wir benutzen die kostenlose Open-Meteo API (kein Schlüssel nötig)
// ===================================================

// 1) Feste Daten
// Die 12 Städte auf der Karte. "id" steht später in der Adresse (#zuerich).
// Die erste Stadt (Zürich) ist beim Start gewählt.
// "seite" sagt, wo der Text neben dem Punkt steht, damit sich nichts überdeckt:
//   r = rechts, l = links, o = oben, u = unten,
//   or / ol / ur / ul = schräg (z.B. "or" = oben rechts)
//   klein = schmale Karte (Name + Temperatur), gross = breite Karte (mit Icon, größer)
// Die Seiten sind per Skript geprüft: kein Text überdeckt einen anderen,
// auch nicht, wenn eine Stadt gewählt ist.
const STAEDTE = [
  { id: "zuerich", name: "Zürich", lat: 47.37, lon: 8.54, seite: { klein: "u", gross: "r" } },
  { id: "bern", name: "Bern", lat: 46.95, lon: 7.45, seite: { klein: "u", gross: "r" } },
  { id: "basel", name: "Basel", lat: 47.56, lon: 7.59, seite: { klein: "o", gross: "l" } },
  { id: "genf", name: "Genf", lat: 46.20, lon: 6.14, seite: { klein: "r", gross: "r" } },
  { id: "lausanne", name: "Lausanne", lat: 46.52, lon: 6.63, seite: { klein: "r", gross: "r" } },
  { id: "luzern", name: "Luzern", lat: 47.05, lon: 8.31, seite: { klein: "ur", gross: "r" } },
  { id: "st-gallen", name: "St. Gallen", lat: 47.42, lon: 9.38, seite: { klein: "o", gross: "r" } },
  { id: "lugano", name: "Lugano", lat: 46.00, lon: 8.95, seite: { klein: "r", gross: "r" } },
  { id: "chur", name: "Chur", lat: 46.85, lon: 9.53, seite: { klein: "r", gross: "r" } },
  { id: "sion", name: "Sion", lat: 46.23, lon: 7.36, seite: { klein: "r", gross: "r" } },
  { id: "neuchatel", name: "Neuchâtel", lat: 46.99, lon: 6.93, seite: { klein: "o", gross: "l" } },
  { id: "aarau", name: "Aarau", lat: 47.39, lon: 8.04, seite: { klein: "l", gross: "u" } },
];

// Projektion: Breite/Länge (lat/lon) -> x/y auf der Karte (viewBox 0 0 1000 641)
const KARTE = { lon0: 5.956259562595619, lat0: 47.80080240881932, k: 0.6845471059286887, s: 323.8461560973705 };
const KARTE_BREITE = 1000;
const KARTE_HOEHE = 641;
// Ab dieser Breite der Karte (in Pixeln) gelten die "gross"-Seiten
const NAMEN_AB = 540;
// Adresse (#ort) für einen gesuchten Ort. Er steht NICHT auf der Karte,
// sondern nur in der Detailansicht.
const SUCH_ID = "ort";

const TAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const TAGE_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

// Fehlermeldungen (immer auf Deutsch)
const TEXT_NICHT_GEFUNDEN = "Ort nicht gefunden.";
const TEXT_LEER = "Bitte gib einen Ort ein.";
const TEXT_KEIN_INTERNET = "Keine Verbindung zum Wetter-Server. Bitte prüfe dein Internet.";
const TEXT_SERVER = "Der Server antwortet nicht. Bitte später nochmal versuchen.";
const SEITEN_TITEL = "Wetter Schweiz";

// 2) Elemente aus dem HTML holen
const formular = document.getElementById("such-formular");
const eingabe = document.getElementById("stadt-eingabe");
const ueberschrift = document.getElementById("stadt-name");
const meldung = document.getElementById("meldung");
const nochmalKnopf = document.getElementById("nochmal-knopf");
const heuteDatum = document.getElementById("heute-datum");
const landkarte = document.querySelector(".landkarte");
const buehne = document.querySelector(".buehne");
const markerEbene = document.getElementById("marker-ebene");
const ueberschriftName = document.getElementById("stadt-titel");
const ueberschriftDatum = document.getElementById("stadt-datum");
const temperatur = document.getElementById("temperatur");
const temperaturTief = document.getElementById("temperatur-tief");
const wetterIcon = document.querySelector("#wetter-icon use");
const beschreibung = document.getElementById("beschreibung");
const detailsZeile = document.getElementById("details-zeile");
const tageListe = document.getElementById("vorhersage");

// 3) Zustand: was gerade ausgewählt ist
let gewaehlteId = STAEDTE[0].id; // welche Stadt gerade gezeigt wird
let gewaehlterTag = 0;           // 0 = heute, 1–4 = spätere Tage
let gesuchterOrt = null;         // zuletzt gesuchter Ort (nicht auf der Karte)
let meldungsTimer = null;
// Zähler für Suchen: So erkennen wir, ob eine Antwort veraltet ist
// (eine ältere Antwort darf nie eine neuere überschreiben)
let anfrageNummer = 0;

// 4) Wettercode (Zahl von Open-Meteo) -> Icon, Text und Hintergrund-Art
//    istTag = false: nachts zeigen wir den Mond statt der Sonne
function wetterBeschreibung(code, istTag = true) {
  if (code == null) return { icon: null, text: "Keine Angabe", art: null };
  if (code === 0) {
    return istTag
      ? { icon: "i-sonne", text: "Klarer Himmel", art: "sonne" }
      : { icon: "i-mond", text: "Klar", art: "nacht" };
  }
  if (code <= 2) {
    return istTag
      ? { icon: "i-sonne-wolke", text: "Leicht bewölkt", art: "sonne" }
      : { icon: "i-mond-wolke", text: "Leicht bewölkt", art: "nacht" };
  }
  if (code === 3) return { icon: "i-wolken", text: "Bewölkt", art: "wolken" };
  if (code <= 48) return { icon: "i-nebel", text: "Nebel", art: "nebel" };
  if (code <= 57) return { icon: "i-regen", text: "Nieselregen", art: "regen" };
  if (code <= 67) return { icon: "i-regen", text: "Regen", art: "regen" };
  if (code <= 77) return { icon: "i-schnee", text: "Schnee", art: "schnee" };
  if (code <= 82) return { icon: "i-regen", text: "Regenschauer", art: "regen" };
  if (code <= 86) return { icon: "i-schnee", text: "Schneeschauer", art: "schnee" };
  return { icon: "i-gewitter", text: "Gewitter", art: "gewitter" };
}

// 5) Kleine Helfer
// Temperatur als "12°". Fehlt der Wert, kommt "–°"
function grad(wert) {
  return wert == null ? "–°" : `${Math.round(wert)}°`;
}

// Zahl zum Vorlesen: "12". Fehlt der Wert, kommt "–"
function zahl(wert) {
  return wert == null ? "–" : `${Math.round(wert)}`;
}

// Zahl mit Einheit, z.B. "12 km/h". Fehlt der Wert, kommt "–"
function mitEinheit(wert, einheit) {
  return wert == null ? "–" : `${Math.round(wert)} ${einheit}`;
}

// "2026-11-12" -> Datum-Objekt (mittags, damit die Zeitzone nichts verschiebt)
function datumAus(text) {
  return new Date(text + "T12:00");
}

// Datum -> "Di 10. Nov."
function kurzesDatum(datum) {
  return `${TAGE_KURZ[datum.getDay()]} ${datum.getDate()}. ${MONATE_KURZ[datum.getMonth()]}`;
}

// "2026-11-12T07:24" -> "07:24". Fehlt der Wert, kommt "–"
function uhrzeit(wert) {
  return wert ? wert.slice(11, 16) : "–";
}

// Einen Ort über seine id finden: eine der 12 Städte oder der gesuchte Ort
function findeOrt(id) {
  if (id === SUCH_ID) return gesuchterOrt;
  return STAEDTE.find((ort) => ort.id === id);
}

// Ein Icon in ein <use>-Element setzen (oder leeren)
function setzeIcon(useElement, name) {
  if (name) {
    useElement.setAttribute("href", "#" + name);
  } else {
    useElement.removeAttribute("href");
  }
}

// Ein neues Icon bauen: <svg class="ic" aria-hidden="true"><use href="#..."/></svg>
// SVG-Elemente brauchen createElementNS mit dem SVG-Namensraum
function neuesIcon(name) {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("class", "ic");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(svgNs, "use");
  setzeIcon(use, name);
  svg.append(use);
  return svg;
}

// Ein <span> mit Klasse und Text bauen
function neuesSpan(klasse, text) {
  const span = document.createElement("span");
  if (klasse) span.className = klasse;
  span.textContent = text;
  return span;
}

// Breite/Länge -> Punkt auf der Karte (x/y im viewBox 0 0 1000 641)
function aufKarte(lat, lon) {
  return {
    x: (lon - KARTE.lon0) * KARTE.k * KARTE.s,
    y: (KARTE.lat0 - lat) * KARTE.s,
  };
}

// 6) Meldungen: schweben über dem Panel und verschwinden nach 5 Sekunden
function zeigeMeldung(text) {
  meldung.textContent = text;
  clearTimeout(meldungsTimer);
  meldungsTimer = setTimeout(() => {
    meldung.textContent = "";
  }, 5000);
}

function zeigeFehler(fehler) {
  if (fehler.name === "TimeoutError") {
    // Zu lange gewartet (Timeout nach 10 Sekunden)
    zeigeMeldung(TEXT_SERVER);
  } else if (fehler instanceof TypeError) {
    // fetch wirft einen TypeError, wenn gar keine Verbindung möglich ist
    zeigeMeldung(TEXT_KEIN_INTERNET);
  } else if (fehler.name === "Error" && fehler.message) {
    // unsere eigenen Meldungen (z.B. "Ort nicht gefunden.")
    zeigeMeldung(fehler.message);
  } else {
    // z.B. kaputte Antwort vom Server
    zeigeMeldung(TEXT_SERVER);
  }
}

// 7) Daten aus dem Internet holen
// Eine Adresse abrufen und als JS-Objekt zurückgeben (max. 10 Sekunden warten)
async function holeJson(url) {
  const antwort = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!antwort.ok) {
    throw new Error(TEXT_SERVER);
  }
  return antwort.json();
}

// Wetter für ALLE Städte in EINER Anfrage holen.
// Die Antwort ist eine Liste, ein Eintrag pro Stadt, in derselben Reihenfolge.
async function holeWetter(liste) {
  const breiten = liste.map((ort) => ort.lat).join(",");
  const laengen = liste.map((ort) => ort.lon).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${breiten}&longitude=${laengen}`
    + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset`
    + `&timezone=auto&forecast_days=5`;
  const daten = await holeJson(url);
  // Bei nur einem Ort schickt Open-Meteo ein einzelnes Objekt statt einer Liste
  return Array.isArray(daten) ? daten : [daten];
}

// Ortsname -> Koordinaten, nur in der Schweiz (countryCode=CH)
async function sucheOrtInDerSchweiz(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}`
    + `&countryCode=CH&count=1&language=de`;
  const daten = await holeJson(url);
  if (!daten.results || daten.results.length === 0) {
    throw new Error(TEXT_NICHT_GEFUNDEN);
  }
  return daten.results[0]; // die beste Übereinstimmung
}

// 8) Aufräumen: Früher wurde ein gesuchter Ort als "meinOrt" gespeichert.
//    Den alten Eintrag im Browser löschen wir, damit nichts übrig bleibt.
function loescheAltenOrt() {
  try {
    localStorage.removeItem("meinOrt");
  } catch (fehler) {
    // Speicher blockiert: nicht schlimm
  }
}

// 9) Die Karte mit den Markern
// Für jede Stadt einen Link bauen: <a href="#zuerich">Punkt, Icon, Name, Temperatur</a>
function baueKarte() {
  STAEDTE.forEach((ort) => {
    const punkt = aufKarte(ort.lat, ort.lon);
    const eintrag = document.createElement("li");
    const link = document.createElement("a");
    link.className = "marker";
    link.href = "#" + ort.id;
    link.dataset.id = ort.id;
    // Position in Prozent: so passt der Marker bei jeder Größe
    link.style.left = `${(punkt.x / KARTE_BREITE) * 100}%`;
    link.style.top = `${(punkt.y / KARTE_HOEHE) * 100}%`;

    const markerPunkt = neuesSpan("marker-punkt", "");
    markerPunkt.setAttribute("aria-hidden", "true");
    link.append(markerPunkt, neuesIcon(null), neuesSpan("marker-name", ort.name), neuesSpan("marker-temp", "–°"));

    eintrag.append(link);
    markerEbene.append(eintrag);
  });
  setzeSeiten();
  fuelleKarte();
}

// Temperaturen, Icons und Vorlese-Text in die Marker schreiben
function fuelleKarte() {
  markerEbene.querySelectorAll(".marker").forEach((link) => {
    const ort = findeOrt(link.dataset.id);
    const temp = link.querySelector(".marker-temp");
    const icon = link.querySelector(".ic use");

    if (ort.wetter) {
      const jetzt = ort.wetter.current;
      const wetter = wetterBeschreibung(jetzt.weather_code, jetzt.is_day === 1);
      temp.textContent = grad(jetzt.temperature_2m);
      setzeIcon(icon, wetter.icon);
      // Vorlesen z.B.: "Zürich, 12 Grad, Leicht bewölkt"
      const gradText = jetzt.temperature_2m == null ? "–" : `${zahl(jetzt.temperature_2m)} Grad`;
      link.setAttribute("aria-label", `${ort.name}, ${gradText}, ${wetter.text}`);
    } else {
      temp.textContent = "–°";
      setzeIcon(icon, null);
      link.setAttribute("aria-label", `${ort.name}, noch keine Wetterdaten`);
    }
  });
  markiereKarte();
}

// Die gewählte Stadt markieren (aria-current="true").
// Ist ein gesuchter Ort gewählt, ist kein Marker markiert.
function markiereKarte() {
  markerEbene.querySelectorAll(".marker").forEach((link) => {
    if (link.dataset.id === gewaehlteId) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

// Schmale oder breite Karte? Danach richtet sich, wo die Beschriftungen stehen.
function setzeSeiten() {
  const modus = buehne.clientWidth >= NAMEN_AB ? "gross" : "klein";
  landkarte.dataset.modus = modus;
  markerEbene.querySelectorAll(".marker").forEach((link) => {
    link.dataset.seite = findeOrt(link.dataset.id).seite[modus];
  });
}

// 10) Die Detailansicht
// Die 5 Tageszeilen einmal bauen (Buttons). Danach werden sie nur noch gefüllt.
function baueTage() {
  for (let i = 0; i < 5; i++) {
    const eintrag = document.createElement("li");
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = "tag";
    knopf.setAttribute("aria-pressed", "false");
    knopf.addEventListener("click", () => waehleTag(i));

    const balken = neuesSpan("balken", "");
    balken.setAttribute("aria-hidden", "true");
    balken.append(neuesSpan("balken-fuellung", ""));

    knopf.append(
      neuesSpan("tag-name", i === 0 ? "Heute" : "–"),
      neuesIcon(null),
      neuesSpan("tag-tief leise", "–°"),
      balken,
      neuesSpan("tag-hoch", "–°")
    );
    eintrag.append(knopf);
    tageListe.append(eintrag);
  }
}

// Die 5 Tageszeilen mit Werten füllen (oder Platzhalter zeigen)
function fuelleTage(tage) {
  const knoepfe = tageListe.querySelectorAll(".tag");

  // Kältester und wärmster Wert der 5 Tage: daran messen wir die Balken.
  // Fehlende Werte (null) zählen nicht mit.
  let min = 0;
  let max = 1;
  if (tage) {
    const tiefs = tage.temperature_2m_min.filter((wert) => wert != null);
    const hochs = tage.temperature_2m_max.filter((wert) => wert != null);
    if (tiefs.length && hochs.length) {
      min = Math.min(...tiefs);
      max = Math.max(...hochs);
    }
  }
  const spanne = max - min || 1; // nie durch 0 teilen

  knoepfe.forEach((knopf, i) => {
    const fuellung = knopf.querySelector(".balken-fuellung");
    const icon = knopf.querySelector(".ic use");

    // Keine Daten: Platzhalter, Knopf nicht klickbar
    if (!tage || !tage.time[i]) {
      knopf.querySelector(".tag-name").textContent = i === 0 ? "Heute" : "–";
      knopf.querySelector(".tag-tief").textContent = "–°";
      knopf.querySelector(".tag-hoch").textContent = "–°";
      setzeIcon(icon, null);
      fuellung.hidden = true;
      knopf.disabled = true;
      knopf.setAttribute("aria-pressed", "false");
      knopf.removeAttribute("aria-label");
      return;
    }

    const datum = datumAus(tage.time[i]);
    const tief = tage.temperature_2m_min[i];
    const hoch = tage.temperature_2m_max[i];
    const wetter = wetterBeschreibung(tage.weather_code[i], true);

    knopf.querySelector(".tag-name").textContent = i === 0 ? "Heute" : TAGE_KURZ[datum.getDay()];
    knopf.querySelector(".tag-tief").textContent = grad(tief);
    knopf.querySelector(".tag-hoch").textContent = grad(hoch);
    setzeIcon(icon, wetter.icon);

    // Balken: links = wie weit der Tiefstwert vom kältesten Wert weg ist (in %).
    // Höchstens "100 % - 4px", damit der Balken nie aus der Spur ragt.
    if (tief == null || hoch == null) {
      fuellung.hidden = true;
    } else {
      fuellung.hidden = false;
      fuellung.style.left = `min(${((tief - min) / spanne) * 100}%, calc(100% - 4px))`;
      fuellung.style.width = `${((hoch - tief) / spanne) * 100}%`;
    }

    knopf.disabled = false;
    knopf.setAttribute("aria-pressed", i === gewaehlterTag ? "true" : "false");
    // Vorlesen z.B.: "Mittwoch, 12. Nov.: Regen, 14 bis 8 Grad"
    const tagName = i === 0 ? "Heute" : TAGE_LANG[datum.getDay()];
    knopf.setAttribute(
      "aria-label",
      `${tagName}, ${datum.getDate()}. ${MONATE_KURZ[datum.getMonth()]}: ${wetter.text}, ${zahl(hoch)} bis ${zahl(tief)} Grad`
    );
  });
}

// Ein Teil der Detail-Zeile, z.B. "Wind" (leise) + "12 km/h"
function detailTeil(beschriftung, wert) {
  const teil = neuesSpan("detail-teil", "");
  teil.append(neuesSpan("leise", beschriftung + " "), wert);
  return teil;
}

// Sonnenaufgang und -untergang: "↑07:24 ↓16:58" (Pfeile nur für die Augen)
function sonnenTeil(tage, index) {
  const teil = neuesSpan("detail-teil", "");
  const auf = neuesSpan("leise", "↑");
  const ab = neuesSpan("leise", "↓");
  auf.setAttribute("aria-hidden", "true");
  ab.setAttribute("aria-hidden", "true");
  teil.append(
    auf, neuesSpan("nur-vorlesen", "Sonnenaufgang "), uhrzeit(tage.sunrise[index]), " ",
    ab, neuesSpan("nur-vorlesen", "Sonnenuntergang "), uhrzeit(tage.sunset[index])
  );
  return teil;
}

// Die Teile mit " · " dazwischen in die Detail-Zeile schreiben
function zeigeDetails(teile) {
  detailsZeile.textContent = "";
  teile.forEach((teil, i) => {
    if (i > 0) {
      const trenner = neuesSpan("trenner", " · ");
      trenner.setAttribute("aria-hidden", "true");
      detailsZeile.append(trenner);
    }
    detailsZeile.append(teil);
  });
}

// Die ganze Detailansicht für die gewählte Stadt und den gewählten Tag füllen
function zeigeDetail() {
  const ort = findeOrt(gewaehlteId);
  ueberschriftName.textContent = ort.name;
  ueberschriftName.title = ort.name; // voller Name beim Drüberfahren, falls gekürzt
  document.title = `${ort.name} – ${SEITEN_TITEL}`;

  // Noch keine Daten (lädt noch oder Fehler): Platzhalter in gleicher Höhe
  if (!ort.wetter) {
    ueberschriftDatum.textContent = "";
    temperatur.textContent = "–°";
    temperaturTief.textContent = "";
    setzeIcon(wetterIcon, null);
    beschreibung.textContent = "–";
    detailsZeile.textContent = "–";
    fuelleTage(null);
    return;
  }

  const tage = ort.wetter.daily;
  const i = gewaehlterTag;

  if (i === 0) {
    // Heute: das aktuelle Wetter
    const jetzt = ort.wetter.current;
    const wetter = wetterBeschreibung(jetzt.weather_code, jetzt.is_day === 1);
    const hoch = tage.temperature_2m_max[0];
    const tief = tage.temperature_2m_min[0];
    ueberschriftDatum.textContent = "";
    temperatur.textContent = grad(jetzt.temperature_2m);
    temperaturTief.textContent = "";
    setzeIcon(wetterIcon, wetter.icon);

    // "Leicht bewölkt · H 14° T 6°" (für Screenreader ausgeschrieben)
    beschreibung.textContent = "";
    const kurz = neuesSpan("", ` · H ${grad(hoch)} T ${grad(tief)}`);
    kurz.setAttribute("aria-hidden", "true");
    beschreibung.append(
      wetter.text,
      kurz,
      neuesSpan("nur-vorlesen", `, Höchstwert ${grad(hoch)}, Tiefstwert ${grad(tief)}`)
    );

    zeigeDetails([
      detailTeil("Gefühlt", grad(jetzt.apparent_temperature)),
      detailTeil("Wind", mitEinheit(jetzt.wind_speed_10m, "km/h")),
      detailTeil("Feuchte", mitEinheit(jetzt.relative_humidity_2m, "%")),
      sonnenTeil(tage, 0),
    ]);
  } else {
    // Ein späterer Tag: Höchst- / Tiefstwert und Regen-Wahrscheinlichkeit
    const wetter = wetterBeschreibung(tage.weather_code[i], true);
    ueberschriftDatum.textContent = `· ${kurzesDatum(datumAus(tage.time[i]))}`;
    temperatur.textContent = grad(tage.temperature_2m_max[i]);
    temperaturTief.textContent = `/ ${grad(tage.temperature_2m_min[i])}`;
    setzeIcon(wetterIcon, wetter.icon);
    beschreibung.textContent = wetter.text;

    zeigeDetails([
      detailTeil("Regen", mitEinheit(tage.precipitation_probability_max[i], "%")),
      sonnenTeil(tage, i),
    ]);
  }

  fuelleTage(tage);
}

// 11) Hintergrund passend zum angezeigten Wetter (body[data-wetter])
function setzeHintergrund() {
  const ort = findeOrt(gewaehlteId);
  let wetter = null;
  if (ort.wetter) {
    if (gewaehlterTag === 0) {
      const jetzt = ort.wetter.current;
      wetter = wetterBeschreibung(jetzt.weather_code, jetzt.is_day === 1);
    } else {
      wetter = wetterBeschreibung(ort.wetter.daily.weather_code[gewaehlterTag], true);
    }
  }
  if (wetter && wetter.art) {
    document.body.setAttribute("data-wetter", wetter.art);
  } else {
    document.body.removeAttribute("data-wetter"); // ruhiger Standard-Verlauf
  }
}

// Karte, Detail und Hintergrund auf den aktuellen Stand bringen
function aktualisiereAlles() {
  markiereKarte();
  zeigeDetail();
  setzeHintergrund();
}

// 12) Stadt wählen – gesteuert über die Adresse (#zuerich, #ort).
//     So funktionieren Links und die Zurück-Taste.
// Die id aus der Adresse lesen. Kaputte Adressen (z.B. "#%E0") ergeben "".
function leseAdresse() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch (fehler) {
    return ""; // wie eine unbekannte Adresse behandeln
  }
}

function zeigeGewaehlteStadt() {
  // Unbekannt oder leer (oder #ort ohne Suchergebnis, z.B. nach Neuladen): Zürich
  const ort = findeOrt(leseAdresse()) || STAEDTE[0];
  gewaehlteId = ort.id;
  gewaehlterTag = 0; // eine neue Stadt beginnt immer mit "Heute"
  aktualisiereAlles();
  // Der Fokus bleibt, wo er ist (z.B. auf dem angeklickten Marker)
}

// Einen Ort öffnen. Steht er schon in der Adresse, gibt es kein
// "hashchange"-Ereignis, dann zeigen wir ihn direkt an.
function oeffne(id) {
  if (location.hash === "#" + id) {
    zeigeGewaehlteStadt();
  } else {
    location.hash = id;
  }
}

// 13) Einen Tag auswählen (0 = heute)
function waehleTag(index) {
  gewaehlterTag = index;
  zeigeDetail();
  setzeHintergrund();
}

// 14) Suche: nur Orte in der Schweiz.
// Ist der gefundene Ort eine der 12 Städte? (fast gleiche Koordinaten, < 0.02°)
function istGleicherOrt(ort, treffer) {
  return Math.abs(ort.lat - treffer.latitude) < 0.02 && Math.abs(ort.lon - treffer.longitude) < 0.02;
}

// Während der Suche die Lupe blass machen (und wieder normal)
function setzeSucht(aktiv) {
  formular.classList.toggle("sucht", aktiv);
  if (aktiv) {
    formular.setAttribute("aria-busy", "true");
  } else {
    formular.removeAttribute("aria-busy");
  }
}

async function suche(text) {
  anfrageNummer++;                 // neue Anfrage = neue Nummer
  const nummer = anfrageNummer;    // die merken wir uns für diese Suche
  setzeSucht(true);

  // a) Nur das Laden steht im "try". Fehler hier = Netz oder Server.
  let treffer;
  let stadt;
  let wetter = null;
  try {
    treffer = await sucheOrtInDerSchweiz(text);
    stadt = STAEDTE.find((ort) => istGleicherOrt(ort, treffer));
    if (!stadt && nummer === anfrageNummer) {
      // Anderer Ort: sein Wetter einzeln laden (gleiche Werte wie die Karte)
      [wetter] = await holeWetter([{ lat: treffer.latitude, lon: treffer.longitude }]);
    }
  } catch (fehler) {
    if (nummer === anfrageNummer) {
      setzeSucht(false);
      zeigeFehler(fehler);
    }
    return;
  }
  if (nummer !== anfrageNummer) return; // veraltet: ignorieren
  setzeSucht(false);

  // b) Danach zeichnen (ein Fehler hier ist ein Programmfehler, keine Netz-Meldung)
  eingabe.value = "";
  meldung.textContent = ""; // eine alte Meldung (z.B. "Ort nicht gefunden.") gilt nicht mehr
  if (stadt) {
    // Eine der 12 Städte: einfach diese wählen
    oeffne(stadt.id);
  } else {
    // Anderer Ort: nur in der Detailansicht zeigen, NICHT auf der Karte
    gesuchterOrt = { id: SUCH_ID, name: treffer.name, lat: treffer.latitude, lon: treffer.longitude, wetter };
    oeffne(SUCH_ID);
  }
  // Fokus auf den Namen: der Screenreader liest vor, was jetzt gezeigt wird
  ueberschrift.focus({ preventScroll: true });
}

// Enter oder Klick auf die Lupe
formular.addEventListener("submit", (event) => {
  event.preventDefault(); // verhindert, dass die Seite neu lädt
  const text = eingabe.value.trim();
  if (text === "") {
    anfrageNummer++; // laufende ältere Suchen verwerfen
    setzeSucht(false);
    zeigeMeldung(TEXT_LEER);
    return;
  }
  suche(text);
});

// 15) Start: alle 12 Städte in EINER Anfrage laden
async function ladeAlle() {
  // Hatte "Erneut versuchen" den Fokus? Dann setzen wir ihn danach sinnvoll.
  const knopfHatteFokus = document.activeElement === nochmalKnopf;
  nochmalKnopf.disabled = true; // während des Ladens nicht nochmal drückbar

  // a) Nur das Laden steht im "try"
  let daten;
  try {
    daten = await holeWetter(STAEDTE);
  } catch (fehler) {
    // Platzhalter bleiben stehen, Meldung + "Erneut versuchen" erscheinen
    zeigeFehler(fehler);
    nochmalKnopf.disabled = false;
    nochmalKnopf.hidden = false;
    if (knopfHatteFokus) nochmalKnopf.focus();
    return;
  }

  // b) Danach zeichnen
  STAEDTE.forEach((ort, i) => {
    ort.wetter = daten[i] || null; // jede Antwort gehört zur Stadt an derselben Stelle
  });
  meldung.textContent = ""; // eine alte Fehlermeldung gilt nicht mehr
  nochmalKnopf.hidden = true;
  nochmalKnopf.disabled = false;
  fuelleKarte();
  zeigeDetail();
  setzeHintergrund();
  // Der Knopf ist jetzt weg: Fokus auf den Marker der gewählten Stadt
  if (knopfHatteFokus) {
    const marker = markerEbene.querySelector('[aria-current="true"]');
    if (marker) marker.focus();
  }
}

// 16) Ereignisse und Start
nochmalKnopf.addEventListener("click", ladeAlle);
window.addEventListener("hashchange", zeigeGewaehlteStadt);
// Karte wird breiter/schmaler: Beschriftungen neu ausrichten
new ResizeObserver(setzeSeiten).observe(buehne);

// Los geht's: Platzhalter sofort zeigen, dann die Daten holen
loescheAltenOrt();
heuteDatum.textContent = kurzesDatum(new Date());
baueTage();
baueKarte();
zeigeGewaehlteStadt();
ladeAlle();
