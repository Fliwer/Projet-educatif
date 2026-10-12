import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { FUSEAU } from "./config.ts";
import { ErreurMetier } from "./erreurs.ts";

export const schemaRythme = z
  .object({
    objectif: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    version: z.number().int().nonnegative().safe(),
    requete_id: z.string().uuid(),
  })
  .strict();
export function semaineDe(jour: string) {
  const date = new Date(`${jour}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
function jourDe(instant: Date) {
  return instant.toLocaleDateString("sv-SE", { timeZone: FUSEAU });
}
export function lireRendezVous(db: DatabaseSync, enfantId: number, instant = new Date()) {
  const jour = jourDe(instant),
    semaine = semaineDe(jour);
  const reglage = db
    .prepare("SELECT objectif,version FROM rendez_vous_reglages WHERE enfant_id=?")
    .get(enfantId);
  const semaineStockee = db
    .prepare("SELECT objectif FROM rendez_vous_semaines WHERE enfant_id=? AND semaine=?")
    .get(enfantId, semaine);
  const jours = db
    .prepare("SELECT jour FROM rendez_vous_jours WHERE enfant_id=? AND semaine=? ORDER BY jour")
    .all(enfantId, semaine)
    .map((r) => String(r.jour));
  const historique = db
    .prepare(
      `SELECT s.semaine,s.objectif,COUNT(j.jour) AS seances FROM rendez_vous_semaines s LEFT JOIN rendez_vous_jours j ON j.enfant_id=s.enfant_id AND j.semaine=s.semaine WHERE s.enfant_id=? AND s.semaine<? GROUP BY s.semaine ORDER BY s.semaine DESC LIMIT 8`,
    )
    .all(enfantId, semaine);
  const objectif = Number(semaineStockee?.objectif ?? reglage?.objectif ?? 3);
  return {
    semaine,
    jour,
    objectif,
    version: Number(reglage?.version ?? 0),
    jours,
    seances: jours.length,
    atteint: jours.length >= objectif,
    historique,
  };
}
/** Appelée uniquement lors du premier achèvement d'une mission ou d'une révision, dans sa transaction. */
export function enregistrerSeance(db: DatabaseSync, enfantId: number, instant = new Date()) {
  const etat = lireRendezVous(db, enfantId, instant);
  db.prepare("INSERT OR IGNORE INTO rendez_vous_semaines(enfant_id,semaine,objectif) VALUES (?,?,?)").run(
    enfantId,
    etat.semaine,
    etat.objectif,
  );
  db.prepare("INSERT OR IGNORE INTO rendez_vous_jours(enfant_id,jour,semaine) VALUES (?,?,?)").run(
    enfantId,
    etat.jour,
    etat.semaine,
  );
}
export function choisirRythme(db: DatabaseSync, enfantId: number, donnees: unknown, instant = new Date()) {
  const commande = schemaRythme.parse(donnees);
  db.exec("BEGIN IMMEDIATE");
  try {
    const signature = JSON.stringify({ objectif: commande.objectif, version: commande.version });
    const deja = db
      .prepare("SELECT signature FROM rendez_vous_commandes WHERE enfant_id=? AND requete_id=?")
      .get(enfantId, commande.requete_id);
    if (deja && deja.signature !== signature)
      throw new ErreurMetier("Cette demande a déjà été utilisée.", 409);
    const etat = lireRendezVous(db, enfantId, instant);
    if (!deja) {
      if (etat.version !== commande.version)
        throw new ErreurMetier("Ton rythme a changé. Actualise avant de choisir.", 409);
      db.prepare(
        `INSERT INTO rendez_vous_reglages(enfant_id,objectif,version) VALUES (?,?,1) ON CONFLICT(enfant_id) DO UPDATE SET objectif=excluded.objectif,version=rendez_vous_reglages.version+1`,
      ).run(enfantId, commande.objectif);
      db.prepare(
        `INSERT INTO rendez_vous_semaines(enfant_id,semaine,objectif) VALUES (?,?,?) ON CONFLICT(enfant_id,semaine) DO UPDATE SET objectif=excluded.objectif`,
      ).run(enfantId, etat.semaine, commande.objectif);
      db.prepare("INSERT INTO rendez_vous_commandes(enfant_id,requete_id,signature) VALUES (?,?,?)").run(
        enfantId,
        commande.requete_id,
        signature,
      );
    }
    const resultat = lireRendezVous(db, enfantId, instant);
    db.exec("COMMIT");
    return resultat;
  } catch (erreur) {
    db.exec("ROLLBACK");
    throw erreur;
  }
}
