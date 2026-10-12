/** La fusée : 6 pièces qui apparaissent au fil des bonnes réponses. */
export function fusee(pieces, nouvelles = 0) {
  const formes = [
    '<path d="M86 116 L62 150 Q74 152 88 146 Z" fill="#FF9F1C"/>',
    '<path d="M134 116 L158 150 Q146 152 132 146 Z" fill="#FF9F1C"/>',
    '<rect x="86" y="102" width="48" height="46" rx="8" fill="url(#corps)"/>',
    '<rect x="86" y="58" width="48" height="50" rx="8" fill="url(#corps)"/>',
    '<circle cx="110" cy="84" r="13" fill="#4BA3F5" stroke="#FFC83D" stroke-width="4"/>',
    '<path d="M110 12 C 127 25, 134 42, 134 60 L86 60 C 86 42, 93 25, 110 12 Z" fill="#FF8A65"/>',
  ];
  const morceaux = formes
    .map((f, i) => {
      if (i < pieces) return `<g class="piece${i >= pieces - nouvelles ? " nouvelle" : ""}">${f}</g>`;
      return f
        .replace(/fill="[^"]*"/, 'fill="none" stroke="#8090C4" stroke-width="2.5" stroke-dasharray="6 5"')
        .replace(/stroke="#FFC83D" stroke-width="4"/, "");
    })
    .join("");
  const etoiles = [
    [22, 26],
    [192, 20],
    [204, 104],
    [30, 120],
    [166, 150],
    [52, 76],
    [182, 62],
    [12, 70],
  ]
    .map(
      ([x, y], i) =>
        `<circle class="etoile-scintille" style="animation-delay:${i * 0.35}s" cx="${x}" cy="${y}" r="${i % 3 ? 1.7 : 2.6}" fill="#fff"/>`,
    )
    .join("");
  return `
    <svg viewBox="0 0 220 180" aria-label="La fusée : ${pieces} pièces sur 6">
      <defs><linearGradient id="corps" x1="0" x2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5DCF2"/></linearGradient></defs>
      ${etoiles}
      <circle cx="36" cy="38" r="13" fill="#FF8A65"/><ellipse cx="36" cy="38" rx="22" ry="5" fill="none" stroke="#FFC83D" stroke-width="2.5" transform="rotate(-20 36 38)"/>
      <circle cx="190" cy="140" r="8" fill="#B3A2E8" opacity=".8"/>
      <path d="M0 172 Q110 154 220 172 V180 H0Z" fill="#26325C"/>
      <rect x="78" y="149" width="64" height="6" rx="3" fill="#4A5A8E"/>
      <g class="groupe-fusee">
        <g class="flammes"><path class="flamme-anim" d="M94 148 Q110 196 126 148 Z" fill="#FFC83D"/><path class="flamme-anim" d="M101 148 Q110 176 119 148 Z" fill="#FF8A65"/></g>
        ${morceaux}
      </g>
    </svg>`;
}

/** Le jardin : une fleur s'ouvre à chaque bonne réponse. */
export function jardin(faites, total, nouvelles = 0, fete = false) {
  const couleurs = ["#FF9F1C", "#FF8A65", "#7B65BD", "#4BA3F5", "#FFC83D"];
  const pas = 220 / (total + 1);
  let plantes = "";
  for (let i = 0; i < total; i++) {
    const x = Math.round(pas * (i + 1));
    if (i < faites) {
      const c = couleurs[i % couleurs.length];
      plantes += `<g class="piece${i >= faites - nouvelles ? " nouvelle" : ""}">
        <path d="M${x} 150 V96" stroke="#2EAE6B" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="${x - 9}" cy="122" rx="9" ry="5" fill="#34C77B" transform="rotate(-30 ${x - 9} 122)"/>
        <ellipse cx="${x + 9}" cy="112" rx="8" ry="4.5" fill="#34C77B" transform="rotate(30 ${x + 9} 112)"/>
        ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${x}" cy="78" rx="7" ry="12" fill="${c}" transform="rotate(${a} ${x} 90)"/>`).join("")}
        <circle cx="${x}" cy="90" r="7" fill="#FFF3C4"/></g>`;
    } else {
      plantes += `<path d="M${x} 150 V136" stroke="#2EAE6B" stroke-width="5" stroke-linecap="round"/><ellipse cx="${x}" cy="132" rx="5" ry="6" fill="#34C77B"/>`;
    }
  }
  const papillons = fete
    ? [
        [50, 60, "#FF8A65"],
        [160, 46, "#7B65BD"],
        [110, 30, "#4BA3F5"],
      ]
        .map(
          ([x, y, c], i) =>
            `<g class="papillon" style="animation-delay:${i * 0.5}s"><ellipse cx="${x - 5}" cy="${y}" rx="6" ry="8" fill="${c}"/><ellipse cx="${x + 5}" cy="${y}" rx="6" ry="8" fill="${c}"/><rect x="${x - 1}" y="${y - 6}" width="2" height="12" rx="1" fill="#1F2547"/></g>`,
        )
        .join("")
    : "";
  return `
    <svg viewBox="0 0 220 180" aria-label="Le jardin : ${faites} fleurs sur ${total}">
      <circle cx="186" cy="30" r="16" fill="#FFC83D"/><circle cx="186" cy="30" r="24" fill="#FFC83D" opacity=".25"/>
      <ellipse cx="50" cy="34" rx="22" ry="9" fill="#fff"/><ellipse cx="66" cy="28" rx="14" ry="9" fill="#fff"/>
      <path d="M0 150 Q60 128 120 146 T220 140 V180 H0Z" fill="#9FE0AE"/>
      <rect x="0" y="150" width="220" height="30" fill="#7ED389"/><rect x="0" y="150" width="220" height="5" fill="#5CC46D"/>
      ${plantes}${papillons}
    </svg>`;
}
