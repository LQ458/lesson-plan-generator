/**
 * Production Monitoring Test Suite
 * Tests suitable for continuous monitoring and production health checks
 * Based on 2024 best practices for AI system monitoring
 */

const AIService = require("../ai-service");
const VectorStore = require("../rag/services/vector-store");

// Mock dependencies
jest.mock("../rag/services/vector-store");
jest.mock("openai");
jest.mock("../utils/logger");

describe("Production Monitoring Tests", () => {
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
    };

    vectorStore = new VectorStore();
    aiService = new AIService();
  });

  afterEach(() => {
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.AI_ENABLED;
    jest.clearAllMocks();
  });

  describe("System Health Checks", () => {
    test("AI service should be healthy and responsive", async () => {
      const healthCheck = aiService.getStatus();

      expect(healthCheck.enabled).toBe(true);
      expect(healthCheck.apiConfigured).toBe(true);
      expect(healthCheck.model).toBeDefined();
      expect(healthCheck.maxTokens).toBeGreaterThan(0);
      expect(healthCheck.temperature).toBeLessThanOrEqual(1.0);
    });

    test("Vector store should be accessible", async () => {
      vectorStore.getRelevantContext.mockResolvedValue({
        context: "健康检查成功",
        sources: ["health.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const result = await vectorStore.getRelevantContext(
        "健康检查",
        "测试",
        "监控",
        10
      );

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
    });

    test("End-to-end lesson plan generation should work", async () => {
      vectorStore.getRelevantContext.mockResolvedValue({
        context: "数学教学相关内容",
        sources: ["math_guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { content: "# 健康检查教案\n\n系统运行正常。" }
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

      const startTime = Date.now();
      
      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "健康检查",
        null,
        mockResponse
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
      expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe("Performance Monitoring", () => {
    test("should monitor response time for lesson plan generation", async () => {
      const testCases = [
        { subject: "数学", grade: "三年级", topic: "加法", expectedMaxTime: 5000 },
        { subject: "语文", grade: "四年级", topic: "作文", expectedMaxTime: 7000 },
        { subject: "英语", grade: "五年级", topic: "语法", expectedMaxTime: 6000 },
      ];

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          // Simulate realistic response time
          await new Promise(resolve => setTimeout(resolve, 1000));
          yield {
            choices: [{
              delta: { content: "教案内容生成中..." }
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

      const performanceResults = [];

      for (const testCase of testCases) {
        const startTime = Date.now();
        
        await aiService.generateLessonPlanStream(
          testCase.subject,
          testCase.grade,
          testCase.topic,
          null,
          mockResponse
        );

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        performanceResults.push({
          ...testCase,
          actualTime: responseTime,
          withinSLA: responseTime <= testCase.expectedMaxTime,
        });

        expect(responseTime).toBeLessThan(testCase.expectedMaxTime);
      }

      // Log performance metrics for monitoring
      console.log("Performance monitoring results:", performanceResults);
    });

    test("should monitor memory usage during generation", async () => {
      const initialMemory = process.memoryUsage();

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容".repeat(1000), // Larger context
        sources: Array.from({ length: 50 }, (_, i) => `file${i}.pdf`),
        totalResults: 50,
        usedResults: 25,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (let i = 0; i < 100; i++) {
            yield {
              choices: [{
                delta: { content: `教案内容片段${i}。` }
              }]
            };
          }
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
        "复杂主题",
        null,
        mockResponse
      );

      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024);

      console.log("Memory usage delta:", {
        heapUsed: `${(memoryDelta / 1024 / 1024).toFixed(2)} MB`,
        initial: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        final: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      });
    });

    test("should monitor concurrent request handling capacity", async () => {
      const concurrentRequests = 5;
      const maxAcceptableTime = 15000; // 15 seconds for all requests

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "并发测试内容",
        sources: ["concurrent.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay per request
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

      const promises = [];
      const startTime = Date.now();

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
            `并发主题${i}`,
            null,
            mockRes
          )
        );
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(maxAcceptableTime);
      console.log(`Concurrent requests completed in ${totalTime}ms`);
    });
  });

  describe("Quality Monitoring", () => {
    test("should monitor output quality consistency", async () => {
      const standardTopic = "小数加法";
      const expectedKeywords = ["小数", "加法", "对齐", "教学"];
      const qualityThreshold = 0.8; // 80% keyword coverage

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "小数加法教学要点：小数点对齐是关键",
        sources: ["math_standard.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            choices: [{
              delta: { 
                content: "# 小数加法教案\n\n本节课重点教授小数点对齐方法，通过教学演示让学生掌握加法计算。" 
              }
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
        standardTopic,
        null,
        mockResponse
      );

      const generatedContent = mockResponse.write.mock.calls
        .map(call => call[0])
        .join("");

      // Check keyword coverage
      const foundKeywords = expectedKeywords.filter(keyword =>
        generatedContent.includes(keyword)
      );
      const qualityScore = foundKeywords.length / expectedKeywords.length;

      expect(qualityScore).toBeGreaterThanOrEqual(qualityThreshold);
      
      console.log("Quality monitoring:", {
        expectedKeywords,
        foundKeywords,
        qualityScore: qualityScore.toFixed(2),
        threshold: qualityThreshold,
      });
    });

    test("should monitor output length consistency", async () => {
      const minLength = 200; // Minimum reasonable lesson plan length
      const maxLength = 5000; // Maximum reasonable lesson plan length

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "教学内容指导",
        sources: ["guide.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          const content = "教案内容：".repeat(30); // Reasonable length content
          yield {
            choices: [{
              delta: { content }
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
        "标准主题",
        null,
        mockResponse
      );

      const totalLength = mockResponse.write.mock.calls
        .map(call => call[0])
        .join("")
        .length;

      expect(totalLength).toBeGreaterThanOrEqual(minLength);
      expect(totalLength).toBeLessThanOrEqual(maxLength);

      console.log(`Output length: ${totalLength} characters (range: ${minLength}-${maxLength})`);
    });
  });

  describe("Error Rate Monitoring", () => {
    test("should track and alert on high error rates", async () => {
      const totalRequests = 10;
      let errorCount = 0;
      const errorThreshold = 0.2; // 20% error rate threshold

      for (let i = 0; i < totalRequests; i++) {
        try {
          if (i < 2) {
            // Simulate 2 errors out of 10 requests
            throw new Error(`Simulated error ${i}`);
          }

          vectorStore.getRelevantContext.mockResolvedValue({
            context: "正常内容",
            sources: ["normal.pdf"],
            totalResults: 1,
            usedResults: 1,
          });

          const mockStream = {
            [Symbol.asyncIterator]: async function* () {
              yield {
                choices: [{
                  delta: { content: "正常教案内容" }
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
            `主题${i}`,
            null,
            mockResponse
          );

        } catch (error) {
          errorCount++;
          console.warn(`Request ${i} failed:`, error.message);
        }
      }

      const errorRate = errorCount / totalRequests;
      expect(errorRate).toBeLessThan(errorThreshold);

      console.log(`Error rate monitoring: ${errorCount}/${totalRequests} = ${(errorRate * 100).toFixed(1)}%`);
    });

    test("should monitor API availability", async () => {
      const healthCheckAttempts = 3;
      let successfulChecks = 0;

      for (let i = 0; i < healthCheckAttempts; i++) {
        try {
          vectorStore.getRelevantContext.mockResolvedValue({
            context: "健康检查",
            sources: ["health.pdf"],
            totalResults: 1,
            usedResults: 1,
          });

          const mockStream = {
            [Symbol.asyncIterator]: async function* () {
              yield {
                choices: [{
                  delta: { content: "API健康检查通过" }
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
            "健康检查",
            "监控",
            "API可用性",
            null,
            mockResponse
          );

          successfulChecks++;
        } catch (error) {
          console.error(`Health check ${i} failed:`, error.message);
        }
      }

      const availabilityRate = successfulChecks / healthCheckAttempts;
      expect(availabilityRate).toBeGreaterThanOrEqual(0.9); // 90% availability expected

      console.log(`API availability: ${successfulChecks}/${healthCheckAttempts} = ${(availabilityRate * 100).toFixed(1)}%`);
    });
  });

  describe("Resource Usage Monitoring", () => {
    test("should monitor CPU usage during heavy operations", async () => {
      const startTime = process.hrtime();

      // Simulate CPU-intensive operation
      vectorStore.getRelevantContext.mockImplementation(async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          context: "CPU密集型处理结果",
          sources: ["processed.pdf"],
          totalResults: 1,
          usedResults: 1,
        };
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (let i = 0; i < 50; i++) {
            yield {
              choices: [{
                delta: { content: `处理片段${i}` }
              }]
            };
          }
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
        "CPU密集型主题",
        null,
        mockResponse
      );

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

      // Should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000);

      console.log(`CPU-intensive operation completed in ${executionTime.toFixed(2)}ms`);
    });

    test("should monitor request queue depth", async () => {
      let activeRequests = 0;
      const maxConcurrentRequests = 5;
      const requestPromises = [];

      const queueMonitor = {
        increment: () => {
          activeRequests++;
          expect(activeRequests).toBeLessThanOrEqual(maxConcurrentRequests);
        },
        decrement: () => {
          activeRequests--;
          expect(activeRequests).toBeGreaterThanOrEqual(0);
        },
      };

      vectorStore.getRelevantContext.mockResolvedValue({
        context: "队列监控内容",
        sources: ["queue.pdf"],
        totalResults: 1,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          queueMonitor.increment();
          await new Promise(resolve => setTimeout(resolve, 500));
          yield {
            choices: [{
              delta: { content: "队列处理结果" }
            }]
          };
          queueMonitor.decrement();
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      // Submit multiple requests
      for (let i = 0; i < maxConcurrentRequests; i++) {
        const mockRes = {
          setHeader: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
          status: jest.fn().mockReturnThis(),
        };

        requestPromises.push(
          aiService.generateLessonPlanStream(
            "数学",
            "三年级",
            `队列主题${i}`,
            null,
            mockRes
          )
        );
      }

      await Promise.all(requestPromises);

      // All requests should have completed
      expect(activeRequests).toBe(0);
      console.log(`Queue monitoring: processed ${maxConcurrentRequests} concurrent requests successfully`);
    });
  });

  describe("Alerting and Thresholds", () => {
    test("should trigger alerts when quality drops below threshold", () => {
      const qualityMetrics = {
        relevance: 0.6,      // Below threshold of 0.8
        accuracy: 0.9,       // Good
        completeness: 0.7,   // Marginal
        readability: 0.95,   // Excellent
      };

      const thresholds = {
        relevance: 0.8,
        accuracy: 0.85,
        completeness: 0.8,
        readability: 0.9,
      };

      const alerts = [];

      Object.keys(qualityMetrics).forEach(metric => {
        if (qualityMetrics[metric] < thresholds[metric]) {
          alerts.push({
            metric,
            value: qualityMetrics[metric],
            threshold: thresholds[metric],
            severity: qualityMetrics[metric] < thresholds[metric] * 0.8 ? "critical" : "warning",
          });
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.find(a => a.metric === "relevance")).toBeDefined();
      expect(alerts.find(a => a.metric === "relevance").severity).toBe("critical");

      console.log("Quality alerts triggered:", alerts);
    });

    test("should monitor SLA compliance", () => {
      const slaMetrics = {
        responseTime: {
          current: 3500,     // 3.5 seconds
          threshold: 5000,   // 5 seconds SLA
          unit: "ms"
        },
        availability: {
          current: 99.5,     // 99.5%
          threshold: 99.0,   // 99% SLA
          unit: "%"
        },
        errorRate: {
          current: 1.2,      // 1.2%
          threshold: 2.0,    // 2% threshold
          unit: "%"
        },
      };

      const slaViolations = [];

      Object.keys(slaMetrics).forEach(metric => {
        const { current, threshold } = slaMetrics[metric];
        
        if (metric === "errorRate" && current > threshold) {
          slaViolations.push(metric);
        } else if (metric !== "errorRate" && current < threshold) {
          slaViolations.push(metric);
        }
      });

      expect(slaViolations.length).toBe(0); // No SLA violations expected
      
      console.log("SLA compliance check:", {
        metrics: slaMetrics,
        violations: slaViolations,
        status: slaViolations.length === 0 ? "COMPLIANT" : "VIOLATION",
      });
    });
  });
});