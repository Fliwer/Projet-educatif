import { illustration, platSvg, icone, bolSvg, decorJardinSvg } from "./monde-art.js";
import { ateliers } from "./monde-jeux.js";
import { dessinerPotager, brancherPotager } from "./monde-potager.js";

const h = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const onglets = [
  ["jardin", "Mon potager"],
  ["cuisine", "Ma cuisine"],
  ["cadeau", "Mes cadeaux"],
  ["carnet", "Mes créations"],
];
const finitions = [
  ["fleurs", "Petites fleurs"],
  ["etoiles", "Étoiles dorées"],
  ["coeur", "Joli cœur"],
];

/** Un écran isolé, alimenté uniquement par l'état validé du serveur. */
export async function ouvrirMonde(
  { app, afficher, appel, identifiantReponse, retour, souvenirs, pipSvg, son },
  debut,
) {
  const session = identifiantReponse();
  const fragment = location.hash.split("/")[1];
  let onglet = debut || (onglets.some(([id]) => id === fragment) ? fragment : "jardin");
  let monde,
    message = "",
    erreur = "",
    attente = false,
    envoi = null,
    suiteEnvoi,
    nettoyerPotager,
    outil = "fraise";
  const actif = () => app.dataset.mondeSession === session && app.classList.contains("monde");
  afficher('<div class="m-chargement" role="status">Ton petit monde se prépare…</div>', "monde");
  app.dataset.mondeSession = session;
  app.setAttribute("aria-live", "off");

  const disponible = (id) => ["fraise", "carotte"].includes(id) || monde.objets.includes(id);
  const recetteDe = (id) => monde.catalogue.recettes.find((r) => r.id === id);
  const bouton = (texte, attrs = "", secondaire = false) =>
    `<button class="m-btn${secondaire ? " m-secondaire" : ""}" ${attrs} ${attente || envoi ? "disabled" : ""}>${texte}</button>`;
  const lienOnglet = (id, texte) => bouton(texte, `data-nav="${id}"`, true);
  const jeux = ateliers({ lire: () => monde, dialogue, agir, son, pipSvg, naviguer, celebrerPlat });

  async function charger() {
    try {
      const donnees = await appel("/api/monde");
      if (!actif()) return;
      monde = donnees;
      rendre();
    } catch (e) {
      if (!actif()) return;
      app.innerHTML =
        '<section class="m-chargement"><h1>Ton monde t’attend</h1><p>La connexion fait une pause. Tes créations sont conservées.</p><button class="m-btn" id="m-recharger">Réessayer</button><button class="m-btn m-secondaire" id="m-retour">Mes quêtes</button></section>';
      app.querySelector("#m-recharger").onclick = charger;
      app.querySelector("#m-retour").onclick = retour;
    }
  }
  function naviguer(id) {
    if (attente || envoi) return;
    onglet = id;
    erreur = "";
    rendre();
    app.querySelector("#m-titre")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function agir(donnees, apres) {
    if (attente || envoi) return;
    envoi = { ...donnees, version: monde.version, requete_id: identifiantReponse() };
    suiteEnvoi = apres;
    await envoyer();
  }
  async function envoyer(apres = suiteEnvoi) {
    if (attente || !envoi) return;
    const commande = envoi;
    const focusId = document.activeElement?.id;
    attente = true;
    erreur = "";
    rendre();
    try {
      const resultat = await appel("/api/monde/actions", { method: "POST", body: JSON.stringify(commande) });
      if (!actif()) return;
      monde = resultat.monde;
      message = resultat.message;
      envoi = null;
      son(["recolter", "dresser", "debloquer"].includes(commande.action) ? "bravo" : "clic");
    } catch (e) {
      if (!actif()) return;
      if (e.statut >= 400 && e.statut < 500) {
        // Une autre tablette a pu modifier le monde : relecture, sans rejouer le geste.
        envoi = null;
        erreur = e.message;
        try {
          monde = await appel("/api/monde");
        } catch {
          erreur = "La connexion fait une pause. Reviens dans ton monde pour l'actualiser.";
        }
      } else {
        erreur = "La connexion fait une pause. Ta création t'attend, tu peux réessayer.";
      }
    } finally {
      attente = false;
      if (actif()) {
        rendre();
        const cible = focusId && document.getElementById(focusId);
        if (cible && !cible.disabled) cible.focus({ preventScroll: true });
        else app.querySelector("#m-statut")?.focus({ preventScroll: true });
      }
    }
    if (actif() && !erreur && !envoi) {
      suiteEnvoi = undefined;
      apres?.();
    }
  }

  function dialogue(titre, contenu, branche) {
    const ancienFocus = document.activeElement;
    const d = document.createElement("dialog");
    d.className = "m-dialogue";
    d.setAttribute("aria-labelledby", "m-dialogue-titre");
    d.innerHTML = `<button class="m-fermer" aria-label="Fermer" autofocus>×</button><h2 id="m-dialogue-titre">${h(titre)}</h2>${contenu}`;
    app.append(d);
    d.querySelector(".m-fermer").onclick = () => d.close();
    d.addEventListener(
      "close",
      () => {
        d.remove();
        if (ancienFocus?.isConnected) ancienFocus.focus({ preventScroll: true });
      },
      { once: true },
    );
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    });
    branche?.(d);
    d.showModal();
  }
  function celebrerCadeau(id) {
    const item = monde.catalogue.cadeaux.find((c) => c.id === id);
    dialogue(
      "Ce cadeau est à toi !",
      `<div class="m-revelation">${illustration(id)}</div><h3>${h(item.nom)}</h3><p>${h(item.detail)}</p><button class="m-btn" id="m-utiliser-cadeau">Aller au jardin ${icone("jardin")}</button>`,
      (d) => {
        d.querySelector("#m-utiliser-cadeau").onclick = () => {
          d.close();
          naviguer("jardin");
        };
      },
    );
  }
  function celebrerPlat(id, deco, motifs) {
    dialogue(
      "Le goûter est servi !",
      `<div class="j-pique-nique"><div class="j-milo-fete">${pipSvg("content", "grand")}<span>Oh, c'est pour moi ?!</span></div><div class="j-nappe">${platSvg(id, deco, motifs)}</div><span class="j-confettis">✦　✧　✦</span></div><h3>${h(recetteDe(id).nom)}</h3><p>Du jardin au goûter : c'est toi qui l'as fait !<br>Ton décor est conservé dans ton carnet.</p><button class="m-btn" id="m-voir-carnet">Garder ce souvenir ${icone("carnet")}</button>`,
      (d) => {
        d.classList.add("j-dialogue", "j-dialogue-fete");
        d.querySelector("#m-voir-carnet").onclick = () => {
          d.close();
          naviguer("carnet");
        };
      },
    );
  }

  function jardin() {
    return dessinerPotager(monde, { pipSvg, outil, bloque: Boolean(attente || envoi) });
  }
  async function actualiserPotager() {
    if (attente || envoi || !actif() || onglet !== "jardin") return;
    const precedent = monde;
    try {
      const resultat = await appel("/api/monde");
      if (!actif() || attente || envoi || monde !== precedent || onglet !== "jardin") return;
      const focusId = document.activeElement?.id;
      monde = resultat;
      rendre();
      if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    } catch {
      /* La prochaine échéance réessaiera ; le jardin reste disponible. */
    }
  }
  function cuisine() {
    const prep = monde.preparation;
    const r = prep && recetteDe(prep.recette);
    return `<section class="m-jardin-titre"><div><span class="m-eyebrow">La récolte devient une création</span><h1 id="m-titre" tabindex="-1">À toi, chef !</h1></div>${lienOnglet("jardin", "Au jardin")}</section>
    <section class="m-cuisine-scene"><div class="m-cuisine-fenetre">${decorJardinSvg(monde.ambiance === "soir")}</div><div class="m-etagere"><span>${illustration("fraise")}</span><span>${illustration("carotte")}</span><span>${illustration("pousse")}</span></div><div class="m-cuisine-milo">${pipSvg("content", "grand")}<p>${prep ? "Ta recette t'attend, chef !" : "Un bol, une cuillère… et tes idées !"}</p></div><div class="m-plan-travail">${prep ? `<div class="m-recette-reprise">${prep.etape === 0 ? bolSvg() : platSvg(r.id)}<div><span class="m-eyebrow">Ton goûter en cours</span><h2>${h(r.nom)}</h2>${bouton(prep.etape === 0 ? "Reprendre ma cuillère" : "Décorer mon plat", 'id="m-reprendre-recette"')}</div></div>` : `<div class="m-bol-attend">${bolSvg()}<span>Qu'est-ce qu'on prépare ?</span></div>`}</div></section>
    <div class="m-recettes">${monde.catalogue.recettes
      .map((r) => {
        const acces = disponible(r.culture),
          assez = monde.panier[r.culture] >= r.quantite;
        return `<article class="m-recette ${!acces ? "m-recette-fermee" : ""}"><div class="m-recette-image">${platSvg(r.id)}</div><div class="m-recette-info"><h2>${h(r.nom)}</h2><p>${h(r.detail)}</p><span class="m-ingredients">${illustration(r.culture)} ${monde.panier[r.culture]} / ${r.quantite}</span>${!acces ? lienOnglet("cadeau", "Trouver ces graines") : prep ? '<span class="m-petit">Après ton goûter en cours</span>' : assez ? bouton("À moi de cuisiner", `data-recette="${r.id}" id="m-recette-${r.id}"`) : lienOnglet("jardin", "Cueillir au jardin")}</div></article>`;
      })
      .join("")}</div>`;
  }
  function cadeaux() {
    return `<section class="m-titre-section"><div><span class="m-eyebrow">De nouvelles possibilités</span><h1 id="m-titre" tabindex="-1">Un cadeau qui te ressemble</h1><p>Chaque mission terminée te permet d'en choisir un.</p></div><div class="m-compteur">${illustration("cadeau")}<strong>${monde.cadeaux_disponibles}</strong><span>cadeau${monde.cadeaux_disponibles > 1 ? "x" : ""} à choisir</span></div></section><div class="m-cadeaux">${monde.catalogue.cadeaux
      .map((c) => {
        const acquis = monde.objets.includes(c.id);
        const estDecor = ["guirlande", "fontaine"].includes(c.id);
        return `<article class="m-carte m-cadeau ${acquis ? "m-acquis" : ""}"><div class="m-cadeau-art">${illustration(c.id)}${acquis ? '<span class="m-sceau">' + icone("check") + " À toi</span>" : monde.objectif === c.id ? '<span class="m-sceau">Mon prochain cadeau</span>' : ""}</div><span class="m-eyebrow">${h(c.categorie)}</span><h2>${h(c.nom)}</h2><p>${h(c.detail)}</p>${acquis ? (estDecor ? bouton(monde.decors.includes(c.id) ? "Ranger ce décor" : "Installer au jardin", `data-decor="${c.id}" id="m-decor-${c.id}"`, true) : lienOnglet("jardin", "Planter mes graines")) : monde.cadeaux_disponibles >= c.prix ? bouton("Ouvrir ce cadeau", `data-cadeau="${c.id}" id="m-cadeau-${c.id}"`) : monde.objectif === c.id ? bouton("Faire une mission", "data-quetes") : bouton("Je choisis celui-ci", `data-objectif="${c.id}" id="m-objectif-${c.id}"`, true)}</article>`;
      })
      .join(
        "",
      )}</div><p class="m-note">Les cadeaux déjà gagnés restent à toi. Les prochains seront gardés pour agrandir ta collection.</p>`;
  }
  function carnet() {
    return `<section class="m-titre-section"><div><span class="m-eyebrow">Fait avec mes idées</span><h1 id="m-titre" tabindex="-1">Mon carnet de créations</h1><p>Des petites recettes, beaucoup de fierté.</p></div><span class="m-pastille">${monde.creations.length} / 12 créations</span></section>${monde.creations.length ? `<div class="m-creations">${monde.creations.map((c) => `<button class="m-carte m-creation" data-creation="${c.recette}:${c.decoration}">${platSvg(c.recette, c.decoration, c.motifs)}<span class="m-eyebrow">${h(finitions.find(([id]) => id === c.decoration)[1])}</span><h2>${h(recetteDe(c.recette).nom)}</h2><span class="m-petit">${c.nombre > 1 ? "Dernier décor · " : ""}Voir en grand</span></button>`).join("")}</div>` : `<section class="m-carte m-vide">${platSvg("coupe", "etoiles")}<h2>La première page est pour toi</h2><p>Récolte deux fraises, passe en cuisine et invente ta première création.</p>${lienOnglet("jardin", "Planter mes premières graines")}</section>`}<div class="m-note">Tes recettes et leurs décorations restent ici, même après une longue pause.</div>`;
  }

  function rendre() {
    if (!actif() || !monde) return;
    nettoyerPotager?.();
    nettoyerPotager = undefined;
    const scroll = window.scrollY;
    history.replaceState(null, "", "#mon-monde/" + onglet);
    app.innerHTML = `<div class="m-shell"><header class="m-header"><button class="m-marque" data-quetes aria-label="Lumo, retour aux quêtes">Lumo</button><span class="m-header-separateur"></span><span class="m-header-texte">Mon monde à moi</span><div class="m-header-actions"><button class="m-retour" data-quetes>${icone("fleche")}<span>Mes quêtes</span></button><span class="m-profil" title="${h(monde.prenom)}">${h(monde.prenom.slice(0, 1))}</span></div></header><nav class="m-nav" aria-label="Les lieux de mon monde">${onglets.map(([id, titre]) => `<button data-nav="${id}" class="${onglet === id ? "selectionne" : ""}" ${onglet === id ? 'aria-current="page"' : ""} ${attente || envoi ? "disabled" : ""}>${icone(id)}<span>${titre}</span>${id === "cadeau" && monde.cadeaux_disponibles ? '<b class="m-badge">' + monde.cadeaux_disponibles + "</b>" : ""}</button>`).join("")}</nav><div id="m-statut" role="status" aria-live="polite" tabindex="-1" class="m-statut ${erreur ? "m-erreur" : attente ? "m-attente" : "m-discret"}">${attente ? "Un instant, ton monde se met à jour…" : h(erreur || message || "Bienvenue chez toi. Qu'as-tu envie de créer ?")}${envoi && !attente ? '<button class="m-btn m-secondaire" id="m-reessayer">Réessayer</button>' : ""}</div>${{ jardin, cuisine, cadeau: cadeaux, carnet }[onglet]()}<footer class="m-footer"><span>Ton monde t’attend, à ton rythme.</span>${monde.souvenirs ? '<button id="m-souvenirs">Mes souvenirs de la chambre</button>' : ""}<span>Avec Milo</span></footer></div>`;
    brancher();
    window.scrollTo(0, scroll);
  }
  function brancher() {
    if (onglet === "jardin")
      nettoyerPotager = brancherPotager(app.querySelector(".m-shell"), {
        monde,
        outilInitial: outil,
        choisirOutil: (id) => {
          outil = id;
        },
        agir,
        actualiser: actualiserPotager,
        naviguer,
        son,
        bloque: Boolean(attente || envoi),
      });
    app.querySelectorAll("[data-quetes]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!attente) retour();
        }),
    );
    app.querySelectorAll("[data-nav]").forEach((b) => (b.onclick = () => naviguer(b.dataset.nav)));
    app.querySelector("#m-reessayer")?.addEventListener("click", () => envoyer());
    app.querySelector("#m-souvenirs")?.addEventListener("click", () => {
      if (!attente && !envoi) souvenirs(monde.souvenirs);
    });
    app
      .querySelector("#m-ambiance")
      ?.addEventListener("click", () =>
        agir({ action: "ambiance", valeur: monde.ambiance === "matin" ? "soir" : "matin" }),
      );
    app
      .querySelectorAll("[data-recette]")
      .forEach((b) => (b.onclick = () => jeux.cuisine(b.dataset.recette)));
    app
      .querySelector("#m-reprendre-recette")
      ?.addEventListener("click", () => jeux.cuisine(monde.preparation.recette));
    app.querySelectorAll("[data-cadeau]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.cadeau;
          agir({ action: "debloquer", cadeau: id }, () => celebrerCadeau(id));
        }),
    );
    app
      .querySelectorAll("[data-objectif]")
      .forEach((b) => (b.onclick = () => agir({ action: "objectif", cadeau: b.dataset.objectif })));
    app.querySelectorAll("[data-decor]").forEach(
      (b) =>
        (b.onclick = () =>
          agir({
            action: "decorer",
            objet: b.dataset.decor,
            actif: !monde.decors.includes(b.dataset.decor),
          })),
    );
    app.querySelectorAll("[data-creation]").forEach(
      (b) =>
        (b.onclick = () => {
          const [id, deco] = b.dataset.creation.split(":");
          dialogue(
            recetteDe(id).nom,
            `<div class="m-revelation">${platSvg(id, deco, monde.creations.find((c) => c.recette === id && c.decoration === deco)?.motifs)}</div><p>La création de ${h(monde.prenom)} · ${h(finitions.find(([i]) => i === deco)[1])}</p>`,
          );
        }),
    );
  }
  await charger();
}
