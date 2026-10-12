import { miloSvg } from "./milo.js";

/** Même célébration pour une mission et sa révision, sans inventer un nouveau cadeau. */
export function finMissionVue(revision = false) {
  const cadeau =
    '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="20" width="32" height="23" rx="4" fill="#d99741"/><rect x="5" y="15" width="38" height="10" rx="3" fill="#efb85f"/><path d="M21 15h6v28h-6z" fill="#fff0b5"/><path d="M24 15C6 15 11 1 18 6c4 3 6 9 6 9zm0 0C42 15 37 1 30 6c-4 3-6 9-6 9z" fill="none" stroke="#d99741" stroke-width="4" stroke-linejoin="round"/></svg>';
  return `<section class="fin-seance">
    <div class="victoire fin-illustration" aria-hidden="true"><div class="rayons"></div><span class="fin-etincelle une">✦</span><span class="fin-etincelle deux">✧</span><span class="fin-etincelle trois">✦</span>${miloSvg("joie", "geant")}</div>
    <h1>${revision ? "Entraînement terminé !" : "Mission terminée !"}</h1>
    <div class="fin-recompense${revision ? " revision" : ""}">${revision ? '<span class="fin-validation" aria-hidden="true">✓</span><span>Entraînement enregistré</span>' : `${cadeau}<span><strong>+1</strong> cadeau à choisir</span>`}</div>
    <div class="fin-actions"><button class="btn" id="continuer-fin">Continuer <span aria-hidden="true">›</span></button></div>
  </section>`;
}
