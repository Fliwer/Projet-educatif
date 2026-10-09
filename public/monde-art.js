// Illustrations vectorielles locales : pas de requête IA pendant le jeu.
const feuille =
  '<path d="M60 50C23 53 27 26 31 24C53 23 62 40 60 50Z" fill="#2EAE6B"/><path d="M60 43C64 20 89 22 92 24C90 48 70 52 60 43Z" fill="#34C77B"/>';
const dessins = {
  fraise:
    '<path d="M30 49Q60 24 90 49Q99 76 61 103Q23 78 30 49" fill="#FF7E85"/><path d="M35 53Q41 82 60 94" fill="none" stroke="#FFB0B4" stroke-width="7" stroke-linecap="round"/><path d="m60 44-22-9 11 17-19 2 25 9 7-11 10 10 21-11-23-4 12-16Z" fill="#2EAE6B"/><g fill="#FFF3C4"><ellipse cx="46" cy="67" rx="2" ry="3"/><ellipse cx="70" cy="65" rx="2" ry="3"/><ellipse cx="60" cy="79" rx="2" ry="3"/><ellipse cx="76" cy="80" rx="2" ry="3"/><ellipse cx="52" cy="90" rx="2" ry="3"/></g>',
  carotte:
    '<path d="M54 46Q70 37 83 51Q93 67 35 106Q32 110 34 102Q34 65 54 46" fill="#FF9F1C"/><path d="m53 65 13 4m-22 7 12 4m-15 6 9 3" stroke="#E38320" stroke-width="3" stroke-linecap="round"/><path d="M72 48Q55 26 68 17Q77 16 77 43Q78 16 94 18Q104 29 80 48Q102 30 105 44Q101 55 83 56" fill="#34C77B"/><path d="M49 65 37 94" stroke="#FFC86D" stroke-width="5" stroke-linecap="round"/>',
  tomate:
    '<path d="M24 61C20 35 49 34 60 44C79 31 99 43 98 66C97 99 30 111 24 61" fill="#FF8A65"/><path d="M35 57Q31 77 46 83" stroke="#FFBD9E" stroke-width="7" fill="none" stroke-linecap="round"/><path d="m60 48-20-9 8 17-16 6 25-4 9 14 2-16 22-2-18-7 10-13-18 10 1-18-7 18" fill="#2EAE6B"/>',
  citrouille:
    '<ellipse cx="60" cy="74" rx="42" ry="29" fill="#E58F17"/><ellipse cx="43" cy="73" rx="23" ry="29" fill="#FF9F1C"/><ellipse cx="78" cy="73" rx="23" ry="29" fill="#FFB132"/><ellipse cx="61" cy="73" rx="18" ry="30" fill="#FFC83D"/><path d="M59 46 58 29 66 27 68 45" fill="#2EAE6B"/><path d="M65 36Q85 19 99 33Q88 48 65 36" fill="#34C77B"/><path d="M36 58Q31 69 33 78" stroke="#FFE58F" stroke-width="5" fill="none" stroke-linecap="round"/>',
  pousse:
    feuille +
    '<path d="M60 46v49" stroke="#2EAE6B" stroke-width="6" stroke-linecap="round"/><ellipse cx="60" cy="98" rx="29" ry="7" fill="#8c684d" opacity=".2"/>',
  eau: '<path d="M60 17C51 36 31 51 31 70a29 29 0 0 0 58 0C89 51 69 36 60 17" fill="#4BA3F5"/><path d="M44 65Q36 83 55 90" fill="none" stroke="#DBF3FF" stroke-width="6" stroke-linecap="round"/>',
  cadeau:
    '<rect x="26" y="51" width="68" height="50" rx="9" fill="#FF8A65"/><rect x="20" y="40" width="80" height="19" rx="6" fill="#FF9F1C"/><path d="M59 40V100" stroke="#FFC83D" stroke-width="13"/><path d="M60 40C21 42 24 7 45 21L60 40C99 42 95 8 76 22Z" fill="none" stroke="#FFC83D" stroke-width="8" stroke-linecap="round"/>',
  guirlande:
    '<path d="M10 38Q60 83 110 38" fill="none" stroke="#7B65BD" stroke-width="3"/><g fill="#FFC83D" stroke="#FF9F1C" stroke-width="2"><path d="M25 50v7"/><ellipse cx="25" cy="65" rx="7" ry="10"/><ellipse cx="47" cy="76" rx="7" ry="10"/><ellipse cx="73" cy="76" rx="7" ry="10"/><ellipse cx="96" cy="64" rx="7" ry="10"/></g>',
  fontaine:
    '<ellipse cx="60" cy="106" rx="38" ry="7" fill="#d9daca"/><path d="m51 74-7 28h32l-7-28" fill="#B3A2E8"/><path d="M18 54h84q-5 30-42 30T18 54" fill="#B3A2E8"/><ellipse cx="60" cy="54" rx="42" ry="11" fill="#4BA3F5"/><ellipse cx="60" cy="53" rx="31" ry="6" fill="#BEE5FF"/><path d="M59 51Q47 20 42 41m19 10Q71 16 79 39" fill="none" stroke="#4BA3F5" stroke-width="4" stroke-linecap="round"/><path d="M87 40q0-18 13-13l6 7-7 2q-1 11-12 4" fill="#FF9F1C"/><circle cx="99" cy="31" r="1.5" fill="#374636"/>',
  panier:
    '<path d="M30 49Q27 12 60 12T90 49" fill="none" stroke="#bf9160" stroke-width="7"/><path d="m16 43 11 56q33 16 66 0l11-56" fill="#c59562"/><path d="m29 54 6 43m16-42 2 48m20-48-2 48m20-48-6 44M25 70h69M29 86h61" fill="none" stroke="#e5bf8c" stroke-width="4"/><path d="M17 44h86" stroke="#e8c998" stroke-width="9" stroke-linecap="round"/>',
};
export function illustration(id, classe = "") {
  return (
    '<svg class="m-art ' +
    classe +
    '" viewBox="0 0 120 120" aria-hidden="true">' +
    (dessins[id] || dessins.cadeau) +
    "</svg>"
  );
}

/** Même langage visuel que le jardin des missions : fleurs, nuages et formes arrondies. */
export function decorJardinSvg(soir = false) {
  const fleurs = [
    [32, 300, "#FF9F1C"],
    [74, 312, "#FF8A65"],
    [132, 292, "#7B65BD"],
    [782, 307, "#4BA3F5"],
    [854, 280, "#FF9F1C"],
    [821, 322, "#FF8A65"],
  ]
    .map(
      ([x, y, c]) =>
        `<g transform="translate(${x} ${y})"><path d="M0 40V0" stroke="#2EAE6B" stroke-width="6" stroke-linecap="round"/><ellipse cx="-9" cy="23" rx="11" ry="6" fill="#34C77B" transform="rotate(-30 -9 23)"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-12" rx="7" ry="12" fill="${c}" transform="rotate(${a})"/>`).join("")}<circle r="7" fill="#FFF3C4"/></g>`,
    )
    .join("");
  const cloture = Array.from(
    { length: 14 },
    (_, i) =>
      `<path d="M${i * 70 - 10} 230v-49q8-12 16 0v49" fill="#FFF3DC" stroke="#EFCFA5" stroke-width="3"/>`,
  ).join("");
  return `<svg class="m-jardin-decor" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="900" height="420" fill="${soir ? "#BBC9F4" : "#DDF4FF"}"/>
    <circle cx="99" cy="65" r="38" fill="#FFC83D" opacity=".24"/><circle cx="99" cy="65" r="25" fill="${soir ? "#FFF3C4" : "#FFC83D"}"/>
    <g fill="#fff" opacity=".95"><ellipse cx="265" cy="54" rx="45" ry="17"/><ellipse cx="290" cy="43" rx="26" ry="18"/><ellipse cx="470" cy="89" rx="36" ry="15"/><ellipse cx="495" cy="79" rx="24" ry="17"/></g>
    <path d="M0 201Q100 133 235 198T460 182T700 192T900 160V420H0" fill="#B7EBCB"/>
    <path d="M0 222Q210 169 430 224T900 191V420H0" fill="#9FE0AE"/>
    <path d="M0 204h900" stroke="#FFF3DC" stroke-width="10"/>${cloture}
    <path d="M0 264Q180 218 430 265T900 237V420H0" fill="#7ED389"/>
    <path d="M577 231Q455 282 590 420h112Q528 300 640 231" fill="#EDE5B5"/>
    <path d="M582 295q19-7 39 0m-43 34q18-7 36 0m-18 42q18-6 37 0" stroke="#D7CEA7" stroke-width="7" stroke-linecap="round"/>
    <g class="m-maison-jardin" transform="translate(530 28)"><rect x="28" y="115" width="179" height="104" rx="13" fill="#FFEDC1"/><path d="M12 116 115 39 222 116Z" fill="#7B65BD" stroke="#5E4B9E" stroke-width="5" stroke-linejoin="round"/><path d="m39 105 75-54 74 54" fill="none" stroke="#B3A2E8" stroke-width="7" stroke-linecap="round"/><rect x="49" y="139" width="133" height="57" rx="8" fill="#BEE5F2" stroke="#E9C181" stroke-width="6"/><rect x="38" y="193" width="157" height="13" rx="6" fill="#D9B58F"/><path d="M48 144h136" stroke="#fff" stroke-width="5"/><rect x="94" y="159" width="28" height="31" rx="7" fill="#FF8A65"/><ellipse cx="108" cy="158" rx="14" ry="5" fill="#FFC83D"/><path d="M122 165q19 2 7 16" fill="none" stroke="#FF8A65" stroke-width="6"/><circle cx="154" cy="183" r="9" fill="#FF9F1C"/><circle cx="172" cy="183" r="9" fill="#FF8A65"/><path d="M136 187h52q-4 17-26 17t-26-17" fill="#B3A2E8"/></g>
    <g transform="translate(12 133)"><rect x="47" y="4" width="16" height="102" rx="6" fill="#D9B58F"/><circle cx="57" cy="4" r="39" fill="#62D298"/><circle cx="30" cy="27" r="27" fill="#85DCAA"/><circle cx="83" cy="23" r="29" fill="#62D298"/><circle cx="37" cy="5" r="8" fill="#FFC83D"/><circle cx="77" cy="22" r="8" fill="#FF8A65"/></g>
    ${fleurs}
    <g class="m-papillon" transform="translate(375 157)"><ellipse cx="-7" rx="8" ry="12" fill="#B3A2E8"/><ellipse cx="7" rx="8" ry="12" fill="#7B65BD"/><rect x="-2" y="-9" width="4" height="18" rx="2" fill="#5E4B9E"/></g>
    <g fill="#B7EBCB"><ellipse cx="59" cy="408" rx="61" ry="24"/><ellipse cx="839" cy="413" rx="80" ry="29"/></g>
  </svg>`;
}
export function parcelleSvg(p) {
  const plante = !p
    ? '<g fill="#d8af7b"><ellipse cx="42" cy="62" rx="3" ry="2"/><ellipse cx="61" cy="54" rx="3" ry="2"/><ellipse cx="80" cy="63" rx="3" ry="2"/></g>'
    : p.etape === 0
      ? '<path d="M58 57v-9" stroke="#739257" stroke-width="3"/><path d="M58 50q-14-1-12-9 13-2 14 7 1-12 12-10 2 10-14 12" fill="#85a763"/>'
      : '<g transform="translate(12 -9) scale(.78)">' +
        (p.etape === 1 ? dessins.pousse : dessins[p.culture]) +
        "</g>";
  return (
    '<svg class="m-parcelle-art" viewBox="0 0 120 130" aria-hidden="true"><ellipse cx="60" cy="113" rx="49" ry="8" fill="#d3dbc2" opacity=".65"/><path d="m10 70 50-22 50 22-50 25Z" fill="#AB704B"/><path d="m10 70 50 23 50-23v25l-50 25-50-25" fill="#E6AE78"/><path d="m60 93 50-23v25l-50 25" fill="#C88D55"/><path d="m16 70 44 20 44-20M60 95v20" fill="none" stroke="#F5D2A7" stroke-width="3"/>' +
    plante +
    "</svg>"
  );
}
export function motifSvg(forme, x = 60, y = 50) {
  const formes = {
    etoiles:
      '<path d="m0-7 2 5 6 .5-4.5 3.5L5 8 0 5-5 8-3.5 2-8-1.5-2-2Z" fill="#FFC83D" stroke="#EFAC28" stroke-width=".6"/>',
    coeur: '<path d="M0 7C-18-4-5-13 0-5 5-13 18-4 0 7" fill="#FF7E9E"/>',
    fleurs:
      '<g fill="#B3A2E8"><circle cy="-5" r="4"/><circle cx="5" cy="-1" r="4"/><circle cx="3" cy="5" r="4"/><circle cx="-3" cy="5" r="4"/><circle cx="-5" cy="-1" r="4"/></g><circle r="3" fill="#FFC83D"/>',
  };
  return `<g transform="translate(${Number(x)} ${Number(y)})">${formes[forme] || formes.etoiles}</g>`;
}
export function platSvg(id, deco = "", motifs) {
  const plats = {
    coupe:
      '<path d="M30 46h60q-3 38-30 38T30 46" fill="#B3A2E8"/><ellipse cx="60" cy="46" rx="30" ry="9" fill="#f8ede0"/><path d="M56 84v17h-13v4h34v-4H64V84" fill="#7B65BD"/><g transform="translate(25 8) scale(.36)">' +
      dessins.fraise +
      '</g><g transform="translate(53 10) scale(.3)">' +
      dessins.fraise +
      '</g><path d="M43 39q-3-15 12-17 0-17 13-13 11 5 6 17 12 6 4 15" fill="#fff6e6"/>',
    gateau:
      '<ellipse cx="60" cy="99" rx="48" ry="10" fill="#E7E4F0"/><path d="M23 62q37-20 74 0v28q-38 20-74 0" fill="#ca955e"/><ellipse cx="60" cy="62" rx="37" ry="13" fill="#ffedcd"/><path d="M24 66q8 20 14 4 10 26 17 4 10 20 17-3 10 19 24-3" fill="#ffedcd"/><g transform="translate(47 12) scale(.4)">' +
      dessins.carotte +
      "</g>",
    tartine:
      '<ellipse cx="60" cy="94" rx="49" ry="13" fill="#E7E4F0"/><path d="M20 76Q8 47 33 43q27-22 54 0 26 4 13 33l-9 12H29Z" fill="#ca9965"/><path d="M27 74Q17 51 39 51q24-18 45 2 15-2 10 22l-9 8H33" fill="#f3d69f"/><g fill="#d27c65" stroke="#efa18b" stroke-width="4"><ellipse cx="46" cy="63" rx="14" ry="11"/><ellipse cx="76" cy="69" rx="14" ry="11"/></g><path d="M49 75q1-16 14-14 4 13-14 14" fill="#688753"/>',
    soupe:
      '<ellipse cx="60" cy="104" rx="48" ry="9" fill="#E7E4F0"/><path d="M18 61h84q-8 43-42 43T18 61" fill="#B3A2E8"/><ellipse cx="60" cy="61" rx="42" ry="16" fill="#f5dcc1"/><ellipse cx="60" cy="61" rx="35" ry="12" fill="#FF9F1C"/><path d="M47 63q22-12 29 0-3 7-15 4" fill="none" stroke="#f4dca5" stroke-width="3"/><path d="M50 35q-9-8 0-16m16 17q-9-8 0-16" fill="none" stroke="#B3A2E8" stroke-width="3" stroke-linecap="round"/>',
  };
  const marque =
    deco === "etoiles"
      ? '<path d="m60 41 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#FFC83D"/>'
      : deco === "coeur"
        ? '<path d="M60 61q-23-16-13-22 9-5 13 5 5-10 14-5 10 8-14 22" fill="#FF8AA7"/>'
        : deco === "fleurs"
          ? '<g fill="#FF8AA7"><circle cx="55" cy="43" r="6"/><circle cx="65" cy="43" r="6"/><circle cx="51" cy="52" r="6"/><circle cx="69" cy="52" r="6"/><circle cx="60" cy="58" r="6"/></g><circle cx="60" cy="50" r="6" fill="#f7d586"/>'
          : "";
  return (
    '<svg class="m-art m-plat" viewBox="0 0 120 120" aria-hidden="true">' +
    (plats[id] || plats.coupe) +
    (motifs ? motifs.map((m) => motifSvg(m.forme, m.x, m.y)).join("") : marque) +
    "</svg>"
  );
}
export function outilSvg(id, culture = "fraise") {
  if (id === "graines")
    return `<svg viewBox="0 0 120 140" class="j-outil-art" aria-hidden="true"><rect x="18" y="14" width="84" height="112" rx="12" fill="#FFF3C4" stroke="#E5BD72" stroke-width="3"/><path d="M18 30h84M18 110h84" stroke="#E5BD72" stroke-width="3" stroke-dasharray="5 4"/><g transform="translate(18 26) scale(.7)">${dessins[culture]}</g><circle cx="60" cy="18" r="4" fill="#fff"/></svg>`;
  if (id === "arrosoir")
    return '<svg viewBox="0 0 160 140" class="j-outil-art" aria-hidden="true"><path d="M106 56c55-50 65 20 18 24" fill="none" stroke="#7B65BD" stroke-width="12"/><path d="m57 68-39-23-8 12 43 42" fill="#7B65BD"/><path d="m13 40-12 25 12 6 13-26" fill="#B3A2E8"/><rect x="44" y="48" width="82" height="72" rx="22" fill="#9F8BD5"/><ellipse cx="85" cy="50" rx="40" ry="10" fill="#C6B7EC"/><ellipse cx="85" cy="50" rx="29" ry="5" fill="#5E4B9E"/><path d="M58 68v28q0 9 9 9" fill="none" stroke="#DCD3F7" stroke-width="7" stroke-linecap="round"/><path d="m89 74 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z" fill="#FFC83D"/></svg>';
  if (id === "nuage")
    return '<svg viewBox="0 0 180 100" class="j-outil-art" aria-hidden="true"><path d="M33 85C-2 85 0 40 31 40 25 1 85-7 101 25 133 3 157 29 151 48 185 42 190 85 156 85Z" fill="#fff" stroke="#CFDDF1" stroke-width="3"/><path d="M45 65q14 8 29 1" fill="none" stroke="#E5EEF9" stroke-width="6" stroke-linecap="round"/></svg>';
  return illustration(id);
}
export function bolSvg() {
  return '<svg class="m-art m-bol" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="108" rx="44" ry="7" fill="#1F2547" opacity=".08"/><g class="m-cuillere"><path d="m72 63 28-49" stroke="#D9B58F" stroke-width="8" stroke-linecap="round"/><ellipse cx="69" cy="67" rx="9" ry="14" fill="#D9B58F" transform="rotate(30 69 67)"/></g><ellipse cx="60" cy="61" rx="42" ry="13" fill="#F9E7BB"/><path d="M18 61h84q-5 45-42 45T18 61" fill="#B3A2E8"/><path d="M24 67q4 25 21 29" fill="none" stroke="#DCD3F7" stroke-width="5" stroke-linecap="round"/><ellipse cx="60" cy="61" rx="34" ry="8" fill="#FFF3C4"/><circle cx="51" cy="59" r="4" fill="#FF8A65"/><circle cx="70" cy="62" r="4" fill="#FFC83D"/><circle cx="84" cy="60" r="3" fill="#FF8A65"/></svg>';
}
export function icone(id) {
  const d = {
    jardin: '<path d="M12 21V10M12 14C3 15 2 9 3 5c7 0 10 4 9 9Zm0-4c0-7 6-9 9-8 1 6-3 11-9 8Z"/>',
    cuisine: '<path d="M5 20h14v-9a4 4 0 0 0 0-8 5 5 0 0 0-9-1 4 4 0 0 0-5 7v11Zm0-5h14"/>',
    cadeau: '<path d="M3 9h18v5H3zm2 5v7h14v-7M12 9v12M12 9C1 9 7-2 12 9c11 0 5-11 0 0Z"/>',
    carnet: '<path d="M5 3h14v18H5zM2 7h6M2 12h6M2 17h6M11 8h5m-5 4h5"/>',
    fleche: '<path d="m9 5-7 7 7 7M2 12h19"/>',
    soleil:
      '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    lune: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
    check: '<path d="m5 12 5 5L20 6"/>',
  };
  return (
    '<svg class="m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (d[id] || d.jardin) +
    "</svg>"
  );
}
