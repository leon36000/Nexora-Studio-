# Reconstruire WorkStudio depuis GitLab seul

Dépôt : `https://pc4.tail0c55ff.ts.net/root/nexora-workstudio` (privé, branche `main`). Le code source complet, les migrations, les fichiers de déploiement, la documentation et les scripts y sont. Les **images prêtes à lancer** (x86) sont dans le registre de paquets du même projet.

## Ce qui est sur GitLab

| Quoi | Où |
|---|---|
| Code source (WorkStudio, Nexora API, Nexora Connect, Code, services) | branche `main` du dépôt |
| Images x86 vérifiées (9 archives + `SHA256SUMS`, 2,4 Go) | paquet générique `nexora-images`, version `securite-1.7.12` : `/api/v4/projects/5/packages/generic/nexora-images/securite-1.7.12/<fichier>` |
| Conception, notes de recherche, preuves | `docs/` |

## Ce qui n'est PAS sur GitLab

| Quoi | Que faire |
|---|---|
| Secrets (`deploy/.env`, `scripts/dev/.secrets`, `workstudio/apps/*/.env*`) | `scripts/init-env.sh` en génère de nouveaux. **Les anciens sont perdus** : toute donnée chiffrée avec les anciennes clés (`ENCRYPTION_KEY`, `NEXORA_CONNECT_ENCRYPTION_KEY`) devient illisible ; garder une copie hors ligne de `deploy/.env` |
| Données (volumes `postgres-data`, `workstudio-uploads`, `connect-data`) | sauvegarde chiffrée par `deploy/nexora-cli.sh backup` ; **à ce jour la pile de pc6 n'a aucune sauvegarde de ses volumes** |
| Sources de recherche volumineuses (`docs/recherche/mistral-studio/sources/`, 40 Mo) | copie sur pc1 (`~/Bureau/Nexora-Travail/nexora-workstudio/`) ; peuvent être retéléchargées |

## Procédure (essai du 28/10/2026 sur pc1 : 35 s pour télécharger, vérifier et charger les images)

Prérequis : Docker, **Docker Compose v5.2 ou plus récent** (le paquet Ubuntu 2.40 échoue sur les variables « requises » ; binaire officiel : image `docker/compose-bin:v5.2.0`), un jeton GitLab.

```bash
git clone https://pc4.tail0c55ff.ts.net/root/nexora-workstudio.git && cd nexora-workstudio

# 1. Images : téléchargement, vérification des empreintes, chargement
B=https://pc4.tail0c55ff.ts.net/api/v4/projects/5/packages/generic/nexora-images/securite-1.7.12
mkdir images && cd images
curl -fsS -H "PRIVATE-TOKEN: $TOKEN" -o SHA256SUMS $B/SHA256SUMS
for f in $(awk '{print $2}' SHA256SUMS); do curl -fsS -H "PRIVATE-TOKEN: $TOKEN" -o $f $B/$f; done
sha256sum -c SHA256SUMS                       # tout doit répondre OK
for f in $(grep x86 SHA256SUMS | awk '{print $2}'); do docker load -i $f; done
cd ..
# quatre images sont chargées sous l'étiquette « local » : leur donner la même version que les autres
for s in code cron diarize pii; do docker tag nexora/$s:local nexora/$s:securite-1.7.12; done

# 2. Secrets neufs, puis démarrage SANS reconstruire
bash scripts/init-env.sh                      # crée deploy/.env (0600) ; vérifier NEXORA_PUBLIC_URL, organisation, modèle amont
export NEXORA_VERSION=securite-1.7.12
docker compose -f deploy/compose.yml --env-file deploy/.env up -d --no-build
```

Vérifié : sur un clone neuf, les 9 images requises par `deploy/compose.yml` sont présentes et `up --no-start --no-build` crée tous les conteneurs sans erreur. Le démarrage complet n'a pas été rejoué sur cette machine, parce que la pile `nexora-x86` déjà en marche occupe les ports ; elle a été lancée à partir des mêmes images.

Sur pc1, ajouter `-f deploy/compose.pc1.yml` (réseau du LiteLLM de pc1 pour `nexora-api` et `workstudio`).

## Si les images ne suffisent pas : reconstruire

La compilation de WorkStudio exige plus de 28 Go de mémoire et une machine x86 : elle se fait sur pc1 (`docker compose -f deploy/compose.yml --env-file deploy/.env build`). Voir `docs/superpowers/` et la mémoire du projet pour les pièges connus.

## Points d'attention

- `install.sh`, `deploy/nexora-cli.sh` et `deploy/.env.example` pointent encore vers GitHub (`leon36000/Nexora-Studio-`, `ghcr.io/leon36000/nexora-`). Depuis le 28/10/2026 on ne pousse plus vers GitHub : **ne pas utiliser `install.sh` pour reconstruire**, suivre la procédure ci-dessus. Les faire pointer vers GitLab est un chantier à part.
- Les **gabarits** sont dans `workstudio/apps/sim/lib/nexora/templates.ts` (29 gabarits, tests : 81 passés sur pc1).
