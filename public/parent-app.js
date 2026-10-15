const appParent = document.querySelector(".parent-app");
if (appParent) {
  const nomsVues = ["accueil", "lecons", "enfant", "nouvelle", "aide", "profils"];
  function ouvrirVue(nom, focus = true, memoriser = true) {
    if (!nomsVues.includes(nom)) nom = "accueil";
    for (const vue of appParent.querySelectorAll("[data-page]")) vue.hidden = vue.dataset.page !== nom;
    for (const bouton of appParent.querySelectorAll("nav [data-vue]")) {
      if (bouton.dataset.vue === nom) bouton.setAttribute("aria-current", "page");
      else bouton.removeAttribute("aria-current");
    }
    if (memoriser && (location.hash.slice(1) || "accueil") !== nom) {
      history.pushState(null, "", nom === "accueil" ? location.pathname : `#${nom}`);
    }
    document.title = `${{ accueil: "Accueil", lecons: "Les leçons", enfant: "Suivi", nouvelle: "Ajouter une leçon", aide: "Aide et confidentialité", profils: "Profils enfants" }[nom]} · Lumo parents`;
    if (focus) {
      const titre = appParent.querySelector(`[data-page="${nom}"] h1`);
      titre.setAttribute("tabindex", "-1");
      titre.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
  appParent.addEventListener("click", (event) => {
    const reprise = event.target.closest("[data-preparer-reprise]");
    if (reprise) {
      ouvrirVue("nouvelle");
      document.getElementById("demande-reprise").hidden = false;
      document.getElementById("contexte-reprise").value = reprise.dataset.contexte;
      document.getElementById("demande-prete").hidden = true;
      return;
    }
    if (event.target.closest("[data-prendre-photo]")) {
      ouvrirVue("nouvelle");
      document.getElementById("photo-camera").click();
      return;
    }
    if (event.target.closest("[data-choisir-photo]")) {
      ouvrirVue("nouvelle");
      document.getElementById("photo-lecon").click();
      return;
    }
    const evitement = event.target.closest(".evitement-parent");
    if (evitement) {
      event.preventDefault();
      const titre = appParent.querySelector(".vue-parent:not([hidden]) h1");
      titre.setAttribute("tabindex", "-1");
      titre.focus();
      return;
    }
    const bouton = event.target.closest("[data-vue]");
    if (bouton) {
      ouvrirVue(bouton.dataset.vue);
      if (bouton.dataset.section) {
        const section = document.getElementById(bouton.dataset.section);
        const titre = section.querySelector("h2");
        titre.setAttribute("tabindex", "-1");
        titre.focus();
      }
    }
  });
  ouvrirVue(location.hash.slice(1), false, false);
  window.addEventListener("popstate", () => ouvrirVue(location.hash.slice(1), true, false));
  const profil = document.getElementById("profil-actif");
  const parametres = new URLSearchParams(location.search);
  const profilDemande = parametres.get("enfant");
  if (profil && [...profil.options].some((option) => option.value === profilDemande))
    profil.value = profilDemande;
  if (parametres.get("profil") === "enregistre" && document.getElementById("profil-enregistre"))
    document.getElementById("profil-enregistre").hidden = false;
  const periode = document.getElementById("periode-suivi");
  function choisirPeriode() {
    for (const bloc of appParent.querySelectorAll("[data-periode-suivi]"))
      bloc.hidden = bloc.dataset.periodeSuivi !== periode.value;
  }
  periode.addEventListener("change", () => {
    choisirPeriode();
    document.getElementById("periode-statut").textContent =
      `Suivi mis à jour : ${periode.selectedOptions[0].textContent}.`;
  });
  choisirPeriode();
  document.getElementById("annuler-reprise").addEventListener("click", () => {
    document.getElementById("demande-reprise").hidden = true;
    document.getElementById("contexte-reprise").value = "";
    document.getElementById("demande-prete").hidden = true;
  });
  const recherche = document.getElementById("recherche-missions");
  let moisChoisi = "tous";
  const normaliser = (texte) =>
    texte
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .trim();
  function filtrerMissions() {
    const filtre = appParent.querySelector('[data-filtre][aria-pressed="true"]')?.dataset.filtre || "toutes";
    const vue = appParent.querySelector('[data-page="lecons"]');
    let visibles = 0;
    let total = 0;
    const mots = normaliser(recherche.value).split(/\s+/).filter(Boolean);
    for (const mission of vue.querySelectorAll("[data-statut]")) {
      const correspond = mots.every((mot) => normaliser(mission.dataset.recherche).includes(mot));
      mission.dataset.dansPerimetre = String(
        correspond && (moisChoisi === "tous" || mission.dataset.moisMission === moisChoisi),
      );
      mission.hidden =
        (filtre !== "toutes" && mission.dataset.statut !== filtre) ||
        !correspond ||
        (moisChoisi !== "tous" && mission.dataset.moisMission !== moisChoisi);
      if (!mission.closest("[data-profil]").hidden) {
        total++;
        if (!mission.hidden) visibles++;
      }
    }
    const rechercheActive = mots.length > 0 || filtre !== "toutes";
    for (const etape of vue.querySelectorAll("[data-etape-mois]"))
      etape.hidden = ![...etape.querySelectorAll("[data-statut]")].some((m) => !m.hidden);
    for (const dossier of vue.querySelectorAll("[data-dossier-matiere]")) {
      const lecons = [...dossier.querySelectorAll("[data-statut]")].filter((m) => !m.hidden);
      // Le filtre de statut ne transforme pas l’avancement en 100 % en affichant seulement les terminées.
      const perimetre = [...dossier.querySelectorAll("[data-statut]")].filter(
        (m) => m.dataset.dansPerimetre === "true",
      );
      const terminees = perimetre.filter((m) => m.dataset.statut === "terminee").length;
      const barre = dossier.querySelector(".barre-avancement-branche");
      barre.max = Math.max(1, perimetre.length);
      barre.value = terminees;
      barre.setAttribute(
        "aria-label",
        `${dossier.querySelector(".dossier-titre strong").textContent} : ${terminees} missions terminées sur ${perimetre.length}`,
      );
      dossier.querySelector(".compteur-avancement").textContent =
        `${terminees} mission${terminees > 1 ? "s" : ""} terminée${terminees > 1 ? "s" : ""} sur ${perimetre.length}`;
      dossier.hidden = !lecons.length;
      const notions = [...new Set(lecons.map((m) => m.dataset.notionMission))];
      dossier.querySelector(".dossier-titre small").textContent =
        `${lecons.length} mission${lecons.length > 1 ? "s" : ""} · ${notions.length} notion${notions.length > 1 ? "s" : ""}`;
      const apercu = dossier.querySelector(".dossier-notions");
      apercu.replaceChildren();
      const legende = document.createElement("span");
      legende.className = "dossier-legende";
      legende.textContent = "À explorer dans ce carnet";
      apercu.append(legende);
      for (const notion of notions.slice(0, 2)) {
        const texte = document.createElement("span");
        texte.className = "notion-apercu";
        texte.textContent = notion;
        apercu.append(texte);
      }
      if (notions.length > 2) {
        const suite = document.createElement("span");
        suite.className = "autres-notions";
        suite.textContent = `Et ${notions.length - 2} autres notions`;
        apercu.append(suite);
      }
      const commencees = lecons.filter(
        (m) => m.dataset.statut !== "terminee" && m.dataset.commencee === "true",
      ).length;
      const nouvelles = lecons.filter(
        (m) => m.dataset.statut !== "terminee" && m.dataset.commencee !== "true",
      ).length;
      dossier.querySelector(".dossier-activite").textContent = commencees
        ? `${commencees} en cours`
        : nouvelles
          ? `${nouvelles} à découvrir`
          : "Missions terminées";
      if (rechercheActive && !dossier.hidden) dossier.open = true;
    }
    for (const bloc of vue.querySelectorAll(".prochaine-seance, .reprise-lecon"))
      bloc.hidden = rechercheActive || moisChoisi !== "tous";
    const missionsProfil = [...vue.querySelectorAll("[data-statut]")].filter(
      (m) => !m.closest("[data-profil]").hidden,
    );
    const bilan = missionsProfil.filter((m) => m.dataset.dansPerimetre === "true");
    const finies = bilan.filter((m) => m.dataset.statut === "terminee").length;
    const enCours = bilan.filter(
      (m) => m.dataset.statut !== "terminee" && m.dataset.commencee === "true",
    ).length;
    const aDecouvrir = bilan.length - finies - enCours;
    const camembert = document.getElementById("camembert-missions");
    camembert.dataset.vide = String(!bilan.length);
    camembert.style.setProperty("--fin-terminees", `${(finies / Math.max(1, bilan.length)) * 100}%`);
    camembert.style.setProperty(
      "--fin-encours",
      `${((finies + enCours) / Math.max(1, bilan.length)) * 100}%`,
    );
    camembert.setAttribute(
      "aria-label",
      bilan.length
        ? `${bilan.length} missions : ${finies} terminées, ${enCours} en cours, ${aDecouvrir} à découvrir. Avancement des missions, pas une mesure de maîtrise.`
        : "Aucune mission dans cette sélection",
    );
    document.getElementById("total-camembert").textContent = bilan.length;
    document.getElementById("unite-camembert").textContent = bilan.length > 1 ? "missions" : "mission";
    document.getElementById("camembert-terminees").textContent = finies;
    document.getElementById("camembert-encours").textContent = enCours;
    document.getElementById("camembert-decouvrir").textContent = aDecouvrir;
    document.getElementById("vide-camembert").hidden = bilan.length > 0;
    for (const bouton of vue.querySelectorAll("[data-mois]")) {
      bouton.hidden =
        bouton.dataset.mois !== "tous" &&
        !missionsProfil.some((m) => m.dataset.moisMission === bouton.dataset.mois);
      bouton.setAttribute("aria-pressed", String(bouton.dataset.mois === moisChoisi));
    }
    const leconsMois = missionsProfil.filter(
      (m) => moisChoisi === "tous" || m.dataset.moisMission === moisChoisi,
    );
    const branches = new Set(leconsMois.map((m) => m.dataset.matiereMission)).size;
    const nomMois = vue.querySelector('[data-mois][aria-pressed="true"]')?.textContent;
    document.getElementById("resume-mois").textContent =
      `${nomMois || "Tout le carnet"} · ${leconsMois.length} leçon${leconsMois.length > 1 ? "s" : ""} ajoutée${leconsMois.length > 1 ? "s" : ""} · ${branches} branche${branches > 1 ? "s" : ""}`;
    document.getElementById("filtre-vide").hidden = visibles > 0 || !profil || !total;
    document.getElementById("resultat-missions").textContent = total
      ? `${visibles} mission${visibles > 1 ? "s" : ""} ${rechercheActive ? "trouvée" : "rangée"}${visibles > 1 ? "s" : ""} par matière${rechercheActive ? ` sur ${total}` : ""}.`
      : "";
  }
  function choisirProfil() {
    if (!profil) return;
    for (const groupe of appParent.querySelectorAll("[data-profil]"))
      groupe.hidden = groupe.dataset.profil !== profil.value;
    const repere = profil.selectedOptions[0].dataset;
    document.getElementById("enfant-parent").value = repere.prenom;
    document.getElementById("classe-parent").value = repere.classe;
    document.getElementById("pays-parent").value = repere.pays;
    document.getElementById("aides-parent").value = repere.aides;
    const complet = Boolean(repere.classe && repere.pays);
    document.getElementById("profil-demande-resume").textContent = complet
      ? `Pour ${repere.prenom} · ${repere.classe} · ${repere.pays}. Les aides utiles enregistrées dans son profil seront ajoutées au message.`
      : `Le message concerne ${repere.prenom}. Votre assistant demandera son année scolaire et son pays s’ils manquent. Vous pouvez aussi les compléter une fois dans son profil.`;
    document.getElementById("completer-profil").hidden = complet;
    document.getElementById("demande-prete").hidden = true;
    filtrerMissions();
  }
  profil?.addEventListener("change", () => {
    moisChoisi = "tous";
    document.getElementById("demande-reprise").hidden = true;
    document.getElementById("contexte-reprise").value = "";
    choisirProfil();
  });
  choisirProfil();
  if (parametres.has("profil") || parametres.has("enfant"))
    history.replaceState(null, "", location.pathname + location.hash);
  for (const formulaire of appParent.querySelectorAll(".form-profil-parent"))
    formulaire.addEventListener("submit", () => {
      const bouton = formulaire.querySelector('button[type="submit"]');
      bouton.disabled = true;
      bouton.textContent = "Enregistrement…";
    });
  recherche.addEventListener("input", filtrerMissions);
  for (const bouton of appParent.querySelectorAll("[data-mois]"))
    bouton.addEventListener("click", () => {
      moisChoisi = bouton.dataset.mois;
      filtrerMissions();
    });
  document.getElementById("reinitialiser-recherche").addEventListener("click", () => {
    recherche.value = "";
    moisChoisi = "tous";
    for (const bouton of appParent.querySelectorAll("[data-filtre]"))
      bouton.setAttribute("aria-pressed", String(bouton.dataset.filtre === "toutes"));
    filtrerMissions();
    recherche.focus();
  });
  for (const bouton of appParent.querySelectorAll("[data-filtre]"))
    bouton.addEventListener("click", () => {
      for (const autre of appParent.querySelectorAll("[data-filtre]"))
        autre.setAttribute("aria-pressed", String(autre === bouton));
      filtrerMissions();
    });
  const fichierPhoto = document.getElementById("photo-lecon");
  const fichierCamera = document.getElementById("photo-camera");
  const image = document.getElementById("image-lecon");
  const apercu = document.getElementById("apercu-photo");
  const statut = document.getElementById("photo-statut");
  const erreurPhoto = document.getElementById("photo-erreur");
  const continuerPhoto = document.getElementById("continuer-photo");
  const resolutionPhoto = document.getElementById("photo-resolution");
  const zoneChoixPhoto = document.querySelector(".zone-photo-actions");
  let urlPhoto;
  let nomPhoto = "";
  function afficherErreurPhoto(message) {
    document.querySelector(".apercu-facultatif").open = true;
    erreurPhoto.textContent = message;
    erreurPhoto.tabIndex = -1;
    erreurPhoto.focus();
    erreurPhoto.scrollIntoView({ block: "center", behavior: "instant" });
  }
  function retirerPhoto() {
    image.removeAttribute("src");
    if (urlPhoto) URL.revokeObjectURL(urlPhoto);
    urlPhoto = undefined;
    fichierPhoto.value = "";
    fichierCamera.value = "";
    apercu.hidden = true;
    zoneChoixPhoto.hidden = false;
    continuerPhoto.disabled = true;
    resolutionPhoto.hidden = true;
    erreurPhoto.textContent = "";
    document.getElementById("demande-prete").hidden = true;
    statut.textContent = "Choisissez une photo pour voir son aperçu et la prochaine étape.";
  }
  function afficherPhoto(event) {
    const fichier = event.target.files[0];
    if (!fichier) return;
    retirerPhoto();
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(fichier.type) ||
      fichier.size > 12 * 1024 * 1024 ||
      !fichier.size
    ) {
      afficherErreurPhoto(
        !fichier.size
          ? "Ce fichier est vide. Choisissez une autre photo."
          : fichier.size > 12 * 1024 * 1024
            ? "Cette photo dépasse 12 Mo. Choisissez une version plus légère."
            : "Ce format n’est pas pris en charge. Choisissez une photo JPG, PNG ou WebP (pour une photo HEIC, exportez-la d’abord en JPG).",
      );
      return;
    }
    nomPhoto = fichier.name;
    statut.textContent = "Ouverture de votre photo…";
    urlPhoto = URL.createObjectURL(fichier);
    image.src = urlPhoto;
    apercu.hidden = false;
  }
  image.addEventListener("load", () => {
    if (!urlPhoto) return;
    continuerPhoto.disabled = false;
    zoneChoixPhoto.hidden = true;
    document.querySelector(".apercu-facultatif").open = true;
    document.getElementById("titre-photo-selectionnee").textContent = "Photo choisie. Passons à la suite.";
    document.getElementById("details-photo").textContent =
      `${nomPhoto} · ${image.naturalWidth} × ${image.naturalHeight} pixels`;
    resolutionPhoto.hidden = Math.min(image.naturalWidth, image.naturalHeight) >= 600;
    resolutionPhoto.textContent =
      "Cette image est de petite taille. Vérifiez les lettres en agrandissant l’aperçu ; si elles ne sont pas nettes, reprenez la photo. La taille seule ne permet pas de juger sa lisibilité.";
    statut.textContent =
      "Photo ouverte. Aucune analyse ni aucun envoi n’a encore eu lieu. Continuez pour préparer la demande à votre assistant.";
    const titre = document.getElementById("titre-photo-selectionnee");
    titre.focus();
    titre.scrollIntoView({ block: "start", behavior: "instant" });
  });
  fichierPhoto.addEventListener("change", afficherPhoto);
  fichierCamera.addEventListener("change", afficherPhoto);
  image.addEventListener("error", () => {
    retirerPhoto();
    afficherErreurPhoto(
      "Cette image ne peut pas être ouverte. Elle est peut-être endommagée. Choisissez une autre photo ou exportez-la à nouveau en JPG.",
    );
  });
  continuerPhoto.addEventListener("click", () => {
    const titre = document.querySelector("#preparer h2");
    titre.focus();
    titre.scrollIntoView({ block: "start", behavior: "instant" });
    if (!document.getElementById("preparer-demande").hidden)
      document.getElementById("contexte-photo").focus({ preventScroll: true });
  });
  document.getElementById("retirer-photo").addEventListener("click", retirerPhoto);
  window.addEventListener("pagehide", () => {
    if (urlPhoto) URL.revokeObjectURL(urlPhoto);
  });
}
