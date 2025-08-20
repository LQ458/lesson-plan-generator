const ChromaDBHTTPClient = require('./server/rag/services/chromadb-http-client');

async function testRAGQuery() {
  console.log('🔍 Testing RAG query with loaded educational data...');
  
  const client = new ChromaDBHTTPClient('http://localhost:8000', 'default_tenant', 'default_database');
  const collectionName = 'teachai_centos';
  
  try {
    // Test different educational queries
    const testQueries = [
      '小学数学加法教学方法',
      '语文阅读理解技巧',
      '初中物理力学概念',
      '化学实验安全注意事项',
      '历史课堂教学设计'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🎯 查询: "${query}"`);
      
      const results = await client.queryCollection(collectionName, {
        queryTexts: [query],
        nResults: 3,
        include: ['documents', 'metadatas', 'distances']
      });
      
      if (results.documents && results.documents[0]) {
        console.log(`✅ 找到 ${results.documents[0].length} 个相关结果:`);
        
        for (let i = 0; i < results.documents[0].length; i++) {
          const doc = results.documents[0][i];
          const metadata = results.metadatas[0][i];
          const distance = results.distances[0][i];
          
          console.log(`\n   ${i + 1}. 相似度: ${(1 - distance).toFixed(3)}`);
          console.log(`      来源: ${metadata.source || 'unknown'}`);
          console.log(`      内容: ${doc.substring(0, 100)}...`);
        }
      } else {
        console.log('❌ 未找到相关结果');
      }
    }
    
    // Check total document count
    console.log('\n📊 数据库统计信息:');
    const count = await client.countCollection(collectionName);
    console.log(`   总文档数: ${count}`);
    
    console.log('\n🎉 RAG查询测试完成!');
    console.log('💡 ChromaDB RAG系统已成功运行，可以为TeachAI应用提供智能检索服务');
    
  } catch (error) {
    console.error('\n❌ RAG查询测试失败:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testRAGQuery().catch(console.error);