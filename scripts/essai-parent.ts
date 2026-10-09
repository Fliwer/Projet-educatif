// Prépare un exemple fictif via le véritable MCP, sans API de génération ni publication.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const fichier = process.argv[2];
if (!fichier) throw new Error("Indique le fichier .env de la connexion de démonstration.");
process.loadEnvFile(fichier);
const client = new Client({ name: "lumo-essai-parent", version: "0.2.0" });
try {
  await client.connect(
    new StreamableHTTPClientTransport(new URL(process.env.LUMO_MCP_URL!), {
      requestInit: { headers: { Authorization: `Bearer ${process.env.LUMO_MCP_CLE}` } },
    }),
  );
  const profils = await client.callTool({ name: "lister_enfants", arguments: {} });
  const enfants = JSON.parse((profils.content as { text: string }[])[0].text).enfants;
  if (!enfants.length) throw new Error("Cette connexion n'a pas de profil fictif.");
  const resultat = await client.callTool({
    name: "creer_quetes",
    arguments: {
      enfant: enfants[0].code,
      quetes: [
        {
          titre: "La fusée des sept",
          matiere: "Maths",
          notion: "La table de 7",
          extrait_lecon:
            "Exemple fictif préparé pour essayer le parcours, sans photo : 7 × 2 = 14 ; 7 × 3 = 21 ; 7 × 4 = 28.",
          questions: [
            {
              type: "associer",
              consigne: "Relie le calcul à son résultat",
              paires: [
                ["7 × 2", "14"],
                ["7 × 3", "21"],
              ],
            },
            { type: "choix", consigne: "7 × 3 = ?", choix: ["21", "24", "28"], bonne_reponse: "21" },
            { type: "texte", consigne: "7 × 4 = ?", bonne_reponse: "28" },
            { type: "vrai_faux", consigne: "7 × 2 = 14.", bonne_reponse: "Vrai" },
            { type: "ordre", consigne: "Range du plus petit au plus grand", elements: ["7", "14", "21"] },
          ],
        },
      ],
    },
  });
  if (resultat.isError) throw new Error("Le brouillon de démonstration a été refusé.");
  console.log((resultat.content as { text: string }[])[0].text);
} finally {
  await client.close();
}
