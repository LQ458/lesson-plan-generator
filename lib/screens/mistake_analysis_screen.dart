import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../models/mistake_record.dart';
import '../services/data_service.dart';
import '../utils/app_theme.dart';
import 'add_mistake_screen.dart';

class MistakeAnalysisScreen extends StatefulWidget {
  const MistakeAnalysisScreen({super.key});

  @override
  State<MistakeAnalysisScreen> createState() => _MistakeAnalysisScreenState();
}

class _MistakeAnalysisScreenState extends State<MistakeAnalysisScreen> {
  final TextEditingController _searchController = TextEditingController();
  
  int _selectedSegment = 0;
  String _selectedSubject = '全部';
  String _selectedStudent = '全部';
  bool? _selectedStatus;
  List<MistakeRecord> _filteredMistakes = [];
  
  @override
  void initState() {
    super.initState();
    _loadMistakes();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadMistakes() {
    setState(() {
      _filteredMistakes = DataService.getAllMistakeRecords();
    });
  }

  void _applyFilters() {
    List<MistakeRecord> mistakes = DataService.getAllMistakeRecords();
    
    // 应用搜索
    if (_searchController.text.isNotEmpty) {
      mistakes = DataService.searchMistakeRecords(_searchController.text);
    }
    
    // 应用学科筛选
    if (_selectedSubject != '全部') {
      mistakes = mistakes.where((m) => m.subject == _selectedSubject).toList();
    }
    
    // 应用学生筛选
    if (_selectedStudent != '全部') {
      mistakes = mistakes.where((m) => m.studentName == _selectedStudent).toList();
    }
    
    // 应用状态筛选
    if (_selectedStatus != null) {
      mistakes = mistakes.where((m) => m.isResolved == _selectedStatus).toList();
    }
    
    setState(() {
      _filteredMistakes = mistakes;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    
    return CupertinoTheme(
      data: CupertinoThemeData(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primaryColor: AppTheme.systemBlue,
        textTheme: CupertinoTextThemeData(
          textStyle: TextStyle(
            inherit: false,
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor,
            fontFamily: 'CupertinoSystemText',
            fontSize: 17.0,
            letterSpacing: -0.4,
            decoration: TextDecoration.none,
          ),
          actionTextStyle: TextStyle(
            inherit: false,
            color: AppTheme.systemBlue,
            fontFamily: 'CupertinoSystemText',
            fontSize: 17.0,
            letterSpacing: -0.4,
            decoration: TextDecoration.none,
          ),
          navTitleTextStyle: TextStyle(
            inherit: false,
            color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor,
            fontFamily: 'CupertinoSystemText',
            fontSize: 17.0,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.4,
            decoration: TextDecoration.none,
          ),
        ),
      ),
      child: CupertinoPageScaffold(
        navigationBar: CupertinoNavigationBar(
          middle: const Text('错题分析'),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () async {
                  final result = await Navigator.push(
                    context,
                    CupertinoPageRoute(
                      builder: (context) => const AddMistakeScreen(),
                    ),
                  );
                  if (result == true) {
                    _loadMistakes();
                    _applyFilters();
                  }
                },
                child: Icon(
                  CupertinoIcons.add,
                  color: AppTheme.primaryColor,
                ),
              ),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () {
                  _loadMistakes();
                  _applyFilters();
                },
                child: Icon(
                  CupertinoIcons.refresh,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 分段控制器
              Container(
                padding: const EdgeInsets.all(16),
                child: CupertinoSegmentedControl<int>(
                  children: const {
                    0: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      child: Text('错题列表'),
                    ),
                    1: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      child: Text('统计分析'),
                    ),
                    2: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      child: Text('趋势图表'),
                    ),
                  },
                  onValueChanged: (value) {
                    setState(() {
                      _selectedSegment = value;
                    });
                  },
                  groupValue: _selectedSegment,
                ),
              ),
              
              // 内容区域
              Expanded(
                child: _buildContent(isDark),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    switch (_selectedSegment) {
      case 0:
        return _buildMistakeListTab(isDark);
      case 1:
        return _buildStatisticsTab(isDark);
      case 2:
        return _buildTrendTab(isDark);
      default:
        return _buildMistakeListTab(isDark);
    }
  }

  Widget _buildMistakeListTab(bool isDark) {
    return Column(
      children: [
        // 搜索和筛选区域
        _buildSearchAndFilterSection(isDark),
        
        // 错题列表
        Expanded(
          child: _filteredMistakes.isEmpty
              ? _buildEmptyState(isDark)
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredMistakes.length,
                  itemBuilder: (context, index) {
                    return _buildMistakeCard(_filteredMistakes[index], isDark);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilterSection(bool isDark) {
    List<String> subjects = ['全部', ...DataService.getAllSubjects()];
    List<String> students = ['全部', ...DataService.getAllStudentNames()];
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : AppTheme.surfaceColor,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray5,
            width: 0.5,
          ),
        ),
      ),
      child: Column(
        children: [
          // 搜索框
          CupertinoSearchTextField(
            controller: _searchController,
            placeholder: '搜索错题内容、学生姓名或知识点...',
            onChanged: (value) => _applyFilters(),
          ),
          
          const SizedBox(height: 12),
          
          // 筛选器
          Row(
            children: [
              // 学科筛选
              Expanded(
                child: _buildFilterButton(
                  context,
                  '学科: $_selectedSubject',
                  () => _showSubjectPicker(subjects),
                  isDark,
                ),
              ),
              
              const SizedBox(width: 8),
              
              // 学生筛选
              Expanded(
                child: _buildFilterButton(
                  context,
                  '学生: $_selectedStudent',
                  () => _showStudentPicker(students),
                  isDark,
                ),
              ),
              
              const SizedBox(width: 8),
              
              // 状态筛选
              Expanded(
                child: _buildFilterButton(
                  context,
                  '状态: ${_getStatusText()}',
                  () => _showStatusPicker(),
                  isDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterButton(BuildContext context, String text, VoidCallback onPressed, bool isDark) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: isDark ? AppTheme.tertiarySystemBackgroundDark : AppTheme.systemGray6,
      borderRadius: BorderRadius.circular(8),
      onPressed: onPressed,
      child: Text(
        text,
        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
          fontSize: 12,
          color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.textPrimaryColor,
        ),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _buildMistakeCard(MistakeRecord mistake, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: AppTheme.iosCardDecoration(isDark: isDark),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 头部信息
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.systemBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    mistake.subject,
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 12,
                      color: AppTheme.systemBlue,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getDifficultyColor(mistake.difficulty).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    mistake.difficulty,
                    style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                      fontSize: 12,
                      color: _getDifficultyColor(mistake.difficulty),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const Spacer(),
                Icon(
                  mistake.isResolved ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.exclamationmark_circle_fill,
                  color: mistake.isResolved ? AppTheme.systemGreen : AppTheme.systemOrange,
                  size: 20,
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // 学生和知识点
            Row(
              children: [
                Icon(CupertinoIcons.person, size: 16, color: AppTheme.systemGray),
                const SizedBox(width: 4),
                Text(
                  mistake.studentName,
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 14,
                    color: AppTheme.systemGray,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(CupertinoIcons.book, size: 16, color: AppTheme.systemGray),
                const SizedBox(width: 4),
                Text(
                  mistake.knowledgePoint,
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 14,
                    color: AppTheme.systemGray,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 8),
            
            // 题目内容
            Text(
              '题目：${mistake.questionContent}',
              style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                fontWeight: FontWeight.w500,
                fontSize: 16,
              ),
            ),
            
            const SizedBox(height: 8),
            
            // 答案对比
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '学生答案：',
                        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          color: AppTheme.systemRed,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        mistake.studentAnswer,
                        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '正确答案：',
                        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          color: AppTheme.systemGreen,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        mistake.correctAnswer,
                        style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // 底部操作和时间
            Row(
              children: [
                Text(
                  '记录时间：${_formatDate(mistake.recordedAt)}',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontSize: 12,
                    color: AppTheme.systemGray,
                  ),
                ),
                const Spacer(),
                if (!mistake.isResolved)
                  CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    minSize: 0,
                    onPressed: () async {
                      await DataService.markMistakeAsResolved(mistake.id);
                      _loadMistakes();
                      _applyFilters();
                      _showAlert('已标记为已解决');
                    },
                    child: Text(
                      '标记已解决',
                      style: CupertinoTheme.of(context).textTheme.actionTextStyle.copyWith(
                        fontSize: 14,
                      ),
                    ),
                  ),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minSize: 0,
                  onPressed: () => _showDeleteConfirmation(mistake),
                  child: Icon(
                    CupertinoIcons.delete,
                    color: AppTheme.systemRed,
                    size: 18,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatisticsTab(bool isDark) {
    Map<String, int> subjectStats = DataService.getSubjectDistribution();
    Map<String, int> knowledgeStats = DataService.getKnowledgePointMistakes();
    Map<String, int> studentStats = DataService.getStudentMistakeStats();
    double resolutionRate = DataService.getMistakeResolutionRate();
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 总体统计
          _buildStatCard(
            '总体统计',
            [
              _buildStatItem('错题总数', '${DataService.getAllMistakeRecords().length}'),
              _buildStatItem('解决率', '${(resolutionRate * 100).toStringAsFixed(1)}%'),
              _buildStatItem('学科数量', '${subjectStats.length}'),
              _buildStatItem('学生数量', '${studentStats.length}'),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 学科分布
          _buildStatCard(
            '学科错题分布',
            subjectStats.entries.map((entry) =>
              _buildStatItem(entry.key, '${entry.value}')
            ).toList(),
          ),
          
          const SizedBox(height: 16),
          
          // 知识点错误排行
          _buildStatCard(
            '知识点错误排行（前10）',
            knowledgeStats.entries.take(10).map((entry) =>
              _buildStatItem(entry.key, '${entry.value}')
            ).toList(),
          ),
          
          const SizedBox(height: 16),
          
          // 学生错题统计
          _buildStatCard(
            '学生错题统计',
            studentStats.entries.map((entry) =>
              _buildStatItem(entry.key, '${entry.value}')
            ).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendTab(bool isDark) {
    Map<DateTime, int> trendData = DataService.getRecentMistakeTrend();
    
    // 调试信息：打印趋势数据
    print('趋势数据: $trendData');
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '最近7天错题趋势',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: CupertinoTheme.of(context).primaryColor,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 改进的趋势图表，防止溢出
          Container(
            height: 280,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkSurfaceColor : AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.systemGray5),
            ),
            child: Column(
              children: [
                Text(
                  '错题数量趋势',
                  style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: CupertinoTheme.of(context).primaryColor,
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      // 计算可用空间
                      double availableHeight = constraints.maxHeight - 60; // 预留空间给标签
                      int maxValue = trendData.values.isEmpty ? 1 : trendData.values.reduce((a, b) => a > b ? a : b);
                      
                      // 防止除零错误
                      if (maxValue == 0) maxValue = 1;
                      
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: trendData.entries.map((entry) {
                          // 限制柱状图高度，防止溢出
                          double height = (entry.value / maxValue) * availableHeight;
                          height = height.clamp(0.0, availableHeight);
                          
                          return Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 2),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  // 数值标签
                                  Container(
                                    height: 20,
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${entry.value}',
                                                            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                        fontSize: 12,
                        color: CupertinoTheme.of(context).primaryColor,
                        fontWeight: FontWeight.w500,
                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  // 柱状图
                                  Container(
                                    width: double.infinity,
                                    height: height,
                                    constraints: BoxConstraints(
                                      maxWidth: 40,
                                      minHeight: entry.value > 0 ? 4 : 0, // 最小高度
                                    ),
                                    decoration: BoxDecoration(
                                      color: entry.value > 0 
                                        ? AppTheme.systemBlue
                                        : AppTheme.systemGray5,
                                      borderRadius: BorderRadius.circular(4),
                                      boxShadow: entry.value > 0 ? [
                                        BoxShadow(
                                          color: AppTheme.systemBlue.withOpacity(0.3),
                                          blurRadius: 4,
                                          offset: const Offset(0, 2),
                                        ),
                                      ] : null,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  // 日期标签
                                  Container(
                                    height: 20,
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${entry.key.month}/${entry.key.day}',
                                      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                                        fontSize: 10,
                                        color: AppTheme.systemGray,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // 操作按钮
          Row(
            children: [
              Expanded(
                child: CupertinoButton.filled(
                  onPressed: () {
                    // TODO: 实现数据导出功能
                    _showAlert('数据导出功能开发中...');
                  },
                  child: const Text('导出报告'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    bool? confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => CupertinoAlertDialog(
                        title: const Text('重新生成数据'),
                        content: const Text('这将清空所有现有数据并生成新的示例数据，确定继续吗？'),
                        actions: [
                          CupertinoDialogAction(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('取消'),
                          ),
                          CupertinoDialogAction(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('确定'),
                          ),
                        ],
                      ),
                    );
                    
                    if (confirm == true) {
                      await DataService.clearAllData();
                      _loadMistakes();
                      _applyFilters();
                      setState(() {}); // 刷新图表
                      _showAlert('数据已清空，请添加新的错题记录');
                    }
                  },
                  child: const Text('重新生成'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, List<Widget> items) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.systemGray6,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: CupertinoTheme.of(context).primaryColor,
            ),
          ),
          const SizedBox(height: 12),
          ...items,
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              color: AppTheme.systemGray,
            ),
          ),
          Text(
            value,
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontWeight: FontWeight.bold,
              color: AppTheme.systemGreen,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.chart_bar_alt_fill,
            size: 64,
            color: AppTheme.systemGray.withOpacity(0.4),
          ),
          const SizedBox(height: 16),
          Text(
            '暂无错题记录',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontSize: 16,
              color: AppTheme.systemGray,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '点击右上角的 + 按钮添加错题记录',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              color: AppTheme.systemGray,
            ),
          ),
        ],
      ),
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case '简单':
        return AppTheme.systemGreen;
      case '中等':
        return AppTheme.systemOrange;
      case '困难':
        return AppTheme.systemRed;
      default:
        return AppTheme.systemGray;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
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

  void _showDeleteConfirmation(MistakeRecord mistake) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除这条错题记录吗？'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('删除'),
          ),
        ],
      ),
    ).then((value) async {
      if (value == true) {
        await DataService.deleteMistakeRecord(mistake.id);
        _loadMistakes();
        _applyFilters();
        _showAlert('错题记录已删除');
      }
    });
  }

  void _showSubjectPicker(List<String> subjects) {
    showCupertinoModalPopup<String>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择学科'),
        actions: subjects.map((subject) {
          return CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedSubject = subject;
              });
              _applyFilters();
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

  void _showStudentPicker(List<String> students) {
    showCupertinoModalPopup<String>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择学生'),
        actions: students.map((student) {
          return CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedStudent = student;
              });
              _applyFilters();
            },
            child: Text(student),
          );
        }).toList(),
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _showStatusPicker() {
    showCupertinoModalPopup<bool?>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择状态'),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedStatus = null;
              });
              _applyFilters();
            },
            child: const Text('全部'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedStatus = false;
              });
              _applyFilters();
            },
            child: const Text('未解决'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              setState(() {
                _selectedStatus = true;
              });
              _applyFilters();
            },
            child: const Text('已解决'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  String _getStatusText() {
    if (_selectedStatus == null) {
      return '全部';
    } else if (_selectedStatus == false) {
      return '未解决';
    } else {
      return '已解决';
    }
  }
} 