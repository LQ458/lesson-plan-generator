import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';
import '../models/mistake_record.dart';
import '../services/data_service.dart';
import 'add_mistake_screen.dart';

class MistakeAnalysisScreen extends StatefulWidget {
  const MistakeAnalysisScreen({super.key});

  @override
  State<MistakeAnalysisScreen> createState() => _MistakeAnalysisScreenState();
}

class _MistakeAnalysisScreenState extends State<MistakeAnalysisScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  
  String _selectedSubject = '全部';
  String _selectedStudent = '全部';
  bool? _selectedStatus;
  List<MistakeRecord> _filteredMistakes = [];
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadMistakes();
  }

  @override
  void dispose() {
    _tabController.dispose();
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('错题分析'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.list), text: '错题列表'),
            Tab(icon: Icon(Icons.analytics), text: '统计分析'),
            Tab(icon: Icon(Icons.trending_up), text: '趋势图表'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AddMistakeScreen(),
                ),
              );
              if (result == true) {
                _loadMistakes();
                _applyFilters();
              }
            },
            tooltip: '添加错题',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _loadMistakes();
              _applyFilters();
            },
            tooltip: '刷新',
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMistakeListTab(),
          _buildStatisticsTab(),
          _buildTrendTab(),
        ],
      ),
    );
  }

  Widget _buildMistakeListTab() {
    return Column(
      children: [
        // 搜索和筛选区域
        _buildSearchAndFilterSection(),
        
        // 错题列表
        Expanded(
          child: _filteredMistakes.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredMistakes.length,
                  itemBuilder: (context, index) {
                    return _buildMistakeCard(_filteredMistakes[index]);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilterSection() {
    List<String> subjects = ['全部', ...DataService.getAllSubjects()];
    List<String> students = ['全部', ...DataService.getAllStudentNames()];
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // 搜索框
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: '搜索错题内容、学生姓名或知识点...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _applyFilters();
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onChanged: (value) => _applyFilters(),
          ),
          
          const SizedBox(height: 12),
          
          // 筛选器
          Row(
            children: [
              // 学科筛选
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedSubject,
                  decoration: const InputDecoration(
                    labelText: '学科',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: subjects.map((subject) {
                    return DropdownMenuItem(
                      value: subject,
                      child: Text(subject),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedSubject = value!;
                    });
                    _applyFilters();
                  },
                ),
              ),
              
              const SizedBox(width: 12),
              
              // 学生筛选
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedStudent,
                  decoration: const InputDecoration(
                    labelText: '学生',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: students.map((student) {
                    return DropdownMenuItem(
                      value: student,
                      child: Text(student),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedStudent = value!;
                    });
                    _applyFilters();
                  },
                ),
              ),
              
              const SizedBox(width: 12),
              
              // 状态筛选
              Expanded(
                child: DropdownButtonFormField<bool?>(
                  value: _selectedStatus,
                  decoration: const InputDecoration(
                    labelText: '状态',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('全部')),
                    DropdownMenuItem(value: false, child: Text('未解决')),
                    DropdownMenuItem(value: true, child: Text('已解决')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _selectedStatus = value;
                    });
                    _applyFilters();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMistakeCard(MistakeRecord mistake) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 头部信息
            Row(
              children: [
                Chip(
                  label: Text(mistake.subject),
                  backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                ),
                const SizedBox(width: 8),
                Chip(
                  label: Text(mistake.difficulty),
                  backgroundColor: _getDifficultyColor(mistake.difficulty).withOpacity(0.1),
                ),
                const Spacer(),
                Icon(
                  mistake.isResolved ? Icons.check_circle : Icons.error,
                  color: mistake.isResolved ? Colors.green : Colors.orange,
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // 学生和知识点
            Row(
              children: [
                Icon(Icons.person, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  mistake.studentName,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(width: 16),
                Icon(Icons.book, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  mistake.knowledgePoint,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
            
            const SizedBox(height: 8),
            
            // 题目内容
            Text(
              '题目：${mistake.questionContent}',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w500,
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
                        style: TextStyle(
                          color: Colors.red[700],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(mistake.studentAnswer),
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
                        style: TextStyle(
                          color: Colors.green[700],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(mistake.correctAnswer),
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
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                const Spacer(),
                if (!mistake.isResolved)
                  TextButton.icon(
                    onPressed: () async {
                      await DataService.markMistakeAsResolved(mistake.id);
                      _loadMistakes();
                      _applyFilters();
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('已标记为已解决')),
                        );
                      }
                    },
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('标记已解决'),
                  ),
                IconButton(
                  onPressed: () async {
                    bool? confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('确认删除'),
                        content: const Text('确定要删除这条错题记录吗？'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('取消'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('删除'),
                          ),
                        ],
                      ),
                    );
                    
                    if (confirm == true) {
                      await DataService.deleteMistakeRecord(mistake.id);
                      _loadMistakes();
                      _applyFilters();
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('错题记录已删除')),
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.delete_outline),
                  tooltip: '删除',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatisticsTab() {
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

  Widget _buildTrendTab() {
    Map<DateTime, int> trendData = DataService.getRecentMistakeTrend();
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '最近7天错题趋势',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // 简单的趋势图表（使用Container模拟）
          Container(
            height: 200,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Text(
                  '错题数量趋势',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: trendData.entries.map((entry) {
                      int maxValue = trendData.values.isEmpty ? 1 : trendData.values.reduce((a, b) => a > b ? a : b);
                      double height = maxValue == 0 ? 0 : (entry.value / maxValue) * 120;
                      
                      return Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('${entry.value}', style: const TextStyle(fontSize: 12)),
                          const SizedBox(height: 4),
                          Container(
                            width: 30,
                            height: height,
                            decoration: BoxDecoration(
                              color: Theme.of(context).primaryColor,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${entry.key.month}/${entry.key.day}',
                            style: const TextStyle(fontSize: 10),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // 数据导出按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                // TODO: 实现数据导出功能
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('数据导出功能开发中...')),
                );
              },
              icon: const Icon(Icons.download),
              label: const Text('导出分析报告'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, List<Widget> items) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...items,
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.analytics_outlined,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            '暂无错题记录',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '点击右上角的 + 按钮添加错题记录',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
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
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
} 