// Fonction Vercel pour /api/health
export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gérer les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      vue_connected: true, // Simulation pour l'instant
      message: 'API fonctionnelle avec données simulées'
    });

  } catch (error) {
    console.error('Erreur dans health:', error);
    res.status(500).json({ error: error.message });
  }
} 