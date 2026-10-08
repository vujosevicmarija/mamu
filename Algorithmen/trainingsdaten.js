// ============================================================
// trainingsdaten.js  -  VERWALTUNG
// Verbindet Speicherung (speicher.js) und Berechnung (berechnung.js):
// Eingaben prüfen, Trainingseinheiten speichern/bearbeiten/löschen,
// Historie abrufen, Status aktualisieren.
// Alle Funktionen geben ein einfaches Objekt zurück ({ ok: true/false, ... }),
// das später auch von einem Node.js-Server als JSON verschickt werden kann.
// ============================================================

const speicher = require("./speicher");
const berechnung = require("./berechnung");
const uebungsempfehlung = require("./uebungsempfehlung");

// Der bestehende Übungskatalog wird aus uebungsempfehlung.js übernommen.
if (!uebungsempfehlung.uebungskatalog) {
  throw new Error("uebungsempfehlung.js muss 'uebungskatalog' exportieren: " +
                  "module.exports = { waehleUebungen, uebungskatalog };");
}
const uebungskatalog = uebungsempfehlung.uebungskatalog;

const DATEI_EINHEITEN = "trainingseinheiten.json";
const DATEI_STATUS = "muskelstatus.json";
const DATEI_PROFIL = "profil.json";

// ---------- Kleine Hilfsfunktionen ----------

function fehler(text) {
  return { ok: false, fehler: text };
}

// Sucht einen Namen in einer Liste (Groß-/Kleinschreibung egal). Gibt den richtigen Namen oder null zurück.
function findeName(namen, eingabe) {
  if (typeof eingabe !== "string") {
    return null;
  }
  const gesucht = eingabe.trim().toLowerCase();
  for (let i = 0; i < namen.length; i++) {
    if (namen[i].toLowerCase() === gesucht) {
      return namen[i];
    }
  }
  return null;
}

// Wandelt Zahl oder Text in eine Zahl um (z. B. "12" -> 12). Alles andere ergibt NaN.
function alsZahl(wert) {
  if (typeof wert === "number") {
    return wert;
  }
  if (typeof wert === "string" && wert.trim() !== "") {
    return Number(wert);
  }
  return NaN;
}

function istLeer(wert) {
  return wert === undefined || wert === null || (typeof wert === "string" && wert.trim() === "");
}

function holeUebungsnamen(muskelgruppe) {
  const namen = [];
  for (let i = 0; i < uebungskatalog[muskelgruppe].length; i++) {
    namen.push(uebungskatalog[muskelgruppe][i].name);
  }
  return namen;
}

// ---------- Eingaben prüfen ----------
// Gibt { ok: true, einheit: {...} } zurück oder { ok: false, fehler: "..." }.
// Es wird nichts gespeichert.
function pruefeEinheit(eingabe) {
  if (typeof eingabe !== "object" || eingabe === null) {
    return fehler("Es wurden keine Trainingsdaten übergeben.");
  }

  // 1. Pflichtfelder
  const feldnamen = {
    muskelgruppe: "Muskelgruppe",
    uebung: "Übung",
    gewicht: "Gewicht",
    wiederholungen: "Wiederholungen",
    saetze: "Sätze"
  };
  const fehlend = [];
  const schluessel = Object.keys(feldnamen);
  for (let i = 0; i < schluessel.length; i++) {
    if (istLeer(eingabe[schluessel[i]])) {
      fehlend.push(feldnamen[schluessel[i]]);
    }
  }
  if (fehlend.length > 0) {
    return fehler("Pflichtfelder fehlen: " + fehlend.join(", ") + ".");
  }

  // 2. Muskelgruppe und Übung (müssen zum Übungskatalog passen)
  const gruppe = findeName(Object.keys(uebungskatalog), eingabe.muskelgruppe);
  if (gruppe === null) {
    return fehler("Ungültige Muskelgruppe. Erlaubt sind: " + Object.keys(uebungskatalog).join(", ") + ".");
  }
  const uebungsnamen = holeUebungsnamen(gruppe);
  const uebung = findeName(uebungsnamen, eingabe.uebung);
  if (uebung === null) {
    return fehler("Die Übung \"" + eingabe.uebung + "\" gehört nicht zur Muskelgruppe " + gruppe +
                  ". Erlaubt sind: " + uebungsnamen.join(", ") + ".");
  }

  // 3. Zahlen
  const gewicht = alsZahl(eingabe.gewicht);
  if (!isFinite(gewicht)) {
    return fehler("Das Gewicht muss eine Zahl sein.");
  }
  if (gewicht < 0) {
    return fehler("Das Gewicht darf nicht negativ sein.");
  }
  const wiederholungen = alsZahl(eingabe.wiederholungen);
  if (!Number.isInteger(wiederholungen) || wiederholungen <= 0) {
    return fehler("Die Wiederholungen müssen eine ganze Zahl größer als 0 sein.");
  }
  const saetze = alsZahl(eingabe.saetze);
  if (!Number.isInteger(saetze) || saetze <= 0) {
    return fehler("Die Sätze müssen eine ganze Zahl größer als 0 sein.");
  }

  // 4. Datum (fehlt es, wird der heutige Tag verwendet)
  const heute = berechnung.heutigesDatum();
  let datum = heute;
  if (!istLeer(eingabe.datum)) {
    datum = typeof eingabe.datum === "string" ? eingabe.datum.trim() : eingabe.datum;
    if (!berechnung.istGueltigesDatum(datum)) {
      return fehler("Das Datum muss ein echtes Datum im Format JJJJ-MM-TT sein, z. B. 2026-10-01.");
    }
    if (datum > heute) {
      return fehler("Das Datum darf nicht in der Zukunft liegen.");
    }
  }

  return {
    ok: true,
    einheit: {
      muskelgruppe: gruppe,
      uebung: uebung,
      gewicht: gewicht,
      wiederholungen: wiederholungen,
      saetze: saetze,
      datum: datum
    }
  };
}

// ---------- Laden ----------

// Lädt trainingseinheiten.json -> { ok, daten: { naechsteId, einheiten: [...] }, hinweis }
function ladeEinheiten() {
  const geladen = speicher.ladeDatei(DATEI_EINHEITEN, { naechsteId: 1, einheiten: [] });
  if (!geladen.ok) {
    return geladen;
  }
  const daten = geladen.daten;
  if (!daten || !Array.isArray(daten.einheiten) || typeof daten.naechsteId !== "number") {
    return fehler("Die Datei " + DATEI_EINHEITEN + " hat ein unerwartetes Format. Sie wurde nicht verändert.");
  }
  return { ok: true, daten: daten, hinweis: geladen.hinweis };
}

// Lädt das Körpergewicht aus profil.json -> { ok, koerpergewicht (Zahl oder null) }
function holeKoerpergewicht() {
  const geladen = speicher.ladeDatei(DATEI_PROFIL, { koerpergewicht: null });
  if (!geladen.ok) {
    return geladen;
  }
  const wert = geladen.daten ? geladen.daten.koerpergewicht : null;
  if (wert === null || wert === undefined) {
    return { ok: true, koerpergewicht: null };
  }
  if (typeof wert !== "number" || !(wert > 0)) {
    return fehler("Die Datei " + DATEI_PROFIL + " enthält kein gültiges Körpergewicht.");
  }
  return { ok: true, koerpergewicht: wert };
}

// Gibt alle gespeicherten Trainingseinheiten zurück
function holeAlleEinheiten() {
  const geladen = ladeEinheiten();
  if (!geladen.ok) {
    return geladen;
  }
  return { ok: true, einheiten: geladen.daten.einheiten, hinweis: geladen.hinweis };
}

// ---------- Status berechnen und speichern ----------

// Berechnet Score, Status und Farbe ALLER Muskelgruppen neu (jede unabhängig)
// und speichert das Ergebnis in muskelstatus.json.
function aktualisiereAlleStatus() {
  const hinweise = [];

  const geladen = ladeEinheiten();
  if (!geladen.ok) {
    return geladen;
  }
  if (geladen.hinweis) {
    hinweise.push(geladen.hinweis);
  }
  const einheiten = geladen.daten.einheiten;

  // Körpergewicht: Fehlt es oder ist profil.json kaputt, wird nur die relative Leistung nicht berechnet.
  let koerpergewicht = null;
  const profil = holeKoerpergewicht();
  if (profil.ok) {
    koerpergewicht = profil.koerpergewicht;
  } else {
    hinweise.push(profil.fehler);
  }

  const heute = berechnung.heutigesDatum();
  const gruppen = Object.keys(uebungskatalog);
  const alleStatus = {};
  let gewichtHinweisSchonDa = false;

  for (let i = 0; i < gruppen.length; i++) {
    const gruppe = gruppen[i];

    // Nur die Einheiten dieser Muskelgruppe
    const einheitenDerGruppe = [];
    for (let j = 0; j < einheiten.length; j++) {
      if (einheiten[j].muskelgruppe === gruppe) {
        einheitenDerGruppe.push(einheiten[j]);
      }
    }

    const ergebnis = berechnung.berechneMuskelgruppe(einheitenDerGruppe, koerpergewicht, heute);
    alleStatus[gruppe] = {
      score: ergebnis.score,
      status: ergebnis.status,
      farbe: ergebnis.farbe,
      teilpunkte: ergebnis.teilpunkte
    };
    if (ergebnis.hinweis && !gewichtHinweisSchonDa) {
      hinweise.push(ergebnis.hinweis);
      gewichtHinweisSchonDa = true;
    }
  }

  const gespeichert = speicher.speichereDatei(DATEI_STATUS, alleStatus);
  if (!gespeichert.ok) {
    return { ok: false, fehler: gespeichert.fehler, status: alleStatus, hinweise: hinweise };
  }
  return { ok: true, status: alleStatus, hinweise: hinweise };
}

// Wird beim Öffnen von mamu aufgerufen: lädt die Daten und berechnet alle Status neu.
function starteMamu() {
  return aktualisiereAlleStatus();
}

// Liest den gespeicherten Status aller Muskelgruppen aus muskelstatus.json
function holeAlleStatus() {
  const geladen = speicher.ladeDatei(DATEI_STATUS, {});
  if (!geladen.ok) {
    return geladen;
  }
  const alleStatus = {};
  const gruppen = Object.keys(uebungskatalog);
  for (let i = 0; i < gruppen.length; i++) {
    if (geladen.daten && geladen.daten[gruppen[i]]) {
      alleStatus[gruppen[i]] = geladen.daten[gruppen[i]];
    } else {
      const leer = berechnung.leereMuskelgruppe();
      alleStatus[gruppen[i]] = { score: leer.score, status: leer.status, farbe: leer.farbe, teilpunkte: leer.teilpunkte };
    }
  }
  return { ok: true, status: alleStatus };
}

// Status einer einzelnen Muskelgruppe
function holeStatusDerMuskelgruppe(muskelgruppe) {
  const gruppe = findeName(Object.keys(uebungskatalog), muskelgruppe);
  if (gruppe === null) {
    return fehler("Ungültige Muskelgruppe. Erlaubt sind: " + Object.keys(uebungskatalog).join(", ") + ".");
  }
  const alle = holeAlleStatus();
  if (!alle.ok) {
    return alle;
  }
  return { ok: true, muskelgruppe: gruppe, status: alle.status[gruppe] };
}

// Baut die Antwort nach dem Speichern/Bearbeiten/Löschen zusammen
function antwortNachAenderung(zusatz, statusErgebnis) {
  const antwort = { ok: true, status: statusErgebnis.status, hinweise: statusErgebnis.hinweise || [] };
  if (!statusErgebnis.ok) {
    antwort.hinweise.push("Die Trainingseinheit wurde gespeichert, aber der Status konnte nicht gespeichert werden: " +
                          statusErgebnis.fehler + " Er wird beim nächsten Start neu berechnet.");
  }
  const namen = Object.keys(zusatz);
  for (let i = 0; i < namen.length; i++) {
    antwort[namen[i]] = zusatz[namen[i]];
  }
  return antwort;
}

// ---------- Trainingseinheiten hinzufügen / bearbeiten / löschen ----------

function fuegeTrainingseinheitHinzu(eingabe) {
  // 1. Erst prüfen: Fehlerhafte Daten werden nie gespeichert
  const geprueft = pruefeEinheit(eingabe);
  if (!geprueft.ok) {
    return geprueft;
  }

  // 2. Bestehende Daten laden (bei Fehler abbrechen, nichts wird überschrieben)
  const geladen = ladeEinheiten();
  if (!geladen.ok) {
    return geladen;
  }
  const daten = geladen.daten;

  // 3. Neue Einheit mit eindeutiger ID ANHÄNGEN (ältere Einträge bleiben unverändert)
  const neueEinheit = {
    id: daten.naechsteId,
    muskelgruppe: geprueft.einheit.muskelgruppe,
    uebung: geprueft.einheit.uebung,
    gewicht: geprueft.einheit.gewicht,
    wiederholungen: geprueft.einheit.wiederholungen,
    saetze: geprueft.einheit.saetze,
    datum: geprueft.einheit.datum
  };
  daten.einheiten.push(neueEinheit);
  daten.naechsteId = daten.naechsteId + 1;

  // 4. Speichern
  const gespeichert = speicher.speichereDatei(DATEI_EINHEITEN, daten);
  if (!gespeichert.ok) {
    return gespeichert;
  }

  // 5. Score, Status und Farbe neu berechnen
  return antwortNachAenderung({ einheit: neueEinheit }, aktualisiereAlleStatus());
}

// Gibt den neuen Wert zurück, oder den alten, wenn nichts Neues angegeben wurde
function nimm(neuerWert, alterWert) {
  if (neuerWert === undefined) {
    return alterWert;
  }
  return neuerWert;
}

function bearbeiteTrainingseinheit(id, aenderungen) {
  if (typeof aenderungen !== "object" || aenderungen === null) {
    return fehler("Es wurden keine Änderungen übergeben.");
  }

  const geladen = ladeEinheiten();
  if (!geladen.ok) {
    return geladen;
  }
  const daten = geladen.daten;

  // Einheit mit dieser ID suchen
  const nummer = alsZahl(id);
  let position = -1;
  for (let i = 0; i < daten.einheiten.length; i++) {
    if (daten.einheiten[i].id === nummer) {
      position = i;
    }
  }
  if (position === -1) {
    return fehler("Es gibt keine Trainingseinheit mit der ID " + id + ".");
  }
  const alt = daten.einheiten[position];

  // Alte Werte mit den Änderungen zusammenführen (die ID wird nie geändert) und prüfen
  const geprueft = pruefeEinheit({
    muskelgruppe: nimm(aenderungen.muskelgruppe, alt.muskelgruppe),
    uebung: nimm(aenderungen.uebung, alt.uebung),
    gewicht: nimm(aenderungen.gewicht, alt.gewicht),
    wiederholungen: nimm(aenderungen.wiederholungen, alt.wiederholungen),
    saetze: nimm(aenderungen.saetze, alt.saetze),
    datum: nimm(aenderungen.datum, alt.datum)
  });
  if (!geprueft.ok) {
    return geprueft;
  }

  const neu = {
    id: alt.id,
    muskelgruppe: geprueft.einheit.muskelgruppe,
    uebung: geprueft.einheit.uebung,
    gewicht: geprueft.einheit.gewicht,
    wiederholungen: geprueft.einheit.wiederholungen,
    saetze: geprueft.einheit.saetze,
    datum: geprueft.einheit.datum
  };
  daten.einheiten[position] = neu;

  const gespeichert = speicher.speichereDatei(DATEI_EINHEITEN, daten);
  if (!gespeichert.ok) {
    return gespeichert;
  }
  return antwortNachAenderung({ einheit: neu }, aktualisiereAlleStatus());
}

function loescheTrainingseinheit(id) {
  const geladen = ladeEinheiten();
  if (!geladen.ok) {
    return geladen;
  }
  const daten = geladen.daten;

  const nummer = alsZahl(id);
  let position = -1;
  for (let i = 0; i < daten.einheiten.length; i++) {
    if (daten.einheiten[i].id === nummer) {
      position = i;
    }
  }
  if (position === -1) {
    return fehler("Es gibt keine Trainingseinheit mit der ID " + id + ".");
  }

  const geloescht = daten.einheiten.splice(position, 1)[0];

  const gespeichert = speicher.speichereDatei(DATEI_EINHEITEN, daten);
  if (!gespeichert.ok) {
    return gespeichert;
  }
  return antwortNachAenderung({ geloescht: geloescht }, aktualisiereAlleStatus());
}

// ---------- Historie einer Muskelgruppe ----------
function holeHistorie(muskelgruppe) {
  const gruppe = findeName(Object.keys(uebungskatalog), muskelgruppe);
  if (gruppe === null) {
    return fehler("Ungültige Muskelgruppe. Erlaubt sind: " + Object.keys(uebungskatalog).join(", ") + ".");
  }
  const geladen = ladeEinheiten();
  if (!geladen.ok) {
    return geladen;
  }
  const liste = [];
  for (let i = 0; i < geladen.daten.einheiten.length; i++) {
    if (geladen.daten.einheiten[i].muskelgruppe === gruppe) {
      liste.push(geladen.daten.einheiten[i]);
    }
  }
  return { ok: true, muskelgruppe: gruppe, einheiten: berechnung.sortiereChronologisch(liste), hinweis: geladen.hinweis };
}

// ---------- Körpergewicht speichern ----------
function speichereKoerpergewicht(gewicht) {
  const zahl = alsZahl(gewicht);
  if (!isFinite(zahl) || zahl <= 0) {
    return fehler("Das Körpergewicht muss eine Zahl größer als 0 sein.");
  }
  // Erst prüfen, ob profil.json lesbar ist, damit nichts Kaputtes versehentlich überschrieben wird
  const vorhanden = speicher.ladeDatei(DATEI_PROFIL, { koerpergewicht: null });
  if (!vorhanden.ok) {
    return vorhanden;
  }
  const gespeichert = speicher.speichereDatei(DATEI_PROFIL, { koerpergewicht: zahl });
  if (!gespeichert.ok) {
    return gespeichert;
  }
  // Das Körpergewicht beeinflusst die relative Leistung -> Status neu berechnen
  const statusErgebnis = aktualisiereAlleStatus();
  return {
    ok: true,
    koerpergewicht: zahl,
    status: statusErgebnis.status,
    hinweise: statusErgebnis.ok ? statusErgebnis.hinweise : [statusErgebnis.fehler]
  };
}

module.exports = {
  starteMamu,
  fuegeTrainingseinheitHinzu,
  bearbeiteTrainingseinheit,
  loescheTrainingseinheit,
  holeHistorie,
  holeAlleEinheiten,
  holeAlleStatus,
  holeStatusDerMuskelgruppe,
  holeKoerpergewicht,
  speichereKoerpergewicht
};
