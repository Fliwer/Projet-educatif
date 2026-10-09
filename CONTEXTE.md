# Contexte Lumo

Mis à jour le 9 octobre 2026.

Lumo transforme des leçons en exercices pour les enfants du primaire (6 à 12 ans), avec Milo comme compagnon. Le parent transmet sa photo à son assistant connecté par MCP ; celui-ci prépare un brouillon à vérifier et valider avant publication. Lumo reçoit les exercices, pas la photo originale.

## Périmètre actuel

Prototype local avec données fictives, Node.js/TypeScript, SQLite, frontend JavaScript et MCP local ou distant. Exercices, tentatives, récompenses et avatar sont persistés côté serveur. Les voix déjà générées sont réutilisées ; la génération payante est désactivée par défaut.

L’espace personnel comprend un avatar, trois écussons et un carnet de progrès. Jardin et cuisine sont retirés du code actif ; leurs données et souvenirs sont conservés. Leur code est disponible dans le tag Git archive/avant-nettoyage-ateliers-2026-10-09.

## Direction produit

Priorité aux exercices et au suivi des apprentissages. Adapter lecture et aide aux âges sans déduire de diagnostic des erreurs. Prévoir parents, enfants et professionnels : logopèdes et professionnels du soin d’abord, enseignants et écoles ensuite. Les tarifs restent indépendants des permissions.

Comptes réels, invitations, autorisations professionnelles et hébergement permanent restent à construire. Le prototype n’est pas prêt pour une commercialisation.

## Références

- README.md : installation et parcours.
- docs/ARCHITECTURE.md : structure et limites.
- docs/MONDE-ENFANT.md : espace personnel et archives.
- docs/EXPLOITATION.md : sauvegarde et restauration.
- docs/AUDIT-2026-10-09.md : audit historique à cette date.

npm run verify lance les contrôles et tests ; npm run backup sauvegarde la base. Données et secrets restent hors Git. Les documents du tag décrivent l’état archivé, pas le périmètre actif.
