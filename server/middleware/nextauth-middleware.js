const { getToken } = require("next-auth/jwt");
const userService = require("../services/mongodb-user-service");

// NextAuth JWT 验证中间件
async function authenticateNextAuth(req, res, next) {
  try {
    // 使用 NextAuth 的 getToken 来验证和解析 JWT
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    console.log("NextAuth token verification:", {
      hasToken: !!token,
      tokenExp: token?.exp,
      currentTime: Math.floor(Date.now() / 1000),
      username: token?.username,
      userId: token?.sub
    });

    if (!token) {
      console.log("No NextAuth token found");
      return res.status(401).json({
        success: false,
        error: "缺少有效的认证信息",
        code: "MISSING_AUTH",
        message: "请先登录后再进行此操作",
      });
    }

    // 检查 token 是否过期
    if (token.exp && Date.now() / 1000 > token.exp) {
      console.log("NextAuth token expired");
      return res.status(401).json({
        success: false,
        error: "登录已过期，请重新登录",
        code: "TOKEN_EXPIRED",
      });
    }

    // 从数据库获取用户信息
    let user = null;
    if (token.sub) {
      try {
        user = await userService.getUserById(token.sub);
      } catch (error) {
        console.warn("Failed to get user from database:", error.message);
        
        // 如果数据库查询失败，创建一个基本用户对象
        user = {
          id: token.sub,
          username: token.username || 'unknown',
          isActive: true
        };
      }
    }

    if (!user || !user.isActive) {
      console.log("User not found or inactive:", token.sub);
      return res.status(401).json({
        success: false,
        error: "用户不存在或已被禁用",
        code: "USER_NOT_FOUND",
      });
    }

    console.log("NextAuth authentication successful for user:", user.username);
    req.user = user;
    req.token = token;
    next();
    
  } catch (error) {
    console.error("NextAuth authentication error:", error);
    
    return res.status(401).json({
      success: false,
      error: "认证失败",
      code: "AUTH_FAILED",
      message: error.message
    });
  }
}

// 兼容性认证中间件 - 支持多种认证方式
async function authenticateCompat(req, res, next) {
  // 首先尝试 NextAuth JWT 认证
  try {
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (token && token.exp && Date.now() / 1000 <= token.exp) {
      // NextAuth token 有效
      let user = null;
      if (token.sub) {
        try {
          user = await userService.getUserById(token.sub);
        } catch (error) {
          console.warn("Failed to get user from database, using token data:", error.message);
          user = {
            id: token.sub,
            username: token.username || 'unknown',
            isActive: true
          };
        }
      }

      if (user && user.isActive) {
        req.user = user;
        req.token = token;
        return next();
      }
    }
  } catch (nextAuthError) {
    console.log("NextAuth authentication failed, trying fallback:", nextAuthError.message);
  }

  // 回退到原来的认证方式（JWT + session）
  const { authenticate } = require('./auth');
  return authenticate(req, res, next);
}

module.exports = {
  authenticateNextAuth,
  authenticateCompat
};