# Nexora Bot : consigne pour la nouvelle conversation (29/10/2026)

Colle dans la nouvelle conversation (dossier `~/Desktop/GrokBOT`) : « Lis `BRIEF-NEXORA-BOT.md` et exécute-le. »
Réponds au fondateur en français, brièvement. Tout le travail Nexora vit sur le GitLab privé de pc4, jamais GitHub. Carte du travail : `docs/INDEX.md` et vision : `docs/vision-nexora-ai.md` du dépôt `root/nexora-workstudio` (clone sur pc1 : `ssh pc1 'cat ~/Bureau/Nexora-Travail/nexora-workstudio/docs/INDEX.md'`).

## Tâche
Amener Nexora Bot à une version PROPRE, publiable, installable et téléchargeable depuis le site (page Nexora Apps).

## État de départ (à vérifier, sans rien supposer)
`~/Desktop/GrokBOT` contient `quanta/` (le chantier « Nexora Bot » : `README.md`, `PLAN.md`, `core/*.cjs` = backend local, `app/dist`) et des dossiers de DÉCOMPILATION d'un logiciel tiers : `decompiled/`, `asar_extracted/`, `extracted/`, `analyse/`, `RAPPORT_DECOMPILATION.md`, `grok-bot_0.71.2_amd64.deb`. Le rapport établit que « Grok Bot » (éditeur SpaceXAI) est une application Electron bâtie sur le code PROPRIÉTAIRE de Cursor (Anysphere). Le README de `quanta/` dit que Nexora Bot CONSERVE ce client d'origine (interface, méthodes IPC) et remplace seulement le backend de Cursor par un backend local (`core/server.cjs`, Connect/protobuf).

## Ligne rouge (non négociable)
Ce code propriétaire ne peut être ni publié, ni mis en téléchargement sur le site, ni mis en open source, ni renommé pour être redistribué. Ne copie RIEN de `decompiled/`, `asar_extracted/`, `extracted/`, `quanta/app/dist` (interface de Cursor) ni du `.deb` dans un livrable ou un dépôt Nexora ; ne lis pas `decompiled/` pour en recopier du code. Dis-le franchement au fondateur dans ton premier rapport. Pour que Nexora Bot soit open source et distribué, la seule voie est une interface et un noyau libres de droits.

## Mission
1. **Audit court** (une page, dans un fichier du dépôt) : dans `quanta/core/*.cjs`, ce qui est original (fournisseurs OpenAI-compatibles, outils, MCP, connecteurs OAuth, boucle d'agent, routines, tâches) et ce qui n'existe que pour parler au client propriétaire (protocole, `seed-auth`…).
2. **Base d'interface libre** : compare 2 ou 3 candidats réels (application de bureau ou interface web empaquetable en Electron ou Tauri), en VÉRIFIANT la licence (MIT ou Apache-2.0 attendus), l'activité et la taille ; justifie en 10 lignes ; réutilise notre noyau quand il est original.
3. **Fonctions voulues par le fondateur**
   - Connexion avec le MÊME compte Nexora AI que le site (SSO) : flux « appareil » ou OAuth avec PKCE. Routes à créer côté site (`~/Desktop/NexoraSite`, Next.js 16, Better Auth, organisations, portefeuille, clés `nxk_`) : spécification courte d'abord, puis TDD.
   - Branché d'office sur le modèle `nexora/deepseek-v4.1-flash-1017` de la passerelle du site (`/v1`, compatible OpenAI ; démo publique `https://gx10-e526.tail0c55ff.ts.net:10000/v1`). Il ne marche qu'avec un abonnement ou un portefeuille crédité (402 quand le solde est vide : message clair et lien « Ajouter des fonds »). Le CHOIX d'un autre modèle reste une option de l'utilisateur (`/v1/models`). Les clés des fournisseurs ne sont pas encore dans le coffre du site : teste avec un faux fournisseur, comme `web/src/server/gateway/proxy.test.ts`.
   - Accès, avec consentement, aux données du profil du client : bases de connaissances (RAG), workflows et agents de WorkStudio, Nexora Connect ; conçois la portée des jetons (lecture seule par défaut).
   - Plugins compatibles avec ceux de Codex et de Claude Code : MCP, skills (`SKILL.md` + frontmatter), commandes, hooks ; vise l'import direct d'un plugin existant ; vérifie les formats réels dans la documentation officielle.
   - Agent de bureau autonome « comme Grok Bot et Muse » : chat, outils locaux avec confirmations, historique. Ces produits ne sont qu'une inspiration fonctionnelle.
4. **Livrables** : dépôt GitLab dédié (essaie de créer le projet privé `nexora-bot` avec le jeton de `~/.config/nexora/gitlab-pc4.token`, sinon un dossier de `root/nexora-workstudio`) ; paquets amd64 (`.deb`, AppImage) compilés sur pc1 si c'est lourd (`ssh pc1`, Docker, `~/Bureau/Nexora-Travail/` ; pc6 n'a que ~30 Go) ; fichiers dans le registre de paquets GitLab avec empreintes SHA-256 ; la fiche `/apps/bot` du site (`web/src/i18n/apps.ts` et `dictionaries/apps-*.ts`) ne passe de « Bientôt » à « Disponible » QUE si le paquet existe, est installé et testé.
5. **Licence** : le fondateur n'a pas tranché. Recommandation : code libre (GPL ou Apache-2.0) + services payants (« libre » et « redevance pour usage commercial » sont incompatibles). NE publie PAS le code hors du GitLab privé et ne fixe pas la licence finale sans son accord.

## Règles
TDD ; commits en français avec la dernière ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` ; pousse seulement vers GitLab ; aucun secret dans Git ni à l'écran ; ne touche pas aux autres chantiers (`nexora-code`, corpus…) ; vérifie avant de dire « fini » et dis ce que tu n'as pas pu vérifier ; rapports COURTS.
