const express = require("express");
const router = express.Router();
const {
  LessonPlan,
  Exercise,
  ExportHistory,
} = require("../models/content-model");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, UserFriendlyError } = require("../utils/error-handler");
const winston = require("winston");
const puppeteer = require("puppeteer");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");
const MarkdownIt = require("markdown-it");

const execAsync = promisify(exec);

// 配置日志
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "export-api" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level} 📤[EXPORT] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
        }),
      ),
    }),
  ],
});

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// 创建临时目录
const tempDir = path.join(__dirname, "../temp");
async function ensureTempDir() {
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }
}

// 导出格式处理函数
const exportFormatters = {
  // Markdown格式
  markdown: (content, options = {}) => {
    return {
      content,
      filename: `教案_${Date.now()}.md`,
      mimeType: "text/markdown",
    };
  },

  // HTML格式
  html: (content, options = {}) => {
    const { theme = "default", fontSize = 12 } = options;

    // 简单的HTML模板
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>教案文档</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            font-size: ${fontSize}px;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { border-left: 4px solid #e74c3c; padding-left: 10px; }
        ul, ol { padding-left: 20px; }
        blockquote {
            border-left: 4px solid #f39c12;
            margin: 1em 0;
            padding: 0 1em;
            background-color: #fdf6e3;
        }
        code {
            background-color: #f8f8f8;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background-color: #f8f8f8;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .print-date {
            text-align: right;
            color: #7f8c8d;
            font-size: 0.9em;
            margin-bottom: 2em;
        }
    </style>
</head>
<body>
    <div class="print-date">导出时间: ${new Date().toLocaleString("zh-CN")}</div>
    ${md.render(content)}
</body>
</html>`;

    return {
      content: htmlTemplate,
      filename: `教案_${Date.now()}.html`,
      mimeType: "text/html",
    };
  },

  // 纯文本格式
  txt: (content, options = {}) => {
    // 移除Markdown语法，转换为纯文本
    let textContent = content
      .replace(/^#{1,6}\s+/gm, "") // 移除标题标记
      .replace(/\*\*(.*?)\*\*/g, "$1") // 移除粗体标记
      .replace(/\*(.*?)\*/g, "$1") // 移除斜体标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 移除链接，保留文本
      .replace(/```[\s\S]*?```/g, "") // 移除代码块
      .replace(/`([^`]+)`/g, "$1") // 移除行内代码标记
      .replace(/^\s*[-\*\+]\s+/gm, "• ") // 转换列表标记
      .replace(/^\s*\d+\.\s+/gm, "") // 移除有序列表标记
      .replace(/^\s*>\s+/gm, ""); // 移除引用标记

    return {
      content: textContent,
      filename: `教案_${Date.now()}.txt`,
      mimeType: "text/plain",
    };
  },

  // PDF导出
  pdf: async (content, options = {}) => {
    await ensureTempDir();

    const os = require("os");

    let browser;
    let page;
    try {
      // 针对不同操作系统优化puppeteer配置
      const puppeteerArgs = ["--no-sandbox", "--disable-setuid-sandbox"];

      // macOS特定优化
      if (os.platform() === "darwin") {
        puppeteerArgs.push(
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--disable-extensions",
        );

        // ARM64 Mac (M1/M2) 特殊优化
        if (process.arch === "arm64") {
          puppeteerArgs.push(
            "--disable-features=VizDisplayCompositor",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
          );
        }
      }

      // Linux特定配置
      if (os.platform() === "linux") {
        puppeteerArgs.push(
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--single-process",
        );
      }

      logger.info("🖥️ [PDF] 启动浏览器", {
        platform: os.platform(),
        args: puppeteerArgs,
      });

      browser = await puppeteer.launch({
        headless: "new",
        args: puppeteerArgs,
      });

      page = await browser.newPage();

      // 设置页面超时，防止无限等待
      page.setDefaultTimeout(30000); // 30秒超时
      page.setDefaultNavigationTimeout(30000);

      // 转换Markdown为HTML
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>教案文档</title>
    <style>
        body {
            font-family: 'PingFang SC', 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
        }
        h1 { 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px;
            font-size: 24px;
        }
        h2 { 
            border-left: 4px solid #e74c3c; 
            padding-left: 10px;
            font-size: 20px;
        }
        h3 { font-size: 18px; }
        ul, ol { 
            padding-left: 20px;
            page-break-inside: avoid;
        }
        li { margin-bottom: 5px; }
        blockquote {
            border-left: 4px solid #f39c12;
            margin: 1em 0;
            padding: 0 1em;
            background-color: #fdf6e3;
            page-break-inside: avoid;
        }
        code {
            background-color: #f8f8f8;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        }
        pre {
            background-color: #f8f8f8;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            page-break-inside: avoid;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .print-date {
            text-align: right;
            color: #7f8c8d;
            font-size: 12px;
            margin-bottom: 2em;
        }
        .page-break { page-break-before: always; }
        @media print {
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="print-date">导出时间: ${new Date().toLocaleString("zh-CN")}</div>
    ${md.render(content)}
</body>
</html>`;

      // 写入调试用HTML文件
      const debugFile = path.join(tempDir, "pdf_debug.html");
      await fs.writeFile(debugFile, htmlContent, "utf8");
      logger.info("📄 [PDF] 调试HTML已写入", { debugFile });

      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // 等待字体加载，设置超时
      await Promise.race([
        page.evaluateHandle("document.fonts.ready"),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Font loading timeout')), 10000)
        )
      ]);

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
      });

      // 验证PDF格式
      const headerBytes = Array.from(pdfBuffer.slice(0, 8));
      const pdfHeader = String.fromCharCode(...headerBytes);
      logger.info("📄 [PDF] 生成的PDF文件头:", {
        header: pdfHeader,
        headerBytes,
        size: pdfBuffer.length,
      });

      if (!pdfHeader.startsWith("%PDF-")) {
        logger.error("❌ [PDF] 生成的PDF格式异常", {
          header: pdfHeader,
          headerBytes,
        });
        throw new Error("PDF格式生成异常");
      } else {
        logger.info("✅ [PDF] PDF格式验证通过", { header: pdfHeader });
      }

      logger.info("✅ [PDF] PDF生成成功", {
        size: `${(pdfBuffer.length / 1024).toFixed(2)}KB`,
      });

      return {
        content: pdfBuffer,
        filename: `教案_${Date.now()}.pdf`,
        mimeType: "application/pdf",
      };
    } catch (err) {
      logger.error("❌ [PDF] PDF导出异常", {
        error: err.message,
        stack: err.stack,
        platform: os.platform(),
      });
      throw new Error(`PDF导出失败: ${err.message}`);
    } finally {
      // 确保页面和浏览器都被正确关闭
      try {
        if (page) {
          await page.close();
          logger.info("📄 [PDF] 页面已关闭");
        }
      } catch (pageError) {
        logger.error("❌ [PDF] 关闭页面时出错", { error: pageError.message });
      }
      
      try {
        if (browser) {
          await browser.close();
          logger.info("🔒 [PDF] 浏览器已关闭");
        }
      } catch (browserError) {
        logger.error("❌ [PDF] 关闭浏览器时出错", { error: browserError.message });
        // 强制关闭浏览器进程
        try {
          if (browser && browser.process()) {
            browser.process().kill('SIGKILL');
            logger.info("🔒 [PDF] 浏览器进程已强制终止");
          }
        } catch (killError) {
          logger.error("❌ [PDF] 强制终止浏览器进程失败", { error: killError.message });
        }
      }
    }
  },

  // 思维导图导出
  mindmap: async (content, options = {}) => {
    await ensureTempDir();

    const os = require("os");
    const timestamp = Date.now();
    const markdownFile = path.join(tempDir, `mindmap_${timestamp}.md`);
    const htmlFile = path.join(tempDir, `mindmap_${timestamp}.html`);
    const outputFile = path.join(tempDir, `mindmap_${timestamp}.png`);

    try {
      logger.info("🧠 [MINDMAP] 开始生成思维导图", {
        markdownFile,
        htmlFile,
        outputFile,
        contentLength: content.length,
        platform: os.platform(),
      });

      // 转换内容为思维导图格式
      const mindmapContent = convertToMindmapMarkdown(
        content,
        options.title || "教案",
      );

      // 写入临时markdown文件
      await fs.writeFile(markdownFile, mindmapContent, "utf8");

      logger.info("📝 [MINDMAP] Markdown文件已创建", { markdownFile });

      // 使用markmap生成HTML文件
      const markmapPath = path.join(__dirname, "../node_modules/.bin/markmap");
      const command = `"${markmapPath}" "${markdownFile}" -o "${htmlFile}" --offline`;
      logger.info("🚀 [MINDMAP] 执行markmap命令", { command });

      await execAsync(command);

      logger.info("✅ [MINDMAP] HTML文件生成成功", { htmlFile });

      // 针对不同操作系统优化puppeteer配置
      const puppeteerArgs = ["--no-sandbox", "--disable-setuid-sandbox"];

      // macOS特定优化
      if (os.platform() === "darwin") {
        puppeteerArgs.push(
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--disable-extensions",
        );

        // ARM64 Mac (M1/M2) 特殊优化
        if (process.arch === "arm64") {
          puppeteerArgs.push(
            "--disable-features=VizDisplayCompositor",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
          );
        }
      }

      // Linux特定配置
      if (os.platform() === "linux") {
        puppeteerArgs.push(
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--single-process",
        );
      }

      // 使用puppeteer将HTML转换为PNG
      const browser = await puppeteer.launch({
        headless: true,
        args: puppeteerArgs,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });

      // 加载HTML文件
      await page.goto(`file://${htmlFile}`, { waitUntil: "networkidle0" });

      // 等待内容渲染完成
      await page.waitForTimeout(1000);

      // 截图生成PNG
      await page.screenshot({
        path: outputFile,
        fullPage: true,
        background: "white",
      });

      await browser.close();

      logger.info("✅ [MINDMAP] PNG文件生成成功", { outputFile });

      // 读取文件并返回
      const fileBuffer = await fs.readFile(outputFile);

      logger.info("📊 [MINDMAP] 思维导图生成完成", {
        size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
      });

      // 清理临时文件
      await Promise.all([
        fs.unlink(markdownFile).catch(() => {}),
        fs.unlink(htmlFile).catch(() => {}),
        fs.unlink(outputFile).catch(() => {}),
      ]);

      return {
        content: fileBuffer,
        filename: `思维导图_${timestamp}.png`,
        mimeType: "image/png",
      };
    } catch (error) {
      logger.error("❌ [MINDMAP] 思维导图生成失败", {
        error: error.message,
        stack: error.stack,
        markdownFile,
        htmlFile,
        outputFile,
        platform: os.platform(),
      });

      // 清理文件
      await Promise.all([
        fs.unlink(markdownFile).catch(() => {}),
        fs.unlink(htmlFile).catch(() => {}),
        fs.unlink(outputFile).catch(() => {}),
      ]);

      throw new Error(`思维导图生成失败: ${error.message}`);
    }
  },

  // 时间线图片导出
  timeline: async (content, options = {}) => {
    await ensureTempDir();

    const timestamp = Date.now();
    const mermaidFile = path.join(tempDir, `timeline_${timestamp}.mmd`);
    const outputFile = path.join(tempDir, `timeline_${timestamp}.png`);

    try {
      logger.info("📤 [EXPORT] 开始生成时间线", {
        mermaidFile,
        outputFile,
        contentLength: content.length,
      });

      // 从内容中提取时间线信息
      const timelineData = extractTimelineFromContent(content);

      // 生成Mermaid时间线图表
      const mermaidCode = generateTimelineMermaid(timelineData);

      // 写入临时mermaid文件
      await fs.writeFile(mermaidFile, mermaidCode, "utf8");

      logger.info("📝 [EXPORT] Mermaid文件已创建", { mermaidFile });

      // 使用mermaid-cli生成时间线图片
      const mmdcPath = path.join(__dirname, "../node_modules/.bin/mmdc");
      const command = `"${mmdcPath}" -i "${mermaidFile}" -o "${outputFile}" -b white`;
      logger.info("🚀 [EXPORT] 执行mmdc命令", { command });

      await execAsync(command);

      logger.info("✅ [EXPORT] 时间线图片生成成功", { outputFile });

      // 读取文件并返回
      const fileBuffer = await fs.readFile(outputFile);

      // 清理临时文件
      await Promise.all([
        fs.unlink(mermaidFile).catch(() => {}),
        fs.unlink(outputFile).catch(() => {}),
      ]);

      return {
        content: fileBuffer,
        filename: `时间线_${timestamp}.png`,
        mimeType: "image/png",
      };
    } catch (error) {
      logger.error("❌ [EXPORT] 时间线生成失败", {
        error: error.message,
        stack: error.stack,
        mermaidFile,
        outputFile,
      });

      // 清理文件
      await Promise.all([
        fs.unlink(mermaidFile).catch(() => {}),
        fs.unlink(outputFile).catch(() => {}),
      ]);

      throw error;
    }
  },
};

// 从内容中提取时间线信息
function extractTimelineFromContent(content) {
  // 优先尝试解析YAML frontmatter
  let timeline = [];
  const yamlMatch = content.match(/^---([\s\S]*?)---/);
  if (yamlMatch) {
    try {
      const yaml = require("js-yaml");
      const frontmatter = yaml.load(yamlMatch[1]);
      if (frontmatter && Array.isArray(frontmatter.teachingProcess)) {
        for (const stage of frontmatter.teachingProcess) {
          if (stage.stage && stage.duration) {
            timeline.push({ title: stage.stage, duration: stage.duration });
          }
        }
      }
    } catch (e) {
      // YAML解析失败，忽略
    }
  }
  // 如果没解析到，尝试正则提取“教学过程”部分
  if (timeline.length === 0) {
    const lines = content.split("\n");
    let inProcess = false;
    for (const line of lines) {
      if (line.includes("教学过程") || line.includes("教学步骤")) {
        inProcess = true;
        continue;
      }
      if (inProcess) {
        // 匹配“阶段名 (xx分钟)”格式
        const match = line.match(
          /^(?:[#*\-\d. ]*)?([\u4e00-\u9fa5A-Za-z0-9_（）()\s]+)[（(](\d+)[分钟min]*[)）]/,
        );
        if (match) {
          timeline.push({
            title: match[1].trim(),
            duration: parseInt(match[2]),
          });
        }
        // 兼容“阶段名 xx分钟”
        else {
          const match2 = line.match(
            /^(?:[#*\-\d. ]*)?([\u4e00-\u9fa5A-Za-z0-9_（）()\s]+)[：: ]*(\d+)[分钟min]?/,
          );
          if (match2) {
            timeline.push({
              title: match2[1].trim(),
              duration: parseInt(match2[2]),
            });
          }
        }
        // 结束条件
        if (line.match(/课后作业|教学反思|总结/)) break;
      }
    }
  }
  // 如果还没有，给默认时间线
  if (timeline.length === 0) {
    timeline.push(
      { title: "导入新课", duration: 5 },
      { title: "新课讲解", duration: 25 },
      { title: "课堂练习", duration: 10 },
      { title: "总结反思", duration: 5 },
    );
  }
  return timeline;
}

// 生成Mermaid时间线代码
function generateTimelineMermaid(timelineData) {
  let mermaidCode = "gantt\n";
  mermaidCode += "    title 教学时间线\n";
  mermaidCode += "    dateFormat  m\n";
  mermaidCode += "    axisFormat %M分钟\n\n";

  let currentTime = 0;
  for (let i = 0; i < timelineData.length; i++) {
    const item = timelineData[i];
    if (i === 0) {
      mermaidCode += `    ${item.title} :done, des${i}, 0, ${item.duration}m\n`;
    } else {
      mermaidCode += `    ${item.title} : des${i}, after des${i - 1}, ${item.duration}m\n`;
    }
  }
  return mermaidCode;
}

// 将Markdown内容转换为Mindmap Markdown格式
function convertToMindmapMarkdown(content, title) {
  // 用 markdown-it 解析 markdown AST
  const tokens = md.parse(content, {});
  let mindmapContent = `# ${title}\n`;

  // 递归处理 tokens，生成树结构
  function walk(tokens, start = 0, level = 0) {
    let i = start;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token.type === "heading_open") {
        const headingLevel = parseInt(token.tag.replace("h", ""));
        const text = tokens[i + 1].content;
        mindmapContent += "\n" + "  ".repeat(headingLevel - 1) + `* ${text}`;
        i += 2;
      } else if (token.type === "list_item_open") {
        // 找到列表项内容
        let j = i + 1;
        let itemText = "";
        while (tokens[j] && tokens[j].type !== "list_item_close") {
          if (tokens[j].type === "inline") {
            itemText += tokens[j].content;
          }
          j++;
        }
        mindmapContent += "\n" + "  ".repeat(level + 1) + `* ${itemText}`;
        i = j + 1;
      } else if (
        token.type === "bullet_list_open" ||
        token.type === "ordered_list_open"
      ) {
        // 递归处理子列表
        i = walk(tokens, i + 1, level + 1);
      } else if (
        token.type === "bullet_list_close" ||
        token.type === "ordered_list_close"
      ) {
        return i + 1;
      } else {
        i++;
      }
    }
    return i;
  }

  walk(tokens);
  return mindmapContent + "\n";
}

// ==================== 导出教案 ====================

router.post(
  "/lesson-plans/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { format = "markdown", options = {} } = req.body;
    const lessonPlanId = req.params.id;

    logger.info("📤 [EXPORT] 收到导出请求", {
      lessonPlanId,
      format,
      userId: req.user?._id,
      userAgent: req.get("User-Agent"),
      origin: req.get("Origin"),
    });

    // 验证导出格式
    const allowedFormats = [
      "markdown",
      "html",
      "txt",
      "mindmap",
      "pdf",
      "timeline",
    ];
    if (!allowedFormats.includes(format)) {
      logger.warn("❌ [EXPORT] 不支持的导出格式", { format, allowedFormats });
      throw new UserFriendlyError("不支持的导出格式", 400);
    }

    // 获取教案
    logger.info("🔍 [EXPORT] 开始查找教案", {
      lessonPlanId,
      userId: req.user._id,
    });

    const lessonPlan = await LessonPlan.findOne({
      _id: lessonPlanId,
      createdBy: req.user._id,
    });

    if (!lessonPlan) {
      logger.warn("❌ [EXPORT] 教案不存在或无访问权限", {
        lessonPlanId,
        userId: req.user._id,
        requestedBy: req.user.email || req.user.username,
      });
      throw new UserFriendlyError("教案不存在或无访问权限", 404);
    }

    logger.info("✅ [EXPORT] 找到教案", {
      lessonPlanId,
      title: lessonPlan.title,
      contentLength: lessonPlan.content?.length || 0,
      hasContent: !!lessonPlan.content,
    });

    try {
      // 格式化内容
      const exportResult = await exportFormatters[format](
        lessonPlan.content,
        options,
      );

      // 记录导出历史
      const exportRecord = new ExportHistory({
        userId: req.user._id,
        contentType: "lessonPlan",
        contentId: lessonPlanId,
        exportFormat: format,
        exportOptions: options,
        fileSize: Buffer.isBuffer(exportResult.content)
          ? exportResult.content.length
          : Buffer.byteLength(exportResult.content, "utf8"),
      });
      await exportRecord.save();

      // 更新教案的导出计数
      await LessonPlan.updateOne(
        { _id: lessonPlanId },
        { $inc: { "stats.exportCount": 1 } },
      );

      logger.info("教案导出成功", {
        lessonPlanId,
        userId: req.user._id,
        format,
        fileSize: exportRecord.fileSize,
      });

      // 设置响应头并发送
      res
        .status(200)
        .set({
          "Content-Type": exportResult.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(exportResult.filename)}"`,
          "Content-Length": Buffer.isBuffer(exportResult.content)
            ? exportResult.content.length
            : undefined,
        })
        .end(exportResult.content);
    } catch (error) {
      logger.error("教案导出失败", {
        lessonPlanId,
        userId: req.user._id,
        format,
        error: error.message,
        stack: error.stack,
      });
      throw new UserFriendlyError("导出失败，请重试", 500);
    }
  }),
);

// ==================== 导出练习题 ====================

router.post(
  "/exercises/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { format = "markdown", options = {} } = req.body;
    const exerciseId = req.params.id;

    // 验证导出格式
    const allowedFormats = [
      "markdown",
      "html",
      "txt",
      "mindmap",
      "pdf",
      "timeline",
    ];
    if (!allowedFormats.includes(format)) {
      throw new UserFriendlyError("不支持的导出格式", 400);
    }

    // 获取练习题
    const exercise = await Exercise.findOne({
      _id: exerciseId,
      createdBy: req.user._id,
    }).populate("relatedLessonPlan", "title topic");

    if (!exercise) {
      throw new UserFriendlyError("练习题不存在或无访问权限", 404);
    }

    try {
      let content = exercise.content;

      // 根据选项调整内容
      if (options.includeAnswers === false) {
        // 移除答案部分
        content = content.replace(/## 参考答案[\s\S]*$/m, "");
        content = content.replace(
          /\*\*答案[：:]\*\*[^\n]*/g,
          "**答案:** [此处省略]",
        );
      }

      if (options.includeExplanations === false) {
        // 移除解析部分
        content = content.replace(/\*\*解析[：:]\*\*[^\n]*/g, "");
      }

      // 格式化内容
      const exportResult = await exportFormatters[format](content, options);

      // 记录导出历史
      const exportRecord = new ExportHistory({
        userId: req.user._id,
        contentType: "exercise",
        contentId: exerciseId,
        exportFormat: format,
        exportOptions: options,
        fileSize: Buffer.isBuffer(exportResult.content)
          ? exportResult.content.length
          : Buffer.byteLength(exportResult.content, "utf8"),
      });
      await exportRecord.save();

      // 更新练习题的导出计数
      await Exercise.updateOne(
        { _id: exerciseId },
        { $inc: { "stats.exportCount": 1 } },
      );

      logger.info("练习题导出成功", {
        exerciseId,
        userId: req.user._id,
        format,
        fileSize: exportRecord.fileSize,
      });

      // 设置响应头并发送
      res
        .status(200)
        .set({
          "Content-Type": exportResult.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(exportResult.filename)}"`,
          "Content-Length": Buffer.isBuffer(exportResult.content)
            ? exportResult.content.length
            : undefined,
        })
        .end(exportResult.content);
    } catch (error) {
      logger.error("练习题导出失败", {
        exerciseId,
        userId: req.user._id,
        format,
        error: error.message,
        stack: error.stack,
      });
      throw new UserFriendlyError("导出失败，请重试", 500);
    }
  }),
);

// ==================== 批量导出 ====================

router.post(
  "/batch",
  authenticate,
  asyncHandler(async (req, res) => {
    const { items, format = "markdown", options = {} } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new UserFriendlyError("请选择要导出的内容", 400);
    }

    const allowedFormats = ["markdown", "html", "txt", "pdf"];
    if (!allowedFormats.includes(format)) {
      throw new UserFriendlyError("批量导出不支持此格式", 400);
    }

    try {
      let combinedContent = `# 批量导出文档\n\n导出时间: ${new Date().toLocaleString("zh-CN")}\n\n---\n\n`;

      for (const item of items) {
        const { type, id } = item;
        let content;

        if (type === "lessonPlan") {
          const lessonPlan = await LessonPlan.findOne({
            _id: id,
            createdBy: req.user._id,
          });
          if (lessonPlan) {
            content = lessonPlan;
            combinedContent += `## 教案: ${lessonPlan.title}\n\n${lessonPlan.content}\n\n---\n\n`;
          }
        } else if (type === "exercise") {
          const exercise = await Exercise.findOne({
            _id: id,
            createdBy: req.user._id,
          });
          if (exercise) {
            content = exercise;
            combinedContent += `## 练习题: ${exercise.title}\n\n${exercise.content}\n\n---\n\n`;
          }
        }

        // 记录每个项目的导出
        if (content) {
          const exportRecord = new ExportHistory({
            userId: req.user._id,
            contentType: type,
            contentId: id,
            exportFormat: format,
            exportOptions: { ...options, batchExport: true },
          });
          await exportRecord.save();

          // 更新导出计数
          if (type === "lessonPlan") {
            await LessonPlan.updateOne(
              { _id: id },
              { $inc: { "stats.exportCount": 1 } },
            );
          } else if (type === "exercise") {
            await Exercise.updateOne(
              { _id: id },
              { $inc: { "stats.exportCount": 1 } },
            );
          }
        }
      }

      // 格式化合并后的内容
      const exportResult = await exportFormatters[format](
        combinedContent,
        options,
      );
      exportResult.filename = `批量导出_${Date.now()}.${format === "html" ? "html" : format === "txt" ? "txt" : format === "pdf" ? "pdf" : "md"}`;

      logger.info("批量导出成功", {
        userId: req.user._id,
        itemCount: items.length,
        format,
        fileSize: Buffer.isBuffer(exportResult.content)
          ? exportResult.content.length
          : Buffer.byteLength(exportResult.content, "utf8"),
      });

      // 设置响应头并发送
      res
        .status(200)
        .set({
          "Content-Type": exportResult.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(exportResult.filename)}"`,
          "Content-Length": Buffer.isBuffer(exportResult.content)
            ? exportResult.content.length
            : undefined,
        })
        .end(exportResult.content);
    } catch (error) {
      logger.error("批量导出失败", {
        userId: req.user._id,
        itemCount: items.length,
        format,
        error: error.message,
      });
      throw new UserFriendlyError("批量导出失败，请重试", 500);
    }
  }),
);

// ==================== 导出历史 ====================

router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, contentType, exportFormat } = req.query;

    const filter = { userId: req.user._id };
    if (contentType) filter.contentType = contentType;
    if (exportFormat) filter.exportFormat = exportFormat;

    const total = await ExportHistory.countDocuments(filter);
    const exports = await ExportHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .populate("contentId", "title topic")
      .lean();

    res.json({
      success: true,
      data: {
        exports,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  }),
);

module.exports = router;
