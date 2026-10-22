# Notices de tiers

Nexora intègre et modifie les logiciels open source suivants. Leurs licences et notices d'origine sont conservées dans chaque dossier.

| Composant Nexora | Dossier | Logiciel d'origine | Licence | Notices conservées |
|---|---|---|---|---|
| Nexora WorkStudio | `workstudio/` | Sim (simstudioai/sim) v0.9.31 | Apache-2.0 | `workstudio/LICENSE`, `workstudio/NOTICE`, `workstudio/UPSTREAM.md` |
| Nexora API | `services/nexora-api/` | OpenGateLLM (etalab-ia/OpenGateLLM) 0.9.1 | MIT | `services/nexora-api/LICENSE`, `services/nexora-api/UPSTREAM.md` |
| Nexora Connect | `services/nexora-connect/` | OpenConnector (oomol-lab/open-connector) | Apache-2.0 | `services/nexora-connect/LICENSE.txt`, `services/nexora-connect/NOTICE.md`, `services/nexora-connect/UPSTREAM.md` |

Les dépendances de ces composants (paquets npm et PyPI) gardent leurs propres licences, déclarées dans leurs fichiers de verrouillage (`bun.lock`, `package-lock.json`, `uv.lock`).

Les noms et marques des services tiers cités par les intégrations (Slack, Google, etc.) restent la propriété de leurs titulaires. Ils ne sont utilisés que pour identifier ces intégrations.
