# J10 « Document AI et voix » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** OCR, vision et transcription souverains dans les blocs et les connaissances ; réindexation des bases.

**Architecture:** usages de modèles dans Réglages › Modèles (vision/OCR, transcription) servis par Nexora API (`/v1/ocr`, `/v1/audio/transcriptions`) ; sources locales : modèle de vision Ollama et service Whisper optionnel (profil `voice`) ; fournisseur « Nexora » dans les blocs vision, analyse de fichier et transcription ; repli OCR à l'ingestion des connaissances ; réindexation en arrière-plan.

**Tech Stack:** Nexora API (OpenGateLLM), Ollama, serveur Whisper compatible OpenAI, Next.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v2-design.md` — §8undecies (prime).

## Global Constraints

- Aucun appel tiers par défaut ; images épinglées ; threads limités pour les modèles locaux.
- Jamais de mélange de vecteurs de dimensions ou de modèles différents dans une base.
- Messages en français ; audits du dépôt passent.

## Review Focus

- Fichier audio long (1 h) : découpage ou refus clair, pas de délai dépassé silencieux.
- PDF de 300 pages scannées : traitement par lots, progression, reprise après redémarrage.
- Réindexation interrompue : la base garde l'ancien index jusqu'à la fin (bascule atomique).
- Image trop grande : redimensionnée avant l'envoi au modèle.
- Aucun modèle de l'usage : cartes « Capturer » et fournisseur Nexora masqués, message d'aide.

---

### Task 1: Usages de modèles et sources locales
- [x] Réglages › Modèles : usage (Discussion, Vision/OCR, Transcription) à l'ajout (routeurs `image-to-text`, `automatic-speech-recognition`) ; catalogue Ollama vision (`qwen2.5vl:3b`, `qwen2.5vl:7b`) ; profil compose `voice` (Whisper, image épinglée) ; tests (client d'administration, compose) ; commit.

### Task 2: Fournisseur « Nexora » dans les blocs
- [x] Vision, analyse de fichier (OCR), transcription : fournisseur par défaut dans l'édition Nexora ; tests des outils (corps de requête, réponses) ; commit.

### Task 3: Connaissances
- [x] Repli OCR quand l'extraction de texte est vide ; transcription des fichiers audio ; tests ; commit.

### Task 4: Réindexation
- [x] Changer le modèle d'embeddings d'une base ⇒ réindexation en arrière-plan avec bascule atomique ; progression ; tests ; commit.

### Task 5: Accueil, guide, fumée, pc6, revue
- [ ] Cartes « Capturer » ; `docs/guide/documents-et-voix.md` ; fumées « OCR » et « Transcription » ; parcours « Terminé quand » sur pc6 ; revue finale ; push.
