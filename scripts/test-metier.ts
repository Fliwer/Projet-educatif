import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { QuestionEntree } from "../src/logic.ts";

const dossier = await mkdtemp(join(tmpdir(), "lumo-test-metier-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const l = await import("../src/logic.ts");
const { db } = await import("../src/db.ts");
const { migrer } = await import("../src/migrations.ts");
try {
  const enfant = l.trouverEnfant("Arthur")!;
  assert.equal(l.enfantParCode("ARTHUR"), undefined, "Un prénom ne permet pas de s'authentifier");
  assert.equal(l.enfantParCode("LUMO01")!.id, enfant.id);
  const questions: QuestionEntree[] = [
    { type: "choix", consigne: "7 × 8 = ?", choix: ["54", "56", "63"], bonne_reponse: "56" },
    { type: "texte", consigne: "7 × 6 = ?", bonne_reponse: "42" },
    { type: "vrai_faux", consigne: "Le chat est un animal.", bonne_reponse: "Vrai" },
    { type: "ordre", consigne: "Remets la phrase dans l'ordre", elements: ["Le", "chat", "dort"] },
    {
      type: "associer",
      consigne: "Relie les contraires",
      paires: [
        ["grand", "petit"],
        ["chaud", "froid"],
      ],
    },
    { type: "dictee", consigne: "Écris le mot que tu entends", bonne_reponse: "élève" },
  ];
  const entree = { titre: "Les six jeux", matiere: "Test", questions };
  for (const mauvaise of [
    { ...questions[0], choix: ["56", "56"] },
    { ...questions[3], elements: ["seul"] },
    {
      ...questions[4],
      paires: [
        ["chaud", "froid"],
        ["tiède", "froid"],
      ],
    },
    { ...questions[5], consigne: "Écris élève" },
    { ...questions[1], bonne_reponse: " ".repeat(10) },
    { ...questions[3], elements: ["a ‖ b", "c"] },
  ])
    assert.ok(l.verifierQuetes([{ ...entree, questions: [mauvaise as QuestionEntree] }]).length);
  assert.throws(
    () => l.creerQuetes(enfant, [{ ...entree, questions: [] }]),
    "Le service métier valide aussi les appels directs",
  );
  const [quete] = l.creerQuetes(enfant, [entree]);
  assert.throws(() => l.terminerQuete(enfant, quete.id), /reste des questions/);
  const qs = l.questionsQuete(enfant, quete.id)!.questions;
  assert.ok(!JSON.stringify(qs).includes('"bonne_reponse"'));
  assert.notDeepEqual((qs[3] as { elements: string[] }).elements, ["Le", "chat", "dort"]);
  assert.equal((qs[5] as { a_dire: string }).a_dire, "élève");
  const autre = l.ajouterEnfant("Autre", "nature");
  assert.equal(l.questionsQuete(autre, quete.id), undefined);
  assert.equal(l.enregistrerReponse(autre, qs[0].id, "56"), undefined);
  assert.equal(l.terminerQuete(autre, quete.id), undefined);
  const id = randomUUID();
  const premiere = l.enregistrerReponse(enfant, qs[0].id, "54", id)!;
  assert.equal(premiere.correcte, false);
  assert.ok(!("bonne_reponse" in premiere), "Aucune correction au premier essai");
  assert.deepEqual(
    l.enregistrerReponse(enfant, qs[0].id, "54", id),
    premiere,
    "Un retry ne compte pas comme une nouvelle tentative",
  );
  assert.throws(() => l.enregistrerReponse(enfant, qs[0].id, "56", id), /déjà été utilisée/);
  const aide = l.enregistrerReponse(enfant, qs[0].id, "63", randomUUID())!;
  assert.equal(aide.terminee, true);
  assert.equal(aide.bonne_reponse, "56");
  assert.deepEqual(
    l.enregistrerReponse(enfant, qs[0].id, "54", id),
    premiere,
    "Un ancien retry ne dévoile pas la correction",
  );
  assert.throws(() => l.enregistrerReponse(enfant, qs[0].id, "56", randomUUID()), /déjà terminée/);
  const bonnes = ["42", "vrai", "Le ‖ chat ‖ dort", "chaud → froid ‖ grand → petit"];
  bonnes.forEach((bonne, i) =>
    assert.equal(l.enregistrerReponse(enfant, qs[i + 1].id, bonne, randomUUID())!.correcte, true),
  );
  const presque = l.enregistrerReponse(enfant, qs[5].id, "eleve", randomUUID())!;
  assert.equal(presque.presque, true);
  assert.equal(presque.correcte, false);
  assert.equal(l.enregistrerReponse(enfant, qs[5].id, "Élève", randomUUID())!.correcte, true);
  assert.equal(l.etatEnfant(enfant).etoiles, 5);
  assert.throws(() => l.enregistrerReponse(enfant, qs[1].id, "42", randomUUID()), /déjà terminée/);
  assert.equal(l.etatEnfant(enfant).etoiles, 5, "Impossible de gonfler les étoiles");
  assert.ok(
    l.questionsQuete(enfant, quete.id)!.questions.every((q) => q.terminee),
    "Une reprise connaît les questions terminées",
  );
  const fin = l.terminerQuete(enfant, quete.id)!;
  assert.deepEqual(
    fin.bilan,
    { total: 6, reussies: 5, premier_essai: 4 },
    "Le bilan distingue premier essai, correction et réussite après nouvel essai",
  );
  assert.deepEqual(
    l.terminerQuete(enfant, quete.id)!.bilan,
    fin.bilan,
    "Une reprise du bilan garde les mêmes observations",
  );
  assert.equal(l.enfantParCode(enfant.code)!.quetes_finies, 1, "Une seule récompense par quête");
  // Panne simulée entre les deux écritures : rien ne doit rester à moitié validé.
  const [suivante] = l.creerQuetes(enfant, [{ ...entree, questions: [questions[1]] }]);
  const q = l.questionsQuete(enfant, suivante.id)!.questions[0];
  l.enregistrerReponse(enfant, q.id, "42", randomUUID());
  db.exec(
    "CREATE TRIGGER panne_test BEFORE UPDATE OF quetes_finies ON enfants BEGIN SELECT RAISE(ABORT, 'panne'); END;",
  );
  assert.throws(() => l.terminerQuete(enfant, suivante.id), /panne/);
  assert.equal(db.prepare("SELECT statut FROM quetes WHERE id = ?").get(suivante.id)!.statut, "en_cours");
  db.exec("DROP TRIGGER panne_test;");
  migrer(db);
  migrer(db);
  assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 8);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log(
    "OK : 6 jeux, validation, isolation, tentatives, retries, correction différée, reprise, récompenses atomiques et migrations répétables.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
