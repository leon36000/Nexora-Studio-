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
6. installe la commande `nexora` : `start`, `stop`, `restart`, `status`, `logs`, `url`, `open`, `smoke`, `update`, `uninstall [--purge]`.

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
| `NEXORA_MODEL_NAME` | Le nom affiché dans Nexora (`nexora-default` par défaut) |

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

```bash
NEXORA_SMOKE_ADMIN_EMAIL=gerant@mon-entreprise.fr NEXORA_SMOKE_ADMIN_PASSWORD='…' scripts/smoke.sh http://localhost:3000
```

Le test crée un compte jetable et vérifie onze points : l'interface, les modèles, les outils, cinq exécutions réelles par votre modèle, le journal d'audit et la consommation. Ces deux derniers sont lus avec votre compte de propriétaire (ou d'un administrateur), passé par les variables d'environnement ci-dessus ; le test vérifie aussi que le compte jetable, simple membre, n'y a pas accès.

Le test s'inscrit par e-mail et mot de passe : il échoue sur une instance où le SSO est configuré ou les inscriptions fermées.

## 6. Mettre à jour

```bash
git pull
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build
```

Les migrations de base de données s'appliquent automatiquement au démarrage.

## 7. Sauvegarder

Les données vivent dans des volumes Docker :

| Volume | Contenu |
|---|---|
| `nexora_postgres-data` | Comptes, workflows, journaux, Nexora API |
| `nexora_connect-data` | Connexions aux outils (chiffrées) |
| `nexora_bootstrap` | Clé de WorkStudio auprès de Nexora API |

Sauvegarde de la base :

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env exec postgres pg_dumpall -U postgres > sauvegarde-nexora.sql
```

**Conservez aussi `deploy/.env`.** Sans `ENCRYPTION_KEY` et `NEXORA_CONNECT_ENCRYPTION_KEY`, les secrets enregistrés ne peuvent plus être déchiffrés.

## 8. Options

- **Connexion unique (SSO)** : voir [sso.md](sso.md).
- **E-mails** (invitations, mot de passe oublié) : renseignez `FROM_EMAIL_ADDRESS` et `RESEND_API_KEY`.
- **Désactiver les modèles PME** dans les nouveaux espaces : `NEXORA_TEMPLATES_DISABLED=true`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `workstudio` ne démarre pas, `nexora-bootstrap` en erreur | Nexora API ne répond pas. Lisez `docker compose logs nexora-api` et vérifiez `NEXORA_UPSTREAM_*` |
| Les agents répondent « model not found » | `NEXORA_UPSTREAM_MODEL` ne correspond à aucun modèle de votre fournisseur |
| Nexora Connect refuse de démarrer | `NEXORA_CONNECT_ENCRYPTION_KEY` est vide : relancez `scripts/init-env.sh` sur une installation neuve |
| Page blanche après un changement d'adresse | `NEXORA_PUBLIC_URL` doit être l'adresse exacte tapée dans le navigateur |
