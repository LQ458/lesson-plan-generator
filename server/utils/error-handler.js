/**
 * 用户友好的错误处理工具
 * 将技术性错误转换为用户可理解的消息
 */

class UserFriendlyError extends Error {
  constructor(message, statusCode = 400, originalError = null) {
    super(message);
    this.name = "UserFriendlyError";
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.isUserFriendly = true;
  }
}

/**
 * 将技术性错误转换为用户友好的错误消息
 */
function translateError(error) {
  // MongoDB 重复键错误
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    switch (field) {
      case "username":
        return new UserFriendlyError(
          "该用户名已被使用，请选择其他用户名",
          400,
          error,
        );
      case "email":
        return new UserFriendlyError(
          "该邮箱已被注册，请使用其他邮箱或直接登录",
          400,
          error,
        );
      default:
        return new UserFriendlyError(
          "该信息已存在，请检查输入内容",
          400,
          error,
        );
    }
  }

  // MongoDB 验证错误
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => {
      switch (err.kind) {
        case "required":
          return `${getFieldDisplayName(err.path)}不能为空`;
        case "minlength":
          return `${getFieldDisplayName(err.path)}长度不能少于${
            err.properties.minlength
          }个字符`;
        case "maxlength":
          return `${getFieldDisplayName(err.path)}长度不能超过${
            err.properties.maxlength
          }个字符`;
        case "unique":
          return `${getFieldDisplayName(err.path)}已存在`;
        default:
          return `${getFieldDisplayName(err.path)}格式不正确`;
      }
    });
    return new UserFriendlyError(messages.join("，"), 400, error);
  }

  // JWT 相关错误
  if (error.name === "JsonWebTokenError") {
    return new UserFriendlyError("登录状态已失效，请重新登录", 401, error);
  }

  if (error.name === "TokenExpiredError") {
    return new UserFriendlyError("登录已过期，请重新登录", 401, error);
  }

  // 网络连接错误
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return new UserFriendlyError(
      "网络连接失败，请检查网络设置后重试",
      503,
      error,
    );
  }

  // 数据库连接错误
  if (error.name === "MongoNetworkError" || error.name === "MongoServerError") {
    return new UserFriendlyError("服务暂时不可用，请稍后重试", 503, error);
  }

  // 文件相关错误
  if (error.code === "ENOENT") {
    return new UserFriendlyError("请求的资源不存在", 404, error);
  }

  if (error.code === "EACCES") {
    return new UserFriendlyError("权限不足，无法访问该资源", 403, error);
  }

  // 自定义业务错误
  if (error.message.includes("用户不存在")) {
    return new UserFriendlyError("用户名或密码错误", 401, error);
  }

  if (error.message.includes("密码错误")) {
    return new UserFriendlyError("用户名或密码错误", 401, error);
  }

  if (error.message.includes("用户名已存在")) {
    return new UserFriendlyError(
      "该用户名已被使用，请选择其他用户名",
      400,
      error,
    );
  }

  if (error.message.includes("邮箱已存在")) {
    return new UserFriendlyError(
      "该邮箱已被注册，请使用其他邮箱或直接登录",
      400,
      error,
    );
  }

  // 如果已经是用户友好的错误，直接返回
  if (error.isUserFriendly) {
    return error;
  }

  // 默认错误消息
  return new UserFriendlyError("操作失败，请稍后重试", 500, error);
}

/**
 * 获取字段的显示名称
 */
function getFieldDisplayName(fieldName) {
  const fieldMap = {
    username: "用户名",
    email: "邮箱",
    password: "密码",
    displayName: "显示名称",
    subject: "学科",
    grade: "年级",
    topic: "主题",
    content: "内容",
    title: "标题",
  };
  return fieldMap[fieldName] || fieldName;
}

/**
 * Express 错误处理中间件
 */
function errorHandler(error, req, res, next) {
  // 记录原始错误（用于调试）
  console.error("🔥 服务器错误:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // 转换为用户友好的错误
  const userError = translateError(error);

  // 返回用户友好的错误响应
  res.status(userError.statusCode).json({
    success: false,
    error: userError.message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 异步路由错误捕获包装器
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 错误处理
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: "请求的页面或接口不存在",
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  UserFriendlyError,
  translateError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
