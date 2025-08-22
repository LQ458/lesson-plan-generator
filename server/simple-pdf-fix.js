const mongoose = require("mongoose");
const { LessonPlan } = require("./models/content-model");
const MarkdownIt = require("markdown-it");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;

async function generateValidPDF() {
  try {
    // 连接数据库
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/teachai",
    );
    console.log("✅ 数据库连接成功");

    // 获取教案
    const lessonPlan = await LessonPlan.findOne().sort({ createdAt: -1 });
    if (!lessonPlan || !lessonPlan.content) {
      console.log("❌ 未找到有效教案");
      return;
    }

    console.log("📚 找到教案:", lessonPlan.title);

    // 创建HTML内容
    const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lessonPlan.title}</title>
  <style>
    body { 
      font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; 
      line-height: 1.6; 
      margin: 0; 
      padding: 20px;
      color: #333;
      background: white;
    }
    h1, h2, h3 { color: #2c3e50; margin-top: 1.5em; }
    h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    p { margin: 1em 0; }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.5em 0; }
    .header { text-align: center; margin-bottom: 30px; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${lessonPlan.title}</h1>
    <div class="meta">
      <p>学科: ${lessonPlan.subject || "未指定"} | 年级: ${lessonPlan.grade || "未指定"}</p>
      <p>创建时间: ${new Date(lessonPlan.createdAt).toLocaleDateString("zh-CN")}</p>
    </div>
  </div>
  <div class="content">
    ${md.render(lessonPlan.content)}
  </div>
</body>
</html>`;

    console.log("🔧 启动浏览器...");

    // 启动浏览器 - 使用更兼容的配置
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    const page = await browser.newPage();

    // 设置页面内容
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    console.log("📄 生成PDF...");

    // 生成PDF - 使用最简单的配置
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    await browser.close();

    console.log("✅ PDF生成完成");
    console.log("- 文件大小:", (pdfBuffer.length / 1024).toFixed(2), "KB");

    // 检查PDF格式
    const pdfHeader = pdfBuffer.slice(0, 8).toString();
    console.log("- PDF文件头:", pdfHeader);

    if (pdfHeader.startsWith("%PDF-")) {
      console.log("✅ PDF格式正确");

      // 保存PDF文件
      const filename = `fixed_lesson_${Date.now()}.pdf`;
      await fs.writeFile(filename, pdfBuffer);
      console.log(`💾 PDF已保存: ${filename}`);

      // 验证保存的文件
      const savedFile = await fs.readFile(filename);
      const savedHeader = savedFile.slice(0, 8).toString();
      console.log("- 保存后的文件头:", savedHeader);

      if (savedHeader.startsWith("%PDF-")) {
        console.log("🎉 PDF文件保存成功且格式正确！");
        console.log("📝 请尝试用以下方式打开:");
        console.log("  1. 双击文件用系统默认应用打开");
        console.log("  2. 用Chrome浏览器打开");
        console.log("  3. 用Adobe Reader打开");
        console.log("  4. 用其他PDF查看器打开");
      } else {
        console.log("❌ 文件保存后格式异常");
      }
    } else {
      console.log("❌ PDF格式异常");
      console.log("- 文件头字节:", Array.from(pdfBuffer.slice(0, 8)));
    }
  } catch (error) {
    console.error("💥 生成PDF失败:", error);
  } finally {
    mongoose.connection.close();
  }
}

generateValidPDF();
