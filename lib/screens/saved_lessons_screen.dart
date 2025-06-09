import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:teachai_app/models/lesson_plan.dart';
import 'package:teachai_app/services/data_service.dart';
import 'package:teachai_app/utils/app_theme.dart';
import 'package:teachai_app/screens/lesson_detail_screen.dart';

class SavedLessonsScreen extends StatefulWidget {
  const SavedLessonsScreen({super.key});

  @override
  State<SavedLessonsScreen> createState() => _SavedLessonsScreenState();
}

class _SavedLessonsScreenState extends State<SavedLessonsScreen> {
  final _searchController = TextEditingController();
  String _selectedSubject = '全部';
  String _selectedGrade = '全部';
  List<LessonPlan> _allLessons = [];
  List<LessonPlan> _filteredLessons = [];

  final List<String> _subjects = ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
  final List<String> _grades = ['全部', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'];

  @override
  void initState() {
    super.initState();
    _loadLessons();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadLessons() {
    setState(() {
      _allLessons = DataService.getAllLessonPlans();
      _applyFilters();
    });
  }

  void _applyFilters() {
    List<LessonPlan> filtered = _allLessons;

    // 学科筛选
    if (_selectedSubject != '全部') {
      filtered = filtered.where((lesson) => lesson.subject == _selectedSubject).toList();
    }

    // 年级筛选
    if (_selectedGrade != '全部') {
      filtered = filtered.where((lesson) => lesson.grade == _selectedGrade).toList();
    }

    // 搜索筛选
    final searchQuery = _searchController.text.trim().toLowerCase();
    if (searchQuery.isNotEmpty) {
      filtered = filtered.where((lesson) {
        return lesson.title.toLowerCase().contains(searchQuery) ||
               lesson.topic.toLowerCase().contains(searchQuery) ||
               lesson.content.toLowerCase().contains(searchQuery);
      }).toList();
    }

    setState(() {
      _filteredLessons = filtered;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('已保存教案'),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => Navigator.pop(context),
          child: const Text('返回'),
        ),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _showFilterOptions,
          child: const Icon(CupertinoIcons.slider_horizontal_3),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // 搜索栏
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: CupertinoSearchTextField(
                controller: _searchController,
                placeholder: '搜索教案标题、主题或内容...',
                onChanged: (value) => _applyFilters(),
              ),
            ),

            // 筛选标签
            if (_selectedSubject != '全部' || _selectedGrade != '全部')
              Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    if (_selectedSubject != '全部') ...[
                      _buildFilterChip('学科: $_selectedSubject', () {
                        setState(() {
                          _selectedSubject = '全部';
                          _applyFilters();
                        });
                      }),
                      const SizedBox(width: 8),
                    ],
                    if (_selectedGrade != '全部') ...[
                      _buildFilterChip('年级: $_selectedGrade', () {
                        setState(() {
                          _selectedGrade = '全部';
                          _applyFilters();
                        });
                      }),
                    ],
                  ],
                ),
              ),

            // 教案列表
            Expanded(
              child: _filteredLessons.isEmpty
                  ? _buildEmptyState(isDark)
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _filteredLessons.length,
                      itemBuilder: (context, index) {
                        final lesson = _filteredLessons[index];
                        return _buildLessonCard(lesson, isDark);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.systemBlue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.systemBlue.withOpacity(0.3),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.systemBlue,
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(
              CupertinoIcons.xmark_circle_fill,
              size: 16,
              color: AppTheme.systemBlue,
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
            CupertinoIcons.doc_text,
            size: 64,
            color: CupertinoColors.systemGrey,
          ),
          const SizedBox(height: 16),
          Text(
            _allLessons.isEmpty ? '还没有保存的教案' : '没有找到匹配的教案',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontSize: 18,
              color: CupertinoColors.systemGrey,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _allLessons.isEmpty 
                ? '快去生成第一个教案吧！'
                : '试试调整搜索条件',
            style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
              fontSize: 14,
              color: CupertinoColors.systemGrey2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLessonCard(LessonPlan lesson, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : CupertinoColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.systemGray3 : AppTheme.systemGray4,
          width: 0.5,
        ),
      ),
      child: CupertinoButton(
        padding: EdgeInsets.zero,
        onPressed: () => _openLessonDetail(lesson),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      lesson.title,
                      style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minSize: 32,
                    onPressed: () => _showDeleteConfirmation(lesson),
                    child: Icon(
                      CupertinoIcons.delete,
                      size: 20,
                      color: CupertinoColors.destructiveRed,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildInfoChip(lesson.subject, AppTheme.systemBlue),
                  const SizedBox(width: 8),
                  _buildInfoChip(lesson.grade, AppTheme.systemGreen),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '主题：${lesson.topic}',
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  fontSize: 14,
                  color: CupertinoColors.systemGrey,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                _formatDateTime(lesson.createdAt),
                style: CupertinoTheme.of(context).textTheme.textStyle.copyWith(
                  fontSize: 12,
                  color: CupertinoColors.systemGrey2,
                ),
              ),
            ],
          ),
        ),
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
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays == 0) {
      return '今天 ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else if (difference.inDays == 1) {
      return '昨天 ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}天前';
    } else {
      return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
    }
  }

  void _openLessonDetail(LessonPlan lesson) {
    Navigator.push(
      context,
      CupertinoPageRoute(
        builder: (context) => LessonDetailScreen(lesson: lesson),
      ),
    ).then((_) => _loadLessons()); // 返回时刷新列表
  }

  void _showFilterOptions() {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('筛选选项'),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _showSubjectFilter();
            },
            child: Text('按学科筛选 (当前: $_selectedSubject)'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              _showGradeFilter();
            },
            child: Text('按年级筛选 (当前: $_selectedGrade)'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _selectedSubject = '全部';
                _selectedGrade = '全部';
                _searchController.clear();
                _applyFilters();
              });
            },
            child: const Text('清除所有筛选'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _showSubjectFilter() {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择学科'),
        actions: _subjects.map((subject) => CupertinoActionSheetAction(
          onPressed: () {
            Navigator.pop(context);
            setState(() {
              _selectedSubject = subject;
              _applyFilters();
            });
          },
          child: Text(subject),
        )).toList(),
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _showGradeFilter() {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: const Text('选择年级'),
        actions: _grades.map((grade) => CupertinoActionSheetAction(
          onPressed: () {
            Navigator.pop(context);
            setState(() {
              _selectedGrade = grade;
              _applyFilters();
            });
          },
          child: Text(grade),
        )).toList(),
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ),
    );
  }

  void _showDeleteConfirmation(LessonPlan lesson) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('确认删除'),
        content: Text('确定要删除教案"${lesson.title}"吗？此操作无法撤销。'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () async {
              Navigator.pop(context);
              await _deleteLesson(lesson);
            },
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteLesson(LessonPlan lesson) async {
    try {
      await DataService.deleteLessonPlan(lesson.id);
      _loadLessons();
      
      if (mounted) {
        _showAlert('教案已删除');
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
} 