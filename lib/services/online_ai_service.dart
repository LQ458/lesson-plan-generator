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
  
  // 支持多个国内AI服务提供商
  static final Map<String, Map<String, String>> _providers = {
    'qianwen': {
      'url': EnvironmentConfig.apiBaseUrls['alicloud']!,
      'model': EnvironmentConfig.defaultModels['alicloud']!,
      'apiKey': EnvironmentConfig.aliCloudApiKey,
      'name': '阿里云通义千问',
    },
    'wenxin': {
      'url': EnvironmentConfig.apiBaseUrls['baidu_chat']!,
      'model': EnvironmentConfig.defaultModels['baidu']!,
      'apiKey': EnvironmentConfig.baiduApiKey,
      'name': '百度文心一言',
    },
    'chatglm': {
      'url': EnvironmentConfig.apiBaseUrls['chatglm']!,
      'model': EnvironmentConfig.defaultModels['chatglm']!,
      'apiKey': EnvironmentConfig.chatGlmApiKey,
      'name': '智谱ChatGLM',
    },
    'deepseek': {
      'url': EnvironmentConfig.apiBaseUrls['deepseek']!,
      'model': EnvironmentConfig.defaultModels['deepseek']!,
      'apiKey': EnvironmentConfig.deepSeekApiKey,
      'name': '深度求索',
    },
    'doubao': {
      'url': EnvironmentConfig.apiBaseUrls['doubao']!,
      'model': EnvironmentConfig.defaultModels['doubao']!,
      'apiKey': EnvironmentConfig.doubaoApiKey,
      'name': '字节豆包',
    },
    'kimi': {
      'url': EnvironmentConfig.apiBaseUrls['kimi']!,
      'model': EnvironmentConfig.defaultModels['kimi']!,
      'apiKey': EnvironmentConfig.deepSeekApiKey, // Kimi暂用DeepSeek key
      'name': 'Kimi智能助手',
    },
  };

  String _currentProvider = 'qianwen';
  String? _apiKey;
  
  // 自动初始化API配置
  void _initializeApiConfig() {
    // 按优先级检查可用的API服务（优选性价比高的服务商）
    final preferredOrder = EnvironmentConfig.getPreferredProviders();
    
    for (final providerKey in preferredOrder) {
      final provider = _providers[providerKey];
      if (provider != null && provider['apiKey']?.isNotEmpty == true) {
        _currentProvider = providerKey;
        _apiKey = provider['apiKey'];
        
        _configureHeaders(providerKey);
        
        debugPrint('自动配置AI服务: ${provider['name']} ($providerKey)');
        return;
      }
    }
    
    debugPrint('警告: 未找到有效的API配置，请在设置中配置API密钥');
  }
  
  // 配置请求头（不同服务商可能需要不同的认证方式）
  void _configureHeaders(String provider) {
    switch (provider) {
      case 'qianwen':
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
          'X-DashScope-SSE': 'disable',
        };
        break;
      case 'wenxin':
        // 百度需要先获取access_token
        _dio.options.headers = {
          'Content-Type': 'application/json',
        };
        break;
      case 'chatglm':
      case 'deepseek':
      case 'kimi':
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
        };
        break;
      case 'doubao':
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
        };
        break;
      default:
        _dio.options.headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
        };
    }
  }
  
  // 设置API密钥（手动覆盖）
  void setApiKey(String apiKey, {String provider = 'qianwen'}) {
    _apiKey = apiKey;
    _currentProvider = provider;
    
    _configureHeaders(provider);
    debugPrint('手动设置AI服务: ${_providers[provider]?['name']} ($provider)');
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
      throw Exception('❌ 在线教案生成失败\n\n原因：${e.toString()}\n\n请检查：\n1. 网络连接是否正常\n2. API密钥是否正确\n3. 账号余额是否充足\n\n👉 前往"个人中心 → AI服务配置"检查设置');
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
      throw Exception('❌ 在线练习题生成失败\n\n原因：${e.toString()}\n\n请检查：\n1. 网络连接是否正常\n2. API密钥是否正确\n3. 账号余额是否充足\n\n👉 前往"个人中心 → AI服务配置"检查设置');
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

  // 构建教案提示词 - 增强多样性和专业性
  String _buildLessonPlanPrompt(String subject, String grade, String topic, String? requirements) {
    // 根据学科和年级调整教案风格
    final isElementary = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'].contains(grade);
    final schoolLevel = isElementary ? '小学' : (grade.contains('初') ? '初中' : '高中');
    
    return '''
作为一名资深的${subject}教师，请为${schoolLevel}${grade}学生设计一份关于"${topic}"的详细教案。

## 教案设计要求：
### 基本规范
- 严格遵循最新课程标准和教育教学理念
- 体现学科核心素养培养
- 突出学生主体地位，教师主导作用
- 融入德育元素和价值观引导

### 结构完整性
1. **教学目标**：知识与技能、过程与方法、情感态度价值观三维目标
2. **教学重难点**：明确重点知识和技能难点
3. **教学准备**：教具、学具、多媒体资源等
4. **教学过程**：详细的教学环节设计
5. **板书设计**：合理的板书布局
6. **作业设计**：分层次的课后作业
7. **教学反思**：预设的反思要点

### 教学特色
- 采用多种教学方法（讲授、讨论、探究、合作学习等）
- 设计互动环节和学生活动
- 关注不同层次学生的学习需求
- 融入现代教育技术手段

### 内容要求
- 知识点讲解详细具体
- 例题和练习设计合理
- 教学活动可操作性强
- 时间分配科学合理

${requirements != null ? '### 特殊要求\n$requirements\n' : ''}

### 格式要求
- 使用markdown格式，层次清晰
- 字数控制在1500-2000字
- 包含必要的表格和列表
- 适合直接打印使用

请生成完整的教案内容：
''';
  }

  // 构建练习题提示词 - 提升专业性
  String _buildExercisePrompt(String subject, String grade, String topic, String difficulty, int count) {
    final isElementary = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'].contains(grade);
    final schoolLevel = isElementary ? '小学' : (grade.contains('初') ? '初中' : '高中');
    
    return '''
请为${schoolLevel}${grade}${subject}科目"${topic}"单元设计${count}道高质量的${difficulty}难度练习题。

## 题目设计要求：

### 题型分布
- 基础题（${difficulty == '简单' ? '60%' : difficulty == '中等' ? '40%' : '20%'}）：考查基本概念和技能
- 综合题（${difficulty == '简单' ? '30%' : difficulty == '中等' ? '40%' : '40%'}）：考查知识运用能力  
- 拓展题（${difficulty == '简单' ? '10%' : difficulty == '中等' ? '20%' : '40%'}）：考查创新思维能力

### 题目类型
${_getQuestionTypes(subject, schoolLevel)}

### 质量标准
1. **科学性**：题目内容准确，符合学科规律
2. **适切性**：难度适合目标年级学生
3. **层次性**：从易到难，螺旋上升
4. **实用性**：贴近生活实际，有教育价值
5. **规范性**：表述清楚，答案标准

### 答案要求
- 每题提供详细的解题过程
- 包含解题思路和方法指导
- 标明易错点和注意事项
- 提供变式训练建议

### 格式要求
```
## 第X题（题型）【${difficulty}】
[题目内容]

**答案：** [标准答案]

**解析：** [详细解题过程和思路]

**拓展：** [相关知识点或变式]
```

请生成高质量的练习题：
''';
  }

  // 根据学科获取合适的题型
  String _getQuestionTypes(String subject, String schoolLevel) {
    final questionTypes = <String, Map<String, List<String>>>{
      '语文': {
        '小学': ['填空题', '选择题', '阅读理解', '看图写话', '造句练习'],
        '初中': ['选择题', '填空题', '阅读理解', '古诗文默写', '作文题'],
        '高中': ['选择题', '填空题', '现代文阅读', '古诗文阅读', '写作题'],
      },
      '数学': {
        '小学': ['计算题', '应用题', '填空题', '选择题', '图形题'],
        '初中': ['计算题', '化简题', '解方程', '应用题', '几何证明'],
        '高中': ['选择题', '填空题', '解答题', '应用题', '证明题'],
      },
      '英语': {
        '小学': ['选择题', '填空题', '连线题', '翻译题', '看图说话'],
        '初中': ['选择题', '完形填空', '阅读理解', '翻译题', '写作题'],
        '高中': ['选择题', '完形填空', '阅读理解', '语法填空', '书面表达'],
      },
    };
    
    final types = questionTypes[subject]?[schoolLevel] ?? 
                  ['选择题', '填空题', '简答题', '应用题', '分析题'];
    
    return types.map((type) => '- $type').join('\n');
  }

  // 调用AI API
  Future<String> _callAI(String prompt, {required String type}) async {
    if (_apiKey == null || _apiKey!.isEmpty) {
      throw Exception('🔑 API密钥未配置\n\n请前往"个人中心 → AI服务配置"配置API密钥\n\n推荐服务商：\n• DeepSeek (免费额度)\n• 通义千问 (性能优秀)\n• 智谱ChatGLM (免费额度)');
    }

    try {
      final response = await _makeRequest(prompt);
      return _extractContent(response, type);
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        throw Exception('请求过于频繁，请稍后重试');
      } else if (e.response?.statusCode == 401) {
        throw Exception('API密钥无效，请检查密钥配置');
      } else if (e.response?.statusCode == 403) {
        throw Exception('API密钥权限不足或账户余额不足');
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
              'top_p': 0.8,
            },
          },
        );
        
      case 'wenxin':
        // 百度文心一言需要先获取access_token
        final accessToken = await _getBaiduAccessToken();
        return await _dio.post(
          '${provider['url']}?access_token=$accessToken',
          data: {
            'messages': [
              {
                'role': 'user',
                'content': prompt,
              }
            ],
            'max_output_tokens': 2000,
            'temperature': 0.7,
            'top_p': 0.8,
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
            'top_p': 0.8,
          },
        );
        
      case 'deepseek':
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
            'stream': false,
          },
        );
        
      case 'doubao':
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
        
      case 'kimi':
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
        throw Exception('不支持的AI服务提供商: $_currentProvider');
    }
  }
  
  // 获取百度access_token
  Future<String> _getBaiduAccessToken() async {
    try {
      final response = await _dio.post(
        EnvironmentConfig.apiBaseUrls['baidu_auth']!,
        queryParameters: {
          'grant_type': 'client_credentials',
          'client_id': EnvironmentConfig.baiduApiKey,
          'client_secret': EnvironmentConfig.baiduSecretKey,
        },
      );
      
      return response.data['access_token'];
    } catch (e) {
      throw Exception('获取百度access_token失败: $e');
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
        case 'deepseek':
        case 'doubao':
        case 'kimi':
          return data['choices'][0]['message']['content'] ?? '生成失败';
          
        default:
          debugPrint('未知的AI服务提供商: $_currentProvider');
          return '生成失败';
      }
    } catch (e) {
      debugPrint('解析响应失败: $e');
      return '内容解析失败，请检查API配置';
    }
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

  // OCR文本识别
  Future<String> recognizeText(String imagePath) async {
    try {
      final prompt = '''
请分析这张图片中的文字内容，并按照以下要求输出：
1. 准确识别所有文字
2. 保持原有的段落结构
3. 如果是数学公式，请用标准格式表示
4. 如果是手写字，请尽量识别清楚

请只输出识别到的文字内容，不要添加额外说明。
''';
      
      // 注意：这里需要图片上传功能，实际实现可能需要将图片转换为base64或使用其他方式
      // 暂时返回提示信息，真实实现时需要图片处理能力
      return 'OCR功能需要图片上传能力，请在移动端使用或配置支持图片分析的AI服务';
    } catch (e) {
      debugPrint('在线OCR识别失败: $e');
      return '在线OCR识别失败，请稍后重试';
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