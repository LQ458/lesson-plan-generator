const { ChromaClient } = require("chromadb");
const { DefaultEmbeddingFunction } = require("chromadb");
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
      // 初始化ChromaDB客户端
      this.client = new ChromaClient({
        path: config.chroma.path,
      });

      logger.info(`连接到ChromaDB: ${config.chroma.path}`);

      // 检查集合是否存在
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
          embeddingFunction: new DefaultEmbeddingFunction(),
        });
        logger.info(`使用现有集合: ${this.collectionName}`);
      } catch (error) {
        // 集合不存在，创建新集合
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: config.chroma.collection.metadata,
          embeddingFunction: new DefaultEmbeddingFunction(),
        });
        logger.info(`创建新集合: ${this.collectionName}`);
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
      const optimizedDir = path.join(__dirname, "../../optimized");
      const files = await fs.readdir(optimizedDir);
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
          const filePath = path.join(optimizedDir, file);
          const fileStats = await fs.stat(filePath);

          // 检查文件大小
          if (fileStats.size > config.documents.maxDocumentSize) {
            logger.warn(`跳过大文件: ${file} (${fileStats.size} bytes)`);
            skippedFiles++;
            continue;
          }

          const content = await fs.readFile(filePath, "utf8");
          const document = JSON.parse(content);

          // 验证文档格式
          const validation = textProcessor.validateDocumentFormat(document);
          if (!validation.isValid) {
            logger.warn(`文档格式验证失败: ${file}`, validation.errors);
            loadErrors.push({ file, errors: validation.errors });
            continue;
          }

          if (document.chunks && document.chunks.length > 0) {
            totalChunks += document.chunks.length;

            // 准备批量插入数据
            const batchData = this.prepareBatchData(document, file);

            // 批量添加到向量数据库
            await this.collection.add(batchData);

            loadedChunks += document.chunks.length;
            logger.info(
              `✓ 加载文档: ${document.filename}, 块数: ${document.chunks.length}`,
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

  async search(query, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
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

      const results = await this.collection.query({
        queryTexts: [query],
        nResults: validatedLimit,
        where: whereClause,
        include: includeMetadata
          ? ["documents", "metadatas", "distances"]
          : ["documents", "distances"],
      });

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
      政治: ["思想教育", "品德培养", "公民素养", "道德教育"],
      历史: ["历史故事", "文化传承", "时代背景", "历史人物"],
      地理: ["地理知识", "自然环境", "人文地理", "地图使用"],
      物理: ["物理实验", "科学探究", "物理现象", "实验方法"],
      化学: ["化学实验", "化学反应", "实验安全", "观察记录"],
      生物: ["生物观察", "生命科学", "自然现象", "科学实验"],
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
      "高一",
      "高二",
      "高三",
    ];
    const targetIndex = gradeOrder.indexOf(normalizedTarget);
    const docIndex = gradeOrder.indexOf(normalizedDoc);

    if (targetIndex !== -1 && docIndex !== -1) {
      const diff = Math.abs(targetIndex - docIndex);

      // 小学阶段（1-6年级）：允许相差2个年级
      if (targetIndex <= 5 || docIndex <= 5) {
        return diff <= 2;
      }

      // 初中阶段（7-9年级）：允许相差2个年级
      if (
        (targetIndex >= 6 && targetIndex <= 8) ||
        (docIndex >= 6 && docIndex <= 8)
      ) {
        return diff <= 2;
      }

      // 高中阶段（10-12年级）：允许相差1个年级
      if (targetIndex >= 9 || docIndex >= 9) {
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
        limit: 15,
        subject: subject,
        grade: normalizedGrade,
        minQualityScore: 0,
      });
      logger.info(`📊 [RAG] 策略1结果: ${results.length}个文档`, {
        service: "vector-store",
      });
    }

    // 策略2: 如果结果不足，尝试相邻年级搜索
    if (results.length < 3 && subject && normalizedGrade) {
      logger.info("🎯 [RAG] 策略2: 相邻年级搜索", {
        subject,
        normalizedGrade,
        service: "vector-store",
      });
      const adjacentResults = await this.search(query, {
        limit: 15,
        subject: subject,
        minQualityScore: 0,
      });

      // 过滤出年级兼容的结果
      const compatibleResults = adjacentResults.filter((result) =>
        this.isGradeCompatible(normalizedGrade, result.metadata?.grade),
      );

      results = [...results, ...compatibleResults];
      logger.info(
        `📊 [RAG] 策略2合并后结果: ${results.length}个文档 (兼容年级: ${compatibleResults.length}个)`,
        {
          service: "vector-store",
        },
      );
    }

    // 策略3: 如果结果仍不足，使用学科搜索但提高相关性要求
    if (results.length < 2 && subject) {
      logger.info("🎯 [RAG] 策略3: 高相关性学科搜索", {
        subject,
        service: "vector-store",
      });
      const subjectResults = await this.search(query, {
        limit: 10,
        subject: subject,
        minQualityScore: 0.5, // 提高质量要求
      });
      results = [...results, ...subjectResults];
      logger.info(`📊 [RAG] 策略3合并后结果: ${results.length}个文档`, {
        service: "vector-store",
      });
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
          minQualityScore: 0.3,
        });
        results = [...results, ...generalResults];
        if (results.length >= 3) break; // 找到足够的结果就停止
      }

      logger.info(`📊 [RAG] 策略4合并后结果: ${results.length}个文档`, {
        service: "vector-store",
      });
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
          ? (
              usedResults.reduce((sum, r) => sum + r.relevanceScore, 0) /
              usedResults.length
            ).toFixed(3)
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
      const count = await this.collection.count();

      // 获取样本数据以分析分布
      const sampleResults = await this.collection.get({
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
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = null;
      this.isInitialized = false;
      logger.info(`集合 ${this.collectionName} 已删除`);
      return true;
    } catch (error) {
      logger.error("删除集合失败:", error);
      throw new Error(`删除集合失败: ${error.message}`);
    }
  }
}

module.exports = new VectorStoreService();
