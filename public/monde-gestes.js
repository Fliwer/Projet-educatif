/** Glisser au pointeur ; les boutons gardent toujours leur action au clic / clavier. */
export function glisser(element, cibles, deposer) {
  let prise,
    deplace = false;
  element.style.touchAction = "none";
  element.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !e.isPrimary || element.disabled) return;
    prise = { x: e.clientX, y: e.clientY, id: e.pointerId };
    deplace = false;
    element.setPointerCapture(e.pointerId);
  });
  element.addEventListener("pointermove", (e) => {
    if (!prise || prise.id !== e.pointerId) return;
    const x = e.clientX - prise.x,
      y = e.clientY - prise.y;
    if (Math.hypot(x, y) > 6) deplace = true;
    if (!deplace) return;
    element.style.translate = `${x}px ${y}px`;
    element.classList.add("j-en-main");
    for (const cible of cibles()) {
      const r = cible.getBoundingClientRect();
      cible.classList.toggle(
        "j-survole",
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom,
      );
    }
  });
  const terminer = (e) => {
    if (!prise || prise.id !== e.pointerId) return;
    const arrivee = cibles().find((c) => c.classList.contains("j-survole"));
    prise = null;
    element.style.translate = "";
    element.classList.remove("j-en-main");
    cibles().forEach((c) => c.classList.remove("j-survole"));
    if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
    if (e.type === "pointerup" && deplace && arrivee) deposer(arrivee);
  };
  element.addEventListener("pointerup", terminer);
  element.addEventListener("pointercancel", terminer);
  element.addEventListener("lostpointercapture", terminer);
  element.addEventListener(
    "click",
    (e) => {
      if (deplace && e.detail !== 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        deplace = false;
      }
    },
    true,
  );
}
