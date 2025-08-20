const axios = require('axios');

async function testChromaDBSimple() {
  console.log('🧪 Testing ChromaDB simple document addition...');
  
  const baseURL = 'http://localhost:8000';
  
  try {
    // Test 1: Check version and API info
    console.log('\n1️⃣ Checking ChromaDB version...');
    try {
      const versionResponse = await axios.get(`${baseURL}/api/v1/version`);
      console.log('✅ v1 Version:', versionResponse.data);
    } catch (e) {
      console.log('❌ v1 version failed:', e.response?.status);
    }
    
    try {
      const versionResponse = await axios.get(`${baseURL}/api/v2/version`);
      console.log('✅ v2 Version:', versionResponse.data);
    } catch (e) {
      console.log('❌ v2 version failed:', e.response?.status);
    }
    
    // Test 2: Try v1 API (simpler)
    console.log('\n2️⃣ Testing v1 API...');
    const v1CollectionName = 'test_v1_simple';
    
    try {
      // Delete existing test collection
      await axios.delete(`${baseURL}/api/v1/collections/${v1CollectionName}`);
      console.log('🗑️ Deleted existing v1 test collection');
    } catch (e) {
      console.log('ℹ️ No existing v1 collection to delete');
    }
    
    // Create collection with v1 API
    const createPayload = {
      name: v1CollectionName,
      metadata: { description: 'Simple v1 test' }
    };
    
    console.log('📤 Creating v1 collection:', createPayload);
    const createResponse = await axios.post(`${baseURL}/api/v1/collections`, createPayload);
    console.log('✅ v1 Collection created:', createResponse.data);
    
    // Add documents with v1 API (without embeddings)
    const addPayload = {
      ids: ['doc1', 'doc2'],
      documents: ['This is test document 1', 'This is test document 2'],
      metadatas: [{ source: 'test' }, { source: 'test' }]
    };
    
    console.log('📤 Adding documents to v1 collection...');
    const addResponse = await axios.post(`${baseURL}/api/v1/collections/${v1CollectionName}/add`, addPayload);
    console.log('✅ v1 Documents added successfully!');
    
    // Test query
    const queryPayload = {
      query_texts: ['test document'],
      n_results: 2
    };
    
    console.log('🔍 Testing v1 query...');
    const queryResponse = await axios.post(`${baseURL}/api/v1/collections/${v1CollectionName}/query`, queryPayload);
    console.log('✅ v1 Query successful!');
    console.log('📄 Results:', queryResponse.data);
    
    console.log('\n🎉 SUCCESS: v1 API works without embeddings!');
    console.log('💡 Solution: Use v1 API instead of v2');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
    
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testChromaDBSimple().catch(console.error);