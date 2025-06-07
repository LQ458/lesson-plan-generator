import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
import 'package:teachai_app/utils/app_theme.dart';

class ExerciseRecommendationScreen extends StatefulWidget {
  const ExerciseRecommendationScreen({super.key});

  @override
  State<ExerciseRecommendationScreen> createState() =>
      _ExerciseRecommendationScreenState();
}

class _ExerciseRecommendationScreenState
    extends State<ExerciseRecommendationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _gradeController = TextEditingController();
  final _topicController = TextEditingController();
  
  String _selectedDifficulty = '中等';
  int _exerciseCount = 5;
  bool _isGenerating = false;
  List<Map<String, dynamic>>? _generatedExercises;

  @override
  void dispose() {
    _subjectController.dispose();
    _gradeController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  void _generateExercises() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isGenerating = true;
      });

      // 使用真实的AI服务生成练习题
      final appState = Provider.of<AppState>(context, listen: false);
      appState.generateExercises(
        subject: _subjectController.text,
        grade: _gradeController.text,
        topic: _topicController.text,
        difficulty: _selectedDifficulty,
        count: _exerciseCount,
      ).then((result) {
        // 这里我们可以解析AI返回的文本，转换成结构化数据
        // 目前先简单显示原始结果，后续可改进为解析JSON
        setState(() {
          _isGenerating = false;
          _generatedExercises = _parseExercises(result);
        });
      }).catchError((error) {
        setState(() {
          _isGenerating = false;
          // 发生错误时显示一个默认的练习题
          _generatedExercises = [
            {
              'id': 1,
              'type': '错误',
              'difficulty': '无',
              'content': '生成练习题失败：$error',
              'options': ['请重试'],
              'answer': '无',
              'explanation': '无',
            },
          ];
        });
      });
    }
  }
  
  List<Map<String, dynamic>> _parseExercises(String aiOutput) {
    // 这里应该实现一个解析函数，将AI输出的文本转换为结构化数据
    // 简单起见，目前返回一些模拟数据
    return [
      {
        'id': 1,
        'type': '选择题',
        'difficulty': _getDifficultyLevel(0),
        'content': aiOutput.length > 100 ? aiOutput.substring(0, 100) + '...' : aiOutput,
        'options': ['A. AI生成的选项', 'B. 请检查完整输出'],
        'answer': 'A',
        'explanation': '这是AI生成的内容，请查看完整输出了解详情。',
      },
    ];
  }

  String _getDifficultyLevel(int index) {
    if (_selectedDifficulty == '简单') {
      return ['简单', '简单', '中等', '中等', '中等'][index];
    } else if (_selectedDifficulty == '中等') {
      return ['简单', '中等', '中等', '中等', '困难'][index];
    } else {
      return ['中等', '中等', '困难', '困难', '困难'][index];
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('分层练习推荐'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: _generatedExercises == null
              ? _buildInputForm()
              : _buildExerciseList(),
        ),
      ),
    );
  }

  Widget _buildInputForm() {
    return Form(
      key: _formKey,
      child: ListView(
        children: [
          const Text(
            '请填写练习题基本信息',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _subjectController,
            decoration: const InputDecoration(
              labelText: '学科',
              hintText: '例如：数学、语文、英语',
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入学科';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _gradeController,
            decoration: const InputDecoration(
              labelText: '年级',
              hintText: '例如：一年级、初一、高三',
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入年级';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _topicController,
            decoration: const InputDecoration(
              labelText: '知识点',
              hintText: '例如：分数加减法、直角三角形',
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入知识点';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          const Text(
            '难度设置',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedDifficulty,
            decoration: const InputDecoration(
              labelText: '难度级别',
            ),
            items: const [
              DropdownMenuItem(
                value: '简单',
                child: Text('简单'),
              ),
              DropdownMenuItem(
                value: '中等',
                child: Text('中等'),
              ),
              DropdownMenuItem(
                value: '困难',
                child: Text('困难'),
              ),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() {
                  _selectedDifficulty = value;
                });
              }
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('题目数量：'),
              Expanded(
                child: Slider(
                  value: _exerciseCount.toDouble(),
                  min: 3,
                  max: 10,
                  divisions: 7,
                  label: _exerciseCount.toString(),
                  onChanged: (value) {
                    setState(() {
                      _exerciseCount = value.toInt();
                    });
                  },
                ),
              ),
              Text('$_exerciseCount题'),
            ],
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _isGenerating ? null : _generateExercises,
            child: _isGenerating
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(width: 12),
                      Text('正在生成练习题...'),
                    ],
                  )
                : const Text('生成练习题'),
          ),
        ],
      ),
    );
  }

  Widget _buildExerciseList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_topicController.text}练习题',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _generatedExercises = null;
                });
              },
              child: const Text('返回修改'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          '${_gradeController.text} ${_subjectController.text} · ${_generatedExercises?.length ?? 0}道题目',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: ListView.separated(
            itemCount: _generatedExercises?.length ?? 0,
            separatorBuilder: (context, index) => const Divider(),
            itemBuilder: (context, index) {
              final exercise = _generatedExercises![index];
              return ExpansionTile(
                title: Text(
                  '${index + 1}. ${exercise['content']}',
                  style: const TextStyle(
                    fontSize: 16,
                  ),
                ),
                subtitle: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      margin: const EdgeInsets.only(top: 4),
                      decoration: BoxDecoration(
                        color: _getDifficultyColor(exercise['difficulty']),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        exercise['difficulty'],
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      exercise['type'],
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (exercise['options'] != null) ...[
                          const Text(
                            '选项：',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          ...List.generate(
                            exercise['options'].length,
                            (i) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(exercise['options'][i]),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        Row(
                          children: [
                            const Text(
                              '答案：',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(exercise['answer']),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '解析：',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(exercise['explanation']),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () {
            // TODO: 保存练习题
            _showAlert('练习题已保存');
          },
          child: const Text('保存练习题'),
        ),
      ],
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case '简单':
        return Colors.green;
      case '中等':
        return Colors.orange;
      case '困难':
        return Colors.red;
      default:
        return Colors.blue;
    }
  }

  void _showAlert(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('提示'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }
} 