# L'interpréteur de code

L'**interpréteur de code** permet à vos agents et à l'Assistant d'écrire et d'exécuter du **Python** : calculs exacts, analyse d'un fichier Excel ou CSV, graphiques. Les bibliothèques fournies sont pandas, numpy, openpyxl et matplotlib. C'est la différence entre « le modèle estime le total des ventes » et « le total a été calculé sur votre fichier ».

Comme il s'agit de code écrit par une IA et exécuté sur votre serveur, il est **désactivé par défaut** et ne s'active que par une action explicite d'un administrateur de l'instance.

## Ce que voient les utilisateurs

- Dans l'**Assistant** : joignez un fichier et demandez, par exemple, « fais un graphique par mois et donne le total ». Le graphique s'affiche sous la réponse, avec un bouton de téléchargement ; les fichiers produits (PNG, CSV, XLSX) sont conservés avec la conversation.
- Dans un **agent** (formulaire, [Les agents](agents.md)) : interrupteur **Interpréteur de code**.
- Dans un **workflow** : le bloc **Fonction** accepte Python (voir [Les blocs](blocs.md)). Les fichiers écrits dans `/tmp/sim/outputs` sont renvoyés comme fichiers du workflow ; ceux que vous joignez sont lisibles dans `/tmp/sim/inputs`.

## Installer et autoriser (administrateurs)

1. **Installer le service.** À l'installation, répondez *oui* à « Installer l'interpréteur de code ». Sur une installation existante :

   ```bash
   nexora code on
   ```

   La commande génère un jeton, ajoute le profil Docker `code` (le service `code-sandbox`) et le démarre. `nexora code off` le retire.
2. **L'autoriser.** Ouvrez **Réglages › Exécution de code** et activez **Autoriser l'exécution de code**. Le réglage est vérifié à chaque exécution (au plus 15 secondes de décalage) : le couper arrête l'interpréteur sans redémarrage, y compris pour les agents déjà publiés. La page affiche aussi si le service répond et les limites de chaque exécution.

Tant que l'un des deux manque, aucun code ne s'exécute : l'interrupteur de l'agent est grisé, l'Assistant ne propose pas l'outil, et un bloc Fonction en Python répond « L'exécution de code est désactivée ».

## Limites de chaque exécution

Réglables dans `deploy/.env` (variables `NEXORA_CODE_*`, voir `.env.example`) ; défauts pour un serveur de 8 cœurs et 32 Go :

| Limite | Défaut |
|---|---|
| Processeur | 1 cœur |
| Mémoire | 1 024 Mo (fichiers temporaires compris) |
| Fichiers temporaires | 256 Mo |
| Processus | 64 |
| Durée d'une exécution | 120 s |
| Exécutions simultanées | 2 (au-delà : « Exécution de code saturée », à réessayer) |

Le premier lancement construit l'image `nexora/code` (environ 120 Mo) ; chaque exécution démarre ensuite en moins d'une seconde.

## Notes de sécurité

Ce que le service fait **par conception** :

- chaque exécution a lieu dans un **conteneur jetable** (détruit après usage, ou à l'expiration de sa durée de vie) : **aucun réseau**, système de fichiers **en lecture seule**, seul `/tmp` est inscriptible (plafonné, sans exécution de programme), utilisateur sans droits, **aucune capacité Linux**, `no-new-privileges`, filtre d'appels système et profil AppArmor par défaut de Docker, nombre de processus, mémoire, processeur et durée bornés ;
- seul le service `code-sandbox` accède à Docker : le **socket Docker n'est jamais visible du code**, et WorkStudio ne l'utilise pas lui-même. Le service ne publie aucun port et exige un jeton ;
- aucun secret de WorkStudio (clés, base de données, jeton) n'est dans l'environnement du code ; le code n'a accès qu'aux fichiers joints à l'exécution et aux variables que le bloc lui donne ;
- les fichiers produits sont relus **dans `/tmp` seulement** ; les chemins en dehors sont refusés.

**Limite à connaître.** Un conteneur partage le **noyau** du serveur. Ces protections réduisent fortement le risque, mais ne valent pas une machine virtuelle. Pour un niveau d'isolation supérieur, un administrateur peut installer **gVisor** (`runsc`) sur le serveur puis renseigner `NEXORA_CODE_RUNTIME=runsc` dans `deploy/.env` : Nexora l'utilise alors pour chaque exécution (ce changement système est de votre ressort : Nexora n'installe rien sur l'hôte). Ne l'activez pas sur un serveur qui héberge d'autres données sensibles sans cette mesure.

**À surveiller.** Le service a besoin de l'accès à Docker pour créer ses conteneurs : n'installez pas l'interpréteur sur un serveur où cet accès est interdit. Les exécutions sont journalisées par le service (`nexora logs code-sandbox`) sans le code ni les données ; l'activation et la désactivation figurent dans le **journal d'audit**.

Le script `scripts/verification/interpreteur-isolation.py` relit la configuration que Docker applique réellement à un conteneur de l'interpréteur (réseau, système de fichiers, capacités, limites, secrets) et la compare à cette liste ; son dernier résultat est dans `docs/verification/k5-interpreteur/isolation.json`. À lancer après chaque mise à jour de Docker ou de l'image.

Le script `scripts/verification/interpreteur-evasion.py` vérifie, lui, que les limites **tiennent en pratique** : il soumet à un vrai bac de petits programmes Python qui demandent « ai-je le droit ? » ou « jusqu'où puis-je aller ? » et vérifie que tout est refusé ou borné — aucun accès sortant ni résolution de nom, aucun fichier de l'hôte lisible ni réglage du noyau inscriptible, création de processus plafonnée, boucle infinie interrompue au délai (bac détruit), mémoire plafonnée (processus arrêté), disque plafonné par l'espace temporaire, aucun privilège (utilisateur 10001, capacités vides, pas de `setuid`, pas d'exécution depuis `/tmp`, système en lecture seule), sortie tronquée, chemins hors `/tmp` et variables dangereuses refusés, jeton exigé, saturation à 429, durée de vie plafonnée, aucun conteneur laissé derrière. Chaque programme reste dans une borne qu'il se fixe (au plus 3 fois le plafond de processus, 2 fois celui de mémoire et d'espace temporaire). Son dernier résultat est dans `docs/verification/k5-interpreteur/evasion.json`. À lancer avant d'activer l'exécution de code, puis après chaque mise à jour de Docker ou de l'image.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| « Non installé » dans Réglages | `nexora code on` n'a pas été lancé (profil `code` absent) |
| « Injoignable » | Le service ne répond pas : `nexora logs code-sandbox` |
| « Exécution de code saturée » | Deux exécutions déjà en cours : réessayez, ou augmentez `NEXORA_CODE_MAX_SANDBOXES` |
| Une exécution s'arrête sans résultat | Durée ou mémoire dépassée : réduisez le volume de données ou relevez les limites |
| Le graphique n'apparaît pas | Le modèle n'a pas enregistré son fichier dans `/tmp/sim/outputs` ; redemandez en le précisant |
