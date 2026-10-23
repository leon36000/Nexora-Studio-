# Écart entre Mistral Studio et Nexora WorkStudio v2

> **État au 23/10/2026.** Le document compare Mistral Studio tel que le décrit `mistral-studio/` (faits au 21/10/2026) et Nexora WorkStudio v2 tel qu'il est dans le dépôt après la clôture de J1 à J11, au commit `8c8dff8f` : fumée complète 27/27 sur pc6.
>
> **Sources Nexora** :
> - la conception `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` et le ledger `docs/superpowers/plans/2026-10-23-nexora-v2-ledger.md` ;
> - les guides `docs/guide/` ;
> - le code `workstudio/apps/sim/` (`lib/nexora/`, `app/api/nexora/`, `blocks/`, `providers/`), `services/nexora-api/` et `deploy/`.
>
> Le code `ee/` d'origine de Sim n'a pas été lu.
>
> **Notation** :
> - **Présent** : la capacité existe et a été vérifiée en v2, ou elle existe dans le cœur de Sim et fonctionne sans clé tierce.
> - **Partiel** : une partie seulement existe, ou elle demande une clé ou un service absent de l'installation.
> - **Absent** : la capacité n'existe pas.
> - Effort : S (≤ 2 j), M (≤ 1 sem.), L (≤ 3 sem.), XL (au-delà). Valeur pour une PME : haute, moyenne ou faible.
> - Les numéros entre crochets, par exemple [11 §3.9], renvoient aux chapitres de `docs/recherche/mistral-studio/`.

## Sommaire

1. [Matrice des capacités](#1-matrice-des-capacités)
2. [Où Nexora fait déjà mieux, et ce que les utilisateurs reprochent à Mistral](#2-où-nexora-fait-déjà-mieux-et-ce-que-les-utilisateurs-reprochent-à-mistral)
3. [Périmètre proposé pour la v3 (K1 à K14)](#3-périmètre-proposé-pour-la-v3)
4. [Risques et questions pour le fondateur](#4-risques-et-questions-pour-le-fondateur)

---

## 1. Matrice des capacités

### 1.1 Playground

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Paramètres | `temperature`, `max_tokens`, `top_p`, avec les défauts 0.7, 2048 et 1. `stop`, les pénalités et `seed` n'existent que dans l'API [30 §4.4, 10 §3.3] | **Partiel** : température et longueur maximale seulement (`playground.md`) | `top_p`, `stop`, `seed` | S | faible |
| Comparaison de modèles | **Séquentielle** : on change de modèle puis on renvoie le message [11 §3.2.2] | **Présent, en mieux** : 1 à 3 colonnes côte à côte, en flux, avec temps et jetons (`playground.md`, J4) | — | — | haute |
| Sortie structurée (JSON, JSON Schema) | Texte, JSON ou JSON Schema ; constructeur visuel du schéma [30 §4.12, 33 §2.9] | **Partiel** : « format de réponse » JSON dans le bloc Agent (`blocs.md`) ; rien dans le Playground ni dans le formulaire d'agent | Format de réponse dans le Playground et le formulaire, avec un constructeur visuel | S | moyenne |
| Modèles à raisonnement (`reasoning_effort`, blocs « Thoughts ») | 6 niveaux dans l'API, 2 dans l'interface ; réflexion affichée [10 §3.8, 33 §2.9] | **Absent**, et cela casse aujourd'hui avec GLM 5.3 :<br>• le Playground ne lit que `delta.content` (`lib/nexora/wand.ts` l.224), donc la réflexion est invisible et le flux reste longtemps vide ;<br>• « Tester » envoie `max_tokens: 60` et ne lit que `message.content` (`lib/nexora/model-admin.ts` l.494–498), donc la réponse est **vide** quand le modèle consomme ces 60 jetons à réfléchir.<br>Le moteur conserve bien la réflexion dans les traces (`providers/trace-enrichment.ts`, `providers/vllm` `reasoningFields`). | Affichage de la réflexion, réglage de l'effort, test robuste, balises `<think>` en ligne | S-M | **haute** (c'est le modèle par défaut de pc6) |
| Prix dans le sélecteur | Prix en €/M de jetons au survol [30 §4.8] | **Absent** (sans objet pour un modèle local) ; le CO2 par modèle est dans Consommation | Coût estimé des modèles distants | S | faible |
| Export de code (Python, TS, cURL) | Bouton « <> Code » [30 §4.6] | **Absent** : seulement du curl à la main dans `nexora-api.md` | Bouton « Code » dans le Playground et les agents | S | moyenne |
| Fonctions personnalisées exécutées | **Non** : résultat « TODO » à remplir à la main [30 §4.15] | **Présent** : outils personnalisés (Réglages › Outils personnalisés) et workflows utilisés comme outils, réellement exécutés | — | — | moyenne |

### 1.2 Registre de prompts

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Prompts versionnés : `{{variables}}`, notes de version, alias `production`/`staging`, partage private/workspace | Bêta depuis le 09/07/2026 [10 §3.6, 11 §3.2.3] | **Absent** : les consignes vivent dans le bloc Agent et seules les versions de workflow existent (`workflows.md`) | Objet Prompt, versions, étiquettes, diff, utilisation dans les agents, API | M | moyenne |

### 1.3 Agents

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Agent sans code (consignes, modèle, outils) | Playground, puis « Créer un agent » [30] | **Présent** : formulaire ↔ workflow (`agents.md`, `lib/nexora/agents.ts`) | — | — | haute |
| Versions, diff, retour arrière, alias | `vN`, diff Instructions/Configuration, rétablir ; alias seulement dans la spec [30 §4.14, 11 §3.7.4] | **Présent** : versions = déploiements, « Comparer », « Activer » (`agents.md`). Pas d'alias de version | Alias de version (`production`) | S | faible |
| `completion_args` (température, format, effort) | Dans l'éditeur d'agent [11 §3.7.3] | **Partiel** : dans l'éditeur de workflow seulement ; le formulaire les conserve sans les montrer (`agents.md`) | Section « Réglages avancés » dans le formulaire | S | faible |
| Recherche web (+ actualités, citations) | `web_search` / premium, citations `tool_reference` [11 §3.9] | **Partiel** : bloc « Recherche web » SearXNG, **désactivé par défaut** (spec §8bis.6) ; pas de citations structurées ; absente de l'Assistant général | Interrupteur dans le formulaire et l'Assistant, sources citées | S | moyenne |
| Interpréteur de code | `code_interpreter` en conteneur isolé [11 §3.9] | **Absent** : le bloc Fonction ne fait que du JavaScript ; Python et Shell exigent E2B ou Daytona (`blocs.md`, ledger J1 T5) | Bac à sable local Python (pandas, graphiques) | L | **haute** |
| Génération d'images | `image_generation` (Black Forest Labs dans Vibe) [11 §3.9, 22] | **Partiel** : bloc `image_generator_v2` (OpenAI, Gemini) avec une clé tierce ; aucun fournisseur Nexora, aucun modèle local | Fournisseur « compatible OpenAI images », facultatif | M (L en local, GPU) | faible |
| Bibliothèque de documents + citations | `document_library`, chunks `tool_reference` [15] | **Partiel** : connaissances dans le formulaire (`agents.md`) ; pas de notes « Sources [1] » dans l'Assistant | Citations numérotées et cliquables | S-M | **haute** |
| Handoffs (délégation entre agents) | `handoffs`, exécution serveur ou client [11 §3.8] | **Partiel** : un workflow peut servir d'outil (`agents.md`), bloc A2A (`blocks/blocks/a2a.ts`) ; pas de passage de main dans une conversation | « Peut confier à » dans le formulaire, visible dans la trace | M | moyenne |
| MCP et connecteurs dans l'agent | `type: connector` [11 §3.10.7] | **Présent** : outils MCP et Nexora Connect (`outils-mcp.md`) | — | — | haute |
| Skills (instructions et fichiers réutilisables, labels, `@`) | Bêta ; labels `staging`/`production`/`main` [11 §3.2.4, 33 §2.10] | **Partiel** : compétences du cœur Sim (page `/skills`, champ `skills` du bloc Agent, `blocks/blocks/agent.ts` l.280) ; absentes du formulaire d'agent et de l'Assistant ; sans versions ni labels | Compétences dans le formulaire et invocables par `@` | M | moyenne |
| Publication aux salariés | « Disponible dans Vibe » [30 §4.16] | **Présent** : l'Assistant (`assistant.md`), chat « réservé aux membres » par défaut | — | — | haute |

### 1.4 Connecteurs

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Catalogue et OAuth | 12 connecteurs « featured », plus des serveurs MCP [22] ; MCP géré [11 §3.10] | **Présent, en mieux** : plus de 1 600 services Nexora Connect, catalogue en français, OAuth par les applications de l'opérateur (`connecteurs.md`, J5) | — | — | haute |
| Portées private / workspace / org | 3 visibilités [11 §3.10.2] | **Partiel** : connexions d'espace seulement ; les connexions **personnelles** ont été reportées (spec §8septies, « Hors J6 ») | Connexion personnelle (la boîte Gmail de chacun) | M-L | **haute** |
| Filtrage `include` / `exclude` des outils | `tool_configuration` [11 §3.10.7] | **Partiel** : choix des outils dans le sélecteur du formulaire (ledger J4) | — | S | faible |
| Confirmation humaine par outil (`requires_confirmation`) | allow/deny, à l'unité ou en lot [11 §3.10.9] | **Absent** : il n'existe que le bloc Validation humaine dans un workflow | « Demander avant d'agir » sur les actions d'écriture | M | **haute** |
| Débogueur OAuth | 12 étapes [11 §3.10.10] | **Absent** | — | S | faible |
| Appel direct d'un outil, sans modèle | `POST /v1/connectors/{id}/tools/{tool}/call` [11 §3.10.8] | **Présent** : bloc MCP dans un workflow (fumée J5) | — | — | faible |
| Serveur MCP de la plateforme | `api.mistral.ai/mcp` : workspace, workflows, libraries… [11 §3.11] | **Partiel** : workflows exposés en MCP (`outils-mcp.md`) | Agents et bases de connaissances exposés en MCP | M | faible |

### 1.5 API Conversations

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Conversations à état, entries, reprise depuis une entry, `store=false`, flux SSE typé | Bêta [11 §3.7.5–3.7.10] | **Partiel** : conversations de l'Assistant en base (`nexora_assistant_*`, J6), mais accessibles seulement par des opérations internes de session ; `conversationId` dans les chats déployés | API publique des conversations | M | faible |

### 1.6 Workflows

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Construction | **Code Python seulement**, aucune interface pour créer un workflow [12, 37 §3.6] ; « Start Workflow » = éditeur JSON [34 §4.4] | **Présent, en mieux** : éditeur visuel, Copilote « décrivez votre automatisation » (5/5 sur pc6, `copilote.md`), modèles PME. Reste trop dense pour un débutant (canevas, ~370 blocs) | Mode « Étapes » guidé | L | **haute** |
| Exécution durable (reprise au pas près, reset depuis un événement) | Temporal, 51 200 événements, reset [12 §3.5, §3.11] | **Partiel** : pauses persistées, outbox avec reprise, « Relancer » une exécution échouée (`journaux.md`) ; pas de reprise d'une exécution coupée en plein milieu | — | XL | faible |
| Signaux et intervention humaine | `wait_for_input`, formulaires à 7 types de champs [13 §3.1–3.5] | **Présent** : Validation humaine par lien, Attente (`blocs.md`) ; pas de formulaire dans l'Assistant | Formulaires dans l'Assistant | M | moyenne |
| Planification | Calendriers, intervalles, cron, overlap, catchup, jitter [12 §3.27] | **Présent** : déclencheur Planification et service `cron` (J1 T2) ; politiques overlap, catchup et jitter non réglables | — | S | faible |
| Sous-workflows, boucles, parallèle | `execute_workflow`, activités en parallèle [12 §3.24, 13 §3.14] | **Présent** (blocs Workflow, Boucle, Parallèle) | — | — | moyenne |
| Workflows conversationnels publiés aux salariés | `ChatAssistantWorkflowOutput`, formulaire prérempli dans Vibe [13 §3.1–3.7, 34 §4.12] | **Absent** : l'Assistant ne liste que des agents (`assistant.md`) | Publier un workflow dans l'Assistant avec un formulaire généré | M | **haute** |
| Console d'exécution | Gantt, inspecteur, taux d'erreur, latence moyenne, Run again, Cancel [34 §4.2–4.9] | **Partiel** : journaux avec arbre bloc par bloc, durée, coût, Relancer (`journaux.md`), tableau de bord `/dashboards` du cœur | Taux d'erreur et latence par workflow mis en avant | S | moyenne |
| Déploiements, versions | deployments, hardened, managed [13 §3.11–3.13] | **Présent** : versions déployées (`workflows.md`) ; managed deployments sans objet (tout est local) | — | — | — |

### 1.7 Observabilité

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Traces OTel de tous les appels de modèle | SDK, Workflows, Vibe ; 30 j ; **Enterprise, Private Preview** [14 §3.1–3.2] | **Partiel** : spans des exécutions de workflow (`journaux.md`). Le Playground, le Copilote et les appels directs à Nexora API ne laissent que des compteurs d'usage (`/v1/me/usage`). Aucun export OTLP | Écran « Traces » unifié, export OTLP | L | moyenne |
| Explorer avec langage de requête | `LIKE`, `REGEXP`, `span_attributes[…]` [14 §3.4] | **Absent** (filtres simples des journaux) | Filtres composables | M | faible |
| Masquage côté client | Activé par défaut : jetons, e-mails, cartes, IPv4 [14 §3.3] | **Partiel** : journaux des chats réservés aux membres visibles seulement du membre et des admins (corrections J6/J7) ; données personnelles non masquées | Masquage avant stockage | M | moyenne |
| Rétention configurable | 30 j [14] | **Absent** : l'écran `data-retention` de Sim est dans `ee/` (`open-source/06`) | Réglage de rétention et purge | S-M | moyenne |

### 1.8 Évaluations

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Datasets (JSONL, import depuis les traces, colonne « Grading guidance ») | 10 000 records par run [14 §3.6, 35 §4.3.2] | **Absent** | Jeux de tests issus d'une table, d'un CSV, des traces ou des conversations | M | moyenne |
| Juges (LLM-as-judge classification ou régression, « Try it ») | [14 §5.5, 35 §4.3.4] | **Partiel** : le bloc Évaluateur note selon des critères (`blocs.md`) | Juges enregistrés et réutilisables | M | moyenne |
| Runs, statistiques (percentiles, F1), objectifs, comparaison, `num_generations` | [14 §3.8–3.14] | **Absent** | Campagnes et comparaison | M | moyenne |
| Optimisation de prompts (SimpleOptimizer, GEPA) | ≥ 0.6.0, Enterprise [14 §3.15] | **Absent** | — | L | faible |
| Pipelines en ligne (juge échantillonné sur la production) | Spec seulement [14 §5.5] | **Absent** | — | M | faible |

### 1.9 Libraries et RAG

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Upload, indexation, formats | Bêta ; résumé auto refacturé ; **10 documents par jour** selon des utilisateurs [15, 37 §3.8] | **Présent, en mieux** :<br>• bases locales sans plafond, embeddings `bge-m3` sur le serveur ;<br>• sources synchronisées (Drive, Notion, site web) ;<br>• OCR des scans et transcription de l'audio dans les bases ;<br>• réindexation sans mélange de vecteurs.<br>(`connaissances.md`, `documents-et-voix.md`, J10) | — | — | haute |
| Partage entre espaces ou organisation | Viewer/Editor, User/Workspace/Org [15] | **Absent** : une base appartient à un espace | Partage en lecture entre espaces | S | faible |
| Citations | Notes numérotées et bouton `Sources` dans Vibe [15, 22] | **Partiel** : passages renvoyés à l'agent, mais pas affichés comme sources | Sources affichées | S | **haute** |
| Recherche agentique (search → open → grep → re-query) | 27 % → 86 % sur FinanceBench [15] | **Absent** (recherche vectorielle simple) | Boucle agentique sur pgvector | M | moyenne |
| Reranking | RRF, cross-encoder, LLM [15] | **Absent par défaut** (désactivé proprement, spec §8bis) alors que Nexora API a `/v1/rerank` (`api/infrastructure/fastapi/routes.py`) | Reranker local (`bge-reranker-v2-m3`) | S | moyenne |

### 1.10 Document AI

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| OCR (Markdown par page, tableaux, blocs typés, scores de confiance) | `POST /v1/ocr`, 50 Mo, 1 000 pages, ~30 formats [16] | **Partiel** : bloc Analyse de document Nexora (`qwen2.5vl`, ~45–60 s par page sur CPU) ou Mistral OCR (`documents-et-voix.md`, J10) ; pas de tableaux HTML, de bbox, de blocs typés ni de scores | Docling pour les PDF numériques (mise en page, tableaux) | M | **haute** |
| Annotations (extraction JSON selon un schéma) | `document_annotation_format`, `bbox_annotation_format` [16] | **Absent** comme fonction : il faut monter « OCR → Agent à sortie structurée » soi-même | « Extraire des données » : schéma visuel, modèles facture et devis, sortie vers une table | M | **haute** |
| Document QnA | Chat + `document_url` [16] | **Présent** : pièces jointes de l'Assistant lues en texte (`lib/nexora/attachment-text.server.ts`, J6) | — | — | haute |

### 1.11 Audio

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Transcription de fichiers | Voxtral 3, 50 langues [18] | **Présent** : `whisper-small` local (speaches) ou Voxtral via Mistral (`modeles.md`) | — | — | haute |
| Diarisation, horodatage par segment | `diarize`, `speaker_N` [18] | **Absent** | Comptes rendus « qui a dit quoi » | M | **haute** |
| Biais de contexte (vocabulaire) | `context_bias` [18] | **Absent** | Lexique de l'entreprise | S | moyenne |
| Temps réel (WebSocket) | 80–2 400 ms [18] | **Absent** | — | L | faible |
| Synthèse vocale (TTS) | 36 voix, 21 langues, émotions, IPA [19] | **Absent** :<br>• le bloc `tts` ne propose que 7 fournisseurs cloud (`blocks/blocks/tts.ts`) ;<br>• Nexora API n'a pas de `/v1/audio/speech` (`routes.py`).<br>L'image speaches déjà déployée sait pourtant synthétiser : sa voix Piper a servi à la vérification J10. | Fournisseur Nexora pour le TTS, lecture à voix haute | S-M | moyenne |
| Clonage de voix, agents vocaux (LiveKit, SIP) | [19] | **Absent** | Voir hors périmètre (§3.3) | XL | faible |

### 1.12 Batch, fine-tuning, modèles, embeddings

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Batch (JSONL ou inline, −50 %, 10 endpoints, écran Batches) | [17] | **Absent** : ni `/v1/files` ni `/v1/batches` dans Nexora API (`routes.py`) ; on peut boucler sur une table à la main | API batch au format OpenAI + écran « Traitements par lot » | M | moyenne |
| Fine-tuning, Classifier Factory | **Dépréciés** [20] | **Absent** | Hors périmètre | XL | faible |
| Catalogue et cycle de vie des modèles | Labs → GA → Retired, préavis de 6 mois, alias, fiches de capacités [17, 20] | **Présent** : Réglages › Modèles, alias `nexora-default`, catalogue Ollama, usages Discussion, Vision et Transcription (`modeles.md`). **Partiel** sur les fiches : pas de contexte, d'outils, de vision ni de raisonnement affichés, pas de localisation des données (local, UE, hors UE) | Badges de capacités et de localisation | S | moyenne |
| Embeddings | `mistral-embed` 1024, `codestral-embed` [10 §3.15] | **Partiel** : `bge-m3` local pour les bases (Ollama direct, ledger V3) ; `/v1/embeddings` existe dans Nexora API mais sans routeur d'embeddings documenté pour les développeurs | Routeur d'embeddings exposé | S | faible |

### 1.13 Administration

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Organisations et espaces | Enterprise Account › Org › Workspace, 500 espaces [03 §3.1] | **Présent** : organisation d'instance + espaces | Pas de compte « Enterprise » multi-organisations (sans objet pour une PME) | — | faible |
| RBAC | Rôles prédéfinis additifs, **pas de rôles personnalisés** [03 §3.7] | **Présent, en mieux** : rôles d'espace + groupes d'accès à 40 capacités appliquées côté serveur, dont « Modifier les workflows » (`reglages.md`, J9) | — | — | haute |
| SSO | **SAML seulement**, Enterprise [03 §3.16] | **Présent** : OIDC réglable dans l'interface, connexion obligatoire, domaines autorisés (`sso.md`, J9). SAML absent | SAML (rare en PME) | M | faible |
| SCIM | Private preview [03 §3.17] | **Absent** : routes en 404 (`open-source/06`) | — | M | faible |
| Comptes de service, fédération d'identité | [03 §3.10–3.11] | **Absent** | Clés non liées à une personne | S | faible |
| Clés API (portée, expiration, valeur affichée une fois) | [03 §3.12] | **Partiel** :<br>• clés de workflows dans Réglages › Clés API ;<br>• clés **Nexora API** créées seulement **par curl** avec le mot de passe admin (`nexora-api.md`) ;<br>• ni expiration, ni portée par modèle, ni plafond par clé dans l'interface | Clés d'API unifiées dans l'interface | M | **haute** |
| Journal d'audit | Enterprise, 196 événements, **pas d'export** [03 §3.18] | **Présent, en mieux** : ~249 actions traduites (J1 T8), API `app/api/v1/audit-logs` ; export CSV à l'écran à vérifier | Export CSV | S | moyenne |
| ZDR, rétention | ZDR sur demande [03 §3.19] | **Sans objet** pour le ZDR (rien ne sort de l'instance avec un modèle local) ; **absent** pour la rétention configurable | Voir §1.7 | S-M | moyenne |
| Quotas, usage, facturation | Limites opaques, 429, crédits prépayés, plafonds par espace [03 §3.20–3.23, 37] | **Présent, en mieux** : consommation sur 7, 30 ou 90 jours par modèle, espace et personne, CO2, budgets mensuels avec refus 402 en français (`consommation.md`, J8). Pas de limites de débit par clé, pas de facturation | Débit par clé (avec K3) | S | moyenne |
| Admin API | Enterprise, en Preview [03 §5] | **Partiel** : `app/api/v1/admin` du cœur, API d'admin de Nexora API | — | — | faible |
| Gestionnaire de secrets | Public Preview [10 §3.19] | **Présent** (Réglages › Secrets) | — | — | moyenne |

### 1.14 API et SDK pour les développeurs

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Surface REST | 319 opérations, 54 tags [40] | **Partiel** : Nexora API (58 opérations : inférence, clés, usage, admin) et API v1/v2 du cœur (workflows, tables, bases, journaux) ; pas de documentation unifiée en français | Portail « Développeurs » | M | moyenne |
| Compatibilité OpenAI | Format OpenAI supporté, jugé incomplet [20, 37 §3.4] | **Présent** pour l'inférence (`nexora-api.md`), exposée en HTTPS sur `api.<domaine>` (`deploy/caddy/Caddyfile`). **Absent** pour les agents et workflows | Agents appelables comme des « modèles » OpenAI | M | **haute** |
| SDK Python et TS | Générés par Speakeasy, 288 méthodes [32] | **Partiel** : SDK du cœur (`packages/python-sdk`, `packages/ts-sdk`) qui exécutent des workflows, toujours au nom de « Sim » et non publiés | SDK Nexora | S-M | moyenne |
| CLI | `mistral`, `vibe` [32] | **Présent** : `nexora` (exploitation : sauvegarde, mise à jour, état) | — | — | moyenne |

### 1.15 Vibe Work et Le Chat

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Chat interne avec agents | Vibe [22] | **Présent** : Assistant, Assistant général, pièces jointes, Markdown, historique (`assistant.md`) | — | — | haute |
| Projets (consignes et fichiers partagés) | [22] | **Absent** | — | M | moyenne |
| Mémoire durable | Knowledge Base `remember` [22] | **Absent** (mémoire de conversation seulement) | — | M | moyenne |
| Skills invoquées par `@` | [22] | **Absent** dans l'Assistant | — | S-M | moyenne |
| Tâches planifiées depuis le chat | Public Preview [22] | **Absent** (planification dans l'éditeur seulement) | « Chaque lundi… » depuis l'Assistant | M | **haute** |
| Connecteurs personnels | 12 en OAuth [22] | **Absent** (voir §1.4) | — | M-L | **haute** |
| Canvas (documents, export PPTX/Excel), Deep Research, mode vocal | [22] | **Absent** | — | L | moyenne |
| Recherche web dans le chat | [22] | **Absent** pour l'Assistant général | — | S | moyenne |

### 1.16 Modération, garde-fous, code

| Capacité | Mistral | Nexora v2 | Écart | Effort | Valeur |
|---|---|---|---|---|---|
| Modèle de modération (11 catégories) et guardrails déclaratifs | `mistral-moderation-2603` gratuit, 403 sur l'entrée [10 §3.17–3.18] | **Partiel** :<br>• bloc Garde-fous : JSON, regex, hallucination, données personnelles (`blocs.md`) ;<br>• la détection des données personnelles appelle un service Presidio (`PII_URL`, `lib/guardrails/validate-pii.ts` l.58) **absent du compose**, donc probablement inopérante sur une installation Nexora (à vérifier) ;<br>• aucun modèle de modération. | Service PII local, modération en option | M | moyenne |
| Agentic Safety (règles, hooks, verdicts Allow / Validation / Block) | Démo du 23/09/2026 [35 §4.5] | **Absent** | Politiques par espace, par exemple « pas de données personnelles vers un modèle hors instance » | L | moyenne |
| Vibe Code | CLI, VS Code, sandbox web [21] | **Absent** | **Hors périmètre** : c'est un autre produit (mistral-vibe en phase 3 selon `open-source/00`) | — | faible |

---

## 2. Où Nexora fait déjà mieux, et ce que les utilisateurs reprochent à Mistral

### 2.1 Avantages acquis (avec preuves)

1. **Installation chez le client en une commande.** HTTPS automatique, sauvegarde et restauration chiffrées, mise à jour avec retour arrière automatique, `nexora check` (`installation.md`, J11, vérifié sur une installation isolée). Chez Mistral, l'auto-hébergement est réservé à l'Enterprise [00 §11].
2. **Workflows visuels et Copilote en français.** La description en français est transformée en workflow exécutable : trois séries 5/5 sur pc6 avec `qwen2.5:7b` (ledger J7). Mistral n'a **aucune interface** pour créer un workflow et lance une exécution par un éditeur JSON [34 §4.4, 37 §3.6].
3. **Agent sans code complet.** Connaissances, outils Nexora Connect, autres workflows, mémoire et chat réservé aux membres (`agents.md`). L'éditeur de Mistral n'a ni Document Library, ni connecteurs, ni handoffs [30 §4.10], et environ 60 utilisateurs s'en plaignent [37 §3.5].
4. **Comparaison réelle dans le Playground** : jusqu'à 3 modèles côte à côte (`playground.md`), contre une comparaison séquentielle chez Mistral [11 §3.2.2]. Les outils personnalisés sont réellement exécutés, contre le « TODO » de Mistral [30 §4.15].
5. **Consommation et budgets visibles**, avec l'empreinte carbone : refus 402 expliqué en français, alerte à 80 %, export CSV (J8). C'est la réponse directe aux deux premiers irritants de Mistral, limites opaques et facturation [37 §3.11]. Mistral n'affiche aucun CO2.
6. **Gouvernance sans plan Enterprise** :
   - OIDC réglable dans l'interface (Mistral : SAML Enterprise seulement [03 §3.16]) ;
   - groupes d'accès à 40 capacités (Mistral : aucun rôle personnalisé [03 §3.7]) ;
   - journal d'audit traduit (Mistral : Enterprise, sans export).
7. **1 600 services connectables**, cloisonnés par espace, avec une règle `ws-*` jusque dans Nexora Connect (J5). Vibe en propose 12 en OAuth [22].
8. **Connaissances sans plafond et souveraines** : OCR des scans, audio transcrit, réindexation à bascule atomique, reprise après panne d'Ollama (J10, vérifié sur 22 pages et 5 999 passages). Côté Mistral : plafond de 10 documents par jour et fichiers ignorés [37 §3.8].
9. **Documentation française pour non-développeurs** (`docs/guide/`, 20 pages), que réclament les PME francophones [37 §6].
10. **Journaux pour tous** : arbre d'exécution bloc par bloc, coût et relance. Chez Mistral, l'observabilité est réservée à l'Enterprise [14 §1].

### 2.2 Plaintes contre Mistral et opportunités pour Nexora

| Plainte [37] | Volume | Réponse de Nexora | Déjà fait ? |
|---|---|---|---|
| Limites et 429 opaques, aucun bouton pour demander plus | ~80 | Budgets et consommation visibles ; **ajouter** les limites et l'usage par clé (K3) | En partie |
| Facturation incompréhensible, clés différentes selon le produit | ~90, ~25 | Une instance, un écran de consommation ; **ajouter** des clés uniques gérées dans l'interface (K3) | En partie |
| Documentation lacunaire | ~100 | Guides en français par écran ; **ajouter** un portail développeur en français (K3) | En partie |
| Agents minimalistes, pas de base de connaissances dans l'interface, handoffs en erreur 500 | ~60 | Formulaire complet (fait) ; délégation fiable et tracée (K11) | En partie |
| Pas d'interface pour les workflows | ~20 | Éditeur et Copilote (fait) ; mode « Étapes » pour débutants (K7) | En partie |
| Observe et Evaluate réservés à l'Enterprise | ~15 | Traces et évaluations **pour toutes les installations** (K8, K10) | Non |
| Libraries : fichiers ignorés, plafond quotidien | ~38 | Sans plafond (fait) ; **citations visibles** (K5) | En partie |
| Free tier suspendu sans annonce, dépréciations rapides | ~20, ~120 | Modèles locaux qui ne disparaissent pas ; badges de localisation et de capacités (K1) | En partie |
| Ruptures de SDK | ~35 | SDK minces, versionnés, compatibles avec le client `openai` officiel (K3) | Non |
| Pas de tutoriels en français pour non-développeurs | ≥ 7 | Guides (fait), éditeur simplifié et modèles PME (K7) | En partie |
| Points forts cités : souveraineté, OCR, petits modèles, GLM hébergé en UE | ≥ 40, ~25, ~10, ~12 | Les reprendre : extraction de documents (K4), choix local, UE ou hors UE affiché (K1, K14) | — |

---

## 3. Périmètre proposé pour la v3

### 3.1 Principes

- Mêmes règles que la v2 :
  - pas de code `ee/` ;
  - français partout, contrôlé par `check-i18n` ;
  - TDD et revue finale par jalon ;
  - chaque jalon ajoute ses contrôles à la fumée ;
  - **vérification sur pc6** avec le modèle par défaut **et** avec un modèle local CPU (`qwen2.5:7b`), car GLM 5.3 masque la lenteur du CPU.
- Rien ne sort de l'instance sans action explicite d'un administrateur. Un modèle hébergé hors de l'instance est affiché comme tel.
- Ordre de priorité : ce qui casse d'abord, puis ce qui est le moins cher et le plus visible, puis la valeur pour une PME, en respectant les dépendances (K3 avant K8 et K13 ; K8 avant K10 ; K9 avant K10).

### 3.2 Jalons

| Jalon | Contenu | Taille | Dépend de |
|---|---|---|---|
| **K1** | Modèles à raisonnement et fiches de modèles | M | — |
| **K2** | Français partout (dette de la v2) | S | — |
| **K3** | Clés d'API, API compatible OpenAI, bouton « Code », SDK | M-L | — |
| **K4** | Document AI : extraction structurée et tableaux | M | K1 |
| **K5** | Outils intégrés : interpréteur de code, citations, confirmation d'action, images | L | — |
| **K6** | Assistant étendu : workflows en formulaire, connexions personnelles, tâches planifiées, projets | L | K5 (confirmation) |
| **K7** | Éditeur pour débutants : mode « Étapes » | L | — |
| **K8** | Traces et observabilité | L | K3 |
| **K9** | Prompts versionnés | M | — |
| **K10** | Évaluations | L | K8, K9 |
| **K11** | Multi-agents (délégation) et compétences | M | K8 |
| **K12** | Voix : réunions (diarisation), synthèse vocale, dictée | M | — |
| **K13** | Traitements par lot | M | K3 |
| **K14** | Gouvernance avancée et garde-fous | M | K8 |

#### K1 — Modèles à raisonnement et fiches de modèles (M)

**Contenu**
- Lecture de la réflexion partout où Nexora lit une réponse :
  - les sources : `reasoning_content`, `reasoning` et les balises `<think>…</think>` en ligne (modèles Ollama de type qwen3 ou deepseek) ;
  - les endroits : Playground, « Tester », chat déployé, Assistant, Copilote, « Générer avec l'IA ».
- Affichage :
  - un volet « Réflexion » repliable, en flux ;
  - jamais dans la sortie `content` d'un bloc ni dans un JSON du Copilote.
- Test d'un modèle :
  - `max_tokens` adapté ;
  - réponse vide avec réflexion présente ⇒ « modèle à raisonnement : réponse tronquée » au lieu de vide ;
  - le test détecte et enregistre la capacité.
- Réglage « Effort de raisonnement » dans le Playground, le formulaire d'agent (réglages avancés) et le bloc Agent, transmis comme `reasoning_effort` quand le modèle l'accepte.
- Délais de flux adaptés : un premier jeton tardif n'est pas une panne.
- Fiche de chaque modèle dans Réglages › Modèles :
  - badges : raisonnement, outils, vision, contexte ;
  - **localisation des données** : « Sur ce serveur », « Hébergé UE », « Hors instance » (saisie pour un service compatible OpenAI, comme la passerelle LiteLLM).
- Guide `modeles.md` : brancher un modèle via LiteLLM, ce que change un modèle à raisonnement.

**Terminé quand**, sur pc6 avec `cloud-glm-5-3` par défaut :
- « Tester » renvoie un texte non vide et affiche le badge « Raisonnement » ;
- le Playground montre la réflexion en flux puis la réponse, en comparant GLM 5.3 et `qwen2.5:7b` ;
- un agent publié et l'Assistant répondent, réflexion repliée ;
- le Copilote passe ses 5 descriptions types ;
- un agent avec l'outil `list_connections` fonctionne ;
- la fumée complète est verte deux fois : avec GLM 5.3 par défaut, puis avec `qwen2.5:7b` par défaut ;
- tests unitaires de l'extraction : trois formes de réflexion, flux, réponse vide.

#### K2 — Français partout (S)

**Contenu**
- Défauts anglais d'emcn, à la source des ~43 « Cancel » consignés en v2 :
  - `cancelLabel = 'Cancel'` et `dismissLabel = 'Cancel'` dans `packages/emcn/src/components/chip-modal/chip-modal.tsx` (l.1331, l.1671) ;
  - `'Cancel'` et `'Dismiss'` dans `progress-item.tsx` ;
  - `'No matching options found'` dans `combobox.tsx` (l.709).
- Autres restes :
  - bouton « Close » ;
  - phrases du canevas (« Prompt … with … On error ») et noms d'instance « Start » (reportés en J1) ;
  - message de refus d'API « Editing workflows is not available… » (J9) ;
  - catégories en double (« E-commerce international » ×3) et aides de champs venant de Connect (J5) ;
  - paramètres des 30 blocs d'intégration les plus utilisés (exclus de `check-i18n` en J1).
- `check-i18n` vérifie les défauts des composants partagés.

**Terminé quand**
- `check-i18n` est à 0, avec la nouvelle règle rouge sur l'état actuel puis verte ;
- un parcours au navigateur sur pc6 des 15 écrans principaux (liste versionnée dans `docs/verification/`) ne montre aucun mot anglais, fenêtres de confirmation comprises.

#### K3 — Clés d'API, API compatible OpenAI, bouton « Code », SDK (M-L)

**Contenu**
- **Réglages › Clés API** unifiés :
  - créer et révoquer une clé Nexora API sans curl : nom, espace, expiration, modèles autorisés, plafond mensuel ;
  - valeur affichée une seule fois ;
  - usage et limites de débit **par clé** visibles ;
  - comptes de service : clé non liée à une personne.
- **Agents publiés appelables en format OpenAI** : `model: "agent:<nom>"` sur `/v1/chat/completions`, avec flux, exécuté par la version déployée et compté dans la consommation.
- Page **Développeurs** en français : adresse `https://api.<domaine>/v1`, exemples Python, TS, cURL et n8n, OpenAPI.
- Bouton **« Code »** dans le Playground et sur chaque agent.
- **SDK Nexora** : les SDK du cœur rebaptisés, avec en plus un exemple utilisant le client `openai` officiel.

**Terminé quand**, sur pc6 :
- une clé créée dans l'interface permet au client `openai` Python officiel d'appeler `nexora-default` puis un agent publié, en flux ;
- une clé expirée ou révoquée renvoie 401 avec un message en français ;
- un modèle non autorisé renvoie 403 ;
- la consommation de la clé apparaît dans Réglages › Consommation ;
- un nœud OpenAI de n8n (ou LibreChat) branché sur l'instance répond ;
- tests des routes et contrôle de fumée « API développeur ».

#### K4 — Document AI : extraction structurée et tableaux (M)

**Contenu**
- Bloc et carte « Capturer » **« Extraire des données »** :
  - schéma construit visuellement (champ, type, description) ou modèles prêts : facture, devis, bon de commande, note de frais ;
  - sortie JSON validée, avec un champ « à vérifier » si la validation échoue ;
  - écriture dans une table.
- **Docling** (MIT) pour les PDF numériques : ordre de lecture, tableaux en Markdown ou HTML. Le modèle de vision reste réservé aux scans.
- `/v1/ocr` de Nexora API accepte `document_annotation_format`, au format de Mistral.

**Terminé quand**, sur pc6, avec un jeu versionné de 10 factures (5 PDF numériques, 5 scans) :
- la table « Factures » est remplie (numéro, date, fournisseur, HT, TVA, TTC) ;
- au moins 90 % des champs sont exacts avec `qwen2.5vl:3b` et GLM 5.3 ;
- un tableau d'un PDF numérique est restitué en Markdown ;
- un appel API avec un schéma renvoie le JSON attendu ;
- contrôle de fumée « Extraction ».

#### K5 — Outils intégrés des agents (L)

**Contenu**
- **Interpréteur de code** :
  - service de bac à sable local : microsandbox ou conteneur gVisor, **sans réseau**, CPU, mémoire, disque et durée bornés, image Python épinglée avec pandas, openpyxl et matplotlib ;
  - outil « Interpréteur de code » dans le formulaire d'agent et dans l'Assistant, qui débloque aussi Python dans le bloc Fonction ;
  - fichiers produits (PNG, CSV, XLSX) rendus dans l'Assistant.
- **Citations** : les connaissances et la recherche web renvoient des sources numérotées, affichées « Sources [1] [2] » et cliquables.
- **Confirmation d'action** : l'option « Demander avant d'agir » sur les actions d'écriture Nexora Connect ou MCP affiche une carte « Autoriser / Refuser » dans l'Assistant et dans le chat. Une exécution de workflow passe alors par une pause existante.
- **Images** (facultatif, désactivé par défaut) : fournisseur Nexora « compatible OpenAI images » pour `image_generator_v2`.
- Recherche web : interrupteur dans le formulaire d'agent.

**Terminé quand**, sur pc6 :
- dans l'Assistant, « Voici nos ventes (fichier Excel) : fais un graphique par mois » produit un graphique et des totaux exacts (contrôlés par le test) ;
- une suite de tests d'évasion (réseau, lecture de `/etc`, bombe de processus, boucle infinie, 10 Go en mémoire) est entièrement bloquée ;
- une réponse tirée d'une base cite ses sources ;
- un agent qui doit envoyer un e-mail Postmark demande l'autorisation, et un refus garantit que rien n'est envoyé (contrôlé côté Connect) ;
- contrôles de fumée « Interpréteur » et « Confirmation ».

#### K6 — Assistant étendu (équivalent de Vibe Work) (L)

**Contenu**
- **Workflows publiés dans l'Assistant** : formulaire généré à partir des champs du Start, résultat dans le fil, validation humaine dans le fil.
- **Connexions personnelles** (`u-<userId>`, reportées de J5 et J6) : le Gmail ou l'Outlook de chacun, utilisés seulement dans ses propres conversations.
- **Tâches planifiées** depuis une conversation (« chaque lundi à 9 h… ») : le Copilote crée le workflow planifié de la personne, listé et désactivable dans l'Assistant.
- **Projets** : consignes et fichiers communs.
- Compétences invocables par `@`.
- Recherche web dans l'Assistant général si l'administrateur l'a activée.
- Lien « Ouvrir dans l'éditeur » réservé aux rédacteurs.

**Terminé quand**, sur pc6 :
- deux membres connectent chacun leur boîte Gmail (OAuth réel, ou Mailpit en IMAP pour la fumée), et chacun ne voit que **ses** messages ;
- le workflow « Devis client » se lance depuis l'Assistant par son formulaire ;
- la tâche « tous les matins à 8 h, résume mes e-mails » est créée en conversation et exécutée par le cron ;
- un projet partage ses fichiers entre deux conversations ;
- tests de cloisonnement (autre membre ⇒ 404) et contrôle de fumée « Assistant étendu ».

#### K7 — Éditeur pour débutants : mode « Étapes » (L)

**Contenu**
- **Vue « Étapes »** : liste verticale de cartes qui reprend le langage d'étapes du Copilote (déclencheur, agent, condition, API, attente, validation, réponse, plus « action Nexora Connect », « table », « e-mail »). Chaque étape se règle par formulaire, avec le catalogue métier en français (~25 étapes).
- **Aller-retour avec le canevas** (« Mode avancé ») :
  - quand la forme est reconnue, le passage se fait sans perte ;
  - sinon, lecture seule, comme pour les agents.
- **Test pas à pas** avec des données d'exemple et des erreurs expliquées en clair.
- Barre d'outils triée (essentiels d'abord, intégrations regroupées par Nexora Connect).
- 20 modèles PME.

**Terminé quand**
- sur pc6, trois personnes non techniques créent sans aide « relance des factures impayées » en moins de 15 minutes (chronométré, grille consignée dans `docs/verification/`) ;
- l'aller-retour Étapes ↔ canevas se fait sans perte sur les 5 workflows types du Copilote (tests) ;
- aucun texte anglais (contrôle K2) ;
- contrôle de fumée « Étapes ».

#### K8 — Traces et observabilité (L)

**Contenu**
- Chaque appel de modèle devient une **trace** avec des spans (modèle, outil, connaissances, délégation), entrées, sorties, jetons, durée et CO2.
  - Sources : Playground, agents, Assistant, Copilote, workflows, et appels directs par une clé K3 (journal de Nexora API).
- Écran **Traces** : filtres par espace, agent, modèle, clé, statut, durée et texte.
- **Masquage des données personnelles avant stockage**, activé par défaut : e-mail, IBAN, téléphone, numéro de carte. Les traces des chats réservés aux membres suivent la règle de visibilité de J6.
- **Rétention réglable** (30 jours par défaut) avec purge, et rétention des conversations.
- **Export OTLP** facultatif vers Langfuse, Phoenix ou Grafana.
- Stockage : PostgreSQL partitionné, sauf décision contraire (voir §4, Q2).

**Terminé quand**, sur pc6 :
- une question à l'Assistant qui utilise un outil et une base apparaît dans Traces en moins de 5 s, avec son arbre (modèle → outil → modèle) ;
- un IBAN saisi y est masqué ;
- le filtre « durée > 10 s » fonctionne ;
- la purge est vérifiée avec une rétention de 1 jour et une horloge simulée ;
- un collecteur OTLP de test reçoit les spans ;
- un membre ne voit pas les traces privées d'un autre ;
- contrôle de fumée « Traces ».

#### K9 — Prompts versionnés (M)

**Contenu**
- Objet **Prompt** : texte et `{{variables}}` typées, versions immuables avec note, diff, étiquettes `production` et `test`, partage dans l'espace.
- Choix d'un prompt dans le bloc Agent et le formulaire d'agent (« Consignes : prompt X @production »).
- « Enregistrer comme prompt » depuis le Playground.
- API : `GET /api/v2/prompts/{id}?label=production`.

**Terminé quand**, sur pc6 :
- déplacer l'étiquette `production` de v1 à v2 change la réponse de l'agent publié **sans republier** ;
- le retour à v1 fonctionne ;
- le diff est affiché ;
- l'API renvoie la version étiquetée ;
- tests et contrôle de fumée « Prompts ».

#### K10 — Évaluations (L)

**Contenu**
- **Jeux de tests** importés d'une table, d'un CSV ou JSONL, ou créés depuis des traces (K8) et des conversations de l'Assistant (avec l'accord du membre).
- **Juges** :
  - LLM en classification ou en note, avec consignes et « Essayer » sur 10 lignes ;
  - règles : contient, regex, JSON valide, proximité sémantique.
- **Campagnes** : un agent, un prompt ou un modèle croisé avec un jeu de tests, exécutées en arrière-plan avec une concurrence bornée.
- **Statistiques** : taux de réussite, moyenne, p50 et p95 de latence, jetons, CO2.
- **Comparaison** de deux campagnes ligne à ligne, seuils d'alerte, campagne planifiée.

**Terminé quand**, sur pc6, avec un jeu « FAQ tarifs » de 30 questions :
- une campagne compare `qwen2.5:7b`, GLM 5.3 et le prompt v2 (K9) ;
- le tableau de comparaison est affiché ;
- le juge s'accorde à au moins 80 % avec 10 annotations humaines ;
- une campagne planifiée la nuit déclenche une alerte sous le seuil ;
- tests et contrôle de fumée « Évaluations ».

#### K11 — Multi-agents et compétences (M)

**Contenu**
- « **Peut confier à** » dans le formulaire d'agent, avec deux modes :
  - l'agent appelé répond et l'agent principal reprend ;
  - ou la main est passée pour la suite de la conversation.
- Délégation visible dans l'Assistant et dans la trace, avec une limite de profondeur.
- **Compétences** (cœur Sim) dans le formulaire et invocables par `@`, avec versions et étiquettes.

**Terminé quand**, sur pc6 :
- l'Assistant général confie une question de prix à « Agent tarifs » ; la trace montre la délégation et la réponse cite la base de l'agent tarifs ;
- une compétence « Ton de l'entreprise » change le style d'un agent ;
- une boucle de délégation est stoppée avec un message en français ;
- tests et contrôle de fumée.

#### K12 — Voix : réunions, synthèse vocale, dictée (M)

**Contenu**
- **Synthèse vocale** :
  - `/v1/audio/speech` dans Nexora API, servi par speaches (déjà déployé, profil `voice`) avec une voix française dont la licence est vérifiée ;
  - fournisseur Nexora pour le bloc Synthèse vocale ;
  - « Lire à voix haute » dans l'Assistant.
- **Diarisation et horodatage** par segment (WhisperX ou pyannote, licences à valider) : sortie « Intervenant 1 / 2 / 3 ».
- **Lexique de l'entreprise** (prompt initial de Whisper).
- Modèle PME « **Compte rendu de réunion** » : enregistrement → transcription par intervenant → résumé → validation → e-mail.
- **Dictée** au micro dans l'Assistant.

**Terminé quand**, sur pc6, sans aucun appel externe :
- un enregistrement de test de 10 minutes à 3 voix donne un compte rendu dont les intervenants sont cohérents (taux d'erreur de diarisation mesuré et consigné) ;
- la synthèse française est audible dans l'Assistant ;
- la dictée insère le texte ;
- contrôles de fumée « Synthèse vocale » et « Réunion ».

#### K13 — Traitements par lot (M)

**Contenu**
- Nexora API ajoute `/v1/files` et `/v1/batches` au format OpenAI :
  - fichier JSONL, un modèle par lot ;
  - **priorité basse** par rapport à l'interactif ;
  - reprise après redémarrage, expiration réglable.
- Écran **Traitements par lot** : choisir une table ou un CSV et un agent ou un prompt. Le résultat va dans une nouvelle colonne, avec progression, annulation et export.

**Terminé quand**, sur pc6 :
- 500 lignes d'une table sont classées par `qwen2.5:7b` ;
- pendant ce temps, la latence p95 de l'Assistant n'augmente pas de plus de 30 % (mesure consignée) ;
- le même lot passe par `client.batches.create` du client `openai` ;
- un redémarrage pendant le lot ne perd rien ;
- tests et contrôle de fumée.

#### K14 — Gouvernance avancée et garde-fous (M)

**Contenu**
- **Service PII local** : Presidio, image épinglée, profil compose, utilisé par le bloc Garde-fous (`PII_URL`, aujourd'hui sans service) et par le masquage des traces (K8).
- **Politiques par espace** : interdire l'envoi de données personnelles à un modèle « Hors instance » (masquer ou refuser) ; modèles autorisés par groupe d'accès.
- **Modération** facultative avec un modèle local sous licence ouverte (par exemple Granite Guardian, Apache-2.0).
- **Export CSV** du journal d'audit.
- SAML si un client le demande (sinon v4).

**Terminé quand**, sur pc6 :
- le bloc Garde-fous détecte un IBAN et un e-mail ;
- le groupe « Comptabilité » ne peut pas choisir GLM 5.3, ni dans un bloc ni par l'API (403) ;
- une question contenant un IBAN envoyée à GLM 5.3 dans un espace en politique « masquer » part masquée, ce que montre la trace ;
- l'export CSV de l'audit s'ouvre dans un tableur français ;
- tests et contrôle de fumée « Garde-fous ».

### 3.3 Hors périmètre de la v3

| Sujet | Raison |
|---|---|
| Fine-tuning, Forge, Classifier Factory | Mistral les a dépréciés [20]. Ils demandent du GPU et des données annotées que les PME n'ont pas. Prompts versionnés et évaluations (K9, K10) couvrent l'essentiel. |
| Optimisation automatique de prompts (GEPA) | Sans jeux de tests ni juges éprouvés (K10), elle n'a pas de base. À envisager en v4. |
| Agents vocaux temps réel (LiveKit, SIP), transcription en WebSocket, TTS temps réel | Latence intenable sur CPU (Mistral lui-même ne descend pas sous 1 s par tour [19]). Infrastructure lourde et téléphonie à contractualiser. v4, avec GPU. |
| Clonage de voix | Risque légal (usurpation) et licences de poids non commerciales [open-source/01]. |
| Vibe Code (agent de code) | C'est un autre produit (mistral-vibe en phase 3 selon `open-source/00`). |
| Workflows en code Python sur Temporal, managed deployments | Le moteur visuel couvre le besoin des PME. Le code d'abord est l'inverse de la promesse de Nexora (déjà exclu de la v2). |
| Génération d'images en local | Impraticable sur CPU. Seul un fournisseur facultatif est prévu (K5). |
| Canvas complet (export PPTX/Excel), Deep Research | Valeur réelle mais effort L à XL. À reprendre après K6. |
| Compte Enterprise multi-organisations, SCIM, Admin API complète | Ne concerne que les grands comptes. À ouvrir sur demande d'un client. |
| Facturation, crédits prépayés, Priority Tier, endpoints régionaux | Sans objet pour une installation chez le client. La consommation et les budgets suffisent. |
| Recherche agentique sur Vespa / Search Toolkit | Trop lourd. L'idée de la boucle agentique est reprise sur pgvector après K5 si les citations ne suffisent pas. |

### 3.4 Les 10 écarts les plus importants

1. Les **modèles à raisonnement** (GLM 5.3, défaut de pc6) donnent un test vide et une réflexion invisible (K1).
2. Il n'y a **pas d'interpréteur de code** : Python est impossible sans E2B ou Daytona (K5).
3. Il n'y a **pas d'extraction structurée de documents** (factures, devis) (K4).
4. Les **clés Nexora API** ne se créent que par curl, et les **agents ne sont pas appelables en format OpenAI** (K3).
5. Il manque les **connexions personnelles**, les **tâches planifiées** et les **workflows en formulaire** dans l'Assistant (K6).
6. Il n'y a **pas de confirmation humaine** avant une action d'un outil (K5).
7. Il n'y a **pas de traces unifiées** des appels de modèle, ni masquage, ni rétention (K8).
8. Il n'y a **pas d'évaluations** : jeux de tests, juges, comparaison (K10).
9. Le **canevas est trop dense pour un débutant** : il manque un mode guidé (K7).
10. Il n'y a **pas de citations** dans les réponses, ni de **diarisation** ou de **synthèse vocale** souveraines (K5, K12).

---

## 4. Risques et questions pour le fondateur

### 4.1 Risques

| Risque | Conséquence | Parade |
|---|---|---|
| **CPU seul** sur les installations visées : sandbox, diarisation, campagnes d'évaluation et lots se disputent les mêmes cœurs que l'Assistant | Lenteur perçue | Files à priorité basse (K13), concurrence bornée, mesures de latence dans chaque « Terminé quand » |
| GLM 5.3 dans le cloud **masque la lenteur du CPU** pendant les tests | Fonctions validées qui seront inutilisables chez un client sans GPU | Double vérification, défaut cloud puis défaut local (§3.1) |
| **Sécurité du bac à sable** (K5) : du code écrit par une IA s'exécute sur le serveur du client | Évasion ou épuisement des ressources | Pas de réseau, quotas, suite de tests d'évasion, désactivé par défaut |
| **Divergence avec l'amont Sim** : chaque jalon ajoute des modules Nexora | Coût des mises à jour de Sim | Garder les ajouts dans `lib/nexora/` et les pages Nexora, comme en v2 |
| **Licences** : modèles pyannote sous conditions Hugging Face ; successeur de Piper sous GPL ; voix de speaches à vérifier | Blocage juridique de K12 | Choix vérifié dans `check-licenses` avant d'intégrer |
| **Empreinte de l'installation** : Langfuse exige ClickHouse | Mémoire nécessaire et install en une commande plus lourde | Stockage PostgreSQL par défaut, export OTLP vers Langfuse en option (K8) |

### 4.2 Questions qui demandent le fondateur

1. **Modèles hors instance.** La passerelle LiteLLM et GLM 5.3 servent-elles seulement aux tests, ou deviennent-elles une option proposée aux clients ? Si c'est une option : qui héberge GLM 5.3, et dans quel pays ? L'installateur peut-il la proposer par défaut, ou seulement après un choix explicite ? La règle de la v2 dit qu'aucune donnée ne sort sans action de l'administrateur.
2. **Matériel minimal visé** (RAM, cœurs, GPU facultatif ou non). La réponse tranche entre traces internes et Langfuse, et rend possibles ou non la diarisation, le bac à sable et les images en local.
3. **Exécution de code généré par l'IA** chez le client (K5) : acceptable contractuellement, activée par défaut ou sur décision de l'administrateur ?
4. **Publication des SDK** sous le nom Nexora sur PyPI et npm, et **exposition de `api.<domaine>` sur Internet** par défaut ou seulement sur le réseau local (K3). C'est une responsabilité de chaîne logicielle ; Mistral a connu un incident en mai 2026 [20].
5. **Points reportés de la v2**, toujours ouverts : la montée de version de Next.js (avis de vulnérabilité affiché par `next dev`) et la limite de 10 Mo du proxy pour les fichiers joints aux chats publics intégrés.
