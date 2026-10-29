---
name: nexora-decision-bases
description: "Décision (2026-10-21, révisée) sur les bases open source de Nexora — Sim pour la console, OpenGateLLM pour l'API, LibreChat pour l'assistant, API compatible Mistral"
metadata:
  node_type: memory
  type: project
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-22T04:52:31.244Z
---

Le fondateur a délégué le choix des bases open source (« je te laisse décider »). Il a ensuite précisé :
- la langue n'est pas un critère : tout sera traduit, repris et amélioré ;
- la base sera téléchargée puis modifiée en profondeur ;
- Sim lui paraît proche de Mistral.

Décision révisée le 2026-10-21, détaillée dans docs/recherche/open-source/00-decision-bases-et-briques.md. Elle reste à valider dans le design (brainstorming).

- Nexora API : fork dur d'OpenGateLLM (etalab-ia, MIT, DINUM).
- Nexora Studio (console) : **Sim** (simstudioai/sim, cœur Apache-2.0), à conditions :
  - supprimer `apps/sim/ee/` (≈ 52 000 lignes propriétaires, 14 modules, ≈ 200 symboles importés par ≈ 220 fichiers du cœur) ;
  - réécrire ces modules en salle blanche, sans jamais ouvrir le code `ee/` ;
  - reconstruire le copilot (le service par défaut, copilot.sim.ai, est fermé) ;
  - couper la télémétrie PostHog et Sentry ;
  - ajouter un système de traduction (absent).
  - Plan B : Bisheng (Apache-2.0, gouvernance dans le cœur). Plan C : Langflow (MIT).
- **Nexora WorkStudio** (idée du fondateur, validée le 2026-10-21) : Studio et Workflows en une seule application, à partir du fork de Sim.
- **Nexora Connect** : fork d'OpenConnector (oomol-lab/open-connector, Apache-2.0, 1 679 services, SDK/CLI/MCP/HTTP). Service séparé, branché sur WorkStudio, l'Assistant et l'API. Conditions : chiffrement obligatoire, appels OOMOL retirés, nos propres applications OAuth.
- OpenFlow (SeeRay11) est écarté de WorkStudio : fork d'opencode pour agents de code, local, SolidJS, 2 mois. Gardé comme idée pour Nexora Code.
- Nexora Assistant : LibreChat (MIT). Plus tard : Desktop = AionUi (Apache-2.0, client mono-utilisateur) ; Code = mistral-vibe (Apache-2.0).
- Workflows : Sim pour le visuel. Pour le code durable : Temporal + SDK Workflows de Mistral (Apache-2.0) renommé.
- Levier : API compatible OpenAI puis Mistral, pour réutiliser l'outillage Apache-2.0 de Mistral, avec revue juridique.
- Écartés :
  - Dify, FastGPT, Open WebUI, LobeHub, n8n, Suna (licence) ;
  - Onyx (gouvernance en `ee/`) ;
  - Dust (pas d'auto-hébergement, WorkOS) ;
  - Coze Studio (amont figé).

- Test réel fait sur pc6 le 2026-10-22 : les 4 briques tournent ensemble, rapport dans docs/recherche/test-reel/. Sur ARM64, OpenGateLLM doit être recompilé (pas d'image ARM). Le compte pc6 est dans le groupe docker (utiliser `sg docker -c`).

**Why:** aucune base ne couvre seule Studio. Sim est le plus proche de l'expérience « Build » de Studio, avec ≈ 370 blocs d'intégration et une pile Next.js/Postgres. Son seul obstacle est son `ee/` propriétaire, mesuré et contournable.
**How to apply:** ne pas rouvrir ces choix sans fait nouveau. Pour Sim, ne jamais lire ni copier `ee/`. Le spike (docker compose de Sim sans `ee/`, Bisheng, LibreChat, OpenGateLLM, AionUi) exécute du code tiers : demander l'accord du fondateur. Voir [[nexora-vision-produit]] et [[superpowers-workflow]].
