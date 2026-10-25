"""Génère le jeu de 500 avis clients fictifs du jalon K13 (graine fixe, résultat identique à chaque exécution).

Chaque avis parle d'un seul sujet parmi quatre — livraison, produit, service après-vente, prix — et
la colonne `attendu` donne ce sujet : elle sert à mesurer l'exactitude du classement par le modèle.

Usage : python3 generer.py [sortie.csv]    (défaut : avis.csv à côté du script)
"""
import csv
import random
import sys
from pathlib import Path

GRAINE = 20261025
NOMBRE = 500

OUVERTURES = [
    "Bonjour,", "Salut,", "Bonsoir,", "Je me permets de vous écrire :", "Petit retour :",
    "Avis client :", "À l'attention de l'équipe :", "Pour information :", "", "", "",
]
CLOTURES = [
    "Merci.", "Cordialement.", "À bon entendeur.", "Je reste à votre disposition.",
    "Bonne journée !", "", "", "", "Voilà mon retour.",
]
PHRASES = {
    "livraison": [
        "Le colis est arrivé avec quatre jours de retard et le transporteur n'a pas appelé.",
        "Livraison très rapide, reçu le lendemain de la commande, emballage soigné.",
        "Le livreur a laissé le carton devant la porte sous la pluie, sans sonner.",
        "Mon colis est resté bloqué trois jours dans un entrepôt de tri, le suivi ne bougeait plus.",
        "Le point relais était fermé quand je suis passé récupérer mon paquet.",
        "Expédition rapide et suivi précis jusqu'à la porte, rien à redire sur l'acheminement.",
        "Le transporteur a déposé le colis chez un voisin que je ne connais pas.",
        "La date de livraison annoncée n'a pas été respectée, j'ai dû prendre un jour de congé pour rien.",
        "Le carton est arrivé écrasé : le transport a visiblement été très brutal.",
        "J'ai choisi la livraison express et le colis est bien arrivé en moins de vingt-quatre heures.",
        "On m'a livré à la mauvaise adresse alors que tout était correct dans ma commande.",
        "Le suivi indiquait une livraison le matin, elle a eu lieu à vingt et une heures.",
    ],
    "produit": [
        "L'aspirateur perd de la puissance après dix minutes d'utilisation, la qualité n'est pas au rendez-vous.",
        "La finition est impeccable, le matériau est solide et le produit fait exactement ce qui est annoncé.",
        "La poignée s'est cassée dès la première semaine, le plastique est très fragile.",
        "Les couleurs ne correspondent pas du tout aux photos du site, le tissu est rêche.",
        "La batterie tient à peine deux heures alors que la fiche technique en promet huit.",
        "Très bon produit, simple à monter, robuste, il fonctionne parfaitement depuis trois mois.",
        "L'écran présente un pixel mort et une teinte jaune sur le bord gauche.",
        "La notice est incompréhensible et il manquait deux vis dans le sachet de fixation.",
        "La cafetière fait un bruit anormal et l'eau ne chauffe plus à la bonne température.",
        "La taille ne correspond pas au guide : le vêtement est beaucoup trop petit.",
        "La lame est bien affûtée, l'ensemble est équilibré et agréable à tenir en main.",
        "Le produit sent fort le plastique brûlé à l'allumage.",
    ],
    "sav": [
        "J'ai appelé le service client quatre fois et personne n'a pu m'expliquer où en était mon dossier.",
        "Le conseiller a été aimable et m'a remplacé l'appareil défectueux en quelques jours.",
        "Aucune réponse à mes trois e-mails de réclamation envoyés en quinze jours.",
        "Le service après-vente m'a promis un rappel sous 48 heures, rien n'est venu.",
        "Prise en charge de la garantie très efficace : le technicien est passé dès le lendemain.",
        "On m'a renvoyé de service en service sans jamais résoudre mon problème de facturation.",
        "L'équipe du support a répondu avec patience et a trouvé une solution à ma panne.",
        "Le retour du produit défectueux a été refusé sans explication par la hotline.",
        "Le conseiller au téléphone m'a raccroché au nez pendant que j'exposais ma réclamation.",
        "Remboursement obtenu en trois jours après un échange courtois avec le support.",
        "Le chat d'assistance est resté sans réponse pendant plus d'une heure.",
        "Le réparateur agréé m'a donné un rendez-vous, puis ne s'est pas présenté.",
    ],
    "prix": [
        "Le tarif est beaucoup trop élevé pour ce que propose l'article, on trouve moins cher partout.",
        "Excellent rapport qualité-prix, je ne pensais pas payer aussi peu pour cela.",
        "Le prix a augmenté de vingt pour cent entre mon panier et la validation de la commande.",
        "Les frais cachés ajoutés à la fin font grimper la facture bien au-dessus du prix affiché.",
        "Une promotion intéressante : j'ai économisé trente euros grâce au code de réduction.",
        "L'abonnement est cher pour ce qu'il inclut, et la hausse annoncée n'est pas justifiée.",
        "Même article, quinze euros moins cher chez un concurrent le jour même : c'est dommage.",
        "Le coût de l'option supplémentaire est exorbitant par rapport au service rendu.",
        "Les soldes sont réelles : la remise de moitié m'a convaincu d'acheter.",
        "Je trouve la facturation trop chère, d'autant que le montant change chaque mois.",
        "Un prix abordable et clair, sans mauvaise surprise sur le total.",
        "Le prix de la livraison dépasse celui de l'article lui-même.",
    ],
}


def main() -> None:
    sortie = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("avis.csv")
    hasard = random.Random(GRAINE)
    classes = list(PHRASES)
    lignes = []
    for numero in range(1, NOMBRE + 1):
        classe = classes[(numero - 1) % len(classes)]
        phrase = hasard.choice(PHRASES[classe])
        texte = " ".join(
            partie for partie in (hasard.choice(OUVERTURES), phrase, hasard.choice(CLOTURES)) if partie
        )
        lignes.append((numero, texte, classe))
    hasard.shuffle(lignes)
    with sortie.open("w", newline="", encoding="utf-8") as fichier:
        ecrivain = csv.writer(fichier)
        ecrivain.writerow(["numero", "avis", "attendu"])
        ecrivain.writerows(lignes)
    print(f"{len(lignes)} avis écrits dans {sortie}")


if __name__ == "__main__":
    main()
