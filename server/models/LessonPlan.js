const mongoose = require("mongoose");

const lessonPlanSchema = new mongoose.Schema({
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
  duration: {
    type: Number,
    default: 45,
    min: 1,
    max: 180,
  },
  structuredData: {
    detailedObjectives: [
      {
        type: String,
        trim: true,
      },
    ],
    keyPoints: [
      {
        type: String,
        trim: true,
      },
    ],
    difficulties: [
      {
        type: String,
        trim: true,
      },
    ],
    teachingMethods: [
      {
        type: String,
        trim: true,
      },
    ],
    teachingProcess: [
      {
        stage: {
          type: String,
          required: true,
        },
        duration: {
          type: Number,
          min: 1,
        },
        content: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    ],
    materials: [
      {
        type: String,
        trim: true,
      },
    ],
    homework: [
      {
        type: String,
        trim: true,
      },
    ],
    referenceSources: [
      {
        type: String,
        trim: true,
      },
    ],
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
  },
  metadata: {
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    estimatedTime: {
      type: Number,
      default: 45,
    },
    language: {
      type: String,
      default: "zh-CN",
    },
    version: {
      type: String,
      default: "1.0.0",
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
lessonPlanSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// 创建索引
lessonPlanSchema.index({ userId: 1 });
lessonPlanSchema.index({ subject: 1 });
lessonPlanSchema.index({ grade: 1 });
lessonPlanSchema.index({ createdAt: -1 });
lessonPlanSchema.index({ tags: 1 });
lessonPlanSchema.index({ isPublic: 1 });

module.exports =
  mongoose.models.LessonPlan || mongoose.model("LessonPlan", lessonPlanSchema);
