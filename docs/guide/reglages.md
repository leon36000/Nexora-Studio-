# Réglages et gouvernance

| Réglage | Où | Pour qui |
|---|---|---|
| Membres, rôles, invitations | Réglages › Membres | Administrateurs de l'organisation |
| Journal d'audit | Réglages › Journal d'audit | Administrateurs |
| Consommation (requêtes, jetons) | Réglages › Consommation | Administrateurs |
| Modèles d'IA (par défaut, ajout, test) | Réglages › Modèles ([guide](modeles.md)) | Administrateurs |
| Secrets et variables d'environnement | Réglages › Secrets | Membres de l'espace |
| Outils MCP (Nexora Connect…) | Réglages › Outils MCP | Membres de l'espace |
| Clés d'API (workflows) | Réglages › Clés API | Membres |

Les autres réglages de l'instance (connexion unique, e-mail, domaines autorisés) se font dans `deploy/.env` puis `nexora restart` : voir [Installation](installation.md) et [Connexion unique](sso.md).
