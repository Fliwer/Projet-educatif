import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { schemaQuetes } from "../src/formats.ts";
const dossier = await mkdtemp(join(tmpdir(), "lumo-accompagnement-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const { db } = await import("../src/db.ts");
const l = await import("../src/logic.ts");
const p = await import("../src/parents.ts");
const { reprendreQuete } = await import("../src/revisions.ts");
try {
  const enfant = l.trouverEnfant("LUMO01")!;
  const question = {
    type: "choix" as const,
    consigne: "2 + 3 = ?",
    choix: ["5", "6"],
    bonne_reponse: "5",
    indice: "Ajouter, c’est réunir deux quantités.",
    aide: "Pars de deux et avance de trois petits pas en comptant.",
    explication: "Après deux, trois petits pas donnent trois, quatre, cinq.",
  };
  const quete = {
    titre: "Les additions",
    matiere: "Maths",
    notion: "Addition",
    extrait_lecon: "On réunit des quantités.",
    resume: "Pour additionner, réunis deux quantités. Par exemple, un cube et un cube font deux cubes.",
    questions: Array.from({ length: 5 }, () => ({ ...question })),
  };
  const token = p.preparerBrouillon(1, enfant, [quete]);
  const brouillon = p.lireBrouillon(token)!;
  assert.equal(brouillon.quetes[0].resume, quete.resume);
  assert.equal(brouillon.quetes[0].questions[0].aide, question.aide);
  p.validerBrouillon(token, brouillon.nonce, ["0:0"]);
  const id = Number(db.prepare("SELECT id FROM quetes").get()!.id);
  const mission = l.questionsQuete(enfant, id)!;
  assert.equal(mission.resume, quete.resume);
  const q = mission.questions[0];
  assert.equal(q.indice, question.indice);
  assert.equal(q.aide, question.aide);
  assert.equal("explication" in q, false);
  assert.equal("bonne" in q, false);
  const premier = l.enregistrerReponse(enfant, q.id, "6")!;
  assert.equal("explication" in premier, false);
  assert.equal("bonne_reponse" in premier, false);
  const reprise = l.questionsQuete(enfant, id)!.questions[0];
  assert.equal(reprise.essais, 1);
  assert.equal(reprise.indice, question.indice);
  const dernier = l.enregistrerReponse(enfant, q.id, "6")!;
  assert.equal(dernier.explication, question.explication);
  assert.equal(dernier.bonne_reponse, "5");
  l.terminerQuete(enfant, id);
  const revision = reprendreQuete(enfant, id, "tout", randomUUID());
  const entrainement = l.questionsQuete(enfant, revision.id)!;
  assert.equal(entrainement.resume, quete.resume);
  assert.equal(entrainement.questions[0].aide, question.aide);
  assert.equal(
    l.enregistrerReponse(enfant, entrainement.questions[0].id, "5")!.explication,
    question.explication,
  );
  const ancienne = l.creerQuetes(enfant, [
    {
      titre: "Ancienne mission",
      matiere: "Maths",
      questions: [{ type: "texte", consigne: "Calcule 1 + 1.", bonne_reponse: "2" }],
    },
  ])[0];
  assert.equal(l.questionsQuete(enfant, ancienne.id)!.resume, null);
  assert.equal(schemaQuetes.safeParse([{ ...quete, resume: "x".repeat(701) }]).success, false);
  assert.equal(
    schemaQuetes.safeParse([{ ...quete, questions: [{ ...question, aide: " " }] }]).success,
    false,
  );
  console.log(
    "OK accompagnement : brouillon, publication, reprise, correction différée, révisions et anciennes missions.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
