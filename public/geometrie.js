// Coordonnées bornées : aucun HTML ou SVG fourni par l'assistant.
const lettre = (i) => String.fromCharCode(65 + i);
const milieu = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const unite = (a, b) => {
  const longueur = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / longueur, (b[1] - a[1]) / longueur];
};
const avancer = (p, u, d) => [p[0] + u[0] * d, p[1] + u[1] * d];
const coord = (p) => p.map((n) => Math.round(n * 100) / 100).join(",");
export function segmentSvg(a, b, teinte = "#df922b") {
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${teinte}" stroke-width="3.5" stroke-linecap="round"/>`;
}
function marques(a, b, nombre, teinte) {
  const m = milieu(a, b),
    u = unite(a, b),
    n = [-u[1], u[0]];
  return Array.from({ length: nombre }, (_, i) => {
    const p = avancer(m, u, (i - (nombre - 1) / 2) * 5);
    return segmentSvg(avancer(p, n, -6), avancer(p, n, 6), teinte);
  }).join("");
}
function angle(p, a, b) {
  const u = unite(p, a),
    v = unite(p, b);
  if (Math.abs(u[0] * v[0] + u[1] * v[1]) > 0.02) return "";
  const pu = avancer(p, u, 11),
    pv = avancer(p, v, 11),
    coin = avancer(pu, v, 11);
  return `<polyline points="${coord(pu)} ${coord(coin)} ${coord(pv)}" fill="none" stroke="#159b85" stroke-width="2.5"/>`;
}
function intersection(a, b, c, d) {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(den) < 0.001) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
export function figureSvg(figure, options = {}) {
  const pts = figure.points;
  const id = /^[A-L]$/.test(figure.id) ? figure.id : "A";
  let contenu = `<polygon points="${pts.map(coord).join(" ")}" fill="#eee7ff" stroke="#7054b4" stroke-width="3.5" stroke-linejoin="round"/>`;
  if (pts.length === 4) {
    const [a, b, c, d] = pts;
    if (figure.diagonales || figure.codage_diagonales) {
      contenu += segmentSvg(a, c, "#df922b") + segmentSvg(b, d, "#4a86d4");
      const o = intersection(a, c, b, d);
      if (o && ["milieux", "egales", "egales_perpendiculaires"].includes(figure.codage_diagonales)) {
        const n = figure.codage_diagonales === "milieux" ? 2 : 1;
        contenu += marques(a, o, 1, "#df922b") + marques(o, c, 1, "#df922b");
        contenu += marques(b, o, n, "#4a86d4") + marques(o, d, n, "#4a86d4");
      }
      if (o && ["perpendiculaires", "egales_perpendiculaires"].includes(figure.codage_diagonales))
        contenu += angle(o, a, b);
    }
    if (figure.codage_cotes)
      pts.forEach((p, i) => {
        contenu += marques(p, pts[(i + 1) % 4], figure.codage_cotes === "egaux" ? 1 : (i % 2) + 1, "#159b85");
      });
    if (figure.angles_droits)
      pts.forEach((p, i) => {
        contenu += angle(p, pts[(i + 3) % 4], pts[(i + 1) % 4]);
      });
  }
  if (options.sommets ?? figure.sommets) {
    const centre = pts.reduce((p, v) => [p[0] + v[0] / pts.length, p[1] + v[1] / pts.length], [0, 0]);
    pts.forEach((p, i) => {
      const label = avancer(p, unite(centre, p), 14);
      contenu += `<text x="${label[0]}" y="${label[1]}" fill="#443066" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="800">${lettre(i)}</text>`;
    });
  }
  return `<svg viewBox="0 0 300 220" role="img" aria-label="Figure ${id}" xmlns="http://www.w3.org/2000/svg">${contenu}<g data-traits></g></svg>`;
}
export function illustrationHtml(illustration) {
  return `<div class="geo-galerie">${illustration.figures.map((f) => `<div class="geo-figure">${figureSvg(f)}<span class="geo-repere">Figure ${f.id}</span></div>`).join("")}</div>`;
}
export function jeuFigures(zone, q, pret) {
  zone.className = "geo-galerie geo-selection";
  const selection = new Set();
  for (const figure of q.illustration.figures) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "geo-figure tuile";
    bouton.setAttribute("aria-pressed", "false");
    bouton.setAttribute("aria-label", `Sélectionner la figure ${figure.id}`);
    bouton.innerHTML = `${figureSvg(figure)}<span class="geo-repere">${figure.id}</span><span class="geo-coche" aria-hidden="true">✓</span>`;
    bouton.addEventListener("click", () => {
      if (selection.has(figure.id)) selection.delete(figure.id);
      else selection.add(figure.id);
      bouton.classList.toggle("choisie", selection.has(figure.id));
      bouton.setAttribute("aria-pressed", String(selection.has(figure.id)));
      pret(selection.size ? { valeur: [...selection].sort().join(" ‖ "), el: zone } : null);
    });
    zone.append(bouton);
  }
}
export function jeuDiagonales(zone, q, pret) {
  const f = q.illustration.figures[0];
  zone.className = "geo-atelier";
  zone.innerHTML = `<p class="geo-aide">Touche un sommet, puis un autre pour les relier.</p><div class="geo-dessin">${figureSvg(f, { sommets: false })}${f.points.map((p, i) => `<button type="button" class="geo-sommet" data-sommet="${lettre(i)}" style="left:${p[0] / 3}%;top:${p[1] / 2.2}%" aria-label="Sommet ${lettre(i)}" aria-pressed="false">${lettre(i)}</button>`).join("")}</div><p class="geo-etat" role="status">Deux traits à tracer.</p><button type="button" class="lien geo-effacer">Effacer les traits</button>`;
  let depart = null;
  const traits = new Set();
  const etat = zone.querySelector(".geo-etat");
  const peindre = () => {
    zone.querySelector("[data-traits]").innerHTML = [...traits]
      .map((t) => segmentSvg(f.points[t.charCodeAt(0) - 65], f.points[t.charCodeAt(1) - 65]))
      .join("");
    zone
      .querySelectorAll("[data-sommet]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sommet === depart)));
    pret(traits.size === 2 ? { valeur: [...traits].sort().join(" ‖ "), el: zone } : null);
  };
  zone.querySelectorAll("[data-sommet]").forEach((b) =>
    b.addEventListener("click", () => {
      const sommet = b.dataset.sommet;
      if (depart === null) {
        depart = sommet;
        etat.textContent = `Sommet ${sommet} choisi. Choisis l’autre extrémité.`;
      } else if (depart === sommet) {
        depart = null;
        etat.textContent = "Choisis un sommet.";
      } else {
        const trait = [depart, sommet].sort().join("");
        if (traits.has(trait)) traits.delete(trait);
        else if (traits.size < 2) traits.add(trait);
        depart = null;
        etat.textContent =
          traits.size === 2
            ? "Deux traits tracés. Tu peux vérifier ou les effacer."
            : "Encore un trait à tracer.";
      }
      peindre();
    }),
  );
  zone.querySelector(".geo-effacer").addEventListener("click", () => {
    traits.clear();
    depart = null;
    etat.textContent = "Deux traits à tracer.";
    peindre();
  });
}
export function montrerCorrectionGeometrique(zone, q, reponse) {
  if (q.type === "figures") {
    const ids = reponse.split(" ‖ ");
    zone.querySelectorAll(".geo-figure").forEach((b, i) => {
      b.classList.toggle("revelee", ids.includes(q.illustration.figures[i].id));
    });
  }
  if (q.type === "diagonales") {
    const p = q.illustration.figures[0].points;
    zone.querySelector("[data-traits]").innerHTML =
      segmentSvg(p[0], p[2], "#159b85") + segmentSvg(p[1], p[3], "#159b85");
    zone.querySelector(".geo-etat").textContent =
      "Les diagonales relient les sommets opposés : A avec C, et B avec D.";
  }
}
