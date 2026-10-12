import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { lireParcours, archiverQuete } from "../src/parcours.ts";

const dossier = await mkdtemp(join(tmpdir(), "lumo-parcours-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const l = await import("../src/logic.ts");
const { db } = await import("../src/db.ts");
try {
  const enfant = l.trouverEnfant("LUMO01")!;
  const autre = l.ajouterEnfant("Autre", "espace", 1);
  assert.deepEqual(lireParcours(db, enfant.id), []);
  const [quete] = l.creerQuetes(enfant, [
    {
      titre: "Petites additions",
      matiere: "Maths",
      notion: "Additionner jusqu’à 10",
      questions: [2, 3, 4].map((n) => ({
        type: "texte" as const,
        consigne: `1 + ${n} = ?`,
        bonne_reponse: String(n + 1),
      })),
    },
  ]);
  const questions = l.questionsQuete(enfant, quete.id)!.questions;
  const requete = randomUUID();
  l.enregistrerReponse(enfant, questions[0].id, "3", requete);
  l.enregistrerReponse(enfant, questions[0].id, "3", requete);
  l.enregistrerReponse(enfant, questions[1].id, "8", randomUUID());
  l.enregistrerReponse(enfant, questions[1].id, "4", randomUUID());
  l.enregistrerReponse(enfant, questions[2].id, "8", randomUUID());
  l.enregistrerReponse(enfant, questions[2].id, "9", randomUUID());
  l.terminerQuete(enfant, quete.id);
  const bilan = lireParcours(db, enfant.id)[0];
  assert.equal(bilan.notion, "Additionner jusqu’à 10");
  assert.equal(bilan.essayees, 3, "Les répétitions ne comptent pas comme de nouvelles questions");
  assert.equal(bilan.premier_essai, 1);
  assert.equal(bilan.reussies, 2);
  assert.equal(bilan.statut, "terminee", "Terminer ne signifie pas tout réussir");
  assert.deepEqual(lireParcours(db, autre.id), []);
  assert.equal(archiverQuete(db, autre.id, quete.id), false);
  const avant = JSON.stringify(db.prepare("SELECT * FROM reponses").all());
  assert.equal(archiverQuete(db, enfant.id, quete.id), true);
  assert.equal(archiverQuete(db, enfant.id, quete.id), false);
  assert.equal(l.questionsQuete(enfant, quete.id), undefined);
  assert.equal(l.enregistrerReponse(enfant, questions[0].id, "3", randomUUID()), undefined);
  assert.equal(l.terminerQuete(enfant, quete.id), undefined);
  assert.equal(l.etatEnfant(enfant).quetes.length, 0);
  assert.equal(JSON.stringify(db.prepare("SELECT * FROM reponses").all()), avant);
  assert.equal(l.enfantParCode(enfant.code)!.quetes_finies, 1);
  assert.equal(lireParcours(db, enfant.id)[0].archivee, 1);
  assert.equal(lireParcours(db, enfant.id)[0].premier_essai, 1);
  const [suite] = l.creerQuetes(enfant, [
    {
      titre: "Suite",
      matiere: "Français",
      questions: [{ type: "texte", consigne: "Écris un mot", bonne_reponse: "chat" }],
    },
  ]);
  assert.equal(archiverQuete(db, enfant.id, suite.id), true);
  assert.equal(l.questionsQuete(enfant, suite.id), undefined);
  assert.equal(l.terminerQuete(enfant, suite.id), undefined);
  assert.equal(lireParcours(db, enfant.id).find((q) => q.id === suite.id)!.statut, "a_faire");
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log(
    "OK parcours : observations exactes, isolation, notion conservée, archives inaccessibles au jeu et historique intact.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
