# Le Playground

Le **Playground** sert à essayer et comparer les modèles avant de les utiliser.

1. Choisissez jusqu'à **trois modèles** (une colonne chacun).
2. Écrivez des **consignes** (facultatif) et votre **message**.
3. Réglez la **température** (créativité : basse pour des réponses régulières, haute pour varier), la **longueur maximale** et, pour un modèle à raisonnement, l'**effort de raisonnement** (*Par défaut*, *Faible*, *Moyen*, *Élevé*).
4. **Envoyer** : les réponses arrivent en direct, avec leur temps et le nombre de jetons. **Arrêter** interrompt.

Un **modèle à raisonnement** (GLM 5.3, Qwen 3…) montre d'abord sa **Réflexion**, en direct dans un volet à part, puis sa réponse ; le volet se replie dès que la réponse commence (cliquez pour le rouvrir). Comparer un tel modèle à un modèle classique comme `qwen2.5:7b` montre l'écart de temps et de jetons. Si le modèle n'accepte pas l'effort choisi, la colonne l'indique et la réponse utilise son réglage par défaut. Voir [Les modèles à raisonnement](modeles.md#les-modèles-à-raisonnement).

Quand une combinaison vous convient, **Enregistrer comme agent** crée un agent avec ces consignes et le premier modèle : voir [Les agents](agents.md).

Rien n'est conservé : le Playground ne garde pas d'historique. La consommation est comptée comme le reste (Réglages › Consommation).
