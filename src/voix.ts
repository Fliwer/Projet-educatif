// Voix de Milo : synthèse ElevenLabs côté serveur, avec un cache sur disque.
// Chaque phrase n'est générée (et payée) qu'une seule fois, ensuite le fichier mp3 est réutilisé.
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, writeFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { DOSSIER_DONNEES, FUSEAU } from "./config.ts";
import { db, transaction } from "./db.ts";
import { ErreurMetier } from "./erreurs.ts";

const DOSSIER = join(DOSSIER_DONNEES, "voix");
// .env est chargé par web.ts après les imports : lire ces réglages au moment de l'appel.
const modele = () => process.env.ELEVENLABS_MODELE ?? "eleven_multilingual_v2";
const JOURNAL = join(DOSSIER, "suivi.jsonl");
let ecriture = Promise.resolve();
function noter(type: string, caracteres = 0) {
  const ligne = JSON.stringify({ date: new Date().toISOString(), type, caracteres }) + "\n";
  ecriture = ecriture
    .then(async () => {
      await mkdir(DOSSIER, { recursive: true });
      await appendFile(JOURNAL, ligne);
    })
    .catch(() => console.warn("Suivi voix : impossible d'écrire le journal local."));
}

/** Statistiques locales, sans textes prononcés ni clés secrètes. Aucun appel à ElevenLabs. */
export async function suiviVoix() {
  await ecriture;
  const bilan = {
    debut: null as string | null,
    cache: 0,
    partagees: 0,
    appels: 0,
    generations: 0,
    erreurs: 0,
    caracteres: 0,
    fichiers: 0,
  };
  let contenu = "";
  try {
    contenu = await readFile(JOURNAL, "utf8");
  } catch {}
  for (const ligne of contenu.split("\n")) {
    try {
      const entree = JSON.parse(ligne);
      bilan.debut ??= entree.date;
      if (entree.type === "cache") bilan.cache++;
      if (entree.type === "partage") bilan.partagees++;
      if (entree.type === "appel") {
        bilan.appels++;
        bilan.caracteres += entree.caracteres;
      }
      if (entree.type === "generation") bilan.generations++;
      if (entree.type === "erreur") bilan.erreurs++;
    } catch {}
  }
  try {
    bilan.fichiers = (await readdir(DOSSIER)).filter((nom) => nom.endsWith(".mp3")).length;
  } catch {}
  return bilan;
}

export function voixDisponible(): boolean {
  return Boolean(process.env.ELEVENLABS_VOIX);
}
export class VoixNonEnregistree extends Error {}

/** Voix autorisées : celle de Milo, plus les voix en essai listées dans .env. */
export function voixAutorisee(id: string): boolean {
  const essai = (process.env.ELEVENLABS_VOIX_ESSAI ?? "").split(",").map((v) => v.trim());
  return id === process.env.ELEVENLABS_VOIX || essai.includes(id);
}

// File d'attente : jamais plus de EN_MEME_TEMPS demandes envoyées à ElevenLabs en même temps.
let enCours = 0;
const attente: (() => void)[] = [];
async function tour<T>(travail: () => Promise<T>): Promise<T> {
  const limite = Math.min(4, Math.max(1, Math.floor(Number(process.env.ELEVENLABS_PARALLELE) || 2)));
  if (attente.length >= 32) throw new ErreurMetier("Voix occupée, utilise la voix de l’appareil.", 429);
  if (enCours >= limite) await new Promise<void>((r) => attente.push(r));
  enCours++;
  try {
    return await travail();
  } finally {
    enCours--;
    attente.shift()?.();
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function demanderElevenLabs(texte: string, voix: string, modeleVoix: string): Promise<Buffer> {
  for (let essai = 1; ; essai++) {
    // Réserver avant chaque tentative réseau : une erreur incertaine compte dans la limite.
    const limite = Number(process.env.LUMO_VOIX_CARACTERES_JOUR ?? 2000);
    if (!Number.isSafeInteger(limite) || limite < 1)
      throw new VoixNonEnregistree("La génération de voix est désactivée.");
    transaction(() => {
      const jour = new Date().toLocaleDateString("sv-SE", { timeZone: FUSEAU });
      db.prepare("INSERT OR IGNORE INTO budget_voix (jour) VALUES (?)").run(jour);
      const resultat = db
        .prepare("UPDATE budget_voix SET caracteres = caracteres + ? WHERE jour = ? AND caracteres + ? <= ?")
        .run([...texte].length, jour, [...texte].length, limite);
      if (!resultat.changes)
        throw new VoixNonEnregistree("La limite quotidienne est atteinte, utilise la voix de l’appareil.");
    });
    noter("appel", [...texte].length);
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voix)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: texte,
          model_id: modeleVoix,
          ...(modeleVoix === "eleven_multilingual_v2" ? {} : { language_code: "fr" }),
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
        }),
      },
    );
    if (r.ok) {
      const audio = Buffer.from(await r.arrayBuffer());
      if (!audio.length || audio.length > 5_000_000) throw new Error("Réponse audio invalide");
      return audio;
    }
    // « Trop de demandes » : on attend un peu et on réessaie (3 fois au maximum).
    if (r.status === 429 && essai < 4) {
      await r.body?.cancel();
      await pause(600 * essai);
      continue;
    }
    await r.body?.cancel();
    throw new Error(`ElevenLabs indisponible (${r.status})`);
  }
}

const enFabrication = new Map<string, Promise<Buffer>>(); // la même phrase demandée deux fois n'est fabriquée qu'une fois

/** Renvoie le mp3 de la phrase (depuis le cache, ou généré par ElevenLabs). */
export async function voixPip(texte: string, voix = process.env.ELEVENLABS_VOIX!): Promise<Buffer> {
  if (!texte.trim() || texte.length > 400 || !voixAutorisee(voix))
    throw new ErreurMetier("Demande de voix invalide.");
  const modeleVoix = modele();
  const cle = createHash("sha256").update(`${voix}|${modeleVoix}|${texte}`).digest("hex").slice(0, 32);
  const fichier = join(DOSSIER, `${cle}.mp3`);
  try {
    const audio = await readFile(fichier);
    noter("cache");
    return audio;
  } catch {}
  if (process.env.LUMO_PARTAGE === "1") {
    // La démo peut lire les anciens fichiers, mais jamais fabriquer une voix payante.
    try {
      const audio = await readFile(join(import.meta.dirname, "..", "data", "voix", `${cle}.mp3`));
      noter("cache");
      return audio;
    } catch {
      throw new VoixNonEnregistree("Cette phrase utilise la voix du navigateur.");
    }
  }
  if (process.env.LUMO_VOIX_GENERATION !== "1" || !process.env.ELEVENLABS_API_KEY)
    throw new VoixNonEnregistree("Cette phrase utilise la voix de l’appareil.");
  if (!enFabrication.has(cle)) {
    const fabrication = tour(() => demanderElevenLabs(texte, voix, modeleVoix))
      .then(async (audio) => {
        await mkdir(DOSSIER, { recursive: true });
        const temporaire = `${fichier}.${process.pid}.tmp`;
        try {
          await writeFile(temporaire, audio);
          await rename(temporaire, fichier);
        } finally {
          await rm(temporaire, { force: true });
        }
        noter("generation");
        return audio;
      })
      .catch((erreur) => {
        noter("erreur");
        throw erreur;
      })
      .finally(() => enFabrication.delete(cle));
    enFabrication.set(cle, fabrication);
  } else {
    noter("partage");
  }
  return enFabrication.get(cle)!;
}
