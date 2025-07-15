#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

// 简单的颜色输出
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(name, command, args, cwd) {
  return new Promise((resolve) => {
    log("blue", `\n🧪 运行${name}测试...`);

    const child = spawn(command, args, {
      cwd: cwd,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        log("green", `✅ ${name}测试通过`);
      } else {
        log("red", `❌ ${name}测试失败`);
      }
      resolve(code === 0);
    });

    child.on("error", (error) => {
      log("red", `❌ ${name}测试错误: ${error.message}`);
      resolve(false);
    });
  });
}

async function main() {
  const testType = process.argv[2];

  log("blue", "🎯 TeachAI 简单测试运行器");
  log("blue", "===========================");

  let results = [];

  switch (testType) {
    case "backend":
      log("yellow", "运行后端测试...");
      results.push(
        await runTest(
          "后端基础",
          "npm",
          ["test", "--", "--testPathPattern=api.test.js"],
          "server",
        ),
      );
      break;

    case "frontend":
      log("yellow", "运行前端测试...");
      results.push(
        await runTest(
          "前端基础",
          "npm",
          [
            "test",
            "--",
            "--watchAll=false",
            "--testPathPattern=StreamingMarkdown",
          ],
          "web",
        ),
      );
      break;

    case "e2e":
      log("yellow", "运行E2E测试...");
      results.push(
        await runTest(
          "E2E基础",
          "npm",
          ["test", "--", "--project=chromium"],
          "e2e",
        ),
      );
      break;

    case "unit":
      log("yellow", "运行单元测试...");
      results.push(
        await runTest(
          "后端单元",
          "npm",
          ["test", "--", "--testPathPattern=api.test.js"],
          "server",
        ),
      );
      results.push(
        await runTest(
          "前端单元",
          "npm",
          [
            "test",
            "--",
            "--watchAll=false",
            "--testPathPattern=StreamingMarkdown",
          ],
          "web",
        ),
      );
      break;

    default:
      log("yellow", "使用方法:");
      log("blue", "node scripts/simple-test.js [类型]");
      log("blue", "");
      log("blue", "可用类型:");
      log("blue", "  backend   - 后端测试");
      log("blue", "  frontend  - 前端测试");
      log("blue", "  e2e       - E2E测试");
      log("blue", "  unit      - 单元测试");
      return;
  }

  // 显示结果
  const passed = results.filter((r) => r).length;
  const total = results.length;

  log("blue", "\n📊 测试结果:");
  log(passed === total ? "green" : "red", `${passed}/${total} 测试通过`);

  if (passed === total) {
    log("green", "🎉 所有测试都通过了！");
  } else {
    log("yellow", "⚠️  部分测试失败，请查看上面的详细信息");
  }
}

main().catch(console.error);
