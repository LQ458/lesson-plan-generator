/**
 * Performance Optimization Module for AI Service
 * Implements caching, request batching, and response time optimization
 */

const NodeCache = require("node-cache");
const logger = require("./utils/logger");

class PerformanceOptimizer {
  constructor() {
    // Response cache with TTL (Time To Live)
    this.responseCache = new NodeCache({
      stdTTL: 300, // 5 minutes cache
      checkperiod: 60, // Check for expired keys every minute
      maxKeys: 1000, // Limit cache size
    });

    // Request queue for batching
    this.requestQueue = [];
    this.batchTimeout = null;
    this.batchSize = 5;
    this.batchDelay = 100; // ms

    // Performance metrics
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      batchedRequests: 0,
    };

    // Enable cache event logging
    this.responseCache.on("set", (key, value) => {
      logger.debug("Cache set", { key: key.substring(0, 50) });
    });

    this.responseCache.on("expired", (key, value) => {
      logger.debug("Cache expired", { key: key.substring(0, 50) });
    });
  }

  /**
   * Generate cache key for requests
   */
  generateCacheKey(subject, grade, topic, requirements = "") {
    const normalizedRequirements = requirements?.toLowerCase().trim() || "";
    return `${subject}:${grade}:${topic}:${normalizedRequirements}`;
  }

  /**
   * Check if response is cacheable
   */
  isCacheable(subject, grade, topic) {
    // Don't cache if any parameter is missing
    if (!subject || !grade || !topic) return false;
    
    // Don't cache for very specific or unique requirements
    const uniqueKeywords = ["今天", "现在", "实时", "最新", "当前"];
    const topicLower = topic.toLowerCase();
    
    return !uniqueKeywords.some(keyword => topicLower.includes(keyword));
  }

  /**
   * Get cached response
   */
  getCachedResponse(subject, grade, topic, requirements) {
    if (!this.isCacheable(subject, grade, topic)) return null;

    const key = this.generateCacheKey(subject, grade, topic, requirements);
    const cached = this.responseCache.get(key);
    
    if (cached) {
      this.metrics.cacheHits++;
      logger.info("Cache hit", {
        key: key.substring(0, 50),
        cacheStats: this.getCacheStats(),
      });
      return cached;
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Cache response
   */
  cacheResponse(subject, grade, topic, requirements, response) {
    if (!this.isCacheable(subject, grade, topic) || !response) return;

    const key = this.generateCacheKey(subject, grade, topic, requirements);
    
    // Only cache successful responses with reasonable length
    if (response.length > 100 && response.length < 50000) {
      this.responseCache.set(key, response);
      logger.debug("Response cached", {
        key: key.substring(0, 50),
        responseLength: response.length,
      });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(2)
      : 0;

    return {
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate: `${hitRate}%`,
      keys: this.responseCache.keys().length,
      maxKeys: 1000,
    };
  }

  /**
   * Optimize model parameters based on request type
   */
  getOptimizedParams(requestType, originalParams) {
    const optimizations = {
      lesson_plan: {
        temperature: 0.7,
        maxTokens: 2000,
        streamOptimized: true,
      },
      exercises: {
        temperature: 0.6, // More deterministic for exercises
        maxTokens: 1500,
        streamOptimized: true,
      },
      quick_answer: {
        temperature: 0.3, // Very deterministic for quick answers
        maxTokens: 500,
        streamOptimized: false,
      },
      analysis: {
        temperature: 0.1, // Most deterministic for analysis
        maxTokens: 200,
        streamOptimized: false,
      }
    };

    const optimization = optimizations[requestType] || {};
    return {
      ...originalParams,
      ...optimization,
    };
  }

  /**
   * Record performance metrics
   */
  recordMetrics(startTime, cacheHit = false) {
    const responseTime = Date.now() - startTime;
    this.metrics.totalRequests++;
    
    // Update average response time
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;

    logger.info("Performance metrics updated", {
      responseTime,
      avgResponseTime: Math.round(this.metrics.avgResponseTime),
      totalRequests: this.metrics.totalRequests,
      cacheHit,
    });

    return responseTime;
  }

  /**
   * Implement request batching for non-streaming requests
   */
  async batchRequest(requestFn, ...args) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        args,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Clear existing timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      // Set new timeout or process immediately if batch is full
      if (this.requestQueue.length >= this.batchSize) {
        this.processBatch();
      } else {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  /**
   * Process queued requests in batch
   */
  async processBatch() {
    if (this.requestQueue.length === 0) return;

    const batch = this.requestQueue.splice(0, this.batchSize);
    this.metrics.batchedRequests += batch.length;

    logger.info(`Processing batch of ${batch.length} requests`, {
      batchedTotal: this.metrics.batchedRequests,
    });

    // Process requests concurrently
    const promises = batch.map(async ({ requestFn, args, resolve, reject }) => {
      try {
        const result = await requestFn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Preload common responses
   */
  async preloadCommonResponses(aiService) {
    const commonRequests = [
      { subject: "数学", grade: "三年级", topic: "加法" },
      { subject: "语文", grade: "三年级", topic: "阅读理解" },
      { subject: "英语", grade: "四年级", topic: "单词" },
      { subject: "数学", grade: "五年级", topic: "分数" },
    ];

    logger.info(`Preloading ${commonRequests.length} common responses`);

    for (const request of commonRequests) {
      try {
        const key = this.generateCacheKey(
          request.subject, 
          request.grade, 
          request.topic
        );
        
        // Only preload if not already cached
        if (!this.responseCache.get(key)) {
          // Note: This would need to be implemented with actual AI service call
          // For now, we just log the intention
          logger.debug("Would preload", request);
        }
      } catch (error) {
        logger.error("Preload failed", { request, error: error.message });
      }
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const cacheStats = this.getCacheStats();
    
    return {
      cache: cacheStats,
      requests: {
        total: this.metrics.totalRequests,
        batched: this.metrics.batchedRequests,
        avgResponseTime: Math.round(this.metrics.avgResponseTime),
      },
      optimization: {
        cacheEnabled: true,
        batchingEnabled: true,
        batchSize: this.batchSize,
        batchDelay: this.batchDelay,
      },
      recommendations: this.getOptimizationRecommendations(),
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests * 100)
      : 0;

    if (hitRate < 20) {
      recommendations.push("Low cache hit rate - consider increasing cache TTL");
    }

    if (this.metrics.avgResponseTime > 5000) {
      recommendations.push("High average response time - consider reducing token limits");
    }

    if (this.metrics.batchedRequests / this.metrics.totalRequests < 0.3) {
      recommendations.push("Low batching efficiency - consider increasing batch delay");
    }

    if (recommendations.length === 0) {
      recommendations.push("Performance is optimal");
    }

    return recommendations;
  }

  /**
   * Clear cache
   */
  clearCache() {
    const keyCount = this.responseCache.keys().length;
    this.responseCache.flushAll();
    logger.info(`Cache cleared: ${keyCount} keys removed`);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      totalRequests: 0,
      batchedRequests: 0,
    };
    logger.info("Performance metrics reset");
  }
}

module.exports = PerformanceOptimizer;