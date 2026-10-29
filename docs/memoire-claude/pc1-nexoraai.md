---
name: pc1-nexoraai
description: "Dossier de travail NexoraAI sur pc1 (~/Bureau/NexoraAI) — demandé par le fondateur le 27/10 pour ne plus manquer d'espace sur pc6"
metadata:
  node_type: memory
  type: reference
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-28T05:37:04.009Z
---

Le 27/10/2026, le fondateur a demandé : « pour continuer le travail sans manquer d'espace, va sur pc1, fais-toi un dossier NexoraAI sur le bureau ». pc1 = amd64, Bureau = `/home/pc1/Bureau` (pas `Desktop`), ~168 Go libres ; accès `ssh pc1` (pas `pc1-ts`, qui exige une vérification Tailscale). pc6 = arm64, disque à 99 % (≈ 17 Go libres).

Contenu de `~/Bureau/NexoraAI` :
- `depots/NexoraSite.git`, `depots/NexoraStudio.git` : miroirs nus (remote `pc1` dans les deux dépôts de pc6) — sauvegarde hors pc6 tant que GitHub n'est pas fait ; `git push pc1 --all` après chaque étape.
- `images/workstudio-v3-arm64.tar.gz` : image WorkStudio v3 (retour arrière : `ssh pc1 cat … | gunzip | docker load`).
- `archives/recette-2026-10-27.tar.gz` : preuves de recette (captures, journaux) retirées du scratchpad de pc6.

Piège vécu le 27/10 : le build Docker de WorkStudio sur pc6 (surtout sans cache) dépasse 22 Go et a rempli le disque à 0 (le dossier de tâches de Claude est sur le même disque) ; une garde par sondage n'arrête pas assez vite. Ne lancer ce build qu'avec ≥ 30 Go libres, puis `docker builder prune -af`. Retour arrière éprouvé : `ssh pc1 'cat ~/Bureau/NexoraAI/images/workstudio-v3-arm64.tar.gz' | gunzip | docker load`, puis `compose up -d --no-deps --no-build workstudio`.

WorkStudio v3.1 x86 (28/10) : images exportées dans `images/x86-v3.1/` (9 images, `LISEZMOI.md`, `SHA256SUMS`), fumée 44/44, navigateurs 260/260 ; pile de vérification `nexora-x86` (ports 3300/3302/8300/8301, override `deploy/compose.pc1.yml`, script `scripts/verification/fumee-pc1.sh`). Piège : un build WorkStudio non borné (31 processus Next, ~31 Go) a coïncidé avec un redémarrage de pc1 — toujours construire avec `NEXORA_BUILD_CPUS=8` et la pile arrêtée.

GitLab self-managed sur pc4 (28/10) : `https://pc4.tail0c55ff.ts.net/root/nexora-workstudio.git` et `…/root/nexora-web.git`, privés. pc6 ne résout pas les noms ts.net : passer par le proxy SOCKS de tailscaled (`socks5h://127.0.0.1:1055`). Pas d'accès SSH à pc4. Compte `agent-nexora-workstudio-web` (admin depuis le 28/10), jeton dans `~/.config/nexora/gitlab-pc4.token` (600), remote `gitlab` dans les deux dépôts (proxy et identifiants réglés par URL dans la config du dépôt). Projets : 5 = nexora-workstudio, 6 = nexora-web. Leur `ci_config_path` = `security.yml@root/pc4-ci-securite:main` (chaîne commune du fondateur : gitleaks 8.30, Semgrep, Trivy, SonarQube interne en .pre, runner Kubernetes `pc4-k3s-local`, pods limités à 2 Go par défaut) qui inclut le `.gitlab-ci.yml` du dépôt : n'y mettre que les contrôles propres au dépôt. Ne jamais se connecter avec les mots de passe root/admin que le fondateur a donnés : demander un jeton.

Limite : pc1 ne peut pas construire d'image arm64 (pas d'émulation binfmt, l'installer est un réglage système) ; les images WorkStudio de pc6 se construisent sur pc6. Voir [[nexora-site-v2]], [[nexora-workstudio-v1]].

Disque pc1 (28/10) : / (nvme1n1p2, 915 Go) contient Docker (`/var/lib/docker`) et descendait à 61 Go libres à cause du cache de build du builder par défaut (65 Go, régénérable) ; `docker builder prune -af` l'a ramené à 106 Go. À refaire après chaque série de compilations. Dossier de travail lourd demandé par le fondateur : `/run/media/pc1/Infrastructure/NexoraStudioWork` (SSD Infrastructure, ~158 Go libres) pour exports d'images, archives, caches hors Docker. Ne pas toucher aux ~90 conteneurs arrêtés `nexora-native-*`/`nexora-sql-*` ni aux images d'autres chantiers.

**28/10/2026 — OpenClaw et embedding supprimés sur pc1 (ordre du fondateur).** Services `openclaw-gateway-openclaw2` et `pc5-rag-embedding-accelerator` arrêtés, désactivés et supprimés avec `AgentOS/Briques/OpenClaw2` (11 Go), `~/.local/share/pc5-rag-accelerator` (6,8 Go) et le jeton `~/.config/pc5-rag-accelerator`. Conservés : `~/.openclaw`, `Promptfoo-OpenClaw2`, et les benchmarks `Infrastructure/pc5-rag-accelerator`. Il reste ~31 Go disponibles : la compilation de WorkStudio (>28 Go) exige encore de fermer l'appli Codex (~5 Go) ou une autre machine.

**28/10/2026 (soir) — sauvegarde des images dans GitLab.** Le registre de paquets du projet 5 (nexora-workstudio) contient le paquet générique `nexora-images` version `securite-1.7.12` : 9 images x86 (`docker load` après téléchargement) + `SHA256SUMS` + `recette-2026-10-27.tar.gz`, 2,4 Go. Envoi depuis pc1 directement (pc1 joint pc4 sans proxy), jeton passé par l'entrée standard, jamais écrit sur disque. L'image Connect a été recompilée le 28/10 soir : elle précédait le correctif GCM de `main` (commit 03708265). Le point d'entrée de Connect n'est qu'un script qui lance Node sur `/app/src` : pour vérifier un correctif, chercher dans `/app/src`, pas dans le binaire. `deploy/compose.pc1.yml` est désormais versionné (commit 32645cfb). Le fondateur ne formate PAS l'infrastructure tout de suite ; il créera lui-même ses dépôts propres plus tard. Ne supprimer que les doublons et le périmé. Supprimés ce soir : swap32.img (33 Go), anciennes étiquettes `ebeb799d-x86` et `adf0107f-x86`, exports x86-v3.1 périmés, node_modules des clones, caches npm de pc6.
