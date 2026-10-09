// Types communs, utilisables sans ouvrir la base de données.
export const TYPES_QUESTION = ["choix", "texte", "vrai_faux", "ordre", "associer", "dictee"] as const;
export type TypeQuestion = (typeof TYPES_QUESTION)[number];
