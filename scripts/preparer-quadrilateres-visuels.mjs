// Met à jour les missions encore vierges ; conserve les essais si l'enfant a déjà commencé.
import { db, transaction } from "../src/db.ts";
import { creerQuetes, trouverEnfant, verifierQuetes } from "../src/logic.ts";
import { quetesQuadrilateres } from "./exercices-quadrilateres.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DOSSIER_DONNEES } from "../src/config.ts";

const anciensTitres = [
  "Reconnaître les quadrilatères",
  "Les propriétés : vrai ou faux",
  "Comprendre les diagonales",
];
try {
  const enfant = trouverEnfant("LUMO01", 1);
  if (!enfant) throw new Error("Profil Arthur introuvable.");
  const erreurs = verifierQuetes(quetesQuadrilateres);
  if (erreurs.length) throw new Error(erreurs.join("\n"));
  const resultats = transaction(() =>
    quetesQuadrilateres.map((quete, i) => {
      const cible = db
        .prepare(
          "SELECT * FROM quetes WHERE enfant_id=? AND origine_id IS NULL AND archivee=0 AND titre IN (?,?) ORDER BY id DESC LIMIT 1",
        )
        .get(enfant.id, anciensTitres[i], quete.titre);
      const essais = cible
        ? Number(
            db
              .prepare(
                "SELECT COUNT(*) n FROM reponses r JOIN questions q ON q.id=r.question_id WHERE q.quete_id=?",
              )
              .get(cible.id).n,
          )
        : 0;
      if (!cible || essais || cible.statut === "terminee") {
        if (cible) db.prepare("UPDATE quetes SET archivee=1 WHERE id=?").run(cible.id);
        return creerQuetes(enfant, [quete])[0];
      }
      db.prepare("UPDATE quetes SET titre=?,notion=? WHERE id=?").run(quete.titre, quete.notion, cible.id);
      // La mission n'a aucune tentative ni reprise : son contenu peut être remplacé.
      db.prepare("DELETE FROM questions WHERE quete_id=?").run(cible.id);
      const ajouter = db.prepare(
        "INSERT INTO questions(quete_id,ordre,type,consigne,choix,bonne,illustration) VALUES(?,?,?,?,?,?,?)",
      );
      quete.questions.forEach((q, j) =>
        ajouter.run(
          cible.id,
          j,
          q.type,
          q.consigne,
          q.type === "choix"
            ? JSON.stringify(q.choix)
            : q.type === "vrai_faux"
              ? JSON.stringify(["Vrai", "Faux"])
              : null,
          q.bonne_reponse,
          JSON.stringify(q.illustration),
        ),
      );
      return { id: Number(cible.id), titre: quete.titre, questions: quete.questions.length };
    }),
  );
  const dossier = join(DOSSIER_DONNEES, "exercices");
  await mkdir(dossier, { recursive: true });
  await writeFile(
    join(dossier, "quadrilateres-visuels-6e-primaire.json"),
    JSON.stringify({ enfant: enfant.prenom, quetes: quetesQuadrilateres }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      enfant: enfant.prenom,
      missions: resultats,
      total: resultats.reduce((n, q) => n + q.questions, 0),
    }),
  );
} finally {
  db.close();
}
