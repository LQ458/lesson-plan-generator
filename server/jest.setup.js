// Mock environment variables
process.env.NODE_ENV = "test";
process.env.QWEN_API_KEY = "test-api-key";
process.env.QWEN_API_URL = "https://test-api.example.com";

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);
