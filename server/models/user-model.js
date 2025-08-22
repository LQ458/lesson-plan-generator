const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: false,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    role: {
      type: String,
      enum: ["admin", "teacher", "student"],
      default: "teacher",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["system", "light", "dark"],
        default: "system",
      },
      language: {
        type: String,
        default: "zh_CN",
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      // 教学偏好
      subject: {
        type: String,
        enum: [
          "chinese",
          "math",
          "english",
          "physics",
          "chemistry",
          "biology",
          "history",
          "geography",
          "politics",
          "music",
          "art",
          "pe",
        ],
        default: "math",
      },
      gradeLevel: {
        type: String,
        enum: [
          "primary_1",
          "primary_2",
          "primary_3",
          "primary_4",
          "primary_5",
          "primary_6",
          "junior_1",
          "junior_2",
          "junior_3",
        ],
        default: "primary_1",
      },
      easyMode: {
        type: Boolean,
        default: true,
      },
    },
    profile: {
      school: String,
      subject: String,
      grade: String,
      bio: String,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  },
);

// 验证密码
userSchema.methods.validatePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// 设置密码
userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

// 更新最后登录时间
userSchema.methods.updateLastLogin = function () {
  this.lastLoginAt = new Date();
  return this.save();
};

// 转换为安全的JSON对象
userSchema.methods.toSafeJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

// 静态验证方法 - 简化版本
userSchema.statics.validateUserData = function (data) {
  const errors = [];

  if (!data.username || data.username.length < 3) {
    errors.push("用户名至少3个字符");
  }

  if (!data.password || data.password.length < 6) {
    errors.push("密码至少6个字符");
  }

  // 如果提供了邮箱，验证格式
  if (data.email && !this.validateEmail(data.email)) {
    errors.push("邮箱格式不正确");
  }

  // 如果提供了显示名称，验证长度
  if (data.displayName && data.displayName.length < 2) {
    errors.push("显示名称至少2个字符");
  }

  return errors;
};

// 验证邮箱格式
userSchema.statics.validateEmail = function (email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

module.exports = mongoose.model("User", userSchema);
