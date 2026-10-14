// ============================================================
// anzeige.js  -  ANZEIGE
// Gibt Ergebnisse in der Konsole aus. Hier wird nichts berechnet
// und nichts gespeichert. Für die HTML-Oberfläche kann diese Datei
// später durch HTML-Code ersetzt werden.
// ============================================================
//test
function zeigeFehler(text) {
  console.log("FEHLER: " + text);
}

function zeigeHinweise(hinweise) {
  if (!hinweise) {
    return;
  }
  for (let i = 0; i < hinweise.length; i++) {
    console.log("HINWEIS: " + hinweise[i]);
  }
}

function einheitAlsText(e) {
  return "ID " + e.id + " | " + e.datum + " | " + e.uebung + " | " + e.gewicht + " kg | " +
         e.saetze + " Sätze x " + e.wiederholungen + " Wiederholungen";
}

function zeigeEinheit(einheit) {
  console.log(einheitAlsText(einheit));
}

function zeigeHistorie(historie) {
  console.log("Trainingshistorie " + historie.muskelgruppe + ":");
  if (historie.einheiten.length === 0) {
    console.log("  (noch keine Trainingseinheiten)");
    return;
  }
  for (let i = 0; i < historie.einheiten.length; i++) {
    console.log("  " + einheitAlsText(historie.einheiten[i]));
  }
}

function zeigeStatus(alleStatus) {
  const gruppen = Object.keys(alleStatus);
  for (let i = 0; i < gruppen.length; i++) {
    const s = alleStatus[gruppen[i]];
    console.log("  " + gruppen[i].padEnd(13) + String(s.score).padStart(3) + "/100  " +
                s.status.padEnd(9) + "(" + s.farbe + ")");
  }
}

function zeigeTeilpunkte(muskelgruppe, status) {
  const t = status.teilpunkte;
  console.log(muskelgruppe + ": " + status.score + " Punkte -> " + status.status + " (" + status.farbe + ")");
  console.log("  Häufigkeit " + t.haeufigkeit + "/20, relative Leistung " + t.relativeLeistung + "/20, " +
              "Wiederholungen " + t.wiederholungen + "/15, Sätze " + t.saetze + "/15, Entwicklung " + t.entwicklung + "/30");
}

module.exports = { zeigeFehler, zeigeHinweise, zeigeEinheit, zeigeHistorie, zeigeStatus, zeigeTeilpunkte };
