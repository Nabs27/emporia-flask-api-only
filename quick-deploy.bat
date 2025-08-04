@echo off
echo 🚀 Déploiement Vercel - Charts Energy App
echo ==========================================

REM Vérifier si git est installé
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git n'est pas installé ou pas dans le PATH
    pause
    exit /b 1
)

REM Vérifier les changements
git status --porcelain >nul 2>&1
if errorlevel 0 (
    echo 📝 Changements détectés, commit en cours...
    git add .
    git commit -m "Auto-deploy: %date% %time%"
) else (
    echo ✅ Aucun changement détecté
)

REM Push vers GitHub
echo 📤 Push vers GitHub...
git push origin main

if errorlevel 0 (
    echo ✅ Déploiement déclenché !
    echo 🌐 Vérifiez votre dashboard Vercel pour le statut
    echo 🔗 URL: https://vercel.com/dashboard
    echo.
    echo 📋 Prochaines étapes:
    echo 1. Allez sur https://vercel.com/dashboard
    echo 2. Sélectionnez votre projet
    echo 3. Vérifiez les logs de déploiement
    echo 4. Testez l'API: https://votre-app.vercel.app/api/health
) else (
    echo ❌ Erreur lors du push
)

pause 