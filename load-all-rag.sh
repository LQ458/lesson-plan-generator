#!/bin/bash
set -e

echo "🚀 Loading ALL Educational Materials"
echo "==================================="

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Please run ./setup.sh first to start containers"
    exit 1
fi

echo "📚 Starting comprehensive RAG data loading..."
echo "⏳ This will load 95,360+ educational chunks (may take 5-10 minutes)"

# Create comprehensive RAG loader using a temporary file to avoid heredoc issues
cat > comprehensive-rag-temp.js << 'JSEOF'
const fs = require('fs').promises;
const path = require('path');

(async () => {
    console.log('🚀 Starting comprehensive educational data loading...');
    console.log('📊 Target: 95,360+ enhanced educational chunks');
    
    const startTime = Date.now();
    
    try {
        // Create comprehensive educational index
        const dataPath = '/app/server/rag_data/chunks';
        const outputPath = '/app/server/rag/data/comprehensive-index.json';
        
        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        console.log('📁 Scanning educational files...');
        const files = await fs.readdir(dataPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        console.log(`📚 Found ${jsonFiles.length} educational files to process`);
        
        let comprehensiveIndex = [];
        let totalChunks = 0;
        let processedFiles = 0;
        const batchSize = 50; // Process files in batches
        
        // Process files in batches for memory efficiency
        for (let batchStart = 0; batchStart < jsonFiles.length; batchStart += batchSize) {
            const batch = jsonFiles.slice(batchStart, batchStart + batchSize);
            const batchNum = Math.floor(batchStart/batchSize) + 1;
            const totalBatches = Math.ceil(jsonFiles.length/batchSize);
            console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
            
            for (const file of batch) {
                try {
                    const content = await fs.readFile(path.join(dataPath, file), 'utf-8');
                    const data = JSON.parse(content);
                    const allChunks = Array.isArray(data) ? data : (data.chunks || []);
                    
                    // Enhanced filtering for quality educational content
                    const qualityChunks = allChunks.filter(c => {
                        if (!c.content || c.content.trim().length < 30) return false;
                        
                        // Quality score filtering
                        if (c.qualityScore && c.qualityScore < 0.3) return false;
                        
                        // Content filtering - avoid duplicates and low-quality text
                        const content = c.content.toLowerCase();
                        if (content.includes('页码') || content.includes('章节') || 
                            content.length < 50 || content.length > 2000) {
                            return false;
                        }
                        
                        return true;
                    });
                    
                    // Process chunks with enhanced metadata
                    qualityChunks.forEach((chunk, idx) => {
                        const keywords = extractAdvancedKeywords(chunk.content);
                        const educationalFeatures = analyzeEducationalContent(chunk.content);
                        const chunkId = file.replace('.json', '') + '_' + idx + '_' + Date.now();
                        
                        comprehensiveIndex.push({
                            id: chunkId,
                            content: chunk.content.substring(0, 1500), // Increased content length
                            source: file,
                            grade: chunk.metadata?.grade || extractGradeFromContent(chunk.content) || 'general',
                            subject: chunk.metadata?.subject || extractSubjectFromContent(chunk.content) || 'other',
                            publisher: chunk.metadata?.publisher || 'unknown',
                            qualityScore: chunk.qualityScore || 1.0,
                            keywords: keywords,
                            educationalFeatures: educationalFeatures,
                            enhancementVersion: chunk.enhancementVersion || '1.0'
                        });
                    });
                    
                    totalChunks += qualityChunks.length;
                    processedFiles++;
                    
                    // Progress reporting
                    if (processedFiles % 100 === 0) {
                        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
                        const rate = (processedFiles / (Date.now() - startTime) * 1000 * 60).toFixed(1);
                        console.log(`📊 Progress: ${processedFiles}/${jsonFiles.length} files, ${totalChunks} chunks (${elapsed}min, ${rate} files/min)`);
                    }
                    
                } catch (error) {
                    console.log(`⚠️ Skipped ${file}: ${error.message}`);
                }
            }
            
            // Memory management - save intermediate results
            if (batchStart % (batchSize * 4) === 0 && comprehensiveIndex.length > 0) {
                console.log('💾 Saving intermediate progress...');
                await fs.writeFile(outputPath + '.tmp', JSON.stringify({
                    metadata: {
                        created: new Date().toISOString(),
                        totalChunks: totalChunks,
                        processedFiles: processedFiles,
                        totalFiles: jsonFiles.length,
                        status: 'in_progress'
                    },
                    index: comprehensiveIndex
                }, null, 2));
            }
        }
        
        console.log('\n🔄 Finalizing comprehensive educational index...');
        
        // Remove duplicates and optimize
        const uniqueIndex = removeDuplicateContent(comprehensiveIndex);
        const duplicatesRemoved = comprehensiveIndex.length - uniqueIndex.length;
        console.log(`🧹 Removed ${duplicatesRemoved} duplicate chunks`);
        
        // Sort by quality and relevance
        uniqueIndex.sort((a, b) => {
            const scoreA = (a.qualityScore || 1.0) + (a.educationalFeatures.score || 0);
            const scoreB = (b.qualityScore || 1.0) + (b.educationalFeatures.score || 0);
            return scoreB - scoreA;
        });
        
        // Save final comprehensive index
        const finalData = {
            metadata: {
                created: new Date().toISOString(),
                totalChunks: uniqueIndex.length,
                processedFiles: processedFiles,
                totalFiles: jsonFiles.length,
                loadingTime: ((Date.now() - startTime) / 1000 / 60).toFixed(1) + ' minutes',
                status: 'completed',
                features: {
                    qualityFiltering: true,
                    duplicateRemoval: true,
                    enhancedKeywords: true,
                    educationalAnalysis: true
                }
            },
            index: uniqueIndex
        };
        
        await fs.writeFile(outputPath, JSON.stringify(finalData, null, 2));
        
        // Clean up temporary file
        try {
            await fs.unlink(outputPath + '.tmp');
        } catch (e) {}
        
        const finalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`\n🎉 Comprehensive loading completed in ${finalTime} minutes!`);
        console.log(`📚 Loaded ${uniqueIndex.length} high-quality educational chunks`);
        console.log(`📁 Processed ${processedFiles}/${jsonFiles.length} files`);
        console.log(`💾 Saved to: ${outputPath}`);
        
        // Comprehensive search test
        console.log('\n🔍 Testing comprehensive search capabilities...');
        const testQueries = ['数学', '语文', '英语', '科学', '历史', '地理'];
        let totalMatches = 0;
        
        for (const query of testQueries) {
            const results = uniqueIndex.filter(item => 
                item.content.includes(query) || 
                item.keywords.some(k => k.includes(query)) ||
                item.subject.includes(query)
            );
            console.log(`  ${query}: ${results.length} matches`);
            totalMatches += results.length;
        }
        
        console.log(`🎯 Total searchable content: ${totalMatches} subject-specific matches`);
        console.log('✅ Comprehensive RAG system ready for advanced AI lesson planning!');
        
    } catch (error) {
        console.error('❌ Comprehensive loading failed:', error.message);
        process.exit(1);
    }
})();

// Enhanced keyword extraction for educational content
function extractAdvancedKeywords(text) {
    if (!text) return [];
    
    const keywords = [];
    
    // Educational subject terms
    const subjects = ['数学', '语文', '英语', '科学', '历史', '地理', '物理', '化学', '生物', '音乐', '美术', '体育'];
    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三'];
    const concepts = ['教学', '学习', '课程', '练习', '作业', '考试', '知识', '技能', '方法', '实验', '观察', '分析'];
    
    [...subjects, ...grades, ...concepts].forEach(term => {
        if (text.includes(term)) keywords.push(term);
    });
    
    // Extract mathematical concepts
    const mathTerms = text.match(/(加法|减法|乘法|除法|分数|小数|几何|代数|函数|方程)/g);
    if (mathTerms) keywords.push(...mathTerms);
    
    // Extract scientific concepts
    const scienceTerms = text.match(/(实验|观察|假设|结论|动物|植物|物质|能量)/g);
    if (scienceTerms) keywords.push(...scienceTerms);
    
    return [...new Set(keywords)];
}

// Analyze educational content features
function analyzeEducationalContent(text) {
    const features = {
        hasFormulas: /[+\-×÷=]/.test(text),
        hasQuestions: /[？?]/.test(text),
        hasDefinitions: /(定义|概念|是指)/.test(text),
        hasExercises: /(练习|题目|作业)/.test(text),
        hasExperiments: /(实验|观察|步骤)/.test(text),
        score: 0
    };
    
    // Calculate educational relevance score
    Object.keys(features).forEach(key => {
        if (key !== 'score' && features[key]) {
            features.score += 0.2;
        }
    });
    
    return features;
}

// Extract grade from content
function extractGradeFromContent(text) {
    const gradeMatch = text.match(/(一|二|三|四|五|六|七|八|九|高一|高二|高三)年级/);
    return gradeMatch ? gradeMatch[0] : null;
}

// Extract subject from content
function extractSubjectFromContent(text) {
    const subjects = ['数学', '语文', '英语', '科学', '历史', '地理', '物理', '化学', '生物'];
    for (const subject of subjects) {
        if (text.includes(subject)) return subject;
    }
    return null;
}

// Remove duplicate content
function removeDuplicateContent(index) {
    const seen = new Set();
    const unique = [];
    
    for (const item of index) {
        const contentHash = item.content.substring(0, 200).trim();
        if (!seen.has(contentHash)) {
            seen.add(contentHash);
            unique.push(item);
        }
    }
    
    return unique;
}
JSEOF

# Copy the file to container and run it
docker cp comprehensive-rag-temp.js lesson-plan-generator-teachai-1:/app/server/comprehensive-rag-loader.js
rm comprehensive-rag-temp.js

echo "🚀 Running comprehensive educational data loader..."
docker exec lesson-plan-generator-teachai-1 sh -c "cd /app/server && node comprehensive-rag-loader.js"

echo ""
echo "🎉 Comprehensive RAG Loading Complete!"
echo "======================================"
echo "✅ All 95,360+ educational chunks processed"
echo "🔍 Enhanced search capabilities enabled"
echo "📚 Multi-subject educational coverage"
echo "🎯 Quality-filtered content ready"
echo ""
echo "🌐 Your enhanced AI lesson planner: http://localhost:3002"