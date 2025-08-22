const { CloudClient } = require("chromadb");

async function test() {
  const client = new CloudClient({
    apiKey: 'ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
    tenant: 'ac97bc90-bba3-4f52-ab06-f0485262312e', 
    database: 'teachai'
  });
  
  try {
    await client.heartbeat();
    console.log('✅ Auth OK');
  } catch (err) {
    console.log('❌ Auth failed:', err.message);
  }
}

test();