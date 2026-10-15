// Aucune photo ni donnée parent n'est envoyée depuis cette page.
const formulaireDemande = document.getElementById("preparer-demande");
formulaireDemande?.addEventListener("input", (event) => {
  event.target.setCustomValidity?.("");
  document.getElementById("erreur-demande").textContent = "";
  document.getElementById("demande-prete").hidden = true;
});
formulaireDemande?.addEventListener("submit", (event) => {
  event.preventDefault();
  const donnees = new FormData(formulaireDemande);
  const lire = (nom) => String(donnees.get(nom) || "").trim();
  const contexte = document.getElementById("contexte-reprise")?.value.trim();
  document.getElementById("message-lumo").value =
    `Pour Lumo : prépare ${contexte ? "une reprise à partir des repères ci-dessous" : "des exercices à partir de la photo que je joins dans cette conversation"} pour ${lire("enfant") || "mon enfant"}.` +
    (lire("classe")
      ? ` Année scolaire : ${lire("classe")}.`
      : " Demande-moi son année scolaire si elle manque dans son profil ; ne la déduis pas de la photo.") +
    (lire("pays") ? ` Pays : ${lire("pays")}.` : " Demande-moi son pays si ce repère manque.") +
    (lire("aides") ? ` Aides utiles : ${lire("aides")}.` : "") +
    (lire("contexte_photo")
      ? `\n\nConsigne ou objectif précisé par le parent : ${lire("contexte_photo")}`
      : "") +
    (contexte ? `\n\n${contexte}` : "") +
    "\n\nUtilise le connecteur Lumo. Vérifie le profil et demande-moi si plusieurs enfants correspondent. Si le connecteur n’est pas disponible, dis-le sans prétendre avoir envoyé les exercices." +
    "\n\nAvant de créer un brouillon, vérifie la photo jointe. Si aucune photo n’est jointe et que le support est nécessaire, demande-la. Si la photo est floue, trop sombre, coupée ou illisible au point de ne pas identifier la leçon et ses consignes, explique précisément le problème et demande une nouvelle photo. N’invente pas le texte manquant et ne crée pas de brouillon tant que le support nécessaire manque." +
    "\n\nSi l’image ne contient ni devoir, ni leçon, ni consigne identifiable, explique-le et demande le bon document ou l’objectif de l’activité. Une photo de plante ou d’objet peut être un support de sciences : ne la rejette pas automatiquement, mais demande la consigne si elle manque. Si le parent souhaite une découverte générale, fais-le confirmer et indique cette origine ; ne présente pas une activité inventée comme tirée de la photo." +
    "\n\nSi le support est suffisamment lisible et l’objectif clair, respecte les consignes pédagogiques de Lumo. Signale les éventuels passages illisibles et limite les exercices aux éléments lisibles utiles. Prépare 1 à 3 missions de 5 à 8 questions liées à la leçon, avec leur extrait source. Crée un brouillon, puis donne-moi le lien pour que je vérifie et valide. Ne publie pas à ma place.";
  document.getElementById("demande-prete").hidden = false;
  document.getElementById("titre-message-pret").textContent = contexte
    ? "La demande de reprise est prête"
    : "Joignez la photo dans votre assistant";
  document.getElementById("instruction-message-pret").textContent = contexte
    ? "Copiez ce message dans votre assistant. Joignez la leçon ou le dessin si un support est nécessaire."
    : "Joignez la photo à votre conversation avec Lumo, puis copiez ce message :";
  document.getElementById("copie-statut").textContent = contexte
    ? "Message prêt. Les repères du profil et les questions à reprendre sont inclus."
    : "Message prêt. Copiez-le dans votre assistant et joignez la photo.";
  const titre = document.getElementById("titre-message-pret");
  titre.focus();
  titre.scrollIntoView({ block: "start", behavior: "instant" });
});
const boutonCopie = document.getElementById("copier-message");
const messageLumo = document.getElementById("message-lumo");
const statutCopie = document.getElementById("copie-statut");
if (boutonCopie && messageLumo && statutCopie) {
  boutonCopie.hidden = false;
  boutonCopie.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageLumo.value);
      statutCopie.textContent = document.getElementById("contexte-reprise")?.value.trim()
        ? "Message copié. Collez-le dans votre assistant pour préparer la reprise."
        : "Message copié. Collez-le dans votre assistant et joignez la photo.";
    } catch {
      messageLumo.closest("details").open = true;
      messageLumo.focus();
      messageLumo.select();
      statutCopie.textContent = "Le texte est sélectionné. Utilisez Copier dans le menu de votre appareil.";
    }
  });
}
