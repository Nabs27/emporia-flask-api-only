// Script de test pour PyEmVue sur Vercel
const https = require('https');

const testEndpoints = [
  {
    path: '/api/health',
    method: 'GET',
    description: 'Health check avec statut PyEmVue'
  },
  {
    path: '/api/energy/live',
    method: 'GET',
    description: 'Consommation live'
  },
  {
    path: '/api/energy/custom',
    method: 'POST',
    data: {
      start_time: '2024-01-15 00:00:00',
      end_time: '2024-01-15 23:59:59',
      scale: 'HOUR'
    },
    description: 'Données personnalisées (journée)'
  },
  {
    path: '/api/energy/custom',
    method: 'POST',
    data: {
      start_time: '2024-01-01 00:00:00',
      end_time: '2024-01-31 23:59:59',
      scale: 'DAY'
    },
    description: 'Données personnalisées (mois)'
  }
];

async function testEndpoint(baseUrl, endpoint) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${endpoint.path}`;
    
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (endpoint.data) {
      options.body = JSON.stringify(endpoint.data);
    }
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${endpoint.description}: ${res.statusCode}`);
          console.log(`   Données: ${JSON.stringify(jsonData).substring(0, 100)}...`);
          resolve({ success: true, status: res.statusCode, data: jsonData });
        } catch (e) {
          console.log(`❌ ${endpoint.description}: ${res.statusCode} - Erreur parsing JSON`);
          console.log(`   Réponse: ${data}`);
          resolve({ success: false, status: res.statusCode, error: e.message });
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${endpoint.description}: Erreur réseau - ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    if (endpoint.data) {
      req.write(JSON.stringify(endpoint.data));
    }
    
    req.end();
  });
}

async function testPyEmVueDeployment() {
  console.log('🧪 Test PyEmVue sur Vercel');
  console.log('==========================');
  
  // Remplacer par votre URL Vercel
  const baseUrl = process.argv[2] || 'https://votre-app.vercel.app';
  
  if (!baseUrl.includes('vercel.app')) {
    console.log('❌ URL invalide. Utilisez: node test-pyemvue.js https://votre-app.vercel.app');
    return;
  }
  
  console.log(`🌐 Test de: ${baseUrl}`);
  console.log('');
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(baseUrl, endpoint);
    results.push({ endpoint: endpoint.description, ...result });
    console.log(''); // Ligne vide pour séparer
  }
  
  console.log('📊 Résumé:');
  console.log('==========');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`✅ Succès: ${successCount}/${totalCount}`);
  
  // Vérifier spécifiquement PyEmVue
  const healthResult = results.find(r => r.endpoint.includes('Health check'));
  if (healthResult && healthResult.data && healthResult.data.vue_connected) {
    console.log('🎉 PyEmVue connecté avec succès !');
  } else {
    console.log('⚠️  PyEmVue non connecté - vérifiez les credentials');
  }
  
  if (successCount === totalCount) {
    console.log('🎉 Déploiement PyEmVue réussi !');
  } else {
    console.log('⚠️  Certains endpoints ont échoué');
  }
}

// Exécuter le test
testPyEmVueDeployment().catch(console.error); 