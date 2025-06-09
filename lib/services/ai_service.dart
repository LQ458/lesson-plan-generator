import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'online_ai_service.dart';
import 'enhanced_ocr_service.dart';

class AIService {
  static final AIService _instance = AIService._internal();
  factory AIService() => _instance;

  AIService._internal();

  bool _isModelLoaded = false;
  bool get isModelLoaded => _isModelLoaded;
  
  // 集成在线AI服务
  final OnlineAIService _onlineAI = OnlineAIService();
  final EnhancedOCRService _ocrService = EnhancedOCRService();
  
  // 网络连接检测
  final Connectivity _connectivity = Connectivity();

  // 初始化AI模型
  Future<bool> initModel() async {
    try {
      // Web平台不支持本地模型，直接返回false
      if (kIsWeb) {
        _isModelLoaded = false;
        return false;
      }
      
      // 在移动平台上初始化Flutter Gemma
      // 实际项目中应该导入flutter_gemma并使用
      // 目前先模拟加载成功
      _isModelLoaded = true;
      return true;
    } catch (e) {
      debugPrint('初始化AI模型失败: $e');
      _isModelLoaded = false;
      return false;
    }
  }

  // 下载AI模型
  Future<bool> downloadModel({
    required Function(double progress) onProgress,
    required Function() onSuccess,
    required Function(String error) onError,
  }) async {
    try {
      // Web平台不支持本地模型下载
      if (kIsWeb) {
        onError('Web平台不支持离线AI模型');
        return false;
      }
      
      // 获取应用文档目录
      final appDir = await getApplicationDocumentsDirectory();
      final modelDir = Directory('${appDir.path}/models');
      if (!modelDir.existsSync()) {
        modelDir.createSync(recursive: true);
      }

      // 下载模型文件(例如)
      final modelPath = '${modelDir.path}/model.bin';
      final dio = Dio();

      // 模拟下载过程
      for (int i = 1; i <= 10; i++) {
        await Future.delayed(const Duration(milliseconds: 300));
        onProgress(i / 10);
      }

      // 初始化模型
      _isModelLoaded = true;
      onSuccess();
      return true;
    } catch (e) {
      onError('下载模型失败: $e');
      return false;
    }
  }

  // 生成教案（智能路由）
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
  }) async {
    try {
      // 检查网络连接
      if (await _isOnlineAvailable()) {
        // 优先使用在线AI
        return await _onlineAI.generateLessonPlan(
          subject: subject,
          grade: grade,
          topic: topic,
          requirements: requirements,
        );
      } else if (_isModelLoaded) {
        // 使用离线模型
        return await _generateOfflineLessonPlan(subject, grade, topic);
      } else {
        // 返回基础模板
        return _getBasicLessonPlanTemplate(subject, grade, topic);
      }
    } catch (e) {
      debugPrint('生成教案失败: $e');
      // 降级到基础模板
      return _getBasicLessonPlanTemplate(subject, grade, topic);
    }
  }

  // 生成分层练习题
  Future<String> generateExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    if (!_isModelLoaded && !kIsWeb) {
      return '错误：AI模型未加载，请先下载并初始化模型';
    }

    try {
      // 模拟AI生成过程
      await Future.delayed(const Duration(seconds: 1));
      
      // 模拟返回结果
      return '''
## ${topic}练习题（${difficulty}难度）

1. **选择题**：在下列分数中，最大的是（ ）
   A. 3/5   B. 2/3   C. 5/8   D. 7/12
   **答案**：B
   **解析**：将所有分数通分后比较大小：3/5=9/15，2/3=10/15，5/8=9.375/15，7/12=8.75/15，所以2/3最大。

2. **填空题**：计算：1/2 + 1/3 = ______
   **答案**：5/6
   **解析**：通分后计算：1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 5/6

3. **解答题**：小明有3/4本书，他读了这些书的2/5。请问小明读了多少本书？还剩多少本书没读？
   **答案**：读了3/10本，还剩9/20本
   **解析**：小明读的书为：3/4 × 2/5 = 6/20 = 3/10本
              剩余的书为：3/4 - 3/10 = 15/20 - 6/20 = 9/20本
''';
    } catch (e) {
      debugPrint('生成练习题失败: $e');
      return '生成练习题失败，请稍后重试';
    }
  }

  // OCR文本识别（使用增强服务）
  Future<String> recognizeText(String imagePath) async {
    try {
      if (kIsWeb) {
        // Web平台暂不支持实际OCR功能，返回模拟结果
        await Future.delayed(const Duration(seconds: 1));
        return '''
1. 分数的加减法
   - 同分母分数相加减：分子相加减，分母不变
   - 异分母分数相加减：先通分，再相加减

2. 分数的乘法
   - 分子相乘，分母相乘

3. 分数的除法
   - 除以一个分数等于乘以这个分数的倒数
''';
      }
      
      // 移动平台使用实际OCR
      final inputImage = InputImage.fromFilePath(imagePath);
      final textRecognizer = TextRecognizer();
      final RecognizedText recognizedText = 
          await textRecognizer.processImage(inputImage);
      
      String text = recognizedText.text;
      await textRecognizer.close();
      
      return text;
    } catch (e) {
      debugPrint('OCR识别失败: $e');
      return '文字识别失败，请确保图片清晰并重试';
    }
  }

  // 设置AI API密钥
  void setApiKey(String apiKey, {String provider = 'qianwen'}) {
    _onlineAI.setApiKey(apiKey, provider: provider);
  }

  // 检查网络连接
  Future<bool> _isOnlineAvailable() async {
    try {
      final connectivityResult = await _connectivity.checkConnectivity();
      return !connectivityResult.contains(ConnectivityResult.none);
    } catch (e) {
      return false;
    }
  }

  // 离线教案生成
  Future<String> _generateOfflineLessonPlan(String subject, String grade, String topic) async {
    // 模拟本地模型推理
    await Future.delayed(const Duration(seconds: 3));
    return _getBasicLessonPlanTemplate(subject, grade, topic);
  }

  // 基础教案模板
  String _getBasicLessonPlanTemplate(String subject, String grade, String topic) {
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

*注：此为基础模板，建议连接网络使用完整AI功能*
''';
  }

  // 增强OCR识别
  Future<String> recognizeTextEnhanced(String imagePath, {
    bool isHandwriting = false,
    bool isMathFormula = false,
  }) async {
    try {
      await _ocrService.initialize();
      
      if (isMathFormula) {
        return await _ocrService.recognizeMathFormula(imagePath);
      } else if (isHandwriting) {
        final result = await _ocrService.recognizeHandwriting(imagePath);
        return result.formattedText;
      } else {
        final result = await _ocrService.recognizeText(imagePath);
        return result.formattedText;
      }
    } catch (e) {
      debugPrint('增强OCR识别失败: $e');
      return await recognizeText(imagePath); // 降级到基础OCR
    }
  }

  // 批量OCR识别
  Future<List<String>> recognizeTextBatch(List<String> imagePaths) async {
    try {
      await _ocrService.initialize();
      final results = await _ocrService.recognizeBatch(imagePaths);
      return results.map((result) => result.formattedText).toList();
    } catch (e) {
      debugPrint('批量OCR识别失败: $e');
      // 降级到逐个识别
      final results = <String>[];
      for (final path in imagePaths) {
        results.add(await recognizeText(path));
      }
      return results;
    }
  }

  // 内容分析
  Future<String> analyzeContent({
    required String content,
    required String analysisType,
  }) async {
    try {
      if (await _isOnlineAvailable()) {
        return await _onlineAI.analyzeContent(
          content: content,
          analysisType: analysisType,
        );
      } else {
        return '内容分析需要网络连接，请检查网络后重试';
      }
    } catch (e) {
      debugPrint('内容分析失败: $e');
      return '内容分析暂时不可用，请稍后重试';
    }
  }

  // 释放资源
  Future<void> dispose() async {
    await _ocrService.dispose();
  }
} 