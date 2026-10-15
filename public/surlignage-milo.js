const echapper = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const calcul = /^\s*(\d{1,3})\s*([×x*+−÷:\-])\s*(\d{1,3})\s*=\s*\?\s*$/;
const normaliser = (t) => t.toLocaleLowerCase("fr").replace(/[^\p{L}\p{N}]/gu, "");
export function texteSurlignable(texte) {
  const c = texte.match(calcul);
  if (c)
    return [c[1], c[2], c[3], "= ?"]
      .map((t, i) => `<span class="mot-milo" data-morceau="${i}">${echapper(t)}</span>`)
      .join(" ");
  let i = 0;
  return texte
    .split(/(\s+)/)
    .map((t) => (/^\s*$/.test(t) ? t : `<span class="mot-milo" data-mot="${i++}">${echapper(t)}</span>`))
    .join("");
}
export function indexMotLu(mots, temps) {
  return mots.findIndex((m) => temps >= m.start && temps < m.end);
}
export function associerMots(elements, mots) {
  const visibles = Array.from(elements).filter((e) => normaliser(e.textContent));
  const correspondance = Array(mots.length).fill(null);
  let i = 0;
  for (const element of visibles) {
    const cible = normaliser(element.textContent);
    let entendu = "";
    while (i < mots.length && entendu !== cible) {
      entendu += normaliser(mots[i].text);
      if (!cible.startsWith(entendu)) return null;
      correspondance[i++] = element;
    }
    if (entendu !== cible) return null;
  }
  if (mots.slice(i).some((m) => normaliser(m.text))) return null;
  return correspondance;
}
export function creerSuiviLecture(zone, morceau, mots = []) {
  if (!zone) return null;
  const tous = Array.from(zone.querySelectorAll(".mot-milo"));
  const segment = zone.querySelector(`[data-morceau="${morceau}"]`);
  // Un mot de dictée n'apparaît jamais dans la consigne : seul le premier morceau est visible.
  const correspondance = !segment && morceau === 0 ? associerMots(tous, mots) : null;
  let frame = 0,
    courant = null;
  function effacer() {
    for (const e of tous) e.classList.remove("mot-lu");
    zone.classList.remove("phrase-lue");
    courant = null;
  }
  function arreter() {
    cancelAnimationFrame(frame);
    frame = 0;
    effacer();
  }
  function demarrer(audio) {
    arreter();
    function actualiser() {
      if (!zone.isConnected || audio.paused || audio.ended) {
        arreter();
        return;
      }
      const actif = segment ?? (correspondance ? correspondance[indexMotLu(mots, audio.currentTime)] : null);
      if (actif !== courant) {
        effacer();
        actif?.classList.add("mot-lu");
        courant = actif;
      }
      if (!segment && !correspondance && morceau === 0) zone.classList.add("phrase-lue");
      frame = requestAnimationFrame(actualiser);
    }
    actualiser();
  }
  return { demarrer, arreter };
}
