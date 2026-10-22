# Briques open source pour la plateforme et la console de Nexora Studio

> **État au 22/10/2026.** Recensement des projets open source (GitHub, GitLab, Codeberg, Hugging Face) susceptibles de construire la plateforme et la console d'un équivalent de Mistral Studio pour PME. Aucun prix ni tarif (consigne du fondateur). Aucune décision de conception n'est prise ici.

## En bref

- **Périmètre** : 298 projets vérifiés, répartis en 10 catégories et une section européenne ; 10 modèles d'embedding ou de reranking Hugging Face (section 13) ; 1 dépôt GitLab de référence ; 0 projet pertinent trouvé sur Codeberg.
- **Vérification** : licence déclarée et étoiles, dernière activité, langage et archivage via ecosyste.ms ; texte du fichier LICENSE brut sur GitHub ; présence des dossiers `ee/` ou `enterprise/` ; suivi des redirections GitHub. Tout écart est signalé dans la ligne concernée.
- **Licences à risque** (29 projets) : copyleft réseau (AGPL-3.0) ou restrictions commerciales (SSPL, BSL, ELv2, Sustainable Use, FSL, licence Dify, tri-licence Redis). Liste dans la colonne « Licence ». Les projets à dossier commercial (`ee/`, `enterprise/`) sont au nombre de 16.
- **Candidats les plus solides par catégorie** (sans recommandation finale) :
  - Traces et évals : Langfuse, Opik, promptfoo, DeepEval, OpenTelemetry (conventions GenAI).
  - RAG : LlamaIndex, Haystack, RAGFlow ; bases Qdrant, Vespa, pgvector.
  - Agents et chat : LibreChat, Langflow, LobeChat, Kestra ; Dify est le plus proche de la console mais sa licence est restrictive.
  - Identité : Keycloak, Ory Kratos et Hydra, OpenFGA, SpiceDB.
  - Clés API et usage : LiteLLM, Kong, APISIX, OpenMeter.
  - Console : React, Next.js, shadcn/ui, Radix, TanStack, xyflow, Monaco.
  - Infrastructure : Postgres, NATS, Kubernetes, Argo CD, Temporal, vLLM.
- **Constats majeurs** :
  1. Beaucoup de projets sont en open-core : cœur libre et dossier commercial dans le même dépôt (Langfuse, Dify, n8n, Onyx, Activepieces, Infisical, Mastra, LiteLLM, SigNoz, Flowise). La licence doit être lue par dossier, pas par dépôt.
  2. Les licences restrictives touchent les briques les plus proches de Studio (constructeur d'agents, chat, secrets, passerelle). Il faut les arbitrer avant tout choix.
  3. Plusieurs dépôts ont été renommés ou redirigés (une trentaine, dont `boxyhq/jackson` vers `ory/polis`, `iterative/dvc` vers `treeverse/dvc`, `explodinggradients/ragas` vers `vibrantlabsai/ragas`) : les noms de la base ont été mis à jour.
  4. Pour la base existante : les SDK Mistral et le CLI Vibe sont bien Apache-2.0 (confirme §11) ; Temporal, Vespa, pgvector, Qdrant, OpenTelemetry et GEPA sont confirmés. 🆕 Le générateur Speakeasy est sous ELv2 et le cookbook est sous MIT (la base ne le précisait pas).
  5. Les modèles d'embedding les plus utilisés sont permissifs (BGE-M3 MIT, multilingual-e5 MIT, Qwen3-Embedding Apache-2.0, mxbai et nomic Apache-2.0), mais Jina v3 et son reranker sont CC-BY-NC-4.0 (usage non commercial).

Légende : 🆕 information absente de la base ; ⚠️ contredit ou nuance la base ; ✅ confirme la base (indication ajoutée dans la colonne « Forces / limites »).

## 1. LLMOps : traces et observabilité

Traces LLM, observabilité OpenTelemetry, back-ends de traces.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| langfuse/langfuse | https://github.com/langfuse/langfuse | MIT (cœur) + licence commerciale (ee/) | TypeScript | 36 076 | 2026-10-20 | Mature, très actif | Traces, évals, prompts, datasets | Couvre l'essentiel de la console d'observabilité. Le dépôt contient des dossiers `ee/` et `web/src/ee/` sous licence commerciale (LICENSE) : fonctions entreprise à exclure de tout usage libre. |
| Arize-ai/phoenix | https://github.com/Arize-ai/phoenix | ELv2 (Elastic License 2.0) | Python | 11 874 | 2026-10-16 | Mature, très actif | Traces OTel, évals | ELv2 (Elastic License 2.0) : interdit de proposer le logiciel comme service géré concurrent. Rédhibitoire pour une offre SaaS sans licence commerciale. |
| comet-ml/opik | https://github.com/comet-ml/opik | Apache-2.0 | Python | 22 776 | 2026-10-20 | Mature, très actif | Traces, évals, juges | Couverture large (traces, évals, optimisation) sous Apache-2.0. Vérifier la maturité du tableau de bord hors cloud. |
| Helicone/helicone | https://github.com/Helicone/helicone | Apache-2.0 | TypeScript | 6 226 | 2026-10-10 | Mature, très actif | Passerelle + observabilité | Proxy LLM avec traces et coûts. Activité à surveiller. |
| traceloop/openllmetry | https://github.com/traceloop/openllmetry | Apache-2.0 | Python | 7 502 | 2026-10-13 | Mature, très actif | Instrumentation OTel GenAI | Bibliothèque d'instrumentation (SDK) et non un back-end : à coupler à un stockage de traces. |
| openlit/openlit | https://github.com/openlit/openlit | Apache-2.0 | TypeScript | 2 864 | 2026-10-20 | Mature, très actif | Traces OTel GenAI | Instrumentation et tableau de bord OTel ; Apache-2.0. |
| lmnr-ai/lmnr | https://github.com/lmnr-ai/lmnr | Apache-2.0 | TypeScript | 3 425 | 2026-10-21 | Mature, très actif | Traces, évals (Laminar) | Traces et évaluations pour agents ; Apache-2.0. |
| mlflow/mlflow | https://github.com/mlflow/mlflow | Apache-2.0 | Python | 28 439 | 2026-10-19 | Mature, très actif | Traces, registre de modèles, évals | Standard MLOps très répandu, Apache-2.0 ; registre et traces disponibles, interface plutôt orientée data scientists. |
| wandb/weave | https://github.com/wandb/weave | Apache-2.0 | Python | 1 142 | 2026-10-21 | Actif | Traces, évals | Traces et évaluations open source ; l'offre cloud Weights & Biases est propriétaire. |
| open-telemetry/semantic-conventions | https://github.com/open-telemetry/semantic-conventions | Apache-2.0 | Jinja | 672 | 2026-10-15 | Actif | Conventions de traces GenAI | Référence normative des attributs `gen_ai.*` ; à adopter pour l'interopérabilité des traces (confirme la base §5 : traces en OTLP). |
| Arize-ai/openinference | https://github.com/Arize-ai/openinference | Apache-2.0 | Python | 1 266 | 2026-10-14 | Actif | Conventions d'instrumentation LLM | Couche d'instrumentation au-dessus d'OpenTelemetry ; Apache-2.0. |
| SigNoz/signoz | https://github.com/SigNoz/signoz | MIT + dossier ee/ commercial | TypeScript | 32 374 | 2026-10-17 | Mature, très actif | Back-end de traces (OTel) | Back-end OTel complet (traces, logs, métriques). Dossiers `ee/` et `cmd/enterprise/` sous licence commerciale (LICENSE). |
| grafana/tempo | https://github.com/grafana/tempo | AGPL-3.0 | Go | 5 533 | 2026-10-16 | Mature, très actif | Back-end de traces | Stockage de traces à grande échelle. AGPL-3.0 (LICENSE) : obligations de partage si modifié et exposé en réseau. |
| jaegertracing/jaeger | https://github.com/jaegertracing/jaeger | Apache-2.0 | Go | 23 310 | 2026-10-19 | Mature, très actif | Back-end et visualisation de traces | Back-end OTel CNCF, Apache-2.0 ; visualisation de traces simple, sans évaluation. |
| ClickHouse/ClickHouse | https://github.com/ClickHouse/ClickHouse | Apache-2.0 | C++ | 50 478 | 2026-10-19 | Mature, très actif | Stockage analytique des traces | Base analytique Apache-2.0 utilisée par Langfuse ; adaptée au volume de spans, à exploiter en cluster. |
| evidentlyai/evidently | https://github.com/evidentlyai/evidently | Apache-2.0 | Jupyter Notebook | 7 996 | 2026-09-29 | Mature, très actif | Monitoring de qualité et dérive | Rapports de qualité de données et d'évaluations LLM ; Apache-2.0. |
| AgentOps-AI/agentops | https://github.com/AgentOps-AI/agentops | MIT | Python | 5 883 | 2026-06-25 | Activité modérée | Observabilité d'agents | SDK MIT pour suivre les agents ; le service hébergé n'est pas le dépôt. |
| pydantic/logfire | https://github.com/pydantic/logfire | MIT | Python | 4 517 | 2026-10-17 | Mature, très actif | SDK d'observabilité | SDK MIT ; le back-end Logfire n'est pas dans ce dépôt (non examiné). |
| BerriAI/litellm | https://github.com/BerriAI/litellm | MIT + dossier ee/ commercial | Python | 61 571 | 2026-10-19 | Mature, très actif | Clés API virtuelles, budgets, usage | Passerelle multi-fournisseurs avec clés virtuelles, budgets et suivi de dépense : brique très proche des besoins clés API / usage. Dossier `enterprise/` sous licence commerciale (LICENSE). |
| Portkey-AI/gateway | https://github.com/Portkey-AI/gateway | MIT | TypeScript | 13 207 | 2026-05-25 | Activité modérée | Passerelle LLM | Passerelle MIT (routage, fallback, garde-fous) ; gestion de clés et budgets à vérifier. |
| langwatch/langwatch | https://github.com/langwatch/langwatch | Apache-2.0 + dossier ee/ commercial | TypeScript | 4 981 | 2026-10-19 | Mature, très actif | Observabilité et évals | Plateforme d'évaluation et d'observabilité ; dossier `enterprise/` séparé. |
| PostHog/posthog | https://github.com/PostHog/posthog | MIT + dossier ee/ commercial | Python | 40 337 | 2026-10-19 | Mature, très actif | Analytique d'usage | Analytique produit complète (MIT, dossier `ee/` commercial) ; lourd si le besoin se limite aux traces LLM. |
| Scale3-Labs/langtrace | https://github.com/Scale3-Labs/langtrace | AGPL-3.0 | TypeScript | 1 235 | 2025-11-17 | Activité faible | Observabilité LLM | AGPL-3.0 (LICENSE) : contrainte réseau. |
| langchain-ai/langsmith-sdk | https://github.com/langchain-ai/langsmith-sdk | MIT | Python | 1 082 | 2026-10-16 | Archivé (ecosyste.ms) | SDK de traces | MIT ; dépôt archivé sur GitHub (vérifié) : ne pas s'appuyer dessus sans dépôt de remplacement. Service LangSmith propriétaire. |
| open-telemetry/opentelemetry-python-contrib | https://github.com/open-telemetry/opentelemetry-python-contrib | Apache-2.0 | Python | 1 119 | 2026-10-16 | Actif | Instrumentations OTel | Apache-2.0 ; instrumentations Python. |

**Points d'attention**

- Langfuse est le plus complet (traces, évals, prompts), mais son dépôt mêle MIT et dossiers `ee/` commerciaux : le traiter comme open-core.
- OpenTelemetry (conventions GenAI) est la base neutre à adopter quel que soit le back-end ; le choix du stockage (Jaeger, ClickHouse, Tempo, SigNoz) est un sujet séparé.
- Phoenix (ELv2) est exclu pour une offre concurrente ; Tempo (AGPL-3.0) et SigNoz (dossiers `ee/`) imposent des contraintes à examiner.
- 🆕 Langtrace est sous AGPL-3.0 (LICENSE), alors que la plupart des SDK d'observabilité sont MIT ou Apache-2.0.
- Lunary (GitHub 404) et Langtrace (redirection) ont changé ou disparu : vérifier avant tout engagement.

## 2. Évaluations, juges LLM et optimisation de prompts

Évaluations, juges LLM, benchmarks, optimisation de prompts.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| promptfoo/promptfoo | https://github.com/promptfoo/promptfoo | MIT | TypeScript | 26 224 | 2026-10-21 | Mature, très actif | Évaluations, red-teaming | CLI et interface d'évaluation, MIT, très actif ; bon candidat au moteur d'évaluation en mode CI. |
| confident-ai/deepeval | https://github.com/confident-ai/deepeval | Apache-2.0 | Python | 19 003 | 2026-10-19 | Mature, très actif | Évaluations, juges LLM | Framework d'évaluation à la pytest, Apache-2.0 ; dépendance à la plateforme Confident AI pour le suivi. |
| vibrantlabsai/ragas | https://github.com/vibrantlabsai/ragas | Apache-2.0 | Python | 16 037 | 2026-02-24 | Activité faible | Évaluations et juges | Supercharge Your LLM Application Evaluations 🚀 |
| UKGovernmentBEIS/inspect_ai | https://github.com/UKGovernmentBEIS/inspect_ai | MIT | Python | 3 044 | 2026-10-19 | Mature, très actif | Framework d'évaluation | Framework de l'AI Security Institute (UK), MIT ; orienté recherche et sécurité, plus lourd pour un produit. |
| EleutherAI/lm-evaluation-harness | https://github.com/EleutherAI/lm-evaluation-harness | MIT | Python | 14 281 | 2026-09-14 | Mature, très actif | Benchmarks de modèles ouverts | Référence pour les benchmarks de modèles ouverts, MIT ; usage en batch plutôt qu'en produit. |
| huggingface/lighteval | https://github.com/huggingface/lighteval | MIT | Python | 2 562 | 2026-10-06 | Mature, très actif | Évaluations | Bibliothèque d'évaluation de Hugging Face, MIT. |
| truera/trulens | https://github.com/truera/trulens | MIT | Python | 3 600 | 2026-10-13 | Mature, très actif | Évaluations RAG et agents | Fonctions de feedback pour RAG et agents, MIT. |
| Giskard-AI/giskard-oss | https://github.com/Giskard-AI/giskard-oss | Apache-2.0 | Python | 5 910 | 2026-10-19 | Mature, très actif | Tests et scan de vulnérabilités LLM | Dépôt renommé (`Giskard-AI/giskard` redirige). Société française ; Apache-2.0 pour le dépôt ouvert. |
| stanfordnlp/dspy | https://github.com/stanfordnlp/dspy | MIT | Python | 38 719 | 2026-10-20 | Mature, très actif | Optimisation de prompts | Programmation de pipelines LM et optimiseurs de prompts, MIT. |
| gepa-ai/gepa | https://github.com/gepa-ai/gepa | MIT | Jupyter Notebook | 7 040 | 2026-10-13 | Mature, très actif | Optimisation réflexive de prompts | Implémentation de GEPA, l'algorithme cité par la doc Studio (confirme la base §5) ; MIT. |
| zou-group/textgrad | https://github.com/zou-group/textgrad | MIT | Python | 3 760 | 2025-07-25 | Activité faible | Optimisation par gradient textuel | Recherche, MIT ; moins intégrable qu'un framework d'évaluation complet. |
| Agenta-AI/agenta | https://github.com/Agenta-AI/agenta | MIT + dossier ee/ commercial | TypeScript | 4 848 | 2026-10-20 | Mature, très actif | Playground, prompts, évals | Couvre Playground, versions de prompts et évaluations ; MIT. Dossier `ee/` commercial (LICENSE). |
| openai/evals | https://github.com/openai/evals | MIT | Python | 19 613 | 2026-04-14 | Activité faible | Évaluations (historique) | Référence historique d'évaluations, MIT ; développement à vérifier. |
| EuroEval/EuroEval | https://github.com/EuroEval/EuroEval | MIT | Python | 200 | 2026-10-16 | Actif | Benchmarks multilingues | Benchmarks dont langues européennes ; MIT. Utile pour mesurer le français. |
| stanford-crfm/helm | https://github.com/stanford-crfm/helm | Apache-2.0 | Python | 2 947 | 2026-09-01 | Mature, très actif | Benchmarks | Benchmark HELM, Apache-2.0 ; orienté recherche. |
| langchain-ai/openevals | https://github.com/langchain-ai/openevals | MIT | Python | 1 225 | 2026-10-14 | Actif | Évaluateurs LLM-juge | Évaluateurs prêts à l'emploi, MIT. |
| EvolvingLMMs-Lab/lmms-eval | https://github.com/EvolvingLMMs-Lab/lmms-eval | Apache-2.0 | Python | 4 460 | 2026-10-17 | Mature, très actif | Évaluation multimodale | Évaluation de modèles multimodaux, MIT ; orienté recherche. |
| open-compass/opencompass | https://github.com/open-compass/opencompass | Apache-2.0 | Python | 7 530 | 2026-10-20 | Mature, très actif | Benchmarks | Plateforme de benchmarks, Apache-2.0 ; plutôt pour des modèles de recherche. |
| microsoft/promptflow | https://github.com/microsoft/promptflow | MIT | Python | 11 249 | 2026-08-26 | Mature, très actif | Flux de prompts et évals | MIT ; activité à vérifier avant tout choix. |
| pydantic/pydantic-ai | https://github.com/pydantic/pydantic-ai | MIT | Python | 20 690 | 2026-10-17 | Mature, très actif | Agents typés, pydantic-evals | Framework d'agents MIT avec module d'évaluation ; cohérent avec un stack Python. |
| Kiln-AI/Kiln | https://github.com/Kiln-AI/Kiln | MIT | Python | 5 193 | 2026-10-16 | Mature, très actif | Datasets, évals, fine-tuning | MIT ; marque mentionnée dans la licence (signal `Brand`). |
| argilla-io/argilla | https://github.com/argilla-io/argilla | Apache-2.0 | Python | 5 152 | 2026-10-12 | Mature, très actif | Annotation et retours humains | Annotation et boucle de retours, Apache-2.0 ; utile pour les juges humains. |
| HumanSignal/label-studio | https://github.com/HumanSignal/label-studio | Apache-2.0 | TypeScript | 28 471 | 2026-10-15 | Mature, très actif | Annotation de données | Annotation de données, Apache-2.0 (noyau). |

**Points d'attention**

- promptfoo (MIT, CLI et CI), DeepEval et Ragas (Apache-2.0) couvrent l'essentiel des besoins d'évaluation ; Inspect AI et lm-evaluation-harness visent surtout la recherche.
- Optimisation de prompts : DSPy et GEPA sont MIT ; GEPA est l'algorithme cité par la doc Studio (confirme la base §5).
- Les plateformes complètes (Agenta, Opik, Langfuse) mêlent cœur libre et fonctions payantes : tracer la frontière avant de s'appuyer dessus.
- Pour mesurer le français et les langues européennes, EuroEval (MIT) est le seul banc multilingue européen retrouvé dans ce recensement.
- pezzo-ai/pezzo n'existe plus sous ce nom (GitHub 404).

## 3. Gestion de prompts, registre d'actifs et versionnage

Registre et versionnage des prompts, des jeux de données et des modèles.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| latitude-dev/latitude-llm | https://github.com/latitude-dev/latitude-llm | MIT | TypeScript | 4 723 | 2026-10-14 | Mature, très actif | Prompts, évals, observabilité | Plateforme de prompts et d'évaluations, MIT ; concurrent direct du registre de prompts. |
| treeverse/lakeFS | https://github.com/treeverse/lakeFS | BSL 1.1 | Go | 5 564 | 2026-10-21 | Mature, très actif | Versionnage de données | BSL 1.1 (LICENSE) : usage production limité à la version non modifiée ; conversion en licence libre à terme. Contrainte à prendre en compte pour un SaaS. |
| treeverse/dvc | https://github.com/treeverse/dvc | Apache-2.0 | Python | 15 930 | 2026-10-19 | Mature, très actif | Versionnage de données et modèles | Ex-`iterative/dvc` (redirection GitHub) ; Apache-2.0. Versionnage de jeux de données et de modèles, sans interface de console. |
| aimhubio/aim | https://github.com/aimhubio/aim | Apache-2.0 | Python | 6 284 | 2026-10-14 | Mature, très actif | Suivi d'expériences | Suivi d'expériences et interface, Apache-2.0. |
| kubeflow/hub | https://github.com/kubeflow/hub | Apache-2.0 | Go | 186 | 2026-10-17 | Actif | Registre de modèles | Ex-`kubeflow/model-registry` (redirection) ; Apache-2.0, orienté Kubernetes. |
| zenml-io/zenml | https://github.com/zenml-io/zenml | Apache-2.0 | Python | 5 621 | 2026-10-21 | Mature, très actif | Pipelines et registre MLOps | Pipelines et registre d'artefacts, Apache-2.0 ; pas de console orientée PME. |

**Points d'attention**

- Les registres de prompts autonomes sont rares : le plus abouti est celui des plateformes d'observabilité (Langfuse, Agenta, Latitude).
- Versionnage de données : lakeFS (BSL 1.1, restrictions de production) contre DVC (Apache-2.0) ; le choix dépend de la nature des actifs (données ou modèles).
- Registre de modèles : kubeflow/hub (ex-model-registry, Apache-2.0) ; MLflow (section 1) couvre aussi ce besoin.
- Dépôts à vérifier pour leur activité réelle : Latitude, Kiln, zenml.

## 4. RAG et recherche (frameworks, bases, embeddings, crawl)

Frameworks RAG, bases vectorielles, embeddings et rerankers, crawl et extraction de documents.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| run-llama/llama_index | https://github.com/run-llama/llama_index | MIT | Python | 52 537 | 2026-10-14 | Mature, très actif | Framework RAG et agents | Framework RAG complet, MIT ; évolution rapide de l'API. |
| deepset-ai/haystack | https://github.com/deepset-ai/haystack | Apache-2.0 | Python | 26 787 | 2026-10-20 | Mature, très actif | Framework RAG | Pipelines RAG modulaires, Apache-2.0 ; éditeur allemand. |
| langchain-ai/langchain | https://github.com/langchain-ai/langchain | MIT | Python | 147 982 | 2026-10-17 | Mature, très actif | Framework d'agents et RAG | MIT, écosystème le plus large ; abstractions parfois lourdes. |
| infiniflow/ragflow | https://github.com/infiniflow/ragflow | Apache-2.0 | Go | 92 427 | 2026-10-17 | Mature, très actif | RAG avec interface | Moteur RAG avec ingestion et interface, Apache-2.0 ; candidat sérieux pour la section Libraries. |
| SciPhi-AI/R2R | https://github.com/SciPhi-AI/R2R | MIT | Python | 8 026 | 2025-11-07 | Activité faible | RAG prêt pour la production (API) | API RAG MIT, orientée production. |
| HKUDS/LightRAG | https://github.com/HKUDS/LightRAG | MIT | Python | 40 253 | 2026-10-20 | Mature, très actif | RAG par graphe | RAG à graphe de connaissances, MIT. |
| microsoft/graphrag | https://github.com/microsoft/graphrag | MIT | Python | 36 330 | 2026-10-12 | Mature, très actif | RAG par graphe | RAG à graphe de Microsoft, MIT ; coût d'indexation élevé à anticiper. |
| neuml/txtai | https://github.com/neuml/txtai | Apache-2.0 | Python | 13 025 | 2026-10-16 | Mature, très actif | Recherche sémantique embarquée | Recherche sémantique et pipelines, Apache-2.0 ; plus léger. |
| Cinnamon/kotaemon | https://github.com/Cinnamon/kotaemon | Apache-2.0 | Python | 25 808 | 2026-07-14 | Activité modérée | Interface RAG documentaire | Interface et RAG documentaire, Apache-2.0. |
| mem0ai/mem0 | https://github.com/mem0ai/mem0 | Apache-2.0 | Python | 67 564 | 2026-10-21 | Mature, très actif | Mémoire d'agents | Couche de mémoire pour agents, Apache-2.0. |
| getzep/graphiti | https://github.com/getzep/graphiti | Apache-2.0 | Python | 31 987 | 2026-10-19 | Mature, très actif | Graphe de connaissances temporel | Graphe temporel pour agents, Apache-2.0. |
| topoteretes/cognee | https://github.com/topoteretes/cognee | Apache-2.0 | Python | 32 561 | 2026-10-20 | Mature, très actif | Mémoire et graphe pour agents | Apache-2.0 ; jeune. |
| feyninc/chonkie | https://github.com/feyninc/chonkie | MIT | Python | 4 790 | 2026-10-03 | Mature, très actif | Libraries et RAG | 🦛 CHONK docs with Chonkie ✨ — The lightweight ingestion library for fast, efficient and robust RAG pipelines |
| qdrant/qdrant | https://github.com/qdrant/qdrant | Apache-2.0 | Rust | 35 141 | 2026-10-19 | Mature, très actif | Base vectorielle | Apache-2.0 ; cité par la base (§11, Search Toolkit : Vespa, Postgres, Qdrant). Confirme la base. |
| weaviate/weaviate | https://github.com/weaviate/weaviate | BSD-3-Clause ou Weaviate License selon le dossier (LICENSE) | Go | 16 894 | 2026-10-20 | Mature, très actif | Base vectorielle | Base vectorielle hybride ; licence à confirmer dans le LICENSE (signal de section enterprise). |
| milvus-io/milvus | https://github.com/milvus-io/milvus | Apache-2.0 | Go | 46 416 | 2026-10-18 | Mature, très actif | Base vectorielle | Apache-2.0 ; plus lourd à exploiter pour une PME. |
| chroma-core/chroma | https://github.com/chroma-core/chroma | Apache-2.0 | Rust | 29 510 | 2026-10-15 | Mature, très actif | Base vectorielle légère | Apache-2.0 ; prototypage et petites charges. |
| pgvector/pgvector | https://github.com/pgvector/pgvector | PostgreSQL License | C | 23 390 | 2026-10-15 | Mature, très actif | Vecteurs dans Postgres | Licence PostgreSQL ; cité par la base (§11). Confirme la base. |
| timescale/pgvectorscale | https://github.com/timescale/pgvectorscale | PostgreSQL | Rust | 3 145 | 2026-10-14 | Mature, très actif | Index vectoriels sur Postgres | Licence PostgreSQL ; extension pour pgvector. |
| paradedb/paradedb | https://github.com/paradedb/paradedb | AGPL-3.0 | Rust | 9 424 | 2026-10-21 | Mature, très actif | Recherche plein texte dans Postgres | AGPL-3.0 (LICENSE) : contrainte réseau à examiner. |
| lancedb/lancedb | https://github.com/lancedb/lancedb | Apache-2.0 | Rust | 11 706 | 2026-10-19 | Mature, très actif | Base vectorielle embarquée | Apache-2.0 ; orientée données multimodales. |
| vespa-engine/vespa | https://github.com/vespa-engine/vespa | Apache-2.0 | Java | 7 133 | 2026-10-20 | Mature, très actif | Moteur de recherche hybride | Apache-2.0 ; cité par la base (§11, backend du Search Toolkit). Confirme la base. |
| opensearch-project/OpenSearch | https://github.com/opensearch-project/OpenSearch | Apache-2.0 | Java | 13 892 | 2026-10-19 | Mature, très actif | Moteur de recherche | Apache-2.0 ; alternative libre à Elasticsearch, avec recherche vectorielle. |
| elastic/elasticsearch | https://github.com/elastic/elasticsearch | AGPL-3.0 / SSPL / ELv2 (tri-licence) | Java | 78 332 | 2026-10-21 | Mature, très actif | Moteur de recherche | Tri-licence AGPL-3.0 / SSPL / ELv2 (LICENSE) : éviter sans analyse juridique. |
| meilisearch/meilisearch | https://github.com/meilisearch/meilisearch | MIT (noyau) + BSL (parties EE) (à confirmer) | Rust | 59 588 | 2026-10-15 | Mature, très actif | Recherche plein texte | Société française. LICENSE : parties Enterprise sous Business Source License ; noyau à vérifier. |
| typesense/typesense | https://github.com/typesense/typesense | GPL-3.0 | C++ | 27 002 | 2026-10-13 | Mature, très actif | Recherche plein texte | GPL-3.0 (LICENSE) ; contrainte copyleft. |
| huggingface/text-embeddings-inference | https://github.com/huggingface/text-embeddings-inference | Apache-2.0 | Rust | 5 076 | 2026-10-13 | Mature, très actif | Service d'embeddings et rerankers | Serveur Apache-2.0 pour modèles d'embedding ; dépôt archivé ? (voir colonne maturité). |
| michaelfeil/infinity | https://github.com/michaelfeil/infinity | MIT | Rust | 2 960 | 2026-10-16 | Mature, très actif | Service d'embeddings et rerankers | Serveur MIT compatible OpenAI. |
| huggingface/sentence-transformers | https://github.com/huggingface/sentence-transformers | Apache-2.0 | Python | 19 205 | 2026-10-21 | Mature, très actif | Bibliothèque d'embeddings | Dépôt renommé (redirection vers l'organisation Hugging Face). Apache-2.0. |
| FlagOpen/FlagEmbedding | https://github.com/FlagOpen/FlagEmbedding | MIT | Python | 12 254 | 2026-08-24 | Mature, très actif | Modèles BGE (code) | MIT pour le code ; licence des poids BGE-M3 MIT (section 4.3). |
| nomic-ai/nomic | https://github.com/nomic-ai/nomic | non déterminée (LICENSE introuvable) | Python | 1 881 | 2025-11-11 | Activité faible | Client Nomic | Client Python ; poids nomic-embed sous Apache-2.0 (section 4.3). |
| jina-ai/serve | https://github.com/jina-ai/serve | Apache-2.0 | Python | 21 854 | 2025-03-24 | Activité faible | Framework de services IA | Dépôt renommé (`jina-ai/jina` redirige). Apache-2.0. Attention : les modèles Jina v3 sont CC-BY-NC-4.0 (section 4.3). |
| stanford-futuredata/ColBERT | https://github.com/stanford-futuredata/ColBERT | MIT | Python | 3 948 | 2025-10-14 | Activité faible | Recherche tardive (ColBERT) | MIT ; recherche plus avancée. |
| AnswerDotAI/rerankers | https://github.com/AnswerDotAI/rerankers | Apache-2.0 | Python | 1 641 | 2025-12-20 | Activité faible | API de rerankers | Interface unifiée pour rerankers, Apache-2.0. |
| illuin-tech/colpali | https://github.com/illuin-tech/colpali | MIT | Python | 2 837 | 2026-09-21 | Mature, très actif | Recherche visuelle de documents | MIT ; pertinent pour les PDF scannés. |
| unclecode/crawl4ai | https://github.com/unclecode/crawl4ai | Apache-2.0 | Python | 85 904 | 2026-10-20 | Mature, très actif | Crawl pour LLM | Crawler Apache-2.0 orienté LLM ; alternative au crawl géré de Libraries. |
| firecrawl/firecrawl | https://github.com/firecrawl/firecrawl | AGPL-3.0 | TypeScript | 193 386 | 2026-10-20 | Mature, très actif | Crawl et extraction | AGPL-3.0 (LICENSE) : contrainte pour un service exposé en réseau ; SDK séparés sous MIT. |
| scrapy/scrapy | https://github.com/scrapy/scrapy | BSD-3-Clause | Python | 64 893 | 2026-10-19 | Mature, très actif | Crawl général | BSD-3 ; crawler éprouvé mais sans rendu JavaScript. |
| adbar/trafilatura | https://github.com/adbar/trafilatura | Apache-2.0 | Python | 6 981 | 2026-10-06 | Mature, très actif | Extraction de texte web | Extraction de contenu web, Apache-2.0 (LICENSE). |
| docling-project/docling | https://github.com/docling-project/docling | MIT | Python | 69 023 | 2026-10-16 | Mature, très actif | Analyse de documents | MIT ; analyse de PDF et formats bureautiques, alternative open source au Document AI. |
| Unstructured-IO/unstructured | https://github.com/Unstructured-IO/unstructured | Apache-2.0 | HTML | 15 572 | 2026-10-16 | Mature, très actif | Analyse de documents | Noyau Apache-2.0 ; certaines fonctions sont dans des offres payantes. |
| datalab-to/marker | https://github.com/datalab-to/marker | Apache-2.0 (code) ; poids restrictifs | Python | 40 517 | 2026-10-14 | Mature, très actif | Conversion PDF vers Markdown | Code Apache-2.0 ; les poids des modèles ont leur propre licence restrictive (non examinée ici). |
| pymupdf/PyMuPDF | https://github.com/pymupdf/PyMuPDF | AGPL-3.0 | Python | 10 910 | 2026-10-15 | Mature, très actif | Lecture PDF | AGPL-3.0 (COPYING) : licence commerciale séparée à prévoir pour un usage SaaS. |
| zylon-ai/private-gpt | https://github.com/zylon-ai/private-gpt | Apache-2.0 | Python | 57 591 | 2026-10-16 | Mature, très actif | Chat sur documents privés | Apache-2.0 ; prototype de référence. |
| searxng/searxng | https://github.com/searxng/searxng | AGPL-3.0 | Python | 38 567 | 2026-10-18 | Mature, très actif | Recherche web (méta-moteur) | AGPL-3.0 (LICENSE) : à héberger avec précautions. |
| pathwaycom/pathway | https://github.com/pathwaycom/pathway | BSL 1.1 (ecosyste.ms indique Apache-2.0 : écart) | Python | 62 126 | 2026-10-14 | Mature, très actif | Flux de données et RAG temps réel | Ecosyste.ms signale Apache-2.0, mais le LICENSE est Business Source License 1.1 (Pathway Live Data Framework) : licence à respecter. |
| nuclia/nucliadb | https://github.com/nuclia/nucliadb | Apache-2.0 | Python | 722 | 2026-10-16 | Actif | Base de recherche sémantique | Base de recherche (Nuclia) ; licence signalée Apache, à confirmer. |
| lightonai/pylate | https://github.com/lightonai/pylate | MIT | Python | 897 | 2026-07-23 | Activité modérée | Recherche tardive | MIT ; bibliothèque française de recherche tardive. |

**Points d'attention**

- Frameworks RAG permissifs : LlamaIndex, Haystack, RAGFlow (Apache-2.0 ou MIT) ; LightRAG et GraphRAG pour les approches par graphe.
- Bases vectorielles : Qdrant, Milvus, Chroma, Vespa, OpenSearch sous Apache-2.0 ; Elasticsearch (tri-licence AGPL/SSPL/ELv2) et Typesense (GPL-3.0) sont à éviter sans analyse.
- Postgres : pgvector et pgvectorscale (licence PostgreSQL) ; ParadeDB et PyMuPDF sont AGPL-3.0, donc contraignants pour un service hébergé.
- Modèles d'embedding : BGE-M3, multilingual-e5, Qwen3-Embedding, nomic et mxbai sont permissifs ; Jina v3 et son reranker sont CC-BY-NC-4.0 (section 13).
- ⚠️ Pathway : ecosyste.ms indique Apache-2.0, mais le LICENSE du dépôt est Business Source License 1.1.
- Vespa et pgvector confirment la base (§11, Search Toolkit) ; Qdrant aussi.

## 5. Constructeurs d'agents low-code et interfaces de chat

Constructeurs d'agents, interfaces de chat, orchestration. Concurrents et composants à la fois.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| langgenius/dify | https://github.com/langgenius/dify | Dify (Apache-2.0 modifiée, restrictions multi-tenant et logo) | Python | 158 639 | 2026-10-16 | Mature, très actif | Constructeur d'agents et workflows | Le plus proche de la console Studio (workflows, base de connaissances, outils). Licence Dify (Apache-2.0 modifiée) : interdit d'exploiter le code en multi-tenant sans accord écrit et de retirer le logo ou le copyright du frontend (LICENSE). Un tenant = un workspace. |
| FlowiseAI/Flowise | https://github.com/FlowiseAI/Flowise | Apache-2.0 (+ enterprise commercial) | TypeScript | 55 504 | 2026-08-13 | Archivé (ecosyste.ms) | Constructeur d'agents | Apache-2.0 hors `packages/server/src/enterprise` (licence commerciale, LICENSE). Dépôt archivé (vérifié sur GitHub). |
| langflow-ai/langflow | https://github.com/langflow-ai/langflow | MIT | Python | 155 886 | 2026-10-21 | Mature, très actif | Constructeur visuel d'agents | MIT ; builder visuel et API. |
| n8n-io/n8n | https://github.com/n8n-io/n8n | Sustainable Use License (+ .ee. commercial) | TypeScript | 208 194 | 2026-10-21 | Mature, très actif | Automatisation et workflows | Sustainable Use License : usage interne ou non commercial seulement, donc pas de revente en service. Fichiers `.ee.` sous licence Enterprise (LICENSE). |
| Mintplex-Labs/anything-llm | https://github.com/Mintplex-Labs/anything-llm | MIT | JavaScript | 67 406 | 2026-10-21 | Mature, très actif | Chat et RAG multi-utilisateur | MIT ; interface de chat et RAG, très utilisée. |
| open-webui/open-webui | https://github.com/open-webui/open-webui | Open WebUI License (BSD-3 + clause de marque) | Python | 156 278 | 2026-10-20 | Mature, très actif | Interface de chat | Open WebUI License : clause de marque imposant de garder le branding au-delà de 50 utilisateurs sur 30 jours sans accord (LICENSE). À ne pas utiliser sans accord en SaaS. |
| LibreChat-AI/LibreChat | https://github.com/LibreChat-AI/LibreChat | MIT | TypeScript | 46 049 | 2026-10-20 | Mature, très actif | Agents, chat, workflows | Enhanced ChatGPT Clone: Features Agents, MCP, Skills, DeepSeek, Anthropic, AWS, OpenAI, Responses API, Azure, Groq, o1, GPT-5, Mistral, Open |
| lobehub/lobehub | https://github.com/lobehub/lobehub | Apache-2.0 | TypeScript | 83 395 | 2026-10-22 | Mature, très actif | Interface de chat et agents | Dépôt renommé (`lobehub/lobe-chat` redirige). Apache-2.0. |
| huggingface/chat-ui | https://github.com/huggingface/chat-ui | Apache-2.0 | TypeScript | 10 985 | 2026-10-15 | Mature, très actif | Interface de chat | Apache-2.0 ; interface simple, reliée à l'écosystème Hugging Face. |
| onyx-dot-app/onyx | https://github.com/onyx-dot-app/onyx | MIT (+ ee commercial) | Python | 32 543 | 2026-10-17 | Mature, très actif | Recherche d'entreprise et agents | MIT hors dossiers `ee` (licence commerciale, LICENSE) ; concurrence directe sur la recherche interne. |
| activepieces/activepieces | https://github.com/activepieces/activepieces | MIT (+ ee commercial) | TypeScript | 25 100 | 2026-10-19 | Mature, très actif | Automatisation (connecteurs) | MIT hors `packages/ee` et `packages/server/api/src/app/ee` (licence commerciale, LICENSE). |
| simstudioai/sim | https://github.com/simstudioai/sim | Apache-2.0 | TypeScript | 29 834 | 2026-10-17 | Mature, très actif | Constructeur d'agents et workflows | Apache-2.0 ; projet jeune. |
| Chainlit/chainlit | https://github.com/Chainlit/chainlit | Apache-2.0 | Python | 12 519 | 2026-09-18 | Archivé (ecosyste.ms) | Interface de chat Python | Apache-2.0 ; interface de chat pour prototypes. Dépôt archivé (vérifié sur GitHub) ; société française. |
| CopilotKit/CopilotKit | https://github.com/CopilotKit/CopilotKit | MIT | TypeScript | 38 044 | 2026-10-16 | Mature, très actif | Composants d'agents dans l'interface | MIT ; composants React pour agents dans une application. |
| assistant-ui/assistant-ui | https://github.com/assistant-ui/assistant-ui | MIT | TypeScript | 12 643 | 2026-10-20 | Mature, très actif | Composants de chat React | MIT ; composants de chat pour React. |
| vercel/ai | https://github.com/vercel/ai | Apache-2.0 | TypeScript | 27 381 | 2026-10-18 | Mature, très actif | SDK d'IA pour applications web | Apache-2.0 ; SDK TypeScript, très répandu. |
| crewAIInc/crewAI | https://github.com/crewAIInc/crewAI | MIT | Python | 59 796 | 2026-10-17 | Mature, très actif | Orchestration d'agents | MIT. |
| microsoft/autogen | https://github.com/microsoft/autogen | CC-BY-4.0 (LICENSE racine) : code à vérifier | Python | 61 497 | 2026-10-16 | Mature, très actif | Orchestration d'agents | LICENSE racine signalé CC-BY-4.0 : le code est probablement sous une autre licence (LICENSE-CODE non examiné). À vérifier. |
| openai/openai-agents-python | https://github.com/openai/openai-agents-python | MIT | Python | 30 088 | 2026-10-15 | Mature, très actif | SDK d'agents | MIT ; SDK d'agents, sans dépendance au fournisseur en principe. |
| langchain-ai/langgraph | https://github.com/langchain-ai/langgraph | MIT | Python | 43 642 | 2026-10-21 | Mature, très actif | Agents à état durable | MIT ; orchestration d'agents à état, proche des workflows durables. |
| camel-ai/camel | https://github.com/camel-ai/camel | Apache-2.0 | Python | 17 943 | 2026-10-19 | Mature, très actif | Agents multi-agents | Apache-2.0. |
| agno-agi/agno | https://github.com/agno-agi/agno | Apache-2.0 | Python | 42 777 | 2026-10-17 | Mature, très actif | Framework d'agents | Apache-2.0. |
| kestra-io/kestra | https://github.com/kestra-io/kestra | Apache-2.0 | Java | 29 604 | 2026-10-15 | Mature, très actif | Orchestration de workflows | Apache-2.0 ; orchestrateur YAML, société française. |
| windmill-labs/windmill | https://github.com/windmill-labs/windmill | Apache-2.0 / AGPLv3 / propriétaire (entreprise) | Rust | 18 216 | 2026-10-17 | Mature, très actif | Scripts, workflows et apps internes | Licence mixte : Apache-2.0, AGPLv3 et parties entreprise propriétaires (LICENSE). Société française. |
| dust-tt/dust | https://github.com/dust-tt/dust | MIT | TypeScript | 1 490 | 2026-10-20 | Actif | Plateforme d'agents d'entreprise | MIT ; plateforme française de type agents, peu d'étoiles mais active. |
| OpenHands/OpenHands | https://github.com/OpenHands/OpenHands | MIT | TypeScript | 91 499 | 2026-10-22 | Mature, très actif | Agents de développement | Dépôt renommé (`All-Hands-AI/OpenHands` redirige). MIT ; dossier `enterprise/` séparé (à vérifier). |
| letta-ai/letta | https://github.com/letta-ai/letta | Apache-2.0 | — | 25 171 | 2026-09-10 | Mature, très actif | Agents à mémoire | Apache-2.0 ; agents à mémoire longue durée. |
| mastra-ai/mastra | https://github.com/mastra-ai/mastra | Apache-2.0 (+ ee commercial) | TypeScript | 28 846 | 2026-10-16 | Mature, très actif | Framework d'agents TypeScript | Apache-2.0 hors `ee/` (licence commerciale, LICENSE). |
| ChatGPTNextWeb/NextChat | https://github.com/ChatGPTNextWeb/NextChat | MIT | TypeScript | 88 851 | 2026-10-15 | Mature, très actif | Interface de chat | MIT ; interface légère. |
| CherryHQ/cherry-studio | https://github.com/CherryHQ/cherry-studio | AGPL-3.0 | TypeScript | 52 763 | 2026-10-19 | Mature, très actif | Client de chat de bureau | AGPL-3.0 (LICENSE). |
| janhq/jan | https://github.com/janhq/jan | Apache-2.0 | Rust | 44 978 | 2026-10-16 | Mature, très actif | Client de chat local | Apache-2.0 ; application de bureau. |
| huggingface/smolagents | https://github.com/huggingface/smolagents | Apache-2.0 | Python | 29 940 | 2026-10-06 | Mature, très actif | Agents légers | Apache-2.0 ; bibliothèque légère de Hugging Face. |
| agent0ai/agent-zero | https://github.com/agent0ai/agent-zero | MIT | Python | 19 524 | 2026-10-14 | Mature, très actif | Agent autonome | Dépôt renommé (`frdel/agent-zero` redirige). MIT (LICENSE). |
| botpress/botpress | https://github.com/botpress/botpress | MIT | TypeScript | 14 956 | 2026-10-13 | Mature, très actif | Agents, chat, workflows | The open-source hub to build & deploy GPT/LLM Agents ⚡️ |
| mckaywrigley/chatbot-ui | https://github.com/mckaywrigley/chatbot-ui | MIT | TypeScript | 33 326 | 2024-08-03 | Activité faible | Agents, chat, workflows | AI chat for any model. |
| Significant-Gravitas/AutoGPT | https://github.com/Significant-Gravitas/AutoGPT | MIT | Python | 187 621 | 2026-10-17 | Mature, très actif | Agents, chat, workflows | AutoGPT is the vision of accessible AI for everyone, to use and to build on. Our mission is to provide the tools, so that you can focus on w |

**Points d'attention**

- Dify est le plus proche de la console Studio, mais sa licence interdit l'exploitation multi-tenant sans accord écrit et le retrait du logo : incompatible avec un SaaS sans licence commerciale.
- n8n (Sustainable Use License) et Open WebUI (clause de marque au-delà de 50 utilisateurs) imposent des restrictions commerciales ; Flowise est signalé archivé.
- Permissifs : Langflow (MIT), LibreChat (MIT), LobeChat (Apache-2.0), Kestra (Apache-2.0), CrewAI (MIT), Mastra (Apache-2.0 hors `ee/`).
- Plusieurs dépôts ont un dossier commercial (Onyx, Activepieces, Mastra, OpenHands, Windmill partiellement sous licence propriétaire).
- 🆕 microsoft/autogen a un LICENSE racine CC-BY-4.0 : vérifier la licence du code avant réutilisation.

## 6. Identité, multi-tenant, autorisation (RBAC, ReBAC, SSO)

Identité, SSO SAML/OIDC, multi-tenant, autorisation.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| keycloak/keycloak | https://github.com/keycloak/keycloak | Apache-2.0 | Java | 37 450 | 2026-10-21 | Mature, très actif | SSO SAML / OIDC, multi-royaume | Apache-2.0 ; référence du marché, lourd à opérer mais complet. |
| zitadel/zitadel | https://github.com/zitadel/zitadel | AGPL-3.0 | Go | 15 346 | 2026-10-19 | Mature, très actif | Identité multi-tenant | AGPL-3.0 (LICENSE) : contrainte réseau. Multi-tenant natif, société suisse. |
| goauthentik/authentik | https://github.com/goauthentik/authentik | MIT | Python | 26 011 | 2026-10-19 | Mature, très actif | SSO, identité | MIT hors dossiers `enterprise` et `website` (LICENSE). |
| ory/kratos | https://github.com/ory/kratos | Apache-2.0 | Go | 13 921 | 2026-07-29 | Actif | Gestion des identités | Apache-2.0 ; API-first, sans interface d'administration complète. |
| ory/hydra | https://github.com/ory/hydra | Apache-2.0 | Go | 17 617 | 2026-07-29 | Actif | Serveur OAuth2 / OIDC | Apache-2.0 ; fournisseur OIDC sans gestion des utilisateurs. |
| ory/keto | https://github.com/ory/keto | Apache-2.0 | Go | 5 410 | 2026-09-04 | Mature, très actif | Autorisation ReBAC | Apache-2.0 ; modèle Zanzibar. |
| logto-io/logto | https://github.com/logto-io/logto | MPL-2.0 | TypeScript | 14 691 | 2026-10-19 | Mature, très actif | Identité multi-tenant | MPL-2.0 (LICENSE) ; organisations et SSO. |
| supertokens/supertokens-core | https://github.com/supertokens/supertokens-core | Apache-2.0 + dossier ee/ commercial | Java | 15 348 | 2026-10-13 | Mature, très actif | Authentification embarquée | Apache-2.0 hors `ee/` (LICENSE). |
| casdoor/casdoor | https://github.com/casdoor/casdoor | Apache-2.0 | Go | 14 597 | 2026-10-17 | Mature, très actif | SSO multi-organisations | Apache-2.0 ; console d'administration incluse. |
| better-auth/better-auth | https://github.com/better-auth/better-auth | MIT | TypeScript | 30 300 | 2026-10-15 | Mature, très actif | Authentification TypeScript | MIT ; bibliothèque et non serveur autonome. |
| ory/polis | https://github.com/ory/polis | Apache-2.0 + dossier ee/ commercial | TypeScript | 2 268 | 2026-07-27 | Actif | Pont SAML / OIDC | Dépôt redirigé depuis `boxyhq/jackson` (ex-SAML Jackson). Apache-2.0 ; dossier `ee/` commercial. Changement de propriétaire à vérifier. |
| openfga/openfga | https://github.com/openfga/openfga | Apache-2.0 | Go | 5 999 | 2026-10-18 | Mature, très actif | Autorisation ReBAC | Apache-2.0 ; projet CNCF. |
| authzed/spicedb | https://github.com/authzed/spicedb | Apache-2.0 | Go | 7 147 | 2026-10-13 | Mature, très actif | Autorisation ReBAC | Apache-2.0 ; modèle Zanzibar. |
| cerbos/cerbos | https://github.com/cerbos/cerbos | Apache-2.0 | Go | 4 627 | 2026-10-20 | Mature, très actif | Autorisation par politiques | Apache-2.0 ; moteur de politiques hors du code. |
| apache/casbin | https://github.com/apache/casbin | Apache-2.0 | Go | 20 463 | 2026-10-20 | Mature, très actif | Bibliothèque RBAC / ABAC | Apache-2.0 ; bibliothèque, sans console. |
| Permify/permify | https://github.com/Permify/permify | AGPL-3.0 | Go | 5 963 | 2026-10-15 | Mature, très actif | Autorisation (RBAC / ReBAC) | AGPL-3.0 signalé par ecosyste.ms (LICENSE à confirmer). |
| open-policy-agent/opa | https://github.com/open-policy-agent/opa | Apache-2.0 | Go | 12 376 | 2026-10-17 | Mature, très actif | Politiques (Rego) | Apache-2.0 ; moteur générique de politiques. |
| dexidp/dex | https://github.com/dexidp/dex | Apache-2.0 | Go | 11 200 | 2026-10-19 | Mature, très actif | Broker OIDC | Apache-2.0 ; relie des fournisseurs externes. |
| teamhanko/hanko | https://github.com/teamhanko/hanko | AGPL-3.0 | Go | 9 043 | 2026-10-16 | Mature, très actif | Authentification sans mot de passe | AGPL-3.0 signalé (LICENSE à confirmer). |
| permitio/opal | https://github.com/permitio/opal | Apache-2.0 | Python | 5 526 | 2026-10-13 | Mature, très actif | Synchronisation de politiques | Apache-2.0 ; complément d'OPA. |
| authelia/authelia | https://github.com/authelia/authelia | Apache-2.0 | Go | 29 332 | 2026-10-19 | Mature, très actif | Portail d'authentification | Apache-2.0 ; orienté auto-hébergement. |

**Points d'attention**

- Keycloak et les projets Ory (Apache-2.0) sont, selon leur usage courant, les plus matures (inférence) ; Zitadel est AGPL-3.0 (contrainte réseau) et Logto MPL-2.0.
- Autorisation fine : OpenFGA et SpiceDB (Apache-2.0, modèle Zanzibar), Cerbos et OPA (politiques) ; Casbin est une bibliothèque sans console.
- ⚠️ boxyhq/jackson (pont SAML) redirige vers ory/polis : à vérifier avant de s'appuyer sur le nom d'origine.
- SCIM n'a pas été vérifié projet par projet : point non couvert par ce recensement.
- Better Auth est une bibliothèque TypeScript, pas un serveur multi-tenant autonome.

## 7. Secrets, clés API, audit, limitation de débit, usage

Secrets, clés API, audit, passerelles, limitation de débit, mesure d'usage (sans tarification).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| openbao/openbao | https://github.com/openbao/openbao | MPL-2.0 | Go | 8 622 | 2026-10-20 | Mature, très actif | Gestion de secrets | MPL-2.0 ; fork libre de Vault sous Linux Foundation. |
| hashicorp/vault | https://github.com/hashicorp/vault | BSL 1.1 | Go | 36 400 | 2026-10-19 | Mature, très actif | Gestion de secrets | BSL 1.1 (LICENSE) : non open source au sens OSI. |
| Infisical/infisical | https://github.com/Infisical/infisical | MIT (+ ee commercial) | TypeScript | 29 877 | 2026-10-20 | Mature, très actif | Gestion de secrets | MIT hors dossiers `ee/` (licence commerciale, LICENSE). |
| getsops/sops | https://github.com/getsops/sops | MPL-2.0 | Go | 23 433 | 2026-10-13 | Mature, très actif | Chiffrement de secrets | MPL-2.0 ; outil CLI sans service. |
| unkeyed/unkey | https://github.com/unkeyed/unkey | FSL (signalé, à confirmer) | Go | 5 468 | 2026-10-19 | Mature, très actif | Clés API et limites de débit | Texte de licence signalé FSL (Functional Source License) : à lire avant usage. Brique très proche des clés API de Studio. |
| retracedhq/retraced | https://github.com/retracedhq/retraced | Apache-2.0 | TypeScript | 451 | 2026-08-07 | Actif | Journaux d'audit | Apache-2.0 ; journal d'audit à intégrer, activité à vérifier. |
| Kong/kong | https://github.com/Kong/kong | Apache-2.0 | Lua | 44 288 | 2026-10-19 | Mature, très actif | Passerelle API | Apache-2.0 ; gestion de clés et limites en plugins, certaines fonctions sont en version entreprise. |
| apache/apisix | https://github.com/apache/apisix | Apache-2.0 | Lua | 17 218 | 2026-10-14 | Mature, très actif | Passerelle API | Apache-2.0 ; limites de débit et clés en plugins. |
| krakend/krakend-ce | https://github.com/krakend/krakend-ce | Apache-2.0 | Go | 2 692 | 2026-10-13 | Mature, très actif | Passerelle API | Apache-2.0 (édition communautaire) ; dépôt renommé (`krakendio/krakend-ce`). |
| envoyproxy/envoy | https://github.com/envoyproxy/envoy | Apache-2.0 | C++ | 29 099 | 2026-10-21 | Mature, très actif | Proxy de service | Apache-2.0 ; référence des proxys, configuration complexe. |
| envoyproxy/ratelimit | https://github.com/envoyproxy/ratelimit | Apache-2.0 | Go | 2 709 | 2026-10-14 | Mature, très actif | Limitation de débit | Apache-2.0 ; service de limitation pour Envoy. |
| openmeterio/openmeter | https://github.com/openmeterio/openmeter | Apache-2.0 | Go | 2 382 | 2026-10-15 | Mature, très actif | Mesure d'usage | Apache-2.0 ; événements et compteurs d'usage. |
| getlago/lago-api | https://github.com/getlago/lago-api | AGPL-3.0 | Ruby | 439 | 2026-10-20 | Actif | Mesure d'usage et facturation | AGPL-3.0 (LICENSE) ; société française. Partie facturation hors périmètre (prix exclus). |
| TykTechnologies/tyk | https://github.com/TykTechnologies/tyk | MPL-2.0 + dossier ee/ commercial | Go | 10 868 | 2026-10-20 | Mature, très actif | Passerelle API | Dépôt renommé (`Tyk-io/tyk` introuvable). MPL-2.0 ; dossier `ee` séparé. |
| traefik/traefik | https://github.com/traefik/traefik | MIT | Go | 65 289 | 2026-10-19 | Mature, très actif | Reverse proxy | MIT ; routage et TLS. |
| gravitee-io/gravitee-api-management | https://github.com/gravitee-io/gravitee-api-management | Apache-2.0 | Java | 460 | 2026-10-15 | Actif | Gestion d'API | Apache-2.0 (LICENSE) ; gestion complète d'API. |

**Points d'attention**

- Secrets : OpenBao (MPL-2.0) est le fork libre de Vault ; Vault reste en BSL 1.1 ; Infisical est MIT hors `ee/`.
- Passerelle et clés : LiteLLM (MIT hors `enterprise/`) couvre clés virtuelles et budgets ; Kong et APISIX (Apache-2.0) couvrent les limites de débit.
- Mesure d'usage : OpenMeter (Apache-2.0) ; Lago est AGPL-3.0. La facturation et les prix sont exclus de ce document.
- Unkey (clés API) est signalé FSL dans son LICENSE : à lire avant toute réutilisation.
- Retraced (journal d'audit, Apache-2.0) est peu actif ; l'audit reste à concevoir en interne.

## 8. Expérience développeur : SDK, documentation d'API, CLI

Génération de clients depuis OpenAPI, documentation d'API, CLI.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| OpenAPITools/openapi-generator | https://github.com/OpenAPITools/openapi-generator | Apache-2.0 | Java | 26 807 | 2026-10-18 | Mature, très actif | Génération de SDK | Apache-2.0 ; nombreux langages. |
| microsoft/kiota | https://github.com/microsoft/kiota | MIT | C# | 3 833 | 2026-10-13 | Mature, très actif | Génération de SDK | MIT ; générateur de Microsoft. |
| fern-api/fern | https://github.com/fern-api/fern | Apache-2.0 | TypeScript | 3 822 | 2026-10-21 | Mature, très actif | Génération de SDK et docs | Apache-2.0 (LICENSE) ; génération de SDK et docs. |
| speakeasy-api/speakeasy | https://github.com/speakeasy-api/speakeasy | Elastic License 2.0 | JavaScript | 452 | 2026-10-11 | Actif | Génération de SDK (outillage) | CLI sous Elastic License 2.0 (LICENSE). Nouveau : la synthèse indique que les SDK Mistral sont générés par Speakeasy ; l'outil est propriétaire. |
| scalar/scalar | https://github.com/scalar/scalar | MIT | TypeScript | 16 292 | 2026-10-20 | Mature, très actif | Documentation d'API | MIT ; documentation interactive OpenAPI. |
| Redocly/redoc | https://github.com/Redocly/redoc | MIT | TypeScript | 25 971 | 2026-10-21 | Mature, très actif | Documentation d'API | MIT ; rendu OpenAPI. |
| swagger-api/swagger-ui | https://github.com/swagger-api/swagger-ui | Apache-2.0 | JavaScript | 29 038 | 2026-10-21 | Mature, très actif | Documentation d'API | Apache-2.0 ; interface Swagger. |
| facebook/docusaurus | https://github.com/facebook/docusaurus | MIT | TypeScript | 66 541 | 2026-10-16 | Mature, très actif | Site de documentation | MIT ; documentation (dépôt renommé `react`/`facebook` non concerné). |
| fuma-nama/fumadocs | https://github.com/fuma-nama/fumadocs | MIT | TypeScript | 13 433 | 2026-10-21 | Mature, très actif | Documentation (Next.js) | MIT ; docs intégrées à Next.js. |
| shuding/nextra | https://github.com/shuding/nextra | MIT | TypeScript | 13 937 | 2026-07-31 | Actif | Documentation (Next.js) | MIT ; docs Next.js. |
| hey-api/hey-api | https://github.com/hey-api/hey-api | MIT | TypeScript | 5 504 | 2026-09-30 | Mature, très actif | Génération de clients TypeScript | MIT ; dépôt renommé (`hey-api/openapi-ts` redirige). |
| orval-labs/orval | https://github.com/orval-labs/orval | MIT | TypeScript | 6 548 | 2026-10-19 | Mature, très actif | Génération de clients | MIT. |
| openapi-ts/openapi-typescript | https://github.com/openapi-ts/openapi-typescript | MIT | TypeScript | 8 405 | 2026-09-25 | Mature, très actif | Types TypeScript depuis OpenAPI | MIT ; dépôt renommé (`drwpow/openapi-typescript` redirige). |
| oapi-codegen/oapi-codegen | https://github.com/oapi-codegen/oapi-codegen | Apache-2.0 | Go | 8 628 | 2026-10-16 | Mature, très actif | Génération de clients Go | Apache-2.0. |
| oclif/oclif | https://github.com/oclif/oclif | MIT | TypeScript | 9 601 | 2026-10-19 | Mature, très actif | Framework CLI | MIT ; CLI en Node. |
| usebruno/bruno | https://github.com/usebruno/bruno | MIT | JavaScript | 47 697 | 2026-10-16 | Mature, très actif | Client d'API | MIT. |
| hoppscotch/hoppscotch | https://github.com/hoppscotch/hoppscotch | MIT | TypeScript | 80 632 | 2026-10-12 | Mature, très actif | Client d'API | MIT. |
| vuejs/vitepress | https://github.com/vuejs/vitepress | MIT | TypeScript | 18 418 | 2026-10-18 | Mature, très actif | Site de documentation | MIT. |
| squidfunk/mkdocs-material | https://github.com/squidfunk/mkdocs-material | MIT | Python | 27 583 | 2026-10-17 | Mature, très actif | Documentation | MIT ; version Insiders payante à part. |
| stoplightio/elements | https://github.com/stoplightio/elements | Apache-2.0 | TypeScript | 2 468 | 2026-10-15 | Mature, très actif | Documentation OpenAPI | Apache-2.0. |

**Points d'attention**

- Génération de SDK : OpenAPI Generator (Apache-2.0), Kiota (MIT), Fern (Apache-2.0).
- 🆕 Le générateur des SDK Mistral est Speakeasy : son CLI est sous Elastic License 2.0 ; la base ne précisait pas la licence de l'outil.
- Documentation d'API : Scalar, Redoc, Swagger UI (permissifs) ; Fumadocs et Nextra (MIT) pour une doc intégrée à Next.js.
- Clients d'API : Bruno et Hoppscotch (MIT) pour inspirer ou remplacer la partie test d'API.

## 9. Briques de la console web

Composants de la console web : framework, UI, graphes, éditeurs, formulaires, graphiques, i18n, admin.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| react/react | https://github.com/react/react | MIT | JavaScript | 251 592 | 2026-10-20 | Mature, très actif | Bibliothèque UI | Dépôt renommé (`facebook/react` redirige). MIT. |
| vercel/next.js | https://github.com/vercel/next.js | MIT | JavaScript | 143 038 | 2026-10-16 | Mature, très actif | Framework console | MIT. |
| shadcn-ui/ui | https://github.com/shadcn-ui/ui | MIT | TypeScript | 126 016 | 2026-10-19 | Mature, très actif | Composants UI | MIT ; composants copiés dans le code (pas une dépendance). |
| radix-ui/primitives | https://github.com/radix-ui/primitives | MIT | TypeScript | 19 399 | 2026-10-14 | Mature, très actif | Composants accessibles | MIT. |
| TanStack/query | https://github.com/TanStack/query | MIT | TypeScript | 50 439 | 2026-10-16 | Mature, très actif | Gestion des données serveur | MIT. |
| TanStack/router | https://github.com/TanStack/router | MIT | TypeScript | 15 218 | 2026-10-18 | Mature, très actif | Routage typé | MIT. |
| TanStack/table | https://github.com/TanStack/table | MIT | TypeScript | 28 507 | 2026-10-21 | Mature, très actif | Tables de données | MIT. |
| TanStack/form | https://github.com/TanStack/form | MIT | TypeScript | 6 734 | 2026-10-16 | Mature, très actif | Formulaires | MIT. |
| xyflow/xyflow | https://github.com/xyflow/xyflow | MIT | TypeScript | 38 694 | 2026-10-16 | Mature, très actif | Éditeur de graphes (React Flow) | MIT ; brique directe pour le canevas de workflows. |
| microsoft/monaco-editor | https://github.com/microsoft/monaco-editor | MIT | JavaScript | 46 871 | 2026-10-13 | Mature, très actif | Éditeur de code et diff | MIT ; éditeur VS Code, diff inclus. |
| codemirror/dev | https://github.com/codemirror/dev | MIT | JavaScript | 7 808 | 2026-04-15 | Archivé (ecosyste.ms) | Éditeur de code | MIT ; alternative plus légère à Monaco. Dépôt archivé sur GitHub (vérifié) : à confirmer avant usage. |
| rjsf-team/react-jsonschema-form | https://github.com/rjsf-team/react-jsonschema-form | Apache-2.0 | TypeScript | 15 921 | 2026-10-19 | Mature, très actif | Formulaires JSON Schema | Apache-2.0 ; formulaires depuis JSON Schema. |
| rtfpessoa/diff2html | https://github.com/rtfpessoa/diff2html | MIT | TypeScript | 3 425 | 2026-05-08 | Activité modérée | Visualiseur de diff | MIT ; diff de versions. |
| recharts/recharts | https://github.com/recharts/recharts | MIT | TypeScript | 27 634 | 2026-10-16 | Mature, très actif | Graphiques | MIT. |
| apache/echarts | https://github.com/apache/echarts | Apache-2.0 | TypeScript | 67 567 | 2026-10-13 | Mature, très actif | Graphiques | Apache-2.0 ; graphiques riches. |
| tremorlabs/tremor | https://github.com/tremorlabs/tremor | Apache-2.0 | TypeScript | 3 665 | 2025-10-10 | Activité faible | Tableaux de bord | Apache-2.0 ; composants de tableaux de bord. |
| i18next/react-i18next | https://github.com/i18next/react-i18next | MIT | JavaScript | 10 056 | 2026-10-17 | Mature, très actif | Internationalisation | MIT. |
| formatjs/formatjs | https://github.com/formatjs/formatjs | non déterminée (LICENSE introuvable) | TypeScript | 14 745 | 2026-10-21 | Mature, très actif | Internationalisation | Licence à confirmer. |
| lingui/js-lingui | https://github.com/lingui/js-lingui | MIT | TypeScript | 5 914 | 2026-10-14 | Mature, très actif | Internationalisation | MIT. |
| refinedev/refine | https://github.com/refinedev/refine | MIT | TypeScript | 35 873 | 2026-09-10 | Mature, très actif | Framework d'administration | MIT ; interface CRUD sur API. |
| marmelab/react-admin | https://github.com/marmelab/react-admin | MIT | TypeScript | 26 970 | 2026-10-19 | Mature, très actif | Framework d'administration | MIT. |
| gradio-app/gradio | https://github.com/gradio-app/gradio | Apache-2.0 | Python | 43 774 | 2026-10-16 | Mature, très actif | Playgrounds Python | Apache-2.0 ; interface de test de modèles. |
| heroui-inc/heroui | https://github.com/heroui-inc/heroui | Apache-2.0 | TypeScript | 30 968 | 2026-10-20 | Mature, très actif | Composants UI | MIT. |
| mantinedev/mantine | https://github.com/mantinedev/mantine | MIT | TypeScript | 31 827 | 2026-10-11 | Mature, très actif | Composants UI | MIT. |
| react-hook-form/react-hook-form | https://github.com/react-hook-form/react-hook-form | MIT | TypeScript | 44 861 | 2026-10-17 | Mature, très actif | Formulaires | MIT. |
| colinhacks/zod | https://github.com/colinhacks/zod | MIT | TypeScript | 44 161 | 2026-10-19 | Mature, très actif | Validation de schémas | MIT. |
| facebook/lexical | https://github.com/facebook/lexical | MIT | TypeScript | 23 962 | 2026-10-19 | Mature, très actif | Éditeur riche | MIT ; éditeur extensible pour prompts à variables. |
| ueberdosis/tiptap | https://github.com/ueberdosis/tiptap | MIT | TypeScript | 38 791 | 2026-10-20 | Mature, très actif | Éditeur riche | MIT. |
| shikijs/shiki | https://github.com/shikijs/shiki | MIT | TypeScript | 13 871 | 2026-10-01 | Mature, très actif | Coloration syntaxique | MIT. |
| kieler/elkjs | https://github.com/kieler/elkjs | EPL-2.0 | JavaScript | 2 836 | 2026-10-19 | Mature, très actif | Disposition de graphes | EPL-2.0 (LICENSE). |
| Budibase/budibase | https://github.com/Budibase/budibase | GPLv3 et BSL par paquet | TypeScript | 28 331 | 2026-10-20 | Mature, très actif | Constructeur d'applications internes | Licences par paquet, GPLv3 et BSL signalées (LICENSE). |
| appsmithorg/appsmith | https://github.com/appsmithorg/appsmith | Apache-2.0 | TypeScript | 41 060 | 2026-10-13 | Mature, très actif | Constructeur d'applications internes | Apache-2.0 hors dossiers `ee` (à vérifier). |
| ToolJet/ToolJet | https://github.com/ToolJet/ToolJet | AGPL-3.0 | HTML | 41 110 | 2026-10-20 | Mature, très actif | Constructeur d'applications internes | AGPL-3.0 (LICENSE). |
| mui/material-ui | https://github.com/mui/material-ui | MIT | JavaScript | 99 258 | 2026-10-21 | Mature, très actif | Composants UI | MIT. |
| ant-design/ant-design | https://github.com/ant-design/ant-design | MIT | TypeScript | 99 836 | 2026-10-21 | Mature, très actif | Composants UI | MIT. |
| metabase/metabase | https://github.com/metabase/metabase | voir LICENSE + dossier ee/ commercial | Clojure | 49 711 | 2026-10-17 | Mature, très actif | Tableaux de bord analytiques | AGPL-3.0 et dossiers commerciaux (à vérifier). |
| apache/superset | https://github.com/apache/superset | Apache-2.0 | Python | 75 198 | 2026-10-18 | Mature, très actif | Tableaux de bord analytiques | Apache-2.0. |
| cube-js/cube | https://github.com/cube-js/cube | Apache-2.0 | Rust | 21 019 | 2026-10-16 | Mature, très actif | Couche sémantique | Apache-2.0 pour le noyau ; dossiers commerciaux possibles. |
| directus/directus | https://github.com/directus/directus | non déterminée (LICENSE introuvable) | TypeScript | 38 611 | 2026-10-19 | Mature, très actif | Back-office de données | Licence à confirmer dans le LICENSE. |
| eclipsesource/jsonforms | https://github.com/eclipsesource/jsonforms | MIT | TypeScript | 2 743 | 2026-10-09 | Mature, très actif | Formulaires JSON Schema | MIT ; dépôt renommé (`jsonforms/jsonforms` introuvable). |

**Points d'attention**

- Socle permissif et éprouvé : React, Next.js, shadcn/ui, Radix, TanStack (query, router, table, form), tous MIT.
- Canevas de workflows : xyflow (MIT) ; éditeurs : Monaco (MIT) pour JSON et diff, CodeMirror (MIT) plus léger.
- Formulaires depuis JSON Schema : rjsf (Apache-2.0) et JSON Forms (MIT).
- Constructeurs d'applications internes (Budibase, ToolJet AGPL, Appsmith) : à éviter comme base de console produit ; utiles seulement comme inspiration.

## 10. Données, infrastructure et déploiement souverain

Données, messagerie, stockage, Kubernetes, GitOps, GPU, inférence, packaging air-gapped.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| postgres/postgres | https://github.com/postgres/postgres | PostgreSQL | C | 22 418 | 2026-10-15 | Mature, très actif | Base de données principale | Licence PostgreSQL. Socle de la base de Studio (§11). |
| valkey-io/valkey | https://github.com/valkey-io/valkey | BSD-3-Clause | C | 27 475 | 2026-10-20 | Mature, très actif | Cache et files | BSD-3 ; fork de Redis sous Linux Foundation. |
| redis/redis | https://github.com/redis/redis | RSALv2 / SSPLv1 / AGPLv3 (tri-licence, Redis 8+) | C | 77 030 | 2026-10-19 | Mature, très actif | Cache et files | Redis 8+ en tri-licence RSALv2 / SSPLv1 / AGPLv3 (LICENSE) : ne pas utiliser sans choix explicite de l'AGPL. |
| nats-io/nats-server | https://github.com/nats-io/nats-server | Apache-2.0 | Go | 20 899 | 2026-10-20 | Mature, très actif | Messagerie | Apache-2.0. |
| apache/kafka | https://github.com/apache/kafka | Apache-2.0 | Java | 34 111 | 2026-10-20 | Mature, très actif | Flux d'événements | Apache-2.0 ; lourd à opérer. |
| redpanda-data/redpanda | https://github.com/redpanda-data/redpanda | BSL (à confirmer) | C++ | 12 620 | 2026-10-08 | Mature, très actif | Flux d'événements (compatible Kafka) | Licence Business Source (ecosyste.ms ne renvoie pas de licence ; à confirmer). |
| minio/minio | https://github.com/minio/minio | AGPL-3.0 | Go | 61 321 | 2026-04-24 | Archivé (ecosyste.ms) | Stockage objet S3 | AGPL-3.0 (LICENSE). Dépôt archivé (vérifié sur GitHub) : développement à reprendre ailleurs. |
| deuxfleurs-org/garage | https://github.com/deuxfleurs-org/garage | AGPL-3.0 | Rust | 4 682 | 2026-10-12 | Mature, très actif | Stockage objet S3 | AGPL-3.0 (LICENSE). Association française Deuxfleurs ; pensé pour l'auto-hébergement. |
| seaweedfs/seaweedfs | https://github.com/seaweedfs/seaweedfs | Apache-2.0 | Go | 35 573 | 2026-10-19 | Mature, très actif | Stockage objet S3 | Apache-2.0. |
| ceph/ceph | https://github.com/ceph/ceph | MIT | C++ | 17 131 | 2026-10-16 | Mature, très actif | Stockage distribué | LGPL et autres (COPYING). Complexe à opérer. |
| kubernetes/kubernetes | https://github.com/kubernetes/kubernetes | Apache-2.0 | Go | 128 234 | 2026-10-15 | Mature, très actif | Orchestration de conteneurs | Apache-2.0. |
| helm/helm | https://github.com/helm/helm | Apache-2.0 | Go | 30 329 | 2026-10-16 | Mature, très actif | Packaging Kubernetes | Apache-2.0. |
| argoproj/argo-cd | https://github.com/argoproj/argo-cd | Apache-2.0 | Go | 24 414 | 2026-10-16 | Mature, très actif | GitOps | Apache-2.0. |
| opentofu/opentofu | https://github.com/opentofu/opentofu | MPL-2.0 | Go | 30 512 | 2026-10-16 | Mature, très actif | Infrastructure as code | MPL-2.0 ; fork libre de Terraform. |
| NVIDIA/gpu-operator | https://github.com/NVIDIA/gpu-operator | Apache-2.0 | Go | 2 932 | 2026-10-16 | Mature, très actif | Gestion des GPU sur Kubernetes | Apache-2.0. |
| skypilot-org/skypilot | https://github.com/skypilot-org/skypilot | Apache-2.0 | Python | 10 724 | 2026-10-21 | Mature, très actif | Ordonnancement GPU multi-cloud | Apache-2.0. |
| dstackai/dstack | https://github.com/dstackai/dstack | MPL-2.0 | Python | 2 284 | 2026-10-17 | Mature, très actif | Orchestration GPU | MPL-2.0 (LICENSE.md) ; alternative à SkyPilot. |
| zarf-dev/zarf | https://github.com/zarf-dev/zarf | Apache-2.0 | Go | 2 069 | 2026-10-19 | Mature, très actif | Packaging air-gapped | Apache-2.0 ; dépôt renommé (`defenseunicorns/zarf` redirige). |
| hauler-dev/hauler | https://github.com/hauler-dev/hauler | Apache-2.0 | Go | 261 | 2026-10-19 | Actif | Packaging air-gapped | Apache-2.0 ; dépôt renommé (`rancherfederal/hauler` redirige). |
| temporalio/temporal | https://github.com/temporalio/temporal | MIT | Go | 23 732 | 2026-10-15 | Mature, très actif | Workflows durables | MIT. Confirme la base §11 : Studio Workflows s'appuie sur Temporal. |
| temporalio/sdk-python | https://github.com/temporalio/sdk-python | MIT | Python | 1 226 | 2026-10-16 | Actif | SDK Python Temporal | MIT. Confirme la base : `temporalio>=1.29,<1.30`. |
| inngest/inngest | https://github.com/inngest/inngest | SSPL v1 (passage Apache-2.0 à terme) | Go | 5 942 | 2026-10-14 | Mature, très actif | Workflows et jobs | Server Side Public License v1 (LICENSE), avec clause de passage Apache-2.0 à terme : contrainte pour un service hébergé. |
| triggerdotdev/trigger.dev | https://github.com/triggerdotdev/trigger.dev | Apache-2.0 | TypeScript | 16 586 | 2026-10-20 | Mature, très actif | Workflows et jobs | Apache-2.0 (LICENSE) ; à vérifier : dossiers commerciaux éventuels. |
| hatchet-dev/hatchet | https://github.com/hatchet-dev/hatchet | MIT | Go | 8 145 | 2026-10-19 | Mature, très actif | Workflows et files | MIT. |
| kedacore/keda | https://github.com/kedacore/keda | Apache-2.0 | Go | 10 643 | 2026-10-16 | Mature, très actif | Mise à l'échelle Kubernetes | Apache-2.0. |
| cloudnative-pg/cloudnative-pg | https://github.com/cloudnative-pg/cloudnative-pg | Apache-2.0 | Go | 9 457 | 2026-10-15 | Mature, très actif | Postgres sur Kubernetes | Apache-2.0 ; opérateur Postgres. |
| patroni/patroni | https://github.com/patroni/patroni | MIT | Python | 8 792 | 2026-10-17 | Mature, très actif | Haute disponibilité Postgres | MIT ; dépôt renommé (`zalando/patroni` redirige). |
| goharbor/harbor | https://github.com/goharbor/harbor | Apache-2.0 | Go | 29 540 | 2026-10-13 | Mature, très actif | Registre d'images | Apache-2.0. |
| fluxcd/flux2 | https://github.com/fluxcd/flux2 | Apache-2.0 | Go | 8 444 | 2026-10-17 | Mature, très actif | GitOps | Apache-2.0 ; alternative à Argo CD. |
| cert-manager/cert-manager | https://github.com/cert-manager/cert-manager | Apache-2.0 | Go | 14 120 | 2026-10-19 | Mature, très actif | Certificats TLS | Apache-2.0. |
| grafana/grafana | https://github.com/grafana/grafana | AGPL-3.0 | TypeScript | 77 318 | 2026-10-16 | Mature, très actif | Tableaux de bord | AGPL-3.0 (LICENSE) : contrainte réseau. |
| prometheus/prometheus | https://github.com/prometheus/prometheus | Apache-2.0 | Go | 66 673 | 2026-10-20 | Mature, très actif | Métriques | Apache-2.0. |
| open-telemetry/opentelemetry-collector | https://github.com/open-telemetry/opentelemetry-collector | Apache-2.0 | Go | 7 677 | 2026-10-19 | Mature, très actif | Collecte OTel | Apache-2.0 ; confirme la base (OTLP). |
| vectordotdev/vector | https://github.com/vectordotdev/vector | MPL-2.0 | Rust | 22 713 | 2026-10-16 | Mature, très actif | Collecte de journaux | MPL-2.0. |
| ollama/ollama | https://github.com/ollama/ollama | MIT | Go | 184 135 | 2026-10-21 | Mature, très actif | Serveur de modèles locaux | MIT ; serveur d'inférence local. |
| vllm-project/vllm | https://github.com/vllm-project/vllm | Apache-2.0 | Python | 93 849 | 2026-10-15 | Mature, très actif | Serveur d'inférence | Apache-2.0 ; référence pour servir des modèles ouverts. |
| huggingface/text-generation-inference | https://github.com/huggingface/text-generation-inference | Apache-2.0 | Python | 10 877 | 2026-03-21 | Archivé (ecosyste.ms) | Serveur d'inférence | Apache-2.0 ; dépôt archivé (vérifié sur GitHub) : maintenance à reprendre ailleurs. |
| kserve/kserve | https://github.com/kserve/kserve | Apache-2.0 | Go | 6 144 | 2026-10-21 | Mature, très actif | Serveur de modèles Kubernetes | Apache-2.0. |
| ray-project/ray | https://github.com/ray-project/ray | Apache-2.0 | Python | 44 036 | 2026-10-15 | Mature, très actif | Calcul distribué | Apache-2.0. |
| ggml-org/llama.cpp | https://github.com/ggml-org/llama.cpp | MIT | C++ | 131 886 | 2026-10-21 | Mature, très actif | Inférence locale | MIT. |
| sgl-project/sglang | https://github.com/sgl-project/sglang | Apache-2.0 | Python | 37 494 | 2026-10-20 | Mature, très actif | Serveur d'inférence | Apache-2.0. |
| triton-inference-server/server | https://github.com/triton-inference-server/server | BSD-3-Clause | Python | 11 098 | 2026-10-19 | Mature, très actif | Serveur d'inférence NVIDIA | BSD-3. |
| mudler/LocalAI | https://github.com/mudler/LocalAI | MIT | Go | 49 723 | 2026-10-19 | Mature, très actif | Serveur compatible OpenAI | MIT. |
| mistralai/mistral-inference | https://github.com/mistralai/mistral-inference | Apache-2.0 | Jupyter Notebook | 10 823 | 2026-06-16 | Archivé (ecosyste.ms) | Inférence de référence Mistral | Apache-2.0 ; dépôt archivé et non maintenu sur GitHub (vérifié) : référence historique seulement. |
| scaleway/terraform-provider-scaleway | https://github.com/scaleway/terraform-provider-scaleway | MPL-2.0 | Go | 263 | 2026-10-13 | Actif | Infrastructure souveraine (Scaleway) | MPL-2.0. |
| supabase/supabase | https://github.com/supabase/supabase | Apache-2.0 | TypeScript | 111 785 | 2026-10-20 | Mature, très actif | Plateforme Postgres (auth, stockage) | Apache-2.0 ; plateforme souvent auto-hébergée. |
| appwrite/appwrite | https://github.com/appwrite/appwrite | BSD-3-Clause | TypeScript | 57 736 | 2026-10-20 | Mature, très actif | Plateforme backend | BSD-3. |
| PrefectHQ/prefect | https://github.com/PrefectHQ/prefect | Apache-2.0 | Python | 24 042 | 2026-10-19 | Mature, très actif | Orchestration | Apache-2.0. |
| dagster-io/dagster | https://github.com/dagster-io/dagster | Apache-2.0 | Python | 16 303 | 2026-10-20 | Mature, très actif | Orchestration de données | Apache-2.0. |
| apache/airflow | https://github.com/apache/airflow | Apache-2.0 | Python | 47 189 | 2026-10-16 | Mature, très actif | Orchestration de données | Apache-2.0. |
| pulumi/pulumi | https://github.com/pulumi/pulumi | Apache-2.0 | Go | 25 794 | 2026-10-19 | Mature, très actif | Infrastructure as code | Apache-2.0. |
| longhorn/longhorn | https://github.com/longhorn/longhorn | Apache-2.0 | Shell | 8 029 | 2026-10-15 | Mature, très actif | Stockage bloc Kubernetes | Apache-2.0. |
| duckdb/duckdb | https://github.com/duckdb/duckdb | MIT | C++ | 42 241 | 2026-10-18 | Mature, très actif | Analytique embarquée | MIT ; utile pour agréger l'usage. |
| rook/rook | https://github.com/rook/rook | Apache-2.0 | Go | 13 674 | 2026-10-13 | Mature, très actif | Stockage Ceph sur Kubernetes | Apache-2.0. |

**Points d'attention**

- Socle : Postgres (licence PostgreSQL), Kafka et NATS (Apache-2.0), Kubernetes, Helm, Argo CD et Flux (Apache-2.0).
- ⚠️ Redis est tri-licence (RSALv2, SSPLv1, AGPLv3) depuis la v8 : Valkey (BSD-3) est le fork libre.
- Stockage objet : Garage (AGPL-3.0, Deuxfleurs) ; SeaweedFS (Apache-2.0) ; MinIO est AGPL-3.0 et signalé archivé.
- Workflows : Temporal (MIT) confirme la base (§11) ; Inngest est en SSPL, Trigger.dev en Apache-2.0.
- Inférence : vLLM, SGLang, Ollama, llama.cpp, KServe sont permissifs ; Hugging Face TGI est signalé archivé.

## 11. Projets européens et français, et référence Mistral

Projets européens et français, et référence des dépôts Mistral.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| etalab-ia/OpenGateLLM | https://github.com/etalab-ia/OpenGateLLM | MIT | Python | 214 | 2026-10-21 | Actif | Passerelle LLM souveraine | MIT (LICENSE, DINUM). Passerelle française, à évaluer sur la maturité. |
| suitenumerique/docs | https://github.com/suitenumerique/docs | MIT | Python | 16 927 | 2026-10-14 | Mature, très actif | Édition collaborative (La Suite) | MIT (DINUM). Référence d'architecture pour l'édition et les commentaires. |
| suitenumerique/conversations | https://github.com/suitenumerique/conversations | MIT | Python | 76 | 2026-10-20 | Actif | Chat sur documents (La Suite) | MIT (LICENSE, DINUM). Chat avec sources : très proche d'une console de Libraries. |
| linagora/twake-workplace | https://github.com/linagora/twake-workplace | non déterminée | — | 196 | 2024-06-11 | Activité faible | Espace de travail (Linagora) | Dépôt renommé (`linagora/twake` redirige). Licence non déterminée (LICENSE non trouvé). |
| mistralai/client-python | https://github.com/mistralai/client-python | Apache-2.0 | Python | 774 | 2026-10-09 | Actif | SDK Python Mistral | Apache-2.0 : confirme la base §11. |
| mistralai/client-ts | https://github.com/mistralai/client-ts | Apache-2.0 | TypeScript | 157 | 2026-10-09 | Actif | SDK TypeScript Mistral | Apache-2.0 : confirme la base §11 (SDK TypeScript Apache-2.0). Dépôt renommé (`client-typescript` introuvable). |
| mistralai/cookbook | https://github.com/mistralai/cookbook | MIT | Jupyter Notebook | 2 345 | 2026-10-14 | Mature, très actif | Exemples Mistral | MIT. La base ne donne pas la licence du cookbook : nouveau. |
| mistralai/mistral-common | https://github.com/mistralai/mistral-common | Apache-2.0 | Python | 950 | 2026-10-15 | Actif | Outils communs Mistral | Apache-2.0 : confirme la base §11. |
| mistralai/mistral-vibe | https://github.com/mistralai/mistral-vibe | Apache-2.0 | Python | 5 132 | 2026-10-09 | Mature, très actif | CLI Vibe | Apache-2.0 : confirme la base §11 (CLI Vibe Apache-2.0). |

**Points d'attention**

- Projets DINUM (La Suite) : OpenGateLLM, Docs et Conversations sont sous MIT, mais avec des audiences faibles pour les deux derniers ; à évaluer sur maturité.
- Les SDK Mistral sont sous Apache-2.0 (client-python, client-ts, mistral-common, CLI Vibe) : confirme la base §11. 🆕 Le cookbook est sous MIT.
- Linagora Twake Workplace : licence non déterminée (LICENSE absent) ; le nom `linagora/twake` a changé.
- Autres projets français hors catégorie : Giskard (Apache-2.0), Kestra (Apache-2.0), Windmill (licence mixte), Dust (MIT), Chainlit (Apache-2.0, archivé), Lago et Garage (AGPL-3.0), Meilisearch (licence mixte).

## 12. Autres forges : GitLab et Codeberg

- **GitLab.com** : la recherche publique de l'API (`/projects?search=`, tri par étoiles) sur 10 requêtes (observabilité LLM, évaluation, RAG, plateforme d'agents, gestion de prompts, passerelle LLM, clés API, workflows low-code, bases vectorielles, chat) ne renvoie quasiment que des projets personnels de moins de 10 étoiles, sans brique utile. Les groupes `etalab-ia` et `suitenumerique` n'existent pas sur GitLab.com ; `linagora` n'y a que deux projets sans intérêt.
- **Dépôt GitLab retenu** : `gitlab-org/gitlab`, référence d'architecture d'une forge DevOps complète.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|---|---|
| gitlab-org/gitlab | https://gitlab.com/gitlab-org/gitlab | MIT (cœur) + licence commerciale (`ee/`) ; documentation sous CC BY-SA 4.0 (LICENSE vérifié) | Ruby | 6 172 | 2026-10-22 | Mature, très actif (inférence) | Référence de forge et de CI | Référence d'architecture ; le périmètre `ee/` est propriétaire. |

- **Codeberg** : cinq recherches (llm, rag, observability, oidc, vector) : résultats sans rapport avec le sujet ou simples miroirs (ex. `p-e-w/heretic`, miroir Codeberg). **Aucun projet retenu**.

## 13. Modèles d'embedding et de reranking : licences des poids (Hugging Face)

Source : API publique Hugging Face (`huggingface.co/api/models/<id>`), champ de licence de la fiche. Les nombres de téléchargements sont ceux de Hugging Face, pas des étoiles GitHub. Aucun de ces modèles n'est en accès restreint (`gated: false`).

| Modèle | URL | Licence (fiche) | Dernière modification | Téléchargements | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---|---|
| BAAI/bge-m3 | https://huggingface.co/BAAI/bge-m3 | MIT | 2024-07-03 | 31 032 360 | Embeddings (Libraries) | Multilingue, dense et hybride ; permissif. |
| intfloat/multilingual-e5-large | https://huggingface.co/intfloat/multilingual-e5-large | MIT | 2026-04-02 | 6 671 404 | Embeddings | Multilingue, bon pour le français ; permissif. |
| Qwen/Qwen3-Embedding-0.6B | https://huggingface.co/Qwen/Qwen3-Embedding-0.6B | Apache-2.0 | 2026-04-20 | 8 503 257 | Embeddings | Petit modèle, permissif. |
| nomic-ai/nomic-embed-text-v1.5 | https://huggingface.co/nomic-ai/nomic-embed-text-v1.5 | Apache-2.0 | 2026-04-07 | 13 086 534 | Embeddings | Permissif, contexte long. |
| mixedbread-ai/mxbai-embed-large-v1 | https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1 | Apache-2.0 | 2026-01-23 | 2 095 659 | Embeddings | Permissif. |
| Snowflake/snowflake-arctic-embed-l-v2.0 | https://huggingface.co/Snowflake/snowflake-arctic-embed-l-v2.0 | Apache-2.0 | 2025-07-28 | 2 256 317 | Embeddings | Multilingue, permissif. |
| Alibaba-NLP/gte-multilingual-base | https://huggingface.co/Alibaba-NLP/gte-multilingual-base | Apache-2.0 | 2025-07-05 | 1 153 621 | Embeddings | Multilingue, permissif. |
| BAAI/bge-reranker-v2-m3 | https://huggingface.co/BAAI/bge-reranker-v2-m3 | Apache-2.0 | 2024-06-24 | 15 350 242 | Reranker | Reranker multilingue, permissif. |
| jinaai/jina-embeddings-v3 | https://huggingface.co/jinaai/jina-embeddings-v3 | CC-BY-NC-4.0 | 2026-04-08 | 1 689 903 | Embeddings | ⚠️ Usage non commercial uniquement : incompatible avec un service payant sans licence. |
| jinaai/jina-reranker-v2-base-multilingual | https://huggingface.co/jinaai/jina-reranker-v2-base-multilingual | CC-BY-NC-4.0 | 2025-10-21 | 1 391 242 | Reranker | ⚠️ Usage non commercial uniquement. |

## Annexe A. Méthode et sources

**Périmètre et construction de la liste.** Les candidats viennent des catégories demandées (1 à 10, plus une section européenne). Ils ont été complétés par des projets cités dans les écosystèmes (LLMOps, agents, identité, infrastructure). Environ 330 entrées ont été examinées ; 298 sont retenues dans les tableaux. Les doublons, les dépôts renommés (fusionnés sur le nom actuel) et les dépôts introuvables sont traités à part (annexe C).

**Sources de vérification.**
- Métadonnées (licence déclarée, étoiles, langage, dernier push, archivage, description) : API ecosyste.ms `repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/<owner>%2F<repo>` (ou GitLab.com). Toutes les lignes ont des métadonnées ecosyste.ms (aucune ligne sans donnée).
- Texte du fichier LICENSE (ou COPYING, LICENSE.md) lu sur `raw.githubusercontent.com/<repo>/HEAD/` : utilisé pour les licences composites, les dossiers commerciaux et les licences non déclarées par ecosyste.ms.
- Présence des dossiers `ee/` et `enterprise/` via les pages `github.com/<repo>/tree/HEAD/...` ; statut d'archivage confirmé par le champ `isArchived` des pages GitHub pour les dépôts signalés.
- Redirections de dépôts renommés : suivi via les URL finales des pages GitHub (une trentaine de cas, listés en annexe C).
- Modèles Hugging Face : API publique `huggingface.co/api/models/<id>`.
- GitLab : API publique (recherche, groupes, LICENSE brut de `gitlab-org/gitlab`). Codeberg : API de recherche.

**Dates.** Vérifications du 22/10/2026 (ecosyste.ms, LICENSE bruts, pages GitHub, API Hugging Face, API GitLab et Codeberg).

**Ce qui n'est pas vérifié.** Qualité de code, couverture de tests, rythme de release, vulnérabilités connues (CVE), conformité SCIM, prix et licences des poids des LLM génératifs (seuls les embeddings et rerankers sont traités). Le Search Toolkit de Mistral, signalé « sans dépôt public » dans la base (§11), n'a pas été recherché.

**Incidents de méthode (à connaître).**
- Au tout début, neuf requêtes non authentifiées ont été envoyées à `api.github.com` pour vérifier l'existence de dépôts, alors que les consignes demandaient de ne pas l'utiliser (quota presque épuisé). Aucune autre requête vers cette API. Toutes les métadonnées ont ensuite été prises sur ecosyste.ms ou sur les pages GitHub.
- Les requêtes parallèles vers ecosyste.ms renvoyaient souvent `402` : les lignes concernées ont été reprises en séquentiel jusqu'à obtenir `200`. Aucune ligne retenue n'a de donnée manquante.
- Les étiquettes « Maturité » sont des inférences à partir de la date de dernier push et du nombre d'étoiles (plus de 60 jours et plus de 2 000 étoiles pour « très actif » ; plus de 180 jours pour « faible »), pas une évaluation de la qualité.

## Annexe B. Limites

- Le recensement est une cartographie, pas un audit : les licences sont lues sur le LICENSE principal, et les exceptions de dossiers (`ee/`, `enterprise/`) sont signalées mais pas toujours relues fichier par fichier.
- Les projets à forte visibilité peuvent être absents s'ils n'apparaissent pas dans les écosystèmes consultés : la liste n'est pas exhaustive au sens strict.
- Aucune décision n'est prise pour le fondateur : les « candidats les plus solides » sont des constats, sans recommandation finale.

## Annexe C. Dépôts non retenus ou renommés

**Introuvables (GitHub 404 ou absents de ecosyste.ms) :**
- `lunary-ai/lunary` (plateforme LLM, observabilité et prompts) : GitHub 404.
- `pezzo-ai/pezzo` (prompts) : GitHub 404.
- `mirascope/lilypad` : GitHub 404.
- `linagora/openpaas` : GitHub 404.
- `speakeasy-api/openapi-generation` : GitHub 404 (le CLI `speakeasy-api/speakeasy` existe, voir section 8).

**Renommés ou redirigés (nom actuel utilisé dans les tableaux) :** `facebook/react` vers `react/react` ; `All-Hands-AI/OpenHands` vers `OpenHands/OpenHands` ; `danny-avila/LibreChat` vers `LibreChat-AI/LibreChat` ; `lobehub/lobe-chat` vers `lobehub/lobehub` ; `frdel/agent-zero` vers `agent0ai/agent-zero` ; `boxyhq/jackson` vers `ory/polis` ; `casbin/casbin` vers `apache/casbin` ; `Permifyco/permify` vers `Permify/permify` ; `krakendio/krakend-ce` vers `krakend/krakend-ce` ; `Tyk-io/tyk` vers `TykTechnologies/tyk` ; `hey-api/openapi-ts` vers `hey-api/hey-api` ; `drwpow/openapi-typescript` vers `openapi-ts/openapi-typescript` ; `jsonforms/jsonforms` vers `eclipsesource/jsonforms` ; `defenseunicorns/zarf` vers `zarf-dev/zarf` ; `rancherfederal/hauler` vers `hauler-dev/hauler` ; `zalando/patroni` vers `patroni/patroni` ; `explodinggradients/ragas` vers `vibrantlabsai/ragas` ; `iterative/dvc` vers `treeverse/dvc` ; `kubeflow/model-registry` vers `kubeflow/hub` ; `chonkie-inc/chonkie` vers `feyninc/chonkie` ; `UKPLab/sentence-transformers` vers `huggingface/sentence-transformers` ; `jina-ai/jina` vers `jina-ai/serve` ; `linagora/twake` vers `linagora/twake-workplace` ; `mistralai/client-typescript` vers `mistralai/client-ts` ; `Giskard-AI/giskard` vers `Giskard-AI/giskard-oss` ; `langtrace/langtrace` vers `Scale3-Labs/langtrace`.

**Non retenu pour cause de doublon :** `Kiln-AI/Kiln` (catégorie 2 retenue), `rook/rook` (catégorie 10 retenue).
