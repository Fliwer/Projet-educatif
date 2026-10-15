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

Avant chaque mission, un écran « Avant de commencer » présente le rappel `resume` préparé par l’assistant et les règles des jeux. L’enfant peut l’écouter et le rouvrir depuis « Mes petits repères » sans perdre sa réponse. Chaque question peut fournir `indice`, `aide` et `explication` : l’indice est proposé dès la première erreur, l’aide guidée reste disponible sur demande, et l’explication accompagne la correction seulement après réussite ou au deuxième essai. Le parent relit ces contenus dans le brouillon. Ils sont conservés dans les révisions. Les anciennes missions sans ces champs gardent des conseils de manipulation, sans résumé de leçon inventé. `node scripts/test-accompagnement.ts` vérifie ce circuit sur une base temporaire.

L'espace `/parent` propose un accueil avec bilan des 7 derniers jours, les missions filtrables, un suivi par matière et notion (7 jours, 30 jours ou historique), la préparation d'une leçon et la gestion des profils. L'année scolaire, le pays et les aides sont enregistrés une seule fois dans le profil puis repris dans les demandes. Les premiers essais, corrections, questions à revoir et reprises comparables sont distingués sans déduire de maîtrise scolaire ni d'autonomie. Les notes facultatives de ressenti et d'accompagnement restent dans le navigateur, séparées des résultats. Le suivi est limité à la famille de démonstration sur le PC local ; les accès par partage ou proxy affichent un aperçu sans données de famille. Les comptes parents authentifiés à distance restent à construire.

La préparation accepte un aperçu photo local, sans envoi ni conservation après fermeture de la page. Le parent joint aussi la photo dans son assistant connecté. Lumo reçoit le contenu des exercices et l'extrait proposé ; il ne vérifie pas automatiquement la fidélité à la photo. La liste des brouillons conserve uniquement les liens ouverts dans ce navigateur, jusqu'à leur expiration.

Le premier pilote retient le parcours « photo dans l’assistant connecté → brouillon Lumo → validation parent ». Le guide et le message sont accessibles sans sélectionner une photo dans Lumo ; l’aperçu local est facultatif. Si le navigateur n’a pas accès au profil ou si les repères scolaires manquent, l’assistant doit demander le profil, la classe et le pays sans les inventer. La voie d’analyse directe par API a été retirée. L’invitation actuelle décrit la connexion Claude ; l’installation réelle sur un compte testeur et la connexion distante ChatGPT restent à valider. Un lien stable et des comptes adultes isolés restent nécessaires avant de promettre un espace parent distant complet.

Après sélection, le décodage local affiche l’aperçu, les dimensions et un bouton pour continuer. Les fichiers vides, les formats non acceptés, les fichiers de plus de 12 Mo et les images impossibles à ouvrir ont un message d’erreur. Une petite résolution déclenche seulement un conseil, sans conclure à une mauvaise lisibilité. La reconnaissance du contenu et du flou reste confiée à l’assistant : le message préparé et les consignes pédagogiques demandent une nouvelle photo ou une clarification avant tout brouillon si le support nécessaire manque. Une plante ou un objet n’est pas automatiquement rejeté : un objectif de sciences peut être précisé. Ces instructions ne sont pas une validation automatique par le serveur.

Les exercices de géométrie acceptent désormais une `illustration` décrivant des polygones par leurs coordonnées. Le jeu `figures` permet d'entourer plusieurs formes ; le jeu `diagonales` permet de relier les sommets au toucher ou au clavier, d'effacer et de recommencer. Les côtés égaux, les angles droits et les propriétés des diagonales sont dessinés avec leurs codes. Après deux essais, la correction est montrée sur le dessin. Les supports sont conservés dans les reprises et apparaissent aussi dans l'aperçu parent.

`node scripts/preparer-quadrilateres-visuels.mjs` adapte la fiche de quadrilatères pour Arthur en 6e primaire. Les missions sans tentative sont mises à jour ; celles déjà commencées sont archivées avec leur historique et remplacées. `node scripts/test-geometrie.ts` vérifie le contrat et les données. Le test navigateur `node scripts/test-geometrie-ui.mjs` utilise une base temporaire ; au besoin, `LUMO_PLAYWRIGHT_PACKAGE` indique le dossier du paquet Playwright. Ses captures sont dans `data/apercu-geometrie`.

## Univers de l’enfant

« Mon univers » propose trois aventures : l’expédition des étoiles (station, serre lunaire, planète), le royaume de Milo (village, jardin, tour) et le jardin des découvertes (graines, potager, prairie). Chaque lieu est lié à une mission existante ; son état exploré vient de la fin de cette mission, sans nouvelle récompense ni remise à zéro au changement d’univers. Les exercices, leur lecture guidée et les résultats restent les mêmes. Les lieux et les décors du parcours suivent le choix. Le décor de mission suit l’aventure choisie : fusée, construction du château de Milo ou jardin qui fleurit.

Le choix est enregistré par enfant dans `monde_etats.donnees.aventure`, via une action versionnée et idempotente. Les anciens profils commencent dans l’espace. L’ancien champ `enfants.univers` est conservé pour la compatibilité des connexions existantes.

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

Copier `.env.example` en `.env` et renseigner les réglages privés. Les fichiers existants sont relus sans nouvelle génération. Une phrase Milo absente est signalée. Pour activer volontairement la génération locale : `LUMO_VOIX_GENERATION=1`, clé ElevenLabs et plafond quotidien de caractères. Le mode partagé interdit toujours les nouvelles générations payantes.

Tout le parcours utilise les enregistrements Milo : accueil, pauses, encouragements, consignes, dictées et fin de mission. Aucune voix du navigateur ne remplace un enregistrement manquant. Aucun fonctionnement entièrement hors ligne n'est garanti. Le plafond de caractères n'est pas un solde de crédits ni une facture.

La lecture guidée surligne la consigne au rythme de Milo. Les calculs suivent leurs morceaux audio ; les phrases suivent les mots lorsque leurs repères sont préparés. Sans repères, la phrase entière est mise en évidence. Le bouton « Surlignage » permet de désactiver cette aide. Le mot caché d'une dictée n'est jamais affiché. Les pauses, les erreurs et les changements d'écran arrêtent le surlignage.

Les nouvelles générations demandent l'audio et ses timings dans le même appel Text to Speech. Les anciens fichiers restent réutilisés ; leur alignement peut être préparé séparément. Les 11 consignes non calculatoires des trois missions d'Arthur ont été alignées le 14 octobre 2026 sans régénérer leur voix.

`node scripts/preparer-surlignage-milo.mjs --aligner` prépare une fois les repères des consignes déjà enregistrées pour Arthur fictif (20 consignes au maximum). Cette analyse ElevenLabs nécessite le droit `forced_alignment` et peut consommer des crédits ; elle ne régénère pas la voix. Le jeu lit uniquement les repères locaux, sans appel d'analyse externe. Les repères sont invalidés lorsque le fichier audio change.

## Partage et données

`Partager le jeu.cmd` expose une base fictive indépendante via un tunnel temporaire. `Arrêter le partage.cmd` coupe ce partage. Le PC doit rester allumé ; un nouveau tunnel change d'adresse. Les visiteurs utilisant `LUMO01` partagent le profil fictif.

Ne pas partager `.env`, `data/` ou les fichiers de connexion. Avant un pilote réel, traiter les points bloquants de l'audit : authentification et sessions, invitations et droits professionnels, données personnelles, hébergement permanent, sauvegardes externes et surveillance.
