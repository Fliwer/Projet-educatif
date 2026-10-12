import { strict as assert } from "node:assert";
import { choisirVoixFrancaise, attendreVoixFrancaise, nombreFrancais } from "../public/voix-appareil.js";
const anglais = { name: "Natural English", lang: "en-US" },
  fr = { name: "Hortense", lang: "fr-FR" },
  frBe = { name: "Français Belgique", lang: "FR_be" };
assert.equal(choisirVoixFrancaise([anglais]), undefined, "Une voix anglaise ne sert jamais de secours");
assert.equal(choisirVoixFrancaise([anglais, fr]), fr);
assert.equal(
  choisirVoixFrancaise([anglais, frBe]),
  frBe,
  "Les langues françaises sont reconnues sans dépendre de la casse",
);
class Synth extends EventTarget {
  voix = [];
  getVoices() {
    return this.voix;
  }
}
const synth = new Synth();
const chargement = attendreVoixFrancaise(synth, 1000);
synth.voix = [anglais];
synth.dispatchEvent(new Event("voiceschanged"));
synth.voix = [anglais, fr];
synth.dispatchEvent(new Event("voiceschanged"));
assert.equal(await chargement, fr, "Attend la voix française chargée après la première lecture");
const absent = new Synth();
absent.voix = [anglais];
assert.equal(await attendreVoixFrancaise(absent, 5), undefined);
for (const [n, mot] of [
  [0, "zéro"],
  [7, "sept"],
  [8, "huit"],
  [21, "vingt et un"],
  [70, "soixante-dix"],
  [71, "soixante et onze"],
  [80, "quatre-vingts"],
  [81, "quatre-vingt-un"],
  [90, "quatre-vingt-dix"],
  [100, "cent"],
  [200, "deux cents"],
  [201, "deux cent un"],
  [999, "neuf cent quatre-vingt-dix-neuf"],
])
  assert.equal(nombreFrancais(n), mot);
console.log(
  "OK voix appareil : français obligatoire, chargement différé, absence de voix et nombres français.",
);
