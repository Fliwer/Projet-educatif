import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOSSIER_DONNEES } from "../src/config.ts";
import { db } from "../src/db.ts";
import { creerInvitation } from "../src/invitations.ts";

const libelle = process.argv[2];
const adresse = new URL(process.argv[3] ?? "");
if (!libelle) throw new Error("Indique le nom de la famille de test et l’adresse de Lumo.");
if (
  adresse.protocol !== "https:" &&
  !(adresse.protocol === "http:" && ["localhost", "127.0.0.1"].includes(adresse.hostname))
)
  throw new Error("Une invitation distante exige HTTPS.");
try {
  const destination = join(DOSSIER_DONNEES, "connexions", `invitation-${libelle}.txt`);
  if (existsSync(destination)) throw new Error("Cette invitation existe déjà. Son lien privé est conservé.");
  const invitation = creerInvitation(libelle);
  writeFileSync(
    destination,
    `Invitation privée Lumo — famille de test\n\n${adresse.origin}/parent/connexion/${invitation.jeton}\n\nCe lien permet de récupérer la clé de connexion de cette famille. Transmets-le uniquement à la personne invitée. Il expire le ${new Date(invitation.expire).toISOString()}. La clé obtenue reste active jusqu’à sa révocation.\n\nProfil fictif séparé : ${invitation.code}. Aucun accès aux autres familles. Le tunnel doit rester allumé.\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(`Invitation prête. Fichier privé : ${destination}`);
} finally {
  db.close();
}
