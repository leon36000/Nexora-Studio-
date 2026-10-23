# Consommation, empreinte et budgets

**Réglages › Consommation** (administrateurs de l'instance) montre qui consomme quoi, avec quel impact, et permet de plafonner.

## Le tableau

Choisissez la période (7, 30 ou 90 jours).

| Bloc | Contenu | Source |
|---|---|---|
| Totaux | Requêtes, jetons, exécutions, énergie (kWh), émissions (kgCO2eq) et leur équivalent en kilomètres de voiture | Nexora API (requêtes, jetons, énergie, émissions) ; WorkStudio (exécutions) |
| Courbe | Jetons ou exécutions par jour, au fuseau horaire de l'instance | Journaux de WorkStudio |
| Par modèle | Requêtes, jetons et empreinte de chaque modèle | Nexora API (chiffres exacts) |
| Par espace, par personne (20 premières) | Exécutions, jetons, empreinte **estimée** au prorata des jetons de chaque modèle | Journaux de WorkStudio |

L'équivalent voiture utilise le facteur ADEME de 0,193 kgCO2eq par kilomètre. **Exporter en CSV** produit un fichier prêt pour un tableur français (séparateur `;`, virgule décimale).

Si Nexora API ne répond pas, le tableau affiche quand même les exécutions et les jetons de WorkStudio, avec un avis.

## Les budgets

- **Plafond de l'instance** : jetons par mois civil pour toute l'instance.
- **Plafonds par espace** : choisissez un espace et son plafond mensuel.
- **Seuil d'alerte** (80 % par défaut) : un bandeau prévient les administrateurs, et un e-mail part si un service d'e-mail est configuré ([Réglages › E-mail](reglages.md)). Chaque alerte n'est envoyée qu'une fois par mois.

À 100 %, les **nouvelles** exécutions de l'espace sont refusées avec le message « Budget mensuel atteint pour cet espace : contactez votre administrateur. » (ou, quand c'est le plafond de toute l'instance qui est atteint, « Budget mensuel de l'instance atteint : contactez votre administrateur. »). Les exécutions déjà en pause (validation humaine, minuterie) reprennent normalement. Un administrateur de l'instance qui lance lui-même une exécution n'est pas bloqué ; les exécutions automatiques (planifications, webhooks, chats publiés) le sont.

Relever ou retirer un plafond prend effet à l'exécution suivante. Les compteurs repartent de zéro le premier jour du mois.

Une planification refusée par le budget n'est **pas désactivée** : elle reste active et reprend d'elle-même dès que le plafond est relevé ou au mois suivant. Les exécutions refusées gardent une ligne dans les journaux (pour voir pourquoi rien n'a tourné) mais ne sont pas comptées dans les exécutions du tableau.
