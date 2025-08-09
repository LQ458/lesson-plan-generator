const { CloudClient, DefaultEmbeddingFunction } = require("chromadb");

async function testListCollections() {
    try {
        console.log('🌐 连接到ChromaDB Cloud...');
        
        const client = new CloudClient({
            apiKey: 'ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
            tenant: 'ac97bc90-bba3-4f52-ab06-f0485262312e',
            database: 'teachai'
        });
        
        console.log('✅ 连接成功');
        
        const collections = await client.listCollections();
        console.log(`📊 找到 ${collections.length} 个集合`);
        
        collections.forEach((collection, index) => {
            console.log(`集合 ${index}:`, {
                name: collection.name,
                id: collection.id,
                keys: Object.keys(collection),
                raw: collection
            });
        });
        
        // Try to delete specific collections from your screenshot
        const collectionsToDelete = [
            'human_geography_textbook',
            'human_geography_simple', 
            'human_geography_textbook_v2',
            'teachai_grade7_geography_vol1_4c',
            'teachai_grade7_geography_vol2_97'
        ];
        
        for (const name of collectionsToDelete) {
            try {
                console.log(`🗑️ 尝试删除集合: ${name}`);
                await client.deleteCollection({ name });
                console.log(`✅ 删除成功: ${name}`);
            } catch (error) {
                console.log(`❌ 删除失败: ${name} - ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ 错误:', error);
    }
}

testListCollections();