const ChromaDBHTTPClient = require('./server/rag/services/chromadb-http-client');

async function checkExistingCollections() {
  console.log('🔍 检查现有ChromaDB集合...');
  
  const client = new ChromaDBHTTPClient('http://localhost:8000', 'default_tenant', 'default_database');
  
  try {
    // 测试连接
    await client.heartbeat();
    console.log('✅ ChromaDB连接成功');
    
    // 列出现有集合
    const collections = await client.listCollections();
    console.log(`📋 找到 ${collections.length} 个现有集合:`);
    
    for (const collection of collections) {
      console.log(`  - 集合: ${collection.name || collection.id}`);
      console.log(`    ID: ${collection.id}`);
      console.log(`    元数据:`, collection.metadata || {});
      
      // 尝试获取集合信息
      try {
        const collectionInfo = await client.getCollection(collection.name || collection.id);
        console.log(`    详细信息:`, collectionInfo);
        
        // 检查文档数量
        const count = await client.countCollection(collection.name || collection.id);
        console.log(`    文档数量: ${count}`);
        
      } catch (error) {
        console.log(`    获取详情失败: ${error.message}`);
      }
      console.log('');
    }
    
    // 如果有现有集合，测试查询一个
    if (collections.length > 0) {
      const firstCollection = collections[0];
      const collectionName = firstCollection.name || firstCollection.id;
      
      console.log(`🔍 测试查询集合: ${collectionName}`);
      try {
        const queryResult = await client.queryCollection(collectionName, {
          queryTexts: ['教学'],
          nResults: 3
        });
        console.log('✅ 查询成功!');
        console.log(`📄 返回 ${queryResult.documents?.[0]?.length || 0} 个结果`);
        if (queryResult.documents?.[0]?.[0]) {
          console.log(`📄 示例内容: ${queryResult.documents[0][0].substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`❌ 查询失败: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkExistingCollections().catch(console.error);