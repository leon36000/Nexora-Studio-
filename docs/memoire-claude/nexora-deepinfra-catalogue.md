---
name: nexora-deepinfra-catalogue
description: Demande du 29/10/2026 (soir) — DeepInfra est le serveur de modèles ; catalogue trié des seuls modèles hébergés par DeepInfra, pages publiques façon OpenRouter visibles sans connexion
metadata:
  type: project
---

Le fondateur a décidé que **DeepInfra héberge tous les modèles** (fournisseur `deepinfra`, compatible OpenAI, `https://api.deepinfra.com/v1/openai`, clé du fondateur dans le Coffre `llm.deepinfra`). Il veut : tous les modèles PERTINENTS, **seulement ceux hébergés par DeepInfra** (exclure les « partenaires » `is_partner` : Claude, Gemini, Seed, Qwen3.8-Max/Flash, gpt-oss-Ultra…), parmi les DeepSeek **uniquement V4.1 Flash 1017**, triés pour bien les choisir, et des **pages publiques façon OpenRouter** (liste filtrable + fiche avec benchmarks, prix, specs) visibles SANS être connecté.

Données : `https://api.deepinfra.com/models/list` (398 entrées, 230 texte ; prix en cents par jeton : ×1e6/100 = $/M ; champs `max_tokens`, `quantization`, `deprecated`, `is_partner`, `tags`). Constats du 29/10 : DeepInfra héberge DeepSeek-V4.1-Flash-1017 (0,20/0,60 $), GLM-5.3 (0,90/4,00), GLM-5.3-Flash (0,15/0,50) ; PAS MiniMax-M3.1-Flash (seulement MiniMax-M3) ni Kimi-K3.1-Pro (seulement Kimi-K3).

Piège de conception : la garde de publication exige la clé du fournisseur dans le Coffre ; sans clé rien n'est public. Décision : mode « aperçu » (modèle visible avec prix et fiche, non appelable, badge « bientôt disponible »), levé en publiant avec la clé. Travail confié à des agents le 29/10 soir ; voir le journal du site (`docs/superpowers/plans/ledger.md`) et [[nexora-essai-sso-demo]].

**Fait le 29/10 (soir)** : 33 modèles DeepInfra (29 texte + 4 embeddings) chargés dans `app_demo`, fiches sourcées (Hugging Face / éditeurs) dans `web/src/server/gateway/catalog-deepinfra/`, sélection et exclusions dans `docs/catalogue-deepinfra-selection.md`, méthode dans `docs/catalogue-deepinfra-methode-fiches.md`. Mode **aperçu** livré (`models.availability`, migration 0026) : publics avec prix et benchmarks, non appelables (404 `model_not_available`) jusqu'à la clé `llm.deepinfra` + « Passer en service » dans Directus (module Modèles). Pages publiques refaites (liste filtrable, fiche, comparateur, classements) : `docs/modeles-publics.md`. MiniMax M3.1 Flash et Kimi K3.1 Pro retirés (absents de DeepInfra ; M3 et K3 retenus). Forfait inclus recalculé : 247 ¢ (prix DeepInfra). À valider : licence MiniMax M3 (poids « non commercial »), taux de change réel (les prix affichés portent « prix de développement » tant qu'il est factice).

