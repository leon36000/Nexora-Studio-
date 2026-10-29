---
name: feedback-gitlab-ou-pc1
description: "Règle du fondateur (28/10) : GitLab pc4 par défaut ; si la CI devient bien plus longue, travailler en parallèle sur pc1 et ne repasser par GitLab que pour finaliser une version"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-28T08:20:13.050Z
---

Le 28/10/2026, le fondateur a fixé la règle : continuer avec GitLab (pc4) tant que ça ne change pas grand-chose au temps de travail ; si le travail devient beaucoup plus long à cause de GitLab, avancer en parallèle sur pc1 et ne compléter avec GitLab (pipelines verts) qu'au moment de finaliser une version.

**Why:** le runner `pc4-k3s-local` traite un job à la fois (pipeline WorkStudio ≈ 25 min : gitleaks ~10 min, Sonar ~11 min) et plafonne les pods (2 Go par défaut, 6 Go autorisés depuis le 28/10).

**How to apply:** lancer builds, tests et correctifs sur pc1 sans attendre la CI ; pousser sur GitLab pour garder la trace, mais ne bloquer une étape sur un pipeline que pour une version à livrer. Voir [[pc1-nexoraai]].
