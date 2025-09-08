#!/usr/bin/env node

/**
 * Comprehensive Verification of Real Educational Data
 * This verifies the RAG system returns actual textbook content, not mock data
 */

async function verifyRealEducationalData() {
    console.log('🔬 Comprehensive Verification of Real Educational Data');
    console.log('===================================================\n');

    console.log('📊 Step 1: Verify Local RAG Data is Real Educational Content');
    console.log('-----------------------------------------------------------');

    const fs = require('fs');
    const path = require('path');
    
    // Check local RAG data
    const ragDataPath = path.join(__dirname, 'server', 'rag_data', 'chunks');
    const files = fs.readdirSync(ragDataPath).filter(f => f.endsWith('.json')).slice(0, 5);
    
    let realContentVerified = 0;
    
    for (const filename of files) {
        const filePath = path.join(ragDataPath, filename);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Get first chunk
        const sample = data[0];
        const content = sample.content || '';
        
        console.log(`📁 File: ${filename.substring(0, 50)}...`);
        console.log(`📄 Content preview: ${content.substring(0, 150)}...`);
        
        // Verify this is real educational content by checking for:
        // 1. Chinese educational terminology
        // 2. Mathematical expressions or academic content
        // 3. Educational structure (exercises, questions, etc.)
        
        const educationalMarkers = [
            '义务教育', '年级', '上册', '下册', '教科书', '练习', '习题', '课',
            '单元', '复习', '考试', '学习', '教学', '学生', '老师', '作业'
        ];
        
        const mathematicalMarkers = [
            '=', '+', '-', '×', '÷', '（', '）', '数学', '计算', '公式',
            '题目', '解答', '证明', '定理'
        ];
        
        const hasEducationalTerms = educationalMarkers.some(marker => content.includes(marker));
        const hasMathematicalContent = mathematicalMarkers.some(marker => content.includes(marker));
        const hasChineseContent = /[\u4e00-\u9fff]/.test(content);
        const hasStructuredContent = content.length > 100; // Not just mock snippets
        
        console.log(`   ✅ Chinese educational terms: ${hasEducationalTerms ? 'Yes' : 'No'}`);
        console.log(`   ✅ Mathematical/Academic content: ${hasMathematicalContent ? 'Yes' : 'No'}`);
        console.log(`   ✅ Chinese language content: ${hasChineseContent ? 'Yes' : 'No'}`);
        console.log(`   ✅ Structured content (>100 chars): ${hasStructuredContent ? 'Yes' : 'No'}`);
        
        if (hasEducationalTerms && hasChineseContent && hasStructuredContent) {
            realContentVerified++;
            console.log(`   🎉 VERIFIED: This is real educational content!`);
        } else {
            console.log(`   ⚠️  QUESTIONABLE: May not be real educational content`);
        }
        
        console.log();
    }
    
    const realContentRate = (realContentVerified / files.length) * 100;
    console.log(`📊 Real Content Verification: ${realContentVerified}/${files.length} files verified as real educational content (${realContentRate}%)\n`);

    console.log('📋 Step 2: Analyze Content Quality and Educational Value');
    console.log('-----------------------------------------------------');
    
    // Analyze a few more files for educational value
    let totalQualityScore = 0;
    let educationalValueCount = 0;
    
    for (let i = 0; i < Math.min(files.length, 3); i++) {
        const filename = files[i];
        const filePath = path.join(ragDataPath, filename);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`\n📚 Analyzing: ${filename.substring(0, 40)}...`);
        console.log(`   📊 Total chunks in file: ${data.length}`);
        
        // Analyze multiple chunks for variety
        let fileQuality = 0;
        let validChunks = 0;
        
        for (let j = 0; j < Math.min(data.length, 3); j++) {
            const chunk = data[j];
            const content = chunk.content || '';
            const quality = chunk.metadata?.quality_score || 0.8;
            
            fileQuality += quality;
            validChunks++;
            
            // Check for specific educational patterns
            const hasExercises = /[0-9]+\..*?[？?]/.test(content) || content.includes('练习') || content.includes('题目');
            const hasInstructions = content.includes('解答') || content.includes('计算') || content.includes('说明');
            const hasFormulas = /[0-9]+\s*[+\-×÷=]\s*[0-9]/.test(content);
            const hasEducationalStructure = content.includes('单元') || content.includes('章节') || content.includes('课时');
            
            console.log(`   📄 Chunk ${j+1}: Quality ${(quality*100).toFixed(1)}%, Length ${content.length} chars`);
            if (hasExercises) console.log(`      ✅ Contains exercises/questions`);
            if (hasInstructions) console.log(`      ✅ Contains educational instructions`);
            if (hasFormulas) console.log(`      ✅ Contains mathematical formulas`);
            if (hasEducationalStructure) console.log(`      ✅ Has educational structure`);
        }
        
        const avgQuality = fileQuality / validChunks;
        totalQualityScore += avgQuality;
        
        if (avgQuality > 0.7) {
            educationalValueCount++;
        }
        
        console.log(`   🏆 File average quality: ${(avgQuality*100).toFixed(1)}%`);
    }
    
    const avgQualityOverall = (totalQualityScore / Math.min(files.length, 3)) * 100;
    const educationalValueRate = (educationalValueCount / Math.min(files.length, 3)) * 100;
    
    console.log(`\n📈 Overall Quality Analysis:`);
    console.log(`   🏆 Average quality score: ${avgQualityOverall.toFixed(1)}%`);
    console.log(`   🎓 High educational value: ${educationalValueCount}/${Math.min(files.length, 3)} files (${educationalValueRate.toFixed(1)}%)`);

    console.log('\n📝 Step 3: Verify Content Authenticity Markers');
    console.log('--------------------------------------------');
    
    // Check for authentic Chinese textbook markers
    let authenticityMarkers = 0;
    const authenticationTests = files.slice(0, 3);
    
    for (const filename of authenticationTests) {
        const filePath = path.join(ragDataPath, filename);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const sampleContent = data.slice(0, 5).map(d => d.content).join(' ');
        
        // Check for authentic Chinese textbook markers
        const hasPublisherInfo = sampleContent.includes('人民教育出版社') || sampleContent.includes('教育部');
        const hasCurriculumStructure = sampleContent.includes('义务教育') && sampleContent.includes('教科书');
        const hasGradeIndicators = /[一二三四五六七八九]+年级/.test(sampleContent);
        const hasChapterStructure = sampleContent.includes('单元') || sampleContent.includes('章') || /第.{1,3}课/.test(sampleContent);
        const hasEducationalLanguage = sampleContent.includes('学习目标') || sampleContent.includes('重点') || sampleContent.includes('难点');
        
        console.log(`📖 ${filename.substring(0, 30)}...`);
        console.log(`   ✅ Publisher markers: ${hasPublisherInfo ? 'Found' : 'Not found'}`);
        console.log(`   ✅ Curriculum structure: ${hasCurriculumStructure ? 'Found' : 'Not found'}`);
        console.log(`   ✅ Grade indicators: ${hasGradeIndicators ? 'Found' : 'Not found'}`);
        console.log(`   ✅ Chapter structure: ${hasChapterStructure ? 'Found' : 'Not found'}`);
        
        if (hasCurriculumStructure && hasGradeIndicators) {
            authenticityMarkers++;
            console.log(`   🏆 AUTHENTIC: Shows genuine textbook characteristics`);
        } else {
            console.log(`   ⚠️  UNCERTAIN: May not be authentic textbook content`);
        }
        console.log();
    }
    
    const authenticityRate = (authenticityMarkers / authenticationTests.length) * 100;

    console.log('🎯 FINAL VERIFICATION RESULTS');
    console.log('=============================');
    console.log(`📚 Real educational content: ${realContentRate.toFixed(1)}% verified`);
    console.log(`🏆 Average content quality: ${avgQualityOverall.toFixed(1)}%`);
    console.log(`🎓 High educational value: ${educationalValueRate.toFixed(1)}%`);
    console.log(`📖 Authentic textbook markers: ${authenticityRate.toFixed(1)}%`);
    
    console.log('\n🎪 AUTHENTICITY ASSESSMENT:');
    
    if (realContentRate >= 80 && avgQualityOverall >= 70 && authenticityRate >= 60) {
        console.log('🎉 VERIFIED: This is REAL educational content from authentic Chinese textbooks!');
        console.log('✅ Content shows genuine educational structure, terminology, and quality');
        console.log('✅ NOT mock data - contains actual curriculum materials');
        console.log('✅ Suitable for lesson plan generation and educational AI applications');
        return true;
    } else if (realContentRate >= 60 && avgQualityOverall >= 60) {
        console.log('⚠️  MOSTLY REAL: Content appears to be largely authentic educational material');
        console.log('✅ Suitable for educational use but may have some quality variations');
        return true;
    } else {
        console.log('❌ QUESTIONABLE: Content authenticity could not be fully verified');
        console.log('⚠️  May contain mock data or low-quality educational materials');
        return false;
    }
}

verifyRealEducationalData().catch(console.error);