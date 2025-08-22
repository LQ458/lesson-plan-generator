const mongoose = require("mongoose");

class Database {
  constructor() {
    this.connectionString =
      process.env.MONGODB_URI || "mongodb://localhost:27017/teachai";
    this.options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
  }

  async connect() {
    try {
      await mongoose.connect(this.connectionString, this.options);
      console.log("✅ MongoDB连接成功");

      // 连接事件监听
      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB连接错误:", err);
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB连接断开");
      });

      mongoose.connection.on("reconnected", () => {
        console.log("🔄 MongoDB重新连接成功");
      });

      return true;
    } catch (error) {
      console.error("❌ MongoDB连接失败:", error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log("✅ MongoDB连接已断开");
    } catch (error) {
      console.error("❌ MongoDB断开连接失败:", error.message);
      throw error;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async getStats() {
    if (!this.isConnected()) {
      return { connected: false };
    }

    try {
      const stats = await mongoose.connection.db.stats();
      return {
        connected: true,
        database: mongoose.connection.name,
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        objects: stats.objects,
      };
    } catch (error) {
      console.error("获取数据库统计信息失败:", error.message);
      return { connected: true, error: error.message };
    }
  }
}

module.exports = new Database();
