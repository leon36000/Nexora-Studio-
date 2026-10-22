# 14 — Observabilité, traces et évaluations

> **Périmètre** : suite « Observability » de Mistral AI Studio — collecte de traces OpenTelemetry (envoi, rédaction des données sensibles, Trace Explorer), évaluations hors ligne (Evaluation SDK `mistralai-evaluations` : datasets, tasks, evaluators/LLM-as-judge, goals, statistiques, system params, optimisation de prompts, guides avancés), plugin d'évaluation pour Mistral Workflows (`mistralai-workflows-plugins-evaluations`), intégrations d'observabilité tierces ; complété par une vérification ciblée de la spec OpenAPI locale (endpoints REST `/v1/observability/*`, dont *judges*, *datasets* et *pipelines* non décrits dans les pages). · **Sources** : 28 pages de docs.mistral.ai (copie du 21/10/2026) + spec OpenAPI locale (grep ciblé) · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

- [1. En bref](#1-en-bref)
- [2. Concepts et vocabulaire](#2-concepts-et-vocabulaire)
- [3. Fonctionnalités en détail](#3-fonctionnalités-en-détail)
  - 3.1 Statut, accès et rôles
  - 3.2 Envoi de traces (SDK, Workflows, Vibe, OTEL personnalisé)
  - 3.3 Rédaction des données sensibles
  - 3.4 Trace Explorer (contenu d'une trace, langage de recherche, accès programmatique)
  - 3.5 Évaluations hors ligne : modèle mental, installation, quickstart
  - 3.6 Datasets
  - 3.7 Tasks
  - 3.8 Evaluators (règles, LLM-as-judge, `Score`, réduction de variance, consignes de juge)
  - 3.9 Goals, direction et normalisation
  - 3.10 Statistiques
  - 3.11 System params
  - 3.12 Organisation dans Studio : Projects, Evaluations, Runs, tags, metadata, statuts
  - 3.13 Affichage des résultats (`run.show`)
  - 3.14 Guides avancés (context objects, mode local, évaluateurs multiples, run evaluators, `num_generations`, relance des enregistrements échoués, rescoring)
  - 3.15 Optimisation de prompts et de paramètres
  - 3.16 Plugin d'évaluation Workflows
  - 3.17 Intégrations d'observabilité tierces
- [4. Interface utilisateur](#4-interface-utilisateur)
- [5. API et SDK](#5-api-et-sdk)
- [6. Limites, quotas, tarifs, disponibilité](#6-limites-quotas-tarifs-disponibilité)
- [7. Détails fins, pièges, cas particuliers, dépréciations](#7-détails-fins-pièges-cas-particuliers-dépréciations)
- [8. Questions ouvertes / incohérences relevées dans la doc](#8-questions-ouvertes--incohérences-relevées-dans-la-doc)
- [Annexe — Couverture](#annexe--couverture)

---

## 1. En bref

- **Ce que c'est** : « Observability » est la suite de Studio qui sert à déboguer et mesurer des applications IA non déterministes. Elle a **deux capacités distinctes** : les **Traces** (ce que l'application a *fait* en production) et les **Offline evaluations** (à quel point elle l'a *bien* fait, et si elle progresse ou régresse quand on modifie le pipeline).
- **Statut** : **Private Preview**, réservée aux **organisations de niveau Enterprise** (accès via le représentant Mistral). L'usage pendant la Private Preview est **inclus dans le plan Enterprise** ; la tarification « peut changer » à la disponibilité générale (GA). Les évaluations hors ligne sont elles aussi « Enterprise-tier only ».
- **Traces** : chaque requête devient une **trace** = arbre de **spans** (une opération par span : appel LLM, appel d'outil, étape de workflow), chacun portant entrée, sortie, latence, nombre de tokens et statut. Collecte via **OpenTelemetry** (OTLP/HTTP JSON) depuis le SDK Mistral (Python, TypeScript), Workflows, Vibe Code CLI, Vibe Code Web, Vibe Work, ou toute application instrumentée OTEL. **Rétention : 30 jours.** Le Studio Playground n'émet pas de traces.
- **Rédaction côté client activée par défaut** (modes `default`, `strict`, `none`, + politique personnalisée dans les SDK) : les spans sont nettoyés sur la machine productrice avant export ; best-effort, à base d'expressions régulières. Seule exception : un pipeline OpenTelemetry « maison », où il faut l'activer explicitement (`RedactingSpanExporter`).
- **Trace Explorer** (Studio › Observability › Traces, `https://console.mistral.ai/observability/traces`) : recherche par un **langage d'expressions** (`AND`/`OR`/`NOT`, `LIKE`, `REGEXP`, `BETWEEN`, `IN`, `EXISTS`, fonctions de tableaux `has`/`hasany`/`hasall`, attributs de span en notation `span_attributes['clé']`), arbre de spans dépliable, API REST beta.
- **Évaluations hors ligne** : package Python `mistralai-evaluations` (Python 3.12+). Modèle mental `Dataset → Task → Evaluators → Results`. Résultats affichés dans le terminal et téléversés dans Studio sous **Observability › Evaluate › Evaluations**, organisés en **Projects › Evaluations › Runs** (graphiques de tendance, distributions, filtres, vue détaillée d'un run).
- **Fonctions avancées du SDK** : évaluateurs au niveau du run (`RunEvaluator`), plusieurs générations par enregistrement (`num_generations`), statistiques déclaratives (percentiles, somme, précision/rappel/F1 avec matrice de confusion), goals (portes pass/fail), mode local, **relance des seuls enregistrements en échec** (`retry_failed_records`), **re-notation** de runs persistés sans ré-exécuter la tâche (`rescore`), et **optimisation automatique** de prompts/paramètres (`optimize`, algorithmes `SimpleOptimizer` et `GEPA`, à partir de la version 0.6.0).
- **Plugin Workflows** (`mistralai-workflows-plugins-evaluations`) : même API `evaluation.run()`, mais chaque enregistrement devient un *child workflow* Temporal, chaque tâche/scorer une activité avec timeout, retries et concurrence configurables par décorateur.
- **Intégrations tierces** documentées (liens) : LangSmith, Langfuse, Arize Phoenix, Weights & Biases Weave, MLflow, phospho.
- **API REST beta** (spec OpenAPI) : `/v1/observability/...` couvre traces, spans, logs, datasets (avec imports depuis fichier, Playground, spans, autre dataset), projets/évaluations/runs/optimisations, et deux objets **absents des pages de doc lues** : **judges** (juges LLM sauvegardés, de type `CLASSIFICATION` ou `REGRESSION`, exécutables en « live judging ») et **pipelines** (évaluations en ligne de type `judge-v1`, `detection-v1`, `moderation-v1`, `export-v1`, avec échantillonnage).

---

## 2. Concepts et vocabulaire

| Terme original | Définition (FR) |
|---|---|
| **Observability** | Suite Studio regroupant Traces et Offline evaluations. Private Preview, Enterprise. |
| **Trace** | Représentation d'une requête de bout en bout : arbre de spans ; identifiée par un **Trace ID**. |
| **Span** | Une opération de la chaîne d'exécution (appel LLM, appel d'outil, étape de workflow), avec input, output, latence, tokens, statut. |
| **OpenTelemetry (OTEL)** | Standard de télémétrie utilisé pour la collecte ; Mistral reçoit en OTLP/HTTP (JSON). |
| **OpenTelemetry GenAI semantic conventions** | Conventions de nommage des spans/attributs pour l'IA générative (`gen_ai.*`), à suivre pour un envoi « Custom ». |
| **Source** | Produit ayant généré la trace : SDK, Workflows, Vibe Code CLI, Vibe Code Web, Vibe Work. |
| **Tags (trace)** | Tags personnalisés issus de l'usage SDK + métadonnées automatiques (ex. nom du modèle). |
| **Trace Explorer** | Écran Studio de recherche, filtrage et inspection des traces. |
| **Search expression language** | Langage de conditions sur les champs de trace, combinables par `AND`, `OR`, `NOT`. |
| **`span_attributes['key']`** | Accès à n'importe quel attribut OTEL de span dans une recherche. |
| **Conversation Tracing** | Interrupteur de workspace activant le traçage de Vibe Work et Vibe Code Web. |
| **Client-side redaction** | Masquage appliqué au niveau de l'exporteur OTEL, avant que le span ne quitte le processus. |
| **Redaction policy / mode** | `default` (orienté contenu), `strict` (orienté clés), `none` (aucun), Custom (SDK uniquement). |
| **`AttributeRedactionPolicy`** | Classe SDK correspondant à la politique stricte, orientée clés. |
| **`RedactingSpanExporter`** | Enveloppe d'exporteur OTEL fournie par le SDK pour rédiger dans un pipeline OTEL maison. |
| **Dedicated mode** | Mode de télémétrie où le SDK gère lui-même l'exporteur (2ᵉ argument `"dedicated"` en TS) ; la rédaction par défaut y est active. Aussi : « dedicated deployment » = déploiement dédié Mistral (où certains réglages deviennent configurables). |
| **Observability Viewer** | Rôle de workspace donnant un accès en lecture seule à toutes les traces du workspace. |
| **Offline evaluation** | Évaluation hors production : un jeu de cas de test passé dans le pipeline, sorties notées selon des critères maîtrisés. |
| **Evaluation SDK** | Package Python `mistralai-evaluations` (import `mistralai.evaluations`). |
| **Dataset** | Liste d'enregistrements d'entrée (dicts Python) **ou** dataset géré dans Studio (`Dataset(slug=…)`/`Dataset(id=…)`). |
| **Input record** | Un cas de test (dict libre), accessible via `ctx.input_record`. |
| **Payload / properties / source** (dataset Studio) | `payload` = l'objet d'entrée qui devient l'input record ; `properties` = propriétés du record (non transmises à la tâche) ; `source` = provenance (`EXPLORER`, `UPLOADED_FILE`, `DIRECT_INPUT`, `PLAYGROUND`, `TELEMETRY_SPAN` d'après l'OpenAPI). |
| **Task** | Fonction (async ou sync) qui reçoit un `TaskContext` et produit une sortie : le code évalué. |
| **Generation** | Une exécution de la tâche pour un record ; `num_generations` > 1 répète la tâche N fois. |
| **Evaluator** | Métrique par enregistrement : nom + scorer + options (description, goal, statistiques, direction…). |
| **Scorer** | Fonction recevant un `ScorerContext` et renvoyant un score (nombre, `str`/`bool`, ou `Score`). |
| **Rule-based scorer** | Scorer déterministe en code (rapide, gratuit). |
| **LLM-as-judge** | Scorer qui appelle un modèle pour noter (utilité, exactitude factuelle, ton…). |
| **`Score`** | Objet score riche : `value`, `rationale` (justification stockée dans Studio), `metadata`. |
| **`num_scores`** | Nombre de passes de notation par génération, moyennées (réduit le bruit des juges). |
| **Run evaluator (`RunEvaluator`)** | Évaluateur exécuté une fois sur l'ensemble des résultats (F1, porte globale, analyse inter-records). |
| **Goal** | Porte pass/fail sur un score : `Goal.gte`, `Goal.lte`, `Goal.between`. |
| **`aggregate_goal`** | Goal au niveau agrégé (moyenne) — **déprécié** au profit des goals attachés aux statistiques. |
| **Direction** | `"maximize"` / `"minimize"` : sens « meilleur » d'une métrique (inféré du goal si absent). |
| **Normalisation (`min_value`/`max_value`)** | Fenêtre min-max ramenant la métrique sur [0, 1]. |
| **`weight`** | Pression d'optimisation (défaut 1.0) ; `0` = contrainte pure exclue de l'objectif. |
| **Statistic** | Valeur de niveau run exposée par un evaluator (`avg`, `sum`, `min`, `max`, `std`, `count`, `pXX`, `precision`, `recall`, `f1`). |
| **Headline statistic** | Première statistique de la liste effective ; affichée dans l'en-tête du tableau des runs (convention d'affichage, non persistée). |
| **System** | Configuration externalisée du pipeline évalué (`name` + `params` libres), visible et comparable dans Studio. |
| **Project / Evaluation / Run** | Dossier de tests / test nommé ré-exécuté dans le temps / une exécution de `evaluation.run()`. |
| **Local mode** | `local=True` : aucune donnée envoyée à Studio. |
| **Heartbeat** | Signal périodique envoyé à Studio pendant un run ; sans lui, Studio marque le run `cancelled`. |
| **Record metadata / Run metadata** | Métadonnées dérivées après notation via callbacks (`record_metadata`, `metadata` fonction). |
| **Execution artifact / Scoring layer** | Les deux couches d'un run persisté : sorties produites une fois / notes ajoutables ou remplaçables. |
| **Task-only run** | Run lancé avec `evaluators=[]` : sorties persistées sans notes, à noter plus tard. |
| **Rescore** | Re-notation des sorties persistées sans ré-exécuter la tâche (sémantique patch). |
| **`StaleRunEvaluatorWarning`** | Avertissement typé : un run evaluator persisté non recalculé peut être devenu obsolète. |
| **Retry failed records** | Ré-exécution des seuls records en statut `"error"` et correction en place du run. |
| **Optimization** | Recherche automatique d'un meilleur prompt / jeu de paramètres, notée avec les mêmes evaluators. |
| **`Tunable` / `TunableSystem`** | Emplacement optimisable (valeur *seed* + `bounds` éventuelles) / système contenant au moins un `Tunable`. |
| **Seed / baseline** | Valeur initiale d'un `Tunable` = génération 0 = référence. |
| **Candidate** | Un jeu concret de valeurs essayé par l'optimiseur ; chaque candidat est un vrai run d'évaluation. |
| **Objective** | Nombre unique « plus haut = mieux » maximisé par l'optimiseur, dérivé des scores des evaluators. |
| **Gate** | Seuil (`Goal`) qu'un candidat doit franchir pour pouvoir gagner. |
| **`SimpleOptimizer`** | Optimiseur glouton (*hill-climb*). |
| **`GEPA`** | Optimiseur réflexif basé sur une frontière de Pareto, multi-objectif. |
| **D_pareto / D_feedback / Holdout** | Partitions GEPA : validation fixe / réservoir de mini-batchs de réflexion / jeu jamais vu pour le chiffre final. |
| **`steer`** | Texte libre décrivant le problème à corriger, lu par le mutateur réflexif (≤ 4 000 caractères). |
| **Mutator** | Composant qui propose de nouveaux candidats (par défaut : mutateur LLM réflexif « diagnostiquer puis réécrire »). |
| **Verdict** | Issue d'une optimisation : `"success"`, `"best_attempt"`, `"no_change"`. |
| **Trajectory** | Liste ordonnée de tous les candidats explorés. |
| **Workflow evaluation plugin** | Package `mistralai-workflows-plugins-evaluations` : évaluations exécutées dans Mistral Workflows (Temporal). |
| **Task mode** | Forme de la tâche dans le plugin : activité, classe workflow, nom de workflow. |
| **Building blocks** | Étapes de `evaluation.run()` exposées séparément (`setup`, `upload_inputs`, `score`, `upload`). |
| **`EvalResult`** | Résultat sérialisable de `run()`/`rescore()` dans le plugin. |
| **Judge** (API) | Juge LLM sauvegardé dans le workspace (OpenAPI) : modèle, instructions, sortie classification/régression, outils. |
| **Pipeline** (API) | Configuration d'évaluation/traitement en ligne sur la télémétrie (OpenAPI) : sélecteurs, définitions, échantillonnage. |

---

## 3. Fonctionnalités en détail

### 3.1 Statut, accès et rôles

| Élément | Valeur |
|---|---|
| Statut | **Private Preview** (traces et suite Observability) |
| Plan | **Enterprise** uniquement ; activation via représentant Mistral |
| Tarif | Inclus dans le plan Enterprise pendant la Private Preview ; « peut changer à la GA » |
| Rétention des traces | **30 jours** |
| Envoi de traces | Une **clé API Mistral valide** suffit : ni rôle particulier ni *feature flag* |
| Lecture des traces | Organisation Enterprise **et** l'un des rôles ci-dessous |

| Rôle | Accès aux traces |
|---|---|
| **Org Admin** | Toutes les traces de **tous les workspaces** |
| **Workspace Admin** | Toutes les traces de **son** workspace |
| **Observability Viewer** | Toutes les traces de son workspace, **lecture seule** |
| Autres membres | **Aucun accès** aux données de traces |

- Un Workspace Admin ou Org Admin peut attribuer le rôle **Observability Viewer** pour donner un accès lecture sans privilèges d'admin.
- FAQ sécurité : les traces sont stockées dans l'infrastructure de Mistral, accessibles seulement aux rôles adéquats du workspace, conservées 30 jours.

### 3.2 Envoi de traces

#### 3.2.1 Couverture par intégration

| Intégration | Activation | Appels LLM | Appels d'outils | Spans d'agent |
|---|---|---|---|---|
| Mistral SDK (Python) | Opt-in : `configure_telemetry` | Oui | Manuel, via `get_telemetry_tracer` | Oui |
| Mistral SDK (TypeScript) | Opt-in : `configureTelemetry` | Oui | Manuel, via `getTelemetryTracer` | Oui |
| Workflows | Automatique : `OTEL_ENABLED=true` sur le service | Oui | Oui | N/A |
| Vibe Code CLI | Opt-in : `enable_otel = true` | Oui | Oui | Oui |
| Vibe Work | Interrupteur admin dans Studio | Oui | Oui | Oui |
| Vibe Code Web | Interrupteur admin dans Studio | Oui | Oui | Oui |
| Custom (OTEL) *(ligne ajoutée ici ; absente du tableau de la doc)* | Envoi direct au collecteur | selon instrumentation | selon instrumentation | selon instrumentation |

- Toutes les sources ci-dessus **rédigent les spans côté client par défaut** avant export (sauf Custom OTEL, cf. 3.3).
- **Studio Playground n'envoie pas de traces.**

#### 3.2.2 Mistral SDK Python

- **Prérequis** : SDK Python avec l'extra `telemetry` ; exemples valables pour **`mistralai[telemetry] >= 2.4.13`**. Installation : `uv add "mistralai[telemetry]"`. La doc recommande la **dernière version** (intégration en évolution rapide pendant la Private Preview). Renvois : README « Telemetry & observability » et dossier `examples/mistral/observability` du dépôt `mistralai/client-python`.
- **Activation** : `from mistralai.extra.observability import configure_telemetry` puis `configure_telemetry(client)` après création du client `Mistral(api_key=…)` (import `from mistralai.client import Mistral`).
- **Tracé automatiquement ensuite** : tous les appels LLM, embeddings, opérations d'agents, complétions FIM et requêtes OCR.
- **Spans d'outils manuels** : les appels d'outils de l'application ne sont **pas** tracés automatiquement. `get_telemetry_tracer(client, "my-agent")` renvoie un tracer OTEL ; on ouvre des spans imbriqués :

```python
tracer = get_telemetry_tracer(client, "my-agent")
with tracer.start_as_current_span("invoke_agent"):
    response = client.chat.complete(model="mistral-small-latest", messages=[...])
    with tracer.start_as_current_span("execute_tool web_search") as tool_span:
        tool_span.set_attribute("gen_ai.tool.name", "web_search")
        tool_span.set_attribute("gen_ai.tool.call.arguments", "recent news")
        # exécuter l'outil ici
```

- Conventions visibles dans l'exemple : nom de span `invoke_agent` pour l'agent, `execute_tool <nom>` pour l'outil ; attributs `gen_ai.tool.name`, `gen_ai.tool.call.arguments`.
- FAQ : « deux lignes suffisent » (installer l'extra, appeler `configure_telemetry(client)`), tous les appels SDK suivants sont tracés.

#### 3.2.3 Mistral SDK TypeScript

- **Prérequis** : exemples valables pour **`@mistralai/mistralai >= 2.3.0`** ; dernière version recommandée.
- **Activation** : `import { configureTelemetry } from "@mistralai/mistralai/extra/observability"` puis `await configureTelemetry(client, "dedicated")` (appel **asynchrone** ; 2ᵉ argument = mode, `"dedicated"`).
- **Tracé automatiquement** : appels LLM, embeddings, opérations d'agents, FIM, OCR, **modération** et **deep research** (liste plus longue que celle du SDK Python).
- Spans d'outils : manuel via `getTelemetryTracer` (cité dans le tableau ; pas d'exemple TS fourni).

#### 3.2.4 Workflows

- Variable **`OTEL_ENABLED=true`** sur le **service Workflows** (réglage d'infrastructure). Ensuite, chaque exécution de workflow génère des traces **sans configuration par workflow**.
- Les traces de workflow incluent chaque étape : appels LLM, invocations d'outils, décisions de branchement, tentatives de retry.

#### 3.2.5 Vibe Code CLI

| Portée | Réglage |
|---|---|
| Une session | `VIBE_ENABLE_OTEL=true vibe` |
| Permanent | `enable_otel = true` dans `~/.vibe/config.toml` |

- Avertissement : les traces contiennent les **arguments et résultats d'appels d'outils**, potentiellement sensibles ; rédigés côté client par défaut.

#### 3.2.6 Vibe Work et Vibe Code Web

- Activation **par workspace** par un **Workspace Admin ou Org Admin** : Studio › `Workspace > Settings > Observability` › interrupteur **Conversation Tracing**.
- Même avertissement sur les données d'outils (rédaction par défaut).

#### 3.2.7 Custom (OTEL)

| Élément | Valeur |
|---|---|
| Endpoint | `https://api.mistral.ai/telemetry/v1/traces` |
| Protocole | **OTLP/HTTP (JSON)** |
| Authentification | En-tête `Authorization: Bearer <MISTRAL_API_KEY>` |
| Feature flag | Aucun ; toute clé API valide fonctionne |
| Nommage | Suivre les **OpenTelemetry GenAI semantic conventions** |

- FAQ : un framework LLM non-Mistral peut envoyer des traces s'il suit les conventions GenAI.
- La rédaction n'est **pas** appliquée automatiquement dans ce cas (cf. 3.3).

#### 3.2.8 Vérifier l'arrivée des traces

1. Faire une ou plusieurs requêtes via l'application, puis ouvrir le Trace Explorer ; les traces apparaissent « en général en quelques secondes ».
2. Si rien n'apparaît, vérifier : (a) la clé API appartient à un **workspace Enterprise avec Observability activée** ; (b) `configure_telemetry(client)` (ou l'équivalent TS) a été appelé **avant** tout appel API ; (c) le rôle de l'utilisateur est Org Admin, Workspace Admin ou Observability Viewer.

### 3.3 Rédaction des données sensibles

#### 3.3.1 Principe

- Les spans capturent prompts, réponses, arguments et résultats d'outils, donc potentiellement **secrets et PII**. Mistral applique une **rédaction côté client** : les spans sont nettoyés sur la machine qui les produit, avant export.
- **Activée par défaut** partout où Mistral contrôle le pipeline d'export (SDK en mode dédié, Workflows, Vibe Code CLI, Vibe Code Web, Vibe Work). Exception : pipeline OTEL maison (opt-in explicite).
- **Best-effort**, à base de **regex** : retire les motifs reconnus en gardant la **structure** des spans. Avertissement explicite : « filet de sécurité, pas une garantie » ; peut manquer des PII en texte libre ou des secrets hors motifs connus ; ne pas en faire l'unique contrôle pour des données très sensibles.
- **Mécanique** : s'exécute au niveau de l'**exporteur OpenTelemetry**, donc s'applique à **tout span quelle que soit sa création** ; chaque attribut est inspecté et réécrit selon la politique active ; le span original non rédigé **ne quitte jamais le processus**. Pas d'aller-retour réseau supplémentaire ; hors du chemin critique de la requête → impact performance « négligeable ».

#### 3.3.2 Politiques

| Mode | Comportement | Compromis |
|---|---|---|
| `default` (actif) | **Orienté contenu** : scanne les valeurs `string` et rédige secrets et PII reconnus (**jetons d'API, e-mails, séquences de type carte bancaire, adresses IPv4**) en conservant clés d'attributs et structure. | Préserve l'essentiel de la valeur d'observabilité ; best-effort. |
| `strict` | **Orienté clés** : rédige les **valeurs entières des clés sensibles** et **toutes les valeurs non primitives**, puis scanne les valeurs restantes à la recherche de secrets. | Très conservateur : efface la majeure partie du contenu des prompts et réponses. |
| `none` | Aucune rédaction ; export tel que capturé. | Fidélité totale ; environnements de confiance uniquement. |
| Custom (SDK uniquement) | Politique fournie, ou **callback par attribut** décidant du masquage de chaque valeur. | Contrôle total ; logique à la charge de l'utilisateur. |

#### 3.3.3 Par source

| Source | Défaut | Configurable |
|---|---|---|
| Mistral SDK (Python) | Activée | Entièrement (y compris callback personnalisé) |
| Mistral SDK (TypeScript) | Activée | Entièrement (y compris callback personnalisé) |
| Workflows | Activée | Oui sur les workers que l'on exécute soi-même ; workers hébergés : seulement en déploiement dédié |
| Vibe Code CLI | Activée | Oui |
| Vibe Work | Activée | Seulement en déploiement dédié |
| Vibe Code Web | Activée | Seulement en déploiement dédié |
| Custom (OTEL) | **Désactivée** | Entièrement (y compris callback personnalisé) |

#### 3.3.4 Configuration

| Source | Syntaxe |
|---|---|
| SDK Python | `configure_telemetry(client)` (défaut) ; `configure_telemetry(client, redaction=AttributeRedactionPolicy())` (strict) ; `redaction=False` (désactivé) ; `redaction=lambda key, value: None if "email" in key else value` (callback par attribut) |
| SDK TypeScript | `await configureTelemetry(client)` (défaut) ; `configureTelemetry(client, "dedicated", { redaction: new AttributeRedactionPolicy() })` (strict) ; `{ redaction: false }` ; `{ redaction: (key, value) => (key.includes("email") ? undefined : value) }` |
| Workflows | Variable `OTEL_REDACTION=default` (`default` \| `strict` \| `none`) sur le service ; s'applique à chaque span avant export OTLP, **indépendamment** de l'interrupteur maître `OTEL_ENABLED`. Workers hébergés par Mistral : politique `default` imposée, sauf déploiement dédié (niveau fixé pour tout le déploiement). |
| Vibe Code CLI | Session : `VIBE_OTEL_REDACTION=strict vibe` ; permanent : `otel_redaction = "default"` dans `~/.vibe/config.toml` (`default` \| `strict` \| `none`) |
| Vibe Work / Vibe Code Web | Rédaction `default` appliquée **avant que les traces ne quittent l'infrastructure Mistral** ; non configurable en service hébergé ; en déploiement dédié, niveau fixé pour tout le déploiement. |
| Custom OTEL | Envelopper l'exporteur : `BatchSpanProcessor(RedactingSpanExporter(OTLPSpanExporter(), default_redaction_policy()))` (imports `mistralai.extra.observability` et `opentelemetry.exporter.otlp.proto.http.trace_exporter`). Le SDK TS expose le même `RedactingSpanExporter` depuis `@mistralai/mistralai/extra/observability`. |

- Dans les callbacks d'exemple, renvoyer `None` (Python) / `undefined` (TS) pour une clé donnée supprime/masque la valeur (inférence sur la sémantique exacte : la doc ne précise pas si l'attribut est supprimé ou remplacé).
- **Piège** : si l'on branche le SDK sur **sa propre configuration OpenTelemetry** au lieu de le laisser gérer le traçage, le SDK ne possède plus l'exporteur et l'argument `redaction` **n'a plus d'effet** → rédiger dans son propre pipeline.
- FAQ : pour des garanties plus fortes, utiliser `strict` ou une politique personnalisée, et ajouter d'autres contrôles.

### 3.4 Trace Explorer

Emplacement : Studio › **Observability › Traces** — `https://console.mistral.ai/observability/traces`. Prérequis : application instrumentée (3.2).

#### 3.4.1 Contenu d'une trace

| Champ | Description |
|---|---|
| **Trace ID** | Identifiant unique de la chaîne d'exécution complète |
| **Spans** | Opérations individuelles : appels LLM, appels d'outils, étapes de workflow |
| **Duration** | Durée de chaque span et de la trace totale |
| **Token counts** | Tokens d'entrée et de sortie par appel LLM |
| **Status** | Succès ou erreur, avec message d'erreur le cas échéant |
| **Source** | Produit émetteur (SDK, Workflows, Vibe Code CLI, Vibe Code Web, Vibe Work) |
| **Tags** | Tags personnalisés issus du SDK + métadonnées automatiques (ex. nom du modèle) |

Parcours : cliquer une trace dans la liste → ouvre l'**arbre de spans** ; déplier chaque span → entrées, sorties, latence, tokens à chaque étape.

Champs supplémentaires d'une trace d'après le schéma OpenAPI `GetTrace` (non décrits dans les pages) : `customer_id`, `organization_id`, `workspace_id`, `user_id`, `trace_id` (32 hex), `root_span_id` (16 hex), `root_span_name`, `start_time`, `end_time`, `duration_ns`, `service_name`, `environment`, `conversation_id`, `workflow_name`, `agent_id`, `agent_name`, `status_code` (enum `Error` | `Unset`), `error_count`, `span_count`, `gen_ai_span_count`, `llm_call_count`, `tool_call_count`, `retrieval_count`, `evaluation_count`, `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `models_used`, `tools_used`, `first_turn_last_input_message`, `first_turn_last_output_message`, `last_turn_last_input_message`, `last_turn_last_output_message`.

#### 3.4.2 Langage de recherche — opérateurs

| Catégorie | Opérateurs | Exemple |
|---|---|---|
| Comparaison | `=`, `!=`, `<`, `<=`, `>`, `>=` | `duration_ns > 5000000000` |
| Motif | `LIKE`, `ILIKE`, `NOT LIKE` | `service_name LIKE '%agent%'` |
| Sous-chaîne | `CONTAINS`, `NOT CONTAINS` | `service_name CONTAINS 'sdk'` |
| Regex | `REGEXP`, `NOT REGEXP` | `service_name REGEXP '^my-'` |
| Intervalle | `BETWEEN ... AND ...` | `duration_ns BETWEEN 1000000 AND 5000000000` |
| Liste | `IN (...)`, `NOT IN (...)` | `status_code IN ('Error', 'Ok')` |
| Nullité | `EXISTS`, `NOT EXISTS` | `error_message EXISTS` |
| Booléen | `AND`, `OR`, `NOT`, `()` | `status_code = 'Error' AND duration_ns > 1000000` |

#### 3.4.3 Champs disponibles

| Champ | Type | Description |
|---|---|---|
| `service_name` | string | Nom du service ayant produit la trace |
| `status_code` | string | Statut : `Ok` ou `Error` (selon la page ; cf. §8) |
| `duration_ns` | number | Durée totale en **nanosecondes** |
| `error_message` | string | Message d'erreur si échec |
| `start_time` | timestamp | Début de la trace (ISO 8601) |
| `models_used` | array | Modèles appelés dans la trace |
| `span_attributes['key']` | map value | N'importe quel attribut de span, notation crochets |

Exemples d'attributs : `span_attributes['gen_ai.request.model'] CONTAINS 'mistral-large'`, `span_attributes['gen_ai.operation.name'] = 'chat'`, `span_attributes['custom.tag'] EXISTS`.

#### 3.4.4 Fonctions sur les tableaux (ex. `models_used`)

| Fonction | Exemple |
|---|---|
| `CONTAINS` | `models_used CONTAINS 'mistral-medium-latest'` |
| `has(field, value)` | `has(models_used, 'mistral-medium-latest')` |
| `hasany(field, [values])` | `hasany(models_used, ['mistral-large-latest', 'mistral-small-latest'])` |
| `hasall(field, [values])` | `hasall(models_used, ['mistral-large-latest', 'mistral-small-latest'])` |

Exemples courants : traces en échec d'un service (`service_name = 'my-agent' AND status_code = 'Error'`), traces de plus de 5 s (`duration_ns > 5000000000`), traces utilisant un modèle (`span_attributes['gen_ai.request.model'] CONTAINS 'mistral-large'`).

#### 3.4.5 Accès programmatique

- Toutes les données de traces sont accessibles par l'API REST (référence API, section **beta/observability**) :
  - **Traces** (`/api/endpoint/beta/observability/traces`) : rechercher des traces, obtenir une trace, lister les champs et les options de champ.
  - **Spans** (`/api/endpoint/beta/observability/spans`) : lister les spans d'une trace, interroger les **évaluations de spans**.
- Détail des endpoints au §5.5.

#### 3.4.6 Dépannage (FAQ)

- SDK activé mais aucune trace : appeler `configure_telemetry(client)` **avant** tout appel API, faire au moins une requête, attendre quelques secondes, vérifier l'activation Observability du workspace et le rôle.
- Recherche sans résultat : retirer toutes les conditions sauf une **plage temporelle**, puis réajouter les filtres un par un ; erreur fréquente : filtrer sur `status_code = 'Error'` alors que la plupart des traces réussissent.
- Explorer invisible dans Studio : rôle Org Admin / Workspace Admin / Observability Viewer requis dans une organisation Enterprise.

### 3.5 Évaluations hors ligne : modèle mental, installation, quickstart

- **But** : définir un ensemble de cas de test, les faire passer dans le pipeline, noter les sorties selon des critères maîtrisés ; résultats téléversés dans Studio pour suivre les tendances de qualité et comparer des configurations côte à côte.
- **Trois briques** : l'**Evaluation SDK** (`mistralai-evaluations` : exécute, calcule les statistiques, téléverse ; dans Workflows → plugin `mistralai-workflows-plugins-evaluations`), les **Evaluators** (fonctions à règles ou juges LLM), les **Datasets** (liste de records avec prompts, sorties attendues, consignes de notation…).
- **Modèle mental** : `Dataset → Task → Evaluators → Results`.

| Élément | Rôle |
|---|---|
| Dataset | Liste de records (dicts) ou dataset Studio |
| Task | Fonction async/sync recevant un `TaskContext`, produit une sortie |
| Evaluators | Fonctions recevant un `ScorerContext`, notent chaque sortie |
| Results | Statistiques + scores par record, affichés au terminal et téléversés dans Studio |

**Installation** : prérequis **Python 3.12+** et clé API Mistral. `pip install mistralai-evaluations` ou `uv add mistralai-evaluations` ; `export MISTRAL_API_KEY=<your-api-key>`. Historique des versions : page PyPI du package.

**Quickstart** (fichier `eval.py`, détection de langue) : imports `Evaluation, Evaluator, Goal, Mistral, Project, ScorerContext, System, TaskContext` depuis `mistralai.evaluations` (le client `Mistral` y est ré-exporté) ; dataset de 3 dicts `{"sentence", "groundtruth"}` ; task async appelant `client.chat.complete_async` avec `model` et `system_prompt` lus dans `ctx.system.params` ; scorer 0/1 comparant `groundtruth` et sortie ; appel :

```python
run = await client.evaluation.run(
    project=Project(name="Language Detection"),
    evaluation=Evaluation(name="Accuracy Eval"),
    system=System(name="mistral-small", params={"model": "mistral-small-latest",
        "system_prompt": "What language is this sentence in? Reply with ONLY the language name."}),
    dataset=dataset, task=task,
    evaluators=[Evaluator(name="accuracy", description="1 if ... 0 otherwise.",
                          scorer=scorer, goal=Goal.gte(0.8))],
)
run.show(level="records")
```

Exécution : `uv run eval.py` → résultats au terminal et dans Studio sous **Observability > Evaluate > Evaluations**.

### 3.6 Datasets

#### 3.6.1 Deux formes

| Forme | Description |
|---|---|
| **Liste de dicts Python** | Chaque dict = un input record ; **clés libres**, choisies pour correspondre à ce qu'attend la tâche. Accès via `ctx.input_record["clé"]` dans task et scorer. |
| **Dataset Studio** | Records curés dans Studio, passés via `Dataset(slug=…)` ou `Dataset(id=…)` ; le SDK **récupère tous les records avant le démarrage** du run. |

#### 3.6.2 Dataset Studio

| Sélecteur | Usage |
|---|---|
| `Dataset(slug="language-detection-golden-set")` | Script lisible et stable |
| `Dataset(id="018f879d-20cd-7e9f-a1bc-2f4f08b6f170")` | On dispose déjà de l'UUID |

- **Exactement un** de `id` / `slug` ; `id` doit être un UUID valide. Le dataset **doit exister** : la sélection par slug **ne le crée jamais**.
- Le **`payload`** de chaque record devient l'input record **tel quel** (même dict qu'un record inline équivalent).
- **Format d'import JSONL** Studio : une ligne par record, chaque payload enveloppé : `{"payload":{"sentence":"…","groundtruth":"French"},"properties":{}}`.
- Les **properties** du record et l'information de **source** ne sont **pas** ajoutées à l'input record. Sur les runs sauvegardés, le run garde l'**ID du dataset** et chaque input record garde l'**ID du record Studio** d'origine.
- **Pas d'instantané** (encadré `:::info`) : chaque run lit les records existants **au démarrage**, **jusqu'à 10 000** ; les modifications ultérieures n'affectent que les runs futurs ; si des records sont ajoutés/supprimés **pendant** la récupération, le run **échoue avant de démarrer** plutôt que de tourner sur un ensemble incohérent.
- `Dataset` n'est accepté que par `evaluation.run()`. **L'optimisation** et **`retry_failed_records`** exigent une **liste** de records (et le plugin Workflows n'accepte que des listes).

#### 3.6.3 Transformer des records Studio avant le run

Quand les payloads Studio n'ont pas la forme attendue, ou quand une liste est requise (optimisation) : récupérer et adapter soi-même. Méthode SDK documentée : **`client.beta.observability.datasets.list_records_async(dataset_id=…, page_size=…, page=…)`** — endpoint **paginé** ; la réponse expose `result.records.results` (liste de records ayant `.id` et `.payload`) et `result.records.next` (vide → dernière page). L'exemple boucle avec `page_size=100`, convertit `payload` en dict (`model_dump(mode="json")` si objet Pydantic), valide les champs requis (lève `ValueError` sinon) et renvoie une liste typée (`TypedDict` `LangItem`). Il conseille aussi d'ajouter `metadata={"studio_dataset_id": …, "record_count": len(dataset)}` au run.

#### 3.6.4 Typage et contenu des records

- `TypedDict` recommandé pour rendre le schéma explicite et obtenir l'autocomplétion IDE (`dataset: list[LanguageRecord]`).

| Type de champ | Rôle | Exemples |
|---|---|---|
| Entrées de la tâche | Ce que la tâche traite | `prompt`, `context`, `text`, `question` |
| Vérité terrain | Sortie de référence pour noter | `expected`, `groundtruth`, `reference_answer` |
| Métadonnées | Contexte pour scorers / juges LLM | `category`, `difficulty`, `grading_guidance` |

#### 3.6.5 Bonnes pratiques (doc)

- **Datasets focalisés** : un dataset par tâche/capacité (ex. `language_detection`, `qa_factual`, `code_generation`).
- **Représentativité** : cas limites et modes d'échec ; équilibrer (si 90 % de cas faciles, l'éval ne révèle rien) ; retirer les records qu'un humain ne saurait noter de façon fiable.
- **Versionner** : figer le dataset entre runs pour suivre une performance dans le temps ; les datasets Studio sont **mutables** ; noms parlants (`qa_baseline_2025_06` plutôt que `test_data`) ; tracer la version via tags/metadata (`tags=["dataset:qa_baseline_2025_06", …]`, `metadata={"dataset_version": "2025-06", "record_count": …}`).
- **Qualité de la vérité terrain** : une vérité ambiguë produit des scores bruités ; pour un juge LLM, inclure un champ `grading_guidance` par record.
- Studio organise les résultats par **Projects/Evaluations/Runs**, pas par dataset.
- FAQ : jusqu'à **10 000 records par run** ; tester sur un sous-ensemble en `local=True` ; tout format (JSONL, CSV…) peut être chargé en liste de dicts ; scores bruités → inspecter d'abord le dataset (entrées ambiguës, vérité terrain), puis le scorer/juge.

### 3.7 Tasks

- Fonction **async ou sync** `(ctx: TaskContext) -> output` ; le SDK détecte le style automatiquement.
- Peut renvoyer **n'importe quel type** (chaînes, modèles Pydantic, dicts) ; le SDK sérialise pour l'upload.
- `TaskContext` : `ctx.input_record`, `ctx.system` (le `System` de `evaluation.run()`), `ctx.metadata` (métadonnées du run).
- **Attention (encadré `:::caution`)** : une task **sync** tourne sur la boucle d'événements, qui envoie aussi le **heartbeat** du run à Studio ; un appel bloquant plusieurs minutes affame le heartbeat et Studio peut marquer un run vivant comme **`cancelled`**. Préférer async ou `await asyncio.to_thread(...)`.

### 3.8 Evaluators

#### 3.8.1 Structure

`Evaluator(name=…, scorer=…, description=…, goal=…, …)` : un nom (unique), un scorer, une description optionnelle (affichée **au survol** dans Studio), un goal optionnel. Deux familles de scorers, mélangeables dans un même run :

| Type | Caractéristiques | Quand l'utiliser |
|---|---|---|
| **Rule-based** | Fonction pure ; déterministe, rapide, gratuit | Dès que possible |
| **LLM-as-judge** | Fonction qui appelle un modèle | Critères non codables : utilité, cohérence, exactitude factuelle nuancée, ton |

#### 3.8.2 Types de retour d'un scorer

| Retour | Effet statistique |
|---|---|
| `int` / `float` | Score **numérique** → `avg`, `min`, `max`, `std`, `count` (par défaut) |
| `str` / `bool` | Score **catégoriel** → distributions de fréquences + **mode** |
| `Score(value=…, rationale=…, metadata=…)` | Score riche : la **justification** est stockée avec la note dans Studio ; `metadata` sert notamment aux statistiques de classification |

#### 3.8.3 Juge LLM simple — prompt de juge d'exemple

Le prompt d'exemple (`JUDGE_PROMPT`) demande au modèle d'agir en **correcteur strict** : à partir du prompt utilisateur (`{prompt}`) et de la réponse du modèle (`{answer}`), répondre par **un seul entier de 0 à 5** (plus haut = meilleur) mesurant l'utilité et la pertinence, **sans aucun autre texte**. Le scorer appelle `client.chat.complete(model="mistral-large-latest", …, temperature=0)`, prend le premier caractère de la réponse (`int(raw[0])`) et renvoie `0` en cas de `ValueError`/`IndexError`. Usage : `Evaluator(name="helpfulness", description="LLM judge: helpfulness score from 0 to 5.", scorer=llm_judge, goal=Goal.gte(3.5))`.

#### 3.8.4 Sortie structurée avec `Score`

Le juge utilise `client.chat.parse_async(model="mistral-large-latest", messages=[…], response_format=RecallJudgment)` où `RecallJudgment` est un `BaseModel` Pydantic `{score: float, comment: str}` ; le prompt demande d'évaluer le **rappel** entre 0.0 et 1.0 en comparant `Expected` et `Got`, avec note et court commentaire ; retour `Score(value=judgment.score, rationale=judgment.comment)`.

#### 3.8.5 Réduire la variance du juge

`num_scores=3` sur l'`Evaluator` : chaque génération est notée 3 fois, résultats **moyennés**.

#### 3.8.6 Consignes pour bien rédiger un prompt de juge (doc)

- Être **spécifique** ; décrire exactement une bonne réponse pour le cas d'usage.
- Ne pas supposer que le juge connaît le contexte ; expliciter ce que « bon » signifie.
- Donner des **exemples de frontière** (« un 3 signifie que la réponse répond partiellement mais omet un détail clé »).
- **Température basse** (`temperature=0`).
- **Tester sur un petit échantillon** avant un gros run.
- FAQ : scores incohérents → prompt trop vague, ajouter critères et exemples de frontière, modèle plus fort, `num_scores` ; erreurs de parsing / valeurs hors bornes → `response_format` avec modèle Pydantic + `try/except` renvoyant un score de repli ; un evaluator est réutilisable entre runs, mais **changer le prompt du juge rend les scores non comparables**.

#### 3.8.7 `System` et juges

Encadré `:::tip` : `System` décrit **le pipeline évalué**, pas les scorers/juges ; pour un juge configurable, coder le modèle du juge en dur dans le scorer ou utiliser une **fabrique de scorers** (*scorer factory*).

### 3.9 Goals, direction et normalisation

#### 3.9.1 Types de goals

| Méthode | Signification |
|---|---|
| `Goal.gte(0.8)` | Score `>= 0.8` |
| `Goal.lte(0.1)` | Score `<= 0.1` |
| `Goal.between(0.2, 0.8)` | Score dans `[0.2, 0.8]` |

- Un goal est une **porte pass/fail pure** ; affiche `PASS`/`FAIL` au terminal.
- Paramètre optionnel `metric` (`"avg"`, `"min"`, `"max"`, `"std"`) pour cibler une autre statistique que la moyenne, ex. `Goal.gte(0.8, metric="min")` (cf. §8 sur la portée exacte).

#### 3.9.2 Niveaux

| Champ | Évalué contre |
|---|---|
| `goal` | Chaque **score de génération** |
| `aggregate_goal` (déprécié) | Le résultat agrégé (défaut : moyenne) sur toutes générations et records |
| Goal de statistique (`Statistic.avg(goal=…)`) | La statistique à laquelle il est attaché (méthode recommandée, §3.10) |
| Goal de `RunEvaluator` | Le score de niveau run |

Les deux premiers sont évalués **indépendamment** et peuvent échouer séparément. Affichage `run.show()` :
- **niveau run** : l'agrégat passe-t-il `aggregate_goal` (à défaut, `goal` appliqué à la moyenne) ;
- **niveau record** (avec `num_generations > 1`) : nombre de générations passant `goal` (ex. « 2/3 PASS ») + verdict agrégé le cas échéant ;
- **niveau génération** : `PASS`/`FAIL` de chaque score contre `goal`.

#### 3.9.3 Direction et normalisation (champs de l'`Evaluator`)

| Champ | Type | Défaut | Effet |
|---|---|---|---|
| `direction` | `"maximize"` \| `"minimize"` | `None` → inféré : `gte` → `maximize`, `lte` → `minimize`, sinon `maximize` | Sens « meilleur » |
| `min_value` / `max_value` | `float` | `None` (fenêtre [0, 1] sans goal, d'après l'exemple) | Fenêtre de normalisation min-max ; **les deux ou aucun** ; `min_value < max_value` |
| `weight` | `float` | `1.0` | Pression d'optimisation ; `weight=0` = contrainte pure (le goal filtre toujours, mais exclu de l'objectif) |

Exemple : latence `goal=Goal.lte(1000)` (→ `minimize`), `min_value=200`, `max_value=2000` : 850 ms se normalise à ~0.64 (plus bas = mieux).

### 3.10 Statistiques

#### 3.10.1 Rôle

Valeurs de niveau run qu'un evaluator expose à partir de ses scores par record : affichées dans l'**en-tête du tableau des runs**, **tracées dans le temps**, ciblées par un goal. Chaque statistique déclarée est une **déclaration sérialisable** comprise par le SDK, le backend et Studio → **recalculable après filtrage ou rescoring**, traçable, comparable, « gateable ».

#### 3.10.2 Fabriques numériques

| Méthode | Signification | Id |
|---|---|---|
| `Statistic.avg()` | Moyenne arithmétique | `avg` |
| `Statistic.sum()` | Somme (ex. total d'échecs) | `sum` |
| `Statistic.min()` | Plus petit score | `min` |
| `Statistic.max()` | Plus grand score | `max` |
| `Statistic.std()` | Écart-type **de population** | `std` |
| `Statistic.count()` | Nombre de scores numériques **réussis et non nuls** | `count` |
| `Statistic.percentile(p)` | p-ième percentile, `0 <= p <= 100` | `p50`, `p95`, `p99.9`… |

- Ids **canoniques et stables** (référence commune SDK / payload du run / UI ; ne changent jamais). **Médiane** = `Statistic.percentile(50)` (pas de fabrique dédiée). **Pas de réduction `rate`** volontairement : un taux = `avg` sur des scores 0/1.
- Chaque fabrique accepte `goal=` (ex. `Statistic.percentile(95, goal=Goal.lte(500))`).

#### 3.10.3 Omission vs liste explicite

- **`statistics` omis** (défaut) : comportement historique ; Studio détecte le type de score et, pour du numérique, expose `avg`, `min`, `max`, `std`, `count` (`avg` = headline).
- **Liste explicite** : **autoritative** — exactement ces statistiques, dans cet ordre, sans défauts implicites. **`statistics=[]`** → **aucune** statistique de run.
- La **première** entrée = statistique *headline* (affichage compact dans l'en-tête du tableau des runs ; convention de présentation, non persistée).

Exemples documentés : total d'échecs `statistics=[Statistic.sum(goal=Goal.lte(0))]` (échoue si un seul record a échoué) ; latence `[Statistic.percentile(95, goal=Goal.lte(500)), Statistic.percentile(50), Statistic.percentile(75)]` → expose exactement `p50`, `p75`, `p95`, headline `p95`, run en échec si p95 > 500 ms.

#### 3.10.4 Statistiques de classification

| Méthode | Signification | Ids |
|---|---|---|
| `Statistic.precision(...)` | Précision (valeur prédictive positive) | `precision`, `precision_macro`, … |
| `Statistic.recall(...)` | Rappel (taux de vrais positifs) | `recall`, `recall_micro`, … |
| `Statistic.f1(...)` | F1 (moyenne harmonique) | `f1`, `f1_weighted`, … |

- Calculées sur une **matrice de confusion** de paires `(expected, predicted)` → **deux labels par record** : le **prédit** = `value` du score ; l'**attendu** = `metadata[expected_key]` du score (défaut `expected_key="expected"`). Ex. scorer : `Score(value=ctx.output, metadata={"expected": ctx.input_record["expected"]})`.
- Chaque fabrique prend **exactement un** de : `positive_label` (métrique binaire contre cette classe) ou `average` (`"macro"`, `"micro"`, `"weighted"`, multi-classe ; id suffixé, ex. `f1_macro`). Arguments optionnels : `expected_key`, `labels`, `goal`.
- Les labels étant catégoriels, l'evaluator reçoit aussi les **fréquences de prédiction**. Studio affiche les métriques **à côté de la matrice de confusion** et **somme les matrices entre runs** pour agréger dans la liste des runs.
- `macro`/`weighted` dépendent des classes présentes → `labels=["fr", "en", "de"]` pour figer l'ensemble et rester comparable quand un filtre retire toutes les occurrences d'une classe.
- Métrique **indéfinie** (dénominateur nul) → `null`, affichée `-`. Score **sans label attendu** → exclu, compté dans **`excluded_count`** (affiché dans Studio à côté du nombre de records notés).
- Pour l'**accuracy** : pas besoin de classification ; scorer 1/0 + `Statistic.avg()`.
- **Non supportées par le plugin Workflows** pour l'instant.

#### 3.10.5 Goals de statistique (recommandé) et dépréciation

`Evaluator(name="accuracy", scorer=…, statistics=[Statistic.avg(goal=Goal.gte(0.9))])` remplace `aggregate_goal=Goal.gte(0.9)` (**déprécié**). Un goal de statistique cible la statistique à laquelle il est attaché, **aux niveaux record et run**, et ne porte jamais de `metric` (seul le chemin déprécié `aggregate_goal` utilise `metric`).

#### 3.10.6 Règles de calcul

- **Scores 0/1 numériques, pas booléens** : `True`/`False` sont classés **catégoriels** → fréquences et mode uniquement, aucune réduction `sum`/percentile.
- **Algorithme de percentile** : Hyndman-Fan **type 7** (défaut NumPy) : pour `n` scores triés et rang `h = (n - 1) * p / 100`, interpolation linéaire entre `x[floor(h)]` et `x[ceil(h)]` ; un seul score → ce score. Algorithme identique dans le SDK Python, le SDK TypeScript et le backend.
- **Échantillons vides** : `count` déclaré = `0`, toute autre statistique déclarée = `null` (non évaluable) → un dataset vide ne satisfait jamais par accident un goal comme `Statistic.sum(goal=Goal.lte(0))`.
- Aucune méthode d'**intervalle de confiance** n'est fournie : la page `num_generations` cite seulement l'usage de plusieurs générations pour « se faire une idée » de la fiabilité ; la vue Studio montre des **bandes min/max** sur les tendances.

### 3.11 System params

- Problème : modèle, température, prompt système, outils, réglages de retrieval… codés en dur dans la tâche sont invisibles pour Studio et non comparables.
- `System(name=…, params={…})` passé à `evaluation.run(system=…)` ; disponible via `ctx.system` dans **tasks et scorers** ; chaque run **enregistre ses params**, affichés dans Studio pour comparer les runs côte à côte (« run A `temperature: 0` vs run B `temperature: 0.9` »).
- `params` est **libre** : modèle, température, prompt système, max tokens, définitions d'outils, skills activées, config de retrieval, etc.
- Pattern de comparaison : boucler sur des modèles (`["mistral-small-latest", "mistral-large-latest"]`) ou des températures en relançant la même `Evaluation` avec un `System` différent.

### 3.12 Organisation dans Studio : Projects, Evaluations, Runs

| Niveau | Rôle | Sélection | Création |
|---|---|---|---|
| **Project** | Regroupe les évaluations d'un système (ex. « Language Detection », « Chatbot QA », « RAG Pipeline ») ; « un dossier » | `Project(name=…)` ou `Project(slug=…)` (au moins un) | Par nom : créé s'il n'existe pas ; par slug : doit exister |
| **Evaluation** | Test nommé exécuté de façon répétée (ex. « Accuracy on French prompts ») | `Evaluation(name=…)` ou `Evaluation(slug=…)` | Par nom : créée **sous le projet donné** si absente ; par slug : doit exister |
| **Run** | Chaque appel à `evaluation.run()` crée un nouveau run sous l'évaluation | — | Automatique |

- **Tags et metadata** du run : filtrage/comparaison dans Studio, ex. `tags=["model:mistral-small", "prompt:v2"]`, `metadata={"commit": "abc123"}`.
- **Statuts du run** (`status`) : `"pending"`, `"running"`, `"completed"`, `"failed"`, `"cancelled"`. `run()` marque `"running"` pendant l'exécution puis `"completed"` ; exception → `"failed"` ; interruption → `"cancelled"`. **Heartbeat** pendant l'exécution : si le processus meurt, le run passe `"cancelled"` au lieu de rester « en cours ».

### 3.13 Affichage des résultats (`run.show`)

| Appel | Contenu |
|---|---|
| `run.show(level="run")` (défaut) | Statistiques résumées |
| `run.show(level="records")` | Résultats par record |
| `run.show(level="generations")` | Détail par génération |
| `run.show(level="scores")` | Décomposition complète des scores |
| `run.show(mode="json", level="records")` | Export JSON (`mode` : `"text"` défaut, `"json"`) |

### 3.14 Guides avancés

#### 3.14.1 Context objects

Objets Pydantic typés regroupant toutes les données en un seul paramètre.

| Contexte | Reçu par | Champs |
|---|---|---|
| `TaskContext` | Task | `input_record: dict[str, Any]` ; `system: System \| None` ; `metadata: dict[str, Any] \| None` |
| `ScorerContext` | Scorer d'`Evaluator` | `input_record` ; `output: Any` (sortie de cette génération) ; `system` ; `metadata` ; + `record_metadata` et `generation_metadata` (métadonnées persistées, renseignées lors d'un `rescore()`, vides au `run()` initial) |
| `RunEvaluatorContext` | Scorer de `RunEvaluator` | `records: list[RunEvaluatorRecord]` ; `statistics: dict[str, EvaluatorStatistics]` ; `metadata: dict[str, JsonValue]` ; `system` |
| `RecordMetadataContext` | Callback `record_metadata` (une fois par record, après task et scorers) | `input_record` ; `record: EvaluationRunRecord` (avec `generations` et scores) ; `system` ; `metadata` — le dict renvoyé est stocké dans les métadonnées du record dans Studio |
| `RunMetadataContext` | Callback `metadata` (quand on passe une fonction au lieu d'un dict ; après notation de tous les records) | `records` ; `statistics` ; `run_scores: dict[str, Score]` ; `metadata` ; `system` — le dict renvoyé est **fusionné** dans les métadonnées du run |

Helper : `get_score(record, "evaluator_name")` extrait le score d'un evaluator pour un record dans un run evaluator.

#### 3.14.2 Mode local

- `local=True` : **aucune donnée envoyée à Studio** ; `project`/`evaluation` non requis ; résultats seulement au terminal ou en JSON.
- Workflow recommandé : (1) itérer en local sur task et scorers ; (2) retirer `local=True` (ou `local=False`) et ajouter `project` + `evaluation` pour suivre dans le temps.

#### 3.14.3 Évaluateurs multiples

- `evaluators=[…]` accepte n'importe quel nombre d'evaluators ; chacun est exécuté et ses statistiques calculées **indépendamment** (chaque métrique apparaît séparément dans Studio).
- Exemple : `contains_expected`, `is_short` (< 80 caractères), `starts_capitalized` ; mélange règles + juge : `exact_match`, `llm_quality` (`num_scores=3`), `response_length` (nombre de caractères).
- **Rien n'est partagé** entre evaluators : goals et statistiques propres à chacun (ex. `Goal.gte(0.8)` sur l'un, `Goal.lte(500)` sur l'autre) ; scores non numériques → fréquences + mode.

#### 3.14.4 Run evaluators

- Opèrent sur **l'ensemble des résultats** une fois tous les records traités : assertions globales, métriques agrégées (F1), analyses inter-records.
- Exemple porte : `RunEvaluator(name="accuracy_above_80pct", scorer=lambda ctx: ctx.statistics["accuracy"].avg > 0.8)` → `run.run_scores == {"accuracy_above_80pct": True}`.
- Exemple F1 : boucle sur `ctx.records`, `get_score(record, "predicted_label").value` et `get_score(record, "expected_label").value`, calcule tp/fp/fn, renvoie `Score(value=f1, rationale="precision=…, recall=…")`.
- Supportent `goal=Goal.gte(0.85)`.
- **Quand ?** après traitement et notation de tous les records ; si des records échouent, le run evaluator s'exécute **quand même sur les records réussis**.

#### 3.14.5 Plusieurs générations (`num_generations`)

- Pour une tâche non déterministe (`temperature > 0`) : `num_generations=N` exécute la tâche N fois par record.
- Le SDK : (1) exécute N fois ; (2) note chaque génération indépendamment ; (3) calcule **moyenne et écart-type par record** sur les N générations ; (4) calcule les statistiques globales du run.
- Usages : comparer des températures (boucle `[0.0, 0.3, 0.7, 1.0]` avec `num_generations=5` et `tags=[f"temperature:{temp}"]`), tâches bruitées, « se faire une idée » de la fiabilité avant de conclure.
- Inspection : `run.show(level="generations")` ; dans Studio, détail de génération dépliable dans la vue run quand `num_generations > 1`.

#### 3.14.6 Relancer les enregistrements échoués

- Contexte : échecs partiels (erreur API transitoire, rate limit, bug de scorer) ; « si 5 records sur 500 échouent, tout relancer gaspille temps et argent ».
- `client.evaluation.retry_failed_records(run_id=…, dataset=…, task=…, evaluators=…, system=…)` :
  1. récupère le run et identifie les records au statut **`"error"`** (échec de génération **ou** de notation) ;
  2. ne retraite que ceux-là avec la task et les evaluators fournis (la task peut être **une version corrigée**) ;
  3. **patche** les résultats réussis dans le run d'origine (mis à jour **en place** : pas de doublon, pas de nettoyage manuel) ;
  4. si le run d'origine avait des `run_evaluators`, leurs scores sont **recalculés**.
- Retour `RetryFailedRecordsResult` : `run_id`, `retried_count`, `patched_count`, `run_scores_recomputed` (bool). Paramètres : §5.3.

#### 3.14.7 Rescoring de runs persistés

- But : produire une fois une exécution coûteuse (rollouts d'agents, longues chaînes d'outils) et la **noter autant de fois que voulu** sans relancer la tâche.
- **Deux couches** d'un run persisté : (1) **artefact d'exécution** — records d'entrée, sorties, config système, erreurs, produit une fois ; (2) **couche de notation** — définitions d'evaluators, scores de génération, scores de run, statistiques, goals, ajoutables/remplaçables. `run()` produit les deux ; `rescore()` ne touche que la seconde ; `update_run()` reste un **patch de métadonnées léger** qui ne note pas.
- **Run « task-only »** : `evaluators=[]` (liste vide = opt-in explicite ; **omettre** `evaluators` reste une erreur). Les `run_evaluators` fonctionnent quand même (agrégation de sorties, erreurs, métadonnées, latence, coût).
- `client.evaluation.rescore(run_id=…, evaluators=[…], run_evaluators=[…])` : récupère entrées, sorties et scores persistés ; **n'invoque jamais la tâche** ; exécute les evaluators de génération et persiste ; puis les run evaluators ; puis **recalcule statistiques et goals** à partir des scores persistés. Passer un `EvaluationRun` est un raccourci pour son id ; le SDK rafraîchit toujours les records persistés.
- **Sémantique patch** : nom d'evaluator inconnu → **ajout** (définition + scores) ; nom existant au même niveau → **remplacement** de la définition et de **tout** son jeu de scores ; ré-upload des mêmes scores **idempotent** (les retries ne dupliquent pas) ; changer un evaluator de niveau génération ↔ run est **rejeté**.
- **Artefacts de notation durables** : un run task-only peut, via `record_metadata=capture_grading_artifacts`, exporter des artefacts (ex. un patch de code produit par un agent dans un sandbox) pendant que l'environnement éphémère existe ; un `rescore()` ultérieur note contre `ctx.record_metadata["patch"]` même après disparition du sandbox.
- **Run evaluators potentiellement obsolètes** : les fonctions de run evaluator ne sont pas persistées et leur dépendance aux scores de génération est opaque ; si des scores de génération changent sans recalcul d'un run evaluator persisté dans le même appel → `StaleRunEvaluatorWarning` + noms dans `result.potentially_stale_run_evaluators`. Pas d'avertissement si seuls des run evaluators sont re-notés, s'il n'existe aucun score de run evaluator persisté, ou si tous sont fournis. On peut transformer l'avertissement en erreur via `warnings.simplefilter("error", StaleRunEvaluatorWarning)`.
- Retour `RescoreResult` (« reçu opérationnel », pas le run) : `run_id`, `scored_generation_count`, `run_scores_recomputed`, `potentially_stale_run_evaluators` ; re-récupérer le run (ou ouvrir Studio) pour voir les scores mis à jour.

### 3.15 Optimisation de prompts et de paramètres

#### 3.15.1 Principe

- Transforme une évaluation en **recherche** : le SDK explore des variantes d'un prompt / de system params et renvoie la meilleure trouvée, notée avec les **mêmes evaluators**. On garde `dataset`, `task`, `evaluators` ; on marque les paramètres libres, on choisit une stratégie, on appelle `client.evaluation.optimize()`.
- Chaîne : `Dataset → Task → Evaluators → Optimizer → Best parameters`.
- **Prérequis** : `mistralai-evaluations` **0.6.0+** ; Enterprise uniquement.

| Notion | Définition |
|---|---|
| Search space | Paramètres modifiables, déclarés par des `Tunable` dans un `TunableSystem` |
| Score | Ce que renvoie un evaluator pour un candidat (un nombre par record + moyenne de run) |
| Objective | Nombre unique, plus haut = mieux, dérivé des scores (direction de chaque evaluator, combinaison en un objectif) |
| Gate | Seuil `Goal` : un candidat qui le rate **ne peut pas gagner** |
| Candidate | Jeu concret de valeurs ; **chaque candidat est un vrai run d'évaluation visible dans Studio** |
| Optimizer | Stratégie proposant de nouveaux candidats ; deux intégrées : `SimpleOptimizer`, `GEPA` |

#### 3.15.2 Espace de recherche

- `TunableSystem(name=…, params={…})` a la même forme que `System`, mais toute valeur peut être enveloppée dans `Tunable(...)` ; les valeurs simples restent **fixes**.
- `Tunable("Summarize the text.")` : la valeur **seed** = point de départ = **baseline (génération 0)**.
- `Tunable(0.7, bounds=(0.0, 1.0))` : bornes pour les slots numériques ; les propositions sont **ramenées dans l'intervalle**.
- La task lit chaque slot dans `ctx.system.params` ; le SDK **matérialise** les valeurs du candidat avant d'appeler la task.
- **Au moins un `Tunable`** requis.

#### 3.15.3 Exemple documenté

Résumé de texte avec deux evaluators antagonistes : `coverage` (proportion de faits clés du record conservés, `Score(value=…, rationale="3/4 facts kept")`) et `conciseness` (ratio mots résumé/source, note pleine à ≤ 20 % de la source). Appel : `client.evaluation.optimize(project=…, evaluation=…, dataset=…, task=…, evaluators=[…], system=TunableSystem(...), algo=GEPA(iterations=8, pareto_size=3, minibatch_size=5, holdout=0.2), steer="Summaries drop the key numbers from the source — keep them.", tags=["optimization"])` puis `result.show()` et `result.winner.system["instruction"]`. Chaque candidat est filtrable dans Studio par le tag **`optimization:*`** ajouté par le SDK ; utiliser **Compare** pour inspecter la trajectoire.

#### 3.15.4 `steer`

- Texte libre décrivant **le problème à corriger** (la raison du lancement) ; lu par le **mutateur réflexif par défaut** lors du diagnostic des échecs.
- **Ne change jamais l'objectif ni les gates** ; enregistré sur l'optimisation et **affiché dans Studio** ; plafonné à **4 000 caractères** (« un énoncé d'objectif, pas un document »).

#### 3.15.5 Optimiseurs

| | `SimpleOptimizer` | `GEPA` |
|---|---|---|
| Principe | *Hill-climb* glouton : à chaque tour, réfléchit sur les records les moins bien notés du meilleur courant et propose une réécriture, gardée seulement si elle bat le meilleur **sur tout le dataset** | Recherche réflexive multi-objectif ; partitionne le dataset en 3 rôles et maintient une **frontière de Pareto** (archive de candidats meilleurs sur des records **différents**) |
| Trajectoire | Montée linéaire gen 0, 1, 2… | Archive Pareto |
| Paramètres | `iterations` (réécritures à essayer), `patience` (arrêt après N non-améliorations consécutives), `reflection_model`, `mutation_model` (défaut = `reflection_model`), `mutator` | `iterations` (budget de mutations), `pareto_size` (taille du jeu de validation fixe), `minibatch_size` (exemples tirés à chaque itération pour la réflexion), `holdout` (fraction réservée au chiffre final ; `0` désactive), `patience` (arrêt après N enfants rejetés consécutifs), `random_seed` (reproductibilité du split/échantillonnage/sélection), `reflection_model`, `mutation_model`, `split`, `mutator` |
| Quand | Base simple et lisible, petit dataset ; plus gourmand, peut **sur-apprendre** ou stagner (valide sur le même jeu qu'il optimise) | Multi-objectif, grands datasets, protection contre le sur-apprentissage via holdout |

- Partitions GEPA : **D_pareto** (validation fixe, étalon commun) ; **D_feedback** (réservoir d'où un mini-batch frais est tiré à chaque itération pour réfléchir aux échecs) ; **Holdout** (jeu jamais vu, utilisé seulement à la fin pour un gain « sans biais de sélection »).
- Partition manuelle via `split` : **clé de record** (ex. `GEPA(split="split")`, valeurs `"feedback"`, `"pareto"`, `"holdout"` ; label manquant/inconnu → record ignoré avec avertissement) ou **callback** (déterministe, sans I/O). Les partitions explicites priment sur `pareto_size`, `holdout` et le mélange.
- Conseil (`:::tip`) : commencer par `SimpleOptimizer` avec peu d'itérations pour valider task et evaluators, puis passer à `GEPA` ; `reflection_model` bon marché + `mutation_model` plus fort (« diagnostic économique, réécritures audacieuses »). Exemples : `reflection_model="mistral-small-latest"`, `mutation_model="mistral-large-latest"`.

#### 3.15.6 Direction, poids et gates

- **Direction**, `weight`, `min_value`/`max_value` vivent sur l'`Evaluator` (§3.9.3).
- **Seuil** = `Goal` de l'evaluator = **gate** : un candidat violant un seuil ne peut gagner sur le seul score agrégé ; les candidats qui passent les gates sont **toujours classés devant** ceux qui les violent. Ex. `coverage` `Goal.gte(0.6)` + `conciseness` `Goal.gte(0.4)` = « ne pas sacrifier la factualité pour gagner en brièveté ». Justification : une moyenne pondérée est « jouable » (un résumé vide `"."` peut très bien scorer en concision).
- **Aucun candidat ne passe les gates** (`:::caution`) : pas de gagnant ; résultat `best_attempt` (un candidat bat la baseline mais rate une gate → `result.best_attempt`) ou `no_change`. Un seuil raté ne se fait jamais passer pour une victoire.

#### 3.15.7 Lire le résultat (`OptimizeResult`)

| Attribut | Contenu |
|---|---|
| `result.show()` | Affiche le gagnant (ou meilleure tentative) + trajectoire complète |
| `result.verdict` | `"success"` \| `"best_attempt"` \| `"no_change"` |
| `result.summary` | Résumé une ligne, ex. `"0.50 → 0.72  (+0.22, +44%, success)"` |
| `result.winner` | Gagnant si `success`, sinon `None` |
| `result.best_attempt` | Meilleure tentative si `best_attempt` |
| `best.system` | Config complète (`{"instruction": …, "model": …}`) |
| `best.score` | Objectif agrégé |
| `best.gain` / `best.gain_pct` | Delta absolu / relatif vs baseline |
| `best.scores` | Décomposition par evaluator : value, distribution, goal |
| `best.run_url` | Lien vers le run dans Studio |
| `result.baseline.score` | Score du seed |
| `result.trajectory` | Tous les candidats, ordre de génération ; chacun : `gen`, `score`, `gate`, `changed` |

Baseline, gagnant et meilleure tentative sont notés **sur le même jeu held-out** → gain « honnête », pas un artefact de la recherche.

#### 3.15.8 Mutateurs personnalisés

- Par défaut, mutateur **LLM réflexif** : diagnostique les échecs puis réécrit les slots tunables. Remplaçable par une fonction async passée en `mutator=` (`GEPA(iterations=8, mutator=…)` ou `SimpleOptimizer(mutator=…)`).
- Types : `from mistralai.evaluations.optimization import MutationRequest, MutationResult`.

| `MutationRequest` | Description |
|---|---|
| `parent` | Candidat muté : `overrides` (valeurs tunables courantes), scores, `failures` (pires records avec sorties, scores, justifications) |
| `tunables` | Slots modifiables |
| `objectives` | Ce que mesure chaque evaluator, direction et cible |
| `history` | Tentatives précédentes avec overrides et scores |
| `steer` | Le `steer` passé à `optimize()` |

`MutationResult(overrides={…}, hypothesis="…")` : nouvelles valeurs (tout ou partie des slots) + **hypothèse** une ligne affichée sur le candidat dans Studio. `steer` est enregistré même si le mutateur ne le lit pas.

#### 3.15.9 Rate limits et retries

- Une optimisation démultiplie les appels (chaque candidat = un run complet + appels diagnostic/réécriture du mutateur) → risque de **`429 Too Many Requests`** ; baisser `max_concurrency` aide sans éliminer (limites **à l'échelle du compte**).
- Le SDK **ne relance pas silencieusement** les appels de la task et des scorers (ils passent par le client `Mistral` de l'utilisateur) → configurer `retry_config=RetryConfig(strategy="backoff", backoff=BackoffStrategy(initial_interval=1_000, max_interval=30_000, exponent=2.0, max_elapsed_time=60_000), retry_connection_errors=False)` (imports `mistralai.client.utils`) ; retries sur `429`, `500`, `502`, `503`, `504`, avec *jitter* ajouté par le SDK.
- Le SDK relance **déjà ses propres appels internes** (mutateur réflexif) : un 429 transitoire n'y interrompt pas l'optimisation.

### 3.16 Plugin d'évaluation Workflows

#### 3.16.1 Positionnement

`mistralai-workflows-plugins-evaluations` exécute les évaluations hors ligne **dans Mistral Workflows**, avec la même API `evaluation.run()` mais en découpant exécution des tâches et notation en **activités Temporal parallèles**. Chaque record est lancé comme **child workflow** (task puis scorers) ; résultats téléversés au fil de l'eau. Enterprise uniquement.

| | Evaluation SDK | Plugin Workflows |
|---|---|---|
| S'exécute dans | Script Python ou notebook | Un Mistral Workflow |
| Parallélisme | `asyncio` dans un processus | Activités Temporal réparties sur des workers |
| Retries | `retry_failed_records()` après le run | Automatiques, par task et par scorer |
| Isolation des échecs | Erreurs enregistrées par record | Chaque record dans son propre child workflow |
| Idéal pour | Itération rapide, notebooks, scripts CI | Grands datasets, tâches longues ou multi-étapes, **évaluations planifiées** |

Les deux écrivent dans les **mêmes** projects/evaluations/runs de Studio et partagent `Evaluator`, `Goal`, `Statistic`, `System`, `TunableSystem`.

#### 3.16.2 Installation

- Prérequis : Python 3.12+, clé API, **projet Workflows fonctionnel**. `pip install mistralai-workflows-plugins-evaluations` / `uv add …` ; dépend de `mistralai-evaluations`.
- **Rien à enregistrer** : le worker **découvre les plugins installés au démarrage** et enregistre automatiquement activités et child workflows (installer, puis **redémarrer** le worker).
- Le worker utilise **ses propres identifiants** pour téléverser vers Studio : `MISTRAL_API_KEY` dans l'environnement du worker.

#### 3.16.3 Quickstart

Fichier `src/workflows/language_detection_eval.py` : task `@evaluation.task async def detect_language(ctx)` utilisant `get_mistral_client()` (de `mistralai.workflows.client`) ; scorer `@evaluation.scorer async def accuracy(ctx) -> Score` ; classe `@workflow.define(name="language-detection-eval")` dont la méthode `@workflow.entrypoint async def run(self) -> dict` appelle `await evaluation.run(project=…, evaluation=…, system=…, dataset=…, task=detect_language, evaluators=[…])` et renvoie `{"run_id": result.run_id, "run_url": result.run_url}`. Redémarrer le worker, puis déclencher depuis la page **Workflows** de Studio ou via `client.workflows.execute_workflow(workflow_identifier="language-detection-eval", input={})`. Résultats sous **Observability > Evaluate > Evaluations**.

#### 3.16.4 Différences avec le SDK

- **Décorer chaque fonction** : `@evaluation.task`, `@evaluation.scorer`, `@evaluation.run_scorer` (+ callbacks de métadonnées) ; chacune devient une activité Temporal (timeout, retries, concurrence propres). Fonction non décorée → `evaluation.run()` la **rejette** (erreur de décoration nommant la fonction).
- Appeler `evaluation` **du plugin** (pas `client.evaluation`) ; importer les types depuis `mistralai.workflows.plugins.evaluations.types` (module sûr dans le **sandbox** de workflow ; il ne fait que ré-exporter les types SDK).
- **La task peut être un workflow** (classe ou nom de workflow déployé) — §3.16.6.
- **Les scorers renvoient un `Score` ou un nombre** (nombre enveloppé automatiquement).
- `run()` renvoie un **`EvalResult`** (`run_id`, `run_url`, `statistics`, `run_scores`) **sérialisable**, retournable par le workflow ; **pas de méthode `show()`**.
- **Les run evaluators relisent les records depuis Studio** (pour rester sous les limites de payload Temporal).
- **Datasets inline uniquement** pour l'instant : ni `Dataset` Studio ni **statistiques de classification**.
- **Échecs relancés par Temporal** ; pas de `retry_failed_records()`.
- FAQ : scorers SDK réutilisables (même signature) en les rendant `async` + `@evaluation.scorer` ; limiter la charge API par `max_concurrency` sur les décorateurs.

#### 3.16.5 Run evaluators et mode local dans le plugin

- Run evaluator : `@evaluation.run_scorer async def mean_accuracy(ctx: RunEvaluatorContext) -> Score`. Quand les résultats sont téléversés, l'activité reçoit le **run ID** et **relit les records persistés** avant d'appeler la fonction (idem pour les callbacks `run_metadata`). Conséquences : records listés **dans l'ordre d'upload** (≠ ordre du dataset possible) ; un record dont la sortie n'a pas pu être téléversée apparaît **sans générations** ; la fonction doit être enregistrée sur le worker qui exécute le workflow d'évaluation ; la relecture ajoute **jusqu'à 10 minutes** au timeout du callback. En mode local, records passés en mémoire.
- `local=True` : saute **tout appel à Studio** mais garde la topologie Temporal (child workflows, activités) ; `project`/`evaluation` non requis ; `result.run_id == "local"`, `result.run_url is None` ; statistiques et run scores toujours calculés.

#### 3.16.6 Task modes

| Mode | Valeur | Fan-out | Idéal pour |
|---|---|---|---|
| Activité | Fonction `@evaluation.task` | Une activité par record | Un appel LLM ou pipeline court |
| Classe workflow | Classe `@workflow.define` | Un child workflow par record | Tâches multi-étapes dans le même code |
| Nom de workflow | `str` | Un child workflow par record | Tâches déployées séparément |

- Activité : peut renvoyer toute valeur **sérialisable JSON** (chaînes, dicts, modèles Pydantic).
- Classe / nom de workflow : l'entrypoint reçoit un **`TaskContext` sérialisé** (`input_record`, `system`, `metadata`), pas le record ; le valider via `TaskContext.model_validate(params)`.
- **Limites des tâches workflow** (options de `@evaluation.task` non applicables) : **timeout** = timeout d'exécution propre à la classe, ou **10 minutes par record** pour un nom de workflow ; **pas de retry** du child workflow (record en échec = erreur) ; **concurrence** : jusqu'à **5 records** simultanés. Les scorers restent des activités dans les trois modes.

#### 3.16.7 Décorateurs

| Décorateur | Reçoit | `execution_timeout` | `retry_policy_max_attempts` | `max_concurrency` |
|---|---|---|---|---|
| `@evaluation.task` | `TaskContext` | 2 min | `2` | `5` (exécutions de task simultanées) |
| `@evaluation.scorer` | `ScorerContext` → `Score` ou nombre | 1 min | `2` | `5` (scorers simultanés **par record**) |
| `@evaluation.run_scorer` | `RunEvaluatorContext` (une fois, après tous les records) | 1 min (+ jusqu'à 10 min de relecture) | `2` | — |
| `@evaluation.record_metadata` | `RecordMetadataContext` (une fois par record, après task et scorers) | 1 min | `2` | `5` |
| `@evaluation.run_metadata` | `RunMetadataContext` (une fois, après le run) | 1 min | `2` | — |
| `@evaluation.mutator` | `MutatorRequest` → `MutatorProposal` | 2 min | `2` | — |

- Usage nu (`@evaluation.scorer`) ou appelé avec surcharge (`@evaluation.task(execution_timeout=timedelta(minutes=30), max_concurrency=10)`).
- Avec plusieurs générations, `max_concurrency` de la task est un **budget total records × générations** (plus de générations = moins de records en vol, pas plus d'appels simultanés).
- Plusieurs evaluators : c'est le **plus petit `max_concurrency`** parmi leurs scorers qui s'applique. Un scorer qui échoue après ses retries enregistre un **score d'erreur** pour ce record ; le run continue.
- `record_metadata=` reçoit le callback décoré ; `metadata=` reçoit soit un dict statique, soit un callback `@evaluation.run_metadata` (dict renvoyé ajouté aux métadonnées du run).

#### 3.16.8 Flux d'exécution de `evaluation.run()` (plugin)

1. **Setup** : crée project, evaluation et run dans Studio, marque le run « running ».
2. **Fan-out** : un child workflow par record.
3. **Par record** : upload de l'input record, exécution de la task et de ses scorers pour chaque génération, callback `record_metadata`, upload de l'output record.
4. **Statistiques** : agrégation par evaluator.
5. **Run evaluators** : exécution et upload de leurs scores.
6. **Run metadata** : callback `run_metadata`, mise à jour du run.
7. **Completion** : run marqué completed ou failed.

Heartbeat pendant l'exécution : si le worker meurt ou si le workflow est annulé/terminé, Studio marque le run **cancelled**. Une task/un scorer en échec est enregistré comme **erreur sur son record** ; les autres records continuent.

#### 3.16.9 Building blocks

Pour un workflow qui gère déjà son propre fan-out : `setup() → upload_inputs() → [fan-out maison] → score() → upload()` ; on choisit combien de records chaque `upload()` envoie.

| Fonction | Rôle | Retour |
|---|---|---|
| `evaluation.setup(evaluator_names, run_evaluator_names=None, project, evaluation, name, description, tags, metadata, system, num_generations=1)` | Crée le run dans Studio | dict `run_id`, `run_url`, `evaluator_name_to_id`, `run_evaluator_name_to_id` |
| `evaluation.upload_inputs(run_id, dataset)` | Téléverse les input records | Liste des IDs d'input records |
| `evaluation.score(dataset, outputs, evaluators)` | Note les sorties (une par record) ; scorers décorés `@evaluation.scorer` | Liste de dicts de scores, un par record |
| `evaluation.upload(run_id, evaluator_name_to_id, input_record_ids, outputs=None, scores=None, generations=None)` | Téléverse sorties et scores | — |

- `num_generations` de `setup()` : jusqu'à **100** ; chaque record téléversé doit porter **exactement ce nombre** de générations, sinon Studio le considère **incomplet**.
- `upload()` : `outputs` + `scores` pour un run mono-génération ; `generations` (pour chaque record, liste de dicts `{output, scores: {nom_evaluator: dict_score}, error?}`) pour le multi-génération.

#### 3.16.10 Optimisation dans un workflow

- `evaluation.optimize()` appelé depuis un `@workflow.entrypoint` ; même `TunableSystem`, mêmes `SimpleOptimizer`/`GEPA`, même forme de résultat ; task, scorers, **mutation** et **notation par candidat** tournent en activités. Exemple : `GEPA(iterations=8, pareto_size=3, minibatch_size=5, holdout=0.2, random_seed=42)` ; alternative `SimpleOptimizer(iterations=4, patience=2)` ; `return result.model_dump()`.
- **Lancement** (peut dépasser la fenêtre d'attente synchrone) : `client.workflows.execute_workflow_async(workflow_identifier="optimize-summary-prompt", input={}, wait_for_result=False)` puis `client.workflows.wait_for_workflow_completion_async(started.execution_id, polling_interval=5, max_attempts=240)` ; reconstruire le résultat via `OptimizeResult.model_validate(payload.get("result", payload))` puis `result.show()`.
- **Dans Studio** : une optimisation à l'état `running` est créée **avant** la recherche, taguée avec l'exécution de workflow (liens croisés) ; chaque run candidat y est **lié** à sa création ; à la fin, statut final et **outcome** (verdict, résumé, scores baseline et meilleur). URL journalisée à la création et à la fin, renvoyée dans `result.optimization_url`. `name`/`description` optionnels, **générés à partir de `steer`** si omis. En cas de gagnant ou de meilleure tentative, Studio affiche un **court résumé de ce qui a changé** entre baseline et paramètres gagnants, **et pourquoi**.
- **Limites** : pas de mode local (`local=True` → `ValueError`, car noter chaque candidat relit son run depuis Studio ; utiliser `client.evaluation.optimize(local=True)` du SDK) ; `run_evaluators` enregistrés sur chaque run candidat mais **ne pilotent pas la sélection** ; datasets inline uniquement.
- **Mutateur personnalisé** : activité `@evaluation.mutator async def …(request: MutatorRequest) -> MutatorProposal`, ou un **workflow** (classe `@workflow.define` ou son nom) dont l'entrypoint reçoit le `MutatorRequest` et renvoie un `MutatorProposal`. `MutatorRequest` : `current` (valeurs tunables du parent), `tunables` (spec de chaque slot : seed et bornes), `objectives` (nom, description, direction, cible de chaque evaluator), `failures` (pires records : input, output, score, justifications), `history`, `steer`. `MutatorProposal` : `changed` (nouvelles valeurs) + `hypothesis` optionnelle.

#### 3.16.11 Rescoring dans un workflow

- `evaluation.rescore(run_id=…, evaluators=[…], run_evaluators=[…])` : mêmes sémantiques que le SDK ; **la source de vérité est le run persisté dans Studio, pas l'historique du workflow**.
- Étapes : (1) charge le run et ses records (entrées et sorties) ; (2) exécute les scorers en activités ; (3) persiste les scores puis recalcule statistiques et goals ; (4) exécute les run evaluators sur les records mis à jour.
- Scorers décorés obligatoires ; au moins un evaluator ou run evaluator. Ajout/remplacement par nom ; uploads idempotents (retries d'activité sans doublon) ; run evaluators potentiellement obsolètes **journalisés** et renvoyés dans `result.potentially_stale_run_evaluators`.
- Run task-only : `evaluation.run(..., evaluators=[])`.

### 3.17 Intégrations d'observabilité tierces

Page « Observability integrations » (ressources) : aide à choisir quoi surveiller et où trouver les intégrations.

**Quoi surveiller en priorité**

| Domaine | Éléments |
|---|---|
| Inputs | Templates de prompt, messages utilisateur, contexte récupéré, entrées d'outils, mémoire utilisée |
| Model configuration | Identifiant de modèle, paramètres d'échantillonnage, configuration d'outils, options applicatives |
| Outputs | Texte généré, appels d'outils, sortie structurée, citations, décisions de formatage |
| Runtime signals | Latence, usage de tokens, coût, erreurs, retries, codes de statut |
| Quality signals | Évaluations, feedback humain, annotations, datasets de régression |

**Motifs à tracer** : chaque étape susceptible de changer la réponse finale ; RAG → récupération des documents, classement (*ranking*), assemblage du contexte, génération ; agents → chaque appel modèle, appel d'outil, *handoff*, retry et réponse finale. Questions auxquelles les traces doivent répondre : quelle version de prompt/modèle/outil a produit la réponse ; quels documents l'ont influencée ; où latence ou coût ont augmenté ; quelle étape a renvoyé une erreur ou une sortie inattendue ; quels exemples doivent devenir des données d'évaluation.

**Options d'intégration** (via intégrations SDK, OpenTelemetry et exemples *cookbook*) :

| Outil | Description | Lien |
|---|---|---|
| LangSmith | Tracer des applications LangChain appelant Mistral | `github.com/mistralai/cookbook/tree/main/third_party/langchain` |
| Langfuse | Tracer les appels SDK Mistral ; prompts, sorties, métadonnées, évaluations | `langfuse.com/docs/integrations/mistral-sdk` |
| Arize Phoenix | Tracer chat completions, agents, appels d'outils, pipelines RAG | `docs.arize.com/phoenix/tracing/integrations-tracing/mistralai` |
| Weights and Biases Weave | Surveiller appels, entrées, sorties, erreurs, métriques d'évaluation | `weave-docs.wandb.ai/guides/integrations/mistral/` |
| MLflow | Tracing MLflow pour chat et embeddings Mistral | `github.com/mistralai/cookbook/tree/main/third_party/MLflow` |
| phospho | Analyser messages utilisateurs et feedback | `github.com/mistralai/cookbook/tree/main/third_party/phospho` |

Exemples cookbook : LangChain, notebook Phoenix (`arize_phoenix_tracing.ipynb`), W&B (`third_party/wandb`), notebook MLflow (`mistral-mlflow-tracing.ipynb`), phospho. Étapes suivantes recommandées : commencer par entrées/sorties du modèle, appels d'outils, latence, tokens et erreurs ; ajouter datasets d'évaluation et feedback utilisateur une fois les traces de base fiables.

---

## 4. Interface utilisateur

### 4.1 Écrans et chemins

| Chemin Studio | URL console | Contenu / actions |
|---|---|---|
| Observability › Traces (« Trace Explorer ») | `https://console.mistral.ai/observability/traces` | Liste des traces ; barre de recherche (langage d'expressions, §3.4) ; plage temporelle (citée dans la FAQ de dépannage) ; clic sur une trace → **arbre de spans** ; dépliage d'un span → inputs, outputs, latence, tokens. Colonnes/champs visibles : Trace ID, durée, tokens, statut (+ message d'erreur), source, tags. Visible seulement pour Org Admin / Workspace Admin / Observability Viewer. |
| Observability › Evaluate › Evaluations | non donnée dans les pages | Hiérarchie Projects › Evaluations › Runs. Quatre modes d'exploration : **Trend charts** (moyennes de score dans le temps avec **bandes min/max**, pour repérer des régressions) ; **Distribution charts** (camemberts et aires empilées de la distribution des scores entre records et runs) ; **Composable filters** (par **tag**, **run ID** ou **seuil de métrique**) ; **Run detail view** (inputs, outputs et scores par record ; détail des générations dépliable si `num_generations > 1`). |
| Workspace › Settings › Observability | non donnée | Interrupteur **Conversation Tracing** (Vibe Work et Vibe Code Web) ; réservé Workspace Admin / Org Admin. |
| Workflows (page Studio) | non donnée | Déclenchement manuel d'un workflow d'évaluation ou d'optimisation (plugin). |

### 4.2 Détails d'affichage relevés (évaluations)

- **Rendu des cellules selon le type** : texte brut, objets JSON, et **tableaux de conversation LLM** ont chacun leur format d'affichage.
- Chaque run affiche sa **config `System`** → comparaison côte à côte des runs (ex. température 0 vs 0.9 ; modèles différents).
- La **description** d'un evaluator s'affiche **au survol**.
- L'**en-tête du tableau des runs** montre la statistique *headline* de chaque evaluator (première de la liste `statistics`, `avg` par défaut).
- Statistiques de classification affichées **à côté de la matrice de confusion** ; matrices **sommées entre runs** dans la liste des runs ; **`excluded_count`** à côté du nombre de records notés ; valeur indéfinie affichée **`-`**.
- La **justification** (`rationale`) d'un `Score` est stockée et affichée avec la note.
- Métadonnées de record (`record_metadata`) et de run (`metadata`) stockées et visibles ; dataset Studio d'origine : le run garde l'ID du dataset et chaque input record l'ID du record source.
- Statuts de run : `pending`, `running`, `completed`, `failed`, `cancelled` (un run dont le heartbeat cesse passe `cancelled`).
- **Optimisations** : chaque candidat est un run normal, filtrable par le tag **`optimization:*`** ; bouton/fonction **Compare** pour inspecter la trajectoire ; l'objet *optimization* affiche `steer`, statut (`running` puis final), outcome (verdict, résumé, scores baseline/meilleur), l'**hypothèse** de chaque candidat (mutateur personnalisé), et un **résumé généré de ce qui a changé et pourquoi** (doc du plugin) ; `best.run_url` / `result.optimization_url` pointent vers Studio.

### 4.3 Datasets dans Studio

- Les pages lues évoquent des records « curés dans Studio » et un **format d'import JSONL** (`{"payload": …, "properties": {}}`) mais ne décrivent pas l'écran.
- D'après l'OpenAPI (inférence sur l'UI) : création de dataset vide, ajout de record direct, **imports** depuis un fichier téléversé, des **conversations du Playground**, des **spans de télémétrie** (Explorer → dataset, avec règles de mapping d'attributs), ou un autre dataset ; **export JSONL** via la Files API ; suivi des tâches d'import ; édition du payload et des propriétés d'un record ; suppression en masse ; « live judging » d'un record avec un juge. Enum de provenance d'un record : `EXPLORER`, `UPLOADED_FILE`, `DIRECT_INPUT`, `PLAYGROUND`, `TELEMETRY_SPAN`.

### 4.4 Parcours types

1. **Instrumenter puis explorer** : installer `mistralai[telemetry]` → `configure_telemetry(client)` avant tout appel (ou `OTEL_ENABLED=true` côté Workflows, `enable_otel` côté Vibe CLI, interrupteur Conversation Tracing pour Vibe Work/Code Web, ou export OTLP vers `https://api.mistral.ai/telemetry/v1/traces`) → faire une requête → Studio › Observability › Traces → filtrer (ex. `status_code = 'Error'`) → ouvrir la trace → déplier les spans.
2. **Première évaluation** : itérer en `local=True` au terminal (`run.show(level="records")`) → retirer `local`, ajouter `Project`/`Evaluation` → Studio › Observability › Evaluate › Evaluations → projet → évaluation → run → vue détaillée.
3. **Comparer des configurations** : relancer la même `Evaluation` avec plusieurs `System` (modèles, températures) et des tags (`temperature:0.7`) → tendances et filtres par tag dans Studio.
4. **Itérer sur les scorers sans relancer** : run task-only (`evaluators=[]`) → `rescore()` avec de nouveaux evaluators → re-fetch / Studio.
5. **Réparer un run partiel** : `retry_failed_records()` → le même run est patché en place.
6. **Optimiser un prompt** : `TunableSystem` + `Tunable` → `optimize(algo=SimpleOptimizer(...))` pour valider → `GEPA(...)` pour le vrai run → Studio : filtrer `optimization:*`, **Compare**.
7. **Évaluer à grande échelle ou de façon planifiée** : plugin Workflows → workflow `@workflow.define` appelant `evaluation.run()` → déclenchement depuis la page Workflows ou `client.workflows.execute_workflow(...)`.

---

## 5. API et SDK

### 5.1 Packages et points d'import

| Package | Langage | Module | Symboles documentés | Version min. citée |
|---|---|---|---|---|
| `mistralai[telemetry]` | Python | `mistralai.extra.observability` | `configure_telemetry`, `get_telemetry_tracer`, `AttributeRedactionPolicy`, `RedactingSpanExporter`, `default_redaction_policy` | `>= 2.4.13` |
| `@mistralai/mistralai` | TypeScript | `@mistralai/mistralai/extra/observability` | `configureTelemetry`, `getTelemetryTracer`, `AttributeRedactionPolicy`, `RedactingSpanExporter` | `>= 2.3.0` |
| `mistralai-evaluations` | Python ≥ 3.12 | `mistralai.evaluations` | `Mistral`, `Project`, `Evaluation`, `Dataset`, `Evaluator`, `RunEvaluator`, `Goal`, `Statistic`, `System`, `Score`, `TaskContext`, `ScorerContext`, `RunEvaluatorContext`, `RecordMetadataContext`, `RunMetadataContext`, `get_score`, `StaleRunEvaluatorWarning`, `Tunable`, `TunableSystem`, `SimpleOptimizer`, `GEPA` | optimisation : `0.6.0+` |
| (idem) | | `mistralai.evaluations.optimization` | `MutationRequest`, `MutationResult` | |
| `mistralai-workflows-plugins-evaluations` | Python ≥ 3.12 | `mistralai.workflows.plugins.evaluations` | `evaluation`, `EvalResult`, `GEPA`, `SimpleOptimizer`, `OptimizeResult`, `OptimizeCandidate`, `OptimizeVariant`, `MutatorRequest`, `MutatorProposal` (+ `Tunable`, `TunableSystem` importés depuis la racine dans un exemple) | — |
| (idem) | | `mistralai.workflows.plugins.evaluations.types` | `Evaluation`, `Evaluator`, `Goal`, `Project`, `RecordMetadataContext`, `RunEvaluator`, `RunEvaluatorContext`, `RunMetadataContext`, `Score`, `ScorerContext`, `Statistic`, `System`, `TaskContext`, `Tunable`, `TunableSystem` (ré-exports sûrs pour le sandbox Temporal) | — |
| `mistralai` | Python | `mistralai.client.utils` | `RetryConfig`, `BackoffStrategy` | — |

### 5.2 Fonctions de télémétrie

| Fonction | Signature observée | Rôle |
|---|---|---|
| `configure_telemetry` (Py) | `configure_telemetry(client, redaction=…)` ; `redaction` ∈ {omis = défaut, `AttributeRedactionPolicy()`, `False`, callable `(key, value) -> value \| None`} | Active le traçage automatique du client |
| `configureTelemetry` (TS) | `await configureTelemetry(client, "dedicated", { redaction })` ; `redaction` ∈ {omis, `new AttributeRedactionPolicy()`, `false`, `(key, value) => value \| undefined`} | Idem (asynchrone) |
| `get_telemetry_tracer` / `getTelemetryTracer` | `get_telemetry_tracer(client, "my-agent")` → tracer OTEL (`start_as_current_span`, `set_attribute`) | Spans manuels (outils, agent) |
| `RedactingSpanExporter` | `RedactingSpanExporter(exporter, policy)` | Rédaction dans un pipeline OTEL maison |
| `default_redaction_policy` | `default_redaction_policy()` | Politique par défaut à passer à l'exporteur |

Variables / réglages : `OTEL_ENABLED=true`, `OTEL_REDACTION=default|strict|none` (service Workflows) ; `VIBE_ENABLE_OTEL`, `VIBE_OTEL_REDACTION` (env Vibe CLI) ; `enable_otel`, `otel_redaction` (`~/.vibe/config.toml`). Collecteur : `POST https://api.mistral.ai/telemetry/v1/traces` (OTLP/HTTP JSON, `Authorization: Bearer`).

### 5.3 Evaluation SDK (`client.evaluation.*`)

#### `client.evaluation.run(...)` → `EvaluationRun`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `dataset` | `Sequence[Mapping[str, Any]] \| Dataset` | **requis** | Records inline ou dataset Studio ; **max 10 000 records par run** |
| `task` | `TaskFunction` | **requis** | `(ctx: TaskContext) -> output`, async ou sync |
| `evaluators` | `list[Evaluator]` | **requis** | Evaluators par record ; `[]` = run task-only |
| `run_evaluators` | `list[RunEvaluator]` | `[]` | Exécutés après tous les records |
| `project` | `Project` | `None` | Créé s'il est sélectionné par nom et absent |
| `evaluation` | `Evaluation` | `None` | Idem |
| `name` | `str` | `None` | Nom du run |
| `description` | `str` | `None` | Description du run |
| `metadata` | `dict` (ou callback `RunMetadataContext → dict`) | `{}` | Métadonnées clé-valeur |
| `tags` | `list[str]` | `[]` | Filtrage dans Studio |
| `num_generations` | `int` | `1` | Exécutions de la task par record |
| `local` | `bool` | `False` | `True` = pas d'upload |
| `system` | `System` | `None` | Config passée à task et scorers |
| `upload_batch_size` | `int` | `10` | Taille des lots d'upload en streaming (**max 500**) |
| `max_concurrency` | `int` | `10` | Records traités simultanément |
| `record_metadata` | callback `RecordMetadataContext → dict` | — | Utilisé dans le guide rescoring, absent du tableau de référence |

`EvaluationRun` : `records: list[EvaluationRunRecord]`, `statistics: dict[str, Statistics]`, `run_scores: dict[str, Any]`, `status: str | None` (`pending`/`running`/`completed`/`failed`/`cancelled`) ; `run_id` (utilisé dans les exemples, absent du tableau) ; méthode `show(mode="text"|"json", level="run"|"records"|"generations"|"scores")`. Un record expose `generations[i].output` (exemples).

#### Types de configuration

| Type | Paramètres | Règles |
|---|---|---|
| `Project` | `name`, `slug` | Au moins un ; nom → create-or-get ; slug → doit exister |
| `Evaluation` | `name`, `slug` | Au moins un ; nom → créée sous le projet ; slug → doit exister |
| `Dataset` | `id` (UUID), `slug` | Exactement un ; doit exister |
| `System` | `name: str` (**requis**, affiché dans Studio), `params: dict[str, Any]` (défaut `{}`) | Libre |
| `Goal` | `Goal.gte(x)`, `Goal.lte(x)`, `Goal.between(a, b)` ; option `metric` (`"avg"`, `"min"`, `"max"`, `"std"`) | Porte uniquement |
| `Statistic` | `avg()`, `sum()`, `min()`, `max()`, `std()`, `count()`, `percentile(p)`, `precision(...)`, `recall(...)`, `f1(...)` ; chacune accepte `goal=` ; classification : `positive_label` **ou** `average` (`macro`/`micro`/`weighted`), + `expected_key`, `labels` | Ids stables |
| `Score` | `value`, `rationale`, `metadata` | `metadata["expected"]` pour la classification |

#### `Evaluator(...)`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `name` | `str` | **requis** | Nom unique |
| `scorer` | `ScoreFunction` | **requis** | `(ctx: ScorerContext) -> value` ou `Score` |
| `description` | `str` | `None` | Affichée au survol dans Studio |
| `tags` | `list[str]` | `[]` | Tags |
| `num_scores` | `int` | `1` | Passes de notation par génération, moyennées |
| `goal` | `GoalSpec` | `None` | Goal par génération |
| `direction` | `"maximize"` \| `"minimize"` | `None` | Inféré du goal |
| `min_value` / `max_value` | `float` | `None` | Fenêtre de normalisation (les deux ou aucun) |
| `weight` | `float` | `1.0` | Poids dans l'objectif d'optimisation ; `0` = contrainte |
| `statistics` | `list[StatisticSpec]` | `None` | Statistiques exposées |
| `aggregate_goal` | `GoalSpec` | `None` | **Déprécié** |

#### `RunEvaluator(...)`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `name` | `str` | **requis** | Nom unique |
| `scorer` | `RunEvaluatorFunction` | **requis** | `(ctx: RunEvaluatorContext) -> value` ou `Score` |
| `description` | `str` | `None` | — |
| `tags` | `list[str]` | `[]` | — |
| `goal` | `GoalSpec` | `None` | Goal du score de run |

#### `client.evaluation.retry_failed_records(...)` → `RetryFailedRecordsResult`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `run_id` | `str` | **requis** | Run contenant des échecs |
| `dataset` | `Sequence[Mapping[str, Any]]` | **requis** | **Même** dataset que le run d'origine (liste) |
| `task` | `TaskFunction` | **requis** | Éventuellement corrigée |
| `evaluators` | `list[Evaluator]` | **requis** | Pour re-noter |
| `run_evaluators` | `list[RunEvaluator]` | — | Recalculés après patch |
| `num_generations` | `int` | `1` | — |
| `system` | `System` | — | — |
| `max_concurrency` | `int` | `10` | — |
| `upload_batch_size` | `int` | `10` | — |

Retour : `run_id`, `retried_count`, `patched_count`, `run_scores_recomputed: bool`.

#### `client.evaluation.rescore(...)` → `RescoreResult`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `run_id` | `str` | **requis** | Run persisté (un `EvaluationRun` est accepté comme raccourci) |
| `evaluators` | `list[Evaluator]` | `[]` | À ajouter/remplacer |
| `run_evaluators` | `list[RunEvaluator]` | `[]` | À ajouter/remplacer |
| `upload_batch_size` | `int` | `10` | Générations par lot d'upload de scores |
| `max_concurrency` | `int` | `10` | Notation simultanée |

Au moins une des deux listes non vide. Retour : `run_id`, `scored_generation_count: int`, `run_scores_recomputed: list[str]`, `potentially_stale_run_evaluators: list[str]`.

#### `client.evaluation.optimize(...)` → `OptimizeResult`

Pas de tableau de référence côté SDK ; paramètres observés dans les exemples et renvois : `project`, `evaluation`, `dataset` (**liste**), `task`, `evaluators`, `system` (`TunableSystem`, ≥ 1 `Tunable`), `algo` (`SimpleOptimizer` | `GEPA`), `steer` (≤ 4 000 car.), `tags`, `max_concurrency` (cité), `local=True` (cité par la page plugin). La table du plugin (§5.4) dit reprendre « les mêmes paramètres » (+ `run_evaluators`, `name`, `description`, `metadata`). Résultat : §3.15.7.

#### Autres méthodes citées

- `client.evaluation.update_run()` : patch léger de métadonnées, ne note pas (signature non documentée).
- `client.beta.observability.datasets.list_records_async(dataset_id, page_size, page)` : liste paginée des records d'un dataset Studio (`result.records.results`, `result.records.next`).

### 5.4 Plugin Workflows (`evaluation.*`)

#### `evaluation.run(...)` → `EvalResult` (depuis un `@workflow.entrypoint`)

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `dataset` | `Sequence[Mapping[str, Any]]` | **requis** | Liste de records (pas de `Dataset`) |
| `task` | fonction, classe ou `str` | **requis** | `@evaluation.task`, classe `@workflow.define`, ou nom de workflow |
| `evaluators` | `list[Evaluator]` | **requis** | Scorers `@evaluation.scorer` ; `[]` = task-only |
| `run_evaluators` | `list[RunEvaluator] \| None` | `None` | Scorers `@evaluation.run_scorer` |
| `project` / `evaluation` | `Project \| None` / `Evaluation \| None` | `None` | Créés si absents |
| `name` / `description` | `str \| None` | `None` | — |
| `tags` | `list[str] \| None` | `None` | — |
| `metadata` | `dict \| None` ou callback `@evaluation.run_metadata` | `None` | — |
| `record_metadata` | callback `@evaluation.record_metadata` \| `None` | `None` | Une fois par record |
| `system` | `System \| None` | `None` | — |
| `num_generations` | `int` | `1` | **1 à 100** |
| `local` | `bool` | `False` | Aucun appel à Studio |

Concurrence, timeouts et retries se règlent **sur les décorateurs**, pas sur `run()`.

`EvalResult` (modèle Pydantic ; `result.model_dump()` pour le renvoyer comme sortie de workflow) : `run_id: str` (`"local"` en local), `run_url: str | None`, `statistics: dict[str, EvaluatorStatistics]`, `run_scores: dict[str, Score]`, `potentially_stale_run_evaluators: list[str]` (renseigné par `rescore()` uniquement).

#### `evaluation.optimize(...)` → `OptimizeResult`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `system` | `TunableSystem` | **requis** | ≥ 1 `Tunable` |
| `dataset` | `list[dict[str, Any]]` | **requis** | Records |
| `task` | fonction, classe ou `str` | **requis** | Comme `run()` |
| `evaluators` | `list[Evaluator]` | **requis** | Définissent objectif et gates |
| `algo` | `SimpleOptimizer \| GEPA` | **requis** | Stratégie |
| `run_evaluators` | `list[RunEvaluator] \| None` | `None` | Enregistrés sur chaque run candidat, sans influence sur la sélection |
| `project` / `evaluation` | — | `None` | — |
| `steer` | `str \| None` | `None` | ≤ 4 000 caractères |
| `name` / `description` | `str \| None` | `None` | Générés depuis `steer` si omis |
| `tags` | `list[str] \| None` | `None` | — |
| `metadata` | `dict[str, Any] \| None` | `None` | Attachées à chaque run candidat |
| `local` | `bool` | `False` | **Non supporté : `ValueError`** |

Résultat : mêmes champs et verdicts que le SDK + `result.optimization_url`.

#### `evaluation.rescore(...)` → `EvalResult`

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `run_id` | `str` | **requis** | Run persisté |
| `evaluators` | `list[Evaluator] \| None` | `None` | Ajout/remplacement |
| `run_evaluators` | `list[RunEvaluator] \| None` | `None` | Ajout/remplacement/recalcul |
| `max_concurrency` | `int` | `10` | Générations notées simultanément |

Building blocks (`setup`, `upload_inputs`, `score`, `upload`) : §3.16.9. Décorateurs : §3.16.7.

#### Client Workflows (déclenchement)

| Méthode | Paramètres observés | Retour |
|---|---|---|
| `client.workflows.execute_workflow` | `workflow_identifier`, `input` | exécution |
| `client.workflows.execute_workflow_async` | `workflow_identifier`, `input`, `wait_for_result=False` | objet avec `execution_id` |
| `client.workflows.wait_for_workflow_completion_async` | `execution_id`, `polling_interval=5`, `max_attempts=240` | réponse avec `.result` (dict) |

### 5.5 API REST beta `/v1/observability/*` (spec OpenAPI locale)

> Les pages lues ne renvoient qu'aux sections **Traces** et **Spans** de la référence API (`/api/endpoint/beta/observability/traces`, `/api/endpoint/beta/observability/spans`). Le tableau suivant provient d'une lecture ciblée de la spec OpenAPI ; les tags OpenAPI (`beta.observability.*`) suggèrent l'arborescence SDK `client.beta.observability.<groupe>` (inférence, seule `datasets.list_records_async` est attestée dans la doc).

| Méthode | Chemin | Rôle (summary OpenAPI) | Tag |
|---|---|---|---|
| POST | `/v1/observability/traces/search` | Rechercher des traces (query `from`, `to`, `page_size`, `cursor` ; corps `TracesRequest {search_expression}`) | traces |
| POST | `/v1/observability/traces/aggregate` | Agréger des traces | traces |
| GET | `/v1/observability/traces/fields` | Définitions des champs de trace | traces |
| GET | `/v1/observability/traces/fields/{field_name}/options` | Options (valeurs) d'un champ | traces |
| GET | `/v1/observability/traces/{trace_id}` | Obtenir une trace | traces |
| GET | `/v1/observability/traces/{trace_id}/spans` | Spans d'une trace | traces |
| GET | `/v1/observability/traces/{trace_id}/spans/{span_id}` | Obtenir un span | traces |
| POST | `/v1/observability/spans/search` | Rechercher des spans | spans |
| POST | `/v1/observability/spans/aggregate` | Agréger des spans | spans |
| GET | `/v1/observability/spans/fields` (+ `/{field_name}/options`) | Champs de span et options | spans |
| POST | `/v1/observability/spans/evaluations/search` | Rechercher des évaluations de spans | spans |
| POST | `/v1/observability/spans/evaluations/search/latest` | Dernières évaluations de spans | spans |
| POST | `/v1/observability/spans/evaluations/aggregate` | Agréger des évaluations de spans | spans |
| GET | `/v1/observability/spans/evaluations/fields` (+ `/{field_name}/options`) | Champs d'évaluation de span | spans |
| POST | `/v1/observability/pipeline-results/search` | Rechercher des résultats de pipelines | spans |
| POST | `/v1/observability/logs/search` | Rechercher des logs | logs |
| GET | `/v1/observability/logs/fields` (+ `/{field_name}/options`) | Champs de log | logs |
| POST / GET | `/v1/observability/judges` | Créer un juge / lister (filtrage, recherche) | judges |
| GET / PUT / DELETE | `/v1/observability/judges/{judge_id}` | Lire / mettre à jour / supprimer un juge | judges |
| POST | `/v1/observability/judges/{judge_id}/live-judging` | Exécuter un juge sauvegardé sur une conversation | judges |
| POST / GET | `/v1/observability/datasets` | Créer un dataset vide / lister | datasets |
| GET / PATCH / DELETE | `/v1/observability/datasets/{dataset_id}` | Lire (par ID **ou slug**) / patcher / supprimer | datasets |
| GET / POST | `/v1/observability/datasets/{dataset_id}/records` | Lister les records / ajouter un record | datasets |
| POST | `/v1/observability/datasets/{dataset_id}/imports/from-file` | Import depuis un fichier téléversé (`file_id`) | datasets |
| POST | `/v1/observability/datasets/{dataset_id}/imports/from-playground` | Import de conversations Playground (`conversation_ids`) | datasets |
| POST | `/v1/observability/datasets/{dataset_id}/imports/from-spans` | Import de spans de télémétrie mappés | datasets |
| POST | `/v1/observability/datasets/{dataset_id}/imports/from-dataset` | Import depuis un autre dataset (`dataset_record_ids`) | datasets |
| GET | `/v1/observability/datasets/{dataset_id}/exports/to-jsonl` | Export vers la Files API + URL pré-signée du JSONL | datasets |
| GET | `/v1/observability/datasets/{dataset_id}/tasks` (+ `/{task_id}`) | Tâches d'import et leur statut | datasets |
| GET / DELETE | `/v1/observability/dataset-records/{dataset_record_id}` | Lire / supprimer un record | datasets.records |
| POST | `/v1/observability/dataset-records/bulk-delete` | Suppression multiple | datasets.records |
| PUT | `/v1/observability/dataset-records/{id}/payload` | Remplacer le payload | datasets.records |
| PUT | `/v1/observability/dataset-records/{id}/properties` | Remplacer les propriétés | datasets.records |
| POST | `/v1/observability/dataset-records/{id}/live-judging` | Juger un record (`judge_definition`) | datasets.records |
| POST / GET | `/v1/observability/pipelines` | Créer / lister des pipelines | evaluations |
| GET / PUT / DELETE | `/v1/observability/pipelines/{pipeline_id}` | Lire / mettre à jour / supprimer | evaluations |
| GET | `/v1/observability/projects` ; `/projects/{project_slug}` | Projets d'évaluation | evaluations.projects |
| GET | `/v1/observability/projects/{project_slug}/evaluations_v2` | Évaluations d'un projet | evaluations |
| GET | `/v1/observability/evaluations_v2/{evaluation_slug}` | Évaluation par slug | evaluations |
| POST | `/v1/observability/evaluations_v2/{evaluation_slug}/runs/search` | Runs d'une évaluation (filtres) | evaluations.runs |
| POST | `/v1/observability/evaluation-runs_v2/search` | Runs toutes évaluations confondues | evaluations.runs |
| GET | `/v1/observability/evaluation-runs_v2/{run_id}` | Un run | evaluations.runs |
| GET | `/v1/observability/evaluation-runs_v2/{run_id}/statistics` | Statistiques du run | evaluations.runs |
| POST | `/v1/observability/evaluation-runs_v2/{run_id}/statistics/compute` | Statistiques recalculées **avec filtres** | evaluations.runs |
| GET | `/v1/observability/evaluation-runs_v2/{run_id}/records/{record_id}` | Un record de run | evaluations.records |
| POST | `/v1/observability/evaluation-runs_v2/{run_id}/records/search` | Records d'un run (filtres de contenu) | evaluations.records |
| GET | `/v1/observability/optimizations` ; `/{optimization_id}` ; `/{optimization_id}/trials` | Optimisations, détail (avec évaluation et projet), essais paginés avec leurs runs d'observation | evaluations.optimizations |

#### Schémas clés (OpenAPI)

| Objet | Champs principaux |
|---|---|
| `GetTrace` | cf. §3.4.1 (identité org/workspace/user, IDs, temps, `service_name`, `environment`, `conversation_id`, `workflow_name`, `agent_id`/`agent_name`, `status_code` `Error`\|`Unset`, compteurs spans/LLM/outils/retrieval/évaluations, tokens dont cache, `models_used`, `tools_used`, messages premier/dernier tour) ; liste paginée `{results, next, cursor}` |
| `Judge` | `id`, `created_at`, `updated_at`, `deleted_at`, `owner_id`, `workspace_id`, `name`, `description`, `model_name`, `output`, `instructions`, `tools: list[str]`, révisions `up_revision`/`down_revision`/`base_revision` |
| `CreateJudgeRequest` | `name` (5–50 car.), `description` (≤ 500), `model_name` (≤ 500), `output` (discriminant `type`), `instructions` (≤ 10 000), `tools` — tous requis |
| `JudgeClassificationOutput` | `type: "CLASSIFICATION"`, `options: [{value, description}]` |
| `JudgeRegressionOutput` | `type: "REGRESSION"`, `min` (≥ 0, défaut 0), `min_description`, `max` (défaut 1, < 1e9), `max_description` |
| `JudgeOutput` | `analysis: str`, `answer: str \| number` |
| `JudgeConversationRequest` | `messages: list[object]`, `properties` |
| `Pipeline` | `id`, dates, `workspace_id`, `name`, `slug`, `description`, `selectors`, `enabled`, `creator_id`, `pipeline_configs` ; **suppression définitive** (pas de `deleted_at`) |
| `PipelineConfig` | `scope` (`workspace` \| `shared`), `name`, `slug`, `pipeline_kind` (`detection-v1` \| `moderation-v1` \| `judge-v1` \| `export-v1`), `selectors`, `sampling`, `enabled`, `definition`, `scorer_slug`, `scorer_version` |
| `PipelineConfigSelector` | `source_kind` (`span` \| `log` \| `metric`), `filter` (chaîne) |
| `PipelineConfigSampling` | `probabilistic` {`percentage` ∈ ]0, 100]} ou `attribute_hash` {`attribute`, `percentage`} |
| `JudgeDefinitionV1` | `model`, `prompt` (≤ 20 000), `temperature` (0–1.5), `top_p` (]0, 1]), `max_tokens`, `random_seed`, `result_spec` (`boolean` \| `categorical` {`labels`} \| `numeric` {`min`, `max`}), `mapping` (dict str→str), `use_cache` (défaut `true`) |
| `ModerationDefinitionV1` | `model` (défaut `mistral-moderation-latest`), `target_attributes` (défaut `gen_ai.input.messages`, `gen_ai.output.messages`) |
| `DetectionDefinitionV1` | `target_attributes`, `patterns` |
| `ExportDefinitionV1` | `destination` (`OTLPDestination`) |
| `CreatePipelineRequest` | `name`, `description`, `selectors` (≥ 1), `definitions` (≥ 1 `LlmJudgeReference` {`slug` `^[a-z0-9][a-z0-9-]*$`, `mapping`, `sampling`}), `enabled` (défaut `true`) |
| `Dataset` | `id`, dates, `name`, `slug`, `description`, `owner_id`, `workspace_id` |
| `DatasetRecord` | `id`, dates, `dataset_id`, `payload` (objet libre), `properties` (objet libre), `source` (`EXPLORER` \| `UPLOADED_FILE` \| `DIRECT_INPUT` \| `PLAYGROUND` \| `TELEMETRY_SPAN`) |
| `ImportDatasetFromSpansRequest` | `span_references` (1–500 × {`trace_id` 32 hex, `span_id` 16 hex} ; références indisponibles ignorées ; IDs de trace/span ajoutés en propriétés), `mapping_contract` {`version: 1`, `mappings: [{target_field, source_field}]`} (source manquante/nulle/vide → clé omise ; chaînes JSON objet/tableau → valeurs structurées) |
| `EvaluationRunV2Response` | `id`, dates, `creator_id`, `evaluation_id`, `name`, `description`, `tags`, `metadata_`, `num_generations`, `run_info`, `status` (défaut `completed`), `dataset_id`, `evaluators`, `run_evaluators`, `system`, `statistics`, `goal_results`, `passed`, `run_scores`, `optimization` |
| `EvaluatorV2` | `name`, `description`, `tags`, `num_scores`, `goal`, `aggregate_goal`, `statistics` (discriminant `kind` : `avg`, `sum`, `min`, `max`, `std`, `count`, `percentile`, `precision`, `recall`, `f1`), `weight` (1.0), `direction`, `min_value`, `max_value` |
| `GoalSpec` | `operator`, `value`, `min`, `max`, `values`, `metric` |
| `Optimization` | `id`, dates, `creator_id`, `project_id`, `evaluation_id`, `name`, `description`, `steer`, `tags`, `algorithm`, `status`, `source`, `workflow_execution_id`, `workflow_run_id`, `objective_spec`, `outcome` |

#### Erreurs

Format `ObservabilityError` : `{"detail": {"message": …, "error_code": …}}`. Codes (`ObservabilityErrorCode`) : `UNKNOWN_ERROR`, `VALIDATION_ERROR`, `AUTH_FORBIDDEN`, `AUTH_FORBIDDEN_NOT_WORKSPACE_ADMIN`, `AUTH_FORBIDDEN_WORKSPACE_NOT_FOUND`, `AUTH_FORBIDDEN_ROLE_NOT_FOUND`, `AUTH_UNAUTHORIZED`, `FEATURE_NOT_SUPPORTED`, `FIELDS_BAD_REQUEST`, `SEARCH_BAD_REQUEST`, `DATABASE_ERROR`, `DATABASE_TIMEOUT`, `DATABASE_UNAVAILABLE`, `DATABASE_QUERY_ERROR`, `SEARCH_FILTER_TO_SQL_CONVERSION_ERROR`, `JUDGE_CONVERSATION_FORMAT_ERROR`, `JUDGE_MISTRAL_API_ERROR`, `JUDGE_MISTRAL_API_TIMEOUT`, `JUDGE_NAME_ALREADY_EXISTS`, `JUDGE_NOT_FOUND`, `JUDGE_DID_NOT_CHANGE`, `DATASET_NOT_FOUND`, `DATASET_TASK_NOT_FOUND`, `DATASET_RECORD_NOT_FOUND`, `DATASET_RECORD_FORMAT_ERROR`, `AGENT_NOT_FOUND`, `AGENT_MISTRAL_API_ERROR`, `EVALUATION_NOT_FOUND`, `EVALUATION_CURRENTLY_RUNNING`, `EVALUATION_RECORD_NOT_FOUND`, `EVALUATION_RUN_NOT_FOUND`, `EVALUATION_RUN_TRANSITION_IS_INVALID`, `EVALUATION_RUN_TRANSITION_IS_RUNNING_ALREADY`, `EVALUATION_RUN_TRANSITION_ERROR`, `EVALUATION_RUN_OUTPUT_RECORD_CONFLICT`, `TEMPLATE_ERROR`, `TEMPLATE_SYNTAX_ERROR`, `PROJECT_NOT_FOUND`, `PROJECT_NAME_ALREADY_EXISTS`, `PIPELINE_CONFIG_NOT_FOUND`, `PIPELINE_CONFIG_ALREADY_EXISTS`, `PIPELINE_NOT_FOUND`, `PIPELINE_ALREADY_EXISTS`, `SCORER_NOT_FOUND`, `SCORER_ALREADY_EXISTS`, `SCORER_CONFIG_KIND_MISMATCH`, `EVALUATION_NAME_ALREADY_EXISTS`, `OPTIMIZATION_NOT_FOUND`, `OPTIMIZATION_TRIAL_KEY_ALREADY_EXISTS`, `TRACES_FILTER_QUERY_PARSE_ERROR`, `TRACE_NOT_FOUND`, `SPAN_NOT_FOUND`.

Codes HTTP côté optimisation/évaluation (doc) : `429 Too Many Requests` ; transitoires à relancer : `429`, `500`, `502`, `503`, `504`.

---

## 6. Limites, quotas, tarifs, disponibilité

| Sujet | Valeur |
|---|---|
| Statut | Private Preview (Observability) ; Enterprise uniquement (traces **et** évaluations hors ligne) |
| Tarif | Inclus dans le plan Enterprise pendant la Private Preview ; susceptible de changer à la GA |
| Rétention des traces | 30 jours |
| Envoi de traces | Toute clé API valide, pas de rôle ni de flag |
| Lecture | Org Admin (tous workspaces), Workspace Admin, Observability Viewer (lecture seule) |
| Python | 3.12+ (SDK d'évaluation et plugin) |
| Versions | `mistralai[telemetry] >= 2.4.13` ; `@mistralai/mistralai >= 2.3.0` ; `mistralai-evaluations` 0.6.0+ pour l'optimisation |
| Records par run | ≤ 10 000 (y compris lecture d'un dataset Studio) |
| `upload_batch_size` | défaut 10, max 500 |
| `max_concurrency` (SDK) | défaut 10 |
| `num_generations` (plugin, building blocks) | 1 à 100 |
| `steer` | ≤ 4 000 caractères |
| Décorateurs plugin | task 2 min / 2 essais / 5 ; scorer 1 min / 2 / 5 ; run_scorer 1 min / 2 ; metadata 1 min / 2 (/ 5 pour record_metadata) ; mutator 2 min / 2 |
| Relecture des records (run evaluators / run_metadata du plugin) | jusqu'à +10 min de timeout |
| Task « nom de workflow » | 10 min par record ; pas de retry ; 5 records simultanés (aussi pour classe workflow) |
| Rate limits | À l'échelle du compte ; 429 possibles lors des optimisations |
| Redaction configurable | SDK, Vibe CLI, workers Workflows auto-gérés ; Vibe Work/Code Web et workers hébergés : seulement en **déploiement dédié** |
| Studio Playground | N'émet pas de traces |
| OpenAPI (judges) | nom 5–50 car. ; description ≤ 500 ; instructions ≤ 10 000 ; prompt de définition de juge ≤ 20 000 ; température 0–1.5 |
| OpenAPI (datasets) | import depuis spans ≤ 500 spans/requête ; import depuis dataset ≤ 10 000 records |
| OpenAPI (pipelines) | échantillonnage en pourcentage ]0, 100] |

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Traces et rédaction**
- `configure_telemetry(client)` doit être appelé **avant** tout appel API, sinon pas de traces.
- Python : appels d'outils **non** tracés automatiquement → `get_telemetry_tracer`. Liste des opérations auto-tracées différente entre Python (LLM, embeddings, agents, FIM, OCR) et TS (+ modération, deep research).
- Brancher le SDK sur son propre setup OTEL désactive de fait l'argument `redaction` (le SDK ne possède plus l'exporteur).
- Custom OTEL : rédaction **désactivée** par défaut ; l'activer avec `RedactingSpanExporter`.
- Workflows : `OTEL_REDACTION` agit indépendamment de `OTEL_ENABLED`.
- Vibe Work / Vibe Code Web : rédaction faite **avant de quitter l'infrastructure Mistral** (et non sur la machine de l'utilisateur).
- La politique `default` ne connaît que quelques familles de motifs (jetons d'API, e-mails, séquences type carte, IPv4) ; PII en texte libre non garanties.
- `duration_ns` est en **nanosecondes** (5 s = `5000000000`).
- Recherche vide : souvent due à `status_code = 'Error'` ; repartir d'une simple plage temporelle.

**Évaluations**
- Une task **sync** bloquante plusieurs minutes peut faire passer un run vivant en `cancelled` (heartbeat affamé) → async ou `asyncio.to_thread`.
- `evaluators` est **requis** : `[]` = opt-in explicite à un run task-only ; l'omettre est une erreur.
- Scorers de porte : renvoyer `0`/`1` **numériques**, jamais `True`/`False` (sinon statistiques catégorielles, pas de `sum` ni percentile).
- `statistics=[]` supprime toute statistique ; liste explicite = pas de défauts ajoutés ; la première entrée devient headline.
- Pas de `rate` ni de `median` : utiliser `avg` sur 0/1 et `percentile(50)`.
- Échantillon vide : `count = 0`, autres statistiques `null` → un goal `sum <= 0` n'est pas satisfait par un dataset vide.
- Classification : label attendu à mettre dans `Score.metadata` (clé `expected` par défaut) ; sinon exclusion (`excluded_count`). Fixer `labels` pour garder `macro`/`weighted` comparables sous filtre.
- `aggregate_goal` **déprécié** → `Statistic.avg(goal=…)`.
- `min_value`/`max_value` : les deux ou aucun, `min_value < max_value`.
- Direction inférée : `gte` → maximize, `lte` → minimize, `between`/absent → maximize.
- `weight=0` : la gate reste active mais la métrique sort de l'objectif.
- Projet/évaluation **par nom** = création implicite ; **par slug** = doit exister. `Dataset` par slug ne crée jamais.
- Datasets Studio **mutables, non instantanés** : runs non comparables si le dataset a changé ; échec avant démarrage si modification pendant la lecture.
- `Dataset` accepté par `run()` seulement (pas par `optimize`, `retry_failed_records`, ni par le plugin).
- Changer le prompt d'un juge rend les scores non comparables entre runs.
- Un run evaluator s'exécute même si des records ont échoué, sur les seuls records réussis.
- `retry_failed_records` cible les records au statut `"error"` (génération **ou** notation) ; exige le **même** dataset (liste).
- `rescore` : remplacement **complet** du jeu de scores d'un evaluator du même nom ; passage génération ↔ run rejeté ; `record_metadata`/`generation_metadata` vides au `run()` initial ; run evaluators non recalculés → `StaleRunEvaluatorWarning`.
- `RescoreResult` n'est qu'un reçu : re-fetch du run nécessaire pour lire les scores.

**Optimisation**
- Au moins un `Tunable` ; bornes appliquées par écrêtage.
- Aucun candidat ne passe les gates → `best_attempt` ou `no_change`, jamais `success`.
- `SimpleOptimizer` valide sur le même jeu qu'il optimise → risque de sur-apprentissage ; `GEPA` avec `holdout` pour un gain honnête ; `holdout=0` sur petits datasets.
- `GEPA(split=…)` : labels inconnus → records ignorés avec avertissement ; callback de split déterministe et sans I/O ; partitions explicites prioritaires.
- Le SDK ne relance **pas** les appels de la task/des scorers → `RetryConfig` sur le client ; il relance en revanche ses appels internes de mutateur.
- `steer` n'altère ni objectif ni gates.

**Plugin Workflows**
- Toute fonction non décorée est rejetée ; importer les types depuis `...evaluations.types` (sûr pour le sandbox).
- `max_concurrency` de la task = budget **records × générations** ; pour les scorers, le **minimum** parmi les evaluators s'applique.
- Run evaluators : records relus depuis Studio, ordre d'upload, records sans générations si upload raté, fonction à enregistrer sur le bon worker.
- Tâches workflow : pas de retry du child workflow, 10 min par record pour un nom de workflow, 5 records simultanés.
- Building blocks : chaque record téléversé doit porter exactement `num_generations` générations, sinon « incomplet ».
- `evaluation.optimize(local=True)` → `ValueError` ; `run_evaluators` sans effet sur la sélection.
- Pas de `show()` sur `EvalResult` ; pas de `retry_failed_records()`.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Valeurs de `status_code`** : l'Explorer documente `Ok` / `Error` (exemple `status_code IN ('Error', 'Ok')`), alors que le schéma OpenAPI `GetTrace.status_code` a l'enum `Error` / `Unset`.
2. **Portée du paramètre `metric` des goals** : la page *Set goals* dit que toutes les méthodes `Goal` acceptent `metric` (`avg`/`min`/`max`/`std`) ; la page *Statistics* affirme que seul le chemin déprécié `aggregate_goal` utilise `metric` et qu'un goal de statistique n'en porte jamais. Le statut de `goal=Goal.gte(..., metric=…)` au niveau génération n'est pas clarifié.
3. **Granularité de `goal`** : la page d'accueil des évaluations commente `goal=Goal.gte(0.8)` par « chaque *record* doit scorer ≥ 0.8 », la page Goals par « chaque *génération* ».
4. **Statistiques par défaut** : la page d'accueil cite `avg, min, max, std` ; les pages Evaluators/Statistics ajoutent `count`.
5. **`aggregate_goal`** encore présenté sans mention de dépréciation dans le quickstart/onglet Goals, mais déprécié dans Statistics et API reference.
6. **Accès « clé API suffisante » vs checklist** : envoyer des traces ne requiert « qu'une clé valide », mais la checklist de dépannage exige une clé d'un **workspace Enterprise avec Observability activée** — on ne sait pas si des traces envoyées depuis un workspace non éligible sont rejetées ou ignorées.
7. **Modes de `configureTelemetry`** (TS) : seul `"dedicated"` est montré ; les autres modes et le sens exact de « dedicated mode » (aussi utilisé côté Python) ne sont pas documentés.
8. **Tags de trace** : « tags personnalisés issus de l'usage SDK » — aucune API pour poser ces tags n'est décrite.
9. **`run_id` et `record_metadata`** : utilisés dans les exemples SDK mais absents des tableaux de référence (`EvaluationRun`, `evaluation.run()`). De même, `ScorerContext.record_metadata`/`generation_metadata` n'apparaissent pas dans le tableau *Context objects*.
10. **`client.evaluation.optimize()`** n'a pas de tableau de paramètres côté SDK (renvoi implicite au tableau du plugin) ; `local=True` et `max_concurrency` y sont seulement mentionnés indirectement.
11. **Noms de types de mutateur divergents** : SDK `MutationRequest`/`MutationResult` (`parent.overrides`, `parent.failures`, `overrides`) vs plugin `MutatorRequest`/`MutatorProposal` (`current`, `failures`, `changed`).
12. **Retour de `rescore`** : `RescoreResult` dans le SDK, `EvalResult` dans le plugin ; défauts `[]` vs `None` ; `upload_batch_size` absent côté plugin.
13. **Statut `pending`** listé mais jamais décrit (quand un run est-il `pending` ?).
14. **`num_generations` max** : 100 dans le plugin, aucune borne documentée dans le SDK.
15. **Juges et pipelines en ligne** : l'OpenAPI expose des **judges** sauvegardés (`CLASSIFICATION`/`REGRESSION`, outils, révisions, live judging sur conversation ou record) et des **pipelines** (`judge-v1`, `detection-v1`, `moderation-v1`, `export-v1`, sélecteurs `span`/`log`/`metric`, échantillonnage probabiliste ou par hash d'attribut, scope `workspace`/`shared`) ainsi que des « span evaluations » et « pipeline results », sans aucune page de doc correspondante dans ce périmètre — fonctionnalités probablement en cours de déploiement ou documentées ailleurs (inférence).
16. **Datasets Studio** : la création/curation dans l'UI n'est décrite par aucune page lue ; seules la sélection SDK, l'import JSONL et (côté OpenAPI) les endpoints d'import/export l'attestent.
17. **URL console des évaluations** non fournie (seul le chemin « Observability > Evaluate > Evaluations ») ; idem pour l'écran d'attribution du rôle Observability Viewer.
18. **Lien d'ancre** `/studio/observability/evaluations#guides` cité par la page plugin alors que la section s'intitule « Explore the docs ».
19. **Intervalles de confiance** évoqués comme usage de `num_generations` sans méthode de calcul fournie (seuls moyenne et écart-type par record sont calculés).
20. **Sémantique d'un retour `None`/`undefined`** dans un callback de rédaction (suppression de l'attribut vs valeur masquée) non précisée.

---

## Annexe — Couverture

| # | Fichier | Source | Statut |
|---|---|---|---|
| 1 | `resources/observability-integrations.md` | https://docs.mistral.ai/resources/observability-integrations.md | ✅ lu en entier |
| 2 | `studio/observability.md` | https://docs.mistral.ai/studio/observability.md | ✅ lu en entier |
| 3 | `studio/observability/evaluations.md` | https://docs.mistral.ai/studio/observability/evaluations.md | ✅ lu en entier |
| 4 | `.../evaluations/advanced-guides/context-objects.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/context-objects.md | ✅ lu en entier |
| 5 | `.../evaluations/advanced-guides/local-mode.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/local-mode.md | ✅ lu en entier |
| 6 | `.../evaluations/advanced-guides/multiple-evaluators.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/multiple-evaluators.md | ✅ lu en entier |
| 7 | `.../evaluations/advanced-guides/num-generations.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/num-generations.md | ✅ lu en entier |
| 8 | `.../evaluations/advanced-guides/rescoring.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/rescoring.md | ✅ lu en entier |
| 9 | `.../evaluations/advanced-guides/retry-failed-records.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/retry-failed-records.md | ✅ lu en entier |
| 10 | `.../evaluations/advanced-guides/run-evaluators.md` | https://docs.mistral.ai/studio/observability/evaluations/advanced-guides/run-evaluators.md | ✅ lu en entier |
| 11 | `.../evaluations/api-reference.md` | https://docs.mistral.ai/studio/observability/evaluations/api-reference.md | ✅ lu en entier |
| 12 | `.../evaluations/datasets.md` | https://docs.mistral.ai/studio/observability/evaluations/datasets.md | ✅ lu en entier |
| 13 | `.../evaluations/evaluators.md` | https://docs.mistral.ai/studio/observability/evaluations/evaluators.md | ✅ lu en entier |
| 14 | `.../evaluations/goals.md` | https://docs.mistral.ai/studio/observability/evaluations/goals.md | ✅ lu en entier |
| 15 | `.../evaluations/optimization.md` | https://docs.mistral.ai/studio/observability/evaluations/optimization.md | ✅ lu en entier |
| 16 | `.../evaluations/statistics.md` | https://docs.mistral.ai/studio/observability/evaluations/statistics.md | ✅ lu en entier |
| 17 | `.../evaluations/system-params.md` | https://docs.mistral.ai/studio/observability/evaluations/system-params.md | ✅ lu en entier |
| 18 | `.../evaluations/workflows-plugin.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin.md | ✅ lu en entier |
| 19 | `.../workflows-plugin/api-reference.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin/api-reference.md | ✅ lu en entier |
| 20 | `.../workflows-plugin/building-blocks.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin/building-blocks.md | ✅ lu en entier |
| 21 | `.../workflows-plugin/decorators.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin/decorators.md | ✅ lu en entier |
| 22 | `.../workflows-plugin/optimization.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin/optimization.md | ✅ lu en entier |
| 23 | `.../workflows-plugin/rescoring.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin/rescoring.md | ✅ lu en entier |
| 24 | `.../workflows-plugin/task-modes.md` | https://docs.mistral.ai/studio/observability/evaluations/workflows-plugin/task-modes.md | ✅ lu en entier |
| 25 | `studio/observability/traces.md` | https://docs.mistral.ai/studio/observability/traces.md | ✅ lu en entier |
| 26 | `studio/observability/traces/data-redaction.md` | https://docs.mistral.ai/studio/observability/traces/data-redaction.md | ✅ lu en entier |
| 27 | `studio/observability/traces/explorer.md` | https://docs.mistral.ai/studio/observability/traces/explorer.md | ✅ lu en entier |
| 28 | `studio/observability/traces/send-traces.md` | https://docs.mistral.ai/studio/observability/traces/send-traces.md | ✅ lu en entier |

Complément : spec OpenAPI locale (`scratchpad/web/openapi.yaml`) consultée par grep ciblé sur les chemins `/v1/observability/*` et les schémas `GetTrace`, `TracesRequest`, `Judge`, `CreateJudgeRequest`, `Judge*Output`, `JudgeDefinitionV1`, `Pipeline*`, `*DefinitionV1`, `LlmJudgeReference`, `Dataset`, `DatasetRecord`, `DatasetRecordSource`, `ImportDataset*Request`, `SpanDatasetMapping*`, `EvaluationRunV2Response`, `EvaluatorV2`, `GoalSpec`, `GoalResult`, `Optimization`, `ObservabilityError*`.
