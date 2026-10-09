// VACUUM INTO produit une copie SQLite cohérente, même avec le journal WAL actif.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DOSSIER_DONNEES } from "../src/config.ts";

const dossier = join(DOSSIER_DONNEES, "sauvegardes");
mkdirSync(dossier, { recursive: true });
const destination = join(
  dossier,
  `lumo-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.db`,
);
const source = new DatabaseSync(join(DOSSIER_DONNEES, "lumo.db"), { readOnly: true });
try {
  source.prepare("VACUUM INTO ?").run(destination);
} finally {
  source.close();
}
const copie = new DatabaseSync(destination, { readOnly: true });
try {
  const resultat = copie.prepare("PRAGMA integrity_check").get();
  if (resultat?.integrity_check !== "ok" || copie.prepare("PRAGMA foreign_key_check").all().length)
    throw new Error("Sauvegarde non validée.");
} finally {
  copie.close();
}
console.log(`Sauvegarde cohérente et vérifiée : ${destination}`);
