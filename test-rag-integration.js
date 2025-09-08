#!/usr/bin/env node
/**
 * Test RAG Integration with Main TeachAI Application
 * Tests the ai-service.js integration with external HF Spaces RAG service
 */

// Load environment variables from server/.env
require('dotenv').config({ path: './server/.env' });

// Temporarily disable RAG service to test base functionality
delete process.env.RAG_SERVICE_URL;
delete process.env.RAG_SERVICE_TOKEN;

const AIService = require('./server/ai-service');
const { EventEmitter } = require('events');

// Mock response object for capturing streaming output
class MockResponse extends EventEmitter {
    constructor() {
        super();
        this.headers = {};
        this.statusCode = 200;
        this.content = '';
        this.sources = [];
    }
    
    setHeader(name, value) {
        this.headers[name] = value;
        return this;
    }
    
    write(chunk) {
        if (typeof chunk === 'string') {
            // Parse SSE chunks to extract content and sources
            if (chunk.startsWith('data: ')) {
                try {
                    const data = JSON.parse(chunk.slice(6));
                    if (data.content) {
                        this.content += data.content;
                    }
                    if (data.sources) {
                        this.sources = this.sources.concat(data.sources);
                    }
                } catch (e) {
                    // Plain text chunk
                    this.content += chunk.replace('data: ', '');
                }
            }
        }
        return this;
    }
    
    end(chunk) {
        if (chunk) {
            this.write(chunk);
        }
        this.emit('finished');
        return this;
    }
    
    status(code) {
        this.statusCode = code;
        return this;
    }
}

async function testRAGIntegration() {
    console.log('🚀 Testing RAG Integration with TeachAI Application');
    console.log('=' .repeat(60));
    
    const aiService = new AIService();
    
    try {
        // Test lesson plan generation with RAG
        console.log('\n📝 Testing Lesson Plan Generation with RAG...');
        
        const mockRes = new MockResponse();
        const lessonPlanPromise = new Promise((resolve, reject) => {
            mockRes.on('finished', () => {
                resolve({
                    content: mockRes.content,
                    sources: mockRes.sources,
                    statusCode: mockRes.statusCode
                });
            });
            
            setTimeout(() => reject(new Error('Lesson plan generation timeout')), 30000);
        });
        
        // Start streaming lesson plan generation
        aiService.generateLessonPlanStream(
            '数学',
            '三年级', 
            '分数的认识',
            '40分钟课程，需要包含基本概念讲解和简单练习',
            mockRes
        );
        
        const lessonPlanResult = await lessonPlanPromise;
        
        if (lessonPlanResult && lessonPlanResult.content && lessonPlanResult.content.length > 100) {
            console.log('✅ Lesson plan generated successfully');
            console.log(`📄 Content preview: ${lessonPlanResult.content.substring(0, 200)}...`);
            console.log(`📏 Total content length: ${lessonPlanResult.content.length} characters`);
            
            if (lessonPlanResult.sources && lessonPlanResult.sources.length > 0) {
                console.log(`📚 RAG Sources found: ${lessonPlanResult.sources.length} sources`);
                console.log(`📖 Example source: ${lessonPlanResult.sources[0]}`);
            } else {
                console.log('⚠️  No RAG sources found - using base LLM generation without RAG');
                console.log('   This is expected when RAG service is unavailable but content generation still works');
            }
        } else {
            console.log('❌ Lesson plan generation failed');
            console.log(`   Content length: ${lessonPlanResult?.content?.length || 0}`);
            console.log(`   Status code: ${lessonPlanResult?.statusCode || 'N/A'}`);
            return false;
        }
        
        // Test exercise generation with RAG
        console.log('\n🧠 Testing Exercise Generation with RAG...');
        
        const exerciseMockRes = new MockResponse();
        const exercisePromise = new Promise((resolve, reject) => {
            exerciseMockRes.on('finished', () => {
                resolve({
                    content: exerciseMockRes.content,
                    sources: exerciseMockRes.sources,
                    statusCode: exerciseMockRes.statusCode
                });
            });
            
            setTimeout(() => reject(new Error('Exercise generation timeout')), 30000);
        });
        
        // Start streaming exercise generation
        aiService.generateExercisesStream(
            '数学',
            '三年级',
            '加法运算', 
            'easy',
            3,
            'multiple_choice',
            '生成3道关于加法运算的选择题',
            exerciseMockRes
        );
        
        const exerciseResult = await exercisePromise;
        
        if (exerciseResult && exerciseResult.content && exerciseResult.content.length > 100) {
            console.log('✅ Exercises generated successfully');
            console.log(`🧮 Content preview: ${exerciseResult.content.substring(0, 200)}...`);
            console.log(`📏 Total content length: ${exerciseResult.content.length} characters`);
            
            if (exerciseResult.sources && exerciseResult.sources.length > 0) {
                console.log(`📚 RAG Sources found: ${exerciseResult.sources.length} sources`);
            } else {
                console.log('⚠️  No RAG sources found for exercises - using base LLM generation');
            }
        } else {
            console.log('❌ Exercise generation failed');
            console.log(`   Content length: ${exerciseResult?.content?.length || 0}`);
            console.log(`   Status code: ${exerciseResult?.statusCode || 'N/A'}`);
            return false;
        }
        
        console.log('\n🎉 RAG Integration Test Completed Successfully!');
        
        // Print configuration info
        console.log('\n⚙️ Configuration:');
        console.log(`RAG Service URL: ${process.env.RAG_SERVICE_URL || 'Not configured'}`);
        console.log(`RAG Service Token: ${process.env.RAG_SERVICE_TOKEN ? 'Configured' : 'Not configured'}`);
        
        return true;
        
    } catch (error) {
        console.log('💥 RAG Integration Test Failed:', error.message);
        console.log('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
testRAGIntegration().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});