const OpenAI = require("openai");
const winston = require("winston");

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

    // 初始化OpenAI客户端（使用阿里云通义千问API）
    this.client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL:
        process.env.DASHSCOPE_BASE_URL ||
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    });

    this.model = process.env.QWEN_MODEL || "qwen-turbo";
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    this.enabled = process.env.AI_ENABLED === "true";

    logger.info("AI服务初始化完成", {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      enabled: this.enabled,
    });
  }

  /**
   * 调用AI模型生成内容
   * @param {string} systemPrompt 系统提示词
   * @param {string} userPrompt 用户提示词
   * @returns {Promise<string>} 生成的内容
   */
  async generateContent(systemPrompt, userPrompt) {
    if (!this.enabled) {
      throw new Error("AI服务未启用");
    }

    try {
      logger.info("开始AI内容生成", {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      });

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("AI模型返回内容为空");
      }

      logger.info("AI内容生成成功", {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
        contentLength: content.length,
      });

      return content;
    } catch (error) {
      logger.error("AI内容生成失败", {
        error: error.message,
        model: this.model,
      });
      throw new Error(`AI内容生成失败: ${error.message}`);
    }
  }

  /**
   * 生成教案
   */
  async generateLessonPlan(subject, grade, topic, requirements) {
    const systemPrompt = `你是一位专业的教师，擅长制作详细的教案。请根据用户的要求生成一份完整、实用的教案。

要求：
1. 教案应包含教学目标、教学重点、教学难点、教学过程等完整结构
2. 内容要具体、实用，符合该年级学生的认知水平
3. 语言要清晰、准确，便于教师使用
4. 教学过程要详细，包含具体的教学活动和时间安排
5. 使用中文输出
6. 格式要求使用Markdown格式，结构清晰`;

    const userPrompt = `请为我生成一份教案：
- 科目：${subject}
- 年级：${grade}
- 主题：${topic}
${requirements ? `- 特殊要求：${requirements}` : ""}

请生成一份详细、完整的教案。`;

    return await this.generateContent(systemPrompt, userPrompt);
  }

  /**
   * 生成练习题
   */
  async generateExercises(subject, grade, topic, difficulty, count) {
    const difficultyMap = {
      easy: "简单",
      medium: "中等",
      hard: "困难",
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
- 题目数量：${count}道

请生成指定数量的练习题，每道题都要包含题目、选项（如适用）、答案和解析。`;

    return await this.generateContent(systemPrompt, userPrompt);
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
      apiConfigured: !!process.env.DASHSCOPE_API_KEY,
    };
  }
}

module.exports = AIService;
