const { ChromaClient } = require("chromadb");
const { DefaultEmbeddingFunction } = require("chromadb");
const textProcessor = require("../utils/text-processor");

// 配置
const CHROMA_PATH = "http://localhost:8000";
const COLLECTION_NAME = "lesson_materials";

class RAGMatchingDebugger {
  constructor() {
    this.client = null;
    this.collection = null;
    this.textProcessor = textProcessor;
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: CHROMA_PATH,
      });

      this.collection = await this.client.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction: new DefaultEmbeddingFunction(),
      });

      console.log(`✅ 连接到ChromaDB: ${CHROMA_PATH}`);
      return true;
    } catch (error) {
      console.error("❌ 连接ChromaDB失败:", error);
      return false;
    }
  }

  async analyzeCollection() {
    try {
      console.log("\n📊 分析集合数据分布...");

      // 获取所有数据
      const results = await this.collection.get({
        include: ["metadatas", "documents"],
      });

      const subjects = {};
      const grades = {};
      const sources = {};
      let totalDocuments = 0;

      if (results.metadatas && results.metadatas.length > 0) {
        totalDocuments = results.metadatas.length;

        results.metadatas.forEach((metadata) => {
          // 统计学科分布
          const subject = metadata.subject || "未知";
          subjects[subject] = (subjects[subject] || 0) + 1;

          // 统计年级分布
          const grade = metadata.grade || "未知";
          grades[grade] = (grades[grade] || 0) + 1;

          // 统计来源分布
          const source = metadata.source || "未知";
          sources[source] = (sources[source] || 0) + 1;
        });
      }

      console.log(`📚 总文档数: ${totalDocuments}`);
      console.log(
        `📖 学科分布:`,
        Object.entries(subjects).sort((a, b) => b[1] - a[1]),
      );
      console.log(
        `🎓 年级分布:`,
        Object.entries(grades).sort((a, b) => b[1] - a[1]),
      );
      console.log(`📄 来源文件数: ${Object.keys(sources).length}`);

      return { subjects, grades, sources, totalDocuments };
    } catch (error) {
      console.error("❌ 分析集合失败:", error);
      return null;
    }
  }

  async testQuery(query, subject, grade) {
    try {
      console.log(`\n🔍 测试查询: "${query}"`);
      console.log(`📖 学科: ${subject}`);
      console.log(`🎓 年级: ${grade}`);

      // 构建过滤条件
      const conditions = [];
      if (subject && subject !== "未知") {
        conditions.push({ subject: { $eq: subject } });
      }
      if (grade && grade !== "未知") {
        conditions.push({ grade: { $eq: grade } });
      }

      let whereClause = undefined;
      if (conditions.length > 1) {
        whereClause = { $and: conditions };
      } else if (conditions.length === 1) {
        whereClause = conditions[0];
      }

      console.log(`🔧 过滤条件:`, JSON.stringify(whereClause, null, 2));

      const results = await this.collection.query({
        queryTexts: [query],
        nResults: 10,
        where: whereClause,
        include: ["documents", "metadatas", "distances"],
      });

      console.log(`📊 查询结果数: ${results.documents?.[0]?.length || 0}`);

      if (results.documents && results.documents[0]) {
        results.documents[0].forEach((doc, index) => {
          const metadata = results.metadatas[0][index];
          const distance = results.distances[0][index];
          const similarity = (1 - distance) * 100;

          console.log(`\n📄 结果 ${index + 1}:`);
          console.log(`   📖 学科: ${metadata.subject}`);
          console.log(`   🎓 年级: ${metadata.grade}`);
          console.log(`   📚 来源: ${metadata.source}`);
          console.log(`   🎯 相似度: ${similarity.toFixed(2)}%`);
          console.log(`   📝 内容预览: ${doc.substring(0, 100)}...`);
        });
      }

      return results;
    } catch (error) {
      console.error("❌ 查询测试失败:", error);
      return null;
    }
  }

  async testSpecificCase() {
    console.log("\n🧪 测试具体案例: 历史课题匹配数学教材问题");

    // 测试用户报告的问题
    const testCases = [
      {
        query: "我国境内的早期人类",
        subject: "历史",
        grade: "七年级",
        description: "用户报告的问题案例",
      },
      {
        query: "小数乘法",
        subject: "数学",
        grade: "五年级",
        description: "数学课题测试",
      },
      {
        query: "古代中国",
        subject: "历史",
        grade: "七年级",
        description: "历史课题测试",
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 测试案例: ${testCase.description}`);
      await this.testQuery(testCase.query, testCase.subject, testCase.grade);
    }
  }

  async diagnoseFileNameParsing() {
    console.log("\n🔍 诊断文件名解析问题...");

    const testFiles = [
      "1751827962807_湘教版数学九年级下册教师用书.pdf.json",
      "1751827857656_六年级下册数学人教版电子课本.pdf.json",
      "1751827889810_人教版语文七年级上册电子课本.pdf.json",
      "1751827894515_人教版语文七年级下册电子课本.pdf.json",
      "1751827857559_六年级上册道德与法治部编版电子课本.pdf.json",
    ];

    console.log("📄 文件名解析测试:");
    testFiles.forEach((filename) => {
      const subject = this.textProcessor.extractSubject(filename);
      const grade = this.textProcessor.extractGrade(filename);
      console.log(`   ${filename}`);
      console.log(`   -> 学科: ${subject}, 年级: ${grade}`);
    });
  }
}

async function main() {
  const ragDebugger = new RAGMatchingDebugger();

  if (await ragDebugger.initialize()) {
    await ragDebugger.analyzeCollection();
    await ragDebugger.diagnoseFileNameParsing();
    await ragDebugger.testSpecificCase();
  }
}

// 运行调试
main().catch(console.error);
