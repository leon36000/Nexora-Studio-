---
name: nexora-webpilot-privacy-router
description: Décision produit du fondateur (28/10/2026) — Nexora WebPilot (Firecrawl + Browser Use) et Nexora Privacy Router, deux produits indépendants mais intégrés
metadata:
  type: project
---

Architecture voulue par le fondateur : **Nexora WebPilot** = produit commercial combinant un équivalent de Firecrawl (recherche, extraction, exploration du Web) et de Browser Use (navigation, interactions, automatisation de sites), pour les agents IA des clients. **Nexora Privacy Router** = couche de sécurité indépendante, commune à tous les logiciels (WebPilot, WorkStudio, OPSYS-AI, autres), **incluse par défaut, jamais payante** : elle contrôle les données qui sortent, empêche les transmissions non autorisées vers les fournisseurs d'IA, applique la politique de confidentialité de chaque client ; pour la souveraineté stricte, aucun contenu confidentiel ne quitte l'environnement autorisé.

Un client peut acheter WebPilot seul ou (si la couche commune reste incluse) l'avoir avec Privacy Router actif ; quand les deux sont actifs, Privacy Router contrôle les envois de WebPilot vers les sites et les API externes. Pas de fusion : deux produits, sans technologie dupliquée.

**Why:** la confidentialité est une propriété fondamentale de Nexora, pas une option. **How to apply:** concevoir (brainstorming → spécification) avant de coder ; le point d'accroche naturel existe déjà : la passerelle du site (`/v1`) voit tout ce qui part vers les fournisseurs d'IA, et WorkStudio a déjà un service `nexora-pii`. Pas encore conçu ni commencé au 28/10/2026. Voir aussi [[nexora-passerelle-openrouter]].
