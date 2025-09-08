/**
 * RAG System Initializer
 * Handles complete setup of vector database with educational content
 * Processes 1,556 files (232MB) of enhanced Chinese educational materials
 */

const path = require('path');
const fs = require('fs').promises;
const VectorStoreLite = require('./vector-store-lite');
const SelfHostedEmbeddingService = require('./embedding-service');
const config = require('./config');

class RAGInitializer {
  constructor() {
    this.vectorStore = null;
    this.embeddingService = null;
    this.isInitialized = false;
    this.loadingStats = {
      totalFiles: 0,
      processedFiles: 0,
      totalChunks: 0,
      processedChunks: 0,
      startTime: null,
      errors: []
    };
  }

  /**
   * Initialize complete RAG system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Complete RAG System...');
      this.loadingStats.startTime = Date.now();

      // Initialize vector store
      await this.initializeVectorStore();

      // Initialize embedding service
      await this.initializeEmbeddingService();

      // Check if data loading is needed
      const needsLoading = await this.checkDataLoadingNeeded();

      if (needsLoading) {
        console.log('📚 Loading educational materials (this may take 15-30 minutes)...');
        await this.loadEducationalMaterials();
      } else {
        console.log('✅ Educational materials already loaded');
      }

      // Verify system
      await this.verifySystem();

      this.isInitialized = true;
      console.log('🎉 RAG System initialization completed successfully!');
      this.printSummary();

    } catch (error) {
      console.error('❌ RAG initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize vector store
   */
  async initializeVectorStore() {
    console.log('📊 Initializing vector database...');
    this.vectorStore = new VectorStoreLite();
    await this.vectorStore.initialize();
  }

  /**
   * Initialize self-hosted embedding service
   */
  async initializeEmbeddingService() {
    console.log('🤖 Initializing self-hosted embedding service...');
    this.embeddingService = new SelfHostedEmbeddingService();
    await this.embeddingService.initialize();
  }

  /**
   * Check if data loading is needed
   */
  async checkDataLoadingNeeded() {
    try {
      const stats = await this.vectorStore.getStats();
      
      // Check if we have educational content
      if (stats.totalVectors > 1000) {
        console.log(`   Found ${stats.totalVectors} vectors in database`);
        return false;
      }

      // Check if RAG data files exist
      const ragDataDir = config.documents.ragDataDir;
      const files = await fs.readdir(ragDataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`   Found ${jsonFiles.length} RAG data files to process`);
      this.loadingStats.totalFiles = jsonFiles.length;
      
      return jsonFiles.length > 0;

    } catch (error) {
      console.log('   No existing data found, will load from files');
      return true;
    }
  }

  /**
   * Load educational materials from JSON files
   */
  async loadEducationalMaterials() {
    const ragDataDir = config.documents.ragDataDir;
    
    try {
      const files = await fs.readdir(ragDataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`📁 Processing ${jsonFiles.length} educational material files...`);
      
      // Process files in batches for memory efficiency
      const batchSize = 10; // Process 10 files at a time
      for (let i = 0; i < jsonFiles.length; i += batchSize) {
        const batch = jsonFiles.slice(i, i + batchSize);
        await this.processBatch(batch, ragDataDir);
        
        // Progress update
        const progress = Math.round((i + batch.length) / jsonFiles.length * 100);
        console.log(`   Progress: ${progress}% (${i + batch.length}/${jsonFiles.length} files)`);
        
        // Force garbage collection periodically
        if (global.gc && i % 50 === 0) {
          global.gc();
        }
      }

    } catch (error) {
      console.error('Failed to load educational materials:', error);
      throw error;
    }
  }

  /**
   * Process batch of files
   */
  async processBatch(filenames, ragDataDir) {
    const vectors = [];
    
    for (const filename of filenames) {
      try {
        const filePath = path.join(ragDataDir, filename);
        const chunks = await this.loadChunksFromFile(filePath);
        
        // Filter high-quality chunks
        const qualityChunks = chunks.filter(chunk => 
          chunk.metadata?.qualityMetrics?.ocrConfidence >= 0.5 &&
          chunk.content?.length >= 50
        );

        console.log(`   📖 ${filename}: ${qualityChunks.length}/${chunks.length} quality chunks`);
        
        // Process chunks in sub-batches for embedding
        const embeddingBatchSize = 8;
        for (let i = 0; i < qualityChunks.length; i += embeddingBatchSize) {
          const chunkBatch = qualityChunks.slice(i, i + embeddingBatchSize);
          const batchVectors = await this.processChunkBatch(chunkBatch, filename);
          vectors.push(...batchVectors);

          this.loadingStats.processedChunks += chunkBatch.length;
        }

        this.loadingStats.processedFiles++;

      } catch (error) {
        console.error(`   ❌ Error processing ${filename}:`, error.message);
        this.loadingStats.errors.push({ file: filename, error: error.message });
      }
    }

    // Add vectors to database in batch
    if (vectors.length > 0) {
      await this.vectorStore.addVectors(vectors);
      console.log(`   ✅ Added ${vectors.length} vectors to database`);
    }
  }

  /**
   * Load chunks from JSON file
   */
  async loadChunksFromFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const chunks = JSON.parse(data);
      
      if (!Array.isArray(chunks)) {
        throw new Error('Invalid file format - expected array of chunks');
      }

      this.loadingStats.totalChunks += chunks.length;
      return chunks;

    } catch (error) {
      throw new Error(`Failed to load ${path.basename(filePath)}: ${error.message}`);
    }
  }

  /**
   * Process batch of chunks with embeddings
   */
  async processChunkBatch(chunks, filename) {
    const vectors = [];
    
    try {
      // Extract texts for embedding
      const texts = chunks.map(chunk => this.preprocessText(chunk.content));
      
      // Generate embeddings
      const embeddings = await this.embeddingService.embed(texts);
      
      // Create vector objects
      chunks.forEach((chunk, index) => {
        const bookName = this.extractBookName(filename);
        const subject = this.extractSubject(chunk.metadata?.source || filename);
        const grade = this.extractGrade(chunk.metadata?.source || filename);
        
        vectors.push({
          id: this.generateVectorId(filename, chunk.chunkIndex || index),
          content: chunk.content,
          embedding: embeddings[index],
          metadata: {
            ...chunk.metadata,
            bookName,
            subject,
            grade,
            source: filename
          },
          qualityScore: chunk.metadata?.qualityMetrics?.ocrConfidence || 0.5,
          subject: subject,
          grade: grade,
          bookName: bookName,
          ocrConfidence: chunk.metadata?.qualityMetrics?.ocrConfidence || 1.0
        });
      });

      return vectors;

    } catch (error) {
      console.error(`   Failed to process chunk batch from ${filename}:`, error.message);
      return [];
    }
  }

  /**
   * Preprocess text for embedding
   */
  preprocessText(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Clean and normalize text
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?;:()（）]/g, '') // Keep Chinese, English, numbers, basic punctuation
      .trim()
      .slice(0, 512); // Limit length for embedding model
  }

  /**
   * Extract book name from filename
   */
  extractBookName(filename) {
    return path.basename(filename, '.json')
      .replace(/_[a-f0-9]{8}$/, '') // Remove hash suffix
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9·（）()·\-]/g, '_'); // Clean special chars
  }

  /**
   * Extract subject from source path or filename
   */
  extractSubject(source) {
    const subjectKeywords = {
      '语文': ['语文', 'chinese', '文学'],
      '数学': ['数学', 'math', 'mathematics'],
      '英语': ['英语', 'english', 'yingyu'],
      '物理': ['物理', 'physics', 'wuli'],
      '化学': ['化学', 'chemistry', 'huaxue'],
      '生物': ['生物', 'biology', 'shengwu'],
      '历史': ['历史', 'history', 'lishi'],
      '地理': ['地理', 'geography', 'dili'],
      '政治': ['政治', 'politics', 'zhengzhi'],
      '音乐': ['音乐', 'music', 'yinyue'],
      '美术': ['美术', 'art', 'meishu'],
      '体育': ['体育', 'sports', 'tiyu', '健康']
    };

    const lowerSource = source.toLowerCase();
    
    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (keywords.some(keyword => lowerSource.includes(keyword))) {
        return subject;
      }
    }
    
    return '其他';
  }

  /**
   * Extract grade from source path or filename
   */
  extractGrade(source) {
    const gradePatterns = [
      { pattern: /一年级|1年级|grade1/i, grade: '一年级' },
      { pattern: /二年级|2年级|grade2/i, grade: '二年级' },
      { pattern: /三年级|3年级|grade3/i, grade: '三年级' },
      { pattern: /四年级|4年级|grade4/i, grade: '四年级' },
      { pattern: /五年级|5年级|grade5/i, grade: '五年级' },
      { pattern: /六年级|6年级|grade6/i, grade: '六年级' },
      { pattern: /七年级|7年级|初一|grade7/i, grade: '七年级' },
      { pattern: /八年级|8年级|初二|grade8/i, grade: '八年级' },
      { pattern: /九年级|9年级|初三|grade9/i, grade: '九年级' }
    ];

    for (const { pattern, grade } of gradePatterns) {
      if (pattern.test(source)) {
        return grade;
      }
    }

    return '未知';
  }

  /**
   * Generate unique vector ID
   */
  generateVectorId(filename, chunkIndex) {
    const crypto = require('crypto');
    const base = path.basename(filename, '.json');
    return crypto.createHash('md5')
      .update(`${base}_${chunkIndex}`)
      .digest('hex');
  }

  /**
   * Verify system after initialization
   */
  async verifySystem() {
    console.log('🔍 Verifying RAG system...');

    // Check vector store
    const stats = await this.vectorStore.getStats();
    console.log(`   📊 Database: ${stats.totalVectors} vectors, avg quality: ${stats.averageQuality?.toFixed(2)}`);

    // Check embedding service
    const embeddingHealth = await this.embeddingService.healthCheck();
    console.log(`   🤖 Embeddings: ${embeddingHealth.status}, model: ${embeddingHealth.model}`);

    // Test search functionality
    const testResults = await this.vectorStore.searchSimilar(
      await this.embeddingService.embed('数学'),
      { limit: 3, subject: '数学' }
    );
    console.log(`   🔍 Search test: ${testResults.length} results found`);

    if (stats.totalVectors < 1000 || embeddingHealth.status !== 'healthy' || testResults.length === 0) {
      throw new Error('System verification failed');
    }
  }

  /**
   * Print loading summary
   */
  printSummary() {
    const duration = Math.round((Date.now() - this.loadingStats.startTime) / 1000);
    
    console.log('\n📈 RAG System Summary:');
    console.log(`   ⏱️  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`   📁 Files: ${this.loadingStats.processedFiles}/${this.loadingStats.totalFiles}`);
    console.log(`   📝 Chunks: ${this.loadingStats.processedChunks}/${this.loadingStats.totalChunks}`);
    console.log(`   ❌ Errors: ${this.loadingStats.errors.length}`);
    
    if (this.loadingStats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.loadingStats.errors.slice(0, 5).forEach(error => {
        console.log(`     ${error.file}: ${error.error}`);
      });
      if (this.loadingStats.errors.length > 5) {
        console.log(`     ... and ${this.loadingStats.errors.length - 5} more`);
      }
    }
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      stats: this.loadingStats,
      progress: this.loadingStats.totalFiles > 0 
        ? Math.round(this.loadingStats.processedFiles / this.loadingStats.totalFiles * 100)
        : 0
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up RAG initializer...');
    
    if (this.embeddingService) {
      await this.embeddingService.cleanup();
    }
    
    if (this.vectorStore) {
      await this.vectorStore.cleanup();
    }
    
    this.isInitialized = false;
    console.log('✅ RAG initializer cleaned up');
  }
}

module.exports = RAGInitializer;