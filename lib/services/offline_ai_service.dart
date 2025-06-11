import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import '../config/environment_config.dart';
import 'local_ai_model_manager.dart';
import 'local_ai_inference_engine.dart';

class OfflineAIService {
  static final OfflineAIService _instance = OfflineAIService._internal();
  factory OfflineAIService() => _instance;
  OfflineAIService._internal();

  // 本地AI组件
  final LocalAIModelManager _modelManager = LocalAIModelManager();
  final LocalAIInferenceEngine _inferenceEngine = LocalAIInferenceEngine();

  bool _isInitialized = false;
  String? _currentModelId;
  
  // 模型状态
  bool get isInitialized => _isInitialized;
  String? get currentModelId => _currentModelId;
  bool get hasLoadedModel => _inferenceEngine.currentModelId != null;

  /// 初始化离线AI服务
  Future<bool> initialize({String modelType = 'general'}) async {
    try {
      if (kIsWeb) {
        debugPrint('Web平台不支持离线AI模型');
        return false;
      }

      // 初始化推理引擎
      if (!await _inferenceEngine.initialize()) {
        debugPrint('推理引擎初始化失败');
        return false;
      }

      // 获取推荐的模型ID
      final recommendedModelId = _getRecommendedModelForType(modelType);
      
      // 检查推荐模型是否已下载
      if (await _modelManager.isModelDownloaded(recommendedModelId)) {
        // 加载模型
        if (await _inferenceEngine.loadModel(recommendedModelId)) {
          _currentModelId = recommendedModelId;
          _isInitialized = true;
          debugPrint('离线AI模型初始化成功: $recommendedModelId');
          return true;
        }
      }

      // 如果推荐模型不可用，尝试任何已下载的模型
      final downloadedModels = await _modelManager.getDownloadedModels();
      if (downloadedModels.isNotEmpty) {
        final firstModel = downloadedModels.first;
        if (await _inferenceEngine.loadModel(firstModel)) {
          _currentModelId = firstModel;
          _isInitialized = true;
          debugPrint('离线AI使用已有模型: $firstModel');
          return true;
        }
      }

      debugPrint('没有可用的离线AI模型，需要先下载');
      return false;
    } catch (e) {
      debugPrint('离线AI初始化失败: $e');
      return false;
    }
  }

  /// 下载AI模型
  Future<bool> downloadModel({
    required String modelType,
    required Function(double progress) onProgress,
    required Function() onSuccess,
    required Function(String error) onError,
  }) async {
    try {
      if (kIsWeb) {
        onError('Web平台不支持离线模型下载');
        return false;
      }

      // 获取推荐的模型ID
      final modelId = _getRecommendedModelForType(modelType);
      
      debugPrint('开始下载模型: $modelId');

      // 使用模型管理器下载模型
      await _modelManager.downloadModel(
        modelId,
        onProgress: onProgress,
        onSuccess: () async {
          debugPrint('模型下载完成，尝试加载...');
          
          // 下载完成后尝试加载模型
          if (await _inferenceEngine.loadModel(modelId)) {
            _currentModelId = modelId;
            _isInitialized = true;
            debugPrint('模型加载成功: $modelId');
            onSuccess();
          } else {
            onError('模型下载成功但加载失败');
          }
        },
        onError: onError,
      );

      return true;
    } catch (e) {
      debugPrint('下载模型失败: $e');
      onError('下载模型失败: $e');
      return false;
    }
  }

  /// 生成教案（离线模式）
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
  }) async {
    if (!_isInitialized || !hasLoadedModel) {
      throw Exception('😊 离线AI模型未准备好\n\n💡 请先下载并加载AI模型：\n1. 进入设置页面\n2. 下载适合的AI模型\n3. 等待模型加载完成');
    }

    try {
      debugPrint('使用离线AI生成教案: $subject - $grade - $topic');
      
      final result = await _inferenceEngine.generateLessonPlan(
        subject: subject,
        grade: grade,
        topic: topic,
        requirements: requirements,
      );

      debugPrint('离线教案生成完成');
      return result;
    } catch (e) {
      debugPrint('离线生成教案失败: $e');
      throw Exception('😅 离线教案生成遇到问题\n\n💡 可能的原因：\n1. 模型运行异常\n2. 设备内存不足\n3. 请尝试重启应用');
    }
  }

  /// 生成练习题（离线模式）
  Future<String> generateExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    if (!_isInitialized || !hasLoadedModel) {
      throw Exception('😊 离线AI模型未准备好，请先下载并加载AI模型');
    }

    try {
      debugPrint('使用离线AI生成练习题: $subject - $grade - $topic');
      
      final result = await _inferenceEngine.generateExercises(
        subject: subject,
        grade: grade,
        topic: topic,
        difficulty: difficulty,
        count: count,
      );

      debugPrint('离线练习题生成完成');
      return result;
    } catch (e) {
      debugPrint('离线生成练习题失败: $e');
      throw Exception('😅 离线练习题生成遇到问题，请重试或使用在线服务');
    }
  }

  /// 分析内容（离线模式）
  Future<String> analyzeContent({
    required String content,
    required String analysisType,
  }) async {
    if (!_isInitialized || !hasLoadedModel) {
      return '😊 离线AI模型未准备好，请先下载并加载AI模型';
    }

    try {
      debugPrint('使用离线AI分析内容: $analysisType');
      
      final result = await _inferenceEngine.analyzeContent(
        content: content,
        analysisType: analysisType,
      );

      debugPrint('离线内容分析完成');
      return result;
    } catch (e) {
      debugPrint('离线内容分析失败: $e');
      return '😅 内容分析暂时不可用，请稍后重试';
    }
  }

  /// 获取模型信息
  Map<String, dynamic> getModelInfo() {
    final currentModel = _currentModelId != null 
        ? _modelManager.getModelInfo(_currentModelId!)
        : null;
    
    return {
      '服务状态': _isInitialized ? '已初始化' : '未初始化',
      '当前模型': currentModel?.name ?? '无',
      '模型ID': _currentModelId ?? '无',
      '推理引擎': _inferenceEngine.isInitialized ? '就绪' : '未就绪',
      '支持的模型': LocalAIModelManager.availableModels.keys.toList(),
    };
  }

  /// 检查模型可用性
  Future<Map<String, bool>> checkModelsAvailability() async {
    if (kIsWeb) {
      return {'web': false}; // Web平台不支持离线模型
    }
    
    final availability = <String, bool>{};
    
    for (final modelId in LocalAIModelManager.availableModels.keys) {
      final isDownloaded = await _modelManager.isModelDownloaded(modelId);
      final isCompatible = await _modelManager.isDeviceCompatible(modelId);
      availability[modelId] = isDownloaded && isCompatible;
    }
    
    return availability;
  }

  /// 获取可用模型列表
  Future<List<ModelConfig>> getAvailableModels() async {
    return _modelManager.getAllAvailableModels();
  }

  /// 获取已下载的模型列表
  Future<List<String>> getDownloadedModels() async {
    return _modelManager.getDownloadedModels();
  }

  /// 删除模型
  Future<bool> deleteModel(String modelId) async {
    try {
      // 如果是当前使用的模型，先卸载
      if (_currentModelId == modelId) {
        await _inferenceEngine.unloadModel();
        _currentModelId = null;
        _isInitialized = false;
      }

      return await _modelManager.deleteModel(modelId);
    } catch (e) {
      debugPrint('删除模型失败: $e');
      return false;
    }
  }

  /// 切换模型
  Future<bool> switchModel(String modelId) async {
    try {
      if (!await _modelManager.isModelDownloaded(modelId)) {
        debugPrint('模型未下载: $modelId');
        return false;
      }

      // 卸载当前模型
      await _inferenceEngine.unloadModel();

      // 加载新模型
      if (await _inferenceEngine.loadModel(modelId)) {
        _currentModelId = modelId;
        _isInitialized = true;
        debugPrint('成功切换到模型: $modelId');
        return true;
      } else {
        debugPrint('模型加载失败: $modelId');
        return false;
      }
    } catch (e) {
      debugPrint('切换模型失败: $e');
      return false;
    }
  }

  /// 获取设备兼容性信息
  Future<Map<String, bool>> getDeviceCompatibility() async {
    final compatibility = <String, bool>{};
    
    for (final modelId in LocalAIModelManager.availableModels.keys) {
      compatibility[modelId] = await _modelManager.isDeviceCompatible(modelId);
    }
    
    return compatibility;
  }

  /// 根据模型类型获取推荐的模型ID
  String _getRecommendedModelForType(String modelType) {
    switch (modelType) {
      case 'education':
      case 'general':
        return 'education-lite-1b'; // 轻量级教育模型，适合中低端设备
      case 'advanced':
        return 'qwen-1.8b-chat-int4'; // 更强大的模型，需要更好的设备
      case 'premium':
        return 'chatglm3-6b-int4'; // 最强大的模型，需要高端设备
      default:
        return 'education-lite-1b';
    }
  }

  /// 释放资源
  Future<void> dispose() async {
    try {
      await _inferenceEngine.dispose();
      _isInitialized = false;
      _currentModelId = null;
      debugPrint('离线AI服务已释放资源');
    } catch (e) {
      debugPrint('释放离线AI资源失败: $e');
    }
  }
} 