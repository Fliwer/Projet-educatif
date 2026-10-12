for (const bouton of document.querySelectorAll("button[data-copier]")) {
  bouton.hidden = !navigator.clipboard?.writeText;
  bouton.onclick = async () => {
    const champ = document.getElementById(bouton.dataset.copier);
    try {
      await navigator.clipboard.writeText(champ.value);
      document.getElementById("copie-statut").textContent = "Copié.";
    } catch {
      document.getElementById("copie-statut").textContent = "Sélectionne le texte pour le copier.";
    }
  };
}
