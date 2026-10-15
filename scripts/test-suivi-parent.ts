import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dossier = await mkdtemp(join(tmpdir(), "lumo-suivi-parent-"));
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_DATA = dossier;
process.env.LUMO_FUSEAU = "Europe/Brussels";
const { db } = await import("../src/db.ts");
const { creerQuetes, trouverEnfant, ajouterEnfant } = await import("../src/logic.ts");
const { lireSuiviParent, matiereSuivi } = await import("../src/suivi-parent.ts");
try {
  const enfant = trouverEnfant("LUMO01")!,
    autre = ajouterEnfant("Autre test", "espace", 1);
  function mission(matiere: string, n: number, nom: string) {
    const [q] = creerQuetes(enfant, [
      {
        titre: nom,
        matiere,
        notion: nom,
        questions: Array.from({ length: n }, (_, i) => ({
          type: "texte" as const,
          consigne: `Combien font ${i + 1} + 2 ?`,
          bonne_reponse: String(i + 3),
        })),
      },
    ]);
    return {
      id: q.id,
      questions: db
        .prepare("SELECT id FROM questions WHERE quete_id=? ORDER BY ordre")
        .all(q.id)
        .map((q) => Number(q.id)),
    };
  }
  const maths = mission("Maths", 2, "Addition"),
    fr = mission("Français", 2, "Conjugaison"),
    sciences = mission("Sciences", 1, "Plantes");
  const essai = (question: number, correcte: number, le: string) =>
    db
      .prepare("INSERT INTO reponses(question_id,valeur,correcte,le) VALUES(?,?,?,?)")
      .run(question, "test", correcte, le);
  essai(maths.questions[0], 0, "2026-10-08 10:00:00");
  essai(maths.questions[0], 1, "2026-10-09 10:00:00");
  essai(maths.questions[1], 0, "2026-10-09 10:00:00");
  essai(maths.questions[1], 0, "2026-10-09 10:01:00");
  essai(sciences.questions[0], 1, "2026-09-01 10:00:00");
  const reprise = mission("Mathématiques", 2, "Addition");
  db.prepare("UPDATE quetes SET origine_id=? WHERE id=?").run(maths.id, reprise.id);
  reprise.questions.forEach((id, i) =>
    db.prepare("UPDATE questions SET source_id=? WHERE id=?").run(maths.questions[i], id),
  );
  essai(reprise.questions[0], 1, "2026-10-15 10:00:00");
  essai(reprise.questions[1], 0, "2026-10-15 10:01:00");
  essai(reprise.questions[1], 1, "2026-10-15 10:02:00");
  db.prepare("UPDATE quetes SET statut='terminee',finie_le='2026-10-15 10:03:00' WHERE id=?").run(reprise.id);
  essai(fr.questions[0], 1, "2026-10-15 11:00:00");
  essai(fr.questions[1], 0, "2026-10-15 11:01:00");
  essai(fr.questions[1], 1, "2026-10-16 11:02:00");
  // Une nouvelle reprise vide ne doit pas masquer les résultats déjà observés.
  const vide = mission("Maths", 1, "Addition");
  db.prepare("UPDATE quetes SET origine_id=? WHERE id=?").run(maths.id, vide.id);
  db.prepare("UPDATE questions SET source_id=? WHERE id=?").run(maths.questions[0], vide.questions[0]);
  db.prepare("UPDATE quetes SET archivee=1 WHERE id=?").run(maths.id);
  const reference = new Date("2026-10-15T20:00:00Z");
  const avant = JSON.stringify(db.prepare("SELECT * FROM reponses ORDER BY id").all());
  const suivi = lireSuiviParent(db, enfant.id, 7, reference);
  assert.deepEqual(suivi.total, { questions: 4, premier: 2, apres: 1, en_cours: 1, a_revoir: 0 });
  assert.deepEqual(suivi.reprises, {
    comparees: 2,
    premier_maintenant: 1,
    toujours_premier: 0,
    encore_variable: 1,
  });
  assert.equal(
    suivi.matieres.find((m) => m.nom === "Mathématiques")!.questions,
    2,
    "Les reprises ne doublent pas les questions sources",
  );
  assert.equal(
    suivi.matieres.find((m) => m.nom === "Français")!.en_cours,
    1,
    "Un seul essai ne devient pas une difficulté établie",
  );
  assert.equal(
    suivi.activites.find((j) => j.jour === "2026-10-09")!.questions,
    2,
    "Un passage sur deux jours est présent chaque jour travaillé",
  );
  assert.equal(suivi.activites.find((j) => j.jour === "2026-10-15")!.apres, 1);
  assert.equal(suivi.appuis.length, 0, "Pas de point d'appui affirmé sur un faible échantillon");
  assert.equal(
    lireSuiviParent(db, enfant.id, 0, reference).total.questions,
    5,
    "L'historique inclut les anciens essais et les archives",
  );
  assert.equal(lireSuiviParent(db, autre.id, 0, reference).total.questions, 0, "Isolation par enfant");
  const initial = lireSuiviParent(db, enfant.id, 0, new Date("2026-10-10T20:00:00Z"));
  assert.equal(initial.total.a_revoir, 1, "Une question sans réussite après deux essais est repérée");
  assert.equal(initial.total.apres, 1, "Une réussite au deuxième essai est conservée comme réussite");
  assert.equal(
    lireSuiviParent(db, enfant.id, 7, new Date("2026-10-15T22:30:00Z")).jusquau,
    "2026-10-16",
    "Jour civil Bruxelles",
  );
  assert.equal(lireSuiviParent(db, enfant.id, 7, new Date("2026-10-15T22:30:00Z")).depuis, "2026-10-10");
  assert.equal(
    JSON.stringify(db.prepare("SELECT * FROM reponses ORDER BY id").all()),
    avant,
    "Le suivi ne modifie aucun essai",
  );
  assert.equal(matiereSuivi("Géométrie"), "Mathématiques");
  console.log(
    "OK suivi parents : périodes locales, derniers passages sans doublons, reprises comparables, activité réelle, petits échantillons, archives, isolation et lecture seule.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
