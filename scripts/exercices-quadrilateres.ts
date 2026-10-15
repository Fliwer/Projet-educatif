import type { Illustration } from "../src/formats.ts";
type Figure = Illustration["figures"][number];
export const formes = {
  rectangle: [
    [45, 55],
    [255, 55],
    [255, 165],
    [45, 165],
  ],
  parallelogramme: [
    [85, 55],
    [255, 55],
    [215, 165],
    [45, 165],
  ],
  carre: [
    [80, 40],
    [220, 40],
    [220, 180],
    [80, 180],
  ],
  losange: [
    [150, 30],
    [235, 110],
    [150, 190],
    [65, 110],
  ],
} satisfies Record<string, Figure["points"]>;
const figure = (nom: keyof typeof formes, options: Partial<Figure> = {}): Figure => ({
  id: "A",
  points: formes[nom],
  ...options,
});
const illustration = (...figures: Figure[]): Illustration => ({ figures });
const choix = (consigne: string, choix: string[], bonne_reponse: string, dessin: Figure) => ({
  type: "choix" as const,
  consigne,
  choix,
  bonne_reponse,
  illustration: illustration(dessin),
});
const vf = (consigne: string, vrai: boolean, dessin: Figure) => ({
  type: "vrai_faux" as const,
  consigne,
  bonne_reponse: vrai ? "Vrai" : "Faux",
  illustration: illustration(dessin),
});
const tracer = (nom: keyof typeof formes) => ({
  type: "diagonales" as const,
  consigne: `Trace les deux diagonales du ${nom === "parallelogramme" ? "parallélogramme" : nom === "carre" ? "carré" : nom}.`,
  bonne_reponse: "AC ‖ BD",
  illustration: illustration(figure(nom)),
});
const commun = {
  matiere: "Mathématiques",
  niveau_scolaire: "6e primaire",
  origine_contenu: "lecon" as const,
};

export const quetesQuadrilateres = [
  {
    ...commun,
    titre: "Entoure et reconnais les quadrilatères",
    notion: "Reconnaître les parallélogrammes et lire le codage des quadrilatères",
    extrait_lecon:
      "Photo fournie, exercices 1 et 4 : « Entoure les parallélogrammes. » et « Trouve le nom des quadrilatères en t’aidant du codage. » Les neuf silhouettes sont redessinées. Les petits codes de l’exercice 4 sont peu lisibles : les figures codées proposées sont reconstruites avec des propriétés vérifiées, plutôt qu’une copie exacte des traits de la photo.",
    questions: [
      {
        type: "figures" as const,
        consigne: "Entoure les parallélogrammes en touchant les figures.",
        bonne_reponse: "A ‖ D ‖ G",
        illustration: illustration(
          figure("losange", { id: "A" }),
          {
            id: "B",
            points: [
              [40, 55],
              [235, 55],
              [255, 75],
              [255, 165],
              [40, 165],
            ],
          },
          {
            id: "C",
            points: [
              [85, 35],
              [215, 35],
              [215, 145],
              [150, 180],
              [85, 145],
            ],
          },
          figure("parallelogramme", { id: "D" }),
          {
            id: "E",
            points: [
              [40, 65],
              [260, 40],
              [260, 170],
              [40, 170],
            ],
          },
          {
            id: "F",
            points: [
              [45, 55],
              [235, 55],
              [255, 75],
              [255, 165],
              [65, 165],
              [45, 145],
            ],
          },
          {
            id: "G",
            points: [
              [110, 55],
              [265, 55],
              [190, 165],
              [35, 165],
            ],
          },
          {
            id: "H",
            points: [
              [85, 45],
              [215, 45],
              [255, 175],
              [45, 175],
            ],
          },
          {
            id: "I",
            points: [
              [75, 60],
              [225, 40],
              [265, 175],
              [35, 175],
            ],
          },
        ),
      },
      choix(
        "Quel est le nom le plus précis de cette figure codée ?",
        ["Parallélogramme", "Rectangle", "Losange"],
        "Parallélogramme",
        figure("parallelogramme", { codage_cotes: "opposes", codage_diagonales: "milieux" }),
      ),
      choix(
        "Quel est le nom le plus précis de cette figure codée ?",
        ["Losange", "Carré", "Rectangle"],
        "Losange",
        figure("losange", { codage_cotes: "egaux", codage_diagonales: "perpendiculaires" }),
      ),
      choix(
        "Quel est le nom le plus précis de cette figure codée ?",
        ["Carré", "Rectangle", "Losange"],
        "Rectangle",
        figure("rectangle", { codage_cotes: "opposes", codage_diagonales: "egales", angles_droits: true }),
      ),
      choix(
        "Quel est le nom le plus précis de cette figure codée ?",
        ["Losange", "Rectangle", "Carré"],
        "Carré",
        figure("carre", {
          codage_cotes: "egaux",
          codage_diagonales: "egales_perpendiculaires",
          angles_droits: true,
        }),
      ),
    ],
  },
  {
    ...commun,
    titre: "Les propriétés : vrai ou faux",
    notion: "Propriétés des quadrilatères, avec un dessin pour chaque affirmation",
    extrait_lecon:
      "Photo fournie, exercice 2 : les huit affirmations de « Coche Vrai ou Faux. » sont reprises. Elles ne sont pas toutes vraies. Un dessin illustre chacune des affirmations ; l’enfant choisit Vrai ou Faux.",
    questions: [
      vf("Le carré a des diagonales perpendiculaires.", true, figure("carre", { diagonales: true })),
      vf("Le rectangle a 5 angles droits.", false, figure("rectangle")),
      vf("Le parallélogramme a toujours 4 côtés de même longueur.", false, figure("parallelogramme")),
      vf("Le quadrilatère a 4 côtés.", true, {
        id: "A",
        points: [
          [55, 50],
          [235, 35],
          [260, 175],
          [40, 150],
        ],
      }),
      vf("Le rectangle a des diagonales de même longueur.", true, figure("rectangle", { diagonales: true })),
      vf("Le losange a des diagonales perpendiculaires.", true, figure("losange", { diagonales: true })),
      vf(
        "Le losange a toujours des diagonales de même longueur.",
        false,
        figure("losange", { diagonales: true }),
      ),
      vf("Le carré n’a pas d’angles droits.", false, figure("carre")),
    ],
  },
  {
    ...commun,
    titre: "Trace les diagonales et trouve leur codage",
    notion: "Relier les sommets opposés et reconnaître les propriétés des diagonales",
    extrait_lecon:
      "Photo fournie, exercice 3 : « Dessine les diagonales des figures et code-les. » Figures : rectangle, parallélogramme, carré, losange. L’enfant trace les deux diagonales en touchant les sommets. Le codage est adapté en choix de propriétés, après chaque tracé.",
    questions: [
      tracer("rectangle"),
      choix(
        "Quel codage convient aux diagonales du rectangle ?",
        ["Même milieu et même longueur", "Même milieu et perpendiculaires"],
        "Même milieu et même longueur",
        figure("rectangle", { diagonales: true, sommets: true }),
      ),
      tracer("parallelogramme"),
      choix(
        "Quelle propriété peut-on coder pour tout parallélogramme ?",
        ["Diagonales de même longueur", "Diagonales qui se coupent en leur milieu"],
        "Diagonales qui se coupent en leur milieu",
        figure("parallelogramme", { diagonales: true, sommets: true }),
      ),
      tracer("carre"),
      choix(
        "Quel codage convient aux diagonales du carré ?",
        ["Même milieu, même longueur et perpendiculaires", "Même milieu et longueurs différentes"],
        "Même milieu, même longueur et perpendiculaires",
        figure("carre", { diagonales: true, sommets: true }),
      ),
      tracer("losange"),
      choix(
        "Quelle propriété peut-on coder pour tout losange ?",
        ["Diagonales de même longueur", "Diagonales perpendiculaires et de même milieu"],
        "Diagonales perpendiculaires et de même milieu",
        figure("losange", { diagonales: true, sommets: true }),
      ),
    ],
  },
];
