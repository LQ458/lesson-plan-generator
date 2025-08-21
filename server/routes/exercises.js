const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, UserFriendlyError } = require("../utils/error-handler");
const aiService = require("../services/ai-service");
const logger = require("../utils/logger");

const router = express.Router();

// POST /api/exercises - 生成练习题
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { subject, grade, topic, exerciseType, difficulty, questionCount } = req.body;

    // 验证必需参数
    if (!subject || !grade || !topic) {
      throw new UserFriendlyError("请提供学科、年级和主题信息", 400);
    }

    logger.info("📝 [EXERCISES] 开始生成练习题", {
      userId: req.user?.id,
      username: req.user?.username,
      subject,
      grade,
      topic,
      exerciseType,
      difficulty,
      questionCount: questionCount || 5,
    });

    try {
      // 构建练习题生成提示
      const count = questionCount || 5;
      const type = exerciseType || '选择题';
      const level = difficulty || '中等';

      const prompt = `请为以下内容生成${count}道${type}：

学科：${subject}
年级：${grade}
主题：${topic}
难度：${level}

要求：
1. 题目符合该年级学生的认知水平
2. 覆盖主要知识点
3. 难度适中，有一定区分度
4. 提供标准答案和详细解析

请按以下格式输出：

## 练习题

### 第1题
[题目内容]
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]

**答案：** [正确答案]
**解析：** [详细解析]

[继续其他题目...]`;

      // 调用AI服务生成练习题
      const exercises = await aiService.generateContent({
        prompt,
        subject,
        grade,
        topic,
        type: 'exercises'
      });

      logger.info("✅ [EXERCISES] 练习题生成成功", {
        userId: req.user?.id,
        contentLength: exercises?.length || 0,
      });

      res.json({
        success: true,
        data: {
          content: exercises,
          metadata: {
            subject,
            grade,
            topic,
            exerciseType: type,
            difficulty: level,
            questionCount: count,
            generatedAt: new Date().toISOString(),
          }
        }
      });

    } catch (error) {
      logger.error("❌ [EXERCISES] 练习题生成失败", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('AI服务')) {
        throw new UserFriendlyError("AI服务暂时不可用，请稍后重试", 503, error);
      }

      throw new UserFriendlyError("练习题生成失败，请重试", 500, error);
    }
  })
);

module.exports = router;