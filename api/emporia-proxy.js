// Proxy pour l'API Emporia Python sur Vercel
export default async function handler(req, res) {
  const { method, body, query } = req;
  
  try {
    // Rediriger vers l'API Python
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/emporia`
      : 'http://localhost:5000';
    
    const response = await fetch(`${apiUrl}${req.url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Erreur proxy:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
} 