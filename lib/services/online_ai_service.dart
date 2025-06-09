import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/environment_config.dart';

class OnlineAIService {
  static final OnlineAIService _instance = OnlineAIService._internal();
  factory OnlineAIService() => _instance;
  OnlineAIService._internal() {
    _initializeApiConfig();
  }

  final Dio _dio = Dio();
  
  // 支持多个AI服务提供商
  static final Map<String, Map<String, String>> _providers = {
    'qianwen': {
      'url': EnvironmentConfig.apiBaseUrls['alicloud']!,
      'model': EnvironmentConfig.defaultModels['alicloud']!,
      'apiKey': EnvironmentConfig.aliCloudApiKey,
    },
    'wenxin': {
      'url': EnvironmentConfig.apiBaseUrls['baidu_chat']!,
      'model': EnvironmentConfig.defaultModels['baidu']!,
      'apiKey': EnvironmentConfig.baiduApiKey,
    },
    'chatglm': {
      'url': EnvironmentConfig.apiBaseUrls['chatglm']!,
      'model': EnvironmentConfig.defaultModels['chatglm']!,
      'apiKey': EnvironmentConfig.chatGlmApiKey,
    },
  };

  String _currentProvider = 'qianwen';
  String? _apiKey;
  
  // 自动初始化API配置
  void _initializeApiConfig() {
    // 按优先级检查可用的API服务
    final availableProviders = _providers.entries
        .where((entry) => entry.value['apiKey']?.isNotEmpty == true)
        .toList();
    
    if (availableProviders.isNotEmpty) {
      final firstProvider = availableProviders.first;
      _currentProvider = firstProvider.key;
      _apiKey = firstProvider.value['apiKey'];
      
      _dio.options.headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      };
      
      debugPrint('自动配置AI服务: $_currentProvider');
    } else {
      debugPrint('警告: 未找到有效的API配置，请检查环境变量设置');
    }
  }
  
  // 设置API密钥（手动覆盖）
  void setApiKey(String apiKey, {String provider = 'qianwen'}) {
    _apiKey = apiKey;
    _currentProvider = provider;
    
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $_apiKey',
    };
  }
  
  // 获取服务状态
  Map<String, dynamic> getServiceStatus() {
    return {
      '当前服务商': _currentProvider,
      'API配置状态': _apiKey?.isNotEmpty == true ? '已配置' : '未配置',
      '环境配置摘要': EnvironmentConfig.getConfigSummary(),
      '服务商配置': _providers.map((key, value) => MapEntry(
        key, 
        {
          'API状态': value['apiKey']?.isNotEmpty == true ? '已配置' : '未配置',
          '模型': value['model'],
        }
      )),
    };
  }

  // 生成教案
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
  }) async {
    final prompt = _buildLessonPlanPrompt(subject, grade, topic, requirements);
    
    try {
      return await _callAI(prompt, type: 'lesson_plan');
    } catch (e) {
      debugPrint('生成教案失败: $e');
      return _getFallbackLessonPlan(subject, grade, topic);
    }
  }

  // 生成练习题
  Future<String> generateExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    final prompt = _buildExercisePrompt(subject, grade, topic, difficulty, count);
    
    try {
      return await _callAI(prompt, type: 'exercises');
    } catch (e) {
      debugPrint('生成练习题失败: $e');
      return _getFallbackExercises(subject, grade, topic, difficulty, count);
    }
  }

  // 分析学习内容
  Future<String> analyzeContent({
    required String content,
    required String analysisType,
  }) async {
    final prompt = '''
请分析以下${analysisType}内容，提供专业的教学建议：

内容：
${content}

请从以下角度分析：
1. 知识点覆盖
2. 难度评估
3. 改进建议
4. 教学要点

要求：分析具体、实用，适合中国教师使用。
''';

    try {
      return await _callAI(prompt, type: 'analysis');
    } catch (e) {
      debugPrint('内容分析失败: $e');
      return '内容分析暂时不可用，请稍后重试。';
    }
  }

  // 构建教案提示词
  String _buildLessonPlanPrompt(String subject, String grade, String topic, String? requirements) {
    return '''
你是一名资深的${subject}教师，请为${grade}年级学生设计一份关于"${topic}"的教案。

基本要求：
1. 遵循新课标要求，适合中国教育体系
2. 教案结构完整：教学目标、重难点、教学过程、板书设计等
3. 教学方法多样，注重学生主体性
4. 内容详实具体，可直接使用
5. 字数控制在1000-1500字

${requirements != null ? '特殊要求：$requirements' : ''}

请生成详细的教案内容：
''';
  }

  // 构建练习题提示词
  String _buildExercisePrompt(String subject, String grade, String topic, String difficulty, int count) {
    return '''
请为${grade}年级${subject}科目"${topic}"设计${count}道${difficulty}难度的练习题。

要求：
1. 题型多样：选择题、填空题、解答题等
2. 难度适中，符合${difficulty}水平
3. 每题都要有详细的解析过程
4. 答案准确，解析清晰易懂
5. 题目贴近教学实际

格式要求：
题目编号、题目内容、选项（如有）、标准答案、详细解析

请生成练习题：
''';
  }

  // 调用AI API
  Future<String> _callAI(String prompt, {required String type}) async {
    if (_apiKey == null) {
      throw Exception('API密钥未设置');
    }

    try {
      final response = await _makeRequest(prompt);
      return _extractContent(response, type);
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        throw Exception('请求过于频繁，请稍后重试');
      } else if (e.response?.statusCode == 401) {
        throw Exception('API密钥无效');
      } else {
        throw Exception('网络请求失败：${e.message}');
      }
    } catch (e) {
      throw Exception('AI服务调用失败：$e');
    }
  }

  // 发起请求（支持不同提供商）
  Future<Response> _makeRequest(String prompt) async {
    final provider = _providers[_currentProvider]!;
    
    switch (_currentProvider) {
      case 'qianwen':
        return await _dio.post(
          provider['url']!,
          data: {
            'model': provider['model'],
            'input': {
              'prompt': prompt,
            },
            'parameters': {
              'max_tokens': 2000,
              'temperature': 0.7,
            },
          },
        );
        
      case 'wenxin':
        return await _dio.post(
          provider['url']!,
          data: {
            'messages': [
              {
                'role': 'user',
                'content': prompt,
              }
            ],
            'max_tokens': 2000,
            'temperature': 0.7,
          },
        );
        
      case 'chatglm':
        return await _dio.post(
          provider['url']!,
          data: {
            'model': provider['model'],
            'messages': [
              {
                'role': 'user',
                'content': prompt,
              }
            ],
            'max_tokens': 2000,
            'temperature': 0.7,
          },
        );
        
      default:
        throw Exception('不支持的AI服务提供商');
    }
  }

  // 提取响应内容
  String _extractContent(Response response, String type) {
    try {
      final data = response.data;
      
      switch (_currentProvider) {
        case 'qianwen':
          return data['output']['text'] ?? '生成失败';
          
        case 'wenxin':
          return data['result'] ?? '生成失败';
          
        case 'chatglm':
          return data['choices'][0]['message']['content'] ?? '生成失败';
          
        default:
          return '生成失败';
      }
    } catch (e) {
      debugPrint('解析响应失败: $e');
      return '内容解析失败';
    }
  }

  // 降级方案：基础教案模板
  String _getFallbackLessonPlan(String subject, String grade, String topic) {
    return '''
# ${topic}教案（${subject} - ${grade}年级）

## 教学目标
1. **知识目标**：理解${topic}的基本概念和基本原理
2. **能力目标**：掌握${topic}的基本方法和应用技巧
3. **情感目标**：培养学习兴趣，增强探索精神

## 教学重点
${topic}的核心概念和基本应用方法

## 教学难点
${topic}概念的深入理解和灵活运用

## 教学过程

### 一、导入环节（5分钟）
1. 复习相关知识，引出新课题
2. 创设学习情境，激发学习兴趣

### 二、新课教学（25分钟）
1. **概念讲解**：介绍${topic}的定义和特点
2. **方法教学**：演示${topic}的基本方法
3. **例题分析**：通过具体例子加深理解

### 三、练习巩固（10分钟）
1. 基础练习：加强概念理解
2. 变式练习：培养应用能力

### 四、总结提升（5分钟）
1. 知识梳理：归纳本课要点
2. 方法总结：总结学习方法

## 板书设计
```
${topic}
├── 概念
├── 特点
├── 方法
└── 应用
```

## 作业布置
1. 完成课后练习题
2. 预习下节课内容

*注：此为离线模板，建议根据实际情况调整*
''';
  }

  // 降级方案：基础练习题模板
  String _getFallbackExercises(String subject, String grade, String topic, String difficulty, int count) {
    return '''
## ${topic}练习题（${difficulty}难度）

### 题目1：基础理解题
**题目**：下列关于${topic}的说法中，正确的是（　）
A. 选项A
B. 选项B  
C. 选项C
D. 选项D

**答案**：请参考教材内容
**解析**：建议复习相关概念

### 题目2：应用分析题
**题目**：请结合${topic}的相关知识，分析以下问题...

**答案要点**：
1. 要点一
2. 要点二
3. 要点三

**解析**：此题考查对${topic}的理解和应用能力

*注：共需生成${count}道题目，当前为离线模板。建议连接网络使用完整功能。*
''';
  }

  // 检查服务可用性
  Future<bool> isServiceAvailable() async {
    if (_apiKey == null) return false;
    
    try {
      final testPrompt = '测试连接';
      await _callAI(testPrompt, type: 'test');
      return true;
    } catch (e) {
      return false;
    }
  }

  // 切换AI服务提供商
  void switchProvider(String provider) {
    if (_providers.containsKey(provider)) {
      _currentProvider = provider;
      debugPrint('已切换到AI服务提供商: $provider');
    }
  }
} 