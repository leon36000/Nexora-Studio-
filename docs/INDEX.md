# Nexora : carte du travail

Dernière mise à jour : 28/10/2026. Cette page dit **quoi est où**. Elle ne contient aucun secret.

## La règle

- **GitLab (pc4) est la seule source** de Nexora WorkStudio et de Nexora Web. Rien d'autre n'est gardé ailleurs, sauf les secrets (voir plus bas). On ne pousse plus vers GitHub.
- **Un seul dossier de travail** : `~/Bureau/Nexora-Travail/` sur pc1, avec des copies de GitLab (`nexora-workstudio`, `nexora-web`) et rien d'autre.
- **Une seule compilation de WorkStudio** pour tester : les images `nexora/*:local`, identiques à `nexora/*:securite-1.7.12`. Les anciennes sont supprimées. Les images de cette version sont aussi dans le registre GitLab.
- Hors périmètre de cette carte : `nexora-code`, le corpus, DSPy, Godel, LLMLingua, NAOS et les autres chantiers menés avec d'autres agents.

## Dépôts (GitLab sur pc4, privés, branche `main`)

| Dépôt | Projet | Contenu |
|---|---|---|
| `root/nexora-workstudio` | 5 | WorkStudio (fork de Sim, sans le code `ee/`), Nexora API, Nexora Connect, services, guides, conception (`docs/superpowers`), mémoire de Claude (`docs/memoire-claude`) |
| `root/nexora-web` | 6 | nouveau site : pages, espace client, passerelle de modèles `/v1`, catalogue et prix, facturation, Directus, LiteLLM, démo |

## Registre de paquets du projet 5

| Paquet | Contenu |
|---|---|
| `nexora-images` / `securite-1.7.12` | 9 images x86, `SHA256SUMS`, archive de recette |
| `nexora-archives` / `verification-2026-10-28` | preuves de vérification : captures, journaux de compilation, outils de sonde |

## Où ça tourne

| Quoi | Machine | Détail |
|---|---|---|
| WorkStudio de test | pc1 | projet Compose `nexora-x86`, lancé depuis `~/Bureau/Nexora-Travail/nexora-workstudio/deploy`. Ports locaux : 3300 (WorkStudio), 3302, 8300 (API), 8301 (Connect). À voir depuis pc1, ou par `ssh -L 3300:127.0.0.1:3300 pc1` |
| Démo publique du site | pc6 (nom `gx10-e526`) | service `nexorasite-demo`, `https://gx10-e526.tail0c55ff.ts.net:10000` (publique, non indexée), avec son worker et la pile de développement `nexorasite` (base 15440, Directus 8456, LiteLLM 4400). Panneau d'administration Directus : `https://gx10-e526.tail0c55ff.ts.net:8446/admin`, réseau privé seulement |
| Serveur définitif | Proxmox du fondateur | pas encore en place : c'est là qu'on recompilera la version finale |

pc6 ne contient plus rien de WorkStudio. Les dossiers `~/Desktop/NexoraSite` et `~/Desktop/NexoraSite-demo` sont les copies de travail du site qui font tourner la démo.

## Ce qui n'est PAS dans GitLab (secrets) et où il se trouve

Aucune sauvegarde indépendante n'existe : **le fondateur doit en garder une copie hors ligne**.

- WorkStudio : `deploy/.env` et `scripts/dev/.secrets` dans `~/Bureau/Nexora-Travail/nexora-workstudio` sur pc1 (droits 600).
- Site : `deploy/.env`, `.env` et `web/.env.local` dans `~/Desktop/NexoraSite` sur pc6, avec une copie dans `~/Bureau/Nexora-Travail/nexora-web` sur pc1. La clé maîtresse du coffre (`NEXORA_VAULT_MASTER_KEY`) est dans `deploy/.env` : sans elle, les clés de fournisseurs saisies dans le coffre sont illisibles.
- Jeton GitLab de l'agent : `~/.config/nexora/gitlab-pc4.token` (pc6 et pc1).

## Reconstruire

- WorkStudio : `docs/restauration.md` de ce dépôt (35 s pour télécharger, vérifier et charger les images).
- Site : `docs/restauration.md` du dépôt `nexora-web` (base prête en 6 s, 1 353 tests en 13 s).
- Prérequis communs : Docker Compose v5.2 ou plus récent (le paquet Ubuntu 2.40 échoue). Binaire sur pc1 : `~/Bureau/Nexora-Travail/outils/docker-compose`.

## Points ouverts

1. **Sauvegarde de pc4** : GitLab est sur un seul disque ; une copie sur un second disque ou une autre machine reste à prévoir.
2. `install.sh`, `deploy/nexora-cli.sh` et `deploy/.env.example` pointent encore vers GitHub : ne pas s'en servir pour reconstruire.
3. Ancien service `nexora-web.service` (ancien site) sur pc6, qui redémarre en boucle : à retirer avec l'accord du fondateur.
4. **WorkStudio intégré au site** : le code est fusionné (site : fournisseur de connexion unique et route `GET /api/oauth/workstudio-access` ; WorkStudio : clé de modèle par personne, `NEXORA_GATEWAY_URL`). Il reste à **recompiler l'image de WorkStudio** (une compilation, sur pc1), à régler les variables `NEXORA_OIDC_*`, `NEXORA_GATEWAY_URL` et `WORKSTUDIO_*` et à exposer l'instance sous un sous-domaine du site (décision du fondateur avant toute exposition publique). Voir `docs/superpowers/specs/2026-10-29-workstudio-integre-au-site.md` et `docs/workstudio-integre.md` (dépôt `nexora-web`).
5. Conception à écrire : Nexora WebPilot et Nexora Privacy Router.
