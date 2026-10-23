# J9 « Gouvernance dans l'interface » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** gouverner l'instance depuis l'interface : groupes d'accès, SSO, e-mail, domaines autorisés.

**Architecture:** interface Nexora (clean-room) sur le moteur et l'API existants des groupes de permissions ; réglages d'instance chiffrés en base (SSO, SMTP, domaines), le `.env` restant prioritaire ; SMTP lu à chaud ; SSO appliqué par un redémarrage propre de WorkStudio.

**Tech Stack:** Next.js 16, Better Auth (generic OAuth), Drizzle, chiffrement existant (`encryptSecret`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8decies (prime).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim (les écrans `ee/` sont des remplacements clean-room annotés).
- Secrets chiffrés en base, jamais renvoyés au navigateur (affichés « ••• défini »).
- Le `.env` prime toujours ; l'écran le dit quand c'est le cas.
- Admins d'instance seulement ; chaque changement entre au journal d'audit.

## Review Focus

- SSO mal configuré puis « Appliquer » : la connexion par mot de passe des propriétaires reste possible (secours).
- Redémarrage demandé pendant une exécution : les exécutions en cours se terminent ou reprennent (comportement du moteur), message clair.
- SMTP faux : « Envoyer un e-mail de test » donne l'erreur en français, rien n'est enregistré comme valide.
- Groupe « Lecture seule » : refus côté serveur (pas seulement masqué).
- Domaines autorisés : une adresse hors domaine sans invitation est refusée à l'inscription.

---

### Task 1: Réglages d'instance chiffrés

**Files:** `lib/nexora/instance-settings.ts` (+ tests) : lecture/écriture (SSO, SMTP, domaines) dans une ligne de réglages (métadonnées de l'organisation d'instance), chiffrement, priorité du `.env`.
- [x] Tests RED→GREEN ; commit `feat(j9): réglages d'instance chiffrés`.

### Task 2: E-mail et domaines

**Files:** le service d'envoi lit SMTP à chaud (réglages puis `.env`), route d'e-mail de test, contrôle des domaines à l'inscription (existant `NEXORA_ALLOWED_EMAIL_DOMAINS` + réglages), routes et section Réglages › E-mail.
- [x] Tests RED→GREEN (priorités, test d'envoi, domaine refusé) ; commit `feat(j9): e-mail et domaines autorisés dans l'interface`.

### Task 3: SSO

**Files:** `lib/nexora/oidc.ts` (lecture des réglages au démarrage si `.env` vide), route « tester » (découverte OIDC) et « appliquer » (enregistre puis arrête proprement le processus ; le conteneur repart), section Réglages › Sécurité.
- [x] Tests RED→GREEN ; commit `feat(j9): connexion unique réglable dans l'interface`.

### Task 4: Groupes d'accès

**Files:** `ee/access-control/components/access-control.tsx` (remplacement clean-room : liste des groupes, membres, cases en français, modèles « Lecture seule », « Créateurs », « Administrateurs ») sur l'API existante.
- [x] Interface, tests des aides pures ; commit `feat(j9): groupes d'accès`.

### Task 5: Guide, fumée, pc6, revue
- [ ] `docs/guide/reglages.md` ; capture d'e-mails locale (conteneur de test lancé pour l'occasion) et Keycloak de `scripts/dev` ; parcours « Terminé quand » ; revue finale ; push.
