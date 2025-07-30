// Script de test pour vérifier le déploiement Vercel
const https = require('https');

const testEndpoints = [
  '/api/health',
  '/api/energy/live'
];

async function testEndpoint(baseUrl, endpoint) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${endpoint}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${endpoint}: ${res.statusCode} - ${JSON.stringify(jsonData)}`);
          resolve({ success: true, status: res.statusCode, data: jsonData });
        } catch (e) {
          console.log(`❌ ${endpoint}: ${res.statusCode} - Erreur parsing JSON`);
          resolve({ success: false, status: res.statusCode, error: e.message });
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${endpoint}: Erreur réseau - ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

async function testDeployment() {
  console.log('🧪 Test de déploiement Vercel');
  console.log('=============================');
  
  // Remplacer par votre URL Vercel
  const baseUrl = process.argv[2] || 'https://votre-app.vercel.app';
  
  if (!baseUrl.includes('vercel.app')) {
    console.log('❌ URL invalide. Utilisez: node test-deployment.js https://votre-app.vercel.app');
    return;
  }
  
  console.log(`🌐 Test de: ${baseUrl}`);
  console.log('');
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(baseUrl, endpoint);
    results.push({ endpoint, ...result });
  }
  
  console.log('');
  console.log('📊 Résumé:');
  console.log('==========');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`✅ Succès: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 Déploiement réussi !');
  } else {
    console.log('⚠️  Certains endpoints ont échoué');
  }
}

// Exécuter le test
testDeployment().catch(console.error); 