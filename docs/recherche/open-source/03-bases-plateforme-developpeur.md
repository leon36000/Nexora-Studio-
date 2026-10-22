# 03 — Bases open source pour la console développeur + API de Nexora Studio

> État au 21/10/2026. Question : quel projet open source peut servir de **base** à la console développeur et à l'API (équivalent de Mistral Studio), et quelles briques le complètent ?
> Grille appliquée : `grille-bases.md` (critères éliminatoires, C1–C10). Aucun prix. Aucun dépôt installé ni exécuté : lecture de code (clones `--depth 1`, plus historiques sans blobs pour l'activité), fichiers LICENSE bruts, métadonnées ecosyste.ms, pages « security advisories » publiques.
> Marques : 🆕 = absent de la base existante ; ⚠️ contredit = contredit la base ; « confirme » = recoupe `open-source/01-briques-moteur-ia.md`.

---

## En bref

**Réponse courte.** Aucune « perle rare » ne couvre seule la console Studio dans un cadre PME, multi-client et distribuable on-prem. Deux bases sont plausibles, une troisième est la plus proche fonctionnellement mais à risque. Les passerelles et les builders sont à prendre comme briques.

**Classement (argumenté, à valider par l'agent principal)**

| Rang | Projet | Licence (fichier brut) | Rôle | Verdict |
|---|---|---|---|---|
| 1 | **Bisheng** (`dataelement/bisheng`) | Apache-2.0 | Base console + API | **Meilleur compromis gouvernance / on-prem / licence.** Seule base qui passe à la fois le seuil C4 (multi-tenant, RBAC/ReBAC, SSO, audit, clés API) et le seuil C5 (déploiement Docker autonome). Freins : interface sans français, marque très présente, fonctions « commercial edition » gardées par un flag dans du code Apache-2.0 (à clarifier). |
| 2 | **Dust** (`dust-tt/dust`) | MIT | Base « agents + connecteurs + espaces » | **Meilleure couverture produit et seule base franco-compatible (fr-FR natif) sous MIT à forte activité** (58 auteurs sur 90 j). Freins : déploiement autonome non documenté, infrastructure très lourde (≈13 services), authentification via WorkOS. Pertinent surtout si le modèle est SaaS-first. |
| 3 | **Coze Studio** (`coze-dev/coze-studio`) | Apache-2.0 | Console agents la plus proche de Studio | **Couverture la plus proche de Studio sur le cœur console** (agents, workflows, prompts, plugins, RAG, clés API, espaces). Mais **l'amont public est presque figé** (1 commit en 90 j, aucun depuis le 29/07/2026), **SSO et audit absents**, interface EN/ZH seulement, marque lourde (257 noms de paquets `@coze-*/`). Fork de facto dur. 🆕 |

**Briques complémentaires à retenir (évaluées en profondeur ou citées)**
- **LiteLLM** (`BerriAI/litellm`, MIT hors `enterprise/`) : passerelle la plus mature (C2 5/5, 332 auteurs sur 90 j). SSO et plusieurs fonctions de gouvernance sont en licence commerciale. ⚠️ confirme la base (« MIT hors enterprise/ »).
- **OpenGateLLM** (`etalab-ia/OpenGateLLM`, MIT, DINUM) : passerelle souveraine française qui expose déjà clés, organisations, rôles, routeurs, usage, SSO, OCR, audio et recherche. Petite et déclarée bêta. 🆕 (les routes admin et SSO n'étaient pas documentées dans la base) ; confirme la licence MIT.
- **Langflow** (`langflow-ai/langflow`, MIT) : meilleur builder visuel (C2 4,5 ; C6 et C7 les plus élevés), gouvernance faible (C4 2,5). Candidat « éditeur d'agents » plutôt que base console. Confirme la base.
- **Coze Loop** (`coze-dev/coze-loop`, Apache-2.0) : observabilité, prompts et évaluations, très actif (67 commits sur 90 j), mais « édition open source » présentée comme sous-ensemble de la version commerciale. 🆕
- **Langfuse** (MIT hors `ee/`) et **Opik** (Apache-2.0) : briques observabilité/évaluation, non évaluées en profondeur ici. Confirme la base.

**Éliminés pour une base** (détail au §1) : Dify et FastGPT (SaaS multi-tenant et logo interdits sans accord écrit), Open WebUI et LobeHub (clauses de marque ou dérivés commerciaux), n8n (Sustainable Use). Flowise, LangChain Open Agent Platform et Chainlit sont **archivés**, TaskingAI est inactif depuis décembre 2024, PySpur et Portkey n'ont pas de push depuis plus de 3 mois.

**Constats majeurs**
1. Le marché des bases « console agents » est dominé par des licences à clauses (Dify, FastGPT, LobeHub, Open WebUI). Les seules bases MIT/Apache qui couvrent le multi-tenant sans clause sont Bisheng, Dust et Coze Studio.
2. L'open-core est la règle, pas l'exception : `ee/` (Langfuse, Agenta, Mastra, Onyx, Activepieces), `enterprise/` (LiteLLM), `apps/sim/ee` (Sim, licence « production = abonnement »), `xpack` (MaxKB, importé mais absent du dépôt). Pour chaque base, SSO, SCIM, audit et marque blanche doivent être vérifiés ligne à ligne avant tout choix.
3. Coze Studio, pourtant le plus proche de Studio, a perdu son rythme public : 142 commits en août 2025, 1 commit depuis mai 2026 (le 29/07/2026). 🆕 À confirmer auprès de Coze avant toute décision.
4. Aucune base n'a d'API batch, de Document AI ou de traces OpenTelemetry réellement intégrées à sa console : ces briques viennent d'une passerelle (LiteLLM, OpenGateLLM) ou d'un outil d'observabilité.
5. Sur le plan on-prem, Dust est le plus difficile à déployer : aucun guide d'auto-hébergement dans le dépôt, FoundationDB, Elasticsearch, deux Qdrant, Tika, Gotenberg et Kibana. 🆕
6. Les trois candidats « bases » ont un coût de rebranding élevé, à cause de la présence massive du nom (ou d'un mot générique, « dust ») dans le code.

---

## 1. Tableau de tri complet

Légende : **OK** = feu vert (MIT, Apache-2.0, BSD, ISC, MPL-2.0) ; **Orange** = AGPL/GPL/LGPL ou ee/ commercial à isoler ; **Rouge** = clause de marque, interdiction de SaaS multi-tenant, licence propriétaire ou source-available. Activité : date du dernier push (ecosyste.ms, 21/10/2026) et commits des 90 derniers jours (historique sans blobs, 21/10/2026, pour les projets retenus).

| # | Projet (dépôt) | Licence (LICENSE brut) | `ee/` / commercial | Activité | Verdict | Motif |
|---|---|---|---|---|---|---|
| 1 | `coze-dev/coze-studio` | Apache-2.0 (`LICENSE-APACHE`) | Aucun dossier ee ; README : certaines fonctions réservées à la version commerciale | push 29/07/2026 ; **1 commit / 90 j** | Retenu (finaliste base) | Licence OK. Activité fortement ralentie. |
| 2 | `coze-dev/coze-loop` | Apache-2.0 | README : « édition open source » sous-ensemble du produit commercial | push 21/10/2026 ; 67 commits / 90 j | Retenu (brique observabilité/évals) | Très actif. |
| 3 | `langgenius/dify` | Dify Open Source License (Apache modifiée) | `api/enterprise` (services) | push 16/10/2026 | **Éliminé (rouge)** | Multi-tenant défini comme « un tenant = un workspace », interdit sans accord écrit ; logo/copyright à conserver dans la console. Confirme la base. |
| 4 | `langflow-ai/langflow` | MIT | Aucun | push 21/10/2026 ; 955 commits / 90 j | Retenu (finaliste builder) | Licence OK, très actif. Gouvernance faible. Confirme la base. |
| 5 | `FlowiseAI/Flowise` | Apache-2.0 + Commercial License (`packages/server/src/enterprise`) | Oui | **Archivé** (push 13/08/2026) | **Éliminé** | Dépôt archivé. Confirme la base (archivé 13/08/2026). |
| 6 | `simstudioai/sim` | Apache-2.0 (cœur) + **Sim Enterprise License** (`apps/sim/ee`) | Oui : SSO, SCIM, audit, marque blanche, data drains | push 17/10/2026 ; 2 708 commits / 90 j | Retenu (finaliste builder) | Le texte de licence de `ee/` exige un abonnement pour la production. 🆕 |
| 7 | `dataelement/bisheng` | Apache-2.0 | Pas de dossier ee ; flag `dashboard_pro` pour les fonctions « commercial edition » | push 16/10/2026 ; 1 069 commits / 90 j | Retenu (finaliste base) | Licence OK. Ambiguïté sur les fonctions commerciales (§2.2). 🆕 |
| 8 | `infiniflow/ragflow` | Apache-2.0 | Aucun | push 17/10/2026 | OK, hors périmètre base | Moteur RAG documentaire. Confirme la base. |
| 9 | `labring/FastGPT` | Licence FastGPT (Apache-2.0 + conditions) | Non | push 20/10/2026 | **Éliminé (rouge)** | SaaS multi-tenant interdit sans accord ; logo à conserver. 🆕 |
| 10 | `1Panel-dev/MaxKB` | GPL-3.0 | Import de `xpack` (absent du dépôt) ; licence vérifiée à l'exécution (`license_is_valid`) | push 15/10/2026 ; 208 commits / 90 j | **Orange** | GPL (publication des modifications en cas de distribution) et modules fermés. 🆕 |
| 11 | `Agenta-AI/agenta` | MIT hors `ee/` (Agenta Enterprise License dans `ee/`) | Oui (api, web, sdks) | push 20/10/2026 | Orange, brique | Prompts et évaluations ; `ee/` commercial. 🆕 |
| 12 | `langfuse/langfuse` | MIT hors `ee/`, `web/src/ee/`, `worker/src/ee/` | Oui | push 20/10/2026 ; 2 683 commits au total | Orange, brique observabilité | Open-core explicite (« open core » dans la licence `ee/`). Confirme la base. |
| 13 | `comet-ml/opik` | Apache-2.0 | Aucun | push 20/10/2026 | OK, brique observabilité | Traces et évaluations ; README en français. Confirme la base. |
| 14 | `letta-ai/letta` | Apache-2.0 | Aucun | push 10/09/2026 | OK, hors périmètre | Agents à mémoire persistante (runtime). Confirme la base. |
| 15 | `TaskingAI/TaskingAI` | Apache-2.0 | Aucun | push **02/12/2024** | **Éliminé** | Inactif depuis plus d'un an. 🆕 |
| 16 | `etalab-ia/OpenGateLLM` | MIT (DINUM) | Aucun | push 21/10/2026 ; 142 commits / 90 j | OK, **finaliste brique passerelle** | Souverain, OpenAI-compatible. Confirme la base (MIT). |
| 17 | `BerriAI/litellm` | MIT hors `enterprise/` (BerriAI Enterprise License) | Oui (214 fichiers) | push 19/10/2026 ; 13 489 commits / 90 j | OK avec réserve, **finaliste brique passerelle** | SSO listé comme fonction commerciale. Confirme la base. |
| 18 | `higress-group/higress` (ex. `alibaba/higress` : 404 chez ecosyste.ms) | Apache-2.0 | Aucun | push 17/10/2026 ; 9,6 k★ | OK, brique passerelle à évaluer | Passerelle basée sur Envoy ; non évaluée en profondeur. 🆕 (le dépôt est sous `higress-group`) |
| 19 | `activepieces/activepieces` | MIT hors `packages/ee` | Oui | push 19/10/2026 | Orange, hors périmètre | Automatisation low-code ; ee commercial. Confirme la base. |
| 20 | `windmill-labs/windmill` | Apache-2.0 + AGPLv3 (fichiers) + propriétaire (EE) | Oui | push 17/10/2026 | Orange/rouge partiel | Scripts et workflows ; triple licence. Confirme la base. |
| 21 | `mastra-ai/mastra` | Apache-2.0 hors `ee/` | Oui : `ee/` contient `auth`, `agent-builder`, `editor` | push 16/10/2026 | Orange, brique framework | Les modules « builder » et « editor » sont en ee. 🆕 (détail ee) |
| 22 | `Ironclad/rivet` | MIT | Aucun | push 26/08/2026 | OK, hors périmètre | Éditeur graphique d'agents orienté développeur. |
| 23 | `agentscope-ai/agentscope` | Apache-2.0 | Aucun | push 21/10/2026 | OK, brique framework | Interface « AgentScope Studio » non trouvée dans ce dépôt (à vérifier). Confirme la base. |
| 24 | `agno-agi/agno` | Apache-2.0 | Aucun | push 17/10/2026 | OK, brique framework | Le README renvoie à « AgentOS UI » ; cette interface n'est pas dans le dépôt (inférence). Confirme la base. |
| 25 | `kagent-dev/kagent` | Apache-2.0 | Aucun | push 18/10/2026 | OK, hors périmètre | Agents Kubernetes-natifs : trop orienté infrastructure pour des PME. |
| 26 | `langchain-ai/open-agent-platform` | MIT | Aucun | **Archivé** (push 25/02/2026) | **Éliminé** | Dépôt archivé. Confirme la base. |
| 27 | `PySpur-Dev/pyspur` | Apache-2.0 | Aucun | push 29/06/2026 | **Éliminé** | Pas de push depuis plus de 3 mois. |
| 28 | `open-webui/open-webui` | Open WebUI License | Non | push 20/10/2026 | **Éliminé (rouge)** | Clause : nom et logo à conserver. Confirme la base. |
| 29 | `Mintplex-Labs/anything-llm` | MIT | Aucun | push 21/10/2026 | OK, hors périmètre base | Assistant mono-application RAG et agents. |
| 30 | `danny-avila/LibreChat` | MIT | Aucun | non relevé (404 chez ecosyste.ms) | OK, hors périmètre base | Interface multi-modèle et agents ; utile comme assistant. |
| 31 | `lobehub/lobehub` | LobeHub Community License (Apache-2.0 + conditions) | Non | push 22/10/2026 | **Éliminé (rouge)** | Développer et distribuer un dérivé commercial exige une licence du producteur. 🆕 |
| 32 | `n8n-io/n8n` | Sustainable Use License + Enterprise License | Oui | push 21/10/2026 | **Éliminé (rouge)** | Licence source-available (source : sim.ai, comparatif 2026). Confirme la base (rouge). |
| 33 | `onyx-dot-app/onyx` | MIT hors `ee/` ; Onyx Enterprise License dans `ee/` | Oui (260 fichiers Python dans `backend/ee`) | push 17/10/2026 | Orange, assistant (non évalué) | Recherche et chat d'entreprise ; à évaluer si l'assistant est retenu. 🆕 |
| 34 | `OpenHands/OpenHands` | MIT | Aucun | push 22/10/2026 | OK, hors périmètre | Agent de code. |
| 35 | `kestra-io/kestra` | Apache-2.0 (EE dans une autre dépôt) | Référence ee (non trouvée dans le dépôt) | push 15/10/2026 | OK, hors périmètre | Orchestration de flux. |
| 36 | `dust-tt/dust` | MIT (Copyright 2022 Stanislas Polu) | Pas de dossier ee (seulement des pages marketing « enterprise ») | push 20/10/2026 ; 5 232 commits / 90 j | OK, **finaliste base** | Licence OK. Plan et « isEnterprise » gérés à l'exécution, sans licence séparée. 🆕 |
| 37 | `botpress/botpress` | MIT | Aucun dossier ee repéré | push 13/10/2026 | OK, hors périmètre | Constructeur de chatbots. |
| 38 | `nocobase/nocobase` | Apache-2.0 (`LICENSE-APACHE.txt`) + contrat propriétaire (`LICENSE.txt`) | Plugins commerciaux | push 16/10/2026 | **Rouge probable** (à lire) | Le fichier `LICENSE.txt` est un contrat NocoBase PTE. LTD ; lecture partielle (en-tête). 🆕 |
| 39 | `janhq/jan` | Apache-2.0 | Aucun | push 16/10/2026 | OK, hors périmètre | Application de bureau. |
| 40 | `CherryHQ/cherry-studio` | AGPL-3.0 | Non | push 19/10/2026 | **Orange** | AGPL et client de bureau. |
| 41 | `Chainlit/chainlit` | Apache-2.0 | Aucun | **Archivé** (push 18/09/2026) | **Éliminé** | Dépôt archivé. Confirme la base (abandon). |
| 42 | `linagora/openrag` | AGPL-3.0 | Non | push 19/10/2026 | **Orange** | AGPL. |
| 43 | `suitenumerique/conversations` (La Suite) | MIT | Aucun | push 20/10/2026 ; 76 k★ | OK, hors périmètre base | Assistant souverain français ; utile côté utilisateurs. 🆕 |
| 44 | `maximhq/bifrost` | Apache-2.0 | Aucun | push 19/10/2026 ; 8,9 k★ | OK, brique passerelle (non évaluée) | Passerelle Go. 🆕 |
| 45 | `Portkey-AI/gateway` | MIT | Aucun | push **25/05/2026** | **Éliminé** | Pas de push depuis plus de 3 mois. 🆕 |
| 46 | `pipeshub-ai/pipeshub-ai` | Apache-2.0 | Non relevé | push 17/10/2026 | OK, hors périmètre | Recherche d'entreprise ; non évalué. 🆕 |
| 47 | `openclaw/openclaw` | MIT | Aucun | push 17/10/2026 ; 392 k★ | OK, hors périmètre | Assistant personnel. 🆕 |
| 48 | `iOfficeAI/AionUi` | Apache-2.0 | Aucun | push 14/10/2026 | OK, hors périmètre | Application de bureau. 🆕 |
| 49 | `Pipelex/pipelex` | « other » (licence non lue) | — | push 17/10/2026 | Non tranché | Projet français ; licence à lire avant toute suite. 🆕 |
| 50 | BuildingAI | — | — | — | **Non trouvé** | Aucun dépôt identifié avec les recherches menées. À préciser par le fondateur ou une requête ciblée. |

**Recoupement avec `01-briques-moteur-ia.md`** : sur les 14 projets présents dans les deux documents (Dify, Langflow, Flowise, LiteLLM, OpenGateLLM, Langfuse, Opik, Letta, RAGFlow, Agno, Mastra, Windmill, Activepieces, Open WebUI, Chainlit, OAP), **aucune contradiction**. Les étoiles de Dify (158 639), Langflow (155 886) et Flowise (55 504) concordent avec les chiffres de la base. Flowise est bien archivé depuis le 13/08/2026 (confirme la base).

---

## 2. Fiches des finalistes

Les notes C1–C10 sont sur 5. Elles sont **indicatives** : chaque note se justifie par les faits listés. Les mesures brutes (lignes de code, fichiers de test, occurrences de marque) sont des **approximations** (méthode en annexe).

### 2.0 Notes comparées (C1–C10)

| Code | Critère | Coze Studio | Bisheng | Dust | Sim | Langflow | MaxKB | LiteLLM (brique) | OpenGateLLM (brique) |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Couverture Studio | 3,5 | **4** | **4** | 3,5 | 3,5 | 3 | **4** (passerelle) | 2,5 (passerelle) |
| C2 | Maturité du code | 2 | **4** | **4,5** | 4 | **4,5** | 3 | **5** | 3 |
| C3 | Architecture, pile | 3,5 | 3,5 | 3 | 3,5 | 3,5 | 3 | 4 | **4** |
| C4 | Multi-tenant, gouvernance | 2 | **4,5** | 4 | 2 (4 en ee payant) | 2,5 | 2,5 | 3 | 3 |
| C5 | Déploiement | 3 | 3,5 | **2** | 3,5 | **4** | **4** | **4** | 3,5 |
| C6 | Facilité (PME) | 3,5 | 3 | 3 | **4** | **4,5** | 3,5 | 3 | 2 |
| C7 | i18n, français | 2 | 3 | **4** | 1 | **4** | 2,5 | 1 | 1 |
| C8 | Coût rebranding, divergence | 2 | 2,5 | 3 | 3 | 3 | 2,5 | **4** | **4** |
| C9 | Sécurité | 3 | 3 | 3,5 | 3 | 2,5 | 2 | 2,5 (Scorecard 6,1/10) | 3,5 |
| C10 | Pérennité | 2,5 | 3 | 3 | 2,5 | 3,5 | 2,5 | **4** | 3 |
| | **Somme indicative (non pondérée)** | 27 | 34,5 | 34 | 30 | 35,5 | 28,5 | 34,5 | 29,5 |

Lecture : la somme ne départage pas les projets. Les seuils bloquants pour une base PME distribuable sont **C4 ≥ 3,5** (multi-tenant et gouvernance) et **C5 ≥ 3** (déploiement autonome). Seuls Bisheng et Dust passent C4 ; seul Bisheng passe C4 et C5. Langflow, avec la meilleure somme, reste un **builder** (C4 2,5). Les deux passerelles sont des briques, pas des bases : leur somme ne s'applique pas au même périmètre.

### 2.1 Coze Studio (`coze-dev/coze-studio`) — Apache-2.0

**Identité.** Dépôt créé le 26/06/2025 (ecosyste.ms) ; 21 735 ★ ; push 29/07/2026 ; 392 commits au total (historique à partir du 20/07/2025) ; 66 auteurs ; 13 tags. Langages : Go ≈ 680 k lignes, TypeScript ≈ 617 k, TSX ≈ 331 k. Source : https://github.com/coze-dev/coze-studio ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/coze-dev%2Fcoze-studio

**Constats clés**
- **Amont figé.** Commits par mois : 117 (juil. 2025), 142 (août), 61 (sept.), 34 (oct.), 13 (nov.), 8 (déc.), 8 (janv. 2026), 2 (fév.), 3 (mars), 3 (avr.), 0 (mai et juin), 1 (juil. 2026, correctif d'infrastructure), 0 depuis. Les derniers correctifs concernent des failles : nonce anti-CSRF sur l'OAuth (#2657, 09/04/2026), « OAuth phishing » (#2668, 20/04/2026), injection SQL dans les workflows (#2615/#2616, 09/02/2026). 🆕 Source : `git log` sur le dépôt, historique sans blobs, 21/10/2026.
- **Open core.** README : « certaines fonctionnalités, comme la personnalisation du ton, sont limitées à la version commerciale ». Source : https://github.com/coze-dev/coze-studio/blob/main/README.md
- **Domaines backend** (`backend/domain`) : agent, app, connector, conversation, knowledge, memory, openauth, permission, plugin, prompt, search, shortcutcmd, template, upload, user, workflow. Découpage DDD cohérent.
- **Déploiement** : docker-compose à onze services (MySQL, Redis, Elasticsearch, MinIO, etcd, Milvus, NSQ ×3, serveur, web). Chart Helm `helm/charts/opencoze`. Minimum annoncé : 2 cœurs, 4 Go.
- **Modèles** : fournisseurs visibles dans `backend/infra` : Volcengine/ARK (fortement représenté), OpenAI, Gemini, Ollama.
- **Canaux de publication** : Feishu/Lark et Douyin fortement présents (dans le code).
- **i18n** : seulement `en.json` et `zh-CN.json`.
- **Tests** : 73 fichiers `*_test.go` côté Go ; 8 workflows CI.
- **Marque** : 27 889 occurrences « coze » dans le frontend TS/TSX, 9 639 dans le backend Go, 257 noms de paquets `@coze-*/` référencés dans les `package.json` (monorepo Rush, `rush.json`).

**Notes** : C1 3,5 (agents, workflows avec boucles et reprise sur interruption, prompts, plugins, RAG, clés API : oui ; SSO, SCIM, audit, batch : non ou partiel) ; C2 2 (activité, voir ci-dessus) ; C3 3,5 ; C4 2 (espaces avec rôles Owner/Admin ; aucun SAML/OIDC dans le backend Go) ; C5 3 ; C6 3,5 (non évalué à l'écran) ; C7 2 ; C8 2 ; C9 3 (aucun avis publié visible, mais plusieurs correctifs de sécurité en 2026) ; C10 2,5 (soutien ByteDance, dépôt public peu entretenu : inférence).

### 2.2 Bisheng (`dataelement/bisheng`) — Apache-2.0

**Identité.** Créé le 28/08/2023 ; 12 061 ★ ; push 16/10/2026 ; 9 993 commits ; 88 auteurs ; 12 auteurs et 1 069 commits sur 90 jours ; 114 tags ; Python ≈ 282 k lignes, TSX ≈ 232 k. Dataelement Technologies Inc. Source : https://github.com/dataelement/bisheng ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/dataelement%2Fbisheng

**Fonctions annoncées (README)** : workflows avec boucles, branches parallèles et exécution par lots ; intervention humaine (pause) ; départements et utilisateurs ; RBAC **et** ReBAC (fichier par fichier) ; approbations ; audit (conversations et opérations) ; API ouverte avec comptes de service et clés API ; SSO et LDAP ; quotas par rôle ; « skills » (PPT, Excel, Word) ; sous-agents parallèles.

**Constats clés**
- **Multi-tenant réel.** Le mot `tenant_id` apparaît dans 83 fichiers de modèles Python ; un module `tenant` existe dans le backend.
- **Autorisation.** Le docker-compose inclut OpenFGA (migration et service) : c'est le moteur ReBAC.
- **Fonctions « commercial edition » dans du code Apache.** Le README marque « Dashboards » et « DSH Desktop enterprise access » comme « commercial edition ». Le code (`telemetry_search/domain/utils.py`) lit `settings.get_system_login_method().dashboard_pro` pour les activer. Le dossier `commercial_license` existe dans le dépôt (api et domain). **Il faut demander au producteur si cet usage est libre, sous Apache-2.0, ou soumis à licence.** 🆕 Sources : https://github.com/dataelement/bisheng/blob/main/src/backend/bisheng/telemetry_search/domain/utils.py ; https://github.com/dataelement/bisheng/tree/main/src/backend/bisheng/commercial_license
- **Locales** : `zh-Hans`, `en`, `ja` (`src/frontend/client/src/locales`, `src/frontend/platform/public/locales`). **Pas de français.**
- **Docker** : 11 services (MySQL, OpenFGA + migration, Redis, backend, worker, frontend, Elasticsearch, etcd, MinIO, Milvus).
- **Marque** : « bisheng » environ 18 900 occurrences dans 2 622 fichiers ; 34 fichiers logo/favicon.
- **Tests** : 1 163 fichiers de test (par nom) ; 5 workflows CI.
- **Contexte** : produit d'origine chinoise. Canaux WeChat, Feishu et DingTalk, et support de la base DM8. Ces dépendances se retirent ou se remplacent (inférence).

**Notes** : C1 4 (workflows, RAG, agents, assistants, skills, MCP (module `mcp_manage`), évaluation (module `evaluation`), API, audit, quotas : présents ; batch et Document AI : partiels) ; C2 4 ; C3 3,5 (Python + React, OpenFGA, Celery, Elasticsearch, Milvus ; un fork de LangChain `bisheng_langchain` est à maintenir) ; C4 4,5 (le plus fort des candidats) ; C5 3,5 ; C6 3 (non évalué à l'écran) ; C7 3 (locales zh/en/ja présentes ; ajouter le français = effort moyen) ; C8 2,5 ; C9 3 (aucun avis publié visible ; non approfondi) ; C10 3.

### 2.3 Dust (`dust-tt/dust`) — MIT

**Identité.** Créé le 19/08/2022 ; 1 490 ★ ; push 20/10/2026 ; 32 694 commits ; 154 auteurs ; **58 auteurs et 5 232 commits sur 90 jours** ; 5 860 tags. Langages : TypeScript ≈ 1,13 M lignes, TSX ≈ 433 k, Rust ≈ 253 k. Source : https://github.com/dust-tt/dust ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/dust-tt%2Fdust

**Constats clés**
- **Licence claire.** `LICENSE` : MIT (Copyright 2022 Stanislas Polu). Le plan et l'« entreprise » sont gérés à l'exécution (plus de 180 occurrences de `isEnterprise` dans `front/lib`), sans dossier de licence séparé. 🆕
- **Français natif.** `front/locales` : `fr-FR`, `de-DE`, `en-US`, `en-GB` (catalogues lingui).
- **Connecteurs** (`connectors/src`) : Slack, Notion, Zendesk, Intercom, Confluence, Microsoft, GitHub, webcrawler, Snowflake, Salesforce, BigQuery, Google Drive. Le catalogue est le plus large des candidats (C1).
- **Durabilité.** Temporal est utilisé (dossier `temporal/`, `connectors/temporal`) : le même moteur que les Workflows de Mistral Studio.
- **Authentification et gouvernance.** Le code d'authentification appelle WorkOS (`front/lib/api/config.ts`, callbacks WorkOS). 44 fichiers contiennent un terme SCIM, 307 un terme d'audit (log, event, trail), environ 3 900 un terme d'espace de travail (workspace, tenant, organisation). 🆕 Dépendance à un service tiers pour le SSO à évaluer.
- **API** : `front-api/swagger.json`, OpenAPI 3.0.0, « DUST API Documentation » v1.0.2, licence MIT déclarée dans la spécification.
- **Déploiement** : `docker-compose.yml` à environ 13 services (PostgreSQL, Redis, Qdrant ×2, Elasticsearch, Kibana, FoundationDB, Tika, Gotenberg…). **Aucun guide d'auto-hébergement trouvé dans le dépôt** (recherche « self-host » dans les `*.md` : 0 résultat). Pas de chart Helm. 🆕
- **Tests et CI** : 1 912 fichiers de test (par nom) ; 40 workflows CI.
- **Marque** : « Dust », « dust », « dust.tt » et « DUST » : environ 1 600 occurrences dans `front/*.tsx` (dont beaucoup sont des identifiants) ; 133 fichiers logo ou favicon (dont `marketing/` et `sparkle/`, le design system) ; 13 `package.json` sous le scope `@dust-tt`.

**Notes** : C1 4 (agents, workflows Temporal, connecteurs, MCP, RAG, clés API, espaces, audit ; batch et Document AI partiels ; traces et évaluations partielles) ; C2 4,5 ; C3 3 (monorepo multi-langages TS, Rust, Python, avec Temporal et de nombreux services) ; C4 4 ; C5 **2** (pas de guide autonome, infrastructure lourde) ; C6 3 (non évalué à l'écran) ; C7 4 ; C8 3 (MIT donc fork dur possible, mais identifiants génériques) ; C9 3,5 (aucun avis publié visible ; sécurité non analysée en profondeur) ; C10 3 (société adossée à du capital, dépôt MIT : inférence).

### 2.4 Sim (`simstudioai/sim`) — Apache-2.0 + Sim Enterprise License

**Identité.** Créé le 05/01/2025 ; 29 834 ★ ; push 17/10/2026 ; 8 467 commits ; 67 auteurs ; **11 auteurs et 2 708 commits sur 90 jours** ; 472 tags. TypeScript ≈ 2,9 M lignes. Source : https://github.com/simstudioai/sim ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/simstudioai%2Fsim

**Constats clés**
- **Gouvernance en licence commerciale.** `apps/sim/ee` contient SSO, SCIM, journaux d'audit, marque blanche (`whitelabeling`), data drains, usage par organisation, groupes de credentials, demandes d'accès. Le fichier `apps/sim/ee/LICENSE` (« Sim Enterprise License ») précise que l'usage en production exige un abonnement Sim Enterprise. 🆕 Source : https://github.com/simstudioai/sim/blob/main/apps/sim/ee/LICENSE
- **Pas d'internationalisation.** Aucune bibliothèque i18n détectée (ni next-intl, ni i18next, ni dossier de locales).
- **Déploiement** : `docker-compose.prod.yml` (app, realtime, migrations, Redis, cron, base de données) ; chart Helm `helm/sim` ; variante Ollama.
- **Marque** : « sim.ai » (946 occurrences) et « simstudioai » (76) : environ 1 000 occurrences au total.

**Notes** : C1 3,5 (builder visuel, agents, RAG, MCP, clés API, outils ; batch absent ; évaluations et traces partielles) ; C2 4 (forte activité, mais 11 auteurs sur 90 jours : concentration probable (inférence)) ; C3 3,5 ; C4 2 (en cœur Apache ; 4 si on accepte la licence `ee/`) ; C5 3,5 ; C6 4 (non évalué à l'écran) ; C7 1 ; C8 3 ; C9 3 (aucun avis publié visible) ; C10 2,5 (dépôt jeune, 2025).

### 2.5 Langflow (`langflow-ai/langflow`) — MIT

**Identité.** Créé le 08/02/2023 ; 155 886 ★ ; push 21/10/2026 ; 19 460 commits ; 439 auteurs ; **54 auteurs et 955 commits sur 90 jours** ; 1 199 tags. Python ≈ 450 k lignes, TS/TSX/JS ≈ 213 k. Source : https://github.com/langflow-ai/langflow ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/langflow-ai%2Flangflow

**Constats clés**
- **Licence MIT** sans dossier `ee/` ; confirme la base.
- **Locales** : `de`, `en`, `es`, `fr`, `ja`, `ko`, `pt`, `zh-Hans` (`src/frontend/src/locales`) : français présent.
- **Gouvernance** : dossiers (projets), rôles, superutilisateur, service `audit` (`src/backend/base/langflow/services/audit`), politiques de clés API. Multi-tenant (`tenant`) présent dans le code (110 occurrences ; mode d'emploi non vérifié). Pas de SAML/SCIM identifié.
- **Déploiement** : `deploy/docker-compose.yml` (proxy, base, Celery, Flower, RabbitMQ, Prometheus, Grafana, pgAdmin…). Pas de chart Helm. Installation par pip possible.
- **Sécurité** : au moins 10 avis GHSA publiés (dates du 11/06/2026 au 28/09/2026) ; la première page de la liste est pleine et une pagination existe. Source : https://github.com/langflow-ai/langflow/security/advisories
- **Corporate** : la documentation mentionne DataStax dans environ 96 fichiers (inférence : soutien DataStax).
- **Tests et CI** : 2 749 fichiers de test (par nom) ; 52 workflows CI.

**Notes** : C1 3,5 ; C2 4,5 ; C3 3,5 ; C4 2,5 ; C5 4 ; C6 4,5 (non évalué à l'écran) ; C7 4 ; C8 3 ; C9 2,5 (volume d'avis) ; C10 3,5.

### 2.6 MaxKB (`1Panel-dev/MaxKB`) — GPL-3.0

**Identité.** Créé le 14/09/2023 ; 22 976 ★ ; push 15/10/2026 ; 7 564 commits ; 114 auteurs ; 21 auteurs et 208 commits sur 90 jours ; 76 tags. Vue ≈ 103 k lignes, Python ≈ 96 k, TS ≈ 40 k. Source : https://github.com/1Panel-dev/MaxKB ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/1Panel-dev%2FMaxKB

**Constats clés**
- **Licence** : GPL-3.0 (`LICENSE` brut). En cas de distribution, les modifications doivent être publiées. 🆕 (la base n'évaluait pas MaxKB)
- **Modules fermés** : `apps/ops/celery/signal_handler.py` importe `xpack` (`from xpack import job`) dans un `try/except ImportError` ; `xpack` n'existe pas dans le dépôt. La validité de la licence est vérifiée au moment de l'exécution (`apps/system_manage/serializers/valid_serializers.py`, clé `license_is_valid`). **Les fonctions d'entreprise sont donc fermées.** 🆕
- **Déploiement** : image « tout-en-un » (`installer/Dockerfile`, Postgres et Redis embarqués, `start-all.sh`) : très simple pour une PME.
- **Locales** : `en-US`, `zh-CN`, `zh-Hant`. Pas de français.
- **Tests** : 17 fichiers de test seulement ; 8 workflows CI.
- **Sécurité** : au moins 10 avis GHSA ; au moins 5 publiés le 16/10/2026 (même jour, publication en lot). Source : https://github.com/1Panel-dev/MaxKB/security/advisories

**Notes** : C1 3 ; C2 3 (activité saine, tests faibles) ; C3 3 ; C4 2,5 ; C5 4 ; C6 3,5 ; C7 2,5 ; C8 2,5 ; C9 2 ; C10 2,5.

### 2.7 LiteLLM (`BerriAI/litellm`) — MIT hors `enterprise/` — brique passerelle

**Identité.** Créé le 27/07/2023 ; 61 571 ★ ; push 19/10/2026 ; 55 070 commits ; 1 871 auteurs ; **332 auteurs et 13 489 commits sur 90 jours** ; 1 602 tags ; score OpenSSF Scorecard **6,1/10** (2026-04-10). Source : https://github.com/BerriAI/litellm ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/BerriAI%2Flitellm

**Constats clés**
- **Licence** : `LICENSE` MIT, avec la mention que `enterprise/` est soumis à la « BerriAI Enterprise License » (usage en production soumis à accord). `enterprise/` compte 214 fichiers. ⚠️ confirme la base.
- **Fonctions en licence commerciale** : d'après le README, SSO et « support professionnel », « SLA » et « intégrations sur mesure ». Les hooks de modération (`enterprise/enterprise_hooks`) sont dans `enterprise/`.
- **Passerelle** : routes OpenAI-compatibles, plus de 100 fournisseurs, clés virtuelles, budgets. Indices de présence (nombre de fichiers contenant le terme, approximatif) : MCP 470, batch 46, OCR 137, audio 116, traces et callbacks 977. Interface d'administration (`ui/litellm-dashboard`).
- **Déploiement** : docker-compose, chart Helm (2), terraform.
- **Sécurité** : au moins 10 avis GHSA publiés (dernier le 01/10/2026 ; cinq datés du 30/06 au 30/09/2026).
- **Tests** : 5 112 fichiers de test (par nom) ; 40 workflows CI.

**Notes** : C1 4 (passerelle : oui ; console de base : partielle) ; C2 5 ; C3 4 ; C4 3 (teams, clés, budgets en cœur ; SSO et audit en `enterprise/`) ; C5 4 ; C6 3 ; C7 1 ; C8 4 (cœur MIT, `enterprise/` séparé) ; C9 2,5 (Scorecard 6,1 et plusieurs avis en 2026) ; C10 4.

### 2.8 OpenGateLLM (`etalab-ia/OpenGateLLM`) — MIT — brique passerelle souveraine

**Identité.** Créé le 09/07/2024 ; 214 ★ ; push 21/10/2026 ; 758 commits ; 49 auteurs ; 13 auteurs et 142 commits sur 90 jours ; 73 tags. Python ≈ 28,6 k lignes. Porté par la DINUM (sponsors : DINUM, CentraleSupélec). Source : https://github.com/etalab-ia/OpenGateLLM ; https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/etalab-ia%2FOpenGateLLM

**Constats clés** (🆕 : la base ne documentait pas ces routes)
- **Licence** : `LICENSE` MIT (DINUM). Le README affirme « toutes les fonctionnalités sans licence commerciale ».
- **Routes** (`docs/openapi.json`, OpenAPI 3.1.0, 33 chemins, 58 opérations) : `/v1/chat/completions`, `/v1/embeddings`, `/v1/rerank`, `/v1/search`, `/v1/ocr`, `/v1/audio/transcriptions`, `/v1/models`, `/v1/usage`, `/v1/me/usage`, `/v1/keys`, `/v1/me/keys`, `/v1/organizations/me`, `/v1/admin/organizations`, `/v1/admin/users`, `/v1/admin/roles`, `/v1/admin/keys`, `/v1/admin/providers`, `/v1/admin/routers`, `/v1/auth/login`, `/v1/auth/sso/login`.
- **SSO** : cas d'usage `api/use_cases/auth/_authssologinusecase.py` (code et tests présents).
- **Architecture** : couches `domain`, `infrastructure`, `use_cases` (architecture propre en Python).
- **Limites affichées** : API « encore en bêta » avec des changements majeurs possibles ; pas de console d'administration hors playground ; pas de stockage des historiques de chat (annoncé).
- **Déploiement** : `compose.example.yml` (api, playground, PostgreSQL, Redis) ; un dossier `grafana/` séparé ; pas de chart Helm.
- **Tests** : 164 fichiers de test ; 13 workflows CI ; aucun avis GHSA visible.

**Notes** : C1 2,5 (passerelle, clés, organisations, rôles, SSO, OCR, audio, recherche : couverts ; batch, agents, traces : absents ; console d'administration : absente) ; C2 3 (petite équipe, bêta) ; C3 4 ; C4 3 ; C5 3,5 ; C6 2 ; C7 1 ; C8 4 ; C9 3,5 ; C10 3.

### 2.9 Carte de couverture brique par brique face à Mistral Studio

Légende : **●** couvert · **◐** partiel ou à vérifier · **○** absent · **?** non vérifié. Les cellules marquées ◐ indiquent une présence de code ou de fonction qui n'a pas été testée. Les colonnes « LiteLLM » et « OpenGateLLM » sont des briques passerelle, à comparer à la fonction de passerelle de la console.

| Brique Studio (§3 synthèse) | Coze Studio | Bisheng | Dust | Sim | Langflow | MaxKB | LiteLLM | OpenGateLLM |
|---|---|---|---|---|---|---|---|---|
| Playground (test de modèles et d'agents) | ◐ aperçu d'agent | ◐ | ◐ | ◐ | ● | ◐ | ◐ | ● |
| Agents et conversations persistantes | ● | ● | ● | ● | ● | ◐ | ◐ | ○ |
| Outils intégrés (recherche web, code, bibliothèque) | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ◐ (`/v1/search`) |
| Prompts versionnés | ◐ (domaine prompt ; Coze Loop) | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ |
| Skills (instructions et fichiers réutilisables) | ◐ | ● (skill packs, import GitHub) | ◐ (à vérifier) | ? | ○ | ○ | ○ | ○ |
| Workflows durables | ◐ (reprise sur interruption) | ● (boucles, intervention humaine) | ● (Temporal) | ◐ | ◐ | ◐ | ○ | ○ |
| Connecteurs MCP | ◐ (plugins MCP) | ● (`mcp_manage`) | ● | ● | ● | ◐ | ● | ○ |
| Libraries et RAG géré | ● | ● | ● | ● | ● | ● | ○ | ◐ (search, rerank) |
| Document AI (OCR) | ◐ | ◐ | ◐ (Tika) | ◐ | ◐ | ○ | ● | ● (`/v1/ocr`) |
| Audio (STT, TTS) | ◐ (TTS en nœud) | ? | ? | ◐ | ◐ | ◐ | ● | ◐ (STT seul) |
| Batch | ○ | ○ | ○ | ○ | ◐ | ○ | ● | ○ |
| Observabilité, traces | ◐ (via Coze Loop) | ◐ (module telemetry) | ◐ | ◐ (logs) | ◐ | ◐ | ● (callbacks, OTEL) | ◐ (Grafana) |
| Évaluations et juges | ◐ (via Coze Loop) | ● (module evaluation) | ◐ | ◐ | ◐ | ○ | ◐ | ○ |
| Clés API, comptes de service | ● | ● | ● | ● | ● | ● | ● (clés virtuelles) | ● |
| Organisations, workspaces, RBAC | ◐ (espaces, rôles) | ● (tenant, départements, RBAC et ReBAC) | ● (workspace, groupes) | ◐ (RBAC avancé en ee) | ◐ (dossiers, rôles) | ◐ | ◐ (teams ; RBAC en enterprise) | ● (organisations, rôles) |
| SSO SAML/OIDC, SCIM | ○ | ◐ (SSO et LDAP ; SCIM ?) | ◐ (SCIM ; SSO via WorkOS) | ◐ (en ee) | ? | ? | ◐ (SSO en enterprise) | ◐ (`/v1/auth/sso/login`) |
| Journal d'audit | ○ | ● | ● | ◐ (en ee) | ◐ (service audit) | ○ | ◐ (en enterprise) | ○ |
| Usage, quotas, budgets | ? | ◐ (quotas par rôle) | ◐ (plans, limites) | ◐ (en ee) | ○ | ○ | ● (budgets) | ● (`/v1/usage`) |
| Passerelle multi-modèles compatible OpenAI | ◐ | ◐ | ◐ (Mistral parmi d'autres) | ◐ | ◐ | ◐ | ● | ● |
| Guardrails, modération | ◐ | ◐ (mots sensibles) | ◐ | ◐ | ◐ | ○ | ● (hooks, partie en enterprise) | ○ |
| Auto-hébergement documenté | ● (compose, Helm) | ● (compose) | ○ à ◐ (pas de guide) | ● (compose, Helm) | ● (compose) | ● (image tout-en-un) | ● (compose, Helm, terraform) | ● (compose) |
| Interface en français | ○ | ○ | ● | ○ | ● | ○ | ○ | ○ (docs EN) |

**Lecture.** Aucune base n'est complète. La couverture des **trois** points les plus coûteux à construire (batch, Document AI, évaluations) vient des briques ou des passerelles. Le **SSO et l'audit** sont en licence commerciale dans trois des huit candidats (Sim, LiteLLM, MaxKB) ou absents (Coze Studio), et sont présents dans le cœur MIT/Apache de Bisheng et Dust.

---

## 3. Combinaisons possibles

Chaque combinaison présente une base, les briques ajoutées et les points de friction. Aucune n'a été installée.

| Combinaison | Base | Briques | Forces | Points de friction d'intégration |
|---|---|---|---|---|
| **A (à approfondir en priorité)** | Bisheng | LiteLLM ou OpenGateLLM (passerelle, clés virtuelles, budgets) ; Langfuse (MIT hors `ee/`) ou Coze Loop (traces, prompts, évaluations) | Gouvernance et multi-tenant dans la base ; passerelle la plus mature ; évaluation séparée | Deux systèmes de clés (Bisheng et passerelle) à unifier ; deux modèles d'autorisation (OpenFGA d'un côté, équipes de la passerelle de l'autre) ; `bisheng_langchain` à maintenir ; français à ajouter ; fonctions « commercial edition » à clarifier. |
| **B** | Dust | LiteLLM ou OpenGateLLM ; Langfuse ou Coze Loop | Meilleur catalogue de connecteurs ; workflows Temporal ; FR natif | Déploiement autonome non documenté (infrastructure lourde) ; authentification WorkOS ; deux runtimes (TypeScript et Rust) ; passerelle à brancher sur le moteur de modèles de Dust. |
| **C** | Coze Studio | Coze Loop (même famille, même SDK) ; LiteLLM pour les modèles | Console agents et workflows proche de Studio ; même écosystème pour l'observabilité | Amont presque figé ; SSO et audit à écrire ; interface sans français ; 257 noms de paquets `@coze-*/` à renommer. |
| **D (éditeur d'agents + base)** | Bisheng ou Dust (base) | Langflow comme éditeur visuel de flows, exposé en API | Langflow est le meilleur builder (C6 4,5, FR) | Deux moteurs de workflows (ceux de la base et ceux de Langflow) : il faut en choisir un ; latence et versioning à arbitrer. |
| **E (souveraine et légère)** | OpenGateLLM (passerelle et administration) + suitenumerique/conversations (assistant utilisateur, MIT) | — | Stack MIT, SSO et clés déjà présents, FR natif côté assistant | Bêta de OpenGateLLM ; pas d'interface de console complète ; à valider sur la durée (13 auteurs sur 90 jours). |
| **F (gouvernance externe, à vérifier)** | Toute base sans SSO | Un fournisseur d'identité libre (Keycloak, Authentik) pour SSO et SCIM ; OpenFGA (déjà dans Bisheng) pour l'autorisation | Sort SSO et SCIM du code de la base | Non évalué dans cette recherche (hors liste ; à vérifier). |

---

## 4. Les trois meilleurs : rebranding, suivi de l'amont, risques

### 4.1 Effort de rebranding

| Élément | Bisheng | Dust | Coze Studio |
|---|---|---|---|
| Nom (code et textes) | ≈ 18 900 occurrences de « bisheng » dans 2 622 fichiers ; paquet Python `bisheng` (`src/backend/bisheng`), importé partout | ≈ 1 600 occurrences « Dust », « dust », « dust.tt » dans `front/*.tsx` ; 13 `package.json` sous `@dust-tt` | 27 889 « coze » (frontend) + 9 639 (backend Go) ; 257 noms de paquets `@coze-*/` (monorepo Rush) |
| Logos et favicons | 34 fichiers (`src/frontend/platform/public/assets/...`, `login-logo-big.png`) | ≈ 133 fichiers, dont `marketing/` (site vitrine, à retirer) et `sparkle/` (design system) | 25 fichiers (`frontend/apps/coze-studio/assets/favicon.png`, etc.) |
| Thèmes et tokens | 11 fichiers | Design system `sparkle/` (tokens centralisés, favorable) | 32 fichiers |
| Textes et locales | `src/frontend/client/src/locales`, `platform/public/locales` (zh-Hans, en, ja) ; `README*` | `front/locales` (fr-FR, de-DE, en-US, en-GB) | `en.json`, `zh-CN.json` |
| **Effort estimé** (inférence) | **Moyen à élevé** : garder le nom du paquet Python, ne rebrander que l'UI, les assets et la documentation | **Élevé** sur les identifiants (mot générique) ; **faible** sur le design system si les tokens sont centralisés | **Très élevé** : renommage des 257 noms de paquets `@coze-*/` et des imports |

### 4.2 Stratégie de suivi de l'amont

- **Bisheng** : soft fork. Un remote `upstream`, une couche de personnalisation séparée (fichiers de configuration, surcharges d'assets, patch de l'UI), et **aucun renommage** du paquet Python pour limiter les conflits. Suivre les 114 tags et l'évolution des fonctions « commercial edition ». Décision à prendre : désactiver le flag `dashboard_pro` ou obtenir une licence écrite.
- **Dust** : soft fork possible (MIT), mais l'amont est très actif (5 232 commits sur 90 jours) : fusionner à cadence fixe sur un tag stable, éviter de toucher les identifiants, supprimer `marketing/` dès le départ. Le volume (1,8 M lignes) rend chaque fusion coûteuse.
- **Coze Studio** : le suivi amont n'a plus de sens économique si l'amont reste figé. Le plus réaliste est un **fork dur** à maintenir seul, avec un audit de sécurité interne (plusieurs correctifs de faille en 2026).

### 4.3 Risques

| # | Risque | Projet concerné | Gravité | Atténuation |
|---|---|---|---|---|
| R1 | Fonctions « commercial edition » dans du code Apache (flag `dashboard_pro`) : statut juridique ambigu | Bisheng | Élevée | Demande écrite au producteur avant fork ; neutraliser ces fonctions si la réponse est négative. |
| R2 | Dépendance au SSO WorkOS (service tiers) pour la connexion | Dust | Moyenne | Évaluer le coût et la conformité ; prévoir un fournisseur d'identité libre (option F). |
| R3 | Déploiement autonome non démontré (≈13 services, FoundationDB, Elasticsearch, Qdrant ×2) | Dust | **Élevée** pour l'on-prem | Test de déploiement hors liste (à mener par l'agent principal, sans exécution dans cette recherche). |
| R4 | Amont figé, failles de sécurité corrigées en 2026 (CSRF OAuth, injection SQL) | Coze Studio | **Élevée** | Audit de sécurité avant toute mise en production ; fork dur assumé. |
| R5 | Clauses de marque et de SaaS multi-tenant chez les concurrents (Dify, FastGPT, Open WebUI, LobeHub) | Écarté | — | Ne pas réutiliser de code de ces projets. |
| R6 | Dépendances chinoises (WeChat, Feishu, Douyin, DM8, Volcengine) | Bisheng, Coze | Moyenne | Inventaire des dépendances à retirer ou remplacer. |
| R7 | Failles récentes et volume d'avis | LiteLLM, Langflow, MaxKB | Moyenne | Veille sur les avis GHSA ; mise à jour régulière ; Scorecard de LiteLLM 6,1/10 à surveiller. |
| R8 | Bêta et petite équipe | OpenGateLLM | Moyenne | Ne pas en faire un point unique de défaillance ; figer une version. |
| R9 | Concentration des commits (11 auteurs sur 90 j) | Sim | Moyenne | Vérifier la continuité de l'équipe (inférence). |
| R10 | Nom « dust » générique : collisions de marque et de référencement | Dust | Faible à moyenne | Vérifier la disponibilité du nom à l'INPI et dans les bases de marques avant tout choix. |

---

## 5. Points à valider (non vérifiés dans cette recherche)

- **Ergonomie (C6)** : aucune interface n'a été lancée ni capturée. Les notes C6 viennent de la structure du code et de la documentation.
- **Fonctions Studio citées comme « partielles »** : plusieurs cellules de la carte ◐ demandent un test fonctionnel (Playground, Skills, Prompts versionnés, Audio).
- **Bisheng** : clarifier les fonctions « commercial edition » auprès du producteur ; vérifier le SSO réel (SAML ou OIDC ou LDAP).
- **Dust** : vérifier l'option d'auto-hébergement auprès de l'éditeur ; évaluer le remplacement de WorkOS.
- **Coze Studio** : demander à l'éditeur si l'amont reprend ; vérifier l'existence de commits non publiés (le numéro de PR #2723 est supérieur au nombre de commits publics, 392 : historique réécrit ou import (inférence)).
- **BuildingAI** : aucun dépôt identifié.
- **Pipelex** : licence non lue ; **NocoBase** : lecture partielle du contrat.
- **Projets non évalués en profondeur** : Agenta, Langfuse, Opik, Letta, Higress, Bifrost, Onyx, Mastra, Kestra, AgentScope, Agno, Rivet, LibreChat, AnythingLLM, La Suite Conversations, PipesHub.

---

## 6. Annexe : méthode et sources

**Méthode**
- **Métadonnées** : `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/<owner>%2F<repo>` (licence, étoiles, push, archivage, Scorecard pour LiteLLM). Aucune requête à l'API GitHub.
- **Licences** : fichiers bruts `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/LICENSE` (et variantes `LICENSE-APACHE`, `LICENSE.md`, `LICENSE.txt`, `ee/LICENSE`, `apps/sim/ee/LICENSE`) lus dans les clones.
- **Code** : `git clone --depth 1` de 44 dépôts dans `$SP/oss-bases/` (lecture seule, rien installé ni exécuté).
- **Activité** : `git clone --filter=blob:none --no-checkout` (historique sans blobs) pour 9 projets : commits, auteurs, tags, commits des 90 derniers jours (21/10/2026).
- **Avis de sécurité** : pages HTML publiques `https://github.com/<owner>/<repo>/security/advisories` (sans jeton ; première page de 10 avis et pagination).
- **Mesures de code** : lignes des fichiers de code (TS, TSX, JS, Python, Go, Rust, Vue) hors dossiers de dépendances (`node_modules`, `vendor`, `dist`, `build`) et hors fichiers dont le nom contient « test » ou « spec » ; fichiers de test comptés par nom ; occurrences de marque par recherche insensible à la casse ; les mots-clés (« role », « workspace », « audit », etc.) sont des **indicateurs approximatifs** (bruit notable : « role » et « space » apparaissent dans beaucoup de code non lié).
- **Recherches web** (Firecrawl, quatre requêtes) : alternatives à Dify, Coze, Mistral AI Studio, Vertex et Bedrock AgentCore ; projets français ; BuildingAI (sans résultat exploitable).
- **Notes** : chaque note C est une appréciation à partir des faits listés dans la fiche, pas une mesure.

**Sources principales (URL)**
- Dépôts : https://github.com/coze-dev/coze-studio ; https://github.com/coze-dev/coze-loop ; https://github.com/dataelement/bisheng ; https://github.com/dust-tt/dust ; https://github.com/simstudioai/sim ; https://github.com/langflow-ai/langflow ; https://github.com/1Panel-dev/MaxKB ; https://github.com/BerriAI/litellm ; https://github.com/etalab-ia/OpenGateLLM
- Licences de rejet : https://github.com/langgenius/dify/blob/main/LICENSE (définition « un tenant = un workspace ») ; https://github.com/labring/FastGPT/blob/main/LICENSE ; https://github.com/lobehub/lobehub/blob/main/LICENSE ; https://github.com/open-webui/open-webui/blob/main/LICENSE
- Métadonnées : https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/<owner>%2F<repo> (pour chaque projet cité)
- Sources secondaires : sim.ai, « Open Source AI Agent Platforms (2026) » (https://www.sim.ai/library/open-source-ai-agent-platforms) pour la licence Sustainable Use de n8n et la licence modifiée de Dify.
- Base existante : `/home/pc6/Desktop/Nexora Studio/docs/recherche/open-source/01-briques-moteur-ia.md` (recoupements et corrections, voir §1).
- Synthèse Studio : `/home/pc6/Desktop/Nexora Studio/docs/recherche/mistral-studio/00-synthese.md` (§3 carte, §4 console).

**Chemins de travail (lecture seule)** : `/tmp/claude-1000/-home-pc6--claude-spares-spare-uLDMGF/e8c957db-5c05-499a-8980-d742c3991fc0/scratchpad/oss-bases/` (clones `owner__repo`, tableau `tri/tri.json`, historiques `hist/`, scripts `tri.py`, `metrics.py`, `cov.py`). Quelques dossiers sans suffixe (`dust`, `onyx`, `anythingllm`, `openclaw`, `pipeshub`, `aionui`, `lasuite-conversations`, `librechat`) ont été créés par d'autres travaux et n'ont pas été utilisés comme sources.

**Limites**
- Aucune installation, aucune exécution, aucune capture d'écran.
- Les chiffres d'activité portent sur les 90 jours précédant le 21/10/2026 et sur l'historique public seul (un amont privé ou un monorepo synchronisé peut fausser ces chiffres).
- Les avis de sécurité sont ceux qui apparaissent sur la page publique ; une absence d'avis n'est pas une garantie.
- Les mesures de code sont des ordres de grandeur, pas des audits.
