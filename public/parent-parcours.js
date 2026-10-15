// Liens privés conservés uniquement dans ce navigateur, sans requête réseau.
const cleBrouillons = "lumo-parent-brouillons-v1";
const cheminBrouillon = /^\/parent\/brouillons\/[A-Za-z0-9_-]{43}$/;
let stockageDisponible = true;
function lireLiens() {
  try {
    const donnees = JSON.parse(localStorage.getItem(cleBrouillons) || "[]");
    return (Array.isArray(donnees) ? donnees : [])
      .filter(
        (lien) =>
          lien &&
          typeof lien.chemin === "string" &&
          cheminBrouillon.test(lien.chemin) &&
          typeof lien.titre === "string" &&
          typeof lien.expire === "number" &&
          lien.expire > Date.now(),
      )
      .slice(0, 20);
  } catch {
    stockageDisponible = false;
    return [];
  }
}
function ecrireLiens(liens) {
  try {
    localStorage.setItem(cleBrouillons, JSON.stringify(liens));
  } catch {
    stockageDisponible = false;
  }
}
const repere = document.querySelector("[data-brouillon-expire]");
if (repere && cheminBrouillon.test(location.pathname)) {
  const liens = lireLiens().filter((lien) => lien.chemin !== location.pathname);
  if (repere.dataset.brouillonPublie !== "oui") {
    liens.unshift({
      chemin: location.pathname,
      titre: repere.dataset.brouillonTitre || "Exercices à vérifier",
      expire: Number(repere.dataset.brouillonExpire),
    });
  }
  ecrireLiens(liens.slice(0, 20));
}
const liste = document.getElementById("liste-brouillons");
const effacer = document.getElementById("effacer-brouillons");
function afficherLiens() {
  if (!liste) return;
  const liens = lireLiens();
  ecrireLiens(liens);
  liste.replaceChildren();
  if (!liens.length || !stockageDisponible) {
    const vide = document.createElement("p");
    vide.textContent = stockageDisponible
      ? "Aucun brouillon enregistré sur cet appareil. Ouvrez le lien donné par votre assistant pour le retrouver ici."
      : "Ce navigateur ne permet pas de conserver les liens. Gardez le lien donné par votre assistant pour retrouver votre brouillon.";
    liste.append(vide);
  }
  for (const lien of liens) {
    const a = document.createElement("a");
    a.href = lien.chemin;
    a.className = "brouillon-lien";
    const titre = document.createElement("strong");
    titre.textContent = lien.titre;
    const detail = document.createElement("small");
    detail.textContent = `Vérifier les exercices · Disponible jusqu’au ${new Date(lien.expire).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}`;
    a.append(titre, detail);
    liste.append(a);
  }
  if (effacer) effacer.hidden = !liens.length;
}
afficherLiens();
effacer?.addEventListener("click", () => {
  ecrireLiens([]);
  afficherLiens();
});
document.querySelector("[data-effacer-liens]")?.addEventListener("click", () => {
  try {
    localStorage.removeItem(cleBrouillons);
    document.getElementById("effacement-statut").textContent =
      "Les liens enregistrés dans ce navigateur ont été effacés. Vos missions restent disponibles.";
  } catch {
    document.getElementById("effacement-statut").textContent =
      "Ce navigateur ne permet pas d’effacer le stockage. Vous pouvez le vider depuis ses paramètres.";
  }
  afficherLiens();
});
document.getElementById("ouvrir-brouillon")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const erreur = document.getElementById("erreur-lien");
  try {
    const url = new URL(document.getElementById("lien-brouillon").value.trim());
    if (url.origin !== location.origin || !cheminBrouillon.test(url.pathname)) throw new Error();
    location.assign(url.pathname);
  } catch {
    erreur.textContent =
      "Utilise un lien de brouillon de ce Lumo. Si le lien vient d’une autre adresse, ouvre-le directement depuis ton assistant.";
  }
});
const validation = document.getElementById("validation");
if (validation) {
  const cases = [...document.querySelectorAll('input[name="question"]')];
  const confirmation = validation.querySelector('input[name="confirme"]');
  const bouton = validation.querySelector('button[type="submit"]');
  const compteur = document.getElementById("compteur-selection");
  function actualiserSelection() {
    const gardees = cases.filter((caseQuestion) => caseQuestion.checked);
    const missions = new Set(gardees.map((caseQuestion) => caseQuestion.value.split(":")[0])).size;
    compteur.textContent = gardees.length
      ? `${gardees.length} question${gardees.length > 1 ? "s" : ""} dans ${missions} mission${missions > 1 ? "s" : ""} pour ${validation.dataset.enfant}.`
      : "Garde au moins une question pour envoyer les exercices.";
    bouton.disabled = !gardees.length || !confirmation.checked;
  }
  for (const caseQuestion of cases)
    caseQuestion.addEventListener("change", () => {
      confirmation.checked = false;
      actualiserSelection();
    });
  confirmation.addEventListener("change", actualiserSelection);
  validation.addEventListener("submit", (event) => {
    actualiserSelection();
    if (bouton.disabled) event.preventDefault();
  });
  actualiserSelection();
}
