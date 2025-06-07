import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../models/mistake_record.dart';
import '../services/data_service.dart';
import '../utils/app_theme.dart';

class AddMistakeScreen extends StatefulWidget {
  const AddMistakeScreen({super.key});

  @override
  State<AddMistakeScreen> createState() => _AddMistakeScreenState();
}

class _AddMistakeScreenState extends State<AddMistakeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _studentNameController = TextEditingController();
  final _questionController = TextEditingController();
  final _studentAnswerController = TextEditingController();
  final _correctAnswerController = TextEditingController();
  final _knowledgePointController = TextEditingController();
  
  String _selectedSubject = '数学';
  String _selectedDifficulty = '中等';
  
  final List<String> _subjects = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理'];
  final List<String> _difficulties = ['简单', '中等', '困难'];

  @override
  void dispose() {
    _studentNameController.dispose();
    _questionController.dispose();
    _studentAnswerController.dispose();
    _correctAnswerController.dispose();
    _knowledgePointController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('添加错题记录'),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _saveMistake,
          child: const Text('保存'),
        ),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 学生姓名
                _buildSectionTitle('学生姓名'),
                _buildTextField(
                  controller: _studentNameController,
                  placeholder: '请输入学生姓名',
                  isDark: isDark,
                ),
                
                const SizedBox(height: 24),
                
                // 学科选择
                _buildSectionTitle('学科'),
                _buildPickerButton(
                  context,
                  '学科: $_selectedSubject',
                  () => _showSubjectPicker(),
                  isDark,
                ),
                
                const SizedBox(height: 24),
                
                // 难度选择
                _buildSectionTitle('难度'),
                _buildPickerButton(
                  context,
                  '难度: $_selectedDifficulty',
                  () => _showDifficultyPicker(),
                  isDark,
                ),
                
                const SizedBox(height: 24),
                
                // 知识点
                _buildSectionTitle('知识点'),
                _buildTextField(
                  controller: _knowledgePointController,
                  placeholder: '请输入相关知识点',
                  isDark: isDark,
                ),
                
                const SizedBox(height: 24),
                
                // 题目内容
                _buildSectionTitle('题目内容'),
                _buildTextField(
                  controller: _questionController,
                  placeholder: '请输入题目内容',
                  maxLines: 3,
                  isDark: isDark,
                ),
                
                const SizedBox(height: 24),
                
                // 学生答案
                _buildSectionTitle('学生答案'),
                _buildTextField(
                  controller: _studentAnswerController,
                  placeholder: '请输入学生的错误答案',
                  maxLines: 2,
                  isDark: isDark,
                ),
                
                const SizedBox(height: 24),
                
                // 正确答案
                _buildSectionTitle('正确答案'),
                _buildTextField(
                  controller: _correctAnswerController,
                  placeholder: '请输入正确答案',
                  maxLines: 2,
                  isDark: isDark,
                ),
                
                const SizedBox(height: 32),
                
                // 保存按钮
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    onPressed: _saveMistake,
                    child: const Text('保存错题记录'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
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
    int maxLines = 1,
  }) {
    return CupertinoTextField(
      controller: controller,
      placeholder: placeholder,
      maxLines: maxLines,
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

  Widget _buildPickerButton(BuildContext context, String text, VoidCallback onPressed, bool isDark) {
    return CupertinoButton(
      padding: const EdgeInsets.all(16),
      color: isDark ? AppTheme.tertiarySystemBackgroundDark : AppTheme.systemGray6,
      borderRadius: BorderRadius.circular(8),
      onPressed: onPressed,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            text,
            style: CupertinoTheme.of(context).textTheme.textStyle,
          ),
          Icon(
            CupertinoIcons.chevron_right,
            color: AppTheme.systemGray,
            size: 16,
          ),
        ],
      ),
    );
  }

  void _showSubjectPicker() {
    showCupertinoModalPopup<String>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择学科'),
        actions: _subjects.map((subject) {
          return CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedSubject = subject;
              });
              Navigator.pop(context);
            },
            child: Text(subject),
          );
        }).toList(),
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _showDifficultyPicker() {
    showCupertinoModalPopup<String>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择难度'),
        actions: _difficulties.map((difficulty) {
          return CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedDifficulty = difficulty;
              });
              Navigator.pop(context);
            },
            child: Text(difficulty),
          );
        }).toList(),
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _saveMistake() async {
    if (_studentNameController.text.isEmpty ||
        _questionController.text.isEmpty ||
        _studentAnswerController.text.isEmpty ||
        _correctAnswerController.text.isEmpty ||
        _knowledgePointController.text.isEmpty) {
      _showAlert('请填写所有必填字段');
      return;
    }

    final mistake = MistakeRecord(
      id: 'mistake_${DateTime.now().millisecondsSinceEpoch}',
      studentName: _studentNameController.text,
      subject: _selectedSubject,
      questionContent: _questionController.text,
      correctAnswer: _correctAnswerController.text,
      studentAnswer: _studentAnswerController.text,
      knowledgePoint: _knowledgePointController.text,
      difficulty: _selectedDifficulty,
      recordedAt: DateTime.now(),
      isResolved: false,
    );

    try {
      await DataService.saveMistakeRecord(mistake);
      Navigator.pop(context, true);
    } catch (e) {
      _showAlert('保存失败，请重试');
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
} 