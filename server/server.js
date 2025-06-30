const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
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
require("dotenv").config();

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
      console.warn("⚠️ AI服务初始化失败，将使用模拟数据:", error.message);
      aiService = { enabled: false };
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

// 中间件配置
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3002"], // 允许前端域名
    credentials: true, // 允许发送cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// 注册路由
app.use("/api/auth", authRegisterRouter);

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
  // authenticate,  // 暂时注释掉认证
  // apiLimiter,    // 暂时注释掉限流
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
  // authenticate,  // 暂时注释掉认证
  // apiLimiter,    // 暂时注释掉限流
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
  authenticate,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const { content, analysisType } = req.body;

    if (!content || !analysisType) {
      throw new UserFriendlyError("请提供要分析的内容和分析类型", 400);
    }

    let result;
    if (aiService && aiService.enabled) {
      try {
        result = await aiService.analyzeContent(content, analysisType);
      } catch (error) {
        console.warn("⚠️ AI服务调用失败，回退到智能模拟模式:", error.message);
        result = generateMockAnalysis(content, analysisType);
      }
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

// 404处理
app.use("*", notFoundHandler);

// 全局错误处理中间件（必须放在最后）
app.use(errorHandler);

// 启动服务器
app.listen(PORT, async () => {
  console.log(`🚀 服务器启动成功，端口: ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📈 服务状态: http://localhost:${PORT}/api/status`);
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
