const fs = require("fs").promises;
const path = require("path");
const { ChromaClient, DefaultEmbeddingFunction } = require("chromadb");

// 配置
const CHROMA_PATH = process.env.CHROMA_PATH || `http://${process.env.CHROMA_HOST || "localhost"}:${process.env.CHROMA_PORT || 8000}`;
const COLLECTION_NAME = "teachai_simple";
const RAG_DATA_PATH = path.join(__dirname, "../../rag_data/chunks");

class SimpleRAGLoader {
  constructor() {
    this.client = null;
    this.collection = null;
  }

  async initialize() {
    try {
      console.log("🚀 初始化简单RAG加载器...");
      this.client = new ChromaClient({ path: CHROMA_PATH });
      
      // Test connection
      await this.client.heartbeat();
      console.log("✅ ChromaDB连接成功");
      
      // Delete existing collection if exists
      try {
        const collections = await this.client.listCollections();
        const existing = collections.find(c => c.name === COLLECTION_NAME);
        if (existing) {
          await this.client.deleteCollection({ name: COLLECTION_NAME });
          console.log("🗑️ 删除旧集合");
        }
      } catch (e) {
        // Ignore errors
      }
      
      // Create collection with embedding function
      this.collection = await this.client.createCollection({
        name: COLLECTION_NAME,
        embeddingFunction: new DefaultEmbeddingFunction()
      });
      console.log(`✅ 创建集合: ${COLLECTION_NAME}`);
      
      return true;
    } catch (error) {
      console.error("❌ 初始化失败:", error);
      return false;
    }
  }

  async loadData() {
    try {
      const files = await fs.readdir(RAG_DATA_PATH);
      const jsonFiles = files.filter(f => f.endsWith('.json')).slice(0, 10); // 只处理前10个文件作为测试
      
      console.log(`📁 找到 ${jsonFiles.length} 个测试文件`);
      
      let totalChunks = 0;
      
      for (let i = 0; i < jsonFiles.length; i++) {
        const filename = jsonFiles[i];
        console.log(`📄 处理文件 ${i + 1}/${jsonFiles.length}: ${filename}`);
        
        try {
          const filePath = path.join(RAG_DATA_PATH, filename);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          let chunks = Array.isArray(data) ? data : (data.chunks || []);
          chunks = chunks.slice(0, 5); // 每个文件只取前5个chunks
          
          if (chunks.length === 0) continue;
          
          // 准备数据
          const ids = [];
          const documents = [];
          const metadatas = [];
          
          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            if (!chunk.content || chunk.content.trim().length < 10) continue;
            
            const chunkId = `${filename}_${j}`;
            const metadata = {
              source: filename,
              chunk_index: j,
              content_length: chunk.content.length
            };
            
            ids.push(chunkId);
            documents.push(chunk.content.trim().substring(0, 500)); // 限制长度
            metadatas.push(metadata);
          }
          
          if (ids.length > 0) {
            // 简单插入，让ChromaDB自动处理embedding
            await this.collection.add({
              ids,
              documents,
              metadatas
            });
            
            totalChunks += ids.length;
            console.log(`✅ 插入 ${ids.length} chunks`);
          }
          
        } catch (error) {
          console.error(`❌ 处理文件失败 ${filename}:`, error.message);
        }
      }
      
      console.log(`🎉 加载完成！总计 ${totalChunks} chunks`);
      
      // 测试查询
      await this.testQuery();
      
    } catch (error) {
      console.error("❌ 加载数据失败:", error);
    }
  }
  
  async testQuery() {
    try {
      console.log("🔍 测试查询...");
      const results = await this.collection.query({
        queryTexts: ["数学"],
        nResults: 3
      });
      
      console.log(`✅ 查询成功，返回 ${results.documents[0]?.length || 0} 个结果`);
      if (results.documents[0] && results.documents[0].length > 0) {
        console.log("📄 示例结果:", results.documents[0][0].substring(0, 100));
      }
    } catch (error) {
      console.error("❌ 查询测试失败:", error.message);
    }
  }
}

async function main() {
  const loader = new SimpleRAGLoader();
  
  if (await loader.initialize()) {
    await loader.loadData();
  }
}

main().catch(console.error);