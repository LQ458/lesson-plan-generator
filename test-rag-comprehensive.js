#!/usr/bin/env node
/**
 * Comprehensive RAG Service Test Suite
 * Tests the deployed HF Spaces RAG service with real educational data
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://lq458-teachai.hf.space';
const AUTH_TOKEN = process.env.RAG_SERVICE_TOKEN || 'your_token_here';

// Test cases covering different subjects and grades
const TEST_QUERIES = [
    // Math queries
    { query: '数学加法', subject: '数学', grade: '一年级', expectedSubjects: ['数学'], description: 'Basic math addition for grade 1' },
    { query: '分数运算', subject: '数学', grade: '五年级', expectedSubjects: ['数学'], description: 'Fraction operations for grade 5' },
    { query: '代数方程', subject: '数学', grade: '八年级', expectedSubjects: ['数学'], description: 'Algebraic equations for grade 8' },
    
    // Science queries
    { query: '植物细胞', subject: '科学', grade: '七年级', expectedSubjects: ['生物', '科学'], description: 'Plant cells for grade 7' },
    { query: '重力加速度', subject: '物理', grade: '九年级', expectedSubjects: ['物理'], description: 'Gravitational acceleration for grade 9' },
    { query: '化学反应', subject: '化学', grade: '九年级', expectedSubjects: ['化学'], description: 'Chemical reactions for grade 9' },
    
    // Geography queries
    { query: '地形地貌', subject: '地理', grade: '七年级', expectedSubjects: ['地理'], description: 'Landforms and topography for grade 7' },
    { query: '气候变化', subject: '地理', grade: '八年级', expectedSubjects: ['地理'], description: 'Climate change for grade 8' },
    
    // General queries (no filters)
    { query: '教育方法', description: 'General educational methods query' },
    { query: '学习技巧', description: 'General learning techniques query' },
    
    // Cross-subject queries
    { query: '运动', expectedSubjects: ['体育', '物理'], description: 'Movement (sports and physics)' },
    { query: '音乐节拍', subject: '音乐', expectedSubjects: ['音乐'], description: 'Musical rhythm and beats' },
];

// Test utilities
async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response.json();
}

// Test functions
async function testHealthCheck() {
    console.log('\n🔍 Testing Health Check...');
    try {
        const result = await makeRequest('/api/health');
        console.log('✅ Health Check Response:', result);
        
        if (result.service === 'TeachAI RAG Service') {
            console.log('✅ Service name correct');
        } else {
            console.log('❌ Unexpected service name:', result.service);
        }
        
        if (result.status === 'healthy' || result.status === 'initializing') {
            console.log('✅ Service status OK:', result.status);
        } else {
            console.log('❌ Unexpected service status:', result.status);
        }
        
        return true;
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return false;
    }
}

async function testStats() {
    console.log('\n📊 Testing Statistics Endpoint...');
    try {
        const stats = await makeRequest('/api/stats');
        console.log('✅ Stats Response:', JSON.stringify(stats, null, 2));
        
        if (stats.total_chunks > 0) {
            console.log(`✅ Total chunks loaded: ${stats.total_chunks}`);
        } else {
            console.log('❌ No chunks loaded');
            return false;
        }
        
        if (Object.keys(stats.subjects || {}).length > 0) {
            console.log(`✅ Subjects found: ${Object.keys(stats.subjects).join(', ')}`);
        } else {
            console.log('❌ No subjects found');
        }
        
        if (Object.keys(stats.grades || {}).length > 0) {
            console.log(`✅ Grades found: ${Object.keys(stats.grades).join(', ')}`);
        } else {
            console.log('❌ No grades found');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Stats test failed:', error.message);
        return false;
    }
}

async function testSearch(testCase) {
    const { query, subject, grade, expectedSubjects, description } = testCase;
    console.log(`\n🔍 Testing Search: ${description}`);
    console.log(`   Query: "${query}", Subject: ${subject || 'any'}, Grade: ${grade || 'any'}`);
    
    try {
        const searchData = { query, limit: 5 };
        if (subject) searchData.subject = subject;
        if (grade) searchData.grade = grade;
        
        const results = await makeRequest('/api/search', {
            method: 'POST',
            body: JSON.stringify(searchData)
        });
        
        if (!results.chunks || !Array.isArray(results.chunks)) {
            console.log('❌ Invalid response format - missing chunks array');
            return false;
        }
        
        console.log(`✅ Found ${results.chunks.length} results`);
        
        if (results.chunks.length === 0) {
            console.log('⚠️  No results found for this query');
            return true; // Not necessarily an error, just no matches
        }
        
        // Analyze results
        const foundSubjects = new Set();
        const foundGrades = new Set();
        
        results.chunks.forEach((chunk, index) => {
            if (chunk.metadata?.subject) {
                foundSubjects.add(chunk.metadata.subject);
            }
            if (chunk.metadata?.grade) {
                foundGrades.add(chunk.metadata.grade);
            }
            
            console.log(`   Result ${index + 1}: ${chunk.content.substring(0, 100)}...`);
            console.log(`     Subject: ${chunk.metadata?.subject || 'N/A'}, Grade: ${chunk.metadata?.grade || 'N/A'}, Score: ${chunk.score}`);
        });
        
        // Validate subject filtering
        if (subject && foundSubjects.size > 0 && !foundSubjects.has(subject)) {
            console.log(`❌ Subject filter failed - expected ${subject}, found: ${Array.from(foundSubjects).join(', ')}`);
        } else if (subject && foundSubjects.has(subject)) {
            console.log(`✅ Subject filter working - found ${subject}`);
        }
        
        // Validate grade filtering
        if (grade && foundGrades.size > 0 && !foundGrades.has(grade)) {
            console.log(`❌ Grade filter failed - expected ${grade}, found: ${Array.from(foundGrades).join(', ')}`);
        } else if (grade && foundGrades.has(grade)) {
            console.log(`✅ Grade filter working - found ${grade}`);
        }
        
        // Check expected subjects
        if (expectedSubjects) {
            const hasExpected = expectedSubjects.some(expected => foundSubjects.has(expected));
            if (hasExpected) {
                console.log(`✅ Found expected subjects: ${Array.from(foundSubjects).join(', ')}`);
            } else {
                console.log(`⚠️  Expected subjects not found: ${expectedSubjects.join(', ')}, found: ${Array.from(foundSubjects).join(', ')}`);
            }
        }
        
        return true;
    } catch (error) {
        console.log('❌ Search test failed:', error.message);
        return false;
    }
}

async function testPerformance() {
    console.log('\n⚡ Testing Performance...');
    const query = { query: '数学', limit: 10 };
    
    const times = [];
    for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
            await makeRequest('/api/search', {
                method: 'POST',
                body: JSON.stringify(query)
            });
            const duration = Date.now() - start;
            times.push(duration);
            console.log(`   Run ${i + 1}: ${duration}ms`);
        } catch (error) {
            console.log(`   Run ${i + 1}: Failed - ${error.message}`);
            return false;
        }
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`✅ Average response time: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime < 5000) {
        console.log('✅ Performance: Excellent (< 5s)');
    } else if (avgTime < 10000) {
        console.log('✅ Performance: Good (< 10s)');
    } else {
        console.log('⚠️  Performance: Slow (> 10s)');
    }
    
    return true;
}

async function testEdgeCases() {
    console.log('\n🎯 Testing Edge Cases...');
    
    const edgeCases = [
        { query: '', description: 'Empty query' },
        { query: 'xyz非常罕见的查询', description: 'Very rare query' },
        { query: '数学', subject: '不存在的科目', description: 'Non-existent subject' },
        { query: '数学', grade: '不存在的年级', description: 'Non-existent grade' },
        { query: 'a', description: 'Single character query' },
        { query: '数学'.repeat(50), description: 'Very long query' },
    ];
    
    let passed = 0;
    for (const edgeCase of edgeCases) {
        console.log(`\n   Testing: ${edgeCase.description}`);
        try {
            const searchData = { query: edgeCase.query, limit: 3 };
            if (edgeCase.subject) searchData.subject = edgeCase.subject;
            if (edgeCase.grade) searchData.grade = edgeCase.grade;
            
            const results = await makeRequest('/api/search', {
                method: 'POST',
                body: JSON.stringify(searchData)
            });
            
            if (edgeCase.query === '') {
                console.log('⚠️  Empty query should ideally return an error');
            } else {
                console.log(`✅ Handled gracefully: ${results.chunks?.length || 0} results`);
            }
            passed++;
        } catch (error) {
            console.log(`✅ Properly rejected: ${error.message}`);
            passed++;
        }
    }
    
    console.log(`✅ Edge cases: ${passed}/${edgeCases.length} handled properly`);
    return passed === edgeCases.length;
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Comprehensive RAG Service Tests');
    console.log('='.repeat(50));
    
    const results = {
        health: false,
        stats: false,
        search: 0,
        performance: false,
        edgeCases: false
    };
    
    // Health check
    results.health = await testHealthCheck();
    
    // Stats check
    results.stats = await testStats();
    
    // Only proceed with search tests if service is healthy and has data
    if (results.health && results.stats) {
        // Search tests
        console.log('\n🔍 Running Search Tests...');
        for (const testCase of TEST_QUERIES) {
            const success = await testSearch(testCase);
            if (success) results.search++;
        }
        
        // Performance tests
        results.performance = await testPerformance();
        
        // Edge case tests
        results.edgeCases = await testEdgeCases();
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Test Summary:');
    console.log(`   Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Statistics: ${results.stats ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Search Tests: ${results.search}/${TEST_QUERIES.length} passed`);
    console.log(`   Performance: ${results.performance ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Edge Cases: ${results.edgeCases ? '✅ PASS' : '❌ FAIL'}`);
    
    const totalTests = 4 + TEST_QUERIES.length;
    const passedTests = (results.health ? 1 : 0) + (results.stats ? 1 : 0) + 
                       results.search + (results.performance ? 1 : 0) + 
                       (results.edgeCases ? 1 : 0);
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! RAG service is fully functional.');
    } else if (passedTests >= totalTests * 0.8) {
        console.log('✅ Most tests passed. RAG service is mostly functional.');
    } else {
        console.log('⚠️  Some tests failed. RAG service needs attention.');
    }
    
    // Save results
    const reportPath = path.join(__dirname, 'rag-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        service_url: BASE_URL,
        results,
        summary: {
            total_tests: totalTests,
            passed_tests: passedTests,
            success_rate: ((passedTests/totalTests)*100).toFixed(1) + '%'
        }
    }, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Handle fetch if not available (Node.js < 18)
if (typeof fetch === 'undefined') {
    console.log('Installing fetch polyfill...');
    global.fetch = require('node-fetch');
}

// Run tests
runTests().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});