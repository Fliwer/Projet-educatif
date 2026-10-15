// Intégration réelle HTTP et relais stdio, uniquement sur une base fictive temporaire.
import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const dossier = await mkdtemp(join(tmpdir(), "lumo-test-mcp-distant-"));
process.env.LUMO_DATA = dossier;
process.env.LUMO_ENV_IGNORE = "1";
// Reproduit une ancienne base remplie pour vérifier la migration, pas seulement une base vide.
const ancienneBase = new DatabaseSync(join(dossier, "lumo.db"));
ancienneBase.exec(`CREATE TABLE enfants (
 id INTEGER PRIMARY KEY, prenom TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
 univers TEXT NOT NULL DEFAULT 'espace', quetes_finies INTEGER NOT NULL DEFAULT 0,
 soirs INTEGER NOT NULL DEFAULT 0, dernier_jour TEXT
); INSERT INTO enfants (prenom, code) VALUES ('Arthur historique', 'LUMO01');`);
ancienneBase.close();
const { db } = await import("../src/db.ts");
assert.equal((db.prepare("SELECT parent_id FROM enfants WHERE code = 'LUMO01'").get() as any).parent_id, 1);
assert.throws(() =>
  db.prepare("INSERT INTO enfants (prenom, code, parent_id) VALUES ('Test', 'ABC123', 9999)").run(),
);
const { creerParent, empreinte } = await import("../src/parents.ts");
const { ajouterEnfant } = await import("../src/logic.ts");
const { creerInvitation, lireInvitation } = await import("../src/invitations.ts");
const parentA = creerParent("Parent A fictif");
const parentB = creerParent("Parent B fictif");
const enfantA = ajouterEnfant("Arthur A", "espace", parentA.id);
const enfantB = ajouterEnfant("Arthur B", "nature", parentB.id);
const sonde = createServer();
sonde.listen(0, "127.0.0.1");
await once(sonde, "listening");
const port = (sonde.address() as { port: number }).port;
await new Promise<void>((fin) => sonde.close(() => fin()));
const adresse = `http://127.0.0.1:${port}`;
const serveur = spawn(process.execPath, [join(import.meta.dirname, "..", "src", "web.ts")], {
  env: { ...process.env, PORT: String(port), LUMO_URL: adresse, LUMO_MCP_ACTIF: "1", LUMO_PARTAGE: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let sortieErreur = "";
serveur.stderr.on("data", (morceau) => {
  sortieErreur += morceau;
});
const clients: Client[] = [];
const quetes = [
  {
    titre: "Fusée des sept",
    matiere: "Maths",
    notion: "La table de 7",
    extrait_lecon: "7 × 2 = 14 ; 7 × 3 = 21 ; 7 × 4 = 28.",
    questions: [
      {
        type: "associer",
        consigne: "Relie le calcul au résultat",
        paires: [
          ["7 × 2", "14"],
          ["7 × 3", "21"],
        ],
      },
      { type: "choix", consigne: "7 × 3 = ?", choix: ["21", "24"], bonne_reponse: "21" },
      { type: "texte", consigne: "7 × 4 = ?", bonne_reponse: "28" },
      { type: "vrai_faux", consigne: "7 × 2 = 14.", bonne_reponse: "Vrai" },
      { type: "ordre", consigne: "Range les nombres", elements: ["7", "14", "21"] },
    ],
  },
];
const contenu = (resultat: any) => resultat.content[0].text as string;
try {
  await new Promise<void>((fin, refus) => {
    const limite = setTimeout(() => refus(new Error("Le serveur de test ne démarre pas.")), 10000);
    serveur.stdout.on("data", () => {
      clearTimeout(limite);
      fin();
    });
    serveur.once("exit", () => {
      clearTimeout(limite);
      refus(new Error(sortieErreur));
    });
  });
  assert.equal((await fetch(`${adresse}/api/moi`, { headers: { "X-Lumo-Code": "ARTHUR" } })).status, 401);
  const invitation = creerInvitation("famille-invitee");
  const lienInvitation = `${adresse}/parent/connexion/${invitation.jeton}`;
  const pageInvitation = await fetch(lienInvitation);
  assert.equal(pageInvitation.status, 200);
  assert.equal(pageInvitation.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(pageInvitation.headers.get("Cache-Control"), "no-store");
  const htmlInvitation = await pageInvitation.text();
  assert.ok(htmlInvitation.includes(invitation.cle), "La famille reçoit sa propre clé privée");
  assert.ok(!htmlInvitation.includes(parentA.cle) && !htmlInvitation.includes(parentB.cle));
  const clientInvite = new Client({ name: "test-famille-invitee", version: "1.0.0" });
  clients.push(clientInvite);
  await clientInvite.connect(
    new StreamableHTTPClientTransport(new URL(adresse + "/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${invitation.cle}` } },
    }),
  );
  const profilsInvites = JSON.parse(
    contenu(await clientInvite.callTool({ name: "lister_enfants", arguments: {} })),
  );
  assert.deepEqual(
    profilsInvites.enfants.map((e: any) => e.code),
    [invitation.code],
  );
  const accesAutreEnfant = await clientInvite.callTool({
    name: "creer_quetes",
    arguments: { enfant: enfantA.code, quetes },
  });
  assert.equal(accesAutreEnfant.isError, true, "Une invitation ne donne pas accès à une autre famille");
  const fichierInvitation = join(dossier, "connexions", "invitations", `${empreinte(invitation.jeton)}.json`);
  const originalInvitation = await readFile(fichierInvitation, "utf8");
  await writeFile(fichierInvitation, JSON.stringify({ ...JSON.parse(originalInvitation), expire: 1 }));
  assert.equal(lireInvitation(invitation.jeton), undefined);
  assert.equal((await fetch(lienInvitation)).status, 404, "Invitation expirée refusée");
  await writeFile(fichierInvitation, originalInvitation);
  db.prepare("UPDATE parents SET cle_hash = NULL WHERE id = ?").run(invitation.parent_id);
  assert.equal((await fetch(lienInvitation)).status, 404, "Une clé révoquée ne peut plus être récupérée");
  assert.equal(
    (
      await fetch(adresse + "/mcp", {
        method: "POST",
        headers: { Authorization: `Bearer ${invitation.cle}` },
      })
    ).status,
    401,
  );
  const entetesEnfant = { "X-Lumo-Code": enfantA.code, "Content-Type": "application/json" };
  const rythmeCommande = { objectif: 2, version: 0, requete_id: randomUUID() };
  const posterRythme = (body: unknown) =>
    fetch(adresse + "/api/rendez-vous", {
      method: "POST",
      headers: entetesEnfant,
      body: JSON.stringify(body),
    });
  assert.equal((await fetch(adresse + "/api/rendez-vous", { method: "POST" })).status, 401);
  assert.equal((await posterRythme({ ...rythmeCommande, enfant_id: enfantB.id })).status, 400);
  const rythmes = await Promise.all([posterRythme(rythmeCommande), posterRythme(rythmeCommande)]);
  assert.deepEqual(
    rythmes.map((r) => r.status),
    [200, 200],
  );
  const rythmesEtats = await Promise.all(rythmes.map((r) => r.json()));
  assert.ok(rythmesEtats.every((r) => r.version === 1 && r.objectif === 2));
  const etatAutreRythme = await (
    await fetch(adresse + "/api/moi", { headers: { "X-Lumo-Code": enfantB.code } })
  ).json();
  assert.equal(etatAutreRythme.rendez_vous.objectif, 3, "Le rythme d'une autre famille n'est pas modifié");
  assert.equal((await fetch(adresse + "/api/monde")).status, 401);
  const initialMonde = (await (
    await fetch(adresse + "/api/monde", { headers: entetesEnfant })
  ).json()) as any;
  const actionMonde = {
    action: "avatar",
    avatar: { couleur: "bleu", badge: "aucun" },
    version: initialMonde.version,
    requete_id: randomUUID(),
  };
  const posterMonde = (body: unknown) =>
    fetch(adresse + "/api/monde/actions", {
      method: "POST",
      headers: entetesEnfant,
      body: JSON.stringify(body),
    });
  const doublonsMonde = await Promise.all([posterMonde(actionMonde), posterMonde(actionMonde)]);
  assert.deepEqual(
    doublonsMonde.map((r) => r.status),
    [200, 200],
  );
  const etatsMonde = (await Promise.all(doublonsMonde.map((r) => r.json()))) as any[];
  assert.equal(etatsMonde[0].monde.version, initialMonde.version + 1);
  assert.deepEqual(etatsMonde[0], etatsMonde[1], "Un double clic HTTP modifie une seule fois le profil");
  assert.equal(
    (
      await posterMonde({
        ...actionMonde,
        requete_id: randomUUID(),
        avatar: { couleur: "rose", badge: "aucun" },
      })
    ).status,
    409,
  );
  assert.equal(
    (await posterMonde({ ...actionMonde, action: "planter", parcelle: 0, culture: "fraise" })).status,
    400,
  );
  assert.equal((await fetch(adresse + "/monde-potager.js")).status, 404);
  assert.equal((await posterMonde({ ...actionMonde, enfant_id: enfantB.id })).status, 400);
  assert.equal((await posterMonde({ action: "inventaire", quantite: 1000 })).status, 400);
  const mondeB = (await (
    await fetch(adresse + "/api/monde", { headers: { "X-Lumo-Code": enfantB.code } })
  ).json()) as any;
  assert.deepEqual(
    mondeB.avatar,
    { couleur: "violet", badge: "aucun" },
    "L’avatar d’une autre famille reste intact",
  );
  for (const body of ["null", "[]", "{", JSON.stringify({ question_id: "1", valeur: "42" })]) {
    assert.equal(
      (await fetch(`${adresse}/api/reponses`, { method: "POST", headers: entetesEnfant, body })).status,
      400,
      `Corps refusé : ${body}`,
    );
  }
  assert.equal(
    (
      await fetch(`${adresse}/api/reponses`, {
        method: "POST",
        headers: entetesEnfant,
        body: JSON.stringify({ valeur: "é".repeat(7000) }),
      })
    ).status,
    413,
    "La limite porte sur les octets UTF-8",
  );
  assert.equal((await fetch(`${adresse}/%2e%2e%5cpackage.json`)).status, 403, "Aucun fichier hors de public");
  assert.equal((await fetch(`${adresse}/health`)).status, 200, "Le serveur survit aux entrées invalides");
  const refus = await fetch(`${adresse}/mcp`, { method: "POST", body: "{}" });
  assert.equal(refus.status, 401, "Aucun accès sans clé parent");
  const origine = await fetch(`${adresse}/mcp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${parentA.cle}`, Origin: "https://exemple-inconnu.test" },
    body: "{}",
  });
  assert.equal(origine.status, 403);
  const client = new Client({ name: "test-parent-a", version: "1.0.0" });
  clients.push(client);
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${adresse}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${parentA.cle}` } },
    }),
  );
  assert.equal((await client.listTools()).tools.length, 4);
  const profils = JSON.parse(contenu(await client.callTool({ name: "lister_enfants", arguments: {} })));
  assert.deepEqual(
    profils.enfants.map((enfant: any) => enfant.code),
    [enfantA.code],
  );
  assert.equal(
    (await client.callTool({ name: "voir_progression", arguments: { enfant: enfantB.code } })).isError,
    true,
  );
  assert.equal(
    (await client.callTool({ name: "creer_quetes", arguments: { enfant: enfantB.code, quetes } })).isError,
    true,
  );
  const resultat = await client.callTool({
    name: "creer_quetes",
    arguments: { enfant: enfantA.code, quetes },
  });
  assert.ok(!resultat.isError, contenu(resultat));
  const lien = contenu(resultat).match(/http:\/\/[^\s]+\/parent\/brouillons\/[A-Za-z0-9_-]{43}/)![0];
  const avant = await (
    await fetch(`${adresse}/api/moi`, { headers: { "X-Lumo-Code": enfantA.code } })
  ).json();
  assert.equal(avant.quetes.length, 0, "Le brouillon reste invisible à l'enfant");
  const pageApercu = await fetch(lien);
  assert.equal(
    pageApercu.headers.get("referrer-policy"),
    "same-origin",
    "Le formulaire conserve son origine sans divulguer le lien à un autre site",
  );
  const apercu = await pageApercu.text();
  assert.ok(apercu.includes("La table de 7"));
  assert.equal((apercu.match(/name="question"/g) || []).length, 5);
  const nonce = apercu.match(/name="nonce" value="([A-Za-z0-9_-]+)"/)![1];
  const autreSite = await fetch(lien, {
    method: "POST",
    headers: { Origin: "https://autre-site.test", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ confirme: "oui", nonce }),
  });
  assert.equal(autreSite.status, 403, "Un autre site ne peut pas valider un brouillon");
  const mauvais = await fetch(lien, {
    method: "POST",
    headers: { Origin: adresse, "Content-Type": "application/x-www-form-urlencoded" },
    body: "confirme=oui&nonce=invalide",
  });
  assert.equal(mauvais.status, 400);
  for (const body of [
    new URLSearchParams({ nonce, selection_presente: "oui", question: "0:0" }),
    new URLSearchParams({ confirme: "oui", nonce, selection_presente: "oui" }),
  ]) {
    const refusSelection = await fetch(lien, {
      method: "POST",
      headers: { Origin: adresse, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    assert.equal(refusSelection.status, 400, "Confirmation et sélection non vide exigées côté serveur");
  }
  const toujoursVide = await (
    await fetch(`${adresse}/api/moi`, { headers: { "X-Lumo-Code": enfantA.code } })
  ).json();
  assert.equal(toujoursVide.quetes.length, 0, "Un envoi refusé ne publie aucune mission");
  const valider = () =>
    fetch(lien, {
      method: "POST",
      headers: { Origin: adresse, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams([
        ["confirme", "oui"],
        ["nonce", nonce],
        ["selection_presente", "oui"],
        ["question", "0:0"],
        ["question", "0:1"],
        ["question", "0:2"],
      ]),
    });
  assert.equal((await valider()).status, 200);
  assert.ok(
    (await (await fetch(lien)).text()).includes(`/#profil=${enfantA.code}`),
    "Le brouillon publié ouvre le profil destinataire",
  );
  assert.equal((await valider()).status, 200);
  const apres = await (
    await fetch(`${adresse}/api/moi`, { headers: { "X-Lumo-Code": enfantA.code } })
  ).json();
  assert.equal(apres.quetes.length, 1, "Une seule publication après deux validations");
  assert.equal(
    (
      await fetch(`${adresse}/api/quetes/${apres.quetes[0].id}/terminer`, {
        method: "POST",
        headers: entetesEnfant,
      })
    ).status,
    409,
    "Impossible de terminer sans jouer",
  );
  assert.equal(
    (await fetch(`${adresse}/api/quetes/${apres.quetes[0].id}`, { headers: { "X-Lumo-Code": enfantB.code } }))
      .status,
    404,
    "Un code enfant n'accède pas à une autre famille",
  );
  const questions = await (
    await fetch(`${adresse}/api/quetes/${apres.quetes[0].id}`, { headers: { "X-Lumo-Code": enfantA.code } })
  ).json();
  assert.equal(questions.questions.length, 3, "Seules les questions gardées sont publiées via HTTP");
  assert.ok(!JSON.stringify(questions).includes('"bonne_reponse"'));
  assert.ok(!JSON.stringify(questions).includes('"extrait_lecon"'));
  const requeteId = crypto.randomUUID();
  const repondre = () =>
    fetch(`${adresse}/api/reponses`, {
      method: "POST",
      headers: entetesEnfant,
      body: JSON.stringify({ question_id: questions.questions[1].id, valeur: "21", requete_id: requeteId }),
    });
  const doublons = await Promise.all([repondre(), repondre()]);
  assert.ok(doublons.every((r) => r.status === 200));
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM reponses WHERE requete_id = ?").get(requeteId)!.n,
    1,
    "Deux requêtes HTTP simultanées ne font qu'une réponse",
  );
  const jeton = lien.split("/").at(-1)!;
  db.prepare("UPDATE brouillons SET expire = 0 WHERE jeton_hash = ?").run(empreinte(jeton));
  assert.equal((await fetch(lien)).status, 404, "Expiration des liens privés");
  const connexion = join(dossier, ".env");
  await writeFile(connexion, `LUMO_MCP_URL=${adresse}/mcp\nLUMO_MCP_CLE=${parentB.cle}\n`);
  const relais = new Client({ name: "test-relais-parent-b", version: "1.0.0" });
  clients.push(relais);
  await relais.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [join(import.meta.dirname, "..", "src", "mcp-client.ts"), connexion],
      stderr: "ignore",
    }),
  );
  const profilsB = JSON.parse(contenu(await relais.callTool({ name: "lister_enfants", arguments: {} })));
  assert.deepEqual(
    profilsB.enfants.map((enfant: any) => enfant.code),
    [enfantB.code],
  );
  let statutLimite = 0;
  for (let i = 0; i < 22; i++)
    statutLimite = (await fetch(`${adresse}/api/moi`, { headers: { "X-Lumo-Code": "BADBAD" } })).status;
  assert.equal(statutLimite, 429, "Les essais de codes inconnus sont limités");
  assert.equal(
    (await fetch(`${adresse}/api/moi`, { headers: { "X-Lumo-Code": enfantA.code } })).status,
    200,
    "Les familles connectées restent accessibles",
  );
  console.log(
    "OK : MCP HTTP authentifié, familles séparées, aperçu parent, publication unique, expiration et relais Claude Desktop.",
  );
} finally {
  for (const client of clients) await client.close();
  if (serveur.exitCode === null) {
    const arret = once(serveur, "exit");
    serveur.kill();
    await arret;
  }
  db.close();
  await rm(dossier, { recursive: true, force: true });
}
