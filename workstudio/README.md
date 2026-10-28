# Nexora WorkStudio

Studio d'agents et de flux de travaux en français : l'application de la suite Nexora AI. Ce dossier est un dérivé de [Sim](https://github.com/simstudioai/sim) v0.9.31 (Apache-2.0), sans le dossier propriétaire `apps/sim/ee/` (remplacé par des modules écrits en salle blanche). Provenance, licence et exclusions : [`UPSTREAM.md`](UPSTREAM.md), [`LICENSE`](LICENSE), [`NOTICE`](NOTICE). Installation et usage : [README du dépôt](../README.md) et [guide](../docs/guide/README.md).

## Contenu

| Dossier | Rôle |
|---|---|
| `apps/sim/` | Application Next.js : interface, routes d'API, éditeur de flux, exécuteur. Le code propre à Nexora est dans `apps/sim/lib/nexora/` |
| `apps/realtime/` | Serveur Socket.IO de l'édition collaborative |
| `apps/pii/` | Service de masquage des données personnelles |
| `apps/desktop/`, `apps/docs/` | Application de bureau et site de documentation hérités de Sim, non déployés par Nexora |
| `packages/` | Bibliothèques partagées (base de données et migrations, composants `emcn`, protocoles, SDK, journalisation, sécurité) |
| `docker/` | Images de l'application, du temps réel, des migrations, de la tâche planifiée et du masquage |
| `helm/`, `docker-compose.*.yml` | Chart Helm et compositions de l'amont, vérifiés par les contrôles du dépôt mais non utilisés par l'installateur Nexora (voir `../deploy/compose.yml`) |
| `patches/` | Correctifs de dépendances (voir `patches/README.md`) |
| `scripts/` | Contrôles et générateurs du dépôt (`check-*`, `generate-*`, `sync-*`) |

## Règles et contrôles

Les règles qui passent avant tout (pas de code `ee/`, interface en français par next-intl, marque, aucune télémétrie tierce) sont en tête de [`CLAUDE.md`](CLAUDE.md) (aussi `AGENTS.md`).

```bash
LANG=en_US.UTF-8 bun run check:audits    # tous les contrôles de structure, de contrats et de conventions
bun run type-check                       # types de tous les espaces de travail
```

Contrôles propres à Nexora, à la racine du dépôt : `scripts/check-no-ee.sh`, `scripts/check-brand.sh`, `scripts/check-i18n.sh`, `scripts/check-licenses.sh`.
