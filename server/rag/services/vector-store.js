// Use custom HTTP client instead of official chromadb client to avoid dependency issues
const ChromaDBHTTPClient = require("./chromadb-http-client");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../../utils/logger");
const config = require("../config/vector-db-config");
const textProcessor = require("../utils/text-processor");
const {
  DocumentChunk,
  SearchResult,
  DocumentCollection,
} = require("../models/document-model");

class VectorStoreService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = config.chroma.collection.name;
    this.embeddingModel = config.embedding.model;
    this.isInitialized = false;
    this.documentCollection = new DocumentCollection();
  }

  async initialize() {
    try {
      // DEBUG: Log environment variables and config
      const debugInfo = {
        CHROMA_CLOUD_ENABLED: process.env.CHROMA_CLOUD_ENABLED,
        CHROMADB_API_KEY: process.env.CHROMADB_API_KEY ? `${process.env.CHROMADB_API_KEY.substring(0, 10)}...` : 'NOT_SET',
        CHROMADB_TENANT: process.env.CHROMADB_TENANT,
        CHROMADB_DATABASE: process.env.CHROMADB_DATABASE,
        configCloudEnabled: config.chroma.cloud.enabled,
        configApiKey: config.chroma.cloud.apiKey ? `${config.chroma.cloud.apiKey.substring(0, 10)}...` : 'NOT_SET',
        configTenant: config.chroma.cloud.tenant,
        configDatabase: config.chroma.cloud.database
      };
      
      console.log('🔍 [DEBUG] ChromaDB配置检查:', JSON.stringify(debugInfo, null, 2));
      logger.info(`🔍 [DEBUG] ChromaDB配置检查:`, debugInfo);

      // 强制使用云端如果设置了API密钥
      const forceCloud = process.env.CHROMADB_API_KEY && process.env.CHROMADB_TENANT;
      const useCloud = config.chroma.cloud.enabled || forceCloud;
      
      console.log('🔍 [DEBUG] 客户端选择:', {
        configEnabled: config.chroma.cloud.enabled,
        forceCloud,
        useCloud,
        hasApiKey: !!process.env.CHROMADB_API_KEY,
        hasTenant: !!process.env.CHROMADB_TENANT
      });

      // 初始化ChromaDB客户端 - 使用HTTP客户端避免依赖问题
      logger.info(`🏠 [DEBUG] 使用HTTP客户端连接ChromaDB: ${config.chroma.path}`);
      this.client = new ChromaDBHTTPClient(config.chroma.path);
      logger.info(`✅ [DEBUG] ChromaDB HTTP客户端已创建，连接到: ${config.chroma.path}`);

      // 测试连接并检查集合是否存在
      try {
        logger.info(`🔍 [DEBUG] 测试ChromaDB连接...`);
        
        // First test the connection with heartbeat if available
        if (this.client.heartbeat) {
          try {
            await this.client.heartbeat();
            logger.info(`✅ [DEBUG] ChromaDB连接测试成功`);
          } catch (heartbeatError) {
            logger.error(`❌ [DEBUG] ChromaDB连接测试失败:`, heartbeatError);
            throw new Error(`ChromaDB连接失败: ${heartbeatError.message}`);
          }
        }
        
        // Check what collections exist
        try {
          const collections = await this.client.listCollections();
          logger.info(`📋 [DEBUG] 可用集合列表:`, collections.map ? collections.map(c => ({
            name: c.name,
            metadata: c.metadata
          })) : collections);
          
          const targetCollection = collections.find ? collections.find(c => c.name === this.collectionName) : null;
          if (targetCollection) {
            logger.info(`✅ [DEBUG] 找到目标集合:`, {
              name: targetCollection.name,
              metadata: targetCollection.metadata
            });
          } else {
            logger.info(`⚠️ [DEBUG] 目标集合${this.collectionName}不存在`);
          }
        } catch (listError) {
          logger.error(`❌ [DEBUG] 无法列出集合:`, listError.message);
        }
        
        logger.info(`🔍 [DEBUG] 尝试获取现有集合: ${this.collectionName}`);
        
        // Try to get existing collection
        await this.client.getCollection(this.collectionName);
        this.collection = this.collectionName; // Store collection name for HTTP client
        
        // Test if the collection has data and can be queried
        try {
          const countResult = await this.client.countCollection(this.collectionName);
          const count = countResult;
          logger.info(`📊 [DEBUG] 集合${this.collectionName}包含${count}个文档`);
          
          if (count === 0) {
            logger.warn(`⚠️ [DEBUG] 集合为空，这可能导致嵌入函数问题`);
            logger.info(`💡 [DEBUG] 诊断: 集合存在但为空，可能需要上传数据或配置默认嵌入函数`);
          } else {
            // Test a simple query to verify embedding function works
            logger.info(`🔍 [DEBUG] 测试集合查询功能...`);
            try {
              const testResult = await this.client.queryCollection(this.collectionName, {
                queryTexts: ["test"],
                nResults: Math.min(1, count),
                include: ["documents"]
              });
              logger.info(`✅ [DEBUG] 集合查询测试成功，返回${testResult.documents?.[0]?.length || 0}个结果`);
              logger.info(`🎯 [DEBUG] 诊断: 集合有数据且查询正常，嵌入函数配置正确`);
            } catch (queryTestError) {
              logger.error(`❌ [DEBUG] 查询测试失败:`, {
                message: queryTestError.message,
                stack: queryTestError.stack?.substring(0, 200)
              });
              
              if (queryTestError.message.includes('generate')) {
                logger.error(`🔧 [DEBUG] 诊断: 嵌入函数未定义，需要在ChromaDB Cloud配置默认嵌入模型`);
                throw new Error(`ChromaDB Cloud集合缺少嵌入函数配置。请在ChromaDB Cloud控制台为数据库配置默认嵌入模型，然后重新创建集合。`);
              } else if (queryTestError.message.includes('embedding')) {
                logger.error(`🔧 [DEBUG] 诊断: 嵌入相关错误，可能是模型配置问题`);
                throw new Error(`ChromaDB嵌入模型配置错误: ${queryTestError.message}`);
              } else {
                logger.error(`🔧 [DEBUG] 诊断: 未知查询错误`);
                throw queryTestError;
              }
            }
          }
        } catch (countError) {
          logger.error(`❌ [DEBUG] 无法获取集合计数:`, {
            message: countError.message,
            name: countError.name
          });
          logger.error(`🔧 [DEBUG] 诊断: 集合存在但无法访问，可能是权限或配置问题`);
          throw countError;
        }
        logger.info(`✅ [DEBUG] 使用现有集合: ${this.collectionName}`);
      } catch (error) {
        logger.info(`⚠️ [DEBUG] 集合不存在或连接失败，尝试创建: ${this.collectionName}`);
        logger.error(`🔍 [DEBUG] getCollection错误详情:`, {
          message: error.message,
          name: error.name,
          cause: error.cause
        });
        
        try {
          // 集合不存在，创建新集合
          logger.info(`🔧 [DEBUG] 创建新集合: ${this.collectionName}`);
          await this.client.createCollection(this.collectionName, config.chroma.collection.metadata);
          this.collection = this.collectionName; // Store collection name for HTTP client
          logger.info(`✅ [DEBUG] 创建新集合成功: ${this.collectionName}`);
        } catch (createError) {
          logger.error(`❌ [DEBUG] 创建集合失败:`, {
            message: createError.message,
            name: createError.name,
            cause: createError.cause
          });
          throw new Error(`ChromaDB集合操作失败: ${createError.message}`);
        }
      }

      this.isInitialized = true;
      logger.info("向量存储服务初始化成功");
    } catch (error) {
      logger.error("向量存储服务初始化失败:", error);
      throw new Error(`向量存储服务初始化失败: ${error.message}`);
    }
  }

  async loadDocuments() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const ragDataDir = path.join(__dirname, "../../rag_data/chunks");
      const files = await fs.readdir(ragDataDir);
      const jsonFiles = files.filter((file) =>
        config.documents.supportedFormats.some((format) =>
          file.endsWith(format),
        ),
      );

      let totalChunks = 0;
      let loadedChunks = 0;
      let skippedFiles = 0;
      const loadErrors = [];

      logger.info(`开始加载文档，共找到 ${jsonFiles.length} 个文件`);

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(ragDataDir, file);
          const fileStats = await fs.stat(filePath);

          // 检查文件大小
          if (fileStats.size > config.documents.maxDocumentSize) {
            logger.warn(`跳过大文件: ${file} (${fileStats.size} bytes)`);
            skippedFiles++;
            continue;
          }

          const content = await fs.readFile(filePath, "utf8");
          const data = JSON.parse(content);

          // Handle enhanced format - data is array of chunks directly
          let chunks;
          if (Array.isArray(data)) {
            chunks = data;
          } else if (data.chunks && Array.isArray(data.chunks)) {
            // Legacy format support
            chunks = data.chunks;
          } else {
            logger.warn(`文档格式不正确: ${file} - 未找到有效的chunks数据`);
            loadErrors.push({ file, errors: ["Invalid chunk format"] });
            continue;
          }

          if (chunks.length > 0) {
            totalChunks += chunks.length;

            // Filter chunks by quality score if using enhanced format
            const qualityFilteredChunks = config.documents.enhancedFormat 
              ? chunks.filter(chunk => 
                  !chunk.qualityScore || chunk.qualityScore >= config.documents.minQualityScore
                )
              : chunks;

            if (qualityFilteredChunks.length === 0) {
              logger.warn(`所有chunks都被质量过滤器过滤: ${file}`);
              continue;
            }

            // 准备批量插入数据 (pass chunks directly)
            const batchData = this.prepareBatchDataEnhanced(qualityFilteredChunks, file);

            // 批量添加到向量数据库
            await this.client.addDocuments(this.collection, batchData);

            loadedChunks += qualityFilteredChunks.length;
            logger.info(
              `✓ 加载文档: ${file}, 总块数: ${chunks.length}, 质量过滤后: ${qualityFilteredChunks.length}`,
            );
          }
        } catch (error) {
          logger.error(`加载文档失败: ${file}`, error);
          loadErrors.push({ file, error: error.message });
        }
      }

      const result = {
        totalFiles: jsonFiles.length,
        totalChunks,
        loadedChunks,
        skippedFiles,
        successRate:
          totalChunks > 0
            ? ((loadedChunks / totalChunks) * 100).toFixed(2) + "%"
            : "0%",
        errors: loadErrors,
      };

      logger.info(`文档加载完成: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error("文档加载失败:", error);
      throw new Error(`文档加载失败: ${error.message}`);
    }
  }

  prepareBatchData(document, filename) {
    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];

    for (let i = 0; i < document.chunks.length; i++) {
      const chunk = document.chunks[i];

      // 创建文档块实例
      const documentChunk = new DocumentChunk({
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: {
          source: document.filename,
          subject: textProcessor.extractSubject(document.filename),
          grade: textProcessor.extractGrade(document.filename),
          chunkIndex: i,
          totalChunks: document.chunks.length,
          qualityScore:
            chunk.metadata?.qualityScore ||
            textProcessor.calculateQualityScore(chunk.content),
          contentLength: chunk.content.length,
          fileSize: document.metadata?.fileSize || 0,
          processingDate:
            document.processingStats?.processingDate ||
            new Date().toISOString(),
          keywords: textProcessor.extractKeywords(chunk.content, 5),
          summary: textProcessor.generateSummary(chunk.content, 100),
        },
      });

      const chromaData = documentChunk.toChromaFormat();
      ids.push(chromaData.id);
      embeddings.push(chromaData.embedding);
      documents.push(chromaData.document);
      metadatas.push(chromaData.metadata);
    }

    return { ids, embeddings, documents, metadatas };
  }

  // New method to handle enhanced data format
  prepareBatchDataEnhanced(chunks, filename) {
    const ids = [];
    const documents = [];
    const metadatas = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Skip empty content
      if (!chunk.content || typeof chunk.content !== "string" || chunk.content.trim().length === 0) {
        continue;
      }

      // Generate unique ID using filename and chunk index
      const chunkId = `${filename}_chunk_${i}`;

      // Extract subject and grade from filename or chunk metadata
      const subject = this.extractSubjectFromFilename(filename) || 
                     chunk.metadata?.subject || 
                     textProcessor.extractSubject(filename);
      const grade = this.extractGradeFromFilename(filename) || 
                   chunk.metadata?.grade || 
                   textProcessor.extractGrade(filename);

      // Prepare enhanced metadata
      const metadata = {
        source: filename,
        chunk_index: i,
        subject: subject,
        grade: grade,
        material_name: this.extractMaterialName(filename),
        content_length: chunk.content.length,
        created_at: new Date().toISOString(),
        
        // Enhanced quality metrics
        qualityScore: chunk.qualityScore || 0.5,
        reliability: chunk.reliability || "medium",
        enhancementVersion: chunk.metadata?.enhancementVersion || "2.0",
        
        // OCR and processing info
        ocrConfidence: chunk.metadata?.qualityMetrics?.ocrConfidence || null,
        chineseCharRatio: chunk.metadata?.qualityMetrics?.chineseCharRatio || null,
        lengthScore: chunk.metadata?.qualityMetrics?.lengthScore || null,
        coherenceScore: chunk.metadata?.qualityMetrics?.coherenceScore || null,
        
        // Semantic features
        hasFormulas: chunk.semanticFeatures?.hasFormulas || false,
        hasNumbers: chunk.semanticFeatures?.hasNumbers || false,
        hasExperiment: chunk.semanticFeatures?.hasExperiment || false,
        hasDefinition: chunk.semanticFeatures?.hasDefinition || false,
        hasQuestion: chunk.semanticFeatures?.hasQuestion || false,
        isTableContent: chunk.semanticFeatures?.isTableContent || false,
        subjectArea: chunk.semanticFeatures?.subjectArea || subject,
        
        // Original metadata from chunk
        ...(chunk.metadata || {})
      };

      ids.push(chunkId);
      documents.push(chunk.content.trim());
      metadatas.push(metadata);
    }

    return { ids, documents, metadatas };
  }

  // Helper methods for filename parsing
  extractSubjectFromFilename(filename) {
    const subjects = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "音乐", "美术", "体育", "科学"];
    return subjects.find(s => filename.includes(s)) || null;
  }

  extractGradeFromFilename(filename) {
    const gradeMatch = filename.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/);
    return gradeMatch ? gradeMatch[1] : null;
  }

  extractMaterialName(filename) {
    // Remove .json extension and clean up filename
    let cleanName = filename.replace('.json', '').replace(/^.*_/, '');
    
    // Extract readable book name from filename
    // Pattern matches: 年级+学科+版本+电子课本
    const bookPattern = /(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)[上下]?册(数学|语文|英语|物理|化学|生物|历史|地理|政治|音乐|美术|体育|科学|道德与法治)(.*?)电子课本/;
    const match = cleanName.match(bookPattern);
    
    if (match) {
      const grade = match[1];
      const semester = cleanName.includes('上册') ? '上册' : (cleanName.includes('下册') ? '下册' : '');
      const subject = match[2];
      const publisher = match[3] ? match[3].replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '') : '';
      
      return `${grade}${semester}${subject}${publisher ? '(' + publisher + ')' : ''}`;
    }
    
    // Fallback: try to extract basic info
    const gradeMatch = cleanName.match(/(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/);
    const subjectMatch = cleanName.match(/(数学|语文|英语|物理|化学|生物|历史|地理|政治|音乐|美术|体育|科学|道德与法治)/);
    
    if (gradeMatch && subjectMatch) {
      const semester = cleanName.includes('上册') ? '上册' : (cleanName.includes('下册') ? '下册' : '');
      return `${gradeMatch[1]}${semester}${subjectMatch[1]}`;
    }
    
    return cleanName;
  }

  async search(query, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
    } catch (error) {
      logger.error("❌ [RAG] 搜索初始化失败", {
        error: error.message,
        service: "vector-store",
      });
      return [];
    }

    const {
      limit = config.search.defaultLimit,
      subject = null,
      grade = null,
      minQualityScore = config.documents.minQualityScore,
      includeMetadata = true,
    } = options;

    // 验证参数
    const validatedLimit = Math.min(Math.max(1, limit), config.search.maxLimit);

    try {
      // 构建过滤条件 - ChromaDB 需要使用 $and 操作符组合多个条件
      let whereClause = undefined;
      const conditions = [];

      if (subject && config.subjects.includes(subject)) {
        conditions.push({ subject: { $eq: subject } });
      }
      if (grade && config.grades.includes(grade)) {
        conditions.push({ grade: { $eq: grade } });
      }
      if (minQualityScore > 0) {
        conditions.push({ qualityScore: { $gte: minQualityScore } });
      }

      if (conditions.length > 1) {
        whereClause = { $and: conditions };
      } else if (conditions.length === 1) {
        whereClause = conditions[0];
      }

      // ChromaDB Cloud collections may need embedding function for query
      const queryOptions = {
        queryTexts: [query],
        nResults: validatedLimit,
        where: whereClause,
        include: includeMetadata
          ? ["documents", "metadatas", "distances"]
          : ["documents", "distances"],
      };
      
      logger.info(`🔍 [DEBUG] 执行查询:`, {
        queryTexts: queryOptions.queryTexts,
        nResults: queryOptions.nResults,
        where: queryOptions.where,
        include: queryOptions.include
      });
      
      const results = await this.client.queryCollection(this.collection, queryOptions);

      // 格式化结果
      const formattedResults = [];
      if (results.documents && results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const searchResult = new SearchResult({
            content: results.documents[0][i],
            metadata: includeMetadata ? results.metadatas[0][i] : {},
            distance: results.distances[0][i],
            similarity: 1 - results.distances[0][i],
          });

          // 过滤低相似度结果
          if (searchResult.similarity >= config.search.minSimilarityThreshold) {
            formattedResults.push(searchResult.formatForAPI());
          }
        }
      }

      // 按相关性分数重新排序
      formattedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      logger.info(
        `搜索完成: 查询="${query}", 原始结果=${results.documents?.[0]?.length || 0}, 过滤后结果=${formattedResults.length}`,
      );
      return formattedResults;
    } catch (error) {
      logger.error("搜索失败:", error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  // 年级标准化函数
  normalizeGrade(grade) {
    if (!grade) return grade;
    return config.gradeMapping[grade] || grade;
  }

  // 为不同学科生成通用查询
  getGeneralQueries(subject, originalQuery) {
    const queries = [];

    // 学科特定的通用查询
    const subjectQueries = {
      音乐: ["音乐教学", "歌曲教学", "音乐欣赏", "节奏训练"],
      美术: ["美术教学", "绘画技巧", "色彩搭配", "创意表达"],
      体育: ["体育教学", "运动技能", "身体协调", "团队合作"],
      政治: ["思想教育", "品德培养", "公民素养", "道德教育", "道德与法治"],
      历史: [
        "历史故事",
        "文化传承",
        "时代背景",
        "历史人物",
        "古代文明",
        "中国历史",
        "世界历史",
      ],
      地理: ["地理知识", "自然环境", "人文地理", "地图使用"],
      物理: ["物理实验", "科学探究", "物理现象", "实验方法"],
      化学: ["化学实验", "化学反应", "实验安全", "观察记录"],
      生物: ["生物观察", "生命科学", "自然现象", "科学实验"],
      语文: ["语文教学", "阅读理解", "写作技巧", "文学作品"],
      数学: ["数学教学", "数学思维", "解题方法", "数学概念"],
      英语: ["英语教学", "语言学习", "口语练习", "听力训练"],
    };

    // 添加学科特定查询
    if (subjectQueries[subject]) {
      queries.push(...subjectQueries[subject]);
    }

    // 添加通用教学方法查询
    queries.push("教学方法", "课堂组织", "学生参与", "教学活动");

    // 如果原查询包含具体内容，尝试提取关键词
    if (originalQuery) {
      const keywords = originalQuery
        .split(" ")
        .filter(
          (word) =>
            !["教学", "课程", "教案", subject].includes(word) &&
            word.length > 1,
        );
      queries.push(...keywords);
    }

    return queries.slice(0, 5); // 限制查询数量
  }

  // 检查年级兼容性
  isGradeCompatible(targetGrade, documentGrade) {
    if (!targetGrade || !documentGrade) return false;

    const normalizedTarget = this.normalizeGrade(targetGrade);
    const normalizedDoc = this.normalizeGrade(documentGrade);

    // 精确匹配
    if (normalizedTarget === normalizedDoc) return true;

    // 年级范围匹配
    const gradeOrder = [
      "一年级",
      "二年级",
      "三年级",
      "四年级",
      "五年级",
      "六年级",
      "七年级",
      "八年级",
      "九年级",
    ];
    const targetIndex = gradeOrder.indexOf(normalizedTarget);
    const docIndex = gradeOrder.indexOf(normalizedDoc);

    if (targetIndex !== -1 && docIndex !== -1) {
      const diff = Math.abs(targetIndex - docIndex);

      // 小学阶段（1-6年级）：允许相差1个年级
      if (targetIndex <= 5 || docIndex <= 5) {
        return diff <= 1;
      }

      // 初中阶段（7-9年级）：允许相差1个年级
      if (
        (targetIndex >= 6 && targetIndex <= 8) ||
        (docIndex >= 6 && docIndex <= 8)
      ) {
        return diff <= 1;
      }
    }

    return false;
  }

  async getRelevantContext(
    query,
    subject,
    grade,
    maxTokens = config.search.contextMaxTokens,
  ) {
    const normalizedGrade = this.normalizeGrade(grade);

    logger.info("📚 [RAG] 开始上下文检索", {
      query,
      subject,
      originalGrade: grade,
      normalizedGrade,
      maxTokens,
      service: "vector-store",
    });


    // 如果服务未初始化或连接失败，返回空结果
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
    } catch (error) {
      logger.error("❌ [RAG] 初始化失败，返回空上下文", {
        error: error.message,
        service: "vector-store",
      });
      return {
        context: "",
        sources: [],
        totalResults: 0,
        usedResults: 0,
        tokenCount: 0,
        averageRelevance: 0,
      };
    }

    // 尝试多种搜索策略以获得最佳结果
    let results = [];

    // 策略1: 完整搜索（学科 + 年级 + 查询）
    if (subject && normalizedGrade) {
      logger.info("🎯 [RAG] 策略1: 完整搜索 (学科+年级)", {
        subject,
        normalizedGrade,
        service: "vector-store",
      });
      results = await this.search(query, {
        limit: 20, // 增加初始搜索数量
        subject: subject,
        grade: normalizedGrade,
        minQualityScore: 0.3, // 提高质量要求
      });
      logger.info(`📊 [RAG] 策略1结果: ${results.length}个文档`, {
        service: "vector-store",
      });

      // 如果没有结果，立即尝试仅按学科搜索
      if (results.length === 0) {
        logger.info("🎯 [RAG] 策略1.1: 仅学科搜索 (移除年级限制)", {
          subject,
          service: "vector-store",
        });
        results = await this.search(query, {
          limit: 15,
          subject: subject,
          minQualityScore: 0.2, // 稍微降低质量要求
        });
        logger.info(`📊 [RAG] 策略1.1结果: ${results.length}个文档`, {
          service: "vector-store",
        });
      }
    }

    // 策略2: 如果结果不足，尝试相邻年级搜索
    if (results.length < 5 && subject && normalizedGrade) {
      logger.info("🎯 [RAG] 策略2: 相邻年级搜索", {
        subject,
        normalizedGrade,
        service: "vector-store",
      });

      // 先获取所有该学科的文档，然后手动过滤年级兼容性
      const subjectResults = await this.search(query, {
        limit: 20,
        subject: subject,
        minQualityScore: 0.2,
      });

      // 过滤出年级兼容的结果
      const compatibleResults = subjectResults.filter((result) =>
        this.isGradeCompatible(normalizedGrade, result.metadata?.grade),
      );

      // 如果有兼容的结果，添加到总结果中
      if (compatibleResults.length > 0) {
        results = [...results, ...compatibleResults];
        logger.info(
          `📊 [RAG] 策略2合并后结果: ${results.length}个文档 (兼容年级: ${compatibleResults.length}个)`,
          {
            service: "vector-store",
          },
        );
      } else {
        logger.info(`📊 [RAG] 策略2无兼容年级结果`, {
          service: "vector-store",
        });
      }
    }

    // 策略3: 如果结果仍不足，使用学科搜索但提高相关性要求
    if (results.length < 3 && subject) {
      logger.info("🎯 [RAG] 策略3: 高相关性学科搜索", {
        subject,
        service: "vector-store",
      });

      // 构建更精确的查询，包含学科关键词
      const enhancedQuery = `${subject} ${query}`;
      const subjectResults = await this.search(enhancedQuery, {
        limit: 12,
        subject: subject,
        minQualityScore: 0.4, // 进一步提高质量要求
      });

      // 过滤掉已经存在的结果，避免重复
      const newResults = subjectResults.filter(
        (newResult) =>
          !results.some(
            (existingResult) =>
              existingResult.content.substring(0, 100) ===
              newResult.content.substring(0, 100),
          ),
      );

      results = [...results, ...newResults];
      logger.info(
        `📊 [RAG] 策略3合并后结果: ${results.length}个文档 (新增: ${newResults.length}个)`,
        {
          service: "vector-store",
        },
      );
    }

    // 策略4: 如果仍然没有结果，使用通用教学方法搜索
    if (results.length === 0) {
      logger.info("🎯 [RAG] 策略4: 通用教学方法搜索", {
        subject,
        service: "vector-store",
      });

      // 为不同学科提供通用教学指导
      const generalQueries = this.getGeneralQueries(subject, query);

      for (const generalQuery of generalQueries) {
        const generalResults = await this.search(generalQuery, {
          limit: 5,
          minQualityScore: 0.1, // 降低质量要求
        });
        results = [...results, ...generalResults];
        if (results.length >= 3) break; // 找到足够的结果就停止
      }

      logger.info(`📊 [RAG] 策略4合并后结果: ${results.length}个文档`, {
        service: "vector-store",
      });

      // 策略4.1: 如果通用搜索仍无结果，使用纯语义搜索
      if (results.length === 0) {
        logger.info("🎯 [RAG] 策略4.1: 纯语义搜索 (无过滤)", {
          query,
          service: "vector-store",
        });
        results = await this.search(query, {
          limit: 8,
          minQualityScore: 0, // 无质量要求
        });
        logger.info(`📊 [RAG] 策略4.1结果: ${results.length}个文档`, {
          service: "vector-store",
        });
      }
    }

    // 去重（基于内容）
    const uniqueResults = [];
    const seenContent = new Set();
    for (const result of results) {
      const contentKey = result.content.substring(0, 100);
      if (!seenContent.has(contentKey)) {
        seenContent.add(contentKey);
        uniqueResults.push(result);
      }
    }

    // 重新计算相关性分数，考虑年级匹配
    const rerankedResults = uniqueResults.map((result) => {
      let adjustedScore = result.relevanceScore;

      // 年级匹配加分
      if (result.metadata?.grade && normalizedGrade) {
        if (result.metadata.grade === normalizedGrade) {
          adjustedScore += 0.3; // 精确匹配大幅加分
        } else if (
          this.isGradeCompatible(normalizedGrade, result.metadata.grade)
        ) {
          adjustedScore += 0.1; // 相邻年级小幅加分
        } else {
          adjustedScore -= 0.2; // 年级不匹配减分
        }
      }

      return {
        ...result,
        adjustedRelevanceScore: adjustedScore,
      };
    });

    // 根据调整后的相关性分数重新排序，动态调整相似度阈值
    let similarityThreshold = 0.35;

    // 如果结果太少，降低阈值以包含更多内容
    const highQualityResults = rerankedResults.filter(
      (result) => result.similarity > 0.35,
    );
    if (highQualityResults.length === 0 && rerankedResults.length > 0) {
      similarityThreshold = 0.25; // 降低阈值
      logger.info("🔧 [RAG] 降低相似度阈值以获取更多结果", {
        originalThreshold: 0.35,
        newThreshold: similarityThreshold,
        service: "vector-store",
      });
    }

    const rankedResults = rerankedResults
      .filter((result) => result.similarity > similarityThreshold)
      .sort((a, b) => b.adjustedRelevanceScore - a.relevanceScore);

    // 构建上下文，控制总长度
    let context = "";
    let tokenCount = 0;
    const sources = new Set();
    const usedResults = [];

    for (const result of rankedResults) {
      let content = result.content;
      const contentLength = content.length;

      // 如果单个文档超过剩余token限制，进行截断
      const remainingTokens = maxTokens - tokenCount;
      if (contentLength > remainingTokens) {
        if (remainingTokens > 200) {
          // 至少保留200个字符才有意义
          content = content.substring(0, remainingTokens - 50) + "...";
        } else {
          break; // 剩余空间太少，停止添加
        }
      }

      const finalLength = content.length;
      context += `\n\n[来源: ${result.metadata?.source || "未知"}]\n${content}`;
      tokenCount += finalLength;
      sources.add(result.metadata?.source || "未知");
      usedResults.push(result);

      // 如果已经接近token限制，停止添加更多内容
      if (tokenCount >= maxTokens * 0.95) break;
    }

    const result = {
      context: context.trim(),
      sources: Array.from(sources),
      totalResults: rankedResults.length,
      usedResults: usedResults.length,
      tokenCount,
      averageRelevance:
        usedResults.length > 0
          ? usedResults.reduce((sum, r) => sum + r.relevanceScore, 0) /
              usedResults.length
          : 0,
    };

    logger.info("✅ [RAG] 上下文检索完成", {
      contextLength: result.context.length,
      sourceCount: result.sources.length,
      totalResults: result.totalResults,
      usedResults: result.usedResults,
      averageRelevance: result.averageRelevance,
      tokenCount: result.tokenCount,
      sources: result.sources,
      service: "vector-store",
    });

    return result;
  }

  async getCollectionStats() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const count = await this.client.countCollection(this.collection);

      // 获取样本数据以分析分布
      const sampleResults = await this.client.getDocuments(this.collection, {
        limit: Math.min(1000, count),
        include: ["metadatas"],
      });

      const stats = {
        totalDocuments: count,
        collectionName: this.collectionName,
        embeddingModel: this.embeddingModel,
        lastUpdated: new Date().toISOString(),
      };

      if (sampleResults.metadatas && sampleResults.metadatas.length > 0) {
        // 分析学科分布
        const subjectDist = {};
        const gradeDist = {};
        let totalQuality = 0;
        let qualityCount = 0;

        sampleResults.metadatas.forEach((metadata) => {
          if (metadata.subject) {
            subjectDist[metadata.subject] =
              (subjectDist[metadata.subject] || 0) + 1;
          }
          if (metadata.grade) {
            gradeDist[metadata.grade] = (gradeDist[metadata.grade] || 0) + 1;
          }
          if (typeof metadata.qualityScore === "number") {
            totalQuality += metadata.qualityScore;
            qualityCount++;
          }
        });

        stats.subjectDistribution = subjectDist;
        stats.gradeDistribution = gradeDist;
        stats.averageQualityScore =
          qualityCount > 0 ? (totalQuality / qualityCount).toFixed(2) : 0;
        stats.sampleSize = sampleResults.metadatas.length;
      }

      return stats;
    } catch (error) {
      logger.error("获取集合统计失败:", error);
      throw new Error(`获取集合统计失败: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      await this.client.heartbeat();
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "VectorStoreService",
        collection: this.collectionName,
        initialized: this.isInitialized,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "VectorStoreService",
        error: error.message,
        initialized: this.isInitialized,
      };
    }
  }

  async deleteCollection() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.client.deleteCollection(this.collectionName);
      this.collection = null;
      this.isInitialized = false;
      logger.info(`集合 ${this.collectionName} 已删除`);
      return true;
    } catch (error) {
      logger.error("删除集合失败:", error);
      throw new Error(`删除集合失败: ${error.message}`);
    }
  }

  // 添加文档 - 测试需要的方法
  async addDocument(document) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const batchData = this.prepareBatchData(
        document,
        document.filename || "unknown",
      );
      await this.client.addDocuments(this.collection, batchData);
      logger.info(`文档添加成功: ${document.filename}`);
      return true;
    } catch (error) {
      logger.error("添加文档失败:", error);
      throw new Error(`添加文档失败: ${error.message}`);
    }
  }

  // 搜索文档 - 测试需要的方法
  async searchDocuments(query, options = {}) {
    try {
      return await this.search(query, options);
    } catch (error) {
      logger.error("搜索文档失败:", error);
      throw new Error(`搜索文档失败: ${error.message}`);
    }
  }
}

module.exports = VectorStoreService;
