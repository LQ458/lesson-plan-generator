const request = require("supertest");
const express = require("express");
const AIService = require("../ai-service");
const VectorStoreService = require("../rag/services/vector-store");

// Mock dependencies
jest.mock("../ai-service");
jest.mock("../rag/services/vector-store");

// Create mock AI service instance
const mockAIService = {
  generateLessonPlanStream: jest.fn(),
  generateExercisesStream: jest.fn(),
  analyzeContent: jest.fn(),
  getStatus: jest.fn(),
};

AIService.mockImplementation(() => mockAIService);

// Create test app
const app = express();
app.use(express.json());

// Add test routes
app.post("/api/generate-lesson-plan", async (req, res) => {
  try {
    const { topic, grade, subject } = req.body;

    if (!topic || !grade || !subject) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    const aiService = new AIService();

    // 创建一个简单的收集器来收集流式输出
    let lessonPlan = "";
    const mockRes = {
      write: (chunk) => {
        lessonPlan += chunk;
      },
      end: () => {},
      setHeader: () => {},
      status: () => mockRes,
    };

    await aiService.generateLessonPlanStream(
      subject,
      grade,
      topic,
      null,
      mockRes,
    );
    res.json({ lessonPlan });
  } catch (error) {
    res.status(500).json({ error: "生成课程计划失败" });
  }
});

describe("API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/generate-lesson-plan", () => {
    it("should generate lesson plan successfully", async () => {
      // 简化测试，避免复杂的Promise处理
      mockAIService.generateLessonPlanStream.mockImplementation(
        (subject, grade, topic, requirements, res) => {
          res.write("模拟课程计划内容");
          res.end();
        },
      );

      const response = await request(app)
        .post("/api/generate-lesson-plan")
        .send({
          topic: "数学基础",
          grade: "小学三年级",
          subject: "数学",
        });

      expect(response.status).toBe(200);
      expect(response.body.lessonPlan).toBe("模拟课程计划内容");
      expect(mockAIService.generateLessonPlanStream).toHaveBeenCalledWith(
        "数学",
        "小学三年级",
        "数学基础",
        null,
        expect.any(Object),
      );
    });

    it("should return 400 for missing parameters", async () => {
      const response = await request(app)
        .post("/api/generate-lesson-plan")
        .send({
          topic: "数学基础",
          // 缺少 grade 和 subject
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("缺少必要参数");
    });

    it("should return 500 for generation error", async () => {
      mockAIService.generateLessonPlanStream.mockImplementation(() => {
        throw new Error("AI service error");
      });

      const response = await request(app)
        .post("/api/generate-lesson-plan")
        .send({
          topic: "数学基础",
          grade: "小学三年级",
          subject: "数学",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("生成课程计划失败");
    });
  });
});
