// ============================================================
// speicher.js  -  SPEICHERUNG
// Liest und schreibt JSON-Textdateien.
// Hier gibt es keine Berechnungen und keine Bildschirmausgabe.
// ============================================================

const fs = require("fs");
const path = require("path");

// Ordner, in dem die JSON-Dateien liegen (Standard: Unterordner "daten")
let datenordner = path.join(__dirname, "daten");

// Mit dieser Funktion kann ein anderer Ordner eingestellt werden (z. B. für Tests).
function setzeDatenordner(ordner) {
  datenordner = ordner;
}

// Gibt den vollständigen Pfad einer Datei zurück.
function dateipfad(dateiname) {
  return path.join(datenordner, dateiname);
}

// Lädt eine JSON-Datei.
// - Datei fehlt:        ok = true, es werden die Standardwerte geliefert + ein Hinweis
//                       (so funktioniert der allererste Start ohne Dateien)
// - Datei kaputt/nicht lesbar: ok = false + Fehlermeldung. Die Datei wird NICHT verändert.
function ladeDatei(dateiname, standardwert) {
  const pfad = dateipfad(dateiname);

  if (!fs.existsSync(pfad)) {
    return {
      ok: true,
      daten: standardwert,
      hinweis: "Die Datei " + dateiname + " wurde nicht gefunden. Es wird mit leeren Daten gestartet."
    };
  }

  try {
    const text = fs.readFileSync(pfad, "utf8");
    const daten = JSON.parse(text);
    return { ok: true, daten: daten, hinweis: null };
  } catch (fehler) {
    if (fehler instanceof SyntaxError) {
      return {
        ok: false,
        fehler: "Die Datei " + dateiname + " ist beschädigt (kein gültiges JSON). " +
                "Sie wurde nicht verändert. Bitte die Datei prüfen oder aus einer Sicherung wiederherstellen."
      };
    }
    return {
      ok: false,
      fehler: "Die Datei " + dateiname + " konnte nicht gelesen werden. Sie wurde nicht verändert."
    };
  }
}

// Speichert Daten sicher:
// 1. Zuerst in eine temporäre Datei (.tmp) schreiben.
// 2. Erst wenn das geklappt hat, ersetzt die temporäre Datei die alte Datei.
// So bleibt die alte Datei bei einem Fehler unverändert erhalten.
function speichereDatei(dateiname, daten) {
  const pfad = dateipfad(dateiname);
  const tempPfad = pfad + ".tmp";

  try {
    fs.mkdirSync(datenordner, { recursive: true });
    fs.writeFileSync(tempPfad, JSON.stringify(daten, null, 2), "utf8");
    fs.renameSync(tempPfad, pfad);
    return { ok: true };
  } catch (fehler) {
    // Aufräumen: halb geschriebene temporäre Datei entfernen
    try {
      if (fs.existsSync(tempPfad)) {
        fs.unlinkSync(tempPfad);
      }
    } catch (aufraeumFehler) {
      // Ignorieren: Hauptsache, die alte Datei bleibt erhalten
    }
    return {
      ok: false,
      fehler: "Die Datei " + dateiname + " konnte nicht gespeichert werden. Die bisherigen Daten wurden nicht verändert."
    };
  }
}

module.exports = { setzeDatenordner, dateipfad, ladeDatei, speichereDatei };
