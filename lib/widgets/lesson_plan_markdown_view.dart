import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:teachai_app/utils/app_theme.dart';

class LessonPlanMarkdownView extends StatelessWidget {
  final String content;
  final bool isDark;

  const LessonPlanMarkdownView({
    super.key,
    required this.content,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.systemGray6,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
          width: 0.5,
        ),
      ),
      child: MarkdownBody(
        data: _formatContentForTeachers(content),
        styleSheet: _buildMarkdownStyleSheet(context),
        selectable: true,
      ),
    );
  }

  /// 为山村教师优化内容格式
  String _formatContentForTeachers(String content) {
    // 如果内容不是markdown格式，尝试智能转换
    if (!content.contains('#') && !content.contains('*') && !content.contains('-')) {
      return _convertPlainTextToMarkdown(content);
    }
    return content;
  }

  /// 将普通文本转换为易读的markdown格式
  String _convertPlainTextToMarkdown(String text) {
    final lines = text.split('\n');
    final buffer = StringBuffer();
    bool inBoardSection = false;
    
    for (int i = 0; i < lines.length; i++) {
      final line = lines[i].trim();
      if (line.isEmpty) continue;
      
      // 检测标题行
      if (_isTitle(line)) {
        inBoardSection = false;
        buffer.writeln('## 📝 $line\n');
      }
      // 检测目标/目的
      else if (_isObjective(line)) {
        inBoardSection = false;
        buffer.writeln('### 🎯 $line\n');
      }
      // 检测重点/难点
      else if (_isKeyPoint(line)) {
        inBoardSection = false;
        buffer.writeln('### ⭐ $line\n');
      }
      // 检测板书设计
      else if (_isBoardDesign(line)) {
        inBoardSection = true;
        buffer.writeln('### 🖼️ $line\n');
        buffer.writeln('```');  // 开始代码块，用于格式化板书内容
      }
      // 检测教学反思
      else if (_isReflection(line)) {
        if (inBoardSection) {
          buffer.writeln('```\n');  // 结束板书代码块
          inBoardSection = false;
        }
        buffer.writeln('### 💭 $line\n');
      }
      // 检测步骤/环节
      else if (_isStep(line)) {
        if (inBoardSection) {
          buffer.writeln('```\n');  // 结束板书代码块
          inBoardSection = false;
        }
        buffer.writeln('### 📋 $line\n');
      }
      // 检测时间
      else if (_isTimeInfo(line)) {
        buffer.writeln('⏰ $line\n');  // 移除加粗，使用普通样式
      }
      // 检测列表项
      else if (_isListItem(line)) {
        if (inBoardSection) {
          buffer.writeln(line);  // 在板书区域内保持原格式
        } else {
          buffer.writeln('- $line');
        }
      }
      // 在板书区域内的内容
      else if (inBoardSection) {
        buffer.writeln(line);  // 保持原始格式
      }
      // 普通段落
      else {
        buffer.writeln('$line\n');
      }
    }
    
    // 如果最后还在板书区域，关闭代码块
    if (inBoardSection) {
      buffer.writeln('```');
    }
    
    return buffer.toString();
  }

  bool _isTitle(String line) {
    final titlePatterns = ['教案', '课题', '主题', '标题'];
    return titlePatterns.any((pattern) => line.contains(pattern)) && line.length < 30;
  }

  bool _isObjective(String line) {
    final objectivePatterns = ['目标', '目的', '要求', '能力'];
    return objectivePatterns.any((pattern) => line.contains(pattern));
  }

  bool _isKeyPoint(String line) {
    final keyPointPatterns = ['重点', '难点', '关键', '要点'];
    return keyPointPatterns.any((pattern) => line.contains(pattern));
  }

  bool _isStep(String line) {
    final stepPatterns = ['环节', '步骤', '过程', '阶段', '导入', '新课', '练习', '小结', '作业', '板书设计', '教学反思', '教案设计说明'];
    return stepPatterns.any((pattern) => line.contains(pattern));
  }

  bool _isBoardDesign(String line) {
    return line.contains('板书设计') || line.contains('板书') || line.contains('黑板');
  }

  bool _isReflection(String line) {
    return line.contains('教学反思') || line.contains('反思') || line.contains('总结');
  }



  bool _isTimeInfo(String line) {
    return line.contains('分钟') || line.contains('时间');
  }

  bool _isListItem(String line) {
    return line.startsWith('1.') || 
           line.startsWith('2.') || 
           line.startsWith('3.') ||
           line.startsWith('①') ||
           line.startsWith('②') ||
           line.startsWith('③') ||
           line.contains('、');
  }

  MarkdownStyleSheet _buildMarkdownStyleSheet(BuildContext context) {
    final textTheme = CupertinoTheme.of(context).textTheme;
    
    // 定义简约美观的颜色方案
    final primaryTextColor = isDark 
        ? const Color(0xFFE6E6E6)  // 浅灰色文字（深色模式）
        : const Color(0xFF2D3748); // 深灰色文字（浅色模式）
    
    final accentColor = isDark
        ? const Color(0xFF9CA3AF)  // 中性灰色重点（深色模式）
        : const Color(0xFF6B7280); // 中性灰色重点（浅色模式）
        
    final subtleColor = isDark
        ? const Color(0xFF6B7280)  // 更淡的灰色（深色模式）
        : const Color(0xFF9CA3AF); // 更淡的灰色（浅色模式）
    
    return MarkdownStyleSheet(
      // 标题样式 - 使用优雅的深灰色
      h1: textTheme.navTitleTextStyle.copyWith(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: primaryTextColor,
        height: 1.3,
      ),
      h2: textTheme.navTitleTextStyle.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
        height: 1.3,
      ),
      h3: textTheme.textStyle.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: accentColor,
        height: 1.3,
      ),
      h4: textTheme.textStyle.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: accentColor,
        height: 1.3,
      ),
      
      // 正文样式 - 更大的行距便于阅读
      p: textTheme.textStyle.copyWith(
        fontSize: 16,
        height: 1.6,
        color: primaryTextColor,
      ),
      
      // 列表样式 - 使用温和的重点色
      listBullet: textTheme.textStyle.copyWith(
        fontSize: 16,
        height: 1.5,
        color: accentColor,
      ),
      
      // 强调文本 - 使用更温和的深色而非红色
      strong: textTheme.textStyle.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: primaryTextColor,
      ),
      
      // 代码样式（用于板书设计等）- 使用温和的背景色
      code: textTheme.textStyle.copyWith(
        fontSize: 15,
        fontFamily: 'monospace',
        backgroundColor: isDark 
            ? const Color(0xFF374151)  // 深色模式：深灰背景
            : const Color(0xFFF3F4F6), // 浅色模式：浅灰背景
        color: primaryTextColor,
      ),
      
      // 代码块样式 - 简约的边框和背景
      codeblockDecoration: BoxDecoration(
        color: isDark 
            ? const Color(0xFF1F2937)  // 深色模式：更深的背景
            : const Color(0xFFF9FAFB), // 浅色模式：极浅的背景
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark 
              ? const Color(0xFF4B5563)  // 深色模式：中灰边框
              : const Color(0xFFE5E7EB), // 浅色模式：浅灰边框
          width: 1,
        ),
      ),
      
      // 引用块样式 - 温和的斜体样式
      blockquote: textTheme.textStyle.copyWith(
        fontSize: 16,
        fontStyle: FontStyle.italic,
        color: subtleColor,
      ),
      
      // 链接样式 - 使用温和的蓝色
      a: textTheme.textStyle.copyWith(
        fontSize: 16,
        color: isDark 
            ? const Color(0xFF60A5FA)  // 深色模式：柔和蓝色
            : const Color(0xFF3B82F6), // 浅色模式：深蓝色
        decoration: TextDecoration.underline,
      ),
    );
  }
} 