# Connexion unique (SSO OpenID Connect)

Nexora WorkStudio accepte tout fournisseur d'identité **OpenID Connect** : Keycloak, Microsoft Entra ID, Google Workspace, Authentik, Okta, etc. Vos salariés se connectent avec leur compte d'entreprise ; un compte Nexora est créé à leur première connexion.

## 1. Déclarer Nexora chez votre fournisseur

Créez une application (un « client ») confidentielle avec :

- **URL de redirection** : `<NEXORA_PUBLIC_URL>/api/auth/oauth2/callback/nexora-oidc`, par exemple `https://ia.mon-entreprise.fr/api/auth/oauth2/callback/nexora-oidc` ;
- **portées** : `openid`, `profile`, `email` ;
- un **secret client**.

Le fournisseur doit transmettre l'adresse e-mail de l'utilisateur et indiquer qu'elle est vérifiée (`email_verified`).

## 2. Configurer Nexora

Dans `deploy/.env` :

```bash
NEXORA_OIDC_NAME=Mon entreprise
NEXORA_OIDC_ISSUER=https://sso.mon-entreprise.fr/realms/pme
NEXORA_OIDC_CLIENT_ID=nexora
NEXORA_OIDC_CLIENT_SECRET=<le secret client>
```

`NEXORA_OIDC_ISSUER` est l'« émetteur » de votre fournisseur. Nexora lit sa configuration à l'adresse `<émetteur>/.well-known/openid-configuration` et vérifie chaque connexion avec l'émetteur que cette configuration annonce. Les quatre variables sont nécessaires : sans `NEXORA_OIDC_NAME`, le bouton n'apparaît pas et le SSO reste désactivé.

| Fournisseur | Émetteur |
|---|---|
| Keycloak | `https://<serveur>/realms/<royaume>` |
| Microsoft Entra ID | `https://login.microsoftonline.com/<id du locataire>/v2.0` |
| Google Workspace | `https://accounts.google.com` |

Puis appliquez :

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env up -d
```

La page de connexion affiche alors **« Se connecter avec Mon entreprise »**.

## Sécurité

- Seul ce fournisseur, configuré par vous, peut ouvrir une session ; les connecteurs d'intégration (Salesforce, Jira…) ne le peuvent pas.
- Dès que le SSO est configuré, **l'inscription par e-mail et mot de passe est fermée** : personne ne peut créer à l'avance un compte au nom d'un salarié. Les comptes déjà créés par e-mail continuent de se connecter.
- Un compte existant n'est rattaché au SSO que si le fournisseur indique que l'adresse est vérifiée (`email_verified`). **Microsoft Entra ID ne le transmet pas** : avec Entra, un compte créé par e-mail avant l'activation du SSO (souvent celui du gérant) continue de se connecter par mot de passe et ne peut pas passer au SSO.
- Les personnes extérieures à votre fournisseur d'identité (expert-comptable, prestataire) ne peuvent plus s'inscrire : ajoutez-les chez votre fournisseur.
- Avec `NEXORA_REGISTRATION_DISABLED=true`, le SSO ne crée plus de compte : seuls les utilisateurs existants se connectent.
- Combinez avec `NEXORA_ALLOWED_EMAIL_DOMAINS` pour n'accepter que les adresses de votre entreprise.
