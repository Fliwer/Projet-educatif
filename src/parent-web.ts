import { accueilParent } from "./parent-app.ts";
import { db } from "./db.ts";
import { listerEnfants } from "./logic.ts";
import { lireParcours } from "./parcours.ts";
import { lireSuiviParent } from "./suivi-parent.ts";
import { enregistrerProfilParent } from "./profils-parent.ts";
import { randomBytes } from "node:crypto";
import { pointsAVerifier, pointsMission } from "./pedagogie.ts";
import type { IncomingMessage, ServerResponse } from "node:http";
import { lireBrouillon, validerBrouillon } from "./parents.ts";
import { lireTexte, limiter, adresseClient } from "./http.ts";
import { lireInvitation } from "./invitations.ts";
import { FUSEAU } from "./config.ts";
import { illustrationHtml } from "../public/geometrie.js";

const echapper = (valeur: unknown) =>
  String(valeur).replace(
    /[&<>"']/g,
    (lettre) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[lettre]!,
  );
const nonceProfil = randomBytes(32).toString("base64url");
function demoLocaleAutorisee(req: IncomingMessage) {
  return (
    process.env.LUMO_DEMO !== "0" &&
    process.env.LUMO_PARTAGE !== "1" &&
    !req.headers["x-forwarded-for"] &&
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "") &&
    Boolean(db.prepare("SELECT id FROM parents WHERE id=1 AND cle_hash IS NULL").get())
  );
}
const nomsJeux: Record<string, string> = {
  associer: "Associations",
  choix: "Choisir une réponse",
  texte: "Réponse courte",
  vrai_faux: "Vrai ou faux",
  ordre: "Remettre dans l’ordre",
  dictee: "Dictée",
  figures: "Entourer les figures",
  diagonales: "Tracer les diagonales",
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
      "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' blob:; " +
      "form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
  res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${assistant ? "Créer des exercices" : "Validation parent"} · Lumo</title><link rel="stylesheet" href="/geometrie.css">
  <style>*{box-sizing:border-box}body{margin:0;background:#f3efff;color:#292341;font:18px/1.5 system-ui,sans-serif}main{max-width:820px;margin:auto;padding:28px 18px}h1,h2{line-height:1.2}article,section{background:white;padding:20px;border-radius:18px;margin:16px 0}blockquote{margin:12px 0;padding:14px;background:#f4f1fa;border-left:4px solid #7b65bd;white-space:pre-wrap;overflow-wrap:anywhere}button{font:inherit;font-weight:700;background:#7054b4;color:white;border:0;border-radius:14px;padding:16px 22px;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #34c77b;outline-offset:4px}a{color:#65449c}label{display:block;margin:20px 0}input{width:22px;height:22px;vertical-align:middle}p,li{overflow-wrap:anywhere}.reponse{color:#514064;font-size:16px}.garder{padding:12px;background:#f1edf9;border-radius:12px;font-weight:600}.attention{padding:12px;border-left:4px solid #be8b20;background:#fff7df}article:has(.garder input:not(:checked)){background:#f6f4f8}article{border:1px solid #e7def0}input:focus-visible{outline:3px solid #7054b4;outline-offset:3px}button{min-height:48px}details{margin:16px 0}summary{cursor:pointer;padding:12px}</style><link rel="stylesheet" href="/parent.css">
  ${assistant ? '<link rel="stylesheet" href="/parent-app.css"><link rel="stylesheet" href="/parent-suivi.css">' : ""}<body class="${assistant ? "espace-parent-app" : "verification-parent"}"><main>${assistant ? "" : '<p class="retour-parent"><a href="/parent">Lumo · Espace parents</a> · <a href="/">Ouvrir le jeu</a></p>'}${contenu}</main><script src="/parent-parcours.js" defer></script>${assistant ? '<script src="/parent-assistant.js" defer></script><script src="/parent-app.js" defer></script><script src="/parent-ressenti.js" defer></script>' : ""}</html>`);
}
export async function traiterParent(
  req: IncomingMessage,
  res: ServerResponse,
  chemin: string,
  adresseApp: string,
): Promise<boolean> {
  if (chemin === "/parent/profils") {
    if (
      req.method !== "POST" ||
      !demoLocaleAutorisee(req) ||
      req.headers.origin !== new URL(adresseApp).origin ||
      !String(req.headers["content-type"]).startsWith("application/x-www-form-urlencoded")
    ) {
      page(
        res,
        403,
        "<h1>Modification indisponible</h1><p>Ouvrez les profils depuis l’espace parent sur ce PC.</p>",
      );
      return true;
    }
    limiter(`profils:${adresseClient(req)}`, 30);
    const formulaire = new URLSearchParams(await lireTexte(req, 4096));
    if (formulaire.get("nonce") !== nonceProfil) {
      page(res, 403, "<h1>Rechargez le profil avant de l’enregistrer.</h1>");
      return true;
    }
    try {
      const id = enregistrerProfilParent(1, formulaire.get("id") ? Number(formulaire.get("id")) : null, {
        prenom: formulaire.get("prenom"),
        univers: formulaire.get("univers"),
        niveau_scolaire: formulaire.get("niveau_scolaire"),
        pays: formulaire.get("pays"),
        aides: formulaire.get("aides") ?? "",
      });
      res.writeHead(303, {
        Location: `/parent?profil=enregistre&enfant=${id}#profils`,
        "Cache-Control": "no-store",
      });
      res.end();
    } catch {
      page(
        res,
        400,
        '<h1>Le profil n’a pas été enregistré.</h1><p>Vérifiez le prénom, l’année scolaire et le pays.</p><p><a href="/parent#profils">Retour aux profils</a></p>',
      );
    }
    return true;
  }
  const connexion = chemin.match(/^\/parent\/connexion\/([A-Za-z0-9_-]{43})$/);
  if (connexion && req.method === "GET") {
    limiter(`invitation:${adresseClient(req)}`, 30);
    const invitation = lireInvitation(connexion[1]);
    // Même réponse pour un lien inconnu, expiré ou une connexion révoquée.
    if (!invitation) {
      page(
        res,
        404,
        "<h1>Invitation indisponible</h1><p>Demande un nouveau lien à la personne qui t’a invité.</p>",
      );
      return true;
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    });
    const url = new URL(adresseApp).origin;
    const expiration = new Date(invitation.expire).toLocaleString("fr-BE", {
      timeZone: FUSEAU,
      dateStyle: "long",
      timeStyle: "short",
    });
    const message = `Pour Lumo : utilise uniquement mon profil de test ${invitation.code}. Vérifie le profil avec le connecteur et demande-moi l’année scolaire et le pays s’ils manquent ; ne les déduis pas de la photo. Si aucune photo n’est jointe, demande-la. Si elle est floue, coupée ou illisible, demande une autre photo sans créer de brouillon. Si aucune leçon ni consigne n’est identifiable, demande le bon document ou l’objectif de l’activité ; une photo de plante peut être un support de sciences si la consigne est précisée. N’invente pas de texte manquant. Pour une leçon exploitable, prépare 1 à 3 missions de 5 à 8 questions, avec notion et extrait source fidèle. Utilise le connecteur Lumo pour créer un brouillon, puis donne-moi le lien de vérification. Ne publie jamais à ma place. Si la connexion ne fonctionne pas, explique-le sans prétendre avoir envoyé des exercices.`;
    res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connecter ma famille · Lumo</title><style>*{box-sizing:border-box}body{margin:0;background:#f3efff;color:#292341;font:17px/1.5 system-ui}main{max-width:720px;margin:auto;padding:24px 18px}section{background:white;border-radius:20px;padding:20px;margin:18px 0}h1,h2{line-height:1.2}textarea{width:100%;font:inherit;resize:vertical;padding:12px;border:1px solid #c8b9e3;border-radius:12px}button,a{color:#65449c}button{font:inherit;border:1px solid #c8b9e3;border-radius:12px;padding:12px;background:#f3efff;cursor:pointer}a{overflow-wrap:anywhere}</style><main>
    <h1>Bienvenue dans Lumo</h1><p>Une connexion à installer une fois. Ensuite, une photo dans Claude suffit pour préparer les exercices.</p><p><strong>Invitation privée de test.</strong> Ce lien donne accès à la clé de ta famille : ne le partage pas publiquement. Utilise un pseudonyme et des photos sans nom ni information personnelle pour ce pilote.</p>
    <section><h2>1. Connecte Claude à Lumo</h2><p>Dans les paramètres de Claude, ouvre <strong>Connecteurs → Ajouter un connecteur personnalisé</strong>. Si ce menu manque sur téléphone, fais cette étape sur claude.ai avec le même compte.</p><p>Nom : <strong>Lumo</strong></p><label for="url-mcp">URL du serveur</label><textarea id="url-mcp" readonly rows="2">${echapper(url)}/mcp</textarea><button data-copier="url-mcp" hidden>Copier l’URL</button><p>Choisis <strong>Aucune connexion</strong>, puis ajoute cet en-tête de requête. Le serveur utilise une clé privée, pas OAuth.</p><p>Nom de l’en-tête : <strong>Authorization</strong></p><textarea id="cle-mcp" aria-label="Valeur de l’en-tête Authorization" readonly rows="3">Bearer ${echapper(invitation.cle)}</textarea><button data-copier="cle-mcp" hidden>Copier la valeur</button><p>Transport : <strong>HTTP streamable</strong>. Enregistre le connecteur.</p></section>
    <section><h2>2. Vérifie le profil</h2><p>Ouvre une conversation dans Claude sur ton téléphone et active Lumo dans les outils. Demande : <strong>« Liste les enfants dans Lumo, sans modifier les données. »</strong></p><p>Tu dois voir uniquement ton <strong>Profil test</strong>, code <strong>${echapper(invitation.code)}</strong>. Le profil est fictif et séparé des autres familles.</p></section>
    <section><h2>3. Prends la photo du devoir</h2><p>Joins la photo dans cette conversation, puis copie ce message :</p><textarea id="message-photo" aria-label="Message pour préparer les exercices" readonly rows="7">${echapper(message)}</textarea><button data-copier="message-photo" hidden>Copier le message</button><p>Claude te donnera un brouillon. Vérifie les réponses, puis touche <strong>Envoyer les questions gardées</strong>. Les missions seront alors disponibles dans Lumo.</p><p><a href="${echapper(url)}/#profil=${encodeURIComponent(invitation.code)}">Ouvrir Lumo avec mon profil de test</a></p></section><p id="copie-statut" role="status"></p><p>L’invitation expire le ${echapper(expiration)} (${echapper(FUSEAU)}). La connexion créée dans Claude reste active jusqu’à sa révocation. Ce lien de test fonctionne tant que l’ordinateur et son tunnel restent allumés.</p></main><script src="/parent-connexion.js" defer></script></html>`);
    return true;
  }
  if (chemin === "/parent" && req.method === "GET") {
    // Le suivi local est réservé à la famille de démonstration, jamais aux familles distantes.
    const demoLocale = demoLocaleAutorisee(req);
    page(
      res,
      200,
      accueilParent(
        demoLocale
          ? listerEnfants(1).map((enfant) => ({
              enfant,
              missions: lireParcours(db, enfant.id),
              suivis: ([7, 30, 0] as const).map((jours) => lireSuiviParent(db, enfant.id, jours)),
            }))
          : [],
        demoLocale ? nonceProfil : undefined,
      ),
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
        `<div hidden data-brouillon-expire="${brouillon.expire}" data-brouillon-publie="oui"></div><h1>${resultat.dejaPublie ? "Déjà envoyé" : "Les jeux sont prêts !"}</h1><p>Les missions sont disponibles dans le jeu de cet enfant.</p>${accesProfil(resultat.enfant)}`,
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
    page(
      res,
      200,
      `<div hidden data-brouillon-expire="${brouillon.expire}" data-brouillon-publie="oui"></div><h1>Ces jeux ont déjà été envoyés.</h1>${accesProfil(brouillon.enfant)}`,
    );
    return true;
  }
  const quetes = brouillon.quetes
    .map(
      (quete, indexQuete) =>
        `<section><h2>${echapper(quete.titre)}</h2>${pointsMission(quete)
          .map((point) => `<p class="attention">À vérifier : ${echapper(point)}</p>`)
          .join(
            "",
          )}<p>${echapper(quete.matiere)} · ${echapper(quete.notion)}</p><p><strong>Niveau scolaire :</strong> ${echapper(quete.niveau_scolaire || "À préciser avec le parent")}</p><p>${quete.origine_contenu === "decouverte" ? "Fiche de découverte créée par l’assistant :" : "Extrait fourni par l’assistant, à comparer au devoir :"}</p><blockquote>${echapper(quete.extrait_lecon)}</blockquote>${quete.resume ? `<p><strong>Rappel avant de jouer :</strong> ${echapper(quete.resume)}</p>` : `<p class="attention">Pas de rappel de la notion préparé : seuls les repères du jeu seront affichés.</p>`}${quete.questions
          .map(
            (question, i) =>
              `<article><label class="garder"><input form="validation" type="checkbox" name="question" value="${indexQuete}:${i}" checked> Garder la question ${i + 1}</label><h3>${i + 1}. ${echapper(question.consigne)}</h3><p>Jeu : ${echapper(nomsJeux[question.type])}</p>${pointsAVerifier(
                question,
              )
                .map((point) => `<p class="attention">À vérifier : ${echapper(point)}</p>`)
                .join(
                  "",
                )}${question.illustration ? illustrationHtml(question.illustration) : ""}${question.choix ? `<ul>${question.choix.map((choix) => `<li>${echapper(choix)}</li>`).join("")}</ul>` : ""}<p class="reponse">Réponse attendue : ${echapper(question.bonne_reponse ?? (question.elements ?? question.paires)?.map((element) => (Array.isArray(element) ? element.join(" → ") : element)).join(" · "))}</p>${question.indice ? `<p><strong>Indice :</strong> ${echapper(question.indice)}</p>` : ""}${question.aide ? `<p><strong>Aide guidée :</strong> ${echapper(question.aide)}</p>` : ""}${question.explication ? `<p><strong>Explication de la correction :</strong> ${echapper(question.explication)}</p>` : ""}</article>`,
          )
          .join("")}</section>`,
    )
    .join("");
  page(
    res,
    200,
    `<div hidden data-brouillon-expire="${brouillon.expire}" data-brouillon-titre="${echapper(brouillon.enfant.prenom)} · ${echapper(brouillon.quetes.map((q) => q.titre).join(" · "))}"></div><p class="eyebrow">Étape 2 · Vérifier les exercices</p><h1>Les jeux pour ${echapper(brouillon.enfant.prenom)}</h1><p>Rien n’a encore été envoyé. Tu peux retirer une question en décochant « Garder ». Vérifie les consignes, les réponses et leur lien avec la leçon photographiée. L’assistant peut avoir fait une erreur ; cet extrait n’est pas une vérification automatique de la photo.</p>${quetes}<form id="validation" class="validation-barre" method="post" data-enfant="${echapper(brouillon.enfant.prenom)}"><p class="eyebrow">Étape 3 · Envoyer</p><p id="compteur-selection" role="status" aria-live="polite">${brouillon.quetes.reduce((n, q) => n + q.questions.length, 0)} questions pour ${echapper(brouillon.enfant.prenom)}.</p><input type="hidden" name="selection_presente" value="oui"><input type="hidden" name="nonce" value="${echapper(brouillon.nonce)}"><label><input type="checkbox" name="confirme" value="oui" required> J’ai vérifié ces exercices et leurs réponses.</label><button type="submit">Envoyer les questions gardées</button></form><p>Décoche les questions à retirer. Une mission sans question gardée ne sera pas envoyée. Pour reformuler un exercice, demande un nouveau brouillon à ton assistant. Ce lien est privé et expire après 24 heures.</p>`,
  );
  return true;
}
