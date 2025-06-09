# AI 模块和 OCR 模块开发方案

## 📋 应用现状分析

### 当前架构优势

- ✅ Flutter 跨平台框架已搭建
- ✅ Hive 本地数据库支持离线存储
- ✅ 已实现离线模式切换功能
- ✅ 应用状态管理完善 (AppState)
- ✅ 已预留 AI 服务接口 (AIService)

### 技术约束

- 📱 目标设备：中低端 Android/iOS 设备
- 🌐 网络环境：可能不稳定
- 💾 存储限制：需考虑模型大小
- ⚡ 性能要求：快速响应，低功耗

## 🚀 AI 模块开发方案

### 方案一：混合架构（推荐）

#### 在线模式

```yaml
技术栈:
  - API服务: OpenAI API / 百度文心一言 / 阿里通义千问
  - 本地缓存: Hive数据库存储常用结果
  - 网络库: dio (已集成)
```

**优势:**

- 🔥 智能质量高，功能强大
- 📦 应用体积小（无需内置大模型）
- 🔄 模型更新无需应用更新
- 💰 按需计费，成本可控

#### 离线模式

```yaml
技术栈:
  - 本地模型: TensorFlow Lite / ONNX Runtime
  - 量化模型: INT8量化，2-4GB -> 500MB-1GB
  - 推理引擎: flutter_tflite / onnxruntime_flutter
```

**实现策略:**

```dart
class AIService {
  // 智能路由：优先在线，自动降级离线
  Future<String> generateContent({
    required String type,
    required Map<String, String> params,
  }) async {
    if (await _isOnlineModeAvailable()) {
      try {
        return await _generateOnline(type, params);
      } catch (e) {
        // 在线失败，自动切换离线
        return await _generateOffline(type, params);
      }
    } else {
      return await _generateOffline(type, params);
    }
  }
}
```

### 具体实现步骤

#### 第一阶段：在线 AI 集成

```bash
# 添加依赖
flutter pub add openai_dart http dio
```

```dart
// lib/services/online_ai_service.dart
class OnlineAIService {
  static const String _baseUrl = 'https://api.openai.com/v1';

  Future<String> generateLessonPlan({
    required String subject,
    required String grade,
    required String topic,
  }) async {
    final prompt = '''
你是一名资深的${subject}教师，请为${grade}年级学生设计一份关于"${topic}"的教案。
要求：
1. 包含教学目标、重难点、教学过程
2. 适合中国教育体系
3. 内容详实，可直接使用
4. 字数控制在800-1200字
''';

    return await _callAPI(prompt);
  }
}
```

#### 第二阶段：离线模型集成

```yaml
# pubspec.yaml 添加
dependencies:
  tflite_flutter: ^0.10.4
  flutter_tflite: ^1.1.2
```

```dart
// lib/services/offline_ai_service.dart
class OfflineAIService {
  Interpreter? _interpreter;

  Future<bool> loadModel() async {
    try {
      final modelPath = await _getModelPath();
      _interpreter = await Interpreter.fromAsset(modelPath);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<String> generateSimpleContent(String input) async {
    // 使用量化后的小模型进行推理
    // 生成相对简单但实用的内容
  }
}
```

## 🔍 OCR 模块开发方案

### 方案：多层级识别策略

#### 第一层：设备端 OCR（推荐首选）

```yaml
技术栈:
  - iOS: Vision Framework (原生)
  - Android: ML Kit Text Recognition (Google)
  - Flutter插件: google_mlkit_text_recognition (已集成)
```

**优势:**

- ⚡ 极快识别速度（本地处理）
- 🔒 隐私安全（数据不上传）
- 📱 针对移动端优化
- 🆓 完全免费使用

#### 第二层：云端 OCR（备用方案）

```yaml
备选服务:
  - 腾讯云OCR: 高精度中文识别
  - 百度OCR: 手写体支持好
  - 阿里云OCR: 表格识别强
```

### OCR 实现代码

```dart
// lib/services/ocr_service.dart
class OCRService {
  final TextRecognizer _textRecognizer = TextRecognizer();

  // 主要识别方法
  Future<String> recognizeText(String imagePath) async {
    try {
      final inputImage = InputImage.fromFilePath(imagePath);
      final recognizedText = await _textRecognizer.processImage(inputImage);

      return _formatRecognizedText(recognizedText);
    } catch (e) {
      // 本地识别失败，尝试云端识别
      return await _fallbackToCloudOCR(imagePath);
    }
  }

  // 文本后处理
  String _formatRecognizedText(RecognizedText recognizedText) {
    final StringBuffer buffer = StringBuffer();

    for (TextBlock block in recognizedText.blocks) {
      for (TextLine line in block.lines) {
        buffer.writeln(line.text);
      }
    }

    return _cleanupText(buffer.toString());
  }

  // 文本清理和校正
  String _cleanupText(String rawText) {
    return rawText
        .replaceAll(RegExp(r'\s+'), ' ')  // 多余空格
        .replaceAll(RegExp(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\?\!\:\;]'), '') // 特殊符号
        .trim();
  }
}
```

### 中文识别优化

```dart
// 专门针对中文教育内容的识别优化
class ChineseEduOCRService extends OCRService {
  // 数学公式识别
  Future<String> recognizeMathFormula(String imagePath) async {
    final baseText = await recognizeText(imagePath);
    return _processMathSymbols(baseText);
  }

  // 手写体识别（学生作业）
  Future<String> recognizeHandwriting(String imagePath) async {
    // 针对学生手写字体的特殊处理
    final textRecognizer = TextRecognizer(
      script: TextRecognitionScript.chinese
    );

    final inputImage = InputImage.fromFilePath(imagePath);
    final result = await textRecognizer.processImage(inputImage);

    return _enhanceHandwritingAccuracy(result);
  }
}
```

## 📦 部署和优化策略

### 模型管理

```dart
// lib/services/model_manager.dart
class ModelManager {
  static const Map<String, String> modelUrls = {
    'ai_model_quantized': 'https://your-cdn.com/models/ai_model_q8.tflite',
    'chinese_ocr_model': 'https://your-cdn.com/models/chinese_ocr.tflite',
  };

  Future<void> downloadModelsIfNeeded() async {
    for (final entry in modelUrls.entries) {
      if (!await _isModelCached(entry.key)) {
        await _downloadModel(entry.key, entry.value);
      }
    }
  }

  // 智能下载：WiFi环境 + 用户确认
  Future<bool> shouldDownloadModel() async {
    final connectivity = await Connectivity().checkConnectivity();
    return connectivity == ConnectivityResult.wifi &&
           await _getUserConsent();
  }
}
```

### 性能优化

```dart
// lib/services/performance_optimizer.dart
class PerformanceOptimizer {
  // 内存管理
  static void optimizeMemory() {
    // 定期清理缓存
    Timer.periodic(Duration(minutes: 10), (timer) {
      _clearUnusedCache();
    });
  }

  // 电池优化
  static void optimizeBattery() {
    // 限制后台处理
    // 使用低功耗模式
  }

  // 存储优化
  static Future<void> manageStorage() async {
    final usage = await _getStorageUsage();
    if (usage > 500 * 1024 * 1024) { // 500MB
      await _cleanupOldCache();
    }
  }
}
```

## 🎯 推荐实施路线图

### Phase 1: 基础 OCR (2-3 周)

1. ✅ 集成 google_mlkit_text_recognition
2. ✅ 实现图片文字识别
3. ✅ 添加中文优化处理
4. ✅ 集成到现有 UI

### Phase 2: 在线 AI (2-3 周)

1. ✅ 选择 AI 服务提供商（建议：通义千问）
2. ✅ 实现教案生成 API 调用
3. ✅ 添加错误处理和重试机制
4. ✅ 集成缓存策略

### Phase 3: 离线 AI (4-6 周)

1. ✅ 选择和训练量化模型
2. ✅ 集成 TensorFlow Lite
3. ✅ 实现模型下载管理
4. ✅ 添加离线生成功能

### Phase 4: 优化和测试 (2-3 周)

1. ✅ 性能调优
2. ✅ 用户体验优化
3. ✅ 多设备兼容性测试
4. ✅ 内存和电池优化

## 💰 成本预估

### 在线 AI 成本 (月)

- 中等使用量 (1000 次/月): ¥50-100
- 高使用量 (5000 次/月): ¥200-400

### 离线模型成本

- 一次性开发: ¥5000-15000
- CDN 存储: ¥50/月
- 无调用费用

### 总体建议

- 初期以在线为主，快速验证
- 逐步引入离线功能
- 用数据驱动优化决策

## 🛠️ 开发工具推荐

```bash
# 模型工具
pip install tensorflow tensorflow-lite-converter onnx

# 测试工具
flutter pub add integration_test
flutter pub add mockito

# 监控工具
flutter pub add firebase_crashlytics
flutter pub add firebase_performance
```

这个方案充分考虑了您的应用特点和用户需求，既保证了功能的先进性，又兼顾了性能和成本控制。建议从 Phase 1 开始逐步实施。
