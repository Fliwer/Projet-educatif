import { decorMission, classeDecor } from "./decors-mission.js";

/** Célébration visuelle après l'enregistrement de la mission. Aucun appel réseau. */
export async function celebrerMission({
  app,
  afficher,
  univers,
  theme = univers === "nature" ? "fleurs" : "fusee",
  calme,
  total = 5,
}) {
  if (calme) return;
  const anime = {
    fusee: [".groupe-fusee", "fusee-decolle", "decolle"],
    robot: [".groupe-robot", "robot-danse", "robot-danse"],
    ballon: [".groupe-ballon", "ballon-envole", "ballon-envole"],
  }[theme];
  afficher(
    `<section class="finale-mission"><h1>Mission terminée !</h1><div class="scene ${classeDecor(theme)}">${decorMission(theme, total, total, theme === "chateau" ? 0 : total, true)}</div><button class="lien" id="passer-animation">Continuer</button></section>`,
  );
  const cible = app.querySelector(anime ? anime[0] : ".scene");
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
      if (anime && event.target === cible && event.animationName === anime[2]) terminer();
    };
    bouton.addEventListener("click", terminer);
    cible.addEventListener("animationend", finAnimation);
    minuterie = setTimeout(terminer, 2400);
    if (anime) cible.classList.add(anime[1]);
  });
}
