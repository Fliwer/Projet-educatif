import { db, transaction } from "./db.ts";
import { maintenant, type Enfant } from "./logic.ts";
import { ErreurMetier } from "./erreurs.ts";

/** Le dernier passage terminé peut être partiel : seules ses questions sont évaluées. */
export function questionsARevoir(enfant: Enfant, origine: number) {
  const dernier = db
    .prepare(
      "SELECT id FROM quetes WHERE enfant_id=? AND (id=? OR origine_id=?) AND statut='terminee' ORDER BY finie_le DESC,id DESC LIMIT 1",
    )
    .get(enfant.id, origine, origine);
  if (!dernier) return [];
  return db
    .prepare(
      `SELECT COALESCE(qu.source_id,qu.id) AS id FROM questions qu
    WHERE qu.quete_id=? AND COALESCE((SELECT correcte FROM reponses r WHERE r.question_id=qu.id ORDER BY r.id LIMIT 1),0)=0 ORDER BY qu.ordre`,
    )
    .all(dernier.id) as { id: number }[];
}

export function reprendreQuete(enfant: Enfant, origine: number, mode: "tout" | "cible", requete: string) {
  return transaction(() => {
    const source = db
      .prepare(
        "SELECT * FROM quetes WHERE id=? AND enfant_id=? AND archivee=0 AND origine_id IS NULL AND statut='terminee'",
      )
      .get(origine, enfant.id);
    if (!source) throw new ErreurMetier("Cette mission ne peut pas être rejouée.", 404);
    const precedente = db
      .prepare(
        "SELECT quete_id AS id,enfant_id,origine_id,mode AS reprise_mode FROM reprise_demandes WHERE requete=?",
      )
      .get(requete);
    if (precedente) {
      if (
        precedente.enfant_id !== enfant.id ||
        precedente.origine_id !== origine ||
        precedente.reprise_mode !== mode
      )
        throw new ErreurMetier("Demande déjà utilisée.", 409);
      return { id: Number(precedente.id) };
    }
    const active = db
      .prepare("SELECT id FROM quetes WHERE origine_id=? AND archivee=0 AND statut!='terminee'")
      .get(origine);
    if (active) {
      db.prepare("INSERT INTO reprise_demandes VALUES(?,?,?,?,?)").run(
        requete,
        enfant.id,
        origine,
        mode,
        active.id,
      );
      return { id: Number(active.id) };
    }
    const ids = mode === "cible" ? questionsARevoir(enfant, origine).map((q) => q.id) : null;
    const questions = db
      .prepare("SELECT * FROM questions WHERE quete_id=? ORDER BY ordre")
      .all(origine)
      .filter((q) => ids === null || ids.includes(Number(q.id)));
    if (!questions.length)
      throw new ErreurMetier(
        "Aucune question à retravailler sur le dernier passage. Tu peux tout refaire.",
        409,
      );
    const result = db
      .prepare(
        "INSERT INTO quetes(enfant_id,titre,matiere,notion,cree_le,origine_id,reprise_requete,reprise_mode) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(enfant.id, source.titre, source.matiere, source.notion, maintenant(), origine, requete, mode);
    const id = Number(result.lastInsertRowid);
    const ajouter = db.prepare(
      "INSERT INTO questions(quete_id,ordre,type,consigne,choix,bonne,source_id) VALUES(?,?,?,?,?,?,?)",
    );
    questions.forEach((q, i) => ajouter.run(id, i, q.type, q.consigne, q.choix, q.bonne, q.id));
    db.prepare("INSERT INTO reprise_demandes VALUES(?,?,?,?,?)").run(requete, enfant.id, origine, mode, id);
    return { id };
  });
}
