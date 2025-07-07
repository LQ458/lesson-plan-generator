const request = require("supertest");
const express = require("express");
const { generateLessonPlan } = require("../ai-service");
const { VectorStoreService } = require("../rag/services/vector-store");

// Mock dependencies
jest.mock("../ai-service");
jest.mock("../rag/services/vector-store");

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

    const lessonPlan = await generateLessonPlan(topic, grade, subject);
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
      const mockLessonPlan = "这是一个测试课程计划";
      generateLessonPlan.mockResolvedValue(mockLessonPlan);

      const response = await request(app)
        .post("/api/generate-lesson-plan")
        .send({
          topic: "数学基础",
          grade: "小学三年级",
          subject: "数学",
        });

      expect(response.status).toBe(200);
      expect(response.body.lessonPlan).toBe(mockLessonPlan);
      expect(generateLessonPlan).toHaveBeenCalledWith(
        "数学基础",
        "小学三年级",
        "数学",
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
      generateLessonPlan.mockRejectedValue(new Error("AI service error"));

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
