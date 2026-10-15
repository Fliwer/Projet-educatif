// Garde trois missions variées pour Arthur fictif, sans supprimer son historique.
import { DOSSIER_DONNEES, RACINE } from "../src/config.ts";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const titres = ["Les petits calculs de Milo", "Les secrets des plantes", "En route dans les paysages"];
const sourcePath = join(RACINE, "data", "partage", "demo", "lumo.db");
const source = new DatabaseSync(sourcePath, { readOnly: true });
const modeles = titres.map(titre => {
  const quete = source.prepare("SELECT * FROM quetes WHERE titre=? AND origine_id IS NULL ORDER BY id DESC LIMIT 1").get(titre);
  if (!quete) throw new Error(`Mission modèle absente : ${titre}`);
  const questions = source.prepare("SELECT * FROM questions WHERE quete_id=? ORDER BY ordre").all(quete.id);
  if (questions.length < 5) throw new Error("Mission modèle incomplète.");
  return { quete, questions };
});
source.close();

for (const dossier of new Set([resolve(DOSSIER_DONNEES), resolve(join(RACINE, "data", "partage", "demo"))])) {
  const fichier = join(dossier, "lumo.db");
  if (!existsSync(fichier)) continue;
  const base = new DatabaseSync(fichier);
  try {
    const enfant = base.prepare("SELECT id,prenom FROM enfants WHERE code=?").get("LUMO01");
    if (!enfant || enfant.prenom !== "Arthur") throw new Error("Profil fictif Arthur introuvable.");
    const sauvegardes = join(dossier, "sauvegardes");
    mkdirSync(sauvegardes, { recursive: true });
    const sauvegarde = join(sauvegardes, `avant-demo-caroline-${randomUUID()}.db`);
    base.prepare("VACUUM INTO ?").run(sauvegarde);
    const copie = new DatabaseSync(sauvegarde, { readOnly: true });
    try {
      if (copie.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw new Error("Sauvegarde invalide.");
    } finally { copie.close(); }
    base.exec("BEGIN IMMEDIATE");
    try {
      const garder = [];
      for (const { quete, questions } of modeles) {
        let existante = base.prepare("SELECT id FROM quetes WHERE enfant_id=? AND titre=? AND origine_id IS NULL AND archivee=0 ORDER BY id DESC LIMIT 1").get(enfant.id, quete.titre);
        if (!existante) {
          const resultat = base.prepare("INSERT INTO quetes(enfant_id,titre,matiere,notion,cree_le,recompense_cle) VALUES(?,?,?,?,datetime('now'),?)").run(enfant.id, quete.titre, quete.matiere, quete.notion, randomUUID());
          existante = { id: Number(resultat.lastInsertRowid) };
          const ajouter = base.prepare("INSERT INTO questions(quete_id,ordre,type,consigne,choix,bonne) VALUES(?,?,?,?,?,?)");
          for (const question of questions) ajouter.run(existante.id, question.ordre, question.type, question.consigne, question.choix, question.bonne);
        }
        garder.push(existante.id);
      }
      const resultat = base.prepare("UPDATE quetes SET archivee=1 WHERE enfant_id=? AND archivee=0 AND id NOT IN (?,?,?)").run(enfant.id, ...garder);
      const visibles = base.prepare("SELECT id,titre FROM quetes WHERE enfant_id=? AND archivee=0 AND origine_id IS NULL ORDER BY id").all(enfant.id);
      if (visibles.length !== 3 || base.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Contrôle des trois missions refusé.");
      base.exec("COMMIT");
      console.log(JSON.stringify({ base: dossier, archivees: resultat.changes, missions: visibles, sauvegarde }));
    } catch (erreur) { base.exec("ROLLBACK"); throw erreur; }
  } finally { base.close(); }
}
