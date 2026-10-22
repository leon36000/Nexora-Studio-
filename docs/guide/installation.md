# Installer Nexora

Ce guide installe la plateforme complète sur un serveur Linux : Nexora WorkStudio, Nexora API, Nexora Connect, PostgreSQL et Redis.

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

Ouvrez `NEXORA_PUBLIC_URL` et créez votre compte. Votre premier espace de travail contient :

- le dossier **« Modèles PME »** : cinq workflows prêts à l'emploi ;
- le serveur d'outils **Nexora Connect**, déjà branché (Réglages › Outils MCP).

Pour travailler en équipe, créez votre organisation dans **Réglages › Membres**. Vous accédez alors au **journal d'audit** et au tableau de **consommation**.

## 5. Vérifier l'installation

```bash
scripts/smoke.sh http://localhost:3000
```

Le test crée un compte jetable et vérifie onze points : l'interface, les modèles, les outils, cinq exécutions réelles par votre modèle, la consommation et le journal d'audit.

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
