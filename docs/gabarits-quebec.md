# Gabarits PME adaptés au Québec

Les 29 modèles du dossier « Modèles PME » de Nexora WorkStudio étaient rédigés pour la France (TVA 20 %, euro, SIRET). Ils sont maintenant rédigés pour une PME québécoise. **La structure n'a pas bougé** : mêmes identifiants (`slug`), mêmes champs d'entrée, mêmes étapes, mêmes liaisons. Seuls les textes que l'on lit changent : noms, descriptions, consignes, exemples. Le test `lib/nexora/templates.test.ts` (bloc « Gabarits adaptés au Québec ») fige cette structure.

Fichier : `workstudio/apps/sim/lib/nexora/templates.ts`.

## Ce qui change partout

| Avant | Après |
|---|---|
| « Vous écrivez pour une PME française » | « PME québécoise », français professionnel du Québec, montants en dollars canadiens (1 234,56 $), dates en toutes lettres ou AAAA-MM-JJ, vocabulaire d'affaires du Québec (consigne commune `STYLE`, donc dans chaque étape Agent) |
| HT, TVA 20 %, TTC | Avant taxes, TPS 5 %, TVQ 9,975 %, total taxes incluses |
| 1 250 EUR, 2 400 EUR HT | 1 437,19 $, 2 400,00 $ (espace insécable entre les milliers et avant « $ ») |
| SIRET | Numéros d'inscription TPS (`123456789 RT 0001`) et TVQ (`1234567890 TQ 0001`), NEQ (dix chiffres) |
| e-mail, newsletter, spam | courriel, infolettre, pourriel |
| jours ouvrés, 15/09/2026 | jours ouvrables, 2026-09-15 |
| Lyon, Grenoble, Villeurbanne, Marseille | Trois-Rivières, Sherbrooke, Laval, Longueuil, Saguenay, Québec, Montréal |
| CDI, Bac+2, 32 000 EUR brut | emploi permanent à temps plein, DEC, 52 000 $ par année |

## Noms et descriptions visibles qui ont changé (10 gabarits)

Le site et le script de fumée en dépendent. Les noms des 27 autres gabarits sont inchangés, et 19 descriptions le sont aussi.

| Identifiant | Nom avant → après | Description avant → après |
|---|---|---|
| `devis` | inchangé | « (HT, TVA 20 %, TTC) » → « (sous-total avant taxes, TPS 5 %, TVQ 9,975 %, total) » |
| `relance-facture` | inchangé | « l'e-mail de relance » → « le courriel de relance » |
| `tri-emails` | Tri des e-mails entrants → **Tri des courriels entrants** | « Classe un e-mail » → « Classe un courriel » |
| `compte-rendu` | inchangé | « … validation → e-mail » → « … validation → courriel » |
| `newsletter` | Newsletter mensuelle → **Infolettre mensuelle** | « la newsletter du mois » → « l'infolettre du mois » |
| `controle-facture` | inchangé | « vérifie les calculs et les mentions obligatoires » → « vérifie les calculs (TPS, TVQ) et les numéros d'inscription » |
| `accueil-salarie` | inchangé | « l'e-mail d'accueil » → « le courriel d'accueil » |
| `reponse-validee` | inchangé | « par e-mail » → « par courriel » |
| `factures-fournisseurs` | inchangé | « (fournisseur, numéro, montants, échéance) … totaux » → « (fournisseur, numéro, montants, taxes, échéance) … totaux, de la TPS et de la TVQ » |
| `synthese-projet-hebdo` | inchangé | « par e-mail » → « par courriel » |

## Avant / après par gabarit

| Gabarit | Avant | Après |
|---|---|---|
| `devis` | Tableau HT, TVA 20 %, TTC ; exemple « Boulangerie Martin, Lyon », 2 400 EUR HT | Tableau avant taxes, sous-total, TPS 5 %, TVQ 9,975 % calculée sur le sous-total (pas sur la TPS), arrondi au cent, net 30 jours ; en-tête avec numéros TPS, TVQ et NEQ à compléter entre crochets ; exemple « Boulangerie Gagnon, Trois-Rivières (Québec) » |
| `relance-facture` | 1 250 EUR TTC ; niveau 3 : pénalités et indemnité forfaitaire de 40 € | 1 437,19 $ taxes incluses (1 250 $ + TPS + TVQ) ; niveau 3 : frais ou intérêts de retard seulement s'ils figurent déjà sur la facture ou dans les conditions, taux jamais inventé ; note « à valider par votre conseiller » |
| `support-faq` | Retours sous 14 jours | Livraison partout au Québec, retours sous 30 jours |
| `tri-emails` | e-mail, spam, `client@exemple.fr` | courriel, pourriel, `client@exemple.ca` |
| `compte-rendu` | e-mail ; Marie, Paul, Claire | courriel ; noms québécois |
| `offre-emploi` | CDI à Lyon, 32 000 EUR brut ; aucune référence légale | Emploi permanent à Sherbrooke, 52 000 $ ; Loi sur les normes du travail et Charte des droits et libertés de la personne, avec note interne « à valider par votre conseiller avant publication » ; annonce en français |
| `fiche-produit` | 49 EUR TTC, confiture de figues | 49,00 $ avant taxes, bleuets, miel de sarrasin et tire d'érable ; prix avant ou après taxes à préciser |
| `reseaux-sociaux` | Villeurbanne ; cinq mots-clés | Longueuil ; cinq mots-clics |
| `reclamation` | remise | rabais |
| `newsletter` | newsletter, salon de Lyon | infolettre, salon de Québec |
| `relance-devis` | e-mail, 02/10/2026 | courriel, 2026-10-02, Cabinet Lévesque |
| `rapport-hebdo` | 4 200 EUR ; 2 entretiens | 4 200 $ avant taxes ; 2 entrevues |
| `traduction` | heures ouvrées | heures ouvrables ; orthographe canadienne pour l'anglais |
| `resume-contrat` | dénonciation de la reconduction | avis écrit ; juriste (avocat ou notaire) |
| `controle-facture` | Papeterie Dubois, SIRET, HT/TVA/TTC, clés JSON `total_ht`, `tva`, `total_ttc`, `siret` | Papeterie Bélanger inc., TPS/TVQ/NEQ ; clés JSON `sous_total`, `tps`, `tvq`, `total`, `numero_tps`, `numero_tvq`, `neq` ; vérifie 5 % et 9,975 % du sous-total et les formats RT 0001 / TQ 0001 ; petit fournisseur non inscrit signalé sans être déclaré fautif |
| `accueil-salarie` | « contrat, badge » ; Lyon | Carte d'accès, contrat de travail, NAS, dépôt direct, formulaires de retenues à la source TD1 et TP-1015.3-V, note « à valider par votre conseiller » ; Sherbrooke |
| `avis-client` | (texte inchangé) | consigne commune québécoise seulement |
| `ordre-du-jour` | (texte inchangé) | consigne commune québécoise seulement |
| `reponse-validee` | e-mail | courriel |
| `cr-entretien` | (texte inchangé) | « tarif dégressif » → « prix dégressif » ; consigne commune québécoise |
| `tri-sinistres` | dégât des eaux, bris de glace, 150 EUR, jours ouvrés, Villeurbanne | dégât d'eau, bris de vitre, franchise de 500 $, jours ouvrables, police d'assurance, Laval |
| `conformite-documents` | e-mail | courriel |
| `factures-fournisseurs` | total HT + TVA = total TTC ; taux 20 %, 10 %, 5,5 %, 2,1 % | sous-total + TPS + TVQ = total (au cent près) ; TPS 5 %, TVQ 9,975 % du sous-total ; clés JSON `sous_total`, `tps`, `tvq`, `total` |
| `qualification-prospects` | Grenoble, « en France », 3 000 EUR | Saguenay, « au Québec », 3 000 $ par année |
| `synthese-projet-hebdo` | 6 200 EUR sur 9 000 ; blog | 6 200 $ sur 9 000 $ ; blogue |
| `veille-concurrentielle` | Atelier Numérique Lyon, 49 EUR, Marseille | Atelier Numérique Beauce, 49 $, bureau de Québec |
| `reponse-appel-offres` | hébergement en France, 1 200 EUR/jour | hébergement au Québec, 1 200 $ par jour avant taxes ; le prix précise que la TPS et la TVQ s'ajoutent |
| `revue-contrat` | tribunal de commerce de Paris, 500 EUR, lettre recommandée, protection des données | tribunaux du district judiciaire de Montréal, 500 $, avis écrit, protection des renseignements personnels, droit applicable |
| `rapport-ventes-mensuel` | 84 300 EUR | 84 300 $ ; « les montants s'entendent avant taxes » |

## Hypothèses

- **Taxes** : TPS fédérale de 5 % et TVQ de 9,975 %, pour un client et un fournisseur situés au Québec. La TVQ se calcule sur le montant avant taxes, jamais sur la TPS (c'est la règle depuis 2013) ; chaque taxe est arrondie au cent. Les autres provinces (TVH de 13 à 15 %, TVP) ne sont pas gérées.
- **Fournisseurs non inscrits** : un petit fournisseur peut ne pas facturer de taxes. Les gabarits de facture le signalent « à vérifier » au lieu de conclure à une erreur. De même, un devis signale entre crochets une prestation exonérée ou détaxée.
- **Numéros** : TPS = 9 chiffres + `RT` + 4 chiffres ; TVQ = 10 chiffres + `TQ` + 4 chiffres ; NEQ = 10 chiffres. Les exemples sont fictifs et n'ont pas été validés auprès de Revenu Québec ou de l'Agence du revenu du Canada.
- **Montants** : dollars canadiens, `1 234,56 $` (virgule décimale, espace insécable U+00A0 entre les groupes de milliers et avant `$`). Ce même format s'applique aux pourcentages (`9,975 %`, espace insécable).
- **Dates** : `2026-10-12` (AAAA-MM-JJ, usage courant au Québec et déjà demandé aux modèles) ou « 2 novembre 2026 ». Plus de `jj/mm/aaaa`.
- **Vocabulaire** : courriel, infolettre, pourriel, jours ouvrables, entrevue, DEC, rabais, mots-clics, police d'assurance. Le mot « salarié » est gardé, car la Loi sur les normes du travail l'emploie.
- **Références légales** : seulement la Loi sur les normes du travail et la Charte des droits et libertés de la personne dans l'offre d'emploi, plus les formulaires de retenues TD1 et TP-1015.3-V dans l'accueil d'un salarié. Aucune conformité n'est garantie ; chaque référence est accompagnée de « à valider par votre conseiller » (un test l'exige). Les gabarits de contrat gardent « ne constitue pas un avis juridique ».
- **Exceptions** : la liste d'exceptions justifiées du test (`EXCEPTIONS`) est vide : aucun gabarit ne garde de terme français.

## Décisions provisoires, modifiables par le fondateur

- **Noms changés** : « Tri des courriels entrants » et « Infolettre mensuelle » (OQLF). Les identifiants `tri-emails` et `newsletter` et les noms d'étape `Newsletter`, `Email`, `Brouillon`… restent, car des références `<newsletter.content>` en dépendent. Le champ d'entrée `email` du tri garde aussi son nom.
- **Clés JSON** : `total_ht`, `tva`, `total_ttc`, `siret` deviennent `sous_total`, `tps`, `tvq`, `total`, `numero_tps`, `numero_tvq`, `neq`.
- **Pas touché** : l'extraction de documents (`lib/nexora/document-ai/fields.ts`, champs `total_tva`, `montant_tva`, HT/TTC), les plans du copilote (`copilot/*`, « Tri des e-mails urgents ») et le relevé historique `docs/verification/v3-1/fumee-pc6-avant-2026-10-27.json`. Ce sont d'autres fonctions que les gabarits ; l'extraction de documents mérite sa propre adaptation (schémas, fixtures de `scripts/fixtures/factures`, smoke).
- **Mis à jour pour suivre les noms** : `scripts/smoke.py` (noms de modèles et entrées d'exemple) et le tableau des modèles de `docs/guide/prise-en-main.md`.
- **Pas de référence légale en plus** : la Charte de la langue française, le Code civil du Québec, la Loi 25 ne sont pas citées, faute de certitude sur leur formulation exacte dans chaque contexte.

## Vérification

`npx vitest run lib/nexora` (Node 24, conteneur `node:24`) : 170 fichiers, 2 128 tests verts, dont 117 pour `templates.test.ts` (78 avant). Biome propre sur `templates.ts` et `templates.test.ts`.
