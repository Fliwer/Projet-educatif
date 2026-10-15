// Lecture locale uniquement : aucune génération ni analyse payante pendant le jeu.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { DOSSIER_DONNEES, RACINE } from "./config.ts";
const schemaAlignement = z.object({
  characters: z.array(z.string().max(10)).max(5000),
  character_start_times_seconds: z.array(z.number().finite().nonnegative()).max(5000),
  character_end_times_seconds: z.array(z.number().finite().nonnegative()).max(5000),
});
export function motsDepuisAlignement(valeur: unknown) {
  const resultat = schemaAlignement.safeParse(valeur);
  if (!resultat.success) return [];
  const a = resultat.data;
  if (
    a.characters.some((c) => c.length !== 1) ||
    a.characters.length !== a.character_start_times_seconds.length ||
    a.characters.length !== a.character_end_times_seconds.length
  )
    return [];
  const phrase = a.characters.join("");
  const mots: { text: string; start: number; end: number }[] = [];
  for (const m of phrase.matchAll(/\S+/gu)) {
    if (!/[\p{L}\p{N}]/u.test(m[0])) continue;
    const debut = m.index,
      fin = debut + m[0].length - 1;
    const start = a.character_start_times_seconds[debut],
      end = a.character_end_times_seconds[fin];
    if (end <= start || (mots.length && start < mots[mots.length - 1].start)) return [];
    mots.push({ text: m[0], start, end });
  }
  return mots;
}
const schema = z.object({
  audio_sha256: z.string(),
  mots: z
    .array(
      z.object({
        text: z.string().max(400),
        start: z.number().finite().nonnegative(),
        end: z.number().finite().nonnegative(),
      }),
    )
    .max(200),
});
export async function lireReperesVoix(texte: string, voix = process.env.ELEVENLABS_VOIX) {
  if (!voix) return { mots: [] };
  const modele = process.env.ELEVENLABS_MODELE ?? "eleven_multilingual_v2";
  const cle = createHash("sha256").update(`${voix}|${modele}|${texte}`).digest("hex").slice(0, 32);
  for (const dossier of [
    join(DOSSIER_DONNEES, "voix"),
    ...(process.env.LUMO_PARTAGE === "1" ? [join(RACINE, "data", "voix")] : []),
  ]) {
    try {
      const audio = await readFile(join(dossier, `${cle}.mp3`));
      const rep = schema.parse(JSON.parse(await readFile(join(dossier, `${cle}.mots.json`), "utf8")));
      if (
        rep.audio_sha256 !== createHash("sha256").update(audio).digest("hex") ||
        rep.mots.some((m, i) => m.end <= m.start || (i > 0 && m.start < rep.mots[i - 1].start))
      )
        return { mots: [] };
      return { mots: rep.mots };
    } catch {}
  }
  return { mots: [] };
}
