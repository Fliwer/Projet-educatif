import type { DatabaseSync } from "node:sqlite";

/** Observations des tentatives, sans score de maîtrise ni comparaison entre enfants. */
export function lireParcours(db: DatabaseSync, enfantId: number) {
  return db
    .prepare(
      `
    SELECT q.id, q.titre, q.matiere, q.notion, q.statut, q.archivee, q.finie_le, q.origine_id, q.reprise_mode,
      COUNT(qu.id) AS total,
      SUM(CASE WHEN EXISTS(SELECT 1 FROM reponses r WHERE r.question_id=qu.id) THEN 1 ELSE 0 END) AS essayees,
      SUM(CASE WHEN (SELECT r.correcte FROM reponses r WHERE r.question_id=qu.id ORDER BY r.id LIMIT 1)=1 THEN 1 ELSE 0 END) AS premier_essai,
      SUM(CASE WHEN EXISTS(SELECT 1 FROM reponses r WHERE r.question_id=qu.id AND r.correcte=1) THEN 1 ELSE 0 END) AS reussies
    FROM quetes q LEFT JOIN questions qu ON qu.quete_id=q.id
    WHERE q.enfant_id=?
    GROUP BY q.id ORDER BY COALESCE(q.finie_le,q.cree_le), q.id
  `,
    )
    .all(enfantId) as {
    origine_id: number | null;
    reprise_mode: string | null;
    id: number;
    titre: string;
    matiere: string;
    notion: string | null;
    statut: string;
    archivee: number;
    finie_le: string | null;
    total: number;
    essayees: number;
    premier_essai: number;
    reussies: number;
  }[];
}

/** Retrait réversible du jeu : tentatives, statut et récompenses restent inchangés. */
export function archiverQuete(db: DatabaseSync, enfantId: number, queteId: number) {
  return (
    db
      .prepare("UPDATE quetes SET archivee=1 WHERE (id=? OR origine_id=?) AND enfant_id=? AND archivee=0")
      .run(queteId, queteId, enfantId).changes > 0
  );
}
