> Parcours actif (9 octobre 2026) : jardin et cuisine mis en pause, sans suppression des données. L’entrée « Mon espace » ouvre désormais un avatar (4 couleurs et écusson), une collection de 3 écussons et un carnet des missions. Les créations et objets précédents sont conservés en souvenirs. Les descriptions des ateliers ci-dessous documentent le module conservé, hors navigation.

# Le monde enfant — jardin et cuisine

Version du 9 octobre 2026. Implémentation du premier duo ; refuge, robot et observatoire restent des projets futurs.

## Identité visuelle

Conserver celle du jeu existant : Milo réutilisé via `pipSvg`, Fredoka/Nunito, violet, orange, vert et bleu, formes vectorielles arrondies. Le décor prolonge le jardin des missions : mêmes fleurs, papillons et nuages. Aucun décor photoréaliste, aucune nouvelle marque.

Le monde est accessible depuis « Mon petit monde » / « Mon monde » sur l'accueil. Le fragment `#mon-monde/jardin` ouvre directement le jardin après connexion ; les quatre lieux sont conservés au rechargement.

## Parcours disponible

- Douze emplacements en quatre rangées, deux cultures accessibles dès l’arrivée : fraises et carottes.
- Planter → arroser → attendre la pousse → récolter deux ingrédients directement dans le potager. Sachets et arrosoir se sélectionnent puis s’appliquent au clic/clavier, ou se glissent sur les plantes. Animation du sachet, des graines, de l’arrosoir, des gouttes, de la pousse et du fruit vers le panier ; Milo réagit avec des mouvements articulés. Aucun mouvement décoratif permanent dans le potager.
- Quatre recettes, dont deux accessibles immédiatement. Pain, farine et crème sont disponibles sans stock à gérer ; les récoltes sont consommées au début de la recette.
- Une préparation à la fois : déposer les ingrédients, valider leur réservation, mélanger avec un mouvement circulaire ou trois appuis, puis décorer librement. La tartine utilise un geste d'assemblage.
- Jusqu'à douze motifs (fleurs, étoiles, cœurs) placés librement, avec annulation du dernier geste et placement accessible au clavier. « Servir à Milo » enregistre le dessert et ouvre la scène du goûter.
- Un carnet de douze familles recette/décoration : refaire une famille augmente son compteur et conserve sa dernière composition ; les autres familles sont préservées. Les anciennes créations sans motifs libres restent lisibles.
- Le panier mène à la cuisine, qui permet de reprendre une préparation. Chaque action terminée est sauvegardée. Quitter le jardin pendant une animation annule le geste avant envoi ; une commande déjà envoyée garde son UUID en cas de reprise réseau.
- Quatre cadeaux au choix : graines de tomate, graines de citrouille, guirlande, fontaine. Chaque cadeau coûte une attribution obtenue en terminant une quête ; choisir un objectif est gratuit et réversible.
- Les cultures et recettes débloquées restent accessibles. Les décorations peuvent être installées ou rangées. L'ambiance matin/soir est sauvegardée.
- Croissance en huit minutes après le premier arrosage (rythme provisoire à éprouver). Elle continue hors connexion, sans plante qui meurt ni perte pendant les absences. Arroser de nouveau joue une animation sans modifier ni accélérer l’échéance.

Le cadeau récompense la fin de mission, y compris après deux essais accompagnés. Le score et la vitesse ne modifient pas son montant. Une ancienne quête supprimée ne retire pas ses cadeaux. Quand les quatre cadeaux sont acquis, les attributions suivantes sont conservées, sans inventer de nouvelles récompenses non implémentées.

## Contrats et stockage

- `src/monde.ts` : catalogue, schémas des commandes et de l'état, règles transactionnelles. La connexion SQLite est passée explicitement.
- `GET /api/monde` : état du profil identifié par le serveur, inventaire, solde et catalogue.
- `POST /api/monde/actions` : action validée, UUID de requête et version attendue. Aucun identifiant de famille/enfant, solde ou stock n'est accepté dans le corps.
- `monde_etats` : état JSON borné (douze parcelles, quatre stocks plafonnés à 99, douze créations, une préparation) et version.
- `monde_attributions` : registre unique par enfant et source. Les nouvelles missions ont une clé aléatoire durable ; un numéro SQLite réutilisé après suppression ne bloque pas une future attribution.
- `monde_deblocages` : inventaire persistant, une ligne unique par enfant/objet.
- `monde_commandes` : protection des retries par UUID et signature ; historique récent borné. Les requêtes anciennes sortant de cet historique sont refusées par leur version.

La validation d'une quête, son compteur et son attribution sont dans la même transaction. Débloquer un cadeau vérifie le solde et inscrit l'objet dans une transaction. Cuisiner réserve les ingrédients et crée la préparation dans une transaction. Un conflit de version produit HTTP 409 et une relecture du monde ; l'interface ne rejoue pas silencieusement un geste devenu obsolète.

Les migrations 4 et 5 conservent les compteurs précédents, attribuent leur équivalent dans le nouveau registre et préservent jusqu'à douze anciens objets dans « Mes souvenirs ». Le monde ne dépend pas du stockage local du navigateur. Seule la préférence de mouvements calmes est locale, initialisée depuis le réglage système.

La croissance utilise `arrose_le` et `mure_le` fixés par le serveur. Les GET retournent `heure_serveur` et `duree_pousse_ms` ; aucune date fournie par le client n’est acceptée. La maturité est dérivée à la lecture, sans tâche planifiée ni écriture périodique. Le navigateur affiche les étapes à partir d’une horloge monotone et redemande l’état à maturité, au retour dans l’onglet et au retour du réseau. Une lecture ne relance pas une commande. Les trois anciennes parcelles sont étendues à douze en conservant leurs indices ; une ancienne plante déjà arrosée, sans échéance, est mûre immédiatement. L’ancienne commande `soigner` ne permet plus de contourner la pousse.

## Interface et audio

`public/monde.js` contient l’écran isolé et les commandes réseau ; `monde-potager.js` la scène du jardin ; `monde-jeux.js` les ateliers de cuisine ; `monde-gestes.js` le glisser-déposer partagé ; `monde-mouvement.js` les animations annulables et la préférence calme ; `milo.js` le personnage commun ; `monde-art.js` et `potager-art.js` les dessins SVG ; `monde.css` et `potager.css` les styles. L'application existante fournit navigation, connexion, sons et dessin de Milo. Les textes reçus du serveur sont échappés avant insertion HTML. Les motifs envoyés au serveur sont uniquement des formes énumérées et des coordonnées entières bornées ; aucun SVG/HTML arbitraire n'est accepté. L'ajout JSON optionnel reste compatible avec les données précédentes et ne nécessite pas de migration SQL.

Les boutons sont utilisables au clavier, les fenêtres utilisent `dialog`, les résultats disposent d'une zone de statut et les animations respectent `prefers-reduced-motion`. Les sons du jeu sont réutilisés. Ce monde ne commande aucune nouvelle synthèse ElevenLabs ou génération LLM.

## Vérifications

- `scripts/test-monde.ts` : cycle complet, stocks, accès aux cultures, isolation entre profils, reprise sur une autre connexion SQLite, requêtes répétées, conflits de version, erreur transactionnelle simulée, migration historique et suppression/réutilisation d'un numéro de quête.
- Croissance : tests aux bornes exactes de maturité, relecture dans une autre connexion SQLite, absence prolongée, double arrosage/retry tardif, rejet des dates client et extension des anciennes sauvegardes à douze emplacements.
- Ateliers : dessin personnalisé conservé après réouverture SQLite, rejet des coordonnées invalides, propriétés inconnues et compositions de plus de douze motifs, compatibilité des anciens desserts. Parcours navigateur complet du sachet au carnet, gestes de glissement et reprise au clavier, annulation d'un motif, rechargement pendant la préparation et après le service.
- `scripts/test-mcp-distant.ts` : API du monde authentifiée, corps strict, refus d'un enfant fourni par le client, double requête HTTP concurrente et isolation entre familles.
- Nouveau potager, profil fictif séparé : plantation et arrosage par glissement, maturité automatique après une échéance de test, récolte unique au clavier, mode calme, annulation par navigation pendant un geste et accès à l’atelier de cuisine. Formats 375 × 812, 768 × 1024 et bureau 1280 × 720 contrôlés sans débordement horizontal. Les gestes, ingrédients et créations de cuisine avaient également été vérifiés avant cette évolution.

Ce premier duo reste à éprouver avec les enfants : compréhension sans aide, plaisir des gestes, lisibilité et équilibre entre apprentissages et jeu libre. Il ne rend pas l'application prête à commercialiser ; les prérequis de comptes, données et hébergement de l'audit restent valables.

Installation locale : sauvegarde vérifiée avant migration ; comparaison après redémarrage des profils, quêtes, compteurs et nombre de réponses, tous conservés. Aucun service de partage public relancé.
