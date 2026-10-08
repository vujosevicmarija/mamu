// ============================================================
// mamu-test.js  -  TESTLAUF
// Prüft die Trainingsdatenverwaltung. Es wird ein eigener Ordner
// "daten-test" verwendet, die echten Daten bleiben unberührt.
// Start:  node mamu-test.js
// ============================================================

const fs = require("fs");
const path = require("path");
const speicher = require("./speicher");
const berechnung = require("./berechnung");
const trainingsdaten = require("./trainingsdaten");
const anzeige = require("./anzeige");
const integration = require("./integration");

// Die drei Originaldateien (für die Kompatibilitätsprüfung in Abschnitt 13)
const childProcess = require("child_process");
const ernaehrung = require("./ernaehrung");
const uebungsempfehlung = require("./uebungsempfehlung");
const muskelgruppenAlt = require("./muskelgruppen"); // ältere Score-Regeln, werden NICHT verwendet

// Eigener Testordner, bei jedem Start leer
const testOrdner = path.join(__dirname, "daten-test");
fs.rmSync(testOrdner, { recursive: true, force: true });
speicher.setzeDatenordner(testOrdner);

let bestanden = 0;
let durchgefallen = 0;

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    bestanden++;
    console.log("  [OK]      " + beschreibung);
  } else {
    durchgefallen++;
    console.log("  [FEHLER]  " + beschreibung);
  }
}

function titel(text) {
  console.log("\n=== " + text + " ===");
}

// Datum von vor n Tagen im Format JJJJ-MM-TT
function datumVorTagen(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function anzahlGespeicherterEinheiten() {
  return trainingsdaten.holeAlleEinheiten().einheiten.length;
}

// ---------- 1. Start ohne Dateien ----------
titel("1. Start ohne Dateien");
let r = trainingsdaten.starteMamu();
anzeige.zeigeHinweise(r.hinweise);
pruefe("Start klappt", r.ok);
pruefe("Alle Muskelgruppen sind Inactive, Score 0, Weiß",
  Object.keys(r.status).every(function (g) {
    return r.status[g].status === "Inactive" && r.status[g].score === 0 && r.status[g].farbe === "Weiß";
  }));
pruefe("11 Muskelgruppen vorhanden", Object.keys(r.status).length === 11);

// ---------- 2. Eintrag ohne Körpergewicht ----------
titel("2. Eintrag ohne Körpergewicht");
r = trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Bizeps", uebung: "Bizepscurls", gewicht: 10, wiederholungen: 10, saetze: 3 });
anzeige.zeigeHinweise(r.hinweise);
pruefe("Einheit gespeichert (ID 1, Datum heute)", r.ok && r.einheit.id === 1 && r.einheit.datum === berechnung.heutigesDatum());
anzeige.zeigeTeilpunkte("Bizeps", r.status["Bizeps"]);
pruefe("Hinweis zum fehlenden Körpergewicht erscheint", r.hinweise.length > 0);
pruefe("Bizeps: 23 Punkte, Rising, Orange", r.status["Bizeps"].score === 23 && r.status["Bizeps"].status === "Rising" && r.status["Bizeps"].farbe === "Orange");
pruefe("Andere Muskelgruppe bleibt Inactive", r.status["Brust"].status === "Inactive");

// ---------- 3. Körpergewicht setzen ----------
titel("3. Körpergewicht speichern (70 kg)");
r = trainingsdaten.speichereKoerpergewicht(70);
pruefe("Körpergewicht gespeichert", r.ok && r.koerpergewicht === 70);
anzeige.zeigeTeilpunkte("Bizeps", r.status["Bizeps"]);
pruefe("Bizeps jetzt 26 Punkte", r.status["Bizeps"].score === 26);
r = trainingsdaten.speichereKoerpergewicht(-5);
pruefe("Negatives Körpergewicht wird abgelehnt", !r.ok);
anzeige.zeigeFehler(r.fehler);

// ---------- 4. Brust mit Verbesserungen ----------
titel("4. Brust: vier Bankdrück-Einheiten mit drei Verbesserungen");
trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Brust", uebung: "Bankdrücken", gewicht: 50, wiederholungen: 10, saetze: 3, datum: datumVorTagen(20) });
trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Brust", uebung: "Bankdrücken", gewicht: 50, wiederholungen: 12, saetze: 3, datum: datumVorTagen(13) });
trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Brust", uebung: "Bankdrücken", gewicht: 55, wiederholungen: 8, saetze: 3, datum: datumVorTagen(6) });
r = trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Brust", uebung: "Bankdrücken", gewicht: 60, wiederholungen: 6, saetze: 3, datum: datumVorTagen(1) });
anzeige.zeigeTeilpunkte("Brust", r.status["Brust"]);
pruefe("Brust: 77 Punkte, Elite, Grün", r.status["Brust"].score === 77 && r.status["Brust"].status === "Elite" && r.status["Brust"].farbe === "Grün");
pruefe("Entwicklung = 30 Punkte", r.status["Brust"].teilpunkte.entwicklung === 30);
pruefe("Bizeps wurde nicht beeinflusst (26 Punkte)", r.status["Bizeps"].score === 26);

// ---------- 5. Ungültige Eingaben ----------
titel("5. Ungültige Eingaben (nichts darf gespeichert werden)");
const vorher = anzahlGespeicherterEinheiten();
const ungueltig = [
  ["Negatives Gewicht", { muskelgruppe: "Brust", uebung: "Butterfly", gewicht: -5, wiederholungen: 10, saetze: 3 }],
  ["Fehlende Pflichtfelder", { muskelgruppe: "Brust", gewicht: 20 }],
  ["Dezimale Wiederholungen", { muskelgruppe: "Brust", uebung: "Butterfly", gewicht: 20, wiederholungen: 10.5, saetze: 3 }],
  ["Sätze = 0", { muskelgruppe: "Brust", uebung: "Butterfly", gewicht: 20, wiederholungen: 10, saetze: 0 }],
  ["Datum in der Zukunft", { muskelgruppe: "Brust", uebung: "Butterfly", gewicht: 20, wiederholungen: 10, saetze: 3, datum: "2999-01-01" }],
  ["Unmögliches Datum", { muskelgruppe: "Brust", uebung: "Butterfly", gewicht: 20, wiederholungen: 10, saetze: 3, datum: "2026-02-30" }],
  ["Übung passt nicht zur Muskelgruppe", { muskelgruppe: "Brust", uebung: "Hip Thrust", gewicht: 20, wiederholungen: 10, saetze: 3 }],
  ["Unbekannte Muskelgruppe", { muskelgruppe: "Ohren", uebung: "Shrugs", gewicht: 20, wiederholungen: 10, saetze: 3 }],
  ["Gewicht ist Text", { muskelgruppe: "Brust", uebung: "Butterfly", gewicht: "abc", wiederholungen: 10, saetze: 3 }]
];
for (let i = 0; i < ungueltig.length; i++) {
  r = trainingsdaten.fuegeTrainingseinheitHinzu(ungueltig[i][1]);
  pruefe(ungueltig[i][0] + " wird abgelehnt", !r.ok);
  anzeige.zeigeFehler(r.fehler);
}
pruefe("Anzahl gespeicherter Einheiten unverändert (" + vorher + ")", anzahlGespeicherterEinheiten() === vorher);

// ---------- 6. Gewicht 0 ----------
titel("6. Gewicht 0 ist erlaubt (Plank)");
r = trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Bauch", uebung: "Plank", gewicht: 0, wiederholungen: 1, saetze: 3 });
pruefe("Plank mit 0 kg gespeichert", r.ok);

// ---------- 7. Historie ----------
titel("7. Historie pro Muskelgruppe");
r = trainingsdaten.holeHistorie("brust");
anzeige.zeigeHistorie(r);
pruefe("Brust hat 4 Einträge, chronologisch", r.ok && r.einheiten.length === 4 && r.einheiten[0].datum < r.einheiten[3].datum);
r = trainingsdaten.holeHistorie("Trizeps");
pruefe("Trizeps hat noch keine Einträge", r.ok && r.einheiten.length === 0);
r = trainingsdaten.holeHistorie("Ohren");
pruefe("Unbekannte Muskelgruppe liefert Fehlermeldung", !r.ok);

// ---------- 8. Bearbeiten ----------
titel("8. Bearbeiten (letzte Bankdrück-Einheit mit nur 40 kg)");
r = trainingsdaten.bearbeiteTrainingseinheit(5, { gewicht: 40, id: 999 });
pruefe("Bearbeiten klappt, ID bleibt 5", r.ok && r.einheit.id === 5 && r.einheit.gewicht === 40);
anzeige.zeigeTeilpunkte("Brust", r.status["Brust"]);
pruefe("Brust: 66 Punkte, Advanced, Gelb", r.status["Brust"].score === 66 && r.status["Brust"].status === "Advanced" && r.status["Brust"].farbe === "Gelb");
pruefe("Entwicklung = 20 Punkte (2 Verbesserungen, Quote 67 %)", r.status["Brust"].teilpunkte.entwicklung === 20);
r = trainingsdaten.bearbeiteTrainingseinheit(5, { gewicht: -1 });
pruefe("Ungültige Änderung wird abgelehnt", !r.ok);
r = trainingsdaten.bearbeiteTrainingseinheit(5, { uebung: "Hip Thrust" });
pruefe("Ungültige Kombination beim Bearbeiten wird abgelehnt", !r.ok);
r = trainingsdaten.bearbeiteTrainingseinheit(12345, { gewicht: 10 });
pruefe("Unbekannte ID wird abgelehnt", !r.ok);
anzeige.zeigeFehler(r.fehler);

// ---------- 9. Löschen ----------
titel("9. Löschen");
r = trainingsdaten.loescheTrainingseinheit(5);
pruefe("Löschen klappt", r.ok);
anzeige.zeigeTeilpunkte("Brust", r.status["Brust"]);
pruefe("Brust: 64 Punkte, Advanced", r.status["Brust"].score === 64 && r.status["Brust"].status === "Advanced");
r = trainingsdaten.loescheTrainingseinheit(5);
pruefe("Zweites Löschen derselben ID wird abgelehnt", !r.ok);
r = trainingsdaten.loescheTrainingseinheit(2);
r = trainingsdaten.loescheTrainingseinheit(3);
r = trainingsdaten.loescheTrainingseinheit(4);
anzeige.zeigeTeilpunkte("Brust", r.status["Brust"]);
pruefe("Brust ohne Einträge: wieder Inactive, 0, Weiß", r.status["Brust"].status === "Inactive" && r.status["Brust"].score === 0 && r.status["Brust"].farbe === "Weiß");

// ---------- 10. Neustart ----------
titel("10. Neustart: Daten werden geladen, Status neu berechnet");
r = trainingsdaten.starteMamu();
pruefe("Bizeps ist nach Neustart weiterhin 26 Punkte", r.ok && r.status["Bizeps"].score === 26);
pruefe("Einheiten bleiben erhalten (Bizepscurls + Plank)", anzahlGespeicherterEinheiten() === 2);
anzeige.zeigeStatus(r.status);

// ---------- 11. Beschädigte Datei ----------
titel("11. Beschädigte Datei darf nicht überschrieben werden");
const einheitenPfad = speicher.dateipfad("trainingseinheiten.json");
const original = fs.readFileSync(einheitenPfad, "utf8");
fs.writeFileSync(einheitenPfad, "{ kaputt", "utf8");
r = trainingsdaten.fuegeTrainingseinheitHinzu({ muskelgruppe: "Brust", uebung: "Butterfly", gewicht: 20, wiederholungen: 10, saetze: 3 });
pruefe("Speichern wird mit Fehlermeldung abgelehnt", !r.ok);
anzeige.zeigeFehler(r.fehler);
pruefe("Kaputte Datei wurde nicht verändert", fs.readFileSync(einheitenPfad, "utf8") === "{ kaputt");
r = trainingsdaten.starteMamu();
pruefe("Start meldet Fehler statt leere Daten zu verwenden", !r.ok);
fs.writeFileSync(einheitenPfad, original, "utf8");
r = trainingsdaten.starteMamu();
pruefe("Nach Wiederherstellung läuft alles wieder", r.ok && r.status["Bizeps"].score === 26);
pruefe("Keine .tmp-Dateien übrig", fs.readdirSync(testOrdner).every(function (n) { return !n.endsWith(".tmp"); }));

// ---------- 12. Verbindung zu bestehenden Funktionen ----------
titel("12. Verbindung zu uebungsempfehlung.js und ernaehrung.js");
r = integration.holeUebungenFuerMuskelgruppe("Trizeps", "Muskelaufbau");
pruefe("Trizeps (Inactive) bekommt Übungen mit Starter-Satzzahl (2 Sätze, 8–12)",
  r.ok && r.angezeigterStatus === "Inactive" && r.empfehlung.trainingsstatus === "Starter" &&
  r.empfehlung.uebungen[0].saetze === 2 && r.empfehlung.uebungen[0].wiederholungen === "8–12");
r = integration.holeUebungenFuerMuskelgruppe("Bizeps", "Abnehmen");
pruefe("Bizeps (Rising) bekommt 3 Sätze à 12–15",
  r.ok && r.angezeigterStatus === "Rising" && r.empfehlung.uebungen[0].saetze === 3 && r.empfehlung.uebungen[0].wiederholungen === "12–15");
r = integration.holeUebungenFuerMuskelgruppe("Ohren", "Abnehmen");
pruefe("Ungültige Muskelgruppe liefert Fehlermeldung", !r.ok);

r = integration.berechneErnaehrungFuerMamu("Muskelaufbau");
console.log("  Ergebnis:", JSON.stringify(r));
pruefe("Ernährung: heute 2 Übungen (niedrig), 70 kg, Muskelaufbau = 2400 kcal, 140 g Protein",
  r.ok && r.anzahlUebungenHeute === 2 && r.aktivitaetslevel === "niedrig" && r.ergebnis.kalorien === 2400 && r.ergebnis.protein === 140);

// ---------- 13. Kompatibilität mit den Originaldateien ----------
titel("13. Kompatibilität mit ernaehrung.js, muskelgruppen.js und uebungsempfehlung.js");

// 13a) Exporte vorhanden?
pruefe("ernaehrung.js exportiert berechneErnaehrung", typeof ernaehrung.berechneErnaehrung === "function");
pruefe("uebungsempfehlung.js exportiert waehleUebungen und uebungskatalog",
  typeof uebungsempfehlung.waehleUebungen === "function" && typeof uebungsempfehlung.uebungskatalog === "object");
pruefe("muskelgruppen.js exportiert berechneTrainingsstatus und MUSKELGRUPPEN",
  typeof muskelgruppenAlt.berechneTrainingsstatus === "function" && Array.isArray(muskelgruppenAlt.MUSKELGRUPPEN));

// 13b) Beim Einbinden darf nichts auf dem Bildschirm erscheinen
const dateien = ["ernaehrung", "uebungsempfehlung", "muskelgruppen"];
for (let i = 0; i < dateien.length; i++) {
  // Ein eigener Node-Prozess bindet die Datei ein und wir schauen, ob etwas ausgegeben wird
  const ausgabe = childProcess.execFileSync(process.execPath, ["-e", "require('./" + dateien[i] + "')"],
    { cwd: __dirname, encoding: "utf8" });
  pruefe(dateien[i] + ".js gibt beim Einbinden nichts aus", ausgabe === "");
}

// 13c) Direkt gestartet laufen die bisherigen Tests weiterhin
const direkt = childProcess.execFileSync(process.execPath, ["uebungsempfehlung.js"], { cwd: __dirname, encoding: "utf8" });
pruefe("node uebungsempfehlung.js führt die bisherigen Tests weiterhin aus",
  direkt.indexOf("TEST: Muskelaufbau mit Starter") !== -1 && direkt.indexOf("TEST: Ungültiger Trainingsstatus") !== -1);

// 13d) Muskelgruppennamen stimmen überall überein
const katalogGruppen = Object.keys(uebungsempfehlung.uebungskatalog);
pruefe("Muskelgruppen: muskelgruppen.js und Übungskatalog sind identisch (11, gleiche Reihenfolge)",
  katalogGruppen.length === 11 && JSON.stringify(katalogGruppen) === JSON.stringify(muskelgruppenAlt.MUSKELGRUPPEN));
r = trainingsdaten.holeAlleStatus();
pruefe("Muskelgruppen: muskelstatus.json verwendet dieselben Namen",
  r.ok && JSON.stringify(Object.keys(r.status)) === JSON.stringify(katalogGruppen));

// 13e) Alle 33 Übungsnamen des Katalogs werden von der Trainingsverwaltung akzeptiert
const namenOrdner = path.join(__dirname, "daten-test-namen");
fs.rmSync(namenOrdner, { recursive: true, force: true });
speicher.setzeDatenordner(namenOrdner);
let uebungenGesamt = 0;
let uebungenAkzeptiert = 0;
for (let i = 0; i < katalogGruppen.length; i++) {
  const liste = uebungsempfehlung.uebungskatalog[katalogGruppen[i]];
  for (let j = 0; j < liste.length; j++) {
    uebungenGesamt++;
    const erg = trainingsdaten.fuegeTrainingseinheitHinzu(
      { muskelgruppe: katalogGruppen[i], uebung: liste[j].name, gewicht: 1, wiederholungen: 1, saetze: 1 });
    if (erg.ok) {
      uebungenAkzeptiert++;
    } else {
      console.log("      nicht akzeptiert: " + katalogGruppen[i] + " / " + liste[j].name + ": " + erg.fehler);
    }
  }
}
pruefe("Übungsnamen: alle " + uebungenGesamt + " Katalogübungen werden gespeichert (" + uebungenAkzeptiert + " akzeptiert)",
  uebungenGesamt === 33 && uebungenAkzeptiert === 33);
r = trainingsdaten.holeAlleStatus();
pruefe("Nach den 33 Einträgen hat jede Muskelgruppe Daten (kein Inactive mehr)",
  Object.keys(r.status).every(function (g) { return r.status[g].status !== "Inactive"; }));
fs.rmSync(namenOrdner, { recursive: true, force: true });
speicher.setzeDatenordner(testOrdner);   // zurück zum normalen Testordner

// 13f) Statusnamen und Aufrufe zu waehleUebungen / berechneErnaehrung
const erwarteteSaetze = { "Starter": 2, "Rising": 3, "Advanced": 3, "Elite": 4 };
const statusNamen = Object.keys(erwarteteSaetze);
for (let i = 0; i < statusNamen.length; i++) {
  const erg = uebungsempfehlung.waehleUebungen("Brust", "Muskelaufbau", statusNamen[i]);
  pruefe("waehleUebungen kennt den Status " + statusNamen[i] + " (" + erwarteteSaetze[statusNamen[i]] + " Sätze)",
    erg.ok && erg.uebungen[0].saetze === erwarteteSaetze[statusNamen[i]]);
}
pruefe("waehleUebungen kennt \"Inactive\" nicht (deshalb die Umwandlung in Starter in integration.js)",
  uebungsempfehlung.waehleUebungen("Brust", "Muskelaufbau", "Inactive").ok === false);
const ernaehrungTest = ernaehrung.berechneErnaehrung(60, 4, "Muskelaufbau");
pruefe("berechneErnaehrung liefert { ok, kalorien, protein } (60 kg, 4 Übungen: 2280 kcal, 120 g)",
  ernaehrungTest.ok === true && ernaehrungTest.kalorien === 2280 && ernaehrungTest.protein === 120);

// 13g) Gleiche Bezeichnungen für "keine Trainingsdaten" in alter und neuer Datei
const altLeer = muskelgruppenAlt.berechneTrainingsstatus({
  muskelgruppe: "Brust", alter: 20, geschlecht: "männlich", koerpergroesse: 180, koerpergewicht: 70, trainingsziel: "Muskelaufbau"
});
const neuLeer = berechnung.leereMuskelgruppe();
pruefe("Inactive / Score 0 / Weiß stimmen in muskelgruppen.js und berechnung.js überein",
  altLeer.status === neuLeer.status && altLeer.score === neuLeer.score && altLeer.farbe === neuLeer.farbe);

// 13h) Die Trainingsverwaltung nutzt NICHT die älteren Regeln aus muskelgruppen.js
const neueModule = ["speicher.js", "berechnung.js", "trainingsdaten.js", "anzeige.js", "integration.js"];
let verweiseAufAlteDatei = 0;
for (let i = 0; i < neueModule.length; i++) {
  const quelltext = fs.readFileSync(path.join(__dirname, neueModule[i]), "utf8");
  if (quelltext.indexOf("muskelgruppen") !== -1) {
    verweiseAufAlteDatei++;
  }
}
pruefe("Keine der 5 neuen Module verweist auf muskelgruppen.js", verweiseAufAlteDatei === 0);

// Gleiche Einheit (Bizepscurls, 10 kg, 10 Wiederholungen, 3 Sätze, 1 Trainingstag, 70 kg Körpergewicht):
// Nach den älteren Regeln ergäbe sich ein anderer Score als nach den vereinbarten Regeln.
const altBizeps = muskelgruppenAlt.berechneTrainingsstatus({
  muskelgruppe: "Bizeps", alter: 20, geschlecht: "männlich", koerpergroesse: 180, koerpergewicht: 70, trainingsziel: "Muskelaufbau",
  aktuellesTraining: { datum: berechnung.heutigesDatum(), uebungen: 1, gewicht: 10, wiederholungen: 10, saetze: 3 }
});
r = trainingsdaten.holeStatusDerMuskelgruppe("Bizeps");
console.log("  Alte Regeln (muskelgruppen.js): " + altBizeps.score + " Punkte | Vereinbarte Regeln (berechnung.js): " + r.status.score + " Punkte");
pruefe("Für dieselbe Einheit liefern alte und neue Regeln verschiedene Scores; gespeichert ist der neue Wert (26)",
  altBizeps.score !== r.status.score && r.status.score === 26);

// ---------- Zusammenfassung ----------
console.log("\n--------------------------------------------------");
console.log("Ergebnis: " + bestanden + " Prüfungen bestanden, " + durchgefallen + " fehlgeschlagen.");
