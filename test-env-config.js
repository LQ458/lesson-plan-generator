#!/usr/bin/env node

/**
 * Test Environment Variable Configuration for ChromaDB Cloud
 * Verifies that all required environment variables are properly configured
 */

const { CloudClient, DefaultEmbeddingFunction } = require("chromadb");
const config = require("./server/rag/config/vector-db-config");

class EnvConfigTester {
    constructor() {
        this.requiredVars = [
            'CHROMADB_API_KEY',
            'CHROMADB_TENANT',
            'CHROMADB_DATABASE'
        ];
        
        this.optionalVars = [
            'CHROMADB_COLLECTION',
            'CHROMA_CLOUD_ENABLED',
            'NODE_ENV'
        ];
    }

    testEnvironmentVariables() {
        console.log('🔧 Testing Environment Variable Configuration');
        console.log('===========================================\n');

        // Check required variables
        console.log('📋 Required Environment Variables:');
        let missingRequired = [];
        
        for (const varName of this.requiredVars) {
            const value = process.env[varName];
            if (!value || value.length < 3) {
                console.log(`❌ ${varName}: MISSING or INVALID`);
                missingRequired.push(varName);
            } else {
                const maskedValue = this.maskSecret(value);
                console.log(`✅ ${varName}: ${maskedValue}`);
            }
        }

        // Check optional variables
        console.log('\n📋 Optional Environment Variables:');
        for (const varName of this.optionalVars) {
            const value = process.env[varName];
            if (value) {
                console.log(`✅ ${varName}: ${value}`);
            } else {
                console.log(`⚪ ${varName}: Not set (using default)`);
            }
        }

        return missingRequired;
    }

    testVectorDbConfig() {
        console.log('\n🔧 Testing Vector DB Configuration:');
        console.log('===================================');

        try {
            console.log('📊 Cloud Configuration:');
            console.log(`  - Enabled: ${config.chroma.cloud.enabled}`);
            console.log(`  - API Key: ${this.maskSecret(config.chroma.cloud.apiKey || 'Not set')}`);
            console.log(`  - Tenant: ${config.chroma.cloud.tenant || 'Not set'}`);
            console.log(`  - Database: ${config.chroma.cloud.database || 'Not set'}`);
            console.log(`  - Collection: ${config.chroma.collection.name || 'Not set'}`);

            console.log('\n📊 Local Configuration:');
            console.log(`  - Path: ${config.chroma.path || 'Default'}`);
            console.log(`  - Host: ${config.chroma.host || 'localhost'}`);
            console.log(`  - Port: ${config.chroma.port || '8000'}`);

            return true;
        } catch (error) {
            console.log(`❌ Configuration Error: ${error.message}`);
            return false;
        }
    }

    async testCloudConnection() {
        console.log('\n🌐 Testing ChromaDB Cloud Connection:');
        console.log('====================================');

        if (!config.chroma.cloud.enabled) {
            console.log('⚪ Cloud mode disabled, skipping connection test');
            return true;
        }

        try {
            console.log('🔌 Creating CloudClient...');
            const client = new CloudClient({
                apiKey: config.chroma.cloud.apiKey,
                tenant: config.chroma.cloud.tenant,
                database: config.chroma.cloud.database
            });

            console.log('❤️  Testing heartbeat...');
            await client.heartbeat();
            console.log('✅ Connection successful!');

            console.log('📚 Listing collections...');
            const collections = await client.listCollections();
            console.log(`📊 Found ${collections.length} collections`);
            
            if (collections.length > 0) {
                collections.forEach(col => {
                    const name = col.name || col.id || 'unknown';
                    console.log(`  - ${name}`);
                });
            }

            // Test getting/creating main collection
            console.log('\n🎯 Testing main collection access...');
            try {
                const collection = await client.getCollection({
                    name: config.chroma.collection.name,
                    embeddingFunction: new DefaultEmbeddingFunction()
                });
                const count = await collection.count();
                console.log(`✅ Main collection "${config.chroma.collection.name}" exists with ${count} documents`);
            } catch (error) {
                if (error.message.includes('does not exist')) {
                    console.log(`⚠️ Main collection "${config.chroma.collection.name}" does not exist`);
                    console.log('💡 Run the upload script to create it: node server/rag/scripts/cloud-uploader.js');
                } else {
                    throw error;
                }
            }

            return true;
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            
            console.log('\n🔧 Troubleshooting suggestions:');
            if (error.message.includes('API key')) {
                console.log('  - Check your CHROMADB_API_KEY is correct');
                console.log('  - Verify the API key has proper permissions');
            }
            if (error.message.includes('tenant')) {
                console.log('  - Check your CHROMADB_TENANT ID is correct');
                console.log('  - Ensure the tenant exists in ChromaDB Cloud');
            }
            if (error.message.includes('network') || error.message.includes('timeout')) {
                console.log('  - Check your internet connection');
                console.log('  - Verify ChromaDB Cloud service status');
            }
            
            return false;
        }
    }

    maskSecret(value) {
        if (!value || value === 'Not set') return value;
        if (value.length <= 8) return '*'.repeat(value.length);
        return value.substring(0, 8) + '*'.repeat(Math.min(value.length - 8, 8));
    }

    async runAllTests() {
        console.log('🧪 Environment Configuration Test Suite');
        console.log('======================================\n');

        // Test 1: Environment Variables
        const missingVars = this.testEnvironmentVariables();
        
        // Test 2: Configuration Loading
        const configOk = this.testVectorDbConfig();
        
        // Test 3: Cloud Connection (if enabled)
        let connectionOk = true;
        if (config.chroma.cloud.enabled) {
            connectionOk = await this.testCloudConnection();
        } else {
            console.log('\n🌐 ChromaDB Cloud Connection: SKIPPED (cloud mode disabled)');
        }

        // Summary
        console.log('\n📋 Test Summary:');
        console.log('================');
        console.log(`Environment Variables: ${missingVars.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Configuration Loading: ${configOk ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Cloud Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);

        if (missingVars.length > 0) {
            console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
            console.log('\n💡 To fix this:');
            console.log('1. Set the missing environment variables');
            console.log('2. Copy .env.example to .env and fill in your values');
            console.log('3. Run: export CHROMADB_API_KEY=your_key_here');
        }

        const allPassed = missingVars.length === 0 && configOk && connectionOk;
        
        if (allPassed) {
            console.log('\n🎉 All tests passed! Your configuration is ready for production.');
        } else {
            console.log('\n🔧 Some tests failed. Please fix the issues above before deploying.');
        }

        return allPassed;
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new EnvConfigTester();
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test suite failed:', error.message);
            process.exit(1);
        });
}

module.exports = EnvConfigTester;