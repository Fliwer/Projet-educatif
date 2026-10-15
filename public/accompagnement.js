// Repères de manipulation pour les anciennes missions sans aide pédagogique préparée.
const METHODES = {
  choix: [
    "Lis les choix un par un.",
    "Compare chaque choix avec la consigne. Touche celui que tu choisis, puis Vérifier.",
  ],
  vrai_faux: [
    "Relis l’affirmation doucement.",
    "Compare l’affirmation avec ce que tu as appris. Choisis Vrai ou Faux, puis Vérifier.",
  ],
  texte: [
    "Cherche ce que la consigne te demande d’écrire.",
    "Prépare ta réponse, puis écris le mot ou le nombre dans la case. Touche Vérifier.",
  ],
  dictee: [
    "Tu peux réécouter le mot.",
    "Réécoute le mot, puis dis-le doucement. Écris les sons que tu entends et pense aux accents.",
  ],
  ordre: [
    "Cherche quel morceau vient en premier.",
    "Touche les morceaux dans l’ordre. Pour changer un morceau de place, touche-le pour le retirer, puis replace-le.",
  ],
  associer: [
    "Cherche deux éléments qui vont ensemble.",
    "Touche un élément à gauche, puis son partenaire à droite. Touche une paire pour la changer.",
  ],
  figures: [
    "Observe une figure à la fois.",
    "Compare chaque figure avec la consigne. Touche toutes celles qui conviennent, puis Vérifier.",
  ],
  diagonales: [
    "Une diagonale relie deux sommets qui ne sont pas voisins.",
    "Choisis un sommet, puis le sommet opposé. Fais la même chose avec les deux sommets restants.",
  ],
};

export function accompagnement(q) {
  const methode = METHODES[q.type] ?? METHODES.texte;
  return { indice: q.indice || methode[0], aide: q.aide || methode[1] };
}

export function reperesMission(quete) {
  return [...new Set(quete.questions.map((q) => (METHODES[q.type] ?? METHODES.texte)[1]))];
}
