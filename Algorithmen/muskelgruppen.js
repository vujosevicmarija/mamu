// =====================================================================
// mamu – Berechnung des Trainingsstatus pro Muskelgruppe
// Nur die Berechnung. Kein HTML, kein CSS, keine Speicherung.
// Das Speichern in Textdateien passiert in einem eigenen Modul,
// das dieses Modul nur aufruft (siehe Hinweis ganz unten).
// =====================================================================

// Liste der erlaubten Muskelgruppen
var MUSKELGRUPPEN = [
  "Schultern", "Brust", "Bizeps", "Bauch", "Oberschenkel", "Waden",
  "Nacken", "Rücken", "Trizeps", "Gesäß", "Beine"
];


// ---------------------------------------------------------------------
// SCHRITT 1: Eingaben prüfen
// ---------------------------------------------------------------------

// Hilfsfunktion: Ist der Wert eine ganze Zahl?
function istGanzeZahl(wert) {
  return typeof wert === "number" && isFinite(wert) && Math.floor(wert) === wert;
}

// Hilfsfunktion: Ist der Wert ein gültiges Datum?
function istGueltigesDatum(wert) {
  if (wert === undefined || wert === null || wert === "") {
    return false;
  }
  var d = new Date(wert);
  return !isNaN(d.getTime());
}

// Prüft eine einzelne Trainingseinheit (aktuell oder vergangen).
// "name" wird nur für die Fehlermeldung verwendet.
function pruefeTraining(training, name, fehler) {
  if (training === undefined || training === null) {
    fehler.push(name + ": Trainingsdaten fehlen.");
    return;
  }
  if (!istGueltigesDatum(training.datum)) {
    fehler.push(name + ": Das Datum ist ungültig.");
  }
  if (typeof training.uebungen !== "number" || training.uebungen < 0) {
    fehler.push(name + ": Die Trainingshäufigkeit darf nicht negativ sein.");
  }
  if (typeof training.gewicht !== "number" || training.gewicht < 0) {
    fehler.push(name + ": Das Trainingsgewicht darf nicht negativ sein.");
  }
  if (!istGanzeZahl(training.wiederholungen) || training.wiederholungen < 1) {
    fehler.push(name + ": Wiederholungen müssen eine positive ganze Zahl sein.");
  }
  if (!istGanzeZahl(training.saetze) || training.saetze < 1) {
    fehler.push(name + ": Sätze müssen eine positive ganze Zahl sein.");
  }
}

// Prüft alle Eingaben und gibt eine Liste mit Fehlermeldungen zurück.
// Ist die Liste leer, sind alle Eingaben gültig.
function pruefeEingaben(eingabe) {
  var fehler = [];

  // Pflichtfelder dürfen nicht leer sein
  if (!eingabe.muskelgruppe) {
    fehler.push("Die Muskelgruppe ist ein Pflichtfeld.");
  } else if (MUSKELGRUPPEN.indexOf(eingabe.muskelgruppe) === -1) {
    fehler.push("Unbekannte Muskelgruppe: " + eingabe.muskelgruppe);
  }
  if (!eingabe.geschlecht) {
    fehler.push("Das Geschlecht ist ein Pflichtfeld.");
  }
  if (!eingabe.trainingsziel) {
    fehler.push("Das Trainingsziel ist ein Pflichtfeld.");
  }

  // Persönliche Daten
  if (!istGanzeZahl(eingabe.alter) || eingabe.alter < 1) {
    fehler.push("Das Alter muss eine positive ganze Zahl sein.");
  }
  if (typeof eingabe.koerpergroesse !== "number" ||
      eingabe.koerpergroesse < 100 || eingabe.koerpergroesse > 250) {
    fehler.push("Die Körpergröße muss zwischen 100 und 250 cm liegen.");
  }
  if (typeof eingabe.koerpergewicht !== "number" ||
      eingabe.koerpergewicht < 30 || eingabe.koerpergewicht > 300) {
    fehler.push("Das Körpergewicht muss zwischen 30 und 300 kg liegen.");
  }

  // Aktuelles Training (darf fehlen -> dann später Status "Inactive")
  if (eingabe.aktuellesTraining !== undefined && eingabe.aktuellesTraining !== null) {
    pruefeTraining(eingabe.aktuellesTraining, "Aktuelles Training", fehler);
  }

  // Vergangene Trainingseinheiten derselben Muskelgruppe
  if (eingabe.vergangeneTrainings !== undefined && eingabe.vergangeneTrainings !== null) {
    for (var i = 0; i < eingabe.vergangeneTrainings.length; i++) {
      pruefeTraining(eingabe.vergangeneTrainings[i], "Vergangenes Training " + (i + 1), fehler);
    }
  }

  return fehler;
}


// ---------------------------------------------------------------------
// SCHRITT 2: Punkte für die fünf Bereiche berechnen
// ---------------------------------------------------------------------

// Trainingshäufigkeit (max. 20 Punkte) – nach Anzahl der Übungen
function berechneHaeufigkeitsPunkte(uebungen) {
  var anzahl = Math.floor(uebungen);
  if (anzahl <= 1) {
    return 0;
  } else if (anzahl <= 3) {
    return 5;
  } else if (anzahl <= 5) {
    return 10;
  } else if (anzahl <= 7) {
    return 15;
  } else {
    return 20; // 8 oder mehr Übungen
  }
}

// Relative Trainingsleistung (max. 20 Punkte)
// Formel: relatives Trainingsgewicht = verwendetes Gewicht / Körpergewicht
function berechneRelativesGewicht(gewicht, koerpergewicht) {
  return gewicht / koerpergewicht;
}

function berechneLeistungsPunkte(relativesGewicht) {
  if (relativesGewicht < 0.25) {
    return 0;
  } else if (relativesGewicht < 0.50) {
    return 5;
  } else if (relativesGewicht < 0.75) {
    return 10;
  } else if (relativesGewicht < 1.00) {
    return 15;
  } else {
    return 20; // Verhältnis von mindestens 1,00
  }
}

// Wiederholungen (max. 15 Punkte)
// Annahme: Mehr als 12 Wiederholungen bekommen ebenfalls 15 Punkte.
function berechneWiederholungsPunkte(wiederholungen) {
  if (wiederholungen <= 4) {
    return 5;
  } else if (wiederholungen <= 8) {
    return 10;
  } else {
    return 15;
  }
}

// Sätze (max. 15 Punkte)
function berechneSatzPunkte(saetze) {
  if (saetze === 1) {
    return 5;
  } else if (saetze === 2) {
    return 10;
  } else {
    return 15; // 3 oder mehr Sätze
  }
}

// Hilfsfunktion: Ist Training "neu" besser als Training "alt"?
// Besser heißt: mehr Gewicht ODER gleiches Gewicht mit mehr Wiederholungen x Sätzen.
function istBesser(neu, alt) {
  if (neu.gewicht > alt.gewicht) {
    return true;
  }
  if (neu.gewicht === alt.gewicht &&
      neu.wiederholungen * neu.saetze > alt.wiederholungen * alt.saetze) {
    return true;
  }
  return false;
}

// Entwicklung über die Zeit (max. 30 Punkte)
// Wir legen alle Trainings (vergangene + aktuelles) nach Datum in eine Reihe
// und vergleichen jedes Training mit dem davor.
function berechneEntwicklungsPunkte(vergangene, aktuelles) {
  var alle = [];

  // Vergangene Trainings in die Liste kopieren
  if (vergangene) {
    for (var i = 0; i < vergangene.length; i++) {
      alle.push(vergangene[i]);
    }
  }
  // Aktuelles Training am Ende hinzufügen
  alle.push(aktuelles);

  // Nach Datum sortieren (älteste zuerst)
  alle.sort(function (a, b) {
    return new Date(a.datum) - new Date(b.datum);
  });

  // Ohne Vergleichsdaten gibt es 0 Punkte
  if (alle.length < 2) {
    return 0;
  }

  // Verbesserungen zählen
  var vergleiche = alle.length - 1;
  var verbesserungen = 0;
  for (var j = 1; j < alle.length; j++) {
    if (istBesser(alle[j], alle[j - 1])) {
      verbesserungen = verbesserungen + 1;
    }
  }

  var anteil = verbesserungen / vergleiche;

  if (verbesserungen === 0) {
    return 0;  // keine Verbesserung
  } else if (anteil === 1 && verbesserungen >= 3) {
    return 30; // deutliche und kontinuierliche Verbesserung
  } else if (anteil >= 0.5 && verbesserungen >= 2) {
    return 20; // regelmäßige Verbesserung
  } else {
    return 10; // leichte Verbesserung
  }
}


// ---------------------------------------------------------------------
// SCHRITT 3: Gesamtscore -> Status und Farbe
// ---------------------------------------------------------------------

// Die Statusstufen sind eine interne Einteilung von mamu
// und keine allgemeingültige sportliche Bewertung.
function ermittleStatus(score) {
  if (score === 0) {
    return { status: "Inactive", farbe: "Weiß" };
  } else if (score <= 20) {
    return { status: "Starter", farbe: "Rot" };
  } else if (score <= 40) {
    return { status: "Rising", farbe: "Orange" };
  } else if (score <= 70) {
    return { status: "Advanced", farbe: "Gelb" };
  } else {
    return { status: "Elite", farbe: "Grün" };
  }
}


// ---------------------------------------------------------------------
// HAUPTFUNKTION: berechnet den Trainingsstatus EINER Muskelgruppe.
// Für mehrere Muskelgruppen wird sie einfach mehrmals aufgerufen,
// jede Muskelgruppe ist unabhängig von den anderen.
// ---------------------------------------------------------------------
function berechneTrainingsstatus(eingabe) {

  // 1) Eingaben prüfen. Bei Fehlern wird NICHT berechnet.
  var fehler = pruefeEingaben(eingabe);
  if (fehler.length > 0) {
    return { erfolg: false, fehler: fehler };
  }

  // 2) Keine Trainingsdaten vorhanden -> Score 0, Inactive, Weiß
  if (eingabe.aktuellesTraining === undefined || eingabe.aktuellesTraining === null) {
    return {
      erfolg: true,
      muskelgruppe: eingabe.muskelgruppe,
      score: 0,
      status: "Inactive",
      farbe: "Weiß",
      infos: { hinweis: "Keine Trainingsdaten vorhanden." }
    };
  }

  var t = eingabe.aktuellesTraining;

  // 3) Die fünf Bereiche berechnen
  var relativesGewicht = berechneRelativesGewicht(t.gewicht, eingabe.koerpergewicht);

  var punkteHaeufigkeit = berechneHaeufigkeitsPunkte(t.uebungen);           // max. 20
  var punkteLeistung    = berechneLeistungsPunkte(relativesGewicht);        // max. 20
  var punkteWdh         = berechneWiederholungsPunkte(t.wiederholungen);    // max. 15
  var punkteSaetze      = berechneSatzPunkte(t.saetze);                     // max. 15
  var punkteEntwicklung = berechneEntwicklungsPunkte(
    eingabe.vergangeneTrainings, t);                                        // max. 30

  // 4) Gesamtscore = Summe aller Punkte (maximal 100)
  var score = punkteHaeufigkeit + punkteLeistung + punkteWdh +
              punkteSaetze + punkteEntwicklung;

  // 5) Status und Farbe zuordnen
  var ergebnisStatus = ermittleStatus(score);

  // 6) Ergebnis zurückgeben
  return {
    erfolg: true,
    muskelgruppe: eingabe.muskelgruppe,
    score: score,
    status: ergebnisStatus.status,
    farbe: ergebnisStatus.farbe,
    infos: {
      relativesGewicht: Math.round(relativesGewicht * 100) / 100,
      punkte: {
        haeufigkeit: punkteHaeufigkeit,
        leistung: punkteLeistung,
        wiederholungen: punkteWdh,
        saetze: punkteSaetze,
        entwicklung: punkteEntwicklung
      }
    }
  };
}


// ---------------------------------------------------------------------
// BEISPIEL (zum Ausprobieren mit: node mamu_algorithmus.js)
// ---------------------------------------------------------------------
var beispiel = {
  muskelgruppe: "Bizeps",
  alter: 20,
  geschlecht: "männlich",
  koerpergroesse: 180,
  koerpergewicht: 60,
  trainingsziel: "Muskelaufbau",
  aktuellesTraining: {
    datum: "2026-09-29", uebungen: 6, gewicht: 30, wiederholungen: 10, saetze: 2
  },
  vergangeneTrainings: [
    { datum: "2026-09-15", uebungen: 4, gewicht: 20, wiederholungen: 8, saetze: 2 },
    { datum: "2026-09-22", uebungen: 5, gewicht: 25, wiederholungen: 8, saetze: 2 }
  ]
};

// Der Beispielaufruf läuft nur, wenn diese Datei direkt gestartet wird.
// Beim Einbinden mit require() wird er NICHT ausgeführt.
if (require.main === module) {
    var beispiel = {
        // Hier bleibt dein bisheriges Beispiel unverändert
    };

    console.log(berechneTrainingsstatus(beispiel));
}

// ---------------------------------------------------------------------
// HINWEIS ZUR SPEICHERUNG
// Dieses Modul liest und schreibt keine Dateien. Ein späteres Modul
// (z. B. "speicherung.js") lädt die Trainingsdaten aus der Textdatei,
// ruft berechneTrainingsstatus(...) auf und speichert danach nur,
// wenn ergebnis.erfolg === true ist.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// EXPORT
// ACHTUNG: Diese Datei enthält die ÄLTEREN Score-Regeln (Stufen statt proportionaler
// Punkte). Die Trainingsverwaltung (trainingsdaten.js) verwendet sie NICHT, sondern
// ausschließlich die vereinbarten Regeln aus berechnung.js.
// ---------------------------------------------------------------------
module.exports = { MUSKELGRUPPEN, berechneTrainingsstatus };