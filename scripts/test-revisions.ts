import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const dossier = await mkdtemp(join(tmpdir(), "lumo-revisions-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const l = await import("../src/logic.ts");
const { db } = await import("../src/db.ts");
const { reprendreQuete, questionsARevoir } = await import("../src/revisions.ts");
const { archiverQuete, lireParcours } = await import("../src/parcours.ts");
try {
  const enfant = l.trouverEnfant("LUMO01")!;
  const autre = l.ajouterEnfant("Autre", "espace", 1);
  const [source] = l.creerQuetes(enfant, [
    {
      titre: "Addition",
      matiere: "Maths",
      questions: [2, 3, 4].map((n) => ({
        type: "texte" as const,
        consigne: `1 + ${n} = ?`,
        bonne_reponse: String(n + 1),
      })),
    },
  ]);
  assert.throws(() => reprendreQuete(enfant, source.id, "tout", randomUUID()));
  const qs = l.questionsQuete(enfant, source.id)!.questions;
  l.enregistrerReponse(enfant, qs[0].id, "3", randomUUID());
  for (const q of qs.slice(1)) {
    l.enregistrerReponse(enfant, q.id, "0", randomUUID());
    l.enregistrerReponse(enfant, q.id, "0", randomUUID());
  }
  l.terminerQuete(enfant, source.id);
  const initial = JSON.stringify(db.prepare("SELECT * FROM reponses ORDER BY id").all());
  const credits = JSON.stringify(db.prepare("SELECT * FROM monde_attributions").all());
  const etoiles = l.etatEnfant(enfant).etoiles;
  assert.equal(questionsARevoir(enfant, source.id).length, 2);
  assert.throws(() => reprendreQuete(autre, source.id, "tout", randomUUID()));
  const request = randomUUID();
  const reprise = reprendreQuete(enfant, source.id, "cible", request);
  const concurrent = randomUUID();
  assert.equal(reprendreQuete(enfant, source.id, "cible", concurrent).id, reprise.id);
  assert.equal(reprendreQuete(enfant, source.id, "cible", request).id, reprise.id);
  assert.throws(() => reprendreQuete(enfant, source.id, "tout", request));
  const entrainement = l.questionsQuete(enfant, reprise.id)!;
  assert.equal(entrainement.revision, true);
  assert.equal(entrainement.questions.length, 2);
  assert.equal(entrainement.questions[0].essais, 0);
  assert.equal(l.questionsQuete(autre, reprise.id), undefined);
  entrainement.questions.forEach((q, i) => l.enregistrerReponse(enfant, q.id, String(i + 4), randomUUID()));
  const fin = l.terminerQuete(enfant, reprise.id)!;
  l.terminerQuete(enfant, reprise.id);
  assert.equal(fin.revision, true);
  const comparaison = lireParcours(db, enfant.id).find((q) => q.id === reprise.id)!;
  assert.equal(comparaison.total, 2);
  assert.equal(comparaison.initial_premier_essai, 0);
  assert.equal(comparaison.premier_essai, 2);
  assert.equal(l.enfantParCode(enfant.code)!.quetes_finies, 1);
  assert.equal(l.etatEnfant(enfant).etoiles, etoiles);
  assert.equal(JSON.stringify(db.prepare("SELECT * FROM monde_attributions").all()), credits);
  assert.equal(
    JSON.stringify(
      db
        .prepare(
          "SELECT * FROM reponses WHERE question_id IN (SELECT id FROM questions WHERE quete_id=?) ORDER BY id",
        )
        .all(source.id),
    ),
    initial,
  );
  assert.equal(
    reprendreQuete(enfant, source.id, "cible", concurrent).id,
    reprise.id,
    "Retry après fin ne crée pas un nouveau passage",
  );
  assert.equal(questionsARevoir(enfant, source.id).length, 0);
  assert.throws(() => reprendreQuete(enfant, source.id, "cible", randomUUID()));
  const tout = reprendreQuete(enfant, source.id, "tout", randomUUID());
  assert.equal(l.questionsQuete(enfant, tout.id)!.questions.length, 3);
  assert.equal(l.etatEnfant(enfant).quetes.length, 1, "Une seule étape par mission sur la carte");
  archiverQuete(db, enfant.id, source.id);
  assert.equal(l.questionsQuete(enfant, tout.id), undefined);
  assert.throws(() => reprendreQuete(enfant, source.id, "tout", randomUUID()));
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log(
    "OK révisions : ciblage, historique conservé, reprise concurrente/idempotente, isolation et aucune récompense supplémentaire.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
