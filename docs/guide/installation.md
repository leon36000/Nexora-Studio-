# Installer Nexora

Ce guide installe la plateforme complète : Nexora WorkStudio, Nexora API, Nexora Connect, PostgreSQL et Redis, plus un modèle local si vous le choisissez.

## Le plus simple : une commande

```bash
curl -fsSL https://raw.githubusercontent.com/leon36000/Nexora-Studio-/main/install.sh | bash
```

Il suffit d'avoir Docker. L'installateur :

1. vérifie la machine (Docker, Docker Compose v2, disque) ;
2. télécharge le paquet de déploiement dans `~/nexora` ;
3. vous demande le nom de votre organisation, votre adresse (propriétaire), les domaines e-mail autorisés, le port et le modèle :
   - **modèle local** : Ollama est installé avec Nexora et télécharge `qwen2.5:7b` (ou `qwen2.5:3b` sous 16 Go de mémoire) ; rien ne sort de votre machine ;
   - **Mistral AI** : votre clé de La Plateforme ;
   - **autre service compatible OpenAI** : son adresse (sans `/v1`), le modèle et la clé ;
4. génère les secrets dans `~/nexora/deploy/.env` (lisible par vous seul) ;
5. télécharge les images publiées (amd64 ou arm64) et démarre tout ; à défaut d'images publiées, il les construit depuis les sources (10 à 20 minutes) ;
6. installe la commande `nexora` : `start`, `stop`, `restart`, `status`, `logs`, `url`, `open`, `check`, `smoke`, `backup`, `restore`, `update`, `https`, `uninstall [--purge]`.

| Option ou variable | Effet |
|---|---|
| `--yes` | Aucune question : les réponses viennent des variables `NEXORA_ORGANIZATION_NAME`, `NEXORA_ORGANIZATION_OWNER_EMAIL` (obligatoire), `NEXORA_MODEL_CHOICE` (`local`, `mistral`, `openai`), `NEXORA_UPSTREAM_URL`, `NEXORA_UPSTREAM_MODEL`, `NEXORA_UPSTREAM_KEY`, et de toute clé de `deploy/.env` (ports, adresse publique…) |
| `--from-source` | Construit les images sur votre machine |
| `--no-start` | Prépare tout sans démarrer |
| `NEXORA_HOME` | Dossier d'installation (`~/nexora` par défaut) |
| `NEXORA_VERSION` | Version des images (`latest` par défaut, `edge` pour la branche principale) |
| `NEXORA_OLLAMA_THREADS` | Threads du modèle local (par défaut la moitié des cœurs : sur une machine partagée, un modèle qui prend tous les cœurs devient cent fois plus lent) |

Relancer l'installateur ne touche jamais une configuration existante ; `nexora update` met à jour le paquet et les images en la conservant.

La suite de ce guide décrit l'installation manuelle depuis les sources et les réglages avancés.

## 1. Prérequis

- Un serveur Linux amd64 ou arm64 avec **Docker** et **Docker Compose v2**.
- **8 Go de mémoire** pour faire tourner la plateforme, **16 Go** pendant la construction des images.
- **30 Go de disque** libres.
- Un **modèle de langage compatible OpenAI** :
  - **Ollama** sur le même serveur : `http://host.docker.internal:11434`, modèle par exemple `qwen2.5:7b` ou `mistral-small` ;
  - **vLLM** ou **LiteLLM** : l'adresse de votre serveur ;
  - **un fournisseur en ligne** (Mistral, OpenAI…) : son adresse et votre clé.

L'adresse du modèle s'écrit **sans** le suffixe `/v1`.

## 2. Préparer la configuration

Depuis la racine du dépôt :

```bash
scripts/init-env.sh
```

Le script crée `deploy/.env`, lisible par vous seul, et génère tous les secrets. Il ne réécrit jamais un fichier existant. Ouvrez ce fichier et vérifiez :

| Variable | Rôle |
|---|---|
| `NEXORA_PUBLIC_URL` | L'adresse que vos utilisateurs tapent dans leur navigateur (par exemple `https://ia.mon-entreprise.fr`) |
| `NEXORA_BIND_ADDRESS` | `127.0.0.1` par défaut : seul le serveur lui-même accède à Nexora. Mettez `0.0.0.0` derrière un pare-feu, ou placez un proxy HTTPS (Caddy, Traefik, Nginx) devant |
| `NEXORA_UPSTREAM_URL` | L'adresse de votre modèle, sans `/v1` |
| `NEXORA_UPSTREAM_MODEL` | Le nom du modèle chez ce fournisseur |
| `NEXORA_UPSTREAM_KEY` | La clé du fournisseur (`none` pour Ollama ou vLLM sans clé) |

## 3. Lancer

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build
```

La première construction prend de 10 à 20 minutes. Ensuite :

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env ps
```

Tous les services doivent être `running` ou `healthy`. `nexora-bootstrap` et `workstudio-migrations` s'arrêtent normalement (`exited (0)`) : ce sont des tâches d'initialisation.

## 4. Premier compte

Avant le premier démarrage, indiquez dans `deploy/.env` le nom de votre organisation et **votre adresse**, celle du propriétaire :

```bash
NEXORA_ORGANIZATION_NAME=Mon entreprise
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@mon-entreprise.fr
```

Ouvrez `NEXORA_PUBLIC_URL` et créez votre compte avec cette adresse. Sans `NEXORA_ORGANIZATION_OWNER_EMAIL`, le premier compte créé devient propriétaire. Votre premier espace de travail contient :

- le dossier **« Modèles PME »** : cinq workflows prêts à l'emploi ;
- le serveur d'outils **Nexora Connect**, déjà branché (Réglages › Outils MCP).

Chaque compte créé ensuite rejoint votre organisation comme **membre** ; personne ne peut en fonder une autre. Vous gérez les rôles dans **Réglages › Membres** et consultez le **journal d'audit** et le tableau de **consommation**. Ce tableau couvre toute l'instance, tous utilisateurs confondus : seuls les propriétaires et administrateurs de l'organisation le voient.

Si vous videz `NEXORA_ORGANIZATION_NAME`, chacun peut fonder sa propre organisation, et le propriétaire de chacune voit alors la consommation de toute l'instance.

### Qui peut créer un compte

Toute personne inscrite utilise les modèles de Nexora API et les outils de Nexora Connect. Encadrez l'inscription dans `deploy/.env` avant d'ouvrir WorkStudio à votre réseau :

| Réglage | Effet |
|---|---|
| `NEXORA_ALLOWED_EMAIL_DOMAINS=mon-entreprise.fr` | Seules les adresses de ces domaines peuvent s'inscrire et se connecter. **Fortement recommandé.** |
| `NEXORA_REGISTRATION_DISABLED=true` | Plus aucune inscription, y compris par SSO : seuls les comptes existants se connectent. À activer une fois votre équipe inscrite. |
| `NEXORA_EMAIL_VERIFICATION=true` | Chaque adresse doit être confirmée par e-mail (nécessite un service d'e-mail). |
| `NEXORA_OIDC_*` | Avec la [connexion unique](sso.md), l'inscription par e-mail et mot de passe est fermée : les comptes se créent par votre fournisseur d'identité. Les personnes extérieures à celui-ci (expert-comptable, prestataire) ne peuvent donc plus s'inscrire, même invitées : ajoutez-les chez votre fournisseur. |

Appliquez ensuite avec `docker compose -f deploy/compose.yml --env-file deploy/.env up -d`.

## 5. Vérifier l'installation

**Vérification sans compte** (celle que lancent `nexora update` et `nexora restore`) :

```bash
nexora check
```

Elle ne crée rien et n'a besoin ni de compte ni de python3 : page de connexion en français, état de WorkStudio (`/api/health`), migrations de la base appliquées, réponse de Nexora API (un jeton, avec la clé de WorkStudio, sans jamais l'afficher), Nexora Connect et serveur temps réel. Elle interroge l'adresse de `NEXORA_BIND_ADDRESS` quand c'est une adresse IP précise, sinon `127.0.0.1`.

**Test de bout en bout** (pour l'exploitant, avec python3) :

```bash
NEXORA_SMOKE_ADMIN_EMAIL=gerant@mon-entreprise.fr NEXORA_SMOKE_ADMIN_PASSWORD='…' scripts/smoke.sh http://localhost:3000
```

Le test crée un compte jetable et vérifie chaque brique : l'interface, les modèles, les outils, cinq exécutions réelles par votre modèle, le journal d'audit et la consommation. Ces deux derniers sont lus avec votre compte de propriétaire (ou d'un administrateur), passé par les variables d'environnement ci-dessus ; le test vérifie aussi que le compte jetable, simple membre, n'y a pas accès. `nexora smoke --quick` en lance une version courte (inscription, interface, modèles PME, une exécution).

Ces deux tests s'inscrivent par e-mail et mot de passe et **laissent derrière eux** le compte jetable (`smoke-…@nexora.test`) et son espace : ils échouent sur une instance où les domaines d'inscription sont restreints, les inscriptions fermées, la confirmation d'adresse ou le SSO exigés. Réservez-les à une instance de test, ou supprimez ensuite le compte dans Réglages › Membres.

## 6. Accès en HTTPS

L'installateur demande un **nom de domaine**. Avec un domaine, Nexora démarre un serveur **Caddy** devant WorkStudio (`https://votre-domaine`), Nexora Connect (`https://connect.votre-domaine`) et Nexora API (`https://api.votre-domaine`) :

- **certificat Let's Encrypt** : donnez une adresse e-mail ; le domaine et ses sous-domaines `connect.` et `api.` doivent pointer vers le serveur, ports 80 et 443 ouverts. Le certificat se renouvelle seul ;
- **certificat interne** : répondez `internal` (réseau privé, sans domaine public). Les navigateurs afficheront un avertissement tant que l'autorité locale de Caddy n'est pas approuvée sur les postes.

Variables correspondantes dans `deploy/.env` : `NEXORA_DOMAIN`, `NEXORA_TLS` (adresse e-mail ou `internal`), les adresses publiques `NEXORA_PUBLIC_URL` et `NEXORA_PUBLIC_REALTIME_URL` (`https://votre-domaine`) et `NEXORA_CONNECT_PUBLIC_URL` (`https://connect.votre-domaine`), et le profil `https` dans `COMPOSE_PROFILES`.

**Passer en HTTPS après l'installation** : une commande règle tout cela et redémarre ce qui doit l'être :

```bash
nexora https nexora.mon-entreprise.fr gerant@mon-entreprise.fr   # Let's Encrypt
nexora https nexora.mon-entreprise.local internal                # certificat interne
nexora check
```

Les utilisateurs se reconnectent ensuite à la nouvelle adresse. Pour Nexora Connect, déclarez aussi la nouvelle adresse de retour (`https://connect.votre-domaine/…`) chez vos fournisseurs OAuth (Réglages › Connecteurs l'affiche).

**Certificat interne : faire approuver l'autorité de Caddy par les postes.** Récupérez son certificat racine sur le serveur :

```bash
docker compose -p nexora -f ~/nexora/deploy/compose.yml --env-file ~/nexora/deploy/.env \
  cp caddy:/data/caddy/pki/authorities/local/root.crt ./nexora-autorite.crt
```

puis installez `nexora-autorite.crt` sur chaque poste comme **autorité de certification racine de confiance** : Windows (double-clic › Installer le certificat › Ordinateur local › « Autorités de certification racines de confiance »), macOS (Trousseau d'accès › Système, puis « Toujours approuver »), Linux (`/usr/local/share/ca-certificates/` puis `sudo update-ca-certificates`) ; Firefox garde son propre magasin (Paramètres › Certificats › Importer). Ce certificat n'est valable que pour ce serveur : il n'est pas dans les sauvegardes (voir plus bas).

## 7. Sauvegarder et restaurer

```bash
nexora backup
```

crée dans `~/nexora/backups/` (ou `NEXORA_BACKUP_DIR`) une archive horodatée, lisible par vous seul, dont **chaque élément est chiffré** par une phrase de passe que la commande demande (AES-256, PBKDF2) :

| Élément | Contenu |
|---|---|
| Bases PostgreSQL | Comptes, mots de passe (empreintes), sessions, jetons OAuth, workflows, journaux, connaissances, Nexora API |
| `connect-data` | Connexions de Nexora Connect ; le service est arrêté quelques secondes pendant la copie pour qu'elle soit cohérente |
| `workstudio-uploads` | Fichiers téléversés (documents des bases, fichiers d'espace) |
| `bootstrap`, `deploy/.env` | Clés et secrets |

Un manifeste en clair (format, version, date, sommes SHA-256) accompagne ces éléments ; rien d'autre n'est lisible sans la phrase de passe. Les données sont chiffrées au fil de l'eau : aucune copie en clair ne passe par le disque. La commande vérifie d'abord l'espace disque du dossier des sauvegardes (il faut deux fois la taille des données), écrit l'archive sous un nom temporaire et ne la renomme qu'une fois complète. Une seule opération (sauvegarde, restauration, mise à jour) tourne à la fois.

**Gardez la phrase de passe** : sans elle, l'archive ne peut pas être restaurée. Copiez les archives hors du serveur (disque externe, stockage de sauvegarde).

**Sauvegarde quotidienne** :

```bash
nexora backup --schedule quotidien
```

ajoute une tâche à votre crontab (chaque nuit à 2 h 30, sans droits d'administrateur ; le conteneur `cron` de Nexora n'est pas utilisé, car il lui faudrait l'accès à Docker, c'est-à-dire les droits d'administrateur du serveur) ; les sauvegardes planifiées des 7 derniers jours sont gardées, les sauvegardes manuelles ne sont jamais effacées. La tâche garde le dossier des sauvegardes et le `PATH` du moment de la planification : relancez `nexora backup --schedule quotidien` si vous les changez. La phrase de passe est conservée dans `deploy/.backup-passphrase` (lisible par vous seul) pour que la tâche tourne sans vous : ne copiez pas ce fichier avec les archives. `nexora backup --schedule off` arrête la planification ; le journal des sauvegardes est `backups/sauvegardes.log`.

**Restaurer** :

```bash
nexora restore ~/nexora/backups/nexora-20261023-023000.tar
```

Avant de toucher à quoi que ce soit, la commande vérifie :

- que l'archive contient exactement les éléments attendus, avec leurs sommes de contrôle ;
- la phrase de passe, puis chaque élément déchiffré (base lisible, archives de fichiers lisibles, configuration avec ses secrets, clés de Nexora API présentes) ;
- l'espace disque, dans le dossier des sauvegardes et pour les données de Docker.

Une archive altérée, d'un format inconnu ou une phrase de passe fausse s'arrêtent sur « rien n'a été modifié ». Dans un terminal, la commande affiche ensuite la date et la version de l'archive et demande de taper `restaurer` (`nexora restore --yes <archive>` pour un script). Elle fait alors une **sauvegarde de sécurité** des données actuelles (`nexora-avant-restauration-….tar`, même phrase de passe ; sauf instance vide), arrête Nexora, remplace les données et `deploy/.env`, rejoue les bases en s'arrêtant à la première erreur, redémarre et lance `nexora check`. Une fois les données en cours de remplacement, fermer le terminal n'interrompt plus la restauration ; si elle échoue malgré tout, le message indique l'archive de sécurité à restaurer.

**Restaurer sur un nouveau serveur** :

1. installez Nexora normalement (`install.sh`), avec le **même choix de modèle** : les modèles locaux (Ollama) ne sont pas dans la sauvegarde et se téléchargent à l'installation ; ceux ajoutés ensuite dans Réglages › Modèles se retéléchargent depuis cet écran ;
2. copiez l'archive sur le serveur et lancez `nexora restore <archive>` : la configuration restaurée est celle de l'ancien serveur ;
3. si l'adresse change, `nexora https <nouveau-domaine> …` (ou corrigez `NEXORA_PUBLIC_URL` dans `deploy/.env`, puis `nexora start`) ;
4. avec un certificat interne, l'autorité de Caddy est **nouvelle** (elle n'est pas sauvegardée) : réinstallez son certificat racine sur les postes (voir « Accès en HTTPS »).

## 8. Mettre à jour

```bash
nexora update
```

1. met WorkStudio en maintenance (arrêt de l'application, du temps réel et des tâches planifiées) : rien n'est écrit après la sauvegarde ;
2. sauvegarde l'instance (phrase de passe demandée) ;
3. garde les images en service pour un retour arrière ;
4. télécharge la nouvelle version (ou, pour une installation construite depuis les sources, récupère les sources à jour et reconstruit), applique les migrations et redémarre ;
5. lance la vérification sans compte (`nexora check`).

Si une étape échoue, Nexora **revient seul** en arrière, seulement sur ce qui a changé : si la nouvelle version n'a pas pu s'installer (téléchargement impossible, par exemple), les fichiers du paquet reviennent et WorkStudio redémarre, sans toucher aux données ; si de nouvelles images ont tourné, les images, le paquet **et** les données d'avant la mise à jour reviennent. Des images publiées introuvables font échouer la mise à jour (jamais d'anciennes images sous un nouveau paquet).

Après une mise à jour réussie, seule la dernière sauvegarde « avant mise à jour » est gardée (`nexora-avant-maj-….tar`), ainsi que les images de la version précédente (étiquettes `…-nexora-avant-maj`), pour un retour arrière manuel. `nexora status` affiche la version, le disque libre et la dernière sauvegarde.

## 8 bis. Désinstaller

- `nexora uninstall` arrête et supprime les services (y compris HTTPS, recherche web et transcription), en gardant données et configuration dans `~/nexora`.
- `nexora uninstall --purge` supprime **tout** `~/nexora`, y compris `~/nexora/backups` : la commande le signale et propose de garder les sauvegardes (déplacées dans `~/nexora-sauvegardes`). Elle refuse de supprimer un dossier qui n'est pas une installation de Nexora, ou votre dossier personnel.

## 9. Options

- **Connexion unique (SSO)** : voir [sso.md](sso.md).
- **E-mails** (invitations, mot de passe oublié) : l'installateur demande un serveur SMTP (`NEXORA_SMTP_HOST`, `NEXORA_SMTP_PORT`, `NEXORA_SMTP_USER`, `NEXORA_SMTP_PASS`, `NEXORA_EMAIL_FROM` dans `deploy/.env`).
- **Recherche web** : profil `search` (l'installateur demande ; vos requêtes partent vers des moteurs publics).
- **Désactiver les modèles PME** dans les nouveaux espaces : `NEXORA_TEMPLATES_DISABLED=true`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `workstudio` ne démarre pas, `nexora-bootstrap` en erreur | Nexora API ne répond pas. Lisez `docker compose logs nexora-api` et vérifiez `NEXORA_UPSTREAM_*` |
| Les agents répondent « model not found » | `NEXORA_UPSTREAM_MODEL` ne correspond à aucun modèle de votre fournisseur |
| Nexora Connect refuse de démarrer | `NEXORA_CONNECT_ENCRYPTION_KEY` est vide : relancez `scripts/init-env.sh` sur une installation neuve |
| Page blanche après un changement d'adresse | `NEXORA_PUBLIC_URL` doit être l'adresse exacte tapée dans le navigateur |
