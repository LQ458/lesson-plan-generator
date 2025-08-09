const { CloudClient, DefaultEmbeddingFunction } = require("chromadb");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../../utils/logger");

class ChromaDBCloudUploader {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.collectionDimension = null; // Track collection embedding dimension
    
    // ChromaDB Cloud Configuration - use environment variables in production
    this.config = {
      apiKey: process.env.CHROMADB_API_KEY || 'ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
      tenant: process.env.CHROMADB_TENANT || 'ac97bc90-bba3-4f52-ab06-f0485262312e',
      database: process.env.CHROMADB_DATABASE || 'teachai',
      collectionName: process.env.CHROMADB_COLLECTION || 'teachai_main'
    };
    
    // Validate configuration
    if (!this.config.apiKey || this.config.apiKey.length < 10) {
      throw new Error('无效的ChromaDB API密钥');
    }
    if (!this.config.tenant || this.config.tenant.length < 10) {
      throw new Error('无效的ChromaDB租户ID');
    }
    
    // Log configuration for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('🔧 ChromaDB Cloud配置:');
      logger.info(`   - API Key: ${this.config.apiKey.substring(0, 10)}...`);
      logger.info(`   - Tenant: ${this.config.tenant.substring(0, 8)}...`);
      logger.info(`   - Database: ${this.config.database}`);
      logger.info(`   - Collection: ${this.config.collectionName}`);
    }
  }

  async initialize() {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Initialize ChromaDB Cloud client using CloudClient
        this.client = new CloudClient({
          apiKey: this.config.apiKey,
          tenant: this.config.tenant,
          database: this.config.database
        });

        if (retryCount === 0) {
          logger.info(`🌐 连接到ChromaDB Cloud`);
          logger.info(`📡 API Key: ${this.config.apiKey.substring(0, 10)}...`);
          logger.info(`🏢 Tenant: ${this.config.tenant.substring(0, 8)}...`);
          logger.info(`💾 Database: ${this.config.database}`);
        }
        
        // Test connection with timeout
        await Promise.race([
          this.client.heartbeat(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15000))
        ]);
        
        this.isInitialized = true;
        logger.info(`✅ ChromaDB Cloud连接成功${retryCount > 0 ? ` (重试${retryCount}次)` : ''}`);
        return true;
        
      } catch (error) {
        retryCount++;
        this.isInitialized = false;
        
        if (retryCount < maxRetries) {
          logger.warn(`⚠️ 连接尝试 ${retryCount}/${maxRetries} 失败: ${error.message}`);
          const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
          logger.info(`⏳ 等待 ${delay/1000}秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error(`❌ ChromaDB Cloud连接失败 (最终尝试):`, error);
          logger.error(`🔧 检查项目:`);
          logger.error(`   - API Key是否正确: ${this.config.apiKey.substring(0, 10)}...`);
          logger.error(`   - Tenant ID是否有效: ${this.config.tenant.substring(0, 8)}...`);
          logger.error(`   - 网络连接是否正常`);
          logger.error(`   - ChromaDB Cloud服务状态`);
          throw new Error(`ChromaDB Cloud连接失败: ${error.message}`);
        }
      }
    }
  }

  async getOrCreateMainCollection() {
    const mainCollectionName = this.config.collectionName;
    
    try {
      // Try to get existing main collection
      const collection = await this.client.getCollection({
        name: mainCollectionName,
        embeddingFunction: new DefaultEmbeddingFunction()
      });
      logger.info(`📚 使用现有主集合: ${mainCollectionName}`);
      
      // Check collection dimensionality for consistency
      try {
        const existingCount = await collection.count();
        logger.info(`📊 现有集合包含 ${existingCount} 个文档`);
        
        if (existingCount > 0) {
          // Get sample to check embedding dimension
          const sample = await collection.get({ limit: 1, include: ['embeddings'] });
          if (sample.embeddings && sample.embeddings[0]) {
            const dimension = sample.embeddings[0].length;
            logger.info(`🔍 集合嵌入维度: ${dimension}`);
            this.collectionDimension = dimension;
          }
        }
      } catch (sampleError) {
        logger.warn(`⚠️ 无法获取集合样本:`, sampleError.message);
      }
      
      return collection;
    } catch (error) {
      // Collection doesn't exist, create it
      try {
        logger.info(`📚 创建主集合: ${mainCollectionName}`);
        
        // Create main collection with optimized settings for ChromaDB Cloud
        const collection = await this.client.createCollection({
          name: mainCollectionName,
          embeddingFunction: new DefaultEmbeddingFunction(),
          metadata: {
            "hnsw:space": "cosine",
            "hnsw:construction_ef": 128,
            "hnsw:M": 16,
            description: "TeachAI unified education materials database",
            version: "3.0",
            created_at: new Date().toISOString()
          }
        });
        
        logger.info(`✅ 成功创建主集合: ${mainCollectionName}`);
        this.collectionDimension = 384; // Default for all-MiniLM-L6-v2
        return collection;
      } catch (createError) {
        // Handle "already exists" race condition
        if (createError.message.includes('already exists') || createError.message.includes('resource already exists')) {
          logger.warn(`⚠️ 集合已存在，尝试获取现有集合...`);
          try {
            const collection = await this.client.getCollection({
              name: mainCollectionName,
              embeddingFunction: new DefaultEmbeddingFunction()
            });
            logger.info(`✅ 成功获取现有集合: ${mainCollectionName}`);
            return collection;
          } catch (getError) {
            logger.error(`❌ 无法获取现有集合:`, getError);
            throw new Error(`集合管理错误: ${getError.message}`);
          }
        }
        
        logger.error(`❌ 创建主集合失败:`, createError);
        logger.error(`🔧 错误详情: ${createError.message}`);
        throw new Error(`创建主集合失败: ${createError.message}`);
      }
    }
  }

  generateCollectionName(filename) {
    const basename = path.basename(filename, '.json');
    
    // Extract meaningful info from Chinese filename
    let collectionName = 'teachai';
    
    // Extract grade
    const gradeMatch = basename.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级)/);
    if (gradeMatch) {
      const gradeMap = {
        '一年级': 'grade1', '二年级': 'grade2', '三年级': 'grade3',
        '四年级': 'grade4', '五年级': 'grade5', '六年级': 'grade6',
        '七年级': 'grade7', '八年级': 'grade8', '九年级': 'grade9'
      };
      collectionName += '_' + gradeMap[gradeMatch[1]];
    }
    
    // Extract subject
    const subjectMatch = basename.match(/(数学|语文|英语|物理|化学|生物|历史|地理|政治|音乐|美术|体育|科学|道德与法治)/);
    if (subjectMatch) {
      const subjectMap = {
        '数学': 'math', '语文': 'chinese', '英语': 'english',
        '物理': 'physics', '化学': 'chemistry', '生物': 'biology',
        '历史': 'history', '地理': 'geography', '政治': 'politics',
        '音乐': 'music', '美术': 'art', '体育': 'pe',
        '科学': 'science', '道德与法治': 'ethics'
      };
      collectionName += '_' + subjectMap[subjectMatch[1]];
    }
    
    // Extract semester
    const semesterMatch = basename.match(/(上册|下册)/);
    if (semesterMatch) {
      const semesterMap = { '上册': 'vol1', '下册': 'vol2' };
      collectionName += '_' + semesterMap[semesterMatch[1]];
    }
    
    // Add a hash of the original filename for uniqueness
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(basename).digest('hex').substring(0, 8);
    collectionName += '_' + hash;
    
    // Ensure the name meets ChromaDB requirements: [a-zA-Z0-9._-], 3-512 chars
    collectionName = collectionName.toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Ensure it starts and ends with alphanumeric
    collectionName = collectionName.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    
    // Limit to 100 characters for readability
    if (collectionName.length > 100) {
      collectionName = collectionName.substring(0, 100);
    }
    
    // Ensure minimum length
    if (collectionName.length < 3) {
      collectionName = 'teachai_book_' + hash;
    }
    
    return collectionName;
  }

  async uploadFile(filePath) {
    try {
      logger.info(`🔄 开始上传文件: ${filePath}`);
      
      // Read and parse file
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!Array.isArray(data)) {
        throw new Error('文件格式错误: 期望JSON数组格式');
      }

      logger.info(`📊 文件包含 ${data.length} 个文档块`);

      // Filter by quality score (enhanced data format)
      const qualityFilteredChunks = data.filter(chunk => 
        !chunk.qualityScore || chunk.qualityScore >= 0.3
      );

      if (qualityFilteredChunks.length === 0) {
        logger.warn(`⚠️ 所有chunks都被质量过滤器过滤: ${path.basename(filePath)}`);
        return { success: false, reason: 'no_quality_chunks' };
      }

      logger.info(`📈 质量过滤后剩余 ${qualityFilteredChunks.length} 个文档块`);

      // Always use the unified main collection
      const collection = await this.getOrCreateMainCollection();
      logger.info(`📚 使用统一主集合: ${this.config.collectionName}`);

      // Prepare batch data with proper validation and embeddings
      const documents = [];
      const metadatas = [];
      const ids = [];
      const embeddings = []; // Explicitly handle embeddings for ChromaDB Cloud

      logger.info(`🔄 处理并验证 ${qualityFilteredChunks.length} 个文档块...`);
      
      for (let i = 0; i < qualityFilteredChunks.length; i++) {
        const chunk = qualityFilteredChunks[i];
        
        // ULTRA-STRICT content validation for ChromaDB Cloud
        if (!chunk.content || 
            typeof chunk.content !== 'string' || 
            chunk.content.trim().length === 0 ||
            chunk.content.trim().length < 10) {
          logger.warn(`⚠️ 跳过无效内容的块 ${i}`);
          continue;
        }
        
        // Clean content for ChromaDB Cloud compatibility
        let cleanContent = chunk.content
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
          .trim();
          
        // Validate cleaned content
        if (!cleanContent || cleanContent.length < 10) {
          logger.warn(`⚠️ 跳过清理后无效内容的块 ${i}`);
          continue;
        }
        
        // Limit content length for ChromaDB Cloud
        if (cleanContent.length > 6000) {
          cleanContent = cleanContent.substring(0, 5950) + '...';
        }

        // Generate ULTRA-SAFE ID for ChromaDB Cloud
        const crypto = require('crypto');
        const contentHash = crypto.createHash('md5').update(cleanContent + path.basename(filePath)).digest('hex').substring(0, 8);
        const chunkId = `doc${contentHash}${i}`; // Simplified format
        
        // Double-check ID safety
        if (chunkId.length < 3 || chunkId.length > 50) {
          logger.error(`❌ ID长度问题: ${chunkId}`);
          continue;
        }
        
        // Prepare MINIMAL metadata for ChromaDB Cloud (only essential fields)
        const safeName = path.basename(filePath)
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .substring(0, 100); // Limit filename length
          
        const metadata = {
          source: safeName,
          chunk_index: i,
          content_length: cleanContent.length,
          created_at: new Date().toISOString().split('T')[0] // Date only
        };

        // Add ONLY ESSENTIAL metadata to avoid validation issues
        const subject = this.extractSubjectFromFilename(filePath);
        if (subject) {
          metadata.subject = subject;
        }
        
        const grade = this.extractGradeFromFilename(filePath);
        if (grade) {
          metadata.grade = grade;
        }
        
        // Add quality score ONLY if it's a clean number
        if (typeof chunk.qualityScore === 'number' && 
            !isNaN(chunk.qualityScore) && 
            chunk.qualityScore >= 0.1 && 
            chunk.qualityScore <= 1) {
          metadata.quality = parseFloat(chunk.qualityScore.toFixed(2));
        }

        // Final validation before adding to batch
        if (chunkId && cleanContent && metadata) {
          ids.push(chunkId);
          documents.push(cleanContent);
          metadatas.push(metadata);
        } else {
          logger.warn(`⚠️ 跳过最终验证失败的块 ${i}`);
        }
      }

      logger.info(`📤 准备上传 ${documents.length} 个文档到云端`);

      // Validate final batch before upload
      if (documents.length === 0) {
        logger.warn(`⚠️ 没有有效文档可上传`);
        return { success: false, reason: 'no_valid_documents' };
      }
      
      logger.info(`✅ 验证通过，准备上传 ${documents.length} 个文档`);
      
      // Use ULTRA-SMALL batches for maximum ChromaDB Cloud compatibility
      const batchSize = 3; // Extremely small batches to avoid 422 errors
      let uploadedCount = 0;
      const maxRetries = 5; // More retries for better reliability

      for (let i = 0; i < documents.length; i += batchSize) {
        const batchDocs = documents.slice(i, i + batchSize);
        const batchMetas = metadatas.slice(i, i + batchSize);
        const batchIds = ids.slice(i, i + batchSize);
        const batchEmbeddings = embeddings.length > 0 ? embeddings.slice(i, i + batchSize) : null;

        let retryCount = 0;
        let batchSuccess = false;

        while (retryCount < maxRetries && !batchSuccess) {
          try {
            logger.info(`📤 上传批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)} (${batchDocs.length} 文档)${retryCount > 0 ? ` - 重试 ${retryCount}` : ''}`);
            
            // Prepare add payload with proper validation
            const addPayload = {
              documents: batchDocs,
              metadatas: batchMetas,
              ids: batchIds
            };
            
            // Only include embeddings if we have them
            if (batchEmbeddings && batchEmbeddings.length > 0) {
              addPayload.embeddings = batchEmbeddings;
            }
            
            // Double-check payload validity
            if (!addPayload.documents || !addPayload.metadatas || !addPayload.ids ||
                addPayload.documents.length !== addPayload.metadatas.length ||
                addPayload.documents.length !== addPayload.ids.length) {
              throw new Error('批次数据不一致');
            }
            
            await collection.add(addPayload);

            uploadedCount += batchDocs.length;
            logger.info(`✅ 批次成功! 总进度: ${uploadedCount}/${documents.length} (${((uploadedCount/documents.length)*100).toFixed(1)}%)`);
            batchSuccess = true;
            
            // Longer delay between batches to avoid rate limits
            if (i + batchSize < documents.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (batchError) {
            retryCount++;
            
            // Enhanced error logging
            logger.error(`❌ 批次上传失败 (${i}-${i + batchSize}) - 尝试 ${retryCount}/${maxRetries}:`);
            logger.error(`   错误类型: ${batchError.name || 'Unknown'}`);
            logger.error(`   错误消息: ${batchError.message}`);
            
            // Log detailed debugging info on first failure
            if (retryCount === 1) {
              logger.error(`🔧 批次调试信息:`);
              logger.error(`   - 批次大小: ${batchDocs.length}`);
              logger.error(`   - 样本文档长度: ${batchDocs[0]?.length || 0}`);
              logger.error(`   - 样本ID: ${batchIds[0]}`);
              logger.error(`   - 样本元数据字段: ${Object.keys(batchMetas[0] || {})}`);
              logger.error(`   - 有嵌入向量: ${batchEmbeddings ? 'Yes' : 'No'}`);
              
              // Validate sample metadata
              if (batchMetas[0]) {
                const meta = batchMetas[0];
                const invalidKeys = Object.keys(meta).filter(key => {
                  const value = meta[key];
                  return value === null || value === undefined || 
                         (typeof value === 'string' && value.trim() === '') ||
                         (typeof value === 'number' && isNaN(value));
                });
                if (invalidKeys.length > 0) {
                  logger.error(`   - 无效元数据字段: ${invalidKeys.join(', ')}`);
                }
              }
            }
            
            if (retryCount < maxRetries) {
              // Progressive delay: 2s, 5s, 10s, 20s
              const delay = Math.min(Math.pow(2, retryCount) * 2000, 20000);
              logger.info(`⏳ 等待 ${delay/1000} 秒后重试...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Log final failure details
              logger.error(`💥 批次最终失败详情:`);
              logger.error(`   - 文件: ${path.basename(filePath)}`);
              logger.error(`   - 批次索引: ${i}-${i + batchSize}`);
              logger.error(`   - 错误: ${batchError.message}`);
              throw new Error(`批次上传最终失败: ${batchError.message}`);
            }
          }
        }
      }

      // Verify upload
      const collectionCount = await collection.count();
      logger.info(`✅ 文件上传完成: ${path.basename(filePath)}`);
      logger.info(`📊 主集合现有文档总数: ${collectionCount}`);

      return {
        success: true,
        collectionName: this.config.collectionName,
        uploadedDocuments: uploadedCount,
        totalCollectionSize: collectionCount,
        qualityFiltered: data.length - qualityFilteredChunks.length
      };

    } catch (error) {
      logger.error(`❌ 文件上传失败: ${path.basename(filePath)}`, error);
      return {
        success: false,
        error: error.message,
        file: path.basename(filePath)
      };
    }
  }

  async uploadAllFiles(dataDir = "server/rag_data/chunks") {
    try {
      logger.info(`🚀 开始批量上传本地RAG数据到ChromaDB Cloud...`);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check data directory
      const absoluteDataDir = path.resolve(dataDir);
      try {
        await fs.access(absoluteDataDir);
      } catch {
        throw new Error(`数据目录不存在: ${absoluteDataDir}`);
      }

      // Find all JSON files
      const files = await fs.readdir(absoluteDataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      if (jsonFiles.length === 0) {
        throw new Error(`在目录 ${dataDir} 中没有找到JSON文件`);
      }

      logger.info(`📁 找到 ${jsonFiles.length} 个JSON文件准备上传`);

      // Upload each file
      const results = [];
      let successCount = 0;
      let totalUploaded = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(absoluteDataDir, file);
        const result = await this.uploadFile(filePath);
        results.push(result);

        if (result.success) {
          successCount++;
          totalUploaded += result.uploadedDocuments || 0;
        }

        // Progress update
        logger.info(`📈 进度: ${results.length}/${jsonFiles.length} 文件 (成功: ${successCount})`);
      }

      const summary = {
        totalFiles: jsonFiles.length,
        successfulUploads: successCount,
        failedUploads: jsonFiles.length - successCount,
        totalDocumentsUploaded: totalUploaded,
        successRate: `${((successCount/jsonFiles.length)*100).toFixed(1)}%`,
        results: results
      };

      logger.info(`🎉 批量上传完成!`);
      logger.info(`📊 上传统计:`, summary);

      return summary;

    } catch (error) {
      logger.error(`❌ 批量上传失败:`, error);
      throw error;
    }
  }

  // Helper methods for filename parsing (same as vector-store.js)
  extractSubjectFromFilename(filename) {
    const subjects = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "音乐", "美术", "体育", "科学"];
    return subjects.find(s => filename.includes(s)) || null;
  }

  extractGradeFromFilename(filename) {
    const gradeMatch = filename.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/);
    return gradeMatch ? gradeMatch[1] : null;
  }

  extractMaterialName(filename) {
    let cleanName = filename.replace('.json', '').replace(/^.*_/, '');
    
    const bookPattern = /(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)[上下]?册(数学|语文|英语|物理|化学|生物|历史|地理|政治|音乐|美术|体育|科学|道德与法治)(.*?)电子课本/;
    const match = cleanName.match(bookPattern);
    
    if (match) {
      const grade = match[1];
      const semester = cleanName.includes('上册') ? '上册' : (cleanName.includes('下册') ? '下册' : '');
      const subject = match[2];
      const publisher = match[3] ? match[3].replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '') : '';
      
      return `${grade}${semester}${subject}${publisher ? '(' + publisher + ')' : ''}`;
    }
    
    const gradeMatch = cleanName.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/);
    const subjectMatch = cleanName.match(/(数学|语文|英语|物理|化学|生物|历史|地理|政治|音乐|美术|体育|科学|道德与法治)/);
    
    if (gradeMatch && subjectMatch) {
      const semester = cleanName.includes('上册') ? '上册' : (cleanName.includes('下册') ? '下册' : '');
      return `${gradeMatch[1]}${semester}${subjectMatch[1]}`;
    }
    
    return cleanName;
  }

  async listCloudCollections() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const collections = await this.client.listCollections();
      logger.info(`📊 云端集合列表: 找到 ${collections.length} 个集合`);
      
      // Debug: log the raw collection structure
      collections.forEach((col, index) => {
        logger.info(`🔍 调试集合 ${index}:`, JSON.stringify(col, null, 2));
      });
      
      const collectionInfo = [];
      for (const collection of collections) {
        try {
          // Get collection name - it might be in different properties
          const collectionName = collection.name || collection.id || collection.collection_name || 'unknown';
          
          // Try to get collection object first to get count
          const collectionObj = await this.client.getCollection({
            name: collectionName,
            embeddingFunction: new DefaultEmbeddingFunction()
          });
          
          const count = await collectionObj.count();
          const info = { name: collectionName, count };
          logger.info(`  📚 ${collectionName}: ${count} 个文档`);
          collectionInfo.push(info);
        } catch (countError) {
          const collectionName = collection.name || collection.id || collection.collection_name || 'unknown';
          logger.warn(`⚠️ 无法获取集合 ${collectionName} 的文档数量:`, countError.message);
          collectionInfo.push({ name: collectionName, count: 'unknown' });
        }
      }

      return collectionInfo;
    } catch (error) {
      logger.error(`❌ 获取云端集合列表失败:`, error);
      throw error;
    }
  }

  async deleteCollection(collectionName) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`🗑️ 删除集合: ${collectionName}`);
      await this.client.deleteCollection({ name: collectionName });
      logger.info(`✅ 成功删除集合: ${collectionName}`);
      return true;
    } catch (error) {
      logger.error(`❌ 删除集合失败: ${collectionName}`, error);
      return false;
    }
  }

  async cleanupUnnecessaryCollections() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`🧹 开始清理不必要的集合...`);
      
      const collections = await this.listCloudCollections();
      const mainCollectionName = 'teachai_main';
      const unnecessaryCollections = [];
      
      // Identify collections to delete (everything except the main one)
      for (const collection of collections) {
        if (collection.name !== mainCollectionName) {
          unnecessaryCollections.push(collection.name);
        }
      }
      
      logger.info(`🎯 发现 ${unnecessaryCollections.length} 个需要清理的集合:`);
      unnecessaryCollections.forEach(name => {
        logger.info(`  - ${name}`);
      });
      
      if (unnecessaryCollections.length === 0) {
        logger.info(`✨ 没有需要清理的集合`);
        return { deletedCount: 0, deletedCollections: [] };
      }
      
      // Ask for confirmation in non-CLI mode
      const deletedCollections = [];
      let successCount = 0;
      
      for (const collectionName of unnecessaryCollections) {
        const success = await this.deleteCollection(collectionName);
        if (success) {
          deletedCollections.push(collectionName);
          successCount++;
        }
        
        // Small delay between deletions
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      logger.info(`🎉 清理完成! 成功删除 ${successCount}/${unnecessaryCollections.length} 个集合`);
      
      return {
        deletedCount: successCount,
        deletedCollections: deletedCollections,
        totalFound: unnecessaryCollections.length
      };
      
    } catch (error) {
      logger.error(`❌ 集合清理失败:`, error);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = ChromaDBCloudUploader;

// CLI usage
if (require.main === module) {
  const uploader = new ChromaDBCloudUploader();
  
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Upload specific file
    const filePath = args[0];
    uploader.initialize()
      .then(() => uploader.uploadFile(filePath))
      .then(result => {
        if (result.success) {
          console.log(`✅ 文件上传成功: ${result.collectionName}`);
        } else {
          console.log(`❌ 文件上传失败: ${result.error || result.reason}`);
        }
      })
      .catch(console.error);
  } else {
    // Upload all files
    uploader.uploadAllFiles()
      .then(summary => {
        console.log(`🎉 批量上传完成! 成功率: ${summary.successRate}`);
      })
      .catch(console.error);
  }
}