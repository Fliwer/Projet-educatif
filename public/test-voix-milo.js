import { miloSvg } from "./milo.js";
document.getElementById("milo-test").innerHTML = miloSvg("content");
const bouton = document.getElementById("ecouter-milo");
const etat = document.getElementById("etat-test");
const champ = document.getElementById("code-test");
try {
  champ.value = localStorage.getItem("lumo-code") ?? "";
} catch {}
let lecteur;
bouton.onclick = async () => {
  const code = champ.value.trim();
  if (!code) {
    etat.textContent = "Indique le code du profil enfant pour écouter Milo.";
    champ.focus();
    return;
  }
  bouton.disabled = true;
  const urls = [];
  try {
    etat.textContent = "Préparation des enregistrements de Milo…";
    for (const texte of ["sept", "fois", "huit", "ça fait combien ?"]) {
      const reponse = await fetch("/api/voix", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Lumo-Code": code },
        body: JSON.stringify({ texte }),
        signal: AbortSignal.timeout(12000),
      });
      if (!reponse.ok) throw new Error("Enregistrement indisponible ou code incorrect.");
      urls.push(URL.createObjectURL(await reponse.blob()));
    }
    etat.textContent = "Ta voix Milo : sept fois huit, ça fait combien ?";
    for (const url of urls) {
      lecteur = new Audio(url);
      lecteur.playbackRate = 1;
      lecteur.preservesPitch = true;
      await new Promise((resolve, reject) => {
        lecteur.onended = resolve;
        lecteur.onerror = () => reject(new Error("Impossible de lire cet enregistrement."));
        lecteur.play().catch(reject);
      });
    }
    etat.textContent = "Écoute terminée. Est-ce bien ta voix Milo, avec sept et huit en français ?";
  } catch (erreur) {
    etat.textContent = `${erreur.message} Aucune voix de remplacement n’a été utilisée.`;
  } finally {
    urls.forEach((url) => URL.revokeObjectURL(url));
    bouton.disabled = false;
  }
};
