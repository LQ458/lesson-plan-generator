#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    colorLog("blue", `\n🚀 ${description}`);
    colorLog("cyan", `执行命令: ${command} ${args.join(" ")}`);
    colorLog("yellow", `工作目录: ${cwd}`);

    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        colorLog("green", `✅ ${description} 完成`);
        resolve();
      } else {
        colorLog("red", `❌ ${description} 失败 (退出码: ${code})`);
        reject(new Error(`${description} 失败`));
      }
    });

    child.on("error", (error) => {
      colorLog("red", `❌ ${description} 错误: ${error.message}`);
      reject(error);
    });
  });
}

async function checkPrerequisites() {
  colorLog("magenta", "🔍 检查测试环境...");

  // 检查Node.js版本
  const nodeVersion = process.version;
  colorLog("cyan", `Node.js版本: ${nodeVersion}`);

  // 检查项目结构
  const requiredDirs = ["web", "server", "e2e"];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      colorLog("red", `❌ 缺少目录: ${dir}`);
      process.exit(1);
    }
  }

  // 检查package.json文件
  const packageFiles = [
    "web/package.json",
    "server/package.json",
    "e2e/package.json",
  ];

  for (const file of packageFiles) {
    if (!fs.existsSync(file)) {
      colorLog("red", `❌ 缺少文件: ${file}`);
      process.exit(1);
    }
  }

  colorLog("green", "✅ 环境检查通过");
}

async function installDependencies() {
  colorLog("magenta", "📦 安装依赖...");

  const projects = [
    { name: "前端", path: "web" },
    { name: "后端", path: "server" },
    { name: "E2E测试", path: "e2e" },
  ];

  for (const project of projects) {
    try {
      await runCommand(
        "pnpm",
        ["install"],
        project.path,
        `安装${project.name}依赖`,
      );
    } catch (error) {
      colorLog("yellow", `⚠️  ${project.name}依赖安装失败，尝试使用npm...`);
      try {
        await runCommand(
          "npm",
          ["install"],
          project.path,
          `使用npm安装${project.name}依赖`,
        );
      } catch (npmError) {
        colorLog("red", `❌ ${project.name}依赖安装失败`);
        throw npmError;
      }
    }
  }
}

async function runUnitTests() {
  colorLog("magenta", "🧪 运行单元测试...");

  // 运行前端单元测试
  try {
    await runCommand(
      "npm",
      ["test", "--", "--watchAll=false", "--coverage"],
      "web",
      "前端单元测试",
    );
  } catch (error) {
    colorLog("yellow", "⚠️  前端单元测试失败，继续执行其他测试...");
  }

  // 运行后端单元测试
  try {
    await runCommand("npm", ["run", "test:coverage"], "server", "后端单元测试");
  } catch (error) {
    colorLog("yellow", "⚠️  后端单元测试失败，继续执行其他测试...");
  }
}

async function runIntegrationTests() {
  colorLog("magenta", "🔗 运行集成测试...");

  try {
    await runCommand(
      "npm",
      ["test", "--", "--testPathPattern=integration"],
      "server",
      "后端集成测试",
    );
  } catch (error) {
    colorLog("yellow", "⚠️  集成测试失败，继续执行其他测试...");
  }
}

async function runE2ETests() {
  colorLog("magenta", "🌐 运行E2E测试...");

  try {
    // 首先安装Playwright浏览器
    await runCommand(
      "npx",
      ["playwright", "install"],
      "e2e",
      "安装Playwright浏览器",
    );

    // 运行E2E测试
    await runCommand("npm", ["test"], "e2e", "E2E测试");
  } catch (error) {
    colorLog("yellow", "⚠️  E2E测试失败，这可能需要启动的服务器...");
  }
}

async function generateTestReport() {
  colorLog("magenta", "📊 生成测试报告...");

  const reportDir = "test-reports";
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // 复制覆盖率报告
  const coverageFiles = [
    { src: "web/coverage", dest: `${reportDir}/frontend-coverage` },
    { src: "server/coverage", dest: `${reportDir}/backend-coverage` },
  ];

  for (const file of coverageFiles) {
    if (fs.existsSync(file.src)) {
      try {
        await runCommand(
          "cp",
          ["-r", file.src, file.dest],
          ".",
          `复制${file.src}到${file.dest}`,
        );
      } catch (error) {
        colorLog("yellow", `⚠️  复制${file.src}失败`);
      }
    }
  }

  // 生成测试摘要
  const summary = {
    timestamp: new Date().toISOString(),
    testResults: {
      frontend: "请查看 test-reports/frontend-coverage",
      backend: "请查看 test-reports/backend-coverage",
      e2e: "请查看 e2e/test-results",
    },
    commands: {
      frontend: "cd web && npm test",
      backend: "cd server && npm test",
      e2e: "cd e2e && npm test",
    },
  };

  fs.writeFileSync(
    `${reportDir}/test-summary.json`,
    JSON.stringify(summary, null, 2),
  );
  colorLog("green", `✅ 测试报告生成完成: ${reportDir}/`);
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0];

  try {
    colorLog("bright", "🎯 TeachAI 测试套件");
    colorLog("bright", "==================");

    await checkPrerequisites();

    if (!testType || testType === "all") {
      colorLog("bright", "🚀 运行完整测试套件...");
      await installDependencies();
      await runUnitTests();
      await runIntegrationTests();
      await runE2ETests();
      await generateTestReport();
    } else {
      switch (testType) {
        case "unit":
          await installDependencies();
          await runUnitTests();
          break;
        case "integration":
          await installDependencies();
          await runIntegrationTests();
          break;
        case "e2e":
          await installDependencies();
          await runE2ETests();
          break;
        case "frontend":
          await runCommand("pnpm", ["install"], "web", "安装前端依赖");
          await runCommand(
            "npm",
            ["test", "--", "--watchAll=false"],
            "web",
            "前端测试",
          );
          break;
        case "backend":
          await runCommand("pnpm", ["install"], "server", "安装后端依赖");
          await runCommand("npm", ["test"], "server", "后端测试");
          break;
        case "watch":
          colorLog("blue", "🔄 启动监视模式...");
          await runCommand("npm", ["run", "test:watch"], "web", "前端监视模式");
          break;
        case "coverage":
          await installDependencies();
          await runCommand(
            "npm",
            ["run", "test:coverage"],
            "server",
            "后端覆盖率测试",
          );
          await runCommand(
            "npm",
            ["test", "--", "--coverage", "--watchAll=false"],
            "web",
            "前端覆盖率测试",
          );
          break;
        default:
          colorLog("red", "❌ 未知的测试类型");
          showUsage();
          process.exit(1);
      }
    }

    colorLog("green", "🎉 测试完成！");
  } catch (error) {
    colorLog("red", `❌ 测试失败: ${error.message}`);
    process.exit(1);
  }
}

function showUsage() {
  colorLog("bright", "\n📚 使用说明:");
  colorLog("cyan", "node scripts/run-tests.js [测试类型]");
  colorLog("yellow", "\n可用的测试类型:");
  colorLog("white", "  all         - 运行所有测试 (默认)");
  colorLog("white", "  unit        - 只运行单元测试");
  colorLog("white", "  integration - 只运行集成测试");
  colorLog("white", "  e2e         - 只运行E2E测试");
  colorLog("white", "  frontend    - 只运行前端测试");
  colorLog("white", "  backend     - 只运行后端测试");
  colorLog("white", "  watch       - 启动监视模式");
  colorLog("white", "  coverage    - 生成覆盖率报告");
  colorLog("yellow", "\n示例:");
  colorLog("white", "  node scripts/run-tests.js unit");
  colorLog("white", "  node scripts/run-tests.js frontend");
  colorLog("white", "  node scripts/run-tests.js coverage");
}

if (require.main === module) {
  main();
}

module.exports = { main, runCommand, colorLog };
