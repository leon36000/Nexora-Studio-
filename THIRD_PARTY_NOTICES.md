# Notices de tiers

Nexora intègre et modifie les logiciels open source suivants. Leurs licences et notices d'origine sont conservées dans chaque dossier.

| Composant Nexora | Dossier | Logiciel d'origine | Licence | Notices conservées |
|---|---|---|---|---|
| Nexora WorkStudio | `workstudio/` | Sim (simstudioai/sim) v0.9.31 | Apache-2.0 | `workstudio/LICENSE`, `workstudio/NOTICE`, `workstudio/UPSTREAM.md` |
| Nexora API | `services/nexora-api/` | OpenGateLLM (etalab-ia/OpenGateLLM) 0.9.1 | MIT | `services/nexora-api/LICENSE`, `services/nexora-api/UPSTREAM.md` |
| Nexora Connect | `services/nexora-connect/` | OpenConnector (oomol-lab/open-connector) | Apache-2.0 | `services/nexora-connect/LICENSE.txt`, `services/nexora-connect/NOTICE.md`, `services/nexora-connect/UPSTREAM.md` |

## Ressources ajoutées par Nexora

| Ressource | Emplacement | Origine | Licence |
|---|---|---|---|
| Police Inter (variable, sous-ensemble latin ; statique 500 et 700) | `workstudio/apps/sim/app/_styles/fonts/season/`, `workstudio/apps/sim/public/brand/fonts/` ; tracés du logo dans `workstudio/packages/emcn/src/components/sim-wordmark/paths.ts` et les images de `workstudio/apps/sim/public/` | The Inter Project Authors (rsms/inter), paquets npm `@fontsource-variable/inter` et `@fontsource/inter` 5.2.8 | SIL Open Font License 1.1 (`OFL.txt` à côté des fichiers) |

Les polices commerciales livrées par le projet d'origine (Season Sans, Söhne) ont été retirées : leur licence n'est pas l'Apache-2.0 du code.

Les dépendances de ces composants (paquets npm et PyPI) gardent leurs propres licences, déclarées dans leurs fichiers de verrouillage (`bun.lock`, `package-lock.json`, `uv.lock`).

Lecture des PDF numériques par Nexora API (v3, K4) : pdfplumber 0.11.10 et pdfminer.six (MIT), pypdfium2 5.14.0 (Apache-2.0 ou BSD-3-Clause ; il embarque PDFium, BSD-3-Clause), Pillow 12.3.0 (MIT-CMU), et leurs dépendances cryptography (Apache-2.0 ou BSD-3-Clause), cffi (MIT) et charset-normalizer (MIT). Docling (MIT) a été écarté : ses dépendances (PyTorch et des bibliothèques CUDA sous licence propriétaire NVIDIA, environ 3,4 Go de paquets) ne conviennent pas au serveur visé.

Interpréteur de code (v3, K5, image `nexora/code` construite depuis `deploy/code/`, profil « code ») : Python 3.12 (image officielle `python:3.12-slim-bookworm`, PSF License ; Debian bookworm et ses paquets sous leurs licences respectives), pandas 3.0.6 (BSD-3-Clause), numpy 2.5.4 (BSD-3-Clause), matplotlib 3.11.2 (licence Matplotlib, de type PSF), openpyxl 3.1.5 et et-xmlfile 2.0.0 (MIT), contourpy 1.4.0 (BSD-3-Clause), cycler 0.12.1 (BSD-3-Clause), fonttools 4.67.0 (MIT), kiwisolver 1.5.1 (BSD-3-Clause), packaging 26.3 (Apache-2.0 ou BSD-2-Clause), pillow 13.0.0 (MIT-CMU), pyparsing 3.3.3 (MIT), python-dateutil 2.9.0.post0 (Apache-2.0 ou BSD-3-Clause), six 1.17.0 (MIT) ; versions et empreintes dans `deploy/code/requirements.txt`. Le contrôleur `deploy/code/sandbox.py` et `runner.py` sont du code Nexora (bibliothèque standard seulement).

Les noms et marques des services tiers cités par les intégrations (Slack, Google, etc.) restent la propriété de leurs titulaires. Ils ne sont utilisés que pour identifier ces intégrations.
