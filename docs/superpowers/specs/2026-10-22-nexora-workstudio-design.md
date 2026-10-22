# Nexora WorkStudio — document de conception (v1)

> **Date** : 22/10/2026. **Statut** : approuvé par délégation. Le fondateur a demandé de construire WorkStudio de façon autonome, sans s'arrêter (« Continue et ne t'arrête plus… jusqu'à la complétion pleine et entière de Nexora WorkStudio »). Le brainstorming par questions a donc été sauté, conformément à l'option prévue par superpowers. **Tous les choix ci-dessous sont des décisions de l'agent**, marquées « (décision agent) » quand elles ne viennent pas d'une parole du fondateur. Le fondateur peut les remettre en cause à tout moment.
> **Sources** : `docs/recherche/` (Mistral Studio, open source, test réel) ; décision des bases : `docs/recherche/open-source/00-decision-bases-et-briques.md`.

## 1. Intention

Nexora construit « un Mistral pour les PME » (fondateur). **Nexora WorkStudio** est son application phare. Elle réunit **Studio et Workflows en une seule application** (idée du fondateur) : une PME y construit, lance et suit des agents et des automatisations IA, sans coder, sur des modèles servis par **Nexora API** et connectés à ses outils par **Nexora Connect**.

**Pourquoi** :
- Mistral Studio est pensé pour les développeurs, n'a pas d'interface graphique pour ses Workflows, n'a pas de mode no-code, et ses utilisateurs se plaignent de quotas invisibles et d'une facturation confuse.
- Les PME, elles, veulent du simple, en français, souverain, et branché sur leurs outils (chap. 37).

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs de la v1** :
- une application WorkStudio rebrandée Nexora, en français par défaut, construite à partir du cœur Apache-2.0 de Sim, sans aucun code propriétaire de Sim ;
- l'usage de Nexora API (fork d'OpenGateLLM) comme fournisseur de modèles par défaut ;
- Nexora Connect (fork d'OpenConnector) branché d'office ;
- une installation en une commande ;
- des modèles de workflows pour PME françaises.

**Non-objectifs de la v1** (versions suivantes) :
- l'assistant pour salariés (LibreChat) ;
- les évaluations et les juges, le registre de prompts versionnés, les workflows en code sur Temporal ;
- les Libraries par le Search Toolkit, l'audio et les agents vocaux, Document AI au-delà des blocs existants ;
- le fine-tuning ;
- la facturation et les prix (exclus par le fondateur pour l'instant) ;
- le Helm et Kubernetes.

**Anti-objectifs** (ce qui ferait de la v1 un échec même si « ça marche ») :
- la présence de code issu de `apps/sim/ee/`, ou d'un objet Git qui en contient ;
- des marques tierces visibles (Sim, sim.ai, OOMOL, Etalab…) dans l'interface ;
- une télémétrie qui part vers un éditeur tiers ;
- une interface principale en anglais ;
- des secrets en clair dans le dépôt.

## 3. Contraintes

- **Licences** : seulement du code MIT, Apache-2.0, BSD ou MPL. Conserver LICENSE et NOTICE d'origine ; fichier `THIRD_PARTY_NOTICES.md` ; signaler les fichiers modifiés.
- **Salle blanche** : les remplacements de `apps/sim/ee/` sont écrits uniquement à partir des appels du cœur. On réutilise les modules de remplacement déjà écrits et vérifiés (0 erreur de type ; rapport `docs/recherche/open-source/06-faisabilite-sim-sans-ee.md`).
- **Machine de développement** : pc6, aarch64, NVIDIA GB10, ≈ 120 Go de mémoire partagés avec d'autres charges (vLLM, autres sessions). Le contrôle de types complet de Sim consomme environ 9 Go. **Ne jamais arrêter un processus qui n'a pas été lancé par ce travail.** Docker s'utilise via `sg docker -c "…"`.
- **Images** : publiées pour amd64 et arm64 (OpenGateLLM n'en fournit pas en arm64 : nous les construisons). Sur pc6, seules les images arm64 sont construites et vérifiées ; l'amd64 est confié à un workflow de CI (construire en amd64 en local demanderait d'installer QEMU, un réglage système).
- **Pas de push** vers GitHub sans l'accord explicite du fondateur. Les commits sont locaux (décision agent : un push vers un dépôt partagé est un effet extérieur).

## 4. Architecture (décisions)

```
Nexora Studio/                       (dépôt git, remote origin = github.com/leon36000/Nexora-Studio-)
├─ workstudio/                       fork de Sim (monorepo bun/turbo), sans ee/ d'origine
│   └─ apps/sim/ee/                  modules Nexora « salle blanche » (même interface)
├─ services/nexora-api/              fork d'OpenGateLLM (Python/FastAPI)
├─ services/nexora-connect/          fork d'OpenConnector (TypeScript/Hono)
├─ deploy/                           docker compose de la plateforme (+ .env.example)
├─ scripts/                          contrôles automatiques (marque, licences, fumée de bout en bout)
└─ docs/                             recherche, specs, plans, guides
```

- **Import du code** (décision agent) : depuis des archives `tar` de versions publiées, sans historique Git amont, avec exclusion de `apps/sim/ee/` dès l'extraction. Le fichier `UPSTREAM.md` de chaque composant indique l'URL, la version et le SHA d'origine, pour pouvoir suivre l'amont par des diffs ciblés.
- **Marque** :
  - nom « Nexora WorkStudio » ; couleur principale indigo `#4F46E5` ;
  - logo texte provisoire « nexora » (décision agent, à remplacer par le vrai logo) ;
  - la marque est centralisée dans le module `whitelabeling` Nexora (`BrandConfig`).
- **Internationalisation** : `next-intl` (décision agent : compatible avec l'App Router de Next.js, licence MIT) ; langue par défaut `fr`, repli `en`. La v1 traduit les surfaces principales : navigation, accueil, éditeur (panneaux, barre d'outils, journaux), réglages, connexion et inscription, intégrations, tables, fichiers, connaissances.
- **Modèles** :
  - Nexora API est le fournisseur par défaut, par le fournisseur « vllm » de Sim (compatible OpenAI) renommé « Nexora » dans l'interface ;
  - modèle par défaut de l'agent : le premier modèle de Nexora API ;
  - les autres fournisseurs restent possibles, mais masqués par défaut (variable `NEXORA_ONLY_MODELS=true`).
- **Connecteurs** :
  - à la création d'un workspace, un serveur MCP « Nexora Connect » est préconfiguré (URL et jeton tirés de l'environnement) ;
  - les intégrations natives de Sim sont conservées.
- **Gouvernance v1** :
  - SSO OIDC générique via Better Auth (MIT), réglable par variables d'environnement (testé avec un fournisseur OIDC générique) ;
  - page « Journal d'audit » qui lit les événements déjà enregistrés par `@sim/audit` ;
  - page « Consommation » qui interroge `GET /v1/me/usage` de Nexora API.
- **Télémétrie** : PostHog, Sentry et tout appel vers `sim.ai` sont désactivés par défaut. Le copilot est désactivé jusqu'à l'existence d'un service Nexora (variable `SIM_AGENT_API_URL` vide = fonctionnalité masquée).
- **Modèles de workflows PME (v1)** : devis, relance de facture impayée, réponse support à partir d'une FAQ, tri et résumé d'e-mails entrants, compte rendu de réunion. Ils sont fournis comme modèles importables (JSON) et proposés dans chaque nouvel espace de travail (galerie du cœur si elle existe, sinon dossier « Modèles PME »).
- **Déploiement** :
  - `deploy/compose.yml` démarre WorkStudio (app, realtime, migrations), Nexora API, Nexora Connect, PostgreSQL et Redis, sur un réseau unique et sans conflit de noms ;
  - ports publiés seulement sur 127.0.0.1 par défaut ;
  - secrets générés par `scripts/init-env.sh`.

## 5. Définition de « terminé » pour la v1

La v1 est complète quand **tous** ces contrôles passent sur pc6 :

1. `scripts/check-no-ee.sh` passe : aucun fichier ni aucun objet Git ne provient de l'`ee/` d'origine. Les modules `ee/` portent l'en-tête « Nexora clean-room replacement ».
2. `scripts/check-brand.sh` passe : zéro occurrence visible de `Sim Studio`, `sim.ai`, `simstudio`, `OOMOL` ou `etalab` dans les textes d'interface et les métadonnées. Le code interne et les notices de licence sont exemptés.
3. `scripts/check-licenses.sh` passe : LICENSE, NOTICE et UPSTREAM présents pour chaque composant, `THIRD_PARTY_NOTICES.md` à jour.
4. Le contrôle de types de `workstudio/apps/sim` affiche 0 erreur. Les tests unitaires des fichiers modifiés ou ajoutés passent.
5. `docker compose -f deploy/compose.yml up -d` démarre tous les services sur arm64. `scripts/smoke.sh` vérifie :
   - la création de compte ;
   - un workflow Agent qui répond via Nexora API ;
   - les outils MCP de Nexora Connect listés ;
   - la page Consommation non vide ;
   - l'interface servie en français.
6. Les 5 modèles de workflows PME sont importables et s'exécutent avec le modèle de Nexora API (contrôle par `scripts/smoke.sh`).
7. Un README en français et un guide d'installation existent.
8. **Installation en une commande, « comme OpenClaw »** (demande du fondateur, 22/10/2026) : `curl -fsSL https://raw.githubusercontent.com/leon36000/Nexora-Studio-/main/install.sh | bash` vérifie Docker, télécharge le paquet de déploiement, pose quelques questions (organisation, adresse du propriétaire, modèle), génère les secrets, démarre la plateforme avec des images prêtes (GHCR, amd64 et arm64) et installe une commande `nexora` (démarrer, arrêter, état, journaux, mettre à jour, désinstaller). Sans image publiée, il construit depuis les sources. Vérifié sur pc6 en mode non interactif, dans un dossier et un projet compose séparés.

## 6. Ce qui est laissé à l'exécutant

- Le choix des fichiers exacts de Sim à modifier pour la marque et l'i18n, en suivant les conventions du code existant.
- Le contenu exact des textes français : ton professionnel, vouvoiement, vocabulaire PME.
- L'ordre interne des sous-étapes, tant que chaque tâche du plan se termine par un contrôle vérifiable.
