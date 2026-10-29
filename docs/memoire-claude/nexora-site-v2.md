---
name: nexora-site-v2
description: "Nouveau site Nexora dans ~/Desktop/NexoraSite — Mistral + Hostinger (VPS) + OpenRouter (modèles), Directus, autogéré par IA ; S1–S9 terminés le 27/10, revue finale corrigée"
metadata:
  node_type: memory
  type: project
  originSessionId: e8c957db-5c05-499a-8980-d742c3991fc0
  modified: 2026-10-27T20:03:01.876Z
---

Le 26/10/2026, le fondateur a demandé un **nouveau site complet** dans `/home/pc6/Desktop/NexoraSite` (dépôt git neuf, branche main), sans toucher l'ancien `~/Desktop/NexoraWeb`.

Exigences : Directus (admin de tout le site) ; autogestion par IA via LiteLLM (clés OpenRouter dans l'admin) ; SEO on/off-page ; style Mistral ; VPS à la Hostinger ; agents hébergés avec clés clientes ; catalogue de modèles à la OpenRouter ; bulle WorkStudio ; abonnements et paiements ; tout configurable depuis l'admin ; souveraineté (sur place ou Québec).

Socle du contenu : `~/Desktop/NexoraWeb/PROMPT_MAITRE_SITE_NEXORA_DIRECTUS.md`. Conception : `NexoraSite/docs/superpowers/specs/2026-10-26-nexora-site-design.md` ; journal de tous les jalons et rulings : `docs/superpowers/plans/ledger.md` (le relire en premier pour reprendre).

État au 27/10 : S1–S9 terminés sur main (96e8200, 1 805 tests, e2e 8/8 strict). Revue indépendante finale : 2 bloquants (règlement plafonné, flux d'outils gratuits) et 5 importants trouvés, tous corrigés en TDD. Dépôt sans remote (pas encore sur GitHub). Reste au fondateur : OIG, licence MSCL, identité légale, prix, Stripe, Proxmox, domaine, validations juridiques, publication.

27/10 : recette de A à Z fusionnée sur main (fe09eec, check vert, e2e 8/8 strict ; e2e exige `DATABASE_URL` vers `app_s9`). Démo publique : https://gx10-e526.tail0c55ff.ts.net:10000 (Funnel, service utilisateur `nexorasite-demo`, arbre `~/Desktop/NexoraSite-demo` branche `demo`, mise à jour = ff main + build avec SITE_URL + restart ; noindex ; /api/admin et /api/revalidate bloqués dans Funnel). Admin Directus tailnet seul : https://gx10-e526.tail0c55ff.ts.net:8446/admin (identifiants dans deploy/.env ; depuis pc6 le nom ts.net ne se teste pas, tester depuis `ssh pc1`). GitHub : clé de déploiement `~/.ssh/nexora_site_deploy`, remote `github-nexorasite:leon36000/NexoraSite` — le fondateur doit créer le dépôt et ajouter la clé (reporté par lui). En cours : branchement VPS en un clic + PDF ; à concevoir : codes promo, essais, code admin gratuit (Stripe vs Shop Pay à trancher).

Pièges appris : le `.env` racine se régénère par `scripts/init-dev-env.sh` (ajoute SMTP/LiteLLM) — e2e : `bun run e2e` sur `app_s9`, clé WorkStudio de dev dans le scratchpad de session ; le serveur Next de prod doit écouter sur `localhost` ou `0.0.0.0`, jamais `127.0.0.1` (boucle 308 sur les pages fr) ; lancer `next start` depuis `web/` ; Directus sans clé OIG refuse les règles de permission (filtrer `published` côté serveur) ; ne jamais accepter la licence MSCL à la place du fondateur ; `apply.ts` ne crée pas les comptes de service des agents (jetons au Coffre).

**Why:** reprendre sans perdre le cadrage. **How to apply:** relire le journal et la conception avant toute reprise ; ne jamais publier, exposer ni brancher un paiement réel sans accord. Voir [[nexora-workstudio-v1]], [[fondateur-profil]], [[feedback-equipe-agents]].

**28/10/2026 — site à garder = NexoraSite (nouveau).** Le fondateur a précisé que le vieux site Nexora (fait avec d'autres agents) est à supprimer : `~/Desktop/NexoraWeb` (branche master, 105 commits jamais poussés) et son Directus `nexora-site-directus` (port 8055) ont été supprimés sur pc6 le 28/10, sans sauvegarde, à sa demande. Le nouveau site (NexoraSite, Directus `nexorasite-directus-1` sur 8456, serveur de dev sur 3500) est déployé aussi sur `https://gx10-e526.tail0c55ff.ts.net:10000/workstudio` (machine gx10-e526, 100.73.7.49 sur le tailnet) ; son code est sur GitLab `root/nexora-web`. `~/Desktop/NexoraSite-demo` est un second clone (branche `demo`) conservé.
