const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, UserFriendlyError } = require("../utils/error-handler");
const aiService = require("../services/ai-service");
const logger = require("../utils/logger");

const router = express.Router();

// POST /api/lesson-plan - 生成教案
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { subject, grade, topic, requirements } = req.body;

    // 验证必需参数
    if (!subject || !grade || !topic) {
      throw new UserFriendlyError("请提供学科、年级和主题信息", 400);
    }

    logger.info("🎯 [LESSON-PLAN] 开始生成教案", {
      userId: req.user?.id,
      username: req.user?.username,
      subject,
      grade,
      topic,
      requirementsLength: requirements?.length || 0,
    });

    try {
      // 构建教案生成提示
      const prompt = `请为以下内容生成一份详细的教案：

学科：${subject}
年级：${grade}
主题：${topic}
${requirements ? `特殊要求：${requirements}` : ''}

请按以下格式生成教案：

## 教学目标
- 知识目标：
- 能力目标：
- 情感目标：

## 教学重点
[教学重点内容]

## 教学难点
[教学难点内容]

## 教学准备
[所需教具、材料等]

## 教学过程

### 导入环节（5分钟）
[具体教学活动]

### 新课讲解（25分钟）
[详细的教学内容和步骤]

### 练习巩固（10分钟）
[练习活动设计]

### 课堂小结（3分钟）
[总结要点]

### 布置作业（2分钟）
[作业内容]

## 板书设计
[板书布局和内容]

## 教学反思
[教学效果评估和改进建议]`;

      // 调用AI服务生成教案
      const lessonPlan = await aiService.generateContent({
        prompt,
        subject,
        grade,
        topic,
        type: 'lesson-plan'
      });

      logger.info("✅ [LESSON-PLAN] 教案生成成功", {
        userId: req.user?.id,
        contentLength: lessonPlan?.length || 0,
      });

      res.json({
        success: true,
        data: {
          content: lessonPlan,
          metadata: {
            subject,
            grade,
            topic,
            requirements,
            generatedAt: new Date().toISOString(),
          }
        }
      });

    } catch (error) {
      logger.error("❌ [LESSON-PLAN] 教案生成失败", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('AI服务')) {
        throw new UserFriendlyError("AI服务暂时不可用，请稍后重试", 503, error);
      }

      throw new UserFriendlyError("教案生成失败，请重试", 500, error);
    }
  })
);

module.exports = router;