const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const winston = require("winston");
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
const authRegisterRouter = require("./routes/auth-register");
const VectorStore = require("./rag/services/vector-store");
const vectorStore = new VectorStore();
require("dotenv").config();

// 配置服务器日志系统
const serverLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "server", isAIResponse: false },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, isAIResponse, requestId, ...meta }) => {
            const aiFlag = isAIResponse ? "🤖[AI-REQ]" : "🌐[SERVER]";
            const reqId = requestId ? `[${requestId}]` : "";
            return `${timestamp} ${level} ${aiFlag}${reqId} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
          },
        ),
      ),
    }),
    new winston.transports.File({
      filename: "logs/server.log",
      level: "info",
      format: winston.format.json(),
    }),
  ],
});

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 初始化服务
let aiService = null;
let servicesReady = false;

async function initializeServices() {
  try {
    // 连接数据库和初始化用户服务
    await database.connect();
    await userService.initialize();

    // 初始化AI服务
    try {
      // 尝试初始化真实的AI服务
      aiService = new AIService();
      console.log("✅ AI服务初始化成功");
    } catch (error) {
      console.error("❌ AI服务初始化失败:", error.message);
      throw new UserFriendlyError(
        "AI服务初始化失败，系统无法提供服务",
        503,
        error,
      );
    }

    servicesReady = true;
    console.log("🚀 所有服务初始化完成");
  } catch (error) {
    console.error("❌ 服务初始化失败:", error.message);
    throw new UserFriendlyError("服务初始化失败，请稍后重试", 503, error);
  }
}

// 立即初始化服务
initializeServices();

// AI请求日志中间件
const aiRequestLogger = (endpoint) => (req, res, next) => {
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  req.startTime = Date.now();

  serverLogger.info(`AI请求开始`, {
    requestId,
    endpoint,
    isAIResponse: true,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.body,
    timestamp: new Date().toISOString(),
  });

  // 响应完成时记录日志
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - req.startTime;
    serverLogger.info(`AI请求完成`, {
      requestId,
      endpoint,
      isAIResponse: true,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    originalEnd.apply(this, args);
  };

  next();
};

// 中间件配置
app.use(helmet());
// CORS 配置 - 支持环境变量自定义
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      "http://localhost:3000", 
      "http://localhost:3002",
      "https://bijielearn.com",
      "https://www.bijielearn.com",
      "https://api.bijielearn.com"
    ];

console.log('🔒 CORS允许的域名:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ CORS allowed request from origin: ${origin}`);
        return callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked request from origin: ${origin}`);
        console.warn(`🔧 Allowed origins: ${allowedOrigins.join(', ')}`);
        return callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true, // 允许发送cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "X-File-Name"
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 200
  }),
);
// Explicit preflight handler for complex CORS requests
app.options('*', (req, res) => {
  console.log(`🔄 OPTIONS preflight request from: ${req.get('Origin')}`);
  res.header('Access-Control-Allow-Origin', req.get('Origin'));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser()); // 添加cookie解析中间件

// 注册路由
app.use("/api/auth", authRegisterRouter);
app.use("/api/content", require("./routes/content"));
app.use("/api/export", require("./routes/export"));
app.use("/api/admin", require("./routes/admin"));

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
      "POST /api/auth/invite-login",
      "POST /api/auth/verify-invite",
      "POST /api/lesson-plan",
      "POST /api/exercises",
      "POST /api/analyze",
    ],
  });
});

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

// AI功能路由 - 流式输出
app.post(
  "/api/lesson-plan",
  aiRequestLogger("lesson-plan"), // 添加AI请求日志
  authenticate, // 启用认证
  apiLimiter, // 启用限流
  asyncHandler(async (req, res) => {
    const { subject, grade, topic, requirements } = req.body;

    if (!subject || !grade || !topic) {
      res.status(400).write("错误: 请填写学科、年级和主题");
      res.end();
      return;
    }

    if (!aiService || !aiService.enabled) {
      res.status(503).write("错误: AI服务未启用");
      res.end();
      return;
    }

    // 直接使用AI流式生成，不再有备用模式
    await aiService.generateLessonPlanStream(
      subject,
      grade,
      topic,
      requirements,
      res,
    );
  }),
);

app.post(
  "/api/exercises",
  aiRequestLogger("exercises"), // 添加AI请求日志
  authenticate, // 启用认证
  apiLimiter, // 启用限流
  asyncHandler(async (req, res) => {
    const {
      subject,
      grade,
      topic,
      difficulty,
      count,
      questionType,
      requirements,
    } = req.body;

    if (!subject || !grade || !topic || !difficulty || !count) {
      res.status(400).write("错误: 请填写完整的练习题参数");
      res.end();
      return;
    }

    if (!aiService || !aiService.enabled) {
      res.status(503).write("错误: AI服务未启用");
      res.end();
      return;
    }

    // 直接使用AI流式生成，不再有备用模式
    await aiService.generateExercisesStream(
      subject,
      grade,
      topic,
      difficulty,
      count,
      questionType,
      requirements,
      res,
    );
  }),
);

app.post(
  "/api/analyze",
  aiRequestLogger("analyze"), // 添加AI请求日志
  authenticate, // 启用认证
  apiLimiter, // 启用限流
  asyncHandler(async (req, res) => {
    const { content, analysisType } = req.body;

    if (!content || !analysisType) {
      throw new UserFriendlyError("请提供要分析的内容和分析类型", 400);
    }

    if (!aiService || !aiService.enabled) {
      throw new UserFriendlyError("AI服务未启用，无法进行内容分析", 503);
    }

    const result = await aiService.analyzeContent(content, analysisType);

    res.json({
      success: true,
      data: { result },
      message: "内容分析完成",
    });
  }),
);

// 邀请码验证和登录路由
app.post(
  "/api/auth/invite-login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { inviteCode, userPreferences } = req.body;

    console.log("🔍 邀请码登录请求:", { inviteCode, userPreferences });

    if (!inviteCode) {
      throw new UserFriendlyError("请输入邀请码", 400);
    }

    // 简化的邀请码验证：只使用环境变量
    const envInviteCode = process.env.INVITE_CODE || "TEACHER2024";

    console.log("🔎 验证邀请码:", inviteCode.toUpperCase());

    if (inviteCode.toUpperCase() !== envInviteCode.toUpperCase()) {
      console.log("❌ 邀请码验证失败");
      throw new UserFriendlyError("邀请码无效", 401);
    }

    console.log("✅ 邀请码验证成功，准备生成会话");

    // 生成用户ID和会话token
    const userId = `user_${inviteCode.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建会话数据
    const sessionData = {
      userId,
      inviteCode: inviteCode.toUpperCase(),
      createdAt: new Date(),
      userPreferences: userPreferences || {
        subject: "语文",
        gradeLevel: "小学三年级",
        easyMode: true,
      },
    };

    // 这里可以选择将会话信息存储到数据库中
    // 目前先直接返回token，让前端处理会话存储

    res.json({
      success: true,
      data: {
        sessionData,
        message: "邀请码验证成功",
      },
      message: "登录成功",
    });
  }),
);

// 邀请码验证路由（只验证不登录）
app.post(
  "/api/auth/verify-invite",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { inviteCode } = req.body;

    console.log("🔍 邀请码验证请求:", { inviteCode });

    if (!inviteCode) {
      throw new UserFriendlyError("请输入邀请码", 400);
    }

    // 简化的邀请码验证：只使用环境变量
    const envInviteCode = process.env.INVITE_CODE || "TEACHER2024";

    console.log("🔎 验证邀请码:", inviteCode.toUpperCase());

    if (inviteCode.toUpperCase() !== envInviteCode.toUpperCase()) {
      console.log("❌ 邀请码验证失败");
      throw new UserFriendlyError("邀请码无效", 401);
    }

    console.log("✅ 邀请码验证成功");
    res.json({
      success: true,
      data: {
        valid: true,
        inviteCode: envInviteCode.toUpperCase(),
      },
      message: "邀请码有效",
    });
  }),
);

// RAG功能路由
app.post(
  "/api/rag/load-documents",
  asyncHandler(async (req, res) => {
    try {
      const result = await vectorStore.loadDocuments();
      res.json({
        success: true,
        data: result,
        message: "文档加载完成",
      });
    } catch (error) {
      serverLogger.error("文档加载失败:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "文档加载失败",
      });
    }
  }),
);

app.post(
  "/api/rag/search",
  asyncHandler(async (req, res) => {
    const { query, subject, grade, limit = 5, minQualityScore = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "查询内容不能为空",
        message: "请提供搜索查询",
      });
    }

    try {
      const results = await vectorStore.search(query, {
        subject,
        grade,
        limit: parseInt(limit),
        minQualityScore: parseFloat(minQualityScore),
      });

      res.json({
        success: true,
        data: {
          results,
          query,
          filters: { subject, grade, minQualityScore },
        },
        message: "搜索完成",
      });
    } catch (error) {
      serverLogger.error("搜索失败:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "搜索失败",
      });
    }
  }),
);

app.get(
  "/api/rag/stats",
  asyncHandler(async (req, res) => {
    try {
      const stats = await vectorStore.getCollectionStats();
      res.json({
        success: true,
        data: stats,
        message: "统计信息获取成功",
      });
    } catch (error) {
      serverLogger.error("获取统计信息失败:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "获取统计信息失败",
      });
    }
  }),
);

app.get(
  "/api/rag/health",
  asyncHandler(async (req, res) => {
    try {
      const health = await vectorStore.healthCheck();
      res.json({
        success: true,
        data: health,
        message: "健康检查成功",
      });
    } catch (error) {
      serverLogger.error("健康检查失败:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "健康检查失败",
      });
    }
  }),
);

// Zeabur-specific health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
    cors_origins: process.env.ALLOWED_ORIGINS?.split(',') || 'using defaults',
    port: process.env.PORT || 3001
  });
});

// Root endpoint for Zeabur
app.get("/", (req, res) => {
  res.status(200).json({
    message: "TeachAI API Server",
    status: "running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    cors_configured: !!process.env.ALLOWED_ORIGINS
  });
});

// 404处理
app.use("*", notFoundHandler);

// 全局错误处理中间件（必须放在最后）
app.use(errorHandler);

// 导出app用于测试
module.exports = app;

// 只有在直接运行时才启动服务器
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 服务器启动成功，端口: ${PORT}`);
    console.log(`🌐 环境: ${process.env.NODE_ENV}`);
    console.log(`🔒 CORS Origins: ${process.env.ALLOWED_ORIGINS || 'using defaults'}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`📈 服务状态: http://localhost:${PORT}/api/status`);
    console.log(`🌍 外部访问: https://api.bijielearn.com`);
  });
}

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
