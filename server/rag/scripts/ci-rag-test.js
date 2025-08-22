#!/usr/bin/env node

/**
 * CI/CD集成的RAG测试脚本
 * 适用于自动化流程，返回明确的退出代码
 */

const RAGAccuracyTest = require("../tests/rag-accuracy-test");
const logger = require("../../utils/logger");

class CIRAGTest {
  constructor() {
    this.test = new RAGAccuracyTest();
    this.config = {
      // CI环境的阈值要求（可以比开发环境宽松一些）
      minSuccessRate: 70, // 最低70%通过率
      minSubjectAccuracy: 60, // 最低60%学科匹配度
      minGradeAccuracy: 40, // 最低40%年级匹配度
      minAvgRelevance: 0.3, // 最低平均相关性
      
      // 核心测试用例（CI环境只运行关键测试）
      coreCategories: ["精确匹配", "学科匹配", "年级兼容性"],
      
      // 必须通过的关键测试（这些失败会导致构建失败）
      criticalTests: [
        { subject: "数学", grade: "三年级", topic: "加法运算" },
        { subject: "语文", grade: "五年级", topic: "古诗词鉴赏" },
        { subject: "生物", grade: "七年级", topic: "藻类植物" } // 用户关心的问题
      ]
    };
  }

  async runCITest() {
    console.log("🚀 CI/CD RAG测试开始...");
    console.log(`⚡ 运行模式: 快速核心测试`);
    console.log(`📊 成功率要求: ${this.config.minSuccessRate}%`);
    console.log();

    try {
      // 1. 过滤出核心测试用例
      this.test.testCases = this.test.testCases.filter(tc => 
        this.config.coreCategories.includes(tc.category)
      );

      console.log(`📋 将运行 ${this.test.testCases.length} 个核心测试用例`);

      // 2. 运行测试
      const results = await this.test.runAllTests();

      // 3. 分析结果
      const analysis = this.analyzeResults(results);

      // 4. 输出CI友好的结果
      this.outputCIResults(analysis);

      // 5. 检查关键测试
      const criticalResults = this.checkCriticalTests(results);

      // 6. 决定构建状态
      const buildShouldPass = this.shouldBuildPass(analysis, criticalResults);

      if (buildShouldPass) {
        console.log("\n✅ RAG测试通过 - 构建可以继续");
        process.exit(0);
      } else {
        console.log("\n❌ RAG测试失败 - 构建应该停止");
        this.outputFailureDetails(analysis, criticalResults);
        process.exit(1);
      }

    } catch (error) {
      console.error("💥 RAG测试执行失败:", error.message);
      console.log("\n❌ 测试执行错误 - 构建应该停止");
      process.exit(1);
    }
  }

  /**
   * 分析测试结果
   */
  analyzeResults(results) {
    const total = results.length;
    const successful = results.filter(r => r.analysis?.success).length;
    const successRate = total > 0 ? (successful / total * 100) : 0;

    // 计算质量指标
    const validResults = results.filter(r => r.analysis);
    const avgSubjectAccuracy = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.analysis.subjectMatch?.accuracy || 0), 0) / validResults.length * 100
      : 0;
    const avgGradeAccuracy = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.analysis.gradeMatch?.accuracy || 0), 0) / validResults.length * 100
      : 0;
    const avgRelevance = validResults.length > 0
      ? validResults.reduce((sum, r) => {
          const relevance = r.analysis.averageRelevance;
          const numRelevance = typeof relevance === 'string' ? parseFloat(relevance) : (relevance || 0);
          return sum + numRelevance;
        }, 0) / validResults.length
      : 0;

    return {
      total,
      successful,
      failed: total - successful,
      successRate,
      avgSubjectAccuracy,
      avgGradeAccuracy,
      avgRelevance,
      results
    };
  }

  /**
   * 检查关键测试用例
   */
  checkCriticalTests(results) {
    const criticalResults = [];

    for (const criticalTest of this.config.criticalTests) {
      const result = results.find(r => 
        r.testCase?.subject === criticalTest.subject &&
        r.testCase?.grade === criticalTest.grade &&
        r.testCase?.topic === criticalTest.topic
      );

      criticalResults.push({
        test: criticalTest,
        result,
        passed: result?.analysis?.success || false
      });
    }

    return criticalResults;
  }

  /**
   * 判断构建是否应该通过
   */
  shouldBuildPass(analysis, criticalResults) {
    // 1. 检查总体成功率
    if (analysis.successRate < this.config.minSuccessRate) {
      return false;
    }

    // 2. 检查质量指标
    if (analysis.avgSubjectAccuracy < this.config.minSubjectAccuracy) {
      return false;
    }

    if (analysis.avgGradeAccuracy < this.config.minGradeAccuracy) {
      return false;
    }

    if (analysis.avgRelevance < this.config.minAvgRelevance) {
      return false;
    }

    // 3. 检查关键测试（所有关键测试都必须通过）
    const criticalFailures = criticalResults.filter(cr => !cr.passed);
    if (criticalFailures.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * 输出CI友好的结果
   */
  outputCIResults(analysis) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 CI/CD RAG测试结果汇总");
    console.log("=".repeat(60));

    // 使用CI友好的格式
    console.log(`总体成功率: ${analysis.successRate.toFixed(1)}% (${analysis.successful}/${analysis.total})`);
    console.log(`学科匹配度: ${analysis.avgSubjectAccuracy.toFixed(1)}%`);
    console.log(`年级匹配度: ${analysis.avgGradeAccuracy.toFixed(1)}%`);
    console.log(`平均相关性: ${analysis.avgRelevance.toFixed(3)}`);

    // 状态指示器
    const indicators = [
      { name: "成功率", value: analysis.successRate, threshold: this.config.minSuccessRate },
      { name: "学科匹配", value: analysis.avgSubjectAccuracy, threshold: this.config.minSubjectAccuracy },
      { name: "年级匹配", value: analysis.avgGradeAccuracy, threshold: this.config.minGradeAccuracy },
      { name: "相关性", value: analysis.avgRelevance * 100, threshold: this.config.minAvgRelevance * 100 }
    ];

    console.log("\n📈 质量指标状态:");
    indicators.forEach(indicator => {
      const status = indicator.value >= indicator.threshold ? "✅" : "❌";
      console.log(`${status} ${indicator.name}: ${indicator.value.toFixed(1)}% (要求: ≥${indicator.threshold}%)`);
    });
  }

  /**
   * 输出失败详情
   */
  outputFailureDetails(analysis, criticalResults) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ 构建失败原因分析");
    console.log("=".repeat(60));

    // 质量指标失败
    if (analysis.successRate < this.config.minSuccessRate) {
      console.log(`💔 总体成功率过低: ${analysis.successRate.toFixed(1)}% < ${this.config.minSuccessRate}%`);
    }

    if (analysis.avgSubjectAccuracy < this.config.minSubjectAccuracy) {
      console.log(`📚 学科匹配度过低: ${analysis.avgSubjectAccuracy.toFixed(1)}% < ${this.config.minSubjectAccuracy}%`);
    }

    if (analysis.avgGradeAccuracy < this.config.minGradeAccuracy) {
      console.log(`🎓 年级匹配度过低: ${analysis.avgGradeAccuracy.toFixed(1)}% < ${this.config.minGradeAccuracy}%`);
    }

    if (analysis.avgRelevance < this.config.minAvgRelevance) {
      console.log(`⭐ 平均相关性过低: ${analysis.avgRelevance.toFixed(3)} < ${this.config.minAvgRelevance}`);
    }

    // 关键测试失败
    const criticalFailures = criticalResults.filter(cr => !cr.passed);
    if (criticalFailures.length > 0) {
      console.log(`\n🚨 关键测试失败 (${criticalFailures.length}个):`);
      criticalFailures.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure.test.subject} - ${failure.test.grade} - ${failure.test.topic}`);
      });
    }

    // 修复建议
    console.log("\n💡 修复建议:");
    if (analysis.avgSubjectAccuracy < this.config.minSubjectAccuracy) {
      console.log("  - 检查学科识别算法");
      console.log("  - 确保教学资料文件名包含学科信息");
    }
    if (analysis.avgGradeAccuracy < this.config.minGradeAccuracy) {
      console.log("  - 优化年级匹配策略");
      console.log("  - 检查年级标准化映射");
    }
    if (analysis.avgRelevance < this.config.minAvgRelevance) {
      console.log("  - 优化向量嵌入模型");
      console.log("  - 调整搜索权重和阈值");
    }
    console.log("  - 增加更多高质量的教学资料");
    console.log("  - 运行完整测试查看详细分析: npm run test:rag-accuracy");
  }

  /**
   * 显示使用说明
   */
  static showUsage() {
    console.log(`
CI/CD RAG测试工具

这是专为持续集成环境设计的RAG测试脚本。

特点:
- 只运行核心测试用例，速度快
- 明确的成功/失败退出代码
- CI友好的输出格式
- 可配置的质量阈值

退出代码:
- 0: 测试通过，构建可以继续
- 1: 测试失败，构建应该停止

在CI/CD中使用:
  node rag/scripts/ci-rag-test.js

手动使用:
  npm run test:rag-ci

配置位置:
  编辑此文件中的 this.config 对象
    `);
  }
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  CIRAGTest.showUsage();
  process.exit(0);
}

// 运行CI测试
const ciTest = new CIRAGTest();
ciTest.runCITest(); 