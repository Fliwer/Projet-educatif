import { finMissionVue } from "./fin-mission.js";
import { celebrerMission } from "./finale-mission.js";
const app = document.getElementById("app");
const changer = document.getElementById("changer-apercu");
let revision = false;
function afficher() {
  app.innerHTML = finMissionVue(revision);
  window.scrollTo(0, 0);
  document.getElementById("continuer-fin").onclick = () => {
    location.href = "/";
  };
  changer.textContent = revision ? "Voir une mission" : "Voir un entraînement";
}
changer.onclick = () => {
  revision = !revision;
  afficher();
};
for (const [id, univers] of [
  ["voir-decollage", "espace"],
  ["voir-fleurs", "nature"],
]) {
  document.getElementById(id).onclick = async () => {
    document.querySelectorAll("footer button").forEach((b) => (b.disabled = true));
    await celebrerMission({
      app,
      afficher: (html) => {
        app.innerHTML = html;
        window.scrollTo(0, 0);
      },
      univers,
      calme:
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.getElementById("calme-apercu").checked,
    });
    afficher();
    document.querySelectorAll("footer button").forEach((b) => (b.disabled = false));
  };
}
afficher();
