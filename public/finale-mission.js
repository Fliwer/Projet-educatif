import { fusee, jardin } from "./scenes-mission.js";

/** Célébration visuelle après l'enregistrement de la mission. Aucun appel réseau. */
export async function celebrerMission({ app, afficher, univers, calme, total = 5 }) {
  if (calme) return;
  const nature = univers === "nature";
  afficher(
    `<section class="finale-mission"><h1>Mission terminée !</h1><div class="scene ${nature ? "nature" : "espace"}">${nature ? jardin(total, total, total, true) : fusee(6)}</div><button class="lien" id="passer-animation">Continuer</button></section>`,
  );
  const cible = app.querySelector(nature ? ".scene" : ".groupe-fusee");
  const bouton = app.querySelector("#passer-animation");
  bouton.focus({ preventScroll: true });
  await new Promise((resolve) => {
    let fini = false;
    let minuterie;
    const terminer = () => {
      if (fini) return;
      fini = true;
      clearTimeout(minuterie);
      bouton.removeEventListener("click", terminer);
      cible.removeEventListener("animationend", finAnimation);
      resolve();
    };
    const finAnimation = (event) => {
      if (!nature && event.target === cible && event.animationName === "decolle") terminer();
    };
    bouton.addEventListener("click", terminer);
    cible.addEventListener("animationend", finAnimation);
    minuterie = setTimeout(terminer, 2400);
    if (!nature) cible.classList.add("fusee-decolle");
  });
}
