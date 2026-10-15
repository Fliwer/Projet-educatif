import { fusee, jardin } from "./scenes-mission.js";

export function themeMission(quete) {
  if (quete.aventure === "jardin") return "fleurs";
  if (quete.aventure === "espace") return "fusee";
  if (quete.aventure === "medieval") return "royaume";
  const simplifier = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  if (simplifier(quete.titre).includes("fusee")) return "fusee";
  const matiere = simplifier(quete.matiere);
  if (matiere.includes("math")) return "robot";
  if (matiere.includes("science")) return "fleurs";
  if (matiere.includes("geograph")) return "ballon";
  if (matiere.includes("histoire")) return "chateau";
  return quete.univers === "nature" ? "fleurs" : "fusee";
}

function assembler(formes, pieces, nouvelles) {
  return formes
    .map(
      (forme, i) =>
        `<g class="piece${i < pieces && i >= pieces - nouvelles ? " nouvelle" : ""}"${i >= pieces ? ' opacity=".14"' : ""}>${forme}</g>`,
    )
    .join("");
}
const ciel =
  '<path d="M0 150Q45 126 96 146T220 142V180H0Z" fill="#c7e6d2"/><path d="M0 166Q110 142 220 161V180H0Z" fill="#9ed9b3"/><g fill="#fff" opacity=".85"><ellipse cx="38" cy="34" rx="22" ry="8"/><ellipse cx="45" cy="28" rx="12" ry="10"/><ellipse cx="184" cy="49" rx="23" ry="8"/><ellipse cx="175" cy="42" rx="13" ry="11"/></g><circle cx="187" cy="25" r="14" fill="#ffcf64"/>';
const etoiles =
  '<g fill="#b7a6e4"><circle cx="26" cy="50" r="3"/><circle cx="189" cy="112" r="3"/><path d="m180 58 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m39 105 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>';
const personnages = {
  robot: [
    '<g fill="#7160af"><rect x="83" y="133" width="18" height="25" rx="8"/><rect x="119" y="133" width="18" height="25" rx="8"/></g><g fill="#ffc75e"><rect x="77" y="150" width="28" height="10" rx="5"/><rect x="115" y="150" width="28" height="10" rx="5"/></g>',
    '<rect x="78" y="87" width="64" height="53" rx="18" fill="#b5a4e5"/><rect x="93" y="101" width="34" height="24" rx="8" fill="#fff2ce"/><circle cx="104" cy="113" r="4" fill="#ffc75e"/><circle cx="117" cy="113" r="4" fill="#76cdb9"/>',
    '<g stroke="#6c5caa" stroke-width="9" stroke-linecap="round"><path d="M78 98 62 117"/><path d="M142 98 158 117"/></g><g fill="#7dcbbb"><circle cx="60" cy="121" r="10"/><circle cx="160" cy="121" r="10"/></g>',
    '<rect x="68" y="40" width="84" height="53" rx="21" fill="#9581d0"/><rect x="77" y="48" width="66" height="35" rx="14" fill="#edf8f8"/><g fill="#ffc75e"><rect x="60" y="56" width="10" height="22" rx="5"/><rect x="150" y="56" width="10" height="22" rx="5"/></g>',
    '<g fill="#282443"><circle cx="94" cy="63" r="5"/><circle cx="126" cy="63" r="5"/></g><path d="M102 73Q110 81 118 73" fill="none" stroke="#282443" stroke-width="3" stroke-linecap="round"/><g fill="#ffc1b4"><ellipse cx="86" cy="72" rx="5" ry="3"/><ellipse cx="134" cy="72" rx="5" ry="3"/></g>',
    '<path d="M110 40V26" stroke="#6c5caa" stroke-width="5"/><circle cx="110" cy="22" r="9" fill="#ffc75e"/><circle cx="108" cy="19" r="3" fill="#fff5d8"/>',
  ],
  ballon: [
    '<rect x="94" y="131" width="32" height="24" rx="7" fill="#d99a5e"/><rect x="91" y="130" width="38" height="8" rx="4" fill="#f5c778"/><path d="M103 139v10m9-10v10m9-10v10" stroke="#bd7e46" stroke-width="2"/>',
    '<path d="M86 104 97 132M134 104 123 132" stroke="#8e75bb" stroke-width="3"/>',
    '<path d="M110 18C58 18 52 83 89 108L103 115C78 87 78 39 110 18Z" fill="#ffb9a2"/>',
    '<path d="M110 18C80 37 82 85 103 115H117C139 85 140 37 110 18Z" fill="#ffce6a"/>',
    '<path d="M110 18C161 18 168 83 131 108L117 115C142 85 141 39 110 18Z" fill="#b3a2e8"/>',
    '<path d="M77 77Q110 88 143 77" fill="none" stroke="#fff4d6" stroke-width="3"/><path d="m84 80 5 10 6-8m10 2 5 10 6-10m10-1 5 8 5-10" fill="#fff4d6"/><path d="M102 148q8-8 16 0" fill="none" stroke="#fff4d6" stroke-width="2"/>',
  ],
  chateau: [
    '<rect x="42" y="135" width="136" height="23" rx="8" fill="#9e8ccd"/><rect x="83" y="91" width="54" height="63" rx="8" fill="#c6b6ed"/>',
    '<rect x="49" y="88" width="32" height="61" rx="6" fill="#af9cdb"/><path d="m43 88 22-32 22 32Z" fill="#ffb6a0"/><rect x="58" y="106" width="14" height="21" rx="7" fill="#f9efcc"/>',
    '<rect x="139" y="88" width="32" height="61" rx="6" fill="#af9cdb"/><path d="m133 88 22-32 22 32Z" fill="#ffb6a0"/><rect x="148" y="106" width="14" height="21" rx="7" fill="#f9efcc"/>',
    '<rect x="91" y="56" width="38" height="58" rx="7" fill="#b6a3e3"/><path d="m84 58 26-35 26 35Z" fill="#7d69b5"/><circle cx="110" cy="77" r="10" fill="#fff0bd"/>',
    '<path d="M97 153v-22a13 13 0 0 1 26 0v22Z" fill="#7f64aa"/><path d="M110 121v32" stroke="#a88cc7" stroke-width="2"/><circle cx="116" cy="140" r="3" fill="#ffd171"/><path d="M45 158h130" stroke="#e8d5ac" stroke-width="5" stroke-linecap="round"/>',
    '<g class="drapeau"><path d="M110 36V12" stroke="#7f64aa" stroke-width="3"/><path d="M111 12q12 7 27 0v16q-15 7-27 0Z" fill="#584176"/><path d="m116 18 5 3m11-3-5 3" stroke="#fff4d5" stroke-width="2"/><path d="M120 26q4-4 8 0" stroke="#fff4d5" fill="none" stroke-width="2"/></g>',
  ],
};
const noms = { robot: "Le robot", ballon: "Le ballon", chateau: "Le château" };
export function decorMission(theme, faites, total, nouvelles = 0, fete = false) {
  if (theme === "fleurs") return jardin(faites, total, nouvelles, fete);
  const pieces = Math.round((faites / total) * 6);
  const avant = Math.round(((faites - nouvelles) / total) * 6);
  if (theme === "fusee") return fusee(pieces, pieces - avant);
  if (theme === "royaume")
    return `<svg viewBox="0 0 220 180" role="img" aria-label="Le château de Milo : ${pieces} parties construites sur 6">${ciel}<g class="groupe-royaume">${assembler(personnages.chateau, pieces, pieces - avant)}</g></svg>`;
  const formes = personnages[theme];
  if (!formes) throw new Error("Décor inconnu");
  const detruire = () => {
    const ordre = [5, 2, 3, 1, 4, 0];
    return formes
      .map((forme, i) =>
        ordre[i] >= pieces
          ? `<g class="piece">${forme}</g>`
          : ordre[i] >= avant && nouvelles > 0
            ? `<g class="bloc-tombe">${forme}</g>`
            : "",
      )
      .join("");
  };
  const heros =
    '<g transform="translate(26 132)"><path d="M-10-2-21 26 0 23Z" fill="#ffb6a0"/><path d="M1 4v17" stroke="#7f64aa" stroke-width="11" stroke-linecap="round"/><circle cy="-6" r="12" fill="#ad99db"/><path d="M-4-17q1-11 7-12" stroke="#7f64aa" stroke-width="3" fill="none"/><circle cx="4" cy="-30" r="4" fill="#ffd171"/><g fill="#282443"><circle cx="-4" cy="-8" r="2"/><circle cx="4" cy="-8" r="2"/></g><path d="M-3-1q3 4 6 0" fill="none" stroke="#282443" stroke-width="2"/><path d="M9 7 23 3v12q-7 9-14 0Z" fill="#ffd171" stroke="#e5aa45" stroke-width="2"/></g>';
  const ruines =
    theme === "chateau" && pieces > 0
      ? `<g fill="#ad99cf">${Array.from({ length: pieces }, (_, i) => `<rect x="${65 + i * 17}" y="${158 - (i % 2) * 3}" width="12" height="8" rx="3" transform="rotate(${i % 2 ? 12 : -8} ${71 + i * 17} 162)"/>`).join("")}</g>`
      : "";
  const victoire =
    theme === "chateau" && pieces === 6
      ? '<path d="m107 91 7 14 16 2-12 11 3 16-14-7-14 7 3-16-12-11 16-2Z" fill="#ffd171" stroke="#f0b54a" stroke-width="2"/>'
      : "";
  return `<svg viewBox="0 0 220 180" role="img" aria-label="${theme === "chateau" ? `Château ennemi : ${pieces} parties détruites sur 6` : `${noms[theme]} : ${pieces} pièces sur 6`}">${theme === "robot" ? `${etoiles}<ellipse cx="110" cy="160" rx="49" ry="7" fill="#dcd4eb"/>` : ciel}<g class="groupe-${theme}">${theme === "chateau" ? detruire() : assembler(formes, pieces, pieces - avant)}</g>${ruines}${theme === "chateau" ? heros + victoire : ""}</svg>`;
}
export const classeDecor = (theme) =>
  theme === "fusee" ? "espace" : theme === "fleurs" ? "nature" : `decor-${theme}`;
export const phraseProgres = (theme) =>
  ({
    fusee: "Une pièce de plus pour ta fusée !",
    fleurs: "Une fleur de plus dans ton jardin !",
    robot: "Une pièce de plus pour ton robot !",
    ballon: "Ton ballon prend des couleurs !",
    chateau: "Un rempart de moins !",
    royaume: "Tu as pris le temps de travailler cette mission.",
  })[theme];
