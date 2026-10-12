export function choisirVoixFrancaise(voix) {
  const score = (v) => {
    const nom = v.name.toLowerCase();
    return (
      (/natural/.test(nom) ? 100 : 0) +
      (/google|online/.test(nom) ? 30 : 0) +
      (v.lang.toLowerCase().replace("_", "-") === "fr-fr" ? 5 : 0)
    );
  };
  return voix.filter((v) => /^fr(?:[-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0];
}
export async function attendreVoixFrancaise(synth, delai = 2000) {
  if (!synth) return undefined;
  const voix = choisirVoixFrancaise(synth.getVoices());
  if (voix) return voix;
  return new Promise((resolve) => {
    let timer;
    const fini = (v) => {
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", actualiser);
      resolve(v);
    };
    const actualiser = () => {
      const voix = choisirVoixFrancaise(synth.getVoices());
      if (voix) fini(voix);
    };
    synth.addEventListener("voiceschanged", actualiser);
    timer = setTimeout(() => fini(choisirVoixFrancaise(synth.getVoices())), delai);
    actualiser();
  });
}
/** Les chiffres isolés des anciens fichiers peuvent avoir été prononcés dans une autre langue. */
export function nombreFrancais(valeur) {
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(valeur);
  const petits = [
    "zéro",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
  ];
  if (n < 17) return petits[n];
  if (n < 20) return "dix-" + petits[n - 10];
  if (n < 70) {
    const dizaine = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"][Math.floor(n / 10)],
      reste = n % 10;
    return dizaine + (reste === 1 ? " et un" : reste ? "-" + petits[reste] : "");
  }
  if (n < 80) return n === 71 ? "soixante et onze" : "soixante-" + nombreFrancais(n - 60);
  if (n < 100) return n === 80 ? "quatre-vingts" : "quatre-vingt-" + nombreFrancais(n - 80);
  const cent = Math.floor(n / 100),
    reste = n % 100;
  return (
    (cent === 1 ? "cent" : petits[cent] + " cent" + (reste ? "" : "s")) +
    (reste ? " " + nombreFrancais(reste) : "")
  );
}
