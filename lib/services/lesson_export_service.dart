import 'dart:convert';
import 'dart:typed_data';
import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import '../models/lesson_plan.dart';
import '../models/lesson_export_format.dart';
import '../utils/app_theme.dart';

// PDF生成依赖
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

// PPT和压缩依赖
import 'package:archive/archive.dart';

// Web平台条件导入
import 'package:universal_html/html.dart' as universal_html show Blob, Url, AnchorElement;

// 专业PPT生成服务
import 'professional_ppt_service.dart';

class LessonExportService {
  // 导出教案
  static Future<ExportResult> exportLessonPlan(
    LessonPlan lesson,
    LessonExportConfig config,
  ) async {
    try {
      String content = '';
      String? previewData;
      String filename = '';

      switch (config.format) {
        case LessonExportFormat.pdf:
          final pdf = await _generatePDF(lesson);
          final bytes = await pdf.save();
          content = base64Encode(bytes);
          previewData = _generatePDFPreview(lesson);
          filename = '${lesson.title}_${_getTimestamp()}.pdf';
          break;
        case LessonExportFormat.ppt:
          // 尝试使用专业PPT生成，失败则使用备用方案
          try {
            final pptBytes = await ProfessionalPPTService.generateProfessionalPPT(lesson);
            content = base64Encode(pptBytes);
            previewData = _generatePPTPreview(lesson, isProfessional: true);
            filename = '${lesson.title}_${_getTimestamp()}.pptx';
          } catch (e) {
            print('专业PPT生成失败，使用备用方案: $e');
            final pptBytes = await _generateRealPPT(lesson);
            content = base64Encode(pptBytes);
            previewData = _generatePPTPreview(lesson);
            filename = '${lesson.title}_${_getTimestamp()}.pptx';
          }
          break;
        case LessonExportFormat.mindMapImage:
          final imageBytes = await _generateRealMindMapImage(lesson);
          content = base64Encode(imageBytes);
          previewData = _generateMindMapPreview(lesson);
          filename = '${lesson.title}_思维导图_${_getTimestamp()}.png';
          break;
        case LessonExportFormat.outlineImage:
          final imageBytes = await _generateRealOutlineImage(lesson);
          content = base64Encode(imageBytes);
          previewData = _generateOutlinePreview(lesson);
          filename = '${lesson.title}_大纲_${_getTimestamp()}.png';
          break;
      }

      final result = ExportResult(
        format: config.format,
        content: content,
        filename: filename,
        previewData: previewData,
      );

      // Web平台自动下载
      if (kIsWeb) {
        await _downloadOnWeb(result, config.format);
      }

      return result;
    } catch (e) {
      print('LessonExportService: 导出失败 - $e');
      rethrow;
    }
  }

  // 生成PDF文档
  static Future<pw.Document> _generatePDF(LessonPlan lesson) async {
    final pdf = pw.Document();
    
    // 尝试加载中文字体，如果失败则使用默认字体
    pw.Font? fontData;
    pw.Font? boldFontData;
    
    try {
      fontData = await PdfGoogleFonts.notoSansSCRegular();
      boldFontData = await PdfGoogleFonts.notoSansSCBold();
    } catch (e) {
      print('LessonExportService: 无法加载中文字体，使用默认字体 - $e');
      // 使用默认字体
      fontData = null;
      boldFontData = null;
    }
    
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        maxPages: 10, // 允许多页
        build: (pw.Context context) {
          return [
            // 标题
            pw.Container(
              alignment: pw.Alignment.center,
              margin: const pw.EdgeInsets.only(bottom: 30),
              child: pw.Text(
                lesson.title,
                style: _createTextStyle(24, bold: true, font: boldFontData),
              ),
            ),

            // 基本信息
            pw.Container(
              padding: const pw.EdgeInsets.all(15),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey300),
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('基本信息', style: _createTextStyle(16, bold: true, font: boldFontData)),
                  pw.SizedBox(height: 10),
                  pw.Row(
                    children: [
                      pw.Expanded(child: pw.Text('学科: ${lesson.subject}', style: _createTextStyle(12, font: fontData))),
                      pw.Expanded(child: pw.Text('年级: ${lesson.grade}', style: _createTextStyle(12, font: fontData))),
                      pw.Expanded(child: pw.Text('课时: ${lesson.duration}', style: _createTextStyle(12, font: fontData))),
                    ],
                  ),
                ],
              ),
            ),

            pw.SizedBox(height: 20),

            // 教学目标
            pw.Text('教学目标', style: _createTextStyle(16, bold: true, font: boldFontData)),
            pw.SizedBox(height: 10),
            ..._buildTextParagraphs(_cleanMarkdownText(lesson.objectives), fontData),

            pw.SizedBox(height: 20),

            // 教学内容
            pw.Text('教学内容', style: _createTextStyle(16, bold: true, font: boldFontData)),
            pw.SizedBox(height: 10),
            ..._buildTextParagraphs(_cleanMarkdownText(lesson.content), fontData),

            pw.SizedBox(height: 20),

            // 教学方法
            pw.Text('教学方法', style: _createTextStyle(16, bold: true, font: boldFontData)),
            pw.SizedBox(height: 10),
            ..._buildTextParagraphs(_cleanMarkdownText(lesson.methods), fontData),

            pw.SizedBox(height: 20),

            // 教学评估
            pw.Text('教学评估', style: _createTextStyle(16, bold: true, font: boldFontData)),
            pw.SizedBox(height: 10),
            ..._buildTextParagraphs(_cleanMarkdownText(lesson.assessment), fontData),
          ];
        },
      ),
    );

    return pdf;
  }

  // 生成真正的PPT文件
  static Future<Uint8List> _generateRealPPT(LessonPlan lesson) async {
    // 创建PPTX文件结构
    final archive = Archive();
    
    // 添加必要的PPTX文件结构
    _addPPTXStructure(archive, lesson);
    
    // 将Archive转换为字节
    final encodedArchive = ZipEncoder().encode(archive);
    return Uint8List.fromList(encodedArchive!);
  }
  
  // 添加PPTX文件结构
  static void _addPPTXStructure(Archive archive, LessonPlan lesson) {
    // [Content_Types].xml
    archive.addFile(ArchiveFile('[Content_Types].xml', 0, _getContentTypesXml()));
    
    // _rels/.rels
    archive.addFile(ArchiveFile('_rels/.rels', 0, _getRelsXml()));
    
    // ppt/presentation.xml
    archive.addFile(ArchiveFile('ppt/presentation.xml', 0, _getPresentationXml()));
    
    // ppt/_rels/presentation.xml.rels
    archive.addFile(ArchiveFile('ppt/_rels/presentation.xml.rels', 0, _getPresentationRelsXml()));
    
    // 幻灯片文件
    for (int i = 1; i <= 5; i++) {
      archive.addFile(ArchiveFile('ppt/slides/slide$i.xml', 0, _getSlideXml(i, lesson)));
      archive.addFile(ArchiveFile('ppt/slides/_rels/slide$i.xml.rels', 0, _getSlideRelsXml(i)));
    }
    
    // 布局和主题文件
    archive.addFile(ArchiveFile('ppt/slideLayouts/slideLayout1.xml', 0, _getSlideLayoutXml()));
    archive.addFile(ArchiveFile('ppt/slideMasters/slideMaster1.xml', 0, _getSlideMasterXml()));
    archive.addFile(ArchiveFile('ppt/theme/theme1.xml', 0, _getThemeXml()));
  }

  // 生成真正的思维导图图片
  static Future<Uint8List> _generateRealMindMapImage(LessonPlan lesson) async {
    // 4K超高分辨率设置 - 对应450 DPI，确保极高清晰度
    const width = 4000.0;  
    const height = 2600.0; 
    
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint();
    
    // 渐变背景
    final gradient = ui.Gradient.linear(
      const Offset(0, 0),
      Offset(width, height),
      [Colors.blue.shade50, Colors.green.shade50],
    );
    paint.shader = gradient;
    canvas.drawRect(Rect.fromLTWH(0, 0, width, height), paint);
    
    // 中心主题 - 超大的节点和字体
    _drawMindMapNode(canvas, width / 2, height / 2, lesson.title, 
                     Colors.blue.shade600, 350, 180, true, 48); // 增加到48px
    
    // 主要分支信息
    final mainBranches = _extractMindMapData(lesson);
    
    // 增加分支间距，确保完美布局
    final branchRadius = 450.0; // 增加分支距离
    final subBranchRadius = 250.0; // 增加子分支距离
    
    for (int i = 0; i < mainBranches.length; i++) {
      final branch = mainBranches[i];
      final angle = i * (2 * math.pi / mainBranches.length);
      final mainX = width / 2 + branchRadius * math.cos(angle);
      final mainY = height / 2 + branchRadius * math.sin(angle);
      
      // 绘制主分支连接线 - 更粗的渐变线条
      paint.shader = ui.Gradient.linear(
        Offset(width / 2, height / 2),
        Offset(mainX, mainY),
        [Colors.white.withOpacity(0.8), branch['color'] as Color],
      );
      paint.strokeWidth = 15; // 增加线条粗细
      paint.style = PaintingStyle.stroke;
      canvas.drawLine(
        Offset(width / 2, height / 2),
        Offset(mainX, mainY),
        paint,
      );
      
      // 绘制主分支节点 - 超大的节点和字体
      _drawMindMapNode(canvas, mainX, mainY, branch['title'] as String,
                       branch['color'] as Color, 280, 120, false, 36); // 增加到36px
      
      // 绘制子分支
      final subBranches = branch['subBranches'] as List<String>;
      for (int j = 0; j < subBranches.length; j++) {
        final subAngle = angle + (j - (subBranches.length - 1) / 2) * 0.35;
        final subX = mainX + subBranchRadius * math.cos(subAngle);
        final subY = mainY + subBranchRadius * math.sin(subAngle);
        
        // 绘制子分支连接线 - 渐变效果
        paint.shader = ui.Gradient.linear(
          Offset(mainX, mainY),
          Offset(subX, subY),
          [(branch['color'] as Color).withOpacity(0.8), (branch['color'] as Color).withOpacity(0.4)],
        );
        paint.strokeWidth = 8; // 增加子分支线条粗细
        canvas.drawLine(
          Offset(mainX, mainY),
          Offset(subX, subY),
          paint,
        );
        
        // 绘制子分支节点 - 大幅增大字体
        _drawMindMapNode(canvas, subX, subY, subBranches[j],
                         (branch['color'] as Color).withOpacity(0.9), 200, 80, false, 28); // 增加到28px
      }
    }
    
    // 添加课程基本信息 - 增大信息框
    _drawInfoBox(canvas, lesson);
    
    final picture = recorder.endRecording();
    final image = await picture.toImage(width.toInt(), height.toInt());
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }
  
  // 提取思维导图数据
  static List<Map<String, dynamic>> _extractMindMapData(LessonPlan lesson) {
    return [
      {
        'title': '教学目标',
        'color': Colors.green,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.objectives), 3),
      },
      {
        'title': '教学内容',
        'color': Colors.orange,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.content), 4),
      },
      {
        'title': '教学方法',
        'color': Colors.purple,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.methods), 3),
      },
      {
        'title': '教学评估',
        'color': Colors.red,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.assessment), 3),
      },
      {
        'title': '课程信息',
        'color': Colors.teal,
        'subBranches': [lesson.subject, lesson.grade, lesson.duration],
      },
    ];
  }
  
  // 提取关键点
  static List<String> _extractKeyPoints(String text, int maxPoints) {
    if (text.isEmpty) return ['暂无内容'];
    
    // 按句号、分号、换行符分割
    final sentences = text.split(RegExp(r'[。；\n]'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty && s.length > 2)
        .toList();
    
    final keyPoints = <String>[];
    
    // 优先提取包含关键词的句子
    final keywords = ['目标', '重点', '难点', '方法', '评估', '掌握', '理解', '培养', '提高'];
    for (final sentence in sentences) {
      if (keyPoints.length >= maxPoints) break;
      if (keywords.any((keyword) => sentence.contains(keyword))) {
        keyPoints.add(_truncateText(sentence, 12));
      }
    }
    
    // 如果关键点不够，补充其他句子
    for (final sentence in sentences) {
      if (keyPoints.length >= maxPoints) break;
      final truncated = _truncateText(sentence, 12);
      if (!keyPoints.contains(truncated)) {
        keyPoints.add(truncated);
      }
    }
    
    return keyPoints.isEmpty ? ['暂无内容'] : keyPoints;
  }
  
  // 截断文本
  static String _truncateText(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return '${text.substring(0, maxLength)}...';
  }
  
  // 绘制信息框 - 超大尺寸和字体，现代化设计
  static void _drawInfoBox(Canvas canvas, LessonPlan lesson) {
    final paint = Paint()..style = PaintingStyle.fill;
    
    final rect = Rect.fromLTWH(60, 60, 600, 280); // 超大信息框
    
    // 绘制多层阴影，营造深度感
    for (int i = 4; i >= 1; i--) {
      paint.color = Colors.black.withOpacity(0.08 * i);
      final shadowRect = Rect.fromLTWH(60 + i * 3.0, 60 + i * 3.0, 600, 280);
      canvas.drawRRect(
        RRect.fromRectAndRadius(shadowRect, const Radius.circular(20)),
        paint,
      );
    }
    
    // 绘制渐变背景
    final gradient = ui.Gradient.linear(
      Offset(rect.left, rect.top),
      Offset(rect.right, rect.bottom),
      [
        Colors.white,
        Colors.blue.shade50,
      ],
    );
    paint.shader = gradient;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(20)),
      paint,
    );
    
    // 绘制高光边框
    paint.shader = null;
    paint.color = Colors.white.withOpacity(0.8);
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = 3;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(20)),
      paint,
    );
    
    // 绘制主边框
    paint.color = Colors.blue.shade200;
    paint.strokeWidth = 2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(20)),
      paint,
    );
    
    // 绘制文本信息 - 居中对齐
    final textPainter = TextPainter(
      text: TextSpan(
        children: [
          TextSpan(
            text: '📚 课程信息\n\n',
            style: TextStyle(
              fontSize: 36, // 大幅增加
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade800,
              shadows: [
                Shadow(
                  offset: const Offset(1, 1),
                  blurRadius: 2,
                  color: Colors.black.withOpacity(0.2),
                ),
              ],
            ),
          ),
          TextSpan(
            text: '学科：${lesson.subject}\n',
            style: const TextStyle(
              fontSize: 30, // 大幅增加
              color: Colors.black87,
              height: 1.6,
              fontWeight: FontWeight.w500,
            ),
          ),
          TextSpan(
            text: '年级：${lesson.grade}\n',
            style: const TextStyle(
              fontSize: 30, // 大幅增加
              color: Colors.black87,
              height: 1.6,
              fontWeight: FontWeight.w500,
            ),
          ),
          TextSpan(
            text: '课时：${lesson.duration}',
            style: const TextStyle(
              fontSize: 30, // 大幅增加
              color: Colors.black87,
              height: 1.6,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );
    textPainter.layout(maxWidth: 540);
    
    // 文本居中绘制
    textPainter.paint(
      canvas,
      Offset(
        rect.left + (rect.width - textPainter.width) / 2,
        rect.top + 30,
      ),
    );
  }
  
  // 绘制思维导图节点 - 优化尺寸和字体，完美居中
  static void _drawMindMapNode(Canvas canvas, double x, double y, String text,
                               Color color, double width, double height, bool isCenter, double fontSize) {
    final paint = Paint()..style = PaintingStyle.fill;
    
    // 创建居中对齐的文本画笔
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: isCenter ? FontWeight.bold : FontWeight.w600,
          color: Colors.white,
          shadows: [
            Shadow(
              offset: const Offset(2, 2),
              blurRadius: 4,
              color: Colors.black.withOpacity(0.4),
            ),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );
    
    textPainter.layout(maxWidth: width - 30);
    
    // 根据文本智能调整节点大小
    final nodeHeight = math.max(height, textPainter.height + 40);
    final nodeWidth = math.max(width, textPainter.width + 40);
    
    final rect = Rect.fromCenter(
      center: Offset(x, y),
      width: nodeWidth,
      height: nodeHeight,
    );
    
    // 绘制多层阴影，增强立体感
    for (int i = 3; i >= 1; i--) {
      paint.color = Colors.black.withOpacity(0.1 * i);
      final shadowRect = Rect.fromCenter(
        center: Offset(x + i * 2.0, y + i * 2.0),
        width: nodeWidth,
        height: nodeHeight,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(shadowRect, Radius.circular(isCenter ? 25 : 18)),
        paint,
      );
    }
    
    // 绘制节点渐变背景 - 双色渐变效果
    final gradient = ui.Gradient.radial(
      Offset(x - nodeWidth * 0.2, y - nodeHeight * 0.2),
      nodeWidth * 0.8,
      [
        Colors.white.withOpacity(0.3),
        color,
      ],
    );
    paint.shader = gradient;
    paint.style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(isCenter ? 25 : 18)),
      paint,
    );
    
    // 绘制高光边框
    paint.shader = null;
    paint.color = Colors.white.withOpacity(0.6);
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = isCenter ? 6 : 3;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(isCenter ? 25 : 18)),
      paint,
    );
    
    // 绘制主边框
    paint.color = color.withOpacity(0.9);
    paint.strokeWidth = isCenter ? 4 : 2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(isCenter ? 25 : 18)),
      paint,
    );
    
    // 绘制文本 - 完美居中对齐
    textPainter.paint(
      canvas, 
      Offset(
        x - textPainter.width / 2,
        y - textPainter.height / 2,
      ),
    );
  }
  
  // 生成真正的大纲图片
  static Future<Uint8List> _generateRealOutlineImage(LessonPlan lesson) async {
    // 4K超高分辨率设置 - 对应450 DPI，确保极高清晰度
    const width = 2800.0;  
    const height = 3600.0; 
    
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint();
    
    // 渐变背景 - 纸质感背景
    final gradient = ui.Gradient.linear(
      const Offset(0, 0),
      Offset(width, height),
      [
        Colors.grey.shade50,
        Colors.blue.shade50,
      ],
    );
    paint.shader = gradient;
    canvas.drawRect(Rect.fromLTWH(0, 0, width, height), paint);
    
    // 添加微妙的纹理背景
    paint.shader = null;
    paint.color = Colors.grey.shade100;
    for (int i = 0; i < 50; i++) {
      final x = (i * 56.0) % width;
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, height),
        Paint()..color = Colors.grey.shade200..strokeWidth = 0.5,
      );
    }
    
    double currentY = 80;
    
    // 标题 - 超大字体
    currentY = _drawOutlineSection(canvas, lesson.title, '', currentY, 
                                   Colors.blue, 48, true, width); // 增加到48px
    
    // 基本信息 - 大幅增大字体
    currentY += 50;
    currentY = _drawOutlineSection(canvas, '📚 课程信息', 
                                   '学科：${lesson.subject}\n年级：${lesson.grade}\n课时：${lesson.duration}', 
                                   currentY, Colors.grey.shade700, 36, false, width); // 增加到36px
    
    // 教学目标 - 大幅增大字体
    currentY += 50;
    currentY = _drawOutlineSection(canvas, '🎯 教学目标', _cleanMarkdownText(lesson.objectives), 
                                   currentY, Colors.green, 38, false, width); // 增加到38px
    
    // 教学内容 - 大幅增大字体
    currentY += 50;
    currentY = _drawOutlineSection(canvas, '📖 教学内容', _cleanMarkdownText(lesson.content), 
                                   currentY, Colors.orange, 38, false, width); // 增加到38px
    
    // 教学方法 - 大幅增大字体
    currentY += 50;
    currentY = _drawOutlineSection(canvas, '🔧 教学方法', _cleanMarkdownText(lesson.methods), 
                                   currentY, Colors.purple, 38, false, width); // 增加到38px
    
    // 教学评估 - 大幅增大字体
    currentY += 50;
    currentY = _drawOutlineSection(canvas, '📊 教学评估', _cleanMarkdownText(lesson.assessment), 
                                   currentY, Colors.red, 38, false, width); // 增加到38px
    
    final picture = recorder.endRecording();
    final image = await picture.toImage(width.toInt(), height.toInt());
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }
  
  // 绘制大纲部分 - 优化字体和布局，完美居中
  static double _drawOutlineSection(Canvas canvas, String title, String content,
                                    double startY, Color color, double fontSize, bool isTitle, double canvasWidth) {
    double currentY = startY;
    final leftMargin = 80.0;
    final rightMargin = 80.0;
    final contentWidth = canvasWidth - leftMargin - rightMargin;
    
    // 绘制装饰性标题背景
    if (!isTitle) {
      final paint = Paint()
        ..shader = ui.Gradient.linear(
          Offset(leftMargin, currentY - 10),
          Offset(canvasWidth - rightMargin, currentY + fontSize + 30),
          [color.withOpacity(0.15), color.withOpacity(0.05)],
        )
        ..style = PaintingStyle.fill;
      final rect = Rect.fromLTWH(leftMargin, currentY - 10, contentWidth, fontSize + 40);
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(15)),
        paint,
      );
      
      // 绘制左侧装饰条
      paint.shader = null;
      paint.color = color;
      final decorRect = Rect.fromLTWH(leftMargin, currentY - 10, 8, fontSize + 40);
      canvas.drawRRect(
        RRect.fromRectAndRadius(decorRect, const Radius.circular(4)),
        paint,
      );
    }
    
    // 绘制标题 - 居中或左对齐
    final titlePainter = TextPainter(
      text: TextSpan(
        text: title,
        style: TextStyle(
          color: color,
          fontSize: isTitle ? fontSize + 16 : fontSize + 8, // 大幅增大字体
          fontWeight: FontWeight.bold,
          shadows: [
            Shadow(
              offset: const Offset(2, 2),
              blurRadius: 4,
              color: Colors.black.withOpacity(isTitle ? 0.3 : 0.2),
            ),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: isTitle ? TextAlign.center : TextAlign.left,
    );
    titlePainter.layout(maxWidth: contentWidth - 40);
    
    // 标题居中绘制
    if (isTitle) {
      titlePainter.paint(canvas, Offset(
        leftMargin + (contentWidth - titlePainter.width) / 2,
        currentY,
      ));
    } else {
      titlePainter.paint(canvas, Offset(leftMargin + 20, currentY));
    }
    
    currentY += titlePainter.height + (isTitle ? 50 : 30);
    
    // 绘制内容（如果有）
    if (content.isNotEmpty && !isTitle) {
      // 将内容分段处理
      final paragraphs = content.split('\n').where((p) => p.trim().isNotEmpty).toList();
      
      for (int i = 0; i < paragraphs.length; i++) {
        final paragraph = paragraphs[i];
        final contentPainter = TextPainter(
          text: TextSpan(
            text: '• $paragraph', // 添加美观项目符号
            style: TextStyle(
              color: Colors.black87,
              fontSize: fontSize + 4, // 内容字体也要增大
              height: 1.8, // 增加行高提升可读性
              fontWeight: FontWeight.w500,
            ),
          ),
          textDirection: TextDirection.ltr,
        );
        contentPainter.layout(maxWidth: contentWidth - 80);
        
        // 内容左对齐，适当缩进
        contentPainter.paint(canvas, Offset(leftMargin + 40, currentY));
        currentY += contentPainter.height + 20;
      }
      
      currentY += 30; // 段落间距
    }
    
    return currentY;
  }

  // 公开的下载方法
  static Future<void> downloadExportResult(ExportResult exportResult) async {
    if (kIsWeb) {
      await _downloadOnWeb(exportResult, exportResult.format);
    }
  }

  // Web平台下载
  static Future<void> _downloadOnWeb(ExportResult exportResult, LessonExportFormat format) async {
    if (!kIsWeb) return;

    try {
      Uint8List bytes;
      String mimeType;

      switch (format) {
        case LessonExportFormat.pdf:
          bytes = base64Decode(exportResult.content);
          mimeType = 'application/pdf';
          break;
        case LessonExportFormat.ppt:
          bytes = base64Decode(exportResult.content);
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;
        case LessonExportFormat.mindMapImage:
        case LessonExportFormat.outlineImage:
          bytes = base64Decode(exportResult.content);
          mimeType = 'image/png';
          break;
      }

      final blob = universal_html.Blob([bytes], mimeType);
      final url = universal_html.Url.createObjectUrl(blob);
      final anchor = universal_html.AnchorElement(href: url)
        ..setAttribute('download', exportResult.filename)
        ..click();
      
      universal_html.Url.revokeObjectUrl(url);
      
      print('LessonExportService: 文件下载成功 - ${exportResult.filename}');
    } catch (e) {
      print('LessonExportService: Web下载失败 - $e');
      rethrow;
    }
  }

  // 生成预览数据
  static String _generatePDFPreview(LessonPlan lesson) {
    return jsonEncode({
      'title': lesson.title,
      'pageCount': 1,
      'sections': ['基本信息', '教学目标', '教学内容', '教学方法', '教学评估'],
    });
  }

  static String _generatePPTPreview(LessonPlan lesson, {bool isProfessional = false}) {
    if (isProfessional) {
      return jsonEncode({
        'title': lesson.title,
        'totalSlides': 7,
        'template': '专业模板',
        'format': '16:9宽屏',
        'hasMore': false,
        'slides': [
          {'title': '标题页', 'content': '${lesson.title} - ${lesson.subject}'},
          {'title': '课程概览', 'content': '学科：${lesson.subject} 年级：${lesson.grade} 课时：${lesson.duration}'},
          {'title': '教学目标', 'content': _cleanMarkdownText(lesson.objectives).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.objectives).length))},
          {'title': '教学内容', 'content': _cleanMarkdownText(lesson.content).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.content).length))},
          {'title': '教学方法', 'content': _cleanMarkdownText(lesson.methods).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.methods).length))},
          {'title': '教学评估', 'content': _cleanMarkdownText(lesson.assessment).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.assessment).length))},
          {'title': '总结页', 'content': '感谢聆听，期待精彩互动！'},
        ],
      });
    } else {
      return jsonEncode({
        'title': lesson.title,
        'totalSlides': 5,
        'hasMore': false,
        'slides': [
          {'title': '课程信息', 'content': '学科：${lesson.subject} 年级：${lesson.grade} 课时：${lesson.duration}'},
          {'title': '教学目标', 'content': _cleanMarkdownText(lesson.objectives).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.objectives).length))},
          {'title': '教学内容', 'content': _cleanMarkdownText(lesson.content).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.content).length))},
          {'title': '教学方法', 'content': _cleanMarkdownText(lesson.methods).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.methods).length))},
          {'title': '教学评估', 'content': _cleanMarkdownText(lesson.assessment).substring(0, math.min<int>(100, _cleanMarkdownText(lesson.assessment).length))},
        ],
      });
    }
  }

  static String _generateMindMapPreview(LessonPlan lesson) {
    return jsonEncode({
      'centerNode': lesson.topic,
      'mainBranches': [
        {'text': '教学目标', 'children': 3},
        {'text': '教学内容', 'children': 4},
        {'text': '教学方法', 'children': 2},
        {'text': '教学评估', 'children': 2},
      ],
      'totalNodes': 12,
    });
  }

  static String _generateOutlinePreview(LessonPlan lesson) {
    return jsonEncode({
      'title': lesson.title,
      'levels': [
        {'level': 1, 'text': '课程基本信息', 'items': 3},
        {'level': 1, 'text': '教学目标', 'items': 3},
        {'level': 1, 'text': '教学内容', 'items': 4},
        {'level': 1, 'text': '教学方法', 'items': 2},
        {'level': 1, 'text': '教学评估', 'items': 2},
      ],
    });
  }

  // 创建文本样式（处理字体为null的情况）
  static pw.TextStyle _createTextStyle(double fontSize, {bool bold = false, pw.Font? font}) {
    return pw.TextStyle(
      fontSize: fontSize,
      fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
      font: font,
    );
  }

  // 将长文本分段处理，避免单页内容过多
  static List<pw.Widget> _buildTextParagraphs(String text, pw.Font? font) {
    final paragraphs = text.split('\n').where((p) => p.trim().isNotEmpty).toList();
    final widgets = <pw.Widget>[];
    
    for (int i = 0; i < paragraphs.length; i++) {
      widgets.add(pw.Text(paragraphs[i], style: _createTextStyle(12, font: font)));
      if (i < paragraphs.length - 1) {
        widgets.add(pw.SizedBox(height: 8));
      }
    }
    
    return widgets;
  }

  // 清理Markdown格式文本
  static String _cleanMarkdownText(String text) {
    if (text.isEmpty) return text;
    
    return text
        // 移除粗体标记
        .replaceAll(RegExp(r'\*\*(.*?)\*\*'), r'$1')
        // 移除斜体标记
        .replaceAll(RegExp(r'\*(.*?)\*'), r'$1')
        // 移除代码块标记
        .replaceAll(RegExp(r'```.*?```', dotAll: true), '')
        // 移除行内代码标记
        .replaceAll(RegExp(r'`([^`]+)`'), r'$1')
        // 移除链接标记
        .replaceAll(RegExp(r'\[([^\]]+)\]\([^\)]+\)'), r'$1')
        // 移除标题标记
        .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
        // 移除列表标记
        .replaceAll(RegExp(r'^\s*[-*+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*\d+\.\s+', multiLine: true), '')
        // 移除引用标记
        .replaceAll(RegExp(r'^\s*>\s+', multiLine: true), '')
        // 移除特殊字符如 $1, $2 等
        .replaceAll(RegExp(r'\$\d+'), '')
        // 清理多余的空行
        .replaceAll(RegExp(r'\n\s*\n'), '\n')
        .trim();
  }

  // XML文本转义函数
  static String _escapeXmlText(String text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
        .replaceAll('\$', '&#36;')  // 转义美元符号
        .replaceAll('\n', ' ')  // 将换行符替换为空格
        .replaceAll(RegExp(r'\\n'), ' ');  // 移除反斜杠n字符
  }

  // 获取时间戳
  static String _getTimestamp() {
    final now = DateTime.now();
    return '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}_${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}';
  }

  // 获取可用模板
  static List<LessonTemplate> getAvailableTemplates(LessonExportFormat format) {
    return LessonTemplate.defaultTemplates
        .where((template) => template.supportedFormat == format)
        .toList();
  }
  
  // PPT XML文件生成方法
  static List<int> _getContentTypesXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
</Types>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getRelsXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getPresentationXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" 
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
    <p:sldId id="257" r:id="rId3"/>
    <p:sldId id="258" r:id="rId4"/>
    <p:sldId id="259" r:id="rId5"/>
    <p:sldId id="260" r:id="rId6"/>
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle>
    <a:defPPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:defRPr lang="zh-CN"/>
    </a:defPPr>
  </p:defaultTextStyle>
</p:presentation>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getPresentationRelsXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/>
</Relationships>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideXml(int slideNumber, LessonPlan lesson) {
    String title = '';
    String content = '';
    
    switch (slideNumber) {
      case 1:
        title = _escapeXmlText(lesson.title);
        content = _escapeXmlText('学科：${lesson.subject} 年级：${lesson.grade} 课时：${lesson.duration}');
        break;
      case 2:
        title = _escapeXmlText('教学目标');
        content = _escapeXmlText(_cleanMarkdownText(lesson.objectives));
        break;
      case 3:
        title = _escapeXmlText('教学内容');
        content = _escapeXmlText(_cleanMarkdownText(lesson.content));
        break;
      case 4:
        title = _escapeXmlText('教学方法');
        content = _escapeXmlText(_cleanMarkdownText(lesson.methods));
        break;
      case 5:
        title = _escapeXmlText('教学评估');
        content = _escapeXmlText(_cleanMarkdownText(lesson.assessment));
        break;
    }
    
    final xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" 
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="ctrTitle"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="457200"/>
            <a:ext cx="7772400" cy="1143000"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="zh-CN" sz="4400" b="1"/>
              <a:t>$title</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph idx="1"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="1600200"/>
            <a:ext cx="7772400" cy="4800600"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="zh-CN" sz="2400"/>
              <a:t>$content</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideRelsXml(int slideNumber) {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideLayoutXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Title and Content">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideMasterXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getThemeXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1>
        <a:sysClr val="windowText" lastClr="000000"/>
      </a:dk1>
      <a:lt1>
        <a:sysClr val="window" lastClr="FFFFFF"/>
      </a:lt1>
      <a:dk2>
        <a:srgbClr val="1F497D"/>
      </a:dk2>
      <a:lt2>
        <a:srgbClr val="EEECE1"/>
      </a:lt2>
      <a:accent1>
        <a:srgbClr val="4F81BD"/>
      </a:accent1>
      <a:accent2>
        <a:srgbClr val="F79646"/>
      </a:accent2>
      <a:accent3>
        <a:srgbClr val="9BBB59"/>
      </a:accent3>
      <a:accent4>
        <a:srgbClr val="8064A2"/>
      </a:accent4>
      <a:accent5>
        <a:srgbClr val="4BACC6"/>
      </a:accent5>
      <a:accent6>
        <a:srgbClr val="F366CC"/>
      </a:accent6>
      <a:hlink>
        <a:srgbClr val="0000FF"/>
      </a:hlink>
      <a:folHlink>
        <a:srgbClr val="800080"/>
      </a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill>
          <a:schemeClr val="phClr"/>
        </a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill>
            <a:schemeClr val="phClr">
              <a:shade val="95000"/>
            </a:schemeClr>
          </a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="40000" dist="20000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000">
                <a:alpha val="38000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill>
          <a:schemeClr val="phClr"/>
        </a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>''';
    return utf8.encode(xml);
  }
}

 