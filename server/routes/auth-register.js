const express = require("express");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../models/user-model");
const userService = require("../services/mongodb-user-service");
const { loginLimiter } = require("../middleware/auth");

const router = express.Router();

// 注册验证规则
const registerValidation = [
  body("inviteCode")
    .notEmpty()
    .withMessage("邀请码不能为空")
    .isLength({ min: 1, max: 50 })
    .withMessage("邀请码格式不正确"),

  body("username")
    .isLength({ min: 3, max: 20 })
    .withMessage("用户名长度在3-20个字符之间")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("用户名只能包含字母、数字和下划线"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("密码至少6个字符")
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("密码必须包含字母和数字"),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("两次输入的密码不一致");
    }
    return true;
  }),

  // 教学偏好（可选）
  body("preferences.subject")
    .optional()
    .isIn([
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "history",
      "geography",
      "politics",
      "music",
      "art",
      "pe",
    ])
    .withMessage("科目选择无效"),

  body("preferences.gradeLevel")
    .optional()
    .isIn([
      "primary_1",
      "primary_2",
      "primary_3",
      "primary_4",
      "primary_5",
      "primary_6",
      "junior_1",
      "junior_2",
      "junior_3",
    ])
    .withMessage("年级选择无效"),

  body("preferences.easyMode")
    .optional()
    .isBoolean()
    .withMessage("简易模式设置无效"),
];

// POST /api/auth/register - 用户注册
router.post("/register", registerValidation, async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "输入数据验证失败",
        errors: errors.array(),
      });
    }

    const { inviteCode, username, password, preferences = {} } = req.body;

    // 简化的邀请码验证：只使用环境变量
    const envInviteCode = process.env.INVITE_CODE || "TEACHER2024";

    if (inviteCode.toUpperCase() !== envInviteCode.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: "邀请码无效",
      });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "该用户名已被注册",
      });
    }

    // 创建新用户
    const newUser = new User({
      username,
      displayName: username,
      preferences: {
        theme: "system",
        language: "zh_CN",
        notifications: true,
        subject: preferences.subject || "math",
        gradeLevel: preferences.gradeLevel || "primary_1",
        easyMode:
          preferences.easyMode !== undefined ? preferences.easyMode : true,
      },
      profile: {
        school: "",
        subject: preferences.subject || "math",
        grade: preferences.gradeLevel || "primary_1",
        bio: "",
      },
    });

    // 设置密码
    await newUser.setPassword(password);
    await newUser.save();

    // 记录邀请码使用（简化版本）
    console.log(
      `邀请码 ${inviteCode.toUpperCase()} 被用户 ${newUser.username} 使用`,
    );

    // 生成JWT
    const token = jwt.sign(
      {
        userId: newUser._id,
        username: newUser.username,
        preferences: newUser.preferences,
        inviteCode: inviteCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 更新最后登录时间
    await newUser.updateLastLogin();

    // 创建session数据
    const sessionData = {
      userId: newUser._id.toString(),
      username: newUser.username,
      userPreferences: newUser.preferences,
      inviteCode: inviteCode,
      createdAt: new Date().toISOString(),
    };

    // 设置cookie - 生产环境优化配置
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict", // 生产环境使用 lax
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7天
      path: "/",
    };

    // 生产环境域名配置
    if (process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    console.log('Setting register session cookie with options:', {
      ...cookieOptions,
      sessionData: { userId: sessionData.userId, username: sessionData.username }
    });

    res.cookie("session", JSON.stringify(sessionData), cookieOptions);

    res.json({
      success: true,
      message: "注册成功",
      data: {
        token,
        user: newUser.toSafeJSON(),
        sessionData: sessionData,
      },
    });
  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error:
        process.env.NODE_ENV === "development" ? error.message : "注册失败",
    });
  }
});

// POST /api/auth/login - 用户登录
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginField = username || email;

    if (!loginField || !password) {
      return res.status(400).json({
        success: false,
        message: "请填写用户名/邮箱和密码",
      });
    }

    // 通过用户名或邮箱查找用户并验证密码
    const user = await userService.validateLogin(loginField, password);

    // 生成JWT
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        preferences: user.preferences,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 更新最后登录时间
    await user.updateLastLogin();

    // 创建session数据
    const sessionData = {
      userId: user._id.toString(),
      username: user.username,
      userPreferences: user.preferences,
      createdAt: new Date().toISOString(),
    };

    // 设置cookie - 生产环境优化配置
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict", // 生产环境使用 lax
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7天
      path: "/",
    };

    // 生产环境域名配置
    if (process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    console.log('Setting login session cookie with options:', {
      ...cookieOptions,
      sessionData: { userId: sessionData.userId, username: sessionData.username }
    });

    res.cookie("session", JSON.stringify(sessionData), cookieOptions);

    res.json({
      success: true,
      message: "登录成功",
      data: {
        token,
        user: user.toSafeJSON(),
        sessionData: sessionData,
      },
    });
  } catch (error) {
    console.error("登录失败:", error);
    res.status(500).json({
      success: false,
      message: "登录失败",
      error:
        process.env.NODE_ENV === "development" ? error.message : "登录失败",
    });
  }
});

// POST /api/auth/verify-token - 验证JWT token
router.post("/verify-token", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "缺少认证令牌",
      });
    }

    const token = authHeader.slice(7);

    // 验证JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 获取用户信息
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      user: {
        userId: user._id,
        username: user.username,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Token验证失败:", error);
    res.status(401).json({
      success: false,
      message: "Token无效或已过期",
    });
  }
});

// POST /api/auth/verify-invite - 验证邀请码
router.post("/verify-invite", async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: "请输入邀请码",
      });
    }

    // 简化的邀请码验证：只使用环境变量
    const envInviteCode = process.env.INVITE_CODE || "TEACHER2024";

    if (inviteCode.toUpperCase() !== envInviteCode.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: "邀请码无效",
      });
    }

    res.json({
      success: true,
      message: "邀请码验证成功",
    });
  } catch (error) {
    console.error("邀请码验证失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
});

// GET /api/auth/verify - 验证当前会话状态
router.get("/verify", async (req, res) => {
  try {
    const sessionCookie = req.cookies.session;

    if (!sessionCookie) {
      return res.status(401).json({
        success: false,
        message: "未找到会话信息",
      });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "会话数据格式错误",
      });
    }

    if (!sessionData.userId) {
      return res.status(401).json({
        success: false,
        message: "会话数据无效",
      });
    }

    // 验证用户是否存在
    const user = await User.findById(sessionData.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "用户不存在",
      });
    }

    res.json({
      success: true,
      message: "会话验证成功",
      data: {
        userId: user._id,
        username: user.username,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("会话验证失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
});

// GET /api/auth/debug-session - 调试会话状态
router.get("/debug-session", async (req, res) => {
  try {
    const sessionCookie = req.cookies.session;
    
    const debugInfo = {
      hasSessionCookie: Boolean(sessionCookie),
      cookieValue: sessionCookie ? "***存在***" : null,
      allCookies: Object.keys(req.cookies),
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        cookieDomain: process.env.COOKIE_DOMAIN,
      }
    };

    if (sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie);
        debugInfo.sessionData = {
          userId: parsed.userId,
          username: parsed.username,
          createdAt: parsed.createdAt
        };
      } catch (error) {
        debugInfo.parseError = error.message;
      }
    }

    res.json({
      success: true,
      debug: debugInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
