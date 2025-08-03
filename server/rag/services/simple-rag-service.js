/**
 * Simple RAG Service - No native dependencies
 * Uses JSON-based search instead of ChromaDB embeddings
 */

const fs = require('fs').promises;
const path = require('path');

class SimpleRAGService {
    constructor() {
        this.comprehensiveIndexPath = path.join(__dirname, '../data/comprehensive-index.json');
        this.simpleIndexPath = path.join(__dirname, '../data/simple-index.json');
        this.educationalIndex = null;
        this.isLoaded = false;
        this.isComprehensive = false;
    }

    async initialize() {
        try {
            // Try to load comprehensive index first
            try {
                console.log('🔍 Loading comprehensive RAG index...');
                const comprehensiveData = await fs.readFile(this.comprehensiveIndexPath, 'utf-8');
                const data = JSON.parse(comprehensiveData);
                
                this.educationalIndex = data.index || [];
                this.metadata = data.metadata || {};
                this.isLoaded = true;
                this.isComprehensive = true;
                
                console.log(`✅ Loaded ${this.educationalIndex.length} comprehensive educational chunks`);
                return true;
            } catch (comprehensiveError) {
                console.log('ℹ️ Comprehensive index not found, trying simple index...');
                
                // Fallback to simple index
                const simpleData = await fs.readFile(this.simpleIndexPath, 'utf-8');
                const data = JSON.parse(simpleData);
                
                this.educationalIndex = data.index || [];
                this.metadata = data.metadata || {};
                this.isLoaded = true;
                this.isComprehensive = false;
                
                console.log(`✅ Loaded ${this.educationalIndex.length} simple educational chunks`);
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Could not load any RAG index, using empty results:', error.message);
            this.educationalIndex = [];
            this.isLoaded = false;
            this.isComprehensive = false;
            return false;
        }
    }

    async searchRelevantContent(query, options = {}) {
        const {
            maxResults = 5,
            minScore = 0.1,
            subjects = null,
            grades = null
        } = options;

        if (!this.isLoaded || !this.educationalIndex) {
            await this.initialize();
        }

        if (!this.educationalIndex || this.educationalIndex.length === 0) {
            return [];
        }

        try {
            // Simple text-based search with scoring
            const searchTerms = this.extractSearchTerms(query);
            const results = [];

            for (const item of this.educationalIndex) {
                let score = this.calculateRelevanceScore(item, searchTerms, query);
                
                // Apply filters
                if (subjects && !subjects.includes(item.subject)) continue;
                if (grades && !grades.includes(item.grade)) continue;
                if (score < minScore) continue;

                results.push({
                    content: item.content,
                    metadata: {
                        source: item.source,
                        grade: item.grade,
                        subject: item.subject,
                        publisher: item.publisher
                    },
                    score: score,
                    id: item.id
                });
            }

            // Sort by relevance score
            results.sort((a, b) => b.score - a.score);

            console.log(`🔍 Found ${results.length} relevant educational materials for query: "${query.substring(0, 50)}"`);
            return results.slice(0, maxResults);

        } catch (error) {
            console.error('❌ RAG search error:', error.message);
            return [];
        }
    }

    extractSearchTerms(query) {
        if (!query) return [];
        
        // Extract Chinese and English terms
        const terms = [];
        
        // Common educational keywords
        const educationalKeywords = [
            '教学', '学习', '课程', '练习', '作业', '考试', '知识', '方法',
            '数学', '语文', '英语', '科学', '历史', '地理', '物理', '化学', '生物',
            '年级', '小学', '中学', '初中', '高中', '教材', '课本', '教育'
        ];

        // Add direct query terms
        terms.push(query.toLowerCase());
        
        // Add educational keywords found in query
        educationalKeywords.forEach(keyword => {
            if (query.includes(keyword)) {
                terms.push(keyword);
            }
        });

        // Extract grade levels
        const gradeMatches = query.match(/[一二三四五六七八九十\d]+年级/g);
        if (gradeMatches) {
            terms.push(...gradeMatches);
        }

        // Extract subject mentions
        const subjectMatches = query.match(/(数学|语文|英语|科学|历史|地理|物理|化学|生物)/g);
        if (subjectMatches) {
            terms.push(...subjectMatches);
        }

        return [...new Set(terms)];
    }

    calculateRelevanceScore(item, searchTerms, originalQuery) {
        let score = 0;
        const content = item.content.toLowerCase();
        const keywords = item.keywords || [];

        // Direct query match (highest weight)
        if (content.includes(originalQuery.toLowerCase())) {
            score += 1.0;
        }

        // Search terms matching
        searchTerms.forEach(term => {
            if (content.includes(term.toLowerCase())) {
                score += 0.5;
            }
            if (keywords.some(k => k.includes(term))) {
                score += 0.3;
            }
        });

        // Subject relevance bonus
        if (item.subject && item.subject !== 'other') {
            score += 0.2;
        }

        // Grade relevance bonus
        if (item.grade && item.grade !== 'general') {
            score += 0.1;
        }

        // Content quality bonus (longer content often more detailed)
        if (item.content.length > 500) {
            score += 0.1;
        }

        return Math.min(score, 2.0); // Cap at 2.0
    }

    async getStatus() {
        return {
            isLoaded: this.isLoaded,
            isComprehensive: this.isComprehensive,
            mode: this.isComprehensive ? 'comprehensive' : 'simple',
            totalChunks: this.educationalIndex ? this.educationalIndex.length : 0,
            metadata: this.metadata || {},
            indexPath: this.isComprehensive ? this.comprehensiveIndexPath : this.simpleIndexPath
        };
    }

    // Legacy compatibility methods
    async searchDocuments(query, limit = 5) {
        const results = await this.searchRelevantContent(query, { maxResults: limit });
        return results.map(r => ({
            content: r.content,
            metadata: r.metadata,
            score: r.score
        }));
    }

    async isHealthy() {
        return this.isLoaded && this.educationalIndex && this.educationalIndex.length > 0;
    }
}

module.exports = SimpleRAGService;