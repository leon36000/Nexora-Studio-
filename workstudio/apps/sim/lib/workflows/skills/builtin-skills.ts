/**
 * Built-in (template) skills that ship with every workspace.
 *
 * These are NOT stored in the `skill` database table. They are merged into the
 * skill list at read time (see `listSkills` / the `/api/skills` route) so they
 * show up everywhere real skills do — the Skills page, the mothership `/`
 * mention menu, and the agent block — and they resolve when tagged. They are
 * marked read-only so the UI hides edit/delete, and the upsert/delete paths
 * reject their ids so they can never be persisted to a user's workspace row.
 *
 * This module is pure data (no DB imports) so it is safe to import from both
 * server operations and the agent executor.
 */

export interface BuiltinSkill {
  id: string
  name: string
  description: string
  content: string
}

const DEPLOY_WORKFLOW_CONTENT = `# Déployer un workflow

Comment prendre un workflow terminé et le rendre utilisable par le monde extérieur.

## Ce que déployer signifie vraiment

Déployer publie un instantané d’un workflow. La version que l’on modifie et la version réellement en ligne sont deux choses distinctes : les changements apportés à la copie modifiable n’atteignent personne tant que vous ne déployez pas de nouveau. Chaque déploiement est une version enregistrée, avec laquelle vous pouvez comparer ou à laquelle vous pouvez revenir. Un même workflow peut être publié sous plus d’une forme à la fois.

## Les trois façons de publier

- **Comme une API** : lorsque le workflow est un pipeline en arrière-plan que d’autres logiciels appellent : des données entrent, un résultat ressort. Idéal pour les transformations, les recherches et les fonctions appelées par du code.
- **Comme une interface de clavardage** : lorsqu’une personne doit converser avec le workflow au moyen d’un lien partageable. Idéal quand un agent conversationnel est au centre du workflow. À noter : publier un clavardage publie aussi une API en parallèle, de sorte que vous obtenez les deux.
- **Comme un outil que d’autres agents d’IA peuvent appeler** : lorsque le workflow doit apparaître comme une action dans un assistant d’IA ou un environnement de programmation. Cela demande un endroit où l’outil peut loger, soit un endroit existant, soit un nouveau créé pour lui.

Si l’utilisateur ne précise rien : un workflow où une personne envoie une entrée et où un agent répond est un clavardage; une pure transformation d’une entrée en une sortie, sans conversation, est une API; une action à usage unique destinée à être déclenchée par une autre IA est un outil.

## Avant de déployer

- Assurez-vous que le workflow est complet et bien relié : il a un point de départ clair et un point d’arrivée clair.
- Assurez-vous que chaque service qu’il utilise est connecté. S’il manque un identifiant d’accès, réglez-le d’abord plutôt que de livrer quelque chose qui plantera à l’exécution.
- Assurez-vous qu’il s’exécute réellement. Ne dites pas à l’utilisateur que ça fonctionne si ça n’a jamais été testé.
- S’il est déjà en ligne, comprenez exactement ce qui a changé depuis la dernière fois, afin de déployer volontairement et non par accident.

## Bien faire selon le type

- **API :** publiez-la, puis fournissez le véritable point d’accès et un exemple fonctionnel d’appel. N’inventez pas l’URL.
- **Clavardage :** déterminez quelle sortie de bloc doit réellement être affichée à l’utilisateur, et utilisez la vraie sortie, et non l’étiquette d’affichage conviviale, qui n’est souvent pas le vrai champ. Si le workflow peut se terminer à plus d’un endroit selon des conditions, assurez-vous que chaque fin possible est incluse afin que l’utilisateur voie toujours une réponse.
- **Outil pour agents d’IA :** donnez-lui un nom et une description clairs, décrivez chaque entrée simplement et fournissez les instructions de configuration pour le client d’IA de l’utilisateur.

## Options à envisager

Surtout pour le clavardage : un identifiant d’URL (slug) propre (en minuscules, avec des traits d’union), un titre, une description, un message d’accueil et le niveau d’accès : ouvert à tous, protégé par mot de passe ou limité à des adresses courriel précises. Si vous choisissez l’accès par mot de passe ou par courriel, vous devez effectivement fournir le mot de passe ou la liste des adresses autorisées, sinon l’accès ne se comportera pas comme prévu.

## Clés et accès

Appeler une API publiée ou un outil d’IA exige une clé d’accès. Vérifiez d’abord si une clé existe déjà : si c’est le cas, n’en créez pas une autre, indiquez simplement où la trouver à l’utilisateur. Ne générez une nouvelle clé que s’il n’en existe aucune. Lorsque vous en créez une, la clé complète n’est affichée qu’une seule fois : dites à l’utilisateur de la conserver, car elle ne pourra pas être récupérée plus tard.

## Façons d’appeler une API

On peut l’appeler et attendre le résultat complet, l’appeler en flux continu qui envoie des morceaux au fur et à mesure qu’ils sont produits, ou l’appeler comme tâche en arrière-plan dont on vérifie l’état plus tard. Mentionnez celle qui convient à l’usage prévu par l’utilisateur.

## Une fois en ligne

Confirmez l’état réel plutôt que de présumer que c’est en ligne du seul fait qu’un lien existe. Si la copie en ligne est en retard sur la copie modifiée, il vaut la peine de le signaler : cela signifie que les changements récents ne sont pas encore servis. Vous pouvez actualiser la version en ligne pour qu’elle corresponde aux dernières modifications, changer sa configuration, ramener la production à une version antérieure, ou rapatrier une ancienne version dans l’éditeur pour travailler à partir d’elle.

## Erreurs faciles à éviter

- Afficher la mauvaise chose dans un clavardage parce qu’on a utilisé une étiquette d’affichage au lieu de la vraie sortie : confirmez toujours ce qui sort réellement.
- Un slug de lien contenant des majuscules ou des espaces.
- Oublier de mentionner qu’un clavardage expose aussi une API.
- Prétendre « déployé » alors que la copie en ligne est périmée.
- Choisir un accès protégé sans fournir le mot de passe ou les courriels autorisés.
- Déployer alors qu’un service n’est toujours pas connecté, de sorte que ça échoue dès l’exécution.
- Générer une nouvelle clé d’accès alors qu’il en existe déjà une, au lieu de simplement l’indiquer.
- Perdre la clé d’accès (perdue pour de bon), ou fabriquer une URL.
`

const CONNECT_INTEGRATION_CONTENT = `# Connecter une intégration

Comment connecter un service et choisir le bon identifiant de compte.

## D’abord, déterminer comment le service s’authentifie

Certains services se connectent en ouvrant une session auprès du fournisseur (le parcours « se connecter avec… »). D’autres se connectent avec une clé d’API que l’on colle. Quelques-uns prennent en charge les deux. Vérifiez toujours de quel type est un service avant de faire quoi que ce soit : ne présumez rien. S’il prend en charge les deux, mentionnez les deux voies. S’il ne s’agit pas du tout d’une intégration reconnue, dites-le honnêtement plutôt que de faire semblant.

## Pour les services avec ouverture de session

Vérifiez d’abord si l’utilisateur a déjà connecté ce compte. Si c’est le cas et qu’il n’a pas demandé un autre compte, utilisez simplement la connexion existante : ne lui faites pas reconnecter. Si rien n’est connecté, générez un lien de connexion et présentez-le pour qu’il puisse autoriser en un clic.

Le plus important ici est de faire correspondre le service à la bonne identité de fournisseur. Les services sont souvent plus précis qu’il n’y paraît : un seul nom de fournisseur général peut cacher plusieurs sous-services différents, alors connectez-vous toujours au sous-service exact visé plutôt qu’au parent générique. Se tromper donne à l’utilisateur un lien qui autorise la mauvaise chose.

## Pour les services avec clé d’API

Dites clairement à l’utilisateur quelle clé est requise et où l’obtenir. Vérifiez s’il en a déjà enregistré une. Stockez-la comme paramètre de l’espace de travail (n’utilisez un paramètre personnel que s’il le demande); dès lors, le workflow y fait référence par son nom plutôt que d’intégrer le secret. N’essayez pas de faire passer un service à clé d’API par le parcours d’ouverture de session : ça ne fonctionnera pas.

## Quand il y a plus d’un compte

Si l’utilisateur a connecté plusieurs comptes pour le même fournisseur, ne devinez pas lequel utiliser. Présentez-lui les choix en termes clairs (quel compte, quand il a été connecté) et laissez-le choisir. Ne sélectionnez automatiquement que lorsqu’il n’y en a qu’un seul.

## Un autre type de clé

Il existe aussi une clé servant à appeler de l’extérieur les propres workflows publiés de l’utilisateur. C’est une tout autre chose que la connexion d’un service tiers : ne confondez pas les deux.

## Erreurs faciles à éviter

- Se connecter à un nom de fournisseur générique alors que le service exige un sous-service précis : cela autorise discrètement la mauvaise chose.
- Traiter le nom du service lui-même comme son identité de fournisseur; les deux diffèrent souvent.
- Faire passer un service à clé d’API par le parcours d’ouverture de session, ou l’inverse.
- Présumer que c’est « connecté » alors que la connexion existante ne couvre pas réellement ce dont cette tâche a besoin.
- Choisir automatiquement un compte quand il y en a plusieurs.
- Afficher en clair une clé brute, un jeton ou un lien : ils doivent toujours être présentés comme des identifiants protégés et copiables.
`

const RESEARCH_CONTENT = `# Recherche

Comment bien faire de la recherche et en rapporter quelque chose de réellement utile.

## Choisir le bon type de source

- Pour une bibliothèque ou un cadriciel connu, allez directement à sa documentation officielle : ne cherchez pas sur le Web ce que la documentation tranche de façon faisant autorité.
- Pour une question sur les fonctionnalités de cette plateforme, utilisez la documentation de la plateforme.
- Pour un sujet général, une comparaison ou tout ce pour quoi l’actualité compte, cherchez sur le Web ouvert; vous pouvez privilégier les actualités, la recherche, le code ou les sources d’entreprise selon la question.
- Quand vous connaissez déjà les pages exactes dont vous avez besoin, lisez-les simplement, et lisez-en plusieurs à la fois plutôt qu’une à la fois.
- Pour une seule page riche en contenu, lisez cette page directement; n’explorez de nombreuses pages d’un site que si vous avez vraiment besoin de cette étendue, car c’est lent et coûteux.

## Comment s’y prendre concrètement

Cherchez largement pour trouver une poignée de sources faisant autorité, puis lisez-les en profondeur : les extraits des résultats de recherche sont des pistes, pas des réponses. Privilégiez les sources primaires et officielles aux blogues optimisés pour le référencement. Lancez les recherches indépendantes ensemble plutôt qu’à la suite. Quand la recherche se rapporte à quelque chose que l’utilisateur construit, appuyez-vous sur ses propres documents pour que les constats se rattachent vraiment à sa situation.

## Comment rendre compte

Commencez par la conclusion la plus importante, puis présentez les constats à l’appui, chacun rattaché à sa provenance. Si vous ne pouvez pas indiquer de source pour une affirmation, ne la faites pas. Recoupez tout ce qui est important avec plus d’une source. Terminez par ce que cela signifie pour l’utilisateur et ce qu’il doit en faire, pas seulement un amas de faits.

## Quand les sources divergent ou sont périmées

Portez attention aux dates. Pour ce qui évolue vite (tarification, API, versions de modèles), fiez-vous à la source fiable la plus récente et vérifiez-la en direct plutôt que de vous fier à votre mémoire. En cas de véritable conflit, présentez les deux versions et signalez-le au lieu de trancher en silence. Si l’utilisateur utilise une version précise de quelque chose, limitez votre recherche à cette version. Soyez honnête quant à l’incertitude.

## Erreurs faciles à éviter

- Recourir par défaut à une recherche Web pour tout : les bibliothèques et les fonctionnalités de la plateforme ont de meilleures sources de référence.
- Explorer un site entier alors que la lecture de quelques pages suffirait.
- Citer ou référencer une page que vous n’avez pas réellement lue, ou inventer un lien.
- Enfouir la réponse sous de l’information brute au lieu de la synthétiser.
- Partir dans des digressions avant d’avoir répondu à ce qui était réellement demandé.
`

const CREATE_TABLE_CONTENT = `# Créer une table

Comment structurer des données pour qu’elles soient vraiment utiles par la suite, et non un simple fourre-tout.

## Concevoir d’abord les colonnes

Décidez de la forme avant de charger quoi que ce soit. Donnez à chaque colonne le type le plus étroit qui soit exact : texte, nombre, vrai/faux, date, ou un conteneur imbriqué pour les valeurs vraiment complexes. Gardez les nombres comme nombres et les dates comme dates afin de pouvoir réellement les trier et les comparer plus tard; les stocker en texte brut fausse discrètement le filtrage. Marquez l’identifiant naturel (comme un courriel ou un identifiant externe) comme unique pour que les doublons ne puissent pas s’y glisser. Ne cachez pas dans un bloc imbriqué des champs dans lesquels vous voudrez chercher : faites-en de vraies colonnes.

## Charger les données

Choisissez la voie la plus légère :

- Partir d’une table vide à la structure définie, puis la remplir ensuite.
- Construire la table directement à partir d’un fichier de données existant et laisser le système en déduire la structure, puis vérifier que les dates et les champs oui/non sont bien arrivés avec le bon type.
- Charger un fichier de données dans une table qui existe déjà, soit en ajoutant à ce qui s’y trouve, soit en le remplaçant en bloc.
- Quand les données entrantes ne s’alignent pas proprement (jointure, découpage ou colonnes calculées nécessaires), les remodeler d’abord, puis charger le résultat propre.

S’il n’y a pas de véritables données à charger pour l’instant, remplissez la table de quelques lignes factices qui correspondent aux types des colonnes, afin que la structure soit visible et manifestement correcte plutôt que de rester vide. Précisez qu’il s’agit de données fictives que l’utilisateur peut supprimer.

## Interrogation et modifications en bloc

Vous pouvez filtrer, trier et parcourir les lignes page par page avec les comparaisons habituelles (égal à, plus grand ou plus petit que, « fait partie de », contient, et combinaisons et/ou), et envoyer les résultats directement dans un fichier quand quelqu’un a besoin d’une exportation. Pour les changements en masse, vous pouvez modifier ou supprimer tout ce qui répond à une condition, ou appliquer des valeurs différentes à de nombreuses lignes précises à la fois. Lors d’une exportation, laissez le format découler du nom du fichier plutôt que de le construire à la main.

## Automatiser ligne par ligne

Vous pouvez rattacher un workflow existant à une table pour qu’il s’exécute une fois pour chaque ligne, les résultats choisis atterrissant dans leurs propres colonnes. Certaines colonnes servent de préalables : une ligne ne s’exécute que lorsque celles-ci sont remplies. Quelques points à bien régler :

- Confirmez toujours quelles sorties réelles un workflow produit avant de les relier à des colonnes, plutôt que de deviner.
- Une automatisation nouvellement rattachée reste en pause par défaut : rien ne s’exécute avant que vous la démarriez, ce qui est voulu afin de ne pas consommer d’exécutions pendant que vous configurez encore. Lancez-la délibérément, ou ne la démarrez automatiquement tout de suite que si l’utilisateur l’a explicitement demandé.
- Vous pouvez exécuter à la demande une seule cellule, une ligne entière ou une colonne entière.
- Quand une étape doit attendre une autre, faites-la dépendre de la colonne que l’étape précédente remplit, et non de l’étape elle-même.

## Erreurs faciles à éviter

- Charger des données avant que la structure existe quand vous remplissez la table par programmation.
- Laisser une table complètement vide quand il n’y a pas encore de données : remplissez-la plutôt de quelques lignes fictives.
- Laisser des doublons faire échouer toute une importation : signalez le conflit au lieu de réessayer à l’aveugle; passer à un remplacement complet règle les conflits avec les lignes existantes, mais pas les doublons à l’intérieur des nouvelles données elles-mêmes.
- Traiter les avertissements ordinaires d’avant-importation (une colonne obligatoire manquante ou non associée) comme des échecs : ils se règlent généralement vite.
- Dépasser la limite de lignes de la table en ajoutant à des données existantes.
- Se demander pourquoi « rien ne s’est exécuté » : l’automatisation rattachée est en pause volontairement jusqu’à ce que vous la démarriez.
- Relier des colonnes à des sorties que l’on a supposées exister au lieu de les confirmer.
- Agir sur des lignes par leur nom plutôt que de déterminer d’abord précisément la table et les lignes visées.
`

export const BUILTIN_SKILLS: readonly BuiltinSkill[] = [
  {
    id: 'builtin-connect-integration',
    name: 'connect-integration',
    description: 'Comment connecter un service et choisir le bon compte à utiliser.',
    content: CONNECT_INTEGRATION_CONTENT,
  },
  {
    id: 'builtin-research',
    name: 'research',
    description: 'Comment mener une recherche et rapporter quelque chose de vraiment utile.',
    content: RESEARCH_CONTENT,
  },
  {
    id: 'builtin-create-table',
    name: 'create-table',
    description:
      'Comment structurer des données pour qu’elles servent vraiment ensuite, et pas seulement s’accumuler.',
    content: CREATE_TABLE_CONTENT,
  },
  {
    id: 'builtin-deploy-workflow',
    name: 'deploy-workflow',
    description: 'Comment publier un workflow terminé pour qu’il soit utilisable de l’extérieur.',
    content: DEPLOY_WORKFLOW_CONTENT,
  },
] as const

const BUILTIN_BY_ID = new Map<string, BuiltinSkill>(BUILTIN_SKILLS.map((s) => [s.id, s]))
const BUILTIN_BY_NAME = new Map<string, BuiltinSkill>(
  BUILTIN_SKILLS.map((s) => [s.name.toLowerCase(), s])
)

export function isBuiltinSkillId(id: string): boolean {
  return BUILTIN_BY_ID.has(id)
}

export function getBuiltinSkillById(id: string): BuiltinSkill | undefined {
  return BUILTIN_BY_ID.get(id)
}

export function getBuiltinSkillByName(name: string): BuiltinSkill | undefined {
  return BUILTIN_BY_NAME.get(name.toLowerCase())
}
