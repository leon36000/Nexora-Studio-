# Intégrer Nexora à votre site et l'installer comme application

Cette page explique comment mettre un **agent Nexora** sur votre site web (une bulle de chat, un cadre dans une page ou un simple lien), comment **limiter** les sites qui ont le droit de l'afficher, comment appeler Nexora **depuis le serveur** de votre site, et comment **installer Nexora comme une application** sur votre PC.

Dans tous les exemples, remplacez `https://ia.mon-entreprise.fr` par l'adresse de **votre instance** (la valeur de `NEXORA_PUBLIC_URL`) et `support` par l'identifiant du chat de votre agent.

## Ce qu'il faut avant de commencer

1. **Un agent publié, avec un chat accessible sans compte.** Dans [Les agents](agents.md), publiez l'agent et activez **Accessible sans compte (lien public)**. Le chat est alors joignable à `https://ia.mon-entreprise.fr/chat/<identifiant>` : l'identifiant est la dernière partie du lien (lettres minuscules, chiffres et tirets). Un chat réservé aux membres affiche sa page de connexion dans le cadre, et la connexion échoue le plus souvent sur le site d'un autre : les navigateurs bloquent les cookies d'un site tiers. Pour un site public, utilisez un chat public, et ne donnez à l'agent que des documents que vos visiteurs peuvent voir.
2. **Une adresse HTTPS publique pour l'instance.** Un site en HTTPS ne peut pas afficher une page en `http://` : le navigateur bloque ce « contenu mixte » et la bulle reste vide. Renseignez dans `deploy/.env` `NEXORA_PUBLIC_URL=https://ia.mon-entreprise.fr` (voir [Installation](installation.md), section HTTPS : `nexora https <domaine>`), et vérifiez que cette adresse est joignable **depuis Internet** et non seulement depuis votre réseau. Une instance qui n'est joignable que sur votre réseau interne ne peut être intégrée qu'à un site interne.
3. **Un certificat valable.** Un certificat « interne » ou auto-signé est refusé par les navigateurs de vos visiteurs.

## 1. Une ligne : la bulle de chat

Collez ceci avant la fin de la balise `</body>` de vos pages :

```html
<script src="https://ia.mon-entreprise.fr/embed.js" data-nexora-chat="support" async></script>
```

Une bulle apparaît en bas à droite. Un clic ouvre le chat dans un panneau (plein écran sur téléphone). Le script pèse environ 5 Ko, n'a aucune dépendance, ne charge le chat qu'à la première ouverture et n'ajoute aucune feuille de style (il fonctionne donc sous une politique de sécurité stricte, voir plus bas).

### Réglages

Tous facultatifs, sauf `data-nexora-chat`.

| Attribut | Valeur | Effet |
|---|---|---|
| `data-nexora-chat` | identifiant du chat | **Obligatoire.** Un identifiant invalide n'ajoute rien à la page et écrit un avertissement `[Nexora]` dans la console du navigateur |
| `data-position` | `right` (défaut) ou `left` | Côté de la bulle |
| `data-color` | couleur hexadécimale : `#0a7d33`, `#fa0` | Couleur de la bulle et de l'en-tête (le texte devient noir ou blanc selon le contraste). Toute autre valeur est ignorée. Par défaut : l'indigo de Nexora |
| `data-label` | texte | Texte du bouton, lu par les lecteurs d'écran. Par défaut « Discuter avec nous » (« Chat with us » si `<html lang>` commence par `en`) |
| `data-open` | présent (ou `true`) | Ouvre le chat au chargement de la page |
| `data-mode` | `bubble` (défaut) ou `inline` | `inline` : le chat est affiché dans un élément de votre page, sans bulle |
| `data-target` | sélecteur CSS : `#aide` | Avec `inline` : l'élément qui reçoit le chat. Introuvable ou invalide : rien n'est ajouté |

Exemple, en français, à gauche, vert, ouvert au chargement :

```html
<script
  src="https://ia.mon-entreprise.fr/embed.js"
  data-nexora-chat="support"
  data-position="left"
  data-color="#0a7d33"
  data-label="Une question ?"
  data-open
  async
></script>
```

Le chat dans la page, à la place de la bulle :

```html
<div id="aide" style="height: 600px"></div>
<script
  src="https://ia.mon-entreprise.fr/embed.js"
  data-nexora-chat="support"
  data-mode="inline"
  data-target="#aide"
  async
></script>
```

### Accessibilité

Le bouton est un vrai `<button>` (clavier : Tab, Entrée, Espace) avec un nom accessible, `aria-expanded` et un anneau de focus visible. Le panneau est une boîte de dialogue étiquetée ; **Échap** le ferme et rend le focus à la bulle ; il a son propre bouton **Fermer**. Si le visiteur a demandé de réduire les animations (`prefers-reduced-motion`), il n'y en a aucune.

### Commander la bulle depuis votre page

Le script ajoute `window.NexoraChat` :

```js
NexoraChat.open()      // ouvre le chat
NexoraChat.close()     // le ferme
NexoraChat.toggle()
NexoraChat.isOpen()    // true ou false
```

Par exemple, un bouton « Poser une question » : `<button onclick="NexoraChat.open()">Poser une question</button>`. Les événements `nexora:open`, `nexora:close` et `nexora:ready` (chat chargé, mode `inline`) sont émis sur `window` :

```js
window.addEventListener('nexora:open', (event) => console.log('chat ouvert', event.detail.chat))
```

Le script communique avec le chat par `postMessage` et **vérifie l'origine** de chaque message reçu : seul le cadre du chat, servi par votre instance, peut lui demander de s'ouvrir ou de se fermer. Un seul chat par page.

## 2. Un cadre (iframe) ou un lien, sans le script

Un cadre, si vous préférez tout maîtriser :

```html
<iframe
  src="https://ia.mon-entreprise.fr/chat/support"
  title="Assistant de Mon Entreprise"
  style="width: 100%; height: 640px; border: 0"
  allow="microphone; clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
></iframe>
```

Un lien : `<a href="https://ia.mon-entreprise.fr/chat/support" target="_blank" rel="noopener">Discuter avec l'assistant</a>`. Le lien n'est pas concerné par la liste des origines autorisées.

## 3. Dans un site Next.js 15 / React 19

Créez un composant client, puis placez-le **une fois** dans la mise en page racine (`app/layout.tsx`) : le script reste chargé quand le visiteur change de page.

```tsx
// components/nexora-chat.tsx
'use client'

import Script from 'next/script'

export function NexoraChat() {
  const instance = process.env.NEXT_PUBLIC_NEXORA_URL
  const chat = process.env.NEXT_PUBLIC_NEXORA_CHAT
  if (!instance || !chat) return null

  return (
    <Script
      src={`${instance}/embed.js`}
      data-nexora-chat={chat}
      data-color="#4F46E5"
      strategy="lazyOnload"
    />
  )
}
```

```tsx
// app/layout.tsx
import { NexoraChat } from '@/components/nexora-chat'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <NexoraChat />
      </body>
    </html>
  )
}
```

Dans `.env.local` du site : `NEXT_PUBLIC_NEXORA_URL=https://ia.mon-entreprise.fr` (sans `/` final) et `NEXT_PUBLIC_NEXORA_CHAT=support`. Ces deux valeurs ne sont pas secrètes : l'adresse et l'identifiant d'un chat public sont de toute façon visibles dans la page. Pour ouvrir le chat depuis un de vos boutons React : `window.NexoraChat?.open()`.

Si votre site déclare une politique `Content-Security-Policy` (en-tête ou balise `<meta>`), autorisez l'instance : `script-src https://ia.mon-entreprise.fr` et `frame-src https://ia.mon-entreprise.fr`. Un site qui n'en déclare pas n'a rien à faire.

## 4. Pour Directus et pour un site HTML statique

**Site HTML statique** : collez la ligne `<script …>` du §1 dans le modèle commun de vos pages (en-tête ou pied de page), pas page par page.

**Directus** : Directus gère le contenu ; c'est le site qui l'affiche (Next.js, Nuxt, Astro…) qui porte le script. Mettez-le dans la mise en page du site, comme au §3 ou §1. Évitez de le coller dans un champ de texte riche de Directus : l'éditeur supprime en général les balises `<script>`. Pour afficher le chat **à un endroit précis** d'une page gérée dans Directus, créez dans le site un petit composant qui rend le conteneur (`<div id="aide">`) puis utilisez le mode `inline` (§1), ou insérez directement l'`<iframe>` du §2 si votre éditeur l'autorise.

## 5. Limiter les sites qui peuvent afficher le chat

Par défaut, **tous les sites** peuvent mettre le chat de vos agents dans un cadre. Pour ne l'autoriser qu'aux vôtres, renseignez dans `deploy/.env` :

```
NEXORA_EMBED_ORIGINS=https://www.mon-entreprise.fr,https://mon-entreprise.fr
```

puis appliquez : `nexora start` (ou `docker compose -f deploy/compose.yml --env-file deploy/.env up -d`). Aucune reconstruction d'image n'est nécessaire : la liste est lue à chaque requête.

Règles :

- une origine = schéma + hôte (+ port) : `https://www.mon-entreprise.fr`, `https://staging.mon-entreprise.fr:8443`. `www.mon-entreprise.fr` et `mon-entreprise.fr` sont deux origines : listez les deux si besoin ;
- `http://` n'est accepté que pour essayer en local : `http://localhost:3000`, `http://127.0.0.1:3000` ;
- **aucun joker** (`*`, `https://*.mon-entreprise.fr`) : une faute de frappe ne doit pas ouvrir l'instance à tout un domaine. Listez chaque sous-domaine ;
- pas de chemin, de paramètre ni d'identifiant dans l'adresse (`https://site.fr/page` est refusé) ;
- une entrée invalide est **ignorée** et signalée dans les journaux de WorkStudio (`NEXORA_EMBED_ORIGINS : entrées ignorées`) ; si **aucune** entrée n'est valable, seul Nexora lui-même peut afficher ses chats (et une erreur est journalisée) : l'instance ne s'ouvre jamais à tous par accident ;
- liste vide ou variable absente : tous les sites, comme avant.

Le script `/embed.js` reste servi à **tous** les sites : il n'a rien de secret. C'est la page du chat qui est protégée : sur un site non listé, le navigateur refuse d'afficher le cadre (message « refused to connect » dans la console), et la bulle s'ouvre sur un panneau vide.

Pour vérifier :

```bash
curl -sI https://ia.mon-entreprise.fr/chat/support | grep -i content-security-policy
# … frame-ancestors 'self' https://www.mon-entreprise.fr https://mon-entreprise.fr
```

Cette liste n'est **pas une authentification** : elle empêche qu'un autre site affiche votre chat dans son cadre (usurpation d'apparence), pas qu'on ouvre le lien du chat directement ou qu'on l'appelle par programme. Pour réserver un agent, ne le rendez pas accessible sans compte.

## 6. Appeler Nexora depuis le serveur de votre site (API `/v1`)

Pour votre propre interface (un champ de recherche, un formulaire), appelez l'[API des développeurs](api-developpeurs.md) **depuis le serveur** de votre site. Elle n'envoie pas d'en-têtes CORS, et **une clé d'API ne doit jamais se trouver dans le navigateur** : quiconque ouvre les outils de développement la lirait et consommerait vos budgets.

1. Créez une clé dans **Réglages › Clés d'API Nexora** (portée : l'espace de l'agent ; plafond mensuel et débit réglés au plus juste).
2. Gardez-la dans une variable d'environnement **sans** préfixe `NEXT_PUBLIC_` (`NEXORA_API_KEY`).
3. Exposez à votre page une route de votre site qui fait l'appel. Exemple, route Next.js 15 (`app/api/question/route.ts`) :

```ts
export async function POST(request: Request) {
  const { question } = (await request.json()) as { question?: string }
  if (!question || question.length > 2000) {
    return Response.json({ error: 'Question invalide' }, { status: 400 })
  }

  const reponse = await fetch(`${process.env.NEXORA_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NEXORA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.NEXORA_AGENT, // l'agent, tel qu'il apparaît dans GET /v1/models
      messages: [{ role: 'user', content: question }],
    }),
  })
  if (!reponse.ok) return Response.json({ error: 'Assistant indisponible' }, { status: 502 })

  const donnees = await reponse.json()
  return Response.json({ reponse: donnees.choices?.[0]?.message?.content ?? '' })
}
```

Limitez la longueur et la fréquence des questions côté site (un visiteur anonyme ne doit pas pouvoir épuiser le plafond de la clé). Autre usage typique côté serveur : générer ou résumer du contenu à la publication d'un article, ou relier un workflow Directus (flow « Webhook / Requête ») à Nexora.

## 7. Installer Nexora comme application sur votre PC

Nexora peut s'installer **depuis le navigateur**, sans rien télécharger : l'application s'ouvre dans sa propre fenêtre, avec son icône dans la barre des tâches et le menu Démarrer.

- **Chrome** : ouvrez votre instance, puis cliquez sur l'icône **Installer** à droite de la barre d'adresse, ou menu **⋮ › Diffuser, enregistrer et partager › Installer la page en tant qu'application**.
- **Edge** : icône **Application disponible** dans la barre d'adresse, ou menu **… › Applications › Installer ce site en tant qu'application**.
- **Safari (Mac, iPhone)** : **Partager › Ajouter au Dock / à l'écran d'accueil**.
- Firefox ne sait pas installer d'applications web sur ordinateur.

Conditions : l'instance doit être servie en **HTTPS** (ou ouverte sur `localhost`), avec un certificat valable. L'application est **la même interface que dans le navigateur** : il faut une connexion à l'instance, et elle n'est **jamais mise en cache hors ligne** (Nexora n'installe volontairement aucun « service worker » : vos données d'entreprise ne restent pas sur le poste). Pour la retirer : menu de la fenêtre de l'application › **Désinstaller**.

Le manifeste de l'application (`/manifest.webmanifest`) donne le nom « Nexora WorkStudio », la langue française, les icônes (dont une version « maskable » pour Android) et un raccourci « Créer un workflow ». Le nom et la couleur suivent la marque de l'instance (`NEXT_PUBLIC_BRAND_NAME`).

## Application PC

- **Maintenant** : l'installation depuis Chrome ou Edge ci-dessus. C'est la voie recommandée.
- **Plus tard** : une application de bureau dédiée (un « shell » Electron, dossier `workstudio/apps/desktop`) existe dans le code hérité mais porte encore l'identité d'origine : elle sera **rebrandée** au jalon K16. Ne la distribuez pas avant.
- **Signature** : un installateur Windows (`.exe`) non signé déclenche l'alerte « SmartScreen » de Windows ; la signature demande un **certificat de signature de code payant** (renouvelable chaque année) que l'entreprise doit acheter. L'installation depuis le navigateur n'a pas ce problème.

## En cas de problème

| Symptôme | Cause probable |
|---|---|
| Aucune bulle | Identifiant invalide (lettres minuscules, chiffres, tirets : vérifiez la console du navigateur, ligne `[Nexora]`), script bloqué par un bloqueur de publicités ou par la politique de sécurité du site (`script-src`) |
| Bulle présente, panneau vide ou « refused to connect » | Votre site n'est pas dans `NEXORA_EMBED_ORIGINS`, ou la politique du site interdit `frame-src` vers l'instance |
| Bulle présente, rien ne s'affiche, console : « Mixed Content » | L'instance est en `http://` alors que le site est en HTTPS : renseignez une adresse HTTPS publique (`NEXORA_PUBLIC_URL`) |
| Le chat demande de se connecter | L'agent n'est pas « Accessible sans compte » |
| Erreur de certificat dans le cadre | Certificat auto-signé ou « interne » : utilisez un certificat public (Let's Encrypt) |
| Le bouton « Installer » n'apparaît pas | Adresse en `http://` (hors `localhost`), ou navigateur sans prise en charge (Firefox) |
