const express = require("express");
const userService = require("../services/mongodb-user-service");
const { UserFriendlyError, asyncHandler } = require("../utils/error-handler");

const router = express.Router();

// 注册新用户
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, password, email, preferences } = req.body;

    console.log(`📝 用户注册请求: ${username}`);

    // 基本验证
    if (!username || !password) {
      throw new UserFriendlyError("用户名和密码为必填项", 400);
    }

    if (username.trim().length < 3) {
      throw new UserFriendlyError("用户名至少需要3个字符", 400);
    }

    if (password.length < 6) {
      throw new UserFriendlyError("密码至少需要6个字符", 400);
    }

    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      throw new UserFriendlyError("密码必须包含字母和数字", 400);
    }

    try {
      // 构建用户数据
      const userData = {
        username: username.trim(),
        password,
        email: email?.trim() || null,
        displayName: username.trim(),
        role: "teacher",
        isActive: true,
        preferences: {
          theme: preferences?.theme || "system",
          language: preferences?.language || "zh_CN",
          notifications: preferences?.notifications !== false,
          subject: preferences?.subject || "math",
          gradeLevel: preferences?.gradeLevel || "primary_1",
          easyMode: preferences?.easyMode !== false,
        },
      };

      // 创建用户
      const newUser = await userService.createUser(userData);

      console.log(`✅ 用户注册成功: ${newUser.username} (ID: ${newUser.id})`);

      // 返回成功响应（不包含密码等敏感信息）
      res.status(201).json({
        success: true,
        message: "注册成功",
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            displayName: newUser.displayName,
            email: newUser.email,
            role: newUser.role,
            preferences: newUser.preferences,
            createdAt: newUser.createdAt,
          },
        },
      });
    } catch (error) {
      console.error(`❌ 用户注册失败: ${username}`, error.message);

      // 检查特定错误类型
      if (error.message.includes("用户名已存在")) {
        throw new UserFriendlyError("用户名已存在，请选择其他用户名", 409);
      } else if (error.message.includes("邮箱已存在")) {
        throw new UserFriendlyError("邮箱已存在，请使用其他邮箱", 409);
      } else {
        throw new UserFriendlyError("注册失败: " + error.message, 500);
      }
    }
  })
);

// 测试用户创建 - 仅用于开发测试
router.post(
  "/create-test-user", 
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      throw new UserFriendlyError("测试接口在生产环境不可用", 403);
    }

    const testUser = await userService.createUser({
      username: "test",
      password: "test123",
      displayName: "测试用户",
      email: "test@example.com",
      role: "teacher",
      isActive: true,
    });

    res.json({
      success: true,
      message: "测试用户创建成功",
      data: {
        user: testUser.toSafeJSON(),
      },
    });
  })
);

module.exports = router;