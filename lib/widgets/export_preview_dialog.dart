import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:teachai_app/models/lesson_export_format.dart';
import 'package:teachai_app/services/lesson_export_service.dart';
import 'package:teachai_app/utils/app_theme.dart';
import 'package:teachai_app/models/lesson_plan.dart';
import 'mindmap_preview_widget.dart';

class ExportPreviewDialog extends StatelessWidget {
  final ExportResult exportResult;
  final LessonPlan lesson;

  const ExportPreviewDialog({
    super.key,
    required this.exportResult,
    required this.lesson,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('${exportResult.format.displayName}预览'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => Navigator.pop(context),
          child: const Text('关闭'),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _buildPreviewContent(),
            ),
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewContent() {
    switch (exportResult.format) {
      case LessonExportFormat.pdf:
        return _buildPDFPreview();
      case LessonExportFormat.ppt:
        return _buildPPTPreview();
      case LessonExportFormat.mindMapImage:
        return _buildMindMapImagePreview();
      case LessonExportFormat.outlineImage:
        return _buildOutlineImagePreview();
      default:
        return const Center(child: Text('暂不支持预览此格式'));
    }
  }

  Widget _buildHTMLPreview() {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: AppTheme.textSecondaryColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Html(
          data: exportResult.previewData ?? exportResult.content,
          style: {
            'body': Style(
              margin: Margins.all(16),
              fontFamily: 'PingFang SC',
            ),
            'h1': Style(
              color: AppTheme.primaryColor,
              textAlign: TextAlign.center,
            ),
            'h2': Style(
              color: AppTheme.accentColor,
            ),
          },
        ),
      ),
    );
  }

  Widget _buildMarkdownPreview() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        border: Border.all(color: AppTheme.dividerColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: SingleChildScrollView(
        child: Text(
          exportResult.content,
          style: const TextStyle(
            fontFamily: 'Monaco',
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ),
    );
  }

  Widget _buildMindMapPreview() {
    if (exportResult.previewData == null) {
      return const Center(child: Text('无预览数据'));
    }

    try {
      final previewData = jsonDecode(exportResult.previewData!);
      final centerNode = previewData['centerNode'] as String;
      final mainBranches = previewData['mainBranches'] as List;
      final totalNodes = previewData['totalNodes'] as int;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 思维导图可视化预览
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: Column(
                children: [
                  // 中心节点
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(25),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryColor.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      centerNode,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // 主要分支
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: mainBranches.asMap().entries.map((entry) {
                      final index = entry.key;
                      final branch = entry.value;
                      final colors = [
                        AppTheme.successColor,
                        AppTheme.warningColor,
                        AppTheme.accentColor,
                        AppTheme.infoColor,
                        Colors.purple,
                        Colors.teal,
                      ];
                      final color = colors[index % colors.length];
                      
                      return _buildMindMapBranch(
                        branch['text'] as String,
                        branch['children'] as int,
                        color,
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 统计信息
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem('总节点', '$totalNodes'),
                  _buildStatItem('主分支', '${mainBranches.length}'),
                  _buildStatItem('层级', '3'),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 格式说明
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, 
                           size: 16, 
                           color: AppTheme.textSecondaryColor),
                      const SizedBox(width: 8),
                      Text(
                        '导出格式说明',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '• JSON格式：可导入XMind、MindManager等专业思维导图软件\n'
                    '• 包含完整的节点层级关系和样式信息\n'
                    '• 支持自定义主题和颜色配置',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondaryColor,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } catch (e) {
      return Center(
        child: Text(
          '预览数据解析失败: $e',
          style: TextStyle(color: AppTheme.errorColor),
        ),
      );
    }
  }

  Widget _buildMindMapBranch(String text, int childrenCount, Color color) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 200),
      child: Column(
        children: [
          // 连接线
          Container(
            width: 2,
            height: 20,
            color: color.withOpacity(0.5),
          ),
          
          // 分支节点
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color, width: 2),
            ),
            child: Column(
              children: [
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (childrenCount > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$childrenCount项',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: AppTheme.textSecondaryColor,
          ),
        ),
      ],
    );
  }

  Widget _buildPPTPreview() {
    if (exportResult.previewData == null) {
      return const Center(child: Text('无预览数据'));
    }

    try {
      final previewData = jsonDecode(exportResult.previewData!);
      final title = previewData['title'] as String;
      final totalSlides = previewData['totalSlides'] as int;
      final slides = previewData['slides'] as List;
      final hasMore = previewData['hasMore'] as bool;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.accentColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.accentColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '共 $totalSlides 页',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              '幻灯片预览',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimaryColor,
              ),
            ),
            const SizedBox(height: 16),
            ...slides.asMap().entries.map((entry) {
              final index = entry.key;
              final slide = entry.value;
              return _buildSlidePreview(index + 1, slide);
            }),
            if (hasMore)
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.dividerColor, width: 0.5),
                ),
                child: Center(
                  child: Text(
                    '... 还有 ${totalSlides - slides.length} 页',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    } catch (e) {
      return Center(
        child: Text(
          '预览数据解析失败: $e',
          style: TextStyle(color: AppTheme.errorColor),
        ),
      );
    }
  }

  Widget _buildSlidePreview(int slideNumber, Map<String, dynamic> slide) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.dividerColor, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$slideNumber',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  slide['title'] ?? '无标题',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.backgroundColor,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              slide['content'] ?? '无内容',
              style: const TextStyle(fontSize: 14, height: 1.4),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextPreview() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          border: Border.all(color: AppTheme.dividerColor, width: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
      child: SingleChildScrollView(
        child: Text(
          exportResult.content,
          style: const TextStyle(fontSize: 14, height: 1.5),
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Container(
      color: AppTheme.backgroundColor,
      child: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
                          border: Border(
                top: BorderSide(color: AppTheme.dividerColor, width: 0.5),
              ),
          ),
          child: Row(
            children: [
              Expanded(
                child: CupertinoButton(
                  color: AppTheme.primaryColor,
                  onPressed: () => _downloadFile(context),
                  child: const Text('下载文件'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: CupertinoButton(
                  color: AppTheme.textSecondaryColor,
                  onPressed: () => Navigator.pop(context),
                  child: const Text('返回'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _downloadFile(BuildContext context) async {
    try {
      // 调用真正的下载方法
      await LessonExportService.downloadExportResult(exportResult);
      
      if (context.mounted) {
        Navigator.pop(context);
        showCupertinoDialog(
          context: context,
          builder: (context) => CupertinoAlertDialog(
            title: const Text('下载成功'),
            content: Text('文件已下载：${exportResult.filename}'),
            actions: [
              CupertinoDialogAction(
                onPressed: () => Navigator.pop(context),
                child: const Text('确定'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      print('下载失败: $e');
      if (context.mounted) {
        showCupertinoDialog(
          context: context,
          builder: (context) => CupertinoAlertDialog(
            title: const Text('下载失败'),
            content: Text('错误信息：$e'),
            actions: [
              CupertinoDialogAction(
                onPressed: () => Navigator.pop(context),
                child: const Text('确定'),
              ),
            ],
          ),
        );
      }
    }
  }

  Widget _buildMindMapImagePreview() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // 实时思维导图预览
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.account_tree_outlined,
                  size: 48,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(height: 16),
                Text(
                  '思维导图实时预览',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '高清思维导图，支持缩放查看',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondaryColor,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 思维导图预览组件
          Container(
            height: 400,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.dividerColor),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: MindMapPreviewWidget(
                lesson: lesson,
                showToolbar: false,
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // 格式特点说明
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.image_outlined,
                      size: 20,
                      color: AppTheme.successColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'SVG格式特点',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimaryColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildFeatureItem('✓ 矢量图形，无限缩放不失真'),
                _buildFeatureItem('✓ 文件体积小，加载速度快'),
                _buildFeatureItem('✓ 支持Web浏览器直接查看'),
                _buildFeatureItem('✓ 可用于网站、文档、演示'),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 使用建议
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.warningColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.warningColor.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.tips_and_updates_outlined,
                  size: 16,
                  color: AppTheme.warningColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '建议：下载后可在浏览器中打开查看，或导入到支持SVG的设计软件中进一步编辑',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.warningColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14,
          color: AppTheme.textSecondaryColor,
          height: 1.5,
        ),
      ),
    );
  }

  Widget _buildPDFPreview() {
    if (exportResult.previewData == null) {
      return const Center(child: Text('无预览数据'));
    }

    try {
      final previewData = jsonDecode(exportResult.previewData!);
      final title = previewData['title'] as String;
      final pageCount = previewData['pageCount'] as int;
      final sections = previewData['sections'] as List;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // PDF预览图标
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.errorColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.picture_as_pdf,
                    size: 64,
                    color: AppTheme.errorColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimaryColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'PDF文档 · $pageCount页',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 章节列表
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '文档结构',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...sections.map((section) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          Icons.article_outlined,
                          size: 16,
                          color: AppTheme.primaryColor,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          section as String,
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondaryColor,
                          ),
                        ),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ],
        ),
      );
    } catch (e) {
      return Center(
        child: Text(
          '预览数据解析失败: $e',
          style: TextStyle(color: AppTheme.errorColor),
        ),
      );
    }
  }



  Widget _buildOutlineImagePreview() {
    if (exportResult.previewData == null) {
      return const Center(child: Text('无预览数据'));
    }

    try {
      final previewData = jsonDecode(exportResult.previewData!);
      final title = previewData['title'] as String;
      final levels = previewData['levels'] as List;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 大纲图片预览
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.accentColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.accentColor.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.list_alt,
                    size: 64,
                    color: AppTheme.accentColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '大纲结构图片',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondaryColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 大纲结构预览
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '大纲结构',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...levels.map((level) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: AppTheme.accentColor,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${level['level']}',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            level['text'] as String,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textPrimaryColor,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.accentColor.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${level['items']}项',
                            style: TextStyle(
                              fontSize: 10,
                              color: AppTheme.accentColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 格式说明
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warningColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.warningColor.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: AppTheme.warningColor,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '导出为PNG格式图片，可直接插入文档或分享',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.warningColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } catch (e) {
      return Center(
        child: Text(
          '预览数据解析失败: $e',
          style: TextStyle(color: AppTheme.errorColor),
        ),
      );
    }
  }
} 