require("dotenv").config();
const VectorStore = require("../services/vector-store");
const AIService = require("../../ai-service");

async function testRAGSystem() {
  console.log("🧪 测试RAG系统综合功能...\n");

  const vectorStore = new VectorStore();
  const aiService = new AIService();

  try {
    // 测试1: 测试RAG检索功能
    console.log("📚 测试1: RAG检索功能");
    const ragResult = await vectorStore.getRelevantContext(
      "数学",
      "三年级",
      "加法运算",
      200,
    );
    console.log(
      `✅ 检索结果: ${ragResult.totalResults} 个文档, 使用了 ${ragResult.usedResults} 个`,
    );
    console.log(`📝 上下文长度: ${ragResult.context.length} 字符`);
    console.log(`📚 数据源: ${ragResult.sources.slice(0, 3).join(", ")}`);
    console.log("---");

    // 测试2: 测试AI服务状态
    console.log("🤖 测试2: AI服务状态");
    const aiStatus = aiService.getStatus();
    console.log(`✅ AI服务状态: ${aiStatus.enabled ? "已启用" : "未启用"}`);
    console.log(`🔧 AI模型: ${aiStatus.model}`);
    console.log(`⚙️ 最大Token: ${aiStatus.maxTokens}`);
    console.log("---");

    // 测试3: 测试内容分析功能
    console.log("📝 测试3: 内容分析功能");
    const sampleContent =
      "这是一个关于数学加法运算的教学内容，包含两位数加法的基本概念和计算方法。";

    console.log("🔄 分析内容中...");
    const analysis = await aiService.analyzeContent(sampleContent, "summary");
    console.log("✅ 内容分析成功");
    console.log(`📝 分析结果长度: ${analysis.length} 字符`);
    console.log(`📊 分析内容: ${analysis.substring(0, 100)}...`);
    console.log("---");

    // 测试4: 测试不同学科的RAG效果
    console.log("🔬 测试4: 不同学科RAG效果");
    const subjects = ["语文", "英语", "物理", "化学"];

    for (const subject of subjects) {
      const result = await vectorStore.getRelevantContext(
        subject,
        "八年级",
        "基础知识",
        100,
      );
      console.log(
        `${subject}: ${result.totalResults} 个文档, 使用 ${result.usedResults} 个`,
      );
    }
    console.log("---");

    // 测试5: 测试RAG搜索质量
    console.log("🎯 测试5: RAG搜索质量");
    const searchQueries = [
      { query: "方程解法", subject: "数学", grade: "七年级" },
      { query: "文言文阅读", subject: "语文", grade: "八年级" },
      { query: "化学反应", subject: "化学", grade: "九年级" },
    ];

    for (const { query, subject, grade } of searchQueries) {
      const result = await vectorStore.getRelevantContext(
        subject,
        grade,
        query,
        100,
      );
      console.log(
        `"${query}" (${subject}-${grade}): ${result.usedResults} 个相关文档`,
      );
      if (result.context.length > 0) {
        console.log(`  📖 样本内容: ${result.context.substring(0, 100)}...`);
      }
    }

    console.log("\n🎉 所有RAG测试完成！系统运行正常。");
    return true;
  } catch (error) {
    console.error("❌ RAG测试失败:", error.message);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testRAGSystem().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testRAGSystem;
