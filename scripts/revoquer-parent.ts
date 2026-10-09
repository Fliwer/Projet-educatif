import { db } from "../src/db.ts";
const id = Number(process.argv[2]);
if (!Number.isSafeInteger(id) || id <= 1)
  throw new Error("Indique l'identifiant d'une connexion distante (supérieur à 1).");
db.exec("BEGIN");
try {
  const resultat = db.prepare("UPDATE parents SET cle_hash = NULL WHERE id = ?").run(id);
  if (!resultat.changes) throw new Error("Connexion parent introuvable.");
  db.prepare("UPDATE brouillons SET expire = 0 WHERE parent_id = ? AND publie = 0").run(id);
  db.exec("COMMIT");
} catch (erreur) {
  db.exec("ROLLBACK");
  throw erreur;
}
db.close();
console.log("Connexion révoquée et liens de brouillons en attente désactivés.");
