# Ledger Nexora WorkStudio v3

Spec : `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` ; détail des jalons : `docs/recherche/ecart-mistral-studio-v2.md` §3.2.

## Préparation (23/10/2026)

- GLM 5.3 (`cloud-glm-5-3`) servi par la passerelle LiteLLM de pc1 (127.0.0.1:4400 sur pc1). Tunnel utilisateur créé sur pc6 pour les conteneurs : `~/.config/systemd/user/nexora-litellm-pc1-tunnel.service` (`-L 172.17.0.1:18090:127.0.0.1:4400 pc1-lan`), actif ; `nexora-api` joint `http://host.docker.internal:18090/v1/models` (200). Clé de la passerelle lue sur pc6 hors dépôt, jamais versionnée ni affichée.
- Modèle ajouté par Réglages › Modèles (route d'administration, source « compatible OpenAI ») puis défini par défaut. **Défaut trouvé** : « Tester » renvoie une réponse vide (666 ms) — modèle à raisonnement, test à 60 jetons qui ne lit que `content` ⇒ K1.
- Fumée complète avec GLM 5.3 par défaut : **27/27** ; tout s'accélère (Copilote 1,7 s contre 63 s, modèles PME 0,6 à 2,3 s, Playground 0,4 s). Cinq descriptions types du Copilote : **5/5 en 2 à 4 s**.
- Analyse d'écart avec Mistral Studio (sous-agent Opus) : `docs/recherche/ecart-mistral-studio-v2.md` — matrice ~90 lignes, 14 jalons K1–K14, hors périmètre, risques. Décisions prises pour le fondateur : spec v3 §3.
