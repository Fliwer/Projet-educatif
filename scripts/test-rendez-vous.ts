import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const dossier = await mkdtemp(join(tmpdir(), "lumo-rendez-vous-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_FUSEAU = "Europe/Brussels";
const { db, transaction } = await import("../src/db.ts");
const { lireRendezVous, choisirRythme, enregistrerSeance, semaineDe } = await import("../src/rendez-vous.ts");
const { migrer } = await import("../src/migrations.ts");
const instant = (s: string) => new Date(s);
try {
  const lundi = instant("2026-10-12T10:00:00Z");
  assert.equal(semaineDe("2026-10-18"), "2026-10-12");
  assert.equal(semaineDe("2026-10-19"), "2026-10-19");
  const base = lireRendezVous(db, 1, lundi);
  assert.equal(base.objectif, 3);
  assert.equal(base.seances, 0);
  const commande = { objectif: 2, version: 0, requete_id: randomUUID() };
  const rythme = choisirRythme(db, 1, commande, lundi);
  assert.equal(rythme.objectif, 2);
  assert.equal(rythme.version, 1);
  assert.equal(choisirRythme(db, 1, commande, lundi).version, 1, "Un retry ne refait pas la modification");
  assert.throws(() => choisirRythme(db, 1, { ...commande, objectif: 4 }, lundi), /déjà/);
  assert.throws(() => choisirRythme(db, 1, { ...commande, requete_id: randomUUID() }, lundi), /changé/);
  assert.throws(() => choisirRythme(db, 1, { ...commande, objectif: 5 }, lundi));
  assert.throws(() => choisirRythme(db, 1, { ...commande, enfant_id: 2 }, lundi));
  transaction(() => {
    enregistrerSeance(db, 1, lundi);
    enregistrerSeance(db, 1, lundi);
  });
  assert.equal(
    lireRendezVous(db, 1, lundi).seances,
    1,
    "Plusieurs missions et révisions le même jour ne font qu'une séance",
  );
  const jeudi = instant("2026-10-15T10:00:00Z");
  assert.equal(lireRendezVous(db, 1, jeudi).seances, 1, "Deux journées manquées ne retirent rien");
  transaction(() => enregistrerSeance(db, 1, jeudi));
  assert.equal(lireRendezVous(db, 1, jeudi).atteint, true);
  const suivant = lireRendezVous(db, 1, instant("2026-10-19T10:00:00Z"));
  assert.equal(suivant.objectif, 2);
  assert.equal(suivant.seances, 0);
  assert.equal(suivant.historique[0].seances, 2);
  choisirRythme(
    db,
    1,
    { objectif: 4, version: 1, requete_id: randomUUID() },
    instant("2026-10-19T10:00:00Z"),
  );
  assert.equal(
    lireRendezVous(db, 1, jeudi).objectif,
    2,
    "Le choix de la nouvelle semaine ne réécrit pas l'ancien objectif",
  );
  transaction(() => enregistrerSeance(db, 1, instant("2026-10-25T23:30:00Z")));
  const minuit = lireRendezVous(db, 1, instant("2026-10-25T23:30:00Z"));
  assert.equal(minuit.jour, "2026-10-26");
  assert.equal(minuit.semaine, "2026-10-26", "Le jour civil suit Bruxelles après le changement d'heure");
  assert.equal(lireRendezVous(db, 999, lundi).seances, 0, "Aucune donnée d'un autre enfant");
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM monde_attributions").get()!.n,
    0,
    "Aucune récompense hebdomadaire créée",
  );
  // Reproduit une base v7 remplie et des missions terminées le même jour.
  db.exec(
    "DROP TABLE rendez_vous_commandes; DROP TABLE rendez_vous_jours; DROP TABLE rendez_vous_semaines; DROP TABLE rendez_vous_reglages; PRAGMA user_version=7;",
  );
  db.prepare(
    "INSERT INTO quetes(enfant_id,titre,matiere,statut,cree_le,finie_le) VALUES(1,'Historique','Maths','terminee','2026-10-12','2026-10-12 10:00:00')",
  ).run();
  db.prepare(
    "INSERT INTO quetes(enfant_id,titre,matiere,statut,cree_le,finie_le) VALUES(1,'Historique bis','Maths','terminee','2026-10-12','2026-10-12 11:00:00')",
  ).run();
  migrer(db);
  migrer(db);
  assert.equal(
    lireRendezVous(db, 1, lundi).seances,
    1,
    "Migration : les anciennes missions conservent un jour distinct",
  );
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log(
    "OK rendez-vous : calendrier, objectif, retries, conflits, jours manqués, révisions, historique, fuseau et migration remplie.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
