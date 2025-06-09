// OCR服务的Web平台存根实现
// 在Web平台上，OCR功能不可用，提供基础的存根实现

import 'dart:typed_data';

class OCRBlock {
  final String text;
  final double confidence;
  final int index;
  final Map<String, dynamic> boundingBox;

  OCRBlock({
    required this.text,
    required this.confidence,
    required this.index,
    required this.boundingBox,
  });
}

class OCRResult {
  final List<OCRBlock> blocks;
  final String fullText;
  final double avgConfidence;
  final Map<String, dynamic> metadata;

  OCRResult({
    required this.blocks,
    required this.fullText,
    required this.avgConfidence,
    required this.metadata,
  });
}

class EnhancedOCRService {
  static final EnhancedOCRService _instance = EnhancedOCRService._internal();
  factory EnhancedOCRService() => _instance;
  EnhancedOCRService._internal();

  Future<OCRResult> recognizeFromBytes(Uint8List imageBytes) async {
    throw UnsupportedError('OCR功能在Web平台上不可用，请使用移动设备');
  }

  Future<OCRResult> recognizeFromPath(String imagePath) async {
    throw UnsupportedError('OCR功能在Web平台上不可用，请使用移动设备');
  }

  Future<String> recognizeText(dynamic imageSource) async {
    throw UnsupportedError('OCR功能在Web平台上不可用，请使用移动设备');
  }

  bool get isAvailable => false;
}

class EducationOCRService {
  static final EducationOCRService _instance = EducationOCRService._internal();
  factory EducationOCRService() => _instance;
  EducationOCRService._internal();

  Future<Map<String, dynamic>> analyzeStudentWork(dynamic imageSource) async {
    throw UnsupportedError('OCR功能在Web平台上不可用，请使用移动设备');
  }

  Future<String> recognizeEducationalContent(
    dynamic imageSource, {
    String subject = '通用',
  }) async {
    throw UnsupportedError('OCR功能在Web平台上不可用，请使用移动设备');
  }

  bool get isAvailable => false;
} 