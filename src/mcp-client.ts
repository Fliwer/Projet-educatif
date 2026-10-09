// Relais Claude Desktop : aucun appel d'API LLM, uniquement le MCP distant.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const fichier = process.argv[2];
if (!fichier) throw new Error("Indique le fichier .env privé de la connexion parent.");
process.loadEnvFile(fichier);
const adresse = new URL(process.env.LUMO_MCP_URL ?? "");
if (
  adresse.protocol !== "https:" &&
  !(adresse.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(adresse.hostname))
) {
  throw new Error("Le connecteur distant doit utiliser HTTPS.");
}
const cle = process.env.LUMO_MCP_CLE;
if (!cle) throw new Error("La connexion parent n'est pas configurée.");
const distant = new Client({ name: "lumo-relais-parent", version: "0.2.0" });
await distant.connect(
  new StreamableHTTPClientTransport(adresse, {
    requestInit: { headers: { Authorization: `Bearer ${cle}` } },
  }),
);
const relais = new Server({ name: "lumo", version: "0.2.0" }, { capabilities: { tools: {} } });
relais.setRequestHandler(ListToolsRequestSchema, () => distant.listTools());
relais.setRequestHandler(CallToolRequestSchema, ({ params }) => distant.callTool(params));
relais.onclose = () => {
  void distant.close();
};
await relais.connect(new StdioServerTransport());
console.error("Connecteur parent Lumo distant prêt.");
