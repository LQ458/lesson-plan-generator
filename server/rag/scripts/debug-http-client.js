const ChromaDBHTTPClient = require('../services/chromadb-http-client');

async function debugHttpClient() {
  console.log('🔍 Debugging ChromaDB HTTP Client...');
  
  const client = new ChromaDBHTTPClient('http://localhost:8000', 'default_tenant', 'default_database');
  
  try {
    // Step 1: Test heartbeat and detect API version
    console.log('\n1️⃣ Testing heartbeat...');
    const heartbeat = await client.heartbeat();
    console.log('✅ Heartbeat success:', heartbeat);
    
    // Step 2: List existing collections
    console.log('\n2️⃣ Listing collections...');
    const collections = await client.listCollections();
    console.log('📋 Existing collections:', collections);
    
    // Step 3: Test creating a simple collection
    console.log('\n3️⃣ Creating test collection...');
    const testCollectionName = 'debug_test_collection';
    
    try {
      // Try to delete first
      await client.deleteCollection(testCollectionName);
      console.log('🗑️ Deleted existing test collection');
    } catch (e) {
      console.log('ℹ️ No existing test collection to delete');
    }
    
    const collection = await client.createCollection(testCollectionName, {
      description: 'Debug test collection'
    });
    console.log('✅ Collection created:', collection);
    
    // Step 4: Test adding a simple document
    console.log('\n4️⃣ Testing document addition...');
    const testResult = await client.addDocuments(testCollectionName, {
      ids: ['test_doc_1'],
      documents: ['This is a simple test document for debugging'],
      metadatas: [{ source: 'debug_test', index: 1 }]
    });
    console.log('✅ Document added successfully:', testResult);
    
    // Step 5: Test querying
    console.log('\n5️⃣ Testing query...');
    const queryResult = await client.queryCollection(testCollectionName, {
      queryTexts: ['test document'],
      nResults: 1
    });
    console.log('✅ Query successful:', queryResult);
    
    // Step 6: Clean up
    console.log('\n6️⃣ Cleaning up...');
    await client.deleteCollection(testCollectionName);
    console.log('✅ Test collection deleted');
    
    console.log('\n🎉 All tests passed! HTTP client is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    console.error('Full error:', error);
    
    // Additional debugging info
    console.log('\n🔧 Debug Info:');
    console.log(`   API Base: ${client.apiBase}`);
    console.log(`   Collections Endpoint: ${client.collectionsEndpoint}`);
    console.log(`   Tenant: ${client.tenant}`);
    console.log(`   Database: ${client.database}`);
  }
}

// Run the debug test
debugHttpClient().catch(error => {
  console.error('❌ Debug script crashed:', error);
  process.exit(1);
});