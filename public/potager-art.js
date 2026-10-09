import { illustration } from "./monde-art.js";

const fruit = (id, x, y, taille) =>
  `<svg x="${x}" y="${y}" width="${taille}" height="${taille}" viewBox="0 0 120 120">${illustration(id)}</svg>`;

/** Le pied de toutes les plantes est au même endroit, quel que soit leur stade. */
export function planteSvg(p, progression = 0) {
  const sol = '<ellipse cx="70" cy="123" rx="38" ry="9" fill="#633E34" opacity=".25"/>';
  if (!p)
    return `<svg viewBox="0 0 140 145" aria-hidden="true">${sol}<ellipse cx="70" cy="121" rx="16" ry="5" fill="#754734"/></svg>`;
  if (p.etape === 0)
    return `<svg viewBox="0 0 140 145" aria-hidden="true">${sol}<path d="M46 123q24-16 48 0" fill="#BD8157"/><g fill="#FFE3AA"><ellipse cx="65" cy="119" rx="3" ry="2" transform="rotate(-30 65 119)"/><ellipse cx="77" cy="118" rx="3" ry="2"/></g><g transform="translate(68 82)"><path d="M0-12C-4-5-9 0-9 5a9 9 0 0 0 18 0C9 0 4-5 0-12" fill="#BBE9FF"/><path d="M-4 4q-2 5 3 6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></g></svg>`;
  const mature = p.etape === 2;
  const grand = mature || progression >= 0.5;
  const tige = `<path d="M70 121Q64 ${grand ? 68 : 99} 72 ${grand ? 36 : 85}" fill="none" stroke="#238957" stroke-width="7" stroke-linecap="round"/>`;
  const feuilles = `<g class="p-feuilles" fill="#42CD83" stroke="#269C64" stroke-width="1.5"><path d="M68 96Q29 102 32 74Q54 64 68 96"/><path d="M69 96Q109 96 104 69Q80 63 69 96"/>${grand ? '<path d="M70 64Q42 62 43 39Q65 37 70 64M72 65Q100 62 101 40Q77 34 72 65"/>' : ""}</g>`;
  let produit = "";
  if (mature) {
    if (p.culture === "carotte")
      produit =
        '<path d="M54 100Q70 87 86 99L72 129q-2 4-4 0Z" fill="#FF9F1C"/><path d="m58 105 11 2m5 9 5-1" stroke="#D97820" stroke-width="2"/>';
    else if (p.culture === "citrouille") produit = fruit("citrouille", 22, 65, 96);
    else produit = fruit(p.culture, 12, 49, 61) + fruit(p.culture, 67, 70, 59) + fruit(p.culture, 52, 16, 52);
  } else if (grand)
    produit =
      '<g fill="#FFF9E6"><circle cx="46" cy="69" r="7"/><circle cx="100" cy="54" r="7"/></g><g fill="#FFC83D"><circle cx="46" cy="69" r="3"/><circle cx="100" cy="54" r="3"/></g>';
  return `<svg viewBox="0 0 140 145" aria-hidden="true">${sol}<g class="p-plante-vivante">${tige}${feuilles}${produit}</g></svg>`;
}

export function paysagePotager(soir) {
  return `<svg class="p-paysage" viewBox="0 0 1100 590" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="1100" height="590" fill="${soir ? "#C9C7F2" : "#DAF5FF"}"/>
    <circle cx="215" cy="77" r="43" fill="#FFF5B9"/><circle cx="215" cy="77" r="29" fill="${soir ? "#FFF9E7" : "#FFCD4A"}"/>
    <g fill="#FFF" opacity=".9"><path d="M350 86q-26-3-21-20 6-17 25-12 9-32 35-15 17-5 24 12 23 1 19 20-2 15-25 15Z"/><path d="M760 54q-20-4-14-18 7-12 21-9 8-22 25-9 15-4 19 10 26-2 19 19-3 7-22 7Z"/></g>
    <path d="M0 191Q130 103 310 166T642 161T1100 138V590H0" fill="#BCEBCB"/>
    <path d="M0 223Q300 158 550 209T1100 186V590H0" fill="#8CDDA7"/>
    <path d="M0 248Q280 199 550 236T1100 223V590H0" fill="#70CE93"/>
    <path d="M0 177Q480 208 1100 173M0 217Q480 248 1100 213" stroke="#F5DCB4" stroke-width="14" fill="none"/>
    ${Array.from({ length: 15 }, (_, i) => `<path d="M${i * 82 - 18} 243v-91q12-25 24 0v91" fill="#FFF0CF" stroke="#DEBA90" stroke-width="3"/>`).join("")}
    <path d="M150 256Q251 327 178 590H15q200-267 93-320" fill="#E8E9B8"/>
    <g fill="#FFF4D5" stroke="#D0D3A6" stroke-width="3"><ellipse cx="164" cy="319" rx="29" ry="12"/><ellipse cx="173" cy="365" rx="35" ry="15"/><ellipse cx="164" cy="426" rx="38" ry="16"/><ellipse cx="138" cy="494" rx="44" ry="18"/></g>
    <g fill="#46B778"><circle cx="0" cy="159" r="115"/><circle cx="71" cy="114" r="67"/><circle cx="1080" cy="107" r="110"/><circle cx="1005" cy="141" r="69"/></g>
    <g fill="#63CF94"><circle cx="8" cy="85" r="88"/><circle cx="76" cy="117" r="44"/><circle cx="1081" cy="48" r="83"/><circle cx="1004" cy="131" r="45"/></g>
    <g fill="#FFC85B"><circle cx="49" cy="124" r="9"/><circle cx="8" cy="79" r="10"/><circle cx="1060" cy="132" r="9"/></g>
    <g fill="#4EBE80"><ellipse cx="17" cy="577" rx="89" ry="35"/><ellipse cx="1080" cy="580" rx="98" ry="43"/></g>
    ${[
      [40, 425],
      [240, 518],
      [1031, 411],
      [1060, 516],
      [28, 293],
    ]
      .map(
        ([x, y], i) =>
          `<g transform="translate(${x} ${y})"><path d="M0 26V0m0 18q-18-20-17-6" stroke="#238957" stroke-width="4" fill="none"/><g fill="${i % 2 ? "#B9A9EF" : "#FFF9DE"}"><circle cy="-8" r="8"/><circle cx="8" r="8"/><circle cy="8" r="8"/><circle cx="-8" r="8"/></g><circle r="5" fill="#FFBB3A"/></g>`,
      )
      .join("")}
  </svg>`;
}
