const fs = require("fs").promises;
const path = require("path");
const { ChromaClient } = require("chromadb");
const crypto = require("crypto");

// 配置
const CHROMA_PATH = process.env.CHROMA_PATH || `http://${process.env.CHROMA_HOST || "localhost"}:${process.env.CHROMA_PORT || 8000}`;
const COLLECTION_NAME = "lesson_materials";
const RAG_DATA_PATH = path.join(__dirname, "../../rag_data/chunks");
const PROGRESS_FILE = path.join(__dirname, "../data/loading-progress.json");

// 性能优化配置
const OPTIMAL_BATCH_SIZE = 166; // ChromaDB maximum batch size
const CONCURRENT_FILES = 2; // 减少并发以提高稳定性
const MIN_QUALITY_SCORE = 0.3; // 质量分数阈值

// 错误处理和重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1秒基础延迟
const MAX_RETRY_DELAY = 30000; // 最大30秒延迟
const BATCH_TIMEOUT = 60000; // 60秒批次超时

class RobustRAGLoader {
  constructor() {
    this.client = null;
    this.collection = null;
    this.embeddingFunction = null; // Use ChromaDB's default embedding
    this.progress = {
      totalFiles: 0,
      processedFiles: [],
      failedFiles: [],
      totalChunks: 0,
      processedChunks: 0,
      skippedChunks: 0,
      retryCount: 0,
      startTime: null,
      lastSaveTime: null,
      currentBatch: 0,
      estimatedTimeRemaining: null
    };
    this.stats = {
      insertionTimes: [],
      avgInsertionTime: 0,
      totalInsertionTime: 0,
      successfulBatches: 0,
      failedBatches: 0,
      retriedBatches: 0
    };
  }

  async initialize() {
    try {
      console.log("🚀 初始化健壮RAG加载器...");
      
      // 初始化ChromaDB客户端
      this.client = new ChromaClient({ path: CHROMA_PATH });
      console.log(`📡 连接到ChromaDB: ${CHROMA_PATH}`);

      // 测试连接
      await this.testConnection();

      // 删除并重新创建集合以清理旧数据
      await this.cleanupOldData();
      
      // 创建或获取集合
      try {
        this.collection = await this.client.createCollection({
          name: COLLECTION_NAME,
          metadata: {
            "hnsw:space": "cosine",
            description: "Enhanced educational materials with quality scoring"
          }
        });
        console.log(`✅ 创建新集合: ${COLLECTION_NAME}`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`📋 使用现有集合: ${COLLECTION_NAME}`);
          this.collection = await this.client.getCollection({ name: COLLECTION_NAME });
        } else {
          throw error;
        }
      }
      
      // 初始化进度跟踪
      await this.initializeProgress();
      
      return true;
      
    } catch (error) {
      console.error("❌ 初始化失败:", error);
      return false;
    }
  }

  async testConnection() {
    try {
      const heartbeat = await this.client.heartbeat();
      console.log("✅ ChromaDB连接测试成功");
      return true;
    } catch (error) {
      console.error("❌ ChromaDB连接测试失败:", error);
      throw new Error(`ChromaDB连接失败: ${error.message}`);
    }
  }

  async cleanupOldData() {
    try {
      const collections = await this.client.listCollections();
      const existingCollection = collections.find(c => c.name === COLLECTION_NAME);
      
      if (existingCollection) {
        await this.client.deleteCollection({ name: COLLECTION_NAME });
        console.log("🧹 已删除旧的数据库集合");
      } else {
        console.log("ℹ️ 没有找到旧集合，跳过清理");
      }
    } catch (error) {
      console.log("ℹ️ 清理旧数据时出现错误，继续...", error.message);
    }
  }

  async initializeProgress() {
    // 确保数据目录存在
    const progressDir = path.dirname(PROGRESS_FILE);
    await fs.mkdir(progressDir, { recursive: true });
    
    try {
      const progressData = await fs.readFile(PROGRESS_FILE, 'utf-8');
      this.progress = { ...this.progress, ...JSON.parse(progressData) };
      console.log(`📋 恢复进度: ${this.progress.processedFiles.length} 文件已处理`);
    } catch (error) {
      console.log("ℹ️ 没有找到有效的进度文件，将从头开始加载");
      this.progress.startTime = new Date().toISOString();
      
      // 清理旧的进度文件
      try {
        await fs.unlink(PROGRESS_FILE);
        console.log("🧹 已清理旧的进度文件");
      } catch (err) {
        // 忽略删除错误
      }
    }
  }

  async saveProgress() {
    try {
      this.progress.lastSaveTime = new Date().toISOString();
      await fs.writeFile(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.error("保存进度失败:", error);
    }
  }

  async scanAllFiles() {
    try {
      const allFiles = await fs.readdir(RAG_DATA_PATH);
      const jsonFiles = allFiles.filter(file => file.endsWith('.json'));
      
      this.progress.totalFiles = jsonFiles.length;
      this.progress.totalChunks = await this.estimateChunkCount(jsonFiles);
      
      console.log(`📁 扫描到 ${jsonFiles.length} 个数据文件`);
      console.log(`📊 估算总chunks数量: ${this.progress.totalChunks}`);
      
      return jsonFiles;
    } catch (error) {
      console.error("扫描文件失败:", error);
      throw error;
    }
  }

  async estimateChunkCount(files) {
    let totalChunks = 0;
    
    // 采样估算
    const sampleSize = Math.min(50, files.length);
    const sampleFiles = files.slice(0, sampleSize);
    
    for (const file of sampleFiles) {
      try {
        const filePath = path.join(RAG_DATA_PATH, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const chunks = Array.isArray(data) ? data : (data.chunks || []);
        totalChunks += chunks.length;
      } catch (error) {
        // 忽略采样错误
      }
    }
    
    // 根据采样估算总数
    const avgChunksPerFile = totalChunks / sampleSize;
    return Math.round(avgChunksPerFile * files.length);
  }

  async processFileConcurrently(files) {
    const unprocessedFiles = files.filter(file => 
      !this.progress.processedFiles.includes(file) && 
      !this.progress.failedFiles.some(f => f.file === file)
    );
    
    console.log(`🔄 待处理文件数量: ${unprocessedFiles.length}`);
    
    // 分批并发处理文件，减少并发数提高稳定性
    for (let i = 0; i < unprocessedFiles.length; i += CONCURRENT_FILES) {
      const batch = unprocessedFiles.slice(i, i + CONCURRENT_FILES);
      
      // 使用Promise.allSettled确保所有文件都被处理
      const results = await Promise.allSettled(
        batch.map(file => this.processFileWithRetry(file))
      );
      
      // 统计结果
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ 文件 ${batch[index]} 最终失败:`, result.reason);
        }
      });
      
      // 定期保存进度和打印状态
      if (i % (CONCURRENT_FILES * 2) === 0) {
        await this.saveProgress();
        this.printProgress();
      }
    }
  }

  async processFileWithRetry(filename, retryCount = 0) {
    try {
      await this.processFile(filename);
      return true;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(
          RETRY_DELAY_BASE * Math.pow(2, retryCount),
          MAX_RETRY_DELAY
        );
        
        console.log(`🔄 重试文件 ${filename} (${retryCount + 1}/${MAX_RETRIES}) 延迟 ${delay}ms`);
        this.progress.retryCount++;
        
        await this.sleep(delay);
        return this.processFileWithRetry(filename, retryCount + 1);
      } else {
        console.error(`❌ 文件 ${filename} 重试次数已达上限`);
        this.progress.failedFiles.push({ 
          file: filename, 
          reason: `Max retries exceeded: ${error.message}` 
        });
        throw error;
      }
    }
  }

  async processFile(filename) {
    const startTime = Date.now();
    
    try {
      const filePath = path.join(RAG_DATA_PATH, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // 处理增强格式数据
      let chunks = Array.isArray(data) ? data : (data.chunks || []);
      
      if (chunks.length === 0) {
        throw new Error("No valid chunks found");
      }

      // 质量过滤
      const qualityFilteredChunks = chunks.filter(chunk => 
        chunk.content && 
        chunk.content.trim().length > 0 &&
        (!chunk.qualityScore || chunk.qualityScore >= MIN_QUALITY_SCORE)
      );

      if (qualityFilteredChunks.length === 0) {
        throw new Error("All chunks filtered by quality threshold");
      }

      // 批量处理chunks
      await this.processChunksInBatches(qualityFilteredChunks, filename);
      
      // 标记文件处理完成
      this.progress.processedFiles.push(filename);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${filename}: ${qualityFilteredChunks.length} chunks (${processingTime}ms)`);
      
    } catch (error) {
      console.error(`❌ 处理文件 ${filename} 失败:`, error.message);
      throw error;
    }
  }

  async processChunksInBatches(chunks, filename) {
    // 使用最优批次大小
    for (let i = 0; i < chunks.length; i += OPTIMAL_BATCH_SIZE) {
      const batch = chunks.slice(i, i + OPTIMAL_BATCH_SIZE);
      await this.insertBatchWithRetry(batch, filename, i);
      
      this.progress.processedChunks += batch.length;
      this.progress.currentBatch++;
    }
  }

  async insertBatchWithRetry(chunks, filename, startIndex, retryCount = 0) {
    try {
      await Promise.race([
        this.insertBatch(chunks, filename, startIndex),
        this.timeout(BATCH_TIMEOUT)
      ]);
      
      this.stats.successfulBatches++;
      
    } catch (error) {
      this.stats.failedBatches++;
      
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(
          RETRY_DELAY_BASE * Math.pow(2, retryCount),
          MAX_RETRY_DELAY
        );
        
        console.log(`🔄 重试批次 ${filename}:${startIndex} (${retryCount + 1}/${MAX_RETRIES})`);
        this.stats.retriedBatches++;
        
        await this.sleep(delay);
        return this.insertBatchWithRetry(chunks, filename, startIndex, retryCount + 1);
      } else {
        console.error(`❌ 批次 ${filename}:${startIndex} 重试失败，跳过 ${chunks.length} chunks`);
        this.progress.skippedChunks += chunks.length;
        throw error;
      }
    }
  }

  async insertBatch(chunks, filename, startIndex) {
    const batchStartTime = Date.now();
    
    try {
      const ids = [];
      const documents = [];
      const metadatas = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // 生成确定性ID
        const chunkId = this.generateChunkId(filename, startIndex + i, chunk);
        
        // 提取和增强元数据
        const metadata = this.extractEnhancedMetadata(chunk, filename, startIndex + i);
        
        ids.push(chunkId);
        documents.push(chunk.content.trim());
        metadatas.push(metadata);
      }

      // 批量插入 - ChromaDB会自动处理embeddings生成
      await this.collection.add({
        ids: ids,
        documents: documents,
        metadatas: metadatas
      });

      const insertionTime = Date.now() - batchStartTime;
      this.stats.insertionTimes.push(insertionTime);
      this.stats.totalInsertionTime += insertionTime;
      
      // 更新平均插入时间
      this.stats.avgInsertionTime = this.stats.totalInsertionTime / this.stats.insertionTimes.length;
      
    } catch (error) {
      console.error(`❌ 批次插入失败:`, error.message);
      throw error;
    }
  }

  generateChunkId(filename, index, chunk) {
    // 生成确定性ID，便于断点恢复
    const baseString = `${filename}_${index}_${chunk.content.substring(0, 50)}`;
    return crypto.createHash('sha256').update(baseString).digest('hex').substring(0, 16);
  }

  extractEnhancedMetadata(chunk, filename, index) {
    const metadata = {
      source: filename,
      chunk_index: index,
      content_length: chunk.content.length,
      processing_timestamp: new Date().toISOString(),
      
      // 基础元数据
      grade: chunk.metadata?.grade || "未知",
      subject: chunk.metadata?.subject || "其他",
      publisher: chunk.metadata?.publisher || "未知",
      
      // 增强元数据 (v2.0)
      qualityScore: chunk.qualityScore || 1.0,
      ocrConfidence: chunk.ocrConfidence || 1.0,
      enhancementVersion: chunk.enhancementVersion || "1.0",
      
      // 语义特征
      hasFormulas: chunk.semanticFeatures?.hasFormulas || false,
      hasQuestions: chunk.semanticFeatures?.hasQuestions || false,
      hasDefinitions: chunk.semanticFeatures?.hasDefinitions || false,
      contentType: chunk.semanticFeatures?.contentType || "text"
    };

    return metadata;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    );
  }

  printProgress() {
    const processedFiles = this.progress.processedFiles.length;
    const totalFiles = this.progress.totalFiles;
    const processedChunks = this.progress.processedChunks;
    const totalChunks = this.progress.totalChunks;
    const failedFiles = this.progress.failedFiles.length;
    
    const fileProgress = ((processedFiles / totalFiles) * 100).toFixed(1);
    const chunkProgress = ((processedChunks / totalChunks) * 100).toFixed(1);
    
    console.log("\n📊 加载进度报告:");
    console.log(`📁 文件进度: ${processedFiles}/${totalFiles} (${fileProgress}%)`);
    console.log(`📝 Chunks进度: ${processedChunks}/${totalChunks} (${chunkProgress}%)`);
    console.log(`❌ 失败文件: ${failedFiles}`);
    console.log(`🔄 重试次数: ${this.progress.retryCount}`);
    console.log(`⚡ 平均插入时间: ${this.stats.avgInsertionTime.toFixed(0)}ms/批次`);
    console.log(`📊 批次统计: 成功 ${this.stats.successfulBatches}, 失败 ${this.stats.failedBatches}, 重试 ${this.stats.retriedBatches}`);
    
    if (this.progress.estimatedTimeRemaining) {
      const eta = new Date(Date.now() + this.progress.estimatedTimeRemaining);
      console.log(`⏱️ 预计完成时间: ${eta.toLocaleTimeString()}`);
    }
    console.log("");
  }

  async getCollectionStats() {
    try {
      const count = await this.collection.count();
      const stats = {
        totalDocuments: count,
        collectionName: COLLECTION_NAME,
        loadingProgress: this.progress,
        performanceStats: this.stats,
        timestamp: new Date().toISOString()
      };
      
      return stats;
    } catch (error) {
      console.error("获取集合统计失败:", error);
      return null;
    }
  }

  async run() {
    console.log("🚀 开始健壮RAG数据加载...");
    console.log("=" + "=".repeat(60));
    
    try {
      // 初始化
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error("初始化失败");
      }
      
      // 扫描所有文件
      const files = await this.scanAllFiles();
      
      // 并发处理文件
      console.log(`🔄 开始处理 ${files.length} 个文件...`);
      await this.processFileConcurrently(files);
      
      // 最终保存进度
      await this.saveProgress();
      
      // 获取最终统计
      const finalStats = await this.getCollectionStats();
      
      console.log("\n" + "=" + "=".repeat(60));
      console.log("🎉 数据加载完成！");
      console.log("=" + "=".repeat(60));
      console.log(`✅ 成功处理: ${this.progress.processedFiles.length} 文件`);
      console.log(`❌ 失败文件: ${this.progress.failedFiles.length}`);
      console.log(`📝 成功chunks: ${this.progress.processedChunks}`);
      console.log(`⏭️ 跳过chunks: ${this.progress.skippedChunks}`);
      console.log(`🔄 总重试次数: ${this.progress.retryCount}`);
      console.log(`⏱️ 总耗时: ${((Date.now() - new Date(this.progress.startTime).getTime()) / 1000).toFixed(1)}秒`);
      console.log(`📊 最终集合大小: ${finalStats?.totalDocuments || 'N/A'}`);
      console.log(`⚡ 平均插入性能: ${this.stats.avgInsertionTime.toFixed(0)}ms/批次`);
      console.log(`📈 成功率: ${((this.stats.successfulBatches / (this.stats.successfulBatches + this.stats.failedBatches)) * 100).toFixed(1)}%`);
      
      if (this.progress.failedFiles.length > 0) {
        console.log("\n❌ 失败文件列表:");
        this.progress.failedFiles.forEach(f => {
          console.log(`   - ${f.file}: ${f.reason}`);
        });
        
        console.log("\n💡 建议:");
        console.log("   - 检查失败文件的数据格式");
        console.log("   - 运行此脚本将重试失败的文件");
        console.log("   - 考虑降低质量阈值或增加重试次数");
      }
      
      // 清理进度文件
      try {
        await fs.unlink(PROGRESS_FILE);
        console.log("🧹 已清理进度文件");
      } catch (error) {
        // 忽略清理错误
      }
      
      return true;
      
    } catch (error) {
      console.error("❌ 数据加载失败:", error);
      await this.saveProgress(); // 保存错误状态
      return false;
    }
  }
}

// 主函数
async function main() {
  const loader = new RobustRAGLoader();
  
  // 处理中断信号
  process.on('SIGINT', async () => {
    console.log("\n⚠️ 收到中断信号，正在保存进度...");
    await loader.saveProgress();
    console.log("📋 进度已保存，下次运行将从断点恢复");
    process.exit(0);
  });
  
  const success = await loader.run();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = RobustRAGLoader;