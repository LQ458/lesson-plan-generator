import 'env_loader.dart';

class EnvironmentConfig {
  // 阿里云千问API配置
  static String get aliCloudApiKey => EnvLoader.getEnv('ALI_CLOUD_API_KEY');
  
  // 百度文心一言API配置
  static String get baiduApiKey => EnvLoader.getEnv('BAIDU_API_KEY');
  static String get baiduSecretKey => EnvLoader.getEnv('BAIDU_SECRET_KEY');
  
  // 智谱ChatGLM API配置
  static String get chatGlmApiKey => EnvLoader.getEnv('CHATGLM_API_KEY');
  
  // 腾讯混元API配置
  static String get tencentApiKey => EnvLoader.getEnv('TENCENT_API_KEY');
  static String get tencentSecretKey => EnvLoader.getEnv('TENCENT_SECRET_KEY');
  
  // 字节跳动豆包API配置
  static String get doubaoApiKey => EnvLoader.getEnv('DOUBAO_API_KEY');
  
  // 科大讯飞星火API配置
  static String get xunfeiApiKey => EnvLoader.getEnv('XUNFEI_API_KEY');
  static String get xunfeiApiSecret => EnvLoader.getEnv('XUNFEI_API_SECRET');
  static String get xunfeiAppId => EnvLoader.getEnv('XUNFEI_APP_ID');
  
  // 深度求索DeepSeek API配置
  static String get deepSeekApiKey => EnvLoader.getEnv('DEEPSEEK_API_KEY');
  
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
           chatGlmApiKey.isNotEmpty ||
           tencentApiKey.isNotEmpty ||
           doubaoApiKey.isNotEmpty ||
           xunfeiApiKey.isNotEmpty ||
           deepSeekApiKey.isNotEmpty;
  }
  
  // 获取配置摘要（用于调试，不暴露实际密钥）
  static Map<String, String> getConfigSummary() {
    return {
      '阿里云通义千问': aliCloudApiKey.isNotEmpty ? '已配置' : '未配置',
      '百度文心一言': baiduApiKey.isNotEmpty ? '已配置' : '未配置',
      '智谱ChatGLM': chatGlmApiKey.isNotEmpty ? '已配置' : '未配置',
      '腾讯混元': tencentApiKey.isNotEmpty ? '已配置' : '未配置',
      '字节豆包': doubaoApiKey.isNotEmpty ? '已配置' : '未配置',
      '科大讯飞星火': xunfeiApiKey.isNotEmpty ? '已配置' : '未配置',
      '深度求索': deepSeekApiKey.isNotEmpty ? '已配置' : '未配置',
      'Google API': googleApiKey.isNotEmpty ? '已配置' : '未配置',
      '运行环境': appEnvironment,
    };
  }
  
  // API服务的基础URL配置 - 全部使用国内服务
  static const Map<String, String> apiBaseUrls = {
    // 阿里云通义千问
    'alicloud': 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    
    // 百度文心一言
    'baidu_auth': 'https://aip.baidubce.com/oauth/2.0/token',
    'baidu_chat': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
    
    // 智谱ChatGLM
    'chatglm': 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    
    // 腾讯混元
    'tencent': 'https://hunyuan.tencentcloudapi.com',
    
    // 字节跳动豆包
    'doubao': 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    
    // 科大讯飞星火
    'xunfei': 'wss://spark-api.xf-yun.com/v3.5/chat',
    
    // 深度求索
    'deepseek': 'https://api.deepseek.com/chat/completions',
    
    // Kimi（月之暗面）
    'kimi': 'https://api.moonshot.cn/v1/chat/completions',
  };
  
  // 模型配置 - 优选国内高性价比模型
  static const Map<String, String> defaultModels = {
    'alicloud': 'qwen-plus',         // 阿里云通义千问Plus版本
    'baidu': 'ERNIE-4.0-8K',        // 百度文心一言4.0
    'chatglm': 'glm-4-plus',        // 智谱GLM-4 Plus
    'tencent': 'hunyuan-pro',       // 腾讯混元Pro
    'doubao': 'doubao-pro-4k',      // 字节豆包Pro
    'xunfei': 'generalv3.5',       // 科大讯飞星火3.5
    'deepseek': 'deepseek-chat',    // 深度求索Chat
    'kimi': 'moonshot-v1-8k',       // Kimi 8K版本
  };
  
  // 请求超时配置（秒）
  static const int requestTimeout = 30;
  
  // 重试配置
  static const int maxRetries = 3;
  static const int retryDelay = 2; // 秒
  
  // 离线模型配置
  static const Map<String, String> offlineModels = {
    'education': 'chinese-alpaca-2-7b-education.gguf',  // 教育专用模型
    'general': 'qwen2-0.5b-instruct-q8_0.gguf',        // 通用轻量模型
    'math': 'math-shepherd-mistral-7b-prm.gguf',       // 数学专用模型
  };
  
  // 离线模型下载源
  static const Map<String, String> modelDownloadUrls = {
    'huggingface': 'https://hf-mirror.com',  // Hugging Face国内镜像
    'modelscope': 'https://www.modelscope.cn', // 阿里魔搭社区
    'wisemodel': 'https://www.wisemodel.cn',   // 始智AI
  };
  
  // 支持的教学科目
  static const List<String> supportedSubjects = [
    '语文', '数学', '英语', '物理', '化学', '生物',
    '政治', '历史', '地理', '科学', '音乐', '美术',
    '体育', '信息技术', '道德与法治', '综合实践'
  ];
  
  // 支持的年级
  static const List<String> supportedGrades = [  
    '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
    '初一', '初二', '初三',
    '高一', '高二', '高三'
  ];
  
  // 获取优先使用的AI服务商（基于可用性排序）
  static List<String> getPreferredProviders() {
    final providers = <String>[];
    
    // 按性价比和可用性排序
    if (aliCloudApiKey.isNotEmpty) providers.add('alicloud');      // 通义千问
    if (deepSeekApiKey.isNotEmpty) providers.add('deepseek');      // 深度求索
    if (chatGlmApiKey.isNotEmpty) providers.add('chatglm');       // 智谱GLM
    if (baiduApiKey.isNotEmpty) providers.add('baidu');           // 百度文心
    if (doubaoApiKey.isNotEmpty) providers.add('doubao');         // 字节豆包
    if (tencentApiKey.isNotEmpty) providers.add('tencent');       // 腾讯混元
    if (xunfeiApiKey.isNotEmpty) providers.add('xunfei');         // 科大讯飞
    
    return providers;
  }
} 