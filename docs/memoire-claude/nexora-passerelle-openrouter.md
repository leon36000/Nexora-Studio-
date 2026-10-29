---
name: nexora-passerelle-openrouter
description: Décisions du 28/10/2026 sur la passerelle de modèles du nouveau site — OpenRouter comme amont unique, marge 10 %, cinq modèles en brouillon, tranches restantes
metadata:
  type: project
---

Conception : `docs/superpowers/specs/2026-10-29-passerelle-modeles-comptage-gabarits-design.md` (dépôt Nexora-Studio). Code : `~/Desktop/NexoraSite` (dépôt `root/nexora-web`).

MISE À JOUR 28/10 (soir) : le fondateur met ses PROPRES fournisseurs (DeepSeek, Z.ai, MiniMax, Moonshot, DeepInfra…) avec sa clé chacun et fixe lui-même les prix ; OpenRouter n'est plus qu'une route de secours désactivée. Tranches faites et poussées (site, dernier commit 2ebfbba) : fiches, fournisseurs directs, plages horaires + écriture du cache + jetons de raisonnement, organisation « maison » (`bun run --cwd web house:org`), routes de secours + coût par route + rapprochement (`GET /api/admin/catalog/usage-report`), fiche technique publique. Reste : assistant d'ajout de modèle dans Directus, panneau client (historique de requêtes, export), WorkStudio → passerelle (G8), gabarits (agent en cours dans un worktree), module Directus « routes ».

Décisions du fondateur : **marge 10 %** (plancher 10 %) ; **une seule clé amont : OpenRouter** pour tous les modèles ; le reste laissé à mon jugement (MiniMax M3.1 Flash seulement ; WorkStudio appelle la passerelle du site ; organisation « maison » pour son accès gratuit).

Fait (tranche 1, commit c1773a1 du site, poussé sur GitLab et pc1 ; GitHub `leon36000/NexoraSite` refuse l'accès SSH) : colonnes `models.sheet` et `models.routing`, validateurs `web/src/server/gateway/sheet.ts`, chargement rejouable `bun run --cwd web models:seed` (fournisseur `openrouter`, secret `llm.openrouter`, cinq modèles `nexora/deepseek-v4.1-flash-1017`, `nexora/glm-5.3`, `nexora/glm-5.3-flash`, `nexora/minimax-m3.1-flash`, `nexora/kimi-k3.1-pro`), tous en brouillon dans la base de développement.

**Why:** les prix d'OpenRouter varient de 0,07 $ à 2,80 $ selon l'hébergeur pour un même modèle : la référence de coût est le prix du fournisseur d'origine, plafonné par `routing.maxPriceUsdMicro`, `dataCollection: deny`. Frais d'OpenRouter 5,5 % à l'achat de crédits : la marge nette de 10 % tombe vers 4 %.

**How to apply:** ne rien publier avant que le fondateur ait saisi la clé OpenRouter dans le Coffre (type `llm_provider`, référence `llm.openrouter`) et que les plages horaires DeepSeek (G1) existent. Tranches restantes dans l'ordre : G1/G2 (plages horaires DeepSeek, écriture du cache Kimi, jetons de raisonnement), organisation « maison » (G9), panneau client type OpenRouter (G4), assistant d'ajout de modèle (G5), rapprochement avec `usage.cost` d'OpenRouter (G7), WorkStudio vers la passerelle (G8), gabarits (G10). Identifiants Directus : `NexoraSite/deploy/.env` (ne jamais les écrire dans la conversation).
