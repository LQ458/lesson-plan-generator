const User = require("../models/user-model");

class MongoUserService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      // 创建默认管理员用户
      await this.createDefaultAdmin();
      this.initialized = true;
      console.log("✅ 用户服务初始化成功");
      return true;
    } catch (error) {
      console.error("❌ 用户服务初始化失败:", error.message);
      throw error;
    }
  }

  async createDefaultAdmin() {
    try {
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin) {
        return existingAdmin;
      }

      const adminUser = new User({
        username: "admin",
        email: "admin@teachai.local",
        displayName: "系统管理员",
        role: "admin",
      });

      await adminUser.setPassword("admin123");
      await adminUser.save();

      console.log("✅ 默认管理员用户创建成功");
      return adminUser;
    } catch (error) {
      console.error("❌ 创建默认管理员失败:", error.message);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      throw new Error(`获取用户失败: ${error.message}`);
    }
  }

  async getUserByUsername(username) {
    try {
      return await User.findOne({ username });
    } catch (error) {
      throw new Error(`获取用户失败: ${error.message}`);
    }
  }

  async getUserByEmail(email) {
    try {
      return await User.findOne({ email });
    } catch (error) {
      throw new Error(`获取用户失败: ${error.message}`);
    }
  }

  async createUser(userData) {
    try {
      // 验证数据
      const errors = User.validateUserData(userData);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      // 检查用户名是否已存在
      const existingUsername = await this.getUserByUsername(userData.username);
      if (existingUsername) {
        throw new Error("用户名已存在");
      }

      // 如果提供了邮箱，检查是否已存在
      if (userData.email) {
        const existingEmail = await this.getUserByEmail(userData.email);
        if (existingEmail) {
          throw new Error("邮箱已存在");
        }
      }

      // 设置默认值
      const userDataWithDefaults = {
        ...userData,
        displayName: userData.displayName || userData.username, // 如果没有提供显示名称，使用用户名
      };

      // 创建用户
      const user = new User(userDataWithDefaults);
      await user.setPassword(userData.password);
      await user.save();

      console.log(`✅ 用户创建成功: ${user.username}`);
      return user;
    } catch (error) {
      throw new Error(`创建用户失败: ${error.message}`);
    }
  }

  async updateUser(id, updateData) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error("用户不存在");
      }

      // 如果更新邮箱，检查是否已存在
      if (updateData.email && updateData.email !== user.email) {
        const existingByEmail = await this.getUserByEmail(updateData.email);
        if (existingByEmail) {
          throw new Error("邮箱已存在");
        }
      }

      // 更新用户信息
      Object.assign(user, updateData);

      // 如果更新密码
      if (updateData.password) {
        await user.setPassword(updateData.password);
      }

      await user.save();
      return user;
    } catch (error) {
      throw new Error(`更新用户失败: ${error.message}`);
    }
  }

  async deleteUser(id) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error("用户不存在");
      }

      if (user.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount === 1) {
          throw new Error("不能删除最后一个管理员用户");
        }
      }

      await User.findByIdAndDelete(id);
      return true;
    } catch (error) {
      throw new Error(`删除用户失败: ${error.message}`);
    }
  }

  async validateLogin(username, password) {
    try {
      const user = await User.findOne({
        $or: [{ username }, { email: username }],
        isActive: true,
      });

      if (!user) {
        throw new Error("用户不存在或未激活");
      }

      const isValid = await user.validatePassword(password);
      if (!isValid) {
        throw new Error("密码错误");
      }

      await user.updateLastLogin();
      return user;
    } catch (error) {
      throw new Error(`登录验证失败: ${error.message}`);
    }
  }

  async getAllUsers(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const users = await User.find()
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments();

      return {
        users,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`获取用户列表失败: ${error.message}`);
    }
  }

  async searchUsers(query, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, "i");

      const users = await User.find({
        $or: [
          { username: searchRegex },
          { email: searchRegex },
          { displayName: searchRegex },
        ],
      })
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments({
        $or: [
          { username: searchRegex },
          { email: searchRegex },
          { displayName: searchRegex },
        ],
      });

      return {
        users,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`搜索用户失败: ${error.message}`);
    }
  }

  async getUserStats() {
    try {
      const [total, active, byRole] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      ]);

      return {
        total,
        active,
        inactive: total - active,
        byRole: byRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      throw new Error(`获取用户统计失败: ${error.message}`);
    }
  }
}

module.exports = new MongoUserService();
