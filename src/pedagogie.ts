import type { QuestionEntree } from "./logic.ts";

export const CONSIGNES_PEDAGOGIQUES = `Prépare un brouillon pour un enfant du primaire, de 6 à 12 ans. Le niveau du jeu n'est pas son niveau scolaire.
Demande le niveau scolaire et les aides utiles s'ils manquent ; n'invente ni diagnostic ni niveau. Les besoins des enfants neuroatypiques varient.
À partir d'une photo : relève la notion et un extrait lisible fidèle. Signale les passages illisibles, ne les devine pas. Sans photo, indique clairement une découverte générale.
Prépare 1 à 3 missions de 5 à 8 questions. Une notion par mission, difficulté progressive, sans introduire une nouvelle notion pour rendre le jeu plus difficile.
Une seule tâche par consigne. Phrases courtes, mots concrets, formulation affirmative. Évite doubles négations, implicites, questions pièges et choix absurdes. Garde les mots de consigne cohérents.
Propose généralement 2 ou 3 choix courts et une seule réponse correcte. Commence les associations avec 2 ou 3 paires. Ne force pas la diversité au détriment de la compréhension : garde un format familier puis varie progressivement.
En histoire, géographie et sciences, préfère choisir ou associer plutôt que tester involontairement l'orthographe. Réserve la dictée à l'objectif orthographique et à une aide audio disponible.
Les six formats disponibles n'affichent ni photo de la leçon ni illustration jointe : aucun exercice ne doit nécessiter une image, une carte, un texte ou un tableau absent de sa consigne. Une référence à la leçon seule ne suffit pas.
Vérifie les calculs, les accords et toutes les réponses. Pour ordre, assure-toi qu'un seul ordre est attendu. Pour texte, évite les réponses avec plusieurs formulations possibles. Ne donne pas la réponse dans la consigne.
Les exercices ne constituent pas un diagnostic ni une preuve de maîtrise. Le parent vérifie puis valide dans son formulaire : ne publie jamais à sa place.`;

/** Alertes éditoriales, pas une certification de l'accessibilité ou du contenu. */
export function pointsAVerifier(q: QuestionEntree): string[] {
  const points: string[] = [];
  if (q.consigne.length > 110) points.push("Consigne longue : vérifier qu’une seule tâche est demandée.");
  if ((q.choix?.length ?? 0) > 3) points.push("Quatre choix : vérifier la charge de lecture.");
  if ((q.paires?.length ?? 0) > 3)
    points.push("Plus de trois associations : vérifier le nombre d’éléments à traiter.");
  if (q.type === "dictee") points.push("La dictée nécessite une voix disponible sur l’appareil.");
  return points;
}

export function supportAbsent(q: QuestionEntree): boolean {
  return /(?:observe|regarde|consulte|lis)\s+(?:bien\s+)?(?:l[’']|la\s+|le\s+|cette\s+|ce\s+)(?:image|illustration|carte|tableau|dessin|graphique)\b|(?:image|carte|tableau|dessin|texte)\s+(?:ci-dessous|ci-dessus|joint[e]?)/iu.test(
    q.consigne,
  );
}
