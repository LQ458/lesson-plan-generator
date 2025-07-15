const { ChromaClient } = require("chromadb");
const { DefaultEmbeddingFunction } = require("chromadb");

// 配置
const CHROMA_PATH = "http://localhost:8000";
const COLLECTION_NAME = "lesson_materials";

class CollectionChecker {
  constructor() {
    this.client = null;
    this.collection = null;
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: CHROMA_PATH,
      });

      console.log(`📡 连接到ChromaDB: ${CHROMA_PATH}`);
      return true;
    } catch (error) {
      console.error("❌ 连接ChromaDB失败:", error);
      return false;
    }
  }

  async checkCollection() {
    try {
      // 检查集合是否存在
      this.collection = await this.client.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction: new DefaultEmbeddingFunction(),
      });

      console.log(`✅ 集合 "${COLLECTION_NAME}" 存在`);
      return true;
    } catch (error) {
      console.log(`❌ 集合 "${COLLECTION_NAME}" 不存在`);
      return false;
    }
  }

  async getCollectionStats() {
    if (!this.collection) {
      console.log("❌ 集合未初始化");
      return;
    }

    try {
      // 获取文档总数
      const count = await this.collection.count();
      console.log(`📊 总文档数: ${count}`);

      if (count > 0) {
        // 获取样本数据
        const sample = await this.collection.get({
          limit: 10,
          include: ["metadatas", "documents"],
        });

        if (sample.metadatas && sample.metadatas.length > 0) {
          console.log(
            `\n📝 样本数据 (前${Math.min(10, sample.metadatas.length)}条):`,
          );

          // 统计学科分布
          const subjectStats = {};
          const gradeStats = {};
          const versionStats = {};

          sample.metadatas.forEach((meta, index) => {
            // 显示样本
            console.log(
              `${index + 1}. ${meta.subject} - ${meta.grade} - ${meta.material_name}`,
            );
            console.log(`   内容长度: ${meta.content_length} 字符`);
            console.log(`   来源: ${meta.source}`);
            console.log(`   页码: ${meta.page_number || "N/A"}`);
            console.log("");

            // 统计数据
            subjectStats[meta.subject] = (subjectStats[meta.subject] || 0) + 1;
            gradeStats[meta.grade] = (gradeStats[meta.grade] || 0) + 1;
            versionStats[meta.version] = (versionStats[meta.version] || 0) + 1;
          });

          console.log(`📈 学科分布:`);
          Object.entries(subjectStats).forEach(([subject, count]) => {
            console.log(`  ${subject}: ${count} 个样本`);
          });

          console.log(`\n📈 年级分布:`);
          Object.entries(gradeStats).forEach(([grade, count]) => {
            console.log(`  ${grade}: ${count} 个样本`);
          });

          console.log(`\n📈 版本分布:`);
          Object.entries(versionStats).forEach(([version, count]) => {
            console.log(`  ${version}: ${count} 个样本`);
          });
        }

        // 测试搜索功能
        await this.testSearch();
      }
    } catch (error) {
      console.error("❌ 获取集合统计失败:", error);
    }
  }

  async testSearch() {
    try {
      console.log(`\n🔍 测试搜索功能:`);

      const testQueries = ["数学", "九年级", "方程", "语文", "物理"];

      for (const query of testQueries) {
        const results = await this.collection.query({
          queryTexts: [query],
          nResults: 3,
          include: ["metadatas", "documents", "distances"],
        });

        if (
          results.metadatas &&
          results.metadatas[0] &&
          results.metadatas[0].length > 0
        ) {
          console.log(
            `  查询 "${query}" 找到 ${results.metadatas[0].length} 个结果:`,
          );
          results.metadatas[0].forEach((meta, index) => {
            const distance = results.distances[0][index];
            console.log(
              `    ${index + 1}. ${meta.subject} - ${meta.grade} (相似度: ${(1 - distance).toFixed(3)})`,
            );
          });
        } else {
          console.log(`  查询 "${query}" 未找到结果`);
        }
      }
    } catch (error) {
      console.error("❌ 搜索测试失败:", error);
    }
  }

  async checkHealth() {
    try {
      // 检查ChromaDB服务状态
      const response = await fetch(`${CHROMA_PATH}/api/v1/heartbeat`);
      if (response.ok) {
        console.log("✅ ChromaDB服务正常运行");
        return true;
      } else {
        console.log("❌ ChromaDB服务响应异常");
        return false;
      }
    } catch (error) {
      console.log("❌ 无法连接到ChromaDB服务");
      console.log("💡 请确保ChromaDB服务已启动: pnpm run chroma:start");
      return false;
    }
  }
}

// 主函数
async function main() {
  console.log("🔍 检查ChromaDB集合状态...\n");

  const checker = new CollectionChecker();

  // 检查服务健康状态
  const isHealthy = await checker.checkHealth();
  if (!isHealthy) {
    console.log("\n❌ ChromaDB服务不可用，退出检查");
    process.exit(1);
  }

  // 初始化客户端
  const initialized = await checker.initialize();
  if (!initialized) {
    console.log("\n❌ 初始化失败，退出检查");
    process.exit(1);
  }

  // 检查集合
  const collectionExists = await checker.checkCollection();
  if (!collectionExists) {
    console.log("\n💡 集合不存在，请先运行: pnpm run rag:load");
    process.exit(0);
  }

  // 获取集合统计
  await checker.getCollectionStats();

  console.log("\n✅ 集合状态检查完成！");
}

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 检查失败:", error);
    process.exit(1);
  });
}

module.exports = CollectionChecker;
