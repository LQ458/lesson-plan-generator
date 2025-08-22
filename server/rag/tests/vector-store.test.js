/**
 * 向量存储服务测试
 */

// Mock ChromaDB before importing VectorStoreService
jest.mock("chromadb", () => ({
  ChromaClient: jest.fn(() => ({
    getCollection: jest.fn().mockRejectedValue(new Error("Collection not found")),
    createCollection: jest.fn().mockResolvedValue({
      add: jest.fn(),
      query: jest.fn().mockResolvedValue({
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      }),
      count: jest.fn().mockResolvedValue(0),
    }),
  })),
  DefaultEmbeddingFunction: jest.fn(),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const VectorStoreService = require("../services/vector-store");

describe("VectorStoreService", () => {
  let vectorStore;

  beforeEach(() => {
    vectorStore = new VectorStoreService();
  });

  describe("初始化", () => {
    test("能够创建VectorStoreService实例", () => {
      expect(vectorStore).toBeInstanceOf(VectorStoreService);
    });

    test("具有必要的方法", () => {
      expect(typeof vectorStore.getRelevantContext).toBe("function");
      expect(typeof vectorStore.addDocument).toBe("function");
      expect(typeof vectorStore.searchDocuments).toBe("function");
    });
  });

  describe("getRelevantContext", () => {
    test("能够处理空查询", async () => {
      const result = await vectorStore.getRelevantContext("", "", "", 100);
      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("sources");
      expect(result).toHaveProperty("totalResults");
      expect(result).toHaveProperty("usedResults");
    });

    test("能够处理正常查询", async () => {
      const result = await vectorStore.getRelevantContext(
        "数学",
        "三年级",
        "加法",
        100,
      );
      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("sources");
      expect(typeof result.totalResults).toBe("number");
      expect(typeof result.usedResults).toBe("number");
    });
  });

  describe("错误处理", () => {
    test("处理无效参数", async () => {
      const result = await vectorStore.getRelevantContext(null, null, null, 0);
      expect(result).toHaveProperty("context");
      expect(result.context).toBe("");
    });
  });
});
