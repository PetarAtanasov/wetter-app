// ===================================================
// Wetter-App – die Logik
// Wir benutzen die kostenlose Open-Meteo API (kein Schlüssel nötig)
// ===================================================

// 1) Elemente aus dem HTML holen, damit wir sie ändern können
const formular = document.getElementById("such-formular");
const eingabe = document.getElementById("stadt-eingabe");
const meldung = document.getElementById("meldung");
const wetterBereich = document.getElementById("wetter");

// 2) Wettercodes (Zahlen) in Text + Emoji übersetzen
//    Open-Meteo schickt z.B. 0 = klar, 61 = Regen
function wetterBeschreibung(code) {
  if (code === 0) return ["☀️", "Klarer Himmel"];
  if (code <= 2) return ["🌤️", "Leicht bewölkt"];
  if (code === 3) return ["☁️", "Bewölkt"];
  if (code <= 48) return ["🌫️", "Nebel"];
  if (code <= 57) return ["🌦️", "Nieselregen"];
  if (code <= 67) return ["🌧️", "Regen"];
  if (code <= 77) return ["❄️", "Schnee"];
  if (code <= 82) return ["🌧️", "Regenschauer"];
  if (code <= 86) return ["🌨️", "Schneeschauer"];
  return ["⛈️", "Gewitter"];
}

// 3) Stadtname -> Koordinaten (Breitengrad/Längengrad)
//    "async" heißt: diese Funktion wartet auf das Internet
async function findeStadt(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=de`;
  const antwort = await fetch(url);       // Anfrage ans Internet schicken
  const daten = await antwort.json();     // Antwort in ein JS-Objekt umwandeln

  if (!daten.results || daten.results.length === 0) {
    throw new Error("Stadt nicht gefunden 😕");
  }
  return daten.results[0]; // die erste (beste) Übereinstimmung
}

// 4) Koordinaten -> aktuelles Wetter
async function holeWetter(breite, laenge) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${breite}&longitude=${laenge}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;
  const antwort = await fetch(url);
  const daten = await antwort.json();
  return daten.current;
}

// 5) Das Wetter auf der Seite anzeigen
function zeigeWetter(stadt, wetter) {
  const [emoji, text] = wetterBeschreibung(wetter.weather_code);

  document.getElementById("stadt-name").textContent = `${stadt.name}, ${stadt.country}`;
  document.getElementById("wetter-icon").textContent = emoji;
  document.getElementById("temperatur").textContent = `${Math.round(wetter.temperature_2m)}°C`;
  document.getElementById("beschreibung").textContent = text;
  document.getElementById("feuchtigkeit").textContent = `${wetter.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${wetter.wind_speed_10m} km/h`;

  wetterBereich.hidden = false; // Bereich sichtbar machen
}

// 6) Wenn der Benutzer auf "Suchen" klickt
formular.addEventListener("submit", async (event) => {
  event.preventDefault(); // verhindert, dass die Seite neu lädt

  meldung.textContent = "Lade Wetter... ⏳";
  wetterBereich.hidden = true;

  try {
    const stadt = await findeStadt(eingabe.value.trim());
    const wetter = await holeWetter(stadt.latitude, stadt.longitude);
    zeigeWetter(stadt, wetter);
    meldung.textContent = "";
  } catch (fehler) {
    meldung.textContent = fehler.message || "Etwas ist schiefgelaufen.";
  }
});
