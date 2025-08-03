/**
 * Chinese AI Providers Integration
 * Supports multiple Chinese AI providers: Qwen, Baidu, Zhipu, Moonshot
 */

const axios = require('axios');
const logger = require('../utils/logger');
const QwenDirectProvider = require('./qwen-direct');

class ChineseAIProviders {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    
    this.initializeProviders();
  }

  /**
   * Initialize all available Chinese AI providers
   */
  initializeProviders() {
    // Qwen (Alibaba) - Primary provider
    if (process.env.DASHSCOPE_API_KEY) {
      const qwenProvider = new QwenDirectProvider(process.env.DASHSCOPE_API_KEY);
      this.providers.set('qwen', qwenProvider);
      this.currentProvider = 'qwen';
      logger.info('Qwen provider initialized');
    }

    // Baidu ERNIE
    if (process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
      this.providers.set('baidu', new BaiduErnieProvider(
        process.env.BAIDU_API_KEY,
        process.env.BAIDU_SECRET_KEY
      ));
      logger.info('Baidu ERNIE provider initialized');
    }

    // Zhipu GLM
    if (process.env.ZHIPU_API_KEY) {
      this.providers.set('zhipu', new ZhipuGLMProvider(process.env.ZHIPU_API_KEY));
      logger.info('Zhipu GLM provider initialized');
    }

    // Moonshot (Kimi)
    if (process.env.MOONSHOT_API_KEY) {
      this.providers.set('moonshot', new MoonshotProvider(process.env.MOONSHOT_API_KEY));
      logger.info('Moonshot provider initialized');
    }

    if (this.providers.size === 0) {
      throw new Error('No Chinese AI providers configured. Please set API keys in environment variables.');
    }

    logger.info(`Initialized ${this.providers.size} Chinese AI providers`, {
      providers: Array.from(this.providers.keys()),
      currentProvider: this.currentProvider
    });
  }

  /**
   * Create streaming completion with fallback support
   */
  async createStreamCompletion(params) {
    const providerList = this.getProviderPriority(params.model);
    
    for (const providerName of providerList) {
      try {
        const provider = this.providers.get(providerName);
        if (!provider) continue;

        logger.info(`Attempting stream with ${providerName}`, {
          model: params.model,
          provider: providerName
        });

        return await provider.createStreamCompletion(params);
      } catch (error) {
        logger.warn(`Provider ${providerName} failed, trying next`, {
          provider: providerName,
          error: error.message
        });
        continue;
      }
    }

    throw new Error('All Chinese AI providers failed');
  }

  /**
   * Get provider priority based on model preference
   */
  getProviderPriority(model) {
    // Model-specific provider preferences
    const modelPreferences = {
      'qwen-turbo': ['qwen', 'zhipu', 'moonshot', 'baidu'],
      'qwen-plus': ['qwen', 'zhipu', 'moonshot', 'baidu'],
      'qwen-max': ['qwen', 'zhipu', 'moonshot', 'baidu'],
      'ernie-turbo': ['baidu', 'qwen', 'zhipu', 'moonshot'],
      'ernie-pro': ['baidu', 'qwen', 'zhipu', 'moonshot'],
      'glm-4': ['zhipu', 'qwen', 'moonshot', 'baidu'],
      'moonshot-v1': ['moonshot', 'qwen', 'zhipu', 'baidu']
    };

    return modelPreferences[model] || ['qwen', 'zhipu', 'moonshot', 'baidu'];
  }

  /**
   * Switch primary provider
   */
  switchProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not available`);
    }
    
    this.currentProvider = providerName;
    logger.info(`Switched to provider: ${providerName}`);
  }

  /**
   * Get all provider statuses
   */
  getProvidersStatus() {
    const statuses = {};
    
    for (const [name, provider] of this.providers) {
      try {
        statuses[name] = provider.getStatus();
      } catch (error) {
        statuses[name] = {
          provider: name,
          status: 'error',
          error: error.message
        };
      }
    }

    return statuses;
  }

  /**
   * Test all providers connectivity
   */
  async testAllProviders() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      try {
        if (provider.testConnection) {
          results[name] = await provider.testConnection();
        } else {
          results[name] = { success: true, note: 'Test method not available' };
        }
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }
}

/**
 * Baidu ERNIE Provider
 */
class BaiduErnieProvider {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    this.models = {
      'ernie-turbo': 'ernie-turbo-8k',
      'ernie-pro': 'ernie-4.0-8k',
      'ernie-lite': 'ernie-lite-8k'
    };
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await axios.post(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

    return this.accessToken;
  }

  async createStreamCompletion(params) {
    const token = await this.getAccessToken();
    const model = this.models[params.model] || 'ernie-turbo-8k';
    
    const messages = params.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const requestData = {
      messages: messages,
      stream: true,
      max_output_tokens: params.maxTokens || 2000,
      temperature: params.temperature || 0.7,
      top_p: params.topP || 0.8
    };

    const response = await axios({
      method: 'POST',
      url: `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model}?access_token=${token}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      data: requestData,
      responseType: 'stream'
    });

    return this.processBaiduStream(response.data);
  }

  async* processBaiduStream(stream) {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf-8');
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.result) {
              yield {
                type: 'content',
                content: parsed.result,
                delta: parsed.result
              };
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
  }

  getStatus() {
    return {
      provider: 'baidu-ernie',
      models: Object.keys(this.models),
      features: ['streaming', 'chinese_optimized'],
      apiConfigured: !!(this.apiKey && this.secretKey)
    };
  }
}

/**
 * Zhipu GLM Provider
 */
class ZhipuGLMProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    
    this.models = {
      'glm-4': 'glm-4',
      'glm-4-turbo': 'glm-4-turbo',
      'glm-4-flash': 'glm-4-flash'
    };
  }

  async createStreamCompletion(params) {
    const requestData = {
      model: this.models[params.model] || 'glm-4',
      messages: params.messages,
      stream: true,
      max_tokens: params.maxTokens || 2000,
      temperature: params.temperature || 0.7,
      top_p: params.topP || 0.8
    };

    const response = await axios({
      method: 'POST',
      url: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      data: requestData,
      responseType: 'stream'
    });

    return this.processZhipuStream(response.data);
  }

  async* processZhipuStream(stream) {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf-8');
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
              const content = parsed.choices[0].delta.content;
              if (content) {
                yield {
                  type: 'content',
                  content: content,
                  delta: content
                };
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
  }

  getStatus() {
    return {
      provider: 'zhipu-glm',
      models: Object.keys(this.models),
      features: ['streaming', 'chinese_optimized'],
      apiConfigured: !!this.apiKey
    };
  }
}

/**
 * Moonshot Provider
 */
class MoonshotProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.moonshot.cn/v1/chat/completions';
    
    this.models = {
      'moonshot-v1-8k': 'moonshot-v1-8k',
      'moonshot-v1-32k': 'moonshot-v1-32k',
      'moonshot-v1-128k': 'moonshot-v1-128k'
    };
  }

  async createStreamCompletion(params) {
    const requestData = {
      model: this.models[params.model] || 'moonshot-v1-8k',
      messages: params.messages,
      stream: true,
      max_tokens: params.maxTokens || 2000,
      temperature: params.temperature || 0.7,
      top_p: params.topP || 0.8
    };

    const response = await axios({
      method: 'POST',
      url: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      data: requestData,
      responseType: 'stream'
    });

    return this.processMoonshotStream(response.data);
  }

  async* processMoonshotStream(stream) {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf-8');
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
              const content = parsed.choices[0].delta.content;
              if (content) {
                yield {
                  type: 'content',
                  content: content,
                  delta: content
                };
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
  }

  getStatus() {
    return {
      provider: 'moonshot',
      models: Object.keys(this.models),
      features: ['streaming', 'long_context'],
      apiConfigured: !!this.apiKey
    };
  }
}

module.exports = ChineseAIProviders;