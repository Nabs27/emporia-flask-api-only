#!/bin/bash

echo "🚀 Déploiement Vercel - Charts Energy App"
echo "=========================================="

# Vérifier que git est configuré
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Erreur: Pas de repository Git trouvé"
    exit 1
fi

# Vérifier les changements
if git diff-index --quiet HEAD --; then
    echo "✅ Aucun changement détecté"
else
    echo "📝 Changements détectés, commit en cours..."
    git add .
    git commit -m "Auto-deploy: $(date)"
fi

# Push vers GitHub
echo "📤 Push vers GitHub..."
git push origin main

echo "✅ Déploiement déclenché !"
echo "🌐 Vérifiez votre dashboard Vercel pour le statut"
echo "🔗 URL: https://vercel.com/dashboard" 