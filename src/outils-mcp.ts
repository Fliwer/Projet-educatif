// Connecteur MCP de Lumo : les outils que l'assistant IA du parent (Claude) peut utiliser.
// Lancé par Claude Desktop en local (transport stdio). Ne rien écrire sur stdout : réservé au protocole.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { schemaQuetesPedagogiques } from "./formats.ts";
import { preparerBrouillon } from "./parents.ts";
import { z } from "zod";
import {
  UNIVERS,
  ajouterEnfant,
  listerEnfants,
  niveau,
  progression,
  trouverEnfant,
  verifierQuetes,
} from "./logic.ts";

export function creerServeurMcp(parentId = 1, adresseApp = process.env.LUMO_URL ?? "http://localhost:4321") {
  const ADRESSE_APP = adresseApp;

  const server = new McpServer({ name: "lumo", version: "0.1.0" });

  function texte(t: string) {
    return { content: [{ type: "text" as const, text: t }] };
  }

  function erreur(t: string) {
    return { content: [{ type: "text" as const, text: t }], isError: true };
  }

  server.registerTool(
    "lister_enfants",
    {
      title: "Lister les enfants",
      description:
        "Liste les enfants du parent dans Lumo, avec leur code de connexion, leur niveau et leur univers.",
      inputSchema: {},
    },
    async () => {
      const enfants = listerEnfants(parentId).map((e) => ({
        prenom: e.prenom,
        code: e.code,
        univers: e.univers,
        niveau: niveau(e).niveau,
        soirs_d_affilee: e.soirs,
      }));
      return texte(JSON.stringify({ enfants, app_enfant: ADRESSE_APP }, null, 2));
    },
  );

  server.registerTool(
    "ajouter_enfant",
    {
      title: "Ajouter un enfant",
      description:
        "Ajoute un profil enfant (prénom ou pseudonyme uniquement, jamais de nom de famille). " +
        "Renvoie un code à 6 caractères que l'enfant tape sur sa tablette pour se connecter.",
      inputSchema: {
        prenom: z.string().min(1).max(30).describe("Prénom ou pseudonyme de l'enfant"),
        univers: z.enum(UNIVERS).describe("Univers choisi par l'enfant : espace (fusée) ou nature (jardin)"),
      },
    },
    async ({ prenom, univers }) => {
      const e = ajouterEnfant(prenom, univers, parentId);
      return texte(
        `Profil créé pour ${e.prenom}. Code de connexion : ${e.code}. App enfant : ${ADRESSE_APP}`,
      );
    },
  );

  server.registerTool(
    "creer_quetes",
    {
      title: "Préparer des quêtes à valider",
      description:
        "Cet outil prépare uniquement un brouillon. Renvoie le lien privé au parent pour qu'il vérifie et valide dans son navigateur. Fournis la notion et un extrait exact de la leçon pour chaque quête. Ne prétends jamais que les jeux sont publiés avant cette validation. " +
        "Crée des quêtes (séries d'exercices-jeux) pour un enfant avec un TDAH, à partir des devoirs ou d'une leçon " +
        "photographiés par le parent.\n" +
        "La validation finale se fait uniquement dans le formulaire parent. Ne valide jamais ce formulaire à sa place.\n" +
        "Règles pédagogiques : 1 à 3 quêtes ; 5 à 8 questions par quête ; une seule notion par quête ; " +
        "VARIE les types de jeux dans une même quête (au moins 3 types différents quand c'est possible : par exemple " +
        "associer pour démarrer, puis choix, ordre, vrai_faux, et texte ou dictee pour finir), pour garder l'attention ; " +
        "consignes très courtes et concrètes, adaptées à un enfant de 6 à 12 ans ; " +
        "s'entraîner sur la même notion que les devoirs, sans recopier les réponses des devoirs ; " +
        "ne jamais mettre la réponse dans la consigne. Titres ludiques liés à l'univers de l'enfant " +
        "(espace : « Fusée des ×7 » ; nature : « Jardin du texte »).",
      inputSchema: {
        enfant: z.string().describe("Prénom ou code de l'enfant"),
        quetes: schemaQuetesPedagogiques,
      },
    },
    async ({ enfant, quetes }) => {
      const e = trouverEnfant(enfant, parentId);
      if (!e)
        return erreur(`Enfant « ${enfant} » introuvable. Utilise lister_enfants pour voir les profils.`);
      const problemes = verifierQuetes(quetes);
      if (problemes.length > 0) return erreur("Quêtes refusées, à corriger :\n- " + problemes.join("\n- "));
      try {
        const jeton = preparerBrouillon(parentId, e, quetes);
        return texte(
          `Brouillon préparé. Le parent doit ouvrir ${ADRESSE_APP}/parent/brouillons/${jeton} pour vérifier et valider. Rien n'est encore envoyé à l'enfant. Ce lien privé expire après 24 heures.`,
        );
      } catch (probleme) {
        return erreur(probleme instanceof Error ? probleme.message : "Brouillon invalide");
      }
    },
  );

  server.registerTool(
    "voir_progression",
    {
      title: "Voir la progression",
      description:
        "Résume la soirée (ou les derniers jours) d'un enfant : quêtes faites, questions réussies du premier coup, " +
        "questions difficiles, niveau et soirs d'affilée. Présente le résultat au parent de façon positive et brève, " +
        "et propose si utile de préparer des exercices sur les notions difficiles.",
      inputSchema: {
        enfant: z.string().describe("Prénom ou code de l'enfant"),
        jours: z
          .number()
          .int()
          .min(1)
          .max(30)
          .default(1)
          .describe("Nombre de jours à résumer (1 = aujourd'hui)"),
      },
    },
    async ({ enfant, jours }) => {
      const e = trouverEnfant(enfant, parentId);
      if (!e)
        return erreur(`Enfant « ${enfant} » introuvable. Utilise lister_enfants pour voir les profils.`);
      return texte(JSON.stringify(progression(e, jours), null, 2));
    },
  );

  return server;
}
