const { ChromaClient } = require("chromadb");

const CHROMA_PATH = process.env.CHROMA_PATH || `http://${process.env.CHROMA_HOST || "localhost"}:${process.env.CHROMA_PORT || 8000}`;
const COLLECTION_NAME = "lesson_materials";

async function resetChromaDB() {
  try {
    console.log("🔄 连接到ChromaDB...");
    const client = new ChromaClient({ path: CHROMA_PATH });
    
    // Test connection
    await client.heartbeat();
    console.log("✅ ChromaDB连接成功");
    
    // List all collections
    const collections = await client.listCollections();
    console.log(`📋 找到 ${collections.length} 个集合`);
    
    // Delete the problematic collection if it exists
    const existingCollection = collections.find(c => c.name === COLLECTION_NAME);
    if (existingCollection) {
      console.log(`🗑️ 删除现有集合: ${COLLECTION_NAME}`);
      await client.deleteCollection({ name: COLLECTION_NAME });
      console.log("✅ 集合删除成功");
    } else {
      console.log(`ℹ️ 集合 ${COLLECTION_NAME} 不存在`);
    }
    
    console.log("🎉 ChromaDB重置完成！现在可以重新加载RAG数据");
    
  } catch (error) {
    console.error("❌ 重置失败:", error);
    process.exit(1);
  }
}

resetChromaDB();