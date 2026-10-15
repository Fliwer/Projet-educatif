// Comptes du prototype et brouillons : aucune dépendance au fournisseur d'IA.
import { supportAbsent } from "./pedagogie.ts";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db.ts";
import { schemaQuetesPedagogiques } from "./formats.ts";
import { creerQuetes, trouverEnfant, verifierQuetes, type Enfant } from "./logic.ts";

export const empreinte = (valeur: string) => createHash("sha256").update(valeur).digest("hex");
export type Parent = { id: number; libelle: string };
export function creerParent(libelle: string) {
  const cle = randomBytes(32).toString("base64url");
  const resultat = db
    .prepare("INSERT INTO parents (libelle, cle_hash) VALUES (?, ?)")
    .run(libelle.trim().slice(0, 60), empreinte(cle));
  return { id: Number(resultat.lastInsertRowid), cle };
}
export function parentParCle(cle: string): Parent | undefined {
  if (cle.length < 32 || cle.length > 100) return undefined;
  return db.prepare("SELECT id, libelle FROM parents WHERE cle_hash = ?").get(empreinte(cle)) as
    | Parent
    | undefined;
}
export function preparerBrouillon(parentId: number, enfant: Enfant, quetes: unknown): string {
  if (enfant.parent_id !== parentId) throw new Error("Ce profil n'appartient pas à ce parent.");
  const resultat = schemaQuetesPedagogiques.safeParse(quetes);
  if (!resultat.success)
    throw new Error(
      "Chaque quête doit préciser la notion, un extrait de la leçon et contenir 5 à 8 questions.",
    );
  const erreurs = verifierQuetes(resultat.data);
  resultat.data.forEach((q, i) =>
    q.questions.forEach((question, j) => {
      if (supportAbsent(question))
        erreurs.push(
          "Mission " +
            (i + 1) +
            ", question " +
            (j + 1) +
            " : support visuel absent. Rendre la consigne autonome.",
        );
    }),
  );
  if (erreurs.length) throw new Error(erreurs.join("\n"));
  const jeton = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO brouillons (parent_id, enfant_id, jeton_hash, nonce, contenu, expire) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    parentId,
    enfant.id,
    empreinte(jeton),
    randomBytes(32).toString("base64url"),
    JSON.stringify(resultat.data),
    Date.now() + 86400000,
  );
  return jeton;
}
export function lireBrouillon(jeton: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return undefined;
  const ligne = db
    .prepare("SELECT * FROM brouillons WHERE jeton_hash = ? AND expire > ?")
    .get(empreinte(jeton), Date.now()) as
    | {
        id: number;
        parent_id: number;
        enfant_id: number;
        nonce: string;
        contenu: string;
        publie: number;
        expire: number;
      }
    | undefined;
  if (!ligne) return undefined;
  const enfant = db
    .prepare("SELECT * FROM enfants WHERE id = ? AND parent_id = ?")
    .get(ligne.enfant_id, ligne.parent_id) as Enfant | undefined;
  if (!enfant) return undefined;
  return { ...ligne, enfant, quetes: schemaQuetesPedagogiques.parse(JSON.parse(ligne.contenu)) };
}
export function validerBrouillon(jeton: string, nonce: string, selection?: string[]) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const brouillon = lireBrouillon(jeton);
    if (!brouillon || brouillon.nonce !== nonce)
      throw new Error("Ce lien de validation est invalide ou expiré.");
    if (brouillon.publie) {
      db.exec("COMMIT");
      return { dejaPublie: true, enfant: brouillon.enfant };
    }
    const enfant = trouverEnfant(brouillon.enfant.code, brouillon.parent_id);
    if (!enfant) throw new Error("Profil introuvable.");
    let quetes = brouillon.quetes;
    if (selection !== undefined) {
      const autorises = new Set(quetes.flatMap((q, i) => q.questions.map((_, j) => i + ":" + j)));
      if (
        !selection.length ||
        selection.length > 24 ||
        new Set(selection).size !== selection.length ||
        selection.some((id) => !autorises.has(id))
      )
        throw new Error("Sélection invalide : conserve au moins une question.");
      const retenus = new Set(selection);
      quetes = quetes
        .map((q, i) => ({ ...q, questions: q.questions.filter((_, j) => retenus.has(i + ":" + j)) }))
        .filter((q) => q.questions.length > 0);
    }
    const erreurs = verifierQuetes(quetes);
    if (erreurs.length) throw new Error(erreurs.join("\n"));
    creerQuetes(enfant, quetes);
    db.prepare("UPDATE brouillons SET publie = 1 WHERE id = ?").run(brouillon.id);
    db.exec("COMMIT");
    return { dejaPublie: false, enfant };
  } catch (erreur) {
    db.exec("ROLLBACK");
    throw erreur;
  }
}
