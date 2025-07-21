#!/usr/bin/env node

/**
 * RAG准确性测试运行脚本
 * 使用方法：
 * - npm run test:rag-accuracy       // 运行完整测试
 * - npm run test:rag-accuracy math  // 运行数学学科深度测试
 */

const RAGAccuracyTest = require("../tests/rag-accuracy-test");
const logger = require("../../utils/logger");
const fs = require("fs");
const path = require("path");

class RAGAccuracyTestRunner {
  constructor() {
    this.test = new RAGAccuracyTest();
    this.outputDir = path.join(__dirname, "../test-results");
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const param = args[1];

    try {
      // 确保输出目录存在
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      let results;

      switch (command) {
        case "subject":
          if (!param) {
            console.error("请指定学科名称，例如：node run-accuracy-test.js subject 数学");
            process.exit(1);
          }
          results = await this.runSubjectTest(param);
          break;
        
        case "quick":
          results = await this.runQuickTest();
          break;
        
        case "full":
        default:
          results = await this.runFullTest();
          break;
      }

      // 保存测试结果
      await this.saveResults(results, command, param);
      
      console.log("\n🎉 RAG准确性测试完成!");
      console.log(`📄 详细结果已保存到: ${this.outputDir}`);
      
      process.exit(0);

    } catch (error) {
      console.error("❌ 测试运行失败:", error);
      logger.error("RAG准确性测试失败:", error);
      process.exit(1);
    }
  }

  /**
   * 运行完整测试
   */
  async runFullTest() {
    console.log("🚀 启动完整RAG准确性测试...");
    console.log("这将测试所有学科、年级和边界情况的匹配准确性\n");
    
    const results = await this.test.runAllTests();
    return { type: "full", results };
  }

  /**
   * 运行快速测试（仅核心测试用例）
   */
  async runQuickTest() {
    console.log("⚡ 启动快速RAG准确性测试...");
    console.log("仅运行核心测试用例以快速验证系统状态\n");

    // 筛选出核心测试用例
    const coreCategories = ["精确匹配", "学科匹配"];
    this.test.testCases = this.test.testCases.filter(tc => 
      coreCategories.includes(tc.category)
    );

    const results = await this.test.runAllTests();
    return { type: "quick", results };
  }

  /**
   * 运行特定学科的深度测试
   */
  async runSubjectTest(subject) {
    console.log(`🔬 启动${subject}学科深度测试...`);
    console.log(`将测试${subject}学科在不同年级和课题下的匹配准确性\n`);

    // 先运行常规测试中与该学科相关的用例
    const subjectTestCases = this.test.testCases.filter(tc => 
      tc.subject === subject
    );

    if (subjectTestCases.length === 0) {
      console.log(`⚠️  没有找到${subject}学科的预定义测试用例，将运行深度测试`);
    } else {
      console.log(`📋 找到${subjectTestCases.length}个${subject}学科的预定义测试用例`);
      this.test.testCases = subjectTestCases;
      await this.test.runAllTests();
    }

    // 运行深度测试
    await this.test.runSubjectDeepTest(subject);

    return { type: "subject", subject, results: this.test.testResults };
  }

  /**
   * 保存测试结果到文件
   */
  async saveResults(testData, command, param) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `rag-accuracy-${command}${param ? `-${param}` : ""}-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);

    const reportData = {
      testInfo: {
        timestamp: new Date().toISOString(),
        command,
        parameter: param,
        type: testData.type
      },
      summary: this.generateSummary(testData.results),
      detailedResults: testData.results
    };

    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));

    // 同时保存一个易读的文本报告
    const textReport = this.generateTextReport(reportData);
    const textFilepath = filepath.replace('.json', '.txt');
    fs.writeFileSync(textFilepath, textReport);

    return { jsonFile: filepath, textFile: textFilepath };
  }

  /**
   * 生成测试摘要
   */
  generateSummary(results) {
    if (!Array.isArray(results)) return null;

    const total = results.length;
    const successful = results.filter(r => r.analysis?.success).length;
    const failed = total - successful;

    const categories = {};
    results.forEach(result => {
      const category = result.testCase?.category || 'unknown';
      if (!categories[category]) {
        categories[category] = { total: 0, success: 0 };
      }
      categories[category].total++;
      if (result.analysis?.success) {
        categories[category].success++;
      }
    });

    // 计算平均准确率
    const validResults = results.filter(r => r.analysis);
    const avgSubjectAccuracy = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.analysis.subjectMatch?.accuracy || 0), 0) / validResults.length
      : 0;
    const avgGradeAccuracy = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.analysis.gradeMatch?.accuracy || 0), 0) / validResults.length 
      : 0;
    const avgRelevance = validResults.length > 0
      ? validResults.reduce((sum, r) => sum + (r.analysis.averageRelevance || 0), 0) / validResults.length
      : 0;

    return {
      overview: {
        total,
        successful,
        failed,
        successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%'
      },
      categories,
      quality: {
        avgSubjectAccuracy: (avgSubjectAccuracy * 100).toFixed(1) + '%',
        avgGradeAccuracy: (avgGradeAccuracy * 100).toFixed(1) + '%',
        avgRelevance: avgRelevance.toFixed(3)
      }
    };
  }

  /**
   * 生成文本格式的报告
   */
  generateTextReport(reportData) {
    const { testInfo, summary, detailedResults } = reportData;
    
    let report = `RAG系统准确性测试报告
${"=".repeat(50)}

测试信息:
- 时间: ${testInfo.timestamp}
- 类型: ${testInfo.type}
- 命令: ${testInfo.command}
${testInfo.parameter ? `- 参数: ${testInfo.parameter}` : ''}

总体结果:
- 总测试数: ${summary.overview.total}
- 成功: ${summary.overview.successful}
- 失败: ${summary.overview.failed}
- 成功率: ${summary.overview.successRate}

质量指标:
- 平均学科匹配度: ${summary.quality.avgSubjectAccuracy}
- 平均年级匹配度: ${summary.quality.avgGradeAccuracy}
- 平均相关性分数: ${summary.quality.avgRelevance}

分类统计:
`;

    Object.entries(summary.categories).forEach(([category, stats]) => {
      const accuracy = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(1) : '0';
      report += `- ${category}: ${stats.success}/${stats.total} (${accuracy}%)\n`;
    });

    report += `\n详细问题分析:\n`;
    
    const failedTests = detailedResults.filter(r => !r.analysis?.success);
    if (failedTests.length > 0) {
      failedTests.forEach((test, index) => {
        report += `\n${index + 1}. ${test.testCase?.description || 'Unknown'}\n`;
        report += `   学科: ${test.testCase?.subject} | 年级: ${test.testCase?.grade} | 课题: ${test.testCase?.topic}\n`;
        if (test.analysis?.issues) {
          test.analysis.issues.forEach(issue => {
            report += `   问题: ${issue}\n`;
          });
        }
      });
    } else {
      report += "所有测试都通过了！\n";
    }

    return report;
  }

  /**
   * 显示使用帮助
   */
  static showHelp() {
    console.log(`
RAG准确性测试工具

使用方法:
  node run-accuracy-test.js [command] [options]

命令:
  full                运行完整测试套件 (默认)
  quick              运行快速测试 (仅核心用例)
  subject <学科名>    运行特定学科的深度测试

示例:
  node run-accuracy-test.js                # 完整测试
  node run-accuracy-test.js quick          # 快速测试
  node run-accuracy-test.js subject 数学   # 数学学科深度测试
  node run-accuracy-test.js subject 语文   # 语文学科深度测试

测试结果将保存到: server/rag/test-results/
    `);
  }
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  RAGAccuracyTestRunner.showHelp();
  process.exit(0);
}

// 运行测试
const runner = new RAGAccuracyTestRunner();
runner.run(); 