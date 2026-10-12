import { lireParcours } from "./parcours.ts";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { ErreurMetier } from "./erreurs.ts";

// Métadonnées en lecture seule pour afficher les anciennes créations.
const RECETTES = [
  { id: "coupe", nom: "Coupe de fraises" },
  { id: "gateau", nom: "Gâteau aux carottes" },
  { id: "tartine", nom: "Tartine du jardin" },
  { id: "soupe", nom: "Velouté de citrouille" },
];
export const CADEAUX = [
  {
    id: "badge_fusee",
    nom: "La fusée",
    detail: "Un écusson pour ton avatar.",
    categorie: "Mon espace",
    prix: 1,
  },
  {
    id: "badge_livre",
    nom: "Le livre magique",
    detail: "Un écusson pour les idées curieuses.",
    categorie: "Mon espace",
    prix: 1,
  },
  {
    id: "badge_cristal",
    nom: "Le cristal",
    detail: "Un écusson aux couleurs de tes aventures.",
    categorie: "Mon espace",
    prix: 1,
  },
  {
    id: "tomate",
    nom: "Les graines de tomate",
    detail: "À planter, puis à cuisiner sur une tartine.",
    categorie: "Une nouvelle saveur",
    prix: 1,
  },
  {
    id: "citrouille",
    nom: "Les graines de citrouille",
    detail: "De jolies citrouilles et une recette de velouté.",
    categorie: "Une nouvelle saveur",
    prix: 1,
  },
  {
    id: "guirlande",
    nom: "La guirlande lumineuse",
    detail: "De petites lumières pour ton jardin.",
    categorie: "Un jardin à ton image",
    prix: 1,
  },
  {
    id: "fontaine",
    nom: "La fontaine aux oiseaux",
    detail: "Un coin de fraîcheur à installer au jardin.",
    categorie: "Un jardin à ton image",
    prix: 1,
  },
] as const;
const recette = z.enum(["coupe", "gateau", "tartine", "soupe"]);
const badge = z.enum(["badge_fusee", "badge_livre", "badge_cristal"]);
const avatar = z
  .object({
    couleur: z.enum(["violet", "bleu", "rose", "vert"]),
    badge: z.enum(["aucun", "badge_fusee", "badge_livre", "badge_cristal"]),
  })
  .strict();
const decoration = z.enum(["fleurs", "etoiles", "coeur"]);
// Coordonnées dans le dessin 120 × 120, jamais du HTML fourni par le client.
const motifs = z
  .array(
    z
      .object({
        forme: decoration,
        x: z.number().int().min(20).max(100),
        y: z.number().int().min(20).max(90),
      })
      .strict(),
  )
  .max(12);
const commun = { version: z.number().int().nonnegative().safe(), requete_id: z.string().uuid() };
export const schemaCommandeMonde = z.discriminatedUnion("action", [
  z.object({ ...commun, action: z.literal("avatar"), avatar }).strict(),
  z.object({ ...commun, action: z.literal("debloquer"), cadeau: badge }).strict(),
]);
const schemaEtat = z
  .object({
    avatar: avatar.default({ couleur: "violet", badge: "aucun" }),
    creations: z
      .array(
        z.object({
          recette,
          decoration,
          motifs: motifs.optional(),
          nombre: z.number().int().positive(),
          cree: z.string(),
        }),
      )
      .max(12)
      .default([]),
  })
  .passthrough(); // Conserver les anciens champs stockés, sans les interpréter ni les exposer.
type Etat = z.infer<typeof schemaEtat>;
const neuf = (): Etat => ({
  avatar: { couleur: "violet", badge: "aucun" },
  creations: [],
});

function atomique<T>(db: DatabaseSync, fn: () => T): T {
  const imbrique = db.isTransaction;
  if (!imbrique) db.exec("BEGIN IMMEDIATE");
  try {
    const resultat = fn();
    if (!imbrique) db.exec("COMMIT");
    return resultat;
  } catch (erreur) {
    if (!imbrique) db.exec("ROLLBACK");
    throw erreur;
  }
}
function charger(db: DatabaseSync, enfantId: number) {
  if (!db.prepare("SELECT id FROM enfants WHERE id = ?").get(enfantId))
    throw new ErreurMetier("Profil introuvable.", 404);
  db.prepare("INSERT OR IGNORE INTO monde_etats (enfant_id, donnees) VALUES (?, ?)").run(
    enfantId,
    JSON.stringify(neuf()),
  );
  const ligne = db.prepare("SELECT version, donnees FROM monde_etats WHERE enfant_id = ?").get(enfantId)!;
  const etat = schemaEtat.parse(JSON.parse(String(ligne.donnees)));
  return { version: Number(ligne.version), etat };
}
function inventaire(db: DatabaseSync, enfantId: number) {
  return db
    .prepare("SELECT objet FROM monde_deblocages WHERE enfant_id = ? ORDER BY objet")
    .all(enfantId)
    .map((r) => String(r.objet));
}
function solde(db: DatabaseSync, enfantId: number, objets: string[]) {
  const total = Number(
    db
      .prepare("SELECT COALESCE(SUM(quantite), 0) AS n FROM monde_attributions WHERE enfant_id = ?")
      .get(enfantId)!.n,
  );
  return total - objets.reduce((n, id) => n + (CADEAUX.find((c) => c.id === id)?.prix ?? 0), 0);
}
function vue(db: DatabaseSync, enfantId: number) {
  const { version, etat } = charger(db, enfantId);
  const objets = inventaire(db, enfantId);
  const heritage = Number(
    db
      .prepare("SELECT quantite FROM monde_attributions WHERE enfant_id = ? AND source = 'heritage'")
      .get(enfantId)?.quantite ?? 0,
  );
  const prenom = String(db.prepare("SELECT prenom FROM enfants WHERE id = ?").get(enfantId)!.prenom);
  return {
    version,
    avatar: etat.avatar,
    creations: etat.creations,
    prenom,
    objets,
    cadeaux_disponibles: solde(db, enfantId, objets),
    souvenirs: Math.min(12, heritage),
    progres: {
      parcours: lireParcours(db, enfantId),
      missions_terminees: Number(
        db.prepare("SELECT quetes_finies FROM enfants WHERE id = ?").get(enfantId)!.quetes_finies,
      ),
      questions_essayees: Number(
        db
          .prepare(
            "SELECT COUNT(DISTINCT r.question_id) AS n FROM reponses r JOIN questions qu ON qu.id=r.question_id JOIN quetes q ON q.id=qu.quete_id WHERE q.enfant_id=?",
          )
          .get(enfantId)!.n,
      ),
      missions: db
        .prepare(
          "SELECT q.id, q.titre, q.matiere, q.statut, (SELECT COUNT(*) FROM questions qu WHERE qu.quete_id=q.id) AS total, (SELECT COUNT(DISTINCT r.question_id) FROM reponses r JOIN questions qu ON qu.id=r.question_id WHERE qu.quete_id=q.id) AS essayees FROM quetes q WHERE q.enfant_id=? ORDER BY q.id DESC LIMIT 20",
        )
        .all(enfantId),
    },
    catalogue: { recettes: RECETTES, cadeaux: CADEAUX },
  };
}
export function lireMonde(db: DatabaseSync, enfantId: number) {
  return atomique(db, () => vue(db, enfantId));
}

/** Appelé dans la transaction de fin de quête. La source survit à sa suppression. */
export function attribuerCadeau(db: DatabaseSync, enfantId: number, queteId: number) {
  const quete = db
    .prepare("SELECT recompense_cle FROM quetes WHERE id = ? AND enfant_id = ? AND statut = 'terminee'")
    .get(queteId, enfantId);
  if (!quete) throw new ErreurMetier("Cette mission n'est pas terminée.", 409);
  if (!quete.recompense_cle) throw new Error("Mission sans identité de récompense");
  const insertion = db
    .prepare("INSERT OR IGNORE INTO monde_attributions (enfant_id, source, quantite) VALUES (?, ?, 1)")
    .run(enfantId, "quete:" + String(quete.recompense_cle));
  if (insertion.changes)
    db.prepare("UPDATE monde_etats SET version = version + 1 WHERE enfant_id = ?").run(enfantId);
}

/** Le client propose une action, jamais un stock, un prix ou une récompense. */
export function agirMonde(db: DatabaseSync, enfantId: number, entree: unknown) {
  const commande = schemaCommandeMonde.parse(entree);
  return atomique(db, () => {
    const { etat, version } = charger(db, enfantId);
    const signature = JSON.stringify(commande);
    const ancienne = db
      .prepare("SELECT signature, message FROM monde_commandes WHERE enfant_id = ? AND requete_id = ?")
      .get(enfantId, commande.requete_id);
    if (ancienne) {
      if (ancienne.signature !== signature) throw new ErreurMetier("Cette action a déjà été utilisée.", 409);
      return { monde: vue(db, enfantId), message: String(ancienne.message) };
    }
    if (version !== commande.version)
      throw new ErreurMetier(
        "Ton monde a changé sur un autre écran. Il a été actualisé, tu peux reprendre.",
        409,
      );
    const objets = inventaire(db, enfantId);
    const exiger = (condition: unknown, texte: string) => {
      if (!condition) throw new ErreurMetier(texte, 409);
    };
    let message = "";
    switch (commande.action) {
      case "avatar":
        exiger(
          commande.avatar.badge === "aucun" || objets.includes(commande.avatar.badge),
          "Cet écusson n’est pas encore dans ta collection.",
        );
        etat.avatar = commande.avatar;
        message = "Ton avatar est enregistré !";
        break;
      case "debloquer": {
        const item = CADEAUX.find((c) => c.id === commande.cadeau)!;
        exiger(!objets.includes(item.id), "Ce cadeau est déjà à toi.");
        exiger(
          solde(db, enfantId, objets) >= item.prix,
          "Une mission terminée te permettra de choisir ce cadeau.",
        );
        db.prepare("INSERT INTO monde_deblocages (enfant_id, objet) VALUES (?, ?)").run(enfantId, item.id);
        message = item.nom + " : ce cadeau est à toi !";
        break;
      }
    }
    schemaEtat.parse(etat);
    db.prepare("UPDATE monde_etats SET donnees = ?, version = version + 1 WHERE enfant_id = ?").run(
      JSON.stringify(etat),
      enfantId,
    );
    db.prepare(
      "INSERT INTO monde_commandes (enfant_id, requete_id, signature, revision, message) VALUES (?, ?, ?, ?, ?)",
    ).run(enfantId, commande.requete_id, signature, version + 1, message);
    // Les anciens retries sont ensuite refusés par leur version ; historique borné par enfant.
    db.prepare("DELETE FROM monde_commandes WHERE enfant_id = ? AND revision < ?").run(
      enfantId,
      version - 100,
    );
    return { monde: vue(db, enfantId), message };
  });
}
