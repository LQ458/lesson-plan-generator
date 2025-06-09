import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';

class EnvLoader {
  static bool _isInitialized = false;
  
  // 初始化环境变量
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
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
    String? value = dotenv.env[key];
    
    // 如果 .env 文件中没有，则从编译时环境变量获取
    // 使用预定义的环境变量映射表来避免常量表达式问题
    if (value == null || value.isEmpty) {
      value = _getCompileTimeEnv(key);
    }
    
    // 如果都没有，返回默认值
    return value.isNotEmpty ? value : defaultValue;
  }
  
  // 获取编译时环境变量的辅助方法
  static String _getCompileTimeEnv(String key) {
    switch (key) {
      case 'ALI_CLOUD_API_KEY':
        return const String.fromEnvironment('ALI_CLOUD_API_KEY');
      case 'BAIDU_API_KEY':
        return const String.fromEnvironment('BAIDU_API_KEY');
      case 'BAIDU_SECRET_KEY':
        return const String.fromEnvironment('BAIDU_SECRET_KEY');
      case 'CHATGLM_API_KEY':
        return const String.fromEnvironment('CHATGLM_API_KEY');
      case 'GOOGLE_API_KEY':
        return const String.fromEnvironment('GOOGLE_API_KEY');
      case 'APP_ENVIRONMENT':
        return const String.fromEnvironment('APP_ENVIRONMENT');
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
} 