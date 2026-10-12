import { decorMission, classeDecor } from "./decors-mission.js";
const scenes = [
  { theme: "robot", titre: "Le robot de Milo", texte: "Les réponses assemblent ton robot.", faites: 5 },
  {
    theme: "ballon",
    titre: "Le voyage en ballon",
    texte: "Les réponses donnent des couleurs au ballon.",
    faites: 5,
  },
  {
    theme: "chateau",
    titre: "La forteresse des ombres",
    texte: "Les réponses font tomber les remparts.",
    faites: 0,
  },
];
const galerie = document.getElementById("galerie");
function afficher(nouveau) {
  galerie.innerHTML = scenes
    .map(
      (s) =>
        `<article class="illustration"><h2>${s.titre}</h2><div class="scene ${classeDecor(s.theme)}">${decorMission(s.theme, s.faites, 5, nouveau === s.theme ? 1 : 0)}</div><p>${s.texte}<br><strong>${s.faites} / 5</strong></p><button class="btn" data-theme="${s.theme}"${s.faites === 5 ? " disabled" : ""}>Bonne réponse</button></article>`,
    )
    .join("");
  galerie.querySelectorAll("button[data-theme]").forEach((bouton) => {
    bouton.onclick = () => {
      const scene = scenes.find((s) => s.theme === bouton.dataset.theme);
      scene.faites = Math.min(5, scene.faites + 1);
      afficher(scene.theme);
      galerie.querySelector(`[data-theme="${scene.theme}"]`).focus({ preventScroll: true });
    };
  });
}
document.getElementById("recommencer").onclick = () => {
  scenes.forEach((s) => (s.faites = 0));
  afficher();
};
afficher();
