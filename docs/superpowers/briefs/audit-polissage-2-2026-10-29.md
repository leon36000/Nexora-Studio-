# Deuxième audit de polissage de Nexora WorkStudio intégré au site (29/10/2026)

Branche `feat/polissage-2` (worktree `~/Bureau/Nexora-Travail/wt-polissage2`), faite sur `main` au commit `979c0f90`. Rien n'est poussé ni fusionné. Suite de `audit-polissage-2026-10-29.md` (première passe).

## Méthode et limites

- **Instance auditée** : la pile en marche sur pc1 (`https://gx10-e526.tail0c55ff.ts.net:3443`), c'est-à-dire la version de la **première passe**, avec le compte d'essai du site (`essai-sso@nexora.test`). Navigateur : Playwright 1.61.1, Chromium, `fr-CA`, lancé depuis pc1 ; axe-core (`@axe-core/playwright`, étiquettes WCAG 2.0 A/AA, 2.1 A/AA, 2.2 AA) ; sessions réutilisées par un fichier d'état (le mot de passe est passé par l'entrée standard, jamais écrit).
- **Parcouru** : 56 adresses par profil (les 16 entrées de la barre latérale, les 38 sections de Réglages, `/upgrade`, `/signup`, `/account/settings`, `/selfhost/settings`, une 404), plus l'éditeur de workflow (3 workflows), l'éditeur d'agent, une table, les détails d'intégration, le menu du profil, le menu d'aide, le sélecteur d'espace, la recherche, le parcours clavier de l'accueil.
  - **Membre ordinaire** (bureau 1 360 × 860, mobile 390 × 844 tactile, tablette 768 × 1 024) ;
  - **Propriétaire** (voir « Rôle SQL » plus bas) : toutes les pages réservées en bureau (Réglages d'instance : Consommation, Modèles, Connecteurs, Membres, Groupes d'accès, Journaux d'audit, Sécurité, Courriel, Exécution de code, État, Données personnelles, Demandes) et en mobile/tablette.
- **Mesures par page** : réponse HTTP, erreurs et avertissements de la console, réponses 4xx/5xx, débordement horizontal, cibles tactiles sous 44 px (la zone de contact en pseudo-élément du système de conception est comptée), éléments sans nom accessible, liens sortants, texte intégral (relu pour l'anglais, les calques, les fautes), violations axe critiques et sérieuses, capture d'écran.
- **Ce que cette passe ne peut pas faire** : la pile en marche n'a pas le code de cette branche (pas de compilation de l'image de production, réservée). Donc :
  - **vérifié par test seulement** = test unitaire ou de composant, typage, audits du dépôt ;
  - **simulé dans le navigateur** = le même correctif appliqué en direct sur la page en marche (attributs, variables CSS, classes injectés), puis mesuré de nouveau : cela montre l'effet, pas le code compilé ;
  - **vérifié dans le navigateur** = constaté sur l'instance en marche (ce qui était déjà corrigé par la première passe).
- **Mesures de fiabilité** : sur les 56 adresses du membre et du propriétaire, **0 erreur de console, 0 réponse 4xx/5xx** (sauf la 404 voulue) ; parcours « connexion → accueil → gabarit → assistant » sans erreur ; connexion unique complète en 10 s à froid. Les pages mettent 2,4 à 2,8 s avec l'attente du réseau calme ; l'éditeur dépasse 9 s seulement parce que sa connexion temps réel empêche le « réseau calme » (le contenu est là bien avant).

Gravité : **A** = faux, trompeur ou marque amont visible ; **B** = défaut net (dont toute violation axe critique ou sérieuse) ; **C** = finition.

## Constats

### Ce que la première passe avait corrigé « sans le voir » : maintenant vu dans le navigateur (membre)

Page de connexion (bouton Nexora AI en premier, formulaire replié), retour sur l'accueil et bienvenue en deux étapes, menu du profil (trois liens du compte du site vers `…:10000/compte`, `/compte/facturation`, `/compte/activite`), menu d'aide (un seul élément : « Contacter le support » vers la page contact du site ; lien « Aide » de l'accueil idem), sélecteur d'espace, recherche, liste des modèles de la personne (« Modèle par défaut (nexora/essai-dev) »), intégrations et compétences en français, journaux sans coût en crédits, aucune erreur de console. **Aucun défaut** dans ces points.

### Défauts trouvés dans cette passe

| # | Page | Constat | Gravité | Correction (et preuve) |
|---|---|---|---|---|
| 1 | Premier lancement (tout membre déjà créé) | L'espace s'appelle « Espace de Essai » (élision manquante, reste du défaut déjà corrigé pour les nouveaux comptes) ; seul le sélecteur d'espace permettait de le renommer | A | Bienvenue : champ « Nom de votre espace » prérempli d'après la personne (« Espace d'Essai »), bouton « Renommer » ; un nom choisi par la personne est gardé tel quel. Test unitaire (8 cas) et test de composant (5). Vérifié par test seulement |
| 2 | Assistant général (éditeur, mode avancé) | Instructions : « assistant interne d'une PME **française** » alors que tout le produit vise le Québec | A | « PME québécoise » (nouveaux espaces ; l'agent déjà créé garde son texte). Vérifié par test seulement |
| 3 | Compte d'essai : les 29 gabarits | Textes de la France (HT, TVA 20 %, EUR, « Tri des e-mails entrants », « Newsletter mensuelle ») : le compte a été semé par l'image précédente, avant l'adaptation québécoise | A (état du compte, pas du code) | **Non corrigé** : un espace déjà semé n'est jamais réécrit (décision : pas de migration). Les nouveaux comptes reçoivent les gabarits québécois. Voir propositions |
| 4 | Réglages, menu (propriétaire) | « Demandes » mène à une page vide (les demandes d'accès sont désactivées dans cette édition) | B | Section retirée du menu, adresse redirigée vers Général (`NEXORA_DISABLED_SECTIONS`). Test. Vérifié par test seulement |
| 5 | Toute l'interface en français | « e-mail » (299 occurrences) au lieu de « courriel » (norme du Québec, déjà retenue pour les gabarits) ; refus de la passerelle idem | B | « courriel » partout dans les messages français et dans `gateway-error.ts` ; test mis à jour d'abord |
| 6 | Agent (éditeur) | « Interpréteur de code : Indisponible… (Réglages › Exécution de code) » renvoie à une page que le membre ne voit pas | B | Un membre lit « contactez l'administrateur de l'instance pour activer l'exécution de code » ; l'administrateur garde le renvoi. Test de composant (3) |
| 7 | Journaux, personne du site | Colonne « Coût » vide (« — ») partout | B | La colonne devient « Jetons » (lus dans la trace de l'exécution, jointure par identifiant d'exécution) ; le détail montre « N en entrée · N en sortie » ; l'option de tri par coût disparaît. Test (3). Limite : les 100 traces les plus récentes sont jointes ; une exécution plus ancienne affiche « — ». Vérifié par test seulement |
| 8 | Journaux | Durées « 2.62s », « 747ms » (point décimal, unité collée) alors que Traces écrit « 2,6 s » | C | « 2,62 s », « 747 ms », « 1 min 5 s » (liste et détail). Test (4) |
| 9 | Chaque page | 8 requêtes de listes de modèles de fournisseurs absents (OpenRouter, Together…) à froid | C | Avec `NEXORA_ONLY_MODELS`, seule la liste de Nexora API est demandée (drapeau passé par la mise en page). Test de composant (3). Vérifié par test seulement |
| 10 | `/changelog` | « The changelog is not enabled » | C | « Les nouveautés ne sont pas disponibles sur cette instance. » |
| 11 | Agent amont (désactivé) | Carte « Usage Limit Reached », boutons « Upgrade Plan », « Increase Limit » en anglais en dur | C | Passent par le dictionnaire (6 messages ×2 langues) ; le reste de ce dossier amont n'est pas atteignable |
| 12 | Intégrations, détail d'une intégration | Compétences suggérées : 1 199 descriptions en anglais | B | Dictionnaire français (clé = nom + description anglaise), repli sur l'anglais, la compétence ajoutée garde la description française ; test de couverture sur tout le catalogue (aucune compétence sans traduction, aucune traduction orpheline). 6 traducteurs en parallèle, relecture par échantillon et par contrôles automatiques (aucun « e-mail », aucun champ vide) |
| 13 | Compétences | Les 4 compétences intégrées : instructions en anglais | B | Traduites (déployer, connecter, rechercher, créer une table) |
| 14 | Réglages (anglicismes, calques) | « blocs Function » (le bloc s'appelle « Fonction »), « bloc Start » (« Démarrage »), « Tokens » (jetons), « Connexion automatique au dépôt » (calque de « auto-connect on drop »), « Réglages › Clés API » (le menu dit « Clés d'API Nexora »), domaines d'exemple en `.fr` | C | Corrigés ; 1 760 apostrophes droites passées en ’ |
| 15 | Mobile, Réglages › Modèles | Les pastilles prennent toute la largeur : le nom du premier modèle disparaît, les autres sont tronqués (« cloud-gl… ») | B | Pastilles limitées à 8,5 rem et repliées. **Simulé dans le navigateur** (capture avant/après) |
| 16 | Mobile, accueil de l'administrateur | « Marquer comme fait » coupé sur la ligne de l'étape « Votre organisation » | B | Retour à la ligne et puce qui ne rétrécit plus. Vérifié par test seulement |

### Accessibilité (axe, WCAG 2.2 AA) : avant → après

Avant (instance en marche, 56 pages du membre) : 5 règles critiques ou sérieuses sur toutes les pages.

| # | Règle axe | Pages | Cause | Correction | Preuve |
|---|---|---|---|---|---|
| 17 | `aria-allowed-attr` (critique) | 54 | 7 ancres invisibles des menus contextuels (`<div>` sous un déclencheur Radix : `aria-expanded` interdit) | `role='button'` et `aria-hidden` sur les 16 ancres de la même famille | Simulé : plus aucune violation |
| 18 | `aria-required-attr` (critique) | 54 | Poignée de redimensionnement de la barre latérale : séparateur focalisable sans valeurs, et sans action au clavier | Retirée de l'ordre de tabulation tant qu'elle ne sert pas | Simulé : violation levée avec `tabindex` absent (pas avec `-1`) |
| 19 | `aria-required-children` (critique) | 20 | Arbre « Workflows » sans éléments d'arbre | Simple groupe étiqueté | Simulé : plus de violation |
| 20 | `label-content-name-mismatch` | 56 | Nom accessible ≠ texte visible (« Changer d'espace de travail » ; « Marquer « X » comme fait » ; 30 à 160 lignes « Ouvrir X » des intégrations et connecteurs) | Nom du sélecteur d'espace = « {nom} : changer d'espace de travail » ; « Marquer comme fait : {étape} » ; lignes de ressources nommées par leur titre et leur description (l'étiquette « Ouvrir X » est retirée à l'appel) ; thème, aimantation et effort de raisonnement nommés « étiquette : valeur » à l'appel (les composants de l'organisation le faisaient déjà ; faire le même nom dans `ChipSelect` doublait la valeur et cassait leurs tests : abandonné) | Simulé pour les lignes et les puces. **Reste** : le sélecteur d'espace (la tuile d'initiale compte dans le texte visible) et l'avatar « Changer la photo de profil » |
| 21 | `aria-input-field-name` | 27 | Trois listes déroulantes sans nom (modèle des colonnes du Playground et de l'agent, fuseau horaire, espace d'un budget) | `aria-label` | Vérifié par test seulement |
| 22 | `color-contrast` (sérieux) | 8 | Texte atténué `#737373` sur `#f3f3f3` = 4,27:1 ; texte de substitution `#8d8d8d` ; 8 pastilles de couleur de 3,3 à 4,5:1 ; commentaires du code `#16a34a` = 3,18:1 | Jetons du thème clair assombris (atténué `#686868`, substitution `#707070`, pastilles 4,8 à 6,0:1, coloration du code) ; valeurs calculées une à une | Calcul ; texte atténué **simulé** (plus de violation dans l'éditeur) |
| 23 | Clavier (WCAG 2.4.7) | tout | Le focus d'une rangée de la barre latérale n'est qu'un fond gris, identique à l'élément actif (capture avant) | Anneau intérieur sur toutes les « chips » (design system) | Vérifié par test seulement (capture « avant ») |
| 24 | `target-size` (sérieux) | 20 | Trois boutons 20 × 20 de l'en-tête « Workflows » | 24 × 24 | Vérifié par test seulement |
| 25 | Éditeur | `nested-interactive` (2 blocs du canevas), `svg-img-alt` (icône « lecture »), déclencheur de mode du canevas, bouton 14 px « Rechercher dans la barre » | C | **Restants** : code amont du canevas (voir propositions) |

Mobile et tablette (390 × 844 et 768 × 1 024) : **aucune page ne déborde horizontalement** (25 pages membre, 12 pages propriétaire) ; les actions principales ont une zone de contact de 44 px (pseudo-élément du système) ; restent des champs de 42 px, des interrupteurs 36 × 20 et des lignes de liste de 32 px (C). À 768 px la mise en page est celle du bureau (point de rupture `md`) : cibles de 30 px.

### Pages réservées à l'administrateur (propriétaire), vues pour la première fois

Consommation, Membres (23), Modèles, Connecteurs OAuth, Groupes d'accès, Journaux d'audit, Sécurité, Courriel, Exécution de code, État, Données personnelles, Collaborateurs, Clés d'API Nexora, Secrets, Outils MCP, Bacs à sable, Récemment supprimés : **textes en français, aucune erreur de console, aucune réponse d'erreur, aucun débordement**. Défauts : les n° 4, 5, 14, 15, 17 à 24. Constats **non corrigés** :

| # | Page | Constat | Gravité | Pourquoi |
|---|---|---|---|---|
| 26 | Réglages › Modèles | L'introduction dit que le modèle « Par défaut » répond aux blocs réglés sur `nexora-default` ; avec le site, c'est le modèle de la clé de la personne | B | Dépend du mode (site ou instance autonome) : à trancher par le fondateur |
| 27 | Consommation, copilote, évaluations | Fuseau par défaut `Europe/Paris` | C | Choix de produit (heure de l'Est pour le Québec) : touche les fenêtres mensuelles des budgets ; à décider |
| 28 | Étape d'un workflow, tout de suite après le chargement | La phrase « Interroger vllm/nexora-default avec… » apparaît un instant avant le chargement des modèles | C | Non reproduit une fois la page chargée ; transitoire |

## Rôle SQL du propriétaire (instructions exactes)

Base de la pile `nexora-x86-postgres-1` (`POSTGRES_USER=postgres`, `POSTGRES_DB=nexora`). L'utilisateur d'essai n'était pas membre de l'organisation d'instance (volontaire : avec la passerelle du site, seul le propriétaire `INSTANCE_ORG_OWNER_EMAIL` la rejoint) et son espace était personnel. Pour qu'il voie les pages d'instance :

- **Avant** : aucune ligne `member` pour l'utilisateur `6pWZP731vygyWKBooiJ6xRilhR39CnYI` (22 lignes au total) ; `workspace f74a85dc-6635-4c40-9e19-3d2b5ad4958a` et `project b07d1c19-ab4c-4310-b50b-c4e09898fd97` avec `organization_id = NULL`.
- **Écrit** : `INSERT INTO member(id,user_id,organization_id,role) VALUES ('polissage2-essai-sso', '6pWZ…', 'org_d01fdd73-c6a4-494e-9435-4ea2030af3a5', 'owner')` ; puis, dans une seule transaction (clé étrangère différée), `UPDATE project SET organization_id = 'org_d01f…'` et `UPDATE workspace SET organization_id = 'org_d01f…'` pour les deux lignes ci-dessus.
- **Après (remis et vérifié le 29/10 à 20 h 50)** : `BEGIN; UPDATE workspace SET organization_id = NULL WHERE id = 'f74a85dc…'; UPDATE project SET organization_id = NULL WHERE id = 'b07d1c19…'; COMMIT; DELETE FROM member WHERE id = 'polissage2-essai-sso';` Contrôle : 22 lignes `member`, aucune pour l'utilisateur d'essai, `organization_scope_key = 'personal'` pour les deux. Le journal d'audit ne contient aucun événement de cette session en dehors de la connexion (les pages d'administration n'ont été que lues).

## Décisions prises seul (modifiables par le fondateur)

- **« courriel »** partout dans l'interface française (OQLF, déjà la règle des gabarits).
- **Section « Demandes » retirée** (page vide) plutôt que garnie d'un état vide : la fonction est désactivée dans cette édition.
- **Jetons dans les journaux** : lus dans les traces (aucune route ni migration) ; la plus récente centaine d'exécutions est couverte.
- **Compétences** : seules les **descriptions** des 1 199 suggestions sont traduites ; leur **contenu** (instructions Markdown, ajouté à l'espace par « Ajouter ») reste en anglais. Les instructions des 4 compétences intégrées sont traduites.
- **Pas de migration** des gabarits ni de l'agent « Assistant général » déjà créés dans les espaces existants.
- **Noms des lignes de ressources** : l'étiquette « Ouvrir X » est retirée à l'appel (le composant partagé ne change pas, car les tests de l'organisation s'appuient sur l'étiquette).
- **Contraste** : on assombrit les jetons du thème clair (système de conception) plutôt que de corriger chaque écran.
- **Fuseau Europe/Paris** et **page Modèles** : laissés tels quels (voir 26 et 27).

## Propositions pour ce qui reste

1. Gabarits et agent de l'espace d'un membre existant : bouton « Mettre à jour les gabarits » (ou semis à la demande) pour appliquer l'adaptation québécoise sans toucher aux workflows modifiés.
2. Fuseau par défaut des rapports et du copilote : `America/Toronto` (heure de l'Est) pour une instance au Québec.
3. Réglages › Modèles en mode site : texte et liste adaptés (les modèles de discussion viennent du compte Nexora AI de chaque personne).
4. Éditeur de workflow : noms accessibles et rôles du canevas (icônes `role='img'` sans nom du paquet d'icônes amont, bloc « bouton » qui en contient d'autres, déclencheur du mode du canevas).
5. Sélecteur d'espace et avatar : séparer l'initiale (décor) du nom pour satisfaire strictement la règle « nom dans l'étiquette ».
6. Compétences : traduire aussi le contenu des 1 199 suggestions (6 lots de la même taille que les descriptions), et le publier par un fichier de traductions chargé à la demande.
7. Tablette : faire jouer les cibles de 44 px aussi à 768 px pour un pointeur tactile.

## Vérification

- **Tests** : suite complète de `apps/sim` sous Node 24 (`vitest run`, 3 605 fichiers, 40 813 tests, dont 30 nouveaux et 2 attendus mis à jour) : **40 751 passent, 56 sont ignorés, 6 échouent**, tous sans lien avec nos fichiers :
  - 3 dans `provider-catalog-contract.test.ts` : échouent à l'identique sur une copie propre de `main` (`979c0f90`) ;
  - 3 qui lancent le binaire `bun`, absent du conteneur Node (`block-registry-snapshot.test.ts`, `gateway.server.test.ts`).
  - Parties demandées : `lib/nexora` 171 fichiers, **2 139 tests, tous verts** ; `components/settings` 102 tests ; `lib/integrations` 78 tests ; `app/workspace` 1 873 tests, tous verts. Sous Bun seul, une trentaine de fichiers d'interface échouent (DOM), mais passent sous Node 24 : même constat que la première passe.
  - Une première exécution avait trouvé 2 régressions de la passe elle-même (le composant partagé des lignes de ressources et le nom de `ChipSelect`, dont les tests de l'organisation lisent l'étiquette) : corrigées en revenant sur ces deux changements (voir décisions), puis tout est repassé.
- **Biome** : propre sur tous les fichiers touchés. **Audits du dépôt** (`check-i18n.sh`, `check-brand.sh`, `check-no-ee.sh`, et `bun run check:audits` : 59 audits sur 60 passent, dont `unused-exports`, `test-patterns`, `source-conventions`, `comment-hygiene`) ; le 60e, `check:openapi`, signale `apps/docs/openapi-v2-resources.json` périmé : fichier que nous ne touchons pas.
- **Typage** (`tsc --noEmit` de `apps/sim`) : 17 erreurs, toutes dans `lib/api/mcp/server.ts` et `lib/knowledge/mcp/server.ts` (types Zod du SDK MCP), deux fichiers que cette passe n'a pas touchés ; aucune erreur dans nos fichiers.
- **Navigateur** : les constats « avant » et les simulations sont reproductibles par les scripts du dossier de travail (supprimé en fin de mission) ; ce qui doit être revu sur la prochaine compilation : voir le tableau (colonne « Preuve »). Les 5 vérifications à refaire dans le navigateur avec la nouvelle version : le champ « Nom de votre espace » à la bienvenue, la colonne « Jetons » des journaux, la disparition de « Demandes » (propriétaire), le message d'interpréteur de code (agent, membre), axe sur l'accueil (doit tomber à une ou deux violations sérieuses : sélecteur d'espace et avatar).
- **Nettoyage** : `node_modules` (3,9 Go) et fichiers ignorés du worktree supprimés, dossier d'essais supprimé, rôle SQL remis et vérifié.
