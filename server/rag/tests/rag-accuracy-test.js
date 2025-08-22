/**
 * RAG系统准确性和合理性测试
 * 专门测试RAG检索结果与用户输入的匹配度
 */

const VectorStoreService = require("../services/vector-store");
const logger = require("../../utils/logger");

class RAGAccuracyTest {
  constructor() {
    this.vectorStore = new VectorStoreService();
    this.testResults = [];
    this.testCases = this.generateTestCases();
  }

  /**
   * 生成综合测试用例
   */
  generateTestCases() {
    return [
      // 1. 精确匹配测试 - 学科、年级、课题完全对应
      {
        category: "精确匹配",
        subject: "数学",
        grade: "三年级",
        topic: "加法运算",
        expectedSubjects: ["数学"],
        expectedGrades: ["三年级", "二年级", "四年级"], // 允许相邻年级
        minRelevanceScore: 0.6,
        description: "测试精确的学科和年级匹配"
      },
      {
        category: "精确匹配",
        subject: "语文",
        grade: "五年级",
        topic: "古诗词鉴赏",
        expectedSubjects: ["语文"],
        expectedGrades: ["五年级", "四年级", "六年级"],
        minRelevanceScore: 0.6,
        description: "测试语文学科的课题匹配"
      },

      // 2. 学科匹配测试
      {
        category: "学科匹配",
        subject: "物理",
        grade: "八年级",
        topic: "力的作用",
        expectedSubjects: ["物理"],
        expectedGrades: ["八年级", "七年级", "九年级"],
        minRelevanceScore: 0.5,
        description: "测试物理学科的专业术语匹配"
      },
      {
        category: "学科匹配",
        subject: "生物",
        grade: "七年级",
        topic: "藻类植物",
        expectedSubjects: ["生物"],
        expectedGrades: ["七年级", "六年级", "八年级"],
        minRelevanceScore: 0.5,
        description: "测试生物学科特定内容匹配"
      },

      // 3. 年级兼容性测试
      {
        category: "年级兼容性",
        subject: "数学",
        grade: "一年级",
        topic: "数字认识",
        expectedSubjects: ["数学"],
        expectedGrades: ["一年级", "二年级"], // 低年级内容
        minRelevanceScore: 0.4,
        description: "测试低年级内容的年级匹配"
      },
      {
        category: "年级兼容性",
        subject: "英语",
        grade: "九年级",
        topic: "语法结构",
        expectedSubjects: ["英语"],
        expectedGrades: ["九年级", "八年级"], // 高年级内容
        minRelevanceScore: 0.4,
        description: "测试高年级内容的年级匹配"
      },

      // 4. 跨学科内容测试
      {
        category: "跨学科内容",
        subject: "科学",
        grade: "六年级",
        topic: "环境保护",
        expectedSubjects: ["生物", "地理", "化学", "科学"],
        expectedGrades: ["六年级", "五年级", "七年级"],
        minRelevanceScore: 0.3,
        description: "测试跨学科主题的匹配"
      },

      // 5. 边界情况测试
      {
        category: "边界情况",
        subject: "音乐",
        grade: "四年级",
        topic: "节拍练习",
        expectedSubjects: ["音乐"],
        expectedGrades: ["四年级", "三年级", "五年级"],
        minRelevanceScore: 0.2,
        description: "测试非主科内容的匹配"
      },
      {
        category: "边界情况",
        subject: "美术",
        grade: "二年级",
        topic: "色彩搭配",
        expectedSubjects: ["美术"],
        expectedGrades: ["二年级", "一年级", "三年级"],
        minRelevanceScore: 0.2,
        description: "测试艺术类学科的匹配"
      },

      // 6. 模糊查询测试
      {
        category: "模糊查询",
        subject: "语文",
        grade: "三年级",
        topic: "写作技巧",
        expectedSubjects: ["语文"],
        expectedGrades: ["三年级", "二年级", "四年级"],
        minRelevanceScore: 0.3,
        description: "测试模糊主题的匹配能力"
      },

      // 7. 不匹配内容测试（负面测试）
      {
        category: "不匹配内容",
        subject: "数学",
        grade: "一年级",
        topic: "微积分原理", // 明显超出年级范围
        expectedSubjects: ["数学"],
        expectedGrades: [], // 不应该匹配任何低年级内容
        minRelevanceScore: 0.1,
        description: "测试超出年级范围内容的过滤",
        shouldFail: true
      },

      // 8. 无关内容测试
      {
        category: "无关内容",
        subject: "体育",
        grade: "五年级",
        topic: "量子物理", // 完全不相关
        expectedSubjects: ["体育"],
        expectedGrades: [],
        minRelevanceScore: 0.1,
        description: "测试完全无关内容的过滤",
        shouldFail: true
      }
    ];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log("🧪 开始RAG准确性和合理性测试...\n");

    try {
      // 初始化向量存储
      await this.vectorStore.initialize();
      console.log("✅ 向量存储初始化成功\n");

      // 按分类运行测试
      const categories = [...new Set(this.testCases.map(tc => tc.category))];
      
      for (const category of categories) {
        console.log(`\n${"=".repeat(50)}`);
        console.log(`📋 测试分类: ${category}`);
        console.log("=".repeat(50));

        const categoryTests = this.testCases.filter(tc => tc.category === category);
        
        for (const testCase of categoryTests) {
          await this.runSingleTest(testCase);
        }
      }

      // 生成综合报告
      this.generateAccuracyReport();

      return this.testResults;
    } catch (error) {
      console.error("❌ RAG准确性测试失败:", error);
      throw error;
    }
  }

  /**
   * 运行单个测试用例
   */
  async runSingleTest(testCase) {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 测试: ${testCase.description}`);
      console.log(`   学科: ${testCase.subject} | 年级: ${testCase.grade} | 课题: ${testCase.topic}`);

      // 调用RAG检索
      const contextResult = await this.vectorStore.getRelevantContext(
        testCase.topic,
        testCase.subject,
        testCase.grade,
        1500
      );

      // 分析检索结果
      const analysis = this.analyzeResults(testCase, contextResult);
      
      const duration = Date.now() - startTime;
      
      const result = {
        testCase,
        contextResult,
        analysis,
        duration,
        timestamp: new Date().toISOString()
      };

      this.testResults.push(result);

      // 输出测试结果
      this.printTestResult(result);

    } catch (error) {
      console.error(`❌ 测试失败: ${error.message}`);
      
      this.testResults.push({
        testCase,
        error: error.message,
        success: false,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 分析检索结果的准确性
   */
  analyzeResults(testCase, contextResult) {
    // 确保averageRelevance是数字类型
    const relevance = contextResult.averageRelevance;
    const avgRelevance = typeof relevance === 'string' ? parseFloat(relevance) : (relevance || 0);
    
    const analysis = {
      totalResults: contextResult.totalResults || 0,
      usedResults: contextResult.usedResults || 0,
      averageRelevance: avgRelevance,
      subjectMatch: { correct: 0, total: 0, accuracy: 0 },
      gradeMatch: { correct: 0, total: 0, accuracy: 0 },
      relevanceScore: { above_threshold: 0, total: 0, accuracy: 0 },
      topSources: [],
      issues: []
    };

    if (!contextResult.sources || contextResult.sources.length === 0) {
      analysis.issues.push("没有找到任何参考资料");
      return { ...analysis, success: false };
    }

    // 分析来源文件的学科匹配
    contextResult.sources.forEach(source => {
      analysis.subjectMatch.total++;
      
      // 检查文件名是否包含期望的学科
      const hasExpectedSubject = testCase.expectedSubjects.some(subject => 
        source.toLowerCase().includes(subject.toLowerCase())
      );
      
      if (hasExpectedSubject) {
        analysis.subjectMatch.correct++;
      }

      // 检查年级匹配
      analysis.gradeMatch.total++;
      const hasExpectedGrade = testCase.expectedGrades.some(grade => 
        source.includes(grade)
      );
      
      if (hasExpectedGrade) {
        analysis.gradeMatch.correct++;
      }

      // 记录前5个来源用于分析
      if (analysis.topSources.length < 5) {
        analysis.topSources.push({
          source,
          subjectMatch: hasExpectedSubject,
          gradeMatch: hasExpectedGrade
        });
      }
    });

    // 计算准确率
    analysis.subjectMatch.accuracy = analysis.subjectMatch.total > 0 
      ? (analysis.subjectMatch.correct / analysis.subjectMatch.total) 
      : 0;
    
    analysis.gradeMatch.accuracy = analysis.gradeMatch.total > 0 
      ? (analysis.gradeMatch.correct / analysis.gradeMatch.total) 
      : 0;

    // 检查相关性分数
    if (analysis.averageRelevance >= testCase.minRelevanceScore) {
      analysis.relevanceScore.above_threshold = 1;
    }
    analysis.relevanceScore.total = 1;
    analysis.relevanceScore.accuracy = analysis.relevanceScore.above_threshold;

    // 检测问题
    if (analysis.subjectMatch.accuracy < 0.5) {
      analysis.issues.push(`学科匹配度过低: ${(analysis.subjectMatch.accuracy * 100).toFixed(1)}%`);
    }
    
    if (analysis.gradeMatch.accuracy < 0.3 && !testCase.shouldFail) {
      analysis.issues.push(`年级匹配度过低: ${(analysis.gradeMatch.accuracy * 100).toFixed(1)}%`);
    }
    
    if (contextResult.averageRelevance < testCase.minRelevanceScore && !testCase.shouldFail) {
      analysis.issues.push(`相关性分数过低: ${contextResult.averageRelevance.toFixed(3)} < ${testCase.minRelevanceScore}`);
    }

    // 判断测试是否成功
    const expectedToFail = testCase.shouldFail || false;
    const actuallyFailed = analysis.issues.length > 0;
    
    analysis.success = expectedToFail ? actuallyFailed : !actuallyFailed;

    return analysis;
  }

  /**
   * 输出单个测试结果
   */
  printTestResult(result) {
    const { testCase, analysis } = result;
    
    if (analysis.success) {
      console.log("   ✅ 测试通过");
    } else {
      console.log("   ❌ 测试失败");
    }

    console.log(`   📊 结果数量: ${analysis.totalResults} (使用: ${analysis.usedResults})`);
    console.log(`   🎯 学科匹配: ${(analysis.subjectMatch.accuracy * 100).toFixed(1)}% (${analysis.subjectMatch.correct}/${analysis.subjectMatch.total})`);
    console.log(`   📚 年级匹配: ${(analysis.gradeMatch.accuracy * 100).toFixed(1)}% (${analysis.gradeMatch.correct}/${analysis.gradeMatch.total})`);
    console.log(`   ⭐ 平均相关性: ${typeof analysis.averageRelevance === 'number' ? analysis.averageRelevance.toFixed(3) : '0.000'}`);

    if (analysis.topSources.length > 0) {
      console.log("   📋 主要来源:");
      analysis.topSources.slice(0, 3).forEach((source, index) => {
        const subjectIcon = source.subjectMatch ? "✅" : "❌";
        const gradeIcon = source.gradeMatch ? "✅" : "❌";
        console.log(`     ${index + 1}. ${subjectIcon}${gradeIcon} ${source.source}`);
      });
    }

    if (analysis.issues.length > 0) {
      console.log("   ⚠️  发现问题:");
      analysis.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
  }

  /**
   * 生成综合准确性报告
   */
  generateAccuracyReport() {
    console.log("\n" + "=".repeat(80));
    console.log("📊 RAG系统准确性和合理性测试报告");
    console.log("=".repeat(80));

    const successfulTests = this.testResults.filter(r => r.analysis?.success);
    const failedTests = this.testResults.filter(r => !r.analysis?.success);
    const totalTests = this.testResults.length;

    console.log(`\n📈 总体统计:`);
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过测试: ${successfulTests.length}`);
    console.log(`   失败测试: ${failedTests.length}`);
    console.log(`   总体准确率: ${((successfulTests.length / totalTests) * 100).toFixed(1)}%`);

    // 按分类统计
    console.log(`\n📊 分类统计:`);
    const categories = [...new Set(this.testCases.map(tc => tc.category))];
    
    categories.forEach(category => {
      const categoryResults = this.testResults.filter(r => r.testCase?.category === category);
      const categorySuccess = categoryResults.filter(r => r.analysis?.success).length;
      const categoryTotal = categoryResults.length;
      const categoryAccuracy = categoryTotal > 0 ? (categorySuccess / categoryTotal * 100).toFixed(1) : '0';
      
      console.log(`   ${category}: ${categorySuccess}/${categoryTotal} (${categoryAccuracy}%)`);
    });

    // 学科匹配统计
    const allResults = this.testResults.filter(r => r.analysis);
    if (allResults.length > 0) {
      const avgSubjectAccuracy = allResults.reduce((sum, r) => 
        sum + (r.analysis.subjectMatch?.accuracy || 0), 0) / allResults.length;
      const avgGradeAccuracy = allResults.reduce((sum, r) => 
        sum + (r.analysis.gradeMatch?.accuracy || 0), 0) / allResults.length;
      const avgRelevance = allResults.reduce((sum, r) => {
        const relevance = r.analysis.averageRelevance;
        const numRelevance = typeof relevance === 'string' ? parseFloat(relevance) : (relevance || 0);
        return sum + numRelevance;
      }, 0) / allResults.length;

      console.log(`\n🎯 匹配质量统计:`);
      console.log(`   平均学科匹配度: ${(avgSubjectAccuracy * 100).toFixed(1)}%`);
      console.log(`   平均年级匹配度: ${(avgGradeAccuracy * 100).toFixed(1)}%`);
      console.log(`   平均相关性分数: ${avgRelevance.toFixed(3)}`);
    }

    // 问题汇总
    const allIssues = [];
    this.testResults.forEach(result => {
      if (result.analysis?.issues) {
        allIssues.push(...result.analysis.issues);
      }
    });

    if (allIssues.length > 0) {
      console.log(`\n⚠️  主要问题汇总:`);
      const issueFreq = {};
      allIssues.forEach(issue => {
        const key = issue.split(':')[0]; // 提取问题类型
        issueFreq[key] = (issueFreq[key] || 0) + 1;
      });

      Object.entries(issueFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([issue, count]) => {
          console.log(`   - ${issue}: ${count} 次`);
        });
    }

    // 改进建议
    console.log(`\n💡 改进建议:`);
    
    const subjectIssues = failedTests.filter(r => 
      r.analysis?.subjectMatch?.accuracy < 0.5).length;
    const gradeIssues = failedTests.filter(r => 
      r.analysis?.gradeMatch?.accuracy < 0.3).length;
    const relevanceIssues = failedTests.filter(r => 
      r.analysis?.averageRelevance < 0.3).length;

    if (subjectIssues > 0) {
      console.log(`   - 优化学科识别算法 (${subjectIssues} 个测试失败)`);
    }
    if (gradeIssues > 0) {
      console.log(`   - 改进年级匹配策略 (${gradeIssues} 个测试失败)`);
    }
    if (relevanceIssues > 0) {
      console.log(`   - 提升内容相关性算法 (${relevanceIssues} 个测试失败)`);
    }

    console.log(`   - 增加更多高质量的教学资料`);
    console.log(`   - 优化向量嵌入模型`);
    console.log(`   - 调整搜索权重和阈值`);

    console.log("\n" + "=".repeat(80));
  }

  /**
   * 运行特定学科的深度测试
   */
  async runSubjectDeepTest(subject) {
    console.log(`\n🔬 ${subject}学科深度测试`);
    
    const grades = ["一年级", "三年级", "五年级", "七年级", "九年级"];
    const topics = this.getSubjectTopics(subject);
    
    for (const grade of grades) {
      for (const topic of topics) {
        const testCase = {
          category: "深度测试",
          subject,
          grade,
          topic,
          expectedSubjects: [subject],
          expectedGrades: [grade],
          minRelevanceScore: 0.3,
          description: `${subject}-${grade}-${topic}`
        };
        
        await this.runSingleTest(testCase);
      }
    }
  }

  /**
   * 获取学科特定的测试主题
   */
  getSubjectTopics(subject) {
    const topics = {
      "数学": ["加法运算", "几何图形", "分数概念", "方程求解"],
      "语文": ["拼音学习", "汉字书写", "阅读理解", "作文写作"],
      "英语": ["字母学习", "单词记忆", "语法结构", "口语对话"],
      "物理": ["力的作用", "光的传播", "电磁现象", "运动规律"],
      "化学": ["物质性质", "化学反应", "实验操作", "分子结构"],
      "生物": ["动物分类", "植物生长", "人体结构", "生态环境"]
    };
    
    return topics[subject] || ["基础概念", "实践应用"];
  }
}

module.exports = RAGAccuracyTest;

// 如果直接运行此文件
if (require.main === module) {
  const test = new RAGAccuracyTest();
  test.runAllTests()
    .then(results => {
      console.log("\n🎉 测试完成!");
      process.exit(0);
    })
    .catch(error => {
      console.error("测试失败:", error);
      process.exit(1);
    });
} 