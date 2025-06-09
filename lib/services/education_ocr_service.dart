import 'dart:io';
import 'package:flutter/foundation.dart';
import 'enhanced_ocr_service.dart';

class EducationOCRService {
  static final EducationOCRService _instance = EducationOCRService._internal();
  factory EducationOCRService() => _instance;
  EducationOCRService._internal();

  final EnhancedOCRService _enhancedOCR = EnhancedOCRService();

  // 学科特定的关键词库
  static const Map<String, List<String>> _subjectKeywords = {
    '数学': [
      // 基础运算
      '加法', '减法', '乘法', '除法', '等于', '大于', '小于', '约等于',
      // 几何
      '三角形', '正方形', '长方形', '圆形', '周长', '面积', '体积',
      // 代数
      '方程', '不等式', '函数', '变量', '常数', '系数',
      // 数字和符号
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      '+', '-', '×', '÷', '=', '>', '<', '≥', '≤', '≠',
    ],
    '语文': [
      // 基础语法
      '主语', '谓语', '宾语', '定语', '状语', '补语',
      // 修辞手法
      '比喻', '拟人', '排比', '对偶', '夸张', '反问',
      // 文学体裁
      '诗歌', '散文', '小说', '戏剧', '记叙文', '说明文', '议论文',
      // 标点符号
      '。', '，', '？', '！', '：', '；', '"', '"', ''', ''',
    ],
    '英语': [
      // 基础语法
      'subject', 'verb', 'object', 'adjective', 'adverb',
      // 时态
      'present', 'past', 'future', 'perfect', 'continuous',
      // 常用词汇
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    ],
    '物理': [
      // 力学
      '力', '速度', '加速度', '质量', '重力', '摩擦力',
      // 电学
      '电流', '电压', '电阻', '功率', '电路', '串联', '并联',
      // 光学
      '光线', '反射', '折射', '凸透镜', '凹透镜',
      // 单位
      'm', 'kg', 's', 'N', 'A', 'V', 'Ω', 'W',
    ],
    '化学': [
      // 元素
      'H', 'He', 'Li', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl',
      // 化学反应
      '氧化', '还原', '化合', '分解', '置换', '复分解',
      // 物质状态
      '固体', '液体', '气体', '溶液', '悬浊液', '乳浊液',
    ],
  };

  // 常见错误字符映射（OCR容易识别错的字符）
  static const Map<String, String> _errorCorrection = {
    // 数字容易错误识别
    'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 's': '5',
    'Z': '2', 'B': '8', 'G': '6', 'g': '9',
    
    // 数学符号
    'x': '×', 'X': '×', '*': '×', '÷': '÷', '/': '÷',
    '=': '=', '≈': '≈', '≠': '≠', '≤': '≤', '≥': '≥',
    
    // 中文标点
    ',': '，', '.': '。', '?': '？', '!': '！', ':': '：', ';': '；',
    
    // 英文字母容易混淆
    'rn': 'm', 'cl': 'd', 'vv': 'w', 'nn': 'n',
  };

  // 识别学生作业
  Future<StudentWorkResult> recognizeStudentWork(String imagePath, {
    required String subject,
    required String grade,
    String? expectedTopic,
  }) async {
    try {
      await _enhancedOCR.initialize();
      
      // 根据学科选择识别模式
      OCRMode mode = _getOCRModeForSubject(subject);
      
      // 执行OCR识别
      final ocrResult = await _enhancedOCR.recognizeText(
        imagePath,
        mode: mode,
        preprocess: true,
      );
      
      // 教育专用后处理
      final processedText = _postProcessEducationText(
        ocrResult.rawText,
        subject,
        grade,
      );
      
      // 分析作业内容
      final analysis = _analyzeStudentWork(
        processedText,
        subject,
        grade,
        expectedTopic,
      );
      
      return StudentWorkResult(
        originalText: ocrResult.rawText,
        processedText: processedText,
        confidence: ocrResult.confidence,
        subject: subject,
        grade: grade,
        analysis: analysis,
        detectedErrors: _detectCommonErrors(processedText, subject),
        suggestions: _generateSuggestions(processedText, subject, analysis),
      );
      
    } catch (e) {
      debugPrint('学生作业识别失败: $e');
      return StudentWorkResult(
        originalText: '',
        processedText: '识别失败：$e',
        confidence: 0.0,
        subject: subject,
        grade: grade,
        analysis: WorkAnalysis(
          completeness: 0.0,
          accuracy: 0.0,
          keyPoints: [],
          missingPoints: [],
          errorTypes: ['识别失败'],
        ),
        detectedErrors: [],
        suggestions: ['请确保图片清晰，重新拍照识别'],
      );
    }
  }

  // 识别教材内容
  Future<String> recognizeTextbook(String imagePath, {
    required String subject,
    bool isExercise = false,
  }) async {
    try {
      await _enhancedOCR.initialize();
      
      final result = await _enhancedOCR.recognizeText(
        imagePath,
        mode: _getOCRModeForSubject(subject),
        preprocess: true,
      );
      
      // 教材专用处理
      return _postProcessTextbookContent(result.formattedText, subject, isExercise);
      
    } catch (e) {
      debugPrint('教材识别失败: $e');
      return '教材内容识别失败，请重新拍照';
    }
  }

  // 批量识别试卷
  Future<List<StudentWorkResult>> recognizeExamPaper(
    List<String> imagePaths, {
    required String subject,
    required String grade,
  }) async {
    final results = <StudentWorkResult>[];
    
    for (int i = 0; i < imagePaths.length; i++) {
      try {
        final result = await recognizeStudentWork(
          imagePaths[i],
          subject: subject,
          grade: grade,
          expectedTopic: '第${i + 1}题',
        );
        results.add(result);
      } catch (e) {
        results.add(StudentWorkResult(
          originalText: '',
          processedText: '第${i + 1}页识别失败',
          confidence: 0.0,
          subject: subject,
          grade: grade,
          analysis: WorkAnalysis(
            completeness: 0.0,
            accuracy: 0.0,
            keyPoints: [],
            missingPoints: [],
            errorTypes: ['识别失败'],
          ),
          detectedErrors: [],
          suggestions: ['请重新拍照'],
        ));
      }
    }
    
    return results;
  }

  // 根据学科选择OCR模式
  OCRMode _getOCRModeForSubject(String subject) {
    switch (subject) {
      case '数学':
      case '物理':
      case '化学':
        return OCRMode.general; // 数理化需要识别公式和符号
      case '语文':
        return OCRMode.chinese; // 语文主要是中文
      case '英语':
        return OCRMode.general; // 英语主要是英文
      default:
        return OCRMode.auto;
    }
  }

  // 教育专用文本后处理
  String _postProcessEducationText(String rawText, String subject, String grade) {
    var processedText = rawText;
    
    // 1. 错误字符纠正
    _errorCorrection.forEach((error, correction) {
      processedText = processedText.replaceAll(error, correction);
    });
    
    // 2. 学科特定处理
    switch (subject) {
      case '数学':
        processedText = _processMathText(processedText);
        break;
      case '语文':
        processedText = _processChineseText(processedText);
        break;
      case '英语':
        processedText = _processEnglishText(processedText);
        break;
      case '物理':
      case '化学':
        processedText = _processScienceText(processedText);
        break;
    }
    
    // 3. 格式整理
    processedText = _formatEducationText(processedText);
    
    return processedText;
  }

  // 数学文本处理
  String _processMathText(String text) {
    var processed = text;
    
    // 处理数学表达式
    processed = processed.replaceAllMapped(
      RegExp(r'(\d+)\s*([+\-×÷])\s*(\d+)\s*=\s*(\d+)'),
      (match) => '${match.group(1)} ${match.group(2)} ${match.group(3)} = ${match.group(4)}',
    );
    
    // 处理分数
    processed = processed.replaceAllMapped(
      RegExp(r'(\d+)/(\d+)'),
      (match) => '${match.group(1)}/${match.group(2)}',
    );
    
    // 处理几何图形
    processed = processed.replaceAll('△', '三角形');
    processed = processed.replaceAll('□', '正方形');
    processed = processed.replaceAll('○', '圆');
    
    return processed;
  }

  // 语文文本处理
  String _processChineseText(String text) {
    var processed = text;
    
    // 处理标点符号
    processed = processed.replaceAll('，', '，');
    processed = processed.replaceAll('。', '。');
    processed = processed.replaceAll('？', '？');
    processed = processed.replaceAll('！', '！');
    
    // 处理引号
    processed = processed.replaceAllMapped(
      RegExp(r'"([^"]*)"'),
      (match) => '"${match.group(1)}"',
    );
    
    return processed;
  }

  // 英语文本处理
  String _processEnglishText(String text) {
    var processed = text;
    
    // 处理单词间距
    processed = processed.replaceAll(RegExp(r'\s+'), ' ');
    
    // 处理常见缩写
    processed = processed.replaceAll("don't", "do not");
    processed = processed.replaceAll("can't", "cannot");
    processed = processed.replaceAll("won't", "will not");
    
    return processed;
  }

  // 理科文本处理
  String _processScienceText(String text) {
    var processed = text;
    
    // 处理化学方程式
    processed = processed.replaceAllMapped(
      RegExp(r'([A-Z][a-z]?\d*)'),
      (match) => match.group(0)!,
    );
    
    // 处理物理单位
    processed = processed.replaceAll('m/s', 'm/s');
    processed = processed.replaceAll('kg·m/s²', 'kg·m/s²');
    
    return processed;
  }

  // 格式整理
  String _formatEducationText(String text) {
    var formatted = text;
    
    // 移除多余空行
    formatted = formatted.replaceAll(RegExp(r'\n\s*\n'), '\n\n');
    
    // 整理行首空格
    formatted = formatted.replaceAll(RegExp(r'^\s+', multiLine: true), '');
    
    // 整理行尾空格
    formatted = formatted.replaceAll(RegExp(r'\s+$', multiLine: true), '');
    
    return formatted.trim();
  }

  // 教材内容后处理
  String _postProcessTextbookContent(String text, String subject, bool isExercise) {
    var processed = _postProcessEducationText(text, subject, '通用');
    
    if (isExercise) {
      // 练习题特殊处理
      processed = _formatExerciseText(processed);
    }
    
    return processed;
  }

  // 练习题格式化
  String _formatExerciseText(String text) {
    var formatted = text;
    
    // 识别题目编号
    formatted = formatted.replaceAllMapped(
      RegExp(r'^(\d+)[\.、]\s*(.*)$', multiLine: true),
      (match) => '${match.group(1)}. ${match.group(2)}',
    );
    
    // 识别选择题选项
    formatted = formatted.replaceAllMapped(
      RegExp(r'^([A-D])[\.、]\s*(.*)$', multiLine: true),
      (match) => '${match.group(1)}. ${match.group(2)}',
    );
    
    return formatted;
  }

  // 分析学生作业
  WorkAnalysis _analyzeStudentWork(
    String text,
    String subject,
    String grade,
    String? expectedTopic,
  ) {
    final keywords = _subjectKeywords[subject] ?? [];
    final foundKeywords = <String>[];
    final missingKeywords = <String>[];
    
    // 检查关键词覆盖
    for (final keyword in keywords) {
      if (text.contains(keyword)) {
        foundKeywords.add(keyword);
      } else {
        missingKeywords.add(keyword);
      }
    }
    
    // 计算完整度和准确度
    final completeness = foundKeywords.length / keywords.length;
    final accuracy = _calculateAccuracy(text, subject);
    
    return WorkAnalysis(
      completeness: completeness,
      accuracy: accuracy,
      keyPoints: foundKeywords,
      missingPoints: missingKeywords.take(5).toList(),
      errorTypes: _identifyErrorTypes(text, subject),
    );
  }

  // 计算准确度
  double _calculateAccuracy(String text, String subject) {
    // 简化的准确度计算
    // 实际应用中可以使用更复杂的算法
    
    final lines = text.split('\n').where((line) => line.trim().isNotEmpty);
    if (lines.isEmpty) return 0.0;
    
    int correctLines = 0;
    for (final line in lines) {
      if (_isLineCorrect(line, subject)) {
        correctLines++;
      }
    }
    
    return correctLines / lines.length;
  }

  // 判断行是否正确
  bool _isLineCorrect(String line, String subject) {
    // 简化的正确性判断
    switch (subject) {
      case '数学':
        return _isMathLineCorrect(line);
      case '语文':
        return _isChineseLineCorrect(line);
      default:
        return line.trim().isNotEmpty;
    }
  }

  // 数学行正确性判断
  bool _isMathLineCorrect(String line) {
    // 检查数学表达式的基本正确性
    final mathPattern = RegExp(r'^\s*\d+\s*[+\-×÷]\s*\d+\s*=\s*\d+\s*$');
    if (mathPattern.hasMatch(line)) {
      // 简单验证计算结果
      return _verifyMathExpression(line);
    }
    return true; // 非计算题默认正确
  }

  // 验证数学表达式
  bool _verifyMathExpression(String expression) {
    try {
      final match = RegExp(r'(\d+)\s*([+\-×÷])\s*(\d+)\s*=\s*(\d+)').firstMatch(expression);
      if (match == null) return false;
      
      final a = int.parse(match.group(1)!);
      final operator = match.group(2)!;
      final b = int.parse(match.group(3)!);
      final result = int.parse(match.group(4)!);
      
      switch (operator) {
        case '+':
          return a + b == result;
        case '-':
          return a - b == result;
        case '×':
          return a * b == result;
        case '÷':
          return b != 0 && a ~/ b == result;
        default:
          return false;
      }
    } catch (e) {
      return false;
    }
  }

  // 语文行正确性判断
  bool _isChineseLineCorrect(String line) {
    // 检查基本的语法和标点
    return line.trim().isNotEmpty && 
           !line.contains(RegExp(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\?\!\:\;""''（）]'));
  }

  // 识别错误类型
  List<String> _identifyErrorTypes(String text, String subject) {
    final errorTypes = <String>[];
    
    switch (subject) {
      case '数学':
        if (text.contains(RegExp(r'\d+\s*[+\-×÷]\s*\d+\s*=\s*\d+'))) {
          // 检查计算错误
          final expressions = RegExp(r'\d+\s*[+\-×÷]\s*\d+\s*=\s*\d+').allMatches(text);
          for (final match in expressions) {
            if (!_verifyMathExpression(match.group(0)!)) {
              errorTypes.add('计算错误');
              break;
            }
          }
        }
        break;
        
      case '语文':
        if (text.contains(RegExp(r'[，。？！]'))) {
          // 检查标点符号使用
          if (!text.contains(RegExp(r'[。！？]$'))) {
            errorTypes.add('标点符号错误');
          }
        }
        break;
    }
    
    return errorTypes;
  }

  // 检测常见错误
  List<String> _detectCommonErrors(String text, String subject) {
    final errors = <String>[];
    
    // 检查OCR常见错误
    _errorCorrection.forEach((error, correction) {
      if (text.contains(error) && error != correction) {
        errors.add('可能的识别错误：$error 应为 $correction');
      }
    });
    
    return errors;
  }

  // 生成建议
  List<String> _generateSuggestions(String text, String subject, WorkAnalysis analysis) {
    final suggestions = <String>[];
    
    if (analysis.completeness < 0.5) {
      suggestions.add('作业完整度较低，建议补充更多内容');
    }
    
    if (analysis.accuracy < 0.7) {
      suggestions.add('准确度有待提高，建议仔细检查答案');
    }
    
    if (analysis.missingPoints.isNotEmpty) {
      suggestions.add('缺少关键知识点：${analysis.missingPoints.take(3).join('、')}');
    }
    
    if (analysis.errorTypes.isNotEmpty) {
      suggestions.add('发现错误类型：${analysis.errorTypes.join('、')}');
    }
    
    return suggestions;
  }

  // 释放资源
  Future<void> dispose() async {
    await _enhancedOCR.dispose();
  }
}

// 学生作业识别结果
class StudentWorkResult {
  final String originalText;
  final String processedText;
  final double confidence;
  final String subject;
  final String grade;
  final WorkAnalysis analysis;
  final List<String> detectedErrors;
  final List<String> suggestions;

  StudentWorkResult({
    required this.originalText,
    required this.processedText,
    required this.confidence,
    required this.subject,
    required this.grade,
    required this.analysis,
    required this.detectedErrors,
    required this.suggestions,
  });
}

// 作业分析结果
class WorkAnalysis {
  final double completeness;  // 完整度 0-1
  final double accuracy;      // 准确度 0-1
  final List<String> keyPoints;      // 已掌握的知识点
  final List<String> missingPoints;  // 缺失的知识点
  final List<String> errorTypes;     // 错误类型

  WorkAnalysis({
    required this.completeness,
    required this.accuracy,
    required this.keyPoints,
    required this.missingPoints,
    required this.errorTypes,
  });
} 