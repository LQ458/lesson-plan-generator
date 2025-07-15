const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../server");
const User = require("../../models/user-model");
const LessonPlan = require("../../models/LessonPlan");
const Exercise = require("../../models/Exercise");

// 设置测试超时
jest.setTimeout(30000);

// 测试数据库连接
const MONGODB_URI =
  process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/teachai_test";

describe("内容API集成测试", () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // 如果已经连接，先断开连接
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // 连接测试数据库
    await mongoose.connect(MONGODB_URI);

    // 创建测试用户
    testUser = new User({
      username: "testuser",
      email: "test@example.com",
      role: "teacher",
    });
    await testUser.setPassword("password123");
    await testUser.save();

    // 模拟用户登录获取token
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      await User.deleteMany({});
      await LessonPlan.deleteMany({});
      await Exercise.deleteMany({});
    } catch (error) {
      console.warn("清理测试数据失败:", error.message);
    }

    // 关闭数据库连接
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (error) {
      console.warn("关闭数据库连接失败:", error.message);
    }
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    await LessonPlan.deleteMany({ userId: testUser._id });
    await Exercise.deleteMany({ userId: testUser._id });
  });

  describe("POST /api/content/lesson-plans", () => {
    test("成功创建教案", async () => {
      const lessonPlanData = {
        title: "小数加法教案",
        subject: "数学",
        grade: "三年级",
        topic: "小数加法",
        content:
          "# 小数加法\n\n## 教学目标\n1. 理解小数加法的概念\n2. 掌握小数加法的计算方法",
        structuredData: {
          detailedObjectives: ["理解小数加法的概念", "掌握小数加法的计算方法"],
          keyPoints: ["小数点对齐", "按位相加"],
          difficulties: ["小数点位置的理解"],
          teachingMethods: ["讲解法", "练习法"],
          teachingProcess: [
            {
              stage: "导入",
              duration: 5,
              content: ["复习整数加法", "引入小数概念"],
            },
          ],
          duration: 45,
        },
        tags: ["数学", "三年级", "小数"],
      };

      const response = await request(app)
        .post("/api/content/lesson-plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send(lessonPlanData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("小数加法教案");
      expect(response.body.data.subject).toBe("数学");
      expect(response.body.data.userId).toBe(testUser._id.toString());

      // 验证数据库中的数据
      const savedLessonPlan = await LessonPlan.findById(response.body.data._id);
      expect(savedLessonPlan).toBeTruthy();
      expect(savedLessonPlan.title).toBe("小数加法教案");
    });

    test("缺少必要字段时返回400", async () => {
      const incompleteData = {
        title: "不完整教案",
        // 缺少 subject, grade, topic 等必要字段
      };

      const response = await request(app)
        .post("/api/content/lesson-plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("缺少必要字段");
    });

    test("未授权访问返回401", async () => {
      const lessonPlanData = {
        title: "测试教案",
        subject: "数学",
        grade: "三年级",
        topic: "测试主题",
        content: "测试内容",
      };

      const response = await request(app)
        .post("/api/content/lesson-plans")
        .send(lessonPlanData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("重复教案返回409", async () => {
      const lessonPlanData = {
        title: "重复教案",
        subject: "数学",
        grade: "三年级",
        topic: "重复主题",
        content: "重复内容",
      };

      // 第一次创建
      await request(app)
        .post("/api/content/lesson-plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send(lessonPlanData);

      // 第二次创建相同内容
      const response = await request(app)
        .post("/api/content/lesson-plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send(lessonPlanData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("教案已存在");
    });
  });

  describe("GET /api/content/lesson-plans", () => {
    beforeEach(async () => {
      // 创建测试数据
      await LessonPlan.create([
        {
          title: "数学教案1",
          subject: "数学",
          grade: "三年级",
          topic: "加法",
          content: "数学内容1",
          userId: testUser._id,
          createdAt: new Date("2024-01-01"),
        },
        {
          title: "语文教案1",
          subject: "语文",
          grade: "三年级",
          topic: "阅读",
          content: "语文内容1",
          userId: testUser._id,
          createdAt: new Date("2024-01-02"),
        },
        {
          title: "数学教案2",
          subject: "数学",
          grade: "四年级",
          topic: "乘法",
          content: "数学内容2",
          userId: testUser._id,
          createdAt: new Date("2024-01-03"),
        },
      ]);
    });

    test("获取用户的所有教案", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(response.body.data[0].title).toBe("数学教案2"); // 按创建时间倒序
    });

    test("按科目筛选教案", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans?subject=数学")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every((plan) => plan.subject === "数学")).toBe(
        true,
      );
    });

    test("按年级筛选教案", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans?grade=三年级")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every((plan) => plan.grade === "三年级")).toBe(
        true,
      );
    });

    test("搜索教案", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans?search=加法")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].topic).toBe("加法");
    });

    test("分页功能", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans?page=1&limit=2")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });

    test("排序功能", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans?sortBy=title&sortOrder=asc")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].title).toBe("数学教案1");
      expect(response.body.data[1].title).toBe("数学教案2");
      expect(response.body.data[2].title).toBe("语文教案1");
    });
  });

  describe("GET /api/content/lesson-plans/:id", () => {
    let testLessonPlan;

    beforeEach(async () => {
      testLessonPlan = await LessonPlan.create({
        title: "详细教案",
        subject: "数学",
        grade: "三年级",
        topic: "详细主题",
        content: "详细内容",
        userId: testUser._id,
        structuredData: {
          detailedObjectives: ["目标1", "目标2"],
          keyPoints: ["重点1", "重点2"],
          difficulties: ["难点1"],
          teachingMethods: ["方法1"],
          teachingProcess: [
            {
              stage: "导入",
              duration: 5,
              content: ["导入内容"],
            },
          ],
        },
      });
    });

    test("获取单个教案详情", async () => {
      const response = await request(app)
        .get(`/api/content/lesson-plans/${testLessonPlan._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("详细教案");
      expect(response.body.data.structuredData.detailedObjectives).toHaveLength(
        2,
      );
    });

    test("获取不存在的教案返回404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/content/lesson-plans/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test("获取其他用户的教案返回403", async () => {
      // 创建另一个用户的教案
      const otherUser = await User.create({
        username: "otheruser",
        email: "other@example.com",
        password: "password123",
      });

      const otherLessonPlan = await LessonPlan.create({
        title: "其他用户教案",
        subject: "数学",
        grade: "三年级",
        topic: "其他主题",
        content: "其他内容",
        userId: otherUser._id,
      });

      const response = await request(app)
        .get(`/api/content/lesson-plans/${otherLessonPlan._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // 清理
      await User.findByIdAndDelete(otherUser._id);
      await LessonPlan.findByIdAndDelete(otherLessonPlan._id);
    });
  });

  describe("PUT /api/content/lesson-plans/:id", () => {
    let testLessonPlan;

    beforeEach(async () => {
      testLessonPlan = await LessonPlan.create({
        title: "原始教案",
        subject: "数学",
        grade: "三年级",
        topic: "原始主题",
        content: "原始内容",
        userId: testUser._id,
      });
    });

    test("成功更新教案", async () => {
      const updateData = {
        title: "更新后教案",
        content: "更新后内容",
        structuredData: {
          detailedObjectives: ["新目标1", "新目标2"],
        },
      };

      const response = await request(app)
        .put(`/api/content/lesson-plans/${testLessonPlan._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("更新后教案");
      expect(response.body.data.content).toBe("更新后内容");

      // 验证数据库中的数据
      const updatedLessonPlan = await LessonPlan.findById(testLessonPlan._id);
      expect(updatedLessonPlan.title).toBe("更新后教案");
      expect(updatedLessonPlan.structuredData.detailedObjectives).toHaveLength(
        2,
      );
    });

    test("部分更新教案", async () => {
      const updateData = {
        title: "部分更新标题",
      };

      const response = await request(app)
        .put(`/api/content/lesson-plans/${testLessonPlan._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("部分更新标题");
      expect(response.body.data.subject).toBe("数学"); // 原有字段保持不变
    });
  });

  describe("DELETE /api/content/lesson-plans/:id", () => {
    let testLessonPlan;

    beforeEach(async () => {
      testLessonPlan = await LessonPlan.create({
        title: "待删除教案",
        subject: "数学",
        grade: "三年级",
        topic: "待删除主题",
        content: "待删除内容",
        userId: testUser._id,
      });
    });

    test("成功删除教案", async () => {
      const response = await request(app)
        .delete(`/api/content/lesson-plans/${testLessonPlan._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("教案删除成功");

      // 验证数据库中的数据已被删除
      const deletedLessonPlan = await LessonPlan.findById(testLessonPlan._id);
      expect(deletedLessonPlan).toBeNull();
    });

    test("删除不存在的教案返回404", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/content/lesson-plans/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/content/exercises", () => {
    test("成功创建练习题", async () => {
      const exerciseData = {
        title: "小数加法练习",
        subject: "数学",
        grade: "三年级",
        topic: "小数加法",
        difficulty: "easy",
        content:
          "## 练习题\n\n1. 计算 0.5 + 0.3 = ?\nA) 0.8  B) 0.7  C) 0.9\n\n答案：A",
        questionType: "选择题",
        tags: ["数学", "三年级", "小数", "练习题"],
      };

      const response = await request(app)
        .post("/api/content/exercises")
        .set("Authorization", `Bearer ${authToken}`)
        .send(exerciseData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("小数加法练习");
      expect(response.body.data.difficulty).toBe("easy");
      expect(response.body.data.userId).toBe(testUser._id.toString());

      // 验证数据库中的数据
      const savedExercise = await Exercise.findById(response.body.data._id);
      expect(savedExercise).toBeTruthy();
      expect(savedExercise.questionType).toBe("选择题");
    });

    test("无效难度等级返回400", async () => {
      const exerciseData = {
        title: "无效练习题",
        subject: "数学",
        grade: "三年级",
        topic: "测试",
        difficulty: "invalid_difficulty", // 无效难度
        content: "测试内容",
      };

      const response = await request(app)
        .post("/api/content/exercises")
        .set("Authorization", `Bearer ${authToken}`)
        .send(exerciseData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("无效的难度等级");
    });
  });

  describe("统计接口测试", () => {
    beforeEach(async () => {
      // 创建统计测试数据
      await LessonPlan.create([
        {
          title: "统计教案1",
          subject: "数学",
          grade: "三年级",
          topic: "统计主题1",
          content: "统计内容1",
          userId: testUser._id,
          stats: { viewCount: 10, exportCount: 2 },
        },
        {
          title: "统计教案2",
          subject: "语文",
          grade: "三年级",
          topic: "统计主题2",
          content: "统计内容2",
          userId: testUser._id,
          stats: { viewCount: 5, exportCount: 1 },
        },
      ]);

      await Exercise.create([
        {
          title: "统计练习1",
          subject: "数学",
          grade: "三年级",
          topic: "统计主题1",
          difficulty: "easy",
          content: "统计练习内容1",
          userId: testUser._id,
          stats: { viewCount: 8, exportCount: 3 },
        },
      ]);
    });

    test("获取用户内容统计", async () => {
      const response = await request(app)
        .get("/api/content/stats")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLessonPlans).toBe(2);
      expect(response.body.data.totalExercises).toBe(1);
      expect(response.body.data.totalViews).toBe(23); // 10 + 5 + 8
      expect(response.body.data.totalExports).toBe(6); // 2 + 1 + 3
    });

    test("获取科目分布统计", async () => {
      const response = await request(app)
        .get("/api/content/stats/subjects")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.find((s) => s.subject === "数学").count).toBe(
        2,
      ); // 1教案 + 1练习
      expect(response.body.data.find((s) => s.subject === "语文").count).toBe(
        1,
      ); // 1教案
    });
  });

  describe("性能测试", () => {
    test("大量数据查询性能", async () => {
      // 创建大量测试数据
      const lessonPlans = Array.from({ length: 100 }, (_, i) => ({
        title: `性能测试教案${i}`,
        subject: i % 2 === 0 ? "数学" : "语文",
        grade: "三年级",
        topic: `性能测试主题${i}`,
        content: `性能测试内容${i}`,
        userId: testUser._id,
        createdAt: new Date(Date.now() - i * 1000), // 不同的创建时间
      }));

      await LessonPlan.insertMany(lessonPlans);

      const startTime = Date.now();
      const response = await request(app)
        .get("/api/content/lesson-plans?limit=50")
        .set("Authorization", `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(50);
      expect(responseTime).toBeLessThan(1000); // 响应时间应少于1秒
    });

    test("并发请求处理", async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get("/api/content/lesson-plans")
          .set("Authorization", `Bearer ${authToken}`),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe("错误处理测试", () => {
    test("数据库连接错误处理", async () => {
      // 模拟数据库连接错误
      jest
        .spyOn(LessonPlan, "find")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/content/lesson-plans")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("服务器内部错误");

      // 恢复mock
      LessonPlan.find.mockRestore();
    });

    test("无效的ObjectId格式", async () => {
      const response = await request(app)
        .get("/api/content/lesson-plans/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("无效的ID格式");
    });
  });
});
