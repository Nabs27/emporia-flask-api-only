import axios from 'axios';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Fonction principale Vercel
export default async function handler(req, res) {
  console.log('API energy appelée:', req.method, req.url);
  
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).end();
  }

  // Ajouter les headers CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    console.log('Pathname:', pathname);
    
    if (pathname === '/api/energy/live') {
      console.log('Récupération live...');
      // Données de test pour le live
      const testData = [Math.random() * 2 + 0.5]; // Entre 0.5 et 2.5 kW
      return res.status(200).json({ usage: testData });
    }
    
    if (pathname === '/api/energy/custom') {
      console.log('Récupération custom...');
      // Données de test pour les graphiques
      const hours = 24;
      const testData = Array.from({ length: hours }, () => Math.random() * 5 + 1); // Entre 1 et 6 kWh
      return res.status(200).json({ usage: testData });
    }
    
    console.log('Endpoint non trouvé:', pathname);
    return res.status(404).json({ error: 'Endpoint non trouvé' });
    
  } catch (error) {
    console.error('Erreur API:', error);
    return res.status(500).json({ error: error.message });
  }
} 