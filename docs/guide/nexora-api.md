# Nexora API

Nexora API est la passerelle de modèles de la plateforme. Elle est **compatible OpenAI** : tout outil qui parle à l'API d'OpenAI peut utiliser vos modèles en changeant l'adresse et la clé.

- Adresse : `http://<serveur>:8000/v1` (port `NEXORA_API_PORT`)
- Documentation interactive : `http://<serveur>:8000/docs`

## Obtenir une clé

Connectez-vous en administrateur (`admin`, mot de passe `NEXORA_API_ADMIN_PASSWORD` dans `deploy/.env`) :

```bash
curl -s -X POST http://localhost:8000/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin","password":"<mot de passe>"}'
```

Puis créez une clé avec la valeur `value` reçue :

```bash
curl -s -X POST http://localhost:8000/v1/me/keys -H "Authorization: Bearer <session>" -H 'Content-Type: application/json' -d '{"name":"mon-outil"}'
```

## Appeler un modèle

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer <clé>" -H 'Content-Type: application/json' \
  -d '{"model":"nexora-default","messages":[{"role":"user","content":"Bonjour"}]}'
```

## Consommation

`GET /v1/me/usage?start_time=<unix>&end_time=<unix>` renvoie les requêtes et les jetons par jour. C'est la source du tableau **Réglages › Consommation** de WorkStudio.

## Configuration

Le fichier `deploy/nexora-api/config.yml` déclare les modèles. Pour en ajouter un, dupliquez le bloc `models` (types de fournisseurs : `openai`, `vllm`, `mistral`, `albert`, `tei`), puis redémarrez : `docker compose -f deploy/compose.yml --env-file deploy/.env restart nexora-api`.
