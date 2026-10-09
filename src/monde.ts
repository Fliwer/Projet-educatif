import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { ErreurMetier } from "./erreurs.ts";

export const DUREE_POUSSE_MS = 8 * 60 * 1000;
export const NOMBRE_PARCELLES = 12;

// Prix, recettes et accès ont une seule source, transmise à l'interface.
export const CULTURES = [
  { id: "fraise", nom: "Fraises", singulier: "fraise", couleur: "#d96062" },
  { id: "carotte", nom: "Carottes", singulier: "carotte", couleur: "#db9452" },
  { id: "tomate", nom: "Tomates", singulier: "tomate", couleur: "#cf6451" },
  { id: "citrouille", nom: "Citrouilles", singulier: "citrouille", couleur: "#d89a44" },
] as const;
export const RECETTES = [
  {
    id: "coupe",
    nom: "Coupe de fraises",
    culture: "fraise",
    quantite: 2,
    geste: "Mélanger délicatement",
    detail: "Des fraises et un nuage de crème.",
  },
  {
    id: "gateau",
    nom: "Gâteau aux carottes",
    culture: "carotte",
    quantite: 2,
    geste: "Mélanger la pâte",
    detail: "Un petit gâteau tout moelleux.",
  },
  {
    id: "tartine",
    nom: "Tartine du jardin",
    culture: "tomate",
    quantite: 2,
    geste: "Assembler la tartine",
    detail: "Des tomates sur un pain croustillant.",
  },
  {
    id: "soupe",
    nom: "Velouté de citrouille",
    culture: "citrouille",
    quantite: 2,
    geste: "Mélanger le velouté",
    detail: "Un bol aux couleurs de l'automne.",
  },
] as const;
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
const culture = z.enum(["fraise", "carotte", "tomate", "citrouille"]);
const recette = z.enum(["coupe", "gateau", "tartine", "soupe"]);
const cadeau = z.enum([
  "tomate",
  "citrouille",
  "guirlande",
  "fontaine",
  "badge_fusee",
  "badge_livre",
  "badge_cristal",
]);
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
const parcelle = z
  .number()
  .int()
  .min(0)
  .max(NOMBRE_PARCELLES - 1);
const commun = { version: z.number().int().nonnegative().safe(), requete_id: z.string().uuid() };
export const schemaCommandeMonde = z.discriminatedUnion("action", [
  z.object({ ...commun, action: z.literal("avatar"), avatar }).strict(),
  z.object({ ...commun, action: z.literal("planter"), parcelle, culture }).strict(),
  z.object({ ...commun, action: z.literal("arroser"), parcelle }).strict(),
  z.object({ ...commun, action: z.literal("soigner"), parcelle }).strict(),
  z.object({ ...commun, action: z.literal("recolter"), parcelle }).strict(),
  z.object({ ...commun, action: z.literal("objectif"), cadeau }).strict(),
  z.object({ ...commun, action: z.literal("debloquer"), cadeau }).strict(),
  z
    .object({
      ...commun,
      action: z.literal("decorer"),
      objet: z.enum(["guirlande", "fontaine"]),
      actif: z.boolean(),
    })
    .strict(),
  z.object({ ...commun, action: z.literal("cuisiner"), recette }).strict(),
  z.object({ ...commun, action: z.literal("melanger") }).strict(),
  z.object({ ...commun, action: z.literal("dresser"), decoration, motifs: motifs.optional() }).strict(),
  z.object({ ...commun, action: z.literal("ambiance"), valeur: z.enum(["matin", "soir"]) }).strict(),
]);
const schemaEtat = z.object({
  avatar: avatar.default({ couleur: "violet", badge: "aucun" }),
  parcelles: z
    .array(
      z
        .object({
          culture,
          etape: z.number().int().min(0).max(2),
          arrose_le: z.number().int().nonnegative().safe().optional(),
          mure_le: z.number().int().nonnegative().safe().optional(),
        })
        .nullable(),
    )
    .min(3)
    .max(NOMBRE_PARCELLES),
  panier: z.object({
    fraise: z.number().int().min(0).max(99),
    carotte: z.number().int().min(0).max(99),
    tomate: z.number().int().min(0).max(99),
    citrouille: z.number().int().min(0).max(99),
  }),
  objectif: cadeau.nullable(),
  decors: z.array(z.enum(["guirlande", "fontaine"])).max(2),
  ambiance: z.enum(["matin", "soir"]),
  preparation: z.object({ recette, etape: z.number().int().min(0).max(1) }).nullable(),
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
    .max(12),
});
type Etat = z.infer<typeof schemaEtat>;
const neuf = (): Etat => ({
  avatar: { couleur: "violet", badge: "aucun" },
  parcelles: Array.from({ length: NOMBRE_PARCELLES }, () => null),
  panier: { fraise: 0, carotte: 0, tomate: 0, citrouille: 0 },
  objectif: "tomate",
  decors: [],
  ambiance: "matin",
  preparation: null,
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
  // Évolution additive : les trois anciennes parcelles gardent leur contenu et leur numéro.
  while (etat.parcelles.length < NOMBRE_PARCELLES) etat.parcelles.push(null);
  return { version: Number(ligne.version), etat };
}
function actualiserCroissance(etat: Etat, maintenant: number) {
  for (const p of etat.parcelles) {
    // Une pousse historique sans échéance était déjà à un clic de la récolte : aucun délai ajouté.
    if (p?.etape === 1 && (p.mure_le === undefined || maintenant >= p.mure_le)) p.etape = 2;
  }
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
function vue(db: DatabaseSync, enfantId: number, maintenant: number) {
  const { version, etat } = charger(db, enfantId);
  actualiserCroissance(etat, maintenant);
  const objets = inventaire(db, enfantId);
  const heritage = Number(
    db
      .prepare("SELECT quantite FROM monde_attributions WHERE enfant_id = ? AND source = 'heritage'")
      .get(enfantId)?.quantite ?? 0,
  );
  const prenom = String(db.prepare("SELECT prenom FROM enfants WHERE id = ?").get(enfantId)!.prenom);
  return {
    version,
    heure_serveur: maintenant,
    duree_pousse_ms: DUREE_POUSSE_MS,
    ...etat,
    prenom,
    objets,
    cadeaux_disponibles: solde(db, enfantId, objets),
    souvenirs: Math.min(12, heritage),
    progres: {
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
    catalogue: { cultures: CULTURES, recettes: RECETTES, cadeaux: CADEAUX },
  };
}
export function lireMonde(db: DatabaseSync, enfantId: number, maintenant = Date.now()) {
  return atomique(db, () => vue(db, enfantId, maintenant));
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
export function agirMonde(db: DatabaseSync, enfantId: number, entree: unknown, maintenant = Date.now()) {
  const commande = schemaCommandeMonde.parse(entree);
  return atomique(db, () => {
    const { etat, version } = charger(db, enfantId);
    actualiserCroissance(etat, maintenant);
    const signature = JSON.stringify(commande);
    const ancienne = db
      .prepare("SELECT signature, message FROM monde_commandes WHERE enfant_id = ? AND requete_id = ?")
      .get(enfantId, commande.requete_id);
    if (ancienne) {
      if (ancienne.signature !== signature) throw new ErreurMetier("Cette action a déjà été utilisée.", 409);
      return { monde: vue(db, enfantId, maintenant), message: String(ancienne.message) };
    }
    if (version !== commande.version)
      throw new ErreurMetier(
        "Ton monde a changé sur un autre écran. Il a été actualisé, tu peux reprendre.",
        409,
      );
    const objets = inventaire(db, enfantId);
    const possedeCulture = (id: string) => id === "fraise" || id === "carotte" || objets.includes(id);
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
      case "planter":
        exiger(!etat.parcelles[commande.parcelle], "Cette parcelle est déjà plantée.");
        exiger(possedeCulture(commande.culture), "Choisis d'abord ces graines dans tes cadeaux.");
        etat.parcelles[commande.parcelle] = { culture: commande.culture, etape: 0 };
        message = "C'est planté ! Un peu d'eau pour tes petites graines ?";
        break;
      case "arroser":
      case "soigner":
      case "recolter": {
        const p = etat.parcelles[commande.parcelle];
        if (commande.action === "soigner") {
          exiger(p?.etape === 2, "Ta plante pousse tranquillement. Elle sera prête un peu plus tard.");
          message = "Ta récolte est prête !";
          break;
        }
        const attendue = { arroser: 0, soigner: 1, recolter: 2 }[commande.action];
        exiger(p && p.etape === attendue, "Cette parcelle a changé. Regarde sa prochaine étape.");
        if (commande.action === "recolter") {
          exiger(etat.panier[p!.culture] <= 97, "Ton panier est bien rempli ! Fais un tour en cuisine.");
          etat.panier[p!.culture] += 2;
          etat.parcelles[commande.parcelle] = null;
          message = "Deux belles récoltes dans ton panier. Direction la cuisine ?";
        } else {
          p!.etape++;
          p!.arrose_le = maintenant;
          p!.mure_le = maintenant + DUREE_POUSSE_MS;
          message = "C'est arrosé ! Ta plante grandit même quand tu quittes le jardin.";
        }
        break;
      }
      case "objectif":
        exiger(!objets.includes(commande.cadeau), "Ce cadeau est déjà à toi.");
        etat.objectif = commande.cadeau;
        message = "Ton prochain cadeau est choisi. Tu peux changer d'idée quand tu veux.";
        break;
      case "debloquer": {
        const item = CADEAUX.find((c) => c.id === commande.cadeau)!;
        exiger(!objets.includes(item.id), "Ce cadeau est déjà à toi.");
        exiger(
          solde(db, enfantId, objets) >= item.prix,
          "Une mission terminée te permettra de choisir ce cadeau.",
        );
        db.prepare("INSERT INTO monde_deblocages (enfant_id, objet) VALUES (?, ?)").run(enfantId, item.id);
        if (item.id === "fontaine" || item.id === "guirlande") etat.decors.push(item.id);
        if (etat.objectif === item.id) etat.objectif = null;
        message = item.nom + " : ce cadeau est à toi !";
        break;
      }
      case "decorer":
        exiger(objets.includes(commande.objet), "Ce décor n'est pas encore dans ta collection.");
        etat.decors = etat.decors.filter((d) => d !== commande.objet);
        if (commande.actif) etat.decors.push(commande.objet);
        message = "Ton jardin prend tes couleurs.";
        break;
      case "cuisiner": {
        const r = RECETTES.find((r) => r.id === commande.recette)!;
        exiger(!etat.preparation, "Termine d'abord la recette commencée.");
        exiger(
          possedeCulture(r.culture) && etat.panier[r.culture] >= r.quantite,
          "Récolte d'abord les ingrédients au potager.",
        );
        etat.panier[r.culture] -= r.quantite;
        etat.preparation = { recette: r.id, etape: 0 };
        message = "Les ingrédients sont prêts. À toi de jouer !";
        break;
      }
      case "melanger":
        exiger(etat.preparation?.etape === 0, "Ta préparation a changé.");
        etat.preparation!.etape = 1;
        message = "Bien mélangé ! Choisis la touche finale.";
        break;
      case "dresser": {
        exiger(etat.preparation?.etape === 1, "Mélange ta préparation avant de la décorer.");
        const id = etat.preparation!.recette;
        const existante = etat.creations.find(
          (c) => c.recette === id && c.decoration === commande.decoration,
        );
        if (existante) {
          existante.nombre++;
          // Le carnet conserve la dernière composition de chaque famille de recette.
          existante.motifs = commande.motifs;
        } else
          etat.creations.push({
            recette: id,
            decoration: commande.decoration,
            motifs: commande.motifs,
            nombre: 1,
            cree: new Date().toISOString(),
          });
        etat.preparation = null;
        message = "Ta création est dans ton carnet. Tu peux en être fier !";
        break;
      }
      case "ambiance":
        etat.ambiance = commande.valeur;
        message = "Une nouvelle lumière pour ton jardin.";
        break;
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
    return { monde: vue(db, enfantId, maintenant), message };
  });
}
