import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
// Même configuration que test-geometrie-ui : navigateur local, aucune donnée réelle.
const { chromium } = process.env.LUMO_PLAYWRIGHT_PACKAGE
  ? await import(pathToFileURL(resolve(process.env.LUMO_PLAYWRIGHT_PACKAGE, "index.mjs")).href)
  : await import("playwright");
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/univers.css"><main id="app"></main><script type="module">
import {ouvrirUnivers} from '/univers.js';import {miloSvg} from '/milo.js';
window.monde={aventure:'espace',version:1};window.quetes=[{id:1,titre:'Les formes',matiere:'Mathématiques',statut:'terminee'},{id:2,titre:'Les plantes',matiere:'Sciences',statut:'en_cours'},{id:3,titre:'Les mots voyageurs',matiere:'Français',statut:'a_faire'}];window.commandes=[];
window.ouvrir=()=>ouvrirUnivers({app:document.querySelector('#app'),afficher:(html,c)=>{app.innerHTML=html;app.className=c},appel:async(url,options)=>{if(options){const c=JSON.parse(options.body);commandes.push(c);if(window.echec){window.echec=false;throw Error('Connexion interrompue')}monde={...monde,aventure:c.aventure,version:monde.version+1};return {monde}}return url==='/api/monde'?monde:{quetes}},identifiantReponse:()=>crypto.randomUUID(),retour:()=>window.retour=true,jouer:q=>window.mission=q.id,pipSvg:miloSvg});await ouvrir();</script>`;
const server = createServer(async (req, res) => {
  try {
    const name = req.url.split("?")[0];
    if (name === "/") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
      return;
    }
    if (!/^\/[a-z0-9.-]+$/.test(name)) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      name.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8",
    );
    res.end(await readFile(join(resolve("public"), name.slice(1))));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  channel: process.env.LUMO_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.locator(".u-depart").waitFor();
  assert.equal(await page.locator("progress").getAttribute("value"), "33");
  assert.equal(await page.locator(".u-prochaine").count(), 1);
  await page.locator(".u-depart").click();
  assert.equal(await page.evaluate(() => mission), 2);
  const captures = resolve(process.env.LUMO_UNIVERS_CAPTURE ?? "data/apercu-univers");
  await mkdir(captures, { recursive: true });
  for (const id of ["espace", "medieval", "jardin"]) {
    await page.locator("[data-univers=" + id + "]").click();
    await page.waitForFunction((id) => document.querySelector("#app").dataset.aventure === id, id);
    assert.equal(await page.locator(".u-explore").count(), 1);
    await page.screenshot({ path: join(captures, id + "-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "Pas de débordement",
    );
    await page.screenshot({ path: join(captures, id + "-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 960 });
  }
  await page.setViewportSize({ width: 320, height: 740 });
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Petit téléphone sans débordement",
  );
  await page.locator("[data-univers=espace]").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => app.dataset.aventure === "espace");
  await page.locator("[data-univers=jardin]").click();
  await page.waitForFunction(() => app.dataset.aventure === "jardin");
  await page.evaluate(() => (window.echec = true));
  await page.locator("[data-univers=espace]").click();
  await page.locator("#u-reessayer").waitFor();
  assert.equal(await page.locator(".u-depart").isDisabled(), true);
  await page.locator("#u-reessayer").click();
  await page.waitForFunction(() => app.dataset.aventure === "espace");
  const cmds = await page.evaluate(() => commandes);
  assert.equal(cmds.at(-1).requete_id, cmds.at(-2).requete_id);
  await page.evaluate(async () => {
    quetes = [];
    await ouvrir();
  });
  assert.equal(await page.locator(".u-vide").count(), 1);
  assert.equal(await page.locator(".u-depart").count(), 0);
  await page.evaluate(async () => {
    quetes = [{ id: 4, titre: "Fini", matiere: "Français", statut: "terminee" }];
    await ouvrir();
  });
  assert.equal(await page.locator("progress").getAttribute("value"), "100");
  assert.equal(await page.locator(".u-fin").count(), 1);
  await page.locator('[data-mission="4"]').click();
  assert.equal(await page.evaluate(() => mission), 4);
  assert.deepEqual(errors, []);
  console.log(
    "OK navigateur : trois univers, mobile, reprise, progression, fin, état vide et nouvelle tentative idempotente.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
