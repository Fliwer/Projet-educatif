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
  appels++;
  assert.equal(JSON.parse(String(options?.body)).model_id, process.env.ELEVENLABS_MODELE);
  assert.equal(JSON.parse(String(options?.body)).language_code, "fr");
  if (enEchec) throw new Error("Erreur simulée");
  await new Promise((fin) => setTimeout(fin, 20));
  return new Response(new Uint8Array([1, 2, 3]));
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
