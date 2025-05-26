import 'package:flutter/material.dart';
import '../models/mistake_record.dart';
import '../services/data_service.dart';
import '../services/sample_data_service.dart';

class AddMistakeScreen extends StatefulWidget {
  const AddMistakeScreen({super.key});

  @override
  State<AddMistakeScreen> createState() => _AddMistakeScreenState();
}

class _AddMistakeScreenState extends State<AddMistakeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _studentNameController = TextEditingController();
  final _questionController = TextEditingController();
  final _correctAnswerController = TextEditingController();
  final _studentAnswerController = TextEditingController();
  final _knowledgePointController = TextEditingController();
  
  String _selectedSubject = '数学';
  String _selectedDifficulty = '中等';
  bool _isLoading = false;

  @override
  void dispose() {
    _studentNameController.dispose();
    _questionController.dispose();
    _correctAnswerController.dispose();
    _studentAnswerController.dispose();
    _knowledgePointController.dispose();
    super.dispose();
  }

  Future<void> _saveMistake() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final mistake = MistakeRecord(
        id: 'mistake_${DateTime.now().millisecondsSinceEpoch}',
        studentName: _studentNameController.text.trim(),
        subject: _selectedSubject,
        questionContent: _questionController.text.trim(),
        correctAnswer: _correctAnswerController.text.trim(),
        studentAnswer: _studentAnswerController.text.trim(),
        knowledgePoint: _knowledgePointController.text.trim(),
        difficulty: _selectedDifficulty,
        recordedAt: DateTime.now(),
        isResolved: false,
      );

      await DataService.saveMistakeRecord(mistake);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('错题记录已保存'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('保存失败：$e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _fillSampleData() {
    // 填充示例数据
    _studentNameController.text = SampleDataService.studentNames[0];
    _questionController.text = '计算：1/2 + 1/3 = ?';
    _correctAnswerController.text = '5/6';
    _studentAnswerController.text = '2/5';
    _knowledgePointController.text = '分数加法';
    setState(() {
      _selectedSubject = '数学';
      _selectedDifficulty = '中等';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('添加错题记录'),
        actions: [
          TextButton(
            onPressed: _fillSampleData,
            child: const Text('示例数据'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 学生信息
              _buildSectionTitle('学生信息'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _studentNameController,
                decoration: const InputDecoration(
                  labelText: '学生姓名',
                  hintText: '请输入学生姓名',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入学生姓名';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // 题目信息
              _buildSectionTitle('题目信息'),
              const SizedBox(height: 8),
              
              // 学科和难度选择
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedSubject,
                      decoration: const InputDecoration(
                        labelText: '学科',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.book),
                      ),
                      items: SampleDataService.subjects.map((subject) {
                        return DropdownMenuItem(
                          value: subject,
                          child: Text(subject),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedSubject = value!;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedDifficulty,
                      decoration: const InputDecoration(
                        labelText: '难度',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.speed),
                      ),
                      items: SampleDataService.difficulties.map((difficulty) {
                        return DropdownMenuItem(
                          value: difficulty,
                          child: Text(difficulty),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedDifficulty = value!;
                        });
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 知识点
              TextFormField(
                controller: _knowledgePointController,
                decoration: const InputDecoration(
                  labelText: '知识点',
                  hintText: '请输入相关知识点',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lightbulb_outline),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入知识点';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              // 题目内容
              TextFormField(
                controller: _questionController,
                decoration: const InputDecoration(
                  labelText: '题目内容',
                  hintText: '请输入完整的题目内容',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.quiz),
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入题目内容';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // 答案信息
              _buildSectionTitle('答案信息'),
              const SizedBox(height: 8),

              // 学生答案
              TextFormField(
                controller: _studentAnswerController,
                decoration: InputDecoration(
                  labelText: '学生答案',
                  hintText: '请输入学生的错误答案',
                  border: const OutlineInputBorder(),
                  prefixIcon: Icon(Icons.close, color: Colors.red[700]),
                ),
                maxLines: 2,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入学生答案';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              // 正确答案
              TextFormField(
                controller: _correctAnswerController,
                decoration: InputDecoration(
                  labelText: '正确答案',
                  hintText: '请输入正确答案',
                  border: const OutlineInputBorder(),
                  prefixIcon: Icon(Icons.check, color: Colors.green[700]),
                ),
                maxLines: 2,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入正确答案';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 32),

              // 保存按钮
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _saveMistake,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save),
                  label: Text(_isLoading ? '保存中...' : '保存错题记录'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // 提示信息
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue[700]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '错题记录将用于分析学生的学习情况，帮助发现知识薄弱点。',
                        style: TextStyle(
                          color: Colors.blue[700],
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.bold,
        color: Theme.of(context).primaryColor,
      ),
    );
  }
} 