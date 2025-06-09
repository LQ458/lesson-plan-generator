import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image/image.dart' as img;

class EnhancedOCRService {
  static final EnhancedOCRService _instance = EnhancedOCRService._internal();
  factory EnhancedOCRService() => _instance;
  EnhancedOCRService._internal();

  late final TextRecognizer _textRecognizer;
  late final TextRecognizer _chineseRecognizer;
  
  bool _isInitialized = false;

  // 初始化OCR服务
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      // 通用文本识别器
      _textRecognizer = TextRecognizer();
      
      // 中文专用识别器
      _chineseRecognizer = TextRecognizer(
        script: TextRecognitionScript.chinese,
      );
      
      _isInitialized = true;
      debugPrint('OCR服务初始化成功');
    } catch (e) {
      debugPrint('OCR服务初始化失败: $e');
      throw Exception('OCR服务初始化失败');
    }
  }

  // 智能文本识别（自动选择最佳策略）
  Future<OCRResult> recognizeText(String imagePath, {
    OCRMode mode = OCRMode.auto,
    bool preprocess = true,
  }) async {
    if (!_isInitialized) await initialize();
    
    try {
      // 图像预处理
      String processedImagePath = imagePath;
      if (preprocess) {
        processedImagePath = await _preprocessImage(imagePath);
      }
      
      final inputImage = InputImage.fromFilePath(processedImagePath);
      
      // 根据模式选择识别器
      TextRecognizer recognizer;
      switch (mode) {
        case OCRMode.chinese:
          recognizer = _chineseRecognizer;
          break;
        case OCRMode.general:
          recognizer = _textRecognizer;
          break;
        case OCRMode.auto:
        default:
          recognizer = await _detectLanguage(inputImage) == 'chinese' 
              ? _chineseRecognizer 
              : _textRecognizer;
          break;
      }
      
      final recognizedText = await recognizer.processImage(inputImage);
      
      return OCRResult(
        rawText: _extractRawText(recognizedText),
        formattedText: _formatText(recognizedText),
        confidence: _calculateConfidence(recognizedText),
        blocks: _extractBlocks(recognizedText),
        language: await _detectLanguage(inputImage),
      );
      
    } catch (e) {
      debugPrint('文本识别失败: $e');
      return OCRResult(
        rawText: '',
        formattedText: '识别失败：$e',
        confidence: 0.0,
        blocks: [],
        language: 'unknown',
      );
    }
  }

  // 专用：数学公式识别
  Future<String> recognizeMathFormula(String imagePath) async {
    final result = await recognizeText(imagePath, mode: OCRMode.general);
    return _processMathSymbols(result.rawText);
  }

  // 专用：手写体识别（学生作业）
  Future<OCRResult> recognizeHandwriting(String imagePath) async {
    // 手写体需要更强的预处理
    final processedPath = await _preprocessImageForHandwriting(imagePath);
    return await recognizeText(processedPath, mode: OCRMode.chinese);
  }

  // 专用：表格内容识别
  Future<List<List<String>>> recognizeTable(String imagePath) async {
    final result = await recognizeText(imagePath);
    return _parseTableStructure(result.blocks);
  }

  // 批量识别（多张图片）
  Future<List<OCRResult>> recognizeBatch(List<String> imagePaths) async {
    final results = <OCRResult>[];
    
    for (final path in imagePaths) {
      try {
        final result = await recognizeText(path);
        results.add(result);
      } catch (e) {
        results.add(OCRResult(
          rawText: '',
          formattedText: '批量识别失败：$e',
          confidence: 0.0,
          blocks: [],
          language: 'unknown',
        ));
      }
    }
    
    return results;
  }

  // 图像预处理
  Future<String> _preprocessImage(String imagePath) async {
    try {
      final originalFile = File(imagePath);
      final bytes = await originalFile.readAsBytes();
      final originalImage = img.decodeImage(bytes);
      
      if (originalImage == null) return imagePath;
      
      // 图像增强处理
      var processedImage = originalImage;
      
      // 1. 尺寸标准化
      if (processedImage.width > 2000 || processedImage.height > 2000) {
        processedImage = img.copyResize(
          processedImage,
          width: processedImage.width > processedImage.height ? 2000 : null,
          height: processedImage.height > processedImage.width ? 2000 : null,
        );
      }
      
      // 2. 去噪处理
      processedImage = img.gaussianBlur(processedImage, radius: 1);
      
      // 3. 对比度增强
      processedImage = img.contrast(processedImage, contrast: 1.2);
      
      // 4. 锐化处理（使用新的API）
      final kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      processedImage = img.convolution(processedImage, filter: kernel);
      
      // 保存处理后的图像
      final processedPath = imagePath.replaceAll('.', '_processed.');
      final processedFile = File(processedPath);
      await processedFile.writeAsBytes(img.encodeJpg(processedImage, quality: 95));
      
      return processedPath;
    } catch (e) {
      debugPrint('图像预处理失败: $e');
      return imagePath; // 返回原始路径
    }
  }

  // 手写体专用预处理
  Future<String> _preprocessImageForHandwriting(String imagePath) async {
    try {
      final originalFile = File(imagePath);
      final bytes = await originalFile.readAsBytes();
      final originalImage = img.decodeImage(bytes);
      
      if (originalImage == null) return imagePath;
      
      var processedImage = originalImage;
      
      // 手写体专用处理
      // 1. 二值化处理
      processedImage = img.grayscale(processedImage);
      
      // 2. 自适应阈值
      final threshold = _calculateAdaptiveThreshold(processedImage);
      for (int y = 0; y < processedImage.height; y++) {
        for (int x = 0; x < processedImage.width; x++) {
          final pixel = processedImage.getPixel(x, y);
          final gray = img.getLuminance(pixel);
          final newPixel = gray > threshold ? img.ColorRgb8(255, 255, 255) : img.ColorRgb8(0, 0, 0);
          processedImage.setPixel(x, y, newPixel);
        }
      }
      
      // 3. 形态学处理（去除细小噪点）
      processedImage = _morphologyOpen(processedImage);
      
      // 保存处理后的图像
      final processedPath = imagePath.replaceAll('.', '_handwriting.');
      final processedFile = File(processedPath);
      await processedFile.writeAsBytes(img.encodeJpg(processedImage, quality: 95));
      
      return processedPath;
    } catch (e) {
      debugPrint('手写体预处理失败: $e');
      return imagePath;
    }
  }

  // 语言检测
  Future<String> _detectLanguage(InputImage image) async {
    try {
      final result = await _textRecognizer.processImage(image);
      final text = _extractRawText(result);
      
      // 简单的中文检测
      final chineseCharCount = text.split('').where((char) {
        final code = char.codeUnitAt(0);
        return code >= 0x4e00 && code <= 0x9fff;
      }).length;
      
      final totalChars = text.replaceAll(' ', '').length;
      if (totalChars == 0) return 'unknown';
      
      final chineseRatio = chineseCharCount / totalChars;
      return chineseRatio > 0.3 ? 'chinese' : 'english';
    } catch (e) {
      return 'unknown';
    }
  }

  // 提取原始文本
  String _extractRawText(RecognizedText recognizedText) {
    final StringBuffer buffer = StringBuffer();
    for (TextBlock block in recognizedText.blocks) {
      for (TextLine line in block.lines) {
        buffer.writeln(line.text);
      }
    }
    return buffer.toString();
  }

  // 格式化文本
  String _formatText(RecognizedText recognizedText) {
    final lines = <String>[];
    
    for (TextBlock block in recognizedText.blocks) {
      final blockLines = <String>[];
      for (TextLine line in block.lines) {
        blockLines.add(_cleanupLine(line.text));
      }
      if (blockLines.isNotEmpty) {
        lines.add(blockLines.join('\n'));
      }
    }
    
    return lines.join('\n\n');
  }

  // 清理单行文本
  String _cleanupLine(String text) {
    return text
        .replaceAll(RegExp(r'\s+'), ' ') // 多余空格
        .replaceAll(RegExp(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\?\!\:\;\(\)\[\]\+\-\*\/\=]'), '') // 保留常用符号
        .trim();
  }

  // 计算识别置信度
  double _calculateConfidence(RecognizedText recognizedText) {
    if (recognizedText.blocks.isEmpty) return 0.0;
    
    double totalConfidence = 0.0;
    int elementCount = 0;
    
    for (TextBlock block in recognizedText.blocks) {
      for (TextLine line in block.lines) {
        for (TextElement element in line.elements) {
          // ML Kit没有直接提供置信度，这里用文本质量来估算
          final confidence = _estimateTextQuality(element.text);
          totalConfidence += confidence;
          elementCount++;
        }
      }
    }
    
    return elementCount > 0 ? totalConfidence / elementCount : 0.0;
  }

  // 估算文本质量
  double _estimateTextQuality(String text) {
    if (text.isEmpty) return 0.0;
    
    double quality = 1.0;
    
    // 长度惩罚（过短的文本可能是误识别）
    if (text.length < 2) quality *= 0.5;
    
    // 特殊字符惩罚
    final specialCharCount = text.split('').where((char) {
      return RegExp(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\?\!\:\;]').hasMatch(char);
    }).length;
    quality *= (1.0 - (specialCharCount / text.length) * 0.5);
    
    return quality.clamp(0.0, 1.0);
  }

  // 提取文本块信息
  List<OCRBlock> _extractBlocks(RecognizedText recognizedText) {
    final blocks = <OCRBlock>[];
    
    for (int i = 0; i < recognizedText.blocks.length; i++) {
      final block = recognizedText.blocks[i];
      final lines = <String>[];
      
      for (TextLine line in block.lines) {
        lines.add(line.text);
      }
      
      blocks.add(OCRBlock(
        index: i,
        text: lines.join('\n'),
        boundingBox: block.boundingBox,
        confidence: _estimateTextQuality(lines.join('')),
      ));
    }
    
    return blocks;
  }

  // 处理数学符号
  String _processMathSymbols(String text) {
    final mathSymbolMap = {
      '×': '*',
      '÷': '/',
      '≤': '<=',
      '≥': '>=',
      '≠': '!=',
      '±': '±',
      '√': 'sqrt',
      '∞': 'infinity',
      'π': 'pi',
      '∑': 'sum',
      '∫': 'integral',
    };
    
    var processedText = text;
    mathSymbolMap.forEach((symbol, replacement) {
      processedText = processedText.replaceAll(symbol, replacement);
    });
    
    return processedText;
  }

  // 解析表格结构
  List<List<String>> _parseTableStructure(List<OCRBlock> blocks) {
    final table = <List<String>>[];
    
    // 按Y坐标排序块（行）
    blocks.sort((a, b) => a.boundingBox.top.compareTo(b.boundingBox.top));
    
    final rows = <List<OCRBlock>>[];
    List<OCRBlock> currentRow = [];
    double lastY = -1;
    
    for (final block in blocks) {
      final currentY = block.boundingBox.top;
      
      if (lastY == -1 || (currentY - lastY).abs() < 50) {
        // 同一行
        currentRow.add(block);
      } else {
        // 新行
        if (currentRow.isNotEmpty) {
          rows.add(List.from(currentRow));
        }
        currentRow = [block];
      }
      lastY = currentY;
    }
    
    if (currentRow.isNotEmpty) {
      rows.add(currentRow);
    }
    
    // 为每行按X坐标排序（列）
    for (final row in rows) {
      row.sort((a, b) => a.boundingBox.left.compareTo(b.boundingBox.left));
      table.add(row.map((block) => block.text).toList());
    }
    
    return table;
  }

  // 自适应阈值计算
  int _calculateAdaptiveThreshold(img.Image image) {
    int sum = 0;
    int count = 0;
    
    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final pixel = image.getPixel(x, y);
        sum += img.getLuminance(pixel).round();
        count++;
      }
    }
    
    return count > 0 ? (sum / count).round() : 128;
  }

  // 形态学开运算（去噪）
  img.Image _morphologyOpen(img.Image image) {
    // 简化版形态学开运算
    final result = img.Image.from(image);
    
    // 腐蚀操作
    for (int y = 1; y < image.height - 1; y++) {
      for (int x = 1; x < image.width - 1; x++) {
        bool isBlack = false;
        for (int dy = -1; dy <= 1; dy++) {
          for (int dx = -1; dx <= 1; dx++) {
            final pixel = image.getPixel(x + dx, y + dy);
            if (img.getLuminance(pixel) < 128) {
              isBlack = true;
              break;
            }
          }
          if (isBlack) break;
        }
        
        if (!isBlack) {
          result.setPixel(x, y, img.ColorRgb8(255, 255, 255));
        }
      }
    }
    
    return result;
  }

  // 释放资源
  Future<void> dispose() async {
    if (_isInitialized) {
      await _textRecognizer.close();
      await _chineseRecognizer.close();
      _isInitialized = false;
    }
  }
}

// OCR模式枚举
enum OCRMode {
  auto,     // 自动检测
  chinese,  // 中文模式
  general,  // 通用模式
}

// OCR结果数据类
class OCRResult {
  final String rawText;
  final String formattedText;
  final double confidence;
  final List<OCRBlock> blocks;
  final String language;

  OCRResult({
    required this.rawText,
    required this.formattedText,
    required this.confidence,
    required this.blocks,
    required this.language,
  });
}

// OCR文本块数据类
class OCRBlock {
  final int index;
  final String text;
  final ui.Rect boundingBox;
  final double confidence;

  OCRBlock({
    required this.index,
    required this.text,
    required this.boundingBox,
    required this.confidence,
  });
} 