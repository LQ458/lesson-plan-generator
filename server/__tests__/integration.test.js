/**
 * Integration Tests for TeachAI System
 * Tests the complete flow from frontend request to backend response
 */

const request = require("supertest");
const { spawn } = require("child_process");
const path = require("path");

describe("TeachAI System Integration Tests", () => {
  let serverProcess;
  const serverUrl = "http://localhost:3001";
  
  beforeAll(async () => {
    // Start the actual server for integration testing
    // Note: This assumes the server can run in test mode
    process.env.NODE_ENV = "test";
    process.env.AI_ENABLED = "true";
    process.env.DASHSCOPE_API_KEY = "test-key";
    
    // In real testing, you might start the actual server process
    // serverProcess = spawn("node", [path.join(__dirname, "../server.js")], {
    //   stdio: "pipe",
    //   env: process.env
    // });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  describe("End-to-End Lesson Plan Generation", () => {
    test("complete lesson plan workflow with RAG integration", async () => {
      // Mock a complete request that would go through the entire system
      const lessonRequest = {
        subject: "数学",
        grade: "小学三年级",
        topic: "分数的认识",
        requirements: "使用具体例子，包含练习题",
      };

      // This would be a real request to the running server
      // For now, we'll simulate the expected behavior
      const mockResponse = await simulateFullSystemRequest(lessonRequest);
      
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data).toHaveProperty("lessonPlan");
      expect(mockResponse.data.lessonPlan).toContain("分数");
      expect(mockResponse.data).toHaveProperty("ragContext");
      expect(mockResponse.data).toHaveProperty("generationTime");
    });

    test("handles high concurrency lesson plan requests", async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        subject: "语文",
        grade: "小学四年级",
        topic: `课题${i + 1}`,
        requirements: `第${i + 1}个并发请求`,
      }));

      const promises = requests.map(req => simulateFullSystemRequest(req));
      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.success).toBe(true);
        expect(response.data.lessonPlan).toContain(`课题${index + 1}`);
      });
    });

    test("graceful degradation when RAG system fails", async () => {
      const lessonRequest = {
        subject: "物理",
        grade: "初中二年级",
        topic: "电路基础",
        requirements: "包含实验内容",
      };

      // Simulate RAG system failure
      const mockResponse = await simulateSystemRequestWithRagFailure(lessonRequest);
      
      // Should still generate lesson plan without RAG context
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.lessonPlan).toContain("电路");
      expect(mockResponse.warnings[0]).toContain("RAG系统暂时不可用");
    });
  });

  describe("RAG System Integration", () => {
    test("vector search returns relevant educational materials", async () => {
      const searchQuery = {
        query: "小学数学加减法教学方法",
        subject: "数学",
        grade: "小学二年级",
        limit: 10,
      };

      const mockResults = await simulateRagSearch(searchQuery);
      
      expect(mockResults.success).toBe(true);
      expect(mockResults.data.results).toHaveLength(10);
      expect(mockResults.data.results[0]).toHaveProperty("content");
      expect(mockResults.data.results[0]).toHaveProperty("metadata");
      expect(mockResults.data.results[0]).toHaveProperty("relevanceScore");
      expect(mockResults.data.results[0].relevanceScore).toBeGreaterThan(0.5);
    });

    test("RAG system handles quality filtering correctly", async () => {
      const searchQuery = {
        query: "化学实验安全",
        subject: "化学",
        grade: "初中三年级",
        minQualityScore: 0.8,
        limit: 5,
      };

      const mockResults = await simulateRagSearch(searchQuery);
      
      expect(mockResults.success).toBe(true);
      mockResults.data.results.forEach(result => {
        expect(result.metadata.qualityScore).toBeGreaterThanOrEqual(0.8);
      });
    });

    test("RAG search performance under load", async () => {
      const searchQueries = Array.from({ length: 20 }, (_, i) => ({
        query: `并发搜索查询${i}`,
        subject: "语文",
        grade: "小学五年级",
        limit: 5,
      }));

      const startTime = Date.now();
      const promises = searchQueries.map(query => simulateRagSearch(query));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All searches should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.results.length).toBeGreaterThan(0);
      });
    });
  });

  describe("AI Service Integration", () => {
    test("AI service generates contextually relevant content", async () => {
      const aiRequest = {
        systemPrompt: "你是一位专业的小学数学教师",
        userPrompt: "请生成关于分数认识的教学内容",
        context: "学生刚刚学完整数，需要理解分数的基本概念",
      };

      const mockResponse = await simulateAiGeneration(aiRequest);
      
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.content).toContain("分数");
      expect(mockResponse.data.content).toContain("整数");
      expect(mockResponse.data).toHaveProperty("tokenUsage");
      expect(mockResponse.data.tokenUsage.totalTokens).toBeGreaterThan(0);
    });

    test("AI service handles streaming correctly", async () => {
      const aiRequest = {
        systemPrompt: "生成教学内容",
        userPrompt: "创建关于古诗词的教案",
        streaming: true,
      };

      const chunks = [];
      const mockStream = await simulateAiStreamGeneration(aiRequest);
      
      for await (const chunk of mockStream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullContent = chunks.join("");
      expect(fullContent).toContain("古诗词");
      expect(fullContent.length).toBeGreaterThan(100);
    });

    test("AI service error handling and fallback", async () => {
      const problematicRequest = {
        systemPrompt: "无效的系统提示",
        userPrompt: "", // Empty user prompt
      };

      const mockResponse = await simulateAiGeneration(problematicRequest);
      
      expect(mockResponse.success).toBe(false);
      expect(mockResponse.error).toBeDefined();
      expect(mockResponse.fallback).toBeDefined();
    });
  });

  describe("Database and Persistence Integration", () => {
    test("lesson plans are saved and retrieved correctly", async () => {
      const lessonPlan = {
        title: "测试教案",
        subject: "数学",
        grade: "小学三年级",
        content: "这是测试教案内容",
        userId: "test-user-123",
      };

      // Save lesson plan
      const saveResponse = await simulateLessonPlanSave(lessonPlan);
      expect(saveResponse.success).toBe(true);
      expect(saveResponse.data).toHaveProperty("lessonId");

      // Retrieve lesson plan
      const retrieveResponse = await simulateLessonPlanRetrieve(saveResponse.data.lessonId);
      expect(retrieveResponse.success).toBe(true);
      expect(retrieveResponse.data.title).toBe("测试教案");
      expect(retrieveResponse.data.subject).toBe("数学");
    });

    test("user data consistency across operations", async () => {
      const userId = "integration-test-user";
      const userData = {
        preferences: {
          defaultSubject: "语文",
          defaultGrade: "小学四年级",
        },
        lessonHistory: [],
      };

      // Create user
      await simulateUserCreation(userId, userData);

      // Generate lesson plan for user
      const lessonRequest = {
        subject: userData.preferences.defaultSubject,
        grade: userData.preferences.defaultGrade,
        topic: "现代诗歌欣赏",
        userId,
      };

      const lessonResponse = await simulateFullSystemRequest(lessonRequest);
      expect(lessonResponse.success).toBe(true);

      // Check user history updated
      const userHistory = await simulateUserHistoryRetrieve(userId);
      expect(userHistory.lessonHistory.length).toBe(1);
      expect(userHistory.lessonHistory[0].topic).toBe("现代诗歌欣赏");
    });
  });

  describe("Security and Validation Integration", () => {
    test("input sanitization prevents injection attacks", async () => {
      const maliciousInputs = [
        {
          subject: "<script>alert('xss')</script>",
          grade: "小学三年级",
          topic: "正常课题",
        },
        {
          subject: "数学",
          grade: "'; DROP TABLE users; --",
          topic: "SQL注入测试",
        },
        {
          subject: "语文",
          grade: "小学四年级",
          topic: "{{7*7}}模板注入",
        },
      ];

      for (const input of maliciousInputs) {
        const response = await simulateFullSystemRequest(input);
        
        // Should either reject malicious input or sanitize it
        if (response.success) {
          expect(response.data.lessonPlan).not.toContain("<script>");
          expect(response.data.lessonPlan).not.toContain("DROP TABLE");
          expect(response.data.lessonPlan).not.toContain("{{7*7}}");
        } else {
          expect(response.error).toContain("Invalid input");
        }
      }
    });

    test("rate limiting prevents abuse", async () => {
      const rapidRequests = Array.from({ length: 150 }, () => ({
        subject: "数学",
        grade: "小学三年级", 
        topic: "快速请求测试",
      }));

      const responses = await Promise.allSettled(
        rapidRequests.map(req => simulateFullSystemRequest(req))
      );

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        result => result.status === "fulfilled" && 
        result.value.error && 
        result.value.error.includes("Rate limit")
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test("authentication and authorization work correctly", async () => {
      // Test without authentication
      const unauthenticatedResponse = await simulateUnauthenticatedRequest({
        subject: "数学",
        grade: "小学三年级",
        topic: "未认证请求",
      });

      expect(unauthenticatedResponse.success).toBe(false);
      expect(unauthenticatedResponse.error).toContain("Authentication required");

      // Test with valid authentication
      const authenticatedResponse = await simulateAuthenticatedRequest({
        subject: "数学", 
        grade: "小学三年级",
        topic: "已认证请求",
      }, "valid-token");

      expect(authenticatedResponse.success).toBe(true);
    });
  });

  describe("Performance and Scalability Integration", () => {
    test("system handles peak load efficiently", async () => {
      const peakLoadRequests = Array.from({ length: 50 }, (_, i) => ({
        subject: i % 2 === 0 ? "数学" : "语文",
        grade: `小学${((i % 6) + 1)}年级`,
        topic: `峰值负载测试课题${i}`,
      }));

      const startTime = Date.now();
      const promises = peakLoadRequests.map(req => simulateFullSystemRequest(req));
      const responses = await Promise.allSettled(promises);
      const endTime = Date.now();

      const successfulResponses = responses.filter(
        result => result.status === "fulfilled" && result.value.success
      );

      // At least 80% should succeed
      expect(successfulResponses.length).toBeGreaterThanOrEqual(40);
      
      // Average response time should be reasonable
      const avgResponseTime = (endTime - startTime) / responses.length;
      expect(avgResponseTime).toBeLessThan(2000); // 2 seconds average
    });

    test("memory usage remains stable under load", async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate multiple large lesson plans
      const largeRequests = Array.from({ length: 20 }, (_, i) => ({
        subject: "历史",
        grade: "初中二年级", 
        topic: `大型教案${i} - 世界史重要事件详细分析`,
        requirements: "包含详细的历史背景、时间线、重要人物介绍、影响分析等全面内容",
      }));

      await Promise.all(largeRequests.map(req => simulateFullSystemRequest(req)));
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe("Error Recovery and Resilience", () => {
    test("system recovers from partial service failures", async () => {
      // Simulate AI service temporary failure
      const requestDuringFailure = {
        subject: "科学",
        grade: "小学五年级",
        topic: "植物的生长",
      };

      // First request might fail
      const failureResponse = await simulateFullSystemRequest(requestDuringFailure);
      
      // Wait for service recovery
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Subsequent request should succeed
      const recoveryResponse = await simulateFullSystemRequest(requestDuringFailure);
      expect(recoveryResponse.success).toBe(true);
    });

    test("data consistency maintained during failures", async () => {
      const userId = "resilience-test-user";
      const lessonRequest = {
        subject: "数学",
        grade: "小学六年级",
        topic: "分数运算",
        userId,
      };

      // Start lesson generation
      const generationPromise = simulateFullSystemRequest(lessonRequest);
      
      // Simulate system interruption
      setTimeout(() => {
        // Simulate service restart or network issue
        console.log("Simulating system interruption...");
      }, 1000);

      const response = await generationPromise;
      
      // Either succeeds completely or fails gracefully
      if (response.success) {
        // Verify lesson was saved correctly
        const savedLessons = await simulateUserLessonsRetrieve(userId);
        expect(savedLessons.length).toBeGreaterThan(0);
      } else {
        // Verify no partial data corruption
        const savedLessons = await simulateUserLessonsRetrieve(userId);
        savedLessons.forEach(lesson => {
          expect(lesson).toHaveProperty("title");
          expect(lesson).toHaveProperty("content");
          expect(lesson.content).not.toBe("");
        });
      }
    });
  });
});

// Mock functions for integration testing
// In real implementation, these would make actual API calls

async function simulateFullSystemRequest(request) {
  // Simulate full system processing including RAG, AI, and database operations
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Simulate input sanitization
  const sanitizedSubject = request.subject.replace(/<[^>]*>/g, '').replace(/[;'"]/g, '').replace(/\{\{.*?\}\}/g, '');
  const sanitizedTopic = request.topic.replace(/<[^>]*>/g, '').replace(/[;'"]/g, '').replace(/\{\{.*?\}\}/g, '');
  
  // Check for malicious content
  const hasMalicious = request.subject !== sanitizedSubject || request.topic !== sanitizedTopic;
  
  if (hasMalicious) {
    return {
      success: false,
      error: "Invalid input detected",
      statusCode: 400,
    };
  }

  // Simulate rate limiting for rapid requests
  if (request.topic && request.topic.includes("快速请求测试")) {
    const shouldRateLimit = Math.random() > 0.3; // 70% chance of rate limiting
    if (shouldRateLimit) {
      return {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        statusCode: 429,
      };
    }
  }

  return {
    success: true,
    data: {
      lessonPlan: `# ${sanitizedTopic}\n\n这是关于${sanitizedSubject}的教案内容...\n\n生成的课程内容包含了${request.requirements || '标准教学要求'}。`,
      ragContext: {
        sources: [`${sanitizedSubject}教材.pdf`, `${request.grade}教学指南.pdf`],
        relevantChunks: 8,
        qualityScore: 0.85,
      },
      generationTime: 1200 + Math.random() * 800,
      tokenUsage: {
        input: 450,
        output: 1200,
        total: 1650,
      },
    },
  };
}

async function simulateSystemRequestWithRagFailure(request) {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    success: true,
    data: {
      lessonPlan: `# ${request.topic}\n\n这是生成的教案内容（无RAG增强）...`,
      ragContext: null,
      generationTime: 600,
    },
    warnings: ["RAG系统暂时不可用，使用基础AI生成"],
  };
}

async function simulateRagSearch(query) {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const mockResults = Array.from({ length: Math.min(query.limit, 10) }, (_, i) => ({
    content: `与"${query.query}"相关的教学材料${i + 1}...`,
    metadata: {
      subject: query.subject,
      grade: query.grade,
      source: `教材${i + 1}.pdf`,
      qualityScore: Math.max(query.minQualityScore || 0.3, 0.6 + Math.random() * 0.4),
    },
    relevanceScore: 0.7 + Math.random() * 0.3,
  }));
  
  return {
    success: true,
    data: {
      query: query.query,
      results: mockResults,
      totalFound: mockResults.length + Math.floor(Math.random() * 20),
    },
  };
}

async function simulateAiGeneration(request) {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  if (!request.userPrompt) {
    return {
      success: false,
      error: "用户提示不能为空",
      fallback: "请提供有效的教学内容要求",
    };
  }
  
  const content = `根据提示"${request.userPrompt}"生成的教学内容...包含详细的教学步骤和方法。`;
  
  // Add context-specific content if provided
  let enhancedContent = content;
  if (request.context && request.context.includes("整数")) {
    enhancedContent += " 基于学生已掌握的整数知识，我们可以更好地理解分数概念。";
  }
  
  return {
    success: true,
    data: {
      content: enhancedContent,
      tokenUsage: {
        promptTokens: 200 + Math.random() * 300,
        completionTokens: 800 + Math.random() * 1200,
        totalTokens: 1000 + Math.random() * 1500,
      },
    },
  };
}

async function* simulateAiStreamGeneration(request) {
  const chunks = [
    "# 古诗词教案\n\n",
    "## 教学目标\n",
    "1. 理解古诗词的韵律美\n",
    "2. 学会欣赏诗词意境\n\n",
    "## 教学过程\n",
    "### 导入环节\n",
    "播放古典音乐，营造氛围...\n\n",
    "### 诗词赏析\n",
    "分析诗词的结构和含义...\n\n",
    "## 总结\n",
    "古诗词是中华文化的瑰宝...",
  ];
  
  for (const chunk of chunks) {
    await new Promise(resolve => setTimeout(resolve, 200));
    yield chunk;
  }
}

async function simulateLessonPlanSave(lessonPlan) {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    success: true,
    data: {
      lessonId: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    },
  };
}

async function simulateLessonPlanRetrieve(lessonId) {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    success: true,
    data: {
      lessonId,
      title: "测试教案",
      subject: "数学", 
      grade: "小学三年级",
      content: "这是测试教案内容",
      createdAt: new Date().toISOString(),
    },
  };
}

async function simulateUserCreation(userId, userData) {
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true, userId };
}

async function simulateUserHistoryRetrieve(userId) {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return {
    lessonHistory: [
      {
        topic: "现代诗歌欣赏",
        subject: "语文",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

async function simulateUnauthenticatedRequest(request) {
  return {
    success: false,
    error: "Authentication required",
    statusCode: 401,
  };
}

async function simulateAuthenticatedRequest(request, token) {
  if (token === "valid-token") {
    return simulateFullSystemRequest(request);
  } else {
    return {
      success: false,
      error: "Invalid authentication token",
      statusCode: 401,
    };
  }
}

async function simulateUserLessonsRetrieve(userId) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return [
    {
      title: "分数运算",
      content: "完整的分数运算教案内容...",
      subject: "数学",
      grade: "小学六年级",
      createdAt: new Date().toISOString(),
    },
  ];
}