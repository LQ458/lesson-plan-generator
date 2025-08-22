const VectorStoreService = require("../services/vector-store");
const fs = require("fs").promises;
const path = require("path");

class EnhancedRAGTester {
  constructor() {
    this.vectorStore = new VectorStoreService();
  }

  async testDataStructure() {
    console.log("🧪 测试增强RAG数据结构...\n");

    try {
      // 读取一个示例文件查看数据结构
      const ragDataDir = path.join(__dirname, "../../rag_data/chunks");
      const files = await fs.readdir(ragDataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        console.log("❌ 没有找到JSON数据文件");
        return false;
      }

      const sampleFile = jsonFiles[0];
      const filePath = path.join(ragDataDir, sampleFile);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      console.log(`📁 示例文件: ${sampleFile}`);
      console.log(`📊 数据类型: ${Array.isArray(data) ? 'Array (增强格式)' : 'Object (旧格式)'}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const sampleChunk = data[0];
        console.log(`📝 示例块结构:`);
        console.log(`   - 内容长度: ${sampleChunk.content?.length || 0}`);
        console.log(`   - 质量分数: ${sampleChunk.qualityScore || 'N/A'}`);
        console.log(`   - 可靠性: ${sampleChunk.reliability || 'N/A'}`);
        console.log(`   - 语义特征: ${sampleChunk.semanticFeatures ? 'Yes' : 'No'}`);
        console.log(`   - OCR信心度: ${sampleChunk.metadata?.qualityMetrics?.ocrConfidence || 'N/A'}`);
        console.log(`   - 增强版本: ${sampleChunk.metadata?.enhancementVersion || 'N/A'}`);
        
        return true;
      } else {
        console.log("⚠️ 数据结构不符合预期");
        return false;
      }
    } catch (error) {
      console.error("❌ 测试数据结构失败:", error.message);
      return false;
    }
  }

  async testVectorStoreConnection() {
    console.log("🔗 测试向量存储连接...\n");

    try {
      await this.vectorStore.initialize();
      const stats = await this.vectorStore.getCollectionStats();
      
      console.log("✅ 向量存储连接成功");
      console.log(`📊 集合统计:`);
      console.log(`   - 总文档数: ${stats.totalDocuments}`);
      console.log(`   - 集合名称: ${stats.collectionName}`);
      console.log(`   - 平均质量分数: ${stats.averageQualityScore || 'N/A'}`);
      console.log(`   - 学科分布: ${JSON.stringify(stats.subjectDistribution || {})}`);
      
      return true;
    } catch (error) {
      console.error("❌ 向量存储连接失败:", error.message);
      return false;
    }
  }

  async testBasicSearch() {
    console.log("🔍 测试基础搜索功能...\n");

    try {
      const testQueries = [
        { query: "数学", subject: "数学", grade: "一年级" },
        { query: "语文阅读", subject: "语文", grade: null },
        { query: "科学实验", subject: null, grade: null }
      ];

      for (const test of testQueries) {
        console.log(`🎯 测试查询: "${test.query}" (学科: ${test.subject || '任何'}, 年级: ${test.grade || '任何'})`);
        
        const results = await this.vectorStore.search(test.query, {
          subject: test.subject,
          grade: test.grade,
          limit: 3
        });

        console.log(`   📝 结果数量: ${results.length}`);
        if (results.length > 0) {
          console.log(`   🎯 最佳匹配相似度: ${results[0].similarity?.toFixed(3) || 'N/A'}`);
          console.log(`   📊 质量分数: ${results[0].metadata?.qualityScore?.toFixed(3) || 'N/A'}`);
          console.log(`   📚 来源: ${results[0].metadata?.source || 'N/A'}`);
        }
        console.log("");
      }

      return true;
    } catch (error) {
      console.error("❌ 搜索测试失败:", error.message);
      return false;
    }
  }

  async testContextRetrieval() {
    console.log("📚 测试上下文检索功能...\n");

    try {
      const context = await this.vectorStore.getRelevantContext(
        "教学一年级数学",
        "数学",
        "一年级"
      );

      console.log("✅ 上下文检索成功");
      console.log(`📊 检索统计:`);
      console.log(`   - 上下文长度: ${context.context.length}`);
      console.log(`   - 使用的源: ${context.sources.length}`);
      console.log(`   - 总结果: ${context.totalResults}`);
      console.log(`   - 使用结果: ${context.usedResults}`);
      console.log(`   - 平均相关性: ${context.averageRelevance?.toFixed(3) || 'N/A'}`);
      console.log(`   - Token数量: ${context.tokenCount}`);

      return true;
    } catch (error) {
      console.error("❌ 上下文检索失败:", error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log("🚀 开始增强RAG系统综合测试\n");
    console.log("=" + "=".repeat(50) + "\n");

    const results = {
      dataStructure: await this.testDataStructure(),
      vectorStore: await this.testVectorStoreConnection(),
      basicSearch: await this.testBasicSearch(),
      contextRetrieval: await this.testContextRetrieval()
    };

    console.log("\n" + "=" + "=".repeat(50));
    console.log("📋 测试结果汇总:");
    console.log("=" + "=".repeat(50));

    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 总体结果: ${passedTests}/${totalTests} 测试通过`);

    if (passedTests === totalTests) {
      console.log("🎉 增强RAG系统完全正常工作！");
      return true;
    } else {
      console.log("⚠️ 部分测试失败，需要进一步调试");
      return false;
    }
  }
}

// 运行测试
async function main() {
  const tester = new EnhancedRAGTester();
  
  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("❌ 测试运行失败:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancedRAGTester;