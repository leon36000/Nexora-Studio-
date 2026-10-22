# 01 — Briques open source du moteur IA et de la couche d'exécution

**Date de l'état des lieux** : 21/10/2026 · **Périmètre** : moteur IA et exécution d'un équivalent de Mistral Studio pour PME (sans prix ni tarif, conformément à la consigne) · **Statut** : livrable de recherche, rien n'a été installé ni exécuté.

## En bref

- **294 dépôts GitHub vérifiés** dans les catégories 1 à 10, plus 2 catégories ajoutées (observabilité et évaluation ; RAG, mémoire et bases vectorielles). Métadonnées via ecosyste.ms ; licence contrôlée sur le fichier brut quand la balise était ambiguë ou restrictive (55 dépôts ambigus ou restrictifs) ; 14 dépôts déplacés ou renommés remis à leur adresse actuelle.
- **7 projets GitLab et Codeberg** retenus. La recherche publique GitLab et Codeberg ne remonte presque rien de pertinent pour le moteur : l'écosystème est sur GitHub.
- **35 familles ou séries de modèles open-weight** vérifiées par les balises de licence Hugging Face (fiches et API) : voir section 11.
- **Constats majeurs** :
  1. Un socle permissif existe pour la plupart des briques (vLLM, SGLang, llama.cpp, Ollama ; LiteLLM, Bifrost ; LangGraph, PydanticAI, Google ADK ; Temporal ; SDK MCP ; Docling ; LiveKit ; Qdrant, pgvector ; TRL, PEFT, Unsloth). Plusieurs « open core » ont un dossier commercial (`ee/`, `enterprise/`) à isoler avant intégration.
  2. **Licences restrictives à traiter pour un SaaS** : Business Source License 1.1 (Restate, Seldon Core v2), SSPL (Inngest), Elastic License 2.0 (Nango, Airbyte, Phoenix), Sustainable Use License (n8n), AGPL-3.0 (Windmill en partie, new-api, PyMuPDF, Coder, LinTO-STT), Dify (Apache modifiée), Camunda License 1.0, Fish Audio Community License.
  3. **Archivés ou non maintenus, à écarter comme socle** : Hugging Face TGI (archivé 21/03/2026), IPEX-LLM (28/01/2026), TorchServe (08/2025), Netflix Conductor (remplacé par conductor-oss), Flowise (08/2026), Chainlit (10/2026), TensorZero (06/2026), Piper (remplacé par piper1-gpl, GPL-3.0), mistral-finetune (06/2026), PyRIT (03/2026), LLM Guard (07/2026), lumigator (05/2026), Rebuff. Le dépôt public de **Daytona** n'est plus maintenu depuis juin 2026.
  4. **Modèles** : beaucoup de poids Apache-2.0 ou MIT (Qwen3, gpt-oss, Apertus, EuroLLM, OLMo, Luciole). Mais les grands modèles Mistral récents sont sous `other` ou MRL-0.1 (recherche), Voxtral TTS 4B est en CC-BY-NC-4.0 (non commercial), Llama 4 reste sous licence Llama, Gemma 4 porte une balise Apache-2.0 à vérifier face à sa licence dédiée, et GLM-5.3 passe sous licence propre alors que GLM-5.2 est MIT.
  5. **Identifiants obsolètes** : 14 dépôts ont changé d'organisation ou de nom (par exemple `envoyproxy/ai-gateway` redirige vers `theagentrouter/agent-router`, `katanemo/archgw` vers `katanemo/plano`, `MotiaDev/motia` vers `iii-hq/iii`).
- **Candidats les plus solides par catégorie** (signalement, sans recommandation finale) : voir l'introduction de chaque section.
- Comparaison avec la base existante : voir section « Comparaison avec la base » plus bas.

Légende des colonnes : ★ = étoiles au 21/10/2026 ; « Dernière activité » = dernier push du dépôt (pas une release) ; « Maturité » est dérivée (voir annexe).

## Sections par catégorie

Tables triées par pertinence décroissante (ordre de la recherche). Les points d'attention suivent chaque table. La catégorie 11 (modèles) est en section 11, après la 10.

## 1. Service et inférence de modèles

**Candidats signalés** : vLLM, SGLang (serveurs GPU OpenAI-compatibles) ; llama.cpp et Ollama (poste et edge) ; TEI (embeddings) ; LocalAI (API multi-backends).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `vllm-project/vllm` | https://github.com/vllm-project/vllm | Apache-2.0 | Python | 93 849 | 2026-10-15 | Établi (≥ 10 k ★) | Inférence (serveur OpenAI-compatible) | Serveur OpenAI-compatible GPU de référence ; très actif. Exploitation GPU lourde. |
| `sgl-project/sglang` | https://github.com/sgl-project/sglang | Apache-2.0 | Python | 37 494 | 2026-10-20 | Établi (≥ 10 k ★) | Inférence | Serveur haute performance (cache de préfixe), API OpenAI-compatible ; très actif. |
| `huggingface/text-generation-inference` | https://github.com/huggingface/text-generation-inference | Apache-2.0 | Python | 10 877 | 2026-03-21 | Archivé | Inférence | Serveur HF historique ; ARCHIVÉ le 21/03/2026 : à écarter pour un nouveau socle. |
| `ggml-org/llama.cpp` | https://github.com/ggml-org/llama.cpp | MIT | C++ | 131 886 | 2026-10-21 | Établi (≥ 10 k ★) | Inférence (edge/CPU) | Référence CPU/edge et format GGUF ; serveur OpenAI-compatible inclus. |
| `ollama/ollama` | https://github.com/ollama/ollama | MIT | Go | 184 135 | 2026-10-21 | Établi (≥ 10 k ★) | Inférence (poste/PME) | Installation très simple, adapté au poste et aux petites installations ; contrôle de production limite. |
| `mudler/LocalAI` | https://github.com/mudler/LocalAI | MIT | Go | 49 723 | 2026-10-19 | Établi (≥ 10 k ★) | Inférence (API multi-backends) | API multi-backends (LLM, image, audio) auto-hébergée ; communauté active. |
| `EricLBuehler/mistral.rs` | https://github.com/EricLBuehler/mistral.rs | MIT | Rust | 7 761 | 2026-10-20 | Établi (1–10 k ★) | Inférence (Rust) | Moteur Rust, supporte les modèles Mistral ; plus jeune et moins diffusé. |
| `InternLM/lmdeploy` | https://github.com/InternLM/lmdeploy | Apache-2.0 | Python | 8 108 | 2026-10-16 | Établi (1–10 k ★) | Inférence | Serving performant (écosystème InternLM surtout) ; documentation surtout chinoise/anglaise. |
| `NVIDIA/TensorRT-LLM` | https://github.com/NVIDIA/TensorRT-LLM | Apache-2.0 (LICENSE) | Python | 14 859 | 2026-10-19 | Établi (≥ 10 k ★) | Inférence (GPU NVIDIA) | Performance maximale sur GPU NVIDIA ; compilation et dépendance NVIDIA. Apache-2.0 (LICENSE). |
| `triton-inference-server/server` | https://github.com/triton-inference-server/server | BSD-3-Clause | Python | 11 098 | 2026-10-19 | Établi (≥ 10 k ★) | Inférence (multi-modèles) | Serveur générique multi-frameworks, pas LLM-first ; utile en bout de chaîne Kubernetes. |
| `kserve/kserve` | https://github.com/kserve/kserve | Apache-2.0 | Go | 6 144 | 2026-10-21 | Établi (1–10 k ★) | Déploiement K8s | Standard d'inférence Kubernetes ; pertinent pour les déploiements chez le client. |
| `ray-project/ray` | https://github.com/ray-project/ray | Apache-2.0 | Python | 44 036 | 2026-10-15 | Établi (≥ 10 k ★) | Ray Serve (scaling) | Ray Serve pour la montée en charge ; plateforme large, exploitation plus lourde. |
| `llm-d/llm-d` | https://github.com/llm-d/llm-d | Apache-2.0 | Python | 4 871 | 2026-10-20 | Établi (1–10 k ★) | Déploiement K8s LLM | Inférence distribuée sur Kubernetes autour de vLLM ; projet plus récent. |
| `xorbitsai/inference` | https://github.com/xorbitsai/inference | Apache-2.0 | Python | 9 620 | 2026-10-21 | Établi (1–10 k ★) | Inférence (multi-modèles) | Serving multi-modèles simple ; communauté plus petite. |
| `mlc-ai/mlc-llm` | https://github.com/mlc-ai/mlc-llm | Apache-2.0 | Python | 23 249 | 2026-10-06 | Établi (≥ 10 k ★) | Inférence multi-plateformes | Compilation multi-plateformes (GPU, mobile, navigateur) ; activité plus faible en 2026 (octobre). |
| `LMCache/LMCache` | https://github.com/LMCache/LMCache | Apache-2.0 | Python | 12 116 | 2026-10-19 | Établi (≥ 10 k ★) | Cache KV | Cache KV pour contextes longs, complément de vLLM/SGLang ; brique d'optimisation. |
| `ai-dynamo/dynamo` | https://github.com/ai-dynamo/dynamo | Apache-2.0 (LICENSE) | Rust | 8 332 | 2026-10-19 | Établi (1–10 k ★) | Orchestration inférence | Orchestration d'inférence distribuée (NVIDIA) ; Apache-2.0 (LICENSE) ; récent. |
| `bentoml/BentoML` | https://github.com/bentoml/BentoML | Apache-2.0 | Python | 8 900 | 2026-10-05 | Établi (1–10 k ★) | Serving Python | Empaquetage et serving Python de modèles maison ; bon pour APIs sur mesure. |
| `SeldonIO/seldon-core` | https://github.com/SeldonIO/seldon-core | BSL 1.1 (v2) | Go | 4 785 | 2026-03-23 | Établi (1–10 k ★) | Déploiement K8s | Serving Kubernetes ; la v2 est sous Business Source License 1.1 (non OSI, usage restreint). |
| `pytorch/serve` | https://github.com/pytorch/serve | Apache-2.0 | Java | 4 345 | 2025-08-06 | Archivé | Serving (TorchServe) | TorchServe ; ARCHIVÉ le 07/08/2025 : à écarter. |
| `OpenNMT/CTranslate2` | https://github.com/OpenNMT/CTranslate2 | MIT | C++ | 4 713 | 2026-10-19 | Établi (1–10 k ★) | Inférence (CPU/GPU) | Moteur C++ rapide (base de faster-whisper) ; pas un serveur complet. |
| `mozilla-ai/llamafile` | https://github.com/mozilla-ai/llamafile | Apache-2.0 (LICENSE) | C++ | 26 447 | 2026-10-12 | Établi (≥ 10 k ★) | Exécutable portable | Executable LLM portable en un fichier ; Apache-2.0 (LICENSE). Usage poste/edge. |
| `ml-explore/mlx-lm` | https://github.com/ml-explore/mlx-lm | MIT | Python | 7 386 | 2026-10-17 | Établi (1–10 k ★) | Inférence (Apple) | Inférence sur Apple Silicon ; pas pensé pour un serveur multi-utilisateurs. |
| `huggingface/candle` | https://github.com/huggingface/candle | Apache-2.0 | Rust | 21 186 | 2026-10-14 | Établi (≥ 10 k ★) | Inférence (Rust) | Framework ML en Rust pour inférence embarquée ; moins de modèles prêts à l'emploi. |
| `exo-explore/exo` | https://github.com/exo-explore/exo | Apache-2.0 | Python | 47 836 | 2026-10-12 | Établi (≥ 10 k ★) | Inférence distribuée | Inférence distribuée sur machines hétérogènes ; projet expérimental. |
| `openvinotoolkit/model_server` | https://github.com/openvinotoolkit/model_server | Apache-2.0 | C++ | 947 | 2026-10-13 | Émergent (< 1 k ★) | Inférence (OpenVINO) | Serving OpenVINO (matériel Intel) ; niche pour le besoin Studio. |
| `microsoft/onnxruntime-genai` | https://github.com/microsoft/onnxruntime-genai | MIT | C++ | 1 142 | 2026-10-21 | Établi (1–10 k ★) | Inférence (ONNX) | Inférence ONNX pour modèles GenAI ; peu d'étoiles. |
| `kvcache-ai/ktransformers` | https://github.com/kvcache-ai/ktransformers | Apache-2.0 | Python | 19 619 | 2026-10-16 | Établi (≥ 10 k ★) | Inférence MoE hétérogène | Inférence MoE sur CPU+GPU, pour matériel modeste ; activité soutenue. |
| `docker/model-runner` | https://github.com/docker/model-runner | Apache-2.0 | Go | 658 | 2026-10-19 | Émergent (< 1 k ★) | Inférence (Docker) | Exécution de modèles via Docker ; très jeune. |
| `vllm-project/llm-compressor` | https://github.com/vllm-project/llm-compressor | Apache-2.0 | Python | 3 878 | 2026-10-16 | Établi (1–10 k ★) | Quantification | Quantification de modèles pour vLLM ; utile au dimensionnement. |
| `NVIDIA/Model-Optimizer` | https://github.com/NVIDIA/Model-Optimizer | Apache-2.0 | Python | 5 387 | 2026-10-21 | Établi (1–10 k ★) | Quantification | Quantification/optimisation NVIDIA (ex TensorRT Model Optimizer) ; Apache-2.0. |
| `turboderp-org/exllamav2` | https://github.com/turboderp-org/exllamav2 | MIT | Python | 4 639 | 2026-03-04 | Établi (1–10 k ★) | Inférence GPU (quantifiée) | Inférence GPU quantifiée (EXL2) ; aucune mise à jour depuis mars 2026. |
| `Lightning-AI/LitServe` | https://github.com/Lightning-AI/LitServe | Apache-2.0 | Python | 3 955 | 2026-10-14 | Établi (1–10 k ★) | Serving Python | Serving Python simple (style FastAPI) ; Apache-2.0. |
| `intel/ipex-llm` | https://github.com/intel/ipex-llm | Apache-2.0 | Python | 8 846 | 2026-01-28 | Archivé | Inférence (Intel) | ARCHIVÉ le 28/01/2026 : à écarter. |
| `deepspeedai/DeepSpeed-MII` | https://github.com/deepspeedai/DeepSpeed-MII | Apache-2.0 | Python | 2 115 | 2025-06-30 | Peu actif (> 12 mois) | Inférence (DeepSpeed) | Inférence DeepSpeed ; dernière activité juin 2025 (peu actif). |
| `mlc-ai/xgrammar` | https://github.com/mlc-ai/xgrammar | Apache-2.0 | Python | 1 964 | 2026-10-14 | Établi (1–10 k ★) | Sortie structurée (grammaires) | Décodage contraint (JSON, grammaires), utilisé par plusieurs moteurs ; Apache-2.0. |
| `tensorflow/serving` | https://github.com/tensorflow/serving | Apache-2.0 | C++ | 6 364 | 2026-10-20 | Établi (1–10 k ★) | Serving (TF) | Serving TensorFlow ; peu pertinent pour les LLM. |
| `huggingface/text-embeddings-inference` | https://github.com/huggingface/text-embeddings-inference | Apache-2.0 | Rust | 5 076 | 2026-10-13 | Établi (1–10 k ★) | Serving d'embeddings | Serving d'embeddings et de reranking (Rust) ; Apache-2.0. |
| `michaelfeil/infinity` | https://github.com/michaelfeil/infinity | MIT | Rust | 2 960 | 2026-10-16 | Établi (1–10 k ★) | Serving d'embeddings | Serving d'embeddings et de reranking ; MIT ; communauté plus petite. |

### Points d'attention

- **Licences** : la plupart sont Apache-2.0 ou MIT. Attention à NVIDIA TensorRT-LLM (Apache-2.0 au fichier, mais lié au matériel NVIDIA) et à Seldon Core v2 (BSL 1.1).
- **Archivés** : TGI (21/03/2026), IPEX-LLM (28/01/2026), TorchServe (08/2025) : à écarter comme socle neuf.
- **Maturité inégale** : beaucoup de projets très actifs mais jeunes (docker/model-runner, llm-d, EXO). Une forte activité ne prouve pas la stabilité des API.
- **Matériel** : le choix du moteur dépend des GPU disponibles chez le client (non évalué ici).

## 2. Passerelles, routage et proxy compatibles OpenAI

**Candidats signalés** : LiteLLM (forte traction, MIT hors `enterprise/`) ; Bifrost et any-llm (Apache-2.0) ; OpenGateLLM (MIT, DINUM) ; Kong ou APISIX si la passerelle doit aussi gérer l'API management.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `BerriAI/litellm` | https://github.com/BerriAI/litellm | MIT (hors enterprise/) | Python | 61 571 | 2026-10-19 | Établi (≥ 10 k ★) | Passerelle OpenAI-compatible | Référence OpenAI-compatible multi-fournisseurs ; MIT hors dossier enterprise/ (licence commerciale). Maintenance très active. |
| `Portkey-AI/gateway` | https://github.com/Portkey-AI/gateway | MIT | TypeScript | 13 207 | 2026-05-25 | Établi (≥ 10 k ★) | Passerelle | Passerelle TypeScript (repli, réessais, cache) ; MIT ; activité moindre depuis mai 2026. |
| `tensorzero/tensorzero` | https://github.com/tensorzero/tensorzero | Apache-2.0 | Rust | 11 708 | 2026-06-11 | Archivé | Passerelle + observabilité + optimisation | Passerelle + observabilité + optimisation ; ARCHIVÉ le 12/06/2026 (lecture seule). |
| `theagentrouter/agent-router` | https://github.com/theagentrouter/agent-router | Apache-2.0 | Go | 2 253 | 2026-10-21 | Établi (1–10 k ★) | Passerelle (Envoy) | Projet Envoy AI Gateway (ancien envoyproxy/ai-gateway, redirigé) ; vérifier le dépôt officiel. |
| `maximhq/bifrost` | https://github.com/maximhq/bifrost | Apache-2.0 | Go | 8 931 | 2026-10-19 | Établi (1–10 k ★) | Passerelle (Go) | Passerelle Go à faible latence ; Apache-2.0 ; projet jeune. |
| `lm-sys/RouteLLM` | https://github.com/lm-sys/RouteLLM | Apache-2.0 | Python | 5 606 | 2024-08-10 | Peu actif (> 12 mois) | Routage | Routage coût/qualité entre modèles ; dernière activité août 2024 (peu actif). |
| `vllm-project/semantic-router` | https://github.com/vllm-project/semantic-router | Apache-2.0 | Go | 6 219 | 2026-10-19 | Établi (1–10 k ★) | Routage sémantique | Routage sémantique (Go) ; Apache-2.0 ; actif. |
| `mozilla-ai/any-llm` | https://github.com/mozilla-ai/any-llm | Apache-2.0 | Python | 2 218 | 2026-10-14 | Établi (1–10 k ★) | Abstraction multi-fournisseurs | Abstraction multi-fournisseurs (Mozilla.ai) ; bibliothèque plutôt que passerelle complète. |
| `katanemo/plano` | https://github.com/katanemo/plano | Apache-2.0 | Rust | 7 093 | 2026-10-07 | Établi (1–10 k ★) | Passerelle agents | Ex archgw (passerelle pour agents, Rust), renommé ; Apache-2.0. |
| `Kong/kong` | https://github.com/Kong/kong | Apache-2.0 | Lua | 44 288 | 2026-10-19 | Établi (≥ 10 k ★) | Passerelle API (plugins IA) | Passerelle API mature avec plugins IA ; complexité d'exploitation élevée. |
| `apache/apisix` | https://github.com/apache/apisix | Apache-2.0 | Lua | 17 218 | 2026-10-14 | Établi (≥ 10 k ★) | Passerelle API (plugin ai-proxy) | Passerelle API avec plugin ai-proxy ; Apache-2.0 ; la couche IA est un plugin. |
| `agentgateway/agentgateway` | https://github.com/agentgateway/agentgateway | Apache-2.0 | Rust | 5 362 | 2026-10-15 | Établi (1–10 k ★) | Passerelle agents/MCP | Passerelle pour agents, MCP et LLM ; Apache-2.0 ; projet jeune. |
| `songquanpeng/one-api` | https://github.com/songquanpeng/one-api | MIT | JavaScript | 37 183 | 2026-01-09 | Établi (≥ 10 k ★) | Passerelle OpenAI-compatible | Passerelle OpenAI-compatible très diffusée ; MIT ; dernière activité janvier 2026. |
| `QuantumNous/new-api` | https://github.com/QuantumNous/new-api | AGPL-3.0 | Go | 50 273 | 2026-10-19 | Établi (≥ 10 k ★) | Passerelle multi-fournisseurs | Passerelle multi-fournisseurs ; AGPL-3.0 : contraintes en cas de service réseau modifié. |
| `mlflow/mlflow` | https://github.com/mlflow/mlflow | Apache-2.0 | Python | 28 439 | 2026-10-19 | Établi (≥ 10 k ★) | Gateway LLM + traces | Gateway LLM intégré à MLflow (suivi, évaluation) ; Apache-2.0 ; orientation data science. |
| `Helicone/helicone` | https://github.com/Helicone/helicone | Apache-2.0 | TypeScript | 6 226 | 2026-10-10 | Établi (1–10 k ★) | Passerelle + observabilité | Passerelle et observabilité LLM ; Apache-2.0 ; activité à surveiller. |
| `theopenco/llmgateway` | https://github.com/theopenco/llmgateway | Mixte : ee/ commercial | TypeScript | 1 698 | 2026-10-20 | Établi (1–10 k ★) | Passerelle | Passerelle TypeScript ; dossier ee/ commercial ; dépôt de taille modeste. |
| `kgateway-dev/kgateway` | https://github.com/kgateway-dev/kgateway | Apache-2.0 | Go | 5 715 | 2026-10-19 | Établi (1–10 k ★) | Passerelle (Envoy, IA) | Passerelle Kubernetes (Envoy) avec volets IA ; Apache-2.0. |
| `etalab-ia/OpenGateLLM` | https://github.com/etalab-ia/OpenGateLLM | MIT (LICENSE vérifié) | Python | 214 | 2026-10-21 | Émergent (< 1 k ★) | Passerelle souveraine (Albert API, FR) | Passerelle LLM souveraine (DINUM, France) ; MIT vérifié (LICENSE, (c) DINUM 2024) ; 214 étoiles. |

### Points d'attention

- **Dossiers commerciaux** : LiteLLM (`enterprise/`) et llmgateway (`ee/`) ont des parties commerciales à isoler avant intégration.
- **AGPL** : new-api (AGPL-3.0) impose des obligations si le service est modifié et exposé en réseau (à valider juridiquement).
- **Déplacements** : l'Envoy AI Gateway apparaît désormais sous `theagentrouter/agent-router` ; confirmer le dépôt officiel avant d'y ancrer une dépendance.
- **Abandons** : TensorZero archivé (06/2026) ; RouteLLM sans mise à jour depuis août 2024.

## 3. Frameworks et runtimes d'agents (dont plateformes low-code et SDK Mistral)

**Candidats signalés** : LangGraph, PydanticAI, Google ADK, OpenAI Agents SDK, smolagents, Agno, Microsoft Agent Framework (permissifs). Côté plateformes : Langflow (MIT) ; Dify (licence modifiée).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `langchain-ai/langgraph` | https://github.com/langchain-ai/langgraph | MIT | Python | 43 642 | 2026-10-21 | Établi (≥ 10 k ★) | Runtime d'agents à état | Runtime d'agents à état (graphes) ; MIT ; socle de nombreux agents. |
| `langchain-ai/langchain` | https://github.com/langchain-ai/langchain | MIT | Python | 147 982 | 2026-10-17 | Établi (≥ 10 k ★) | Framework LLM | Framework LLM très large ; abstraction parfois lourde. |
| `pydantic/pydantic-ai` | https://github.com/pydantic/pydantic-ai | MIT | Python | 20 690 | 2026-10-17 | Établi (≥ 10 k ★) | Framework d'agents typé | Agents Python types ; MIT ; validation native. |
| `crewAIInc/crewAI` | https://github.com/crewAIInc/crewAI | MIT | Python | 59 796 | 2026-10-17 | Établi (≥ 10 k ★) | Multi-agents | Multi-agents orientés rôles ; MIT. |
| `microsoft/autogen` | https://github.com/microsoft/autogen | MIT (code) ; CC-BY-4.0 (racine) | Python | 61 497 | 2026-10-16 | Établi (≥ 10 k ★) | Multi-agents (maintenance) | Code sous MIT (LICENSE-CODE) ; LICENSE racine en CC-BY-4.0 ; projet en maintenance, successeurs AG2 et Agent Framework. |
| `ag2ai/ag2` | https://github.com/ag2ai/ag2 | Apache-2.0 | Python | 5 008 | 2026-10-20 | Établi (1–10 k ★) | Multi-agents (fork AutoGen) | Fork communautaire d'AutoGen ; Apache-2.0. |
| `microsoft/agent-framework` | https://github.com/microsoft/agent-framework | MIT | Python | 14 180 | 2026-10-16 | Établi (≥ 10 k ★) | Framework d'agents (Microsoft) | Successeur Microsoft d'AutoGen et Semantic Kernel ; MIT ; jeune. |
| `microsoft/semantic-kernel` | https://github.com/microsoft/semantic-kernel | MIT | C# | 28 676 | 2026-10-19 | Établi (≥ 10 k ★) | Framework d'agents | SDK d'agents Microsoft (C#, Python) ; MIT. |
| `huggingface/smolagents` | https://github.com/huggingface/smolagents | Apache-2.0 | Python | 29 940 | 2026-10-06 | Établi (≥ 10 k ★) | Agents de code | Agents qui exécutent du code, légers ; Apache-2.0. |
| `openai/openai-agents-python` | https://github.com/openai/openai-agents-python | MIT | Python | 30 088 | 2026-10-15 | Établi (≥ 10 k ★) | Agents (SDK OpenAI) | SDK d'agents OpenAI ; MIT ; orienté OpenAI (adaptateurs pour d'autres modèles). |
| `google/adk-python` | https://github.com/google/adk-python | Apache-2.0 | Python | 21 926 | 2026-10-20 | Établi (≥ 10 k ★) | Agents (ADK) | Agent Development Kit Google ; Apache-2.0 ; optimisé pour Gemini mais multi-modèles. |
| `agno-agi/agno` | https://github.com/agno-agi/agno | Apache-2.0 | Python | 42 777 | 2026-10-17 | Établi (≥ 10 k ★) | Agents | Framework d'agents Python ; Apache-2.0. |
| `mastra-ai/mastra` | https://github.com/mastra-ai/mastra | Apache-2.0 + ee/ commercial | TypeScript | 28 846 | 2026-10-16 | Établi (≥ 10 k ★) | Agents + workflows (TS) | Agents et workflows TypeScript ; Apache-2.0 + dossiers ee/ commerciaux. |
| `letta-ai/letta` | https://github.com/letta-ai/letta | Apache-2.0 | n.d. | 25 171 | 2026-09-10 | Établi (≥ 10 k ★) | Agents à mémoire | Agents à mémoire persistante (serveur) ; Apache-2.0. |
| `stanfordnlp/dspy` | https://github.com/stanfordnlp/dspy | MIT | Python | 38 719 | 2026-10-20 | Établi (≥ 10 k ★) | Optimisation de prompts | Optimisation automatique de prompts ; MIT ; utile pour l'évaluation. |
| `run-llama/llama_index` | https://github.com/run-llama/llama_index | MIT | Python | 52 537 | 2026-10-14 | Établi (≥ 10 k ★) | Framework RAG/agents | Framework RAG et agents ; MIT. |
| `deepset-ai/haystack` | https://github.com/deepset-ai/haystack | Apache-2.0 | Python | 26 787 | 2026-10-20 | Établi (≥ 10 k ★) | Framework RAG/agents | Framework de pipelines RAG et agents ; Apache-2.0. |
| `camel-ai/camel` | https://github.com/camel-ai/camel | Apache-2.0 | Python | 17 943 | 2026-10-19 | Établi (≥ 10 k ★) | Multi-agents | Recherche multi-agents ; Apache-2.0. |
| `strands-agents/harness-sdk` | https://github.com/strands-agents/harness-sdk | Apache-2.0 | Python | 8 859 | 2026-10-17 | Établi (1–10 k ★) | Agents (AWS) | Ex strands-agents/sdk-python (redirigé) ; SDK d'agents (AWS) ; Apache-2.0. |
| `langgenius/dify` | https://github.com/langgenius/dify | Dify (Apache-2.0 modifiée) | Python | 158 639 | 2026-10-16 | Établi (≥ 10 k ★) | Plateforme low-code agents/workflows | Plateforme low-code agents/workflows (proche de Studio) ; licence Dify modifiée (Apache-2.0 + conditions commerciales). |
| `langflow-ai/langflow` | https://github.com/langflow-ai/langflow | MIT | Python | 155 886 | 2026-10-21 | Établi (≥ 10 k ★) | Plateforme low-code agents | Constructeur visuel d'agents ; MIT ; très diffusé. |
| `FlowiseAI/Flowise` | https://github.com/FlowiseAI/Flowise | Apache-2.0 + enterprise/ commercial | TypeScript | 55 504 | 2026-08-13 | Archivé | Plateforme low-code agents | Constructeur visuel ; ARCHIVÉ le 13/08/2026 ; dossier enterprise/ commercial. |
| `OpenHands/OpenHands` | https://github.com/OpenHands/OpenHands | MIT | TypeScript | 91 498 | 2026-10-22 | Établi (≥ 10 k ★) | Agents de code | Agents de développement (ex All-Hands-AI) ; MIT hors ee/ ; très actif. |
| `SWE-agent/SWE-agent` | https://github.com/SWE-agent/SWE-agent | MIT | Python | 20 584 | 2026-10-12 | Établi (≥ 10 k ★) | Agents de code | Agent de correction de dépôts (recherche) ; MIT. |
| `VoltAgent/voltagent` | https://github.com/VoltAgent/voltagent | MIT | TypeScript | 10 784 | 2026-10-13 | Établi (≥ 10 k ★) | Agents (TS) | Framework d'agents TypeScript ; MIT. |
| `agentscope-ai/agentscope` | https://github.com/agentscope-ai/agentscope | Apache-2.0 | Python | 33 598 | 2026-10-21 | Établi (≥ 10 k ★) | Multi-agents | Framework multi-agents ; Apache-2.0 ; actif. |
| `griptape-ai/griptape` | https://github.com/griptape-ai/griptape | Apache-2.0 | Python | 2 583 | 2026-10-13 | Établi (1–10 k ★) | Agents/workflows | Agents et pipelines structures ; Apache-2.0 ; plus petit. |
| `emcie-co/parlant` | https://github.com/emcie-co/parlant | Apache-2.0 | Python | 18 302 | 2026-07-12 | Établi (≥ 10 k ★) | Agents (contrôle comportemental) | Agents à comportement contrôle ; Apache-2.0. |
| `langroid/langroid` | https://github.com/langroid/langroid | MIT | Python | 4 117 | 2026-10-16 | Établi (1–10 k ★) | Multi-agents | Framework multi-agents Python ; MIT ; petite communauté. |
| `vercel/ai` | https://github.com/vercel/ai | Apache-2.0 (LICENSE) | TypeScript | 27 381 | 2026-10-18 | Établi (≥ 10 k ★) | SDK IA (TypeScript) | SDK TypeScript (streaming, outils) ; Apache-2.0 ; hors Python. |
| `dust-tt/dust` | https://github.com/dust-tt/dust | MIT | TypeScript | 1 490 | 2026-10-20 | Établi (1–10 k ★) | Plateforme agents (France) | Plateforme d'agents (équipe française) ; MIT ; faible audience (1 490 étoiles). |
| `BoundaryML/baml` | https://github.com/BoundaryML/baml | Apache-2.0 | Rust | 9 415 | 2026-10-16 | Établi (1–10 k ★) | Sorties structurées | Sorties structurées via DSL ; Apache-2.0. |
| `567-labs/instructor` | https://github.com/567-labs/instructor | MIT | Python | 14 040 | 2026-10-20 | Établi (≥ 10 k ★) | Sorties structurées | Sorties structurées avec Pydantic ; MIT ; très utilisé. |
| `dottxt-ai/outlines` | https://github.com/dottxt-ai/outlines | Apache-2.0 | Python | 15 962 | 2026-09-21 | Établi (≥ 10 k ★) | Génération contrainte | Génération contrainte ; Apache-2.0. |
| `guidance-ai/guidance` | https://github.com/guidance-ai/guidance | MIT | Jupyter Notebook | 21 797 | 2026-05-21 | Établi (≥ 10 k ★) | Génération contrainte | Génération contrainte par templates ; MIT ; dernière activité mai 2026. |
| `mozilla-ai/any-agent` | https://github.com/mozilla-ai/any-agent | Apache-2.0 | Python | 1 244 | 2026-10-01 | Établi (1–10 k ★) | Abstraction d'agents | Abstraction d'agents pour comparaison/évaluation ; Apache-2.0 ; peu d'étoiles. |
| `mistralai/client-python` | https://github.com/mistralai/client-python | Apache-2.0 | Python | 774 | 2026-10-09 | Émergent (< 1 k ★) | SDK Mistral (référence) | SDK officiel Mistral ; Apache-2.0 ; confirmé la base (chap. 32). |
| `mistralai/mistral-common` | https://github.com/mistralai/mistral-common | Apache-2.0 | Python | 950 | 2026-10-15 | Émergent (< 1 k ★) | Tokenisation/format Mistral | Tokenisation et validation des requêtes Mistral ; Apache-2.0 ; confirmé la base (chap. 32). |
| `mistralai/mistral-vibe` | https://github.com/mistralai/mistral-vibe | Apache-2.0 | Python | 5 132 | 2026-10-09 | Établi (1–10 k ★) | CLI agent Mistral | CLI d'agent de code Mistral (Vibe) ; Apache-2.0 ; confirmé la base (chap. 32). |
| `mistralai/cookbook` | https://github.com/mistralai/cookbook | MIT | Jupyter Notebook | 2 345 | 2026-10-14 | Établi (1–10 k ★) | Exemples Mistral | Exemples officiels Mistral ; MIT. |
| `Chainlit/chainlit` | https://github.com/Chainlit/chainlit | Apache-2.0 | Python | 12 519 | 2026-09-18 | Archivé | Interface agents | Interface de chat pour agents ; ARCHIVÉ le 15/10/2026. |

### Points d'attention

- **Permissif** : LangGraph, PydanticAI, ADK, smolagents, Agno, Microsoft Agent Framework et Semantic Kernel sont sous MIT ou Apache-2.0.
- **Plateformes low-code** : Dify (Apache-2.0 modifiée avec conditions commerciales), Flowise (archivé 13/08/2026), Langflow (MIT). Elles sont des concurrents directs de Studio plutôt que des briques neutres.
- **AutoGen** est en maintenance : le code est sous MIT (`LICENSE-CODE`) mais le `LICENSE` racine est CC-BY-4.0 ; AG2 est un fork communautaire, Agent Framework le successeur côté Microsoft.
- **SDK Mistral** : `client-python`, `client-ts`, `mistral-common` et `mistral-vibe` sont Apache-2.0 (confirmé le chapitre 32) ; `cookbook` MIT.
- **Chainlit** archivé le 15/10/2026 : ne pas ancrer l'interface d'agents dessus.

## 4. Exécution durable et orchestration de workflows

**Candidats signalés** : Temporal (MIT, base déclarée de Workflows) ; Hatchet et DBOS (plus légers) ; Trigger.dev (Apache-2.0, TypeScript) ; Prefect et Dagster (données) ; conductor-oss (successeur de Netflix Conductor).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `temporalio/temporal` | https://github.com/temporalio/temporal | MIT | Go | 23 732 | 2026-10-15 | Établi (≥ 10 k ★) | Exécution durable (serveur) | Serveur de workflows durables MIT (base de Workflows, §3/§11) ; exploitation à maintenir. |
| `temporalio/sdk-python` | https://github.com/temporalio/sdk-python | MIT | Python | 1 226 | 2026-10-16 | Établi (1–10 k ★) | Exécution durable (SDK) | SDK Python MIT (§11 cité temporalio 1.29). |
| `hatchet-dev/hatchet` | https://github.com/hatchet-dev/hatchet | MIT | Go | 8 145 | 2026-10-19 | Établi (1–10 k ★) | Exécution durable | Tâches durables MIT ; plus léger que Temporal, plus jeune. |
| `restatedev/restate` | https://github.com/restatedev/restate | BSL 1.1 | Rust | 4 584 | 2026-10-20 | Établi (1–10 k ★) | Exécution durable | Exécution durable ; Business Source License 1.1 (non OSI, usage restreint). |
| `restatedev/sdk-python` | https://github.com/restatedev/sdk-python | MIT | Python | 82 | 2026-09-02 | Émergent (< 1 k ★) | Exécution durable (SDK) | SDK Python ; MIT ; très peu d'étoiles. |
| `inngest/inngest` | https://github.com/inngest/inngest | SSPL 1.0 (serveur) | Go | 5 942 | 2026-10-14 | Établi (1–10 k ★) | Orchestration événementielle | Orchestration événementielle ; Server Side Public License 1.0 (serveur, SSPL), Apache-2.0 annonce pour plus tard. |
| `dbos-inc/dbos-transact-py` | https://github.com/dbos-inc/dbos-transact-py | MIT | Python | 1 642 | 2026-10-21 | Établi (1–10 k ★) | Workflows sur Postgres | Workflows durables sur Postgres ; MIT ; léger. |
| `triggerdotdev/trigger.dev` | https://github.com/triggerdotdev/trigger.dev | Apache-2.0 | TypeScript | 16 586 | 2026-10-20 | Établi (≥ 10 k ★) | Jobs/workflows (TS) | Tâches et workflows TypeScript ; Apache-2.0. |
| `windmill-labs/windmill` | https://github.com/windmill-labs/windmill | Apache-2.0 + AGPLv3 + EE | Rust | 18 216 | 2026-10-17 | Établi (≥ 10 k ★) | Plateforme de scripts/workflows | Scripts, workflows et UI ; Apache-2.0 + AGPLv3 + code proprietaire (EE). |
| `kestra-io/kestra` | https://github.com/kestra-io/kestra | Apache-2.0 | Java | 29 604 | 2026-10-15 | Établi (≥ 10 k ★) | Orchestration déclarative | Orchestration déclarative (YAML) ; Apache-2.0. |
| `PrefectHQ/prefect` | https://github.com/PrefectHQ/prefect | Apache-2.0 | Python | 24 042 | 2026-10-19 | Établi (≥ 10 k ★) | Orchestration Python | Orchestration Python ; Apache-2.0. |
| `dagster-io/dagster` | https://github.com/dagster-io/dagster | Apache-2.0 | Python | 16 303 | 2026-10-20 | Établi (≥ 10 k ★) | Orchestration données | Orchestration orientée données (assets) ; Apache-2.0. |
| `Netflix/conductor` | https://github.com/Netflix/conductor | Apache-2.0 | Java | 12 749 | 2023-12-22 | Archivé | Orchestration de workflows | ARCHIVÉ le 13/12/2023 : préférer conductor-oss. |
| `n8n-io/n8n` | https://github.com/n8n-io/n8n | Sustainable Use License | TypeScript | 208 194 | 2026-10-21 | Établi (≥ 10 k ★) | Automatisation low-code | Automatisation low-code très diffusée ; Sustainable Use License (fair-code, usage commercial limite). |
| `activepieces/activepieces` | https://github.com/activepieces/activepieces | MIT + ee/ commercial | TypeScript | 25 100 | 2026-10-19 | Établi (≥ 10 k ★) | Automatisation low-code | Automatisation low-code ; MIT hors packages/ee. |
| `apache/airflow` | https://github.com/apache/airflow | Apache-2.0 | Python | 47 189 | 2026-10-16 | Établi (≥ 10 k ★) | Orchestration batch | Orchestration batch mature ; Apache-2.0 ; non conçu pour agents. |
| `argoproj/argo-workflows` | https://github.com/argoproj/argo-workflows | Apache-2.0 | Go | 17 040 | 2026-10-15 | Établi (≥ 10 k ★) | Workflows K8s | Workflows Kubernetes ; Apache-2.0. |
| `camunda/camunda` | https://github.com/camunda/camunda | Camunda License 1.0 (non OSI) | Java | 4 319 | 2026-10-16 | Établi (1–10 k ★) | Orchestration (Zeebe) | Orchestration BPMN (Zeebe) ; Camunda License 1.0 (source disponible, non OSI ; usage de production payant selon le texte). |
| `cadence-workflow/cadence` | https://github.com/cadence-workflow/cadence | Apache-2.0 | Go | 9 504 | 2026-10-19 | Établi (1–10 k ★) | Exécution durable | Workflows durables (ancêtre de Temporal) ; Apache-2.0. |
| `dapr/dapr` | https://github.com/dapr/dapr | Apache-2.0 | Go | 26 138 | 2026-10-13 | Établi (≥ 10 k ★) | Runtime applicatif (workflows) | Runtime distribué (workflows, état, messages) ; Apache-2.0. |
| `flyteorg/flyte` | https://github.com/flyteorg/flyte | Apache-2.0 | Go | 7 715 | 2026-10-16 | Établi (1–10 k ★) | Orchestration ML | Orchestration ML et données ; Apache-2.0. |
| `celery/celery` | https://github.com/celery/celery | BSD (LICENSE) | Python | 28 992 | 2026-10-15 | Établi (≥ 10 k ★) | File de tâches | File de tâches classique Python ; BSD (LICENSE). |
| `graphile/worker` | https://github.com/graphile/worker | MIT | TypeScript | 2 411 | 2026-10-09 | Établi (1–10 k ★) | File de tâches (Postgres) | File de tâches sur Postgres (Node) ; MIT. |
| `iii-hq/iii` | https://github.com/iii-hq/iii | Apache-2.0 (page GitHub) | Rust | 18 848 | 2026-10-18 | Établi (≥ 10 k ★) | Backend événementiel | Ex MotiaDev/motia (redirigé) ; backend événementiel ; Apache-2.0 (page GitHub). |
| `conductor-oss/conductor` | https://github.com/conductor-oss/conductor | Apache-2.0 | Java | 32 334 | 2026-10-18 | Établi (≥ 10 k ★) | Orchestration (successeur Netflix Conductor) | Successeur communautaire de Netflix Conductor ; Apache-2.0. |

### Points d'attention

- **Licences restrictives** : Restate (BSL 1.1), Inngest (SSPL 1.0 pour le serveur), n8n (Sustainable Use), Windmill (Apache-2.0 + AGPL + EE), Camunda (Camunda License 1.0, usage de production payant selon le texte).
- **Archivé** : Netflix Conductor (13/12/2023) ; utiliser `conductor-oss/conductor` (Apache-2.0).
- **Temporal** : MIT pour le serveur et le SDK Python, ce qui confirmé le choix de §3 et §11 (la base cité `temporalio>=1.29,<1.30`).
- **Activité** : Cadence, Temporal et Hatchet ont un push en octobre 2026 ; vérifier la dernière release avant engagement.

## 5. MCP et connecteurs (SDK, passerelles, catalogues, intégrations OAuth)

**Candidats signalés** : SDK MCP officiels (Python, TypeScript) ; FastMCP ; IBM MCP Context Forge ; MetaMCP ; Composio (MIT) ; dlt (Apache-2.0) ; Meltano (MIT).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `modelcontextprotocol/python-sdk` | https://github.com/modelcontextprotocol/python-sdk | MIT, transition vers Apache-2.0 | Python | 24 620 | 2026-10-17 | Établi (≥ 10 k ★) | SDK MCP officiel | SDK MCP officiel ; MIT (transition vers Apache-2.0 annoncée dans le dépôt). |
| `modelcontextprotocol/typescript-sdk` | https://github.com/modelcontextprotocol/typescript-sdk | MIT, transition vers Apache-2.0 | TypeScript | 13 592 | 2026-10-14 | Établi (≥ 10 k ★) | SDK MCP officiel | SDK MCP officiel TypeScript ; transition MIT vers Apache-2.0 annoncée (LICENSE). |
| `modelcontextprotocol/servers` | https://github.com/modelcontextprotocol/servers | MIT, transition vers Apache-2.0 | JavaScript | 91 293 | 2026-10-13 | Établi (≥ 10 k ★) | Serveurs MCP de référence | Serveurs MCP de référence ; transition de licence ; auditer chaque serveur avant usage. |
| `modelcontextprotocol/registry` | https://github.com/modelcontextprotocol/registry | MIT, transition vers Apache-2.0 | Go | 7 378 | 2026-10-14 | Établi (1–10 k ★) | Registre MCP | Registre MCP ; Apache-2.0 pour le nouveau code. |
| `modelcontextprotocol/inspector` | https://github.com/modelcontextprotocol/inspector | MIT, transition vers Apache-2.0 | TypeScript | 11 090 | 2026-10-14 | Établi (≥ 10 k ★) | Débogage MCP | Outil de debogage MCP ; transition de licence. |
| `PrefectHQ/fastmcp` | https://github.com/PrefectHQ/fastmcp | Apache-2.0 | Python | 28 137 | 2026-10-19 | Établi (≥ 10 k ★) | Framework MCP | Framework MCP Python très utilisé ; Apache-2.0 ; cité par wong2/awesome-mcp-servers. |
| `IBM/mcp-context-forge` | https://github.com/IBM/mcp-context-forge | Apache-2.0 | Python | 4 654 | 2026-10-19 | Établi (1–10 k ★) | Passerelle/registre MCP | Passerelle et registre MCP (gouvernance, authentification) ; Apache-2.0 ; absent de wong2/awesome-mcp-servers. |
| `metatool-ai/metamcp` | https://github.com/metatool-ai/metamcp | MIT | TypeScript | 2 709 | 2026-06-22 | Établi (1–10 k ★) | Passerelle MCP | Agrégateur et passerelle MCP ; MIT ; absent de wong2/awesome-mcp-servers ; dernière activité juin 2026. |
| `docker/mcp-gateway` | https://github.com/docker/mcp-gateway | MIT | Go | 1 603 | 2026-09-23 | Établi (1–10 k ★) | Passerelle MCP | Passerelle MCP de Docker ; MIT ; activité septembre 2026. |
| `punkpeye/awesome-mcp-servers` | https://github.com/punkpeye/awesome-mcp-servers | MIT | n.d. | 96 613 | 2026-10-18 | Établi (≥ 10 k ★) | Catalogue | Catalogue (métadonnées lues, README non lu en détail) ; MIT ; liste et non logiciel. |
| `wong2/awesome-mcp-servers` | https://github.com/wong2/awesome-mcp-servers | MIT | n.d. | 4 360 | 2026-07-13 | Établi (1–10 k ★) | Catalogue | Catalogue lu (README brut, 538 entrées) ; MIT ; indique ne pas accepter de PR. |
| `sparfenyuk/mcp-proxy` | https://github.com/sparfenyuk/mcp-proxy | MIT | Python | 2 787 | 2026-10-14 | Établi (1–10 k ★) | Proxy MCP | Proxy MCP stdio/SSE ; MIT ; cité par wong2/awesome-mcp-servers. |
| `supercorp-ai/supergateway` | https://github.com/supercorp-ai/supergateway | MIT | TypeScript | 2 918 | 2026-10-20 | Établi (1–10 k ★) | Proxy MCP | Passerelle stdio vers SSE/WebSocket ; MIT ; absent de wong2/awesome-mcp-servers. |
| `mcp-use/mcp-use` | https://github.com/mcp-use/mcp-use | MIT | TypeScript | 10 794 | 2026-10-21 | Établi (≥ 10 k ★) | Client/agents MCP | Client et agents MCP TypeScript ; MIT ; actif. |
| `stacklok/toolhive` | https://github.com/stacklok/toolhive | Apache-2.0 | Go | 2 299 | 2026-10-19 | Établi (1–10 k ★) | Exécution MCP | Exécution sécurisée de serveurs MCP ; Apache-2.0 ; cité par wong2/awesome-mcp-servers. |
| `lastmile-ai/mcp-agent` | https://github.com/lastmile-ai/mcp-agent | Apache-2.0 | Python | 8 572 | 2026-01-25 | Établi (1–10 k ★) | Agents MCP | Agents construits sur MCP ; Apache-2.0 ; dernière activité janvier 2026. |
| `awslabs/mcp` | https://github.com/awslabs/mcp | Apache-2.0 | Python | 9 799 | 2026-10-20 | Établi (1–10 k ★) | Serveurs MCP (AWS) | Collection de serveurs MCP AWS ; Apache-2.0. |
| `github/github-mcp-server` | https://github.com/github/github-mcp-server | MIT | Go | 33 817 | 2026-10-21 | Établi (≥ 10 k ★) | Serveur MCP GitHub | Serveur MCP GitHub officiel ; MIT ; cité par wong2/awesome-mcp-servers. |
| `NangoHQ/nango` | https://github.com/NangoHQ/nango | Elastic License 2.0 | TypeScript | 12 822 | 2026-10-18 | Établi (≥ 10 k ★) | Connecteurs OAuth | Connecteurs OAuth et intégrations ; Elastic License 2.0 (non OSI) : contrainte pour un SaaS. |
| `airbytehq/airbyte` | https://github.com/airbytehq/airbyte | Elastic License 2.0 (racine) | Python | 22 248 | 2026-10-20 | Établi (≥ 10 k ★) | Connecteurs données | Connecteurs de données ; Elastic License 2.0 à la racine (non OSI) : vérifier le périmètre des connecteurs. |
| `ComposioHQ/composio` | https://github.com/ComposioHQ/composio | MIT | TypeScript | 30 651 | 2026-10-20 | Établi (≥ 10 k ★) | Intégrations agents | Integrations pour agents (grand catalogue d'outils) ; MIT. |
| `PipedreamHQ/pipedream` | https://github.com/PipedreamHQ/pipedream | Source Available (non OSI) | JavaScript | 11 752 | 2026-10-16 | Établi (≥ 10 k ★) | Intégrations (composants) | Composants d'integration ; Pipedream Source Available License (non OSI). |
| `meltano/meltano` | https://github.com/meltano/meltano | MIT | Python | 2 663 | 2026-10-19 | Établi (1–10 k ★) | Connecteurs (Singer) | ELT (Singer) ; MIT (GitHub) ; aussi sur GitLab (voir section forges). |
| `dlt-hub/dlt` | https://github.com/dlt-hub/dlt | Apache-2.0 | Python | 5 996 | 2026-10-21 | Établi (1–10 k ★) | Connecteurs Python | Connecteurs et chargement de données en Python ; Apache-2.0. |
| `obot-platform/obot` | https://github.com/obot-platform/obot | MIT | Go | 1 110 | 2026-10-19 | Établi (1–10 k ★) | Plateforme MCP | Plateforme MCP (catalogue, gouvernance) ; MIT ; jeune. |

### Points d'attention

- **🆕 Transition de licence MCP** : les dépôts `modelcontextprotocol/*` (SDK, servers, registry, inspector) annoncent un passage de MIT à Apache-2.0 ; le nouveau code est Apache-2.0. À figer par version dans les dépendances.
- **Connecteurs non OSI** : Nango et Airbyte sous Elastic License 2.0 (racine), Pipedream en Source Available. À éviter dans un produit distribué sans lecture juridique.
- **Catalogues** : `wong2/awesome-mcp-servers` (lu, 538 entrées) cité fastmcp, composio, e2b, github-mcp, mcp-proxy et toolhive, mais ne cité ni IBM ContextForge, ni MetaMCP, ni Supergateway, ni Nango. Un catalogue n'est pas une preuve de maturité.
- **Passerelles MCP** : maturité inégale ; MetaMCP à un dernier push de juin 2026.

## 6. Bacs à sable et exécution de code

**Candidats signalés** : E2B (SDK Apache-2.0 et runtime Apache-2.0) ; microsandbox (Apache-2.0, micro-VM Rust) ; gVisor, Firecracker, Kata (isolation bas niveau) ; Pyodide (WebAssembly) ; Piston (exécution de code, MIT).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `e2b-dev/E2B` | https://github.com/e2b-dev/E2B | Apache-2.0 | Python | 14 385 | 2026-10-14 | Établi (≥ 10 k ★) | Bac à sable (SDK) | SDK de bac à sable pour agents (cloud et auto-hébergement) ; Apache-2.0. |
| `e2b-dev/runtime` | https://github.com/e2b-dev/runtime | Apache-2.0 | Go | 1 714 | 2026-10-14 | Établi (1–10 k ★) | Bac à sable (infra) | Ex e2b-dev/infra (redirigé) ; runtime d'infrastructure E2B ; Apache-2.0. |
| `daytonaio/daytona` | https://github.com/daytonaio/daytona | AGPL-3.0 (v0.190.0) | n.d. | 71 515 | 2026-07-24 | Non maintenu (dépôt figé depuis juin 2026) | Bac à sable (workspaces) | NON MAINTENU : dépôt figé depuis juin 2026 (développement passé en privé). AGPL-3.0 (LICENSE v0.190.0). |
| `superradcompany/microsandbox` | https://github.com/superradcompany/microsandbox | Apache-2.0 | Rust | 8 752 | 2026-10-21 | Établi (1–10 k ★) | Micro-VM | Ex zerocore-ai/microsandbox (redirigé) ; micro-VM en Rust ; Apache-2.0 ; actif. |
| `google/gvisor` | https://github.com/google/gvisor | Apache-2.0 | Go | 19 718 | 2026-10-19 | Établi (≥ 10 k ★) | Isolation (noyau) | Noyau d'isolation (runsc) ; Apache-2.0 ; mature, mais ingénierie infra nécessaire. |
| `firecracker-microvm/firecracker` | https://github.com/firecracker-microvm/firecracker | Apache-2.0 | Rust | 37 361 | 2026-10-14 | Établi (≥ 10 k ★) | Micro-VM | Micro-VM (AWS) ; Apache-2.0 ; brique bas niveau. |
| `kata-containers/kata-containers` | https://github.com/kata-containers/kata-containers | Apache-2.0 | Rust | 8 964 | 2026-10-17 | Établi (1–10 k ★) | Conteneurs isolés (VM) | Conteneurs isolés par VM ; Apache-2.0. |
| `jupyter-server/kernel_gateway` | https://github.com/jupyter-server/kernel_gateway | BSD-3-Clause | Python | 562 | 2024-03-12 | Peu actif (> 12 mois) | Exécution de code (Jupyter) | Exécution de noyaux Jupyter via HTTP ; BSD-3 ; dernière activité mars 2024. |
| `pyodide/pyodide` | https://github.com/pyodide/pyodide | MPL-2.0 | Python | 14 893 | 2026-10-15 | Établi (≥ 10 k ★) | Python dans navigateur/WASM | Python dans WebAssembly (navigateur) ; MPL-2.0 ; limite pour du calcul serveur. |
| `kubernetes-sigs/agent-sandbox` | https://github.com/kubernetes-sigs/agent-sandbox | Apache-2.0 | Go | 4 318 | 2026-10-19 | Établi (1–10 k ★) | Bac à sable K8s | Bac à sable d'agents sur Kubernetes ; Apache-2.0 ; jeune. |
| `google/nsjail` | https://github.com/google/nsjail | Apache-2.0 | C++ | 4 162 | 2026-10-02 | Établi (1–10 k ★) | Isolation de processus | Isolation de processus ; Apache-2.0. |
| `containers/bubblewrap` | https://github.com/containers/bubblewrap | LGPL-2.0+ (COPYING) | C | 9 151 | 2026-10-14 | Établi (1–10 k ★) | Isolation de processus | Isolation légère par espaces de noms ; LGPL-2.0+ (COPYING). |
| `engineer-man/piston` | https://github.com/engineer-man/piston | MIT | JavaScript | 2 832 | 2026-07-31 | Établi (1–10 k ★) | Exécution de code | Exécution de code multi-langages ; MIT ; actif. |
| `judge0/judge0` | https://github.com/judge0/judge0 | GPL-3.0 | HTML | 4 474 | 2026-10-08 | Établi (1–10 k ★) | Exécution de code | Exécution de code (concours et évaluation) ; GPL-3.0 (copyleft). |
| `coder/coder` | https://github.com/coder/coder | AGPL-3.0 | Go | 17 113 | 2026-10-20 | Établi (≥ 10 k ★) | Environnements de dev | Environnements de développement distants ; AGPL-3.0 : contraintes en SaaS. |
| `hyperlight-dev/hyperlight` | https://github.com/hyperlight-dev/hyperlight | Apache-2.0 | Rust | 4 742 | 2026-10-19 | Établi (1–10 k ★) | Micro-VM (WASM) | Micro-VM / WebAssembly (Microsoft) ; Apache-2.0 ; jeune. |
| `bytecodealliance/wasmtime` | https://github.com/bytecodealliance/wasmtime | Apache-2.0 | Rust | 18 740 | 2026-10-20 | Établi (≥ 10 k ★) | Runtime WASM | Runtime WebAssembly ; Apache-2.0 ; base possible pour exécuter du code isolé. |
| `wasmerio/wasmer` | https://github.com/wasmerio/wasmer | MIT | Rust | 21 179 | 2026-10-20 | Établi (≥ 10 k ★) | Runtime WASM | Runtime WebAssembly ; MIT. |
| `lxc/incus` | https://github.com/lxc/incus | Apache-2.0 | Go | 6 448 | 2026-10-20 | Établi (1–10 k ★) | Conteneurs/VM système | Conteneurs et VM système ; Apache-2.0. |
| `cloudflare/workerd` | https://github.com/cloudflare/workerd | Apache-2.0 | C++ | 9 013 | 2026-10-19 | Établi (1–10 k ★) | Runtime isolé | Runtime JavaScript isolé ; Apache-2.0 ; pas un bac à sable généraliste. |

### Points d'attention

- **🆕 Daytona** : le dépôt public est figé depuis juin 2026 (développement passé en privé, selon le README). Licence AGPL-3.0 au tag v0.190.0. À ne pas retenir comme base.
- **Copyleft** : Coder (AGPL-3.0), Judge0 (GPL-3.0).
- **Infrastructure** : les briques bas niveau (gVisor, Firecracker, Kata) sont matures mais demandent une ingénierie d'exploitation lourde.

## 7. Document AI et OCR

**Candidats signalés** : Docling (MIT) et MarkItDown (MIT) pour la conversion ; OCRmyPDF (MPL-2.0) ; PaddleOCR et olmOCR (Apache-2.0) ; dots.ocr et DeepSeek-OCR (MIT, VLM, GPU).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `docling-project/docling` | https://github.com/docling-project/docling | MIT | Python | 69 023 | 2026-10-16 | Établi (≥ 10 k ★) | Document AI (conversion) | Conversion de documents (PDF, Office) en Markdown/JSON ; MIT ; forte traction et actif. |
| `datalab-to/marker` | https://github.com/datalab-to/marker | Apache-2.0 (code) ; poids OpenRAIL-M | Python | 40 517 | 2026-10-14 | Établi (≥ 10 k ★) | PDF vers Markdown | PDF vers Markdown ; code Apache-2.0 mais poids OpenRAIL-M modifiés (gratuit pour startups de moins de 5 M$, sinon licence commerciale). |
| `opendatalab/MinerU` | https://github.com/opendatalab/MinerU | Apache-2.0 + conditions | Python | 82 053 | 2026-10-19 | Établi (≥ 10 k ★) | PDF vers Markdown | PDF vers Markdown ; Apache-2.0 + conditions additionnelles (LICENSE.md) à lire avant usage. |
| `allenai/olmocr` | https://github.com/allenai/olmocr | Apache-2.0 | Python | 19 748 | 2026-03-25 | Établi (≥ 10 k ★) | OCR (VLM) | OCR par VLM ; Apache-2.0 ; GPU requis ; dernière activité mars 2026. |
| `datalab-to/surya` | https://github.com/datalab-to/surya | Apache-2.0 (code) ; poids OpenRAIL-M | Python | 21 506 | 2026-09-11 | Établi (≥ 10 k ★) | OCR multilingue | OCR multilingue ; code Apache-2.0, poids OpenRAIL-M modifiés (mêmes conditions que Marker). |
| `PaddlePaddle/PaddleOCR` | https://github.com/PaddlePaddle/PaddleOCR | Apache-2.0 | Python | 91 427 | 2026-09-16 | Établi (≥ 10 k ★) | OCR | OCR et analyse de structure très complets ; Apache-2.0 ; écosystème Paddle. |
| `tesseract-ocr/tesseract` | https://github.com/tesseract-ocr/tesseract | Apache-2.0 | C++ | 77 023 | 2026-10-10 | Établi (≥ 10 k ★) | OCR | OCR classique ; Apache-2.0 ; moins bon sur mises en page complexes. |
| `Unstructured-IO/unstructured` | https://github.com/Unstructured-IO/unstructured | Apache-2.0 | HTML | 15 572 | 2026-10-16 | Établi (≥ 10 k ★) | Partitionnement de documents | Partitionnement de documents pour RAG ; Apache-2.0. |
| `microsoft/markitdown` | https://github.com/microsoft/markitdown | MIT | Python | 191 295 | 2026-10-04 | Établi (≥ 10 k ★) | Conversion vers Markdown | Conversion de documents vers Markdown ; MIT ; très diffusé. |
| `studio-dots-ai/dots.ocr` | https://github.com/studio-dots-ai/dots.ocr | MIT | Python | 9 179 | 2026-03-24 | Établi (1–10 k ★) | OCR (VLM) | Ex rednote-hilab/dots.ocr (redirigé) ; OCR par VLM ; MIT. |
| `deepseek-ai/DeepSeek-OCR` | https://github.com/deepseek-ai/DeepSeek-OCR | MIT | Python | 24 020 | 2026-01-27 | Établi (≥ 10 k ★) | OCR (VLM) | OCR par VLM ; MIT (dépôt) ; GPU requis. |
| `ocrmypdf/OCRmyPDF` | https://github.com/ocrmypdf/OCRmyPDF | MPL-2.0 | Python | 35 026 | 2026-10-12 | Établi (≥ 10 k ★) | OCR de PDF | Ajoute une couche texte aux PDF scannés ; MPL-2.0. |
| `pymupdf/PyMuPDF` | https://github.com/pymupdf/PyMuPDF | AGPL-3.0 ou commerciale | Python | 10 910 | 2026-10-15 | Établi (≥ 10 k ★) | Lecture PDF | Lecture et rendu PDF rapides ; AGPL-3.0 ou licence commerciale : risque pour un SaaS. |
| `mindee/doctr` | https://github.com/mindee/doctr | Apache-2.0 | Python | 6 390 | 2026-10-16 | Établi (1–10 k ★) | OCR | OCR par apprentissage profond ; Apache-2.0. |
| `JaidedAI/EasyOCR` | https://github.com/JaidedAI/EasyOCR | Apache-2.0 | Python | 30 073 | 2025-12-05 | Établi (≥ 10 k ★) | OCR | OCR multi-langues simple ; Apache-2.0 ; dernière activité décembre 2025. |
| `py-pdf/pypdf` | https://github.com/py-pdf/pypdf | BSD (LICENSE) | Python | 10 263 | 2026-10-17 | Établi (≥ 10 k ★) | PDF (Python) | Manipulation de PDF en Python ; BSD (LICENSE). |
| `apache/tika` | https://github.com/apache/tika | Apache-2.0 | Java | 4 100 | 2026-10-19 | Établi (1–10 k ★) | Extraction de contenu | Extraction de contenu et métadonnées (Java) ; Apache-2.0. |
| `gotenberg/gotenberg` | https://github.com/gotenberg/gotenberg | MIT | Go | 13 343 | 2026-10-16 | Établi (≥ 10 k ★) | Conversion de documents | Conversion de documents via API (Chromium, LibreOffice) ; MIT. |
| `Ucas-HaoranWei/GOT-OCR2.0` | https://github.com/Ucas-HaoranWei/GOT-OCR2.0 | Non vérifiée (LICENSE absent) | Python | 8 224 | 2025-02-10 | Peu actif (> 12 mois) | OCR (VLM) | OCR par VLM ; LICENSE absent ; le badge de licence pointe vers un autre dépôt ; poids Apache-2.0 (tag HF). |
| `facebookresearch/nougat` | https://github.com/facebookresearch/nougat | MIT | Python | 10 085 | 2025-02-21 | Peu actif (> 12 mois) | OCR académique | OCR de documents scientifiques ; MIT ; dernière activité février 2025. |
| `datalab-to/chandra` | https://github.com/datalab-to/chandra | Apache-2.0 | Python | 12 508 | 2026-06-26 | Établi (≥ 10 k ★) | OCR (VLM) | OCR par VLM ; Apache-2.0 ; poids non vérifiés. |
| `xberg-io/xberg` | https://github.com/xberg-io/xberg | MIT | Rust | 9 427 | 2026-10-19 | Établi (1–10 k ★) | Extraction de documents | Ex kreuzberg-dev/kreuzberg (redirigé) ; extraction de documents ; MIT. |
| `jsvine/pdfplumber` | https://github.com/jsvine/pdfplumber | MIT | Python | 10 824 | 2026-10-15 | Établi (≥ 10 k ★) | Extraction de tableaux PDF | Extraction de texte et de tableaux PDF ; MIT. |
| `apache/pdfbox` | https://github.com/apache/pdfbox | Apache-2.0 | Java | 3 130 | 2026-10-18 | Établi (1–10 k ★) | PDF (Java) | Bibliothèque PDF Java ; Apache-2.0. |
| `pypdfium2-team/pypdfium2` | https://github.com/pypdfium2-team/pypdfium2 | Non vérifiée (README : libérale) | Python | 839 | 2026-10-15 | Émergent (< 1 k ★) | Rendu PDF | Liaison Python vers PDFium (rendu) ; licence libérale (README) ; fichier LICENSE non lu. |
| `microsoft/table-transformer` | https://github.com/microsoft/table-transformer | MIT | Python | 2 948 | 2024-06-24 | Archivé | Détection de tableaux | Détection de tableaux ; ARCHIVÉ le 21/09/2026. |

### Points d'attention

- **🆕 Marker et Surya** : code Apache-2.0 mais poids sous licence OpenRAIL-M modifiée (gratuits pour les startups de moins de 5 M$ de financement ou de revenus, sinon licence commerciale). Contrainte à traiter avant intégration.
- **PyMuPDF** : AGPL-3.0 ou licence commerciale : risque réel pour un SaaS.
- **MinerU** : Apache-2.0 avec conditions additionnelles (`LICENSE.md`) à lire avant usage.
- **GOT-OCR2.0** : pas de fichier `LICENSE` ; le badge de licence du README pointe vers un autre dépôt (`stanford_alpaca`). Statut juridique incertain pour le code.
- **Archivé** : table-transformer (21/09/2026).

## 8. Audio : transcription, synthèse, agents vocaux

**Candidats signalés** : faster-whisper et Whisper (MIT) ; WhisperX (BSD-2) ; Kokoro et sherpa-onnx (Apache-2.0) ; LiveKit Agents (Apache-2.0, base de §3 et §11) ; Pipecat (BSD-2) ; Speaches (MIT, API compatible OpenAI) ; Kyutai (moshi, delayed-streams-modeling, unmute).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `openai/whisper` | https://github.com/openai/whisper | MIT | Python | 110 964 | 2026-08-31 | Établi (≥ 10 k ★) | Transcription | Référence de transcription ; MIT ; actif (août 2026). |
| `SYSTRAN/faster-whisper` | https://github.com/SYSTRAN/faster-whisper | MIT | Python | 25 916 | 2026-10-16 | Établi (≥ 10 k ★) | Transcription (CTranslate2) | Whisper accéléré (CTranslate2) ; MIT ; standard pratique. |
| `m-bain/whisperX` | https://github.com/m-bain/whisperX | BSD-2-Clause | Python | 24 724 | 2026-10-18 | Établi (≥ 10 k ★) | Transcription + alignement | Alignement et horodatage mot à mot ; BSD-2. |
| `pyannote/pyannote-audio` | https://github.com/pyannote/pyannote-audio | MIT | Jupyter Notebook | 10 653 | 2026-10-07 | Établi (≥ 10 k ★) | Diarisation | Diarisation (qui parle quand) ; MIT pour le code ; certains modèles soumis à conditions Hugging Face. |
| `NVIDIA-NeMo/Speech` | https://github.com/NVIDIA-NeMo/Speech | Apache-2.0 | Python | 18 606 | 2026-10-20 | Établi (≥ 10 k ★) | ASR/TTS (Parakeet, Canary) | Ex NVIDIA-NeMo/NeMo (redirigé) ; ASR (Parakeet, Canary) ; Apache-2.0 ; poids CC-BY-4.0 (tag HF). |
| `moonshine-ai/moonshine` | https://github.com/moonshine-ai/moonshine | MIT (code et modèles) | C++ | 11 259 | 2026-10-02 | Établi (≥ 10 k ★) | Transcription edge | Transcription légère pour l'edge ; MIT (code et modèles). |
| `ggml-org/whisper.cpp` | https://github.com/ggml-org/whisper.cpp | MIT | C++ | 54 442 | 2026-10-12 | Établi (≥ 10 k ★) | Transcription (C/C++) | Whisper en C/C++ (edge) ; MIT. |
| `speechbrain/speechbrain` | https://github.com/speechbrain/speechbrain | Apache-2.0 | Python | 11 887 | 2026-10-14 | Établi (≥ 10 k ★) | Toolkit audio | Boîte à outils audio et voix ; Apache-2.0. |
| `hexgrad/kokoro` | https://github.com/hexgrad/kokoro | Apache-2.0 | JavaScript | 9 378 | 2025-08-06 | Peu actif (> 12 mois) | TTS | TTS léger ; Apache-2.0 ; dernière activité août 2025. |
| `rhasspy/piper` | https://github.com/rhasspy/piper | MIT | C++ | 11 301 | 2025-08-26 | Archivé | TTS | TTS local ; MIT mais ARCHIVÉ le 06/10/2025 (successeur ci-dessous). |
| `OHF-Voice/piper1-gpl` | https://github.com/OHF-Voice/piper1-gpl | GPL-3.0 | C++ | 5 943 | 2026-10-17 | Établi (1–10 k ★) | TTS (successeur Piper) | Successeur de Piper ; GPL-3.0 (copyleft). |
| `SWivid/F5-TTS` | https://github.com/SWivid/F5-TTS | MIT (code) ; poids CC-BY-NC-4.0 | Python | 15 414 | 2026-10-14 | Établi (≥ 10 k ★) | TTS / clonage | TTS et clonage ; code MIT, poids CC-BY-NC-4.0 (non commercial) : vérifier avant usage. |
| `resemble-ai/chatterbox` | https://github.com/resemble-ai/chatterbox | MIT | Python | 26 944 | 2026-07-21 | Établi (≥ 10 k ★) | TTS / clonage | TTS et clonage ; MIT (code) ; poids à vérifier. |
| `coqui-ai/TTS` | https://github.com/coqui-ai/TTS | MPL-2.0 (code) | Python | 46 127 | 2024-08-16 | Peu actif (> 12 mois) | TTS | TTS ; MPL-2.0 pour le code ; dernière activité août 2024 ; poids XTTS sous licence non commerciale (inférence, à vérifier). |
| `kyutai-labs/moshi` | https://github.com/kyutai-labs/moshi | Apache-2.0 | Python | 11 247 | 2026-09-09 | Établi (≥ 10 k ★) | Dialogue audio | Dialogue audio reel temps réel réel (Kyutai) ; Apache-2.0 (code) ; poids CC-BY-4.0. |
| `kyutai-labs/delayed-streams-modeling` | https://github.com/kyutai-labs/delayed-streams-modeling | Apache-2.0 | Python | 3 040 | 2026-01-26 | Établi (1–10 k ★) | STT/TTS (Kyutai) | STT et TTS Kyutai ; Apache-2.0 ; modèles CC-BY-4.0 (tag HF). |
| `livekit/agents` | https://github.com/livekit/agents | Apache-2.0 | Python | 14 875 | 2026-10-21 | Établi (≥ 10 k ★) | Agents vocaux | Framework d'agents vocaux (base de Voice agents, §3/§11) ; Apache-2.0. |
| `pipecat-ai/pipecat` | https://github.com/pipecat-ai/pipecat | BSD-2-Clause | Python | 16 547 | 2026-10-17 | Établi (≥ 10 k ★) | Agents vocaux | Framework d'agents vocaux ; BSD-2. |
| `TEN-framework/ten-framework` | https://github.com/TEN-framework/ten-framework | Apache-2.0 + conditions | Python | 11 171 | 2026-10-16 | Établi (≥ 10 k ★) | Agents vocaux | Framework d'agents vocaux ; Apache-2.0 + conditions additionnelles. |
| `snakers4/silero-vad` | https://github.com/snakers4/silero-vad | MIT | Python | 10 456 | 2026-09-29 | Établi (≥ 10 k ★) | Détection de voix | Détection d'activité vocale ; MIT. |
| `speaches-ai/speaches` | https://github.com/speaches-ai/speaches | MIT | Python | 3 723 | 2026-10-17 | Établi (1–10 k ★) | Serveur STT/TTS compatible OpenAI | Serveur STT/TTS compatible OpenAI ; MIT ; pratique pour brancher Whisper ou Kokoro. |
| `fishaudio/fish-speech` | https://github.com/fishaudio/fish-speech | Fish Audio Community (non OSI) | Python | 33 293 | 2026-10-14 | Établi (≥ 10 k ★) | TTS | TTS ; Fish Audio Community License (non OSI, usage commercial restreint). |
| `myshell-ai/OpenVoice` | https://github.com/myshell-ai/OpenVoice | MIT | Python | 38 025 | 2025-04-19 | Peu actif (> 12 mois) | Clonage de voix | Clonage de voix ; MIT ; dernière activité avril 2025. |
| `canopyai/Orpheus-TTS` | https://github.com/canopyai/Orpheus-TTS | Apache-2.0 | Python | 6 356 | 2025-12-05 | Établi (1–10 k ★) | TTS | TTS base sur un LLM ; Apache-2.0 ; dernière activité décembre 2025. |
| `SesameAILabs/csm` | https://github.com/SesameAILabs/csm | Apache-2.0 | Python | 14 727 | 2025-05-27 | Peu actif (> 12 mois) | TTS conversationnel | TTS conversationnel ; Apache-2.0 ; dernière activité mai 2025. |
| `nari-labs/dia` | https://github.com/nari-labs/dia | Apache-2.0 | Python | 19 407 | 2025-11-19 | Établi (≥ 10 k ★) | TTS dialogue | TTS de dialogue ; Apache-2.0 ; dernière activité novembre 2025. |
| `collabora/WhisperLive` | https://github.com/collabora/WhisperLive | MIT | Python | 4 322 | 2026-10-07 | Établi (1–10 k ★) | Transcription reel temps réel réel | Transcription en reel temps réel réel ; MIT. |
| `alphacep/vosk-api` | https://github.com/alphacep/vosk-api | Apache-2.0 | Jupyter Notebook | 15 189 | 2026-10-15 | Établi (≥ 10 k ★) | Reconnaissance vocale hors ligne | Reconnaissance vocale hors ligne et légère ; Apache-2.0. |
| `k2-fsa/sherpa-onnx` | https://github.com/k2-fsa/sherpa-onnx | Apache-2.0 | C++ | 15 297 | 2026-10-15 | Établi (≥ 10 k ★) | STT/TTS hors ligne | STT, TTS et VAD hors ligne (ONNX, multi-plateformes) ; Apache-2.0. |
| `linto-ai/linto-stt` | https://github.com/linto-ai/linto-stt | AGPL-3.0 | Python | 86 | 2026-09-07 | Émergent (< 1 k ★) | STT (Linagora LinTO) | STT de Linagora (France) ; AGPL-3.0 (copyleft fort pour un SaaS). |
| `kyutai-labs/unmute` | https://github.com/kyutai-labs/unmute | MIT | Python | 1 524 | 2026-09-09 | Établi (1–10 k ★) | Agent vocal (Kyutai) | Agent vocal Kyutai (STT, LLM, TTS) ; MIT ; 1 524 étoiles ; équipe française. |
| `livekit/livekit` | https://github.com/livekit/livekit | Apache-2.0 | Go | 21 605 | 2026-10-18 | Établi (≥ 10 k ★) | Serveur WebRTC (agents vocaux) | Serveur WebRTC pour agents vocaux (base §11) ; Apache-2.0. |

### Points d'attention

- **Poids non commerciaux** : F5-TTS (code MIT, poids CC-BY-NC-4.0) ; Fish Speech (licence communautaire non OSI, poids CC-BY-NC-SA pour OpenAudio S1 mini).
- **Coqui TTS** : code MPL-2.0 ; licence des poids XTTS non vérifiée ici (à contrôler sur la fiche du modèle).
- **Piper** archivé le 06/10/2025 ; son successeur `piper1-gpl` est sous GPL-3.0.
- **Copyleft** : LinTO-STT (Linagora) en AGPL-3.0 ; à mesurer face à un usage SaaS.
- **Souveraineté** : Kyutai (code permissif, modèles CC-BY-4.0) est un candidat français solide.

## 9. Personnalisation et fine-tuning

**Candidats signalés** : TRL, PEFT (Hugging Face) ; Unsloth ; Axolotl ; LlamaFactory (Apache-2.0) ; verl et OpenRLHF pour le RL ; distilabel pour les données synthétiques.

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `huggingface/trl` | https://github.com/huggingface/trl | Apache-2.0 | Python | 19 544 | 2026-10-16 | Établi (≥ 10 k ★) | Fine-tuning (SFT/RL) | SFT, DPO et RL pour LLM ; Apache-2.0 ; référence. |
| `unslothai/unsloth` | https://github.com/unslothai/unsloth | Apache-2.0 | Python | 78 255 | 2026-10-19 | Établi (≥ 10 k ★) | Fine-tuning | Fine-tuning rapide et peu gourmand ; Apache-2.0. |
| `axolotl-ai-cloud/axolotl` | https://github.com/axolotl-ai-cloud/axolotl | Apache-2.0 | Python | 12 581 | 2026-10-17 | Établi (≥ 10 k ★) | Fine-tuning | Fine-tuning piloté par configuration ; Apache-2.0. |
| `hiyouga/LlamaFactory` | https://github.com/hiyouga/LlamaFactory | Apache-2.0 | Python | 75 593 | 2026-10-19 | Établi (≥ 10 k ★) | Fine-tuning (UI) | Fine-tuning avec interface ; Apache-2.0 ; forte traction (ex LLaMA-Factory, redirigé). |
| `meta-pytorch/torchtune` | https://github.com/meta-pytorch/torchtune | BSD-3-Clause | Python | 5 818 | 2026-09-09 | Établi (1–10 k ★) | Fine-tuning PyTorch | Fine-tuning PyTorch natif ; BSD-3 ; activité jusqu'en septembre 2026 (ex pytorch/torchtune). |
| `huggingface/peft` | https://github.com/huggingface/peft | Apache-2.0 | Python | 21 804 | 2026-10-16 | Établi (≥ 10 k ★) | LoRA/PEFT | LoRA et méthodes PEFT ; Apache-2.0 ; brique standard. |
| `OpenRLHF/OpenRLHF` | https://github.com/OpenRLHF/OpenRLHF | Apache-2.0 | Python | 10 106 | 2026-10-05 | Établi (≥ 10 k ★) | RLHF distribué | RLHF distribué ; Apache-2.0 ; orienté clusters. |
| `verl-project/verl` | https://github.com/verl-project/verl | Apache-2.0 | Python | 23 955 | 2026-10-20 | Établi (≥ 10 k ★) | RL pour LLM | RL pour LLM (ex volcengine/verl) ; Apache-2.0. |
| `arcee-ai/mergekit` | https://github.com/arcee-ai/mergekit | LGPL-3.0 | Python | 7 403 | 2026-09-12 | Établi (1–10 k ★) | Fusion de modèles | Fusion de modèles ; LGPL-3.0. |
| `argilla-io/distilabel` | https://github.com/argilla-io/distilabel | Apache-2.0 | Python | 3 422 | 2026-10-12 | Établi (1–10 k ★) | Génération de données | Génération et curation de données synthétiques ; Apache-2.0. |
| `argilla-io/argilla` | https://github.com/argilla-io/argilla | Apache-2.0 | Python | 5 152 | 2026-10-12 | Établi (1–10 k ★) | Annotation de données | Annotation et curation de données ; Apache-2.0. |
| `modelscope/ms-swift` | https://github.com/modelscope/ms-swift | Apache-2.0 | Python | 15 903 | 2026-10-20 | Établi (≥ 10 k ★) | Fine-tuning | Fine-tuning d'un large éventail de modèles ; Apache-2.0 ; écosystème ModelScope. |
| `Lightning-AI/litgpt` | https://github.com/Lightning-AI/litgpt | Apache-2.0 | Python | 13 716 | 2026-10-13 | Établi (≥ 10 k ★) | Fine-tuning/pré-entraînement | Pré-entraînement et fine-tuning simples ; Apache-2.0. |
| `allenai/open-instruct` | https://github.com/allenai/open-instruct | Apache-2.0 | Python | 3 901 | 2026-10-21 | Établi (1–10 k ★) | Post-entraînement | Recettes de post-entrainement (recherche) ; Apache-2.0. |
| `InternLM/xtuner` | https://github.com/InternLM/xtuner | Apache-2.0 | Python | 5 211 | 2026-10-17 | Établi (1–10 k ★) | Fine-tuning | Fine-tuning (écosystème InternLM) ; Apache-2.0. |
| `NVIDIA-NeMo/RL` | https://github.com/NVIDIA-NeMo/RL | Apache-2.0 | Python | 2 075 | 2026-10-20 | Établi (1–10 k ★) | RL pour modèles | RL pour modèles (NVIDIA) ; Apache-2.0 ; jeune. |
| `bitsandbytes-foundation/bitsandbytes` | https://github.com/bitsandbytes-foundation/bitsandbytes | MIT | Python | 8 528 | 2026-10-19 | Établi (1–10 k ★) | Quantification (QLoRA) | Quantification 4 et 8 bits (QLoRA) ; MIT. |
| `linkedin/Liger-Kernel` | https://github.com/linkedin/Liger-Kernel | BSD-2-Clause | Python | 6 665 | 2026-10-19 | Établi (1–10 k ★) | Noyaux d'entraînement | Noyaux Triton qui accélèrent l'entraînement ; BSD-2. |
| `huggingface/autotrain-advanced` | https://github.com/huggingface/autotrain-advanced | Apache-2.0 | Python | 4 613 | 2026-10-06 | Établi (1–10 k ★) | Fine-tuning sans code | Fine-tuning sans code ; Apache-2.0. |
| `Kiln-AI/Kiln` | https://github.com/Kiln-AI/Kiln | MIT (libs) + EULA (app) | Python | 5 193 | 2026-10-16 | Établi (1–10 k ★) | Fine-tuning et évaluation | Application de fine-tuning et d'évaluation ; librairies MIT, application sous EULA (non OSI). |
| `OpenPipe/ART` | https://github.com/OpenPipe/ART | Apache-2.0 | Python | 10 815 | 2026-10-21 | Établi (≥ 10 k ★) | RL d'agents | RL pour agents ; Apache-2.0 ; jeune. |
| `NovaSky-AI/SkyRL` | https://github.com/NovaSky-AI/SkyRL | Apache-2.0 | Python | 2 427 | 2026-10-17 | Établi (1–10 k ★) | RL d'agents | RL pour agents ; Apache-2.0. |
| `PrimeIntellect-ai/prime-rl` | https://github.com/PrimeIntellect-ai/prime-rl | Apache-2.0 | Python | 2 166 | 2026-10-16 | Établi (1–10 k ★) | RL distribué | RL distribué ; Apache-2.0 ; jeune. |
| `mistralai/mistral-finetune` | https://github.com/mistralai/mistral-finetune | Apache-2.0 | Python | 3 091 | 2026-06-16 | Archivé | Fine-tuning (Mistral) | Fine-tuning LoRA de référence Mistral ; Apache-2.0 ; ARCHIVÉ le 16/06/2026 (confirmé chap. 32). |
| `pytorch/torchtitan` | https://github.com/pytorch/torchtitan | BSD-3-Clause | Python | 5 816 | 2026-10-18 | Établi (1–10 k ★) | Pré-entraînement | Pré-entraînement PyTorch ; BSD-3. |
| `EleutherAI/gpt-neox` | https://github.com/EleutherAI/gpt-neox | Apache-2.0 | Python | 7 472 | 2026-10-11 | Établi (1–10 k ★) | Pré-entraînement | Pré-entraînement ; Apache-2.0 ; moins actif que les autres. |
| `OpenLLM-France/Lucie-Training` | https://github.com/OpenLLM-France/Lucie-Training | GPL-3.0 | Jupyter Notebook | 53 | 2026-06-02 | Émergent (< 1 k ★) | Entraînement modèles FR | Entraînement des modèles Lucie (OpenLLM-France) ; GPL-3.0 (copyleft) ; peu d'étoiles. |

### Points d'attention

- **Stack permissive** : la quasi-totalité est Apache-2.0, MIT ou BSD.
- **🆕 mistral-finetune archivé** le 16/06/2026 : l'outil officiel Mistral n'est plus maintenu (confirmé le chapitre 32).
- **Copyleft** : mergekit (LGPL-3.0), Lucie-Training (GPL-3.0).
- **Kiln** : librairies MIT mais application sous EULA (non OSI).
- **torchtune** (BSD-3) : dépôt déplacé vers `meta-pytorch/torchtune` ; activité jusqu'en septembre 2026.

## 10. Garde-fous, sécurité et évaluation LLM

**Candidats signalés** : NVIDIA NeMo Guardrails et Guardrails AI (Apache-2.0) ; Presidio (MIT, données personnelles) ; garak (Apache-2.0) ; promptfoo (MIT) ; DeepEval (Apache-2.0).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `NVIDIA-NeMo/Guardrails` | https://github.com/NVIDIA-NeMo/Guardrails | Apache-2.0 (LICENSE.md) | Python | 7 331 | 2026-10-19 | Établi (1–10 k ★) | Garde-fous | Garde-fous programmables (Colang) ; Apache-2.0 (LICENSE.md). |
| `guardrails-ai/guardrails` | https://github.com/guardrails-ai/guardrails | Apache-2.0 | Python | 7 529 | 2026-10-15 | Établi (1–10 k ★) | Garde-fous (validateurs) | Validateurs de sortie et de format ; Apache-2.0. |
| `protectai/llm-guard` | https://github.com/protectai/llm-guard | MIT | Python | 3 216 | 2026-07-08 | Archivé | Garde-fous entrée/sortie | Garde-fous entrée et sortie ; MIT ; ARCHIVÉ le 09/07/2026. |
| `data-privacy-stack/presidio` | https://github.com/data-privacy-stack/presidio | MIT | Python | 11 444 | 2026-10-19 | Établi (≥ 10 k ★) | Détection PII | Détection et anonymisation de données personnelles (ex microsoft/presidio) ; MIT ; utile RGPD. |
| `NVIDIA/garak` | https://github.com/NVIDIA/garak | Apache-2.0 | Python | 9 594 | 2026-10-16 | Établi (1–10 k ★) | Red teaming | Scanner de vulnérabilités LLM ; Apache-2.0. |
| `Azure/PyRIT` | https://github.com/Azure/PyRIT | MIT | n.d. | 120 | 2026-03-25 | Archivé | Red teaming | Red teaming ; MIT ; ARCHIVÉ le 27/03/2026 (lecture seule). |
| `meta-llama/PurpleLlama` | https://github.com/meta-llama/PurpleLlama | Llama 3.2 Community (racine) | Python | 4 443 | 2026-10-12 | Établi (1–10 k ★) | Llama Guard / sécurité | Outils de sécurité Meta (Llama Guard) ; licence racine Llama 3.2 Community (non OSI). |
| `Giskard-AI/giskard-oss` | https://github.com/Giskard-AI/giskard-oss | Apache-2.0 | Python | 5 910 | 2026-10-19 | Établi (1–10 k ★) | Tests et scan IA | Tests et scan qualité et sécurité de l'IA ; Apache-2.0 (ex giskard-ai). |
| `promptfoo/promptfoo` | https://github.com/promptfoo/promptfoo | MIT | TypeScript | 26 224 | 2026-10-21 | Établi (≥ 10 k ★) | Évaluation / red teaming | Évaluation et red teaming ; MIT ; très actif. |
| `confident-ai/deepeval` | https://github.com/confident-ai/deepeval | Apache-2.0 | Python | 19 003 | 2026-10-19 | Établi (≥ 10 k ★) | Évaluation | Évaluation de LLM en style tests unitaires ; Apache-2.0. |
| `confident-ai/deepteam` | https://github.com/confident-ai/deepteam | Apache-2.0 | Python | 3 031 | 2026-10-20 | Établi (1–10 k ★) | Red teaming | Red teaming de LLM ; Apache-2.0. |
| `unitaryai/detoxify` | https://github.com/unitaryai/detoxify | Apache-2.0 | Python | 1 307 | 2026-10-14 | Établi (1–10 k ★) | Toxicité | Détection de toxicité ; Apache-2.0 ; modèles anciens. |
| `protectai/rebuff` | https://github.com/protectai/rebuff | Apache-2.0 | TypeScript | 1 530 | 2024-08-07 | Archivé | Injection de prompt | Détection d'injection de prompt ; ARCHIVÉ. |
| `UKGovernmentBEIS/inspect_ai` | https://github.com/UKGovernmentBEIS/inspect_ai | MIT | Python | 3 044 | 2026-10-19 | Établi (1–10 k ★) | Évaluation | Cadre d'évaluation (UK AI Security Institute) ; MIT. |
| `invariantlabs-ai/invariant` | https://github.com/invariantlabs-ai/invariant | Apache-2.0 | Python | 469 | 2026-01-12 | Émergent (< 1 k ★) | Garde-fous agents | Garde-fous pour agents ; Apache-2.0 ; peu d'étoiles. |
| `whylabs/langkit` | https://github.com/whylabs/langkit | Apache-2.0 | Jupyter Notebook | 1 001 | 2024-11-22 | Peu actif (> 12 mois) | Métriques de sécurité LLM | Métriques de sécurité et qualité LLM ; Apache-2.0 ; dernière activité novembre 2024. |
| `openai/evals` | https://github.com/openai/evals | MIT (LICENSE.md) | Python | 19 613 | 2026-04-14 | Établi (≥ 10 k ★) | Évaluation | Cadre d'évaluation OpenAI ; MIT (LICENSE.md) ; dernière activité avril 2026. |

### Points d'attention

- **Archivés** : PyRIT (27/03/2026), LLM Guard (09/07/2026), Rebuff (injection de prompt).
- **Llama Guard** : le dépôt `PurpleLlama` est sous la licence Llama 3.2 Community (non OSI) ; Llama Guard 4 et Prompt Guard 2 portent la balise `other` (licence Llama probable, non lue).
- **Évaluation** : promptfoo est très actif (MIT) ; inspect_ai (MIT) est un cadre d'évaluation sérieux ; openai/evals est sous MIT (`LICENSE.md`).

## 11. Modèles open-weight : licences par famille

Licences lues sur l'API Hugging Face le 21/10/2026 : balise `license:` de chaque fiche, complétée par le champ `cardData` quand il existe. Ce n'est pas une lecture intégrale des textes : à faire pour chaque modèle retenu.

| Famille | Exemples (identifiant Hugging Face) | Balise de licence | Usage commercial (lecture de la balise) | Brique Studio | Points d'attention |
|---|---|---|---|---|---|
| Mistral, Voxtral Realtime et Small | `mistralai/Voxtral-Mini-4B-Realtime-2602` ; `mistralai/Voxtral-Small-24B-2507` | apache-2.0 | Oui | Audio (transcription) | 🆕 Poids Apache-2.0 confirmés sur ces fiches. |
| Mistral, Voxtral TTS | `mistralai/Voxtral-4B-TTS-2603` | cc-by-nc-4.0 | **Non** | Audio (synthèse) | 🆕 Poids TTS ouverts mais non commerciaux. |
| Mistral, grands modèles récents | `mistralai/Mistral-Medium-3.5-128B` ; `mistralai/Devstral-2-123B-Instruct-2512` ; `mistralai/Mistral-Large-Instruct-2411` | other ; other ; other (lien MRL-0.1) | Non tranché : lire chaque fiche (MRL-0.1 = recherche) | Chat, code | 🆕 Les grands modèles Mistral ne sont pas sous Apache-2.0 sur Hugging Face. |
| Mistral, série 7B (ancienne) | `mistralai/Mistral-7B-Instruct-v0.2` | apache-2.0 | Oui | Chat (ancienne génération) | Génération dépassée. |
| Qwen3, Qwen3.5, Qwen3.8 (denses, MoE, embeddings) | `Qwen/Qwen3-8B` ; `Qwen/Qwen3.8-27B` ; `Qwen/Qwen3-Embedding-0.6B` | apache-2.0 (majorité) | Oui | Chat, multimodal, embeddings | `Qwen3.8-Flash-Next` : qwen-community-1.0 ; `Qwen2.5-72B` : licence Qwen (other). |
| Meta Llama 4 et Llama 3.x | `meta-llama/Llama-4-Scout-17B-16E-Instruct` ; `meta-llama/Llama-3.1-8B-Instruct` | other (llama4) ; llama3.1 | Sous licence Llama (accès soumis à acceptation) | Chat | Licence communautaire non OSI. |
| Google Gemma 4 | `google/gemma-4-31B-it` ; `google/gemma-4-E4B-it` | apache-2.0 + lien vers une licence Gemma 4 | **À vérifier** | Chat, multimodal | ⚠️ La balise dit Apache-2.0 alors que la fiche renvoie à une licence Gemma 4 dédiée : lire le texte. |
| Google Gemma 3 et EmbeddingGemma | `google/gemma-3-4b-it` ; `google/embeddinggemma-300m` | gemma | Sous conditions (Gemma Terms, accès manuel) | Chat, embeddings | Accès soumis à acceptation. |
| DeepSeek V3.2, V4, R1, OCR | `deepseek-ai/DeepSeek-V3.2` ; `deepseek-ai/DeepSeek-OCR` | mit | Oui | Chat, raisonnement, OCR | Modèles très volumineux. Les séries V2 et V3 anciennes portent la balise `other`. |
| Zhipu GLM | `zai-org/GLM-5.2` (mit) ; `zai-org/GLM-5.3` (other) ; `zai-org/GLM-OCR` (mit) | mit ; other ; mit | Partiel | Chat, OCR | ⚠️ GLM-5.3 passé sous licence propre (`glm-5.3`) alors que GLM-5.2 est MIT. |
| Moonshot Kimi | `moonshotai/Kimi-K2.6` ; `moonshotai/Kimi-Linear-48B-A3B-Instruct` | other (modified-mit) ; mit | Sous réserve de la clause « modified MIT » (à lire) | Chat, agents | Clause de modification à lire. |
| MiniMax M2.x | `MiniMaxAI/MiniMax-M2.7` | other | À lire (licence MiniMax) | Agents, code | Licence propre. |
| OpenAI gpt-oss | `openai/gpt-oss-120b` ; `openai/gpt-oss-20b` | apache-2.0 | Oui (balise) | Chat, raisonnement, agents | Politique d'usage à lire (non vérifiée ici). |
| OpenAI Whisper | `openai/whisper-large-v3-turbo` | mit | Oui | Transcription | Référence de transcription. |
| IBM Granite 4.x | `ibm-granite/granite-4.1-3b` ; `ibm-granite/granite-docling-258M` ; `ibm-granite/granite-speech-4.1-2b` | apache-2.0 | Oui | Chat, Document AI, STT | Famille permissive. |
| Microsoft Phi et VibeVoice | `microsoft/Phi-3.5-mini-instruct` ; `microsoft/VibeVoice-1.5B` ; `microsoft/VibeVoice-ASR` | mit | Oui | Chat, TTS, STT | Familles permissives. |
| NVIDIA Nemotron 3 | `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16` ; `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16` | other (nvidia-nemotron-open-model-license) | Oui sous licence NVIDIA (à lire) | Chat, agents | Licence « open model » spécifique. |
| NVIDIA Parakeet (ASR) | `nvidia/parakeet-tdt-0.6b-v3` | cc-by-4.0 | Oui (attribution) | Transcription | Attribution requise. |
| LiquidAI LFM2.5 | `LiquidAI/LFM2.5-8B-A1B` ; `LiquidAI/LFM2.5-1.2B-Instruct` | other (lfm1.0) | À lire | Edge, chat | Licence maison. |
| Swiss AI Apertus | `swiss-ai/Apertus-70B-Instruct-2509` ; `swiss-ai/Apertus-8B-Instruct-2509` | apache-2.0 | Oui | Chat multilingue (dont français) | Modèles publics suisses. |
| EuroLLM (utter-project) | `utter-project/EuroLLM-22B-Instruct-2512` ; `utter-project/EuroLLM-9B-Instruct-2512` | apache-2.0 | Oui | Chat multilingue européen | Projet européen. |
| OpenLLM-France Luciole et Lucie | `OpenLLM-France/Luciole-23B-Instruct-1.1` ; `OpenLLM-France/Luciole-8B-Instruct-1.1` | apache-2.0 | Oui (balise) | Chat en français | `Claire-7B-0.1` : cc-by-nc-sa-4.0 (non commercial). |
| PleIAs | `PleIAs/Pleias-RAG-1B` ; `PleIAs/OCRonos` | apache-2.0 | Oui | RAG, OCR | Petits modèles. |
| BSC Salamandra et ALIA | `BSC-LT/salamandra-7b-instruct` ; `BSC-LT/ALIA-40b-instruct-2606` | apache-2.0 | Oui | Chat (langues ibériques) | Projet public espagnol. |
| TII Falcon-H1 et Falcon3 | `tiiuae/Falcon-H1-7B-Instruct` ; `tiiuae/Falcon3-7B-Instruct` | other (falcon-llm-license) | À lire | Chat | Licence propre. |
| Hugging Face SmolLM3 | `HuggingFaceTB/SmolLM3-3B` | apache-2.0 | Oui | Petits modèles, edge | Petit modèle. |
| Kyutai (STT, TTS, Helium) | `kyutai/stt-2.6b-en-trfs` ; `kyutai/tts-1.6b-en_fr` ; `kyutai/helium-1-2b` | cc-by-4.0 ; helium-1-2b : cc-by-sa-4.0 | Oui (attribution ; partage à l'identique pour Helium) | STT, TTS, LLM | Atout de souveraineté. |
| BAAI BGE-M3 | `BAAI/bge-m3` | mit | Oui | Embeddings multilingues | Très téléchargé sur HF. |
| Qwen3-Embedding, Nomic, Snowflake | `Qwen/Qwen3-Embedding-0.6B` ; `nomic-ai/nomic-embed-text-v1.5` ; `Snowflake/snowflake-arctic-embed-l-v2.0` | apache-2.0 | Oui | Embeddings | Familles permissives. |
| Jina embeddings et reranker v3 | `jinaai/jina-embeddings-v3` ; `jinaai/jina-reranker-v3` | cc-by-nc-4.0 | **Non** | Embeddings, reranking | ⚠️ Non commercial. |
| NVIDIA reranking | `nvidia/llama-nemotron-rerank-1b-v2` | other | À lire | Reranking | Licence NVIDIA. |
| OCR par VLM : LightOn, olmOCR, Granite Docling | `lightonai/LightOnOCR-2-1B` ; `allenai/olmOCR-2-7B-1025` ; `ibm-granite/granite-docling-258M` | apache-2.0 | Oui | Document AI | Candidats OCR permissifs. |
| Fish Audio OpenAudio S1 mini | `fishaudio/openaudio-s1-mini` | cc-by-nc-sa-4.0 (accès automatique) | **Non** | TTS | ⚠️ Non commercial. |
| F5-TTS | `SWivid/F5-TTS` | cc-by-nc-4.0 | **Non** | TTS | ⚠️ Code MIT, poids non commerciaux. |
| Modèles de garde Meta | `meta-llama/Llama-Guard-4-12B` ; `meta-llama/Llama-Prompt-Guard-2-86M` | other | À lire (licence Llama probable) | Garde-fous | Non lue. |

### Points d'attention (modèles)

- **Balise ≠ texte** : la balise vient de la fiche Hugging Face. Pour chaque modèle retenu, lire le fichier de licence du dépôt.
- **Non commercial** : Voxtral TTS, Jina, F5-TTS, OpenAudio S1 mini et Claire excluent un usage commercial sans accord.
- **Accès conditionnel** : Llama, Gemma 3 et Llama Guard demandent une acceptation manuelle.
- **Volume ≠ qualité** : les téléchargements Hugging Face sont un indicateur d'usage, pas une mesure de performance.

## 12. Ajout : observabilité et évaluation (brique « Traces » et « Évaluations » de §3)

**Candidats signalés** : Langfuse (MIT hors `ee/`) ; OpenLLMetry (Apache-2.0, instrumentation OpenTelemetry) ; Opik (Apache-2.0) ; conventions sémantiques GenAI d'OpenTelemetry (Apache-2.0).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `langfuse/langfuse` | https://github.com/langfuse/langfuse | MIT + ee/ commercial | TypeScript | 36 076 | 2026-10-20 | Établi (≥ 10 k ★) | Observabilité / évaluation | Traces, évaluations et prompts ; MIT hors ee/ ; très actif. |
| `Arize-ai/phoenix` | https://github.com/Arize-ai/phoenix | Elastic License 2.0 | Python | 11 874 | 2026-10-16 | Établi (≥ 10 k ★) | Observabilité / évaluation | Traces et évaluations (OpenTelemetry) ; Elastic License 2.0 (non OSI). |
| `traceloop/openllmetry` | https://github.com/traceloop/openllmetry | Apache-2.0 | Python | 7 502 | 2026-10-13 | Établi (1–10 k ★) | Traces OpenTelemetry LLM | Instrumentation OpenTelemetry pour LLM ; Apache-2.0 (base OTel, §11). |
| `comet-ml/opik` | https://github.com/comet-ml/opik | Apache-2.0 | Python | 22 776 | 2026-10-20 | Établi (≥ 10 k ★) | Observabilité / évaluation | Traces et évaluations LLM ; Apache-2.0. |
| `evidentlyai/evidently` | https://github.com/evidentlyai/evidently | Apache-2.0 | Jupyter Notebook | 7 996 | 2026-09-29 | Établi (1–10 k ★) | Évaluation / monitoring | Évaluation et monitoring ; Apache-2.0. |
| `mozilla-ai/lumigator` | https://github.com/mozilla-ai/lumigator | Apache-2.0 | Python | 282 | 2026-05-11 | Archivé | Évaluation de modèles | Évaluation de modèles ; ARCHIVÉ le 14/05/2026. |
| `open-telemetry/semantic-conventions` | https://github.com/open-telemetry/semantic-conventions | Apache-2.0 | Jinja | 672 | 2026-10-15 | Émergent (< 1 k ★) | Conventions GenAI (OTel) | Conventions GenAI d'OpenTelemetry ; Apache-2.0 (base OTel, §3). |

### Points d'attention

- **Licences** : Phoenix est sous Elastic License 2.0 (non OSI) ; Langfuse à des dossiers `ee/` commerciaux.
- **Base OpenTelemetry** : les conventions GenAI et OpenLLMetry confirment l'approche OTel de §3 et §11.
- **Archivé** : lumigator (14/05/2026).

## 13. Ajout : RAG, mémoire, bases vectorielles et interfaces

**Candidats signalés** : Qdrant, Chroma, Milvus, LanceDB (Apache-2.0) ; pgvector (PostgreSQL License) ; Vespa (Apache-2.0, base de §11) ; RAGFlow (Apache-2.0) ; Mem0 et Cognee (Apache-2.0).

| Projet | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---:|---|---|---|---|
| `infiniflow/ragflow` | https://github.com/infiniflow/ragflow | Apache-2.0 | Go | 92 427 | 2026-10-17 | Établi (≥ 10 k ★) | RAG (documents) | RAG documentaire (Go) ; Apache-2.0 ; forte traction. |
| `mem0ai/mem0` | https://github.com/mem0ai/mem0 | Apache-2.0 | Python | 67 564 | 2026-10-21 | Établi (≥ 10 k ★) | Mémoire d'agents | Mémoire pour agents ; Apache-2.0. |
| `topoteretes/cognee` | https://github.com/topoteretes/cognee | Apache-2.0 | Python | 32 561 | 2026-10-20 | Établi (≥ 10 k ★) | Mémoire / graphe | Mémoire et graphe de connaissances ; Apache-2.0. |
| `getzep/graphiti` | https://github.com/getzep/graphiti | Apache-2.0 | Python | 31 987 | 2026-10-19 | Établi (≥ 10 k ★) | Graphe temporel | Graphe de connaissances temporel ; Apache-2.0. |
| `chroma-core/chroma` | https://github.com/chroma-core/chroma | Apache-2.0 | Rust | 29 510 | 2026-10-15 | Établi (≥ 10 k ★) | Base vectorielle | Base vectorielle ; Apache-2.0. |
| `qdrant/qdrant` | https://github.com/qdrant/qdrant | Apache-2.0 | Rust | 35 141 | 2026-10-19 | Établi (≥ 10 k ★) | Base vectorielle | Base vectorielle (Rust) ; Apache-2.0 (base §3). |
| `weaviate/weaviate` | https://github.com/weaviate/weaviate | BSD-3 + Weaviate License (EE) | Go | 16 894 | 2026-10-20 | Établi (≥ 10 k ★) | Base vectorielle | Base vectorielle ; BSD-3 (cœur) + Weaviate License pour l'entreprise. |
| `milvus-io/milvus` | https://github.com/milvus-io/milvus | Apache-2.0 | Go | 46 416 | 2026-10-18 | Établi (≥ 10 k ★) | Base vectorielle | Base vectorielle distribuée ; Apache-2.0. |
| `pgvector/pgvector` | https://github.com/pgvector/pgvector | PostgreSQL License | C | 23 390 | 2026-10-15 | Établi (≥ 10 k ★) | Vecteurs (Postgres) | Vecteurs dans PostgreSQL ; PostgreSQL License (base §3). |
| `vespa-engine/vespa` | https://github.com/vespa-engine/vespa | Apache-2.0 | Java | 7 133 | 2026-10-20 | Établi (1–10 k ★) | Recherche/RAG | Moteur de recherche et RAG (base §3) ; Apache-2.0. |
| `lancedb/lancedb` | https://github.com/lancedb/lancedb | Apache-2.0 | Rust | 11 706 | 2026-10-19 | Établi (≥ 10 k ★) | Base vectorielle | Base vectorielle embarquée ; Apache-2.0. |
| `onyx-dot-app/onyx` | https://github.com/onyx-dot-app/onyx | MIT + ee/ | Python | 32 543 | 2026-10-17 | Établi (≥ 10 k ★) | RAG / recherche d'entreprise | Recherche d'entreprise et RAG ; MIT hors ee/ (Onyx Enterprise). |
| `Mintplex-Labs/anything-llm` | https://github.com/Mintplex-Labs/anything-llm | MIT | JavaScript | 67 406 | 2026-10-21 | Établi (≥ 10 k ★) | RAG (application) | Application RAG et agents ; MIT. |
| `LibreChat-AI/LibreChat` | https://github.com/LibreChat-AI/LibreChat | MIT | TypeScript | 46 049 | 2026-10-20 | Établi (≥ 10 k ★) | Interface de chat | Interface de chat multi-modèles ; MIT ; interface hors périmètre moteur. |
| `open-webui/open-webui` | https://github.com/open-webui/open-webui | Open WebUI License (marque) | Python | 156 278 | 2026-10-20 | Établi (≥ 10 k ★) | Interface de chat | Interface de chat ; Open WebUI License (clause de marque) ; hors périmètre moteur. |
| `huggingface/sentence-transformers` | https://github.com/huggingface/sentence-transformers | Apache-2.0 | Python | 19 205 | 2026-10-21 | Établi (≥ 10 k ★) | Embeddings (bibliothèque) | Bibliothèque d'embeddings et de reranking ; Apache-2.0. |

### Points d'attention

- **Partiel** : Weaviate (BSD-3 pour le cœur, licence Weaviate pour l'entreprise) ; Onyx (MIT hors `ee/`).
- **Interfaces** : Open WebUI (licence avec clause de marque) et LibreChat sont des interfaces de chat, hors périmètre du moteur, mentionnées pour information.

## Forges hors GitHub : GitLab et Codeberg

La recherche publique GitLab (26 requêtes) et Codeberg (6 requêtes) ne remonte presque rien de pertinent pour le moteur IA. Les projets ci-dessous sont les seuls retenus après filtrage. Les étoiles GitLab viennent de l'API GitLab (elles diffèrent parfois des métadonnées ecosyste.ms pour le même dépôt).

| Projet | Forge | URL | Licence | Langage | ★ | Dernière activité | Maturité | Brique Studio couverte | Forces / limites |
|---|---|---|---|---|---:|---|---|---|---|
| `meltano/meltano` | GitLab | https://gitlab.com/meltano/meltano | MIT (GitHub) | Python | 554 | 2024-09-11 (GitLab) | Copie GitLab non alimentée | Connecteurs (ELT) | Le développement actif est sur GitHub (`meltano/meltano`, ★ 2 663, activité octobre 2026) ; ne pas prendre la copie GitLab comme référence. |
| `fforster/gitlab-mcp` | GitLab | https://gitlab.com/fforster/gitlab-mcp | MIT (ecosyste.ms) | n.d. | 85 (API GitLab ; 4 selon ecosyste.ms) | 2026-10-22 | Émergent | MCP (connecteur GitLab) | Serveur MCP pour GitLab ; écart de ★ entre sources, licence à relire. |
| `aadnk/whisper-webui` | GitLab | https://gitlab.com/aadnk/whisper-webui | Apache-2.0 (ecosyste.ms) | n.d. | 54 | 2026-10-03 | Émergent | Audio (interface) | Interface web pour Whisper : utile pour tester, pas un moteur. |
| `Jaco-Assistant/Scribosermo` | GitLab | https://gitlab.com/Jaco-Assistant/Scribosermo | LGPL-3.0 (LICENSE brut) | n.d. | 55 | 2026-07-13 | Émergent | Audio (ASR) | Copyleft faible ; boîte à outils ASR. |
| `mkiol/dsnote` | GitLab | https://gitlab.com/mkiol/dsnote | Non déclarée (API GitLab) | n.d. | 20 | 2026-10-12 | Émergent | Audio (STT de bureau) | Application de bureau ; licence à vérifier avant tout usage. |
| `goern/forgejo-mcp` | Codeberg | https://codeberg.org/goern/forgejo-mcp | Non vérifiée | Go | 131 | 2026-10-10 | Émergent | MCP (Forgejo) | Serveur MCP pour Forgejo ; licence non lisible via l'API Codeberg. |
| `tazz4843/whisper-rs` | Codeberg | https://codeberg.org/tazz4843/whisper-rs | Non vérifiée | Rust | 68 | 2026-03-15 | Émergent | Audio (liaison whisper.cpp) | Liaison Rust ; activité datant de mars 2026. |

## Focus européen et français (souveraineté)

| Projet | Acteur | Ce que c'est | Licence vérifiée | Remarque |
|---|---|---|---|---|
| `etalab-ia/OpenGateLLM` (`https://github.com/etalab-ia/OpenGateLLM`) | DINUM (France) | Passerelle LLM compatible OpenAI | MIT (LICENSE brut, © DINUM 2024) | 214 ★ ; 🆕 absent de la base. Le dépôt `etalab-ia/albert-api` n'a pas été trouvé. |
| `kyutai-labs/moshi`, `kyutai-labs/delayed-streams-modeling`, `kyutai-labs/unmute` | Kyutai (France) | Dialogue audio, STT/TTS, agent vocal | Apache-2.0 / MIT ; modèles CC-BY-4.0 | Non comparé au chapitre 19 (audio). |
| `OpenLLM-France/Lucie-Training`, modèles Luciole | OpenLLM-France | Entraînement et modèles LLM en français | GPL-3.0 (entraînement) ; Luciole : apache-2.0 (balise) | Claire : CC-BY-NC-SA (non commercial). |
| `linto-ai/LinTO-STT` | Linagora (France) | Transcription (STT) | AGPL-3.0 | Copyleft fort pour un SaaS. Le dépôt `linagora/LinTO-STT` n'a pas été trouvé. |
| `PleIAs/*` (modèles) | Pleias (France) | Petits modèles, RAG, OCR | apache-2.0 (balise) | Petits modèles. |
| `dust-tt/dust` | Dust (France) | Plateforme d'agents | MIT | 1 490 ★ : audience modeste. |
| `mistralai/client-python`, `mistral-common`, `mistral-vibe` | Mistral AI (France) | SDK, tokenisation, CLI agent | Apache-2.0 | Confirme le chapitre 32 et §11. |
| `mozilla-ai/any-llm`, `any-agent`, `llamafile` | Mozilla.ai | Abstraction multi-fournisseurs, agents, exécutable LLM | Apache-2.0 | `lumigator` archivé le 14/05/2026. |
| `swiss-ai/Apertus-*` (modèles) | Swiss AI (Suisse) | LLM public multilingue | apache-2.0 (balise) | Permissif. |
| `utter-project/EuroLLM-*` (modèles) | Projet européen utter-project | LLM multilingue européen | apache-2.0 (balise) | Permissif. |
| `BSC-LT/salamandra-*`, `ALIA` | Barcelona Supercomputing Center (Espagne) | LLM public ibériques | apache-2.0 (balise) | Permissif. |

## Comparaison avec la base existante

Comparaison limitée aux sections §3 et §11 de `00-synthese.md`, et au chapitre 32 pour les SDK. Les autres chapitres n'ont pas été relus en détail.

- **Confirmé** :
  - Temporal, MIT (serveur et SDK Python), pour Workflows (§3, §11).
  - LiveKit Agents et serveur LiveKit, Apache-2.0, pour les agents vocaux (§3, §11).
  - Conventions OpenTelemetry GenAI, Apache-2.0 (§3, « Traces »).
  - Vespa (Apache-2.0), pgvector (PostgreSQL License) et Qdrant (Apache-2.0) pour la recherche (§11).
  - SDK Mistral `client-python` et `client-ts` en Apache-2.0, `mistral-common` en Apache-2.0, CLI Vibe en Apache-2.0, cookbook en MIT (§11, chapitre 32).
  - `mistral-finetune` archivé (chapitre 32).
- **🆕 Nouveau par rapport à la base** :
  - Transition de licence MIT vers Apache-2.0 pour les dépôts `modelcontextprotocol/*`.
  - Voxtral TTS 4B en CC-BY-NC-4.0 (non commercial) ; grands modèles Mistral récents sous licences `other` ou MRL-0.1.
  - Gemma 4 : balise Apache-2.0 mais lien vers une licence Gemma 4 dédiée.
  - Daytona : dépôt public non maintenu depuis juin 2026 ; AGPL-3.0.
  - Archivages nouveaux ou non relevés dans la base : TGI, Flowise, Chainlit, TensorZero, Netflix Conductor, Piper, PyRIT, LLM Guard, lumigator, table-transformer.
  - Marker et Surya : code Apache-2.0 mais poids OpenRAIL-M modifiés (seuil de 5 M$).
- **⚠️ Nuances** :
  - Chapitre 32 : `mistral-vibe` annoncé à 5 177 ★, contre 5 132 selon ecosyste.ms au 21/10/2026 (écart d'horodatage, pas de licence).
  - §11 indique qu'aucun dépôt GitHub public n'a été trouvé pour le Search Toolkit : non recherché ici.

## Annexe : méthode et sources

**Listes awesome consultées** : `wong2/awesome-mcp-servers` (README brut lu, 538 entrées) ; `punkpeye/awesome-mcp-servers` (métadonnées seulement, README non lu). Aucune autre liste n'a été consultée.

**Sources de métadonnées** :
- ecosyste.ms : `repos.ecosyste.ms` (GitHub et GitLab.com) pour 294 dépôts GitHub et 5 dépôts GitLab ; `packages.ecosyste.ms` pour les paquets (vérifications ponctuelles).
- Fichiers `LICENSE` bruts (`raw.githubusercontent.com`) pour 55 dépôts ambigus ou restrictifs, et README bruts pour les cas à double licence (Daytona, Marker, Surya, MinerU, pypdfium2, GOT-OCR2.0, AutoGen `LICENSE-CODE`, Kiln).
- Pages `github.com` : résolution des 285 identifiants (14 dépôts déplacés ou renommés, remis à jour) ; bannières « archived by the owner » pour 15 dépôts.
- Hugging Face : API `api/models` (listing de 38 organisations, balises de licence) et `api/models/<id>` (`cardData`) pour 25 modèles demandés (un refus HTTP 401).
- GitLab : API `projects` publique, 26 requêtes de recherche (llm, inference engine, llm gateway, mcp server, ocr, speech to text, text to speech, agent framework, workflow engine, rag, fine-tuning, sandbox code execution, vector database, guardrails, whisper, vllm, langchain, ollama, llama.cpp, model context protocol, temporal workflow, kokoro tts, docling, openai compatible api, speech recognition, large language model inference).
- Codeberg : API `/api/v1/repos/search`, 6 requêtes (llm, inference, agent, mcp, whisper, ocr) ; API `repos` pour 2 dépôts (licence non renvoyée).

**Règle de maturité** (dérivée, à titre indicatif) : *Archivé* si le dépôt est archivé sur GitHub ; *Non maintenu* si le README l'indique ; *Peu actif* si le dernier push date de plus de 12 mois ; *Établi (≥ 10 k ★)* ; *Établi (1–10 k ★)* ; *Émergent (< 1 k ★)*.

**Non trouvés ou exclus** : `etalab-ia/albert-api` (introuvable) ; `linagora/LinTO-STT` (introuvable, l'organisation publie sous `linto-ai`) ; `pinecone-io/pinecone-python-client` (introuvable) ; `Pleias/Pleias-Rag` (0 ★, dernière mise à jour février 2025, exclu) ; `cloudflare/sandbox-sdk` (licence dans `packages/sandbox`, non classée).

**Limites** :
- Étoiles et dates : instantané du 21/10/2026 ; ecosyste.ms peut avoir quelques jours de retard, et ses ★ GitLab peuvent différer de l'API GitLab.
- Licences : valeurs SPDX d'ecosyste.ms, corrigées par le fichier brut dans les cas listés. Ce ne sont pas des avis juridiques.
- Modèles : licences par balise Hugging Face ; les textes complets n'ont pas été lus pour tous les modèles.
- Aucun code n'a été installé, exécuté ni audité ; la sécurité et les performances ne sont pas évaluées.
- Prix et tarifs exclus, conformément à la consigne.
- Les projets de la catégorie 13 et les interfaces de chat (Open WebUI, LibreChat) sont hors périmètre strict du moteur ; ils sont listés pour information.

