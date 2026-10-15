// Navigateur sur une base temporaire : aucune tentative n'est ajoutée au profil réel.
import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { quetesQuadrilateres } from "./exercices-quadrilateres.ts";

const { chromium } = process.env.LUMO_PLAYWRIGHT_PACKAGE
  ? await import(pathToFileURL(resolve(process.env.LUMO_PLAYWRIGHT_PACKAGE, "index.mjs")).href)
  : await import("playwright");
const dossier = await mkdtemp(join(tmpdir(), "lumo-geometrie-ui-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_VOIX_GENERATION = "0";
const { db } = await import("../src/db.ts");
const { creerQuetes, trouverEnfant } = await import("../src/logic.ts");
const capture = resolve(process.env.LUMO_GEOMETRIE_CAPTURE ?? "data/apercu-geometrie");
let navigateur, serveur;
try {
  const enfant = trouverEnfant("LUMO01");
  creerQuetes(enfant, [
    {
      ...quetesQuadrilateres[0],
      resume: "Un parallélogramme a ses côtés opposés parallèles deux à deux.",
      questions: quetesQuadrilateres[0].questions.map((q) => ({
        ...q,
        indice: "Regarde les côtés opposés.",
        aide: "Compare le haut avec le bas, puis les deux autres côtés.",
      })),
    },
    {
      ...quetesQuadrilateres[2],
      titre: "Atelier de tracé",
      questions: [quetesQuadrilateres[2].questions[0]],
    },
  ]);
  const sonde = createServer();
  await new Promise((r) => sonde.listen(0, "127.0.0.1", r));
  const port = sonde.address().port;
  await new Promise((r) => sonde.close(r));
  serveur = spawn(process.execPath, ["src/web.ts"], {
    cwd: resolve(import.meta.dirname, ".."),
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  const adresse = `http://127.0.0.1:${port}`;
  let disponible = false;
  for (let i = 0; i < 60; i++) {
    try {
      disponible = (await fetch(adresse + "/manifest.webmanifest")).ok;
      if (disponible) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(disponible, "Serveur de test disponible");
  navigateur = await chromium.launch({
    headless: true,
    channel: process.env.LUMO_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  });
  const contexte = await navigateur.newContext({
    viewport: { width: 1024, height: 900 },
    reducedMotion: "reduce",
  });
  await contexte.addInitScript(() => localStorage.setItem("lumo-son", "non"));
  const page = await contexte.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.goto(adresse);
  await page.getByRole("textbox", { name: "Ton code secret" }).fill("LUMO01");
  await page.locator("#valider-code").click();
  await page.getByRole("button", { name: quetesQuadrilateres[0].titre, exact: true }).click();
  assert.ok((await page.locator(".rappel-regle").textContent()).includes("côtés opposés parallèles"));
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM reponses").get().n,
    0,
    "Lire le rappel ne compte pas comme un essai",
  );
  await mkdir(capture, { recursive: true });
  await page.screenshot({ path: join(capture, "preparation-mission.png"), fullPage: true });
  await page.locator("#commencer-mission").click();
  await page.getByRole("button", { name: "Sélectionner la figure A", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Sélectionner la figure D", exact: true }).click();
  await page.getByRole("button", { name: "Sélectionner la figure G", exact: true }).click();
  assert.equal(await page.locator(".geo-figure[aria-pressed=true]").count(), 3);
  await page.locator("#demander-aide").click();
  assert.ok((await page.locator("#aide-exercice").textContent()).includes("Un petit indice"));
  assert.ok((await page.locator("#aide-exercice").textContent()).includes("Regarde les côtés opposés."));
  await page.locator("#demander-aide").click();
  assert.ok((await page.locator("#aide-exercice").textContent()).includes("On cherche ensemble"));
  await page.locator("#rappel-mission").click();
  await page.locator("#fermer-rappel").click();
  assert.equal(
    await page.locator(".geo-figure[aria-pressed=true]").count(),
    3,
    "L’aide et le rappel conservent la réponse",
  );
  assert.equal(await page.locator("#reponse svg").count(), 9);
  await mkdir(capture, { recursive: true });
  await page.screenshot({ path: join(capture, "selection-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "Pas de débordement horizontal sur téléphone",
  );
  assert.equal(
    await page.locator(".bulle.consigne").evaluate((e) => e.getBoundingClientRect().right <= innerWidth),
    true,
    "La consigne et sa lecture audio restent dans l'écran",
  );
  await page.screenshot({ path: join(capture, "selection-mobile.png"), fullPage: true });
  await page.locator("#verifier").click();
  await page.locator("#continuer").waitFor();
  assert.equal(db.prepare("SELECT correcte FROM reponses ORDER BY id DESC LIMIT 1").get().correcte, 1);
  await page.locator("#continuer").click();
  assert.ok((await page.locator(".geo-galerie line").count()) > 0, "Le codage est visible sur les figures");
  await page.screenshot({ path: join(capture, "figure-codee.png"), fullPage: true });

  await page.goto(adresse);
  await page.getByRole("button", { name: "Atelier de tracé", exact: true }).click();
  await page.locator("#commencer-mission").click();
  assert.equal(await page.locator("[data-traits] line").count(), 0);
  const relier = async (a, b) => {
    await page.getByRole("button", { name: `Sommet ${a}`, exact: true }).click();
    await page.getByRole("button", { name: `Sommet ${b}`, exact: true }).click();
  };
  await relier("A", "C");
  await relier("D", "B");
  assert.equal(await page.locator("[data-traits] line").count(), 2);
  assert.equal(await page.locator("#verifier").isEnabled(), true);
  await page.screenshot({ path: join(capture, "diagonales-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Effacer les traits", exact: true }).click();
  assert.equal(await page.locator("[data-traits] line").count(), 0);
  assert.equal(await page.locator("#verifier").isEnabled(), false);
  for (let essai = 0; essai < 2; essai++) {
    await relier("A", "B");
    await relier("C", "D");
    await page.locator("#verifier").click();
    await page.locator("#continuer").waitFor();
    if (!essai) {
      assert.ok((await page.locator("#aide-exercice").textContent()).includes("Un petit indice"));
      await page.locator("#continuer").click();
      assert.equal(
        await page.locator("#aide-exercice").isVisible(),
        true,
        "L’indice reste proposé au deuxième essai",
      );
    }
  }
  assert.equal(
    await page.locator('[data-traits] line[stroke="#159b85"]').count(),
    2,
    "Les diagonales correctes sont montrées après deux essais",
  );
  assert.ok((await page.locator(".geo-etat").textContent()).includes("sommets opposés"));
  assert.deepEqual(erreurs, []);
  console.log(
    `OK navigateur : sélection, clavier, téléphone, codage, tracé, effacement et correction. Captures : ${capture}`,
  );
} finally {
  await navigateur?.close();
  if (serveur) {
    serveur.kill();
    await new Promise((r) => serveur.once("exit", r));
  }
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
