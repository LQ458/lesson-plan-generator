import 'env_loader.dart';

class EnvironmentConfig {
  // 阿里云千问API配置
  static String get aliCloudApiKey => EnvLoader.getEnv('ALI_CLOUD_API_KEY');
  
  // 百度文心一言API配置
  static String get baiduApiKey => EnvLoader.getEnv('BAIDU_API_KEY');
  static String get baiduSecretKey => EnvLoader.getEnv('BAIDU_SECRET_KEY');
  
  // 智谱ChatGLM API配置
  static String get chatGlmApiKey => EnvLoader.getEnv('CHATGLM_API_KEY');
  
  // Google ML Kit API配置（如果需要）
  static String get googleApiKey => EnvLoader.getEnv('GOOGLE_API_KEY');
  
  // 其他配置
  static String get appEnvironment => EnvLoader.getEnv('APP_ENVIRONMENT', defaultValue: 'development');
  
  // 是否为生产环境
  static bool get isProduction => appEnvironment == 'production';
  
  // 是否为开发环境
  static bool get isDevelopment => appEnvironment == 'development';
  
  // 验证必要的API keys是否已配置
  static bool get areApiKeysConfigured {
    return aliCloudApiKey.isNotEmpty || 
           baiduApiKey.isNotEmpty || 
           chatGlmApiKey.isNotEmpty;
  }
  
  // 获取配置摘要（用于调试，不暴露实际密钥）
  static Map<String, String> getConfigSummary() {
    return {
      '阿里云API': aliCloudApiKey.isNotEmpty ? '已配置' : '未配置',
      '百度API': baiduApiKey.isNotEmpty ? '已配置' : '未配置',
      '智谱API': chatGlmApiKey.isNotEmpty ? '已配置' : '未配置',
      'Google API': googleApiKey.isNotEmpty ? '已配置' : '未配置',
      '运行环境': appEnvironment,
    };
  }
  
  // API服务的基础URL配置
  static const Map<String, String> apiBaseUrls = {
    'alicloud': 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    'baidu_auth': 'https://aip.baidubce.com/oauth/2.0/token',
    'baidu_chat': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
    'chatglm': 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  };
  
  // 模型配置
  static const Map<String, String> defaultModels = {
    'alicloud': 'qwen-turbo',
    'baidu': 'ERNIE-4.0-8K',
    'chatglm': 'glm-4',
  };
  
  // 请求超时配置（秒）
  static const int requestTimeout = 30;
  
  // 重试配置
  static const int maxRetries = 3;
  static const int retryDelay = 1; // 秒
} 