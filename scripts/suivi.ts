// Affiche le résumé que reçoit le parent (outil voir_progression), sans passer par Claude.
// Usage : node scripts/suivi.ts [prénom ou code] [jours]
import { progression, trouverEnfant } from "../src/logic.ts";

const enfant = trouverEnfant(process.argv[2] ?? "Arthur");
if (!enfant) throw new Error("Enfant introuvable");
console.log(JSON.stringify(progression(enfant, Number(process.argv[3] ?? 1)), null, 2));
