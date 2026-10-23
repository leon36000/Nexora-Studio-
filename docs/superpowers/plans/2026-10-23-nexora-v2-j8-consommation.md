# J8 « Consommation, budgets, CO2 » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** voir qui consomme quoi et avec quel impact, et plafonner par mois.

**Architecture:** ventilation par modèle (requêtes, jetons, kWh, kgCO2eq) lue dans Nexora API (`/v1/me/usage?model=`) ; par espace et par personne, agrégée depuis les journaux d'exécution de WorkStudio (jetons par exécution), l'empreinte y étant estimée au prorata des jetons par modèle ; budgets mensuels (instance, espace) contrôlés au point d'entrée commun des exécutions.

**Tech Stack:** Next.js 16, Drizzle, React Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8nonies (prime).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; audits du dépôt et `check-i18n` passent.
- Lecture réservée aux admins d'instance ; un refus de budget ne révèle rien d'un autre espace.
- Un budget ne coupe jamais une exécution en cours, seulement les nouvelles.
- Messages en français ; chiffres arrondis lisiblement (fr-FR).

## Review Focus

- Nexora API indisponible : la ventilation par espace reste affichée, le CO2 marqué « indisponible ».
- Plafond relevé en cours de mois : les exécutions reprennent aussitôt (pas de cache figé).
- Fuseau horaire : le mois de budget suit `NEXORA_TIME_ZONE`.
- Exécution sans jetons (workflow sans modèle) : comptée en exécutions, pas en jetons.
- Espace supprimé : ses chiffres restent dans le total de l'instance.

---

### Task 1: Agrégats

**Files:** `lib/nexora/consumption/{by-model.ts,by-workspace.ts,co2.ts}` (+ tests).
- [x] **Step 1: Failing tests** : somme par modèle depuis Nexora API (plusieurs pages) ; agrégat par espace et par personne depuis les journaux (période, fuseau) ; prorata CO2 ; équivalent parlant (km en voiture, 0,193 kgCO2eq/km, source ADEME, constante datée).
- [x] **Step 2:** Implémenter ; PASS.
- [x] **Step 3: Commit** `feat(j8): agrégats de consommation et empreinte`.

### Task 2: Budgets

**Files:** `lib/nexora/consumption/budgets.ts` (+ tests), stockage `organization.metadata.nexoraBudgets` (instance, par espace, seuil), garde appelée au point d'entrée commun des exécutions (`lib/execution/preprocessing.ts`), alerte (bandeau admin ; e-mail si service configuré, une fois par seuil et par mois).
- [x] **Step 1: Failing tests** : sous le seuil ⇒ rien ; 80 % ⇒ alerte une seule fois ; 100 % ⇒ nouvelle exécution refusée avec message français ; plafond relevé ⇒ autorisée ; admin d'instance non bloqué.
- [x] **Step 2:** Implémenter ; PASS.
- [x] **Step 3: Commit** `feat(j8): budgets mensuels`.

### Task 3: Routes et écran

**Files:** contrat `lib/api/contracts/nexora-consumption.ts`, routes `app/api/nexora/consumption/route.ts` (GET), `app/api/nexora/budgets/route.ts` (GET/PUT), section Réglages › Consommation enrichie (période, totaux, CO2 + équivalent, courbes, tableaux par modèle/espace/personne, export CSV, budgets).
- [x] **Step 1:** Tests de routes (droits, validation), interface ; `type-check`, `check:audits`, `check-i18n`.
- [x] **Step 2: Commit** `feat(j8): écran de consommation et budgets`.

### Task 4: Guide, fumée, pc6, revue
- [x] **Step 1:** `docs/guide/consommation.md` ; fumée « Budgets » (budget d'espace minuscule ⇒ exécution refusée ⇒ plafond relevé ⇒ acceptée).
- [x] **Step 2:** pc6 : chiffres cohérents avec Nexora API ; parcours budget au navigateur.
- [x] **Step 3:** Revue finale, corrections TDD, push.
