import { icone, illustration, platSvg } from "./monde-art.js";
import "./monde-mouvement.js";

const h = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const rubriques = [
  ["avatar", "Mon avatar"],
  ["cadeau", "Ma collection"],
  ["carnet", "Mes progrès"],
];
const couleurs = {
  violet: ["Violet", "#9D89D2"],
  bleu: ["Bleu", "#64AAD9"],
  rose: ["Rose", "#D991BC"],
  vert: ["Vert", "#76BA9E"],
};
function ecusson(id) {
  const dessins = {
    badge_fusee:
      '<path d="M44 70Q33 33 67 17Q89 49 61 73Z" fill="#C9BDFA" stroke="#7963B5" stroke-width="3"/><circle cx="60" cy="42" r="8" fill="#FFF"/><path d="m43 58-17 17 20-1m20-17 11 21-18-6" fill="#FFAB70"/><path d="m48 80 7-4 4 7-9 16Z" fill="#FFC84D"/>',
    badge_livre:
      '<path d="M60 34Q38 18 19 30v55q21-11 41 3 21-14 41-3V30Q81 18 60 34" fill="#C8E9EA" stroke="#548D96" stroke-width="3"/><path d="M60 35v52M29 43l20 4m-20 9 20 4m22-17 19-4m-19 17 19-4" stroke="#548D96" stroke-width="3"/><path d="m83 67 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#FFC84D"/>',
    badge_cristal:
      '<path d="m60 17 31 27-10 41-21 18-24-19-8-40Z" fill="#BEACEF" stroke="#8068B3" stroke-width="3"/><path d="m60 17-13 31 13 55 13-55ZM28 44l19 4 26 0 18-4" fill="#E1D6FB" stroke="#A58CCD" stroke-width="2"/>',
  };
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="#FFF5D7"/>${dessins[id] || ""}</svg>`;
}

/** Parcours personnel actif. Les anciens ateliers sont conservés dans monde.js, hors navigation. */
export async function ouvrirMonde(
  { app, afficher, appel, identifiantReponse, retour, souvenirs, pipSvg, son },
  debut,
) {
  const session = identifiantReponse();
  let onglet = debut || location.hash.split("/")[1];
  if (!rubriques.some(([id]) => id === onglet)) onglet = "avatar";
  let monde,
    commande = null,
    enCours = false,
    erreur = "",
    message = "";
  afficher('<p class="m-chargement">Ton espace se prépare…</p>', "monde");
  app.dataset.mondeSession = session;
  app.setAttribute("aria-live", "off");
  const actif = () => app.dataset.mondeSession === session && app.classList.contains("monde");
  const badgeDisponible = (id) => id === "aucun" || monde.objets.includes(id);
  const verrou = () => enCours || commande;
  function avatarVue() {
    return `<div class="e-avatar e-${monde.avatar.couleur}">${pipSvg("content", "grand").replace("Milo, ton compagnon", "Mon avatar")}${monde.avatar.badge !== "aucun" ? `<span class="e-badge-porte">${ecusson(monde.avatar.badge)}</span>` : ""}</div>`;
  }
  async function charger() {
    try {
      const resultat = await appel("/api/monde");
      if (!actif()) return;
      monde = resultat;
      rendre();
    } catch {
      if (!actif()) return;
      app.innerHTML =
        '<section class="m-chargement"><h1>Ton espace t’attend</h1><p>La connexion fait une pause.</p><button class="m-btn" id="e-recharger">Réessayer</button><button class="m-btn m-secondaire" id="e-retour">Mes quêtes</button></section>';
      app.querySelector("#e-recharger").onclick = charger;
      app.querySelector("#e-retour").onclick = retour;
    }
  }
  async function envoyer(donnees) {
    if (enCours || (donnees && commande)) return;
    if (donnees) commande = { ...donnees, version: monde.version, requete_id: identifiantReponse() };
    if (!commande) return;
    const focus = document.activeElement?.id;
    enCours = true;
    erreur = "";
    rendre();
    try {
      const resultat = await appel("/api/monde/actions", { method: "POST", body: JSON.stringify(commande) });
      if (!actif()) return;
      monde = resultat.monde;
      message = resultat.message;
      commande = null;
      son("clic");
    } catch (e) {
      if (!actif()) return;
      erreur = e.message || "La connexion fait une pause.";
      if (e.statut >= 400 && e.statut < 500) {
        commande = null;
        try {
          monde = await appel("/api/monde");
        } catch {
          erreur = "Reviens dans ton espace pour actualiser ta collection.";
        }
      }
    } finally {
      enCours = false;
      if (actif()) {
        rendre();
        if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
      }
    }
  }
  function avatarPage() {
    return `<section class="e-hero"><div class="e-portrait"><span class="e-etoile e-etoile-a">✦</span>${avatarVue()}<span class="e-etoile e-etoile-b">✧</span><span class="e-signature">${h(monde.prenom)}</span></div><div class="e-personnaliser"><span class="m-eyebrow">Un petit personnage à ton image</span><h1 id="m-titre" tabindex="-1">Ici, c’est chez toi.</h1><p>Choisis tes couleurs. Porte tes découvertes.<br>Milo t’accompagne dans tes missions.</p><fieldset><legend>Ma couleur</legend><div class="e-couleurs">${Object.entries(
      couleurs,
    )
      .map(
        ([id, [nom, c]]) =>
          `<button id="e-couleur-${id}" data-couleur="${id}" style="--teinte:${c}" aria-label="${nom}" aria-pressed="${monde.avatar.couleur === id}" ${verrou() ? "disabled" : ""}><span></span>${nom}</button>`,
      )
      .join(
        "",
      )}</div></fieldset><fieldset><legend>Mon écusson</legend><div class="e-ecussons"><button id="e-badge-aucun" data-badge="aucun" aria-pressed="${monde.avatar.badge === "aucun"}" ${verrou() ? "disabled" : ""}>Sans écusson</button>${monde.catalogue.cadeaux
      .filter((c) => c.id.startsWith("badge_") && badgeDisponible(c.id))
      .map(
        (c) =>
          `<button id="e-porter-${c.id}" data-badge="${c.id}" aria-label="Porter ${h(c.nom)}" aria-pressed="${monde.avatar.badge === c.id}" ${verrou() ? "disabled" : ""}>${ecusson(c.id)}</button>`,
      )
      .join(
        "",
      )}</div></fieldset><button class="e-lien" data-nav="cadeau">Découvrir ma collection →</button></div></section><section class="e-compagnon">${pipSvg("content", "petit")}<div><h2>Une étape à la fois, avec Milo</h2><p>Chaque mission terminée est une nouvelle découverte.</p></div><button class="m-btn" data-retour>Retrouver mes quêtes</button></section>`;
  }
  function collectionPage() {
    const objets = monde.catalogue.cadeaux.filter((c) => c.id.startsWith("badge_"));
    const anciens = monde.catalogue.cadeaux.filter(
      (c) => !c.id.startsWith("badge_") && monde.objets.includes(c.id),
    );
    return `<section class="e-titre"><div><span class="m-eyebrow">Mes petites découvertes</span><h1 id="m-titre" tabindex="-1">Ma collection</h1><p>Choisis un écusson, puis porte-le sur ton avatar.</p></div><span class="e-credit">${icone("cadeau")} ${monde.cadeaux_disponibles} cadeau${monde.cadeaux_disponibles > 1 ? "x" : ""} à choisir</span></section><div class="e-collection">${objets
      .map((c) => {
        const acquis = monde.objets.includes(c.id);
        return `<article class="e-objet"><div class="e-objet-art">${ecusson(c.id)}</div><span class="m-eyebrow">${acquis ? "Dans ma collection" : "Un cadeau de mission"}</span><h2>${h(c.nom)}</h2><p>${h(c.detail)}</p>${acquis ? `<button class="m-btn m-secondaire" id="e-porter-${c.id}" data-badge="${c.id}" ${verrou() || monde.avatar.badge === c.id ? "disabled" : ""}>${monde.avatar.badge === c.id ? "Sur mon avatar" : "Porter cet écusson"}</button>` : monde.cadeaux_disponibles >= c.prix ? `<button class="m-btn" id="e-cadeau-${c.id}" data-cadeau="${c.id}" ${verrou() ? "disabled" : ""}>Choisir · ${c.prix} cadeau</button>` : '<button class="m-btn m-secondaire" data-retour>Faire une mission</button>'}</article>`;
      })
      .join(
        "",
      )}</div><p class="e-note">Un cadeau par mission terminée. Tu peux prendre ton temps et te tromper en apprenant.</p>${anciens.length ? `<details class="e-souvenirs"><summary>Mes objets précédents · ${anciens.length}</summary><div class="e-anciens">${anciens.map((c) => `<div>${illustration(c.id)}<span>${h(c.nom)}</span></div>`).join("")}</div></details>` : ""}${monde.souvenirs ? '<button class="e-lien" id="e-souvenirs">Retrouver mes souvenirs de la chambre →</button>' : ""}`;
  }
  function carnetPage() {
    const p = monde.progres;
    return `<section class="e-titre"><div><span class="m-eyebrow">Petit à petit, j’avance</span><h1 id="m-titre" tabindex="-1">Mon carnet de progrès</h1><p>Les missions que tu explores avec Milo.</p></div></section><div class="e-chiffres"><article><strong>${p.missions_terminees}</strong><span>missions terminées</span></article><article><strong>${p.questions_essayees}</strong><span>questions essayées dans tes missions conservées</span></article></div><section class="e-journal"><h2>Mes dernières missions</h2>${p.missions.length ? p.missions.map((q) => `<article><span class="e-mission-icone">${icone(q.statut === "terminee" ? "check" : "carnet")}</span><div><span class="m-eyebrow">${h(q.matiere)}</span><h3>${h(q.titre)}</h3><p>${Number(q.essayees)} / ${Number(q.total)} questions essayées</p></div><span class="e-etat">${q.statut === "terminee" ? "Terminée" : q.essayees ? "En cours" : "À explorer"}</span></article>`).join("") : "<p>Ta première aventure commencera avec une leçon envoyée par tes parents.</p>"}<button class="m-btn" data-retour>Retrouver mes quêtes</button></section>${monde.creations.length ? `<details class="e-souvenirs"><summary>Mes créations précédentes · ${monde.creations.length}</summary><div class="e-anciens">${monde.creations.map((c) => `<div>${platSvg(c.recette, c.decoration, c.motifs)}<span>${h(monde.catalogue.recettes.find((r) => r.id === c.recette)?.nom || "Ma création")}</span></div>`).join("")}</div></details>` : ""}`;
  }
  function rendre() {
    if (!actif() || !monde) return;
    const scroll = window.scrollY;
    history.replaceState(null, "", "#mon-monde/" + onglet);
    app.innerHTML = `<div class="m-shell e-shell"><header class="m-header"><button class="m-marque" data-retour aria-label="Lumo, retour aux quêtes">Lumo</button><span class="m-header-texte">Mon espace</span><button class="m-retour e-retour" data-retour>${icone("fleche")} Mes quêtes</button></header><nav class="m-nav" aria-label="Mon espace personnel">${rubriques.map(([id, nom]) => `<button data-nav="${id}" class="${onglet === id ? "selectionne" : ""}" ${onglet === id ? 'aria-current="page"' : ""} ${verrou() ? "disabled" : ""}>${icone(id === "avatar" ? "soleil" : id)}<span>${nom}</span></button>`).join("")}</nav><div class="e-statut ${erreur ? "e-erreur" : ""}" role="status" aria-live="polite">${h(enCours ? "Enregistrement…" : erreur || message)}${commande && !enCours ? '<button id="e-reessayer" class="m-btn">Réessayer</button>' : ""}</div>${{ avatar: avatarPage, cadeau: collectionPage, carnet: carnetPage }[onglet]()}<footer class="m-footer">Ton espace, à ton rythme. Avec Milo.</footer></div>`;
    app.querySelectorAll("[data-retour]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!enCours) retour();
        }),
    );
    app.querySelectorAll("[data-nav]").forEach(
      (b) =>
        (b.onclick = () => {
          if (verrou()) return;
          onglet = b.dataset.nav;
          message = "";
          erreur = "";
          rendre();
          app.querySelector("#m-titre")?.focus({ preventScroll: true });
          window.scrollTo(0, 0);
        }),
    );
    app
      .querySelectorAll("[data-couleur]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            envoyer({ action: "avatar", avatar: { ...monde.avatar, couleur: b.dataset.couleur } })),
      );
    app
      .querySelectorAll("[data-badge]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            envoyer({ action: "avatar", avatar: { ...monde.avatar, badge: b.dataset.badge } })),
      );
    app
      .querySelectorAll("[data-cadeau]")
      .forEach((b) => (b.onclick = () => envoyer({ action: "debloquer", cadeau: b.dataset.cadeau })));
    app.querySelector("#e-reessayer")?.addEventListener("click", () => envoyer());
    app.querySelector("#e-souvenirs")?.addEventListener("click", () => souvenirs(monde.souvenirs));
    window.scrollTo(0, scroll);
  }
  await charger();
}
