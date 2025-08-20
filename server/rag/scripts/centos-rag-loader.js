const fs = require("fs").promises;
const path = require("path");
const ChromaDBHTTPClient = require("../services/chromadb-http-client");

// 配置 - CentOS 8 优化
const CHROMA_URL = process.env.CHROMA_PATH || `http://${process.env.CHROMA_HOST || "localhost"}:${process.env.CHROMA_PORT || 8000}`;
const COLLECTION_NAME = "teachai_centos";
const RAG_DATA_PATH = path.join(__dirname, "../../rag_data/chunks");
const PROGRESS_FILE = path.join(__dirname, "../data/centos-loading-progress.json");

// CentOS 8 特定优化配置
const BATCH_SIZE = 50; // 较小批次，避免内存问题
const CONCURRENT_FILES = 1; // CentOS 8 单线程处理更稳定
const MIN_QUALITY_SCORE = 0.3;
const MAX_RETRIES = 3;

class CentOSRAGLoader {
  constructor() {
    this.client = new ChromaDBHTTPClient(CHROMA_URL);
    this.progress = {
      totalFiles: 0,
      processedFiles: [],
      failedFiles: [],
      totalChunks: 0,
      processedChunks: 0,
      startTime: null,
      currentFile: 0
    };
    this.stats = {
      successfulBatches: 0,
      failedBatches: 0,
      avgProcessingTime: 0
    };
  }

  async initialize() {
    try {
      console.log("🐧 初始化CentOS 8 RAG加载器...");
      console.log(`📡 连接到ChromaDB: ${CHROMA_URL}`);
      
      // 测试连接
      await this.client.heartbeat();
      console.log("✅ ChromaDB连接成功");
      
      // 创建数据目录
      const progressDir = path.dirname(PROGRESS_FILE);
      await fs.mkdir(progressDir, { recursive: true });
      
      // 清理现有集合
      await this.cleanupCollection();
      
      // 创建新集合
      await this.client.createCollection(COLLECTION_NAME, {
        "hnsw:space": "cosine",
        description: "TeachAI CentOS 8 教学资料",
        created_at: new Date().toISOString()
      });
      console.log(`✅ 创建集合: ${COLLECTION_NAME}`);
      
      // 加载或初始化进度
      await this.loadProgress();
      
      return true;
    } catch (error) {
      console.error("❌ 初始化失败:", error.message);
      return false;
    }
  }

  async cleanupCollection() {
    try {
      const collections = await this.client.listCollections();
      const existing = collections.find(c => c.name === COLLECTION_NAME);
      
      if (existing) {
        console.log(`🗑️ 删除现有集合: ${COLLECTION_NAME}`);
        await this.client.deleteCollection(COLLECTION_NAME);
        console.log("✅ 删除成功");
      }
    } catch (error) {
      console.log("ℹ️ 清理集合时出现问题，继续...", error.message);
    }
  }

  async loadProgress() {
    try {
      const progressData = await fs.readFile(PROGRESS_FILE, 'utf-8');
      const savedProgress = JSON.parse(progressData);
      this.progress = { ...this.progress, ...savedProgress };
      console.log(`📋 恢复进度: ${this.progress.processedFiles.length} 文件已处理`);
    } catch (error) {
      console.log("ℹ️ 开始新的加载任务");
      this.progress.startTime = new Date().toISOString();
      await this.saveProgress();
    }
  }

  async saveProgress() {
    try {
      await fs.writeFile(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.log("⚠️ 保存进度失败:", error.message);
    }
  }

  async loadAllData() {
    try {
      const files = await fs.readdir(RAG_DATA_PATH);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      this.progress.totalFiles = jsonFiles.length;
      console.log(`📁 找到 ${jsonFiles.length} 个数据文件`);
      
      // 估算总chunks
      let estimatedChunks = 0;
      for (let i = 0; i < Math.min(10, jsonFiles.length); i++) {
        try {
          const samplePath = path.join(RAG_DATA_PATH, jsonFiles[i]);
          const sampleContent = await fs.readFile(samplePath, 'utf-8');
          const sampleData = JSON.parse(sampleContent);
          const chunks = Array.isArray(sampleData) ? sampleData : (sampleData.chunks || []);
          estimatedChunks += chunks.length;
        } catch (e) {
          // 忽略采样错误
        }
      }
      
      this.progress.totalChunks = Math.floor((estimatedChunks / Math.min(10, jsonFiles.length)) * jsonFiles.length);
      console.log(`📊 估计总chunks: ${this.progress.totalChunks}`);
      
      // 处理文件
      for (let i = this.progress.currentFile; i < jsonFiles.length; i++) {
        const filename = jsonFiles[i];
        
        // 跳过已处理的文件
        if (this.progress.processedFiles.includes(filename)) {
          console.log(`⏭️ 跳过已处理文件: ${filename}`);
          continue;
        }
        
        this.progress.currentFile = i;
        console.log(`📄 处理文件 ${i + 1}/${jsonFiles.length}: ${filename}`);
        
        try {
          await this.processFile(filename);
          this.progress.processedFiles.push(filename);
          
          // CentOS 8: 每处理5个文件保存一次进度
          if ((i + 1) % 5 === 0) {
            await this.saveProgress();
            console.log(`💾 进度已保存 (${i + 1}/${jsonFiles.length})`);
          }
          
          // CentOS 8: 添加小延迟避免系统过载
          await this.sleep(100);
          
        } catch (error) {
          console.error(`❌ 处理文件失败 ${filename}:`, error.message);
          this.progress.failedFiles.push({
            file: filename,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // 最终保存进度
      await this.saveProgress();
      
      // 显示统计
      await this.showFinalStats();
      
    } catch (error) {
      console.error("❌ 加载数据失败:", error.message);
      await this.saveProgress();
    }
  }

  async processFile(filename) {
    const startTime = Date.now();
    
    try {
      const filePath = path.join(RAG_DATA_PATH, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // 处理chunks
      let chunks = Array.isArray(data) ? data : (data.chunks || []);
      
      if (chunks.length === 0) {
        console.log(`⚠️ 文件无有效chunks: ${filename}`);
        return;
      }
      
      // 质量过滤
      const qualityChunks = chunks.filter(chunk => 
        chunk.content && 
        typeof chunk.content === 'string' &&
        chunk.content.trim().length >= 10 &&
        (!chunk.qualityScore || chunk.qualityScore >= MIN_QUALITY_SCORE)
      );
      
      if (qualityChunks.length === 0) {
        console.log(`⚠️ 文件所有chunks被质量过滤: ${filename}`);
        return;
      }
      
      console.log(`📦 处理 ${qualityChunks.length}/${chunks.length} chunks`);
      
      // 分批处理 - CentOS 8 小批次
      for (let i = 0; i < qualityChunks.length; i += BATCH_SIZE) {
        const batch = qualityChunks.slice(i, i + BATCH_SIZE);
        await this.processBatch(batch, filename, i);
        
        // CentOS 8: 批次间暂停
        if (i + BATCH_SIZE < qualityChunks.length) {
          await this.sleep(50);
        }
      }
      
      this.progress.processedChunks += qualityChunks.length;
      const processingTime = Date.now() - startTime;
      console.log(`✅ 文件处理完成 (${processingTime}ms)`);
      
    } catch (error) {
      console.error(`❌ 文件处理错误:`, error.message);
      throw error;
    }
  }

  async processBatch(chunks, filename, batchIndex) {
    try {
      const ids = [];
      const documents = [];
      const metadatas = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${filename}_${batchIndex + i}_${Date.now()}`;
        
        // 元数据
        const metadata = {
          source: filename,
          chunk_index: batchIndex + i,
          content_length: chunk.content.length,
          quality_score: chunk.qualityScore || 0.5,
          created_at: new Date().toISOString(),
          // CentOS 8标记
          system: "centos8",
          loader_version: "1.0"
        };
        
        ids.push(chunkId);
        documents.push(chunk.content.trim());
        metadatas.push(metadata);
      }
      
      // 使用HTTP API插入
      await this.client.addDocuments(COLLECTION_NAME, {
        ids,
        documents,
        metadatas
      });
      
      this.stats.successfulBatches++;
      console.log(`✅ 批次插入成功: ${chunks.length} chunks`);
      
    } catch (error) {
      this.stats.failedBatches++;
      console.error(`❌ 批次插入失败:`, error.message);
      throw error;
    }
  }

  async showFinalStats() {
    try {
      const count = await this.client.countCollection(COLLECTION_NAME);
      
      console.log("\n🎉 RAG数据加载完成!");
      console.log("=" * 50);
      console.log(`📊 总文件数: ${this.progress.totalFiles}`);
      console.log(`✅ 成功文件: ${this.progress.processedFiles.length}`);
      console.log(`❌ 失败文件: ${this.progress.failedFiles.length}`);
      console.log(`📦 总chunks: ${this.progress.processedChunks}`);
      console.log(`🗄️ 数据库记录: ${count}`);
      console.log(`⏱️ 开始时间: ${this.progress.startTime}`);
      console.log(`🏁 完成时间: ${new Date().toISOString()}`);
      
      // 测试查询
      await this.testQuery();
      
    } catch (error) {
      console.error("❌ 统计显示失败:", error.message);
    }
  }

  async testQuery() {
    try {
      console.log("\n🔍 测试查询功能...");
      const results = await this.client.queryCollection(COLLECTION_NAME, {
        queryTexts: ["数学教学"],
        nResults: 3
      });
      
      if (results && results.documents && results.documents[0]) {
        console.log(`✅ 查询成功! 返回 ${results.documents[0].length} 个结果`);
        console.log(`📄 示例内容: ${results.documents[0][0].substring(0, 100)}...`);
      } else {
        console.log("⚠️ 查询返回空结果");
      }
    } catch (error) {
      console.error("❌ 测试查询失败:", error.message);
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 信号处理 - CentOS 8
process.on('SIGINT', async () => {
  console.log('\n⚠️ 收到中断信号，正在保存进度...');
  // 这里可以添加清理逻辑
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ 收到终止信号，正在保存进度...');
  process.exit(0);
});

async function main() {
  const loader = new CentOSRAGLoader();
  
  console.log("🐧 启动CentOS 8 RAG数据加载器");
  console.log(`🖥️ 系统信息: ${process.platform} ${process.arch}`);
  console.log(`📁 数据目录: ${RAG_DATA_PATH}`);
  console.log(`🌐 ChromaDB: ${CHROMA_URL}`);
  
  if (await loader.initialize()) {
    await loader.loadAllData();
  } else {
    console.error("❌ 初始化失败，退出");
    process.exit(1);
  }
}

main().catch(error => {
  console.error("❌ 加载器崩溃:", error);
  process.exit(1);
});