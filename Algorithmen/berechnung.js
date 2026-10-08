// ============================================================
// berechnung.js  -  BERECHNUNG
// Enthält nur Rechenfunktionen. Es werden keine Dateien gelesen
// und nichts auf den Bildschirm geschrieben.
// Hinweis: Die Einteilung ist eine interne Bewertung von mamu
// und keine allgemeingültige sportliche Bewertung.
// ============================================================

// ---------- Feste Werte aus den Projektvorgaben ----------
const BETRACHTETE_TAGE = 30;     // Trainingshäufigkeit: letzte 30 Tage
const ZIEL_TRAININGSTAGE = 12;   // 12 Trainingstage        -> volle Punkte
const ZIEL_VERHAELTNIS = 1.0;    // Gewicht / Körpergewicht = 1,0 -> volle Punkte
const ZIEL_WIEDERHOLUNGEN = 15;  // 15 Wiederholungen pro Satz -> volle Punkte
const ZIEL_SAETZE = 4;           // 4 Sätze                 -> volle Punkte

const MAX_HAEUFIGKEIT = 20;
const MAX_RELATIVE_LEISTUNG = 20;
const MAX_WIEDERHOLUNGEN = 15;
const MAX_SAETZE = 15;

// ---------- Datum ----------

// Heutiges Datum im Format JJJJ-MM-TT (Ortszeit)
function heutigesDatum() {
  const jetzt = new Date();
  const monat = String(jetzt.getMonth() + 1).padStart(2, "0");
  const tag = String(jetzt.getDate()).padStart(2, "0");
  return jetzt.getFullYear() + "-" + monat + "-" + tag;
}

// Prüft, ob ein Text ein echtes Datum im Format JJJJ-MM-TT ist
function istGueltigesDatum(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const datum = new Date(text + "T00:00:00Z");
  if (isNaN(datum.getTime())) {
    return false;
  }
  // 2026-02-30 würde sonst zu 2026-03-02 umgerechnet werden
  return datum.toISOString().slice(0, 10) === text;
}

// Anzahl Tage zwischen zwei Datumsangaben (spaeter - frueher)
function tageZwischen(frueher, spaeter) {
  const a = new Date(frueher + "T00:00:00Z");
  const b = new Date(spaeter + "T00:00:00Z");
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

// Sortiert Einheiten nach Datum (älteste zuerst). Bei gleichem Datum entscheidet die ID.
function sortiereChronologisch(einheiten) {
  const kopie = einheiten.slice();
  kopie.sort(function (a, b) {
    if (a.datum < b.datum) return -1;
    if (a.datum > b.datum) return 1;
    return a.id - b.id;
  });
  return kopie;
}

// ---------- Hilfsfunktionen für Punkte ----------

// Punkte proportional zum Zielwert, aber höchstens die Maximalpunkte
function punkteNachAnteil(wert, zielwert, maxPunkte) {
  const punkte = (wert / zielwert) * maxPunkte;
  if (punkte > maxPunkte) {
    return maxPunkte;
  }
  return punkte;
}

// Rundet auf eine Nachkommastelle (nur für die Anzeige der Teilpunkte)
function rundeEineStelle(zahl) {
  return Math.round(zahl * 10) / 10;
}

// Größter Wert eines Feldes (z. B. "gewicht") in einer Liste von Einheiten
function hoechsterWert(einheiten, feld) {
  let maximum = 0;
  for (let i = 0; i < einheiten.length; i++) {
    if (einheiten[i][feld] > maximum) {
      maximum = einheiten[i][feld];
    }
  }
  return maximum;
}

// ---------- Teilbereich 1: Trainingshäufigkeit ----------
// Zählt die verschiedenen Trainingstage der letzten 30 Tage
// (heute und die 29 Tage davor = 30 Kalendertage).
function zaehleTrainingstage(einheiten, heute) {
  const schonGezaehlt = {};
  let anzahl = 0;
  for (let i = 0; i < einheiten.length; i++) {
    const tage = tageZwischen(einheiten[i].datum, heute);
    if (tage >= 0 && tage < BETRACHTETE_TAGE && !schonGezaehlt[einheiten[i].datum]) {
      schonGezaehlt[einheiten[i].datum] = true;
      anzahl++;
    }
  }
  return anzahl;
}

// ---------- Teilbereich 5: Entwicklung über die Zeit ----------

// Verbesserung: mehr Gewicht ODER bei gleichem Gewicht mehr Wiederholungen insgesamt
function istVerbesserung(alt, neu) {
  if (neu.gewicht > alt.gewicht) {
    return true;
  }
  if (neu.gewicht === alt.gewicht) {
    return neu.wiederholungen * neu.saetze > alt.wiederholungen * alt.saetze;
  }
  return false;
}

// Vergleicht aufeinanderfolgende Einträge DERSELBEN Übung.
// Liefert: Anzahl Vergleiche, Anzahl Verbesserungen, längste Serie von Verbesserungen
function analysiereEntwicklung(einheiten) {
  const sortiert = sortiereChronologisch(einheiten);

  // Einträge nach Übung sortieren (jede Übung nur mit sich selbst vergleichen)
  const proUebung = {};
  for (let i = 0; i < sortiert.length; i++) {
    const name = sortiert[i].uebung;
    if (!proUebung[name]) {
      proUebung[name] = [];
    }
    proUebung[name].push(sortiert[i]);
  }

  let vergleiche = 0;
  let verbesserungen = 0;
  let laengsteSerie = 0;

  const namen = Object.keys(proUebung);
  for (let n = 0; n < namen.length; n++) {
    const liste = proUebung[namen[n]];
    let serie = 0;
    for (let i = 1; i < liste.length; i++) {
      vergleiche++;
      if (istVerbesserung(liste[i - 1], liste[i])) {
        verbesserungen++;
        serie++;
        if (serie > laengsteSerie) {
          laengsteSerie = serie;
        }
      } else {
        serie = 0;
      }
    }
  }

  return { vergleiche: vergleiche, verbesserungen: verbesserungen, laengsteSerie: laengsteSerie };
}

// 30 / 20 / 10 / 0 Punkte je nach Entwicklung
function punkteEntwicklung(analyse) {
  if (analyse.laengsteSerie >= 3) {
    return 30;
  }
  let quote = 0;
  if (analyse.vergleiche > 0) {
    quote = analyse.verbesserungen / analyse.vergleiche;
  }
  if (analyse.verbesserungen >= 2 && quote >= 0.5) {
    return 20;
  }
  if (analyse.verbesserungen >= 1) {
    return 10;
  }
  return 0;
}

// ---------- Status und Farbe ----------
function bestimmeStatus(score, hatTrainingsdaten) {
  if (!hatTrainingsdaten) return { status: "Inactive", farbe: "Weiß" };
  if (score <= 20) return { status: "Starter", farbe: "Rot" };
  if (score <= 40) return { status: "Rising", farbe: "Orange" };
  if (score <= 70) return { status: "Advanced", farbe: "Gelb" };
  return { status: "Elite", farbe: "Grün" };
}

// Ergebnis für eine Muskelgruppe ohne Trainingsdaten
function leereMuskelgruppe() {
  return {
    score: 0,
    status: "Inactive",
    farbe: "Weiß",
    teilpunkte: { haeufigkeit: 0, relativeLeistung: 0, wiederholungen: 0, saetze: 0, entwicklung: 0 },
    hinweis: null
  };
}

// ---------- Hauptfunktion: Score einer Muskelgruppe ----------
// einheiten: nur die Einheiten DIESER Muskelgruppe
// koerpergewicht: Zahl oder null (wenn unbekannt)
function berechneMuskelgruppe(einheiten, koerpergewicht, heute) {
  if (einheiten.length === 0) {
    return leereMuskelgruppe();
  }

  // 1. Trainingshäufigkeit (max. 20)
  const trainingstage = zaehleTrainingstage(einheiten, heute);
  const haeufigkeit = punkteNachAnteil(trainingstage, ZIEL_TRAININGSTAGE, MAX_HAEUFIGKEIT);

  // 2. Relative Trainingsleistung (max. 20): höchstes Gewicht / Körpergewicht
  let relativeLeistung = 0;
  let hinweis = null;
  if (typeof koerpergewicht === "number" && koerpergewicht > 0) {
    const verhaeltnis = hoechsterWert(einheiten, "gewicht") / koerpergewicht;
    relativeLeistung = punkteNachAnteil(verhaeltnis, ZIEL_VERHAELTNIS, MAX_RELATIVE_LEISTUNG);
  } else {
    hinweis = "Es ist kein Körpergewicht gespeichert. Die relative Trainingsleistung kann nicht berechnet werden " +
              "(0 Punkte dafür). Die Trainingsdaten bleiben unverändert erhalten.";
  }

  // 3. Wiederholungen (max. 15): höchste Wiederholungszahl pro Satz
  const wiederholungen = punkteNachAnteil(hoechsterWert(einheiten, "wiederholungen"), ZIEL_WIEDERHOLUNGEN, MAX_WIEDERHOLUNGEN);

  // 4. Sätze (max. 15): höchste Satzzahl
  const saetze = punkteNachAnteil(hoechsterWert(einheiten, "saetze"), ZIEL_SAETZE, MAX_SAETZE);

  // 5. Entwicklung über die Zeit (max. 30)
  const entwicklung = punkteEntwicklung(analysiereEntwicklung(einheiten));

  // Gesamtscore: addieren, auf höchstens 100 begrenzen, kaufmännisch runden
  let summe = haeufigkeit + relativeLeistung + wiederholungen + saetze + entwicklung;
  if (summe > 100) {
    summe = 100;
  }
  const score = Math.round(summe);

  const statusInfo = bestimmeStatus(score, true);

  return {
    score: score,
    status: statusInfo.status,
    farbe: statusInfo.farbe,
    teilpunkte: {
      haeufigkeit: rundeEineStelle(haeufigkeit),
      relativeLeistung: rundeEineStelle(relativeLeistung),
      wiederholungen: rundeEineStelle(wiederholungen),
      saetze: rundeEineStelle(saetze),
      entwicklung: entwicklung
    },
    hinweis: hinweis
  };
}

// ---------- Aktivitätslevel (aus der Anzahl der Übungen) ----------

// Zählt, wie viele verschiedene Übungen an einem Tag absolviert wurden.
// (Nicht verwechseln mit den Trainingstagen!)
function zaehleUebungenAmTag(einheiten, datum) {
  const schonGezaehlt = {};
  let anzahl = 0;
  for (let i = 0; i < einheiten.length; i++) {
    if (einheiten[i].datum === datum) {
      const schluessel = einheiten[i].muskelgruppe + "|" + einheiten[i].uebung;
      if (!schonGezaehlt[schluessel]) {
        schonGezaehlt[schluessel] = true;
        anzahl++;
      }
    }
  }
  return anzahl;
}

// 0-2 Übungen: niedrig, 3-5: mittel, ab 6: hoch
function bestimmeAktivitaetslevel(anzahlUebungen) {
  if (anzahlUebungen <= 2) return "niedrig";
  if (anzahlUebungen <= 5) return "mittel";
  return "hoch";
}

module.exports = {
  heutigesDatum,
  istGueltigesDatum,
  sortiereChronologisch,
  berechneMuskelgruppe,
  leereMuskelgruppe,
  zaehleUebungenAmTag,
  bestimmeAktivitaetslevel
};
