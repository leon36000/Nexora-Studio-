# 04 — Bases open source pour l'application utilisateur (assistant / cowork) et les agents d'entreprise

**Date de l'état des lieux** : 21/10/2026 · **Périmètre** : base de l'application utilisateur (équivalent de Vibe Work et Le Chat) et base des agents connectés aux outils des PME · **Sans prix ni tarif** (consigne du fondateur) · **Statut** : recherche. Rien n'a été installé ni exécuté : clones `--depth 1` en lecture seule, métadonnées ecosyste.ms, fichiers LICENSE bruts, comptages statiques. Aucune décision de conception n'est prise ici ; la décision finale revient à l'agent principal.

**Articulation avec la base existante** : `docs/recherche/mistral-studio/` (00-synthèse §2-3 ; 22-vibe-work-le-chat « En bref ») et `docs/recherche/open-source/01-briques-moteur-ia.md`. Marqueurs : 🆕 = absent de 01 ; « ✔ confirme 01 » = le fait recoupe 01 ; « ⚠️ contredit X » = le fait contredit 01 (aucun cas relevé).

---

## En bref

**Réponse courte** : oui, il existe des bases open source sérieuses pour l'application utilisateur, mais aucune ne couvre seule l'ensemble de Vibe Work. Le meilleur compromis est une combinaison : une base de chat multi-utilisateurs (LibreChat) et un moteur d'agents connectés aux outils (Onyx), relié à la plateforme Nexora par une API compatible OpenAI et, pour les outils, par MCP (inférence sur les faits de la section 5).

**Classement final argumenté** (8 finalistes évalués sur la grille C1–C10 ; note totale sur 50) :

| Rang | Projet | Note | Rôle recommandé | Motif principal |
|---|---|---:|---|---|
| 1 | **LibreChat** (MIT) | 35 | **Base de l'application utilisateur** | Base MIT complète qui réunit multi-utilisateurs, SSO SAML/OIDC/LDAP, rôles et admin, agents, MCP, skills, tâches planifiées, artefacts, mémoire et approbations **sans dossier commercial** (aucun `ee/`). Faiblesses : pas de connecteurs SaaS natifs (MCP seulement), RAG déporté dans un service, français couvrant ~41 % des clés. |
| 2 | **Onyx** (MIT hors `ee/`) | 38 | **Moteur d'agents et de connecteurs** (à isoler en service) | Meilleure couverture fonctionnelle (12 briques Vibe sur 14 présentes dans le code, dont 61 connecteurs, Craft = agent « coworker » avec sandbox, tâches planifiées, approbations). Mais la gouvernance entreprise (SSO, SCIM, groupes, audit, facturation, tenants) est dans `ee/` sous licence commerciale : c'est un veto juridique pour un SaaS PME, pas seulement une note. Rebranding le plus lourd (paquet Python `onyx`). |
| 3 | **AnythingLLM** (MIT) | 34 | Option légère | MIT sans `ee/`, français en parité complète (1 254 clés), workspaces RAG, flows d'agents, tâches planifiées, MCP, voix. Gouvernance faible (pas d'audit, pas de SCIM, SSO partiel), pas de sandbox de code. |
| 4 | La Suite Conversations (MIT, DINUM) | 32 | À surveiller (souveraineté) | Assistant français, Albert comme LLM, intégration La Suite Docs. Mais « very early stage » (README), 76 étoiles, couverture fonctionnelle faible. |
| 5 | AionUi (Apache-2.0) | 31 | Inspiration + client desktop | Meilleur cowork desktop pour agents CLI (multi-agents, tâches planifiées, skills, MCP, français complet). **Veto multi-utilisateurs** : un seul compte seedé, backend Rust dans un dépôt séparé (AionCore). |
| 6 | Dust (MIT) | 31 | Inspiration (agents, triggers, workflows) | Plateforme d'agents la plus proche d'un cowork d'entreprise, français complet. **Veto auto-hébergement** : authentification dépendante de WorkOS (249 fichiers), aucune documentation d'auto-hébergement dans le dépôt. |
| 7 | OpenClaw (MIT) | 30 | Inspiration uniquement | Couverture la plus large (canaux de messagerie, cron, canvas, mémoire, voix, approbations, MCP). **Veto modèle de confiance** : le SECURITY.md exclut explicitement une gateway partagée multi-tenant (« one user per machine/host »). |
| 8 | PipesHub (Apache-2.0) | 29 | Brique connecteurs et graphe | 38 sources de données et recherche permissionnée. **Veto** : pile d'infrastructure très lourde (Kafka, Zookeeper, Neo4j, ArangoDB, Qdrant, MongoDB…) et aucune locale française. |

**Ce qui est écarté dès le tri** (licence ou inactivité, voir §2) : Open WebUI (clause de marque obligatoire), LobeHub (licence commerciale requise pour dériver), Dify et FastGPT (multi-tenant interdit + logo), Suna (Elastic License 2.0), Cherry Studio et Khoj (AGPL), chatbot-ui (inactif depuis 08/2024), Kotaemon (inactif depuis 99 jours), OpenManus et Twake Workplace (licence absente ou non identifiée, inactifs).

**Constats majeurs** :
1. **Aucun projet ne couvre les 14 briques de Vibe Work à la fois en open source sans restriction.** Onyx en couvre le plus (12 présentes), LibreChat le plus simplement sous licence libre complète (10 présentes, 1 absente).
2. **La frontière `ee/` est le point juridique décisif.** Onyx (et OpenWork, hors finalistes) réserve les fonctions d'entreprise à un contrat commercial dans des dossiers `ee/`. Dify et FastGPT, hors finalistes, interdisent le SaaS multi-tenant sans accord. LibreChat, AnythingLLM, Dust, La Suite, AionUi, OpenClaw et PipesHub ne contiennent aucun dossier `ee/` (vérifié).
3. **Le français est un critère discriminant** : Onyx (7 209 clés, 100 % présentes), Dust (3 889 messages `.po` traduits, 0 vide), AnythingLLM (parité) et AionUi (parité, traductions réelles) sont prêts ; LibreChat n'en couvre que ~41 % ; PipesHub n'a aucune locale française.
4. **Les projets « agents desktop » (AionUi, Eigent, Goose, OpenWork, Jan) sont mono-utilisateur par construction.** Ils sont utiles comme inspiration UX ou comme client, pas comme base d'une suite multi-utilisateurs PME.
5. **Vibe Work s'appuie sur des fonctions que la plupart des projets n'ont pas** : skills persistants, canvas versionné, bibliothèques partagées avec permissions, tâches planifiées avec pré-autorisation (voir §4 la carte de couverture).

---

## 1. Méthode (résumé ; détails en annexe)

- **Tri** : licence lue dans le fichier LICENSE brut (raw.githubusercontent.com, pas d'API GitHub), activité via ecosyste.ms (date du dernier push ; seuil : push après le 21/07/2026), archivage, présence de dossiers `ee/`/`enterprise/`.
- **Finalistes** : les 8 projets qui passent le tri **et** répondent à l'usage (assistant multi-utilisateurs, agents connectés).
- **Lecture de fond** : clone `--depth 1` de LibreChat, AnythingLLM, Onyx, Dust, La Suite Conversations, OpenClaw, PipesHub, AionUi (hash en annexe). Comptages : lignes (comptage brut, tests inclus), fichiers de test (par nom), workflows CI, clés de traduction, occurrences de marque hors documentation et tests, présence de répertoires de fonctionnalités.
- **Limites** : les notes C6 (facilité d'utilisation) et les cartes de couverture sont **documentaires** (inférence à partir du code) ; rien n'a été lancé. Les comptages de « présence » (mots-clés dans le code) sont des indices, pas des preuves de fonctionnement.

---

## 2. Tableau de tri

Verdicts : **Retenu** = finaliste (licence + activité + usage) · **Écarté (licence)** · **Écarté (inactif)** · **Écarté (usage)** = passe licence et activité mais ne correspond pas à l'usage.

### 2.1 Retenus pour évaluation approfondie (8)

| Projet | Licence (LICENSE brut) | Dernier push | ★ | Verdict | Motif |
|---|---|---|---:|---|---|
| LibreChat-AI/LibreChat | MIT ; aucun `ee/` | 2026-10-20 | 46 049 | Retenu | ✔ confirme 01 (MIT) |
| onyx-dot-app/onyx | MIT hors `ee/` ; `backend/ee`, `web/src/ee`, `web/src/app/ee` sous Onyx Enterprise License | 2026-10-17 | 32 543 | Retenu (ee à isoler) | ✔ confirme 01 ; ee = SSO, SCIM, audit, facturation |
| Mintplex-Labs/anything-llm | MIT | 2026-10-21 | 67 406 | Retenu | 🆕 |
| suitenumerique/conversations | MIT (DINUM) | 2026-10-20 | 76 | Retenu | 🆕 |
| dust-tt/dust | MIT ; aucun `ee/` | 2026-10-20 | 1 490 | Retenu | ✔ confirme 01 (1 490 ★, MIT) |
| iOfficeAI/AionUi | Apache-2.0 (texte standard) | 2026-10-14 | 33 590 | Retenu | 🆕 (suggéré par le fondateur) |
| openclaw/openclaw | MIT | 2026-10-17 | 392 267 | Retenu | 🆕 |
| pipeshub-ai/pipeshub-ai | Apache-2.0 | 2026-10-17 | 3 837 | Retenu | 🆕 |

### 2.2 Écartés pour licence (feu rouge ou orange)

| Projet | Licence (LICENSE brut) | Dernier push | ★ | Verdict | Motif |
|---|---|---|---:|---|---|
| open-webui/open-webui | « Open WebUI License » : BSD-3 + clause 4 interdisant de retirer ou modifier la marque « Open WebUI », sauf déploiements de moins de 50 utilisateurs finaux sur 30 jours glissants, accord écrit ou licence entreprise | 2026-10-20 | 156 278 | Écarté (licence, rouge) | ✔ confirme 01 (clause de marque). Rebranding complet interdit au-delà de 50 utilisateurs. |
| lobehub/lobehub (ex lobe-chat) | LobeHub Community License : usage commercial autorisé « sans modifier le code », mais développer et distribuer un dérivé exige une licence commerciale | 2026-10-22 | 83 395 | Écarté (licence, rouge) | Un fork rebrandé est un dérivé : licence commerciale requise. 🆕 |
| langgenius/dify | « Dify Open Source License » (Apache modifiée) : SaaS multi-tenant interdit sans accord ; LOGO et copyright à conserver | 2026-10-16 | 158 639 | Écarté (licence, rouge) | ✔ confirme 01 (licence modifiée). Pertinent pour Studio, pas pour l'assistant. |
| labring/FastGPT | Licence FastGPT (Apache modifiée) : SaaS multi-tenant « similaire » interdit sans accord ; LOGO | 2026-10-20 | 29 874 | Écarté (licence, rouge) | 🆕 |
| kortix-ai/suna | Elastic License 2.0 : interdiction de fournir le logiciel comme service hébergé | 2026-10-17 | 20 278 | Écarté (licence, rouge) | 🆕 |
| CherryHQ/cherry-studio | AGPL-3.0 | 2026-10-19 | 52 763 | Écarté (licence, orange) | Application desktop mono-utilisateur ; AGPL si modifiée et servie en réseau. 🆕 |
| khoj-ai/khoj | AGPL-3.0 | 2026-08-02 | 37 754 | Écarté (licence, orange) | Assistant « second cerveau » personnel. 🆕 |
| nextcloud/assistant | AGPL-3.0 | 2026-10-22 | 93 | Écarté (licence, orange) | Application dépendante de Nextcloud. 🆕 |
| Bin-Huang/chatbox | GPL-3.0 | non disponible (ecosyste.ms) | n.d. | Écarté (licence, orange) | Desktop ; activité non vérifiable. 🆕 |
| reworkd/AgentGPT | GPL-3.0 | 2025-04-29 (archivé) | 36 278 | Écarté (archivé, orange) | 🆕 |

### 2.3 Écartés pour inactivité (> 3 mois) ou licence absente

| Projet | Licence | Dernier push | ★ | Verdict | Motif |
|---|---|---|---:|---|---|
| mckaywrigley/chatbot-ui | MIT | 2024-08-03 | 33 326 | Écarté (inactif) | Plus de push depuis 14 mois. 🆕 |
| Cinnamon/kotaemon | Apache-2.0 | 2026-07-14 | 25 808 | Écarté (inactif) | 99 jours sans push (seuil : 3 mois). 🆕 |
| mannaandpoem/OpenManus | aucun fichier LICENSE (404) | 2025-06-21 | 703 | Écarté (licence absente, inactif) | 🆕 |
| linagora/twake-workplace (alias linagora/twake) | aucun fichier LICENSE (404) | 2024-06-11 | 196 | Écarté (licence non identifiée, inactif) | 🆕 |

### 2.4 Passent licence et activité, écartés pour l'usage

| Projet | Licence (LICENSE brut) | Dernier push | ★ | Verdict | Motif |
|---|---|---|---:|---|---|
| janhq/jan | Apache-2.0 (fichier LICENSE = notice + mention Apache, attribution demandée) | 2026-10-16 | 44 978 | Écarté (usage) | Application desktop locale mono-utilisateur. 🆕 |
| enricoros/big-AGI | MIT | 2026-10-16 | 7 150 | Écarté (usage) | Mono-utilisateur, peu de connecteurs. 🆕 |
| ChatGPTNextWeb/NextChat | MIT | 2026-10-15 | 88 851 | Écarté (usage) | Client desktop/web, pas de back-office. 🆕 |
| huggingface/chat-ui | Apache-2.0 | 2026-10-15 | 10 985 | Écarté (usage) | Interface de chat seule (pas d'agents ni connecteurs) : brique UI. 🆕 |
| zylon-ai/private-gpt | Apache-2.0 | 2026-10-16 | 57 591 | Écarté (usage) | RAG local, pas d'assistant multi-utilisateurs. 🆕 |
| eigent-ai/eigent | Apache-2.0 | 2026-10-20 | 15 620 | Écarté (usage) | Desktop multi-agents mono-utilisateur : inspiration. 🆕 |
| aaif-goose/goose (ex block/goose) | Apache-2.0 | 2026-10-22 | 55 514 | Écarté (usage) | Agent CLI/desktop (MCP) : brique agent. 🆕 |
| different-ai/openwork | MIT hors `ee/` (EE License) ; versions anciennes sous FSL-1.1 | 2026-10-18 | 24 161 | Écarté (usage) | Desktop mono-utilisateur ; historique FSL. 🆕 |
| lfnovo/open-notebook | MIT | 2026-10-13 | 40 162 | Écarté (usage) | NotebookLM-like mono-utilisateur. 🆕 |
| Agenta-AI/agenta | MIT hors `ee/` | 2026-10-20 | 4 848 | Écarté (usage) | LLMOps : relève de Studio (observabilité, évaluations). 🆕 |
| OpenHands/OpenHands (ex All-Hands-AI) | MIT (dossier `enterprise/` non examiné) | 2026-10-22 | 91 499 | Écarté (usage) | Agent de développement ; ✔ confirme 01 (MIT hors ee). |
| continuedev/continue ; cline/cline | Apache-2.0 | 2026-10-19 ; 2026-10-21 | 36 267 ; 70 711 | Écarté (usage) | Assistants d'IDE : hors périmètre. 🆕 |
| langchain-ai/agent-chat-ui | MIT | 2026-10-15 | 3 222 | Écarté (usage) | Composant d'interface pour LangGraph : brique. 🆕 |
| assistant-ui/assistant-ui ; CopilotKit/CopilotKit | MIT | 2026-10-20 ; 2026-10-16 | 12 643 ; 38 044 | Écarté (usage) | Bibliothèques d'interface pour agents : briques. 🆕 |
| NousResearch/hermes-agent | MIT | 2026-10-19 | 255 054 | Écarté (usage) | Runtime d'agent : brique possible. 🆕 |
| suitenumerique/docs | MIT | 2026-10-14 | 16 927 | Écarté (usage) | Éditeur documentaire collaboratif : complément à intégrer (La Suite Conversations s'y raccorde). 🆕 |
| letta-ai/letta | Apache-2.0 | 2026-09-10 | 25 171 | Écarté (usage) | Agents à mémoire (serveur) : ✔ confirme 01. |
| infiniflow/ragflow | Apache-2.0 | 2026-10-17 | 92 427 | Écarté (usage) | Moteur RAG : ✔ confirme 01. |
| simstudioai/sim | Apache-2.0 | 2026-10-17 | 29 834 | Écarté (usage) | Constructeur de workflows d'agents : relève de Studio. 🆕 |
| dataelement/bisheng | Apache-2.0 | 2026-10-16 | 12 061 | Écarté (usage, non évalué) | Plateforme d'applications LLM : à considérer pour Studio. 🆕 |
| getomnico/omni | Apache-2.0 | 2026-09-29 | 806 | Écarté (usage, à surveiller) | Recherche d'entreprise à connecteurs (Rust), jeune. 🆕 |

**Non vérifiés** : QAnswer (offre française « alternative souveraine », aucun dépôt public identifié) ; Kuse (aucun dépôt trouvé). 🆕

---

## 3. Fiches détaillées des finalistes

Notes de 0 à 5 (critères de la grille, justification par des faits). Les faits viennent des clones (commit en annexe) sauf mention contraire.

### 3.1 LibreChat (LibreChat-AI/LibreChat) — rang 1

**Identité** : MIT (LICENSE brut ; aucun dossier `ee/`). Créé le 12/02/2023 ; dernier push 20/10/2026 ; 46 049 ★ ; 979 issues ouvertes ; 113 tags ; 2 102 commits et 173 contributeurs (ecosyste.ms, historique indexé). ✔ confirme 01 (MIT).

**Pile** : monorepo TypeScript/React (`client/`, `api/`, `packages/`), Node/Express ; MongoDB, Meilisearch, base vectorielle ; service Python `rag_api` séparé ; `docker-compose.yml` (api, admin-panel, mongodb, meilisearch, vectordb, rag_api) ; Helm (`helm/librechat`, `helm/librechat-rag-api`).

**Preuves** :
- SSO : `api/strategies/` contient `samlStrategy.js`, `openidStrategy.js`, `openIdJwtStrategy.js`, `ldapStrategy.js` et des connexions sociales.
- Services : `api/server/services/` contient Agents, MCP, Skills, Schedules, Artifacts ; composants : Projects, Memories (SidePanel), Chat/approval, Subagents, Plugins.
- Gouvernance : `packages/data-schemas/src/tenant/` (politiques, sondes, conformité Mongoose), `packages/data-schemas/src/admin/` (capacités), `api/server/routes/admin/`.
- Modèles : endpoints « custom » compatibles OpenAI (`librechat.example.yaml`, section `custom:`, base URL configurable).
- Tests : 2 676 fichiers de test (comptage par nom, e2e inclus) ; 31 workflows CI.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 4 | Présents : Projects, Memories, MCP, Skills, Schedules, Artifacts, web search, voix (routes speech), approbations, agents. Partiels : RAG (service séparé), code interpreter (service externe), workflows (agents et handoffs, pas de moteur durable). Absent : connecteurs SaaS natifs. |
| C2 Maturité | 4 | 2 102 commits, 173 contributeurs, 113 tags, 31 workflows CI, release fréquente. Réserve : 979 issues ouvertes. |
| C3 Architecture | 4 | Séparation API / client / services, endpoints OpenAI-compatibles, MCP client, RAG déporté. Monorepo lourd (~1,9 M lignes de TS/TSX/JS, tests inclus). |
| C4 Multi-tenant / gouvernance | 3 | Rôles et admin, `tenant/`, SAML/OIDC/LDAP dans le libre. Pas de SCIM identifié (3 occurrences), journal d'audit peu visible. |
| C5 Déploiement | 4 | Docker Compose complet, Helm chart ; besoins : MongoDB, Meilisearch, base vectorielle, service RAG. |
| C6 Facilité (inférence documentaire) | 4 | Interface ChatGPT-like connue des utilisateurs ; non testée (rien exécuté). |
| C7 Internationalisation | 2 | `client/src/locales/fr/translation.json` : 1 492 clés sur 3 678 (≈ 41 %) ; 2 186 clés à traduire. |
| C8 Rebranding / divergence | 3 | Marque : 2 354 fichiers et 6 629 occurrences hors docs, tests et i18n ; 1 logo principal. Licence MIT : fork dur possible, suivi de l'amont facile si le code Nexora reste dans des paquets séparés. |
| C9 Sécurité | 3 | Page des avis publiés : 10 GHSA et 3 CVE sur la première page ; dernier avis publié le 02/06/2026 (inactivité relative sur ce point). |
| C10 Pérennité | 4 | 46 000 ★, 9 465 forks, 173 contributeurs ; MIT ; organisation dédiée (LibreChat-AI). Risque : projet porté par une petite équipe (inférence). |
| **Total** | **35** | |

### 3.2 Onyx (onyx-dot-app/onyx) — rang 2

**Identité** : MIT hors `ee/`. Anciennement Danswer. Créé le 27/04/2023 ; dernier push 17/10/2026 ; 32 543 ★ ; 601 issues ouvertes ; 2 785 commits, 121 contributeurs.

**Licence (point décisif)** : le fichier LICENSE distingue trois zones : (a) `backend/ee`, `web/src/ee`, `web/src/app/ee` sous **Onyx Enterprise License** ; (b) les composants tiers sous leur licence ; (c) le reste sous MIT. La licence EE indique que l'usage en production exige un abonnement Onyx et une licence pour le nombre de sièges utilisateurs. Dans `backend/ee/onyx/` : `auth/` (SSO, vérification de domaine), `server/scim/`, `server/billing/`, `server/tenants/`, `server/user_group/`, `server/log_export/`, `server/usage_limits.py`, `server/token_rate_limits.py`, `license/`, `gateway/`, `analytics/`, `reporting/`. Le cœur appelle ces modules via `global_version.is_ee_version()` et `fetch_versioned_implementation`, avec trois paliers (`COMMUNITY`, `BUSINESS`, `ENTERPRISE`, `backend/onyx/server/settings/tier_order.py`).

**Pile** : Python (4 162 fichiers, ~0,95 M lignes), TSX/Next.js (~0,29 M lignes), Go (518 fichiers : outillage CLI), Rust (desktop Tauri), mobile Expo/React Native. Compose : api_server, background, web_server, mcp_server, inference_model_server, indexing_model_server, OpenSearch, nginx, cache, MinIO, code-interpreter. Helm (`deployment/helm/charts/onyx`), composes airgap et multitenant, `terraform-provider-onyx`.

**Preuves** :
- Connecteurs : 61 répertoires dans `backend/onyx/connectors/` (Google Drive, Gmail, Slack, Confluence, Jira, Salesforce, Notion, SharePoint, Outlook, GitHub, GitLab, Linear, HubSpot, Freshdesk, Gitbook, etc.).
- Craft (agent « coworker ») : `docs/craft/` (features : `scheduled-tasks`, `subagents`, `egress-proxy-and-approvals`, `external-apps`, `search`, `user-library-sync`), `backend/onyx/skills/`, `backend/onyx/sandbox_proxy/`, `backend/onyx/coding_agent/`, `backend/onyx/deep_research/`, `backend/onyx/voice/`, `backend/onyx/mcp_server/`, `backend/onyx/federated_connectors/`.
- Interface : `web/src/app/craft/`, `web/src/app/mcp/`, `web/src/app/oauth-provider/`.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 4 (assistant 5 ; Studio 2) | 12 briques Vibe présentes (cf. §4). Absent ou faible : moteur de workflows durables, Studio (prompts versionnés, évaluations). |
| C2 Maturité | 5 | 2 785 commits, 121 contributeurs, 52 workflows CI, 2 812 fichiers de test, release continue ; 601 issues ouvertes. |
| C3 Architecture | 4 | Services séparés (API, background, serveurs de modèles, MCP), extensibilité par tiers et « versioned implementation » ; complexité élevée (inférence : OpenSearch + Postgres + Redis + MinIO + Celery). |
| C4 Multi-tenant / gouvernance | 3 | Socle libre (utilisateurs, permissions de documents) ; SSO, SCIM, groupes, audit et facturation **dans `ee/`** (licence commerciale). |
| C5 Déploiement | 4 | Compose, Helm, airgap et multitenant ; besoins matériels importants (serveurs de modèles, OpenSearch). |
| C6 Facilité (inférence) | 4 | Interface Craft et application mobile ; non testée. |
| C7 Internationalisation | 5 | `web/src/i18n/messages/` : 7 209 clés feuilles en `en` et `fr` (100 % présentes), 7 langues ; 260 valeurs seulement identiques à l'anglais (3,6 %). |
| C8 Rebranding / divergence | 3 | 2 559 fichiers et 24 743 occurrences hors docs, tests et i18n (le nom `onyx` sert aussi de paquet Python et de préfixe de variables). Frontière `ee/` à respecter : pas de copie de code EE. Fork soft possible si la surface est renommée sans toucher au paquet Python (inférence). |
| C9 Sécurité | 3 | Page des avis : 5 GHSA sur la première page ; dernier le 20/07/2026. Présence d'un proxy d'egress et de contrôles d'approbation (`egress-proxy-and-approvals`). |
| C10 Pérennité | 3 | Entreprise (DanswerAI) ; modèle open-core : la frontière `ee/` peut évoluer (la licence le prévoit expressément). |
| **Total** | **38** | |

### 3.3 AnythingLLM (Mintplex-Labs/anything-llm) — rang 3

**Identité** : MIT (LICENSE brut ; aucun `ee/`). Créé le 04/06/2023 ; dernier push 21/10/2026 ; 67 406 ★ ; 342 issues ; 38 tags ; 994 commits, 80 contributeurs. `TERMS_SELF_HOSTED.md` : engagement de confidentialité (pas d'accès de Mintplex aux données de l'instance), télémétrie désactivable, fonctionnement air-gapped possible avec fournisseurs locaux.

**Pile** : Node.js/Express (`server/`, Prisma 5.3.1), React 18/Vite (`frontend/`), LanceDB (vecteurs), `collector/` (chargeurs de documents, service séparé). Docker (un service), `cloud-deployments/` (AWS, DigitalOcean, GCP, Hugging Face Spaces, Kubernetes, OpenShift), chart Helm.

**Preuves** :
- Agents : `server/utils/agents/aibitat/plugins/` (gmail, google-calendar, outlook, web-browsing, web-scraping, sql-agent, create-scheduled-job, memory, generate-image, request-user-input, router) ; `server/utils/agentFlows/`.
- Mémoire : `server/utils/memories/` ; MCP : `server/utils/MCP/` (dont hypervisor).
- Voix : `server/utils/SpeechToText/` et `TextToSpeech/` (plusieurs fournisseurs).
- Administration : pages Users, Invitations, Workspaces, Logging, Agents, AgentBuilder, ScheduledJobs ; `frontend/src/pages/Login/SSO`.
- Rôles : `server/models/user.js` (admin, manager, default).
- Chargeurs : Confluence, Drupal wiki, Obsidian, Paperless-ngx, dépôts, sites, transcriptions YouTube.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 3 | Présents : workspaces RAG, mémoire, MCP, flows, tâches planifiées, voix, Gmail/Outlook/Agenda via agents. Absents : canvas (4 fichiers), sandbox de code (0). |
| C2 Maturité | 4 | 994 commits, 80 contributeurs, 38 tags, 9 workflows CI. Réserve : 87 fichiers de test seulement (≈ 22 k lignes), faible au regard de la taille (219 k lignes JS/JSX). |
| C3 Architecture | 3 | Monolithe Node + collecteur séparé ; Prisma et LanceDB embarqués (simple à déployer, moins à l'échelle). |
| C4 Multi-tenant / gouvernance | 2 | Rôles admin/manager/default, workspaces ; pas de SCIM, pas de journal d'audit identifié, SSO partiel (page présente, SAML/OIDC peu couverts). |
| C5 Déploiement | 4 | Docker, Helm et modèles cloud ; air-gap possible avec fournisseurs locaux. |
| C6 Facilité (inférence) | 4 | Application autonome avec interface soignée ; non testée. |
| C7 Internationalisation | 4 | `frontend/src/locales/fr/common.js` : 1 254 clés, parité avec `en` (1 254) ; ~30 locales. |
| C8 Rebranding / divergence | 4 | 213 fichiers et 770 occurrences hors docs et tests : marque concentrée ; MIT. |
| C9 Sécurité | 3 | Page des avis : 11 GHSA sur la première page ; dernier le 21/09/2026 (réactif). |
| C10 Pérennité | 3 | 67 000 ★, entreprise Mintplex Labs (offre cloud), télémétrie optionnelle. |
| **Total** | **34** | |

### 3.4 La Suite Conversations (suitenumerique/conversations) — rang 4

**Identité** : MIT (copyright DINUM). Créé le 26/06/2025 ; dernier push 20/10/2026 ; 76 ★ ; 130 issues ; 25 tags ; 269 fichiers de test ; 9 workflows CI. README : « very early stage. Breaking changes may occur at any time ».

**Pile** : Django 5 et Celery/Redis, PostgreSQL (backend Python ~64 k lignes) ; frontend TSX (`src/frontend/apps/conversations`) ; Vercel AI SDK et Pydantic AI (cités par le README).

**Preuves** : `src/backend/chat/agents/` (base, conversation, presentation, summarize) ; `src/backend/chat/agent_rag/` (document_rag_backends, document_converter, Albert) ; `chat/views/edit_in_docs.py` (intégration La Suite Docs) ; `llm_configuration.py` (base_url et type `openai` : compatible API OpenAI) ; `chat/tests/agents/test_albert_models.py`. Déploiement : chart Helm ; Compose annoncé « in the works » (README) ; Keycloak dans l'environnement de développement.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 2 | Présents : projets (panneau gauche), agents, RAG documentaire, recherche web (Albert), édition dans Docs. Absents : tâches planifiées, skills, approbations, voix, code, connecteurs. |
| C2 Maturité | 2 | Projet de 16 mois, 25 tags, 76 ★ ; 269 tests, CI présente ; API instable (README). |
| C3 Architecture | 4 | Django propre, Celery, LLM en configuration par variables ; bonne base pour un développeur Python. |
| C4 Multi-tenant / gouvernance | 3 | OIDC (pile La Suite / Keycloak) ; pas de RBAC ni d'audit identifiés. |
| C5 Déploiement | 3 | Helm (principal) ; Compose de développement seulement. |
| C6 Facilité (inférence) | 3 | Interface de La Suite ; non testée. |
| C7 Internationalisation | 4 | Français de premier rang (`fr_FR` côté backend et frontend, 242 clés, comme ru et uk). |
| C8 Rebranding / divergence | 4 | Base de code petite (~96 k lignes) ; marque DINUM/La Suite à retirer (15 fichiers) ; mais forte couplage à l'écosystème La Suite. |
| C9 Sécurité | 3 | Aucun avis publié visible ; code jeune, peu audité (inférence). |
| C10 Pérennité | 4 | Soutenu par la DINUM (écosystème public) ; risque de priorités administratives (inférence). |
| **Total** | **32** | |

### 3.5 AionUi (iOfficeAI/AionUi) — rang 5 (analyse dédiée en §5)

**Identité** : Apache-2.0 (texte standard). Créé le 07/08/2025 ; dernier push 14/10/2026 ; 33 590 ★ ; 867 issues ; 275 tags ; 662 fichiers de test ; 14 workflows CI.

**Pile** : Electron 37, TypeScript/React (`packages/desktop`, ~286 k lignes TS/TSX) ; serveur WebUI (`packages/web-host`, `packages/web-cli`) ; Dockerfile (Bun, `ALLOW_REMOTE`) ; SQLite (tables `users`, `conversations`, `messages`, `teams`, `mailbox`, `team_tasks`, `cron_jobs`, `remote_agents`) ; **backend `aioncore` en Rust dans un dépôt séparé** (iOfficeAI/AionCore, Apache-2.0, 120 ★, téléchargé au moment du packaging, `aioncoreVersion` = v0.2.2) ; moteur d'agent `aionrs` (Rust, Apache-2.0, 127 ★, dépôt séparé) ; mobile Expo 55 / React Native 0.83.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 3 | Multi-agents (ACP : Claude Code, Codex, Gemini, Qwen, Goose, OpenCode… selon README), cron, skills, MCP, aperçu de fichiers, génération Office, canaux (Telegram, Lark, DingTalk, WeChat). Absents : connecteurs SaaS, bibliothèque documentaire, RBAC. |
| C2 Maturité | 4 | 275 tags, 14 workflows CI, 662 fichiers de test, push récent. Réserve : 867 issues ouvertes ; cœur serveur dans un autre dépôt. |
| C3 Architecture | 3 | Interface Electron + serveur Node + backend Rust + moteur Rust : trois dépôts à maîtriser pour un fork complet. |
| C4 Multi-tenant / gouvernance | 1 | Compte `system_default_user` seedé, mot de passe admin unique (`ensureAdminPassword.ts`) ; aucun RBAC, SSO, SCIM ni audit identifié. |
| C5 Déploiement | 3 | Installeurs desktop ; image Docker du serveur WebUI ; SQLite mono-nœud. |
| C6 Facilité (inférence) | 4 | Cowork desktop grand public ; non testée. |
| C7 Internationalisation | 5 | `fr-FR` présent dans 22 espaces de noms JSON, parité de clés avec `en-US` ; 568 clés dans `conversation.json`, dont 34 identiques à l'anglais (6 %) : traduction réelle. 13 locales. |
| C8 Rebranding / divergence | 3 | 1 358 fichiers et 6 576 occurrences du nom ; le backend est un binaire externe à re-construire ou à forker. |
| C9 Sécurité | 2 | Aucun avis publié visible ; exécution d'agents CLI sur la machine hôte (pas de sandbox) ; dépendance à un binaire Rust téléchargé au packaging (vigilance chaîne d'approvisionnement, inférence). |
| C10 Pérennité | 3 | Forte communauté (33 k ★) et calendrier de releases dense ; société iOfficeAI, partenariats (Kimi) ; orientation produit grand public. |
| **Total** | **31** | |

### 3.6 Dust (dust-tt/dust) — rang 6

**Identité** : MIT (copyright 2022, Stanislas Polu). Dernier push 20/10/2026 ; 1 490 ★ ; 393 issues ; 40 workflows CI ; 2 074 fichiers de test. ✔ confirme 01 (MIT, 1 490 ★).

**Pile** : `front/` (Next.js, React 18.3), `front-api/`, `core/` (Rust, 262 k lignes), `connectors/` (TypeScript), Temporal (`temporal/`), Elasticsearch, Qdrant (×2), FoundationDB, PostgreSQL, Redis, Tika, Gotenberg ; sandbox de code (`cli/dust-sandbox`). Compose de développement uniquement.

**Points de contrôle** :
- **Authentification** : 249 fichiers du front référencent WorkOS (service commercial). SCIM et SSO sont des attributs de plans (`isSCIMAllowed`, `components/poke/plans/`).
- **Auto-hébergement** : le README tient en trois lignes ; aucun document d'auto-hébergement n'est présent dans le dépôt (recherche « self-host » sans résultat).
- **Connecteurs** : 16 répertoires (Notion, Google Drive, Confluence, Slack, Salesforce, Zendesk, Intercom, GitHub, Microsoft, Snowflake, BigQuery, Gong, webcrawler, etc.).
- **Localisation** : `front/locales/fr-FR/` : 151 catalogues `.po`, 3 889 messages, 0 traduction vide (parité avec `en-US` et `de-DE`).

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 4 | Agents, espaces (connaissances), triggers, skills, MCP, Temporal, sandbox, 16 connecteurs. Absents : voix, canvas strict. |
| C2 Maturité | 3 | Forte activité (5 789 tags), 40 CI, ~2,3 M lignes. Contributeurs : non mesurés (historique non indexé par ecosyste.ms). |
| C3 Architecture | 2 | Pile très lourde (Elasticsearch, Qdrant, FoundationDB, Temporal, Rust, Tika…). |
| C4 Multi-tenant / gouvernance | 2 | Espaces et rôles présents, mais authentification WorkOS et fonctions d'entreprise liées aux plans. |
| C5 Déploiement | 2 | Pas de guide d'auto-hébergement dans le dépôt ; infrastructure lourde. |
| C6 Facilité (inférence) | 4 | Concepteur d'agents et triggers ; non testée. |
| C7 Internationalisation | 5 | fr-FR complet (3 889 messages traduits). |
| C8 Rebranding / divergence | 3 | Le nom « Dust » est ambigu dans le code (2 543 occurrences `dust-tt`, 2 273 `Dust `) ; dépendance WorkOS à remplacer. |
| C9 Sécurité | 3 | Aucun avis publié visible ; surface d'attaque large (outils, sandbox). |
| C10 Pérennité | 3 | Société française ; le dépôt public semble suivre le produit SaaS (inférence). |
| **Total** | **31** | |

### 3.7 OpenClaw (openclaw/openclaw) — rang 7

**Identité** : MIT (« Copyright (c) 2026 OpenClaw Foundation »). Créé le 24/11/2025 ; dernier push 17/10/2026 ; 392 267 ★ ; 82 457 forks ; 9 349 issues ; 517 tags ; 119 workflows CI ; 22 359 fichiers de test. Plusieurs renommages successifs (Warelay, Clawdbot, Moltbot, OpenClaw). Taille : ≈ 12 M lignes en comptage brut (TypeScript 10,6 M, Swift 0,47 M, Kotlin 0,25 M).

**Modèle de confiance (fait décisif)** : `SECURITY.md` indique que OpenClaw est une infrastructure « local-first … for trusted operators; it is not designed as a shared multi-tenant adversarial boundary » ; la recommandation est « one user per machine/host (or VPS), one gateway for that user ». `VISION.md` parle de « personal assistant » et de « team assistant » mais une gateway partagée n'est pas une frontière de sécurité.

**Couverture** : canaux (Slack, Teams, Telegram, WhatsApp, Discord, Feishu, iMessage), cron, canvas, boards, workboard, mémoire (core, LanceDB, wiki), skills, MCP (`src/mcp`, `mcp-relay`), voix (`voice-call`, `talk-voice`), navigateur, approbations, applications natives.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 4 | Très large pour un assistant personnel (cf. §4). |
| C2 Maturité | 4 | Activité exceptionnelle (119 CI, 517 tags) ; 9 349 issues ouvertes. |
| C3 Architecture | 3 | Monorepo très volumineux (≈ 12 M lignes) ; extensions modulaires. |
| C4 Multi-tenant / gouvernance | 1 | Modèle de confiance « un opérateur par gateway » : veto pour une base PME multi-utilisateurs. |
| C5 Déploiement | 3 | Compose (gateway, cli), `fly.toml`, `render.yaml`. |
| C6 Facilité (inférence) | 3 | Onboarding riche ; configuration dense. |
| C7 Internationalisation | 4 | 85 fichiers de locales dans `ui/src/i18n/locales/` ; français présent (`fr.ts`, module virtuel). |
| C8 Rebranding / divergence | 2 | « OpenClaw » dans 37 953 fichiers (456 k occurrences, documentation incluse) ; plusieurs renommages successifs ; marque de fondation. |
| C9 Sécurité | 2 | 10 GHSA sur la première page ; dernier le 11/09/2026 ; surface d'attaque (canaux, applications natives, outils système). |
| C10 Pérennité | 4 | Fondation, communauté massive. |
| **Total** | **30** | |

### 3.8 PipesHub (pipeshub-ai/pipeshub-ai) — rang 8

**Identité** : Apache-2.0 (texte standard). Créé le 06/03/2025 ; dernier push 17/10/2026 ; 3 837 ★ ; 210 issues ; 21 tags ; 3 209 fichiers de test ; 32 workflows CI ; ~3,0 M lignes (Python 2,4 M).

**Pile** : backend Python (FastAPI 0.136, LangChain, `agent_loop_lib/`), frontend Next.js 15 et React 19. Compose : MongoDB, Redis, Qdrant, ArangoDB, Neo4j, etcd, Zookeeper, Kafka, SearXNG, crawl4ai, sandbox, proxy de socket Docker, lecteurs web.

**Preuves** : 38 répertoires de sources (`backend/python/app/connectors/sources/` : Google, Microsoft, Slack, Notion, GitHub, GitLab, Atlassian, Salesforce, ServiceNow, Zendesk, Zoom, S3, Azure Blob, Postgres, Snowflake, Nextcloud, Dropbox, Box…). README : « 50+ connectors », graphe de connaissances, agents sans code, serveur MCP, SDK. Locales : cs-CZ, de-DE, en-IN, en-US, es-ES, hi-IN, ko-KR, zh-CN/SG/TW : **aucune locale française**.

| Critère | Note | Justification |
|---|:---:|---|
| C1 Couverture | 4 | Recherche permissionnée, connecteurs, agents, MCP, web, sandbox. Absents : skills, canvas, approbations explicites. |
| C2 Maturité | 4 | 3 209 tests, 32 CI, push récent ; 21 tags seulement. |
| C3 Architecture | 2 | Pile d'infrastructure très lourde (Kafka, Zookeeper, Neo4j, ArangoDB, Qdrant, MongoDB, Redis, etcd). |
| C4 Multi-tenant / gouvernance | 3 | Recherche selon les droits (permission-aware), RBAC, OIDC (partiel). |
| C5 Déploiement | 2 | Installeur et Compose, mais empreinte très lourde. |
| C6 Facilité (inférence) | 3 | Agents sans code ; non testée. |
| C7 Internationalisation | 2 | Infrastructure i18n présente, aucune locale française (ajout facile, traduction à faire). |
| C8 Rebranding / divergence | 3 | 1 455 fichiers, 20 815 occurrences ; Apache-2.0. |
| C9 Sécurité | 3 | 2 avis sur la première page ; proxy de socket Docker à sécuriser. |
| C10 Pérennité | 3 | Startup ; offre cloud propriétaire (« PipesHub Cloud ») (inférence). |
| **Total** | **29** | |

### 3.9 Synthèse des notes

| Projet | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | Total | Veto éventuel |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Onyx | 4 | 5 | 4 | 3 | 4 | 4 | 5 | 3 | 3 | 3 | **38** | Licence `ee/` pour SSO/SCIM/audit |
| LibreChat | 4 | 4 | 4 | 3 | 4 | 4 | 2 | 3 | 3 | 4 | **35** | — |
| AnythingLLM | 3 | 4 | 3 | 2 | 4 | 4 | 4 | 4 | 3 | 3 | **34** | Gouvernance faible |
| La Suite Conversations | 2 | 2 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | **32** | Maturité (projet très jeune) |
| AionUi | 3 | 4 | 3 | 1 | 3 | 4 | 5 | 3 | 2 | 3 | **31** | Mono-utilisateur |
| Dust | 4 | 3 | 2 | 2 | 2 | 4 | 5 | 3 | 3 | 3 | **31** | WorkOS, auto-hébergement non documenté |
| OpenClaw | 4 | 4 | 3 | 1 | 3 | 3 | 4 | 2 | 2 | 4 | **30** | Modèle de confiance mono-opérateur |
| PipesHub | 4 | 4 | 2 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | **29** | Infrastructure lourde, pas de français |

**Lecture du classement** : la note totale ne suffit pas. Onyx a la meilleure note mais son veto (`ee/`) porte sur la gouvernance, qui est indispensable à une suite PME ; LibreChat est placé premier comme base de l'application utilisateur parce que sa gouvernance est dans le libre et que son rebranding est plus léger. Les vétos de AionUi, Dust, OpenClaw et PipesHub les placent hors du rôle de base, même quand leur total est proche (inférence explicite sur la pondération).

---

## 4. Carte de couverture face à Vibe Work

Légende : ● présent dans le code · ◐ partiel ou à vérifier · ○ absent. Source : répertoires et fichiers nommés dans les fiches (§3) ; indices de présence, **pas de test fonctionnel**.

| Brique Vibe Work (chap. 22) | LibreChat | AnythingLLM | Onyx | Dust | La Suite Conv. | OpenClaw | PipesHub | AionUi |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1. Projects | ● Projects | ◐ workspaces | ● projets | ● spaces | ● projets | ◐ boards | ◐ | ◐ workspaces |
| 2. Libraries (RAG documentaire) | ◐ service rag_api | ● LanceDB + collecteur | ● recherche hybride | ● search_stores | ● agent_rag | ● memory-lancedb | ● Qdrant | ○ |
| 3. Knowledge (mémoire persistante) | ● Memories | ● memories | ● memories | ◐ memory | ◐ | ● memory-core/wiki | ● graphe | ◐ |
| 4. Connecteurs « featured » SaaS | ○ | ◐ 7 chargeurs + Gmail/Outlook/Agenda | ● 61 connecteurs | ● 16 connecteurs | ○ | ◐ messageries | ● 38 sources | ○ (canaux seulement) |
| 5. MCP (connecteurs personnalisés) | ● | ● | ● serveur + client | ● serveur + CLI | ◐ | ● | ● | ● |
| 6. Skills (SKILL.md, versionnés) | ● services/Skills | ◐ | ● backend/onyx/skills | ● | ○ | ● src/skills | ◐ | ● services/skills |
| 7. Tâches planifiées | ● Schedules | ● create-scheduled-job | ● docs/craft scheduled-tasks | ● triggers | ○ | ● src/cron | ◐ indexation planifiée | ● cron_jobs |
| 8. Workflows (durables) | ◐ agents/handoffs | ● agentFlows | ◐ | ● Temporal | ○ | ◐ workboard | ◐ | ◐ Team mode |
| 9. Canvas / artefacts | ● Artifacts | ○ | ● artefacts Craft | ◐ frames | ◐ | ● canvas | ◐ | ● aperçu + Office |
| 10. Code interpreter (sandbox) | ◐ service externe | ○ | ● code-interpreter + sandbox | ● dust-sandbox | ○ | ◐ | ● sandbox | ◐ exécution locale |
| 11. Recherche web / Open URL | ● | ◐ web-browsing | ● | ◐ crawl | ● Albert | ● (tavily) | ● SearXNG | ◐ via agents |
| 12. Voix | ● routes speech | ● STT/TTS | ● backend/onyx/voice | ○ | ○ | ● voice-call | ◐ | ◐ |
| 13. Approbations | ● Chat/approval | ◐ request-user-input | ● egress + approbations | ◐ validation outils | ○ | ● approvals | ◐ | ◐ |
| 14. Multi-utilisateur / SSO | ● SAML/OIDC/LDAP, rôles | ◐ rôles, SSO partiel | ◐ SSO/SCIM dans ee/ | ◐ WorkOS | ◐ OIDC | ○ (confiance mono-opérateur) | ◐ permissions, OIDC | ○ (compte unique) |
| **Score (● présents / 14)** | **10 / 14** | **6 / 14** | **12 / 14** | **8 / 14** | **3 / 14** | **10 / 14** | **8 / 14** | **4 / 14** |

Lecture : Onyx couvre le plus de briques, mais 2 de ses briques de gouvernance sont en `ee/`. LibreChat couvre la plupart des briques d'assistant dans le libre, ce qui en fait la meilleure base pour l'application utilisateur. OpenClaw couvre autant que LibreChat mais échoue sur le multi-utilisateurs.

---

## 5. Analyse dédiée d'AionUi

**Ce qu'il apporte** (faits) :
- **Un cowork desktop complet et multi-agents** : interface Electron (macOS, Windows, Linux), agent intégré `aionrs`, et agents externes via ACP (README : « Dozens of external agents »). Le code référence `aionrs`, `gemini`, `codex`, `claude`, `qwen`, `nanobot`.
- **Mode équipe** : tables `teams`, `mailbox`, `team_tasks` (orchestration « leader »).
- **Tâches planifiées** (`cron_jobs`), **skills** (`services/skills/`), **MCP** (221 fichiers), **aperçu de fichiers** (10+ formats), génération PPT/Word/Excel.
- **Accès à distance** : mode WebUI (navigateur, mot de passe, LAN), canaux Telegram, Lark/Feishu, DingTalk, WeChat ; image Docker avec `ALLOW_REMOTE`.
- **Français complet** dans l'interface (parité de clés et traduction réelle).
- **Licence Apache-2.0** sans `ee/`, 275 tags de release, 662 fichiers de test.

**Ce qui manque pour un usage PME multi-utilisateurs** :
1. **Multi-utilisateurs** : la base SQLite contient un compte seedé (`system_default_user`) et un mot de passe admin unique (`ensureAdminPassword.ts`). Pas de rôles, pas d'équipes de comptes, pas de SSO, pas de SCIM, pas de journal d'audit identifié.
2. **Isolation** : les agents CLI tournent comme processus de la machine hôte (`agent-process-registry`) ; pas de sandbox. Inacceptable en partage entre collaborateurs sans cloisonnement externe (inférence sur les faits de code).
3. **Backend hors dépôt** : le serveur `aioncore` (Rust, Apache-2.0, dépôt iOfficeAI/AionCore, 120 ★) et le moteur `aionrs` (Rust, Apache-2.0, 127 ★) sont des dépôts séparés. Un fork de la base multi-utilisateurs impose de maintenir trois dépôts.
4. **Bibliothèque documentaire et connecteurs SaaS** : absents (canaux de messagerie seulement).
5. **Architecture mono-nœud** : SQLite, un processus par poste ; pas de haute disponibilité ni de mise à l'échelle.
6. **Chaîne d'approvisionnement** : le binaire `aioncore` est téléchargé au moment du packaging (`prepare-aioncore.js` : artefact GitHub Actions ou release). À auditer avant toute distribution (inférence).

**Base ou inspiration ?** → **Source d'inspiration et client desktop, pas base multi-utilisateurs.**
- Inspiration : UX du cowork (planification, équipe d'agents, aperçu), orchestration ACP, intégration de skills et de MCP, parcours d'installation.
- Client possible : un client Electron pour les collaborateurs qui veulent un agent local, branché sur l'API Nexora (à vérifier : prise en charge d'une base URL compatible OpenAI, non examinée dans le code).
- Non recommandé comme base du serveur : mono-utilisateur par conception, trois dépôts à maintenir, pas de cloisonnement des agents.

---

## 6. Combinaisons possibles avec la plateforme Nexora

Hypothèse : la plateforme Nexora expose une API compatible OpenAI (chat, agents, outils) et un serveur MCP pour ses connecteurs (cf. `mistral-studio/11` et `/02`, où Studio joue ce rôle).

**Compatibilité OpenAI constatée** : LibreChat (endpoints `custom:` avec base URL), AnythingLLM (fournisseurs `genericOpenAi` et `liteLLM`), Onyx (fournisseur `openai_compatible`), La Suite Conversations (`base_url` et type `openai`). Non identifié dans le code examiné : Dust (fournisseurs codés en dur, à vérifier), OpenClaw et AionUi (à vérifier).

**Scénario A — recommandé (inférence) : LibreChat + Nexora + MCP**
- LibreChat devient l'application utilisateur (chat multi-modèles, projets, mémoires, artefacts, tâches planifiées). Le modèle par défaut pointe vers l'API Nexora (endpoint `custom`).
- Les connecteurs Nexora sont consommés en MCP (LibreChat est client MCP).
- Les agents et skills publiés depuis Studio apparaissent comme agents LibreChat (mapping à définir).
- Risque : pas de connecteurs SaaS natifs ; il faut les écrire ou les obtenir d'Onyx via MCP.

**Scénario B — « moteur de connecteurs » (inférence) : Onyx en service séparé**
- Onyx tourne en service à part (connecteurs, recherche permissionnée, Craft) et expose son serveur MCP ; LibreChat ou Nexora l'appellent comme outil.
- Pas de fork : on évite la frontière `ee/` et le rebranding lourd.
- Coût : infrastructure lourde (OpenSearch, serveurs de modèles, Postgres, Redis, MinIO). Les fonctions d'entreprise restent à acheter ou à écrire.

**Scénario C — léger (inférence) : AnythingLLM pour un déploiement mono-site**
- Une seule application, MIT, français complet, RAG et agents. Gouvernance faible : acceptable pour une PME < 20 utilisateurs, pas pour un SaaS multi-tenant.

**Scénario D — client local (inférence) : AionUi comme client desktop**
- Client Electron pour les collaborateurs qui utilisent des agents CLI sur leur poste, relié à Nexora. À évaluer après vérification de la base URL.

**Articulation avec Studio (inférence)** : Vibe est, dans Mistral, le canal de distribution de ce que les développeurs construisent dans Studio (`00-synthèse §2`). Dans Nexora, l'équivalent passe par deux points : (1) les agents et workflows Studio exposés en API OpenAI-compatible ; (2) les connecteurs Studio exposés en MCP. La base assistant consomme les deux ; elle ne remplace pas Studio.

---

## 7. Les 3 meilleurs : effort, suivi de l'amont, risques

### 7.1 Effort de rebranding (estimation relative, inférence)

| | LibreChat (rang 1) | Onyx (rang 2) | AnythingLLM (rang 3) |
|---|---|---|---|
| Occurrences de marque hors docs/tests/i18n | 2 354 fichiers · 6 629 occurrences | 2 559 fichiers · 24 743 occurrences (paquet Python `onyx`, variables `ONYX_*`) | 213 fichiers · 770 occurrences |
| Logos et visuels | 1 logo principal | 5 logos/icônes, applications desktop et mobile à rebrander | 4 fichiers logo |
| Frontière de licence à respecter | aucune (MIT) | `ee/` : ne pas toucher ni copier | aucune (MIT) |
| i18n à compléter | ~2 200 clés en français | 0 (déjà complet) | 0 (déjà complet) |
| Estimation | **Faible à moyen** | **Élevé** (renommer le paquet Python = migration coûteuse) ; un rebranding de surface (UI, docs, noms d'images) reste possible | **Faible** |

### 7.2 Stratégie de suivi de l'amont (soft fork)

- **LibreChat** : garder le dépôt amont intact dans une branche `upstream` ; mettre le code Nexora dans des paquets séparés (un paquet `nexora-*` dans le monorepo ou un dépôt compagnon) ; fusionner les tags de release (113 tags) à cadence mensuelle en privilégiant les correctifs de sécurité ; figer les dépendances par lock.
- **Onyx** : ne jamais forker `ee/`. Les fonctions d'entreprise de Nexora (SSO, audit) s'ajoutent via le mécanisme de « versioned implementation » plutôt que par modification de `ee/`. Ne pas renommer le paquet Python (rebranding de surface seulement) pour rester fusionnable.
- **AnythingLLM** : fork dur de préférence, avec télémétrie désactivée par défaut ; suivi de l'amont sur les tags (38) ; peu de couches à maintenir.

### 7.3 Risques

| Risque | LibreChat | Onyx | AnythingLLM |
|---|---|---|---|
| Licence | Faible (MIT) | **Élevé** : `ee/` requis en production pour les fonctions d'entreprise | Faible (MIT) |
| Vitesse d'évolution et régressions | Moyen : 979 issues ouvertes, releases très fréquentes | Moyen : 601 issues, 2 525 tags | Moyen : 342 issues |
| Sécurité (agents avec outils, injection) | Moyen : 10 avis récents (dernier juin 2026) | Moyen : 5 avis (dernier juillet 2026) ; egress contrôlé | Moyen : 11 avis (dernier septembre 2026) |
| Coût d'exploitation | Moyen | **Élevé** (serveurs de modèles, OpenSearch) | Faible |
| Français | Moyen (41 %) | Faible | Faible |
| Souveraineté (fournisseurs par défaut) | À configurer (endpoints) | À configurer (fournisseurs) | À configurer (télémétrie, fournisseurs) |
| Abandon ou changement de licence | Faible (MIT, communauté large) | Moyen (modèle open-core) | Faible (MIT) |

---

## 8. Risques transverses

1. **Dépendance à une licence commerciale cachée** : Onyx (`ee/`), Dify (multi-tenant), FastGPT (SaaS similaire) et OpenWork (anciennes versions FSL) imposent un contrôle juridique avant toute reprise de code.
2. **Assistant ≠ Studio** : aucun des candidats ne couvre la console développeur (versions de prompts, évaluations, déploiement d'agents) de Mistral Studio. Ces briques relèvent de `01-briques-moteur-ia.md`, pas de cette base.
3. **Modèle de confiance** : les agents qui exécutent du code ou des outils (AionUi, OpenClaw, LibreChat avec MCP) demandent un cloisonnement (sandbox, egress, approbations) à concevoir à part.
4. **Obsolescence rapide** : les finalistes changent de structure vite (OpenClaw a été renommé plusieurs fois ; AionUi a changé de dépôt, ancien nom office-sec/aionui ; Onyx vient de Danswer). Figer les versions et documenter les renommages.
5. **Maintenance de la marque** : la marque est présente dans tous les finalistes ; le coût de divergence dépend du nombre de fichiers de marque modifiés. Renommer le paquet Python d'Onyx est le plus coûteux.
6. **Données de test** : les comptages de tests sont par nom de fichier ; ils ne prouvent pas la couverture.

---

## 9. Annexe — méthode et sources

**Clones (lecture seule, `--depth 1`, rien installé ni exécuté)** — dans `/tmp/claude-1000/-home-pc6--claude-spares-spare-uLDMGF/e8c957db-5c05-499a-8980-d742c3991fc0/scratchpad/oss-bases/` :

| Dépôt | Commit | Dépôt | Commit |
|---|---|---|---|
| LibreChat-AI/LibreChat | e081b56 | suitenumerique/conversations | 315d038 |
| Mintplex-Labs/anything-llm | 20d7d07 | openclaw/openclaw | 24ce7227 |
| onyx-dot-app/onyx | 03d0a7f | pipeshub-ai/pipeshub-ai | 6e269c7 |
| dust-tt/dust | d813aa3d | iOfficeAI/AionUi | 886dcbd |

Non clonés (métadonnées et LICENSE seulement) : AionCore, aionrs, Open WebUI, LobeHub, Dify, FastGPT, Suna, Cherry Studio, Khoj, Jan, OpenWork, Agenta, Goose, Eigent, PipesHub-annexes, et les autres candidats du tri.

**Métadonnées** : `https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/<owner>%2F<repo>` (licence, dernier push, ★, forks, issues, tags, commit_stats, dates de création, anciens noms). Synchronisation ecosyste.ms du 20/10/2026 environ.

**Licences** : `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/LICENSE` (fichiers bruts ; variantes `LICENSE.md`/`LICENSE.txt` testées en cas de 404). Textes clés lus : Open WebUI, LobeHub, Onyx (+ `backend/ee/LICENSE`), Dify, FastGPT, Suna, Jan, AionUi (comparé au texte Apache-2.0 standard : identique), OpenWork, Agenta.

**Avis de sécurité** : pages HTML `https://github.com/<owner>/<repo>/security/advisories?state=published`, première page seulement (environ 10 avis par page) ; les chiffres sont donc des minimums.

**Comptages statiques** (script Python de la session, sans exécution du code) : lignes par langage hors dossiers de dépendances, fichiers de test par nom, workflows CI, clés de traduction (JSON, Lingui `.po`, TS), occurrences de marque hors docs/tests/i18n, présence de mots-clés (SSO, SCIM, RBAC, audit, MCP, cron, connecteurs, canvas, sandbox, voix, approbations, skills, projets, workflows, RAG).

**Autres sources** :
- Recherche web (firecrawl) : comparatifs « open source alternative to ChatGPT Enterprise », « Claude Cowork », « Glean », « Le Chat » (2026) : OpenWork, Agenta, PipesHub, Omni, Onyx, Kuse ont été relevés comme candidats ; les comparatifs ne remplacent pas la lecture des dépôts.
- Documents internes : `docs/recherche/mistral-studio/00-synthese.md` (§2, §3), `22-vibe-work-le-chat.md` (« En bref » et §3.1 à §3.11), `docs/recherche/open-source/01-briques-moteur-ia.md`.

**Limites** :
- Pas d'exécution : les notes C6 (facilité), les parcours et la qualité réelle des fonctions ne sont pas testés.
- Comptages par mots-clés : indices de présence, pas de preuve de fonctionnement.
- Les chiffres d'activité sont ceux d'ecosyste.ms à la date d'interrogation ; les contributeurs de Dust, OpenClaw, PipesHub et AionUi ne sont pas mesurés.
- Le dossier `enterprise/` d'OpenHands et les dépôts AionCore/aionrs n'ont pas été examinés en code.
