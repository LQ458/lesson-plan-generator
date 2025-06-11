import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';

class EnvLoader {
  static bool _isInitialized = false;
  
  // 初始化环境变量
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      // Web平台不支持文件系统访问，直接使用编译时变量
      if (kIsWeb) {
        debugPrint('Web平台：跳过.env文件加载，使用编译时环境变量');
        _isInitialized = true;
        return;
      }
      
      // 尝试加载 .env 文件
      await dotenv.load(fileName: ".env");
      debugPrint('环境变量文件加载成功');
      _isInitialized = true;
    } catch (e) {
      debugPrint('环境变量文件加载失败: $e');
      debugPrint('将使用编译时环境变量');
      _isInitialized = true;  // 仍然标记为已初始化，使用编译时变量
    }
  }
  
  // 获取环境变量值（优先从.env文件，其次从编译时环境变量）
  static String getEnv(String key, {String defaultValue = ''}) {
    if (!_isInitialized) {
      debugPrint('警告: 环境变量未初始化，请先调用 EnvLoader.initialize()');
    }
    
    // 首先尝试从 .env 文件获取
    String? value;
    try {
      value = dotenv.env[key];
    } catch (e) {
      // 如果dotenv没有正确初始化，忽略错误
      value = null;
    }
    
    // 如果 .env 文件中没有，则从编译时环境变量获取
    if (value == null || value.isEmpty) {
      value = _getCompileTimeEnv(key);
    }
    
    // 如果都没有，返回默认值
    return value?.isNotEmpty == true ? value! : defaultValue;
  }
  
  // 获取编译时环境变量的辅助方法
  static String _getCompileTimeEnv(String key) {
    // 从编译时环境变量获取，如果没有则返回空字符串
    // 这样用户就必须配置真实的API密钥才能使用
    switch (key) {
      case 'ALI_CLOUD_API_KEY':
        return const String.fromEnvironment('ALI_CLOUD_API_KEY', defaultValue: '');
      case 'BAIDU_API_KEY':
        return const String.fromEnvironment('BAIDU_API_KEY', defaultValue: '');
      case 'BAIDU_SECRET_KEY':
        return const String.fromEnvironment('BAIDU_SECRET_KEY', defaultValue: '');
      case 'CHATGLM_API_KEY':
        return const String.fromEnvironment('CHATGLM_API_KEY', defaultValue: '');
      case 'TENCENT_API_KEY':
        return const String.fromEnvironment('TENCENT_API_KEY', defaultValue: '');
      case 'TENCENT_SECRET_KEY':
        return const String.fromEnvironment('TENCENT_SECRET_KEY', defaultValue: '');
      case 'DOUBAO_API_KEY':
        return const String.fromEnvironment('DOUBAO_API_KEY', defaultValue: '');
      case 'XUNFEI_API_KEY':
        return const String.fromEnvironment('XUNFEI_API_KEY', defaultValue: '');
      case 'XUNFEI_API_SECRET':
        return const String.fromEnvironment('XUNFEI_API_SECRET', defaultValue: '');
      case 'XUNFEI_APP_ID':
        return const String.fromEnvironment('XUNFEI_APP_ID', defaultValue: '');
      case 'DEEPSEEK_API_KEY':
        return const String.fromEnvironment('DEEPSEEK_API_KEY', defaultValue: '');
      case 'GOOGLE_API_KEY':
        return const String.fromEnvironment('GOOGLE_API_KEY', defaultValue: '');
      case 'APP_ENVIRONMENT':
        return const String.fromEnvironment('APP_ENVIRONMENT', defaultValue: 'development');
      default:
        return '';
    }
  }
  
  // 检查环境变量是否存在
  static bool hasEnv(String key) {
    return getEnv(key).isNotEmpty;
  }
  
  // 获取所有环境变量（用于调试）
  static Map<String, String> getAllEnv() {
    if (!_isInitialized) {
      return {'error': '环境变量未初始化'};
    }
    
    return {
      ...dotenv.env,
      'status': '已初始化',
      'source': '.env文件',
    };
  }
  
  // 获取API配置状态和指引
  static Map<String, dynamic> getApiConfigStatus() {
    final apis = {
      'deepseek': {
        'name': '深度求索DeepSeek',
        'url': 'https://platform.deepseek.com/',
        'cost': '免费额度 + 低价付费',
        'key': getEnv('DEEPSEEK_API_KEY'),
        'recommended': true,
      },
      'alicloud': {
        'name': '阿里云通义千问',
        'url': 'https://dashscope.aliyuncs.com/',
        'cost': '按量付费',
        'key': getEnv('ALI_CLOUD_API_KEY'),
        'recommended': true,
      },
      'chatglm': {
        'name': '智谱ChatGLM',
        'url': 'https://open.bigmodel.cn/',
        'cost': '免费额度 + 按量付费',
        'key': getEnv('CHATGLM_API_KEY'),
        'recommended': true,
      },
      'baidu': {
        'name': '百度文心一言',
        'url': 'https://console.bce.baidu.com/qianfan/',
        'cost': '按量付费',
        'key': getEnv('BAIDU_API_KEY'),
        'recommended': false,
      },
    };
    
    final configuredCount = apis.values.where((api) => (api['key'] as String).isNotEmpty).length;
    
    return {
      'apis': apis,
      'configuredCount': configuredCount,
      'totalCount': apis.length,
      'hasAnyConfigured': configuredCount > 0,
      'configurationGuide': [
        '1. 选择一个AI服务商（推荐DeepSeek或通义千问）',
        '2. 访问对应官网注册账号',
        '3. 获取API密钥',
        '4. 在应用设置中配置API密钥',
        '5. 享受AI教学助手的强大功能！',
      ],
    };
  }
} 