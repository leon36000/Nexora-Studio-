# Audit de polissage dans le navigateur (deuxième passe)

Scripts Playwright (Node) qui ont servi à `docs/superpowers/briefs/audit-polissage-2-2026-10-29.md`. Même mise en place que `../essais-sso/` (dossier de travail avec `npm i playwright@1.61.1 @axe-core/playwright`, conteneur `mcr.microsoft.com/playwright:v1.61.1-noble --network host`, mot de passe passé par une variable, jamais écrit).

| Script | Ce qu'il fait |
|---|---|
| `login.mjs` | connexion unique complète, écrit l'état de session (`/essais/state.json`) réutilisé par les autres |
| `crawl.mjs` | visite une liste d'adresses (`PAGES`, JSON) en bureau, mobile ou tablette (`VP`) : statut, erreurs de console, réponses 4xx/5xx, débordement horizontal, cibles tactiles sous 44 px (zone en pseudo-élément comptée), éléments sans nom, texte intégral, violations axe (`AXE=1`), capture |
| `kbd.mjs` | Tab 45 fois sur une page, relève l'élément focalisé et si le focus se voit |
| `axe-sim.mjs` | applique en direct des correctifs (attributs, variables CSS) sur la page en marche puis relance axe : simule l'effet avant compilation |

Variables : `WS` (adresse de WorkStudio), `WSID` (espace), `EMAIL` et `PW` (connexion), `VP`, `TAG`, `PAGES`, `AXE`.
