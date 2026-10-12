import { z } from "zod";
import { TYPES_QUESTION } from "./types-jeux.ts";
const fragment = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((s) => !/[‖→]/u.test(s), "Séparateur réservé aux jeux");

export const schemaQuestion = z.object({
  type: z
    .enum(TYPES_QUESTION)
    .describe(
      "Type de jeu. 'choix' : 2 à 4 réponses proposées (champ choix + bonne_reponse). " +
        "'texte' : réponse courte à taper, un nombre ou un mot (bonne_reponse). " +
        "'vrai_faux' : une affirmation, l'enfant dit vrai ou faux (bonne_reponse = « Vrai » ou « Faux »). " +
        "'ordre' : remettre des morceaux dans l'ordre, des mots pour faire une phrase, des syllabes pour faire un mot, " +
        "des nombres du plus petit au plus grand, les étapes d'une histoire (champ elements, dans le BON ordre ; l'app les mélange). " +
        "'associer' : relier 2 à 5 paires, par exemple un calcul et son résultat, un mot et son contraire, un pronom et son verbe conjugué (champ paires). " +
        "'dictee' : Milo dit un mot ou une petite phrase à voix haute et l'enfant l'écrit ; les accents comptent (bonne_reponse = le mot ; la consigne ne doit PAS l'écrire).",
    ),
  consigne: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Consigne courte et simple, lue à voix haute à l'enfant"),
  choix: z.array(fragment).max(4).optional().describe("Pour 'choix' : 2 à 4 réponses, dont la bonne"),
  elements: z.array(fragment).max(8).optional().describe("Pour 'ordre' : 2 à 8 morceaux, dans le bon ordre"),
  paires: z
    .array(z.tuple([fragment, fragment]))
    .max(5)
    .optional()
    .describe("Pour 'associer' : 2 à 5 paires [gauche, droite], chaque élément unique"),
  bonne_reponse: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe("Pour 'choix', 'texte', 'vrai_faux' et 'dictee' : la bonne réponse exacte"),
});

export const schemaQuete = z.object({
  titre: z.string().trim().min(1).max(60),
  matiere: z.string().trim().min(1).max(40),
  notion: z.string().trim().min(1).max(120).optional(),
  niveau_scolaire: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .optional()
    .describe("Niveau scolaire communiqué par le parent, jamais déduit du niveau du jeu."),
  origine_contenu: z
    .enum(["lecon", "decouverte"])
    .optional()
    .describe("lecon si extrait fourni ; decouverte pour une fiche créée sans devoir source."),
  extrait_lecon: z.string().trim().min(1).max(1200).optional(),
  questions: z.array(schemaQuestion).min(1).max(12),
});
// Contrat commun : le MCP et une future API produisent les mêmes exercices.
export const schemaQuetes = z.array(schemaQuete).min(1).max(3);
export const schemaQuetesPedagogiques = z
  .array(
    schemaQuete.extend({
      notion: z.string().trim().min(1).max(120),
      extrait_lecon: z.string().trim().min(1).max(1200),
      questions: z.array(schemaQuestion).min(5).max(8),
    }),
  )
  .min(1)
  .max(3);
