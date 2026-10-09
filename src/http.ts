import type { IncomingMessage } from "node:http";
import { ErreurMetier } from "./erreurs.ts";

export async function lireTexte(req: IncomingMessage, maximum: number): Promise<string> {
  const morceaux: Buffer[] = [];
  let taille = 0;
  for await (const morceau of req.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(morceau) ? morceau : Buffer.from(morceau);
    taille += buffer.length;
    if (taille > maximum) {
      req.resume();
      throw new ErreurMetier("Requête trop grande", 413);
    }
    morceaux.push(buffer);
  }
  return Buffer.concat(morceaux).toString("utf8");
}

export async function lireJson(req: IncomingMessage, maximum = 10_000): Promise<unknown> {
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json")
    throw new ErreurMetier("JSON attendu", 415);
  const texte = await lireTexte(req, maximum);
  try {
    return JSON.parse(texte);
  } catch {
    throw new ErreurMetier("JSON invalide");
  }
}

/** Limite locale bornée en mémoire. Le déploiement multi-instance exigera une limite partagée. */
const compteurs = new Map<string, { nombre: number; expire: number }>();
export function limiter(cle: string, maximum: number, duree = 60_000) {
  const maintenant = Date.now();
  for (const [nom, compteur] of compteurs) if (compteur.expire <= maintenant) compteurs.delete(nom);
  let compteur = compteurs.get(cle);
  if (!compteur) {
    if (compteurs.size >= 10_000) throw new ErreurMetier("Réessaie dans un instant.", 429);
    compteur = { nombre: 0, expire: maintenant + duree };
    compteurs.set(cle, compteur);
  }
  if (++compteur.nombre > maximum) throw new ErreurMetier("Réessaie dans un instant.", 429);
}

export function adresseClient(req: IncomingMessage): string {
  const ip = req.socket.remoteAddress ?? "inconnue";
  // Ce proxy n'est accepté que dans la démo liée à la boucle locale.
  const proxy = req.headers["cf-connecting-ip"];
  return process.env.LUMO_PARTAGE === "1" &&
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip) &&
    typeof proxy === "string"
    ? proxy
    : ip;
}
