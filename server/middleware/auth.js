const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const userService = require("../services/mongodb-user-service");

// 简化日志输出

// JWT配置
const JWT_SECRET =
  process.env.JWT_SECRET || "teachai_secret_key_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 生成JWT令牌
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "teachai-server",
    audience: "teachai-client",
  });
}

// 验证JWT令牌
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: "teachai-server",
      audience: "teachai-client",
    });
  } catch (error) {
    throw new Error("Token验证失败: " + error.message);
  }
}

// 认证中间件 - 支持JWT token和session cookie
async function authenticate(req, res, next) {
  try {
    let user = null;
    let authMethod = null;

    // 方法1：尝试从Authorization header获取JWT token
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      if (token) {
        try {
          // 验证JWT令牌
          const decoded = verifyToken(token);

          // 获取用户信息
          user = await userService.getUserById(decoded.id);
          if (user && user.isActive) {
            authMethod = "JWT";
            req.user = user;
            return next();
          }
        } catch (error) {
          console.warn("JWT认证失败，尝试session认证:", error.message);
        }
      }
    }

    // 方法2：尝试从session cookie获取用户信息
    const sessionCookie = req.cookies?.session;
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie);

        if (sessionData.userId) {
          // 从数据库获取完整的用户信息而不是创建临时对象
          user = await userService.getUserById(sessionData.userId);
          
          if (user && user.isActive) {
            authMethod = "SESSION";
            req.user = user;
            return next();
          } else {
            console.warn("Session中的用户ID无效或用户未激活:", sessionData.userId);
          }
        }
      } catch (error) {
        console.warn("Session解析失败:", error.message);
      }
    }

    // 两种认证方式都失败
    return res.status(401).json({
      success: false,
      error: "缺少有效的认证信息",
      code: "MISSING_AUTH",
      message: "请先登录后再进行此操作",
    });
  } catch (error) {
    console.error("认证失败:", error.message);

    let errorCode = "AUTH_FAILED";
    let errorMessage = "认证失败";

    if (error.name === "TokenExpiredError") {
      errorCode = "TOKEN_EXPIRED";
      errorMessage = "登录已过期，请重新登录";
    } else if (error.name === "JsonWebTokenError") {
      errorCode = "INVALID_TOKEN";
      errorMessage = "无效的认证信息";
    }

    return res.status(401).json({
      success: false,
      error: errorMessage,
      code: errorCode,
    });
  }
}

// 角色验证中间件
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "未认证",
        code: "NOT_AUTHENTICATED",
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      console.warn(
        `权限不足: 用户${req.user.username}(${userRole}) 尝试访问需要${allowedRoles}权限的资源`,
      );

      return res.status(403).json({
        success: false,
        error: "权限不足",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
}

// 登录限流中间件
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: {
    success: false,
    error: "登录尝试过于频繁，请15分钟后再试",
    code: "TOO_MANY_ATTEMPTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ":" + (req.body.username || req.body.email || "unknown");
  },
  handler: (req, res) => {
    console.warn(
      `登录限流触发: IP ${req.ip}, 用户 ${req.body.username || req.body.email}`,
    );

    res.status(429).json({
      success: false,
      error: "登录尝试过于频繁，请15分钟后再试",
      code: "TOO_MANY_ATTEMPTS",
    });
  },
});

// API限流中间件
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 100, // 最多100次请求
  message: {
    success: false,
    error: "请求过于频繁，请稍后再试",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
});

// 可选认证中间件（用于需要用户信息但不强制登录的接口）
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      if (token) {
        const decoded = verifyToken(token);
        const user = await userService.getUserById(decoded.id);

        if (user && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // 可选认证失败时不阻止请求继续
    logger.debug("可选认证失败", { error: error.message });
    next();
  }
}

// 刷新令牌
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "缺少刷新令牌",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    // 这里可以实现刷新令牌的逻辑
    // 简单实现：重新验证当前令牌并生成新令牌
    const decoded = verifyToken(refreshToken);
    const user = await userService.getUserById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "无效的刷新令牌",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      data: {
        token: newToken,
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    logger.error("刷新令牌失败", error);
    res.status(401).json({
      success: false,
      error: "刷新令牌失败",
      code: "REFRESH_FAILED",
    });
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  requireRole,
  optionalAuth,
  loginLimiter,
  apiLimiter,
  refreshToken,
};
