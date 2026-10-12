import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pointsAVerifier, supportAbsent } from "../src/pedagogie.ts";
const dossier = await mkdtemp(join(tmpdir(), "lumo-pedagogie-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const { db } = await import("../src/db.ts");
const l = await import("../src/logic.ts");
const p = await import("../src/parents.ts");
try {
  const e = l.trouverEnfant("LUMO01")!;
  const question = { type: "choix" as const, consigne: "2 + 3 = ?", choix: ["5", "6"], bonne_reponse: "5" };
  const quete = {
    titre: "Petites additions",
    matiere: "Maths",
    notion: "Addition jusqu’à 10",
    niveau_scolaire: "2e primaire",
    origine_contenu: "decouverte",
    extrait_lecon: "Fiche de découverte : ajouter deux petites quantités.",
    questions: Array.from({ length: 5 }, () => ({ ...question })),
  };
  assert.equal(supportAbsent({ ...question, consigne: "Observe la carte ci-dessous." }), true);
  assert.equal(supportAbsent({ ...question, consigne: "Regarde l’image. Quel animal vois-tu ?" }), true);
  assert.equal(supportAbsent({ ...question, consigne: "Quel document montre une classe ancienne ?" }), false);
  assert.equal(pointsAVerifier({ ...question, consigne: "Une phrase longue. ".repeat(8) }).length, 1);
  assert.throws(
    () =>
      p.preparerBrouillon(1, e, [
        { ...quete, questions: quete.questions.map((q) => ({ ...q, consigne: "Observe cette image." })) },
      ]),
    /support visuel absent/,
  );
  const token = p.preparerBrouillon(1, e, [quete]);
  const draft = p.lireBrouillon(token)!;
  assert.equal(draft.quetes[0].niveau_scolaire, "2e primaire");
  assert.throws(() => p.validerBrouillon(token, "faux", ["0:0"]));
  for (const selection of [[], ["0:9"], ["1:0"], ["0:0", "0:0"], ["__proto__"]])
    assert.throws(() => p.validerBrouillon(token, draft.nonce, selection));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM quetes").get()!.n, 0);
  p.validerBrouillon(token, draft.nonce, ["0:1", "0:3"]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM questions").get()!.n, 2);
  assert.equal(p.validerBrouillon(token, draft.nonce, ["0:0"]).dejaPublie, true);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM questions").get()!.n, 2);
  const token2 = p.preparerBrouillon(1, e, [quete, { ...quete, titre: "Seconde" }]);
  p.validerBrouillon(token2, p.lireBrouillon(token2)!.nonce, ["1:0"]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM quetes WHERE titre='Seconde'").get()!.n, 1);
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM quetes").get()!.n,
    2,
    "La mission entièrement décochée n’est pas envoyée",
  );
  console.log(
    "OK pédagogie : supports absents, alertes, métadonnées, sélection parent, nonce et publication unique.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
