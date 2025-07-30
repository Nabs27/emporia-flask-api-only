# Emporia Flask API

API Flask pour récupérer les données d'énergie Emporia Vue.

## Endpoints disponibles

- `GET /api/health` - Health check
- `GET /api/energy/live` - Consommation live
- `POST /api/energy/custom` - Données personnalisées
- `GET /api/energy/standard` - Données standard

## Déploiement sur Railway

1. Connectez-vous à [Railway](https://railway.app)
2. Créez un nouveau projet
3. Connectez votre repo GitHub
4. Railway déploiera automatiquement

## Variables d'environnement

Les credentials Emporia sont configurés dans le code :
- Username: n.gafsi@hotmail.com
- Password: Emp@233730
- Appareil: Lord 