---
name: github-workflow
description: "REMPLACÉ le 28/10/2026 : plus rien n'est envoyé à GitHub, on travaille exclusivement sur le GitLab privé de pc4 (root/nexora-workstudio et root/nexora-web)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-28T23:30:00.000Z
---

Règle actuelle (fondateur, 28/10/2026) : **plus aucun envoi vers GitHub** ; le travail vit exclusivement sur le GitLab privé de pc4 (`https://pc4.tail0c55ff.ts.net`). Nexora Studio / WorkStudio = `root/nexora-workstudio` (projet 5), nouveau site NexoraSite = `root/nexora-web` (projet 6, « nexora web »), les deux privés, branche `main`. Les dépôts `origin` (GitHub) restent configurés mais on n'y pousse plus.

Historique : le 23/10/2026 le fondateur avait demandé de travailler via GitHub (`leon36000/Nexora-Studio-`) ; cette règle est abandonnée.

**Why:** le code est privé ; le GitLab auto-hébergé est la référence (la CI de sécurité de pc4 y tourne).
**How to apply:** pousser après vérification vers `gitlab` seulement, sans redemander ; le miroir `pc1` (dépôts nus dans ~/Bureau/NexoraAI/depots) n'est plus alimenté d'office tant que le fondateur ne le redemande pas. Demander seulement pour l'irréversible ou ce qui est visible des clients (`--force`, tags, visibilité). Jamais de secret dans Git. Voir [[nexora-workstudio-v1]] et [[feedback-gitlab-ou-pc1]].
