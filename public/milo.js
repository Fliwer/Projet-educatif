// Un seul dessin de Milo, partagé par les missions et les scènes animées.
let sequenceMilo = 0;

export function miloSvg(humeur = "content", taille = "") {
  const identite = `milo-${++sequenceMilo}`;
  const yeux = {
    content: `<circle cx="46" cy="64" r="9" fill="#fff"/><circle cx="74" cy="64" r="9" fill="#fff"/>
      <circle cx="47.5" cy="65.5" r="5.2" fill="#1F2547"/><circle cx="75.5" cy="65.5" r="5.2" fill="#1F2547"/>
      <circle cx="49.5" cy="63" r="1.9" fill="#fff"/><circle cx="77.5" cy="63" r="1.9" fill="#fff"/>
      <g class="paupieres"><ellipse cx="46" cy="64" rx="9.6" ry="9.6" fill="#9886D3"/><ellipse cx="74" cy="64" rx="9.6" ry="9.6" fill="#9886D3"/></g>`,
    joie: `<path d="M38 67 Q46 56 54 67 M66 67 Q74 56 82 67" fill="none" stroke="#1F2547" stroke-width="4.2" stroke-linecap="round"/>`,
    encourage: `<circle cx="46" cy="65" r="9" fill="#fff"/><circle cx="74" cy="65" r="9" fill="#fff"/>
      <circle cx="47" cy="64" r="5.2" fill="#1F2547"/><circle cx="75" cy="64" r="5.2" fill="#1F2547"/>
      <circle cx="49" cy="61.8" r="1.9" fill="#fff"/><circle cx="77" cy="61.8" r="1.9" fill="#fff"/>
      <path d="M38 51 Q46 47 53 50 M67 50 Q74 47 82 51" fill="none" stroke="#5E4B9E" stroke-width="3" stroke-linecap="round"/>`,
    surpris: `<circle cx="46" cy="63" r="11" fill="#fff"/><circle cx="74" cy="63" r="11" fill="#fff"/>
      <circle cx="46" cy="63" r="6" fill="#1F2547"/><circle cx="74" cy="63" r="6" fill="#1F2547"/>
      <circle cx="48.5" cy="60.5" r="2.2" fill="#fff"/><circle cx="76.5" cy="60.5" r="2.2" fill="#fff"/>`,
    dort: `<path d="M38 64 Q46 71 54 64 M66 64 Q74 71 82 64" fill="none" stroke="#1F2547" stroke-width="3.6" stroke-linecap="round"/>
      <text class="zzz" x="94" y="38">z</text><text class="zzz" x="102" y="28" style="animation-delay:.8s">z</text>`,
  }[humeur];
  const bouche = {
    content:
      '<path d="M50 80 Q60 89 70 80" fill="none" stroke="#1F2547" stroke-width="4" stroke-linecap="round"/>',
    joie: '<path d="M47 78 Q60 97 73 78 Z" fill="#1F2547"/><ellipse cx="60" cy="88" rx="6.5" ry="3.6" fill="#FF8A80"/>',
    encourage:
      '<path d="M51 81 Q60 88 69 81" fill="none" stroke="#1F2547" stroke-width="4" stroke-linecap="round"/>',
    surpris: '<ellipse cx="60" cy="84" rx="5.5" ry="6.5" fill="#1F2547"/>',
    dort: '<ellipse cx="60" cy="84" rx="3.5" ry="3" fill="#1F2547"/>',
  }[humeur];
  // Bouche qui parle : cachée au repos, elle s'ouvre selon le volume de la voix (variable --bouche).
  const boucheParle =
    '<g class="bouche-parle"><ellipse cx="60" cy="84" rx="9" ry="8" fill="#1F2547"/><ellipse cx="60" cy="89" rx="5.5" ry="3" fill="#FF8A80"/></g>';
  const brasLeves = humeur === "joie" || humeur === "surpris";
  const bras = brasLeves
    ? '<g class="bras-g"><ellipse cx="10" cy="67" rx="8" ry="13.5" fill="#7B65BD" transform="rotate(-58 10 67)"/></g><g class="bras-d"><ellipse cx="110" cy="67" rx="8" ry="13.5" fill="#7B65BD" transform="rotate(58 110 67)"/></g>'
    : '<g class="bras-g"><ellipse cx="22" cy="78" rx="8" ry="12.5" fill="#7B65BD" transform="rotate(18 22 78)"/></g><g class="bras-d"><ellipse cx="98" cy="78" rx="8" ry="12.5" fill="#7B65BD" transform="rotate(-18 98 78)"/></g>';
  return `
    <svg class="pip ${taille}" data-humeur="${humeur}" data-taille="${taille}" viewBox="0 0 120 124" role="img" aria-label="Milo, ton compagnon">
      <defs>
        <radialGradient id="${identite}-corps" cx="35%" cy="28%" r="78%"><stop offset="0" stop-color="#B9A9EC"/><stop offset="1" stop-color="#7560BA"/></radialGradient>
        <radialGradient id="${identite}-lueur"><stop offset="0" stop-color="#FFF8CC"/><stop offset=".4" stop-color="#FFE066" stop-opacity=".85"/><stop offset="1" stop-color="#FFE066" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="60" cy="119" rx="30" ry="4.5" fill="#1F2547" opacity=".12"/>
      <g class="milo-acteur"><g class="milo-antenne"><path d="M60 32 C 59 21, 65 14, 75 11" fill="none" stroke="#6A56AE" stroke-width="3.6" stroke-linecap="round"/>
      <circle class="lueur" cx="77" cy="10" r="11" fill="url(#${identite}-lueur)"/>
      <circle cx="77" cy="10" r="4.8" fill="#FFE066"/><circle cx="75.6" cy="8.6" r="1.6" fill="#fff"/>
      </g>${bras}
      <g class="milo-pied-g"><ellipse cx="45" cy="111" rx="11" ry="6.5" fill="#6A56AE"/></g><g class="milo-pied-d"><ellipse cx="75" cy="111" rx="11" ry="6.5" fill="#6A56AE"/></g>
      <ellipse cx="60" cy="70" rx="40" ry="40" fill="url(#${identite}-corps)"/>
      <ellipse cx="60" cy="86" rx="24" ry="19" fill="#DCD3F7" opacity=".85"/>
      <ellipse cx="42" cy="44" rx="11" ry="6" fill="#fff" opacity=".28" transform="rotate(-32 42 44)"/>
      <g class="milo-visage">${yeux}
      <circle cx="33" cy="76" r="5.5" fill="#FF8A80" opacity=".42"/><circle cx="87" cy="76" r="5.5" fill="#FF8A80" opacity=".42"/>
      <g class="bouche-repos">${bouche}</g>${boucheParle}</g></g>
    </svg>`;
}
