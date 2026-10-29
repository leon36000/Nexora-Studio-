---
name: feedback-equipe-agents
description: "Composition d'équipe voulue par le fondateur — au plus 3 agents Haïku 5.5 et 3 agents Sonnet 5.5 (effort élevé), Claude orchestre et contrôle la qualité"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-27T01:36:38.946Z
---

Pour les gros chantiers (site NexoraSite, 26/10/2026), le fondateur veut : **au plus 3 sous-agents Haïku 5.5** (tâches mécaniques, recherche) et **3 sous-agents Sonnet 5.5 en effort élevé** (conception, code), avec moi comme **orchestrateur et responsable du contrôle qualité** (je relis, teste et vérifie leur travail avant de l'accepter).

**Why:** productivité et qualité ; il a vu des agents travailler et veut une équipe bornée, pilotée.
Précision du fondateur (26/10) : **les agents Haïku de recherche ne comptent pas** dans ce plafond ; on peut en lancer autant que la recherche l'exige.

**How to apply:** Agent avec `model: "haiku"` / `model: "sonnet"` et `effort: "high"` pour les Sonnet ; ne pas dépasser 3 de chaque en même temps ; chaque livrable d'agent est vérifié par moi (tests, lecture du diff, rendu au navigateur) avant fusion. Remplace la règle précédente « Haïku ≤ 3 par conversation ». Voir [[nexora-site-v2]].
