/**
 * 向量存储服务测试
 */

const vectorStore = require("../services/vector-store");
const logger = require("../../utils/logger");

class VectorStoreTest {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log("🧪 开始RAG向量存储服务测试...\n");

    const tests = [
      { name: "服务初始化测试", fn: this.testInitialization },
      { name: "健康检查测试", fn: this.testHealthCheck },
      { name: "文档加载测试", fn: this.testDocumentLoading },
      { name: "集合统计测试", fn: this.testCollectionStats },
      { name: "基础搜索测试", fn: this.testBasicSearch },
      { name: "过滤搜索测试", fn: this.testFilteredSearch },
      { name: "上下文检索测试", fn: this.testContextRetrieval },
      { name: "性能测试", fn: this.testPerformance },
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn.bind(this));
    }

    this.printSummary();
    return this.testResults;
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🔍 运行测试: ${testName}`);
      const startTime = Date.now();

      const result = await testFn();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: testName,
        status: "PASS",
        duration,
        result,
      });

      console.log(`✅ ${testName} - 通过 (${duration}ms)`);
      if (result && typeof result === "object") {
        console.log(`   结果: ${JSON.stringify(result, null, 2)}`);
      }
      console.log("");
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: "FAIL",
        error: error.message,
        stack: error.stack,
      });

      console.log(`❌ ${testName} - 失败`);
      console.log(`   错误: ${error.message}`);
      console.log("");
    }
  }

  async testInitialization() {
    await vectorStore.initialize();

    if (!vectorStore.isInitialized) {
      throw new Error("服务初始化失败");
    }

    return { initialized: true, collection: vectorStore.collectionName };
  }

  async testHealthCheck() {
    const health = await vectorStore.healthCheck();

    if (health.status !== "healthy") {
      throw new Error(`健康检查失败: ${health.error}`);
    }

    return health;
  }

  async testDocumentLoading() {
    const result = await vectorStore.loadDocuments();

    if (result.loadedChunks === 0) {
      throw new Error("没有加载任何文档块");
    }

    return {
      totalFiles: result.totalFiles,
      totalChunks: result.totalChunks,
      loadedChunks: result.loadedChunks,
      successRate: result.successRate,
    };
  }

  async testCollectionStats() {
    const stats = await vectorStore.getCollectionStats();

    if (stats.totalDocuments === 0) {
      throw new Error("集合中没有文档");
    }

    return {
      totalDocuments: stats.totalDocuments,
      subjects: Object.keys(stats.subjectDistribution || {}),
      grades: Object.keys(stats.gradeDistribution || {}),
      averageQualityScore: stats.averageQualityScore,
    };
  }

  async testBasicSearch() {
    const query = "数学教学目标";
    const results = await vectorStore.search(query, { limit: 5 });

    if (results.length === 0) {
      throw new Error("搜索没有返回结果");
    }

    // 验证结果格式
    const firstResult = results[0];
    if (
      !firstResult.content ||
      !firstResult.similarity ||
      !firstResult.relevanceScore
    ) {
      throw new Error("搜索结果格式不正确");
    }

    return {
      query,
      resultCount: results.length,
      maxSimilarity: Math.max(...results.map((r) => r.similarity)),
      maxRelevance: Math.max(...results.map((r) => r.relevanceScore)),
    };
  }

  async testFilteredSearch() {
    const query = "教学方法";
    const results = await vectorStore.search(query, {
      limit: 3,
      subject: "数学",
      grade: "一年级",
      minQualityScore: 1,
    });

    // 验证过滤效果
    results.forEach((result) => {
      if (result.metadata.subject && result.metadata.subject !== "数学") {
        throw new Error("学科过滤失败");
      }
      if (result.metadata.grade && result.metadata.grade !== "一年级") {
        throw new Error("年级过滤失败");
      }
      if (result.metadata.qualityScore < 1) {
        throw new Error("质量分数过滤失败");
      }
    });

    return {
      query,
      filters: { subject: "数学", grade: "一年级", minQualityScore: 1 },
      resultCount: results.length,
      allMatchFilters: true,
    };
  }

  async testContextRetrieval() {
    const query = "小学数学加法教学";
    const context = await vectorStore.getRelevantContext(
      query,
      "数学",
      "一年级",
      1000,
    );

    if (!context.context || context.context.length === 0) {
      throw new Error("上下文检索失败");
    }

    if (context.sources.length === 0) {
      throw new Error("没有找到相关来源");
    }

    return {
      query,
      contextLength: context.context.length,
      sourceCount: context.sources.length,
      totalResults: context.totalResults,
      usedResults: context.usedResults,
      averageRelevance: context.averageRelevance,
    };
  }

  async testPerformance() {
    const queries = [
      "数学教学目标",
      "语文阅读理解",
      "英语口语练习",
      "物理实验方法",
      "化学反应原理",
    ];

    const results = [];
    const startTime = Date.now();

    for (const query of queries) {
      const queryStart = Date.now();
      const searchResults = await vectorStore.search(query, { limit: 3 });
      const queryDuration = Date.now() - queryStart;

      results.push({
        query,
        resultCount: searchResults.length,
        duration: queryDuration,
      });
    }

    const totalDuration = Date.now() - startTime;
    const averageDuration = totalDuration / queries.length;

    if (averageDuration > 1000) {
      throw new Error(`搜索性能过慢: 平均 ${averageDuration}ms`);
    }

    return {
      totalQueries: queries.length,
      totalDuration,
      averageDuration,
      results,
    };
  }

  printSummary() {
    console.log("\n📊 测试结果总结");
    console.log("=".repeat(50));

    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;
    const total = this.testResults.length;

    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n❌ 失败的测试:");
      this.testResults
        .filter((r) => r.status === "FAIL")
        .forEach((result) => {
          console.log(`  - ${result.name}: ${result.error}`);
        });
    }

    console.log("\n");
  }
}

module.exports = VectorStoreTest;
