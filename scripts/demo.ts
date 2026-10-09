// Crée des quêtes de démonstration pour Arthur (fictif), pour essayer l'app enfant sans passer par Claude.
import { creerQuetes, trouverEnfant } from "../src/logic.ts";

const arthur = trouverEnfant("LUMO01");
if (!arthur) throw new Error("Arthur (LUMO01) introuvable");

const creees = creerQuetes(arthur, [
  {
    titre: "Fusée des ×7",
    matiere: "Maths",
    questions: [
      { type: "choix", consigne: "7 × 8 = ?", choix: ["54", "56", "63"], bonne_reponse: "56" },
      { type: "choix", consigne: "7 × 3 = ?", choix: ["21", "24", "17"], bonne_reponse: "21" },
      { type: "texte", consigne: "7 × 6 = ?", bonne_reponse: "42" },
      { type: "choix", consigne: "7 × 9 = ?", choix: ["63", "56", "72"], bonne_reponse: "63" },
      { type: "texte", consigne: "7 × 5 = ?", bonne_reponse: "35" },
    ],
  },
  {
    titre: "La station des mots",
    matiere: "Français",
    questions: [
      {
        type: "associer",
        consigne: "Relie chaque mot à son contraire",
        paires: [
          ["grand", "petit"],
          ["chaud", "froid"],
          ["jour", "nuit"],
        ],
      },
      { type: "vrai_faux", consigne: "« Chat » est un nom.", bonne_reponse: "Vrai" },
      {
        type: "ordre",
        consigne: "Remets la phrase dans l'ordre",
        elements: ["Le", "chat", "dort", "au", "soleil"],
      },
      {
        type: "choix",
        consigne: "Quel mot est un verbe ?",
        choix: ["maison", "courir", "rouge"],
        bonne_reponse: "courir",
      },
      { type: "ordre", consigne: "Remets les syllabes dans l'ordre", elements: ["pa", "pil", "lon"] },
      { type: "dictee", consigne: "Écris le mot que tu entends", bonne_reponse: "école" },
    ],
  },
]);
console.log(`Quêtes de démonstration créées pour Arthur : ${creees.map((q) => q.titre).join(", ")}`);
