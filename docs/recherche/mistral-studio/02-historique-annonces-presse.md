# 02 — Historique, annonces, presse et paysage concurrentiel de Mistral AI Studio

> **Périmètre** : histoire de la plateforme développeur de Mistral (de « La Plateforme », décembre 2023, à « Mistral Studio », octobre 2026), chronologie datée de toutes les annonces liées à Studio et aux modèles, couverture presse et analyses, faits sur l'entreprise, paysage concurrentiel des plateformes comparables · **Sources** : 92 articles de https://mistral.ai/news (toute la liste, flux RSS du 21/10/2026), 13 pages produit et entreprise de mistral.ai lues, 11 pages solutions, industrie et Vibe ainsi que 42 témoignages clients parcourus par recherche ciblée, 2 pages de docs.mistral.ai (Changelog, Release notes ; copie du 21/10/2026), environ 35 articles de presse, d'analystes, de blogs et de concurrents (liste en annexe) · **Rédaction** : agent de recherche pour Nexora Studio · **État au** : 21/10/2026

**Convention de lecture.** Chaque affirmation porte sa source. Les étiquettes suivantes distinguent la nature de l'information :
- **[Mistral]** : fait publié par Mistral (blog, site, docs) — ce sont des déclarations de l'éditeur, pas des vérifications indépendantes ;
- **[Presse]** : fait rapporté par un média (avec son auteur et sa date) ;
- **[Opinion]** : jugement d'un journaliste, d'un analyste, d'un concurrent ou d'un utilisateur ;
- **[Estimation tierce]** : chiffre d'un agrégateur ou d'une source secondaire non confirmée par Mistral ;
- **(inférence)** : déduction de la rédaction, non écrite telle quelle dans une source.

Les montants sont donnés dans la devise de la source. « M » = million, « Md » = milliard. Les prix d'API sont en dollars par million de tokens (entrée / sortie) sauf mention contraire.

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail — chronologie et contenu des annonces
   - 3.1 Les grandes périodes (vue d'ensemble)
   - 3.2 Chronologie datée exhaustive (2023 → 21/10/2026)
   - 3.3 Fiches détaillées des annonces « plateforme » et Studio
   - 3.4 Les modèles : catalogue chronologique, identifiants, licences, prix
   - 3.5 Presse et analyses sur Studio et la plateforme
   - 3.6 Clients cités comme utilisateurs de Studio ou de ses briques
   - 3.7 L'entreprise : faits utiles (fondateurs, financement, revenus, effectifs, stratégie, partenariats, infrastructure)
   - 3.8 Paysage concurrentiel des plateformes comparables
4. Interface utilisateur (ce que révèlent annonces et presse)
5. API et SDK (ce que révèlent les annonces)
6. Limites, quotas, tarifs, disponibilité (historique)
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées
- Annexe — Couverture

---

## 1. En bref

- **Lignée du produit.** La plateforme développeur de Mistral est née en bêta le 11/12/2023 sous le nom **« La Plateforme »** (3 endpoints de chat + 1 endpoint d'embeddings, API calquée sur celle d'OpenAI). Le 24/10/2025, Mistral lance en **bêta privée** **« Mistral AI Studio »**, présentée comme « The Production AI Platform » et organisée en trois piliers : **Observability**, **Agent Runtime**, **AI Registry** **[Mistral]**. D'après VentureBeat, la marque « La Plateforme » est alors retirée **[Presse]**. Depuis début 2026, Mistral écrit surtout **« Mistral Studio »** (titre actuel du billet de lancement et de la page produit), mais « AI Studio » reste employé dans les notes de version d'octobre 2026 **[Mistral]**.
- **Ce qu'est Studio aujourd'hui** (page produit, 21/10/2026) : une plateforme unique pour construire, déployer et gouverner des systèmes agentiques. Elle est structurée en cinq volets : *Build* (Workflows, Agents, Connectors), *Iterate* (Experiments, Campaigns, Judges, Datasets), *Deploy* (Hybrid, Dedicated, Self-hosted), *Govern* (Observability, Guardrails, Moderation) et *Accelerate* (AI registry, Versioning and lineage, Developer toolkit). La plateforme comprend aussi des playgrounds dédiés : agents, Document AI/OCR, audio et voix **[Mistral]**.
- **Briques successives** : Agents API (27/05/2025), Studio et ses trois piliers (24/10/2025), Document AI Playground (17/12/2025), Audio playground (04/02/2026), playground TTS (23/03/2026), Forge (17/03/2026, entraînement de modèles), **Workflows** (public preview, 27/04/2026, moteur Temporal), **Connectors in Studio** (public preview, 22/05/2026, MCP), Search Toolkit (28/05/2026, open source), contrôles avancés des connecteurs (24/06/2026), Prompts & Skills versionnés (09/07/2026), Regional Endpoints et Priority Tier (11/08/2026), Agentic Search dans les Libraries (20/08/2026), gestion des utilisateurs dans le panneau d'administration (GA, 10/09/2026), Managed Deployments pour Workflows (public preview, 09/10/2026) **[Mistral]**.
- **Statuts au 21/10/2026.** Workflows, Connectors in Studio, Managed Deployments, Connectors Debugger et Priority Tier sont en **public preview**. Sont **GA** : les contrôles d'administration des connecteurs, les clés API à portée de connecteur, les connecteurs multi-comptes, les Regional Endpoints et la gestion des utilisateurs dans l'Admin Panel **[Mistral]**. Une revue indépendante (The Rundown, 28/08/2026) souligne que Workflows est encore en preview **[Opinion]**.
- **Le Chat est devenu Vibe** le 28/05/2026 : un seul agent et une seule licence pour le travail (*Work Mode*) et le code (*Code Mode*). Les workflows écrits dans Studio peuvent être publiés dans Le Chat/Vibe et déclenchés par n'importe quel employé **[Mistral]**.
- **Positionnement.** Mistral se présente comme « full stack » souverain : modèles open-weight, produits (Studio, Vibe, Forge), infrastructure (Mistral Compute, objectif de 1 GW en Europe d'ici 2030) et services (Applied AI) **[Mistral]**. La presse et les analystes y voient un virage d'éditeur de modèles vers « entreprise d'infrastructure ». Ils relèvent un écart de taille important avec OpenAI et Anthropic **[Opinion : Futurum, Le Monde Informatique, TechCrunch]**.
- **Chiffres clés de l'entreprise.** Fondée en avril 2023 par Arthur Mensch, Guillaume Lample et Timothée Lacroix. Série C de 1,7 Md€ à 11,7 Md€ post-money (09/09/2025, menée par ASML), puis série D de 3 Md€ à plus de 21 Md€ (08/09/2026, menée par Samsung Electronics) **[Mistral]**. ARR supérieur à 400 M$ en février 2026 contre environ 20 M$ un an plus tôt, avec un objectif supérieur à 1 Md$ fin 2026 (déclarations d'Arthur Mensch) **[Presse]**. Présence dans 20 pays et plus de 125 grandes entreprises clientes **[Mistral]**.
- **Concurrence.** Entre octobre 2025 et avril 2026, tous les grands acteurs ont lancé une plateforme d'agents gérée : AWS Bedrock AgentCore (GA 13/10/2025), Microsoft Agent 365 (18/11/2025) et Foundry, OpenAI Frontier (05/02/2026), Anthropic Claude Managed Agents (08/04/2026), Google Gemini Enterprise Agent Platform (22/04/2026). Leurs listes de fonctionnalités convergent presque ligne à ligne **[Opinion : ibl.ai, 24/09/2026]**. D'après la presse, Studio se distingue par le déploiement auto-hébergé ou hybride, la séparation entre plan de contrôle chez Mistral et exécution chez le client (Workflows), les poids ouverts et l'infrastructure européenne **[Presse/Opinion : VentureBeat, Futurum]**.

---

## 2. Concepts et vocabulaire

| Terme original | Définition (et date d'apparition) |
|---|---|
| `La Plateforme` | Nom historique (déc. 2023 → oct. 2025) de la plateforme développeur et de l'API de Mistral, accessible sur `console.mistral.ai`. Il subsiste dans des identifiants techniques (événements d'audit `la_plateforme.training.enabled`/`disabled`, route `admin.mistral.ai/plateforme/limits`). |
| `Mistral AI Studio` / `Mistral Studio` / `AI Studio` | Successeur de La Plateforme (24/10/2025), « production AI platform ». Les trois appellations coexistent sur le site et dans les docs. |
| `Observability` | Pilier de Studio (oct. 2025) : `Explorer` (filtrage et inspection du trafic), `Judges` et `Judge Playground`, `Campaigns`, `Datasets`, `Experiments`, `Iterations`, `Dashboards`. |
| `Judge` | Évaluateur (souvent un LLM utilisé comme juge) qui note les sorties à grande échelle ; peut être intégré ou personnalisé. |
| `Campaign` | Itération reproductible et versionnée d'évaluation ; transforme les interactions de production en jeux d'évaluation. |
| `Agent Runtime` | Pilier d'exécution de Studio (oct. 2025) : environnement d'exécution avec état et tolérant aux pannes, construit sur **Temporal**. Workflows (avr. 2026) en est le produit public (inférence). |
| `AI Registry` | Pilier de gouvernance (oct. 2025) : registre de référence des agents, modèles, jeux de données, juges, outils et workflows (puis prompts et skills). Gère lignage, propriété, versions, contrôles d'accès, politiques de modération et portes de promotion. |
| `Agents API` | API d'agents (27/05/2025) : connecteurs intégrés (exécution de code, recherche web, génération d'images, bibliothèque de documents), outils MCP, conversations avec état, transferts (*handoffs*) entre agents. Une version alpha d'« Agents » avait été annoncée le 07/08/2024. |
| `Conversations API` | API de conversations avec état associée aux agents (démarrage avec un `agent_id` ou directement avec un modèle). |
| `Libraries` / `Document Library` | Bibliothèques de documents servant au RAG intégré (connecteur « Document library », API de gestion le 24/07/2025) ; intégrées à Studio et à Vibe ; Agentic Search y est ajouté le 20/08/2026. |
| `Connectors` | Intégrations empaquetées en entités réutilisables via le protocole MCP : connecteurs intégrés (*built-in*) et MCP personnalisés. Ils sont enregistrés centralement et partagés entre Le Chat/Vibe et Studio. Annoncés dans Le Chat le 02/09/2025, dans Studio le 22/05/2026. |
| `MCP` | Model Context Protocol, standard ouvert de connexion des agents aux outils et données externes. |
| `Direct tool calling` | Appel direct d'un outil d'un connecteur sans passer par le modèle (22/05/2026). |
| `requires_confirmation` | Option de connecteur qui suspend l'exécution d'un outil jusqu'à approbation humaine (22/05/2026). |
| `Workflows` | « Couche d'orchestration pour l'IA d'entreprise » (public preview, 27/04/2026) : workflows écrits en Python, exécution durable sur Temporal, observabilité, humain dans la boucle, publication dans Le Chat. SDK `mistralai-workflows` v3.0. |
| `Managed Deployments` | Exécution des *workers* de Workflows sur Mistral Cloud sans infrastructure à gérer (public preview, 09/10/2026). |
| `Worker` | Processus qui exécute les étapes d'un workflow. Il est déployé par le client sur son Kubernetes (via un chart Helm) ou, depuis oct. 2026, géré par Mistral. |
| `Prompts` / `Skills` (Studio) | Actifs versionnés (09/07/2026) : versions immuables, retour arrière, propriétaire, étiquettes de classification, journaux d'audit. Les skills sont exposés comme serveurs MCP. |
| `Forge` | Système d'entraînement de modèles sur données propriétaires (17/03/2026) : pré-entraînement, post-entraînement, apprentissage par renforcement (RL), évaluation ; conçu en priorité pour être piloté par des agents. |
| `Mistral Compute` | Offre d'infrastructure IA (11/06/2025) : GPU, orchestration, API, produits et services, du bare-metal au PaaS. Rattachée aujourd'hui à la section « Cloud » du site. |
| `Mistral AI Cloud` / `Mistral Cloud` | Cloud de Mistral (inférence, Compute, applications). Le fichier `llms.txt` pointe vers `/products/ai-cloud`, page inexistante (404) ; la page réelle est `/cloud`. |
| `Regional Endpoints` | Choix de la région d'inférence, Europe ou États-Unis (`api.eu.mistral.ai`, `api.us.mistral.ai`) ; GA le 11/08/2026 ; surcoût de 10 %. |
| `Priority Tier` | Niveau de service prioritaire (public preview, 11/08/2026) : limites de débit personnalisées et SLA de disponibilité (99,9 % selon la page Cloud). |
| `European Compute Units (ECUs)` | Mécanisme qui convertit des engagements pluriannuels d'entreprises en accès à l'infrastructure construite par Mistral (11/08/2026). |
| `Search Toolkit` | Cadre open source et modulaire de pipelines de recherche : ingestion, recherche (BM25, dense, hybride), évaluation ; s'appuie sur Vespa (28/05/2026). |
| `Agentic Search` | Boucle de recherche en plusieurs étapes avec cinq outils (`search`, `open`, `navigate`, `read`, `grep`) au-dessus d'un index existant (20/08/2026). |
| `Document AI` | Couche applicative au-dessus de l'OCR : sortie JSON selon un schéma, annotation d'images, prompt personnalisé ; existe en playground dans Studio. |
| `Playground` | Espaces de test dans la console : agents/modèles, Judge Playground, Document AI Playground, audio playground, TTS. |
| `Vibe` | Depuis le 28/05/2026, nom unique de l'assistant (ex-Le Chat) et de l'agent de code (ex-Mistral Code/Vibe CLI) ; modes `Work`, `Code`, `Chat` (ce dernier est hérité et en cours de fusion). |
| `Le Chat` | Assistant conversationnel (26/02/2024 → 28/05/2026), devenu Vibe. |
| `Applied AI` | Équipes de services de Mistral (stratèges de déploiement, ingénieurs et scientifiques Applied AI, ingénieurs de déploiement). |
| `Labs` (modèles) | Modèles expérimentaux à durée de vie courte (ex. `labs-leanstral-2603`), soumis à des règles de données spécifiques (cf. § 6). |
| `Experiment plan` | Nom employé en 2026 pour l'usage gratuit de l'API dans Studio (« Free on the Experiment plan in Mistral Studio »). La page tarifs actuelle parle du plan `Free`. |
| `MNPL` / `MRL` | Mistral AI Non-Production License (29/05/2024) et Mistral Research License (24/07/2024) : licences non commerciales, progressivement abandonnées au profit d'Apache 2.0 et d'une licence MIT modifiée (2025-2026). |
| `Open-weight` | Modèle dont les poids sont téléchargeables, sous Apache 2.0, licence MIT modifiée ou CC BY-NC selon le modèle. |
| `Sovereign AI` | Thème central du discours de Mistral, décliné en contrôle sur quatre couches : données, intelligence (modèles), calcul, opérations. |

---

## 3. Fonctionnalités en détail — chronologie et contenu des annonces

### 3.1 Les grandes périodes (vue d'ensemble)

| Période | Nom de la plateforme | Thèse dominante (d'après les annonces) | Jalons |
|---|---|---|---|
| Sept. 2023 – mi-2024 | *La Plateforme* (bêta) | Servir des modèles ouverts et commerciaux via une API compatible avec le format de chat d'OpenAI | Mistral 7B, endpoints `mistral-tiny/small/medium`, `mistral-embed`, Mistral Large, Azure comme 1er partenaire de distribution |
| Mi-2024 – fin 2024 | *La Plateforme* | Personnalisation (fine-tuning), baisse des prix, offre gratuite | API de fine-tuning, alpha « Agents », SDK 1.0, offre gratuite, Batch API, Moderation API |
| 2025 | *La Plateforme* puis *Mistral AI Studio* | Agents et passage du prototype à la production | Agents API (MCP, mémoire, transferts), OCR, Le Chat Enterprise, Mistral Code, Mistral Compute, connecteurs MCP dans Le Chat, **lancement de Studio (24/10/2025)** |
| 2026 S1 | *Mistral Studio* | Orchestration durable, connecteurs, modèles sur mesure, agent unifié | Forge, **Workflows**, **Connectors in Studio**, Le Chat → **Vibe**, Search Toolkit, AI Now Summit |
| 2026 S2 | *Mistral Studio* / *AI Studio* | Gouvernance, souveraineté de l'inférence, recherche agentique, cloud | Contrôle des connecteurs, Prompts & Skills, Regional Endpoints/Priority Tier/modèles tiers, Agentic Search, Managed Deployments, Mistral Large 4 |

### 3.2 Chronologie datée exhaustive (2023 → 21/10/2026)

Sauf mention contraire, les dates sont celles du flux RSS de mistral.ai/news. L'étiquette ⭐ signale une annonce qui touche directement la plateforme développeur ou Studio. Le lien renvoie à l'article source.

#### 2023

| Date | Annonce | Ce qui a été lancé — détails et chiffres |
|---|---|---|
| 27/09/2023 | [Bringing open AI models to the frontier](https://mistral.ai/news/about-mistral-ai/) + [Mistral 7B](https://mistral.ai/news/announcing-mistral-7b/) | Manifeste de l'open-weight : présente les modèles ouverts comme alternative à un « oligopole » de l'IA. **Mistral 7B** : 7,3 milliards de paramètres, Apache 2.0, attention GQA et SWA, supérieur à Llama 2 13B sur tous les benchmarks cités. Mistral annonce aussi des modèles propriétaires optimisés pour l'on-prem et le VPC, livrés « white-box » (poids et code), ainsi que des solutions hébergées et des déploiements dédiés. |
| 11/12/2023 | ⭐ [La Plateforme](https://mistral.ai/news/la-plateforme/) | **Accès bêta** aux premiers services de la plateforme. 3 endpoints de chat : `mistral-tiny` (Mistral 7B Instruct v0.2, anglais seulement, MT-Bench 7,6), `mistral-small` (Mixtral 8x7B, 8,3), `mistral-medium` (prototype, 8,6). 1 endpoint d'embeddings `mistral-embed` (1 024 dimensions, score de recherche MTEB de 55,26). L'API suit les spécifications de chat du « concurrent » (OpenAI). Clients Python et JavaScript. Inscription ouverte, avec des imperfections prévenues. Remerciements à NVIDIA pour TensorRT-LLM et Triton. |
| 11/12/2023 | [Mixtral of experts](https://mistral.ai/news/mixtral-of-experts/) | Mixtral 8x7B : mixture d'experts parcimonieuse, 46,7 Md de paramètres dont 12,9 Md actifs par token, contexte de 32k, Apache 2.0. La version Instruct atteint 8,30 au MT-Bench. Contributions au projet vLLM (noyaux MegaBlocks). |

#### 2024

| Date | Annonce | Ce qui a été lancé — détails et chiffres |
|---|---|---|
| 26/02/2024 | ⭐ [Au Large](https://mistral.ai/news/mistral-large/) + [Le Chat](https://mistral.ai/news/le-chat-mistral/) | **Mistral Large** (32k, natif en anglais, français, espagnol, allemand et italien, function calling, mode JSON) sur La Plateforme et **Azure**, premier partenaire de distribution (Azure AI Studio, Azure ML). Trois voies d'accès : La Plateforme (hébergée en Europe), Azure, auto-déploiement. Nouvelle gamme d'endpoints : `open-mistral-7b`, `open-mixtral-8x7b`, `mistral-small-2402`, `mistral-large-2402` (`mistral-medium` conservé). Nouveautés plateforme : gestion d'organisation, paiement multi-devises, nouveaux niveaux de service. **Le Chat** en bêta, avec une offre « le Chat Enterprise » (auto-déploiement, modération fine). Le changelog des docs ajoute la gestion des administrateurs d'organisation et le paiement en dollars. |
| 26/02/2024 | (presse) | Microsoft investit 16 M$ (Wikipedia) **[Presse]**. |
| 28/03/2024 | (changelog docs) | Mode JSON disponible pour tous les modèles de La Plateforme. |
| 17/04/2024 | [Cheaper, Better, Faster, Stronger](https://mistral.ai/news/mixtral-8x22b/) | Mixtral 8x22B : 141 Md de paramètres dont 39 Md actifs, contexte de 64k, Apache 2.0, function calling. |
| 29/05/2024 | [Codestral](https://mistral.ai/news/codestral/) + [MNPL](https://mistral.ai/news/mistral-ai-non-production-license-mnpl/) | **Nouvelle licence non commerciale** (MNPL), qui inaugure la stratégie de double licence. **Codestral 22B** : plus de 80 langages, contexte de 32k, complétion FIM (*fill-in-the-middle*). **Endpoint dédié `codestral.mistral.ai`** : clé API personnelle, hors des limites de débit de l'organisation, gratuit pendant 8 semaines de bêta, sur liste d'attente. Il est destiné aux plugins d'IDE où l'utilisateur apporte sa propre clé ; `api.mistral.ai` reste facturé au token. Intégrations LlamaIndex, LangChain, Continue.dev, Tabnine. |
| 05/06/2024 | ⭐ [My Tailor is Mistral](https://mistral.ai/news/customization/) + [hackathon](https://mistral.ai/news/2024-ft-hackathon/) | **Personnalisation sur La Plateforme**, en trois offres : `mistral-finetune` (dépôt open source basé sur LoRA), **fine-tuning serverless** sur La Plateforme (LoRA ; Mistral 7B et Small au départ), entraînement sur mesure (pré-entraînement continu, réservé à des clients sélectionnés). Hackathon de fine-tuning du 5 au 30 juin 2024 : 2 500 € de crédits API pour chacun des 3 lauréats, 100 $ de crédits pour les participants sélectionnés. |
| 16/07/2024 | [Codestral Mamba](https://mistral.ai/news/codestral-mamba/), [Mathstral](https://mistral.ai/news/mathstral/) | Codestral Mamba (7 285 403 648 paramètres, Apache 2.0, recherche en contexte testée jusqu'à 256k, `codestral-mamba-2407`) ; Mathstral 7B (projet Numina). |
| 18/07/2024 | [Mistral NeMo](https://mistral.ai/news/mistral-nemo/) | 12B développé avec NVIDIA, contexte de 128k, Apache 2.0, FP8, tokenizer **Tekken** ; `open-mistral-nemo-2407` ; conditionné en NVIDIA NIM. |
| 24/07/2024 | ⭐ [Large Enough](https://mistral.ai/news/mistral-large-2407/) | **Mistral Large 2** (`mistral-large-2407`, 123B, contexte de 128k, licence de recherche MRL plus licence commerciale). Généralisation du **versioning AA.MM** à tous les modèles. **Recentrage de La Plateforme** sur deux modèles généralistes (Nemo, Large) et deux spécialisés (Codestral, Embed), avec dépréciation progressive des anciens. Fine-tuning étendu à Large, Nemo et Codestral. Partenariat Google Cloud : API gérée sur **Vertex AI**, en plus d'Azure AI Studio, Amazon Bedrock et IBM watsonx.ai. |
| 29/07/2024 | (changelog docs) | SDK Python/JS **1.0** (guide de migration) et « Agents API » (version alpha). |
| 07/08/2024 | ⭐ [Build, tweak, repeat](https://mistral.ai/news/build-tweak-repeat/) | Personnalisation de tous les modèles phares (Large 2, Codestral) par prompt de base, few-shot ou fine-tuning sur données apportées par le client. **Alpha « Agents »** : un modèle enveloppé d'instructions et d'exemples, exposé dans Le Chat ou par l'API, éventuellement combiné en plusieurs agents. **SDK `mistralai` 1.0** pour Python et TypeScript. |
| 17/09/2024 | ⭐ [AI in abundance](https://mistral.ai/news/september-24-release/) + [Pixtral 12B](https://mistral.ai/news/pixtral-12b/) | **Offre gratuite sur La Plateforme** pour l'expérimentation, l'évaluation et le prototypage. L'offre commerciale apporte une isolation complète des données, une option gratuite de rétention zéro et des limites de débit plus élevées. Baisses de prix ($/M tokens, entrée/sortie) : Nemo 0,15/0,15 (−50 %), Pixtral 12B 0,15/0,15, Small 0,2/0,6 (−80 %), Codestral 0,2/0,6 (−80 %), Large 2/6 (−33 %). Mistral Small v24.09 (22B, MRL). Pixtral 12B (Apache 2.0, encodeur de 400M) gratuit dans Le Chat. Point d'entrée : `console.mistral.ai`. |
| 16/10/2024 | [Ministraux](https://mistral.ai/news/ministraux/) | Ministral 3B (`ministral-3b-latest`, 0,04 $/M) et 8B (`ministral-8b-latest`, 0,1 $/M), contexte de 128k. |
| 06–07/11/2024 | ⭐ [Batch API](https://mistral.ai/news/batch-api/), [Moderation API](https://mistral.ai/news/mistral-moderation/) | **Batch API** : −50 % par rapport à l'appel synchrone, envoi d'un fichier puis téléchargement des résultats, tous modèles, limite d'1 M de requêtes en cours par workspace. **Moderation API** : classifieur LLM sur 9 catégories (dont PII et « conseils non qualifiés »), deux endpoints (texte brut et conversation), 11 langues ; c'est la modération utilisée dans Le Chat. Nouveaux paramètres d'API : `presence_penalty`, `frequency_penalty`, `n`. |
| 18/11/2024 | [Mistral has entered the chat](https://mistral.ai/news/mistral-chat/) + [Pixtral Large](https://mistral.ai/news/pixtral-large/) | Le Chat : recherche web, Canvas, compréhension de documents, images (Flux Pro), agents partageables ; gratuit en bêta. Pixtral Large (124B), Mistral Large 24.11 (`mistral-large-2411`). |

#### 2025

| Date | Annonce | Ce qui a été lancé — détails et chiffres |
|---|---|---|
| 13/01/2025 | [Codestral 25.01](https://mistral.ai/news/codestral-2501/) | Génération 2 fois plus rapide, contexte de 256k, `codestral-latest`, n°1 de l'arène LMsys Copilot. Disponible sur Vertex AI, en preview privée sur Azure AI Foundry, bientôt sur Bedrock. |
| 16/01/2025 | [Purr-fectly informed](https://mistral.ai/news/mistral-afp/) | Partenariat avec l'AFP : dépêches dans Le Chat (2 300 dépêches par jour en 6 langues). Origine probable de l'outil « Premium News / Verified news » (inférence). |
| 28/01/2025 | (changelog docs) | *Custom structured outputs* pour tous les modèles. |
| 30/01/2025 | [Mistral Small 3](https://mistral.ai/news/mistral-small-3/) | 24B, Apache 2.0, MMLU supérieur à 81 %, 150 tokens/s, `mistral-small-2501`. **Engagement à revenir à Apache 2.0 pour les modèles généralistes** et à abandonner progressivement la MRL. |
| 06/02/2025 | [The all new le Chat](https://mistral.ai/news/all-new-le-chat/) | Plans **Pro (14,99 $/mois)**, Team, Enterprise (preview privée) ; applications iOS/Android ; Flash Answers ; Code Interpreter ; Memories ; connecteurs de données « à venir ». |
| 17/02/2025 | [Mistral Saba](https://mistral.ai/news/mistral-saba/) | 24B régional (Moyen-Orient, Asie du Sud) ; Mistral annonce aussi des modèles exclusifs entraînés pour des clients stratégiques. |
| 04/03/2025 | [Agentic workflow PRD → tickets](https://mistral.ai/news/agentic-workflows-from-meetings-to-dev-tickets/) | Blog Solutions : `TranscriptToPRDTicket` (`PRDAgent` + `TicketCreationAgent`, Mistral Large 2, création de tickets Linear/Jira ; notebook Colab). |
| 06/03/2025 | ⭐ [Mistral OCR](https://mistral.ai/news/mistral-ocr/) | API `mistral-ocr-latest` (`mistral-ocr-2503`) : **1 000 pages par dollar** (environ le double en batch), jusqu'à 2 000 pages/min sur un nœud, document comme prompt et sortie structurée, auto-hébergement sélectif. Score global de 94,89 sur un benchmark interne. Modèle aujourd'hui déprécié. |
| 17/03/2025 | [Mistral Small 3.1](https://mistral.ai/news/mistral-small-3-1/) | Apache 2.0, contexte de 128k, multimodal ; La Plateforme y est présentée comme « playground développeur ». |
| 09/04/2025 | [Evaluating RAG with LLM as a Judge](https://mistral.ai/news/llm-as-rag-judge/) | Blog : la « RAG Triad » (pertinence du contexte, ancrage, pertinence de la réponse) mise en œuvre avec les sorties structurées et un LLM juge. Préfigure les *Judges* de Studio (inférence). |
| 16/04/2025 | (changelog docs) | *Classifier Factory* (création de classifieurs ; aujourd'hui dans la section « deprecated » des docs). |
| 07/05/2025 | [Medium 3](https://mistral.ai/news/mistral-medium-3/) + ⭐ [Le Chat Enterprise](https://mistral.ai/news/le-chat-enterprise/) | Medium 3 : 0,4 $/2 $, au moins 90 % de Claude Sonnet 3.7 selon Mistral, auto-hébergeable à partir de 4 GPU, disponible sur La Plateforme et SageMaker. **Le Chat Enterprise** : recherche d'entreprise, création d'agents sans code, connecteurs (Google Drive, SharePoint, OneDrive, Google Calendar, Gmail), bibliothèques de documents, modèles personnalisés, déploiements hybrides ; respect strict des ACL ; journalisation d'audit ; MCP « bientôt » ; Google Cloud Marketplace. |
| 21/05/2025 | [Devstral](https://mistral.ai/news/devstral/) | Devstral (avec All Hands AI) : 46,8 % sur SWE-Bench Verified, Apache 2.0, 0,1 $/0,3 $. |
| 22/05/2025 | (changelog docs) | Mistral OCR 2 (`mistral-ocr-2505`) et *annotations*. |
| 27/05/2025 | ⭐ [Agents API](https://mistral.ai/news/agents-api/) | **Agents API** : connecteurs intégrés (exécution de code Python en bac à sable, génération d'images FLUX1.1 [pro] Ultra, *Document Library* pour le RAG sur Mistral Cloud, recherche web), **outils MCP**, mémoire persistante et conversations avec état (`agent_id` ou accès direct au modèle), embranchement de conversations, streaming, orchestration multi-agents avec *handoffs*. SimpleQA : Large 75 % et Medium 82,32 % avec recherche web, contre 23 % et 22,08 % sans. Cookbooks : GitHub (Devstral), Linear (MCP multi-serveurs), analyste financier, voyage, nutrition. L'API est présentée comme la colonne vertébrale de plateformes agentiques d'entreprise. |
| 28/05/2025 | [Codestral Embed](https://mistral.ai/news/codestral-embed/) | `codestral-embed-2505`, 0,15 $/M, −50 % en batch, dimensions et précision configurables, contexte de 8 192 tokens. |
| 04/06/2025 | [Mistral Code](https://mistral.ai/news/mistral-code/) | Assistant de code d'entreprise, dérivé de Continue (JetBrains, VS Code), en bêta privée. Console d'administration : contrôles, observabilité, gestion des sièges, analytics ; RBAC ; audit. Clients : **Abanca** (hybride), **SNCF** (4 000 développeurs, version serverless), **Capgemini** (plus de 1 500 développeurs on-prem). |
| 10/06/2025 | [Magistral](https://mistral.ai/news/magistral/) | Premier modèle de raisonnement : Small (24B, Apache 2.0) et Medium. AIME2024 : 73,6 % (Medium). |
| 11/06/2025 | ⭐ [Mistral Compute](https://mistral.ai/news/mistral-compute/) | **Offre d'infrastructure** : pile privée intégrée (GPU, orchestration, API, produits, services), du bare-metal au PaaS géré ; partenaire NVIDIA, « dizaines de milliers de GPU » ; énergie décarbonée. Cible : Europe, Moyen-Orient, Asie, hémisphère Sud. Partenaires de lancement : Black Forest Labs, BNP Paribas, Kyutai, Mirakl, Orange, Schneider Electric, SLB, SNCF, Thales, Veolia. |
| 03/07/2025 | [AI for Citizens](https://mistral.ai/news/ai-for-citizens/) | Offre aux États (France, Luxembourg, Singapour, Pays-Bas, Angleterre, Suisse…) : auto-hébergement, datacenters de Mistral et de partenaires locaux, ou SaaS. |
| 10/07/2025 | [Devstral 2507](https://mistral.ai/news/devstral-2507/) | Devstral Small 1.1 (53,6 % sur SWE-Bench Verified) et Devstral Medium (61,6 %, 0,4 $/2 $). |
| 15/07/2025 | [Voxtral](https://mistral.ai/news/voxtral/) | Voxtral 24B et Mini 3B (Apache 2.0). API de transcription à partir de 0,001 $/min, contexte de 32k (30 min en transcription, 40 min en compréhension). |
| 17/07/2025 | [Le Chat dives deep](https://mistral.ai/news/le-chat-dives-deep/) | Deep Research, mode vocal, mode Think, Projects (avec une bibliothèque par défaut). |
| 22/07/2025 | [Environmental standard](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/) | Analyse de cycle de vie (Carbone 4, ADEME) : Large 2 = 20,4 ktCO₂e, 281 000 m³ d'eau ; une réponse de 400 tokens dans Le Chat = 1,14 gCO₂e et 45 mL d'eau. |
| 24/07/2025 | (changelog docs) | **Document Library API** (gestion des bibliothèques) ; Magistral 1.1 ; SDK audio. |
| 30/07/2025 | [Codestral 25.08 + Coding Stack](https://mistral.ai/news/codestral-25-08/) | +30 % de complétions acceptées. Mistral Code : télémétrie non obligatoire, SSO, audit, **observabilité d'usage via la « Mistral Console »**. Clients : Capgemini, Abanca, SNCF. |
| 01/08/2025 | [Fine-tuning VLM satellite](https://mistral.ai/news/unlocking-potential-vision-language-models-satellite-imagery-fine-tuning/) | Fine-tuning de Pixtral-12B possible dans l'**interface de La Plateforme** (on n'y saisit que le *learning rate* et le nombre d'epochs ; la taille de batch est calculée automatiquement). Précision passée de 0,56 à 0,91, pour un budget inférieur ou égal à 10 $. |
| 12/08/2025 | (changelog docs) | Mistral Medium 3.1 (`mistral-medium-2508`). |
| 27/08/2025 | (changelog docs) | Paramètre `p` dans les chunks de streaming (protection contre une attaque par canal auxiliaire sur la longueur des tokens, signalée par Microsoft). |
| 02/09/2025 | ⭐ [Custom MCP connectors + Memories](https://mistral.ai/news/le-chat-mcp-connectors-memories/), [Memory](https://mistral.ai/news/memory/) | **Plus de 20 connecteurs MCP (bêta)** dans Le Chat (Databricks, Snowflake, GitHub, Atlassian, Asana, Box, Stripe, Zapier…) et **MCP distants personnalisés**. L'administrateur choisit quels connecteurs sont accessibles à qui ; authentification « au nom de » l'utilisateur. Memories (bêta, architecture à base de graphe). Le tout est disponible dans le plan Free. |
| 09/09/2025 | [Series C](https://mistral.ai/news/mistral-ai-raises-1-7-b-to-accelerate-technological-progress-with-ai/) | **1,7 Md€ à 11,7 Md€ post-money**, tour mené par **ASML**. |
| 17/09/2025 | (changelog docs) | Magistral 1.2. |
| **24/10/2025** | ⭐⭐ [Introducing Mistral (AI) Studio](https://mistral.ai/news/ai-studio/) | **Lancement de Studio en bêta privée** (fiche détaillée au § 3.3.3). |
| 19/11/2025 | [KI für Deutschland](https://mistral.ai/news/ki-fur-deutschland/) | Partenariat pluriannuel avec **SAP** (pile d'IA souveraine, modèles intégrés à SAP AI Foundation) et **Helsing** (modèles vision-langage-action pour la défense) ; ouverture d'un bureau en Allemagne. |
| 02/12/2025 | [Mistral 3](https://mistral.ai/news/mistral-3/) | **Mistral Large 3** (mixture d'experts, 41B actifs sur 675B, Apache 2.0, entraîné sur 3 000 GPU H200) et **Ministral 3** (3B/8B/14B ; versions base, instruct et raisonnement ; vision). Disponibles « sur Mistral AI Studio », Bedrock, Azure Foundry, Hugging Face, IBM watsonx, etc. Prix de Large 3 : 0,5 $/1,5 $. Documentation technique sur l'« AI Governance Hub ». |
| 09/12/2025 | [Devstral 2 + Vibe CLI](https://mistral.ai/news/devstral-2-vibe-cli/) | Devstral 2 (123B dense, 256K, licence MIT modifiée, 72,2 % sur SWE-Bench Verified ; gratuit par l'API pendant un temps puis 0,40 $/2 $). **Mistral Vibe CLI** (Apache 2.0, intégration aux IDE via l'Agent Communication Protocol, configuration `config.toml`). |
| 16/12/2025 | (changelog docs) | Mistral Small Creative (modèle Labs). |
| 17/12/2025 | ⭐ [Mistral OCR 3](https://mistral.ai/news/mistral-ocr-3/) | `mistral-ocr-2512`, 2 $ pour 1 000 pages (1 $ en batch), annotations à 3 $ pour 1 000 pages. **« Document AI Playground » dans Mistral AI Studio** : glisser-déposer de PDF ou d'images pour obtenir du texte ou un JSON structuré. Tableaux en HTML (`table_format`), `extract_header`/`extract_footer`. |

#### 2026

| Date | Annonce | Ce qui a été lancé — détails et chiffres |
|---|---|---|
| 19/01/2026 | (changelog docs) | *Inline batching* : jobs batch créés sans envoyer de fichier. |
| 21/01/2026 | [Heaps do lie](https://mistral.ai/news/debugging-memory-leak-in-vllm/) | Premier « Engineering Deep Dive ». Fuite mémoire dans vLLM avec service désagrégé (prefill/decode, NIXL/UCX) sur Mistral Medium 3.1 ; correctif : `UCX_MEM_MMAP_HOOK_MODE=none`. Renseigne sur l'infrastructure de service interne (vLLM, désagrégation P/D). |
| 22/01/2026 | (presse : Le Monde, Davos) | Arthur Mensch annonce plus d'1 Md€ de chiffre d'affaires d'ici fin 2026 **[Presse]**. |
| 27/01/2026 | [Mistral Vibe 2.0](https://mistral.ai/news/mistral-vibe-2-0/) | Vibe CLI 2.0 : sous-agents personnalisés, demandes de clarification à choix multiples, skills en commandes slash, modes d'agent unifiés, mises à jour automatiques. Inclus dans les plans **Le Chat Pro et Team**, avec facturation à l'usage (PAYG) au-delà ou clé API personnelle (BYOK). **Devstral 2 passe en payant, mais reste gratuit dans le plan « Experiment » de Mistral Studio.** Add-ons entreprise : fine-tuning sur langages internes et DSL, RL dans l'environnement du client, modernisation de code. Changelog : plus de limite de 8 pages pour les annotations de documents. |
| 04/02/2026 | ⭐ [Voxtral Transcribe 2](https://mistral.ai/news/voxtral-transcribe-2/) | Voxtral Mini Transcribe V2 (`voxtral-mini-latest`, 0,003 $/min, diarisation, *context biasing* jusqu'à 100 termes, horodatage par mot, 13 langues, jusqu'à 3 h par requête) et Voxtral Realtime (4B, Apache 2.0, latence réglable sous 200 ms, 0,006 $/min). **Audio playground dans Mistral Studio** : jusqu'à 10 fichiers, diarisation, granularité de l'horodatage, termes de *context bias* ; formats mp3, wav, m4a, flac, ogg, 1 Go maximum par fichier. Endpoint `/v1/audio/transcriptions`. |
| 11/02/2026 | (presse : CNBC) | Plan de 1,2 Md€ pour des datacenters et de la capacité de calcul en **Suède** **[Presse]**. |
| 17/02/2026 | (presse : TechCrunch) | **Première acquisition : Koyeb** (Paris, plateforme serverless fondée en 2020 par trois anciens de Scaleway, 8,6 M$ levés) **[Presse]**. |
| 11/03/2026 | [Rails testing on autopilot](https://mistral.ai/news/rails-testing-on-autopilot-building-an-agent-that-writes-what-developers-wont/) | Blog Applied AI : agent RSpec construit sur Vibe. Un fichier `AGENTS.md` est ajouté automatiquement au prompt système ; un fichier SKILLS par type de fichier ; outils personnalisés (`vibe.core.tools.base.BaseTool` : RuboCop, SimpleCov) ; LLM juge noté de 0 à 1. Sur 275 fichiers : 100 % des tests passent, couverture de 100 %, score qualité de 0,49 à 0,74. |
| 12/03/2026 | ⭐ (changelog docs) | Mistral Moderation 2603. **Custom Guardrails** : paramètre `guardrails` sur un Agent, et champ `guardrails` par requête sur `POST /v1/conversations` et `POST /v1/chat/completions`. |
| 16/03/2026 | [Mistral Small 4](https://mistral.ai/news/mistral-small-4/), [NVIDIA Nemotron Coalition](https://mistral.ai/news/mistral-ai-and-nvidia-partner-to-accelerate-open-frontier-models/), [Leanstral](https://mistral.ai/news/leanstral/) | **Small 4** (`mistral-small-2603` / `mistral-small-latest`) : mixture de 128 experts dont 4 actifs, 119B au total pour 6B actifs, contexte de 256k, texte et image, paramètre `reasoning_effort` (`"none"` / `"high"`), Apache 2.0, 0,15 $/0,6 $. Disponible « via l'API Mistral et AI Studio ». Mistral devient membre fondateur de la Nemotron Coalition de NVIDIA. Leanstral (Lean 4, endpoint Labs gratuit `labs-leanstral-2603`). |
| 17/03/2026 | ⭐ [Introducing Forge](https://mistral.ai/news/forge/) | **Forge** : entraînement de modèles de niveau frontier sur données propriétaires (pré-entraînement, post-entraînement, RL), architectures denses et MoE, multimodal. Conçu d'abord pour être utilisé par des agents : un agent comme Mistral Vibe peut fine-tuner, chercher les hyperparamètres, planifier les jobs et générer des données synthétiques pour améliorer les scores d'évaluation, avec surveillance des régressions. Partenaires : ASML, DSO National Laboratories, Ericsson, ESA, HTX, Reply. Lancé lors de la GTC de NVIDIA selon VentureBeat **[Presse]**. |
| 23/03/2026 | ⭐ [Voxtral TTS](https://mistral.ai/news/voxtral-tts/) | Premier TTS : 4B, 9 langues, adaptation de voix à partir de 3 s de référence, latence modèle de 70 ms, 0,016 $ pour 1 000 caractères (`/v1/audio/speech`, `voxtral-mini-tts-latest`, `voxtral-tts-2603`), poids sous licence CC BY-NC 4.0. **Test dans le playground de Mistral Studio** : voix « Mistral Voices » (US, UK, FR) ou enregistrement de sa propre voix. |
| 30/03/2026 | (presse : Reuters, CNBC) | **Premier financement par dette : 830 M$** auprès de 7 banques (BNP Paribas, Crédit Agricole CIB, HSBC, MUFG…) pour 13 800 GPU NVIDIA (GB300) dans un datacenter de **Bruyères-le-Châtel** (44 MW, mise en service prévue au 2e trimestre 2026). Objectif de 200 MW en Europe fin 2027 **[Presse]**. |
| 31/03/2026 | [Spaces CLI](https://mistral.ai/news/spaces/) | Outil interne des équipes Applied AI pour créer, développer et déployer des applications. Génère `context.json` et `AGENTS.md` ; mode sans interface (`-y`) ; déploiement sur Koyeb. |
| 07/04/2026 | (page /about) | « European AI playbook » : livre blanc de politique publique présenté à Bruxelles ([europe.mistral.ai/whitepaper.pdf](https://europe.mistral.ai/whitepaper.pdf)). |
| 27/04/2026 | ⭐⭐ [Workflows](https://mistral.ai/news/workflows/) | **Workflows en public preview** (fiche au § 3.3.6). |
| 28–29/04/2026 | ⭐ [Remote agents in Vibe + Mistral Medium 3.5](https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/) | Date retenue d'après le changelog des docs (28/04), le post LinkedIn de Mistral (29/04) et Futurum ; le blog affiche le 22/05/2026 (cf. § 8). **Medium 3.5** (`mistral-medium-3-5` / `mistral-medium-latest`) : 128B dense, 256k, fusion instruction/raisonnement/code, licence MIT modifiée, auto-hébergeable sur 4 GPU, 77,6 % sur SWE-Bench Verified, **1,5 $/7,5 $**. Devient le modèle par défaut de Le Chat et de Vibe CLI. **Agents distants de Vibe** dans un bac à sable cloud, lancés depuis le CLI ou Le Chat, avec téléportation d'une session locale vers le cloud. Mistral écrit utiliser des **Workflows orchestrés dans Mistral Studio** pour amener Vibe dans Le Chat. **Work mode** (preview). |
| 22/05/2026 | ⭐⭐ [Connectors in Studio](https://mistral.ai/news/connectors/) | **Connecteurs intégrés et MCP personnalisés dans Studio** (public preview) ; fiche au § 3.3.7. |
| 23/05/2026 | [Emmi joins Mistral](https://mistral.ai/news/accelerate-ai-native-industry/) | Acquisition d'**Emmi AI** (Autriche, « physics AI », plus de 30 chercheurs et ingénieurs). |
| 27/05/2026 | [Physics AI](https://mistral.ai/news/introducing-physics-ai-at-mistral/), [research](https://mistral.ai/news/physics-ai-research/) | Offre d'IA pour l'ingénierie industrielle (partenaires ASML, Airbus, Safran, Siemens Energy). La plateforme d'entreprise y est décrite ainsi : modèles, chaînes d'entraînement et de personnalisation, outils de conception, d'orchestration et de supervision de workflows d'IA, agent unifié, infrastructure privée, services. |
| 28/05/2026 | ⭐ [Vibe gets to work](https://mistral.ai/news/vibe-agent/) | **Le Chat devient Vibe** (fiche au § 3.3.8). Plans : Free, Pro 14,99 $/mois, Team 24,99 $/utilisateur/mois, Enterprise. Studio y est cité pour « construire via l'API », avec le plan Experiment gratuit. |
| 28/05/2026 | ⭐ [Search Toolkit](https://mistral.ai/news/search-toolkit/) | **Search Toolkit** (public preview, open source) ; fiche au § 3.3.9. |
| 28/05/2026 | [AI Now Summit 2026](https://mistral.ai/news/ai-now-summit-2026/) | Premier sommet client (Carrousel du Louvre). Pile « Mistral for Industrial Engineering » ; partenariats Airbus, BMW (*Large Industry Model*), ASML ; **datacenter d'inférence des Ulis (Essonne), 10 MW, ouverture prévue au 3e trimestre 2026**. |
| 16/06/2026 | (presse : LinkedIn / Le Monde Informatique) | Arrivée de **Brian Hall** (passé par Microsoft, AWS et Google Cloud) comme directeur marketing **[Presse]**. |
| 23/06/2026 | ⭐ [Mistral OCR 4](https://mistral.ai/news/ocr-4/) | Boîtes englobantes, classification des blocs, scores de confiance ; 170 langues ; un seul conteneur pour l'auto-hébergement. API à 4 $ pour 1 000 pages (2 $ en batch) ; **Document AI dans Mistral Studio à 5 $ pour 1 000 pages** (sans code ; même endpoint avec paramètres supplémentaires, la structuration JSON étant confiée à `mistral-small-2603`). Disponible dans Studio, SageMaker, Microsoft Foundry, et bientôt Snowflake. Changelog : `include_blocks`, `pages` accepte une chaîne de caractères. |
| 24/06/2026 | ⭐⭐ [More control over your connectors](https://mistral.ai/news/more-control-over-connectors/) | Gouvernance des connecteurs (fiche au § 3.3.10) ; annuaire de **plus de 60 intégrations**. |
| 02/07/2026 | [Leanstral 1.5](https://mistral.ai/news/leanstral-1-5/) | 119B dont 6B actifs, Apache 2.0, 587 problèmes sur 672 de PutnamBench. Endpoint Labs `labs-leanstral-1-5`, déprécié le 30/09/2026. |
| 08/07/2026 | [Robostral Navigate](https://mistral.ai/news/robostral-navigate/) | 8B, navigation robotique avec une seule caméra RGB (76,6 % sur R2R-CE dans des environnements inconnus). |
| 09/07/2026 | ⭐⭐ [Prompts and Skills in Studio](https://mistral.ai/news/manage-prompts-and-skills-in-studio/) | Registre de référence des prompts et des skills (fiche au § 3.3.11). |
| 16/07/2026 | (changelog docs) | OCR 4.1 (`mistral-ocr-4-1`), vers lequel pointe `mistral-ocr-latest` ; `confidence_scores_granularity` accepte `"block"`. GA le 31/08/2026. |
| 21/07/2026 | (communiqué Microsoft) | **Extension du partenariat avec Microsoft** : accord de plusieurs milliards de dollars par lequel Microsoft utilise la capacité GPU européenne de Mistral (NVIDIA Vera Rubin). Medium 3.5 et OCR 4 arrivent dans **Microsoft Foundry**, Medium 3.5 dans **Copilot Studio** ; mise sur le marché commune, financement de PoC **[Presse/Microsoft]**. |
| 31/07/2026 | ⭐ (release notes) | Recherche, filtres, favoris, vues partageables par URL, taux d'échec par workflow, *execution search keys* pour les Workflows (public preview). |
| 04/08/2026 | [Shieldstral](https://mistral.ai/news/shieldstral/) | Classifieur de sécurité multimodal de 3B (Apache 2.0) piloté par des politiques en langage naturel ; **entraîné de bout en bout sur Forge**. |
| 11/08/2026 | ⭐⭐ [In-region inference, open models, new compute](https://mistral.ai/news/regional-inference-open-models-new-compute/) | **Regional Endpoints (GA)**, **Priority Tier (public preview)**, **modèles ouverts tiers sur la plateforme** (à commencer par Z.ai GLM-5.2), **European Compute Units** (fiche au § 3.3.12). |
| 20/08/2026 | ⭐ [Agentic Search](https://mistral.ai/news/agentic-search/) | Recherche agentique dans Search Toolkit et **dans les Libraries de Studio et de Vibe** (fiche au § 3.3.9). Release notes : politiques d'expiration des clés API (public preview). |
| 24/08/2026 | [Mistral x HUMAIN](https://mistral.ai/news/mistral-x-humain/) | Collaboration en Arabie saoudite, de l'ordre de plusieurs centaines de millions d'euros (infrastructure, modèles en arabe, cybersécurité, voix). |
| 08/09/2026 | [Series D](https://mistral.ai/news/mistral-makes-sovereign-open-weight-ai-to-frontier/) | **3 Md€ à plus de 21 Md€ post-money**, tour mené par **Samsung Electronics** (co-leads : Scaleup Europe Fund géré par EQT, et PSG Equity). Mistral revendique 20 pays et plus de 125 entreprises clientes, dont Airbus, ASML et HSBC. |
| 09/09/2026 | [Legacy code modernization](https://mistral.ai/news/legacy-code-modernization/) | Applied AI : migration de 40 000 des 300 000 lignes de Fortran 77 d'un simulateur de réservoir vers C++ ; plus de 100 agents Vibe CLI pour la documentation ; harnais de parité numérique. |
| 10/09/2026 | [Cloudera](https://mistral.ai/news/mistral-x-cloudera/) ; ⭐ release notes | Modèles intégrés à la plateforme de données hybride de Cloudera, y compris en environnement isolé (*air-gapped*). Release notes : **gestion des utilisateurs, groupes et rôles dans l'Admin Panel (GA)**. |
| 16/09/2026 | [Mozilla](https://mistral.ai/news/mistral-x-mozilla/) | Firefox Smart Window (bêta) fonctionne avec les modèles de Mistral (rétention zéro). |
| 22/09/2026 | (release notes) | Vibe : fusion de Chat et Work (déploiement progressif à partir du 14/09 ; pour Enterprise à partir du 01/10, sur environ 6 mois), tableurs, Mini App Canvas, Knowledge Base agentique. |
| 28/09/2026 | [Hallo, Deutschland!](https://mistral.ai/news/hallo-deutschland/) | Hub de Munich (IA physique et industrielle ; BMW, Siemens Energy ; soufflerie de la TUM). Objectif de **1 GW de capacité de calcul européenne d'ici 2030**. Changelog : GLM 5.3 en GA. |
| 29/09/2026 | (changelog docs) | Dépréciations : OCR 4.0 (30/09), Leanstral 1.5 (30/09), GLM 5.2 (31/10, remplacé par `zai-glm-5-3`). |
| 06/10/2026 | ⭐ [Mistral Large 4](https://mistral.ai/news/mistral-large-4/) | **Public preview** dans Mistral Studio (« le Chonk ») : environ 1T de paramètres, 52B actifs selon l'annonce (49B selon le billet NVIDIA du 21/10), multimodal, contexte d'1M (changelog), 160 langues ou plus. Entraîné sur 3 800 GPU Grace Blackwell dans les datacenters européens de Mistral. Poids promis pour fin octobre. Prix : 1,36 $/4,18 $, avec −50 % pendant 2 semaines au lancement. Mêmes environnements d'entraînement et de RL que Forge. |
| 09/10/2026 | ⭐ (release notes) | **Managed Deployments** pour Workflows (public preview) ; fiche au § 3.3.6. |
| 15/10/2026 | [Timestral](https://mistral.ai/news/timestral/) | Modèles de fondation pour séries temporelles (5M à 209M paramètres, sur CPU, licence MIT modifiée) ; fine-tuning via Forge ; déploiement on-prem, en VPC ou isolé. |
| 20/10/2026 | ⭐ [Voxtral 3](https://mistral.ai/news/voxtral-3/) | Small Transcribe 3 (0,0040 $/min), Mini Transcribe 3 (0,0035 $/min), Mini Transcribe Realtime 3 (0,008 $/min, moins de 500 ms, détection de fin de tour), Mini TTS 3 (13 $ par million de caractères, 35 langues ou plus) ; clonage « Pro Voice » à partir de 30 min d'audio. **SDK d'agents vocaux basé sur LiveKit** ; **API d'agent vocal à 0,04 $/min (avec Mistral Small 4) ou 0,08 $/min (modèle plus grand)**. Endpoints européen, américain et global. Agents vocaux, transcription, synthèse et clonage testables dans les **playgrounds de Studio**. |
| 21/10/2026 | [AI for Engineering with NVIDIA](https://mistral.ai/news/mistral-nvidia-ai-for-industrial-engineering/) | Large 4 avec CUDA-X, Warp et Omniverse ; benchmarks publics pour l'IA physique et pour les agents de CAE et d'EDA ; ajout d'infrastructure NVIDIA vers l'objectif d'1 GW en 2030. |

### 3.3 Fiches détaillées des annonces « plateforme » et Studio

#### 3.3.1 La Plateforme (11/12/2023 → 24/10/2025)

| Aspect | Détail (source) |
|---|---|
| Lancement | Bêta le 11/12/2023 : 3 endpoints de chat et 1 d'embeddings ; inscription ouverte, montée en capacité progressive, aide de l'équipe commerciale pour qualifier les besoins [Mistral, la-plateforme]. |
| Compatibilité | API calquée sur la spécification de chat d'OpenAI ; clients Python et JavaScript ; un prompt système permet de renforcer la modération [Mistral]. |
| Organisation et facturation | 26/02/2024 : gestion d'organisation, paiement multi-devises (dont le dollar), nouveaux niveaux de service, gestion des membres par un administrateur [Mistral ; changelog]. |
| Personnalisation | 05/06/2024 : fine-tuning serverless (LoRA) ; 24/07/2024 : étendu à Large, Nemo et Codestral ; 07/08/2024 : tous les modèles phares ; 01/08/2025 : fine-tuning possible depuis l'interface, en ne saisissant que le *learning rate* et le nombre d'epochs [Mistral]. |
| Offre gratuite | 17/09/2024 : expérimentation, évaluation et prototypage gratuits ; l'offre commerciale ajoute isolation des données, option de rétention zéro et limites plus élevées [Mistral]. |
| Batch et modération | 06–07/11/2024 : Batch API (−50 %, 1 M de requêtes en cours par workspace) ; Moderation API (9 catégories) [Mistral]. |
| Recentrage du catalogue | 24/07/2024 : versioning AA.MM ; dépréciation progressive des anciens modèles ; les modèles Apache restent disponibles via `mistral-inference` et `mistral-finetune` [Mistral]. |
| Fin de la marque | 23–24/10/2025 : selon VentureBeat, AI Studio fait évoluer La Plateforme, dont le nom est retiré « pour l'instant » [Presse]. Reddit : « La Plateforme now is AI Studio » [Opinion, utilisateur]. Le nom survit dans des identifiants techniques (cf. § 2). |

#### 3.3.2 Agents API (27/05/2025)

- **Raison d'être** : compléter l'API Chat Completion avec un cadre dédié aux cas agentiques (actions, contexte persistant, coordination) ; présentée comme la colonne vertébrale de plateformes agentiques d'entreprise [Mistral].
- **Connecteurs intégrés** : exécution de code (Python en bac à sable), génération d'images (Black Forest Labs FLUX1.1 [pro] Ultra), *Document Library* (documents stockés sur Mistral Cloud, RAG intégré), recherche web (web, sources d'actualité réputées).
- **Outils MCP** : utilisables via le SDK ; démonstrations GitHub, Financial Analyst et Linear (MCP multi-serveurs).
- **Conversations** : avec état. On les démarre soit avec un `agent_id`, soit directement en indiquant le modèle et les paramètres de complétion. Historique structuré en *conversation entries*, reprise et **embranchement** depuis n'importe quel point, streaming à la création comme à la reprise.
- **Orchestration** : agents ajoutés ou retirés dynamiquement ; *handoffs* déclarés entre agents (exemple : un agent financier délègue à un agent de recherche web ou de calcul).
- **Chiffres** : sur SimpleQA, la recherche web fait passer Mistral Large de 23 % à 75 % et Mistral Medium de 22,08 % à 82,32 %.
- **Antécédent** : « Agents » en alpha le 07/08/2024 (changelog : 29/07/2024), exposés dans Le Chat ou par l'API.

#### 3.3.3 Lancement de Mistral AI Studio (24/10/2025)

**Statut** : bêta privée, avec formulaire d'inscription [Mistral] ; disponible à partir du 24/10/2025 dans le cadre d'un programme de bêta privée [Presse, VentureBeat].

**Diagnostic posé par Mistral** : les équipes multiplient les prototypes (copilotes, chats, résumeurs, Q&A interne) mais peu passent en production. Elles ne savent pas suivre l'évolution des sorties entre versions de modèle ou de prompt, reproduire un résultat ou expliquer une régression, surveiller l'usage réel et collecter du retour structuré, évaluer sur des benchmarks métier, fine-tuner en privé et de façon incrémentale, ni déployer des workflows gouvernés. Les prompts sont réglés à la main dans des documents Notion ; les déploiements tournent en scripts ponctuels [Mistral].

**Cinq exigences** citées : évaluation intégrée (benchmarks internes), boucles de retour traçables, provenance et versioning (prompts, modèles, jeux de données, juges), gouvernance (pistes d'audit, contrôles d'accès, frontières d'environnement), déploiement flexible (hybride, VPC, on-prem, migration sans réarchitecture) [Mistral].

| Pilier | Composants annoncés | Détails |
|---|---|---|
| **Observability** | `Explorer` ; `Judges` et `Judge Playground` ; `Campaigns` ; `Datasets` ; `Experiments` ; `Iterations` ; `Dashboards` | Filtrer et inspecter le trafic, constituer des jeux de données, repérer les régressions ; les juges notent les sorties à grande échelle ; les campagnes et jeux de données transforment les interactions de production en jeux d'évaluation ; remonter d'un résultat au prompt, du prompt à sa version, de la version à l'usage réel. |
| **Agent Runtime** | Environnement d'exécution avec état et tolérant aux pannes, **construit sur Temporal** | Comportement cohérent malgré les reprises, les tâches longues et les appels chaînés ; gestion des gros payloads (documents déportés vers un stockage objet) ; génération de **graphes statiques** des chemins d'exécution, auditables et partageables ; chaque exécution émet télémétrie et données d'évaluation vers Observability ; déploiements hybrides, dédiés et auto-hébergés. |
| **AI Registry** | Registre des agents, modèles, jeux de données, juges, outils et workflows | Lignage, propriété et versioning de bout en bout ; contrôles d'accès, politiques de modération, **portes de promotion** avant déploiement ; intégré à Observability (métriques, évaluations) et à l'Agent Runtime (orchestration, déploiement). |

**Ce que la presse a vu en plus** (VentureBeat, Carl Franzen, 23–24/10/2025) [Presse] :
- catalogue de modèles versionné (ouverts, code, multimodaux, transcription). VentureBeat précise que même pour les modèles ouverts, l'utilisateur passe par l'inférence de Mistral et la paie. Le tableau des licences publié par VB contient des erreurs (cf. § 8) ;
- des workflows visibles sur les captures d'écran : `RAGWorkflow`, `RetrievalWorkflow`, `IngestionWorkflow`. Selon VB, le RAG est donc une primitive de production même si le billet n'en parle pas ;
- interface (cf. § 4) : tableau de bord *Create / Observe / Improve*, certains modules marqués « coming soon » ;
- outils activables dans le Playground : Code Interpreter, Image Generation, Web Search, **Premium News** (actualités vérifiées via des partenariats), combinables avec le function calling ;
- quatre modes de déploiement : accès hébergé (paiement à l'usage), clouds tiers, auto-déploiement des modèles Apache 2.0 (TensorRT-LLM, vLLM, llama.cpp, Ollama), auto-déploiement avec support entreprise (modèles ouverts et propriétaires) ;
- sécurité : modèle Mistral Moderation (basé sur Ministral 8B 24.10), garde-fou par prompt système, prompts d'auto-réflexion.

**Ce que dit AI Business** (Graham Hope, 28/10/2025) : le lancement arrive quelques jours après la mise à jour de Google AI Studio ; mêmes outils intégrés ; même choix de déploiement (hébergé, cloud tiers, auto-déploiement) [Presse].

#### 3.3.4 Les playgrounds de Studio (déc. 2025 → oct. 2026)

| Playground | Date | Fonctions annoncées |
|---|---|---|
| Playground de modèles et d'agents | oct. 2025 | Choix du modèle, `temperature`, `max tokens`, outils activables ; inscription avec numéro de téléphone pour recevoir un code d'accès [Presse, VB]. La FAQ Cloud évoque un « agent playground » pour tester les modèles avant de payer [Mistral]. |
| Judge Playground | oct. 2025 | Construire et tester des juges [Mistral]. |
| **Document AI Playground** | 17/12/2025 | Glisser-déposer de PDF ou d'images ; sortie en texte propre ou en JSON structuré ; propulsé par OCR 3, puis OCR 4 (Document AI à 5 $ pour 1 000 pages depuis le 23/06/2026) [Mistral]. |
| **Audio playground** | 04/02/2026 | Voxtral Transcribe 2 : jusqu'à 10 fichiers, diarisation, granularité de l'horodatage, termes de biais de contexte ; mp3, wav, m4a, flac, ogg, 1 Go maximum [Mistral]. |
| **Playground TTS** | 23/03/2026 | Choisir une « Mistral Voice » (américaine, britannique, française) ou enregistrer sa propre voix [Mistral]. |
| Agents vocaux et clonage | 20/10/2026 | Tester agents vocaux, transcription, synthèse vocale et clonage de voix dans les « Studio playgrounds » [Mistral]. |

#### 3.3.5 Forge (17/03/2026)

- **Promesse** : construire des modèles de niveau frontier à partir des connaissances internes (documentation, code, données structurées, historiques opérationnels) [Mistral].
- **Cycle couvert** (page produit) : 1. préparation des données (exemples métier, cas rares, scénarios encadrés par des politiques) ; 2. entraînement (modèles denses ou MoE ; texte, image, audio) ; 3. alignement (RLHF avec distillation, LoRA, SFT, DPO) ; 4. évaluation (alignée sur les KPI, suites de régression, détection de dérive) ; 5. gestion du cycle de vie (tout est versionné, traçabilité, retour arrière) ; 6. inférence (cloud privé, on-prem ou Mistral Compute) [Mistral].
- **Pilotable par des agents** : Mistral Vibe peut fine-tuner, chercher les hyperparamètres, planifier les jobs et générer des données synthétiques ; Forge surveille les régressions sur les benchmarks choisis ; on personnalise un modèle « en anglais courant » [Mistral].
- **Usages internes revendiqués** : Shieldstral entièrement entraîné sur Forge ; Large 4 utilise les mêmes environnements d'entraînement, de personnalisation et de RL ; fine-tuning de Timestral via Forge [Mistral].
- **Traction selon Mistral** (Elisa Salamanca, VentureBeat, 28/04/2026) : deux types de demande. D'une part des modèles entièrement dédiés (par exemple des transformers pour les séries temporelles en finance, ou l'ajout de modalités) ; d'autre part des tâches précises traitées par RL (« Forge RL ») [Presse].
- **Clients cités** : DSO National Laboratories (LLM sur mesure), HTX Singapour (« AI Forge » pour l'entraînement, « AI Studio » pour l'opérationnalisation) [Mistral, témoignages clients].
- **Lecture critique** : selon une tribune du Monde Informatique (23/06/2026), OpenAI et Anthropic peuvent tout construire autour de Forge mais pas Forge lui-même, parce qu'ils ne vendront pas l'indépendance vis-à-vis d'eux [Opinion]. Futurum a publié une analyse intitulée « Mistral Forge Takes Aim at RAG. But Who Actually Needs Custom Models? » [Opinion, titre seul consulté].

#### 3.3.6 Workflows (27/04/2026) et Managed Deployments (09/10/2026)

| Aspect | Détail |
|---|---|
| Statut | **Public preview** (27/04/2026) ; toujours en preview au 21/10/2026 [Mistral ; The Rundown]. |
| Définition | « Couche d'orchestration pour l'IA d'entreprise » apportant durabilité, observabilité et tolérance aux pannes ; **fait partie de Studio** [Mistral]. |
| Écriture | Workflows **écrits en Python** ; le SDK gère les politiques de reprise, le tracing, les délais d'expiration, la limitation de débit et l'humain dans la boucle, par des décorateurs et une configuration d'une ligne ; **SDK v3.0** installable avec `uv add mistralai-workflows` [Mistral]. |
| Humain dans la boucle | `wait_for_input()` : pause sans consommation de calcul, notification du valideur, reprise exacte. Réponse possible depuis Le Chat, un webhook ou toute autre surface connectée [Mistral]. |
| Publication | Chaque workflow peut être **publié dans Le Chat** (aujourd'hui Vibe) pour être déclenché par tout employé ; les métiers les exécutent depuis Le Chat, les ingénieurs les écrivent en code [Mistral]. |
| Observabilité | Chaque branche, reprise et changement d'état est enregistré dans Studio ; chronologie structurée navigable jusqu'aux traces ; **OpenTelemetry natif** [Mistral]. |
| Entreprise | **Workspaces** séparant équipes et projets ; **RBAC** [Mistral]. |
| Architecture | Construit sur le moteur d'exécution durable de **Temporal**, étendu par Mistral (streaming, gestion des payloads, multi-tenant, observabilité). **Plan de contrôle chez Mistral** (cluster Temporal, API Workflows, Studio) ; **workers chez le client**, sur son Kubernetes, via un chart Helm séparé, reliés au cluster central par des identifiants sécurisés ; données et logique métier restent dans le périmètre du client [Mistral]. |
| Clients cités | ASML, ABANCA, CMA-CGM, France Travail, La Banque Postale, Moeve. Cas d'usage : libération de cargaisons (logistique maritime), contrôle KYC, tri du support client [Mistral]. Selon Mistral, des **millions d'exécutions par jour** en production [Presse, VB]. |
| Positionnement | Approche « code-first » assumée, contre les constructeurs glisser-déposer jugés incapables de tenir l'échelle des systèmes critiques (Elisa Salamanca, responsable produit) ; exposition de serveurs MCP pour que des agents puissent écrire des workflows [Presse, VB]. |
| Feuille de route annoncée (avril 2026) | 1. version plus gérée, y compris dans le VPC du client ; 2. écriture de workflows par les métiers via Vibe ; 3. garde-fous d'entreprise pour les applications agentiques [Presse, VB]. Le point 1 s'est concrétisé avec **Managed Deployments** (inférence). |
| Évolutions | 22/05/2026 : Vibe dans Le Chat repose sur des Workflows orchestrés dans Studio [Mistral]. 24/06/2026 : Connectors in Workflows (preview), les connecteurs et les comptes à utiliser étant déclarés dans la définition du workflow [Mistral]. 31/07/2026 : recherche et filtres (cf. § 3.2) [Mistral]. |
| **Managed Deployments** (09/10/2026) | Workers exécutés **sur Mistral Cloud** depuis un dépôt GitHub public ou privé (build, mise à l'échelle et cycle de vie gérés) ; actions create, update, stop, start, restart, redeploy et delete depuis AI Studio ou l'API ; authentification des workers par **comptes de service** (et non plus par clés API de workspace, migration automatique au redémarrage) ; **egress réseau bloqué** au build et à l'exécution ; logs de build et de worker dans l'interface. Pendant la preview : **plan payant requis (Pay-as-you-go ou Enterprise) et quota** [Mistral]. |

#### 3.3.7 Connectors in Studio (22/05/2026)

- **Statut** : public preview ; console `https://console.mistral.ai/build/connectors` [Mistral].
- **Ce qui est livré** : connecteurs intégrés **et** MCP personnalisés utilisables via l'API et le SDK dans tous les appels de modèle et d'agent ; **appel direct d'outil** ; **approbation humaine** avant exécution (`requires_confirmation`) ; gestion programmatique (créer, modifier, lister, supprimer des connecteurs ; lister et exécuter leurs outils) ; **registre central** partagé entre Le Chat et AI Studio (Vibe annoncé) ; usage dans la **Conversation API**, la **Completions API** et l'**Agent SDK** [Mistral].
- **Problème visé** : chaque équipe réécrit sa couche d'intégration (documentation d'API, fonctions d'outils, OAuth, rafraîchissement des jetons, pagination défaillante), avec des risques de sécurité, un manque d'observabilité du trafic et des doublons [Mistral].
- **Paramètres visibles dans les exemples** : `name`, `description`, `server` (URL du serveur MCP), `visibility` (valeur montrée : `"shared_workspace"`), `oauth_config` (`client_id`, `scopes`, `redirect_uri`) ; outil de type `connector` avec `connector_id` ; `tool_configuration` avec `include`, `exclude` (par exemple exclure `delete_file`) et `requires_confirmation` [Mistral]. Détail des formes d'API au § 5.
- **Connecteurs intégrés cités** : `github`, `gmail`, `web_search` (outil intégré) ; MCP public d'exemple : DeepWiki (`https://mcp.deepwiki.com/mcp`) [Mistral].

#### 3.3.8 Le Chat devient Vibe (28/05/2026) — lien avec Studio

- **Ce qui change** : un seul agent et une seule licence pour le travail et le code ; conversations, réglages et abonnements transférés. **Work Mode** (web et mobile : plan validé avant exécution, connecteurs, analyse de données, Canvas, tâches planifiées, skills réutilisables), **Code Mode** (`chat.mistral.ai/code`, sessions en bac à sable, en parallèle, déclenchables depuis Slack à partir de juin), extension **VS Code**, mises à jour du CLI (permissions par session `always`/`never`/`ask`, commande `/teleport`) [Mistral]. Même URL, même identifiant (Help Center) [Mistral].
- **Lien avec Studio** : les workflows écrits dans Studio s'exécutent depuis Vibe (la page tarifs liste « Workflows — Run multi-step automations orchestrated from Mistral Studio ») ; les connecteurs sont partagés ; Studio reste la porte d'entrée pour construire par l'API, avec un plan gratuit [Mistral].
- **Suite** : 22/09/2026, fusion de Chat et Work en une seule expérience ; les Skills remplacent les Chat Agents ; les Memories deviennent une Knowledge Base [Mistral, release notes].
- **Lectures externes** : pour Futurum, l'unification sous la marque Vibe est cohérente (la marque était déjà connue des développeurs), mais risque de masquer les différences entre Work et Code ; les acheteurs tiendront davantage à la profondeur d'intégration qu'au nom [Opinion]. The Decoder et mlq.ai y voient un pari sur l'avenir du chatbot en tant qu'agent de travail [Presse/Opinion].

#### 3.3.9 Search Toolkit (28/05/2026) et Agentic Search (20/08/2026)

- **Search Toolkit** (public preview, open source, déployable dans le cloud, on-prem ou en edge) : **ingestion** (parsing, découpage, embeddings ; adaptateurs pour formats personnalisés), **recherche** (BM25, dense, hybride), **évaluation** (rappel, précision, MRR, NDCG ; comparaison de configurations). Interface de configuration commune. Application de démarrage : `uvx copier copy gh:mistralai/search-starter-app …` puis `make setup-vespa`, `make ingest`, `make search` ; Vespa, recherche hybride BM25 + vecteurs, réécriture de requête par LLM, reranking. Client cité : **CMA CGM** (avec Voxtral, détection de fausses informations, alertes en 15 s de bout en bout) [Mistral]. Positionné comme complémentaire des Connectors : recherche indexée d'un côté, données en direct via MCP de l'autre [Mistral].
- **Agentic Search** : boucle de recherche en plusieurs étapes avec cinq outils — `search`, `open`, `navigate`, `read`, `grep` — au-dessus de l'index existant, sans fine-tuning. Disponible dans Search Toolkit et **intégré aux Libraries de Studio et de Vibe**. Chiffres (configuration par défaut, sans réglage) : FinanceBench de 26,7 % à 86 % ; OfficeQA Pro de 6,3 % à 51,9 % (GLM-5.2) ; p90 de latence de 255 s à 154 s ; jusqu'à un tiers de tokens en moins. Testé avec Mistral Medium 3.5 et Z.ai GLM-5.2 [Mistral]. Mistral cite une source tierce selon laquelle GLM-5.2 obtient 41,4 % avec le harnais de Claude Code contre 51,9 % avec celui de Mistral [Mistral, à vérifier].
- **OCR 4** est présenté comme composant d'ingestion de Search Toolkit (23/06/2026) [Mistral].

#### 3.3.10 Plus de contrôle sur les connecteurs (24/06/2026)

| Fonction | Statut | Détail |
|---|---|---|
| Contrôles d'administration enrichis | GA | Accès aux connecteurs défini par workspace ou par organisation (exemple : un workspace finance sans accès web, un workspace d'ingénierie avec outils de développement et internet) ; activation ou désactivation **outil par outil** (exemple : bloquer `delete_file`) [Mistral]. |
| Clés API à portée de connecteur | GA | Une clé atteint soit les connecteurs partagés du workspace seulement, soit aussi les connecteurs privés ; combinée aux **comptes de service**, elle évite qu'un job automatisé agisse au nom de son auteur [Mistral]. |
| Connecteurs multi-comptes | GA | Plusieurs comptes (personnel et professionnel) sur un même connecteur, avec un compte par défaut et un changement par tâche ; chaque compte est stocké et rafraîchi séparément [Mistral]. |
| Connectors Debugger | Public preview | Vérification d'une URL de serveur MCP (et d'identifiants OAuth) en **11 étapes** journalisées, jusqu'à l'ouverture de la session MCP [Mistral]. |
| Connectors in Vibe Code | GA | Commande `/connectors` : choix parmi les serveurs MCP locaux et les connecteurs de workspace approuvés [Mistral]. |
| Connectors in Workflows | Public preview | Déclaration des connecteurs et des comptes dans la définition du workflow ; Studio les résout au lancement ; pas d'identifiants personnels dans l'automatisation [Mistral]. |
| Annuaire | — | **Plus de 60 intégrations**, réparties en catégories : connaissance/données/IA (Atlassian, BigQuery, Box, Google Drive, Notion, SharePoint, Databricks, Snowflake, Supabase…), ML (DeepWiki, Hugging Face, Pinecone, Tavily…), communication (Gmail, Outlook, Slack, Brevo…), opérations (Asana, Linear, HubSpot, Salesforce, ServiceNow…), paiements (Stripe, PayPal, Plaid, Morningstar, Kensho…), BI (Amplitude, Hex…), développement (GitHub, Cloudflare, Netlify, Sentry…), automatisation (n8n, Workato, Zapier…), recherche publique (Data.gouv, PubMed…), médias (Cloudinary, Mermaid…) [Mistral]. La page tarifs annonce « 100+ connectors » dans le plan Free [Mistral] (cf. § 8). |

#### 3.3.11 Prompts & Skills dans Studio (09/07/2026)

- **Constat** : les prompts et les skills sont des actifs de production, mais gérés comme des brouillons (dépôts de code, notebooks, fils Slack, sans propriétaire ni historique) ; les métiers qui en connaissent le mieux le contenu dépendent des ingénieurs pour chaque modification [Mistral].
- **Fonctions** : versions **immuables** ; **comparaison et retour arrière** ; **propriétaire nommé** ; **étiquettes de classification** (exemple : « Production » et « Staging ») ; **journaux d'audit** (qui, quand) ; modification et test immédiats sans passer par la CI ; promotion en production par étiquette, qui peut **déclencher la CI/CD** (par exemple via le SDK dans GitHub Actions) ; visibilité progressive créateur → workspace → organisation [Mistral].
- **Lien avec le reste de Studio** : par Observability, le lignage et la télémétrie relient une sortie de production à la version de l'actif utilisé ; **les skills sont exposés comme serveurs MCP directement depuis Studio** [Mistral].
- Disponible pour les clients de Mistral Studio [Mistral].

#### 3.3.12 Inférence régionale, modèles ouverts tiers, capacité de calcul (11/08/2026)

- **Mistral Regional Endpoints (GA)** : inférence en Europe ou aux États-Unis ; les traitements restent dans la région choisie, sous réserve de transferts limités et encadrés vers des sous-traitants (cf. Trust Center) [Mistral]. FAQ : `api.eu.mistral.ai`, `api.us.mistral.ai`, **surcoût de 10 %**, endpoint global par défaut [Mistral].
- **Mistral Priority Tier (public preview)** : niveaux de service engagés, limites de débit personnalisées, SLA de disponibilité adossé à des pénalités financières (99,9 % selon la page Cloud). Mistral affirme être le seul laboratoire européen à offrir à la fois le choix de la région et un SLA [Mistral].
- **Modèles ouverts tiers** servis par Mistral, sans modification, avec les mêmes contrôles régionaux, en commençant par **Z.ai GLM-5.2** (puis GLM 5.3, 1,4 $/4,4 $) ; calendrier de dépréciation plus court [Mistral]. Citation de soutien : Factory [Mistral].
- **European Compute Units** : engagements pluriannuels d'un groupe d'entreprises, convertis en accès à l'infrastructure de Mistral Compute. Soutiens cités : Amadeus, ASML, Capgemini, Caisse des Dépôts, CMA CGM [Mistral].
- **Lecture presse** : TechCrunch y voit un « subtil changement de stratégie ». Certains critiques ont interprété l'hébergement de modèles chinois comme une transformation en simple fournisseur d'inférence ; Mistral répond en réaffirmant la recherche frontier comme fondation [Presse/Opinion]. Sur CNBC, Arthur Mensch juge la dépendance aux laboratoires chinois faible puisque les données restent chez Mistral, et estime nécessaire de continuer à entraîner ses propres modèles [Presse].

#### 3.3.13 Administration (2026)

- **12/03/2026** : *Custom Guardrails* sur les agents et par requête (cf. § 5) [Mistral, changelog].
- **20/08/2026** : politiques d'expiration des clés API au niveau organisation et workspace, notifications par email, application à la création et à la rotation, clés existantes inchangées (public preview) [Mistral, release notes].
- **10/09/2026 (GA)** : nouvelle interface de gestion des utilisateurs, groupes et rôles dans l'**Admin Panel**. Tableau de bord dédié (réglages, membres, workspaces, clés API) consultable « sans revenir dans Studio » ; groupes à affectation de permissions en masse ; création de workspaces avec membres et rôles ; vues détaillées par utilisateur ; sélecteur d'applications [Mistral].

### 3.4 Les modèles : catalogue chronologique, identifiants, licences, prix

Prix en dollars par million de tokens (entrée / sortie), tels qu'annoncés à la date de l'article ; le prix en cache est indiqué quand il est publié. Source : articles de blog et page `/pricing/api` des docs.

| Date | Modèle | ID(s) API | Architecture / taille | Licence | Prix annoncé | Statut connu au 21/10/2026 |
|---|---|---|---|---|---|---|
| 09/2023 | Mistral 7B | `open-mistral-7b` (ex-`mistral-tiny`) | 7,3B dense | Apache 2.0 | — | Ancien |
| 12/2023 | Mixtral 8x7B | `open-mixtral-8x7b` (ex-`mistral-small`) | MoE, 46,7B dont 12,9B actifs | Apache 2.0 | — | Ancien |
| 12/2023 | Mistral Embed | `mistral-embed` | 1 024 dimensions | Commerciale | — | — |
| 02/2024 | Mistral Large / Small | `mistral-large-2402`, `mistral-small-2402` | — | Commerciale | — | Remplacés |
| 04/2024 | Mixtral 8x22B | `open-mixtral-8x22b` | MoE 141B dont 39B actifs | Apache 2.0 | — | Ancien |
| 05/2024 | Codestral 22B | `codestral-2405` / `codestral-latest` | 22B | MNPL plus licence commerciale | — | Remplacé |
| 07/2024 | Codestral Mamba, Mathstral | `codestral-mamba-2407` | 7,3B | Apache 2.0 | — | — |
| 07/2024 | Mistral NeMo | `open-mistral-nemo-2407` | 12B | Apache 2.0 | 0,15/0,15 (09/2024) | — |
| 07/2024 | Mistral Large 2 | `mistral-large-2407` | 123B | MRL plus licence commerciale | 2/6 (09/2024) | Remplacé |
| 09/2024 | Pixtral 12B, Small v24.09 | `pixtral-12b-2409`, `mistral-small-2409` | 12B / 22B | Apache 2.0 / MRL | 0,15/0,15 ; 0,2/0,6 | Pixtral déprécié |
| 10/2024 | Ministral 3B / 8B | `ministral-3b-latest`, `ministral-8b-latest` | 3B / 8B | Commerciale ; MRL (8B) | 0,04 ; 0,1 | Remplacés par Ministral 3 |
| 11/2024 | Pixtral Large, Large 24.11 | `pixtral-large-latest`, `mistral-large-2411` | 124B | MRL plus licence commerciale | — | Pixtral Large déprécié |
| 01/2025 | Codestral 25.01 | `codestral-2501` | — | Commerciale | — | Remplacé par 25.08 |
| 01/2025 | Mistral Small 3 | `mistral-small-2501` | 24B | Apache 2.0 | — | — |
| 02/2025 | Mistral Saba | `mistral-saba-2502` | 24B | Commerciale | — | — |
| 03/2025 | Mistral OCR | `mistral-ocr-2503` | — | Commerciale | 1 000 pages/$ | Déprécié |
| 03/2025 | Mistral Small 3.1 | `mistral-small-2503` | 24B, contexte 128k | Apache 2.0 | — | — |
| 05/2025 | Mistral Medium 3 | `mistral-medium-2505` | — | Commerciale | 0,4/2 | Remplacé (3.1, puis 3.5) |
| 05/2025 | Devstral Small | `devstral-small-2505` | 24B | Apache 2.0 | 0,1/0,3 | — |
| 05/2025 | OCR 2 | `mistral-ocr-2505` | — | Commerciale | — | — |
| 05/2025 | Codestral Embed | `codestral-embed-2505` | — | Commerciale | 0,15 | — |
| 06/2025 | Magistral Small / Medium | `magistral-small-2506`, `magistral-medium-2506` | 24B / — | Apache 2.0 / commerciale | — | 1.1 (07/2025), 1.2 (09/2025) |
| 06/2025 | Mistral Small 3.2 | `mistral-small-2506` | 24B | Apache 2.0 | — | — |
| 07/2025 | Devstral Small 1.1 / Medium | `devstral-small-2507`, `devstral-medium-2507` | 24B / — | Apache 2.0 / commerciale | 0,1/0,3 ; 0,4/2 | — |
| 07/2025 | Voxtral Small / Mini | `voxtral-small-2507`, `voxtral-mini-2507` | 24B / 3B | Apache 2.0 | dès 0,001 $/min | — |
| 07/2025 | Codestral 25.08 | `codestral-2508` | — | Commerciale | — | — |
| 08/2025 | Mistral Medium 3.1 | `mistral-medium-2508` | — | Commerciale | — | Remplacé |
| 12/2025 | **Mistral Large 3** | `mistral-large-2512` / `mistral-large-latest` | MoE 675B dont 41B actifs | Apache 2.0 | 0,5/1,5 (cache 0,05) | Actif |
| 12/2025 | **Ministral 3** (3B, 8B, 14B) | `ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512` | Denses | Apache 2.0 | 0,1 ; 0,15 ; 0,2 (entrée = sortie) | Actifs |
| 12/2025 | Devstral 2 / Small 2 | `devstral-2512` (= `devstral-medium-latest`), `labs-devstral-small-2512` | 123B dense / 24B | MIT modifiée / Apache 2.0 | 0,40/2 ; 0,10/0,30 (payant depuis le 27/01/2026) | Actifs |
| 12/2025 | Mistral OCR 3 | `mistral-ocr-2512` | — | Commerciale | 2 $/1 000 pages ; annotations 3 $ | Remplacé |
| 12/2025 | Mistral Small Creative | `labs-mistral-small-creative` | — | Labs | — | Labs |
| 02/2026 | Voxtral Mini Transcribe 2 / Realtime | `voxtral-mini-2602` (`voxtral-mini-latest`), `voxtral-mini-transcribe-realtime-2602` | — / 4B | Commerciale / Apache 2.0 | 0,003 $/min ; 0,006 $/min | — |
| 03/2026 | Moderation 2603 | `mistral-moderation-2603` | — | Commerciale | — | Actif |
| 03/2026 | **Mistral Small 4** | `mistral-small-2603` / `mistral-small-latest` | MoE 119B dont 6B actifs, contexte 256k | Apache 2.0 | 0,15/0,6 (cache 0,015) | Actif |
| 03/2026 | Leanstral | `labs-leanstral-2603` | 120B dont 6B actifs | Apache 2.0 | Endpoint gratuit (Labs) | Labs |
| 03/2026 | Voxtral TTS | `voxtral-tts-2603` / `voxtral-mini-tts-latest` | 4B | CC BY-NC 4.0 (poids) | 0,016 $/1 000 caractères | — |
| 04/2026 | **Mistral Medium 3.5** | `mistral-medium-3-5` / `mistral-medium-latest` | 128B dense, contexte 256k | MIT modifiée | 1,5/7,5 (cache 0,15) | Actif |
| 06/2026 | OCR 4.0 → 4.1 | `mistral-ocr-4-0` → `mistral-ocr-4-1` / `mistral-ocr-latest` | — | Commerciale | 4 $/1 000 pages ; Document AI 5 $ | 4.0 retiré le 30/09/2026 |
| 06/2026 | Leanstral 1.5 | `labs-leanstral-1-5` | 119B dont 6B actifs | Apache 2.0 | — | Retiré le 30/09/2026 |
| 08/2026 | Z.ai GLM-5.2 (tiers) | `zai-glm-5-2` | — | Tiers | — | Retrait le 31/10/2026 |
| 08/2026 | Shieldstral | — | 3B | Apache 2.0 | — | — |
| 09/2026 | Z.ai GLM 5.3 (tiers) | `zai-glm-5-3` | — | Tiers | 1,4/4,4 | GA le 28/09/2026 |
| 10/2026 | **Mistral Large 4** | `mistral-large-4` | ~1T, 52B (ou 49B) actifs, multimodal, contexte 1M | Poids ouverts annoncés pour fin octobre | 1,36/4,18 (cache 0,14) ; −50 % pendant 2 semaines | Public preview |
| 10/2026 | Timestral | — | 5M à 209M | MIT modifiée | — | Via Forge / GitHub |
| 10/2026 | Voxtral 3 (Small/Mini Transcribe 3, Realtime 3, Mini TTS 3) | — | Mini = 4B | — | 0,0040 ; 0,0035 ; 0,008 $/min ; TTS 13 $/M caractères | Actifs |

**Tendances observées** (faits publiés) :
- **Licences** : Apache 2.0 au départ (2023) ; MNPL (05/2024) et MRL (07/2024) pour les modèles phares ; retour annoncé à Apache 2.0 pour les modèles généralistes (01/2025) ; licence « MIT modifiée » pour les grands modèles ouverts récents (Devstral 2, Medium 3.5, Timestral). Large 3 et Small 4 sont sous Apache 2.0 [Mistral].
- **Fusion des familles** : Small 4 réunit instruction, raisonnement (Magistral), vision (Pixtral) et code agentique (Devstral) ; Medium 3.5 réunit instruction, raisonnement et code ; `reasoning_effort` est réglable par requête [Mistral].
- **Prix** : baisses fortes en 2024 (−50 à −80 %) ; hausse du haut de gamme en 2026 (Medium 3.5 à 1,5 $/7,5 $ contre 0,4 $/2 $ pour Medium 3) ; Large 3 reste à 0,5 $/1,5 $ [Mistral].

### 3.5 Presse et analyses sur Studio et la plateforme

#### 3.5.1 Couverture du lancement de Studio (octobre 2025)

| Date | Média, auteur | Nature | Points clés |
|---|---|---|---|
| 23–24/10/2025 | [VentureBeat](https://venturebeat.com/ai/mistral-launches-its-own-ai-studio-for-quick-development-with-its-european), Carl Franzen | Presse et opinion | Tendance aux « studios » web pour créer des agents en quelques minutes ; Google AI Studio vise les novices, celui de Mistral l'entreprise ; selon VB, des non-développeurs pourraient construire des applications simples ; modèles européens sur infrastructure européenne, un attrait pour les entreprises inquiètes de la situation politique américaine (opinion) ; catalogue de modèles, RAG intégré, interface, outils, quatre modes de déploiement, modération ; bêta privée. |
| 28/10/2025 | [AI Business](https://aibusiness.com/foundation-models/mistral-reveals-ai-studio-for-enterprise), Graham Hope | Presse | Succède à La Plateforme (décembre 2023) ; arrive quelques jours après la mise à jour de Google AI Studio ; les trois piliers ; outils Code Interpreter, Image Generation, Web Search, Premium News. |
| 28/10/2025 | [Bpifrance Big Média](https://bigmedia.bpifrance.fr/nos-actualites/mistral-ai-lance-sa-plateforme-studio-pour-aider-les-entreprises-a-passer-a-lechelle), Mounia Clément | Presse et opinion | Bêta privée ; valorisation proche de 12 Md€ ; Studio présenté comme plus avancé que la concurrence en gouvernance, observabilité et gestion de workflows complexes (opinion non étayée) ; contexte : expérimentation d'un assistant qualifié SecNumCloud auprès de 10 000 agents publics. |
| 02/12/2025 | [VentureBeat (Mistral 3)](https://venturebeat.com/ai/mistral-launches-mistral-3-a-family-of-open-models-designed-to-run-on) | Presse | Studio décrit comme une composante de la stratégie de plateforme d'entreprise « full stack ». |
| oct. 2025 → 2026 | Blogs et agrégateurs (Medium, FunBlocks, FAUN.dev, Slashdot) | Opinion | Reprises descriptives des trois piliers ; peu d'informations nouvelles. |

#### 3.5.2 Couverture des évolutions (2026)

| Date | Média, auteur | Nature | Points clés |
|---|---|---|---|
| 28/04/2026 | [VentureBeat (Workflows)](https://venturebeat.com/technology/mistral-ai-launches-workflows-a-temporal-powered-orchestration-engine-already-running-millions-of-daily-executions), Michael Nuñez | Presse et interview | Entretien avec **Elisa Salamanca (responsable produit)**. Écart avant tout opérationnel ; découplage de l'orchestration et de l'exécution ; Mistral n'accède pas aux données du client ; code-first plutôt que glisser-déposer ; millions d'exécutions par jour ; plateforme à trois couches Forge / Workflows / Vibe ; ARR, dette et feuille de route (cf. § 3.3.6 et 3.7). VB juge la différenciation solide (intégration verticale, séparation des plans, souveraineté) et les défis réels (écosystèmes plus vastes chez OpenAI et Anthropic, infrastructure contrôlée par les hyperscalers, cycles de vente longs). |
| 30/04/2026 | [Developpez.com](https://intelligence-artificielle.developpez.com/actu/382744/) | Presse (FR) | Reprise du lancement de Workflows (Temporal, `wait_for_input`). |
| 28–29/05/2026 | [Futurum Group](https://futurumgroup.com/insights/mistral-ai-shifts-to-full-stack-strategy-with-vibe-and-industrial-ai/), Nick Patience (VP, AI Platforms) | **Analyste** | Récit de plateforme plus cohérent qu'auparavant, mais d'importantes questions d'exécution ; objectif d'1 Md€ de revenus en 2026 contre 200 M€ en 2025 ; atouts de souveraineté (infrastructure européenne native, pas d'exposition au CLOUD Act, option on-prem) ; pari vertical sur l'industrie plus défendable que la course aux benchmarks ; puces maison seulement « exploratoires » ; écart de revenus avec OpenAI et Anthropic ; points à surveiller : conversion des partenariats Airbus, BMW et ASML, adoption de Vibe Work, ouverture des Ulis, riposte des clouds souverains d'AWS, Azure et Google. |
| 29/05/2026 | [Koen van Gilst](https://koenvangilst.nl/lab/mistral-ai-now-summit) (blog, 466 points sur HN) | Témoignage | Mistral n'est plus seulement un éditeur de modèles : calcul (datacenter de 40 MW à Paris, Suède), modèles, plateformes, conseil ; messages centrés sur les partenariats plutôt que sur l'innovation technique (« décevant ») ; « le harnais fait tout » ; BNP Paribas en on-prem pour le KYC en Belgique ; Abanca orchestre des agents pour plus d'un million de clients ; Voxtral utilisé dans Alexa+ en Europe. |
| 28/05/2026 | mlq.ai, The Decoder | Presse | Le Chat devient Vibe ; pari sur l'avenir de l'assistant en tant qu'agent de travail. |
| 23/06/2026 | [Le Monde Informatique](https://www.lemondeinformatique.fr/actualites/lire-mistral-a-t-il-deja-perdu-ou-compris-ou-se-repositionner-%C2%A0-100528.html) (tribune traduite) | **Opinion** | Mistral « nettement distancé » dans la course aux LLM ; mais l'argument du contrôle devient concret (selon Reuters et Axios, en juin 2026, le gouvernement américain a fait suspendre l'accès d'étrangers aux modèles les plus avancés d'Anthropic) ; Studio vu comme une infrastructure de gouvernance « ennuyeuse », compliment en informatique d'entreprise ; Mistral ressemble davantage à une entreprise d'infrastructure ; trois choses à prouver (le contrôle doit peser sur les achats, la spécialisation doit l'emporter, et Mistral doit s'implanter avant qu'OpenAI et Anthropic deviennent à leur tour « ennuyeux »). |
| 28/08/2026 | [The Rundown AI](https://www.therundown.ai/tools/mistral-ai-studio) | Revue (« indépendante ») | Studio convient aux équipes techniques, pas aux non-développeurs qui veulent un chatbot simple ; plans et crédits (cf. § 6) ; atouts : couverture de bout en bout, workflows durables, déploiements flexibles, prix publiés, SOC 2 Type II et ISO 27001/27701 ; limites : expertise requise, coût composite, Workflows en preview, données du plan Free utilisables pour l'entraînement sauf refus, ZDR restreint, modèles Labs et Preview hors opt-out ; verdict : plateforme crédible pour les équipes engagées dans l'écosystème Mistral. |
| 08/09/2026 | [TechCrunch](https://techcrunch.com/2026/09/08/mistral-raises-e3b-as-sovereign-ai-becomes-big-business/), Anna Heim ; [CNBC](https://www.cnbc.com/2026/09/08/mistral-ai-funding-valuation-samsung.html), Arjun Kharpal | Presse | Série D ; Mistral ne veut pas construire un ChatGPT européen ; stratégie commerciale tournée vers les gouvernements et les grandes entreprises ; modèles tiers (dont chinois) ; Emmanuel Macron évoque une « troisième voie » ; partenariat Microsoft élargi ; capacité de calcul possédée en forte hausse ; ARR attendu au-dessus d'1 Md$. |

#### 3.5.3 Critiques et réserves publiées (synthèse)

| Critique | Source | Nature |
|---|---|---|
| Retard sur la course aux modèles frontier ; écart de revenus d'environ un ordre de grandeur avec OpenAI et Anthropic | Futurum (29/05/2026) ; Le Monde Informatique (23/06/2026) | Opinion d'analyste et tribune |
| Le statut preview de Workflows impose de vérifier les engagements de support ; coût total composite (plan, API, stockage, outils, infrastructure) | The Rundown (28/08/2026) | Opinion |
| Protection des données inégale : plan Free utilisable pour l'amélioration des modèles sauf refus ; ZDR seulement sur demande et pour les endpoints sans état ; modèles Labs et Preview exclus des opt-out | The Rundown (d'après les conditions de Mistral) | Fait rapporté (à vérifier dans les CGU, cf. chapitres juridiques) |
| Risque de marque : « Vibe » recouvre deux produits différents | Futurum | Opinion |
| Endettement : Mistral n'a jamais porté un tel levier ; risque si les cycles de vente ralentissent | Pradeep Sanyal dans Data Center Knowledge (30/03/2026) | Opinion |
| Hébergement de modèles chinois perçu comme un virage vers le simple fournisseur d'inférence | Critiques citées par TechCrunch (08/09/2026) | Opinion rapportée |
| Écosystème développeurs plus petit, hyperscalers maîtres de l'infrastructure, cycles de vente longs | VentureBeat (28/04/2026) | Opinion |
| Sommet client centré sur les partenariats plutôt que sur les nouveaux modèles | Koen van Gilst (29/05/2026) | Opinion |
| Nommage des modèles confus ; limites de débit et délais d'expiration (Medium 3.5 en usage agentique), erreurs 429 sur l'API gratuite | Fils HN (mars 2026) et Reddit r/MistralAI (2026) | Témoignages d'utilisateurs |
| Écart de qualité avec les modèles fermés reconnu par Mistral elle-même (Claude Sonnet 4.5 « significativement préféré » à Devstral 2 en évaluation humaine) | Mistral (09/12/2025) | Fait publié par l'éditeur |
| Reproduction de textes protégés (Mixtral : 22 % des réponses dans un test de Patronus AI, mars 2024) | Wikipedia | Fait rapporté |
| Erreurs de presse sur les licences des modèles du catalogue (tableau de VentureBeat, oct. 2025) | Constat de la rédaction | Fait (cf. § 8) |

### 3.6 Clients cités comme utilisateurs de Studio ou de ses briques

Studio étant récent, rares sont les clients qui citent explicitement « Studio ». Le tableau distingue donc l'usage explicite de Studio, l'usage d'une brique de Studio et l'usage de la plateforme Mistral en général.

| Client | Ce qui est cité | Lien avec Studio | Source |
|---|---|---|---|
| **HTX** (Home Team Science and Technology Agency, Singapour) | Plateforme Mistral : « AI Forge » pour l'entraînement sur données propriétaires, « AI Studio » pour l'opérationnalisation ; partenariat depuis mars 2025 ; déploiement on-prem sur leur infrastructure NGINE | **Explicite** | Témoignage client sur mistral.ai/customers/htx [Mistral] |
| ASML, ABANCA, CMA-CGM, France Travail, La Banque Postale, Moeve | Utilisent Workflows pour automatiser des processus critiques | Brique (Workflows) | Blog Workflows (27/04/2026) [Mistral] |
| Clients anonymes : un transporteur maritime (cargaisons), une institution financière (KYC), une banque (support) | Cas de Workflows ; « millions d'exécutions par jour » | Brique | Blog et VentureBeat [Mistral/Presse] |
| CMA CGM | Search Toolkit avec Voxtral (détection de fausses informations) ; déploiement auprès de milliers d'employés (Rodolphe Saadé) ; partenariat de 100 M€ sur 5 ans (avril 2025, selon Bpifrance) | Brique / plateforme | [Mistral ; Presse] |
| Rogo ; Anaqua | OCR 4 (Rogo : précision équivalente pour un coût environ 8 fois moindre et une latence environ 17 fois moindre ; Anaqua : environ 4 fois plus rapide) | Brique (Document AI / OCR) | Blog OCR 4 [Mistral] |
| Factory | Modèles ouverts servis sous contrôles régionaux | Plateforme / inférence | Blog du 11/08/2026 [Mistral] |
| Abanca | Mistral Code hybride (2025) ; orchestration d'agents pour plus d'un million de clients de l'application (2026) | Plateforme | Blogs Mistral ; Koen van Gilst |
| BNP Paribas | Modèles on-prem pour le KYC (Belgique) | Plateforme | Koen van Gilst [Témoignage] |
| SNCF ; Capgemini | Mistral Code (4 000 développeurs ; plus de 1 500 développeurs) ; modernisation de code Java | Plateforme | [Mistral] |
| Cisco | « AI Renewals Agent » (fine-tuning avec l'équipe Applied AI, déploiement sur le cluster GPU de Cisco) | Applied AI | Témoignage client [Mistral] |
| SAP | Chatbot pour la migration SBB (Mistral Large hébergé par SAP) ; agent « Accounting Accruals » | Modèles et partenariat | Témoignage client [Mistral] |
| DSO National Laboratories | LLM sur mesure avec Forge | Forge | Témoignage client [Mistral] |
| Microsoft (en tant que client de capacité) | Utilisation de la capacité GPU européenne de Mistral | Compute | Communiqué Microsoft (21/07/2026) |
| Mistral elle-même | Vibe dans Le Chat construit avec des Workflows orchestrés dans Studio ; Shieldstral construit sur Forge | Usage interne | [Mistral] |

### 3.7 L'entreprise : faits utiles

#### 3.7.1 Identité et fondateurs

| Élément | Fait | Source |
|---|---|---|
| Raison sociale, siège | Mistral AI SAS, Paris | Wikipedia (révision du 12/10/2026) |
| Création | Avril 2023 (28/04/2023 selon Wikipedia) ; premier salarié le 05/06/2023 ; 100e salarié le 30/09/2024 | mistral.ai/about ; Wikipedia |
| Fondateurs | **Arthur Mensch** (cofondateur et CEO ; ancien de Google DeepMind), **Guillaume Lample** (cofondateur et Chief Science Officer ; ancien de Meta), **Timothée Lacroix** (cofondateur et CTO ; ancien de Meta) | mistral.ai/about ; Wikipedia |
| Autres dirigeants cités | Elisa Salamanca (responsable produit, VB 04/2026) ; Kamal Brar (SVP Partnerships & Alliances, 09/2026) ; Neil Ashton (VP Computational Engineering, 10/2026) ; Brian Hall (CMO, juin 2026) ; Howard Cohen (relations presse) | VentureBeat ; mistral.ai ; LMI ; Microsoft |
| Implantations | Présence dans **20 pays** (09/2026) ; présence affirmée aux États-Unis, au Royaume-Uni et à Singapour ; bureau en Allemagne (annoncé en 11/2025) puis hub de Munich (09/2026) | Mistral ; Microsoft |
| Effectifs | Environ **400 salariés, dont environ 300 à Paris** (oct. 2025, post LinkedIn relayant le projet d'un nouveau siège parisien prévu pour 1 000 personnes en 2026) **[Presse/Opinion, source secondaire]** ; « 1 000+ » en 2026 selon l'infobox de Wikipedia **[non sourcé primairement]** ; estimation tierce d'environ 350 (juin 2026) **[Estimation tierce]**. Aucun chiffre officiel récent sur mistral.ai. | Post LinkedIn (oct. 2025) ; Wikipedia ; getlatka |
| Mission affichée | Rendre l'IA frontier ouverte à tous ; IA « critique » pour entreprises et gouvernements ; pile complète : modèles, outils développeurs, applications, calcul | mistral.ai/about |

#### 3.7.2 Financement et valorisations

| Date | Tour | Montant | Chef de file / investisseurs | Valorisation | Source |
|---|---|---|---|---|---|
| 13/06/2023 | Seed | 105 M€ | Lightspeed ; Eric Schmidt, Xavier Niel, JCDecaux… | ≈ 240 M€ (FT) | Wikipedia ; /about |
| 11/12/2023 | Série A | 385 M€ | Andreessen Horowitz ; BNP Paribas, Salesforce… | > 2 Md€ | Wikipedia ; /about |
| 26/02/2024 | Investissement stratégique | 16 M$ | Microsoft | — | Wikipedia |
| 11/06/2024 | Série B | 600 M€ | — (non précisé dans les sources consultées) | 5,8 Md€ | Wikipedia ; /about |
| 09/09/2025 | **Série C** | **1,7 Md€** | **ASML** (1,3 Md€, ≈ 11 % du capital) ; DST, a16z, Bpifrance, General Catalyst, Index, Lightspeed, NVIDIA | **11,7 Md€ post-money** | Mistral ; Wikipedia ; Bloomberg via VB |
| 30/03/2026 | **Dette** (1re) | **830 M$** | Consortium de 7 banques (BNP Paribas, Crédit Agricole CIB, HSBC, MUFG…) | — | Reuters ; CNBC |
| 08/09/2026 | **Série D** | **3 Md€** | **Samsung Electronics** ; co-leads Scaleup Europe Fund (EQT ; soutenu par la Commission européenne, Novo Holdings, Santander…) et PSG Equity ; nouveaux : Advent, BlackRock, Grand-Duché de Luxembourg ; anciens : a16z, ASML, Belfius, BNP Paribas CIB, Bpifrance, Carmignac, DST, Eurazeo, General Catalyst, Headline, Hillspire, Index, Korelya, Lightspeed, NVIDIA, Phoenix Court (Solar), Salesforce Ventures | **> 21 Md€ post-money** (≈ 24–24,7 Md$) | Mistral ; CNBC ; TechCrunch ; Wikipedia |

Total levé selon Dealroom : 2,9 Md$ à fin mars 2026, avant la série D (Data Center Knowledge) **[Presse]**. Mistral présente la série D comme le plus gros tour en capital jamais réalisé par une entreprise tech européenne **[Mistral]**.

#### 3.7.3 Chiffre d'affaires et ARR publics

| Date | Indicateur | Valeur | Source |
|---|---|---|---|
| Début 2025 | ARR | ≈ 20 M$ | Arthur Mensch au FT, rapporté par VB et presenc.ai **[Presse]** |
| 2025 (année) | Chiffre d'affaires | ≈ 200 M€ (Futurum) ; ≈ 200 M$ (Bloomberg TV, post) | **[Presse/Analyste]** |
| 22/01/2026 | Objectif | > 1 Md€ de revenus d'ici fin 2026 (Davos, Bloomberg TV) | Le Monde **[Presse]** |
| 02/2026 | ARR | **> 400 M$** (FT) ; objectif > 1 Md$ en fin d'année | VB ; presenc.ai **[Presse]** |
| 04/2026 | Répartition | Environ **60 % des revenus en Europe** | VentureBeat (déclarations publiques de Mensch) **[Presse]** |
| 08/09/2026 | Objectif réitéré | En route pour dépasser 1 Md$ d'ARR avant la fin de l'année, voire le battre si les tendances se confirment | CNBC ; Quartz via presenc.ai **[Presse]** |
| 09/2026 | Clients | Plus de 125 grandes entreprises dans 20 pays | Mistral |

Mistral ne publie pas de comptes détaillés dans les sources consultées. Le FT (cité par TechCrunch) rapporte que ne pas être une entreprise américaine aurait dopé les revenus **[Presse]**.

#### 3.7.4 Stratégie open-weight contre commercial (faits)

1. **2023** : open-weight sous Apache 2.0 comme manifeste, avec des modèles commerciaux optimisés annoncés pour l'on-prem et le VPC en mode « white-box » [Mistral].
2. **2024** : double famille. Apache 2.0 d'un côté ; de l'autre la MNPL (Codestral) et la MRL (Large 2, Pixtral Large), qui autorisent la recherche et imposent une licence commerciale pour la production. Motif avancé : des tiers construisent des produits à forte marge sans contribuer à l'entreprise [Mistral].
3. **2025** : retour annoncé vers Apache 2.0 pour les modèles généralistes ; des modèles commerciaux complémentaires pour la vitesse, le contexte, les domaines spécialisés et la complétion de code [Mistral].
4. **2025-2026** : Large 3, Small 4, Ministral 3 sous Apache 2.0 ; Devstral 2, Medium 3.5 et Timestral sous licence MIT modifiée ; Voxtral TTS sous CC BY-NC ; OCR, Saba et Codestral restent fermés ; Large 4 en preview avec poids promis [Mistral].
5. **Monétisation des modèles ouverts** : même ouverts, les modèles appelés via Studio sont facturés à l'usage de l'inférence Mistral (VB) ; le déploiement commercial en interne peut exiger une licence Mistral (FAQ de la page tarifs : « commercial deployments require a Mistral license ») ; les licences varient selon le modèle et « peuvent changer » (FAQ Cloud) [Mistral/Presse] (cf. § 8).
6. **Justification actuelle** : les poids ouverts comme condition de souveraineté (inspecter, adapter, conserver l'intelligence construite) ; contribution à la Nemotron Coalition de NVIDIA et à l'Open Secure AI Alliance [Mistral].

#### 3.7.5 Mise sur le marché (go-to-market)

- **Cibles** : entreprises et gouvernements des secteurs à fort enjeu (finance, industrie, défense, énergie, secteur public) ; Mistral se défend de vouloir construire un « ChatGPT européen » ; stratégie commerciale centrée sur le contrôle, à la différence d'OpenAI et Anthropic qui vendent plus largement (TechCrunch) [Mistral/Presse].
- **Méthode** : « co-créer des systèmes sur mesure » avec des équipes déployées chez le client (stratèges de déploiement, ingénieurs et scientifiques Applied AI, ingénieurs de déploiement). Quatre modes de déploiement : API serverless hébergée en Europe, capacité dédiée sur Mistral Compute, cloud privé du client, on-prem ou edge [Mistral, /our-method]. Mensch (CNBC) : travailler avec chaque entreprise pour créer des outils sur mesure intégrés à son activité [Presse].
- **Offre en libre-service** : plans Free, Pro, Team et Enterprise partagés entre Vibe, Studio et l'API ; crédits API inclus ; paiement à l'usage [Mistral].
- **Distribution indirecte** : clouds (Azure dès 02/2024 ; Vertex AI, Bedrock, watsonx en 2024 ; SageMaker, NIM ; Microsoft Foundry et Copilot Studio en 07/2026) ; places de marché (Google Cloud Marketplace pour Le Chat Enterprise) ; intégrateurs (Capgemini, premier partenaire intégrateur global ; Accenture) ; partenaires technologiques (Snowflake, SAP, IBM, NVIDIA, Cloudera, Mozilla) [Mistral].
- **Événements et communautés** : hackathons (fine-tuning 2024, MCP 2025), webinaires, premier sommet client (AI Now Summit, 27–28/05/2026) [Mistral].

#### 3.7.6 Partenariats (sélection datée)

| Type | Partenaires et dates |
|---|---|
| Clouds et hyperscalers | Microsoft/Azure (02/2024 ; extension pluri-milliardaire en 07/2026 : Foundry, Copilot Studio, Azure Local, capacité GPU européenne), Google Cloud (07/2024 : Vertex AI ; Mistral est aujourd'hui « partner model » de Gemini Enterprise Agent Platform), AWS (Bedrock, SageMaker), IBM (watsonx), NVIDIA (NeMo, NIM, Nemotron Coalition, ingénierie en 10/2026) |
| Industriels et finance | ASML (investisseur et client), Samsung (investisseur ; Mensch y envisage une collaboration industrielle comparable à celle menée avec ASML, selon CNBC), Airbus, BMW, Siemens Energy, Safran, Stellantis, CMA CGM, BNP Paribas, HSBC, AXA, Orange, TotalEnergies, Veolia… |
| Logiciels | SAP (11/2025), Cloudera (09/2026), Mozilla (09/2026), Snowflake, Harvey, MongoDB, AFP (01/2025) |
| États et secteur public | Programme AI for Citizens ; Ministère des Armées (France) ; MINDEF et HTX (Singapour) ; Luxembourg ; Office européen des brevets ; France Travail ; HUMAIN (Arabie saoudite, 08/2026) ; gouvernement allemand et Bavière (hub de Munich) |
| Acquisitions | Koyeb (02/2026, serverless) ; Emmi AI (05/2026, IA physique) |

#### 3.7.7 Infrastructure (Mistral Compute / Cloud)

| Élément | Fait | Source |
|---|---|---|
| Chronologie | Concept validé en avril 2025 ; présentation publique en juin 2025 (GTC Paris, VivaTech) ; racks GB200 en juillet 2025 ; GB300 en décembre 2025 ; GB200 en production en février 2026, site suédois (EcoDataCenter) lancé ; premiers clients externes en mars 2026 | mistral.ai/cloud |
| Bruyères-le-Châtel (Essonne) | Site choisi en février 2025 ; 13 800 GPU GB300 ; 44 MW ; mise en service prévue au 2e trimestre 2026 ; financé par la dette de 830 M$ | Reuters ; CNBC |
| Les Ulis (Essonne) | 10 MW dédiés à l'inférence ; ouverture prévue au 3e trimestre 2026 | Mistral (AI Now Summit) ; Futurum |
| Suède | Plan d'1,2 Md€ (février 2026) | CNBC ; Futurum |
| Objectifs | 200 MW en Europe fin 2027 (Reuters) ; **1 GW en Europe d'ici 2030** (Mistral) ; capacité possédée en forte hausse sur 5 ans, avec à terme une dépendance totale à la capacité construite par Mistral (Mensch, CNBC) | — |
| Large 4 | Entraîné sur 3 800 GPU Grace Blackwell dans les datacenters européens de Mistral ; un déploiement européen opéré de bout en bout par Mistral, indépendamment des autres fournisseurs de services numériques | Mistral |
| Services cloud | Managed Slurm, Managed Kubernetes, applications auto-hébergées ; SSO et SCIM, RBAC aligné sur les comptes Slurm, BYOK (AES-256), isolation réseau EVPN-VXLAN ; observabilité GPU incluse | mistral.ai/cloud/compute |
| Puces | Mensch explore la conception de puces maison ; jugé « exploratoire » par Futurum | Futurum citant CNBC |

#### 3.7.8 Positionnement souveraineté européenne

- **Discours de Mistral** : la souveraineté repose sur quatre couches de contrôle — **Data, Intelligence, Compute, Operations** (/sovereign-ai) ; dans le communiqué de la série D, ces quatre dimensions sont : données dans le périmètre, modèles contrôlables et personnalisables, calcul privé et prévisible, systèmes en production contrôlables et auditables. Mistral se dit la seule entreprise au monde à construire toute la pile (modèles ouverts, infrastructure et calcul, produits) [Mistral].
- **Arguments rapportés par la presse** : pas d'exposition au CLOUD Act (Futurum) ; risque de coupure d'accès par un fournisseur américain devenu concret en juin 2026 (LMI citant Reuters et Axios) ; demande de souveraineté boostant les revenus (FT via TechCrunch) ; Wikipedia décrit Mistral comme principal bénéficiaire de la poussée européenne vers la souveraineté numérique [Presse/Opinion].
- **Limites relevées** : dépendance aux GPU NVIDIA, une tension entre ambition souveraine et réalité de la chaîne d'approvisionnement (Data Center Knowledge) ; investisseurs et partenaires américains (Microsoft, a16z, NVIDIA, BlackRock…) ; présence de modèles chinois sur la plateforme [Presse/Opinion].
- **Mesures concrètes** : Regional Endpoints UE/US, Priority Tier, ZDR sur demande, déploiement on-prem ou isolé, ECUs, datacenters en France et en Suède, ACV environnementale publiée (Carbone 4, ADEME) [Mistral].

### 3.8 Paysage concurrentiel des plateformes comparables

#### 3.8.1 Calendrier des plateformes d'agents gérées (d'après ibl.ai, 24/09/2026, et les annonces des éditeurs)

| Éditeur | Produit(s) | Date clé |
|---|---|---|
| Mistral | Agents API → **Studio** (Observability, Agent Runtime, AI Registry) → Workflows, Connectors | 27/05/2025 → **24/10/2025** → 27/04/2026, 22/05/2026 |
| OpenAI | **AgentKit** (Agent Builder, Connector Registry, ChatKit, Evals) ; **Frontier** (plateforme d'entreprise) | 06/10/2025 ; **05/02/2026** ; arrêt progressif d'Agent Builder et d'Evals annoncé le 03/06/2026 |
| AWS | **Bedrock AgentCore** | GA le 13/10/2025 ; GovCloud en mai 2026 |
| Microsoft | **Microsoft Foundry** (ex-Azure AI Foundry, renommé à Ignite en novembre 2025, formalisé au 01/01/2026), Foundry Agent Service, **Agent 365**, Copilot Studio | 18/11/2025 (Agent 365) |
| Anthropic | **Claude Platform** / Claude Console ; **Claude Managed Agents** | 08/04/2026 (public beta) |
| Google | **Gemini Enterprise Agent Platform** (évolution de Vertex AI) ; Google AI Studio (côté développeurs) | 22/04/2026 ; mise à jour d'AI Studio en octobre 2025 |
| IBM | **watsonx Orchestrate** (« agent management platform »), watsonx.governance | Agentic Control Plane (juin 2026) ; passerelle multi-cloud (septembre 2026) |
| Dataiku | LLM Mesh, Govern, agents | 2026 |

#### 3.8.2 Comparaison des briques, d'après les sources publiées

| Plateforme | Briques publiées | Modèles | Déploiement / souveraineté | Prix publié de la couche agent | Sources |
|---|---|---|---|---|---|
| **Mistral Studio** | Agents, Conversations, Connectors (MCP, approbations, appel direct), Workflows (Temporal, HITL, OpenTelemetry), Observability (Explorer, Judges, Campaigns, Datasets, Experiments, Dashboards), AI Registry (prompts, skills, versions, lignage), Guardrails, Moderation, Libraries et Agentic Search, playgrounds (OCR, audio, TTS, voix), Admin Panel | Modèles Mistral (ouverts et fermés) et quelques modèles ouverts tiers (GLM) | Hébergé (UE ou US), dédié, hybride, **auto-hébergé** ; workers Workflows **chez le client** (Helm) ou gérés par Mistral ; Regional Endpoints, Priority Tier | Plans Free, Pro, Team, Enterprise plus usage de l'API ; Managed Deployments réservés aux plans payants ; voice agent à 0,04–0,08 $/min | Mistral ; VB ; The Rundown |
| **OpenAI** (AgentKit / Frontier) | Agent Builder (canvas glisser-déposer et SDK ; arrêt annoncé en juin 2026), Connector Registry (connecteurs et MCP, console d'administration globale), ChatKit, Evals (arrêt annoncé), RFT ; Frontier : contexte métier partagé, onboarding, permissions et gouvernance des agents, y compris d'agents tiers | GPT (OpenAI) | Cloud OpenAI ; Frontier accessible via l'équipe commerciale au lancement | n.d. dans les sources | openai.com ; digitalapplied ; inkeep ; happyrobot |
| **Anthropic** (Claude Platform / Managed Agents) | Harnais géré, bac à sable, sessions longues, mémoire, permissions, exécution planifiée et coffres d'identifiants, multi-agents et « outcomes » (research preview), tracing dans la Claude Console ; bacs à sable auto-hébergés et tunnels MCP (ajouts ultérieurs) | Claude | Cloud Anthropic ; exécution possible dans le périmètre du client (bacs à sable auto-hébergés) | **0,08 $ par heure de session active** plus les tokens | claude.com ; ibl.ai |
| **Google** (Gemini Enterprise Agent Platform) | Agent Studio, Agent Runtime, Agent Sandbox, Agent Memory Bank, Agent Identity, **Agent Registry**, Agent Gateway ; ADK open source ; diffusion via l'application Gemini Enterprise | **Plus de 200 modèles** (Model Garden), dont Gemini, Gemma, Claude… **et Mistral** | Cloud Google | n.d. | cloud.google.com ; ibl.ai ; Alice Labs ; docs Google |
| **AWS** (Bedrock AgentCore) | Runtime, Gateway, Memory, Browser, Code Interpreter, Identity, Observability ; agnostique en matière de frameworks (LangGraph, CrewAI, Claude Agent SDK, Strands) | Catalogue Bedrock (Claude, Llama, **Mistral**, Nova, Cohere, DeepSeek…) | Cloud AWS, VPC et PrivateLink, GovCloud | Facturation par invocation plus tokens, sans frais par siège | ibl.ai ; Alice Labs |
| **Microsoft** (Foundry / Agent 365 / Copilot Studio) | Foundry Agent Service (Hosted Agents, workflows multi-agents, mémoire, publication vers M365 et Agent 365), Foundry IQ (RAG), Agent 365 (registre, accès fondés sur le risque, Entra, Purview, Defender), Copilot Studio (création low-code) ; Foundry Local | OpenAI, Anthropic, Llama, DeepSeek… **et Mistral** (Medium 3.5, OCR 4) | Azure, Azure Local connecté ou totalement déconnecté ; Sovereign Cloud | M365 Copilot à 30 $ par utilisateur et par mois ; Copilot Studio facturé au message | Microsoft ; ibl.ai ; Alice Labs |
| **IBM** (watsonx Orchestrate) | Couche de contrôle multi-plateforme : découverte et import d'agents d'AgentCore, Foundry et Gemini ; Agent Identity ; LLM juges personnalisés ; AgentOps ; watsonx.governance (EU AI Act, ISO 42001, NIST AI RMF) | Multi-modèles | Multi-cloud et on-prem (OpenShift) ; FedRAMP | n.d. | ibm.com ; infralovers ; Kosmoy |
| **Dataiku** | LLM Mesh (passerelle gouvernée multi-fournisseurs : coût, performance, sécurité, audit), Govern (EU AI Act), agents | Multi-fournisseurs | Agnostique en matière de cloud, on-prem | n.d. | dataiku.com ; Kosmoy |

#### 3.8.3 Ressemblances et différences, d'après les sources

**Ressemblances (convergence du marché)**
- Les listes de fonctionnalités des plateformes gérées convergent presque ligne à ligne : mêmes primitives, cinq plans de contrôle différents **[Opinion, ibl.ai]**. Studio partage ces primitives : runtime d'agent, mémoire et état, connecteurs et MCP, bac à sable de code, observabilité, évaluation par juges, registre, identité et permissions (inférence d'après les listes ci-dessus).
- Le **registre** est devenu une brique commune : AI Registry chez Mistral (10/2025), Agent Registry chez Google (04/2026), registre d'Agent 365 chez Microsoft (11/2025), inventaire multi-cloud chez IBM (2026) (inférence par comparaison des annonces).
- L'**évaluation par LLM juge** existe chez Mistral (Judges), OpenAI (Evals, en cours d'arrêt), IBM (Custom LLM as a Judge) et dans les « outcomes » d'Anthropic (inférence par comparaison des annonces).
- L'**exécution durable** : Mistral s'appuie sur Temporal, qui propose aussi une intégration officielle à l'OpenAI Agents SDK (VB) **[Presse]**.

**Différences mises en avant par la presse et les analystes**
- **Déploiement et contrôle de l'exécution** : Workflows sépare le plan de contrôle (chez Mistral) de l'exécution (chez le client), de sorte que les données ne quittent pas le périmètre du client **[Presse, VB]**. Selon ibl.ai, aucune plateforme gérée ne livre le code source de l'orchestration ni ne garantit des données de bout en bout chez le client ; Anthropic s'en approche avec ses bacs à sable auto-hébergés, l'orchestration restant chez Anthropic **[Opinion]**. Mistral propose en plus le déploiement auto-hébergé ou isolé de toute la pile (modèles, Le Chat/Vibe, Mistral Code) **[Mistral]**.
- **Intégration verticale** : Workflows est natif de Studio (modèles, agents, connecteurs, observabilité conçus ensemble), ce qui évite le coût d'intégration entre outils disparates **[Opinion, VB]**.
- **Code-first** : Mistral ne propose pas de constructeur glisser-déposer pour Workflows **[Presse, VB]**, à la différence de l'Agent Builder d'OpenAI (canvas) et de Copilot Studio (low-code) **[Presse : inkeep, Elementum]**. OpenAI a annoncé l'arrêt progressif d'Agent Builder le 03/06/2026 **[Fait, openai.com]**.
- **Modèles** : Studio est centré sur les modèles Mistral, avec une ouverture récente à des modèles ouverts tiers. Les hyperscalers proposent des catalogues de 100 à plus de 200 modèles, **dont ceux de Mistral** : Mistral est à la fois concurrent et fournisseur de Bedrock, Gemini Enterprise Agent Platform et Foundry **[Presse : comparatifs Bedrock/Vertex/Foundry ; docs Google]**.
- **Souveraineté européenne** : infrastructure européenne, poids ouverts, pas d'exposition au CLOUD Act **[Opinion, Futurum ; VB]**. Les hyperscalers répondent avec leurs propres clouds souverains (AWS European Sovereign Cloud, Microsoft Sovereign Cloud, S3NS de Thales et Google), ce que Futurum classe parmi les points à surveiller **[Opinion]**. Microsoft intègre d'ailleurs les modèles de Mistral à son offre souveraine **[Fait]**.
- **Échelle** : OpenAI et Anthropic disposent d'écosystèmes de développeurs bien plus vastes et de revenus d'un autre ordre (ARR d'OpenAI d'environ 20 Md$ en 2025 ; Anthropic attendu à environ 10,9 Md$ de revenu au 2e trimestre 2026, selon Futurum) **[Opinion/Presse]**. Les grands laboratoires investissent aussi la couche services : coentreprise d'Anthropic avec Blackstone, H&F et Goldman (04/05/2026) ; OpenAI Deployment Company (11/05/2026) **[Presse, via ibl.ai]**, là où Mistral mise sur ses équipes Applied AI.
- **Gouvernance** : selon Dataiku (éditeur concurrent), la gouvernance est désormais le vrai facteur de différenciation ; 74 % des 600 DSI interrogés regrettent au moins un choix de fournisseur ou de plateforme IA fait dans les 18 derniers mois **[Opinion/étude d'un concurrent]**. Le Monde Informatique voit dans l'AI Registry de Studio l'infrastructure de gouvernance attendue par l'informatique d'entreprise **[Opinion]**.
- **Studio contre Google AI Studio** (homonymie) : selon VentureBeat, Google AI Studio vise les novices et le « vibe coding », Mistral AI Studio l'entreprise ; The Rundown cite Google AI Studio, OpenAI Frontier et n8n comme alternatives à Mistral Studio **[Opinion]**.
- **Absence des classements** : Mistral Studio ne figure pas dans plusieurs classements 2026 des plateformes d'agents d'entreprise (Alice Labs, MightyBot, Dataiku, monday.com), qui retiennent Copilot Studio, AgentCore, Vertex/Gemini, OpenAI Frontier, Agentforce, ServiceNow, watsonx Orchestrate, UiPath… **[Constat de la rédaction sur les sources consultées]**.

---

## 4. Interface utilisateur (ce que révèlent annonces et presse)

L'interface elle-même est décrite dans les autres chapitres, à partir de la documentation. Ici ne figurent que les éléments d'interface **révélés par les annonces et la presse**, avec leur date.

| Date | Élément d'interface | Source |
|---|---|---|
| 09/2024 | Point d'entrée de La Plateforme : `console.mistral.ai` (inscription à l'offre gratuite) | Mistral |
| 08/2025 | Fine-tuning depuis l'interface de La Plateforme : seuls le *learning rate* et le nombre d'epochs sont saisis, la taille de batch est calculée | Mistral (blog satellite) |
| 10/2025 | **Studio au lancement** : barre de navigation à gauche et Playground au centre. L'accueil propose trois zones d'action, **Create**, **Observe**, **Improve** ; Create ouvre le Playground (tester des prompts, créer des agents) ; Observe et Improve mènent à l'observabilité et à l'évaluation, certains modules étant marqués « coming soon ». Le menu de gauche donne accès à **API Keys, Batches, Evaluate, Fine-tune, Files, Documentation**. Dans le Playground : choix du modèle, `temperature`, `max tokens`, outils activables (Code Interpreter, Image Generation, Web Search, Premium News). Essai gratuit, mais inscription avec un **numéro de téléphone** pour recevoir un code d'accès. URL : `console.mistral.ai/build/playground` | VentureBeat (captures d'écran) |
| 10/2025 | Vocabulaire des modules : `Explorer`, `Judges`, `Judge Playground`, `Campaigns`, `Datasets`, `Experiments`, `Iterations`, `Dashboards` ; graphes statiques d'exécution des agents | Mistral |
| 12/2025 | **Document AI Playground** (glisser-déposer, sortie en texte ou en JSON) | Mistral (OCR 3) |
| 02/2026 | **Audio playground** (10 fichiers maximum, réglages de diarisation, d'horodatage et de *context bias*) | Mistral (Voxtral Transcribe 2) |
| 03/2026 | **Playground TTS** (Mistral Voices ou enregistrement de sa propre voix) | Mistral (Voxtral TTS) |
| 05/2026 | Console des connecteurs : `console.mistral.ai/build/connectors` | Mistral (Connectors) |
| 06/2026 | Connectors Debugger (vérification en 11 étapes) ; contrôles d'administration par workspace et par outil ; commande `/connectors` dans Vibe Code | Mistral |
| 07/2026 | Vues Workflows : filtres multi-statuts, recherche floue, favoris (étoile), vues partageables (état dans l'URL), taux d'échec par workflow, *execution search keys* | Release notes |
| 07/2026 | Prompts et skills : comparaison de versions, retour arrière, étiquettes « Production » et « Staging », visibilité créateur → workspace → organisation | Mistral |
| 09/2026 | **Admin Panel** distinct de Studio : réglages, membres, workspaces, clés API, groupes, vue détaillée par utilisateur ; sélecteur d'applications entre les produits Mistral. Routes citées dans les docs : `admin.mistral.ai/organization/usage`, `admin.mistral.ai/plateforme/limits` | Release notes ; docs (Usage and limits) |
| 10/2026 | Managed Deployments : création, mise à jour, arrêt, démarrage, redéploiement et suppression depuis AI Studio ; logs de build et de worker dans l'interface | Release notes |
| 10/2026 | Page produit : onglets **Workflows, Connectors, Audio, Agents, OCR, Models** ; rubriques Build / Iterate / Deploy / Govern / Accelerate ; boutons « Try Studio » et « Start building » vers `console.mistral.ai`, « Contact sales » | mistral.ai/products/studio |
| 10/2026 | Suivi de l'usage de l'API dans le **tableau de bord de Mistral Studio** : appels, endpoints, activité par utilisateur ; ventilation des coûts (completion, OCR, fine-tuning) | FAQ de la page tarifs |

---

## 5. API et SDK (ce que révèlent les annonces)

Seuls les éléments d'API **cités dans les annonces** sont repris ici ; les schémas complets relèvent des chapitres de documentation.

### 5.1 Hôtes et endpoints mentionnés

| Méthode / hôte | Chemin | Rôle | Date d'apparition dans les annonces |
|---|---|---|---|
| — | `api.mistral.ai` | Endpoint global facturé au token | 2023–2024 |
| — | `codestral.mistral.ai` | Endpoint Codestral dédié (clé personnelle, hors limites de l'organisation, bêta gratuite de 8 semaines) | 29/05/2024 |
| — | `api.eu.mistral.ai`, `api.us.mistral.ai` | **Regional Endpoints** (+10 %) | 11/08/2026 |
| POST | `/v1/chat/completions` | Chat ; accepte le champ `guardrails` par requête | 2023 ; garde-fous le 12/03/2026 |
| POST | `/v1/conversations` | Conversations (Agents API) ; champ `guardrails` | 27/05/2025 ; 12/03/2026 |
| POST | `/v1/agents` | Création d'agent (exemple avec l'outil `web_search`) | Page Cloud/Inference |
| POST | `/v1/audio/transcriptions` | Transcription (Voxtral) ; paramètres de *context biasing* et `diarize` | 15/07/2025 ; 04/02/2026 |
| POST | `/v1/audio/speech` | Synthèse vocale (Voxtral TTS) | 23/03/2026 |
| — | OCR (`mistral.ocr.process` côté SDK) | OCR et Document AI ; paramètres `table_format`, `extract_header`, `extract_footer`, `include_blocks`, `pages` (chaîne de caractères possible), `confidence_scores_granularity` (`"page"`, `"block"`, `"word"`) | 12/2025 → 07/2026 |
| — | Batch API | Fichier batch, puis *inline batching* sans fichier | 11/2024 ; 19/01/2026 |
| — | Moderation API | Deux endpoints (texte, conversation) | 11/2024 |

### 5.2 Méthodes SDK citées

| Langage | Méthode | Usage cité |
|---|---|---|
| Python (`mistralai`) | `client.chat.complete(model=…, messages=[…])` | Chat (page Inference) |
| TypeScript (`@mistralai/mistralai`) | `client.chat.complete({ model, messages })`, `client.beta.agents.create({…})`, `client.ocr.process({…})` | Page Inference |
| Python | `client.beta.agents.create(model, name, description, instructions, tools=[…])` (aussi en `_async`) | Agents ; outils `{"type": "web_search"}`, `{"type": "connector", "connector_id": …, "tool_configuration": {…}}` |
| Python | `client.beta.conversations.start_async(model=… ou agent_id=…, inputs=…, tools=[…])` | Conversations |
| Python | `client.beta.connectors.create(…)` / `create_async(…)` | Enregistrer un connecteur MCP |
| Python | `client.beta.connectors.call_tool_async(connector_id, tool_name, arguments)` | Appel direct d'un outil |
| Python (`mistralai-workflows`, v3.0) | `wait_for_input()` ; décorateurs (reprises, tracing, délais d'expiration, limitation de débit, HITL) | Workflows (`uv add mistralai-workflows`) |
| Python (Vibe) | `vibe.core.tools.base.BaseTool`, `ToolError` | Outils personnalisés de Vibe CLI (blog Rails) |
| CLI | `curl -LsSf https://mistral.ai/vibe/install.sh \| bash` ; `uv tool install mistral-vibe` ; `vibe --agent lean` ; `~/.vibe/config.toml` (`[[mcp_servers]]` : `name`, `transport`, `command`, `args`, `tool_timeout_sec`) | Vibe CLI |
| CLI | `uvx copier copy gh:mistralai/search-starter-app <dossier>` ; `make setup-vespa`, `make ingest path=…`, `make search query=…` | Search Toolkit |

**Forme d'un connecteur MCP** (reconstitution de la rédaction à partir des noms de paramètres publiés le 22/05/2026 ; les valeurs sont illustratives) :

```python
conn = client.beta.connectors.create(
    name="crm", description="CRM interne",
    server="https://mcp.exemple.internal/crm",      # URL du serveur MCP
    visibility="shared_workspace",
    oauth_config={"client_id": "...", "scopes": ["read"], "redirect_uri": "https://..."},
)
tools = [{"type": "connector", "connector_id": "crm",
          "tool_configuration": {"include": ["search"], "requires_confirmation": ["search"]}}]
```

### 5.3 Paramètres de génération et de sécurité apparus au fil des annonces

| Paramètre | Date | Effet |
|---|---|---|
| `safe_prompt` | ≤ 01/2024 | Garde-fou par prompt système (la doc le nommait par erreur `safe_mode`, corrigé le 11/01/2024). |
| Validation stricte | 11/01/2024 | Les paramètres inconnus sont rejetés avec « Extra inputs are not permitted ». |
| `tool_call_id` | 23/05/2024 | Obligatoire dans les messages de rôle `tool`. |
| Mode JSON, function calling | 26/02/2024 → 28/03/2024 | D'abord limités à Small et Large, puis étendus à tous les modèles. |
| `presence_penalty`, `frequency_penalty`, `n` | 06/11/2024 | Pénalités de répétition ; `n` complétions avec facturation unique des tokens d'entrée. |
| Échelle de `temperature` | 06/11/2024 | Multipliée par 0,43 pour `pixtral-12b`, `ministral-3b-2410`, `ministral-8b-2410`. |
| Custom structured outputs | 28/01/2025 | Sortie selon un schéma JSON pour tous les modèles. |
| `p` dans les chunks de streaming | 27/08/2025 | Bourrage contre une attaque par canal auxiliaire ; peut casser les parseurs stricts (`mistral-common` ≥ 1.8.4 requis). |
| `guardrails` | 12/03/2026 | Garde-fous personnalisés sur un Agent, ou par requête sur conversations et chat. |
| `reasoning_effort` | 16/03/2026 | `"none"` (réponse rapide) ou `"high"` (raisonnement) ; réglable par requête sur Medium 3.5. |

---

## 6. Limites, quotas, tarifs, disponibilité (historique)

### 6.1 Plans et accès

| Date | État de l'offre | Source |
|---|---|---|
| 12/2023 | Bêta, inscription ouverte, montée en capacité progressive | Mistral |
| 02/2024 | Niveaux de service mis à jour ; paiement multi-devises | Mistral |
| 09/2024 | **Offre gratuite** de La Plateforme (expérimentation) ; l'offre commerciale ajoute isolation des données, rétention zéro gratuite en option et limites plus élevées | Mistral |
| 02/2025 | Le Chat Pro à 14,99 $/mois (−50 % pour les étudiants), Team, Enterprise en preview privée | Mistral |
| 10/2025 | Studio en **bêta privée** (inscription) ; Playground gratuit avec vérification par téléphone | Mistral ; VB |
| 01/2026 | Vibe CLI inclus dans Le Chat Pro et Team ; paiement à l'usage au-delà ou BYOK ; **plan « Experiment » gratuit dans Studio** | Mistral |
| 05/2026 | Free ; **Pro 14,99 $/mois** ; **Team 24,99 $/utilisateur/mois** ; Enterprise (déploiements personnalisés, entraînement de modèles, accompagnement dédié) ; API dans Studio avec plan Experiment gratuit | Mistral |
| 08/2026 (au 28/08) | Free : accès à Studio et **10 $/mois de crédits API** ; Pro : **30 $/mois de crédits API** ; Team ; Enterprise | The Rundown **[Presse]** |
| 21/10/2026 | Page tarifs : Free (accès à Studio, plus de 100 connecteurs, 5 tâches planifiées) ; Pro 14,99 $/mois avec crédits API mensuels (**15 $ ou 25,5 $** selon la variante affichée ; offre étudiante à 5,99 $/mois) ; Team 24,99 $/utilisateur/mois (minimum affiché de 50 $/mois, 30 Go par utilisateur, vérification de domaine, export) ; Enterprise (logs d'audit, SAML SSO, marque blanche, Admin API, déploiements personnalisés) ; **dépassement facturé à l'usage au tarif de l'API** | mistral.ai/pricing |

### 6.2 Prix et remises transverses

- **Batch** : −50 % depuis 11/2024 (aussi pour Codestral Embed et OCR). **Tokens d'entrée en cache** : jusqu'à −90 % (FAQ 2026). L'OCR est facturé à la page, l'audio à la minute, les outils à l'appel [Mistral].
- **Regional Endpoints** : +10 % ; **Priority Tier** : SLA de disponibilité de 99,9 % et limites de débit personnalisées (sur devis) [Mistral].
- **Managed Deployments** (preview) : réservés aux plans payants (paiement à l'usage ou Enterprise), avec quota [Mistral].
- **Agent vocal** : 0,04 $/min (avec Small 4) ou 0,08 $/min (modèle plus grand) [Mistral].
- **SLA Enterprise** : 99,5 à 99,9 % de disponibilité selon `llms.txt` (renvoi aux conditions « enterprise service level ») [Mistral].

### 6.3 Quotas et limites cités

- Batch : 1 M de requêtes en cours par workspace (11/2024) [Mistral].
- Codestral via l'endpoint dédié : hors limites de débit de l'organisation (2024) [Mistral].
- Audio playground : 10 fichiers de 1 Go maximum ; transcription jusqu'à 3 h par requête (Transcribe 2) ; *context biasing* jusqu'à 100 termes [Mistral].
- Les limites de débit sont consultables et modifiables dans l'Admin Panel (`admin.mistral.ai/plateforme/limits`) ; une demande de hausse est possible [Mistral, docs].
- Plaintes d'utilisateurs : erreurs 429 sur l'API gratuite, délais d'expiration de Medium 3.5 en usage agentique (Reddit, 2026) [Opinion].

### 6.4 Données, rétention, conformité

- **Pas d'entraînement sur les données de l'API** et **ZDR sur demande** (FAQ Cloud) [Mistral].
- Selon The Rundown, d'après les conditions de Mistral : les organisations au paiement à l'usage sont exclues de l'entraînement par défaut ; les organisations du plan Free peuvent désactiver l'amélioration anonyme dans l'Admin Panel ; le ZDR est limité aux organisations approuvées et aux endpoints sans état (il exclut agents, fichiers, conversations, bibliothèques et batch) ; les modèles **Labs ou Preview** peuvent servir à l'entraînement malgré l'opt-out et le ZDR [Presse].
- Plan Vibe : l'entraînement des modèles est en opt-out sur tous les plans (page tarifs) [Mistral].
- Certifications citées : SOC 2 Type II, ISO 27001 et ISO 27701 (The Rundown) [Presse].
- Régions : API hébergée en UE par défaut (/our-method) ; endpoints UE, US et global ; déploiements sur les hyperscalers (AWS, Azure, Google Cloud), on-prem, isolés (*air-gapped*) [Mistral].

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Nommage changeant (source fréquente de confusion)**
- *La Plateforme* → *Mistral AI Studio* (10/2025) → *Mistral Studio* (depuis 01/2026 environ, inférence d'après l'usage dans les billets) ; « AI Studio » reste employé dans les release notes d'octobre 2026. Les identifiants techniques gardent « plateforme ».
- *Le Chat* → *Vibe* (28/05/2026) ; *Mistral Code* (06/2025) → intégré à Vibe (« later Vibe », page /about) ; *Vibe CLI* (12/2025) → *Vibe Code* ; modes *Work*, *Code*, *Chat* (Chat en cours de fusion ou de retrait depuis 09/2026).
- *Agent Runtime* (10/2025) contre *Workflows* (04/2026) : tous deux basés sur Temporal ; Mistral ne dit jamais explicitement que Workflows est l'Agent Runtime renommé (inférence).
- *Experiment plan* (2026) contre *Free plan* (page tarifs) : même réalité probable (inférence).
- Homonymie avec **Google AI Studio** et **Azure AI Studio** (devenu Azure AI Foundry, puis Microsoft Foundry).

**Licences et usage commercial**
- Ne pas confondre Apache 2.0, MIT modifiée, MNPL et MRL (anciens), CC BY-NC (poids de Voxtral TTS) et modèles fermés. La FAQ de la page tarifs indique que les déploiements commerciaux exigent une licence Mistral, ce qui ne se concilie pas avec Apache 2.0 (cf. § 8).
- Appeler un modèle ouvert **via Studio ou l'API** est facturé comme tout modèle (VB).

**Dépréciations et changements de comportement relevés**
- 2024 : `mistral-tiny`, `mistral-small` et `mistral-medium` renommés ou datés, avec un préavis de dépréciation de 3 mois (26/02/2024) ; validation stricte des paramètres (01/2024) ; `tool_call_id` obligatoire (05/2024) ; `temperature` rééchelonnée (11/2024).
- Modèles signalés comme dépréciés sur leurs pages : Pixtral 12B, Pixtral Large, Mistral OCR (2503).
- 2026 : OCR 4.0 retiré le 30/09/2026 (au profit de 4.1, même prix) ; Leanstral 1.5 (Labs) retiré le 30/09/2026 ; GLM 5.2 retiré le 31/10/2026 (au profit de GLM 5.3). Les modèles tiers ont un calendrier de dépréciation plus court.
- **Devstral 2** : gratuit par l'API à son lancement (12/2025), payant depuis le 27/01/2026 sauf dans le plan Experiment.
- **Codestral** : endpoint dédié gratuit pendant 8 semaines (2024).
- **Large 4** : −50 % pendant les 2 semaines suivant le 06/10/2026.
- Le **Classifier Factory** (04/2025) et la **documentation du fine-tuning** sont rangés sous `/resources/deprecated/…` dans les docs actuelles. Le fine-tuning classique de La Plateforme semble donc déprécié, Forge ayant pris le relais (inférence à vérifier dans les chapitres de documentation).
- Vibe : Skills à la place des Chat Agents ; Memories migrées vers la Knowledge Base ; migration Enterprise sur environ 6 mois à partir du 01/10/2026 ; le mode Chat sera retiré.
- Streaming : le champ `p` peut casser les parseurs stricts (`mistral-common` ≥ 1.8.4).

**Statuts « preview » à surveiller**
- Workflows, Connectors in Studio, Connectors in Workflows, Connectors Debugger, Managed Deployments, Priority Tier, Search Toolkit, expiration des clés API, Agentic Knowledge Base (Vibe), Large 4 : tous en public preview au 21/10/2026.

**Points d'architecture révélés par les annonces**
- Temporal sous Agent Runtime et Workflows ; Kubernetes et Helm pour les workers ; OpenTelemetry ; Vespa sous Search Toolkit ; LiveKit sous le SDK d'agents vocaux ; vLLM avec prefill/decode désagrégé (NIXL, UCX) pour le service des modèles ; Koyeb (serverless) acquis en 02/2026.
- Les skills de Studio sont servis comme serveurs MCP ; Workflows expose des serveurs MCP pour l'écriture de workflows par des agents (VB).

---

## 8. Questions ouvertes / incohérences relevées

1. **Date de Medium 3.5 et des agents distants de Vibe** : le changelog des docs indique le 28/04/2026, le post LinkedIn de Mistral le 29/04/2026, Futurum le 29 avril ; mais l'article de blog (et le flux RSS) est daté du **22/05/2026**. Le billet Connectors porte aussi la date du 22/05/2026. Les dates affichées sur le blog pour cette période sont donc à vérifier.
2. **Mistral Large 4** : 52B paramètres actifs selon l'annonce du 06/10/2026, **49B** selon le billet NVIDIA du 21/10/2026. Le contexte d'1M figure dans le changelog mais pas dans le billet.
3. **Nom du produit** : la balise `<title>` du billet de lancement dit « Introducing Mistral AI Studio », le H1 « Introducing Mistral Studio », le corps « Mistral AI Studio ». Aucun communiqué n'annonce le changement de nom.
4. **Sortie de bêta privée de Studio** : aucune annonce de GA de Studio dans son ensemble. Les release notes étiquettent chaque fonction séparément (Public Preview ou GA), et la page tarifs inclut Studio dans le plan Free. Studio semble donc ouvert en libre-service (inférence), sans date de bascule connue.
5. **Crédits API inclus** : The Rundown (28/08/2026) indique 10 $ (Free) et 30 $ (Pro) par mois ; la page tarifs (21/10/2026) affiche 15 $ et 25,5 $ par mois selon la variante du plan Pro, et aucun crédit pour le plan Free. Changement de tarif ou incohérence ?
6. **Nombre de connecteurs** : « 20+ » (09/2025), « plus de 60 intégrations » (06/2026), « 100+ connectors » sur la page tarifs (10/2026).
7. **Nommage interne d'un même article** (24/06/2026) : « Connectors Debugger » dans la liste, « Connectors Playground » dans la conclusion ; « API keys with connector scopes » contre « Connector Credentials ».
8. **Licences** : la FAQ de la page tarifs dit que les modèles open-weight sous Apache 2.0 sont réservés à la recherche et à l'usage individuel et que le déploiement commercial exige une licence Mistral. Cela contredit la nature d'Apache 2.0 et la FAQ Cloud (« can run anywhere », licences Apache 2.0 ou MIT modifiée, « can change »). À clarifier dans les CGU.
9. **Liens morts** : `llms.txt` renvoie à `/products/ai-cloud` (404) ; la page réelle est `/cloud`. VentureBeat citait en 10/2025 `docs.mistral.ai/deployment/ai-studio`, chemin restructuré depuis.
10. **Erreurs de presse** : le tableau des licences de VentureBeat (10/2025) présente Magistral Small et Pixtral 12B comme propriétaires (ils sont sous Apache 2.0), Codestral 2501 et Ministral 8B comme « open Apache 2.0 » (ce n'est pas le cas selon les billets de Mistral), et Mistral Small sans poids ouverts (Small 3 et 3.1 sont sous Apache 2.0).
11. **Effectifs** : environ 400 (10/2025, source secondaire), « 1 000+ » (Wikipedia, sans source primaire) et environ 350 (estimation tierce). Aucun chiffre officiel.
12. **Revenus 2025** : environ 200 M€ selon Futurum, environ 200 M$ selon un extrait de Bloomberg TV. Série C : 1,7 Md€ selon Mistral, contre « 2 Md€ à 12 Md€ » selon Bloomberg (chiffre de négociation).
13. **Acquisition d'Emmi** : annoncée le 22/05 selon le billet AI Now Summit, page datée du 23/05.
14. **Identifiant Leanstral 1.5** : `leanstral-1-5` dans le billet, `labs-leanstral-1-5` dans le changelog.
15. **Chiffres invérifiables cités par Mistral** : « millions d'exécutions par jour » (Workflows) ; résultat de GLM-5.2 avec le harnais de Claude Code (41,4 %) attribué à des recherches de Kimi ; comparaisons avec Claude Opus 5.5 et GPT-6 Astra dans le billet Large 4.
16. **Fine-tuning classique** : il n'est plus mis en avant depuis Forge, et ses docs sont rangées sous « deprecated ». Le fine-tuning en libre-service est-il encore disponible dans Studio ? (À vérifier dans les autres chapitres.)
17. **Workflows dans Vibe** : la page tarifs liste « Workflows » parmi les fonctions de Vibe sans préciser les plans concernés.
18. **Accès gouvernemental américain aux modèles d'Anthropic** (juin 2026) : rapporté par Le Monde Informatique d'après Reuters et Axios ; non vérifié à la source dans ce chapitre.
19. **Clients de Studio** : seul HTX cite explicitement « AI Studio ». Les autres témoignages portent sur des briques (Workflows, OCR) ou sur la plateforme en général. Pas de chiffres d'adoption de Studio publiés.

---

## Annexe — Couverture

### A. Articles de mistral.ai/news (92 sur 92, liste complète au 21/10/2026)

Méthode : le HTML de chaque article a été téléchargé et son texte extrait ; les graphiques et images ne sont pas exploitables, mais les tableaux ont été lus sous forme aplatie.

| Statut | Articles (slug, à préfixer par `https://mistral.ai/news/`) |
|---|---|
| ✅ Lus en entier — plateforme, Studio, produits | `la-plateforme`, `customization`, `2024-ft-hackathon`, `build-tweak-repeat`, `september-24-release`, `batch-api`, `mistral-moderation`, `mistral-chat`, `le-chat-mistral`, `all-new-le-chat`, `le-chat-enterprise`, `agents-api`, `mistral-code`, `mistral-compute`, `ai-for-citizens`, `le-chat-dives-deep`, `codestral-25-08`, `le-chat-mcp-connectors-memories`, `memory`, `ai-studio`, `mistral-vibe-2-0`, `forge`, `spaces`, `workflows`, `connectors`, `vibe-remote-agents-mistral-medium-3-5`, `vibe-agent`, `search-toolkit`, `ai-now-summit-2026`, `more-control-over-connectors`, `manage-prompts-and-skills-in-studio`, `regional-inference-open-models-new-compute`, `agentic-search` |
| ✅ Lus en entier — modèles | `announcing-mistral-7b`, `mixtral-of-experts`, `mistral-large`, `mixtral-8x22b`, `codestral`, `mistral-ai-non-production-license-mnpl`, `codestral-mamba`, `mathstral`, `mistral-nemo`, `mistral-large-2407`, `pixtral-12b`, `ministraux`, `pixtral-large`, `codestral-2501`, `mistral-small-3`, `mistral-saba`, `mistral-ocr`, `mistral-small-3-1`, `mistral-medium-3`, `devstral`, `codestral-embed`, `magistral`, `devstral-2507`, `voxtral`, `mistral-3`, `devstral-2-vibe-cli`, `mistral-ocr-3`, `voxtral-transcribe-2`, `mistral-small-4`, `leanstral`, `voxtral-tts`, `ocr-4`, `leanstral-1-5`, `robostral-navigate`, `shieldstral`, `mistral-large-4`, `timestral`, `voxtral-3` |
| ✅ Lus en entier — entreprise, partenariats, solutions | `about-mistral-ai`, `mistral-afp`, `agentic-workflows-from-meetings-to-dev-tickets`, `llm-as-rag-judge`, `our-contribution-to-a-global-environmental-standard-for-ai`, `unlocking-potential-vision-language-models-satellite-imagery-fine-tuning`, `mistral-ai-raises-1-7-b-to-accelerate-technological-progress-with-ai`, `ki-fur-deutschland`, `mistral-ai-and-nvidia-partner-to-accelerate-open-frontier-models`, `rails-testing-on-autopilot-building-an-agent-that-writes-what-developers-wont`, `accelerate-ai-native-industry`, `introducing-physics-ai-at-mistral`, `physics-ai-research`, `mistral-x-humain`, `mistral-makes-sovereign-open-weight-ai-to-frontier`, `legacy-code-modernization`, `mistral-x-cloudera`, `mistral-x-mozilla`, `hallo-deutschland`, `mistral-nvidia-ai-for-industrial-engineering` |
| ⚠️ Lu partiellement | `debugging-memory-leak-in-vllm` (article d'ingénierie de 22 min sans lien direct avec Studio : introduction, diagnostic, correctif, synthèse et conclusion lus ; passages pas à pas de débogage (pmap, BPFtrace, GDB) survolés) |

Remarques : les blocs de code des exemples (Pixtral, Rails, Leanstral) ont été parcourus sans être reproduits ; dans `voxtral-3` et `mistral-large-4`, les valeurs des graphiques de benchmarks ne sont pas toutes exploitables en texte.

### B. Pages mistral.ai et docs consultées

| Statut | Page |
|---|---|
| ✅ | `https://mistral.ai/news/` (index, 92 liens) et `https://mistral.ai/news/rss` (92 entrées datées) |
| ✅ | `https://mistral.ai/about/`, `/products/studio/`, `/products/forge/`, `/pricing/`, `/partners/`, `/customers/` (index de 42 histoires), `/cloud/`, `/cloud/compute/`, `/cloud/inference/`, `/sovereign-ai/`, `/our-method/`, `/pricing/enterprise-deployments/` (formulaire) |
| ✅ (recherche ciblée) | 42 pages `/customers/*` : recherche des mentions de Studio, La Plateforme, Workflows, agents et observabilité ; lecture des passages pertinents (HTX, SAP, Cisco, Groupe Mutuel, ASML, BMW, Harvey, Ardian, Capgemini) |
| ✅ (recherche ciblée sur « Studio ») | `/products/vibe/`, `/products/vibe/code/` (clé API disponible depuis Mistral Studio), `/solutions/`, `/solutions/coding/`, `/solutions/custom-model-training/`, `/solutions/document-ai/` (OCR testable dans Mistral Studio), `/solutions/speech/` (Audio Playground de Mistral Studio), `/industry/` et 4 sous-pages sectorielles |
| ⚠️ | `/products/ai-cloud/` (404, page inexistante) ; `/report/` (formulaire de signalement, hors sujet) |
| ✅ | `https://mistral.ai/llms.txt` |
| ✅ | Docs (copie locale du 21/10/2026) : [Changelog](https://docs.mistral.ai/resources/changelogs.md) (en entier), [Release notes](https://docs.mistral.ai/resources/release-notes.md) (en entier), `/pricing/api` (en-têtes et premières lignes de prix) |
| ✅ | Help Center : [Le Chat is now Vibe](https://help.mistral.ai/en/articles/682992-le-chat-is-now-vibe) (extrait de recherche) |

### C. Presse, analystes, blogs et concurrents

| Statut | Source (date) |
|---|---|
| ✅ | [VentureBeat — lancement d'AI Studio](https://venturebeat.com/ai/mistral-launches-its-own-ai-studio-for-quick-development-with-its-european) (23–24/10/2025) |
| ✅ | [VentureBeat — Workflows](https://venturebeat.com/technology/mistral-ai-launches-workflows-a-temporal-powered-orchestration-engine-already-running-millions-of-daily-executions) (28/04/2026) |
| ✅ | [AI Business](https://aibusiness.com/foundation-models/mistral-reveals-ai-studio-for-enterprise) (28/10/2025) |
| ✅ | [Bpifrance Big Média](https://bigmedia.bpifrance.fr/nos-actualites/mistral-ai-lance-sa-plateforme-studio-pour-aider-les-entreprises-a-passer-a-lechelle) (28/10/2025) |
| ✅ | [Le Monde Informatique — tribune](https://www.lemondeinformatique.fr/actualites/lire-mistral-a-t-il-deja-perdu-ou-compris-ou-se-repositionner-%C2%A0-100528.html) (23/06/2026) |
| ✅ | [Futurum Group — Nick Patience](https://futurumgroup.com/insights/mistral-ai-shifts-to-full-stack-strategy-with-vibe-and-industrial-ai/) (29/05/2026) |
| ✅ | [Koen van Gilst — AI Now Summit](https://koenvangilst.nl/lab/mistral-ai-now-summit) (29/05/2026) |
| ✅ | [The Rundown AI — revue de Studio](https://www.therundown.ai/tools/mistral-ai-studio) (vérifiée le 28/08/2026) |
| ✅ | [TechCrunch — série D](https://techcrunch.com/2026/09/08/mistral-raises-e3b-as-sovereign-ai-becomes-big-business/) (08/09/2026) |
| ✅ | [CNBC — série D](https://www.cnbc.com/2026/09/08/mistral-ai-funding-valuation-samsung.html) (08/09/2026) |
| ✅ | [Microsoft Source — partenariat élargi](https://news.microsoft.com/source/2026/07/21/microsoft-and-mistral-expand-strategic-partnership-to-give-enterprises-and-regulated-industries-frontier-ai-they-can-control/) (21/07/2026) |
| ✅ | [Wikipedia — Mistral AI](https://en.wikipedia.org/wiki/Mistral_AI) (révision du 12/10/2026 ; extraction ciblée) |
| ✅ (extraits de recherche) | [Reuters — dette de 830 M$](https://www.reuters.com/business/finance/frances-mistral-raises-830-million-debt-ai-data-centre-build-up-2026-03-30/) (30/03/2026) ; [Yahoo/Reuters](https://finance.yahoo.com/sectors/technology/articles/frances-mistral-raises-830-million-060341046.html) ; [CNBC — dette](https://www.cnbc.com/2026/03/30/mistral-ai-paris-data-center-cluster-debt-financing.html) ; [Data Center Knowledge](https://www.datacenterknowledge.com/build-design/mistral-ai-raises-830m-in-debt-for-data-center-play) (30/03/2026) |
| ✅ (extraits) | [Le Monde — Davos](https://www.lemonde.fr/en/economy/article/2026/01/22/french-ai-firm-mistral-predicts-revenue-of-1-billion-in-2026_6749706_19.html) (22/01/2026) ; [presenc.ai](https://presenc.ai/research/mistral-ai-revenue-and-arr-2026) ; [getlatka](https://getlatka.com/companies/mistral-ai) **[Estimation tierce]** ; [TechCrunch — Koyeb](https://techcrunch.com/2026/02/17/mistral-ai-buys-koyeb-in-first-acquisition-to-back-its-cloud-ambitions/) (17/02/2026) ; [mlq.ai — rebrand Vibe](https://mlq.ai/news/mistral-rebrands-le-chat-as-vibe-launches-autonomous-work-agent-for-enterprise/) ; [Developpez.com — Workflows](https://intelligence-artificielle.developpez.com/actu/382744/) (30/04/2026) ; [AI World — European AI playbook](https://aiworld.eu/story/can-europe-have-its-ai-moment) (08/04/2026) |
| ✅ | Concurrents : [ibl.ai — Managed Agent War](https://ibl.ai/blog/managed-agent-platform-war-whose-agents-run-your-operations) (24/09/2026) ; [Claude Managed Agents](https://claude.com/blog/claude-managed-agents) (08/04/2026) |
| ✅ (extraits) | [OpenAI — AgentKit](https://openai.com/index/introducing-agentkit/) (06/10/2025, mise à jour du 03/06/2026) ; [OpenAI — Frontier](https://openai.com/index/introducing-openai-frontier/) (05/02/2026) ; [Google — Gemini Enterprise Agent Platform](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform) (22/04/2026) ; [Docs Google — modèles Mistral](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/mistral) ; [Microsoft Foundry](https://azure.microsoft.com/en-us/blog/microsoft-foundry-scale-innovation-on-a-modular-interoperable-and-secure-agent-stack/) ; [IBM watsonx Orchestrate](https://www.ibm.com/new/announcements/new-in-ibm-watsonx-orchestrate-expanded-third-party-agent-management-and-agent-identities) (02/10/2026) ; [Alice Labs](https://alicelabs.ai/en/insights/top-enterprise-ai-platforms-2026) ; [Dataiku](https://www.dataiku.com/blog/best-enterprise-agentic-ai-platforms) ; [Kosmoy](https://www.kosmoy.com/resources/blog/best-ai-management-platforms-2026/) ; [Internative](https://internative.net/insights/blog/enterprise-ai-platform-comparison-vertex-bedrock-foundry-2026) ; digitalapplied, happyrobot, inkeep (OpenAI Frontier) |
| ⚠️ | Fils Reddit et Hacker News : extraits de recherche seulement ; témoignages d'utilisateurs non vérifiés |
| ⚠️ Non consultés en entier | Articles payants ou bloqués (FT, Bloomberg, WSJ) : seulement cités via d'autres médias ; analyses Futurum sur Forge et ASML : titres seulement |
