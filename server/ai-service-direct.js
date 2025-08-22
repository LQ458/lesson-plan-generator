/**
 * Direct AI Service - Native Chinese AI Providers
 * Implements true streaming without OpenAI compatibility layers
 * Massive performance improvement through direct provider integration
 */

const winston = require("winston");
const SimpleRAGService = require("./rag/services/simple-rag-service");
const ChineseAIProviders = require("./providers/chinese-ai-providers");
const PerformanceOptimizer = require("./performance-optimization");

const simpleRAG = new SimpleRAGService();

// Enhanced logging for direct streaming
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({
      timestamp,
      level,
      message,
      service,
      isDirectStream,
      requestId,
      provider,
      ...meta
    }) => {
      const logData = {
        timestamp,
        level,
        message,
        service,
        isDirectStream: isDirectStream || false,
        provider: provider || 'unknown',
        requestId,
        ...meta,
      };
      return JSON.stringify(logData);
    }),
  ),
  defaultMeta: {
    service: "ai-service-direct",
    isDirectStream: true,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, isDirectStream, requestId, provider, ...meta }) => {
          const streamFlag = isDirectStream ? "🚀[DIRECT]" : "🔧[LEGACY]";
          const providerFlag = provider ? `[${provider.toUpperCase()}]` : "";
          const reqId = requestId ? `[${requestId}]` : "";
          return `${timestamp} ${level} ${streamFlag}${providerFlag}${reqId} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: "logs/direct-streaming.log",
      level: "info",
      format: winston.format.json(),
    }),
  ],
});

class DirectAIService {
  constructor() {
    // Check required environment variables
    if (!process.env.DASHSCOPE_API_KEY) {
      throw new Error("DASHSCOPE_API_KEY environment variable is required");
    }

    // Initialize request counter
    this.requestCounter = 0;
    
    // Initialize Chinese AI providers
    this.aiProviders = new ChineseAIProviders();
    
    // Initialize performance optimizer
    this.performanceOptimizer = new PerformanceOptimizer();

    // Configuration
    this.model = process.env.QWEN_MODEL || "qwen-turbo";
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 1500; // Reduced default
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    this.topP = parseFloat(process.env.AI_TOP_P) || 0.8;
    this.enabled = process.env.AI_ENABLED !== "false";

    // Speed optimization settings
    this.speedOptimizations = {
      enableDirectStreaming: true,
      enableProgressiveFeedback: true,
      enableSmartCaching: true,
      enableProviderFallback: true,
      timeoutMs: 30000, // 30 second timeout
    };

    logger.info("Direct AI Service initialized", {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      topP: this.topP,
      enabled: this.enabled,
      providers: this.aiProviders.getProvidersStatus(),
      optimizations: this.speedOptimizations,
    });
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    this.requestCounter++;
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .slice(0, 15);
    return `DIRECT-${timestamp}-${this.requestCounter.toString().padStart(4, "0")}`;
  }

  /**
   * Direct streaming lesson plan generation - TRUE STREAMING
   * @param {string} subject Subject
   * @param {string} grade Grade level
   * @param {string} topic Topic
   * @param {string} requirements Requirements
   * @param {Object} res Express response object
   */
  async generateLessonPlanStreamDirect(subject, grade, topic, requirements, res) {
    if (!this.enabled) {
      throw new Error("AI service is disabled");
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Check cache first for instant response
    const cached = this.performanceOptimizer.getCachedResponse(
      subject, grade, topic, requirements
    );
    
    if (cached) {
      logger.info("Cache hit - instant response", {
        requestId,
        subject,
        grade,
        topic,
        provider: "cache",
        responseTime: 0
      });
      
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("X-Cache", "HIT");
      res.write(cached);
      res.end();
      return;
    }

    const logContext = {
      requestId,
      subject,
      grade,
      topic,
      requirementsLength: requirements?.length || 0,
      startTime: new Date(startTime).toISOString(),
      provider: this.aiProviders.currentProvider,
    };

    try {
      logger.info("Starting direct streaming generation", logContext);

      // Set up direct streaming response headers
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Stream-Type", "DIRECT");
      res.setHeader("X-Provider", this.aiProviders.currentProvider);

      // Progressive feedback - immediate response
      if (this.speedOptimizations.enableProgressiveFeedback) {
        res.write("🚀 AI开始生成教案...\n\n");
      }

      // Get RAG context with timeout
      let ragContext = "";
      let ragSources = [];
      
      const ragStartTime = Date.now();
      try {
        // Initialize simple RAG if needed
        await simpleRAG.initialize();
        
        const ragResult = await Promise.race([
          this.getRelevantContextSimple(topic, subject, grade, 1200),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RAG timeout")), 3000) // 3s timeout
          )
        ]);
        
        ragContext = ragResult.context;
        ragSources = ragResult.sources;
        
        const ragTime = Date.now() - ragStartTime;
        logger.info("RAG context retrieved", {
          ...logContext,
          ragTime,
          contextLength: ragContext.length,
          sourcesCount: ragSources.length
        });
      } catch (error) {
        logger.warn("RAG retrieval failed, proceeding without context", {
          ...logContext,
          error: error.message
        });
      }

      // Create optimized prompts
      const systemPrompt = this.createOptimizedSystemPrompt(subject, grade);
      const userPrompt = this.createOptimizedUserPrompt(
        subject, grade, topic, requirements, ragContext
      );

      // Get speed-optimized parameters
      const streamParams = this.getSpeedOptimizedParams("lesson_plan");

      // Create direct stream from Chinese AI provider
      logger.info("Creating direct stream", {
        ...logContext,
        model: streamParams.model,
        maxTokens: streamParams.maxTokens,
        provider: this.aiProviders.currentProvider
      });

      const stream = await this.aiProviders.createStreamCompletion({
        model: streamParams.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        maxTokens: streamParams.maxTokens,
        temperature: streamParams.temperature,
        topP: streamParams.topP,
        stream: true
      });

      let fullContent = "";
      let firstContentReceived = false;
      let tokenCount = 0;

      // Process direct stream - TRUE STREAMING
      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.content) {
          // Remove progress indicator when first real content arrives
          if (!firstContentReceived && this.speedOptimizations.enableProgressiveFeedback) {
            res.write("\r🎯 正在生成：\n\n");
            firstContentReceived = true;
          }

          // Write content directly to response - NO BUFFERING
          res.write(chunk.content);
          fullContent += chunk.content;
          tokenCount++;

          // Log progress every 50 tokens
          if (tokenCount % 50 === 0) {
            const currentTime = Date.now() - startTime;
            logger.debug("Streaming progress", {
              ...logContext,
              tokens: tokenCount,
              contentLength: fullContent.length,
              elapsedMs: currentTime,
              tokensPerSecond: (tokenCount / (currentTime / 1000)).toFixed(2)
            });
          }
        } else if (chunk.type === 'completion') {
          // Stream completed
          const endTime = Date.now();
          const duration = endTime - startTime;

          logger.info("Direct streaming completed", {
            ...logContext,
            phase: "completion",
            contentLength: fullContent.length,
            tokens: chunk.usage?.completion_tokens || tokenCount,
            duration: `${duration}ms`,
            tokensPerSecond: chunk.usage?.tokens_per_second || (tokenCount / (duration / 1000)),
            provider: this.aiProviders.currentProvider,
            success: true
          });

          // Cache successful response for future requests
          if (this.speedOptimizations.enableSmartCaching && fullContent.length > 100) {
            this.performanceOptimizer.cacheResponse(
              subject, grade, topic, requirements, fullContent
            );
          }

          break;
        }
      }

      res.end();

      // Record performance metrics
      const finalResponseTime = Date.now() - startTime;
      this.performanceOptimizer.recordMetrics(startTime, false);

      logger.info("Lesson plan generation completed successfully", {
        ...logContext,
        phase: "success",
        finalResponseTime,
        contentLength: fullContent.length,
        cacheUpdated: this.speedOptimizations.enableSmartCaching
      });

    } catch (error) {
      const errorTime = Date.now() - startTime;
      
      logger.error("Direct streaming failed", {
        ...logContext,
        phase: "error",
        error: error.message,
        errorStack: error.stack,
        duration: `${errorTime}ms`,
        provider: this.aiProviders.currentProvider
      });

      // Fallback strategy
      if (this.speedOptimizations.enableProviderFallback) {
        await this.handleStreamingFallback(error, res, logContext);
      } else {
        if (!res.headersSent) {
          res.status(500);
        }
        res.write(`\n❌ 生成失败: ${error.message}`);
        res.end();
      }
    }
  }

  /**
   * Handle streaming fallback when primary provider fails
   */
  async handleStreamingFallback(primaryError, res, logContext) {
    logger.info("Attempting fallback strategy", logContext);

    try {
      // Try basic response generation
      const fallbackContent = this.generateFallbackContent(
        logContext.subject,
        logContext.grade,
        logContext.topic
      );

      if (!res.headersSent) {
        res.setHeader("X-Fallback", "true");
      }
      
      res.write("\n\n⚠️ 使用备用模式生成：\n\n");
      res.write(fallbackContent);
      res.end();

      logger.info("Fallback response sent", {
        ...logContext,
        fallbackContentLength: fallbackContent.length
      });

    } catch (fallbackError) {
      logger.error("Fallback also failed", {
        ...logContext,
        primaryError: primaryError.message,
        fallbackError: fallbackError.message
      });

      if (!res.headersSent) {
        res.status(500);
      }
      res.write(`\n❌ 所有生成方式均失败，请稍后重试`);
      res.end();
    }
  }

  /**
   * Generate fallback content
   */
  generateFallbackContent(subject, grade, topic) {
    return `# ${topic} - ${subject}教案

**年级**: ${grade}
**科目**: ${subject}
**课题**: ${topic}

## 🎯 教学目标
- 掌握${topic}的基本概念和原理
- 能够运用${topic}知识解决实际问题
- 培养学生的学习兴趣和思维能力

## 📚 教学重点
- ${topic}的核心概念
- 基本方法和技能
- 实际应用

## 🔍 教学难点  
- 概念的深入理解
- 方法的灵活运用
- 知识的迁移应用

## 📖 教学过程

### 1. 导入新课 (5分钟)
- 复习相关知识
- 引入新课主题

### 2. 新课讲解 (25分钟)
- 讲解${topic}的基本概念
- 演示相关方法和技能
- 举例说明应用场景

### 3. 课堂练习 (10分钟)
- 学生独立练习
- 教师巡视指导

### 4. 总结作业 (5分钟)
- 总结重点内容
- 布置课后作业

## 📝 课后作业
- 完成相关练习题
- 预习下节课内容

## 💭 教学反思
本节课通过系统讲解和实践练习，帮助学生掌握${topic}的基本知识和技能。

---
⚡ 这是一个基础教案模板，建议根据具体教学需求进行调整和完善。
`;
  }

  /**
   * Create optimized system prompt for faster generation
   */
  createOptimizedSystemPrompt(subject, grade) {
    return `你是专业的${subject}教师，为${grade}学生设计教案。

要求：
1. 生成结构化的教案，包含YAML前置数据和Markdown正文
2. 内容要适合${grade}学生的认知水平
3. 重点突出，难点明确，方法实用
4. 字数控制在800-1200字，避免冗长

输出格式：
---
title: "课题名称"
subject: "${subject}"
grade: "${grade}"
duration: 45
objectives: ["目标1", "目标2"]
---

# Markdown格式的教案正文`;
  }

  /**
   * Create optimized user prompt
   */
  createOptimizedUserPrompt(subject, grade, topic, requirements, ragContext) {
    let prompt = `请为${grade}${subject}课程设计《${topic}》的教案。`;
    
    if (requirements) {
      prompt += `\n\n特别要求：${requirements}`;
    }

    if (ragContext && ragContext.length > 0) {
      // Limit RAG context to prevent overly long prompts
      const limitedContext = ragContext.substring(0, 800);
      prompt += `\n\n参考材料：${limitedContext}`;
    }

    return prompt;
  }

  /**
   * Get speed-optimized parameters for different request types
   */
  getSpeedOptimizedParams(requestType) {
    const optimizations = {
      lesson_plan: {
        model: "qwen-turbo", // Fastest model
        maxTokens: Math.min(this.maxTokens, 1200), // Reduced for speed
        temperature: Math.min(this.temperature + 0.1, 1.0), // Slightly higher for speed
        topP: Math.max(this.topP - 0.1, 0.7), // More focused
      },
      exercises: {
        model: "qwen-turbo",
        maxTokens: Math.min(this.maxTokens, 1000),
        temperature: 0.6,
        topP: 0.8,
      },
      analysis: {
        model: "qwen-turbo",
        maxTokens: 200,
        temperature: 0.1,
        topP: 0.6,
      }
    };

    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      topP: this.topP,
      ...optimizations[requestType]
    };
  }

  /**
   * Exercise generation with direct streaming
   */
  async generateExercisesStreamDirect(subject, grade, topic, difficulty, count, type, requirements, res) {
    // Similar implementation to lesson plan but optimized for exercises
    // Implementation would be similar but with exercise-specific prompts and optimizations
    
    logger.info("Exercise generation not yet implemented in direct service", {
      subject, grade, topic, difficulty, count, type
    });
    
    res.status(501);
    res.write("Exercise generation will be implemented in direct service soon");
    res.end();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      topP: this.topP,
      providers: this.aiProviders.getProvidersStatus(),
      optimizations: this.speedOptimizations,
      performance: this.performanceOptimizer.getPerformanceReport(),
      streaming: "DIRECT", // True direct streaming
      version: "2.0-direct"
    };
  }

  /**
   * Get relevant context using simple RAG service
   */
  async getRelevantContextSimple(topic, subject, grade, maxLength = 1200) {
    try {
      const searchQuery = `${topic} ${subject} ${grade}`;
      const results = await simpleRAG.searchRelevantContent(searchQuery, {
        maxResults: 3,
        subjects: [subject],
        grades: [grade]
      });

      if (!results || results.length === 0) {
        return { context: "", sources: [] };
      }

      let context = "";
      const sources = [];

      for (const result of results) {
        if (context.length + result.content.length > maxLength) {
          break;
        }
        
        context += result.content + "\n\n";
        sources.push({
          source: result.metadata.source,
          grade: result.metadata.grade,
          subject: result.metadata.subject,
          score: result.score
        });
      }

      return {
        context: context.trim(),
        sources: sources
      };

    } catch (error) {
      console.warn('Simple RAG search failed:', error.message);
      return { context: "", sources: [] };
    }
  }

  /**
   * Test direct streaming performance
   */
  async testDirectStreaming() {
    const testResults = {
      providers: await this.aiProviders.testAllProviders(),
      performance: this.performanceOptimizer.getPerformanceReport(),
      streaming: "DIRECT_NATIVE",
      rag: await simpleRAG.getStatus()
    };

    return testResults;
  }
}

module.exports = DirectAIService;