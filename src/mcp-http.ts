import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parentParCle } from "./parents.ts";
import { creerServeurMcp } from "./outils-mcp.ts";
import { lireJson, limiter, adresseClient } from "./http.ts";

export function adressePublique(): string {
  if (process.env.LUMO_URL) return new URL(process.env.LUMO_URL).origin;
  if (process.env.LUMO_PARTAGE === "1") {
    try {
      const etat = JSON.parse(
        readFileSync(join(import.meta.dirname, "..", "data", "partage", "etat.json"), "utf8").replace(
          /^\uFEFF/,
          "",
        ),
      );
      return new URL(etat.url).origin;
    } catch {}
  }
  return `http://localhost:${process.env.PORT ?? 4321}`;
}
export async function traiterMcp(req: IncomingMessage, res: ServerResponse) {
  const repondre = (statut: number, message: string) => {
    res.writeHead(statut, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ erreur: message }));
  };
  if (process.env.LUMO_MCP_ACTIF !== "1") return repondre(404, "Connecteur distant désactivé");
  const adresse = adressePublique();
  if (req.headers.origin && req.headers.origin !== new URL(adresse).origin)
    return repondre(403, "Origine non autorisée");
  const autorisation = String(req.headers.authorization ?? "").match(/^Bearer ([A-Za-z0-9_-]{43})$/i);
  const parent = autorisation ? parentParCle(autorisation[1]) : undefined;
  if (!parent) {
    limiter(`mcp-auth:${adresseClient(req)}`, 20);
    res.setHeader("WWW-Authenticate", 'Bearer realm="Lumo"');
    return repondre(401, "Connexion parent requise");
  }
  limiter(`mcp-parent:${parent.id}`, 60);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return repondre(405, "Utilise POST pour le connecteur MCP");
  }
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const serveur = creerServeurMcp(parent.id, adresse);
  try {
    const message = await lireJson(req, 131072);
    await serveur.connect(transport);
    await transport.handleRequest(req, res, message);
  } finally {
    await transport.close();
    await serveur.close();
  }
}
