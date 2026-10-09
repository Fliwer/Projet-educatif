import { strict as assert } from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrer } from "../src/migrations.ts";

const dossier = await mkdtemp(join(tmpdir(), "lumo-test-sauvegarde-"));
const source = new DatabaseSync(join(dossier, "lumo.db"));
try {
  migrer(source);
  source.prepare("INSERT INTO enfants (prenom, code) VALUES (?, ?)").run("Profil de test", "TEST01");
  // Garder la connexion source ouverte avec son journal WAL pendant la copie.
  const resultat = spawnSync(process.execPath, [join(import.meta.dirname, "sauvegarder.ts")], {
    env: { ...process.env, LUMO_DATA: dossier, LUMO_ENV_IGNORE: "1" },
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.equal(resultat.status, 0, resultat.stderr);
  const [fichier] = await readdir(join(dossier, "sauvegardes"));
  await copyFile(join(dossier, "sauvegardes", fichier), join(dossier, "restauree.db"));
  const restauree = new DatabaseSync(join(dossier, "restauree.db"));
  try {
    migrer(restauree);
    assert.equal(restauree.prepare("PRAGMA integrity_check").get()!.integrity_check, "ok");
    assert.deepEqual(
      restauree.prepare("SELECT * FROM enfants").all(),
      source.prepare("SELECT * FROM enfants").all(),
    );
  } finally {
    restauree.close();
  }
  console.log(
    "OK : sauvegarde avec WAL actif, ouverture d'une copie restaurée, intégrité et données conservées.",
  );
} finally {
  source.close();
  await rm(dossier, { recursive: true, force: true });
}
