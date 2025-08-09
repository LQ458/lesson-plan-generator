/**
 * Admin Routes for RAG Data Management
 * Handles cloud deployment RAG loading and management
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const SimpleRAGService = require('../rag/services/simple-rag-service');
const ChromaDBCloudUploader = require('../rag/scripts/cloud-uploader');

const router = express.Router();
const simpleRAG = new SimpleRAGService();

// Middleware for basic admin authentication
const adminAuth = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    const expectedKey = process.env.ADMIN_KEY || 'dev-admin-key';
    
    if (adminKey !== expectedKey) {
        return res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Valid admin key required'
        });
    }
    
    next();
};

/**
 * POST /api/admin/load-rag-data
 * Load comprehensive RAG data in cloud environment
 */
router.post('/load-rag-data', adminAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('🚀 Starting cloud RAG data loading...');
        
        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        const log = (message) => {
            console.log(message);
            res.write(message + '\n');
        };
        
        log('📊 Target: Loading comprehensive educational materials');
        log('⏳ Estimated time: 5-10 minutes');
        
        // Create comprehensive educational index
        const dataPath = path.join(__dirname, '../rag_data/chunks');
        const outputPath = path.join(__dirname, '../rag/data/comprehensive-index.json');
        
        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        log('📁 Scanning educational files...');
        const files = await fs.readdir(dataPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        log(`📚 Found ${jsonFiles.length} educational files to process`);
        
        let comprehensiveIndex = [];
        let totalChunks = 0;
        let processedFiles = 0;
        const batchSize = 25; // Smaller batches for cloud environment
        
        // Process files in batches for memory efficiency
        for (let batchStart = 0; batchStart < jsonFiles.length; batchStart += batchSize) {
            const batch = jsonFiles.slice(batchStart, batchStart + batchSize);
            const batchNum = Math.floor(batchStart/batchSize) + 1;
            const totalBatches = Math.ceil(jsonFiles.length/batchSize);
            
            log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
            
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
                            content: chunk.content.substring(0, 1200), // Optimized for cloud
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
                    if (processedFiles % 50 === 0) {
                        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
                        const rate = (processedFiles / (Date.now() - startTime) * 1000 * 60).toFixed(1);
                        log(`📊 Progress: ${processedFiles}/${jsonFiles.length} files, ${totalChunks} chunks (${elapsed}min, ${rate} files/min)`);
                    }
                    
                } catch (error) {
                    log(`⚠️ Skipped ${file}: ${error.message}`);
                }
            }
            
            // Memory management - save intermediate results
            if (batchStart % (batchSize * 2) === 0 && comprehensiveIndex.length > 0) {
                log('💾 Saving intermediate progress...');
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
        
        log('🔄 Finalizing comprehensive educational index...');
        
        // Remove duplicates and optimize
        const uniqueIndex = removeDuplicateContent(comprehensiveIndex);
        const duplicatesRemoved = comprehensiveIndex.length - uniqueIndex.length;
        log(`🧹 Removed ${duplicatesRemoved} duplicate chunks`);
        
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
                environment: 'cloud',
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
        log(`🎉 Comprehensive loading completed in ${finalTime} minutes!`);
        log(`📚 Loaded ${uniqueIndex.length} high-quality educational chunks`);
        log(`📁 Processed ${processedFiles}/${jsonFiles.length} files`);
        log(`💾 Saved to: ${outputPath}`);
        
        // Comprehensive search test
        log('🔍 Testing comprehensive search capabilities...');
        const testQueries = ['数学', '语文', '英语', '科学', '历史', '地理'];
        let totalMatches = 0;
        
        for (const query of testQueries) {
            const results = uniqueIndex.filter(item => 
                item.content.includes(query) || 
                item.keywords.some(k => k.includes(query)) ||
                item.subject.includes(query)
            );
            log(`  ${query}: ${results.length} matches`);
            totalMatches += results.length;
        }
        
        log(`🎯 Total searchable content: ${totalMatches} subject-specific matches`);
        log('✅ Comprehensive RAG system ready for advanced AI lesson planning!');
        
        // Initialize SimpleRAG service with new data
        await simpleRAG.initialize();
        
        res.end('\n🎉 RAG data loading completed successfully!');
        
    } catch (error) {
        console.error('❌ RAG loading failed:', error);
        res.status(500).end(`❌ RAG loading failed: ${error.message}`);
    }
});

/**
 * GET /api/admin/rag-status
 * Check RAG system status
 */
router.get('/rag-status', adminAuth, async (req, res) => {
    try {
        const status = await simpleRAG.getStatus();
        
        res.json({
            success: true,
            status: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/clear-rag-data
 * Clear RAG data (useful for reloading)
 */
router.post('/clear-rag-data', adminAuth, async (req, res) => {
    try {
        const outputPath = path.join(__dirname, '../rag/data/comprehensive-index.json');
        const simplePath = path.join(__dirname, '../rag/data/simple-index.json');
        
        const results = [];
        
        try {
            await fs.unlink(outputPath);
            results.push('Cleared comprehensive index');
        } catch (e) {
            results.push('No comprehensive index to clear');
        }
        
        try {
            await fs.unlink(simplePath);
            results.push('Cleared simple index');
        } catch (e) {
            results.push('No simple index to clear');
        }
        
        res.json({
            success: true,
            message: 'RAG data cleared',
            details: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper functions (same as in comprehensive loader)
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

function extractGradeFromContent(text) {
    const gradeMatch = text.match(/(一|二|三|四|五|六|七|八|九|高一|高二|高三)年级/);
    return gradeMatch ? gradeMatch[0] : null;
}

function extractSubjectFromContent(text) {
    const subjects = ['数学', '语文', '英语', '科学', '历史', '地理', '物理', '化学', '生物'];
    for (const subject of subjects) {
        if (text.includes(subject)) return subject;
    }
    return null;
}

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

/**
 * POST /api/admin/upload-to-cloud
 * Upload local RAG data to ChromaDB Cloud
 */
router.post('/upload-to-cloud', adminAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        console.log('🌐 Starting ChromaDB Cloud upload...');
        
        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        const log = (message) => {
            console.log(message);
            res.write(message + '\n');
        };
        
        log('🚀 [ChromaDB Cloud] 开始上传本地RAG数据到云端...');
        log('📊 目标: 将95,360+增强教学材料上传到ChromaDB Cloud');
        log('⏳ 预计时间: 10-20分钟 (取决于网络速度)');
        
        const uploader = new ChromaDBCloudUploader();
        await uploader.initialize();
        
        log('✅ ChromaDB Cloud连接成功');
        log('📁 开始批量上传文件...');
        
        // Override uploader's logger to use our streaming log
        const originalLogInfo = console.log;
        console.log = log;
        
        const result = await uploader.uploadAllFiles();
        
        // Restore original logger
        console.log = originalLogInfo;
        
        const finalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        
        log(`🎉 云端上传完成! 用时 ${finalTime} 分钟`);
        log(`📊 上传统计:`);
        log(`  - 总文件数: ${result.totalFiles}`);
        log(`  - 成功上传: ${result.successfulUploads}`);
        log(`  - 上传文档数: ${result.totalDocumentsUploaded}`);
        log(`  - 成功率: ${result.successRate}`);
        
        if (result.failedUploads > 0) {
            log(`⚠️ 失败文件数: ${result.failedUploads}`);
        }
        
        log('✅ RAG数据已成功同步到ChromaDB Cloud!');
        log('🔗 可通过云端API访问教学内容检索功能');
        
        res.end('\n🎉 ChromaDB Cloud upload completed successfully!');
        
    } catch (error) {
        console.error('❌ ChromaDB Cloud upload failed:', error);
        res.status(500).end(`❌ Cloud upload failed: ${error.message}`);
    }
});

/**
 * POST /api/admin/upload-file-to-cloud
 * Upload specific file to ChromaDB Cloud
 */
router.post('/upload-file-to-cloud', adminAuth, async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: '请提供文件路径'
            });
        }
        
        console.log(`🌐 上传单个文件到ChromaDB Cloud: ${filePath}`);
        
        const uploader = new ChromaDBCloudUploader();
        await uploader.initialize();
        const result = await uploader.uploadFile(filePath);
        
        if (result.success) {
            console.log('✅ 单文件云端上传成功', result);
            res.json({
                success: true,
                message: '文件上传到云端成功',
                data: result
            });
        } else {
            console.log('❌ 单文件云端上传失败', result);
            res.status(500).json({
                success: false,
                message: '文件上传到云端失败',
                error: result.error || result.reason
            });
        }
        
    } catch (error) {
        console.error('❌ 单文件云端上传异常:', error);
        
        res.status(500).json({
            success: false,
            message: '文件上传到云端失败',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/cloud-collections
 * List all collections in ChromaDB Cloud
 */
router.get('/cloud-collections', adminAuth, async (req, res) => {
    try {
        console.log('📊 获取ChromaDB Cloud集合列表');
        
        const uploader = new ChromaDBCloudUploader();
        await uploader.initialize();
        const collections = await uploader.listCloudCollections();
        
        res.json({
            success: true,
            message: '获取云端集合列表成功',
            data: collections
        });
        
    } catch (error) {
        console.error('❌ 获取云端集合列表失败:', error);
        
        res.status(500).json({
            success: false,
            message: '获取云端集合列表失败',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/cleanup-collections
 * Clean up unnecessary collections in ChromaDB Cloud
 */
router.post('/cleanup-collections', adminAuth, async (req, res) => {
    try {
        console.log('🧹 开始清理ChromaDB Cloud集合');
        
        const uploader = new ChromaDBCloudUploader();
        await uploader.initialize();
        const result = await uploader.cleanupUnnecessaryCollections();
        
        console.log('✅ 集合清理完成', result);
        
        res.json({
            success: true,
            message: '集合清理完成',
            data: result
        });
        
    } catch (error) {
        console.error('❌ 集合清理失败:', error);
        
        res.status(500).json({
            success: false,
            message: '集合清理失败',
            error: error.message
        });
    }
});

/**
 * DELETE /api/admin/delete-collection/:name
 * Delete a specific collection
 */
router.delete('/delete-collection/:name', adminAuth, async (req, res) => {
    try {
        const { name } = req.params;
        
        if (name === 'teachai_main') {
            return res.status(400).json({
                success: false,
                message: '不能删除主集合 teachai_main'
            });
        }
        
        console.log(`🗑️ 删除指定集合: ${name}`);
        
        const uploader = new ChromaDBCloudUploader();
        await uploader.initialize();
        const success = await uploader.deleteCollection(name);
        
        if (success) {
            res.json({
                success: true,
                message: `集合 ${name} 删除成功`
            });
        } else {
            res.status(500).json({
                success: false,
                message: `集合 ${name} 删除失败`
            });
        }
        
    } catch (error) {
        console.error('❌ 删除集合失败:', error);
        
        res.status(500).json({
            success: false,
            message: '删除集合失败',
            error: error.message
        });
    }
});

module.exports = router;