require("dotenv").config();
const winston = require("winston");
const OpenAI = require("openai");
const VectorStore = require("./rag/services/vector-store");
const PerformanceOptimizer = require("./performance-optimization");
const fetch = require('node-fetch');
// Dynamic import for @gradio/client (ES Module)
let Client = null;

// Helper function to get Gradio Client
async function getGradioClient() {
  if (!Client) {
    const gradioModule = await import("@gradio/client");
    Client = gradioModule.Client;
  }
  return Client;
}

// Initialize vector store or RAG API client
let vectorStore;
let ragApiUrl;
let ragApiToken;

if (process.env.RAG_SERVICE_URL) {
  ragApiUrl = process.env.RAG_SERVICE_URL;
  ragApiToken = process.env.RAG_SERVICE_TOKEN;
  console.log(`🌐 Using external RAG service: ${ragApiUrl}`);
  if (ragApiToken) {
    console.log(`🔐 RAG service authentication configured`);
  }
} else {
  vectorStore = new VectorStore();
  console.log("🔍 Using local ChromaDB vector store");
}

// 配置增强日志系统，支持AI响应标识
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    // 添加AI响应标识格式化
    winston.format.printf(
      ({
        timestamp,
        level,
        message,
        service,
        isAIResponse,
        requestId,
        ...meta
      }) => {
        const logData = {
          timestamp,
          level,
          message,
          service,
          isAIResponse: isAIResponse || false, // 标识是否为AI响应
          requestId, // 请求ID
          ...meta,
        };
        return JSON.stringify(logData);
      },
    ),
  ),
  defaultMeta: {
    service: "ai-service",
    isAIResponse: true, // AI服务的日志默认标记为AI响应
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, isAIResponse, requestId, ...meta }) => {
            const aiFlag = isAIResponse ? "🤖[AI]" : "🔧[SYS]";
            const reqId = requestId ? `[${requestId}]` : "";
            return `${timestamp} ${level} ${aiFlag}${reqId} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
          },
        ),
      ),
    }),
    // 可选：添加文件日志
    new winston.transports.File({
      filename: "logs/ai-responses.log",
      level: "info",
      format: winston.format.json(),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.json(),
    }),
  ],
});

class AIService {
  constructor() {
    // 检查必要的环境变量
    if (!process.env.DASHSCOPE_API_KEY) {
      throw new Error("DASHSCOPE_API_KEY 环境变量未设置");
    }

    // 初始化请求计数器
    this.requestCounter = 0;
    
    // 初始化性能优化器
    this.performanceOptimizer = new PerformanceOptimizer();

    // 配置OpenAI兼容接口
    this.openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    this.model = process.env.QWEN_MODEL || "qwen-plus";
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    this.topP = parseFloat(process.env.AI_TOP_P) || 0.8;
    this.enabled = process.env.AI_ENABLED === "true";

    logger.info("AI服务初始化完成", {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      topP: this.topP,
      enabled: this.enabled,
      isAIResponse: false, // 初始化日志不是AI响应
    });
  }

  /**
   * 生成唯一的请求ID
   * @returns {string} 格式化的请求ID
   */
  generateRequestId() {
    this.requestCounter++;
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .slice(0, 15);
    return `AI-${timestamp}-${this.requestCounter.toString().padStart(4, "0")}`;
  }

  /**
   * 创建AI响应日志上下文
   * @param {string} requestId 请求ID
   * @param {string} endpoint API端点
   * @param {Object} params 请求参数
   * @returns {Object} 日志上下文
   */
  createLogContext(requestId, endpoint, params = {}) {
    return {
      requestId,
      endpoint,
      model: this.model,
      timestamp: new Date().toISOString(),
      isAIResponse: true,
      ...params,
    };
  }

  /**
   * 调用AI模型生成内容 - 真正的流式输出
   * @param {string} systemPrompt 系统提示词
   * @param {string} userPrompt 用户提示词
   * @param {Object} res Express响应对象，用于流式输出
   * @param {string} endpoint API端点名称
   * @returns {Promise<void>}
   */
  async generateContentStream(
    systemPrompt,
    userPrompt,
    res,
    endpoint = "generateContent",
  ) {
    if (!this.enabled) {
      throw new Error("AI服务未启用");
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    const logContext = this.createLogContext(requestId, endpoint, {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      startTime: new Date(startTime).toISOString(),
    });

    try {
      logger.info("开始AI内容生成", logContext);

      // 设置响应头为流式传输
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 调用真正的流式API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        stream_options: {
          include_usage: true,
        },
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        top_p: this.topP,
      });

      let fullContent = "";
      let tokenUsage = null;

      // 实时流式输出
      for await (const chunk of completion) {
        // 检查是否是usage信息（最后一个chunk）
        if (chunk.usage) {
          tokenUsage = chunk.usage;
          continue;
        }

        // 处理内容chunk
        if (Array.isArray(chunk.choices) && chunk.choices.length > 0) {
          const deltaContent = chunk.choices[0].delta.content;
          if (deltaContent) {
            fullContent += deltaContent;
            // 实时写入响应流
            res.write(deltaContent);
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // AI现在直接返回带frontmatter的Markdown，无需额外处理
      logger.info("AI内容生成完成，返回格式化的Markdown", {
        ...logContext,
        phase: "completion",
        contentLength: fullContent.length,
      });

      logger.info("AI内容生成成功", {
        ...logContext,
        phase: "success",
        contentLength: fullContent.length,
        inputTokens: tokenUsage?.prompt_tokens,
        outputTokens: tokenUsage?.completion_tokens,
        totalTokens: tokenUsage?.total_tokens,
        duration: `${duration}ms`,
        tokensPerSecond: tokenUsage?.total_tokens
          ? Math.round(tokenUsage.total_tokens / (duration / 1000))
          : 0,
        endTime: new Date(endTime).toISOString(),
      });

      res.end();
    } catch (error) {
      const errorContext = {
        ...logContext,
        phase: "error",
        error: error.message,
        errorStack: error.stack,
        duration: `${Date.now() - startTime}ms`,
      };

      logger.error("AI内容生成失败", errorContext);

      // 直接报错，不使用备用模式
      if (!res.headersSent) {
        res.status(500);
      }
      res.write(`AI服务错误: ${error.message}`);
      res.end();
    }
  }

  /**
   * 生成教案 - 流式输出 with RAG
   */
  async generateLessonPlanStream(subject, grade, topic, requirements, res) {
    const requestId = this.generateRequestId();
    logger.info(
      "收到教案生成请求",
      this.createLogContext(requestId, "lesson-plan", {
        subject,
        grade,
        topic,
        requirementsLength: requirements?.length || 0,
      }),
    );

    // 获取相关文档上下文
    let relevantContext = "";
    let contextSources = [];

    try {
      // Optimize topic for better search results
      const optimizedTopic = this.optimizeEducationalQuery(topic, subject);
      const ragQuery = `${subject} ${grade} ${optimizedTopic}`;
      
      logger.info("🔍 [RAG] 开始检索相关教学资料", {
        requestId,
        query: ragQuery,
        originalTopic: topic,
        optimizedTopic: optimizedTopic,
        subject,
        grade,
        service: "ai-service",
      });

      let contextData;

      if (ragApiUrl) {
        // Use external RAG API service with Gradio client
        logger.info("🌐 [RAG] 连接到外部RAG服务", {
          requestId,
          service: ragApiUrl,
          hasToken: !!ragApiToken
        });

        const GradioClient = await getGradioClient();
        const client = await GradioClient.connect(ragApiUrl, {
          hf_token: ragApiToken
        });

        // Try with specific grade first
        let ragResults = await client.predict("/search_educational_content", {
          query: ragQuery,
          subject: subject,
          grade: grade,
          limit: 5
        });

        // Check if we got meaningful results
        let hasResults = ragResults && ragResults.data && ragResults.data.length > 0 && 
                        ragResults.data.some(result => result && result.trim().length > 10);

        // If no results with specific grade, try with "全部" (all grades) as fallback
        if (!hasResults) {
          logger.info("🔄 [RAG] 特定年级无结果，尝试全年级搜索", {
            requestId,
            originalGrade: grade,
            fallbackGrade: "全部"
          });

          ragResults = await client.predict("/search_educational_content", {
            query: ragQuery,
            subject: subject,
            grade: "全部",
            limit: 5
          });

          hasResults = ragResults && ragResults.data && ragResults.data.length > 0 && 
                      ragResults.data.some(result => result && result.trim().length > 10);
        }

        logger.info("📊 [RAG] 外部服务搜索完成", {
          requestId,
          resultsType: typeof ragResults,
          hasResults: hasResults,
          resultDataType: ragResults ? typeof ragResults.data : 'null'
        });
        
        // Convert API response to expected format - handle formatted text response
        if (hasResults) {
          // ragResults.data contains formatted text, parse it
          const formattedText = Array.isArray(ragResults.data) ? ragResults.data.join('\n') : ragResults.data;
          
          // Extract educational content from formatted text
          relevantContext = formattedText.slice(0, 1500);
          contextSources = ['HuggingFace Educational Database'];
          
          contextData = {
            context: relevantContext,
            sources: contextSources,
            totalResults: 1,
            usedResults: 1
          };
        }
      } else {
        // Use local vector store
        contextData = await vectorStore.getRelevantContext(
          ragQuery,
          subject,
          grade,
          1500, // 限制上下文长度
        );

        // 确保contextData不为undefined
        if (contextData && contextData.context) {
          relevantContext = contextData.context;
          contextSources = contextData.sources || [];
        } else {
          relevantContext = "";
          contextSources = [];
        }
      }

      if (contextSources.length > 0) {
        logger.info("✅ [RAG] 成功检索到相关教学资料", {
          requestId,
          sourcesCount: contextSources.length,
          contextLength: relevantContext.length,
          totalResults: contextData?.totalResults || 0,
          usedResults: contextData?.usedResults || 0,
          sources: contextSources,
          ragType: ragApiUrl ? 'external-api' : 'local-vector-store',
          service: "ai-service",
        });
      } else {
        logger.warn("⚠️ [RAG] 未找到相关教学资料", {
          requestId,
          query: ragQuery,
          subject,
          grade,
          totalResults: contextData?.totalResults || 0,
          ragType: ragApiUrl ? 'external-api' : 'local-vector-store',
          service: "ai-service",
        });
      }
    } catch (error) {
      logger.error("❌ [RAG] 系统错误", {
        requestId,
        error: error.message,
        stack: error.stack,
        ragType: ragApiUrl ? 'external-api' : 'local-vector-store',
        service: "ai-service",
      });
    }

    // 根据学科特色调整系统提示词
    let subjectSpecific = "";
    const scienceSubjects = ["物理", "化学", "生物"];
    const mathSubjects = ["数学"];
    const languageSubjects = ["语文", "英语"];

    if (scienceSubjects.includes(subject)) {
      subjectSpecific = `
特别注意${subject}学科特色：
- 重视实验观察和科学探究
- 教学过程中要有实验演示或学生动手环节
- 作业设计要包含计算题或实验报告
- 培养学生的科学思维和实践能力`;
    } else if (mathSubjects.includes(subject)) {
      subjectSpecific = `
特别注意数学学科特色：
- 重视逻辑思维训练和解题方法
- 教学过程要有例题分析和练习巩固
- 作业设计要包含不同难度的练习题
- 培养学生的数学思维和计算能力`;
    } else if (languageSubjects.includes(subject)) {
      subjectSpecific = `
特别注意语言学科特色：
- 重视语感培养和文本理解
- 教学过程要有朗读、讨论、交流环节
- 作业设计要包含写作或表达练习
- 培养学生的语言表达和理解能力`;
    }

    // 构建增强的系统提示词
    let systemPrompt = `你是一位专业的教师，擅长制作详细的教案。请根据用户的要求生成一份完整、实用的教案。

要求：
1. 必须返回Markdown格式的教案，开头包含YAML frontmatter元数据
2. 教案应包含教学目标、教学重点、教学难点、教学过程等完整结构
3. 内容要具体、实用，符合该年级学生的认知水平
4. 语言要清晰、准确，便于教师使用
5. 教学过程要详细，包含具体的教学活动和时间安排
6. 使用中文输出，格式美观易读
${subjectSpecific}`;

    // 如果有相关文档上下文，添加到提示词中
    if (relevantContext) {
      systemPrompt += `

参考教学资料：
${relevantContext}

请参考以上教学资料，结合其中的教学方法、重点难点分析和教学建议，生成更专业、更贴近教学实际的教案。`;
    }

    systemPrompt += `

返回格式示例：
---
title: "课题名称"
subject: "学科"
grade: "年级"
duration: 45
detailedObjectives:
  - "具体的教学目标1"
  - "具体的教学目标2"
keyPoints:
  - "教学重点1"
  - "教学重点2"
difficulties:
  - "教学难点1"
  - "教学难点2"
teachingMethods:
  - "教学方法1 - 具体说明"
  - "教学方法2 - 具体说明"
teachingProcess:
  - stage: "导入新课"
    duration: 5
    content:
      - "具体活动1"
      - "具体活动2"
  - stage: "新课讲解"
    duration: 25
    content:
      - "具体活动1"
      - "具体活动2"
homework:
  - "作业安排1"
  - "作业安排2"
reflection: "教学反思内容"
referenceSources: ${contextSources.length > 0 ? JSON.stringify(contextSources) : "[]"}
---

# 课题名称

**科目**: 学科 | **年级**: 年级 | **课时**: 45分钟

## 🎯 教学目标

1. 具体的教学目标1
2. 具体的教学目标2

## 📋 教学重点

- 教学重点1
- 教学重点2

## 🔍 教学难点

- 教学难点1
- 教学难点2

## 🎓 教学方法

- 教学方法1 - 具体说明
- 教学方法2 - 具体说明

## 📚 教学过程

### 导入新课 (5分钟)

- 具体活动1
- 具体活动2

### 新课讲解 (25分钟)

- 具体活动1
- 具体活动2

## 📝 课后作业

- 作业安排1
- 作业安排2

## 💭 教学反思

教学反思内容

${
  contextSources.length > 0
    ? `
## 📚 参考资料

本教案参考了以下教学资料：
${contextSources.map((source) => `- ${source}`).join("\n")}
`
    : ""
}`;

    const userPrompt = `请为我生成一份教案：
- 科目：${subject}
- 年级：${grade}  
- 主题：${topic}
${requirements ? `- 特殊要求：${requirements}` : ""}

请严格按照示例格式返回，包含完整的YAML frontmatter元数据和美观的Markdown正文。${relevantContext ? "请充分利用提供的参考教学资料，生成更专业的教案。" : ""}`;

    return await this.generateContentStream(systemPrompt, userPrompt, res);
  }

  /**
   * 生成练习题 - 流式输出，支持年级课程限制
   */
  async generateExercisesStream(
    subject,
    grade,
    topic,
    difficulty,
    count,
    questionType,
    requirements,
    res,
  ) {
    const requestId = this.generateRequestId();
    logger.info(
      "收到练习题生成请求",
      this.createLogContext(requestId, "exercises", {
        subject,
        grade,
        topic,
        difficulty,
        count,
        questionType,
        requirementsLength: requirements?.length || 0,
      }),
    );

    // 获取相关文档上下文
    let relevantContext = "";
    let contextSources = [];

    try {
      // Optimize topic for better search results
      const optimizedTopic = this.optimizeEducationalQuery(topic, subject);
      const ragQuery = `${subject} ${grade} ${optimizedTopic} 练习题 习题`;
      
      logger.info("🔍 [RAG] 开始检索相关练习题资料", {
        requestId,
        query: ragQuery,
        originalTopic: topic,
        optimizedTopic: optimizedTopic,
        subject,
        grade,
        service: "ai-service",
      });

      let contextData;

      if (ragApiUrl) {
        // Use external RAG API service with Gradio client
        logger.info("🌐 [RAG] 连接到外部RAG服务(练习题)", {
          requestId,
          service: ragApiUrl,
          hasToken: !!ragApiToken
        });

        const GradioClient = await getGradioClient();
        const client = await GradioClient.connect(ragApiUrl, {
          hf_token: ragApiToken
        });

        // Try with specific grade first
        let ragResults = await client.predict("/search_educational_content", {
          query: ragQuery,
          subject: subject,
          grade: grade,
          limit: 5
        });

        // Check if we got meaningful results
        let hasResults = ragResults && ragResults.data && ragResults.data.length > 0 && 
                        ragResults.data.some(result => result && result.trim().length > 10);

        // If no results with specific grade, try with "全部" (all grades) as fallback
        if (!hasResults) {
          logger.info("🔄 [RAG] 练习题特定年级无结果，尝试全年级搜索", {
            requestId,
            originalGrade: grade,
            fallbackGrade: "全部"
          });

          ragResults = await client.predict("/search_educational_content", {
            query: ragQuery,
            subject: subject,
            grade: "全部",
            limit: 5
          });

          hasResults = ragResults && ragResults.data && ragResults.data.length > 0 && 
                      ragResults.data.some(result => result && result.trim().length > 10);
        }

        logger.info("📊 [RAG] 外部服务练习题搜索完成", {
          requestId,
          resultsType: typeof ragResults,
          hasResults: hasResults,
          resultDataType: ragResults ? typeof ragResults.data : 'null'
        });
        
        // Convert API response to expected format - handle formatted text response
        if (hasResults) {
          // ragResults.data contains formatted text, parse it
          const formattedText = Array.isArray(ragResults.data) ? ragResults.data.join('\n') : ragResults.data;
          
          // Extract educational content from formatted text
          relevantContext = formattedText.slice(0, 1200);
          contextSources = ['HuggingFace Educational Database'];
          
          contextData = {
            context: relevantContext,
            sources: contextSources,
            totalResults: 1,
            usedResults: 1
          };
        }
      } else {
        // Use local vector store
        contextData = await vectorStore.getRelevantContext(
          ragQuery,
          subject,
          grade,
          1200, // 限制上下文长度，练习题相对简短
        );

        // 确保contextData不为undefined
        if (contextData && contextData.context) {
          relevantContext = contextData.context;
          contextSources = contextData.sources || [];
        } else {
          relevantContext = "";
          contextSources = [];
        }
      }

      if (contextSources.length > 0) {
        logger.info("✅ [RAG] 成功检索到相关练习题资料", {
          requestId,
          sourcesCount: contextSources.length,
          contextLength: relevantContext.length,
          totalResults: contextData?.totalResults || 0,
          usedResults: contextData?.usedResults || 0,
          sources: contextSources,
          ragType: ragApiUrl ? 'external-api' : 'local-vector-store',
          service: "ai-service",
        });
      } else {
        logger.warn("⚠️ [RAG] 未找到相关练习题资料", {
          requestId,
          query: ragQuery,
          subject,
          grade,
          totalResults: contextData?.totalResults || 0,
          ragType: ragApiUrl ? 'external-api' : 'local-vector-store',
          service: "ai-service",
        });
      }
    } catch (error) {
      logger.error("❌ [RAG] 系统错误", {
        requestId,
        error: error.message,
        stack: error.stack,
        ragType: ragApiUrl ? 'external-api' : 'local-vector-store',
        service: "ai-service",
      });
    }

    const difficultyMap = {
      easy: "简单",
      medium: "中等",
      hard: "困难",
      简单: "简单",
      中等: "中等",
      困难: "困难",
    };

    // 年级课程限制映射
    const gradeSubjectMap = {
      小学: {
        一年级: ["语文", "数学", "音乐", "美术", "体育"],
        二年级: ["语文", "数学", "音乐", "美术", "体育"],
        三年级: ["语文", "数学", "英语", "音乐", "美术", "体育"],
        四年级: ["语文", "数学", "英语", "音乐", "美术", "体育"],
        五年级: ["语文", "数学", "英语", "音乐", "美术", "体育"],
        六年级: ["语文", "数学", "英语", "音乐", "美术", "体育"],
      },
      初中: {
        七年级: [
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "历史",
          "地理",
          "政治",
          "音乐",
          "美术",
          "体育",
        ],
        八年级: [
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "历史",
          "地理",
          "政治",
          "音乐",
          "美术",
          "体育",
        ],
        九年级: [
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "历史",
          "地理",
          "政治",
          "音乐",
          "美术",
          "体育",
        ],
      },
    };

    // 检查年级科目限制
    const gradeLevel = this.determineGradeLevel(grade);
    const allowedSubjects = gradeSubjectMap[gradeLevel]
      ? gradeSubjectMap[gradeLevel][grade]
      : null;

    if (allowedSubjects && !allowedSubjects.includes(subject)) {
      throw new Error(`${grade}暂不支持${subject}科目，请选择其他科目或年级`);
    }

    // 根据年级调整难度和内容深度
    const gradeSpecificPrompt = this.getGradeSpecificPrompt(grade, subject);

    // 构建增强的系统提示词
    let systemPrompt = `你是一位专业的教师，擅长出题和命题。请根据用户的要求生成练习题。

要求：
1. 题目要符合指定的难度等级和年级水平
2. 题目类型要丰富，包含选择题、填空题、简答题等
3. 每道题目都要提供正确答案和详细解析
4. 题目要有一定的教学价值，能够检验学生对知识点的掌握
5. 使用中文输出
6. 格式要求使用Markdown格式，结构清晰
7. 严格按照年级教学大纲要求，不得超出学生认知水平
8. 对于小学生，题目描述要简单易懂，避免过于复杂的表达
9. 对于中学生，可以适当增加推理和分析能力的考察

${gradeSpecificPrompt}`;

    // 如果有相关文档上下文，添加到提示词中
    if (relevantContext) {
      systemPrompt += `

参考练习题资料：
${relevantContext}

请参考以上练习题资料，结合其中的题目类型、难度设置和解析方式，生成更专业、更符合教学要求的练习题。`;
    }

    const userPrompt = `请为我生成练习题：
- 科目：${subject}
- 年级：${grade}
- 主题：${topic}
- 难度：${difficultyMap[difficulty] || difficulty}
- 题目类型：${questionType}
- 题目数量：${count}道
${requirements ? `- 特殊要求：${requirements}` : ""}

请生成指定数量的练习题，每道题都要包含题目、选项（如适用）、答案和解析。
请确保题目符合该年级学生的认知水平和课程标准。${relevantContext ? "请充分利用提供的参考练习题资料，生成更专业的题目。" : ""}`;

    return await this.generateContentStream(
      systemPrompt,
      userPrompt,
      res,
      "exercises",
    );
  }

  /**
   * 判断年级所属的教育阶段
   */
  determineGradeLevel(grade) {
    const primaryGrades = [
      "一年级",
      "二年级",
      "三年级",
      "四年级",
      "五年级",
      "六年级",
    ];
    const middleGrades = ["七年级", "八年级", "九年级", "初一", "初二", "初三"];

    if (primaryGrades.includes(grade)) {
      return "小学";
    } else if (middleGrades.includes(grade)) {
      return "初中";
    }
    return "通用";
  }

  /**
   * 获取年级特定的提示词
   */
  getGradeSpecificPrompt(grade, subject) {
    const gradeLevel = this.determineGradeLevel(grade);

    const prompts = {
      小学: `
特别注意：
- 语言要简单明了，避免使用过于复杂的词汇
- 题目情境要贴近小学生的日常生活
- 数学题目要从具体到抽象，多使用图形和实物
- 语文题目要注重基础知识，如拼音、词语、简单的阅读理解
- 避免出现超纲内容，如复杂的几何证明、高难度的文言文等`,

      初中: `
特别注意：
- 可以适当增加推理和分析的成分
- 题目可以涉及一些综合性的知识点
- 数学可以包含代数、几何的基础内容
- 语文可以包含文言文、现代文阅读等
- 科学类科目要注重实验和观察能力的培养`,
    };

    return prompts[gradeLevel] || "";
  }

  /**
   * 优化教育查询关键词
   */
  optimizeEducationalQuery(topic, subject) {
    // Educational topic optimization mappings
    const mathOptimizations = {
      '一元二次方程': '方程',
      '一元一次方程': '方程', 
      '二次函数': '函数',
      '一次函数': '函数',
      '三角形的性质': '三角形',
      '四边形': '四边形',
      '圆的性质': '圆',
      '概率统计': '概率',
      '数列': '数列'
    };

    const chineseOptimizations = {
      '现代文阅读理解': '阅读',
      '文言文阅读': '文言文',
      '作文写作技巧': '作文',
      '诗词鉴赏': '诗词',
      '语法知识': '语法'
    };

    const scienceOptimizations = {
      '化学实验': '实验',
      '物理实验': '实验',
      '生物实验': '实验',
      '力学': '力',
      '电学': '电',
      '光学': '光'
    };

    let optimizedTopic = topic;

    if (subject === '数学' && mathOptimizations[topic]) {
      optimizedTopic = mathOptimizations[topic];
    } else if (subject === '语文' && chineseOptimizations[topic]) {
      optimizedTopic = chineseOptimizations[topic];
    } else if (['物理', '化学', '生物'].includes(subject) && scienceOptimizations[topic]) {
      optimizedTopic = scienceOptimizations[topic];
    }

    return optimizedTopic !== topic ? optimizedTopic : topic;
  }

  /**
   * 内容分析 - 非流式返回
   */
  async analyzeContent(content, analysisType) {
    if (!this.enabled) {
      throw new Error("AI服务未启用");
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const logContext = this.createLogContext(requestId, "analyze", {
        analysisType,
        contentLength: content.length,
        startTime: new Date(startTime).toISOString(),
      });

      logger.info("开始AI内容分析", logContext);
      let systemPrompt, userPrompt;

      if (analysisType === "概念提取") {
        systemPrompt = `你是一位专业的教育文本处理专家，擅长从教育内容中提取核心概念。

要求：
1. 提取最核心、最简洁的概念词汇
2. 优先保留学科专业术语和数学公式
3. 特别保护数学表达式的完整性（如 ax²+bx+c=0, E=mc², H₂O 等）
4. 去除冗余修饰词，但保留重要的学科符号
5. 确保提取的概念准确且易于理解
6. 对于数学/科学内容，可以适当放宽长度限制
7. 直接返回提取的核心概念，无需其他解释`;

        userPrompt = `请从以下教育内容中提取核心概念：

"${content.substring(0, 300)}"

要求：
- 如果包含数学公式或科学表达式，必须保持完整性（不超过25个字符）
- 普通文本概念不超过15个字符
- 直接返回核心概念，不要任何额外的解释或格式`;
      } else {
        systemPrompt = `你是一位专业的教育内容分析师，擅长对各种教育内容进行深入分析。请根据用户指定的分析类型，对提供的内容进行专业分析。

要求：
1. 分析要深入、客观、有建设性
2. 提供具体的改进建议
3. 分析结果要有实用价值
4. 使用中文输出
5. 格式要求使用Markdown格式，结构清晰`;

        userPrompt = `请对以下内容进行${analysisType}分析：

---
${content}
---

请提供详细的分析报告，包括优点、不足和改进建议。`;
      }

      // 调用非流式API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: analysisType === "概念提取" ? 50 : this.maxTokens,
        temperature: analysisType === "概念提取" ? 0.1 : this.temperature,
        top_p: this.topP,
      });

      const result = completion.choices[0].message.content.trim();
      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.info("AI内容分析成功", {
        ...logContext,
        phase: "success",
        resultLength: result.length,
        duration: `${duration}ms`,
        endTime: new Date(endTime).toISOString(),
      });

      return result;
    } catch (error) {
      const errorContext = {
        ...logContext,
        phase: "error",
        error: error.message,
        errorStack: error.stack,
        duration: `${Date.now() - startTime}ms`,
      };

      logger.error("AI内容分析失败", errorContext);
      throw error;
    }
  }

  /**
   * 检查服务状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      topP: this.topP,
      apiConfigured: !!process.env.DASHSCOPE_API_KEY,
      usingOpenAICompatible: true,
    };
  }
}

module.exports = AIService;
