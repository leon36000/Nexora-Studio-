# Provenance — Nexora WorkStudio

| Champ | Valeur |
|---|---|
| Projet d'origine | Sim — https://github.com/simstudioai/sim |
| Version | v0.9.31 |
| Commit | `ec64b0027865a3791e3606eb4c643c2a6e426e25` (21/10/2026) |
| Licence | Apache-2.0 (voir `LICENSE` et `NOTICE`) |
| Import | 22/10/2026, par `git archive`, sans l'historique amont |

## Exclusion de `apps/sim/ee/`

Le dossier `apps/sim/ee/` d'origine est sous une licence propriétaire distincte. **Il n'a pas été importé.** Le dossier `apps/sim/ee/` présent ici contient uniquement des modules Nexora écrits en salle blanche, à partir des seuls appels du cœur Apache-2.0. Chaque fichier porte l'en-tête `Nexora clean-room replacement`. Le contrôle `scripts/check-no-ee.sh` le vérifie.

## Fichiers modifiés

L'état importé correspond au premier commit de ce dépôt. Toutes les modifications Nexora sont visibles dans l'historique Git postérieur (`git log -- workstudio/`). Conformément à la section 4(b) de la licence Apache-2.0, les fichiers modifiés sont signalés par cet historique et par ce document.
