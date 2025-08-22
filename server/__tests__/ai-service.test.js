const { PassThrough } = require("stream");

// 创建Mock实例
const mockVectorStore = {
  getRelevantContext: jest.fn(),
  initialize: jest.fn(),
  search: jest.fn(),
};

// Mock dependencies
jest.mock("../rag/services/vector-store", () => {
  return jest.fn().mockImplementation(() => mockVectorStore);
});
jest.mock("openai");

const AIService = require("../ai-service");
const VectorStore = require("../rag/services/vector-store");

describe("AIService", () => {
  let aiService;
  let mockResponse;

  beforeEach(() => {
    // 设置测试环境变量
    process.env.DASHSCOPE_API_KEY = "test-api-key";
    process.env.AI_ENABLED = "true";

    // 创建mock响应对象
    mockResponse = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      headersSent: false,
      status: jest.fn().mockReturnThis(),
    };

    // 清理所有mock
    jest.clearAllMocks();

    // 创建AI服务实例
    aiService = new AIService();
  });

  afterEach(() => {
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.AI_ENABLED;
  });

  describe("构造函数", () => {
    test("正确初始化AI服务", () => {
      expect(aiService.enabled).toBe(true);
      expect(aiService.model).toBe("qwen-plus");
      expect(aiService.maxTokens).toBe(2000);
      expect(aiService.temperature).toBe(0.7);
    });

    test("缺少API密钥时抛出错误", () => {
      delete process.env.DASHSCOPE_API_KEY;

      expect(() => {
        new AIService();
      }).toThrow("DASHSCOPE_API_KEY 环境变量未设置");
    });

    test("从环境变量读取配置", () => {
      process.env.QWEN_MODEL = "qwen-turbo";
      process.env.AI_MAX_TOKENS = "1000";
      process.env.AI_TEMPERATURE = "0.5";
      process.env.AI_TOP_P = "0.9";

      const customService = new AIService();

      expect(customService.model).toBe("qwen-turbo");
      expect(customService.maxTokens).toBe(1000);
      expect(customService.temperature).toBe(0.5);
      expect(customService.topP).toBe(0.9);
    });
  });

  describe("generateRequestId", () => {
    test("生成唯一的请求ID", () => {
      const id1 = aiService.generateRequestId();
      const id2 = aiService.generateRequestId();

      expect(id1).toMatch(/^AI-\d{8}T\d{6}-\d{4}$/);
      expect(id2).toMatch(/^AI-\d{8}T\d{6}-\d{4}$/);
      expect(id1).not.toBe(id2);
    });

    test("请求计数器递增", () => {
      const id1 = aiService.generateRequestId();
      const id2 = aiService.generateRequestId();

      const counter1 = parseInt(id1.split("-")[2]);
      const counter2 = parseInt(id2.split("-")[2]);

      expect(counter2).toBe(counter1 + 1);
    });
  });

  describe("generateLessonPlanStream", () => {
    beforeEach(() => {
      // Mock vector store
      mockVectorStore.getRelevantContext.mockResolvedValue({
        context: "相关教学资料内容",
        sources: ["测试资料1.pdf", "测试资料2.pdf"],
        totalResults: 5,
        usedResults: 2,
      });

      // Mock OpenAI stream with realistic lesson plan content
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          // 模拟真实的教案内容
          const lessonContent = [
            "---\n",
            'title: "小数加法"\n',
            'subject: "数学"\n',
            'grade: "三年级"\n',
            "duration: 45\n",
            "detailedObjectives:\n",
            '  - "理解小数的概念和意义"\n',
            '  - "掌握小数加法的计算方法"\n',
            '  - "培养数学逻辑思维能力"\n',
            "keyPoints:\n",
            '  - "小数点对齐是关键"\n',
            '  - "理解小数的位值概念"\n',
            "difficulties:\n",
            '  - "小数点对齐的方法"\n',
            '  - "不同位数小数的加法"\n',
            "teachingMethods:\n",
            '  - "示例演示法"\n',
            '  - "练习巩固法"\n',
            "teachingProcess:\n",
            '  - stage: "导入新课"\n',
            "    duration: 5\n",
            "    content:\n",
            '      - "复习整数加法"\n',
            '      - "引入小数概念"\n',
            '  - stage: "新课讲解"\n',
            "    duration: 25\n",
            "    content:\n",
            '      - "讲解小数点对齐方法"\n',
            '      - "示范小数加法计算"\n',
            "homework:\n",
            '  - "完成课本第45页练习题"\n',
            '  - "预习下一课内容"\n',
            'reflection: "本节课学生掌握情况良好，需要加强练习"\n',
            "---\n\n",
            "# 小数加法\n\n",
            "**科目**: 数学 | **年级**: 三年级 | **课时**: 45分钟\n\n",
            "## 🎯 教学目标\n\n",
            "1. 理解小数的概念和意义\n",
            "2. 掌握小数加法的计算方法\n",
            "3. 培养数学逻辑思维能力\n\n",
            "## 📋 教学重点\n\n",
            "- 小数点对齐是关键\n",
            "- 理解小数的位值概念\n\n",
            "## 🔍 教学难点\n\n",
            "- 小数点对齐的方法\n",
            "- 不同位数小数的加法\n\n",
            "## 🎓 教学方法\n\n",
            "- 示例演示法\n",
            "- 练习巩固法\n\n",
            "## 📚 教学过程\n\n",
            "### 导入新课 (5分钟)\n\n",
            "- 复习整数加法\n",
            "- 引入小数概念\n\n",
            "### 新课讲解 (25分钟)\n\n",
            "- 讲解小数点对齐方法\n",
            "- 示范小数加法计算\n\n",
            "### 课堂练习 (10分钟)\n\n",
            "- 学生独立完成练习题\n",
            "- 教师巡视指导\n\n",
            "### 课堂小结 (5分钟)\n\n",
            "- 总结小数加法要点\n",
            "- 强调小数点对齐的重要性\n\n",
            "## 📝 课后作业\n\n",
            "- 完成课本第45页练习题\n",
            "- 预习下一课内容\n\n",
            "## 💭 教学反思\n\n",
            "本节课学生掌握情况良好，需要加强练习",
          ];

          // 逐块发送内容
          for (const chunk of lessonContent) {
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
              prompt_tokens: 500,
              completion_tokens: 1200,
              total_tokens: 1700,
            },
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
    });

    test("成功生成教案流", async () => {
      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        "重点讲解小数点对齐",
        mockResponse,
      );

      expect(mockVectorStore.getRelevantContext).toHaveBeenCalledWith(
        "数学 三年级 小数加法",
        "数学",
        "三年级",
        1500,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain; charset=utf-8",
      );
      expect(mockResponse.write).toHaveBeenCalledWith("---\n");
      expect(mockResponse.write).toHaveBeenCalledWith('title: "小数加法"\n');
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("处理RAG系统错误", async () => {
      mockVectorStore.getRelevantContext.mockRejectedValue(
        new Error("RAG系统错误"),
      );

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse,
      );

      // 应该继续执行，不因RAG错误而中断
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    test("AI服务未启用时抛出错误", async () => {
      aiService.enabled = false;

      await expect(
        aiService.generateLessonPlanStream(
          "数学",
          "三年级",
          "小数加法",
          null,
          mockResponse,
        ),
      ).rejects.toThrow("AI服务未启用");
    });
  });

  describe("generateExercisesStream", () => {
    beforeEach(() => {
      mockVectorStore.getRelevantContext.mockResolvedValue({
        context: "相关练习题资料",
        sources: ["练习题集1.pdf"],
        totalResults: 3,
        usedResults: 1,
      });

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          // 模拟真实的练习题内容
          const exerciseContent = [
            "# 小数加法练习题\n\n",
            "**科目**: 数学 | **年级**: 三年级 | **难度**: 简单\n\n",
            "## 选择题\n\n",
            "1. 计算 0.5 + 0.3 的结果是：\n",
            "   A) 0.8\n",
            "   B) 0.7\n",
            "   C) 0.9\n",
            "   D) 0.6\n\n",
            "**答案**: A\n",
            "**解析**: 小数加法需要将小数点对齐，0.5 + 0.3 = 0.8\n\n",
            "2. 下列小数加法计算正确的是：\n",
            "   A) 1.2 + 0.5 = 1.7\n",
            "   B) 0.8 + 0.4 = 1.3\n",
            "   C) 0.6 + 0.7 = 1.4\n",
            "   D) 0.9 + 0.2 = 1.0\n\n",
            "**答案**: A\n",
            "**解析**: 1.2 + 0.5 = 1.7，其他选项计算错误\n\n",
            "## 填空题\n\n",
            "3. 0.4 + 0.6 = ____\n",
            "**答案**: 1.0\n\n",
            "4. 2.3 + 1.5 = ____\n",
            "**答案**: 3.8\n\n",
            "## 计算题\n\n",
            "5. 请计算下列小数加法：\n",
            "   (1) 0.7 + 0.8 = ____\n",
            "   (2) 1.4 + 2.6 = ____\n",
            "   (3) 3.2 + 0.9 = ____\n\n",
            "**答案**:\n",
            "(1) 1.5\n",
            "(2) 4.0\n",
            "(3) 4.1\n\n",
            "**解析**: 小数加法时要注意小数点对齐，从右往左逐位相加\n\n",
            "## 应用题\n\n",
            "6. 小明买了一支铅笔花费0.8元，一块橡皮花费0.5元，他一共花了多少钱？\n\n",
            "**解答**: 0.8 + 0.5 = 1.3元\n",
            "**答案**: 小明一共花了1.3元\n\n",
            "## 总结\n\n",
            "小数加法的关键要点：\n",
            "1. 小数点必须对齐\n",
            "2. 从右往左逐位相加\n",
            "3. 注意进位处理\n",
            "4. 结果要保持小数点位置正确",
          ];

          // 逐块发送内容
          for (const chunk of exerciseContent) {
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
              prompt_tokens: 400,
              completion_tokens: 800,
              total_tokens: 1200,
            },
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
    });

    test("成功生成练习题流", async () => {
      await aiService.generateExercisesStream(
        "数学",
        "三年级",
        "小数加法",
        "easy",
        5,
        "选择题",
        "注重基础",
        mockResponse,
      );

      expect(mockVectorStore.getRelevantContext).toHaveBeenCalledWith(
        "数学 三年级 小数加法 练习题 习题",
        "数学",
        "三年级",
        1200,
      );

      expect(mockResponse.write).toHaveBeenCalledWith("# 小数加法练习题\n\n");
      expect(mockResponse.write).toHaveBeenCalledWith(
        "1. 计算 0.5 + 0.3 的结果是：\n",
      );
    });

    test("检查年级科目限制", async () => {
      // 测试不合理的年级科目组合
      await expect(
        aiService.generateExercisesStream(
          "物理",
          "一年级",
          "力学",
          "easy",
          5,
          "选择题",
          null,
          mockResponse,
        ),
      ).rejects.toThrow("一年级暂不支持物理科目");
    });

    test("处理难度映射", async () => {
      await aiService.generateExercisesStream(
        "数学",
        "三年级",
        "小数加法",
        "medium",
        5,
        "选择题",
        null,
        mockResponse,
      );

      // 验证系统提示词包含正确的难度
      const createCall =
        aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.messages[1].content).toContain("难度：中等");
    });
  });

  describe("analyzeContent", () => {
    beforeEach(() => {
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: "分析结果",
                  },
                },
              ],
            }),
          },
        },
      };
    });

    test("成功分析内容", async () => {
      const result = await aiService.analyzeContent(
        "这是要分析的内容",
        "质量评估",
      );

      expect(result).toBe("分析结果");
      expect(aiService.openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "qwen-turbo",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
            }),
            expect.objectContaining({
              role: "user",
            }),
          ]),
        }),
      );
    });

    test("概念提取使用特殊配置", async () => {
      await aiService.analyzeContent("教学内容", "概念提取");

      const createCall =
        aiService.openai.chat.completions.create.mock.calls[0][0];
      expect(createCall.max_tokens).toBe(50);
      expect(createCall.temperature).toBe(0.1);
    });

    test("AI服务未启用时抛出错误", async () => {
      aiService.enabled = false;

      await expect(
        aiService.analyzeContent("内容", "质量评估"),
      ).rejects.toThrow("AI服务未启用");
    });
  });

  describe("getStatus", () => {
    test("返回服务状态", () => {
      const status = aiService.getStatus();

      expect(status).toEqual({
        enabled: true,
        model: "qwen-turbo",
        maxTokens: 1000,
        temperature: 0.5,
        topP: 0.9,
        apiConfigured: true,
        usingOpenAICompatible: true,
      });
    });

    test("API未配置时返回false", () => {
      // 暂时保存原始值
      const originalKey = process.env.DASHSCOPE_API_KEY;

      // 删除环境变量
      delete process.env.DASHSCOPE_API_KEY;

      // 测试构造函数应该抛出错误
      expect(() => {
        new AIService();
      }).toThrow("DASHSCOPE_API_KEY 环境变量未设置");

      // 恢复环境变量
      process.env.DASHSCOPE_API_KEY = originalKey;
    });
  });

  describe("错误处理", () => {
    test("处理OpenAI API错误", async () => {
      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error("API错误")),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.write).toHaveBeenCalledWith("AI服务错误: API错误");
    });

    test("处理网络超时", async () => {
      const timeoutError = new Error("网络超时");
      timeoutError.code = "ECONNABORTED";

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(timeoutError),
          },
        },
      };

      await aiService.generateLessonPlanStream(
        "数学",
        "三年级",
        "小数加法",
        null,
        mockResponse,
      );

      expect(mockResponse.write).toHaveBeenCalledWith("AI服务错误: 网络超时");
    });
  });

  describe("性能测试", () => {
    test("并发请求处理", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "内容" } }] };
        },
      };

      aiService.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream),
          },
        },
      };

      const promises = Array.from({ length: 5 }, (_, i) =>
        aiService.generateLessonPlanStream("数学", "三年级", `主题${i}`, null, {
          ...mockResponse,
          write: jest.fn(),
          end: jest.fn(),
          setHeader: jest.fn(),
        }),
      );

      await Promise.all(promises);

      expect(aiService.openai.chat.completions.create).toHaveBeenCalledTimes(5);
    });

    test("请求ID唯一性在并发场景下", () => {
      const ids = Array.from({ length: 100 }, () =>
        aiService.generateRequestId(),
      );
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
    });
  });
});
