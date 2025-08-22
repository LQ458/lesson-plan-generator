const fs = require("fs").promises;
const path = require("path");
const { ChromaClient, DefaultEmbeddingFunction } = require("chromadb");
const crypto = require("crypto");

// 配置
const CHROMA_PATH = process.env.CHROMA_PATH || `http://${process.env.CHROMA_HOST || "localhost"}:${process.env.CHROMA_PORT || 8000}`;
const COLLECTION_NAME = "lesson_materials";
const RAG_DATA_PATH = path.join(__dirname, "../../rag_data/chunks");
const PROGRESS_FILE = path.join(__dirname, "../data/loading-progress.json");
const OLD_OPTIMIZED_PATH = path.join(__dirname, "../../optimized");

// 性能优化配置
const OPTIMAL_BATCH_SIZE = 166; // ChromaDB maximum batch size
const CONCURRENT_FILES = 3; // 同时处理的文件数
const MIN_QUALITY_SCORE = 0.3; // 质量分数阈值

class OptimizedRAGLoader {
  constructor() {
    this.client = null;
    this.collection = null;
    this.embeddingFunction = new DefaultEmbeddingFunction();
    this.progress = {
      totalFiles: 0,
      processedFiles: [],
      failedFiles: [],
      totalChunks: 0,
      processedChunks: 0,
      skippedChunks: 0,
      startTime: null,
      lastSaveTime: null,
      currentBatch: 0,
      estimatedTimeRemaining: null
    };
    this.stats = {
      insertionTimes: [],
      avgInsertionTime: 0,
      totalInsertionTime: 0
    };
  }

  async initialize() {
    try {
      console.log("🚀 初始化优化RAG加载器...");
      
      // 初始化ChromaDB客户端
      this.client = new ChromaClient({ path: CHROMA_PATH });
      console.log(`📡 连接到ChromaDB: ${CHROMA_PATH}`);

      // 删除并重新创建集合以清理旧数据
      await this.cleanupOldData();

      // 创建新集合，使用优化配置
      this.collection = await this.client.createCollection({
        name: COLLECTION_NAME,
        metadata: {
          "hnsw:space": "cosine", // 使用余弦相似度
          "hnsw:batch_size": 200, // 增大批次大小提升插入性能
          "hnsw:M": 16, // HNSW参数优化
          description: "优化的教学资料向量数据库 v2.0",
          version: "2.0.0",
          created_at: new Date().toISOString(),
          data_source: "enhanced_rag_data",
          quality_threshold: MIN_QUALITY_SCORE
        },
        embeddingFunction: this.embeddingFunction,
      });
      
      console.log(`✅ 创建优化集合: ${COLLECTION_NAME}`);
      
      // 加载进度文件
      await this.loadProgress();
      
      return true;
    } catch (error) {
      console.error("❌ 初始化失败:", error);
      return false;
    }
  }

  async cleanupOldData() {
    try {
      // 删除旧的集合
      try {
        await this.client.deleteCollection({ name: COLLECTION_NAME });
        console.log("🧹 已删除旧的数据库集合");
      } catch (error) {
        // 集合不存在，忽略错误
        console.log("ℹ️ 没有找到旧集合，跳过清理");
      }

      // 清理旧的优化数据目录
      try {
        const oldDataExists = await fs.access(OLD_OPTIMIZED_PATH).then(() => true).catch(() => false);
        if (oldDataExists) {
          const files = await fs.readdir(OLD_OPTIMIZED_PATH);
          console.log(`🗑️ 发现 ${files.length} 个旧数据文件，开始清理...`);
          
          // 移动到备份目录而不是直接删除
          const backupDir = path.join(OLD_OPTIMIZED_PATH, "../optimized_backup_" + Date.now());
          await fs.mkdir(backupDir, { recursive: true });
          await fs.rename(OLD_OPTIMIZED_PATH, backupDir);
          
          console.log(`✅ 旧数据已备份到: ${backupDir}`);
        }
      } catch (error) {
        console.log("ℹ️ 旧数据目录不存在或已清理");
      }

      // 清理进度文件
      try {
        await fs.unlink(PROGRESS_FILE);
        console.log("🧹 已清理旧的进度文件");
      } catch (error) {
        // 进度文件不存在，忽略
      }

    } catch (error) {
      console.warn("⚠️ 清理旧数据时出现警告:", error.message);
    }
  }

  async loadProgress() {
    try {
      const progressData = await fs.readFile(PROGRESS_FILE, 'utf-8');
      const savedProgress = JSON.parse(progressData);
      
      // 验证进度文件的有效性
      if (savedProgress.startTime && savedProgress.totalFiles > 0) {
        this.progress = { ...this.progress, ...savedProgress };
        console.log(`📋 恢复进度: ${this.progress.processedFiles.length}/${this.progress.totalFiles} 文件已处理`);
        console.log(`📊 已处理 ${this.progress.processedChunks} chunks`);
        return true;
      }
    } catch (error) {
      console.log("ℹ️ 没有找到有效的进度文件，将从头开始加载");
    }
    
    // 重置进度
    this.progress.startTime = new Date().toISOString();
    this.progress.processedFiles = [];
    this.progress.failedFiles = [];
    return false;
  }

  async saveProgress() {
    try {
      // 确保目录存在
      await fs.mkdir(path.dirname(PROGRESS_FILE), { recursive: true });
      
      // 添加统计信息
      this.progress.lastSaveTime = new Date().toISOString();
      this.progress.avgInsertionTime = this.stats.avgInsertionTime;
      this.progress.totalInsertionTime = this.stats.totalInsertionTime;
      
      // 计算预估剩余时间
      if (this.stats.avgInsertionTime > 0) {
        const remainingChunks = this.progress.totalChunks - this.progress.processedChunks;
        const remainingBatches = Math.ceil(remainingChunks / OPTIMAL_BATCH_SIZE);
        this.progress.estimatedTimeRemaining = remainingBatches * this.stats.avgInsertionTime;
      }
      
      await fs.writeFile(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.warn("⚠️ 保存进度失败:", error.message);
    }
  }

  async scanAllFiles() {
    const files = await fs.readdir(RAG_DATA_PATH);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    this.progress.totalFiles = jsonFiles.length;
    console.log(`📁 扫描到 ${jsonFiles.length} 个数据文件`);
    
    // 预扫描计算总chunks数量（用于进度显示）
    let totalChunks = 0;
    const sampleFiles = jsonFiles.slice(0, Math.min(5, jsonFiles.length));
    
    for (const file of sampleFiles) {
      try {
        const filePath = path.join(RAG_DATA_PATH, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const chunks = Array.isArray(data) ? data : (data.chunks || []);
        totalChunks += chunks.length;
      } catch (error) {
        console.warn(`⚠️ 预扫描文件 ${file} 失败:`, error.message);
      }
    }
    
    // 估算总chunks数量
    if (sampleFiles.length > 0) {
      const avgChunksPerFile = totalChunks / sampleFiles.length;
      this.progress.totalChunks = Math.ceil(avgChunksPerFile * jsonFiles.length);
      console.log(`📊 估算总chunks数量: ${this.progress.totalChunks}`);
    }
    
    return jsonFiles;
  }

  async processFileConcurrently(files) {
    const unprocessedFiles = files.filter(file => 
      !this.progress.processedFiles.includes(file) && 
      !this.progress.failedFiles.some(f => f.file === file)
    );
    
    console.log(`🔄 待处理文件数量: ${unprocessedFiles.length}`);
    
    // 分批并发处理文件
    for (let i = 0; i < unprocessedFiles.length; i += CONCURRENT_FILES) {
      const batch = unprocessedFiles.slice(i, i + CONCURRENT_FILES);
      const promises = batch.map(file => this.processFile(file));
      
      await Promise.allSettled(promises);
      
      // 定期保存进度
      if (i % (CONCURRENT_FILES * 2) === 0) {
        await this.saveProgress();
        this.printProgress();
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
        console.warn(`⚠️ 文件 ${filename} 没有有效数据`);
        this.progress.failedFiles.push({ file: filename, reason: "No valid chunks" });
        return;
      }

      // 质量过滤
      const qualityFilteredChunks = chunks.filter(chunk => 
        chunk.content && 
        chunk.content.trim().length > 0 &&
        (!chunk.qualityScore || chunk.qualityScore >= MIN_QUALITY_SCORE)
      );

      if (qualityFilteredChunks.length === 0) {
        console.warn(`⚠️ 文件 ${filename} 所有chunks都被质量过滤`);
        this.progress.failedFiles.push({ file: filename, reason: "All chunks filtered by quality" });
        return;
      }

      // 批量处理chunks
      await this.processChunksInBatches(qualityFilteredChunks, filename);
      
      // 标记文件处理完成
      this.progress.processedFiles.push(filename);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${filename}: ${qualityFilteredChunks.length} chunks (${processingTime}ms)`);
      
    } catch (error) {
      console.error(`❌ 处理文件 ${filename} 失败:`, error.message);
      this.progress.failedFiles.push({ file: filename, reason: error.message });
    }
  }

  async processChunksInBatches(chunks, filename) {
    // 使用最优批次大小
    for (let i = 0; i < chunks.length; i += OPTIMAL_BATCH_SIZE) {
      const batch = chunks.slice(i, i + OPTIMAL_BATCH_SIZE);
      await this.insertBatch(batch, filename, i);
      
      this.progress.processedChunks += batch.length;
      this.progress.currentBatch++;
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
        // 不传入embeddings，让ChromaDB自动生成
      });

      const insertionTime = Date.now() - batchStartTime;
      this.stats.insertionTimes.push(insertionTime);
      this.stats.totalInsertionTime += insertionTime;
      
      // 更新平均插入时间
      this.stats.avgInsertionTime = this.stats.totalInsertionTime / this.stats.insertionTimes.length;
      
    } catch (error) {
      console.error(`❌ 批次插入失败:`, error);
      this.progress.skippedChunks += chunks.length;
      throw error;
    }
  }

  generateChunkId(filename, index, chunk) {
    // 生成确定性ID，便于断点恢复
    const baseString = `${filename}_${index}_${chunk.content.substring(0, 50)}`;
    return crypto.createHash('sha256').update(baseString).digest('hex').substring(0, 16);
  }

  extractEnhancedMetadata(chunk, filename, index) {
    // 从文件名提取基本信息
    const subject = this.extractSubjectFromFilename(filename);
    const grade = this.extractGradeFromFilename(filename);
    const materialName = this.extractMaterialName(filename);
    
    return {
      // 基本信息
      source: filename,
      chunk_index: index,
      subject: subject,
      grade: grade,
      material_name: materialName,
      content_length: chunk.content.length,
      created_at: new Date().toISOString(),
      loader_version: "2.0.0",
      
      // 增强质量指标
      qualityScore: chunk.qualityScore || 0.5,
      reliability: chunk.reliability || "medium",
      enhancementVersion: chunk.metadata?.enhancementVersion || "2.0",
      
      // OCR和处理信息
      ocrConfidence: chunk.metadata?.qualityMetrics?.ocrConfidence,
      chineseCharRatio: chunk.metadata?.qualityMetrics?.chineseCharRatio,
      lengthScore: chunk.metadata?.qualityMetrics?.lengthScore,
      coherenceScore: chunk.metadata?.qualityMetrics?.coherenceScore,
      
      // 语义特征
      hasFormulas: chunk.semanticFeatures?.hasFormulas || false,
      hasNumbers: chunk.semanticFeatures?.hasNumbers || false,
      hasExperiment: chunk.semanticFeatures?.hasExperiment || false,
      hasDefinition: chunk.semanticFeatures?.hasDefinition || false,
      hasQuestion: chunk.semanticFeatures?.hasQuestion || false,
      isTableContent: chunk.semanticFeatures?.isTableContent || false,
      subjectArea: chunk.semanticFeatures?.subjectArea || subject,
      
      // 性能统计
      batchNumber: this.progress.currentBatch,
      processingTimestamp: Date.now()
    };
  }

  extractSubjectFromFilename(filename) {
    const subjects = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "音乐", "美术", "体育", "科学", "道德与法治"];
    return subjects.find(s => filename.includes(s)) || "通用";
  }

  extractGradeFromFilename(filename) {
    const gradeMatch = filename.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/);
    return gradeMatch ? gradeMatch[1] : "通用";
  }

  extractMaterialName(filename) {
    return filename.replace('.json', '').replace(/^.*_/, '');
  }

  printProgress() {
    const processedFiles = this.progress.processedFiles.length;
    const failedFiles = this.progress.failedFiles.length;
    const totalFiles = this.progress.totalFiles;
    const processedChunks = this.progress.processedChunks;
    const totalChunks = this.progress.totalChunks;
    
    const fileProgress = totalFiles > 0 ? ((processedFiles / totalFiles) * 100).toFixed(1) : 0;
    const chunkProgress = totalChunks > 0 ? ((processedChunks / totalChunks) * 100).toFixed(1) : 0;
    
    console.log(`\n📊 加载进度报告:`);
    console.log(`📁 文件进度: ${processedFiles}/${totalFiles} (${fileProgress}%)`);
    console.log(`📝 Chunks进度: ${processedChunks}/${totalChunks} (${chunkProgress}%)`);
    console.log(`❌ 失败文件: ${failedFiles}`);
    console.log(`⚡ 平均插入时间: ${this.stats.avgInsertionTime.toFixed(0)}ms/批次`);
    
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
    console.log("🚀 开始优化RAG数据加载...");
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
      console.log(`📝 总chunks: ${this.progress.processedChunks}`);
      console.log(`⏱️ 总耗时: ${((Date.now() - new Date(this.progress.startTime).getTime()) / 1000).toFixed(1)}秒`);
      console.log(`📊 最终集合大小: ${finalStats?.totalDocuments || 'N/A'}`);
      console.log(`⚡ 平均插入性能: ${this.stats.avgInsertionTime.toFixed(0)}ms/批次`);
      
      if (this.progress.failedFiles.length > 0) {
        console.log("\n❌ 失败文件列表:");
        this.progress.failedFiles.forEach(f => {
          console.log(`   - ${f.file}: ${f.reason}`);
        });
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
  const loader = new OptimizedRAGLoader();
  
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
  main().catch(error => {
    console.error("❌ 程序执行失败:", error);
    process.exit(1);
  });
}

module.exports = OptimizedRAGLoader;