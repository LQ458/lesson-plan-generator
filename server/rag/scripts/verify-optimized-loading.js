const { ChromaClient, DefaultEmbeddingFunction } = require("chromadb");
const fs = require("fs").promises;
const path = require("path");

const CHROMA_PATH = "http://localhost:8000";
const COLLECTION_NAME = "lesson_materials";
const RAG_DATA_PATH = path.join(__dirname, "../../rag_data/chunks");

class LoadingVerifier {
  constructor() {
    this.client = null;
    this.collection = null;
  }

  async initialize() {
    try {
      this.client = new ChromaClient({ path: CHROMA_PATH });
      this.collection = await this.client.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction: new DefaultEmbeddingFunction(),
      });
      return true;
    } catch (error) {
      console.error("❌ 连接ChromaDB失败:", error.message);
      return false;
    }
  }

  async verifyDataStructure() {
    console.log("🔍 验证数据结构...\n");

    try {
      // 检查集合基本信息
      const count = await this.collection.count();
      console.log(`📊 总文档数: ${count}`);

      if (count === 0) {
        console.log("⚠️ 集合为空，请先运行数据加载");
        return false;
      }

      // 获取样本数据检查结构
      const sample = await this.collection.get({
        limit: 5,
        include: ["metadatas", "documents", "embeddings"]
      });

      console.log(`📝 样本文档数: ${sample.ids.length}`);
      
      if (sample.ids.length > 0) {
        const firstDoc = {
          id: sample.ids[0],
          metadata: sample.metadatas[0],
          documentLength: sample.documents[0].length,
          embeddingDimensions: sample.embeddings ? sample.embeddings[0].length : 'N/A'
        };

        console.log("\n📋 第一个文档结构:");
        console.log(`   ID: ${firstDoc.id}`);
        console.log(`   文档长度: ${firstDoc.documentLength} 字符`);
        console.log(`   嵌入维度: ${firstDoc.embeddingDimensions}`);
        
        // 检查增强元数据
        console.log("\n🏷️ 增强元数据字段:");
        const metadata = firstDoc.metadata;
        const enhancedFields = [
          'qualityScore', 'reliability', 'enhancementVersion',
          'ocrConfidence', 'chineseCharRatio', 'lengthScore', 'coherenceScore',
          'hasFormulas', 'hasNumbers', 'hasExperiment', 'hasDefinition',
          'hasQuestion', 'isTableContent', 'subjectArea'
        ];

        enhancedFields.forEach(field => {
          const value = metadata[field];
          const status = value !== undefined ? '✅' : '❌';
          console.log(`   ${status} ${field}: ${value !== undefined ? value : 'missing'}`);
        });

        return true;
      }

    } catch (error) {
      console.error("❌ 验证数据结构失败:", error);
      return false;
    }
  }

  async verifyEmbeddings() {
    console.log("\n🎯 验证嵌入向量...\n");

    try {
      const sample = await this.collection.get({
        limit: 3,
        include: ["metadatas", "documents", "embeddings"]
      });

      if (!sample.embeddings || sample.embeddings.length === 0) {
        console.log("❌ 没有找到嵌入向量！");
        return false;
      }

      console.log(`✅ 嵌入向量正常，检查了 ${sample.embeddings.length} 个向量`);
      
      const firstEmbedding = sample.embeddings[0];
      console.log(`📏 向量维度: ${firstEmbedding.length}`);
      console.log(`📊 向量范围: [${Math.min(...firstEmbedding).toFixed(3)}, ${Math.max(...firstEmbedding).toFixed(3)}]`);
      console.log(`📈 向量均值: ${(firstEmbedding.reduce((a, b) => a + b, 0) / firstEmbedding.length).toFixed(3)}`);

      return true;

    } catch (error) {
      console.error("❌ 验证嵌入向量失败:", error);
      return false;
    }
  }

  async verifySearch() {
    console.log("\n🔍 验证搜索功能...\n");

    const testQueries = [
      { query: "数学教学", description: "基础数学查询" },
      { query: "语文阅读理解", description: "语文相关查询" },
      { query: "科学实验", description: "科学教学查询" }
    ];

    let successCount = 0;

    for (const test of testQueries) {
      try {
        console.log(`🎯 测试查询: "${test.query}" (${test.description})`);
        
        const results = await this.collection.query({
          queryTexts: [test.query],
          nResults: 3,
          include: ["metadatas", "documents", "distances"]
        });

        if (results.documents && results.documents[0].length > 0) {
          const topResult = {
            distance: results.distances[0][0],
            similarity: 1 - results.distances[0][0],
            qualityScore: results.metadatas[0][0].qualityScore,
            subject: results.metadatas[0][0].subject,
            docLength: results.documents[0][0].length
          };

          console.log(`   ✅ 找到 ${results.documents[0].length} 个结果`);
          console.log(`   🎯 最佳匹配相似度: ${topResult.similarity.toFixed(3)}`);
          console.log(`   📊 质量分数: ${topResult.qualityScore}`);
          console.log(`   📚 学科: ${topResult.subject}`);
          console.log(`   📝 文档长度: ${topResult.docLength} 字符`);
          
          successCount++;
        } else {
          console.log(`   ❌ 没有找到结果`);
        }

      } catch (error) {
        console.log(`   ❌ 搜索失败: ${error.message}`);
      }
      
      console.log("");
    }

    const searchSuccess = successCount === testQueries.length;
    console.log(`🎯 搜索测试结果: ${successCount}/${testQueries.length} 成功`);
    
    return searchSuccess;
  }

  async verifyMetadataFiltering() {
    console.log("\n🏷️ 验证元数据过滤...\n");

    try {
      // 测试学科过滤
      const mathResults = await this.collection.query({
        queryTexts: ["教学方法"],
        nResults: 5,
        where: { subject: { "$eq": "数学" } },
        include: ["metadatas"]
      });

      console.log(`📊 数学学科过滤结果: ${mathResults.ids[0].length} 个文档`);

      // 测试质量分数过滤
      const highQualityResults = await this.collection.query({
        queryTexts: ["教学内容"],
        nResults: 5,
        where: { qualityScore: { "$gte": 0.7 } },
        include: ["metadatas"]
      });

      console.log(`⭐ 高质量文档过滤结果: ${highQualityResults.ids[0].length} 个文档`);

      // 测试组合过滤
      const combinedResults = await this.collection.query({
        queryTexts: ["教学活动"],
        nResults: 5,
        where: { 
          "$and": [
            { subject: { "$eq": "语文" } },
            { qualityScore: { "$gte": 0.5 } }
          ]
        },
        include: ["metadatas"]
      });

      console.log(`🔗 组合条件过滤结果: ${combinedResults.ids[0].length} 个文档`);

      return true;

    } catch (error) {
      console.error("❌ 元数据过滤测试失败:", error);
      return false;
    }
  }

  async verifyDataQuality() {
    console.log("\n📊 验证数据质量...\n");

    try {
      // 获取大样本进行质量分析
      const sample = await this.collection.get({
        limit: 100,
        include: ["metadatas"]
      });

      const qualityScores = sample.metadatas
        .map(m => m.qualityScore)
        .filter(score => typeof score === 'number');

      const avgQualityScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      const minQualityScore = Math.min(...qualityScores);
      const maxQualityScore = Math.max(...qualityScores);

      console.log(`📈 质量分数统计:`);
      console.log(`   平均值: ${avgQualityScore.toFixed(3)}`);
      console.log(`   最小值: ${minQualityScore.toFixed(3)}`);
      console.log(`   最大值: ${maxQualityScore.toFixed(3)}`);
      console.log(`   样本数: ${qualityScores.length}`);

      // 统计学科分布
      const subjects = sample.metadatas.map(m => m.subject);
      const subjectCounts = {};
      subjects.forEach(subject => {
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
      });

      console.log(`\n📚 学科分布:`);
      Object.entries(subjectCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([subject, count]) => {
          console.log(`   ${subject}: ${count} 个文档`);
        });

      // 检查增强版本
      const enhancementVersions = sample.metadatas
        .map(m => m.enhancementVersion)
        .filter(v => v);
      
      const versionCounts = {};
      enhancementVersions.forEach(version => {
        versionCounts[version] = (versionCounts[version] || 0) + 1;
      });

      console.log(`\n🔧 增强版本分布:`);
      Object.entries(versionCounts).forEach(([version, count]) => {
        console.log(`   版本 ${version}: ${count} 个文档`);
      });

      return true;

    } catch (error) {
      console.error("❌ 数据质量验证失败:", error);
      return false;
    }
  }

  async runAllVerifications() {
    console.log("🧪 开始验证优化RAG加载结果");
    console.log("=" + "=".repeat(50) + "\n");

    const verifications = [
      { name: "数据结构", fn: () => this.verifyDataStructure() },
      { name: "嵌入向量", fn: () => this.verifyEmbeddings() },
      { name: "搜索功能", fn: () => this.verifySearch() },
      { name: "元数据过滤", fn: () => this.verifyMetadataFiltering() },
      { name: "数据质量", fn: () => this.verifyDataQuality() }
    ];

    const results = {};
    
    for (const verification of verifications) {
      try {
        results[verification.name] = await verification.fn();
      } catch (error) {
        console.error(`❌ ${verification.name}验证出错:`, error);
        results[verification.name] = false;
      }
    }

    // 打印总结
    console.log("\n" + "=" + "=".repeat(50));
    console.log("📋 验证结果汇总:");
    console.log("=" + "=".repeat(50));

    Object.entries(results).forEach(([name, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n🎯 总体结果: ${passedCount}/${totalCount} 验证通过`);

    if (passedCount === totalCount) {
      console.log("🎉 优化RAG加载系统验证完全通过！");
      return true;
    } else {
      console.log("⚠️ 部分验证失败，需要检查相关问题");
      return false;
    }
  }
}

async function main() {
  const verifier = new LoadingVerifier();

  console.log("🔧 正在连接ChromaDB...");
  const connected = await verifier.initialize();
  
  if (!connected) {
    console.log("❌ 无法连接到ChromaDB，请确保服务正在运行");
    process.exit(1);
  }

  console.log("✅ 已连接到ChromaDB\n");

  const success = await verifier.runAllVerifications();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error("❌ 验证程序执行失败:", error);
    process.exit(1);
  });
}

module.exports = LoadingVerifier;