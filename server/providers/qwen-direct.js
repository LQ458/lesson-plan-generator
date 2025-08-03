/**
 * Direct Qwen API Provider - Native Chinese AI Provider
 * Implements true streaming without OpenAI compatibility layer
 * Supports: Qwen-Plus, Qwen-Turbo, Qwen-Max
 */

const axios = require('axios');
const logger = require('../utils/logger');

class QwenDirectProvider {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY is required for Qwen Direct Provider');
    }

    this.apiKey = apiKey;
    this.baseURL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    
    // Qwen model configurations
    this.models = {
      'qwen-turbo': {
        name: 'qwen-turbo',
        maxTokens: 8000,
        contextWindow: 6000,
        costPerToken: 0.0008, // RMB per 1K tokens
        speed: 'fast',
        quality: 'good'
      },
      'qwen-plus': {
        name: 'qwen-plus', 
        maxTokens: 32000,
        contextWindow: 30000,
        costPerToken: 0.004,
        speed: 'medium',
        quality: 'high'
      },
      'qwen-max': {
        name: 'qwen-max',
        maxTokens: 6000,
        contextWindow: 8000,
        costPerToken: 0.02,
        speed: 'slow',
        quality: 'excellent'
      }
    };

    this.defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-SSE': 'enable', // Enable Server-Sent Events
    };
  }

  /**
   * Create streaming completion request
   * @param {Object} params - Request parameters
   * @returns {Promise<ReadableStream>} Direct stream from Qwen
   */
  async createStreamCompletion(params) {
    const {
      model = 'qwen-turbo',
      messages,
      maxTokens = 2000,
      temperature = 0.7,
      topP = 0.8,
      stream = true,
    } = params;

    // Validate model
    if (!this.models[model]) {
      throw new Error(`Unsupported model: ${model}. Available: ${Object.keys(this.models).join(', ')}`);
    }

    // Format messages for Qwen API
    const prompt = this.formatMessages(messages);
    
    const requestData = {
      model: this.models[model].name,
      input: {
        prompt: prompt
      },
      parameters: {
        max_tokens: Math.min(maxTokens, this.models[model].maxTokens),
        temperature: Math.max(0.1, Math.min(2.0, temperature)),
        top_p: Math.max(0.1, Math.min(1.0, topP)),
        incremental_output: true, // Enable incremental streaming
        result_format: 'text'
      }
    };

    logger.info('Creating Qwen direct stream', {
      model: model,
      promptLength: prompt.length,
      maxTokens: requestData.parameters.max_tokens,
      temperature: requestData.parameters.temperature,
      provider: 'qwen-direct'
    });

    try {
      if (stream) {
        return this.createSSEStream(requestData);
      } else {
        return this.createSyncCompletion(requestData);
      }
    } catch (error) {
      logger.error('Qwen API request failed', {
        error: error.message,
        model: model,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });
      throw new Error(`Qwen API Error: ${error.message}`);
    }
  }

  /**
   * Create Server-Sent Events stream for real-time streaming
   */
  async createSSEStream(requestData) {
    const response = await axios({
      method: 'POST',
      url: this.baseURL,
      headers: {
        ...this.defaultHeaders,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      data: requestData,
      responseType: 'stream',
      timeout: 60000, // 60 second timeout
    });

    return this.processSSEStream(response.data);
  }

  /**
   * Process Server-Sent Events stream from Qwen
   */
  async* processSSEStream(stream) {
    let buffer = '';
    let totalTokens = 0;
    let completionTokens = 0;

    const startTime = Date.now();

    for await (const chunk of stream) {
      buffer += chunk.toString('utf-8');
      
      // Process complete SSE events
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        try {
          const lines = event.split('\n');
          let data = null;

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6);
              if (jsonStr === '[DONE]') {
                // Stream completed
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                yield {
                  type: 'completion',
                  usage: {
                    prompt_tokens: totalTokens - completionTokens,
                    completion_tokens: completionTokens,
                    total_tokens: totalTokens,
                    duration_ms: duration,
                    tokens_per_second: totalTokens / (duration / 1000)
                  }
                };
                return;
              }

              try {
                data = JSON.parse(jsonStr);
              } catch (parseError) {
                logger.warn('Failed to parse SSE data', { data: jsonStr });
                continue;
              }
            }
          }

          if (data) {
            // Process Qwen response format
            if (data.output && data.output.text) {
              completionTokens++;
              totalTokens++;
              
              yield {
                type: 'content',
                content: data.output.text,
                delta: data.output.text, // For compatibility
                finish_reason: data.output.finish_reason || null,
                model: data.model || requestData.model
              };
            }

            // Handle errors
            if (data.code && data.code !== '200') {
              throw new Error(`Qwen API Error: ${data.message} (Code: ${data.code})`);
            }
          }
        } catch (error) {
          logger.error('Error processing SSE event', {
            error: error.message,
            event: event.substring(0, 200) + '...'
          });
          // Continue processing other events
        }
      }
    }
  }

  /**
   * Create synchronous completion (non-streaming)
   */
  async createSyncCompletion(requestData) {
    // Remove streaming parameters for sync request
    delete requestData.parameters.incremental_output;

    const response = await axios({
      method: 'POST',
      url: this.baseURL,
      headers: this.defaultHeaders,
      data: requestData,
      timeout: 30000
    });

    if (response.data.code !== '200') {
      throw new Error(`Qwen API Error: ${response.data.message} (Code: ${response.data.code})`);
    }

    return {
      choices: [{
        message: {
          content: response.data.output.text,
          role: 'assistant'
        },
        finish_reason: response.data.output.finish_reason
      }],
      usage: response.data.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      model: response.data.model || requestData.model
    };
  }

  /**
   * Format OpenAI-style messages for Qwen prompt format
   */
  formatMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and must not be empty');
    }

    let prompt = '';
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `<|im_start|>system\n${message.content}<|im_end|>\n`;
          break;
        case 'user':
          prompt += `<|im_start|>user\n${message.content}<|im_end|>\n`;
          break;
        case 'assistant':
          prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n`;
          break;
        default:
          logger.warn('Unknown message role', { role: message.role });
          prompt += `<|im_start|>user\n${message.content}<|im_end|>\n`;
      }
    }

    // Add assistant start token for completion
    prompt += '<|im_start|>assistant\n';

    return prompt;
  }

  /**
   * Get model information
   */
  getModelInfo(modelName) {
    return this.models[modelName] || null;
  }

  /**
   * List available models
   */
  listModels() {
    return Object.keys(this.models);
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      provider: 'qwen-direct',
      baseURL: this.baseURL,
      models: this.listModels(),
      features: ['streaming', 'sync', 'chinese_optimized'],
      apiConfigured: !!this.apiKey
    };
  }

  /**
   * Test API connectivity
   */
  async testConnection() {
    try {
      const testResult = await this.createSyncCompletion({
        model: 'qwen-turbo',
        input: {
          prompt: '<|im_start|>user\n你好<|im_end|>\n<|im_start|>assistant\n'
        },
        parameters: {
          max_tokens: 10,
          temperature: 0.1
        }
      });

      return {
        success: true,
        latency: Date.now(),
        model: 'qwen-turbo',
        response: testResult.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = QwenDirectProvider;