#!/usr/bin/env node

/**
 * RAG系统完整测试脚本
 */

const VectorStoreTest = require("../tests/vector-store.test");
const { initializeVectorDB } = require("./initialize-vector-db");
const logger = require("../../utils/logger");

class RAGSystemTest {
  constructor() {
    this.testResults = {
      initialization: null,
      vectorStore: null,
      integration: null,
      overall: null,
    };
  }

  async runFullTest() {
    console.log("🚀 开始RAG系统完整测试...\n");

    try {
      // 1. 初始化测试
      console.log("=".repeat(60));
      console.log("📋 阶段1: 初始化测试");
      console.log("=".repeat(60));

      const initResult = await this.testInitialization();
      this.testResults.initialization = initResult;

      // 2. 向量存储测试
      console.log("=".repeat(60));
      console.log("📋 阶段2: 向量存储服务测试");
      console.log("=".repeat(60));

      const vectorStoreTest = new VectorStoreTest();
      const vectorResults = await vectorStoreTest.runAllTests();
      this.testResults.vectorStore = vectorResults;

      // 3. 集成测试
      console.log("=".repeat(60));
      console.log("📋 阶段3: 集成测试");
      console.log("=".repeat(60));

      const integrationResult = await this.testIntegration();
      this.testResults.integration = integrationResult;

      // 4. 生成总结报告
      this.generateReport();

      return this.testResults;
    } catch (error) {
      console.error("❌ RAG系统测试失败:", error);
      logger.error("RAG系统测试失败:", error);
      throw error;
    }
  }

  async testInitialization() {
    try {
      console.log("🔧 测试向量数据库初始化...");
      const result = await initializeVectorDB();

      console.log("✅ 初始化测试通过");
      return {
        status: "PASS",
        result,
        message: "向量数据库初始化成功",
      };
    } catch (error) {
      console.log("❌ 初始化测试失败:", error.message);
      return {
        status: "FAIL",
        error: error.message,
        message: "向量数据库初始化失败",
      };
    }
  }

  async testIntegration() {
    const results = [];

    try {
      // 测试API端点
      const apiTests = [
        {
          name: "API健康检查",
          test: this.testAPIHealth,
        },
        {
          name: "API搜索功能",
          test: this.testAPISearch,
        },
        {
          name: "API统计信息",
          test: this.testAPIStats,
        },
      ];

      for (const apiTest of apiTests) {
        try {
          console.log(`🔍 测试: ${apiTest.name}`);
          const result = await apiTest.test.call(this);
          results.push({
            name: apiTest.name,
            status: "PASS",
            result,
          });
          console.log(`✅ ${apiTest.name} - 通过`);
        } catch (error) {
          results.push({
            name: apiTest.name,
            status: "FAIL",
            error: error.message,
          });
          console.log(`❌ ${apiTest.name} - 失败: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.log("❌ 集成测试失败:", error.message);
      return [
        {
          name: "集成测试",
          status: "FAIL",
          error: error.message,
        },
      ];
    }
  }

  async testAPIHealth() {
    // 模拟API健康检查测试
    const vectorStore = require("../services/vector-store");
    const health = await vectorStore.healthCheck();

    if (health.status !== "healthy") {
      throw new Error(`API健康检查失败: ${health.error}`);
    }

    return health;
  }

  async testAPISearch() {
    // 模拟API搜索测试
    const vectorStore = require("../services/vector-store");
    const results = await vectorStore.search("数学教学", { limit: 3 });

    if (results.length === 0) {
      throw new Error("API搜索没有返回结果");
    }

    return {
      query: "数学教学",
      resultCount: results.length,
      maxSimilarity: results[0]?.similarity || 0,
    };
  }

  async testAPIStats() {
    // 模拟API统计信息测试
    const vectorStore = require("../services/vector-store");
    const stats = await vectorStore.getCollectionStats();

    if (stats.totalDocuments === 0) {
      throw new Error("API统计信息显示没有文档");
    }

    return {
      totalDocuments: stats.totalDocuments,
      subjects: Object.keys(stats.subjectDistribution || {}),
      averageQuality: stats.averageQualityScore,
    };
  }

  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 RAG系统测试报告");
    console.log("=".repeat(60));

    // 初始化测试结果
    if (this.testResults.initialization) {
      console.log("\n🔧 初始化测试:");
      console.log(`   状态: ${this.testResults.initialization.status}`);
      console.log(`   消息: ${this.testResults.initialization.message}`);

      if (this.testResults.initialization.result) {
        const result = this.testResults.initialization.result;
        console.log(`   加载文档: ${result.loadResult?.loadedChunks || 0} 块`);
        console.log(`   总文档数: ${result.stats?.totalDocuments || 0}`);
        console.log(
          `   测试搜索: ${result.testResults?.resultCount || 0} 个结果`,
        );
      }
    }

    // 向量存储测试结果
    if (this.testResults.vectorStore) {
      console.log("\n🗄️  向量存储测试:");
      const passed = this.testResults.vectorStore.filter(
        (r) => r.status === "PASS",
      ).length;
      const total = this.testResults.vectorStore.length;
      console.log(`   通过: ${passed}/${total}`);
      console.log(`   成功率: ${((passed / total) * 100).toFixed(1)}%`);

      const failed = this.testResults.vectorStore.filter(
        (r) => r.status === "FAIL",
      );
      if (failed.length > 0) {
        console.log("   失败的测试:");
        failed.forEach((test) => {
          console.log(`     - ${test.name}: ${test.error}`);
        });
      }
    }

    // 集成测试结果
    if (this.testResults.integration) {
      console.log("\n🔗 集成测试:");
      const passed = this.testResults.integration.filter(
        (r) => r.status === "PASS",
      ).length;
      const total = this.testResults.integration.length;
      console.log(`   通过: ${passed}/${total}`);
      console.log(`   成功率: ${((passed / total) * 100).toFixed(1)}%`);

      const failed = this.testResults.integration.filter(
        (r) => r.status === "FAIL",
      );
      if (failed.length > 0) {
        console.log("   失败的测试:");
        failed.forEach((test) => {
          console.log(`     - ${test.name}: ${test.error}`);
        });
      }
    }

    // 总体评估
    const allTests = [
      ...(this.testResults.initialization
        ? [this.testResults.initialization]
        : []),
      ...(this.testResults.vectorStore || []),
      ...(this.testResults.integration || []),
    ];

    const totalPassed = allTests.filter((t) => t.status === "PASS").length;
    const totalTests = allTests.length;
    const overallSuccess = totalPassed / totalTests;

    console.log("\n🎯 总体评估:");
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过: ${totalPassed}`);
    console.log(`   总体成功率: ${(overallSuccess * 100).toFixed(1)}%`);

    if (overallSuccess >= 0.9) {
      console.log("   评级: 🟢 优秀 - RAG系统运行良好");
    } else if (overallSuccess >= 0.7) {
      console.log("   评级: 🟡 良好 - RAG系统基本正常，建议优化");
    } else {
      console.log("   评级: 🔴 需要改进 - RAG系统存在问题");
    }

    console.log("\n💡 建议:");
    if (overallSuccess >= 0.9) {
      console.log("   - RAG系统已准备好用于生产环境");
      console.log("   - 可以开始集成到教案生成流程中");
    } else {
      console.log("   - 检查失败的测试项目");
      console.log("   - 确保Chroma服务正常运行");
      console.log("   - 验证文档格式和嵌入向量");
    }

    console.log("\n" + "=".repeat(60));
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const ragTest = new RAGSystemTest();

  ragTest
    .runFullTest()
    .then((results) => {
      console.log("\n✅ RAG系统测试完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ RAG系统测试失败:", error.message);
      process.exit(1);
    });
}

module.exports = RAGSystemTest;
