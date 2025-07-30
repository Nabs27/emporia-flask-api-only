# 🚀 Déploiement Flask sur Railway

## **Pourquoi Railway ?**
- ✅ **Gratuit** - 500 heures/mois
- ✅ **Simple** - Déploiement automatique depuis GitHub
- ✅ **Python supporté** - PyEmVue compatible
- ✅ **HTTPS automatique** - Certificats SSL gratuits

## **Étapes de déploiement :**

### **1. Créer un nouveau repo pour Flask**
```bash
# Créer un nouveau dossier pour l'API Flask
mkdir emporia-flask-api
cd emporia-flask-api
```

### **2. Copier votre code Flask**
Copiez votre fichier Flask principal et créez ces fichiers :

**`app.py`** (votre code Flask principal)
**`requirements.txt`** :
```
Flask==2.3.3
flask-cors==4.0.0
pyemvue==0.15.0
requests==2.31.0
```

**`Procfile`** :
```
web: python app.py
```

### **3. Modifier votre Flask pour Railway**
```python
# Dans app.py, modifier la dernière ligne :
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
```

### **4. Déployer sur Railway**
1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous avec GitHub
3. Cliquez "New Project" → "Deploy from GitHub repo"
4. Sélectionnez votre repo Flask
5. Railway déploiera automatiquement

### **5. Récupérer l'URL**
Railway vous donnera une URL comme :
`https://votre-app.railway.app`

### **6. Mettre à jour les fonctions Vercel**
Remplacez `localhost:5000` par votre URL Railway dans :
- `api/energy-custom.js`
- `api/energy-live.js`

## **Variables d'environnement Railway :**
Dans Railway Dashboard → Variables :
```
EMPORIA_USERNAME=n.gafsi@hotmail.com
EMPORIA_PASSWORD=Emp@233730
```

## **Test :**
```bash
# Test de l'API Railway
curl https://votre-app.railway.app/api/health
```

## **Avantages :**
- ✅ **Vraies données Emporia** - PyEmVue fonctionne
- ✅ **HTTPS** - Sécurisé
- ✅ **Gratuit** - 500h/mois
- ✅ **Auto-déploiement** - Chaque push = nouveau déploiement 