const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  grade: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  content: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  questionType: {
    type: String,
    enum: ["选择题", "填空题", "简答题", "计算题", "解答题", "综合题"],
    default: "选择题",
  },
  questionCount: {
    type: Number,
    default: 5,
    min: 1,
    max: 50,
  },
  structuredData: {
    questions: [
      {
        type: {
          type: String,
          enum: ["选择题", "填空题", "简答题", "计算题", "解答题", "综合题"],
          required: true,
        },
        question: {
          type: String,
          required: true,
        },
        options: [
          {
            type: String,
            trim: true,
          },
        ],
        correctAnswer: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          trim: true,
        },
        points: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    totalPoints: {
      type: Number,
      default: 0,
    },
    estimatedTime: {
      type: Number,
      default: 30,
    },
    instructions: {
      type: String,
      trim: true,
    },
  },
  tags: [
    {
      type: String,
      trim: true,
      maxlength: 30,
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stats: {
    viewCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    exportCount: {
      type: Number,
      default: 0,
    },
    useCount: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
  },
  metadata: {
    language: {
      type: String,
      default: "zh-CN",
    },
    version: {
      type: String,
      default: "1.0.0",
    },
    source: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 更新 updatedAt 字段
exerciseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// 创建索引
exerciseSchema.index({ userId: 1 });
exerciseSchema.index({ subject: 1 });
exerciseSchema.index({ grade: 1 });
exerciseSchema.index({ difficulty: 1 });
exerciseSchema.index({ questionType: 1 });
exerciseSchema.index({ createdAt: -1 });
exerciseSchema.index({ tags: 1 });
exerciseSchema.index({ isPublic: 1 });

module.exports =
  mongoose.models.Exercise || mongoose.model("Exercise", exerciseSchema);
