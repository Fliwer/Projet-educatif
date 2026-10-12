// Lumo · app enfant v3 : carte de quêtes, missions (fusée ou jardin), Milo luciole avec émotions,
// étoiles, cinématique de fin, passage de niveau, et « Ma chambre » avec un cadeau à ouvrir.
// Règle d'or : l'enfant n'est jamais jugé. Pas de rouge, pas de note, pas de « faux ».
import { ouvrirMonde } from "./espace-personnel.js";
import { miloSvg as pipSvg } from "./milo.js";
import { rendezVousVue, brancherRendezVous } from "./rendez-vous.js";
import { nombreFrancais } from "./voix-appareil.js";
import { finMissionVue } from "./fin-mission.js";
import { themeMission, decorMission, classeDecor, phraseProgres } from "./decors-mission.js";
import { celebrerMission } from "./finale-mission.js";
const app = document.getElementById("app");
app.dataset.voixVersion = "milo-20261013";
const CLE_CODE = "lumo-code";
const CLE_SON = "lumo-son";
const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

let code = lire(CLE_CODE) ?? "";
let sonActif = lire(CLE_SON) !== "non";
let mission = null;
let minuterieVisite = null;
let revisionEcran = 0;

// ---------- Outils ----------

function lire(cle) {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle, valeur) {
  try {
    valeur === null ? localStorage.removeItem(cle) : localStorage.setItem(cle, valeur);
  } catch {}
}
function echapper(t) {
  return String(t).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => document.querySelector(sel);
const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// getRandomValues reste disponible sur une tablette en HTTP dans le Wi-Fi local.
function identifiantReponse() {
  const octets = crypto.getRandomValues(new Uint8Array(16));
  octets[6] = (octets[6] & 15) | 64;
  octets[8] = (octets[8] & 63) | 128;
  const h = [...octets].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function appel(chemin, options = {}) {
  const r = await fetch(chemin, {
    signal: AbortSignal.timeout(15_000),
    ...options,
    headers: { "Content-Type": "application/json", "X-Lumo-Code": code, ...(options.headers ?? {}) },
  });
  if (r.status === 401) {
    ecrire(CLE_CODE, null);
    code = "";
    ecranCode("Oups, ce code n'existe pas. Vérifie avec tes parents !");
    throw new Error("code");
  }
  if (!r.ok) {
    const detail = chemin.startsWith("/api/monde") ? await r.json().catch(() => ({})) : {};
    const erreur = new Error(
      detail.erreur ||
        (r.status === 429
          ? "Un petit instant, puis réessaie."
          : "La connexion a été interrompue. Tu peux réessayer."),
    );
    erreur.statut = r.status;
    throw erreur;
  }
  return r.json();
}

function proposerReessai(erreur, action) {
  if (erreur.message === "code") return;
  $("#erreur-connexion")?.remove();
  const zone = document.createElement("div");
  zone.id = "erreur-connexion";
  zone.className = "carte";
  zone.setAttribute("role", "status");
  const texte = document.createElement("p");
  texte.textContent = "La connexion fait une petite pause. Ta progression est conservée.";
  const bouton = document.createElement("button");
  bouton.className = "btn violet";
  bouton.textContent = "Réessayer";
  bouton.addEventListener("click", () => {
    zone.remove();
    action();
  });
  zone.append(texte, bouton);
  app.prepend(zone);
}

/** Change d'écran avec un léger fondu, et ferme ce qui traîne (modales, minuterie). */
function afficher(html, classe = "") {
  revisionEcran++;
  clearTimeout(minuterieVisite);
  document.querySelectorAll(".modale-fond").forEach((m) => m.remove());
  app.className = classe;
  app.setAttribute("aria-live", classe === "monde" ? "off" : "polite");
  if (classe !== "monde" && location.hash.startsWith("#mon-monde"))
    history.replaceState(null, "", location.pathname + location.search);
  app.innerHTML = html;
  window.scrollTo(0, 0);
  if (!mouvementReduit)
    app.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
}

// ---------- Voix, sons, vibrations ----------

// Une seule identité sonore : les enregistrements Milo, sans changement automatique de voix.
let voixServeur = true; // passe à false si le serveur n'a pas de voix configurée
let lecteur = null;
let demandeVoix = 0;
const audiosVoix = new Map(); // texte -> promesse d'URL audio (chaque phrase n'est chargée qu'une fois)

/** Prépare le texte pour la voix : sans émojis, et les signes de maths dits comme un enfant les entend. */
function nettoyer(texte) {
  return texte
    .replace(/[✨🎉🏆]/gu, "")
    .replace(/\s*=\s*\?/g, ", ça fait combien ?")
    .replace(/(\d)\s*[×x]\s*(\d)/g, "$1 fois $2")
    .replace(/\s*÷\s*/g, " divisé par ")
    .replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2")
    .replace(/(\d)\s*[−-]\s*(\d)/g, "$1 moins $2")
    .replace(/\s*=\s*/g, " égale ")
    .trim();
}

function chargerVoix(texte) {
  if (!audiosVoix.has(texte)) {
    if (audiosVoix.size >= 80) {
      const ancienne = audiosVoix.keys().next().value;
      audiosVoix
        .get(ancienne)
        .then((url) => URL.revokeObjectURL(url))
        .catch(() => {});
      audiosVoix.delete(ancienne);
    }
    audiosVoix.set(
      texte,
      fetch("/api/voix", {
        signal: AbortSignal.timeout(12_000),
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Lumo-Code": code },
        body: JSON.stringify({ texte }),
      }).then(async (r) => {
        if (r.status === 503) voixServeur = false;
        if (!r.ok) throw new Error("voix");
        return URL.createObjectURL(await r.blob());
      }),
    );
    audiosVoix.get(texte).catch(() => audiosVoix.delete(texte));
  }
  return audiosVoix.get(texte);
}

// Les calculs simples sont dits en assemblant des morceaux déjà enregistrés (« 7 » + « fois » + « 8 »…) :
// une fois les nombres préparés, toutes les tables sont gratuites.
const OPERATIONS = {
  "×": "fois",
  x: "fois",
  "*": "fois",
  "+": "plus",
  "-": "moins",
  "−": "moins",
  "÷": "divisé par",
  ":": "divisé par",
};
const CALCUL = /^\s*(\d{1,3})\s*([×x*+−÷:\-])\s*(\d{1,3})\s*=\s*\?\s*$/;

/** Découpe ce que dit Milo en morceaux réutilisables (chaque morceau n'est fabriqué qu'une fois). */
function morceauxVoix(texte) {
  const calcul = texte.match(CALCUL);
  if (calcul)
    return [nombreFrancais(calcul[1]), OPERATIONS[calcul[2]], nombreFrancais(calcul[3]), "ça fait combien ?"];
  return [nettoyer(texte)];
}

/** Prépare à l'avance les phrases d'une mission, pour que Milo parle sans attendre. */
function prechargerVoix(textes) {
  if (!sonActif || !voixServeur) return;
  textes.flatMap(morceauxVoix).forEach((t) => chargerVoix(t).catch(() => {}));
}

/** Milo parle. On peut lui donner une phrase, ou une liste de morceaux dits à la suite. */
async function parler(texte) {
  if (!sonActif) return;
  taire();
  const morceaux = (Array.isArray(texte) ? texte : [texte]).flatMap(morceauxVoix).filter(Boolean);
  const ticket = ++demandeVoix;
  if (voixServeur) {
    try {
      const urls = await Promise.all(morceaux.map(chargerVoix));
      if (ticket !== demandeVoix || !sonActif) return;
      $("#etat-voix")?.remove();
      for (const url of urls) {
        if (ticket !== demandeVoix || !sonActif) return; // une autre phrase a été demandée entre-temps
        await jouerMorceau(url);
      }
      return;
    } catch {
      if (ticket !== demandeVoix) return;
    }
  }
  if (ticket !== demandeVoix || !sonActif) return;
  signalerVoixManquante();
}

function signalerVoixManquante() {
  let notice = $("#etat-voix");
  if (!notice) {
    notice = document.createElement("p");
    notice.id = "etat-voix";
    notice.className = "aide-voix";
    notice.setAttribute("role", "status");
    app.prepend(notice);
  }
  notice.textContent =
    "Milo ne peut pas lire cette phrase pour le moment. Demande à un adulte de t’aider, surtout pour une dictée.";
}

/** Joue un morceau de voix, avec les lèvres de Milo qui suivent. Se termine quand le morceau est fini. */
function jouerMorceau(url) {
  return new Promise((fini, rejeter) => {
    const el = new Audio(url);
    el.preservesPitch = true;
    el.playbackRate = REGLAGE_VOIX;
    el.onended = fini;
    el.onpause = fini;
    el.onerror = () => rejeter(new Error("Lecture audio impossible"));
    lecteur = el;
    const mesure = brancherAnalyse(el);
    el.play()
      .then(() => animerBouche(() => lecteur === el && !el.paused && !el.ended, mesure))
      .catch(rejeter);
  });
}

// ---------- Les lèvres de Milo suivent sa voix ----------

const REGLAGE_VOIX = 1; // Lecture d'origine : conserver l'intelligibilité des consignes.
let analyseur = null;
let boucleBouche = 0;

/** Fait passer la voix par un analyseur, pour mesurer le volume à chaque instant. */
function brancherAnalyse(el) {
  try {
    contexteAudio();
    if (audio.state !== "running") return false; // sans contexte audio actif, on garde le son direct
    if (!analyseur) {
      analyseur = audio.createAnalyser();
      analyseur.fftSize = 512;
      analyseur.connect(audio.destination);
    }
    audio.createMediaElementSource(el).connect(analyseur);
    return true;
  } catch {
    return false;
  }
}

/** Ouvre plus ou moins la bouche de Milo selon le volume de la voix (ou en rythme, sans mesure). */
function animerBouche(parleEncore, mesure) {
  cancelAnimationFrame(boucleBouche);
  const donnees = new Uint8Array(512);
  let lisse = 0;
  const image = () => {
    const pip = $(".pip");
    if (!parleEncore()) {
      pip?.classList.remove("parle");
      return;
    }
    let ouverture;
    if (mesure) {
      analyseur.getByteTimeDomainData(donnees);
      let somme = 0;
      for (const v of donnees) somme += ((v - 128) / 128) ** 2;
      ouverture = Math.min(1, Math.sqrt(somme / donnees.length) * 7);
    } else {
      ouverture = 0.25 + 0.55 * Math.abs(Math.sin(performance.now() / 85));
    }
    lisse = lisse * 0.45 + ouverture * 0.55; // évite que la bouche tremble
    if (pip) {
      pip.classList.add("parle");
      pip.style.setProperty("--bouche", Math.max(0.12, lisse).toFixed(2));
    }
    boucleBouche = requestAnimationFrame(image);
  };
  image();
}

// Le navigateur n'autorise le son qu'après un premier toucher : on prépare l'audio à ce moment-là.
document.addEventListener("pointerdown", () => {
  try {
    contexteAudio();
  } catch {}
});
function taire() {
  demandeVoix++;
  lecteur?.pause();
  lecteur = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

let audio = null;
let sortie = null;
/** Sons doux générés par le navigateur, avec un petit écho (aucun fichier audio). */
function contexteAudio() {
  if (!audio) {
    audio = new AudioContext();
    sortie = audio.createGain();
    sortie.gain.value = 0.9;
    const echo = audio.createDelay();
    echo.delayTime.value = 0.13;
    const retour = audio.createGain();
    retour.gain.value = 0.2;
    sortie.connect(audio.destination);
    sortie.connect(echo);
    echo.connect(retour);
    retour.connect(echo);
    retour.connect(audio.destination);
  }
  if (audio.state === "suspended") audio.resume();
}
function note(freq, debut, duree, volume = 0.12, forme = "triangle") {
  const t = audio.currentTime + debut;
  for (const [mult, part] of [
    [1, 1],
    [2, 0.22],
  ]) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = mult === 1 ? forme : "sine";
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume * part, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    osc.connect(g).connect(sortie);
    osc.start(t);
    osc.stop(t + duree + 0.05);
  }
}
const SONS = {
  clic: () => note(720, 0, 0.08, 0.05, "sine"),
  tic: () => note(880, 0, 0.12, 0.08, "sine"),
  bravo: () => [1047, 1319, 1568].forEach((f, i) => note(f, i * 0.07, 0.35, 0.11)),
  doux: () => [587, 523].forEach((f, i) => note(f, i * 0.13, 0.32, 0.07, "sine")),
  etoile: () => [1568, 2093, 2637].forEach((f, i) => note(f, i * 0.05, 0.25, 0.05, "sine")),
  fin: () => {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.11, 0.45, 0.11));
    [523, 659, 784, 1047].forEach((f) => note(f, 0.5, 1.1, 0.05));
  },
  cadeau: () => [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, i * 0.055, 0.45, 0.08)),
  niveau: () => {
    [392, 523, 659, 784].forEach((f, i) => note(f, i * 0.09, 0.3, 0.1));
    [784, 988, 1175, 1568].forEach((f) => note(f, 0.42, 1.3, 0.05));
  },
};
function son(type) {
  if (!sonActif) return;
  try {
    contexteAudio();
    SONS[type]?.();
  } catch {}
}
function vibrer(motif) {
  try {
    navigator.vibrate?.(motif);
  } catch {}
}

// ---------- Icônes dessinées (plus nettes que les émojis, identiques sur toutes les tablettes) ----------

const ICONES = {
  flamme:
    '<path fill="currentColor" d="M12 2.2c.9 3.6 5.3 5.6 5.3 11a5.3 5.3 0 0 1-10.6 0c0-2.6 1.4-4.3 2.6-5.3.2 1.7 1.1 2.8 2.2 3.2-.3-3.2-.9-5.7.5-8.9z"/>',
  etoile:
    '<path fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.1l-5.7 3 1.2-6.3-4.6-4.4 6.3-.8z"/>',
  sonOn:
    '<path fill="currentColor" d="M3.5 9.2h3.8L12.5 5v14l-5.2-4.2H3.5z"/><path d="M15.8 8.6a4.8 4.8 0 0 1 0 6.8M18.4 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  sonOff:
    '<path fill="currentColor" d="M3.5 9.2h3.8L12.5 5v14l-5.2-4.2H3.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  croix:
    '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  check:
    '<path d="M5 12.8l4.4 4.4L19 7.6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
  refaire:
    '<path d="M18.5 12.5a6.5 6.5 0 1 1-2-4.8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path fill="currentColor" d="M20 4v6.2h-6.2z"/>',
  maison: '<path fill="currentColor" d="M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-5.5H9V21H4a1 1 0 0 1-1-1z"/>',
  cadeau:
    '<path fill="currentColor" d="M3.5 8.5h17v4.2h-17zM5 12.7h14V21H5z"/><path d="M12 8.5V21" stroke="#fff" stroke-opacity=".55" stroke-width="2.2"/><path d="M12 8.5C10.6 5 6.3 4.3 6.3 6.8S10 8.5 12 8.5c2 0 5.7.8 5.7-1.7S13.4 5 12 8.5z" fill="none" stroke="currentColor" stroke-width="2"/>',
  maths:
    '<path d="M7 3.6v7M3.5 7.1h7M13.6 7.1h7M4.4 14.4l5.2 5.2M9.6 14.4l-5.2 5.2M13.6 15.4h7M13.6 19h7" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>',
  livre:
    '<path fill="currentColor" d="M2.5 5.2c3.4-1.3 6.6-1 9 .9v14c-2.4-1.8-5.6-2.1-9-.9zM21.5 5.2c-3.4-1.3-6.6-1-9 .9v14c2.4-1.8 5.6-2.1 9-.9z"/>',
  crayon:
    '<path fill="currentColor" d="M4 20l.9-4.6L15.6 4.7a1.8 1.8 0 0 1 2.5 0l1.2 1.2a1.8 1.8 0 0 1 0 2.5L8.6 19.1z"/>',
  globe:
    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" fill="none" stroke="currentColor" stroke-width="2"/>',
  fiole:
    '<path d="M9 3h6M10 3v6.2L4.8 18.4A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><path fill="currentColor" d="M7.2 15h9.6l2 3.7a1 1 0 0 1-.9 1.5H6.1a1 1 0 0 1-.9-1.5z"/>',
  note: '<path d="M9 18V6l11-2.5V16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="3" fill="currentColor"/><circle cx="17.5" cy="16" r="3" fill="currentColor"/>',
  bulle:
    '<path fill="currentColor" d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-5.5 4v-4H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5z"/>',
  fleche:
    '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
};
const ic = (nom) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nom]}</svg>`;

const MATIERES = {
  maths: "maths",
  math: "maths",
  mathematiques: "maths",
  calcul: "maths",
  tables: "maths",
  lecture: "livre",
  lire: "livre",
  francais: "crayon",
  conjugaison: "crayon",
  orthographe: "crayon",
  grammaire: "crayon",
  dictee: "crayon",
  ecriture: "crayon",
  eveil: "globe",
  geographie: "globe",
  histoire: "globe",
  sciences: "fiole",
  science: "fiole",
  poesie: "note",
  musique: "note",
  anglais: "bulle",
  neerlandais: "bulle",
  langues: "bulle",
};
function iconeMatiere(matiere) {
  const cle = matiere.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return MATIERES[cle] ?? "etoile";
}

// ---------- Milo, la luciole compagnon (avec des émotions) ----------

/** humeur : content, joie, encourage, surpris, dort. taille : "", mini, grand, geant. */
/** Change l'émotion de Milo (et le fait sauter ou pencher la tête). */
function pipHumeur(humeur, anim) {
  const p = $(".pip");
  if (!p) return;
  p.outerHTML = pipSvg(humeur, p.dataset.taille);
  if (anim) animerPip(anim);
}
function animerPip(type) {
  const p = $(".pip");
  if (!p) return;
  p.classList.remove("saute", "penche");
  void p.getBoundingClientRect();
  p.classList.add(type);
}

// ---------- Effets : confettis, étincelles, étoiles qui volent ----------

const COULEURS_FETE = ["#FF9F1C", "#34C77B", "#4BA3F5", "#7B65BD", "#FFC83D", "#FF8A65"];

function confettis(nombre = 40) {
  if (mouvementReduit) return;
  for (let i = 0; i < nombre; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = COULEURS_FETE[i % COULEURS_FETE.length];
    if (i % 3 === 0) Object.assign(c.style, { width: "9px", height: "9px", borderRadius: "50%" });
    c.style.setProperty("--dx", `${(Math.random() - 0.5) * 180}px`);
    c.style.setProperty("--rot", `${360 + Math.random() * 720}deg`);
    c.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

function centre(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function etincelles(el, nombre = 12) {
  if (mouvementReduit || !el) return;
  const { x, y } = centre(el);
  for (let i = 0; i < nombre; i++) {
    const s = document.createElement("div");
    s.className = "etincelle";
    Object.assign(s.style, {
      left: `${x}px`,
      top: `${y}px`,
      background: COULEURS_FETE[i % COULEURS_FETE.length],
    });
    document.body.appendChild(s);
    const angle = (i / nombre) * Math.PI * 2;
    const d = 55 + Math.random() * 45;
    s.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * d}px), calc(-50% + ${Math.sin(angle) * d}px)) scale(0)`,
          opacity: 0,
        },
      ],
      { duration: 650 + Math.random() * 200, easing: "cubic-bezier(.2,.8,.3,1)" },
    ).onfinish = () => s.remove();
  }
}

/** Une étoile part de la réponse et vole jusqu'au compteur. */
function etoileVole(depuis, vers, arrivee) {
  if (mouvementReduit || !depuis || !vers) return arrivee();
  const a = centre(depuis);
  const b = centre(vers);
  const e = document.createElement("div");
  e.className = "etoile-vol";
  e.innerHTML = ic("etoile");
  Object.assign(e.style, { left: `${a.x}px`, top: `${a.y}px` });
  document.body.appendChild(e);
  e.animate(
    [
      { transform: "translate(-50%, -50%) scale(.3)", opacity: 0 },
      { transform: "translate(-50%, -80%) scale(1.7)", opacity: 1, offset: 0.3 },
      {
        transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.6)`,
        opacity: 1,
      },
    ],
    { duration: 850, easing: "cubic-bezier(.5,0,.3,1)" },
  ).onfinish = () => {
    e.remove();
    arrivee();
  };
}

function bump(el) {
  if (!el) return;
  el.classList.remove("bump");
  void el.getBoundingClientRect();
  el.classList.add("bump");
}

function cielEtoile(nombre = 24) {
  let html = "";
  for (let i = 0; i < nombre; i++) {
    const x = (i * 37 + 11) % 100;
    const y = (i * 53 + 7) % 100;
    html += `<i style="left:${x}%;top:${y}%;animation-delay:${(i % 7) * 0.4}s;${i % 4 === 0 ? "width:5px;height:5px;" : ""}"></i>`;
  }
  return `<div class="ciel-etoiles">${html}</div>`;
}

// ---------- Modales ----------

function modale(html, classe = "") {
  const fond = document.createElement("div");
  fond.className = `modale-fond ${classe}`;
  fond.innerHTML = `<div class="modale" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(fond);
  return fond;
}
function fermerModale(fond) {
  fond.classList.add("sort");
  setTimeout(() => fond.remove(), 200);
}

// ---------- Badges et dessins réutilisés ----------

function badgeNiveau(n, classe = "badge-niveau") {
  return `
    <svg class="${classe}" viewBox="0 0 48 52" aria-label="Niveau ${n}">
      <defs><linearGradient id="badgeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9C88E6"/><stop offset="1" stop-color="#6A56AE"/></linearGradient></defs>
      <path d="M24 2.5 L44.5 14.2 V37.8 L24 49.5 L3.5 37.8 V14.2 Z" fill="url(#badgeGrad)" stroke="#FFC83D" stroke-width="3" stroke-linejoin="round"/>
      <path d="M24 7 L40 16 V24 C 30 22, 18 22, 8 25 V16 Z" fill="#fff" opacity=".18"/>
      <text x="24" y="33" text-anchor="middle" font-family="Fredoka, Arial" font-weight="600" font-size="20" fill="#fff">${n}</text>
    </svg>`;
}

function coffreSvg(ouvert) {
  const corps =
    '<rect x="8" y="30" width="48" height="26" rx="5" fill="#C9773A"/><rect x="8" y="30" width="48" height="5" fill="#FFC83D"/><rect x="15" y="30" width="5" height="26" fill="#E5A50A"/><rect x="44" y="30" width="5" height="26" fill="#E5A50A"/>';
  if (ouvert) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 30 L13 10 H51 L54 30 Z" fill="#A85F2A"/><path d="M13 10 H51 L49 14 H15 Z" fill="#FFC83D"/>
      <ellipse cx="32" cy="31" rx="22" ry="6" fill="#FFF3B0"/>
      <circle cx="24" cy="26" r="5" fill="#FFC83D"/><circle cx="35" cy="24" r="6" fill="#FFD45E"/><circle cx="44" cy="27" r="4" fill="#FFC83D"/>
      ${corps}<rect x="28" y="36" width="8" height="9" rx="2" fill="#FFC83D"/>
      <path d="M32 2 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#FFC83D"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M8 32 V22 a10 10 0 0 1 10 -10 h28 a10 10 0 0 1 10 10 V32 Z" fill="#DD8A47"/>
    <path d="M15 32 V14.5 M49 32 V14.5" stroke="#E5A50A" stroke-width="5"/>
    ${corps}<rect x="27" y="27" width="10" height="13" rx="2.5" fill="#FFC83D"/><circle cx="32" cy="32.5" r="2" fill="#A85F2A"/>
  </svg>`;
}

function boiteCadeauSvg() {
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="40" ry="6" fill="#000" opacity=".2"/>
    <rect x="22" y="54" width="76" height="56" rx="7" fill="#FF8A65"/>
    <rect x="22" y="54" width="76" height="10" fill="#E8704C" opacity=".6"/>
    <rect x="53" y="54" width="14" height="56" fill="#FFC83D"/>
    <g class="couvercle">
      <rect x="15" y="38" width="90" height="20" rx="6" fill="#FF7A50"/>
      <rect x="53" y="38" width="14" height="20" fill="#FFD45E"/>
      <ellipse cx="47" cy="31" rx="14" ry="9" fill="#FFC83D" transform="rotate(-20 47 31)"/>
      <ellipse cx="73" cy="31" rx="14" ry="9" fill="#FFC83D" transform="rotate(20 73 31)"/>
      <circle cx="60" cy="36" r="7" fill="#FFD45E"/>
    </g>
  </svg>`;
}

// ---------- Scènes de mission ----------

function scene(nouvelles = 0) {
  const { quete, faites, total, serie } = mission;
  const badge = serie >= 2 ? `<span class="serie">${ic("flamme")} ${serie} d'affilée !</span>` : "";
  const theme = themeMission(quete);
  const calme = mouvementReduit || lire("lumo-mouvements-calmes") === "oui";
  return `<div class="scene ${classeDecor(theme)}${calme ? " decor-calme" : ""}">${decorMission(theme, faites, total, nouvelles)}${badge}</div>`;
}

// ---------- Écran : code ----------

function ecranCode(message = "", codePropose = "") {
  afficher(
    `
    <div class="ecran-code">
      ${cielEtoile(30)}
      <div class="logo-bloc">${pipSvg("content", "grand")}<div class="logo">Lumo</div><p class="slogan">Tes devoirs deviennent des aventures</p></div>
      <form class="carte code-carte" id="form-code">
        <p class="code-titre${message ? " erreur" : ""}">${echapper(message || "Salut ! Tape le code secret de tes parents.")}</p>
        <label class="otp" for="champ-code">
          <input id="champ-code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Ton code secret">
          ${'<span class="case"></span>'.repeat(6)}
        </label>
        <button class="btn" type="submit" id="valider-code" disabled>${codePropose ? "Ouvrir ce profil" : "C'est parti !"} ${ic("fleche")}</button>
        ${codePropose && code ? '<button class="lien" type="button" id="garder-profil">Garder mon profil actuel</button>' : ""}
      </form>
      <p class="demo">Démo : code <b>LUMO01</b> (Arthur, fictif)</p>
    </div>`,
    "plein",
  );
  const champ = $("#champ-code");
  const bouton = $("#valider-code");
  const cases = [...document.querySelectorAll(".case")];
  const maj = () => {
    champ.value = champ.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    cases.forEach((c, i) => {
      c.textContent = champ.value[i] ?? "";
      c.classList.toggle("pleine", i < champ.value.length);
      c.classList.toggle("active", document.activeElement === champ && i === Math.min(champ.value.length, 5));
    });
    bouton.disabled = champ.value.length !== 6;
  };
  champ.addEventListener("input", () => {
    son("clic");
    maj();
  });
  champ.addEventListener("focus", maj);
  champ.addEventListener("blur", maj);
  $("#form-code").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (champ.value.length !== 6 || bouton.disabled) return;
    const candidat = champ.value;
    const ecranCourant = revisionEcran;
    bouton.disabled = true;
    champ.disabled = true;
    try {
      const verification = await fetch("/api/moi", {
        headers: { "X-Lumo-Code": candidat },
        signal: AbortSignal.timeout(15000),
      });
      if (!verification.ok)
        throw new Error(
          verification.status === 401
            ? "Code inconnu. Vérifie-le avec tes parents."
            : "La connexion ne répond pas. Réessaie dans un instant.",
        );
    } catch (erreur) {
      if (revisionEcran !== ecranCourant) return;
      $(".code-titre").textContent =
        erreur.name === "TimeoutError" || erreur.name === "TypeError"
          ? "La connexion ne répond pas. Réessaie dans un instant."
          : erreur.message;
      bouton.disabled = false;
      champ.disabled = false;
      return;
    }
    if (revisionEcran !== ecranCourant) return;
    son("bravo");
    code = candidat;
    ecrire(CLE_CODE, code);
    ecranAccueil();
  });
  $("#garder-profil")?.addEventListener("click", ecranAccueil);
  champ.value = codePropose;
  maj();
  if (message) pipHumeur("encourage", "penche");
  champ.focus();
}

// ---------- Écran : accueil (carte de quêtes) ----------

async function ecranAccueil() {
  let etat;
  try {
    etat = await appel("/api/moi");
  } catch (erreur) {
    proposerReessai(erreur, ecranAccueil);
    return;
  }
  const faites = etat.quetes.filter((q) => q.statut === "terminee");
  const aFaire = etat.quetes.filter((q) => q.statut !== "terminee");
  const finies = quetesFinies(etat);
  const toutFini = aFaire.length === 0 && faites.length > 0;
  const heure = new Date().getHours();
  const salut = heure >= 17 || heure < 5 ? "Bonsoir" : "Bonjour";
  const message = aFaire.length
    ? "On fait une mission ensemble ?"
    : toutFini
      ? "Bravo ! Tu peux rejouer tes missions."
      : "Un parent peut préparer ta prochaine mission.";

  afficher(`
    <div class="haut">
      <span class="pastille etoiles" title="Étoiles">${ic("etoile")} ${etat.etoiles ?? 0}</span>
      <span class="espace"></span>
      <button class="icone-btn" id="son" aria-label="${sonActif ? "Couper le son" : "Activer le son"}">${ic(sonActif ? "sonOn" : "sonOff")}</button>
    </div>
    <div class="hero">
      ${cielEtoile(14)}
      <button class="pip-btn" id="pip-accueil" aria-label="Toucher Milo">${pipSvg(toutFini ? "joie" : "content")}</button>
      <p class="bulle" id="bulle-accueil"><span class="salut">${salut} ${echapper(etat.prenom)} !</span>${echapper(message)}</p>
      ${aFaire.length ? `<button class="btn jouer" id="jouer">${ic(iconeMatiere(aFaire[0].matiere))}<span><strong>${aFaire[0].statut === "en_cours" ? "Continuer" : "Jouer"}</strong><small>${echapper(aFaire[0].titre)}</small></span>${ic("fleche")}</button>` : ""}
    </div>
    <div class="duo">
      <div class="carte mini-carte">
        <div class="entete">${badgeNiveau(etat.niveau)}<div><strong>Niveau ${etat.niveau}</strong></div></div>
        <div class="progres or${etat.vers_suivant ? "" : " vide"}"><div style="width:${Math.round((etat.vers_suivant / etat.quetes_par_niveau) * 100)}%"></div></div>
      </div>
      <button class="carte mini-carte monde-apercu" id="maison">
        <div class="entete"><span class="maison-ic">${ic("maison")}</span><div><strong>Mon espace</strong></div></div>
      </button>
    </div>
    ${rendezVousVue(etat.rendez_vous)}
    <div class="section-titre"><h2>Mon parcours</h2><span>${faites.length}/${etat.quetes.length}</span></div>
    ${aFaire.length ? '<button class="lien" id="voir-etape">Aller à ma mission ↓</button>' : ""}
    ${faites.length ? '<p class="carte-aide">Touche une coche pour rejouer.</p>' : ""}
    <div class="carte-quetes" id="chemin"></div>
    <details class="profil-actif"><summary>Pour les parents</summary><p>Profil de <strong>${echapper(etat.prenom)}</strong> · <span class="profil-code">${echapper(code)}</span></p><p><a href="/parent">Préparer des exercices</a></p><button class="lien" id="changer">Changer de profil</button></details>
    ${barreNav("quetes")}`);

  // Les missions initiales restent sur la carte ; les révisions ont leurs propres résultats.
  const ordre = [...faites, ...aFaire];
  brancherRendezVous(app, etat.rendez_vous, appel, identifiantReponse, ecranAccueil);
  if (ordre.length) dessinerChemin(ordre, aFaire[0]?.id, toutFini, finies);
  else $("#chemin").innerHTML = '<p class="vide">Tes quêtes apparaîtront ici.</p>';

  $("#voir-etape")?.addEventListener("click", () => {
    const noeud = $("#chemin .noeud.actuel");
    noeud?.scrollIntoView({ block: "center", behavior: "instant" });
    noeud?.focus({ preventScroll: true });
  });
  const bulle = $("#bulle-accueil");
  const dire = (t) => {
    bulle.innerHTML = echapper(t);
    parler(t);
  };
  $("#son").addEventListener("click", () => {
    sonActif = !sonActif;
    ecrire(CLE_SON, sonActif ? "oui" : "non");
    if (!sonActif) taire();
    ecranAccueil();
  });
  $("#changer").addEventListener("click", () => {
    ecrire(CLE_CODE, null);
    code = "";
    taire();
    ecranCode();
  });
  $("#maison").addEventListener("click", () => {
    son("clic");
    ecranChezPip(finies);
  });
  brancherNav(finies);
  $("#jouer")?.addEventListener("click", () => {
    son("clic");
    ecranMission(aFaire[0].id);
  });
  $("#pip-accueil").addEventListener("click", () => {
    son("bravo");
    pipHumeur("joie", "saute");
    dire(auHasard(ENCOURAGEMENTS));
    setTimeout(() => $("#pip-accueil") && pipHumeur(toutFini ? "joie" : "content"), 1600);
  });
  parler([`${salut} ${etat.prenom} !`, message]);
}

/** Dessine la route des quêtes, avec un coffre au bout. */
function dessinerChemin(ordre, actuelId, toutFini, finies) {
  const conteneur = $("#chemin");
  const ESP = 150;
  const n = ordre.length + 1;
  const H = 90 + (n - 1) * ESP + 90;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: Math.round(180 + 74 * Math.sin(i * 1.2)),
    y: 90 + i * ESP,
  }));
  const trace = (jusqua) => {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i <= jusqua; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      d += ` C ${a.x} ${a.y + ESP * 0.55} ${b.x} ${b.y - ESP * 0.55} ${b.x} ${b.y}`;
    }
    return d;
  };
  const indexActuel = actuelId ? ordre.findIndex((q) => q.id === actuelId) : ordre.length;
  const d = trace(n - 1);

  const DECOS = [
    '<rect x="-3" y="2" width="6" height="16" rx="2" fill="#D9B58F"/><circle cy="-6" r="15" fill="#B7EBCB"/><circle cx="-9" cy="2" r="9" fill="#A2E2BD"/>',
    '<ellipse rx="24" ry="9" fill="#fff"/><ellipse cx="-8" cy="-7" rx="12" ry="10" fill="#fff"/><ellipse cx="8" cy="-7" rx="9" ry="8" fill="#fff"/>',
    `<g fill="#FFD866">${[
      [0, 0, 1],
      [-18, 14, 0.6],
      [16, 18, 0.5],
    ]
      .map(
        ([x, y, s]) =>
          `<path transform="translate(${x - 12 * s} ${y - 12 * s}) scale(${s})" d="${ICONES.etoile.match(/d="([^"]+)"/)[1]}"/>`,
      )
      .join("")}</g>`,
    '<ellipse rx="20" ry="11" fill="#C3EED3"/><circle cx="-7" cy="-5" r="3.5" fill="#FF9EB5"/><circle cx="7" cy="-3" r="3.5" fill="#FFD866"/><circle cx="0" cy="-8" r="3" fill="#B3A2E8"/>',
  ];
  let decos = "";
  for (let i = 0; i < n - 1; i++) {
    const milieuX = (pts[i].x + pts[i + 1].x) / 2;
    const x = milieuX > 180 ? 48 : 312;
    decos += `<g transform="translate(${x} ${pts[i].y + ESP / 2})" opacity=".9">${DECOS[i % DECOS.length]}</g>`;
  }

  conteneur.style.aspectRatio = `360 / ${H}`;
  conteneur.innerHTML = `
    <svg class="route" viewBox="0 0 360 ${H}" aria-hidden="true">
      ${decos}
      <path d="${d}" fill="none" stroke="#E2DCF5" stroke-width="34" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
      ${indexActuel > 0 ? `<path d="${trace(indexActuel)}" fill="none" stroke="#FFD866" stroke-width="26" stroke-linecap="round"/>` : ""}
      <path d="${d}" fill="none" stroke="#CFC6EE" stroke-width="3" stroke-dasharray="1 13" stroke-linecap="round"/>
    </svg>`;

  const placer = (i, html, classe = "") => {
    const etape = document.createElement("div");
    etape.className = `etape ${classe}`;
    etape.style.left = `${(pts[i].x / 360) * 100}%`;
    etape.style.top = `${(pts[i].y / H) * 100}%`;
    etape.innerHTML = html;
    conteneur.appendChild(etape);
    return etape;
  };
  const cote = (i) => (pts[i].x > 180 ? "gauche" : "droite");

  ordre.forEach((q, i) => {
    const fait = q.statut === "terminee";
    const actuel = q.id === actuelId;
    const etape = placer(
      i,
      `
      ${actuel ? `<span class="commencer">${q.statut === "en_cours" ? "Reprendre" : "Commencer"}</span>` : ""}
      <button class="noeud${fait ? " fait" : ""}${actuel ? " actuel" : ""}" aria-label="${echapper(q.titre)}${fait ? " · Refaire cette mission" : ""}">${ic(fait ? "check" : iconeMatiere(q.matiere))}</button>
      <span class="etiquette ${cote(i)}"><small>${echapper(q.matiere)}</small>${echapper(q.titre)}${fait ? "<small>Terminée · Refaire</small>" : q.statut === "en_cours" ? "<small>En cours</small>" : ""}</span>`,
      fait ? "fait" : "",
    );
    const noeud = etape.querySelector(".noeud");
    noeud.addEventListener("click", () => {
      son("clic");
      if (fait) ecranRevision(q.id);
      else ecranMission(q.id);
    });
  });

  const coffre = placer(
    n - 1,
    `
    <button class="noeud coffre${toutFini ? " ouvert" : ""}" aria-label="${"Choisir mes cadeaux"}">${coffreSvg(toutFini)}</button>
    <span class="etiquette ${cote(n - 1)}"><small>Récompense</small>${"Mes cadeaux à choisir"}</span>`,
  );
  coffre.querySelector(".noeud").addEventListener("click", () => {
    son("cadeau");
    ecranChezPip(undefined, "cadeau");
  });
}

/** Barre du bas, toujours visible : on passe des quêtes à la chambre de Milo en un geste. */
function barreNav(actif) {
  const onglet = (id, icone, texte) =>
    `<button class="onglet${actif === id ? " actif" : ""}" data-onglet="${id}" ${actif === id ? 'aria-current="page"' : ""}>${ic(icone)}<span>${texte}</span></button>`;
  return `<nav class="nav-bas" aria-label="Navigation">${onglet("quetes", "etoile", "Mes quêtes")}${onglet("maison", "maison", "Mon espace")}</nav>`;
}
function brancherNav(finies) {
  document.querySelectorAll(".onglet").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.classList.contains("actif")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      son("clic");
      taire();
      b.dataset.onglet === "maison" ? ecranChezPip(finies) : ecranAccueil();
    });
  });
}

async function ecranRevision(id) {
  let info;
  try {
    info = await appel(`/api/quetes/${id}/revision`);
  } catch (e) {
    proposerReessai(e, () => ecranRevision(id));
    return;
  }
  afficher(
    `<div class="hero revision-hero">${pipSvg("content")}<h1>On s’entraîne ?</h1><p>${echapper(info.titre)}</p></div><div class="carte revision-carte"><p>Tu gardes tes résultats précédents. Cet entraînement ne donne pas de nouveau cadeau.</p><div class="revision-choix">${info.reprise_id ? '<button class="btn" id="revision-reprendre">Continuer mon entraînement</button>' : '<button class="btn" id="revision-tout">Tout refaire</button>' + (info.a_revoir ? `<button class="btn orange" id="revision-cible">Revoir ${info.a_revoir} question${info.a_revoir > 1 ? "s" : ""}</button><p>Les questions non réussies au premier essai lors du dernier passage terminé.</p>` : "<p>Au dernier passage, tu as réussi chaque question dès le premier essai.</p>")}<button class="lien" id="revision-retour">Retour à la carte</button></div></div>`,
  );
  $("#revision-retour").onclick = ecranAccueil;
  if (info.reprise_id) {
    $("#revision-reprendre").onclick = () => ecranMission(info.reprise_id);
    return;
  }
  const commencer = (mode) => {
    const requete_id = identifiantReponse();
    const envoyer = async () => {
      try {
        const r = await appel(`/api/quetes/${id}/revision`, {
          method: "POST",
          body: JSON.stringify({ mode, requete_id }),
        });
        await ecranMission(r.id);
      } catch (e) {
        proposerReessai(e, envoyer);
      }
    };
    document.querySelectorAll(".revision-choix button").forEach((b) => (b.disabled = true));
    envoyer();
  };
  $("#revision-tout").onclick = () => commencer("tout");
  $("#revision-cible")?.addEventListener("click", () => commencer("cible"));
}

// ---------- Écran : mission ----------

async function ecranMission(id) {
  let quete;
  try {
    quete = await appel(`/api/quetes/${id}`);
  } catch (erreur) {
    proposerReessai(erreur, () => ecranMission(id));
    return;
  }
  mission = {
    quete,
    file: quete.questions.filter((q) => !q.terminee),
    essais: {},
    faites: quete.questions.filter((q) => q.terminee).length,
    total: quete.questions.length,
    etoiles: quete.questions.filter((q) => q.reussie).length,
    serie: 0,
  };
  prechargerVoix(quete.questions.map((q) => q.consigne));
  afficherQuestion();
}

function afficherQuestion() {
  const { file, faites, total } = mission;
  if (file.length === 0) return finirMission();
  const q = file[0];
  mission.choisi = null;
  mission.verrou = false;
  afficher(`
    <div class="barre-haut">
      <button class="icone-btn plat" id="quitter" aria-label="Faire une pause">${ic("croix")}</button>
      <div class="progres${faites ? "" : " vide"}"><div style="width:${Math.round((faites / total) * 100)}%"></div></div>
      <span class="pastille etoiles" id="compteur">${ic("etoile")} <b>${mission.etoiles}</b></span>
    </div>
    ${scene()}
    <div class="pip-bloc">${pipSvg("content")}<p class="bulle consigne">${echapper(q.consigne)}<button class="lire" id="lire" aria-label="Réécouter la consigne">${ic("sonOn")}</button></p></div>
    <div id="reponse"></div>
    <div class="pied" id="pied"><div class="pied-int"><button class="btn" id="verifier" disabled>Vérifier</button></div></div>`);

  const zone = $("#reponse");
  const verifierBtn = $("#verifier");
  // Chaque jeu dit quand la réponse est prête (choisi = { valeur, el }) ou ne l'est plus (null).
  const pret = (choisi) => {
    mission.choisi = choisi;
    verifierBtn.disabled = !choisi;
  };
  (JEUX[q.type] ?? jeuTexte)(zone, q, pret);
  verifierBtn.addEventListener("click", () => verifier(q));
  const aDire = q.type === "dictee" ? [q.consigne, q.a_dire] : q.consigne;
  $("#lire").addEventListener("click", () => {
    pipHumeur("content", "saute");
    parler(aDire);
  });
  $("#quitter").addEventListener("click", demanderPause);
  parler(aDire);
}

// ---------- Les jeux ----------

const SEP = " ‖ "; // même séparateur que le serveur
const COULEURS_PAIRES = ["#4BA3F5", "#FF9F1C", "#34C77B", "#E86AA6", "#FFC83D"];

/** Des tuiles à choisir (choix multiples). */
function jeuChoix(zone, q, pret) {
  const long = q.choix.some((c) => c.length > 14);
  zone.className = `choix${long ? " un" : q.choix.length === 3 ? " trois" : ""}`;
  for (const c of q.choix) {
    const t = document.createElement("button");
    t.className = "tuile";
    t.textContent = c;
    t.addEventListener("click", () => {
      son("clic");
      zone.querySelectorAll(".tuile").forEach((x) => x.classList.remove("choisie"));
      t.classList.add("choisie");
      pret({ valeur: c, el: t });
    });
    zone.appendChild(t);
  }
}

/** Vrai ou faux : deux grosses tuiles avec un symbole. */
function jeuVraiFaux(zone, q, pret) {
  zone.className = "choix vf";
  for (const [valeur, icone] of [
    ["Vrai", "check"],
    ["Faux", "croix"],
  ]) {
    const t = document.createElement("button");
    t.className = `tuile ${valeur === "Vrai" ? "vrai" : "faux"}`;
    t.innerHTML = `${ic(icone)}<span>${valeur}</span>`;
    t.addEventListener("click", () => {
      son("clic");
      zone.querySelectorAll(".tuile").forEach((x) => x.classList.remove("choisie"));
      t.classList.add("choisie");
      pret({ valeur, el: t });
    });
    zone.appendChild(t);
  }
}

/** Réponse à taper (un nombre, un mot). */
function jeuTexte(zone, q, pret) {
  zone.className = "";
  zone.innerHTML =
    '<input id="champ-rep" class="saisie" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ta réponse" placeholder="Ta réponse">';
  const champ = $("#champ-rep");
  champ.addEventListener("input", () =>
    pret(champ.value.trim() ? { valeur: champ.value.trim(), el: champ } : null),
  );
  champ.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && mission.choisi) $("#verifier").click();
  });
  champ.focus();
}

/** Dictée : Milo dit le mot, l'enfant l'écrit. Un gros bouton pour réécouter. */
function jeuDictee(zone, q, pret) {
  jeuTexte(zone, q, pret);
  zone.className = "dictee";
  const ecouter = document.createElement("button");
  ecouter.className = "ecouter";
  ecouter.innerHTML = `${ic("sonOn")}<span>Réécouter le mot</span>`;
  ecouter.addEventListener("click", () => {
    pipHumeur("content", "saute");
    parler(q.a_dire);
    $("#champ-rep")?.focus();
  });
  zone.prepend(ecouter);
  $("#champ-rep").placeholder = "Écris le mot";
}

/** Remettre dans l'ordre : on touche les morceaux pour construire la réponse, on retouche pour enlever. */
function jeuOrdre(zone, q, pret) {
  zone.className = "ordre";
  zone.innerHTML =
    '<div class="ligne-ordre" aria-label="Ta réponse"><span class="indice">Touche les morceaux dans le bon ordre</span></div><div class="reserve"></div>';
  const ligne = zone.querySelector(".ligne-ordre");
  const reserve = zone.querySelector(".reserve");
  const maj = () => {
    const places = [...ligne.querySelectorAll(".morceau")];
    ligne.classList.toggle("vide", places.length === 0);
    pret(
      reserve.querySelector(".morceau")
        ? null
        : { valeur: places.map((m) => m.textContent).join(SEP), el: ligne },
    );
  };
  q.elements.forEach((texte) => {
    const m = document.createElement("button");
    m.className = "morceau";
    m.textContent = texte;
    m.addEventListener("click", () => {
      son("clic");
      (m.parentElement === reserve ? ligne : reserve).appendChild(m);
      if (!mouvementReduit)
        m.animate([{ transform: "scale(.6)" }, { transform: "scale(1)" }], {
          duration: 220,
          easing: "cubic-bezier(.3,1.6,.5,1)",
        });
      maj();
    });
    reserve.appendChild(m);
  });
  maj();
}

/** Relier les paires : on touche à gauche puis à droite. Chaque paire prend une couleur. */
function jeuAssocier(zone, q, pret) {
  zone.className = "associer";
  zone.innerHTML = '<div class="colonne gauche"></div><div class="colonne droite"></div>';
  const paires = new Map(); // gauche -> droite
  let selection = null; // élément de gauche en attente
  const boutons = { gauche: [], droite: [] };
  const peindre = () => {
    [...paires.keys()].forEach((g, i) => {
      const couleur = COULEURS_PAIRES[i % COULEURS_PAIRES.length];
      for (const b of [g, paires.get(g)]) {
        b.style.setProperty("--paire", couleur);
        b.classList.add("relie");
      }
    });
    [...boutons.gauche, ...boutons.droite].forEach((b) => {
      const relie = paires.has(b) || [...paires.values()].includes(b);
      if (!relie) {
        b.classList.remove("relie");
        b.style.removeProperty("--paire");
      }
      b.classList.toggle("choisie", b === selection);
    });
    const complet = paires.size === q.gauche.length;
    pret(
      complet
        ? { valeur: [...paires].map(([g, d]) => `${g.textContent} → ${d.textContent}`).join(SEP), el: zone }
        : null,
    );
  };
  const delier = (b) => {
    for (const [g, d] of paires) if (g === b || d === b) paires.delete(g);
  };
  const creer = (texte, cote) => {
    const b = document.createElement("button");
    b.className = "tuile lien-paire";
    b.textContent = texte;
    b.addEventListener("click", () => {
      son("clic");
      if (cote === "gauche") {
        if (paires.has(b)) {
          delier(b);
          selection = null;
        } else selection = selection === b ? null : b;
      } else if (selection) {
        delier(b);
        paires.set(selection, b);
        selection = null;
        son("etoile");
      } else {
        delier(b);
      }
      peindre();
    });
    boutons[cote].push(b);
    zone.querySelector(`.${cote}`).appendChild(b);
  };
  q.gauche.forEach((t) => creer(t, "gauche"));
  q.droite.forEach((t) => creer(t, "droite"));
  peindre();
}

const JEUX = {
  choix: jeuChoix,
  texte: jeuTexte,
  vrai_faux: jeuVraiFaux,
  ordre: jeuOrdre,
  associer: jeuAssocier,
  dictee: jeuDictee,
};

function demanderPause() {
  son("clic");
  const fond = modale(`
    ${pipSvg("encourage", "grand")}
    <h2>Une petite pause ?</h2>
    <p>Ta mission t’attend : tu as déjà fait ${mission.faites} sur ${mission.total}.</p>
    <div class="boutons">
      <button class="btn" id="reprendre">Je continue</button>
      <button class="btn blanc" id="pause">Faire une pause</button>
    </div>`);
  parler("Une petite pause ? Tu peux continuer quand tu veux.");
  fond.querySelector("#reprendre").addEventListener("click", () => {
    son("clic");
    fermerModale(fond);
  });
  fond.querySelector("#pause").addEventListener("click", () => {
    son("clic");
    taire();
    ecranAccueil();
  });
}

const ENCOURAGEMENTS = [
  "Tu vas y arriver, j'en suis sûr !",
  "Je suis content de te voir !",
  "Une quête à la fois, tranquille.",
  "Hihi, ça chatouille !",
];
const REACTIONS = [
  "Hihi, ça chatouille !",
  "Tu es mon meilleur ami !",
  "On fait une quête ensemble ?",
  "Youpi !",
  "Je suis fier de toi !",
];
const BRAVOS = [
  "Excellent !",
  "Bravo !",
  "Super !",
  "Génial !",
  "Trop fort !",
  "Magnifique !",
  "Bien joué !",
];

async function verifier(q) {
  if (!mission.choisi || mission.verrou) return;
  mission.verrou = true;
  const revision = revisionEcran;
  const valeur = mission.choisi.valeur;
  if (!mission.envoi || mission.envoi.valeur !== valeur || mission.envoi.question_id !== q.id) {
    mission.envoi = { question_id: q.id, valeur, requete_id: identifiantReponse() };
  }
  $("#quitter").disabled = true;
  $("#verifier").disabled = true;
  document.querySelectorAll("#reponse button, #reponse input").forEach((el) => (el.disabled = true));
  let r;
  try {
    r = await appel("/api/reponses", { method: "POST", body: JSON.stringify(mission.envoi) });
  } catch (erreur) {
    if (revision !== revisionEcran) return;
    mission.verrou = false;
    document
      .querySelectorAll("#reponse button, #reponse input, #verifier, #quitter")
      .forEach((el) => (el.disabled = false));
    proposerReessai(erreur, () => verifier(q));
    return;
  }
  if (revision !== revisionEcran) return;
  mission.envoi = null;
  $("#quitter").disabled = false;

  const pied = $("#pied");
  const el = mission.choisi.el;
  let titre, detail, bouton, rond;

  if (r.correcte) {
    mission.file.shift();
    mission.faites++;
    mission.serie++;
    mission.etoiles++;
    el?.classList.remove("choisie");
    el?.classList.add("bonne");
    titre = mission.serie >= 3 ? `${mission.serie} d'affilée !` : auHasard(BRAVOS);
    detail = phraseProgres(themeMission(mission.quete));
    pied.className = "pied bravo";
    rond = ic("check");
    bouton = '<button class="btn" id="continuer">Continuer</button>';
    son("bravo");
    vibrer(25);
    pipHumeur("joie", "saute");
    etincelles(el);
    confettis(14);
    // La scène et la barre avancent tout de suite : on voit la pièce arriver.
    $(".scene").outerHTML = scene(1);
    const barre = $(".progres");
    barre.classList.remove("vide");
    barre.firstElementChild.style.width = `${Math.round((mission.faites / mission.total) * 100)}%`;
    const compteur = $("#compteur");
    etoileVole(el, compteur, () => {
      compteur.querySelector("b").textContent = mission.etoiles;
      bump(compteur);
      son("etoile");
    });
  } else {
    mission.serie = 0;
    $(".scene .serie")?.remove(); // la série s'arrête sans bruit : pas de « série perdue »
    mission.essais[q.id] = r.essais;
    el?.classList.remove("choisie");
    el?.classList.add("mauvaise");
    pied.className = "pied doux";
    bouton = '<button class="btn violet" id="continuer">Continuer</button>';
    son("doux");
    pipHumeur("encourage", "penche");
    if (!r.terminee) {
      // Pas de punition : la question revient plus tard.
      mission.file.push(mission.file.shift());
      rond = ic("refaire");
      titre = r.presque ? "Presque !" : "Pas grave !";
      detail = r.presque
        ? "C'est presque ça, regarde bien les accents. On la refait tout à l'heure."
        : "On la refera tout à l'heure.";
    } else {
      // Deuxième essai : Milo montre la réponse, et on avance quand même.
      mission.file.shift();
      mission.faites++;
      rond = ic("check");
      titre = "On apprend ensemble";
      detail = `La réponse, c'est « ${r.bonne_reponse} ». Maintenant tu la connais !`;
      document.querySelectorAll("#reponse .tuile").forEach((t) => {
        if (t.textContent === r.bonne_reponse) t.classList.add("revelee");
      });
    }
  }
  pied.innerHTML = `<div class="pied-int">
    <div class="resultat"><span class="rond">${rond}</span><div><strong>${echapper(titre)}</strong><p>${echapper(detail)}</p></div></div>
    ${bouton}</div>`;
  parler([titre, detail]);
  const continuer = $("#continuer");
  continuer.focus();
  continuer.addEventListener("click", () => {
    son("clic");
    afficherQuestion();
  });
}

// ---------- Fin de mission : cinématique, victoire, niveau ----------

async function finirMission() {
  const revision = revisionEcran;
  let r;
  try {
    r = await appel(`/api/quetes/${mission.quete.id}/terminer`, { method: "POST" });
  } catch (erreur) {
    if (revision !== revisionEcran) return;
    proposerReessai(erreur, finirMission);
    return;
  }
  if (revision !== revisionEcran) return;
  taire();
  const animation = celebrerMission({
    app,
    afficher,
    univers: mission.quete.univers,
    theme: themeMission(mission.quete),
    total: mission.total,
    calme: matchMedia("(prefers-reduced-motion: reduce)").matches || lire("lumo-mouvements-calmes") === "oui",
  });
  const revisionFinale = revisionEcran;
  await animation;
  if (revisionFinale !== revisionEcran) return;
  ecranVictoire(r);
}

function ecranVictoire(r) {
  const titre = r.revision ? "Entraînement terminé !" : "Mission terminée !";
  afficher(finMissionVue(Boolean(r.revision)));
  if (!mouvementReduit && lire("lumo-mouvements-calmes") !== "oui") {
    confettis(24);
    animerPip("saute");
  }
  parler([titre, "Tu as pris le temps de travailler cette mission."]);
  $("#continuer-fin").onclick = ecranAccueil;
  $("#continuer-fin").focus({ preventScroll: true });
}

function quetesFinies(etat) {
  return (etat.niveau - 1) * etat.quetes_par_niveau + etat.vers_suivant;
}
function objetsDebloques(finies) {
  return Math.min(OBJETS.length, finies);
}

function chambreSvg(contenu) {
  return `
    <svg viewBox="0 0 360 300" aria-label="Ma chambre">
      <defs>
        <pattern id="papier" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#FFEFD9"/><circle cx="13" cy="13" r="2.2" fill="#FFE0B8"/><circle cx="0" cy="0" r="1.6" fill="#FFE6C6"/><circle cx="26" cy="26" r="1.6" fill="#FFE6C6"/></pattern>
        <linearGradient id="sol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9BC8E"/><stop offset="1" stop-color="#D49C6B"/></linearGradient>
        <linearGradient id="nuitFenetre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2766"/><stop offset="1" stop-color="#5543A8"/></linearGradient>
        <radialGradient id="lumiere" cx=".5" cy=".25" r=".75"><stop offset="0" stop-color="#FFF8E0" stop-opacity=".45"/><stop offset="1" stop-color="#FFF8E0" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="360" height="212" fill="url(#papier)"/>
      <rect y="198" width="360" height="14" fill="#FFF7EA"/><rect y="210" width="360" height="3" fill="#E9CFAE"/>
      <rect y="212" width="360" height="88" fill="url(#sol)"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${228 + i * 16}" width="360" height="1.5" fill="#C98E5D" opacity=".5"/>`).join("")}
      <rect x="136" y="38" width="92" height="90" rx="10" fill="#fff"/>
      <rect x="142" y="44" width="80" height="78" rx="6" fill="url(#nuitFenetre)"/>
      <path d="M206 54 a12 12 0 1 0 8 20 a10 10 0 1 1 -8 -20z" fill="#FFF3C4"/>
      <circle cx="158" cy="58" r="1.6" fill="#fff"/><circle cx="174" cy="98" r="1.4" fill="#fff"/><circle cx="206" cy="106" r="1.6" fill="#fff"/><circle cx="160" cy="84" r="1" fill="#fff"/>
      <path d="M182 44 V122 M142 83 H222" stroke="#fff" stroke-width="4"/>
      <rect x="124" y="30" width="116" height="5" rx="2.5" fill="#B07A4F"/>
      <path d="M126 33 Q140 80 128 136 L146 136 Q150 80 144 33 Z" fill="#FF8A65"/>
      <path d="M238 33 Q224 80 236 136 L218 136 Q214 80 220 33 Z" fill="#FF8A65"/>
      <rect x="0" y="0" width="360" height="300" fill="url(#lumiere)"/>
      ${contenu}
    </svg>`;
}

async function ecranChezPip(_finies, onglet) {
  taire();
  return ouvrirMonde(
    {
      app,
      afficher,
      appel,
      identifiantReponse,
      retour: ecranAccueil,
      souvenirs: ecranAncienneChambre,
      pipSvg,
      son,
    },
    onglet,
  );
}

function ecranAncienneChambre(finies) {
  const debloques = objetsDebloques(finies);
  const objets = OBJETS.slice(0, debloques)
    .map(
      (o, i) =>
        `<g class="objet" tabindex="0" data-i="${i}" role="button" aria-label="${echapper(o.nom)}">${o.svg}</g>`,
    )
    .join("");
  const message = "Tes cadeaux de la chambre sont toujours ici. Touche-les pour les retrouver !";

  afficher(`
    <div class="barre-haut">
      <button class="icone-btn plat" id="sortir" aria-label="Retour à mon monde">${ic("croix")}</button>
      <h2 style="flex:1">Mes souvenirs</h2>
      <span class="pastille etoiles">${ic("cadeau")} ${debloques}/${OBJETS.length}</span>
    </div>
    <div class="chambre">
      ${chambreSvg(objets)}
      <button class="pip-maison" id="pip-maison" aria-label="Toucher Milo">${pipSvg("content", "grand")}</button>
    </div>
    <div class="collection" aria-label="${debloques} objets sur ${OBJETS.length}">${OBJETS.map((_, i) => `<i class="${i < debloques ? "on" : ""}"></i>`).join("")}</div>
    <div class="pip-bloc"><p class="bulle libre" id="bulle-maison">${echapper(message)}</p></div>
    <p class="vide">Tes prochaines découvertes t’attendent au jardin et dans la cuisine.</p>
    ${barreNav("souvenirs")}`);

  const bulle = $("#bulle-maison");
  const dire = (t) => {
    bulle.textContent = t;
    parler(t);
  };

  document.querySelectorAll(".objet").forEach((g) => {
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
    g.addEventListener("click", () => {
      const o = OBJETS[Number(g.dataset.i)];
      son("clic");
      g.classList.remove("touche", "nouveau");
      void g.getBoundingClientRect();
      g.classList.add("touche");
      pipHumeur("surpris");
      dire(o.phrase);
    });
  });
  $("#pip-maison").addEventListener("click", () => {
    son("bravo");
    pipHumeur("joie", "saute");
    dire(auHasard(REACTIONS));
  });
  const sortir = () => {
    taire();
    ecranChezPip();
  };
  $("#sortir").addEventListener("click", sortir);
  brancherNav(finies);

  parler(message);
}

// ---------- Voix préparées d'avance ----------

/** Tout ce que Milo dit toujours de la même façon : préparé une fois, gratuit ensuite. */
function phrasesFixes() {
  return [
    ...ENCOURAGEMENTS,
    ...REACTIONS,
    ...BRAVOS,
    ...Array.from({ length: 8 }, (_, i) => `${i + 3} d'affilée !`),
    "Une fleur de plus dans ton jardin !",
    "Une pièce de plus pour ta fusée !",
    "Pas grave !",
    "On la refera tout à l'heure.",
    "On apprend ensemble",
    "Une petite pause ? Tu peux continuer quand tu veux.",
    "Décollage !",
    "Ton jardin a fleuri !",
    "Mission réussie !",
    "Tu passes au niveau supérieur !",
    ...Array.from({ length: 12 }, (_, i) => `Tu as gagné ${pluriel(i + 1, "étoile")}.`),
    "Un cadeau pour toi ! Touche-le pour l'ouvrir.",
    "Le coffre s'ouvre quand toutes les quêtes du soir sont finies !",
    "Tout est fini pour ce soir ! Le coffre est ouvert, viens voir ta chambre !",
    "Pas de quête pour l'instant. Demande à tes parents de prendre tes devoirs en photo.",
    "Bienvenue chez toi ! Ta chambre est encore vide… Chaque quête finie t'apporte un cadeau !",
    "Bienvenue chez toi ! Touche les objets, ou touche-moi !",
    ...OBJETS.flatMap((o) => [
      o.phrase,
      `${majuscule(o.nom)} !`,
      `${majuscule(o.nom)} est dans ta chambre !`,
    ]),
    // Morceaux des calculs : les nombres de 0 à 100 et les mots qui les relient.
    ...Array.from({ length: 101 }, (_, i) => String(i)),
    "fois",
    "plus",
    "moins",
    "divisé par",
    "ça fait combien ?",
  ];
}

/** Prépare toutes les phrases fixes une par une (outil de préparation, lancé une seule fois). */
async function preparerVoix() {
  const liste = [...new Set(phrasesFixes().map(nettoyer))];
  let faites = 0;
  for (const t of liste) {
    try {
      await chargerVoix(t);
      faites++;
    } catch {}
  }
  return { faites, total: liste.length, caracteres: liste.join("").length };
}
window.lumoPreparerVoix = preparerVoix;
window.lumoPhrasesFixes = () => [...new Set(phrasesFixes().map(nettoyer))];

// ---------- Démarrage ----------

function ouvrirProfilPropose() {
  if (!location.hash.startsWith("#profil=")) return false;
  const propose = location.hash.slice(8);
  history.replaceState(null, "", location.pathname + location.search);
  if (!/^[A-Z0-9]{6}$/.test(propose)) {
    ecranCode("Ce lien de profil est invalide. Demande le code à tes parents.");
    return true;
  }
  taire();
  ecranCode(`Tes exercices sont pour le profil ${propose}. Confirme le code pour les retrouver.`, propose);
  return true;
}
window.addEventListener("hashchange", ouvrirProfilPropose);
if (!ouvrirProfilPropose())
  code ? (location.hash.startsWith("#mon-monde") ? ecranChezPip() : ecranAccueil()) : ecranCode();
