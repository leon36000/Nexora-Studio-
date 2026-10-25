# Nexora

**Nexora** construit une suite d'IA souveraine pour les PME françaises : construire, lancer et suivre des agents et des automatisations, sans coder, sur des modèles que vous maîtrisez.

Ce dépôt contient la plateforme complète :

| Composant | Rôle | Dossier |
|---|---|---|
| **Nexora WorkStudio** | L'application : studio d'agents et de workflows en un seul outil, en français | [`workstudio/`](workstudio/) |
| **Nexora API** | La passerelle de modèles compatible OpenAI : clés, organisations, quotas, mesure de la consommation | [`services/nexora-api/`](services/nexora-api/) |
| **Nexora Connect** | Le connecteur d'outils (≈ 1 650 services), exposé en MCP et en HTTP | [`services/nexora-connect/`](services/nexora-connect/) |

## Installation en une commande

Il vous faut seulement **Docker** (Linux ou macOS, amd64 ou arm64) :

```bash
curl -fsSL https://raw.githubusercontent.com/leon36000/Nexora-Studio-/main/install.sh | bash
```

L'installateur vérifie Docker, pose quatre questions (nom de votre organisation, votre adresse, domaines autorisés, modèle de langage : local et gratuit, Mistral AI ou un autre service compatible OpenAI), génère les secrets, démarre la plateforme dans `~/nexora` et installe la commande `nexora` :

```bash
nexora status      # état des services
nexora logs        # journaux
nexora update      # mise à jour, configuration conservée
nexora uninstall   # arrêt ; --purge efface aussi les données
```

Ouvrez ensuite l'adresse affichée (par défaut <http://localhost:3000>) et créez votre compte avec l'adresse donnée à l'installation : vous êtes propriétaire de l'organisation. Votre premier espace contient déjà le dossier **« Modèles PME »** (devis, relance de facture, réponse support, tri des e-mails, compte rendu de réunion).

Installation sans questions (serveur, script) :

```bash
curl -fsSL https://raw.githubusercontent.com/leon36000/Nexora-Studio-/main/install.sh \
  | NEXORA_ORGANIZATION_OWNER_EMAIL=vous@entreprise.fr NEXORA_MODEL_CHOICE=local bash -s -- --yes
```

Installation manuelle depuis les sources, options et sauvegarde : voir le [guide](docs/guide/README.md).

## Ce que vous obtenez

- **Une interface en français** (et en anglais, au choix de chaque utilisateur).
- **Vos modèles, vos données** : tout appel de modèle passe par Nexora API, qui identifie, mesure et peut limiter la consommation. Aucune télémétrie n'est envoyée à un tiers.
- **Vos outils** : Nexora Connect est déjà branché dans chaque espace (Brevo, Google, Microsoft, Slack…).
- **La gouvernance** : organisations, rôles, journal d'audit, tableau de consommation, connexion unique (SSO OpenID Connect).
- **Une API pour les développeurs** : modèles et agents publiés au format OpenAI sous `https://<votre domaine>/v1`, clés gouvernées dans l'interface (voir [l'API des développeurs](docs/guide/api-developpeurs.md)).
- **Des traces de chaque appel de modèle** : arbre des étapes, jetons, durée et CO₂, données personnelles masquées avant stockage, conservation réglable, export OTLP facultatif (voir [les traces](docs/guide/traces.md)).
- **Une installation en une commande**, sur votre serveur, en amd64 comme en arm64.

## Vérifier une installation

```bash
NEXORA_SMOKE_ADMIN_EMAIL=<votre adresse> NEXORA_SMOKE_ADMIN_PASSWORD='<votre mot de passe>' scripts/smoke.sh http://localhost:3000
```

Ce test de fumée crée un compte jetable et vérifie l'interface, les modèles PME, Nexora Connect, l'exécution par Nexora API, puis, avec votre compte de propriétaire, le journal d'audit et la consommation.

## Développer

- Environnement de développement : `scripts/dev/up.sh` (bases de données jetables), puis `bun run dev` dans `workstudio/apps/sim`.
- Contrôles du dépôt : `scripts/check-no-ee.sh`, `scripts/check-brand.sh`, `scripts/check-licenses.sh`, `scripts/check-i18n.sh`.
- Conception et plan : [`docs/superpowers/`](docs/superpowers/).

## Licences et provenance

Nexora s'appuie sur des logiciels libres, modifiés et rebaptisés :

- **WorkStudio** vient de **Sim** (Apache-2.0). Le dossier propriétaire `apps/sim/ee/` de Sim n'est **pas** inclus : il est remplacé par des modules écrits en salle blanche, vérifiés par `scripts/check-no-ee.sh`.
- **Nexora API** vient d'**OpenGateLLM** (MIT).
- **Nexora Connect** vient d'**OpenConnector** (Apache-2.0).

Les licences d'origine sont conservées dans chaque dossier. Le détail figure dans [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) et dans les fichiers `UPSTREAM.md`.
