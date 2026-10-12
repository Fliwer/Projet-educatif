import { finMissionVue } from "./fin-mission.js";
const app = document.getElementById("app");
const changer = document.getElementById("changer-apercu");
let revision = false;
function afficher() {
  app.innerHTML = finMissionVue(revision);
  document.getElementById("continuer-fin").onclick = () => {
    location.href = "/";
  };
  changer.textContent = revision ? "Voir une mission" : "Voir un entraînement";
}
changer.onclick = () => {
  revision = !revision;
  afficher();
};
afficher();
