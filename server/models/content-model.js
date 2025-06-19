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
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["single_choice", "multiple_choice", "fill_blank", "essay"],
          required: true,
        },
        options: [String], // 选择题选项
        answer: String, // 正确答案
        explanation: String, // 答案解析
      },
    ],
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
      enum: ["grammar", "difficulty", "keywords", "summary", "structure"],
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

exerciseSchema.index({ createdBy: 1, createdAt: -1 });
exerciseSchema.index({ subject: 1, grade: 1, difficulty: 1 });
exerciseSchema.index({ tags: 1 });
exerciseSchema.index({ isPublic: 1 });

analysisSchema.index({ createdBy: 1, createdAt: -1 });
analysisSchema.index({ analysisType: 1 });

module.exports = {
  LessonPlan: mongoose.model("LessonPlan", lessonPlanSchema),
  Exercise: mongoose.model("Exercise", exerciseSchema),
  Analysis: mongoose.model("Analysis", analysisSchema),
};
