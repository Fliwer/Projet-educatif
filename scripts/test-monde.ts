import { strict as assert } from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrer } from "../src/migrations.ts";
import { lireMonde, agirMonde, DUREE_POUSSE_MS, NOMBRE_PARCELLES } from "../src/monde.ts";

const dossier = await mkdtemp(join(tmpdir(), "lumo-monde-"));
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_DATA = dossier;
const { db } = await import("../src/db.ts");
const l = await import("../src/logic.ts");
try {
  const enfant = l.enfantParCode("LUMO01")!;
  const autre = l.ajouterEnfant("Autre jardin", "nature");
  let horloge = Date.now();
  const executer = (connexion: DatabaseSync, id: number, action: unknown) =>
    agirMonde(connexion, id, action, horloge);
  const lire = () => lireMonde(db, enfant.id, horloge);
  const commande = (action: object) => ({ ...action, version: lire().version, requete_id: randomUUID() });
  const agir = (action: object) => executer(db, enfant.id, commande(action));
  assert.equal(lire().cadeaux_disponibles, 0);
  assert.deepEqual(lire().parcelles, Array(NOMBRE_PARCELLES).fill(null));
  assert.throws(() => agir({ action: "planter", parcelle: 0, culture: "tomate" }), /graines/);
  assert.throws(() => agir({ action: "planter", parcelle: NOMBRE_PARCELLES, culture: "fraise" }));
  assert.throws(() => agir({ action: "ambiance", valeur: "soir", enfant_id: autre.id }));
  assert.throws(() => agir({ action: "cuisiner", recette: "coupe" }), /ingrédients/);
  assert.throws(() => agir({ action: "debloquer", cadeau: "fontaine" }), /mission/);
  assert.throws(() => agir({ action: "decorer", objet: "fontaine", actif: true }), /collection/);
  const planter = commande({ action: "planter", parcelle: 0, culture: "fraise" });
  executer(db, enfant.id, planter);
  const apresPlantation = lire();
  executer(db, enfant.id, planter);
  assert.deepEqual(lire(), apresPlantation, "Un retry ne replante pas et ne change pas la version");
  assert.throws(() => executer(db, enfant.id, { ...planter, culture: "carotte" }), /déjà été utilisée/);
  assert.throws(() => agir({ action: "recolter", parcelle: 0 }), /parcelle/);
  const arrosage = commande({ action: "arroser", parcelle: 0 });
  executer(db, enfant.id, arrosage);
  const apresArrosage = lire();
  horloge += 1000;
  executer(db, enfant.id, arrosage);
  assert.equal(lire().version, apresArrosage.version);
  assert.equal(
    lire().parcelles[0]!.mure_le,
    apresArrosage.parcelles[0]!.mure_le,
    "Un retry tardif ne redémarre pas la pousse",
  );
  const autreEcran = commande({ action: "soigner", parcelle: 0 });
  agir({ action: "ambiance", valeur: "soir" });
  assert.throws(() => executer(db, enfant.id, autreEcran), /autre écran/);
  assert.throws(() => agir({ action: "soigner", parcelle: 0 }), /pousse tranquillement/);
  const echeance = lire().parcelles[0]!.mure_le!;
  assert.equal(echeance, apresArrosage.heure_serveur + DUREE_POUSSE_MS);
  horloge = echeance - 1;
  assert.equal(lire().parcelles[0]!.etape, 1);
  assert.throws(() => agir({ action: "recolter", parcelle: 0 }), /parcelle/);
  assert.throws(() => agir({ action: "recolter", parcelle: 0, maintenant: echeance }));
  assert.throws(() => agir({ action: "arroser", parcelle: 0 }), /parcelle/);
  assert.equal(lire().parcelles[0]!.mure_le, echeance, "Arroser à nouveau ne réinitialise pas l'horloge");
  horloge = echeance;
  const croissanceHorsConnexion = new DatabaseSync(join(dossier, "lumo.db"));
  try {
    assert.equal(lireMonde(croissanceHorsConnexion, enfant.id, horloge).parcelles[0]!.etape, 2);
  } finally {
    croissanceHorsConnexion.close();
  }
  agir({ action: "soigner", parcelle: 0 });
  const recolte = commande({ action: "recolter", parcelle: 0 });
  executer(db, enfant.id, recolte);
  executer(db, enfant.id, recolte);
  assert.equal(lire().panier.fraise, 2, "Une seule récolte malgré un retry");
  assert.deepEqual(lireMonde(db, autre.id).parcelles, Array(NOMBRE_PARCELLES).fill(null));
  assert.equal(lireMonde(db, autre.id).panier.fraise, 0);
  agir({ action: "cuisiner", recette: "coupe" });
  assert.equal(lire().panier.fraise, 0, "Ingrédients réservés une fois");
  assert.throws(() => agir({ action: "cuisiner", recette: "coupe" }), /recette commencée/);
  assert.throws(() => agir({ action: "dresser", decoration: "fleurs" }), /Mélange/);
  const deuxiemeConnexion = new DatabaseSync(join(dossier, "lumo.db"));
  try {
    assert.deepEqual(lireMonde(deuxiemeConnexion, enfant.id).preparation, { recette: "coupe", etape: 0 });
  } finally {
    deuxiemeConnexion.close();
  }
  agir({ action: "melanger" });
  const composition = [
    { forme: "etoiles", x: 40, y: 35 },
    { forme: "coeur", x: 72, y: 60 },
  ];
  const avantDecor = lire();
  assert.throws(() =>
    agir({ action: "dresser", decoration: "etoiles", motifs: [{ forme: "coeur", x: -1, y: 50 }] }),
  );
  assert.throws(() =>
    agir({ action: "dresser", decoration: "etoiles", motifs: Array(13).fill(composition[0]) }),
  );
  assert.throws(() =>
    agir({ action: "dresser", decoration: "etoiles", motifs: [{ ...composition[0], html: "<script>" }] }),
  );
  assert.deepEqual(lire(), avantDecor, "Un décor invalide ne consomme pas la préparation");
  const dresser = commande({ action: "dresser", decoration: "etoiles", motifs: composition });
  executer(db, enfant.id, dresser);
  executer(db, enfant.id, dresser);
  assert.equal(lire().creations[0].nombre, 1);
  assert.equal(lire().preparation, null);
  const apresReouverture = new DatabaseSync(join(dossier, "lumo.db"));
  try {
    assert.deepEqual(
      lireMonde(apresReouverture, enfant.id).creations[0].motifs,
      composition,
      "Le dessin du dessert survit à la réouverture",
    );
  } finally {
    apresReouverture.close();
  }
  // Les anciennes créations, sans composition libre, restent lisibles.
  for (const action of [
    { action: "planter", parcelle: 0, culture: "fraise" },
    { action: "arroser", parcelle: 0 },
    { action: "soigner", parcelle: 0 },
    { action: "recolter", parcelle: 0 },
    { action: "cuisiner", recette: "coupe" },
    { action: "melanger" },
    { action: "dresser", decoration: "fleurs" },
  ]) {
    if (action.action === "soigner") horloge += DUREE_POUSSE_MS;
    agir(action);
  }
  assert.equal(lire().creations.length, 2);
  assert.equal(lire().creations[1].motifs, undefined);

  // Deux essais accompagnés donnent le même cadeau qu'une réussite immédiate.
  const [quete] = l.creerQuetes(enfant, [
    {
      titre: "Mission jardin",
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
  assert.equal(db.prepare("SELECT statut FROM quetes WHERE id = ?").get(quete.id)!.statut, "en_cours");
  db.exec("DROP TRIGGER panne_cadeau");
  l.terminerQuete(enfant, quete.id);
  l.terminerQuete(enfant, quete.id);
  assert.equal(lire().cadeaux_disponibles, 1);
  agir({ action: "objectif", cadeau: "tomate" });
  const cadeau = commande({ action: "debloquer", cadeau: "tomate" });
  executer(db, enfant.id, cadeau);
  executer(db, enfant.id, cadeau);
  assert.equal(lire().cadeaux_disponibles, 0);
  assert.deepEqual(lire().objets, ["tomate"]);
  assert.throws(() => agir({ action: "debloquer", cadeau: "tomate" }), /déjà/);
  agir({ action: "planter", parcelle: 1, culture: "tomate" });
  db.prepare("DELETE FROM reponses WHERE question_id = ?").run(question.id);
  db.prepare("DELETE FROM questions WHERE quete_id = ?").run(quete.id);
  db.prepare("DELETE FROM quetes WHERE id = ?").run(quete.id);
  assert.deepEqual(lire().objets, ["tomate"], "Supprimer une quête ne retire aucun cadeau");
  assert.equal(lire().cadeaux_disponibles, 0);
  const [nouvelleQuete] = l.creerQuetes(enfant, [
    {
      titre: "Après archivage",
      matiere: "Maths",
      questions: [{ type: "texte", consigne: "4 + 2 = ?", bonne_reponse: "6" }],
    },
  ]);
  assert.equal(nouvelleQuete.id, quete.id, "SQLite peut réutiliser le dernier numéro supprimé");
  const nouvelleQuestion = l.questionsQuete(enfant, nouvelleQuete.id)!.questions[0];
  l.enregistrerReponse(enfant, nouvelleQuestion.id, "6", randomUUID());
  l.terminerQuete(enfant, nouvelleQuete.id);
  assert.equal(lire().cadeaux_disponibles, 1, "Chaque mission possède une identité de récompense distincte");
  agir({ action: "debloquer", cadeau: "fontaine" });
  agir({ action: "decorer", objet: "fontaine", actif: false });
  assert.deepEqual(lire().decors, []);
  agir({ action: "decorer", objet: "fontaine", actif: true });
  assert.deepEqual(lire().decors, ["fontaine"]);
  agir({ action: "planter", parcelle: 11, culture: "carotte" });
  assert.equal(lire().parcelles[11]!.culture, "carotte", "Le dernier emplacement est utilisable");
  // Anciennes sauvegardes : agrandissement sans déplacer ni perdre les cultures ou le panier.
  const ancien = {
    ...lireMonde(db, autre.id),
    parcelles: [
      { culture: "carotte", etape: 0 },
      { culture: "fraise", etape: 1 },
      { culture: "carotte", etape: 2 },
    ],
    panier: { fraise: 4, carotte: 2, tomate: 0, citrouille: 0 },
  };
  db.prepare("UPDATE monde_etats SET donnees = ? WHERE enfant_id = ?").run(JSON.stringify(ancien), autre.id);
  const migre = lireMonde(db, autre.id, horloge);
  assert.equal(migre.parcelles.length, 12);
  assert.deepEqual(migre.parcelles.slice(0, 3), [
    { culture: "carotte", etape: 0 },
    { culture: "fraise", etape: 2 },
    { culture: "carotte", etape: 2 },
  ]);
  assert.deepEqual(migre.panier, ancien.panier);
  assert.equal(
    lireMonde(db, autre.id, horloge + 30 * 24 * 3600000).parcelles[1]!.etape,
    2,
    "Une absence prolongée ne fait rien perdre",
  );

  const ancienPanier = lire().panier;
  const anciennesParcelles = lire().parcelles;
  assert.throws(
    () => agir({ action: "avatar", avatar: { couleur: "bleu", badge: "badge_fusee" } }),
    /collection/,
  );
  assert.throws(() => agir({ action: "avatar", avatar: { couleur: "inconnue", badge: "aucun" } }));
  agir({ action: "avatar", avatar: { couleur: "bleu", badge: "aucun" } });
  db.prepare("INSERT INTO monde_attributions (enfant_id,source,quantite) VALUES (?, 'test-avatar', 1)").run(
    enfant.id,
  );
  const acheterBadge = commande({ action: "debloquer", cadeau: "badge_fusee" });
  executer(db, enfant.id, acheterBadge);
  executer(db, enfant.id, acheterBadge);
  assert.equal(lire().cadeaux_disponibles, 0, "L’écusson est payé une seule fois");
  agir({ action: "avatar", avatar: { couleur: "bleu", badge: "badge_fusee" } });
  const profilRelu = new DatabaseSync(join(dossier, "lumo.db"));
  try {
    assert.deepEqual(lireMonde(profilRelu, enfant.id, horloge).avatar, {
      couleur: "bleu",
      badge: "badge_fusee",
    });
  } finally {
    profilRelu.close();
  }
  assert.deepEqual(lireMonde(db, autre.id, horloge).avatar, { couleur: "violet", badge: "aucun" });
  assert.deepEqual(lire().panier, ancienPanier);
  assert.deepEqual(lire().parcelles, anciennesParcelles);
  assert.equal(lire().progres.missions_terminees, 2);
  assert.equal(
    lire().progres.questions_essayees,
    1,
    "Le carnet compte les questions conservées, pas les tentatives",
  );
  assert.equal(lireMonde(db, autre.id, horloge).progres.questions_essayees, 0);

  const historique = new DatabaseSync(":memory:");
  try {
    historique.exec(
      "CREATE TABLE enfants (id INTEGER PRIMARY KEY, prenom TEXT NOT NULL, code TEXT NOT NULL UNIQUE, univers TEXT NOT NULL DEFAULT 'espace', quetes_finies INTEGER NOT NULL DEFAULT 0, soirs INTEGER NOT NULL DEFAULT 0, dernier_jour TEXT); INSERT INTO enfants (id, prenom, code, quetes_finies) VALUES (1, 'Historique', 'OLD001', 8)",
    );
    migrer(historique);
    migrer(historique);
    assert.equal(lireMonde(historique, 1).cadeaux_disponibles, 8);
    assert.equal(lireMonde(historique, 1).souvenirs, 8);
    assert.equal(historique.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    historique.close();
  }
  console.log(
    "OK monde : cycle complet, stocks, isolation, reprise, idempotence, conflits, cadeaux atomiques et migration historique.",
  );
} finally {
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
