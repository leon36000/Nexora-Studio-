# Boucle Ralph — achever Nexora WorkStudio v3

Le fondateur : « ne t'arrête plus, continue jusqu'à complétion pleine et entière de Nexora WorkStudio ». Tu travailles seul, sans poser de question.

## À chaque itération
1. Lis le ledger `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` (dernières sections : revue finale, seconde passe, K15) et la spec `docs/superpowers/specs/2026-10-23-nexora-v3-design.md`. Vérifie `git log` et `git status` : le dépôt est la mémoire, pas ta conversation.
2. Avance sur ce qui reste, dans cet ordre :
   - **(a)** Les 2 échecs de la fumée avec DeepSeek par défaut (`cloud-deepseek-flash-1017`) : « Confirmation » (la carte n'affiche que `{"actionId":"postmark.send_email"}` sans le détail de l'envoi) et « Lots » (résultat `[2, 1, 3]`). Diagnostique : produit ou test ? Corrige avec TDD.
   - **(b)** Fusionne dans `main` la branche de l'agent K15 « intégration au site + PWA » (widget `/embed.js`, `NEXORA_EMBED_ORIGINS`, manifeste, guide `docs/guide/integration-site.md`, contrôle de fumée) dès qu'il a fini. Vérifie audits et suite complète, reconstruis les images, redéploie sur pc6, relance la fumée complète.
   - **(c)** Après chaque passe sur un autre modèle, remets GLM 5.3 (`cloud-glm-5-3`, id 10) par défaut avec `scripts/verification/modele-defaut.py`.
   - **(d)** La fumée complète doit être verte avec GLM 5.3 ET avec un second modèle cloud du LiteLLM de pc1. Aucun modèle local 7B n'est exigé ni livré.
   - **(e)** Mineurs différés du ledger, quand c'est petit et sûr : M2 (bail d'évaluation), M4 (redirections OTLP), M7 (lots par clé), M8 (quota de `/v1/files`), M9 (suppression complète des fichiers de lot), M11 (durcissement du contrôleur du bac de code).
   - **(f)** Ledger et mémoire à jour ; tout poussé sur GitHub (`origin main`).
3. Coche, consigne preuves et décisions (`Ruling:`) dans le ledger, commit, `git push origin main` (autorisé).
4. Continue tant que le contexte le permet.

## Outils et pièges
- Fumée complète : `scripts/verification/fumee-pc6.sh [rapport.json] [--only TEXTE]`. Changer le modèle par défaut : `scripts/verification/modele-defaut.py URL ORIGINE NOM URL_AMONT`, avec `NEXORA_VERIF_UPSTREAM_KEY` pour la clé.
- Clé LiteLLM de pc1 : fichier `~/.dsh/profiles/web/litellm.env`, variable `DSH_LITELLM_KEY`, lue sans l'afficher. Tunnel depuis les conteneurs : `http://host.docker.internal:18090/v1`. Modèles cloud : cloud-deepseek-flash-1017, cloud-glm-5-3, cloud-glm-flash, cloud-haiku-5-5, cloud-kimi-k3-1-pro, cloud-muse-contributor, etc.
- Déploiement : `git show HEAD:deploy/compose.yml > deploy/.compose-head.yml` (jamais commité), `docker compose -p nexora -f deploy/.compose-head.yml --env-file deploy/.env --profile voice --profile pii --profile code build` puis `up -d` ; `docker builder prune -af` après chaque build ; surveille le disque.
- Sous contrôle à distance, `start_session` est refusé : parallélise avec l'outil Agent (`isolation: worktree`, en arrière-plan), fusionne toi-même.
- Tests : `LANG=en_US.UTF-8 bun run --cwd workstudio/apps/sim test` ; audits `bun run --cwd workstudio check:audits`, `check:test-types`, `check:api-validation:strict`, `check:permission-group-enforcement` ; scripts racine `scripts/check-{i18n,brand,no-ee,licenses}.sh`. Des tests passent seuls mais expirent sous charge : blocks-coverage, agent-cli services, computer-tool-unload, session-sandbox.
- Messages de commit en français, terminés par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Interdits
- Jamais de code `ee/` d'origine de Sim. Textes visibles en français via next-intl.
- Jamais de `cd` dans une commande Bash (chemins absolus, `git -C`, `bun --cwd`).
- Aucun secret affiché, commité ou collé dans le chat. Ne pas lire le fichier de mot de passe sudo du Bureau.
- Ne jamais arrêter un processus ou conteneur que ce travail n'a pas lancé. Ne pas modifier les réglages système ou de sécurité.
- Ne demande au fondateur que pour une action irréversible ou visible des clients : version publiée, visibilité du dépôt, réglage système ou de sécurité, réécriture d'historique, exposition réseau publique de l'instance.

## Condition de fin
N'affiche `<promise>NEXORA WORKSTUDIO V3 COMPLETE</promise>` que lorsque c'est entièrement vrai : K1 à K15 livrés et déployés sur pc6, audits et suite complète verts, fumée complète verte avec GLM 5.3 et avec un second modèle cloud, tout poussé sur GitHub. Ne mens pas pour sortir de la boucle.
