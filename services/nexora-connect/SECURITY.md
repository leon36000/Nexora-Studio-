# Politique de sécurité — Nexora Connect

Nexora Connect stocke et utilise des identifiants d'accès à vos outils : leur sécurité est prioritaire.

## Signaler une vulnérabilité

Utilisez le signalement privé de GitHub sur <https://github.com/leon36000/Nexora-Studio-/security/advisories/new>. N'ouvrez pas de ticket public. Nous accusons réception sous trois jours ouvrés.

## Bonnes pratiques de déploiement

- **Chiffrement au repos** : `NEXORA_CONNECT_ENCRYPTION_KEY` est obligatoire ; conservez-la en lieu sûr (sans elle, les identifiants enregistrés sont perdus).
- **Authentification** : définissez `NEXORA_CONNECT_ADMIN_TOKEN` (console, `/api`, `/docs`) et `NEXORA_CONNECT_RUNTIME_TOKEN` (`/v1`, `/mcp`).
- **Réseau** : publiez le service sur `127.0.0.1` ou sur un réseau privé, derrière un proxy HTTPS.
- **Surface d'attaque** : limitez les actions et les proxys autorisés avec `OOMOL_CONNECT_ALLOWED_ACTIONS` / `OOMOL_CONNECT_BLOCKED_ACTIONS` et `OOMOL_CONNECT_ALLOWED_PROXIES` / `OOMOL_CONNECT_BLOCKED_PROXIES` (voir `docs/configuration.md`).
