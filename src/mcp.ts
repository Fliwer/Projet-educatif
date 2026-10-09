// Point d'entrée local : garde le connecteur Claude Desktop existant.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { creerServeurMcp } from "./outils-mcp.ts";
await creerServeurMcp().connect(new StdioServerTransport());
console.error("Connecteur MCP Lumo prêt.");
