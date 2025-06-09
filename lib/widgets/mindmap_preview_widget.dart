import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'dart:typed_data';
import '../models/lesson_plan.dart';
import '../utils/app_theme.dart';
import 'dart:math' as math;

class MindMapPreviewWidget extends StatefulWidget {
  final LessonPlan lesson;
  final double? width;
  final double? height;
  final bool showToolbar;
  final VoidCallback? onExport;

  const MindMapPreviewWidget({
    Key? key,
    required this.lesson,
    this.width,
    this.height,
    this.showToolbar = true,
    this.onExport,
  }) : super(key: key);

  @override
  State<MindMapPreviewWidget> createState() => _MindMapPreviewWidgetState();
}

class _MindMapPreviewWidgetState extends State<MindMapPreviewWidget> {
  final GlobalKey _repaintBoundaryKey = GlobalKey();
  double _scale = 1.0;
  Offset _offset = Offset.zero;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (widget.showToolbar) _buildToolbar(),
        Expanded(
          child: Container(
            width: widget.width ?? double.infinity,
            height: widget.height ?? 400,
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 3.0,
                constrained: false,
                child: RepaintBoundary(
                  key: _repaintBoundaryKey,
                  child: CustomPaint(
                    size: Size(
                      widget.width ?? 800,
                      widget.height ?? 600,
                    ),
                    painter: MindMapPainter(widget.lesson),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildToolbar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade300),
        ),
      ),
      child: Row(
        children: [
          Text(
            '思维导图预览',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimaryColor,
            ),
          ),
          const Spacer(),
          if (widget.onExport != null)
            ElevatedButton.icon(
              onPressed: widget.onExport,
              icon: const Icon(Icons.download, size: 18),
              label: const Text('导出'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
            ),
        ],
      ),
    );
  }

  // 导出思维导图为图片
  Future<Uint8List?> exportToImage() async {
    try {
      final RenderRepaintBoundary boundary = _repaintBoundaryKey.currentContext!
          .findRenderObject() as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      return byteData?.buffer.asUint8List();
    } catch (e) {
      print('思维导图导出失败: $e');
      return null;
    }
  }
}

class MindMapPainter extends CustomPainter {
  final LessonPlan lesson;

  MindMapPainter(this.lesson);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();
    final width = size.width;
    final height = size.height;

    // 背景
    paint.color = Colors.white;
    canvas.drawRect(Rect.fromLTWH(0, 0, width, height), paint);

    // 中心主题
    _drawMindMapNode(
      canvas,
      width / 2,
      height / 2,
      lesson.title,
      AppTheme.primaryColor,
      120,
      60,
      true,
    );

    // 主要分支信息
    final mainBranches = _extractMindMapData(lesson);
    final branchRadius = math.min(width, height) * 0.25;
    final subBranchRadius = branchRadius * 0.6;

    for (int i = 0; i < mainBranches.length; i++) {
      final branch = mainBranches[i];
      final angle = i * (2 * math.pi / mainBranches.length);
      final mainX = width / 2 + branchRadius * math.cos(angle);
      final mainY = height / 2 + branchRadius * math.sin(angle);

      // 绘制主分支连接线
      paint.color = branch['color'] as Color;
      paint.strokeWidth = 3;
      paint.style = PaintingStyle.stroke;
      canvas.drawLine(
        Offset(width / 2, height / 2),
        Offset(mainX, mainY),
        paint,
      );

      // 绘制主分支节点
      _drawMindMapNode(
        canvas,
        mainX,
        mainY,
        branch['title'] as String,
        branch['color'] as Color,
        100,
        40,
        false,
      );

      // 绘制子分支
      final subBranches = branch['subBranches'] as List<String>;
      for (int j = 0; j < subBranches.length; j++) {
        final subAngle = angle + (j - (subBranches.length - 1) / 2) * 0.5;
        final subX = mainX + subBranchRadius * math.cos(subAngle);
        final subY = mainY + subBranchRadius * math.sin(subAngle);

        // 绘制子分支连接线
        paint.color = (branch['color'] as Color).withOpacity(0.7);
        paint.strokeWidth = 2;
        canvas.drawLine(
          Offset(mainX, mainY),
          Offset(subX, subY),
          paint,
        );

        // 绘制子分支节点
        _drawMindMapNode(
          canvas,
          subX,
          subY,
          subBranches[j],
          (branch['color'] as Color).withOpacity(0.8),
          80,
          30,
          false,
        );
      }
    }

    // 绘制信息框
    _drawInfoBox(canvas, lesson);
  }

  void _drawMindMapNode(
    Canvas canvas,
    double x,
    double y,
    String text,
    Color color,
    double width,
    double height,
    bool isCenter,
  ) {
    final paint = Paint();
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: Colors.white,
          fontSize: isCenter ? 14 : 11,
          fontWeight: isCenter ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 2,
      textAlign: TextAlign.center,
    );
    textPainter.layout(maxWidth: width - 16);

    // 绘制节点背景
    paint.color = color;
    paint.style = PaintingStyle.fill;
    final rect = Rect.fromCenter(
      center: Offset(x, y),
      width: math.max(width, textPainter.width + 16),
      height: math.max(height, textPainter.height + 16),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(8)),
      paint,
    );

    // 绘制边框
    paint.color = color.withOpacity(0.8);
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = 1;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(8)),
      paint,
    );

    // 绘制文本
    textPainter.paint(
      canvas,
      Offset(x - textPainter.width / 2, y - textPainter.height / 2),
    );
  }

  void _drawInfoBox(Canvas canvas, LessonPlan lesson) {
    final paint = Paint()
      ..color = Colors.grey.shade100
      ..style = PaintingStyle.fill;

    final rect = const Rect.fromLTWH(20, 20, 160, 80);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(6)),
      paint,
    );

    // 绘制边框
    paint
      ..color = Colors.grey.shade400
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(6)),
      paint,
    );

    // 绘制文本信息
    final textPainter = TextPainter(
      text: TextSpan(
        children: [
          TextSpan(
            text: '课程信息\n',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
          TextSpan(
            text: '学科: ${lesson.subject}\n',
            style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
          ),
          TextSpan(
            text: '年级: ${lesson.grade}\n',
            style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
          ),
          TextSpan(
            text: '课时: ${lesson.duration}',
            style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
          ),
        ],
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout(maxWidth: 140);
    textPainter.paint(canvas, const Offset(25, 25));
  }

  List<Map<String, dynamic>> _extractMindMapData(LessonPlan lesson) {
    return [
      {
        'title': '教学目标',
        'color': AppTheme.successColor,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.objectives), 3),
      },
      {
        'title': '教学内容',
        'color': AppTheme.warningColor,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.content), 4),
      },
      {
        'title': '教学方法',
        'color': AppTheme.accentColor,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.methods), 3),
      },
      {
        'title': '教学评估',
        'color': AppTheme.errorColor,
        'subBranches': _extractKeyPoints(_cleanMarkdownText(lesson.assessment), 3),
      },
      {
        'title': '课程信息',
        'color': AppTheme.infoColor,
        'subBranches': [lesson.subject, lesson.grade, lesson.duration],
      },
    ];
  }

  List<String> _extractKeyPoints(String text, int maxPoints) {
    if (text.isEmpty) return ['暂无内容'];

    final sentences = text
        .split(RegExp(r'[。；\n]'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty && s.length > 2)
        .toList();

    final keyPoints = <String>[];
    final keywords = ['目标', '重点', '难点', '方法', '评估', '掌握', '理解', '培养', '提高'];

    for (final sentence in sentences) {
      if (keyPoints.length >= maxPoints) break;
      if (keywords.any((keyword) => sentence.contains(keyword))) {
        keyPoints.add(_truncateText(sentence, 10));
      }
    }

    for (final sentence in sentences) {
      if (keyPoints.length >= maxPoints) break;
      final truncated = _truncateText(sentence, 10);
      if (!keyPoints.contains(truncated)) {
        keyPoints.add(truncated);
      }
    }

    return keyPoints.isEmpty ? ['暂无内容'] : keyPoints;
  }

  String _truncateText(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return '${text.substring(0, maxLength)}...';
  }

  String _cleanMarkdownText(String text) {
    if (text.isEmpty) return text;

    return text
        .replaceAll(RegExp(r'\*\*(.*?)\*\*'), r'$1')
        .replaceAll(RegExp(r'\*(.*?)\*'), r'$1')
        .replaceAll(RegExp(r'```.*?```', dotAll: true), '')
        .replaceAll(RegExp(r'`([^`]+)`'), r'$1')
        .replaceAll(RegExp(r'\[([^\]]+)\]\([^\)]+\)'), r'$1')
        .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*[-*+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*\d+\.\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*>\s+', multiLine: true), '')
        .replaceAll(RegExp(r'\n\s*\n'), '\n')
        .trim();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
} 