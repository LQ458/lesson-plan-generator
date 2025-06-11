import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'online_ai_service.dart';
import 'offline_ai_service.dart';
import 'enhanced_ocr_service.dart';
import 'streaming_ai_service.dart';
import '../config/environment_config.dart';

class AIService {
  static final AIService _instance = AIService._internal();
  factory AIService() => _instance;

  AIService._internal();

  bool _isModelLoaded = false;
  bool get isModelLoaded => _isModelLoaded;
  
  // 集成AI服务
  final OnlineAIService _onlineAI = OnlineAIService();
  final OfflineAIService _offlineAI = OfflineAIService();
  final EnhancedOCRService _ocrService = EnhancedOCRService();
  final StreamingAIService _streamingAI = StreamingAIService();
  
  // 网络连接检测
  final Connectivity _connectivity = Connectivity();

  // 初始化AI模型（山村教师版 - 自动配置）
  Future<bool> initModel({String modelType = 'education', bool forceRefresh = false}) async {
    try {
      // 教师版自动初始化：优先在线服务，离线作为备选
      debugPrint('🎓 教师版AI助手初始化中${forceRefresh ? '（强制刷新）' : ''}...');
      
      // 1. 检查API密钥配置状态
      final hasValidApiKey = EnvironmentConfig.areApiKeysConfigured;
      if (!hasValidApiKey) {
        debugPrint('⚠️ 未检测到有效的API密钥配置');
        debugPrint('📋 请配置以下任一服务商的API密钥：');
        debugPrint('   🏆 DeepSeek (推荐): https://platform.deepseek.com/');
        debugPrint('   🥈 通义千问: https://dashscope.aliyuncs.com/');
        debugPrint('   🥉 ChatGLM: https://open.bigmodel.cn/');
      }
      
      // 2. 尝试初始化在线服务
      try {
        if (hasValidApiKey) {
          // 自动切换到最佳可用的AI服务
          final providers = EnvironmentConfig.getPreferredProviders();
          if (providers.isNotEmpty) {
            _onlineAI.switchProvider(providers.first);
            debugPrint('✅ 在线AI服务已就绪（${providers.first}）');
          } else {
            debugPrint('⚠️ 未找到可用的API配置');
          }
        } else {
          debugPrint('⚠️ 在线服务需要API密钥，请先配置');
        }
      } catch (e) {
        debugPrint('⚠️ 在线服务初始化警告: $e');
      }
      
      // 3. Web平台处理
      if (kIsWeb) {
        _isModelLoaded = false; // Web不支持离线模型
        debugPrint('🌐 Web版本：仅支持在线AI服务');
        
        if (!hasValidApiKey) {
          debugPrint('🔑 请配置API密钥以使用AI功能');
          // Web版本即使没有API密钥也返回true，让用户能看到配置界面
          return true;
        }
        
        return hasValidApiKey; // Web版本的成功与否取决于API密钥配置
      }
      
      // 4. 移动端尝试初始化离线AI服务
      bool offlineSuccess = false;
      try {
        offlineSuccess = await _offlineAI.initialize(modelType: modelType);
        
        // 如果强制刷新或状态发生变化，更新模型加载状态
        if (forceRefresh || _isModelLoaded != offlineSuccess) {
          _isModelLoaded = offlineSuccess;
          debugPrint('📱 离线AI模型状态更新: ${offlineSuccess ? '已加载' : '未加载'}');
        }
        
        if (offlineSuccess) {
          debugPrint('📱 离线AI模型初始化成功');
        } else {
          debugPrint('📱 离线模型未就绪，将依赖在线服务');
        }
      } catch (e) {
        debugPrint('📱 离线模型初始化失败: $e');
        _isModelLoaded = false;
      }
      
      // 5. 最终状态判断
      final hasOnlineService = hasValidApiKey;
      final hasOfflineService = offlineSuccess;
      
      if (hasOnlineService || hasOfflineService) {
        debugPrint('🎉 AI教师助手已准备就绪！');
        debugPrint('   📶 在线服务: ${hasOnlineService ? '可用' : '需要配置API密钥'}');
        debugPrint('   📱 离线服务: ${hasOfflineService ? '可用' : '需要下载模型'}');
        return true;
      } else {
        debugPrint('⚠️ AI服务未完全就绪，但应用仍可使用基础功能');
        debugPrint('💡 建议：');
        debugPrint('   1. 配置API密钥启用在线AI功能');
        debugPrint('   2. 或下载离线AI模型');
        // 即使都不可用也返回true，让用户能使用应用并进行配置
        return true;
      }
      
    } catch (e) {
      debugPrint('❌ AI服务初始化失败: $e');
      // 即使出错也返回true，让老师能使用基本功能和配置界面
      return true;
    }
  }

  // 下载AI模型
  Future<bool> downloadModel({
    String modelType = 'general',
    required Function(double progress) onProgress,
    required Function() onSuccess,
    required Function(String error) onError,
  }) async {
    try {
      // Web平台不支持本地模型下载，但提供友好的提示
      if (kIsWeb) {
        onError('😊 温馨提示：Web网页版暂不支持离线AI模式\n\n💡 建议：\n• 下载手机APP版本使用离线功能\n• 或者连接网络使用在线AI助手');
        return false;
      }
      
      // 使用离线AI服务下载模型
      final success = await _offlineAI.downloadModel(
        modelType: modelType,
        onProgress: onProgress,
        onSuccess: () {
      _isModelLoaded = true;
      onSuccess();
        },
        onError: onError,
      );
      
      return success;
    } catch (e) {
      onError('下载模型失败: $e');
      return false;
    }
  }

  // 流式生成教案（实时输出）
  Stream<String> generateLessonPlanStream({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
    bool forceOffline = false,
  }) async* {
    try {
      // 检查是否强制使用离线模式
      if (forceOffline && _isModelLoaded) {
        // 离线模式暂时不支持流式输出，使用普通方式
        yield '🔄 使用离线AI生成教案...\n\n';
        final result = await _offlineAI.generateLessonPlan(
          subject: subject,
          grade: grade,
          topic: topic,
          requirements: requirements,
        );
        yield result;
        return;
      }
      
      // 检查网络连接，优先使用在线流式AI
      if (await _isOnlineAvailable()) {
        yield* _streamingAI.generateLessonPlanStream(
          subject: subject,
          grade: grade,
          topic: topic,
          requirements: requirements,
        );
      } else if (_isModelLoaded) {
        // 网络不可用时使用离线模型
        yield '📱 网络不可用，使用离线AI生成教案...\n\n';
        final result = await _offlineAI.generateLessonPlan(
          subject: subject,
          grade: grade,
          topic: topic,
          requirements: requirements,
        );
        yield result;
      } else {
        yield '😊 亲爱的老师，AI助手暂时无法工作\n\n💡 请您检查以下几点：\n1. 手机是否连接网络（WiFi或流量）\n2. 网络信号是否稳定\n\n如果网络正常但仍无法使用，请联系技术支持老师协助解决';
      }
    } catch (e) {
      debugPrint('流式生成教案失败: $e');
      yield '\n\n❌ 教案生成遇到问题：${e.toString()}\n\n💡 建议：\n1. 检查网络连接\n2. 稍后重试\n3. 或尝试重启应用';
    }
  }

  // 流式生成练习题
  Stream<String> generateExercisesStream({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
    bool forceOffline = false,
  }) async* {
    try {
      // 检查是否强制使用离线模式
      if (forceOffline && _isModelLoaded) {
        yield '🔄 使用离线AI生成练习题...\n\n';
        final result = await _offlineAI.generateExercises(
          subject: subject,
          grade: grade,
          topic: topic,
          difficulty: difficulty,
          count: count,
        );
        yield result;
        return;
      }
      
      // 检查网络连接，优先使用在线流式AI
      if (await _isOnlineAvailable()) {
        yield* _streamingAI.generateExercisesStream(
          subject: subject,
          grade: grade,
          topic: topic,
          difficulty: difficulty,
          count: count,
        );
      } else if (_isModelLoaded) {
        yield '📱 网络不可用，使用离线AI生成练习题...\n\n';
        final result = await _offlineAI.generateExercises(
          subject: subject,
          grade: grade,
          topic: topic,
          difficulty: difficulty,
          count: count,
        );
        yield result;
      } else {
        yield '😊 练习题生成需要网络连接，请检查网络后重试';
      }
    } catch (e) {
      debugPrint('流式生成练习题失败: $e');
      yield '\n\n❌ 练习题生成遇到问题，请稍后重试';
    }
  }

  // 生成教案（智能路由）- 保持向后兼容
  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
    String? requirements,
    bool forceOffline = false,
  }) async {
    try {
      // 严格模式选择：如果强制离线但模型未加载，直接返回错误
      if (forceOffline) {
        if (!_isModelLoaded) {
          throw Exception('💡 离线AI助手还没有准备好\n\n请选择：\n📥 点击"下载离线AI助手"按钮进行下载\n🌐 或者选择"在线模式"使用网络AI服务\n\n💡 提示：离线模式可在无网络环境下使用');
        }
        debugPrint('使用离线AI生成教案');
        return await _offlineAI.generateLessonPlan(
          subject: subject,
          grade: grade,
          topic: topic,
          requirements: requirements,
        );
      }
      
      // 在线模式：检查API密钥和网络连接
      final hasValidApiKey = EnvironmentConfig.areApiKeysConfigured;
      if (!hasValidApiKey) {
        if (_isModelLoaded) {
          // 有离线模型时提供选择
          debugPrint('没有API密钥配置，自动切换到离线AI生成教案');
          return await _offlineAI.generateLessonPlan(
            subject: subject,
            grade: grade,
            topic: topic,
            requirements: requirements,
          );
        } else {
          // 没有任何可用服务
          throw Exception('🔑 需要配置API密钥才能使用AI功能\n\n💡 推荐配置（按优先级排序）：\n\n🏆 DeepSeek（免费额度高）\n   • 官网：https://platform.deepseek.com/\n   • 免费额度：每月200万字符\n   • 付费：仅¥0.07/万字符\n\n🥈 通义千问（性能优秀）\n   • 官网：https://dashscope.aliyuncs.com/\n   • 阿里云出品，稳定可靠\n\n🥉 ChatGLM（免费额度）\n   • 官网：https://open.bigmodel.cn/\n   • 清华技术，教育友好\n\n👉 配置方法：\n1. 访问任一官网注册获取API密钥\n2. 在应用"个人中心"→"AI服务配置"中填入密钥\n3. 立即享受强大的AI教学助手功能！');
        }
      }
      
      // 检查网络连接
      if (await _isOnlineAvailable()) {
        debugPrint('使用在线AI生成教案');
        return await _onlineAI.generateLessonPlan(
          subject: subject,
          grade: grade,
          topic: topic,
          requirements: requirements,
        );
      } else {
        // 网络不可用时，如果有离线模型则使用，否则提示
        if (_isModelLoaded) {
          debugPrint('网络不可用，自动切换到离线AI生成教案');
          return await _offlineAI.generateLessonPlan(
            subject: subject,
            grade: grade,
            topic: topic,
            requirements: requirements,
          );
        } else {
          throw Exception('🌐 网络连接不可用\n\n💡 解决方案：\n\n1️⃣ 检查网络连接\n   • 确认WiFi或移动网络已连接\n   • 尝试打开浏览器访问网页测试\n   • 检查网络信号强度\n\n2️⃣ 使用离线AI助手\n   • 下载离线AI模型到本地\n   • 无需网络即可生成教案\n   • 前往"设置"→"离线AI模型"下载\n\n🔄 网络恢复后即可继续使用在线功能');
        }
      }
    } catch (e) {
      debugPrint('生成教案失败: $e');
      
      // 友好的错误处理
      String errorMessage = e.toString();
      if (errorMessage.contains('404')) {
        errorMessage = '🔧 API服务暂时不可用\n\n可能原因：\n• API服务提供商临时维护\n• API密钥配置错误\n• 服务地址变更\n\n💡 解决方案：\n1. 检查API密钥是否正确\n2. 稍后重试（可能是临时问题）\n3. 尝试切换到其他AI服务商\n4. 使用离线AI模式';
      } else if (errorMessage.contains('401')) {
        errorMessage = '🔑 API密钥验证失败\n\n可能原因：\n• API密钥错误或已过期\n• 账户状态异常\n• 权限不足\n\n💡 解决方案：\n1. 重新获取API密钥\n2. 检查账户状态是否正常\n3. 确认密钥格式正确\n4. 联系服务商技术支持';
      } else if (errorMessage.contains('403')) {
        errorMessage = '💰 账户余额不足或权限限制\n\n可能原因：\n• 免费额度已用完\n• 账户余额不足\n• API调用频率超限\n\n💡 解决方案：\n1. 充值账户余额\n2. 等待免费额度重置（通常每月重置）\n3. 降低使用频率\n4. 切换到其他服务商';
      } else if (errorMessage.contains('429')) {
        errorMessage = '⏱️ 请求过于频繁\n\n💡 解决方案：\n1. 稍等1-2分钟后重试\n2. 降低使用频率\n3. 如急需使用，可切换到其他AI服务商';
      }
      
      throw Exception(errorMessage);
    }
  }

  // 生成分层练习题
  Future<String> generateExercises({
    required String subject,
    required String grade,
    required String topic,
    required String difficulty,
    required int count,
    bool forceOffline = false,
  }) async {
    try {
      // 严格模式选择：如果强制离线但模型未加载，直接返回错误
      if (forceOffline) {
        if (!_isModelLoaded) {
          throw Exception('离线AI助手还没有下载到您的设备上\n\n请先下载离线AI助手，或者选择使用在线模式');
    }
        debugPrint('使用离线AI生成练习题');
        return await _offlineAI.generateExercises(
          subject: subject,
          grade: grade,
          topic: topic,
          difficulty: difficulty,
          count: count,
        );
      }
      
      // 在线模式：检查网络连接
      if (await _isOnlineAvailable()) {
        debugPrint('使用在线AI生成练习题');
        return await _onlineAI.generateExercises(
          subject: subject,
          grade: grade,
          topic: topic,
          difficulty: difficulty,
          count: count,
        );
      } else {
        // 网络不可用时，如果有离线模型则使用，否则提示
        if (_isModelLoaded) {
          debugPrint('网络不可用，自动切换到离线AI生成练习题');
          return await _offlineAI.generateExercises(
            subject: subject,
            grade: grade,
            topic: topic,
            difficulty: difficulty,
            count: count,
          );
        } else {
          throw Exception('网络连接不可用，且未安装离线AI助手\n\n请检查网络连接，或下载离线AI助手后重试');
        }
      }
    } catch (e) {
      debugPrint('生成练习题失败: $e');
      rethrow; // 直接重新抛出异常，让界面处理
    }
  }

  // OCR文本识别（使用增强服务）
  Future<String> recognizeText(String imagePath) async {
    try {
      if (kIsWeb) {
        // Web平台使用在线AI服务进行OCR识别
        if (await _isOnlineAvailable()) {
          debugPrint('Web平台使用在线AI进行OCR识别');
          return await _onlineAI.recognizeText(imagePath);
        } else {
          return '😊 请检查网络连接，需要联网才能识别文字';
        }
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
      return '😊 文字识别遇到困难，请确保图片清晰后重试';
    }
  }

  // 设置AI API密钥
  void setApiKey(String apiKey, {String provider = 'qianwen'}) {
    _onlineAI.setApiKey(apiKey, provider: provider);
  }
  
  // 获取AI服务状态
  Map<String, dynamic> getServiceStatus() {
    return {
      '在线服务': _onlineAI.getServiceStatus(),
      '离线服务': _offlineAI.getModelInfo(),
      '网络状态': _isOnlineAvailable().then((online) => online ? '已连接' : '未连接'),
    };
  }
  
  // 检查模型可用性
  Future<Map<String, bool>> checkModelsAvailability() async {
    if (kIsWeb) {
      return {'web': true}; // Web平台只支持在线服务
    }
    return await _offlineAI.checkModelsAvailability();
  }
  
  // 切换AI服务提供商
  void switchProvider(String provider) {
    _onlineAI.switchProvider(provider);
  }

  // 检查网络连接
  Future<bool> _isOnlineAvailable() async {
    try {
      final connectivityResult = await _connectivity.checkConnectivity();
      return connectivityResult != ConnectivityResult.none;
    } catch (e) {
      return false;
    }
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
    bool forceOffline = false,
  }) async {
    try {
      // 强制使用离线模式
      if (forceOffline && _isModelLoaded) {
        debugPrint('使用离线AI分析内容');
        return await _offlineAI.analyzeContent(
          content: content,
          analysisType: analysisType,
        );
      }
      
      // 检查网络连接，优先使用在线AI
      if (await _isOnlineAvailable()) {
        debugPrint('使用在线AI分析内容');
        return await _onlineAI.analyzeContent(
          content: content,
          analysisType: analysisType,
        );
      } else if (_isModelLoaded) {
        // 网络不可用时使用离线模型
        debugPrint('网络不可用，使用离线AI分析内容');
        return await _offlineAI.analyzeContent(
          content: content,
          analysisType: analysisType,
        );
      } else {
        return '😊 需要网络连接才能分析内容，请检查网络后重试';
      }
    } catch (e) {
      debugPrint('内容分析失败: $e');
      // 降级处理
      if (_isModelLoaded) {
        try {
          return await _offlineAI.analyzeContent(
            content: content,
            analysisType: analysisType,
          );
        } catch (offlineError) {
          debugPrint('离线分析也失败: $offlineError');
        }
      }
      return '😊 内容分析功能暂时不可用，请稍后重试';
    }
  }

  // 释放资源
  Future<void> dispose() async {
    await _ocrService.dispose();
    await _offlineAI.dispose();
  }
} 