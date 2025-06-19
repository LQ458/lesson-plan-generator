const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const database = require("./config/database");
const userService = require("./services/mongodb-user-service");
const AIService = require("./ai-service");
const {
  authenticate,
  requireRole,
  apiLimiter,
  loginLimiter,
  generateToken,
  refreshToken,
} = require("./middleware/auth");
const {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  UserFriendlyError,
} = require("./utils/error-handler");
require("dotenv").config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 初始化服务
let aiService = null;
let servicesReady = false;

async function initializeServices() {
  try {
    // 连接数据库
    await database.connect();

    // 初始化用户服务
    await userService.initialize();

    // 初始化AI服务
    aiService = new AIService();

    servicesReady = true;
    console.log("🚀 所有服务初始化完成");
  } catch (error) {
    console.error("❌ 服务初始化失败:", error.message);
    throw new UserFriendlyError("服务初始化失败，请稍后重试", 503, error);
  }
}

// 立即初始化服务
initializeServices();

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// 健康检查端点
app.get("/api/health", async (req, res) => {
  const dbStats = await database.getStats();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStats,
    services: servicesReady,
  });
});

// 服务器状态端点
app.get("/api/status", async (req, res) => {
  const aiStatus = aiService ? aiService.getStatus() : { enabled: false };
  const dbStats = await database.getStats();
  const userStats = servicesReady ? await userService.getUserStats() : {};

  res.json({
    server: "TeachAI Web Server",
    status: "running",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStats,
    ai: aiStatus,
    users: userStats,
    endpoints: [
      "GET /api/health",
      "GET /api/status",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "GET /api/auth/profile",
      "POST /api/lesson-plan",
      "POST /api/exercises",
      "POST /api/analyze",
    ],
  });
});

// 用户认证路由
app.post(
  "/api/auth/register",
  loginLimiter,
  asyncHandler(async (req, res) => {
    if (!servicesReady) {
      throw new UserFriendlyError("服务正在启动中，请稍后重试", 503);
    }

    const { username, email, password, displayName, profile } = req.body;

    // 只检查必需字段：用户名和密码
    if (!username || !password) {
      throw new UserFriendlyError("请填写用户名和密码", 400);
    }

    // 构建用户数据，只包含提供的字段
    const userData = {
      username,
      password,
    };

    // 添加可选字段（如果提供）
    if (email) userData.email = email;
    if (displayName) userData.displayName = displayName;
    if (profile) userData.profile = profile;

    const user = await userService.createUser(userData);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: user.toSafeJSON(),
        token,
      },
      message: "注册成功",
    });
  }),
);

app.post(
  "/api/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    if (!servicesReady) {
      throw new UserFriendlyError("服务正在启动中，请稍后重试", 503);
    }

    const { username, password } = req.body;

    if (!username || !password) {
      throw new UserFriendlyError("请填写用户名和密码", 400);
    }

    const user = await userService.validateLogin(username, password);
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: user.toSafeJSON(),
        token,
      },
      message: "登录成功",
    });
  }),
);

app.post(
  "/api/auth/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new UserFriendlyError("缺少刷新令牌", 400);
    }

    const newToken = refreshToken(token);

    res.json({
      success: true,
      data: { token: newToken },
      message: "令牌刷新成功",
    });
  }),
);

app.get(
  "/api/auth/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.user.id);

    if (!user) {
      throw new UserFriendlyError("用户信息不存在", 404);
    }

    res.json({
      success: true,
      data: { user: user.toSafeJSON() },
    });
  }),
);

// AI功能路由
app.post(
  "/api/lesson-plan",
  authenticate,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const { subject, grade, topic, requirements } = req.body;

    if (!subject || !grade || !topic) {
      throw new UserFriendlyError("请填写学科、年级和主题", 400);
    }

    let content;
    if (aiService && aiService.isEnabled()) {
      content = await aiService.generateLessonPlan({
        subject,
        grade,
        topic,
        requirements,
      });
    } else {
      content = generateMockLessonPlan(subject, grade, topic, requirements);
    }

    res.json({
      success: true,
      data: { content },
      message: "教案生成成功",
    });
  }),
);

app.post(
  "/api/exercises",
  authenticate,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const { subject, grade, topic, difficulty, count } = req.body;

    if (!subject || !grade || !topic || !difficulty || !count) {
      throw new UserFriendlyError("请填写完整的练习题参数", 400);
    }

    let content;
    if (aiService && aiService.isEnabled()) {
      content = await aiService.generateExercises({
        subject,
        grade,
        topic,
        difficulty,
        count,
      });
    } else {
      content = generateMockExercises(subject, grade, topic, difficulty, count);
    }

    res.json({
      success: true,
      data: { content },
      message: "练习题生成成功",
    });
  }),
);

app.post(
  "/api/analyze",
  authenticate,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const { content, analysisType } = req.body;

    if (!content || !analysisType) {
      throw new UserFriendlyError("请提供要分析的内容和分析类型", 400);
    }

    let result;
    if (aiService && aiService.isEnabled()) {
      result = await aiService.analyzeContent({ content, analysisType });
    } else {
      result = generateMockAnalysis(content, analysisType);
    }

    res.json({
      success: true,
      data: { result },
      message: "内容分析完成",
    });
  }),
);

// 模拟数据生成函数
function generateMockLessonPlan(subject, grade, topic, requirements) {
  return `# ${grade} ${subject} 教案：${topic}

## 教学目标
- 理解${topic}的基本概念
- 掌握${topic}的核心知识点
- 能够运用${topic}解决实际问题

## 教学重点
${topic}的核心概念和应用方法

## 教学难点
${topic}的深层理解和灵活运用

## 教学过程

### 1. 导入新课（5分钟）
通过生活实例引入${topic}的概念

### 2. 新课讲授（25分钟）
详细讲解${topic}的相关知识点

### 3. 课堂练习（10分钟）
完成相关练习题，巩固所学知识

### 4. 课堂小结（5分钟）
总结本节课的主要内容

## 作业布置
完成课后练习题1-5题

## 教学反思
本节课通过实例教学，学生对${topic}有了初步认识。

${requirements ? `\n## 特殊要求\n${requirements}` : ""}`;
}

function generateMockExercises(subject, grade, topic, difficulty, count) {
  const exercises = [];
  const difficultyMap = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };

  for (let i = 1; i <= count; i++) {
    exercises.push(`**第${i}题**（${difficultyMap[difficulty]}）
关于${topic}的问题：请简述${topic}的主要特点。

**答案要点：**
- 特点一：...
- 特点二：...
- 特点三：...`);
  }

  return `# ${grade} ${subject} 练习题：${topic}

**难度等级：** ${difficultyMap[difficulty]}
**题目数量：** ${count}题

${exercises.join("\n\n")}

---
*注：以上为模拟生成的练习题，实际使用时请根据具体教学内容调整。*`;
}

function generateMockAnalysis(content, analysisType) {
  const analysisMap = {
    grammar: "语法分析",
    difficulty: "难度分析",
    keywords: "关键词提取",
    summary: "内容摘要",
    structure: "结构分析",
  };

  return `## ${analysisMap[analysisType]}结果

**原始内容长度：** ${content.length}字符

**分析结果：**
根据${analysisMap[analysisType]}的要求，对提供的内容进行了详细分析。

**主要发现：**
- 内容结构清晰
- 表达方式恰当
- 符合预期标准

**建议：**
- 可适当增加实例说明
- 建议优化部分表述
- 整体质量良好

---
*注：这是模拟分析结果，实际使用时会提供更详细的AI分析。*`;
}

// 404处理
app.use("*", notFoundHandler);

// 全局错误处理中间件（必须放在最后）
app.use(errorHandler);

// 启动服务器
app.listen(PORT, async () => {
  try {
    await initializeServices();
  } catch (error) {
    console.error("❌ 服务器启动失败:", error.message);
    process.exit(1);
  }
});

// 优雅关闭
process.on("SIGTERM", async () => {
  console.log("🔄 正在关闭服务器...");
  await database.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔄 正在关闭服务器...");
  await database.disconnect();
  process.exit(0);
});
