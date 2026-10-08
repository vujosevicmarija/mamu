// ============================================================
// integration.js  -  VERBINDUNG ZU DEN BESTEHENDEN MAMU-FUNKTIONEN
// Nutzt waehleUebungen (uebungsempfehlung.js) und berechneErnaehrung
// (ernaehrung.js), ohne sie zu verändern.
// ============================================================

const trainingsdaten = require("./trainingsdaten");
const berechnung = require("./berechnung");
const uebungsempfehlung = require("./uebungsempfehlung");
const ernaehrung = require("./ernaehrung");

// Übungsempfehlung anhand des gespeicherten Status der Muskelgruppe.
// "Inactive" wird nur für waehleUebungen in "Starter" umgewandelt;
// angezeigt wird weiterhin der tatsächliche Status.
function holeUebungenFuerMuskelgruppe(muskelgruppe, trainingsziel) {
  const statusErgebnis = trainingsdaten.holeStatusDerMuskelgruppe(muskelgruppe);
  if (!statusErgebnis.ok) {
    return statusErgebnis;
  }

  const angezeigterStatus = statusErgebnis.status.status;
  let statusFuerAlgorithmus = angezeigterStatus;
  if (statusFuerAlgorithmus === "Inactive") {
    statusFuerAlgorithmus = "Starter";
  }

  const empfehlung = uebungsempfehlung.waehleUebungen(statusErgebnis.muskelgruppe, trainingsziel, statusFuerAlgorithmus);
  if (!empfehlung.ok) {
    return empfehlung;
  }
  return { ok: true, empfehlung: empfehlung, angezeigterStatus: angezeigterStatus };
}

// Kalorien und Protein berechnen.
// - Körpergewicht: Wird eines übergeben, wird es in profil.json gespeichert.
//   Sonst wird das gespeicherte Körpergewicht verwendet.
// - Anzahl der Übungen: wird automatisch aus den heutigen Trainingsdaten ermittelt.
function berechneErnaehrungFuerMamu(trainingsziel, koerpergewicht) {
  if (typeof ernaehrung.berechneErnaehrung !== "function") {
    return { ok: false, fehler: "ernaehrung.js exportiert berechneErnaehrung noch nicht. " +
                                "Bitte am Ende der Datei module.exports = { berechneErnaehrung }; ergänzen." };
  }

  // Körpergewicht bestimmen
  let gewicht;
  if (koerpergewicht !== undefined && koerpergewicht !== null && koerpergewicht !== "") {
    const gespeichert = trainingsdaten.speichereKoerpergewicht(koerpergewicht);
    if (!gespeichert.ok) {
      return gespeichert;
    }
    gewicht = gespeichert.koerpergewicht;
  } else {
    const profil = trainingsdaten.holeKoerpergewicht();
    if (!profil.ok) {
      return profil;
    }
    if (profil.koerpergewicht === null) {
      return { ok: false, fehler: "Es ist noch kein Körpergewicht gespeichert. Bitte zuerst das Körpergewicht eingeben." };
    }
    gewicht = profil.koerpergewicht;
  }

  // Anzahl der heutigen Übungen aus der Historie
  const alle = trainingsdaten.holeAlleEinheiten();
  if (!alle.ok) {
    return alle;
  }
  const anzahl = berechnung.zaehleUebungenAmTag(alle.einheiten, berechnung.heutigesDatum());
  const aktivitaetslevel = berechnung.bestimmeAktivitaetslevel(anzahl);

  // berechneErnaehrung kennt höchstens 8 Übungen (hoch). Mehr zählen ebenfalls als hoch.
  let anzahlFuerBerechnung = anzahl;
  if (anzahlFuerBerechnung > 8) {
    anzahlFuerBerechnung = 8;
  }

  const ergebnis = ernaehrung.berechneErnaehrung(gewicht, anzahlFuerBerechnung, trainingsziel);
  if (typeof ergebnis === "string") {
    return { ok: false, fehler: ergebnis };
  }
  if (ergebnis && ergebnis.ok === false) {
    return ergebnis;
  }
  return { ok: true, ergebnis: ergebnis, koerpergewicht: gewicht, anzahlUebungenHeute: anzahl, aktivitaetslevel: aktivitaetslevel };
}

module.exports = { holeUebungenFuerMuskelgruppe, berechneErnaehrungFuerMamu };
