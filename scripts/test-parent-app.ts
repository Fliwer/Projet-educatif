import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dossier = await mkdtemp(join(tmpdir(), "lumo-parent-app-"));
process.env.LUMO_ENV_IGNORE = "1";
process.env.LUMO_DATA = dossier;
process.env.LUMO_DEMO = "1";
delete process.env.LUMO_PARTAGE;
const { db } = await import("../src/db.ts");
const { creerParent } = await import("../src/parents.ts");
const { ajouterEnfant, trouverEnfant, creerQuetes } = await import("../src/logic.ts");
const { traiterParent } = await import("../src/parent-web.ts");
db.prepare("UPDATE enfants SET prenom = ? WHERE code = ?").run("Démo-unique", "LUMO01");
const autre = creerParent("Famille privée fictive");
const enfantAutre = ajouterEnfant("Profil-confidentiel", "nature", autre.id);
creerQuetes(trouverEnfant("LUMO01")!, [
  {
    titre: 'Leçon <img src=x onerror="alert(1)">',
    matiere: "Français",
    questions: [{ type: "texte", consigne: "Quel animal miaule ?", bonne_reponse: "chat" }],
  },
]);
db.prepare("UPDATE quetes SET cree_le='2026-09-12 10:00:00' WHERE titre LIKE 'Leçon <img%'").run();
let adresse = "";
const serveur = createServer(async (req, res) => {
  try {
    if (
      !(await traiterParent(
        req,
        res,
        new URL(req.url ?? "/", adresse).pathname === "/"
          ? "/parent"
          : new URL(req.url ?? "/", adresse).pathname,
        adresse,
      ))
    ) {
      res.writeHead(404);
      res.end();
    }
  } catch {
    res.writeHead(500);
    res.end();
  }
});
await new Promise<void>((resolve) => serveur.listen(0, "127.0.0.1", resolve));
adresse = `http://127.0.0.1:${(serveur.address() as { port: number }).port}`;
try {
  const reponse = await fetch(adresse);
  const html = await reponse.text();
  assert.equal(reponse.status, 200);
  assert.equal(
    (await fetch(adresse + "/parent/photo", { method: "POST" })).status,
    404,
    "Le pilote n’expose aucune route d’analyse photo par API",
  );
  assert.ok(html.includes("Démo-unique"), "Le suivi local montre le profil démo");
  assert.ok(!html.includes("Profil-confidentiel"), "La famille distante reste privée");
  assert.ok(html.includes("Leçon &lt;img"));
  assert.ok(!html.includes("<img src=x onerror="), "Les titres des leçons sont échappés");
  assert.ok(html.includes('data-mois="2026-09"'), "Le carnet propose le mois réel d’ajout");
  assert.ok(html.includes('data-etape-mois="2026-09"'), "La branche regroupe les leçons par mois");
  assert.ok(html.includes('data-mois-mission="2026-09"'), "Le filtre porte sur la date de création");
  assert.ok(html.includes("Ajoutée le 12 septembre 2026"), "La date d’ajout reste distincte du résultat");
  assert.ok(html.includes("Extrait d’un exercice"));
  assert.ok(html.includes("Quel animal miaule ?"), "L’aperçu contient une vraie consigne enregistrée");
  assert.ok(
    html.includes("Illustration de la branche"),
    "Le décor n’est pas présenté comme une photo de la leçon",
  );
  const { apercuLecon } = await import("../src/parent-apercu.ts");
  const dessin = apercuLecon({
    matiere: "Mathématiques",
    apercu_json: JSON.stringify({
      consigne: '<img src=x onerror="alert(1)">',
      illustration: JSON.stringify({
        figures: [
          {
            id: "A",
            points: [
              [30, 30],
              [200, 30],
              [200, 150],
              [30, 150],
            ],
          },
        ],
      }),
    }),
  });
  assert.ok(dessin.includes("Dessin de l’exercice"));
  assert.ok(dessin.includes("<svg"));
  assert.ok(!dessin.includes("<img"), "La consigne de l’aperçu est échappée");
  assert.ok(
    !apercuLecon({
      matiere: "Français",
      apercu_json: '{"consigne":"Extrait", "illustration":"invalide"}',
    }).includes("Dessin de l’exercice"),
    "Un dessin invalide utilise le décor de secours",
  );
  const nonce = html.match(/name="nonce" value="([A-Za-z0-9_-]{43})"/)![1];
  const donnees = {
    nonce,
    id: String(trouverEnfant("LUMO01")!.id),
    prenom: "Démo-unique",
    univers: "espace",
    niveau_scolaire: "4e primaire",
    pays: "Belgique",
    aides: "Une consigne à la fois",
  };
  const poster = (body: Record<string, string>, origin = adresse, extra: Record<string, string> = {}) =>
    fetch(adresse + "/parent/profils", {
      method: "POST",
      redirect: "manual",
      headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded", ...extra },
      body: new URLSearchParams(body),
    });
  assert.equal((await poster(donnees, "https://autre-site.test")).status, 403);
  assert.equal((await poster({ ...donnees, nonce: "invalide" })).status, 403);
  assert.equal((await poster(donnees, adresse, { "X-Forwarded-For": "203.0.113.1" })).status, 403);
  assert.equal(
    (await poster({ ...donnees, id: String(enfantAutre.id) })).status,
    400,
    "Le profil d'une autre famille ne peut pas être modifié",
  );
  assert.equal((await poster({ ...donnees, pays: "   " })).status, 400);
  assert.equal((await poster(donnees)).status, 303);
  const profilSauve = trouverEnfant("LUMO01")!;
  assert.equal(profilSauve.niveau_scolaire, "4e primaire");
  assert.equal(profilSauve.pays, "Belgique");
  assert.equal(profilSauve.aides, "Une consigne à la fois");
  assert.ok(
    (await (await fetch(adresse)).text()).includes('data-classe="4e primaire"'),
    "Les repères enregistrés sont réutilisables sans les redemander",
  );
  assert.equal((await poster({ ...donnees, id: "", prenom: "Nouveau fictif" })).status, 303);
  assert.equal(trouverEnfant("Nouveau fictif", 1)!.pays, "Belgique");
  const casAcces: Record<string, string>[] = [{ "X-Forwarded-For": "203.0.113.1" }, {}];
  for (const entetes of casAcces) {
    process.env.LUMO_PARTAGE = Object.keys(entetes).length ? "0" : "1";
    const distant = await (await fetch(adresse, { headers: entetes })).text();
    assert.ok(!distant.includes("Démo-unique"), "Aucun suivi de famille via proxy ou partage");
    assert.ok(!distant.includes("Profil-confidentiel"));
    assert.ok(distant.includes("Aperçu parents"));
  }
  delete process.env.LUMO_PARTAGE;
  process.env.LUMO_DEMO = "0";
  assert.ok(!(await (await fetch(adresse)).text()).includes("Démo-unique"));
  console.log(
    "OK espace parents : suivi démo local, familles isolées, partage sans données privées et titres échappés.",
  );
} finally {
  await new Promise<void>((resolve, reject) => serveur.close((err) => (err ? reject(err) : resolve())));
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
