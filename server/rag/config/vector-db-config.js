/**
 * 向量数据库配置
 */

const config = {
  // ChromaDB配置
  chroma: {
    host: process.env.CHROMA_HOST || "localhost",
    port: process.env.CHROMA_PORT || 8000,
    path: process.env.CHROMA_PATH || `http://${process.env.CHROMA_HOST || "localhost"}:${process.env.CHROMA_PORT || 8000}`,
    collection: {
      name: process.env.CHROMA_COLLECTION || "lesson_materials",
      metadata: {
        "hnsw:space": "cosine",
        description: "教学资料向量数据库",
      },
    },
  },

  // 嵌入模型配置
  embedding: {
    model:
      process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2",
    dimensions: 384, // all-MiniLM-L6-v2的向量维度
    maxTokens: 512,
  },

  // 搜索配置
  search: {
    defaultLimit: 5,
    maxLimit: 20,
    minSimilarityThreshold: 0.3,
    contextMaxTokens: 2000,
    qualityScoreWeight: 0.3,
    similarityWeight: 0.7,
  },

  // 文档处理配置
  documents: {
    ragDataDir: process.env.RAG_DATA_DIR || "./rag_data/chunks",
    supportedFormats: [".json"],
    batchSize: 100,
    maxDocumentSize: 10 * 1024 * 1024, // 10MB
    minQualityScore: 0.3, // Updated for enhanced data quality
    enhancedFormat: true, // Flag for new enhanced data format
  },

  // 学科和年级映射
  subjects: [
    "语文",
    "数学",
    "英语",
    "物理",
    "化学",
    "生物",
    "历史",
    "地理",
    "政治",
    "音乐",
    "美术",
    "体育",
    "其他",
  ],

  grades: [
    "一年级",
    "二年级",
    "三年级",
    "四年级",
    "五年级",
    "六年级",
    "七年级",
    "八年级",
    "九年级",
    "未知",
  ],

  // 年级标准化映射
  gradeMapping: {
    小学一年级: "一年级",
    小学二年级: "二年级",
    小学三年级: "三年级",
    小学四年级: "四年级",
    小学五年级: "五年级",
    小学六年级: "六年级",
    初中一年级: "七年级",
    初中二年级: "八年级",
    初中三年级: "九年级",
    初一: "七年级",
    初二: "八年级",
    初三: "九年级",
  },

  // 健康检查配置
  healthCheck: {
    timeout: 5000,
    retries: 3,
    interval: 30000,
  },
};

module.exports = config;
