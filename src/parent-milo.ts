import { miloSvg } from "../public/milo.js";

/** Même personnage que dans le jeu ; ses éléments animés restent au repos côté parent. */
export function miloApercu(classe = "") {
  return `<span class="milo-apercu ${classe}" aria-hidden="true">${miloSvg("encourage")}</span>`;
}
