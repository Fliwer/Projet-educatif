// Inventaire local uniquement : aucun appel réseau, aucune génération audio.
import "../src/config.ts";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { DOSSIER_DONNEES, RACINE } from "../src/config.ts";
import { nombreFrancais } from "../public/voix-appareil.js";
import { themeMission, phraseProgres } from "../public/decors-mission.js";

const voix = process.env.ELEVENLABS_VOIX;
if (!voix) throw new Error("La voix Milo n’est pas configurée.");
const modele = process.env.ELEVENLABS_MODELE ?? "eleven_multilingual_v2";
const source = await readFile(join(RACINE, "public", "app.js"), "utf8");
const debut = source.indexOf("const OPERATIONS =");
const fin = source.indexOf("/** Prépare à l'avance", debut);
if (debut < 0 || fin <= debut) throw new Error("Lecteur des calculs introuvable : inventaire interrompu.");
const decouper = runInNewContext(source.slice(debut, fin) + "\nmorceauxVoix", {
  nombreFrancais,
  nettoyer: runInNewContext(source.slice(source.indexOf("function nettoyer("), source.indexOf("function chargerVoix(")) + "\nnettoyer"),
});
const reactions = runInNewContext(
  source.slice(source.indexOf("const ENCOURAGEMENTS ="), source.indexOf("async function verifier(")) +
    "\n[...ENCOURAGEMENTS, ...REACTIONS, ...BRAVOS]",
);
const communs = [...reactions,
  "On fait une mission ensemble ?", "Bravo ! Tu peux rejouer tes missions.",
  "Un parent peut préparer ta prochaine mission.", "Pas grave !", "Presque !",
  "On la refera tout à l'heure.", "On apprend ensemble",
  "C'est presque ça, regarde bien les accents. On la refait tout à l'heure.",
  "Une petite pause ? Tu peux continuer quand tu veux.",
  "Mission terminée !", "Entraînement terminé !",
  "Tu as pris le temps de travailler cette mission.",
];
const missions = [];
const salutations = [];
const dossiersCache = [...new Set([join(DOSSIER_DONNEES, "voix"), join(RACINE, "data", "voix")])];
function morceau(texte) {
  const cle = createHash("sha256").update(`${voix}|${modele}|${texte}`).digest("hex").slice(0, 32);
  return {
    texte,
    caracteres: [...texte].length,
    fichier: `${cle}.mp3`,
    enregistre: dossiersCache.some((dossier) => existsSync(join(dossier, `${cle}.mp3`))),
  };
}
function lot(nom, textes) {
  const morceaux = [...new Set(textes)].map(morceau);
  const manquants = morceaux.filter((m) => !m.enregistre);
  const caracteres = manquants.reduce((n, m) => n + m.caracteres, 0);
  return {
    nom,
    morceaux,
    fichiers_manquants: manquants.length,
    caracteres_a_generer: caracteres,
    credits_indicatifs: modele === "eleven_multilingual_v2" ? caracteres : null,
  };
}
const textesActuels = [];
let calculs = 0;
for (const dossier of new Set([DOSSIER_DONNEES, join(RACINE, "data", "partage", "demo")])) {
  const fichier = join(dossier, "lumo.db");
  if (!existsSync(fichier)) continue;
  const base = new DatabaseSync(fichier, { readOnly: true });
  try {
    for (const { prenom } of base.prepare("SELECT prenom FROM enfants").all()) {
      salutations.push(`Bonjour ${prenom} !`, `Bonsoir ${prenom} !`);
    }
    for (const quete of base.prepare("SELECT quetes.*, enfants.univers FROM quetes JOIN enfants ON enfants.id = quetes.enfant_id WHERE archivee = 0").all()) {
      const questionsMission = base.prepare("SELECT * FROM questions WHERE quete_id = ? ORDER BY ordre").all(quete.id);
      const textes = [...communs, phraseProgres(themeMission(quete)),
        ...Array.from({ length: Math.max(0, questionsMission.length - 2) }, (_, i) => `${i + 3} d'affilée !`),
        ...questionsMission.flatMap(q => [q.consigne, ...(q.type === "dictee" ? [q.bonne] : []),
          `La réponse, c'est « ${q.bonne} ». Maintenant tu la connais !`]),
      ];
      missions.push({ base: dossier === DOSSIER_DONNEES ? "locale" : "demo", id: quete.id, titre: quete.titre, textes: textes.flatMap(decouper) });
    }
    const questions = base
      .prepare(
        "SELECT questions.consigne FROM questions JOIN quetes ON quetes.id = questions.quete_id WHERE quetes.archivee = 0",
      )
      .all();
    for (const { consigne } of questions) {
      const morceaux = decouper(consigne);
      if (morceaux.length !== 4) continue;
      calculs++;
      textesActuels.push(...morceaux);
    }
  } finally {
    base.close();
  }
}
const tables = [];
for (let a = 1; a <= 12; a++) {
  for (let b = 1; b <= 12; b++) tables.push(...decouper(`${a} × ${b} = ?`));
}
const plan = {
  prepare_le: new Date().toISOString(),
  generation_effectuee: false,
  modele,
  empreinte_voix: createHash("sha256").update(voix).digest("hex").slice(0, 12),
  calculs_examines: calculs,
  estimation:
    "Un passage réussi, sans réessai ni éventuel multiplicateur de voix. Solde ElevenLabs non consulté. Les lots se recouvrent : ne pas additionner leurs budgets.",
  ordre_conseille:
    "Choisir les missions de démonstration, vérifier le budget puis autoriser explicitement leur génération. Vérifier sept et huit à l’oreille avant un lot complet.",
  limites: "Inventaire du parcours accueil/mission/fin actuel, y compris les corrections et dictées. Les objets de collection et l’ancienne chambre ne sont pas couverts. Une nouvelle mission ou un nouveau prénom peut ajouter des phrases. Les lots se recouvrent.",
  missions: missions.map(({ textes, ...mission }) => ({ ...mission, ...lot(mission.titre, textes) })),
  lots: [
    lot("Essai : sept fois huit", decouper("7 × 8 = ?")),
    lot("Calculs présents dans les missions non archivées", textesActuels),
    lot("Banque réutilisable : tables de 1 à 12", tables),
    lot("Accueil et réactions communes", [...communs, ...salutations].flatMap(decouper)),
    lot("Démonstration conseillée : calculs, plantes et paysages", [...communs, ...salutations,
      ...missions.filter(m => m.base === "demo" && ["Les petits calculs de Milo", "Les secrets des plantes", "En route dans les paysages"].includes(m.titre)).flatMap(m => m.textes),
    ].flatMap(decouper)),
    lot("Parcours de toutes les missions actuelles (budget dédupliqué)", [...communs, ...salutations, ...missions.flatMap(m => m.textes)].flatMap(decouper)),
  ],
};
const destination = join(DOSSIER_DONNEES, "preparation-voix-milo.json");
await mkdir(DOSSIER_DONNEES, { recursive: true });
await writeFile(destination, JSON.stringify(plan, null, 2) + "\n");
console.log(
  JSON.stringify(
    { destination, modele, calculs, lots: plan.lots.map(({ morceaux, ...resume }) => resume) },
    null,
    2,
  ),
);
