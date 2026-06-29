# ecrire

Éditeur Markdown minimaliste en une seule page. Le Markdown se résout en HTML à chaque validation de ligne. Sauvegarde automatique dans un fichier `.md`.

## Stack

- **Backend** : Python / FastAPI / Uvicorn
- **Frontend** : HTML / CSS / JS vanilla
- **Packaging** : uv

## Dev local

```bash
uv run uvicorn main:app --reload
```

Ou avec Docker :

```bash
docker compose -f docker-compose.dev.yml up -d
```

Accessible sur `http://localhost:8000`.

## Déploiement

Adapter le `Host` dans `docker-compose.yml` puis :

```bash
docker compose up -d
```

Les notes sont persistées dans un volume Docker (`ecrire-data`).
