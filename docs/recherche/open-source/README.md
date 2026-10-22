# Recherche open source — bases et briques pour la suite Nexora

Recherche du 21/10/2026 sur les projets open source qui peuvent accélérer la construction de Nexora (équivalent de Mistral Studio pour les PME). Aucun prix n'a été étudié (consigne du fondateur).

**Commencer par [00-decision-bases-et-briques.md](00-decision-bases-et-briques.md)** : la décision argumentée (bases retenues par surface produit, briques, stratégie de compatibilité d'API, risques, prochaine étape).

| # | Document | Contenu |
|---|---|---|
| 00 | [Décision : bases et briques](00-decision-bases-et-briques.md) | Choix final et argumenté de l'agent principal, vérifications faites dans le code, plan de validation |
| 01 | [Briques du moteur IA](01-briques-moteur-ia.md) | Environ 300 projets vérifiés : inférence, passerelles, agents, workflows durables, MCP, bacs à sable, OCR, audio, fine-tuning, garde-fous, modèles open-weight et leurs licences |
| 02 | [Briques plateforme et console](02-briques-plateforme-console.md) | 298 projets vérifiés : observabilité, évaluations, prompts, RAG et bases vectorielles, constructeurs low-code, identité, secrets, outils pour développeurs, composants de console, infrastructure souveraine |
| 03 | [Bases pour la console développeur](03-bases-plateforme-developpeur.md) | 50 candidats triés, 8 finalistes notés de C1 à C10 (Bisheng, Dust, Coze Studio, Sim, Langflow, MaxKB, LiteLLM, OpenGateLLM) |
| 04 | [Bases pour l'assistant utilisateur](04-bases-assistant-cowork.md) | 45 candidats triés, 8 finalistes notés (LibreChat, Onyx, AnythingLLM, La Suite Conversations, AionUi, Dust, OpenClaw, PipesHub) ; analyse dédiée d'AionUi |

| 05 | [Enrichissement de WorkStudio](05-enrichissement-workstudio.md) | ≈ 200 projets : ce qui manque à Sim face à Studio, remplacement de ses fonctions entreprise, besoins des PME françaises (Factur-X, data.gouv, génération de documents…), expérience utilisateur ; top 15 et feuille de route |
| 06 | [Faisabilité de Sim sans `ee/`](06-faisabilite-sim-sans-ee.md) | Remplacement « salle blanche » des modules propriétaires : 0 erreur de type, inventaire et effort |

**Méthode** : les métadonnées viennent d'ecosyste.ms, les licences de leur fichier LICENSE brut. Le code a été lu dans des clones en lecture seule : rien n'a été installé ni exécuté. Les documents 01 à 04 ont été produits par des agents Haiku (effort élevé) à partir d'une grille commune. La décision 00 a été prise par l'agent principal, après des vérifications directes dans le code.

**Rappel** : ce sont des informations de recherche, pas des avis juridiques. Chaque licence retenue doit être relue avant l'intégration, et la stratégie de compatibilité d'API validée par un juriste.
