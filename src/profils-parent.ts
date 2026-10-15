import { z } from "zod";
import { db, transaction } from "./db.ts";
import { ajouterEnfant, type Enfant } from "./logic.ts";
const schema = z
  .object({
    prenom: z.string().trim().min(1).max(30),
    univers: z.enum(["espace", "nature"]),
    niveau_scolaire: z.string().trim().min(1).max(60),
    pays: z.string().trim().min(1).max(60),
    aides: z.string().trim().max(300),
  })
  .strict();
export function enregistrerProfilParent(parentId: number, id: number | null, donnees: unknown) {
  const profil = schema.parse(donnees);
  return transaction(() => {
    let enfant: Enfant | undefined;
    if (id !== null) {
      if (!Number.isSafeInteger(id) || id < 1) throw new Error("Profil introuvable");
      enfant = db.prepare("SELECT * FROM enfants WHERE id=? AND parent_id=?").get(id, parentId) as
        | Enfant
        | undefined;
      if (!enfant) throw new Error("Profil introuvable");
    } else enfant = ajouterEnfant(profil.prenom, profil.univers, parentId);
    db.prepare(
      "UPDATE enfants SET prenom=?,univers=?,niveau_scolaire=?,pays=?,aides=? WHERE id=? AND parent_id=?",
    ).run(
      profil.prenom,
      profil.univers,
      profil.niveau_scolaire,
      profil.pays,
      profil.aides,
      enfant.id,
      parentId,
    );
    return enfant.id;
  });
}
