/**
 * Simplified RAG Configuration for Resource-Constrained Deployment
 * Optimized for: 4-core CPU, 8GB RAM, 100GB storage
 */

const path = require('path');

module.exports = {
  // Vector Database Configuration
  database: {
    type: process.env.RAG_DB_TYPE || 'sqlite-vss', // 'sqlite-vss' | 'chromadb-lite' | 'memory'
    
    sqlite: {
      path: process.env.RAG_SQLITE_PATH || path.join(__dirname, '../../data/vectors.db'),
      maxMemory: '2GB',
      pageSize: 4096,
      cacheSize: '256MB',
      
      // Vector configuration
      vectorTable: 'educational_vectors',
      dimensions: 384,
      indexType: 'ivf', // ivf | hnsw
      distanceMetric: 'cosine'
    },
    
    // Fallback ChromaDB configuration (minimal)
    chromadb: {
      host: process.env.CHROMA_HOST || 'localhost',
      port: process.env.CHROMA_PORT || 8000,
      collection: 'teachai_simple',
      maxBatchSize: 50, // Reduced from 166
      memoryLimit: '1GB'
    }
  },

  // Embedding Model Configuration
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'multilingual-e5-small',
    modelPath: path.join(__dirname, '../../models/embedding'),
    
    // Model options by resource constraint
    models: {
      'ultra-lite': {
        name: 'all-MiniLM-L6-v2-Q8',
        dimensions: 384,
        memoryUsage: '23MB',
        performance: 'fast'
      },
      'balanced': {
        name: 'multilingual-e5-small',
        dimensions: 384, 
        memoryUsage: '118MB',
        performance: 'good'
      },
      'quality': {
        name: 'multilingual-e5-base',
        dimensions: 768,
        memoryUsage: '278MB', 
        performance: 'best'
      }
    },
    
    // Runtime settings
    batchSize: 8, // Process 8 texts at once
    maxSequenceLength: 512,
    precision: 'fp16', // fp32 | fp16 | int8
    deviceMap: 'cpu',
    numThreads: 2 // Leave 2 cores for other processes
  },

  // Search Configuration
  search: {
    defaultLimit: 5,
    maxLimit: 15, // Reduced from 20
    minSimilarityThreshold: 0.35, // Slightly higher for quality
    
    // Multi-stage search
    stages: {
      vector: {
        enabled: true,
        weight: 0.7,
        candidates: 20 // Get top 20 candidates
      },
      rerank: {
        enabled: true,
        weight: 0.3,
        method: 'quality_score' // quality_score | cross_encoder
      },
      filter: {
        enabled: true,
        minQualityScore: 0.3,
        excludeLowOCR: true
      }
    }
  },

  // Memory Management
  memory: {
    maxHeapSize: '6GB', // Leave 2GB for system
    vectorCacheSize: '1GB',
    embeddingCacheSize: '512MB', 
    metadataCacheSize: '256MB',
    
    // Garbage collection
    gcInterval: 300000, // 5 minutes
    forceGCThreshold: 0.85, // Force GC at 85% memory usage
    
    // Connection pooling
    maxConnections: 20,
    connectionTimeout: 10000
  },

  // Data Processing
  processing: {
    chunkSize: 500, // Tokens per chunk
    chunkOverlap: 50,
    batchProcessingSize: 20, // Process 20 documents at once
    
    // Quality filters
    minChunkLength: 20,
    maxChunkLength: 1000,
    minQualityScore: 0.3,
    removeDuplicates: true,
    duplicateThreshold: 0.95
  },

  // Storage Optimization
  storage: {
    compression: {
      enabled: true,
      algorithm: 'gzip', // gzip | lz4 | zstd
      level: 6 // 1-9, higher = better compression
    },
    
    // Data lifecycle
    backupEnabled: true,
    backupRetention: 7, // days
    archiveOldData: true,
    archiveAfterDays: 90,
    
    // File paths
    dataDir: process.env.RAG_DATA_DIR || path.join(__dirname, '../../data'),
    backupDir: process.env.RAG_BACKUP_DIR || path.join(__dirname, '../../backups'),
    tempDir: process.env.RAG_TEMP_DIR || '/tmp/teachai-rag'
  },

  // Performance Monitoring
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    healthCheckInterval: 30000, // 30 seconds
    
    thresholds: {
      memoryUsage: 0.85, // 85%
      responseTime: 1000, // 1 second
      errorRate: 0.05, // 5%
      cpuUsage: 0.80 // 80%
    },
    
    alerts: {
      webhook: process.env.ALERT_WEBHOOK,
      email: process.env.ALERT_EMAIL,
      logLevel: 'warn'
    }
  },

  // API Configuration
  api: {
    rateLimiting: {
      windowMs: 60000, // 1 minute
      maxRequests: 120, // 2 requests per second
      skipSuccessfulRequests: false
    },
    
    caching: {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 1000, // 1000 cached queries
      algorithm: 'lru'
    },
    
    timeouts: {
      search: 5000, // 5 seconds
      embed: 10000, // 10 seconds
      total: 15000 // 15 seconds
    }
  },

  // Development vs Production
  development: {
    enableDebugLogs: true,
    verbose: true,
    mockEmbeddings: false,
    skipDataValidation: false
  },

  production: {
    enableDebugLogs: false,
    verbose: false,
    optimizeMemory: true,
    strictValidation: true,
    
    // Production-specific optimizations
    preloadEmbeddings: true,
    warmupQueries: 5,
    enableProfiling: false
  }
};