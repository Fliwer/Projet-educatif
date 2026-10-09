// Test du contrat MCP local : même validation parentale que le transport distant.
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dossier = await mkdtemp(join(tmpdir(), "lumo-test-local-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
const client = new Client({ name: "test-local", version: "1" });
const { db } = await import("../src/db.ts");
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [join(import.meta.dirname, "..", "src", "mcp.ts")],
      env: { ...process.env } as Record<string, string>,
      stderr: "ignore",
    }),
  );
  assert.equal((await client.listTools()).tools.length, 4);
  const texte = (r: unknown): string => (r as { content: { text: string }[] }).content[0].text;
  assert.ok(texte(await client.callTool({ name: "lister_enfants", arguments: {} })).includes("LUMO01"));
  assert.match(
    texte(await client.callTool({ name: "ajouter_enfant", arguments: { prenom: "Léa", univers: "nature" } })),
    /Code de connexion : [A-Z0-9]{6}/,
  );
  const questions = Array.from({ length: 5 }, (_, i) => ({
    type: "choix",
    consigne: `7 × ${i + 2} = ?`,
    choix: [String(7 * (i + 2)), "99"],
    bonne_reponse: String(7 * (i + 2)),
  }));
  const quete = {
    titre: "Les sept",
    matiere: "Maths",
    notion: "La table de 7",
    extrait_lecon: "7 × 2 = 14.",
    questions,
  };
  const invalide = await client.callTool({
    name: "creer_quetes",
    arguments: { enfant: "Arthur", quetes: [{ ...quete, questions: questions.slice(0, 1) }] },
  });
  assert.equal(invalide.isError, true, "Même règle de 5 à 8 questions en local");
  const creation = await client.callTool({
    name: "creer_quetes",
    arguments: { enfant: "Arthur", quetes: [quete] },
  });
  assert.ok(!creation.isError, texte(creation));
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM quetes").get()!.n,
    0,
    "Aucun envoi automatique par MCP local",
  );
  const jeton = texte(creation).match(/brouillons\/([A-Za-z0-9_-]{43})/)![1];
  const { lireBrouillon, validerBrouillon } = await import("../src/parents.ts");
  validerBrouillon(jeton, lireBrouillon(jeton)!.nonce);
  const suivi = JSON.parse(
    texte(await client.callTool({ name: "voir_progression", arguments: { enfant: "Arthur" } })),
  );
  assert.equal(suivi.quetes.length, 1);
  assert.equal(
    (await client.callTool({ name: "voir_progression", arguments: { enfant: "Inconnu" } })).isError,
    true,
  );
  console.log("OK : MCP local, profils, validation obligatoire, contrat pédagogique et progression.");
} finally {
  await client.close();
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
