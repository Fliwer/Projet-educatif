// Crée une connexion privée pour un parent du prototype. La clé n'est jamais affichée.
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { creerParent } from "../src/parents.ts";
import { ajouterEnfant } from "../src/logic.ts";
import { db } from "../src/db.ts";

const libelle = process.argv[2] ?? "demo";
if (!/^[a-z0-9-]{1,40}$/.test(libelle))
  throw new Error("Utilise un nom de connexion court, avec lettres minuscules, chiffres ou tirets.");
const adresse = new URL(process.argv[3] ?? "http://localhost:4321");
if (
  adresse.protocol !== "https:" &&
  !(adresse.protocol === "http:" && ["localhost", "127.0.0.1"].includes(adresse.hostname))
)
  throw new Error("Utilise HTTPS pour une connexion distante.");
const dossier = join(process.env.LUMO_DATA ?? join(import.meta.dirname, "..", "data"), "connexions", libelle);
const fichier = join(dossier, ".env");
if (existsSync(fichier)) throw new Error("Cette connexion existe déjà. Son fichier privé est conservé.");
mkdirSync(dossier, { recursive: true });
db.exec("BEGIN");
try {
  const parent = creerParent(libelle);
  ajouterEnfant("Arthur", "espace", parent.id); // Fictif : prototype uniquement.
  writeFileSync(
    fichier,
    `LUMO_MCP_URL=${adresse.origin}/mcp\nLUMO_MCP_CLE=${parent.cle}\nLUMO_PARENT_ID=${parent.id}\n`,
    { flag: "wx", mode: 0o600 },
  );
  db.exec("COMMIT");
} catch (erreur) {
  db.exec("ROLLBACK");
  throw erreur;
}
db.close();
console.log(`Connexion créée. Fichier privé : ${fichier}`);
console.log("Le parent possède son propre profil Arthur fictif. Ne partage pas ce fichier publiquement.");
console.log("Le connecteur HTTP doit être activé côté serveur avec LUMO_MCP_ACTIF=1.");
