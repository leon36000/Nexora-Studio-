---
name: nexora-organisation-gitlab
description: Règle d'organisation du fondateur (28/10/2026) — GitLab (pc4) est la seule source de Nexora WorkStudio et Nexora Web ; plus de fichiers Nexora éparpillés sur pc6/pc1 ; une seule compilation de test
metadata:
  type: feedback
---

Le fondateur veut mettre fin au chaos de fichiers éparpillés sur pc1 et pc6 : **tout ce que nous avons fait ensemble (Nexora WorkStudio et Nexora Web) vit sur GitLab (pc4, disque de 8 To), classé et à jour**, sans doublons, et on doit pouvoir continuer à travailler sans fichier Nexora sur pc6. **Hors périmètre** : `nexora-code` et les autres chantiers (DSPy, Godel, LLMLingua, corpus, NAOS…) menés avec d'autres agents.

État au 28/10/2026 (soir) : dépôts `root/nexora-workstudio` (5) et `root/nexora-web` (6) à jour sur GitLab ; images x86 de WorkStudio dans le registre du projet 5 (paquet `nexora-images`) ; guides `docs/restauration.md` dans les deux dépôts ; copie de la mémoire dans `docs/memoire-claude/` du dépôt WorkStudio. Lieu de travail : `~/Bureau/Nexora-Travail/` sur pc1 (clones seulement, jeton GitLab dans `~/.config/nexora/`), accès par `ssh pc1`. pc6 : pile WorkStudio supprimée (25 conteneurs, 15 volumes, images) ; le dossier `~/Desktop/Nexora Studio` est supprimé par un script différé qui vérifie d'abord que GitLab a tout.

**Piège** : pc6 s'appelle `gx10-e526` : la démo publique du site (service `nexorasite-demo`, Funnel :10000), son worker, la pile `nexorasite-*` et le panneau Directus (:8446) tournent SUR pc6 depuis `~/Desktop/NexoraSite` et `~/Desktop/NexoraSite-demo`. Les supprimer coupe la démo : à reloger d'abord sur pc1 (décision du fondateur en attente). L'ancien service `nexora-web.service` (ancien site) redémarre en boucle, à retirer avec l'accord du fondateur.

**À faire ensuite** : une seule compilation de WorkStudio (étiquette `courant`) et suppression des anciennes images sur pc1 (`avant-securite`, doublons) ; nettoyage de `~/Bureau/NexoraAI` sur pc1 (miroirs `depots/`, `images/`, `archives/`, clone `NexoraStudio` devenus doublons de GitLab) avec liste montrée avant ; dépôt `INDEX` (carte de ce qui est où) ; question ouverte : sauvegarde de pc4 (point faible = un seul disque). Voir [[github-workflow]] et [[pc1-nexoraai]].
