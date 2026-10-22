# 01 — Offre produit, positionnement et tarifs de Mistral (focus Studio)

> **Périmètre** : place de Mistral Studio dans la gamme Mistral, page produit Studio (EN/FR), plans et prix (Vibe, API Studio, Enterprise), SLA/support, conformité et hébergement, centre d'aide, Trust Center, page de statut · **Sources** : ≈ 95 pages web publiques (mistral.ai, docs.mistral.ai, legal.mistral.ai, help.mistral.ai, trust.mistral.ai, status.mistral.ai) consultées le **21/10/2026** (soirée, heure locale ; ≈ 22/10 00 h UTC — certaines pages horodatées « 22/10 ») · **Rédaction** : agent de recherche pour Nexora Studio

Convention : chaque bloc indique sa source `[S: URL]`. Toutes les URL ont été consultées le 21/10/2026 sauf mention contraire. Les montants sont reproduits tels qu'affichés (point décimal anglo-saxon conservé dans les citations de prix). « (inférence) » signale une déduction de l'agent.

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Offre en détail
   - 3.1 Studio dans la gamme Mistral
   - 3.2 Page produit Studio (anglais) — anatomie complète
   - 3.3 Page produit Studio (français) — terminologie officielle
   - 3.4 Données structurées (JSON-LD) de la page Studio : offres « Free mode » / « Scale plan »
   - 3.5 Récit de lancement et chronologie de Studio
   - 3.6 Annonces structurantes post-lancement (Workflows, Prompts & Skills, Regional/Priority)
   - 3.7 Les autres produits de la suite (Vibe, Vibe Code, Forge, Inference, Compute, Cloud, services, Sovereign AI)
   - 3.8 Pages « Solutions »
4. Interface utilisateur (routes console/admin observées, parcours, écrans de tarification)
5. API et SDK (ce que les pages publiques en montrent)
6. Limites, quotas, tarifs, disponibilité
   - 6.1 Modèle économique de Studio : Free mode, pay-as-you-go, tiers, crédits
   - 6.2 Page /pricing : plans Vibe (Free, Pro, Team, Enterprise)
   - 6.3 Tarifs API (docs.mistral.ai/inference/pricing)
   - 6.4 Enterprise : SLA, crédits de service, support
   - 6.5 Données, confidentialité, conformité, hébergement
   - 6.6 Disponibilité observée (status.mistral.ai) et indices d'architecture
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées
Annexe — Couverture

---

## 1. En bref

- **Ce que c'est** : *Mistral Studio* est présenté comme « Your AI production platform » / « Votre plateforme de production IA » : une plateforme unique pour construire, déployer et gouverner des systèmes d'IA agentique, avec confidentialité, sécurité et pleine propriété des données. Les données structurées de la page la décrivent aussi comme la **console développeur** de Mistral (catalogue unifié modèles/agents/prompts/skills/datasets/workflows, observabilité, AI Registry). [S: https://mistral.ai/products/studio]
- **Origine** : successeur de **« La Plateforme »** (bêta ouverte le 11/12/2023 sur console.mistral.ai) ; annoncé comme **« Mistral AI Studio »** en **bêta privée le 24/10/2025** ; nommé aujourd'hui « Mistral Studio » / « Studio ». Le statut d'incident du 22/09/2026 parle encore d'« AI Studio », et les routes d'administration contiennent encore `plateforme`. [S: https://mistral.ai/news/la-plateforme ; https://mistral.ai/news/ai-studio ; https://status.mistral.ai/history]
- **Place dans la gamme** : 5 produits listés sur /products — **Vibe** (ex-Le Chat, usage final), **Studio** (construire/gouverner/améliorer agents et applications), **Inference** et **Compute** (regroupés sous « Cloud »), **Forge** (personnalisation/entraînement de modèles) — plus des services d'accompagnement (« Applied AI services » / « Our method »). La page d'accueil range Studio et Vibe dans la couche « AI operations » : Mistral fournit le logiciel, le client met l'IA au travail. [S: https://mistral.ai/products/ ; https://mistral.ai/]
- **Promesse structurée en 5 verbes** sur la page Studio : *Build* (Workflows, Agents, Connectors), *Iterate* (Experiments, Campaigns, Judges, Datasets), *Deploy* (Hybrid, Dedicated, Self-hosted), *Govern* (Observability, Guardrails, Moderation), *Accelerate* (AI registry, Versioning and lineage, Developer toolkit). Aucun logo client, témoignage, chiffre de performance ni FAQ sur la page Studio. [S: https://mistral.ai/products/studio]
- **Tarification Studio** : pas d'abonnement par siège. Deux modes publiés dans le JSON-LD : **« Free mode »** (0 $, test/prototypage, génération de clés API) et **« Scale plan »** (pay-as-you-go à l'usage, limites plus élevées, tiers débloqués par facturation cumulée). Le centre d'aide détaille **Free mode → Pay-as-you-go → Tier 1 à 4** (seuils 20 / 100 / 500 / 2 000 € ou $ facturés). [S: https://mistral.ai/products/studio (JSON-LD) ; https://help.mistral.ai/en/articles/698531]
- **Prix API** : au million de tokens (entrée / entrée en cache / sortie), à la page (OCR), à la minute (transcription), au million de caractères (TTS), à la minute de conversation (Voice Agents). Modificateurs : **Batch −50 %**, **Priority ×1,75 (+75 %)**, **Regional inference ×1,1 (+10 %)**, **entrée en cache −90 %**, affichage EUR = **0,85 × USD**. Ex. : Mistral Large 4 1,36 $ / 0,14 $ / 4,18 $ par M tokens ; Mistral Medium 3.5 1,5 $ / 7,5 $. [S: https://docs.mistral.ai/inference/pricing]
- **La page /pricing ne montre plus que les plans Vibe** (Free, Pro 14,99 $/mois, Team 24,99 $/utilisateur/mois, Enterprise sur devis) ; il n'y a plus d'onglet Studio/API : `/pricing/api/` redirige vers la page de prix de la documentation. [S: https://mistral.ai/pricing ; https://mistral.ai/pricing/api/]
- **SLA Enterprise** : « AI Studio » et « Vibe » couverts ; disponibilité mensuelle visée **≥ 99,5 % (Basic)**, **99,9 % (Standard et Premium)** ; crédits de 2 % à 20 % des frais mensuels, plafonnés à 25 % ; support P1 de 2 h (Premium) à 12 h (Basic) en première réponse. Ne couvre que la part déployée sur l'infrastructure Mistral ; exclut alpha/bêta. [S: https://legal.mistral.ai/terms/enterprise-service-level-and-support-schedule/]
- **Statuts au 21/10/2026** : Studio accessible gratuitement (Free mode) ; Workflows en *public preview* depuis le 27/04/2026 ; Prompts & Skills disponibles depuis le 09/07/2026 ; Regional Endpoints **GA** et Priority Tier en *public preview* depuis le 11/08/2026 ; Mistral Large 4 en *PublicPreview* (sorti le 06/10/2026). [S: news correspondantes ; catalogue docs]
- **Données** : hébergement UE par défaut, endpoint US explicite possible ; ZDR uniquement en pay-as-you-go et sur endpoints *stateless*, sur demande motivée ; en **Free mode, les entrées/sorties peuvent servir à l'entraînement** (opt-out possible) ; certifications ISO 27001, ISO 27701, SOC 2 Type II ; BAA HIPAA proposé. [S: help.mistral.ai ; https://trust.mistral.ai/]

## 2. Concepts et vocabulaire

| Terme original | Terme FR officiel (si publié) | Définition / usage observé |
|---|---|---|
| Mistral Studio / Studio | « Studio » (FR : « Mistral Studio \| Votre plateforme de production IA. ») | Plateforme de production IA + console développeur (console.mistral.ai). [S: /products/studio, /fr/products/studio] |
| Mistral AI Studio / AI Studio | — | Nom de lancement (bêta privée, 24/10/2025) ; encore employé dans le SLA (« AI Studio ») et sur la page de statut. |
| La Plateforme | « la plateforme » | Nom historique (déc. 2023) des services API/console ; survit dans les routes `admin.mistral.ai/plateforme/...`. |
| Console | — | Nom du composant surveillé sur status.mistral.ai ; console.mistral.ai = interface Studio. |
| Admin panel | « Panneau d'administration » | admin.mistral.ai : compte, abonnements, limites, confidentialité, export. [S: help FR 698531] |
| Organization / Workspace | « organisation » / « espaces de travail » | Les limites d'usage sont fixées au niveau organisation et s'appliquent à tous ses workspaces ; les Workspaces séparent équipes/projets (RBAC). [S: help 698531 ; news/workflows] |
| Free mode | « mode gratuit » | Mode par défaut de Studio/API : limites les plus basses, évaluation/prototypage. |
| Pay-as-you-go (PAYG) | « paiement à l'usage » | Facturation à la consommation ; débloque Tier 1+ ; prérequis au ZDR. Distinct de l'abonnement Vibe. |
| Scale plan | — | Nom de l'offre pay-as-you-go dans le JSON-LD de la page Studio (absent des pages visibles). |
| Tier 1 … Tier 4 | « tier » | Paliers de limites débloqués automatiquement selon le montant cumulé facturé. |
| Rate limits | « limites d'usage » | RPS, tokens/minute, tokens/mois ; par modèle ; page *Limits*. |
| Plan key vs pay-as-you-go key | « clé de forfait » / « clé API pay-as-you-go » | Clé créée depuis *Code › Vibe Code CLI* (liée au budget du forfait Vibe) vs clé API classique (liée aux limites API). |
| API credits / PAYG credits | « crédits PAYG » | Crédits prépayés (solde prioritaire) ; ou crédits API inclus dans Vibe Pro ; prolongation d'usage Vibe au tarif API. |
| Build / Iterate / Deploy / Govern / Accelerate | Construire / Itérer / Déployer / Gérer / Accélérer | Les 5 onglets de la page Studio. |
| Workflows | « Les flux de travail » (page Studio) ; « Workflows » (pricing FR) | Orchestration durable d'agents/process (Temporal). |
| Agents | « Les agents » | Agents raisonnant sur outils, données et systèmes. |
| Connectors | « Les connecteurs » | Connecteurs intégrés ou personnalisés, réutilisables par agents et workflows. |
| Experiments | « Les essais » | Comparaison de variantes de modèles en environnement contrôlé. |
| Campaigns | « Les campagnes » | Itérations reproductibles et versionnées. |
| Judges | « Les juges » | Modèles d'évaluation (intégrés ou personnalisés) qui notent les sorties. |
| Datasets | « Les ensembles de données » / « jeux de données » | Données d'entraînement/évaluation issues du trafic réel. |
| Hybrid / Dedicated / Self-hosted | « En environnement hybride / dédié / auto-hébergé » | Modes de déploiement. |
| Observability | « L'observabilité » | Traces, tableaux de bord, graphes de contexte temps réel. |
| Guardrails | « Les mécanismes de contrôle » | Contraintes comportementales/politiques à l'exécution, définies en code. |
| Moderation | « La modération » | Filtrage automatique des sorties non sûres/non conformes. |
| AI registry | « Registre d'IA » | Catalogue unifié (modèles, agents, prompts, skills, datasets, workflows) avec lignage et contrôles d'accès. |
| Versioning and lineage | « La gestion des versions et de la traçabilité » | Suivi des changements, réutilisation, retour arrière. |
| Developer toolkit | « La boîte à outils pour les développeurs » | API, SDK, exemples, composants préconstruits. |
| Agent Runtime | — | Pilier « exécution » du lancement (2025), bâti sur Temporal. |
| Explorer, Judge Playground, Iterations, Dashboards | — | Sous-composants d'Observability cités au lancement. |
| Regional inference / Regional Endpoints | — | Endpoints `api.eu.mistral.ai` / `api.us.mistral.ai`, +10 %. |
| Priority Tier / Standard Tier | — | File prioritaire (×1,75), paramètre `service_tier`. |
| Batch | — | Traitement asynchrone, −50 %, traité sur 24 h. |
| Cached input | — | Tokens d'entrée en cache, jusqu'à −90 %. |
| Zero Data Retention (ZDR) | « Zero Data Retention (ZDR) » | Non-conservation des entrées/sorties d'endpoints stateless ; sur demande. |
| Anonymous improvement data | — | Libellé du toggle d'opt-out entraînement pour Studio/API (Admin panel › Privacy). |
| Vibe (Work / Code / Chat) | Vibe | Nouveau nom de Le Chat, 3 modes. |
| Education plan | « Je suis étudiant » (bouton) | Pro à 5,99 $/mois pour étudiants/enseignants vérifiés (12 mois max). |
| Flash Answers | « réponses rapides » | Réponses > 1 000 tokens/s ; quotas 150/j (Pro), 200/j (Team). |
| Monthly Uptime Percentage / SLO / Service Credits | — | Termes du SLA Enterprise. |
| P1–P4 | — | Niveaux de priorité des incidents (Critical / High / Medium / Low impact). |
| Basic / Standard / Premium | — | Niveaux de support Enterprise. |
| Model status : GA, PublicPreview, Deprecated, Retired ; type : Open, Premier, Labs | — | Statuts et types du catalogue de modèles. |
| European Compute Units (ECU) | — | Unités convertissant des engagements pluriannuels en accès à l'infrastructure Mistral. |
| Forge | — | Produit de personnalisation/entraînement de modèles. |
| Mistral Compute | — | GPU dédiés en Europe ; aussi sous-traitant « Cloud infrastructure » (France). |

## 3. Offre en détail

### 3.1 Studio dans la gamme Mistral

**Page /products** — titre « Build your AI with Mistral. », sous-titre : modèles, logiciels et infrastructure pour personnaliser l'IA, la mettre au travail et l'exploiter à sa façon. Meta description : « The most powerful AI platform for enterprises… ». [S: https://mistral.ai/products/]

| Produit | Accroche sur /products (paraphrase) | Page | CTA principal |
|---|---|---|---|
| Vibe | Agents IA pour la recherche, l'analyse, la création et le travail quotidien | /products/vibe/ | « Try it free » → chat.mistral.ai |
| **Studio** | **Construire, gouverner et améliorer agents et applications IA** | /products/studio/ | « Try Studio » → console.mistral.ai |
| Inference | Modèles open-weight et spécialistes, de Mistral et de tiers, sur une seule API, servie par Mistral Cloud | /cloud/inference/ | « Get API key » → console.mistral.ai/api-keys |
| Compute | Réserver des GPU dédiés haute performance en Europe sans les sourcer/opérer | /cloud/compute/ | « Get in touch » |
| Forge | Personnaliser, entraîner et optimiser des modèles pour l'organisation | /products/forge/ | « Talk to an expert » |

**Page d'accueil** — titre HTML « Mistral \| #1 in Sovereign AI: Frontier Open Models You Own ». Quatre couches de contrôle présentées en onglets : *Frontier open models* (→ Research), *Proprietary intelligence* (→ Forge), *AI operations* (→ Studio et Vibe : Studio sert à construire, gouverner et améliorer agents et applications ; Vibe amène l'IA dans la recherche, le code et les tâches quotidiennes), *Flexible compute* (→ Inference et Compute : on-prem, VPC ou hébergé par Mistral ; inférence in-region ; capacité GPU réservée). Preuves sociales par secteur : énergie (TotalEnergies ; « 5 des plus grands énergéticiens mondiaux » font confiance à Mistral), manufacturing (ASML identifie les erreurs de sous-systèmes 70 % plus vite ; citation Airbus), services financiers (BNP Paribas : KYC de semaines à jours ; « les trois plus grandes banques européennes »), secteur public (OTAN et 20+ entités gouvernementales ; EPO ; HTX). [S: https://mistral.ai/]

**Navigation globale** (en-tête du site) : Research · Sovereign AI (Why Sovereign AI, Products, Method, Sovereign AI in practice) · Cloud (Inference, Compute) · Customers (Energy & utilities, Manufacturing, Financial services, Public sector, All customers) · Company (Blog, Docs, About us, Careers) · bouton « Get in touch » · menu **Login** proposant deux destinations : **Studio → console.mistral.ai** et **Vibe → chat.mistral.ai**. [S: https://mistral.ai/products/studio (en-tête)]

**Pied de page** : *Build with us* (Customers, Partners, Brand, Pricing) · *Dive deeper* (Coding, Document intelligence, Speech, Applied AI services, All use cases) · *Company* (Terms of Service, Privacy Policy, Privacy choices, Data processing agreement, Trust Center, Legal notice) · réseaux (LinkedIn, X, YouTube, Discord, Reddit) · badges App Store / Google Play « Get Mistral Vibe » · langues English / Français / Italiano. [S: idem]

Sitemap : 558 URL dont 279 billets de blog (3 langues : racine, /fr/, /it/) ; pages produit : `/products/`, `/products/studio/`, `/products/vibe/`, `/products/vibe/code/`, `/products/forge/` ; pages cloud : `/cloud/`, `/cloud/inference/`, `/cloud/compute/` ; tarification : `/pricing/`, `/pricing/api/`, `/pricing/enterprise-deployments/` ; solutions : `/solutions/`, `/solutions/coding/`, `/solutions/custom-model-training/`, `/solutions/document-ai/`, `/solutions/speech/`. **N'existent pas (404)** : `/products/ai-cloud`, `/ai-transformation` (remplacés de fait par `/cloud/...` et `/our-method/`). Lastmod de `/products/studio/` : 2026-10-05 ; `/pricing/` : 2026-10-07. [S: https://mistral.ai/sitemap-0.xml]

### 3.2 Page produit Studio (anglais) — anatomie complète

[S: https://mistral.ai/products/studio — HTML brut récupéré le 21/10/2026 ; une copie Firecrawl en cache datait du 20/10/2026, contenu identique]

**Métadonnées** : `<title>` « Mistral Studio | Your AI production platform. » ; meta/og description = phrase d'accroche du héros ; image OG partagée avec tout le site (« cover-mistral-sovereign copie.webp ») ; fil d'Ariane *Products › Studio*.

**Héros**
- H1 : « Build your frontier with Studio. »
- Sous-titre : une plateforme pour construire, déployer et gouverner des systèmes d'IA agentique, avec confidentialité et sécurité de niveau entreprise et pleine propriété des données.
- CTA unique : **« Try Studio »** → `https://console.mistral.ai/`.
- Second H1 : « Operationalize AI. From frontier models to real-world systems. » — le balisage affiche littéralement `frontier<br> models` (balise échappée, visible dans l'extraction texte).
- Illustration animée composée de 6 « frames » étiquetées : **Workflows, Connectors, Audio, Agents, OCR, Models** (indice des briques mises en avant).

**Corps : 5 onglets** (ancres = identifiants CMS : `#69f236c3…` Build, `#69f23d41…` Iterate, `#69f23ec6…` Deploy, `#69f24700…` Govern, `#69f53274…` Accelerate)

| Onglet (accroche) | Fonctionnalité | Promesse (paraphrase) | Visuel |
|---|---|---|---|
| **Build** — connecter ses sources, orchestrer la logique métier, livrer une IA qui tient en conditions réelles | Workflows | Processus agentiques qui persistent l'état, réessaient en cas d'échec et reprennent automatiquement | workflows.webp |
| | Agents | Agents qui raisonnent à travers outils, données et systèmes ; instructions et comportement définis avant la production | agents.webp |
| | Connectors | Toute source de données d'entreprise via connecteurs intégrés ou personnalisés ; construits une fois, réutilisés par tous les agents et workflows | connectors.webp |
| **Iterate** — mesurer ce que fait réellement l'IA, puis l'améliorer | Experiments | Concevoir et comparer des variantes de modèles en environnement contrôlé, tester avant d'exposer aux utilisateurs | experiments.webp |
| | Campaigns | Itérations reproductibles et versionnées ; suivre ce qui a changé, progressé, cassé | — |
| | Judges | Notation automatique par modèles d'évaluation intégrés ou personnalisés ; métriques cohérentes et interprétables au lieu de revues subjectives | — |
| | Datasets | Transformer trafic réel et retours de production en données d'entraînement curées | — |
| **Deploy** — tourner partout, « votre infrastructure, vos règles » | Hybrid | Cloud et on-prem avec comportement cohérent ; une base de code, toute infrastructure | — |
| | Dedicated | Isoler les charges (sécurité, conformité, performance) ; environnements séparés, aucune ressource partagée | — |
| | Self-hosted | Contrôle total de l'infrastructure et de la résidence des données ; rien ne sort du périmètre | — |
| **Govern** — tout voir, contrôler ce qui compte | Observability | Chaque requête, réponse et décision dans les pipelines multi-étapes ; traces, dashboards, *context graphs* temps réel | observability.webp |
| | Guardrails | Contraintes comportementales et de politique à l'exécution, définies en code | guardrails.webp |
| | Moderation | Détection/filtrage automatiques des sorties à risque ; règles appliquées à chaque réponse | moderation.webp |
| **Accelerate** — le premier cas d'usage peut être long, les 10 suivants ne devraient pas l'être | AI registry | Catalogue unifié modèles, agents, prompts, skills, datasets, workflows ; lignage complet et contrôles d'accès | Airegistry.webp |
| | Versioning and lineage | Suivi des changements entre équipes, réutilisation, retour arrière instantané | versioning.webp |
| | Developer toolkit | API, SDK, exemples de code, composants préconstruits ; démarrer « en minutes, pas en semaines » | developer-toolkit.webp |

**Bloc ressources « Build what's next. »** : 4 cartes **non cliquables** dans le HTML — *Documentation* (guides et références API), *Examples* (exemples de code et tutoriels), *Support* (connaissances et ressources communautaires), *Services* (accompagnement d'experts).

**CTA final** : « Build your own AI future. » + sous-titre (construire, personnaliser, déployer avec contrôle total) ; boutons **« Start building »** → console.mistral.ai et **« Contact sales »** → /contact/.

**Ce qui est absent** de la page Studio (constat) : aucun logo client, aucun témoignage, aucune étude de cas, aucune FAQ, aucun prix ou plan, aucun chiffre (latence, volumétrie, nombre de connecteurs…), aucune capture d'écran annotée hors visuels .webp, aucune vidéo. Les seuls liens sortants du corps sont console.mistral.ai et /contact/. [S: HTML brut de https://mistral.ai/products/studio/]

### 3.3 Page produit Studio (français) — terminologie officielle

[S: https://mistral.ai/fr/products/studio]

- `<title>` : « Mistral Studio | Votre plateforme de production IA. »
- Meta description FR **différente** de l'anglais : créer des cas d'usage IA, gérer l'intégralité du cycle de vie et déployer en confiance, avec protection d'entreprise, sécurité renforcée et pleine maîtrise des données.
- H1 : « Créez votre propre univers avec Studio. » (traduction libre de « Build your frontier »).
- Sous-titre : plateforme unique pour créer, déployer et gérer des systèmes **d'IA autonome** (« agentic » rendu par « autonome »), confidentialité/sécurité des données d'entreprise, pleine propriété des données.
- CTA : « Essayer Studio » ; final : « Commencer à créer » / « Contacter le service commercial ».
- **Non traduit** : le second H1 « Operationalize AI. From frontier<br> models… » et les 6 étiquettes du héros (Workflows, Connectors, Audio, Agents, OCR, Models) restent en anglais ; le fil d'Ariane reste « Products › Studio ».

| Anglais | Français officiel (page FR) |
|---|---|
| Build / Iterate / Deploy / Govern / Accelerate | Construire / Itérer / Déployer / **Gérer** / Accélérer |
| Workflows | Les flux de travail (« Organisez des processus autonomes… ») |
| Agents | Les agents |
| Connectors | Les connecteurs |
| Experiments | **Les essais** |
| Campaigns | Les campagnes |
| Judges | Les juges |
| Datasets | Les ensembles de données (mais « jeux de données » dans « Registre d'IA ») |
| Deploy : Run anywhere… | « Depuis n'importe où. Votre infrastructure, vos règles. » |
| Hybrid / Dedicated / Self-hosted | En environnement hybride / dédié / auto-hébergé |
| Govern : See everything… | « Ne manquez rien. Contrôlez ce qui compte. » |
| Observability | L'observabilité (« Tracés, tableaux de bord et graphiques contextuels ») |
| Guardrails | **Les mécanismes de contrôle** |
| Moderation | La modération |
| AI registry | Registre d'IA (« prompts », « Skills », « workflows » laissés en anglais) |
| Versioning and lineage | La gestion des versions et de la traçabilité |
| Developer toolkit | La boîte à outils pour les développeurs |
| Build what's next. | Construisez l'avenir. |
| Documentation / Examples / Support / Services | Documentation / Exemples / Assistance / Services |

Autres termes FR officiels relevés ailleurs : « mode gratuit », « paiement à l'usage », « limites d'usage », « Panneau d'administration », « tier », « clé de forfait », « identifiant d'organisation » [S: https://help.mistral.ai/fr/articles/698531] ; « Gratuit / Pro / Team / Entreprise », « Commencez », « Nous contacter », « Connecteurs (bêta) », « Connecteurs MCP personnalisés (bêta) », « Journaux d'audit », « SSO SAML », « Marque blanche », « API administrateur », « Déploiements personnalisés », « Prolongez l'utilisation avec des crédits PAYG » [S: https://mistral.ai/fr/pricing].

### 3.4 Données structurées (JSON-LD) de la page Studio

Présentes à l'identique sur /products/studio, /fr/products/studio et /it/products/studio (non traduites). Type `SoftwareApplication`, `applicationCategory: DeveloperApplication`, `operatingSystem: Web`, `audience.audienceType: "Developers and enterprise AI teams"`, logo `https://mistral.ai/images/logos/logo-studio.svg`. [S: HTML brut https://mistral.ai/products/studio/]

- **Description** : plateforme de production IA et console développeur de Mistral ; construire, tester et exécuter agents et apps sur l'API Mistral ; catalogue unifié (modèles, agents, prompts, skills, datasets, workflows) ; observabilité et AI Registry.
- **Offres** :

| `name` | `price` | Description (paraphrase) |
|---|---|---|
| `Free mode` | `0` (`USD`) | Test et prototypage, avec génération de clé API |
| `Scale plan` | — (`PriceSpecification` : tarification à l'usage sur l'API Mistral) | Pay-as-you-go, limites plus élevées ; tiers supérieurs débloqués par facturation cumulée |

- **featureList** (7 entrées) : playground API pour tester/comparer des sorties ; workflows durables et reproductibles + runtime d'agents ; agents avec appel d'outils, code interpreter, web search, génération d'images ; knowledge, RAG, libraries et connecteurs ; Observability (Explorer, Judges, Datasets, Campaigns) ; AI Registry avec versioning (modèles, agents, datasets, workflows) ; API batch, OCR, audio, modération.

### 3.5 Récit de lancement et chronologie

**Billet « Introducing Mistral Studio. » (24/10/2025, titre HTML « Introducing Mistral AI Studio. »)** [S: https://mistral.ai/news/ai-studio]
- Diagnostic : beaucoup de prototypes, peu de systèmes en production. Blocages listés : suivre l'évolution des sorties entre versions de modèle/prompt ; reproduire/expliquer les régressions ; monitorer l'usage réel et collecter du feedback structuré ; évaluer sur des benchmarks métier ; fine-tuner sur données propriétaires de façon privée et incrémentale ; déployer des workflows gouvernés.
- Exigences recueillies auprès de « centaines » de clients : évaluation intégrée, boucles de feedback traçables, provenance et versioning (prompts, modèles, datasets, juges), gouvernance (audit, accès, frontières d'environnement), déploiement flexible (hybride, VPC, on-prem).
- **Trois piliers** : **Observability** (Explorer pour filtrer/inspecter le trafic et constituer des datasets ; Judges construits/testés dans un *Judge Playground* ; Campaigns et Datasets convertissant les interactions de production en jeux d'évaluation ; Experiments, Iterations, Dashboards) ; **Agent Runtime** (runtime *stateful* et tolérant aux pannes bâti sur **Temporal** ; gère de gros payloads en déportant les documents vers un stockage objet ; génère des graphes statiques d'exécution ; télémétrie et données d'évaluation versées dans Observability ; déploiements hybrides, dédiés, auto-hébergés) ; **AI Registry** (système d'enregistrement de tous les actifs — agents, modèles, datasets, juges, outils, workflows ; lignage, propriétaire, versioning ; contrôles d'accès, politiques de modération, *promotion gates* avant déploiement).
- Appel à l'action : inscription à la **bêta privée** d'AI Studio.

**Chronologie publique reconstituée**

| Date | Événement | Source |
|---|---|---|
| 11/12/2023 | « La Plateforme » ouvre en bêta : endpoints `mistral-tiny`, `mistral-small`, `mistral-medium`, `mistral-embed` ; API calquée sur la spécification de chat du concurrent dominant ; clients Python et JavaScript | /news/la-plateforme |
| 24/10/2025 | Lancement « Mistral AI Studio » (bêta privée) | /news/ai-studio |
| 27/04/2026 | Workflows en *public preview*, intégré à Studio | /news/workflows |
| 09/07/2026 | Prompts & Skills versionnés dans Studio | /news/manage-prompts-and-skills-in-studio |
| 11/08/2026 | Regional Endpoints GA ; Priority Tier en public preview ; modèles open tiers (GLM-5.2) ; coalition compute (ECU) | /news/regional-inference-open-models-new-compute |
| 2026 (date non précisée) | « Le Chat is now Vibe » ; documentation produit déplacée vers docs.mistral.ai | help 682992 |
| 06/10/2026 | Mistral Large 4 (PublicPreview) | catalogue docs |
| 20/10/2026 | Voxtral 3 (transcription/TTS, PublicPreview) | catalogue docs ; bannière d'accueil |

### 3.6 Annonces structurantes post-lancement

**Workflows (27/04/2026, public preview)** [S: https://mistral.ai/news/workflows]
- Positionné comme « couche d'orchestration de l'IA d'entreprise », **partie intégrante de Studio**. Clients cités : ASML, ABANCA, CMA-CGM, France Travail, La Banque Postale, Moeve.
- Développeurs : workflows écrits en **Python** ; chaque workflow peut être **publié dans Le Chat** (désormais Vibe) pour être déclenché par toute l'organisation ; chaque étape tracée et auditable dans Studio (timeline, traces, **OpenTelemetry** natif).
- Human-in-the-loop en une ligne : `wait_for_input()` (pause sans consommation de calcul, notification, reprise) ; réponse possible depuis Le Chat, un webhook ou toute surface connectée.
- Arguments : exécution durable, observabilité, natif Studio (mêmes agents et connecteurs), **Workspaces** + **RBAC**, plan de contrôle chez Mistral / workers chez le client (cloud, on-prem, hybride).
- Sous le capot : moteur **Temporal** étendu (streaming, gestion de payloads, multi-tenancy, observabilité). Mistral héberge cluster Temporal, Workflows API et Studio ; le client déploie des **workers sur son Kubernetes via un chart Helm** distinct, reliés par identifiants sécurisés. SDK : retries, tracing, timeouts, rate limiting, HITL via décorateurs.
- Installation : SDK Python **v3.0** — `uv add mistralai-workflows`.
- Cas : libération de cargo (douanes, matières dangereuses, approbation humaine), conformité documentaire KYC (minutes au lieu d'heures), triage support.

**Prompts & Skills (09/07/2026)** [S: https://mistral.ai/news/manage-prompts-and-skills-in-studio]
- Studio devient le « système d'enregistrement » des prompts et skills : **versions immuables**, **rollback** (comparaison de deux versions), **propriétaire nommé**, **labels de classification** (ex. « Production » vs « Staging »), **journaux d'audit** (qui/quand).
- Édition et test immédiats par tout « AI builder » (développeur ou métier) sans attendre la CI ; la promotion vers la production via labels **déclenche la CI/CD** existante (ex. SDK dans un workflow GitHub Actions).
- Lien avec Observability : lignage d'une sortie de production vers la version de l'asset ; les **skills sont exposés comme serveurs MCP** directement depuis Studio.
- Visibilité progressive : créateur seul → workspace → organisation.
- Docs : quickstarts « Create reusable prompts » / « Create skill » ; console : `console.mistral.ai/build/prompts`, `console.mistral.ai/build/skills`.

**In-region inference, open models, compute (11/08/2026)** [S: https://mistral.ai/news/regional-inference-open-models-new-compute]
- **Mistral Regional Endpoints GA** : choix Europe ou US pour l'inférence (résidence, réglementation, latence), sous réserve de transferts limités vers des sous-traitants hors région (Trust Center).
- **Mistral Priority Tier, public preview** : niveaux de service engagés, rate limits personnalisés, SLA de disponibilité. Mistral se dit le seul labo européen à offrir région de traitement + service level adossé à un SLA.
- **Modèles open tiers** servis par Mistral, en commençant par Z.ai GLM-5.2 (mêmes contrôles régionaux et engagements).
- **Coalition compute** : engagements pluriannuels convertis en **European Compute Units (ECU)** ; ambition jusqu'à 1 GW de capacité d'ici 2030 (résumé du billet). Témoignages : Factory, Amadeus, ASML, Capgemini, Caisse des Dépôts, CMA CGM.

### 3.7 Les autres produits de la suite (lecture brève)

**Vibe** — [S: https://mistral.ai/products/vibe/]
- Titre : « Mistral Vibe (formerly Le Chat) - AI chat and coding agent ». H1 « ~~Work~~ Vibe. » ; agent pour tâches longues, maîtrisant connaissances et outils. CTA « Try it free ». Prompts exemples cliquables (`chat.mistral.ai/chat?q=…`).
- Logos : ASML, BNP Paribas, Government of Luxembourg, CMA CGM, Abanca, Stellantis, La Banque Postale, SNCF.
- 4 promesses : briefer Vibe et passer à autre chose ; livrer du code avant le standup ; automatiser ce qui se répète (agents qui routent/résolvent à travers les systèmes) ; « intelligence possédée, pas louée » (fine-tuning, résidence des données dans tout cloud/datacenter).
- Plans teasés : Free (réponses rapides, tâches simples), Pro (tâches complexes, raisonnement, code toute la journée), Team (espace partagé, contrôles admin, plus de stockage), Enterprise (déploiements personnalisés, entraînement de modèles, support dédié).
- Usages « work » (Understand / Create / Execute) et « code » (Ship / Map / Modernize).
- FAQ : Vibe = assistant chat (Vibe for work, ex-Le Chat) + agent de code (Vibe for code) ; « Le Chat is now Vibe », conversations/réglages/plans conservés ; voix via Voxtral ; 100+ outils via connecteurs et compatibilité MCP complète ; Vibe for code via CLI, VS Code/JetBrains/Zed (ACP), agents distants et *teleport* ; Enterprise : on-prem, cloud privé ou Mistral Cloud ; fine-tuning via **Mistral Forge** (déploiements enterprise).

**Vibe Code** — [S: https://mistral.ai/products/vibe/code/]
- H1 « Keep shipping. » ; installation `curl -LsSf https://mistral.ai/vibe/install.sh | bash` ou `uv tool install mistral-vibe` ; IDE : VS Code, JetBrains, Zed ; liens : Vibe web app (chat.mistral.ai/code), Enterprise, Documentation (docs.mistral.ai/vibe/code/overview).
- Arguments : « Ship 10x faster », PR réduites de moitié ; contexte de codebase ; migration legacy ; fine-tuning sur le code.
- Plans : **Pro** (code toute la journée + PAYG au besoin), **Team** (petites équipes), **API** (accès programmatique aux modèles de code), **Enterprise**.
- Pile affichée : Development Toolkit, Connectors, Agent platform, Sandbox, « Worflows » [sic], Hosted agents ; Custom model training, RL, Fine-tuning, Continue Pre-training ; modèles « Mistral medium 3 », « Devstral 2 », Codestral, Codestral embed ; Self-hosted, Mistral Cloud, Cloud providers.
- FAQ : accès via Pro/Team **ou clé API depuis Mistral Studio** ; fine-tuning de Mistral Medium, Devstral ou Codestral ; self-host / Mistral Compute / clouds majeurs. CTA final « Start building » → `console.mistral.ai/codestral/cli`.

**Forge** — [S: https://mistral.ai/products/forge/]
- « Build AI models that know your enterprise » ; CTA « Talk to an expert ». Logos : ASML, DSO, Ericsson, ESA, Reply.
- Arguments : alignement métier, entraînement de bout en bout (pré-entraînement, données synthétiques, post-training RL), évaluation alignée KPI, flexibilité d'infrastructure, sécurité/gouvernance.
- 6 étapes : préparation des données (exemples métier, cas limites, scénarios bornés par politique) ; entraînement (architectures Dense et MoE ; multimodal texte/image/audio) ; alignement (RLHF + distillation, LoRA, SFT, DPO) ; évaluation (KPI, suites de régression, détection de dérive) ; gestion du cycle de vie (tout versionner, traçabilité, rollback) ; inférence (runtime optimisé, réponses conformes aux politiques, cloud privé/on-prem/Mistral compute).
- Cas : modernisation de code, adaptation industrielle, cybersécurité, recherche quantitative.

**Inference** — [S: https://mistral.ai/cloud/inference/]
- H1 : inférence pour construire sa frontière en Europe ; « Run Mistral and leading open models on one API, served by Mistral Cloud » ; CTA « Get API key » → console.mistral.ai/api-keys.
- Exemples de code (Python/JavaScript/cURL) pour 5 tâches : *Prompt a model*, *Build an agent*, *Document understanding*, *Transcribe audio*, *Generate speech* (cf. §5). Modale « Add your API key » : créer une clé dans Mistral Studio puis la coller pour compléter l'extrait (boutons *Cancel* / *Complete the code*).
- Logos : Snowflake, Harvey, MongoDB (+ logos non nommés). Témoignages : Firefox (Mistral Small dans le navigateur), Factory (modèles open sous contrôles régionaux).
- Souveraineté : choix UE ou (modèles supportés) US, chaque région = déploiement indépendant ; Mistral sert lui-même les modèles tiers ; ZDR ou déploiement privé.
- Configurateur de prix (cf. §4/§6.3) ; cartes modèles : Mistral Large 4 (« New ») 1,36 $ / 4,18 $ ; OCR 4.1 (« New ») **OCR 4 $ / 1 000 pages, Document AI 5 $ / 1 000 pages**, alias `mistral-ocr-latest` ; Voxtral Mini Transcribe 2 0,003 $/min sur `/v1/audio/transcriptions`, alias `voxtral-mini-latest` ; GLM 5.3 (tiers, « New ») 1,4 $ / 4,4 $, `zai-glm-5-3`.
- Bloc **Enterprise APIs** : contrôles de traitement régional, SLA « system-level », rate limits accrus, support premium → « Get in touch ».
- FAQ : endpoints régionaux `api.eu.mistral.ai`, `api.us.mistral.ai` (+10 %), sinon endpoint global ; Priority Tier avec SLA de disponibilité ; modèles tiers servis sur GPU gérés par Mistral, sans modification, avec cycle de dépréciation plus court ; **les données envoyées via l'API ne servent pas à l'entraînement, ZDR sur demande** ; tester avant de payer dans Studio (agent playground, playgrounds OCR et audio) ; choix de modèle ; calcul des prix ; self-hosting (Hugging Face, licences Apache 2.0 ou MIT modifiée, AWS/Azure/GCP pour l'enterprise). CTA final « Prototype → Ship → Scale » / « Explore Studio » (lien cassé, cf. §7).

**Compute** — [S: https://mistral.ai/cloud/compute/]
- « Guaranteed compute capacity on EU soil » ; GPU dédiés en Europe ; CTA « Get in touch ».
- Témoignages : ASML (C. Fouquet), CMA CGM (R. Saadé), Amadeus (L. Maroto), Capgemini (A. Ezzat), Caisse des Dépôts (O. Sichel).
- Offre : matériel dernière génération, **Managed Slurm**, **Managed Kubernetes**, applications auto-hébergées (contrôles régionaux, observabilité, identité d'entreprise).
- « Control at every layer » : observabilité incluse sans surcoût (santé GPU, puissance, thermique, ECC, débit, télémétrie par job) ; gouvernance (SSO et **SCIM**, RBAC mappé sur comptes SLURM, secrets, KMS, audit, webhooks CI/CD) ; SLA entreprise entraînement et inférence ; support spécialisé à tous les niveaux ; sécurité (isolation réseau EVPN-VXLAN, chiffrement AES-256 au repos avec **BYOK**, protocole d'effacement).

**Cloud (hub)** — [S: https://mistral.ai/cloud/]
- « The frontier AI cloud » : contrôle régional, choix de modèles, capacité fiable. **Regional Endpoints** + **Priority Tier « custom rate limits and a 99.9% uptime SLA »** ; modèles Mistral et tiers open ; Studio et Vibe tournent sur Mistral Compute avec les mêmes contrôles ; « Regional and Priority API » avec SLA « financially backed ».
- Chronologie Mistral Compute : 04/2025 feu vert ; 06/2025 annonce (GTC Paris/Vivatech) ; 07/2025 racks GB200 ; 12/2025 GB300, stack alpha ; 02/2026 GB200 en production, site suédois (EcoDataCenter) ; 03/2026 premiers clients externes. GPU GB200 • GB300 • B300 ; CPU Grace et x86 ; capacité souveraine à l'échelle UE « d'ici 2030 ».

**Our method (services)** — [S: https://mistral.ai/our-method/]
- Accompagnement du premier cas d'usage à la transformation ; « You own the result ». Offres : *Use case acceleration*, *Deep customization*, *Enterprise activation*. Équipe déployée : deployment strategists, applied AI engineers, applied AI scientists, deployment engineers. Témoignages : Stellantis, Cisco (« AI Renewals Agent »).
- **4 modes de déploiement** : API serverless hébergée par Mistral (**hébergée dans l'UE**) ; Mistral Compute (capacité dédiée réservée) ; cloud privé (« your cloud, our stack ») ; on-prem et edge.

**Sovereign AI** — [S: https://mistral.ai/sovereign-ai/] — définition (contrôle sur données, modèles, adaptation, compute, runtime, opérations) ; 4 couches : Data, Intelligence, Compute, Operations ; 5 étapes : utiliser des modèles open, personnaliser, contrôler les opérations (identités distinctes pour personnes/services/agents, politiques avant exécution, approbations, logs et traces, versioning des prompts/agents/workflows/outils/politiques), choisir où ça tourne (plan de données vs plans de contrôle/gestion, capacité, failover), l'opérer soi-même (transfert de compétences).

### 3.8 Pages « Solutions »

| Page | Contenu clé | Lien vers Studio/console | Source |
|---|---|---|---|
| /solutions/ « The fastest way to AI-native » | Par industrie (services financiers : BNP Paribas, AXA 140 000+ employés ; santé : Synapse Medicine 300+ hôpitaux, Pierre Fabre, « HIPAA-compliant » ; manufacturing/logistique : CMA CGM MAIA, 160 pays, 155 000+ employés ; e-commerce : Zalando, Mirakl 10M+ produits/mois ; gouvernement : France Travail ; défense ; énergie : TotalEnergies, Veolia) ; par équipe (ventes/marketing, produit/ingénierie, risque/conformité, support, opérations) ; par capacité (génération de code, RAG, workflows agentiques, raisonnement, extraction, edge, sécurité IA) | aucun ; liens « Learn more » vers `/industry/*-old/` (404) | https://mistral.ai/solutions/ |
| /solutions/coding | Modèles : Mistral Medium (agentique), Codestral (complétion FIM), Codestral Embed (contexte) ; déploiement on-prem/VPC/cloud dédié ; usages Vibe en entreprise | — | https://mistral.ai/solutions/coding/ |
| /solutions/custom-model-training | Co-construction de modèles (pré-entraînement → fine-tuning) ; témoignages ASML, Helsing (VLA défense), HTX (LLM « Phoenix », 10 langues de Singapour) | — | https://mistral.ai/solutions/custom-model-training/ |
| /solutions/document-ai | Mistral OCR : 98 %+ de précision, jusqu'à **1 000 pages/min sur un seul GPU**, 170+ langues ; JSON structuré, annotations (bounding boxes / document), Q&A, **Batch OCR** ; on-prem/cloud privé | « Try Mistral OCR » → `console.mistral.ai/document-ai/ocr-playground` ; « Try OCR in Mistral Studio » | https://mistral.ai/solutions/document-ai/ |
| /solutions/speech | Voice agents, TTS, STT ; clonage de voix dès **3 s** ; STT temps réel **< 200 ms** ; diarisation ; *context biasing* jusqu'à **100 termes** ; 13 langues en transcription, 9 en génération ; pipeline Voxtral Realtime → LLM → Voxtral TTS | « Audio Playground in Mistral Studio » → `console.mistral.ai/build/audio/speech-to-text` | https://mistral.ai/solutions/speech/ |

## 4. Interface utilisateur

Aucune connexion n'a été faite : ce qui suit provient des liens et procédures publiés (pages produit, centre d'aide, docs). `console.mistral.ai/` et `admin.mistral.ai/` redirigent (HTTP 307) vers `https://v2.auth.mistral.ai/login?flow=<uuid>` (authentification ; Ory Corp. figure parmi les sous-traitants « User Authentication »). [S: tests de redirection 21/10/2026 ; https://trust.mistral.ai/subprocessors]

### 4.1 Domaines et routes observés

| Domaine / route | Écran (libellé publié) | Où c'est cité |
|---|---|---|
| `console.mistral.ai/` | Studio (accueil console) ; CTA « Try Studio », « Start building », « Login › Studio » | /products/studio |
| `console.mistral.ai/api-keys` | Création de clé API (« Get API key », « Open Studio ») | /cloud/inference |
| `console.mistral.ai/home?workspace_dialog=apiKeys` | Dialogue clés API d'un workspace (lien « console ») | help 698531 |
| `console.mistral.ai/build/playground` | « Playground » / « agent playground » | help 347391 ; /cloud/inference (FAQ) |
| `console.mistral.ai/build/document-ai/ocr-playground` | Playground OCR | /cloud/inference (FAQ) |
| `console.mistral.ai/document-ai/ocr-playground` | Playground OCR (ancienne route, sans `/build`) | /solutions/document-ai |
| `console.mistral.ai/build/audio/speech-to-text` | Audio Playground (STT, TTS, clonage) | /solutions/speech ; /cloud/inference |
| `console.mistral.ai/build/prompts` | Prompts | /news/manage-prompts-and-skills-in-studio |
| `console.mistral.ai/build/skills` | Skills | idem |
| `console.mistral.ai/codestral/cli` | « Code › CLI » / « Code › Vibe Code CLI » (clés de forfait Vibe ; « View organization usage ») | help 698531 ; /products/vibe/code |
| `admin.mistral.ai` | Admin panel / Panneau d'administration | help 347639, 455207 |
| `admin.mistral.ai/account` | Compte ; section « Danger Zone » › « Delete account » | help 347619 |
| `admin.mistral.ai/account/export` | Outil d'export des données Vibe (« dedicated tool in Mistral Studio ») | help 347623, 347639 |
| `admin.mistral.ai/plateforme/limits` | Page « Limits » : limites, usage, tier | help 698531 |
| `admin.mistral.ai/plateforme/subscription` | Activation du pay-as-you-go | help 347612, 455205 |
| `admin.mistral.ai/subscriptions` | « Subscriptions » (plans Vibe) | help 455205, 568728 |
| `admin.mistral.ai/vibe/privacy` | « Privacy settings » (ZDR visible une fois approuvé) | help 347612 |
| `chat.mistral.ai/` | Vibe (même URL et login que Le Chat) | help 682992 |
| `chat.mistral.ai/upgrade/plans` | Choix de plan payant (« Start now » Pro/Team) | /pricing |
| `chat.mistral.ai/upgrade/student` | Parcours Education plan | help 698530 |
| `chat.mistral.ai/code`, `/code/extensions` | Vibe Code web / extensions | /products/vibe/code |
| `v2.auth.mistral.ai/login` | Connexion, « Forgot password? », code à 6 chiffres | help 448331 |

### 4.2 Parcours documentés (chemins « A › B »)

- **Contacter le support depuis Studio ou Vibe** : cliquer sur l'organisation › « Support » › « Contact Us » → widget d'aide (Intercom) › onglet « Messages » › « Send us a message ». Détails attendus : produit (Vibe, Studio, API, facturation, compte), résumé, étapes, date/heure/fuseau, captures, **détails API (endpoint, méthode HTTP, payload de requête et de réponse, code de statut, request ID — jamais la clé)**. Les clients Enterprise passent par le même widget mais sont routés vers un flux prioritaire dédié. [S: https://help.mistral.ai/en/articles/347458]
- **Passer en payant (Vibe)** : Admin panel › « Subscriptions » › section « Upgrade to Pro » / « Upgrade to Team » › « Compare plans » › choix du plan et de la **fréquence (mensuelle ou annuelle, −20 % en annuel)** › facturation et paiement. [S: help 455205]
- **Résilier** : Admin panel › « Subscriptions » › onglet « Subscription » › section « Downgrade to Free » › « Unsubscribe » ; possibilité « Resume subscription » avant la fin de période. [S: help 455205]
- **Pay-as-you-go API** : réglage distinct de l'abonnement ; activer/désactiver dans Admin panel › Subscriptions (`/plateforme/subscription`). [S: help 455205, 347612]
- **Opt-out entraînement Studio/API** : Admin panel › menu « Privacy » (barre latérale gauche) › section « Anonymous improvement data » › désactiver le toggle. **Distinct** de l'opt-out Vibe : Admin panel › « Manage » › « Vibe » › « Privacy » › toggle « Allow your interactions to be used to train our models ». Mobile : Settings › « Data & Account Controls » › décocher « Enable data sharing ». [S: help 455207]
- **Compte (dans Vibe)** : nom d'organisation en bas à gauche › « Profile » (email + code de vérification) ou « Security & Access » (« Set new password » ; « Multi-factor authentication » › « Enable » › QR code TOTP › « 2FA Code » ; « Generate Codes » pour codes de secours affichés une seule fois). Mot de passe ≥ 8 caractères, différent du précédent, refus des mots de passe compromis ; e-mails depuis `no-reply@emails.mistral.ai`. [S: help 448331]
- **Usage Vibe + API** : « Code › CLI → View organization usage » (quota mensuel en %). [S: help 698531]

### 4.3 Écrans publics de tarification (comportements UI)

- **/pricing** : sélecteur de devise **USD ($) / EUR (€)** ; sélecteur de pays (27 pays UE + Royaume-Uni, défaut « France ») qui alimente un calcul TVA ; bascule « Excluding taxes / Including taxes » ; badge « Popular » sur Pro ; bouton « I'm a student » qui bascule la carte Pro en « Education plan » (liste d'avantages différente) ; carte Team avec **compteur d'utilisateurs** (`min="2"`, `max="100"`, défaut 2 → « $50 /mo ») et boutons −/+ ; tableau comparatif collant (« sticky ») ; icônes ✓, — et une icône « crayon » sans libellé dans la colonne Enterprise (voir §6.2). Taux de TVA embarqués : AT 20, BE 21, BG 20, HR 25, CY 19, CZ 21, DK 25, EE 24, FI 25.5, FR 20, DE 19, GR 24, HU 27, IE 23, IT 22, LV 21, LT 21, LU 17, MT 18, NL 21, PL 23, PT 23, RO 21, SK 23, SI 22, ES 21, SE 25, GB 20. [S: HTML brut https://mistral.ai/pricing/]
- **/pricing/enterprise-deployments/** (noindex) : « Let's build your AI advantage together » ; formulaire *First name, Last name, Company email, Role, Tell us about your project* (0/1000 caractères), case d'opt-in newsletter, Cloudflare Turnstile ; bouton « Talk with our team ». (Non rempli.) [S: https://mistral.ai/pricing/enterprise-deployments/]
- **docs.mistral.ai/inference/pricing** : toggles USD/EUR, case « Regional inference » (affiche « (+10%) » quand cochée), groupe « Standard / Batch / Priority » avec infobulles (Batch « −50 % », Priority « +75 % ») et liens « Learn more ». [S: https://docs.mistral.ai/inference/pricing]
- **/cloud/inference** : configurateur « Configure your API » (Standard/Batch/Priority ; « Regional inference +10% » ; « Cached input tokens −90% on input token% » ; boutons Apply / Reset ; devise et pays). [S: https://mistral.ai/cloud/inference/]

## 5. API et SDK (ce que les pages publiques en montrent)

Le détail de l'API relève d'autres chapitres ; ne figurent ici que les éléments exposés sur les pages d'offre, d'aide et de statut.

### 5.1 Endpoints et hôtes

| Méthode | Chemin / hôte | Rôle | Source |
|---|---|---|---|
| — | `api.mistral.ai` | Endpoint global (aucun engagement de localisation) | docs regional-inference |
| — | `api.eu.mistral.ai` | Endpoint régional UE (+10 %) — plusieurs datacenters UE/AELE | idem |
| — | `api.us.mistral.ai` | Endpoint régional US (+10 %) | idem |
| POST | `/v1/chat/completions` | Chat (exemple « Prompt a model ») | /cloud/inference |
| POST | `/v1/agents` | Création d'agent (outil `web_search`) | /cloud/inference |
| POST | `/v1/ocr` | OCR d'un document par URL | /cloud/inference |
| POST | `/v1/audio/transcriptions` | Transcription | /cloud/inference |
| POST | `/v1/audio/speech` | Synthèse vocale | /cloud/inference |
| — | `/v1/fim/completions`, `/v1/embeddings`, `/v1/moderations`, `/v1/chat/moderations`, `/v1/classifications`, `/v1/chat/classifications` | Endpoints *stateless* éligibles ZDR | help 347612 |
| — | `/v1/files` | Files API (stateful, hors ZDR, indisponible en régional) | help 347612 ; docs regional |

### 5.2 SDK et extraits publiés

- Python `mistralai` : `Mistral(api_key=...)` ; `client.chat.complete(model=..., messages=[...])` ; `client.beta.agents.create(model="mistral-medium-latest", name=..., description=..., tools=[{"type": "web_search"}])` ; `mistral.ocr.process(model="mistral-ocr-latest", document={"type": "document_url", "document_url": ...})` ; `mistral.audio.transcriptions.complete(model="voxtral-mini-latest")` ; `mistral.audio.speech.complete(model=..., input=...)` ; `client.models.list()`. [S: /cloud/inference ; docs regional-inference]
- TypeScript `@mistralai/mistralai` : mêmes méthodes en camelCase (`documentUrl`). [S: /cloud/inference]
- Sélection de région : `Mistral(api_key=..., server="eu")` (SDK ≥ 2.70, import `from mistralai.client import Mistral`) ; versions antérieures : `server_url="https://api.eu.mistral.ai/"`. [S: docs regional-inference]
- Priority Tier : paramètre de requête `service_tier` = `auto` (priorité si éligible, sinon standard) ou `standard_only` (défaut si omis) ; la réponse expose `usage.service_tier` = `priority` ou `standard`. [S: https://docs.mistral.ai/inference/priority-tier]

```python
response = client.chat.complete(
    model="mistral-medium-latest",
    service_tier="auto",
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)
print(response.usage.service_tier)  # "priority" ou "standard"
```

- Workflows : `uv add mistralai-workflows` (SDK v3.0) ; HITL `wait_for_input()`. [S: /news/workflows]
- Vibe CLI : `uv tool install mistral-vibe` ou script `install.sh`. [S: /products/vibe/code]

### 5.3 Codes d'erreur et comportements cités

- **429 Too Many Requests** : dépassement de l'une des trois limites (RPS, tokens/minute, tokens/mois). [S: help 698531]
- **401** juste après un e-mail de quota Vibe Code CLI : clé de forfait dont le budget Vibe est épuisé ; contacter le support avec l'identifiant d'organisation. [S: help 698531]
- Priority Tier : au-delà des limites Priority, repli sur Standard Tier au lieu d'un échec. [S: docs priority-tier]

### 5.4 Surface de service vue par la page de statut

Composants surveillés (cf. §6.6) : Completion API, Embedding API, OCR API, Agents API, Conversations API, Fine-Tuning API, Audio API, Integrations API, Files API, Batch API, Workflows API, Skills API (« AI Registry Skills API »), Prompts API (« AI Registry Prompts API »), Console, Vibe. [S: https://status.mistral.ai/ ; https://status.mistral.ai/history]

## 6. Limites, quotas, tarifs, disponibilité

### 6.1 Modèle économique de Studio : Free mode, pay-as-you-go, tiers, crédits

**Modes** [S: https://help.mistral.ai/en/articles/698531 ; JSON-LD /products/studio ; help 347612, 347617]

| Mode | Prix | Limites | Particularités |
|---|---|---|---|
| **Free mode** (défaut) | 0 $ | Les plus basses ; « évaluation et prototypage » | Génération de clés API ; **les entrées/sorties peuvent servir à entraîner les modèles** (accepté à l'inscription ; opt-out possible) ; ZDR **impossible** |
| **Pay-as-you-go** (« Scale plan » dans le JSON-LD) | À l'usage, tarifs API (§6.3) | Tier 1 dès l'activation, puis montée automatique | Prérequis du ZDR ; contrôle total de l'opt-out entraînement |
| **Enterprise** (contrat) | Sur devis | Rate limits accrus ; Priority Tier possible | SLA « system-level », support premium, contrôles régionaux (« Enterprise APIs » sur /cloud/inference) ; possibilité de désactiver au niveau organisation certaines fonctions impliquant des transferts hors UE |

**Tiers pay-as-you-go** (montée automatique selon le **montant cumulé facturé**, c.-à-d. le total des factures) :

| Tier | Condition |
|---|---|
| Tier 1 | Activation du pay-as-you-go |
| Tier 2 | Plus de 20 € / 20 $ facturés |
| Tier 3 | Plus de 100 € / 100 $ facturés |
| Tier 4 | Plus de 500 € / 500 $ facturés |
| Limites supérieures | Plus de 2 000 € / 2 000 $ facturés, **puis demande au support** avec : RPS cible, modèle précis, tokens/minute et tokens/mois estimés |

**Règles associées** [S: help 698531, 568728, 455205]
- Trois limites : **requêtes par seconde (RPS)** (requêtes concurrentes), **tokens par minute** (entrée + sortie), **tokens par mois** (plafond de consommation). Fixées **au niveau de l'organisation**, communes à tous ses workspaces ; **appliquées par modèle** (une migration de modèle peut changer les limites) ; consultables sur la page *Limits*.
- **Crédits prépayés** : ajoutent des fonds, **ne changent ni le tier ni les limites** ; utilisés comme solde principal avant le moyen de paiement ; ne couvrent pas une facture déjà émise ; achetés **hors TVA**, la facture d'usage étant générée à la consommation ; remboursement au cas par cas (avec ID d'organisation et numéro de reçu).
- Le pay-as-you-go est **indépendant de l'abonnement Vibe** ; le désactiver ramène en Free mode.
- **Clés de forfait vs clés PAYG** : une clé créée depuis *Code › Vibe Code CLI* consomme le **budget mensuel du forfait Vibe** (peut cesser de fonctionner jusqu'à la période suivante) ; pour l'automatisation API, utiliser une clé pay-as-you-go créée dans la console (Free mode ou PAYG).
- Les plans Vibe incluent des **crédits API** (Pro : 25,5 $/mois ; variante Education : 15 $/mois — attribution des deux listes par inférence, cf. §6.2) et la ligne « Extend usage with PAYG credits » (dépasser la limite du plan en payant l'excédent **au tarif API**) pour Pro et Team.

### 6.2 Page /pricing : plans Vibe

[S: https://mistral.ai/pricing (EN) et https://mistral.ai/fr/pricing (FR) ; JSON-LD WebPage : publiée le 30/06/2026, modifiée le 07/10/2026 ; meta description « Explore pricing for Mistral Vibe and APIs. »]

**Constat structurant** : la page n'a **aucun onglet Studio/API** ; elle ne présente que les plans Vibe ; Studio y apparaît seulement dans la FAQ (Free inclut l'accès à Studio ; suivi d'usage API dans le dashboard Studio) et dans la ligne « Workflows » (automatisations orchestrées depuis Studio). `https://mistral.ai/pricing/api/` (EN et FR) **redirige vers** `https://docs.mistral.ai/inference/pricing`. Le bouton Enterprise mène à `/pricing/enterprise-deployments/` (formulaire).

**Cartes de plans**

| Plan | Accroche | Prix affiché | Points listés sur la carte | CTA |
|---|---|---|---|---|
| **Free** | Agent IA personnel pour les tâches quotidiennes | 0 | Tester Vibe ; web et mobile ; messages et recherches web limités ; sessions de code limitées ; génération/édition d'images basique ; 100+ connecteurs | « Start now » → chat.mistral.ai/chat |
| **Pro** (badge « Popular ») | Accès complet à Vibe pour coder toute la journée et les tâches longues | **$14.99 /mo** (hors taxes ; `priceEur` = `priceUsd` = 14.99) ; mention « Subject to fair usage limits and Mistral's Terms of Service » | Plus d'accès et d'usage ; plus de messages et recherches web ; réponses plus rapides ; code toute la journée (CLI, IDE, web) ; génération de tableurs et slides ; meilleure génération/édition d'images ; **$25.5 /mo in API credits** ; support chat et e-mail | « Start now » → chat.mistral.ai/upgrade/plans |
| **Pro — Education plan** (bouton « I'm a student ») | idem | 5,99 $/mois (FAQ ; « normalement 14,99 $ ») ; infobulle : valable **12 mois max**, étudiants vérifiés d'établissements accrédités **n'ayant jamais utilisé Vibe (ou Le Chat)**, hors taxes | Plus d'accès ; plus de messages/recherches ; tâches plus complexes ; code toute la journée ; plus de générations d'images ; **$15 /mo in API credits** ; support chat/e-mail (inférence : liste affichée quand la bascule étudiante est active, d'après les classes CSS) | idem |
| **Team** | Espace collaboratif sécurisé pour les équipes | **$24.99 /user/mo** (hors taxes) ; calculateur : **2 utilisateurs minimum, 100 maximum** → « $50 /mo » par défaut | Limites encore plus hautes ; réponses encore plus rapides ; **jusqu'à 30 Go de stockage/utilisateur** ; vérification de nom de domaine ; export des données | « Start now » |
| **Enterprise** | Déploiements privés avec modèles, UI et outils personnalisés | Sur contact | Modèles personnalisés ; agents personnalisés ; workflows personnalisés ; journaux d'audit ; SAML SSO ; marque blanche | « Contact us » |

Facturation : **mensuelle ou annuelle pour Pro et Team, −20 % en annuel** (indiqué seulement dans le centre d'aide, pas sur /pricing). Résiliation web : remboursement automatique si annulation dans les **14 jours** de l'achat initial (pas les renouvellements) ; au-delà, accès jusqu'à la fin de la période puis retour en Free. Abonnements App Store/Google Play et opérateurs (Free Mobile ; Orange/NJU avec 6 mois offerts) gérés par le tiers. [S: help 455205, 568728, 392902]

**Tableau comparatif complet** (✓ = inclus ; — = non inclus ; ✎ = icône « crayon » sans libellé, uniquement colonne Enterprise — signification probable « personnalisable/sur mesure », inférence ; cellule vide = rien affiché)

| Catégorie / ligne (description publiée, paraphrasée) | Free | Pro | Team | Enterprise |
|---|---|---|---|---|
| **Interfaces** | | | | |
| Vibe on web | ✓ | ✓ | ✓ | ✓ |
| Vibe CLI (agent de code terminal « powered by Devstral ») | ✓ | ✓ | ✓ | ✓ |
| Vibe for IDE (VS Code, JetBrains ; complétion, édition, chat) | ✓ | ✓ | ✓ | ✓ |
| Vibe on mobile (iOS, Android) | ✓ | ✓ | ✓ | ✓ |
| **Features and tools** | | | | |
| Messages | ✓ | Up to 6x free | Up to 6x free | ✎ |
| Voice mode | ✓ | ✓ | ✓ | ✎ |
| Skills | ✓ | ✓ | ✓ | ✓ |
| Web searches | ✓ | Up to 5x free | Up to 5x free | ✎ |
| Libraries and document upload (PDF, images, CSV, texte, Office) | Limited | Up to 15GB | Up to 30GB / user | ✎ |
| Task scheduling (prompts, agents ou workflows planifiés) | Up to 5 | Unlimited* | Unlimited* | ✎ |
| Spreadsheets | — | ✓ | ✓ | ✎ |
| Slides | — | ✓ | ✓ | ✎ |
| Workflows (automatisations multi-étapes **orchestrées depuis Mistral Studio**) | ✓ | ✓ | ✓ | ✎ |
| Connectors (beta) | ✓ | ✓ | ✓ | ✓ |
| Custom MCP connectors (beta) (tout serveur MCP distant) | ✓ | ✓ | ✓ | ✓ |
| Canvas | — | ✓ | ✓ | ✓ |
| Project folders | ✓ | Up to 1,000 | Up to 1,000 | ✎ |
| Image generation | ✓ | Up to 40x free | Up to 40x free | ✎ |
| Verified news | ✓ | ✓ | ✓ | ✎ |
| **Coding features** | | | | |
| Use Vibe in the CLI, IDE, and remotely | ✓ | ✓ | ✓ | ✓ |
| Connectors (Notion, Slack, Linear, Drive dans Vibe pendant le code) | ✓ | ✓ | ✓ | ✎ |
| Hooks (commandes shell avant/après chaque tour d'agent) | — | ✓ | ✓ | ✎ |
| Remote coding agents (sandboxes isolées, exécution parallèle) | — | ✓ | ✓ | ✎ |
| Teleport (passer une session locale à un agent distant et retour) | — | ✓ | ✓ | ✓ |
| Remote agent observability (historique, appels d'outils, diffs, logs, audit) | — | ✓ | ✓ | ✎ |
| Domain name verification | — | — | ✓ | ✓ |
| **Team and enterprise features** | | | | |
| Knowledge connectors | — | — | ✓ | ✓ |
| Custom deployments (self-hosted, cloud privé, on-prem) | — | — | — | ✓ |
| Admin API (utilisateurs, équipes, permissions) | — | — | — | ✓ |
| Data export | — | — | ✓ | ✓ |
| Audit logs | — | — | — | ✓ |
| SAML SSO | — | — | — | ✓ |
| White label (hostname dédié, logo) | — | — | — | ✓ |
| **Usage and data** | | | | |
| Extend usage with PAYG credits (au tarif API au-delà de la limite) | — | ✓ | ✓ | ✎ |
| Model training | ✓ | Opt-out | Opt-out | Opt-out |
| **Customer service** | | | | |
| Help center | ✓ | ✓ | ✓ | (vide) |
| Chat and email support | — | ✓ | ✓ | (vide) |

\* « Subject to fair usage limits and Mistral's Terms of Service ».

**FAQ de /pricing (EN, 9 questions, paraphrase)**
1. *Plan gratuit ?* Oui : accès limité à Vibe (derniers modèles, chat, recherche, création, Vibe for code dans le terminal) **et accès à Mistral Studio**.
2. *Quel modèle ?* Mistral Medium (la plupart des tâches et le code) ; OCR (document AI) ; Voxtral (audio) ; Mistral Small (projets sensibles au coût).
3. *Calcul des prix API ?* Par million de tokens, entrée et sortie séparées ; exemple « Mistral Large » 0,5 $ / 1,5 $ ; Batch −50 % ; entrée en cache jusqu'à −90 % ; OCR par 1 000 pages, speech par minute, **APIs d'outils facturées à l'appel**.
4. *Suivi d'usage et dépenses ?* Le dashboard Mistral Studio suit appels, endpoints, activité utilisateur et ventile les coûts (completion, OCR, fine-tuning).
5. *Free vs Pro ?* Free pour démarrer avec Vibe ou Studio ; Pro : limites plus hautes, accès complet au code Vibe, plus de messages/recherches, plus de « extended thinking » et rapports de deep research, support.
6. *Limites Vibe ?* Pro jusqu'à 40× plus de générations d'images que Free ; « Flash answers » **200/jour en Team vs 150/jour en Pro**.
7. *Self-hosting ?* Oui ; modèles open-weight (ex. Mistral 7B) Apache 2.0 « pour la recherche/usage individuel » ; déploiements commerciaux sous licence Mistral (cf. contradiction §8).
8. *Remise étudiants ?* Pro à 5,99 $/mois au lieu de 14,99 $.
9. *Enterprise ?* SLA personnalisés, support dédié, déploiements privés.

**Version française (/fr/pricing)** — libellés : Gratuit, Pro, Team, Entreprise ; « Commencez », « Nous contacter » ; « Je suis étudiant ». Écarts notables vs EN : carte Gratuit « Accès aux modèles SOTA de Mistral » au lieu de la génération d'images basique ; « Planification des tâches » Gratuit = **« Jusqu'à 15 Go »** (erreur ; EN « Up to 5 ») ; « Model training : Opt-out » traduit **« Se désabonner »** ; lignes Spreadsheets/Slides, prix, mentions fiscales et liste Education laissés en anglais ; FAQ : Free sans mention de Studio ; exemple de prix « Mistral Large **2 $/M en entrée, 6 $/M en sortie** », sans la remise cache ; « completion » traduit « suggestion de code ». [S: https://mistral.ai/fr/pricing]

### 6.3 Tarifs API (docs.mistral.ai/inference/pricing)

[S: https://docs.mistral.ai/inference/pricing (cible de la redirection /pricing/api) + données du catalogue embarqué dans le JavaScript de la page ; les modificateurs ci-dessous sont lus dans le code de la page]

**Mécanique d'affichage**
- Modes : **Standard** (×1), **Batch** (×0,5, libellé « −50 % » : inférence asynchrone de gros volumes), **Priority** (×1,75, « +75 % » : files prioritaires, TTFT plus prévisible).
- **Regional inference** : ×1,1 (« +10 % »), cumulable avec le mode.
- **EUR = 0,85 × USD** (conversion fixe dans le code ; arrondis jusqu'à 7 décimales).
- Colonne « Cached input » : prix explicite s'il existe, **sinon 10 % du prix d'entrée calculé par la page** (y compris pour OCR, audio et TTS).

**Tableau officiel (Standard, USD, global)**

| Famille | Modèle (ID de page) | Statut catalogue | Contexte | Entrée | Entrée cache | Sortie | Alias API (catalogue) |
|---|---|---|---|---|---|---|---|
| Flagship | Mistral Large 4 (`mistral-large-4-0`) | PublicPreview (06/10/2026) | 1M | $1.36 /M | $0.14 /M | $4.18 /M | `mistral-large-4`, `mistral-large-4-0` |
| Flagship | Mistral Large 3 (`mistral-large-3-25-12`) | GA | 256k | $0.5 | $0.05 | $1.5 | `mistral-large-2512`, `mistral-large-latest` |
| Flagship | Mistral Medium 3.5 (`mistral-medium-3-5-26-04`) | GA | 256k | $1.5 | $0.15 | $7.5 | `mistral-medium-3-5`, `mistral-medium-3`, `mistral-medium-latest` |
| Flagship | Mistral Small 4 (`mistral-small-4-0-26-03`) | GA | 256k | $0.15 | $0.015 | $0.6 | `mistral-small-2603`, `mistral-small-latest` |
| Flagship | Ministral 3 14B | GA | 256k | $0.2 | $0.02 | $0.2 | `ministral-14b-2512`, `ministral-14b-latest` |
| Flagship | Ministral 3 8B | GA | 256k | $0.15 | $0.015 | $0.15 | `ministral-8b-2512`, `ministral-8b-latest` |
| Flagship | Ministral 3 3B | GA | 256k | $0.1 | $0.01 | $0.1 | `ministral-3b-2512`, `ministral-3b-latest` |
| Specialized | OCR 4.1 | GA | — | $4 /1000 pages | $0.4 /1000 pages | — | `mistral-ocr-4-1`, `mistral-ocr-4`, `mistral-ocr-latest` |
| Specialized | Voxtral Mini Transcribe 3 | PublicPreview (20/10/2026) | 32k | $0.0035 /min | $0.00035 | — | `voxtral-mini-transcribe-3-0`, `…-3`, `…-latest` |
| Specialized | Voxtral Mini Transcribe Realtime 3 | PublicPreview | — | $0.008 /min | $0.0008 | — | `voxtral-mini-transcribe-realtime-3-0`, `…-3`, `…-latest` |
| Specialized | Voxtral Small Transcribe 3 | PublicPreview | 32k | $0.004 /min | $0.0004 | — | `voxtral-small-transcribe-3-0`, `…-3`, `…-latest` |
| Specialized | Voxtral TTS 3 | PublicPreview | — | $13 /M caractères | $1.3 | — | `voxtral-mini-tts-3-0`, `voxtral-mini-tts-latest`, variantes `…-realtime-…` |
| Specialized | Voxtral Mini Transcribe 2 | GA | — | $0.003 /min | $0.0003 | — | `voxtral-mini-2602`, `voxtral-mini-latest` |
| Specialized | Voxtral TTS | GA | — | $16 /M caractères | $1.6 | — | `voxtral-mini-tts-2603`, `voxtral-mini-tts-latest` |
| Specialized | Mistral Moderation 2 | GA | 128k | Free | Free | Free | `mistral-moderation-2603` |
| Third-party hosted | Z.ai GLM 5.3 | GA (15/09/2026) | 1M | $1.4 | $0.14 | $4.4 | `zai-glm-5-3`, `zai-glm-5`, `zai-glm-latest` |
| Code | Codestral (`codestral-25-08`) | GA | 128k | $0.3 | $0.03 | $0.9 | `codestral-2508`, `codestral-latest` |
| Code | Codestral Embed | GA | 8k | $0.15 | $0.015 | — | `codestral-embed-2505`, `codestral-embed` |

**Voice agents** (Voice Agents API, facturé à la minute de conversation) : Mistral Small 4 = **$0.04/min** ; « Larger models » = **$0.08/min**.

**Prix dérivés tels que la page les afficherait** (calcul selon les facteurs du code ; entrée / entrée cache / sortie)

| Modèle | Standard EUR | Batch USD | Priority USD | Regional USD |
|---|---|---|---|---|
| Mistral Large 4 | €1.156 / €0.119 / €3.553 | $0.68 / $0.07 / $2.09 | $2.38 / $0.245 / $7.315 | $1.496 / $0.154 / $4.598 |
| Mistral Large 3 | €0.425 / €0.0425 / €1.275 | $0.25 / $0.025 / $0.75 | $0.875 / $0.0875 / $2.625 | $0.55 / $0.055 / $1.65 |
| Mistral Medium 3.5 | €1.275 / €0.1275 / €6.375 | $0.75 / $0.075 / $3.75 | $2.625 / $0.2625 / $13.125 | $1.65 / $0.165 / $8.25 |
| Mistral Small 4 | €0.1275 / €0.01275 / €0.51 | $0.075 / $0.0075 / $0.3 | $0.2625 / $0.02625 / $1.05 | $0.165 / $0.0165 / $0.66 |
| Ministral 3 14B | €0.17 / €0.017 / €0.17 | $0.1 / $0.01 / $0.1 | $0.35 / $0.035 / $0.35 | $0.22 / $0.022 / $0.22 |
| Ministral 3 8B | €0.1275 / €0.01275 / €0.1275 | $0.075 / $0.0075 / $0.075 | $0.2625 / $0.02625 / $0.2625 | $0.165 / $0.0165 / $0.165 |
| Ministral 3 3B | €0.085 / €0.0085 / €0.085 | $0.05 / $0.005 / $0.05 | $0.175 / $0.0175 / $0.175 | $0.11 / $0.011 / $0.11 |
| Z.ai GLM 5.3 | €1.19 / €0.119 / €3.74 | $0.7 / $0.07 / $2.2 | $2.45 / $0.245 / $7.7 | $1.54 / $0.154 / $4.84 |
| Codestral | €0.255 / €0.0255 / €0.765 | $0.15 / $0.015 / $0.45 | $0.525 / $0.0525 / $1.575 | $0.33 / $0.033 / $0.99 |
| OCR 4.1 (/1000 p.) | €3.4 | $2 | $7 | $4.4 |
| Voxtral Mini Transcribe 2 (/min) | €0.00255 | $0.0015 | $0.00525 | $0.0033 |
| Voxtral TTS 3 (/M car.) | €11.05 | $6.5 | $22.75 | $14.3 |

Précisions issues des pages docs dédiées :
- **Priority Tier** : multiplicateur 1,75 sur entrée, sortie et tokens en cache ; **appliqué après la remise de cache** ; requêtes servies en Standard (repli) facturées en Standard ; nécessite un paramétrage de compte (contact commercial), limites **personnalisées par modèle** (RPM, TPM…) ; tableau comparatif : Batch (file asynchrone, traité sur **24 h**, pas de SLA), Standard (secondes à minutes, *best-effort*, pas de SLA), Priority (secondes, file prioritaire, **SLA de disponibilité 99,5 %**). [S: https://docs.mistral.ai/inference/priority-tier]
- **Regional inference** : ×1,1 sur entrée, sortie, lectures **et écritures** de cache ; régions UE et US ; ne régionalise pas le plan de contrôle (configuration, clés, facturation, analytics peuvent être traités ailleurs) ; seul l'outil *function calling* est supporté ; **Agents, Batch et Files API indisponibles** en régional ; modèles variables par région. [S: https://docs.mistral.ai/inference/regional-inference]

**Prix publiés dans le catalogue mais absents du tableau /inference/pricing** (modèles GA)

| Modèle | Prix catalogue | Remarque |
|---|---|---|
| Mistral Embed (`mistral-embed-2312`, `mistral-embed`) | $0.1 /M tokens | Aucune section « Embeddings » sur la page de prix |
| OCR 3 (`mistral-ocr-2512`) | $2 /1000 pages ; $3 /1000 pages annotées | GA, remplacement suggéré OCR 4.1 |
| OCR 4.1 — pages annotées | $5 /1000 pages annotées | Affiché « Document AI $5 / 1000 pages » sur /cloud/inference ; absent de la page de prix |
| Voxtral Mini Transcribe Realtime (26-02) | $0.006 /min | GA |
| Voxtral Small (25-07) | $0.004 /min audio ; $0.1 / $0.4 par M tokens | GA |
| Shieldstral 1.0 (Labs), Timestral 1.0 (5M/28M/123M/209M) | aucun prix | PublicPreview |

**Modèles dépréciés (statut « Deprecated » au 21/10/2026) avec prix et calendrier** — 24 entrées ; 24 autres sont « Retired ». [S: catalogue JS de docs.mistral.ai]

| Modèle | Prix (entrée / sortie) | Dépréciation | Retrait | Remplaçant |
|---|---|---|---|---|
| Z.ai GLM 5.2 | $1.4 / $0.14 cache / $4.4 | 2026-09-29 | **2026-10-31** | Z.ai GLM 5.3 |
| Leanstral 1.5 (Labs) | gratuit | 2026-09-29 | 2026-09-30 | — |
| OCR 4.0 | $4 /1000 p. ; $5 annotées | 2026-09-29 | 2026-09-30 | OCR 4.1 |
| Mistral Medium 3.1 | $0.4 / $2 | 2026-05-22 | 2026-08-31 | Mistral Medium 3.5 |
| Mistral Medium 3 | $0.4 / $2 | 2026-05-22 | 2026-08-31 | Mistral Medium 3.5 |
| Magistral Medium 1.2 | $2 / $5 | 2026-05-22 | 2026-07-31 | Mistral Medium 3.5 |
| Devstral 2 | $0.4 / $2 | 2026-05-22 | 2026-07-31 | Mistral Medium 3.5 |
| Mistral Nemo 12B | $0.15 / $0.15 | 2026-05-22 | 2026-07-31 | Ministral 3 8B |
| Mistral Small 3.2 | $0.1 / $0.3 | 2026-04-30 | 2026-07-31 | Mistral Small 4 |
| Magistral Small 1.2 | $0.5 / $1.5 | « April 30, 2026 » | « July 31, 2026 » | Mistral Small 4 |
| Mistral Moderation (24-11) | $0.1 | 2026-03-31 | 2026-06-30 | Mistral Moderation 2 |
| Mistral Small Creative (Labs) | $0.1 / $0.3 | 2026-03-31 | 2026-04-30 | Ministral 3 8B |
| Mistral Large 2.1 | $2 / $6 | 2026-02-27 | 2026-05-31 | Mistral Medium 3.5 |
| Pixtral Large | $2 / $6 | 2026-02-27 | 2026-05-31 | Mistral Medium 3.5 |
| Devstral Medium 1.0 | $0.4 / $2 | 2026-02-27 | 2026-05-31 | Mistral Medium 3.5 |
| Devstral Small 1.1 | $0.1 / $0.3 | 2026-02-27 | 2026-05-31 | Mistral Small 4 |
| Devstral Small 2 (Labs) | $0.1 / $0.3 | 2026-02-27 | 2026-03-31 | Mistral Medium 3.5 |
| Voxtral Mini (25-07) | $0.001 /min ; $0.04 / $0.04 par M tokens | 2026-02-27 | 2026-05-31 | Voxtral Mini Transcribe 2 |
| Voxtral Mini Transcribe (25-07) | $0.002 /min | 2026-02-27 | 2026-05-31 | Voxtral Mini Transcribe 2 |
| OCR 2 | $1 /1000 p. ; $3 annotées | 2026-02-27 | 2026-05-31 | OCR 4.1 |
| OCR (25-03) | — | 2025-12-02 | 2025-12-31 | OCR 4.1 |
| Ministral 3B (24-10) | $0.04 / $0.04 | 2025-12-02 | 2025-12-31 | Ministral 3 3B |
| Ministral 8B (24-10) | $0.1 / $0.1 | 2025-12-02 | 2025-12-31 | Ministral 3 8B |
| Pixtral 12B | $0.15 / $0.15 | 2025-12-02 | 2025-12-31 | Ministral 3 14B |

Licences des modèles open : Apache 2.0 pour la plupart ; certains sous **MIT modifiée** : mêmes droits, sauf pour les entreprises dont le **chiffre d'affaires mensuel dépasse 20 M$**, qui doivent obtenir une licence commerciale **ou utiliser les modèles via Mistral Studio**. [S: https://help.mistral.ai/en/articles/347393]

### 6.4 Enterprise : SLA, crédits de service, support

[S: https://legal.mistral.ai/terms/enterprise-service-level-and-support-schedule/ — l'URL mistral.ai/terms/… redirige vers legal.mistral.ai ; versions PDF archivées datées 06/02/2026, 03/03/2026, 05/06/2026 et 23/07/2026]

**Champ** : clients enterprise, pendant la durée du contrat, **uniquement pour la part du produit déployée sur l'infrastructure de Mistral AI**.

**Objectif de niveau de service (SLO) — Monthly Uptime Percentage**

| Produit couvert | Basic | Standard | Premium |
|---|---|---|---|
| **AI Studio** | ≥ 99,5 % | 99,9 % | 99,9 % |
| **Vibe** | ≥ 99,5 % | 99,9 % | 99,9 % |

- Calcul : (minutes du mois − minutes d'indisponibilité côté serveur) / minutes du mois ; **seules les indisponibilités de 5 minutes ou plus comptent**. Rapport consultable en permanence sur status.mistral.ai.

**Crédits de service** (en % des « Monthly Fees » = 1/12 des frais annuels, ou frais du mois concerné si paiement mensuel)

| Niveau | Disponibilité mensuelle | Crédit |
|---|---|---|
| Basic | 99,4 % à 95 % | 2 % |
| Basic | < 95 % | 5 % |
| Standard | 99,8 % à 99,5 % | 2 % |
| Standard | 99,4 % à 95 % | 5 % |
| Standard | < 95 % | 10 % |
| Premium | 99,8 % à 99,5 % | 5 % |
| Premium | 99,4 % à 95 % | 10 % |
| Premium | < 95 % | 20 % |

- Demande à **support-ent@mistral.ai** sous **30 jours** après la fin du mois (date/heure de l'échec + infos demandées), sinon droit perdu. Crédit = avoir monétaire sur l'usage futur, appliqué sous **60 jours** ; à défaut de facture future, remboursement sous **90 jours** après la fin du mois. **Plafond : 25 %** du montant dû pour le produit concerné ce mois-là. Les crédits sont le **recours unique et exclusif**.

**Support** — les demandes passent par le **chatbot en bas à droite du Help Center** ; priorité indiquée par le client mais fixée in fine par Mistral (déclassement possible en cas d'abus de P1) ; informations minimales : contexte, environnement, priorité, symptômes, étapes de reproduction, logs/captures (anonymisés par le client) ; à défaut, délais suspendus.

| Niveau | Priorité | Couverture | 1re réponse | Résolution (correctif ou contournement) |
|---|---|---|---|---|
| Basic | P1 | 24/7 | 12 h | 48 h (autres priorités : « efforts commercialement raisonnables ») |
| Standard | P1 | 24/7 | 4 h | 24 h |
| Standard | P2 | 24/7 | 8 h | 48 h |
| Standard | P3–P4 | 24/7 | 12 h | 7 jours |
| Premium | P1 | 24/7 | 2 h | 12 h |
| Premium | P2 | 24/7 | 6 h | 24 h |
| Premium | P3 | 24/7 | 8 h | 72 h |
| Premium | P4 | 24/7 | 12 h | 6 jours |

Priorités : **P1** produit inutilisable en production ; **P2** problème majeur, impact significatif en production ou sur plusieurs utilisateurs finaux ; **P3** problème mineur, impact minimal ; **P4** feedback ou demande générale.

**Exclusions** : fonctionnalités/produits **alpha ou bêta** ; produits fournis par des tiers ; causes hors contrôle raisonnable ; logiciels/matériels/infrastructures du client ou de tiers ; violation du contrat ; modifications par un tiers ; maintenance planifiée annoncée (SLO) ; inexactitudes des sorties (support).

**Mises à jour** : modifiable à tout moment ; en cas d'impact négatif matériel, objection possible sous 30 jours → maintien de l'ancienne version jusqu'à la fin du terme de l'Order Form ou 12 mois après la notification (le plus tôt des deux).

### 6.5 Données, confidentialité, conformité, hébergement

| Sujet | Fait publié | Source |
|---|---|---|
| Localisation | Données hébergées **dans l'UE par défaut** ; aux **États-Unis** si l'on utilise explicitement l'endpoint US ; transferts temporaires possibles hors UE selon la fonctionnalité, vers les lieux listés dans l'onglet *Subprocessors* (CCT de la Commission, art. 46 RGPD, revue de sécurité, parfois ZDR/chiffrement chez le sous-traitant) ; les clients Enterprise peuvent désactiver certaines fonctions impliquant des transferts | help 347629 |
| Réplication | Sauvegardes chiffrées, réplication sur **plusieurs zones UE** | help 347624 |
| Chiffrement | **AES-256** au repos, **TLS 1.2+** en transit | help 347626 |
| ZDR | Uniquement **pay-as-you-go** et endpoints *stateless* (liste §5.1) ; **pas** pour agents, conversations, libraries, fichiers batch, `/v1/files`, Vibe Work/Chat ; demande via le Help Center/support avec **justification légitime**, acceptation discrétionnaire ; une fois approuvé, visible dans *Privacy settings* de l'Admin panel ; refus notifié par e-mail ; Vibe CLI suit les règles ZDR des endpoints appelés | help 347612 |
| Entraînement — Studio | **Free mode** : données utilisables pour l'entraînement (opt-out possible) ; **Pay-as-you-go** : le client garde le contrôle, opt-out à tout moment ; toggle « Anonymous improvement data » ; **toggles Vibe et API indépendants** | help 347617, 455207 |
| Entraînement — API (page Inference) | « Les données envoyées via l'API ne servent pas à l'entraînement » (affirmation générale, cf. §8) | /cloud/inference FAQ |
| Entraînement — Vibe | Vibe : utilisation pour l'entraînement activée par défaut (opt-out possible) ; Team : l'admin peut désactiver pour l'organisation ; Enterprise : **opt-out par défaut** ; feedback 👍/👎 toujours utilisable (désidentifié) | help 347617, 455207, 347625 |
| Propriété | L'utilisateur possède entrées et sorties (Vibe et API) ; Mistral ne revendique pas de droit d'auteur sur les sorties | help 347630 |
| Rétention légale | Identité civile : 5 ans après la fin du contrat ; autres données d'inscription : 1 an après suppression du compte ; données techniques : 1 an glissant ; factures : 10 ans | help 347628 |
| Suppression de compte | Définitive ; paiement préalable des sommes dues | help 347619 |
| Âge | 13 ans minimum, accord parental pour les mineurs | help 347631 |
| Certifications | **ISO/IEC 27001:2022**, **ISO/IEC 27701:2019**, **SOC 2 Type II** (lettre d'attestation consultable ; rapport complet **réservé aux clients Enterprise**, sur demande) ; *Statement of Applicability* téléchargeable | https://trust.mistral.ai/resources ; help 347638 |
| Autres documents | Code of Conduct (fournisseurs) ; certificat d'assurance cyber (sur demande) ; **HIPAA : BAA proposé pour les services éligibles** ; rapport de pentest 2026 (sur demande) ; rapport d'incident MAI-2026-002 | https://trust.mistral.ai/resources |
| Contrôles (Vanta) | 5 familles : Infrastructure security (4 contrôles), Organizational security (8), Product security (3), Internal security procedures (26), Data and privacy (3) — ex. auth unique, accès distant chiffré, tests d'intrusion, PCA/PRA testés, assurance cyber, rétention, suppression des données client au départ | https://trust.mistral.ai/ |
| DPA | Data Processing Addendum en ligne (legal.mistral.ai/terms/data-processing-addendum) ; **pas de signature hors ligne** | help 347641, 347612 |
| CGU | Préavis d'au moins **30 jours** pour les changements substantiels | help 347642 |
| Contact sécurité | security@mistral.ai ; abonnement aux mises à jour (cloche) | trust.mistral.ai |
| Incidents publiés | Mini Shai-Hulud (attaque supply chain du 12/05/2026 sur un système de gestion de code ; dépôts non critiques seulement) ; Vibe 2.25.4 (12/09/2026) corrigeant 6 CVE de permissions shell (CVE-2026-87983 à -87988) | trust.mistral.ai (Updates) |

**Sous-traitants (25, au 21/10/2026)** [S: https://trust.mistral.ai/subprocessors]

| Sous-traitant | Fonction | Localisation | Produits |
|---|---|---|---|
| Microsoft Inc. | Cloud infrastructure | Suède, Norvège | Vibe, Studio / API |
| Google LLC | Cloud infrastructure | Pays-Bas, Belgique, États-Unis (endpoint US) | Vibe, Studio/API (US API) |
| Mistral Compute | Cloud infrastructure | France | Tous |
| CoreWeave Inc. | Inference provider | EEE | Tous les SaaS |
| Ory Corp. | Authentification | Belgique, Allemagne | Tous |
| Get Lago Corp. | Facturation | Irlande | Produits payants |
| Stripe Inc. | Paiement et facturation | États-Unis | Produits payants |
| Blackforest Labs Inc. | Génération d'images | États-Unis | Vibe, Studio/API |
| Brave Software, Inc. | Recherche web | États-Unis | Vibe, Studio/API |
| Foundrylabs, Inc. (E2B.dev) | Code interpreter | France, Belgique, Pays-Bas | Vibe, Studio/API |
| Plus Five Five, Inc. (Resend) | E-mails | Irlande | Tous |
| Twilio Inc. | Vérification de numéro | États-Unis | Tous |
| Intercom Inc. | Support utilisateur | Irlande | Tous |
| Scaleway SAS | Cloud | France | Vibe Code Web |
| Megaport Inc. (Latitude.sh) | Cloud | Monde | Vibe Code Web |
| OVH Cloud SAS | Cloud | Allemagne, US | Vibe Code Web |
| Backblaze Inc. | Cloud | Pays-Bas | Vibe Code Web |
| The Constant Company (Vultr) | Cloud | Monde | Vibe Code Web |
| Kong Inc. | Sécurité (API) | EEE | Tous |
| Functional Software (Sentry) | Gestion d'erreurs | EEE | Tous |
| Mistral AI Affiliates | — | — | Tous |
| Cloudflare Inc. | Sécurité & routage (CDN) | Monde (« local to customer ») | Tous |
| CrowdStrike Inc. | Sécurité | EEE, États-Unis | Tous |
| Wiz Inc. | Sécurité | EEE | Tous |
| Gradual Inc. | Mistral Partner Academy | US | — |

### 6.6 Disponibilité observée (status.mistral.ai) et indices d'architecture

[S: https://status.mistral.ai/ (Rootly) ; https://status.mistral.ai/history?date=2026-10-22]

**Disponibilité sur 90 jours (24/07/2026 → 21-22/10/2026), composants chargés sur la page d'accueil**

| Composant | Uptime 90 j |
|---|---|
| Completion API | 99,65 % |
| Embedding API | **94,34 %** |
| OCR API | 99,35 % |
| Agents API | 99,91 % |
| Conversations API | 99,73 % |
| Fine-Tuning API | 100,00 % |
| Audio API | 99,96 % |
| Integrations API | 99,95 % |
| Files API | 99,96 % |
| Batch API | 100,00 % |

Composants supplémentaires visibles dans l'historique (non chargés sur l'accueil : « Couldn't load more components ») : **Workflows API, Skills API, Prompts API, Console, Vibe**. Statut global au moment de la consultation : « All Systems Operational ». Abonnement aux alertes par e-mail ou SMS.

Incidents récents notables (août–octobre 2026) : dégradations par modèle sur la Completion API (`glm-5-2` à répétition, `ministral-8b-2512`, `mistral-medium-3-5-external`, `mistral-vibe-cli-fast`, `mistral-vibe-cli-with-tools`…) ; « US Endpoint Service Degradation » (27/08, 1 h 55, Completion + OCR) ; « Total Unavailability on ML4 GLM5.2 and GLM5.3 » (12/10, ~13 min, Large 4 + GLM) ; OCR 4/4.1 (04/09 7 h 48 ; 21/09 2 h 43) ; Console (« Elevated error rate », 28/08 ; « Console Degraded », 14/08) ; permission check « following spice db upgrade » (28/08, Console + Vibe) ; Skills « in Le Chat and AI Studio » (22/09) ; Workflows API (13/10) ; sandboxes Vibe Code Web (multiples).

**Indices d'architecture (inférence)** : séparation des services par API (completion, embeddings, OCR, audio, agents, conversations, files, batch, fine-tuning, intégrations/connecteurs, workflows, et un « AI Registry » scindé en Skills et Prompts) ; la Console est un composant distinct ; les noms d'incidents révèlent un routage par alias de modèle (y compris des alias internes réservés à Vibe : `mistral-vibe-cli-fast`, `mistral-vibe-cli-with-tools`, `mistral-medium-3-5-external`) ; un endpoint US séparé ; un service d'autorisation de type SpiceDB (« spice db upgrade ») ; des déploiements « decode pods » (inférence désagrégée prefill/decode, inférence). Pile web observée : site Astro + CMS (« cms-media/api ») ; docs Next.js ; centre d'aide Intercom ; Trust Center Vanta ; statut Rootly ; consentement Axeptio ; CDN Cloudflare.

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Identifiants et alias de modèles** (catalogue docs)
- `mistral-large-latest` pointe vers **Mistral Large 3** (`mistral-large-2512`), pas vers Large 4 (PublicPreview, alias `mistral-large-4` / `mistral-large-4-0`). L'exemple de prix « Mistral Large 0,5 $ / 1,5 $ » des FAQ correspond donc à Large 3 ; l'extrait de code de /cloud/inference utilise `mistral-large-latest`.
- L'alias `mistral-medium-3` désigne **Mistral Medium 3.5**, alors qu'un modèle « Mistral Medium 3 » distinct existe (déprécié, retrait 31/08/2026).
- `voxtral-mini-tts-latest` figure dans les alias de **deux** modèles (Voxtral TTS 26-03 et Voxtral TTS 3).
- L'exemple « Generate speech » de /cloud/inference appelle `audio.speech.complete` avec `voxtral-mini-latest`, alias catalogué pour **Voxtral Mini Transcribe 2** (transcription).
- `mistral-ocr-4` est un alias d'**OCR 4.1** (OCR 4.0 déprécié, retiré le 30/09/2026).
- Plusieurs modèles dont la date de retrait est passée restent au statut « Deprecated » (ex. Medium 3.1, Small 3.2, Devstral 2) ; formats de date hétérogènes (« April 30, 2026 » vs ISO).
- Modèles tiers : cycle de dépréciation plus court annoncé ; GLM 5.2 (sorti 06/08/2026) déprécié le 29/09 et retiré le **31/10/2026**, six semaines après la sortie de GLM 5.3.

**Affichage des prix**
- La colonne « Cached input » de la page de prix est **calculée à 10 % de l'entrée** quand aucun prix de cache n'est défini, y compris pour OCR (« $0.4 /1000 pages »), transcription et TTS — rien n'indique qu'un cache existe réellement pour ces modalités.
- Le prix **OCR 4.1 « Annotated Pages » 5 $/1 000** existe dans le catalogue (et apparaît comme « Document AI $5 » sur /cloud/inference) mais pas sur la page de prix.
- Les bascules Batch/Priority s'appliquent visuellement à tous les modèles, y compris temps réel ou TTS, sans indication d'éligibilité.
- Devises : plans Vibe **même nombre** en USD et EUR (14.99, 24.99) ; API **EUR = 0,85 × USD**.
- Priority : 1,75× appliqué **après** la remise de cache. Regional : 1,1× aussi sur les **écritures** de cache.

**Studio / API**
- Rate limits : par organisation (tous workspaces), **par modèle** ; les crédits prépayés **n'augmentent pas** le tier ; seuls les montants facturés comptent.
- Clé de forfait Vibe (créée dans *Code › Vibe Code CLI*) ≠ clé API pay-as-you-go : la première peut cesser de fonctionner (401) quand le budget Vibe est atteint.
- ZDR : nécessite d'abord le pay-as-you-go ; ne couvre ni agents, ni conversations, ni libraries, ni batch, ni Files API ; regional inference et ZDR sont deux contrôles distincts.
- Regional : `function calling` seul outil supporté ; **Agents, Batch, Files indisponibles** ; le plan de contrôle reste global.
- Priority : `service_tier` absent ⇒ `standard_only` ; au-delà des limites Priority, repli silencieux en Standard (vérifier `usage.service_tier`).
- Opt-out entraînement : toggles **séparés** pour Vibe et Studio/API.

**Plans Vibe**
- Team : **2 utilisateurs minimum** (compteur 2–100 sur la page).
- Education : e-mail institutionnel obligatoire (aucune carte étudiante acceptée) ; 12 mois max ; réservé à qui n'a jamais utilisé Vibe/Le Chat ; vaut aussi pour les **enseignants** (centre d'aide) alors que la page parle d'étudiants.
- Remise annuelle −20 % et règles de remboursement (14 jours, achat initial seulement) absentes de /pricing.
- Gestion mobile possible uniquement pour Pro acheté en app ; Team+ se gère sur le web.

**SLA**
- Ne couvre que ce qui tourne sur l'infrastructure Mistral ; seules les coupures ≥ 5 min comptent ; maintenance planifiée annoncée exclue ; **alpha/bêta exclus** — ce qui pourrait exclure les fonctions en *public preview* (Workflows, Priority Tier, Large 4) (inférence, le SLA ne définit pas « public preview »).
- Basic : SLO ≥ 99,5 % mais crédits seulement **à partir de 99,4 %** → une disponibilité entre 99,4 % et 99,5 % ne donne droit à rien (inférence arithmétique).
- Crédits plafonnés à 25 % et recours exclusif.

**Liens et contenus défectueux (constat)**
- /cloud/inference : bouton « Explore Studio » → `https://mistral.ai/http://console.mistral.ai/` (404).
- /products/vibe/code et /solutions/speech : lien « Mistral Compute » → `/products/mistral-compute` → redirection vers `/products/ai-cloud/` (404) ; même chose pour `/products/compute/` (URL utilisée par le Trust Center).
- /solutions/ : liens « Learn more » vers `/industry/finance-old/`, `/industry/manufacturing-old/`, etc. (404).
- Pied de page : « Privacy choices » → `/javascript:openAxeptioCookies()/`.
- Page Studio : second H1 affiche `frontier<br> models` ; 4 cartes ressources sans lien.
- Pages docs : images OG pointant vers `http://localhost:3000/api/og…`.
- Copie Vibe : « Vibe CLI… powered by Devstral » et pile « Mistral medium 3 / Devstral 2 » alors que Devstral 2 et Medium 3 sont dépréciés (retraits 31/07 et 31/08/2026).

**Historique des noms** : La Plateforme (2023) → Mistral AI Studio (2025) → Mistral Studio ; Le Chat → Vibe (Work / Code / Chat). Les routes `admin.mistral.ai/plateforme/...`, le libellé SLA « AI Studio » et un incident de statut (« Le Chat and AI Studio », 22/09/2026) portent encore les anciens noms. Le centre d'aide n'a **plus de collection Studio** : la documentation produit (API, modèles, fine-tuning, batch) a migré vers `docs.mistral.ai/studio-api/overview` ; le Help Center ne garde que compte, facturation, données/conformité et contact support. [S: help 682992]

**Sous-traitants** : « Merge » (ajouté le 07/05/2025 pour les connecteurs de Le Chat, transferts US) n'apparaît plus dans la liste actuelle des 25 sous-traitants.

## 8. Questions ouvertes / incohérences relevées

1. **Où est la grille tarifaire de Studio ?** Aucune page visible ne nomme « Scale plan » (seulement le JSON-LD) ; le centre d'aide parle de « Pay-as-you-go ». Les limites chiffrées par tier (RPS, TPM, tokens/mois) ne sont publiées nulle part en accès libre (page *Limits* derrière connexion).
2. **Prix non publiés** : la FAQ annonce des « tool APIs priced per call », mais aucune grille n'existe pour web search, code interpreter, génération d'images, connecteurs, ni pour fine-tuning, stockage Libraries, Agents/Conversations, Workflows, Observability/Judges. Embeddings génériques (Mistral Embed 0,1 $/M) absents de la page de prix.
3. **SLA Priority Tier** : 99,5 % (docs Priority Tier) vs « 99.9% uptime SLA » (/cloud) ; le SLA Enterprise donne 99,9 % pour AI Studio en Standard/Premium.
4. **Entraînement sur les données API** : /cloud/inference affirme que les données API ne servent pas à l'entraînement, alors que le centre d'aide indique qu'en **Free mode** elles peuvent y servir (opt-out possible).
5. **Licences** : la FAQ /pricing limite Apache 2.0 à la « recherche/usage individuel » et exige une licence Mistral pour le commercial, ce qui contredit le centre d'aide (Apache 2.0 = tout usage ; MIT modifiée avec seuil de 20 M$ de CA mensuel) et la FAQ /cloud/inference.
6. **Exemple de prix** : EN « Mistral Large 0,5 $ / 1,5 $ » vs FR « 2 $ / 6 $ » (tarif de Mistral Large 2.1, déprécié).
7. **Ligne « Model training »** : Enterprise « Opt-out » dans le tableau vs « opt-out par défaut » dans le centre d'aide ; Free « ✓ » signifie probablement « données utilisées » (inférence).
8. **Crédits API inclus dans Pro** : 25,5 $/mois (standard) vs 15 $/mois (Education) — l'attribution repose sur le CSS ; le lien entre ces crédits et l'organisation Studio n'est pas expliqué publiquement.
9. **Bugs de traduction FR** : « Planification des tâches : Jusqu'à 15 Go » ; « Opt-out » → « Se désabonner » ; « Govern » → « Gérer » ; « Datasets » → « ensembles » / « jeux » de données ; parties laissées en anglais.
10. **Statut page** : uptime non affiché pour Workflows, Skills, Prompts, Console, Vibe (chargement échoué) ; Embedding API à 94,34 % sur 90 jours sans incident majeur correspondant visible dans l'historique consulté.
11. **Vocabulaire Observability** : la page Studio parle de « context graphs », Experiments, Campaigns, Judges, Datasets ; le billet de lancement citait Explorer, Judge Playground, Iterations, Dashboards. Le JSON-LD cite « Explorer, Judges, Datasets, and Campaigns ». Correspondance exacte avec l'interface à confirmer dans les chapitres UI.
12. **Couverture « Public preview » par le SLA** non précisée (cf. §7).
13. **Régions** : /cloud/inference « EU ou, pour les modèles supportés, US » ; docs : trois endpoints (global, EU, US) ; « global » sans engagement de localisation, alors que le centre d'aide dit « hébergé dans l'UE par défaut » et que /our-method qualifie l'API serverless d'« hosted in the EU » (inférence : stockage UE vs inférence globale à distinguer).
14. **Version du SLA** : la page HTML ne porte pas de date visible ; les métadonnées listent des PDF datés jusqu'au 23/07/2026 (correspondance HTML/PDF non vérifiée).

## Annexe — Couverture

Toutes consultées le 21/10/2026.

**mistral.ai**
- ✅ https://mistral.ai/products/studio — lue en entier (Firecrawl, copie en cache du 20/10/2026, puis HTML brut du 21/10/2026, JSON-LD inclus)
- ✅ https://mistral.ai/fr/products/studio — lue en entier
- ⚠️ https://mistral.ai/it/products/studio — JSON-LD seulement (version italienne hors besoin)
- ✅ https://mistral.ai/pricing — lue en entier (Markdown + HTML brut : cartes, tableau avec icônes, FAQ, TVA, calculateur Team, JSON-LD)
- ✅ https://mistral.ai/fr/pricing — lue en entier
- ✅ https://mistral.ai/pricing/api/ — redirige vers https://docs.mistral.ai/inference/pricing (lue en entier + JS de la page et catalogue de modèles)
- ✅ https://mistral.ai/pricing/enterprise-deployments/ — lue (formulaire non rempli)
- ✅ https://mistral.ai/sitemap-0.xml (558 URL), https://mistral.ai/sitemap-index.xml, https://mistral.ai/robots.txt
- ✅ https://mistral.ai/ ; https://mistral.ai/products/ ; https://mistral.ai/products/vibe/ ; https://mistral.ai/products/vibe/code/ ; https://mistral.ai/products/forge/
- ⚠️ https://mistral.ai/products/ai-cloud — **404** ; contenu équivalent lu sur ✅ https://mistral.ai/cloud/ , ✅ https://mistral.ai/cloud/inference/ , ✅ https://mistral.ai/cloud/compute/
- ⚠️ https://mistral.ai/ai-transformation — **404** ; contenu équivalent lu sur ✅ https://mistral.ai/our-method/ (et ✅ https://mistral.ai/sovereign-ai/)
- ✅ https://mistral.ai/solutions/ ; https://mistral.ai/solutions/coding/ ; https://mistral.ai/solutions/custom-model-training/ ; https://mistral.ai/solutions/speech/
- ✅ https://mistral.ai/solutions/document-ai/ — sections marketing lues en entier ; ⚠️ le long contenu de démonstration OCR (contrats, tableaux) seulement survolé
- ✅ Billets liés à Studio : https://mistral.ai/news/ai-studio ; https://mistral.ai/news/manage-prompts-and-skills-in-studio ; https://mistral.ai/news/workflows (⚠️ lu jusqu'à « Get started ») ; https://mistral.ai/news/regional-inference-open-models-new-compute ; https://mistral.ai/news/la-plateforme
- ⚠️ Autres billets repérés dans le sitemap mais non lus (fonctionnels, hors offre/tarifs) : agents-api, connectors, more-control-over-connectors, batch-api, agentic-search, search-toolkit, shieldstral, memory, le-chat-enterprise, mistral-large-4, voxtral-3, ocr-4… ; pages /customers/*, /industry/*, /use-cases/* non lues (non spécifiques à Studio)

**docs.mistral.ai**
- ✅ https://docs.mistral.ai/inference/pricing
- ✅ https://docs.mistral.ai/inference/priority-tier (⚠️ réponses de la FAQ repliées : seules les questions sont visibles)
- ✅ https://docs.mistral.ai/inference/regional-inference

**legal.mistral.ai**
- ✅ https://legal.mistral.ai/terms/enterprise-service-level-and-support-schedule/ (cible de https://mistral.ai/terms/enterprise-service-level-and-support-schedule) — lue en entier, tableaux inclus

**help.mistral.ai** (Intercom ; 4 collections, 43 articles ; aucune collection Studio)
- ✅ Accueil https://help.mistral.ai/en/ et collections 789619 (Help and Troubleshooting, 8), 789629 (Vibe, 2), 789666 (Trust, Security, Compliance) → 789667 (Data Governance, 18), 789669 (Ethical and Safe Use, 4), 789670 (Regulatory Compliance and Certification, 8), 789601 (About our Models, 3)
- ✅ Lus en entier (articles 347458, 448331, 455205, 568728, 698530, 698531, 347612, 347391, 347629, 347628, 455207, 347617, 455796, 347630, 347638, 347641, 455208, 347624, 347626, 347640, 682992, 347642, 347619, 347393, 661571, 347623, 347631, 347390, 704907, 347625, 347615, 347639) — URL de forme https://help.mistral.ai/en/articles/<id>
- ⚠️ Survolés (recherche des mentions Studio/API/Admin) : 347621, 396497, 347613, 347632, 392903, 392902, 567956, 347635, 347637, 347633, 347616
- ✅ Versions FR partielles : https://help.mistral.ai/fr/articles/698531 , https://help.mistral.ai/fr/articles/347612 (terminologie)

**trust.mistral.ai** (Vanta)
- ✅ https://trust.mistral.ai/ (Overview : conformité, ressources, résumé des contrôles, sous-traitants, 4 dernières mises à jour)
- ✅ https://trust.mistral.ai/subprocessors (25 entrées)
- ✅ https://trust.mistral.ai/resources
- ⚠️ https://trust.mistral.ai/controls et /updates — non ouverts séparément (résumés via l'Overview)

**status.mistral.ai** (Rootly)
- ⚠️ https://status.mistral.ai/ — 10 composants sur ~15 chargés (« Couldn't load more components »)
- ✅ https://status.mistral.ai/history?date=2026-10-22 — historique août–octobre 2026
