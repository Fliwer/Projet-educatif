import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const lecture = source.slice(source.indexOf("async function parler("), source.indexOf("function signalerVoixManquante("));
async function scenario({ indisponible = false, interrompre = false, echecLecture = false, muet = false, texte = ["sept", "fois", "huit"] } = {}) {
  let notices = 0;
  const joues = [];
  const contexte = {
    sonActif: !muet, voixServeur: true, demandeVoix: 0,
    taire() {}, morceauxVoix: texte => [texte],
    chargerVoix: async texte => {
      if (indisponible) throw new Error("404");
      if (interrompre) contexte.demandeVoix++;
      return texte;
    },
    jouerMorceau: async url => {
      if (echecLecture) throw new Error("audio");
      joues.push(url);
    },
    $: () => ({ remove() {} }),
    signalerVoixManquante: () => notices++,
    // Tout recours à la synthèse du navigateur doit faire échouer le test.
    speechSynthesis: { speak() { throw new Error("Voix navigateur interdite"); } },
    window: { speechSynthesis: { speak() { throw new Error("Voix navigateur interdite"); } } },
  };
  const parler = runInNewContext(lecture + "\nparler", contexte);
  await parler(texte);
  return { notices, joues };
}
assert.deepEqual(await scenario(), { notices: 0, joues: ["sept", "fois", "huit"] });
assert.deepEqual(await scenario({ indisponible: true }), { notices: 1, joues: [] });
assert.deepEqual(await scenario({ interrompre: true }), { notices: 0, joues: [] });
assert.deepEqual(await scenario({ echecLecture: true }), { notices: 1, joues: [] });
const accueil = ["Bonjour Arthur !", "On fait une mission ensemble ?"];
assert.deepEqual(await scenario({ texte: accueil }), { notices: 0, joues: accueil });
assert.deepEqual(await scenario({ texte: accueil, indisponible: true }), { notices: 1, joues: [] });
assert.deepEqual(await scenario({ texte: accueil, muet: true }), { notices: 0, joues: [] });
console.log("OK lecture Milo : fichiers enregistrés, absence de secours navigateur, interruption et erreur audio.");
