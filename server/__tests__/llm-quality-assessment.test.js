/**
 * LLM Quality Assessment Test Suite  
 * Implements LLM-as-a-Judge framework for automated quality evaluation
 * Based on 2024 best practices for LLM evaluation
 */

const AIService = require("../ai-service");

// Mock dependencies
jest.mock("../rag/services/vector-store");
jest.mock("openai");

describe("LLM Quality Assessment", () => {
  let aiService;
  let judgeAI; // Separate AI instance for evaluation
  let mockResponse;

  beforeEach(() => {
    process.env.DASHSCOPE_API_KEY = "test-api-key";
    process.env.AI_ENABLED = "true";

    mockResponse = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    aiService = new AIService();
    judgeAI = new AIService(); // Judge AI for evaluation
  });

  afterEach(() => {
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.AI_ENABLED;
    jest.clearAllMocks();
  });

  describe("LLM-as-a-Judge Framework", () => {
    test("should evaluate lesson plan correctness", async () => {
      const lessonPlan = `
        # 小数加法教案
        
        **年级**: 三年级  **科目**: 数学  **课时**: 45分钟
        
        ## 教学目标
        1. 理解小数的概念
        2. 掌握小数加法的计算方法
        3. 能够进行小数点对齐
        
        ## 教学重点
        - 小数点对齐是关键步骤
        - 从右往左逐位相加
        
        ## 教学过程
        1. 导入：复习整数加法 (5分钟)
        2. 新课：小数加法演示 (25分钟)
        3. 练习：学生独立计算 (10分钟)
        4. 总结：归纳小数加法要点 (5分钟)
        
        ## 例题
        计算：1.2 + 0.5 = 1.7
      `;

      // Mock judge AI response
      judgeAI.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    correctness: 8,
                    comprehensiveness: 7,
                    readability: 9,
                    reasoning: "教案结构完整，内容准确，适合三年级学生。例题计算正确。时间分配合理。",
                    overall_score: 8.0
                  })
                }
              }]
            })
          }
        }
      };

      const evaluation = await evaluateWithJudge(judgeAI, lessonPlan, "lesson_plan");
      const result = JSON.parse(evaluation);

      expect(result.correctness).toBeGreaterThanOrEqual(7);
      expect(result.comprehensiveness).toBeGreaterThanOrEqual(6);
      expect(result.readability).toBeGreaterThanOrEqual(7);
      expect(result.overall_score).toBeGreaterThanOrEqual(7.0);
      expect(result.reasoning).toContain("教案");
    });

    test("should evaluate exercise quality with specific rubric", async () => {
      const exercises = `
        # 小数加法练习题
        
        ## 选择题
        1. 0.3 + 0.4 = ?
           A) 0.7  B) 0.8  C) 0.6  D) 0.5
           答案：A
        
        2. 下面计算正确的是：
           A) 1.2 + 0.5 = 1.8
           B) 1.2 + 0.5 = 1.7  ✓
           C) 1.2 + 0.5 = 1.25
           答案：B
           
        ## 计算题  
        3. 2.4 + 1.3 = ____
           答案：3.7
           
        4. 0.8 + 0.6 = ____  
           答案：1.4
      `;

      judgeAI.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    mathematical_accuracy: 10,
                    difficulty_appropriateness: 8,
                    question_clarity: 9,
                    answer_completeness: 8,
                    reasoning: "所有计算答案正确，难度适合三年级，题目表述清晰。",
                    overall_score: 8.8
                  })
                }
              }]
            })
          }
        }
      };

      const evaluation = await evaluateWithJudge(judgeAI, exercises, "exercises");
      const result = JSON.parse(evaluation);

      expect(result.mathematical_accuracy).toBe(10);
      expect(result.difficulty_appropriateness).toBeGreaterThanOrEqual(7);
      expect(result.question_clarity).toBeGreaterThanOrEqual(8);
      expect(result.overall_score).toBeGreaterThanOrEqual(8.0);
    });

    test("should detect factual errors in generated content", async () => {
      const incorrectContent = `
        # 小数加法教案
        
        小数加法的计算方法：
        1. 小数点不需要对齐，可以随意排列  ❌ 错误
        2. 从左往右进行计算  ❌ 错误  
        3. 0.1 + 0.2 = 0.4  ❌ 错误
        4. 小数只能精确到个位数  ❌ 错误
      `;

      judgeAI.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    factual_accuracy: 2,
                    error_count: 4,
                    error_details: [
                      "小数点必须对齐，不能随意排列",
                      "应该从右往左计算",
                      "0.1 + 0.2 = 0.3，不是0.4",
                      "小数可以精确到任意位数"
                    ],
                    reasoning: "内容包含多个严重的数学错误，不适合教学使用。",
                    overall_score: 2.0,
                    recommendation: "需要完全重写"
                  })
                }
              }]
            })
          }
        }
      };

      const evaluation = await evaluateWithJudge(judgeAI, incorrectContent, "lesson_plan");
      const result = JSON.parse(evaluation);

      expect(result.factual_accuracy).toBeLessThan(5);
      expect(result.error_count).toBeGreaterThan(3);
      expect(result.overall_score).toBeLessThan(3.0);
      expect(result.recommendation).toContain("重写");
    });
  });

  describe("Chain of Thought Evaluation", () => {
    test("should use reasoning before scoring", async () => {
      const content = "计算 1.5 + 2.3 = 3.8 的步骤说明";

      judgeAI.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: `
                    思考过程：
                    1. 检查数学计算：1.5 + 2.3 = 3.8 ✓ 正确
                    2. 检查说明完整性：缺少具体步骤说明 ⚠️
                    3. 检查难度适合性：计算本身适合三年级 ✓
                    4. 检查教学价值：有一定价值但不够详细 ⚠️
                    
                    评分理由：
                    - 数学计算正确 (+3分)
                    - 内容简洁明了 (+2分)  
                    - 缺少详细步骤 (-1分)
                    - 缺少教学指导 (-1分)
                    
                    最终评分：7/10
                  `
                }
              }]
            })
          }
        }
      };

      const reasoning = await evaluateWithReasoning(judgeAI, content);
      
      expect(reasoning).toContain("思考过程");
      expect(reasoning).toContain("评分理由");
      expect(reasoning).toContain("最终评分");
      expect(reasoning).toMatch(/[7-8]\/10/); // Expected score range
    });

    test("should evaluate consistency across multiple attempts", async () => {
      const content = "小数加法基础知识点总结";
      const evaluations = [];

      for (let i = 0; i < 3; i++) {
        judgeAI.openai = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      score: 7.5 + (Math.random() - 0.5) * 0.4, // 7.3-7.7 range
                      reasoning: `评估轮次${i + 1}：内容质量稳定`
                    })
                  }
                }]
              })
            }
          }
        };

        const evaluation = await evaluateWithJudge(judgeAI, content, "summary");
        evaluations.push(JSON.parse(evaluation));
      }

      // Check consistency (scores should be within 0.5 points)
      const scores = evaluations.map(e => e.score);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const consistency = maxScore - minScore;

      expect(consistency).toBeLessThan(0.5); // Good consistency
      expect(scores.every(s => s >= 7.0 && s <= 8.0)).toBe(true);
    });
  });

  describe("Positional Bias Testing", () => {
    test("should avoid position bias in multiple choice evaluation", async () => {
      const questionsWithDifferentAnswerPositions = [
        {
          question: "0.2 + 0.3 = ?",
          options: ["A) 0.5", "B) 0.6", "C) 0.4", "D) 0.7"],
          correct: "A",
          position: 1
        },
        {
          question: "0.4 + 0.5 = ?", 
          options: ["A) 0.8", "B) 0.9", "C) 1.0", "D) 0.7"],
          correct: "B",
          position: 2  
        },
        {
          question: "0.6 + 0.7 = ?",
          options: ["A) 1.2", "B) 1.4", "C) 1.3", "D) 1.1"],
          correct: "C", 
          position: 3
        },
        {
          question: "0.8 + 0.9 = ?",
          options: ["A) 1.6", "B) 1.8", "C) 1.5", "D) 1.7"],
          correct: "D",
          position: 4
        }
      ];

      const evaluationResults = [];

      for (const q of questionsWithDifferentAnswerPositions) {
        judgeAI.openai = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      selected_answer: q.correct,
                      confidence: 0.95,
                      reasoning: `正确答案是${q.correct}，计算验证正确。`
                    })
                  }
                }]
              })
            }
          }
        };

        const evaluation = await evaluateMultipleChoice(judgeAI, q);
        evaluationResults.push(evaluation);
      }

      // Check if judge correctly identifies answers regardless of position
      const correctCount = evaluationResults.filter(r => r.correct).length;
      expect(correctCount).toBe(4); // All should be correct

      // Verify no positional bias (answers distributed across positions)
      const selectedPositions = evaluationResults.map(r => r.position);
      const uniquePositions = new Set(selectedPositions);
      expect(uniquePositions.size).toBe(4); // All positions should be represented
    });
  });

  describe("Few-Shot Learning Evaluation", () => {
    test("should improve with few-shot examples", async () => {
      const fewShotExamples = [
        {
          input: "计算 0.1 + 0.2",
          output: "# 计算过程\n1. 对齐小数点\n2. 相加：1+2=3\n3. 结果：0.3",
          score: 9,
          reasoning: "步骤清晰，计算正确"
        },
        {
          input: "计算 1.5 + 2.7",  
          output: "直接得出：4.2",
          score: 5,
          reasoning: "答案正确但缺少步骤"
        }
      ];

      const testCase = "计算 0.8 + 0.4";
      
      // Mock response with few-shot learning
      judgeAI.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    score: 8,
                    reasoning: "基于示例，这个回答需要包含详细步骤。当前答案正确但步骤不够详细。",
                    improvement_suggestions: ["添加小数点对齐步骤", "显示逐位相加过程"],
                    comparison_to_examples: "与高分示例相比，缺少详细步骤说明"
                  })
                }
              }]
            })
          }
        }
      };

      const evaluation = await evaluateWithFewShot(judgeAI, testCase, fewShotExamples);
      const result = JSON.parse(evaluation);

      expect(result.score).toBeGreaterThanOrEqual(7);
      expect(result.improvement_suggestions).toBeDefined();
      expect(result.comparison_to_examples).toBeDefined();
    });
  });

});

// Helper functions for testing
async function evaluateWithJudge(judgeAI, content, contentType) {
  return await judgeAI.analyzeContent(content, `evaluate_${contentType}`);
}

async function evaluateWithReasoning(judgeAI, content) {
  return await judgeAI.analyzeContent(content, "reasoning_evaluation");
}

async function evaluateMultipleChoice(judgeAI, question) {
  const evaluation = await judgeAI.analyzeContent(
    JSON.stringify(question), 
    "multiple_choice_evaluation"
  );
  const result = JSON.parse(evaluation);
  return {
    correct: result.selected_answer === question.correct,
    position: question.position,
    confidence: result.confidence
  };
}

async function evaluateWithFewShot(judgeAI, testCase, examples) {
  const prompt = {
    examples: examples,
    test_case: testCase
  };
  return await judgeAI.analyzeContent(JSON.stringify(prompt), "few_shot_evaluation");
}