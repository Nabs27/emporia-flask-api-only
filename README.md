# 📊 Charts Energy App - Vercel Deployment

Application React pour visualiser les données de consommation énergétique Emporia Vue, déployée sur Vercel avec API Python Serverless.

## 🚀 Déploiement Rapide

### Option 1: Script Windows (Recommandé)
```bash
# Double-cliquez sur le fichier
quick-deploy.bat
```

### Option 2: Commandes manuelles
```bash
# Commit et push
git add .
git commit -m "Deploy to Vercel"
git push origin main

# Ou utilisez le script bash
./deploy.sh
```

## 📁 Structure du Projet

```
charts-2/
├── api/
│   ├── emporia.py          # API Python Serverless (PyEmVue)
│   └── emporia-proxy.js    # Proxy JavaScript
├── src/
│   ├── App.tsx            # App principale
│   ├── Dashboard.tsx      # Dashboard principal
│   ├── EnergyCharts.tsx   # Graphiques détaillés
│   └── utils/
│       ├── api.ts         # Client API
│       └── timeNavigation.ts # Navigation temporelle
├── vercel.json            # Configuration Vercel
├── requirements.txt       # Dépendances Python
└── package.json          # Dépendances Node.js
```

## 🔧 Configuration

### Variables d'Environnement
Les credentials Emporia sont déjà configurés dans `vercel.json` :
- `EMPORIA_USERNAME`: n.gafsi@hotmail.com
- `EMPORIA_PASSWORD`: Emp@233730

### Dépendances
- **Python**: PyEmVue, Flask, requests
- **Node.js**: React, Chart.js, date-fns, Tailwind CSS

## 🌐 URLs

- **Production**: `https://votre-app.vercel.app`
- **API Health**: `https://votre-app.vercel.app/api/health`
- **API Live**: `https://votre-app.vercel.app/api/energy/live`
- **API Custom**: `https://votre-app.vercel.app/api/energy/custom`

## 🧪 Tests

### Test Local
```bash
# Test de l'API Flask locale
python test-local-api.py

# Test de l'app React
npm run dev
```

### Test Vercel
```bash
# Test après déploiement
node test-deployment.js https://votre-app.vercel.app
```

## 📊 Fonctionnalités

### Dashboard
- ⚡ **Consommation Live** - Données en temps réel
- 📅 **Consommation Aujourd'hui** - De minuit à l'heure actuelle
- 📈 **Comparaison Hier/Aujourd'hui** - Analyse comparative
- 🔮 **Prévisions** - Estimation de fin de journée
- 📊 **Total Mensuel** - Consommation du mois en cours

### Graphiques Détaillés
- 🕐 **Vue Heures** - 24 dernières heures
- 📅 **Vue Jour** - 30 derniers jours
- 📆 **Vue Mois** - 12 derniers mois
- 📈 **Vue Année** - 12 derniers mois (année glissante)
- 🔄 **Navigation Temporelle** - Navigation intuitive

### Optimisations
- 💾 **Cache Local** - Stockage localStorage pour les données
- ⚡ **Chargement Optimisé** - Affichage immédiat + mise à jour
- 🔄 **Mise à Jour Live** - Données actualisées automatiquement

## 🛠️ Développement Local

### Prérequis
- Python 3.8+
- Node.js 16+
- Compte Emporia Vue

### Installation
```bash
# Dépendances Python
pip install -r requirements.txt

# Dépendances Node.js
npm install

# Démarrer l'API Flask
python api/emporia.py

# Démarrer l'app React
npm run dev
```

## 🔍 Monitoring

### Logs Vercel
- Dashboard Vercel → Functions
- Logs en temps réel
- Métriques de performance

### Health Check
```bash
curl https://votre-app.vercel.app/api/health
```

## 🆘 Dépannage

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

## 📈 Performance

### Optimisations Implémentées
- ✅ **Cache Local** - Évite les requêtes inutiles
- ✅ **Chargement Progressif** - Affichage immédiat
- ✅ **Code Splitting** - Chunks optimisés
- ✅ **Serverless Functions** - Scalabilité automatique

### Métriques
- **Temps de chargement initial**: < 2s
- **Temps de réponse API**: < 500ms
- **Mise à jour live**: Toutes les 5s

## 🔄 Mise à Jour

### Déploiement automatique
- Chaque push sur `main` déclenche un déploiement
- Vercel prévisualise les changements

### Déploiement manuel
```bash
vercel --prod
```

## 📞 Support

- **Logs Vercel**: Dashboard → Functions
- **Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

---

**🎉 Votre app est prête pour le déploiement !** 