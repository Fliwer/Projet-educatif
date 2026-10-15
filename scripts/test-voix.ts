// Vérifie le cache et son suivi avec une API simulée : aucun crédit utilisé.
import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const dossier = await mkdtemp(join(tmpdir(), "lumo-test-voix-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_VOIX_GENERATION = "1";
process.env.LUMO_VOIX_CARACTERES_JOUR = "2000";
process.env.ELEVENLABS_VOIX = "voix-simulee";
process.env.ELEVENLABS_MODELE = "modele-simule";
const fetchOriginal = globalThis.fetch;
let appels = 0;
let enEchec = false;
globalThis.fetch = async (_adresse, options) => {
  assert.ok(String(_adresse).includes("/with-timestamps?"), "Timings obtenus dans le même appel TTS");
  appels++;
  assert.equal(JSON.parse(String(options?.body)).model_id, process.env.ELEVENLABS_MODELE);
  const demande = JSON.parse(String(options?.body));
  if (demande.model_id === "eleven_multilingual_v2") {
    assert.equal(demande.language_code, undefined);
    if (demande.text === "six") {
      assert.equal(demande.previous_text, "Comptons ensemble en français : quatre, cinq,");
      assert.equal(demande.next_text, "sept, huit, neuf.");
    } else if (["huit", "vingt et un"].includes(demande.text)) {
      assert.equal(demande.previous_text, "Nous faisons un calcul en français. Lis le nombre suivant :");
      assert.equal(demande.next_text, "Continuons notre exercice de mathématiques en français.");
    } else assert.equal(demande.previous_text, undefined);
  } else assert.equal(demande.language_code, "fr");
  if (enEchec) throw new Error("Erreur simulée");
  await new Promise((fin) => setTimeout(fin, 20));
  const characters = [...demande.text];
  return Response.json({
    audio_base64: Buffer.from([1, 2, 3]).toString("base64"),
    alignment: {
      characters,
      character_start_times_seconds: characters.map((_: string, i: number) => i * 0.1),
      character_end_times_seconds: characters.map((_: string, i: number) => (i + 1) * 0.1),
    },
  });
};
try {
  const { voixPip, suiviVoix, voixDisponible } = await import("../src/voix.ts");
  process.env.ELEVENLABS_API_KEY = "cle-simulee";
  assert.equal(voixDisponible(), true);
  process.env.LUMO_PARTAGE = "1";
  assert.equal(voixDisponible(), true, "Le partage propose le cache audio");
  await assert.rejects(voixPip("Phrase absente du cache de démonstration"));
  assert.equal(appels, 0, "Le partage ne peut pas consommer de crédits");
  delete process.env.LUMO_PARTAGE;
  await Promise.all([voixPip("Bonjour !"), voixPip("Bonjour !")]);
  assert.equal(appels, 1, "Deux demandes simultanées partagent une génération");
  await voixPip("Bonjour !");
  assert.equal(appels, 1, "Une phrase enregistrée ne rappelle pas l'API");
  const { lireReperesVoix } = await import("../src/reperes-voix.ts");
  assert.equal((await lireReperesVoix("Bonjour !")).mots[0]?.text, "Bonjour");
  assert.equal(appels, 1, "Lire les repères locaux ne consomme aucun nouvel appel API");
  process.env.ELEVENLABS_MODELE = "autre-modele";
  await voixPip("Bonjour !");
  assert.equal(appels, 2, "Le modèle est lu après le chargement des réglages");
  enEchec = true;
  await assert.rejects(voixPip("Erreur"));
  const bilan = await suiviVoix();
  assert.equal(bilan.appels, 3);
  assert.equal(bilan.generations, 2);
  assert.equal(bilan.cache, 1);
  assert.equal(bilan.partagees, 1);
  assert.equal(bilan.erreurs, 1);
  assert.equal(bilan.caracteres, 24);
  assert.equal(bilan.fichiers, 2);
  const journal = await readFile(join(dossier, "voix", "suivi.jsonl"), "utf8");
  assert.ok(!journal.includes("Bonjour"), "Aucun texte prononcé dans le journal");
  enEchec = false;
  process.env.LUMO_VOIX_GENERATION = "0";
  await assert.rejects(voixPip("Nouvelle phrase interdite"));
  assert.equal(appels, 3, "Aucun appel payant sans activation explicite");
  process.env.LUMO_VOIX_GENERATION = "1";
  process.env.LUMO_VOIX_CARACTERES_JOUR = "1";
  await assert.rejects(voixPip("Budget épuisé"));
  assert.equal(appels, 3, "Budget persistant vérifié avant l'appel externe");
  process.env.LUMO_VOIX_CARACTERES_JOUR = "2000";
  process.env.ELEVENLABS_MODELE = "eleven_multilingual_v2";
  await voixPip("six");
  assert.equal(appels, 4, "Six est généré avec un contexte français silencieux");
  await voixPip("six");
  assert.equal(appels, 4, "La correction française est réutilisée depuis le cache");
  await voixPip("huit");
  await voixPip("vingt et un");
  await voixPip("Écris le mot que tu entends.");
  assert.equal(appels, 7, "Les nombres simples et composés reçoivent du contexte, pas les consignes");
  const source = await readFile(join(import.meta.dirname, "..", "public", "app.js"), "utf8");
  const debut = source.indexOf("const OPERATIONS =");
  const fin = source.indexOf("/** Prépare à l'avance", debut);
  const morceaux = runInNewContext(source.slice(debut, fin) + "\nmorceauxVoix", {
    nettoyer: (texte: string) => texte.trim(),
    nombreFrancais: (n: string) => n,
  });
  for (const [texte, operation] of [
    ["7 × 8 = ?", "fois"],
    ["12 + 3 = ?", "plus"],
    ["9 - 2 = ?", "moins"],
    ["20 ÷ 4 = ?", "divisé par"],
  ]) {
    assert.equal(morceaux(texte).length, 4);
    assert.equal(morceaux(texte)[1], operation);
  }
  assert.equal(morceaux("Écris ce mot.").length, 1);
  console.log("OK : cache, demandes simultanées, suivi, erreurs et morceaux des calculs (API simulée).");
} finally {
  globalThis.fetch = fetchOriginal;
  const voix = await import("../src/voix.ts");
  await voix.suiviVoix();
  (await import("../src/db.ts")).db.close();
  await rm(dossier, { recursive: true, force: true });
}
