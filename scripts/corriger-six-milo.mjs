// Réparation ciblée : une génération de « six », avec sauvegarde de l'ancien fichier.
import "../src/config.ts";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { DOSSIER_DONNEES, RACINE } from "../src/config.ts";

if (!process.argv.includes("--generer")) throw new Error("Utiliser --generer pour cette réparation payante ciblée.");
if (process.env.LUMO_PARTAGE === "1") throw new Error("Réparation interdite dans le processus partagé.");
if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOIX) throw new Error("Voix Milo non configurée.");
const modele = process.env.ELEVENLABS_MODELE ?? "eleven_multilingual_v2";
const cle = createHash("sha256").update(`${process.env.ELEVENLABS_VOIX}|${modele}|six`).digest("hex").slice(0, 32);
const dossier = join(DOSSIER_DONNEES, "voix");
const fichier = join(dossier, `${cle}.mp3`);
await mkdir(dossier, { recursive: true });
const ancien = await readFile(fichier);
const sauvegarde = `${fichier}.avant-correction-fr`;
// Ne pas écraser une sauvegarde existante ni régénérer à chaque lancement.
await writeFile(sauvegarde, ancien, { flag: "wx" });
await rename(fichier, `${fichier}.en-reparation`);
process.env.LUMO_VOIX_GENERATION = "1";
const { voixPip, suiviVoix } = await import("../src/voix.ts");
try {
  const audio = await voixPip("six");
  const partage = join(RACINE, "data", "voix");
  if (partage !== dossier) {
    await mkdir(partage, { recursive: true });
    await copyFile(fichier, join(partage, `${cle}.mp3`));
  }
  console.log(JSON.stringify({ fichier, octets: audio.length, texte: "six", modele }));
} catch (erreur) {
  await writeFile(fichier, ancien);
  throw erreur;
} finally {
  await suiviVoix();
  (await import("../src/db.ts")).db.close();
}
