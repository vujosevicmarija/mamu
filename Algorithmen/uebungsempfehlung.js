// ============================================================
// Übungsauswahl für die mamu-App
// Eingaben: Muskelgruppe, Trainingsziel, Trainingsstatus
// Ausgabe: genau 3 Übungen mit Sätzen und Wiederholungen
// ============================================================

// ---------- 1. Übungskatalog ----------
const uebungskatalog = {
  "Schultern": [
    { name: "Shoulder Press", beschreibung: "Hanteln oder eine Langhantel über den Kopf drücken, um die Schultermuskulatur zu trainieren." },
    { name: "Seitheben", beschreibung: "Hanteln seitlich bis ungefähr auf Schulterhöhe anheben." },
    { name: "Frontheben", beschreibung: "Hanteln kontrolliert vor dem Körper bis auf Schulterhöhe anheben." }
  ],
  "Brust": [
    { name: "Bankdrücken", beschreibung: "Eine Langhantel oder Hanteln im Liegen kontrolliert von der Brust nach oben drücken." },
    { name: "Liegestütze", beschreibung: "Den Körper aus einer stabilen Liegestützposition absenken und wieder nach oben drücken." },
    { name: "Butterfly", beschreibung: "Die Arme an einer Butterfly-Maschine vor dem Körper zusammenführen." }
  ],
  "Bizeps": [
    { name: "Bizepscurls", beschreibung: "Hanteln durch Beugen der Ellenbogen in Richtung Schultern anheben." },
    { name: "Hammer Curls", beschreibung: "Hanteln mit neutraler Handstellung und den Handflächen zueinander anheben." },
    { name: "Preacher Curls", beschreibung: "Die Arme auf einem Curl-Pult abstützen und das Gewicht kontrolliert anheben." }
  ],
  "Bauch": [
    { name: "Crunches", beschreibung: "Den Oberkörper aus der Rückenlage durch Anspannen der Bauchmuskulatur leicht anheben." },
    { name: "Plank", beschreibung: "Den Körper in einer geraden Position auf Unterarmen und Zehenspitzen stabil halten." },
    { name: "Beinheben", beschreibung: "Die gestreckten oder leicht gebeugten Beine aus der Rückenlage kontrolliert anheben und absenken." }
  ],
  "Oberschenkel": [
    { name: "Beinpresse", beschreibung: "Das Gewicht mit den Beinen kontrolliert von sich wegdrücken." },
    { name: "Beinstrecker", beschreibung: "Die Unterschenkel an einer Maschine gegen Widerstand nach vorne strecken." },
    { name: "Bulgarian Split Squats", beschreibung: "In versetzter Beinstellung mit dem hinteren Fuß auf einer Erhöhung kontrolliert in die Kniebeuge gehen." }
  ],
  "Waden": [
    { name: "Wadenheben stehend", beschreibung: "Die Fersen anheben und auf die Fußballen stellen." },
    { name: "Wadenheben sitzend", beschreibung: "Im Sitzen die Fersen gegen Widerstand anheben." },
    { name: "Donkey Calf Raises", beschreibung: "Mit nach vorne geneigtem Oberkörper die Fersen kontrolliert anheben." }
  ],
  "Nacken": [
    { name: "Shrugs", beschreibung: "Die Schultern mit oder ohne Hanteln kontrolliert in Richtung Ohren anheben." },
    { name: "Nackenstreckung", beschreibung: "Den Kopf gegen einen sehr leichten Widerstand kontrolliert nach hinten bewegen." },
    { name: "Nackenbeugung", beschreibung: "Den Kopf gegen einen sehr leichten Widerstand kontrolliert nach vorne bewegen." }
  ],
  "Rücken": [
    { name: "Lat Pulldown", beschreibung: "Eine Stange kontrolliert von oben in Richtung Brust ziehen." },
    { name: "Rudern", beschreibung: "Ein Gewicht kontrolliert in Richtung Bauch ziehen und die Schulterblätter zusammenführen." },
    { name: "Rückenstrecker", beschreibung: "Den Oberkörper aus einer nach vorne geneigten Position kontrolliert aufrichten." }
  ],
  "Trizeps": [
    { name: "Trizepsdrücken", beschreibung: "Ein Seil oder eine Stange am Kabelzug durch Strecken der Ellenbogen nach unten drücken." },
    { name: "Dips", beschreibung: "Den Körper mit den Armen absenken und wieder nach oben drücken." },
    { name: "Overhead Extensions", beschreibung: "Ein Gewicht hinter dem Kopf durch Strecken der Ellenbogen nach oben bewegen." }
  ],
  "Gesäß": [
    { name: "Hip Thrust", beschreibung: "Die Hüfte mit einer Hantel oder Langhantel kontrolliert nach oben drücken." },
    { name: "Romanian Deadlift", beschreibung: "Die Hüfte nach hinten schieben und das Gewicht mit leicht gebeugten Knien kontrolliert absenken." },
    { name: "Glute Bridge", beschreibung: "Das Becken aus der Rückenlage durch Anspannen der Gesäßmuskulatur anheben." }
  ],
  "Beine": [
    { name: "Kniebeugen", beschreibung: "Die Hüfte nach hinten und unten bewegen und anschließend kontrolliert wieder aufstehen." },
    { name: "Ausfallschritte", beschreibung: "Einen Schritt nach vorne machen, beide Knie beugen und wieder in die Ausgangsposition zurückkehren." },
    { name: "Beinpresse", beschreibung: "Das Gewicht mit beiden Beinen kontrolliert wegdrücken." }
  ]
};

// ---------- 2. Das Trainingsziel bestimmt die Wiederholungen ----------
const trainingsziele = {
  "Muskelaufbau":   { wiederholungen: "8–12",  zweck: "Muskelwachstum fördern" },
  "Abnehmen":       { wiederholungen: "12–15", zweck: "Muskulatur erhalten und das Training unterstützen" },
  "Gewicht halten": { wiederholungen: "10–12", zweck: "Kraft und Muskulatur erhalten" },
  "Zunehmen":       { wiederholungen: "8–12",  zweck: "Körpergewicht und Muskelmasse erhöhen" }
};

// ---------- 3. Der Trainingsstatus bestimmt NUR die Sätze ----------
const saetzeProStatus = {
  "Starter": 2,
  "Rising": 3,
  "Advanced": 3,
  "Elite": 4
};

// ---------- 4. Hilfsfunktion ----------
// Sucht einen Eintrag, egal ob groß oder klein geschrieben wurde.
// Gibt den richtigen Namen zurück oder null, wenn nichts passt.
function findeSchluessel(objekt, eingabe) {
  if (typeof eingabe !== "string") {
    return null;
  }
  const gesucht = eingabe.trim().toLowerCase();
  const alleNamen = Object.keys(objekt);
  for (let i = 0; i < alleNamen.length; i++) {
    if (alleNamen[i].toLowerCase() === gesucht) {
      return alleNamen[i];
    }
  }
  return null;
}

// ---------- 5. Hauptfunktion: der Algorithmus ----------
function waehleUebungen(muskelgruppe, trainingsziel, trainingsstatus) {

  // Schritt 1: Muskelgruppe prüfen
  const gruppe = findeSchluessel(uebungskatalog, muskelgruppe);
  if (gruppe === null) {
    return {
      ok: false,
      fehler: "Ungültige Muskelgruppe. Erlaubt sind: " + Object.keys(uebungskatalog).join(", ") + "."
    };
  }

  // Schritt 2: Trainingsziel prüfen
  const ziel = findeSchluessel(trainingsziele, trainingsziel);
  if (ziel === null) {
    return {
      ok: false,
      fehler: "Ungültiges Trainingsziel. Erlaubt sind: " + Object.keys(trainingsziele).join(", ") + "."
    };
  }

  // Schritt 3: Trainingsstatus prüfen (fehlt er, wird Starter verwendet)
  let status;
  const statusFehlt = (trainingsstatus === undefined ||
                       trainingsstatus === null ||
                       String(trainingsstatus).trim() === "");
  if (statusFehlt) {
    status = "Starter";
  } else {
    status = findeSchluessel(saetzeProStatus, trainingsstatus);
    if (status === null) {
      return {
        ok: false,
        fehler: "Ungültiger Trainingsstatus. Erlaubt sind: " + Object.keys(saetzeProStatus).join(", ") + "."
      };
    }
  }

  // Schritt 4: Sätze und Wiederholungen bestimmen
  const saetze = saetzeProStatus[status];                      // nur vom Status abhängig
  const wiederholungen = trainingsziele[ziel].wiederholungen;  // nur vom Ziel abhängig

  // Schritt 5: die drei Übungen der Muskelgruppe aus dem Katalog nehmen
  // (immer genau drei, immer dieselben, nicht zufällig)
  const katalogUebungen = uebungskatalog[gruppe];
  const ergebnisUebungen = [];
  for (let i = 0; i < 3; i++) {
    ergebnisUebungen.push({
      name: katalogUebungen[i].name,
      beschreibung: katalogUebungen[i].beschreibung,
      saetze: saetze,
      wiederholungen: wiederholungen
    });
  }

  // Schritt 6: Sicherheitshinweis bei Nackenübungen
  let hinweis = null;
  if (gruppe === "Nacken") {
    hinweis = "Sicherheitshinweis: Nackenübungen nur mit sehr leichtem Widerstand " +
              "und ohne ruckartige Bewegungen ausführen.";
  }

  return {
    ok: true,
    muskelgruppe: gruppe,
    trainingsziel: ziel,
    zweck: trainingsziele[ziel].zweck,
    trainingsstatus: status,
    uebungen: ergebnisUebungen,
    hinweis: hinweis
  };
}

// ---------- 6. Ausgabe in der Konsole ----------
function zeigeErgebnis(ergebnis) {
  if (!ergebnis.ok) {
    console.log("Fehler: " + ergebnis.fehler);
    return;
  }
  console.log("Muskelgruppe:    " + ergebnis.muskelgruppe);
  console.log("Trainingsziel:   " + ergebnis.trainingsziel + " (" + ergebnis.zweck + ")");
  console.log("Trainingsstatus: " + ergebnis.trainingsstatus);
  for (let i = 0; i < ergebnis.uebungen.length; i++) {
    const u = ergebnis.uebungen[i];
    console.log("");
    console.log((i + 1) + ". " + u.name);
    console.log("   " + u.beschreibung);
    console.log("   " + u.saetze + " Sätze à " + u.wiederholungen + " Wiederholungen");
  }
  if (ergebnis.hinweis !== null) {
    console.log("");
    console.log(ergebnis.hinweis);
  }
}

// ---------- 7. Tests ----------
function test(titel, muskelgruppe, ziel, status) {
  console.log("--------------------------------------------------");
  console.log("TEST: " + titel);
  console.log("--------------------------------------------------");
  zeigeErgebnis(waehleUebungen(muskelgruppe, ziel, status));
  console.log("");
}

// Die Testaufrufe laufen nur, wenn diese Datei direkt gestartet wird.
if (require.main === module) {

    test("Muskelaufbau mit Starter (Beispiel aus der Aufgabe)", "Gesäß", "Muskelaufbau", "Starter");

    test("Abnehmen mit Advanced", "Brust", "Abnehmen", "Advanced");

    test("Gewicht halten mit Elite", "Rücken", "Gewicht halten", "Elite");

    test("Fehlender Trainingsstatus (wird zu Starter)", "Bizeps", "Zunehmen");

    test("Nacken mit Sicherheitshinweis", "Nacken", "Muskelaufbau", "Rising");

    test("Ungültige Muskelgruppe", "Ohren", "Muskelaufbau", "Starter");

    test("Ungültiges Trainingsziel", "Brust", "Fliegen lernen", "Starter");

    test("Ungültiger Trainingsstatus", "Brust", "Abnehmen", "Superheld");

}
// Export, damit andere Dateien die Funktion und den Katalog mit require() einbinden können
module.exports = { waehleUebungen, uebungskatalog };
