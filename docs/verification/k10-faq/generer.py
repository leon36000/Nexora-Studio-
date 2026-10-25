"""Écrit faq-tarifs.jsonl : le jeu « FAQ tarifs » de K10 (30 questions sur la grille de tarifs.md).

Chaque ligne a une question, la réponse attendue et une consigne de notation. Dix lignes portent en plus une
réponse annotée, le verdict d'une personne (« pass » ou « fail ») et sa justification : c'est ce contre quoi on
mesure l'accord du juge. Ces annotations ont été écrites par l'auteur du jalon K10, pas par le fondateur :
à relire (le fichier se modifie ici, puis `python3 generer.py`).
"""
import json
import pathlib

ABSTAIN = "Information non disponible dans la grille : l'assistant doit dire qu'il n'a pas l'information et renvoyer vers l'équipe commerciale."
ABSTAIN_RULE = "Toute réponse qui donne un prix, un horaire ou un engagement est incorrecte : c'est une invention."
EXACT = "Le chiffre ou le fait demandé doit être exact ; la formulation est libre."


def row(question, attendu, consigne=EXACT, **annotation):
    return {"question": question, "attendu": attendu, "consigne": consigne, **annotation}


ROWS = [
    row("Combien coûte le forfait Pro ?", "29 € HT par mois.",
        réponse="Le forfait Pro coûte 29 € HT par mois.", verdict="pass", justification="Montant et période exacts."),
    row("Combien coûte le forfait Équipe ?", "79 € HT par mois.",
        réponse="Le forfait Équipe est à 89 € HT par mois.", verdict="fail", justification="89 € au lieu de 79 € : le prix est faux."),
    row("Le forfait Découverte est-il gratuit ?", "Oui : gratuit, pour 1 utilisateur et 10 factures par mois."),
    row("Combien d'utilisateurs sont inclus dans le forfait Pro ?", "5 utilisateurs.",
        réponse="Cinq utilisateurs sont inclus dans le forfait Pro.", verdict="pass", justification="Le nombre est exact."),
    row("Combien d'utilisateurs sont inclus dans le forfait Équipe ?", "20 utilisateurs."),
    row("Combien coûte un utilisateur supplémentaire sur le forfait Pro ?", "6 € HT par mois.",
        réponse="Un utilisateur supplémentaire coûte 4 € HT par mois sur le forfait Pro.", verdict="fail",
        justification="4 € est le tarif du forfait Équipe ; sur Pro c'est 6 €."),
    row("Combien coûte un utilisateur supplémentaire sur le forfait Équipe ?", "4 € HT par mois."),
    row("Quelle remise obtient-on en payant à l'année ?", "2 mois offerts : on paie 10 mois sur 12."),
    row("Combien paie-t-on par an pour le forfait Pro avec le paiement annuel ?", "290 € HT par an (10 mois × 29 €)."),
    row("Combien de temps dure l'essai gratuit ?", "14 jours, sur les forfaits Pro et Équipe.",
        réponse="L'essai gratuit dure 30 jours.", verdict="fail", justification="C'est 14 jours, pas 30."),
    row("Faut-il une carte bancaire pour l'essai gratuit ?", "Non, aucune carte bancaire n'est demandée.",
        réponse="Non, aucune carte bancaire n'est demandée pour démarrer l'essai.", verdict="pass",
        justification="Réponse juste et complète."),
    row("Combien de factures par mois sur le forfait Découverte ?", "10 factures par mois."),
    row("Les factures sont-elles illimitées sur le forfait Pro ?", "Oui, les factures sont illimitées."),
    row("Quel espace de stockage est inclus dans le forfait Pro ?", "5 Go."),
    row("Quel espace de stockage est inclus dans le forfait Équipe ?", "50 Go."),
    row("À partir de quel prix démarre le forfait Entreprise ?", "À partir de 250 € HT par mois, sur devis.",
        réponse="Le forfait Entreprise commence à 250 € par mois, sur devis.", verdict="pass",
        justification="Montant et « sur devis » justes ; « HT » omis, sans conséquence ici."),
    row("Sous quel délai le support répond-il sur le forfait Pro ?", "Sous 24 heures, par e-mail."),
    row("Le support par téléphone existe-t-il sur le forfait Équipe ?", "Oui, par téléphone et e-mail, réponse sous 4 heures ouvrées."),
    row("Quel est le délai de réponse du support sur le forfait Découverte ?", "Sous 48 heures, par e-mail."),
    row("Y a-t-il un engagement de durée ?", "Non en paiement mensuel : résiliation à tout moment."),
    row("Peut-on se faire rembourser un abonnement annuel ?", "Oui dans les 30 jours suivant la souscription, non ensuite."),
    row("Les prix sont-ils indiqués hors taxes ou toutes taxes comprises ?", "Hors taxes (HT) ; la TVA de 20 % s'ajoute."),
    row("Les associations ont-elles une réduction ?", "Oui, 20 % de remise sur les forfaits Pro et Équipe.",
        réponse="Les associations bénéficient de 20 % de remise sur Pro et Équipe.", verdict="pass",
        justification="Taux et forfaits concernés exacts."),
    row("Quels moyens de paiement acceptez-vous ?", "Carte bancaire et prélèvement SEPA ; virement pour les abonnements annuels Équipe et Entreprise."),
    row("Où sont hébergées les données ?", "En France, à Paris."),
    row("L'export des données est-il payant ?", "Non, il est gratuit, en CSV et en PDF."),
    row("L'API est-elle disponible sur le forfait Pro ?", "Non : l'API et les webhooks commencent au forfait Équipe.",
        réponse="Oui, l'API est incluse dans le forfait Pro.", verdict="fail",
        justification="L'API n'existe qu'à partir du forfait Équipe."),
    row("Le SSO SAML est-il disponible sur le forfait Équipe ?", "Non : le SSO SAML est réservé au forfait Entreprise."),
    row("Combien coûte l'application mobile ?", ABSTAIN, ABSTAIN_RULE,
        réponse="L'application mobile coûte 5 € HT par mois.", verdict="fail",
        justification="Invention : la grille ne donne aucun prix pour une application mobile."),
    row("Le support est-il joignable le week-end ?", ABSTAIN, ABSTAIN_RULE),
]

assert len(ROWS) == 30, len(ROWS)
assert sum(1 for entry in ROWS if "verdict" in entry) == 10

path = pathlib.Path(__file__).with_name("faq-tarifs.jsonl")
path.write_text("".join(json.dumps(entry, ensure_ascii=False) + "\n" for entry in ROWS), encoding="utf-8")
print(f"{path.name} : {len(ROWS)} questions, {sum(1 for entry in ROWS if 'verdict' in entry)} annotées")
