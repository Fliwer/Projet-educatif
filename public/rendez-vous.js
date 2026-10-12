// Vue originale de Lumo : progression hebdomadaire, sans série quotidienne à préserver.
const h = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
function carteRendezVous(etat, compact = false) {
  const objectif = Number(etat.objectif),
    faits = Math.min(etat.seances, objectif);
  const points = [
    [45, 85],
    [105, 38],
    [177, 82],
    [235, 30],
  ].slice(0, objectif);
  const titre = etat.atteint ? "Ton ciel s’illumine !" : "Ton rendez-vous avec Milo";
  const detail = etat.atteint
    ? "Ton objectif est atteint. Tu peux faire une pause."
    : `Encore ${objectif - faits} petite${objectif - faits > 1 ? "s" : ""} séance${objectif - faits > 1 ? "s" : ""}, à ton rythme.`;
  const fin = new Date(`${etat.semaine}T12:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + 6);
  const date = (d) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `<section class="rv-carte ${compact ? "rv-compact" : ""}" aria-label="Rendez-vous avec Milo"><div class="rv-entete"><div><p class="rv-semaine">${h(date(etat.semaine))} – ${h(date(fin.toISOString().slice(0, 10)))}</p><h2>${titre}</h2></div><span class="rv-compteur" aria-label="${faits} séance${faits === 1 ? "" : "s"} sur ${objectif}">${faits}<small> / ${objectif}</small></span></div>
  <svg class="rv-ciel" viewBox="0 0 280 115" role="img" aria-label="${faits} étoile${faits === 1 ? " illuminée" : "s illuminées"} sur ${objectif}"><path d="M18 110Q140 50 265 106" fill="none" stroke="#e5ddfa" stroke-width="2"/><polyline points="${points.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#cbbded" stroke-width="3" stroke-dasharray="5 7"/>${points.map(([x, y], i) => `<g transform="translate(${x} ${y})" class="${i < faits ? "rv-allumee" : "rv-attente"}"><circle r="20" fill="${i < faits ? "#fff2c4" : "#f3effc"}"/><path d="m0-13 4 8 9 2-7 7 2 9-8-4-8 4 2-9-7-7 9-2Z" fill="${i < faits ? "#ffc84d" : "#d7ceee"}" stroke="${i < faits ? "#bb841e" : "#b4a3d4"}" stroke-width="1.5"/></g>`).join("")}<circle cx="250" cy="95" r="3" fill="#9d89d2"/><circle cx="16" cy="32" r="2" fill="#9d89d2"/></svg>
  <p class="rv-detail" role="status">${detail}</p>${compact ? "" : `<p class="rv-aide">Une mission terminée compte pour la journée. Tes étoiles restent allumées si tu manques un jour.</p><details class="rv-reglage"><summary>Choisir le rythme avec un parent</summary><p>Deux, trois ou quatre jours de pratique cette semaine. Les entraînements comptent aussi, au maximum une fois par jour.</p><div class="rv-choix">${[2, 3, 4].map((n) => `<button type="button" data-rythme="${n}" aria-pressed="${n === objectif}">${n} séances</button>`).join("")}</div><p class="rv-retour" role="status"></p></details>`}</section>`;
}
export function rendezVousVue(etat, compact = false) {
  const carte = carteRendezVous(etat, compact);
  if (compact || !etat.historique.length) return carte;
  const date = (d) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const historique = `<details class="rv-historique"><summary>Mes ciels précédents</summary><p class="rv-aide">Tes huit dernières semaines de pratique restent ici.</p><ul>${etat.historique.map((s) => `<li>Semaine du ${h(date(s.semaine))} : ${Number(s.seances)} jour${Number(s.seances) > 1 ? "s" : ""} de pratique · objectif ${Number(s.objectif)}.</li>`).join("")}</ul></details>`;
  return carte.replace("</section>", historique + "</section>");
}
export function brancherRendezVous(app, etat, appel, identifiant, actualiser) {
  let commande = null,
    enCours = false;
  app.querySelectorAll("[data-rythme]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (enCours) return;
      const objectif = Number(b.dataset.rythme);
      if (objectif === etat.objectif && !commande) return;
      if (!commande) commande = { objectif, version: etat.version, requete_id: identifiant() };
      enCours = true;
      app.querySelectorAll("[data-rythme]").forEach((btn) => (btn.disabled = true));
      const statut = app.querySelector(".rv-retour");
      try {
        await appel("/api/rendez-vous", { method: "POST", body: JSON.stringify(commande) });
        if (!statut?.isConnected) return;
        await actualiser();
        app.querySelector(".rv-carte")?.scrollIntoView({ block: "center", behavior: "instant" });
      } catch (e) {
        if (!statut?.isConnected) return;
        statut.textContent =
          e.statut === 409
            ? "Le rythme a changé. Reviens à la carte pour l’actualiser."
            : "La connexion fait une pause. Retouche un bouton pour réessayer ton choix.";
        if (e.statut >= 400 && e.statut < 500) commande = null;
      } finally {
        enCours = false;
        if (statut?.isConnected)
          app.querySelectorAll("[data-rythme]").forEach((btn) => (btn.disabled = false));
      }
    }),
  );
}
