---
name: superpowers-workflow
description: Le fondateur veut que le plugin superpowers (obra) soit installé et utilisé pour le projet Nexora Studio
metadata:
  node_type: memory
  type: feedback
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-22T00:22:36.234Z
---

Le fondateur a demandé (2026-10-21) d'installer et d'utiliser **superpowers** pour ce projet.
Installé : `superpowers@claude-plugins-official` v7.0.0, scope projet (`.claude/settings.json` → enabledPlugins).
Le hook SessionStart injecte la compétence `using-superpowers` ; les compétences se trouvent dans
~/.claude/plugins/cache/claude-plugins-official/superpowers/<version>/skills/.

**Why:** demande explicite du fondateur ; il veut un processus de développement discipliné.
**How to apply:** avant toute création (fonctionnalité, conception produit, plan) → `brainstorming` (une question à la fois, design écrit dans docs/superpowers/specs/AAAA-MM-JJ-<sujet>-design.md, validé avant tout code) → `writing-plans` → `subagent-driven-development`/`executing-plans` avec `test-driven-development` ; bugs → `systematic-debugging` ; avant d'annoncer qu'un travail est fini → `verification-before-completion` ; tâches indépendantes → `dispatching-parallel-agents`. Lié à [[nexora-vision-produit]].
