import { decorBranche } from "./parent-decors.ts";
import { schemaIllustration } from "./formats.ts";
import { figureSvg } from "../public/geometrie.js";
import { matiereSuivi } from "./suivi-parent.ts";
import { miloApercu } from "./parent-milo.ts";

const e = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export function apercuLecon(mission: { matiere: string; apercu_json: string | null }) {
  let consigne = "";
  let dessin = "";
  try {
    const q: unknown = JSON.parse(mission.apercu_json || "null");
    if (q && typeof q === "object" && "consigne" in q && typeof q.consigne === "string") {
      consigne = q.consigne;
      if ("illustration" in q && typeof q.illustration === "string") {
        const illustration = schemaIllustration.safeParse(JSON.parse(q.illustration));
        if (illustration.success)
          dessin = `<span class="geo-galerie">${illustration.data.figures
            .slice(0, 3)
            .map(
              (f) =>
                `<span class="geo-figure">${figureSvg(f)}<span class="geo-repere">Figure ${f.id}</span></span>`,
            )
            .join(
              "",
            )}</span>${illustration.data.figures.length > 3 ? `<span class="suite-figures">Aperçu des 3 premières figures sur ${illustration.data.figures.length}</span>` : ""}`;
      }
    }
  } catch {
    /* Une ancienne donnée invalide ne doit pas empêcher d’ouvrir le carnet. */
  }
  const matiere = matiereSuivi(mission.matiere);
  const theme =
    (
      {
        Mathématiques: "maths",
        Français: "francais",
        Sciences: "sciences",
        Géographie: "geographie",
      } as Record<string, string>
    )[matiere] || "autre";

  return `<span class="apercu-lecon theme-${theme} ${dessin ? "apercu-dessin" : "apercu-decor"}"><span class="image-apercu ${dessin ? "" : "image-avec-milo"}">${dessin || `${miloApercu()}<span class="scene-apercu">${decorBranche(matiere)}</span>`}</span><span class="legende-apercu">${dessin ? "Dessin de l’exercice" : "Illustration de la branche · avec Milo"}</span>${consigne ? `<span class="extrait-apercu ${dessin ? "consigne-avec-milo" : ""}">${dessin ? miloApercu("milo-consigne") : ""}<span class="texte-extrait"><small>Extrait d’un exercice</small><span>${e(consigne)}</span></span></span>` : '<span class="extrait-apercu">Aucun extrait disponible pour cette leçon.</span>'}</span>`;
}
