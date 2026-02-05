import 'dotenv/config';

async function testHTTPAPI() {
  console.log('🔍 Testando API HTTP diretamente...\n');

  const endpoints = [
    '/api/health',
    '/api/categories',
    '/api/customers',
    '/api/suppliers',
    '/api/transactions'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        const count = Array.isArray(data) ? data.length : (data.data ? data.data.length : 1);
        console.log(`✅ ${endpoint} - Status: ${response.status} - Items: ${count}`);
        
        // Show sample for transactions
        if (endpoint === '/api/transactions' && Array.isArray(data) && data.length > 0) {
          console.log(`   Exemplo de data: ${data[0].date} (${typeof data[0].date})`);
        }
      } else {
        console.log(`⚠️ ${endpoint} - Status: ${response.status} - Not JSON (might need auth)`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

testHTTPAPI();
