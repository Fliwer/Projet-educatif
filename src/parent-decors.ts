// Fonds réutilisables par branche : aucune image à générer lors de l’ajout d’une leçon.
export function decorBranche(matiere: string) {
  const scenes: Record<string, string> = {
    Mathématiques: `<ellipse cx="153" cy="153" rx="120" ry="12" fill="#bed3e8" opacity=".5"/>
      <g transform="rotate(-8 100 93)"><rect x="40" y="32" width="112" height="121" rx="15" fill="#386a94"/><rect x="47" y="28" width="112" height="119" rx="14" fill="#fffdf6"/><path d="M65 53h75M65 69h75M65 85h75M65 101h75M65 117h75M80 42v91M100 42v91M120 42v91" stroke="#d4e4ef" stroke-width="2"/><text x="104" y="81" fill="#315f88" font-size="28" font-weight="700" text-anchor="middle">1 2 3</text><path d="M80 110h18m-9-9v18m18-8h18" stroke="#8b70ad" stroke-width="4" stroke-linecap="round"/></g>
      <g transform="rotate(12 208 122)"><path d="M169 83h91v71h-91Z" fill="#e6b668"/><path d="M181 96h67v45h-67Z" fill="#f8dfab"/><path d="M187 96v13m12-13v8m12-8v13m12-13v8m12-8v13" stroke="#9f7235" stroke-width="2"/></g>
      <circle cx="216" cy="47" r="24" fill="#b1c8e6"/><path d="m216 30 15 26h-30Z" fill="#fff" stroke="#587cab" stroke-width="2"/>
      <rect x="143" y="122" width="35" height="35" rx="9" fill="#aa93cb" transform="rotate(8 160 140)"/><path d="M152 139h17m-8-8v16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    Français: `<ellipse cx="150" cy="152" rx="119" ry="12" fill="#dcc2d8" opacity=".5"/>
      <path d="M46 64q50-21 106 0 54-21 104 0v77q-50-18-104 2-56-20-106-2Z" fill="#9d6892"/>
      <path d="M43 56q53-20 109 1 56-21 109-1v78q-53-19-109 3-56-22-109-3Z" fill="#fffdf7" stroke="#c29bb6" stroke-width="2"/>
      <path d="M152 57v80M63 84h62M63 98h52M63 112h60M178 84h61M178 98h51M178 112h60" stroke="#cbb4c9" stroke-width="3" stroke-linecap="round"/>
      <g transform="rotate(-11 75 39)"><rect x="54" y="15" width="41" height="43" rx="11" fill="#d9b6d1"/><text x="75" y="46" text-anchor="middle" font-size="29" font-weight="700" fill="#784272">A</text></g>
      <g transform="rotate(9 133 28)"><rect x="113" y="8" width="40" height="40" rx="11" fill="#edcf91"/><text x="133" y="36" text-anchor="middle" font-size="27" font-weight="700" fill="#865d29">B</text></g>
      <g transform="rotate(25 237 106)"><rect x="229" y="57" width="15" height="87" rx="5" fill="#c79bc4"/><path d="m229 144 7 17 8-17" fill="#eacba8"/><path d="m234 156 2 5 3-5" fill="#57445c"/><path d="M229 71h15" stroke="#fff" stroke-width="3"/></g>
      <path d="M199 28h45v26h-22l-10 8V54h-13Z" fill="#fff"/><path d="M208 39h26m-26 7h17" stroke="#bb96b2" stroke-width="2" stroke-linecap="round"/>`,
    Sciences: `<ellipse cx="150" cy="153" rx="120" ry="12" fill="#bcd6bf" opacity=".5"/>
      <path d="M61 127V58" stroke="#4c805b" stroke-width="4"/><path d="M61 100C27 96 26 71 28 61c28 0 39 16 33 39Z" fill="#91bc89"/><path d="M61 77c-3-32 17-44 40-44 0 28-17 42-40 44Z" fill="#bad4a0"/><path d="M35 120h56l-9 35H44Z" fill="#d6a47f"/><path d="M32 118h62v11H32Z" fill="#e4b592"/>
      <path d="M139 33h37m-31 0v42l-28 58q-7 18 13 18h57q20 0 13-18l-30-58V33" fill="#f9fffc" stroke="#729c92" stroke-width="3"/>
      <path d="m134 102-15 31q-6 15 12 15h54q18 0 12-15l-16-31q-24 11-47 0Z" fill="#9ecbc2"/><circle cx="149" cy="120" r="5" fill="#f4ffff"/><circle cx="171" cy="134" r="7" fill="#f4ffff"/><circle cx="164" cy="92" r="3" fill="#9ecbc2"/>
      <circle cx="231" cy="71" r="30" fill="#edf5df" stroke="#a1bd94" stroke-width="3"/><path d="m251 94 17 24" stroke="#6f8e67" stroke-width="10" stroke-linecap="round"/><path d="M230 90V56m0 15c-19 0-19-17-19-17 17 0 19 17 19 17Zm0 8c19 0 19-17 19-17-17 0-19 17-19 17Z" fill="#b4ce9f" stroke="#6f9966" stroke-width="2"/>`,
    Géographie: `<ellipse cx="154" cy="154" rx="124" ry="12" fill="#d9c9a7" opacity=".5"/>
      <path d="m25 103 52-17 48 20 49-18 38 19v49l-38-16-49 18-48-20-52 17Z" fill="#fffdf4" stroke="#d0bd96" stroke-width="2"/><path d="m77 86 48 20v52l-48-20Z" fill="#e2ebd3"/><path d="m174 88 38 19v49l-38-16Z" fill="#e8d7b7"/><path d="m39 118 25-8 23 15 29-7m18 20 31-18 22 12" fill="none" stroke="#99baca" stroke-width="7"/>
      <path d="M177 134h51m-26 0v-16" stroke="#987956" stroke-width="6" stroke-linecap="round"/>
      <circle cx="201" cy="65" r="47" fill="#99bfd8" stroke="#fdf8ec" stroke-width="5"/><path d="m174 31 9 14 19 3-3 17 15 8 17-7 9 16-13 15-17-3-13 13-13-14-6-19-17-5 1-19Z" fill="#b4cc9e"/><path d="M160 30c-24 47 4 98 56 100" fill="none" stroke="#ac8b63" stroke-width="4"/>
      <circle cx="51" cy="46" r="22" fill="#fffaf0" stroke="#dcc69f" stroke-width="2"/><path d="m51 29 7 17-7 17-7-17Z" fill="#a97b54"/><path d="m51 29 7 17h-14Z" fill="#c9a2a0"/>`,
  };
  return `<svg class="decor-lecon" viewBox="0 0 300 180" aria-hidden="true"><path d="M37 123C-3 74 67 7 137 19s143 0 143 72-84 73-147 68-72-6-96-36Z" fill="currentColor" opacity=".055"/>${scenes[matiere] || scenes.Français}<g fill="#c49c53" opacity=".7"><path d="m272 25 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM26 39l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><circle cx="283" cy="130" r="3"/><circle cx="112" cy="16" r="2.5"/></g></svg>`;
}
