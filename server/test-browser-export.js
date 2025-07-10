const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { LessonPlan } = require('./models/content-model');
const exportFormatters = require('./routes/export').exportFormatters || {};

// 如果导出格式器不可用，直接导入必要的模块
const MarkdownIt = require('markdown-it');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// 简化的PDF导出函数
async function generatePDF(content) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  });

  const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>教案导出测试</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      margin: 20px; 
      background: white; 
    }
    h1, h2, h3 { color: #333; }
    .print-date { 
      position: fixed; 
      top: 10px; 
      right: 15px; 
      font-size: 10px; 
      color: #666; 
    }
  </style>
</head>
<body>
  <div class="print-date">导出时间: ${new Date().toLocaleString('zh-CN')}</div>
  ${md.render(content)}
</body>
</html>`;

  const os = require('os');
  const puppeteerArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

  if (os.platform() === 'darwin') {
    puppeteerArgs.push(
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions'
    );
    
    if (process.arch === 'arm64') {
      puppeteerArgs.push(
        '--disable-features=VizDisplayCompositor',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      );
    }
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: puppeteerArgs
  });

  const page = await browser.newPage();
  await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: false,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });

  await browser.close();
  return pdfBuffer;
}

// 创建测试服务器
const app = express();
app.use(cors());
app.use(express.json());

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teachai');

// 测试页面
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF导出测试</title>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        button { padding: 10px 20px; margin: 10px; font-size: 16px; cursor: pointer; }
        .success { color: green; }
        .error { color: red; }
        #status { margin: 20px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>PDF导出功能测试</h1>
      <p>这个页面用来测试PDF导出功能是否正常工作。</p>
      
      <button onclick="testExport()">测试PDF导出</button>
      <div id="status"></div>
      
      <script>
        async function testExport() {
          const status = document.getElementById('status');
          status.innerHTML = '🔄 正在导出PDF...';
          
          try {
            const response = await fetch('/test-export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const blob = await response.blob();
              console.log('PDF Blob信息:', { size: blob.size, type: blob.type });
              
              // 检查blob大小
              if (blob.size === 0) {
                status.innerHTML = '<span class="error">❌ PDF文件为空！</span>';
                return;
              }
              
              if (blob.size < 1000) {
                status.innerHTML = '<span class="error">⚠️ PDF文件太小，可能有问题</span>';
              } else {
                status.innerHTML = '<span class="success">✅ PDF生成成功！</span>';
              }
              
              // 下载文件
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'test-export.pdf';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              status.innerHTML += '<br>📥 文件已下载，请检查内容';
              
            } else {
              const errorText = await response.text();
              status.innerHTML = '<span class="error">❌ 导出失败: ' + response.status + ' - ' + errorText + '</span>';
            }
          } catch (error) {
            status.innerHTML = '<span class="error">❌ 请求失败: ' + error.message + '</span>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 测试导出接口
app.post('/test-export', async (req, res) => {
  try {
    console.log('🚀 收到PDF导出测试请求');
    
    // 获取最新的教案
    const lessonPlan = await LessonPlan.findOne().sort({ createdAt: -1 });
    
    if (!lessonPlan) {
      console.log('❌ 未找到教案');
      return res.status(404).send('未找到教案');
    }
    
    console.log('📝 找到教案:', {
      title: lessonPlan.title,
      contentLength: lessonPlan.content?.length || 0
    });
    
    if (!lessonPlan.content) {
      console.log('❌ 教案内容为空');
      return res.status(400).send('教案内容为空');
    }
    
    // 生成PDF
    const pdfBuffer = await generatePDF(lessonPlan.content);
    
    console.log('✅ PDF生成成功:', {
      size: pdfBuffer.length,
      sizeKB: (pdfBuffer.length / 1024).toFixed(2) + 'KB'
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test-export.pdf"');
    
    // 发送PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ PDF导出测试失败:', error);
    res.status(500).send('PDF导出失败: ' + error.message);
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log('🌐 PDF导出测试服务器启动成功!');
  console.log('📍 请访问: http://localhost:3002');
  console.log('🔧 在浏览器中点击"测试PDF导出"按钮进行测试');
  console.log('📊 检查下载的PDF文件是否有内容');
}); 