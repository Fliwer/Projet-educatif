import { illustration, outilSvg, icone } from "./monde-art.js";
import { planteSvg, paysagePotager } from "./potager-art.js";
import { glisser } from "./monde-gestes.js";
import { animationScene, mouvementsCalmes, choisirMouvements } from "./monde-mouvement.js";

const acces = (monde, id) => ["fraise", "carotte"].includes(id) || monde.objets.includes(id);
const progres = (p, heure, duree) =>
  p?.etape === 1 ? Math.max(0, Math.min(1, 1 - (p.mure_le - heure) / duree)) : 0;
const etatPlante = (p, heure) =>
  !p
    ? "Planter ici"
    : p.etape === 0
      ? "À arroser"
      : p.etape === 2
        ? "À cueillir !"
        : `Ça pousse · ${Math.max(1, Math.ceil((p.mure_le - heure) / 60000))} min`;
const texteCourt = (p, heure) =>
  p.etape === 0
    ? "Arroser"
    : p.etape === 2
      ? "Cueillir"
      : `${Math.max(1, Math.ceil((p.mure_le - heure) / 60000))} min`;
const consigne = (outil) =>
  outil === "arrosoir"
    ? "Touche une plante pour lui donner de l’eau."
    : outil === "panier"
      ? "Touche une plante mûre pour remplir ton panier."
      : "Touche la terre pour semer. Tu peux aussi glisser le sachet !";

export function dessinerPotager(monde, { pipSvg, outil, bloque }) {
  return `<section class="m-jardin-titre p-titre"><div><span class="m-eyebrow">Un petit coin qui grandit avec toi</span><h1 id="m-titre" tabindex="-1">Mon potager</h1></div><button id="p-calme" class="p-calme" aria-pressed="${mouvementsCalmes()}">${icone("jardin")} Mouvements calmes</button></section>
  <section class="p-potager" aria-label="Le potager de Milo">
    <div class="p-scene" data-ambiance="${monde.ambiance}">${paysagePotager(monde.ambiance === "soir")}
      <button class="p-lumiere" id="m-ambiance" aria-label="${monde.ambiance === "matin" ? "Passer à la lumière du soir" : "Passer à la lumière du matin"}" ${bloque ? "disabled" : ""}>${icone(monde.ambiance === "matin" ? "soleil" : "lune")}</button>
      <button class="p-cuisine" data-nav="cuisine">${icone("cuisine")} Chez Milo <span>→</span></button>
      ${monde.decors.includes("guirlande") ? '<div class="p-guirlande">' + illustration("guirlande") + illustration("guirlande") + "</div>" : ""}
      ${monde.decors.includes("fontaine") ? '<div class="p-fontaine">' + illustration("fontaine") + "</div>" : ""}
      <div class="p-milo"><div class="p-bulle">Des graines, de l’eau…<br>et un peu de patience !</div><button id="p-bonjour" aria-label="Dire bonjour à Milo">${pipSvg("content", "grand")}</button><span>Milo, ton jardinier</span></div>
      <div class="p-rangees">${Array.from(
        { length: 4 },
        (_, col) =>
          `<div class="p-rangee"><div class="p-terre"></div>${Array.from({ length: 3 }, (_, rang) => {
            const i = col * 3 + rang,
              p = monde.parcelles[i];
            return `<button class="p-case ${p?.etape === 2 ? "p-mure" : ""} ${p?.etape >= 1 ? "p-humide" : ""}" id="p-case-${i}" data-parcelle="${i}" style="--rang:${rang}" aria-label="Emplacement ${i + 1}${p ? " · " + p.culture : ""} · ${etatPlante(p, monde.heure_serveur)}" ${bloque ? "disabled" : ""}><span class="p-vegetal">${planteSvg(p, progres(p, monde.heure_serveur, monde.duree_pousse_ms))}</span><span class="p-etape">${p ? `<span class="p-etape-long">${etatPlante(p, monde.heure_serveur)}</span><span class="p-etape-court" aria-hidden="true">${texteCourt(p, monde.heure_serveur)}</span>` : '<span class="p-plus" aria-hidden="true">+</span>'}</span></button>`;
          }).join("")}</div>`,
      ).join("")}</div>
      <div class="p-effets" aria-hidden="true"></div>
    </div>
    <div class="p-outils" role="group" aria-label="Mes graines et mes outils">
      ${monde.catalogue.cultures.map((c) => `<button class="p-outil p-sachet ${!acces(monde, c.id) ? "p-ferme" : ""}" data-outil="${c.id}" aria-pressed="${outil === c.id}" aria-label="${acces(monde, c.id) ? "Graines de " + c.nom : "Débloquer les graines de " + c.nom}" ${bloque ? "disabled" : ""}>${outilSvg("graines", c.id)}<strong>${c.nom}</strong>${!acces(monde, c.id) ? "<small>À découvrir</small>" : ""}</button>`).join("")}
      <button class="p-outil p-arrosoir" data-outil="arrosoir" aria-pressed="${outil === "arrosoir"}" ${bloque ? "disabled" : ""}>${outilSvg("arrosoir")}<strong>Arroser</strong></button>
      <button class="p-outil p-recolter" data-outil="panier" aria-pressed="${outil === "panier"}" ${bloque ? "disabled" : ""}>${illustration("panier")}<strong>Cueillir</strong></button>
    </div>
    <p class="p-guide" role="status" aria-live="polite">${consigne(outil)}</p>
  </section>
  <section class="p-recolte"><div class="p-recolte-titre">${illustration("panier")}<div><h2>Ma récolte</h2><p>Du potager à ton prochain goûter.</p></div></div><div class="p-stocks">${monde.catalogue.cultures
    .filter((c) => acces(monde, c.id))
    .map(
      (c) =>
        `<span aria-label="${monde.panier[c.id]} ${c.nom}">${illustration(c.id)}<b>${monde.panier[c.id]}</b></span>`,
    )
    .join("")}</div><button class="m-btn" data-nav="cuisine">${icone("cuisine")} Cuisiner</button></section>
  <p class="p-patience">Après l’arrosage, tes plantes poussent en ${Math.round(monde.duree_pousse_ms / 60000)} minutes, même si tu pars jouer ailleurs. Ta récolte t’attendra.</p>`;
}

/** Les dates viennent du serveur. L'horloge monotone sert seulement à afficher la pousse. */
export function brancherPotager(
  racine,
  { monde, outilInitial, choisirOutil, agir, actualiser, naviguer, son, bloque },
) {
  const scene = racine.querySelector(".p-scene");
  const animation = animationScene(scene);
  const depart = performance.now();
  let outil = outilInitial,
    occupe = false,
    detruit = false,
    prochaineLecture = 0,
    pointeurEnCours = false;
  const boutons = [...racine.querySelectorAll("[data-parcelle]")];
  const guide = racine.querySelector(".p-guide");
  const effets = racine.querySelector(".p-effets");
  const heure = () => monde.heure_serveur + performance.now() - depart;
  racine.addEventListener("pointerdown", () => {
    pointeurEnCours = true;
  });
  racine.addEventListener("pointerup", () => {
    pointeurEnCours = false;
  });
  racine.addEventListener("pointercancel", () => {
    pointeurEnCours = false;
  });
  const dire = (texte) => {
    if (animation.presente()) guide.textContent = texte;
  };
  const choisir = (id) => {
    if (occupe || bloque) return;
    if (!["arrosoir", "panier"].includes(id) && !acces(monde, id)) {
      naviguer("cadeau");
      return;
    }
    outil = id;
    choisirOutil(id);
    racine
      .querySelectorAll("[data-outil]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.outil === id)));
    dire(consigne(id));
  };
  async function saluer() {
    const milo = racine.querySelector(".p-milo .pip");
    return Promise.all([
      animation.jouer(
        milo?.querySelector(".bras-d"),
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-35deg)" },
          { transform: "rotate(-12deg)" },
          { transform: "rotate(-35deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 900 },
      ),
      animation.jouer(
        milo?.querySelector(".milo-acteur"),
        [{ transform: "translateY(0)" }, { transform: "translateY(-5px)" }, { transform: "translateY(0)" }],
        { duration: 700 },
      ),
      animation.jouer(
        milo?.querySelector(".milo-pied-g"),
        [{ transform: "rotate(0deg)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(0deg)" }],
        { duration: 700 },
      ),
      animation.jouer(
        milo?.querySelector(".milo-antenne"),
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(12deg)" },
          { transform: "rotate(-9deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 900 },
      ),
    ]);
  }
  function acteur(html, x, y, classe = "") {
    const a = document.createElement("div");
    a.className = "p-acteur " + classe;
    a.innerHTML = html;
    a.style.left = x + "px";
    a.style.top = y + "px";
    effets.append(a);
    return a;
  }
  async function animerGeste(b, action, culture) {
    const r = b.getBoundingClientRect(),
      s = scene.getBoundingClientRect();
    const x = r.left - s.left + r.width / 2,
      y = r.top - s.top + r.height * 0.66;
    const salut = saluer();
    if (action === "recolter") {
      const panier = racine.querySelector('[data-outil="panier"]').getBoundingClientRect();
      const a = acteur(illustration(culture), x - 30, y - 50, "p-fruit-vole");
      await animation.jouer(
        a,
        [
          { transform: "translate(0,0) scale(1)" },
          { transform: `translate(0,-45px) scale(1.15)`, offset: 0.3 },
          {
            transform: `translate(${panier.left + panier.width / 2 - s.left - x}px,${panier.top - s.top - y}px) scale(.35)`,
            opacity: 0,
          },
        ],
        { duration: 850 },
      );
      a.remove();
    } else {
      const arrose = action === "arroser";
      const a = acteur(
        outilSvg(arrose ? "arrosoir" : "graines", culture),
        x + 8,
        y - 116,
        arrose ? "p-verse-eau" : "p-verse-graines",
      );
      await animation.jouer(
        a,
        [
          { transform: "translate(25px,-15px) rotate(0deg)", opacity: 0 },
          { transform: `translate(0,0) rotate(${arrose ? -23 : -120}deg)`, opacity: 1 },
        ],
        { duration: 280 },
      );
      a.style.transform = `rotate(${arrose ? -23 : -120}deg)`;
      const gouttes = Array.from({ length: arrose ? 12 : 5 }, (_, i) => {
        const g = acteur("", x + ((i % 4) - 1.5) * 8, y - 57, arrose ? "p-goutte" : "p-graine");
        return animation
          .jouer(
            g,
            [
              { transform: "translate(10px,-25px)", opacity: 0 },
              { opacity: 1, offset: 0.15 },
              { transform: `translate(${((i % 3) - 1) * 12}px,28px)`, opacity: 0 },
            ],
            { duration: 420, delay: i * 35 },
          )
          .then(() => g.remove());
      });
      await Promise.all(gouttes);
      if (arrose) b.classList.add("p-humide");
      await animation.jouer(a, [{ opacity: 1 }, { opacity: 0, transform: "translate(15px,-10px)" }], {
        duration: 180,
      });
      a.remove();
      if (arrose && monde.parcelles[Number(b.dataset.parcelle)]?.etape === 0) {
        b.querySelector(".p-vegetal").innerHTML = planteSvg({ culture, etape: 1 }, 0);
        await animation.jouer(
          b.querySelector(".p-plante-vivante"),
          [
            { transform: "scale(.2)", opacity: 0.4 },
            { transform: "scale(1.08)", offset: 0.8 },
            { transform: "scale(1)", opacity: 1 },
          ],
          { duration: 420 },
        );
      }
    }
    await salut;
  }
  async function utiliser(b, outilDepose = outil) {
    if (occupe || bloque || !animation.presente()) return;
    const i = Number(b.dataset.parcelle),
      p = monde.parcelles[i];
    const culture = p?.culture || outilDepose;
    let action;
    if (outilDepose === "arrosoir") {
      if (!p) {
        dire("Sème une graine ici avant de l’arroser.");
        return;
      }
      action = "arroser";
    } else if (p?.etape === 2) action = "recolter";
    else if (p) {
      dire(
        p.etape === 0
          ? "Prends l’arrosoir pour réveiller tes graines !"
          : "Ta plante pousse. Tu peux préparer un autre coin ou partir jouer.",
      );
      return;
    } else if (outilDepose === "panier") {
      dire("Le panier attend les plantes mûres. Choisis un sachet pour commencer.");
      return;
    } else action = "planter";
    if (action === "recolter" && monde.panier[culture] > 97) {
      dire("Ton panier est plein ! Passe en cuisine pour préparer un goûter.");
      return;
    }
    occupe = true;
    racine.setAttribute("aria-busy", "true");
    boutons.forEach((c) => (c.disabled = true));
    try {
      await animerGeste(b, action, culture);
      if (!animation.presente()) return;
      if (action === "arroser" && p.etape !== 0) {
        son("clic");
        dire("Une petite douche ! La plante garde son rythme de pousse.");
      } else await agir({ action, parcelle: i, ...(action === "planter" ? { culture } : {}) });
    } finally {
      occupe = false;
      if (animation.presente()) {
        racine.removeAttribute("aria-busy");
        boutons.forEach((c) => (c.disabled = bloque));
      }
    }
  }
  racine.querySelectorAll("[data-outil]").forEach((b) => {
    b.onclick = () => choisir(b.dataset.outil);
    if (!b.classList.contains("p-ferme"))
      glisser(
        b,
        () => (occupe || bloque ? [] : boutons),
        (cible) => {
          choisir(b.dataset.outil);
          utiliser(cible, b.dataset.outil);
        },
      );
  });
  boutons.forEach((b) => (b.onclick = () => utiliser(b)));
  racine.querySelector("#p-bonjour").onclick = () => {
    if (!occupe) {
      dire("Moi, je surveille le potager pendant ta prochaine aventure !");
      saluer();
    }
  };
  racine.querySelector("#p-calme")?.addEventListener("click", (e) => {
    choisirMouvements(!mouvementsCalmes());
    e.currentTarget.setAttribute("aria-pressed", String(mouvementsCalmes()));
  });
  // Aucune requête à chaque seconde : seule l'échéance demande confirmation au serveur.
  const stades = new Map();
  function rafraichir() {
    if (!animation.presente()) {
      detruire();
      return;
    }
    if (occupe || bloque || pointeurEnCours || document.hidden) return;
    const maintenant = heure();
    let echeance = false;
    monde.parcelles.forEach((p, i) => {
      if (p?.etape !== 1) return;
      if (maintenant >= p.mure_le) {
        echeance = true;
        return;
      }
      const b = boutons[i];
      const texte = etatPlante(p, maintenant);
      b.querySelector(".p-etape-long").textContent = texte;
      b.querySelector(".p-etape-court").textContent = texteCourt(p, maintenant);
      b.setAttribute("aria-label", `Emplacement ${i + 1} · ${p.culture} · ${texte}`);
      const grand = progres(p, maintenant, monde.duree_pousse_ms) >= 0.5;
      if (stades.get(i) !== grand) {
        stades.set(i, grand);
        b.querySelector(".p-vegetal").innerHTML = planteSvg(p, grand ? 0.6 : 0);
      }
    });
    if (echeance && performance.now() >= prochaineLecture) {
      prochaineLecture = performance.now() + 30000;
      actualiser();
    }
  }
  const minuterie = setInterval(rafraichir, 1000);
  const revenir = () => {
    if (animation.presente() && !document.hidden && !occupe && !bloque && !pointeurEnCours) actualiser();
  };
  document.addEventListener("visibilitychange", revenir);
  window.addEventListener("online", revenir);
  const observateur = new MutationObserver(() => {
    if (!scene.isConnected) detruire();
  });
  observateur.observe(racine.parentElement, { childList: true });
  function detruire() {
    if (detruit) return;
    detruit = true;
    clearInterval(minuterie);
    document.removeEventListener("visibilitychange", revenir);
    window.removeEventListener("online", revenir);
    observateur.disconnect();
    animation.detruire();
  }
  return detruire;
}
