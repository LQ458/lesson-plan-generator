const winston = require("winston");
const OpenAI = require("openai");

// 配置日志
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "ai-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

class AIService {
  constructor() {
    // 检查必要的环境变量
    if (!process.env.DASHSCOPE_API_KEY) {
      throw new Error("DASHSCOPE_API_KEY 环境变量未设置");
    }

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
    });
  }

  /**
   * 调用AI模型生成内容 - 真正的流式输出
   * @param {string} systemPrompt 系统提示词
   * @param {string} userPrompt 用户提示词
   * @param {Object} res Express响应对象，用于流式输出
   * @returns {Promise<void>}
   */
  async generateContentStream(systemPrompt, userPrompt, res) {
    if (!this.enabled) {
      throw new Error("AI服务未启用");
    }

    try {
      logger.info("开始AI内容生成", {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      });

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

      // AI现在直接返回带frontmatter的Markdown，无需额外处理
      logger.info("AI内容生成完成，返回格式化的Markdown");

      logger.info("AI内容生成成功", {
        model: this.model,
        contentLength: fullContent.length,
        inputTokens: tokenUsage?.prompt_tokens,
        outputTokens: tokenUsage?.completion_tokens,
        totalTokens: tokenUsage?.total_tokens,
      });

      res.end();
    } catch (error) {
      logger.error("AI内容生成失败", {
        error: error.message,
        model: this.model,
      });

      // 直接报错，不使用备用模式
      if (!res.headersSent) {
        res.status(500);
      }
      res.write(`AI服务错误: ${error.message}`);
      res.end();
    }
  }

  /**
   * 生成教案 - 流式输出
   */
  async generateLessonPlanStream(subject, grade, topic, requirements, res) {
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

    const systemPrompt = `你是一位专业的教师，擅长制作详细的教案。请根据用户的要求生成一份完整、实用的教案。

要求：
1. 必须返回Markdown格式的教案，开头包含YAML frontmatter元数据
2. 教案应包含教学目标、教学重点、教学难点、教学过程等完整结构
3. 内容要具体、实用，符合该年级学生的认知水平
4. 语言要清晰、准确，便于教师使用
5. 教学过程要详细，包含具体的教学活动和时间安排
6. 使用中文输出，格式美观易读
${subjectSpecific}

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

教学反思内容`;

    const userPrompt = `请为我生成一份教案：
- 科目：${subject}
- 年级：${grade}  
- 主题：${topic}
${requirements ? `- 特殊要求：${requirements}` : ""}

请严格按照示例格式返回，包含完整的YAML frontmatter元数据和美观的Markdown正文。`;

    return await this.generateContentStream(systemPrompt, userPrompt, res);
  }

  /**
   * 生成练习题 - 流式输出
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
    const difficultyMap = {
      easy: "简单",
      medium: "中等",
      hard: "困难",
      简单: "简单",
      中等: "中等",
      困难: "困难",
    };

    const systemPrompt = `你是一位专业的教师，擅长出题和命题。请根据用户的要求生成练习题。

要求：
1. 题目要符合指定的难度等级和年级水平
2. 题目类型要丰富，包含选择题、填空题、简答题等
3. 每道题目都要提供正确答案和详细解析
4. 题目要有一定的教学价值，能够检验学生对知识点的掌握
5. 使用中文输出
6. 格式要求使用Markdown格式，结构清晰`;

    const userPrompt = `请为我生成练习题：
- 科目：${subject}
- 年级：${grade}
- 主题：${topic}
- 难度：${difficultyMap[difficulty] || difficulty}
- 题目类型：${questionType}
- 题目数量：${count}道
${requirements ? `- 特殊要求：${requirements}` : ""}

请生成指定数量的练习题，每道题都要包含题目、选项（如适用）、答案和解析。`;

    return await this.generateContentStream(systemPrompt, userPrompt, res);
  }

  /**
   * 内容分析
   */
  async analyzeContent(content, analysisType) {
    const systemPrompt = `你是一位专业的教育内容分析师，擅长对各种教育内容进行深入分析。请根据用户指定的分析类型，对提供的内容进行专业分析。

要求：
1. 分析要深入、客观、有建设性
2. 提供具体的改进建议
3. 分析结果要有实用价值
4. 使用中文输出
5. 格式要求使用Markdown格式，结构清晰`;

    const userPrompt = `请对以下内容进行${analysisType}分析：

---
${content}
---

请提供详细的分析报告，包括优点、不足和改进建议。`;

    return await this.generateContent(systemPrompt, userPrompt);
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
