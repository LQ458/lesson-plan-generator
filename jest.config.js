const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./web",
});

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // Handle module aliases
    "^@/(.*)$": "<rootDir>/web/src/$1",
    "^@/components/(.*)$": "<rootDir>/web/src/components/$1",
    "^@/app/(.*)$": "<rootDir>/web/src/app/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/web/.next/"],
  collectCoverageFrom: [
    "web/src/**/*.{js,jsx,ts,tsx}",
    "!web/src/**/*.d.ts",
    "!web/src/**/*.stories.{js,jsx,ts,tsx}",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(react-markdown|remark-.*|rehype-.*|unified|bail|is-plain-obj|trough|vfile|unist-.*|mdast-.*|micromark|decode-named-character-reference|character-entities|property-information|hast-util-.*|space-separated-tokens|comma-separated-tokens|web-namespaces|trim-lines|ccount|markdown-table|zwitch|longest-streak|devlop|html-void-elements)/)",
  ],
  testTimeout: 30000,
  // 后端测试配置
  projects: [
    {
      displayName: "frontend",
      testMatch: [
        "<rootDir>/web/src/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/web/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      ],
      testEnvironment: "jsdom",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.frontend.js"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/web/src/$1",
        "^@/components/(.*)$": "<rootDir>/web/src/components/$1",
        "^@/app/(.*)$": "<rootDir>/web/src/app/$1",
      },
      transformIgnorePatterns: [
        "node_modules/(?!(react-markdown|remark-.*|rehype-.*|unified|bail|is-plain-obj|trough|vfile|unist-.*|mdast-.*|micromark|decode-named-character-reference|character-entities|property-information|hast-util-.*|space-separated-tokens|comma-separated-tokens|web-namespaces|trim-lines|ccount|markdown-table|zwitch|longest-streak|devlop|html-void-elements)/)",
      ],
      transform: {
        "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
      },
      testPathIgnorePatterns: [
        "<rootDir>/node_modules/",
        "<rootDir>/web/.next/",
        "<rootDir>/server/",
      ],
    },
    {
      displayName: "backend",
      testMatch: ["<rootDir>/server/**/*.test.js"],
      testEnvironment: "node",
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/web/"],
      transformIgnorePatterns: ["<rootDir>/web/"],
    },
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);
