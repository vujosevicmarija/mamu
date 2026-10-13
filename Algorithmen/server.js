// ============================================================
// server.js  -  KLEINER NODE.JS-SERVER FÜR MAMU
//
// Aufgabe: Die Oberfläche (mamu.html) darf selbst keine Dateien auf dem
// Computer schreiben. Dieser Server tut das für sie:
//   Browser  --(fetch)-->  server.js  --(speicher.js)-->  daten/*.json
//
// Start:   node server.js        Beenden: Strg + C
// Öffnen:  http://localhost:3000
//
// Es werden nur eingebaute Node-Module verwendet (kein npm install nötig).
// Gelesen und geschrieben wird mit speicher.js (unverändert): Dort wird erst
// in eine .tmp-Datei geschrieben und diese ersetzt danach die alte Datei.
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const speicher = require("./speicher");
speicher.setzeDatenordner(path.join(__dirname, "daten-test"));

// Nur der eigene Rechner darf zugreifen (127.0.0.1 = localhost)
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;

// Größte erlaubte Anfrage (1 MB). Größere Daten werden abgelehnt.
const MAX_BYTES = 1024 * 1024;

// ---------- Welche Dateien gibt es? ----------
// Nur diese fünf Namen sind erlaubt. Alles andere wird abgelehnt,
// damit niemand über die Adresse beliebige Dateien lesen oder schreiben kann.
// "standard" gilt, solange die Datei noch nicht existiert (erster Start).
// "pruefe" ist eine einfache Formatkontrolle (die inhaltlichen Regeln, z. B. Grenzen
// und Datum, prüft weiterhin die Oberfläche).
function istObjekt(wert) {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert);
}

const DATEIEN = {
  profil: {
    datei: "profil.json",
    standard: { name: "", alter: null, groesse: null, koerpergewicht: null },
    pruefe: istObjekt
  },
  einstellungen: {
    datei: "einstellungen.json",
    standard: { koerper: "mann", trainingsziel: "Muskelaufbau" },
    pruefe: istObjekt
  },
  eigene_uebungen: {
    datei: "eigene_uebungen.json",
    standard: {},
    pruefe: istObjekt
  },
  trainingseinheiten: {
    datei: "trainingseinheiten.json",
    standard: { naechsteId: 1, einheiten: [] },
    pruefe: function (wert) { return istObjekt(wert) && Array.isArray(wert.einheiten); }
  },
  muskelstatus: {
    datei: "muskelstatus.json",
    standard: {},
    pruefe: istObjekt
  }
};

// Prüft, ob ein Name in der Liste steht (sicher auch gegen Namen wie "__proto__")
function kenntDatei(name) {
  return Object.prototype.hasOwnProperty.call(DATEIEN, name);
}

// ---------- Hilfsfunktionen für Antworten ----------
function sendeJson(res, status, objekt) {
  const text = JSON.stringify(objekt);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(text);
}

function sendeFehler(res, status, text) {
  sendeJson(res, status, { ok: false, fehler: text });
}

// Liest den Text einer Anfrage (z. B. die JSON-Daten bei PUT)
function liesBody(req, wennFertig) {
  const teile = [];
  let gesamt = 0;
  let zuGross = false;
  req.on("data", function (stueck) {
    gesamt += stueck.length;
    if (gesamt > MAX_BYTES) {
      zuGross = true;
      teile.length = 0;          // nichts mehr merken
    } else if (!zuGross) {
      teile.push(stueck);
    }
  });
  req.on("end", function () {
    wennFertig(zuGross, Buffer.concat(teile).toString("utf8"));
  });
  req.on("error", function () {
    wennFertig(false, "");
  });
}

// ---------- Die Schnittstelle ----------

// GET /api/daten  ->  alle Dateien auf einmal (für den Start der Oberfläche)
function holeAlleDaten(res) {
  const daten = {};
  const hinweise = [];
  const namen = Object.keys(DATEIEN);
  for (let i = 0; i < namen.length; i++) {
    const eintrag = DATEIEN[namen[i]];
    const ergebnis = speicher.ladeDatei(eintrag.datei, eintrag.standard);
    if (!ergebnis.ok) {
      // Eine kaputte Datei wird nicht verändert und nicht stillschweigend ersetzt
      return sendeJson(res, 500, { ok: false, datei: eintrag.datei, fehler: ergebnis.fehler });
    }
    if (!eintrag.pruefe(ergebnis.daten)) {
      return sendeJson(res, 500, { ok: false, datei: eintrag.datei, fehler: "Die Datei " + eintrag.datei + " hat ein unerwartetes Format. Sie wurde nicht verändert." });
    }
    daten[namen[i]] = ergebnis.daten;
    if (ergebnis.hinweis) hinweise.push(ergebnis.hinweis);
  }
  sendeJson(res, 200, { ok: true, daten: daten, hinweise: hinweise });
}

// GET /api/daten/<name>  ->  eine Datei
function holeEineDatei(res, name) {
  const eintrag = DATEIEN[name];
  const ergebnis = speicher.ladeDatei(eintrag.datei, eintrag.standard);
  if (!ergebnis.ok) {
    return sendeJson(res, 500, { ok: false, datei: eintrag.datei, fehler: ergebnis.fehler });
  }
  if (!eintrag.pruefe(ergebnis.daten)) {
    return sendeJson(res, 500, { ok: false, datei: eintrag.datei, fehler: "Die Datei " + eintrag.datei + " hat ein unerwartetes Format. Sie wurde nicht verändert." });
  }
  sendeJson(res, 200, { ok: true, daten: ergebnis.daten, hinweis: ergebnis.hinweis });
}

// PUT /api/daten/<name>  ->  eine Datei speichern
function speichereEineDatei(req, res, name) {
  const eintrag = DATEIEN[name];

  // Sicherheit: Nur "application/json" ist erlaubt. Eine fremde Webseite kann so einen
  // Inhaltstyp nicht heimlich an unseren Server schicken (der Browser würde vorher nachfragen).
  const typ = String(req.headers["content-type"] || "").toLowerCase();
  if (typ.indexOf("application/json") !== 0) {
    return sendeFehler(res, 415, "Die Daten müssen als application/json gesendet werden.");
  }

  liesBody(req, function (zuGross, text) {
    if (zuGross) {
      return sendeFehler(res, 413, "Die Daten sind zu groß (höchstens 1 MB).");
    }
    let daten;
    try {
      daten = JSON.parse(text);
    } catch (fehler) {
      return sendeFehler(res, 400, "Die gesendeten Daten sind kein gültiges JSON.");
    }
    if (!eintrag.pruefe(daten)) {
      return sendeFehler(res, 400, "Die Daten haben nicht das erwartete Format für " + eintrag.datei + ".");
    }

    // Eine vorhandene, aber kaputte Datei wird nicht einfach überschrieben
    const vorhanden = speicher.ladeDatei(eintrag.datei, eintrag.standard);
    if (!vorhanden.ok) {
      return sendeJson(res, 409, {
        ok: false,
        datei: eintrag.datei,
        fehler: vorhanden.fehler + " Es wurde nichts überschrieben."
      });
    }

    const ergebnis = speicher.speichereDatei(eintrag.datei, daten);   // .tmp schreiben, dann ersetzen
    if (!ergebnis.ok) {
      return sendeJson(res, 500, { ok: false, datei: eintrag.datei, fehler: ergebnis.fehler });
    }
    sendeJson(res, 200, { ok: true });
  });
}

// ---------- Die Oberfläche ausliefern ----------
function sendeOberflaeche(res) {
const pfad = path.join(__dirname, "..", "Benutzeroberfläche", "mamu.html");
  fs.readFile(pfad, function (fehler, inhalt) {
    if (fehler) {
      return sendeFehler(res, 404, "mamu.html wurde nicht gefunden. Sie muss im selben Ordner wie server.js liegen.");
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": inhalt.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(inhalt);
  });
}

// ---------- Verteiler: Welche Adresse bekommt welche Funktion? ----------
function behandleAnfrage(req, res) {
  let teile;
  try {
    const adresse = new URL(req.url, "http://localhost");
    teile = adresse.pathname.split("/").filter(function (t) { return t !== ""; }).map(decodeURIComponent);
  } catch (fehler) {
    return sendeFehler(res, 400, "Ungültige Adresse.");
  }

  // Oberfläche: / oder /mamu.html
  if (teile.length === 0 || (teile.length === 1 && teile[0] === "mamu.html")) {
    if (req.method !== "GET" && req.method !== "HEAD") return sendeFehler(res, 405, "Nur GET ist erlaubt.");
    return sendeOberflaeche(res);
  }

  // Schnittstelle: /api/daten und /api/daten/<name>
  if (teile[0] === "api" && teile[1] === "daten" && teile.length <= 3) {
    if (teile.length === 2) {
      if (req.method !== "GET") return sendeFehler(res, 405, "Hier ist nur GET erlaubt.");
      return holeAlleDaten(res);
    }
    const name = teile[2];
    if (!kenntDatei(name)) {
      return sendeFehler(res, 404, "Unbekannte Datei „" + name + "“. Erlaubt: " + Object.keys(DATEIEN).join(", ") + ".");
    }
    if (req.method === "GET") return holeEineDatei(res, name);
    if (req.method === "PUT") return speichereEineDatei(req, res, name);
    return sendeFehler(res, 405, "Erlaubt sind GET und PUT.");
  }

  sendeFehler(res, 404, "Diese Adresse gibt es nicht.");
}

function erstelleServer() {
  return http.createServer(function (req, res) {
    try {
      behandleAnfrage(req, res);
    } catch (fehler) {
      // Unerwarteter Fehler: Server bleibt am Laufen
      console.error("Unerwarteter Fehler:", fehler);
      if (!res.headersSent) sendeFehler(res, 500, "Interner Serverfehler.");
      else res.end();
    }
  });
}

// Server nur starten, wenn die Datei direkt gestartet wird (node server.js)
if (require.main === module) {
  const server = erstelleServer();
  server.on("error", function (fehler) {
    if (fehler.code === "EADDRINUSE") {
      console.error("Port " + PORT + " ist schon belegt. Läuft mamu schon in einem anderen Terminal? " +
                    "Sonst einen anderen Port wählen, z. B.: PORT=3001 node server.js");
    } else {
      console.error("Server konnte nicht gestartet werden:", fehler.message);
    }
    process.exit(1);
  });
  server.listen(PORT, HOST, function () {
    console.log("mamu läuft:  http://localhost:" + PORT);
    console.log("Daten liegen in: " + speicher.dateipfad(""));
    console.log("Beenden mit Strg + C");
  });
}

module.exports = { erstelleServer, DATEIEN };
