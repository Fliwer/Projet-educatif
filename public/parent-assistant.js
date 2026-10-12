// Aucune photo ni donnée parent n'est envoyée depuis cette page.
const boutonCopie = document.getElementById("copier-message");
const messageLumo = document.getElementById("message-lumo");
const statutCopie = document.getElementById("copie-statut");
if (boutonCopie && messageLumo && statutCopie) {
  boutonCopie.hidden = false;
  boutonCopie.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageLumo.value);
      statutCopie.textContent = "Message copié. Colle-le dans ton assistant et joins la photo.";
    } catch {
      messageLumo.focus();
      messageLumo.select();
      statutCopie.textContent = "Le texte est sélectionné. Utilise Copier dans le menu de ton appareil.";
    }
  });
}
