> Parcours actif (9 octobre 2026) : jardin et cuisine mis en pause, sans suppression des données. L’entrée « Mon espace » ouvre désormais un avatar (4 couleurs et écusson), une collection de 3 écussons et un carnet des missions. Les créations et objets précédents sont conservés en souvenirs. Les descriptions des ateliers ci-dessous documentent le module conservé, hors navigation.

# CONTEXTE du projet Lumo (à lire en premier)

> Ce fichier résume tout ce qu'il faut savoir pour continuer le projet, que ce soit une personne ou une IA
> (Claude, ChatGPT…). **Si tu es une IA : lis tout ce fichier avant de modifier le code, respecte les
> « Règles d'or », et lance `npm test` après chaque modification.**
>
> Dernière mise à jour : 9 octobre 2026.

---

## État après audit du 9 octobre 2026

Les documents de référence actuels sont [docs/AUDIT-2026-10-09.md](docs/AUDIT-2026-10-09.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et [docs/EXPLOITATION.md](docs/EXPLOITATION.md). Ils précisent les changements et limites actuels ; les sections historiques ci-dessous décrivent aussi les étapes antérieures du prototype.

- MCP local et distant : brouillon puis validation Web obligatoire.
- Essais, reprise et récompenses contrôlés côté serveur ; corrections dévoilées au moment prévu.
- TypeScript strict, migrations versionnées et sauvegardes vérifiées. `npm run verify` est le contrôle de référence.
- Génération payante de voix désactivée par défaut ; cache conservé, budget quotidien en cas d’activation.
- Priorité professionnelle : logopèdes/soin d’abord ; enseignants/écoles ensuite. Les droits restent séparés des tarifs.
- Le monde enfant jardin/cuisine et son inventaire serveur sont implémentés : voir [docs/MONDE-ENFANT.md](docs/MONDE-ENFANT.md). L'identité visuelle reste celle de Lumo : Milo, violet et couleurs vives, illustrations SVG arrondies. Les anciens objets restent dans les souvenirs. Refuge, robot et observatoire sont futurs. L’exercice « Le loup et la clé » a été retiré.
- Le parcours « Le goûter de Milo » propose désormais des ateliers gestuels jardin/cuisine (glisser ou cliquer), des motifs placés librement sur le dessert et une scène de goûter. Les étapes validées et la dernière composition de chaque famille de recette sont sauvegardées ; les gestes partiels restent locaux à l'atelier.

## 1. Le projet en bref

**Lumo** (nom provisoire, voir §9) est une app de devoirs et de leçons **gamifiée pour les enfants de 6 à 12 ans
avec un TDAH**.

**La boucle principale :**
1. Le **parent prend en photo** les devoirs ou la leçon.
2. Un **LLM** (Claude) crée des **exercices-jeux adaptés** à cette leçon.
3. Le **parent valide** les exercices (jamais d'envoi sans validation).
4. L'**enfant joue** sur une tablette (app web installable, PWA).
5. Le **parent voit les progrès** (ce qui est réussi, ce qui est difficile).

**Promesse du projet :** accompagner les apprentissages sans jugement.
L’objectif est un produit commercial avec une expérience soignée.

---

## 2. Règles d'or (à ne jamais casser)

1. **L'enfant n'est jamais jugé.**
   - Pas de rouge.
   - Pas de note.
   - Pas de mot « faux » ni « raté ».
   - Pas de « série perdue ».
   - Une erreur s'affiche en **violet doux**, avec Milo qui encourage.
   - Une question ratée revient plus tard (« Pas grave ! On la refera tout à l'heure. »).
   - Au 2e essai raté, Milo donne la réponse avec douceur (« Maintenant tu la connais ! »).
   - Les statistiques « réussi du premier coup » sont **réservées au parent**.
2. **Pensé pour le TDAH.**
   - Une seule notion par quête, 5 à 8 questions.
   - Consignes très courtes, lues à voix haute.
   - Récompense immédiate (étoile, pièce de fusée, confettis).
   - Visites courtes (la chambre se « ferme » après 3 minutes).
   - Varier les types de jeux.
3. **Pensé pour la dyslexie.**
   - Gros textes, polices rondes (Fredoka, Nunito Sans).
   - Lecture à voix haute.
   - Éviter les lettres miroirs **b, d, p, q** dans les noms de marque.
4. **Le parent valide toujours** les exercices créés par l'IA avant qu'ils arrivent à l'enfant.
5. **Données sensibles** (TDAH = donnée de santé, RGPD) : prénom ou pseudonyme seulement, jamais de nom de
   famille, aucune vraie donnée d'enfant dans le prototype (Arthur est fictif).
6. **La tablette ne reçoit jamais les bonnes réponses.** Seule exception : le mot de la dictée (`a_dire`), pour que
   Milo puisse le dire. Il n'est jamais affiché.
7. **Les clés secrètes restent dans `.env`.** Ne jamais les mettre dans le code, dans un chat ou dans Git.
8. **Langue :** tout est en **français** (code, noms de variables, commentaires, textes de l'app).
   Phrases courtes et concrètes.

---

## 3. Lancer le projet

Il faut **Node.js 24 ou plus récent**. Il exécute directement les fichiers `.ts` et fournit `node:sqlite`.

```bash
cd lumo-prototype
npm install
npm start            # app enfant sur http://localhost:4321 (et sur le Wi-Fi local)
# Sous Windows, sans terminal : icône « Lumo » du Bureau (scripts/lancer-lumo.vbs)
npm run verify       # types, syntaxe et suites de comportement isolées
node scripts/demo.ts # ajoute 2 quêtes de démo pour Arthur (code LUMO01)
node scripts/suivi.ts # affiche la progression d'Arthur (vue parent)
```

- **Code de démo :** `LUMO01` (Arthur, fictif, univers espace).
- **Brancher le connecteur à Claude Desktop :** quitter **complètement** Claude Desktop, double-cliquer
  `Installer le connecteur Claude.cmd`, puis relancer Claude Desktop.
  ⚠️ Si Claude Desktop est ouvert, il **réécrit** son fichier de réglages et efface le connecteur.

---

## 4. Architecture

```
Parent (photo) ──► Claude Desktop ──(MCP, stdio)──► src/mcp.ts ─┐
                                                                ├──► SQLite data/lumo.db (mode WAL)
Enfant (tablette) ──► public/ (PWA) ──(HTTP)──► src/web.ts ─────┘
                                       └──► /api/voix ──► src/voix.ts ──► ElevenLabs (+ cache data/voix/)
```

| Fichier | Rôle |
|---|---|
| `src/db.ts` | Base SQLite (tables `enfants`, `quetes`, `questions`, `reponses`). Crée Arthur si la base est vide. |
| `src/logic.ts` | **Toutes les règles** : quêtes, vérification des exercices, correction des réponses, niveaux, soirs d'affilée, étoiles, progression parent. |
| `src/mcp.ts` | Connecteur MCP (4 outils pour Claude) : `lister_enfants`, `ajouter_enfant`, `creer_quetes`, `voir_progression`. |
| `src/web.ts` | Serveur HTTP : fichiers de `public/` + API de l'app enfant. Lit `.env`. |
| `src/voix.ts` | Voix de Milo : ElevenLabs, cache disque, file d'attente (2 demandes à la fois), réessai automatique. |
| `public/index.html` | Page unique de l'app enfant. |
| `public/app.js` | Toute l'app enfant (JavaScript sans framework). |
| `public/style.css` | Tout le style (couleurs dans `:root`). |
| `public/essai-voix.html` | Page pour comparer des voix et des réglages. |
| `scripts/test-mcp.ts` | Les tests (connecteur + logique des jeux), sur une base séparée `data-test/`. |
| `scripts/demo.ts` | Quêtes de démonstration. |
| `scripts/installer-connecteur.mjs` | Ajoute le connecteur à Claude Desktop. |

**API de l'app enfant** (l'enfant est identifié par l'en-tête `X-Lumo-Code`, sinon réponse 401) :

| Méthode et chemin | Rôle |
|---|---|
| `GET /api/moi` | Accueil : prénom, univers, niveau, soirs, étoiles, quêtes du soir |
| `GET /api/quetes/:id` | Questions d'une quête (sans les réponses) |
| `POST /api/reponses` `{question_id, valeur}` | Renvoie `{correcte, presque, bonne_reponse}` |
| `POST /api/quetes/:id/terminer` | Renvoie niveau, soirs, `nouveau_niveau` |
| `POST /api/voix` `{texte, voix?}` | Renvoie le mp3 de la phrase (503 si la voix n'est pas configurée) |

---

## 5. Les 6 types de jeux

Ils sont définis dans `TYPES_QUESTION` (`src/logic.ts`). L'IA les crée via l'outil MCP `creer_quetes`.

| Type | Champs donnés par l'IA | Ce que voit l'enfant | Correction |
|---|---|---|---|
| `choix` | `choix` (2 à 4), `bonne_reponse` | Tuiles à toucher | Majuscules et accents ignorés |
| `texte` | `bonne_reponse` | Champ à remplir | Idem (virgule = point) |
| `vrai_faux` | `bonne_reponse` = « Vrai » ou « Faux » | 2 grosses tuiles ✓ et ✗ | Idem |
| `ordre` | `elements` dans le **bon** ordre (2 à 8) | Morceaux mélangés à remettre dans l'ordre | Ordre exact |
| `associer` | `paires` [[gauche, droite]] (2 à 5) | 2 colonnes, chaque paire prend une couleur | Paires dans n'importe quel ordre |
| `dictee` | `bonne_reponse` = le mot (la consigne ne l'écrit pas) | Milo dit le mot, l'enfant l'écrit | **Les accents comptent** ; un accent oublié donne « Presque ! » |

En base de données : `questions.choix` garde les données du jeu en JSON, `questions.bonne` la réponse attendue.
Les morceaux et les paires sont séparés par `" ‖ "`. Le mélange se fait côté serveur, dans `questionPourEnfant`.

---

## 6. L'app enfant (public/app.js)

**Écrans :**
- **Code** : 6 cases, ciel étoilé.
- **Accueil** :
  - les pastilles (soirs d'affilée, étoiles, son) ;
  - Milo avec un bouton « Jouer » ;
  - les cartes niveau et « Ma chambre » ;
  - la carte de quêtes : une route avec un coffre au bout ;
  - la barre du bas « Mes quêtes » et « Ma chambre ».
- **Mission** : une scène (fusée qui se construit, ou jardin qui fleurit), Milo qui lit la consigne, le jeu, puis
  le bouton « Vérifier » et le bandeau du résultat.
- **Fin de mission** : un compte à rebours et le décollage (touche l'écran pour passer), puis l'écran de victoire
  (étoiles, soirs, cadeau, barre de niveau), puis la fenêtre « Nouveau niveau » si besoin.
- **Ma chambre** : un objet débloqué par quête finie (12 objets) ; un cadeau à ouvrir, puis l'objet à poser dans la
  chambre ; l'ombre du prochain objet ; visite courte (3 minutes).

**Milo, le compagnon** (nom provisoire, voir §9) :
- une petite luciole violette avec une lumière sur la tête ;
- 5 humeurs : `content`, `joie`, `encourage`, `surpris`, `dort` (`pipSvg(humeur, taille)`, `pipHumeur()`) ;
- **ses lèvres bougent selon le volume réel de la voix** (`animerBouche`, analyseur WebAudio).

**Effets :**
- sons doux générés par le navigateur (aucun fichier audio) ;
- confettis, étincelles, une étoile qui vole jusqu'au compteur ;
- vibrations ;
- `prefers-reduced-motion` est respecté.

**Style :**
- icônes SVG dessinées (objet `ICONES`, pas d'émojis) ;
- couleurs principales : violet `#7B65BD`, vert `#34C77B`, or `#FFC83D`, orange `#FF9F1C` ;
- erreur = violet clair (**jamais de rouge**).

---

## 7. La voix (ElevenLabs)

- **Réglages dans `.env`** (modèle : `.env.example`) : `ELEVENLABS_API_KEY` et `ELEVENLABS_VOIX`
  (voix actuelle : `W1ou7G9XfVBPXpeVMKAw`, créée par Paul avec Voice Design). `ELEVENLABS_VOIX_ESSAI` liste les voix
  de la page d'essai.
- **Réglage C** : la voix est jouée à **+10 %** (`REGLAGE_VOIX = 1.1`, sans garder la hauteur), pour un effet
  « petit personnage ».
- **Chaque phrase n'est fabriquée qu'une fois**, puis gardée dans `data/voix/`. Une phrase déjà dite est gratuite.
- **Milo parle en morceaux réutilisables** : `parler([titre, detail])`. Les calculs « 7 × 8 = ? » sont assemblés
  à partir de morceaux déjà enregistrés (nombres de 0 à 100, « fois », « plus »…). Toutes les tables sont gratuites.
- **Tout préparer d'avance :** dans la console du navigateur, sur l'app, taper `await lumoPreparerVoix()`
  (environ 2 600 caractères, à faire une seule fois par voix).
- **Limites du compte gratuit ElevenLabs :**
  - environ 10 000 caractères par mois ;
  - **pas de voix de la bibliothèque par l'API** (seulement les voix créées par Paul ou les voix de base) ;
  - **2 demandes à la fois** (d'où la file d'attente dans `voix.ts`).
- La clé n'a que la permission « Text to Speech » : c'est voulu.
- **Sans clé ou sans internet**, Milo utilise la voix de la tablette. L'app ne se bloque jamais.

---

## 8. Ce qui est fait et ce qui reste (MVP en 2 semaines, depuis le 8 octobre 2026)

| Étape | État |
|---|---|
| App enfant v3 (design pro, Milo vivant, récompenses, Ma chambre) | ✅ fait |
| Voix ElevenLabs, cache, morceaux réutilisables, lèvres de Milo | ✅ fait |
| 6 types de jeux + tests | ✅ fait |
| Brancher Claude Desktop (connecteur installé et fonctionnel) | ✅ fait |
| Icône « Lumo » sur le Bureau (lancement sans terminal) | ✅ fait |
| Tester avec la photo d'un vrai devoir | 🔄 en cours |
| **Espace parent web** : progression, gestion des enfants, réglages, protégé par un code | ⏳ à faire |
| **Photo dans l'app** (option B) : le parent envoie la photo dans l'espace parent, le serveur appelle l'API Claude (ou OpenAI), le parent valide | ⏳ à faire, clé API à créer pour le projet |
| Nouveau nom partout (app + compagnon) | ⏳ dès que le nom est choisi |
| Premier lancement guidé pour l'enfant | ⏳ à faire |
| Mise en ligne pour des familles pilotes + bases RGPD (consentement, suppression des données) | ⏳ validation du cadre pilote nécessaire |
| Test avec 2 ou 3 familles, puis corrections | ⏳ |

---

## 9. Le nom (décision en cours)

- **« Lumo » ne peut pas être gardé pour vendre l'app.**
  - **Proton** (Proton Mail) a lancé un assistant IA « Lumo » en juillet 2025.
  - TMview montre environ 5 300 marques « lumo », dont beaucoup en classe 9 (logiciels), par exemple celle de NIO
    (marque internationale).
- **Écartés :** Kalimo (une marque de lingerie sort en premier sur Google), Zilou (personnage d'un podcast pour
  enfants de TotalEnergies, et marque ZILOU® au Benelux), Tiboo, Hopla, Hourra, Petit Pas, Zemio, LumoFocus, Nouki,
  Yakou, Amizo, Olani.
  Paul ne veut pas de « lou » dans le nom.
- **Candidats encore en lice :**
  - **Etinza** (comme « étincelle » ; .com, .app et .fr libres) ;
  - **Ozéli** (comme « oser » ; .app et .fr libres) ;
  - Kiwanzo et Mizolia (.com, .app et .fr libres).
- **Méthode de vérification :** recherche Google, puis TMview (classes 9, 41, 42 et 28, statut « Enregistrée » et
  « Déposée »), puis le .be sur dnsbelgium.be, puis un conseil en marques avant de déposer.
- Le compagnon s'appelle **Milo**, nom choisi par le parent le 9 octobre 2026 pour remplacer Pip. Les identifiants techniques `pip` restent inchangés ; les fichiers audio existants sont conservés.
- **Pour renommer :** chercher « Lumo » et « Milo » dans `public/`, `src/` et `README.md`. Les clés techniques
  (`lumo-code`, `X-Lumo-Code`, `LUMO_DATA`, `lumoPreparerVoix`) peuvent rester.

---

## 10. Pièges connus

- **Windows et Git Bash :** les chemins contiennent des espaces (« Projet educatif »), il faut les mettre entre
  guillemets.
- **Claude Desktop efface le connecteur** s'il est ouvert pendant la modification de sa configuration
  (voir §3).
- **Le son est bloqué par le navigateur** tant que l'enfant n'a pas touché l'écran une première fois. C'est normal.
- **`data/`, `data-test/` et `.env` ne doivent jamais être partagés** (ils sont dans `.gitignore`).
- **Après une modification de `src/` (serveur)**, il faut relancer `npm start`. Une modification de `public/`
  demande juste de recharger la page.
- **Tester toujours en format téléphone** (375 × 812) : c'est le format principal. Puis tester sur tablette.

## 11. Reprise avec Codex — 8 octobre 2026

- Le lanceur sonde désormais `127.0.0.1` sans proxy, démarre Node directement et empêche deux lancements simultanés. Les erreurs vont dans `data/serveur-erreurs.log`. Test Windows : 1,39 s au premier lancement, 0,36 s si le serveur tourne déjà (hors ouverture du navigateur).
- L'ancien raccourci pointait vers `Projet educatif`. Le script `scripts/reparer-raccourci.ps1` le redirige vers le dossier actuel.
- Correction de l'expression des calculs : « 7 × 8 = ? » utilise maintenant les morceaux audio réutilisables prévus.
- Les réglages du modèle de voix sont lus après le chargement de `.env`.
- Suivi disponible sur le PC dans `/suivi-voix.html` : cache, générations, demandes et caractères envoyés. Journal local sans phrases ni secrets ; aucune reconstitution de l'historique antérieur, aucun accès au solde réel ElevenLabs. Les lectures mises en cache dans le navigateur ne sont pas comptées.
- `npm test` inclut les tests audio simulés (`scripts/test-voix.ts`). Aucun appel réel à ElevenLabs pour ces tests. `scripts/test-lancement.ps1` vérifie le démarrage Windows sur une base temporaire.
- Démo à distance : `Partager le jeu.cmd` démarre une base fictive séparée sur le port 4322 et un tunnel Cloudflare temporaire. `Arrêter le partage.cmd` coupe ce lien. Le PC doit rester allumé. `LUMO_PARTAGE=1` interdit les nouvelles générations ElevenLabs et le suivi de voix ; il réutilise les fichiers audio déjà enregistrés, sinon la voix du navigateur. Les visiteurs utilisant LUMO01 partagent la progression d'Arthur dans `data/partage/demo/`.

## 12. MCP et validation parent — 9 octobre 2026

- Décision : poursuivre le MCP avec l'assistant du parent, sans facturer des appels d'API LLM à Lumo. Préparer un contrat commun pour une future formule intégrée par API ; aucune API ni facturation n'est ajoutée pour l'instant.
- `src/formats.ts` : schémas communs des jeux ; `src/outils-mcp.ts` : fabrique des quatre outils, limitée au parent concerné ; `src/mcp.ts` : point d'entrée stdio local conservé.
- `src/mcp-http.ts` : transport HTTP JSON, activé explicitement avec `LUMO_MCP_ACTIF=1`, authentifié par clé de parent. Pas d'OAuth à ce stade. `src/mcp-client.ts` fournit le relais stdio → HTTP pour Claude Desktop.
- Migration additive de SQLite : table `parents`, colonne `enfants.parent_id`. Les profils déjà présents restent associés au parent local 1. Les connexions distantes ont chacune leurs profils.
- `src/parents.ts` : clés stockées sous forme d'empreinte en base, brouillons liés à un parent et un enfant, liens privés de 24 heures, publication atomique et sans doublon. Les clés originales sont uniquement dans des fichiers `.env` privés sous `data/`.
- `src/parent-web.ts` : aperçu des jeux, notion, extrait de leçon fourni par l'assistant et réponses pour le parent. Le clic de validation publie les quêtes. La photo reste dans l'assistant ; aucune fidélité automatique de l'extrait n'est garantie.
- Scripts : `preparer-parent.ts`, `essai-parent.ts`, `revoquer-parent.ts`. Pour la base de démonstration, définir `LUMO_DATA=data/partage/demo` avec un chemin absolu. `Installer le connecteur distant.cmd` est prêt mais n'est pas exécuté : il faut fermer complètement Claude Desktop avant.
- `test-mcp-distant.ts` vérifie HTTP, authentification, origine, séparation de familles, migration d'une base remplie, absence de quêtes avant validation, publication unique, expiration et relais Claude Desktop. Les autres tests restent en place.
- Audio distant corrigé : réutilisation du cache existant de Milo en lecture seule, sans demande payante. Une phrase non enregistrée renvoie 404 et l'app utilise la voix du navigateur ; elle ne désactive pas les autres voix en cache.
- Validation web corrigée : `Referrer-Policy: no-referrer` pouvait rendre l'origine du formulaire nulle et provoquer « Validation indisponible ». Utiliser `same-origin` pour conserver l'origine des POST locaux sans divulguer le lien privé à un autre site. Test réel dans le navigateur réussi sur un brouillon fictif ; le refus d'une origine étrangère reste testé.


Mise à jour potager (9 octobre 2026) : scène directe de 12 emplacements, sachets et arrosoir au clic ou glisser-déposer, croissance persistante de 8 minutes après arrosage, récolte vers le panier, mouvements calmes. Les anciennes cultures sont conservées. Voir `docs/MONDE-ENFANT.md` pour les règles et les modules.
