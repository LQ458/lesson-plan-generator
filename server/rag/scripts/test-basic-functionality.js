#!/usr/bin/env node

/**
 * RAG基础功能测试脚本（不依赖Docker）
 */

const path = require("path");
const fs = require("fs").promises;
const textProcessor = require("../utils/text-processor");
const {
  DocumentChunk,
  SearchResult,
  DocumentCollection,
} = require("../models/document-model");
const config = require("../config/vector-db-config");

class BasicFunctionalityTest {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log("🧪 开始RAG基础功能测试（不依赖Docker）...\n");

    const tests = [
      { name: "配置文件测试", fn: this.testConfig },
      { name: "文本处理器测试", fn: this.testTextProcessor },
      { name: "文档模型测试", fn: this.testDocumentModel },
      { name: "文档格式验证测试", fn: this.testDocumentValidation },
      { name: "文档加载测试", fn: this.testDocumentLoading },
      { name: "学科年级提取测试", fn: this.testSubjectGradeExtraction },
      { name: "质量评分测试", fn: this.testQualityScoring },
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

  async testConfig() {
    // 测试配置文件
    if (!config.chroma || !config.embedding || !config.search) {
      throw new Error("配置文件缺少必要字段");
    }

    if (!Array.isArray(config.subjects) || config.subjects.length === 0) {
      throw new Error("学科配置无效");
    }

    if (!Array.isArray(config.grades) || config.grades.length === 0) {
      throw new Error("年级配置无效");
    }

    return {
      chromaPath: config.chroma.path,
      embeddingModel: config.embedding.model,
      subjectCount: config.subjects.length,
      gradeCount: config.grades.length,
      searchDefaults: config.search,
    };
  }

  async testTextProcessor() {
    // 测试文本处理器
    const testFilename = "三年级数学上册教案.pdf";
    const testText =
      "这是一个测试文本，包含教学目标、教学重点、教学难点等内容。";

    const subject = textProcessor.extractSubject(testFilename);
    const grade = textProcessor.extractGrade(testFilename);
    const cleanedText = textProcessor.cleanText(testText);
    const keywords = textProcessor.extractKeywords(testText);
    const qualityScore = textProcessor.calculateQualityScore(testText);
    const summary = textProcessor.generateSummary(testText, 50);

    return {
      filename: testFilename,
      extractedSubject: subject,
      extractedGrade: grade,
      cleanedTextLength: cleanedText.length,
      keywordCount: keywords.length,
      qualityScore,
      summaryLength: summary.length,
    };
  }

  async testDocumentModel() {
    // 测试文档模型
    const testChunk = new DocumentChunk({
      content: "这是一个测试文档块，用于验证文档模型功能。",
      embedding: new Array(384).fill(0.1), // 模拟嵌入向量
      metadata: {
        source: "测试文档.pdf",
        subject: "数学",
        grade: "三年级",
        qualityScore: 3.5,
      },
    });

    const validation = testChunk.validate();
    if (!validation.isValid) {
      throw new Error(`文档块验证失败: ${validation.errors.join(", ")}`);
    }

    const chromaFormat = testChunk.toChromaFormat();
    if (!chromaFormat.id || !chromaFormat.document || !chromaFormat.embedding) {
      throw new Error("Chroma格式转换失败");
    }

    return {
      chunkId: testChunk.id,
      contentLength: testChunk.content.length,
      embeddingDimensions: testChunk.embedding.length,
      metadata: testChunk.metadata,
      chromaFormatValid: true,
    };
  }

  async testDocumentValidation() {
    // 测试文档格式验证
    const validDocument = {
      filename: "测试文档.pdf",
      chunks: [
        {
          content: "测试内容",
          embedding: new Array(384).fill(0.1),
        },
      ],
    };

    const invalidDocument = {
      filename: "",
      chunks: [],
    };

    const validResult = textProcessor.validateDocumentFormat(validDocument);
    const invalidResult = textProcessor.validateDocumentFormat(invalidDocument);

    if (validResult.isValid !== true) {
      throw new Error("有效文档验证失败");
    }

    if (invalidResult.isValid !== false) {
      throw new Error("无效文档验证失败");
    }

    return {
      validDocumentPassed: validResult.isValid,
      invalidDocumentFailed: !invalidResult.isValid,
      invalidErrors: invalidResult.errors,
    };
  }

  async testDocumentLoading() {
    // 测试文档加载（检查文件是否存在）
    const optimizedDir = path.join(__dirname, "../../optimized");

    try {
      const files = await fs.readdir(optimizedDir);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      if (jsonFiles.length === 0) {
        throw new Error("没有找到JSON文档文件");
      }

      // 读取第一个文件进行测试
      const testFile = jsonFiles[0];
      const filePath = path.join(optimizedDir, testFile);
      const content = await fs.readFile(filePath, "utf8");
      const document = JSON.parse(content);

      const validation = textProcessor.validateDocumentFormat(document);

      return {
        totalFiles: jsonFiles.length,
        testFile,
        documentValid: validation.isValid,
        hasChunks: document.chunks && document.chunks.length > 0,
        chunkCount: document.chunks ? document.chunks.length : 0,
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("优化文档目录不存在");
      }
      throw error;
    }
  }

  async testSubjectGradeExtraction() {
    // 测试学科和年级提取
    const testCases = [
      {
        filename: "三年级数学上册.pdf",
        expectedSubject: "数学",
        expectedGrade: "三年级",
      },
      {
        filename: "高二物理实验.pdf",
        expectedSubject: "物理",
        expectedGrade: "高二",
      },
      {
        filename: "初中语文阅读.pdf",
        expectedSubject: "语文",
        expectedGrade: "未知",
      },
      {
        filename: "小学英语口语.pdf",
        expectedSubject: "英语",
        expectedGrade: "未知",
      },
    ];

    const results = [];

    for (const testCase of testCases) {
      const subject = textProcessor.extractSubject(testCase.filename);
      const grade = textProcessor.extractGrade(testCase.filename);

      results.push({
        filename: testCase.filename,
        extractedSubject: subject,
        extractedGrade: grade,
        subjectMatch: subject === testCase.expectedSubject,
        gradeMatch: grade === testCase.expectedGrade,
      });
    }

    const successRate =
      results.filter((r) => r.subjectMatch && r.gradeMatch).length /
      results.length;

    return {
      testCases: results.length,
      successRate: (successRate * 100).toFixed(1) + "%",
      results,
    };
  }

  async testQualityScoring() {
    // 测试质量评分
    const testTexts = [
      {
        text: "教学目标：学生能够理解加法的概念。教学重点：加法运算。教学难点：进位加法。",
        expectedRange: [2, 4],
      },
      {
        text: "一、教学目标\n1. 知识目标：掌握分数的基本概念\n2. 能力目标：培养学生的数学思维\n二、教学重点\n分数的意义和性质\n三、教学难点\n分数的大小比较\n四、教学过程\n（一）导入新课\n（二）新课讲解\n（三）练习巩固\n（四）课堂小结\n五、课后作业\n完成课后练习题\n六、教学反思\n本节课学生掌握情况良好",
        expectedRange: [4, 5],
      },
      {
        text: "测试",
        expectedRange: [0, 1],
      },
    ];

    const results = [];

    for (const testCase of testTexts) {
      const score = textProcessor.calculateQualityScore(testCase.text);
      const inRange =
        score >= testCase.expectedRange[0] &&
        score <= testCase.expectedRange[1];

      results.push({
        textLength: testCase.text.length,
        score,
        expectedRange: testCase.expectedRange,
        inRange,
      });
    }

    const accuracy = results.filter((r) => r.inRange).length / results.length;

    return {
      testCases: results.length,
      accuracy: (accuracy * 100).toFixed(1) + "%",
      results,
    };
  }

  printSummary() {
    console.log("\n📊 基础功能测试结果总结");
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

    console.log("\n💡 建议:");
    if (passed === total) {
      console.log("  - 所有基础功能测试通过，可以继续进行向量数据库测试");
      console.log("  - 启动Docker并运行Chroma服务进行完整测试");
    } else {
      console.log("  - 修复失败的基础功能测试");
      console.log("  - 检查配置文件和依赖项");
    }

    console.log("\n");
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const basicTest = new BasicFunctionalityTest();

  basicTest
    .runAllTests()
    .then((results) => {
      console.log("\n✅ 基础功能测试完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 基础功能测试失败:", error.message);
      process.exit(1);
    });
}

module.exports = BasicFunctionalityTest;
