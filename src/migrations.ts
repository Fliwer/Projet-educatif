import type { DatabaseSync } from "node:sqlite";
const VERSION = 11;

/** Migrations sérialisées entre serveur HTTP et MCP, y compris sur une ancienne base. */
export function migrer(db: DatabaseSync) {
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
  // SQLite interdit ALTER ADD REFERENCES DEFAULT sur une table remplie avec FK actives.
  db.exec("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;");
  try {
    const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
    if (version > VERSION)
      throw new Error("Base plus récente que ce programme : utilise la bonne version de Lumo.");
    if (version < 1) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS parents (id INTEGER PRIMARY KEY, libelle TEXT NOT NULL, cle_hash TEXT UNIQUE);
        INSERT OR IGNORE INTO parents (id, libelle) VALUES (1, 'Démo locale');
        CREATE TABLE IF NOT EXISTS enfants (
          id INTEGER PRIMARY KEY, prenom TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
          univers TEXT NOT NULL DEFAULT 'espace', quetes_finies INTEGER NOT NULL DEFAULT 0,
          soirs INTEGER NOT NULL DEFAULT 0, dernier_jour TEXT,
          parent_id INTEGER NOT NULL DEFAULT 1 REFERENCES parents(id)
        );
        CREATE TABLE IF NOT EXISTS quetes (
          id INTEGER PRIMARY KEY, enfant_id INTEGER NOT NULL REFERENCES enfants(id),
          titre TEXT NOT NULL, matiere TEXT NOT NULL, statut TEXT NOT NULL DEFAULT 'a_faire',
          cree_le TEXT NOT NULL, finie_le TEXT
        );
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY, quete_id INTEGER NOT NULL REFERENCES quetes(id), ordre INTEGER NOT NULL,
          type TEXT NOT NULL, consigne TEXT NOT NULL, choix TEXT, bonne TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reponses (
          id INTEGER PRIMARY KEY, question_id INTEGER NOT NULL REFERENCES questions(id),
          valeur TEXT NOT NULL, correcte INTEGER NOT NULL, le TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS brouillons (
          id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parents(id),
          enfant_id INTEGER NOT NULL REFERENCES enfants(id), jeton_hash TEXT NOT NULL UNIQUE,
          nonce TEXT NOT NULL, contenu TEXT NOT NULL, expire INTEGER NOT NULL, publie INTEGER NOT NULL DEFAULT 0
        );
      `);
      if (
        !db
          .prepare("PRAGMA table_info(enfants)")
          .all()
          .some((c) => c.name === "parent_id")
      ) {
        db.exec("ALTER TABLE enfants ADD COLUMN parent_id INTEGER NOT NULL DEFAULT 1 REFERENCES parents(id)");
      }
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_enfants_parent ON enfants(parent_id);
        CREATE INDEX IF NOT EXISTS idx_quetes_enfant_statut ON quetes(enfant_id, statut);
        CREATE INDEX IF NOT EXISTS idx_questions_quete_ordre ON questions(quete_id, ordre);
        CREATE INDEX IF NOT EXISTS idx_reponses_question ON reponses(question_id, id);
        CREATE INDEX IF NOT EXISTS idx_brouillons_parent ON brouillons(parent_id, expire);
      `);
    }
    if (version < 2) {
      db.exec("ALTER TABLE reponses ADD COLUMN requete_id TEXT;");
      db.exec(
        "CREATE UNIQUE INDEX idx_reponses_requete ON reponses(requete_id) WHERE requete_id IS NOT NULL;",
      );
    }
    if (version < 3)
      db.exec(
        "CREATE TABLE IF NOT EXISTS budget_voix (jour TEXT PRIMARY KEY, caracteres INTEGER NOT NULL DEFAULT 0);",
      );
    if (version < 4) {
      db.exec(`
        CREATE TABLE monde_etats (
          enfant_id INTEGER PRIMARY KEY REFERENCES enfants(id),
          version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
          donnees TEXT NOT NULL
        );
        CREATE TABLE monde_attributions (
          enfant_id INTEGER NOT NULL REFERENCES enfants(id),
          source TEXT NOT NULL,
          quantite INTEGER NOT NULL CHECK(quantite >= 0),
          PRIMARY KEY(enfant_id, source)
        );
        INSERT INTO monde_attributions (enfant_id, source, quantite)
          SELECT id, 'heritage', MAX(0, quetes_finies) FROM enfants;
        CREATE TABLE monde_deblocages (
          enfant_id INTEGER NOT NULL REFERENCES enfants(id),
          objet TEXT NOT NULL,
          PRIMARY KEY(enfant_id, objet)
        );
        CREATE TABLE monde_commandes (
          enfant_id INTEGER NOT NULL REFERENCES enfants(id),
          requete_id TEXT NOT NULL,
          signature TEXT NOT NULL,
          revision INTEGER NOT NULL,
          message TEXT NOT NULL,
          PRIMARY KEY(enfant_id, requete_id)
        );
      `);
    }
    if (version < 5) {
      // Un id INTEGER peut être réutilisé après suppression : l'attribution a une identité durable.
      db.exec(`
        ALTER TABLE quetes ADD COLUMN recompense_cle TEXT;
        UPDATE quetes SET recompense_cle = lower(hex(randomblob(16)));
        CREATE UNIQUE INDEX idx_quetes_recompense_cle ON quetes(recompense_cle);
        UPDATE monde_attributions SET source = 'quete:' || (
          SELECT recompense_cle FROM quetes WHERE 'quete:' || quetes.id = monde_attributions.source
        ) WHERE source IN (SELECT 'quete:' || id FROM quetes);
      `);
    }
    if (version < 6) {
      db.exec(
        "ALTER TABLE quetes ADD COLUMN archivee INTEGER NOT NULL DEFAULT 0 CHECK(archivee IN (0,1)); ALTER TABLE quetes ADD COLUMN notion TEXT;",
      );
    }
    if (version < 7) {
      db.exec(
        "ALTER TABLE quetes ADD COLUMN origine_id INTEGER REFERENCES quetes(id); ALTER TABLE quetes ADD COLUMN reprise_requete TEXT; ALTER TABLE quetes ADD COLUMN reprise_mode TEXT; ALTER TABLE questions ADD COLUMN source_id INTEGER REFERENCES questions(id); CREATE UNIQUE INDEX idx_reprise_requete ON quetes(reprise_requete) WHERE reprise_requete IS NOT NULL; CREATE TABLE reprise_demandes (requete TEXT PRIMARY KEY, enfant_id INTEGER NOT NULL REFERENCES enfants(id), origine_id INTEGER NOT NULL REFERENCES quetes(id), mode TEXT NOT NULL, quete_id INTEGER NOT NULL REFERENCES quetes(id)); CREATE UNIQUE INDEX idx_reprise_active ON quetes(origine_id) WHERE origine_id IS NOT NULL AND statut != 'terminee' AND archivee=0;",
      );
    }
    if (version < 8) {
      db.exec(`
        CREATE TABLE rendez_vous_reglages (enfant_id INTEGER PRIMARY KEY REFERENCES enfants(id), objectif INTEGER NOT NULL CHECK(objectif IN (2,3,4)), version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0));
        CREATE TABLE rendez_vous_semaines (enfant_id INTEGER NOT NULL REFERENCES enfants(id), semaine TEXT NOT NULL, objectif INTEGER NOT NULL CHECK(objectif IN (2,3,4)), PRIMARY KEY(enfant_id,semaine));
        CREATE TABLE rendez_vous_jours (enfant_id INTEGER NOT NULL, jour TEXT NOT NULL, semaine TEXT NOT NULL, PRIMARY KEY(enfant_id,jour), FOREIGN KEY(enfant_id,semaine) REFERENCES rendez_vous_semaines(enfant_id,semaine));
        CREATE TABLE rendez_vous_commandes (enfant_id INTEGER NOT NULL REFERENCES enfants(id), requete_id TEXT NOT NULL, signature TEXT NOT NULL, PRIMARY KEY(enfant_id,requete_id));
        INSERT INTO rendez_vous_semaines(enfant_id,semaine,objectif)
          SELECT DISTINCT enfant_id,date(substr(finie_le,1,10),printf('-%d days',(CAST(strftime('%w',substr(finie_le,1,10)) AS INTEGER)+6)%7)),3 FROM quetes WHERE statut='terminee' AND date(substr(finie_le,1,10)) IS NOT NULL;
        INSERT INTO rendez_vous_jours(enfant_id,jour,semaine)
          SELECT DISTINCT enfant_id,substr(finie_le,1,10),date(substr(finie_le,1,10),printf('-%d days',(CAST(strftime('%w',substr(finie_le,1,10)) AS INTEGER)+6)%7)) FROM quetes WHERE statut='terminee' AND date(substr(finie_le,1,10)) IS NOT NULL;
      `);
    }
    if (
      version < 9 &&
      !db
        .prepare("PRAGMA table_info(questions)")
        .all()
        .some((c) => c.name === "illustration")
    )
      db.exec("ALTER TABLE questions ADD COLUMN illustration TEXT;");
    if (version < 10) {
      const colonnes = new Set(
        db
          .prepare("PRAGMA table_info(enfants)")
          .all()
          .map((c) => c.name),
      );
      for (const colonne of ["niveau_scolaire", "pays", "aides"])
        if (!colonnes.has(colonne)) db.exec(`ALTER TABLE enfants ADD COLUMN ${colonne} TEXT;`);
    }
    if (version < 11) {
      for (const [table, colonnes] of [
        ["quetes", ["resume"]],
        ["questions", ["indice", "aide", "explication"]],
      ] as const) {
        const presentes = new Set(
          db
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .map((c) => c.name),
        );
        for (const colonne of colonnes)
          if (!presentes.has(colonne)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} TEXT;`);
      }
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Liens invalides dans la base : migration annulée.");
    db.exec(`PRAGMA user_version = ${VERSION}; COMMIT;`);
  } catch (erreur) {
    db.exec("ROLLBACK");
    throw erreur;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}
