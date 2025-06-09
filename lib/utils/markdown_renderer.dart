import 'package:flutter/material.dart';
import 'package:markdown/markdown.dart' as md;

class MarkdownRenderer {
  /// 渲染Markdown文本为Flutter Widget
  static Widget render(String markdownText, {TextStyle? style}) {
    if (markdownText.isEmpty) {
      return const Text('暂无内容');
    }

    // 解析Markdown
    final parsedNodes = _parseMarkdown(markdownText);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: parsedNodes.map((node) => _buildWidget(node, style)).toList(),
    );
  }

  /// 解析Markdown为节点列表
  static List<MarkdownNode> _parseMarkdown(String text) {
    final lines = text.split('\n');
    final nodes = <MarkdownNode>[];
    
    for (String line in lines) {
      line = line.trim();
      if (line.isEmpty) continue;
      
      // 标题
      if (line.startsWith('#')) {
        final level = line.indexOf(' ');
        final content = line.substring(level + 1);
        nodes.add(MarkdownNode(
          type: MarkdownNodeType.heading,
          content: content,
          level: level,
        ));
      }
      // 列表项
      else if (line.startsWith('- ') || line.startsWith('* ') || 
               RegExp(r'^\d+\.\s').hasMatch(line)) {
        final content = line.replaceFirst(RegExp(r'^[-*]\s|\d+\.\s'), '');
        nodes.add(MarkdownNode(
          type: MarkdownNodeType.listItem,
          content: content,
        ));
      }
      // 引用
      else if (line.startsWith('> ')) {
        final content = line.substring(2);
        nodes.add(MarkdownNode(
          type: MarkdownNodeType.blockquote,
          content: content,
        ));
      }
      // 代码块
      else if (line.startsWith('```')) {
        nodes.add(MarkdownNode(
          type: MarkdownNodeType.codeBlock,
          content: line.substring(3),
        ));
      }
      // 普通段落
      else {
        // 处理行内格式
        final processedContent = _processInlineFormatting(line);
        nodes.add(MarkdownNode(
          type: MarkdownNodeType.paragraph,
          content: processedContent,
        ));
      }
    }
    
    return nodes;
  }

  /// 处理行内格式（粗体、斜体等）
  static String _processInlineFormatting(String text) {
    return text
        // 粗体
        .replaceAll(RegExp(r'\*\*(.*?)\*\*'), r'$1')
        // 斜体
        .replaceAll(RegExp(r'\*(.*?)\*'), r'$1')
        // 行内代码
        .replaceAll(RegExp(r'`([^`]+)`'), r'$1')
        // 链接
        .replaceAll(RegExp(r'\[([^\]]+)\]\([^\)]+\)'), r'$1');
  }

  /// 构建Widget
  static Widget _buildWidget(MarkdownNode node, TextStyle? baseStyle) {
    final defaultStyle = baseStyle ?? const TextStyle(fontSize: 14, height: 1.5);
    
    switch (node.type) {
      case MarkdownNodeType.heading:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Text(
            node.content,
            style: defaultStyle.copyWith(
              fontSize: _getHeadingSize(node.level),
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        );
        
      case MarkdownNodeType.paragraph:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4.0),
          child: Text(
            node.content,
            style: defaultStyle.copyWith(
              color: Colors.black87,
            ),
          ),
        );
        
      case MarkdownNodeType.listItem:
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 6, right: 8),
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                ),
              ),
              Expanded(
                child: Text(
                  node.content,
                  style: defaultStyle.copyWith(
                    color: Colors.black87,
                  ),
                ),
              ),
            ],
          ),
        );
        
      case MarkdownNodeType.blockquote:
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 8.0),
          padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
              color: Colors.grey.shade100,
              border: Border(
                left: BorderSide(
                  color: Colors.grey.shade400,
                  width: 4,
                ),
              ),
          ),
          child: Text(
            node.content,
            style: defaultStyle.copyWith(
              fontStyle: FontStyle.italic,
              color: Colors.black54,
            ),
          ),
        );
        
      case MarkdownNodeType.codeBlock:
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 8.0),
          padding: const EdgeInsets.all(12.0),
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            node.content,
            style: defaultStyle.copyWith(
              fontFamily: 'Courier',
              color: Colors.black87,
            ),
          ),
        );
    }
  }

  /// 获取标题字体大小
  static double _getHeadingSize(int level) {
    switch (level) {
      case 1: return 24;
      case 2: return 20;
      case 3: return 18;
      case 4: return 16;
      case 5: return 14;
      case 6: return 12;
      default: return 14;
    }
  }

  /// 简单渲染：只处理基本格式，返回Text widget
  static Widget renderSimple(String markdownText, {TextStyle? style}) {
    if (markdownText.isEmpty) {
      return const Text('暂无内容');
    }

    final cleanText = _processInlineFormatting(markdownText)
        // 移除标题标记
        .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
        // 移除列表标记
        .replaceAll(RegExp(r'^\s*[-*+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*\d+\.\s+', multiLine: true), '')
        // 移除引用标记
        .replaceAll(RegExp(r'^\s*>\s+', multiLine: true), '')
        // 清理多余空行
        .replaceAll(RegExp(r'\n\s*\n'), '\n')
        .trim();

    return Text(
      cleanText,
      style: style ?? const TextStyle(fontSize: 14, height: 1.5),
    );
  }
}

/// Markdown节点类型
enum MarkdownNodeType {
  heading,
  paragraph,
  listItem,
  blockquote,
  codeBlock,
}

/// Markdown节点
class MarkdownNode {
  final MarkdownNodeType type;
  final String content;
  final int level;

  MarkdownNode({
    required this.type,
    required this.content,
    this.level = 0,
  });
} 