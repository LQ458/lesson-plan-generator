const { getToken } = require("next-auth/jwt");
const { jwtDecrypt } = require("jose");
const userService = require("../services/mongodb-user-service");

// NextAuth JWT 验证中间件
async function authenticateNextAuth(req, res, next) {
  console.log("=== NextAuth Authentication Debug ===");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Request URL:", req.url);
  console.log("Request Method:", req.method);
  console.log("Request Headers (filtered):", {
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    'user-agent': req.headers['user-agent']?.substring(0, 50),
    'content-type': req.headers['content-type'],
    'cookie': req.headers.cookie ? 'Present (length: ' + req.headers.cookie.length + ')' : 'Not present'
  });
  
  console.log("Has NEXTAUTH_SECRET:", !!process.env.NEXTAUTH_SECRET);
  console.log("Has AUTH_SECRET:", !!process.env.AUTH_SECRET);
  console.log("Secret length:", (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '').length);
  
  // Check all cookies with more detail
  console.log("All cookies:", Object.keys(req.cookies || {}));
  console.log("Raw cookie header:", req.headers.cookie ? req.headers.cookie.substring(0, 200) + '...' : 'No cookie header');
  console.log("NextAuth cookies:", Object.keys(req.cookies || {}).filter(k => k.includes('next-auth')));
  
  // Check specific cookie values (first 50 chars for security)
  const sessionToken = req.cookies?.['next-auth.session-token'];
  const secureSessionToken = req.cookies?.['__Secure-next-auth.session-token'];
  const hostSessionToken = req.cookies?.['__Host-next-auth.session-token'];
  const csrfToken = req.cookies?.['next-auth.csrf-token'];
  const callbackUrl = req.cookies?.['next-auth.callback-url'];
  
  console.log("Regular session token:", sessionToken ? sessionToken.substring(0, 50) + '... (length: ' + sessionToken.length + ')' : 'Not found');
  console.log("Secure session token:", secureSessionToken ? secureSessionToken.substring(0, 50) + '... (length: ' + secureSessionToken.length + ')' : 'Not found');
  console.log("Host session token:", hostSessionToken ? hostSessionToken.substring(0, 50) + '... (length: ' + hostSessionToken.length + ')' : 'Not found');
  console.log("CSRF token:", csrfToken ? 'Present (length: ' + csrfToken.length + ')' : 'Not found');
  console.log("Callback URL:", callbackUrl || 'Not found');

  try {
    // Try multiple methods to get the token
    console.log("=== Attempting NextAuth Token Extraction ===");
    
    // Determine correct cookie name based on environment
    const cookieName = process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";
    
    console.log("Using cookie name:", cookieName);
    console.log("Environment-based token extraction...");

    // Method 1: Try with environment-appropriate cookie name
    console.log("Method 1: Environment-specific getToken...");
    let token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
      cookieName: cookieName
    });
    
    console.log("Environment-specific getToken result:", {
      success: !!token,
      cookieUsed: cookieName,
      tokenData: token ? {
        exp: token.exp,
        iat: token.iat,
        jti: token.jti,
        sub: token.sub,
        username: token.username,
        email: token.email
      } : null
    });

    // Method 2: Fallback to standard getToken
    if (!token) {
      console.log("Method 2: Fallback to standard getToken...");
      
      token = await getToken({
        req: req,
        secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === "production",
      });
      console.log("Standard getToken result:", !!token);
    }

    // Method 3: Try opposite environment cookie name as fallback
    if (!token) {
      const fallbackCookieName = process.env.NODE_ENV === "production" 
        ? "next-auth.session-token" 
        : "__Secure-next-auth.session-token";
      
      console.log("Method 3: Trying fallback cookie name:", fallbackCookieName);
      
      token = await getToken({
        req: req,
        secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === "production",
        cookieName: fallbackCookieName
      });
      console.log("Fallback cookie attempt result:", !!token);
    }

    // Method 4: Manual cookie parsing for debugging
    if (!token) {
      console.log("Method 4: Manual cookie analysis...");
      const allCookieNames = Object.keys(req.cookies || {});
      const nextAuthCookies = allCookieNames.filter(name => name.includes('next-auth'));
      
      for (const cookieName of nextAuthCookies) {
        console.log(`Attempting manual token extraction from cookie: ${cookieName}`);
        try {
          const cookieToken = await getToken({
            req: req,
            secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
            secureCookie: process.env.NODE_ENV === "production",
            cookieName: cookieName
          });
          if (cookieToken) {
            console.log(`Successfully extracted token from cookie: ${cookieName}`);
            token = cookieToken;
            break;
          }
        } catch (cookieError) {
          console.log(`Failed to extract from ${cookieName}:`, cookieError.message);
        }
      }
    }

    console.log("Final NextAuth token verification result:", {
      hasToken: !!token,
      tokenExp: token?.exp,
      currentTime: Math.floor(Date.now() / 1000),
      tokenValid: token?.exp ? (token.exp > Math.floor(Date.now() / 1000)) : false,
      username: token?.username,
      userId: token?.sub,
      tokenKeys: token ? Object.keys(token) : []
    });

    if (!token) {
      console.log("❌ AUTHENTICATION FAILED: No NextAuth token found after all attempts");
      return res.status(401).json({
        success: false,
        error: "缺少有效的认证信息",
        code: "MISSING_AUTH",
        message: "请先登录后再进行此操作",
        debug: {
          cookiesFound: Object.keys(req.cookies || {}),
          nextAuthCookies: Object.keys(req.cookies || {}).filter(k => k.includes('next-auth')),
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 检查 token 是否过期
    if (token.exp && Date.now() / 1000 > token.exp) {
      console.log("❌ AUTHENTICATION FAILED: NextAuth token expired");
      console.log("Token expiry:", new Date(token.exp * 1000).toISOString());
      console.log("Current time:", new Date().toISOString());
      return res.status(401).json({
        success: false,
        error: "登录已过期，请重新登录",
        code: "TOKEN_EXPIRED",
        debug: {
          tokenExpiry: new Date(token.exp * 1000).toISOString(),
          currentTime: new Date().toISOString()
        }
      });
    }

    // 从数据库获取用户信息
    console.log("=== User Database Lookup ===");
    console.log("Token user ID (sub):", token.sub);
    console.log("Token username:", token.username);
    console.log("Token email:", token.email);
    
    let user = null;
    if (token.sub) {
      try {
        console.log("Attempting to fetch user from database...");
        user = await userService.getUserById(token.sub);
        console.log("Database lookup result:", {
          userFound: !!user,
          userId: user?.id,
          username: user?.username,
          isActive: user?.isActive,
          role: user?.role
        });
      } catch (error) {
        console.warn("❌ Database lookup failed:", error.message);
        console.warn("Creating fallback user object from token data...");
        
        // 如果数据库查询失败，创建一个基本用户对象
        user = {
          id: token.sub,
          username: token.username || 'unknown',
          isActive: true
        };
        console.log("Fallback user object created:", user);
      }
    } else {
      console.log("❌ No user ID (sub) found in token");
    }

    if (!user || !user.isActive) {
      console.log("❌ AUTHENTICATION FAILED: User validation failed");
      console.log("User object:", user);
      console.log("User active status:", user?.isActive);
      return res.status(401).json({
        success: false,
        error: "用户不存在或已被禁用",
        code: "USER_NOT_FOUND",
        debug: {
          tokenUserId: token.sub,
          userFound: !!user,
          userActive: user?.isActive,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log("✅ AUTHENTICATION SUCCESSFUL");
    console.log("Authenticated user:", {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive
    });
    console.log("Request will proceed to next middleware/handler");
    
    req.user = user;
    req.token = token;
    next();
    
  } catch (error) {
    console.error("❌ CRITICAL ERROR: NextAuth authentication failed with exception");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Log additional context for debugging
    console.error("Error context:", {
      url: req.url,
      method: req.method,
      hasSecrets: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
      environment: process.env.NODE_ENV,
      cookieCount: Object.keys(req.cookies || {}).length,
      timestamp: new Date().toISOString()
    });
    
    return res.status(401).json({
      success: false,
      error: "认证失败",
      code: "AUTH_FAILED",
      message: error.message,
      debug: {
        errorName: error.name,
        errorMessage: error.message,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// 兼容性认证中间件 - 支持多种认证方式
async function authenticateCompat(req, res, next) {
  console.log("=== COMPAT AUTHENTICATION START ===");
  console.log("Request:", req.method, req.url);
  console.log("Environment:", process.env.NODE_ENV);
  
  // 首先尝试 NextAuth JWT 认证
  try {
    console.log("Attempting NextAuth authentication...");
    
    // Use environment-appropriate cookie name
    const cookieName = process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";
    
    console.log("Using cookie name for compat auth:", cookieName);
    
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
      cookieName: cookieName
    });

    console.log("NextAuth token result:", {
      hasToken: !!token,
      tokenValid: token && token.exp && Date.now() / 1000 <= token.exp,
      tokenExp: token?.exp,
      currentTime: Math.floor(Date.now() / 1000),
      userId: token?.sub,
      username: token?.username
    });

    if (token && token.exp && Date.now() / 1000 <= token.exp) {
      console.log("NextAuth token is valid, fetching user...");
      
      // NextAuth token 有效
      let user = null;
      if (token.sub) {
        try {
          console.log("Fetching user from database...");
          user = await userService.getUserById(token.sub);
          console.log("User fetch result:", {
            userFound: !!user,
            userId: user?.id,
            username: user?.username,
            isActive: user?.isActive
          });
        } catch (error) {
          console.warn("❌ Database fetch failed, using token data:", error.message);
          user = {
            id: token.sub,
            username: token.username || 'unknown',
            isActive: true
          };
          console.log("Created fallback user:", user);
        }
      }

      if (user && user.isActive) {
        console.log("✅ NEXTAUTH AUTHENTICATION SUCCESS for user:", user.username);
        req.user = user;
        req.token = token;
        return next();
      } else {
        console.log("❌ NextAuth authentication failed: invalid user");
      }
    } else {
      console.log("❌ NextAuth authentication failed: no valid token");
    }
  } catch (nextAuthError) {
    console.error("❌ NextAuth authentication exception:", nextAuthError.message);
    console.error("NextAuth error stack:", nextAuthError.stack);
  }

  // 回退到原来的认证方式（JWT + session）
  console.log("Falling back to legacy authentication...");
  const { authenticate } = require('./auth');
  return authenticate(req, res, next);
}

module.exports = {
  authenticateNextAuth,
  authenticateCompat
};