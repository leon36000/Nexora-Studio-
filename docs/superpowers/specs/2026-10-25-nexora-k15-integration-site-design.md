# K15 — Intégration au site web et application installable : conception

> Jalon K15 de la v3. Courte par choix : l'essentiel existe déjà (pages `/chat/<identifiant>` intégrables, API `/v1`, `app/manifest.ts`) ; K15 ajoute le script « une ligne », le réglage des origines autorisées, l'audit de la PWA et le guide.

## But

Le fondateur veut mettre l'assistant ou un agent Nexora sur son site (Next.js 15 + Directus, `NexoraWeb`) avec une seule ligne, pouvoir limiter les sites qui ont le droit de l'intégrer, et installer Nexora comme une application sur PC sans attendre l'application Electron (K16).

## Ce qui existe (état vérifié)

- `/chat/<identifiant>` : en-tête `Content-Security-Policy` avec `frame-ancestors *`, posé par `next.config.ts` au **moment de la construction** (les `headers()` d'un `next.config` sont figés dans le manifeste de routes). Pas d'`X-Frame-Options`.
- `proxy.ts` laisse passer `/chat/*` (page publique) ; son `matcher` couvre aussi `/embed.js` et le manifeste s'ils ne sont pas exclus.
- `app/manifest.ts` : nom de marque, icônes 192/512 + 180, `display: standalone`, mais `lang: en-US`, `orientation: portrait-primary` (absurde sur un PC), raccourci en anglais, description française en dur, pas d'icône `maskable`, pas d'`id`.
- Aucun service worker.

## Décisions

1. **`/embed.js`** : un fichier statique `public/embed.js`, JavaScript pur, sans dépendance, **< 6 Ko minifié**. Source lisible : `lib/nexora/embed/embed.src.js` ; `bun run build:embed` produit `public/embed.js` (minifié par Bun) avec, en bannière, l'empreinte de la source ; un test compare cette empreinte pour qu'une source modifiée sans reconstruction échoue. Biome ignore le fichier construit. En-têtes ajoutés par `next.config.ts` : `Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin` (un site qui isole ses origines peut le charger), `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`, `X-Content-Type-Options: nosniff`. Exclu du `matcher` du proxy (pas de session, pas de CSP de page). Servi à tous, quelle que soit la liste d'origines.
2. **Textes du script** : le script est servi à des sites tiers, hors de next-intl. Il porte deux dictionnaires minuscules (fr par défaut, en si `<html lang>` commence par `en`) ; le bouton se règle aussi par `data-label`. Ce n'est pas du texte d'interface WorkStudio.
3. **Script, comportement** : voir le plan, tâche 2. Aucune feuille de style injectée (une CSP de site tiers peut l'interdire) : styles posés par l'API CSSOM, anneau de focus géré en JavaScript, `prefers-reduced-motion` lu par `matchMedia`. Aucun `innerHTML` : tout passe par `createElement`/`textContent`/`setAttribute`. Iframe `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"` (jamais `allow-top-navigation`).
4. **Messages `postMessage`** : le script n'écoute que `message` dont `event.origin` est l'origine de l'instance **et** dont `event.source` est la fenêtre de son iframe, avec `data.source === 'nexora-chat'` ; types reconnus : `close`, `open`. Il émet vers la page hôte des `CustomEvent` (`nexora:ready`, `nexora:open`, `nexora:close`) et vers l'iframe `{source:'nexora-embed', type}` avec l'origine de l'instance comme cible.
5. **Origines autorisées** : `NEXORA_EMBED_ORIGINS` (liste séparée par des virgules). Module pur `lib/core/security/embed-origins.ts` : chaque entrée doit être une origine `https://hôte[:port]` ou `http://localhost|127.0.0.1|[::1][:port]`, sans chemin, requête, fragment ni identifiants ; **tout joker est refusé** (`*`, `*.exemple.fr`…) ; les entrées invalides sont ignorées et journalisées (`logger.warn`). Vide ou absente ⇒ `frame-ancestors *` (comportement actuel). Renseignée ⇒ `frame-ancestors 'self' <origines>`. Renseignée **mais sans aucune entrée valide** ⇒ `frame-ancestors 'self'` (échec fermé : une faute de frappe ne rouvre pas l'instance à tous) et erreur journalisée.
6. **Calcul à la requête, pas à la construction** : la variable est une variable d'exécution Docker. `getChatEmbedCSPPolicy()` lit donc l'environnement à chaque appel et `proxy.ts` pose l'en-tête CSP des pages `/chat/*` (retiré du bloc « Chat pages » de `next.config.ts`, qui garde `nosniff` et les en-têtes d'isolation).
7. **PWA** : le manifeste est complété (voir plan tâche 5) ; **aucun service worker** : une application authentifiée ne doit pas être mise en cache hors ligne, et Chrome/Edge proposent « Installer » sans lui (installabilité : manifeste + HTTPS ; le service worker n'est plus exigé). Icône `maskable` générée depuis le logo « n » existant (fond plein).
8. **Fumée** : un contrôle « Intégration au site » sans navigateur (HTTP seulement).

## Hors périmètre

- Le shell Electron (`apps/desktop`) : K16 (rebrandage), signature du `.exe` payante.
- Un chat réservé aux membres dans une iframe d'un autre site : le cookie de session de l'instance est un cookie tiers pour le site hôte (bloqué par défaut par les navigateurs). L'intégration vise les chats **publics** ; documenté dans le guide.
- Une liste d'origines ne remplace pas l'authentification : elle empêche seulement qu'un autre site affiche votre chat dans son cadre (le chat public reste joignable directement et par l'API).

## Risques

- Le CSP du site hôte (s'il en a un) doit autoriser `script-src` + `frame-src` vers l'instance : indiqué dans le guide. `NexoraWeb` n'en pose pas.
- L'instance doit être en HTTPS public (`NEXORA_PUBLIC_URL`) pour un site HTTPS : contenu mixte bloqué sinon.
