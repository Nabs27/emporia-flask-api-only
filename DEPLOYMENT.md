# 🚀 Guide de Déploiement Vercel

## 📋 Prérequis
- Compte Vercel connecté à GitHub ✅
- Code Python Flask pour l'API Emporia
- Variables d'environnement Emporia

## 🔧 Configuration

### 1. Variables d'Environnement Vercel

Dans votre dashboard Vercel, ajoutez ces variables :

```bash
EMPORIA_USERNAME=n.gafsi@hotmail.com
EMPORIA_PASSWORD=Emp@233730
```

**Note :** Les credentials sont déjà configurés dans `vercel.json` pour simplifier le déploiement.

### 2. Structure des Fichiers

```
charts-2/
├── api/
│   ├── emporia.py          # API Python Serverless
│   └── emporia-proxy.js    # Proxy JavaScript
├── src/
│   └── ...                 # Code React
├── vercel.json             # Configuration Vercel
├── requirements.txt        # Dépendances Python
└── package.json           # Dépendances Node.js
```

## 🚀 Déploiement

### Option 1: Via GitHub (Recommandé)

1. **Poussez votre code sur GitHub**
```bash
git add .
git commit -m "Prêt pour déploiement Vercel"
git push origin main
```

2. **Connectez-vous à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Connectez-vous avec GitHub
   - Cliquez "New Project"

3. **Importez votre repo**
   - Sélectionnez votre repo `charts-2`
   - Vercel détectera automatiquement la configuration

4. **Configurez les variables d'environnement**
   - Dans les paramètres du projet
   - Ajoutez les 3 variables Emporia

5. **Déployez !**
   - Cliquez "Deploy"
   - Vercel construira automatiquement l'app

### Option 2: Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Login
vercel login

# Déployer
vercel

# Suivre les instructions
# - Lier au projet existant ou créer nouveau
# - Configurer les variables d'environnement
```

## 🔍 Vérification

### 1. Test de l'API
```bash
# Test health check
curl https://votre-app.vercel.app/api/health

# Test live data
curl https://votre-app.vercel.app/api/energy/live
```

### 2. Test de l'App
- Ouvrez votre URL Vercel
- Vérifiez que les données s'affichent
- Testez la navigation temporelle

## 🛠️ Dépannage

### Erreur 500 - API Python
- Vérifiez les variables d'environnement
- Consultez les logs Vercel
- Testez l'authentification Emporia

### Erreur CORS
- L'API Python inclut les headers CORS
- Vérifiez les routes dans `vercel.json`

### Build Error
- Vérifiez `requirements.txt`
- Consultez les logs de build Vercel

## 📊 Monitoring

### Logs Vercel
- Dashboard Vercel → Functions
- Logs en temps réel
- Métriques de performance

### Health Check
```bash
curl https://votre-app.vercel.app/api/health
```

## 🔄 Mise à Jour

### Déploiement automatique
- Chaque push sur `main` déclenche un déploiement
- Vercel prévisualise les changements

### Déploiement manuel
```bash
vercel --prod
```

## 🎯 URLs

- **Production** : `https://votre-app.vercel.app`
- **Preview** : `https://votre-app-git-main.vercel.app`
- **API** : `https://votre-app.vercel.app/api/*`

## ✅ Checklist Finale

- [ ] Variables d'environnement configurées
- [ ] API Python fonctionne localement
- [ ] Build Vercel réussi
- [ ] Health check OK
- [ ] Données Emporia accessibles
- [ ] App React fonctionne
- [ ] Navigation temporelle OK

## 🆘 Support

- **Logs Vercel** : Dashboard → Functions
- **Documentation** : [vercel.com/docs](https://vercel.com/docs)
- **Community** : [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions) 