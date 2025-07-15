const fs = require("fs").promises;
const path = require("path");
const { ChromaClient } = require("chromadb");
const { DefaultEmbeddingFunction } = require("chromadb");

// 配置
const CHROMA_PATH = "http://localhost:8000";
const COLLECTION_NAME = "lesson_materials";
const OPTIMIZED_DATA_PATH = path.join(__dirname, "../../optimized");

class OptimizedDataLoader {
  constructor() {
    this.client = null;
    this.collection = null;
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0,
      errors: [],
    };
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: CHROMA_PATH,
      });

      console.log(`📡 连接到ChromaDB: ${CHROMA_PATH}`);

      // 检查集合是否存在
      try {
        this.collection = await this.client.getCollection({
          name: COLLECTION_NAME,
          embeddingFunction: new DefaultEmbeddingFunction(),
        });
        console.log(`✅ 使用现有集合: ${COLLECTION_NAME}`);
      } catch (error) {
        // 集合不存在，创建新集合
        this.collection = await this.client.createCollection({
          name: COLLECTION_NAME,
          metadata: {
            description: "教学材料向量数据库",
            version: "1.0.0",
            created_at: new Date().toISOString(),
          },
          embeddingFunction: new DefaultEmbeddingFunction(),
        });
        console.log(`🆕 创建新集合: ${COLLECTION_NAME}`);
      }

      return true;
    } catch (error) {
      console.error("❌ 初始化失败:", error);
      return false;
    }
  }

  async loadOptimizedData() {
    console.log("🚀 开始加载优化数据...");

    try {
      // 读取optimized文件夹中的所有JSON文件
      const files = await fs.readdir(OPTIMIZED_DATA_PATH);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      this.stats.totalFiles = jsonFiles.length;
      console.log(`📁 找到 ${jsonFiles.length} 个JSON文件`);

      for (const file of jsonFiles) {
        await this.processFile(file);
      }

      console.log("🎉 数据加载完成！");
      this.printStats();
    } catch (error) {
      console.error("❌ 加载数据失败:", error);
      this.stats.errors.push(error.message);
    }
  }

  async processFile(filename) {
    try {
      const filePath = path.join(OPTIMIZED_DATA_PATH, filename);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(fileContent);

      console.log(`📖 处理文件: ${filename}`);

      // 解析文件名获取教材信息
      const materialInfo = this.parseFilename(filename);

      // 处理chunks数据
      if (data.chunks && Array.isArray(data.chunks)) {
        await this.processChunks(data.chunks, materialInfo, filename);
      } else {
        console.warn(`⚠️ 文件 ${filename} 没有有效的chunks数据`);
      }

      this.stats.processedFiles++;
      console.log(
        `✅ 完成处理: ${filename} (${data.chunks?.length || 0} chunks)`,
      );
    } catch (error) {
      console.error(`❌ 处理文件 ${filename} 失败:`, error);
      this.stats.errors.push(`${filename}: ${error.message}`);
    }
  }

  parseFilename(filename) {
    // 解析文件名格式：1751827962807_湘教版数学九年级下册教师用书.pdf.json
    const nameWithoutExt = filename.replace(".json", "");
    const parts = nameWithoutExt.split("_");

    if (parts.length >= 2) {
      const materialName = parts.slice(1).join("_");

      // 提取学科信息
      const subjects = [
        "数学",
        "语文",
        "英语",
        "物理",
        "化学",
        "生物",
        "历史",
        "地理",
        "政治",
        "音乐",
        "美术",
        "科学",
      ];
      const subject = subjects.find((s) => materialName.includes(s)) || "通用";

      // 提取年级信息
      const gradeMatch = materialName.match(
        /(一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|高一|高二|高三)/,
      );
      const grade = gradeMatch ? gradeMatch[1] : "通用";

      // 提取版本信息
      const versionMatch = materialName.match(
        /(人教版|北师大版|苏教版|湘教版|华师大版|沪教版|外研版|译林版|冀教版|鲁教版|青岛版|川教版|粤教版|浙教版|鄂教版|西师大版|长春版|语文版|科普版|清华版|广东开心版|重大版|湘鲁版|湘少版|广西接力版|陕旅版|闽教版|鲁湘版|鲁科版|北京版|人音版|人美版|湘美版|苏科版|教科版)/,
      );
      const version = versionMatch ? versionMatch[1] : "通用版";

      return {
        subject,
        grade,
        version,
        materialName: materialName.replace(".pdf", ""),
        type: materialName.includes("教师用书") ? "教师用书" : "电子课本",
      };
    }

    return {
      subject: "通用",
      grade: "通用",
      version: "通用版",
      materialName: filename.replace(".json", ""),
      type: "教学材料",
    };
  }

  async processChunks(chunks, materialInfo, filename) {
    const batchSize = 100; // 批量处理大小

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await this.processBatch(batch, materialInfo, filename, i);
    }
  }

  async processBatch(chunks, materialInfo, filename, startIndex) {
    try {
      const documents = [];
      const metadatas = [];
      const ids = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        this.stats.totalChunks++;

        // 验证chunk数据
        if (
          !chunk.content ||
          typeof chunk.content !== "string" ||
          chunk.content.trim().length === 0
        ) {
          console.warn(`⚠️ 跳过空chunk: ${filename} - chunk ${startIndex + i}`);
          continue;
        }

        // 生成唯一ID
        const chunkId = `${filename}_chunk_${startIndex + i}`;

        // 准备文档内容
        const content = chunk.content.trim();

        // 准备元数据
        const metadata = {
          source: filename,
          chunk_index: startIndex + i,
          subject: materialInfo.subject,
          grade: materialInfo.grade,
          version: materialInfo.version,
          material_name: materialInfo.materialName,
          material_type: materialInfo.type,
          content_length: content.length,
          page_number: chunk.page_number || 0,
          created_at: new Date().toISOString(),
          ...chunk.metadata, // 包含原始元数据
        };

        documents.push(content);
        metadatas.push(metadata);
        ids.push(chunkId);
      }

      // 批量添加到向量数据库
      if (documents.length > 0) {
        await this.collection.add({
          documents: documents,
          metadatas: metadatas,
          ids: ids,
        });

        this.stats.successfulChunks += documents.length;
        console.log(`✅ 成功添加 ${documents.length} 个chunks到数据库`);
      }
    } catch (error) {
      console.error(`❌ 处理批次失败:`, error);
      this.stats.failedChunks += chunks.length;
      this.stats.errors.push(`Batch processing: ${error.message}`);
    }
  }

  printStats() {
    console.log("\n📊 加载统计:");
    console.log(`📁 总文件数: ${this.stats.totalFiles}`);
    console.log(`✅ 处理成功: ${this.stats.processedFiles}`);
    console.log(`📝 总chunks数: ${this.stats.totalChunks}`);
    console.log(`✅ 成功chunks: ${this.stats.successfulChunks}`);
    console.log(`❌ 失败chunks: ${this.stats.failedChunks}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ 错误列表:`);
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }

  async getCollectionInfo() {
    try {
      const count = await this.collection.count();
      console.log(`\n📚 集合信息:`);
      console.log(`📊 总文档数: ${count}`);

      // 获取一些样本数据
      const sample = await this.collection.get({
        limit: 5,
        include: ["metadatas", "documents"],
      });

      if (sample.metadatas && sample.metadatas.length > 0) {
        console.log(`\n📝 样本数据:`);
        sample.metadatas.forEach((meta, index) => {
          console.log(
            `${index + 1}. ${meta.subject} - ${meta.grade} - ${meta.material_name}`,
          );
        });
      }
    } catch (error) {
      console.error("❌ 获取集合信息失败:", error);
    }
  }
}

// 主函数
async function main() {
  console.log("🎯 开始加载优化数据到ChromaDB...\n");

  const loader = new OptimizedDataLoader();

  // 初始化
  const initialized = await loader.initialize();
  if (!initialized) {
    console.error("❌ 初始化失败，退出程序");
    process.exit(1);
  }

  // 加载数据
  await loader.loadOptimizedData();

  // 显示集合信息
  await loader.getCollectionInfo();

  console.log("\n🎉 数据加载完成！");
}

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 程序执行失败:", error);
    process.exit(1);
  });
}

module.exports = OptimizedDataLoader;
