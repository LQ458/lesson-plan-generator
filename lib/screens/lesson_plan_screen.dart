import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/services/ai_service.dart';
import 'package:teachai_app/services/permission_service.dart';
import 'package:teachai_app/models/lesson_plan.dart';
import 'package:teachai_app/screens/lesson_detail_screen.dart';
import 'package:teachai_app/utils/app_theme.dart';

class LessonPlanScreen extends StatefulWidget {
  const LessonPlanScreen({super.key});

  @override
  State<LessonPlanScreen> createState() => _LessonPlanScreenState();
}

class _LessonPlanScreenState extends State<LessonPlanScreen> {
  final AIService _aiService = AIService();
  final TextEditingController _topicController = TextEditingController();
  final TextEditingController _requirementsController = TextEditingController();
  
  String _selectedSubject = '语文';
  String _selectedGrade = '一年级';
  String _selectedMode = 'online'; // 'online' 或 'offline'
  bool _isGenerating = false;
  String _generatedContent = '';
  
  final List<String> _subjects = ['语文', '数学', '英语', '科学', '音乐', '美术', '体育', '道德与法治'];
  final List<String> _grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'];

  @override
  void initState() {
    super.initState();
    _checkOfflineAvailability();
  }

  // 检查离线模型是否可用
  Future<void> _checkOfflineAvailability() async {
    if (!mounted) return;
    
    // 强制刷新AI服务状态
    await _aiService.initModel(forceRefresh: true);
    
    final isAvailable = _aiService.isModelLoaded;
    if (mounted) {
      setState(() {
        // 如果没有可用的离线模型，默认使用在线模式
        if (!isAvailable) {
          _selectedMode = 'online';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
            middle: const Text(
              '教案生成',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.4,
        ),
      ),
            backgroundColor: AppTheme.systemBackground,
          ),
          backgroundColor: AppTheme.systemBackground,
      child: SafeArea(
            child: CustomScrollView(
              slivers: [
                // 模式选择
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: _buildModeSelector(),
                  ),
                ),
                
                // 输入表单
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: _buildInputForm(),
                  ),
                ),
                
                // 生成按钮
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: _buildGenerateButton(),
                  ),
                ),
                
                // 结果显示
                if (_generatedContent.isNotEmpty)
                  SliverToBoxAdapter(
        child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: _buildResultCard(),
        ),
      ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModeSelector() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.systemGray6,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'AI模式选择',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimaryColor,
            ),
          ),
          const SizedBox(height: 12),
          
          // 在线模式
          _buildModeOption(
            mode: 'online',
            title: '在线AI',
            description: '连接网络使用云端AI，功能强大',
            icon: CupertinoIcons.wifi,
            color: AppTheme.systemBlue,
          ),
          
          const SizedBox(height: 8),
          
          // 离线模式
          _buildModeOption(
            mode: 'offline',
            title: '离线AI',
            description: _aiService.isModelLoaded 
                ? '使用本地AI，无需网络'
                : '离线AI需要先下载到设备',
            icon: CupertinoIcons.device_phone_portrait,
            color: _aiService.isModelLoaded ? AppTheme.systemGreen : AppTheme.systemOrange,
            showDownloadButton: !_aiService.isModelLoaded && _selectedMode == 'offline',
          ),
        ],
      ),
    );
  }

  Widget _buildModeOption({
    required String mode,
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    bool showDownloadButton = false,
  }) {
    final isSelected = _selectedMode == mode;
    
    return GestureDetector(
      onTap: () => setState(() => _selectedMode = mode),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected 
              ? color.withOpacity(0.1)
              : AppTheme.systemBackground,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected 
                ? color
                : AppTheme.systemGray4,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  color: isSelected ? color : AppTheme.systemGray,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: isSelected ? color : AppTheme.textPrimaryColor,
                        ),
                      ),
                        Text(
                        description,
                        style: TextStyle(
                          fontSize: 14,
                          color: isSelected 
                              ? color.withOpacity(0.8)
                              : AppTheme.systemGray,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Icon(
                    CupertinoIcons.checkmark_circle_fill,
                    color: color,
                    size: 20,
          ),
              ],
          ),
            if (showDownloadButton) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  color: AppTheme.systemBlue,
                  borderRadius: BorderRadius.circular(6),
                  onPressed: _downloadOfflineModel,
                  child: const Text(
                    '下载离线AI助手',
                    style: TextStyle(
                      color: CupertinoColors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
              ],
            ),
      ),
    );
  }

  Widget _buildInputForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.systemBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.systemGray5,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 学科选择
          _buildPickerSection(
            title: '学科',
            value: _selectedSubject,
            items: _subjects,
            onChanged: (value) => setState(() => _selectedSubject = value!),
          ),
          
          const SizedBox(height: 16),
          
          // 年级选择
          _buildPickerSection(
            title: '年级',
            value: _selectedGrade,
            items: _grades,
            onChanged: (value) => setState(() => _selectedGrade = value!),
          ),
          
          const SizedBox(height: 16),
          
          // 课程主题
          _buildTextFieldSection(
            title: '课程主题',
            controller: _topicController,
            placeholder: '请输入本节课的主要内容...',
          ),
          
          const SizedBox(height: 16),
          
          // 特殊要求
          _buildTextFieldSection(
            title: '特殊要求（可选）',
            controller: _requirementsController,
            placeholder: '如：重点难点、教学方法、课时安排等...',
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildPickerSection({
    required String title,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppTheme.textPrimaryColor,
          ),
                ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _showPicker(title, value, items, onChanged),
          child: Container(
                  width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  decoration: BoxDecoration(
              color: AppTheme.systemGray6,
                    borderRadius: BorderRadius.circular(8),
                    ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                ),
                const Icon(
                  CupertinoIcons.chevron_down,
                  color: AppTheme.systemGray,
                  size: 16,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showPicker(String title, String currentValue, List<String> items, ValueChanged<String?> onChanged) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => Container(
        height: 250,
        color: AppTheme.systemBackground,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                color: AppTheme.systemGray5,
                    width: 1,
                  ),
                ),
              ),
              child: Row(
                children: [
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Text('取消'),
                  ),
                  Expanded(
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimaryColor,
                      ),
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Text('确定'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: CupertinoPicker(
                itemExtent: 40,
                scrollController: FixedExtentScrollController(
                  initialItem: items.indexOf(currentValue),
                ),
                onSelectedItemChanged: (index) {
                  onChanged(items[index]);
                },
                children: items.map((item) => Center(
                  child: Text(
                    item,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                )).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextFieldSection({
    required String title,
    required TextEditingController controller,
    required String placeholder,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 8),
        CupertinoTextField(
          controller: controller,
          placeholder: placeholder,
          maxLines: maxLines,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.systemGray6,
            borderRadius: BorderRadius.circular(8),
          ),
          style: const TextStyle(
            fontSize: 16,
            color: AppTheme.textPrimaryColor,
          ),
        ),
      ],
    );
  }

  Widget _buildGenerateButton() {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: CupertinoButton.filled(
        onPressed: _isGenerating ? null : _generateLessonPlan,
        child: _isGenerating
            ? const CupertinoActivityIndicator(color: Colors.white)
            : const Text(
                '生成教案',
                style: TextStyle(
                  fontSize: 17,
          fontWeight: FontWeight.w600,
                ),
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.systemBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.systemGray5,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                CupertinoIcons.doc_text,
                color: AppTheme.systemBlue,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                '生成的教案',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimaryColor,
                ),
              ),
              const Spacer(),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _saveLesson,
                child: const Text('保存'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.systemGray6,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _generatedContent,
              style: const TextStyle(
                fontSize: 16,
                color: AppTheme.textPrimaryColor,
                height: 1.5,
        ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _generateLessonPlan() async {
    if (_topicController.text.trim().isEmpty) {
      _showAlert('请输入课程主题');
      return;
    }

    setState(() {
      _isGenerating = true;
      _generatedContent = '';
    });

    try {
      final forceOffline = _selectedMode == 'offline';
      
      // 如果选择离线模式但没有可用模型，显示友好提示
      if (forceOffline && !_aiService.isModelLoaded) {
        setState(() => _isGenerating = false);
        _showOfflineModelAlert();
        return;
      }

      final result = await _aiService.generateLessonPlan(
        subject: _selectedSubject,
        grade: _selectedGrade,
        topic: _topicController.text.trim(),
        requirements: _requirementsController.text.trim().isNotEmpty 
            ? _requirementsController.text.trim()
            : null,
        forceOffline: forceOffline,
      );

      if (mounted) {
        setState(() {
          _generatedContent = result;
          _isGenerating = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGenerating = false);
        _showAlert('生成教案时遇到问题，请稍后重试');
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
            child: const Text('确定'),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  void _showOfflineModelAlert() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('离线功能需要准备'),
        content: const Text(
          '您选择了离线模式，但还需要先准备一下。\n\n离线功能可以让您在没有网络的时候也能使用AI，不过需要先在手机上做一些设置。\n\n建议您现在选择在线模式，或者稍后在设置中准备离线功能。',
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text('取消'),
            onPressed: () => Navigator.pop(context),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text('了解'),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  void _saveLesson() {
    if (_generatedContent.isEmpty) return;

    final now = DateTime.now();
    final lesson = LessonPlan(
      id: now.millisecondsSinceEpoch.toString(),
      title: '${_selectedSubject} - ${_topicController.text.trim()}',
      subject: _selectedSubject,
      grade: _selectedGrade,
      topic: _topicController.text.trim(),
      content: _generatedContent,
      createdAt: now,
      updatedAt: now,
    );

    // 保存教案逻辑
    Navigator.push(
      context,
      CupertinoPageRoute(
        builder: (context) => LessonDetailScreen(lesson: lesson),
      ),
    );
  }

  // 下载离线模型
  Future<void> _downloadOfflineModel() async {
    // 显示下载进度对话框
    showCupertinoDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _DownloadProgressDialog(),
    );
  }

  @override
  void dispose() {
    _topicController.dispose();
    _requirementsController.dispose();
    super.dispose();
  }
}

// 下载进度对话框
class _DownloadProgressDialog extends StatefulWidget {
  @override
  State<_DownloadProgressDialog> createState() => _DownloadProgressDialogState();
}

class _DownloadProgressDialogState extends State<_DownloadProgressDialog> {
  final AIService _aiService = AIService();
  final PermissionService _permissionService = PermissionService();
  double _progress = 0.0;
  String _status = '准备下载...';
  bool _isCompleted = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startDownload();
  }

  Future<void> _startDownload() async {
    try {
      // 🔐 首先检查并请求存储权限
      setState(() {
        _status = '检查存储权限...';
      });
      
      final hasPermission = await _permissionService.requestStoragePermission(context);
      
      if (!hasPermission) {
        setState(() {
          _error = '需要存储权限才能下载AI模型\n\n请在权限设置中允许应用访问存储权限';
          _status = '权限被拒绝';
        });
        return;
      }
      
      setState(() {
        _status = '开始下载离线AI助手...';
      });

      final success = await _aiService.downloadModel(
        onProgress: (progress) {
          if (mounted) {
            setState(() {
              _progress = progress;
              _status = '下载中... ${(progress * 100).toInt()}%';
            });
          }
        },
        onSuccess: () {
          if (mounted) {
            setState(() {
              _isCompleted = true;
              _status = '下载完成！';
              _progress = 1.0;
            });
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() {
              _error = error;
              _status = '下载失败';
            });
          }
        },
      );

      if (!success && _error == null) {
        setState(() {
          _error = '下载失败，请稍后重试';
          _status = '下载失败';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _status = '下载出错';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoAlertDialog(
      title: const Text('离线AI助手'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
          const SizedBox(height: 16),
          if (_error == null) ...[
            // 进度条
            Container(
              width: double.infinity,
              height: 8,
              decoration: BoxDecoration(
                color: AppTheme.systemGray5,
                borderRadius: BorderRadius.circular(4),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: _progress,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.systemBlue,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _status,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.systemGray,
              ),
            ),
          ] else ...[
            Icon(
              CupertinoIcons.exclamationmark_triangle,
              color: AppTheme.systemRed,
              size: 32,
            ),
            const SizedBox(height: 12),
            Text(
              _error!,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.systemRed,
                ),
              textAlign: TextAlign.center,
              ),
          ],
          ],
        ),
        actions: [
        if (_isCompleted)
          CupertinoDialogAction(
            onPressed: () {
              Navigator.pop(context);
              // 重新检查离线可用性
              if (context.mounted) {
                final state = context.findAncestorStateOfType<_LessonPlanScreenState>();
                state?._checkOfflineAvailability();
              }
            },
            child: const Text('完成'),
          )
        else if (_error != null)
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('关闭'),
          ),
        ],
    );
  }
} 