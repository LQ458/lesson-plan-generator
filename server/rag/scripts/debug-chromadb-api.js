const axios = require('axios');

async function debugChromaDBAPI() {
  const baseURL = 'http://localhost:8000';
  
  console.log('🔍 调试ChromaDB API端点...');
  
  // Test different endpoints
  const endpoints = [
    '/api/v2/heartbeat',
    '/api/v2/collections',
    '/api/v2/version',
    '/docs',
    '/openapi.json'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 测试: ${baseURL}${endpoint}`);
      const response = await axios.get(`${baseURL}${endpoint}`);
      console.log(`✅ 状态: ${response.status}`);
      console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ 错误: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`📄 错误详情:`, error.response.data);
      }
    }
  }
  
  // Test collection creation
  console.log('\n🧪 测试集合创建...');
  try {
    const createPayload = {
      name: 'test_collection_debug',
      metadata: {}
    };
    
    console.log('📤 创建请求:', JSON.stringify(createPayload, null, 2));
    const response = await axios.post(`${baseURL}/api/v2/collections`, createPayload);
    console.log('✅ 创建成功:', response.data);
    
    // Test listing again
    const listResponse = await axios.get(`${baseURL}/api/v2/collections`);
    console.log('📋 集合列表:', listResponse.data);
    
  } catch (error) {
    console.log('❌ 创建失败:', error.response?.status, error.response?.data || error.message);
  }
}

debugChromaDBAPI().catch(console.error);