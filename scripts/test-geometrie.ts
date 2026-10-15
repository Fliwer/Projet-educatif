import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { quetesQuadrilateres, formes } from "./exercices-quadrilateres.ts";
import { schemaQuetesPedagogiques } from "../src/formats.ts";
import { figureSvg } from "../public/geometrie.js";
const dossier = await mkdtemp(join(tmpdir(), "lumo-geometrie-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const { db } = await import("../src/db.ts");
const l = await import("../src/logic.ts");
const p = await import("../src/parents.ts");
const { reprendreQuete } = await import("../src/revisions.ts");
const { migrer } = await import("../src/migrations.ts");
try {
  const enfant = l.trouverEnfant("LUMO01")!;
  assert.equal(schemaQuetesPedagogiques.safeParse(quetesQuadrilateres).success, true);
  assert.deepEqual(l.verifierQuetes(quetesQuadrilateres), []);
  assert.equal(
    schemaQuetesPedagogiques.safeParse([
      {
        ...quetesQuadrilateres[0],
        questions: [
          {
            ...quetesQuadrilateres[0].questions[0],
            illustration: { figures: [{ id: "<script>", points: formes.rectangle }] },
          },
        ],
      },
    ]).success,
    false,
  );
  const selection = quetesQuadrilateres[0].questions[0];
  assert.ok(
    l.verifierQuetes([{ ...quetesQuadrilateres[0], questions: [{ ...selection, bonne_reponse: "Z" }] }])
      .length,
  );
  const tracage = quetesQuadrilateres[2].questions[0];
  assert.ok(
    l.verifierQuetes([
      {
        ...quetesQuadrilateres[2],
        questions: [
          {
            ...tracage,
            illustration: { figures: [{ id: "A", points: formes.rectangle, diagonales: true }] },
          },
        ],
      },
    ]).length,
    "Le tracé ne donne pas les diagonales à l'avance",
  );
  const jeton = p.preparerBrouillon(1, enfant, quetesQuadrilateres);
  assert.equal(p.lireBrouillon(jeton)!.quetes[0].questions[0].illustration!.figures.length, 9);
  p.validerBrouillon(jeton, p.lireBrouillon(jeton)!.nonce);
  const ids = db
    .prepare("SELECT id FROM quetes ORDER BY id")
    .all()
    .map((q) => Number(q.id));
  const qs = l.questionsQuete(enfant, ids[0])!.questions;
  assert.equal(qs[0].illustration!.figures.length, 9);
  assert.equal("bonne_reponse" in qs[0], false);
  assert.equal("bonne" in qs[0], false);
  assert.equal(
    l.enregistrerReponse(enfant, qs[0].id, "A ‖ D ‖ G ‖ B", randomUUID())!.correcte,
    false,
    "Une figure en trop est incorrecte",
  );
  assert.equal(
    l.enregistrerReponse(enfant, qs[0].id, "G ‖ A ‖ D", randomUUID())!.correcte,
    true,
    "L'ordre des sélections ne compte pas",
  );
  qs.slice(1).forEach((q, i) =>
    l.enregistrerReponse(enfant, q.id, quetesQuadrilateres[0].questions[i + 1].bonne_reponse!, randomUUID()),
  );
  l.terminerQuete(enfant, ids[0]);
  const reprise = reprendreQuete(enfant, ids[0], "tout", randomUUID());
  assert.deepEqual(
    l.questionsQuete(enfant, reprise.id)!.questions[0].illustration,
    qs[0].illustration,
    "Les reprises conservent les dessins",
  );
  const diagonales = l.questionsQuete(enfant, ids[2])!.questions[0];
  assert.equal(
    l.enregistrerReponse(enfant, diagonales.id, "AB ‖ CD", randomUUID())!.correcte,
    false,
    "Les côtés ne sont pas des diagonales",
  );
  assert.equal(l.enregistrerReponse(enfant, diagonales.id, "BD ‖ AC", randomUUID())!.correcte, true);
  const svg = figureSvg({
    id: "A",
    points: formes.carre,
    codage_cotes: "egaux",
    codage_diagonales: "egales_perpendiculaires",
    angles_droits: true,
  });
  assert.ok(svg.includes("<polygon") && svg.includes("<polyline") && svg.includes("<line"));
  assert.ok(!/NaN|undefined/.test(svg));
  const autre = l.ajouterEnfant("Autre", "nature");
  assert.equal(l.questionsQuete(autre, ids[0]), undefined);
  db.exec("ALTER TABLE questions DROP COLUMN illustration; PRAGMA user_version=8;");
  migrer(db);
  migrer(db);
  assert.equal(
    db.prepare("SELECT illustration FROM questions LIMIT 1").get()!.illustration,
    null,
    "Une ancienne base reste utilisable",
  );
  console.log(
    "OK géométrie : brouillon, 9 figures, correction, diagonales, isolation, reprises, SVG et migration v8.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
