import { nombreFrancais } from "./voix-appareil.js";
const zone = document.getElementById("nombres");
const etat = document.getElementById("etat");
const code = document.getElementById("code");
try {
  code.value = localStorage.getItem("lumo-code") || "LUMO01";
} catch {}
let lecture = null;
let urlAudio = null;
let ticket = 0;
for (const n of [...Array.from({ length: 21 }, (_, i) => i), 30, 40, 50, 60, 70, 80, 90, 100, "+"]) {
  const mot = n === "+" ? "plus" : nombreFrancais(n);
  const bouton = document.createElement("button");
  bouton.textContent = String(n);
  bouton.setAttribute("aria-label", `Écouter ${mot}`);
  bouton.setAttribute("aria-pressed", "false");
  bouton.addEventListener("click", async () => {
    const demande = ++ticket;
    lecture?.pause();
    if (urlAudio) {
      URL.revokeObjectURL(urlAudio);
      urlAudio = null;
    }
    for (const b of zone.children) b.setAttribute("aria-pressed", "false");
    bouton.setAttribute("aria-pressed", "true");
    etat.textContent = `Chargement de « ${mot} »…`;
    try {
      const r = await fetch("/api/voix", {
        cache: "no-store",
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/json", "X-Lumo-Code": code.value.trim().toUpperCase() },
        body: JSON.stringify({ texte: mot }),
      });
      if (!r.ok)
        throw new Error(
          r.status === 401 ? "Vérifie le code du profil." : "Cet enregistrement est indisponible.",
        );
      const blob = await r.blob();
      if (demande !== ticket) return;
      urlAudio = URL.createObjectURL(blob);
      lecture = new Audio(urlAudio);
      await lecture.play();
      if (demande === ticket)
        etat.textContent = `Tu écoutes « ${mot} ». La prononciation est-elle française ?`;
    } catch (erreur) {
      if (demande === ticket) etat.textContent = erreur.message;
    }
  });
  zone.append(bouton);
}
