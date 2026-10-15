const h = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export const UNIVERS_AVENTURE = {
  jardin: {
    nom: "Le jardin",
    titre: "Le jardin des découvertes",
    intro:
      "Milo prépare un jardin plein de couleurs. Sème les premières graines, explore le potager et fais fleurir le jardin.",
    lieux: ["Le coin des graines", "Le potager de Milo", "La prairie fleurie"],
    etapes: [
      "Prépare la terre et sème tes premières graines.",
      "Découvre les plantes du potager avec Milo.",
      "Fais éclore les fleurs de la prairie.",
    ],
    fin: "Les trois lieux de ton jardin sont explorés. Reviens les découvrir quand tu veux !",
  },
  espace: {
    nom: "L’espace",
    titre: "L’expédition des étoiles",
    intro:
      "Milo prépare un grand voyage. Accompagne-le de la station de départ jusqu’à une nouvelle planète.",
    lieux: ["La station de départ", "La serre lunaire", "La planète des horizons"],
    etapes: [
      "Prépare ton équipement pour le voyage.",
      "Fais une halte sous le dôme de la Lune.",
      "Explore une nouvelle planète avec Milo.",
    ],
    fin: "Les trois étapes de ton voyage sont explorées. Tu peux y retourner quand tu veux.",
  },
  medieval: {
    nom: "Le royaume",
    titre: "Le royaume de Milo",
    intro:
      "Une fête se prépare au château. Traverse le village, découvre le jardin et retrouve Milo dans la grande tour.",
    lieux: ["Le village des artisans", "Le jardin du château", "La tour des horizons"],
    etapes: [
      "Prépare la fête avec les artisans du village.",
      "Découvre le jardin au pied du château.",
      "Rejoins Milo dans la grande tour.",
    ],
    fin: "Le parcours du royaume est exploré. La fête peut commencer ! Tu peux revenir dans chaque lieu.",
  },
};
export function parcoursUnivers(quetes, aventure) {
  const monde = UNIVERS_AVENTURE[aventure] ?? UNIVERS_AVENTURE.espace;
  return [...quetes]
    .sort((a, b) => a.id - b.id)
    .map((q, i) => ({
      ...q,
      lieu: monde.lieux[i % 3],
      histoire: monde.etapes[i % 3],
      numero: i + 1,
      explore: q.statut === "terminee",
    }));
}
export function illustrationUnivers(aventure) {
  if (aventure === "jardin")
    return `<svg viewBox="0 0 720 300" role="img" aria-label="Le potager et les fleurs du jardin de Milo"><rect width="720" height="300" rx="26" fill="#e5f3e8"/><circle cx="600" cy="60" r="32" fill="#ffd476"/><path d="M0 235Q180 155 350 226T720 215V300H0Z" fill="#a8d0ac"/><path d="M0 275Q300 200 720 260V300H0Z" fill="#7ab693"/><path d="M370 300Q330 255 450 220" fill="none" stroke="#f4d6aa" stroke-width="26"/><g transform="translate(80 210)"><rect width="250" height="57" rx="15" fill="#ac8064"/><path d="M22 18h205M22 38h205" stroke="#d1a17c" stroke-width="7"/>${[40, 110, 185].map((x) => `<path d="M${x} 13v-48" stroke="#548765" stroke-width="7"/><ellipse cx="${x - 14}" cy="-24" rx="18" ry="10" transform="rotate(30 ${x - 14} -24)" fill="#6caf77"/><ellipse cx="${x + 14}" cy="-39" rx="18" ry="10" transform="rotate(-30 ${x + 14} -39)" fill="#8dc48f"/>`).join("")}</g>${[450, 520, 610].map((x, i) => `<g transform="translate(${x} ${220 - i * 14})"><path d="M0 35V-25" stroke="#548765" stroke-width="7"/><ellipse cx="14" cy="15" rx="18" ry="8" fill="#6caf77"/><g fill="${i === 1 ? "#b6a0db" : "#f2a9b5"}"><circle cx="-13" cy="-27" r="15"/><circle cx="13" cy="-27" r="15"/><circle cy="-43" r="15"/><circle cy="-13" r="15"/></g><circle cy="-27" r="12" fill="#ffdc7c"/></g>`).join("")}</svg>`;
  const espace = aventure !== "medieval";
  const paysage = espace
    ? `<rect width="720" height="300" rx="26" fill="#202d50"/><g fill="#eee5ff"><circle cx="50" cy="48" r="3"/><circle cx="205" cy="66" r="4"/><circle cx="360" cy="39" r="3"/><circle cx="550" cy="65" r="4"/><circle cx="658" cy="34" r="3"/><circle cx="400" cy="101" r="2"/></g><circle cx="590" cy="112" r="59" fill="#bbabe7"/><ellipse cx="590" cy="112" rx="82" ry="13" transform="rotate(-22 590 112)" fill="none" stroke="#ffcc76" stroke-width="12"/><path d="M0 255Q128 190 275 240T720 246V300H0Z" fill="#554c85"/><path d="M0 275Q240 225 400 266T720 266V300H0Z" fill="#7f74a7"/><g transform="translate(100 117)"><path d="M0 108V56Q24 6 48 56V108Z" fill="#faf5e6"/><circle cx="24" cy="64" r="14" fill="#bfe5ee" stroke="#a898d0" stroke-width="5"/><path d="M0 82-22 119 0 108M48 82l22 37-22-11" fill="#ffba8b"/><path d="m10 108 14 44 14-44" fill="#ffcc76"/></g><g transform="translate(295 182)"><path d="M0 75V48a65 65 0 0 1 130 0v27Z" fill="#bfe5de" opacity=".9"/><path d="M0 48h130M65-17v90" fill="none" stroke="#f7f2e7" stroke-width="5"/><path d="M44 73V40q-24-23-29-5 3 20 29 16m0-11q25-28 40-9 0 20-39 24" fill="#7dbfa1"/></g>`
    : `<rect width="720" height="300" rx="26" fill="#f8e8ce"/><circle cx="595" cy="60" r="31" fill="#ffcf75"/><path d="M0 228Q170 116 340 217T720 204V300H0Z" fill="#c2d8bd"/><path d="M0 269Q290 199 720 266V300H0Z" fill="#93bca4"/><path d="M300 300Q490 242 455 207" fill="none" stroke="#f4d6aa" stroke-width="30"/><g transform="translate(68 156)"><path d="M0 39 60-4l63 43Z" fill="#bf8190"/><rect x="12" y="37" width="100" height="72" rx="5" fill="#fff3da"/><path d="M49 109V67a17 17 0 0 1 34 0v42" fill="#b18bb6"/><rect x="19" y="50" width="19" height="24" rx="7" fill="#c5e1dc"/></g><g transform="translate(322 65)"><rect x="17" y="112" width="218" height="108" rx="12" fill="#d8c2da"/><rect x="0" y="59" width="66" height="160" rx="7" fill="#bea9ce"/><path d="m-12 59 45-56 45 56Z" fill="#b97894"/><rect x="182" y="59" width="66" height="160" rx="7" fill="#bea9ce"/><path d="m170 59 45-56 45 56Z" fill="#b97894"/><rect x="87" y="27" width="76" height="134" rx="8" fill="#c4afd4"/><path d="m73 27 52-46 52 46Z" fill="#8e739f"/><path d="M125-17V-42" stroke="#8e739f" stroke-width="5"/><path d="M128-42h38l-8 12 8 12h-38" fill="#ffd171"/><path d="M96 220v-43a30 30 0 0 1 60 0v43Z" fill="#8e739f"/><g fill="#fff3d6"><rect x="22" y="82" width="22" height="35" rx="11"/><rect x="203" y="82" width="22" height="35" rx="11"/><circle cx="125" cy="69" r="13"/></g></g>`;
  return `<svg viewBox="0 0 720 300" role="img" aria-label="${espace ? "Une fusée, une serre lunaire et une planète" : "Un village, un jardin et le château de Milo"}">${paysage}</svg>`;
}
export async function ouvrirUnivers({
  app,
  afficher,
  appel,
  identifiantReponse,
  retour,
  jouer,
  pipSvg,
  navigation = () => {},
}) {
  const session = identifiantReponse();
  afficher('<p class="u-chargement">Milo prépare tes aventures…</p>', "univers");
  app.dataset.universSession = session;
  navigation();
  const actif = () => app.dataset.universSession === session && app.classList.contains("univers");
  let monde,
    etat,
    commande = null,
    occupe = false,
    erreur = "";
  async function charger() {
    try {
      [monde, etat] = await Promise.all([appel("/api/monde"), appel("/api/moi")]);
      if (actif()) rendre();
    } catch (e) {
      if (actif()) {
        erreur = e.message || "La connexion fait une pause.";
        app.innerHTML = `<h1>Ton univers t’attend</h1><p role="status">${h(erreur)}</p><button class="btn" id="u-recharger">Réessayer</button><button class="lien" id="u-retour">Mes quêtes</button>`;
        app.querySelector("#u-recharger").onclick = charger;
        app.querySelector("#u-retour").onclick = retour;
        navigation();
      }
    }
  }
  async function choisir(aventure) {
    if (occupe) return;
    if (!commande && aventure === monde.aventure) return;
    commande ??= { action: "univers", aventure, version: monde.version, requete_id: identifiantReponse() };
    occupe = true;
    erreur = "";
    rendre();
    try {
      const r = await appel("/api/monde/actions", { method: "POST", body: JSON.stringify(commande) });
      if (!actif()) return;
      monde = r.monde;
      commande = null;
      app.dataset.aventure = monde.aventure;
    } catch (e) {
      if (!actif()) return;
      erreur = e.message || "Réessaie dans un instant.";
      if (e.statut === 409 || e.status === 409) {
        commande = null;
        try {
          monde = await appel("/api/monde");
        } catch (actualisation) {
          erreur = actualisation.message || "La connexion fait une pause. Réessaie dans un instant.";
        }
      }
    } finally {
      occupe = false;
      if (actif()) rendre();
    }
  }
  function rendre() {
    const aventure = monde.aventure,
      definition = UNIVERS_AVENTURE[aventure],
      parcours = parcoursUnivers(etat.quetes, aventure),
      explorees = parcours.filter((q) => q.explore).length;
    app.dataset.aventure = aventure;
    const prochaine = parcours.find((q) => q.statut === "en_cours") ?? parcours.find((q) => !q.explore);
    const bloque = occupe || Boolean(commande);
    const pourcentage = parcours.length ? Math.round((explorees / parcours.length) * 100) : 0;
    app.innerHTML = `<div class="u-shell">
    <header class="u-entete"><button class="lien" id="u-retour">← Mes quêtes</button><span>Lumo · Mon univers</span></header>
    <section class="u-hero" aria-labelledby="u-titre"><div class="u-hero-texte"><span class="u-surtitre">TON AVENTURE AVEC MILO</span><h1 id="u-titre">${h(definition.titre)}</h1><p>${h(definition.intro)}</p>${prochaine ? `<button class="btn u-depart" data-mission="${prochaine.id}" ${bloque ? "disabled" : ""}>${prochaine.statut === "en_cours" ? "Continuer ma mission" : "C’est parti !"}<span>${h(prochaine.lieu)} →</span></button>` : `<p class="u-invitation">${parcours.length ? "Tous les lieux sont explorés. Bravo !" : "Ton aventure commence bientôt."}</p>`}</div><div class="u-panorama">${illustrationUnivers(aventure)}<div class="u-compagnon">${pipSvg("content")}<span>On explore ensemble ?</span></div></div></section>
    <section class="u-avancee" aria-label="Tes découvertes"><div><strong>${explorees} / ${parcours.length}</strong><span>mission${parcours.length > 1 ? "s" : ""} explorée${parcours.length > 1 ? "s" : ""}</span></div><progress max="100" value="${pourcentage}" aria-label="Progression de l’aventure">${pourcentage} %</progress><span class="u-avancee-fin">${pourcentage === 100 ? "Quelle belle aventure !" : "À ton rythme, un lieu après l’autre"}</span></section>
    <section class="u-exploration" aria-labelledby="u-carte-titre"><div class="u-section-titre"><div><span class="u-surtitre">LE CHEMIN DES DÉCOUVERTES</span><h2 id="u-carte-titre">Les lieux à explorer</h2></div><span class="u-legende">✓ Déjà exploré</span></div><div class="u-parcours">${parcours.map((q) => `<article class="u-lieu ${q.explore ? "u-explore" : ""} ${q.id === prochaine?.id ? "u-prochaine" : ""}"><div class="u-lieu-haut"><span class="u-etape">${q.explore ? "✓" : q.numero}</span><span class="u-etat">${q.explore ? "Exploré" : q.statut === "en_cours" ? "En cours" : q.id === prochaine?.id ? "Prochaine étape" : "À découvrir"}</span></div><h3>${h(q.lieu)}</h3><p>${h(q.histoire)}</p><p class="u-lecon">${h(q.matiere)} · ${h(q.titre)}</p><button class="btn" data-mission="${q.id}" ${bloque ? "disabled" : ""}>${q.explore ? "Revenir s’entraîner" : q.statut === "en_cours" ? "Continuer ma mission" : "Explorer ce lieu"}</button></article>`).join("")}</div>${parcours.length && explorees === parcours.length ? `<p class="u-fin">${h(definition.fin)}</p>` : ""}${!parcours.length ? '<div class="u-vide"><span aria-hidden="true">✦</span><h3>Un monde prêt à être découvert</h3><p>Un parent peut préparer ta première mission. Milo t’attend ici !</p></div>' : ""}</section>
    <section class="u-autres" aria-labelledby="u-choisir"><div class="u-section-titre"><div><span class="u-surtitre">ENVIE D’AILLEURS ?</span><h2 id="u-choisir">Choisis ton univers</h2></div></div><p class="u-explication">Tes missions et tes progrès te suivent dans chaque aventure.</p><div class="u-choix">${Object.entries(
      UNIVERS_AVENTURE,
    )
      .map(
        ([id, u]) =>
          `<button class="u-carte ${id === aventure ? "u-selectionnee" : ""}" data-univers="${id}" aria-pressed="${id === aventure}" ${bloque ? "disabled" : ""}>${illustrationUnivers(id)}<span class="u-nom">${h(u.nom)}</span><span>${id === aventure ? "✓ Ton univers actuel" : "Partir à l’aventure →"}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="u-statut" role="status">${h(occupe ? "Milo prépare ce monde…" : erreur)}${commande && !occupe ? '<button class="lien" id="u-reessayer">Réessayer</button>' : ""}</p></section><p class="u-note">Une mission à la fois. Milo est là pour t’accompagner.</p></div>`;
    app.querySelector("#u-retour").onclick = retour;
    navigation();
    app.querySelectorAll("[data-univers]").forEach((b) => (b.onclick = () => choisir(b.dataset.univers)));
    app.querySelector("#u-reessayer")?.addEventListener("click", () => choisir(commande.aventure));
    app.querySelectorAll("[data-mission]").forEach(
      (b) =>
        (b.onclick = () => {
          const q = parcours.find((q) => q.id === Number(b.dataset.mission));
          if (q) jouer(q);
        }),
    );
  }
  await charger();
}
