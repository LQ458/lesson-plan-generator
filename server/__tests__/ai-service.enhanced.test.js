const { PassThrough } = require("stream");
const winston = require("winston");

// Create Mock instances
const mockVectorStore = {
  getRelevantContext: jest.fn(),
  initialize: jest.fn(),
  search: jest.fn(),
};

// Mock winston logger to avoid console output in tests
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock dependencies
jest.mock("../rag/services/vector-store", () => {
  return jest.fn().mockImplementation(() => mockVectorStore);
});
jest.mock("openai");
jest.mock("winston", () => ({
  createLogger: () => mockLogger,
  format: {
    combine: jest.fn(() => ({})),
    timestamp: jest.fn(() => ({})),
    errors: jest.fn(() => ({})),
    json: jest.fn(() => ({})),
    printf: jest.fn(() => ({})),
    colorize: jest.fn(() => ({})),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

const AIService = require("../ai-service");

describe("AIService Enhanced Tests", () => {
  let aiService;
  let mockResponse;

  beforeEach(() => {
    // Set test environment variables
    process.env.DASHSCOPE_API_KEY = "test-api-key";
    process.env.AI_ENABLED = "true";
    process.env.QWEN_MODEL = "qwen-plus";
    process.env.AI_MAX_TOKENS = "2000";
    process.env.AI_TEMPERATURE = "0.7";
    process.env.AI_TOP_P = "0.8";

    // Create mock response object
    mockResponse = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      headersSent: false,
      status: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();

    // Create AI service instance
    aiService = new AIService();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.AI_ENABLED;
    delete process.env.QWEN_MODEL;
    delete process.env.AI_MAX_TOKENS;
    delete process.env.AI_TEMPERATURE;
    delete process.env.AI_TOP_P;
  });

  describe("Constructor and Configuration", () => {
    test("initializes with all environment variables", () => {
      expect(aiService.enabled).toBe(true);
      expect(aiService.model).toBe("qwen-plus");
      expect(aiService.maxTokens).toBe(2000);
      expect(aiService.temperature).toBe(0.7);
      expect(aiService.topP).toBe(0.8);
      expect(aiService.requestCounter).toBe(0);
    });

    test("uses default values when environment variables are missing", () => {
      delete process.env.QWEN_MODEL;
      delete process.env.AI_MAX_TOKENS;
      delete process.env.AI_TEMPERATURE;
      delete process.env.AI_TOP_P;

      const defaultService = new AIService();

      expect(defaultService.model).toBe("qwen-plus");
      expect(defaultService.maxTokens).toBe(2000);
      expect(defaultService.temperature).toBe(0.7);
      expect(defaultService.topP).toBe(0.8);
    });

    test("handles disabled service properly", () => {
      process.env.AI_ENABLED = "false";
      const disabledService = new AIService();
      expect(disabledService.enabled).toBe(false);
    });

    test("handles invalid numeric configurations gracefully", () => {
      process.env.AI_MAX_TOKENS = "invalid";
      process.env.AI_TEMPERATURE = "not_a_number";

      const invalidConfigService = new AIService();

      // Service should handle invalid values by using defaults or NaN
      expect(typeof invalidConfigService.maxTokens).toBe("number");
      expect(typeof invalidConfigService.temperature).toBe("number");
    });
  });

  describe("Request ID Generation", () => {
    test("generates properly formatted request IDs", () => {
      const id1 = aiService.generateRequestId();
      const id2 = aiService.generateRequestId();

      expect(id1).toMatch(/^AI-\d{8}T\d{6}-\d{4}$/);
      expect(id2).toMatch(/^AI-\d{8}T\d{6}-\d{4}$/);
      expect(id1).not.toBe(id2);
    });

    test("maintains counter state across multiple calls", () => {
      const ids = [];
      for (let i = 0; i < 10; i++) {
        ids.push(aiService.generateRequestId());
      }

      // Extract counters from IDs
      const counters = ids.map(id => parseInt(id.split('-')[2], 10));

      // Verify counters are sequential
      for (let i = 1; i < counters.length; i++) {
        expect(counters[i]).toBe(counters[i-1] + 1);
      }
    });

    test("handles counter overflow gracefully", () => {
      aiService.requestCounter = 9999;
      const id = aiService.generateRequestId();
      expect(id).toMatch(/^AI-\d{8}T\d{6}-\d{4}$/);
      expect(aiService.requestCounter).toBeGreaterThan(9999);
    });
  });

  describe("Lesson Plan Generation - Complex Scenarios", () => {
    beforeEach(() => {
      mockVectorStore.getRelevantContext.mockResolvedValue({
        context: "相关教学资料内容包含详细的教学方法和案例研究",
        sources: ["人教版教材.pdf", "教学参考书.pdf", "课程标准.pdf"],
        totalResults: 15,
        usedResults: 8,
      });
    });

    test("handles different subject types with specific prompts", async () => {
      const subjects = [
        { name: "物理", type: "science" },
        { name: "数学", type: "math" },
        { name: "语文", type: "language" },
        { name: "音乐", type: "arts" },
        { name: "体育", type: "sports" }
      ];

      for (const subject of subjects) {
        const mockStream = createMockStream(["测试内容"]);
        aiService.openai = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue(mockStream),
            },
          },
        };

        await aiService.generateLessonPlanStream(
          subject.name,
          "初中二年级",
          "测试主题",
          null,
          mockResponse,
        );

        const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
        
        // Verify subject-specific content is included
        if (subject.type === "science") {
          expect(createCall.messages[0].content).toContain("实验观察");
          expect(createCall.messages[0].content).toContain("科学探究");
        } else if (subject.type === "math") {
          expect(createCall.messages[0].content).toContain("逻辑思维");
          expect(createCall.messages[0].content).toContain("解题方法");
        }

        jest.clearAllMocks();
      }
    });

    test("handles empty RAG context gracefully", async () => {
      mockVectorStore.getRelevantContext.mockResolvedValue({
        context: "",
        sources: [],
        totalResults: 0,
        usedResults: 0,
      });

      const mockStream = createMockStream(["生成的教案内容"]);
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "数学",
        "小学三年级",
        "加法运算",
        "基础教学",
        mockResponse,
      );

      expect(mockResponse.write).toHaveBeenCalledWith("生成的教案内容");
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("handles very long lesson topics", async () => {
      const longTopic = "这是一个非常长的课程主题描述，".repeat(50);
      
      const mockStream = createMockStream(["教案内容"]);
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          }
        },
      };

      await aiService.generateLessonPlanStream(
        "语文",
        "高中一年级",
        longTopic,
        null,
        mockResponse,
      );

      const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.messages[1].content).toContain(longTopic);
    });

    test("handles special characters in requirements", async () => {
      const specialRequirements = "需要包含数学公式 $x^2 + y^2 = z^2$ 和特殊符号 ±×÷≠≤≥∞";
      
      const mockStream = createMockStream(["数学教案内容"]);
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "数学",
        "初中三年级",
        "勾股定理",
        specialRequirements,
        mockResponse,
      );

      const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.messages[1].content).toContain(specialRequirements);
    });
  });

  describe("Exercise Generation - Advanced Features", () => {
    test("validates subject-grade compatibility strictly", async () => {
      const invalidCombinations = [
        { subject: "物理", grade: "一年级" },
        { subject: "化学", grade: "二年级" },
        { subject: "生物", grade: "三年级" },
      ];

      for (const combo of invalidCombinations) {
        await expect(
          aiService.generateExercisesStream(
            combo.subject,
            combo.grade,
            "测试主题",
            "easy",
            5,
            "选择题",
            null,
            mockResponse,
          )
        ).rejects.toThrow(`${combo.grade}暂不支持${combo.subject}科目`);
      }
    });

    test("handles difficulty mapping for different languages", async () => {
      const difficultyMappings = [
        { input: "easy", expected: "简单" },
        { input: "medium", expected: "中等" },
        { input: "hard", expected: "困难" },
        { input: "简单", expected: "简单" },
        { input: "中等", expected: "中等" },
        { input: "困难", expected: "困难" },
      ];

      for (const mapping of difficultyMappings) {
        const mockStream = createMockStream(["练习题内容"]);
        aiService.openai = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue(mockStream),
            },
          },
        };

        await aiService.generateExercisesStream(
          "数学",
          "五年级",
          "分数运算",
          mapping.input,
          3,
          "选择题",
          null,
          mockResponse,
        );

        const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
        expect(createCall.messages[1].content).toContain(`难度：${mapping.expected}`);
        
        jest.clearAllMocks();
      }
    });

    test("generates grade-specific prompts correctly", async () => {
      const gradeTests = [
        { grade: "二年级", expectedLevel: "小学" },
        { grade: "六年级", expectedLevel: "小学" },
        { grade: "八年级", expectedLevel: "初中" },
        { grade: "初二", expectedLevel: "初中" },
      ];

      for (const test of gradeTests) {
        const mockStream = createMockStream(["练习题"]);
        aiService.openai = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue(mockStream),
            },
          },
        };

        await aiService.generateExercisesStream(
          "语文",
          test.grade,
          "阅读理解",
          "medium",
          5,
          "填空题",
          null,
          mockResponse,
        );

        const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
        
        if (test.expectedLevel === "小学") {
          expect(createCall.messages[0].content).toContain("语言要简单明了");
          expect(createCall.messages[0].content).toContain("贴近小学生");
        } else {
          expect(createCall.messages[0].content).toContain("适当增加推理");
          expect(createCall.messages[0].content).toContain("综合性");
        }
        
        jest.clearAllMocks();
      }
    });

    test("handles large question counts efficiently", async () => {
      const mockStream = createMockStream([
        "# 大量练习题集合\n\n",
        ...Array.from({ length: 50 }, (_, i) => `${i + 1}. 题目${i + 1}\n`),
        "## 答案解析\n"
      ]);

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateExercisesStream(
        "数学",
        "九年级",
        "二次方程",
        "hard",
        50,
        "计算题",
        "包含详细步骤",
        mockResponse,
      );

      expect(mockResponse.write).toHaveBeenCalledTimes(52); // 50 questions + title + answers
    });
  });

  describe("Content Analysis - Advanced Scenarios", () => {
    beforeEach(() => {
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      };
    });

    test("handles concept extraction with mathematical formulas", async () => {
      aiService.openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: "二次方程, ax²+bx+c=0, 判别式Δ, 求根公式",
            },
          },
        ],
      });

      const mathContent = "学习二次方程ax²+bx+c=0的求解方法，重点掌握判别式Δ=b²-4ac的应用";
      
      const result = await aiService.analyzeContent(mathContent, "概念提取");

      expect(result).toContain("二次方程");
      expect(result).toContain("ax²+bx+c=0");
      
      const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.max_tokens).toBe(50);
      expect(createCall.temperature).toBe(0.1);
    });

    test("handles analysis of very long content", async () => {
      const longContent = "教学内容".repeat(10000) + "结束标记";
      
      aiService.openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: "分析结果：内容重复度高，建议精简",
            },
          },
        ],
      });

      const result = await aiService.analyzeContent(longContent, "质量评估");

      expect(result).toContain("分析结果");
      
      const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
      // Should truncate long content for analysis
      expect(createCall.messages[1].content.length).toBeLessThan(longContent.length);
    });

    test("handles content with special characters and encoding", async () => {
      const specialContent = "特殊字符测试：™©®°€£¥ 数学符号：∑∏∆∇∞∂∫√ 中文标点：，。；：！？";
      
      aiService.openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: "包含多种特殊字符和数学符号",
            },
          },
        ],
      });

      const result = await aiService.analyzeContent(specialContent, "内容检测");
      
      expect(result).toBeDefined();
      
      const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.messages[1].content).toContain(specialContent);
    });

    test("handles empty and null content gracefully", async () => {
      const testCases = ["", null, undefined, "   ", "\n\n\n"];

      for (const testContent of testCases) {
        aiService.openai.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: "内容为空或无效",
              },
            },
          ],
        });

        const result = await aiService.analyzeContent(testContent || "", "内容检验");
        expect(result).toBe("内容为空或无效");
      }
    });
  });

  describe("Streaming and Error Handling", () => {
    test("handles streaming interruption gracefully", async () => {
      const interruptedStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "开始内容" } }] };
          yield { choices: [{ delta: { content: "中间内容" } }] };
          throw new Error("Connection interrupted");
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(interruptedStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "测试主题",
        null,
        mockResponse,
      );

      expect(mockResponse.write).toHaveBeenCalledWith("开始内容");
      expect(mockResponse.write).toHaveBeenCalledWith("中间内容");
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    test("handles malformed streaming chunks", async () => {
      const malformedStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "正常内容" } }] };
          yield { choices: null }; // Malformed chunk
          yield { choices: [{ delta: null }] }; // Another malformed chunk
          yield { choices: [{ delta: { content: "恢复内容" } }] };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(malformedStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "语文",
        "四年级",
        "古诗词",
        null,
        mockResponse,
      );

      expect(mockResponse.write).toHaveBeenCalledWith("正常内容");
      expect(mockResponse.write).toHaveBeenCalledWith("恢复内容");
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("handles usage information correctly", async () => {
      const streamWithUsage = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "内容" } }] };
          yield {
            usage: {
              prompt_tokens: 150,
              completion_tokens: 300,
              total_tokens: 450,
            },
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(streamWithUsage),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "英语",
        "六年级",
        "时态练习",
        null,
        mockResponse,
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("AI内容生成成功"),
        expect.objectContaining({
          inputTokens: 150,
          outputTokens: 300,
          totalTokens: 450,
        })
      );
    });

    test("handles response headers already sent", async () => {
      mockResponse.headersSent = true;
      
      const errorStream = {
        [Symbol.asyncIterator]: async function* () {
          throw new Error("API错误");
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(errorStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "物理",
        "九年级",
        "力学",
        null,
        mockResponse,
      );

      expect(mockResponse.status).not.toHaveBeenCalled(); // Headers already sent
      expect(mockResponse.write).toHaveBeenCalledWith("AI服务错误: API错误");
    });
  });

  describe("Performance and Concurrency", () => {
    test("handles high concurrency correctly", async () => {
      const concurrentRequests = 20;
      const responses = Array.from({ length: concurrentRequests }, () => ({
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
        headersSent: false,
      }));

      const mockStream = createMockStream(["并发测试内容"]);
      
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      const promises = responses.map((res, index) =>
        aiService.generateLessonPlanStream(
          "数学",
          "五年级",
          `并发主题${index}`,
          null,
          res,
        )
      );

      await Promise.all(promises);

      expect(aiService.openai.chat.completions.create).toHaveBeenCalledTimes(concurrentRequests);
      responses.forEach(res => {
        expect(res.write).toHaveBeenCalledWith("并发测试内容");
        expect(res.end).toHaveBeenCalled();
      });
    });

    test("maintains request counter integrity under concurrency", async () => {
      const requestCount = 100;
      const ids = [];

      // Simulate concurrent ID generation
      const promises = Array.from({ length: requestCount }, async () => {
        return aiService.generateRequestId();
      });

      const generatedIds = await Promise.all(promises);
      
      // All IDs should be unique
      const uniqueIds = new Set(generatedIds);
      expect(uniqueIds.size).toBe(requestCount);
    });

    test("handles memory efficiently with large responses", async () => {
      const largeContent = "大量内容".repeat(10000);
      const largeStream = createMockStream([largeContent]);

      const initialMemory = process.memoryUsage().heapUsed;

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(largeStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "历史",
        "八年级",
        "世界史",
        null,
        mockResponse,
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe("RAG Integration Edge Cases", () => {
    test("handles RAG timeout gracefully", async () => {
      mockVectorStore.getRelevantContext.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error("RAG timeout")), 100)
        )
      );

      const mockStream = createMockStream(["无RAG内容"]);
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "化学",
        "九年级",
        "酸碱反应",
        null,
        mockResponse,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("RAG"),
        expect.objectContaining({
          error: "RAG timeout",
        })
      );
      
      expect(mockResponse.write).toHaveBeenCalledWith("无RAG内容");
    });

    test("handles malformed RAG response", async () => {
      mockVectorStore.getRelevantContext.mockResolvedValue(null);

      const mockStream = createMockStream(["教案内容"]);
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "生物",
        "七年级",
        "细胞结构",
        null,
        mockResponse,
      );

      expect(mockResponse.write).toHaveBeenCalledWith("教案内容");
    });

    test("handles very large RAG context", async () => {
      const largeContext = "RAG内容".repeat(50000);
      mockVectorStore.getRelevantContext.mockResolvedValue({
        context: largeContext,
        sources: ["大型资料库.pdf"],
        totalResults: 1000,
        usedResults: 100,
      });

      const mockStream = createMockStream(["整合内容"]);
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "地理",
        "八年级",
        "气候变化",
        null,
        mockResponse,
      );

      const createCall = aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.messages[0].content).toContain(largeContext);
    });
  });
});

// Helper function to create mock streams
function createMockStream(chunks) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield {
          choices: [
            {
              delta: { content: chunk },
            },
          ],
        };
      }
      
      yield {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      };
    },
  };
}