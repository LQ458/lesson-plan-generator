#!/usr/bin/env node

/**
 * Manual ChromaDB Cloud Collection Cleanup
 * Based on collections shown in screenshot
 */

const ChromaDBCloudUploader = require('./server/rag/scripts/cloud-uploader');

async function manualCleanup() {
    console.log('🧹 Manual ChromaDB Cloud Collection Cleanup');
    console.log('==========================================');
    
    try {
        const uploader = new ChromaDBCloudUploader();
        await uploader.initialize();
        console.log('✅ ChromaDB Cloud连接成功!');
        
        // Collections from screenshot that should be deleted
        const collectionsToDelete = [
            'human_geography_textbook',
            'human_geography_simple', 
            'human_geography_textbook_v2',
            'teachai_grade1_math_vol1_859d92aa',
            'teachai_grade7_geography_vol1_4c',
            'teachai_grade7_geography_vol2_97'
        ];
        
        console.log('\n🎯 要删除的集合:');
        collectionsToDelete.forEach(name => {
            console.log(`  - ${name}`);
        });
        
        console.log('\n🗑️ 开始删除集合...');
        
        let successCount = 0;
        for (const collectionName of collectionsToDelete) {
            try {
                console.log(`删除中: ${collectionName}...`);
                const success = await uploader.deleteCollection(collectionName);
                if (success) {
                    console.log(`✅ 成功删除: ${collectionName}`);
                    successCount++;
                } else {
                    console.log(`❌ 删除失败: ${collectionName}`);
                }
                
                // Delay between deletions
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`❌ 删除错误: ${collectionName} - ${error.message}`);
            }
        }
        
        console.log(`\n🎉 清理完成! 成功删除 ${successCount}/${collectionsToDelete.length} 个集合`);
        
        // Now create main collection and upload one test file
        console.log('\n📚 创建主集合 teachai_main...');
        const mainCollection = await uploader.getOrCreateMainCollection();
        console.log('✅ 主集合已就绪');
        
        console.log('\n💡 现在可以使用以下命令上传数据到主集合:');
        console.log('   node upload-to-cloud.js');
        console.log('   或上传单个文件:');
        console.log('   node upload-to-cloud.js "server/rag_data/chunks/义务教育教科书·数学一年级上册.json"');
        
    } catch (error) {
        console.error('\n❌ 清理失败:', error.message);
        process.exit(1);
    }
}

manualCleanup();