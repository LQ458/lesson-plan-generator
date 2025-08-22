const fs = require("fs").promises;
const path = require("path");

const PROGRESS_FILE = path.join(__dirname, "../data/loading-progress.json");

class LoadingProgressMonitor {
  async getProgress() {
    try {
      const progressData = await fs.readFile(PROGRESS_FILE, 'utf-8');
      const progress = JSON.parse(progressData);
      
      return {
        isValid: true,
        progress: progress
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  async displayProgress() {
    const result = await this.getProgress();
    
    if (!result.isValid) {
      console.log("📋 没有找到进度文件");
      console.log("ℹ️ RAG加载可能没有运行，或者已经完成");
      return;
    }

    const p = result.progress;
    
    console.log("📊 RAG数据加载进度监控");
    console.log("=" + "=".repeat(50));
    
    // 基本进度
    const fileProgress = p.totalFiles > 0 ? ((p.processedFiles.length / p.totalFiles) * 100).toFixed(1) : 0;
    const chunkProgress = p.totalChunks > 0 ? ((p.processedChunks / p.totalChunks) * 100).toFixed(1) : 0;
    
    console.log(`📁 文件进度: ${p.processedFiles.length}/${p.totalFiles} (${fileProgress}%)`);
    console.log(`📝 Chunks进度: ${p.processedChunks}/${p.totalChunks} (${chunkProgress}%)`);
    console.log(`❌ 失败文件: ${p.failedFiles.length}`);
    console.log(`⏸️ 跳过chunks: ${p.skippedChunks}`);
    
    // 时间统计
    if (p.startTime) {
      const startTime = new Date(p.startTime);
      const currentTime = new Date();
      const elapsedTime = currentTime - startTime;
      console.log(`⏱️ 已运行时间: ${this.formatTime(elapsedTime)}`);
    }
    
    if (p.lastSaveTime) {
      const lastSave = new Date(p.lastSaveTime);
      const timeSinceLastSave = Date.now() - lastSave.getTime();
      console.log(`💾 上次保存: ${this.formatTime(timeSinceLastSave)}前`);
    }
    
    // 性能统计
    if (p.avgInsertionTime) {
      console.log(`⚡ 平均插入时间: ${p.avgInsertionTime.toFixed(0)}ms/批次`);
    }
    
    if (p.estimatedTimeRemaining) {
      const eta = new Date(Date.now() + p.estimatedTimeRemaining);
      console.log(`⏰ 预计完成时间: ${eta.toLocaleString()}`);
      console.log(`⏳ 预计剩余时间: ${this.formatTime(p.estimatedTimeRemaining)}`);
    }
    
    // 当前批次
    if (p.currentBatch > 0) {
      console.log(`📦 当前批次: ${p.currentBatch}`);
    }
    
    // 失败文件详情
    if (p.failedFiles && p.failedFiles.length > 0) {
      console.log("\n❌ 失败文件详情:");
      p.failedFiles.slice(-5).forEach(f => { // 只显示最近5个失败文件
        console.log(`   - ${f.file}: ${f.reason}`);
      });
      
      if (p.failedFiles.length > 5) {
        console.log(`   ... 还有 ${p.failedFiles.length - 5} 个失败文件`);
      }
    }
    
    // 进度条
    const progressBar = this.createProgressBar(parseFloat(chunkProgress));
    console.log(`\n${progressBar}`);
    
    console.log("\n" + "=".repeat(52));
  }

  createProgressBar(percentage, width = 40) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percentage.toFixed(1)}%`;
  }

  async watchProgress(intervalSeconds = 10) {
    console.log(`🔍 开始监控RAG加载进度 (每${intervalSeconds}秒更新)`);
    console.log("按 Ctrl+C 停止监控\n");
    
    const monitor = async () => {
      // 清屏
      console.clear();
      await this.displayProgress();
      console.log(`\n🔄 下次更新: ${intervalSeconds}秒后 | 按 Ctrl+C 停止监控`);
    };
    
    // 立即显示一次
    await monitor();
    
    // 设置定时器
    const intervalId = setInterval(monitor, intervalSeconds * 1000);
    
    // 处理中断信号
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log("\n👋 监控已停止");
      process.exit(0);
    });
  }
}

// 主函数
async function main() {
  const monitor = new LoadingProgressMonitor();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'show';
  
  switch (command) {
    case 'show':
      await monitor.displayProgress();
      break;
      
    case 'watch':
      const interval = parseInt(args[1]) || 10;
      await monitor.watchProgress(interval);
      break;
      
    case 'help':
      console.log("RAG加载进度监控工具");
      console.log("\n用法:");
      console.log("  node monitor-loading-progress.js show          # 显示当前进度");
      console.log("  node monitor-loading-progress.js watch [秒数]  # 持续监控进度");
      console.log("  node monitor-loading-progress.js help          # 显示帮助");
      console.log("\n示例:");
      console.log("  node monitor-loading-progress.js watch 5       # 每5秒更新一次进度");
      break;
      
    default:
      console.log("❌ 未知命令，使用 'help' 查看用法");
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error("❌ 监控程序出错:", error);
    process.exit(1);
  });
}

module.exports = LoadingProgressMonitor;