import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/services/ai_service.dart';
import 'package:teachai_app/services/loading_service.dart';
import 'package:teachai_app/utils/app_theme.dart';

class LessonPlanScreen extends StatefulWidget {
  const LessonPlanScreen({super.key});

  @override
  State<LessonPlanScreen> createState() => _LessonPlanScreenState();
}

class _LessonPlanScreenState extends State<LessonPlanScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _gradeController = TextEditingController();
  final _topicController = TextEditingController();
  final _durationController = TextEditingController();
  bool _isGenerating = false;
  String? _generatedPlan;

  @override
  void dispose() {
    _subjectController.dispose();
    _gradeController.dispose();
    _topicController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  Future<void> _generateLessonPlan() async {
    if (_subjectController.text.isEmpty || 
        _gradeController.text.isEmpty || 
        _topicController.text.isEmpty) {
      _showAlert('请填写所有必填字段');
      return;
    }

    try {
      final result = await LoadingService.withLoading(
        context,
        () async {
          // 模拟网络延迟
          await Future.delayed(const Duration(seconds: 2));
          
          return await AIService().generateLessonPlan(
            subject: _subjectController.text,
            grade: _gradeController.text,
            topic: _topicController.text,
          );
        },
        loadingMessage: '正在生成教案...',
        successMessage: '教案生成成功！',
      );
      
      setState(() {
        _isGenerating = false;
        _generatedPlan = result;
      });
    } catch (e) {
      // LoadingService.withLoading 已经处理了错误显示
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('教案自动生成'),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => Navigator.pop(context),
          child: const Text('返回'),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: _generatedPlan == null
              ? _buildInputForm(isDark)
              : _buildGeneratedPlan(isDark),
        ),
      ),
    );
  }

  Widget _buildInputForm(bool isDark) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '请填写教案基本信息',
            style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
          ),
          const SizedBox(height: 24),
          
          // 学科输入
          _buildSectionTitle('学科'),
          _buildTextField(
            controller: _subjectController,
            placeholder: '例如：语文、数学、英语',
            isDark: isDark,
          ),
          
          const SizedBox(height: 20),
          
          // 年级输入
          _buildSectionTitle('年级'),
          _buildTextField(
            controller: _gradeController,
            placeholder: '例如：一年级、初一、高三',
            isDark: isDark,
          ),
          
          const SizedBox(height: 20),
          
          // 教学主题输入
          _buildSectionTitle('教学主题'),
          _buildTextField(
            controller: _topicController,
            placeholder: '例如：分数加减法、古诗《静夜思》',
            isDark: isDark,
          ),
          
          const SizedBox(height: 32),
          
          // 课时长度输入
          _buildSectionTitle('课时长度'),
          _buildTextField(
            controller: _durationController,
            placeholder: '例如：45分钟（默认）',
            isDark: isDark,
          ),
          
          const SizedBox(height: 32),
          
          // 生成按钮
          SizedBox(
            width: double.infinity,
            child: CupertinoButton.filled(
            onPressed: _isGenerating ? null : _generateLessonPlan,
            child: _isGenerating
                  ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                        const CupertinoActivityIndicator(
                          color: Colors.white,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '正在生成教案...',
                          style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          color: Colors.white,
                        ),
                      ),
                    ],
                  )
                : const Text('生成教案'),
          ),
          ),
          
          const SizedBox(height: 16),
          
          // 提示信息
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.systemBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppTheme.systemBlue.withOpacity(0.3),
                width: 0.5,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  CupertinoIcons.info_circle,
                  color: AppTheme.systemBlue,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AI生成的教案仅供参考，请根据实际教学需求进行调整。',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontSize: 12,
                      color: AppTheme.systemBlue,
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

  Widget _buildGeneratedPlan(bool isDark) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '生成的教案',
                  style: CupertinoTheme.of(context).textTheme.navTitleTextStyle,
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkSurfaceColor : AppTheme.systemGray6,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                      width: 0.5,
                    ),
                  ),
                  child: Text(
                    _generatedPlan ?? '',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: CupertinoButton(
                color: AppTheme.systemGray5,
                onPressed: () {
                  setState(() {
                    _generatedPlan = null;
                  });
                },
                child: Text(
                  '重新生成',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    color: AppTheme.systemBlue,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: CupertinoButton.filled(
                onPressed: () {
                  _showSaveDialog();
                },
                child: const Text('保存教案'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String placeholder,
    required bool isDark,
  }) {
    return CupertinoTextField(
      controller: controller,
      placeholder: placeholder,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.tertiarySystemBackgroundDark : AppTheme.systemGray6,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
          width: 0.5,
        ),
      ),
    );
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

  void _showSaveDialog() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('保存教案'),
        content: const Text('教案已保存到本地'),
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