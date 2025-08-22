// 前端测试设置文件

// Jest DOM 扩展
require("@testing-library/jest-dom");

// 设置测试环境变量 - 优先使用环境变量，否则使用默认值
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Mock Next.js 路由
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    has: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => "/test-path",
  useParams: () => ({}),
}));

// Mock Next.js 图片组件 - 使用字符串而不是JSX
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props) {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

// Mock Web APIs
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock SettingsProvider
const mockSettings = {
  subject: "math",
  gradeLevel: "primary",
  easyMode: false,
};

const mockUpdateSettings = jest.fn();

jest.mock("@/lib/settings-context", () => ({
  useSettings: jest.fn(() => ({
    settings: mockSettings,
    updateSettings: mockUpdateSettings,
  })),
  getSubjectLabel: jest.fn((subject) =>
    subject === "math" ? "数学" : subject,
  ),
  getGradeLevelLabel: jest.fn((level) =>
    level === "primary" ? "小学" : level,
  ),
}));

// Mock ReactMarkdown
jest.mock("react-markdown", () => {
  const React = require("react");
  return function MockReactMarkdown({ children, ...props }) {
    return React.createElement(
      "div",
      {
        "data-testid": "react-markdown",
        ...props,
      },
      children,
    );
  };
});

// Mock remark-gfm
jest.mock("remark-gfm", () => () => {});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// 全局测试超时
jest.setTimeout(30000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
