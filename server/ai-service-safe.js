const winston = require("winston");

// Safe OpenAI import with fallback
let OpenAI;
try {
  OpenAI = require("openai");
} catch (error) {
  console.error("⚠️ OpenAI package not found. Please install it with: pnpm add openai");
  console.error("Error:", error.message);
  throw new Error("OpenAI dependency is required for AI service. Please run: pnpm add openai");
}

const VectorStore = require("./rag/services/vector-store");
const PerformanceOptimizer = require("./performance-optimization");
const vectorStore = new VectorStore();

// Copy the rest of the original ai-service.js content here
// This is just a safer import wrapper

module.exports = require("./ai-service");