const mongoose = require('mongoose');
const { LessonPlan } = require('./models/content-model');
const MarkdownIt = require('markdown-it');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// PDF文件头检查函数
function checkPDFHeader(buffer) {
  // PDF文件应该以 %PDF- 开头
  const pdfHeader = buffer.slice(0, 8).toString('ascii');
  console.log('📄 PDF文件头:', pdfHeader);
  
  if (!pdfHeader.startsWith('%PDF-')) {
    console.log('❌ 无效的PDF文件头');
    return false;
  }
  
  console.log('✅ PDF文件头正确');
  return true;
}

// PDF文件尾检查函数
function checkPDFTrailer(buffer) {
  // PDF文件应该以 %%EOF 结尾
  const lastBytes = buffer.slice(-20).toString('ascii');
  console.log('📄 PDF文件尾:', lastBytes);
  
  if (!lastBytes.includes('%%EOF')) {
    console.log('❌ PDF文件尾不完整');
    return false;
  }
  
  console.log('✅ PDF文件尾正确');
  return true;
}

// 详细的PDF结构检查
function analyzePDFStructure(buffer) {
  console.log('\n🔍 PDF结构分析:');
  console.log('- 文件大小:', buffer.length, 'bytes');
  console.log('- 文件大小(KB):', (buffer.length / 1024).toFixed(2), 'KB');
  
  // 检查PDF版本
  const versionMatch = buffer.slice(0, 20).toString('ascii').match(/%PDF-(\d\.\d)/);
  if (versionMatch) {
    console.log('- PDF版本:', versionMatch[1]);
  }
  
  // 检查是否包含基本PDF对象
  const content = buffer.toString('binary');
  const hasObjects = content.includes('obj') && content.includes('endobj');
  const hasXref = content.includes('xref');
  const hasTrailer = content.includes('trailer');
  
  console.log('- 包含PDF对象:', hasObjects ? '✅' : '❌');
  console.log('- 包含交叉引用表:', hasXref ? '✅' : '❌');
  console.log('- 包含尾部信息:', hasTrailer ? '✅' : '❌');
  
  return hasObjects && hasXref && hasTrailer;
}

async function diagnosePDFIntegrity() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teachai');
    console.log('✅ 数据库连接成功');
    
    // 获取教案
    const lessonPlan = await LessonPlan.findOne().sort({ createdAt: -1 });
    if (!lessonPlan || !lessonPlan.content) {
      console.log('❌ 未找到有效教案');
      return;
    }
    
    console.log('📚 找到教案:', {
      title: lessonPlan.title,
      contentLength: lessonPlan.content.length
    });
    
    // 准备临时目录
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    // 生成多个版本的PDF进行对比
    const testCases = [
      {
        name: '标准PDF',
        options: {
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: false,
          margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        }
      },
      {
        name: '简化PDF',
        options: {
          format: 'A4',
          printBackground: false,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        }
      },
      {
        name: '最小配置PDF',
        options: {
          format: 'A4'
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 测试: ${testCase.name}`);
      
      try {
        // 创建HTML内容
        const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${lessonPlan.title}</title>
  <style>
    body { 
      font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; 
      line-height: 1.6; 
      margin: 0; 
      padding: 20px;
      color: #333;
    }
    h1, h2, h3 { color: #2c3e50; margin-top: 1.5em; }
    p { margin: 1em 0; }
    ul, ol { margin: 1em 0; padding-left: 2em; }
  </style>
</head>
<body>
  <h1>${lessonPlan.title}</h1>
  ${md.render(lessonPlan.content)}
</body>
</html>`;
        
        // 启动浏览器
        const browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });
        
        const page = await browser.newPage();
        
        // 设置内容
        await page.setContent(htmlContent, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: 30000
        });
        
        // 等待渲染完成
        await page.waitForTimeout(2000);
        
        // 生成PDF
        const pdfBuffer = await page.pdf(testCase.options);
        await browser.close();
        
        console.log(`- PDF大小: ${(pdfBuffer.length / 1024).toFixed(2)}KB`);
        
        // 检查PDF完整性
        const headerValid = checkPDFHeader(pdfBuffer);
        const trailerValid = checkPDFTrailer(pdfBuffer);
        const structureValid = analyzePDFStructure(pdfBuffer);
        
        if (headerValid && trailerValid && structureValid) {
          console.log('✅ PDF完整性检查通过');
          
          // 保存有效的PDF
          const filename = `valid_${testCase.name.replace(/\s+/g, '_')}.pdf`;
          const filepath = path.join(tempDir, filename);
          await fs.writeFile(filepath, pdfBuffer);
          console.log(`💾 有效PDF已保存: ${filepath}`);
          
          // 额外验证：尝试读取PDF内容
          const pdfContent = pdfBuffer.toString('binary');
          const hasText = pdfContent.includes(lessonPlan.title.substring(0, 10));
          console.log('- 包含教案标题:', hasText ? '✅' : '❌');
          
        } else {
          console.log('❌ PDF完整性检查失败');
          
          // 保存问题PDF用于调试
          const filename = `broken_${testCase.name.replace(/\s+/g, '_')}.pdf`;
          const filepath = path.join(tempDir, filename);
          await fs.writeFile(filepath, pdfBuffer);
          console.log(`🔧 问题PDF已保存用于调试: ${filepath}`);
        }
        
      } catch (error) {
        console.error(`❌ ${testCase.name} 生成失败:`, error.message);
      }
    }
    
    // 额外测试：生成一个最简单的HTML测试PDF
    console.log('\n🧪 测试: 最简HTML');
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>测试PDF</h1>
          <p>这是一个简单的测试内容。</p>
          <p>如果您能看到这段文字，说明PDF生成正常。</p>
        </body>
        </html>
      `);
      
      const simplePdf = await page.pdf({ format: 'A4' });
      await browser.close();
      
      console.log(`- 简单PDF大小: ${(simplePdf.length / 1024).toFixed(2)}KB`);
      
      const isValid = checkPDFHeader(simplePdf) && checkPDFTrailer(simplePdf);
      if (isValid) {
        const filepath = path.join(tempDir, 'simple_test.pdf');
        await fs.writeFile(filepath, simplePdf);
        console.log(`✅ 简单测试PDF生成成功: ${filepath}`);
      }
      
    } catch (error) {
      console.error('❌ 简单PDF测试失败:', error.message);
    }
    
    console.log('\n📊 诊断完成！');
    console.log('请检查 temp/ 目录中的PDF文件:');
    console.log('- 用不同的PDF查看器打开（Adobe Reader, Chrome, Firefox等）');
    console.log('- 检查哪个版本可以正常打开');
    
  } catch (error) {
    console.error('💥 诊断过程出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行诊断
diagnosePDFIntegrity(); 