import { illustration, platSvg, motifSvg, bolSvg } from "./monde-art.js";

const echapper = (texte) =>
  String(texte).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

import { glisser } from "./monde-gestes.js";

/** Les gestes sont locaux ; seule une action terminée passe par la commande serveur idempotente. */
export function ateliers({ lire, dialogue, agir, son, pipSvg, naviguer, celebrerPlat }) {
  function scene({ titre, chapitre, aide, contenu, total, libelle, commande, suite, monter }) {
    dialogue(
      titre,
      `<p class="j-consigne">${aide}</p><div class="j-scene">${contenu}</div><div class="j-bas"><div class="j-compagnon">${pipSvg("content", "petit")}<p id="j-parole">À toi de jouer !</p></div><div class="j-avance"><span id="j-progres" role="status" aria-live="polite">0 / ${total}</span><div class="j-jauge"><i></i></div><button class="m-btn" id="j-suite" disabled>${libelle}</button></div></div><button class="j-aide" id="j-aide">Un coup de patte, Milo ?</button>`,
      (d) => {
        d.classList.add("j-dialogue");
        d.querySelector("h2").insertAdjacentHTML(
          "beforebegin",
          `<span class="m-eyebrow j-chapitre">${chapitre}</span>`,
        );
        let nombre = 0,
          termine = false;
        const suiteBouton = d.querySelector("#j-suite");
        const avancer = (n = 1, parole = "Encore un petit geste…") => {
          if (termine) return;
          nombre = Math.min(total, nombre + n);
          d.querySelector("#j-progres").textContent = `${Math.round(nombre)} / ${total}`;
          d.querySelector(".j-jauge i").style.width = `${(nombre / total) * 100}%`;
          d.querySelector("#j-parole").textContent = parole;
          if (nombre >= total) {
            termine = true;
            d.classList.add("j-reussi");
            suiteBouton.disabled = false;
            d.querySelector("#j-aide").hidden = true;
            son("bravo");
          } else son("clic");
        };
        const aider = monter(d, avancer, () => termine);
        d.querySelector("#j-aide").onclick = () => {
          aider?.();
          avancer(total, "On l'a fait ensemble !");
        };
        suiteBouton.onclick = () => {
          if (!termine) return;
          suiteBouton.disabled = true;
          d.close();
          agir(commande, suite);
        };
      },
    );
  }

  function cuisine(id) {
    const monde = lire(),
      prep = monde.preparation;
    if (prep) id = prep.recette;
    const r = monde.catalogue.recettes.find((r) => r.id === id);
    if (!r) return;
    if (!prep) {
      if (monde.panier[r.culture] < r.quantite) {
        naviguer("jardin");
        return;
      }
      scene({
        titre: "À toi, chef !",
        chapitre: echapper(r.nom).toUpperCase(),
        aide: "Dépose ta récolte dans le bol, ou touche les ingrédients pour les ajouter.",
        contenu: `<div class="j-cuisine-fond"></div><div class="j-ingredients">${[0, 1].map((i) => `<button class="j-ingredient" aria-label="Ajouter l'ingrédient ${i + 1}">${illustration(r.culture)}</button>`).join("")}</div><div class="j-bol-cible" aria-label="Bol de préparation">${bolSvg()}<span>Par ici !</span></div>`,
        total: 2,
        libelle: "Prendre ma cuillère",
        commande: { action: "cuisiner", recette: id },
        suite: () => cuisine(id),
        monter: (d, avancer) => {
          const ingredients = [...d.querySelectorAll(".j-ingredient")],
            bol = d.querySelector(".j-bol-cible");
          const ajouter = (b) => {
            if (b.dataset.fait) return;
            b.dataset.fait = "1";
            b.disabled = true;
            b.classList.add("j-cueilli");
            bol.insertAdjacentHTML(
              "beforeend",
              `<span class="j-ingredient-ajoute">${illustration(r.culture)}</span>`,
            );
            avancer(
              1,
              ingredients.every((i) => i.dataset.fait) ? "Tout est là. C'est toi le chef !" : "Et un !",
            );
          };
          ingredients.forEach((b) => {
            glisser(
              b,
              () => [bol],
              () => ajouter(b),
            );
            b.onclick = () => ajouter(b);
          });
          return () => ingredients.forEach(ajouter);
        },
      });
    } else if (prep.etape === 0) {
      const tartine = id === "tartine";
      scene({
        titre: tartine ? "On assemble la tartine !" : "Tourne, tourne, petite cuillère",
        chapitre: "DANS LA CUISINE DE MILO",
        aide: tartine
          ? "Touche la tartine trois fois pour répartir les ingrédients."
          : "Dessine un cercle dans le bol avec ton doigt ou la souris. Tu peux aussi toucher le bol trois fois.",
        contenu: `<div class="j-cuisine-fond"></div><button id="j-melange" class="j-bol-melange" aria-label="${tartine ? "Assembler la tartine" : "Mélanger la préparation"}">${tartine ? platSvg(id) : bolSvg()}<span class="j-tour-guide">↻</span></button><span class="j-note-recette">${echapper(r.nom)}</span>`,
        total: 3,
        libelle: "La touche du chef !",
        commande: { action: "melanger" },
        suite: () => cuisine(id),
        monter: (d, avancer, fini) => {
          const bol = d.querySelector("#j-melange"),
            cuillere = bol.querySelector(".m-cuillere");
          let prise = false,
            angle = null,
            parcours = 0,
            valide = 0,
            bouge = false;
          const tourner = (radians) => {
            if (fini()) return;
            parcours += radians;
            if (cuillere) cuillere.style.transform = `rotate(${(parcours * 180) / Math.PI}deg)`;
            const n = Math.min(3, Math.floor((parcours + 0.001) / ((Math.PI * 2) / 3)));
            if (n > valide) {
              avancer(n - valide, n === 3 ? "Ça y est ! Place à ton imagination." : "Ça tourne !");
              valide = n;
            }
          };
          if (!tartine) {
            bol.addEventListener("pointerdown", (e) => {
              if (e.button !== 0 || !e.isPrimary) return;
              prise = true;
              angle = null;
              bouge = false;
              bol.setPointerCapture(e.pointerId);
            });
            bol.addEventListener("pointermove", (e) => {
              if (!prise || fini()) return;
              const rect = bol.getBoundingClientRect(),
                x = e.clientX - rect.left - rect.width / 2,
                y = e.clientY - rect.top - rect.height / 2;
              if (Math.hypot(x, y) < 20) {
                angle = null;
                return;
              }
              const a = Math.atan2(y, x);
              if (angle !== null) {
                const delta = Math.abs(Math.atan2(Math.sin(a - angle), Math.cos(a - angle)));
                if (delta > 0.025 && delta < 0.8) {
                  bouge = true;
                  tourner(delta);
                }
              }
              angle = a;
            });
            bol.addEventListener("pointerup", () => {
              prise = false;
            });
            bol.addEventListener("pointercancel", () => {
              prise = false;
              bouge = false;
            });
            bol.addEventListener("lostpointercapture", () => {
              prise = false;
            });
          }
          bol.onclick = (e) => {
            if (bouge && e.detail !== 0) {
              bouge = false;
              return;
            }
            tourner((Math.PI * 2) / 3);
          };
          return () => tourner(Math.PI * 2);
        },
      });
    } else decorer(id);
  }

  function decorer(id) {
    let forme = "etoiles",
      motifs = [];
    dialogue(
      "La touche du chef",
      `<p class="j-consigne">Choisis une décoration, puis touche ton plat pour la poser où tu veux.</p><div class="j-decoration"><div class="j-tampons" role="group" aria-label="Décorations">${[
        ["etoiles", "Étoiles"],
        ["fleurs", "Fleurs"],
        ["coeur", "Cœurs"],
      ]
        .map(
          ([f, t]) =>
            `<button data-tampon="${f}" aria-pressed="${f === forme}" aria-label="${t}"><svg viewBox="0 0 120 120" aria-hidden="true">${motifSvg(f, 60, 60)}</svg><span>${t}</span></button>`,
        )
        .join(
          "",
        )}</div><button class="j-assiette-libre" id="j-assiette" aria-label="Poser une décoration sur mon plat">${platSvg(id, "", motifs)}</button></div><div class="j-deco-outils"><span id="j-deco-statut" role="status">0 / 12 décorations</span><button id="j-annuler" disabled>↶ Enlever la dernière</button></div><div class="j-bas"><div class="j-compagnon">${pipSvg("content", "petit")}<p>Un cœur ici ? Des étoiles partout ? C'est toi qui choisis !</p></div><button class="m-btn" id="j-servir">Servir à Milo !</button></div>`,
      (d) => {
        d.classList.add("j-dialogue", "j-dialogue-deco");
        const assiette = d.querySelector("#j-assiette");
        const dessiner = () => {
          assiette.innerHTML = platSvg(id, "", motifs);
          d.querySelector("#j-deco-statut").textContent = `${motifs.length} / 12 décorations`;
          d.querySelector("#j-annuler").disabled = !motifs.length;
        };
        d.querySelectorAll("[data-tampon]").forEach(
          (b) =>
            (b.onclick = () => {
              forme = b.dataset.tampon;
              d.querySelectorAll("[data-tampon]").forEach((t) =>
                t.setAttribute("aria-pressed", String(t === b)),
              );
            }),
        );
        assiette.onclick = (e) => {
          if (motifs.length >= 12) {
            d.querySelector("#j-deco-statut").textContent =
              "Tes 12 décorations sont posées. Tu peux en enlever une.";
            return;
          }
          const rect = assiette.querySelector("svg").getBoundingClientRect();
          // Au clavier, les décorations s'espacent autour de la crème.
          const a = motifs.length * 2.4;
          const x = e.detail === 0 ? 60 + Math.cos(a) * 18 : ((e.clientX - rect.left) / rect.width) * 120;
          const y = e.detail === 0 ? 48 + Math.sin(a) * 14 : ((e.clientY - rect.top) / rect.height) * 120;
          motifs.push({
            forme,
            x: Math.round(Math.max(20, Math.min(100, x))),
            y: Math.round(Math.max(20, Math.min(90, y))),
          });
          dessiner();
          son("clic");
        };
        d.querySelector("#j-annuler").onclick = () => {
          motifs.pop();
          dessiner();
        };
        d.querySelector("#j-servir").onclick = () => {
          const composition = motifs.map((m) => ({ ...m })),
            decoration = composition[0]?.forme || forme;
          d.close();
          agir({ action: "dresser", decoration, motifs: composition }, () =>
            celebrerPlat(id, decoration, composition),
          );
        };
      },
    );
  }
  return { cuisine };
}
