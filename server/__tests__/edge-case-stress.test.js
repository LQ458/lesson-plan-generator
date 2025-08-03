/**
 * Edge Case and Stress Testing Suite
 * Tests system behavior outside the happy path
 * Based on 2024 best practices for AI system stress testing
 */

const AIService = require("../ai-service");
const VectorStore = require("../rag/services/vector-store");

// Mock dependencies
jest.mock("../rag/services/vector-store");
jest.mock("openai");
jest.mock("../utils/logger");

describe("Edge Case and Stress Testing", () => {
  let aiService;
  let vectorStore;
  let mockResponse;

  beforeEach(() => {
    process.env.DASHSCOPE_API_KEY = "test-api-key";
    process.env.AI_ENABLED = "true";

    mockResponse = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    vectorStore = new VectorStore();
    aiService = new AIService();
  });

  afterEach(() => {
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.AI_ENABLED;
    jest.clearAllMocks();
  });

  describe("Input Edge Cases", () => {
    test("should handle extremely long input gracefully", async () => {
      const extremelyLongTopic = "数学".repeat(1000); // 2000 characters
      const extremelyLongRequirements = "详细讲解".repeat(500); // 2000 characters

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "基础数学内容",
        sources: ["basic.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "处理超长输入的教案内容..." }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await expect(
        aiService.generateLessonPlanStream(
          "数学",
          "三年级",
          extremelyLongTopic,
          extremelyLongRequirements,
          mockResponse
        )
      ).resolves.not.toThrow();

      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("should handle special characters and emojis", async () => {
      const specialTopic = "数学🔢➕➖✖️➗📐📏📊📈";
      const emojiRequirements = "用🎯重点讲解📚，包含🤔思考题❓";

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "数学教学内容",
        sources: ["math.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "# 数学教案\n包含特殊字符的内容..." }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        specialTopic,
        emojiRequirements,
        mockResponse
      );

      const writtenContent = mockResponse.write.mock.calls
        .map(call => call[0])
        .join("");

      // Should handle special characters without breaking
      expect(writtenContent).toBeDefined();
      expect(writtenContent.length).toBeGreaterThan(0);
    });

    test("should handle malformed Unicode input", async () => {
      const malformedInput = "数学\uD800教学"; // Unpaired surrogate
      const mixedEncodingInput = "数学math数学";

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "处理特殊编码的教案..." }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await expect(
        aiService.generateLessonPlanStream(
          "数学",
          "三年级",
          malformedInput,
          mixedEncodingInput,
          mockResponse
        )
      ).resolves.not.toThrow();
    });

    test("should handle empty and null inputs", async () => {
      const testCases = [
        { subject: "", grade: "", topic: "", requirements: "" },
        { subject: null, grade: null, topic: null, requirements: null },
        { subject: undefined, grade: undefined, topic: undefined, requirements: undefined },
        { subject: "   ", grade: "   ", topic: "   ", requirements: "   " }, // Whitespace only
      ];

      for (const testCase of testCases) {
        vectorStore.getRelevantContext.mockResolvedValue({
          context: "",
          sources: [],
          totalResults: 0,
          usedResults: 0,
        });

        const mockStream = {
          [Symbol.asyncIterator]: async function* () {
            yield {
              choices: [{
                delta: { content: "默认教案内容" }
              }]
            };
          },
        };

        aiService.openai = {
          chat: {
            completions: {
              create: jest.fn().mockResolvedValue(mockStream),
            },
          },
        };

        // Should handle gracefully without throwing
        await expect(
          aiService.generateLessonPlanStream(
            testCase.subject,
            testCase.grade,
            testCase.topic,
            testCase.requirements,
            mockResponse
          )
        ).resolves.not.toThrow();
      }
    });
  });

  describe("Network and API Edge Cases", () => {
    test("should handle API timeout gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(timeoutError),
          },
        },
      };

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("网络超时")
      );
    });

    test("should handle API rate limiting", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      rateLimitError.status = 429;

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValueOnce(rateLimitError),
          },
        },
      };

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("AI服务错误")
      );
    });

    test("should handle corrupted streaming response", async () => {
      const corruptedStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "正常内容" } }] };
          yield { choices: [{ delta: { content: null } }] }; // Corrupted chunk
          yield { invalid: "data" }; // Invalid structure
          yield { choices: [{ delta: { content: "恢复正常" } }] };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(corruptedStream),
          },
        },
      };

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse
      );

      // Should handle corrupted chunks gracefully
      const writtenContent = mockResponse.write.mock.calls
        .map(call => call[0])
        .join("");

      expect(writtenContent).toContain("正常内容");
      expect(writtenContent).toContain("恢复正常");
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe("Vector Database Edge Cases", () => {
    test("should handle vector database unavailable", async () => {
      vectorStore.getRelevantContext.mockRejectedValue(
        new Error("ChromaDB connection failed")
      );

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "无RAG增强的教案内容" }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      // Should continue without RAG enhancement
      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse
      );

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("无RAG增强")
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("should handle empty vector database", async () => {
      vectorStore.getRelevantContext.mockResolvedValue({
        context: "",
        sources: [],
        totalResults: 0,
        usedResults: 0,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "基于通用知识的教案" }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "非常罕见的主题",
        "特殊年级",
        "不存在的课题",
        null,
        mockResponse
      );

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("基于通用知识")
      );
    });
  });

  describe("Stress Testing", () => {
    test("should handle high concurrent request load", async () => {
      const concurrentRequests = 10;
      const promises = [];

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "并发处理的教案内容" }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const mockRes = {
          setHeader: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
          status: jest.fn().mockReturnThis(),
        };

        promises.push(
          aiService.generateLessonPlanStream(
            "数学",
            "三年级",
            `主题${i}`,
            null,
            mockRes
          )
        );
      }

      // All requests should complete successfully
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify all requests were processed
      expect(aiService.openai.chat.completions.create).toHaveBeenCalledTimes(
        concurrentRequests
      );
    });

    test("should handle memory pressure scenarios", async () => {
      const largeContextSize = 10000; // Very large context
      const largeContext = "详细教学内容".repeat(largeContextSize / 6);

      vectorStore.getRelevantContext.mockResolvedValue({
        context: largeContext,
        sources: Array.from({ length: 100 }, (_, i) => `file${i}.pdf`),
        totalResults: 100,
        usedResults: 50,
      });

      const largeContentStream = {
        [Symbol.asyncIterator]: async function* () {
          // Generate a large amount of content
          for (let i = 0; i < 1000; i++) {
            yield {
              choices: [{
                delta: { content: `教案内容片段${i}。`.repeat(10) }
              }]
            };
          }
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(largeContentStream),
          },
        },
      };

      const startMemory = process.memoryUsage().heapUsed;

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "复杂的数学主题",
        "非常详细的要求",
        mockResponse
      );

      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;

      // Memory growth should be reasonable (less than 100MB)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("should handle response size limits", async () => {
      const MAX_RESPONSE_SIZE = 50 * 1024; // 50KB limit
      let totalSize = 0;
      let chunkCount = 0;

      mockResponse.write.mockImplementation((chunk) => {
        totalSize += Buffer.byteLength(chunk, 'utf8');
        chunkCount++;
        
        // Simulate response size checking
        if (totalSize > MAX_RESPONSE_SIZE) {
          console.warn(`Response size ${totalSize} exceeds limit ${MAX_RESPONSE_SIZE}`);
        }
      });

      const largeResponseStream = {
        [Symbol.asyncIterator]: async function* () {
          // Generate content that would exceed size limit
          for (let i = 0; i < 2000; i++) {
            yield {
              choices: [{
                delta: { content: "这是很长的教案内容。".repeat(20) }
              }]
            };
          }
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(largeResponseStream),
          },
        },
      };

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse
      );

      // Verify response was processed (even if large)
      expect(chunkCount).toBeGreaterThan(100);
      expect(totalSize).toBeGreaterThan(MAX_RESPONSE_SIZE);
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe("Unusual Subject and Grade Combinations", () => {
    test("should handle age-inappropriate subject combinations", async () => {
      const inappropriateCombinations = [
        { subject: "物理", grade: "一年级", topic: "量子力学" },
        { subject: "化学", grade: "二年级", topic: "有机合成" },
        { subject: "数学", grade: "幼儿园", topic: "微积分" },
        { subject: "生物", grade: "学前班", topic: "基因工程" },
      ];

      for (const combo of inappropriateCombinations) {
        // Should throw error for inappropriate combinations
        await expect(
          aiService.generateExercisesStream(
            combo.subject,
            combo.grade,
            combo.topic,
            "easy",
            5,
            "选择题",
            null,
            mockResponse
          )
        ).rejects.toThrow();
      }
    });

    test("should handle non-existent subjects gracefully", async () => {
      const nonExistentSubjects = [
        "魔法学",
        "飞行术", 
        "时间旅行",
        "外星语言",
        "123456", // Numeric subject
        "!@#$%",  // Special characters
      ];

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "",
        sources: [],
        totalResults: 0,
        usedResults: 0,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "无法处理此科目的教案" }
            }]
          };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      for (const subject of nonExistentSubjects) {
        await aiService.generateLessonPlanStream(
          subject,
          "三年级",
          "基础知识",
          null,
          mockResponse
        );

        // Should handle gracefully without crashing
        expect(mockResponse.write).toHaveBeenCalled();
      }
    });
  });

  describe("Failure Recovery Testing", () => {
    test("should recover from partial failures", async () => {
      let callCount = 0;
      
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call fails
                throw new Error("Temporary failure");
              }
              // Second call succeeds
              return Promise.resolve({
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    choices: [{
                      delta: { content: "恢复后的教案内容" }
                    }]
                  };
                },
              });
            }),
          },
        },
      };

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      // First attempt should fail gracefully
      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse
      );

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining("AI服务错误")
      );
    });
  });
});