// Fonction Vercel pour /api/energy/live - Proxy vers Flask local
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
    // Appeler votre serveur Flask local
    const flaskResponse = await fetch('http://localhost:5000/api/energy/live', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!flaskResponse.ok) {
      throw new Error(`Erreur Flask: ${flaskResponse.status}`);
    }

    const data = await flaskResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Erreur dans energy-live:', error);
    res.status(500).json({ 
      error: error.message,
      note: 'Assurez-vous que votre serveur Flask local tourne sur localhost:5000'
    });
  }
} 