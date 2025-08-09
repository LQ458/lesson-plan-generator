#!/usr/bin/env node

/**
 * ChromaDB Cloud Upload CLI
 * Simple command-line tool to upload RAG data to ChromaDB Cloud
 */

const ChromaDBCloudUploader = require('./server/rag/scripts/cloud-uploader');
const path = require('path');

async function main() {
    console.log('🚀 TeachAI ChromaDB Cloud Upload Tool');
    console.log('=====================================');
    
    const args = process.argv.slice(2);
    const uploader = new ChromaDBCloudUploader();
    
    try {
        console.log('🌐 连接到ChromaDB Cloud...');
        await uploader.initialize();
        console.log('✅ ChromaDB Cloud连接成功!');
        
        // Handle cleanup command
        if (args.includes('--cleanup')) {
            console.log('\n🧹 开始清理不必要的集合...');
            const cleanupResult = await uploader.cleanupUnnecessaryCollections();
            
            console.log('\n📊 清理结果:');
            console.log(`🗑️ 删除的集合数: ${cleanupResult.deletedCount}`);
            console.log(`📁 发现的集合数: ${cleanupResult.totalFound}`);
            
            if (cleanupResult.deletedCollections.length > 0) {
                console.log('\n已删除的集合:');
                cleanupResult.deletedCollections.forEach(name => {
                    console.log(`  ✅ ${name}`);
                });
            }
            
            console.log('\n🎉 集合清理完成!');
            return;
        }
        
        if (args.length > 0 && !args.includes('--cleanup')) {
            // Upload specific file
            const filePath = path.resolve(args[0]);
            console.log(`\n📤 上传单个文件: ${filePath}`);
            
            const result = await uploader.uploadFile(filePath);
            
            if (result.success) {
                console.log('✅ 文件上传成功!');
                console.log(`📚 集合名称: ${result.collectionName}`);
                console.log(`📊 上传文档数: ${result.uploadedDocuments}`);
                console.log(`💾 集合总大小: ${result.totalCollectionSize}`);
            } else {
                console.log('❌ 文件上传失败:', result.error || result.reason);
                process.exit(1);
            }
            
        } else {
            // Upload all files
            console.log('\n📁 开始批量上传所有RAG数据...');
            console.log('📊 数据来源: server/rag_data/chunks/');
            console.log('🎯 目标: 统一主集合 teachai_main');
            console.log('⏳ 预计时间: 10-20分钟 (取决于网络速度)');
            console.log('');
            
            const startTime = Date.now();
            const result = await uploader.uploadAllFiles();
            const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            
            console.log('\n🎉 批量上传完成!');
            console.log('================');
            console.log(`⏱️  用时: ${duration} 分钟`);
            console.log(`📁 总文件数: ${result.totalFiles}`);
            console.log(`✅ 成功上传: ${result.successfulUploads}`);
            console.log(`❌ 失败文件: ${result.failedUploads}`);
            console.log(`📊 总文档数: ${result.totalDocumentsUploaded}`);
            console.log(`📈 成功率: ${result.successRate}`);
            
            if (result.failedUploads > 0) {
                console.log('\n⚠️ 失败的文件:');
                result.results.forEach(r => {
                    if (!r.success) {
                        console.log(`  - ${r.file}: ${r.error || r.reason}`);
                    }
                });
            }
        }
        
        // List cloud collections
        console.log('\n📊 ChromaDB Cloud集合状态:');
        try {
            const collections = await uploader.listCloudCollections();
            console.log(`📚 总集合数: ${collections.length}`);
        } catch (err) {
            console.log('⚠️ 无法获取集合列表:', err.message);
        }
        
        console.log('\n✅ 任务完成! RAG数据现已在ChromaDB Cloud中可用');
        console.log('🔗 您的应用现在可以通过云端API访问教学内容');
        
    } catch (error) {
        console.error('\n❌ 上传失败:', error.message);
        console.error('\n可能的解决方案:');
        console.error('1. 检查网络连接');
        console.error('2. 验证ChromaDB Cloud凭据');
        console.error('3. 确保数据目录 server/rag_data/chunks/ 存在');
        console.error('4. 检查文件权限');
        
        process.exit(1);
    }
}

// Show usage help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
TeachAI ChromaDB Cloud Upload Tool
=================================

用法:
  node upload-to-cloud.js                    # 上传所有RAG数据文件到主集合
  node upload-to-cloud.js <file-path>       # 上传指定文件到主集合
  node upload-to-cloud.js --cleanup         # 清理多余的集合
  node upload-to-cloud.js --help            # 显示帮助

示例:
  node upload-to-cloud.js
  node upload-to-cloud.js server/rag_data/chunks/数学一年级.json
  node upload-to-cloud.js --cleanup

功能:
- 统一集合策略: 所有数据上传到 teachai_main 主集合
- 批量上传95,360+增强教学材料到ChromaDB Cloud
- 质量过滤 (质量分数 >= 0.3)
- 自动去重和优化
- 进度监控和错误处理
- 集合清理: 删除不必要的分散集合

配置:
- ChromaDB Cloud端点: https://api.trychroma.com
- 数据库: teachai
- 主集合: teachai_main (统一集合)
- 质量阈值: 0.3
- 批处理大小: 50文档/批次
`);
    process.exit(0);
}

// Run the main function
main().catch(console.error);