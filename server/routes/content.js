const express = require("express");
const router = express.Router();
const {
  LessonPlan,
  Exercise,
  Analysis,
  Favorite,
  ExportHistory,
} = require("../models/content-model");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { asyncHandler, UserFriendlyError } = require("../utils/error-handler");
const winston = require("winston");

// 配置日志
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "content-api" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level} 📚[CONTENT] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
        }),
      ),
    }),
  ],
});

// ==================== 教案相关接口 ====================

// 检查重复教案
router.post("/lesson-plans/check-duplicate", authenticate, async (req, res) => {
  try {
    const { title, subject, grade, topic } = req.body;
    const userId = req.user.id;

    // 查找相同的教案
    const existingLessonPlan = await LessonPlan.findOne({
      userId,
      title,
      subject,
      grade,
      topic,
    });

    res.json({
      success: true,
      data: {
        isDuplicate: !!existingLessonPlan,
        existingId: existingLessonPlan ? existingLessonPlan._id : null,
      },
    });
  } catch (error) {
    console.error("检查重复教案失败:", error);
    res.status(500).json({
      success: false,
      error: "检查重复教案失败",
      message: error.message,
    });
  }
});

// 保存教案
router.post(
  "/lesson-plans",
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      title,
      subject,
      grade,
      topic,
      content,
      structuredData,
      requirements,
      tags,
      aiGenerationParams,
    } = req.body;

    if (!title || !subject || !grade || !topic || !content) {
      throw new UserFriendlyError("请填写必要的教案信息", 400);
    }

    // 检查是否存在重复教案
    const existingLessonPlan = await LessonPlan.findOne({
      createdBy: req.user._id,
      title,
      subject,
      grade,
    });

    if (existingLessonPlan) {
      return res.status(409).json({
        success: false,
        error: "已保存过此教案",
        message: "已保存过相同标题、科目、年级和主题的教案",
        data: {
          existingId: existingLessonPlan._id,
          existingTitle: existingLessonPlan.title,
        },
      });
    }

    const lessonPlan = new LessonPlan({
      title,
      subject,
      grade,
      topic,
      content,
      structuredData,
      requirements,
      tags: tags || [],
      createdBy: req.user._id,
      aiGenerationParams,
    });

    await lessonPlan.save();

    logger.info("教案保存成功", {
      lessonPlanId: lessonPlan._id,
      userId: req.user._id,
      subject,
      grade,
      topic,
    });

    res.json({
      success: true,
      data: { lessonPlan },
      message: "教案保存成功",
    });
  }),
);

// 获取用户的教案列表
router.get(
  "/lesson-plans",
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      subject,
      grade,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { createdBy: req.user._id };

    // 构建查询条件
    if (subject) query.subject = subject;
    if (grade) query.grade = grade;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [lessonPlans, total] = await Promise.all([
      LessonPlan.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LessonPlan.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        lessonPlans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  }),
);

// 获取单个教案详情
router.get(
  "/lesson-plans/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const lessonPlan = await LessonPlan.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!lessonPlan) {
      throw new UserFriendlyError("教案不存在或无访问权限", 404);
    }

    // 增加查看次数
    await LessonPlan.updateOne(
      { _id: req.params.id },
      { $inc: { "stats.viewCount": 1 } },
    );

    res.json({
      success: true,
      data: { lessonPlan },
    });
  }),
);

// 更新教案
router.put(
  "/lesson-plans/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      title,
      subject,
      grade,
      topic,
      content,
      structuredData,
      requirements,
      tags,
      status,
    } = req.body;

    const lessonPlan = await LessonPlan.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      {
        title,
        subject,
        grade,
        topic,
        content,
        structuredData,
        requirements,
        tags,
        status,
      },
      { new: true, runValidators: true },
    );

    if (!lessonPlan) {
      throw new UserFriendlyError("教案不存在或无访问权限", 404);
    }

    logger.info("教案更新成功", {
      lessonPlanId: lessonPlan._id,
      userId: req.user._id,
    });

    res.json({
      success: true,
      data: { lessonPlan },
      message: "教案更新成功",
    });
  }),
);

// 删除教案
router.delete(
  "/lesson-plans/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const lessonPlan = await LessonPlan.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!lessonPlan) {
      throw new UserFriendlyError("教案不存在或无访问权限", 404);
    }

    // 同时删除相关的收藏和导出记录
    await Promise.all([
      Favorite.deleteMany({
        contentType: "lessonPlan",
        contentId: req.params.id,
      }),
      ExportHistory.deleteMany({
        contentType: "lessonPlan",
        contentId: req.params.id,
      }),
    ]);

    logger.info("教案删除成功", {
      lessonPlanId: req.params.id,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: "教案删除成功",
    });
  }),
);

// ==================== 练习题相关接口 ====================

// 保存练习题
router.post(
  "/exercises",
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      title,
      subject,
      grade,
      topic,
      difficulty,
      questionType,
      questionCount,
      content,
      questions,
      relatedLessonPlan,
      requirements,
      tags,
      aiGenerationParams,
    } = req.body;

    if (!title || !subject || !grade || !topic || !difficulty || !content) {
      throw new UserFriendlyError("请填写必要的练习题信息", 400);
    }

    const exercise = new Exercise({
      title,
      subject,
      grade,
      topic,
      difficulty,
      questionType,
      questionCount,
      content,
      questions: questions || [],
      relatedLessonPlan,
      requirements,
      tags: tags || [],
      createdBy: req.user._id,
      aiGenerationParams,
    });

    await exercise.save();

    logger.info("练习题保存成功", {
      exerciseId: exercise._id,
      userId: req.user._id,
      subject,
      grade,
      topic,
      difficulty,
    });

    res.json({
      success: true,
      data: { exercise },
      message: "练习题保存成功",
    });
  }),
);

// 获取用户的练习题列表
router.get(
  "/exercises",
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      subject,
      grade,
      difficulty,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { createdBy: req.user._id };

    // 构建查询条件
    if (subject) query.subject = subject;
    if (grade) query.grade = grade;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [exercises, total] = await Promise.all([
      Exercise.find(query)
        .populate("relatedLessonPlan", "title topic")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Exercise.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        exercises,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  }),
);

// 获取单个练习题详情
router.get(
  "/exercises/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const exercise = await Exercise.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).populate("relatedLessonPlan", "title topic");

    if (!exercise) {
      throw new UserFriendlyError("练习题不存在或无访问权限", 404);
    }

    // 增加查看次数
    await Exercise.updateOne(
      { _id: req.params.id },
      { $inc: { "stats.viewCount": 1 } },
    );

    res.json({
      success: true,
      data: { exercise },
    });
  }),
);

// 更新练习题
router.put(
  "/exercises/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      title,
      subject,
      grade,
      topic,
      difficulty,
      questionType,
      questionCount,
      content,
      questions,
      relatedLessonPlan,
      requirements,
      tags,
    } = req.body;

    const exercise = await Exercise.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      {
        title,
        subject,
        grade,
        topic,
        difficulty,
        questionType,
        questionCount,
        content,
        questions,
        relatedLessonPlan,
        requirements,
        tags,
      },
      { new: true, runValidators: true },
    );

    if (!exercise) {
      throw new UserFriendlyError("练习题不存在或无访问权限", 404);
    }

    logger.info("练习题更新成功", {
      exerciseId: exercise._id,
      userId: req.user._id,
    });

    res.json({
      success: true,
      data: { exercise },
      message: "练习题更新成功",
    });
  }),
);

// 删除练习题
router.delete(
  "/exercises/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const exercise = await Exercise.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!exercise) {
      throw new UserFriendlyError("练习题不存在或无访问权限", 404);
    }

    // 同时删除相关的收藏和导出记录
    await Promise.all([
      Favorite.deleteMany({
        contentType: "exercise",
        contentId: req.params.id,
      }),
      ExportHistory.deleteMany({
        contentType: "exercise",
        contentId: req.params.id,
      }),
    ]);

    logger.info("练习题删除成功", {
      exerciseId: req.params.id,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: "练习题删除成功",
    });
  }),
);

// ==================== 收藏相关接口 ====================

// 添加收藏
router.post(
  "/favorites",
  authenticate,
  asyncHandler(async (req, res) => {
    const { contentType, contentId, notes } = req.body;

    if (!contentType || !contentId) {
      throw new UserFriendlyError("请提供内容类型和内容ID", 400);
    }

    // 检查内容是否存在且属于当前用户
    let content;
    if (contentType === "lessonPlan") {
      content = await LessonPlan.findOne({
        _id: contentId,
        createdBy: req.user._id,
      });
    } else if (contentType === "exercise") {
      content = await Exercise.findOne({
        _id: contentId,
        createdBy: req.user._id,
      });
    }

    if (!content) {
      throw new UserFriendlyError("内容不存在或无访问权限", 404);
    }

    // 创建或更新收藏
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.user._id, contentType, contentId },
      { notes },
      { upsert: true, new: true },
    );

    res.json({
      success: true,
      data: { favorite },
      message: "收藏成功",
    });
  }),
);

// 获取用户收藏列表
router.get(
  "/favorites",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, contentType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { userId: req.user._id };

    if (contentType) query.contentType = contentType;

    const favorites = await Favorite.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "contentId",
        select: "title topic subject grade createdAt",
      });

    const total = await Favorite.countDocuments(query);

    res.json({
      success: true,
      data: {
        favorites,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  }),
);

// 取消收藏
router.delete(
  "/favorites/:contentType/:contentId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { contentType, contentId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user._id,
      contentType,
      contentId,
    });

    if (!favorite) {
      throw new UserFriendlyError("收藏记录不存在", 404);
    }

    res.json({
      success: true,
      message: "取消收藏成功",
    });
  }),
);

// ==================== 统计相关接口 ====================

// 获取用户内容统计
router.get(
  "/stats",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [lessonPlanStats, exerciseStats, favoriteStats, recentActivities] =
      await Promise.all([
        LessonPlan.aggregate([
          { $match: { createdBy: userId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalViews: { $sum: "$stats.viewCount" },
              totalExports: { $sum: "$stats.exportCount" },
              subjects: { $addToSet: "$subject" },
              grades: { $addToSet: "$grade" },
            },
          },
        ]),
        Exercise.aggregate([
          { $match: { createdBy: userId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalViews: { $sum: "$stats.viewCount" },
              totalExports: { $sum: "$stats.exportCount" },
              totalUses: { $sum: "$stats.useCount" },
              byDifficulty: {
                $push: {
                  difficulty: "$difficulty",
                  count: 1,
                },
              },
            },
          },
        ]),
        Favorite.countDocuments({ userId }),
        Promise.all([
          LessonPlan.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("title topic createdAt")
            .lean(),
          Exercise.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("title topic createdAt")
            .lean(),
        ]),
      ]);

    res.json({
      success: true,
      data: {
        lessonPlans: lessonPlanStats[0] || {
          total: 0,
          totalViews: 0,
          totalExports: 0,
          subjects: [],
          grades: [],
        },
        exercises: exerciseStats[0] || {
          total: 0,
          totalViews: 0,
          totalExports: 0,
          totalUses: 0,
          byDifficulty: [],
        },
        favorites: favoriteStats,
        recentActivities: {
          lessonPlans: recentActivities[0],
          exercises: recentActivities[1],
        },
      },
    });
  }),
);

module.exports = router;
