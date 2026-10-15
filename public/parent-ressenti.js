// Observations facultatives saisies par le parent, locales à ce navigateur.
const cleRessentis = "lumo-parent-ressentis-v1";
const libellesRessentis = {
  aise: "Il se sent à l’aise",
  variable: "Cela dépend des exercices",
  aide: "Il aimerait un coup de pouce",
};
const libellesAccompagnement = {
  seul: "Observation du parent : il a essayé seul",
  ensemble: "Observation du parent : nous l’avons fait ensemble",
  milo: "Observation du parent : il a demandé de l’aide à Milo",
};
function lireRessentis() {
  const donnees = JSON.parse(localStorage.getItem(cleRessentis) || "[]");
  return (Array.isArray(donnees) ? donnees : [])
    .filter(
      (n) =>
        n &&
        Number.isSafeInteger(n.enfant) &&
        n.enfant > 0 &&
        typeof n.matiere === "string" &&
        n.matiere.length <= 120 &&
        Object.hasOwn(libellesRessentis, n.ressenti) &&
        typeof n.le === "string" &&
        !Number.isNaN(Date.parse(n.le)),
    )
    .slice(-100);
}
for (const formulaire of document.querySelectorAll(".form-ressenti")) {
  const enfant = Number(formulaire.dataset.enfantRessenti);
  const section = formulaire.closest(".ressenti-parent");
  const statut = section.querySelector(".statut-ressenti");
  const historique = section.querySelector(".historique-ressenti");
  const effacer = section.querySelector("[data-effacer-ressentis]");
  function afficher() {
    historique.replaceChildren();
    try {
      const notes = lireRessentis()
        .filter((n) => n.enfant === enfant)
        .slice(-5)
        .reverse();
      for (const note of notes) {
        const li = document.createElement("li"),
          titre = document.createElement("strong"),
          texte = document.createElement("span"),
          date = document.createElement("small");
        titre.textContent = note.matiere;
        texte.textContent = libellesRessentis[note.ressenti];
        date.textContent = new Date(note.le).toLocaleString("fr-BE", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        li.append(titre, texte, date);
        if (Object.hasOwn(libellesAccompagnement, note.accompagnement || "")) {
          const accompagnement = document.createElement("small");
          accompagnement.textContent = libellesAccompagnement[note.accompagnement];
          li.append(accompagnement);
        }
        historique.append(li);
      }
      effacer.hidden = !notes.length;
      if (!notes.length) {
        const li = document.createElement("li");
        li.textContent = "Pas encore de ressenti noté sur cet appareil.";
        historique.append(li);
      }
    } catch {
      statut.textContent =
        "Ce navigateur ne permet pas de lire les notes. Vous pouvez en parler ensemble sans rien enregistrer.";
      effacer.hidden = true;
    }
  }
  formulaire.addEventListener("submit", (event) => {
    event.preventDefault();
    const valeurs = new FormData(formulaire),
      matiere = String(valeurs.get("matiere")),
      ressenti = String(valeurs.get("ressenti"));
    if (
      !Object.hasOwn(libellesRessentis, ressenti) ||
      ![...formulaire.elements.namedItem("matiere").options].some((o) => o.value === matiere)
    )
      return;
    try {
      const notes = lireRessentis();
      const accompagnement = String(valeurs.get("accompagnement") || "");
      notes.push({
        enfant,
        matiere,
        ressenti,
        accompagnement: Object.hasOwn(libellesAccompagnement, accompagnement) ? accompagnement : "",
        le: new Date().toISOString(),
      });
      localStorage.setItem(cleRessentis, JSON.stringify(notes.slice(-100)));
      statut.textContent = "Ressenti noté sur cet appareil. Il reste séparé des résultats des exercices.";
      formulaire.elements.namedItem("ressenti").value = "";
      formulaire.elements.namedItem("accompagnement").value = "";
      afficher();
    } catch {
      statut.textContent = "La note n’a pas pu être enregistrée dans ce navigateur.";
    }
  });
  effacer.addEventListener("click", () => {
    try {
      const restantes = lireRessentis().filter((n) => n.enfant !== enfant);
      if (restantes.length) localStorage.setItem(cleRessentis, JSON.stringify(restantes));
      else localStorage.removeItem(cleRessentis);
      afficher();
      statut.textContent =
        "Les notes de ressenti de cet enfant ont été effacées de ce navigateur. Ses exercices restent inchangés.";
    } catch {
      statut.textContent = "Les notes n’ont pas pu être effacées depuis cet écran.";
    }
  });
  afficher();
}
