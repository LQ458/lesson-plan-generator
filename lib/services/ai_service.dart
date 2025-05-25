import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';

class AIService {
  static final AIService _instance = AIService._internal();
  factory AIService() => _instance;

  AIService._internal();

  bool _isModelLoaded = false;
  bool get isModelLoaded => _isModelLoaded;

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

  // 生成教案
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
  }) async {
    if (!_isModelLoaded && !kIsWeb) {
      return '错误：AI模型未加载，请先下载并初始化模型';
    }

    try {
      // 模拟AI生成过程
      await Future.delayed(const Duration(seconds: 2));
      
      return '''
# ${topic}教案

## 基本信息
- 学科：${subject}
- 年级：${grade}
- 课时：1课时

## 教学目标
1. 知识目标：理解${topic}的基本概念和原理
2. 能力目标：掌握${topic}的应用方法
3. 情感目标：培养学生的学习兴趣和探究精神

## 教学重点
${topic}的核心概念和基本应用

## 教学难点
${topic}的深层理解和灵活运用

## 教学准备
1. 多媒体课件
2. 学习任务单
3. 练习题

## 教学过程
### 一、导入新课
1. 创设情境，引入话题
2. 提出问题，激发兴趣

### 二、新课讲解
1. 讲解${topic}的基本概念
2. 演示${topic}的应用实例
3. 引导学生思考和讨论

### 三、巩固练习
1. 基础练习：概念理解
2. 提高练习：应用能力
3. 拓展练习：创新思维

### 四、总结反思
1. 归纳本节课的知识要点
2. 学生自评与互评
3. 教师点评与总结

## 板书设计
[${topic}板书设计图]

## 课后作业
1. 完成教材习题
2. 预习下一节课内容
''';
    } catch (e) {
      debugPrint('生成教案失败: $e');
      return '生成教案失败，请稍后重试';
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

  // OCR文本识别
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
} 