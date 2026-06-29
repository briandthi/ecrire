#!/bin/bash

echo "Pull codebase ..."
git pull

echo "🛑 Arrêt des conteneurs existants..."
docker-compose down || true

echo "🧹 Nettoyage des images non utilisées..."
docker image prune -f

# Build et déploiement
echo "🔨 Build de l'image..."
docker compose build

echo "🚀 Démarrage du conteneur..."
docker compose up -d

echo "✅ Déployé sur https://ecrire.tbriand.com"