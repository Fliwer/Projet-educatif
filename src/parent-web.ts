import { pointsAVerifier, pointsMission } from "./pedagogie.ts";
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
function accesProfil(enfant: { prenom: string; code: string }) {
  return `<section><p>Profil destinataire : <strong>${echapper(enfant.prenom)}</strong></p><p>Code enfant : <strong>${echapper(enfant.code)}</strong></p><p><a href="/#profil=${echapper(enfant.code)}">Ouvrir les missions de ${echapper(enfant.prenom)}</a></p><p>Le code sera déjà rempli. Confirme-le pour ouvrir ce profil, même si un autre était utilisé sur cet appareil.</p></section>`;
}
function page(res: ServerResponse, statut: number, contenu: string, assistant = false) {
  res.writeHead(statut, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    // Conserve l'origine du formulaire local ; aucun lien privé n'est transmis à un autre site.
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; " +
      (assistant ? "script-src 'self'; " : "") +
      "form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
  res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${assistant ? "Créer des exercices" : "Validation parent"} · Lumo</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f3efff;color:#292341;font:18px/1.5 system-ui,sans-serif}main{max-width:820px;margin:auto;padding:28px 18px}h1,h2{line-height:1.2}article,section{background:white;padding:20px;border-radius:18px;margin:16px 0}blockquote{margin:12px 0;padding:14px;background:#f4f1fa;border-left:4px solid #7b65bd;white-space:pre-wrap;overflow-wrap:anywhere}button{font:inherit;font-weight:700;background:#7054b4;color:white;border:0;border-radius:14px;padding:16px 22px;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #34c77b;outline-offset:4px}a{color:#65449c}label{display:block;margin:20px 0}input{width:22px;height:22px;vertical-align:middle}p,li{overflow-wrap:anywhere}.reponse{color:#514064;font-size:16px}.garder{padding:12px;background:#f1edf9;border-radius:12px;font-weight:600}.attention{padding:12px;border-left:4px solid #be8b20;background:#fff7df}article:has(.garder input:not(:checked)){background:#f6f4f8}article{border:1px solid #e7def0}input:focus-visible{outline:3px solid #7054b4;outline-offset:3px}button{min-height:48px}details{margin:16px 0}summary{cursor:pointer;padding:12px}</style>
  <main>${contenu}</main>${assistant ? '<script src="/parent-assistant.js" defer></script>' : ""}</html>`);
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
      `<p><a href="/">← Retour au jeu</a> · Espace parent</p>
      <h1>Une photo. Des jeux pour apprendre.</h1>
      <p>Avec ton assistant connecté à Lumo, transforme une leçon en petites missions. Tu gardes le dernier mot avant leur envoi à l’enfant.</p>
      <section><h2>1. Vérifie ta connexion</h2><p>Dans la conversation choisie, active le connecteur Lumo puis demande : <strong>« Liste les enfants dans Lumo, sans modifier les données. »</strong></p><p>Si ton assistant ne trouve pas les profils, la connexion doit être configurée avant d’envoyer le devoir. Écrire « Pour Lumo » seul ne connecte pas ton compte.</p>
      <details><summary>Quel assistant puis-je utiliser ?</summary><p><strong>Codex sur ordinateur :</strong> le connecteur local peut accéder à Lumo sur ce PC. Il ne devient pas accessible sur téléphone.</p><p><strong>ChatGPT :</strong> la connexion distante de ce prototype reste à configurer. La documentation des apps MCP personnalisées indique une utilisation sur le Web, pas sur mobile.</p><p><strong>Claude :</strong> les connecteurs distants sont disponibles sur mobile une fois configurés dans le compte. Le connecteur local de ce prototype ne suffit pas : l’accès distant Lumo reste à installer et tester.</p><p>Vérifié le 12 octobre 2026. <a href="https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt" rel="noreferrer">Documentation ChatGPT</a> · <a href="https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors" rel="noreferrer">Documentation Claude</a></p></details></section>
      <section><h2>2. Ajoute ta photo et ce message</h2><p>Prends une photo nette de la leçon, joins-la dans ton assistant, puis copie ce message. Remplace les informations entre crochets.</p>
      <label for="message-lumo"><strong>Ton message pour l’assistant</strong></label>
      <textarea id="message-lumo" readonly rows="11" style="width:100%;font:inherit;line-height:1.5;padding:14px;border:1px solid #9e8dbe;border-radius:12px;resize:vertical">Pour Lumo : prépare des exercices à partir de cette photo pour [prénom ou pseudonyme], en [année scolaire et pays]. Aides utiles : [facultatif, par exemple consignes courtes].

Utilise le connecteur Lumo. Vérifie le profil et demande-moi si plusieurs enfants correspondent. Si le connecteur n’est pas disponible, dis-le sans prétendre avoir envoyé les exercices.

Respecte les consignes pédagogiques de Lumo. Signale ce qui est illisible et ne le devine pas. Crée un brouillon lié à la leçon, puis donne-moi le lien d’aperçu pour que je vérifie et valide. Ne publie pas à ma place.</textarea>
      <p><button id="copier-message" type="button" hidden>Copier le message</button></p><p id="copie-statut" role="status" aria-live="polite">Tu peux sélectionner et copier le texte ci-dessus.</p><p>Lors des prochaines demandes, « Pour Lumo » et la photo suffiront à indiquer ton intention si le connecteur est actif et que l’assistant connaît le profil et son niveau scolaire.</p></section>
      <section><h2>3. Vérifie, puis envoie</h2><p>Ouvre le lien de brouillon donné par l’assistant. Compare les questions au devoir, vérifie les réponses et décoche les exercices à retirer. Après ta validation, les missions apparaissent dans Lumo.</p><p>La photo est envoyée à l’assistant que tu choisis. Lumo reçoit le texte des exercices et les extraits nécessaires à leur vérification.</p></section>`,
      true,
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
        `<h1>${resultat.dejaPublie ? "Déjà envoyé" : "Les jeux sont prêts !"}</h1><p>Les missions sont disponibles dans le jeu de cet enfant.</p>${accesProfil(resultat.enfant)}`,
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
    page(res, 200, `<h1>Ces jeux ont déjà été envoyés.</h1>${accesProfil(brouillon.enfant)}`);
    return true;
  }
  const quetes = brouillon.quetes
    .map(
      (quete, indexQuete) =>
        `<section><h2>${echapper(quete.titre)}</h2>${pointsMission(quete)
          .map((point) => `<p class="attention">À vérifier : ${echapper(point)}</p>`)
          .join(
            "",
          )}<p>${echapper(quete.matiere)} · ${echapper(quete.notion)}</p><p><strong>Niveau scolaire :</strong> ${echapper(quete.niveau_scolaire || "À préciser avec le parent")}</p><p>${quete.origine_contenu === "decouverte" ? "Fiche de découverte créée par l’assistant :" : "Extrait fourni par l’assistant, à comparer au devoir :"}</p><blockquote>${echapper(quete.extrait_lecon)}</blockquote>${quete.questions
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
