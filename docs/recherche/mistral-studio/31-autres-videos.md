# 31 — Autres vidéos sur Mistral AI Studio

> **Périmètre** : vidéos YouTube (FR/EN) sur Mistral AI Studio et ses briques — Agents, Workflows, Observability/évaluations, Connectors, Skills/Prompts, Playgrounds, liens avec Vibe — hors vidéo `0esChgVuxSc` (traitée à part) · **Sources** : 15 vidéos retenues lues en entier + 15 vidéos complémentaires courtes lues en entier (transcriptions YouTube récupérées le 21/10/2026 avec yt-dlp ; aucun fichier vidéo téléchargé) ; 248 vidéos repérées au total · **Rédaction** : agent de recherche pour Nexora Studio

**Conventions de ce chapitre**
- Horodatages `[mm:ss]` = position dans la vidéo, tels qu'ils figurent dans les transcriptions copiées dans `sources/videos/<ID>.txt`.
- Les transcriptions sont majoritairement **automatiques** : noms propres et chiffres peuvent être déformés (ex. « COB » pour Koyeb, « Lashaw » pour Le Chat). Toute interprétation d'un passage douteux est marquée **(inférence)** ou « (ASR incertain) ».
- Libellés d'interface, noms de méthodes SDK et identifiants gardés en anglais, en `code` ou « entre guillemets ».
- « Vues » = compteur YouTube au 21/10/2026.

## Sommaire
- 1. En bref
- 2. Concepts et vocabulaire (tels qu'employés dans les vidéos)
- 3. Fiches des 15 vidéos retenues (3.1 → 3.15, ordre chronologique)
- 4. Interface utilisateur : synthèse des écrans montrés
- 5. API et SDK vus à l'écran (+ recoupement avec la spec OpenAPI locale)
- 6. Limites, quotas, disponibilité, chiffres annoncés
- 7. Détails fins, pièges, conseils récurrents
- 8. Questions ouvertes / incohérences relevées
- 9. Compléments courts (C1 → C15)
- Annexe A — Couverture et méthode
- Annexe B — Tableau de toutes les vidéos repérées (248) avec statut et raison

---

## 1. En bref

- **Peu de vidéos parlent de « Studio » en tant que tel** : la chaîne officielle (@MistralAIOfficial, 112 vidéos + 12 directs) ne contient **aucune vidéo de lancement « Introducing AI Studio »** ; Studio apparaît à travers ses briques (Workflows, Connectors, Skills/Prompts versionnés, playgrounds audio) et dans des webinaires/conférences. Parmi les vidéos repérées, le lancement (24/10/2025) n'est couvert que par une interview Bloomberg d'Arthur Mensch (§3.1).
- **Chronologie des briques visible en vidéo** : console Studio avec « Create / Observe / Improve », traces, Judges (déc. 2025, §3.2) → Audio playground (févr. 2026, C10) → clonage de voix (mars 2026, C9) → SDK Connectors custom (avr. 2026, C4) → **Workflows en public preview le 28/04/2026** (§3.4–3.5) → Connectors dans Workflows et Vibe (28/05/2026, C2–C3) → Connectors Debugger (24/06/2026, §3.7) → **prompts et skills versionnés** (09/07/2026, §3.8) → cookbooks Connectors (août–oct. 2026, §3.13, §3.15) → playgrounds TTS/voice cloning Voxtral 3 (21/10/2026, C11–C12).
- **Positionnement répété par tous les intervenants Mistral** : Studio = la plateforme « développeur » qui ajoute aux modèles les primitives nécessaires à la production (workflows longue durée, sandboxes, observabilité, évaluations, registre d'actifs, gouvernance) ; Vibe = le produit utilisateur final qui consomme ces primitives ; Forge = personnalisation/entraînement de modèles (§3.3, §3.9, §3.14).
- **Workflows** est la brique la plus documentée en vidéo : orchestration durable bâtie sur Temporal (selon xavki, §3.6), workers exécutés chez le client en connexions sortantes uniquement, reprise après échec, pause humaine, traçabilité dans Studio, publication dans Vibe.
- **Connectors** = serveurs MCP enregistrés, réutilisables par agents, workflows, Vibe et SDK, avec gestion des credentials par Mistral, filtrage d'outils et un débogueur OAuth en 12 étapes.
- **Évaluation/observabilité** : démo de traces et de Judges dans la console (déc. 2025) ; Mistral présente en juillet 2026 un « judge model framework » Review → Monitor → Protect (§3.10) ; la VP Product insiste sur des seuils d'échec acceptables chiffrés (§3.11).
- **Gouvernance** : versions immuables, labels d'environnement, visibilité privée → workspace → organisation, audit logs (§3.8, C6) ; côté Admin : organisations, workspaces, connecteurs au niveau organisation, préférences (activer/désactiver Work mode), limites de tokens, interdiction de téléchargement de fichiers (§3.9) ; politiques anti-injection par surface produit (§3.14).
- **Déploiement** : Studio est un SaaS, mais Mistral annonce un packaging trimestriel pour exécution entièrement on-prem/air-gapped (§3.3).
- **Statut** : Workflows « public preview » (avr. 2026) ; une partie de l'observabilité était en accès sur liste blanche en déc. 2025 (§3.2) ; aucune vidéo ne donne de tarif Studio.

---

## 2. Concepts et vocabulaire (tels qu'employés dans les vidéos)

| Terme (original) | Définition / usage observé | Source |
|---|---|---|
| « AI Studio », « Mistral AI Studio », « Mistral Studio », « Studio » | Quatre appellations utilisées indifféremment pour la même plateforme | toutes |
| Console (`console.mistral.ai`) | Application web hébergeant Studio ; en juil. 2026, onglets du haut « Vibe », « Studio », « Docs & API », « Admin » | §3.9 |
| « Create » / « Observe » / « Improve » | Trois grands blocs de la console présentés en déc. 2025 (jouer avec les modèles et créer des agents / traces / évaluer et fine-tuner) | §3.2 |
| Playground | Zone d'essai des modèles ; chaque appel crée automatiquement une trace (déc. 2025) ; déclinaisons audio (STT, TTS, voice cloning), OCR | §3.2, C9–C12 |
| Agent | LLM configuré (instructions, modèle, outils, paramètres) avec un ID, versionné ; créé dans Studio ou par SDK | §3.13, C13, C14 |
| Agent builder | Création d'agents sans code dans Le Chat/Vibe (personas pré-construites) — distinct de Studio | §3.3 |
| Workflow | Processus multi-étapes durable, écrit en code (Python, puis TypeScript), orchestré par Mistral | §3.4–3.6 |
| Activity (`activity`) | Étape atomique d'un workflow ; résultat enregistré dès sa complétion | §3.4, §3.5 |
| Worker | Processus qui exécute le code des workflows, s'enregistre auprès de la plateforme et interroge (poll) les tâches par connexions sortantes | §3.5, §3.6 |
| Deployment (nom de déploiement) | Clé d'isolation des workers (avec la clé API) ; visible dans Studio | §3.6 |
| Execution | Exécution d'un workflow, avec timeline par activité, entrées/sorties, durées | §3.5, §3.6, C15 |
| « Publish to Vibe » | Publication d'un workflow (format conversationnel) ou d'un skill vers Vibe | §3.6, C5 |
| Connector | Serveur MCP enregistré, « pont » nommé et réutilisable entre services Mistral (agents, workflows, Vibe) et une source externe ; expose tous les outils du serveur | §3.13, §3.15 |
| Credential (de connecteur) | Jeu d'identifiants nommé ; plusieurs credentials possibles par connecteur (organisations/comptes différents) | C2, C3 |
| « Connector access scope » | Champ de la clé API ; l'option « private and shared connectors » est requise pour les connecteurs créés soi-même | §3.13, §3.15 |
| Tool filtering | Restreindre les outils d'un connecteur exposés à un agent (focus, lecture seule) | §3.15 |
| Connectors Debugger (« Connections Debugger » à l'oral) | Outil Studio qui rejoue les 12 étapes de l'authentification OAuth MCP | §3.7 |
| Skill | Bundle versionné (instructions, outils, documents de référence) conforme à la spec ouverte Agent Skills ; chargé par l'agent quand la tâche correspond à sa description | §3.8, §3.12 |
| Prompt (réutilisable) | Texte d'instructions versionné, déplacé entre environnements par **labels** ; appelé explicitement par l'application | §3.8, C6 |
| Label / alias | Étiquette d'environnement (dev, staging, prod) pointant vers une version de prompt | §3.8, §3.12 |
| Version notes | Note attachée à chaque version (pourquoi le changement) ; chaque version attribuée à son auteur | C5, C6 |
| Explorer / Traces | Inspection du trafic de production (prompt système, message, appels d'outils, sources, réponse) | §3.2 |
| Judges / Campaigns | LLM-as-a-judge en lot ou à la volée, avec explication du score (« Campaigns » : terme de déc. 2025) | §3.2 |
| Datasets | Jeux de données épinglés (échantillonnage de production) servant aux évaluations | §3.2 |
| AI Registry | Catalogue unifié des actifs (prompts, modèles, versions…) | §3.2, §3.9 |
| « Context engine » | Composant cité dans la liste des briques de Studio (non détaillé) | §3.9 |
| Forge | Plateforme de personnalisation/entraînement de modèles (productisée en mars 2026) | §3.3, §3.9, §3.11 |
| Vibe (« Vibe for work » / « Vibe for code ») | Produit utilisateur (ex-Le Chat pour le travail, et agent de code) qui consomme les primitives de Studio | §3.3, §3.9, §3.14 |
| Work mode | Mode agentique de Vibe pour tâches multi-étapes ; activable/désactivable par l'admin | §3.9 |
| Harness | Couche qui enveloppe le modèle pour orchestrer agents, outils, mémoire, contexte | §3.9, §3.14 |
| Policy / prompt injection rules | Règles admin (classifieurs PII, secrets, savoir d'entreprise ; seuils ; actions) attachées à une politique par surface produit | §3.14 |
| Judge model framework (Review / Monitor / Protect) | Cadre d'évaluation continue présenté par un ingénieur Mistral | §3.10 |
| Agent-as-a-judge | Agent externe qui rejoue l'exécution pour vérifier la conformité au résultat attendu | §3.10 |
| FDE (forward deployed engineers) / « iconic use case workshop » / « tech feasibility » | Accompagnement Mistral : identification du cas d'usage, pilote de 2–4 semaines, passage en production | §3.3, §3.9 |
| Labs (modèles) | Modèles expérimentaux étiquetés en rouge (ex. Leanstral) | §3.3, §3.14 |

---

## 3. Fiches des 15 vidéos retenues

Critères de sélection : officielles d'abord, postérieures au lancement de Studio (24/10/2025), démonstrations d'interface, durée substantielle ; complétées par les meilleures conférences et deux créateurs francophones. Chaque fiche : identité · résumé · points clés horodatés · fonctionnalités et écrans · chiffres · conseils.

### 3.1 — « Mistral Launches Platform for Improved Enterprise AI » (Bloomberg Tech)

| Champ | Valeur |
|---|---|
| Chaîne | Bloomberg Tech (interview d'Arthur Mensch, CEO, par Caroline Hyde et Ed Ludlow) |
| Date | 24/10/2025 (jour du lancement de Studio) |
| Durée · Vues | 8:45 · 5 554 |
| URL | https://www.youtube.com/watch?v=vuKjy3ikgtE |
| Sous-titres | manuels (EN) ; chapitres YouTube : 0:00 Introducing Mistral AI Studio · 1:07 Enterprise differentiation · 2:09 Scaling customer adoption · 3:56 Funding · 5:07 Global expansion · 6:15 Compute · 7:52 AI bubble |

**Résumé.** Seule vidéo contemporaine du lancement. Le CEO présente Studio comme la plateforme « guichet unique » pour qu'une entreprise construise ses propres applications IA, puis l'interview dérive vers clients, levée de fonds et capacité de calcul. Aucun écran montré.

**Points clés horodatés**
- [00:19] Studio = plateforme unique pour construire des applications qui appartiennent à l'entreprise, contiennent son IP, sont connectées à ses données et s'améliorent dans le temps en exploitant le savoir des employés.
- [01:07] Différenciation : intégration verticale de toutes les « briques » du modèle à l'application (front-end, back-ends, mécanismes d'apprentissage) ; l'entreprise doit posséder son IA, garder son IP et ses données « là où elles sont » sans qu'elles remontent chez Mistral ; plateforme **portable** déployable on-prem ou en cloud privé ; une seule plateforme du prototype à la production.
- [02:30] Cas CMA CGM : Studio + ingénieurs/scientifiques appliqués déployés chez le client avec les métiers ; de mars à juillet (4 mois) jusqu'à la production d'un processus de bout en bout (« cargo release » et dispatch de conteneurs), désormais à l'échelle mondiale.
- [03:23] Règle empirique annoncée : **un trimestre** pour passer du prototype à la production, à condition d'avoir les bons outils (interfaces, « plumbing », connexion aux sources de données et logiciels parfois legacy) et des experts déployés.
- [02:30] Cite un rapport selon lequel 95 % des cas d'usage n'atteignent pas la production (source exacte déformée par la transcription).
- [04:16] Pas de levée en cours ; levée récente avec ASML de 1,7 Md€, ~3 Md€ levés au total.
- [05:08] Clients cités : CMA CGM, Stellantis, BNP Paribas ; aux États-Unis Cisco (cloud privé, expérience client), Snowflake (traitement de documents) ; partenaire Microsoft (Foundry) ; disponibilité sur AWS et GCP.
- [06:50] Création d'une business unit « Compute » (GPU en Europe) ; acquisition de « plusieurs centaines de mégawatts » de capacité dans l'année.
- [07:55] R&D financée en fonds propres ; infrastructures financées par dette adossée à des contrats long terme.

**Chiffres annoncés** : 4 mois (CMA CGM) ; « un trimestre » prototype→prod ; 95 % d'échecs (citation) ; 1,7 Md€ / ~3 Md€ ; « centaines de MW ».

**Conseils** : associer outils + experts terrain ; viser des processus automatisés de bout en bout plutôt que des démos.

---

### 3.2 — « AI Dev 25 x NYC | Param Singh: Building with Mistral: Open, Powerful, and Ready to Scale »

| Champ | Valeur |
|---|---|
| Chaîne | DeepLearningAI (conférence AI Dev 25, New York) ; orateur : Param Singh, Partner Solution Architect, Mistral AI |
| Date | 05/12/2025 |
| Durée · Vues | 29:45 · 403 |
| URL | https://www.youtube.com/watch?v=Axlesb8yTro |
| Chapitres YouTube | 0:00 Intro · 1:01 Values · 2:15 Platform services · 3:07 Models · 7:12 Production challenges · 8:17 AI Studio features · 9:25 Observability & governance · 11:11 AI Studio demo · 13:36 Advanced evaluation · 15:41 Strategies for production · 23:56 Q&A |

**Résumé.** La plus ancienne démonstration de la console Studio trouvée (6 semaines après le lancement). Présente l'architecture fonctionnelle de Studio (observabilité, workflows, registre, gouvernance), puis montre le Playground, une vue de trace et un juge LLM. Fin de talk : retour d'expérience (antérieur à Mistral) sur la mise en production d'un RAG réglementaire bancaire.

**Points clés horodatés**
- [01:19] ~500 employés à cette date.
- [02:28] Historique : premiers contrats commerciaux en 2024, puis déploiements, puis équipe d'« applied AI engineering » en co-innovation ; « applications supplémentaires en 2026 ».
- [03:07] Catalogue (~20 modèles servis), code couleur open-weight (Apache 2) vs « premier »/commercial ; Medium = modèle « workhorse » ; Small = économique, faible latence ; Voxtral (transcription, compréhension audio) ; Codestral (FIM), Devstral (agentique), Codestral Embed ; Mistral Code (IDE VS Code / JetBrains) ; Magistral (raisonnement, chaîne de pensée inspectable) ; Ministral (edge) ; OCR / Document AI (annotations composables en un appel).
- [07:15] Problèmes de production : visibilité limitée, multiplicité d'outils, impossibilité d'automatiser l'analyse de performance, intégration à des workflows déterministes, **absence de système d'enregistrement** (prompts, modèles, versions, données de fine-tuning dispersés).
- [08:27] La plupart des modèles déployables on-prem, en VPC, en air-gapped, en serverless et en instances dédiées.
- [09:03] Thèse Studio : traces et observation (quels outils, quand les agents sont invoqués et s'ils le sont correctement), workflows pour les besoins entreprise, gouvernance des actifs avec traçabilité.
- [09:22] L'observabilité (« traces explorer, judges and campaigns ») est **le même outillage que les équipes internes** utilisent pour améliorer les modèles Mistral ; livrée dans Studio avec agents et workflows.
- [09:57] « AI registry » = catalogue unifié de tous les actifs. Une partie disponible, une partie **sur liste blanche au cas par cas**.
- [10:13] Détail Observability : Explorer (trafic de production/traces) ; Judges & Campaigns (LLM-as-a-judge) ; Datasets (épingler des sous-ensembles, échantillonnage) ; traces et dashboards. Workflows : vue linéaire de chaque invocation, réutilisation des judges/campaigns dans le temps, modes on-prem et cloud.
- [11:30] Démo console : trois blocs « Create » (modèles, traces/réponses, création d'agents — aussi via SDK), « Observe » (où vivent les traces), « Improve » (évaluations, fine-tuning).
- [12:24] Playground : choix de n'importe quel modèle **y compris ses modèles fine-tunés** ; réglage de la configuration ; **chaque appel crée automatiquement une trace** consultable dans la suite d'observabilité.
- [13:21] Vue de trace (dataset préparé de questions de réglementation financière) : prompt système, message utilisateur, trace complète des appels d'outils, outils utilisés, sources, réponse ; traces à appels d'outils multiples ; réutilisation des données pour créer jeux d'entraînement et critères d'évaluation.
- [14:57] Judges : évaluation en lot ou à la volée ; exemple « ne pas donner de conseil juridique » ; chaque item reçoit un score **et une explication** du score.
- [15:52–23:40] Leçons de production : définir le « pourquoi » et une métrique (coût par requête) ; prototypes faciles ; les frameworks (LangChain, CrewAI) doivent passer la revue sécurité ; le découpage par page a échoué en recette (utilisateurs cherchent différemment) → retrieval hybride / fréquence de termes ; impliquer sécurité/conformité tôt (revue de risque modèle, red teaming, OWASP Top 10, proxys qui scannent PII) ; projet prévu 4 mois → 10 mois ; dérive à surveiller via juges/évaluations.
- [24:12–29:20] Q&R : validation GxP (pharma) ; délais de dépréciation des fournisseurs → intérêt des modèles open-weight et du on-prem ; régulation UE.

**Fonctionnalités et écrans** : console (Create/Observe/Improve), Playground (sélecteur de modèles incl. fine-tunés, configuration), vue Trace, Judges (score + explication), Datasets.

**Chiffres** : ~500 employés ; ~20 modèles ; projet 4 → 10 mois.

**Conseils** : enregistrer tout ce qui se passe en production ; utiliser juges et évaluations pour la dérive ; impliquer conformité tôt ; recueillir le retour utilisateurs tôt.

---

### 3.3 — « Building Enterprise Agents with Mistral AI | Open, Powerful, and Ready to Scale (Webinar Replay) »

| Champ | Valeur |
|---|---|
| Chaîne | Data Science Connect ; orateur : Aaron Delp, Global Head of AI Technical Marketing, Mistral AI |
| Date | 26/03/2026 |
| Durée · Vues | 47:31 · 211 |
| URL | https://www.youtube.com/watch?v=xuyYHawwQB0 |

**Résumé.** Webinaire en trois « niveaux » de démonstration : (1) agent no-code dans Le Chat et transcription audio dans Studio ; (2) OCR d'un plan technique dans Studio puis requête MCP sur une base de pièces ; (3) workflow agentique de vérification d'un dossier réglementaire eCTD dans Studio. Présente aussi le portefeuille (Studio, Forge, Vibe) et répond sur l'air-gapped.

**Points clés horodatés**
- [09:55] Niveau 1 — Le Chat : « Agents » → lancer l'agent builder → persona pré-construite « Data Analyst » ; options de personnalité (« polite », « mature », « concise ») ; rattachement de connecteurs (Google, Microsoft) et d'outils ; analyse d'un CSV ; bascule « standard mode » / mode agent par menu déroulant.
- [13:03] Studio, transcription : upload d'un fichier, transcription avec **identification des locuteurs**, traduction (vers le français), téléchargement ; **jusqu'à 10 fichiers** à la fois dans l'interface ; **jusqu'à 1 million de fichiers** en batch via l'API ; un bouton fournit le code équivalent en Python, TypeScript ou curl.
- [15:24] « 800+ » employés.
- [19:45] Niveau 2 — Studio, OCR : upload d'un plan, aperçu, choix de sortie **Markdown ou HTML**, et sortie **JSON** définie par des noms et types de champs ; aperçu texte qui découpe les graphiques en JPEG individuels surlignés ; extraction de tableau ; JSON étiqueté téléchargeable ; batch jusqu'à 1 M de fichiers.
- [21:54] Requête en langage naturel via un connecteur MCP nommé « Sketch Retriever » vers une base de pièces : pas de pièce de 254 mm, mais l'agent propose un trou de 254 mm et demande s'il doit approfondir.
- [24:18] Familles de modèles : Ministral 3B/8B/14B ; grand modèle « près de 700 milliards » de paramètres (ASR incertain) ; étiquettes de couleur open-weight / premier ; **rouge = Labs** (expérimental, ex. Leanstral pour Lean) ; spécialistes OCR, Voxtral, code.
- [27:41] AI Studio = « outils et opérations au même endroit » : construire agents et workflows, observabilité, « accountability », gestion du cycle de vie. Forge = personnalisation de modèles, **productisé la semaine précédente à NVIDIA GTC**. Vibe for work / Vibe for code.
- [29:51] Niveau 3 — workflow eCTD (dossier de soumission FDA/EMA) dans Studio : front-end (médicament, sponsor, type, organisation), exécution du workflow module par module, rapport de **lacunes, suggestions, recommandations** ; itérer avant de soumettre.
- [33:15–37:30] Pourquoi Forge : entraînement fragile, verrouillage cloud, économie imprévisible, compétences rares.
- [37:49] « Iconic use case workshop » : FDE, architectes, consultants ; PoC de 2 à 4 semaines.
- [39:21] Prochaines étapes : niveau 1 → Le Chat (« Vibe for work », **rebranding en cours**) ; niveau 2 → AI Studio ; niveau 3 → atelier/Forge.
- [41:10] Q&R : modes instruct/reasoning/chat ; Small 4 (sorti à GTC) hybride avec raisonnement activé par flag ; « essaims » d'agents de tailles différentes.
- [43:17] **Air-gapped** : AI Studio est un SaaS ; pour l'air-gapped, Mistral **package le logiciel chaque trimestre** pour une exécution entièrement on-prem ; contrepartie : fréquence de mise à jour.
- [44:31] Mémoire d'agent : connecteur Mistral dans OpenClaw ; fonctionnalité « memories » dans Le Chat ; dépend de l'architecture.
- [45:27] Erreur n° 1 : sous-estimer la personnalisation → dérive de périmètre ; fixer l'objectif et le ROI dès le départ.

**Fonctionnalités et écrans** : agent builder Le Chat ; Studio audio (STT + diarisation + traduction + export + bouton code) ; Studio OCR (formats de sortie, schéma JSON, aperçu) ; workflow eCTD avec front-end.

**Chiffres** : 10 fichiers (UI) ; 1 000 000 fichiers (batch) ; 800+ employés ; PoC 2–4 semaines ; packaging air-gapped trimestriel.

---

### 3.4 — « Introducing Workflows » (officielle)

| Champ | Valeur |
|---|---|
| Chaîne | Mistral (officielle) |
| Date | 28/04/2026 |
| Durée · Vues | 4:02 · 14 636 |
| URL | https://www.youtube.com/watch?v=9tXQBnpvVsU |
| Liens de description | blog `mistral.ai/news/workflows` ; docs `docs.mistral.ai/studio-api/workflows/getting-started/introduction` |

**Résumé.** Annonce de **Workflows en public preview**, « couche opérationnelle de l'IA d'entreprise ». Raconte le passage PoC → production, puis un exemple de libération de cargaison avec reprise sur échec et approbation humaine, et liste l'ingénierie spécifique à l'IA.

**Points clés horodatés**
- [00:08] Sortie en **public preview** ; cible : processus métiers les plus complexes, en production.
- [00:25] Symptômes visés : pipelines qui marchent en notebook mais échouent en production sans explication ; timeout à mi-parcours qui oblige à tout recommencer ; pas de moyen propre de **mettre en pause pour un humain** puis reprendre.
- [01:01] Exemple : armateur mondial, décision de « cargo release » (validation douanière, détection d'anomalies, approbation humaine), des dizaines d'étapes, plusieurs systèmes externes, zéro échec silencieux toléré.
- [01:51] Le workflow coordonne : décide quoi exécuter, quand, et que faire en cas d'erreur ; récupère des données y compris non structurées (conversations, pièces jointes) ; des agents extraient/formatent ; **chaque opération = une activity**, résultat enregistré dès qu'elle se termine.
- [02:24] Si la validation douanière passe mais la détection d'anomalies échoue sur timeout : **reprise exactement à l'étape échouée**.
- [02:40] Signalement → le workflow se met en pause et notifie le responsable conformité ; après approbation, reprise. **Chaque étape est tracée dans Studio** ; des mois après, on peut afficher la timeline complète.
- [02:59] Ingénierie fournie : **streaming de tokens en temps réel** ; **chiffrement des entrées/sorties** ; **gestion automatique des gros documents** ; **authentification avec isolation multi-tenant au niveau serveur** ; SDK Python où retries, **traces OpenTelemetry** et timeouts tiennent en quelques lignes de configuration.
- [03:36] Déjà « des millions de processus » en production chez des clients de plusieurs industries ; alimente aussi plusieurs produits Mistral.

**Chiffres** : « millions » de processus en production.

---

### 3.5 — « Build your first Mistral Workflow » (officielle)

| Champ | Valeur |
|---|---|
| Chaîne | Mistral (officielle) |
| Date | 28/04/2026 |
| Durée · Vues | 5:42 · 12 956 |
| URL | https://www.youtube.com/watch?v=7TnJJ0D__kk |
| Liens de description | `console.mistral.ai/build/workflows` ; docs `…/workflows/getting-started/your_first_workflow`, `…/core_concepts/workers`, `…/core_concepts/activities` ; tutoriel `learn.mistral.ai` « Build a document processing workflow in 30 minutes (or less!) » (27/04/2026) |

**Résumé.** Tutoriel pas-à-pas : scaffold d'un projet avec la CLI, lecture du code d'exemple, lancement d'un worker, déclenchement depuis le terminal puis depuis l'UI Studio, lecture de l'exécution.

**Points clés horodatés**
- [00:00] Définition : plateforme d'orchestration pour construire, exécuter et **monitorer** des workflows IA ; exécution durable et tolérante aux pannes reposant sur une infrastructure de systèmes distribués éprouvée + SDK.
- [01:01] Prérequis : compte Mistral, **Python 3.12**, **uvx**. Commande `uvx mistralai-workflows-cli setup` → projet prêt à l'emploi ; nom de projet par défaut ; création d'une clé API dans la console à l'invite.
- [01:38] Arborescence `my-workflow` : **Agent Skills pour Mistral Workflows** inclus (pour développer avec des agents de code) ; `src/workflows/` (un fichier par workflow) ; `start.py` (déclenchement CLI) ; `hello.py` (exemple minimal) ; `dev_worker.py` (surveille `src/` et redémarre le worker à chaque modification `.py`) ; `Makefile` (commandes d'aide).
- [02:18] `hello.py` : décorateur **activity** (action unitaire : nom → salutation) ; décorateur **define** (name, display name, description) ; classe `HelloWorkflow` ; décorateur **entrypoint** (point de départ).
- [03:20] `discover.py` : auto-découverte des workflows de `src/workflows` et lancement via `run_worker`.
- [03:39] Le worker se connecte à la plateforme, **enregistre workflows et activities**, interroge les tâches **par connexions sortantes (aucun port entrant)** ; quand la plateforme planifie une étape, un worker disponible l'exécute.
- [03:58] `make start-worker` ; quatre façons de déclencher : **Mistral AI Studio**, SDK Python, API Mistral, commande Makefile (exécution du workflow `hello-world` avec une entrée).
- [04:57] UI : console → Studio → « Workflows » → « Hello World » → « Start Workflow » → saisir l'entrée → démarrer ; l'exécution montre l'activity « greet » avec son **input** et son **output**.

**Conseils** : partir du scaffold ; utiliser les skills fournis avec un agent de code ; enchaîner sur le tutoriel « document processing » (rejoué en C15).

---

### 3.6 — « Mistral Workflows : Qu'est-ce que c'est ? Démo » (xavki, FR)

| Champ | Valeur |
|---|---|
| Chaîne | xavki (DevOps, francophone ; « non sponsorisé ») |
| Date | 31/05/2026 |
| Durée · Vues | 28:07 · 4 596 |
| URL | https://www.youtube.com/watch?v=sKEKJGqTz0U |

**Résumé.** La démonstration créateur la plus complète : architecture (worker local / service Mistral), code d'un agent de voyage en activities parallélisées, client Streamlit qui déclenche et suit l'exécution via l'API, lecture de l'exécution dans Studio, puis adaptation au format conversationnel et **« Publish to Vibe »**.

**Points clés horodatés**
- [01:15] Selon l'auteur : Workflows = service Mistral accessible en **API REST**, **construit au-dessus de Temporal**, qui ajoute sécurité, streaming et fonctions IA ; reprend activities et workers ; **child workflows**, **plugins**, **chiffrement**, couplage aux autres services Mistral.
- [02:26] Architecture : côté Mistral, API + service workflows + inférence (et web search) ; côté client, le worker (laptop, on-prem ou cloud) branché à ses propres bases et stockage S3 ; authentification par clé API.
- [05:54] Intérêt du motif : découpler l'exécution du code (chez soi) de l'ordonnancement (chez Mistral) ; la partie service est « déployable on-prem » pour les entreprises.
- [07:23] Dépendances : paquet Mistral Workflows, pydantic, python-dotenv, streamlit (via `uv`).
- [08:20] `.env` : clé API + **nom de déploiement** (ici « xavki ») — clé d'**isolation des workers** en production avec la clé API (doc « Managing workflows in production » › deployment › worker isolation). Démo réalisée avec une **clé API gratuite**.
- [09:15] Studio : création possible d'un workspace dédié aux tests (bouton « + ») puis d'une clé API (« New API key ») ; le code doit alors préciser le workspace/namespace.
- [10:46] `worker.py` : classe `TravelWorker` décorée par `define` ; entrypoint qui enchaîne `parse_trip`, `search_flight`, puis **en parallèle** (asyncio) `search_topic` (hôtels, restaurants, attractions), et `build_itinerary` ; un **plugin workflows** (alias `WM`) fait les chat completions sans réécrire l'appel ; modèle `mistral-medium-latest`.
- [13:41] Studio › Workflows : liste vide avant lancement ; après `uv run worker`, le workflow apparaît, avec un **déploiement** « xavki » marqué local et des dates ; onglet exécutions ; workflow déclenchable par curl/HTTP.
- [15:13] Client Streamlit : authentification client ; `execute_workflow_async` (nom de déploiement, identifiant du workflow, entrée) ; boucle de **polling** des étapes avec statuts pending / running / done / failed.
- [19:08] Studio, vue d'exécution : timeline « façon Temporal » par étape, parallélisation visible, sorties consultables ; selon l'auteur, possibilité de **rejouer à partir d'une étape**.
- [20:16] Bouton **« Publish to Vibe » désactivé** pour ce workflow : il faut respecter le format conversationnel ; second worker `worker-vibe` avec liste de tâches (todo), **canvas payload** et sortie texte (doc « Conversational workflows » › « Publish in Vibe »).
- [23:53] « Publish to Vibe » → pop-up de confirmation → publié ; dans Vibe (« anciennement Le Chat ») › Workflows : le workflow demande confirmation de la destination, affiche « workflow started » (lien vers l'exécution), les étapes, puis le résultat mis en forme via canvas (~34 s).

**Conseils/opinion** : motif « worker chez soi, orchestration managée » jugé réutilisable pour d'autres SaaS ; possibilité de combiner chat d'entreprise et Vibe.

---

### 3.7 — « Debug MCP Connector Auth with the Connectors Debugger » (officielle)

| Champ | Valeur |
|---|---|
| Chaîne | Mistral (officielle) |
| Date | 24/06/2026 |
| Durée · Vues | 4:56 · 641 |
| URL | https://www.youtube.com/watch?v=QjoTkonLub4 |
| Liens | docs `docs.mistral.ai/studio-api/connectors/debugger` ; Studio `console.mistral.ai/build/connectors/playground?source=test_connector` |

**Résumé.** Démo d'un outil Studio qui exécute pas à pas l'authentification **OAuth MCP** d'un serveur (fourni par URL) et affiche, pour chaque étape, le statut, la latence et la réponse brute du serveur. Deux pannes volontaires sont diagnostiquées puis corrigées.

**Les 12 étapes montrées** (avec latences observées)

| # | Étape (libellé) | Ce qui est vérifié |
|---|---|---|
| 1 | « Reach server » (277 ms) | Joignabilité |
| 2 | « Parse authentication challenge » | En-tête `WWW-Authenticate` bien formé |
| 3 | « Fetch protected resource metadata » (278 ms) | Document well-known « OAuth protected resource » pointant vers le bon serveur d'autorisation |
| 4 | « Fetch authorization server metadata » (410 ms) | Endpoints token et registration, grant types supportés |
| 5 | « Detect authentication method » | Ex. authorization code + PKCE |
| 6 | « Register OAuth client » (136 ms après correctif) | Enregistrement dynamique (RFC 7591) |
| 7 | « Build authorization URL » | — |
| 8 | « Get user consent » | — |
| 9 | « Exchange authorization code » (227 ms) | Échange code → token |
| 10 | « Validate token » | — |
| 11 | « Initialize MCP » (553 ms) | Handshake MCP |
| 12 | « Report overview » | Synthèse (tout vert) |

**Points clés horodatés**
- [01:26] Échec étape 6 : `invalid_client_metadata`, « dynamic client registration is not permitted ». Lecture : soit l'enregistrement dynamique est volontairement désactivé (il faut un client ID/secret pré-enregistré par le propriétaire du serveur), soit l'endpoint est mal configuré (un 500 ou une réponse malformée indiquerait un bug serveur).
- [02:55] Échec étape 9 : `unsupported_grant_type` — le serveur ne lisait que du JSON alors que RFC 6749 impose un corps **form URL-encoded** ; correctif d'une ligne (middleware URL-encoded d'Express).
- [04:25] Bénéfice : statut HTTP et corps d'erreur exacts à chaque étape au lieu d'un message générique « token exchange failed ».

---

### 3.8 — « Introducing versioned prompts and skills in Studio » (officielle)

| Champ | Valeur |
|---|---|
| Chaîne | Mistral (officielle) |
| Date | 09/07/2026 |
| Durée · Vues | 3:17 · 2 455 |
| URL | https://www.youtube.com/watch?v=nxhRrry5UiY |
| Liens | blog `mistral.ai/news/manage-prompts-and-skills-in-studio` ; Studio `console.mistral.ai/build/skills`, `console.mistral.ai/build/prompts` ; spec `agentskills.io` |

**Résumé.** Annonce de trois nouveautés : **skills versionnés**, **prompts à labels** et **partage par périmètre d'équipe**, pour que les personnes proches du comportement de l'agent puissent l'itérer sans release de code. Compléments : démo d'édition d'un skill (C5) et explication détaillée par un créateur (C6).

**Points clés horodatés**
- [00:00] Problème : modifier le comportement d'un agent ressemble à une release de code (PR, revue, déploiement) ou, à l'inverse, à un « free-for-all » non versionné ; les UI de prompts existantes versionnent rarement et ne montrent ni quoi ni qui a changé.
- [01:01] Studio traite le comportement d'agent (skills, prompts, objets partageables) comme des **artefacts logiciels versionnés et auditables**, gérés indépendamment du code applicatif.
- [01:21] **Skill** = bundle versionné contenant instructions, outils et documents de référence ; identité stable et adressable (nom, description, modèle de propriété). Exemple : épingler un workflow de support sur `tier1-support-v1` ; passage à v2 délibéré (pas de dérive subie).
- [01:43] **Prompts** = règles de comportement qui **passent d'un environnement à l'autre via des labels** (dev → staging → prod), à l'initiative de support ops, PM ou compliance ; l'ingénierie n'est pas nécessaire ; visibilité de qui a fait chaque changement.
- [02:24] **Objets privés et partageables** : variantes privées (région régulée, segment client sensible, outil interne à accès élevé) visibles seulement des personnes concernées ; les autres ne voient que ce qui est « workspace-visible ».
- [02:42] Séparation de trois choses habituellement mêlées : comportement / code, gouvernance / confiance, itération / déploiement ; itérer et **revenir en arrière** facilement.

---

### 3.9 — « The Future of Agentic AI with Mistral AI: Scaling Open-Source AI for the Enterprise (Webinar Replay) »

| Champ | Valeur |
|---|---|
| Chaîne | Data Science Connect ; orateur : Aaron Delp (Mistral AI) |
| Date | 09/07/2026 |
| Durée · Vues | 39:04 · 159 |
| URL | https://www.youtube.com/watch?v=tAt386mbgps |
| Chapitres YouTube | 0:00 Intro · 2:25 Company · 5:20 AI flywheel · 11:03 Product suite · 15:10 Use cases · 17:39 Getting started · 19:31 Deep dive into Mistral Studio · 23:10 Product demo · 32:36 Closing · 33:30 Q&A |

**Résumé.** La vidéo qui montre le plus d'écrans de la console : onglet **Admin** (organisations, workspaces, audit logs, connecteurs d'organisation, abonnements, préférences, limites), onglet **Studio** (audio, Document AI, Workflows avec exemples et exécutions, Skills publiés dans Vibe) et onglet **Docs & API**. Positionne Studio comme « builder » pour agents, skills, contrôle, observabilité et cycle de vie.

**Points clés horodatés**
- [03:28] AI Studio = outil « fondation » pour construire agents et skills, avec contrôle complet, observabilité et gestion du cycle de vie.
- [05:00] « Un peu plus de 1 000 » employés (contre 500–600 lors d'un webinaire précédent).
- [11:06] Démarche « build → activate → realize value ». **Build** = Forge + Studio (« Forge is a subset of Studio », selon l'orateur) ; Studio sert à construire **agents, modèles, workflows et skills** puis à les déployer dans **Vibe for work** et **Vibe for code** ; **Activate** = Vibe ; **Realize** = solutions sur mesure.
- [14:33] Studio : workflows agentiques, observabilité de bout en bout, **registres de données et de modèles** ; alimente recherche d'entreprise, analyse/visualisation de données, traitement documentaire et audio.
- [17:57] Démarche client : cas d'usage « iconique » → **tech feasibility** (pilote de 3–4 semaines) → production.
- [19:31] Briques de Studio citées : **workflows, AI registry, context engine**, personnalisation de modèles, **observabilité, évaluations, amélioration continue** ; bénéfices : itération plus rapide, qualité mesurable, observabilité profonde ; agents, « agent swarms », coordination agentique ; **portable** (hybride, environnements dédiés, self-hosted) ; catalogue unifié, traçabilité, réutilisation.
- [23:13] Démo `console.mistral.ai` : onglets **« Vibe », « Studio », « Docs & API », « Admin »**.
- [23:32] **Admin** : créer une organisation, ajouter des membres, créer un workspace (« default workspace ») ; un utilisateur peut appartenir à plusieurs workspaces et organisations ; **audit logs** (tout est journalisé : action humaine, skill, etc.) ; **connecteurs au niveau organisation** (GitHub, Slack, Gmail… « connect » pour toute l'organisation) ; gestion des **abonnements** ; activation/désactivation de fonctionnalités.
- [25:06] Admin › préférences : **« Work mode »** de Vibe désactivé → l'onglet Work disparaît pour l'utilisateur ; réactivé → revient (effet immédiat).
- [25:45] Limites : **tokens par seconde / par minute** ; fonctions d'audit ; **désactiver le téléchargement de fichiers**.
- [26:43] Studio : audio **speech-to-text**, **text-to-speech**, **Document AI (OCR)** — utilisables dans l'UI, en batch et par API.
- [27:19] Studio › Workflows : cas d'exemple (sinistre d'assurance, conformité de libération de cargaison, validation de marchandises dangereuses) issus de **« Get started »** → clés API → **« Explore cookbooks »** ; liste des exécutions (terminées / en cours) ; **connexion à GitHub** pour déployer ; **planifications (schedules)** possibles.
- [28:51] Lancement d'un workflow « code modernization » longue durée (fichiers modifiés un à un, cochés au fil de l'eau) et d'un workflow quasi instantané (< 1 s).
- [30:07] Studio › Skills : skill « hello world » créé par l'admin et **publié dans Vibe** ; côté utilisateur Vibe : liste de skills incluant des **skills pré-construits** et le skill publié, exécuté dans le chat.
- [31:21] « Docs & API » : cookbooks (workflows, OCR, STT), vue d'ensemble des modèles, section quickstart. Prérequis répétés : compte Mistral, Python, **uvx**, clé API.
- [33:35] Q&R : 20 à 30 modèles ; un modèle robotique sorti le matin même ; OCR 4 deux semaines plus tôt ; Medium 3.5 orienté code agentique.
- [36:35] Le principal problème client : ajuster ensemble **modèle, harness et workflows d'agents** (harness = enveloppe qui orchestre les agents autour du modèle).

**Chiffres** : > 1 000 employés ; pilote 3–4 semaines ; « 10–15 minutes » pour démarrer avec les cookbooks.

---

### 3.10 — « Fin x Mistral AI: Evaluating Your AI Agent | Paris | July 2026 »

| Champ | Valeur |
|---|---|
| Chaîne | Fin (ex-Intercom) ; intervenants : Pedro Tabacof (Principal ML Scientist, Fin) et **Henry Lagarde (Software Engineer, Mistral AI)** ; meetup du 02/07/2026 |
| Date | 16/07/2026 |
| Durée · Vues | 1:05:59 · 390 |
| URL | https://www.youtube.com/watch?v=bUDwFxbf_M8 |
| Chapitres YouTube | 0:00 Welcome · 2:22 Why evaluation · 5:46 Four-stage framework · 7:56 Manual evals · 12:35 LLM judges · 16:06 A/B testing · 18:47 Monitoring · 22:29 OpenTelemetry · 26:05 Review, monitor, protect · 35:28 Q&A |

**Résumé.** Seule vidéo où un ingénieur Mistral décrit la logique d'évaluation continue des agents « appliquée en production » chez Mistral. Studio n'est pas nommé : le lien avec Observability/Judges de Studio est une **(inférence)**. La première moitié (Fin) donne un cadre générique d'évaluation.

**Partie Fin (Pedro Tabacof), en bref** : quatre étapes (vérifications manuelles → évaluation hors ligne/backtest avec métriques déterministes et LLM → A/B test → monitoring) ; anecdotes (formatage aberrant non détecté par les juges, longueur de réponse ×3 non surveillée) ; ne pas déléguer les métriques triviales (longueur, JSON, taux d'erreur) à un juge LLM ; ensembles de juges puissants, échantillons appariés, désaccord entre juges comme signal d'erreur ; expérience de latence 5 → 20 s qui a amélioré toutes les métriques ; 1 000 à 10 000 échantillons selon le coût.

**Partie Mistral (Henry Lagarde), points clés horodatés**
- [21:25] Deux cadres : « legacy » (observabilité classique) et **« judge model framework »**.
- [22:00] Observabilité : **OpenTelemetry** (open source, neutre) réutilisé pour tracer les agents : sortie LLM, métadonnées, tokens, latence, raisonnement, **outils MCP appelés**, dans une vue unifiée avec les appels HTTP aux systèmes existants.
- [24:58] Le « judge model framework », développé chez Mistral et appliqué à des systèmes en production, en trois étapes : **Review** (évaluation hors ligne sur scénarios prédéfinis, avant mise en prod et en continu car le fournisseur de modèle peut changer), **Monitor** (détecter usages anormaux et risques émergents en temps réel), **Protect** (alerter l'équipe adéquate — logiciel, ML, science).
- [27:29] Entrées de Review : types d'agents, base d'exemples réels, **matrice de risques** (fuite de PII, interactions inhabituelles, fuite d'information propriétaire) ; risques associés par type d'agent (médical ≠ service client) ; principe de « subsidiarité » : surveiller ce qui compte pour son système.
- [29:04] Détection des échecs par **LLM-as-a-judge** ; taux d'échec suivi dans le temps ; matrice probabilité × impact pour décider « go / no go ».
- [29:42] **Agent-as-a-judge** : un agent externe rejoue ce qui s'est passé et compare au résultat attendu ; scores avec niveau de confiance.
- [30:54] Protect : un agent/workflow analyse, déclenche une alerte, puis un **moteur de recommandation** propose des changements (prompt système, amélioration MCP) et **crée de nouveaux scénarios** réinjectés dans Review → boucle « auto-améliorante ».
- [34:40] Traces minimales : entrées/sorties (rejouables), latence (critique pour la voix).
- [44:18] Un juge = une seule vérification précise (ex. « répond-il dans la langue de l'utilisateur ? ») ; améliorer le juge sur les cas manqués.
- [48:29] Transformer chaque incident remonté (réseaux sociaux, feedback) en scénario de test.
- [51:56] Ne pas simuler les humains par LLM (accord des deux intervenants) ; juger le résultat final.
- [53:39] Chemins critiques sans tolérance d'erreur → étapes déterministes, pas de LLM.
- [59:56] Le **nommage et la description des outils MCP** changent le comportement (ajouter « get » a aidé) ; re-récupérer la liste des outils MCP à chaque tour réduit les appels d'outils fantômes.
- [62:22] Seuils de risque fixés par le responsable des risques de l'entreprise, différents par type de risque (plus bas pour la fuite de secrets que pour l'hallucination).

---

### 3.11 — « Inside Mistral – What it really takes to build AI Products – Elisa Salamanca (VP Product) »

| Champ | Valeur |
|---|---|
| Chaîne | Le French Product (podcast vidéo) ; invitée : Elisa Salamanca, VP Product, Mistral |
| Date | 21/07/2026 |
| Durée · Vues | 45:24 · 1 034 |
| URL | https://www.youtube.com/watch?v=2Rlj3G3G_So |
| Chapitres YouTube | … 9:51 Why Mistral killed the 6-month roadmap · 10:48 Visible feature vs invisible capability · 16:15 Three engines · 17:22 Forge · 19:26 Specs · 20:26 Evals, failure thresholds · 28:56 Inside Studio: governance and control · 31:58 Configurable, not custom … |

**Résumé.** Première interview publique d'un membre de l'équipe produit. Utile pour la philosophie produit de Studio : code-first, gouvernance invisible pour l'utilisateur final, évaluations comme interface produit/science.

**Points clés horodatés**
- [05:04] Arrivée fin 2024 ; « grand lancement la semaine dernière » et premier sommet (~2 000 personnes).
- [09:51] Feuilles de route sur **2–3 mois** (un nouveau modèle tous les 3–4 mois) au lieu de 6 mois.
- [12:31] Capacités visibles vs invisibles : le mode raisonnement devrait être décidé par le modèle, pas par l'utilisateur ; le canvas utilise la génération de code de façon invisible.
- [16:07] Trois moteurs produit : innovations issues de la science ; itérations produit avec les utilisateurs ; **engagements entreprise via FDE**. Forge (sorti en mars) vient de 18 mois de travail client ; **Workflows a été construit avec des clients** pour intégrer des règles déterministes : c'est « la couche d'orchestration ».
- [21:12] Les modèles échoueront : définir des **seuils d'acceptabilité chiffrés** par mode d'échec (ex. < 1 % pour un cas, boucle infinie < 0,5 %) et prévoir un **échec gracieux** ; besoin de volumes de tests suffisants pour détecter un échec à 2 %.
- [22:23] L'interface produit/science, ce sont les **évaluations** : exemples « golden » et mauvais exemples, notes de notation (« grading notes ») décrivant ce qu'est une bonne réponse ; une spec devient « ton et comportement attendus » plutôt qu'une maquette.
- [23:51] Des « model behavior architects » (pas toujours ingénieurs) travaillent le ton ; tous les PM devraient regarder les données.
- [28:56] **Studio** = là où se rejoignent connexions, workflows, permissions, gouvernance et contexte propre à l'entreprise. Rendre le contrôle puissant sans alourdir l'expérience : (1) les usages évoluent vers l'asynchrone/autonome **dans des sandboxes contrôlées** ; (2) ceux qui gouvernent ne sont pas les utilisateurs finaux : définir **connecteurs/serveurs MCP autorisés**, **politiques** (ex. données sensibles ne sortant jamais du réseau → pas de web search pendant l'usage de la base de connaissances) ; l'utilisateur final « ne peut simplement pas » faire l'action interdite, sans avoir à s'en soucier.
- [32:36] Cap de Studio : **environnements sandbox contrôlés**, ensembles d'outils/connecteurs autorisés, **hooks** dans le harness pour stopper au bon niveau, avec information de l'utilisateur.
- [38:51] **Studio pensé « developer first, code oriented first »**, et non comme un constructeur de workflows en glisser-déposer (insuffisant pour le critique) ; prochaine étape : ajouter **une couche low-code au-dessus** pour les cas simples. Principe : « configurable, pas sur mesure ».
- [40:22] Ne pas sur-optimiser prompts ou skills quand le prochain modèle résoudra le problème.

---

### 3.12 — « Mistral: Match the Tool to the Stakes – Skills, Prompts and Workflows in Mistral »

| Champ | Valeur |
|---|---|
| Chaîne | Vultr (captation d'événement) ; oratrice : Jen Person, DevRel engineer, Mistral |
| Date | 27/07/2026 |
| Durée · Vues | 15:36 · 32 |
| URL | https://www.youtube.com/watch?v=c5XrvauOjMc |

**Résumé.** Grille de décision **prompt réutilisable → skill → workflow** illustrée par l'approbation de factures, avec démo dans Vibe Work puis exécution d'un workflow suivie dans Studio.

**Points clés horodatés**
- [02:40] Exemple : facture reçue → vérification contre les règles internes → paiement ; faisable avec connecteurs + prompt, skill ou workflow.
- [02:57] Connecteurs (MCP) prêts à l'emploi : Stripe, Slack, Gmail, Notion… ; **Mistral gère authentification et autorisation**, quel que soit le support (prompt, skill, workflow).
- [05:01] Prompts réutilisables dans Studio : **versions et alias**, édition en console ou par programme, découplés des releases d'ingénierie ; retour arrière ; on sait qui a modifié ; **versions privées** par région ou entité.
- [06:31] Skills : basés sur la **spec ouverte Agent Skills** (non propre à Mistral) ; l'agent choisit quand les utiliser ; chargement progressif de références multiples → moins de tokens que des prompts.
- [07:25] Workflows : « production grade » ; **SDK Python** et **SDK TypeScript « désormais disponible »** ; le code plutôt que le glisser-déposer car la personnalisation dépasse toujours les blocs (exemple : formulaire Slack → base Notion) ; **la CLI génère un projet avec des skills** pour qu'un agent écrive le code ; moins de tokens ; **human-in-the-loop** avec pause de plusieurs heures/jours ; observables et auditables ; récurrents ; **mode conversationnel** dans Vibe Work.
- [10:12] Démo Vibe Work (connecteurs, sources de données, skills ; Work mode vs Code mode) : prompt « issues Linear de l'équipe » → demander à Vibe de **transformer la session en skill réutilisable** (étapes explicites : obtenir la date, interroger Linear).
- [12:00] Workflow exécuté localement ; déclenchement **planifié ou par webhook** ; exemple téléchargeable via une commande CLI de la doc ; dans Studio, chaque étape avec **entrées et sorties**, reprise, historique d'audit.
- [13:14] Étape d'auth : avec OAuth 2.0, **le workflow attend un rafraîchissement de credentials** et peut notifier (Slack, Vibe).
- [14:07] Règle : ton/infos → prompt réutilisable ; méthode fiable mais souple → skill (bon point de départ pour itérer) ; cohérent, auditable, prêt pour la prod → workflow ; arbitrage **flexibilité vs garanties** ; « il y aura toujours des connecteurs ».

---

### 3.13 — « Build a database advisor agent with a custom DeepWiki Connector » (officielle)

| Champ | Valeur |
|---|---|
| Chaîne | Mistral (officielle) |
| Date | 05/08/2026 |
| Durée · Vues | 6:36 · 1 526 |
| URL | https://www.youtube.com/watch?v=qIAJyb1w7Js |
| Liens | cookbook `docs.mistral.ai/resources/cookbooks/mistral-connectors-01-build-a-database-advisor-agent` ; docs `docs.mistral.ai/studio-api/connectors` ; `console.mistral.ai/home` |

**Résumé.** Construit un agent « Database Showdown Judge » qui compare SQLite, DuckDB et LevelDB en lisant leur code source via le serveur MCP **DeepWiki**, et parcourt **tout le cycle CRUD des Connectors** avec le SDK Python.

**Points clés horodatés**
- [00:20] Critères : modèle de stockage, garanties ACID, débit d'écriture, capacités de requête, simplicité de l'API Python ; réponse terminée par une recommandation structurée.
- [00:20] Connectors = serveurs MCP enregistrés utilisables comme outils dans **conversations et agents**, depuis les **SDK, l'API, Studio et Vibe**, **sans gérer le transport MCP localement**.
- [01:20] Clé API générée dans Studio ; pour « Connector access scope », cocher **« private and shared connectors »**.
- [01:57] Définition : « pont » nommé et réutilisable entre services Mistral (agents, workflows, Vibe) et une source externe.
- [02:38] Un connecteur par base, même URL DeepWiki, chemins de dépôts différents ; `connectors.create_async` puis `create_or_update_user_credentials_async` **avec des credentials vides pour activer le connecteur dans le workspace** ; préfixe `showdown_` pour filtrer.
- [02:59] `connectors.list_async` (filtrer par préfixe) ; [03:22] lister les outils de chaque connecteur ; **activer/désactiver des outils précis dans Studio**.
- [03:44] Schéma de réponse JSON passé en argument de complétion ; agent `mistral-medium-latest` avec la liste `connector_ids`.
- [04:05] `start_stream_async` pour suivre les appels d'outils ; `get_messages_async` puis dernier message → JSON parsé.
- [05:05] `connectors.update_async` (nom, description, URL ou args) pour marquer le gagnant « SELECTED » ; `connectors.delete_async` pour les autres ; `agents.delete_async` pour l'agent.

---

### 3.14 — « AI Engineer Paris 2026 Opening Keynotes: Mistral, Langfuse & Sizzy | Day 1 »

| Champ | Valeur |
|---|---|
| Chaîne | AI Engineer (live à Station F, le 23/09/2026) ; segment Mistral : **Lélio Renard Lavaud**, VP Engineering (3ᵉ employé) |
| Date | 24/09/2026 |
| Durée · Vues | 1:13:35 · 12 195 |
| URL | https://www.youtube.com/watch?v=CGq9KRSb9Kc |

**Résumé.** Keynote Mistral [46:36–71:24] : Studio comme socle de primitives pour développeurs, « Vibe unifié » pour les utilisateurs métiers, **sécurité agentique** avec politiques administrateur, souveraineté, modèles et playgrounds. Le reste (Langfuse : histoire économique des technologies ; Sizzy : « software factories », MCP agrégateur, skills via MCP) n'est pas propre à Mistral.

**Points clés horodatés (segment Mistral)**
- [46:53] Mistral a 3 ans et 4 mois ; ~1 300 employés.
- [47:47] Acquisition de **Koyeb** (transcrit « COB ») pour les sandboxes/unités de calcul des charges agentiques ; acquisition en mai d'**Emmi AI** (simulation physique, transcription incertaine) ; partenariat industriel de 150 M$ (bénéficiaire mal transcrit) ; **Series D de 3 Md€** annoncée la semaine précédente.
- [51:07] « La studio » = produit fort pour développeurs, avec des **primitives au-dessus des modèles** nécessaires à la production : **workflows (exécution longue durée), sandboxes**, etc. ; **Vibe** = produit utilisateur final qui exploite ces capacités.
- [52:18] Persona « Steven » (finance) : un utilisateur métier qui veut construire des applis (croiser data lake, Excel, Notion) dans un cadre d'entreprise → **version unifiée de Vibe**.
- [53:32] Automatisation interne : alerte Slack nocturne → agents asynchrones sur des sandboxes, via connecteurs **Grafana, Sentry, GitHub** → pistes d'investigation postées dans Slack.
- [55:05] Vibe unifié : un prompt simple → agents en arrière-plan qui codent, testent, déploient, hébergent et itèrent pendant minutes/heures → application partageable avec **contrôles d'accès basés sur les permissions**. **Un seul harness** pour toutes les surfaces (session locale « téléportée » vers le web, sandboxes, mobile, push GitHub, CI).
- [57:46] La plateforme s'améliore à l'usage : skills et applis partagés ; après une semaine de **traces**, un skill se **corrige lui-même** (mauvaise utilisation d'une option non documentée du MCP Grafana) → plus rapide et moins de tokens.
- [58:59] Menaces agentiques : accès privilégiés à de nombreux connecteurs et données, non-déterminisme, **injection de prompt**. Défenses : entraînement du modèle ; **privilèges restreints et dynamiques par étape/workflow** ; **sandboxes** ; **garde-fous à l'exécution** déduits des traces bas niveau (appels système, appels réseau) ; « collaboration dynamique » pour accorder la bonne permission au bon moment.
- [61:21] Démo : Vibe CLI lit une issue GitHub piégée et exfiltre une clé secrète. Parade : **« prompt injection rules »** — choix de **classifieurs** (PII, secrets, savoir d'entreprise…), d'une **source**, de **seuils**, du **type de modération** et de l'**action** ; règle attachée à une **policy** appliquée par **surface produit** (Vibe web, app mobile, CLI) par l'admin d'entreprise ; l'action est bloquée **au niveau réseau** sans configuration utilisateur.
- [62:50] Souveraineté : données, « intelligence » (où l'on analyse/fine-tune), calcul (inférence, ZDR), opérationnel (audit logs) ; centre de données près de Paris avec GPU NVIDIA B300 pour charges internes et clients sensibles.
- [64:54] Modèles généralistes, spécialistes (OCR, Voxtral), modèles fine-tunés par client ; Labs (preuve formelle, modération ultra-rapide — noms mal transcrits).
- [66:05] Démos Voxtral : clonage de voix ; STT avec diarisation temps réel ; transcription + traduction en direct (cas KYC bancaire en Belgique : dossiers incomplets 80 % → 10 %).
- [68:28] OCR 4.1 (été 2026) ; **bibliothèque documentaire dans Vibe** (upload de téraoctets, pipeline OCR, RAG avancé).
- [69:55] **Playgrounds dans Studio** pour tester les modèles voix et OCR, y compris les **bounding boxes** OCR ajoutées « il y a un mois ».

---

### 3.15 — « Build a quickstart generating agent with web search and Connectors » (officielle)

| Champ | Valeur |
|---|---|
| Chaîne | Mistral (officielle) |
| Date | 01/10/2026 |
| Durée · Vues | 7:09 · 2 231 |
| URL | https://www.youtube.com/watch?v=Th8npm3z1kA |
| Liens | cookbook `docs.mistral.ai/resources/cookbooks/mistral-connectors-02-build-a-quickstart-generator` ; `console.mistral.ai` |

**Résumé.** Même prompt (« quickstart » pour la bibliothèque Polars) exécuté cinq fois avec des ressources croissantes pour montrer l'effet des outils : aucun outil → web search → connecteur → les deux → connecteur filtré.

**Points clés horodatés**
- [01:25] Clé API créée dans la console : dans le champ **« connectors access scope »**, choisir **« private and shared connectors »**.
- [01:42] Étape 1, sans outil : réponse rapide et assurée mais potentiellement périmée (données d'entraînement).
- [02:33] Étape 2, **web search** — « l'un des outils par défaut des agents Mistral » (liste dans la doc) : réponse plus complète et sourcée.
- [03:15] Étape 3, connecteur vers **Context7** (serveur MCP de docs officielles de bibliothèques) via `connectors.create_async` ; un connecteur n'est pas un outil unique mais **tous les outils exposés par le serveur MCP** (ici : résoudre l'ID d'une bibliothèque, puis interroger sa doc) ; le modèle choisit seul, en lisant les descriptions d'outils.
- [04:48] Étape 4, les deux : docs officielles + web pour les pièges et migrations.
- [05:06] Étape 5, **tool filtering** : ne garder que l'outil de lecture de doc ; motifs : focus, et **sécurité** (retirer les outils d'écriture/suppression pour un agent en lecture seule) ; ID de bibliothèque pré-renseigné.
- [06:18] Nettoyage : un appel pour supprimer l'agent, un pour les connecteurs.
- [06:36] Conclusion : plus l'information fournie par les outils est exacte, meilleure est la sortie.

---

## 4. Interface utilisateur : synthèse des écrans montrés

### 4.1 Routes de la console révélées par les descriptions des vidéos officielles
(liens courts `mistr.al/…` résolus le 21/10/2026 ; paramètres `utm_*` retirés)

| URL console | Écran | Vidéo source |
|---|---|---|
| `console.mistral.ai/home` | Accueil console | §3.13 |
| `console.mistral.ai/build/playground` | Playground (dont audio : STT, TTS, voix) | C9, C10 |
| `console.mistral.ai/build/workflows` | Liste des workflows | §3.5 |
| `console.mistral.ai/build/connectors` | Catalogue/gestion des connecteurs | C2, C3, C7 |
| `console.mistral.ai/build/connectors/playground?source=test_connector` | Connectors Debugger / test de connecteur | §3.7 |
| `console.mistral.ai/build/skills` | Skills | §3.8, C5 |
| `console.mistral.ai/build/prompts` | Prompts | §3.8 |
| `chat.mistral.ai/work` | Vibe Work (côté utilisateur) | C7, C8 |

Liens docs associés : `docs.mistral.ai/studio-api/workflows/getting-started/introduction`, `…/your_first_workflow`, `…/core_concepts/workers`, `…/core_concepts/activities`, `…/studio-api/workflows/building-workflows/connectors`, `…/studio-api/knowledge-rag/connectors`, `…/studio-api/connectors`, `…/studio-api/connectors/debugger`, `…/vibe/work/connectors`, `…/le-chat/knowledge-integrations/connectors` ; blogs `mistral.ai/news/workflows`, `mistral.ai/news/manage-prompts-and-skills-in-studio`.

### 4.2 Navigation générale
- **Déc. 2025** (§3.2) : la console Studio est organisée en trois blocs « Create » / « Observe » / « Improve ».
- **Juil. 2026** (§3.9) : barre d'onglets supérieure « Vibe » · « Studio » · « Docs & API » · « Admin » ; sélecteurs d'organisation et de workspace (un utilisateur peut être membre de plusieurs).
- Studio › « Get started » : obtenir des clés API, « Explore cookbooks » (§3.9).
- Création de workspace par un bouton « + », puis « New API key » (§3.6).
- Clé API : champ « Connector access scope » avec l'option « private and shared connectors » (§3.13, §3.15).

### 4.3 Écrans par brique

| Brique | Éléments d'interface observés | Sources |
|---|---|---|
| **Playground (texte)** | Sélecteur de modèle (modèles Mistral **et modèles fine-tunés**), réglages de configuration ; chaque appel génère une trace (déc. 2025). Dans la vue agent/playground (déc. 2025) : instructions, prix entrée/sortie affichés par modèle, outils (code, génération d'images, web search, « recherche premium »), paramètres temperature / max tokens / top P, fonctions, format de réponse texte / JSON / JSON schema | §3.2, C14 |
| **Agents** | Menu « Agents » à gauche ; liste (modèle, date de création) ; « Create agent » (nom, description) → ID d'agent ; extraits de code Python / TypeScript / curl ; liste de modèles ; instructions ; à l'enregistrement, **revue avant/après** des modifications ; temperature ; format de réponse texte / JSON / JSON schema ; « version history » ; copier l'ID ; partage/déploiement vers des collègues | C13, C14 |
| **Audio** | « Audio › Text-to-speech › My voices › Add new voice » (nom, upload ou enregistrement avec script de référence) ; voix pré-construites filtrables par genre, langue, émotion ; STT : upload jusqu'à 10 fichiers, diarisation, horodatage segment/mot, termes de biais de contexte, traduction, export ; bouton « code » ; playground TTS Voxtral 3 (voix, tags d'émotion/rythme, prononciations, « expressiveness », contexte de conversation) ; voice cloning playground (« professional voice », consentement, statut « ready ») | §3.3, C9–C12 |
| **Document AI / OCR** | Upload, aperçu, sortie Markdown/HTML, sortie JSON définie par champs, aperçu texte avec images extraites surlignées, tableaux, téléchargement ; bounding boxes (été 2026) | §3.3, §3.14 |
| **Workflows** | Liste ; fiche workflow ; « Start Workflow » + saisie d'entrée ; exécutions (en cours/terminées) ; timeline/flowchart par activity avec **entrées, sorties, durées** ; parallélisme visible ; déploiements (nom, local, dates) ; **« Publish to Vibe »** (désactivé si format non conversationnel ; pop-up de confirmation) ; planifications ; connexion GitHub ; exemples issus des cookbooks | §3.5, §3.6, §3.9, §3.12, C15 |
| **Connectors** | Onglet « Connectors » : catalogue de connecteurs intégrés (Linear, GitHub, Notion, Gmail, Slack, Stripe…) et custom ; ajout d'une **credential nommée** (plusieurs par connecteur) ; liste des outils (« interactive tools » / « read-only tools ») ; activation/désactivation outil par outil ; **Connectors Debugger** (12 étapes, latence, réponse serveur) | §3.7, §3.13, C2–C4, C7 |
| **Skills** | Onglet « Skills » : sélection, édition, « Save changes » = nouvelle version, **version notes**, attribution par utilisateur, **« publish to Vibe »** ; côté Vibe : skills pré-construits + publiés, invocables par slash command | §3.8, §3.9, C5, C7 |
| **Prompts** | Versions, labels d'environnement, diff entre versions, retour arrière, propriétaire, visibilité privée/workspace/organisation, audit log (description créateur) | §3.8, C6 |
| **Observability** (déc. 2025) | Explorer ; vue Trace (prompt système, message, appels d'outils, sources, réponse) ; Judges (lot / à la volée, score + explication) ; Campaigns ; Datasets ; dashboards ; AI Registry | §3.2 |
| **Admin** | Organisation, membres, workspaces ; audit logs ; connecteurs au niveau organisation ; abonnements ; préférences (Work mode on/off) ; limites tokens/s et tokens/min ; audit ; interdiction de téléchargement de fichiers | §3.9 |
| **Politiques de sécurité** (sept. 2026, emplacement exact non précisé) | « Prompt injection rules » : classifieurs, source, seuils, type de modération, actions → attachées à une policy par surface (Vibe web, mobile, CLI) | §3.14 |

### 4.4 Parcours types montrés
1. **Premier workflow** (§3.5) : `uvx mistralai-workflows-cli setup` → clé API créée à l'invite → `make start-worker` → Studio › Workflows › « Hello World » › « Start Workflow » → lecture de l'activity « greet ».
2. **Workflow publié dans Vibe** (§3.6) : worker au format conversationnel → Studio › Workflows › « Publish to Vibe » → Vibe › Workflows → exécution avec confirmation et rendu canvas.
3. **Connecteur dans Vibe** (C3, C7) : Studio › Connectors › choisir (Linear/GitHub/Notion) › ajouter une credential nommée → Vibe › `/connectors` pour activer → tâche multi-outils.
4. **Skill versionné** (C5) : Studio › Skills › éditer › « Save changes » (+ version notes) › « publish to Vibe » → test dans Vibe avec le skill et le connecteur GitHub.
5. **Débogage OAuth** (§3.7) : Studio › Connectors › Debugger › URL du serveur MCP → lecture des 12 étapes.

---

## 5. API et SDK vus à l'écran

### 5.1 Workflows (Python ; TypeScript annoncé disponible fin juillet 2026, §3.12)

| Élément | Rôle | Source |
|---|---|---|
| `uvx mistralai-workflows-cli setup` | Génère un projet (`src/workflows/`, `start.py`, `hello.py`, `dev_worker.py`, `discover.py`, `Makefile`, skills pour agents de code) | §3.5 |
| Décorateur `activity` | Déclare une étape (résultat persisté) | §3.5 |
| Décorateur `define` | Nom, display name, description du workflow | §3.5, §3.6 |
| Décorateur `entrypoint` | Point d'entrée de la classe workflow | §3.5 |
| `run_worker` | Lance le worker qui enregistre et exécute les workflows découverts | §3.5 |
| `execute_workflow_async` (client) | Déclenche une exécution (nom de déploiement, identifiant de workflow, entrée) | §3.6 |
| Plugin workflows (alias `WM` dans la démo) | Chat completions depuis une activity | §3.6 |
| `start_to_close_timeout` | Timeout d'activity | C15 |
| Nom de déploiement + clé API | Isolation des workers | §3.6 |
| Commandes `make` | `start-worker`, exécution de workflow, `streamlit`, test de charge, installation des dépendances | §3.5, C15 |
| Déclencheurs | Studio, SDK, API, Makefile ; planification ; webhook | §3.5, §3.12 |

### 5.2 Connectors et agents (SDK Python, méthodes asynchrones montrées)

| Méthode | Rôle | Source |
|---|---|---|
| `connectors.create_async` | Enregistrer un serveur MCP (nom, description, URL, args) | §3.13, §3.15 |
| `create_or_update_user_credentials_async` | Credentials (vides pour un MCP public) → active le connecteur dans le workspace | §3.13 |
| `connectors.list_async` | Lister les connecteurs (y compris ceux vus dans Studio) | §3.13, C4 |
| (listing des outils, appel direct d'un outil) | Inspection et appel d'outil hors agent | C4 |
| `connectors.update_async` | Modifier nom, description, URL, args | §3.13 |
| `connectors.delete_async` | Supprimer | §3.13 |
| Agent avec `connector_ids` | Attacher des connecteurs comme outils | §3.13 |
| `start_stream_async` / `get_messages_async` | Conversation en streaming, récupération des messages | §3.13 |
| `agents.delete_async` | Supprimer l'agent | §3.13 |

### 5.3 Recoupement avec la spec OpenAPI locale (grep ciblé, 21/10/2026)
- Connectors : `/v1/connectors/{connector_id_or_name}/tools` et `/tools/{tool_name}/call` (listing et appel direct, cf. C4) ; credentials par portée `/organization/credentials`, `/workspace/credentials`, `/user/credentials`, `/{consumer_scope}/credentials/{credentials_name}` (cohérent avec les credentials nommées de C2) ; `/share`, `/organization/share`, `/{consumer_scope}/activate|deactivate`, `/auth_url`, `/authentication_methods`.
- Workflows : `/v1/workflows/{workflow_identifier}/execute`, `/v1/workflows/deployments/{name}` (+ `/workers`, `/logs`), `/v1/workflows/schedules` (+ `pause`, `resume`, `trigger`), `/v1/workflows/executions/{execution_id}/reset` (correspond probablement au « rejouer depuis une étape » de §3.6 — inférence), `/trace/otel`, `/stream`, `/signals`, `/updates`.
- Prompts/Skills : `/v2/prompts/{prompt_id}/versions/{version}` et `/v2/skills/{skill_id}/versions/{version}` (tag `beta.skills`).
- Observability : `/v1/observability/judges`, `/datasets` (imports `from-playground`, `from-spans`), `/traces`, `/evaluations_v2`, `/optimizations` ; **aucune occurrence de « campaign »** dans la spec, alors que « Campaigns » figurait dans la démo de déc. 2025.

---

## 6. Limites, quotas, disponibilité, chiffres annoncés

| Sujet | Valeur annoncée | Date · source |
|---|---|---|
| Statut Workflows | Public preview | 28/04/2026 · §3.4 |
| Usage Workflows | « Des millions de processus » en production | 28/04/2026 · §3.4 |
| Accès Observability/registry | Une partie disponible, une partie sur liste blanche au cas par cas | 05/12/2025 · §3.2 |
| Déploiement Studio | SaaS ; packaging trimestriel pour on-prem/air-gapped | 26/03/2026 · §3.3 |
| Déploiement modèles | Serverless, cloud, VPC, on-prem, dédié, air-gapped | §3.2, §3.3 |
| Audio (UI) | 10 fichiers max par lot ; formats .mp3, .wav, .m4a, .flac, .ogg | C10, §3.3 |
| Audio/OCR (batch API) | Jusqu'à 1 000 000 fichiers | §3.3 |
| Clonage de voix (simple) | Échantillon propre de 3 à 30 s | 26/03/2026 · C9 |
| Voix professionnelle | Idéalement ≥ 30 min d'audio propre ; consentement obligatoire | 21/10/2026 · C12 |
| Texte TTS | < 300 mots par prompt ; épeler nombres et abréviations ; pas d'emojis | C9 |
| Voxtral TTS 3 | 34 émotions ; « 25 langues et 50 dialectes » à l'oral vs « 35+ langues, 50+ dialectes » dans la description | C11 |
| Prérequis Workflows | Compte Mistral, Python 3.12, uvx, clé API (une clé gratuite suffit pour la démo) | §3.5, §3.6 |
| Limites admin | Tokens par seconde et par minute ; désactivation des téléchargements de fichiers | §3.9 |
| Délais d'accompagnement | Pilote 2–4 semaines (mars) / 3–4 semaines (juil.) ; « un trimestre » prototype→prod | §3.3, §3.9, §3.1 |
| Effectifs Mistral | ~500 (déc. 2025) → 800+ (mars 2026) → > 1 000 (juil. 2026) → ~1 300 (sept. 2026) | §3.2, §3.3, §3.9, §3.14 |
| Tarifs Studio | **Aucun tarif mentionné** dans les vidéos ; prix par modèle visibles dans le sélecteur du playground | C14 |

---

## 7. Détails fins, pièges, conseils récurrents

- **Portée de la clé API** : pour utiliser des connecteurs créés soi-même, la clé doit avoir « private and shared connectors » comme « Connector access scope » (rappelé dans deux tutoriels officiels, §3.13 et §3.15).
- **Activation d'un connecteur custom** : après création, appeler `create_or_update_user_credentials_async` même avec des credentials vides (§3.13).
- **Un connecteur = tous les outils du serveur MCP** : filtrer les outils pour garder un agent focalisé ou en lecture seule (§3.15) ; l'activation outil par outil existe aussi dans Studio (§3.13).
- **Credentials multiples** : nommer chaque credential pour gérer plusieurs organisations/comptes d'un même service (C2, C3).
- **OAuth MCP** : l'enregistrement dynamique (RFC 7591) peut être volontairement désactivé côté serveur → client ID/secret pré-enregistrés ; l'endpoint token doit accepter `application/x-www-form-urlencoded` (RFC 6749) (§3.7).
- **Workers** : connexions sortantes uniquement, aucun port entrant à ouvrir (§3.5) ; isolation par nom de déploiement (§3.6).
- **« Publish to Vibe » grisé** : le workflow doit respecter le format conversationnel (todo, canvas payload, sortie texte) (§3.6).
- **Credentials expirées dans un workflow** : l'exécution peut attendre un rafraîchissement OAuth et notifier l'utilisateur (§3.12).
- **Modèles « thinking » et SDK** : avec Magistral, la sortie de raisonnement a provoqué une erreur de validation pydantic côté SDK Python 1.7 ; l'UI agent n'offrait pas d'interrupteur pour désactiver le raisonnement ; contournement : passer à Mistral Small (créateur, mars 2026, C13).
- **Tutoriel « document processing »** : un dossier de point d'entrée manquait dans les instructions, à créer à la main (créateur, mai 2026, C15).
- **Versioning** : pinner un consommateur sur une version précise de skill (`tier1-support-v1`) pour éviter la dérive (§3.8) ; faire des modifications petites et itératives (C5, C7).
- **Évaluation** : un juge = un critère ; ne pas confier au juge les métriques déterministes ; transformer chaque incident en scénario ; seuils de risque par type de risque fixés par le métier ; ne pas simuler les humains (§3.10) ; seuils d'échec explicites (< 1 %, < 0,5 %) et échec gracieux (§3.11).
- **Outils MCP** : nommage et descriptions précis ; relister les outils à chaque tour (§3.10) ; les traces permettent à un skill de se corriger (§3.14).
- **Ne pas sur-optimiser** prompts et skills si le prochain modèle corrigera le problème (§3.11).
- **Choisir le bon niveau** : prompt → skill → workflow selon le besoin de garanties (§3.12).

---

## 8. Questions ouvertes / incohérences relevées

1. **Nom du produit** : « AI Studio », « Mistral AI Studio », « Mistral Studio », « Studio » coexistent, y compris dans les vidéos officielles du même mois.
2. **Le Chat → Vibe** : en mars 2026, « rebranding en cours » (§3.3) ; en mai 2026, « Vibe, anciennement Le Chat » (§3.6) ; des vidéos officielles d'avril 2026 parlent encore de « Work mode in Le Chat ». La frontière exacte Studio / Vibe Work n'est pas définie de façon uniforme.
3. **Forge dans ou hors Studio ?** « Forge is a subset of Studio » (§3.9, juil. 2026) vs Forge présenté comme brique distincte à côté de Studio (§3.3, mars 2026 ; et le créateur TTw8-0Sj7I0 parle de quatre piliers).
4. **Observability : vocabulaire de déc. 2025** (« Explorer », « Campaigns », « AI Registry ») — « Campaigns » n'apparaît plus dans la spec API actuelle (évaluations `evaluations_v2`) ; correspondance actuelle à vérifier dans les chapitres de doc.
5. **Workflows « public preview »** alors que « des millions de processus » tournent déjà en production (§3.4) : statut contractuel/SLA non précisé.
6. **Débogueur** : appelé « Connections Debugger » à l'oral, « Connectors Debugger » dans le titre et la doc (§3.7).
7. **Low-code** : la VP Product annonce une couche low-code au-dessus d'un Studio « code-first » (§3.11) ; aucune vidéo ne la montre au 21/10/2026.
8. **Air-gapped** : packaging trimestriel annoncé (§3.3) ; parité fonctionnelle avec le SaaS (Workflows, Observability, Connectors) non précisée.
9. **Emplacement des « prompt injection rules »/policies** : présentés comme contrôles d'admin d'entreprise appliqués aux surfaces Vibe (§3.14) ; rattachement à l'onglet Admin de la console non montré.
10. **Voxtral TTS 3** : 25 langues (oral) vs 35+ langues (description) (C11).
11. **SDK TypeScript Workflows** : annoncé « désormais disponible » fin juillet 2026 (§3.12), non montré.
12. **Rejeu depuis une étape** : affirmé par un créateur (§3.6) ; non montré dans les vidéos officielles (correspondance possible avec l'endpoint `reset`, inférence).
13. **Affirmations erronées de créateurs** : C14 présente une temperature de 1 comme le réglage « précis » (contraire de l'usage habituel des LLM, où une température basse réduit la variabilité) ; à ne pas reprendre sans vérification.
14. **Transcriptions automatiques** : noms d'acquisitions et de modèles Labs mal transcrits dans §3.14 (Koyeb, Emmi AI, modèle de modération) ; montant de 150 M$ attribué à un partenaire illisible.
15. **Keynote d'ouverture AI Now Summit 2026** (`IC0VNOzPZU8`, chapitre « Vibe and Studio platform » à 21:43) : **aucun sous-titre disponible**, contenu non vérifiable par transcription ; même problème pour le direct `-qHRgnKGfvg`. La vidéo « Building Production-Grade AI Systems » (`I-YuU4CkPBU`) est indisponible.

---

## 9. Compléments courts (lus en entier)

| # | Vidéo | Date · durée · vues | Apport |
|---|---|---|---|
| C1 | [Workflows: Build. Run. Observe.](https://www.youtube.com/watch?v=YQB6bsob6zE) (Mistral) | 28/04/2026 · 1:23 · 8 430 | Clip manifeste : processus qui survivent aux pannes, attendent, reprennent où ils se sont arrêtés, travaillent avec des humains et « se souviennent de chaque étape » ; exemples : souscription de prêt, examen de sinistre, traitement d'expédition. |
| C2 | [Use Connectors in Workflows](https://www.youtube.com/watch?v=hUPcLLti5x0) (Mistral) | 28/05/2026 · 1:55 · 851 | Connecteurs disponibles dans Workflows ; Studio › Connectors › Linear › nouvelle **credential nommée** (plusieurs credentials par service) ; connecteur alors utilisable dans Vibe, agents, workflows ; outils visibles dans Studio et via l'API ; exemple du starter project : résumé hebdo des issues Linear (équipe/projet → IDs → issues récentes → chat completions). |
| C3 | [Use Connectors in Vibe](https://www.youtube.com/watch?v=AR2IedLkEHo) (Mistral) | 28/05/2026 · 2:37 · 1 331 | Même activation dans Studio (Linear, GitHub, Notion) ; dans Vibe, slash command `/connectors` pour voir/activer ; tâche : exigences Notion → modification du code → PR GitHub → mise à jour Linear. |
| C4 | [Build, manage and run custom connectors](https://www.youtube.com/watch?v=bemtZTeCtQ8) (Mistral) | 15/04/2026 · 2:22 · 2 042 | SDK Python : lister les connecteurs vus dans AI Studio (dont un connecteur « GitHub app »), créer un connecteur DeepWiki (apparaît aussitôt dans Studio), connexion OAuth de GitHub (credentials stockées par l'API connecteurs), outils listés dans l'UI (« interactive » / « read-only ») et par SDK, **appel direct d'un outil** ; agent « open source auditor » (DeepWiki + web search pour chercher des CVE). |
| C5 | [Update a skill with versioning in Studio](https://www.youtube.com/watch?v=v_LttjsevRg) (Mistral) | 09/07/2026 · 1:22 · 854 | Studio › Skills › sélectionner › éditer › « Save changes » = nouvelle version ; **version notes** ; chaque changement attribué ; « publish to Vibe » ; test de la v2 dans Vibe avec le connecteur GitHub ; conseil : petits changements itératifs. |
| C6 | [Git for Prompts: Mistral Studio's New System of Record, Explained](https://www.youtube.com/watch?v=uN8dfAnDZQY) (Use AI with Tech Dad) | 10/07/2026 · 7:29 · 41 | Lecture créateur de l'annonce : chaque sauvegarde = **version immuable** ; **diff** entre deux versions ; retour à une version saine en minutes ; propriétaire nommé ; labels « staging »/« production » (promouvoir = déplacer un label) ; visibilité créateur → workspace → organisation ; **audit log** (qui, quand) ; l'application référence la définition gouvernée par label ; un changement de label peut déclencher la CI (exemple GitHub Actions via SDK, cité comme exemple de Mistral) ; prompt ≠ skill (le skill est chargé automatiquement si sa description — à rédiger comme une condition — correspond) ; l'observabilité relie une sortie à la version exacte ; skills **atteignables comme serveurs MCP** depuis Studio. |
| C7 | [Automate GitHub issue management with Vibe](https://www.youtube.com/watch?v=8MHd_arELJo) (Mistral) | 15/06/2026 · 3:20 · 1 047 | Studio › Connectors : GitHub (credentials gérées par Mistral), Linear optionnel ; skill de triage (exemple public `Mistral-AI-quickstarts/example-vibe-skill-for-github-issues`) ; projet Vibe Work, connecteurs attachés à la conversation, skill choisi par Vibe ou via slash command ; bugs corrigés et PR créées. |
| C8 | [Automate tasks using skills and Connectors in Vibe](https://www.youtube.com/watch?v=sTxSGrLkro0) (Mistral) | 20/07/2026 · 2:44 · 1 275 | Serveur MCP Bitly ajouté via Connectors + connecteur Notion ; Vibe génère un **skill** à partir des étapes réalisées (appels d'outils explicites → moins de tokens) ; skill placé dans une **tâche planifiée** (tous les jeudis) ; versioning pour revenir en arrière. |
| C9 | [Voice Customization 101 with Voxtral in Mistral Studio](https://www.youtube.com/watch?v=DffzOI3g8Yk) (Mistral) | 26/03/2026 · 2:36 · 10 942 | Studio › Audio › Text-to-speech › « My voices » › nouvelle voix (nom ; upload ou enregistrement avec script de référence) ; voix professionnelles filtrables (genre, langue, émotion) ; l'émotion de l'échantillon influe sur la sortie ; conseils : 3–30 s propres, parler naturellement, éviter les « euh » ; effet d'accent cross-lingue ; épeler nombres/abréviations, pas d'emojis, < 300 mots. |
| C10 | [Audio playground in Mistral Studio](https://www.youtube.com/watch?v=93ZAhW3bk8g) (Mistral) | 04/02/2026 · 0:56 · 7 974 | (Transcription = simple échantillon audio ; informations tirées de la description) Voxtral Transcribe 2 ; jusqu'à 10 fichiers (.mp3, .wav, .m4a, .flac, .ogg) ; diarisation activable ; horodatage par segment ou par mot ; termes de « context bias » pour le vocabulaire métier. |
| C11 | [Voxtral TTS 3 - Feature Overview](https://www.youtube.com/watch?v=y7Dtkjz3MZM) (Mistral) | 21/10/2026 · 2:03 · 1 043 | Console › text-to-speech playground › Voxtral TTS 3 ; voix pré-définies ; **tags d'émotion et de rythme** dans le texte (34 émotions) ; **prononciations** personnalisées ; curseur « expressiveness » ; contexte de conversation. |
| C12 | [Voxtral TTS 3 - Voice Cloning Overview](https://www.youtube.com/watch?v=1czHOKcAtfY) (Mistral) | 21/10/2026 · 1:42 · 1 541 | Voice cloning playground › « professional voice » ; un ou plusieurs clips (idéalement ≥ 30 min) ; nom, langue, genre (option), description et avatar (option) ; case de **consentement** ; « Create voice » → traitement → statut « ready » ; la voix reste dans le **workspace** jusqu'à suppression. |
| C13 | [Mistral AI Agent: Your 2-Minute Code Review Bot \| AI Studio](https://www.youtube.com/watch?v=X5IuZhiyftI) (Coders Academy) | 31/03/2026 · 11:24 · 374 | Studio › Agents › « Create agent » (nom, description) → ID ; extraits Python/TS/curl ; liste de modèles (Codestral, Devstral, Magistral Small…) ; instructions ; revue avant/après à l'enregistrement ; temperature 0.2 ; format de réponse text/JSON/JSON schema ; « version history » ; piège du modèle « thinking » avec le SDK 1.7 (voir §7). |
| C14 | [Comment créer un agent IA sur Mistral : la méthode opérationnelle](https://www.youtube.com/watch?v=mC27FQVO3Lk) (Loïc, FR) | 20/12/2025 · 17:36 · 4 597 | Studio difficile à trouver depuis le site ; deux entrées « Playground » et « Agents » (liste avec modèle et date) ; instructions en « mode opératoire » (entrée → analyse → livrable) puis « extensions » itératives ; sélecteur de modèle avec prix entrée/sortie ; outils code, images, web search, « recherche premium » ; temperature, max tokens, top P ; fonctions ; format JSON ; déploiement/partage à des collègues. |
| C15 | [Workflow Mistral : Démo de traitement de documents](https://www.youtube.com/watch?v=bWVfAn46FcM) (Kokori Kodo, FR) | 11/05/2026 · 18:14 · 1 719 | Rejoue le tutoriel officiel : scaffold CLI (nom de projet, clé API), dossier skills, `src/workflows`, `Makefile` ; champs d'extraction (patient, adresse, ordonnance…) ; 3 activities (URL signée du document, classification, extraction) avec `start_to_close_timeout` ; app Streamlit d'upload PDF ; jeux de faux documents médicaux fournis par Mistral ; test de charge (50 documents en parallèle) ; dans Studio, **flowchart** de l'exécution avec durée et détail par étape. |

---

## Annexe A — Couverture et méthode

### A.1 Vidéos retenues (✅ transcription lue en entier)

| § | ID | Transcription utilisée | Copie |
|---|---|---|---|
| 3.1 | vuKjy3ikgtE | sous-titres manuels EN | `sources/videos/vuKjy3ikgtE.txt` |
| 3.2 | Axlesb8yTro | auto EN | `sources/videos/Axlesb8yTro.txt` |
| 3.3 | xuyYHawwQB0 | auto EN | `sources/videos/xuyYHawwQB0.txt` |
| 3.4 | 9tXQBnpvVsU | manuels EN | `sources/videos/9tXQBnpvVsU.txt` |
| 3.5 | 7TnJJ0D__kk | manuels EN | `sources/videos/7TnJJ0D__kk.txt` |
| 3.6 | sKEKJGqTz0U | auto FR | `sources/videos/sKEKJGqTz0U.txt` |
| 3.7 | QjoTkonLub4 | auto EN | `sources/videos/QjoTkonLub4.txt` |
| 3.8 | nxhRrry5UiY | manuels EN | `sources/videos/nxhRrry5UiY.txt` |
| 3.9 | tAt386mbgps | auto EN | `sources/videos/tAt386mbgps.txt` |
| 3.10 | bUDwFxbf_M8 | auto EN | `sources/videos/bUDwFxbf_M8.txt` |
| 3.11 | 2Rlj3G3G_So | auto EN | `sources/videos/2Rlj3G3G_So.txt` |
| 3.12 | c5XrvauOjMc | auto EN | `sources/videos/c5XrvauOjMc.txt` |
| 3.13 | qIAJyb1w7Js | manuels EN | `sources/videos/qIAJyb1w7Js.txt` |
| 3.14 | CGq9KRSb9Kc | auto EN | `sources/videos/CGq9KRSb9Kc.txt` |
| 3.15 | Th8npm3z1kA | auto EN | `sources/videos/Th8npm3z1kA.txt` |

Compléments C1–C15 : ✅ lus en entier, copiés sous `sources/videos/<ID>.txt` (C10 : transcription sans contenu produit, description utilisée). Chaque copie commence par un en-tête (titre, chaîne, date, durée, vues, URL, type de sous-titres).

### A.2 Méthode
- Recherches yt-dlp (`ytsearch20/25`) : « Mistral AI Studio », « … tutorial », « … français », « … demo », « … launch », « … observability », « Mistral Studio agents », « Mistral workflows », « Mistral AI Now Summit 2026 », « Mistral AI Studio tuto agent », « Mistral AI Engineer talk agents », « Mistral VivaTech 2026 », « Mistral Studio evaluation judges », « Mistral AI Studio connectors MCP », « Mistral libraries RAG Studio », « Mistral AI Studio enterprise platform », « Mistral Studio playground », « Mistral Le Chat Enterprise agents builder », « Mistral AI Studio explained / présentation / review », « … agent runtime observability », « Mistral Studio workflows Temporal », « Mistral Vibe Studio agents », « console.mistral.ai Studio », « Mistral AI Studio no code agent » ; listing complet de la chaîne officielle `@MistralAIOfficial` (onglets videos, streams, shorts).
- Pré-tri par comptage de mots-clés (studio, workflow, observab, judge, connector, eval, librar, playground) dans les transcriptions, puis lecture intégrale des vidéos retenues et compléments.
- Aucune recherche n'a fait remonter de vidéo dédiée à **Libraries** (RAG) dans Studio ; les « Libraries » n'apparaissent qu'indirectement (bibliothèque documentaire de Vibe, §3.14).
- **Problèmes rencontrés** : limitation YouTube (HTTP 429 / « confirm you're not a bot ») en fin de collecte → 37 vidéos de la chaîne officielle sans date de publication dans l'annexe B (« — ») ; keynote AI Now Summit sans sous-titres ; une vidéo officielle indisponible ; qualité variable des transcriptions automatiques.

---

## Annexe B — Tableau de toutes les vidéos repérées (248)

Statuts : ✅ retenue (fiche §3) · ➕ complément lu (§9) · ⛔ exclue · — non retenue. Ordre : retenues, compléments, puis le reste par date décroissante (dates « — » : métadonnées non récupérées à cause de la limitation YouTube). Les résultats de recherche sans lien avec Mistral (tutoriels MCP/Ollama génériques, homonymes musicaux, etc.) ne sont pas listés.

| ID | Titre | Chaîne | Publication | Durée | Vues (21/10/2026) | Statut | Raison |
|---|---|---|---|---|---|---|---|
| [Th8npm3z1kA](https://www.youtube.com/watch?v=Th8npm3z1kA) | Build a quickstart generating agent with web search and Connectors | Mistral | 01/10/2026 | 7:09 | 2 231 | ✅ Retenue §3.15 | Tutoriel officiel le plus récent : connecteurs, web search, filtrage d'outils |
| [CGq9KRSb9Kc](https://www.youtube.com/watch?v=CGq9KRSb9Kc) | AI Engineer Paris 2026 Opening Keynotes: Mistral, Langfuse & Sizzy / Day 1 | AI Engineer | 24/09/2026 | 1:13:35 | 12 195 | ✅ Retenue §3.14 | Keynote VP Engineering : vision Studio/Vibe, sécurité agentique, politiques admin |
| [qIAJyb1w7Js](https://www.youtube.com/watch?v=qIAJyb1w7Js) | Build a database advisor agent with a custom DeepWiki Connector | Mistral | 05/08/2026 | 6:36 | 1 526 | ✅ Retenue §3.13 | Tutoriel officiel du cycle de vie complet des Connectors (SDK) |
| [c5XrvauOjMc](https://www.youtube.com/watch?v=c5XrvauOjMc) | Mistral: Match the Tool to the Stakes – Skills, Prompts and Workflows in Mistral | Vultr | 27/07/2026 | 15:36 | 32 | ✅ Retenue §3.12 | DevRel Mistral : grille prompts / skills / workflows avec démo Studio |
| [2Rlj3G3G_So](https://www.youtube.com/watch?v=2Rlj3G3G_So) | Inside Mistral - What it really takes to build AI Products - Elisa Salamanca (VP Product) | Le French Product | 21/07/2026 | 45:24 | 1 034 | ✅ Retenue §3.11 | Seule interview de la VP Product : philosophie produit de Studio, évaluations, gouvernance |
| [bUDwFxbf_M8](https://www.youtube.com/watch?v=bUDwFxbf_M8) | Fin x Mistral AI: Evaluating Your AI Agent / Paris / July 2026 | Fin | 16/07/2026 | 1:05:59 | 390 | ✅ Retenue §3.10 | Seule présentation Mistral sur le cadre d'évaluation/juges en production |
| [tAt386mbgps](https://www.youtube.com/watch?v=tAt386mbgps) | The Future of Agentic AI with Mistral AI: Scaling Open-Source AI for the Enterprise / Webinar Replay | Data Science Connect | 09/07/2026 | 39:04 | 159 | ✅ Retenue §3.9 | Webinaire officiel le plus complet sur l'interface (Admin, Studio, Workflows, Skills) |
| [nxhRrry5UiY](https://www.youtube.com/watch?v=nxhRrry5UiY) | Introducing versioned prompts and skills in Studio | Mistral | 09/07/2026 | 3:17 | 2 455 | ✅ Retenue §3.8 | Annonce officielle du versioning prompts/skills dans Studio |
| [QjoTkonLub4](https://www.youtube.com/watch?v=QjoTkonLub4) | Debug MCP Connector Auth with the Connectors Debugger | Mistral | 24/06/2026 | 4:56 | 641 | ✅ Retenue §3.7 | Démo officielle du débogueur OAuth des Connectors (12 étapes) |
| [sKEKJGqTz0U](https://www.youtube.com/watch?v=sKEKJGqTz0U) | Mistral Workflows : Qu'est-ce que c'est ? Démo | xavki | 31/05/2026 | 28:07 | 4 596 | ✅ Retenue §3.6 | Meilleure démo créateur FR de Workflows (architecture worker, UI, Publish to Vibe) |
| [9tXQBnpvVsU](https://www.youtube.com/watch?v=9tXQBnpvVsU) | Introducing Workflows | Mistral | 28/04/2026 | 4:02 | 14 636 | ✅ Retenue §3.4 | Annonce officielle de Workflows (public preview) |
| [7TnJJ0D__kk](https://www.youtube.com/watch?v=7TnJJ0D__kk) | Build your first Mistral Workflow | Mistral | 28/04/2026 | 5:42 | 12 956 | ✅ Retenue §3.5 | Tutoriel officiel pas-à-pas Workflows (CLI, worker, UI Studio) |
| [xuyYHawwQB0](https://www.youtube.com/watch?v=xuyYHawwQB0) | Building Enterprise Agents with Mistral AI / Open, Powerful, and Ready to Scale (Webinar Replay) | Data Science Connect | 26/03/2026 | 47:31 | 211 | ✅ Retenue §3.3 | Webinaire officiel (Mistral) avec démos Studio : audio, OCR, workflow eCTD |
| [Axlesb8yTro](https://www.youtube.com/watch?v=Axlesb8yTro) | AI Dev 25 x NYC / Param Singh: Building with Mistral: Open, Powerful, and Ready to Scale | DeepLearningAI | 05/12/2025 | 29:45 | 403 | ✅ Retenue §3.2 | Démo de la console Studio 6 semaines après le lancement (Playground, traces, Judges) ; vocabulaire Observability |
| [vuKjy3ikgtE](https://www.youtube.com/watch?v=vuKjy3ikgtE) | Mistral Launches Platform for Improved Enterprise AI | Bloomberg Tech | 24/10/2025 | 8:45 | 5 554 | ✅ Retenue §3.1 | Seule interview vidéo au moment du lancement de Studio (CEO) ; contexte, positionnement, chiffres |
| [y7Dtkjz3MZM](https://www.youtube.com/watch?v=y7Dtkjz3MZM) | Voxtral TTS 3 - Feature Overview | Mistral | 21/10/2026 | 2:03 | 1 043 | ➕ Complément §9 (C11) | Officielle (21/10/2026) : playground TTS Voxtral 3 |
| [1czHOKcAtfY](https://www.youtube.com/watch?v=1czHOKcAtfY) | Voxtral TTS 3 - Voice Cloning Overview | Mistral | 21/10/2026 | 1:42 | 1 541 | ➕ Complément §9 (C12) | Officielle (21/10/2026) : voice cloning playground (voix professionnelle) |
| [sTxSGrLkro0](https://www.youtube.com/watch?v=sTxSGrLkro0) | Automate tasks using skills and Connectors in Vibe | Mistral | 20/07/2026 | 2:44 | 1 275 | ➕ Complément §9 (C8) | Officielle : skill généré par Vibe + tâche planifiée + versioning |
| [uN8dfAnDZQY](https://www.youtube.com/watch?v=uN8dfAnDZQY) | Git for Prompts: Mistral Studio's New System of Record, Explained | Use AI with Tech Dad | 10/07/2026 | 7:29 | 41 | ➕ Complément §9 (C6) | Créateur : explication détaillée du versioning prompts/skills (diff, labels, audit) |
| [v_LttjsevRg](https://www.youtube.com/watch?v=v_LttjsevRg) | Update a skill with versioning in Studio | Mistral | 09/07/2026 | 1:22 | 854 | ➕ Complément §9 (C5) | Officielle : édition/versioning d'un skill et « publish to Vibe » |
| [8MHd_arELJo](https://www.youtube.com/watch?v=8MHd_arELJo) | Automate GitHub issue management with Vibe | Mistral | 15/06/2026 | 3:20 | 1 047 | ➕ Complément §9 (C7) | Officielle : connecteurs Studio + skill + Vibe Work |
| [hUPcLLti5x0](https://www.youtube.com/watch?v=hUPcLLti5x0) | Use Connectors in Workflows | Mistral | 28/05/2026 | 1:55 | 851 | ➕ Complément §9 (C2) | Officielle : activer un connecteur + credential, usage dans un workflow |
| [AR2IedLkEHo](https://www.youtube.com/watch?v=AR2IedLkEHo) | Use Connectors in Vibe | Mistral | 28/05/2026 | 2:37 | 1 331 | ➕ Complément §9 (C3) | Officielle : connecteurs activés dans Studio puis utilisés dans Vibe |
| [bWVfAn46FcM](https://www.youtube.com/watch?v=bWVfAn46FcM) | 📄 Workflow Mistral : Demo de traitement de documents | Kokori Kodo | 11/05/2026 | 18:14 | 1 719 | ➕ Complément §9 (C15) | Créateur FR : tutoriel officiel Workflows « traitement de documents » rejoué |
| [YQB6bsob6zE](https://www.youtube.com/watch?v=YQB6bsob6zE) | Workflows: Build. Run. Observe. | Mistral | 28/04/2026 | 1:23 | 8 430 | ➕ Complément §9 (C1) | Officielle : clip manifeste Workflows |
| [bemtZTeCtQ8](https://www.youtube.com/watch?v=bemtZTeCtQ8) | Build, manage and run custom connectors / Mistral AI | Mistral | 15/04/2026 | 2:22 | 2 042 | ➕ Complément §9 (C4) | Officielle : SDK connecteurs (liste, création, OAuth, outils) |
| [X5IuZhiyftI](https://www.youtube.com/watch?v=X5IuZhiyftI) | Mistral AI Agent: Your 2-Minute Code Review Bot / AI Studio | Coders Academy | 31/03/2026 | 11:24 | 374 | ➕ Complément §9 (C13) | Créateur : création d'agent dans l'UI Studio + piège modèle « thinking » |
| [DffzOI3g8Yk](https://www.youtube.com/watch?v=DffzOI3g8Yk) | Voice Customization 101 with Voxtral in Mistral Studio | Mistral | 26/03/2026 | 2:36 | 10 942 | ➕ Complément §9 (C9) | Officielle : clonage de voix dans Studio (Audio › Text-to-speech) |
| [93ZAhW3bk8g](https://www.youtube.com/watch?v=93ZAhW3bk8g) | Audio playground in Mistral Studio | Mistral | 04/02/2026 | 0:56 | 7 974 | ➕ Complément §9 (C10) | Officielle : Audio playground (infos dans la description) |
| [mC27FQVO3Lk](https://www.youtube.com/watch?v=mC27FQVO3Lk) | Comment creer un Agents IA sur Mistral : la méthode opérationnelle utilisée en entreprise | Moins de Promess Plus de Resultat avec l'IA - Loic | 20/12/2025 | 17:36 | 4 597 | ➕ Complément §9 (C14) | Créateur FR : Playground/Agents de Studio (paramètres, outils) |
| [xFhyfPC-VzI](https://www.youtube.com/watch?v=xFhyfPC-VzI) | Introducing Voxtral 3. | Mistral | 21/10/2026 | 2:09 | 18 298 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [hHIs0pc-RVQ](https://www.youtube.com/watch?v=hHIs0pc-RVQ) | Voxtral STT 3 - Transcription demo | Mistral | 21/10/2026 | 0:38 | 1 868 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [hD51W2txi1Y](https://www.youtube.com/watch?v=hD51W2txi1Y) | Introducing Mistral Large 4, Le Chonk. | Mistral | 21/10/2026 | 0:17 | 10 867 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [Msr9xj1gI7g](https://www.youtube.com/watch?v=Msr9xj1gI7g) | Mistral Just Launched Voxtral 3 Voice Agents — 5 Ways Founders Can Use Them | Signal Stack | 21/10/2026 | 9:24 | 5 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [Ih2ZS05Srls](https://www.youtube.com/watch?v=Ih2ZS05Srls) | Voxtral 3: what's new in Mistral's voice AI? | Stepwise | 21/10/2026 | 1:37 | 66 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [GjKT0HS4iKE](https://www.youtube.com/watch?v=GjKT0HS4iKE) | Mistral Voxtral 3: The AI That Talks to You in Real Time (Honest Breakdown) | AI Tools with Nazim | 21/10/2026 | 4:43 | 9 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [7a65lAUvAxQ](https://www.youtube.com/watch?v=7a65lAUvAxQ) | Voxtral 3 STT - Roundtable Demo | Mistral | 21/10/2026 | 0:44 | 3 509 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [z7buj8xaH_0](https://www.youtube.com/watch?v=z7buj8xaH_0) | Claude Code Hits the Tmux Ceiling in Multi-Agent Swarms (Plus Mistral's New 209M Forecaster) | Cayman AI Automation | 20/10/2026 | 9:12 | 14 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [UGjk3Uk0MxM](https://www.youtube.com/watch?v=UGjk3Uk0MxM) | The Model Swap Workshop: GPT-5.5 vs Kimi vs DeepSeek vs Mistral — Pamela Fox, Microsoft | AI Engineer | 19/10/2026 | 51:37 | 9 687 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [DZe4p55WMBc](https://www.youtube.com/watch?v=DZe4p55WMBc) | I Tested NEW Mistral Large 4 on Coding: That Was Unexpected | AI Coding Daily | 15/10/2026 | 12:46 | 14 189 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [k4uTJixF-R0](https://www.youtube.com/watch?v=k4uTJixF-R0) | Mistral Large 4, Le Chonk : Comment tester le nouveau Mistral ? | Jeanviet | 11/10/2026 | 19:58 | 1 840 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [0kAFioIjjGs](https://www.youtube.com/watch?v=0kAFioIjjGs) | How to Build a Repeatable Planning Workflow with Mistral Le Chat (2026) | iUpdateDroid | 10/10/2026 | 0:42 | 7 | — Non retenue | Le Chat (42 s, 7 vues) ; hors Studio |
| [IPJDmbShvvI](https://www.youtube.com/watch?v=IPJDmbShvvI) | Comment Mistral est en train de forger des armes pour l'Europe | IA et Stratégie | 08/10/2026 | 29:44 | 39 506 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [MVsO4zWKhCs](https://www.youtube.com/watch?v=MVsO4zWKhCs) | Culture IA : Mistral tente de revenir dans la course à l’IA, par Anthony Morel | BFM Business | 07/10/2026 | 4:10 | 22 098 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [iijSCsTxmH0](https://www.youtube.com/watch?v=iijSCsTxmH0) | Mistral Large 4 "Le Chonk": What It Is and How to Try It | Cyan Nova AI | 06/10/2026 | 5:14 | 55 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [T0ziJxSq3Nk](https://www.youtube.com/watch?v=T0ziJxSq3Nk) | Mistral Large 4 (Le Chonk) | Zorvex Ai | 06/10/2026 | 5:08 | 8 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [OX1RWeQGhfg](https://www.youtube.com/watch?v=OX1RWeQGhfg) | Model Mondays - Mistral OCR-4 and Building AI Agents in Microsoft Foundry | Microsoft Reactor | 29/09/2026 | 1:06:20 | 1 653 | — Non retenue | Microsoft Foundry (agents côté Azure) ; pas de sous-titres ; hors Studio |
| [3VlrLR1Twuw](https://www.youtube.com/watch?v=3VlrLR1Twuw) | Own your agent - Joffrey Thomas & Henry Lagarde - Mistral AI - dotAI 2026 | dotconferences | 28/09/2026 | 19:56 | 3 099 | — Non retenue | dotAI : « Own your agent » (open source, Vibe) ; Studio non mentionné dans la transcription |
| [xqwdGH26V1E](https://www.youtube.com/watch?v=xqwdGH26V1E) | AI Engineer Paris - Day 2 - Sept 24 | Mistral | 24/09/2026 | 8:44:28 | 3 948 | — Non retenue | Livestream jour 2 (8 h 44) : trop long, pas de chapitrage ; non dépouillé |
| [XpZCyQobP-c](https://www.youtube.com/watch?v=XpZCyQobP-c) | AI Engineer Paris 2026 - Day 1 - Sept 23 | Mistral | 24/09/2026 | 1:55:53 | 6 362 | — Non retenue | Livestream jour 1 AI Engineer Paris : contient la même keynote que 3.14 (doublon) |
| [3HNy2Gqdt1I](https://www.youtube.com/watch?v=3HNy2Gqdt1I) | How to Run Mistral AI Locally on Your Computer | AsapGuide | 21/09/2026 | 9:57 | 1 270 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [fryIDHh1jcE](https://www.youtube.com/watch?v=fryIDHh1jcE) | How to Run Mistral 7B Locally on Your Computer | AsapGuide | 20/09/2026 | 12:09 | 2 836 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [5awhcQug3c4](https://www.youtube.com/watch?v=5awhcQug3c4) | Unofficial Demo Concept: From Anomaly to Action / ASML × Mistral AI | Cent Capital | 15/09/2026 | 0:48 | 18 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [JkCmQ_Ueh-E](https://www.youtube.com/watch?v=JkCmQ_Ueh-E) | Mistral est meilleur que ChatGPT (mais pas où vous croyez) | Ludovic Nedelec | 14/09/2026 | 17:55 | 6 114 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [JeOklocrjJs](https://www.youtube.com/watch?v=JeOklocrjJs) | Mistral AI Raises €3 Billion—Can Europe Beat OpenAI Chatgpt, Google Gimini ? / Business Case Study | Dr Farooq Buzdar Baloch – Business, AI & Research | 08/09/2026 | 10:54 | 134 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [UmUFNrUqjNE](https://www.youtube.com/watch?v=UmUFNrUqjNE) | Mistral AI est mort ? | Metin SAYGIN - Cybersécurité | 02/09/2026 | 13:08 | 2 343 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [6pIZkfXaAec](https://www.youtube.com/watch?v=6pIZkfXaAec) | Generate playable HTML5 games with Mistral Medium and GLM | Mistral | 28/08/2026 | 8:13 | 3 337 | — Non retenue | Cookbook jeux HTML5 (modèles), Studio non montré |
| [bNcCatdErDw](https://www.youtube.com/watch?v=bNcCatdErDw) | What Happened To Mistral AI? | BetterWay | 26/08/2026 | 9:25 | 190 140 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [dMXr-S9Alc8](https://www.youtube.com/watch?v=dMXr-S9Alc8) | How to Use & Create Agents in Mistral Vibe CLI | I Wish I Could Code | 23/08/2026 | 7:33 | 269 | — Non retenue | Agents dans Vibe CLI ; hors Studio |
| [kt0ss876XVE](https://www.youtube.com/watch?v=kt0ss876XVE) | Mistral Le Chat MCP Tutorial — Full Google Business Profile Audit With AI | Insightful Pipe - Agentic Marketing | 05/08/2026 | 3:14 | 21 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [fsw03ZXHJik](https://www.youtube.com/watch?v=fsw03ZXHJik) | Mistral sera bientôt partout (apprenez-le maintenant) | Ludovic Nedelec | 04/08/2026 | 29:47 | 10 873 | — Non retenue | Créateur FR : usages de Le Chat/Vibe ; Studio cité marginalement |
| [mRY8n-1RDXY](https://www.youtube.com/watch?v=mRY8n-1RDXY) | Mistral AI vs Claude AI / Which ONE is BEST? (2026 Honest Review) | Learn With Trevor | 25/07/2026 | 3:25 | 3 732 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [xr4VUV-7rN0](https://www.youtube.com/watch?v=xr4VUV-7rN0) | Mistral and Microsoft Expand Global Strategic Partnership to Give Enterprises AI They Can Control | Mistral | 21/07/2026 | 5:01 | 4 178 | — Non retenue | Partenariat Microsoft ; pas de sous-titres ; pas de produit |
| [o2b-nXW8sYs](https://www.youtube.com/watch?v=o2b-nXW8sYs) | 50% Kosten sparen: Die KI-Revolution von SAP & Mistral | Toraman Consulting LTD | 11/07/2026 | 2:57 | 9 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [6QlKeIrrmzU](https://www.youtube.com/watch?v=6QlKeIrrmzU) | OCR4 in Production | Mistral | 08/07/2026 | 56:26 | 1 425 | — Non retenue | Démo OCR 4 dans le playground Studio + Workflows/search toolkit ; centré Document AI (chapitre OCR), non lu en entier |
| [lC-tXvp2XlE](https://www.youtube.com/watch?v=lC-tXvp2XlE) | Building a Reddit AI Research Agent With Mistral Vibe | All About AI | 04/07/2026 | 12:23 | 2 764 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [3CcDWuEhtuo](https://www.youtube.com/watch?v=3CcDWuEhtuo) | J'ai testé Mistral Vibe : la meilleure alternative open source à Claude Code ? | Alex so yes | 04/07/2026 | 20:16 | 13 418 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [0esChgVuxSc](https://www.youtube.com/watch?v=0esChgVuxSc) | Créer des agents IA avec Mistral AI Studio (Sans Coder) | Pentiminax | 03/07/2026 | 18:52 | 1 713 | ⛔ Exclue | Exclue par consigne (traitée dans un autre chapitre) |
| [rZGW2G_CX6M](https://www.youtube.com/watch?v=rZGW2G_CX6M) | Building interconnected AI for complex operations / AI Now Summit 2026 | Mistral | 02/07/2026 | 27:56 | 145 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [qwTKCxHxakc](https://www.youtube.com/watch?v=qwTKCxHxakc) | Mistral robotics and physical AI / AI Now Summit 2026 | Mistral | 02/07/2026 | 14:33 | 649 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [lluXpzkLpZo](https://www.youtube.com/watch?v=lluXpzkLpZo) | Best practices for building autonomous AI workflows / AI Now Summit 2026 | Mistral | 02/07/2026 | 20:43 | 398 | — Non retenue | Témoignage Abanca (agent bancaire) : observabilité/tests génériques, Studio non montré |
| [hZQa78vKxZ4](https://www.youtube.com/watch?v=hZQa78vKxZ4) | Advancing innovation at the European Patent Office / AI Now Summit 2026 | Mistral | 02/07/2026 | 27:27 | 146 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [Q1yn6khGCBk](https://www.youtube.com/watch?v=Q1yn6khGCBk) | Rethinking the architecture of agentic systems / AI Now Summit 2026 | Mistral | 02/07/2026 | 21:20 | 197 | — Non retenue | Architecture edge/cloud, hors Studio |
| [H2Vnx50Oves](https://www.youtube.com/watch?v=H2Vnx50Oves) | Channelling the power of LLMs to unlock ancient archives / AI Now Summit 2026 | Mistral | 02/07/2026 | 28:08 | 191 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [DRCkXZtndcI](https://www.youtube.com/watch?v=DRCkXZtndcI) | AI for earth observation: Building the future with EVE / AI Now Summit 2026 | Mistral | 02/07/2026 | 28:09 | 130 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [7evOiuXFkQo](https://www.youtube.com/watch?v=7evOiuXFkQo) | Domain AI models fine-tuned with proprietary knowledge / AI Now Summit 2026 | Mistral | 02/07/2026 | 29:24 | 394 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [2q_MTMAuu8w](https://www.youtube.com/watch?v=2q_MTMAuu8w) | Co-developing scaffolds & models hand-in-hand / AI Now Summit 2026 | Mistral | 02/07/2026 | 28:08 | 187 | — Non retenue | Harness/scaffolds côté science (d'après la description) ; hors Studio |
| [nYl9_TWxN7U](https://www.youtube.com/watch?v=nYl9_TWxN7U) | Mistral models powering Alexa+ / AI Now Summit 2026 | Mistral | 01/07/2026 | 25:12 | 325 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [dEWPTAXC3JA](https://www.youtube.com/watch?v=dEWPTAXC3JA) | Closing keynote: The end of AI as we know it / AI Now Summit 2026 | Mistral | 01/07/2026 | 5:26 | 1 813 | — Non retenue | Keynote de clôture (5 min), vision générale |
| [zR_jp_D7eWg](https://www.youtube.com/watch?v=zR_jp_D7eWg) | Perspectives on AI for defense / AI Now Summit 2026 | Mistral | 30/06/2026 | 20:18 | 158 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [usu2729-3yA](https://www.youtube.com/watch?v=usu2729-3yA) | The Machines Behind the Machines / AI Now Summit 2026 | Mistral | 30/06/2026 | 20:28 | 195 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [oypLpWb74PY](https://www.youtube.com/watch?v=oypLpWb74PY) | How EDF and Mistral are reinventing France's electricity / AI Now Summit 2026 | Mistral | 30/06/2026 | 14:20 | 200 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [gIC1ftvrGwo](https://www.youtube.com/watch?v=gIC1ftvrGwo) | Culture-driven approach to innovation / AI Now Summit 2026 | Mistral | 30/06/2026 | 17:43 | 109 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [Tb7RLf9qBlc](https://www.youtube.com/watch?v=Tb7RLf9qBlc) | A CIO's Vision on the AI industrial revolution / AI Now Summit 2026 | Mistral | 30/06/2026 | 16:13 | 220 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [PdeLBAwb9IQ](https://www.youtube.com/watch?v=PdeLBAwb9IQ) | How Airbus is powering Europe’s Al industrial revolution / AI Now Summit 2026 | Mistral | 30/06/2026 | 14:27 | 357 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [MJf_qB3waqc](https://www.youtube.com/watch?v=MJf_qB3waqc) | How Agentic AI is reinventing large organizations / AI Now Summit 2026 | Mistral | 30/06/2026 | 19:41 | 532 | — Non retenue | BNP Paribas : vision agentique, pas de produit |
| [KlI08FYHaXc](https://www.youtube.com/watch?v=KlI08FYHaXc) | Transforming a global group with sovereign technology / AI Now Summit 2026 | Mistral | 30/06/2026 | 9:50 | 111 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [IC0VNOzPZU8](https://www.youtube.com/watch?v=IC0VNOzPZU8) | Opening keynote / AI Now Summit 2026 | Mistral | 30/06/2026 | 42:44 | 3 239 | — Non retenue | Pertinente (chapitre « Vibe and Studio platform » à 21:43) mais AUCUN sous-titre disponible |
| [HICHSfDkBzs](https://www.youtube.com/watch?v=HICHSfDkBzs) | Scaling enterprise value with sovereign AI / AI Now Summit 2026 | Mistral | 30/06/2026 | 22:25 | 86 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [9IsgWBMyp50](https://www.youtube.com/watch?v=9IsgWBMyp50) | Scaling secure and transparent workflows / AI Now Summit 2026 | Mistral | 30/06/2026 | 21:30 | 147 | — Non retenue | Partenariat SAP : gouvernance/« AI units », Studio seulement cité |
| [3UrCbivvPYY](https://www.youtube.com/watch?v=3UrCbivvPYY) | Improve your Agents with Mistral Custom MCP Connectors | I Wish I Could Code | 29/06/2026 | 8:36 | 138 | — Non retenue | Créateur : connecteurs MCP personnalisés (Studio/Vibe) ; redondant avec C4/3.13, faible audience |
| [KazILvIJ1ik](https://www.youtube.com/watch?v=KazILvIJ1ik) | OpenAI, Mistral AI, Alta Ares : les levées de fonds s’accélèrent dans la tech | Boursorama | 26/06/2026 | 5:24 | 630 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [mZo6Y9f31r8](https://www.youtube.com/watch?v=mZo6Y9f31r8) | BNP Paribas accelerates AI-powered banking with Mistral | Mistral | 25/06/2026 | 2:21 | 2 053 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [bEt4wczgGR8](https://www.youtube.com/watch?v=bEt4wczgGR8) | Introducing Mistral OCR 4 | Mistral | 23/06/2026 | 3:14 | 87 044 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [s76U50DrBmI](https://www.youtube.com/watch?v=s76U50DrBmI) | Modi Meets Alstom, Mistral AI Leaders In Paris After G7 Summit, Focus On Innovation / NewsX | NewsX Live | 18/06/2026 | 3:40 | 342 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [TTw8-0Sj7I0](https://www.youtube.com/watch?v=TTw8-0Sj7I0) | Mistral AI Isn’t Just Models Anymore (Full Stack Explained) #MistralAI #generativeai | AI Learning Hub | 17/06/2026 | 6:28 | 18 | — Non retenue | Panorama « 4 piliers » (models, Studio, Vibe, Forge) ; superficiel, 18 vues |
| [eN9VSdPgUHI](https://www.youtube.com/watch?v=eN9VSdPgUHI) | How To Use Mistral AI in HighLevel: Automate Workflows | HighLevel | 09/06/2026 | 2:19 | 430 | — Non retenue | Intégration HighLevel (tiers) ; hors Studio |
| [79x96OWvOY8](https://www.youtube.com/watch?v=79x96OWvOY8) | 4 Best Mistral AI blocks for Nyno Workflows | EUAINEWS 🇪🇺 | 07/06/2026 | 5:00 | 204 | — Non retenue | Blocs Mistral dans Nyno Workflows (tiers) ; hors Studio |
| [jzGGU9U3Aik](https://www.youtube.com/watch?v=jzGGU9U3Aik) | j'ai testé MISTRAL VIBE CLI : la surprise de l'année ? | Anthony Marandon | 04/06/2026 | 20:04 | 7 948 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [325gGv0eWV8](https://www.youtube.com/watch?v=325gGv0eWV8) | Europe Wants an AI Champion. Can Mistral Deliver? | CNBC International | 03/06/2026 | 46:00 | 13 008 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [QdMM59OqGog](https://www.youtube.com/watch?v=QdMM59OqGog) | HTX advances frontier AI capabilities for public safety with Mistral. | Mistral | 01/06/2026 | 1:56 | 1 251 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [5wl9cKZ277o](https://www.youtube.com/watch?v=5wl9cKZ277o) | Vibe Coding: Build Apps with Mistral AI Agents | AI Dev Tools | 31/05/2026 | 3:03 | 285 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [y4TuBNXxRq0](https://www.youtube.com/watch?v=y4TuBNXxRq0) | Mistral Vibe: the agent for long-horizon work | Mistral | 28/05/2026 | 2:00 | 28 034 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [YpK3-1h-Ync](https://www.youtube.com/watch?v=YpK3-1h-Ync) | Investment portfolio analysis with Mistral Vibe | Mistral | 28/05/2026 | 1:26 | 3 611 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [KQz62nh4XwU](https://www.youtube.com/watch?v=KQz62nh4XwU) | Introducing the Mistral Vibe extension for VS Code | Mistral | 28/05/2026 | 0:48 | 15 248 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [AWXwY_ig4Uc](https://www.youtube.com/watch?v=AWXwY_ig4Uc) | Code mode in the Mistral Vibe web app | Mistral | 28/05/2026 | 1:12 | 5 834 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [3D8T5vDDLYM](https://www.youtube.com/watch?v=3D8T5vDDLYM) | Custom skills and scheduling with Mistral Vibe | Mistral | 28/05/2026 | 0:59 | 3 962 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [-qHRgnKGfvg](https://www.youtube.com/watch?v=-qHRgnKGfvg) | AI NOW Summit 2026 / Paris / Opening Keynote | Mistral | 28/05/2026 | 44:39 | 17 837 | — Non retenue | Même keynote en direct ; aucun sous-titre disponible |
| [UU11jAiTgxY](https://www.youtube.com/watch?v=UU11jAiTgxY) | Write Books in Seconds with Mistral 3.5  (Full Demo) | Writing Secrets | 24/05/2026 | 4:37 | 1 932 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [HPzfJqOxrDM](https://www.youtube.com/watch?v=HPzfJqOxrDM) | Mistral Medium 3.5 BEATS Kimi AND Claude? 🤯 Local AI TEST & REVIEW | xCreate | 21/05/2026 | 10:41 | 10 187 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [FBJ_1Z8JtDw](https://www.youtube.com/watch?v=FBJ_1Z8JtDw) | Trusted European AI Agents with Mistral AI / SAP Sapphire Madrid 2026 | SAP | 21/05/2026 | 5:18 | 946 | — Non retenue | SAP Sapphire : discours partenariat, pas de produit Studio |
| [9XQZYlsdzfU](https://www.youtube.com/watch?v=9XQZYlsdzfU) | Mistral AI Review / All You Need To Know | Digital Navigator | 21/05/2026 | 4:39 | 5 560 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [kURT0Eo5wGo](https://www.youtube.com/watch?v=kURT0Eo5wGo) | Pourquoi tout le monde se trompe sur Mistral AI | DevArt | 15/05/2026 | 19:24 | 24 275 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [E0akNjfUEuI](https://www.youtube.com/watch?v=E0akNjfUEuI) | Mistral AI Now Summit 2026 Official Teaser | Mistral | 15/05/2026 | 0:33 | 616 022 | — Non retenue | Teaser 34 s |
| [j93hY9rcijY](https://www.youtube.com/watch?v=j93hY9rcijY) | Mistral Vibe (+Free API): This Free AI Coding Agent is ACTUALLY CRAZY! | AICodeKing | 14/05/2026 | 14:38 | 12 549 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [5CAuDSRvl-4](https://www.youtube.com/watch?v=5CAuDSRvl-4) | ⁠Mistral a déjà gagné la course… (et personne n’en parle) | Yoan Hibert | 10/05/2026 | 14:19 | 75 736 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [kDk_OxvN-SA](https://www.youtube.com/watch?v=kDk_OxvN-SA) | Mistral Workflows: Human Approval in 1 Line (AI Workflow Explained) | Cognitive Capital | 09/05/2026 | 8:35 | 39 | — Non retenue | Vulgarisation Workflows (human approval) très faible audience ; doublon des sources officielles |
| [3jGAU2sbAyY](https://www.youtube.com/watch?v=3jGAU2sbAyY) | Why TTS Models Now Look Like LLMs — Samuel Humeau, Mistral | AI Engineer | 09/05/2026 | 22:26 | 10 892 | — Non retenue | Science TTS (AI Engineer) ; hors Studio |
| [LkbREGlNX8Y](https://www.youtube.com/watch?v=LkbREGlNX8Y) | The AI Model Nobody's Talking About — Mistral 3.5 & The Sovereignty Question | Promise & Risk of AI - Risks, Benefits, no Hype | 02/05/2026 | 12:54 | 30 822 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [pIAXGlElgUA](https://www.youtube.com/watch?v=pIAXGlElgUA) | Mistral AI Launches "Workflows": Bridging the Gap Between AI Experiments and Enterprise | mylink | 29/04/2026 | 5:00 | 3 | — Non retenue | Résumé d'annonce Workflows (3 vues) ; doublon |
| [mSUlCipKSy8](https://www.youtube.com/watch?v=mSUlCipKSy8) | Mistral Workflows: Building Production-Ready AI Agents | Minutes of Motivation by Vikash Sharma | 29/04/2026 | 12:20 | 46 | — Non retenue | Vulgarisation Workflows ; faible audience ; doublon |
| [Z67QSkYbFio](https://www.youtube.com/watch?v=Z67QSkYbFio) | Teleport your coding session to the cloud | Mistral | 29/04/2026 | 1:04 | 2 490 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [SvPX8HB-JUA](https://www.youtube.com/watch?v=SvPX8HB-JUA) | Work mode in Le Chat | Mistral | 29/04/2026 | 1:04 | 5 083 | — Non retenue | Work mode de Le Chat/Vibe (1 min) ; produit utilisateur |
| [KaMbzM9dsTc](https://www.youtube.com/watch?v=KaMbzM9dsTc) | Remote agents in Vibe. Powered by Mistral Medium 3.5. | Mistral | 29/04/2026 | 3:43 | 8 630 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [5uKixo_tD7I](https://www.youtube.com/watch?v=5uKixo_tD7I) | Remote coding agents in Mistral Vibe | Mistral | 29/04/2026 | 0:45 | 4 039 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [VXDDdaVf4FU](https://www.youtube.com/watch?v=VXDDdaVf4FU) | This Mistral Codestral AI Coding Builder & Studio is INSANE to Build & Deploy Full Stack Apps FREE | Coding Shiksha | 10/04/2026 | 5:11 | 254 | — Non retenue | Titre trompeur (« Codestral … Studio ») ; outil tiers |
| [Uis1lse14Po](https://www.youtube.com/watch?v=Uis1lse14Po) | How To Build A Mistral AI Agent [2026 Guide] | AJ Tech Tutorials | 07/04/2026 | 2:25 | 2 638 | — Non retenue | Tutoriel court générique (agent) ; non pertinent pour Studio |
| [w_fSt9CTBZ4](https://www.youtube.com/watch?v=w_fSt9CTBZ4) | Mistral vs ElevenLabs : La révolution vocale est française ? | Gladys Assistant | 03/04/2026 | 9:29 | 4 726 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [bcdd_pSgptY](https://www.youtube.com/watch?v=bcdd_pSgptY) | Building Conversational AI with Voxtral | Mistral | 03/04/2026 | 1:05:16 | 2 260 | — Non retenue | Webinaire Voxtral : playground audio temps réel ; centré modèles audio, non lu en entier |
| [qJ9Qe_4YJ_w](https://www.youtube.com/watch?v=qJ9Qe_4YJ_w) | Conversation AI powered by Voxtral: Pizza Ordering | Mistral | 26/03/2026 | 1:09 | 16 139 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [_N-ZGjGSVls](https://www.youtube.com/watch?v=_N-ZGjGSVls) | Voxtral TTS. Find your voice. | Mistral | 26/03/2026 | 1:22 | 39 753 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [SpLRS7Q3fIk](https://www.youtube.com/watch?v=SpLRS7Q3fIk) | Conversation AI powered by Voxtral: Bankstral Customer Service | Mistral | 26/03/2026 | 1:28 | 12 220 | — Non retenue | Modèles audio (Voxtral) ; hors cœur Studio |
| [Xbn-7wqtaew](https://www.youtube.com/watch?v=Xbn-7wqtaew) | ASML accelerates advanced semiconductor lithography with Mistral AI | Mistral | 24/03/2026 | 1:43 | 16 313 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [2Ur-2qpwLZM](https://www.youtube.com/watch?v=2Ur-2qpwLZM) | Personne n’en parle… Mistral AI vient de lâcher 4 bombes 💣 | Pentiminax | 19/03/2026 | 8:59 | 3 793 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [kKBXnbNUjTc](https://www.youtube.com/watch?v=kKBXnbNUjTc) | Mistral Small 4 : Que Vaut VRAIMENT ce Modèle OPEN SOURCE 120B ? 🇫🇷😱 | Nerdy Kings | 18/03/2026 | 11:39 | 4 837 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [_5J0kKE13xM](https://www.youtube.com/watch?v=_5J0kKE13xM) | MISTRAL AI a fait une GROSSE annonce (MISTRAL FORGE) | Simon De Lima | 18/03/2026 | 16:56 | 10 125 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [4tz4sUSE7KE](https://www.youtube.com/watch?v=4tz4sUSE7KE) | Mistral devient un champion mondial, les IA US tremblent | Renaud Varoqueaux | 18/03/2026 | 38:47 | 12 499 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [fAYznrUzFHY](https://www.youtube.com/watch?v=fAYznrUzFHY) | Introducing Mistral Forge | Mistral | 17/03/2026 | 1:28 | 80 498 | — Non retenue | Annonce Forge (1 min 28) ; Forge traité ailleurs |
| [DjCEO9wuhyQ](https://www.youtube.com/watch?v=DjCEO9wuhyQ) | Let's Run France's LARGEST Petit Local AI - Mistral Small 4 TESTED | xCreate | 17/03/2026 | 14:04 | 5 657 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [Il45KxYaN9g](https://www.youtube.com/watch?v=Il45KxYaN9g) | 🎬 Créer un agent Mistral de A à Z : Du prompt au terminal avec Vibe | Kokori Kodo | 16/03/2026 | 13:33 | 2 810 | — Non retenue | Créateur FR : agent → Vibe CLI ; Studio non mentionné |
| [dk2zLmeO-6s](https://www.youtube.com/watch?v=dk2zLmeO-6s) | Mistral Worlwide Hackathon Finals | Mistral | 10/03/2026 | 2:38:41 | 2 755 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [boIiMLR37kA](https://www.youtube.com/watch?v=boIiMLR37kA) | Conférence d'Arthur Mensch, cofondateur et pdg de Mistral AI, à l'École polytechnique. | Ecole polytechnique | 16/02/2026 | 28:54 | 367 209 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [EHdeZpopUUI](https://www.youtube.com/watch?v=EHdeZpopUUI) | Code review and PR submission with Vibe Code by Mistral AI | Mistral | 13/02/2026 | 0:26 | 1 137 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [3d1BcRJh4tQ](https://www.youtube.com/watch?v=3d1BcRJh4tQ) | Documenting shell aliases with Vibe Code by Mistral AI | Mistral | 13/02/2026 | 0:24 | 842 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [14LtGxlFaEg](https://www.youtube.com/watch?v=14LtGxlFaEg) | Mistral AI vs. Silicon Valley: The Rise of Sovereign AI | The MAD Podcast with Matt Turck | 12/02/2026 | 58:28 | 11 583 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [3F8Zyk6cXLo](https://www.youtube.com/watch?v=3F8Zyk6cXLo) | Mistral AI API Masterclass: From Setup to Advanced Agents (2026 Guide ) english. | cmbformation | 11/02/2026 | 8:04 | 712 | — Non retenue | Explainer API générique ; pas de Studio |
| [gIo0M_rZYbc](https://www.youtube.com/watch?v=gIo0M_rZYbc) | Meet Mistral Vibe 2.0 - This AI Codes, Tests & Deploys for You | SemanticEd | 28/01/2026 | 2:28 | 453 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [XksL9fFFMUs](https://www.youtube.com/watch?v=XksL9fFFMUs) | Scaling AI Reliability: Real world lessons from Mistral AI | Checkly | 28/01/2026 | 1:06:23 | 743 | — Non retenue | SRE interne Mistral (monitoring as code) ; pas Studio |
| [vgwe2jNPmEo](https://www.youtube.com/watch?v=vgwe2jNPmEo) | Vibe Code by Mistral AI | Mistral | 27/01/2026 | 1:19 | 22 917 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [QnX80VASw48](https://www.youtube.com/watch?v=QnX80VASw48) | Slash-command skills in Mistral Vibe CLI | Mistral | 27/01/2026 | 0:20 | 3 291 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [Nf2y_guxIJM](https://www.youtube.com/watch?v=Nf2y_guxIJM) | Custom subagents in Mistral Vibe CLI | Mistral | 27/01/2026 | 0:18 | 3 628 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [GE0k2rd0jco](https://www.youtube.com/watch?v=GE0k2rd0jco) | Multi-choice clarifications in Mistral Vibe CLI | Mistral | 27/01/2026 | 0:17 | 1 767 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [-0kJLh9du4c](https://www.youtube.com/watch?v=-0kJLh9du4c) | Unified agent modes in Mistral Vibe CLI | Mistral | 27/01/2026 | 0:18 | 2 946 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [FWqf--0sJIM](https://www.youtube.com/watch?v=FWqf--0sJIM) | Custom modes in Mistral Vibe CLI | Mistral | 26/01/2026 | 0:40 | 1 001 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [AY-1YHbIGdw](https://www.youtube.com/watch?v=AY-1YHbIGdw) | I TESTED Mistral AI for AUTHORS (Overhyped?) | Writing Secrets | 23/01/2026 | 15:58 | 1 563 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [por7P9u0VdU](https://www.youtube.com/watch?v=por7P9u0VdU) | I Tested Mistral AI Le Chat for 7 Days — Was I Wrong About It? (2026) | Apex Verdict | 21/01/2026 | 1:38 | 2 550 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [DOfif_BErZ4](https://www.youtube.com/watch?v=DOfif_BErZ4) | Getting Started With Mistral Vibe CLI + Exploring Devstral 2 Small - Best Local Model? | Nathan Sebhastian | 07/01/2026 | 14:27 | 8 071 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [n3GevDA9BbM](https://www.youtube.com/watch?v=n3GevDA9BbM) | Get Started with Mistral AI: Free API Key and Chat Completion Endpoint! | LinuxHowTo | 06/01/2026 | 12:49 | 1 271 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [gdOc-bVZhU4](https://www.youtube.com/watch?v=gdOc-bVZhU4) | I Tested Mistral's New Local AI Models (3B, 8B, 14B, 24B) - Can They Actually Code? | Will Lamerton | 23/12/2025 | 27:33 | 66 962 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [Whfztk78G4g](https://www.youtube.com/watch?v=Whfztk78G4g) | Mistral OCR 3 Explained / Best OCR for Handwriting, Forms & Tables? | DataLift | 21/12/2025 | 4:25 | 914 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [XN-27H4AdCc](https://www.youtube.com/watch?v=XN-27H4AdCc) | Mistral Vibe CLI – tool-fetch with MCP | Mistral | 15/12/2025 | 1:20 | 9 182 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [geR-Ok5WgYA](https://www.youtube.com/watch?v=geR-Ok5WgYA) | How to Download ANY Mistral Model & Chat Completely OFFLINE | AsapGuide | 14/12/2025 | 7:14 | 686 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [z9XRkSWNDHg](https://www.youtube.com/watch?v=z9XRkSWNDHg) | Devstral 2 : Le Nouveau MONSTRE de Mistral Pour Coder 😱🇫🇷 | Nerdy Kings | 11/12/2025 | 10:39 | 13 441 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [z-xR_oIuf7Q](https://www.youtube.com/watch?v=z-xR_oIuf7Q) | Mistral Vibe CLI Demo: Free AI Coding Assistant for Programming | Fahd Mirza | 10/12/2025 | 13:22 | 8 705 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [vAsGKyGKEv4](https://www.youtube.com/watch?v=vAsGKyGKEv4) | How to Setup Mistral Vibe + First Impressions #mistralai #vibecoding | Sterling Chin | 10/12/2025 | 2:56 | 6 749 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [UcLDeH9PaI0](https://www.youtube.com/watch?v=UcLDeH9PaI0) | Mistral Devstral 2: NEW Agentic Coding LLM With Vision - Opensource + Powerful (Fully Tested) | WorldofAI | 10/12/2025 | 11:00 | 245 845 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [5-CkFo06j1U](https://www.youtube.com/watch?v=5-CkFo06j1U) | Découverte de Mistral Vibe CLI : le nouvel agent IA pour coder plus vite | Pentiminax | 10/12/2025 | 16:39 | 4 176 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [lQQxSVj1wEo](https://www.youtube.com/watch?v=lQQxSVj1wEo) | Mistral 3 Review: Benchmarks, API Pricing, and How to Run the New Edge Models Locally | Binary Verse AI | 03/12/2025 | 10:40 | 248 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [rGlEuUOSdS4](https://www.youtube.com/watch?v=rGlEuUOSdS4) | Arrêtez de payer pour l'IA : Installez Mistral Gratuitement sur votre ordi (Tuto 2026) | Le Bretzel | 21/11/2025 | 13:06 | 4 414 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [lbL53sXTuJc](https://www.youtube.com/watch?v=lbL53sXTuJc) | Mistral AI Studio — новая эра корпоративного ИИ в Европе! Что изменилось? | Ливгаров | 18/11/2025 | 13:04 | 42 | — Non retenue | Présentation de Studio en russe (42 vues) ; langue hors périmètre FR/EN |
| [33Oeqtjumvo](https://www.youtube.com/watch?v=33Oeqtjumvo) | Building Intelligent Document Solutions with Mistral AI ( With Code ) | Mistral | 11/11/2025 | 58:20 | 3 390 | — Non retenue | Version « with code » du webinaire Document AI (nov. 2025) ; centré OCR, non lu en entier |
| [1vLbH8tGHXs](https://www.youtube.com/watch?v=1vLbH8tGHXs) | Building Intelligent Document Solutions with Mistral AI | Mistral | 04/11/2025 | 1:03:12 | 3 887 | — Non retenue | Webinaire Document AI (nov. 2025) : Studio cité comme « developer toolkit » et Workflows ; centré OCR, non lu en entier |
| [WusgzCtTMc8](https://www.youtube.com/watch?v=WusgzCtTMc8) | Fine-tuning Mistral Models with Your Own Data in AI Studio | DataCreator AI | 30/10/2025 | 27:37 | 1 487 | — Non retenue | Fine-tuning (oct. 2025) : surtout théorie + API ; Studio peu montré |
| [uHYMpMXeG_Y](https://www.youtube.com/watch?v=uHYMpMXeG_Y) | MISTRAL AI Connecteurs MCP : gérez vos emails, calendrier et documents ! (Gmail, Calendar et Notion) | NOFLOW | 12/09/2025 | 9:39 | 1 586 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [yfRToXf_N3o](https://www.youtube.com/watch?v=yfRToXf_N3o) | Il est temps de tester Mistral AI : la révolution MCP, avec Notion | KreaCity | 03/09/2025 | 16:28 | 2 642 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [VkqYmwIIeOg](https://www.youtube.com/watch?v=VkqYmwIIeOg) | Mistral Agents API Tutorial: Build Powerful AI Agents | DataCamp | 10/07/2025 | 33:25 | 2 858 | — Non retenue | Antérieure au lancement (Agents API, juil. 2025) |
| [J1ey_ZKtRcw](https://www.youtube.com/watch?v=J1ey_ZKtRcw) | Mistral IA Le chat : TUTO COMPLET 2025 + Version Pro gratuite | Alex DEW - Automatisation & IA | 04/07/2025 | 10:37 | 10 755 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [Vm1BEGLP0ds](https://www.youtube.com/watch?v=Vm1BEGLP0ds) | Mistral Agents API - The NEW Agent System | Sam Witteveen | 29/05/2025 | 14:48 | 22 559 | — Non retenue | Antérieure au lancement (Agents API, mai 2025) |
| [mJwN5phcpyo](https://www.youtube.com/watch?v=mJwN5phcpyo) | Mistral AI Le Chat Canvas | Mistral | 07/05/2025 | 0:29 | 953 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [dt8KbVyY_Ek](https://www.youtube.com/watch?v=dt8KbVyY_Ek) | Mistral AI Le Chat Agents | Mistral | 07/05/2025 | 0:32 | 6 312 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [jtvknGIF5ew](https://www.youtube.com/watch?v=jtvknGIF5ew) | How Does Mistral AI’s CEO See AI’s Future?  / WEF 2025 / 09 | 4e Academy | 17/04/2025 | 3:02 | 1 979 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [oaIBkEdITRQ](https://www.youtube.com/watch?v=oaIBkEdITRQ) | Mistral AI Agents / Full Walkthrough | James Briggs | 13/03/2025 | 43:05 | 9 561 | — Non retenue | Antérieure au lancement (Agents API, mars 2025) |
| [6vJPAywpLj4](https://www.youtube.com/watch?v=6vJPAywpLj4) | Mistral AI expliqué en 10 minutes : Ce que vous devez savoir | L'Atelier Numérique | 06/03/2025 | 11:08 | 2 341 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [yeG6Ca6giOY](https://www.youtube.com/watch?v=yeG6Ca6giOY) | HOW TO CODE with MISTRAL AI - COMPLETE GUIDE | Ed - Video Editing | 05/03/2025 | 1:25 | 706 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [UuUHN-CcqbI](https://www.youtube.com/watch?v=UuUHN-CcqbI) | Comment créer un agent IA avec Mistral AI (Tuto 2025) | Abby | 26/02/2025 | 6:36 | 10 614 | — Non retenue | Antérieure au lancement de Studio (Agents Le Chat/La Plateforme 2025) |
| [YYxHZnriQ4M](https://www.youtube.com/watch?v=YYxHZnriQ4M) | 7 utilisations INCROYABLES de Mistral AI ! (Le Chat) | Henri · ExplorIA | 18/02/2025 | 19:40 | 94 786 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [aQdsOUc4eYs](https://www.youtube.com/watch?v=aQdsOUc4eYs) | Construire des agents IA sur Mistral est vraiment SIMPLE et RAPIDE | DevArt | 17/02/2025 | 13:13 | 41 185 | — Non retenue | Antérieure au lancement de Studio (La Plateforme, fév. 2025) |
| [RcdsH09wpNk](https://www.youtube.com/watch?v=RcdsH09wpNk) | Build Anything with Mistral AI, Here’s How | David Ondrej | 11/02/2025 | 13:39 | 40 734 | — Non retenue | Antérieure au lancement de Studio |
| [11pIpoJJQhQ](https://www.youtube.com/watch?v=11pIpoJJQhQ) | How to Use Mistral AI API for Free | WebStylePress | 10/02/2025 | 6:59 | 9 977 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [bzs0wFP_6ck](https://www.youtube.com/watch?v=bzs0wFP_6ck) | On reçoit Arthur Mensch, PDG de Mistral AI | Underscore_ | 06/02/2025 | 45:07 | 827 907 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [YxYbSnzcVSM](https://www.youtube.com/watch?v=YxYbSnzcVSM) | Introducing le Chat by Mistral AI | Mistral | 06/02/2025 | 1:16 | 17 100 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [cBkNz5DmrYI](https://www.youtube.com/watch?v=cBkNz5DmrYI) | Mistral Batch API - Lower cost API for scale | Mistral | 25/11/2024 | 6:56 | 12 189 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [MA6qrSzk_5U](https://www.youtube.com/watch?v=MA6qrSzk_5U) | Mistral Office Hour: three fine-tuning hackathon winning projects | Mistral | 07/10/2024 | 57:42 | 1 141 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [DFIG9IQF09Q](https://www.youtube.com/watch?v=DFIG9IQF09Q) | Mistral AI Agents: Learn How to Create AI Agents to Automate Anything | Mervin Praison | 14/08/2024 | 9:22 | 7 567 | — Non retenue | Antérieure au lancement (2024) |
| [eTI2_vgcXJs](https://www.youtube.com/watch?v=eTI2_vgcXJs) | Mistral AI Agents: What they are and how to build one or free | Everyday AI | 09/08/2024 | 12:14 | 8 820 | — Non retenue | Antérieure au lancement (2024) |
| [iC15j-kG6To](https://www.youtube.com/watch?v=iC15j-kG6To) | Comment fine-tuner un modèle Mistral AI avec La Plateforme | Applied AI - GenAI, ChatGPT et  LLM-powered apps | 22/07/2024 | 15:32 | 12 935 | — Non retenue | Antérieure au lancement (fine-tuning La Plateforme, 2024) |
| [I0c405L7-9A](https://www.youtube.com/watch?v=I0c405L7-9A) | RAG with Mistral AI! | James Briggs | 11/07/2024 | 12:25 | 6 740 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [1UZSUYnQsFA](https://www.youtube.com/watch?v=1UZSUYnQsFA) | Mistral AI Raises $640M, Elon's Electric Jetpack | Founder Built | 27/06/2024 | 15:37 | 16 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [mNMDd6D1om8](https://www.youtube.com/watch?v=mNMDd6D1om8) | Learn Mistral AI – JavaScript Tutorial | freeCodeCamp.org | 18/06/2024 | 1:24:04 | 56 296 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [dFIhU5uvY6Q](https://www.youtube.com/watch?v=dFIhU5uvY6Q) | No API Key LLM with LM Studio. RAG with open source LLM -Mistral,Python, Langchain. LM Studio setup. | TechKnow_WithMe | 12/05/2024 | 5:03 | 1 100 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [sgnrL7yo1TE](https://www.youtube.com/watch?v=sgnrL7yo1TE) | Advance RAG control flow with Mistral and LangChain: Corrective RAG, Self-RAG, Adaptive RAG | Mistral | 18/04/2024 | 26:01 | 22 224 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [VpB6bxh4deM](https://www.youtube.com/watch?v=VpB6bxh4deM) | 100% Local AI Speech to Speech with RAG - Low Latency / Mistral 7B, Faster Whisper ++ | All About AI | 14/04/2024 | 14:42 | 145 032 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [dZ7nX4dy1oc](https://www.youtube.com/watch?v=dZ7nX4dy1oc) | AI Demos: Claude 3's Opus, Mistral, Groq Playground, EMO by Ali Baba / E1912 | This Week in Startups | 12/03/2024 | 1:03:08 | 57 720 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [PicHxYFBQ7Q](https://www.youtube.com/watch?v=PicHxYFBQ7Q) | An Introduction to Mistral AI / TuringTalks | TuringTalks | 05/03/2024 | 5:47 | 5 838 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [eOo4GfHj3ZE](https://www.youtube.com/watch?v=eOo4GfHj3ZE) | Function Calling with Mistral AI | Mistral | 26/02/2024 | 6:03 | 30 087 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [yXN5xSXJ1Is](https://www.youtube.com/watch?v=yXN5xSXJ1Is) | Arthur Mensch (Mistral AI) and John Collison (Stripe) fireside chat / Stripe AI Day—Paris | Stripe | 06/10/2023 | 38:50 | 16 004 | — Non retenue | Actualité, opinion ou tutoriel générique ; pas de contenu Studio |
| [5mmjig68d40](https://www.youtube.com/watch?v=5mmjig68d40) | Get Started with Mistral 7B Locally in 6 Minutes | Developers Digest | 02/10/2023 | 6:43 | 91 141 | — Non retenue | Exécution locale de modèles ; hors Studio |
| [Hi5-qLmI8lY](https://www.youtube.com/watch?v=Hi5-qLmI8lY) | Getting Started with Altair Mistral | Altair HyperWorks How-To | 04/08/2023 | 8:37 | 317 | — Non retenue | Homonyme : Altair Mistral (simulation) |
| [rVAoc4fNkxI](https://www.youtube.com/watch?v=rVAoc4fNkxI) | Orchestrating Tasks with Mistral Workflow Service | OpenInfra Foundation | 25/04/2016 | 41:54 | 5 262 | — Non retenue | Homonyme : OpenStack Mistral (2016) |
| [bnAT37O-sdw](https://www.youtube.com/watch?v=bnAT37O-sdw) | Mistral workflow demo for TripleO | Dan Prince | 07/12/2015 | 13:36 | 1 097 | — Non retenue | Homonyme : OpenStack Mistral (2015) |
| [I-YuU4CkPBU](https://www.youtube.com/watch?v=I-YuU4CkPBU) | Building Production-Grade AI Systems | Mistral | — | 57:18 | 3 406 | — Non retenue | « Building Production-Grade AI Systems » : vidéo indisponible (privée/supprimée) au 21/10/2026 |
| [7dpLB9NoY1A](https://www.youtube.com/watch?v=7dpLB9NoY1A) | Introducing Robostral Navigate | Mistral | — | 1:59 | 15 000 | — Non retenue | Annonce ou test de modèle/produit ; hors périmètre Studio |
| [ArWG4pmTXPQ](https://www.youtube.com/watch?v=ArWG4pmTXPQ) | Building custom code models for Ericsson proprietary silicon / AI Now Summit 2026 | Mistral | — | 36:12 | 514 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [xP-3iMTPav0](https://www.youtube.com/watch?v=xP-3iMTPav0) | The AI sovereignty paradox: Scalable ecosystems for trusted AI adoption / AI Now Summit 2026 | Mistral | — | 32:05 | 222 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [0lqZpQZLGKs](https://www.youtube.com/watch?v=0lqZpQZLGKs) | Luxembourg's sovereign AI playbook for Europe / AI Now Summit 2026 | Mistral | — | 28:27 | 196 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [QxgcNjBO580](https://www.youtube.com/watch?v=QxgcNjBO580) | AI infrastructure is the new critical infrastructure / AI Now Summit 2026 | Mistral | — | 29:52 | 241 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [ImQyRxgBCho](https://www.youtube.com/watch?v=ImQyRxgBCho) | Shaping France’s AI Future: CDC’s roadmap to digital autonomy / AI Now Summit 2026 | Mistral | — | 16:52 | 148 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [wz8XFHJvmE4](https://www.youtube.com/watch?v=wz8XFHJvmE4) | Talk by Benjamin Haddad, Minister delegate for Europe of France / AI Now Summit 2026 | Mistral | — | 9:42 | 102 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [OnpTJd9ZtrM](https://www.youtube.com/watch?v=OnpTJd9ZtrM) | How La Banque Postale is building a human-centric future for banking / AI Now Summit 2026 | Mistral | — | 24:56 | 95 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [d5jLSGn2oj8](https://www.youtube.com/watch?v=d5jLSGn2oj8) | How nations can develop resilient, citizen-centric AI systems / AI Now Summit 2026 | Mistral | — | 49:00 | 103 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [yZ5g7Jic714](https://www.youtube.com/watch?v=yZ5g7Jic714) | Scaling AI to support the energy transition / AI Now Summit 2026 | Mistral | — | 25:44 | 121 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [33hFF-IZ6I0](https://www.youtube.com/watch?v=33hFF-IZ6I0) | How HTX is Scaling AI for Public Safety / AI Now Summit 2026 | Mistral | — | 17:00 | 164 | — Non retenue | Conférence AI Now Summit (témoignage/vision) ; pas de démonstration Studio d'après titre/description |
| [Ds5l62PhPYo](https://www.youtube.com/watch?v=Ds5l62PhPYo) | In Conversation with Kelci Miclaus of Snowflake | Mistral | — | 16:42 | 261 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [pphFTF8q_RQ](https://www.youtube.com/watch?v=pphFTF8q_RQ) | In Conversation with Arun Khurana of Accenture | Mistral | — | 13:54 | 413 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [izEHM8BIol4](https://www.youtube.com/watch?v=izEHM8BIol4) | In Conversation with Yann Léger and Jen Person of Koyeb | Mistral | — | 12:14 | 683 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [Pr0503ZiJJk](https://www.youtube.com/watch?v=Pr0503ZiJJk) | In Conversation with Sandip Gupta of NTT DATA | Mistral | — | 8:34 | 362 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [ZQf6r4MK8B4](https://www.youtube.com/watch?v=ZQf6r4MK8B4) | In Conversation with Oscar Rodriguez of AWS | Mistral | — | 11:16 | 433 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [0jMfcCL02xQ](https://www.youtube.com/watch?v=0jMfcCL02xQ) | In Conversation with Bryan Catanzaro of NVIDIA | Mistral | — | 13:09 | 913 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [Ilc-8TkHakQ](https://www.youtube.com/watch?v=Ilc-8TkHakQ) | In Conversation with Ang Chee Wee of HTX | Mistral | — | 21:12 | 1 000 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [OLI_Qzw-UH0](https://www.youtube.com/watch?v=OLI_Qzw-UH0) | Vibe Code 2.1.0 — A fresh look for your terminal agent. | Mistral | — | 0:26 | 3 000 | — Non retenue | Mistral Vibe (agent de code / travail) sans démonstration Studio |
| [biEQbkqqAhs](https://www.youtube.com/watch?v=biEQbkqqAhs) | Le Chat - Now with Deep Research, Voice Mode, Image Editing, and More! | Mistral | — | 1:54 | 7 700 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [CEP-xIIfuhs](https://www.youtube.com/watch?v=CEP-xIIfuhs) | Vocal mode / Le Chat | Mistral | — | 0:22 | 3 100 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [xlKrAKKmO5Q](https://www.youtube.com/watch?v=xlKrAKKmO5Q) | Deep Research / Le Chat | Mistral | — | 1:27 | 3 000 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [qJ381CswnKw](https://www.youtube.com/watch?v=qJ381CswnKw) | Stripe × Linear workflow in Le Chat with MCP | Mistral | — | 1:17 | 994 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [NAAwv-D-4cA](https://www.youtube.com/watch?v=NAAwv-D-4cA) | Asana x Databricks workflow in Le Chat | Mistral | — | 1:12 | 1 100 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [vAEqEYIp23s](https://www.youtube.com/watch?v=vAEqEYIp23s) | Connecting GitHub and Notion in Le Chat with MCP | Mistral | — | 1:01 | 1 300 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [6M-t0OiujnM](https://www.youtube.com/watch?v=6M-t0OiujnM) | Connecting Atlassian in Le Chat with MCP | Mistral | — | 1:09 | 659 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [MIM6Uk7A1sw](https://www.youtube.com/watch?v=MIM6Uk7A1sw) | Connecting to Box in Le Chat with MCP | Mistral | — | 0:52 | 447 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [2Xd3-ZX8Bsk](https://www.youtube.com/watch?v=2Xd3-ZX8Bsk) | MCP connectors directory in Le Chat | Mistral | — | 0:10 | 1 500 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [tKUnOrl-OTw](https://www.youtube.com/watch?v=tKUnOrl-OTw) | Custom MCP connectors and Memories in Le Chat | Mistral | — | 1:01 | 5 000 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [bZR2ctE2LyQ](https://www.youtube.com/watch?v=bZR2ctE2LyQ) | Add a custom MCP connector in Le Chat (Pokémon Showdown demo) | Mistral | — | 2:04 | 1 500 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [mNfre6VhHj8](https://www.youtube.com/watch?v=mNfre6VhHj8) | Memories: Personalized conversations in Le Chat. | Mistral | — | 0:59 | 1 800 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [pvsSFUzEfjQ](https://www.youtube.com/watch?v=pvsSFUzEfjQ) | Enterprise search in Le Chat | Mistral | — | 0:41 | 3 500 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [7Ssb4lybDag](https://www.youtube.com/watch?v=7Ssb4lybDag) | Introducing Le Chat Enterprise | Mistral | — | 1:22 | 5 300 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [bPOkEISwuPY](https://www.youtube.com/watch?v=bPOkEISwuPY) | Empower Product Development w/ Agentic Workflow: From Call Transcript to PRD to Engineering Tickets | Mistral | — | 1:01 | 1 500 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |
| [n2tRaL9OVjo](https://www.youtube.com/watch?v=n2tRaL9OVjo) | Building Custom MCP Servers for Le Chat | Mistral | — | 55:01 | 1 100 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [nqUyrZVJpvw](https://www.youtube.com/watch?v=nqUyrZVJpvw) | Getting Started with MCP in Le Chat | Mistral | — | 48:22 | 1 900 | — Non retenue | Le Chat ; produit utilisateur, hors Studio |
| [yrx5D5WosrU](https://www.youtube.com/watch?v=yrx5D5WosrU) | Boosting OCR Performance: Improving speed and accuracy with Document AI | Mistral | — | 49:17 | 2 700 | — Non retenue | Chaîne officielle, sujet hors Studio (modèle, client, Le Chat, archive) |

