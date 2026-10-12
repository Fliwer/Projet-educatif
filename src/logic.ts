// Règles de Lumo, utilisées à la fois par le connecteur MCP (parent) et par l'API de l'app enfant.
import { db, transaction } from "./db.ts";
import { randomInt } from "node:crypto";
import { FUSEAU } from "./config.ts";
import { ErreurMetier } from "./erreurs.ts";
import { schemaQuetes } from "./formats.ts";
import { type TypeQuestion } from "./types-jeux.ts";
import { lireParcours } from "./parcours.ts";
import { attribuerCadeau } from "./monde.ts";
export { TYPES_QUESTION } from "./types-jeux.ts";
export type { TypeQuestion } from "./types-jeux.ts";

export const QUETES_PAR_NIVEAU = 3;
export const UNIVERS = ["espace", "nature"] as const;

export type Enfant = {
  id: number;
  parent_id: number;
  prenom: string;
  code: string;
  univers: string;
  quetes_finies: number;
  soirs: number;
  dernier_jour: string | null;
};

export type QuestionEntree = {
  type: TypeQuestion;
  consigne: string;
  choix?: string[]; // choix : 2 à 4 réponses proposées
  elements?: string[]; // ordre : les morceaux dans le BON ordre (l'app les mélange)
  paires?: [string, string][]; // associer : paires à relier (gauche, droite)
  bonne_reponse?: string; // choix, texte, vrai_faux (« Vrai » ou « Faux »), dictee (le mot à écrire)
};

const SEPARATEUR = " ‖ "; // sépare les morceaux et les paires dans une réponse enregistrée

export type QueteEntree = {
  notion?: string;
  titre: string;
  matiere: string;
  questions: QuestionEntree[];
};

/** Date locale au format AAAA-MM-JJ. */
/** Date et heure locales au format AAAA-MM-JJ HH:MM:SS (les dates restent cohérentes le soir). */
export function maintenant(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: FUSEAU });
}

export function aujourdhui(decalageJours = 0): string {
  const jour = new Date().toLocaleDateString("sv-SE", { timeZone: FUSEAU });
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + decalageJours);
  return d.toISOString().slice(0, 10);
}

/** Niveau calculé à partir des quêtes terminées : il ne redescend jamais. */
export function niveau(e: Enfant) {
  return {
    niveau: 1 + Math.floor(e.quetes_finies / QUETES_PAR_NIVEAU),
    vers_suivant: e.quetes_finies % QUETES_PAR_NIVEAU,
    quetes_par_niveau: QUETES_PAR_NIVEAU,
  };
}

/** Comparaison tolérante : majuscules, accents, espaces et virgule décimale ignorés. */
export function normaliser(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
}

/** Pour la dictée : majuscules et espaces ignorés, mais les accents comptent. */
export function normaliserDictee(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function melanger<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Mélange, en évitant de rendre la liste déjà dans le bon ordre. */
function melangerVraiment<T>(liste: T[]): T[] {
  if (liste.length < 2) return [...liste];
  for (let essai = 0; essai < 10; essai++) {
    const m = melanger(liste);
    if (m.some((x, i) => x !== liste[i])) return m;
  }
  return [...liste].reverse();
}

/** Réponse attendue enregistrée en base, selon le type. */
function bonneReponse(q: QuestionEntree): string {
  if (q.type === "ordre") return (q.elements ?? []).join(SEPARATEUR);
  if (q.type === "associer")
    return (q.paires ?? [])
      .map(([a, b]) => `${a} → ${b}`)
      .sort()
      .join(SEPARATEUR);
  return q.bonne_reponse ?? "";
}

function genererCode(): string {
  const lettres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += lettres[randomInt(lettres.length)];
  return code;
}

export function listerEnfants(parentId = 1): Enfant[] {
  return db.prepare("SELECT * FROM enfants WHERE parent_id = ? ORDER BY prenom").all(parentId) as Enfant[];
}

/** Authentification enfant : un prénom n'est jamais un code secret. */
export function enfantParCode(code: string): Enfant | undefined {
  if (!/^[A-Z0-9]{6}$/.test(code)) return undefined;
  return db.prepare("SELECT * FROM enfants WHERE code = ?").get(code) as Enfant | undefined;
}

/** Trouve un enfant par son prénom ou son code. */
export function trouverEnfant(nomOuCode: string, parentId?: number): Enfant | undefined {
  const cle = nomOuCode.trim();
  if (parentId !== undefined) {
    return db
      .prepare("SELECT * FROM enfants WHERE parent_id = ? AND (code = ? OR lower(prenom) = lower(?))")
      .get(parentId, cle.toUpperCase(), cle) as Enfant | undefined;
  }
  return (db
    .prepare("SELECT * FROM enfants WHERE code = ? OR lower(prenom) = lower(?)")
    .get(cle.toUpperCase(), cle) ?? undefined) as Enfant | undefined;
}

export function ajouterEnfant(prenom: string, univers: string, parentId = 1): Enfant {
  if (!prenom.trim() || prenom.trim().length > 30 || !(UNIVERS as readonly string[]).includes(univers)) {
    throw new ErreurMetier("Prénom ou univers invalide.");
  }
  return transaction(() => {
    let code = genererCode();
    while (db.prepare("SELECT 1 FROM enfants WHERE code = ?").get(code)) code = genererCode();
    db.prepare("INSERT INTO enfants (prenom, code, univers, parent_id) VALUES (?, ?, ?, ?)").run(
      prenom.trim(),
      code,
      univers,
      parentId,
    );
    return enfantParCode(code)!;
  });
}

/** Vérifie les quêtes envoyées par l'IA. Renvoie la liste des problèmes (vide si tout va bien). */
export function verifierQuetes(quetes: QueteEntree[]): string[] {
  const structure = schemaQuetes.safeParse(quetes);
  if (!structure.success) return structure.error.issues.map((e) => `${e.path.join(".")} : ${e.message}`);
  const erreurs: string[] = [];
  quetes.forEach((q, i) => {
    if (q.questions.length === 0) erreurs.push(`Quête ${i + 1} : aucune question.`);
    q.questions.forEach((qu, j) => {
      const ou = `Quête ${i + 1}, question ${j + 1} (${qu.type})`;
      const bonne = qu.bonne_reponse ?? "";
      switch (qu.type) {
        case "choix": {
          const choix = qu.choix ?? [];
          if (choix.length < 2 || choix.length > 4) erreurs.push(`${ou} : il faut 2 à 4 choix.`);
          if (new Set(choix.map(normaliser)).size !== choix.length)
            erreurs.push(`${ou} : les choix doivent être distincts.`);
          if (!choix.some((c) => normaliser(c) === normaliser(bonne)))
            erreurs.push(`${ou} : la bonne réponse doit faire partie des choix.`);
          break;
        }
        case "texte":
          if (!bonne) erreurs.push(`${ou} : il manque bonne_reponse.`);
          else if (normaliser(qu.consigne).includes(normaliser(bonne)))
            erreurs.push(`${ou} : la consigne ne doit pas contenir la réponse.`);
          break;
        case "vrai_faux":
          if (!["vrai", "faux"].includes(normaliser(bonne)))
            erreurs.push(`${ou} : bonne_reponse doit être « Vrai » ou « Faux ».`);
          break;
        case "ordre": {
          const el = qu.elements ?? [];
          if (el.length < 2 || el.length > 8)
            erreurs.push(`${ou} : il faut 2 à 8 morceaux dans « elements », dans le bon ordre.`);
          if (el.some((e) => !e.trim())) erreurs.push(`${ou} : un morceau est vide.`);
          if (new Set(el.map(normaliser)).size < 2)
            erreurs.push(`${ou} : il faut des morceaux distincts à ordonner.`);
          break;
        }
        case "associer": {
          const p = qu.paires ?? [];
          if (p.length < 2 || p.length > 5) erreurs.push(`${ou} : il faut 2 à 5 paires dans « paires ».`);
          const gauches = p.map(([a]) => normaliser(a));
          const droites = p.map(([, b]) => normaliser(b));
          if (new Set(gauches).size !== gauches.length || new Set(droites).size !== droites.length)
            erreurs.push(`${ou} : chaque élément doit être unique, à gauche comme à droite.`);
          break;
        }
        case "dictee":
          if (!bonne) erreurs.push(`${ou} : il manque le mot à écrire (bonne_reponse).`);
          else if (bonne.length > 40)
            erreurs.push(`${ou} : un mot ou une petite phrase (40 caractères au plus).`);
          else if (normaliserDictee(qu.consigne).includes(normaliserDictee(bonne)))
            erreurs.push(`${ou} : la consigne ne doit pas écrire le mot de la dictée.`);
          break;
      }
    });
  });
  return erreurs;
}

export function creerQuetes(enfant: Enfant, quetes: QueteEntree[]) {
  const erreurs = verifierQuetes(quetes);
  if (erreurs.length) throw new ErreurMetier(erreurs.join("\n"));
  return transaction(() => {
    const cree = maintenant();
    const ajoutQuete = db.prepare(
      "INSERT INTO quetes (enfant_id, titre, matiere, cree_le, notion, recompense_cle) VALUES (?, ?, ?, ?, ?, lower(hex(randomblob(16))))",
    );
    const ajoutQuestion = db.prepare(
      "INSERT INTO questions (quete_id, ordre, type, consigne, choix, bonne) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const creees: { id: number; titre: string; questions: number }[] = [];
    for (const q of quetes) {
      const r = ajoutQuete.run(enfant.id, q.titre, q.matiere, cree, q.notion ?? null);
      const queteId = Number(r.lastInsertRowid);
      q.questions.forEach((qu, ordre) => {
        const donnees =
          qu.type === "choix"
            ? qu.choix
            : qu.type === "vrai_faux"
              ? ["Vrai", "Faux"]
              : qu.type === "ordre"
                ? qu.elements
                : qu.type === "associer"
                  ? qu.paires
                  : null;
        ajoutQuestion.run(
          queteId,
          ordre,
          qu.type,
          qu.consigne,
          donnees ? JSON.stringify(donnees) : null,
          bonneReponse(qu),
        );
      });
      creees.push({ id: queteId, titre: q.titre, questions: q.questions.length });
    }
    return creees;
  });
}

/** Ce que voit l'enfant sur l'accueil : son niveau et ses quêtes du soir. */
export function etatEnfant(enfant: Enfant) {
  const quetes = db
    .prepare(
      `SELECT q.id, q.titre, q.matiere, q.statut,
              (SELECT id FROM quetes r WHERE r.origine_id=q.id AND r.archivee=0 AND r.statut!='terminee') AS reprise_id,
              (SELECT COUNT(*) FROM questions WHERE quete_id = q.id) AS nb_questions
         FROM quetes q
        WHERE q.enfant_id = ? AND q.archivee=0 AND q.origine_id IS NULL
        ORDER BY q.statut != 'terminee', COALESCE(q.finie_le,q.cree_le), q.id`,
    )
    .all(enfant.id);
  // Une étoile par bonne réponse : ce compteur ne fait que monter.
  const { etoiles } = db
    .prepare(
      `SELECT COUNT(DISTINCT r.question_id) AS etoiles FROM reponses r
         JOIN questions qu ON qu.id = r.question_id JOIN quetes qe ON qe.id = qu.quete_id
        WHERE qe.enfant_id = ? AND qe.origine_id IS NULL AND r.correcte = 1`,
    )
    .get(enfant.id) as { etoiles: number };
  return {
    prenom: enfant.prenom,
    univers: enfant.univers,
    soirs: enfant.soirs,
    etoiles,
    ...niveau(enfant),
    quetes,
  };
}

/** Ce que l'app enfant reçoit pour une question : jamais la réponse (sauf le mot que Milo doit dire en dictée). */
function questionPourEnfant(q: {
  id: number;
  type: string;
  consigne: string;
  choix: string | null;
  bonne: string;
}) {
  const donnees = q.choix ? JSON.parse(q.choix) : null;
  const base = { id: q.id, type: q.type, consigne: q.consigne };
  switch (q.type) {
    case "choix":
    case "vrai_faux":
      return { ...base, choix: donnees as string[] };
    case "ordre":
      return { ...base, elements: melangerVraiment(donnees as string[]) };
    case "associer": {
      const paires = donnees as [string, string][];
      return { ...base, gauche: paires.map(([a]) => a), droite: melangerVraiment(paires.map(([, b]) => b)) };
    }
    case "dictee":
      // Milo doit pouvoir dire le mot : c'est la seule réponse envoyée à la tablette (jamais affichée).
      return { ...base, a_dire: q.bonne };
    default:
      return base;
  }
}

/** Les questions d'une quête, sans les bonnes réponses. */
export function questionsQuete(enfant: Enfant, queteId: number) {
  const quete = db
    .prepare("SELECT * FROM quetes WHERE id = ? AND enfant_id = ? AND archivee=0")
    .get(queteId, enfant.id) as
    | { id: number; titre: string; matiere: string; statut: string; origine_id: number | null }
    | undefined;
  if (!quete) return undefined;
  if (quete.statut === "a_faire")
    db.prepare("UPDATE quetes SET statut = 'en_cours' WHERE id = ?").run(queteId);
  const questions = (
    db
      .prepare("SELECT id, type, consigne, choix, bonne FROM questions WHERE quete_id = ? ORDER BY ordre")
      .all(queteId) as {
      id: number;
      type: string;
      consigne: string;
      choix: string | null;
      bonne: string;
    }[]
  ).map((q) => {
    const bilan = db
      .prepare(
        "SELECT COUNT(*) AS essais, COALESCE(MAX(correcte), 0) AS reussie FROM reponses WHERE question_id = ?",
      )
      .get(q.id)!;
    return {
      ...questionPourEnfant(q),
      essais: Number(bilan.essais),
      terminee: Boolean(bilan.reussie) || Number(bilan.essais) >= 2,
      reussie: Boolean(bilan.reussie),
    };
  });
  return {
    id: quete.id,
    titre: quete.titre,
    matiere: quete.matiere,
    univers: enfant.univers,
    revision: quete.origine_id !== null,
    questions,
  };
}

export function enregistrerReponse(enfant: Enfant, questionId: number, valeur: string, requeteId?: string) {
  if (!Number.isSafeInteger(questionId) || questionId < 1 || !valeur.trim() || valeur.length > 2000)
    throw new ErreurMetier("Réponse invalide.");
  if (requeteId !== undefined && !/^[0-9a-f-]{36}$/i.test(requeteId))
    throw new ErreurMetier("Identifiant de réponse invalide.");
  return transaction(() => {
    const q = db
      .prepare(
        `SELECT qu.bonne, qu.type, qe.statut FROM questions qu JOIN quetes qe ON qe.id = qu.quete_id
      WHERE qu.id = ? AND qe.enfant_id = ? AND qe.archivee=0`,
      )
      .get(questionId, enfant.id) as { bonne: string; type: string; statut: string } | undefined;
    if (!q) return undefined;
    const precedent = requeteId
      ? db.prepare("SELECT * FROM reponses WHERE requete_id = ?").get(requeteId)
      : undefined;
    if (precedent && (precedent.question_id !== questionId || precedent.valeur !== valeur))
      throw new ErreurMetier("Cette demande a déjà été utilisée.", 409);
    const bilan = db
      .prepare(
        "SELECT COUNT(*) AS essais, COALESCE(MAX(correcte), 0) AS reussie FROM reponses WHERE question_id = ?",
      )
      .get(questionId)!;
    if (!precedent && (q.statut === "terminee" || bilan.reussie || Number(bilan.essais) >= 2))
      throw new ErreurMetier("Cette question est déjà terminée.", 409);
    const comparer = q.type === "dictee" ? normaliserDictee : normaliser;
    const trier = (s: string) => JSON.stringify(s.split(SEPARATEUR).map(normaliser).sort());
    const correcte =
      q.type === "associer" ? trier(valeur) === trier(q.bonne) : comparer(valeur) === comparer(q.bonne);
    const presque = q.type === "dictee" && !correcte && normaliser(valeur) === normaliser(q.bonne);
    if (!precedent)
      db.prepare(
        "INSERT INTO reponses (question_id, valeur, correcte, le, requete_id) VALUES (?, ?, ?, ?, ?)",
      ).run(questionId, valeur, correcte ? 1 : 0, maintenant(), requeteId ?? null);
    // Un retry reçoit le résultat de SA tentative, même après une tentative suivante.
    const essais = precedent
      ? Number(
          db
            .prepare("SELECT COUNT(*) AS n FROM reponses WHERE question_id = ? AND id <= ?")
            .get(questionId, precedent.id)!.n,
        )
      : Number(bilan.essais) + 1;
    const terminee = correcte || essais >= 2;
    const lisible =
      q.type === "ordre"
        ? q.bonne.split(SEPARATEUR).join(" ")
        : q.type === "associer"
          ? q.bonne.split(SEPARATEUR).join(", ")
          : q.bonne;
    return {
      correcte,
      presque,
      essais,
      terminee,
      etoile_gagnee: correcte,
      ...(terminee ? { bonne_reponse: lisible } : {}),
    };
  });
}

/** Le serveur vérifie les tentatives avant d'attribuer le niveau, dans une transaction. */
export function terminerQuete(enfant: Enfant, queteId: number) {
  return transaction(() => {
    const actuel = enfantParCode(enfant.code)!;
    const quete = db
      .prepare("SELECT statut, origine_id FROM quetes WHERE id = ? AND enfant_id = ? AND archivee=0")
      .get(queteId, actuel.id);
    if (!quete) return undefined;
    const avant = niveau(actuel).niveau;
    if (quete.statut !== "terminee") {
      const questions = db
        .prepare(
          `SELECT qu.id, COUNT(r.id) AS essais, COALESCE(MAX(r.correcte), 0) AS reussie
        FROM questions qu LEFT JOIN reponses r ON r.question_id = qu.id WHERE qu.quete_id = ? GROUP BY qu.id`,
        )
        .all(queteId);
      if (!questions.length || questions.some((q) => !q.reussie && Number(q.essais) < 2))
        throw new ErreurMetier("Il reste des questions à découvrir.", 409);
      const jour = aujourdhui();
      const soirs =
        actuel.dernier_jour === jour
          ? actuel.soirs
          : actuel.dernier_jour === aujourdhui(-1)
            ? actuel.soirs + 1
            : 1;
      db.prepare("UPDATE quetes SET statut = 'terminee', finie_le = ? WHERE id = ?").run(
        maintenant(),
        queteId,
      );
      if (quete.origine_id === null) {
        db.prepare(
          "UPDATE enfants SET quetes_finies = quetes_finies + 1, soirs = ?, dernier_jour = ? WHERE id = ?",
        ).run(soirs, jour, actuel.id);
        attribuerCadeau(db, actuel.id, queteId);
      }
    }
    const apres = enfantParCode(actuel.code)!;
    return {
      revision: quete.origine_id !== null,
      ...niveau(apres),
      soirs: apres.soirs,
      nouveau_niveau: niveau(apres).niveau > avant,
    };
  });
}

/** Résumé pour le parent : ce qui a été fait, réussi ou difficile sur les derniers jours. */
export function progression(enfant: Enfant, jours: number) {
  const depuis = aujourdhui(-(jours - 1));
  const quetes = db
    .prepare(
      `SELECT q.id, q.titre, q.matiere, q.statut, q.finie_le FROM quetes q
        WHERE q.enfant_id = ? AND (substr(q.cree_le, 1, 10) >= ? OR substr(q.finie_le, 1, 10) >= ? OR q.statut != 'terminee')
        ORDER BY q.id`,
    )
    .all(enfant.id, depuis, depuis) as { id: number; titre: string; matiere: string; statut: string }[];
  const detail = quetes.map((q) => {
    const questions = db
      .prepare(
        `SELECT qu.consigne,
                (SELECT COUNT(*) FROM reponses r WHERE r.question_id = qu.id AND r.correcte = 0) AS erreurs,
                (SELECT COUNT(*) FROM reponses r WHERE r.question_id = qu.id AND r.correcte = 1) AS reussites
           FROM questions qu WHERE qu.quete_id = ? ORDER BY qu.ordre`,
      )
      .all(q.id) as { consigne: string; erreurs: number; reussites: number }[];
    return {
      titre: q.titre,
      matiere: q.matiere,
      statut: q.statut,
      reussies_du_premier_coup: questions.filter((x) => x.reussites > 0 && x.erreurs === 0).length,
      total_questions: questions.length,
      difficiles: questions.filter((x) => x.erreurs > 0).map((x) => x.consigne),
    };
  });
  return {
    prenom: enfant.prenom,
    ...niveau(enfant),
    soirs_d_affilee: enfant.soirs,
    periode_jours: jours,
    quetes: detail,
    parcours_complet: lireParcours(db, enfant.id),
  };
}
