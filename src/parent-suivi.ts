import type { SuiviParent, CompteursSuivi } from "./suivi-parent.ts";
const e = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const pluriel = (n: number, singulier: string, pluriel = singulier + "s") =>
  `${n} ${n > 1 ? pluriel : singulier}`;
const date = (jour: string) =>
  new Date(`${jour}T12:00:00Z`).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
function barre(c: CompteursSuivi) {
  const base = Math.max(1, c.questions);
  return `<div class="barre-suivi" aria-hidden="true"><span class="segment-premier" style="width:${(c.premier / base) * 100}%"></span><span class="segment-apres" style="width:${(c.apres / base) * 100}%"></span><span class="segment-revoir" style="width:${((c.a_revoir + c.en_cours) / base) * 100}%"></span></div>`;
}
function conseil(n: SuiviParent["notions"][number]) {
  const cle = (n.nom + " " + n.matiere)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/prefix|suffix/.test(cle))
    return "Choisissez un mot de l’exercice ci-dessous. Demandez-lui de montrer le radical, puis de placer le préfixe avant ou le suffixe après. Vérifiez ensemble avec la leçon.";
  if (/conjug|present|verbe/.test(cle))
    return "Prenez un verbe de l’exercice ci-dessous. Faites-lui repérer le pronom, dire la forme à voix haute, puis l’écrire. Vérifiez ensemble avec la leçon.";
  if (/geometr|quadrilat|diagonal|figure/.test(cle))
    return "Rouvrez le dessin de l’exercice dans son jeu. Demandez-lui de montrer les sommets ou les côtés concernés et d’expliquer son choix avant de vérifier la correction.";
  if (n.matiere === "Mathématiques")
    return "Reprenez le calcul de l’exercice ci-dessous. Proposez un dessin ou de petits objets pour représenter les quantités. Demandez-lui d’expliquer une étape, puis vérifiez ensemble.";
  return "Reprenez une question de l’exercice ci-dessous. Lisez la consigne ensemble, demandez-lui d’expliquer la première étape et essayez une réponse avant de consulter la correction.";
}
function statutNotion(n: SuiviParent["notions"][number]) {
  if (!n.questions) return n.deja_travaillee ? "Pas d’essai sur la période" : "À découvrir";
  if (n.a_revoir) return "À consolider";
  if (n.questions < 5) return "En découverte";
  if (n.premier / n.questions >= 0.75) return "Réussites régulières";
  return "En apprentissage";
}
export function bilanHebdomadaire(s: SuiviParent, prenom: string) {
  const difficultes = s.notions.filter((n) => n.a_revoir > 0).slice(0, 2);
  return `<section class="bilan-hebdomadaire"><p class="eyebrow">Votre bilan des 7 derniers jours · ${date(s.depuis)} au ${date(s.jusquau)}</p><h2>Son bilan de la semaine · ${e(prenom)}</h2>${s.total.questions ? `<p>${pluriel(s.total.questions, "question différente", "questions différentes")} travaillée${s.total.questions > 1 ? "s" : ""} dans ${pluriel(s.matieres.length, "matière")} : ${e(s.matieres.map((m) => m.nom).join(", "))}.</p><div class="bilan-colonnes"><div><h3>À célébrer</h3><p>${s.total.premier} au premier essai ; ${s.total.apres} après un nouvel essai.</p>${s.reprises.premier_maintenant ? `<p>${pluriel(s.reprises.premier_maintenant, "question rejouée", "questions rejouées")} désormais ${s.reprises.premier_maintenant > 1 ? "réussies" : "réussie"} au premier essai après un précédent passage plus hésitant.</p>` : ""}</div><div><h3>La prochaine petite étape</h3>${difficultes.length ? `<p>Choisissez une de ces notions, sans obligation de tout reprendre :</p><ul>${difficultes.map((n) => `<li><strong>${e(n.nom)}</strong> (${e(n.matiere)}) : ${n.a_revoir} à revoir.</li>`).join("")}</ul><p>Une question à la fois, cinq minutes si cela convient. Les actions précises sont proposées plus bas.</p>` : s.total.en_cours ? `<p>${pluriel(s.total.en_cours, "question")} en cours. Reprenez-en une ensemble si votre enfant en a envie.</p>` : `<p>Demandez-lui de choisir une question qu’il a aimée et de vous raconter comment il a trouvé sa réponse.</p>`}</div></div>` : `<p>Aucun essai enregistré ces sept derniers jours. Ce n’est ni un retard ni une difficulté. Consultez une période plus large pour retrouver ses découvertes.</p>`}</section>`;
}
export function resumeSuiviAccueil(s: SuiviParent, prenom: string) {
  const cible = s.notions.find((n) => n.a_revoir > 0);
  return `<section class="resume-suivi-accueil"><div class="titre-section"><div><p class="eyebrow">Le point sur ses 7 derniers jours</p><h2>Pour accompagner ${e(prenom)}</h2></div><button type="button" class="lien-action" data-vue="enfant">Comprendre son suivi →</button></div>${s.total.questions ? `<div class="resume-chiffres"><p><strong>${s.total.premier}</strong> réussies au premier essai</p><p><strong>${s.total.apres}</strong> réussies en réessayant</p></div><p>${cible ? `À reprendre ensemble : <strong>${e(cible.nom)}</strong> (${cible.a_revoir} questions après deux essais).` : `${s.total.en_cours ? `${s.total.en_cours} questions sont encore en cours.` : "Aucune question ne reste à reprendre après deux essais sur le dernier passage observé."}`}</p>` : `<p>Aucun essai ces sept derniers jours. Consultez le suivi complet pour retrouver ses découvertes antérieures.</p>`}</section>`;
}
function contenuSuivi(s: SuiviParent, code: string) {
  const t = s.total;
  if (!t.questions)
    return `<section class="suivi-vide"><h2>Le suivi se construit avec ses essais.</h2><p>Aucune réponse enregistrée sur cette période. Les missions non commencées ne sont pas comptées comme des difficultés.</p><p>Choisissez une autre période ou laissez votre enfant découvrir une première mission.</p><a class="bouton-secondaire" href="/#profil=${encodeURIComponent(code)}">Ouvrir son espace de jeu ↗</a></section>`;
  const difficiles = s.notions.filter((n) => n.a_revoir > 0);
  const contexte = (n: SuiviParent["notions"][number]) =>
    `Notion : ${n.nom}. Matière : ${n.matiere}. Questions à reprendre : ${n.exemples
      .filter((p) => p.essais >= 2)
      .slice(0, 3)
      .map((p) => p.consigne)
      .join(
        " ; ",
      )}. Ces essais ne sont pas un diagnostic. Demande la leçon ou le dessin si un support manque.`;
  return `<p class="borne-suivi">${s.jours ? `Du ${date(s.depuis)} au ${date(s.jusquau)}` : "Depuis les premiers essais"} · Historique conservé, y compris les missions archivées.</p>
  <div class="indicateurs-suivi"><div><strong>${t.questions}</strong><span>questions différentes travaillées</span></div><div><strong>${t.premier}</strong><span>réussies au premier essai</span></div><div><strong>${t.apres}</strong><span>réussies avec un nouvel essai</span></div><div><strong>${t.a_revoir}</strong><span>à revoir ensemble</span></div></div>
  <div class="synthese-suivi"><section class="appuis-suivi"><p class="eyebrow">Ses points d’appui observés</p><h2>Ce qui lui réussit</h2>${s.appuis.length ? s.appuis.map((m) => `<p><strong>${e(m.nom)}</strong> : ${m.premier} questions réussies au premier essai sur ${m.questions} lors du dernier passage.</p>`).join("") : `<p>Les réussites se précisent avec les essais. Les cartes par matière ci-dessous montrent déjà ce qu’il a réussi, y compris après s’être corrigé.</p>`}<p class="discret">Un point d’appui est affiché à partir de 5 questions différentes, dont au moins 3 sur 4 réussies au premier essai. Ce n’est pas une évaluation du niveau scolaire.</p></section>
  <section class="attention-suivi"><p class="eyebrow">Pour l’accompagner</p><h2>${t.a_revoir ? "Un petit coup de pouce ciblé" : "Des essais à encourager"}</h2><p>${t.a_revoir ? `${pluriel(t.a_revoir, "question")} ${t.a_revoir > 1 ? "n’ont" : "n’a"} pas encore de réussite enregistrée après deux essais, sur le dernier passage. ${difficiles.length ? `Notion à regarder : <strong>${e(difficiles[0].nom)}</strong>.` : ""}` : "Aucune question ne reste sans réussite après deux essais sur le dernier passage observé."}</p>${t.en_cours ? `<p>${pluriel(t.en_cours, "question")} avec un seul essai sans réussite : le passage est encore en cours, sans conclusion sur une difficulté.</p>` : ""}<p class="discret">Proposez une question à la fois et demandez ce qui l’a aidé. Vous choisissez le moment de reprendre.</p></section></div>
  <section class="matieres-suivi"><div class="entete-suivi"><div><p class="eyebrow">Matière par matière</p><h2>Où en est-il dans ses exercices ?</h2></div></div><p class="legende-suivi"><span class="cle-premier">Premier essai réussi</span><span class="cle-apres">Réussi après un nouvel essai</span><span class="cle-revoir">Sans réussite enregistrée</span></p><div class="grille-matieres">${s.matieres.map((m) => `<article class="matiere-suivi"><div><h3>${e(m.nom)}</h3><span class="badge ${m.questions < 5 ? "mauve" : "vert"}">${m.questions < 5 ? "Peu de recul" : pluriel(m.questions, "question")}</span></div>${barre(m)}<dl><div><dt>Premier essai réussi</dt><dd>${m.premier} / ${m.questions}</dd></div><div><dt>Réussi après un nouvel essai</dt><dd>${m.apres}</dd></div><div><dt>À revoir après deux essais</dt><dd>${m.a_revoir}</dd></div>${m.en_cours ? `<div><dt>Passage encore en cours</dt><dd>${m.en_cours}</dd></div>` : ""}</dl><p class="discret">${pluriel(m.missions, "mission travaillée", "missions travaillées")} · Dernier passage de chaque question.</p></article>`).join("")}</div><p class="discret">Ces matières peuvent contenir des exercices de difficultés différentes. Les résultats ne disent pas, à eux seuls, dans laquelle il se sent le mieux.</p></section>
  <details class="details-suivi"><summary>Explorer les notions et leurs étapes d’apprentissage</summary><p class="discret">Les étapes décrivent les exercices observés. La maîtrise durable n’est pas évaluée automatiquement.</p><div class="grille-competences">${s.notions.map((n) => `<article><small>${e(n.matiere)}</small><h3>${e(n.nom)}</h3><span class="badge ${n.a_revoir ? "ambre" : "mauve"}">${statutNotion(n)}</span><p>${n.questions ? `${n.premier + n.apres} réussies sur ${n.questions} questions différentes. ${n.questions < 5 ? "Encore peu de recul." : ""}` : "Aucun essai dans la période choisie."}</p>${n.questions ? `<details class="questions-competence"><summary>Voir les questions et les essais</summary><ul>${n.details.map((p) => `<li><strong>${e(p.consigne)}</strong><span>${p.premiere ? "Réussie au premier essai" : p.reussie ? `Réussie après ${p.essais} essais` : p.essais >= 2 ? `À revoir après ${p.essais} essais` : "Passage encore en cours après un essai"} · ${date(p.dernier_le.slice(0, 10))}</span></li>`).join("")}</ul></details>` : ""}${n.reprises_comparees ? `<p>${n.reussies_maintenant} désormais réussies au premier essai sur ${n.reprises_comparees} questions rejouées comparables.</p>` : ""}</article>`).join("")}</div></details>
  <details class="details-suivi"><summary>Consulter l’évolution des essais et les reprises</summary>
  <div class="synthese-suivi"><section class="evolution-suivi"><p class="eyebrow">Au fil des essais</p><h2>Ses derniers jours d’activité</h2><ul>${s.activites.map((j) => `<li><div><strong>${date(j.jour)}</strong><span>${j.premier} / ${j.questions} au premier essai</span></div>${barre(j)}<p class="sr-only">${pluriel(j.apres, "réussite après un nouvel essai", "réussites après un nouvel essai")}, ${j.a_revoir + j.en_cours} sans réussite enregistrée.</p></li>`).join("")}</ul><p class="discret">Les 8 derniers jours avec essais de la période. Une question compte une fois par jour et par passage. Les exercices changent : ce graphique ne mesure pas une hausse du niveau.</p></section>
  <section class="reprises-suivi"><p class="eyebrow">Les mêmes questions, à nouveau</p><h2>Ce qui change quand il rejoue</h2>${s.reprises.comparees ? `<p><strong class="grand-chiffre">${s.reprises.premier_maintenant}</strong> ${s.reprises.premier_maintenant > 1 ? "questions désormais réussies" : "question désormais réussie"} au premier essai, après un passage précédent qui en demandait davantage.</p><ul><li>${s.reprises.toujours_premier} encore ${s.reprises.toujours_premier > 1 ? "réussies" : "réussie"} au premier essai.</li><li>${s.reprises.encore_variable} avec de nouveaux essais nécessaires.</li></ul><p class="discret">Comparaison sur ${pluriel(s.reprises.comparees, "même question", "mêmes questions")} entre les deux derniers passages joués. Une reprise non commencée ne remplace pas le résultat précédent.</p>` : `<p>Il n’a pas encore rejoué de question sur cette période.</p><p class="discret">Les reprises permettront de comparer les mêmes questions entre deux passages, plutôt que des exercices différents.</p>`}</section></div>
  </details><section class="notions-suivi"><p class="eyebrow">Des repères concrets</p><h2>Les notions à accompagner</h2>${
    difficiles.length
      ? difficiles
          .map(
            (n) =>
              `<details class="notion-suivi"><summary><span><small>${e(n.matiere)}</small><strong>${e(n.nom)}</strong></span><span class="badge ambre">${n.a_revoir} à revoir</span></summary><div><div class="conseil-cible"><strong>À essayer ensemble · environ cinq minutes</strong><p>${conseil(n)}</p><p>Question à lui poser : « Quelle étape te semble la plus difficile ? »</p></div><p>${n.premier + n.apres} réussies sur ${n.questions} questions différentes au dernier passage ; ${n.a_revoir} à reprendre après deux essais.</p><ul>${n.exemples
                .filter((p) => p.essais >= 2)
                .slice(0, 5)
                .map(
                  (p) =>
                    `<li><strong>${e(p.consigne)}</strong><small>${p.essais} essais sans réussite enregistrée · ${date(p.dernier_le.slice(0, 10))}</small></li>`,
                )
                .join(
                  "",
                )}</ul><button type="button" class="bouton-secondaire" data-preparer-reprise data-contexte="${e(contexte(n))}">Préparer une reprise sur cette notion →</button><p class="discret">Cette action prépare une demande pour votre assistant. Aucun exercice n’est publié sans votre validation.</p></div></details>`,
          )
          .join("")
      : `<p>Aucune notion avec une question encore sans réussite après deux essais. Les passages en cours restent visibles dans les cartes par matière.</p>`
  }</section>`;
}
export function vueSuivi(enfant: { id: number; prenom: string; code: string }, suivis: SuiviParent[]) {
  const matieres = suivis.find((s) => s.jours === 0)?.matieres || [];
  return `<div class="suivi-parent-detail">${suivis.find((s) => s.jours === 7) ? bilanHebdomadaire(suivis.find((s) => s.jours === 7)!, enfant.prenom) : ""}<p class="discret">Le bilan ci-dessus couvre toujours les 7 derniers jours. Les détails ci-dessous suivent la période sélectionnée.</p>${suivis.map((s) => `<div data-periode-suivi="${s.jours}" ${s.jours === 30 ? "" : "hidden"}>${contenuSuivi(s, enfant.code)}</div>`).join("")}
  <section class="ressenti-parent"><p class="eyebrow">Sa parole compte aussi</p><h2>Et ${e(enfant.prenom)}, comment se sent-il ?</h2><p>Une réussite et un ressenti sont deux choses différentes. Après en avoir parlé avec lui, vous pouvez noter ce qu’il vous dit.</p>${matieres.length ? `<form class="form-ressenti" data-enfant-ressenti="${enfant.id}"><div><label>Matière<select name="matiere" required>${matieres.map((m) => `<option>${e(m.nom)}</option>`).join("")}</select></label><label>Ce qu’il vous a dit<select name="ressenti" required><option value="">Choisir un ressenti</option><option value="aise">Il se sent à l’aise</option><option value="variable">Cela dépend des exercices</option><option value="aide">Il aimerait un coup de pouce</option></select></label><label>Accompagnement observé <span class="discret">Facultatif</span><select name="accompagnement"><option value="">Non renseigné</option><option value="seul">Il a essayé seul</option><option value="ensemble">Nous l’avons fait ensemble</option><option value="milo">Il a demandé de l’aide à Milo</option></select></label></div><button type="submit" class="bouton-secondaire">Noter son ressenti sur cet appareil</button><p class="statut-ressenti" role="status"></p></form><ul class="historique-ressenti" data-historique-ressenti="${enfant.id}"></ul><button type="button" class="lien-action" data-effacer-ressentis="${enfant.id}">Effacer ces notes de ressenti</button>` : `<p class="discret">Les matières apparaîtront après les premiers essais. Vous pouvez déjà lui demander ce qu’il a aimé ou trouvé difficile.</p>`}<p class="discret">Ces notes facultatives sont enregistrées dans ce navigateur uniquement, avec leur date. Les 5 plus récentes sont affichées, jusqu’à 100 notes sont conservées. L’accompagnement noté est votre observation, pas une mesure automatique d’autonomie. Elles ne sont pas déduites des exercices et ne sont pas partagées avec votre assistant. Évitez de les noter sur un appareil partagé.</p></section>
  <details class="methode-suivi"><summary>Comment lire ce suivi ?</summary><p>Les synthèses portent sur les questions travaillées pendant la période choisie, selon leur dernier passage joué. Une question rejouée compte une seule fois dans la synthèse. Les cartes journalières conservent chaque passage ; les totaux peuvent donc différer.</p><p>Les missions archivées restent dans l’historique. Une réussite après un nouvel essai est une réussite. Une absence d’essai n’est pas une difficulté. Le temps, l’autonomie et l’humeur ne sont pas mesurés automatiquement.</p><p>Ce suivi décrit ce qui s’est passé dans Lumo. Il ne remplace ni les échanges avec l’enfant, ni les observations de l’enseignant, et ne fournit pas de diagnostic.</p></details></div>`;
}
