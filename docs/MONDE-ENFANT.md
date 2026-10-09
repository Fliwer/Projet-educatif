# Espace personnel enfant

État du 9 octobre 2026 : avatar (quatre couleurs), collection de trois écussons et carnet de progrès. Une mission terminée attribue un crédit cadeau, indépendamment des erreurs et de la vitesse. Les anciens objets et créations restent consultables comme souvenirs.

## Contrats

src/monde.ts reçoit une connexion SQLite explicite. GET /api/monde lit le profil identifié par le serveur. POST /api/monde/actions accepte uniquement avatar et debloquer (écussons), avec un corps strict. Version, UUID et signature protègent des conflits et répétitions. Achats et attributions sont transactionnels.

Les champs historiques du jardin et de la cuisine restent conservés dans le JSON, sans être exposés ni modifiables par les commandes. Les prix historiques restent nécessaires au calcul du solde. Les migrations SQL historiques sont conservées. Aucune nouvelle migration SQL.

Le carnet affiche le total historique des missions terminées, les questions distinctes essayées dans les quêtes conservées et les vingt dernières missions.

## Modules et vérifications

public/espace-personnel.js contient les écrans et commandes, milo.js le personnage, monde-art.js les illustrations encore utilisées. Les styles sont dans monde.css et espace-personnel.css. monde-mouvement.js conserve la préférence calme. Les anciennes routes jardin/cuisine ouvrent l’avatar. Aucune génération audio ou LLM supplémentaire.

npm run verify teste notamment droits, soldes, isolation, répétitions, conflits, reprise SQLite, conservation des données historiques, rollback et refus des anciennes actions HTTP.

## Archives

Les ateliers sont retirés du code actif et récupérables dans le tag archive/avant-nettoyage-ateliers-2026-10-09. Pour les examiner séparément :

    git worktree add --detach ../lumo-archive archive/avant-nettoyage-ateliers-2026-10-09

Les bases et secrets ne sont pas dans Git. Sauvegarde : npm run backup. Restauration : voir EXPLOITATION.md. Les limites avant production restent décrites dans ARCHITECTURE.md.
