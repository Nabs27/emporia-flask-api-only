import axios from 'axios';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Variables d'environnement pour les credentials Emporia
const EMPORIA_USERNAME = 'n.gafsi@hotmail.com';
const EMPORIA_PASSWORD = 'Emp@233730';

let accessToken = null;
let tokenExpiry = null;

// Authentification Emporia
async function authenticateEmporia() {
  try {
    const response = await axios.post('https://api.emporiaenergy.com/oauth2/token', {
      username: EMPORIA_USERNAME,
      password: EMPORIA_PASSWORD,
      grant_type: 'password',
      client_id: 'EmporiaVueWebApp'
    });

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    
    return accessToken;
  } catch (error) {
    console.error('Erreur authentification Emporia:', error.response?.data || error.message);
    throw new Error('Erreur d\'authentification Emporia');
  }
}

// S'assurer d'être authentifié
async function ensureAuthenticated() {
  if (!accessToken || !tokenExpiry || Date.now() >= tokenExpiry) {
    await authenticateEmporia();
  }
  return accessToken;
}

// Récupérer les appareils
async function getDevices() {
  const token = await ensureAuthenticated();
  
  try {
    const response = await axios.get('https://api.emporiaenergy.com/customers/devices', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erreur récupération appareils:', error.response?.data || error.message);
    throw new Error('Erreur récupération appareils');
  }
}

// Récupérer l'usage d'un appareil
async function getDeviceUsage(deviceGids, instant, scale, unit = 'KWH') {
  const token = await ensureAuthenticated();
  
  try {
    const response = await axios.get('https://api.emporiaenergy.com/customers/devices/usage', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        deviceGids: deviceGids.join(','),
        instant: instant,
        scale: scale,
        unit: unit
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erreur récupération usage:', error.response?.data || error.message);
    throw new Error('Erreur récupération usage');
  }
}

// Récupérer les données de graphique
async function getChartUsage(channel, start, end, scale, unit = 'KWH') {
  const token = await ensureAuthenticated();
  
  try {
    const response = await axios.get('https://api.emporiaenergy.com/customers/devices/chart', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        channel: channel,
        start: start,
        end: end,
        scale: scale,
        unit: unit
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erreur récupération chart:', error.response?.data || error.message);
    throw new Error('Erreur récupération chart');
  }
}

// Fonction principale Vercel
export default async function handler(req, res) {
  console.log('API energy-custom appelée:', req.method, req.url);
  
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

  // Parser le body JSON si présent
  let body = {};
  if (req.method === 'POST' && req.body) {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
      return res.status(400).json({ error: 'Body JSON invalide' });
    }
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    console.log('Pathname:', pathname);
    console.log('Body:', body);
    
    if (pathname === '/api/energy-custom/live') {
      console.log('Récupération live...');
      // Récupérer la consommation live
      const devices = await getDevices();
      const targetDevice = devices.devices?.find(d => d.device_name === 'Lord') || devices.devices?.[0];
      
      if (!targetDevice) {
        return res.status(404).json({ error: 'Aucun appareil trouvé' });
      }
      
      const now = new Date();
      const usageData = await getDeviceUsage([targetDevice.device_gid], now.toISOString(), 'SECOND', 'KWH');
      
      // Extraire la dernière valeur
      const lastValue = usageData[targetDevice.device_gid]?.channels?.[0]?.usage || 0;
      
      return res.status(200).json({ usage: [lastValue] });
    }
    
    if (pathname === '/api/energy-custom/custom') {
      console.log('Récupération custom...');
      // Récupérer les données personnalisées
      const { start_time, end_time, scale } = body;
      
      if (!start_time || !end_time || !scale) {
        return res.status(400).json({ error: 'Paramètres manquants' });
      }
      
      const devices = await getDevices();
      const targetDevice = devices.devices?.find(d => d.device_name === 'Lord') || devices.devices?.[0];
      
      if (!targetDevice) {
        return res.status(404).json({ error: 'Aucun appareil trouvé' });
      }
      
      const chartData = await getChartUsage(
        targetDevice.device_gid,
        start_time,
        end_time,
        scale,
        'KWH'
      );
      
      // Ajuster les valeurs selon l'échelle (comme dans Flask)
      let usage_over_time = chartData.usage || [];
      if (scale === 'SECOND') {
        usage_over_time = usage_over_time.map(value => value ? value * 3600 : 0);
      } else if (scale === 'MINUTE') {
        usage_over_time = usage_over_time.map(value => value ? value * 60 : 0);
      }
      // Pour HOUR, on laisse tel quel
      
      return res.status(200).json({ 
        start_time: start_time, 
        usage: usage_over_time 
      });
    }
    
    console.log('Endpoint non trouvé:', pathname);
    return res.status(404).json({ error: 'Endpoint non trouvé' });
    
  } catch (error) {
    console.error('Erreur API:', error);
    return res.status(500).json({ error: error.message });
  }
} 