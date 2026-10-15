import { apercuLecon } from "./parent-apercu.ts";
import { miloApercu } from "./parent-milo.ts";
import { vueProfils } from "./parent-profils.ts";
import { resumeSuiviAccueil, vueSuivi } from "./parent-suivi.ts";
import type { SuiviParent } from "./suivi-parent.ts";
import { matiereSuivi } from "./suivi-parent.ts";
import { preparationLecon } from "./parent-accueil.ts";
import { FUSEAU } from "./config.ts";
import type { Enfant } from "./logic.ts";
import type { lireParcours } from "./parcours.ts";

export type ProfilParent = {
  enfant: Enfant;
  missions: ReturnType<typeof lireParcours>;
  suivis: SuiviParent[];
};
const e = (valeur: unknown) =>
  String(valeur).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const chemins: Record<string, string> = {
  maison: "M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9",
  livre: "M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15",
  coeur: "M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 3 11 8 15 5-4 13-10 8-15Z",
  graphique: "M4 3v17h17M8 15v-4m5 4V7m5 8V4",
  profil: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2",
  aide: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  plus: "M12 5v14M5 12h14",
  fleche: "M4 12h16m-6-6 6 6-6 6",
  photo: "M3 7h4l2-3h6l2 3h4v13H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  calcul: "M5 5h6M8 2v6M15 5h6M5 15l6 6m0-6-6 6M15 16h6m-6 4h6",
  plante: "M12 22V10m0 5C4 15 3 10 3 7c6 0 9 3 9 8Zm0-4c0-6 4-9 9-9 0 6-3 9-9 9Z",
  globe: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20Z",
};
function icone(nom: string) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${chemins[nom] || chemins.livre}"/></svg>`;
}
function boutonVue(vue: string, texte: string, classe = "lien-action") {
  return `<button type="button" class="${classe}" data-vue="${vue}">${texte}${icone("fleche")}</button>`;
}
function boutonPhoto(classe = "bouton-principal", camera = false) {
  return `<button type="button" class="${classe} action-photo" ${camera ? "data-prendre-photo" : 'data-vue="nouvelle"'}>${icone("photo")} ${camera ? "Prendre une photo" : "Préparer une leçon"}</button>`;
}
function avancementBranche(nom: string, terminees: number, total: number) {
  return `<span class="avancement-branche"><span class="avancement-entete"><span>Avancement des missions</span>${miloApercu("milo-avancement")}</span><span class="compteur-avancement">${terminees} mission${terminees > 1 ? "s" : ""} terminée${terminees > 1 ? "s" : ""} sur ${total}</span><progress class="barre-avancement-branche" max="${Math.max(1, total)}" value="${terminees}" aria-label="${e(nom)} : ${terminees} missions terminées sur ${total}"></progress><span class="precision-avancement">Missions terminées, pas une mesure de maîtrise.</span></span>`;
}
const camembertMissions = `<section class="bilan-camembert" aria-labelledby="titre-camembert"><div class="camembert-intro"><p class="eyebrow">Ses missions en un regard</p><h2 id="titre-camembert">Où en est son carnet ?</h2><p>Une vue d’ensemble pour choisir la prochaine petite étape.</p><p class="discret">Le mois et la recherche définissent ce bilan. Le filtre de statut ne change pas la répartition.</p></div><div class="camembert-missions" id="camembert-missions" data-vide="true" role="img" aria-label="Aucune mission dans cette sélection"><div class="centre-camembert"><strong id="total-camembert">0</strong><span id="unite-camembert">mission</span></div></div><div class="legende-camembert"><ul><li><span class="point-camembert point-terminees" aria-hidden="true"></span><span>Terminées</span><strong id="camembert-terminees">0</strong></li><li><span class="point-camembert point-encours" aria-hidden="true"></span><span>En cours</span><strong id="camembert-encours">0</strong></li><li><span class="point-camembert point-decouvrir" aria-hidden="true"></span><span>À découvrir</span><strong id="camembert-decouvrir">0</strong></li></ul><p id="vide-camembert" class="discret">Aucune mission dans cette sélection.</p></div><p class="precision-camembert">Une mission terminée indique un avancement, pas une compétence maîtrisée.</p></section>`;
function moisMission(date: string) {
  return /^\d{4}-(0[1-9]|1[0-2])/.test(date) ? date.slice(0, 7) : "sans-date";
}
function nomMois(mois: string) {
  return mois === "sans-date"
    ? "Date non renseignée"
    : new Date(`${mois}-15T12:00:00Z`).toLocaleDateString("fr-BE", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}
function carnetMois(profils: ProfilParent[]) {
  const mois = [
    ...new Set(
      profils.flatMap((p) => p.missions.filter((m) => !m.archivee).map((m) => moisMission(m.cree_le))),
    ),
  ]
    .sort()
    .reverse();
  return `<section class="carnet-mensuel" aria-labelledby="titre-carnet"><div class="carnet-intro"><span class="carnet-illustration" aria-hidden="true">${icone("livre")}<span>✦</span></span><div><p class="eyebrow">Le carnet des découvertes</p><h2 id="titre-carnet">Un mois, de nouveaux petits pas.</h2><p>Retrouvez ses leçons au fil des mois, puis choisissez une branche à explorer ensemble.</p></div></div><div class="navigation-mois" role="group" aria-label="Mois d’ajout des leçons"><button type="button" data-mois="tous" aria-pressed="true">Tout le carnet</button>${mois.map((m) => `<button type="button" data-mois="${e(m)}" aria-pressed="false">${e(nomMois(m))}</button>`).join("")}</div><p id="resume-mois" class="resume-mois" role="status" aria-live="polite"></p><p class="discret">Les mois correspondent à l’ajout des leçons. Ce carnet ne fixe ni échéance ni rythme obligatoire.</p></section>`;
}
function lignesMissions(profil: ProfilParent, courte = false) {
  const missions = profil.missions
    .filter((m) => !m.archivee)
    .slice()
    .sort((a, b) => b.cree_le.localeCompare(a.cree_le) || b.id - a.id);
  if (!missions.length)
    return `<div class="vide-doux">${icone("livre")}<h3>L’aventure commence ici.</h3><p>Ajoutez une première leçon pour préparer des missions pour ${e(profil.enfant.prenom)}.</p>${boutonVue("nouvelle", "Ajouter une leçon")}</div>`;
  return missions
    .slice(0, courte ? 3 : undefined)
    .map(
      (m) =>
        `<details class="mission-parent" data-mois-mission="${e(moisMission(m.cree_le))}" data-matiere-mission="${e(matiereSuivi(m.matiere))}" data-notion-mission="${e(m.notion || m.titre)}" data-recherche="${e([m.titre, m.matiere, m.notion || ""].join(" "))}" data-statut="${m.statut === "terminee" ? "terminee" : "en_cours"}" data-commencee="${m.essayees > 0}"><summary>${courte ? "" : apercuLecon(m)}<span class="matiere-icone">${icone("livre")}</span><span class="mission-nom"><small>${e(m.matiere)}</small><strong>${e(m.titre)}</strong></span><span class="badge ${m.statut === "terminee" ? "vert" : "mauve"}">${m.statut === "terminee" ? "Terminée" : m.essayees ? "En cours" : "À découvrir"}</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="mission-detail"><p class="date-lecon">${moisMission(m.cree_le) !== "sans-date" ? `Ajoutée le ${e(new Date(m.cree_le.slice(0, 10) + "T12:00:00Z").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }))}` : "Date d’ajout non renseignée"}</p><p>${e(m.notion || "Petite mission d’entraînement")}</p><progress aria-label="Questions essayées dans ${e(m.titre)}" max="${Math.max(1, m.total)}" value="${m.essayees}"></progress><p>${m.essayees} question${m.essayees > 1 ? "s" : ""} essayée${m.essayees > 1 ? "s" : ""} sur ${m.total} · ${m.reussies} réussie${m.reussies > 1 ? "s" : ""} au fil des essais.</p><a href="/#profil=${encodeURIComponent(profil.enfant.code)}">Ouvrir le jeu de ${e(profil.enfant.prenom)} →</a></div></details>`,
    )
    .join("");
}
const outilsLecons = `<section class="outils-lecons"><label class="recherche-parent" for="recherche-missions">Retrouver une leçon<input id="recherche-missions" type="search" placeholder="Une matière, une notion ou un titre" maxlength="120" autocomplete="off"></label><div class="filtres-missions" role="group" aria-label="Filtrer les missions"><button type="button" data-filtre="toutes" aria-pressed="true">Toutes</button><button type="button" data-filtre="en_cours" aria-pressed="false">À explorer</button><button type="button" data-filtre="terminee" aria-pressed="false">Terminées</button></div><p id="resultat-missions" class="discret" role="status" aria-live="polite"></p><button type="button" class="lien-action" data-vue="lecons" data-section="brouillons">Vérifier mes brouillons ↓</button></section>`;
function leconsParMois(profil: ProfilParent, missions: ProfilParent["missions"]) {
  const mois = [...new Set(missions.map((m) => moisMission(m.cree_le)))].sort().reverse();
  return mois
    .map(
      (m) =>
        `<div class="etape-mois" data-etape-mois="${e(m)}"><h3 class="titre-etape-mois"><span aria-hidden="true">✦</span> ${e(nomMois(m))}</h3>${lignesMissions({ ...profil, missions: missions.filter((q) => moisMission(q.cree_le) === m) })}</div>`,
    )
    .join("");
}
function atelierLecons(profil: ProfilParent, partie: "suggestions" | "matieres") {
  const missions = profil.missions.filter((m) => !m.archivee);
  const prochaines = missions
    .filter((m) => m.statut !== "terminee")
    .sort((a, b) => Number(b.essayees > 0) - Number(a.essayees > 0) || b.id - a.id)
    .slice(0, 2);
  const notion = profil.suivis.find((s) => s.jours === 30)?.notions.find((n) => n.a_revoir > 0);
  const contexte = notion
    ? `Préparer une courte reprise pour la notion ${notion.nom}, en ${notion.matiere}. Sur les 30 derniers jours, des questions restent sans réussite après au moins deux essais. Exemples : ${notion.exemples
        .filter((q) => q.essais >= 2)
        .slice(0, 3)
        .map((q) => q.consigne)
        .join(
          " ; ",
        )}. Demander la leçon ou le dessin si nécessaire. Ces observations ne sont pas un diagnostic.`
    : "";
  const matieres = [...new Set(missions.map((m) => matiereSuivi(m.matiere)))];
  const suggestions = `<section class="prochaine-seance"><p class="eyebrow">Une petite étape à choisir</p><h2>Pour sa prochaine séance</h2><p>Deux propositions au maximum. Commencer par une seule suffit.</p><div class="choix-lecons">${prochaines.map((m) => `<article class="choix-lecon">${apercuLecon(m)}<span class="badge mauve">${m.essayees ? "Reprendre le fil" : "Nouvelle découverte"}</span><h3>${e(m.titre)}</h3><p>${e(m.notion || m.matiere)}</p><small>${m.essayees ? `${m.essayees} questions essayées sur ${m.total}` : `${m.total} questions proposées`}</small><a class="bouton-secondaire" href="/#profil=${encodeURIComponent(profil.enfant.code)}">Choisir cette mission dans son jeu ↗</a></article>`).join("") || `<p>Toutes les missions proposées sont terminées, ou aucune n’a encore été ajoutée. Vous pouvez partir d’une nouvelle leçon, à son rythme.</p>`}</div><p class="discret">Les missions déjà commencées sont proposées d’abord, puis les plus récemment ajoutées. Ce sont des suggestions, pas un programme obligatoire.</p></section>
  ${notion ? `<section class="reprise-lecon"><div><p class="eyebrow">Un coup de pouce possible · 30 derniers jours</p><h2>${e(notion.nom)}</h2><p>${notion.a_revoir} question${notion.a_revoir > 1 ? "s restent" : " reste"} sans réussite enregistrée après au moins deux essais. Une courte reprise peut aider à en reparler ensemble.</p></div><button type="button" class="bouton-secondaire" data-preparer-reprise data-contexte="${e(contexte)}">Préparer quelques exercices ciblés →</button></section>` : ""}
  `;
  if (partie === "suggestions") return suggestions;
  return `<div class="titre-section titre-matieres"><div><p class="eyebrow">Retrouver une leçon sans tout parcourir</p><h2>Ses matières</h2></div></div><div class="matieres-lecons">${
    matieres
      .map((nom) => {
        const groupe = missions.filter((m) => matiereSuivi(m.matiere) === nom);
        const notions = [...new Set(groupe.map((m) => m.notion || m.titre))];
        const repere: Record<string, [string, string]> = {
          Mathématiques: ["calcul", "maths"],
          Français: ["livre", "francais"],
          Sciences: ["plante", "sciences"],
          Géographie: ["globe", "geographie"],
        };
        const [symbole, couleur] = repere[nom] || ["livre", "autre"];
        const enCours = groupe.filter((m) => m.statut !== "terminee" && m.essayees > 0).length;
        const nouvelles = groupe.filter((m) => m.statut !== "terminee" && !m.essayees).length;
        return `<details class="dossier-matiere branche-${couleur}" data-dossier-matiere><summary><span class="dossier-entete"><span class="dossier-repere">${icone(symbole)}</span><span class="dossier-titre"><strong>${e(nom)}</strong><small>${groupe.length} mission${groupe.length > 1 ? "s" : ""} · ${notions.length} notion${notions.length > 1 ? "s" : ""}</small></span></span><span class="dossier-notions"><span class="dossier-legende">Au programme</span>${notions
          .slice(0, 2)
          .map((n) => `<span class="notion-apercu">${e(n)}</span>`)
          .join(
            "",
          )}${notions.length > 2 ? `<span class="autres-notions">Et ${notions.length - 2} autre${notions.length > 3 ? "s" : ""} notion${notions.length > 3 ? "s" : ""}</span>` : ""}</span>${avancementBranche(nom, groupe.filter((m) => m.statut === "terminee").length, groupe.length)}<span class="dossier-pied"><span class="dossier-activite">${enCours ? `${enCours} en cours` : nouvelles ? `${nouvelles} à découvrir` : "Missions terminées"}</span><span class="dossier-action"><span class="texte-ouvrir">Voir les leçons</span><span class="texte-fermer">Replier</span><span class="chevron" aria-hidden="true">⌄</span></span></span></summary><div class="dossier-contenu"><p class="dossier-legende">Les leçons de cette branche</p>${leconsParMois(profil, groupe)}<p class="discret">Une mission terminée ne signifie pas que la notion est maîtrisée.</p>${boutonVue("enfant", "Comprendre ses résultats")}</div></details>`;
      })
      .join("") || '<p class="vide-doux">Ses matières apparaîtront avec les premières missions.</p>'
  }</div>`;
}
const dessin = `<svg class="illustration-parent" viewBox="0 0 360 260" fill="none" aria-hidden="true"><circle cx="188" cy="133" r="104" fill="#EEE7F8"/><circle cx="285" cy="50" r="13" fill="#F4CF86"/><path d="m49 99 5 12 13 2-10 9 2 14-11-7-12 6 3-13-9-10 14-1Z" fill="#F4CF86"/><path d="M90 179 179 148l93 28-85 47Z" fill="#C4B0DD"/><path d="m90 168 89-31 93 28v15l-85 35-97-30Z" fill="#fff"/><path d="m90 160 89-31 93 28-85 35Z" fill="#80629F"/><path d="m109 127 70-25 74 22-68 28Z" fill="#F4C4A5"/><path d="M179 102v27m-70-2v21l76 24 68-28v-20l-68 28Z" fill="#F5D6BD"/><path d="m185 152 68-28v20l-68 28Z" fill="#E9AB88"/><path d="M183 112c-8-39 3-58 26-77 9 29 0 55-26 77Z" fill="#9AABC0"/><path d="M183 112c-37-7-57-28-57-52 34 2 53 19 57 52Z" fill="#A7B7A1"/><path d="M183 131V81" stroke="#687C70" stroke-width="4" stroke-linecap="round"/><path d="m274 102 24-12-7 25-9-10-8-3Z" fill="#D199B1"/><path d="m68 190 4 9 10 2-8 7 1 10-8-5-9 4 2-10-7-7 10-1Z" fill="#D199B1"/><circle cx="288" cy="193" r="4" fill="#A7B7A1"/><circle cx="76" cy="60" r="4" fill="#C4B0DD"/></svg>`;

export function accueilParent(profils: ProfilParent[] = [], nonceProfil?: string) {
  const date = new Date().toLocaleDateString("fr-BE", {
    timeZone: FUSEAU,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const groupes = (rendu: (p: ProfilParent) => string) =>
    profils
      .map((p, i) => `<div data-profil="${p.enfant.id}" ${i ? "hidden" : ""}>${rendu(p)}</div>`)
      .join("");
  const sansProfil = `<div class="vide-doux"><span class="avatar-parent" aria-hidden="true">♡</span><h3>Un espace pour votre famille.</h3><p>Le suivi des enfants s’affiche dans la démo sur ce PC. La connexion à un compte parent à distance reste à construire.</p>${boutonVue("nouvelle", "Préparer une leçon")}</div>`;
  return `<div class="parent-app"><a class="evitement-parent" href="#contenu-parent">Aller au contenu</a>
  <aside class="app-sidebar"><a href="/parent" class="marque-parent"><span class="logo-parent">l<span>u</span>mo<span class="point-logo">✦</span></span><small>LE COIN DES PARENTS</small></a>
  <nav aria-label="Navigation parents">${[
    ["accueil", "maison", "Accueil"],
    ["lecons", "livre", "Les leçons"],
    ["enfant", "graphique", "Suivi"],
    ["profils", "profil", "Profils"],
    ["aide", "aide", "Aide"],
  ]
    .map(
      ([vue, icon, texte], i) =>
        `<button type="button" data-vue="${vue}" ${!i ? 'aria-current="page"' : ""}>${icone(icon)}<span>${texte}</span></button>`,
    )
    .join("")}</nav>
  <div class="note-sidebar"><span>✧</span><p>Les petits pas font<br>les belles aventures.</p></div><a class="retour-jeu" href="/">Passer côté enfant ↗</a></aside>
  <div class="app-contenu" id="contenu-parent" tabindex="-1"><header class="app-entete"><a class="marque-mobile" href="/parent" aria-label="Lumo parents">lumo<span>✦</span></a><span class="fil-ariane">Votre famille, à votre rythme.</span><div class="profil-entete">${profils.length ? `<span class="pastille-locale">Démo sur ce PC</span><label class="sr-only" for="profil-actif">Enfant suivi</label><select id="profil-actif">${profils.map((p) => `<option value="${p.enfant.id}" data-prenom="${e(p.enfant.prenom)}" data-classe="${e(p.enfant.niveau_scolaire || "")}" data-pays="${e(p.enfant.pays || "")}" data-aides="${e(p.enfant.aides || "")}">${e(p.enfant.prenom)}</option>`).join("")}</select>` : '<span class="pastille-locale">Aperçu parents</span>'}<span class="mini-avatar" aria-hidden="true">♡</span></div></header>
  <div class="vue-parent" data-page="accueil"><div class="titre-page"><div><p class="eyebrow">${e(date)}</p><h1>Bonjour, on fait simple ?</h1><p>Un peu de curiosité. Beaucoup d’encouragements.</p></div>${boutonPhoto()}</div>
  <div class="accueil-grille"><div class="colonne-principale"><section class="hero-parent"><div><span class="badge-creme">MOINS DE PRÉPARATION, PLUS DE PARTAGE</span><h2>Les devoirs deviennent<br>une petite aventure.</h2><p>Une leçon à explorer ensemble,<br>des missions à son rythme.</p>${boutonPhoto("bouton-encre")}<p class="raccourci-import">${boutonVue("nouvelle", "Ou choisir une photo existante").replace('data-vue="nouvelle"', "data-choisir-photo")}</p></div>${dessin}</section>
  ${groupes((p) => {
    const semaine = p.suivis.find((s) => s.jours === 7);
    return semaine ? resumeSuiviAccueil(semaine, p.enfant.prenom) : "";
  })}<div class="titre-section"><h2>Les dernières missions</h2>${boutonVue("lecons", "Tout voir")}</div><section class="liste-missions">${groupes((p) => lignesMissions(p, true)) || sansProfil}</section>
</div>
  <aside class="colonne-enfant">${
    groupes((p) => {
      const missions = p.missions.filter((m) => !m.archivee),
        finies = missions.filter((m) => m.statut === "terminee").length;
      return `<section class="carte-enfant"><div class="carte-enfant-haut"><span class="avatar-parent" aria-hidden="true">${e(p.enfant.prenom.slice(0, 1))}</span><span class="badge vert">${p.enfant.univers === "nature" ? "Explorateur du jardin" : "Explorateur de l’espace"}</span></div><h2>${e(p.enfant.prenom)}</h2><p>Chaque essai est un pas de plus.</p><div class="chiffres-enfant"><div><strong>${missions.length - finies}</strong><small>à explorer</small></div><div><strong>${finies}</strong><small>terminée${finies > 1 ? "s" : ""}</small></div></div><p class="repere-ethique">Une mission à la fois, quand c’est le bon moment pour vous.</p>${boutonVue("enfant", "Voir son parcours", "bouton-secondaire")}</section>`;
    }) || sansProfil
  }<section class="carte-brouillons"><span class="icone-papier">${icone("livre")}</span><h3>Le dernier mot est à vous.</h3><p>Relisez les questions avant de les envoyer. Vous pouvez en garder seulement quelques-unes.</p>${boutonVue("lecons", "Retrouver mes brouillons").replace('data-vue="lecons"', 'data-vue="lecons" data-section="brouillons"')}</section></aside></div></div>
  <div class="vue-parent" data-page="lecons" hidden><div class="titre-page"><div><p class="eyebrow">Préparer, choisir, accompagner</p><h1>Ses leçons, à son rythme.</h1><p>Choisissez une prochaine étape ou retrouvez une notion par matière.</p></div>${boutonPhoto()}</div>

  ${carnetMois(profils)}${groupes((p) => atelierLecons(p, "suggestions")) || sansProfil}${outilsLecons}${camembertMissions}${groupes((p) => atelierLecons(p, "matieres"))}<div id="filtre-vide" class="vide-doux" hidden><h3>Aucune mission ne correspond.</h3><p>Essayez un autre mot ou affichez toutes les missions.</p><button type="button" class="bouton-secondaire" id="reinitialiser-recherche">Afficher toutes les missions</button></div>
  <section id="brouillons" class="bibliotheque"><div class="titre-section"><div><p class="eyebrow">Avant de lui passer la main</p><h2>À vérifier</h2></div><span class="badge mauve">Vos brouillons</span></div><div id="liste-brouillons"></div><details><summary>Retrouver un brouillon avec son lien</summary><form id="ouvrir-brouillon"><label for="lien-brouillon">Lien de vérification<input id="lien-brouillon" type="url" required placeholder="Collez le lien donné par l’assistant"></label><button type="submit">Ouvrir le brouillon</button><p id="erreur-lien" role="alert"></p></form></details><p class="discret">Liste propre à ce navigateur, non synchronisée entre appareils. Les liens expirés sont retirés à la prochaine ouverture de cet espace.</p><button id="effacer-brouillons" class="secondaire" type="button" hidden>Effacer les liens de cet appareil</button></section></div>
  <div class="vue-parent" data-page="enfant" hidden><div class="titre-page"><div><p class="eyebrow">Comprendre ses essais, encourager ses découvertes</p><h1>Son parcours, en détail.</h1><p>Ses points d’appui, ce qui reste à accompagner, et sa parole.</p></div><label class="periode-suivi" for="periode-suivi">Période observée<select id="periode-suivi"><option value="7">7 derniers jours</option><option value="30" selected>30 derniers jours</option><option value="0">Tout l’historique</option></select></label></div><p id="periode-statut" class="sr-only" role="status" aria-live="polite"></p>${groupes((p) => vueSuivi(p.enfant, p.suivis)) || sansProfil}</div>
  <div class="vue-parent" data-page="nouvelle" hidden><button class="lien-retour" type="button" data-vue="accueil">← Retour à l’accueil</button><div class="titre-page"><div><p class="eyebrow">Une nouvelle découverte</p><h1>Qu’allons-nous explorer ?</h1><p>Joignez la photo dans votre assistant connecté. Vous retrouverez ici les exercices à vérifier.</p></div></div><div class="creation-grille"><div><section id="demande-reprise" hidden><p class="eyebrow">Une reprise ciblée</p><h2>Repartir de ses essais.</h2><label for="contexte-reprise">Repères transmis dans votre demande<textarea id="contexte-reprise" readonly rows="5"></textarea></label><p class="discret">Joignez aussi la leçon ou le dessin si nécessaire. Ces repères seront ajoutés au message préparé ci-dessous.</p><button type="button" class="secondaire" id="annuler-reprise">Préparer plutôt une nouvelle leçon</button></section><div class="preparation-formulaire">${preparationLecon}</div><details class="apercu-facultatif"><summary>Vérifier une photo ici avant de la joindre à mon assistant · facultatif</summary><section class="photo-lecon"><h2>Consulter ma photo.</h2><p>Vous pouvez aussi prendre ou choisir la photo directement dans votre assistant connecté. Cet aperçu local n’y transfère pas l’image.</p><div class="zone-photo zone-photo-actions">${icone("photo")}<strong>Une photo nette, et c’est parti.</strong><span>Cadrez la page entière avec un bon éclairage.</span>${boutonPhoto("bouton-principal", true)}<button type="button" class="bouton-secondaire" data-choisir-photo>Choisir dans mes photos</button><input type="file" id="photo-camera" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><input type="file" id="photo-lecon" accept="image/jpeg,image/png,image/webp" hidden><span>Sur ordinateur, choisissez une image depuis vos fichiers.</span></div><div id="apercu-photo" class="photo-selectionnee" hidden><h3 id="titre-photo-selectionnee" tabindex="-1">Votre photo</h3><p id="details-photo" class="discret"></p><img id="image-lecon" alt="Aperçu de la photo choisie"><p id="photo-resolution" class="conseil-photo" hidden></p><p class="conseil-photo conseil-contenu-photo"><strong>L’image ne correspond pas à une leçon ou à un devoir ?</strong> Choisissez une autre photo, ou précisez l’objectif de l’activité à l’étape suivante. Le contenu sera vérifié dans votre assistant.</p><div class="suite-photo"><strong>La prochaine étape : vérifier la photo avec votre assistant.</strong><p>La photo n’est pas analysée ici. Joignez-la dans votre assistant avec le message préparé ; il vérifiera si une leçon lisible est identifiable avant de créer des exercices.</p><button id="continuer-photo" class="bouton-principal" type="button" disabled>Continuer vers le message →</button></div><div class="actions-photo-selectionnee"><button type="button" class="bouton-secondaire" data-choisir-photo>Choisir une autre photo</button><button id="retirer-photo" class="secondaire" type="button">Retirer la photo</button></div><details class="aide-photo"><summary>Photo floue, mal cadrée ou sans devoir visible ?</summary><p>Reprenez la page entière, à plat et dans une bonne lumière. Vérifiez que les lettres restent lisibles en agrandissant l’aperçu.</p><p>Une photo de plante ou d’objet peut servir à une leçon de sciences. Ajoutez alors la consigne ou l’objectif ci-dessous. Sans leçon ni objectif identifiable, l’assistant devra vous demander du contexte et ne pas inventer un devoir.</p></details></div><p id="photo-statut" class="discret" role="status" aria-live="polite">Choisissez une photo pour voir son aperçu et la prochaine étape.</p><p id="photo-erreur" class="erreur-photo" role="alert"></p></section></details></div><aside class="aide-creation"><section><p class="eyebrow">Comment ça se passe ?</p><ol><li><strong>Préparez votre demande.</strong><span>Le profil et la leçon donnent les bons repères.</span></li><li><strong>Envoyez-la à votre assistant.</strong><span>Joignez la photo avec le message préparé.</span></li><li><strong>Gardez ce qui vous plaît.</strong><span>Ouvrez le brouillon, vérifiez et validez les questions.</span></li></ol><p class="discret">La préparation des missions passe par votre assistant connecté à Lumo.</p></section></aside></div></div>
  <div class="vue-parent" data-page="profils" hidden><div class="titre-page"><div><p class="eyebrow">Votre famille</p><h1>Les profils enfants</h1><p>Les bons repères, une fois pour toutes. À modifier quand ils changent.</p></div></div>${vueProfils(
    profils.map((p) => p.enfant),
    nonceProfil,
  )}</div>
  <div class="vue-parent" data-page="aide" hidden><div class="titre-page"><div><p class="eyebrow">On est là pour vous guider</p><h1>Aide et confidentialité</h1><p>Des réponses simples et le contrôle sur vos informations.</p></div></div><section class="aide-questions"><details open><summary>Comment envoyer une leçon ?</summary><p>Touchez « Préparer une leçon ». Copiez le message proposé, puis prenez ou joignez la photo dans votre assistant connecté à Lumo. Ouvrez ensuite le lien de brouillon donné par l’assistant pour vérifier et valider les exercices. L’aperçu photo dans Lumo est facultatif et ne transfère pas l’image.</p></details><details><summary>Comment connecter mon assistant ?</summary><p>Activez le connecteur Lumo dans votre assistant, puis demandez : « Liste les enfants dans Lumo, sans modifier les données. » Vérifiez le profil avant de partager la leçon. Si Lumo n’est pas disponible, sa connexion doit d’abord être configurée dans cet environnement.</p></details><details><summary>Où sont mes brouillons ?</summary><p>Dans « Les leçons », sous « À vérifier ». Cette liste conserve les liens ouverts dans ce navigateur. Sur un autre appareil, ouvrez le lien depuis la conversation de votre assistant.</p></details><details><summary>Puis-je retirer une question ?</summary><p>Oui. Décochez-la dans le brouillon avant de confirmer. Seules les questions gardées sont envoyées à l’enfant. Pour corriger une réponse, demandez un nouveau brouillon à votre assistant.</p></details><details><summary>Qui peut voir le suivi ?</summary><p>Ce prototype affiche les données de la famille de démonstration uniquement sur le PC local. Les comptes parents et l’accès sécurisé au suivi à distance restent à construire.</p></details></section><section class="donnees-parent"><p class="eyebrow">Vos informations</p><h2>Vous gardez la main.</h2><dl><div><dt>La photo de la leçon</dt><dd>Elle reste en mémoire sur cet écran. Lumo ne la téléverse pas ; vous choisissez de la joindre à votre assistant.</dd></div><div><dt>Les repères de votre enfant</dt><dd>Ils servent à préparer le message. Privilégiez un pseudonyme ; une aide pratique suffit, sans diagnostic ni détail médical.</dd></div><div><dt>Les notes de ressenti</dt><dd>Si vous choisissez d’en noter dans le suivi, elles restent dans ce navigateur. Vous pouvez les effacer depuis la rubrique Suivi, pour l’enfant sélectionné. Elles ne sont pas partagées avec l’assistant.</dd></div><div><dt>Les liens de brouillons</dt><dd>Ils sont mémorisés dans ce navigateur. Les liens expirés sont retirés à la prochaine ouverture de cet espace. Vous pouvez aussi les effacer ici sans supprimer les missions.</dd></div></dl><button type="button" class="bouton-secondaire" data-effacer-liens>Effacer les liens de ce navigateur</button><p id="effacement-statut" class="discret" role="status"></p><p class="discret">Ces actions concernent cet appareil. Les informations déjà transmises à votre assistant restent gérées dans ce service.</p></section><section class="engagement-parent"><h2>Apprendre sans se comparer.</h2><p>Le suivi décrit les essais enregistrés, sans classement entre enfants ni note globale. Vous choisissez les missions à proposer et le moment de les faire. Une mission terminée ne signifie pas que toutes les notions sont acquises.</p></section></div>
  <noscript><section><p>Activez JavaScript pour naviguer entre les écrans de l’espace parents.</p><a href="/">Ouvrir le jeu</a></section></noscript>
  </div></div>`;
}
