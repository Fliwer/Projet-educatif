import type { DatabaseSync } from "node:sqlite";
import { FUSEAU } from "./config.ts";

type Passage = {
  id: number;
  racine: number;
  mission: number;
  titre: string;
  matiere: string;
  notion: string;
  consigne: string;
  essais: number;
  premiere: number;
  reussie: number;
  premier_le: string;
  dernier_le: string;
  dernier_id: number;
};
export type CompteursSuivi = {
  questions: number;
  premier: number;
  apres: number;
  en_cours: number;
  a_revoir: number;
};
function vide(): CompteursSuivi {
  return { questions: 0, premier: 0, apres: 0, en_cours: 0, a_revoir: 0 };
}
function compter(compteurs: CompteursSuivi, p: Passage) {
  compteurs.questions++;
  if (p.premiere) compteurs.premier++;
  else if (p.reussie) compteurs.apres++;
  else if (p.essais >= 2) compteurs.a_revoir++;
  else compteurs.en_cours++;
}
export function matiereSuivi(matiere: string) {
  const cle = matiere
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (["maths", "math", "mathematiques", "mathematique", "geometrie", "calcul"].includes(cle))
    return "Mathématiques";
  if (
    [
      "francais",
      "francais langue maternelle",
      "vocabulaire",
      "orthographe",
      "grammaire",
      "conjugaison",
    ].includes(cle)
  )
    return "Français";
  return matiere.trim() || "Autres découvertes";
}

/** Lecture seulement. Chaque question source compte une fois, selon son dernier passage joué.
 * Les missions archivées restent dans l'historique ; une reprise jamais jouée n'efface rien.
 * Les dates en base sont des heures locales Lumo : aucune durée ou vitesse n'est déduite.
 */
export function lireSuiviParent(
  db: DatabaseSync,
  enfantId: number,
  jours: 7 | 30 | 0 = 30,
  reference = new Date(),
) {
  const aujourdHui = reference.toLocaleDateString("sv-SE", { timeZone: FUSEAU });
  const fin = reference.toLocaleString("sv-SE", { timeZone: FUSEAU });
  const debutDate = new Date(`${aujourdHui}T12:00:00Z`);
  debutDate.setUTCDate(debutDate.getUTCDate() - Math.max(0, jours - 1));
  const depuis = jours ? debutDate.toISOString().slice(0, 10) : "0000-01-01";
  const passages = db
    .prepare(
      `
    SELECT qu.id,COALESCE(qu.source_id,qu.id) AS racine,q.id AS mission,q.titre,q.matiere,
      COALESCE(q.notion,q.titre) AS notion,qu.consigne,
      COUNT(r.id) AS essais,
      (SELECT rr.correcte FROM reponses rr WHERE rr.question_id=qu.id AND rr.le<=? ORDER BY rr.id LIMIT 1) AS premiere,
      MAX(r.correcte) AS reussie,MIN(r.le) AS premier_le,MAX(r.le) AS dernier_le,MAX(r.id) AS dernier_id
    FROM quetes q JOIN questions qu ON qu.quete_id=q.id JOIN reponses r ON r.question_id=qu.id
    WHERE q.enfant_id=? AND r.le<=?
    GROUP BY qu.id ORDER BY dernier_id
  `,
    )
    .all(fin, enfantId, fin) as Passage[];
  const parSource = new Map<number, Passage[]>();
  for (const p of passages) {
    p.matiere = matiereSuivi(p.matiere);
    const versions = parSource.get(p.racine) || [];
    versions.push(p);
    parSource.set(p.racine, versions);
  }
  const derniers = [...parSource.values()]
    .map((v) => v[v.length - 1])
    .filter((p) => p.dernier_le.slice(0, 10) >= depuis);
  const total = vide();
  const matieres = new Map<string, CompteursSuivi & { nom: string; missions: Set<number> }>();
  const notions = new Map<
    string,
    CompteursSuivi & {
      nom: string;
      matiere: string;
      exemples: Passage[];
      details: Passage[];
      deja_travaillee: boolean;
      reprises_comparees: number;
      reussies_maintenant: number;
    }
  >();
  for (const p of derniers) {
    compter(total, p);
    const matiere = matieres.get(p.matiere) || { ...vide(), nom: p.matiere, missions: new Set<number>() };
    compter(matiere, p);
    matiere.missions.add(p.mission);
    matieres.set(p.matiere, matiere);
    const cle = JSON.stringify([p.matiere, p.notion]);
    const notion = notions.get(cle) || {
      ...vide(),
      nom: p.notion,
      matiere: p.matiere,
      exemples: [],
      details: [],
      deja_travaillee: true,
      reprises_comparees: 0,
      reussies_maintenant: 0,
    };
    compter(notion, p);
    notion.details.push(p);
    if (!p.reussie) notion.exemples.push(p);
    notions.set(cle, notion);
  }
  const connues = new Set(passages.map((p) => JSON.stringify([p.matiere, p.notion])));
  const preparees = db
    .prepare(
      "SELECT matiere,COALESCE(notion,titre) AS notion FROM quetes WHERE enfant_id=? AND origine_id IS NULL AND substr(cree_le,1,10)<=?",
    )
    .all(enfantId, aujourdHui) as { matiere: string; notion: string }[];
  for (const p of preparees) {
    const matiere = matiereSuivi(p.matiere),
      cle = JSON.stringify([matiere, p.notion]);
    if (!notions.has(cle))
      notions.set(cle, {
        ...vide(),
        nom: p.notion,
        matiere,
        exemples: [],
        details: [],
        deja_travaillee: connues.has(cle),
        reprises_comparees: 0,
        reussies_maintenant: 0,
      });
  }
  const reprises = { comparees: 0, premier_maintenant: 0, toujours_premier: 0, encore_variable: 0 };
  for (const versions of parSource.values()) {
    if (versions.length < 2) continue;
    const actuel = versions[versions.length - 1],
      avant = versions[versions.length - 2];
    if (actuel.dernier_le.slice(0, 10) < depuis) continue;
    reprises.comparees++;
    const notion = notions.get(JSON.stringify([actuel.matiere, actuel.notion]));
    if (notion) {
      notion.reprises_comparees++;
      if (actuel.premiere && !avant.premiere) notion.reussies_maintenant++;
    }
    if (actuel.premiere && !avant.premiere) reprises.premier_maintenant++;
    else if (actuel.premiere && avant.premiere) reprises.toujours_premier++;
    else reprises.encore_variable++;
  }
  const activites = new Map<string, CompteursSuivi & { jour: string }>();
  const parJour = db
    .prepare(
      `SELECT substr(r.le,1,10) AS jour,qu.id,COUNT(r.id) AS essais,MAX(r.correcte) AS reussie,
    MAX(CASE WHEN r.id=(SELECT MIN(rr.id) FROM reponses rr WHERE rr.question_id=qu.id) THEN r.correcte ELSE 0 END) AS premiere
    FROM quetes q JOIN questions qu ON qu.quete_id=q.id JOIN reponses r ON r.question_id=qu.id
    WHERE q.enfant_id=? AND substr(r.le,1,10)>=? AND r.le<=? GROUP BY jour,qu.id`,
    )
    .all(enfantId, depuis, fin) as (Passage & { jour: string })[];
  for (const p of parJour) {
    const jour = p.jour,
      activite = activites.get(jour) || { ...vide(), jour };
    compter(activite, p);
    activites.set(jour, activite);
  }
  return {
    jours,
    depuis,
    jusquau: aujourdHui,
    total,
    reprises,
    matieres: [...matieres.values()]
      .map((m) => ({ ...m, missions: m.missions.size }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    notions: [...notions.values()].sort(
      (a, b) => b.a_revoir - a.a_revoir || b.en_cours - a.en_cours || a.nom.localeCompare(b.nom, "fr"),
    ),
    appuis: [...matieres.values()]
      .filter((m) => m.questions >= 5 && m.premier / m.questions >= 0.75)
      .map((m) => ({ nom: m.nom, premier: m.premier, questions: m.questions })),
    activites: [...activites.values()].sort((a, b) => a.jour.localeCompare(b.jour)).slice(-8),
  };
}
export type SuiviParent = ReturnType<typeof lireSuiviParent>;
