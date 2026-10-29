# Essais de bout en bout de WorkStudio intégré au site (navigateur)

Trois scripts Playwright (Node) qui jouent, avec un compte d'essai du site, la connexion unique, un message à l'assistant et le gabarit « Devis client » :

| Script | Ce qu'il fait |
|---|---|
| `sso.mjs` | page de connexion de WorkStudio → « Se connecter avec Nexora AI » → connexion du site → retour dans WorkStudio |
| `chat.mjs` | idem, puis envoie un message à l'assistant (passe par la passerelle du site, avec la clé de la personne) |
| `devis.mjs` | idem, puis lance le gabarit « Devis client » avec son exemple et cherche TPS/TVQ dans le résultat |

Lancement (depuis une machine qui voit WorkStudio et le site ; le mot de passe vient d'une variable, jamais d'un fichier du dépôt) :

```bash
npm i playwright@1.61.1            # dans un dossier de travail
docker run --rm --network host -v $PWD:/essais -w /essais \
  -e WS=https://<adresse de WorkStudio> -e EMAIL=<compte d'essai du site> -e PW="$MOT_DE_PASSE" \
  mcr.microsoft.com/playwright:v1.61.1-noble node sso.mjs
```

Les captures sont écrites dans `/essais/*.png`. Le compte d'essai doit avoir son courriel vérifié ; hors abonnement, régler `WORKSTUDIO_REQUIRE_SUBSCRIPTION=false` côté site (essais seulement). Voir `docs/INDEX.md`.
