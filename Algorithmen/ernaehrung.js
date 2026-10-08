function berechneErnaehrung(gewicht, anzahlUebungen, ziel) {
    // Eingaben prüfen
    if (typeof gewicht !== "number" || isNaN(gewicht) || gewicht <= 0) {
        return { ok: false, fehler: "Bitte ein gültiges Gewicht größer als 0 eingeben." };
    }
    if (!Number.isInteger(anzahlUebungen) || anzahlUebungen < 0 || anzahlUebungen > 8) {
        return { ok: false, fehler: "Die Anzahl der Übungen muss eine ganze Zahl zwischen 0 und 8 sein." };
    }

    // Ziel vereinheitlichen (Groß-/Kleinschreibung egal)
    const zielKlein = String(ziel).trim().toLowerCase();

    // Aktivitätslevel bestimmen
    let AK, AP;
    if (anzahlUebungen <= 2) {
        AK = 1.0; AP = 1.0;
    } else if (anzahlUebungen <= 5) {
        AK = 1.1; AP = 1.5;
    } else {
        AK = 1.2; AP = 2.0;
    }

    // Muskelaufbau verwendet immer AP = 2
    if (zielKlein === "muskelaufbau") {
        AP = 2.0;
    }

    // Kalorienbedarf je nach Ziel
    const grundbedarf = gewicht * 30 * AK;
    let kalorien;

    switch (zielKlein) {
        case "gewicht halten": kalorien = grundbedarf; break;
        case "zunehmen":       kalorien = grundbedarf + 400; break;
        case "abnehmen":       kalorien = grundbedarf - 300; break;
        case "muskelaufbau":   kalorien = grundbedarf + 300; break;
        default:
            return { ok: false, fehler: "Ungültiges Ziel. Erlaubt: Zunehmen, Abnehmen, Muskelaufbau, Gewicht halten." };
    }

    const protein = gewicht * AP;

    return {
        ok: true,
        kalorien: Math.round(kalorien),
        protein: Math.round(protein)
    };
}
// Export, damit andere Dateien die Funktion mit require() einbinden können
module.exports = { berechneErnaehrung };