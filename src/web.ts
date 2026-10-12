// Serveur web de Lumo : l'app enfant (fichiers du dossier public/) et son API.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { z } from "zod";
import { reprendreQuete, questionsARevoir } from "./revisions.ts";
import { RACINE } from "./config.ts";
import { db } from "./db.ts";
import { ErreurMetier } from "./erreurs.ts";
import { lireJson, limiter, adresseClient } from "./http.ts";
import { suiviVoix, voixAutorisee, voixDisponible, voixPip, VoixNonEnregistree } from "./voix.ts";
import {
  enregistrerReponse,
  etatEnfant,
  questionsQuete,
  terminerQuete,
  enfantParCode,
  type Enfant,
} from "./logic.ts";
import { adressePublique, traiterMcp } from "./mcp-http.ts";
import { traiterParent } from "./parent-web.ts";
import { lireMonde, agirMonde } from "./monde.ts";
import { choisirRythme } from "./rendez-vous.ts";

const PORT = Number(process.env.PORT ?? 4321);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("PORT invalide");
const PUBLIC = join(RACINE, "public");
const schemaReponse = z.object({
  question_id: z.number().int().positive().safe(),
  valeur: z.string().trim().min(1).max(2000),
  requete_id: z.string().uuid().optional(),
});
const schemaVoix = z.object({
  texte: z.string().trim().min(1).max(400),
  voix: z.string().min(1).max(100).optional(),
});

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function json(res: ServerResponse, statut: number, corps: unknown) {
  res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(corps));
}

/** L'enfant est identifié par son code (en-tête X-Lumo-Code). */
function enfantDe(req: IncomingMessage): Enfant | undefined {
  const code = String(req.headers["x-lumo-code"] ?? "")
    .trim()
    .toUpperCase();
  return enfantParCode(code);
}

async function api(req: IncomingMessage, res: ServerResponse, chemin: string) {
  if (req.method === "GET" && chemin === "/api/suivi-voix") {
    if (process.env.LUMO_PARTAGE === "1") return json(res, 403, { erreur: "Suivi réservé au jeu local" });
    const adresse = req.socket.remoteAddress;
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(adresse ?? "")) {
      return json(res, 403, { erreur: "Suivi réservé à ce PC" });
    }
    return json(res, 200, await suiviVoix());
  }
  const enfant = enfantDe(req);
  if (!enfant) {
    limiter(`auth:${adresseClient(req)}`, 20);
    return json(res, 401, { erreur: "Code inconnu" });
  }
  limiter(`enfant:${enfant.id}`, 300);

  if (req.method === "GET" && chemin === "/api/moi") return json(res, 200, etatEnfant(enfant));
  if (req.method === "POST" && chemin === "/api/rendez-vous")
    return json(res, 200, choisirRythme(db, enfant.id, await lireJson(req)));
  if (req.method === "GET" && chemin === "/api/monde") return json(res, 200, lireMonde(db, enfant.id));
  if (req.method === "POST" && chemin === "/api/monde/actions")
    return json(res, 200, agirMonde(db, enfant.id, await lireJson(req)));

  const quete = chemin.match(/^\/api\/quetes\/(\d+)$/);
  if (req.method === "GET" && quete) {
    const q = questionsQuete(enfant, Number(quete[1]));
    return q ? json(res, 200, q) : json(res, 404, { erreur: "Quête introuvable" });
  }

  const revision = chemin.match(/^\/api\/quetes\/(\d+)\/revision$/);
  if (revision && req.method === "GET") {
    const source = db
      .prepare(
        "SELECT id,titre FROM quetes WHERE id=? AND enfant_id=? AND archivee=0 AND origine_id IS NULL AND statut='terminee'",
      )
      .get(Number(revision[1]), enfant.id);
    if (!source) return json(res, 404, { erreur: "Mission indisponible" });
    const active = db
      .prepare("SELECT id FROM quetes WHERE origine_id=? AND archivee=0 AND statut!='terminee'")
      .get(source.id);
    return json(res, 200, {
      ...source,
      a_revoir: questionsARevoir(enfant, Number(source.id)).length,
      reprise_id: active?.id ?? null,
    });
  }
  if (revision && req.method === "POST") {
    const corps = z
      .object({ mode: z.enum(["tout", "cible"]), requete_id: z.string().uuid() })
      .strict()
      .parse(await lireJson(req));
    return json(res, 200, reprendreQuete(enfant, Number(revision[1]), corps.mode, corps.requete_id));
  }
  const fin = chemin.match(/^\/api\/quetes\/(\d+)\/terminer$/);
  if (req.method === "POST" && fin) {
    const r = terminerQuete(enfant, Number(fin[1]));
    return r ? json(res, 200, r) : json(res, 404, { erreur: "Quête introuvable" });
  }

  if (req.method === "POST" && chemin === "/api/reponses") {
    const corps = schemaReponse.parse(await lireJson(req));
    const r = enregistrerReponse(enfant, corps.question_id, corps.valeur, corps.requete_id);
    return r ? json(res, 200, r) : json(res, 404, { erreur: "Question introuvable" });
  }

  // Voix de Milo (ElevenLabs). Sans clé, l'app utilise la voix de la tablette.
  if (req.method === "POST" && chemin === "/api/voix") {
    if (!voixDisponible()) return json(res, 503, { erreur: "Voix non configurée" });
    const { texte, voix } = schemaVoix.parse(await lireJson(req));
    if (voix && !voixAutorisee(voix)) return json(res, 403, { erreur: "Voix non autorisée" });
    let audio: Buffer;
    try {
      audio = await voixPip(texte, voix);
    } catch (erreur) {
      if (erreur instanceof VoixNonEnregistree) return json(res, 404, { erreur: erreur.message });
      throw erreur;
    }
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" });
    return res.end(audio);
  }

  json(res, 404, { erreur: "Route inconnue" });
}

async function fichier(res: ServerResponse, chemin: string) {
  let relatif: string;
  try {
    relatif = decodeURIComponent(chemin === "/" ? "/index.html" : chemin);
  } catch {
    throw new ErreurMetier("Adresse invalide");
  }
  const complet = resolve(PUBLIC, relatif.replace(/^[/\\]+/, ""));
  if (!complet.startsWith(PUBLIC + sep)) return json(res, 403, { erreur: "Interdit" });
  try {
    const contenu = await readFile(complet);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(complet)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(contenu);
  } catch {
    json(res, 404, { erreur: "Fichier introuvable" });
  }
}

const serveur = createServer(
  { requestTimeout: 15_000, headersTimeout: 10_000, maxHeaderSize: 16_384 },
  async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    try {
      let chemin: string;
      try {
        chemin = new URL(req.url ?? "/", "http://localhost").pathname;
      } catch {
        throw new ErreurMetier("Adresse invalide");
      }
      if (chemin === "/health" && req.method === "GET")
        return json(res, 200, { service: "lumo", statut: "ok" });
      if (chemin === "/mcp") await traiterMcp(req, res);
      else if (chemin.startsWith("/parent") && (await traiterParent(req, res, chemin, adressePublique()))) {
      } else if (chemin.startsWith("/api/")) await api(req, res, chemin);
      else if (req.method === "GET") await fichier(res, chemin);
      else json(res, 405, { erreur: "Méthode indisponible" });
    } catch (e) {
      if (res.headersSent || res.destroyed) {
        res.end();
        return;
      }
      if (e instanceof ErreurMetier) {
        if (e.statut === 429) res.setHeader("Retry-After", "60");
        return json(res, e.statut, { erreur: e.message });
      }
      if (e instanceof z.ZodError) return json(res, 400, { erreur: "Données invalides" });
      console.error("Erreur interne HTTP", e instanceof Error ? e.name : "inconnue");
      json(res, 500, { erreur: "Erreur interne" });
    }
  },
).listen(PORT, process.env.LUMO_PARTAGE === "1" ? "127.0.0.1" : "0.0.0.0", () => {
  console.log(`App enfant Lumo : http://localhost:${PORT}`);
  for (const adresses of Object.values(networkInterfaces())) {
    for (const a of adresses ?? []) {
      if (a.family === "IPv4" && !a.internal)
        console.log(`Sur une tablette du même Wi-Fi : http://${a.address}:${PORT}`);
    }
  }
  console.log("Code de démonstration : LUMO01 (Arthur, fictif)");
  console.log(
    process.env.LUMO_PARTAGE === "1"
      ? "Voix de Milo : fichiers déjà enregistrés, sinon voix de la tablette (aucune génération payante)"
      : voixDisponible()
        ? "Voix de Milo : ElevenLabs"
        : "Voix de Milo : voix de la tablette (pas de clé ElevenLabs dans .env)",
  );
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    serveur.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  });
