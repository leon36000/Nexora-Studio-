# Nexora Connect

**Nexora Connect** branche les outils de votre entreprise sur Nexora : environ 1 650 services (Brevo, Google, Microsoft, Slack, Notion, HubSpot…) exposés de deux façons :

- en **MCP** (`/mcp`), avec cinq outils généralistes (`list_apps`, `list_connections`, `search_actions`, `get_action_guide`, `execute_action`) qui économisent le contexte des modèles ;
- en **HTTP** (`/v1`), pour les scripts et les intégrations.

Dans la plateforme Nexora, le service est déjà branché comme serveur MCP dans chaque espace de Nexora WorkStudio (voir [`deploy/compose.yml`](../../deploy/compose.yml)).

## Configuration

Les variables se nomment `NEXORA_CONNECT_*`. Le service lit aussi les noms d'origine `OOMOL_CONNECT_*` (voir [`docs/configuration.md`](docs/configuration.md)).

| Variable | Rôle |
|---|---|
| `NEXORA_CONNECT_ENCRYPTION_KEY` | **Obligatoire.** Chiffre les identifiants enregistrés. Sans elle, le service refuse de démarrer (sauf `NEXORA_CONNECT_ALLOW_PLAINTEXT=1`, réservé au développement local) |
| `NEXORA_CONNECT_RUNTIME_TOKEN` | Jeton exigé par l'API d'exécution et par MCP |
| `NEXORA_CONNECT_ADMIN_TOKEN` | Jeton exigé par la console d'administration |
| `NEXORA_CONNECT_ORIGIN` | Adresse publique du service (retours OAuth) |

Aucun service tiers n'est contacté par défaut. Le marketplace d'actions est une option à configurer explicitement.

## Développement

```bash
npm ci
npm run dev
npx vitest run
```

## Provenance

Nexora Connect est un fork d'OpenConnector (Apache-2.0). Les licences et notices d'origine sont dans [`LICENSE.txt`](LICENSE.txt) et [`NOTICE.md`](NOTICE.md), et la provenance dans [`UPSTREAM.md`](UPSTREAM.md).
