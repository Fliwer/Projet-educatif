const CLE = "lumo-mouvements-calmes";
const preferenceSysteme = matchMedia("(prefers-reduced-motion: reduce)");
let choix;
try {
  choix = localStorage.getItem(CLE);
} catch {
  /* Le jeu reste utilisable sans stockage local. */
}
let calme = choix === null || choix === undefined ? preferenceSysteme.matches : choix === "oui";
const abonnements = new Set();
export const mouvementsCalmes = () => calme;
export function ecouterMouvements(fn) {
  abonnements.add(fn);
  return () => abonnements.delete(fn);
}
export function choisirMouvements(valeur) {
  calme = valeur;
  choix = valeur ? "oui" : "non";
  try {
    localStorage.setItem(CLE, choix);
  } catch {
    /* Préférence conservée pour cette visite. */
  }
  document.documentElement.classList.toggle("lumo-calme", calme);
  abonnements.forEach((fn) => fn(calme));
}
document.documentElement.classList.toggle("lumo-calme", calme);
preferenceSysteme.addEventListener("change", () => {
  if (choix !== null && choix !== undefined) return;
  calme = preferenceSysteme.matches;
  document.documentElement.classList.toggle("lumo-calme", calme);
  abonnements.forEach((fn) => fn(calme));
});

/** Une séquence appartient à une scène : fermeture = annulation de tous ses mouvements. */
export function animationScene(racine) {
  const animations = new Set();
  let terminee = false;
  const finirMouvements = ecouterMouvements((calmer) => {
    if (calmer) animations.forEach((a) => a.finish());
  });
  const presente = () => !terminee && racine.isConnected && (!("open" in racine) || racine.open);
  async function jouer(element, images, options = {}) {
    if (!presente()) return false;
    if (!element || mouvementsCalmes()) return presente();
    const animation = element.animate(images, { duration: 500, easing: "ease-in-out", ...options });
    animations.add(animation);
    try {
      await animation.finished;
    } catch {
      /* Fermeture de la scène. */
    } finally {
      animations.delete(animation);
      animation.cancel();
    }
    return presente();
  }
  function detruire() {
    terminee = true;
    animations.forEach((a) => a.cancel());
    animations.clear();
    finirMouvements();
  }
  racine.addEventListener("close", detruire, { once: true });
  return { jouer, presente, detruire };
}
