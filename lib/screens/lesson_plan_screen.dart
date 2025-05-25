import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachai_app/models/app_state.dart';
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
  bool _isGenerating = false;
  String? _generatedPlan;

  @override
  void dispose() {
    _subjectController.dispose();
    _gradeController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  void _generateLessonPlan() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isGenerating = true;
      });

      // 使用真实的AI服务生成教案
      final appState = Provider.of<AppState>(context, listen: false);
      appState.generateLessonPlan(
        subject: _subjectController.text,
        grade: _gradeController.text,
        topic: _topicController.text,
      ).then((result) {
        setState(() {
          _isGenerating = false;
          _generatedPlan = result;
        });
      }).catchError((error) {
        setState(() {
          _isGenerating = false;
          _generatedPlan = '生成教案失败：$error';
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('教案自动生成'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: _generatedPlan == null
              ? _buildInputForm()
              : _buildGeneratedPlan(),
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
            '请填写教案基本信息',
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
              hintText: '例如：语文、数学、英语',
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
              labelText: '教学主题',
              hintText: '例如：分数加减法、古诗《静夜思》',
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '请输入教学主题';
              }
              return null;
            },
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _isGenerating ? null : _generateLessonPlan,
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
                      Text('正在生成教案...'),
                    ],
                  )
                : const Text('生成教案'),
          ),
          const SizedBox(height: 16),
          const Text(
            '提示：AI生成的教案仅供参考，请根据实际教学需求进行调整。',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneratedPlan() {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '生成的教案',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _generatedPlan ?? '',
                    style: const TextStyle(
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
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    _generatedPlan = null;
                  });
                },
                child: const Text('返回修改'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  // TODO: 保存教案
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('教案已保存'),
                    ),
                  );
                },
                child: const Text('保存教案'),
              ),
            ),
          ],
        ),
      ],
    );
  }
} 