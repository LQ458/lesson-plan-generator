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
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);
