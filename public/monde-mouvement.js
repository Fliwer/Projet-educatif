// Préférence existante conservée ; sinon suivre le réglage de l'appareil.
const preferenceSysteme = matchMedia("(prefers-reduced-motion: reduce)");
let choix;
try {
  choix = localStorage.getItem("lumo-mouvements-calmes");
} catch {
  /* Stockage indisponible. */
}
function appliquer() {
  const calme = choix === null || choix === undefined ? preferenceSysteme.matches : choix === "oui";
  document.documentElement.classList.toggle("lumo-calme", calme);
}
preferenceSysteme.addEventListener("change", appliquer);
appliquer();
