# Hébergement du pilote Lumo

Préparation pour une VM Linux Oracle Always Free. Aucun serveur cloud n'est créé par ces fichiers. Le compte, la disponibilité d'une VM gratuite et un nom DNS restent à configurer. L'inscription Oracle et la vérification bancaire sont effectuées par le propriétaire du compte. Ne pas passer au compte payant ni utiliser des ressources simplement couvertes par les crédits d'essai.

## Installation

1. Créer une VM Ubuntu marquée Always Free dans la région principale du compte, dans les quotas affichés par Oracle. Garder son disque persistant. Autoriser SSH uniquement depuis l'adresse du propriétaire, et HTTP/HTTPS (80/443) pour le test. Le port 4321 n'est pas publié.
2. Installer Docker Engine et Compose depuis la documentation officielle Docker. Cloner la branche `main` de ce dépôt sur la VM. Ne pas transférer le dossier `data` local ni son `.env` : le pilote démarre avec une nouvelle base.
3. Choisir un nom DNS et le faire pointer vers l'IP de la VM. Copier `deploy/.env.example` dans `deploy/.env`, renseigner `LUMO_DOMAINE`. Le coût ou la gratuité du nom DNS doit être confirmé séparément ; aucun domaine n'est acheté automatiquement.
4. Depuis le dépôt : `docker compose --env-file deploy/.env -f deploy/compose.yaml config --quiet`, puis `docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build`.
5. Vérifier `https://NOM-DNS/health`. Caddy demande le certificat HTTPS ; le DNS et les ports 80/443 doivent être fonctionnels. Le service Lumo écoute sur le réseau interne Docker.
6. Créer la famille fictive : `docker compose --env-file deploy/.env -f deploy/compose.yaml exec lumo node scripts/inviter-parent.ts famille-test https://NOM-DNS`. Le lien privé est enregistré dans `/var/lib/lumo/connexions/invitation-famille-test.txt`, à lire uniquement pour le transmettre au testeur. Les anciennes invitations du PC ne sont pas copiées.
7. Installer le connecteur Claude de cette famille, vérifier son profil, envoyer une photo sans données personnelles, valider le brouillon et ouvrir les missions dans Lumo. Contrôler ce parcours avant de diffuser le lien.

## Conservation et sauvegardes

Le volume `lumo-donnees` conserve SQLite, les invitations et le cache audio lors des redémarrages des conteneurs. Ne pas utiliser `docker compose down -v` : cette option supprime les volumes. Cette persistance ne remplace pas une sauvegarde hors de la VM.

La commande `docker compose --env-file deploy/.env -f deploy/compose.yaml exec lumo node scripts/sauvegarder.ts` produit une copie cohérente de SQLite sous `/var/lib/lumo/sauvegardes`. Les fichiers audio et connexions privées doivent être sauvegardés séparément. Révoquer une famille avec `exec lumo node scripts/revoquer-parent.ts ID` sur cette même base.

La génération ElevenLabs est désactivée et aucune clé API ElevenLabs n'est incluse. Sans import séparé du cache audio, le navigateur fournit la voix française. Le pilote reste limité à des profils fictifs : ce déploiement n'ajoute ni comptes adultes ni OAuth.

## Vérification actuelle

La configuration Compose doit être validée localement. Docker Desktop est installé sur le PC de développement, mais son moteur Linux n'était pas démarré lors de la préparation : la construction et l'exécution de cette image restent à tester avant publication. Une installation préparée ne constitue pas un hébergement opérationnel.

Références : [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [Docker sur Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [HTTPS Caddy](https://caddyserver.com/docs/automatic-https).
