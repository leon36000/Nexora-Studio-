/**
 * Descriptions françaises des compétences proposées par chaque intégration (page d’une intégration), par clé
 * `skillDescriptionKey(nom, description anglaise)`. La couverture est vérifiée par `skill-descriptions.test.ts`.
 */
export const SKILL_DESCRIPTIONS_FR: Readonly<Record<string, string>> = {
  '0026a6b5':
    'Créer une branche, valider (commit) une modification de fichier et ouvrir une demande de tirage GitHub pour révision.',
  '002ad622':
    'Lister les membres et les rôles d’un Google Group pour une revue des accès ou pour la conformité.',
  '0064f929':
    'Utiliser un extracteur Apify pour relever les prix de concurrents ou de produits selon un calendrier, suivre l’historique et alerter en cas de changement. Utiliser pour la surveillance des prix et des stocks.',
  '008550e1':
    'Générer un vecteur d’incorporation OpenAI pour un texte, à utiliser dans une recherche sémantique ou une comparaison de similarité.',
  '00cf8dca':
    'Lister les projets, les collections et les connexions de données Hex afin de cartographier les actifs d’analytique.',
  '00e7bf02':
    'Décrire un workflow Temporal en échec et récupérer son événement de fermeture pour expliquer la cause de l’échec.',
  '0125fe23':
    'Examiner l’historique des actualisations pour repérer les demandes échouées et résumer leurs tentatives et leurs erreurs.',
  '01616f24':
    'Copier un modèle Google Slides et remplacer le texte et les images d’espace réservé par des données pour produire une présentation finale.',
  '01a404a8':
    'Extraire les événements récents d’une pile CloudFormation pour diagnostiquer un échec de création, de mise à jour ou de retour arrière et expliquer la cause première.',
  '01a9ed14':
    'Créer ou mettre à jour une organisation Zendesk et ses utilisateurs associés pour assurer la propreté des comptes.',
  '02094379':
    'Interroger une métrique de série temporelle Datadog sur une période et rapporter la tendance, les anomalies et la valeur actuelle.',
  '02a49516':
    'Rechercher un client Stripe et fouiller ses frais et ses paiements pour produire un sommaire financier.',
  '02eaa75b':
    'Parcourir page par page une liste de transactions ou une vue enregistrée d’Affinity, avec les colonnes dont un rapport a besoin. Utiliser pour reproduire l’entonnoir de vente dans un tableau avant l’analyse.',
  '02ff7b94':
    'Extraire les mesures de trafic Similarweb de plusieurs domaines et les classer pour obtenir une vue concurrentielle.',
  '03205cc8':
    'Envoyer un courriel transactionnel par un domaine d’envoi Mailgun à un ou plusieurs destinataires.',
  '03205e30':
    'Trouver les incidents ServiceNow correspondant à un état, à une priorité ou à une affectation et les résumer.',
  '034f1924':
    'Interroger une table AppSheet avec une expression Selector pour filtrer, trier ou limiter les lignes.',
  '03649993':
    'Créer une version Sentry pour un numéro de version et marquer un déploiement vers un environnement pour le suivi des régressions.',
  '037f07ac':
    'Utiliser l’extraction Parallel AI pour tirer des faits structurés d’une liste d’URL sources.',
  '037f87e0':
    'Créer un nouveau formulaire ou questionnaire Typeform avec ses champs et ses paramètres.',
  '03a1a94a':
    'Répliquer les lignes AppSheet mises à jour dans un Google Sheet afin de tenir une piste de vérification en temps réel.',
  '03a8a424':
    'Ajouter des éléments à une liste Upstash Redis et en relire une plage pour une file simple.',
  '03c4e430':
    'Récupérer seulement les personnes nouvellement correspondantes d’une recherche enregistrée suivie, puis les marquer comme prises en compte.',
  '049cd0dc':
    'Créer un nouveau compte utilisateur Azure AD (Entra ID) et l’ajouter aux bons groupes. À utiliser lors de l’accueil d’un employé ou d’un contractuel.',
  '04c18f05':
    'Mettre à jour le statut d’un incident PagerDuty et ajouter une note de résolution qui documente ce qui a été fait.',
  '050e7916':
    'Créer ou mettre à jour un élément DynamoDB en définissant ses attributs à partir des valeurs fournies.',
  '05125854':
    'Récupérer les mentions récentes d’un utilisateur sur X et résumer ce qui nécessite une réponse.',
  '05994961':
    'Diagnostiquer les compilations LaTeX échouées à partir de la sortie d’erreurs du compilateur et itérer jusqu’à ce que le document compile. À utiliser lorsqu’une compilation retourne des erreurs au lieu d’un PDF.',
  '05a3fc2b':
    'Utiliser AWS STS assume role with web identity pour échanger un jeton OIDC/OAuth 2.0 (p. ex. provenant de GitHub Actions, d’EKS IRSA ou d’une fédération Google/Facebook) contre des identifiants AWS de courte durée, sans aucune clé IAM statique.',
  '05f97680':
    'Exécuter une requête CloudWatch Logs Insights pour trouver et résumer les pics d’erreurs dans un groupe de journaux sur une fenêtre de temps.',
  '061fa725':
    'Trouver les tests Vanta en échec, récupérer leurs entités en échec et produire une liste de correctifs priorisée.',
  '065afe83':
    'Exécuter du Python, du JavaScript ou du TypeScript dans un bac à sable Daytona isolé et retourner la sortie. À utiliser comme interpréteur de code sécurisé pour le calcul, l’analyse syntaxique ou la préparation de données.',
  '06a5336b':
    'Vérifier et lever le statut de suppression Loops d’un contact afin de préserver la délivrabilité et le respect des désabonnements.',
  '06d5fe6d':
    'Obtenir un rapport de visibilité Profound pour voir comment une marque apparaît dans les réponses d’IA aux requêtes suivies.',
  '06d99d98':
    'Utiliser You.com Research pour examiner une question complexe et produire un rapport avec citations.',
  '077b6977': 'Créer et soumettre une note de frais avec ses lignes de dépenses.',
  '078036e0':
    'Démarrer l’exécution d’un workflow Temporal avec les bonnes données d’entrée et indiquer les ID du workflow et de l’exécution.',
  '07b36efd':
    'Lister les commentaires WordPress récents et les approuver, les mettre en attente, les marquer comme pourriel ou les mettre à la corbeille selon une politique.',
  '082f96d3':
    'Mener une enquête en plusieurs étapes avec le mode agent de Databricks Genie et résumer son rapport.',
  '08b7979f':
    'Démarrer une exécution CodePipeline, au besoin avec des remplacements de variables, et rapporter l’identifiant de l’exécution.',
  '08c97041':
    'Exécuter selon un calendrier une requête Athena enregistrée ou composée pour calculer des indicateurs et produire un rapport. Utiliser pour les rapports récurrents d’indicateurs clés et d’utilisation.',
  '0910527f':
    'Repérer les prospects Smartlead qui ont répondu, classer leur intention et définir la catégorie de prospect correspondante.',
  '091b04ef':
    'Comparer la répartition réelle des actifs d’un commanditaire (LP) à ses cibles pour repérer où il est sous-alloué. Utiliser pour choisir le bon moment d’une approche de levée de fonds.',
  '09894347':
    'Générer un vecteur d’embedding pour un texte afin de l’utiliser dans une recherche sémantique ou une mesure de similarité.',
  '098d332b':
    'Lire la configuration d’un index Algolia, proposer des changements au classement et aux attributs de recherche, puis appliquer la mise à jour.',
  '09918490':
    'Étiqueter, assigner et annoter une nouvelle conversation Help Scout selon son contenu.',
  '09fda8ae':
    'Créer un incident PagerDuty sur un service, avec un titre, une urgence et une description, afin que les intervenants soient appelés.',
  '0a1e9f9a':
    'Diagnostiquer pourquoi des données manquent dans une table Azure Data Explorer et indiquer si une nouvelle tentative aura lieu.',
  '0a3aa5b7':
    'Constituer une liste de lectures de recherche à partir des publications et des commentaires Reddit enregistrés.',
  '0a667c71':
    'Transformer un long article ou un billet de blogue en narration audio de type balado.',
  '0b0b82f6':
    'Examiner avec qui un document Coda est partagé et signaler les liens publics ou les accès extérieurs au domaine de l’entreprise.',
  '0c0ce5c3': 'Suivre le travail connexe au sein d’un module Plane.',
  '0c1bfe3e':
    'Mettre en service un numéro de téléphone et traiter les SMS entrants en lisant le message et en envoyant une réponse appropriée.',
  '0c50f2b8': 'Exécuter une requête Snowflake paramétrée et encadrée, et en résumer le résultat.',
  '0c6cb00a':
    'Demander à un contact WhatsApp de choisir parmi des boutons de réponse ou une liste de sélection, puis agir selon sa réponse.',
  '0c91d3ea':
    'Créer un nouveau contact Google Contacts avec son nom, son courriel, son téléphone et les renseignements sur son organisation.',
  '0cba37f1':
    'Créer, mettre à jour, rechercher et désactiver des identités d’utilisateur SAP Concur par l’API SCIM Identity.',
  '0cd2804e':
    'Interroger les alertes CrowdStrike, en récupérer les détails et résumer la gravité, la tactique et l’hôte touché pour le triage du SOC.',
  '0ced66d3':
    'Lire un billet Linear, appliquer les étiquettes de type et de priorité, définir le responsable et l’état, et commenter avec un résumé du triage.',
  '0d008f89':
    'Déclencher un flux de travail à l’arrivée d’un message Telegram et agir selon son contenu.',
  '0d10116c':
    'Envoyer un courriel SES basé sur un modèle à de nombreux destinataires, avec personnalisation par destinataire. À utiliser pour les infolettres, les séquences d’accueil et les notifications en lot.',
  '0d433965':
    'Télécharger la transcription JSON structurée de la conférence sur les résultats d’une entreprise pour une analyse en aval.',
  '0dca7cb6':
    'Récupérer les enregistrements infonuagiques d’une réunion Zoom passée et retourner les liens de téléchargement.',
  '0e1fe231':
    'Trouver un employé dans Workday et retourner son profil de base et les détails de son emploi.',
  '0eef3551': 'Inspecter les cartes physiques et virtuelles attribuées à un employé.',
  '0f2a4d2a':
    'Créer un billet Linear dans la bonne équipe avec un titre clair, une description, une priorité et des étiquettes.',
  '0fa729d4':
    'Inspecter une base de données ClickHouse et produire une documentation lisible de ses tables, de ses colonnes et de ses moteurs. Utiliser pour prendre en main une instance ClickHouse inconnue ou rafraîchir la documentation du schéma.',
  '0fb52cba':
    'Exécuter des requêtes d’agrégation sur ClickHouse et résumer les principaux indicateurs et tendances. Utiliser pour un sommaire périodique des indicateurs ou le rafraîchissement d’un tableau de bord.',
  '0fba093e':
    'Récupérer le contexte mémoire assemblé pour un fil Zep afin d’ancrer la prochaine réponse de l’agent.',
  '1010a04a':
    'Détecter les campagnes dont les taux de réponse ou d’intérêt sont faibles et les mettre en pause pour protéger la réputation de l’expéditeur.',
  '101890a1':
    'Comparer l’historique des actualisations terminées à une échéance de fraîcheur avant de diffuser un rapport d’indicateurs clés.',
  '10209688':
    'Interroger l’état d’un brouillon de boîte de réception TikTok jusqu’à ce qu’il soit terminé ou en échec.',
  '107239a3': 'Rechercher un client dans RevenueCat et rapporter ses droits d’accès actifs.',
  '10923079':
    'Créer ou mettre à jour un profil d’utilisateur LogRocket avec nom, courriel et caractéristiques personnalisées afin de pouvoir segmenter les sessions.',
  '10aa31e9': 'Annuler une enveloppe qui ne doit plus être signée et consigner le motif.',
  '10c4c533':
    'Traduire une question en langage clair en requête SELECT MySQL et retourner les lignes.',
  '110ebdcd':
    'Démarrer un clavardage Linq et envoyer un message iMessage, SMS ou RCS personnalisé à un destinataire.',
  '115c2091':
    'Lister tous les projets Railway avec leurs services et leurs environnements à des fins de suivi.',
  '1196584b':
    'Envoyer une notification RCS ou SMS à un ou plusieurs destinataires à partir d’une liste d’alertes.',
  '11ac735e':
    'Mettre en place une règle d’alerte Grafana et le point de contact qu’elle avise pour un nouveau service.',
  '11ad4414':
    'Passer en revue qui peut utiliser le compte Fivetran et quelles identités détiennent des clés d’API. À utiliser pour les revues périodiques des accès de sécurité.',
  '11d88e79':
    'Vider tous les messages d’une file Amazon SQS hors production afin qu’un test démarre d’un état vide connu.',
  '11ebd026':
    'Trouver les principaux motifs d’erreur dans Logfire pour un service et une période, puis les expliquer.',
  '11ed5a98':
    'Créer un fil Discord pour un sujet et publier un message d’ouverture afin d’organiser la discussion de la communauté.',
  '11f95dc6':
    'Exécuter une requête, une mutation ou une action Convex avec des arguments nommés et utiliser son résultat.',
  '11fcf35b':
    'Créer une demande de vérification Persona pour un client et lui envoyer un lien de vérification à usage unique.',
  '1200a571':
    'Chercher dans les solutions de ServiceDesk Plus une réponse à une demande entrante et y répondre par une note visible du demandeur.',
  '1220c50b':
    'Résumer la performance d’une campagne Email Bison : envois, ouvertures, réponses et taux de réponses positives.',
  '124bc37d':
    'Utiliser AWS STS get caller identity pour confirmer à quel compte, utilisateur ou rôle correspondent les identifiants actuels. À utiliser pour valider la configuration et déboguer des problèmes d’authentification.',
  '12a1de24':
    'Insérer une nouvelle ligne dans une table Amazon RDS à partir de valeurs de champs fournies, par la Data API.',
  '12d0122d':
    'Évaluer un projet Linear et publier une mise à jour du projet avec un état de santé et un résumé de l’avancement.',
  '12e126c7':
    'Noter les contacts Harmonic Scout selon des critères de repérage explicites et produire une liste restreinte prête à être révisée.',
  '130aeaac': 'Récupérer une seule URL et produire un résumé concis avec les points clés.',
  '1355f1b1':
    'Récupérer les statistiques de métriques CloudWatch d’une ressource et indiquer si les métriques clés se situent dans des plages saines.',
  '13caab3b':
    'Auditer les applications Cloudflare Access et leurs politiques pour trouver les applications non protégées, les règles trop larges et les décisions de contournement.',
  '13ccf127': 'Examiner l’état des factures et des paiements dans Oracle Fusion.',
  '140c80e6':
    'Rechercher dans Dropbox des fichiers par requête, par extension ou par dossier, et retourner les chemins correspondants.',
  '141a4bbe':
    'Envoyer un courriel transactionnel par SendGrid, avec au besoin un modèle dynamique et des variables.',
  '142118e1':
    'Ajouter, retirer, consulter et lister des adresses de la liste de suppression au niveau du compte AWS SES. À utiliser pour garder les adresses en rebond ou ayant fait l’objet d’une plainte hors des envois futurs.',
  '145cb132': 'Convertir un document Word en PDF pour le partager ou l’archiver.',
  '146af20d':
    'Lire seulement ce qui a changé dans Affinity depuis la dernière exécution et l’appliquer à un miroir. Utiliser pour garder un entrepôt de données ou un tableau synchronisé.',
  '147512bd':
    'Exécuter une requête de moteur de recherche avec l’API SERP de Bright Data et retourner les résultats classés. Utiliser pour la recherche de mots-clés, la veille concurrentielle ou pour fonder une réponse sur des résultats récents.',
  '14dcb5cc':
    'Créer une page Notion sous une page parente, avec des titres, des puces et une mise en page propre.',
  '14fadecb':
    'Lister les rapports de dépenses SAP Concur soumis, inspecter les lignes de dépense et signaler les exceptions à la politique.',
  '15258f29':
    'Lister les applications, les environnements et les profils de configuration AWS AppConfig pour dresser un inventaire unique des configurations qui existent dans le compte.',
  '15db928a':
    'Obtenir un rapport de citations Profound pour voir quelles sources les moteurs d’IA citent pour les requêtes liées à la marque.',
  '15fc52c2':
    'Suivre les tâches asynchrones NetSuite jusqu’à leur achèvement et récupérer les résultats des tâches.',
  '1643c71a':
    'Ouvrir un incident ServiceNow avec la bonne catégorie, la bonne priorité et la bonne description.',
  '16bdaff8':
    'Rechercher des lieux correspondant à une requête près d’un emplacement et retourner des résultats classés.',
  '16f53ccc':
    'Télécharger la plus récente présentation aux investisseurs d’une entreprise depuis Quartr et en extraire les principaux constats.',
  '1726c6df':
    'Lancer une recherche Perplexity restreinte à des domaines faisant autorité et résumer les constats.',
  '1744f53d': 'Copier un objet S3 vers un emplacement d’archivage et supprimer l’original.',
  '17963fe3':
    'Créer un ensemble de compartiments d’étapes ou de phases dans un plan Planner pour organiser les tâches par colonne du flux de travail.',
  '17cbfdf7':
    'Trouver les approbations ServiceNow en attente et consigner une décision d’approbation ou de rejet.',
  '18545726':
    'Lister les appels Gong récents sur une plage de dates et produire un condensé des thèmes et des suivis qui s’en dégagent.',
  '1856e3de':
    'Chercher une marque par son nom pour trouver son domaine et son logo lorsqu’on ne connaît que le nom de l’entreprise. Utiliser pour lever une ambiguïté ou déterminer un domaine avant un enrichissement plus poussé.',
  '187650ab': 'Ajouter ou mettre à jour un document dans un index Elasticsearch.',
  '18c444b0':
    'Créer, inspecter et émettre des avances de fonds SAP Concur, y compris celles rattachées à une demande de voyage.',
  '18da40df':
    'Utiliser les données de requêtes et de réponses de Profound pour trouver les requêtes où la marque est absente des réponses d’IA.',
  '18dbee9c':
    'Créer une fenêtre de maintenance Dynatrace sous forme d’objet de paramètres afin qu’un déploiement ne déclenche pas de problèmes.',
  '1915fc69':
    'Lister ou interroger des enregistrements Dataverse avec des filtres et retourner les lignes correspondantes.',
  '195d6e3c':
    'Examiner le schéma BigQuery, traduire une question en langage naturel en SQL sûr, l’exécuter et retourner les résultats.',
  '19d2cdaf':
    'Créer ou mettre à jour un enregistrement dans une table Dataverse à partir de sa clé, sans créer de doublon.',
  '19e84d3a':
    'Créer, finaliser et envoyer une facture Stripe à un client, puis suivre le paiement.',
  '1a1a1177':
    'Parcourir les notes Granola pour repérer les décisions prises et les compiler dans un registre des décisions daté.',
  '1a5666f9':
    'Compiler un rapport ou un article qui cite des sources, en joignant une bibliographie BibTeX comme ressource. À utiliser pour les rapports de recherche, les revues de littérature et la rédaction universitaire.',
  '1a7c9c4d':
    'Lire une demande ServiceDesk Plus entrante, la classer et définir sa catégorie, sa priorité et son groupe de soutien.',
  '1ad53463':
    'Déplacer un courriel Outlook dans le dossier approprié pour garder la boîte de réception en ordre.',
  '1b044e53':
    'Trouver l’étape et l’action en échec d’une exécution CodePipeline et rapporter les détails de l’erreur.',
  '1b46bd06':
    'Calculer les taux d’ouverture, de clic, de réponse et de rebond par campagne et par étape à partir des activités Lemlist, et signaler les étapes faibles.',
  '1b645df6':
    'Utiliser You.com Get Contents pour extraire du Markdown ou du HTML propre à partir d’un ensemble d’URL.',
  '1bd78f00':
    'Récupérer les cotes d’avant-match d’une rencontre et calculer les probabilités implicites.',
  '1c356249':
    'Faire passer une facture ou un reçu dans AWS Textract Analyze Expense et retourner des champs structurés propres (fournisseur, date, totaux, lignes). À utiliser pour numériser des documents financiers.',
  '1c62d235':
    'Rechercher les données firmographiques d’une entreprise : taille, secteur, financement, revenus et trafic.',
  '1c7ab9fe':
    'Transformer l’historique des commits Bitbucket en notes de version adaptées au public visé, sans inventer de changements.',
  '1c7ea464':
    'Téléverser un fichier vers un chemin Dropbox précis et, au besoin, générer un lien de partage.',
  '1c98884c':
    'Récupérer les commentaires d’une vidéo YouTube et résumer le sentiment, les questions et les commentaires récurrents.',
  '1d41389c':
    'Poser une question sur les données à un espace Databricks Genie et rapporter la réponse, les lignes de résultat et le SQL généré.',
  '1db4882b': 'Lancer une recherche Exa pour trouver des sources Web de qualité sur un sujet.',
  '1dcad42d': 'Analyser un schéma MySQL et générer un dictionnaire de données en langage clair.',
  '1e7adaf9':
    'Chercher dans Apollo les personnes qui correspondent à un profil de client idéal et produire une liste de prospects ciblée. Utiliser pour la prospection sortante et la constitution de territoires.',
  '1ef01109':
    'Lister les fonctions Lambda avec leur environnement d’exécution, leur mémoire, leur délai d’expiration et leur architecture afin de dresser l’inventaire des ressources de calcul déployées.',
  '1f15141d':
    'Rechercher des mots-clés dans Ahrefs pour un sujet et rapporter le volume, la difficulté et les occasions de positionnement.',
  '1f7a31ca':
    'Exporter les conversations de l’assistant Mintlify et faire ressortir les questions auxquelles la documentation n’a pas su répondre.',
  '1f91e0f9':
    'Trouver les invitations Checkr expirées et les réémettre pour que les candidats ne se désistent pas. Utiliser pour le nettoyage des opérations de recrutement.',
  '1ff51cdb':
    'Créer un ensemble de modifications CloudFormation pour prévisualiser ce qu’une mise à jour de pile ferait avant de l’appliquer.',
  '20640a0e':
    'Rechercher un service sur Downdetector et indiquer s’il subit actuellement une panne.',
  '20bd52b9':
    'Trouver les personnes ayant des tâches de sécurité en retard dans Vanta et présenter l’état récapitulatif de leurs tâches ainsi que la date d’échéance.',
  '212db067':
    'Récupérer l’enregistrement d’un appel Twilio Voice et sa transcription à partir du SID de l’enregistrement.',
  '214402a2':
    'Lister les événements du jour dans Google Calendar et produire un résumé d’agenda clair et ordonné.',
  '2168932f':
    'Bannir, débannir, verrouiller ou déverrouiller un utilisateur Clerk pour contrôler sa capacité à se connecter. Utiliser pour réagir à un abus, contenir une activité suspecte ou récupérer un compte manuellement.',
  '217e2a2f': 'Envoyer une notification par iMessage ou SMS à un seul destinataire avec Sendblue.',
  '218d51f9':
    'Lire un billet GitHub, le classer, lui appliquer des étiquettes et l’attribuer à la bonne personne.',
  '21abee95':
    'Téléverser ou récupérer le fichier principal d’un document Windchill et ses pièces jointes d’appui.',
  '21acfdb4':
    'Créer une campagne de courriels à froid, charger une liste de prospects et l’activer pour l’envoi.',
  '21e59327':
    'Passer en revue les noms, les versions et les éditeurs des logiciels découverts, ainsi que le nombre d’appareils touchés.',
  '2212b44a':
    'Lire le flux des entités supprimées de Crunchbase et retirer les lignes correspondantes d’une copie en miroir. Utiliser pour garder un miroir local synchronisé avec la source.',
  '22327871':
    'Créer un abonnement Stripe, gérer son annulation ou reprendre un abonnement suspendu.',
  '227e056e':
    'Écrire des données dans une plage, la convertir en tableau Excel mis en forme et mettre en évidence la ligne d’en-tête.',
  '22c533e8':
    'Utiliser un agent de navigateur pour parcourir un site et retourner des données selon un schéma JSON défini. Utiliser pour extraire des enregistrements structurés (prix, annonces, lignes de tableau) de pages sans API.',
  '22ea9889':
    'Réinitialiser l’inscription MFA d’un utilisateur verrouillé afin qu’il puisse inscrire de nouveau un facteur.',
  '22f6f338':
    'Utiliser un robot d’exploration Apify pour extraire le texte d’articles ou de documentation d’un site et le préparer en vue de son ingestion dans une base de connaissances ou un pipeline RAG.',
  '230c2703':
    'Rédiger une réponse à une conversation client, l’envoyer et fermer la conversation une fois le problème résolu.',
  '23257011':
    'Bâtir une liste de contacts pour une approche par comptes à partir d’une entreprise, selon le groupe de rôles et le statut d’emploi.',
  '234aecbc':
    'Trouver dans Box les fichiers et les dossiers qui correspondent à une requête et retourner leurs détails. Utiliser pour repérer des documents avant d’agir sur eux.',
  '23544aa2':
    'Obtenir un seul élément DynamoDB par sa clé primaire et retourner les attributs demandés.',
  '23621a7e':
    'Cartographier la structure des URL d’un site Web avec Tavily sans extraire le contenu complet des pages.',
  '2379261d':
    'Ouvrir un incident Rootly en y associant la gravité, le service et l’équipe appropriés.',
  '241dfd9f':
    'Récupérer la liste des invités Luma et préparer des rappels personnalisés pour les personnes inscrites à venir.',
  '241f5029':
    'Chercher dans le contenu de Confluence un sujet et résumer les pages les plus pertinentes, avec des liens pour une consultation rapide.',
  '2471a97b':
    'Demander les faits saillants des sessions LogRocket d’un utilisateur, attendre la fin de la tâche et rapporter ce qui s’est passé pendant ses sessions.',
  '25433597':
    'Créer dans le bon espace une page Confluence contenant des notes de rencontre structurées, avec les participants, les décisions et les actions à faire.',
  '254d70d5':
    'Utiliser DuckDuckGo pour recueillir des sujets connexes et des liens externes autour d’un thème à des fins de recherche.',
  '257bd5e7':
    'Lister les fichiers d’exportation de données LogRocket et recueillir leurs URL de téléchargement pour un traitement en aval.',
  '25a04756':
    'Inspecter les limites d’envoi, l’utilisation du quota et les identités vérifiées du compte AWS SES. À utiliser pour confirmer la capacité et la préparation à la délivrabilité avant un envoi.',
  '25a37efc':
    'Utiliser You.com Finance Research pour l’analyse des résultats et l’étalonnage concurrentiel, avec citations.',
  '25a5484f':
    'Lancer une recherche approfondie Parallel AI sur une entreprise et produire une note documentée avec sources, couvrant le financement, la direction et le produit.',
  '25ada0d8':
    'Rechercher dans ZoomInfo des contacts d’une entreprise cible selon le titre et l’ancienneté pour trouver les décideurs.',
  '25fddcf1':
    'Rechercher un sujet sur Google, réunir les meilleures sources et synthétiser une réponse citée.',
  '26152fc9':
    'Déclencher, prendre en charge ou résoudre une alerte PagerDuty à partir d’une source de surveillance, au moyen de la clé d’intégration de l’API Events v2, sans compte utilisateur PagerDuty.',
  '268a221e': 'Trouver les appareils gérés touchés par une version de logiciel examinée.',
  '272b40fb':
    'Trouver les documents Windchill actuels avec des filtres bornés, des champs sélectionnés et une pagination.',
  '27374925':
    'Télécharger le résumé PDF d’une demande de vérification Persona pour la tenue des dossiers de conformité.',
  '273f2a40':
    'Récupérer les positions ouvertes d’un portefeuille Polymarket et résumer leur valeur ainsi que les profits et pertes.',
  '27572033': 'Convertir un document PDF en Markdown structuré et propre grâce à Mistral OCR.',
  '275c0885':
    'Lister les sondages PostHog et en récupérer les réponses pour résumer les thèmes et la satisfaction.',
  '27a5384c': 'Envoyer un courriel individuel personnalisé à chaque destinataire d’un tableau.',
  '27f634f9':
    'Indexer, mettre à jour ou supprimer plusieurs documents Elasticsearch en une seule requête groupée (bulk).',
  '282f1aa6':
    'Passer en revue les alertes en déclenchement, les lier à des incidents et résoudre celles qui sont périmées.',
  '285535fa':
    'Lister les déploiements Railway récents, détecter les échecs et alerter avec un résumé.',
  '2895ecc4':
    'Créer une file Amazon SQS avec une file de lettres mortes, un délai de visibilité adapté au travail et des étiquettes de répartition des coûts.',
  '28e7ba5d':
    'Résoudre un ISBN ou un titre en une seule fiche de livre de référence avec toutes les métadonnées.',
  '291d903b':
    'Créer ou mettre à jour la fiche d’un département dans Rippling à la suite d’un changement d’organisation.',
  '2922aa80':
    'Ajouter une liste de vérification à une carte, la remplir d’éléments et cocher les éléments au fur et à mesure que le travail avance.',
  '295e29ed':
    'Confirmer l’organisation et le projet Logfire auxquels donne accès un jeton de lecture.',
  '29620cdd':
    'Accorder l’accès à un fichier Google Drive à des utilisateurs, à des groupes, à un domaine ou à toute personne disposant du lien.',
  '297eb01c':
    'Garder une session de Managed Agent active entre des exécutions distinctes de flux de travail afin que les tours de suivi conservent le contexte précédent. À utiliser pour les fils de clavardage, les conversations de billets et tout échange à plusieurs tours.',
  '2997af05':
    'Lire les messages récents d’un canal Microsoft Teams et produire un condensé concis des décisions et des actions à mener.',
  '29a1a892':
    'Analyser un PDF et en extraire des champs structurés précis, comme des totaux, des dates ou des noms.',
  '29aa4ff8':
    'Transformer un rapport de bogue en billet Jira bien structuré, avec étapes, gravité et étiquettes.',
  '29bbf85b':
    'Créer un segment Mailchimp à partir de conditions afin qu’une campagne puisse cibler une portion précise d’une audience.',
  '2a28ba93':
    'Calculer un itinéraire entre deux lieux avec la distance, la durée et les directions étape par étape.',
  '2a45bf46':
    'Lire la carte stratégique d’un concurrent et résumer ses partenariats, ses investissements et ses acquisitions. Utiliser pour la veille concurrentielle.',
  '2a894b07':
    'Agréger l’utilisation de jetons LLM et les dépenses par modèle à partir des spans GenAI de Logfire.',
  '2a958df7':
    'Récupérer les événements Mailgun filtrés par type pour voir ce qui a été livré, ouvert, cliqué ou échoué.',
  '2aa8c7ab':
    'Recueillir le profil d’un candidat et les dossiers de recrutement connexes pour préparer les intervieweurs.',
  '2ab35792':
    'Récupérer une transcription Fireflies et en tirer une liste claire d’actions à mener avec leurs responsables et leurs échéances.',
  '2ac90c49':
    'Décharger une table ou le résultat d’une requête vers des fichiers dans une zone de transit (stage) Snowflake.',
  '2acafc43': 'Repérer un fichier dans OneDrive par son nom et télécharger son contenu.',
  '2aed931f':
    'Compiler des mises à jour selon un horaire et les envoyer sous forme de courriel-synthèse récurrent.',
  '2af0e2af':
    'Extraire périodiquement une valeur d’une page Web avec Stagehand et signaler quand elle change.',
  '2af2c983':
    'Récupérer les renseignements de votre profil LinkedIn pour la personnalisation ou la journalisation en aval.',
  '2ba8f24f':
    'Envoyer une vidéo dans la boîte de réception TikTok de l’utilisateur pour une révision manuelle avant publication.',
  '2bc61c68':
    'Nettoyer les catégories et les étiquettes WordPress : renommer, modifier l’identifiant d’URL, changer le parent ou supprimer celles qui sont inutilisées.',
  '2bda64f2':
    'Insérer de nouvelles lignes ou mettre à jour les lignes existantes selon une clé, afin qu’une table reste sans doublons.',
  '2be07d86':
    'Envoyer un courriel transactionnel personnalisé et confirmer sa livraison avec Resend.',
  '2be1e659':
    'Récupérer par ID des vecteurs précis et leurs métadonnées dans un espace de noms Pinecone.',
  '2c231750':
    'Exécuter une vérification d’état légère par SSH et transformer la sortie en une ligne d’état lisible.',
  '2c3f8da6':
    'Resynchroniser des tables précises ou toute une connexion Fivetran après un problème de données. À utiliser lorsque des données de la destination sont manquantes ou erronées.',
  '2c413e1b':
    'Lister les dossiers Vault et leurs conservations pour produire un rapport sur l’état de préservation par dépositaire.',
  '2ca47914':
    'Déployer du nouveau code Lambda, publier une version immuable et basculer en toute sécurité le trafic de l’alias vers celle-ci.',
  '2cc5d701':
    'Récupérer les enregistrements récents de Grain et produire un condensé des points clés et des actions à faire pour chaque appel.',
  '2d2f4ccb':
    'Incrémenter de façon atomique un compteur Upstash Redis pour des limites de débit ou la mesure d’utilisation.',
  '2d5500e9':
    'Repérer un événement existant et en mettre à jour l’heure, les participants ou les détails.',
  '2d971ac3':
    'Utiliser l’opération Exa Agent pour des recherches en plusieurs étapes, la constitution de listes et l’enrichissement.',
  '2dc3773c':
    'Exécuter des rapports financiers, de bilan, de vieillissement, de ventes et de dépenses vérifiés, avec les filtres pris en charge.',
  '2e04e171':
    'Retirer l’attribution d’un ensemble d’autorisations à un utilisateur ou à un groupe dans Identity Center et confirmer la suppression. À utiliser pour mettre fin à un accès temporaire ou expiré.',
  '2e116f59':
    'Récupérer les tours de financement et l’historique de la table de capitalisation d’une entreprise, puis résumer l’évolution de ses conditions. Utiliser pour la vérification diligente et la préparation de transactions.',
  '2e2d01aa':
    'Trouver des enregistrements NetSuite en toute sécurité et récupérer les détails dont un flux de travail a besoin.',
  '2eaedf74':
    'Inventorier les bases de données et les branches PlanetScale avant de planifier la maintenance.',
  '2ef2cf0a':
    'Lister les cartes d’un tableau ou d’une liste, les classer et déplacer chacune vers la bonne liste.',
  '2f030aaf':
    'Lancer un rapport Persona de listes de surveillance, de médias défavorables ou de PEP sur une personne et faire ressortir les correspondances.',
  '2f185c11':
    'Transférer des données externes (formations, permis, actifs) vers des enregistrements d’objets personnalisés Rippling.',
  '2f9b0456':
    'Extraire d’un domaine l’aperçu de site Web et les mesures de trafic Similarweb et en résumer l’envergure.',
  '2fb0a405':
    'Téléverser une image ou un fichier dans la médiathèque WordPress pour l’utiliser dans un article.',
  '2fd29eed':
    'Lister les exécutions Trigger.dev récemment échouées, les regrouper par tâche et produire un condensé des échecs. À utiliser pour la surveillance de la santé des exécutions.',
  '2fda16e3':
    'Mettre à jour les attributs d’abonné RevenueCat pour alimenter le ciblage et les analyses.',
  '2fe6aa58':
    'Faire passer un billet à un nouveau statut du flux de travail et publier un commentaire d’avancement.',
  '300b4e7b':
    'Repérer les indicateurs de fonctionnalité temporaires ou inchangés depuis longtemps et les proposer pour suppression.',
  '3059e02d':
    'Rédiger et publier une publication dans votre fil LinkedIn avec une accroche, de la valeur et un appel à l’action clair.',
  '30662d6a': 'Lancer une recherche enregistrée Splunk existante et présenter ses résultats.',
  '3084e3b4':
    'Envoyer à PostHog un événement d’analyse de produit pour un utilisateur, avec des propriétés personnalisées.',
  '30a823f6':
    'Lister les commentaires d’une publication et masquer, supprimer ou commenter en réponse ceux qui nécessitent une modération.',
  '30d54b5b':
    'Lire une présentation Google Slides et extraire tout le texte des diapositives dans un plan structuré.',
  '3115a2f9':
    'Exécuter une requête SQL sur un entrepôt SQL Databricks et retourner les résultats sous une forme claire et résumée.',
  '3149fe88':
    'En tant que super administrateur Otter, parcourir page par page toutes les conversations de l’espace de travail et résumer l’activité.',
  '315a554a':
    'Extraire les suivis des incidents récents dans une liste exploitable pour la revue post-incident.',
  '31c5acb3': 'Vérifier si un numéro prend en charge iMessage avant l’envoi avec Sendblue.',
  '31d0cb5b':
    'Trier les éléments de travail entrants et leur attribuer des états, des étiquettes et des responsables.',
  '32fefaab':
    'Examiner une demande de tirage Bitbucket fichier par fichier et produire un commentaire général concis, appuyé par des preuves.',
  '3325fffa':
    'Enrichir un profil LinkedIn avec un courriel professionnel et un numéro de téléphone pour la prospection.',
  '33b53155':
    'Rapprocher une période de relevé de carte Brex avec les transactions réglées correspondantes.',
  '34090a49':
    'Récupérer les classements du championnat des pilotes et des constructeurs pour une saison de sport automobile.',
  '34242c19':
    'Enregistrer dans Mem0 les nouveaux faits et les préférences d’un utilisateur à partir de la dernière conversation.',
  '34fab77e':
    'Ouvrir un incident incident.io à partir d’une alerte entrante avec la bonne gravité et le bon résumé.',
  '353c5ad4':
    'Parcourir un canal à la recherche de messages urgents ou à risque et les faire remonter au bon responsable.',
  '3592dcf4':
    'Transformer une question en langage naturel en requête SELECT PostgreSQL et retourner les lignes.',
  '359faaf9':
    'Extraire les statistiques de clics, de prospects et de ventes de Dub pour un lien ou une campagne sur une période donnée.',
  '35b4d43e':
    'Récupérer la liste des invités d’un événement Luma, au besoin filtrée par statut d’approbation, pour le suivi ou l’enrichissement.',
  '35c4a964':
    'Rassembler un portrait complet d’une entreprise dans PitchBook et rédiger une note de vérification diligente. À utiliser avant un investissement, un partenariat ou une analyse de la concurrence.',
  '35ff559b':
    'Démarrer une tâche d’agent Flint à partir d’une consigne et la suivre jusqu’à son achèvement.',
  '3655bf0b':
    'Passer un appel sortant Twilio Voice qui énonce un message ou joue un son au moyen de TwiML.',
  '3659e579':
    'Créer une demande client dans le bon centre de services avec le bon type de demande.',
  '36862421':
    'Créer un espace Google Meet et retourner son lien de participation et son code de réunion.',
  '3687a9ea':
    'Faire avancer un élément Monday en mettant à jour sa colonne de statut et son groupe.',
  '36a3669c':
    'Indiquer quels nœuds gérés sont enregistrés auprès de Systems Manager, leur version d’agent et s’ils sont joignables. À utiliser pour l’hygiène du parc et les vérifications d’intégration.',
  '36bf4be0':
    'Indiquer où en est la vérification des antécédents Checkr d’un candidat, y compris l’état de l’invitation et la date d’achèvement estimée du rapport. Utiliser lorsqu’un candidat ou un recruteur demande une mise à jour.',
  '37952585':
    'Créer un dossier (matter) Vault et placer une conservation légale sur les dépositaires pour une enquête ou un litige.',
  '37f6462d':
    'Créer une session Devin avec une consigne d’ingénierie claire et rapporter l’identifiant et le lien de la session.',
  '380d013e':
    'Exécuter l’étape de préavis de mesure défavorable sur un rapport à examiner (consider) en citant ses éléments défavorables. Utiliser seulement après qu’une personne a examiné le rapport et décidé d’aller de l’avant.',
  '3892d44f': 'Ajouter une nouvelle entrée datée à la fin d’un document Word existant.',
  '389aa698': 'Créer une facture Square pour une commande et la publier auprès du client.',
  '38a5a365':
    'Lister les tâches Google Tasks ouvertes qui arrivent bientôt à échéance ou qui sont en retard dans une liste de tâches, pour une revue quotidienne.',
  '39195d93':
    'Insérer de nouvelles lignes ou mettre à jour les lignes existantes selon une clé, afin qu’une table reste sans doublons.',
  '39cc5d23':
    'Rechercher dans Parallel AI les annonces récentes de concurrents nommés et résumer les changements.',
  '3a4e0b74':
    'Compiler les notes de version à partir des éléments de travail terminés entre deux builds Azure DevOps. Utiliser au moment d’une mise en production pour résumer ce qui a été livré.',
  '3a8a5a06':
    'Récupérer les soumissions d’un formulaire Jotform et présenter les réponses par libellé de question plutôt que par ID de question.',
  '3a9562bc':
    'Lister les éléments d’un coffre 1Password et produire un rapport sur leurs métadonnées, comme les titres, les catégories et les dates de dernière mise à jour.',
  '3ab66128':
    'Exécuter dans Qdrant une recherche de similarité vectorielle, avec des filtres de charge utile facultatifs.',
  '3be8b497':
    'Extraire les réponses récentes d’Email Bison, classer chacune selon son intention et étiqueter le prospect en conséquence.',
  '3bf3b4d1':
    'Générer une icône SVG épurée à partir d’une description textuelle et l’enregistrer dans le stockage de fichiers.',
  '3c0ddcc1':
    'Lister les fils et les messages d’un utilisateur dans Zep pour inspecter ce que l’agent retient à son sujet.',
  '3c5e6bf6':
    'Créer une nouvelle version de configuration hébergée AWS AppConfig à partir d’un document et la déployer dans un environnement selon une stratégie de déploiement choisie.',
  '3cda5b21':
    'Trouver l’adresse courriel la plus probable d’une personne nommée au sein d’une entreprise précise.',
  '3cf63385':
    'Déclencher l’exécution d’un rapport Rippling et récupérer les résultats une fois celui-ci terminé.',
  '3d6b65ed':
    'Rechercher dans Google Contacts par nom, courriel, téléphone ou organisation et retourner les correspondances.',
  '3d861ee4':
    'Charger plusieurs lignes dans un formulaire Jotform comme soumissions en un seul appel, après avoir associé les colonnes aux ID de questions.',
  '3d88ceb2':
    'Créer, mettre à jour ou basculer un indicateur de fonctionnalité PostHog et en contrôler le déploiement progressif.',
  '3dfa0413':
    'Construire ou rafraîchir une table de synthèse dans Azure Data Explorer à partir d’une requête sur des données brutes.',
  '3e604081':
    'Créer des dossiers et déplacer ou copier des fichiers dans Google Drive pour garder le stockage organisé.',
  '3e994062': 'Lister les séances de sport automobile à une date donnée à partir de Sportmonks.',
  '3ea6a004':
    'Trouver les documents Windchill laissés extraits et libérer les verrous par lots bornés.',
  '3ed9883c':
    'Créer ou mettre à jour des contacts et des comptes Apollo à partir d’un prospect entrant, puis les associer à votre CRM. Utiliser pour acheminer les nouvelles inscriptions vers l’entonnoir de vente.',
  '3f06ff78': 'Vider une file RabbitMQ après avoir confirmé ce qui serait perdu.',
  '3f54960f':
    'Lister, avec pagination, les publications planifiées, en brouillon, envoyées ou en échec sur l’ensemble des canaux. Utiliser pour examiner ce qui s’en vient ou ce qui est déjà paru.',
  '3f63dd90':
    'Évaluer les approbations, les statuts de commit et le risque lié aux fichiers modifiés avant une fusion Bitbucket.',
  '3f81d7da':
    'Exécuter un rapport Salesforce et en résumer les résultats pour une partie prenante.',
  '4013920a':
    'Trouver les adresses courriel vérifiées des rôles clés d’une entreprise cible par recherche de domaine.',
  '4017903b':
    'Créer, mettre à jour, chercher et supprimer des indicateurs de compromission personnalisés CrowdStrike.',
  '40482ff3':
    'Lister les incidents PagerDuty déclenchés et pris en charge, et produire un sommaire de triage priorisé.',
  '40a1f017':
    'Utiliser le résultat de l’OCR de Pulse pour extraire d’un document des champs structurés, comme le fournisseur, les totaux ou les dates.',
  '40e3a927':
    'Créer une demande d’achat dans SAP S4HANA par OData à partir des détails de lignes fournis.',
  '4110587a': 'Rechercher un client Square et résumer ses commandes et ses paiements.',
  '411fa391':
    'Consulter qui est actuellement de garde selon les horaires et les politiques d’escalade Rootly.',
  '412b6572':
    'Publier dans Discord un message de type sondage, y ajouter des réactions comme choix et relire le décompte à titre de rétroaction.',
  '413cb03b':
    'Insérer de nouvelles lignes ou mettre à jour les lignes existantes dans MySQL en fonction d’une correspondance de clé.',
  '414a7959':
    'Utiliser Stagehand pour extraire des champs structurés d’une page Web vers un résultat typé.',
  '417cadba':
    'Prolonger le délai de visibilité d’un message Amazon SQS en cours de traitement afin qu’un travail de longue durée se termine avant que le message soit livré de nouveau.',
  '41998331':
    'Inspecter l’état du certificat SSL et les paramètres de sécurité des zones Cloudflare et signaler les écarts par rapport à une base de référence souhaitée.',
  '41c129b4':
    'Ajouter une nouvelle feuille de calcul à un classeur Microsoft Excel pour accueillir un nouveau jeu de données ou un nouveau rapport.',
  '41c5fb0a':
    'Vérifier le statut de l’exécution d’un job Databricks, extraire sa sortie et diagnostiquer les échecs.',
  '41dc1482':
    'Lire une URL et retourner un texte propre, prêt pour un LLM, sans navigation ni publicités.',
  '42052968':
    'Lancer une agrégation de source SailPoint et suivre l’état de sa tâche jusqu’à la fin.',
  '424b92fc': 'Écrire ou mettre à jour des valeurs dans une plage précise d’un Google Sheet.',
  '4277ece1':
    'Utiliser l’opération places de Serper pour trouver des commerces locaux selon une requête et un secteur, puis les classer.',
  '4286076c':
    'Exécuter une requête SQL ponctuelle sur Tinybird avec l’API Query et retourner les résultats.',
  '42be7ca7':
    'Chercher dans les souvenirs Mem0 d’un utilisateur les faits pertinents pour la demande en cours avant de répondre.',
  '42fc3e66':
    'Consolider les entrées de temps, les affectations et les congés Rocketlane en un portrait du taux d’utilisation par personne ou par projet. À utiliser pour la planification de la capacité et les revues hebdomadaires du taux d’utilisation.',
  '431c0c44':
    'Charger dans une table les fichiers déjà présents dans une zone de transit (stage) Snowflake.',
  '432ad5d6':
    'Récupérer une version antérieure d’un fichier Dropbox après un écrasement ou une modification non voulus.',
  '43559cbf':
    'Exécuter un pipeline d’agrégation MongoDB pour regrouper et résumer les données d’une collection.',
  '439a018f':
    'Chercher le nom de l’ensemble d’entités d’une table et les noms logiques de ses colonnes avant d’écrire des données.',
  '43b50e6f':
    'Envoyer un courriel depuis une boîte de réception AgentMail et surveiller le fil pour y repérer une réponse afin de poursuivre la conversation.',
  '4457951d':
    'Chercher les acquisitions annoncées sur une période et résumer l’acquéreur, la cible, le prix et les conditions. Utiliser pour la veille concurrentielle et la veille de marché.',
  '4458c187':
    'Découvrir quelles données contient un cluster Azure Data Explorer avant d’y écrire une requête.',
  '44a7c784':
    'Clore un dossier réglé en le fermant, puis le supprimer définitivement une fois les exigences de rétention satisfaites.',
  '44ce4606':
    'Récupérer les favoris X enregistrés, les regrouper par thème et produire un condensé de lecture organisé.',
  '454c3f77':
    'Lister les noms des secrets présents dans un environnement Infisical pour un inventaire ou un audit.',
  '455f9333': 'Lire des messages dans une file RabbitMQ pour inspection ou retraitement.',
  '45853a5e':
    'Examiner les approbations de demandes d’accès SailPoint en attente et approuver ou rejeter chaque élément avec un commentaire vérifiable.',
  '462fd04e':
    'Noter une liste de domaines de prospects selon l’ampleur de leur trafic Similarweb pour prioriser la prospection.',
  '46b13409':
    'Appeler par HTTPS une fonction web ou un serveur Modal déployé et exploiter sa réponse. À utiliser lorsque le calcul s’exécute sur Modal plutôt que dans le flux de travail.',
  '46d09fd0':
    'Envoyer un message à une session Devin active pour répondre à une question ou réorienter son travail.',
  '46f862fb':
    'Piloter un agent Web TinyFish pour naviguer sur un site et retourner des données conformes à un schéma JSON. À utiliser pour extraire des enregistrements (prix, annonces, lignes de tableau) de pages sans API.',
  '477be966':
    'Ajouter une nouvelle ligne à un tableau Microsoft Excel en conservant sa structure et sa mise en forme.',
  '479250e5':
    'Mettre en pause, reprendre ou archiver une campagne Email Bison et ajuster ses paramètres d’envoi.',
  '47a4eb5d':
    'Filtrer et trier une base de données Notion pour retourner les entrées correspondantes.',
  '47d9d1f2':
    'Lister les exécutions Temporal en cours et repérer les workflows de longue durée ou bloqués.',
  '48233e75':
    'Lancer l’exécution d’un job Dagster avec la bonne configuration et rapporter l’identifiant de l’exécution et son statut de départ.',
  '482880c4':
    'Utiliser les données sur les concurrents organiques d’Ahrefs pour repérer les sites qui se disputent le même trafic de recherche.',
  '48c7706f': 'Stocker et rafraîchir le contexte de session dans un hash Redis indexé par jeton.',
  '49095e41':
    'Ajouter une règle personnalisée WAF à une zone Cloudflare par le moteur Rulesets, afin de bloquer le trafic qui correspond à une expression de filtre ou de le soumettre à un défi.',
  '492b1631':
    'Inscrire un candidat embauché à la surveillance continue Checkr des antécédents criminels ou du dossier de conduite (MVR). Utiliser pour les conducteurs et les rôles qui exigent un filtrage continu.',
  '49b3399a':
    'Consulter l’état actuel du consentement d’un utilisateur dans Ketch avant de traiter ses données.',
  '49bef55a':
    'Enregistrer une idée de contenu dans le tableau d’idées de Buffer pour la rédiger plus tard. Utiliser lorsque l’inspiration arrive avant que le contenu soit prêt à être planifié.',
  '4a0f0e7c':
    'Supprimer les lignes plus anciennes qu’une date limite de conservation et indiquer le nombre de lignes retirées.',
  '4a381f89':
    'Extraire les données firmographiques (secteur, effectif, année de fondation, description) d’une entreprise à partir de son domaine, grâce à l’enrichissement Company Info.',
  '4a8ee585':
    'Insérer, mettre à jour ou fusionner (upsert) des enregistrements structurés dans Snowflake de façon sécuritaire.',
  '4aeea3bc':
    'Rechercher un sujet dans Wikipedia et assembler un bref dossier de contexte avec ses sources.',
  '4af94360':
    'Faire une recherche inversée d’une adresse courriel avec Findymail pour retrouver le profil LinkedIn complet et l’entreprise actuelle.',
  '4b46f4b2':
    'Trouver une approbation manuelle CodePipeline en attente, résumer le changement, puis l’approuver ou la rejeter.',
  '4b6695f4':
    'Générer un document à partir d’un modèle Word mis en forme en remplaçant ses espaces réservés.',
  '4b81279a':
    'Lancer une recherche Linkup et retourner une liste classée de sources pertinentes, avec des extraits, pour un sujet.',
  '4be5433a':
    'Préparer une file d’examen des remboursements avec le contexte de l’employé et des dépenses.',
  '4bfac71a': 'Créer ou mettre à jour un article du catalogue Square et y joindre une image.',
  '4c1a79a9':
    'Poser une question à Perplexity et obtenir une réponse fondée sur des sources web à jour, avec citations.',
  '4c1c70f8':
    'Créer des factures QuickBooks approuvées et en livrer ou en archiver explicitement les documents.',
  '4c7cdc0b':
    'Exécuter un outil personnalisé qu’un Managed Agent a invoqué et retourner le résultat à la session. À utiliser lorsque l’agent appelle un outil que votre propre flux de travail met en œuvre plutôt qu’un outil exécuté par la plateforme.',
  '4d0e6056':
    'Récupérer un enregistrement de conférence Google Meet et ses participants pour indiquer qui était présent.',
  '4d5aae15': 'Lire un document Word et produire un résumé structuré de son contenu.',
  '4deca972':
    'Créer un nouveau groupe Google Workspace avec une adresse courriel, un nom et une description.',
  '4df68d77':
    'Générer une URL présignée à durée limitée pour que d’autres personnes puissent télécharger un objet S3.',
  '4e093b49':
    'Réparer la partie en échec d’un job à plusieurs tâches sans réexécuter les tâches indépendantes qui ont réussi.',
  '4e474b92':
    'Utiliser la recherche Parallel AI pour répondre à une question sur le web et retourner des résultats classés, avec leurs sources.',
  '4e63cc89':
    'Stocker une valeur dans Upstash Redis sous une clé, avec une expiration pour qu’elle soit supprimée automatiquement.',
  '4e839f9f':
    'Exécuter un entonnoir Amplitude sur une séquence d’événements pour trouver les taux de conversion et les points d’abandon.',
  '4e903cdc': 'Accepter, accepter provisoirement ou refuser une invitation à une réunion Outlook.',
  '4eceb81b':
    'Ajouter ou retirer des étiquettes de propriétaire, d’environnement ou de centre de coûts sur un secret AWS Secrets Manager à des fins de gouvernance et d’imputation des coûts. À utiliser pour garder les métadonnées des secrets conformes à la politique d’étiquetage.',
  '4f62c9a4':
    'Vérifier quelles entreprises sont en direct sur Quartr en ce moment et présenter leurs flux audio et de transcription.',
  '4f91d14f':
    'Enregistrer du temps dans Rocketlane sur une tâche, une phase, un projet ou une activité ponctuelle, avec la bonne catégorie et l’indicateur de facturation. À utiliser pour consigner le travail depuis le clavardage ou d’autres systèmes.',
  '4f96ce1b':
    'Purger le cache Cloudflare pour des URL précises ou pour une zone entière après un déploiement, puis confirmer ce qui a été vidé.',
  '4faa5035':
    'Créer un nouvel indicateur de fonctionnalité LaunchDarkly dans un projet, avec une clé et une description claires.',
  '4fd0f7b5':
    'Lister les événements du calendrier Outlook pour une plage de temps donnée et résumer la journée.',
  '5006cb39':
    'Créer un candidat dans Ashby à partir d’une candidature ou d’une recommandation entrante et le rattacher à un poste. Utiliser pour la recherche de candidats et la réception des recommandations.',
  '50322308':
    'Trouver les contacts à une étape de prospect qui n’ont aucune activité courriel consignée.',
  '50cc8fe1':
    'Parcourir les transcriptions d’appels de vente Grain pour repérer les signaux d’achat, les objections et les mentions de concurrents.',
  '50d0475f':
    'Rechercher une identité SailPoint et résumer ses droits, ses rôles et ses profils d’accès pour une revue des accès.',
  '50ed08b3':
    'Enrichir la fiche d’une entreprise à partir de son site web ou de son URL LinkedIn pour obtenir ses données firmographiques Prospeo.',
  '5137fac4':
    'Rassembler un candidat Greenhouse et les détails de sa candidature dans une fiche d’une page à l’intention des intervieweurs.',
  '51eef9ec':
    'Lire un contrat dans Agiloft et en produire un résumé en langage clair de ses principales obligations et dates.',
  '51fd37d3':
    'Résumer les résultats récents des exécutions de pipelines Azure DevOps pour faire ressortir le taux de réussite et les régressions. Utiliser pour les rapports quotidiens ou hebdomadaires sur la santé de l’ingénierie.',
  '5237ff16':
    'Lire une page Confluence existante, y appliquer des mises à jour et la réenregistrer, en respectant la gestion des versions pour éviter les conflits.',
  '52424e13':
    'Créer une occasion d’affaires HubSpot et l’associer à la bonne entreprise et au bon contact.',
  '5253bf9c':
    'Remplir un modèle LaTeX avec des données structurées et le compiler en PDF. À utiliser pour les documents répétitifs comme les factures, les certificats, les lettres et les contrats.',
  '5288c786':
    'Exécuter une analyse PageSpeed Insights sur une URL et rapporter les scores et les Core Web Vitals.',
  '52a04a06': 'Déterminer pourquoi une file RabbitMQ accumule un arriéré qui ne se résorbe pas.',
  '5337c133':
    'Envoyer un rappel SMS personnalisé construit à partir de données en amont, comme les détails d’un rendez-vous ou d’une commande.',
  '53d54ec9':
    'Répondre à une question d’affaires avec Snowflake Cortex Analyst à partir d’une vue sémantique, puis exécuter le SQL et présenter le résultat.',
  '543ee008':
    'Faire passer la candidature d’un candidat à une nouvelle étape d’entrevue dans Ashby et consigner la décision. Utiliser pour faire avancer le processus après les entrevues.',
  '545b6dbb':
    'Téléverser un fichier dans un bucket Supabase Storage et retourner une URL publique ou signée.',
  '54e00d31':
    'Créer un dossier Grafana et y ajouter un tableau de bord de départ pour un nouveau service ou une nouvelle équipe.',
  '54fef81f':
    'Mettre à jour un secret stocké dans AWS Secrets Manager avec une nouvelle valeur dans le cadre d’un flux de rotation. À utiliser pour propager des identifiants renouvelés sans modifications manuelles dans la console.',
  '550cc373':
    'Comparer une recherche enregistrée de personnes visible par l’équipe à un instantané stocké afin de repérer les contacts nouvellement apparus.',
  '551f381f':
    'Extraire les incidents Downdetector d’un service et les consigner dans un journal d’incidents structuré.',
  '552d3931': 'Créer l’exécution d’une commande Shopify et mettre à jour son statut.',
  '554e7f20': 'Trouver une tâche Google Tasks par son titre et la marquer comme terminée.',
  '55606148':
    'Parcourir les investissements d’un investisseur et résumer son orientation en matière d’étape, de secteur et de taille de chèque. Utiliser pour la vérification diligente et la recherche d’investisseurs.',
  '558fe3ef':
    'Extraire le contenu principal propre d’une ou de plusieurs URL avec Tavily Extract en vue d’un résumé.',
  '55af6362': 'Appeler une procédure stockée Snowflake avec des arguments explicitement typés.',
  '55e827c0':
    'Récupérer un enregistrement Grain précis et sa transcription complète à partir de son ID.',
  '5627c8ab':
    'Exécuter la détection de dérive sur des piles CloudFormation et résumer les ressources dont la configuration réelle ne correspond plus au modèle.',
  '565b4849':
    'Récupérer le classement organique des mots-clés d’un domaine depuis Ahrefs et rapporter les plus fortes variations et les positions perdues.',
  '56b7d225':
    "Rapprocher les postes ouverts d’Ashby avec un tableau de finances ou de planification de la main-d'œuvre. Utiliser pour les revues du plan d’embauche et du budget.",
  '56d991e0':
    'Associer un magasin de mémoire afin qu’un agent conserve ses apprentissages d’une session à l’autre. À utiliser lorsque des exécutions répétées doivent s’appuyer sur les précédentes plutôt que de repartir de zéro.',
  '571be265':
    'Exécuter une requête GAQL personnalisée sur Google Ads pour répondre à une question précise de production de rapports.',
  '57a9d8ed':
    'Déclencher un déploiement de la documentation Mintlify et surveiller son état jusqu’à la réussite ou l’échec.',
  '5827d3ff':
    'Enregistrer un nouvel identifiant (connexion, clé d’API ou jeton) comme élément dans un coffre 1Password.',
  '585c16ac':
    'Appeler AWS STS pour assumer un rôle et obtenir des identifiants temporaires pour un compte cible. À utiliser pour l’accès entre comptes dans un flux de travail.',
  '5890dc84':
    'Envoyer une photo, une vidéo, un document ou un fichier audio dans une conversation Telegram, avec une légende.',
  '5960ebd4':
    'Lister les affectations de garde actuelles de PagerDuty pour des horaires ou des politiques d’escalade donnés.',
  '5979b8a1':
    'Clore une occasion d’affaires approuvée de Dynamics 365 comme gagnée ou perdue, avec un résumé explicite du résultat.',
  '5981a2b9':
    'Examiner un build Azure DevOps en échec, cerner l’étape défaillante et résumer la cause première. Utiliser lorsqu’une exécution de pipeline échoue.',
  '59a06927':
    'Ouvrir une requête Salesforce pour un problème de client et attribuer le responsable.',
  '59afac38':
    'Mettre en cache dans Redis une valeur calculée avec un TTL et la relire lors des exécutions suivantes.',
  '59be552f':
    'Lister les champs que publie une collection Crunchbase avant d’écrire une recherche. Utiliser lorsqu’un prédicat ou un nom de colonne est incertain.',
  '59d7861f':
    'Rechercher dans un tableau Monday les éléments correspondant à une valeur, comme un statut ou un responsable.',
  '59df93aa':
    'Inventorier les recherches enregistrées Splunk et signaler les recherches planifiées désactivées ou périmées.',
  '5a217451':
    'Rechercher dans ArXiv les articles les plus pertinents ou les plus récents sur un sujet et retourner une liste classée et résumée. Utiliser pour la découverte de littérature et les survols de sujets.',
  '5a668a8f':
    'Exécuter une requête SELECT paramétrée sur Amazon RDS par la Data API et retourner les lignes.',
  '5b08cd2f':
    'Rechercher dans Trello les cartes correspondant à une requête, puis supprimer ou archiver celles qui n’ont plus leur place.',
  '5ba953e6':
    'Exécuter une requête DAX approuvée et transformer les résultats complets du modèle sémantique en sommaire d’indicateurs clés.',
  '5bca1447':
    'Attribuer un ensemble d’autorisations à un utilisateur ou à un groupe sur un compte AWS par Identity Center et confirmer que l’attribution est terminée. À utiliser pour un accès élevé juste-à-temps.',
  '5bca8fff':
    'Envoyer la fiche d’un contact ou d’un compte à une table Clay par son webhook d’alimentation afin que Clay l’enrichisse. Utiliser pour confier un prospect à une cascade d’enrichissement Clay.',
  '5be8ebb7':
    'Envoyer un message de tâche structuré à une file Amazon SQS pour confier un traitement en arrière-plan.',
  '5c575b5f':
    'Transformer en contacts Harmonic les URL LinkedIn ou les adresses courriel qu’un flux de travail détient déjà.',
  '5c5fc7c2':
    'Mettre à jour un secret existant dans Infisical avec une nouvelle valeur dans le cadre d’une rotation.',
  '5c84b6d7':
    'Mettre à jour un problème Sentry pour changer son statut, l’assigner à un responsable ou le mettre en favori en vue d’un suivi.',
  '5d05ba23':
    'Déplacer une transaction vers une nouvelle étape en écrivant son champ de liste. Utiliser lorsqu’un flux de travail décide d’un changement d’étape et doit l’enregistrer.',
  '5db27329': 'Inspecter, reprendre, suspendre ou redimensionner un entrepôt Snowflake.',
  '5df8e3b7':
    'Envoyer une invite à un modèle conversationnel Hugging Face par l’API Inference et retourner la réponse.',
  '5e08b28a':
    'Lister les ensembles de données et les tables BigQuery et résumer le schéma d’un ensemble de données à l’intention d’un analyste.',
  '5e3111d9':
    'Exécuter la même requête Serper dans plusieurs régions pour comparer les classements de recherche selon la géographie.',
  '5f3920ee':
    'Rechercher sur X les tweets correspondant à une requête et résumer les thèmes, le sentiment et les publications notables.',
  '5f55d740':
    'Trouver un employé dans Rippling et retourner son rôle, son département et les détails de son équipe.',
  '60397d79':
    'Recueillir les événements d’échec et de plainte de Mailgun et compiler les adresses fautives en vue de leur suppression.',
  '605287b3':
    'Appliquer un flux de travail manuel de Help Scout à un lot de conversations correspondantes.',
  '605789a4':
    'Générer des vecteurs d’incorporation pour un ensemble de textes avec un modèle d’incorporation hébergé par Pinecone.',
  '60624679':
    'Enrichir le profil d’une personne à partir de son adresse courriel : nom, poste, entreprise, profils sociaux et plus encore.',
  '6086506a':
    'Effectuer une recherche sur une entreprise avec Sixtyfour AI pour bâtir un profil firmographique et de contexte de compte.',
  '60c555c0':
    'Créer des clients QuickBooks approuvés et conserver leurs identifiants et les versions de leurs enregistrements.',
  '60cbe4e0':
    'Créer ou mettre à jour un contact Resend dans une audience pour des envois marketing.',
  '60f82134':
    'Transformer des critères de repérage de candidats exprimés en langage naturel en un tableau de contacts normalisé avec Harmonic Scout.',
  '611cf317':
    'Lister les moniteurs Datadog, faire ressortir ceux en état d’alerte ou d’avertissement, et résumer ce qui se déclenche et pourquoi.',
  '617ef7d5':
    'Ventiler le volume et le contenu des appels Grain par équipe ou par type de rencontre à des fins de rapports.',
  '6198437c':
    'Parcourir le graphe Neo4j à partir d’un nœud de départ pour trouver les entités liées.',
  '6198e4bf':
    'Lire des lignes d’une table Supabase avec des filtres PostgREST, un tri et une pagination.',
  '61ef5ce1':
    'Créer une nouvelle note Obsidian avec du contenu Markdown à un chemin choisi du coffre.',
  '61f229c7':
    'Créer des prospects dans Email Bison et les rattacher à une campagne sortante avec des variables de personnalisation.',
  '61f5e430':
    'Créer un nouveau contrat ou un enregistrement connexe dans Agiloft à partir des détails fournis sur une transaction ou une demande.',
  '61fa0ff0':
    'Envoyer une consigne de suivi à un agent Cursor en cours de traitement afin de préciser ou de réorienter son travail.',
  '620a4fe5': 'Condenser un long fil de courriels en points clés, décisions et actions à mener.',
  '623c495b':
    'Trouver un contact HubSpot par courriel et le mettre à jour, ou le créer s’il n’existe pas.',
  '62679d97':
    'Exécuter NRQL pour obtenir la latence, le taux d’erreur et le débit d’un service sur une période donnée.',
  '62ef5eff':
    'Traduire un message source vers plusieurs langues cibles pour une diffusion multilingue.',
  '630c5043':
    'Coordonner le passage de relais entre l’offre et la préintégration à partir des événements d’offre et de signature. Utiliser pour éviter que des candidats ayant accepté ne tombent dans un vide opérationnel.',
  '631d2782':
    'Faire exécuter par un agent TinyFish une tâche en plusieurs étapes sur un site Web : connexion, navigation, remplissage et envoi de formulaires. À utiliser lorsqu’un site n’a pas d’API et qu’une personne ferait normalement les clics.',
  '63280c4b': 'Publier un message dans un exchange RabbitMQ et confirmer qu’il a été acheminé.',
  '63463da1':
    'Soumettre une nouvelle publication dans un subreddit cible pour une annonce ou un lancement.',
  '63553089':
    'Trouver l’URI de l’identifiant de coffre TinyFish pour un site et limiter une seule exécution d’agent à cet identifiant. À utiliser lorsqu’une exécution a besoin d’une connexion précise et ne doit pas voir le reste du coffre.',
  '636a0a5b': 'Joindre un fichier généré à un courriel et l’envoyer par SMTP.',
  '639fa2f0':
    'Créer un nouveau secret dans AWS Secrets Manager à partir d’un identifiant fourni ou d’une valeur générée. À utiliser pour enregistrer de façon centralisée les identifiants d’application, les clés d’API ou les mots de passe de base de données.',
  '63c8dd01':
    'Envoyer un document à un ou plusieurs signataires pour signature électronique, à l’aide d’un modèle DocuSign ou d’un fichier téléversé.',
  '63e9e407': 'Créer et lister les actions de suivi de rétrospective liées à un incident Rootly.',
  '63ee0042':
    'Repérer les demandes de tirage Bitbucket en souffrance et recommander, pour chacune, le prochain responsable et la prochaine action.',
  '64028420':
    'Élargir un mot-clé de départ dans Semrush en une liste priorisée avec volume, difficulté et intention.',
  '648b2c91':
    'Résoudre un nom ambigu vers la bonne entité Wikipedia à l’aide du contexte environnant.',
  '64a15796':
    'Créer des articles pris en charge ou mettre à jour les champs d’article exposés sans en changer le type.',
  '64e97a69':
    'Enrichir un seul prospect grâce à la recherche IA de Sixtyfour pour compléter son rôle, son entreprise et son contexte de contact.',
  '650696e9':
    'Envoyer à LangSmith une exécution unique de LLM ou de chaîne, avec ses entrées, ses sorties et sa durée, à des fins de traçage.',
  '651cad21':
    'Retirer un utilisateur d’un Google Group, utile lors d’un départ d’employé et pour le nettoyage des accès.',
  '65392b82':
    'Chercher les occasions d’affaires Apollo par étape et résumer les transactions nouvelles et à risque dans un sommaire. Utiliser pour les revues périodiques de l’entonnoir de vente.',
  '65908ac4':
    'Déclencher un job Databricks, saisir l’identifiant de l’exécution et confirmer que le démarrage a réussi.',
  '65cf997e':
    'Insérer des lignes structurées dans une table BigQuery pour la journalisation ou la sortie d’un pipeline.',
  '6602cccd':
    'Vérifier un nouveau domaine ou une nouvelle adresse d’envoi dans AWS SES et contrôler l’état de DKIM et de la vérification. À utiliser avant d’envoyer depuis une nouvelle identité.',
  '665b2275':
    'Envoyer un message modèle WhatsApp personnalisé à chaque contact d’une liste d’audience, un à la fois.',
  '66e2e1d6':
    'Analyser une facture téléversée avec Extend et retourner des champs structurés : fournisseur, lignes de facture et total.',
  '66f37d02':
    'Comptabiliser des écritures de journal équilibrées approuvées, enregistrer des dépôts et examiner les virements.',
  '6736b2ac':
    'Lire un rapport Checkr terminé et résumer son résultat, son évaluation et les vérifications qui demandent de l’attention. Utiliser à l’arrivée d’un événement report.completed ou lorsqu’un recruteur demande où en est le dossier.',
  '67662f82':
    'Récupérer le profil de liens entrants d’un domaine concurrent depuis Ahrefs et relever les occasions de création de liens.',
  '676d1501':
    'Lister les matchs de football d’une journée depuis Sportmonks, au besoin filtrés par ligue.',
  '677f6a79':
    'Lister les tableaux de bord et les dossiers Grafana et indiquer les sources de données dont chacun dépend.',
  '67d9a406':
    'Lister et résumer les commentaires d’une page Confluence afin de trier la rétroaction et les questions en suspens.',
  '67e02016':
    'Téléverser un fichier dans une bibliothèque de documents d’un site SharePoint à partir d’un bloc précédent.',
  '67f89a38':
    'Trier les courriels non lus par urgence et rédiger des réponses pour les messages les plus importants.',
  '68afb41f':
    'Rechercher dans PitchBook les transactions correspondant à une thèse sur une période donnée et les résumer. À utiliser pour le suivi récurrent des transactions et du marché.',
  '691dbbf4':
    'Utiliser la simulation de politiques IAM pour vérifier si un utilisateur ou un rôle peut effectuer des actions précises sur des ressources. À utiliser pour dépanner les accès et valider des changements.',
  '69bd039d':
    'Exécuter à la demande des moniteurs synthétiques Dynatrace après un déploiement et décider à partir du résultat du lot.',
  '69eff188':
    'Lister, créer et élaguer les abonnements webhook de Grain afin que les systèmes externes ne reçoivent que les événements dont ils ont besoin.',
  '6a0e104b': 'Ajouter une réponse publique à une demande client et la faire passer au bon statut.',
  '6a0e8822': 'Exécuter des requêtes financières SuiteQL bornées et déterministes.',
  '6a47ac94':
    'Lister les actions à faire ouvertes dans Circleback et les regrouper par responsable pour le suivi.',
  '6a491fde':
    'Consulter un prospect Lemlist et envoyer une réponse personnalisée par sa boîte courriel Lemlist.',
  '6a49502f':
    'Trouver les enveloppes terminées, télécharger les PDF signés et extraire les métadonnées clés à des fins d’archivage.',
  '6a7a889c':
    'Extraire le résumé d’un appel Fathom et les correspondances CRM, puis rédiger une note prête pour le CRM avec les prochaines étapes.',
  '6a930851':
    'Produire un contrat ou une lettre d’offre à partir des données d’une transaction et le livrer en PDF.',
  '6abaa309':
    'Résumer la file Zoho Desk actuelle par état, priorité et ancienneté dans un condensé destiné à l’équipe de soutien.',
  '6b00c26e':
    'Résumer qui est de garde et quels sont les incidents ouverts récents pour une passation de garde.',
  '6b3cf285':
    'Transformer un formulaire numérisé en paires clé-valeur et en tableaux structurés avec AWS Textract. À utiliser pour les formulaires d’accueil, les demandes et les contrats.',
  '6b3d54fd':
    'Lire les messages récents d’un canal Discord et produire un résumé des discussions, des questions et des décisions.',
  '6bc24369':
    'Rechercher un sujet sur le Web et résumer les meilleurs résultats dans une note de synthèse.',
  '6c12886b':
    'Repérer les factures de fournisseurs impayées dont l’échéance tombe dans une période précisée.',
  '6c3de5a5':
    'Rechercher des entreprises dans ZoomInfo selon des filtres firmographiques pour constituer une liste de comptes cibles.',
  '6c8bc6df':
    'À partir du domaine d’une entreprise, trouver des employés par titre de poste et enrichir le profil de l’entreprise pour obtenir une carte de l’équipe.',
  '6c92e62c':
    'Résumer les campagnes actives et leurs prospects en un aperçu rapide de la performance de la prospection.',
  '6ce7f6ec':
    'Extraire la performance des campagnes Google Ads pour une plage de dates et produire un rapport de métriques clair.',
  '6d07c792':
    'Lister les problèmes Sentry non résolus, les classer selon leur incidence et résumer les erreurs les plus urgentes à corriger.',
  '6d168e2e':
    'Garder les tables ClickHouse en bonne santé en inspectant les parties, en optimisant les tables et en supprimant les partitions périmées. Utiliser pour la maintenance planifiée ou lorsque le stockage ou le nombre de parties augmente.',
  '6d186ef4':
    'Expliquer pourquoi une connexion Fivetran échoue et quoi faire. À utiliser lorsqu’un événement sync_end signale un échec ou que quelqu’un demande pourquoi les données sont périmées.',
  '6d49cb83':
    'Utiliser Exa Answer pour obtenir une réponse directe et sourcée à une question factuelle.',
  '6dce34fc':
    'Calculer les distances et les temps de déplacement d’un point de départ vers plusieurs destinations.',
  '6de60208':
    'Faire expirer immédiatement la clé de nœud d’un appareil soupçonné d’être compromis pour qu’il doive se réauthentifier avant de rejoindre le tailnet.',
  '6e13858a':
    'Confier à Stagehand un objectif en langage naturel et laisser son agent naviguer et agir de façon autonome sur un site.',
  '6e202fdd':
    'Analyser les annonces de fiches produits d’un concurrent dans Semrush, y compris les mots-clés qui les déclenchent et les produits promus.',
  '6e762626':
    'Créer un lien de réservation Calendly à usage unique pour un type d’événement. Utiliser pour inviter quelqu’un à planifier une rencontre sans exposer un lien réutilisable.',
  '6e9150a0':
    'Parcourir et modifier les listes personnalisées SAP Concur et leurs éléments, soit les ensembles de valeurs derrière les champs de dépense de type liste.',
  '6e9946b2':
    'Créer un événement Google Calendar avec la bonne heure, les participants et les détails, en envoyant les invitations.',
  '6ebb5695':
    'Ajouter à une présentation Google Slides une diapositive avec un tableau et des formes qui résume des indicateurs clés ou des métriques.',
  '6ebf898c': 'Examiner une politique de conformité et résumer son statut par appareil.',
  '6ec79f47':
    'Compiler un rapport des incidents récents, avec leurs causes et leurs durées, pour un bilan après incident ou une revue quotidienne. À utiliser pour résumer la fiabilité.',
  '6f11421a':
    'Analyser le PDF d’un formulaire d’admission et extraire des champs structurés vers un tableau ou un enregistrement.',
  '6f81fc63': 'Rédiger un message mis en forme dans un canal précis de Microsoft Teams.',
  '6f938419':
    'Créer un événement Luma avec un nom, une heure de début, un fuseau horaire, une description et une visibilité.',
  '6fc70b19':
    'Lister les règles d’alerte Grafana et faire ressortir celles qui sont actuellement en déclenchement, avec leurs points de contact.',
  '6fecd051': 'Capturer une liste détaillée d’un répertoire SFTP distant à des fins d’audit.',
  '70123ff7':
    'Retracer tout ce qu’un utilisateur, un rôle ou une clé d’accès AWS précis a fait au cours des 90 derniers jours à l’aide de l’historique des événements CloudTrail. Utiliser pour la réponse aux incidents et les revues lors d’un départ.',
  '7030c1a9':
    'Extraire des champs structurés d’une ou de plusieurs URL à l’aide de Firecrawl Extract, avec une consigne ou un schéma.',
  '7054df25':
    'Créer ou mettre à jour un prospect Salesforce à partir d’un signal entrant et assigner le suivi.',
  '7076ca65':
    'Relier les preuves issues des demandes de tirage et des pipelines Bitbucket à la fiche de livraison Jira correspondante.',
  '70827008': 'Associer un motif d’affaires fourni à une transaction par carte.',
  '70c4fe17': 'Récupérer un compte Salesforce avec ses contacts pour obtenir une vue à 360 degrés.',
  '70ef592a':
    'Créer une carte Trello dans une liste, avec une description, une date d’échéance et des étiquettes.',
  '710c4da9':
    'Créer un lien court Dub pour une URL de destination avec des paramètres UTM et, au besoin, un slug personnalisé.',
  '7124ce09':
    'Vérifier l’état d’une tâche Tinybird asynchrone, comme une importation par ajout ou une tâche de suppression par condition.',
  '713b2524':
    'Lister le contenu d’un dossier, puis déplacer, copier ou supprimer des fichiers pour réorganiser le contenu de Dropbox.',
  '714ab1a5':
    'Lancer une recherche Web Serper sur un sujet et synthétiser les meilleurs résultats organiques en un résumé sourcé.',
  '714b03a1':
    'Relancer les actions en échec d’une étape CodePipeline et confirmer que l’étape est repassée en exécution.',
  '715b9b80':
    'Déclencher une tâche d’arrière-plan Trigger.dev avec une charge utile et interroger jusqu’à la fin de l’exécution, puis retourner sa sortie.',
  '716470f6':
    'Passer un appel qui pose une question et capte la réponse de l’appelant au clavier ou à la voix.',
  '71c2662d':
    'Lire les courriels Outlook récents et résumer lesquels nécessitent une réponse ou une action.',
  '71cef610':
    'Créer une réservation Cal.com pour un participant, sur un type d’événement et à une heure choisis. Utiliser pour planifier un appel une fois le créneau et les détails du participant connus.',
  '71d13a99':
    'Trouver une tâche Asana et mettre à jour ses champs (responsable, échéance, achèvement) ou y ajouter un commentaire d’avancement. Utiliser pour garder les tâches à jour à partir d’autres systèmes.',
  '71d81eae':
    'Corriger ou enrichir les fiches de prospects existantes afin que la personnalisation et la synchronisation avec le CRM restent exactes.',
  '71e9c5b6':
    'Enregistrer un webhook Jotform pour que les nouvelles soumissions soient envoyées vers une URL, et confirmer ce qui est déjà enregistré.',
  '71fc62ae':
    'Joindre un fichier de preuve à un document Vanta et soumettre la collecte pour révision.',
  '7249de68':
    'Créer un événement de déploiement dans New Relic afin de faire coïncider les mises en production avec les changements de métriques.',
  '72678696':
    'Arrêter une session de Managed Agent qui travaille plus longtemps que prévu et la nettoyer. À utiliser pour maîtriser les coûts et annuler un travail dont l’utilisateur a changé d’idée.',
  '72ca8d21':
    'Créer, récupérer, lister, mettre à jour et supprimer des modèles de courriel réutilisables dans AWS SES. À utiliser pour maintenir une bibliothèque de modèles cohérente et versionnée.',
  '72cc2fb6': 'Soumettre la même invite à deux modèles Hugging Face et comparer leurs résultats.',
  '7324cda8':
    'Lire un contact Wealthbox ainsi que ses notes et ses tâches récentes pour préparer un sommaire de rencontre.',
  '734646c4':
    'Surveiller un canal pour y repérer des questions et rédiger des réponses sourcées, dans le fil, à partir de votre base de connaissances.',
  '737fd791':
    'Préparer une conversation de vente Otter en vue d’une mise à jour du CRM, en associant les invités du calendrier aux contacts.',
  '74007e36':
    'Créer un environnement Railway éphémère, y initialiser les variables et le déployer.',
  '742f6fe7':
    'Récupérer la dernière configuration AWS AppConfig déployée pour une application, un environnement et un profil, et utiliser ses valeurs pour piloter des indicateurs de fonctionnalité ou des paramètres dynamiques.',
  '743b813d':
    'Ajouter de nouvelles lignes à la fin d’un Google Sheet sans écraser les données existantes.',
  '74711abc':
    'Promouvoir le dernier déploiement Vercel connu comme fonctionnel pour revenir instantanément en arrière après une mauvaise mise en production.',
  '74769cb5':
    'Créer des rappels sur les transactions restées sans activité et signaler celles qui sont déjà en retard. Utiliser pour garder l’entonnoir de vente en ordre.',
  '74a39930':
    'Lister les marchés Polymarket ayant le plus fort volume ou la plus grande liquidité, avec filtrage facultatif par catégorie.',
  '74b12845':
    'Regrouper les employés Rippling par département et par type d’emploi pour rapporter l’effectif.',
  '74dd452a':
    'Rechercher les contacts correspondants et les ajouter à une séquence de courriels Apollo. Utiliser pour lancer ou alimenter des campagnes sortantes.',
  '74fd6365': 'Réagir à un message Sendblue entrant et y répondre automatiquement.',
  '750541ab': 'Appeler par HTTP une Supabase Edge Function déployée et utiliser sa réponse JSON.',
  '7540263a':
    'Rechercher dans Prospeo les personnes correspondant à un profil de client idéal (ICP), selon l’ancienneté, le titre, l’industrie et des filtres d’entreprise.',
  '75487279':
    'Passer en revue les réponses récentes aux courriels d’une campagne et mettre à jour le statut d’intérêt de chaque prospect.',
  '757dbb50':
    'Utiliser You.com Answer pour obtenir une réponse synthétisée accompagnée d’extraits à l’appui, cités textuellement.',
  '75bf3add':
    'Écrire un résumé de rencontre dans Affinity sous forme de note rattachée aux bons enregistrements. Utiliser après un appel ou une rencontre.',
  '75dc4375': 'Rédiger une réponse au dernier message du client sans l’envoyer.',
  '761b820d':
    'Interroger périodiquement, selon un horaire, un dossier de dépôt SFTP distant et ingérer les nouveaux fichiers.',
  '76852d83':
    'Insérer une nouvelle ligne Supabase ou la mettre à jour si elle existe déjà, en un seul appel idempotent.',
  '76c18a8a':
    'Extraire d’Amplitude les utilisateurs actifs, les principaux événements et les revenus, puis résumer l’engagement envers le produit pour une période.',
  '76ce299a':
    'Lire une note Granola et en extraire une liste claire d’actions à faire avec leurs responsables.',
  '76d75b11':
    'Désactiver un compte Azure AD et retirer ses appartenances aux groupes lorsqu’une personne quitte l’organisation. À utiliser pour un départ sécurisé.',
  '771e9caf':
    'Créer un nouvel élément dans une collection CMS Webflow à partir de données de champs fournies ou générées.',
  '7768723e':
    'Créer des factures fournisseur autonomes ou liées à un bon de commande et enregistrer des paiements encadrés sur des Bill ID approuvés.',
  '7768805e': 'Télécharger un objet depuis S3 et transmettre son contenu aux étapes suivantes.',
  '7788f014':
    'Rechercher sur Google les mentions récentes d’une marque, d’une personne ou d’un mot-clé et faire ressortir les résultats notables.',
  '78927ed8':
    'Trouver un contact Loops et le mettre à jour avec des propriétés personnalisées enrichies et un groupe d’utilisateurs.',
  '7895d4cf':
    'Rechercher dans la base de connaissances ServiceNow une solution existante avant d’escalader.',
  '78a3c28a':
    'Consulter un élément de configuration ServiceNow et cartographier ses dépendances ainsi que ce qui dépend de lui.',
  '78e1999e':
    'Partir du nom d’un prospect et de son entreprise, résoudre le domaine, puis trouver le courriel professionnel et le téléphone pour assembler une fiche de contact complète.',
  '795ea8aa':
    'Lire les politiques basées sur les ressources Lambda et les paramètres d’URL de fonction pour repérer les fonctions exposées plus largement que prévu.',
  '79727944':
    'Ajouter un lot d’invités à un événement Luma à partir d’une liste de courriels et de noms.',
  '79a4b7ff':
    'Ajouter ou retirer des dépositaires d’une conservation légale existante à mesure que la liste des dépositaires d’un dossier change.',
  '79c39fa5':
    'Trouver le courriel professionnel d’un prospect à partir d’un nom et d’une entreprise ou d’une URL LinkedIn, puis en vérifier la délivrabilité.',
  '7a0d79cc': 'Générer un document structuré ou une page Web à partir d’un texte saisi avec Gamma.',
  '7a3242bd':
    'Surveiller une métrique Oracle et n’alerter que lorsqu’un seuil explicite est franchi.',
  '7a591e15': 'Déplacer un événement existant du calendrier Outlook à une nouvelle heure.',
  '7a72ec8d':
    'Appliquer un changement de nom ou de terminologie à un ensemble de documents Word, y compris dans les en-têtes et les pieds de page.',
  '7ac633dc': 'Vérifier et ajuster les niveaux de stock Shopify d’un article à un emplacement.',
  '7ad0f307':
    'Lire les données d’une plage d’une feuille de calcul Microsoft Excel et retourner les lignes.',
  '7ad15f71':
    'Rechercher dans ArXiv sur un sujet, résumer les articles clés et assembler une revue de littérature thématique. Utiliser pour amorcer la recherche dans un nouveau domaine.',
  '7ad61203':
    'Ajouter ou mettre à jour un contact dans une audience Mailchimp avec des champs de fusion et des étiquettes.',
  '7b2c9a9e':
    'Enquêter sur la raison pour laquelle l’exécution d’une commande Run Command a échoué sur des nœuds gérés précis. À utiliser lorsqu’une commande de déploiement ou de maintenance signale des erreurs.',
  '7b4d9dce':
    'Vérifier et gérer le verrou d’un enregistrement Agiloft avant et après une modification automatisée.',
  '7b8eb7fb': 'Trouver le meilleur prix disponible pour chaque issue parmi les bookmakers.',
  '7bdc75e1':
    'Invoquer une fonction AWS Lambda avec une charge utile JSON et interpréter sa réponse, y compris les erreurs de fonction et la sortie des journaux.',
  '7c0f8c9c':
    'Passer un ordre à cours limité sur un marché Kalshi après avoir confirmé le prix et le solde.',
  '7c2382a9':
    'Interroger une table ou une vue Airtable et produire un rapport d’état consolidé de l’avancement, des points de blocage et des tendances.',
  '7c2a245c':
    'Extraire les actions à mener d’une conversation Otter sous forme de tâches claires pour un outil de gestion de projet.',
  '7c6aca3a':
    'Comparer le volume récent de signalements Downdetector au niveau de référence d’une entreprise pour détecter les hausses anormales.',
  '7ccaed40':
    'Diffuser des événements JSON ou NDJSON vers une source de données Tinybird par l’API Events.',
  '7db60221':
    'Récupérer l’historique des rencontres, les personnes et les notes que Circleback détient sur une entreprise avant un appel important.',
  '7dd6259f':
    'Mettre à jour la fiche de renseignements personnels d’un employé Workday avec des modifications de champs validées.',
  '7deffcfe':
    'Résumer les candidatures Greenhouse par poste et par étape afin de produire un rapport sur l’entonnoir d’embauche.',
  '7e22a480':
    'Utiliser les métriques de visibilité de Profound pour comparer une marque à ses concurrents dans les réponses d’IA.',
  '7e32be2a': 'Réagir à un message précis de Microsoft Teams pour en accuser réception.',
  '7e36959e':
    'Lancer une recherche Web Google et retourner les résultats les plus pertinents avec leurs titres et leurs liens.',
  '7e4771ff':
    'Lire les éléments d’une liste SharePoint et résumer les lignes pour une utilisation en aval.',
  '7e9cd124':
    'Activer ou désactiver en toute sécurité un indicateur de fonctionnalité LaunchDarkly dans un environnement précis.',
  '7f1fabd1':
    'Trouver les domaines qui pointent vers vos concurrents en liens entrants dans Semrush, mais pas vers vous, et les classer comme cibles de démarchage.',
  '7f2fa52e':
    'Parcourir le journal d’audit LogRocket page par page pour indiquer qui a consulté des sessions et quelles actions ont été effectuées.',
  '7f4016e8':
    'Rechercher une entreprise à partir de son domaine et retourner ses actifs de marque et ses données firmographiques. Utiliser pour enrichir une fiche CRM, un prospect ou un compte avec le logo, les couleurs et des données sur l’entreprise.',
  '7f5b016d':
    'Créer un downtime Datadog pour mettre les moniteurs en sourdine pendant une fenêtre de maintenance, puis confirmer la portée et l’horaire.',
  '7fa0483a':
    'Récupérer l’historique des prix Polymarket d’un jeton d’issue sur un intervalle et résumer la tendance.',
  '7fbdd3b5':
    'Créer une dépense rapide dans SAP Concur à partir d’un reçu, en joignant l’image du reçu.',
  '7fde26b8':
    'Trouver un article WordPress et mettre à jour son contenu, son statut ou sa taxonomie sans écraser le reste.',
  '7febe93c':
    'Passer en revue les conversations Intercom ouvertes et assigner chacune à la bonne personne avec une priorité.',
  '7ff4bca1':
    'Enrichir la fiche d’une personne à partir d’un courriel, d’une URL LinkedIn, ou d’un nom et d’une entreprise, avec People Data Labs.',
  '80331ce5':
    'Interroger les capteurs CrowdStrike Identity Protection et rapporter la couverture, l’état et les appareils dépourvus de protection.',
  '806697da':
    'Joindre une note, une valeur catégorielle ou une correction à une exécution LangSmith existante à des fins d’évaluation.',
  '808c67ae':
    'Résumer les commits, les demandes de tirage et l’activité des pipelines d’un dépôt pour un point d’étape en ingénierie.',
  '80bc3e72':
    'Inspecter récursivement la structure d’un document Windchill et résumer l’état de préparation des documents enfants.',
  '80d0becb':
    'Associer un nom ou un domaine d’entreprise à son organisation Crunchbase et inscrire ses données firmographiques sur la fiche. Utiliser pour compléter les comptes avant la notation ou l’acheminement.',
  '8127db67':
    'Créer une campagne Mailchimp, définir son contenu, puis l’envoyer ou la planifier pour une audience.',
  '813a2116':
    'Rechercher dans Linkup les mentions récentes d’un sujet, d’un concurrent ou d’une marque dans une plage de dates.',
  '813c6349':
    'Soumettre des lots d’enregistrements asynchrones indépendants avec des clés d’idempotence.',
  '8147afb2':
    'Lire un courriel de vérification ou de mot de passe à usage unique (OTP) dans une boîte de réception AgentMail et en extraire le code ou le lien de confirmation.',
  '8147c6de':
    'Faire remplir et soumettre un formulaire Web par un agent de navigateur à partir de valeurs de champs fournies. Utiliser pour les portails de fournisseurs, les questionnaires ou les demandes sans API.',
  '814ad475':
    'Ajouter des lignes à partir d’une URL, tronquer ou supprimer des lignes selon une condition dans une source de données Tinybird.',
  '81e31451':
    'Qualifier un prospect approuvé de Dynamics 365 et contrôler quels enregistrements de compte, de contact et d’occasion d’affaires sont créés.',
  '826c1a2a':
    'Analyser des courriels, des formulaires ou des documents entrants et créer ou mettre à jour des enregistrements Airtable structurés.',
  '83aba0c1':
    'Exécuter une série de requêtes de test sur un index Algolia et signaler celles qui donnent des résultats faibles ou vides.',
  '83bbdc79':
    'Accorder un droit d’accès promotionnel à un client dans le cadre du soutien ou d’une campagne.',
  '83c93146':
    'Vérifier le statut des pipelines GitLab d’un projet et rapporter les échecs, avec relance facultative d’un pipeline en échec.',
  '83d996aa':
    'Envoyer de nombreuses lignes de prospects ou de comptes d’une table vers un classeur Clay pour enrichissement. Utiliser pour amorcer une liste de prospects ou synchroniser un segment du CRM dans Clay.',
  '8455a0b3':
    'Appliquer le dead-lettering à une famille de files RabbitMQ au moyen d’une politique.',
  '85314639':
    'Examiner les nouvelles lignes d’une table de suivi Coda et mettre à jour leurs colonnes de statut, de priorité ou de responsable.',
  '8532f41b':
    'Lire les plages occupées et les heures de travail d’un utilisateur Calendly pour une période donnée. Utiliser pour trouver quand une personne est libre avant de proposer des heures.',
  '854df7d1': 'Envoyer un petit lot d’enregistrements dans une table Azure Data Explorer.',
  '8561ed10':
    'Lister les objets d’un compartiment S3 sous un préfixe pour un inventaire ou un nettoyage.',
  '8592bcbd':
    'Charger des prospects dans une campagne Smartlead et rapporter précisément ce qui a été ignoré.',
  '85aea170':
    'Rédiger du contenu mathématique (équations, démonstrations, séries de problèmes) en LaTeX et compiler un PDF imprimable. À utiliser pour les feuilles d’exercices, les corrigés et les notes techniques.',
  '85e2c94a':
    'Transformer une liste d’actions à mener en tâches Google Tasks, avec titres, notes et échéances, dans la bonne liste de tâches.',
  '863058d4':
    'Utiliser Greptile pour évaluer comment le diff d’une PR interagit avec le reste du dépôt et rédiger des notes de révision.',
  '86811b66':
    'Déployer un changement de marque ou de nom dans toute une présentation en remplaçant partout le texte et les logos.',
  '86883e3d':
    'Chercher dans un index Algolia la réponse à la question d’un utilisateur et retourner une réponse fondée sur les enregistrements correspondants.',
  '871e70a8':
    'Traduire une question analytique formulée en langage courant en SQL ClickHouse, l’exécuter et retourner la réponse. Utiliser pour des questions ponctuelles sur les données d’une table ClickHouse.',
  '8754e2e6':
    'Passer un appel vocal depuis un numéro AgentPhone pour livrer un message ou mener une courte interaction scénarisée.',
  '8762342f':
    'Écrire ou mettre à jour des valeurs dans une plage d’une feuille de calcul Microsoft Excel, avec valeurs, formules et formats numériques.',
  '8765db63':
    'Démarrer un runbook SSM Automation, le suivre jusqu’à son terme et présenter les résultats de chaque étape. À utiliser pour une correction scriptée, comme le redémarrage d’une instance ou la rotation d’une AMI.',
  '87998572':
    'Prévisualiser puis supprimer les lignes Oracle plus anciennes qu’une date limite de conservation explicite.',
  '87f31e7f':
    'Rechercher des fiches HubSpot et garder une liste manuelle synchronisée en ajoutant et en retirant des membres.',
  '87f3e659':
    'Assembler la conversation d’un billet Zoho Desk et ses pièces jointes en un rapport de bogue, puis consigner l’escalade sur le billet.',
  '88e29034':
    'Répondre à une question avec Linkup en fournissant une réponse sourcée et faire ressortir les URL des sources à l’appui.',
  '88f2f53e':
    'Associer une personne à un utilisateur GitLab et l’ajouter à un projet ou à un groupe avec le bon niveau d’accès.',
  '890856ed': 'Corriger le transporteur ou les informations de suivi d’une exécution existante.',
  '8935713e':
    'Lister les notes récentes de Granola et produire un condensé structuré des points clés et des actions à faire.',
  '893a1382':
    'Récupérer le contenu d’une seule page Web avec Bright Data Web Unlocker, en contournant les blocages anti-robots et les restrictions géographiques. Utiliser pour lire une page à laquelle un agent ne peut pas accéder autrement.',
  '894ef2d7':
    'Rédiger une mise à jour d’état et l’ajouter en tête d’une page Coda en Markdown, en conservant les mises à jour précédentes en dessous.',
  '8956d68e':
    'Créer ou mettre à jour un contact Intercom et le lier à son entreprise avec des renseignements à jour.',
  '898829a6':
    'Lancer une recherche de prospects Wiza avec des filtres pour constituer une liste de contacts B2B vérifiés.',
  '8a257565':
    'Lister les demandes d’accès en attente pour un projet ou un groupe GitLab et approuver ou refuser chacune d’elles.',
  '8afdfb31':
    'Ajouter un lot de prospects à une campagne Instantly comme nouveaux contacts, avec des champs de personnalisation.',
  '8b19e82e':
    'Lister les postes ouverts dans Greenhouse avec leurs départements, bureaux et équipes d’embauche.',
  '8b30e565':
    'Vérifier un lot d’adresses courriel et signaler celles qui sont non livrables ou à risque avant l’envoi.',
  '8bd07b04':
    'Lister les liens Dub et vérifier chaque destination pour repérer les URL brisées ou périmées à nettoyer.',
  '8be82f90':
    'Vérifier l’état des demandes Box Sign et relancer les signataires en attente. Utiliser pour suivre les demandes de signature électronique en cours.',
  '8bf52900':
    'Lire le stock de matières actuel et les documents de matières récents d’un article dans SAP S4HANA.',
  '8c1fdf77':
    'Récupérer les événements Calendly planifiés à venir pour une plage de dates et les résumer. Utiliser pour informer un hôte de son horaire ou bâtir un ordre du jour quotidien.',
  '8c709181':
    'Lister tous les appareils du tailnet et signaler les nœuds périmés, non autorisés ou en attente de mise à jour.',
  '8d0df4e6':
    'Trouver un client, un fournisseur ou un partenaire d’affaires dans SAP S4HANA et retourner ses données de base.',
  '8d1a07f4':
    'Démarrer ou reconfigurer la rotation native d’AWS Secrets Manager pour un secret qui a déjà une fonction Lambda de rotation configurée. À utiliser lorsque la conformité exige une rotation automatique et planifiée plutôt que des mises à jour manuelles.',
  '8d3a8f39':
    'Créer un billet Zendesk à partir d’une demande entrante, en le liant au bon demandeur.',
  '8d6f3fb7':
    'Rédiger une réponse contextuelle à un courriel, sur le bon ton, prête à être révisée.',
  '8dc89a45':
    'Analyser les billets Zoho Desk récents pour repérer les thèmes récurrents et proposer les articles de la base de connaissances qui permettraient de les éviter.',
  '8e088009':
    'Ajouter un nouveau moniteur HTTP, de mot-clé, de ping ou de port pour un service afin de suivre sa disponibilité. À utiliser lors de l’intégration d’un nouveau point de terminaison.',
  '8e462f82':
    'Lister les alarmes CloudWatch, signaler celles à l’état ALARM ou INSUFFICIENT_DATA et, au besoin, mettre en sourdine les alarmes bruyantes.',
  '8e4d71e4':
    'Créer un nouveau chiffrier Google Sheets avec des onglets nommés et retourner son lien.',
  '8eabc029':
    'Lire les perspectives d’un ensemble d’entreprises et les classer selon leur probabilité de sortie sur deux ans par rapport à la moyenne de leurs pairs. Utiliser pour établir les priorités de l’entonnoir de vente et du portefeuille.',
  '8eb57434': 'Récupérer par ID des points Qdrant précis et leurs charges utiles.',
  '8ee587f0':
    'Créer dans Attio une tâche liée à une fiche, avec un responsable et une échéance. Utiliser pour consigner les suivis et les prochaines étapes issus de transactions ou de conversations.',
  '8eec7fb8':
    'Lister les demandes de voyage SAP Concur et y donner suite en les faisant avancer dans le flux d’approbation.',
  '8f1730c5':
    'Lister les membres d’une équipe ou d’un canal Microsoft Teams à des fins d’acheminement ou d’audit.',
  '8f323292':
    'Créer un contact Loops à l’inscription et envoyer un courriel transactionnel de bienvenue.',
  '8fe3cf7e':
    'Rédiger et publier un tweet sur X, éventuellement en réponse ou avec des restrictions de réponse.',
  '8fe590c4':
    'Parcourir une section de site Web avec Tavily et rassembler le contenu des pages correspondant à des règles de chemin.',
  '8ff30c6d':
    'Repérer les demandes ServiceDesk Plus qui ont dépassé leur échéance de SLA et les escalader avec une priorité plus élevée et un responsable.',
  '90287e0b':
    'Récupérer un secret (clé d’API, jeton ou identifiant) dans un coffre 1Password pour le transmettre à une étape suivante.',
  '903b943a':
    'Désactiver un utilisateur Okta et retirer ses appartenances aux groupes lors d’un départ.',
  '903e2eff':
    'Réexécuter une exécution Dagster en échec à partir du point de défaillance et confirmer que la nouvelle exécution a démarré.',
  '904ef160': 'Consigner un échange par courriel dans HubSpot et l’associer à un contact.',
  '90886126':
    'Publier une alerte ou une notification mise en forme dans une conversation ou un canal Telegram.',
  '90b4824e':
    'Lister les piles CloudFormation avec leur état, leur région et leurs ressources pour dresser un inventaire unique de l’infrastructure déployée.',
  '90d293cf':
    'Convertir une adresse en coordonnées de latitude et de longitude, avec une adresse normalisée mise en forme.',
  '9134e1cf':
    'Créer un soundbite (bite) Fireflies qui isole un moment clé d’une transcription pour le partager.',
  '917d5d2c':
    'Lire des lignes d’un Google Sheet, avec filtrage facultatif selon la valeur d’une colonne.',
  '91ca0684':
    'Dresser le profil d’un utilisateur Reddit à partir de ses publications, de ses commentaires et de son karma publics.',
  '91d16cb4':
    'Piloter un agent de navigateur pour accomplir une tâche en plusieurs étapes sur un site Web, comme naviguer, cliquer et soumettre. Utiliser lorsqu’un site n’a pas d’API et qu’une personne ferait normalement les clics.',
  '9229f1ef':
    'Produire un rapport sur la taille des index Splunk, leur rétention et le volume d’événements.',
  '92505572': 'Lire les soldes du grand livre et des périodes comptables.',
  '9280a03f':
    'Vérifier qu’une commande existe par SSH avant de l’exécuter, de sorte que les dépendances manquantes provoquent un échec explicite.',
  '93430844': 'Modérer un subreddit : examiner le contenu signalé et agir en fonction des règles.',
  '9367b285':
    'Consulter les créneaux libres d’un type d’événement Cal.com sur une plage de dates. Utiliser avant une réservation pour proposer au participant des heures valides.',
  '939ccb5f':
    'Créer, mettre à jour, activer, désactiver ou supprimer des planifications cron Trigger.dev pour une tâche, délimitées par ID externe.',
  '9428f51f':
    'Soumettre une entrée à un formulaire Jotform, en résolvant d’abord les ID de questions à partir de la définition du formulaire.',
  '94a58bb1':
    'Ajouter des lignes à une liste SharePoint, en créant d’abord la liste si elle n’existe pas encore.',
  '94b93066':
    'Trouver un créneau libre pour un type d’événement Calendly et y inscrire un invité. Utiliser pour planifier une rencontre de bout en bout sans envoyer de lien à l’invité.',
  '94c617a6':
    'Récupérer le contact associé à un billet Zoho Desk et publier un résumé du contexte client en note interne.',
  '94c96901':
    'Trouver un courriel ou un numéro de téléphone vérifié pour un prospect avec Sixtyfour AI.',
  '94cec54b':
    'Étudier la stratégie de recherche payante d’un concurrent dans Semrush, y compris les mots-clés sur lesquels il enchérit et les textes d’annonces qu’il diffuse.',
  '94e64cfa':
    'Mettre sur pied un projet d’intégration Rocketlane à partir d’un modèle lorsqu’une transaction est conclue : créer le projet, appliquer le modèle, attribuer des rôles provisoires et ajouter l’équipe du compte. À utiliser pour les démarrages déclenchés par le CRM.',
  '950724a5':
    'Lister les candidats et les candidatures par statut ou par poste dans Ashby et résumer la santé du processus de recrutement. Utiliser pour les stand-up de recrutement et les rapports hebdomadaires.',
  '951b0b9c':
    'Créer un formulaire Jotform à partir d’une liste de champs, puis vérifier que les questions ont été créées comme prévu.',
  '952f62f1':
    'Lister les demandes de vérification Persona en attente de révision manuelle, puis les approuver ou les refuser après évaluation.',
  '95a260fc':
    'Créer et confirmer une intention de paiement Stripe pour encaisser un montant auprès d’un client.',
  '95ca0325':
    'Lire les réponses d’un Google Form et résumer les tendances, le sentiment et les constats notables.',
  '96128cb6':
    'Créer un billet Intercom à partir d’une conversation et consigner les détails clés du problème.',
  '9643ffb1':
    'Télécharger un fichier qu’un répondant a téléversé dans un champ de téléversement de fichier Typeform.',
  '9694afcf':
    'Passer un PDF, une image ou un fichier Office dans l’OCR de Pulse et retourner du Markdown propre.',
  '96d420b2': 'Ajouter une entrée à la note quotidienne périodique d’Obsidian.',
  '96ed5caf':
    'Trouver un utilisateur dans Amplitude à partir de son identifiant et récupérer son activité récente ainsi que les propriétés de son profil.',
  '9750f5d5':
    'Découvrir les données disponibles en listant les catalogues de données, les bases de données et les tables, puis en lisant les colonnes et les clés de partition d’une table avant d’écrire du SQL. Utiliser lorsqu’un agent doit ancrer une requête dans le schéma réel.',
  '9795d896':
    'Retirer un appareil géré sélectionné après qu’un administrateur a explicitement approuvé la suppression des données de l’entreprise.',
  '97a55acf':
    'Vérifier une affirmation à l’aide des résultats de DuckDuckGo afin de la confirmer ou de la signaler comme non étayée.',
  '97d08f25': 'Ajouter une nouvelle ligne à une table AppSheet en réaction à un événement externe.',
  '97e11794':
    'Inventorier le contenu WordPress en cherchant et en listant les articles et les pages pour repérer des lacunes ou des problèmes.',
  '97e9ac04':
    'Lister les vulnérabilités Vanta qui approchent de leur échéance de SLA, avec les actifs touchés.',
  '986ce5c4':
    'Récupérer les statistiques Instagram d’un compte ou d’un média à des fins de rapports et d’analyse.',
  '98967a41':
    'Rechercher des données firmographiques selon un profil de client idéal et verser l’ensemble complet des résultats, page par page, dans une liste. Utiliser pour la planification de territoires et de campagnes.',
  '989aae69':
    'Comparer deux références, résumer les modifications fusionnées et publier une version GitLab avec des notes générées.',
  '98cca5b0':
    'Vérifier les soldes des comptes de trésorerie Brex et l’activité récente de ces comptes.',
  '98d33793':
    'Envoyer à Amplitude un événement de comportement avec des propriétés d’utilisateur et d’événement à des fins d’analyse.',
  '9914dbc4':
    'Lister les exécutions récentes de Dagster, faire ressortir les échecs et extraire les journaux pour diagnostiquer la cause d’un échec.',
  '993a6482':
    'Récupérer les prix et les cotes actuels d’un événement Kalshi et résumer les probabilités implicites.',
  '996552f4':
    'Exercer un droit de la personne concernée (accès, suppression) dans Ketch et suivre la demande.',
  '99f9274c':
    'Créer une page d’état publique pour un ensemble de moniteurs, avec un logo en option, et partager l’URL publique. À utiliser pour communiquer l’état des services à l’externe.',
  '9a6b3d2a':
    'Récupérer un secret nommé dans Infisical pour l’utiliser comme identifiant d’accès pendant l’exécution d’un flux de travail.',
  '9a80ac31':
    'Récupérer un enregistrement précis dans Amazon RDS à partir d’un identifiant et retourner ses champs.',
  '9a8f4b76':
    'Téléverser un fichier de données dans un bac à sable Daytona, l’analyser avec Python et télécharger les résultats générés. À utiliser pour des analyses CSV/JSON qui exigent un vrai calcul.',
  '9aa19b40':
    'Envoyer un code de vérification à usage unique par SMS pour l’authentification à deux facteurs.',
  '9ac644e5':
    'Enrichir de nombreuses personnes ou entreprises en un seul appel grâce à l’enrichissement en lot de People Data Labs.',
  '9afd7694':
    'Lister les alertes Rootly ouvertes, en accuser réception et les escalader en incident au besoin.',
  '9b2cff99':
    'Repérer les actifs ServiceDesk Plus attribués à un employé qui part et les faire passer à l’état de récupération, avec une demande pour les collecter.',
  '9b44544c':
    'Ajouter ou mettre à jour des contacts marketing et les placer dans une liste SendGrid précise pour un segment de campagne.',
  '9b60d736':
    'Soumettre une demande de changement ServiceNow et la mener à travers sa machine d’états d’approbation.',
  '9b8d20c3':
    'Créer un candidat et une candidature à partir d’une fiche de demande de recrutement approuvée.',
  '9bb3e2e3':
    'Rechercher dans le coffre Obsidian les notes correspondant à une requête et résumer les résultats.',
  '9bdb8b34':
    'Trouver et vérifier le courriel professionnel d’un prospect, et au besoin son numéro de mobile, avec Prospeo.',
  '9c25b9d6':
    'Extraire les événements derrière un problème Sentry pour inspecter les utilisateurs touchés, les environnements et le contexte.',
  '9c97b4a7':
    'Récupérer les souvenirs Mem0 enregistrés d’un utilisateur, au besoin sur une période donnée, afin de vérifier ce qui est connu.',
  '9cb47395':
    'Récupérer l’activité de réponses récente de Lemlist, classer chaque réponse selon l’intention et faire ressortir celles qui nécessitent une intervention humaine.',
  '9d4b6aa3':
    'Surveiller les déploiements AWS AppConfig en cours pour un environnement et signaler les retours en arrière ou les déploiements bloqués afin qu’on puisse intervenir.',
  '9d5ca616':
    'Créer, consulter et lister les requêtes enregistrées (nommées) dans Athena afin de normaliser le SQL réutilisable. Utiliser pour maintenir une bibliothèque de requêtes analytiques validées.',
  '9d7e6144':
    'Comparer votre domaine à ceux de vos concurrents dans Semrush pour trouver les mots-clés sur lesquels ils se classent et pas vous.',
  '9e2e1051':
    'Résumer ce qui s’est passé dans un canal Slack très actif pour se remettre à jour rapidement.',
  '9e614d7f':
    'Définir ou mettre à jour les choix de consentement d’un utilisateur dans Ketch à la suite d’un changement de préférences.',
  '9e6f14c5':
    'Combiner les données firmographiques, les signaux d’intention et les nouvelles de ZoomInfo en un dossier de compte préparatoire à une réunion.',
  '9ed01d55':
    'Appliquer ou retirer des étiquettes d’entités Dynatrace pour que les sélecteurs et les zones restent exacts.',
  '9f4f9370':
    'Construire le tableau du classement d’un championnat de football pour une saison à partir de Sportmonks.',
  '9f56dbb0':
    'Récupérer les réponses d’un formulaire et les classer par thème et par sentiment pour un condensé.',
  '9f90d348':
    'Trouver un compte, un contact, un prospect, une occasion d’affaires ou un dossier et récupérer ses détails actuels dans le CRM.',
  '9facd4a0':
    'Utiliser SQL sur la table des enregistrements de Logfire pour trouver les opérations les plus lentes.',
  '9fc40c31':
    'Associer une entreprise à son identifiant CB Insights et inscrire ses données firmographiques sur la fiche. Utiliser pour compléter les comptes avant la notation, l’acheminement ou la prospection.',
  a0404076: 'Convertir une image matricielle téléversée (PNG ou JPG) en SVG épuré et modifiable.',
  a0552611: 'Déclarer des files RabbitMQ et les lier à un exchange.',
  a05bc41d:
    'Utiliser un modèle conversationnel Hugging Face pour extraire des champs d’un texte non structuré vers un objet structuré.',
  a06f25d4:
    'Fermer les conversations en attente où le client a confirmé que le problème est réglé.',
  a0cabeab:
    'Comparer les rendements d’un fonds à son groupe de référence PitchBook et indiquer le quartile. Utiliser pour le suivi des commanditaires (LP) et la vérification diligente des gestionnaires.',
  a102af4b:
    'Pousser un fichier de politique ACL mis à jour vers le tailnet à l’aide d’écritures protégées par ETag pour éviter d’écraser des modifications simultanées.',
  a144cbf5:
    'Mettre en confinement un hôte CrowdStrike et recueillir des preuves en direct par une session Real Time Response.',
  a15c7f8c: 'Accepter, refuser ou accepter provisoirement une invitation Google Calendar.',
  a170265f: 'Résumer l’avancement du projet à partir d’éléments de travail paginés.',
  a1972b25:
    'Envoyer un message modèle WhatsApp pour rappeler à un contact un rendez-vous ou une réservation à venir.',
  a1b1dc91:
    'Lister les utilisateurs et les rôles IAM ainsi que leurs politiques associées pour produire un audit des accès. À utiliser pour les revues de sécurité et les vérifications du moindre privilège.',
  a1fd10ac:
    'Énumérer les équipes, les conversations et les canaux accessibles au compte Microsoft connecté avant d’agir sur eux.',
  a2974279:
    'Ouvrir une conversation Instagram Direct et envoyer une réponse textuelle au destinataire.',
  a2b85ad3:
    'Trouver les billets Zoho Desk dont la date limite de réponse est dépassée ou proche, et les escalader avec une priorité plus élevée et un responsable.',
  a2d57448:
    'Enregistrer une seule fois une instruction SQL paramétrée et l’exécuter en toute sécurité avec des valeurs différentes chaque fois. Utiliser pour les rapports récurrents et les consultations pilotées par un agent, lorsque les entrées changent, mais pas le SQL.',
  a2e80948:
    'Répondre aux demandes d’autorisation qu’un Managed Agent soulève avant d’exécuter un outil contrôlé. À utiliser lorsque l’agent est configuré pour demander avant d’agir et qu’une personne ou une politique tranche chaque appel.',
  a34a162b: 'Examiner la profondeur des files RabbitMQ, les consommateurs et la santé du broker.',
  a393f6c1:
    'Résumer la file ServiceDesk Plus actuelle par statut, priorité et technicien en un condensé pour l’équipe.',
  a3ccda77:
    'Récupérer les faits saillants des sessions LogRocket de l’utilisateur qui a signalé un bogue et les transformer en étapes de reproduction.',
  a3dd737d:
    'Créer ou mettre à jour un enregistrement CRM standard de Dynamics 365 tout en préservant les champs propres à l’organisation.',
  a4079682:
    'Déclencher le déploiement d’un service Railway pour un environnement et un commit donnés.',
  a48c284d: 'Repérer une exécution Hex de longue durée ou bloquée et l’annuler.',
  a4a3bad0:
    'Effectuer une recherche sur le Web avec TinyFish et récupérer les meilleures pages en Markdown propre. À utiliser pour rassembler des sources à jour avant de rédiger ou de répondre.',
  a4bfa1ff:
    'Prendre du contenu nouveau ou mis à jour et l’envoyer dans un index Algolia sous forme d’enregistrements interrogeables.',
  a4d2391b:
    'Déclencher un extracteur de jeux de données préconçu de Bright Data pour une extraction structurée sur de nombreuses URL et récupérer les résultats. Utiliser pour obtenir en lot des données structurées de sites comme le commerce en ligne ou les réseaux sociaux.',
  a5106050:
    'Ajouter un commentaire à une carte Trello pour laisser une note, un rappel ou une mise à jour d’état.',
  a5897b1a:
    'Générer un court extrait vocal de marque, comme un message d’accueil téléphonique (IVR), une salutation ou une notification.',
  a5e7e490:
    'Exécuter une requête SQL sur un magasin de données d’événements CloudTrail Lake, attendre la fin de l’exécution et retourner les lignes. Utiliser pour des questions d’audit agrégées qui couvrent plus de 90 jours.',
  a63b6b9b:
    'Extraire un document avec l’OCR de Pulse et le découper en segments afin de l’indexer pour la recherche.',
  a63cc42b:
    'Récupérer un article ArXiv précis à partir de son identifiant et en produire un résumé structuré de la contribution, de la méthode et des résultats. Utiliser pour assimiler rapidement un seul article.',
  a6838b91:
    'Commander un article du catalogue ServiceNow et suivre l’article demandé qui en résulte.',
  a6f1cce4:
    'Créer une activité Pipedrive, comme un appel, une réunion ou une tâche, liée à une transaction ou à un contact.',
  a7042d28:
    'Lire les sujets d’abonnement d’un utilisateur dans Ketch et les mettre à jour pour respecter une adhésion ou un retrait.',
  a714457f:
    'Désactiver instantanément un indicateur de fonctionnalité en production pendant un incident et confirmer qu’il est bien désactivé.',
  a7253f26:
    'Envoyer à LangSmith un lot d’exécutions de flux de travail terminées en un seul appel à des fins d’observabilité.',
  a740904a:
    'Inspecter l’historique des tâches Snowflake, diagnostiquer les exécutions en échec, et suspendre ou reprendre une tâche.',
  a797dcde:
    'Auditer un profil de liens entrants dans Semrush et rapporter l’autorité, les domaines référents et la répartition des textes d’ancrage.',
  a7af7d67:
    'Récupérer les alertes Splunk actuellement déclenchées et en faire un résumé de triage.',
  a7dcebd7:
    'Lister les schedules et les sensors Dagster, et les démarrer ou les arrêter pour contrôler l’exécution automatisée des pipelines.',
  a8d3de29:
    'Obtenir le statut d’une session Devin et ses messages récents, puis résumer ce qu’elle a accompli ou ce qui la bloque.',
  a8d98de8:
    'Auditer qui peut accéder à une application Okta par des attributions directes et par groupes.',
  a90993e1:
    'Trouver un élément du CMS Webflow et mettre à jour des champs précis sans toucher au reste.',
  a960a231:
    'Parcourir (crawl) un site entier ou une section avec Firecrawl et retourner le contenu des pages pour l’indexation ou l’analyse.',
  a97f59ac:
    'Lister les vidéos TikTok récentes d’un créateur et résumer l’engagement à des fins de rapport.',
  a982f6d7: 'Tenir à jour la documentation du projet en parallèle des éléments de travail.',
  aa3b500d:
    'Analyser un document téléversé avec Extend, en identifier le type et l’acheminer vers le bon traitement en aval.',
  aa4ea422:
    'Rassembler le portrait complet d’un hôte ou d’un service : propriétés, métriques, événements et journaux.',
  aa558788:
    'Lister les éléments d’une collection Webflow et signaler les champs manquants ou périmés à corriger.',
  aa96a192:
    'Lister les modèles sémantiques et décrire uniquement les métadonnées accessibles au compte connecté.',
  aab0a4fb:
    'Extraire les publications les plus populaires et les plus controversées d’un subreddit pour un dossier de contenu ou de recherche.',
  aaecfa95:
    'Envoyer un signal à un workflow Temporal en cours d’exécution et confirmer qu’il a été livré.',
  ab8b17f2:
    'Compiler un rapport d’état de livraison pour l’ensemble des projets Rocketlane : phases, progression des tâches, travaux en retard et éléments à risque. À utiliser pour les synthèses hebdomadaires et les mises à jour à la direction.',
  abc17150: 'Générer une présentation soignée à partir d’un sujet ou d’un plan avec Gamma.',
  ac214da8:
    'Lire la conversation d’un billet Zoho Desk et publier une réponse suggérée en commentaire privé pour qu’un agent la révise.',
  ac5bb63b:
    'Récupérer les documents signés joints aux contrats d’Agiloft afin de les archiver ou de les examiner ailleurs.',
  ac83260e:
    'Enrichir la fiche d’une entreprise à partir d’un nom, d’un site web ou d’une URL LinkedIn pour obtenir ses données firmographiques avec People Data Labs.',
  ac9925c3:
    'Insérer ou mettre à jour dans une collection Qdrant des points vectoriels avec leurs métadonnées de charge utile.',
  acb27b01:
    'Copier un index Algolia vers une sauvegarde horodatée avant d’appliquer une modification risquée de paramètres ou de données.',
  ad30d8f1:
    'Rechercher dans Gmail les messages correspondant à une requête et en extraire les renseignements voulus.',
  ad58515b:
    'Récupérer les PR, les commits et les billets récents d’un dépôt GitHub et produire un condensé d’activité concis.',
  ad68c93a: 'Lister les appels Twilio Voice récents, filtrés par numéro, état et plage de dates.',
  ae00160d:
    'Créer un nouvel ensemble de données et une nouvelle table BigQuery avec un schéma défini pour un nouveau pipeline ou une nouvelle destination de journalisation.',
  ae020294:
    'Lister les enveloppes en attente de signature, repérer celles qui sont en souffrance au-delà d’un seuil et indiquer qui doit encore signer.',
  ae6cf92a:
    'Créer une annotation Grafana qui marque un déploiement ou un incident afin qu’elle s’affiche dans les tableaux de bord.',
  ae86749e:
    'Créer ou mettre à jour de nombreux enregistrements Dataverse en une seule opération par lot.',
  af7bca85:
    'Résumer l’état de santé de chaque connexion Fivetran d’un compte ou d’un groupe. À utiliser pour les revues quotidiennes de la plateforme de données.',
  b0839c1b:
    'Convertir des ID ou des URN de personnes Harmonic en fiches de contact uniformes pour la notation et l’acheminement.',
  b0b011a0:
    'Récupérer les billets terminés et ouverts du cycle actif et produire un condensé de l’avancement du sprint.',
  b0cee6ca:
    'Rassembler une occasion d’affaires HubSpot et ses lignes de produits pour monter un sommaire de soumission.',
  b0df2eac:
    'Passer en revue une page limitée d’occasions d’affaires Dynamics 365 et repérer celles qui demandent de l’attention.',
  b10e5cb7:
    'Trouver le courriel professionnel vérifié d’un prospect à partir de son nom et de son entreprise, ou d’une URL LinkedIn.',
  b138ea38:
    'Ajouter un nouveau collègue aux bons groupes Hex à l’embauche, ou le désactiver et le retirer à son départ.',
  b17ef851:
    'Envoyer un document Box pour signature électronique et confirmer la demande. Utiliser pour les contrats, les ententes de confidentialité (NDA) et les formulaires d’approbation qui exigent un signataire.',
  b1b4b83d:
    'Publier une image JPEG sur Instagram avec une légende facultative et un texte de remplacement pour l’accessibilité.',
  b1b6260d:
    'Trouver la plus récente conférence téléphonique sur les résultats d’une entreprise dans Quartr et retourner son résumé généré par IA, avec les sources.',
  b1b63951:
    'Détecter les services actuellement hors service et en aviser l’équipe. À utiliser pour transformer les incidents UptimeRobot en alertes exploitables.',
  b2176ddb:
    'Rembourser et révoquer un abonnement Google Play pour donner suite à une demande de soutien à la clientèle.',
  b2e5261d:
    'Rechercher dans le jeu de données de personnes de People Data Labs selon le poste, le lieu ou l’entreprise, avec SQL ou Elasticsearch DSL.',
  b2f89681:
    'Lire un billet Zendesk, le classer et mettre à jour en conséquence la priorité, les étiquettes et la personne responsable.',
  b31cf4b0: 'Planifier et suivre un sprint à l’aide des cycles de Plane.',
  b3218c0e:
    'Faire avancer l’étape d’une opportunité Salesforce et consigner le changement pour le compte.',
  b3271c90: 'Créer ou fusionner des nœuds et les relier par une relation dans Neo4j.',
  b36e0f05:
    'Désactiver la transition d’une étape CodePipeline pour geler les déploiements durant un incident, puis la réactiver une fois l’incident résolu.',
  b39f2df7:
    'Rechercher les billets ouverts avec JQL et proposer des responsables, des priorités et des étiquettes.',
  b41c3ee8:
    'Créer et réviser une demande de déploiement Vitess pour une modification de schéma préparée.',
  b434bed2:
    'Créer ou mettre à jour des prospects Pipedrive avec leur valeur, leurs contacts et la date de clôture prévue.',
  b4de3778:
    'Envoyer un courriel transactionnel par AWS SES à un ou plusieurs destinataires. À utiliser pour les alertes, les confirmations et les notifications ponctuelles d’un flux de travail.',
  b4eb38bc:
    'Rechercher dans Google Drive avec la syntaxe de requête pour repérer des fichiers par nom, type, contenu ou date.',
  b524d5a5:
    'Inspecter les tables et les colonnes Snowflake pour une revue de schéma ou la détection de dérive.',
  b5f857fa:
    'Récupérer une seule URL avec Firecrawl et retourner le markdown propre du contenu principal pour qu’un agent le lise.',
  b608e895:
    'Chercher les tâches d’un projet Asana et résumer l’état d’avancement, les éléments en retard et qui est responsable de quoi. Utiliser pour les stand-up et les points d’étape sur les projets.',
  b69eaf3e:
    'Joindre une image ou une vidéo à une publication Buffer à partir d’un fichier téléversé, de la sortie d’un bloc précédent ou d’une URL publique. Utiliser pour le contenu visuel.',
  b6a49588:
    'Écrire une note dans la fiche d’un contact Wealthbox pour consigner les détails d’une rencontre ou d’un appel.',
  b6dc86a6:
    'Lister les modèles accessibles avec un jeton mandataire Modal et vérifier que chacun répond. À utiliser pour les audits d’accès et les contrôles de santé des points de terminaison.',
  b6ea0b60:
    'Analyser une page sur mobile et sur ordinateur de bureau et comparer les scores et les indicateurs.',
  b6ea733f: 'Résumer les appareils gérés non conformes et la fraîcheur de leur statut.',
  b6fe60d8:
    'Récupérer les constats de conformité de Systems Manager pour un nœud géré et expliquer ce qui est non conforme. À utiliser lorsqu’un tableau de bord de conformité signale une ressource et que quelqu’un a besoin du détail.',
  b70ee730:
    'Trouver qui peut vous présenter à une entreprise cible, selon la force des relations, l’historique de travail commun ou l’historique d’investissement. Utiliser avant une prospection à froid.',
  b7a352b8:
    'Lire la configuration d’une application à partir d’un chemin hiérarchique de Parameter Store afin qu’un flux de travail puisse agir sur des paramètres à jour. À utiliser pour charger la configuration d’environnement sans la coder en dur.',
  b7ab8885:
    'Lister, arrêter et supprimer des bacs à sable Daytona pour maîtriser les coûts et faire le ménage dans les environnements. À utiliser pour un nettoyage planifié ou pour vérifier ce qui est actuellement en cours d’exécution.',
  b7c35a1c:
    'Trouver un courriel professionnel vérifié pour un contact à partir de son nom complet et du domaine de son entreprise, grâce à l’enrichissement Work Email.',
  b84261c7:
    'Parcourir page par page un instantané complet d’une table Convex avec List Documents jusqu’à ce que hasMore soit false.',
  b8644066:
    'Créer ou mettre à jour une fiche de personne, d’entreprise ou de transaction dans Attio en faisant la correspondance sur un champ clé pour éviter les doublons. Utiliser pour synchroniser des données externes dans le CRM.',
  b88a1d7f:
    'Utiliser un programme DSPy Chain of Thought pour répondre à une question avec un raisonnement explicite.',
  b8a76d28: 'Classer un billet HubSpot, définir sa priorité et l’associer à la bonne entreprise.',
  b90134ce:
    'Lancer une longue recherche Splunk, l’interroger jusqu’à son terme, puis paginer les résultats.',
  b90a0b05:
    'Rechercher sur YouTube des vidéos sur un sujet, avec des filtres de durée, de récence et de qualité.',
  b92f799f:
    'Utiliser AWS STS assume role with SAML pour échanger une assertion SAML 2.0 d’un fournisseur d’identité d’entreprise contre des identifiants AWS de courte durée, pour les scénarios d’authentification unique en entreprise.',
  b9418891:
    'Créer des fournisseurs QuickBooks approuvés avec des champs de contact et de formulaire 1099 encadrés.',
  b96a252d:
    'Incorporer et insérer des enregistrements de texte dans un espace de noms Pinecone grâce aux incorporations intégrées.',
  b9a8518c:
    'Trier une plage ou un tableau selon une colonne et effacer les cellules périmées pour garder la feuille propre.',
  b9d0c202:
    'Récupérer une demande de tirage (PR) GitHub, ses fichiers modifiés et son diff, puis publier un commentaire de révision structuré.',
  b9d8480b:
    'Interroger une table ou un index DynamoDB par clé de partition, avec des filtres facultatifs, et retourner les éléments correspondants.',
  ba017050:
    'Lire un canal de stand-up et publier un récapitulatif structuré des progrès, des plans et des obstacles.',
  ba16d13a:
    'Transformer une demande ServiceDesk Plus résolue et ses notes en une solution de base de connaissances.',
  ba3f0fb2:
    'Rédiger et publier une réponse utile, fidèle à la marque, à une publication ou à un commentaire Reddit.',
  baca625a:
    'Rafraîchir en lot une table d’entreprises en miroir à partir de CB Insights sans épuiser les crédits. Utiliser pour garder une copie locale à jour.',
  bae32778:
    'Lire une valeur d’Upstash Redis par clé, en indiquant s’il y a eu succès ou échec du cache.',
  bb1f7845:
    'Interroger le journal système Okta pour repérer les échecs de connexion et les authentifications suspectes.',
  bbb04904:
    'Résumer les conversations Help Scout ouvertes par boîte de réception, responsable et temps d’attente.',
  bbc189cb:
    'Vérifier que des journaux de suivi CloudTrail existent, qu’ils enregistrent bien et qu’ils sont configurés pour capturer les événements qu’exige un audit. Utiliser pour la collecte de preuves SOC 2 et ISO.',
  bbc2b359:
    'Lire un Google Doc et produire un résumé concis avec les points clés et les actions à mener.',
  bc702ecd: 'Générer un diagramme SVG qui visualise des données structurées, puis le partager.',
  bc73abb6:
    'Téléverser un rapport généré vers le serveur SFTP d’un partenaire sous un chemin daté.',
  bc8123f1:
    'Marquer un déploiement dans Dynatrace et comparer les métriques du service avant et après celui-ci.',
  bc8bda35:
    'Créer une nouvelle clé d’accès IAM pour un utilisateur et supprimer l’ancienne afin d’effectuer une rotation sûre. À utiliser pour la rotation planifiée des clés et la correction des clés trop anciennes.',
  bd23ed64:
    'Cataloguer les rapports accessibles de l’espace de travail et leurs liens, sans présumer que chaque rapport a un modèle sémantique.',
  bd3e488e:
    'Transformer une demande ou un message entrant en une tâche Asana bien formée dans le bon projet, avec responsable et échéance. Utiliser pour la réception des demandes et la création de billets.',
  be056292:
    'Trouver des lieux d’un type donné dans un rayon autour d’une coordonnée, classés par popularité ou par distance, sans requête textuelle.',
  be9cf92c:
    'Créer un jeton de point d’attente Trigger.dev sur lequel une tâche peut attendre, puis le compléter avec les données d’approbation une fois qu’une personne a décidé.',
  bebd5ce6:
    'Vérifier si une affirmation est appuyée par le contenu de Wikipedia et signaler les affirmations non étayées.',
  bee34840:
    'Créer un article WordPress à partir d’un brouillon, lui attribuer des catégories et des étiquettes, et définir son état de publication.',
  bee36dc0: 'Lire les valeurs d’énumération (liste de choix) d’une propriété HubSpot.',
  bf1ad431:
    'Lancer une recherche Web avec Firecrawl, puis récupérer les meilleurs résultats pour produire une note de recherche avec citations.',
  bf5f7002:
    'Interroger une collection MongoDB avec un filtre et retourner les documents correspondants.',
  bf6547bd: 'Déclencher la réinitialisation du mot de passe Okta d’un utilisateur verrouillé.',
  c01659a9:
    'Joindre à une fiche Attio une note qui consigne un appel, une rencontre ou une mise à jour. Utiliser pour garder le contexte du CRM à jour après les interactions.',
  c0381a8b:
    'Mettre en file une exécution d’agent TinyFish sans attendre, puis l’interroger ou l’annuler par ID. À utiliser pour les automatisations trop longues pour garder une étape de flux de travail ouverte.',
  c0878ecf: 'Vérifier si une tâche d’agent Flint est en cours, terminée ou en échec.',
  c0e653f4:
    'Récupérer les articles récents d’un auteur sur ArXiv et signaler les nouveaux travaux depuis la dernière vérification. Utiliser pour suivre des chercheurs ou des laboratoires précis.',
  c0fd018b: 'Téléverser un fichier généré dans un compartiment S3 et retourner l’URL de l’objet.',
  c1192aed:
    'Planifier la suppression d’un secret dans AWS Secrets Manager avec un délai de récupération pour pouvoir le restaurer au besoin. À utiliser pour mettre hors service en toute sécurité des identifiants inutilisés ou remplacés.',
  c2969ce8:
    'Trouver les subreddits les plus pertinents pour un sujet avant de publier ou de surveiller.',
  c2a1c55d:
    'Créer ou mettre à jour une organisation Clerk, gérer ses adhésions et inviter de nouveaux membres. Utiliser pour mettre en place une nouvelle équipe ou un nouveau locataire dans une application multilocataire, ou pour l’arrivée et le départ de membres.',
  c32174f3: 'Produire une copie traduite d’un document Word sans modifier l’original.',
  c387ab1a:
    'Classer les nouveaux enregistrements Airtable (prospects, billets, demandes) et attribuer un responsable, une priorité et des échéances.',
  c3a79bae: 'Indiquer l’état actuel des déploiements de schéma Vitess en file d’attente.',
  c3a8266d:
    'Utiliser NRQL pour ventiler une hausse soudaine des erreurs dans New Relic par type et par transaction touchée.',
  c3ccb896:
    'Enrichir par lots une liste de personnes ou d’entreprises avec l’enrichissement en lot de Prospeo.',
  c3d5fda1:
    'Transformer les métadonnées accessibles du dictionnaire Oracle en documentation lisible du schéma.',
  c3e69224:
    'Ajouter du contenu à un Google Doc existant, comme un journal continu ou une section de rapport.',
  c3ff7cc4:
    'Récupérer tous les enregistrements DNS d’une zone Cloudflare et signaler les erreurs de configuration, les enregistrements orphelins et les modifications d’enregistrements sensibles.',
  c406969b: 'Ajouter une ligne à une base de données Notion avec les bonnes valeurs de propriétés.',
  c46f3b83:
    'Trouver des pages Web qui correspondent à une intention décrite avec Bright Data Discover, en récupérant au besoin le contenu des pages. Utiliser pour rassembler des sources sur un sujet sans formuler de requêtes exactes.',
  c4765bf9:
    'Rassembler la trousse de marque (logo, couleurs, polices) d’un prospect ou d’un client pour personnaliser des présentations, des courriels ou des portails. Utiliser avant une prospection personnalisée ou un travail de conception.',
  c4e2ee9d:
    'Enrichir une personne connue avec ZoomInfo pour compléter son titre, son courriel et les données de son entreprise, vérifiés.',
  c4e5666f:
    'Envoyer par courriel des invitations à un événement Luma à une liste de prospects, avec un message personnalisé facultatif.',
  c5118747: 'Rapporter l’atteinte des SLO, le budget d’erreur restant et le taux de consommation.',
  c51b7b5b:
    'Révéler le courriel et le téléphone vérifiés d’une personne connue au moyen de la révélation individuelle de Wiza.',
  c524f519:
    'Créer et réviser des estimations QuickBooks encadrées à partir de détails de soumission approuvés.',
  c563a04f:
    'Parcourir les demandes ouvertes d’une file et signaler celles qui risquent de dépasser le SLA.',
  c59893d2:
    'Auditer les clés et les index Oracle visibles pour repérer les lacunes structurelles et les tables à risque.',
  c5bb5f13:
    'Lancer une tâche d’agent Mintlify pour modifier la documentation et la suivre jusqu’à la demande de fusion.',
  c5f275ca:
    'Annuler une suppression planifiée dans AWS Secrets Manager pour rétablir l’accès à un secret avant la fin de son délai de récupération. À utiliser pour revenir sur une suppression accidentelle ou prématurée.',
  c620f640:
    'Demander une actualisation standard d’un modèle sémantique et consigner son acceptation en vue d’un suivi ultérieur.',
  c6389d9a:
    'Appeler un programme DSPy Predict auto-hébergé pour obtenir une sortie structurée à partir d’une entrée.',
  c64c7120:
    'Trouver une réunion Zoom et mettre à jour son heure, son sujet ou ses paramètres sans la recréer.',
  c68776bd:
    'Transformer une question en langage naturel en requête SELECT T-SQL et retourner les lignes.',
  c69f0c29:
    'Trouver une tâche ClickUp et mettre à jour ses champs (statut, priorité, échéance) ou y ajouter un commentaire d’avancement. Utiliser pour garder les tâches à jour à partir d’autres systèmes.',
  c6ca6457:
    'Consulter une commande client SAP S4HANA et retracer ses livraisons et ses documents de facturation connexes.',
  c6dc66ae:
    'Utiliser AWS STS pour générer des identifiants de session de courte durée, éventuellement appuyés par un jeton MFA, pour les flux de travail d’utilisateur IAM exigeant la MFA. À utiliser pour des sessions à privilèges élevés limitées dans le temps.',
  c6f5807e:
    'Créer une exportation Vault pour un dossier à l’aide d’une requête de recherche, puis récupérer les fichiers exportés.',
  c70e69d7:
    'Repérer les comptes SailPoint non corrélés et préparer un inventaire des comptes orphelins regroupés par source.',
  c7136397:
    'Effectuer une recherche sur le Web en direct avec You.com et fonder une réponse sur des extraits pertinents pour la requête.',
  c7675c6b:
    'Rechercher les occasions d’affaires HubSpot par étape et produire un sommaire de l’entonnoir de vente avec les totaux.',
  c77332e8:
    'Insérer un nouveau document MongoDB ou mettre à jour un document existant repéré par une clé.',
  c7925850:
    'Créer une transaction Pipedrive avec un titre, une valeur, une étape de l’entonnoir de vente et une personne ou une organisation liée.',
  c7a8df01:
    'Remonter d’un pipeline Bitbucket en échec jusqu’à l’étape défaillante et expliquer la cause première la plus probable.',
  c7e8f1c4: 'Ajouter une mise à jour d’état à la chronologie d’un incident Rootly actif.',
  c822715b:
    'Créer une campagne Smartlead de bout en bout (séquence, horaire et paramètres), prête à être lancée par une personne.',
  c83f51f9:
    'Ajouter un utilisateur à un groupe Google Workspace avec un rôle choisi et confirmer son appartenance.',
  c8bca96f:
    'Créer un modèle dynamique SendGrid et une version active avec HTML et une ligne d’objet.',
  c92183fc:
    'Créer une annotation PostHog qui marque un déploiement ou une mise en production sur la chronologie d’analyse.',
  c94ed67c:
    'Lister les documents déposés et les rapports récents d’une entreprise dans Quartr et télécharger les PDF des rapports.',
  ca00d429:
    'Lire un billet Zoho Desk entrant, le classer et définir la priorité, la classification, la catégorie et la personne responsable.',
  cadc83aa:
    'Repérer les tâches Rocketlane en retard ou qui glissent, les marquer à risque et alerter les bonnes personnes. À utiliser pour les automatisations quotidiennes de suivi de la livraison.',
  cae502e2:
    'Examiner les exécutions Trigger.dev en échec et rejouer celles dont les erreurs semblent transitoires (délais dépassés, limites de débit, réseau).',
  cb138cbb:
    'Écrire ou mettre à jour une valeur de Parameter Store dans le cadre d’un changement de configuration contrôlé. À utiliser pour promouvoir un paramètre d’un environnement à l’autre ou appliquer un changement approuvé.',
  cb2e147c: 'Créer un événement de calendrier Outlook et inviter les bonnes personnes.',
  cb3458a5:
    'Créer ou mettre à jour (upsert) un lien court Dub pour chaque ligne d’une liste de destinations, avec un marquage UTM cohérent.',
  cbbe45e2:
    'Supprimer les alertes pendant une maintenance planifiée en créant une fenêtre de maintenance sur les moniteurs touchés. À utiliser avant un déploiement ou une migration.',
  cbc57fcb:
    'Faire avancer un incident ServiceNow : le commenter, mettre à jour ses champs, le résoudre ou le fermer.',
  cbd18051:
    'Extraire, mettre à jour, archiver et réviser un document Windchill dans un cycle de modification contrôlé.',
  cc4f8212: 'Rapporter l’utilisation des budgets et des plafonds de dépenses Brex.',
  cdf961c0: 'Créer un encaissement standard et l’appliquer à une échéance de compte client.',
  ce0d8fb8:
    'Interroger un agent Cursor pour obtenir son état et les mises à jour de la conversation, puis résumer ce qu’il a accompli jusqu’ici.',
  ce449d69:
    'Créer une nouvelle connexion Fivetran et remettre au responsable un lien Connect Card pour l’autoriser. À utiliser lorsqu’une équipe demande une nouvelle source de données.',
  ce715317:
    'Inventorier les applications installées sur une instance Splunk et signaler celles qui sont désactivées.',
  ce80d827:
    'Répondre à une question en langage naturel au moyen d’une requête SELECT Oracle bornée et de ses lignes.',
  cee78910:
    'Lire la transcription d’un appel Gong et en extraire des signaux d’occasion d’affaires prêts pour le CRM, comme le décideur, le concurrent et la prochaine étape.',
  cf15447c:
    'Extraire la performance au niveau des annonces Google Ads et repérer les meilleures et les pires créations dans chaque groupe d’annonces.',
  cfbb25c3:
    'Créer un nouveau Google Doc avec un titre et un contenu mis en forme dans un dossier choisi.',
  d047aaf3:
    'Transformer des notes de rencontre ou une conversation en actions à faire et les ajouter comme lignes dans une table de tâches Coda.',
  d084d047:
    'Convertir un document numérisé ou complexe en markdown propre, prêt pour un LLM, avec Extend.',
  d0ca0e79:
    'Rédiger une réponse à partir des réponses enregistrées de la boîte de réception plutôt que de l’écrire à partir de zéro.',
  d11862f7:
    'Rechercher les nouvelles récentes sur une marque, une personne ou un sujet par Serper et résumer la couverture.',
  d1824dee:
    'Lister les clavardages et les messages récents de Linq, rédiger une réponse pour chaque conversation non lue et l’envoyer.',
  d1a42280:
    'Compiler une source LaTeX en PDF final, en choisissant le bon compilateur et en signalant les erreurs de compilation. À utiliser chaque fois qu’un document soigné, prêt à imprimer, est nécessaire.',
  d1d7a66c:
    'Créer une réunion Zoom avec un sujet, une heure et des paramètres, et retourner les détails pour s’y joindre.',
  d1fa9bae:
    'Capturer les Core Web Vitals d’une ou de plusieurs pages pour alimenter un historique de suivi.',
  d237d131:
    'Trouver les dépenses Brex sans mémo et les remplir à partir des détails du commerçant.',
  d25562c4:
    'Intégrer un nouveau domaine à Cloudflare : créer la zone, ajouter des enregistrements DNS de départ et retourner les serveurs de noms à transmettre pour la délégation.',
  d2791d9c:
    'Rechercher dans un subreddit des mentions d’une marque ou de mots-clés et résumer ce que les gens disent.',
  d331c4f6:
    'Lire le nombre de messages et la configuration d’une file Amazon SQS pour évaluer l’arriéré et la santé des consommateurs.',
  d39a4534:
    'Extraire le contenu textuel d’un fichier Google Drive, en exportant les fichiers Workspace vers un format exploitable.',
  d44bf466: 'Créer un utilisateur Okta, définir son profil et l’ajouter aux bons groupes.',
  d4566ecd:
    'Créer un candidat Checkr et lui envoyer une invitation à une vérification des antécédents pour le bon forfait. Utiliser lorsqu’un candidat est retenu ou reçoit une offre.',
  d4587428:
    'Lancer une recherche Zendesk pour trouver les billets correspondant à des critères d’état, de demandeur ou de mot-clé.',
  d47126ea:
    'Insérer ou mettre à jour des enregistrements de façon atomique selon une clé, avec une instruction MERGE d’Oracle.',
  d48c5565:
    'Exporter les vues, les visiteurs et les statistiques de recherche de Mintlify dans un seul sommaire de la fréquentation.',
  d4946cdd:
    'Répondre à une question sur les données en écrivant et en exécutant une requête KQL, puis l’expliquer.',
  d4b2df56: 'Générer jusqu’à 10 pages Flint à partir d’une page modèle en une seule tâche.',
  d4fc1bc6:
    'Résumer les changements à venir dans ServiceDesk Plus sous forme de calendrier hebdomadaire, avec les responsables et les conflits d’horaire.',
  d52247be:
    'Exécuter un extracteur Apify d’annuaires ou de cartes pour recueillir des fiches d’entreprises et produire une liste de prospects dédoublonnée, prête pour le CRM. Utiliser pour la prospection et la génération de prospects.',
  d559f953:
    'Compléter les champs manquants du profil d’un client Help Scout à partir de sources vérifiées.',
  d5ac410e:
    'Lister les enregistrements récents de conférences Google Meet pour la production de rapports ou l’archivage.',
  d5c26cbf:
    'Envoyer un SMS ou un iMessage depuis un numéro AgentPhone pour aviser un destinataire ou lui faire un rappel.',
  d5db7feb:
    'Télécharger les fichiers distants anciens pour les archiver, puis supprimer les originaux.',
  d61a8f00: 'Résumer le solde de la carte d’entreprise et la capacité de dépense restante.',
  d65b8cf2:
    'Créer ou mettre à jour un utilisateur Clerk avec courriel, nom et métadonnées. Utiliser pour intégrer un utilisateur ou synchroniser dans Clerk des changements de profil provenant d’un autre système.',
  d6b0e87c: 'Marquer un contact Resend comme désabonné et lui envoyer un courriel de confirmation.',
  d6b1b4d9:
    'Faire passer une pièce d’identité émise par un gouvernement dans AWS Textract Analyze ID et retourner des champs d’identité normalisés (nom, date de naissance, numéro de pièce, date d’expiration). À utiliser pour les flux de travail KYC et de vérification d’identité.',
  d6d2c7c3: 'Parcourir une trace Logfire de bout en bout et expliquer ce qui s’est passé.',
  d7a1b0dd:
    'Créer ou lire un contact Wealthbox avec son nom, son courriel et des renseignements généraux.',
  d7c81c38:
    'Comparer les dépenses par fournisseur sur les 30 derniers jours et depuis le début de l’année.',
  d827cdc9: 'Créer, consulter ou mettre à jour la fiche d’un client Shopify.',
  d84917d3:
    'Rechercher dans PitchBook les investisseurs dont les préférences déclarées correspondent à une entreprise, et les classer. À utiliser pour le financement et la prospection auprès de partenaires financiers.',
  d869b6f5:
    'Poser à Greptile une question en langage naturel sur un dépôt indexé et retourner une réponse avec citations.',
  d8757bca: 'Rédiger et envoyer un courriel Outlook à un ou plusieurs destinataires.',
  d87d1abc:
    'Ajouter des utilisateurs précis à un groupe Azure AD (Entra ID), ou les en retirer, à la demande, en dehors des processus d’accueil et de départ. À utiliser pour les changements d’accès ponctuels et les réorganisations d’équipe.',
  d8bba975: 'Créer une nouvelle page SharePoint sur un site avec un titre et un corps de contenu.',
  d8e14365: 'Déterminer pourquoi un message RabbitMQ publié n’a été acheminé vers aucune file.',
  d90414cc:
    'Vérifier la santé du broker RabbitMQ et expliquer ce que signifie une alarme déclenchée.',
  d9663746: 'Analyser un long PDF et produire un résumé concis de ses points clés.',
  d9949d47: 'Envoyer une notification par SMS à un ou plusieurs numéros de téléphone avec Twilio.',
  d9cd30fb:
    'Ajouter ou mettre à jour les enregistrements TXT SPF, DKIM et DMARC dont une zone a besoin pour authentifier les courriels sortants et améliorer la délivrabilité.',
  d9cdf518:
    'Lister les déploiements Vercel récents, repérer les compilations en échec et récupérer leurs journaux.',
  d9dd7611:
    'Envoyer un message à une file FIFO Amazon SQS avec un ID de groupe de messages et un ID de déduplication pour une livraison ordonnée et exactement une fois.',
  da0f28c9:
    'Extraire le résumé d’une réunion Fathom précise et en tirer une liste claire d’actions à mener avec leurs responsables.',
  da6dff6b:
    'Lire les en-têtes et les catégories des postes budgétaires SAP Concur pour voir quelle part de chaque budget est déjà consommée.',
  da6eb80a:
    'Créer un nouvel élément de travail Azure DevOps (Issue, Task ou Epic) avec les bons champs. Utiliser pour consigner des bogues, des tâches ou des fonctionnalités à partir d’un autre système.',
  da7d9e14:
    'Lister et examiner les sessions actives d’un utilisateur Clerk et révoquer les sessions suspectes. Utiliser pour une revue de sécurité ou une déconnexion forcée.',
  da810a6a:
    'Générer un rapport d’exploration (Scouting Report) CB Insights et le transformer en une synthèse lisible. Utiliser avant une rencontre, un investissement ou une discussion de partenariat.',
  da9c2685:
    'Créer une tâche de suivi sur un contact Wealthbox, avec un titre et une date d’échéance.',
  daa86d02:
    'Appliquer un changement d’emploi, comme un transfert ou une promotion, à un employé Workday existant.',
  dab2aea5:
    'Récupérer la transcription d’un appel Gong et produire un compte rendu structuré avec les sujets, les objections et les prochaines étapes.',
  dc800e27:
    'Lire une exécution TinyFish en échec et décider s’il faut la relancer, reformuler l’objectif ou escalader. À utiliser lorsqu’une automatisation retourne FAILED ou qu’un flux de travail consomme des étapes sans produire de résultat.',
  dcce8f93:
    'Récupérer l’historique récent des actions d’un tableau ou d’une carte Trello et le résumer.',
  dce4c4ff:
    'Payer un fournisseur depuis un compte de trésorerie Brex, en créant d’abord le fournisseur au besoin.',
  dd6efbdb:
    'Résumer les billets d’un projet ou d’un sprint regroupés par statut et par responsable.',
  dd7fb4c1:
    'Exécuter une segmentation d’événements Amplitude sur une période et rapporter les comptes uniques et totaux, au besoin regroupés par propriété.',
  de023996:
    'Enrichir un ou plusieurs contacts avec Apollo pour mettre à jour les titres, les courriels, les téléphones et les données d’entreprise. Utiliser pour garder les fiches du CRM exactes avant une prise de contact.',
  de450723:
    'Reconstituer ce qu’un Managed Agent a réellement fait à partir de son historique d’événements. À utiliser pour une revue de conformité, le débogage d’une mauvaise exécution ou le rapport des coûts et de l’utilisation de jetons par exécution.',
  de68d6d9:
    'Examiner et ajuster la taille d’un entrepôt SQL, les limites des grappes et l’arrêt automatique.',
  dea195a3:
    'Regrouper des formulaires et d’autres éléments Jotform sous des étiquettes, en créant d’abord l’étiquette si elle n’existe pas.',
  ded4454b:
    'Utiliser Exa Get Contents pour extraire du texte propre et des résumés à partir d’un ensemble d’URL.',
  df50c98c:
    'Trouver les tours de financement annoncés sur une période et rapporter l’entreprise, le stade, le montant et les investisseurs. Utiliser pour des alertes quotidiennes ou hebdomadaires sur le financement.',
  df5a9335: 'Analyser un schéma et produire une documentation en langage clair de ses tables.',
  df91a48d:
    'Créer un rapport Jotform sur les champs de soumission choisis et retourner son lien de partage.',
  dfa2a616:
    'Détecter un mauvais déploiement Railway et effectuer un retour arrière ou un redémarrage pour rétablir le service.',
  e0420de5:
    'Marquer un message WhatsApp entrant comme lu, afficher un indicateur de saisie et y réagir.',
  e04d6934: 'Faire rapport des candidatures actives par poste et par étape d’entrevue.',
  e05c3785:
    'Résumer les dépenses par carte selon le commerçant et la devise pour une période demandée.',
  e07be97e:
    'Interroger les vulnérabilités CrowdStrike Spotlight et les classer selon la gravité, l’état d’exploitation et l’hôte touché.',
  e0e2da4c:
    'Mettre à jour les prix de variantes sélectionnées sans modifier les autres détails du produit.',
  e0ef0664:
    'Créer une clé d’authentification Tailscale à portée limitée, avec les bonnes étiquettes, la réutilisabilité et l’expiration appropriées pour l’intégration.',
  e116d9eb:
    'Valider un document Windchill et le faire passer par une transition de cycle de vie autorisée.',
  e129a23b:
    'Lister les rencontres Circleback récentes et produire un sommaire structuré des notes, des décisions et des actions à faire.',
  e1393ad1:
    'Exécuter une requête textuelle sur un index Pinecone avec filtrage par métadonnées et reclassement facultatif.',
  e13b5d23:
    'Créer une préembauche, embaucher l’employé et lui attribuer un plan d’intégration dans Workday.',
  e165c6f8:
    'Suivre les factures Rocketlane dont le solde est impayé après l’échéance et rassembler les détails de relance. À utiliser pour les automatisations de finance et de recouvrement.',
  e17fffba:
    'Repérer les demandes ServiceDesk Plus répétées qui ont une cause commune et ouvrir une fiche de problème qui les relie.',
  e1a0c41b:
    'Transformer une demande ou un message entrant en une tâche ClickUp bien formée dans la bonne liste, avec priorité, responsables et échéance. Utiliser pour la réception des demandes et la création de billets.',
  e1c0e016: 'Approuver ou retourner un rapport de dépenses SAP Concur soumis, après examen.',
  e1e8697a:
    'Lister les groupes Okta et leurs membres afin d’auditer les accès dans le cadre d’une revue de sécurité.',
  e202d23e:
    'Demander une synchronisation Intune en distinguant l’acceptation de la demande de son exécution complète par l’appareil.',
  e2285418:
    'Lister les membres d’un groupe Azure AD en vue d’une révision des accès. À utiliser pour l’attestation périodique des groupes privilégiés ou sensibles.',
  e2a38e49:
    'Fusionner dans un seul incident cible les incidents PagerDuty en double issus d’un même événement, afin de réduire le bruit.',
  e2a86b24:
    'Aviser un client par WhatsApp d’un changement d’état de commande, comme l’expédition ou la livraison.',
  e2db1899:
    'Créer dans OneDrive un nouveau fichier texte ou document à partir de contenu généré, dans le bon dossier.',
  e2eac07d:
    'Transformer un article de blogue, une note de version ou une annonce en une publication LinkedIn percutante et la publier.',
  e2f15446:
    'Créer une tâche Microsoft Planner dans un plan et un compartiment précis, avec un titre, une date d’échéance et une personne responsable.',
  e31c6314:
    'Examiner les éléments de certification SailPoint, consigner les décisions d’approbation ou de révocation et signer la certification terminée.',
  e3350aad:
    'Exécuter un document SSM comme AWS-RunShellScript sur des nœuds gérés et recueillir le résultat de chaque nœud. À utiliser pour des diagnostics à l’échelle du parc, la collecte de journaux ou une correction scriptée.',
  e39a913b:
    'Exécuter une requête SQL sur des données dans S3 avec Athena, attendre la fin de l’exécution et retourner les résultats. Utiliser pour des analyses ponctuelles et des rapports sur votre lac de données.',
  e3e37acd:
    'Répondre à une question à l’aide d’un site de documentation Mintlify et citer les pages utilisées.',
  e3e5cf26:
    'Faire passer les documents Windchill remplacés à un état de cycle de vie obsolète plutôt que de les supprimer.',
  e3f235ea:
    'Lancer un agent infonuagique Cursor sur un dépôt GitHub avec une consigne de tâche claire et rapporter l’identifiant de l’agent et son état de départ.',
  e4534514:
    'Composer une liste de lectures thématique et soigneusement choisie, avec des résumés, à partir des résultats de recherche de Google Books.',
  e4638bd1: 'Rechercher un sujet dans l’espace de travail Notion et résumer les pages pertinentes.',
  e4c247a2:
    'Lire une conversation Otter et rédiger un compte rendu avec le résumé, les décisions et les actions à mener, avec leurs responsables.',
  e4d12fef:
    'Créer et planifier une publication Buffer sur un canal, soit en file d’attente, soit immédiatement, soit à une heure précise. Utiliser pour publier du contenu sur les réseaux sociaux.',
  e4d39f53:
    'Envoyer une tâche à un Managed Agent de Claude Platform et attendre sa réponse finale. À utiliser pour un travail autonome où seul le résultat compte, et non les étapes intermédiaires.',
  e4d5a865:
    'Exécuter une requête HogQL dans PostHog pour répondre à une question d’analyse de produit.',
  e519d9da:
    'Créer un nouveau Google Form et y ajouter des questions par mise à jour groupée (batch update).',
  e5ebf41f:
    'Mettre à jour des champs d’un contact Google Contacts existant, comme le courriel, le téléphone ou le titre du poste.',
  e5ff9b3c:
    'Protéger un chemin d’API contre les abus avec une règle de limitation de débit Cloudflare, en utilisant l’API actuelle de limitation de débit fondée sur Rulesets.',
  e630cedb:
    'Appeler un point de terminaison d’API Pipe Tinybird publié avec des paramètres dynamiques et retourner le résultat.',
  e68e2ee3:
    'Soumettre une liste d’adresses courriel à la vérification Findymail et la répartir entre adresses délivrables et non délivrables.',
  e6b39591:
    'Résumer la conformité des correctifs sur les nœuds gérés et examiner en détail les correctifs manquants d’un nœud précis. À utiliser pour les revues mensuelles de correctifs et le suivi des vulnérabilités.',
  e6f81b09:
    'Encaisser un paiement Square à partir d’une source de paiement et confirmer le résultat.',
  e7011395:
    'Examiner les exécutions de requêtes récentes et les chargements de fichiers en zone de transit pour expliquer un échec.',
  e723d6cb:
    'Enrichir une entreprise par domaine ou par nom pour obtenir ses données firmographiques depuis Wiza.',
  e7332044: 'Créer un produit Shopify et y ajouter des variantes avec leur prix.',
  e79b6d8e:
    'Récupérer les rapports de campagne Mailchimp et résumer les résultats d’ouverture, de clic et de rebond.',
  e7b89365:
    'Lister les propriétaires possibles dans Dynamics 365 et attribuer un enregistrement CRM à un utilisateur ou à une équipe pouvant en être propriétaire.',
  e80e9c6c: 'Détecter la langue d’un texte entrant et l’acheminer ou l’étiqueter en conséquence.',
  e835b3bf:
    'Importer en lot des utilisateurs existants dans Persona comme comptes à partir d’un fichier CSV.',
  e8ba5ffb:
    'Publier un sondage dans une conversation Telegram pour recueillir un vote rapide auprès des membres.',
  e8d8d11f:
    'Exécuter une recherche de similarité pgvector sur une table Supabase pour récupérer les plongements les plus proches.',
  e8f3f15d: 'Ajouter des participants à un événement Google Calendar existant et les en aviser.',
  e9091727: 'Construire l’historique de soutien d’un client à partir de Help Scout.',
  e94f5279:
    'Faire rapport du solde du compte, des positions ouvertes et du profit ou de la perte non réalisé sur Kalshi.',
  e95eeb17: 'Traduire un bloc de texte vers une langue cible avec Google Cloud Translation.',
  e967cc77:
    'Lister les transactions Pipedrive d’un entonnoir de vente et résumer la répartition par étape ainsi que les transactions à risque.',
  ea2eb2fd:
    'Compléter ce qu’Affinity sait d’une entreprise et réécrire les valeurs manquantes. Utiliser avant de noter ou d’acheminer un compte.',
  ea788b3e:
    'Rechercher dans Google Books les titres les plus pertinents sur un sujet et retourner une liste classée et résumée.',
  ea9b2467:
    'Récupérer les réponses Typeform d’un formulaire, avec des filtres de date et d’achèvement.',
  eaa79df0:
    'Recevoir un lot de messages Amazon SQS par interrogation longue, les traiter et supprimer chacun d’eux pour qu’il ne soit pas livré de nouveau.',
  eb20cf3e: 'Récupérer les matchs de football en cours et leurs scores actuels depuis Sportmonks.',
  eb2af8c6:
    'Trouver les publications Buffer dont la parution a échoué, lire leurs erreurs et les replanifier. Utiliser pour se remettre d’échecs de publication.',
  eb6e76d4:
    'Découper en segments et incorporer un ensemble de documents afin de pouvoir les insérer dans une base vectorielle pour la recherche.',
  eb772dd2:
    'Récupérer une demande de fusion GitLab et publier un commentaire de révision structuré avec des commentaires exploitables.',
  ec8e062e:
    'Faire rapport de l’état d’un indicateur dans les différents environnements et des changements récents à partir du journal d’audit.',
  ecbad038:
    'Interroger DuckDuckGo pour obtenir rapidement une réponse instantanée ou un résumé sur un sujet et les retourner avec leur source.',
  ed0f0437:
    'Utiliser AWS STS get access key info pour déterminer à quel compte appartient un ID de clé d’accès. À utiliser pour le triage d’incident lié à des clés divulguées ou inattendues.',
  ed5fdc4b:
    'Lister les commandes Shopify récentes et les résumer par statut, par valeur ou par besoin d’exécution.',
  eda848cd:
    'Révoquer ou retirer les appareils et les clés d’authentification d’un utilisateur qui part, puis suspendre ou supprimer son compte tailnet.',
  ee377bcd:
    'Déclencher l’indexation d’un dépôt par Greptile et sonder son état jusqu’à ce qu’il soit prêt à être interrogé.',
  ee88069f:
    'Répondre à une question à partir des lignes d’une table Coda, en filtrant sur la valeur d’une colonne lorsque c’est possible.',
  eebe144a:
    'Soumettre une demande d’accès SailPoint et la suivre jusqu’à son terme au moyen des activités de compte et de l’état de la demande.',
  ef0a063b:
    'Téléverser un fichier de configuration par SSH, puis redémarrer le service et vérifier le code de sortie.',
  ef196ec3: 'Lire, créer ou mettre à jour les variables d’environnement d’un projet Vercel.',
  efbde990:
    'Trouver les entrevues planifiées dont la rétroaction est manquante et aviser les intervieweurs responsables. Utiliser après une série d’entrevues pour faire avancer les décisions.',
  efc9c30f:
    'Épingler un message important et y ajouter une réaction par émoji dans une conversation Telegram.',
  f01a9af7:
    'Convertir un bloc de texte en audio vocal d’allure naturelle avec une voix ElevenLabs choisie.',
  f099657e:
    'Résoudre un nom de pays en son ID Sportmonks et ses codes ISO à l’aide des données de référence Core.',
  f0ad7088:
    'Déclencher un événement Loops pour un utilisateur avec des propriétés structurées afin d’activer des automatisations du cycle de vie.',
  f0b9730f:
    'Empiler des tâches dans une liste Redis et les en retirer pour les traiter dans l’ordre.',
  f0c5a27d:
    'Récupérer et structurer les réponses d’un Google Form en vue d’une analyse ou d’un acheminement.',
  f0f2e535:
    'Signaler un invité Calendly qui ne s’est pas présenté, ou retirer ce signalement. Utiliser pour rapprocher les présences après une rencontre.',
  f112fe1a:
    'Rechercher dans Enrich.so des personnes ou des entreprises correspondant à un filtre de profil de client idéal.',
  f1aba843:
    'Interroger et mettre à jour les entrées d’une liste Attio pour faire progresser des fiches dans un entonnoir de vente ou un segment. Utiliser pour gérer les étapes des transactions et les segments sélectionnés.',
  f1bb9437:
    'Convertir l’adresse IP d’un visiteur en profil de personne et d’entreprise pour le suivi commercial.',
  f1daa4e0: 'Créer une liste de diffusion Mailgun au besoin et y ajouter un abonné.',
  f2000c8a:
    'Incorporer des éléments et comparer les vecteurs par similarité cosinus pour repérer les contenus quasi dupliqués.',
  f219b9d3:
    'Surveiller en continu un ensemble de fournisseurs critiques sur Downdetector et alerter dès que l’un d’eux passe à l’état de panne.',
  f224339b: 'Téléverser un reçu et le joindre à la bonne dépense Brex.',
  f231a867:
    'Lire un billet GitLab, le classer, puis publier un commentaire de triage ou mettre à jour ses champs.',
  f2446a56:
    'Découvrir les bases de données, les schémas et les tables accessibles avec un identifiant Snowflake.',
  f26c29a6:
    'Analyser une facture ou un PDF financier pour obtenir des tableaux structurés de lignes d’article, en vue de l’automatisation des comptes fournisseurs.',
  f2722198:
    'Interroger un travail de génération Gamma par son identifiant de génération et retourner le lien final de la présentation une fois celle-ci prête.',
  f2e52b9f:
    'Téléverser des fichiers dans un dossier Box structuré, en créant les dossiers au besoin. Utiliser pour classer les documents selon une organisation standard.',
  f32b57d0:
    'Convertir un document numérisé ou une image en texte brut lisible avec l’OCR d’AWS Textract. À utiliser pour numériser des notes manuscrites, des télécopies ou des PDF composés uniquement d’images, en vue de l’indexation ou de la recherche.',
  f3525ca8:
    'Exécuter une requête sur un index Elasticsearch et retourner les documents correspondants.',
  f36d9976:
    'Récupérer seulement les documents Convex modifiés depuis un instantané avec Document Deltas.',
  f3fb3438:
    'Interroger les journaux Datadog pour un service et une plage de temps afin de repérer les erreurs et de résumer les tendances.',
  f421d7f1:
    'Récupérer les invités d’un événement Calendly planifié, y compris leurs réponses et leurs coordonnées. Utiliser pour préparer une rencontre ou synchroniser les participants avec un CRM.',
  f4388121:
    'Exporter une page Coda en Markdown afin que son contenu puisse être résumé, archivé ou synchronisé ailleurs.',
  f44b5057:
    'Lancer une recherche par pertinence dans les tables Dataverse pour trouver les enregistrements correspondant à un terme.',
  f45ae4a6:
    'Chercher dans les organisations Crunchbase selon un profil de client idéal et verser l’ensemble complet des résultats, page par page, dans une liste. Utiliser pour la planification de territoires et de campagnes.',
  f4cd022f:
    'Rapporter l’état de santé de la grappe Elasticsearch et les principales statistiques des index.',
  f4d79ee7:
    'Résoudre un dossier approuvé de Dynamics 365 en documentant les détails de la résolution et le temps consacré.',
  f4e8f693:
    'Créer un utilisateur ou un rôle IAM, associer des politiques gérées et placer les utilisateurs dans des groupes afin d’accorder un accès délimité. À utiliser pour l’accueil de nouvelles personnes et la mise en place de rôles de service.',
  f4edb7a7:
    'Exécuter un acteur Apify pour extraire les données d’un site Web cible et écrire les lignes extraites dans un tableau structuré. Utiliser pour des tâches d’extraction de données ponctuelles ou récurrentes.',
  f5a299ec:
    'Générer une complétion de clavardage à partir d’un modèle à poids ouverts servi par un point de terminaison Modal. À utiliser lorsque l’inférence doit s’exécuter sur votre propre capacité de calcul Modal.',
  f5b167fc: 'Transférer un courriel Outlook à la bonne personne avec une note ajoutée.',
  f5d6a34f:
    'Rechercher un utilisateur Clerk par courriel, nom d’utilisateur ou nom et retourner son profil. Utiliser pour repérer un utilisateur avant d’agir sur son compte ou de le synchroniser ailleurs.',
  f60ad512:
    'Effectuer une recherche sur le Web avec Tavily et retourner une réponse fondée, accompagnée de citations de sources liées.',
  f61aed35:
    'Récupérer les tâches d’une liste ClickUp et résumer l’état d’avancement, les éléments en retard et qui est responsable de quoi. Utiliser pour les stand-up et les points d’étape sur les projets.',
  f62a365e:
    'Repérer les concurrents d’un domaine dans la recherche organique Semrush et extraire les mots-clés qui génèrent leur trafic.',
  f6626e0f:
    'Lancer l’exécution d’un projet Hex avec des paramètres d’entrée et sonder son état jusqu’à la fin.',
  f6a9ce57:
    'Traduire une question en langage clair en requête Cypher, l’exécuter sur Neo4j et expliquer le résultat.',
  f6dfd7c2:
    'Annuler un événement Calendly planifié, avec un motif facultatif. Utiliser pour annuler une rencontre et en aviser l’invité par l’intermédiaire de Calendly.',
  f6ec551b:
    'Récupérer le profil d’une chaîne YouTube et ses vidéos récentes pour résumer son contenu et sa cadence de publication.',
  f6f9c725:
    'Résoudre une recherche enregistrée de personnes visible par l’équipe et paginer ses contacts vers un jeu de données en aval.',
  f717e99e:
    'Mettre à jour un incident actif avec l’état courant et une note d’avancement à l’intention des parties prenantes.',
  f71c2573: 'Publier une annonce mise en forme dans un canal Discord et, au besoin, l’épingler.',
  f72a4bdd:
    'Bâtir un dossier de contenu à partir des questions que les gens recherchent autour d’un sujet, à l’aide des mots-clés sous forme de questions de Semrush.',
  f77220f0:
    'Télécharger une publication ou une story Instagram sous forme de User Files canoniques.',
  f789589d:
    'Créer un lien partagé pour un fichier ou un dossier Dropbox avec une visibilité et une expiration contrôlées.',
  f7a56f45:
    'Consulter une demande de vérification Persona et indiquer si la personne a réussi, échoué ou nécessite une révision.',
  f7e2316e:
    'Consulter un marché Polymarket et indiquer les cotes implicites actuelles ainsi que le prix de chaque issue.',
  f7e33e6c:
    'Envoyer un courriel HTML mis en forme par SMTP, avec objet, destinataires et adresse de réponse.',
  f7e41013:
    'Restaurer une sauvegarde réussie dans une branche distincte pour un exercice de reprise.',
  f7edb26c:
    'Téléverser un fichier dans un dossier précis de OneDrive, en créant le dossier au besoin.',
  f8005376:
    'Lister les exécutions récentes de projets Hex, vérifier leur statut et faire ressortir les échecs.',
  f831665a:
    'Passer en revue les inscriptions Luma en attente et approuver, mettre en liste d’attente ou refuser chaque invité.',
  f83cefb9:
    'Lister et résumer les réservations Cal.com à venir pour une période. Utiliser pour un ordre du jour quotidien ou pour informer un hôte de son horaire.',
  f84c2c68:
    'Utiliser les métadonnées du compte pour préparer des corps de requête sûrs de création, de mise à jour, d’upsert et de transformation.',
  f85598ee:
    'Rechercher dans Azure AD (Entra ID) les utilisateurs correspondant à un nom, à un service ou à un autre attribut. À utiliser pour les recherches dans l’annuaire et la production de rapports.',
  f8712a1e:
    'Énumérer les ensembles d’autorisations, les attributions de comptes et les appartenances aux groupes dans Identity Center afin de produire un rapport d’accès. À utiliser pour la conformité et les revues périodiques.',
  f8793400:
    'Déplacer une réservation Cal.com à une nouvelle heure ou l’annuler, en indiquant un motif. Utiliser pour traiter les demandes de modification ou d’annulation d’une réservation existante.',
  f88644b1:
    'Envoyer un courriel transactionnel Loops à partir d’un modèle, avec des variables de données personnalisées.',
  f8e66cf8:
    'Suivre dans Redis le nombre de requêtes par clé avec une expiration glissante pour appliquer des limites.',
  f936454c: 'Exécuter une requête MySQL selon un horaire et publier un rapport résumé.',
  f95b9eae:
    'Déplacer les messages d’une file de lettres mortes Amazon SQS vers leur file source, et suivre la tâche de déplacement jusqu’à son achèvement.',
  f964af56:
    'Lancer l’enrichissement de courriels en lot de Harmonic et reporter les adresses trouvées sur les contacts.',
  f96d4c6e:
    'Lister les secrets d’AWS Secrets Manager et rapporter les métadonnées, comme la dernière modification et l’état de rotation. À utiliser pour les contrôles d’hygiène et le repérage des secrets périmés.',
  f9ac7c81:
    'Ajouter à une tâche Planner une liste de vérification détaillée afin de suivre chaque sous-tâche et de la cocher.',
  f9af9852:
    'Résumer la performance des campagnes Smartlead avec les taux d’ouverture, de clic et de réponse sur une période.',
  f9cca9f6:
    'Récupérer les agrégats de capteurs CrowdStrike documentés et résumer la répartition du parc par version, par état ou par plateforme.',
  fa03b4c4:
    'Inventorier les domaines et les enregistrements DNS de Vercel et gérer les enregistrements d’un domaine.',
  fa17c59d:
    'Utiliser la recherche Perplexity avec un filtre de récence pour trouver les résultats les plus récents sur un sujet.',
  fa58f24a:
    'Insérer un lot de lignes dans une table ClickHouse après les avoir associées aux bonnes colonnes. Utiliser pour ingérer des événements ou des enregistrements dans ClickHouse.',
  fa6ed6a5:
    'Récupérer la fin d’un journal distant par SSH et résumer les erreurs et les avertissements dans un condensé.',
  fa7acc1a:
    'Exécuter un agent DSPy ReAct sur une tâche qui exige l’utilisation d’outils en plusieurs étapes et en capturer la trajectoire.',
  fab018e6: 'Inspecter les sauvegardes des branches et indiquer leur état d’achèvement.',
  fb3c6336:
    'Répondre à une question sur le comportement en production en exécutant une recherche SPL.',
  fb77c656:
    'Résumer les dépenses Brex sur une période, ventilées par catégorie, par commerçant et par utilisateur.',
  fb9470dc:
    'Vérifier dans une cohorte de personnes Harmonic les données manquantes (courriel, LinkedIn, entreprise, poste) avant la prospection.',
  fbd45055:
    'Dresser l’inventaire des vulnérabilités ouvertes de Dynatrace selon le risque, l’exposition et le service touché.',
  fbd48185:
    'Rechercher dans les contacts marketing SendGrid les adresses invalides ou indésirables et les retirer.',
  fc231fa0:
    'Enregistrer les derniers messages de l’utilisateur et de l’agent dans un fil Zep pour que la mémoire se construise au fil du temps.',
  fc464778: 'Trouver qui est de garde pour un service et lui adresser une escalade.',
  fc9d0131:
    'Récupérer une transcription Fireflies et produire un compte rendu structuré avec les décisions, les actions à mener et les responsables.',
  fcaeb221:
    'Créer un nouvel élément sur un tableau Monday, dans le bon groupe, avec les valeurs de colonnes définies.',
  fd0a7009:
    'Cloner un dépôt Git dans un bac à sable Daytona et exécuter des commandes d’installation, de build ou de test. À utiliser pour des vérifications de type CI, le suivi de la santé d’un dépôt ou la validation de modifications.',
  fd76a605:
    'Extraire les problèmes ouverts de Dynatrace, y joindre la cause première et le contexte d’impact, puis les classer par priorité pour la personne de garde.',
  fd99a79e:
    'Lister les réunions Fathom récentes et produire un condensé concis des décisions, des responsables et des actions à mener.',
  fdcf0900:
    'Vérifier le solde de crédits RB2B avant de lancer un lot de recherches d’enrichissement.',
  fe7a2568:
    'Analyser un PDF téléversé pour en tirer un texte propre en vue d’un résumé ou d’une recherche en aval.',
  fe98931a:
    'Adapter un modèle Gamma existant en présentation propre à un prospect ou à un client avec Generate from Template.',
  feb8e230:
    'Lire les nouveaux messages d’une boîte de réception AgentMail, les classer, puis répondre ou escalader au besoin.',
  fedb7139:
    'Interroger Agiloft pour trouver les contrats qui approchent de leur date de renouvellement ou d’expiration et signaler ceux qui sont à risque.',
  ff6c3f2f:
    'Insérer ou mettre à jour des variables d’environnement Railway à partir d’une source de référence et rapporter les changements.',
  ff95f404: 'Résumer l’avancement des cadres, des contrôles et des tests dans un compte Vanta.',
}
