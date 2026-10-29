# Audit de polissage de Nexora WorkStudio intégré au site (29/10/2026)

Branche `feat/polissage` (worktree `~/Bureau/Nexora-Travail/wt-polissage`), faite sur `main` au commit `4c7b4e4f`. Rien n'est poussé ni fusionné.

## Méthode et limites

- **Instance auditée** : la version en marche *avant* les correctifs (`https://gx10-e526.tail0c55ff.ts.net:3443`), avec le compte d'essai du site (`essai-sso@nexora.test`), par un vrai navigateur (Playwright, Chromium, `fr-CA`) lancé depuis pc1. Connexion unique complète (bouton Nexora AI, formulaire du site, retour sur l'accueil) : 9 s en tout à froid.
- **Parcouru** : les 16 entrées de la barre latérale, 38 adresses de Réglages (une quinzaine s'affichent à une personne ordinaire, les autres renvoient à Général ou répondent « Page introuvable »), les pages hors espace (`/signup`, `/upgrade`, `/account/settings`, `/selfhost/settings`, 404), le menu du profil, le sélecteur d'espace, le menu d'aide, la recherche, 3 gabarits PME ouverts (le « Devis client » lancé pour de bon : réponse du modèle en 2,3 s), l'Assistant et le Playground (réponse réelle du modèle d'essai), et 12 créations (agent, table, base, lot, campagne, prompt, clé d'API, workflow, invitation…). Pour chaque page : réponse HTTP, erreurs de la console, réponses 4xx/5xx, liens sortants, texte en français, éléments sans nom accessible, nombre et durée des requêtes.
- **Non fait** : l'audit d'un **propriétaire** (aucun compte propriétaire obtenable sans écrire dans la base de la pile en marche) ; les pages réservées à l'administrateur de l'instance ont été relues dans le code, pas dans le navigateur. Aucun build de production (réservé) : les correctifs sont vérifiés par tests, typage et audits du dépôt, **pas encore dans le navigateur**.
- **Mesures** : toutes les pages sont prêtes en moins de 0,9 s (DOM en 60 à 340 ms, réseau calme en 1,2 à 1,7 s), l'éditeur de workflow en 0,85 s. Aucune page ne dépasse 2 s. Les réponses de l'API répondent en moins de 50 ms.

Gravité : **A** = faux, trompeur ou marque amont visible ; **B** = défaut net mais contournable ; **C** = finition.

## Constats

| # | Page | Constat | Gravité | Correction |
|---|---|---|---|---|
| 1 | Connexion | Le formulaire courriel/mot de passe est en premier plan ; « Se connecter avec Nexora AI » vient après un séparateur « Ou continuer avec » | A | Corrigé : le bouton est l'action principale ; le formulaire est replié sous « Propriétaire ou administrateur de l'instance ? Connexion par mot de passe » (rouvert d'office avec `?mode=password` ou après une réinitialisation) |
| 2 | Connexion, `/signup` | « Créer un compte » menait à l'inscription locale | A | Corrigé : mène à `…/compte/inscription` du site (adresse tirée de `NEXORA_OIDC_ISSUER` sans `/api/auth`, version anglaise sous `/en`) ; `/signup` redirige vers le site |
| 3 | Tout l'espace | L'espace créé s'appelle « Espace de Essai » (élision manquante, et le prénom pouvait être une adresse) | A | Corrigé : « Espace d'Essai », « Espace de Camille », « Mon espace » si le nom n'est pas un prénom. L'espace déjà créé du compte d'essai garde son nom (à renommer à la main) |
| 4 | Accueil, Playground, Agents, Prompts, Connecteurs, Évaluations, Lots, Tables, Fichiers, Bases, Réglages (Modèles, Connecteurs, Bacs à sable) | Les boutons « Aide » et « Documentation » ouvrent le dépôt GitHub `leon36000/Nexora-Studio-` | A | Corrigé : `docsUrl()` ne pointe plus jamais vers un dépôt ni vers l'amont ; il joint `NEXT_PUBLIC_DOCUMENTATION_URL` si elle est réglée, sinon mène à la page contact du site, sinon reste sur l'instance |
| 5 | Menu d'aide | « Signaler un problème » (tracker GitHub), « Documentation » (GitHub), « Contacter le support » (formulaire qui envoie un courriel : l'instance n'a pas de SMTP) | A | Corrigé : plus de « Signaler un problème » ; « Contacter le support » ouvre la page contact du site ; « Documentation » n'apparaît que si un site de documentation est réglé |
| 6 | `/upgrade`, `/workspace/…/upgrade`, « limite atteinte » | Redirige vers `https://github.com/leon36000/Nexora-Studio-/upgrade` : page 404 de GitHub | A | Corrigé : mène au portefeuille du site (`/compte/facturation`), sinon à l'instance |
| 7 | Adresses `/discord`, `/slack`, `/x`, `/linkedin`, `/github`, `/team` | Redirigent vers les comptes sociaux et l'agenda commercial de Sim, et vers GitHub | A | Corrigé : supprimées (test : aucune redirection ne sort vers ces sites) |
| 8 | Réglages › Bacs à sable ; Boîte de réception | « nécessitent un abonnement Max actif… » et bouton « Passer à Max » : offre qui n'existe pas | A | Corrigé : « Non disponible sur cette instance », sans bouton |
| 9 | Réglages › Général | « Réinitialiser le mot de passe » et « Supprimer le compte » : mot de passe et compte locaux alors que le compte vient du site | A | Corrigé : pour une personne venue du site, ces deux actions disparaissent et trois lignes mènent à « Compte Nexora AI », « Portefeuille et facturation », « Consommation de mes jetons » |
| 10 | Menu du profil | Aucun lien vers le compte du site | B | Corrigé : les trois mêmes liens (nouvel onglet), adresses dérivées de l'émetteur, version anglaise sous `/en` |
| 11 | Accueil › État de la plateforme | « Modèle par défaut : cloud-glm-5-3 » : le modèle de l'instance, pas celui de la clé de la personne | A | Corrigé : le modèle de la clé de la personne ; « Indisponible » (jamais celui de l'instance) quand sa connexion au site a pris fin |
| 12 | Journaux, détail d'une exécution | « 1 crédit » pour une exécution en échec de 37 ms : une unité (crédits de Sim, 1 000 = 5 $) qui n'est pas le portefeuille du site | A | Corrigé : plus de coût en crédits pour une personne facturée par le site (la consommation est sur le site) |
| 13 | Réglages (menu de gauche) | « Exécution de code » et « Données personnelles » s'affichent à une personne sans organisation d'instance, et leur page reste vide | A | Corrigé : réservées à l'administrateur de l'instance (menu et adresse directe) |
| 14 | Intégrations (liste et détail) | 274 descriptions en anglais, alors que les traductions existaient déjà dans `blocks.json` | A | Corrigé : la liste, la recherche et le détail lisent la description française |
| 15 | Compétences (Intégrations › Compétences) | 4 descriptions en anglais | B | Corrigé (descriptions). Reste : le texte des instructions des compétences, et les « compétences » proposées sur la page de chaque intégration (« daily-standup-summary »…), en anglais (voir propositions) |
| 16 | Erreurs de modèle (Assistant, Agents, Playground, « Générer avec l'IA ») | Solde épuisé, clé révoquée, plafond, limite de débit, modèle absent, passerelle en panne : « Nexora API indisponible » ou texte brut de la passerelle | B | Corrigé : messages en français, avec le lien du portefeuille du site ; une clé que la passerelle refuse est oubliée et redemandée au site, sinon « reconnectez-vous » |
| 17 | Connexion refusée par le site | « Nexora AI refuse l'accès » pour tout, quelle que soit la cause | B | Corrigé : abonnement WorkStudio requis (`subscription_required`, avec le lien du portefeuille), double authentification exigée, courriel non vérifié, connexion expirée, site hors service : un message chacun ; les autres 403 (`insufficient_scope`…) restent « le site refuse l'accès » |
| 18 | Console de chaque page | `403 /api/nexora/traces/settings` (Traces) et `403 /api/nexora/api-keys/instance` (Clés d'API) à chaque visite d'un membre | C | Corrigé : ces requêtes de l'administrateur ne partent plus pour les autres |
| 19 | Accueil | 24 requêtes de préchargement de pages (une par gabarit, deux fois) | C | Corrigé : plus de préchargement des cartes de gabarits ni des workflows de la barre latérale |
| 20 | Sélecteur de modèle (Agents, lots, évaluations) | « Modèle par défaut (nexora-default) » : l'alias technique est montré | C | Corrigé : « Modèle par défaut (nom du modèle de la personne) » |
| 21 | Invitation de collègues | Le texte du champ « Saisissez des adresses e-ma… » est coupé | C | Corrigé (largeur du champ d'étiquettes) |
| 22 | `/workspace/…/dashboards` | « Dashboards are not enabled » en anglais | C | Corrigé |
| 23 | Développeurs | Le champ « Adresse de base » n'a pas de nom accessible | C | Corrigé |
| 24 | Premier lancement | Aucun parcours pour une personne qui n'est pas l'administrateur de l'instance (le panneau en 5 étapes est réservé à l'administrateur) | B | Corrigé : bandeau « Bienvenue » en deux étapes (choisir un gabarit parmi 4, le lancer avec son exemple, lire le résultat) ; fermé pour de bon par « Plus tard » ou « Terminer » (mémoire du navigateur, par personne) |
| 25 | Chaque page | Une dizaine de requêtes de listes de modèles de fournisseurs absents de l'instance (OpenRouter, Together, Baseten, Fireworks, LiteLLM, Ollama…) au premier chargement ; 7 à 9 ms chacune | C | Reste (voir propositions) |
| 26 | Éditeur d'agent | « Interpréteur de code : Indisponible… (Réglages › Exécution de code) » renvoie vers une page que le membre ne voit pas | C | Reste (voir propositions) |
| 27 | Navigation au clavier | Le focus d'un lien de la barre latérale n'a ni contour ni ombre (changement de fond seulement) | C | Reste : à vérifier au contraste avec un lecteur d'écran ; pas de correction aveugle |
| 28 | Éditeur, mode avancé | Le résumé d'une étape agent affiche « Interroger vllm/nexora-default avec… » sur 2 gabarits (texte technique), « Modèle par défaut » sur d'autres | C | Reste : non reproduit hors du texte de la page ; à regarder dans un navigateur avec la nouvelle version |
| 29 | Réglages › Outils MCP | La connexion en direct (`/api/mcp/events`) empêche d'atteindre le « réseau calme » : normal, pas un défaut | — | Rien |
| 30 | Messages « Usage Limit Reached », « Upgrade Plan » (étiquette de l'agent amont) | Anglais en dur dans le code de l'agent Sim, jamais montré tant que cet agent est désactivé | C | Reste (voir propositions) |

Pages sans défaut relevé : Assistant (réponse réelle du modèle), Playground (1,6 s, 13 jetons en entrée), Prompts, Évaluations, Traitements par lot, Tables (création d'une table), Fichiers, Bases de connaissances (création), Collaborateurs (invitation), Secrets, Outils personnalisés, Serveurs MCP, Récemment supprimés, Journaux, Traces, Connecteurs (liste), les 29 gabarits PME (présents dans « Modèles PME », « Devis client » et « Relance de facture impayée » ouverts, lancés avec succès pour le premier).

## Propositions pour ce qui est hors de portée

1. **Documentation** : le guide (`docs/guide`) n'est publié nulle part ; l'instance renvoie donc au contact du site. Proposition : le publier sur le site (`/docs/workstudio`) et régler `NEXORA_DOCUMENTATION_URL` ; `docsUrl()` joindra alors les chemins amont, qu'il faudra faire correspondre (l'ancienne table de correspondance vers les pages du guide a été retirée avec GitHub).
2. **Compétences en anglais** : traduire le texte des 4 compétences intégrées et les « compétences » de chaque intégration (`POPULAR_WORKFLOWS`), environ 270 courtes entrées. Gros chantier de traduction, sans effet sur le fonctionnement.
3. **Listes de modèles inutiles** : exposer `NEXORA_ONLY_MODELS` au navigateur et ne charger que `vllm` (économie de 8 requêtes à froid).
4. **Interpréteur de code indisponible** : dire « contactez l'administrateur de l'instance » quand la personne n'a pas la page de réglages.
5. **Agent amont (Mothership) et textes en dur** : revoir ou retirer les étiquettes anglaises tant que cet agent reste désactivé.
6. **Journaux** : afficher, pour une personne du site, les jetons consommés par exécution (déjà mesurés) à la place du coût.
7. **Owner** : refaire cet audit avec un compte propriétaire sur une base de test dédiée (pas la pile en marche).
8. **Renommage de l'espace existant** : proposer un champ de renommage au premier lancement (aujourd'hui dans le sélecteur d'espace).

## Décisions prises seul (modifiables par le fondateur)

- Quand aucune documentation n'est configurée, l'aide mène à la **page contact du site** et non à une page vide ou au dépôt.
- Pour une personne venue du site, **aucun coût en crédits** n'est montré dans les journaux (le portefeuille du site fait foi).
- Le bandeau de bienvenue se rappelle de sa fermeture **dans le navigateur** (pas en base) : aucune migration.
- `/signup` redirige vers le site dès que la connexion Nexora AI est configurée et que l'émetteur se termine par `/api/auth`.
- Le **menu d'aide perd « Signaler un problème »** (il n'y a pas de tracker public).
