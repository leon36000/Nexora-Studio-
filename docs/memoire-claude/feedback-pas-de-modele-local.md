---
name: feedback-pas-de-modele-local
description: Le fondateur n'a jamais demandé de modèle local 7B ; tester avec les modèles cloud du LiteLLM de pc1
metadata:
  type: feedback
---

Ne jamais exiger, tester ni livrer de modèle local (qwen 7B/3B/0.5B) comme critère : le fondateur a corrigé le 25/10/2026 (« je ne t'ai jamais demandé de prendre un modèle 7b local, je t'ai même demandé de le supprimer »). Les vérifications se font avec les modèles cloud du LiteLLM de pc1 (GLM 5.3 par défaut, un second au choix, pas besoin de tous les tester).

**Why:** la spec v3 avait, de ma propre initiative, une « double vérification » avec `qwen2.5:7b` ; c'était une décision que je n'avais pas à prendre seul.
**How to apply:** pas de passe CPU locale dans les critères de fin ; ne pas inventer d'exigence que le fondateur n'a pas formulée. Voir [[nexora-workstudio-v1]].
