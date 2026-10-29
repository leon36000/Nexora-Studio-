# Nexora Privacy Router : conception (29/10/2026)

**Principe fondateur : la confidentialité est une propriété de Nexora, jamais une option payante.** Privacy Router est inclus par défaut dans tous les produits (passerelle de modèles, WorkStudio, WebPilot, OPSYS-AI, Nexora Apps). Un client peut acheter WebPilot seul : Privacy Router y est quand même.

## Ce qu'il fait

Il décide, pour chaque donnée qui va quitter un système Nexora, si elle peut partir, vers où, et sous quelle forme. Trois sorties surveillées :
1. **Vers un fournisseur d'IA** (la passerelle `/v1`, WorkStudio, OPSYS-AI).
2. **Vers un site web ou une API externe** (WebPilot : formulaires remplis, paramètres d'URL, cookies, pièces jointes).
3. **Vers un stockage ou un outil tiers** (connecteurs Nexora Connect).

## Politique par organisation

Une politique = un document versionné, par organisation, avec trois niveaux :
- **Standard** : refus de la collecte de données chez le fournisseur amont (`data_collection: deny`), liste des fournisseurs et pays permis, masquage des données personnelles évidentes (courriel, téléphone, carte, NAS) avant l'envoi, journal des sorties sans contenu.
- **Renforcé** : en plus, liste blanche de destinations, blocage des pièces jointes, confirmation humaine pour toute action WebPilot qui envoie des données.
- **Souverain strict** : aucun contenu confidentiel ne quitte l'environnement autorisé du client ; seuls des modèles et des fournisseurs situés dans cet environnement sont permis ; tout le reste est refusé (échec fermé).

## Où il s'accroche (déjà en place)

- **Passerelle du site** : elle voit déjà toutes les requêtes vers les fournisseurs ; les consignes de routage (`routing`) et la résidence (`residency`) par modèle y existent. Privacy Router y ajoute la politique de l'organisation avant l'appel amont.
- **WorkStudio** : le service `nexora-pii` (masquage des données personnelles) existe ; il devient l'un des filtres de Privacy Router.
- **WebPilot** : point d'accroche prévu dans le contrat d'API (politique appliquée avant toute sortie).

## Décisions de principe

- **Échec fermé** : si la politique ne peut pas être évaluée, la sortie est refusée.
- **Journal sans contenu** : on garde quoi (type de donnée détecté), vers où, décision, politique appliquée ; jamais le contenu.
- **Preuve** : chaque refus renvoie un code lisible et une explication en français ; un rapport mensuel des sorties est téléchargeable dans le panneau client.
- **Aucune option payante** pour la protection de base. Ce qui peut se vendre : déploiement souverain sur mesure, audits, règles sur mesure, support.

## Phases

1. Politique « standard » dans la passerelle (consignes de routage + masquage + journal), avec écran dans le panneau client.
2. Filtre de WebPilot (destinations, données envoyées) dès qu'il existe.
3. Niveaux renforcé et souverain strict ; rapport mensuel.

## À décider avec le fondateur

- Liste de départ des données à masquer et leur format de remplacement.
- Ce que « environnement autorisé » veut dire pour OPSYS-AI chez un client (réseau, machine, pays).
- Si le rapport mensuel doit être signé (preuve opposable).
