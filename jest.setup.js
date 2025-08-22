// 后端测试设置文件

// 设置测试环境变量 - 优先使用环境变量，否则使用默认值
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/teachai";
process.env.MONGODB_TEST_URI =
  process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/teachai_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
process.env.AI_ENABLED = process.env.AI_ENABLED || "true";
process.env.INVITE_CODE = process.env.INVITE_CODE || "TEST123";
process.env.DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "test-api-key";
process.env.QWEN_MODEL = process.env.QWEN_MODEL || "qwen-plus";
process.env.AI_MAX_TOKENS = process.env.AI_MAX_TOKENS || "2000";
process.env.AI_TEMPERATURE = process.env.AI_TEMPERATURE || "0.7";
process.env.AI_TOP_P = process.env.AI_TOP_P || "0.9";
process.env.CHROMA_HOST = process.env.CHROMA_HOST || "localhost";
process.env.CHROMA_PORT = process.env.CHROMA_PORT || "8000";
process.env.CHROMA_COLLECTION_NAME =
  process.env.CHROMA_COLLECTION_NAME || "teaching_materials";

// Mock fetch for backend tests
global.fetch = jest.fn();

// 全局测试超时
jest.setTimeout(30000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
  if (global.fetch) {
    global.fetch.mockClear();
  }
});
