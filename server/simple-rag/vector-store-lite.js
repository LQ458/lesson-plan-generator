/**
 * Lightweight Vector Store Implementation
 * Replaces the 37k-line vector-store.js with a simplified 200-line version
 * Optimized for: 4-core CPU, 8GB RAM, 100GB storage
 */

const Database = require('sqlite3').Database;
const path = require('path');
const fs = require('fs').promises;
const config = require('./config');

class VectorStoreLite {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.vectorCache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    try {
      const dbPath = config.database.sqlite.path;
      await this.ensureDirectory(path.dirname(dbPath));
      
      this.db = new Database(dbPath);
      await this.setupTables();
      await this.loadVSSExtension();
      
      this.isInitialized = true;
      console.log('✅ Vector store initialized successfully');
    } catch (error) {
      console.error('❌ Vector store initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup database tables and indexes
   */
  async setupTables() {
    const queries = [
      // Main vectors table
      `CREATE TABLE IF NOT EXISTS ${config.database.sqlite.vectorTable} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        quality_score REAL DEFAULT 0.5,
        subject TEXT,
        grade TEXT,
        book_name TEXT,
        ocr_confidence REAL DEFAULT 1.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Search optimization indexes
      `CREATE INDEX IF NOT EXISTS idx_quality_score ON ${config.database.sqlite.vectorTable}(quality_score)`,
      `CREATE INDEX IF NOT EXISTS idx_subject_grade ON ${config.database.sqlite.vectorTable}(subject, grade)`,
      `CREATE INDEX IF NOT EXISTS idx_book_name ON ${config.database.sqlite.vectorTable}(book_name)`,
      
      // Vector similarity index (will be created after loading VSS extension)
      `CREATE VIRTUAL TABLE IF NOT EXISTS vss_vectors USING vss0(
        embedding(${config.database.sqlite.dimensions})
      )`
    ];

    for (const query of queries) {
      await this.runQuery(query);
    }
  }

  /**
   * Load SQLite-VSS extension for vector similarity search
   */
  async loadVSSExtension() {
    try {
      // Load VSS extension - adjust path based on your installation
      await this.runQuery("SELECT load_extension('vss0')");
      console.log('✅ SQLite-VSS extension loaded');
    } catch (error) {
      console.warn('⚠️ VSS extension not loaded, falling back to cosine similarity calculation');
      this.useBuiltinSimilarity = true;
    }
  }

  /**
   * Add vectors to the store
   */
  async addVectors(vectors) {
    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await this.insertBatch(batch);
      processed += batch.length;
      
      if (processed % 1000 === 0) {
        console.log(`📥 Processed ${processed}/${vectors.length} vectors`);
      }
    }

    console.log(`✅ Added ${vectors.length} vectors to store`);
  }

  /**
   * Insert batch of vectors
   */
  async insertBatch(vectors) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${config.database.sqlite.vectorTable}
      (id, content, embedding, metadata, quality_score, subject, grade, book_name, ocr_confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.serialize(() => {
      this.db.run('BEGIN TRANSACTION');
      
      vectors.forEach(vector => {
        const embedding = Buffer.from(new Float32Array(vector.embedding).buffer);
        const metadata = JSON.stringify(vector.metadata || {});
        
        stmt.run([
          vector.id,
          vector.content,
          embedding,
          metadata,
          vector.qualityScore || 0.5,
          vector.subject || '未知',
          vector.grade || '未知',
          vector.bookName || '未知',
          vector.ocrConfidence || 1.0
        ]);
      });
      
      this.db.run('COMMIT');
    });

    stmt.finalize();
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(queryEmbedding, options = {}) {
    const {
      limit = config.search.defaultLimit,
      minSimilarity = config.search.minSimilarityThreshold,
      subject,
      grade,
      bookName,
      minQualityScore = 0.3
    } = options;

    let whereClause = 'WHERE quality_score >= ?';
    let params = [minQualityScore];

    // Add filters
    if (subject) {
      whereClause += ' AND subject = ?';
      params.push(subject);
    }
    if (grade) {
      whereClause += ' AND grade = ?';
      params.push(grade);
    }
    if (bookName) {
      whereClause += ' AND book_name = ?';
      params.push(bookName);
    }

    let results;
    if (this.useBuiltinSimilarity) {
      results = await this.searchWithBuiltinSimilarity(queryEmbedding, whereClause, params, limit);
    } else {
      results = await this.searchWithVSS(queryEmbedding, whereClause, params, limit);
    }

    // Filter by similarity threshold
    return results.filter(result => result.similarity >= minSimilarity);
  }

  /**
   * Search using VSS extension (fast)
   */
  async searchWithVSS(queryEmbedding, whereClause, params, limit) {
    const queryBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
    
    const query = `
      SELECT 
        v.*,
        vss.distance,
        (1 - vss.distance) as similarity
      FROM ${config.database.sqlite.vectorTable} v
      JOIN vss_vectors vss ON v.rowid = vss.rowid
      ${whereClause}
      ORDER BY vss.distance ASC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [...params, queryBuffer, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(this.formatResults(rows));
      });
    });
  }

  /**
   * Search using built-in cosine similarity calculation (slower but reliable)
   */
  async searchWithBuiltinSimilarity(queryEmbedding, whereClause, params, limit) {
    const query = `
      SELECT *
      FROM ${config.database.sqlite.vectorTable}
      ${whereClause}
      ORDER BY quality_score DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [...params, limit * 3], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Calculate cosine similarity for each result
        const results = rows.map(row => {
          const embedding = new Float32Array(row.embedding.buffer);
          const similarity = this.cosineSimilarity(queryEmbedding, Array.from(embedding));
          
          return {
            ...row,
            similarity,
            distance: 1 - similarity
          };
        });

        // Sort by similarity and limit results
        results.sort((a, b) => b.similarity - a.similarity);
        resolve(this.formatResults(results.slice(0, limit)));
      });
    });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Format search results
   */
  formatResults(rows) {
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata || '{}'),
      similarity: row.similarity || 0,
      distance: row.distance || 1,
      qualityScore: row.quality_score,
      subject: row.subject,
      grade: row.grade,
      bookName: row.book_name,
      ocrConfidence: row.ocr_confidence
    }));
  }

  /**
   * Get collection stats
   */
  async getStats() {
    const queries = [
      `SELECT COUNT(*) as total FROM ${config.database.sqlite.vectorTable}`,
      `SELECT AVG(quality_score) as avg_quality FROM ${config.database.sqlite.vectorTable}`,
      `SELECT subject, COUNT(*) as count FROM ${config.database.sqlite.vectorTable} GROUP BY subject`,
      `SELECT grade, COUNT(*) as count FROM ${config.database.sqlite.vectorTable} GROUP BY grade`
    ];

    const [total, quality, subjects, grades] = await Promise.all(
      queries.map(query => this.runQuery(query, 'all'))
    );

    return {
      totalVectors: total[0].total,
      averageQuality: quality[0].avg_quality,
      subjectDistribution: subjects,
      gradeDistribution: grades,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
      cacheSize: this.vectorCache.size
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getStats();
      const memUsage = process.memoryUsage();
      
      return {
        status: 'healthy',
        vectorCount: stats.totalVectors,
        memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
        cacheHits: this.vectorCache.size,
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
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.vectorCache.clear();
    this.isInitialized = false;
    console.log('✅ Vector store cleaned up');
  }

  // Utility methods
  async ensureDirectory(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  runQuery(query, method = 'run') {
    return new Promise((resolve, reject) => {
      this.db[method](query, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}

module.exports = VectorStoreLite;