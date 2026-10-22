# 00 — Décision : partir de bases open source pour Nexora ? Lesquelles ?

> **Statut** : décision de l'agent principal, déléguée par le fondateur le 21/10/2026 (« je te laisse décider »). C'est une **proposition ferme**, à inscrire dans le document de conception de Nexora et à valider avec le fondateur pendant le brainstorming (workflow superpowers) avant toute écriture de code.
> **Mise à jour du 21/10/2026, après les remarques du fondateur** :
> - le français n'est pas un critère, car toutes les interfaces seront traduites, reprises et améliorées ;
> - la base sera téléchargée puis modifiée en profondeur ;
> - Sim lui paraît plus proche de Mistral.
>
> J'ai donc remesuré le seul vrai obstacle de Sim, son dossier propriétaire `ee/` (§2), et révisé le choix de la console : **Sim devient la base retenue pour Nexora Studio, à conditions** (§4.2). Bisheng passe en plan B.
> **Sources** : catalogues [01](01-briques-moteur-ia.md) (≈ 300 projets moteur), [02](02-briques-plateforme-console.md) (298 projets plateforme), [03](03-bases-plateforme-developpeur.md) (50 bases « console », 8 finalistes), [04](04-bases-assistant-cowork.md) (45 bases « assistant », 8 finalistes), plus mes propres vérifications dans le code (§2). Aucun prix.

## Sommaire
1. [Réponse courte](#1-réponse-courte)
   - [Nexora WorkStudio : Studio et Workflows en une seule application](#1bis-nexora-workstudio--studio-et-workflows-en-une-seule-application-idée-du-fondateur-21102026)
2. [Ce que j'ai vérifié moi-même dans le code](#2-ce-que-jai-vérifié-moi-même-dans-le-code)
3. [Règles de décision](#3-règles-de-décision)
4. [Décision par surface produit](#4-décision-par-surface-produit)
5. [Le levier majeur : une API compatible OpenAI puis Mistral](#5-le-levier-majeur--une-api-compatible-openai-puis-mistral)
6. [Les briques transverses retenues](#6-les-briques-transverses-retenues)
7. [Ce que Nexora construit elle-même](#7-ce-que-nexora-construit-elle-même)
8. [Rebranding, adaptation et suivi de l'amont](#8-rebranding-adaptation-et-suivi-de-lamont)
9. [Ce qui est écarté, et pourquoi](#9-ce-qui-est-écarté-et-pourquoi)
10. [Risques et parades](#10-risques-et-parades)
11. [Prochaine étape : valider en conditions réelles](#11-prochaine-étape--valider-en-conditions-réelles)

---

## 1. Réponse courte

- **Oui, partir de bases open source est le bon choix.** Plusieurs projets matures, sous licence vraiment libre (MIT, Apache-2.0), couvrent déjà une grande partie de ce que fait Mistral Studio. Les reprendre fait gagner des années-personnes de développement et apporte un code testé en production.
- **Mais pas une base unique pour toute la suite.** Aucun projet ne couvre seul l'ensemble de Studio (chap. 03 : « aucune base n'est complète »). Le bon découpage suit celui de Mistral : **une base par surface produit** (API, console, assistant), des **briques communes**, et une couche Nexora qui unifie le tout.
- **La perle rare la plus inattendue est chez Mistral lui-même.** Une grande partie de l'outillage de Mistral Studio est publiée sous **Apache-2.0** : SDK Python et TypeScript, SDK Workflows, Search Toolkit, Evaluations, observabilité OpenTelemetry, CLI Vibe. J'ai vérifié le fichier LICENSE dans chaque archive (§2). Si l'API de Nexora est **compatible avec celle de Mistral**, tout cet outillage fonctionne avec Nexora en changeant l'adresse du serveur, et peut être forké et renommé (§5).
- **AionUi**, suggéré par le fondateur, est un excellent projet. Il est sous Apache-2.0, très actif (33 600 étoiles) et traduit en français. Mais c'est une **application de bureau mono-utilisateur** qui pilote des agents en ligne de commande (un seul compte, SQLite, serveur dans un dépôt séparé). Ce n'est donc **pas une base pour Nexora Studio**. Je le retiens comme **base du futur client de bureau « Nexora Desktop »** (§4).
- ⚠️ **Correction** : j'avais d'abord indiqué qu'AionUi n'était pas traduit en français. C'est faux pour l'application de bureau, qui compte 13 langues dont `fr-FR` complet. Seule l'application mobile n'a pas le français.

### La décision en un tableau

| Surface produit Nexora | Équivalent Mistral | Base open source retenue | Licence | Statut |
|---|---|---|---|---|
| **Nexora API** (passerelle modèles, clés, organisations, usage) | API Mistral + Admin (clés, usage) | **OpenGateLLM** (DINUM) — fork dur | MIT | Retenu |
| **Nexora WorkStudio** (Studio + Workflows en une application : agents, workflows visuels, intégrations, connaissances) | Mistral Studio (console) + Workflows | **Sim** — fork du cœur Apache-2.0, **sans le dossier `ee/`** (modules réécrits par Nexora), copilot à reconstruire | Apache-2.0 (cœur) | Retenu, à conditions (§1bis, §4.2) ; plan B : Bisheng ; plan C : Langflow |
| **Nexora Connect** (connecteurs, OAuth, MCP) | Connecteurs Mistral (MCP) | **OpenConnector** (OOMOL) — fork, service séparé | Apache-2.0 | Retenu, à conditions (§1bis) |
| **Nexora Assistant** (chat et cowork des salariés) | Vibe Work / Le Chat | **LibreChat** — fork | MIT | Retenu |
| **Nexora Desktop** (agent local sur poste) | Vibe (bureau) | **AionUi** — fork | Apache-2.0 | Plus tard (phase 3) |
| **Nexora Code** (agent de code) | Vibe Code (CLI) | **mistral-vibe** — fork | Apache-2.0 | Plus tard (phase 3) |
| Workflows durables en code | Mistral Workflows | **Temporal** + SDK Workflows de Mistral renommé | MIT + Apache-2.0 | Phase 2 |
| Libraries / RAG par API | Libraries, Search Toolkit | **Search Toolkit de Mistral** renommé + Postgres/pgvector + Docling | Apache-2.0, PostgreSQL, MIT | Phase 2 |
| Observabilité, évaluations, prompts | Observability, Judges | **Langfuse** (cœur MIT, hors `ee/`) + Evaluations de Mistral renommé | MIT + Apache-2.0 | Phase 1–2 |

---

## 1bis. Nexora WorkStudio : Studio et Workflows en une seule application (idée du fondateur, 21/10/2026)

**Proposition du fondateur** : fusionner Studio et Workflows en une seule application, **Nexora WorkStudio**, construite à partir de **Sim**, **OpenFlow** et **OpenConnector**.

**Mon verdict : oui pour l'application unique et pour Sim + OpenConnector ; non pour OpenFlow.**

| Élément | Verdict | Pourquoi (faits vérifiés le 21/10/2026) |
|---|---|---|
| **Studio et Workflows en une seule application** | **Oui** | C'est déjà le cas chez Mistral, où Workflows est une section de Studio. C'est aussi le cas dans Sim, qui réunit agents, workflows, connaissances et intégrations. Pour une PME : une seule connexion, une seule navigation, un seul endroit pour construire, lancer et suivre. |
| **Sim** comme base de l'application | **Oui** | Voir §4.2 : cœur Apache-2.0, constructeur visuel, ≈ 370 blocs, pile Next.js + Postgres. Conditions : sortie du dossier `ee/`, copilot à reconstruire, télémétrie coupée. |
| **OpenConnector** (`oomol-lab/open-connector`) | **Oui, mais comme service séparé** (« Nexora Connect ») branché sur WorkStudio, pas fusionné dans le code de Sim | Atouts :<br>– **Apache-2.0** (fichiers LICENSE et NOTICE vérifiés) ; 6 033 étoiles ; actif ;<br>– **1 679 services** (GitHub, Gmail, Notion, Slack, Airtable…), avec des actions décrites par des schémas et des scopes, et des déclencheurs ;<br>– **accès par SDK, CLI, MCP, HTTP et OpenAPI** ;<br>– les identifiants OAuth2 et les clés restent côté serveur, jamais transmis à l'agent ;<br>– politiques d'autorisation et de blocage par action, jetons à portée limitée, journaux d'exécution masqués, rétention ;<br>– console web ; SQLite ou PostgreSQL ; Docker, Helm ; 275 fichiers de test.<br>C'est l'équivalent des **Connecteurs de Mistral**, et il servira aussi l'Assistant (LibreChat via MCP) et les agents de Nexora API. |
| **OpenFlow** (`SeeRay11/OpenFlow`) | **Non** pour WorkStudio ; au mieux une source d'idées pour un futur « Nexora Code » | – C'est un **fork d'opencode**, un agent de **développement logiciel** : des cartes de rôles « planner → architect → coder » orchestrent des agents qui écrivent du code. Ce n'est pas un outil de processus métier pour PME.<br>– Il tourne **en local et pour un seul utilisateur** (ports 4096 et 5174).<br>– Son interface est en **SolidJS**, alors que Sim est en React et Next.js : les deux canevas ne peuvent pas être fusionnés.<br>– Il a **deux mois** (créé le 18/08/2026), 131 étoiles et un seul mainteneur apparent.<br>– Sim fait déjà, en plus mûr, le canevas multi-agents dont WorkStudio a besoin. |
| L'autre « OpenConnector » (`openconnector-dev`) | Non | Licence AGPL-3.0 et « source code coming soon » : rien à reprendre. |

**Conditions pour OpenConnector** :
- **forker et maîtriser le code** : le projet n'a que 4 mois (créé le 29/06/2026) ;
- **rendre obligatoire** le chiffrement des identifiants : aujourd'hui, il n'est actif que si `OOMOL_CONNECT_ENCRYPTION_KEY` est défini ;
- **retirer** les appels aux services hébergés d'OOMOL (`console.oomol.com`, `connector.oomol.com`, `fusion-api.oomol.com`…) ;
- **enregistrer nos propres applications OAuth** chez les principaux fournisseurs (Google, Microsoft, Slack…). En auto-hébergement, c'est à nous de le faire, et la validation Google demande du temps ;
- **rattacher ses « projects » aux workspaces de Nexora** ;
- à terme, **unifier la gestion des comptes connectés** avec les blocs natifs de Sim, pour qu'une PME ne connecte son compte Google qu'une fois.

**Architecture cible de WorkStudio** (proposition, à valider au brainstorming) :

```
Nexora WorkStudio (fork de Sim, rebrandé, traduit)
 ├─ Construire : agents, workflows visuels, Playground, copilot Nexora
 ├─ Contexte   : connaissances, tables, fichiers, prompts, skills, connecteurs
 ├─ Exécuter   : exécutions, journaux, planifications, déploiements (API, chat, MCP)
 ├─ Surveiller : traces et évaluations (Langfuse)
 └─ Administrer : organisation, workspaces, membres, rôles, clés, quotas visibles
        │
        ├── Nexora API (fork d'OpenGateLLM) : modèles, clés, usage
        ├── Nexora Connect (fork d'OpenConnector) : 1 679 services, OAuth, MCP
        ├── Langfuse : observabilité ; Keycloak : identité
        └── (phase 2) Temporal + SDK Workflows renommé : workflows en code
```

**Nom** : « Nexora WorkStudio » est clair : construire (Studio) des choses qui travaillent (Work). Avant de l'adopter, vérifier sa disponibilité comme marque (INPI, EUIPO) et comme nom de domaine.

---

## 2. Ce que j'ai vérifié moi-même dans le code

Les deux agents de recherche ont classé les candidats. J'ai contrôlé directement les points qui font basculer une décision (clones en lecture seule, rien installé ni exécuté).

| Vérification | Fait constaté | Conséquence |
|---|---|---|
| **Licence de Dify** (texte brut) | Apache-2.0 modifiée : interdiction d'exploiter un environnement multi-tenant (« un tenant = un workspace ») et de retirer le logo de la console sans accord écrit ; le design de l'interface est revendiqué sous « appearance patent ». | **Éliminé** comme base (SaaS multi-PME et rebranding impossibles). |
| **Sim** : dépendance au dossier `ee/` (première mesure) | `apps/sim/ee/README.md` : « The `ee/` directory is required at build time ». La licence de `ee/` interdit la modification, la redistribution et l'usage en production sans abonnement. | Première conclusion : base écartée. **Révisée ensuite** (lignes suivantes). |
| **Sim** : surface exacte de `ee/` (mesure fine) | `ee/` ≈ **52 000 lignes** de code, plus ≈ 19 000 lignes de tests, en **14 modules**. Le cœur en importe environ **200 symboles depuis ≈ 220 fichiers** :<br>– `workspace-forking` : 22 000 lignes, 41 fichiers, 52 symboles ;<br>– `access-requests` : 5 700 lignes, 52 fichiers ;<br>– `scim` : 8 100 lignes, 26 fichiers ;<br>– `access-control` : 3 500 lignes, 37 fichiers ;<br>– `whitelabeling` : 1 000 lignes, 47 fichiers, 10 symboles (`BrandConfig`, `BrandingProvider`, `getBrandConfig`…) ;<br>– `sso` : 2 700 lignes, 6 fichiers ;<br>– les 8 autres modules sont minimes. | Remplacer `ee/` = écrire nos propres modules derrière les mêmes interfaces. **Phase 1** : modules « désactivés » (fork de workspace, demandes d'accès, SCIM, drains, rétention) ; module de **marque** Nexora ; SSO via le plugin libre de Better Auth (MIT). **Phase 2** : vraie gouvernance (contrôle d'accès, audit, SCIM). Méthode « salle blanche » : on part des appels du cœur (Apache), sans jamais ouvrir le code `ee/`. |
| **Sim : faisabilité sans `ee/`, prouvée par compilation** (22/10/2026, rapport [06](06-faisabilite-sim-sans-ee.md)) | `ee/` n'a été ni lu ni écrit sur le disque. Le cœur importe 13 modules, soit 105 chemins et 207 symboles, depuis 262 fichiers. Ils ont été remplacés par 106 fichiers Nexora (≈ 1 730 lignes) : marque « Nexora WorkStudio », SSO, SCIM et forks désactivés, contrôle d'accès branché sur le moteur déjà présent dans le cœur. Bilan : **105/105 chemins résolus, 437/437 noms exportés, 0 erreur de type**, et 0 modification du cœur. | Sortie de `ee/` confirmée. Il reste à lancer l'application et ses tests. Retrouver toutes les fonctions entreprise demandera ≈ 80 à 120 jours-développeur, car une grande partie de la logique serveur est déjà dans le cœur. Le fork devra partir d'un historique sans les objets `ee/`. |
| **Sim** : autres licences du dépôt | `LICENSE` racine Apache-2.0 ; 25 `package.json` déclarés Apache-2.0 ; `sim-cli` et `sim-setup` ont leur propre LICENSE Apache-2.0. **Seul `apps/sim/ee/` est propriétaire.** | Le reste du dépôt peut être forké. |
| **Sim** : services hébergés et télémétrie | Le **copilot** (assistant de construction, modes `assistant` / `build` / `plan`) appelle par défaut `https://www.copilot.sim.ai` (`SIM_AGENT_API_URL`), c'est-à-dire un service fermé de Sim. Le cœur contient aussi de la télémétrie PostHog (≈ 240 références) et Sentry, et des liens `sim.ai/api` (docs et contrats d'API). | Couper toute télémétrie vers Sim. **Reconstruire le service copilot** sur Nexora API : son contrat est visible côté client, sous Apache. Le constructeur visuel fonctionne sans ce service. |
| **Sim** : moteur d'exécution | Graphe (DAG) exécuté par Sim (`executor/` : orchestrateurs, `human-in-the-loop`, boucles, parallèle, sous-workflows). Tâches de fond durables avec **Trigger.dev** (Apache-2.0). Planifications, déclencheurs (API, chat, webhooks, applications), déploiement en API, chat ou MCP. **≈ 370 blocs** d'intégration et de logique (Google, Microsoft, Slack, HubSpot, Salesforce, QuickBooks, Shopify, Notion…, plus `evaluator`, `guardrails`, `knowledge`, `mcp`). | Fonctionnellement proche de la partie « Build » de Studio et de ses Workflows, et plus complet (no-code, intégrations). Techniquement différent de Mistral Workflows, qui fonctionne en code Python sur Temporal (§4.5). |
| **Coze Studio** : activité | Derniers commits publics : 25/03, 09/04, 20/04 et 29/07/2026 ; aucun ensuite. Le rapport 03 compte 142 commits en août 2025, contre 1 seul depuis mai 2026. | Écarté (amont quasi figé, failles corrigées en 2026). |
| **Bisheng** : fonctions « commercial edition » | Le module `commercial_license` suit l'état de licences de **composants commerciaux séparés** (`gateway`, `etl`, `dashboard`, `subscription`) : bandeaux et rafraîchissement horaire. Le cœur du dépôt reste sous Apache-2.0. | Retenu. Nexora n'utilisera pas ces composants commerciaux (le traitement documentaire passera par Docling). |
| **OpenGateLLM** | MIT (© DINUM 2024), Python, environ 52 000 lignes et 240 fichiers de test. API OpenAPI 0.9.0 avec 58 opérations : chat, embeddings, rerank, OCR, transcription, modèles, clés, organisations, rôles, utilisateurs, fournisseurs, routeurs, usage, SSO OIDC. Postgres et Redis. Décisions d'architecture documentées (ADR : « clean architecture », QoS, mapping des schémas). | Retenu comme base de Nexora API : propre, souverain, assez petit pour qu'on le maîtrise entièrement. |
| **Outillage Mistral sous Apache-2.0** (archives PyPI) | Fichier `LICENSE` Apache-2.0 présent dans `mistralai-search-toolkit` 0.0.14 (229 fichiers, ≈ 35 000 lignes), `mistralai-evaluations` 0.8.4 (≈ 14 600), `mistralai-workflows` 3.16.0 (≈ 74 500), `mistralai-otel-observability` 0.4.1 (≈ 6 700), `mistralai-workflows-plugins-mistralai` 3.16.0 (≈ 14 800). | Code de niveau production, réutilisable avec attribution (§5). |
| **SDK Workflows de Mistral** : couplage | Le worker se connecte **directement à Temporal** (`TEMPORAL_SERVER_URL`, `TEMPORAL_API_KEY`, TLS, task queue) et interroge un « worker server » (`SERVER_URL`, appel `whoami`) pour la découverte et l'enregistrement. Cette API est décrite dans la spec OpenAPI publique (`workflows.*`). | Réutilisable si Nexora API implémente la partie serveur et fait tourner son propre Temporal. |
| **Search Toolkit de Mistral** : couplage | Architecture en plugins (loaders, extractors, splitters, enrichers, retrievers, index Vespa et Postgres). Embeddings, OCR et transcription passent par l'API Mistral (`MistralEmbedder`, `MistralOCRExtractor`, `MistralAudioTranscriptionExtractor`). L'extracteur `PyMuPDFExtractor` est optionnel (PyMuPDF est sous AGPL : à exclure). | Fonctionne contre une API compatible Mistral : Nexora. |
| **AionUi** : français | `packages/desktop/.../locales/` : 13 langues dont `fr-FR` (20 espaces de noms). Le mobile n'a que 5 langues, sans le français. | Corrige mon premier message. |

---

## 3. Règles de décision

1. **Veto de licence** : seulement MIT, Apache-2.0, BSD, MPL-2.0 pour du code qu'on modifie et qu'on distribue.
   - Aucune clause de marque, aucune interdiction de SaaS multi-tenant, aucune licence « source-available ».
   - Aucune dépendance de compilation vers un dossier `ee/` propriétaire.
   - L'AGPL n'est tolérée que pour un service tiers **non modifié**, et jamais dans un paquet livré on-prem.
2. **Veto d'activité** : le projet doit avoir eu des commits dans les 3 derniers mois et ne pas être archivé.
3. **Gouvernance multi-PME** : on vise un SaaS qui héberge de nombreuses PME. Il faut donc des organisations, des rôles et l'isolation des données dans la partie libre.
4. **Facilité d'usage** : critère prioritaire du fondateur (« le plus facile d'utilisation possible »). La **langue n'est pas un critère** : toutes les interfaces seront traduites (décision du fondateur). Il reste un coût à chiffrer : il est faible si un système de traduction existe, et réel s'il faut d'abord extraire tous les textes.
5. **Coût de la personnalisation** : rebranding, divergence avec l'amont, nombre de services à exploiter.
6. **Cohérence de la pile** : Python pour l'IA, TypeScript pour les interfaces, Postgres en priorité, Kubernetes pour l'hébergement.

---

## 4. Décision par surface produit

### 4.1 Nexora API — base : OpenGateLLM (MIT, DINUM)

- **Pourquoi** :
  - C'est une passerelle « souveraine » conçue pour des modèles auto-hébergés, déjà utilisée par l'administration française (Albert).
  - Elle est compatible OpenAI et couvre déjà organisations, rôles, utilisateurs, clés, usage, routage multi-fournisseurs, SSO OIDC, OCR, transcription et rerank.
  - Son architecture est propre et documentée (ADR), avec des tests.
  - Sa petite taille (≈ 52 000 lignes) permet un **fork dur** que Nexora maîtrise entièrement.
  - L'origine publique française est un atout de confiance pour des PME.
- **À ajouter** :
  - les endpoints manquants de Studio, en suivant la forme de l'API Mistral : agents et conversations, fichiers, batch, libraries, workflows, observabilité (§5) ;
  - la modération et les guardrails ;
  - la mesure fine de l'usage par workspace ;
  - une console d'administration intégrée à Nexora Studio.
- **Alternative** : LiteLLM (MIT hors `enterprise/`), utilisé **comme bibliothèque** pour se brancher sur des fournisseurs externes si besoin. Il n'est pas retenu comme base : SSO et une partie de la gouvernance sont sous licence commerciale, et son score OpenSSF est de 6,1/10.

### 4.2 Nexora Studio (console) — base : Sim (cœur Apache-2.0), à conditions

**Pourquoi Sim, une fois la traduction sortie des critères** :
- **Le plus proche de l'expérience « Build » de Mistral Studio, et plus complet** :
  - agents ;
  - workflows visuels avec boucles, parallèle, sous-workflows et pause humaine ;
  - ≈ 370 blocs d'intégration et de logique, parlants pour une PME (Google, Microsoft, Slack, HubSpot, Salesforce, QuickBooks, Shopify, Notion…) ;
  - base de connaissances, tables, fichiers ;
  - journaux d'exécution, planifications, déclencheurs ;
  - déploiement en API, en chat ou en serveur MCP ;
  - blocs `evaluator` et `guardrails` ;
  - SDK Python et TypeScript, application de bureau, chart Helm, assistant d'installation.
- **Facilité d'usage** : c'est le point fort affiché de Sim (« build agents visually, conversationally, or with code »). Il couvre la **couche low-code que Mistral annonce sans l'avoir livrée** : c'est précisément ce qu'il faut à des PME.
- **Pile moderne et cohérente avec le reste de Nexora** : Next.js, TypeScript, PostgreSQL (Drizzle), Better Auth, shadcn/ui, React Flow, Trigger.dev, OpenTelemetry. Tout s'appuie sur Postgres, plus léger à exploiter que Bisheng (MySQL, Milvus, Elasticsearch, etcd…).
- **Code vivant et testé** : 2 708 commits sur 90 jours, ≈ 3 700 fichiers de test.

**Conditions** :
1. **Sortir du dossier `ee/` dès le fork**. Supprimer `apps/sim/ee/` (≈ 52 000 lignes sous licence propriétaire) et écrire nos propres modules derrière les mêmes interfaces (§2) :
   - en **salle blanche** : on déduit les interfaces des ≈ 220 fichiers du cœur qui les appellent, sans jamais ouvrir le code `ee/` ;
   - **phase 1** :
     - modules désactivés : fork de workspace, demandes d'accès, SCIM, data drains, rétention ;
     - module de **marque Nexora**, qui sert directement le rebranding ;
     - SSO OIDC/SAML via le plugin libre de Better Auth (MIT), branché sur Keycloak ;
   - **phase 2** : contrôle d'accès, journal d'audit, SCIM, usage par organisation, écrits par Nexora.
2. **Reconstruire le copilot** : un service Nexora, branché sur Nexora API, qui respecte le contrat attendu par le client Apache. Le service de Sim est hébergé et fermé.
3. **Couper toute télémétrie** vers Sim (PostHog, Sentry, liens `sim.ai`) et **brancher les modèles sur Nexora API** (compatible OpenAI).
4. **Internationaliser** : Sim n'a pas de système de traduction. Il faut extraire les textes vers `next-intl` ou `i18next`, puis traduire en français. C'est un chantier ponctuel, outillé par l'IA, mais à prévoir.
5. **Rebranding complet** (noms, logos, thèmes, e-mails, docs) et **ajout des écrans développeur** façon Studio : Playground modèles, clés et usage (Nexora API), prompts versionnés, observabilité (Langfuse).

**Plans de repli** :
- **Plan B : Bisheng** (Apache-2.0). C'est la seule base libre dont la **gouvernance est déjà dans le cœur** : multi-tenant, départements, RBAC et ReBAC via OpenFGA, SSO et LDAP, audit, approbations, quotas. Elle a aussi des workflows avec pause humaine, du RAG, des skills et des évaluations. En revanche : pile lourde, intégrations chinoises à retirer, marque très présente, ergonomie inconnue (rapport [03](03-bases-plateforme-developpeur.md) §2.2).
- **Plan C : Langflow** (MIT, sans `ee/`). Bon constructeur, mais plus orienté développeurs, avec une gouvernance faible.

**Pourquoi pas Dust, Coze ou Dify** : voir §2 et §9.

### 4.3 Nexora Assistant (salariés des PME) — base : LibreChat (MIT)

- **Pourquoi** : c'est la base libre la plus complète **sans aucun dossier commercial**. Elle réunit :
  - SSO SAML, OIDC et LDAP, rôles et administration ;
  - agents, MCP, skills, tâches planifiées, artefacts, mémoires, approbations, voix ;
  - des endpoints « custom » compatibles OpenAI, branchables sur Nexora API ;
  - un chart Helm.

  Rapport [04](04-bases-assistant-cowork.md) §3.1.
- **À ajouter** :
  - les 59 % de clés de traduction françaises manquantes ;
  - le rebranding ;
  - la publication des agents, skills et workflows de Nexora Studio dans l'assistant, comme Mistral le fait de Studio vers Vibe ;
  - les connecteurs PME via MCP.
- **Alternatives** :
  - **AnythingLLM** (MIT, entièrement en français, un seul conteneur) pour une édition « Nexora Box » installée chez une petite PME, plus tard ;
  - **Onyx** n'est pas retenu : SSO, SCIM, audit et multi-tenant sont dans `ee/` (licence commerciale).

### 4.4 Nexora Desktop — base : AionUi (Apache-2.0), phase 3

- **Pourquoi** :
  - Meilleur « cowork » de bureau du marché libre : multi-agents (Claude Code, Codex, Gemini…), mode équipe, tâches planifiées, skills, MCP, aperçu de fichiers, génération Office.
  - Français complet, 662 fichiers de test.
  - Son caractère mono-utilisateur est **exactement** ce qu'on attend d'un client de bureau.
- **À vérifier avant** :
  - qu'on peut le brancher sur une adresse d'API compatible OpenAI (Nexora API) ;
  - les dépendances vers ses dépôts Rust séparés (AionCore, aionrs) ;
  - l'absence de bac à sable pour les agents sur le poste.

### 4.5 Sim ressemble-t-il à Mistral Workflows ? Oui pour l'usage, non pour la technique

| | Mistral Workflows | Sim |
|---|---|---|
| Façon de construire | **Code Python** (décorateurs, activités, signaux, requêtes, mises à jour) | **Visuel** (canevas de blocs), conversationnel (copilot) ou code (bloc `function`) |
| Moteur | **Temporal** : exécution durable par rejeu d'historique ; survit aux pannes ; workers chez le client | Moteur maison en graphe (DAG) + **Trigger.dev** pour les tâches de fond (relances, files) |
| Pause humaine, sous-workflows, boucles, parallèle, planification | Oui | Oui |
| Console | Liste, page de workflow (taux d'erreurs, latence, déploiements), exécutions en Gantt, publication dans Vibe | Éditeur visuel, journaux et traces d'exécution, déploiements (API, chat, MCP), planifications |
| Intégrations | Connecteurs MCP | ≈ 370 blocs + MCP |
| Public visé | Développeurs | Développeurs **et** profils non techniques |

**Conclusion** :
- Pour une PME, Sim offre **ce que Mistral Workflows apporte à l'utilisateur, en plus accessible**.
- Pour les clients développeurs qui veulent la robustesse de Mistral Workflows (processus longs, exécution chez eux), Nexora ajoutera **Temporal + le SDK Workflows de Mistral** (Apache-2.0, renommé, §5) en phase 2.
- Nexora aura ainsi les deux modes : **visuel (Sim) et code (Temporal)**. Mistral n'offre aujourd'hui que le second.

### 4.6 Nexora Code — base : mistral-vibe (Apache-2.0), phase 3

- La CLI de codage de Mistral est libre : moteur Python, interface terminal, ACP pour JetBrains et Zed, MCP, skills, hooks.
- Si Nexora API est compatible Mistral, elle fonctionne immédiatement.
- Alternative : OpenHands (MIT) pour des agents de code distants.

---

## 5. Le levier majeur : une API compatible OpenAI puis Mistral

**Principe** : Nexora API parle d'abord le format **OpenAI**, que tous les outils du marché comprennent (LibreChat, Bisheng, Langflow…). Elle ajoute ensuite progressivement les endpoints au **format Mistral** (agents, conversations, libraries, workflows, observabilité), décrits dans la spec OpenAPI publique (catalogue : `mistral-studio/40-api-catalogue-endpoints.md`).

**Ce que cela débloque, avec du code sous Apache-2.0 déjà écrit et testé par Mistral** :

| Outil Mistral (Apache-2.0) | Usage pour Nexora | Effort côté Nexora |
|---|---|---|
| SDK `mistralai` (Python) et `@mistralai/mistralai` (TypeScript) | SDK officiels Nexora (forkés, renommés) | Implémenter les endpoints correspondants |
| `mistralai-workflows` + plugins | SDK « Nexora Workflows » : workflows durables en Python, agents durables, workflows conversationnels | Faire tourner Temporal et implémenter l'API worker (découverte, enregistrement, exécutions, événements) |
| `mistralai-search-toolkit` (+ Postgres) | Moteur de « Libraries » et de recherche agentique | Endpoints embeddings, OCR, transcription au format Mistral ; retirer l'extracteur PyMuPDF (AGPL) |
| `mistralai-evaluations` | SDK d'évaluations hors ligne (datasets, évaluateurs, statistiques, optimisation GEPA) | Endpoints d'observabilité, ou mode local |
| `mistralai-otel-observability` | Traces OpenTelemetry avec masquage des données sensibles | Collecteur OTel vers Langfuse |
| `mistral-vibe` | Nexora Code | Rebranding |

**Bonus commercial** : un client de Mistral peut passer à Nexora en changeant l'adresse et la clé de l'API.

**Précautions** (à faire valider par un juriste) :
- conserver les fichiers LICENSE et NOTICE ainsi que l'attribution ;
- ne jamais utiliser la marque « Mistral » ;
- ne pas recopier la documentation de Mistral (on écrit la nôtre) ;
- la compatibilité d'interface (API) est en principe libre en droit européen, mais il faut la confirmer.

---

## 6. Les briques transverses retenues

Choix faits à partir des catalogues [01](01-briques-moteur-ia.md) et [02](02-briques-plateforme-console.md). La colonne « Écarté » donne la raison principale.

| Besoin | Retenu | Licence | Écarté (raison) |
|---|---|---|---|
| Service de modèles (GPU) | **vLLM** ; **SGLang** en second | Apache-2.0 | TGI (archivé 03/2026) |
| Petits déploiements, CPU, on-prem PME | **llama.cpp** ou **Ollama** | MIT | — |
| Embeddings et reranking | **Text Embeddings Inference (TEI)** | Apache-2.0 | — |
| Workflows durables | **Temporal** | MIT | Restate (BSL), Inngest (SSPL), n8n (Sustainable Use) |
| Agents (dans le code Nexora) | **PydanticAI** (Python), ou le moteur de la base retenue | MIT | — |
| Connecteurs vers les outils des PME (OAuth, actions, MCP) | **OpenConnector** (OOMOL) devient **Nexora Connect** : 1 679 services, SDK, CLI, MCP, HTTP | Apache-2.0 | Nango, Airbyte (ELv2), Pipedream (source available), Composio (service hébergé) |
| MCP | **SDK MCP officiels**, **FastMCP** ; passerelle **IBM ContextForge** si besoin | SDK : MIT, en passage vers Apache-2.0 ; FastMCP et ContextForge : Apache-2.0 | — |
| Bacs à sable de code | **E2B** (runtime auto-hébergé) ; **microsandbox** pour l'on-prem léger | Apache-2.0 | Daytona (AGPL, dépôt figé) |
| Document AI | **Docling** ; modèles **granite-docling** ou **LightOnOCR-2** (LightOn, France) | MIT, Apache-2.0 | PyMuPDF (AGPL) ; poids de Marker et Surya (OpenRAIL-M avec seuil) |
| Transcription | **faster-whisper** + Whisper large-v3-turbo ; **Voxtral Mini Realtime** (poids Apache) via vLLM ; **pyannote** (diarisation) | MIT, Apache-2.0 | LinTO-STT (AGPL) |
| Synthèse vocale | **Kyutai TTS** (français) ; **Chatterbox** (poids à vérifier) | CC-BY-4.0, MIT | Voxtral TTS (CC-BY-NC), F5-TTS (poids non commerciaux), Fish Speech |
| Agents vocaux | **LiveKit** + **LiveKit Agents** (comme Mistral) ; **Pipecat** en second | Apache-2.0, BSD-2 | — |
| Guardrails, données personnelles | **NeMo Guardrails**, **Guardrails AI**, **Presidio** (RGPD) ; **garak** pour les tests d'attaque | Apache-2.0, MIT | LLM Guard, PyRIT (archivés) |
| Observabilité, évaluations, prompts | **Langfuse** (cœur MIT, sans `ee/`) + **OpenTelemetry** ; **promptfoo** (tests en CI) | MIT, Apache-2.0 | Phoenix (ELv2) |
| Identité, SSO, SCIM | **Keycloak** (fournisseur d'identité unique pour toutes les surfaces) | Apache-2.0 | Zitadel (AGPL) |
| Autorisation fine | **OpenFGA** (projet CNCF ; base des futurs modules de contrôle d'accès de Nexora Studio) | Apache-2.0 | Permify (AGPL) |
| Tâches de fond durables (déjà dans Sim) | **Trigger.dev** (auto-hébergé) | Apache-2.0 | — |
| Authentification dans la console (déjà dans Sim) | **Better Auth** + plugin SSO, fédérés avec Keycloak | MIT | Module `ee/sso` de Sim (propriétaire) |
| Secrets | **OpenBao** | MPL-2.0 | Vault (BSL) |
| Mesure de l'usage | **OpenMeter** (événements d'usage, sans tarification pour l'instant) | Apache-2.0 | Lago (AGPL) |
| Base de données | **PostgreSQL** (+ **pgvector**), opérateur **CloudNativePG** | PostgreSQL, Apache-2.0 | — |
| Cache et files | **Valkey** | BSD-3 | Redis 8 (tri-licence avec AGPL) |
| Stockage objet | **SeaweedFS** | Apache-2.0 | MinIO (AGPL, archivé), Garage (AGPL) |
| Analytique des traces | **ClickHouse** (requis par Langfuse) | Apache-2.0 | — |
| Hébergement | **Kubernetes**, **Helm**, **Argo CD**, **OpenTofu**, **cert-manager** ; **Zarf** pour l'on-prem déconnecté | Apache-2.0, MPL-2.0 | — |
| Console web (code Nexora) | **Next.js**, **React**, **shadcn/ui**, **Radix**, **TanStack**, **xyflow**, **Monaco**, **rjsf**, **next-intl** ou **i18next** | MIT, Apache-2.0 | Constructeurs d'apps internes (ToolJet AGPL, Budibase) |
| Documentation et SDK | **Fumadocs** ; **Scalar** ; génération de SDK par **openapi-generator** ou **Fern** (en plus des SDK Mistral forkés) | MIT, Apache-2.0 | Speakeasy (ELv2) |

**Modèles open-weight par défaut** (poids sous Apache-2.0 ou MIT seulement, licence à relire modèle par modèle, cf. [01](01-briques-moteur-ia.md) §11) :
- LLM : Qwen3 et Qwen3.5, gpt-oss, EuroLLM, Apertus, **Luciole (OpenLLM-France)**, et les modèles Mistral **réellement** sous Apache-2.0 (à vérifier un par un : plusieurs grands modèles récents ne le sont pas) ;
- embeddings : BGE-M3, Qwen3-Embedding ;
- OCR : granite-docling, LightOnOCR-2 ;
- transcription : Whisper et Voxtral Mini Realtime ;
- synthèse vocale : Kyutai.

**Exclus par défaut** : Jina (licence non commerciale), Llama (licence communautaire), Voxtral TTS (non commercial).

---

## 7. Ce que Nexora construit elle-même

La valeur propre de Nexora est ce qui n'existe nulle part en open source :
1. **Une console unifiée « Nexora Studio »** : une seule navigation, une seule identité visuelle, une seule connexion, **le français d'abord**. Elle rassemble le constructeur (Sim), la partie développeur (Playground, clés, usage : Nexora API), l'observabilité (Langfuse) et l'administration.
2. **Une expérience PME** :
   - un assistant de démarrage guidé ;
   - des **modèles métiers** prêts à l'emploi (support client, devis, RH, comptabilité, prospection…) ;
   - des explications simples et des valeurs par défaut sûres ;
   - pas de jargon. C'est la « couche low-code » que Mistral annonce sans l'avoir livrée (chap. 31).
3. **Le plan de contrôle multi-PME** : il crée une PME, ses workspaces, ses utilisateurs et ses quotas en une fois, dans toutes les briques (Keycloak, Nexora API, Sim, LibreChat, Langfuse).
4. **La colle entre les briques** :
   - une clé API et une mesure d'usage uniques ;
   - la publication des agents et skills de Studio vers l'Assistant ;
   - des connecteurs MCP partagés.
5. **L'hébergement souverain** (UE) et une **édition on-prem** empaquetée, du serveur unique pour une PME jusqu'au cluster.
6. **Les réponses aux irritants des utilisateurs de Mistral** (chap. [37](../mistral-studio/37-retours-utilisateurs.md)) :
   - quotas et limites **visibles en temps réel** dans la console ;
   - **une seule clé** et une facturation lisible (le modèle tarifaire reste à définir, hors périmètre pour l'instant) ;
   - une interface graphique pour les workflows (Sim) ;
   - documentation, tutoriels et support **en français**, pensés pour les non-développeurs.

---

## 8. Rebranding, adaptation et suivi de l'amont

- **Règles juridiques** (MIT et Apache-2.0) :
  - garder les fichiers `LICENSE` et `NOTICE` d'origine ;
  - tenir un fichier `THIRD_PARTY_NOTICES` à jour ;
  - signaler les fichiers modifiés (Apache-2.0, § 4b) ;
  - ne jamais utiliser les marques d'origine (Mistral, Sim, LibreChat, AionUi…) dans le nom ou la communication de Nexora ;
  - pour Sim : **ne jamais ouvrir, copier ni s'inspirer du code de `apps/sim/ee/`**. Le supprimer dès le premier commit du fork, et écrire les remplacements à partir des seuls appels du cœur Apache (salle blanche). Garder une trace de cette méthode dans le dépôt.
- **Rebranding complet** : noms, logos, favicons, thème, textes, e-mails, liens et télémétrie (désactiver ou rediriger tout envoi vers les éditeurs d'origine). Les noms de paquets internes ne changent pas quand c'est possible (par exemple le paquet Python `bisheng`), pour limiter les conflits lors des mises à jour.
- **Suivi de l'amont** :
  - **fork souple** (dépôt amont suivi, personnalisations isolées dans des couches séparées) pour Sim, LibreChat et AionUi, avec fusion à cadence fixe sur des versions publiées. Pour Sim, chaque fusion doit écarter les changements de `ee/` et vérifier que les nouveaux imports `@/ee/…` sont couverts par nos modules ;
  - **fork dur** pour OpenGateLLM, qui deviendra le cœur de Nexora API.
- **Traduction** : français complet en premier, puis anglais.
- **Sécurité** :
  - veille des avis de sécurité (GHSA, CVE) de chaque base ;
  - dépendances figées avec un âge minimal des versions, comme le fait Mistral après l'incident « Mini Shai-Hulud » ;
  - audit de sécurité avant la mise en production.

---

## 9. Ce qui est écarté, et pourquoi

| Projet | Motif principal | Source |
|---|---|---|
| Dify, FastGPT | Multi-tenant interdit sans accord écrit ; logo obligatoire | §2, [03](03-bases-plateforme-developpeur.md) |
| Open WebUI | Clause de marque (au-delà de 50 utilisateurs) | [04](04-bases-assistant-cowork.md) |
| LobeHub | Licence commerciale requise pour un dérivé | [04](04-bases-assistant-cowork.md) |
| n8n | Sustainable Use License | [01](01-briques-moteur-ia.md) |
| Suna | Elastic License 2.0 (pas de service hébergé) | [04](04-bases-assistant-cowork.md) |
| Onyx | SSO, SCIM, audit et multi-tenant dans `ee/` (licence commerciale) | [04](04-bases-assistant-cowork.md) |
| Dust | Auto-hébergement non documenté, authentification WorkOS (service commercial), infrastructure très lourde | [03](03-bases-plateforme-developpeur.md), [04](04-bases-assistant-cowork.md) |
| Coze Studio | Amont quasi figé depuis mai 2026 | §2, [03](03-bases-plateforme-developpeur.md) |
| MaxKB | GPL-3.0 et modules fermés (`xpack`) | [03](03-bases-plateforme-developpeur.md) |
| Cherry Studio, Khoj | AGPL-3.0 | [04](04-bases-assistant-cowork.md) |
| OpenClaw | Modèle de confiance « un opérateur par passerelle » | [04](04-bases-assistant-cowork.md) |
| Flowise, Chainlit, LangChain Open Agent Platform | Archivés | [01](01-briques-moteur-ia.md), [03](03-bases-plateforme-developpeur.md) |
| La Suite Conversations (DINUM) | Trop jeune (« very early stage »). À surveiller : souverain et français | [04](04-bases-assistant-cowork.md) |
| OpenFlow (`SeeRay11/OpenFlow`) | Fork d'opencode pour des pipelines d'agents de développement, en local et pour un seul utilisateur ; interface SolidJS, impossible à fusionner avec Sim ; 2 mois d'existence. Gardé comme idée pour un futur Nexora Code | §1bis |
| OpenConnector (`openconnector-dev`) | AGPL-3.0, code non publié | §1bis |

---

## 10. Risques et parades

| Risque | Parade |
|---|---|
| **Trop de briques et de bases de données** (Postgres, MongoDB pour LibreChat, ClickHouse pour Langfuse) | Livrer par phases ; bases managées en SaaS ; à terme, converger vers Postgres là où c'est possible. Sim et OpenGateLLM utilisent déjà Postgres. |
| **Sim : sortie du dossier `ee/`** (≈ 200 symboles, ≈ 220 fichiers du cœur) et risque juridique de contamination | Suppression de `ee/` au premier commit ; modules Nexora écrits en salle blanche à partir des appels du cœur ; d'abord désactivés, puis réimplémentés ; revue juridique. |
| **Sim : copilot hébergé chez Sim** (service fermé) | Service copilot Nexora sur Nexora API, en respectant le contrat du client. En attendant, le constructeur visuel fonctionne sans lui. |
| **Sim : petite équipe principale** (11 auteurs sur 90 jours) et projet jeune (2025) | Fork souple, mais capacité à vivre sans l'amont ; plan B (Bisheng) documenté. |
| **OpenConnector : projet jeune** (4 mois) ; chiffrement des identifiants optionnel ; dépendances aux services d'OOMOL ; applications OAuth à enregistrer soi-même | Fork maîtrisé ; chiffrement rendu obligatoire ; appels OOMOL retirés ; audit de sécurité de la gestion des identifiants ; enregistrement OAuth anticipé pour les fournisseurs prioritaires (Google, Microsoft, Slack). |
| **Doublon entre les intégrations de Sim et celles d'OpenConnector** | Garder les blocs natifs de Sim (déclencheurs, profondeur) et ajouter un bloc « Nexora Connect » et MCP pour les 1 679 services ; à terme, une seule gestion des comptes connectés. |
| **Sim : aucun système de traduction** | Extraction des textes outillée (codemods, IA) vers `next-intl`, puis traduction française ; à faire tôt, avant que la divergence ne grandisse. |
| OpenGateLLM est en bêta, avec une petite équipe | Fork dur assumé : Nexora devient mainteneur de sa version ; suivi des ADR amont. |
| SDK Workflows et Search Toolkit de Mistral conçus pour l'API Mistral | Compatibilité d'API par étapes, tests contractuels générés à partir de la spec OpenAPI. |
| Changement de licence futur d'une base | Une licence MIT ou Apache déjà accordée ne se retire pas : on garde le dernier code libre (fork). |
| Failles de sécurité dans les bases (LibreChat : 10 avis GHSA sur la première page ; Langflow : nombreux avis en 2026) | Veille, mises à jour régulières, audit, isolation réseau, bacs à sable pour l'exécution de code. |
| Juridique (compatibilité API Mistral, attribution, marques) | Revue par un juriste avant le lancement commercial. |

---

## 11. Prochaine étape : valider en conditions réelles

> **Fait le 22/10/2026** : voir le [rapport du test réel](../test-reel/01-rapport-test-reel.md).
> - Sim, OpenGateLLM, OpenConnector et LibreChat tournent ensemble sur pc6 et se parlent par l'API compatible OpenAI et par MCP.
> - Les scénarios « devis » (Sim) et « relance de facture » (LibreChat) ont réussi, de même que l'exécution d'une action et la mesure de la consommation.
> - Points restants : bases de connaissances (modèle d'embeddings), connecteurs OAuth, invitations par e-mail.

La décision de ce document est prise sur pièces : licences, code, activité. **Deux points ne se jugent qu'en faisant tourner les logiciels** : la facilité d'usage pour une PME, et la vraie qualité de l'intégration avec Nexora API.

**Proposition (soumise à l'accord du fondateur, car elle exécute du code tiers sur sa machine)** : un **test grandeur nature jetable** (« spike ») de quelques jours.
- **Installation** en local, par docker compose, de **Sim (sans `ee/`), Bisheng, LibreChat, OpenGateLLM et AionUi**.
- **Cinq scénarios PME** joués sur chacun :
  1. créer un assistant support client avec une FAQ ;
  2. connecter une boîte e-mail ou un agenda ;
  3. automatiser un devis ;
  4. ajouter un utilisateur avec des droits limités ;
  5. brancher le modèle via OpenGateLLM.
- **Livrables** : captures d'écran, temps passé, points bloquants. Puis confirmation de Sim pour la console, ou bascule vers le plan B (Bisheng). On vérifiera aussi que Sim compile sans `ee/` avec de simples modules désactivés.

**Ensuite** : brainstorming avec le fondateur (superpowers) pour écrire le document de conception de Nexora. Il intègre ce choix de bases, la cible PME, le périmètre de la première version et l'hébergement. Viendra ensuite le plan d'implémentation.
