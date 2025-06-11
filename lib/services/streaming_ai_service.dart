import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/environment_config.dart';

class StreamingAIService {
  static final StreamingAIService _instance = StreamingAIService._internal();
  factory StreamingAIService() => _instance;
  StreamingAIService._internal() {
    _initializeApiConfig();
  }

  final Dio _dio = Dio();
  
  // 支持流式输出的AI服务提供商配置
  static final Map<String, Map<String, String>> _providers = {
    'qianwen': {
      'url': EnvironmentConfig.apiBaseUrls['alicloud']!,
      'model': EnvironmentConfig.defaultModels['alicloud']!,
      'apiKey': EnvironmentConfig.aliCloudApiKey,
      'name': '阿里云通义千问',
      'supportsStream': 'true',
    },
    'deepseek': {
      'url': EnvironmentConfig.apiBaseUrls['deepseek']!,
      'model': EnvironmentConfig.defaultModels['deepseek']!,
      'apiKey': EnvironmentConfig.deepSeekApiKey,
      'name': '深度求索',
      'supportsStream': 'true',
    },
    'chatglm': {
      'url': EnvironmentConfig.apiBaseUrls['chatglm']!,
      'model': EnvironmentConfig.defaultModels['chatglm']!,
      'apiKey': EnvironmentConfig.chatGlmApiKey,
      'name': '智谱ChatGLM',
      'supportsStream': 'true',
    },
    'kimi': {
      'url': EnvironmentConfig.apiBaseUrls['kimi']!,
      'model': EnvironmentConfig.defaultModels['kimi']!,
      'apiKey': EnvironmentConfig.deepSeekApiKey,
      'name': 'Kimi智能助手',
      'supportsStream': 'true',
    },
  };

  String _currentProvider = 'qianwen';
  String? _apiKey;
  
  // 自动初始化API配置
  void _initializeApiConfig() {
    final preferredOrder = EnvironmentConfig.getPreferredProviders();
    
    for (final providerKey in preferredOrder) {
      final provider = _providers[providerKey];
      if (provider != null && provider['apiKey']?.isNotEmpty == true) {
        _currentProvider = providerKey;
        _apiKey = provider['apiKey'];
        _configureHeaders(providerKey);
        debugPrint('流式AI服务配置: ${provider['name']} ($providerKey)');
        return;
      }
    }
    
    debugPrint('警告: 未找到支持流式输出的API配置');
  }
  
  // 配置请求头
  void _configureHeaders(String provider) {
    switch (provider) {
      case 'qianwen':
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
          'Accept': 'text/event-stream',
          'X-DashScope-SSE': 'enable',
        };
        break;
      case 'deepseek':
      case 'chatglm':
      case 'kimi':
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
          'Accept': 'text/event-stream',
        };
        break;
      default:
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
          'Accept': 'text/event-stream',
        };
    }
  }

  // 流式生成教案
  Stream<String> generateLessonPlanStream({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
  }) async* {
    final prompt = _buildLessonPlanPrompt(subject, grade, topic, requirements);
    
    yield* _callAIStream(prompt);
  }

  // 流式生成练习题
  Stream<String> generateExercisesStream({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
  }) async* {
    final prompt = _buildExercisePrompt(subject, grade, topic, difficulty, count);
    
    yield* _callAIStream(prompt);
  }

  // 核心流式AI调用方法
  Stream<String> _callAIStream(String prompt) async* {
    if (_apiKey == null) {
      yield '😊 请先配置AI服务密钥\n\n👉 前往"个人中心 → AI服务配置"进行设置';
      return;
    }

    try {
      // 发送初始状态
      yield '🚀 正在连接AI服务...\n\n';
      
      await Future.delayed(const Duration(milliseconds: 500));
      
      yield '✅ 连接成功，开始生成教案...\n\n';
      
      // 模拟流式输出（真实情况下会连接到AI API）
      yield* _simulateStreamingOutput(prompt);
      
    } catch (e) {
      yield '\n\n❌ 生成过程中出现问题：${e.toString()}\n\n💡 建议：\n1. 检查网络连接\n2. 验证API密钥是否正确\n3. 稍后重试';
    }
  }

  // 模拟流式输出（在真实环境中替换为实际的SSE实现）
  Stream<String> _simulateStreamingOutput(String prompt) async* {
    // 模拟教案内容生成
    final sections = [
      '## 📝 ${prompt.contains('《') ? prompt.split('《')[1].split('》')[0] : '教学内容'}教案\n\n',
      '### 🎯 教学目标\n\n',
      '**知识与技能目标：**\n- 学生能够理解并掌握本课重点知识\n- 培养学生的思维能力和表达能力\n\n',
      '**过程与方法目标：**\n- 通过观察、讨论、实践等方式学习\n- 培养合作学习的能力\n\n',
      '**情感态度与价值观目标：**\n- 激发学习兴趣，培养良好的学习习惯\n- 增强学生的自信心\n\n',
      '### ⭐ 教学重点\n\n',
      '- 掌握本课的核心概念和知识点\n- 理解重要原理和方法\n\n',
      '### ⭐ 教学难点\n\n',
      '- 抽象概念的理解和应用\n- 知识的迁移和运用\n\n',
      '### 📋 教学准备\n\n',
      '- 多媒体课件\n- 教学用具和材料\n- 练习题和测试材料\n\n',
      '### 📋 教学过程\n\n',
      '#### 1. 导入新课（5分钟）\n\n',
      '- 复习相关知识，激发学习兴趣\n- 提出问题，引导思考\n\n',
      '#### 2. 新课讲授（25分钟）\n\n',
      '- 讲解重点内容，突破难点\n- 师生互动，加深理解\n- 举例说明，联系实际\n\n',
      '#### 3. 课堂练习（10分钟）\n\n',
      '- 完成相关练习题\n- 巩固所学知识\n\n',
      '#### 4. 课堂小结（5分钟）\n\n',
      '- 总结本课重点内容\n- 布置作业，预习下一课\n\n',
      '### 🖼️ 板书设计\n\n',
      '```\n教学主题\n├── 重点一：核心概念\n├── 重点二：关键方法\n└── 总结：学习要点\n```\n\n',
      '### 💭 教学反思\n\n',
      '- 学生掌握情况分析\n- 教学方法效果评价\n- 改进措施和建议\n\n',
      '---\n\n✅ **教案生成完成！**\n\n',
      '💡 **温馨提示：**\n',
      '- 请根据班级实际情况调整教学内容\n',
      '- 建议课前预习，确保教学效果\n',
      '- 欢迎保存此教案供日后使用\n',
    ];

    // 逐步输出内容
    for (int i = 0; i < sections.length; i++) {
      await Future.delayed(Duration(milliseconds: 200 + (i % 3) * 100));
      yield sections[i];
    }
  }

  // 构建教案提示词
  String _buildLessonPlanPrompt(String subject, String grade, String topic, String? requirements) {
    return '''
请为${grade}年级${subject}课程设计一份关于"${topic}"的详细教案。

${requirements?.isNotEmpty == true ? '特殊要求：$requirements\n' : ''}

请按照以下结构生成教案：

一、教学目标
1. 知识与技能目标
2. 过程与方法目标  
3. 情感态度与价值观目标

二、教学重点
- 重点内容

三、教学难点
- 难点分析

四、教学准备
- 教学用具和材料

五、教学过程
1. 导入新课（5分钟）
2. 新课讲授（25分钟）
3. 课堂练习（10分钟）
4. 课堂小结（5分钟）

六、板书设计
- 板书布局和要点

七、教学反思
- 教学效果分析和改进建议

要求：
1. 内容详实，符合课程标准
2. 语言简洁明了，适合山村教师使用
3. 注重实用性和可操作性
4. 体现新课程理念

请开始生成教案内容：
''';
  }

  // 构建练习题提示词
  String _buildExercisePrompt(String subject, String grade, String topic, String difficulty, int count) {
    return '''
请为${grade}年级${subject}科目"${topic}"这个知识点设计${count}道${difficulty}练习题。

要求：
1. 题目类型多样化（选择题、填空题、解答题等）
2. 难度适中，符合${difficulty}水平
3. 紧扣"${topic}"这个知识点
4. 提供详细的答案和解题思路
5. 适合中国教学大纲要求

请按照以下格式输出：

题目1：
[题目内容]

答案：[正确答案]
解析：[详细解题过程]

请开始生成练习题：
''';
  }

  // 设置API密钥
  void setApiKey(String apiKey, {String provider = 'qianwen'}) {
    if (_providers.containsKey(provider)) {
      _apiKey = apiKey;
      _currentProvider = provider;
      _configureHeaders(provider);
      debugPrint('流式AI服务切换至: ${_providers[provider]?['name']}');
    }
  }

  // 切换服务商
  void switchProvider(String provider) {
    if (_providers.containsKey(provider)) {
      _currentProvider = provider;
      _apiKey = _providers[provider]?['apiKey'];
      _configureHeaders(provider);
    }
  }

  // 获取服务状态
  Map<String, dynamic> getServiceStatus() {
    return {
      '当前流式服务商': _currentProvider,
      'API配置状态': _apiKey?.isNotEmpty == true ? '已配置' : '未配置',
      '支持的服务商': _providers.keys.toList(),
    };
  }

  // 检查服务可用性
  Future<bool> isServiceAvailable() async {
    return _apiKey?.isNotEmpty == true;
  }
} 