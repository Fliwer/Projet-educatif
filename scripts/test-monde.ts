import { strict as assert } from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lireMonde, agirMonde } from "../src/monde.ts";
const dossier = await mkdtemp(join(tmpdir(), "lumo-espace-"));
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_DATA = dossier;
const { db } = await import("../src/db.ts");
const l = await import("../src/logic.ts");
try {
  const enfant = l.enfantParCode("LUMO01")!;
  const autre = l.ajouterEnfant("Autre profil", "nature");
  const lire = () => lireMonde(db, enfant.id);
  const commande = (action: object) => ({ ...action, version: lire().version, requete_id: randomUUID() });
  const agir = (action: object) => agirMonde(db, enfant.id, commande(action));
  assert.deepEqual(lire().avatar, { couleur: "violet", badge: "aucun" });
  assert.equal(lire().cadeaux_disponibles, 0);
  assert.equal(lire().aventure, "espace");
  const avantUnivers = lire();
  const choixUnivers = commande({ action: "univers", aventure: "medieval" });
  agirMonde(db, enfant.id, choixUnivers);
  assert.equal(lire().aventure, "medieval");
  assert.equal(lireMonde(db, autre.id).aventure, "espace", "Le choix est isolé par enfant");
  assert.equal(l.etatEnfant(enfant).aventure, "medieval");
  assert.equal(
    lire().cadeaux_disponibles,
    avantUnivers.cadeaux_disponibles,
    "Changer d’univers ne donne pas de récompense",
  );
  const apresUnivers = lire();
  agirMonde(db, enfant.id, choixUnivers);
  assert.deepEqual(lire(), apresUnivers, "Le retry de sélection est idempotent");
  agir({ action: "univers", aventure: "jardin" });
  assert.equal(lire().aventure, "jardin", "Le jardin est enregistré et relu");
  assert.equal(l.etatEnfant(enfant).aventure, "jardin");
  assert.equal(lire().cadeaux_disponibles, avantUnivers.cadeaux_disponibles);
  assert.equal(lireMonde(db, autre.id).aventure, "espace");
  assert.throws(() => agir({ action: "univers", aventure: "inconnu" }));
  assert.throws(() => agir({ action: "univers", aventure: "medieval", enfant_id: autre.id }));
  assert.throws(
    () => agir({ action: "avatar", avatar: { couleur: "bleu", badge: "badge_fusee" } }),
    /collection/,
  );
  assert.throws(() => agir({ action: "avatar", avatar: { couleur: "inconnue", badge: "aucun" } }));
  assert.throws(() =>
    agir({ action: "avatar", avatar: { couleur: "bleu", badge: "aucun" }, enfant_id: autre.id }),
  );
  assert.throws(() => agir({ action: "debloquer", cadeau: "badge_fusee" }), /mission/);
  assert.throws(() => agir({ action: "debloquer", cadeau: "tomate" }));
  for (const action of [
    "planter",
    "arroser",
    "soigner",
    "recolter",
    "cuisiner",
    "melanger",
    "dresser",
    "objectif",
    "decorer",
    "ambiance",
  ])
    assert.throws(() => agir({ action }), `${action} retirée du contrat`);
  const modifier = commande({ action: "avatar", avatar: { couleur: "bleu", badge: "aucun" } });
  agirMonde(db, enfant.id, modifier);
  const apres = lire();
  agirMonde(db, enfant.id, modifier);
  assert.deepEqual(lire(), apres);
  assert.throws(
    () => agirMonde(db, enfant.id, { ...modifier, avatar: { couleur: "rose", badge: "aucun" } }),
    /déjà été utilisée/,
  );
  assert.throws(() => agirMonde(db, enfant.id, { ...modifier, requete_id: randomUUID() }), /autre écran/);
  assert.deepEqual(lireMonde(db, autre.id).avatar, { couleur: "violet", badge: "aucun" });
  // Anciennes données opaques : aucun recalcul de pousse ni perte pendant une personnalisation.
  const ancien = {
    parcelles: [{ culture: "fraise", etape: 1, mure_le: 1 }, null, null],
    panier: { fraise: 2, carotte: 4, tomate: 0, citrouille: 0 },
    objectif: "tomate",
    decors: ["fontaine"],
    ambiance: "soir",
    preparation: { recette: "coupe", etape: 1 },
    creations: [
      {
        recette: "coupe",
        decoration: "etoiles",
        motifs: [{ forme: "coeur", x: 42, y: 50 }],
        nombre: 2,
        cree: "2026-10-09",
      },
    ],
  };
  db.prepare("UPDATE monde_etats SET donnees=? WHERE enfant_id=?").run(JSON.stringify(ancien), enfant.id);
  db.prepare("INSERT INTO monde_attributions(enfant_id,source,quantite) VALUES (?, 'heritage', 2)").run(
    enfant.id,
  );
  db.prepare("INSERT INTO monde_deblocages(enfant_id,objet) VALUES (?, 'fontaine')").run(enfant.id);
  assert.equal(lire().cadeaux_disponibles, 1, "L’achat historique reste décompté");
  assert.equal(lire().souvenirs, 2);
  assert.equal("parcelles" in lire(), false, "Les ateliers ne sont plus exposés dans l’API");
  assert.deepEqual(lire().creations, ancien.creations);
  const cadeau = commande({ action: "debloquer", cadeau: "badge_fusee" });
  agirMonde(db, enfant.id, cadeau);
  agirMonde(db, enfant.id, cadeau);
  assert.equal(lire().cadeaux_disponibles, 0);
  agir({ action: "avatar", avatar: { couleur: "vert", badge: "badge_fusee" } });
  const { avatar, aventure, ...conserve } = JSON.parse(
    String(db.prepare("SELECT donnees FROM monde_etats WHERE enfant_id=?").get(enfant.id)!.donnees),
  );
  assert.equal(aventure, "espace", "Un ancien profil reçoit l’univers par défaut sans perdre ses données");
  assert.deepEqual(
    conserve,
    ancien,
    "Toutes les données historiques sont conservées après achat et personnalisation",
  );
  const connexion = new DatabaseSync(join(dossier, "lumo.db"));
  try {
    assert.deepEqual(lireMonde(connexion, enfant.id).avatar, { couleur: "vert", badge: "badge_fusee" });
  } finally {
    connexion.close();
  }
  const [quete] = l.creerQuetes(enfant, [
    {
      titre: "Mission",
      matiere: "Maths",
      questions: [{ type: "texte", consigne: "3 + 2 = ?", bonne_reponse: "5" }],
    },
  ]);
  const question = l.questionsQuete(enfant, quete.id)!.questions[0];
  l.enregistrerReponse(enfant, question.id, "6", randomUUID());
  l.enregistrerReponse(enfant, question.id, "7", randomUUID());
  db.exec(
    "CREATE TRIGGER panne_cadeau BEFORE INSERT ON monde_attributions BEGIN SELECT RAISE(ABORT, 'panne cadeau'); END",
  );
  assert.throws(() => l.terminerQuete(enfant, quete.id), /panne cadeau/);
  assert.equal(l.enfantParCode(enfant.code)!.quetes_finies, 0);
  assert.equal(db.prepare("SELECT statut FROM quetes WHERE id=?").get(quete.id)!.statut, "en_cours");
  db.exec("DROP TRIGGER panne_cadeau");
  l.terminerQuete(enfant, quete.id);
  l.terminerQuete(enfant, quete.id);
  assert.equal(lire().cadeaux_disponibles, 1);
  assert.equal(lire().progres.missions_terminees, 1);
  assert.equal(lire().progres.questions_essayees, 1);
  assert.equal(lireMonde(db, autre.id).progres.questions_essayees, 0);
  db.prepare("DELETE FROM reponses WHERE question_id=?").run(question.id);
  db.prepare("DELETE FROM questions WHERE quete_id=?").run(quete.id);
  db.prepare("DELETE FROM quetes WHERE id=?").run(quete.id);
  const [suivante] = l.creerQuetes(enfant, [
    {
      titre: "Autre mission",
      matiere: "Maths",
      questions: [{ type: "texte", consigne: "4 + 2 = ?", bonne_reponse: "6" }],
    },
  ]);
  assert.equal(suivante.id, quete.id);
  const seconde = l.questionsQuete(enfant, suivante.id)!.questions[0];
  l.enregistrerReponse(enfant, seconde.id, "6", randomUUID());
  l.terminerQuete(enfant, suivante.id);
  assert.equal(
    lire().cadeaux_disponibles,
    2,
    "Réutiliser un numéro de quête conserve une récompense distincte",
  );
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  console.log(
    "OK espace : avatar, achats uniques, droits, conflits, isolation, récompenses atomiques, progression, archives intactes et anciennes actions refusées.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
