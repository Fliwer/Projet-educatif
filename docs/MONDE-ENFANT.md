# Espace personnel enfant

## Règle de conception : une identité propre à Lumo

Décision du 12 octobre 2026 : Duolingo et Adibou peuvent servir de références pour discuter d'un besoin, mais leurs écrans ne sont pas des modèles à reproduire. Chaque évolution doit partir des objectifs de Lumo : exercices liés aux devoirs, consignes accessibles aux enfants du primaire, validation parent et progression compréhensible.

Les séances courtes, les révisions et le retour sur les réponses doivent être conçus pour ces objectifs. La carte, les récompenses, le personnage Milo, les textes, les illustrations, les sons et les animations doivent avoir une réalisation originale. Changer les couleurs ou remplacer une mascotte sur une interface reproduite ne satisfait pas cette règle.

Avant d'accepter une nouvelle interface, vérifier son organisation, sa silhouette, ses interactions et ses textes, et retravailler ce qui ressemble trop à une référence. Conserver la provenance et les droits d'utilisation des assets. Les récompenses valorisent l'effort et les progrès, sans pénalité pour une journée manquée ni pression à prolonger la séance.

Cette décision guide la conception ; elle ne constitue pas un audit juridique des écrans existants ni une garantie avant commercialisation.

État du 9 octobre 2026 : avatar (quatre couleurs), collection de trois écussons et carnet de progrès. Une mission terminée attribue un crédit cadeau, indépendamment des erreurs et de la vitesse. Les anciens objets et créations restent consultables comme souvenirs.

## Contrats

src/monde.ts reçoit une connexion SQLite explicite. GET /api/monde lit le profil identifié par le serveur. POST /api/monde/actions accepte uniquement avatar et debloquer (écussons), avec un corps strict. Version, UUID et signature protègent des conflits et répétitions. Achats et attributions sont transactionnels.

Les champs historiques du jardin et de la cuisine restent conservés dans le JSON, sans être exposés ni modifiables par les commandes. Les prix historiques restent nécessaires au calcul du solde. Les migrations SQL historiques sont conservées. La migration 6 ajoute le retrait réversible (archivee) et la notion pédagogique des nouvelles missions.

Le parcours affiche le total historique, les questions distinctes essayées, les huit dernières missions terminées dans l’ordre chronologique et les étapes antérieures dans un volet. Il propose une mission encore jouable. Les missions retirées restent dans l’historique ; les détails supprimés avant cette version ne sont pas reconstruits. Un volet à consulter avec le parent donne les réussites au premier essai et après nouvel essai par mission, sans inférer la maîtrise. Ce volet est dans l’espace enfant, pas dans un compte parent séparé.

## Modules et vérifications

public/espace-personnel.js contient les écrans et commandes, milo.js le personnage, monde-art.js les illustrations encore utilisées. Les styles sont dans monde.css et espace-personnel.css. monde-mouvement.js conserve la préférence calme. Les anciennes routes jardin/cuisine ouvrent l’avatar. Aucune génération audio ou LLM supplémentaire.

npm run verify teste notamment droits, soldes, isolation, répétitions, conflits, reprise SQLite, conservation des données historiques, rollback et refus des anciennes actions HTTP.

## Archives

Les ateliers sont retirés du code actif et récupérables dans le tag archive/avant-nettoyage-ateliers-2026-10-09. Pour les examiner séparément :

    git worktree add --detach ../lumo-archive archive/avant-nettoyage-ateliers-2026-10-09

Les bases et secrets ne sont pas dans Git. Sauvegarde : npm run backup. Restauration : voir EXPLOITATION.md. Les limites avant production restent décrites dans ARCHITECTURE.md.

Le service src/parcours.ts est partagé par l’espace enfant et le bilan MCP parent (parcours_complet, historique complet distinct de la période demandée). Les nouvelles notions sont conservées ; les anciennes missions sans notion utilisent leur titre, sans attribution inventée. scripts/test-parcours.ts vérifie les compteurs, l’isolation et le refus de jouer/répondre/terminer une mission retirée.

## Rendez-vous avec Milo (12 octobre 2026)

Migration 8 : un objectif de 2, 3 ou 4 jours de pratique par semaine (3 par défaut), un journal d'une séance maximum par enfant et jour civil et l'objectif de chaque semaine. Le fuseau est celui de Lumo, Europe/Brussels par défaut ; la semaine commence le lundi. Une mission initiale ou une révision terminée inscrit la journée dans la même transaction. Reposter la fin d'une ancienne mission un autre jour ne crée pas de séance. Il n'y a ni récompense hebdomadaire supplémentaire ni perte de progrès pour un jour manqué.

Changer le rythme conserve les séances de la semaine courante et la préférence pour les suivantes. Les anciens objectifs restent conservés ; le changement est versionné et les UUID empêchent les doubles modifications. Les journées historiques sont reprises à partir des missions terminées dont la date est connue, sans inventer les dates manquantes. Les semaines passées restent en base ; les huit dernières semaines de pratique sont consultables dans « Mes ciels précédents ».

La constellation apparaît sur la carte et dans le bilan de fin. « Choisir le rythme avec un parent » est une invitation à choisir ensemble dans le prototype, pas une authentification adulte. Le contrôle des droits parent devra être intégré avant un pilote réel. Les anciens compteurs de soirées restent conservés pour compatibilité, sans indicateur de série quotidienne sur la carte.

`src/rendez-vous.ts` contient le calendrier et les opérations testables ; `public/rendez-vous.js` et `.css` contiennent la vue et le choix du rythme. `test-rendez-vous.ts` couvre journées manquées, changement de semaine, fuseau et heure d'hiver, conflits, retries, conservation historique et migration d'une base remplie. Les tests HTTP vérifient les accès croisés entre familles.

## Carte et révisions (12 octobre 2026)

Avant test famille : après publication, le lien parent propose le code destinataire dans un fragment URL et le retire aussitôt de la barre d'adresse. L'enfant ou le parent confirme le code ; un lien ne remplace pas automatiquement le profil mémorisé. Le code est vérifié avant stockage, et une annulation ou erreur conserve l'ancien profil. La carte indique le prénom et le code actif pour distinguer les profils homonymes.

La fin de séance utilise Milo et une illustration originale. Elle montre les questions travaillées et le crédit cadeau attribué (ou la conservation du résultat d'un entraînement), puis les réussites au premier essai. Le bilan vient des réponses enregistrées côté serveur, y compris après interruption ; il ne s'agit pas d'un score de maîtrise. La longue cinématique et la modale automatique de niveau sont retirées. Un retour aux missions permet de terminer la séance ; le choix du cadeau est facultatif.

Ordre des prochains essais : vérifier une photo et son niveau scolaire avec le parent ; suivre la validation et l'accès au bon profil ; observer une petite mission sans aider immédiatement ; vérifier la compréhension du bilan et la possibilité d'arrêter ; noter les difficultés avant d'ajouter des fonctionnalités. Le tutoriel, les droits adultes, l'hébergement stable et la confidentialité restent à finaliser avant un pilote avec données réelles.

La carte principale conserve toutes les missions initiales non archivées, terminées comprises. Toucher une étape terminée ouvre « Tout refaire » ou une révision ciblée sur les questions non réussies au premier essai au dernier passage terminé. Si le dernier passage était ciblé, ce choix porte sur ce passage partiel, pas sur une évaluation complète de la notion.

Migration 7 : les passages de révision sont liés à la mission initiale, avec leurs propres questions et réponses. Un seul passage actif par mission ; les UUID de démarrage restent idempotents après la fin. Une révision peut être interrompue puis reprise. Les étoiles globales, cadeaux, niveaux et compteurs de missions ne sont pas augmentés. Le suivi distingue premier passage et entraînements. Les missions retirées et leurs révisions restent inaccessibles au jeu.

POST /api/quetes/:id/revision accepte un mode (tout/cible) et un UUID. GET retourne les choix disponibles sans démarrer un passage. Les droits restent ceux du profil identifié. Les tests test-revisions.ts couvrent conservation, isolation, absence de récompenses, sélection ciblée et répétitions concurrentes.
