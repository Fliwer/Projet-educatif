import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DOSSIER_DONNEES } from "./config.ts";
import { migrer } from "./migrations.ts";

mkdirSync(DOSSIER_DONNEES, { recursive: true });
export const db = new DatabaseSync(join(DOSSIER_DONNEES, "lumo.db"));
migrer(db);
// Profil fictif de compatibilité, désactivable pour un environnement sans démo.
if (process.env.LUMO_DEMO !== "0") {
  db.exec(`INSERT INTO enfants (prenom, code, univers, parent_id)
    SELECT 'Arthur', 'LUMO01', 'espace', 1 WHERE NOT EXISTS (SELECT 1 FROM enfants);`);
}

/** Plusieurs écritures réussissent ou sont annulées ensemble. */
export function transaction<T>(travail: () => T): T {
  const imbriquee = db.isTransaction;
  if (!imbriquee) db.exec("BEGIN IMMEDIATE");
  try {
    const resultat = travail();
    if (!imbriquee) db.exec("COMMIT");
    return resultat;
  } catch (erreur) {
    if (!imbriquee) db.exec("ROLLBACK");
    throw erreur;
  }
}
