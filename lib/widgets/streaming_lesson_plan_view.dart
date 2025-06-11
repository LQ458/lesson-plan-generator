import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'dart:async';
import '../services/ai_service.dart';
import '../widgets/lesson_plan_markdown_view.dart';
import '../utils/app_theme.dart';

class StreamingLessonPlanView extends StatefulWidget {
  final String subject;
  final String grade;
  final String topic;
  final String? requirements;
  final Function(String content)? onContentGenerated;

  const StreamingLessonPlanView({
    super.key,
    required this.subject,
    required this.grade,
    required this.topic,
    this.requirements,
    this.onContentGenerated,
  });

  @override
  State<StreamingLessonPlanView> createState() => _StreamingLessonPlanViewState();
}

class _StreamingLessonPlanViewState extends State<StreamingLessonPlanView> {
  final AIService _aiService = AIService();
  final ScrollController _scrollController = ScrollController();
  
  String _generatedContent = '';
  bool _isGenerating = false;
  bool _isCompleted = false;
  StreamSubscription<String>? _subscription;
  
  // 进度相关状态
  int _currentStep = 0;
  final List<String> _generationSteps = [
    '🚀 连接AI服务',
    '📝 分析教学要求', 
    '🎯 制定教学目标',
    '⭐ 确定重点难点',
    '📋 设计教学过程',
    '🖼️ 规划板书设计',
    '💭 完善教学反思',
    '✅ 教案生成完成'
  ];

  @override
  void initState() {
    super.initState();
    _startGeneration();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _startGeneration() {
    setState(() {
      _isGenerating = true;
      _isCompleted = false;
      _generatedContent = '';
      _currentStep = 0;
    });

    // 开始流式生成
    final stream = _aiService.generateLessonPlanStream(
      subject: widget.subject,
      grade: widget.grade,
      topic: widget.topic,
      requirements: widget.requirements,
    );

    _subscription = stream.listen(
      (content) {
        setState(() {
          _generatedContent += content;
          _updateProgress();
        });
        
        // 自动滚动到底部
        _scrollToBottom();
      },
      onDone: () {
        setState(() {
          _isGenerating = false;
          _isCompleted = true;
          _currentStep = _generationSteps.length - 1;
        });
        
        // 通知父组件内容已生成
        if (widget.onContentGenerated != null) {
          widget.onContentGenerated!(_generatedContent);
        }
      },
      onError: (error) {
        setState(() {
          _isGenerating = false;
          _generatedContent += '\n\n❌ 生成出现问题：$error';
        });
      },
    );
  }

  void _updateProgress() {
    // 根据内容长度估算进度
    final contentLength = _generatedContent.length;
    if (contentLength > 100 && _currentStep < 1) {
      _currentStep = 1;
    } else if (contentLength > 300 && _currentStep < 2) {
      _currentStep = 2;
    } else if (contentLength > 600 && _currentStep < 3) {
      _currentStep = 3;
    } else if (contentLength > 1000 && _currentStep < 4) {
      _currentStep = 4;
    } else if (contentLength > 1500 && _currentStep < 5) {
      _currentStep = 5;
    } else if (contentLength > 2000 && _currentStep < 6) {
      _currentStep = 6;
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _regenerate() {
    _subscription?.cancel();
    _startGeneration();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    return Column(
      children: [
        // 进度指示器
        if (_isGenerating || !_isCompleted) _buildProgressIndicator(isDark),
        
        // 生成内容显示区域
        Expanded(
          child: Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkSurfaceColor : CupertinoColors.systemBackground,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
                width: 0.5,
              ),
            ),
            child: _buildContentArea(isDark),
          ),
        ),
        
        // 操作按钮
        _buildActionButtons(isDark),
      ],
    );
  }

  Widget _buildProgressIndicator(bool isDark) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.systemGray6,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
          width: 0.5,
        ),
      ),
      child: Column(
        children: [
          // 当前步骤显示
          Row(
            children: [
              if (_isGenerating)
                const CupertinoActivityIndicator()
              else
                const Icon(
                  CupertinoIcons.checkmark_circle_fill,
                  color: CupertinoColors.systemGreen,
                  size: 20,
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _currentStep < _generationSteps.length 
                      ? _generationSteps[_currentStep]
                      : '✅ 生成完成',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: isDark ? CupertinoColors.white : CupertinoColors.black,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // 进度条
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _currentStep / (_generationSteps.length - 1),
              backgroundColor: isDark ? AppTheme.systemGray3 : AppTheme.systemGray5,
              valueColor: AlwaysStoppedAnimation<Color>(
                _isCompleted ? CupertinoColors.systemGreen : CupertinoColors.systemBlue,
              ),
              minHeight: 8,
            ),
          ),
          
          const SizedBox(height: 8),
          
          // 进度百分比
          Text(
            '${((_currentStep / (_generationSteps.length - 1)) * 100).round()}%',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontSize: 14,
              color: isDark ? AppTheme.systemGray : AppTheme.systemGray2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContentArea(bool isDark) {
    if (_generatedContent.isEmpty && _isGenerating) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CupertinoActivityIndicator(radius: 20),
            SizedBox(height: 16),
            Text(
              '🤖 AI正在为您精心准备教案...',
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.systemGray,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      controller: _scrollController,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 教案基本信息
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.systemGray2 : AppTheme.systemGray6,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '📚 教案信息',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? CupertinoColors.white : CupertinoColors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '科目：${widget.subject} | 年级：${widget.grade} | 课题：${widget.topic}',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 14,
                    color: isDark ? AppTheme.systemGray : AppTheme.systemGray2,
                  ),
                ),
                if (widget.requirements?.isNotEmpty == true) ...[
                  const SizedBox(height: 4),
                  Text(
                    '特殊要求：${widget.requirements}',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 14,
                      color: isDark ? AppTheme.systemGray : AppTheme.systemGray2,
                    ),
                  ),
                ],
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 生成的教案内容
          if (_generatedContent.isNotEmpty)
            LessonPlanMarkdownView(
              content: _generatedContent,
              isDark: isDark,
            ),
          
          // 生成中的提示
          if (_isGenerating)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(top: 16),
              decoration: BoxDecoration(
                color: CupertinoColors.systemBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: CupertinoColors.systemBlue.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  const CupertinoActivityIndicator(radius: 10),
                  const SizedBox(width: 12),
                  Text(
                    '内容正在生成中，请稍候...',
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 14,
                      color: CupertinoColors.systemBlue,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // 重新生成按钮
          if (_isCompleted)
            Expanded(
              child: CupertinoButton(
                onPressed: _regenerate,
                color: AppTheme.systemGray,
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      CupertinoIcons.refresh,
                      size: 18,
                      color: CupertinoColors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '重新生成',
                      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          if (_isCompleted) const SizedBox(width: 12),
          
          // 停止生成按钮（生成中时显示）
          if (_isGenerating)
            Expanded(
              child: CupertinoButton(
                onPressed: () {
                  _subscription?.cancel();
                  setState(() {
                    _isGenerating = false;
                  });
                },
                color: CupertinoColors.systemRed,
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      CupertinoIcons.stop,
                      size: 18,
                      color: CupertinoColors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '停止生成',
                      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          // 保存教案按钮（生成完成时显示）
          if (_isCompleted)
            Expanded(
              child: CupertinoButton(
                onPressed: () {
                  if (widget.onContentGenerated != null) {
                    widget.onContentGenerated!(_generatedContent);
                  }
                  Navigator.of(context).pop();
                },
                color: CupertinoColors.systemBlue,
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      CupertinoIcons.check_mark,
                      size: 18,
                      color: CupertinoColors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '保存教案',
                      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
} 