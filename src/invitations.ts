// Invitations privées du pilote : ne remplacent pas des comptes adultes ni OAuth.
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { DOSSIER_DONNEES } from "./config.ts";
import { db, transaction } from "./db.ts";
import { creerParent, empreinte, parentParCle } from "./parents.ts";
import { ajouterEnfant } from "./logic.ts";

const schema = z
  .object({
    parent_id: z.number().int().positive(),
    cle: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    code: z.string(),
    expire: z.number().int().positive(),
  })
  .strict();
const dossier = join(DOSSIER_DONNEES, "connexions", "invitations");
const fichier = (jeton: string) => join(dossier, `${empreinte(jeton)}.json`);

export function creerInvitation(libelle: string) {
  if (!/^[a-z0-9-]{1,40}$/.test(libelle)) throw new Error("Nom d’invitation invalide.");
  const jeton = randomBytes(32).toString("base64url");
  const chemin = fichier(jeton);
  mkdirSync(dossier, { recursive: true });
  try {
    return transaction(() => {
      const parent = creerParent(libelle);
      const enfant = ajouterEnfant("Profil test", "espace", parent.id);
      const invitation = {
        parent_id: parent.id,
        cle: parent.cle,
        code: enfant.code,
        expire: Date.now() + 86400000,
      };
      writeFileSync(chemin, JSON.stringify(invitation), { flag: "wx", mode: 0o600 });
      return { jeton, ...invitation };
    });
  } catch (erreur) {
    rmSync(chemin, { force: true });
    throw erreur;
  }
}

export function lireInvitation(jeton: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return undefined;
  try {
    const invitation = schema.parse(JSON.parse(readFileSync(fichier(jeton), "utf8")));
    if (invitation.expire <= Date.now() || parentParCle(invitation.cle)?.id !== invitation.parent_id)
      return undefined;
    if (
      !db
        .prepare("SELECT id FROM enfants WHERE parent_id=? AND code=?")
        .get(invitation.parent_id, invitation.code)
    )
      return undefined;
    return invitation;
  } catch {
    return undefined;
  }
}
