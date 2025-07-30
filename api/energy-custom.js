// Fonction Vercel pour /api/energy/custom - Proxy vers Flask local
export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gérer les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const { start_time, end_time, scale = 'HOUR' } = req.body;

    if (!start_time || !end_time) {
      res.status(400).json({ error: 'start_time et end_time requis' });
      return;
    }

    // Appeler votre serveur Flask local
    const flaskResponse = await fetch('http://localhost:5000/api/energy/custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start_time, end_time, scale })
    });

    if (!flaskResponse.ok) {
      throw new Error(`Erreur Flask: ${flaskResponse.status}`);
    }

    const data = await flaskResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Erreur dans energy-custom:', error);
    res.status(500).json({ 
      error: error.message,
      note: 'Assurez-vous que votre serveur Flask local tourne sur localhost:5000'
    });
  }
} 