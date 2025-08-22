const mongoose = require("mongoose");

// 教案模型
const lessonPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    // 新增：教案的结构化数据
    structuredData: {
      detailedObjectives: [String],
      keyPoints: [String],
      difficulties: [String],
      teachingMethods: [String],
      teachingProcess: [
        {
          stage: String,
          duration: Number,
          content: [String],
        },
      ],
      homework: [String],
      materials: [String],
      reflection: String,
      duration: Number, // 课时长度（分钟）
      referenceSources: [String],
    },
    requirements: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    // 新增：统计信息
    stats: {
      viewCount: { type: Number, default: 0 },
      exportCount: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
    },
    // 新增：AI生成参数记录
    aiGenerationParams: {
      model: String,
      prompt: String,
      temperature: Number,
      maxTokens: Number,
      generationTime: Date,
    },
  },
  {
    timestamps: true,
  },
);

// 练习题模型
const exerciseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["简单", "中等", "困难", "easy", "medium", "hard"],
      required: true,
    },
    // 新增：练习题类型
    questionType: {
      type: String,
      enum: ["选择题", "填空题", "简答题", "计算题", "综合题", "mixed"],
      default: "mixed",
    },
    // 新增：练习题数量
    questionCount: {
      type: Number,
      default: 5,
    },
    // 原始内容（AI生成的markdown）
    content: {
      type: String,
      required: true,
    },
    // 结构化的题目数据
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: [
            "single_choice",
            "multiple_choice",
            "fill_blank",
            "essay",
            "calculation",
          ],
          required: true,
        },
        options: [String], // 选择题选项
        answer: String, // 正确答案
        explanation: String, // 答案解析
        points: { type: Number, default: 1 }, // 分值
        tags: [String], // 题目标签
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 新增：关联的教案
    relatedLessonPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LessonPlan",
      default: null,
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: false,
    },
    // 新增：统计信息
    stats: {
      viewCount: { type: Number, default: 0 },
      exportCount: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
      useCount: { type: Number, default: 0 }, // 使用次数
    },
    // 新增：AI生成参数记录
    aiGenerationParams: {
      model: String,
      prompt: String,
      temperature: Number,
      maxTokens: Number,
      generationTime: Date,
      requirements: String,
    },
  },
  {
    timestamps: true,
  },
);

// 分析内容模型
const analysisSchema = new mongoose.Schema(
  {
    originalContent: {
      type: String,
      required: true,
    },
    analysisType: {
      type: String,
      required: true,
      enum: [
        "grammar",
        "difficulty",
        "keywords",
        "summary",
        "structure",
        "概念提取",
        "语法检查",
        "难度分析",
        "关键词提取",
        "结构分析",
      ],
    },
    result: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 新增：分析的元数据
    metadata: {
      inputLength: Number,
      outputLength: Number,
      processingTime: Number,
      confidence: Number, // 分析置信度
    },
  },
  {
    timestamps: true,
  },
);

// 新增：用户收藏模型
const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contentType: {
      type: String,
      enum: ["lessonPlan", "exercise", "analysis"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    notes: String, // 用户备注
  },
  {
    timestamps: true,
  },
);

// 新增：导出历史模型
const exportHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contentType: {
      type: String,
      enum: ["lessonPlan", "exercise", "analysis"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    exportFormat: {
      type: String,
      enum: ["pdf", "word", "markdown", "html", "txt", "mindmap", "timeline"],
      required: true,
    },
    exportOptions: {
      includeAnswers: { type: Boolean, default: true },
      includeExplanations: { type: Boolean, default: true },
      theme: { type: String, default: "default" },
      fontSize: { type: Number, default: 12 },
    },
    fileSize: Number, // 文件大小（字节）
    downloadCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  },
);

// 索引优化
lessonPlanSchema.index({ createdBy: 1, createdAt: -1 });
lessonPlanSchema.index({ subject: 1, grade: 1 });
lessonPlanSchema.index({ tags: 1 });
lessonPlanSchema.index({ isPublic: 1, status: 1 });
lessonPlanSchema.index({ "stats.viewCount": -1 });
lessonPlanSchema.index({ title: "text", topic: "text", content: "text" });
lessonPlanSchema.index(
  { createdBy: 1, title: 1, subject: 1, grade: 1 },
  { unique: true },
);

exerciseSchema.index({ createdBy: 1, createdAt: -1 });
exerciseSchema.index({ subject: 1, grade: 1, difficulty: 1 });
exerciseSchema.index({ tags: 1 });
exerciseSchema.index({ isPublic: 1 });
exerciseSchema.index({ relatedLessonPlan: 1 });
exerciseSchema.index({ "stats.viewCount": -1 });
exerciseSchema.index({ title: "text", topic: "text", content: "text" });

analysisSchema.index({ createdBy: 1, createdAt: -1 });
analysisSchema.index({ analysisType: 1 });

favoriteSchema.index({ userId: 1, createdAt: -1 });
favoriteSchema.index(
  { userId: 1, contentType: 1, contentId: 1 },
  { unique: true },
);

exportHistorySchema.index({ userId: 1, createdAt: -1 });
exportHistorySchema.index({ contentType: 1, contentId: 1 });

module.exports = {
  LessonPlan: mongoose.model("LessonPlan", lessonPlanSchema),
  Exercise: mongoose.model("Exercise", exerciseSchema),
  Analysis: mongoose.model("Analysis", analysisSchema),
  Favorite: mongoose.model("Favorite", favoriteSchema),
  ExportHistory: mongoose.model("ExportHistory", exportHistorySchema),
};
