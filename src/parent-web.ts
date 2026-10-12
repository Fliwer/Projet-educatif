import { pointsAVerifier } from "./pedagogie.ts";
import type { IncomingMessage, ServerResponse } from "node:http";
import { lireBrouillon, validerBrouillon } from "./parents.ts";
import { lireTexte, limiter, adresseClient } from "./http.ts";

const echapper = (valeur: unknown) =>
  String(valeur).replace(
    /[&<>"']/g,
    (lettre) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[lettre]!,
  );
const nomsJeux: Record<string, string> = {
  associer: "Associations",
  choix: "Choisir une réponse",
  texte: "Réponse courte",
  vrai_faux: "Vrai ou faux",
  ordre: "Remettre dans l’ordre",
  dictee: "Dictée",
};
function page(res: ServerResponse, statut: number, contenu: string) {
  res.writeHead(statut, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    // Conserve l'origine du formulaire local ; aucun lien privé n'est transmis à un autre site.
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
  res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Validation parent · Lumo</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f3efff;color:#292341;font:18px/1.5 system-ui,sans-serif}main{max-width:820px;margin:auto;padding:28px 18px}h1,h2{line-height:1.2}article,section{background:white;padding:20px;border-radius:18px;margin:16px 0}blockquote{margin:12px 0;padding:14px;background:#f4f1fa;border-left:4px solid #7b65bd;white-space:pre-wrap;overflow-wrap:anywhere}button{font:inherit;font-weight:700;background:#7054b4;color:white;border:0;border-radius:14px;padding:16px 22px;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #34c77b;outline-offset:4px}a{color:#65449c}label{display:block;margin:20px 0}input{width:22px;height:22px;vertical-align:middle}p,li{overflow-wrap:anywhere}.reponse{color:#514064;font-size:16px}.garder{padding:12px;background:#f1edf9;border-radius:12px;font-weight:600}.attention{padding:12px;border-left:4px solid #be8b20;background:#fff7df}article:has(.garder input:not(:checked)){background:#f6f4f8}article{border:1px solid #e7def0}input:focus-visible{outline:3px solid #7054b4;outline-offset:3px}button{min-height:48px}details{margin:16px 0}summary{cursor:pointer;padding:12px}</style>
  <main>${contenu}</main></html>`);
}
export async function traiterParent(
  req: IncomingMessage,
  res: ServerResponse,
  chemin: string,
  adresseApp: string,
): Promise<boolean> {
  if (chemin === "/parent" && req.method === "GET") {
    page(
      res,
      200,
      `<h1>Les devoirs deviennent des jeux</h1><section><ol><li>Envoie la photo à ton assistant connecté à Lumo.</li><li>Demande des quêtes pour ton enfant.</li><li>Ouvre le lien d’aperçu proposé par l’assistant.</li><li>Vérifie les exercices et valide leur envoi.</li></ol><p>La photo reste dans ton assistant. Lumo reçoit les exercices et les extraits nécessaires à leur vérification.</p></section><p><a href="/">Ouvrir le jeu enfant</a></p>`,
    );
    return true;
  }
  const correspondance = chemin.match(/^\/parent\/brouillons\/([A-Za-z0-9_-]{43})$/);
  if (!correspondance) return false;
  limiter(`apercu:${adresseClient(req)}`, 120);
  const jeton = correspondance[1];
  const brouillon = lireBrouillon(jeton);
  if (!brouillon) {
    page(
      res,
      404,
      "<h1>Lien indisponible</h1><p>Ce brouillon a expiré ou n’existe pas. Demande un nouvel aperçu à ton assistant.</p>",
    );
    return true;
  }
  if (req.method === "POST") {
    // Le lien privé ne suffit pas à valider : le formulaire de l'aperçu est nécessaire.
    if (
      req.headers.origin !== new URL(adresseApp).origin ||
      !String(req.headers["content-type"]).startsWith("application/x-www-form-urlencoded")
    ) {
      page(
        res,
        403,
        "<h1>Validation indisponible</h1><p>Ouvre l’aperçu et utilise son bouton de validation.</p>",
      );
      return true;
    }
    const corps = await lireTexte(req, 4096);
    const formulaire = new URLSearchParams(corps);
    if (formulaire.get("confirme") !== "oui") {
      page(res, 400, "<h1>Vérifie les jeux avant de les envoyer.</h1>");
      return true;
    }
    try {
      const resultat = validerBrouillon(
        jeton,
        formulaire.get("nonce") ?? "",
        formulaire.get("selection_presente") === "oui" ? formulaire.getAll("question") : undefined,
      );
      page(
        res,
        200,
        `<h1>${resultat.dejaPublie ? "Déjà envoyé" : "Les jeux sont prêts !"}</h1><section><p>${echapper(resultat.enfant.prenom)} peut retrouver les quêtes dans le jeu.</p><p>Code enfant : <strong>${echapper(resultat.enfant.code)}</strong></p></section><a href="/">Ouvrir le jeu</a>`,
      );
    } catch {
      page(
        res,
        400,
        "<h1>Validation impossible</h1><p>Recharge l’aperçu ou demande un nouveau brouillon.</p>",
      );
    }
    return true;
  }
  if (req.method !== "GET") {
    page(res, 405, "<h1>Méthode indisponible</h1>");
    return true;
  }
  if (brouillon.publie) {
    page(res, 200, '<h1>Ces jeux ont déjà été envoyés.</h1><a href="/">Ouvrir le jeu</a>');
    return true;
  }
  const quetes = brouillon.quetes
    .map(
      (quete, indexQuete) =>
        `<section><h2>${echapper(quete.titre)}</h2><p>${echapper(quete.matiere)} · ${echapper(quete.notion)}</p><p><strong>Niveau scolaire :</strong> ${echapper(quete.niveau_scolaire || "À préciser avec le parent")}</p><p>${quete.origine_contenu === "decouverte" ? "Fiche de découverte créée par l’assistant :" : "Extrait fourni par l’assistant, à comparer au devoir :"}</p><blockquote>${echapper(quete.extrait_lecon)}</blockquote>${quete.questions
          .map(
            (question, i) =>
              `<article><label class="garder"><input form="validation" type="checkbox" name="question" value="${indexQuete}:${i}" checked> Garder la question ${i + 1}</label><h3>${i + 1}. ${echapper(question.consigne)}</h3><p>Jeu : ${echapper(nomsJeux[question.type])}</p>${pointsAVerifier(
                question,
              )
                .map((point) => `<p class="attention">À vérifier : ${echapper(point)}</p>`)
                .join(
                  "",
                )}${question.choix ? `<ul>${question.choix.map((choix) => `<li>${echapper(choix)}</li>`).join("")}</ul>` : ""}<p class="reponse">Réponse attendue : ${echapper(question.bonne_reponse ?? (question.elements ?? question.paires)?.map((element) => (Array.isArray(element) ? element.join(" → ") : element)).join(" · "))}</p></article>`,
          )
          .join("")}</section>`,
    )
    .join("");
  page(
    res,
    200,
    `<h1>Les jeux pour ${echapper(brouillon.enfant.prenom)}</h1><p>Rien n’a encore été envoyé. Tu peux retirer une question en décochant « Garder ». Vérifie les consignes, les réponses et leur lien avec la leçon photographiée. L’assistant peut avoir fait une erreur ; cet extrait n’est pas une vérification automatique de la photo.</p>${quetes}<form id="validation" method="post"><input type="hidden" name="selection_presente" value="oui"><input type="hidden" name="nonce" value="${echapper(brouillon.nonce)}"><label><input type="checkbox" name="confirme" value="oui" required> J’ai vérifié ces exercices et leurs réponses.</label><button type="submit">Envoyer les questions gardées</button></form><p>Décoche les questions à retirer. Une mission sans question gardée ne sera pas envoyée. Pour reformuler un exercice, demande un nouveau brouillon à ton assistant. Ce lien est privé et expire après 24 heures.</p>`,
  );
  return true;
}
