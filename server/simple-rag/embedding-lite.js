/**
 * Memory-Efficient Embedding Service
 * Optimized for 4-core CPU, 8GB RAM constraints
 * Replaces heavy transformer models with lightweight alternatives
 */

const path = require('path');
const fs = require('fs').promises;
const config = require('./config');

class EmbeddingLite {
  constructor() {
    this.model = null;
    this.tokenizer = null;
    this.isInitialized = false;
    this.embeddingCache = new Map();
    this.maxCacheSize = 5000;
    this.modelConfig = config.embedding.models[process.env.EMBEDDING_PROFILE || 'balanced'];
  }

  /**
   * Initialize the embedding model
   */
  async initialize() {
    try {
      console.log(`🚀 Initializing ${this.modelConfig.name} embedding model...`);
      
      // Check available memory
      const memUsage = process.memoryUsage();
      const availableMB = (config.memory.maxHeapSize.replace('GB', '') * 1024) - (memUsage.heapUsed / 1024 / 1024);
      
      if (availableMB < 500) {
        console.warn('⚠️ Low memory, using ultra-lite model');
        this.modelConfig = config.embedding.models['ultra-lite'];
      }

      await this.loadModel();
      this.isInitialized = true;
      
      console.log(`✅ Embedding model loaded (${this.modelConfig.memoryUsage})`);
    } catch (error) {
      console.error('❌ Embedding model initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load the appropriate model based on configuration
   */
  async loadModel() {
    try {
      // Try to use ONNX Runtime for better performance
      if (await this.tryLoadONNXModel()) {
        console.log('✅ Using ONNX Runtime for embeddings');
        return;
      }

      // Fallback to Transformers.js
      if (await this.tryLoadTransformersModel()) {
        console.log('✅ Using Transformers.js for embeddings');
        return;
      }

      // Final fallback to simple similarity matching
      console.warn('⚠️ Using simple text similarity as fallback');
      this.useSimpleSimilarity = true;
      
    } catch (error) {
      console.error('Failed to load any embedding model:', error);
      throw new Error('No embedding model could be loaded');
    }
  }

  /**
   * Try loading ONNX model (most efficient)
   */
  async tryLoadONNXModel() {
    try {
      const { InferenceSession } = require('onnxruntime-node');
      
      const modelPath = path.join(config.embedding.modelPath, `${this.modelConfig.name}.onnx`);
      
      // Check if model file exists
      try {
        await fs.access(modelPath);
      } catch {
        console.log('📥 ONNX model not found, downloading...');
        await this.downloadONNXModel(modelPath);
      }

      this.model = await InferenceSession.create(modelPath, {
        executionProviders: ['CPUExecutionProvider'],
        cpuProviders: {
          numThreads: config.embedding.numThreads
        }
      });

      this.modelType = 'onnx';
      return true;
    } catch (error) {
      console.log('ONNX model loading failed:', error.message);
      return false;
    }
  }

  /**
   * Try loading Transformers.js model
   */
  async tryLoadTransformersModel() {
    try {
      const { pipeline, env } = require('@xenova/transformers');
      
      // Configure for CPU-only execution
      env.backends.onnx.wasm.numThreads = config.embedding.numThreads;
      env.backends.onnx.wasm.simd = true;
      
      this.model = await pipeline(
        'feature-extraction',
        this.modelConfig.name,
        {
          device: 'cpu',
          dtype: config.embedding.precision,
          cache_dir: config.embedding.modelPath
        }
      );

      this.modelType = 'transformers';
      return true;
    } catch (error) {
      console.log('Transformers.js loading failed:', error.message);
      return false;
    }
  }

  /**
   * Generate embeddings for text(s)
   */
  async embed(texts) {
    if (!this.isInitialized) {
      throw new Error('Embedding model not initialized');
    }

    // Normalize input
    const inputTexts = Array.isArray(texts) ? texts : [texts];
    const uncachedTexts = [];
    const results = new Array(inputTexts.length);

    // Check cache first
    inputTexts.forEach((text, i) => {
      const cached = this.embeddingCache.get(text);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedTexts.push({ text, index: i });
      }
    });

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const newEmbeddings = await this.generateEmbeddings(uncachedTexts.map(item => item.text));
      
      uncachedTexts.forEach((item, i) => {
        const embedding = newEmbeddings[i];
        results[item.index] = embedding;
        
        // Cache the result
        this.cacheEmbedding(item.text, embedding);
      });
    }

    return Array.isArray(texts) ? results : results[0];
  }

  /**
   * Generate embeddings using the loaded model
   */
  async generateEmbeddings(texts) {
    try {
      if (this.useSimpleSimilarity) {
        return texts.map(text => this.generateSimpleEmbedding(text));
      }

      // Process in batches to manage memory
      const batchSize = config.embedding.batchSize;
      const allEmbeddings = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await this.processBatch(batch);
        allEmbeddings.push(...batchEmbeddings);

        // Force garbage collection if memory is high
        if (i % (batchSize * 4) === 0) {
          if (global.gc) global.gc();
        }
      }

      return allEmbeddings;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Process a batch of texts
   */
  async processBatch(batch) {
    switch (this.modelType) {
      case 'onnx':
        return await this.processONNXBatch(batch);
      case 'transformers':
        return await this.processTransformersBatch(batch);
      default:
        return batch.map(text => this.generateSimpleEmbedding(text));
    }
  }

  /**
   * Process batch with ONNX model
   */
  async processONNXBatch(batch) {
    // Tokenize texts
    const tokenized = batch.map(text => this.tokenizeText(text));
    
    // Run inference
    const feeds = { input_ids: tokenized };
    const results = await this.model.run(feeds);
    
    // Extract embeddings (usually from last_hidden_state)
    const embeddings = results.last_hidden_state || results.embeddings;
    
    return this.processModelOutput(embeddings);
  }

  /**
   * Process batch with Transformers.js
   */
  async processTransformersBatch(batch) {
    const results = await this.model(batch, {
      pooling: 'mean',
      normalize: true
    });

    return results.map(result => Array.from(result.data));
  }

  /**
   * Generate simple embedding based on text features (fallback)
   */
  generateSimpleEmbedding(text) {
    const features = this.extractTextFeatures(text);
    
    // Create a 384-dimensional vector based on text features
    const embedding = new Array(384).fill(0);
    
    // Populate embedding with hashed text features
    for (let i = 0; i < features.length; i++) {
      const hash = this.simpleHash(features[i]);
      embedding[hash % 384] += 1;
    }
    
    // Normalize the vector
    return this.normalizeVector(embedding);
  }

  /**
   * Extract basic text features
   */
  extractTextFeatures(text) {
    const features = [];
    
    // Character n-grams
    for (let i = 0; i < text.length - 2; i++) {
      features.push(text.slice(i, i + 3));
    }
    
    // Word features
    const words = text.split(/\s+/);
    features.push(...words);
    
    // Length features
    features.push(`len_${Math.floor(text.length / 10)}`);
    
    return features;
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Normalize vector to unit length
   */
  normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Cache embedding with LRU eviction
   */
  cacheEmbedding(text, embedding) {
    if (this.embeddingCache.size >= this.maxCacheSize) {
      // Remove oldest entry (LRU)
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    
    this.embeddingCache.set(text, embedding);
  }

  /**
   * Tokenize text for ONNX models
   */
  tokenizeText(text) {
    // Simplified tokenization - in production, use proper tokenizer
    const tokens = text.split(/\s+/).slice(0, config.embedding.maxSequenceLength);
    
    // Convert to token IDs (simplified)
    return tokens.map(token => this.simpleHash(token) % 30000);
  }

  /**
   * Download ONNX model if not exists
   */
  async downloadONNXModel(modelPath) {
    console.log('📥 Downloading ONNX model... (this may take a while)');
    
    // In production, implement actual model downloading
    // For now, create a placeholder
    await fs.writeFile(modelPath, Buffer.from('placeholder-onnx-model'));
    
    console.log('⚠️ Using placeholder ONNX model - implement actual download');
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      model: this.modelConfig.memoryUsage,
      cache: `${Math.round(this.embeddingCache.size * 0.5)} KB`,
      heap: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      cacheHitRate: this.getCacheHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   */
  getCacheHitRate() {
    if (!this.cacheHits && !this.cacheMisses) return 0;
    return this.cacheHits / (this.cacheHits + this.cacheMisses);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Test embedding generation
      const testEmbedding = await this.embed('健康检查测试');
      
      return {
        status: 'healthy',
        modelType: this.modelType || 'simple',
        modelConfig: this.modelConfig.name,
        dimensions: testEmbedding.length,
        memoryUsage: this.getMemoryUsage(),
        cacheSize: this.embeddingCache.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.model && this.model.dispose) {
      await this.model.dispose();
    }
    
    this.embeddingCache.clear();
    this.model = null;
    this.tokenizer = null;
    this.isInitialized = false;
    
    console.log('✅ Embedding service cleaned up');
  }
}

module.exports = EmbeddingLite;