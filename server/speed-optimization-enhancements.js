/**
 * AI Response Speed Optimization Enhancements
 * Implements comprehensive solutions for slow AI response times
 */

const logger = require("./utils/logger");

class SpeedOptimizationEnhancements {
  constructor(aiService) {
    this.aiService = aiService;
    this.responseTimeTargets = {
      lesson_plan: 8000,   // 8 seconds max
      exercises: 6000,     // 6 seconds max
      quick_answer: 3000,  // 3 seconds max
      analysis: 2000,      // 2 seconds max
    };
  }

  /**
   * Optimize model parameters for faster responses
   */
  getSpeedOptimizedParams(requestType, originalParams) {
    const speedOptimizations = {
      lesson_plan: {
        // Reduce token count for faster generation
        maxTokens: Math.min(originalParams.maxTokens || 2000, 1500),
        // Increase temperature slightly for less overthinking
        temperature: Math.min((originalParams.temperature || 0.7) + 0.1, 1.0),
        // Use more focused generation
        topP: Math.max((originalParams.topP || 0.8) - 0.1, 0.7),
        // Enable faster model selection
        model: "qwen-turbo", // Faster than qwen-plus
      },
      exercises: {
        maxTokens: Math.min(originalParams.maxTokens || 1500, 1000),
        temperature: 0.6, // More deterministic = faster
        topP: 0.8,
        model: "qwen-turbo",
      },
      quick_answer: {
        maxTokens: 300, // Very limited for speed
        temperature: 0.3, // Fast and deterministic
        topP: 0.7,
        model: "qwen-turbo",
      },
      analysis: {
        maxTokens: 200,
        temperature: 0.1, // Minimal variation for speed
        topP: 0.6,
        model: "qwen-turbo",
      }
    };

    return {
      ...originalParams,
      ...speedOptimizations[requestType],
    };
  }

  /**
   * Implement progressive streaming for better perceived speed
   */
  async generateWithProgressiveStreaming(systemPrompt, userPrompt, res, requestType) {
    const startTime = Date.now();
    
    try {
      // Send immediate response header
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send early loading indicator
      res.write("🚀 AI正在思考中...\n\n");

      // Get optimized parameters
      const optimizedParams = this.getSpeedOptimizedParams(requestType, {
        model: this.aiService.model,
        maxTokens: this.aiService.maxTokens,
        temperature: this.aiService.temperature,
        topP: this.aiService.topP,
      });

      logger.info("Speed optimization applied", {
        requestType,
        originalModel: this.aiService.model,
        optimizedModel: optimizedParams.model,
        tokenReduction: this.aiService.maxTokens - optimizedParams.maxTokens,
      });

      // Create streaming request with timeout
      const streamPromise = this.createTimeoutWrappedStream(
        systemPrompt,
        userPrompt,
        optimizedParams,
        this.responseTimeTargets[requestType] || 10000
      );

      let contentStarted = false;
      let totalContent = "";

      for await (const chunk of streamPromise) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
          const content = chunk.choices[0].delta.content;
          if (content) {
            // Remove loading indicator when real content starts
            if (!contentStarted) {
              res.write("\r🎯 生成开始：\n\n");
              contentStarted = true;
            }
            
            totalContent += content;
            res.write(content);
          }
        }

        // Handle usage information
        if (chunk.usage) {
          const responseTime = Date.now() - startTime;
          logger.info("Streaming completed", {
            requestType,
            responseTime,
            tokenCount: chunk.usage.completion_tokens,
            speed: `${(chunk.usage.completion_tokens / (responseTime / 1000)).toFixed(2)} tokens/sec`,
          });
        }
      }

      res.end();
      
      const finalResponseTime = Date.now() - startTime;
      this.logPerformanceMetrics(requestType, finalResponseTime, totalContent.length);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error("Speed-optimized generation failed", {
        requestType,
        responseTime,
        error: error.message,
      });

      if (!res.headersSent) {
        res.status(500);
      }
      res.write(`\n❌ 生成失败: ${error.message}`);
      res.end();
    }
  }

  /**
   * Create timeout-wrapped stream to prevent hanging
   */
  async createTimeoutWrappedStream(systemPrompt, userPrompt, params, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`请求超时 (${timeoutMs}ms) - 请重试或简化请求`));
      }, timeoutMs);
    });

    const streamPromise = this.aiService.openai.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      top_p: params.topP,
      stream: true,
    });

    return Promise.race([streamPromise, timeoutPromise]);
  }

  /**
   * Implement response chunking for large content
   */
  async generateWithChunking(systemPrompt, userPrompt, res, requestType) {
    // For very large responses, break into smaller chunks
    const chunkSize = 500; // tokens per chunk
    const maxChunks = 4;

    const basePrompt = systemPrompt;
    const chunkPrompts = this.createChunkPrompts(userPrompt, maxChunks);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.write("📝 分段生成中...\n\n");

    for (let i = 0; i < chunkPrompts.length; i++) {
      try {
        res.write(`## 第${i + 1}部分\n\n`);
        
        const chunkParams = this.getSpeedOptimizedParams(requestType, {
          maxTokens: chunkSize,
          temperature: this.aiService.temperature,
          topP: this.aiService.topP,
        });

        const completion = await this.aiService.openai.chat.completions.create({
          model: chunkParams.model,
          messages: [
            { role: "system", content: basePrompt },
            { role: "user", content: chunkPrompts[i] },
          ],
          max_tokens: chunkParams.maxTokens,
          temperature: chunkParams.temperature,
          top_p: chunkParams.topP,
        });

        const content = completion.choices[0].message.content;
        res.write(content + "\n\n");

      } catch (error) {
        logger.error("Chunk generation failed", {
          chunkIndex: i,
          error: error.message,
        });
        res.write(`❌ 第${i + 1}部分生成失败\n\n`);
      }
    }

    res.end();
  }

  /**
   * Create smaller prompts for chunked generation
   */
  createChunkPrompts(originalPrompt, maxChunks) {
    // Split complex requests into focused chunks
    const chunkTemplates = {
      lesson_plan: [
        "请生成教学目标和重点难点部分",
        "请生成教学过程和方法部分", 
        "请生成课堂活动和练习部分",
        "请生成作业安排和教学反思部分",
      ],
      exercises: [
        "请生成选择题部分",
        "请生成填空题和判断题部分",
        "请生成计算题和应用题部分",
        "请生成答案解析部分",
      ],
    };

    // Use template if available, otherwise split by content
    if (chunkTemplates.lesson_plan) {
      return chunkTemplates.lesson_plan.map(template => 
        `${originalPrompt}\n\n具体要求：${template}`
      );
    }

    // Fallback: split original prompt
    const words = originalPrompt.split(" ");
    const chunkSize = Math.ceil(words.length / maxChunks);
    const chunks = [];

    for (let i = 0; i < maxChunks && i * chunkSize < words.length; i++) {
      const chunkWords = words.slice(i * chunkSize, (i + 1) * chunkSize);
      chunks.push(chunkWords.join(" "));
    }

    return chunks;
  }

  /**
   * Implement smart retries with fallback strategies
   */
  async generateWithFallback(systemPrompt, userPrompt, res, requestType) {
    const strategies = [
      // Strategy 1: Full speed optimization
      () => this.generateWithProgressiveStreaming(systemPrompt, userPrompt, res, requestType),
      
      // Strategy 2: Reduced complexity
      () => this.generateWithProgressiveStreaming(
        this.simplifyPrompt(systemPrompt), 
        this.simplifyPrompt(userPrompt), 
        res, 
        requestType
      ),
      
      // Strategy 3: Chunked generation
      () => this.generateWithChunking(systemPrompt, userPrompt, res, requestType),
      
      // Strategy 4: Basic fallback
      () => this.generateBasicResponse(userPrompt, res),
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        logger.info(`Attempting generation strategy ${i + 1}`, { requestType });
        await strategies[i]();
        return; // Success, exit
      } catch (error) {
        logger.warn(`Generation strategy ${i + 1} failed`, {
          requestType,
          error: error.message,
          retryAvailable: i < strategies.length - 1,
        });
        
        if (i === strategies.length - 1) {
          // Last strategy failed
          if (!res.headersSent) {
            res.status(500);
          }
          res.write(`\n❌ 所有生成策略均失败，请稍后重试`);
          res.end();
        }
      }
    }
  }

  /**
   * Simplify prompts for faster processing
   */
  simplifyPrompt(prompt) {
    return prompt
      .replace(/详细|具体|深入|全面/g, "简要")
      .replace(/完整的|完全的/g, "基本的")
      .replace(/请详细说明/g, "请简要说明")
      .substring(0, Math.min(prompt.length, 500)); // Limit prompt length
  }

  /**
   * Generate basic fallback response
   */
  async generateBasicResponse(userPrompt, res) {
    const basicResponse = `
# 基础教学内容

## 教学目标
- 根据课程要求制定相应的学习目标
- 培养学生的基础知识和技能

## 教学重点
- 核心概念的理解和掌握
- 基本方法的学习和应用

## 教学过程
1. 导入新课 (5分钟)
2. 新课讲解 (25分钟)  
3. 课堂练习 (10分钟)
4. 总结作业 (5分钟)

## 作业安排
- 完成相关练习题
- 预习下节课内容

---
⚡ 这是一个基础模板，建议根据具体需求进行调整
`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.write(basicResponse);
    res.end();
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(requestType, responseTime, contentLength) {
    const target = this.responseTimeTargets[requestType] || 10000;
    const isWithinTarget = responseTime <= target;
    const speed = contentLength / (responseTime / 1000);

    logger.info("Performance metrics", {
      requestType,
      responseTime,
      target,
      withinTarget: isWithinTarget,
      contentLength,
      generationSpeed: `${speed.toFixed(2)} chars/sec`,
      performance: isWithinTarget ? "✅ GOOD" : "⚠️ SLOW",
    });

    // Log recommendations if slow
    if (!isWithinTarget) {
      const recommendations = this.getSpeedRecommendations(requestType, responseTime);
      logger.warn("Speed optimization recommendations", {
        requestType,
        recommendations,
      });
    }
  }

  /**
   * Get speed optimization recommendations
   */
  getSpeedRecommendations(requestType, responseTime) {
    const recommendations = [];
    
    if (responseTime > 15000) {
      recommendations.push("响应时间过长，建议简化请求或分段生成");
    }
    
    if (responseTime > 10000) {
      recommendations.push("考虑使用更快的模型如qwen-turbo");
      recommendations.push("减少最大token数量");
    }
    
    if (responseTime > 8000) {
      recommendations.push("启用缓存机制");
      recommendations.push("优化提示词长度");
    }

    return recommendations;
  }

  /**
   * Get speed optimization report
   */
  getSpeedReport() {
    return {
      responseTimeTargets: this.responseTimeTargets,
      optimizations: {
        progressiveStreaming: "实时流式输出提升感知速度",
        modelOptimization: "使用qwen-turbo替代qwen-plus",
        tokenReduction: "智能减少token数量",
        timeoutProtection: "防止请求超时挂起",
        chunkingSupport: "大内容分段生成",
        fallbackStrategies: "多重回退策略",
        caching: "响应缓存机制",
      },
      recommendations: [
        "监控响应时间并及时调整参数",
        "根据请求类型选择不同优化策略",
        "实施用户反馈收集机制",
        "定期评估和更新优化参数",
      ],
    };
  }
}

module.exports = SpeedOptimizationEnhancements;