import { attendreVoixFrancaise, nombreFrancais } from "./voix-appareil.js";
const resultat = document.getElementById("voix-detectee"),
  etat = document.getElementById("etat-test");
async function detecter() {
  const voix = await attendreVoixFrancaise(window.speechSynthesis);
  resultat.textContent = voix
    ? `Voix française : ${voix.name} (${voix.lang}).`
    : "Aucune voix française disponible sur cet appareil.";
  return voix;
}
detecter();
document.getElementById("ecouter-fr").onclick = async () => {
  const voix = await detecter();
  if (!voix) {
    etat.textContent =
      "Ajoute une voix française aux réglages de ton appareil ou essaie un navigateur disposant d’une voix française.";
    return;
  }
  speechSynthesis.cancel();
  const phrase = new SpeechSynthesisUtterance(
    `${nombreFrancais(7)} fois ${nombreFrancais(8)}. Ça fait combien ?`,
  );
  phrase.voice = voix;
  phrase.lang = "fr-FR";
  phrase.rate = 0.95;
  phrase.pitch = 1;
  phrase.onstart = () => {
    etat.textContent = "Lecture en français, à vitesse normale.";
  };
  phrase.onend = () => {
    etat.textContent = "Lecture terminée. Les mots et nombres doivent être compréhensibles.";
  };
  phrase.onerror = () => {
    etat.textContent = "L’appareil n’a pas pu lire la phrase. Vérifie ses réglages de voix française.";
  };
  speechSynthesis.speak(phrase);
};
