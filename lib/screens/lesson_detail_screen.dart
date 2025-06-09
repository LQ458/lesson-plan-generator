import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:teachai_app/models/lesson_plan.dart';
import 'package:teachai_app/models/lesson_export_format.dart';
import 'package:teachai_app/services/data_service.dart';
import 'package:teachai_app/services/lesson_export_service.dart';
import 'package:teachai_app/utils/app_theme.dart';
import 'package:teachai_app/widgets/export_preview_dialog.dart';

class LessonDetailScreen extends StatefulWidget {
  final LessonPlan lesson;

  const LessonDetailScreen({
    super.key,
    required this.lesson,
  });

  @override
  State<LessonDetailScreen> createState() => _LessonDetailScreenState();
}

class _LessonDetailScreenState extends State<LessonDetailScreen> {
  late LessonPlan _lesson;
  bool _isEditing = false;
  late TextEditingController _titleController;
  late TextEditingController _contentController;

  @override
  void initState() {
    super.initState();
    _lesson = widget.lesson;
    _titleController = TextEditingController(text: _lesson.title);
    _contentController = TextEditingController(text: _lesson.content);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text(_isEditing ? '编辑教案' : '教案详情'),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () {
            if (_isEditing) {
              _cancelEdit();
            } else {
              Navigator.pop(context);
            }
          },
          child: Text(_isEditing ? '取消' : '返回'),
        ),
        trailing: _isEditing
            ? CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _saveChanges,
                child: const Text('保存'),
              )
            : CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _showMoreOptions,
                child: const Icon(CupertinoIcons.ellipsis),
              ),
      ),
      child: SafeArea(
        child: _isEditing ? _buildEditView(isDark) : _buildDetailView(isDark),
      ),
    );
  }

  Widget _buildDetailView(bool isDark) {
    return Column(
      children: [
        // 教案信息头部
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.darkSurfaceColor : AppTheme.systemGray6,
            border: Border(
              bottom: BorderSide(
                color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                width: 0.5,
              ),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _lesson.title,
                style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildInfoChip(_lesson.subject, AppTheme.systemBlue),
                  const SizedBox(width: 8),
                  _buildInfoChip(_lesson.grade, AppTheme.systemGreen),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '主题：${_lesson.topic}',
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  fontSize: 14,
                  color: CupertinoColors.systemGrey,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(
                    '创建时间：${_formatDateTime(_lesson.createdAt)}',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 12,
                      color: CupertinoColors.systemGrey2,
                    ),
                  ),
                  if (_lesson.updatedAt != _lesson.createdAt) ...[
                    const SizedBox(width: 16),
                    Text(
                      '修改时间：${_formatDateTime(_lesson.updatedAt)}',
                      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                        fontSize: 12,
                        color: CupertinoColors.systemGrey2,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),

        // 教案内容
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkSurfaceColor : CupertinoColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                  width: 0.5,
                ),
              ),
              child: Text(
                _lesson.content,
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  fontSize: 14,
                  height: 1.6,
                ),
              ),
            ),
          ),
        ),

        // 底部操作按钮
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.darkSurfaceColor : AppTheme.systemGray6,
            border: Border(
              top: BorderSide(
                color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                width: 0.5,
              ),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: CupertinoButton(
                  color: AppTheme.systemGray5,
                  onPressed: _copyToClipboard,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        CupertinoIcons.doc_on_doc,
                        size: 18,
                        color: AppTheme.systemBlue,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '复制',
                        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          color: AppTheme.systemBlue,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CupertinoButton(
                  color: AppTheme.systemGreen.withOpacity(0.1),
                  onPressed: () => _showExportOptions(context),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        CupertinoIcons.square_arrow_up,
                        size: 18,
                        color: AppTheme.systemGreen,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '导出',
                        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          color: AppTheme.systemGreen,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CupertinoButton.filled(
                  onPressed: _startEdit,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        CupertinoIcons.pencil,
                        size: 18,
                        color: CupertinoColors.white,
                      ),
                      const SizedBox(width: 8),
                      const Text('编辑'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEditView(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题编辑
          Text(
            '教案标题',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontWeight: FontWeight.w600,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          CupertinoTextField(
            controller: _titleController,
            placeholder: '请输入教案标题',
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.tertiarySystemBackgroundDark : AppTheme.systemGray6,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                width: 0.5,
              ),
            ),
          ),

          const SizedBox(height: 24),

          // 内容编辑
          Text(
            '教案内容',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontWeight: FontWeight.w600,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),

          Expanded(
            child: CupertinoTextField(
              controller: _contentController,
              placeholder: '请输入教案内容',
              maxLines: null,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.tertiarySystemBackgroundDark : AppTheme.systemGray6,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                  width: 0.5,
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // 保存按钮
          SizedBox(
            width: double.infinity,
            child: CupertinoButton.filled(
              onPressed: _saveChanges,
              child: const Text('保存修改'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} '
           '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  void _startEdit() {
    setState(() {
      _isEditing = true;
    });
  }

  void _cancelEdit() {
    setState(() {
      _isEditing = false;
      // 恢复原始内容
      _titleController.text = _lesson.title;
      _contentController.text = _lesson.content;
    });
  }

  Future<void> _saveChanges() async {
    final title = _titleController.text.trim();
    final content = _contentController.text.trim();

    if (title.isEmpty) {
      _showAlert('请输入教案标题');
      return;
    }

    if (content.isEmpty) {
      _showAlert('请输入教案内容');
      return;
    }

    try {
      final updatedLesson = _lesson.copyWith(
        title: title,
        content: content,
        updatedAt: DateTime.now(),
      );

      await DataService.saveLessonPlan(updatedLesson);

      setState(() {
        _lesson = updatedLesson;
        _isEditing = false;
      });

      _showAlert('教案已保存');
    } catch (e) {
      _showAlert('保存失败：$e');
    }
  }

  void _copyToClipboard() {
    final text = '''
${_lesson.title}

学科：${_lesson.subject}
年级：${_lesson.grade}
主题：${_lesson.topic}

${_lesson.content}
''';

    Clipboard.setData(ClipboardData(text: text));
    _showAlert('教案已复制到剪贴板');
  }

  void _showMoreOptions() {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('更多选项'),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _copyToClipboard();
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.doc_on_doc),
                const SizedBox(width: 8),
                const Text('复制教案'),
              ],
            ),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _shareLesson();
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.share),
                const SizedBox(width: 8),
                const Text('分享教案'),
              ],
            ),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _startEdit();
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.pencil),
                const SizedBox(width: 8),
                const Text('编辑教案'),
              ],
            ),
          ),
          CupertinoActionSheetAction(
            isDestructiveAction: true,
            onPressed: () {
              Navigator.pop(context);
              _showDeleteConfirmation();
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.delete),
                const SizedBox(width: 8),
                const Text('删除教案'),
              ],
            ),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _shareLesson() {
    // 这里可以集成分享功能，例如使用 share_plus 包
    _copyToClipboard();
    _showAlert('教案已复制，您可以粘贴到任何地方分享');
  }

  void _showDeleteConfirmation() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('确认删除'),
        content: Text('确定要删除教案"${_lesson.title}"吗？此操作无法撤销。'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () async {
              Navigator.pop(context);
              await _deleteLesson();
            },
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteLesson() async {
    try {
      await DataService.deleteLessonPlan(_lesson.id);
      
      if (mounted) {
        Navigator.pop(context, true); // 返回并标记已删除
      }
    } catch (e) {
      if (mounted) {
        _showAlert('删除失败：$e');
      }
    }
  }

  void _showAlert(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('提示'),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  // 显示导出选项
  void _showExportOptions(BuildContext context) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择导出格式'),
        message: const Text('选择您希望导出的教案格式'),
        actions: [
          _buildExportAction(
            context,
            LessonExportFormat.pdf,
            CupertinoIcons.doc_text,
          ),
          _buildExportAction(
            context,
            LessonExportFormat.ppt,
            CupertinoIcons.tv,
          ),
          _buildExportAction(
            context,
            LessonExportFormat.mindMapImage,
            CupertinoIcons.graph_circle,
          ),
          _buildExportAction(
            context,
            LessonExportFormat.outlineImage,
            CupertinoIcons.list_bullet,
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  // 构建导出动作
  Widget _buildExportAction(
    BuildContext context,
    LessonExportFormat format,
    IconData icon,
  ) {
    return CupertinoActionSheetAction(
      onPressed: () {
        Navigator.pop(context);
        _exportLesson(format);
      },
      child: Row(
        children: [
          Icon(icon, color: AppTheme.systemBlue),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                format.displayName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                format.description,
                style: const TextStyle(
                  fontSize: 13,
                  color: CupertinoColors.systemGrey,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 导出教案
  Future<void> _exportLesson(LessonExportFormat format) async {
    try {
      final config = LessonExportConfig(
        format: format,
        includeMetadata: true,
        customTitle: _lesson.title,
      );
      
      final exportResult = await LessonExportService.exportLessonPlan(
        _lesson,
        config,
      );

      // 显示预览对话框
      _showPreviewDialog(exportResult);
    } catch (e) {
      _showExportAlert('导出失败', '无法导出为${format.displayName}格式：$e');
    }
  }

  // 显示预览对话框
  void _showPreviewDialog(ExportResult exportResult) {
    Navigator.push(
      context,
      CupertinoPageRoute(
        builder: (context) => ExportPreviewDialog(
          exportResult: exportResult,
          lesson: widget.lesson,
        ),
        fullscreenDialog: true,
      ),
    );
  }

  void _showExportAlert(String title, String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
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