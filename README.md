# Lumo — prototype renforcé

Jeu éducatif avec Milo, connecteur MCP et validation parentale. **Données fictives uniquement** : les vrais comptes, les accès professionnels et l'hébergement de production restent à construire.

## Documents de référence

- [Audit du 9 octobre 2026](docs/AUDIT-2026-10-09.md) : défauts corrigés, preuves et risques ouverts.
- [Architecture](docs/ARCHITECTURE.md) : parents, enfants, professionnels du soin puis enseignants/écoles, offres indépendantes des permissions.
- [Exploitation](docs/EXPLOITATION.md) : configuration, sauvegarde, restauration et démarrage.
- [Monde enfant](docs/MONDE-ENFANT.md) : avatar, collection, progrès et archives.

## Parcours

1. Le parent transmet une leçon à son assistant connecté par MCP.
2. L'assistant prépare un brouillon de 1 à 3 quêtes, chacune de 5 à 8 questions, avec notion et extrait de leçon.
3. Le parent ouvre l'aperçu, vérifie et valide. Les transports MCP local et distant suivent ce même circuit.
4. L'enfant joue. Les essais et la progression sont conservés côté serveur ; après deux essais, Milo aide à avancer.
5. Chaque mission terminée donne un crédit cadeau : avatar personnalisable, écussons et carnet de progrès.
6. Le parent consulte le bilan via le connecteur.

La photo reste dans l'assistant. Lumo reçoit le contenu des exercices et l'extrait proposé ; il ne vérifie pas automatiquement la fidélité à la photo.

## Installation et contrôles

Node.js 24.13 ou plus récent de la branche 24 recommandée ; les tests utilisent Node 24.

```powershell
npm ci
npm run verify
npm start
```

- Jeu local : http://localhost:4321 — Arthur fictif, code `LUMO01`.
- `node scripts/demo.ts` ajoute deux quêtes fictives. Le script est additif : ne pas le relancer pour chaque démarrage.
- `npm run backup` crée et vérifie une sauvegarde de la base sélectionnée.
- `pwsh -NoProfile -File scripts/test-lancement.ps1` vérifie le lanceur Windows sur une base séparée.

`npm run verify` vérifie les types, le formatage et la syntaxe, puis teste métier, MCP local/distant, audio simulé et sauvegarde/restauration. `npm run format` applique le style commun. Aucun test n'appelle réellement ElevenLabs. Les tests n'effacent pas la base locale.

## Connecteurs

- `src/mcp.ts` : stdio local, accès au parent local, prépare des brouillons. Le serveur Web doit être lancé pour les valider.
- `POST /mcp` : transport HTTP JSON activé par `LUMO_MCP_ACTIF=1`, clé privée d'un parent obligatoire.
- `src/mcp-client.ts fichier-prive.env` : relais stdio vers le MCP distant, compatible avec les clients qui lancent des commandes.
- `node scripts/preparer-parent.ts demo https://adresse-du-jeu` : crée une connexion fictive séparée et écrit sa clé dans un fichier privé sous le dossier de données.
- `node scripts/revoquer-parent.ts ID` : révoque une connexion distante et ses brouillons en attente dans la base sélectionnée.

Les installateurs Claude préservent la configuration existante ; fermer Claude complètement avant de les lancer. Chaque client MCP nécessite sa configuration locale. Le relais distant dépend du serveur et du tunnel ; l'existence d'une entrée ne garantit pas leur disponibilité.

## Voix

Copier `.env.example` en `.env` et renseigner les réglages privés. Les fichiers existants sont relus sans nouvelle génération. Une phrase absente utilise la voix de l'appareil par défaut. Pour activer volontairement la génération locale : `LUMO_VOIX_GENERATION=1`, clé ElevenLabs et plafond quotidien de caractères. Le mode partagé interdit toujours les nouvelles générations payantes.

La voix de l'appareil peut varier et être fournie par un service distant. Aucun fonctionnement entièrement hors ligne n'est garanti. Le plafond de caractères n'est pas un solde de crédits ni une facture.

## Partage et données

`Partager le jeu.cmd` expose une base fictive indépendante via un tunnel temporaire. `Arrêter le partage.cmd` coupe ce partage. Le PC doit rester allumé ; un nouveau tunnel change d'adresse. Les visiteurs utilisant `LUMO01` partagent le profil fictif.

Ne pas partager `.env`, `data/` ou les fichiers de connexion. Avant un pilote réel, traiter les points bloquants de l'audit : authentification et sessions, invitations et droits professionnels, données personnelles, hébergement permanent, sauvegardes externes et surveillance.
