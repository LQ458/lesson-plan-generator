/**
 * 初始化向量数据库脚本
 */

const vectorStore = require("../services/vector-store");
const logger = require("../../utils/logger");

async function initializeVectorDB() {
  try {
    console.log("🚀 开始初始化向量数据库...");

    // 1. 初始化服务
    console.log("1. 初始化向量存储服务...");
    await vectorStore.initialize();
    console.log("✅ 向量存储服务初始化成功");

    // 2. 健康检查
    console.log("2. 执行健康检查...");
    const health = await vectorStore.healthCheck();
    if (health.status !== "healthy") {
      throw new Error(`健康检查失败: ${health.error}`);
    }
    console.log("✅ 健康检查通过");

    // 3. 加载文档
    console.log("3. 加载文档到向量数据库...");
    const loadResult = await vectorStore.loadDocuments();
    console.log("✅ 文档加载完成");
    console.log(`   - 总文件数: ${loadResult.totalFiles}`);
    console.log(`   - 总块数: ${loadResult.totalChunks}`);
    console.log(`   - 成功加载: ${loadResult.loadedChunks}`);
    console.log(`   - 成功率: ${loadResult.successRate}`);

    if (loadResult.errors && loadResult.errors.length > 0) {
      console.log("⚠️  加载过程中的错误:");
      loadResult.errors.forEach((error, index) => {
        console.log(
          `   ${index + 1}. ${error.file}: ${error.error || error.errors?.join(", ")}`,
        );
      });
    }

    // 4. 获取统计信息
    console.log("4. 获取集合统计信息...");
    const stats = await vectorStore.getCollectionStats();
    console.log("✅ 统计信息获取成功");
    console.log(`   - 总文档数: ${stats.totalDocuments}`);
    console.log(`   - 平均质量分数: ${stats.averageQualityScore}`);
    console.log(
      `   - 学科分布: ${Object.keys(stats.subjectDistribution || {}).join(", ")}`,
    );
    console.log(
      `   - 年级分布: ${Object.keys(stats.gradeDistribution || {}).join(", ")}`,
    );

    // 5. 测试搜索功能
    console.log("5. 测试搜索功能...");
    const testQuery = "数学教学目标";
    const searchResults = await vectorStore.search(testQuery, { limit: 3 });
    console.log("✅ 搜索功能测试通过");
    console.log(`   - 查询: "${testQuery}"`);
    console.log(`   - 结果数: ${searchResults.length}`);

    if (searchResults.length > 0) {
      console.log(`   - 最高相似度: ${searchResults[0].similarity.toFixed(3)}`);
      console.log(
        `   - 最高相关性: ${searchResults[0].relevanceScore.toFixed(3)}`,
      );
    }

    console.log("\n🎉 向量数据库初始化完成！");
    console.log("系统已准备就绪，可以开始使用RAG功能。");

    return {
      success: true,
      loadResult,
      stats,
      testResults: {
        query: testQuery,
        resultCount: searchResults.length,
        maxSimilarity:
          searchResults.length > 0 ? searchResults[0].similarity : 0,
      },
    };
  } catch (error) {
    console.error("❌ 向量数据库初始化失败:", error);
    logger.error("向量数据库初始化失败:", error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeVectorDB()
    .then((result) => {
      console.log("\n✅ 初始化脚本执行成功");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 初始化脚本执行失败:", error.message);
      process.exit(1);
    });
}

module.exports = { initializeVectorDB };
