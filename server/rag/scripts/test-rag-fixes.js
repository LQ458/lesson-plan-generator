const vectorStore = require("../services/vector-store");

async function testRAGFixes() {
  console.log("🧪 测试RAG系统修复效果...\n");

  try {
    await vectorStore.initialize();

    // 测试案例
    const testCases = [
      {
        query: "我国境内的早期人类",
        subject: "历史",
        grade: "七年级",
        description: "用户报告的问题案例 - 历史课题",
      },
      {
        query: "小数乘法",
        subject: "数学",
        grade: "五年级",
        description: "数学课题 - 应该有精确匹配",
      },
      {
        query: "古代文明",
        subject: "历史",
        grade: "一年级",
        description: "不合理的年级组合 - 测试回退机制",
      },
    ];

    for (const testCase of testCases) {
      console.log(`📋 测试: ${testCase.description}`);
      console.log(`🔍 查询: "${testCase.query}"`);
      console.log(`📖 学科: ${testCase.subject}`);
      console.log(`🎓 年级: ${testCase.grade}\n`);

      const result = await vectorStore.getRelevantContext(
        testCase.query,
        testCase.subject,
        testCase.grade,
        1000,
      );

      console.log(`📊 结果统计:`);
      console.log(`   - 总结果数: ${result.totalResults}`);
      console.log(`   - 使用结果数: ${result.usedResults}`);
      console.log(`   - 上下文长度: ${result.context.length} 字符`);
      console.log(`   - 来源数量: ${result.sources.length}`);

      if (result.sources.length > 0) {
        console.log(`   - 来源列表:`);
        result.sources.forEach((source, index) => {
          console.log(`     ${index + 1}. ${source}`);
        });
      } else {
        console.log(`   ⚠️ 没有找到任何来源`);
      }

      console.log(`   - 上下文预览: ${result.context.substring(0, 100)}...`);
      console.log(`\n${"=".repeat(60)}\n`);
    }

    console.log("✅ RAG系统测试完成");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testRAGFixes().catch(console.error);
