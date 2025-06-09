import 'package:flutter/foundation.dart';
import 'online_ai_service.dart';
import 'education_ai_service.dart';

// 平台安全的AI服务
// 在Web上只提供AI功能，在移动平台上提供完整功能
class PlatformAIService {
  static final PlatformAIService _instance = PlatformAIService._internal();
  factory PlatformAIService() => _instance;
  PlatformAIService._internal();

  final OnlineAIService _onlineAI = OnlineAIService();
  final EducationAIService _educationAI = EducationAIService();

  // 检查OCR功能是否可用
  bool get isOCRAvailable => !kIsWeb;

  // 检查AI功能是否可用
  bool get isAIAvailable => true;

  // 生成教案
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
  }) async {
    try {
      return await _educationAI.generateLessonPlan(
        subject: subject,
        grade: grade,
        topic: topic,
        requirements: requirements,
      );
    } catch (e) {
      debugPrint('教案生成失败，使用基础AI服务: $e');
      return await _onlineAI.generateLessonPlan(
        subject: subject,
        grade: grade,
        topic: topic,
        requirements: requirements,
      );
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
    try {
      return await _educationAI.generateExercises(
        subject: subject,
        grade: grade,
        topic: topic,
        difficulty: difficulty,
        count: count,
      );
    } catch (e) {
      debugPrint('练习题生成失败，使用基础AI服务: $e');
      return await _onlineAI.generateExercises(
        subject: subject,
        grade: grade,
        topic: topic,
        difficulty: difficulty,
        count: count,
      );
    }
  }

  // 分析学习内容
  Future<String> analyzeContent({
    required String content,
    required String analysisType,
  }) async {
    try {
      return await _educationAI.analyzeContent(
        content: content,
        analysisType: analysisType,
      );
    } catch (e) {
      debugPrint('内容分析失败，使用基础AI服务: $e');
      return await _onlineAI.analyzeContent(
        content: content,
        analysisType: analysisType,
      );
    }
  }

  // OCR文字识别（仅移动平台）
  Future<String> recognizeText(dynamic imageSource) async {
    if (!isOCRAvailable) {
      throw UnsupportedError('OCR功能在Web平台上不可用，请使用移动设备访问');
    }
    
    // 这里会在移动平台上动态导入OCR服务
    // Web平台上不会执行这段代码
    throw UnimplementedError('OCR功能需要在具体平台实现中调用');
  }

  // 获取服务状态
  Map<String, dynamic> getServiceStatus() {
    return {
      '平台类型': kIsWeb ? 'Web' : '移动平台',
      'AI服务': '可用',
      'OCR服务': isOCRAvailable ? '可用' : '不可用（Web平台限制）',
      'AI配置': _onlineAI.getServiceStatus(),
      '教育AI配置': _educationAI.getServiceStatus(),
    };
  }

  // 检查服务可用性
  Future<bool> isServiceAvailable() async {
    return await _onlineAI.isServiceAvailable();
  }
} 