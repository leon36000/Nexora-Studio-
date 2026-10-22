# Test réel des bases de Nexora sur pc6 (22/10/2026)

> **Nature** : test jetable (« spike » au sens superpowers), approuvé par le fondateur. Les quatre bases retenues ont été installées par Docker sur pc6 (ARM64, NVIDIA GB10), puis reliées entre elles. Des scénarios PME ont été joués dans le navigateur.
> Les comptes et les secrets sont des valeurs de test générées pour l'occasion et stockées hors du projet. Rien n'a été modifié dans le code des projets testés. Les captures sont dans [`captures/`](captures/).

## 1. En bref

- **Les quatre briques tournent ensemble et se parlent** :
  - **Nexora API** (OpenGateLLM) sert le modèle ;
  - **Nexora WorkStudio** (Sim) et **Nexora Assistant** (LibreChat) consomment ce modèle via Nexora API ;
  - **Nexora Connect** (OpenConnector) est branché en MCP dans Sim **et** dans LibreChat.
- **Scénarios réussis de bout en bout** :
  - un workflow Sim « devis » (Agent → modèle via Nexora API, 14,8 s) ;
  - une conversation LibreChat « relance de facture impayée » en streaming ;
  - une action réelle exécutée par OpenConnector ;
  - la découverte des outils MCP de Nexora Connect par Sim ;
  - la mesure de la consommation par Nexora API.
- **Ce qui a dû être adapté** (utile pour la suite) :
  - les images d'OpenGateLLM n'existent qu'en amd64 : il a fallu les recompiler en ARM64 ;
  - le connecteur `vllm` d'OpenGateLLM ne fonctionne qu'avec un vrai vLLM : le connecteur `openai` passe partout ;
  - la mise en réseau entre conteneurs se fait par des réseaux Docker partagés, et des noms de services en double ont créé un conflit (les deux Redis) ;
  - LibreChat bloque par défaut les serveurs MCP internes : il faut une liste d'autorisation.
- **Pas testé, faute de prérequis** :
  - la base de connaissances (aucun modèle d'embeddings servi localement) ;
  - les connecteurs OAuth (pas d'applications OAuth enregistrées) ;
  - l'invitation de membres (pas de service d'e-mail) ;
  - le copilot de Sim (service hébergé chez Sim, volontairement non utilisé) ;
  - Sim **sans** `ee/`. Le test a utilisé l'image officielle, ce que la licence de `ee/` autorise pour l'évaluation. La sortie de `ee/` est prouvée séparément par compilation (rapport [06](../open-source/06-faisabilite-sim-sans-ee.md)).

## 2. Architecture montée

```
                 ┌──────────────────────────────┐
 navigateur ───► │ Sim (WorkStudio) :3000        │──┐ VLLM_BASE_URL → Nexora API (réseau partagé)
                 └──────────────────────────────┘  │ MCP → Nexora Connect
                 ┌──────────────────────────────┐  │
 navigateur ───► │ LibreChat (Assistant) :3080   │──┤ endpoint « Nexora » → Nexora API
                 └──────────────────────────────┘  │ MCP « nexora-connect »
                 ┌──────────────────────────────┐  │
                 │ OpenGateLLM (Nexora API) :18200│◄─┘ clés, organisations, rôles, usage
                 └──────────────┬───────────────┘
                                │ connecteur « openai »
                 ┌──────────────▼───────────────┐
                 │ Ollama local (qwen2.5:7b)     │  (le vLLM Qwen 3.8 de la machine s'est arrêté pendant le test)
                 └──────────────────────────────┘
                 ┌──────────────────────────────┐
                 │ OpenConnector (Connect) :18400│  1 650 services, API HTTP + MCP (5 outils)
                 └──────────────────────────────┘
```

Tous les ports sont liés à `127.0.0.1` : rien n'est exposé sur le réseau local.

## 3. Résultats par scénario

| # | Scénario PME | Où | Résultat | Preuve |
|---|---|---|---|---|
| 1 | Brancher le modèle maison via la passerelle | Nexora API → Sim, LibreChat | ✅ Clé créée ; modèle `nexora-qwen` listé ; Sim le voit sous `vllm/nexora-qwen` et LibreChat le récupère automatiquement | [`08`](captures/08-librechat-modele-nexora.jpg) |
| 2 | Automatiser un devis | Sim (workflow Start → Agent) | ✅ Devis structuré (tableau, TVA 20 %) en 14,8 s | [`02`](captures/02-sim-bloc-agent.jpg), [`03`](captures/03-sim-devis-execute.jpg) |
| 3 | Relancer une facture impayée | LibreChat | ✅ E-mail complet, réponse en streaming | [`09`](captures/09-librechat-relance-facture.jpg) |
| 4 | Connecter des outils | OpenConnector + Sim + LibreChat | ✅ Action réelle exécutée par HTTP ; serveur MCP « Nexora Connect » ajouté dans Sim, ses 5 outils découverts ; MCP initialisé dans LibreChat | [`07`](captures/07-sim-mcp-nexora-connect.jpg) |
| 5 | Gérer les membres et les droits | Sim | ◐ La page Teammates gère un rôle par membre et propose l'invitation, mais l'envoi n'a pas été testé (pas de service d'e-mail) | [`06`](captures/06-sim-membres-roles.jpg) |
| 6 | FAQ et base de connaissances | Sim | ○ Non testé : il faut un modèle d'embeddings derrière Nexora API (TEI + BGE-M3 ou Qwen3-Embedding) | [`05`](captures/05-sim-bases-connaissances.jpg) |
| 7 | Mesure de la consommation | Nexora API | ✅ `/v1/me/usage` restitue les jetons (304 en entrée, 830 en sortie sur la période) | — |

## 4. Ce que le test apprend pour la conception

1. **Le découpage tient.** API (passerelle), WorkStudio (construction), Assistant (usage), Connect (outils) se branchent par des standards : API compatible OpenAI et MCP. Aucune modification de code n'a été nécessaire pour relier les quatre briques.
2. **Sim est la bonne base pour WorkStudio.** L'interface est soignée et le catalogue d'intégrations immense. Les réglages couvrent déjà secrets, outils MCP, outils sur mesure, clés d'API, sandboxes et auto-hébergement. À noter : le menu « Sandboxes » est marqué « Max » (réservé à une offre payante chez Sim), donc à revoir dans notre version.
3. **LibreChat s'affiche en français** selon la langue du navigateur, avec une traduction partielle à compléter. On le rebrande par simple configuration (message d'accueil) : le rebranding complet demandera des modifications de code.
4. **OpenConnector est prêt à l'emploi.** Son serveur MCP expose seulement 5 outils généralistes plutôt que des centaines, ce qui économise le contexte des modèles. Mais son catalogue compte très peu d'outils français (Brevo, lemlist) : cela confirme le rapport [05](../open-source/05-enrichissement-workstudio.md), il faudra écrire nos propres connecteurs PME (Factur-X, Pennylane, Qonto, Sirene…).
5. **Il faut maîtriser l'empaquetage multi-architecture.** OpenGateLLM ne publie pas d'image ARM64, alors que l'infrastructure souveraine et les postes récents sont souvent en ARM. Notre fork devra publier des images amd64 et arm64.
6. **Une seule passerelle de modèles simplifie tout.** Sim et LibreChat n'ont aucune clé de fournisseur externe : toute la consommation passe par Nexora API, qui identifie et mesure. C'est la base de quotas visibles, l'irritant n° 1 des utilisateurs de Mistral (chap. 37).
7. **Prochaines briques à ajouter pour un test complet** :
   - un modèle d'embeddings et un reranker servis par Nexora API, pour les bases de connaissances ;
   - un service d'e-mail de test (Mailpit), pour les invitations ;
   - une application OAuth de test, pour un vrai connecteur (Google ou Microsoft) ;
   - Langfuse, pour les traces ;
   - Keycloak, pour un SSO commun aux trois interfaces.

## 5. Environnement et reproductibilité

- **Machine** : pc6, Linux aarch64, NVIDIA GB10, Docker 29.6.2, Compose v5.2.0 (accès Docker accordé par le fondateur le 22/10/2026).
- **Images** :

  | Brique | Images |
  |---|---|
  | Sim | `ghcr.io/simstudioai/{simstudio,realtime,migrations,cron}:latest`, `pgvector/pgvector:pg17`, `redis:7-alpine` |
  | OpenConnector | `ghcr.io/oomol-lab/open-connector:latest` |
  | LibreChat | `ghcr.io/danny-avila/librechat:latest` (v0.8.7), `mongo:8.0.20` |
  | OpenGateLLM | `nexora-spike/ogl-api:arm64`, compilée en local à partir du dépôt, avec `postgres:16.5` et `redis/redis-stack-server` |

- **Fichiers du test** (compose, configurations, secrets de test en `chmod 600`) : dans le scratchpad de la session, hors du projet.
- **Relais réseau** : un petit relais TCP temporaire permet aux conteneurs de joindre l'Ollama de la machine. Le vLLM, lui, tournait dans un espace réseau que les conteneurs ne voyaient pas.

**Arrêter et supprimer l'environnement de test** (sans toucher à vLLM ni à Ollama) : `docker compose down -v` dans chacun des quatre dossiers de test.
