# K7 — Parcours « relance des factures impayées » en mode Étapes

Parcours fait le 25/10/2026 au navigateur, sur `next dev` (hôte `k7.localhost:3221`) contre la pile de pc6 (base, Redis, Nexora API par adresse de conteneur), modèle par défaut GLM 5.3, compte de test jetable. Il remplace le test chronométré avec trois personnes de l'analyse d'écart (amendement §4 de la spec) ; **ce n'est pas une mesure d'un débutant** : l'horloge est celle d'un pilote automatique, latences d'outils comprises.

## Durée

- **462 s** (7 min 42 s) entre l'ouverture du workflow vide « Relance des factures impayées » et le premier test réussi, pour : passer en vue Étapes, ajouter trois étapes (« Demander à l'IA », « Demander une validation », « Envoyer un e-mail »), écrire la consigne de l'agent, remplir l'e-mail, comprendre et corriger un refus de lancement, tester jusqu'à l'étape 1.
- Tout s'est fait **dans la vue Étapes** : le canevas n'a été ouvert qu'ensuite, pour montrer le même workflow.
- Test de l'étape 1 (GLM 5.3) : 2,4 s.

## Captures

| Fichier | Ce qu'elle montre |
|---|---|
| `00-modele-pme-ouvert-en-etapes.jpg` | Un modèle PME s'ouvre directement en vue Étapes (données d'exemple, cartes, résumés) |
| `01-choisir-une-etape.jpg` | Le catalogue d'étapes, par thème, avec recherche |
| `02-trois-etapes-ajoutees.jpg` | Les trois étapes ajoutées, le formulaire de l'e-mail dans le panneau |
| `03-menu-d-une-etape.jpg` | Menu d'une carte : régler, tester jusqu'ici, monter, descendre, supprimer |
| `04-erreur-expliquee-en-clair.jpg` | Lancement refusé : « L'étape « SMTP » n'est pas complète : il manque… » |
| `05-test-jusqu-a-l-etape-1.jpg` | « Tester jusqu'ici » : étape 1 réussie, étapes suivantes non lancées |
| `06-resultat-de-l-etape-1.jpg` | Le résultat de l'étape 1 lisible dans la carte |
| `07-meme-workflow-dans-le-canevas.jpg` | Le même workflow dans le canevas (« Mode avancé ») |
| `08-barre-d-outils-triee.jpg` | Barre d'outils : Essentiels d'abord, déclencheurs repliés |
| `09-etape-deplacee.jpg` | Une étape descendue ; son résultat de test reste sur sa carte |
| `10-etape-ajoutee-dans-une-branche.jpg` | Une étape ajoutée dans le chemin « Si oui » d'une condition |

## Relu par l'API après les modifications

Workflow : `Start → Agent → Wait for Input → SMTP` (positions 0, 420, 840, 1260). Après l'ajout d'une condition entre l'attente et l'e-mail puis d'une réponse dans son chemin « Si oui » : `Condition [if] → Réponse → SMTP` et `Condition [else] → SMTP`, positions de la disposition du Copilote (la réponse une rangée au-dessus, l'e-mail deux colonnes plus loin).

## Les cinq workflows types

`scripts/verification/copilote-cinq.py` (avec `COPILOTE_CINQ_DUMP=<dossier>`) a produit **5/5** workflows sur ce serveur (46 s, 24 s, 6 s, 8 s, 5 s, exécutés une fois chacun) ; leurs états sont rejoués par `workstudio/apps/sim/lib/nexora/steps/real-five.test.ts`.
