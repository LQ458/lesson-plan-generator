#!/usr/bin/env node

const { CloudClient, DefaultEmbeddingFunction } = require("chromadb");

async function testAuth() {
    console.log('🔐 Testing ChromaDB Cloud Authentication...');
    
    const config = {
        apiKey: process.env.CHROMADB_API_KEY || 'ck-DoWAAaxDQhJHjUN5sM6Xk16TQZmGiwZU35x9nLKFPnWF',
        tenant: process.env.CHROMADB_TENANT || 'ac97bc90-bba3-4f52-ab06-f0485262312e',
        database: process.env.CHROMADB_DATABASE || 'teachai'
    };
    
    try {
        console.log(`📡 API Key: ${config.apiKey.substring(0, 10)}...`);
        console.log(`🏢 Tenant: ${config.tenant}`);
        console.log(`💾 Database: ${config.database}`);
        
        const client = new CloudClient({
            apiKey: config.apiKey,
            tenant: config.tenant,
            database: config.database
        });
        
        console.log('\n🔄 Testing heartbeat...');
        await client.heartbeat();
        console.log('✅ Heartbeat successful!');
        
        console.log('\n🔄 Testing list collections...');
        const collections = await client.listCollections();
        console.log(`📚 Found ${collections.length} collections`);
        
        console.log('\n🔄 Testing get or create main collection...');
        try {
            const mainCollection = await client.getCollection({
                name: 'teachai_main',
                embeddingFunction: new DefaultEmbeddingFunction()
            });
            const count = await mainCollection.count();
            console.log(`✅ Main collection exists with ${count} documents`);
        } catch (error) {
            if (error.message.includes('does not exist')) {
                console.log('⚠️ Main collection does not exist, creating...');
                const mainCollection = await client.createCollection({
                    name: 'teachai_main',
                    embeddingFunction: new DefaultEmbeddingFunction(),
                    metadata: {
                        "hnsw:space": "cosine",
                        description: "TeachAI unified education materials",
                        version: "3.0",
                        enhanced: true,
                        unified: true,
                        created_at: new Date().toISOString()
                    }
                });
                console.log('✅ Main collection created successfully');
            } else {
                throw error;
            }
        }
        
        console.log('\n✅ All authentication tests passed!');
        
    } catch (error) {
        console.error('\n❌ Authentication failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Check if API key is valid and not expired');
        console.error('2. Verify tenant ID is correct');
        console.error('3. Ensure database name exists');
        console.error('4. Check network connectivity');
        process.exit(1);
    }
}

testAuth().catch(console.error);