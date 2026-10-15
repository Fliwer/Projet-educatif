// Remplace seulement six, douze et plus. Même voix Milo, français imposé pour ces clips.
import "../src/config.ts";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DOSSIER_DONNEES, RACINE } from "../src/config.ts";
if (!process.argv.includes("--generer")) throw new Error("Utiliser --generer pour la réparation ciblée.");
if (process.env.LUMO_PARTAGE === "1") throw new Error("Réparation interdite dans le serveur partagé.");
const modeleJeu = process.env.ELEVENLABS_MODELE ?? "eleven_multilingual_v2";
const voix = process.env.ELEVENLABS_VOIX;
if (!voix || !process.env.ELEVENLABS_API_KEY) throw new Error("Voix Milo non configurée.");
process.env.ELEVENLABS_MODELE = "eleven_flash_v2_5";
process.env.LUMO_VOIX_GENERATION = "1";
const { voixPip, suiviVoix } = await import("../src/voix.ts");
const cle = (modele, texte) => createHash("sha256").update(`${voix}|${modele}|${texte}`).digest("hex").slice(0, 32);
try {
  for (const texte of ["six", "douze", "plus"]) {
    const audio = await voixPip(texte, voix);
    for (const dossier of new Set([resolve(join(DOSSIER_DONNEES, "voix")), resolve(join(RACINE, "data", "voix"))])) {
      await mkdir(dossier, { recursive: true });
      const fichier = join(dossier, `${cle(modeleJeu, texte)}.mp3`);
      try { await writeFile(`${fichier}.avant-fr-${randomUUID()}`, await readFile(fichier)); } catch (e) { if (e.code !== "ENOENT") throw e; }
      await writeFile(fichier, audio);
    }
    console.log(JSON.stringify({ texte, octets: audio.length, langue: "fr", voixMilo: true }));
  }
} finally { await suiviVoix(); (await import("../src/db.ts")).db.close(); }
